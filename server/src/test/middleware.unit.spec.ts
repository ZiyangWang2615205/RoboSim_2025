import { assert } from "chai";
import { describe, it, beforeEach, afterEach } from "mocha";
import verifySessionIDMiddleware from "../connect/middleware";
import DB from "../db_handler";

describe("verifySessionIDMiddleware", () => {
    const originalNodeEnv = process.env.NODE_ENV;
    let originalVerifySessionID: typeof DB.verifySessionID;

    beforeEach(() => {
        process.env.NODE_ENV = "production";
        originalVerifySessionID = DB.verifySessionID;
    });

    afterEach(() => {
        process.env.NODE_ENV = originalNodeEnv;
        DB.verifySessionID = originalVerifySessionID;
    });

    function mockReq(overrides: any = {}) {
        return {
            headers: {},
            path: "/api/protected",
            cookies: {},
            ...overrides,
        };
    }

    function mockRes() {
    return {
        locals: {} as Record<string, any>,
        statusCode: 200,
        body: undefined as any,
        redirectedTo: undefined as any,
        clearedCookies: [] as string[],
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(body: any) {
            this.body = body;
            return this;
        },
        send(body: any) {
            this.body = body;
            return this;
        },
        redirect(path: string) {
            this.redirectedTo = path;
            return this;
        },
        clearCookie(name: string) {
            this.clearedCookies.push(name);
            return this;
        },
    };
}

    //test under there
    it("should store authorization header in res.locals.userid", async () => {
        const req = mockReq({
            headers: { authorization: "user-123" },
        });
        const res = mockRes();
        let called = false;

        await verifySessionIDMiddleware(req as any, res as any, () => {
            called = true;
        });

        assert.equal(res.locals.userid, "user-123");
        assert.isFalse(called);
        assert.equal(res.statusCode, 401);
    });

    it("should allow exempt paths", async () => {
        const req = mockReq({
            path: "/api/health",
        });
        const res = mockRes();
        let called = false;

        await verifySessionIDMiddleware(req as any, res as any, () => {
            called = true;
        });

        assert.isTrue(called);
    });

    it("should reject api requests with missing cookies", async () => {
        const req = mockReq({
            path: "/api/protected",
            cookies: {},
        });
        const res = mockRes();

        await verifySessionIDMiddleware(req as any, res as any, () => {});

        assert.equal(res.statusCode, 401);
        assert.deepEqual(res.body, {
            error: "Unauthorised access to api: Invalid cookies",
        });
    });

     it("should redirect page requests with missing cookies", async () => {
        const req = mockReq({
            path: "/dashboard/index.html",
            cookies: {},
        });
        const res = mockRes();

        await verifySessionIDMiddleware(req as any, res as any, () => {});

        assert.deepEqual(res.clearedCookies, ["username", "sessionid"]);
        assert.equal(res.redirectedTo, "/auth/login/index.html");
    });

     it("should reject api requests with invalid session", async () => {
        DB.verifySessionID = async () => null as any;

        const req = mockReq({
            path: "/api/protected",
            cookies: {
                username: "admin",
                sessionid: "bad-session",
            },
        });
        const res = mockRes();

        await verifySessionIDMiddleware(req as any, res as any, () => {});

        assert.equal(res.statusCode, 401);
        assert.deepEqual(res.body, {
            error: "Unauthorised access to api",
        });
    });

      it("should allow requests with valid session", async () => {
        DB.verifySessionID = async () => "user-1" as any;

        const req = mockReq({
            path: "/dashboard/index.html",
            cookies: {
                username: "admin",
                sessionid: "valid-session",
            },
        });
        const res = mockRes();
        let called = false;

        await verifySessionIDMiddleware(req as any, res as any, () => {
            called = true;
        });

        assert.equal(res.locals.userid, "user-1");
        assert.isTrue(called);
    });

       it("should return 500 when DB verification throws", async () => {
        DB.verifySessionID = async () => {
            throw new Error("db failed");
        };

        const req = mockReq({
            path: "/api/protected",
            cookies: {
                username: "admin",
                sessionid: "session",
            },
        });
        const res = mockRes();

        await verifySessionIDMiddleware(req as any, res as any, () => {});

        assert.equal(res.statusCode, 500);
        assert.equal(res.body, "Internal Server Error");
    });

});
