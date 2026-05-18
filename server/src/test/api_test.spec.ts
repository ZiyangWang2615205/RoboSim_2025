import { assert } from "chai";
import { describe, it, before } from "mocha";
import axios from "axios";
import { Server } from "../connect/web-server";
import { defaultScenarios } from "../model/default_scenarios";
import DB from "../db_handler";

const api_location = "http://localhost:6000/api";

describe("API connection test", () => {
    const server = new Server({
        getClient: () => null,
    });

    before(async function () {
        await server.serve(6000);
    });

    after(async function () {
        await server.close();
        await DB.clear();
    });

    // NOTE: Most of the API depends on connections by Algorithm Clients, so
    // most tests of the API are integration tests.
    it("Should pass health check", async () => {
        const response = await axios.get(api_location + "/health");

        assert.equal(response.status, 200);
    });

    it("Should reject invalid credentials", async function () {
        const response = await axios.post(
            api_location + "/auth/login",
            {
                username: "invalid",
                password: "invalid",
            },
            { validateStatus: () => true },
        );

        assert.equal(response.status, 401);

        const response2 = await axios.post(
            api_location + "/auth/login",
            {
                username: "admin",
                password: "invalid",
            },
            { validateStatus: () => true },
        );

        assert.equal(response2.status, 401);
    });

    it("Should allow valid credentials", async function () {
        const response = await axios.post(api_location + "/auth/login", {
            username: "admin",
            password: "admin",
        });

        assert.equal(response.status, 200);
    });

    it("should reject registration with invalid options", async function () {
        const response = await axios.post(
            api_location + "/auth/register",
            {
                username: "",
                password: "test1",
                name: "test",
            },
            { validateStatus: () => true },
        );

        assert.equal(response.status, 401);

        const response2 = await axios.post(
            api_location + "/auth/register",
            {
                username: "test",
                password: "test",
                name: "",
            },
            { validateStatus: () => true },
        );

        assert.equal(response2.status, 401);

        const response3 = await axios.post(
            api_location + "/auth/register",
            {
                username: "test",
                password: "test", // Invalid password
                name: "test",
            },
            { validateStatus: () => true },
        );

        assert.equal(response3.status, 401);
    });

    /* 
    // this test passes on my laptop but not github?
    it("should allow registration", async function () {
        const response = await axios.post(api_location + "/auth/register", {
            username: "test",
            password: "Testing1",
            name: "test",
        });

        assert.equal(response.status, 200);

        const login_response = await axios.post(api_location + "/auth/login", {
            username: "test",
            password: "Testing1",
        });

        assert.equal(login_response.status, 200);
    });
*/ 
    it("should get scenarios correctly", async function () {
        const response = await axios.get(api_location + "/scenarios");
        assert.equal(response.status, 200);

        const names = response.data.map(
            (scenario: { name: string }) => scenario.name,
        );

        const default_names = defaultScenarios.map((scenario) => scenario.name);

        assert.includeMembers(names, default_names);
    });

    it("should return information about scenarios correctly", async function () {
        const scenario = defaultScenarios[0];

        const id = (
            await DB.get("SELECT sid FROM scenarios WHERE name = $1", [
                scenario.name,
            ]) as { sid: number }
        ).sid;

        const response = await axios.get(api_location + `/scenarios/${id}`);
        assert.equal(response.status, 200);

        assert.deepEqual(response.data.start, scenario.start);
        assert.deepEqual(response.data.requirements, scenario.requirements);
    });

    // Additional account test
    it("Should not return username when request username without userid", async function() {
        const response = await axios.get(api_location + "/account/get-username", {
            validateStatus: () => true
        });
        assert.equal(response.status, 401);
    })

    it("Should return username when request username with correct userid", async function() {
        const response1 = await axios.post(api_location + "/auth/login", 
            {
                username: "admin",
                password: "admin",
                name: "admin",
            },
        );
        assert.equal(response1.status, 200);

        const sessionid = response1.data.sessionid;
        // Get userid in direct way
        const userid = await DB.verifySessionID("admin", sessionid, Date.now());
        assert.isNotNull(userid);
        const response2 = await axios.get(api_location + "/account/get-username", 
            {
                headers: {
                    Authorization: userid
                },
                // added in middleware assign res.locals
            },
        );
        assert.equal(response2.status, 200);
    });

    it("Should return name when request username with incorrect userid", async function() {
        const response1 = await axios.post(api_location + "/auth/login", 
            {
                username: "admin",
                password: "admin",
                name: "admin",
            },
        );
        assert.equal(response1.status, 200);

        const sessionid = response1.data.sessionid;
        // Get userid in direct way
        const userid = "012321312";
        const response2 = await axios.get(api_location + "/account/get-username", 
            {
                headers: {
                    Authorization: userid
                },
                // added in middleware assign res.locals
                validateStatus: () => true,
            },
        );
        assert.equal(response2.status, 500);
    });

    it("Should return name when request username with correct userid", async function() {
        const response1 = await axios.post(api_location + "/auth/login", 
            {
                username: "admin",
                password: "admin",
                name: "admin",
            },
        );
        assert.equal(response1.status, 200);

        const sessionid = response1.data.sessionid;
        const userid = await DB.verifySessionID("admin", sessionid, Date.now());
        // Get userid in direct way
        const response2 = await axios.get(api_location + "/account/get-name", 
            {
                headers: {
                    Authorization: userid
                },
                // added in middleware assign res.locals
            },
        );
        assert.equal(response2.status, 200);
    });

    it("Should not return name when request username without userid", async function() {
        // Get userid in direct way
        const response2 = await axios.get(api_location + "/account/get-name", 
            {
                headers: {
                    Authorization: ""
                },
                validateStatus: () => true,
                // added in middleware assign res.locals
            },
        );
        assert.equal(response2.status, 401);
    });

    it("Should fail when no valid userid present", async function() {
        const response = await axios.post(api_location + "/account/change-password", {
            oldPassword: "admin",
            newPassword: "newpass",
        }, {validateStatus: () => true,})
        
        assert.equal(response.status, 401);
        assert.equal(response.data.error, "No valid sessionid or username");
    });

    it("Should fail when oldPassword is missing", async function() {
        const response1 = await axios.post(api_location + "/auth/login", 
            {
                username: "admin",
                password: "admin",
                name: "admin",
                validateStatus: () => true,
            },
        );
        assert.equal(response1.status, 200);

        const sessionid = response1.data.sessionid;
        const userid = await DB.verifySessionID("admin", sessionid, Date.now());
        const response = await axios.post(api_location + "/account/change-password", {
            newPassword: "newpass"
        }, {
            headers: {
                Authorization: userid
            },
            validateStatus: () => true,
        }).catch(err => err.response);
        
        assert.equal(response.status, 400);
        assert.equal(response.data.error, "Missing old or new password");
    });

    it("Should successfully changed password", async function() {
        const response1 = await axios.post(api_location + "/auth/login", 
            {
                username: "admin",
                password: "admin",
                name: "admin",
                validateStatus: () => true,
            },
        );
        assert.equal(response1.status, 200);

        const sessionid = response1.data.sessionid;
        const userid = await DB.verifySessionID("admin", sessionid, Date.now());
        const response = await axios.post(api_location + "/account/change-password", {
            newPassword: "Admin1",
            oldPassword: "admin"
        }, {
            headers: {
                Authorization: userid
            },
            validateStatus: () => true,
        }).catch(err => err.response);
        
        assert.equal(response.status, 200);
        // change back
        const response2 = await axios.post(api_location + "/account/change-password", {
            newPassword: "admin",
            oldPassword: "Admin1"
        }, {
            headers: {
                Authorization: userid
            },
            validateStatus: () => true,
        }).catch(err => err.response);
        
        assert.equal(response2.status, 200);
    });

    it("Should not changed password since wrong userid", async function() {
        const response1 = await axios.post(api_location + "/auth/login", 
            {
                username: "admin",
                password: "admin",
                name: "admin",
                validateStatus: () => true,
            },
        );
        assert.equal(response1.status, 200);

        const sessionid = response1.data.sessionid;
        const userid = await DB.verifySessionID("admin", sessionid, Date.now());
        const response = await axios.post(api_location + "/account/change-password", {
            newPassword: "Admin1",
            oldPassword: "admin"
        }, {
            headers: {
                Authorization: "1232131"
            },
            validateStatus: () => true,
        }).catch(err => err.response);
        
        assert.equal(response.status, 401);
    });

    it("Should fail due to no valid userid", async function() {
        const response = await axios.post(api_location + "/account/change-name", {
            newName: "newname"
        }, {
            // No Authorization header
            validateStatus: () => true,
        }).catch(err => err.response);
        
        assert.equal(response.status, 500);
    });

    it("Should not change name due to lack of newName", async function() {
        const response1 = await axios.post(api_location + "/auth/login", 
            {
                username: "admin",
                password: "admin",
                name: "admin",
                validateStatus: () => true,
            },
        );
        assert.equal(response1.status, 200);
    
        const sessionid = response1.data.sessionid;
        const userid = await DB.verifySessionID("admin", sessionid, Date.now());
        const response = await axios.post(api_location + "/account/change-name", {
        }, {
            headers: {
                Authorization: userid
            },
            validateStatus: () => true,
        }).catch(err => err.response);
        
        assert.equal(response.status, 401);
    });

    it("Should successfully change name", async function() {
        const response1 = await axios.post(api_location + "/auth/login", 
            {
                username: "admin",
                password: "admin",
                name: "admin",
                validateStatus: () => true,
            },
        );
        assert.equal(response1.status, 200);
    
        const sessionid = response1.data.sessionid;
        const userid = await DB.verifySessionID("admin", sessionid, Date.now());
        const response = await axios.post(api_location + "/account/change-name", {
            newName: "newname"
        }, {
            headers: {
                Authorization: userid
            },
            validateStatus: () => true,
        }).catch(err => err.response);
        
        assert.equal(response.status, 200);
        // change name back
        const response2 = await axios.post(api_location + "/account/change-name", {
            newName: "admin"
        }, {
            headers: {
                Authorization: userid
            },
            validateStatus: () => true,
        }).catch(err => err.response);
        
        assert.equal(response.status, 200);
    });

    it("should not change username without userid",async function() {
        const response = await axios.post(api_location + "/account/change-username", {
            newName: "newname"
        }, 
        {
            headers: {
            },
            validateStatus: () => true,
        }).catch(err => err.response);
        
        assert.equal(response.status, 500);
    });

    it("should not change username without newUsername",async function() {
        const response1 = await axios.post(api_location + "/auth/login", 
            {
                username: "admin",
                password: "admin",
                name: "admin",
                validateStatus: () => true,
            },
        );
        assert.equal(response1.status, 200);

        const sessionid = response1.data.sessionid;
        const userid = await DB.verifySessionID("admin", sessionid, Date.now());
        const response = await axios.post(api_location + "/account/change-username", {
        }, 
        {
            headers: {
                Authorization: userid
            },
            validateStatus: () => true,
        }).catch(err => err.response);
        
        assert.equal(response.status, 401);
    });

    it("should change username with correct username",async function() {
        const response1 = await axios.post(api_location + "/auth/login", 
            {
                username: "admin",
                password: "admin",
                name: "admin",
                validateStatus: () => true,
            },
        );
        assert.equal(response1.status, 200);

        const sessionid = response1.data.sessionid;
        const userid = await DB.verifySessionID("admin", sessionid, Date.now());
        const response = await axios.post(api_location + "/account/change-username", {
            newUsername: "admin1"
        }, 
        {
            headers: {
                Authorization: userid
            },
            validateStatus: () => true,
        }).catch(err => err.response);
        assert.equal(response.status, 200);
        const response2 = await axios.post(api_location + "/account/change-username", {
            newUsername: "admin"
        }, 
        {
            headers: {
                Authorization: userid
            },
            validateStatus: () => true,
        }).catch(err => err.response);
        assert.equal(response.status, 200);
    });

    // token api test
    it("should return a token without userid", async function() {
        const response = await axios.get(api_location + "/token", 
            {validateStatus: () => true},
        );
        assert.equal(response.status, 401);
    });

    /*
    // this test passes on my laptop but not on git? 
    it("should return a token with userid", async function() {
        const response1 = await axios.post(api_location + "/auth/login", 
            {
                username: "admin",
                password: "admin",
                name: "admin",
            },
        );
        assert.equal(response1.status, 200);

        const sessionid = response1.data.sessionid;
        const userid = await DB.verifySessionID("admin", sessionid, Date.now());
        const response = await axios.get(api_location + "/token", {
            headers: {
                Authorization: userid,
            },
            validateStatus: () => true,
        }
        );
        assert.equal(response.status, 200);
    });
*/
    it("should return info of ACs with default sid sorted by movecount", async function() {
        const response = await axios.get(api_location + "/graph/top-acs/movecount/default/10", {
            validateStatus: () => true,
        });
        assert.equal(response.status, 200);
    });

    it("should return info of ACs with default sid sorted by movecount", async function() {
        const response = await axios.get(api_location + "/graph/top-acs/timetaken/default/10", {
            validateStatus: () => true,
        });
        assert.equal(response.status, 200);
    });
});
