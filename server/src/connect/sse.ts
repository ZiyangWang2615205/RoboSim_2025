import { Channel, createChannel, createSession, Session } from "better-sse";
import { Application } from "express";
import DB from "../db_handler.js";
import {
    Action,
    AlgorithmState,
    StateMessage,
    FollowEvent,
} from "../types/index.js";
import { AlgorithmClient } from "./algorithm_client.js";

export interface SSEParams {
    /**
     * A callback that returns the Algorithm Client with the given ID.
     *
     * @param id The Algorithm Client ID.
     */
    getClient: (id: string) => AlgorithmClient | null;
}

/**
 * A SSE consumer for `/api/algorithms`.
 */
type MainListener = {
    session: Session;
    data: ClientData;
};

type ClientData = {
    /**
     * The set of IDs that the SSE consumer should receive updates for.
     */
    ids: Set<string>;
    /**
     * The ID of the user that the SSE consumer should receive updates for
     * (if null, then all algorithms will be sent).
     */
    userid: number | null;
    /**
     * The specified limit on the number of algorithms to send. This is only
     * used when `end` is null (i.e. there were no algorithms to send
     * initially).
     */
    limit: number;
    /**
     * The oldest algorithm that we have sent to the SSE consumer. The user
     * will only receive updates for algorithms that are newer than this.
     */
    end: AlgorithmState | null;
};

export class SSEManager {
    private mainListeners: Set<MainListener> = new Set();
    private followChannels: Map<string, Channel> = new Map();
    private summaryChannels: Map<string, Channel> = new Map();

    // Callbacks
    getClient: (id: string) => AlgorithmClient | null;

    constructor({ getClient }: SSEParams) {
        this.getClient = getClient;
    }

    setup(app: Application) {
        // GET /api/algorithms?type={user|all}?limit=n
        //
        // An SSE endpoint that sends a list of all connected algorithms,
        // and re-sends this list whenever any of them change.
        //
        // `limit` sets the initial maximum number of algorithms to send.
        // Note that this endpoint may send more, when new algorithms are
        // connected.
        //
        // If `type` is `user`, the list of algorithms will only include
        // algorithms that are owned by the current user.
        app.get("/api/algorithms", async (req, res) => {
            const user_only = !(req.query.type === "all");
            const limit = req.query.limit
                ? parseInt(req.query.limit as string)
                : 20;

            const userid = user_only ? res.locals.userid : null;

            const session = await createSession(req, res);

            const clients = await DB.getAlgorithmClients(userid, limit);

            session.push(clients);

            const count = await DB.countAlgorithmClients(userid);

            if (count <= limit) {
                // This message indicates that we've sent over all the
                // relevant algorithms (for now), and so the client does not
                // need to make another request when they reach the end of the
                // list.
                session.push(null, "complete");
            }

            const ids = new Set(clients.map((client) => client.id));

            const data: ClientData = {
                ids,
                limit,
                userid,
                end: null,
            };

            if (clients.length > 0) {
                data.end = clients[clients.length - 1];
            }

            const listener = { session, data };

            this.mainListeners.add(listener);

            session.on("disconnected", () => {
                this.mainListeners.delete(listener);
            });
        });

        // GET /api/follow/:id
        //
        // An SSE endpoint that returns the state of the algorithm with the
        // given ID. Useful for when a user wants to follow the progress of an
        // algorithm.
        //
        // Sends the following message types:
        //
        // - `STATE`: The current state of the algorithm, including the location
        //   of each cube in the scenario, the start and end positions, and
        //   other information about the current scenario that the algorithm is
        //   working on. This message will be sent when an algorithm starts a
        //   new round, and also once when the request is made.
        // - `INFO`: The name and author of the algorithm.
        // - `UPDATE`: A move that the algorithm has made.
        // - `END`: The algorithm has finished running.
        app.get("/api/follow/:id", async (req, res) => {
            const ac_id = req.params.id;
            const session = await createSession(req, res);

            const client = this.getClient(ac_id);

            if (client) {
                const stateMessage = client.state;

                if (stateMessage) {
                    session.push(stateMessage, FollowEvent.STATE);
                }

                const info = await DB.getAlgorithmClientInfo(ac_id);

                session.push(info, FollowEvent.INFO);
            } else {
                session.push(null, FollowEvent.CLIENT_NOT_FOUND);
            }

            let channel = this.followChannels.get(ac_id);

            if (!channel) {
                channel = createChannel();
                this.followChannels.set(ac_id, channel);
            }

            channel.register(session);
        });

        app.get("/api/summary/:id", async (req, res) => {
            const ac_id = req.params.id;

            const summary = await DB.getSummary(ac_id);

            if (!summary) {
                res.status(404).end();
                return;
            }

            const session = await createSession(req, res);

            session.push(summary);

            const client = this.getClient(ac_id);

            if (!client) {
                session.push(null, "close");
            }

            let channel = this.summaryChannels.get(ac_id);

            if (!channel) {
                channel = createChannel();
                this.summaryChannels.set(ac_id, channel);
            }

            channel.register(session);
        });
    }

    sendAction(id: string, action: Action) {
        this.followChannels.get(id)?.broadcast(action, FollowEvent.UPDATE);
    }

    async onAlgorithmStart(id: string, client: AlgorithmClient) {
        const info = await DB.getAlgorithmClientInfo(id);

        this.followChannels.get(id)?.broadcast(info, FollowEvent.INFO);

        const stateMessage = client.state;

        if (stateMessage) {
            this.followChannels
                .get(id)
                ?.broadcast(stateMessage, FollowEvent.STATE);
        }
    }

    onRoundCompleted(id: string) {
        this.updateSummary(id);
    }

    onNewRound(id: string, state: StateMessage) {
        this.followChannels.get(id)?.broadcast(state, FollowEvent.STATE);
        this.updateSummary(id);
        this.onClientUpdated(id);
    }

    private async updateSummary(id: string) {
        const channel = this.summaryChannels.get(id);

        if (channel) {
            const summary = await DB.getSummary(id);

            if (summary) {
                channel.broadcast(summary);
            }
        }
    }

    async onAlgorithmEnd(id: string) {
        this.followChannels.get(id)?.broadcast(null, FollowEvent.END);
        await this.updateSummary(id);
        this.summaryChannels.get(id)?.broadcast(null, "close");
        this.onClientUpdated(id);
    }

    private onClientUpdated(id: string) {
        for (const { data, session } of this.mainListeners) {
            if (data.ids.has(id)) {
                this.updateListener(data, session);
            }
        }
    }

    onClientAdded(userid: number) {
        for (const { data, session } of this.mainListeners) {
            if (data.userid === null || data.userid === userid) {
                this.updateListener(data, session);
            }
        }
    }

    private async updateListener(data: ClientData, session: Session) {
        const clients = await DB.getAlgorithmClients(
            data.userid,
            data.limit,
            data.end,
        );

        try {
            session.push(clients);
        } catch {
            // Session disconnected while waiting for DB query
            return;
        }

        data.ids = new Set(clients.map((client) => client.id));
        if (clients.length > 0) {
            data.end = clients[clients.length - 1];
        }
    }
}
