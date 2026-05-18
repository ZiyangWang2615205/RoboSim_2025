import "../pagination";
import { setURLParams } from "../../../utils";

/**
 * An abstract class containing the shared code used by the leaderboard
 * components.
 */
export abstract class LeaderboardElement extends HTMLElement {
    protected _sort: string;
    protected _page: number;

    constructor() {
        super();

        const params = new URLSearchParams(window.location.search);
        this._sort = params.get("sort") || "completed-time";
        this._page = Number.parseInt(params.get("page") ?? "1");
    }

    connectedCallback() {
        const sortSelect = this.shadowRoot?.querySelector(
            "#sort",
        ) as HTMLSelectElement;

        sortSelect.addEventListener("change", async (e) => {
            const sort = (e.target as HTMLSelectElement).value;

            setURLParams({ sort });

            this._sort = sort;

            await this.renderTable();
        });

        this.renderTable();
    }

    /**
     * Syncs the values of the input elements (the sort and direction select
     * elements, and the pagination bar) with the current state of the
     * component. This should be called when the leaderboard is re-rendered.
     *
     * @param pages The total number of pages in the leaderboard.
     */
    protected syncAttributes(pages: number) {
        const sortSelect = this.shadowRoot?.querySelector(
            "#sort",
        ) as HTMLSelectElement;

        sortSelect.value = this._sort;

        const pagination = this.shadowRoot?.querySelector("pagination-bar");

        pagination?.setAttribute("page", this._page.toString());
        pagination?.setAttribute("total-pages", pages.toString());
    }

    /**
     * (Re-)render the leaderboard table.
     *
     * @returns The total number of items in the leaderboard.
     */
    protected abstract renderTable(): Promise<void>;
}
