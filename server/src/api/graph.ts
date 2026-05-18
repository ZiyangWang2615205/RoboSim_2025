import express from "express";
import DB from "../db_handler.js";

const Router = express.Router();

// /api/graph/top-acs/:sid/:num
// returns info of top 'num' acs that have been run on given scenario, sorted by time taken
Router.get("/top-acs/timetaken/:sid/:num", async (req, res) => {
    let data;
    if (req.params.sid == "default"){
        data = await DB.all(
            `SELECT AcID, name 
            FROM(
                SELECT DISTINCT ON (ACReg.ACID) 
                ACReg.AcID, ACReg.name, Runs.time_taken
                FROM acreg 
                JOIN Runs ON ACReg.ACID = Runs.ACID 
                WHERE Runs.state =1 
                ORDER BY ACReg.AcID, Runs.time_taken)
            AS sub
            ORDER BY sub.time_taken
            limit $1`,
            [Number(req.params.num)]
        );
    }
    else{
        data = await DB.all(
            `SELECT ACReg.AcID, ACReg.name FROM ACReg 
            INNER JOIN Runs ON ACReg.ACID = Runs.ACID
            where Runs.state = 1 and Runs.SID = $1
            order by Runs.time_taken
            limit $2`,
            [req.params.sid, req.params.num]
        );
    }

    res.send(data);
});

// /api/graph/top-acs/:sid/:num
// returns info of top 'num' acs that have been run on given scenario, sorted by move count
Router.get("/top-acs/movecount/:sid/:num", async (req, res) => {
    let data;
    if (req.params.sid == "default"){
        data = await DB.all(
            `SELECT AcID, name
            FROM (
                SELECT DISTINCT ON (ACReg.AcID)
                ACReg.AcID, ACReg.name, Runs.move_count
                FROM ACReg 
                JOIN Runs ON ACReg.ACID = Runs.ACID
                where Runs.state = 1
                ORDER BY ACReg.AcID, Runs.move_count)
            AS sub
            ORDER BY sub.move_count
            limit $1`,
            [req.params.num]
        );
    }
    else{
        data = await DB.all(
            `SELECT ACReg.AcID, ACReg.name FROM ACReg 
            INNER JOIN Runs ON ACReg.ACID = Runs.ACID
            where Runs.state = 1 and Runs.SID = $1
            order by Runs.move_count
            limit $2`,
            [req.params.sid, req.params.num]
        );
    }

    res.send(data);
});

//--------------------------------------------------needs to implement the Energy Used -------------------------
// /api/graph/top-acs/:sid/:num
// returns info of top 'num' acs that have been run on given scenario, sorted by energy used
Router.get("/top-acs/energyused/:sid/:num", async (req, res) => {
    let data;
    if (req.params.sid == "default"){
        data = await DB.all(
            `SELECT DISTINCT ACReg.AcID, ACReg.name FROM ACReg 
            INNER JOIN Runs ON ACReg.ACID = Runs.ACID
            where Runs.state = 1
            order by Runs.energy_used
            limit $1`,
            [req.params.num]
        );
    }
    else{
        data = await DB.all(
            `SELECT ACReg.AcID, ACReg.name FROM ACReg 
            INNER JOIN Runs ON ACReg.ACID = Runs.ACID
            where Runs.state = 1 and Runs.SID = ?
            order by Runs.energy_used
            limit $2`,
            [req.params.sid, req.params.num]
        );
    }

    res.send(data);
});

// /api/graph/movecount/:sid/:acid
// Returns the move count for a given scenario ID and ACID
Router.get("/movecount/:sid/:acid", async (req, res) => { 
    let data = await DB.all(
        `SELECT move_count FROM Runs 
        FULL OUTER JOIN ACReg ON ACReg.ACID=Runs.ACID
        FULL OUTER JOIN Scenarios ON Scenarios.SID = Runs.SID
        where Runs.SID=$1 AND Runs.ACID=$2 AND Runs.state = 1`,
        [req.params.sid, req.params.acid],
    );

    res.send(data);
});

// /api/graph/timetaken/:sid/:acid
// Returns the time taken for a given scenario ID and ACID
Router.get("/timetaken/:sid/:acid", async (req, res) => {
    let data = await DB.all(
        `SELECT time_taken FROM Runs 
        FULL OUTER JOIN ACReg ON ACReg.ACID=Runs.ACID
        FULL OUTER JOIN Scenarios ON Scenarios.SID = Runs.SID
        where Runs.SID=$1 AND Runs.ACID=$2 AND Runs.state = 1`,
        [req.params.sid, req.params.acid],
    );
    res.send(data);
});

//--------------------------------------------------needs to implement the Energy Used -------------------------
// /api/graph/energyused/:sid/:acid
// Returns the energy used for a given scenario ID and ACID
Router.get("/energyused/:sid/:acid", async (req, res) => {
    let data = await DB.all(
        `SELECT energy_used FROM Runs 
        FULL OUTER JOIN ACReg ON ACReg.ACID=Runs.ACID
        FULL OUTER JOIN Scenarios ON Scenarios.SID = Runs.SID
        where Runs.SID=$1 AND Runs.ACID=$2 AND Runs.state = 1`,
        [req.params.sid, req.params.acid],
    );
    res.send(data);
});

// /api/graph/scenariosrun/:acid
// Returns all scenarios that a given AC has been run on
Router.get("/scenariosrun/:acid", async (req, res) => {
    let data = await DB.all(
        `SELECT Scenarios.SID, Scenarios.name FROM Scenarios
        FULL OUTER JOIN Runs ON Runs.SID=Scenarios.SID
        where Runs.ACID=$1 AND Runs.state = 1`,
        [req.params.acid],
    );
    res.send(data);
});

export default Router;
