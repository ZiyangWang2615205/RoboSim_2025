/**
 * @module db_types
 *
 * @description Types representing tables in the database (see
 * `db_handler.ts`). Specifically, each type represents a single row in its
 * corresponding table.
 */

import { AlgorithmClientState, BoxType, ExitZone, RunState } from "./types/index.js";

/**
 * A row in the `ACReg` table. Represents an Algorithm Client.
 */
export type AlgorithmClientModel = {
    /**
     * The Algorithm Client ID
     */
    ACID: string;
    /**
     * The name of the Algorithm Client
     */
    name: string;
    state: AlgorithmClientState;
    tokenid: number;
};

/**
 * A row in the `Scenarios` table, representing a scenario that Algorithm
 * Clients can complete.
 */
export type ScenarioModel = {
    /**
     * the Scenario ID
     */
    SID: number;
    width: number;
    height: number;
    depth: number;
    name: string;
    /**
     * A JSON representation of the start state of the scenario
     */
    start: string;
    /**
     * A JSON representation of the required end state of the scenario
     */
    requirements: string;
    box_type: BoxType;
    is_default: boolean;
    /**
     * A JSON representation of the two opposite corners of the exit zone of the scenario
     */
    exit_zone: string;
};

/**
 * A row in the `Runs` table, representing a scenario that an Algorithm
 * Client either is currently attempting to complete or has completed (or
 * failed/skipped).
 */
export type RunModel = {
    /**
     * The Run ID
     */
    RID: string;
    /**
     * The scenario that the run is using.
     */
    SID: number;
    /**
     * The Algorithm Client.
     */
    ACID: string;
    start_time: string;
    /**
     * The state of the run. Note that if this is `Pending`, then the other
     * fields will be null.
     */
    state: RunState;
    finish_time: string | null;
    /**
     * A JSON representation of the moves taken by the Algorithm Client.
     */
    actions: string | null;
    /**
     * The number of moves taken.
     */
    move_count: number | null;
    /**
     * The time, in milliseconds, that the run took to complete.
     */
    time_taken: number | null;
    /**
     * The total energy consumed during the run.
     */
    energy_used: number;
};

/**
 * A row in the `Tokens` table
 */
export type TokenModel = {
    ID: number;
    token: string;
    /**
     * The time the token was created
     */
    timestamp: string;
    userid: number;
};

/**
 * A row in the `User` table
 */
export type UserModel = {
    id: number;
    username: string;
    password: string;
};

/**
 * A row in the `Sessions` table
 */
export type SessionModel = {
    sessionid: number;
    expiry: number;
    userid: number;
};
