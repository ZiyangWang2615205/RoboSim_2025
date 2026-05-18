import { camera, canvas } from "./render.js";
import Warehouse from "../model/warehouse.js";
import { Cube } from "../model/cube.js";
import * as THREE from 'three';
import { BoxType } from "../../../server/src/types/index.js";

export const mouse: THREE.Vector2 = new THREE.Vector2(1, 1);
export let selected : Cube | null = null;
export let selectedNormal: THREE.Vector3 | null = null;

const raycaster = new THREE.Raycaster();
const showID = document.getElementById("showID");

/*
threejs intersection with instancedMesh is stupid 
so the intersection function was rewritten to make sure the local transformation matrix 
could be implemented instead of the global one
*/

function intersectInstancedMesh(raycaster: THREE.Raycaster): THREE.Intersection[] {
    if (!Warehouse.current) {
        return [];
    }
    const intersections: THREE.Intersection[] = [];
    const position = new THREE.Vector3();
    // create tempMesh used to change worldPosition
    const tempMesh = new THREE.Mesh(Warehouse.current.cubeInstances.geometry, Warehouse.current.cubeInstances.material);

    for (let i = 0; i < Warehouse.current.cubeInstances.count; i++) {
        const offset = i * 16
        // should be faster
        position.x = Warehouse.current._instanceData.matrices[offset + 12];
        position.y = Warehouse.current._instanceData.matrices[offset + 13];
        position.z = -Warehouse.current._instanceData.matrices[offset + 14];

        tempMesh.matrixWorld.setPosition(position);
        // get intersection
        const results = raycaster.intersectObject(tempMesh, false);
        
        if (results.length > 0) {
            for (const result of results) {
                // add instanceID property
                (result as any).instanceId = i;
                intersections.push(result);
            }
        }
    }

    // sort by distance
    intersections.sort((a, b) => a.distance - b.distance);
    return intersections;
}

export function canvasOnPointer(event : MouseEvent) {
    let scenario = Warehouse.current;
    if (!scenario) return;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // calculate objects intersecting the picking ray
    const intersection = intersectInstancedMesh(raycaster);

    // Have element in cast_result
    if (intersection.length > 0) {
        // Select the first cube that the ray hits
        const instanceID = intersection[0].instanceId;
        // Use the map to look up the ID of the cube
        
        if (instanceID != undefined) {
            if (selected && scenario.currentSelected != selected.id) {
                scenario.setMixFactor(selected.id, .0);
                scenario.setColour(selected.id, [.0, .0, .0]);
                if (selected?.type == BoxType.Type2) selected.setLegColor({r: 0, g: 0, b: 0});
            }
            const cubeID = scenario.toCubeID(instanceID);
            scenario.setMixFactor(cubeID, .5);
            scenario.setColour(cubeID, [.35, 0, .45]);
            selected = scenario.getCube(cubeID);
            selectedNormal = intersection[0].face?.normal || null;
            if (selected?.type == BoxType.Type2) selected?.setLegColor({r: 0.11, g: 0, b: 0.19});
            if (showID && selected) showID.innerHTML = "ID: " + selected.id.toString();
        }
    } else {
        // no hit instance
        if (showID) showID.innerHTML = "";
        if (selected && selected.id){ // check that the cursor was previously hovering over a box
            if (scenario.currentSelected != selected.id) {
                // strip the colour (if it isn't the currently selected box ID)
                scenario.setMixFactor(selected.id, .0);
                scenario.setColour(selected.id, [.0, .0, .0]);
                if (selected?.type == BoxType.Type2) selected.setLegColor({r: 0, g: 0, b: 0});
            }
            // now we know we are pointing at the floor
            selected = null;
            selectedNormal = null;
        }
    }

    if (selected) {
        // change the cursor
        canvas.style.cursor = "crosshair";
    } else {
        // Reset cursor
        canvas.style.cursor = "default";
    }
}

export function resetSelect() {
    selected = null;
    if (showID) showID.innerHTML = "";
    canvas.style.cursor = "default";
}
