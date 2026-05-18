export type Cube = {
    id: number;
    x: number;
    y: number;
    z: number;
};

export type ExitZone = {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    z1: number;
    z2: number;
}

/**
 * An extension of {@link Cube} that stores whether a box's legs are displaced
 * and extended.
 */
export type CubeState = Cube & {
    legs_displaced?: boolean;
    legs_extended?: boolean;
};

/**
 * Information about an Algorithm Client. Used on the dashboard.
 */
export type AlgorithmState = {
    id: string;
    name: string;
    author: string;
    state: AlgorithmClientState;
    start_time: string;
    completed: number;
    failed: number;
    skipped: number;
};

/**
 * Basic info about an Algorithm Client.
 */
export type AlgorithmInfo = {
    name: string;
    author: string;
};

export type Move = {
    id: number;
    dx: number;
    dy: number;
    dz: number;
};

/**
 * A generic action on a box, either a move or an action on a box's legs.
 * Differentiate between different actions by checking their `kind`.
 */
export type Action = MoveAction | LegAction;

export interface MoveAction {
    kind: "move";
    id: number;
    dx: number;
    dy: number;
    dz: number;
}

export interface LegAction {
    kind: "leg";
    type: LegActionType;
    id: number;
}

export enum LegActionType {
    Displace = "displace",
    Withdraw = "withdraw",
    Extend = "extend",
    Retract = "retract",
}

export type Scenario = SentScenario & {
    id: number;
};

export enum BoxType {
    Type1 = 1,
    Type2 = 2,
}

export type ColumnData = {
    yMap: Map<number, number>,
    highestY: number,
}

/**
 * A scenario which has not been assigned an ID. Algorithm Clients send these
 * to the server, which converts them to {@link Scenario} objects, by adding
 * them to the database and assigning them an ID.
 */
export type SentScenario = {
    name: string;
    width: number;
    height: number;
    depth: number;
    start: Cube[];
    requirements: Cube[];
    box_type: BoxType;
    exit_zone: ExitZone;
    zone_problem: Boolean;
};

/**
 * The current state of an Algorithm Client, including the current scenario and
 * the current state of the algorithm in the scenario. Used in the follow page.
 */
export type StateMessage = {
    scenario_name: string;
    width: number;
    height: number;
    depth: number;
    cubes: CubeState[];
    start: Cube[];
    end: Cube[];
    box_type: BoxType;
    traveller_ids: number[]; //let it knows that ids are also need to send.
    exit_zone: ExitZone;
};

/**
 * A summary of a single run. Used in the summary page.
 */
export type RunSummary = {
    id: number;
    scenario: string;
    state: RunState;
    time_taken: number | null;
    energy_used: number;
};

/**
 * A short summary of an Algorithm Client, containing no information about
 * its runs. A condensed version of {@link Summary}, without the `runs` field.
 */
export type ShortSummary = {
    name: string;
    author: string;
    state: AlgorithmClientState;
};

/**
 * A summary of the state and runs of an Algorithm Client.
 */
export type Summary = ShortSummary & {
    runs: RunSummary[];
};

/**
 * Represents the state of an Algorithm Client. An Algorithm Client starts out
 * in the `Running` state, and transitions to either `Completed`, when it has
 * gone through all scenarios, or `Failed` if it disconnects prematurely.
 */
export enum AlgorithmClientState {
    Running = 0,
    Completed = 1,
    Failed = 2,
}

/**
 * Represents the state of a run. The Algorithm Client is either currently
 * attempting to complete the run (`Running`), has successfully completed the
 * run (`Completed`), has failed to complete the run (`Failed`), or has chosen
 * to skip the round (`Skipped`).
 */
export enum RunState {
    Running = 0,
    Completed = 1,
    Failed = 2,
    Skipped = 3,
}

/**
 * The follow event types that can be sent to Web Clients.
 */
export enum FollowEvent {
    UPDATE = "update",
    STATE = "state",
    END = "end",
    CLIENT_NOT_FOUND = "client_not_found",
    INFO = "info",
}

/**
 * A record of an action performed by an Algorithm Client, and the time at
 * which it happened.
 */
export type ActionRecord = {
    time: number;
    action: Action;
};
