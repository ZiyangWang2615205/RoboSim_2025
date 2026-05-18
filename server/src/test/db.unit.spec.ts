import { assert, expect } from "chai";
import { describe } from "mocha";
import DB from "../db_handler";
import { UserModel } from "../db_types";
import { defaultScenarios } from "../model/default_scenarios";
import { BoxType } from "../types/index";

describe("Database Initialisation", () => {
    it("should respond to basic queries", async() => {
        let result = await DB.all("SELECT 1 + 1");

        expect(result).to.deep.equal([{ '?column?': 2 }]);
    });

    it("should have the correct number of tables", async() => {
        let result = await DB.all(
            "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'",
        );

        expect(result).to.have.lengthOf(7);
    });
});

describe("Token Validation Function", () => {
    beforeEach(async() => {
        try {
            // Clear relevant tables before each test to ensure a clean state
            await DB.run("DELETE FROM Users WHERE username != 'admin'");
            await DB.run("DELETE FROM ACReg");
            // to prevent id collisions
            await DB.run("ALTER SEQUENCE users_id_seq RESTART WITH 1000");
        } catch (e) {
            console.error(e);
            console.log("Database cleanup warning:", e);
        }
    });

    /* it("should validate an existing token", async() => {
        await DB.run(
            "INSERT INTO Users (ID, username, password, name) VALUES (2, 'testuser', 'testpassword', 'Test User')",
        );

        // Insert a token into the Tokens table to simulate an existing token
        await DB.run(`INSERT INTO Tokens (token, userid) VALUES ('testtoken', 2)`);

        const userid = await DB.validateToken("testtoken");
        
        expect(userid).to.equal(3); //  1 from token api test
    });
    */ 
    it("should reject if the token does not exist", async() => {
        const authDataResult = await DB.validateToken("nonexistenttoken");

        expect(authDataResult).to.be.null;
    });
});

describe("Scenario storage", function () {
    const customScenarios = [
        {
            name: "Custom Scenario",
            start: [],
            requirements: [],
            width: 10,
            height: 10,
            depth: 10,
            box_type: BoxType.Type1,
            exit_zone: {x1:0, x2:0, y1:0, y2:0, z1:0, z2:0},
            zone_problem: false
        },
    ];

    const default_names = defaultScenarios.map((scenario) => scenario.name);

    it("should contain the default scenarios", async function () {
        const scenarios = (await DB.getDefaultScenarios())
            .filter((scenario) => default_names.includes(scenario.name))
            .map(({ id, ...scenario }) => ({
            ...scenario,
            height: Number(scenario.height),
            width: Number(scenario.width),
            depth: Number(scenario.depth),
            }));

        assert.deepEqual(scenarios, defaultScenarios);
    });

    it("should allow custom scenarios to be added", async function () {
        await DB.addCustomScenarios(customScenarios);

        assert.isNotNull(
            await DB.get("SELECT * FROM scenarios WHERE name = $1", [
                customScenarios[0].name,
            ]),
        );
    });

    it("should differentiate between default and custom scenarios", async function () {
        await DB.addCustomScenarios(customScenarios);

        const default_scenarios =(await DB.getDefaultScenarios()).map(
            ({ id, ...scenario }) => scenario,
        );

        assert.notDeepInclude(default_scenarios, customScenarios[0]);
    });
});

describe("Users and Sessions Function", () => {
    // added cleanup hook to prevent "Duplicate Key" errors
    beforeEach(async () => {
        try {
            // deleted Daniel if he exists from a previous failed run
            await DB.run("DELETE FROM Sessions");
            await DB.run("DELETE FROM Users WHERE username = 'Daniel'");
        } catch (e) {
            console.error(e);
            console.log("Database cleanup warning:", e);
        }
    });

    it("should add and remove a new user", async () => {
        const result = await DB.registerNewUser(
            "Daniel",
            "123456Qw",
            "test_user",
        );
        expect(result).not.to.throw;
        expect(await DB.verifyUser("Daniel", "12345677Qw")).to.be.null;
        expect(await DB.verifyUser("Daniel", "123456Qw")).to.not.be.null;
        await DB.removeUser("Daniel");
        expect(await DB.verifyUser("Daniel", "123456Qw")).to.be.null;
    });
    
    it("should maintain a session id", async () => {
        await DB.registerNewUser("Daniel", "123456Qw", "test_user");

        await DB.run(`DELETE FROM Sessions`);
        expect(await DB.all(`SELECT * FROM Sessions`)).to.be.an("array").that.is
            .empty;

        const result = await DB.get("SELECT ID FROM Users WHERE username = $1", [
            "Daniel"
        ]) as UserModel;
        const userid = result.id;
        const sessionid = await DB.addSessionID(userid, Date.now() + 10) as string;
        expect(await DB.verifySessionID("Daniel", sessionid, Date.now())).to.not.be
            .null;

        // Wait for 15ms
        await new Promise((f) => setTimeout(f, 15));

        expect(await DB.verifySessionID("Daniel", sessionid, Date.now())).to.be.null;
    });
    
}); 