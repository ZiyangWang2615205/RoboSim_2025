import "../ui/components/pagination";
import "../ui/components/navbar";

function setupToggleGroup(groupId: string) {
    const group = document.getElementById(groupId);
    // added safety check incase browser cant find group
    if (!group) return;

    const buttons = group.querySelectorAll(".toggle-option");

    buttons.forEach(button => {
        button.addEventListener("click", (e) => {
            // making all buttons unactive when user clicks toggle
            buttons.forEach(btn => btn.classList.remove("active"));

            const clickedBtn = e.target as HTMLButtonElement;
            // makes pressed button active so it glows
            clickedBtn.classList.add("active");

            // asking server to filter leaderboard data
            if (groupId === "user-toggle-group") {
                currentFilter = clickedBtn.dataset.value || "all";
            } else if (groupId === "status-toggle-group") {
                currentStatus = clickedBtn.dataset.value || "all";
            }
            
            // re-rendering table w new filters
            fetchAndRenderBenchmarks();
        });
    });
}

setupToggleGroup("user-toggle-group");
setupToggleGroup("status-toggle-group");

// INSTRUCTIONS TOGGLE LOGIC
function setupInstructionsToggle() {
    const toggleBtn = document.getElementById("toggle-instructions-btn");
    const panel = document.getElementById("instructions-panel");

    if (toggleBtn && panel) {
        toggleBtn.addEventListener("click", () => {
            // panel currently visible and user wants to close it
            if (panel.style.display === "block") {
                panel.style.display = "none";
                toggleBtn.innerText = "How to Connect ▾";
            // if panel currently hidden
            } else {
                panel.style.display = "block";
                toggleBtn.innerText = "Close Instructions ▴";
            }
        });
    }
}
setupInstructionsToggle();

// BOX TYPE BUTTON LOGIC

// current state of box type
let currentType = "type1";

function setupTypeToggle() {
    const typeBtn = document.getElementById("type-toggle-btn");

    if (typeBtn) {
        typeBtn.addEventListener("click", () => {
            if (typeBtn.innerText.includes("Type 2")) {
                currentType = "type2";
                typeBtn.innerText = "Switch to Type 1";
            } else {
                currentType = "type1";
                typeBtn.innerText = "Switch to Type 2";
            }
            fetchAndRenderBenchmarks();
        });
    }
}

setupTypeToggle();

// --- BENCHMARKING LOGIC ---
// keeping track of toggle states
let currentFilter = "all";
let currentStatus = "all";

// track the data and sorting states
let data: any[] = [];
let currentSortColumn = "date_time";
let isDesc = true;

let loggedInUserId: string | null = null;

// author and scenario filters to track
let authorFilter: string | null = null;
let scenarioFilter: string | null = null;

/**
 * fetching data from API and rendering table rows
 */
async function fetchAndRenderBenchmarks() {
    // debugging
    console.log("fetching");
    console.log("current author filter", authorFilter);
    console.log("current scenario filter:", scenarioFilter);
    try {
        // calling api and passing filter states
        const author = authorFilter ? `&author=${encodeURIComponent(authorFilter)}` : '';
        const scenario = scenarioFilter ? `&scenario=${encodeURIComponent(scenarioFilter)}` : '';
        const response = await fetch(`/api/leaderboard/benchmarks?filter=${currentFilter}&status=${currentStatus}&type=${currentType}${author}${scenario}`);
        const parsedJson = await response.json();
        data = parsedJson.runs;
        loggedInUserId = parsedJson.currentUserId;

        // adding check for live connection panel
        // checking if any of the runs are actively still running
        const activeRun = data.find((run: any) => run.finish_state === 0);
        console.log("Found active run:", activeRun);

        if (activeRun && activeRun.alg_id) {
            console.log("Calling liveConnections");
            liveConnections(activeRun.alg_id);
        }

        renderTable();

    } catch (error) {
        console.error("Failed to load benchmarks:", error);
    }
}

function renderTable() {
    const container = document.querySelector('.benchmarking-table-container');
        if (!container) return;

        const header = container.querySelector('.benchmarking-header');

        data.sort((a, b) => {
            let A = a[currentSortColumn];
            let B = b[currentSortColumn];

            // if -1 returned, sort() puts a before b
            // other way round when 1 returned
            if (A < B) return isDesc ? 1 : -1;
            if (A > B) return isDesc ? -1 : 1;
            return 0;
        });

        // wiping container and adding header at top
        container.innerHTML = '';
        if (header) container.appendChild(header);

        // looping through every run and generating a row
        data.forEach((run: any) => {
            const row = document.createElement('div');
            row.className = 'benchmarking-row';
            
            // formatting date
            const dateObj = new Date(run.date_time);
            const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth()+1).padStart(2, '0')}/${dateObj.getFullYear()} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;

            // checking if successful(1) or failed(2)
            const isSuccess = run.finish_state === 1;
            const finishIcon = isSuccess ? '<span class="success-text">✔</span>' : '<span class="danger-text">✘</span>';

            // building html
            row.innerHTML = `
              <div class="col-check"><input type="checkbox"></div>
              <div class="col-name">
                <strong>${run.alg_name}</strong>
                <span class="subtext">${run.alg_id}</span>
              </div>
              <div class="col-author"><a href="#" class="filter-link author-link" data-author="${run.author}">${run.author}</a></div>
              <div class="col-date">${formattedDate}</div>
              <div class="col-scenario"><a href="#" class="filter-link scenario-link" data-scenario="${run.scenario_name}">${run.scenario_name}</a></div>
              <div class="col-kpi">${run.move_count}</div>
              <div class="col-kpi">${run.energy_used}</div>
              <div class="col-kpi">${run.time_taken}</div>
              <div class="col-icon">${finishIcon}</div>
              <div class="col-icon action-btn play-btn" data-runid="${run.run_id}">▶︎︎</div>
              <div class="col-icon action-btn danger-text delete-btn" data-runid="${run.run_id}" data-authorid="${run.author_id}">🗑</div>
            `;
            container.appendChild(row);
        });

        // attaching click listeners
        attachRowActions();
}

function setupSorting() {
    const header = document.querySelector('.benchmarking-header');
    if (!header) return;

    const columns = header.querySelectorAll('.col-kpi');

    columns.forEach((col, index) => {
        // so it looks clickable
        (col as HTMLElement).style.cursor = 'pointer';

        col.addEventListener('click', () => {
            // matching column clicked to correct database key
            const sortKeys = ['move_count', 'energy_used', 'time_taken'];
            const clickedColumn = sortKeys[index];

            // if same column clicked again, reversing sorting dir
            if (currentSortColumn === clickedColumn) {
                isDesc = !isDesc;
            } else {
                currentSortColumn = clickedColumn;
                isDesc = false; 
            }

            // re-rendering table with updated global variables
            renderTable();
        });
    });
}

setupSorting()


/**
 * when play or delete hit
 */
function attachRowActions() {
    // delete buttons
    const deleteBtns = document.querySelectorAll('.delete-btn');
    deleteBtns.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const runId = (e.currentTarget as HTMLElement).dataset.runid;
            const authorId = (e.currentTarget as HTMLElement).dataset.authorid;
            if (!runId) return;

            // showing up the error and returning so no confirmation comes up
            if (String(authorId) !== String(loggedInUserId)) {
                alert("You can only delete your own algorithm runs!");
                return;
            }
            
            // safety confirmation to avoid accidental deletions
            if (confirm("Are you sure you want to delete this run?")) {
                await fetch(`/api/leaderboard/benchmarks/${runId}`, { method: 'DELETE' });
                // instantly reloading table so it disapears
                fetchAndRenderBenchmarks();
            }
        });
    });

    // play/replay buttons
    const playBtns = document.querySelectorAll('.play-btn');
    playBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const runId = (e.currentTarget as HTMLElement).dataset.runid;
            if (!runId) return;
            // sending user to replay page
            window.location.href = `/replay/${runId}`; 
        });
    });

    const authorLinks = document.querySelectorAll('.author-link');
    authorLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); 
            const clickedAuthor = (e.currentTarget as HTMLElement).dataset.author;
            
            if (authorFilter === clickedAuthor) {
                authorFilter = null;
            } else {
                authorFilter = clickedAuthor || null;
            }
            
            // refetching from server with filter
            fetchAndRenderBenchmarks();
        });
    });

    const scenarioLinks = document.querySelectorAll('.scenario-link');
    scenarioLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); 
            const clickedScenario = (e.currentTarget as HTMLElement).dataset.scenario;
            
            if (scenarioFilter === clickedScenario) {
                scenarioFilter = null;
            } else {
                scenarioFilter = clickedScenario || null;
            }

            fetchAndRenderBenchmarks();
        });
    });
}

fetchAndRenderBenchmarks();

let eventSource: EventSource | null = null;

function liveConnections(algorithmId: string) {
    const liveAlgoContent = document.getElementById("live-status-content");
    if (!liveAlgoContent) {
        console.error("Couldnt find live-status-content div");
        return;
    }

    if (eventSource) {
        eventSource.close();
    }

    // used endpoint from load_summary.ts file to get endpt
    eventSource = new EventSource(`/api/summary/${algorithmId}`);
    console.log(`Attempting to connect to: /api/summary/${algorithmId}`);

    eventSource.addEventListener("message", ({data}) => {
        console.log("Live data recieved:", data);
        try {
            const summary = JSON.parse(data);

            const mostRecentRun = summary.runs[summary.runs.length - 1];
            if (!mostRecentRun) return;

            // 0 = running, 1 = finished, 2 = failed
            if (mostRecentRun.state === 0) {
                liveAlgoContent.innerHTML = `
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; color: #fff; font-size: 0.95rem;">
                        <div><strong style="color: #888;">Name:</strong> <span style="color: var(--neon-blue);">${summary.name}</span></div>
                        <div><strong style="color: #888;">Scenario:</strong> ${mostRecentRun.scenario}</div>
                        <div><strong style="color: #888;">Moves:</strong> ${mostRecentRun.move_count || 0}</div>
                        <div><strong style="color: #888;">Energy:</strong> ${mostRecentRun.energy_used || 0}</div>
                        <div style="grid-column: span 2; margin-top: 10px;">
                            <strong style="color: #888;">Status:</strong> 
                            <span style="color: #00ff00; text-shadow: 0 0 8px #00ff00;">▶︎ Running...</span>
                        </div>
                    </div>
                `;
            } else if (mostRecentRun.state === 1 || mostRecentRun.state === 2) {
                liveAlgoContent.innerHTML = `<p style="color: #00ff00; text-shadow: 0 0 8px #00ff00;">✔ Run Complete! Updating table...</p>`;

                //waiting 2 secs so user can see success msg then reloading table to show new data
                setTimeout(() => {
                    fetchAndRenderBenchmarks();
                    liveAlgoContent.innerHTML = `<p style="color: #aaa; font-style: italic;">Awaiting connection...</p>`;
                },2000)

                if (eventSource) {
                    eventSource.close();
                }

            }
        } catch (err) {
            console.error("Failed to pass  live data:", err);
        }
    });
    
    eventSource.addEventListener("error", () => {
        // if server disconnects, showing error and trying to reconnect
        if (liveAlgoContent.innerHTML.includes("Running")) {
             liveAlgoContent.innerHTML = `<p style="color: #ff3333;">Connection to server lost. Reconnecting...</p>`;
        }
    });
}