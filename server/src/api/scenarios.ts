import express from "express";
import DB from "../db_handler.js";
import { ScenarioModel } from "../db_types.js";

const Router = express.Router();
Router.use(express.json());

// /api/scenarios
Router.get("/", async (req, res) => {
    type Scenario = Pick<ScenarioModel, "SID" | "name">;

    const scenarios = await DB.all(
        "SELECT SID, name FROM scenarios WHERE is_default = TRUE",
    ) as Scenario[];

    res.send(scenarios);
});

// /api/scenarios/:id
// Returns the start and requirements for a given scenario ID
Router.get("/:id", async (req, res) => {
    type Scenario = Pick<ScenarioModel, "start" | "requirements">;

    const scenario = await DB.get(
        "SELECT start, requirements FROM scenarios WHERE SID=$1",
        [req.params.id],
    ) as Scenario;

    res.send(
        scenario
            ? {
                  start: JSON.parse(scenario.start),
                  requirements: JSON.parse(scenario.requirements),
              }
            : null,
    );
});

// /api/scenarios/upload
// Uploads a new scenario to the database
Router.post("/upload", async (req, res) => {
    try {
        const { name, start, requirements, width, height, depth } = req.body;
        if (!name || !start || !requirements || !width || !height || !depth) {
            res.status(400).json({ message: "Missing required fields" });
            return;
        }

        await DB.run(
            `INSERT INTO Scenarios (name, start, requirements, width, height, depth) VALUES ($1, $2, $3, $4, $5, $6)`,
            [name, start, requirements, width, height, depth],
        );

        res.status(201).json({
            message: "Scenario added successfully",
            id: name,
        });
    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error instanceof Error ? error.message : "Server error",
        });
    }
});

// /api/scenarios/delete/:sid
// Deletes a scenario from the database given a SID
Router.delete("/delete/:sid", async (req, res) => {
    await DB.run("DELETE FROM Scenarios WHERE SID=$1", [req.params.sid]);
});

export default Router;
