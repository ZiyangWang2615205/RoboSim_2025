import * as THREE from 'three';
import Warehouse from './warehouse';
import { BoxType } from "../../../server/src/types/index.ts";


const startMaterial = new THREE.MeshStandardMaterial({
                    color: 0xff0000, // red
                    transparent: true,
                    opacity: 0.1,
                    depthWrite: false,  // prevent deep write cache
                    depthTest: true 
                });

const endMaterial = new THREE.MeshStandardMaterial({
                    color: 0x00ff00, //green
                    transparent: true,
                    opacity: 0.25,
                    depthWrite: false,  // prevent deep write cache
                    depthTest: true 
                });
                

const exitMaterial = new THREE.MeshStandardMaterial({
                    color:0x0000ff, //blue
                    transparent: true,
                    opacity: 0.25,
                    depthWrite: false,
                    depthTest: true
})

//const geometry = new THREE.BoxGeometry(1.01, 1.01, 1.01); old code
//const edgesGeometry = new THREE.EdgesGeometry(geometry);

const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x00fff7 });

export class StartEndCubes {
    
    public startInstanceMesh: THREE.InstancedMesh | null;
    public endInstanceMesh: THREE.InstancedMesh | null;
    public startEdgeLines: THREE.Group | null;
    public endEdgeLines: THREE.Group | null;
    public exitInstanceMesh: THREE.Mesh | null;
    public exitEdgeLines: THREE.Group | null;

    constructor(scenario: Warehouse) {
        this.startInstanceMesh = null;
        this.endInstanceMesh = null;
        this.exitInstanceMesh = null;
        this.startEdgeLines = new THREE.Group();
        this.endEdgeLines = new THREE.Group();
        this.exitEdgeLines = new THREE.Group();
    }

    private getMarkerGeometry() {
        const isType2 = Warehouse.current?.boxType === BoxType.Type2;

        // Type1 - 0.01 size bigger than box
        if (!isType2) {
            return new THREE.BoxGeometry(1.01, 1.01, 1.01);
        }

        // Type2 - 0.01 size bigger than box 
        return new THREE.BoxGeometry(0.86, 1.01, 0.86);
    }

    private getMarkerEdgesGeometry() {
        return new THREE.EdgesGeometry(this.getMarkerGeometry());
    }

    setStartCubes(positions: {x: number, y: number, z: number}[]) {
        if (this.startInstanceMesh) {
            console.log("Already have start state");
            return;
        }

        const count = positions.length;
        const geometry = this.getMarkerGeometry();
        const edgesGeometry = this.getMarkerEdgesGeometry();
        if (count < 1) return;

        this.startInstanceMesh = new THREE.InstancedMesh(
            geometry,
            startMaterial,
            count
        );
        this.startInstanceMesh.renderOrder = 4; // set large render order to make sure it is rendered
        // this.startInstanceMesh.raycast = () => {};
        this.startEdgeLines = new THREE.Group();
        this.startEdgeLines.renderOrder = 4;
        // this.startEdgeLines.raycast = () => {};

        const matrix = new THREE.Matrix4();
        // set position matrix
        for (let i = 0; i < count; i++) {
            matrix.setPosition(positions[i].x, positions[i].y, -positions[i].z);
            this.startInstanceMesh.setMatrixAt(i, matrix);
            const lines = new THREE.LineSegments(edgesGeometry, edgeMaterial);
            lines.position.set(positions[i].x, positions[i].y, -positions[i].z);
            this.startEdgeLines.add(lines);
        }
        this.startInstanceMesh.instanceMatrix.needsUpdate = true;
        Warehouse.current?.scene.add(this.startInstanceMesh);
        Warehouse.current?.scene.add(this.startEdgeLines);
    }

    setendCubes(positions: {x: number, y: number, z: number}[]) {
        if (this.endInstanceMesh) {
            console.log("Already have end state");
            return;
        }

        const count = positions.length;
        const geometry = this.getMarkerGeometry();
        const edgesGeometry = this.getMarkerEdgesGeometry();
        if (count < 1) return;

        this.endInstanceMesh = new THREE.InstancedMesh(
            geometry,
            endMaterial,
            count
        );
        this.endInstanceMesh.renderOrder = 4; // set large render order to make sure it is rendered
        // this.endInstanceMesh.raycast = () => {};
        this.endEdgeLines = new THREE.Group();
        this.endEdgeLines.renderOrder = 4;
        // this.endEdgeLines.raycast = () => {};

        const matrix = new THREE.Matrix4();
        // set position matrix
        for (let i = 0; i < count; i++) {
            matrix.setPosition(positions[i].x, positions[i].y, -positions[i].z);
            this.endInstanceMesh.setMatrixAt(i, matrix);
            const lines = new THREE.LineSegments(edgesGeometry, edgeMaterial);
            lines.position.set(positions[i].x, positions[i].y, -positions[i].z);
            this.endEdgeLines.add(lines);
        }
        this.endInstanceMesh.instanceMatrix.needsUpdate = true;
        Warehouse.current?.scene.add(this.endInstanceMesh);
        Warehouse.current?.scene.add(this.endEdgeLines);
    }

    setExitCubes(corner1: {x1: number, y1: number, z1: number}, corner2: {x2: number, y2: number, z2: number}) {
        //end function if exit zone already created
        if (this.exitInstanceMesh) {
            console.log("Already have exit zone");
            return
        }

        // End function if either corner is null
        if (corner1 == null || corner2 == null ){
            console.log("Missing corner!");
            return
        }

        // Calculate dimensions
        const width = Math.abs(corner1.x1-corner2.x2);
        const height = Math.abs(corner1.y1 - corner2.y2);
        const depth = Math.abs(corner1.z1-corner2.z2);
        const geometry = this.getMarkerGeometry();
        const edgesGeometry = this.getMarkerEdgesGeometry();

        //Create mesh for the zone
        const exitMesh = new THREE.Mesh(geometry, exitMaterial);

        //Scale the mesh to the size of the zone
        exitMesh.scale.set(width, height, depth);
        exitMesh.geometry.center();

        //Set the location of the mesh to the centre of the zone 
        exitMesh.position.set(
            (corner1.x1 + corner2.x2) / 2 - 0.5,
            (corner1.y1 + corner2.y2) / 2 - 0.5,
            -((corner1.z1 + corner2.z2) / 2 - 0.5));
        
        this.exitInstanceMesh=exitMesh;

        // Set large render order to make sure it's rendered
        this.exitInstanceMesh.renderOrder = 4;

        //Create lines for the zone
        const lines = new THREE.LineSegments(edgesGeometry, edgeMaterial);
        this.exitEdgeLines = new THREE.Group();

        // Set large render order to make sure it's rendered
        this.exitEdgeLines.renderOrder = 4; 

        //Scale the lines to the size of the zone
        lines.scale.set(width, height, depth);
        lines.geometry.center();
        //Set lines to the centre of the zone
        lines.position.set(
            (corner1.x1 + corner2.x2)/2 - 0.5,
            (corner1.y1 + corner2.y2)/2 - 0.5,
            -((corner1.z1 + corner2.z2)/2 - 0.5)
        );
        
        this.exitEdgeLines.add(lines);

        //Add mesh and lines to scene
        Warehouse.current?.scene.add(this.exitInstanceMesh);
        Warehouse.current?.scene.add(this.exitEdgeLines);
    }

    removeStartCubes() {
        if (this.startInstanceMesh && this.startEdgeLines) {
            Warehouse.current?.scene.remove(this.startInstanceMesh);
            Warehouse.current?.scene.remove(this.startEdgeLines);

            this.startInstanceMesh.geometry.dispose();
            (this.startInstanceMesh.material as THREE.Material).dispose();
            this.startEdgeLines.children.forEach(child => {
                const line = child as THREE.LineSegments;
                line.geometry.dispose();
                (line.material as THREE.Material).dispose();
            });

            this.startInstanceMesh = null;
            this.startEdgeLines = null;
        }
    }

    removeEndCubes() {
        if (this.endInstanceMesh && this.endEdgeLines) {
            Warehouse.current?.scene.remove(this.endInstanceMesh);
            Warehouse.current?.scene.remove(this.endEdgeLines);

            this.endInstanceMesh.geometry.dispose();
            (this.endInstanceMesh.material as THREE.Material).dispose();
            this.endEdgeLines.children.forEach(child => {
                const line = child as THREE.LineSegments;
                line.geometry.dispose();
                (line.material as THREE.Material).dispose();
            });

            this.endInstanceMesh = null;
            this.endEdgeLines = null;
        }
    }

    removeExitCubes() {
        //Deleting zone mesh
        if (this.exitInstanceMesh && this.exitEdgeLines) {
        Warehouse.current?.scene.remove(this.exitInstanceMesh);
        Warehouse.current?.scene.remove(this.exitEdgeLines);

        this.exitInstanceMesh.geometry.dispose();
        (this.exitInstanceMesh.material as THREE.Material).dispose();

        //Deleting lines
        this.exitEdgeLines.children.forEach(child => {
            const line = child as THREE.LineSegments;
            line.geometry.dispose();
            (line.material as THREE.Material).dispose();
        });

        this.exitInstanceMesh = null;
        this.exitEdgeLines = null;
        }
    }
}
