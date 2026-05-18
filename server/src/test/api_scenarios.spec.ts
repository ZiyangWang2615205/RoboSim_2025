import { assert } from "chai";
import { describe, it, before, after } from "mocha";
import axios from "axios";
import { Server } from "../connect/web-server";
import DB from "../db_handler";

const api_location = "http://localhost:6003/api";

describe("API scenarios tests", () => {
    const server = new Server({
        getClient: () => null,
    });

    before(async function () {
        await server.serve(6003);
    });

    after(async function () {
        await server.close();
        await DB.clear();
    });

     it("should return null for a missing scenario", async function () {
        const response = await axios.get(api_location + "/scenarios/999999", {
            validateStatus: () => true,
        });

        assert.equal(response.status, 200);
        assert.equal(response.data, "");
    });

     it("should reject scenario upload with missing fields", async function () {
        const response = await axios.post(
            api_location + "/scenarios/upload",
            {
                name: "bad scenario",
            },
            { validateStatus: () => true },
        );

        assert.equal(response.status, 400);
        assert.equal(response.data.message, "Missing required fields");
    });

});
