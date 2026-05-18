import express from "express";
import leaderboardRouter from "./leaderboard.js";
import scenarioRouter from "./scenarios.js";
import tokenRouter from "./token.js";
import replayRouter from "./replay.js";
import authRouter from "./auth.js";
import graphRouter from "./graph.js"
import accountRouter from "./account.js"


const APIRouter = express.Router();
APIRouter.use(express.json());

// /api/auth
APIRouter.use("/auth", authRouter);

// /api/leaderboard
APIRouter.use("/leaderboard", leaderboardRouter);

// /api/graph/
APIRouter.use("/graph", graphRouter)

// /api/scenarios
APIRouter.use("/scenarios", scenarioRouter);

// /api/replay
APIRouter.use("/replay", replayRouter);

APIRouter.use("/token", tokenRouter);

// /api/account
APIRouter.use("/account", accountRouter);

// /api/test
APIRouter.get("/health", (req, res) => {
    res.status(200).end();
});


export default APIRouter;
