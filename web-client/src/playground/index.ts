import Warehouse from "../model/warehouse";
import { render } from "../ui/render";
import { Type2Playground } from "./type2playground"
import { Type1Playground } from "./type1playground"
import { Playground } from "./playground";


import "../styles/playground.css";

import scenario from "./default_type1.json";

export let playground: Playground;


async function main() {

    // Start rendering
    await render();
  
    const params = new URLSearchParams(window.location.search);
    if (params.get("type") === "1") {
        playground = new Type1Playground(document);
        // hide all type 2 elements
        let type2Elems = document.getElementsByClassName("type-2");
        for (let elem of type2Elems){
            (elem as HTMLElement).style.display = "none";
        }

        const type2Button = document.getElementById("change-type-2");
        type2Button?.addEventListener("click", () => {
            window.location.href = `/playground/?type=2`;
        });

    } else if (params.get("type") === "2") {
        playground = new Type2Playground(document);
        // hide all type 1 elements
        let type1Elems = document.getElementsByClassName("type-1");
        for (let elem of type1Elems) {
            (elem as HTMLElement).style.display = "none";
        }

        const type1Button = document.getElementById("change-type-1");
        type1Button?.addEventListener("click", () => {
            window.location.href = `/playground/?type=1`;
        });
    }

    Warehouse.current = playground.playgroundScene;


    // populate the dimension input fields with current values
    const dimW = document.getElementById("dim-width") as HTMLInputElement;
    const dimH = document.getElementById("dim-height") as HTMLInputElement;
    const dimD = document.getElementById("dim-depth") as HTMLInputElement;
    if (dimW) dimW.value = String(playground.dimensions.width);
    if (dimH) dimH.value = String(playground.dimensions.height);
    if (dimD) dimD.value = String(playground.dimensions.depth);

    // apply button reloads playground with new dimensions
    const applyBtn = document.getElementById("apply-dimensions");
    applyBtn?.addEventListener("click", () => {
        const w = Number(dimW?.value) || 20;
        const h = Number(dimH?.value) || 100;
        const d = Number(dimD?.value) || 20;

        // save box positions before reloading with new dimensions
        const boxes = Array.from(playground.positions.entries()).map(([_, pos]) => pos);
        sessionStorage.setItem("playgroundBoxes", JSON.stringify(boxes));

        const type = params.get("type") || "1";
        window.location.href = `/playground/?type=${type}&w=${w}&h=${h}&d=${d}`;
    });

    // check if there are saved boxes from a dimension change
    const savedBoxes = sessionStorage.getItem("playgroundBoxes");
    if (savedBoxes) {
        sessionStorage.removeItem("playgroundBoxes");
        const boxes = JSON.parse(savedBoxes);
        for (const box of boxes) {
            // addBoxAtPosition already handles bounds checking
            playground.addBoxAtPosition(box.x, box.y, box.z);
        }
    } else {
        // load the default scenario
        for (const box of scenario.cubes) {
            playground.addBoxAtPosition(box.x, box.y, box.z);
        }
    }
}

main();
