import { BoxType } from "../../../server/src/types"
import Warehouse from "../model/warehouse"

export type WarehouseData = {
    type: BoxType
    sceneDimensions: {
        width: number,
        height: number,
        depth: number
    },
    cubes: {
        id: number,
        x: number,
        y: number,
        z: number,
        legsDisplaced: boolean,
        legsExtended: boolean
    }[]
}

export function getState(warehouse : Warehouse) : any {
    const state =
        warehouse.cubes.map(cube => {
            return {
                id: cube.id,
                x: cube.x,
                y: cube.y,
                z: cube.z
            }
        });
    
    return state;
};

function getSceneData(warehouse : Warehouse) : WarehouseData {
    let sceneData;
    sceneData = {
        type: warehouse.boxType,
        sceneDimensions: {
            width: warehouse.width,
            height: warehouse.height,
            depth: warehouse.depth
        },
        
        cubes: warehouse.cubes.map(cube => {
            return {
                id: cube.id,
                x: cube.x,
                y: cube.y,
                z: cube.z,
                legsDisplaced: cube.legsDisplaced,
                legsExtended: cube.legsExtended
            }
        })
    }
    return sceneData;
};

function saveScene(filename : string, jsonData : string) {
    // const filePath = `${../saveload/save}/${filename}`;
    const element = document.createElement('a')
    element.setAttribute('href', 'data:application/json;charset=utf8,' + encodeURIComponent(jsonData))
    element.setAttribute("download", filename)
    document.body.appendChild(element)
    element.click();
    document.body.removeChild(element)
}

export function sceneToJson(scenario : Warehouse) {
    const sceneData = getSceneData(scenario);
    let jsonSceneData = JSON.stringify(sceneData, null, 2);
    saveScene("scene", jsonSceneData);
}
