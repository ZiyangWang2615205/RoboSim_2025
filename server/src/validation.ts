import {
    Action,
    Cube,
    LegAction,
    MoveAction,
    SentScenario,
    LegActionType,
    BoxType,
} from "./types/index.js";

export function isCube(obj: unknown): obj is Cube {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "id" in obj &&
        typeof obj.id === "number" &&
        "x" in obj &&
        typeof obj.x === "number" &&
        "y" in obj &&
        typeof obj.y === "number" &&
        "z" in obj &&
        typeof obj.z === "number" &&
        Object.keys(obj).length === 4
    );
}

export function isAction(obj: unknown): obj is Action {
    return isMoveAction(obj) || isLegAction(obj);
}

export function isMoveAction(obj: unknown): obj is MoveAction {
    return (
        obj !== null &&
        typeof obj === "object" &&
        "kind" in obj &&
        obj.kind === "move" &&
        "id" in obj &&
        typeof obj.id === "number" &&
        "dx" in obj &&
        typeof obj.dx === "number" &&
        "dy" in obj &&
        typeof obj.dy === "number" &&
        "dz" in obj &&
        typeof obj.dz === "number" &&
        Object.keys(obj).length === 5
    );
}

export function isLegAction(obj: unknown): obj is LegAction {
    return (
        obj !== null &&
        typeof obj === "object" &&
        "kind" in obj &&
        obj.kind === "leg" &&
        "type" in obj &&
        typeof obj.type === "string" &&
        Object.values(LegActionType).includes(obj.type as LegActionType) &&
        "id" in obj &&
        typeof obj.id === "number" &&
        Object.keys(obj).length === 3
    );
}

export function isScenario(obj: unknown): obj is SentScenario {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "name" in obj &&
        typeof obj.name === "string" &&
        "width" in obj &&
        typeof obj.width === "number" &&
        "height" in obj &&
        typeof obj.height === "number" &&
        "depth" in obj &&
        typeof obj.depth === "number" &&
        "start" in obj &&
        Array.isArray(obj.start) &&
        obj.start.every((x: unknown) => isCube(x)) &&
        "requirements" in obj &&
        Array.isArray(obj.requirements) &&
        obj.requirements.every((x: unknown) => isCube(x)) &&
        "box_type" in obj &&
        typeof obj.box_type === "number" &&
        Object.values(BoxType).includes(obj.box_type as BoxType) &&
        Object.keys(obj).length === 7
    );
}

export function isScenarios(obj: unknown): obj is SentScenario[] {
    if (!Array.isArray(obj)) {
        return false;
    } else if (obj.length === 0) {
        return false;
    } else {
        return obj.every((x: unknown) => isScenario(x));
    }
}
