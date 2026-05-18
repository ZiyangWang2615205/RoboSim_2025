// Import styles
import "./styles/dashboard.css";
import "./ui/components/navbar.js";
import { SSEHandler } from "./connect/sse.js";
import "./ui/components/algorithm-type";
import { setURLParams } from "./utils.js";

const algorithm_type = document.querySelector("algorithm-type-picker");

if (algorithm_type === null) {
    throw new Error("Algorithm type picker not found");
}

// The URL query (e.g. `?type=user`) is used to decide the initial value of
// the algorithm type picker.
const params = new URLSearchParams(window.location.search);

const initial_type = params.get("type") !== "all" ? "user" : "all";

const handler = new SSEHandler(initial_type);

algorithm_type.addEventListener("algorithm-type", (event) => {
    const type = (event as CustomEvent).detail;

    // Set the query of the URL to e.g. `?type=user`.
    setURLParams({ type });
    handler.setType(type);
});

document.getElementById("logout")?.addEventListener("click", (event) => {
    event.preventDefault();
    fetch("/api/auth/logout", { method: "POST", credentials: "include" })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                window.location.href = "/login";
            }
        });
});

// Toggle the algorithm replays
const toggleBtn = document.getElementById("replays-toggle");
const replaysContent = document.getElementById("replays-content");
const toggleLabel = document.getElementById("toggle-label");

toggleBtn?.addEventListener("click", () => {
    replaysContent?.classList.toggle("hidden");
    toggleBtn.classList.toggle("active");

    if (toggleLabel) {
        toggleLabel.textContent = replaysContent?.classList.contains("hidden")
            ? "Show Algorithm Runs"
            : "Hide Algorithm Runs";
    }
});

