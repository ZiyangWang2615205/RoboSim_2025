import {Playground, Direction, Position} from "./playground"
import Warehouse from "../model/warehouse";
import { Cube } from "../model/cube";
import { BoxType } from "../../../server/src/types";
import { resetSelect } from "../ui/select";
import { camera } from "../ui/render";

import * as THREE from "three";

export class Type1Playground extends Playground {

    constructor(document: Document){
        super(BoxType.Type1, document);
    }

    move(dir: Direction, id: number) {

        if (!this.currentlySelectedBox) {
            this.showError("Cannot move a box when no box is selected", 1000);
            return;
        }

        let position = this.positions.get(id) as Position;
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
                // do nothing
                targetPosition = position;
                break;
            case Direction.DOWN:
                // do nothing
                targetPosition = position;
                break;
        }

        if (!this.validateMove(targetPosition)) return;

        const targetStackHeight = this.layout.getHighestY(targetPosition.x, targetPosition.z) + 1;

        if (this.forkliftMode && position.y === 0) {
            let dx = targetPosition.x - position.x;
            let dz = targetPosition.z - position.z;
            let dy = targetStackHeight == position.y + 1 ? 1 : 0;

            for (const id of this.layout.getIDsAt2DCoord(position.x, position.z)) {
                const currPosition = this.positions.get(id) as Position;
                const newPosition = { x: currPosition.x + dx, y: currPosition.y + dy, z: currPosition.z + dz };
                let cube = this.playgroundScene.getCube(id) as Cube;
                cube.position = newPosition;
                this.positions.set(id, newPosition);
                this.layout.addIDAt(newPosition.x, newPosition.y, newPosition.z, id);
            }

            this.layout.removeAll(position.x, position.z);

        } else {
            let cube = this.playgroundScene.getCube(id) as Cube;
            cube.position = {
                x: targetPosition.x,
                y: targetStackHeight,
                z: targetPosition.z
            };

            this.positions.set(id, cube.position);

            this.layout.addIDAt(targetPosition.x, targetStackHeight, targetPosition.z, id);
            this.layout.removeIDAt(position.x, position.y, position.z);
        }
    }

    validateMove(targetPosition: { x: number; y: number; z: number }): Boolean {
        const position = this.positions.get(this.currentlySelectedBox);
        if (!position) return false;

        const currentStackHeight = this.layout.getHighestY(position.x, position.z) + 1;
        const targetStackHeight = this.layout.getHighestY(targetPosition.x, targetPosition.z) + 1;

        if (this.forkliftMode) {
            if (!(
                position.y == currentStackHeight - 1 ||
                position.y == 0
            )) {
                this.showError("Cannot move a non-grounded box that has boxes on top of it when in Forklift Mode", 1500);
                return false;
            }

        } else {
            if (position.y != currentStackHeight - 1) {
                this.showError("Cannot move a box that has boxes on top of it when not in Forklift Mode", 1500);
                return false;
            }
        }

        if (targetPosition.x < 0 || targetPosition.x >= this.dimensions.width) {
            this.showError("Cannot move the selected box - box is at the end of the warehouse space", 1000);
            return false;
        }

        if (targetPosition.z < 0 || targetPosition.z >= this.dimensions.depth) {
            this.showError("Cannot move the selected box - box is at the end of the warehouse space", 1000);
            return false;
        }

        if (!(
            targetStackHeight == position.y + 1 ||      // Goes up one
            targetStackHeight == position.y ||  // Goes across
            targetStackHeight == position.y - 1     // Goes down one
        )) {
            this.showError("Cannot move the selected box - destination is too far vertically from current location", 1500);
            return false;
        }

        if (this.forkliftMode && position.y === 0){
            if (currentStackHeight === this.dimensions.height && targetStackHeight === 1) { // attempt to forklift a stack of max height onto a box
                this.showError("Cannot move the selected box - new stack would be taller than the warehouse height", 1500);
                return false;
            }
        } else {
            if (targetStackHeight >= this.dimensions.height) { // attempt to move a single box onto a stack of max height
                this.showError("Cannot move the selected box - new stack would be taller than the warehouse height", 1500);
                return false;
            }
        }

        return true;
    }

    addBox() {
        const warehouseSpace = this.playgroundScene.width * this.playgroundScene.height * this.playgroundScene.depth;
        if (this.positions.size === warehouseSpace) {
            this.showError("Cannot add a new box - warehouse is full", 1000);
            return;
        }

        const originStackHeight = this.layout.getHighestY(0, 0) + 1;
        if (originStackHeight >= this.dimensions.height) {
            this.showError("Cannot add a new box - stack height limit reached", 1000);
            return;
        }

        const newID = this.getNewID([...this.positions.keys()]);

        let scenario = Warehouse.current;
        const result = scenario?.addCube(new Cube(newID, 0, originStackHeight, 0, this.boxType));
        if (!result) {
            return;
        }

        this.updateSelectedBox(newID);

        this.positions.set(this.currentlySelectedBox, { x: 0, y: originStackHeight, z: 0 });
        this.layout.addIDAt(0, originStackHeight, 0, newID);
    }

    removeBox() {
        let scenario = Warehouse.current;
        if (this.currentlySelectedBox === 0) {
            this.showError("Cannot remove a box when no box is selected", 1000);
            return;
        }
        let pos = this.positions.get(this.currentlySelectedBox) as Position;
        if (!pos) return;

        if (pos.y !== this.layout.getHighestY(pos.x, pos.z)) {
            this.showError("Cannot remove a box with boxes on top of it", 1000);
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

    // insertMode: adds a new box at a specific position 
    addBoxAtPosition(x: number, y: number, z: number) {
        // prevent placing outside warehouse space by checking bounds
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

        // prevent removing a box if there is a box directly above it
        if (this.layout.getIDAt3DCoord(pos.x, pos.y + 1, pos.z)) {
            this.showError("Cannot remove a box that has another box on top of it", 1000);
            return;
        }

        this.positions.delete(id);
        this.layout.removeIDAt(pos.x, pos.y, pos.z);
        scenario?.removeCube(id);
        resetSelect();

        // if the removed box was the one selected, set to None
        if (this.currentlySelectedBox === id) {
            this.updateSelectedBox(0);
        }
    }

    displaceOrWithdrawLegs() {
        this.showError("Function unavailable for Type 1 boxes", 1000);
    }

    extendOrRetractLegs() {
        this.showError("Function unavailable for Type 1 boxes", 1000);
    }
}