import { assert } from "chai";
import { describe, it } from "mocha";
import { SSEManager } from "../connect/sse";
import DB from "../db_handler";
import { FollowEvent } from "../types";

describe("SSEManager", () => {
    it("should broadcast actions to follow channel", () => {
        const manager = new SSEManager({ getClient: () => null });

        const broadcasts: any[] = [];
        (manager as any).followChannels.set("ac1", {
            broadcast: (data: any, event?: string) => {
                broadcasts.push({ data, event });
            },
        });

        const action = { kind: "move", id: 1, dx: 1, dy: 0, dz: 0 } as any;

        manager.sendAction("ac1", action);

        assert.deepEqual(broadcasts, [
            { data: action, event: FollowEvent.UPDATE },
        ]);
    });

     it("should broadcast info and state when algorithm starts", async () => {
        const manager = new SSEManager({ getClient: () => null });

        const original = DB.getAlgorithmClientInfo;
        DB.getAlgorithmClientInfo = async () => ({ name: "algo" }) as any;

        const broadcasts: any[] = [];
        (manager as any).followChannels.set("ac1", {
            broadcast: (data: any, event?: string) => {
                broadcasts.push({ data, event });
            },
        });

        await manager.onAlgorithmStart("ac1", {
            state: { scenario: "state" },
        } as any);

        DB.getAlgorithmClientInfo = original;

        assert.equal(broadcasts[0].event, FollowEvent.INFO);
        assert.deepEqual(broadcasts[0].data, { name: "algo" });
        assert.equal(broadcasts[1].event, FollowEvent.STATE);
        assert.deepEqual(broadcasts[1].data, { scenario: "state" });
    });

     it("should broadcast new round state and update summary", () => {
        const manager = new SSEManager({ getClient: () => null });

        const broadcasts: any[] = [];

        (manager as any).followChannels.set("ac1", {
            broadcast: (data: any, event?: string) => {
                broadcasts.push({ data, event });
            },
        });

        manager.onNewRound("ac1", { state: true } as any);

        assert.deepEqual(broadcasts, [
            { data: { state: true }, event: FollowEvent.STATE },
        ]);
    });

     it("should broadcast end and close when algorithm ends", async () => {
        const manager = new SSEManager({ getClient: () => null });

        const original = DB.getSummary;
        DB.getSummary = async () => ({ summary: true }) as any;

        const followBroadcasts: any[] = [];
        const summaryBroadcasts: any[] = [];

        (manager as any).followChannels.set("ac1", {
            broadcast: (data: any, event?: string) => {
                followBroadcasts.push({ data, event });
            },
        });

        (manager as any).summaryChannels.set("ac1", {
            broadcast: (data: any, event?: string) => {
                summaryBroadcasts.push({ data, event });
            },
        });

        await manager.onAlgorithmEnd("ac1");

        DB.getSummary = original;

        assert.deepEqual(followBroadcasts, [
            { data: null, event: FollowEvent.END },
        ]);

        assert.deepEqual(summaryBroadcasts, [
            { data: { summary: true }, event: undefined },
            { data: null, event: "close" },
        ]);
    });
});
