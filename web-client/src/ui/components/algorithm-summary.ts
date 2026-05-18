import {
    AlgorithmClientState,
    RunSummary,
    RunState,
} from "../../../../server/src/types/index.ts";
import { formatDuration } from "../../utils";
import { createElement, loadTemplate } from "./utils";

const template = await loadTemplate("/components/algorithm-summary.html");

export class AlgorithmSummaryElement extends HTMLElement {
    constructor() {
        super();

        const clone = template.content.cloneNode(true);
        const shadowRoot = this.attachShadow({ mode: "open" });
        shadowRoot.appendChild(clone);
    }

    public addRow(id: string, run: RunSummary) {
        const table = this.shadowRoot?.querySelector("table");

        if (!table) return;

        const row = table.insertRow();

        const scenario = row.insertCell();
        scenario.textContent = run.scenario;

        const state = row.insertCell();
        state.textContent = formatState(run.state, run.time_taken);
        styleState(state, run.state);

        const energy = row.insertCell();
        // if run complete then shows energy, if not shows dash
        energy.textContent = run.energy_used !== undefined && run.energy_used !== null ? run.energy_used.toString() : "-";

        const link = row.insertCell();

        const link_element = document.createElement("a");
        if (run.state === RunState.Running) {
            link_element.href = `/follow/${id}`;
            link_element.textContent = "Follow run";
        } else {
            link_element.href = `/replay/${run.id}`;
            link_element.textContent = "View replay";
        }

        link.appendChild(link_element);
    }
}

customElements.define("algorithm-summary", AlgorithmSummaryElement);

export function AlgorithmSummary(
    name: string,
    author: string,
    state: AlgorithmClientState,
): AlgorithmSummaryElement {
    return createElement("algorithm-summary", {
        name,
        author,
        state: createStateSlot(state),
    }) as AlgorithmSummaryElement;
}

function createStateSlot(state: AlgorithmClientState): HTMLElement {
    const element = document.createElement("span");

    switch (state) {
        case AlgorithmClientState.Running:
            element.textContent = "Running";
            element.style.color = "#fa7202";
            break;
        case AlgorithmClientState.Completed:
            element.textContent = "Completed";
            element.style.color = "#15ff00";
            break;
        case AlgorithmClientState.Failed:
            element.textContent = "Failed";
            element.style.color = "#fa2323";
            break;
    }

    return element;
}

function styleState(slot: HTMLElement, state: RunState) {
    switch (state) {
        case RunState.Completed:
            slot.style.color = "#15ff00";
            break;
        case RunState.Failed:
            slot.style.color = "#fa2323";
            break;
        case RunState.Skipped:
            slot.style.color = "#e0dad5";
            break;
        case RunState.Running:
            slot.style.color = "#fa7202";
            break;
    }
}

function formatState(state: RunState, time_taken: number | null): string {
    if (time_taken === null) {
        return "Pending";
    }

    const time = formatDuration(time_taken);

    switch (state) {
        case RunState.Completed:
            return `Completed in ${time}`;
        case RunState.Failed:
            return `Failed after ${time}`;
        case RunState.Skipped:
            return `Skipped after ${time}`;
        default:
            throw new Error(`Unknown run state: ${state}`);
    }
}
