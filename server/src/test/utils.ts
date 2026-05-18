import { EventSource } from "eventsource";
import { WebSocket } from "ws";
import {
    ACMessage,
    ACMessageType,
    InitializeRequest,
} from "../connect/algo_client_connect";
import { IntitializeResponse } from "../connect/algorithm_client";
import { BoxType, Move } from "../types/index";

export class WebSocketWrapper {
    private ws: WebSocket;
    private receivedBuffer: ACMessage[];
    private resolve: ((value: ACMessage) => void) | null = null;
    private onClose: (() => void) | null = null;
    private closed: boolean = false;

    constructor(port: number) {
        this.receivedBuffer = [];

        this.ws = new WebSocket("ws://localhost:" + port);

        this.ws.on("message", (data) => {
            const message = JSON.parse(data.toString());
            const resolve = this.resolve;
            if (resolve !== null) {
                this.resolve = null;
                resolve(message);
            } else {
                this.receivedBuffer.push(message);
            }
        });

        this.ws.on("close", () => {
            if (this.onClose !== null) {
                this.onClose();
            }

            this.closed = true;
        });
    }

    static async connect(port: number): Promise<WebSocketWrapper> {
        const client = new WebSocketWrapper(port);
        await client.connected();
        return client;
    }

    async connected(timeout: number = 1000): Promise<void> {
        await with_timeout(
            timeout,
            () =>
                new Promise((resolve: (value?: unknown) => void) => {
                    if (this.ws.readyState === WebSocket.OPEN) {
                        resolve();
                        return;
                    }

                    this.ws.on("open", () => {
                        resolve();
                    });
                }),
            "Timed out waiting for connection",
        );
    }

    empty(): boolean {
        return this.receivedBuffer.length === 0;
    }

    async shutdown(): Promise<void> {
        this.ws.close();

        return new Promise((resolve) => {
            if (this.closed) {
                return resolve();
            }
            this.onClose = resolve;
        });
    }

    send(message: ACMessage) {
        this.ws.send(JSON.stringify(message));
    }

    async receive(timeout: number = 1000): Promise<ACMessage> {
        return with_timeout(
            timeout,
            () =>
                new Promise((resolve, reject) => {
                    const bufferedMessage = this.receivedBuffer.shift();
                    if (bufferedMessage) {
                        return resolve(bufferedMessage);
                    }

                    if (this.resolve !== null) {
                        return reject("Already waiting for a message");
                    }

                    this.resolve = resolve;
                }),
            "Timed out waiting for message",
        );
    }
}

export type Event = {
    type: string;
    data: any;
};

export class EventSourceWrapper {
    private eventSource: EventSource;
    private onEvent: ((event: Event) => void) | null = null;
    private eventBuffer: Event[] = [];

    constructor(url: string, observedEvents: string[] = ["message"]) {
        this.eventSource = new EventSource(url, {
            fetch: fetch,
        });

        this.eventSource.addEventListener("error", (event) => {
            //throw new Error(event.message);
            console.error("[EventSource error]", event?.message ?? event);
            try { this.eventSource.close(); } catch {}
        });

        for (const event_type of observedEvents) {
            this.eventSource.addEventListener(event_type, (event) => {
                const event_object = {
                    type: event_type,
                    data: JSON.parse(event.data),
                };

                const onEvent = this.onEvent;
                if (onEvent) {
                    this.onEvent = null;
                    onEvent(event_object);
                } else {
                    this.eventBuffer.push(event_object);
                }
            });
        }
    }

    async receive(timeout: number = 1000): Promise<Event> {
        return with_timeout(
            timeout,
            () =>
                new Promise((resolve, reject) => {
                    const event = this.eventBuffer.shift();
                    if (event) {
                        return resolve(event);
                    }

                    if (this.onEvent !== null) {
                        return reject("Already waiting for an event");
                    }

                    this.onEvent = resolve;
                }),
        );
    }

    shutdown() {
        this.eventSource.close();
    }
}

async function with_timeout<T>(
    timeout: number,
    fn: () => Promise<T>,
    message: string = "Timed out",
): Promise<T> {
    return Promise.race([
        fn(),
        new Promise<T>((_, reject) => {
            setTimeout(() => {
                reject(new Error(message));
            }, timeout);
        }),
    ]);
}

/**
 * Initialize an algorithm client with the server
 *
 * @param client The client to initialize
 *
 * @returns The id of the Algorithm Client
 */
export async function initialize_algorithm_client(
    client: WebSocketWrapper,
    request: InitializeRequest = initialize_request,
): Promise<string> {
    client.send({
        type: ACMessageType.INITIALIZE,
        data: request,
    });

    const response = await client.receive();

    if (response.type !== ACMessageType.INITIALIZE) {
        if (response.type === ACMessageType.ERROR) {
            throw new Error(`Error: ${response.data}`);
        } else {
            throw new Error(`Unexpected message type: ${response.type}`);
        }
    }

    const initialize_response = response.data as IntitializeResponse;

    await client.receive();

    client.send({
        type: ACMessageType.OK,
        data: {},
    });

    return initialize_response.id;
}

/**
 * The initialize request send by `initialize_algorithm_client()`.
 */
export const initialize_request: InitializeRequest = {
    token: "TEST_TOKEN",
    name: "name",
    custom_scenarios: [
        {
            name: "test",
            width: 5,
            height: 5,
            depth: 5,
            start: [{ id: 1, x: 0, y: 0, z: 0 }],
            requirements: [{ id: 1, x: 1, y: 0, z: 1 }],
            box_type: BoxType.Type1,
            exit_zone: {x1:0,x2:0,y1:0,y2:0,z1:0,z2:0},
            zone_problem: false,
        },
    ],
    publish_runs: true,
};

/**
 * Send a move from an algorithm client to the server, and wait for the
 * accepted and rejected messages.
 *
 * @throws Error if the move is rejected, or an invalid message is received
 *   from the server (this can happen if not all of the messages are processed
 *   before calling this function).
 */
export async function send_move(client: WebSocketWrapper, move: Move) {
    const action = { kind: "move", ...move };

    client.send({
        type: ACMessageType.ACTION,
        data: action,
    });

    const response = await client.receive();

    if (response.type !== ACMessageType.ACCEPTED) {
        if (response.type === ACMessageType.REJECTED) {
            throw new Error(`Move rejected: ${response.data}`);
        } else {
            throw new Error(`Unexpected message type: ${response.type}`);
        }
    }

    // Can take up to a second for a move to be executed
    await client.receive(2000);
}
