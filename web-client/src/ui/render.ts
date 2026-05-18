import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js"; 
import Warehouse from "../model/warehouse.js";
import { canvasOnPointer, mouse } from "./select.js";

// The ratio of the height of the canvas to the height of the window
const framerate = 60;
export let camera: THREE.PerspectiveCamera; // camera to handling. 
export let canvas: HTMLCanvasElement;

let followGetter: (() => THREE.Vector3) | null = null;
//let followSpherical: THREE.Spherical | null = null;
const _tmpVec = new THREE.Vector3();
//const _tmpSph = new THREE.Spherical();


// store controls to access from external
let controls: OrbitControls | null = null;

// type for snap coordinate
export type ViewSnapshot = {
  position: THREE.Vector3; // coordinate of camera
  target: THREE.Vector3; // view point target of camera
};

// function to capture current target and camera position
export function captureCurrentView(): ViewSnapshot | null {
  if (!camera || !controls) return null;

  return {
    position: camera.position.clone(),
    target: controls.target.clone(),
  };
}

// function to restore last position and target
export function restoreView(snapshot: ViewSnapshot) {
  if (!camera || !controls) return;

  camera.position.copy(snapshot.position);
  controls.target.copy(snapshot.target);

  clampCameraToWarehouseFloor();
  controls.update();
}


// The time between frames in seconds
const deltaTime = 1 / framerate;
//------------------------------------------
const FLOOR_Y = 0;
const MIN_CAMERA_Y = FLOOR_Y + 0.1; // camera cannot go under y 0.1

function clampCameraToWarehouseFloor() {
  if (!camera) return;

  if (camera.position.y < MIN_CAMERA_Y) {
    camera.position.y = MIN_CAMERA_Y;
  }
}
// -----------------------------------
function updateZoomLimitsFromWarehouse() { // now min and max distance will decidedd by size of warehouse
  if (!controls || !Warehouse.current) return;

  const w = Warehouse.current.width;
  const h = Warehouse.current.height;
  const d = Warehouse.current.depth;

  const diagonal = Math.sqrt(w * w + h * h + d * d); // calculate diagonal distance of warehouse for getting ratio of distance of view from warehouse. 
  controls.minDistance = Math.max(2, diagonal * 0.08); // ratio 0.08 prevent minus value
                                                      // 2 and 20 are min and max value apart from size of warehouse 
  controls.maxDistance = Math.max(20, diagonal * 2.5); // ratio 2.5 is max value that can see whole warehouse but not too far
  // this calculation is for bounding box based camera control. 
}

function onMouseMove( event: MouseEvent ) { // click and drag move by mouse.

    event.preventDefault();

    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    // updateRayHelper();
}

//used for replay repeatedly
let renderer: THREE.WebGLRenderer | null = null;
let initialized = false;
let timerId: number | null = null;

// === Top-down view preset ===
// center: camera view is center of the warehouse 
export function setTopDown( // instantly move into right top of the box
  center: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
  distance = 25
) {
  if (!camera || !controls) return;
 
  camera.position.set(center.x, center.y + distance, center.z + 0.001);
  camera.up.set(0, 1, 0);
  controls.target.copy(center);
  
  clampCameraToWarehouseFloor();
  controls.update();
}

// continuously update the target coordinate for topdown view
export function startTopDownFollow(getPosition: ()=> THREE.Vector3) {
    if (!controls) return;
    const targetPos = getPosition();
    setTopDown(targetPos);

    controls.enableRotate = false;
    controls.update();

    startFollowing(getPosition);
}

export function stopTopdown(){
    followGetter = null;
    if (controls) {
        controls.enableRotate = true;
    }
}

//move instantly into selected id box's coordinate.
export function snapFollowTo(targetPos: THREE.Vector3) {
  if (!camera || !controls) return;

  // keep the offset of the current viewing target(controls.target)
  const offset = new THREE.Vector3().subVectors(camera.position, controls.target);

  // instantly change the target to new pos.
  controls.target.copy(targetPos);

  // camera also change its pos to the target
  camera.position.copy(targetPos).add(offset);
 
  clampCameraToWarehouseFloor();

  controls.update();
}

// continuously update the target coordinate for following view
export function startFollowing(getPosition: () => THREE.Vector3) {
  followGetter = getPosition;
  
  if (controls) {
    controls.enablePan = false;        // make target fix to middle
    controls.update();
  }
}
export function stopFollowing() {
  followGetter = null;
  if (controls) {
    controls.enablePan = true; 
    controls.enableRotate = true;       
  }
}


export async function render(WIDTH_RATIO = 1, HEIGHT_RATIO: number = 1) {

    //avoid render again when replay repeatedly
    if(initialized) return;
    initialized = true;

    const renderer = new THREE.WebGLRenderer({antialias:true});
    camera = new THREE.PerspectiveCamera(
        45,
        window.innerWidth / (window.innerHeight * HEIGHT_RATIO),
        1,
    );
    canvas = renderer.domElement;
    document.body.appendChild(canvas);
    document.addEventListener("mousemove", onMouseMove );
    canvas.id = "canvas";

    canvas.addEventListener("pointermove", canvasOnPointer);

    renderer.setSize(
        window.window.innerWidth * WIDTH_RATIO,
        window.innerHeight * HEIGHT_RATIO,
    );

    // set the camera and centre it (20x20, hardcoded)
    camera.position.set(9.5, 5, 9.5);
    camera.lookAt(9.5, 0, -9.5);

    // add orbit controls to the camera
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(9.5, 0, -9.5);

    //controls.minDistance = 2;   // minimum zoom distance
    //controls.maxDistance = 100; // maximum zoom distance
    updateZoomLimitsFromWarehouse(); 

    controls.maxPolarAngle = Math.PI - 0.01; // limit orbitcontrols to camera cannot go under floor

    window.addEventListener("resize", onWindowResize, true);

    function onWindowResize() {
        camera.aspect =
            (window.innerWidth * WIDTH_RATIO) /
            window.innerHeight /
            HEIGHT_RATIO;
        camera.updateProjectionMatrix();

        renderer.setSize(
            window.innerWidth * WIDTH_RATIO,
            window.innerHeight * HEIGHT_RATIO,
        );
    }

    function animate() {
        if (!camera || !controls) return;
        const scenario = Warehouse.current;

        canvas.style.display = "block";

        if (scenario) {
          updateZoomLimitsFromWarehouse();
            scenario.animateToTarget(deltaTime);
            scenario.animateLegs(deltaTime);
        }

        const smooth = 0.05 // bigger value : ligth camera move
                            // smaller value : heavy camera move

        if (followGetter) {
            // get the current location of target cube
            const targetPos = followGetter();

            // calculate the difference (delta) of last fram's target location (controls.target)
            //  and current frame's target location (targetPos)
            _tmpVec.copy(targetPos).sub(controls.target).multiplyScalar(smooth);

            // update controls.target into new locations
            //controls.target.copy(targetPos);
            controls.target.add(_tmpVec);

            // add amount of delta that cube move to the camera location
            camera.position.add(_tmpVec);

        }
        clampCameraToWarehouseFloor();
        controls.update();
        canvas.style.display = "block";

        if (scenario) {
            renderer.render(scenario.scene, camera);
        }
    }


    setInterval(animate, deltaTime * 1000);
    //setInterval(animate, deltaTime * 2000)

    animate();
}

/*export function clearWarehouseScene() {
  const scenario = Warehouse.current;
  if (!scenario) return;

  //clear all items in scene
  while (scenario.scene.children.length > 0) {
    const obj = scenario.scene.children.pop()!;
    scenario.scene.remove(obj);

    // release boxes
    // @ts-ignore
    if (obj.geometry) obj.geometry.dispose?.();
    // @ts-ignore
    if (obj.material) {
      // @ts-ignore
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
      // @ts-ignore
      else obj.material.dispose?.();
    }
  }
}*/

// freezes camera controls so the mouse can hover over blocks without moving the camera (used by insert mode)
export function lockControls() {
    if (!controls) return;
    controls.enableRotate = false;
    controls.enablePan = false;
    controls.enableZoom = false;
}

// restores camera controls when exiting insert mode
export function unlockControls() {
    if (!controls) return;
    controls.enableRotate = true;
    controls.enablePan = true;
    controls.enableZoom = true;
}