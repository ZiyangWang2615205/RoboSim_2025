import { formatDuration } from "../../../utils";
import { loadTemplate } from "../utils";
import { LeaderboardElement } from "./leaderboard";

const template = await loadTemplate(
    "/components/leaderboard/main-leaderboard.html",
);

class MainLeaderboardElement extends LeaderboardElement {
    constructor() {
        super();

        const clone = template.content.cloneNode(true);
        const shadowRoot = this.attachShadow({ mode: "open" });
        shadowRoot.appendChild(clone);
    }

    /** @override */
    protected async renderTable() {
        const table = this.shadowRoot?.querySelector(
            "table",
        ) as HTMLTableElement;

        const url = new URL(`/api/leaderboard/`, document.location.href);

        url.searchParams.set("sort", this._sort);

        url.searchParams.set("page", this._page.toString());

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(response.statusText);
        }

        const { count, data, total_scenarios } = await response.json();

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
            row.insertCell(2).textContent =
                `${item.completed.toString()}/${total_scenarios}`;
            row.insertCell(3).textContent = Number(item.move_count).toFixed(1);
            row.insertCell(4).textContent = formatDuration(Number(item.time_taken));
            row.insertCell(5).textContent = Number(item.energy_used).toFixed(1);
        }
    }
}

customElements.define("main-leaderboard", MainLeaderboardElement);

/**
 * The leaderboard that is displayed when no scenarios have been created.
 */
export function MainLeaderboard() {
    return document.createElement("main-leaderboard");
}
