import { assert } from "chai";
import { describe, it, before, after } from "mocha";
import axios from "axios";
import { Server } from "../connect/web-server";
import DB from "../db_handler";

const api_location = "http://localhost:6001/api";

describe("API graph tests", () => {
    const server = new Server({
        getClient: () => null,
    });

    before(async function () {
        await server.serve(6001);
    });

    after(async function () {
        await server.close();
        await DB.clear();
    });

    it("should return info of ACs with default sid sorted by movecount", async function () {
        const response = await axios.get(
            api_location + "/graph/top-acs/movecount/default/10",
            { validateStatus: () => true },
        );

        assert.equal(response.status, 200);
        assert.isArray(response.data);
    });

    it("should return info of ACs with default sid sorted by timetaken", async function () {
        const response = await axios.get(
            api_location + "/graph/top-acs/timetaken/default/10",
            { validateStatus: () => true },
        );

        assert.equal(response.status, 200);
        assert.isArray(response.data);
    });


    /*sorted by energy
    it("should return info of ACs for a specific sid sorted by energyused", async function () {
        const response = await axios.get(
            api_location + "/graph/top-acs/energyused/1/10",
            { validateStatus: () => true },
        );

        assert.equal(response.status, 200);
        assert.isArray(response.data);
    });*/

    it("should return info of ACs for a specific sid sorted by movecount", async function () {
        const response = await axios.get(
            api_location + "/graph/top-acs/movecount/1/10",
            { validateStatus: () => true },
        );

        assert.equal(response.status, 200);
        assert.isArray(response.data);
    });

    it("should return info of ACs for a specific sid sorted by timetaken", async function () {
        const response = await axios.get(
            api_location + "/graph/top-acs/timetaken/1/10",
            { validateStatus: () => true },
        );

        assert.equal(response.status, 200);
        assert.isArray(response.data);
    });

    it("should return movecount for a scenario and acid", async function () {
        const response = await axios.get(
            api_location + "/graph/movecount/1/1",
            { validateStatus: () => true },
        );

        assert.equal(response.status, 200);
        assert.isArray(response.data);
    });

    it("should return timetaken for a scenario and acid", async function () {
        const response = await axios.get(
            api_location + "/graph/timetaken/1/1",
            { validateStatus: () => true },
        );

        assert.equal(response.status, 200);
        assert.isArray(response.data);
    });

    it("should return energyused for a scenario and acid", async function () {
        const response = await axios.get(
            api_location + "/graph/energyused/1/1",
            { validateStatus: () => true },
        );

        assert.equal(response.status, 200);
        assert.isArray(response.data);
    });

    it("should return scenarios run by an acid", async function () {
        const response = await axios.get(
            api_location + "/graph/scenariosrun/1",
            { validateStatus: () => true },
        );

        assert.equal(response.status, 200);
        assert.isArray(response.data);
    });
});
