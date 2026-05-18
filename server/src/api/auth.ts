import express from "express";
import DB, { AuthError } from "../db_handler.js";
import cookieParser from "cookie-parser";

const Router = express.Router();
Router.use(express.json());
Router.use(cookieParser());

// api/login
Router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await DB.verifyUser(username, password);
        if (result) {
            // set the age of session id 1 hour
            const sessionid = await DB.addSessionID(result, Date.now() + 3600 * 1000);
            // if there is a new assigned sessionid for this user
            if (sessionid) {
                res.cookie("username", username, {
                    httpOnly: true, // cannot send through js
                    secure: false, // without https
                });
                res.cookie("sessionid", sessionid, {
                    httpOnly: true, // cannot send through js
                    secure: false, // without https
                });
            } else {
                res.status(401).json({ error: "Internal error" });
            }
            res.status(200).json({ message: "user login successful", sessionid: sessionid});
        } else {
            res.status(401).json({ error: "incorrect username or password" });
        }
    } catch (err) {
        console.error(err);
        res.status(401).json({ error: "internal error" });
    }
});

Router.post("/register", async (req, res) => {
    try {
        const { username, password, name } = req.body;
        await DB.registerNewUser(username, password, name);
        res.status(200).json({ message: "user registered successfully" });
    } catch (err) {
        if (err instanceof AuthError) {
            res.status(401).json({ message: err.message });
        } else {
            console.error(err);
            res.status(401).json({ message: "Internal server error" });
        }
    }
});

Router.post("/logout", async (req, res) => {
    res.clearCookie("username", { httpOnly: true, path: "/" });
    res.clearCookie("sessionid", { httpOnly: true, path: "/" });
    res.status(200).json({ success: true });
});

export default Router;
