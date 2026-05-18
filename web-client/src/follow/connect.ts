import Warehouse from "../model/warehouse";
import { setTravellerIds, setFollowTargetId } from "./follow_state"; //made new file to prevent cyclic dependency, thus make that link with connect.ts

import { Cube } from "../model/cube";
import {
    displayScenarioName,
    displayEndStateReached,
    resetEndStateReached,
} from "../ui/run-info";

import { clearError, showError, showInfo } from "./info";
import {
    Action,
    FollowEvent,
    StateMessage,
    AlgorithmInfo,
    BoxType,
} from "../../../server/src/types/index.ts";

export class WebClient {
    private source: EventSource | null = null;

    constructor() {
        this.connect();
    }

    connect() {
        const path_components = window.location.pathname.split("/");
        this.source = new EventSource(
            "/api/follow/" + path_components[path_components.length - 1],
        );

        this.source.addEventListener(FollowEvent.STATE, ({ data }) => {
            resetEndStateReached();

            clearError();

            const state = JSON.parse(data) as StateMessage;

            console.log(state);

            setTravellerIds(Array.isArray(state.traveller_ids) ? state.traveller_ids : []);

            Warehouse.current?.clear();

            Warehouse.current = new Warehouse(
                state.width,
                state.height,
                state.depth,
                state.box_type
            );

            for (const cube of state.cubes) {
                Warehouse.current.addCube(
                    new Cube(
                        cube.id,
                        cube.x,
                        cube.y,
                        cube.z,
                        state.box_type,
                        cube.legs_displaced,
                        cube.legs_extended,
                    ),
                );
            }

            const defaultTarget =
                (Array.isArray(state.traveller_ids) && state.traveller_ids.length > 0)
                ? state.traveller_ids[0]
                : (state.cubes && state.cubes.length > 0 ? state.cubes[0].id : null);

            setFollowTargetId(defaultTarget);

            // handle start/end cubes
            Warehouse.current.addStartEndCubes(true, state.start);

            Warehouse.current.addStartEndCubes(false, state.end);
            
            const corner1 = { x1 : state.exit_zone.x1, y1 : state.exit_zone.y1, z1 : state.exit_zone.z1};
            const corner2 = { x2 : state.exit_zone.x2, y2 : state.exit_zone.y2, z2 : state.exit_zone.z2};
            Warehouse.current.addExitCubes(corner1,corner2);

            const scenario_name = state.scenario_name;
            displayScenarioName(scenario_name);
        });

        this.source.addEventListener(FollowEvent.UPDATE, ({ data }) => {
            const action = JSON.parse(data) as Action;

            Warehouse.current?.applyAction(action);
        });

        this.source.addEventListener(FollowEvent.END, () => {
            console.log("End message recieved");
            displayEndStateReached();
        });

        this.source.addEventListener(FollowEvent.INFO, ({ data }) => {
            const info: AlgorithmInfo | null = JSON.parse(data);
            showInfo(info);
        });

        this.source.addEventListener(FollowEvent.CLIENT_NOT_FOUND, () => {
            showError("Algorithm Client not found");
        });
    }
}
