import { Summary } from "../../../server/src/types/index.ts";
import { AlgorithmSummary } from "../ui/components/algorithm-summary";

export async function loadSummary() {
    const path_components = window.location.pathname.split("/");
    const id = path_components[path_components.length - 1];

    const event_source = new EventSource(`/api/summary/${id}`);

    event_source.addEventListener("message", ({ data }) => {
        const summary = JSON.parse(data) as Summary;

        const summary_container = document.querySelector("#summary");

        if (!summary_container) return;

        summary_container.innerHTML = "";

        const summary_element = AlgorithmSummary(
            summary.name,
            summary.author,
            summary.state,
        );

        for (const run of summary.runs) {
            summary_element.addRow(id, run);
        }

        summary_container.appendChild(summary_element);
    });

    event_source.addEventListener("close", () => {
        event_source.close();
    });
}
