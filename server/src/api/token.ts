import express from "express";
import DB from "../db_handler.js";

const Router = express.Router();

// /api/tokens
// Generates a new token
Router.get("/", async (req, res) => {
    const userid = res.locals.userid;

    if (!userid) {
        res.status(401);
        throw new Error("User is not logged in.");
    }

    var tk = await DB.generateToken(userid);

    res.status(200).send(tk);
});

export default Router;
