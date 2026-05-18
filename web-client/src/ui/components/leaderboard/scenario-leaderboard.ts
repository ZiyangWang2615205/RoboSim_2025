import { formatDuration } from "../../../utils";
import { loadTemplate } from "../utils";
import { LeaderboardElement } from "./leaderboard";

const template = await loadTemplate(
    "/components/leaderboard/scenario-leaderboard.html",
);

class ScenarioLeaderboardElement extends LeaderboardElement {
    static observedAttributes = ["scenario"];

    constructor() {
        super();

        const clone = template.content.cloneNode(true);
        const shadowRoot = this.attachShadow({ mode: "open" });
        shadowRoot.appendChild(clone);
    }

    protected async renderTable() {
        const table = this.shadowRoot?.querySelector(
            "table",
        ) as HTMLTableElement;

        const scenario = this.getAttribute("scenario");

        const url = new URL(
            `/api/leaderboard/scenario/${scenario}`,
            document.location.href,
        );

        url.searchParams.set("sort", this._sort);

        url.searchParams.set("page", this._page.toString());

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(response.statusText);
        }

        const { count, data } = await response.json();

        // If there are 0 items in the leaderboard, the page count should still be one.
        const pages = Math.ceil(count / 15) || 1;

        this.syncAttributes(pages);

        // clear table except for headings
        while (table.rows.length > 1) {
            table.deleteRow(1);
        }

        for (const item of data) {
            const row = table.insertRow();

            row.insertCell(0).textContent = item.algorithm_name;
            row.insertCell(1).textContent = item.author;
            row.insertCell(2).textContent = item.move_count;
            row.insertCell(3).textContent = formatDuration(item.time_taken);
            row.insertCell(4).textContent = item.energy_used;
        }
    }

    attributeChangedCallback(attr: string, _old: string, _new: string) {
        if (attr === "scenario") {
            this._page = 1;
            this._sort = "time";

            this.renderTable();
        }
    }
}

customElements.define("scenario-leaderboard", ScenarioLeaderboardElement);

/**
 * The leaderboard for a specific scenario.
 *
 * @param scenario The id of the scenario to display information for.
 */
export function ScenarioLeaderboard(scenario: number) {
    const element = document.createElement("scenario-leaderboard");

    element.setAttribute("scenario", scenario.toString());

    return element;
}
