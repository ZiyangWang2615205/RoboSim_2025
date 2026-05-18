import { Cube } from "./cube";
import { addFloor } from "../ui/scene_objects";
import * as THREE from "three";
import { Action, BoxType, LegActionType, Move } from "../../../server/src/types/index.ts";
import { StartEndCubes } from "./start-end-cube";

export const cube_geometry = new THREE.BoxGeometry(1, 1, 1);

const material = new THREE.ShaderMaterial({
    uniforms: {
        // map: { value: cube_texture }
    },
    vertexColors: true,
    transparent: true,
    // depthWrite: true,
    // depthTest: true,
    polygonOffset: false,
});

// redefine the shader to make sure instancedMesh can have alpha and colour values for each instance
material.onBeforeCompile = (shader) => {
    shader.uniforms = {
        ...shader.uniforms,
        // map: { value: cube_texture }
    };

    //console.log(shader.vertexShader);

    shader.vertexShader = `
    attribute vec3 instanceColor;  // Colour
    attribute float instanceAlpha; // Alpha
    attribute float instanceMixFactor; // mix factor
    varying vec3 vInstanceColor;   // pass colour to fragment
    varying float vInstanceAlpha;  // pass alpha to fragment
    varying vec2 vUv;              // pass uv to fragment
    varying float vMixFactor;       // pass mix factor

    void main(){
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        gl_Position.z += 0.01;   // very important when dealing with occlusion
        vInstanceColor = instanceColor;
        vInstanceAlpha = instanceAlpha;
        vMixFactor = instanceMixFactor;
    }
    `;

    shader.fragmentShader = `
        uniform sampler2D map;
        varying vec3 vInstanceColor; 
        varying float vInstanceAlpha;
        varying vec2 vUv;
        varying float vMixFactor;

        void main(){
            // vec4 texColor = texture2D(map, vUv); // sample texture colour
            //vec3 color = mix(1.0, 1.0, 1.0, vInstanceColor, vMixFactor); // mix colour
            // gl_FragColor = vec4(color, texColor.a * vInstanceAlpha);

            //gl_FragColor = vec4(vInstanceColor, 1);
            gl_FragColor = vec4(vInstanceColor, vInstanceAlpha);
        }
        `;
};

// A singleton
export default class Warehouse {

    //---------------------------------------------------------------------------------
    // additionalMesh , save orignal material state
    private _originalAdditionalMaterials:
    Map<number, Array<{ mat: THREE.Material; transparent: boolean; opacity: number; depthWrite: boolean; depthTest: boolean }>>
    | null = null;

    private ensureOriginalAdditionalMaterials() {
    if (this._originalAdditionalMaterials) return;

    this._originalAdditionalMaterials = new Map();

    for (const cube of this._cubes.values()) {
        const records: Array<{ mat: THREE.Material; transparent: boolean; opacity: number; depthWrite: boolean; depthTest: boolean }> = [];

        cube.additionalMesh.traverse((obj) => {
        // Mesh / LineSegments all can have material
        const anyObj = obj as any;
        const mat = anyObj.material as THREE.Material | THREE.Material[] | undefined;
        if (!mat) return;

        const mats = Array.isArray(mat) ? mat : [mat];
        for (const m of mats) {
            records.push({
            mat: m,
            transparent: m.transparent,
            opacity: (m as any).opacity ?? 1,
            depthWrite: m.depthWrite,
            depthTest: m.depthTest,
            });
        }
        });

        this._originalAdditionalMaterials.set(cube.id, records);
    }
    }

    /**
     * except traveller, cube.additionalMesh(includes number texture) + edges + legs to transparent
     * - alpha: 0~1
     * - when transparencyOn, depthWrite=false recommended 
     */
    public setNonTravellerAdditionalOpacity(travellerIds: Set<number>, alpha: number, transparencyOn: boolean) {
        this.ensureOriginalAdditionalMaterials();
        if (!this._originalAdditionalMaterials) return;

        const clamped = Math.max(0, Math.min(1, alpha));

        for (const cube of this._cubes.values()) {
            const isTraveller = travellerIds.has(cube.id);
            const targetOpacity = isTraveller ? 1.0 : clamped;

            // use all material inside of additionalMesh
            cube.additionalMesh.traverse((obj) => {
            const anyObj = obj as any;
            const mat = anyObj.material as THREE.Material | THREE.Material[] | undefined;
            if (!mat) return;

            const mats = Array.isArray(mat) ? mat : [mat];

            for (const m of mats) {
                // LineBasicMaterial / MeshBasicMaterial / MeshStandardMaterial able to use same attribute
                m.transparent = true;                // true for opacity
                (m as any).opacity = targetOpacity;  // most of materials has opacity attribute
                m.depthTest = true;

                // off depthWrite when transparent mode.
                m.depthWrite = isTraveller ? true : !transparencyOn ? true : false;

                m.needsUpdate = true;
            }
            });
        }
    }

    /** rpllback additionalMesh orignal state  */
    public resetNonTravellerAdditionalOpacity() {
    if (!this._originalAdditionalMaterials) return;

    for (const [cubeId, records] of this._originalAdditionalMaterials.entries()) {
        if (!this._cubes.has(cubeId)) continue;

        for (const r of records) {
        r.mat.transparent = r.transparent;
        (r.mat as any).opacity = r.opacity;
        r.mat.depthWrite = r.depthWrite;
        r.mat.depthTest = r.depthTest;
        }
    }
    }
    //---------------------------------------------------------------------------

    private static _current: Warehouse | null = null;

    // field to saves original alpha value
    private _originalAlphas: Map<number, number> | null = null;

    private ensureOriginalAlphas() { // saves current box's original alpha value
        if (this._originalAlphas) return;

        this._originalAlphas = new Map();
        for (const cube of this._cubes.values()) {
            this._originalAlphas.set(cube.id, this.getAlpha(cube.id));
        }
    }

    // transparent box toggle on. only for traveling box
    public setNonTravellerOpacity(travellerIds: Set<number>, opacity: number) {
        this.ensureOriginalAlphas();
        if (!this._originalAlphas) return;

        const clamped = Math.max(0, Math.min(1, opacity));

        for (const cube of this._cubes.values()) {
            const id = cube.id;
            const baseAlpha = this._originalAlphas.get(id) ?? 1.0;

            if (travellerIds.has(id)) {
                // keep the alpha value of traveling box
                this.setAlpha(id, baseAlpha);
            } else {
                // others baseAlpha * opacity
                this.setAlpha(id, baseAlpha * clamped);
            }
        }
    }

    // toggle off and return back to original alpha value
    public resetNonTravellerOpacity() {
        if (!this._originalAlphas) return;

        for (const [id, baseAlpha] of this._originalAlphas.entries()) {
            if (this._cubes.has(id)) {
                this.setAlpha(id, baseAlpha);
            }
        }
    }

    // use depth buffer when transparency mode on/off
    public setTransparencyDepthMode(enabled: boolean) {
        const mat = this._cubeInstances.material as THREE.ShaderMaterial;
        // off depthwrite when transparency mode on
        mat.depthWrite = !enabled;
        mat.needsUpdate = true;
    }


    // A map of cube IDs to cubes
    public width: number;
    public height: number;
    public depth: number;
    public currentSelected: number;

    // cube instances used to store all cubes
    private _cubeInstances: THREE.InstancedMesh;
    // used to store all attribute needed in cube instances
    public _instanceData: {
        colors: Float32Array;
        alphas: Float32Array;
        mixFactors: Float32Array;
        matrices: Float32Array;
        targetPositions: Float32Array;
        count: number;
    };

    public _cubes: Map<number, Cube> = new Map();

    // map used to record the reflection of cubeID and instanceID
    private instanceToCube: Map<number, number> = new Map();
    private cubeToInstance: Map<number, number> = new Map();

    private _MAXCOUNT: number; // maximum number of cubes

    // The threejs scene that displays the warehouse
    private _scene: THREE.Scene = new THREE.Scene();
    private _StartEndCubes: StartEndCubes;

    private _boxType: BoxType
    private _cubeGeometry: THREE.BoxGeometry;

    constructor(
        width: number,
        height: number,
        depth: number,
        boxType: BoxType,
        isMainPage: boolean = false,
        count = 50000,
    ) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.currentSelected = 0;

        this._cubes = new Map();
        this._scene = new THREE.Scene(); // initialised scene
        this._MAXCOUNT = count;
        this._StartEndCubes = new StartEndCubes(this);
        this._boxType = boxType;

        if (this._boxType == BoxType.Type2) this._cubeGeometry = new THREE.BoxGeometry(0.85, 1.0, 0.85);
        else this._cubeGeometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);

        this._instanceData = {
            colors: new Float32Array(this._MAXCOUNT * 3), // r g b
            alphas: new Float32Array(this._MAXCOUNT), // a
            mixFactors: new Float32Array(this._MAXCOUNT), // mix factor
            matrices: new Float32Array(this._MAXCOUNT * 16), // 4*4
            targetPositions: new Float32Array(this._MAXCOUNT * 3),
            count: 0,
        };

        // manage cube instance at the same place
        this._cubeInstances = new THREE.InstancedMesh(
            this._cubeGeometry,
            material,
            count,
        );

        // console.log("instanceMatrix updated:", this._cubeInstances.instanceMatrix.needsUpdate);
        this._cubeInstances.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // dynamic update (nice one)
        this._cubeInstances.frustumCulled = false; // remove cubes of out insight ------------------------ here for next implemetation
        this._cubeInstances.renderOrder = 1;

        this._cubeInstances.geometry.setAttribute(
            "instanceColor",
            new THREE.InstancedBufferAttribute(this._instanceData.colors, 3),
        );
        this._cubeInstances.geometry.setAttribute(
            "instanceAlpha",
            new THREE.InstancedBufferAttribute(this._instanceData.alphas, 1),
        );
        this._cubeInstances.geometry.setAttribute(
            "instanceMixFactor",
            new THREE.InstancedBufferAttribute(
                this._instanceData.mixFactors,
                1,
            ),
        );
        this._cubeInstances.count = this._instanceData.count;

        this.scene.add(this._cubeInstances);

        this._originalAlphas = null; // when restart, clear cache

        // Add ambient light to the scene if we are rendering the playground
        // Otherwise add point light
        let light: THREE.Light;
        if (!isMainPage) {
            light = new THREE.AmbientLight(0xf0f0f0); // soft white light
            this._scene.add(light);
        } else {
            let lightCool = new THREE.PointLight(0x78c5ff, 400, 100);
            lightCool.position.set(width, 10, -depth);
            lightCool.castShadow = true;
            this._scene.add(lightCool);

            let lightPurple1 = new THREE.PointLight(0xa75ef8, 400, 100);
            lightPurple1.position.set(width, 10, -depth);
            lightPurple1.castShadow = false;
            this._scene.add(lightPurple1);

            let lightPurple2 = new THREE.PointLight(0xa75ef8, 600, 100);
            lightPurple2.position.set(0, 10, 0);
            lightPurple2.castShadow = true;
            this._scene.add(lightPurple2);
        }

        // addFloor needs isPlayground? so it can pick the correct floor texture
        addFloor(this._scene, width, height, depth, isMainPage);
    }

    // Get the state (could be null if there is no state)
    static get current(): Warehouse | null {
        if (Warehouse._current == null) return null;

        return Warehouse._current;
    }

    static set current(state: Warehouse | null) {
        Warehouse._current = state;
    }

    applyAction(action: Action) {
        if (action.kind === "move") {
            this.applyMove(action);
        } else if (action.kind === "leg") {
            if (action.type === LegActionType.Displace) {
                this.displaceLegs(action.id);
            } else if (action.type === LegActionType.Withdraw) {
                this.withdrawLegs(action.id);
            } else if (action.type === LegActionType.Extend) {
                this.extendLegs(action.id);
            } else if (action.type === LegActionType.Retract) {
                this.retractLegs(action.id);
            } else {
                throw new Error("Unrecognized leg action type");
            }
        } else {
            throw new Error("Unsupported action type");
        }
    }

    public setColour(cubeID: number, colour: [number, number, number]) {
        // check ID and colour
        const instanceID = this.toInstanceID(cubeID);
        const offset = instanceID * 3;
        this._instanceData.colors[offset] = colour[0];
        this._instanceData.colors[offset + 1] = colour[1];
        this._instanceData.colors[offset + 2] = colour[2];
        this._cubeInstances.geometry.attributes.instanceColor.needsUpdate =
            true;
    }

    public setAlpha(cubeID: number, alpha: number) {
        const instanceID = this.toInstanceID(cubeID);
        // check id and alpha
        this._instanceData.alphas[instanceID] = alpha;
        this._cubeInstances.geometry.attributes.instanceAlpha.needsUpdate =
            true;
    }

    public setMixFactor(cubeID: number, factor: number) {
        return;
        const instanceID = this.toInstanceID(cubeID);
        this._instanceData.mixFactors[instanceID] = factor;
        this._cubeInstances.geometry.attributes.instanceMixFactor.needsUpdate =
            true;
    }

    applyMove(move: Move) {
        const cube = this.getCube(move.id);
        //if (!cube || cube instanceof StartEndCube) return;
        if (!cube) return;
        cube.position = {
            x: cube.x + move.dx,
            y: cube.y + move.dy,
            z: cube.z + move.dz,
        };
    }

    displaceLegs(id: number) {
        const cube = this.getCube(id);
        if (!cube) return;

        // setting this animates the legs
        cube.legsDisplaced = true
    }

    withdrawLegs(id: number) {
        const cube = this.getCube(id);
        if (!cube) return;

        // setting this animates the legs
        cube.legsDisplaced = false;
    }

    extendLegs(id: number) {
        const cube = this.getCube(id);
        if (!cube) return;

        if (
            // if this cube has y == 0 or the cube beneath has its legs displaced
            cube.y === 0 ||
            this.cubes
                .find(
                    (c) =>
                        c.position.x === cube.position.x &&
                        c.position.y === cube.position.y - 1 &&
                        c.position.z === cube.position.z,
                )
                ?.legsDisplaced
        ) {
            // find all the cubes above this one with same x and z coords (and this one as well)
            const cubes = this.cubes.filter(
                (c) =>
                    c.position.x === cube.position.x &&
                    c.position.z === cube.position.z &&
                    c.position.y >= cube.position.y,
            );

            // move each cube above this one (and this one as well) up by one
            for (const cube of cubes) {
                cube.moving = true;
                cube.position = {
                    x: cube.x,
                    y: cube.y + 1,
                    z: cube.z,
                };
            }
        } else {
            // otherwise cube beneath does not have legs displaced
            // so legs for this cube will descend to surround the cube below
            // but we do not need to move any cubes
            cube.moving = false;
        }
        // setting this animates the legs
        cube.legsExtended = true;
    }

    retractLegs(id: number) {
        const cube = this.getCube(id);
        if (!cube) return;

        const cube_below = this.cubes.find(
            (c) =>
                c.position.x === cube.position.x &&
                c.position.y === cube.position.y - 1 &&
                c.position.z === cube.position.z,
        );

        if (cube_below !== undefined) {
            //if there is a cube directly below, we need to move legs up
            //but we do not need to move any cubes
            cube.moving = false;
        } else {
            // find all the cubes above this one with same x and z coords (and this one as well)
            const cubes = this.cubes.filter(
                (c) =>
                    c.position.x === cube.position.x &&
                    c.position.z === cube.position.z &&
                    c.position.y >= cube.position.y,
            );

            // move each cube above this one (and this one as well) down by one
            for (const cube of cubes) {
                cube.moving = true;
                cube.position = {
                    x: cube.x,
                    y: cube.y - 1,
                    z: cube.z,
                };
            }
        }
        // setting this animates the legs
        cube.legsExtended = false;
    }

    // Get a cube by its ID
    getCube(id: number): Cube | null {
        let cube = this._cubes.get(id);
        return cube ? cube : null;
    }

    // Add a cube to the scene
    addCube(cube: Cube): boolean {
        const instanceID = this._instanceData.count;
        const cubeID = cube.id;
        this.instanceToCube.set(instanceID, cubeID);
        this.cubeToInstance.set(cubeID, instanceID);
        const matrix = new THREE.Matrix4().makeTranslation(
            cube.x,
            cube.y,
            cube.z,
        );
        const result = this.addCubeInstance(cubeID, matrix);
        if (result) {
            // successfully add instance
            this.setPosition(cubeID, { x: cube.x, y: cube.y, z: cube.z });
            this._cubes.set(cubeID, cube);
            return true;
        } else {
            // fail to add instance
            console.error("Fail to add instance");
            this.instanceToCube.delete(instanceID);
            this.cubeToInstance.delete(cubeID);
            return false;
        }
    }

    // Add a cube into cubeinstance
    addCubeInstance(
        cubeID: number,
        matrix: THREE.Matrix4,
        colour: [number, number, number] = [0.0, 0.0, 0.0],
        alpha: number = 1.0,
    ): boolean {
        const instanceID = this._instanceData.count;
        // set the reflection of cubeID and instanceID

        if (instanceID < 0 || instanceID >= this._MAXCOUNT) {
            console.error("invalid cubeID in addCubeInstance");
            return false;
        }

        const position = new THREE.Vector3();
        position.setFromMatrixPosition(matrix);

        matrix.elements[14] *= -1; // be negative
        this._cubeInstances.setMatrixAt(instanceID, matrix); // set matrix of instance
        matrix.elements[14] *= -1; // recover

        this._instanceData.matrices.set(matrix.elements, instanceID * 16);
        this._instanceData.count++;
        this._cubeInstances.count = this._instanceData.count;
        // this.setMixFactor(cubeID, .05);
        this.setColour(cubeID, colour); // set colour
        this.setAlpha(cubeID, alpha); // set alpha
        this._cubeInstances.instanceMatrix.needsUpdate = true;
        return true;
    }

    removeCube(cubeID: number) {
        console.log("removing cubeID: ", cubeID);
        //console.log(this.cubeToInstance, this.instanceToCube);
        if (cubeID < 0) {
            console.warn("cubeID not valid in removing cube");
            return;
        }
        let cube = this._cubes.get(cubeID);
        if (!cube) {
            console.warn("No cube in cubes when removing cube");
            return;
        }

        // delete the additional mesh in cube
        this.scene.remove(cube.additionalMesh);

        const instanceID = this.toInstanceID(cubeID); // the instanceID of deleted box
        const lastInstanceID = this._instanceData.count - 1; // the last instanceID
        const lastCubeID = this.toCubeID(lastInstanceID);
        // move the last instance to the remove place
        if (instanceID < this._instanceData.count - 1) {
            const lastCubeMatrix = this.getMatrixAt(lastCubeID);
            //console.log("instanceID: ", instanceID, "CubeID: ", cubeID, "lastInstance: ", lastInstanceID, "lastCubeID: ", lastCubeID);

            // swap the last instace with removed one
            this._cubeInstances.setMatrixAt(instanceID, lastCubeMatrix); // set removed position to lastCube position
            this.setColour(cubeID, this.getColor(lastCubeID)); // set removed color to lastCube color
            this.setAlpha(cubeID, this.getAlpha(lastCubeID)); // set removed alpha to lastCube alpha
            const lastCubePosition = new THREE.Vector3();
            lastCubePosition.setFromMatrixPosition(lastCubeMatrix);
            lastCubePosition.z = -lastCubePosition.z; // It should be positive in instanceData
            // No (cubeID=cubeID) in ts

            // exchange data
            let offset = instanceID * 16;
            this._instanceData.matrices[offset + 12] = lastCubePosition.x;
            this._instanceData.matrices[offset + 13] = lastCubePosition.y;
            this._instanceData.matrices[offset + 14] = lastCubePosition.z;
            // set instanceData.targetPosition
            this.setPosition(cubeID, lastCubePosition);

            // reset lastInstanceID data
            offset = lastInstanceID * 16;
            for (let i = offset; i < offset + 16; i++) {
                this._instanceData.matrices[i] = 0;
            }

            // set instanceData.targetPosition
            this.setPosition(lastCubeID, { x: 0, y: 0, z: 0 });

            this.setColour(lastCubeID, [0, 0, 0]); // reset colour
            this.setAlpha(lastCubeID, 0); // reset alpha

            this.cubeToInstance.delete(cubeID); // change maping of ID
            this.cubeToInstance.delete(lastCubeID);
            this.instanceToCube.delete(instanceID);
            this.instanceToCube.delete(lastInstanceID);

            this.cubeToInstance.set(lastCubeID, instanceID);
            this.instanceToCube.set(instanceID, lastCubeID);
        } else {
            // remove the last instance
            const offset = lastInstanceID * 16;
            for (let i = offset; i < offset + 16; i++) {
                this._instanceData.matrices[i] = 0;
            }
            this.setPosition(lastCubeID, { x: 0, y: 0, z: 0 });
            this.setColour(lastCubeID, [0, 0, 0]); // reset colour
            this.setAlpha(lastCubeID, 0); // reset alpha
            this.cubeToInstance.delete(lastCubeID);
            this.instanceToCube.delete(lastInstanceID);
        }
        // delete from cubes
        this._cubes.delete(cubeID);
        // change count
        this._instanceData.count--;
        this._cubeInstances.count = this._instanceData.count;
        // updateFlag
        this._cubeInstances.instanceMatrix.needsUpdate = true;
        console.log("instacneTocube: ", this.instanceToCube);
        console.log("cubeToInstance: ", this.cubeToInstance);
        console.log("cube count: ", this.cubeInstances.count);
        this.printAllPosition();
    }

    /*
        Set target position with given cubeID
    */
    setPosition(cubeID: number, position: { x: number; y: number; z: number }) {
        // console.log("set position");
        const offset = this.toInstanceID(cubeID) * 3;
        this._instanceData.targetPositions[offset] = position.x;
        this._instanceData.targetPositions[offset + 1] = position.y;
        this._instanceData.targetPositions[offset + 2] = position.z;
        // this.printAllPosition();
    }

    public printAllPosition() {
        console.log(this._instanceData);
        const matrices = new THREE.Matrix4();
        const localpos = new THREE.Vector3();
        for (let i = 0; i < this._instanceData.count; i++) {
            this._cubeInstances.getMatrixAt(i, matrices);
            localpos.setFromMatrixPosition(matrices);
            console.log(`cubeID ${this.toCubeID(i)}`);
            console.log(`InstanceID ${i}`);
            console.log("currentPosition: ", localpos);
            console.log(
                "position in data: ",
                this._instanceData.matrices[i * 16 + 12],
                this._instanceData.matrices[i * 16 + 13],
                this._instanceData.matrices[i * 16 + 14],
            );
            console.log(
                "targetPosition",
                this._instanceData.targetPositions[i * 3],
                this._instanceData.targetPositions[i * 3 + 1],
                this._instanceData.targetPositions[i * 3 + 2],
            );
        }
        console.log("--------------------------------------");
    }

    public animateToTarget(deltaTime: number) {
        const t = deltaTime * 10;
        // const threshold = 0.03;

        const matrice = new THREE.Matrix4();
        const instancePosition = new THREE.Vector3();

        for (
            let instanceID = 0;
            instanceID < this._instanceData.count;
            instanceID++
        ) {
            const matrixIndex = instanceID * 16;
            this._cubeInstances.getMatrixAt(instanceID, matrice);
            instancePosition.setFromMatrixPosition(matrice);

            const currentX = this._instanceData.matrices[matrixIndex + 12];
            const currentY = this._instanceData.matrices[matrixIndex + 13];
            const currentZ = this._instanceData.matrices[matrixIndex + 14];

            const targetIndex = instanceID * 3;
            const targetX = this._instanceData.targetPositions[targetIndex];
            const targetY = this._instanceData.targetPositions[targetIndex + 1];
            const targetZ = this._instanceData.targetPositions[targetIndex + 2];

            if (
                targetX == currentX &&
                targetY == currentY &&
                targetZ == currentZ
            ) {
                continue;
            }

            const cubeID = this.toCubeID(instanceID);
            const cube = this._cubes.get(cubeID);
            var newX: number;
            var newY: number;
            var newZ: number;
           
            // move cube
            let dx = t * (targetX - currentX);
            let dy = t * (targetY - currentY);
            let dz = t * (targetZ - currentZ);
            newX = currentX + dx;
            newY = currentY + dy;
            newZ = currentZ + dz;
            cube?.setMeshPosition({ x: newX, y: newY, z: -newZ });

            // will only extend legs if cube is moving
            // as this function will only be called if cube is moving
            // case where cube is not moving is handled in animateLegs
            if (cube?.type === BoxType.Type2){
                if (cube.legsExtended && cube.moving){
                    cube.extendLegs(dy);
                }
                else if (!cube.legsExtended && cube.moving){
                    // retractLegs requires a positive value for dy
                    cube.retractLegs(Math.abs(dy));
                }
            }

            this._instanceData.matrices[matrixIndex + 12] = newX;
            this._instanceData.matrices[matrixIndex + 13] = newY;
            this._instanceData.matrices[matrixIndex + 14] = newZ;

            // should be negative
            const matrix = new THREE.Matrix4().makeTranslation(
                newX,
                newY,
                -newZ,
            );
            this._cubeInstances.setMatrixAt(instanceID, matrix);            
            
        }
        this._cubeInstances.instanceMatrix.needsUpdate = true;
    }

    public animateLegs(deltaTime: number){
        // do not need to animate legs if we are using type 1 boxes
        if (this._boxType == BoxType.Type1) return;
        
        for (let entry of this._cubes){
            let cube = entry[1];

            // extend legs only when cube is not moving
            // case where cube is moving is handled in animateToTarget
            if (cube.legsExtended && !cube.moving){
                cube.extendLegs(deltaTime * 4.5);
            }
            else if (!cube.legsExtended && !cube.moving){
                cube.retractLegs(deltaTime * 4.5);
            }
            if (cube.legsDisplaced){
                cube.displaceLegs(deltaTime * 0.4);
            }
            else {
                cube.withdrawLegs(deltaTime * 0.4);
            }
        }
    }

    clear() {
        this._scene.remove(this._cubeInstances);
        for (let cube of this._cubes.values()) {
            cube.removeAdditionalMesh();
        }
        // clean memory usage
        this._cubeInstances.geometry.dispose();
        (this._cubeInstances.material as THREE.Material).dispose();
        this._cubeInstances = new THREE.InstancedMesh(
            this._cubeGeometry,
            material,
            this._MAXCOUNT,
        );
        this._instanceData = {
            colors: new Float32Array(0), // r g b
            alphas: new Float32Array(0), // a
            matrices: new Float32Array(0), // 4*4
            mixFactors: new Float32Array(0), // a
            targetPositions: new Float32Array(0),
            count: 0,
        };
        this.instanceToCube.clear();
        this.cubeToInstance.clear();

        this._cubeInstances.count = this._instanceData.count;
        this._scene.add(this._cubeInstances);
    }

    addStartEndCubes(
        isStart: boolean,
        state: { x: number; y: number; z: number }[],
    ) {
        if (isStart) {
            this._StartEndCubes.setStartCubes(state);
        } else {
            this._StartEndCubes.setendCubes(state);
        }
    }

    addExitCubes(corner1: { x1:number; y1:number; z1:number }, corner2: { x2:number; y2:number; z2:number;}) {
        this._StartEndCubes.setExitCubes(corner1,corner2);
    }

    removeStartEndCubes(isStart: boolean) {
        if (isStart) {
            this._StartEndCubes.removeStartCubes();
        } else {
            this._StartEndCubes.removeEndCubes();
        }
    }

    removeExitCubes(){
        this._StartEndCubes.removeExitCubes();
    }
    
    public getMatrixAt(cubeID: number) {
        const matrix = new THREE.Matrix4();
        const offset = this.toInstanceID(cubeID) * 16;
        const x = this._instanceData.matrices[offset + 12];
        const y = this._instanceData.matrices[offset + 13];
        const z = -this._instanceData.matrices[offset + 14];
        // Z axis should be negative or 0 in cubeInstance.Matrix
        matrix.makeTranslation(x, y, z);
        return matrix;
    }

    // Get the threejs scene related to the scenario
    get scene() {
        return this._scene;
    }

    // Get a list of all the cubes in the scene
    get cubeInstances(): THREE.InstancedMesh {
        return this._cubeInstances;
    }

    public getColor(cubeID: number): [number, number, number] {
        const instanceID = this.toInstanceID(cubeID);
        const offset = instanceID * 3;
        return [
            this._instanceData.colors[offset],
            this._instanceData.colors[offset + 1],
            this._instanceData.colors[offset + 2],
        ];
    }

    public getAlpha(cubeID: number) {
        const instanceID = this.toInstanceID(cubeID);
        return this._instanceData.alphas[instanceID];
    }

    public toInstanceID(cubeID: number): number {
        const id = this.cubeToInstance.get(cubeID);
        if (id == undefined) {
            console.error(
                "Given Cube ID is not valid",
                cubeID,
                this.cubeToInstance,
            );
            throw new Error("CubeID not valid");
        }
        return id;
    }

    public toCubeID(instanceID: number): number {
        const id = this.instanceToCube.get(instanceID);
        if (id == undefined) {
            console.error(
                "Given Cube ID is not valid",
                instanceID,
                this.cubeToInstance,
            );
            throw new Error("CubeID not valid");
        }
        return id;
    }

    get cubes(): Cube[] {
        return Array.from(this._cubes.values());
    }

    get boxType(): BoxType {
        return this._boxType;
    }

    getMixFactor(cubeID: number): number {
        const instanceID = this.toInstanceID(cubeID);
        return this._instanceData.mixFactors[instanceID];
    }

    addMesh(mesh: THREE.Mesh) {
        this._scene.add(mesh);
    }
}
