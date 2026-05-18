import { assert } from "chai";
import { describe, it } from "mocha";
import {
    ACMessageType,
    InitializeRequest,
} from "../connect/algo_client_connect";
import { WebSocketWrapper } from "./utils";
import { Manager } from "../model/manager";
import { IntitializeResponse } from "../connect/algorithm_client";
import { Action, BoxType, LegActionType, Scenario } from "../types/index";
import DB from "../db_handler";

describe("Integration tests for the ACS", function () {
    const port = 8083;
    const wc_port = 4446;

    const manager = new Manager();

    let client: WebSocketWrapper;

    before(async function () {
        await manager.start(port, wc_port);
        client = await WebSocketWrapper.connect(port);
    });

    after(async function () {
        await client.shutdown();
        await manager.shutdown();
        await DB.clear();
    });

    const custom_scenarios = [
        {
            name: "test",
            width: 5,
            height: 5,
            depth: 5,
            start: [{ id: 1, x: 0, y: 0, z: 0 }],
            requirements: [{ id: 1, x: 1, y: 0, z: 1 }],
            box_type: BoxType.Type1,
            exit_zone: {x1:0, x2:0, y1:0, y2:0, z1:0, z2:0},
            zone_problem: false,
        },
        {
            name: "test2",
            width: 5,
            height: 5,
            depth: 5,
            start: [
                { id: 1, x: 0, y: 0, z: 0 },
                { id: 2, x: 0, y: 0, z: 1 },
            ],
            requirements: [{ id: 1, x: 4, y: 0, z: 4 }],
            box_type: BoxType.Type1,
            exit_zone: {x1:0, x2:0, y1:0, y2:0, z1:0, z2:0},
            zone_problem: false,
        },
        {
            name: "test3",
            width: 5,
            height: 5,
            depth: 5,
            start: [{ id: 1, x: 0, y: 0, z: 0 }],
            requirements: [{ id: 1, x: 1, y: 0, z: 1 }],
            box_type: BoxType.Type1,
            exit_zone: {x1:0, x2:0, y1:0, y2:0, z1:0, z2:0},
            zone_problem: false,
        },
    ];

    const initialize_request: InitializeRequest = {
        token: "TEST_TOKEN",
        name: "name",
        custom_scenarios,
        publish_runs: true,
    };

    it("should respond correctly to initialize requests", async function () {
        client.send({
            type: ACMessageType.INITIALIZE,
            data: initialize_request,
        });

        const initialize_response = await client.receive();
        assert.equal(initialize_response.type, ACMessageType.INITIALIZE);

        const data = initialize_response.data as IntitializeResponse;

        assert.equal(data.tick_rate, 1);
    });

    it("should start a new round correctly", async function () {
        const round_message = await client.receive();
        assert.equal(round_message.type, ACMessageType.NEW_ROUND);

        const { id: _, ...scenario } = round_message.data as Scenario;
        assert.deepEqual(scenario, custom_scenarios[0]);

        client.send({ type: ACMessageType.OK, data: {} });
    });

    it("should accept valid moves", async function () {
        const action = { kind: "move", id: 1, dx: 1, dy: 0, dz: 0 };
        client.send({
            type: ACMessageType.ACTION,
            data: action,
        });

        const accepted_message = await client.receive();

        assert.equal(accepted_message.type, ACMessageType.ACCEPTED);
        assert.deepEqual(accepted_message.data, action.id);

        const executed_message = await client.receive();

        assert.equal(executed_message.type, ACMessageType.EXECUTED);
        assert.deepEqual(executed_message.data, action.id);
    });

    it("should reject invalid moves", async function () {
        const action = { kind: "move", id: 1, dx: 1, dy: 1, dz: 0 };
        client.send({
            type: ACMessageType.ACTION,
            data: action,
        });

        const rejected_message = await client.receive();

        assert.equal(rejected_message.type, ACMessageType.REJECTED);
        assert.deepEqual(
            (rejected_message.data as { id: number; error: string }).id,
            action.id,
        );
    });

    it("should end rounds correctly", async function () {
        client.send({
            type: ACMessageType.ACTION,
            data: { kind: "move", id: 1, dx: 0, dy: 0, dz: 1 },
        });

        const accepted_message = await client.receive();

        assert.equal(accepted_message.type, ACMessageType.ACCEPTED);

        const executed_message = await client.receive();

        assert.equal(executed_message.type, ACMessageType.EXECUTED);

        const end_message = await client.receive();

        assert.equal(end_message.type, ACMessageType.END);
    });

    it("should handle multiple rounds correctly", async function () {
        const round_message = await client.receive();

        assert.equal(round_message.type, ACMessageType.NEW_ROUND);

        const { id: _, ...scenario } = round_message.data as Scenario;
        assert.deepEqual(scenario, custom_scenarios[1]);

        client.send({ type: ACMessageType.OK, data: {} });
    });

    it("should allow simulataneous execution of moves", async function () {
        const action_1 = { kind: "move", id: 1, dx: 1, dy: 0, dz: 0 };
        client.send({
            type: ACMessageType.ACTION,
            data: action_1,
        });

        const action_2 = { kind: "move", id: 2, dx: 1, dy: 0, dz: 0 };
        client.send({
            type: ACMessageType.ACTION,
            data: action_2,
        });

        const accepted_message1 = await client.receive();

        assert.equal(accepted_message1.type, ACMessageType.ACCEPTED);
        assert.deepEqual(accepted_message1.data, action_1.id);

        const accepted_message2 = await client.receive();

        assert.equal(accepted_message2.type, ACMessageType.ACCEPTED);
        assert.deepEqual(accepted_message2.data, action_2.id);

        const executed_message1 = await client.receive();

        assert.equal(executed_message1.type, ACMessageType.EXECUTED);
        assert.deepEqual(executed_message1.data, action_1.id);

        const executed_message2 = await client.receive();

        assert.equal(executed_message2.type, ACMessageType.EXECUTED);
        assert.deepEqual(executed_message2.data, action_2.id);
    });

    it("should not allow clients to skip a round after they have sent a move", async function () {
        client.send({
            type: ACMessageType.SKIP,
            data: null,
        });

        const error = await client.receive();

        assert.equal(error.type, ACMessageType.ERROR);
    });

    it("should handle failing scenarios correctly", async function () {
        client.send({
            type: ACMessageType.FAILED,
            data: {},
        });

        const end_message = await client.receive();
        assert.equal(end_message.type, ACMessageType.FAILED);

        const new_round_message = await client.receive();
        assert.equal(new_round_message.type, ACMessageType.NEW_ROUND);
    });

    it("should handle skipping scenarios correctly", async function () {
        client.send({
            type: ACMessageType.SKIP,
            data: {},
        });

        const end_message = await client.receive();
        assert.equal(end_message.type, ACMessageType.END);
    });

    it("should quit when all scenarios are completed", async function () {
        const quit_message = await client.receive();
        assert.equal(quit_message.type, ACMessageType.QUIT);

        assert(client.empty());
    });

    it("should handle invalid initialize requests", async function () {
        const client = await WebSocketWrapper.connect(port);
        client.send({ type: ACMessageType.INITIALIZE, data: {} });

        const error_message = await client.receive();
        assert.equal(error_message.type, ACMessageType.ERROR);

        await client.shutdown();
    });

    it("should handle invalid credentials", async function () {
        const client = await WebSocketWrapper.connect(port);

        const request = {
            ...initialize_request,
            token: "INVALID_TOKEN",
        };

        client.send({ type: ACMessageType.INITIALIZE, data: request });

        const error_message = await client.receive();
        assert.equal(error_message.type, ACMessageType.ERROR);

        await client.shutdown();
    });

    it("should handle invalid scenarios", async function () {
        const client = await WebSocketWrapper.connect(port);

        const request = {
            ...initialize_request,
            custom_scenarios: [
                {
                    ...custom_scenarios[0],
                    start: [{ id: 1, x: 0, y: 1, z: 0 }],
                },
            ],
        };

        client.send({ type: ACMessageType.INITIALIZE, data: request });

        const initialize_response = await client.receive();
        assert.equal(initialize_response.type, ACMessageType.INITIALIZE);

        // Server validates scenarios at the point that they are used.
        const error_message2 = await client.receive();
        assert.equal(error_message2.type, ACMessageType.ERROR);

        // Server still continues to run other scenarios.
        const quit_message = await client.receive();
        assert.equal(quit_message.type, ACMessageType.QUIT);

        await client.shutdown();
    });

    it("should handle invalid requests after initialization", async function () {
        const client = await WebSocketWrapper.connect(port);

        client.send({
            type: ACMessageType.INITIALIZE,
            data: initialize_request,
        });

        await client.receive();
        await client.receive();

        client.send({
            type: ACMessageType.OK,
            data: {},
        });

        // Invalid message type
        client.send({
            type: ACMessageType.INITIALIZE,
            data: {},
        });

        const error_message = await client.receive();
        assert.equal(error_message.type, ACMessageType.ERROR);

        // Invalid data type
        client.send({
            type: ACMessageType.ACTION,
            data: { kind: "move", id: 0, dx: 0, dy: 0, dz_invalid: 0 },
        });

        const error_message2 = await client.receive();
        assert.equal(error_message2.type, ACMessageType.ERROR);

        await client.shutdown();
    });

    it("should handle Type 2 Boxes correctly", async () => {
        const client = await WebSocketWrapper.connect(port);

        const scenarios = custom_scenarios.map((scenario) => {
            return {
                ...scenario,
                box_type: BoxType.Type2,
            };
        });

        client.send({
            type: ACMessageType.INITIALIZE,
            data: {
                ...initialize_request,
                custom_scenarios: scenarios,
            },
        });

        await client.receive();
        await client.receive();

        client.send({
            type: ACMessageType.OK,
            data: {},
        });

        const displace_action: Action = {
            kind: "leg",
            type: LegActionType.Displace,
            id: 1,
        };

        client.send({
            type: ACMessageType.ACTION,
            data: displace_action,
        });

        const accepted_message = await client.receive();

        assert.equal(accepted_message.type, ACMessageType.ACCEPTED);
        assert.equal(accepted_message.data, displace_action.id);

        const executed_message = await client.receive();

        assert.equal(executed_message.type, ACMessageType.EXECUTED);
        assert.equal(executed_message.data, displace_action.id);

        const extend_action: Action = {
            kind: "leg",
            type: LegActionType.Extend,
            id: 1,
        };

        client.send({
            type: ACMessageType.ACTION,
            data: extend_action,
        });

        const accepted_message2 = await client.receive();

        assert.equal(accepted_message2.type, ACMessageType.ACCEPTED);
        assert.equal(accepted_message2.data, displace_action.id);

        const executed_message2 = await client.receive();

        assert.equal(executed_message2.type, ACMessageType.EXECUTED);
        assert.equal(executed_message2.data, displace_action.id);

        const retract_action: Action = {
            kind: "leg",
            type: LegActionType.Retract,
            id: 1,
        };

        client.send({
            type: ACMessageType.ACTION,
            data: retract_action,
        });

        const accepted_message3 = await client.receive();

        assert.equal(accepted_message3.type, ACMessageType.ACCEPTED);
        assert.equal(accepted_message3.data, retract_action.id);

        const executed_message3 = await client.receive();

        assert.equal(executed_message3.type, ACMessageType.EXECUTED);
        assert.equal(executed_message3.data, retract_action.id);

        await client.shutdown();
    });
});
