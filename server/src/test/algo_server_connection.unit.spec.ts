import { describe, it } from "mocha";
import {
    ACMessageType,
    ACSocketServer,
    InitializeRequest,
} from "../connect/algo_client_connect";
import { WebSocketWrapper } from "./utils";

describe("Algo server unit tests", function () {
    const port = 8080;

    it("Should connect to the server", async function () {
        const { server, client } = await new Promise<{
            server: ACSocketServer;
            client: WebSocketWrapper;
        }>(async function (resolve, reject) {
            const server = new ACSocketServer({
                onConnection: (ws, options) => {
                    resolve({ server, client });
                },
            });

            server.start(port);

            const client = new WebSocketWrapper(port);
            await client.connected();

            const initialize_request: InitializeRequest = {
                token: "TEST_TOKEN",
                name: "name",
                custom_scenarios: null,
                publish_runs: true,
            };

            client.send({
                type: ACMessageType.INITIALIZE,
                data: initialize_request,
            });
        });

        await client.shutdown();
        await server.shutdown();
    });
});
