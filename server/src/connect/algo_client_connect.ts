import WebSocket, { WebSocketServer } from "ws";
import { SentScenario } from "../types/index.js";
import { createServer } from "http";
import { isScenarios } from "../validation.js";
import {HttpServer} from "vite";

export interface InitializeRequest {
    token: string;
    name: string;
    publish_runs: boolean;
    custom_scenarios: SentScenario[] | null;
}

export function isInitializeRequest(obj: unknown): obj is InitializeRequest {
    /*return (
        obj !== null &&
        typeof obj === "object" &&
        "token" in obj &&
        typeof obj.token === "string" &&
        "name" in obj &&
        typeof obj.name === "string" &&
        "publish_runs" in obj &&
        typeof obj.publish_runs === "boolean" &&
        "custom_scenarios" in obj &&
        (obj.custom_scenarios === null || isScenarios(obj.custom_scenarios))&&
        Object.keys(obj).length === 4
    );*/
    if (obj === null || typeof obj !== "object") return false;

  const o = obj as any;

  if (typeof o.token !== "string") return false;
  if (typeof o.name !== "string") return false;
  if (typeof o.publish_runs !== "boolean") return false;

  //accept null/array
  if (!("custom_scenarios" in o)) return true;
  return o.custom_scenarios === null || Array.isArray(o.custom_scenarios);
}

/**
 * The message types that can be sent to and from Algorithm Clients.
 */
export enum ACMessageType {
    INITIALIZE = "initialize",
    NEW_ROUND = "new_round",
    END = "end",
    FAILED = "failed",
    QUIT = "quit",
    OK = "ok",
    ERROR = "error",
    ACTION = "action",
    ACCEPTED = "accepted",
    EXECUTED = "executed",
    REJECTED = "rejected",
    SKIP = "skip",
}

/**
 * A message to or from an Algorithm Client.
 */
export type ACMessage = { type: ACMessageType; data: unknown };

function isACMessage(message: unknown): message is ACMessage {
    return (
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        "data" in message &&
        typeof message.type === "string" &&
        Object.keys(message).length === 2 &&
        Object.values(ACMessageType).includes(message.type as ACMessageType)
    );
}

export function parseACMessage(message: string): ACMessage | null {
    let parsed: unknown;
    try {
        parsed = JSON.parse(message);
    } catch (e) {
        return null;
    }

    if (isACMessage(parsed)) {
        return parsed;
    } else {
        return null;
    }
}

export interface ACServerParams {
    /**
     * Called when a new Algorithm Client connects to the server.
     */
    onConnection: (ws: WebSocket, options: InitializeRequest) => void;
}

/**
 * A server that communicates with Algorithm Clients via a WebSocket connection.
 * Responsible for receiving and parsing messages sent to the server, and
 * providing an API for sending messages to an Algorithm Client.
 */
export class ACSocketServer {
    private wss: WebSocketServer | null = null;
    private server: HttpServer | null = null; //used for record http server
    private _clients: Map<string, WebSocket> = new Map();

    // Callbacks
    private onConnection: (ws: WebSocket, options: InitializeRequest) => void;

    constructor({ onConnection }: ACServerParams) {
        this.onConnection = onConnection;
    }

    /**
     * Start the server.
     *
     * @param port The port to start the server on.
     */
    async start(port: number): Promise<void> {
        const server = createServer((req, res) => {
            res.writeHead(200).end();
        });

        this.wss = new WebSocketServer({ server });

        this.wss.on("connection", (ws: WebSocket) => {
            ws.once("message", (data) => {
                const message = parseACMessage(data.toString());

                if (!message) {
                    ws.send(
                        JSON.stringify({
                            type: ACMessageType.ERROR,
                            data: "Invalid message",
                        }),
                    );
                    return;
                } else if (message.type !== ACMessageType.INITIALIZE) {
                    ws.send(
                        JSON.stringify({
                            type: ACMessageType.ERROR,
                            data: "Invalid message type",
                        }),
                    );
                    return;
                } else if (!isInitializeRequest(message.data)) {
                    ws.send(
                        JSON.stringify({
                            type: ACMessageType.ERROR,
                            data: "Invalid message data",
                        }),
                    );
                    return;
                }

                this.onConnection(ws, message.data);
            });
        });

        return new Promise((resolve) => {
            server.listen(port, () => {
                console.log(
                    "Algorithm Client socket server started on port " + port,
                );
                resolve();
            });
        });
    }

    /**
     * Close the server
     */
    async shutdown(): Promise<void> {
        /*return new Promise((resolve, reject) => {
            if (this.wss) {
                this.wss.close((error) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });*/

        //close wss firstly, then close http server
        if(this.wss) {
            for (const client of this.wss.clients) {
                try {
                    client.terminate();
                } catch {}
            }

            await new Promise<void>((resolve,reject) => {
                this.wss!.close((error) => (error ? reject(error) : resolve()));
            });
            this.wss = null;
        }

         if (this.server) {
            await new Promise<void>((resolve, reject) => {
                this.server!.close((error) => (error ? reject(error) : resolve()));
            });
            this.server = null;
        }
    }

    /**
     * Send a message to an Algorithm Client
     *
     * @param id The id of the Algorithm Client
     * @param message The message to send
     */
    sendMessage(id: string, message: ACMessage): boolean {
        const client = this._clients.get(id);

        if (client === undefined) {
            console.error("Can't find client with given id");
            return false;
        }

        client.send(JSON.stringify(message));

        return true;
    }

    /**
     * Send a message to every connected Algorithm Client
     *
     * @param message The message to send
     */
    sendMessageToAll(message: ACMessage) {
        for (const client of this._clients.values()) {
            client.send(JSON.stringify(message));
        }
    }
}
