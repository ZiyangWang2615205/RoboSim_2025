import { assert } from "chai";
import { describe, it, afterEach } from "mocha";
import { Server } from "../connect/web-server";

describe("Web server production mode", () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
    });

    it("should start server in production mode when build exists", async function () {
        process.env.NODE_ENV = "production";

        const server = new Server({
            getClient: () => null,
        });

        await server.serve(0);

        assert.isNotNull(server.server);

        await server.close();
    });
});
