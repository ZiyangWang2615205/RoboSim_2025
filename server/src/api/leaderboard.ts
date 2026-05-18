import express from "express";
import DB from "../db_handler.js";

const Router = express.Router();

// /api/leaderboard?page=n&sort=column&desc=true|false
// Get the leaderboard over all default scenarios.
//
// Query parameters:
// - sort: The sorting method. One of:
//     * "completed-time"   – completed desc, then avg time, then avg moves, then avg energy
//     * "completed-moves"  – completed desc, then avg moves, then avg time, then avg energy
//     * "completed-energy" – completed desc, then avg energy, then avg time, then avg moves
// - page: The page number. Pages contain 15 rows.
Router.get("/", async (req, res) => {
    const page = Number.parseInt(String(req.query.page || "1"));

    if (isNaN(page) || page < 1) {
        res.status(400).send({ message: "`page` is invalid" });
        return;
    }

    // const sort_by = req.query.sort || "completed-time";

    // const sort_column =
    //     sort_by === "completed-time" ? "time_taken" : "move_count";
    // const second_sort_column =
    //     sort_by === "completed-time" ? "move_count" : "time_taken";
    const sort_by = String(req.query.sort || "completed-time");

    let sort_column: string;
    let second_sort_column: string;
    let third_sort_column: string;

    if (sort_by === "completed-time") {
        sort_column = "time_taken";
        second_sort_column = "move_count";
        third_sort_column = "energy_used";
    } else if (sort_by === "completed-moves") {
        sort_column = "move_count";
        second_sort_column = "time_taken";
        third_sort_column = "energy_used";
    } else if (sort_by === "completed-energy") {
        sort_column = "energy_used";
        second_sort_column = "time_taken";
        third_sort_column = "move_count";
    } else {
        // fallback
        sort_column = "time_taken";
        second_sort_column = "move_count";
        third_sort_column = "energy_used";
    }

    const count_query = `
        SELECT COUNT(*) as count FROM ACReg
        LEFT JOIN Tokens ON ACReg.tokenid = Tokens.ID
        LEFT JOIN Users ON Tokens.userid = Users.ID
        WHERE ACReg.ACID IN (SELECT ACID FROM Runs WHERE Runs.state != 0)
    `;

    const count_result =  await DB.get(count_query) as { count: number };
    const count = count_result.count;

    const main_query = `
        WITH grouped AS (
            SELECT
                ACReg.name as algorithm_name,
                MIN(Users.name) as author,
                AVG(time_taken) as time_taken,
                AVG(move_count) as move_count,
                AVG(energy_used) as energy_used,
                COUNT(*) AS completed
            FROM Runs
            LEFT JOIN ACReg ON ACReg.ACID=Runs.ACID 
            LEFT JOIN Scenarios ON Scenarios.SID = Runs.SID
            LEFT JOIN Tokens ON ACReg.tokenid = Tokens.ID
            LEFT JOIN Users ON Tokens.userid = Users.ID
            WHERE ACReg.state != 0 AND ACReg.publish_runs = TRUE
                AND Runs.state = 1 AND Scenarios.is_default = TRUE
            GROUP BY ACReg.ACID, ACReg.name
        )
        SELECT * FROM grouped
        ORDER BY completed DESC, ${sort_column}, ${second_sort_column}, ${third_sort_column}
        LIMIT 15 OFFSET $1
    `;

    const offset = (page - 1) * 15;

    const data = await DB.all(main_query, [offset]);

    const { total_scenarios } = await DB.get(
        "SELECT COUNT(*) as total_scenarios FROM Scenarios WHERE is_default = TRUE",
    ) as { total_scenarios: number };

    res.send({ count, data, total_scenarios });
});

// /api/leaderboard/scenario/:sid?page=n&sort=column&desc=true|false
// Returns the all leaderboard for a specific scenario specified by the
// scenario ID.
//
// Query parameters:
// - sort: The sorting method. One of:
//     * "time"   – sort by time taken, then move count, then energy used
//     * "moves"  – sort by move count, then time taken, then energy used
//     * "energy" – sort by energy used, then time taken, then move count
// - page: The page number. Pages contain 15 rows.

Router.get("/scenario/:sid", async (req, res) => {
    const scenario_id = req.params.sid;

    const page = Number.parseInt(String(req.query.page || "1"));

    if (isNaN(page) || page < 1) {
        res.status(400).send({ message: "`page` is invalid" });
        return;
    }

    // const sort = req.query.sort || "time";

    // const sort_column = sort === "time" ? "time_taken" : "move_count";
    // const second_sort_column = sort === "time" ? "move_count" : "time_taken";

    const sort = String(req.query.sort || "time");

    let sort_column: string;
    let second_sort_column: string;
    let third_sort_column: string;

    if (sort === "time") {
        sort_column = "time_taken";
        second_sort_column = "move_count";
        third_sort_column = "energy_used";
    } else if (sort === "moves") {
        sort_column = "move_count";
        second_sort_column = "time_taken";
        third_sort_column = "energy_used";
    } else if (sort === "energy") {
        sort_column = "energy_used";
        second_sort_column = "time_taken";
        third_sort_column = "move_count";
    } else {
        // fallback
        sort_column = "time_taken";
        second_sort_column = "move_count";
        third_sort_column = "energy_used";
    }

    const count_query = `SELECT COUNT(*) as count
        FROM Runs
        LEFT JOIN ACReg ON ACReg.ACID=Runs.ACID
        WHERE ACReg.state != 0 AND ACReg.publish_runs = TRUE
        AND Runs.SID = $1
        AND Runs.state != 0
    `;

    const count_params = [scenario_id];

    const count_result =  await DB.get(count_query, count_params) as { count: number };
    const count = count_result.count;

    const main_query = `SELECT ACReg.name as algorithm_name, Users.name as author, Runs.state, finish_time, move_count, time_taken, energy_used, Scenarios.name as scenario_name FROM Runs 
        FULL OUTER JOIN ACReg ON ACReg.ACID=Runs.ACID 
        FULL OUTER JOIN Scenarios ON Scenarios.SID = Runs.SID
        LEFT JOIN Tokens ON ACReg.tokenid = Tokens.ID
        LEFT JOIN Users ON Tokens.userid = Users.ID
        WHERE ACReg.state != 0 AND ACReg.publish_runs = TRUE
        AND Runs.SID = $1 AND Runs.state = 1
        ORDER BY ${sort_column}, ${second_sort_column}, ${third_sort_column}
        LIMIT 15 OFFSET $2
    `;

    const offset = (page - 1) * 15;
    const main_params = [scenario_id, offset];

    const data = await DB.all(main_query, main_params);

    res.send({ count, data });
});

/**
 * fetching benchmarking data for table & applying any added filters
 */
Router.get("/benchmarks", async (req, res) => {
    try {
        // debugging
        console.log("query parameters:", req.query);
        // extracting filters
        const filter = req.query.filter as string;
        const status = (req.query.status as "all" | "successful" | "failed") || "all";

        // getting type, author and scenario from url
        const boxType = (req.query.type as "type1" | "type2") || "type1";
        const author = (req.query.author as string) || null;
        const scenario = (req.query.scenario as string) || null;

        // grabbing logged in users id
        // assuming verifySessionIDMiddleware attaches it to `res.locals.userid` - might need to adjust
        const loggedInUserId = (req as any).userId || (res as any).locals?.userid || null; 

        // if 'my' filter, passing users id, if not passing null
        const userIdToQuery = filter === "my" ? loggedInUserId : null;

        const benchmarks = await DB.getBenchmarks(userIdToQuery, status, boxType, author, scenario);

        res.json({
            currentUserId: loggedInUserId,
            runs: benchmarks
        });
        
    // error catching
    } catch (error) {
        console.error("Error fetching benchmarks:", error);
        res.status(500).json({ error: "Failed to fetch benchmarks" });
    }
});

/**
 * securely deleting specific run
 */
Router.delete("/benchmarks/:id", async (req, res) => {
    try {
        const runId = req.params.id;

        const loggedInUserId = (req as any).userId || (res as any).locals?.userid || null; 

        // not letting unauth users delete
        if (!loggedInUserId) {
            // FIX sending response then returning on separate line
            res.status(401).json({ error: "Unauthorized: Please log in." });
            return; 
        }

        await DB.deleteRun(runId, loggedInUserId);

        res.status(200).json({ message: "Run deleted successfully" });
        
    } catch (error) {
        console.error("Error deleting benchmark:", error);
        res.status(500).json({ error: "Failed to delete benchmark" });
    }
});

export default Router;
