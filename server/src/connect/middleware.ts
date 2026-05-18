import { Request, Response, NextFunction } from "express";
import DB from "../db_handler.js";

// making function async
export default async function verifySessionIDMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        res.locals.userid = authHeader;
    }

    if (process.env.NODE_ENV === "test") {
        return next();
    }

    // adding exemptPath for some urls to make sure user can access auth page
    const exemptPaths = [
        "/auth/",
        "/@vite/",
        "/src/",
        "/@fs/",
        "/node_modules/",
        "/api/auth/",
        "/assets/",
        "/api/health",
        "/textures/",
    ];

    if (
        req.path === "/" ||
        exemptPaths.some((path) => req.path.startsWith(path))
    ) {
        return next();
    }

    const sessionid = req.cookies?.sessionid;
    const username = req.cookies?.username;

    // adding input validation for cookies
    // prevent specific error where "{}" hit db
    if (!username || !sessionid || username === "{}" || sessionid === "{}") {
        if (req.path.startsWith("/api")) {
            res.status(401).json({ error: "Unauthorised access to api: Invalid cookies" });
            return;
        }
        // clearing bad cookies to prevent infinite loop
        res.clearCookie('username');
        res.clearCookie('sessionid');
        return res.redirect("/auth/login/index.html");
    }

    try {
        // added await
        // without await, 'result' is a Promise object, which causes the "{}" error later
        const result = await DB.verifySessionID(username, sessionid, Date.now());

        if (!result) {
            console.log(`user: ${username} does not have valid cookie`);
            if (req.path.startsWith("/api")) {
                res.status(401).json({ error: "Unauthorised access to api" });
                return;
            }
            return res.redirect("/auth/login/index.html");
        } else {
            res.locals.userid = result;
            next();
        }
    } catch (error) {
        console.error("Middleware DB Error:", error);
        res.status(500).send("Internal Server Error");
    }
}