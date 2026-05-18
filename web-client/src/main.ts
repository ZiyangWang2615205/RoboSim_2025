import "./styles/index.css";
import { Cube } from "./model/cube";
import Warehouse from "./model/warehouse";
import * as THREE from 'three';
import { BoxType } from "../../server/src/types";
import WebFont from 'webfontloader';

// The ratio of the height of the canvas to the height of the window
const framerate = 60;

let camera: THREE.PerspectiveCamera;
let canvas: HTMLCanvasElement;

let mouseX = 0, mouseY = 0, angle = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

// The time between frames in seconds
const deltaTime = 1 / framerate;

const dimensions = { width: 20, height: 10, depth: 20};
let warehouse = new Warehouse(dimensions.width, dimensions.height, dimensions.depth, BoxType.Type1, true);
Warehouse.current = warehouse;

let layout: number[][] = [];
type Position = { x: number, y: number, z: number };
let positions: Map<number, Position> = new Map();

for (let i = 0; i < dimensions.width; i++) {
    let row: number[] = [];
    for (let k = 0; k < dimensions.depth; k++) {
        row.push(0);
    }
    layout.push(row);
}

WebFont.load({
    google: {
        families: ['Oxanium']
    },
    active: () => {
        addBoxes(100);
        moveBoxes();
        render();
    }
});

function render(WIDTH_RATIO = 1, HEIGHT_RATIO = 1) {
    const renderer = new THREE.WebGLRenderer();
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / (window.innerHeight * HEIGHT_RATIO),
        1,
    );
    canvas = renderer.domElement;
    const scene = document.getElementById("scene");
    scene!.appendChild(canvas);
    canvas.id = "canvas";

    canvas.addEventListener("pointermove", onPointerMove);

    // disable this to turn off shadows
    // shadows can affect performance!!
    renderer.shadowMap.enabled = true;

    // Put the camera somewhere and make it look at the origin
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    window.addEventListener("resize", onWindowResize, true);

    function onWindowResize() {
        camera.aspect =
            (window.innerWidth * WIDTH_RATIO) /
            window.innerHeight /
            HEIGHT_RATIO;
        camera.updateProjectionMatrix();

        renderer.setSize(
            document.documentElement.clientWidth * WIDTH_RATIO,
            window.innerHeight * HEIGHT_RATIO,
        );

        windowHalfX = window.innerWidth / 2;
        windowHalfY = window.innerHeight / 2;
    }

    function animate() {
        let scenario = Warehouse.current;

        canvas.style.display = "block";

        if (scenario) {
            renderer.render(scenario.scene, camera);

            scenario.animateToTarget(deltaTime)
            
            // move the camera in a circle (rotation)
            let radius = 12;
            angle += (850*mouseX)/window.innerWidth;

            camera.position.x = (Math.cos(angle*0.00001) * radius) + dimensions.width/2;
            camera.position.z = (Math.sin(angle*0.00001) * radius) - dimensions.depth/2;

            // move the camera up and down, and stop it from going through the floor
            // or too high up
            if (camera.position.y - mouseY * 0.0001 < 0) camera.position.y = 0;
            else if (camera.position.y - mouseY * 0.0001 > 20) camera.position.y = 20;
            else camera.position.y -= mouseY * 0.0001;
            
            camera.lookAt(dimensions.width/2, 0, -dimensions.depth/2);
        }
    }

    renderer.setSize(
        document.documentElement.clientWidth * WIDTH_RATIO,
        window.innerHeight * HEIGHT_RATIO,
    );

    setInterval(animate, deltaTime * 1000);

    animate();
}

function onPointerMove(event: MouseEvent){
    mouseX = event.clientX - windowHalfX;
	mouseY = event.clientY - windowHalfY;
}


enum Direction {
    NORTH,
    EAST,
    SOUTH,
    WEST
}

function addBoxes(amount: number){
    for (let id = 1; id <= amount; id++){
        let x = Math.floor(Math.random() * dimensions.width);
        let z = Math.floor(Math.random() * dimensions.depth);
        warehouse.addCube(new Cube(id, x, layout[x][z], z, BoxType.Type1, false, false, true));
        positions.set(id, {x: x, y: layout[x][z], z: z});
        layout[x][z] += 1;
    }
}

    // move each box randomly at a random interval
function moveBoxes(){
    for (let pos of positions){
        let boxID = pos[0];
        let interval = (((Math.random()) * 4) + 1) * 1000
        setInterval(moveRandom, interval, boxID);
    }
}

//function that moves boxes randomly
function moveRandom(boxID: number) {
    let position = positions.get(boxID);

    if (!position) return;

    let currentStackHeight = layout[position.x][position.z];
    let targetPosition: Position;

    let dir: Direction = Math.floor(Math.random() * 4);

    switch (dir) {
        case Direction.NORTH:
            targetPosition = { x: position.x, y: position.y, z: position.z + 1 };
            if (position.z + 1 >= dimensions.depth) return;
            break;
        case Direction.EAST:
            targetPosition = { x: position.x + 1, y: position.y, z: position.z };
            if (position.x + 1 >= dimensions.width) return;
            break;
        case Direction.SOUTH:
            targetPosition = { x: position.x, y: position.y, z: position.z - 1 };
            if (position.z - 1 < 0) return;
            break;
        case Direction.WEST:
            targetPosition = { x: position.x - 1, y: position.y, z: position.z };
            if (position.x - 1 < 0) return;
            break;
    }

    const targetStackHeight = layout[targetPosition.x][targetPosition.z];

    if (position.y != currentStackHeight - 1) return;

    if (!(
        targetStackHeight == currentStackHeight ||      // Goes up one
        targetStackHeight == currentStackHeight - 1 ||  // Goes across
        targetStackHeight == currentStackHeight - 2     // Goes down one
    )) return;

    let cube = warehouse.getCube(boxID);

    if (!cube) return;

    cube.position = {
        x: targetPosition.x,
        y: targetStackHeight,
        z: targetPosition.z
    };

    positions.set(boxID, { x: targetPosition.x, y: targetStackHeight, z: targetPosition.z });

    layout[targetPosition.x][targetPosition.z] += 1;
    layout[position.x][position.z] -= 1;
}
