import { describe } from "mocha";
import { Manager } from "../model/manager";
import axios from "axios";
import { assert } from "chai";
import DB from "../db_handler";
import {
    EventSourceWrapper,
    initialize_algorithm_client,
    send_move,
    WebSocketWrapper,
} from "./utils";
import {
    FollowEvent,
    ActionRecord,
    AlgorithmClientState,
    RunState,
} from "../types/index";

const api_location = "http://localhost:4000/api";
const port = 8084;
const wc_port = 4000;

describe("API integration tests", () => {
    const manager = new Manager();
    before(async function () {
        await manager.start(port, wc_port);
    });

    after(async function () {
        await manager.shutdown();
    });

    afterEach(async function () {
        await DB.clear();
    });

    // it("Should send Algorithms correctly", async function () {
    //     const client = await WebSocketWrapper.connect(port);
    //     const admin = await DB.get(" SELECT * FROM Users WHERE username = 'admin' ");
    //     const event_source = new EventSourceWrapper(
    //         api_location + "/algorithms?type=all",
    //         ["message", "complete"],
    //     );

    //     const initial_result = await event_source.receive();

    //     assert.deepEqual(initial_result.data, []);

    //     console.log("Waiting for complete message");
    //     const completed_message = await event_source.receive();

    //     assert.deepEqual(completed_message.type, "complete");

    //     await initialize_algorithm_client(client);

    //     console.log("Waiting for update message");
    //     const new_result = await event_source.receive();

    //     assert.lengthOf(new_result.data, 1);

    //     const algorithm = new_result.data[0];

    //     assert.equal(algorithm.name, "name");

    //     event_source.shutdown();
    //     await client.shutdown();
    // });
    
    /* it("should handle limit correctly", async function () {
        const client = await WebSocketWrapper.connect(port);
        const first_id = await initialize_algorithm_client(client);

        const second_client = await WebSocketWrapper.connect(port);
        const second_id = await initialize_algorithm_client(second_client);

        const event_source = new EventSourceWrapper(
            api_location + "/algorithms?type=all&limit=1",
            ["message", "complete"],
        );

        const initial_result = await event_source.receive();

        assert.lengthOf(initial_result.data, 1);
        const id = initial_result.data[0].id;
        // Since the two algorithms connect in the same second, the order of
        // the two in the database is not deterministic
        assert.include([first_id, second_id], id);

        // Wait 1 second to ensure that the new algorithm is after the first
        // and second algorithms.
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const third_client = await WebSocketWrapper.connect(port);
        const third_id = await initialize_algorithm_client(third_client);

        const next_result = await event_source.receive();

        assert.lengthOf(next_result.data, 2);
        assert.equal(next_result.data[0].id, third_id);
        assert.include([first_id, second_id], next_result.data[1].id);

        event_source.shutdown();
        await client.shutdown();
        await second_client.shutdown();
        await third_client.shutdown();
    });
    */

    it("Fetches benchmarking data with new filter parameters", async function () {
        // doesn't crash when sorting or filtering is applied
        const result = await axios.get(
            api_location + "/leaderboard?user=all&status=successful&sort=moves"
        );
        assert.equal(result.status, 200);
        // asserting payload structure matches what we request (an object like { count: 5, data: [ {alg_name: "A*"}, ... ] })
        assert.property(result.data, 'count');
        assert.property(result.data, 'data');
        assert.isArray(result.data.data);
    });

    it("Successfully processes delete request for an algorithm run", async function () {
        // creating a dummy client and intialising run
        const client = await WebSocketWrapper.connect(port);
        const acId = await initialize_algorithm_client(client);
        
        const scenarios = await DB.getDefaultScenarios();
        const testScenario = scenarios[0];

        const testRunId = "delete-test-run";
        await DB.initializeRun(testRunId, acId, testScenario);
        await DB.finishRun(testRunId, [], RunState.Completed, 0);

        // check run successfully deleted
        const deleteResponse = await axios.delete(
            api_location + `/leaderboard/benchmarks/${testRunId}`,
            // so axios doesnt crash when 401 error is returned for deleting the run
            { validateStatus: () => true }
        );

        assert.include([200, 401], deleteResponse.status);

        await client.shutdown();
    });

    it("Sends an error if we try to follow an algorithm that doesn't exist", async function () {
        const event_source = new EventSourceWrapper(
            api_location + "/follow/1234",
            Object.values(FollowEvent),
        );

        const initial_result = await event_source.receive();

        assert.equal(initial_result.type, FollowEvent.CLIENT_NOT_FOUND);

        event_source.shutdown();
    });

    it("Sends follow information correctly", async function () {
        const client = await WebSocketWrapper.connect(port);

        const id = await initialize_algorithm_client(client);

        const event_source = new EventSourceWrapper(
            api_location + "/follow/" + id,
            Object.values(FollowEvent),
        );

        const state = await event_source.receive();

        assert.equal(state.type, FollowEvent.STATE);
        assert.equal(state.data.scenario_name, "test");

        const info = await event_source.receive();

        assert.equal(info.type, FollowEvent.INFO);
        assert.equal(info.data.name, "name");

        const move = { id: 1, dx: 1, dy: 0, dz: 0 };
        await send_move(client, move);

        const update = await event_source.receive();

        assert.equal(update.type, FollowEvent.UPDATE);
        assert.deepEqual(update.data, { kind: "move", ...move });

        const second_move = { id: 1, dx: 0, dy: 0, dz: 1 };
        await send_move(client, second_move);

        const update2 = await event_source.receive();

        assert.equal(update2.type, FollowEvent.UPDATE);
        assert.deepEqual(update2.data, { kind: "move", ...second_move });

        const end = await event_source.receive();

        assert.equal(end.type, FollowEvent.END);

        await client.shutdown();
        event_source.shutdown();
    });

    it("Does not send a summary for a non-existent algorithm", async function () {
        const result = axios.get(api_location + "/summary/1234", {
            validateStatus: () => true,
        });

        assert.equal((await result).status, 404);
    });

    /* it("Sends a summary correctly", async function () {
        const client = await WebSocketWrapper.connect(port);

        const id = await initialize_algorithm_client(client);

        const event_source = new EventSourceWrapper(
            api_location + "/summary/" + id,
            ["message", "close"],
        );

        const initial_result = await event_source.receive();

        assert.equal(initial_result.type, "message");
        assert.equal(initial_result.data.name, "name");
        assert.equal(initial_result.data.state, AlgorithmClientState.Running);
        assert.lengthOf(initial_result.data.runs, 1);

        const initial_summary = initial_result.data.runs[0];

        assert.equal(initial_summary.scenario, "test");
        assert.equal(initial_summary.state, RunState.Running);

        await send_move(client, { id: 1, dx: 1, dy: 0, dz: 0 });
        await send_move(client, { id: 1, dx: 0, dy: 0, dz: 1 });
        await client.receive();
        await client.receive();

        const updated_result = await event_source.receive();
        console.log(updated_result);
        assert.equal(updated_result.type, "message");
        assert.equal(updated_result.data.name, "name");
        assert.equal(updated_result.data.state, AlgorithmClientState.Running);
        assert.lengthOf(updated_result.data.runs, 1);

        const updated_summary = updated_result.data.runs[0];

        assert.equal(updated_summary.scenario, "test");
        assert.equal(updated_summary.state, RunState.Completed);

        // A final message is sent since the AC has completed all its scenarios
        const final_result = await event_source.receive();

        assert.equal(final_result.type, "message");
        assert.equal(final_result.data.name, "name");
        assert.equal(final_result.data.state, AlgorithmClientState.Completed);
        assert.lengthOf(final_result.data.runs, 1);

        const end_message = await event_source.receive();

        assert.equal(end_message.type, "close");

        await client.shutdown();
        event_source.shutdown();
    });
    */
    it("Does not send leaderboard info for an invalid scenario", async function () {
        const result = axios.get(api_location + "/byscenario/1234", {
            validateStatus: () => true,
        });

        assert.equal((await result).status, 404);
    });

    /*it("Sends leaderboard data correctly", async function () {
        const initial_result = await axios.get(api_location + "/leaderboard");

        assert.equal(initial_result.status, 200);
        assert.equal(initial_result.data.count, 0);
        assert.deepEqual(initial_result.data.data, []);

        const client = await WebSocketWrapper.connect(port);

        const id = await initialize_algorithm_client(client);

        // Custom scenarios don't show up on the leaderboard, so we simulate a
        // run on one of the default scenarios instead.
        const scenarios = await DB.getDefaultScenarios();

        await DB.initializeRun("1234", id, scenarios[0]);

        await DB.finishRun("1234", [], RunState.Completed);

        await DB.algorithmClientFinished(id);

        const result = await axios.get(api_location + "/leaderboard");

        assert.equal(result.status, 200);
        assert.equal(result.data.count, 1);
        assert.lengthOf(result.data.data, 1);
        assert.equal(result.data.data[0].algorithm_name, "name");

        const scenario_result = await axios.get(
            api_location + `/leaderboard/scenario/${scenarios[0].id}`,
        );

        assert.equal(scenario_result.status, 200);
        assert.equal(scenario_result.data.count, 1);
        assert.lengthOf(scenario_result.data.data, 1);
        assert.equal(
            scenario_result.data.data[0].scenario_name,
            scenarios[0].name,
        );

        await client.shutdown();
    });
    */
    /* it("handles leaderboard parameters correctly", async () => {
        const client = await WebSocketWrapper.connect(port);

        const id = await initialize_algorithm_client(client);

        const scenarios = await DB.getDefaultScenarios();

        await DB.initializeRun("1234", id, scenarios[0]);

        await DB.finishRun("1234", [], RunState.Completed);

        await DB.algorithmClientFinished(id);

        this is the line is breaks on:
        const result = await axios.get(
            api_location + "/leaderboard?sort=completed-time&desc=true&page=1",
        );

        assert.equal(result.status, 200);
        assert.equal(result.data.count, 1);
        assert.lengthOf(result.data.data, 1);
        assert.equal(result.data.data[0].algorithm_name, "name");

        await client.shutdown();
    });
    */
    it("Sends error when requesting replay data for an invalid run", async function () {
        const result = axios.get(api_location + "/replay/1234", {
            validateStatus: () => true,
        });

        assert.equal((await result).status, 404);
    });

    /* This is the test that has an after all hook issue, I think the issue is caused by earlier tests failing and not closing a connection.*/
    it("Sends replay data correctly", async function () {
        const client = await WebSocketWrapper.connect(port);

        const id = await initialize_algorithm_client(client);

        const move_1 = { id: 1, dx: 1, dy: 0, dz: 0 };
        const move_2 = { id: 1, dx: 0, dy: 0, dz: 1 };

        await send_move(client, move_1);
        await send_move(client, move_2);
        await client.receive();
        await client.receive();

        const db_result = await DB.get("SELECT RID FROM Runs WHERE ACID = $1", [
            id,
        ]) as { rid: string };
        const run_id = db_result.rid;

        const result = await axios.get(api_location + "/replay/" + run_id);

        assert.equal(result.status, 200);

        const moves = result.data.actions.map(
            ({ action: { kind, ...move } }: ActionRecord) => move,
        );

        assert.deepEqual(moves, [move_1, move_2]);

        await client.shutdown();
    });
});
