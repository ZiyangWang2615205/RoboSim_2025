import * as THREE from "three";
import { BoxType } from "../../../server/src/types";

import Warehouse from "./warehouse";

export class Cube {
    protected _id: number;
    protected _x!: number;
    protected _y!: number;
    protected _z!: number;
    protected _name: string = "";
    protected _type: BoxType;
    protected _legs_displaced: boolean;
    protected _legs_extended: boolean;

    // used to differentiate during leg extension between when
    // the cube is moving and when the legs are moving (and the cube isn't)
    protected _moving: boolean;

    // The cube's mesh
    protected _additionalMesh: THREE.Mesh;

    // The material for the additional mesh
    public material: THREE.MeshStandardMaterial;

    constructor(
        id: number,
        x: number,
        y: number,
        z: number,
        type: BoxType,
        legs_displaced: boolean = false,
        legs_extended: boolean = false,
        isMainPage: boolean = false,
    ) {
        const numberedTexture = this.createNumberedTexture(id.toString());
        this.material = new THREE.MeshStandardMaterial({
            map: numberedTexture,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
            transparent: true,
            // depthTest: true,
            // depthWrite: false  // prevent overlap cache (important !!!)
        });

        this._id = id;
        this.x = x;
        this.y = y;
        this.z = z;
        this._type = type;
        this._legs_displaced = legs_displaced;
        this._legs_extended = legs_extended;
        this._moving = false;

        this._additionalMesh = new THREE.Mesh;
        this.additionalMesh.position.set(this._x, this._y, -this._z);

        let cube_geometry;
        if (this.type == BoxType.Type1) cube_geometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
        else if (this.type == BoxType.Type2) cube_geometry = new THREE.BoxGeometry(0.85, 1.0, 0.85);

        // not a good idea but simple to implement
        let cubeMesh = new THREE.Mesh(cube_geometry, this.material);
        cubeMesh.frustumCulled = false; //-------------------------- check point for next implementation
        //additionalMesh.frustumCulled = true; // test code for next implementation
        cubeMesh.name = "cube";

        // Only cast shadows if we are on the main page.
        if (isMainPage) cubeMesh.castShadow = true;

        const edges = new THREE.EdgesGeometry(cube_geometry);
        const edgeMaterial = new THREE.LineBasicMaterial({
            color: 0x00fff7,
        });
        const edgeLines = new THREE.LineSegments(edges, edgeMaterial);

        edgeLines.renderOrder = 6;
        cubeMesh.renderOrder = 2;

        cubeMesh.add(edgeLines);
        this._additionalMesh.add(cubeMesh);


        // create the leg meshes, only if box is type 2
        if (this._type == BoxType.Type2){
            const legGeom = new THREE.BoxGeometry(0.075, 1, 0.075);
            const legMaterial = new THREE.MeshBasicMaterial();
            legMaterial.color = new THREE.Color(0x000000)

            const legEdges = new THREE.EdgesGeometry(legGeom);
            const legEdgeMaterial = new THREE.LineBasicMaterial({
                color: 0x00fff7,
            });
            
            const leg1 = new THREE.Mesh(legGeom, legMaterial);
            const leg2 = new THREE.Mesh(legGeom, legMaterial);
            const leg3 = new THREE.Mesh(legGeom, legMaterial);
            const leg4 = new THREE.Mesh(legGeom, legMaterial);
            const pos = 0.3865;
            // const yScale = 0.997
            // leg1.scale.set(1,yScale,1); // hide leg
            leg1.position.set(pos, 0, pos); // position the leg to just inside the box
            leg1.name = "leg1";
            // leg2.scale.set(1,yScale,1);
            leg2.position.set(-pos, 0, pos);
            leg2.name = "leg2";
            // leg3.scale.set(1,yScale,1);
            leg3.position.set(pos, 0, -pos);
            leg3.name = "leg3";
            // leg4.scale.set(1,yScale,1);
            leg4.position.set(-pos, 0, -pos);
            leg4.name = "leg4";

            leg1.add(new THREE.LineSegments(legEdges, legEdgeMaterial));
            leg2.add(new THREE.LineSegments(legEdges, legEdgeMaterial));
            leg3.add(new THREE.LineSegments(legEdges, legEdgeMaterial));
            leg4.add(new THREE.LineSegments(legEdges, legEdgeMaterial));

            this._additionalMesh.add(leg1);
            this._additionalMesh.add(leg2);
            this._additionalMesh.add(leg3);
            this._additionalMesh.add(leg4);
        }


        Warehouse.current?.addMesh(this.additionalMesh);
        
    }

    get id() {
        return this._id;
    }

    set x(x) {
        this._x = x;
    }

    get x() {
        return this._x;
    }

    set y(y) {
        this._y = y;
    }

    get y() {
        return this._y;
    }

    set z(z) {
        this._z = z;
    }

    get z() {
        return this._z;
    }

    get position() {
        return { x: this.x, y: this.y, z: this.z };
    }

    get name() {
        return this._name;
    }

    get additionalMesh() {
        return this._additionalMesh;
    }

    set name(n: string) {
        this._name = n;
    }

    public updateScenario() {
        Warehouse.current?.addMesh(this.additionalMesh);
    }

    set position(position: { x: number; y: number; z: number }) {
        this.x = position.x;
        this.y = position.y;
        this.z = position.z;
        Warehouse.current?.setPosition(this._id, {
            x: this.x,
            y: this.y,
            z: this.z,
        });
    }

    setMeshPosition(position: { x: number; y: number; z: number }) {
        // let cube = this.additionalMesh.getObjectByName("cube");
        // if (!cube) return;

        this.additionalMesh.position.x = position.x;
        this.additionalMesh.position.y = position.y
        this.additionalMesh.position.z = position.z;
    }

    addToMeshPosition(position: { x: number; y: number; z: number }) {
        this.additionalMesh.position.x += position.x;
        this.additionalMesh.position.y += position.y
        this.additionalMesh.position.z += position.z;
    }

    removeAdditionalMesh() {
        Warehouse.current?.scene.remove(this._additionalMesh);
    }

    private createNumberedTexture(id: string) {
        const fontSize = 56.25 - 5.625 * id.length;

        const size = 96;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        if (!ctx) throw new Error("Canvas context could not be created");
        ctx.drawImage(canvas, 0, 0, size, size);
        ctx.fillStyle = "#00fff7";
        ctx.font = `bold ${fontSize}px Oxanium`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(id, size / 2, size / 2);

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    displaceLegs(deltaTime: number) {
        const leg1 = this.additionalMesh.getObjectByName("leg1")!;
        const leg2 = this.additionalMesh.getObjectByName("leg2")!;
        const leg3 = this.additionalMesh.getObjectByName("leg3")!;
        const leg4 = this.additionalMesh.getObjectByName("leg4")!;
        const maxPos = 0.462

        if (leg1.position.x + deltaTime >= maxPos){
            leg1.position.x = maxPos;
            leg1.position.z = maxPos;

            leg2.position.x = -maxPos;
            leg2.position.z = maxPos;

            leg3.position.x = maxPos;
            leg3.position.z = -maxPos;

            leg4.position.x = -maxPos;
            leg4.position.z = -maxPos;
            return;
        }

        leg1.position.add({x: deltaTime, y: 0, z: deltaTime});
        leg2.position.add({x: -deltaTime, y: 0, z: deltaTime});
        leg3.position.add({x: deltaTime, y: 0, z: -deltaTime});
        leg4.position.add({x: -deltaTime, y: 0, z: -deltaTime});
    }

    withdrawLegs(deltaTime: number) {
        const leg1 = this.additionalMesh.getObjectByName("leg1")!;
        const leg2 = this.additionalMesh.getObjectByName("leg2")!;    
        const leg3 = this.additionalMesh.getObjectByName("leg3")!;
        const leg4 = this.additionalMesh.getObjectByName("leg4")!;
        const minPos = 0.3865;

        if (leg1.position.x - deltaTime <= minPos){
            leg1.position.x = minPos;
            leg1.position.z = minPos;

            leg2.position.x = -minPos;
            leg2.position.z = minPos;

            leg3.position.x = minPos;
            leg3.position.z = -minPos;

            leg4.position.x = -minPos;
            leg4.position.z = -minPos;
            return;
        };

        leg1.position.add({x: -deltaTime, y: 0, z: -deltaTime});
        leg2.position.add({x: deltaTime, y: 0, z: -deltaTime});
        leg3.position.add({x: -deltaTime, y: 0, z: deltaTime});
        leg4.position.add({x: deltaTime, y: 0, z: deltaTime});
    }

    extendLegs(dy: number) {
        const leg1 = this.additionalMesh.getObjectByName("leg1")!;
        const leg2 = this.additionalMesh.getObjectByName("leg2")!;
        const leg3 = this.additionalMesh.getObjectByName("leg3")!;
        const leg4 = this.additionalMesh.getObjectByName("leg4")!;

        if (leg1.position.y - (dy * 0.5) <= -0.5){
            leg1.position.y = -0.5;
            leg2.position.y = -0.5;
            leg3.position.y = -0.5;
            leg4.position.y = -0.5;

            leg1.scale.y = 2;
            leg2.scale.y = 2;
            leg3.scale.y = 2;
            leg4.scale.y = 2;
            return;
        }

        leg1.scale.y += dy;
        leg2.scale.y += dy;
        leg3.scale.y += dy;
        leg4.scale.y += dy;
        
        leg1.position.y -= dy * 0.5; // only move legs, not box
        leg2.position.y -= dy * 0.5;
        leg3.position.y -= dy * 0.5;
        leg4.position.y -= dy * 0.5;
    }

    retractLegs(dy: number) {
        const leg1 = this.additionalMesh.getObjectByName("leg1")!;
        const leg2 = this.additionalMesh.getObjectByName("leg2")!;
        const leg3 = this.additionalMesh.getObjectByName("leg3")!;
        const leg4 = this.additionalMesh.getObjectByName("leg4")!;

        if (leg1.position.y + (dy * 0.5) >= 0){
            leg1.position.y = 0;
            leg2.position.y = 0;
            leg3.position.y = 0;
            leg4.position.y = 0;

            leg1.scale.y = 1;
            leg2.scale.y = 1;
            leg3.scale.y = 1;
            leg4.scale.y = 1;
            return;
        }

        leg1.scale.y -= dy;
        leg2.scale.y -= dy;
        leg3.scale.y -= dy;
        leg4.scale.y -= dy;

        leg1.position.y += dy * 0.5; // only move legs, not box
        leg2.position.y += dy * 0.5;
        leg3.position.y += dy * 0.5;
        leg4.position.y += dy * 0.5;
    }

    setLegColor(color: {r: number, g: number, b: number}){
        const leg1 = this.additionalMesh.getObjectByName("leg1") as THREE.Mesh;
        const leg2 = this.additionalMesh.getObjectByName("leg2") as THREE.Mesh;
        const leg3 = this.additionalMesh.getObjectByName("leg3") as THREE.Mesh;
        const leg4 = this.additionalMesh.getObjectByName("leg4") as THREE.Mesh;

        (leg1.material as THREE.MeshBasicMaterial).color.setRGB(color.r, color.g, color.b);
        (leg2.material as THREE.MeshBasicMaterial).color.setRGB(color.r, color.g, color.b);
        (leg3.material as THREE.MeshBasicMaterial).color.setRGB(color.r, color.g, color.b);
        (leg4.material as THREE.MeshBasicMaterial).color.setRGB(color.r, color.g, color.b);
    }

    get legsDisplaced() {
        return this._legs_displaced;
    }

    // setting this will animate the legs
    set legsDisplaced(legsDisplaced: boolean) {
        this._legs_displaced = legsDisplaced;
    }

    get legsExtended() {
        return this._legs_extended;
    }

    // setting this will animate the legs
    set legsExtended(legsExtended: boolean) {
        this._legs_extended = legsExtended;
    }

    get type(){
        return this._type;
    }

    get moving(){
        return this._moving;
    }

    set moving(moving: boolean){
        this._moving = moving;
    }
}
