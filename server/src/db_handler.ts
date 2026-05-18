import {
    AlgorithmState,
    ShortSummary,
    RunSummary,
    RunState,
    Scenario,
    SentScenario,
    Summary,
    ActionRecord,
} from "./types/index.js";
import { defaultScenarios } from "./model/default_scenarios.js";
import {Pool, Client} from 'pg';

import bcrypt from "bcrypt";

import { ScenarioModel, TokenModel } from "./db_types.js";

import * as crypto from 'crypto';

/**
 * Thrown when a login/register fails
 */
export class AuthError extends Error {
    constructor(message: string) {
        super(message);

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, AuthError);
        }

        this.name = "AuthError";
    }
}

/**
 * A wrapper for the PostgreSQL database
 *
 * See `db_types.ts`
 */
class DBWrapper {
    private db: Pool;
    private test: boolean;
    
    constructor(test = false) {
        this.test = test;
        if (test) {
            /*  This clears the database if you're running in test mode. Only suitable for sqlite as it's deleting a file 
            if (existsSync("./" + db)) {
                console.log("Deleting database file");
                unlinkSync("./" + db);
            } else {
                console.log("Database file does not exist");
            }
                */
        }
        this.db = new Pool({
            host: process.env.PGHOST || 'localhost',
            database: process.env.PGDATABASE || 'robosim_db',
            port: parseInt(process.env.PGPORT || '5432'),
            user: process.env.PGUSER,
            password: process.env.PGPASSWORD
        });

        // catching original query so we can use it later
        const originalQuery = this.db.query.bind(this.db);
        
        // @ts-ignore
        this.db.query = (text: string | any, params?: any[], ...args: any[]) => {
            // checking if query has parameters
            if (Array.isArray(params)) {
                for (let i = 0; i < params.length; i++) {
                    // handling undefined values - postgreSQL will crash if parameter is 'undefined'
                    if (params[i] === undefined) {
                         console.error("\nundefined parameter");
                         console.error("SQL:", text);
                         console.error(`Param[${i}] is undefined, - should be null or value`);
                         console.trace("Who sent it");
                         // fixing so server doesnt crash
                         params[i] = null;
                    }
                    
                    // if parameter is '{}'
                    if (params[i] === "{}" || String(params[i]) === "{}") {
                        console.error("\ncaught at root level");
                        // stopping crash with immediate empty promise
                        return Promise.resolve({ rows: [], rowCount: 0, command: '', oid: 0, fields: [] });
                    }
                }
            }
            // executing original query if all ok
            return (originalQuery as any)(text, params, ...args);
        };

        this.db.connect().then(() => {
            console.log("PostgreSQL Pool connected successfully.");
            this.populate();
        }).catch(err => {
            console.error("Error connecting to PostgreSQL pool:", err);
        });
    }

    private async populate() {
        const rows = await this.all("SELECT SID from Scenarios");

        if  (rows.length == 0) {
            console.log("Populating Scenarios table with default scenarios");
            try{
                console.log("POPULATE_MARKER_20260219");
                for (const scenario of defaultScenarios) {
                    console.log("POPULATE_MARKER_INSERTING", scenario.name);
                await this.run(
                    `INSERT INTO Scenarios (name, start, requirements, width, height, depth, box_type, is_default, exit_zone, zone_problem) VALUES ($1, $2::json, $3::json, $4, $5, $6, $7, TRUE, $8::json, $9)`,
                    [
                        scenario.name,
                        JSON.stringify(scenario.start),
                        JSON.stringify(scenario.requirements),
                        scenario.width,
                        scenario.height,
                        scenario.depth,
                        scenario.box_type,
                        // when exit zones are undefined, forcing it to be an empty object to stop crash
                        JSON.stringify(scenario.exit_zone || {}),
                        // if zone_problem is undefined or null, defaults to false.
                        scenario.zone_problem ?? false
                    ],
                );
                console.log("POPULATE_MARKER_DONE");
             }
            }catch (e){
                console.error("Populate scenarios failed:", e);
                throw e;
            }

        }

        if (this.test) {
            await this.run(
                `INSERT INTO Users (ID, username, password, name) VALUES (1, 'admin', $1, 'Admin') ON CONFLICT (ID) DO NOTHING`,
                [bcrypt.hashSync("admin", 10)],
            );

            await this.run(
                `INSERT INTO Tokens (ID, token, userid) VALUES (1, 'TEST_TOKEN', 1) ON CONFLICT (ID) DO NOTHING`,
            );

            // forcing id counter to jump past id as admin user is assigned id 1
            await this.run("SELECT setval('users_id_seq', (SELECT MAX(id) FROM users))");
        }
    }

    async clear() {
        await this.run("DELETE FROM Users");
        await this.run("SELECT setval('scenarios_sid_seq',1)");
        await this.run("DELETE FROM Runs");
        await this.run("DELETE FROM ACReg");
        await this.run("DELETE FROM Scenarios");
        await this.run("DELETE FROM Tokens");
        await this.run("DELETE FROM Sessions");

        await this.populate();
    }

    async close() {
        await this.db.end();
    }

    /**
     * Assign a sessionid for user
     */
    public async addSessionID(userid: number, expiry: number): Promise<string | null> {
        const sessionid = crypto.randomUUID();

        // if exist update, not insert one
        const sql = `
            INSERT INTO Sessions (sessionid, expiry, userid)
            VALUES ($1, $2, $3)
            ON CONFLICT(userid)
            DO UPDATE SET
            sessionid = excluded.sessionid,
            expiry = excluded.expiry`;
        await this.run(sql, [sessionid, expiry, userid]);

        return sessionid;
    }

    /**
     * Function used to verify if the given sessionid match the sessionid stored in DB
     *
     * @returns The userid if the sessionid is valid, or `null` otherwise.
     */
    public async verifySessionID(
        username: string,
        sessionid: string,
        now: number,
    ): Promise<number | null> {
        const rows = await this.db.query(`SELECT sessionid, userid, expiry FROM Sessions 
            LEFT JOIN Users ON Sessions.userid = Users.ID 
            WHERE Users.username = $1`, [username])
        const row = rows.rows[0] as
            | { sessionid: string; userid: number; expiry: number }
            | undefined;
        
        if (!row) {
            console.error("Cannot find user");
            return null;
        }

        if (row.sessionid !== sessionid) {
            console.log("row.sessionid",row.sessionid);
            console.log("sessionid: ",sessionid);
            console.error("Session ID does not match");
            return null;
        } else if (now < row.expiry) {
            return row.userid;
        } else {
            console.error("Session ID expired");
            await this.removeSessionID(sessionid);
            return null;
        }
    }

    /**
     * Remove a session id with given username in DB
     */
    private async removeSessionID(sessionid: string): Promise<void> {
        const sql = `DELETE FROM Sessions WHERE sessionid=$1`;
        await this.run(sql, [sessionid]);
    }

    /**
     * Add a new user in DB
     */
    private async addUser(username: string, password: string, name: string) {
        // check if user exist

        const rows = await this.db.query(`SELECT COUNT(*) AS count FROM Users WHERE username = $1`, [username]);
        const row = rows.rows[0] as {
            count: number;
        };


        if (!row || Number(row.count) != 0) {
            // user already exist
            throw new AuthError(`User '${username}' already exists`);
        }

        const sql = `INSERT INTO Users (username, password, name) VALUES ($1, $2, $3)`;
        await this.run(sql, [username, password, name]);
    }

    /**
     * Not tested
     * Remove a user from table
     */
    public async removeUser(username: string) {
        const sql = `DELETE FROM Users WHERE username=$1`;
        await this.run(sql, [username]);
    }

    private isUsernameValid(username: string): boolean {
        const usernameRegex = /^[a-zA-Z0-9._]{4,20}$/; // regex for the username
        return usernameRegex.test(username);
    }

    private isPasswordValid(password: string): boolean {
        if (password.length < 6) {
            return false;
        }
        const hasUpperCase = /[A-Z]/.test(password); // from A-Z is allowed
        const hasLowerCase = /[a-z]/.test(password); // from a-z is allowed
        const hasNumber = /\d/.test(password); // from 0-9 is allowed
        return hasLowerCase && hasUpperCase && hasNumber;
    }
    /**
     * Function used to get name by the given username
     */
    public async getName(userid: string): Promise<string> {

        const rows = await this.db.query(`SELECT Users.name FROM Users WHERE ID = $1`, [userid]);
        const row = rows.rows[0] as
            | { name: string }
            | undefined;


        if (!row) {
            throw new Error("User not found");
        }
        //console.log(row.name);

        return row.name;
    }

    /**
     * Function used to change user password
     */
    public async changePassword(
        userid: string,
        password: string,
        newPassword: string,
    ): Promise<boolean> {
        // verify old password
        let username = ""
        // verify old password
        try{
            username = await this.getUsername(userid);
        }catch(error) {
            return Promise.resolve(false);
        }

        if (await this.verifyUser(username, password)) {
            newPassword = await bcrypt.hash(newPassword, 10);
            const sql = "UPDATE Users SET password = $1 WHERE username = $2";
            await this.run(sql, [newPassword, username]);
        } else {
            return Promise.reject("Auth failed");
        }
        return Promise.resolve(true);
    }

    /**
     * Function used to change username
     */
    public async changeUsername(userid: string, newUsername: string): Promise<boolean> {
        // token bind with ID, ID bind with username
        const sql = `
            UPDATE Users
            SET username = $1
            WHERE ID = $2
        `;
        if (newUsername=="") {
            return false;
        }

        try {
            await this.run(sql, [newUsername, userid]);
        } catch (error) {
            console.log(error);
            return false;
        }
        return true;
    }

    /**
     * Function used to change name of user
     */
    public async changeName(userid: string, newName: string): Promise<boolean> {
        const sql = `
            UPDATE Users
            SET name = $1
            WHERE ID = $2
        `;
        try {
            await this.run(sql, [newName, userid]);
        } catch (error) {
            return false;
        }
        return true;
    }

    /**
     * Function used to get Username by UserID
     */
    public async getUsername(userid: string) {
        const rows = await this.db.query(`SELECT username FROM Users WHERE ID = $1`, [userid]);
        const row = rows.rows[0] as 
            | { username: string }
            | undefined;
      
        if (!row) {
            throw new AuthError("Cannot get username by given userid");
        }
        return row.username;
    }

    /**
     * Add a new user with inspection
     */

    public async registerNewUser(
        username: string,
        password: string,
        name: string,
    ): Promise<void> {
        const cleanuser = username.trim()
        const cleanpass = password.trim()
        if (!this.isPasswordValid(cleanpass)) {
            throw new AuthError("Password is invalid");
        }

        if (!this.isUsernameValid(cleanuser)) {
            throw new AuthError("Username is invalid");
        }

        const hashedPassword = await bcrypt.hash(cleanpass, 10); // cost factor
        await this.addUser(cleanuser, hashedPassword, name);
    }

    /**
     * Verify that a username and password combination is correct.
     *
     * @returns The user ID if the username and password combination is
     * correct, or `null` otherwise.
     */
    public async verifyUser(
        username: string,
        password: string,
    ): Promise<number | null> {
        const cleanuser = username.trim()
        const cleanpass = password.trim()
        const rows = await this.db.query(`SELECT ID, password FROM Users WHERE username = $1`, [cleanuser]); 
        const row = rows.rows[0] as
            | { id: number; password: string }
            | undefined;

        if (!row) {
            console.log("User does not exist");
            return null;
        }
        
        if (await bcrypt.compare(cleanpass, row.password)) {
            return row.id;
        }

        return null;
    }

    private async insertToken(userid: number, token: string) {
        const sql = `INSERT INTO Tokens (token, userid) VALUES ($1, $2)`;
        await this.run(sql, [token, userid]);
    }

    private getRandomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Generate a token with the format dd-mm-yyyy-randomInteger,
     * and insert it into the database
     */
    public async generateToken(userid: number): Promise<string> {
        const today = new Date();
        const day = today.getDate().toString().padStart(2, "0");
        const month = (today.getMonth() + 1).toString().padStart(2, "0"); // January is 0!
        const year = today.getFullYear();
        const randomInt = this.getRandomInt(1000, 9999); // Generate a random integer between 1000 and 9999
        const token = `${day}-${month}-${year}-${randomInt}`;
        await this.insertToken(userid, token); // Insert the token into the database

        return token;
    }

    /**
     * Get the id and name of all the scenarios in the database
     */
    async getScenarios(): Promise<Pick<ScenarioModel, "SID" | "name">[]> {
        return await this.all("SELECT SID, name FROM scenarios") as Pick<
            ScenarioModel,
            "SID" | "name"
        >[];
    }

    public async getAlgorithmClientInfo(ac_id: string): Promise<ShortSummary | null> {
        const sql = `
            SELECT ACReg.name, Users.name as author, ACReg.state FROM ACReg
            LEFT JOIN Tokens ON ACReg.tokenid = Tokens.ID
            LEFT JOIN Users ON Tokens.userid = Users.ID
            WHERE ACID = $1
        `;

        return await this.get(sql, [ac_id]) as ShortSummary | null;
    }

    async saveAlgorithmClient(
        id: string,
        token_id: number,
        name: string,
        publish_runs: boolean,
    ) {
        const sql = `INSERT INTO ACReg (ACID, name, tokenid, publish_runs) VALUES ($1, $2, $3, $4)`;
        await this.run(sql, [id, name, token_id, Number(publish_runs)]);
    }

    /**
     * Initialize a new run
     */
    public async initializeRun(run_id: string, ACID: string, scenario: Scenario) {
        await this.run("INSERT INTO Runs (RID, SID, ACID) VALUES ($1, $2, $3)", [
            run_id,
            scenario.id,
            ACID,
        ]);
    }

    /**
     * Finish a run
     * Save the results of a run in the database
     */
    public async finishRun(id: string, actions: ActionRecord[], state: RunState, energy_used: number) {
        if (state === RunState.Running) {
            throw new Error(
                "Cannot record a finished run which has state = Running.",
            );
        }

        const sql = `
            UPDATE Runs
            SET state = $1,
                finish_time = CURRENT_TIMESTAMP,
                actions = $2::json,
                move_count = $3,
                energy_used = $4,
                time_taken = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time)) * 1000
            WHERE RID = $5 AND state = 0
        `;

        await this.run(sql, [state, JSON.stringify(actions), actions.length, energy_used, id]);
    }

    /**
     * Mark an Algorithm Client as finished with all of its scenarios. Note it
     * does not have to be successful in any or all of them.
     */
    public async algorithmClientFinished(id: string) {
        const sql = `UPDATE ACReg SET state = 1 WHERE ACID = $1`;
        await this.run(sql, [id]);
    }

    /**
     * Mark an Algorithm Client as failed. This happens when the client
     * disconnects prematurely. Also updates the Runs column to reflect this
     */
    public async algorithmClientFailed(id: string, actions: ActionRecord[], energy_used: number) {
        await this.run(`UPDATE ACReg SET state = 2 WHERE ACID = $1 AND state = 0;`, [
            id,
        ]);

        const sql = `
            UPDATE Runs
            SET state = 2,
                finish_time = CURRENT_TIMESTAMP,
                actions = $1::json,
                move_count = $2,
                time_taken = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - start_time)) * 1000,
                energy_used = $3
            WHERE ACID = $4 AND state = 0
        `;

        await this.run(sql, [JSON.stringify(actions), actions.length, energy_used, id]);
    }

    /**
     * Validate a token.
     *
     * @returns `true` if the token is valid, `false` otherwise.
     */
    public async validateToken(token_val: string): Promise<number | null> {
        try {
            // Check for the token's existence
            const token = await this.get(`SELECT ID FROM Tokens WHERE token = $1`, [
                token_val,
            ]) as any;
            return token?.id ?? null;
        } catch (e) {
            console.error("Error validating token: ", e);
            return null;
        }
    }

    /**
     * Get the user ID associated with a token.
     */
    public async getUserID(token_id: number): Promise<number | null> {
        const row = await this.get(`SELECT userid FROM Tokens WHERE ID = $1`, [
            token_id,
        ]) as Pick<TokenModel, "userid"> | null;

        return row?.userid ?? null;
    }

    /**
     * Get all the default scenarios from the database
     */
    async getDefaultScenarios(): Promise<Scenario[]> {
        const scenarios = await this.all(
            "SELECT * FROM scenarios WHERE is_default = TRUE ORDER BY sid"
        ) as any[];

       /**  if (scenarios.length > 0) {
            console.log("Raw scenario from db:", scenarios[0]);
        }**/

        return scenarios.map((scenario: any) => ({
            id: scenario.sid ?? scenario.SID,
            name: scenario.name,
            width: scenario.width,
            height: scenario.height,
            depth: scenario.depth,
            start: JSON.parse(scenario.start),
            requirements: JSON.parse(scenario.requirements),
            box_type: scenario.box_type,
            // if exit_zone exists, parses it & if not returns null/undefined.
            exit_zone: scenario.exit_zone ? JSON.parse(scenario.exit_zone) : undefined,
            // If zone_problem is undefined or null, defaults to false
            zone_problem: scenario.zone_problem ?? false
        }));
    }

    /**
     * Add custom scenarios to the database
     *
     * @returns The scenarios, with added IDs
     */
    addCustomScenarios(customScenarios: SentScenario[]): Promise<Scenario>[] {
        return customScenarios.map(async (x) => (await this.addCustomScenario(x)));
    }

    private async addCustomScenario(scenario: SentScenario): Promise<Scenario> {
        const result = await this.get(
            `
            INSERT INTO Scenarios (name, start, requirements, width, height, depth, box_type, is_default)
            VALUES ($1, $2::json, $3::json, $4, $5, $6, $7, FALSE)
            RETURNING SID
        `,
            [
                scenario.name,
                JSON.stringify(scenario.start),
                JSON.stringify(scenario.requirements),
                scenario.width,
                scenario.height,
                scenario.depth,
                scenario.box_type,
            ]
        )  as any;

        const id = result.sid ?? result.SID;

        return {
            id,
            ...scenario,
        };
    }

    public async getSummary(ac_id: string): Promise<Summary | null> {
        const ac_info = await this.getAlgorithmClientInfo(ac_id);

        if (!ac_info) {
            return null;
        }

        // Replaces `time_taken` with the elapsed time if it is null
        const runs = await this.all(
            `SELECT RID as id, Scenarios.name AS scenario, state, time_taken, energy_used
                FROM Runs
                LEFT JOIN Scenarios ON Runs.SID = Scenarios.SID
                WHERE ACID = $1`,
            [ac_id],
        ) as RunSummary[];

        return { ...ac_info, runs };
    }

    async getAlgorithmClients(
        userid: number | null = null,
        limit: number | null = null,
        end: AlgorithmState | null = null,
    ): Promise<AlgorithmState[]> {
        
        if (userid === undefined) userid = null;
        if (limit === undefined) limit = null;

        if (limit === null && end === null) {
            limit = 20; 
        }

        const params: any[] = [];
        let paramIndex = 1;

        let userCondition = "";
        if (userid !== null) {
            params.push(userid);
            userCondition = `WHERE Users.ID = $${paramIndex++}`;
        }

        let pageCondition = "";
        if (end !== null) {
            params.push(end.start_time);
            params.push(end.start_time);
            params.push(end.id);
            
            pageCondition = `WHERE (start_time > $${paramIndex++} OR (start_time = $${paramIndex++} AND id >= $${paramIndex++}))`;
        } else {
            params.push(limit);
            pageCondition = `LIMIT $${paramIndex++}`;
        }

        const query = `
            WITH grouped AS (
                SELECT ACReg.ACID as id, ACReg.name, Users.name as author, ACReg.state,
                    MIN(start_time) AS start_time,
                    SUM(CASE WHEN Runs.state = 1 THEN 1 ELSE 0 END) AS completed,
                    SUM(CASE WHEN Runs.state = 2 THEN 1 ELSE 0 END) AS failed,
                    SUM(CASE WHEN Runs.state = 3 THEN 1 ELSE 0 END) AS skipped
                FROM Runs
                LEFT JOIN ACReg ON Runs.ACID = ACReg.ACID
                LEFT JOIN Tokens ON ACReg.tokenid = Tokens.ID
                LEFT JOIN Users ON Tokens.userid = Users.ID
                ${userCondition} 
                GROUP BY ACReg.ACID, ACReg.name, Users.name, ACReg.state
            )
            SELECT * FROM grouped
            ${end !== null ? pageCondition : ""} 
            ORDER BY start_time DESC, id DESC
            ${end === null ? pageCondition : ""}
        `;

        return await this.all(query, params) as AlgorithmState[];
    }

    /**
     * Fetch benchmarking data for benchmarking page
     * Filters between My/All and Success/Failed
     */
    public async getBenchmarks(
        userid: number | null = null,
        statusFilter: "all" | "successful" | "failed" = "all",
        boxType: "type1" | "type2" = "type1",
        author: string | null = null,
        scenario: string | null = null
    ) {
        let query = `
            SELECT 
                Runs.RID as run_id,
                ACReg.name as alg_name,
                ACReg.ACID as alg_id,
                Users.name as author,
                Users.ID as author_id,
                Runs.start_time as date_time,
                Scenarios.name as scenario_name,
                Scenarios.SID as scenario_id,
                Runs.move_count,
                Runs.energy_used,
                Runs.time_taken,
                Runs.state as finish_state
            FROM Runs
            LEFT JOIN ACReg ON Runs.ACID = ACReg.ACID
            LEFT JOIN Tokens ON ACReg.tokenid = Tokens.ID
            LEFT JOIN Users ON Tokens.userid = Users.ID
            LEFT JOIN Scenarios ON Runs.SID = Scenarios.SID
            WHERE 1=1
        `;

        const params: any[] = [];
        let paramIndex = 1;

        // applying my/all filter
        // if userid provided, gluing this query on the end
        if (userid !== null) {
            query += ` AND Users.ID = $${paramIndex++}`;
            params.push(userid);
        }

        // success/failed filter: state 1 = finished and 2 = failed
        if (statusFilter === 'successful') {
            query += ' AND Runs.state = 1';
        } else if (statusFilter === 'failed') {
            query += ' AND Runs.state = 2';
        }

        if (boxType === "type2") {
            query += ` AND Scenarios.box_type = 2`; 
        } else {
            query += ` AND Scenarios.box_type = 1`;
        }

        if (author) {
            query += ` AND Users.name = $${paramIndex++}`;
            params.push(author);
        }

        if (scenario) {
            query += ` AND Scenarios.name = $${paramIndex++}`;
            params.push(scenario);
        }

        // sorting by newest runs first
        // adding limit to avoid browser crash
        query += ` ORDER BY Runs.start_time DESC LIMIT 100`;

        // debugging
        console.log("SQL");
        console.log("the query:", query);
        console.log("query parameters:", params);

        return await this.all(query, params) as any[];
    }

    public async deleteRun(run_id: string, userid: number) {
        // ensuring userid = run owner's id
        const sql = `
            DELETE FROM Runs 
            USING ACReg, Tokens 
            WHERE Runs.ACID = ACReg.ACID 
              AND ACReg.tokenid = Tokens.ID 
              AND Runs.RID = $1 
              AND Tokens.userid = $2
        `;
        
        await this.run(sql, [run_id, userid]);
    }


    async countAlgorithmClients(userid: number | null = null): Promise<number> {
        const params = [];
        if (userid !== null) {
            params.push(userid);
        }

        const query = `
            SELECT COUNT(*) as count FROM ACReg
            LEFT JOIN Tokens ON ACReg.tokenid = Tokens.ID
            LEFT JOIN Users ON Tokens.userid = Users.ID
            WHERE ACReg.ACID IN (SELECT ACID FROM Runs)
            ${userid !== null ? "AND Users.ID = $1" : ""}
        `;

        const { count } = await this.get(query, params) as { count: number };

        return count;
    }

    /**
     * Run a query and ignore the result
     */
    public async run(query: string, params: any[] = []) {
        await this.db.query(query,params);
    }

    /**
     * Run a query and return the result
     */
    public async all(query: string, params: any[] = []): Promise<unknown[]> {
        const result = await this.db.query(query,params);
        return result.rows;
    }

    /**
     * Run a query and return the first result
     */
    public async get(query: string, params: any[] = []): Promise<unknown> {
        const rows = await this.db.query(query,params);
        return rows.rows[0];
    }
}

const DB =
    process.env.NODE_ENV == "production"
        ? new DBWrapper()
        : new DBWrapper(true);

export default DB;
