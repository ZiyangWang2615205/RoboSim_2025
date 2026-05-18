import { loadSummary } from "./load_summary";
import "../ui/components/navbar";

checkGenButton();
await loadSummary();

async function checkGenButton() {
    const genButton = document.getElementById("generateButton");
    genButton?.addEventListener("click", function () {
        const path_components = window.location.pathname.split("/");
        const id = path_components[path_components.length - 1];
        window.location.href = `/summary/graph/${id}`;
    });
}
