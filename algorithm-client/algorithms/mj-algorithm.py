import asyncio
import heapq
import copy
from typing import List, Tuple, Set
from algorithm_client.client import Client
from algorithm_client.scenario import Scenario
from algorithm_client.cubes import Cube, Cubes
from algorithm_client.moves import Move
from algorithm_client.start import start_client
from settings import TOKEN, WS_URL


class AStarNode:
    def __init__(self, cube: Cube, state: Cubes, g: int, h: int, parent: 'AStarNode' = None, move: Move = None):
        self.cube = cube
        self.state = state
        self.g = g  # Cost from start
        self.h = h  # Heuristic to goal
        self.f = g + h  # Total cost
        self.parent = parent
        self.move = move

    def __lt__(self, other):
        return self.f < other.f

def manhattan_distance(cube: Cube, target: Cube) -> int:
    """Calculate Manhattan distance between two cubes."""
    return abs(cube.x - target.x) + abs(cube.y - target.y) + abs(cube.z - target.z)

def reconstruct_path(node: AStarNode) -> List[Move]:
    """Reconstruct the path from the goal node to the start."""
    path = []
    current = node
    while current.move is not None:
        path.append(current.move)
        current = current.parent
    return path[::-1]

async def a_star_pathfinding(client: Client, scenario: Scenario, box_id: int, target: Cube, state: Cubes) -> List[Move]:
    """Find a path for a box to its target using A*."""
    start_cube = state.get_cube(box_id)
    if not start_cube:
        print(f"Box {box_id} not found in state")
        return []

    open_set: List[AStarNode] = []
    heapq.heappush(open_set, AStarNode(start_cube, state, 0, manhattan_distance(start_cube, target)))
    closed_set: Set[Tuple[int, int, int]] = set()

    while open_set:
        current_node = heapq.heappop(open_set)
        current_cube = current_node.cube
        current_state = current_node.state

        if current_cube.x == target.x and current_cube.y == target.y and current_cube.z == target.z:
            print(f"ðŸŽ‰ Hooray! Path found for box {box_id} from ({start_cube.x}, {start_cube.y}, {start_cube.z}) to ({target.x}, {target.y}, {target.z})! ðŸŽ‰")
            return reconstruct_path(current_node)

        position = (current_cube.x, current_cube.y, current_cube.z)
        if position in closed_set:
            continue
        closed_set.add(position)

        moves = current_state.get_available_moves(box_id, int(scenario.width), int(scenario.height), int(scenario.depth))
        move_list = moves.get_moves()

        for move in move_list:
            new_state = copy.deepcopy(current_state)
            new_state.apply_move(move)
            new_cube = new_state.get_cube(box_id)

            g = current_node.g + 1
            h = manhattan_distance(new_cube, target)
            new_node = AStarNode(new_cube, new_state, g, h, current_node, move)
            heapq.heappush(open_set, new_node)

    print(f"No path found for box {box_id} from {start_cube.x}, {start_cube.y}, {start_cube.z} to {target.x}, {target.y}, {target.z}")
    return []

async def clear_blocking_boxes(client: Client, scenario: Scenario, box_id: int, state: Cubes, target_cube: Cube) -> bool:
    """Move boxes blocking the target box to allow it to move."""
    current_cube = state.get_cube(box_id)
    if not current_cube:
        print(f"Target box {box_id} not found in state")
        return False

    # Get all cubes dynamically by checking possible IDs
    all_cubes = [cube for cube_id in range(int(scenario.width) * int(scenario.height) * int(scenario.depth))
                 if (cube := state.get_cube(cube_id)) is not None]
    target_stack = [c for c in all_cubes if c.x == current_cube.x and c.z == current_cube.z]
    target_stack.sort(key=lambda cube: cube.y, reverse=True)

    # Check if target box is already at the top
    if target_stack and target_stack[0].id == box_id:
        return True

    # Clear blocking boxes above the target
    blocking_cubes = [c for c in target_stack if c.y > current_cube.y]
    for blocking_cube in blocking_cubes:
        moves = state.get_available_moves(blocking_cube.id, int(scenario.width), int(scenario.height), int(scenario.depth))
        move_list = moves.get_moves()

        if not move_list:
            print(f"No moves available for blocking box {blocking_cube.id}")
            return False

        # Move the blocking box anywhere it can go
        for move in move_list:
            new_x = blocking_cube.x + move.dx
            new_y = blocking_cube.y + move.dy
            new_z = blocking_cube.z + move.dz
            if (0 <= new_x < int(scenario.width) and 0 <= new_z < int(scenario.depth) and 0 <= new_y < int(scenario.height) and
                not any(c.x == new_x and c.z == new_z and c.y == new_y for c in all_cubes if c.id != blocking_cube.id)):
                try:
                    print(f"Moving blocking box {blocking_cube.id}: {move.__dict__}")
                    pending_move = await client.send_move(move)
                    await pending_move.executed()
                    state.apply_move(move)
                    break
                except Exception as e:
                    print(f"Failed to move blocking box {blocking_cube.id}: {e}")
                    continue
        else:
            print(f"Could not move blocking box {blocking_cube.id}")
            return False

    return True

async def algorithm(client: Client, scenario: Scenario):
    """Main algorithm to move boxes to their target locations."""
    print(f"Starting scenario: {scenario.name}")
    state = copy.deepcopy(scenario.start)
    start_set = set((cube.id, cube.x, cube.y, cube.z) for cube in state)

    for target_cube in scenario.requirements:
        if (target_cube.id, target_cube.x, target_cube.y, target_cube.z) in start_set:
            continue

        box_id = target_cube.id
        if not await clear_blocking_boxes(client, scenario, box_id, state, target_cube):
            print(f"Failed to clear blocking boxes for box {box_id}")
            await client.fail_scenario()
            return

        path = await a_star_pathfinding(client, scenario, box_id, target_cube, state)
        if not path:
            print(f"No path found for box {box_id}")
            await client.fail_scenario()
            return

        for move in path:
            try:
                pending_move = await client.send_move(move)
                await pending_move.executed()
                state.apply_move(move)
                print(f"Executed move for box {box_id}: {move.__dict__}")
            except Exception as e:
                print(f"Move failed: {e}")

def main():
    asyncio.run(
        start_client(
            algorithm,
            token=TOKEN,
            name="A* Client",
            url=WS_URL,
        )
    )

if __name__ == "__main__":
    main()
