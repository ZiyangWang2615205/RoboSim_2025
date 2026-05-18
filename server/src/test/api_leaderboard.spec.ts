import { assert } from "chai";
import { describe, it, before, after } from "mocha";
import axios from "axios";
import { Server } from "../connect/web-server";
import DB from "../db_handler";

const api_location = "http://localhost:6002/api";

describe("API leaderboard tests", () => {
    const server = new Server({
        getClient: () => null,
    });

    before(async function () {
        await server.serve(6002);
    });

    after(async function () {
        await server.close();
        await DB.clear();
    });

    it("should reject invalid leaderboard page", async function () {
        const response = await axios.get(api_location + "/leaderboard?page=0", {
            validateStatus: () => true,
        });

        assert.equal(response.status, 400);
    });

    it("should support completed-time leaderboard sorting", async function () {
            const response = await axios.get(api_location + "/leaderboard?sort=completed-time", {
                validateStatus: () => true,
            });

            assert.equal(response.status, 200);
            assert.isArray(response.data.data);
        });

    it("should support completed-moves leaderboard sorting", async function () {
            const response = await axios.get(api_location + "/leaderboard?sort=completed-moves", {
                validateStatus: () => true,
            });

            assert.equal(response.status, 200);
            assert.isArray(response.data.data);
        });

    it("should support completed-energy leaderboard sorting", async function () {
            const response = await axios.get(api_location + "/leaderboard?sort=completed-energy", {
                validateStatus: () => true,
            });

            assert.equal(response.status, 200);
            assert.isArray(response.data.data);
        });

    it("should fallback for unknown leaderboard sorting", async function () {
            const response = await axios.get(api_location + "/leaderboard?sort=unknown", {
                validateStatus: () => true,
            });

            assert.equal(response.status, 200);
            assert.isArray(response.data.data);
        });

    it("should reject invalid scenario leaderboard page", async function () {
            const response = await axios.get(api_location + "/leaderboard/scenario/1?page=0", {
                validateStatus: () => true,
            });

            assert.equal(response.status, 400);
        });

    it("should support scenario leaderboard time sorting", async function () {
            const response = await axios.get(api_location + "/leaderboard/scenario/1?sort=time", {
                validateStatus: () => true,
            });

            assert.equal(response.status, 200);
            assert.isArray(response.data.data);
        });

    it("should support scenario leaderboard moves sorting", async function () {
        const response = await axios.get(api_location + "/leaderboard/scenario/1?sort=moves", {
            validateStatus: () => true,
        });

        assert.equal(response.status, 200);
        assert.isArray(response.data.data);
    });

    it("should support scenario leaderboard energy sorting", async function () {
        const response = await axios.get(api_location + "/leaderboard/scenario/1?sort=energy", {
            validateStatus: () => true,
        });

        assert.equal(response.status, 200);
        assert.isArray(response.data.data);
    });

    it("should fallback for unknown scenario leaderboard sorting", async function () {
        const response = await axios.get(api_location + "/leaderboard/scenario/1?sort=unknown", {
            validateStatus: () => true,
        });

        assert.equal(response.status, 200);
        assert.isArray(response.data.data);
    });

    it("should reject deleting benchmark without login", async function () {
        const response = await axios.delete(api_location + "/leaderboard/benchmarks/1", {
            validateStatus: () => true,
        });

        assert.equal(response.status, 401);
    });

});
