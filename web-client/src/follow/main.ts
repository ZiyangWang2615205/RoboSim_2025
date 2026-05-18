import { render, snapFollowTo, setTopDown, startFollowing, startTopDownFollow, stopFollowing, stopTopdown, captureCurrentView,
    restoreView,    } from "../ui/render"; //import to make view features on follow play
import { WebClient } from "./connect";
import Warehouse from "../model/warehouse";
import { getTravellerIds, getFollowGetter, getFollowTargetId, setFollowTargetId } from "./follow_state"; // made new file to prevent cyclic dependency, thus make that link with main.ts
import * as THREE from "three";

import "../styles/follow.css";
import "../ui/components/icons/close.ts";
import {Action} from "@shared/types";
import type { ViewSnapshot } from "../ui/render";

//copy from replay/main.ts
type ActionRecord = {
    time: number;
    action: Action;
};

// Add this block for the view toggle buttons
const topDownButton = document.getElementById("top-down-view-button") as HTMLButtonElement | null;
const followingButton = document.getElementById("following-view-button") as HTMLButtonElement | null;

// transparency button
const transparencyButton = document.getElementById("transparency-button") as HTMLButtonElement | null;
let transparencyOn = false

// status message
const statusMessage = document.getElementById("view-status-message") as HTMLDivElement | null;
let statusMessageTimeout: number | null = null;

let actionsStack: ActionRecord[] = [];
let currentTimeoutId: number | null = null;
let lastActionTime: number = 0;

let topDownPreviousView: ViewSnapshot | null = null;

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

// same code on replay main.ts
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
    const current = getFollowTargetId();

    const initial =
    (current != null && travellerIds.has(current))
        ? current
        : ids[0];

    setFollowTargetId(initial);
    travellerSelect.value = String(initial);
}

// when change dropdown selection, only chagnes followTargetId.
// if active, instantly apply it.
if (travellerSelect) {
  travellerSelect.addEventListener("change", () => {
    const selected = Number(travellerSelect.value);
    if (!Number.isFinite(selected)) return;

    // keep travellerIds, only change target
    setFollowTargetId(selected);

        const fg = getFollowGetter();
        if (!fg) return;

        const pos = fg();

        // top-down: instantly change the view
        if (topDownButton?.classList.contains("active")) {
            setTopDown(pos);
            startTopDownFollow(fg);
        }

        // following: move to the target box
        if (followingButton?.classList.contains("active")) {
            snapFollowTo(pos);
            startFollowing(fg);
        }
  });
}
// same code on replay main.ts ↑

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
        const ids = getTravellerIds();
        Warehouse.current.setNonTravellerOpacity(ids, 0.3); // float value for transparency of box

        Warehouse.current.setNonTravellerAdditionalOpacity(ids, 0.3, true); // float value for transparancy of leg, id etc
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
            const fg = getFollowGetter();
            if (fg) lastPos = fg();

            stopFollowing();
            stopTopdown();

            //setTopDown(lastPos);
            if (topDownPreviousView) { // restore to last position
                restoreView(topDownPreviousView);
                topDownPreviousView = null;
            }

        } else {
            const fg2 = getFollowGetter();
            if (!fg2) {
            console.warn("No follow target set. Cannot start top-down follow.");
            showStatusMessage("No follow target set. Cannot start top-down follow.");
            setTopDown();
            return;
            }

            topDownPreviousView = captureCurrentView(); // save current posiition before topdown view 

            topDownButton.classList.add("active");
            followingButton?.classList.remove("active");

            showStatusMessage("Top Down ON");
            const targetPos = fg2();
            setTopDown(targetPos);

            startTopDownFollow(fg2);
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
            const fg = getFollowGetter();
            if (!fg) {
            console.warn("No follow target yet. Wait until replay data loads...");
            return;
            }

            snapFollowTo(fg());
            followingButton.classList.toggle("active");
            topDownButton?.classList.remove("active");
            followingButton.classList.add("active");
            showStatusMessage("Following Box ON");
            stopTopdown();
            startFollowing(fg);
        }
        
    });
}

async function main() {
    // Start rendering
    render();

    // Connect to the server and start receiving messages
    new WebClient();

    // every 300ms, check the change of the followId then update. for example, when scenario is finished then move to next scenario, it makes update list of the dropdown Traveller box id.
    let lastKey = "";
    setInterval(() => {
    const ids = Array.from(getTravellerIds()).sort((a, b) => a - b);
    const key = ids.join(",");
    if (key === lastKey) return;
    lastKey = key;
    refreshTravellerTargetUI(new Set(ids));
    }, 300);
}

main();
