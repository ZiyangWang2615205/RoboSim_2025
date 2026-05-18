import { assert } from "chai";
import { describe, it, before, after } from "mocha";
import axios from "axios";
import { Server } from "../connect/web-server";
import DB from "../db_handler";

const api_location = "http://localhost:6004/api";

describe("API replay tests", () => {
    const server = new Server({
        getClient: () => null,
    });

    before(async function () {
        await server.serve(6004);
    });

    after(async function () {
        await server.close();
        await DB.clear();
    });

    it("should return 404 for missing replay data", async function () {
        const response = await axios.get(api_location + "/replay/999999", {
            validateStatus: () => true,
        });

        assert.equal(response.status, 404);
    });

    //should return rids for a scenario
    /*it("should return rids for a scenario", async function () {
        const response = await axios.get(api_location + "/replay/rids/1", {
            validateStatus: () => true,
        });

        assert.equal(response.status, 200);
        assert.isArray(response.data);
    });*/

     it("should return moves for a run", async function () {
        const response = await axios.get(api_location + "/replay/moves/1", {
            validateStatus: () => true,
        });

        assert.equal(response.status, 200);
        assert.isArray(response.data);
    });

     it("should return metadata for a run", async function () {
        const response = await axios.get(api_location + "/replay/meta/1", {
            validateStatus: () => true,
        });

        assert.equal(response.status, 200);
        assert.isArray(response.data);
    });

});
