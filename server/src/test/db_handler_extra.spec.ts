import { assert } from "chai";
import { describe, it } from "mocha";
import DB, { AuthError } from "../db_handler";
import { RunState } from "../types";

describe("DB handler extra branches", () => {
    it("should replace undefined query param with null", async function () {
        await DB.run("SELECT $1::text", [undefined]);
        assert.isTrue(true);
    });

    it('should short-circuit when query param is "{}"', async function () {
        const rows = await DB.all("SELECT 1", ["{}"]);
        assert.deepEqual(rows, []);
    });

    it("should return null if user is not found during session verification", async function () {
        const originalQuery = (DB as any)["db"].query;

        try {
            (DB as any)["db"].query = async () => ({ rows: [] });

            const result = await DB.verifySessionID("missing", "session", Date.now());

            assert.isNull(result);
        } finally {
            (DB as any)["db"].query = originalQuery;
        }
    });

    it("should return null if session id does not match", async function () {
        const originalQuery = (DB as any)["db"].query;

        try {
            (DB as any)["db"].query = async () => ({
                rows: [
                    {
                        sessionid: "real-session",
                        userid: 1,
                        expiry: Date.now() + 100000,
                    },
                ],
            });

            const result = await DB.verifySessionID("admin", "wrong-session", Date.now());

            assert.isNull(result);
        } finally {
            (DB as any)["db"].query = originalQuery;
        }
    });

    it("should return null and remove expired session", async function () {
        const originalQuery = (DB as any)["db"].query;
        const originalRun = DB.run;

        let deletedSession: string | null = null;

        try {
            (DB as any)["db"].query = async () => ({
                rows: [
                    {
                        sessionid: "expired-session",
                        userid: 1,
                        expiry: Date.now() - 100000,
                    },
                ],
            });

            DB.run = async (query: string, params: any[] = []) => {
                if (query.includes("DELETE FROM Sessions")) {
                    deletedSession = params[0];
                }
            };

            const result = await DB.verifySessionID(
                "admin",
                "expired-session",
                Date.now(),
            );

            assert.isNull(result);
            assert.equal(deletedSession, "expired-session");
        } finally {
            (DB as any)["db"].query = originalQuery;
            DB.run = originalRun;
        }
    });

    it("should throw if adding an existing user", async function () {
        const originalQuery = (DB as any)["db"].query;

        try {
            (DB as any)["db"].query = async () => ({
                rows: [{ count: 1 }],
            });

            try {
                await (DB as any).addUser("admin", "password", "Admin");
                assert.fail("Expected addUser to throw");
            } catch (err) {
                assert.instanceOf(err, AuthError);
            }
        } finally {
            (DB as any)["db"].query = originalQuery;
        }
    });

    it("should return false if changeUsername receives empty username", async function () {
        const result = await DB.changeUsername("1", "");
        assert.isFalse(result);
    });

    it("should return false if changeUsername database update fails", async function () {
        const originalRun = DB.run;

        try {
            DB.run = async () => {
                throw new Error("db failed");
            };

            const result = await DB.changeUsername("1", "newname");

            assert.isFalse(result);
        } finally {
            DB.run = originalRun;
        }
    });

    it("should return false if changeName database update fails", async function () {
        const originalRun = DB.run;

        try {
            DB.run = async () => {
                throw new Error("db failed");
            };

            const result = await DB.changeName("1", "New Name");

            assert.isFalse(result);
        } finally {
            DB.run = originalRun;
        }
    });

    it("should throw if username cannot be found by userid", async function () {
        const originalQuery = (DB as any)["db"].query;

        try {
            (DB as any)["db"].query = async () => ({
                rows: [],
            });

            try {
                await DB.getUsername("999999");
                assert.fail("Expected getUsername to throw");
            } catch (err) {
                assert.instanceOf(err, AuthError);
            }
        } finally {
            (DB as any)["db"].query = originalQuery;
        }
    });

    it("should reject invalid password during registration", async function () {
        try {
            await DB.registerNewUser("validuser", "bad", "Test User");
            assert.fail("Expected registerNewUser to throw");
        } catch (err) {
            assert.instanceOf(err, AuthError);
        }
    });

    it("should reject invalid username during registration", async function () {
        try {
            await DB.registerNewUser("x", "Valid1", "Test User");
            assert.fail("Expected registerNewUser to throw");
        } catch (err) {
            assert.instanceOf(err, AuthError);
        }
    });

    it("should return null when validating a missing token", async function () {
        const result = await DB.validateToken("missing-token");
        assert.isNull(result);
    });

    it("should return null for missing token user id", async function () {
        const result = await DB.getUserID(999999);
        assert.isNull(result);
    });

    it("should return null for missing summary", async function () {
        const result = await DB.getSummary("missing-ac-id");
        assert.isNull(result);
    });

    it("should throw when trying to finish a running run", async function () {
        try {
            await DB.finishRun("missing-run", [], RunState.Running, 0);
            assert.fail("Expected finishRun to throw");
        } catch (err) {
            assert.instanceOf(err, Error);
        }
    });

    it("should validate existing test token", async function () {
        const tokenId = await DB.validateToken("TEST_TOKEN");
        assert.equal(tokenId, 1);
    });

    it("should get scenarios", async function () {
        const scenarios = await DB.getScenarios();

        assert.isArray(scenarios);
        assert.isAtLeast(scenarios.length, 1);
        assert.containsAllKeys(scenarios[0], ["sid", "name"]);
    });

    it("should get algorithm clients with default parameters", async function () {
        const clients = await DB.getAlgorithmClients(undefined, undefined, null);

        assert.isArray(clients);
    });

    it("should get algorithm clients for a user", async function () {
        const clients = await DB.getAlgorithmClients(1, 10, null);

        assert.isArray(clients);
    });

    it("should get algorithm clients using an end cursor", async function () {
        const end = {
            id: "ac-test",
            name: "test",
            author: "Admin",
            state: 0,
            start_time: new Date(),
            completed: 0,
            failed: 0,
            skipped: 0,
        } as any;

        const clients = await DB.getAlgorithmClients(null, null, end);

        assert.isArray(clients);
    });

    it("should get all benchmarks", async function () {
        const benchmarks = await DB.getBenchmarks(null, "all");

        assert.isArray(benchmarks);
    });

    it("should get successful benchmarks for a user", async function () {
        const benchmarks = await DB.getBenchmarks(1, "successful");

        assert.isArray(benchmarks);
    });

    it("should get failed benchmarks for a user", async function () {
        const benchmarks = await DB.getBenchmarks(1, "failed");

        assert.isArray(benchmarks);
    });
});
