import {Playground, Direction, Position} from "./playground"
import { BoxType } from "../../../server/src/types";
import { LegActionType } from "../../../server/src/types";
import Warehouse from "../model/warehouse";
import { Cube } from "../model/cube";
import { resetSelect } from "../ui/select";
import { camera } from "../ui/render";

import * as THREE from "three";


export class Type2Playground extends Playground {

    constructor(document: Document){
        super(BoxType.Type2, document);
    }

    displaceOrWithdrawLegs() {
        let cube = this.playgroundScene.getCube(this.currentlySelectedBox);
        if (!cube) {
            this.showError("Cannot perform leg action when no box is selected", 1000);
            return;
        }

        if (cube.legsDisplaced){
            if (!this.validateLegAction(LegActionType.Withdraw)) return;
            cube.legsDisplaced = false;
        }
        else if (!cube.legsDisplaced){
            if (!this.validateLegAction(LegActionType.Displace)) return;
            cube.legsDisplaced = true;
        }

    }

    extendOrRetractLegs() {
        const cube = this.playgroundScene.getCube(this.currentlySelectedBox);
        if (!cube) {
            this.showError("Cannot perform leg action when no box is selected", 1000);
            return;
        }

        if (cube.legsExtended) {
            this.retractLegs();
        } else {
            this.extendLegs();
        }
    }

    extendLegs() {
        const cube = this.playgroundScene.getCube(this.currentlySelectedBox) as Cube;

        if (!this.validateLegAction(LegActionType.Extend)) return;

        const idBelow = this.layout.getIDAt3DCoord(cube.x, cube.y - 1, cube.z);
        const cubeBelow = idBelow ? this.playgroundScene.getCube(idBelow) as Cube : null;

        // if this cube has y == 0 or the cube beneath has its legs displaced
        if (cube.y === 0 || (cubeBelow && cubeBelow.legsDisplaced)) {
            // find all the cubes above this one with same x and z coords (and this one as well)
            const cubesAboveOrEqual = this.layout.getIDsAtOrAbove(cube.x, cube.y, cube.z, true).map((id) => { return this.playgroundScene.getCube(id) as Cube });

            // show error if max stack height has been reached
            if (this.layout.getHighestY(cube.x, cube.z) === this.playgroundScene.height - 1) {
                this.showError("Cannot extend box legs as stack has reached max height", 1500);
                return;
            }

            this.layout.extendFrom(cube.x, cube.y, cube.z);

            // move each cube above this one (and this one as well) up by one
            for (const c of cubesAboveOrEqual) {
                this.move(Direction.UP, c.id)
            }
            cube.moving = true;
        } else {
            // otherwise cube beneath does not have legs displaced
            // so legs for this cube will descend to surround the cube below
            // but we do not need to move any cubes
            cube.moving = false;
        }
        // setting this animates the legs
        cube.legsExtended = true;
    }

    retractLegs() {
        const cube = this.playgroundScene.getCube(this.currentlySelectedBox) as Cube;

        if (!this.validateLegAction(LegActionType.Retract)) return;

        const idBelow = this.layout.getIDAt3DCoord(cube.x, cube.y - 1, cube.z);
        const cubeBelowExists = idBelow ? true : false;

        if (cubeBelowExists) {
            //if there is a cube directly below, we need to move legs up
            //but we do not need to move any cubes
            cube.moving = false;
        } else {
            // find all the cubes above this one with same x and z coords (and this one as well)
            const cubesAboveOrEqual = this.layout.getIDsAtOrAbove(cube.x, cube.y, cube.z, false).map((id) => { return this.playgroundScene.getCube(id) as Cube });

            this.layout.retractFrom(cube.x, cube.y, cube.z);

            // move each cube above this one (and this one as well) down by one
            for (const c of cubesAboveOrEqual) {
                // ensures that legs do not move up as cube moves down if legs are extended
                c.moving = false
                this.move(Direction.DOWN, c.id)
            }
            cube.moving = true;
        }
        // setting this animates the legs
        cube.legsExtended = false;
    }

    move(dir: Direction, id: number) {
        if (!this.currentlySelectedBox) {
            this.showError("Cannot move a box when no box is selected", 1000);
            return;
        }

        const position = this.positions.get(id) as Position;
        let targetPosition: Position;

        let forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.z *= -1;

        let right = new THREE.Vector3();
        right.crossVectors(camera.up, forward);

        switch (dir) {
            case Direction.NORTH:
                if (Math.abs(forward.x) > Math.abs(forward.z)) {
                    targetPosition = { x: position.x + (forward.x > 0 ? 1 : -1), y: position.y, z: position.z };
                } else {
                    targetPosition = { x: position.x, y: position.y, z: position.z + (forward.z > 0 ? 1 : -1) };
                }
                break;
            case Direction.EAST:
                if (Math.abs(right.x) > Math.abs(right.z)) {
                    targetPosition = { x: position.x + (right.x > 0 ? 1 : -1), y: position.y, z: position.z };
                } else {
                    targetPosition = { x: position.x, y: position.y, z: position.z + (right.z > 0 ? 1 : -1) };
                }
                break;
            case Direction.SOUTH:
                if (Math.abs(forward.x) > Math.abs(forward.z)) {
                    targetPosition = { x: position.x + (forward.x > 0 ? -1 : 1), y: position.y, z: position.z };
                } else {
                    targetPosition = { x: position.x, y: position.y, z: position.z + (forward.z > 0 ? -1 : 1) };
                }
                break;
            case Direction.WEST:
                if (Math.abs(right.x) > Math.abs(right.z)) {
                    targetPosition = { x: position.x + (right.x > 0 ? -1 : 1), y: position.y, z: position.z };
                } else {
                    targetPosition = { x: position.x, y: position.y, z: position.z + (right.z > 0 ? -1 : 1) };
                }
                break;
            case Direction.UP:
                targetPosition = { x: position.x, y: position.y + 1, z: position.z };
                break;
            case Direction.DOWN:
                targetPosition = { x: position.x, y: position.y - 1, z: position.z };
                break; 
        }

        if (!this.validateMove(targetPosition)) return;

        const cube = this.playgroundScene.getCube(id) as Cube;

        cube.position = {
            x: targetPosition.x,
            y: targetPosition.y,
            z: targetPosition.z
        };

        this.positions.set(id, cube.position);

        this.layout.addIDAt(targetPosition.x, targetPosition.y, targetPosition.z, id);
        this.layout.removeIDAt(position.x, position.y, position.z);
    }

    validateMove(targetPosition: { x: number; y: number; z: number }): boolean {
        const cube = this.playgroundScene.getCube(this.currentlySelectedBox) as Cube;

        const targetIDBelow = this.layout.getIDAt3DCoord(targetPosition.x, targetPosition.y - 1, targetPosition.z);
        const targetCubeBelowExists = targetIDBelow ? true : false;

        const targetID = this.layout.getIDAt3DCoord(targetPosition.x, targetPosition.y, targetPosition.z);
        const targetCubeExists = targetID ? true : false;

        const idAbove = this.layout.getIDAt3DCoord(cube.x, cube.y + 1, cube.z);
        const cubeAbove = idAbove ? this.playgroundScene.getCube(idAbove) as Cube : null;
    
        const idBelow = this.layout.getIDAt3DCoord(cube.x, cube.y - 1, cube.z);
        const cubeBelow = idBelow ? this.playgroundScene.getCube(idBelow) as Cube : null;

        if (targetPosition.x < 0 || targetPosition.x >= this.dimensions.width) {
            this.showError("Cannot move the selected box - box is at the end of the warehouse space", 1000);
            return false;
        }

        if (targetPosition.z < 0 || targetPosition.z >= this.dimensions.depth) {
            this.showError("Cannot move the selected box - box is at the end of the warehouse space", 1000);
            return false;
        }
        if (targetPosition.y < 0 || targetPosition.y >= this.dimensions.height) {
            this.showError("Cannot move the selected box - stack height limit reached", 1000);
            return false;
        }

        // only need to validate x and z moves
        if (cube.x != targetPosition.x || cube.z != targetPosition.z) {
            if (cube.legsDisplaced) {
                this.showError("Cannot move when legs are displaced", 1500)
                return false;
            }
            if (targetCubeExists) {
                this.showError("Cannot move into another box", 1500)
                return false;
            }
            if (!targetCubeBelowExists && cube.y > 0) {
                this.showError("Cannot move into empty space", 1500)
                return false;
            }
            if (cubeAbove && !cubeAbove.legsExtended) {
                this.showError("Cannot move the selected box if the box above doesn't have its legs extended", 1500)
                return false;
            }
            if (cubeAbove && cubeBelow && !cubeBelow.legsDisplaced) {
                this.showError("Cannot move the selected box if the box above has its legs extended and the box below has its legs retracted", 2000)
                return false;
            }
        }

        return true;
    }

    validateLegAction(action: LegActionType): boolean {
        const cube = this.playgroundScene.getCube(this.currentlySelectedBox) as Cube;

        const idAbove = this.layout.getIDAt3DCoord(cube.x, cube.y + 1, cube.z);
        const cubeAbove = idAbove ? this.playgroundScene.getCube(idAbove) as Cube : null;

        const id2Above = this.layout.getIDAt3DCoord(cube.x, cube.y + 2, cube.z);
        const cube2Above = id2Above ? this.playgroundScene.getCube(id2Above) as Cube : null;

        switch (action) {
            case LegActionType.Displace:
                if (cubeAbove?.legsExtended) {
                    this.showError("Cannot displace legs if the box above has its legs extended downwards", 1500)
                    return false;
                }
                break;
            case LegActionType.Withdraw:
                // cannot withdraw legs if they are extended
                if (cube.legsExtended) {
                    this.showError("Cannot withdraw legs if they are extended", 1000)
                    return false;
                }
                if (!cubeAbove && cube2Above?.legsExtended) {
                    this.showError("Cannot withdraw legs if the box 2 places above has its legs extended", 1500)
                    return false;
                }
                break;
            case LegActionType.Extend:
                if (!cube.legsDisplaced){
                    this.showError("Legs must be displaced before they can be extended", 1000)
                    return false;
                }
                break;
            case LegActionType.Retract:
                // cannot retract legs if they are not displaced
                if (!cube.legsDisplaced) {
                    this.showError("Legs must be displaced before they can be retracted", 1000)
                    return false;
                }
        }
        return true;
    }

    // overloaded as need to change leg colour as well as box colour
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
                const cube = this.playgroundScene.getCube(this.currentlySelectedBox)

                Warehouse.current.setMixFactor(this.currentlySelectedBox, .0);
                Warehouse.current.setColour(this.currentlySelectedBox, [0, 0, 0]);
                cube?.setLegColor({r: 0, g: 0, b: 0});

            }

            this.currentlySelectedBox = cubeID;
            const cube = this.playgroundScene.getCube(this.currentlySelectedBox)

            Warehouse.current.currentSelected = this.currentlySelectedBox;
            Warehouse.current.setColour(cubeID, [.35, 0, .45]);
            Warehouse.current.setMixFactor(cubeID, .5);
            cube?.setLegColor({r: 0.11, g: 0, b: 0.19});
        }
    }

    addBox() {
        const warehouseSpace = this.playgroundScene.width * this.playgroundScene.height * this.playgroundScene.depth;
        if (this.positions.size === warehouseSpace) {
            this.showError("Cannot add a new box - warehouse is full", 1000);
            return;
        }

        let height = this.layout.getHighestY(0, 0) + 1;

        if (height >= this.dimensions.height) {
            this.showError("Cannot add a new box - height limit reached", 1000);
            return;
        }

        const newID = this.getNewID([...this.positions.keys()]);

        let scenario = Warehouse.current;
        const result = scenario?.addCube(new Cube(newID, 0, height, 0, this.boxType));
        if (!result) {
            return;
        }

        this.updateSelectedBox(newID);

        this.positions.set(this.currentlySelectedBox, { x: 0, y: height, z: 0 });
        this.layout.addIDAt(0, height, 0, newID);
    }

    removeBox() {
        if (this.currentlySelectedBox === 0){
            this.showError("Cannot remove a box when no box is selected", 1000);
            return;
        }

        let scenario = Warehouse.current;
        let pos = this.positions.get(this.currentlySelectedBox) as Position;

        const id2Above = this.layout.getIDAt3DCoord(pos.x, pos.y + 2, pos.z);
        const cube2Above = id2Above ? this.playgroundScene.getCube(id2Above) as Cube : null;

        const idAbove = this.layout.getIDAt3DCoord(pos.x, pos.y + 1, pos.z);
        const cubeAbove = idAbove ? this.playgroundScene.getCube(idAbove) as Cube : null;

        const idBelow = this.layout.getIDAt3DCoord(pos.x, pos.y - 1, pos.z);
        const cubeBelow = idBelow ? this.playgroundScene.getCube(idBelow) as Cube : null;
     
        if (cubeAbove && !cubeAbove.legsExtended){ 
            this.showError("Cannot remove a box if there is a box above without its legs extended", 1500)
            return;
        }
        if (cube2Above && cube2Above.legsExtended){
            this.showError("Cannot remove a box if there is a box 2 places above with its legs extended", 1500)
            return;
        } 
        if (cubeAbove && cubeBelow && !cubeBelow.legsDisplaced){
            this.showError("Cannot remove a box if the box above has its legs extended and the box below has its legs retracted", 2000)
            return;
        }

        const previouslySelectedBox: number = this.currentlySelectedBox;

        this.positions.delete(this.currentlySelectedBox);

        const newHighestID = this.layout.removeIDAt(pos.x, pos.y, pos.z);
        if (newHighestID) {
            this.updateSelectedBox(newHighestID);
        } else {
            this.resetSelectedBox();
        }

        scenario?.removeCube(previouslySelectedBox);
        resetSelect();
    }

    toggleForkliftMode() {
        this.showError("Function unavailable for Type 2 boxes", 1000);
    }

    // insertMode: adds a new box at a specific position 
    addBoxAtPosition(x: number, y: number, z: number) {
        // prevent placing outside warehouse space
        if (x < 0 || x >= this.dimensions.width ||
            y < 0 || y >= this.dimensions.height ||
            z < 0 || z >= this.dimensions.depth) {
            this.showError("Cannot add a new box - position is outside of the warehouse space", 1000);
            return;
        }

        // prevent placing where a box already exists
        if (this.layout.getIDAt3DCoord(x, y, z)) {
            this.showError("Cannot add a new box - position is already occupied", 1000);
            return;
        }

        // prevent floating boxes
        if (y > 0 && !this.layout.getIDAt3DCoord(x, y - 1, z)) {
            this.showError("Cannot add a new box - boxes can only be placed on the ground or on top of other boxes", 1000);
            return;
        }

        const newID = this.getNewID([...this.positions.keys()]);

        let scenario = Warehouse.current;
        const result = scenario?.addCube(new Cube(newID, x, y, z, this.boxType));
        if (!result) return;

        this.positions.set(newID, { x, y, z });
        this.layout.addIDAt(x, y, z, newID);
        this.updateSelectedBox(newID);
    }

    // insertMode: removes the targeted box
    removeTargetedBox(id: number) {
        let scenario = Warehouse.current;
        let pos = this.positions.get(id);
        if (!pos) return;

        const idAbove = this.layout.getIDAt3DCoord(pos.x, pos.y + 1, pos.z);
        const cubeAbove = idAbove ? this.playgroundScene.getCube(idAbove) as Cube : null;

        const id2Above = this.layout.getIDAt3DCoord(pos.x, pos.y + 2, pos.z);
        const cube2Above = id2Above ? this.playgroundScene.getCube(id2Above) as Cube : null;

        const idBelow = this.layout.getIDAt3DCoord(pos.x, pos.y - 1, pos.z);
        const cubeBelow = idBelow ? this.playgroundScene.getCube(idBelow) as Cube : null;

        // can't remove if box above isn't using its legs to support itself
        if (cubeAbove && !cubeAbove.legsExtended) {
            this.showError("Cannot remove a box if there is a box above without its legs extended", 1500);
            return;
        }
        // can't remove if box 2 above has legs reaching down through the space above
        if (cube2Above && cube2Above.legsExtended) {
            this.showError("Cannot remove a box if there is a box 2 places above with its legs extended", 1500);
            return;
        }
        // can't remove if it would leave the box above's legs with nothing to grip
        if (cubeAbove && cubeBelow && !cubeBelow.legsDisplaced) {
            this.showError("Cannot remove a box if the box above has its legs extended and the box below has its legs retracted", 2000);
            return;
        }

        this.positions.delete(id);
        this.layout.removeIDAt(pos.x, pos.y, pos.z);
        scenario?.removeCube(id);
        resetSelect();

        if (this.currentlySelectedBox === id) {
            this.updateSelectedBox(0);
        }
    }
}