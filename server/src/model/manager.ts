import { WebSocket } from "ws";
import {
    ACSocketServer,
    ACMessageType,
    InitializeRequest,
} from "../connect/algo_client_connect.js";
import DB from "../db_handler.js";
import { AlgorithmClient } from "../connect/algorithm_client.js";
import { Server } from "../connect/web-server.js";
import { Scenario } from "../types/index.js";
import * as crypto from "crypto";

/**
 * The main entry-point class of the server. Manages the state of the current
 * round, and facilitates communication between the Algorithm Clients and Web
 * Clients.
 */
export class Manager {
    private acs: ACSocketServer;
    private web_server: Server;
    private clients: Map<string, AlgorithmClient> = new Map();

    /**
     * Create a new Manager.
     */
    constructor() {
        this.acs = new ACSocketServer({
            onConnection: async (ws: WebSocket, options: InitializeRequest) => {
                // removed hyphens to fit in VARCHAR(32)
                const id = crypto.randomUUID().replace(/-/g, "");
                console.log("RECEIVED TOKEN:", options.token);
                const allTokens = await DB.all("SELECT token FROM Tokens");
                console.log("db tokens visible to server:", JSON.stringify(allTokens));
                const token_id = await DB.validateToken(options.token);
                if (token_id === null) {
                    ws.send(
                        JSON.stringify({
                            type: ACMessageType.ERROR,
                            data: "Invalid token",
                        }),
                    );
                    return;
                }

                let scenarios: Scenario[];
                if (options.custom_scenarios) {
                    scenarios = await Promise.all(DB.addCustomScenarios(options.custom_scenarios));
                } else {
                    scenarios = await DB.getDefaultScenarios();
                }

                await DB.saveAlgorithmClient(
                    id,
                    token_id,
                    options.name,
                    options.publish_runs,
                );

                const userid = await DB.getUserID(token_id);

                if (userid === null) {
                    throw new Error("User ID is null");
                }

                const client = new AlgorithmClient({
                    ws,
                    id,
                    scenarios: scenarios,
                    onAction: (action) => {
                        this.web_server.sse.sendAction(id, action);
                    },
                    onNewRound: async (state, scenario, run_id) => {
                        await DB.initializeRun(run_id, id, scenario);

                        this.web_server.sse.onNewRound(id, state);
                    },
                    onRoundFinished: async (run_id, run, state, energy_used) => {
                        await DB.finishRun(run_id, run.actions, state, energy_used);

                        this.web_server.sse.onRoundCompleted(id);
                    },
                    onCompleted: async () => {
                        await DB.algorithmClientFinished(id);

                        this.clients.delete(id);
                        this.web_server.sse.onAlgorithmEnd(id);
                    },
                    onDisconnected: async(lastRun) => {
                        await DB.algorithmClientFailed(id, lastRun.actions, 0);

                        this.clients.delete(id);
                        this.web_server.sse.onAlgorithmEnd(id);
                    },
                });

                this.clients.set(id, client);
                this.web_server.sse.onClientAdded(userid);
                this.web_server.sse.onAlgorithmStart(id, client);
            },
        });

        this.web_server = new Server({
            getClient: (id) => this.clients.get(id) ?? null,
        });
    }

    /**
     * Start the algorithm client server and the web client server.
     *
     * @param ac_port The port to start the algorithm client server on.
     * @param web_server_port The port to start the web server on.
     */
    async start(ac_port: number, web_server_port: number) {
        await this.acs.start(ac_port);
        await this.web_server.serve(web_server_port);
    }

    /**
     * Shut down the algorithm client server and the web client server, and end
     * the current round.
     */
    async shutdown() {
        console.log("Closing ACS");
        try {
            await this.acs.shutdown();
        } catch (e) {
            console.log("ACS shutdown failed:", e);
        }finally {
            console.log("Closing web server");
            try {
                await this.web_server.close();
            } catch (e) {
                console.log("Web server shutdown failed:",e);
            }
        }
    }
}
