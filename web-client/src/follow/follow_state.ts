// this file created for prevent cyclic dependency between main.ts and connect.ts in follow.
import * as THREE from "three";
import Warehouse from "../model/warehouse";

let travellerIds = new Set<number>();
let followTargetId: number | null = null;

let followGetter: (() => THREE.Vector3) | null = null;

export function getTravellerIds() {
  return travellerIds;
}

export function setTravellerIds(ids: number[]) {
  travellerIds = new Set(ids);
}

export function getFollowTargetId() {
  return followTargetId;
}

export function setFollowTargetId(id: number | null) {
  followTargetId = id;
  if (followTargetId != null && !followGetter) {
    followGetter = () => {
      const c = Warehouse.current?.getCube(followTargetId!);
      return c?.additionalMesh.position ?? new THREE.Vector3(0, 0, 0);
    };
  }
}

export function getFollowGetter() {
  return followGetter;
}
