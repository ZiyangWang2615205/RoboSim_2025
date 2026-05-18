import { CoordinateMap } from "./coordinate-map";
import { setURLParams } from "../utils";
import Warehouse from "../model/warehouse";
import { BoxType } from "../../../server/src/types";
import { selected, mouse, resetSelect, selectedNormal, canvasOnPointer } from "../ui/select";
import { canvas, camera, lockControls, unlockControls } from "../ui/render";
import { WarehouseData, sceneToJson } from "./saveload";
import { Cube } from "../model/cube";
import { makeDraggable } from "../ui/draggable";
import * as THREE from "three";



interface ScenarioState {
    scenarioID: number[] | null;
    startState: string | null;
    endState: string | null;
}

export type Position = { x: number, y: number, z: number };
export enum Direction {
    NORTH,
    EAST,
    SOUTH,
    WEST,
    UP,
    DOWN
}




export abstract class Playground {
    boxType: BoxType;
    
    positions: Map<number, Position>;
    currentlySelectedBox: number;
    dimensions: { width: number; height: number; depth: number };
    layout: CoordinateMap;
    playgroundScene: Warehouse;
    forkliftMode: boolean;
    insertMode: boolean;
    //parent document object
    document: Document;

    // for setting start/end of scenarios
    scenarioState: ScenarioState;

    errorMsgTimeouts: number[] = []
    insertModeBox: HTMLElement | null = null;
    previewMesh: THREE.Mesh; // ghost block shown during insert mode to preview placement
    
    constructor(boxType: BoxType, document: Document){
        this.boxType = boxType;
    
        this.positions = new Map();
        this.currentlySelectedBox = 0;

        // read dimensions from URL params, defaulting to 20x100x20
        const params = new URLSearchParams(window.location.search);
        const w = Number(params.get("w")) || 20;
        const h = Number(params.get("h")) || 100;
        const d = Number(params.get("d")) || 20;
        this.dimensions = { width: w, height: h, depth: d };

        this.layout = new CoordinateMap();
        this.playgroundScene = new Warehouse(this.dimensions.width, this.dimensions.height, this.dimensions.depth, this.boxType);
        this.scenarioState = {
            scenarioID: null,
            startState: null,
            endState: null,
        };
        this.forkliftMode = true;
        this.insertMode = false;
        this.document = document;

        const controlMenu = this.document.getElementById('control-menu');
        if (controlMenu) controlMenu.style.bottom = '0%';

        // make the controls panel draggable by its handle
        const controlDragHandle = this.document.getElementById('control-drag-handle');
        if (controlMenu && controlDragHandle) {
            makeDraggable(controlMenu, controlDragHandle);
        }
        
        this.insertModeBox = this.document.getElementById('insert-mode-box');

        // insert mode box click explains what it does
        this.insertModeBox?.addEventListener('click', () => {
            this.showError('Insert Mode indicator — hold Space to activate. Left click places boxes, right click removes them.', 3000);
        });
       
        // welcome popup logic
        const welcomeOverlay = this.document.getElementById('welcome-popup-overlay');
        const welcomeClose = this.document.getElementById('welcome-popup-close');

        welcomeClose?.addEventListener('click', () => {
            if (welcomeOverlay) {
                welcomeOverlay.style.animation = 'popup-fade-in 0.3s ease reverse';
                setTimeout(() => welcomeOverlay.remove(), 280);
            }
        });

        const clearOverlay = this.document.getElementById('clear-confirm-overlay');
        this.document.getElementById('clear-confirm-cancel')?.addEventListener('click', () => {
            if (clearOverlay) clearOverlay.style.display = 'none';
        });
        this.document.getElementById('clear-confirm-accept')?.addEventListener('click', () => {
            if (clearOverlay) clearOverlay.style.display = 'none';
            this.clearScene();
        });
        // dismiss when clicking the dimmed backdrop
        clearOverlay?.addEventListener('click', (e) => {
            if (e.target === clearOverlay) clearOverlay.style.display = 'none';
        });

        // scenario wizard
        this.document.getElementById('help-save-scenario')?.addEventListener('click', () => {
            // close help panel and open wizard
            const helpPanel = this.document.getElementById('help-panel');
            if (helpPanel) helpPanel.style.display = 'none';
            this.openScenarioWizard();
        });
        this.wireScenarioWizard();

        // clicking the dimmed backdrop closes the help panel
        const helpPanelEl = this.document.getElementById('help-panel');
        helpPanelEl?.addEventListener('click', (e) => {
            if (e.target === helpPanelEl) {
                helpPanelEl.style.display = 'none';
            }
        });

        // ghost block for insert mode hover preview
        const previewGeometry = new THREE.BoxGeometry(1, 1, 1);
        const previewMaterial = new THREE.MeshBasicMaterial({
            color: 0x590073,
            depthWrite: true
        });
        this.previewMesh = new THREE.Mesh(previewGeometry, previewMaterial);

        // cyan edge outline (same color as box outlines)
        const edges = new THREE.EdgesGeometry(previewGeometry);
        const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x00fff7 });
        this.previewMesh.add(new THREE.LineSegments(edges, edgeMaterial));

        this.previewMesh.visible = false; // hidden at first
        this.playgroundScene.scene.add(this.previewMesh); // add to scene so it renders when visible
    
        this.startEventListeners()
    }

    // these are abstract as their implementation differs between box types
    abstract move(dir: Direction, id: number): void;
    abstract addBox(): void;
    abstract removeBox(): void;
    // insert mode methods: add/remove boxes at specific positions using the mouse
    abstract addBoxAtPosition(x: number, y: number, z: number): void;
    abstract removeTargetedBox(id: number): void;
    // leg methods
    abstract displaceOrWithdrawLegs(): void;
    abstract extendOrRetractLegs(): void;

    startEventListeners(){
        // using arrow functions as they do not have problems with scope of 'this' keyword
        const currentlySelectedBoxText = this.document.getElementById('currently-selected') as HTMLSpanElement;
        canvas.addEventListener("mousedown", () => {
            if (selected && currentlySelectedBoxText) {
                this.updateSelectedBox(selected.id);
            }
        });

        const addButton = this.document.getElementById('add-box');
        addButton?.addEventListener('click', () => this.addBox());
    
        const removeButton = this.document.getElementById('remove-box');
        removeButton?.addEventListener('click', () => this.removeBox());

        const clearButton = this.document.getElementById('clear-scene');
        clearButton?.addEventListener('click', () => this.confirmClearScene());

        const saveButton = this.document.getElementById('save-scene');
        saveButton?.addEventListener('click', () => this.saveScene());

        const loadButton = this.document.getElementById('file-input');
        loadButton?.addEventListener('change', () => this.loadScene());


        const forkliftButton = this.document.getElementById('forklift-button');
        forkliftButton?.addEventListener('click', () => this.toggleForkliftMode());

        const displaceWithdrawButton = this.document.getElementById('displace-withdraw');
        displaceWithdrawButton?.addEventListener('click', () => this.displaceOrWithdrawLegs());

        const extendRetractButton = this.document.getElementById('extend-retract');
        extendRetractButton?.addEventListener('click', () => this.extendOrRetractLegs());

        this.document.addEventListener('keydown', (event) => this.handleBasicKeypresses(event) );

        // insertMode: hold spacebar to activate, locks camera so mouse can target blocks
        this.document.addEventListener('keydown', (event) => {
            if (event.key === ' ' && !event.repeat) {
                event.preventDefault();
                this.insertMode = true;
                lockControls(); // freeze camera
                if (this.insertModeBox) {
                    this.insertModeBox.classList.add('insert-active');
                    const status = this.insertModeBox.querySelector('#insert-mode-status');
                    if (status) status.textContent = 'On';
                }
                this.previewMesh.visible = true;
            }
        });

        // release spacebar to deactivate insert mode and go back to normal camera controls
        this.document.addEventListener('keyup', (event) => {
            if (event.key === ' ') {
                event.preventDefault();
                this.insertMode = false;
                unlockControls();
                if (this.insertModeBox) {
                    this.insertModeBox.classList.remove('insert-active');
                    const status = this.insertModeBox.querySelector('#insert-mode-status');
                    if (status) status.textContent = 'Off';
                }
                this.previewMesh.visible = false;
            }
        });

        // insertMode mouse controls: left click adds block, right click removes
        canvas.addEventListener('mousedown', (event: MouseEvent) => {
            if (!this.insertMode) return;

            if (event.button === 2 && selected) { // right click - remove
                event.preventDefault();
                this.removeTargetedBox(selected.id);
            } else if (event.button === 0) { // left click - add
                event.preventDefault();
                if (selected && selectedNormal) { // placement based on normal to face of box
                    const nx = Math.round(selectedNormal.x);
                    const ny = Math.round(selectedNormal.y);
                    const nz = Math.round(selectedNormal.z);
                    // z is inverted as always, so subtract nz
                    this.addBoxAtPosition(selected.x + nx, selected.y + ny, selected.z - nz);
                } else if (selected) { // old simple logic just in case
                    this.addBoxAtPosition(selected.x, selected.y + 1, selected.z);
                } else {
                    // no block hovered, so raycast against floor (getFloorPosition) to find corresponding grid position
                    const floorPos = this.getFloorPosition();
                    if (floorPos) {
                        this.addBoxAtPosition(floorPos.x, 0, floorPos.z);
                    }
                }
            }
            
            // force a raycast update so new box state is processed (without moving mouse)
            canvasOnPointer(event);
            this.updateGhostBox();
        });

        // keeps updating ghost box position in real time while user moves mouse
        canvas.addEventListener('pointermove', () => {
            this.updateGhostBox();
        });

        
        /* Disables button control via Enter and Spacebar to reduce confusion
        if users add and remove boxes via keyboard controls */
        this.document.querySelectorAll("button").forEach(button => {
            button.addEventListener("keydown", function (event) {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                }
            })
        });

        /* Removes 'focus' from buttons once clicked' */
        this.document.querySelectorAll("button").forEach(button => {
            button.addEventListener("click", function () {
                this.blur();
            })
        });
    }

    // updates the ghost box based on the current raycaster target (cursor position)
    updateGhostBox() {
        if (!this.insertMode) {
            this.previewMesh.visible = false;
            return;
        }

        if (selected && selectedNormal) { // using face normal logic for preview as well
            const nx = Math.round(selectedNormal.x);
            const ny = Math.round(selectedNormal.y);
            const nz = Math.round(selectedNormal.z);
            this.previewMesh.position.set(selected.x + nx, selected.y + ny, -(selected.z - nz));
            this.previewMesh.visible = true;
        } else if (selected) { // old simple logic just in case
            this.previewMesh.position.set(selected.x, selected.y + 1, -selected.z);
            this.previewMesh.visible = true;
        } else {
            // hovering floor: show preview at ground level
            const floorPos = this.getFloorPosition();
            if (floorPos) {
                this.previewMesh.position.set(floorPos.x, 0, -floorPos.z);
                this.previewMesh.visible = true;
            } else {
                this.previewMesh.visible = false;
            }
        }
    }

    // raycasts against the floor plane to find the grid position under the cursor
    // used by insertMode when no block is hovered i.e. the cursor is over the floor
    getFloorPosition(): { x: number, z: number } | null {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        // floor plane at y = -0.5 (half a unit below cube centers at y=0)
        const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.5);
        const intersection = new THREE.Vector3();

        if (raycaster.ray.intersectPlane(floorPlane, intersection)) {
            // z is negated because world z is the inverse of grid z
            return {
                x: Math.round(intersection.x),
                z: Math.round(-intersection.z)
            };
        }
        return null;
    }

    updateSelectedBox(cubeID: number) {
        const currentlySelectedBoxText = this.document.getElementById('currently-selected') as HTMLSpanElement;
        if (!Warehouse.current) {
            return;
        } else if (!cubeID) {
            this.currentlySelectedBox = 0;
            Warehouse.current.currentSelected = this.currentlySelectedBox;
            currentlySelectedBoxText.textContent = "None";
        } else {
            currentlySelectedBoxText.textContent = cubeID.toString();

            if (this.currentlySelectedBox) {
                Warehouse.current.setMixFactor(this.currentlySelectedBox, .0);
                Warehouse.current.setColour(this.currentlySelectedBox, [0, 0, 0]);
            }

            this.currentlySelectedBox = cubeID;
            Warehouse.current.currentSelected = this.currentlySelectedBox;
            Warehouse.current.setColour(cubeID, [.35, 0, .45]);
            Warehouse.current.setMixFactor(cubeID, .5);
        }
    }

    resetSelectedBox() {
        this.updateSelectedBox(0);
    }

    getNewID(ids: number[]) {
        const n = ids.length;
    
        for (let i = 0; i < n; i++) {
            while (ids[i] <= n && ids[ids[i] - 1] !== ids[i]) {
                const temp1 = ids[i];
                const temp2 = ids[ids[i] - 1];
                ids[ids[i] - 1] = temp1;
                ids[i] = temp2;
            }
        }
    
        for (let i = 0; i < n; i++) {
            if (ids[i] !== i + 1) {
                return i + 1;
            }
        }
    
        return n + 1;
    }

    confirmClearScene() {
        const overlay = this.document.getElementById('clear-confirm-overlay');
        if (overlay) overlay.style.display = 'flex';
    }

    clearScene() {
        for (const id of this.positions.keys()) {
            this.playgroundScene.removeCube(id);
        }

        this.layout.reset();

        this.positions.clear();
        this.playgroundScene.clear();
        this.playgroundScene = new Warehouse(this.dimensions.width, this.dimensions.height, this.dimensions.depth, this.boxType);
        Warehouse.current = this.playgroundScene;
        this.resetSelectedBox();
        resetSelect();
        this.resetState();
    }

    saveScene() {
        let scenario = Warehouse.current;
        if (!scenario) return;
        let jsonSceneData = sceneToJson(scenario);
        console.log(jsonSceneData);
    }

    loadScene() {
        let scenarioData: object | null = null;
        const uploadButton = this.document.getElementById('file-input') as HTMLInputElement;

        if (!uploadButton.files) return;
        const file = uploadButton.files[0]
        const reader = new FileReader();

        reader.onload = (event) => {
            scenarioData = JSON.parse(event.target?.result as string);
            const sceneData = scenarioData as WarehouseData;

            if (sceneData.type != this.boxType){
                this.showError("Type of scene does not match type of playground", 2000)
                return;
            }

            this.positions.clear();
            this.resetSelectedBox()
    
            this.layout.reset();
            Warehouse.current?.clear();

            Warehouse.current = new Warehouse(sceneData.sceneDimensions.width, sceneData.sceneDimensions.height, sceneData.sceneDimensions.depth, this.boxType);
            const scenario = Warehouse.current;
            for (let cubeData of sceneData.cubes) {
                const cube = new Cube(cubeData.id, cubeData.x, cubeData.y, cubeData.z, this.boxType, cubeData.legsDisplaced, cubeData.legsExtended);
                scenario.addCube(cube);
                this.positions.set(cube.id, cube.position);
                this.layout.addIDAt(cubeData.x, cubeData.y, cubeData.z, cubeData.id);
            }
    
            Warehouse.current = scenario;
            this.playgroundScene = Warehouse.current;

            // sync dimensions with the loaded scene
            const { width, height, depth } = sceneData.sceneDimensions;
            this.dimensions = { width, height, depth };
            setURLParams({ w: String(width), h: String(height), d: String(depth) });

            // update the dimension input fields
            const dimW = this.document.getElementById("dim-width") as HTMLInputElement;
            const dimH = this.document.getElementById("dim-height") as HTMLInputElement;
            const dimD = this.document.getElementById("dim-depth") as HTMLInputElement;
            if (dimW) dimW.value = String(width);
            if (dimH) dimH.value = String(height);
            if (dimD) dimD.value = String(depth);
        }
        
        reader.readAsText(file);
        uploadButton.value = "";
    }

    // any further keypresses need to be handled in implementations
    handleBasicKeypresses(event: KeyboardEvent) {        
        const target = event.target as HTMLElement;
        if (target.tagName.toLowerCase() === "input") {
            return;
        }

        switch (event.key) {
            case "ArrowUp":
                this.move(Direction.NORTH, this.currentlySelectedBox);
                break;
            case "ArrowRight":
                this.move(Direction.EAST, this.currentlySelectedBox);
                break;
            case "ArrowDown":
                this.move(Direction.SOUTH, this.currentlySelectedBox);
                break;
            case "ArrowLeft":
                this.move(Direction.WEST, this.currentlySelectedBox);
                break;
            case "Enter":
                if (event.shiftKey) {
                    this.removeBox();
                } else {
                    this.addBox();
                }
                break;
            case "F":
                if (event.shiftKey) {
                    this.toggleForkliftMode();
                }
                break;
            case "R":
                if (event.shiftKey) {
                    this.resetState()
                }
                break;
            case "C":
                if (event.shiftKey) {
                    this.confirmClearScene();
                }
                break;
            case "S":
                if (event.shiftKey) {
                    this.saveScene();
                }
                break;
            case "L":
                if (event.shiftKey) {
                    const loadButton = this.document.getElementById('file-input');
                    loadButton?.click();
                }
                break;
            case "T":
                if (event.shiftKey) {
                    if (this.boxType === BoxType.Type1) {
                        const type2Button = this.document.getElementById('change-type-2') as HTMLButtonElement;
                        type2Button.click();
                    } else {
                        const type1Button = this.document.getElementById('change-type-1') as HTMLButtonElement;
                        type1Button.click();
                    }
                }
                break;
            case "o":
                this.displaceOrWithdrawLegs();
                break;
            case "u":
                this.extendOrRetractLegs();
                break;
            case "c":
                const menu = this.document.getElementById('control-menu');
                if (!menu) return;
                const isMenuVisible = menu.style.display !== 'none';

                if (isMenuVisible) {
                    menu.style.display = 'none';
                } else {
                    menu.style.display = '';
                }
                break;
            case "i":
            case "Tab":
                event.preventDefault();
                const helpPanel = this.document.getElementById('help-panel');
                if (!helpPanel) return;
                const isHelpVisible = helpPanel.style.display === 'flex';

                if (isHelpVisible) {
                    helpPanel.style.display = 'none';
                } else {
                    helpPanel.style.display = 'flex';
                }
                break;
        }
    }

    private wizardRequirements: { id: number; x: number; y: number; z: number }[] = [];
    private wizardTargetCount: number = 0;
    private wizardCurrentIndex: number = 0;

    openScenarioWizard() {
        if (!this.positions.size) {
            this.showError("Add some boxes before creating a scenario", 1500);
            return;
        }

        // reset wizard state
        this.wizardRequirements = [];
        this.wizardCurrentIndex = 0;

        // show step 1, hide others
        const overlay = this.document.getElementById('scenario-wizard-overlay');
        const stepCount = this.document.getElementById('wizard-step-count');
        const stepBox = this.document.getElementById('wizard-step-box');
        const stepName = this.document.getElementById('wizard-step-name');
        if (stepCount) stepCount.style.display = '';
        if (stepBox) stepBox.style.display = 'none';
        if (stepName) stepName.style.display = 'none';

        // reset inputs
        const countInput = this.document.getElementById('wizard-target-count') as HTMLInputElement;
        if (countInput) countInput.value = '1';

        if (overlay) overlay.style.display = 'flex';
    }

    private closeWizard() {
        const overlay = this.document.getElementById('scenario-wizard-overlay');
        if (overlay) overlay.style.display = 'none';
    }

    private wizardShowBoxStep() {
        const stepCount = this.document.getElementById('wizard-step-count');
        const stepBox = this.document.getElementById('wizard-step-box');
        const stepName = this.document.getElementById('wizard-step-name');
        if (stepCount) stepCount.style.display = 'none';
        if (stepBox) stepBox.style.display = '';
        if (stepName) stepName.style.display = 'none';

        // update index/total labels
        const indexEl = this.document.getElementById('wizard-box-index');
        const totalEl = this.document.getElementById('wizard-box-total');
        if (indexEl) indexEl.textContent = String(this.wizardCurrentIndex + 1);
        if (totalEl) totalEl.textContent = String(this.wizardTargetCount);

        // pre fill if going back to an already-filled entry
        const existing = this.wizardRequirements[this.wizardCurrentIndex];
        const idInput = this.document.getElementById('wizard-box-id') as HTMLInputElement;
        const xInput = this.document.getElementById('wizard-target-x') as HTMLInputElement;
        const yInput = this.document.getElementById('wizard-target-y') as HTMLInputElement;
        const zInput = this.document.getElementById('wizard-target-z') as HTMLInputElement;
        const locationEl = this.document.getElementById('wizard-current-location');

        if (existing) {
            if (idInput) idInput.value = String(existing.id);
            if (xInput) xInput.value = String(existing.x);
            if (yInput) yInput.value = String(existing.y);
            if (zInput) zInput.value = String(existing.z);
            // show current location for that box
            const pos = this.positions.get(existing.id);
            if (locationEl && pos) {
                locationEl.textContent = `Current location: (${pos.x}, ${pos.y}, ${pos.z})`;
            }
        } else {
            if (idInput) idInput.value = '';
            if (xInput) xInput.value = '';
            if (yInput) yInput.value = '';
            if (zInput) zInput.value = '';
            if (locationEl) locationEl.textContent = '';
        }
    }

    private wizardShowNameStep() {
        const stepCount = this.document.getElementById('wizard-step-count');
        const stepBox = this.document.getElementById('wizard-step-box');
        const stepName = this.document.getElementById('wizard-step-name');
        if (stepCount) stepCount.style.display = 'none';
        if (stepBox) stepBox.style.display = 'none';
        if (stepName) stepName.style.display = '';

        // reset name input
        const nameInput = this.document.getElementById('wizard-scenario-name') as HTMLInputElement;
        if (nameInput) nameInput.value = '';

        // build summary
        const summaryEl = this.document.getElementById('wizard-summary');
        if (summaryEl) {
            summaryEl.innerHTML = `<p><b>${this.wizardRequirements.length} target${this.wizardRequirements.length > 1 ? 's' : ''}:</b></p>` +
                this.wizardRequirements.map(r => {
                    const pos = this.positions.get(r.id);
                    const from = pos ? `(${pos.x}, ${pos.y}, ${pos.z})` : '?';
                    return `<p>Box ${r.id}: ${from} → (${r.x}, ${r.y}, ${r.z})</p>`;
                }).join('');
        }
    }

    wireScenarioWizard() {
        const overlay = this.document.getElementById('scenario-wizard-overlay');

        // dismiss on backdrop click
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeWizard();
        });

        // cancel button
        this.document.getElementById('wizard-cancel')?.addEventListener('click', () => this.closeWizard());

        // step 1 -> step 2
        this.document.getElementById('wizard-next-count')?.addEventListener('click', () => {
            const countInput = this.document.getElementById('wizard-target-count') as HTMLInputElement;
            const count = Number(countInput?.value) || 0;
            if (count < 1) {
                this.showError("Enter at least 1 target box", 1000);
                return;
            }
            if (count > this.positions.size) {
                this.showError(`Only ${this.positions.size} boxes in scene`, 1000);
                return;
            }
            this.wizardTargetCount = count;
            this.wizardRequirements = [];
            this.wizardCurrentIndex = 0;
            this.wizardShowBoxStep();
        });

        // look up box ID
        this.document.getElementById('wizard-lookup-box')?.addEventListener('click', () => {
            const idInput = this.document.getElementById('wizard-box-id') as HTMLInputElement;
            const locationEl = this.document.getElementById('wizard-current-location');
            const id = Number(idInput?.value) || 0;
            const pos = this.positions.get(id);
            if (!pos) {
                if (locationEl) locationEl.textContent = 'Box not found in scene';
                return;
            }
            if (locationEl) locationEl.textContent = `Current location: (${pos.x}, ${pos.y}, ${pos.z})`;
        });

        // step 2 -> next box or step 3
        this.document.getElementById('wizard-next-box')?.addEventListener('click', () => {
            const idInput = this.document.getElementById('wizard-box-id') as HTMLInputElement;
            const xInput = this.document.getElementById('wizard-target-x') as HTMLInputElement;
            const yInput = this.document.getElementById('wizard-target-y') as HTMLInputElement;
            const zInput = this.document.getElementById('wizard-target-z') as HTMLInputElement;

            const id = Number(idInput?.value) || 0;
            const x = Number(xInput?.value);
            const y = Number(yInput?.value);
            const z = Number(zInput?.value);

            // validate box exists
            if (!this.positions.has(id)) {
                this.showError("Box ID not found in current scene", 1000);
                return;
            }

            // validate coordinates are filled
            if (isNaN(x) || isNaN(y) || isNaN(z)) {
                this.showError("Fill in all target coordinates", 1000);
                return;
            }

            // validate coordinates are within scene bounds
            if (x < 0 || x >= this.dimensions.width ||
                y < 0 || y >= this.dimensions.height ||
                z < 0 || z >= this.dimensions.depth) {
                this.showError(`Target must be within bounds (${this.dimensions.width}×${this.dimensions.height}×${this.dimensions.depth})`, 1500);
                return;
            }

            // check for duplicate box ID
            const duplicateIndex = this.wizardRequirements.findIndex(
                (r, i) => r.id === id && i !== this.wizardCurrentIndex
            );
            if (duplicateIndex >= 0) {
                this.showError(`Box ${id} is already a target (target ${duplicateIndex + 1})`, 1500);
                return;
            }

            // save this requirement
            this.wizardRequirements[this.wizardCurrentIndex] = { id, x, y, z };

            if (this.wizardCurrentIndex < this.wizardTargetCount - 1) {
                // next box
                this.wizardCurrentIndex++;
                this.wizardShowBoxStep();
            } else {
                // all done, go to name step
                this.wizardShowNameStep();
            }
        });

        // step 2 back
        this.document.getElementById('wizard-prev-box')?.addEventListener('click', () => {
            if (this.wizardCurrentIndex > 0) {
                this.wizardCurrentIndex--;
                this.wizardShowBoxStep();
            } else {
                // back to step 1
                const stepCount = this.document.getElementById('wizard-step-count');
                const stepBox = this.document.getElementById('wizard-step-box');
                if (stepCount) stepCount.style.display = '';
                if (stepBox) stepBox.style.display = 'none';
            }
        });

        // step 3 back
        this.document.getElementById('wizard-prev-name')?.addEventListener('click', () => {
            this.wizardCurrentIndex = this.wizardTargetCount - 1;
            this.wizardShowBoxStep();
        });

        // download
        this.document.getElementById('wizard-download')?.addEventListener('click', () => {
            const nameInput = this.document.getElementById('wizard-scenario-name') as HTMLInputElement;
            const name = nameInput?.value?.trim();
            if (!name) {
                this.showError("Enter a scenario name", 1000);
                return;
            }

            // build the start state from current box positions
            const start = Array.from(this.positions.entries()).map(([id, pos]) => ({
                id, x: pos.x, y: pos.y, z: pos.z
            }));

            const scenario = {
                name,
                width: this.dimensions.width,
                height: this.dimensions.height,
                depth: this.dimensions.depth,
                start,
                requirements: this.wizardRequirements,
                box_type: this.boxType
            };

            const data = JSON.stringify(scenario, null, 2);
            const downloadName = name + '.json';
            const link = this.document.createElement('a');
            link.href = URL.createObjectURL(new File([data], downloadName));
            link.download = downloadName;
            link.click();

            this.closeWizard();
            this.showError('Scenario downloaded: ' + name, 2000);
        });
    }

    resetState() {
        this.scenarioState.startState = null;
        this.scenarioState.endState = null;
        this.scenarioState.scenarioID = null;
    }

    toggleForkliftMode() {
        const forkliftModeText = this.document.getElementById('forklift-mode') as HTMLSpanElement;
        this.forkliftMode = !this.forkliftMode;
        if (forkliftModeText.textContent == "On") {
            forkliftModeText.textContent = "Off";
        } else {
            forkliftModeText.textContent = "On";
        }
    }

    showError(errorMessage: string, delayDuration: number = 1000) {
        const popUpError = document.getElementById('pop-up-error') as HTMLElement;

        // clear all previously set timeouts to make sure error message is shown for correct amount of time
        for (let timeout of this.errorMsgTimeouts){
            clearTimeout(timeout);
        }
        
        popUpError.textContent = errorMessage;
        popUpError.style.display = "block";

        let timeout = setTimeout(() => {
            popUpError.style.display = "none";
            popUpError.textContent = "";
        }, delayDuration);
        this.errorMsgTimeouts.push(timeout);
    }

}
