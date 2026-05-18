import { WebSocket } from "ws";
import { Round, Run } from "../model/rounds.js";
import * as crypto from "crypto";
import { Action, RunState, Scenario, StateMessage } from "../types/index.js";
import { isAction } from "../validation.js";
import {
    ACMessage,
    ACMessageType,
    parseACMessage,
} from "./algo_client_connect.js";
import { ScenarioError } from "../model/grid.js";

export interface IntitializeResponse {
    id: string;
    tick_rate: number;
}

export interface AlgorithmClientParams {
    /**
     * The connection to the Algorithm Client.
     */
    ws: WebSocket;
    /**
     * The ID of the Algorithm Client.
     */
    id: string;
    /**
     * List of scenarios to run
     */
    scenarios: Scenario[];
    /**
     * Called when a move is accepted. Used to update the web client.
     */
    onAction: (action: Action) => void;
    /**
     * Called when a new round is started.
     */
    onNewRound: (
        state: StateMessage,
        scenario: Scenario,
        run_id: string,
    ) => void;
    /**
     * Save a run to the database.
     */
    onRoundFinished: (run_id: string, run: Run, state: RunState, energy_used: number) => void;
    /**
     * Called when the Algorithm Client completes all the scenarios.
     */
    onCompleted: () => void;
    /**
     * Called when the Algorithm Client disconnects.
     */
    onDisconnected: (lastRun: Run) => void;
}

export class AlgorithmClient {
    private ws: WebSocket;
    private scenarios: Scenario[];
    private round: Round | null = null;
    private round_active: boolean = true;
    private progress: {
        completed: number;
        failed: number;
        skipped: number;
        total: number;
    };

    // Callbacks
    onAction: (action: Action) => void;
    onNewRound: (
        state: StateMessage,
        scenario: Scenario,
        run_id: string,
    ) => void;
    onRoundFinished: (run_id: string, run: Run, state: RunState, energy_used: number) => void;
    onCompleted: () => void;
    onDisconnected: (lastRun: Run) => void;

    constructor({
        ws,
        id,
        scenarios,
        onAction,
        onNewRound,
        onCompleted,
        onDisconnected,
        onRoundFinished,
    }: AlgorithmClientParams) {
        this.ws = ws;

        // Reverse the order, so we can use it as a stack.
        this.scenarios = scenarios.slice().reverse();

        this.progress = {
            completed: 0,
            failed: 0,
            skipped: 0,
            total: scenarios.length,
        };

        this.onAction = onAction;
        this.onNewRound = onNewRound;
        this.onCompleted = onCompleted;
        this.onDisconnected = onDisconnected;
        this.onRoundFinished = onRoundFinished;

        this.registerListeners();

        this.sendInitializeResponse(id);

        // TODO: This fails if there are no scenarios
        this.startRound();
    }

    private sendInitializeResponse(id: string) {
        const initialize_response: IntitializeResponse = {
            id: id,
            tick_rate: 1,
        };

        this.ws.send(
            JSON.stringify({
                type: ACMessageType.INITIALIZE,
                data: initialize_response,
            }),
        );
    }

    private registerListeners() {
        this.ws.on("message", (data) => {
            const message = parseACMessage(data.toString());

            if (!message) {
                this.sendMessage({
                    type: ACMessageType.ERROR,
                    data: "Invalid message",
                });
                return;
            }

            if (message.type == ACMessageType.ACTION) {
                if (!this.round_active) {
                    return;
                }

                if (!isAction(message.data)) {
                    this.sendMessage({
                        type: ACMessageType.ERROR,
                        data: "Data is not a valid action",
                    });
                    return;
                }

                this.round?.applyAction(message.data);
            } else if (message.type === ACMessageType.OK) {
                if (!this.round_active) {
                    this.round_active = true;
                } else {
                    this.sendMessage({
                        type: ACMessageType.ERROR,
                        data: "Invalid message",
                    });
                }
            } else if (message.type === ACMessageType.SKIP) {
                if (!this.round?.move_sent) {
                    this.round?.skip();
                } else {
                    this.sendMessage({
                        type: ACMessageType.ERROR,
                        data: "A round cannot be skipped after at least one move has been submitted. Try sending a fail message instead.",
                    });
                }
            } else if (message.type === ACMessageType.FAILED) {
                this.round?.fail();
            } else {
                this.sendMessage({
                    type: ACMessageType.ERROR,
                    data: "Invalid message",
                });
            }
        });

        this.ws.on("close", () => {
            this.scenarios = [];
            this.progress.failed++;
            if (this.round) {
                this.round.clearTimeouts();
                this.onDisconnected(this.round.run);
            }
        });
    }

    private startRound(): void {
        const scenario = this.scenarios.pop();

        // if there are no scenarios left, quit
        if (!scenario) {
            this.ws.send(
                JSON.stringify({
                    type: ACMessageType.QUIT,
                }),
            );
            this.onCompleted();
            return;
        }

        const run_id = crypto.randomUUID().replace(/-/g, "");

        this.round_active = false;

        try {
            const round = new Round({
                scenario: scenario,
                maxTime: 60 * 60 * 1000, // 1 hour
                onAccepted: (action) => {
                    this.ws.send(
                        JSON.stringify({
                            type: ACMessageType.ACCEPTED,
                            data: action.id,
                        }),
                    );

                    this.onAction(action);
                },
                onExecuted: (action) => {
                    this.ws.send(
                        JSON.stringify({
                            type: ACMessageType.EXECUTED,
                            data: action.id,
                        }),
                    );
                },
                onRejected: (action, message) => {
                    this.ws.send(
                        JSON.stringify({
                            type: ACMessageType.REJECTED,
                            data: {
                                id: action.id,
                                message,
                            },
                        }),
                    );
                },
                onEndStateReached: () => {
                    // stop any NEXT_MOVE messages from moving boxes
                    this.round_active = false;
                    this.ws.send(
                        JSON.stringify({
                            type: ACMessageType.END,
                            data: [
                                round.run.actions.length,
                                Date.now() - round.start,
                            ],
                        }),
                    );

                    this.onRoundFinished(run_id, round.run, RunState.Completed, round.get_energy_used());
                    this.progress.completed++;
                    this.startRound();
                },
                skip: () => {
                    this.round?.clearTimeouts();
                    console.log("Scenario " + scenario.name + " skipped");
                    // stop any NEXT_MOVE messages from moving boxes
                    this.round_active = false;
                    this.ws.send(
                        JSON.stringify({
                            type: ACMessageType.END,
                        }),
                    );
                    if (this.round) {
                        this.onRoundFinished(run_id, this.round.run, RunState.Skipped, round.get_energy_used());
                    }
                    this.progress.skipped++;
                    this.startRound();
                },

                onScenarioFailed: () => {
                    // stop any NEXT_MOVE messages from moving boxes
                    this.round_active = false;
                    this.ws.send(
                        JSON.stringify({
                            type: ACMessageType.FAILED,
                            data: "timeout",
                        }),
                    );
                    this.onRoundFinished(run_id, round.run, RunState.Failed, round.get_energy_used());
                    this.progress.failed++;
                    this.startRound();
                },
            });

            this.round = round;
        } catch (e) {
            if (e instanceof ScenarioError) {
                console.error("Invalid Scenario: " + e.message);
                this.ws.send(
                    JSON.stringify({
                        type: ACMessageType.ERROR,
                        data: `Invalid Scenario: ${e.message}`,
                    }),
                );

                this.startRound();
                return;
            }

            throw e;
        }

        this.sendMessage({
            type: ACMessageType.NEW_ROUND,
            data: scenario,
        });

        const state = this.state;
        if (state) {
            this.onNewRound(state, scenario, run_id);
        }
    }

    private sendMessage(message: ACMessage) {
        this.ws.send(JSON.stringify(message));
    }

    get state(): StateMessage | null {
        if (!this.round) {
            return null;
        }

        const scenario = this.round.scenario;

        return {
            scenario_name: scenario.name,
            width: scenario.width,
            height: scenario.height,
            depth: scenario.depth,
            cubes: this.round?.cubes,
            start: scenario.start,
            end: scenario.requirements,
            box_type: scenario.box_type,
            traveller_ids: scenario.requirements.map((c) => c.id), //receive traveller id from server than create an array
            exit_zone: scenario.exit_zone,
        };
    }
}
