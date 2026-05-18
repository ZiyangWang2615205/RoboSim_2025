import express from "express";
import DB from "../db_handler.js";
import { RunModel, ScenarioModel } from "../db_types.js";

const Router = express.Router();

// GET /api/replay/:id
// Gets the replay data for a given RID
Router.get("/:id", async (req, res) => {
    const data = await DB.get(
        `SELECT actions, Scenarios.width, Scenarios.height, Scenarios.depth, Scenarios.start, Scenarios.requirements, Scenarios.box_type, Scenarios.exit_zone FROM Runs 
        LEFT JOIN Scenarios ON Scenarios.SID = Runs.SID 
        WHERE RID = $1 AND state != 0`,
        [req.params.id],
    ) as Pick<RunModel, "actions"> &
        Pick<ScenarioModel, "width" | "height" | "depth" | "start" | "requirements" | "box_type" | "exit_zone">;
  
    if (!data || !data.actions) {
        res.status(404).end();
        return;
    }

    res.send({
        actions: JSON.parse(data.actions),
        width: data.width,
        height: data.height,
        depth: data.depth,
        start: JSON.parse(data.start),
        requirements: JSON.parse(data.requirements),
        box_type: data.box_type,
        exit_zone: JSON.parse(data.exit_zone)
    });
});

// /api/replay/rids/:sid
// Returns all available RIDs for a given SID
Router.get("/rids/:sid", async (req, res) => {
    let data = await DB.all(
        `SELECT RID, name, author, finish_time, move_count, time_taken FROM Runs 
        RIGHT JOIN ACReg ON Runs.ACID=ACReg.ACID 
        WHERE SID = $1 AND state != 0`,
        [req.params.sid],
    );

    res.send(data);
});

// /api/replay/moves/:rid
// Returns all available moves for a given RID
Router.get("/moves/:rid", async (req, res) => {
    let data = await DB.all("SELECT actions FROM Runs WHERE RID = $1", [
        req.params.rid,
    ]);

    res.send(data);
});

// /api/replay/meta/:rid
// Returns all available meta data for a given RID
Router.get("/meta/:rid", async (req, res) => {
    let data = await DB.all(
        "SELECT SID, ACID, move_count, time_taken FROM Runs WHERE RID = $1",
        [req.params.rid],
    );

    res.send(data);
});

export default Router;
