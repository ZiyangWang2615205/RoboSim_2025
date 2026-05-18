import { Cube } from "../model/cube";
import Warehouse from "../model/warehouse";
import { Action, BoxType, ExitZone } from "../../../server/src/types/index.ts";
import {
    render, snapFollowTo, setTopDown, startFollowing, startTopDownFollow, stopFollowing, stopTopdown, captureCurrentView,
    restoreView,
} from "../ui/render";
import type { ViewSnapshot } from "../ui/render";
import * as THREE from "three";

type ActionRecord = {
    time: number;
    action: Action;
};

// Add this block for the view toggle buttons
const topDownButton = document.getElementById("top-down-view-button") as HTMLButtonElement | null;
const followingButton = document.getElementById("following-view-button") as HTMLButtonElement | null;

// play/pause button.
const playPauseButton = document.getElementById("play-pause-button") as HTMLButtonElement | null;
let isPaused = true; // pause is default 

// transparency button
const transparencyButton = document.getElementById("transparency-button") as HTMLButtonElement | null;
let transparencyOn = false
let travellerIds = new Set<number>()

// status message
const statusMessage = document.getElementById("view-status-message") as HTMLDivElement | null;
let statusMessageTimeout: number | null = null;

let actionsStack: ActionRecord[] = [];
let currentTimeoutId: number | null = null;
let lastActionTime: number = 0;

let followTargetId: number | null = null;
let followGetter: (() => THREE.Vector3) | null = null;

let topDownPreviousView: ViewSnapshot | null = null;

//replay fixed
let replayFinished = false;
let originalActions: ActionRecord[] = [];
let actionIndex = 0;
let replayMeta: {
  width: number; height: number; depth: number; box_type: BoxType;
  start: Cube[]; requirements: Cube[]; exit_zone:ExitZone;
} | null = null;

function showStatusMessage(message: string) { // funciton to show message
  if (!statusMessage) return;

  statusMessage.textContent = message;
  statusMessage.classList.remove("show");

  void statusMessage.offsetWidth;

  statusMessage.classList.add("show");

  if (statusMessageTimeout !== null) {
    window.clearTimeout(statusMessageTimeout);
  }

  statusMessageTimeout = window.setTimeout(() => {
    statusMessage.classList.remove("show");
    statusMessageTimeout = null;
  }, 1800);
}

//------------------------ logic for dropdown list for traveller boxes
const travellerSelect = document.getElementById("traveller-target-select") as HTMLSelectElement | null;

function refreshTravellerTargetUI(travellerIds: Set<number>) {
  if (!travellerSelect) return;

  const ids = Array.from(travellerIds).sort((a, b) => a - b);

  // if there are no traveller/ the list hiddden
  if (ids.length == 0) {
    travellerSelect.classList.add("hidden");
    travellerSelect.innerHTML = "";
    return;
  }

  travellerSelect.classList.remove("hidden");

  // options reconstruct 
  travellerSelect.innerHTML = "";
  for (const id of ids) {
    const opt = document.createElement("option");
    opt.value = String(id);
    opt.textContent = `Traveller: ${id}`;
    travellerSelect.appendChild(opt);
  }

  // when current followTargetId is one of the traveller, keep it.
  // otherwise make it first id as default
  const initial =
    (followTargetId != null && travellerIds.has(followTargetId))
      ? followTargetId
      : ids[0];

  followTargetId = initial;
  travellerSelect.value = String(initial);
}

// when change dropdown selection, only chagnes followTargetId.
// if active, instantly apply it.
if (travellerSelect) {
  travellerSelect.addEventListener("change", () => {
    const selected = Number(travellerSelect.value);
    if (!Number.isFinite(selected)) return;

    // keep travellerIds, only change target
    followTargetId = selected;

    // instantly apply according to the current view status (re setting the camera target)
    if (followGetter) {
      const pos = followGetter();

      // top-down: instantly change  the view
      if (topDownButton?.classList.contains("active")) {
        setTopDown(pos);
        startTopDownFollow(followGetter);
      }

      // following: move to the target box. 
      if (followingButton?.classList.contains("active")) {
        snapFollowTo(pos);
        startFollowing(followGetter);
      }
    }
  });
}

//------------------------

if (transparencyButton) {
  transparencyButton.addEventListener("click", () => {
    transparencyOn = !transparencyOn;

    transparencyButton.classList.toggle("active", transparencyOn);
    showStatusMessage(transparencyOn ? "Box transparency ON" : "Box transparency OFF");

    // const travellerId = followTargetId ?? null;
    // let travellerIds = new Set<number>()

    if (Warehouse.current) {
      // change depth mode when transparency is on
      Warehouse.current.setTransparencyDepthMode(transparencyOn);
    }

    if (transparencyOn) {
      if (Warehouse.current) {
        // 10% box transparency except traveling box.
        Warehouse.current.setNonTravellerOpacity(travellerIds, 0.3); // float value for transparency of box

        Warehouse.current.setNonTravellerAdditionalOpacity(travellerIds, 0.3, true); // float value for transparancy of leg, id etc
      }
    } else {
      if (Warehouse.current) {
        // back to normal
        Warehouse.current.resetNonTravellerOpacity();

        Warehouse.current.resetNonTravellerAdditionalOpacity();
      }
    }
  });
}


if (topDownButton) {
    topDownButton.addEventListener("click", () => {
        
        if (topDownButton.classList.contains("active")) {
            topDownButton.classList.remove("active");
            showStatusMessage("Top Down OFF");
            
            let lastPos: THREE.Vector3 | undefined = undefined;
            if (followGetter) {
                lastPos = followGetter();
            }
            
            stopFollowing();
            stopTopdown();

            //setTopDown(lastPos);
            if (topDownPreviousView) { // restore to last position
                restoreView(topDownPreviousView);
                topDownPreviousView = null;
            }

        } else {
            if (!followGetter) {
                console.warn("No follow target set. Cannot start top-down follow.");
                showStatusMessage("No follow target set. Cannot start top-down follow.");
                setTopDown();
                return;
            }

            topDownPreviousView = captureCurrentView(); // save current posiition before topdown view 

            topDownButton.classList.toggle("active");
            topDownButton.classList.add("active");
            followingButton?.classList.remove("active");
            showStatusMessage("Top Down ON");

            const targetPos = followGetter();
            setTopDown(targetPos);

            startTopDownFollow(followGetter);
        }


  });
}

if (followingButton) {
    followingButton.addEventListener("click", () => {

        if (followingButton.classList.contains("active")) {
            followingButton.classList.remove("active");
            showStatusMessage("Following Box OFF");

            stopFollowing();
        } else {
            if (!followGetter){
                console.warn("No follow target yet. Wait until replay data loads...");
                return;
            }
            snapFollowTo(followGetter());
            followingButton.classList.toggle("active");
            topDownButton?.classList.remove("active");
            followingButton.classList.add("active");
            showStatusMessage("Following Box ON");

            stopTopdown();
            startFollowing(followGetter);
        }
        
    });
}

// start/pause button 
if (playPauseButton) {
    playPauseButton.addEventListener("click", () =>{
        //if stop -> start and replay over should be reset
        //paused in default
        const willPlay = isPaused;
        if(willPlay && replayFinished){
            restartReplayFromBeginning();
        }

        isPaused = !isPaused; // toggle state

        playPauseButton.classList.toggle("active", !isPaused);

        if (!isPaused) {
            // pause -> play
           setTimeout(() =>  runNextAction(),400);
        } else {
            if (currentTimeoutId) {
                //clearTimeout(currentTimeoutId);
                //currentTimeoutId = null;
                stopReplayTimer();
            }
        }
    });
}

// replace perform action.
function runNextAction() {
    if (isPaused) {
        return; // stop when pause
    }

    //if ending
    if (actionIndex >= originalActions.length) {
    console.log("Replay finished");
    replayFinished = true;
    isPaused = true;
    playPauseButton?.classList.remove("active");
    currentTimeoutId = null;
    return;
  }

    const current = originalActions[actionIndex];
    Warehouse.current?.applyAction(current.action);

    //calc waiting time of next step
    const next = originalActions[actionIndex + 1];
    const wait = next ? Math.max(0, next.time - current.time) : 0;

    actionIndex++;

    /*const next = actionsStack.pop(); // take next action from stack

    if (!next) {
        // finish replay
        console.log("Replay finished");
        isPaused = true;
        playPauseButton?.classList.remove("active");
        return;
    }

    Warehouse.current?.applyAction(next.action);

    const nextAction = actionsStack[actionsStack.length - 1]; // peek

    // calculate waiting time until next until 
    let timeToWait = 0;
    //lastActionTime = next.time; // update last time
    if (nextAction) {
        timeToWait = nextAction.time - next.time;
    } else {
        timeToWait = 0;
    }*/

    // scheduling for next action
    currentTimeoutId = window.setTimeout(runNextAction,wait);
}


function stopReplayTimer() {
  if (currentTimeoutId != null) {
    clearTimeout(currentTimeoutId);
    currentTimeoutId = null;
  }
}

function rebuildWarehouseToStart() {
  if (!replayMeta) return;

  // recreate warehouse
  const { width, height, depth, box_type, start, requirements, exit_zone } = replayMeta;

  const warehouse = new Warehouse(width, height, depth, box_type);
  Warehouse.current = warehouse;

  //clearWarehouseScene();

  for (const start_cube of start) {
    const cube = new Cube(start_cube.id, start_cube.x, start_cube.y, start_cube.z, box_type);
    warehouse.addCube(cube);
  }

  warehouse.addStartEndCubes(true, start);
  warehouse.addStartEndCubes(false, requirements);
  const corner1 = {x1:exit_zone.x1, y1:exit_zone.y1, z1:exit_zone.z1};
  const corner2 = {x2:exit_zone.x2, y2:exit_zone.y2, z2:exit_zone.z2};
  warehouse.addExitCubes(corner1,corner2)

  // reset travellerIds
  travellerIds = new Set<number>((requirements ?? []).map(r => r.id));
  if (travellerIds.size === 0 && followTargetId !== null) travellerIds.add(followTargetId);
  refreshTravellerTargetUI(travellerIds);

  // reset followGetter
  if (followTargetId != null) {
    followGetter = () => {
      const c = Warehouse.current?.getCube(followTargetId!);
      if (c) return c.additionalMesh.position;

      stopFollowing();
      followingButton?.classList.remove("active");
      return new THREE.Vector3(0, 0, 0);
    };
  }

  // Make sure Transparent works
  if (Warehouse.current) {
    Warehouse.current.setTransparencyDepthMode(transparencyOn);
    if (transparencyOn) {
      Warehouse.current.setNonTravellerOpacity(travellerIds, 0.3);
      Warehouse.current.setNonTravellerAdditionalOpacity(travellerIds, 0.3, true);
    } else {
      Warehouse.current.resetNonTravellerOpacity();
      Warehouse.current.resetNonTravellerAdditionalOpacity();
    }
  }
  // Make sure top-down and follow camera works
  if (followGetter) {
    const pos = followGetter();

    if (topDownButton?.classList.contains("active")) {
      setTopDown(pos);
      startTopDownFollow(followGetter);
    } else {
      stopTopdown();
    }

    if (followingButton?.classList.contains("active")) {
      snapFollowTo(pos);
      startFollowing(followGetter);
    } else {
      stopFollowing();
    }
  }
}

//construct replay restart
function restartReplayFromBeginning() {
  stopReplayTimer();
  replayFinished = false;
  actionIndex = 0;
  rebuildWarehouseToStart();
}

function pickFirstMovingId(actions: ActionRecord[]): number | null {
  for (const a of actions) {
    const act = a.action as any;
    if (act && typeof act.id === "number") {
      return act.id;
    }
  }
  return null;
}

async function playReplay() {
    const path_components = window.location.pathname.split("/");
    const id = path_components[path_components.length - 1];
    //let travellerIds = new Set<number>()
    const response = await fetch(`/api/replay/${id}`);
    const {
        actions,
        width,
        height,
        depth,
        start,
        requirements,
        box_type,
        exit_zone
  

    }: { actions: ActionRecord[]; width: number; height: number; depth: number; start: Cube[]; requirements: Cube[]; box_type: BoxType; exit_zone:ExitZone } =
        await response.json();

    replayMeta = { width, height, depth, box_type, start, requirements, exit_zone };
    // make sure it rise with increment of time
    originalActions = [...actions].sort((a, b) => a.time - b.time);
    actionIndex = 0;
    replayFinished = false;

    const warehouse = new Warehouse(width, height, depth, box_type);
    Warehouse.current = warehouse;
    //render();

    for (const start_cube of start) {
        const cube = new Cube(
            start_cube.id,
            start_cube.x,
            start_cube.y,
            start_cube.z,
            box_type,
        );

        warehouse.addCube(cube);
    }

    warehouse.addStartEndCubes(true, start); // start is also {x, y, z}[]

    warehouse.addStartEndCubes(false, requirements); // requirements is also {x, y, z}[]
    const corner1 = {x1:exit_zone.x1, y1:exit_zone.y1, z1: exit_zone.z1};
    const corner2 = {x2:exit_zone.x2, y2:exit_zone.y2, z2: exit_zone.z2};
    
    warehouse.addExitCubes(corner1, corner2);
    
    render();

    const fromActions = pickFirstMovingId(actions);
    // more priority on requirements then fromAcitons
    const candidateId =
    (requirements && requirements[0] ? requirements[0].id : null) ?? fromActions;

    if (candidateId != null) {
        const existsNow = warehouse.getCube(candidateId);
        if (existsNow) {
            followTargetId = candidateId;

            followGetter = () => {
                const c = Warehouse.current?.getCube(followTargetId!);
                if (c) {
                    return c.additionalMesh.position;
                }

                console.warn('Follow target ${followTargetID} not found. Stopping follow'); // working?
                stopFollowing();
                followingButton?.classList.remove("active");
                return new THREE.Vector3(0, 0, 0);
            };

            
            if (followingButton?.classList.contains("active")) {
                startFollowing(followGetter);
            }
        } else {
            console.warn(`Requirement ID ${candidateId} not found as a live cube. Check start/end ID consistency.`);
        }
    } else {
        console.warn("No requirements provided; following target not set.");
    }

    travellerIds = new Set<number>(
    (requirements ?? []).map(r => r.id)
    );

    if (travellerIds.size === 0 && followTargetId !== null) {
    travellerIds.add(followTargetId);
    }
    //--------------
    refreshTravellerTargetUI(travellerIds);
    //---------------


    // Create a stack of moves
    //actionsStack = actions.reverse();

}

playReplay();
