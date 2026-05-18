import { assert } from "chai";
import { describe, it } from "mocha";
import {
    isCube,
    isAction,
    isMoveAction,
    isLegAction,
    isScenario,
    isScenarios,
} from "../validation";
import { BoxType, LegActionType } from "../types";

describe("validation helpers", () => {
    const cube = { id: 1, x: 0, y: 0, z: 0 };

    const scenario = {
        name: "test",
        width: 5,
        height: 5,
        depth: 5,
        start: [cube],
        requirements: [{ id: 1, x: 1, y: 0, z: 0 }],
        box_type: BoxType.Type1,
    };

    it("should validate cubes", () => {
        assert.isTrue(isCube(cube));
        assert.isFalse(isCube(null));
        assert.isFalse(isCube({ id: 1, x: 0, y: 0 }));
        assert.isFalse(isCube({ id: "1", x: 0, y: 0, z: 0 }));
        assert.isFalse(isCube({ id: 1, x: 0, y: 0, z: 0, extra: true }));
    });

    it("should validate move actions", () => {
        const move = { kind: "move", id: 1, dx: 1, dy: 0, dz: 0 };

        assert.isTrue(isMoveAction(move));
        assert.isTrue(isAction(move));

        assert.isFalse(isMoveAction(null));
        assert.isFalse(isMoveAction({ kind: "move", id: 1, dx: 1, dy: 0 }));
        assert.isFalse(isMoveAction({ kind: "move", id: 1, dx: "1", dy: 0, dz: 0 }));
        assert.isFalse(isMoveAction({ kind: "move", id: 1, dx: 1, dy: 0, dz: 0, extra: true }));
    });

     it("should validate leg actions", () => {
        const leg = { kind: "leg", type: LegActionType.Extend, id: 1 };

        assert.isTrue(isLegAction(leg));
        assert.isTrue(isAction(leg));

        assert.isFalse(isLegAction(null));
        assert.isFalse(isLegAction({ kind: "leg", type: "invalid", id: 1 }));
        assert.isFalse(isLegAction({ kind: "leg", type: LegActionType.Extend }));
        assert.isFalse(isLegAction({ kind: "leg", type: LegActionType.Extend, id: "1" }));
        assert.isFalse(isLegAction({ kind: "leg", type: LegActionType.Extend, id: 1, extra: true }));
    });

      it("should reject unknown actions", () => {
        assert.isFalse(isAction({ kind: "unknown" }));
        assert.isFalse(isAction(null));
    });

      it("should validate scenarios", () => {
        assert.isTrue(isScenario(scenario));

        assert.isFalse(isScenario(null));
        assert.isFalse(isScenario({ ...scenario, name: 123 }));
        assert.isFalse(isScenario({ ...scenario, width: "5" }));
        assert.isFalse(isScenario({ ...scenario, start: [null] }));
        assert.isFalse(isScenario({ ...scenario, requirements: [null] }));
        assert.isFalse(isScenario({ ...scenario, box_type: 999 }));
        assert.isFalse(isScenario({ ...scenario, extra: true }));
    });

      it("should validate scenario arrays", () => {
        assert.isTrue(isScenarios([scenario]));

        assert.isFalse(isScenarios(null));
        assert.isFalse(isScenarios([]));
        assert.isFalse(isScenarios([scenario, { ...scenario, name: 123 }]));
    });

});
