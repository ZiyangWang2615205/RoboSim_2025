### These changes have all been implemented other than a line following the box's movements. There's also some good breakdown of what files do in here!

### Summary

`../web-client/` Front-end app root. Hosts pages/components and static assets; built with Vite.

`../web-client/src/` Source directory. Contains TypeScript logic (Three.js rendering, Chart.js graphs, SSE handlers), UI components, and CSS styles.

---

## Tasks to Implement

### 1. Perspective Options Interface

* **Files**

  * `/web-client/replay/index.html`
  * `/web-client/src/styles/replay.css`
  * `/web-client/src/ui/render.ts`← expose camera helpers
  * `/web-client/src/replay/main.ts`

* **Description**

  * Add UI controls to select camera mode: Top-down / Follow box (radio or toggle)
  * In `render.ts`, expose functions to:  
     * set a top-down camera preset (position/up/target).
      * start/stop following a box by updating the controls’ target each frame.
  * In `replay/main.ts`, wire the UI:
      * When Top-down is selected → call top-down preset.
      * When Follow is selected → call “follow” with the currently chosen/selected cube.
      * Provide a simple way to choose which box to follow (e.g., “currently selected box” or a dropdown of IDs from the loaded replay).
---

### 2. Start / Pause Buttons for Replay

* **Files**

  * `/web-client/replay/index.html`
  * `/web-client/src/styles/replay.css`
  * `/web-client/src/replay/main.ts`
* **Description**

  * Add buttons: Start, Pause/Resume, Restart.
  * In `main.ts`, refactor the replay runner into a small controller that:
      * Loads actions, keeps an index, and schedules the next action based on recorded timestamps.
      * Supports start, pause/resume (stop scheduling + continue later), and restart (reset index and timers).
  * Button state management:
      * Disable Start while playing; enable Pause/Restart.
      * On pause → toggle to Resume.
      * On completion → disable Start/Pause, enable Restart.

---

### 3. Exception Handling

* **File**

  * `/web-client/src/replay/main.ts`
* **Description**

  * Safe fetch + validation:
      * Check `response.ok`, handle network/HTTP errors.
      * JSON parse try/catch.
      * Validate required fields: `actions` (array, non-empty), `width/height/depth`, `start`, `requirements`, `box_type`.
  * Empty/invalid cases:
    * Show user-visible error (banner/alert) and **do not** start rendering/replay.
    * Disable replay controls until a valid payload is loaded.

---
### 4. Transparent box

* **File**

  * `/web-client/replay/index.html`
  * `/web-client/src/styles/replay.css`
  * `/web-client/model/warehouse.ts`
  * `/web-client/model/cube.ts` 
  * `/web-client/src/replay/main.ts`
  
* **Description**

  * Toggles a button when we want to make boxes invisible except traveller boxes

---
### 5. Show the route of the box movement.

* **File**

  * going to find which files need to be implement
  
* **Description**

  * show the path the box has passed.
   

---
---

### < **`web-client/src/` overview** >

  * **`account/index.ts`** — Account settings (profile/name change, password change, username change, token display & copy)
  * **`connect/sse.ts`** — Subscribes to SSE to receive the live list of algorithm clients, updates the on-screen list, and requests more items via infinite scroll (IntersectionObserver sentinel). View logic that shows each client’s current status.
  * **`follow/`** — Frontend for spectating a live run.

    * **`main.ts`** — Entry point. Calls `render()` to start the Three.js/WebGL loop (scene/camera/lights/frame loop) and instantiates `WebClient` to begin receiving SSE events.
    * **`connect.ts`** — `WebClient`: reads the last URL segment and opens `EventSource("/api/follow/{id}")`. Listens for `FollowEvent`s and applies state init/updates/end/error to the Warehouse/Cube model.
    * **`info.ts`** — Controls the bottom error popup and updates the “algorithm name/author” labels.

  * **`leaderboard/`** — Stats/visualization pages.

    * **`graph.ts`** — Uses Chart.js (imported in the Vite project) to plot algorithm-client performance by scenario. Draws a default graph on load and regenerates graphs based on dropdown/checkbox selections.
    * **`main.ts`** — Renders either the main leaderboard or a per-scenario table. Reads URL query to choose the initial view; on selection changes, updates URL params and replaces the table (or updates its attributes).
  * **`model/`** — Three.js scene models and animation.

    * **`warehouse.ts`** — Warehouse scene holder (singleton-style via `Warehouse.current`). Renders many cubes efficiently with an instanced mesh; applies actions (moves/leg actions); manages start/end markers.
    * **`cube.ts`** — Single cube model. Builds the body + edge lines and (for Type-2 only) leg meshes; renders a numbered texture; exposes per-cube leg animation helpers.
    * **`start-end-cube.ts`** — Renders semi-transparent start/end overlays as `InstancedMesh` plus edge lines; add/remove helpers.
  * **`playground/`** — Local editor (“sandbox”) to place/select/move boxes, set start/end states, and save/load scenarios (JSON).

    * **`playground.ts`** — Abstract base: input wiring (buttons/keyboard), selection, save/load, start/end assignment, common helpers.
    * **`type1playground.ts`** — Movement/validation for Type-1 boxes (no legs).
    * **`type2playground.ts`** — Movement/validation and leg actions for Type-2 boxes (with legs).
    * **`coordinate-map.ts`** — Column (x,z) → { y → id, highestY } structure. Reindexes IDs in a column on extend/retract and supports stack queries.
    * **`saveload.ts`** — Export/import current warehouse to/from JSON.
    * **`index.ts`** — Chooses Type-1 or Type-2 playground from URL params and binds `Warehouse.current`.
  * **`replay/main.ts`** — Client-side replay player.

    * Reads the replay ID from the URL, fetches `/api/replay/:id` (warehouse size, start state, requirements, action sequence, box type). Creates a `Warehouse`, sets `Warehouse.current`, and starts `render()`. Instantiates `Cube`s for the start state, overlays start/end markers, then replays actions locally by popping from a reversed stack and delaying each call to `warehouse.applyAction(action)` by `(next.time - time)` via `setTimeout`. No SSE/WebSocket—replay runs entirely from the fetched dump.
  * **`styles/...`** — Global/page-specific CSS for layout and visuals (`.css`).
  * **`summary/`** — Summary view for a specific algorithm client.

    * **`graph.ts`** — Visualizes the current algorithm’s results; toggles between per-scenario graphs and comparisons against top algorithms.
    * **`load_summary.ts`** — Subscribes to SSE at `/api/summary/:id`, receives summary data, and renders the summary component.
    * **`main.ts`** — Initializes the summary page and routes to the graph page when “Generate Graph” is clicked.
  * **`ui/...`** — Presentation layer utilities and web components consumed by the pages: Three.js render loop and mouse picking (including InstancedMesh), scene objects (floor/lights), Chart.js graph helpers, and components such as Navbar, leaderboard widgets, and pagination.

