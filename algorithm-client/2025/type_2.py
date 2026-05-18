import asyncio
import random
import time

from algorithm_client import Client, Scenario, start_client
from algorithm_client.moves import Move
from algorithm_client.pending_move import MoveError
from settings import TOKEN, WS_URL

# leg state tracking
legs_state = {}

def get_legs(box_id):
    return legs_state.get(box_id, 'withdrawn')

# get the cube struct of a box depending on location
def get_box_at(x, y, z, cubes):
    """Retrieves the box object at a specific coordinate.

    Args:
        x: The x coordinate.
        y: The y coordinate.
        z: The z coordinate.
        cubes: The list of current boxes.

    Returns:
        The box object if found, otherwise None.
    """
    for cube in cubes:
        if cube.x == x and cube.y == y and cube.z == z:
            return cube
    return None

# get the cube struct of a box using its id
def get_box_with_id(id, cubes):
    for cube in cubes:
        if cube.id == id:
            return cube
    return None

# find the highest box in a stack
def get_highest_box(target, cubes):
    highest_box = target
    for cube in cubes:
        if cube.x == target.x and cube.y > highest_box.y and cube.z == target.z:
            highest_box = cube
    return highest_box

def update_stack_up(x, z, from_y, cubes):
    """Moves all boxes in a column above a certain height up by one level.
    Used to update internal state when a box below extends its legs.

    Args:
        x: The x coordinate of the column.
        z: The z coordinate of the column.
        from_y: The height at which to start lifting boxes.
        cubes: The list of current boxes.
    """
    stack = []
    for cube in cubes:
        if cube.x == x and cube.z == z and cube.y >= from_y:
            stack.append((cube, cube.y))
    stack.sort(key=lambda s: s[1], reverse=True)
    for cube, _ in stack:
        cube.y += 1

def update_stack_down(x, z, from_y, cubes):
    stack = []
    for cube in cubes:
        if cube.x == x and cube.z == z and cube.y >= from_y:
            stack.append((cube, cube.y))
    stack.sort(key=lambda s: s[1])
    for cube, _ in stack:
        cube.y -= 1

async def do_move(client, box, dx, dy, dz):
    """Attempts to move a box relative to its current position and updates its
    internal coordinates if successful.

    Args:
        client: The client interface.
        box: The box object to move.
        dx: Change in x direction.
        dy: Change in y direction.
        dz: Change in z direction.

    Returns:
        True if the move succeeded, False otherwise.
    """
    try:
        pending = await client.send_move(Move(box.id, dx, dy, dz))
        await pending.executed()
        box.x += dx
        box.y += dy
        box.z += dz
        return True
    except MoveError:
        return False

async def do_displace(client, box_id):
    """Attempts to displace the legs of a specific box.

    Args:
        box_id: The ID of the box to displace.

    Returns:
        True if displacement succeeded, False otherwise.
    """
    try:
        pending = await client.displace_legs(box_id)
        await pending.executed()
        legs_state[box_id] = 'displaced'
        return True
    except MoveError:
        return False

async def do_extend(client, box, cubes):
    """Attempts to extend the legs of a specific box, and updates the positions
    of any boxes resting on top of it if successful.

    Args:
        box: The box object to extend.
        cubes: The list of current boxes.

    Returns:
        True if extension succeeded, False otherwise.
    """
    try:
        pending = await client.extend_legs(box.id)
        await pending.executed()
        box_below = get_box_at(box.x, box.y - 1, box.z, cubes) if box.y > 0 else None
        if box.y == 0 or box_below is None or get_legs(box_below.id) != 'withdrawn':
            update_stack_up(box.x, box.z, box.y, cubes)
        legs_state[box.id] = 'extended'
        return True
    except MoveError:
        return False

async def do_retract(client, box, cubes):
    """Attempts to retract the legs of a specific box, and updates the positions
    of any boxes resting on top of it to fall down if successful.

    Args:
        box: The box object to retract.
        cubes: The list of current boxes.

    Returns:
        True if retraction succeeded, False otherwise.
    """
    try:
        pending = await client.retract_legs(box.id)
        await pending.executed()
        box_below = get_box_at(box.x, box.y - 1, box.z, cubes) if box.y > 0 else None
        if box.y > 0 and box_below is None:
            update_stack_down(box.x, box.z, box.y, cubes)
        legs_state[box.id] = 'displaced'
        return True
    except MoveError:
        return False

async def do_withdraw(client, box_id):
    """Attempts to withdraw the legs of a specific box.

    Args:
        box_id: The ID of the box to withdraw.

    Returns:
        True if withdrawal succeeded, False otherwise.
    """
    try:
        pending = await client.withdraw_legs(box_id)
        await pending.executed()
        legs_state[box_id] = 'withdrawn'
        return True
    except MoveError:
        return False

async def lift_obstruction(client, obs, cubes):
    """Attempts to lift an obstructing box by one Y level by extending its legs.
    Will first displace the supporting box below if necessary.

    Args:
        obs: The obstructing box to lift.
        cubes: The list of current boxes.

    Returns:
        True if the obstruction was successfully lifted, False otherwise.
    """
    if obs.y > 0:
        box_below = get_box_at(obs.x, obs.y - 1, obs.z, cubes)
        if box_below is not None and get_legs(box_below.id) == 'withdrawn':
            await do_displace(client, box_below.id)
    if not await do_displace(client, obs.id):
        return False
    if not await do_extend(client, obs, cubes):
        await do_withdraw(client, obs.id)
        return False
    return True

async def prepare_slide_out(client, target, cubes):
    """Prepares a target box to slide horizontally out from underneath a stack
    by nestling the box directly above it.

    Args:   
        target: The box that needs to slide out.
        cubes: The list of current boxes.

    Returns:
        Always returns True after making preparation attempts.
    """
    box_above = get_box_at(target.x, target.y + 1, target.z, cubes)
    if box_above is None:
        return True
    await do_withdraw(client, target.id)
    await do_displace(client, box_above.id)
    await do_extend(client, box_above, cubes)
    if target.y > 0:
        box_below = get_box_at(target.x, target.y - 1, target.z, cubes)
        if box_below is not None and get_legs(box_below.id) == 'withdrawn':
            await do_displace(client, box_below.id)
    return True

async def try_sideways_move(client, box, cubes, width, depth):
    """Attempts to move a box horizontally in any of the four adjacent valid
    directions that have proper support and are unobstructed.

    Args:
        box: The box to attempt sideways movement on.
        cubes: The list of current boxes.
        width: Scenario grid width.
        depth: Scenario grid depth.

    Returns:
        True if the box successfully moved in any direction, False otherwise.
    """
    for ddx, ddz in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
        bx = box.x + ddx
        bz = box.z + ddz
        if bx < 0 or bx >= width or bz < 0 or bz >= depth:
            continue
        if get_box_at(bx, box.y, bz, cubes) is not None:
            continue
        if box.y > 0:
            box_below = get_box_at(bx, box.y - 1, bz, cubes)
            if box_below is None:
                continue
        if await do_move(client, box, ddx, 0, ddz):
            return True
    return False

async def drop_target_one(client, target, cubes, width, depth):
    """Drops a target box down by exactly one Y level. If it cannot simply
    retract, it will attempt to move the supporting box sideways first.
    If the supporting box cannot move, it falls back to draining the column.

    Args:
        target: The box to drop.
        cubes: The list of current boxes.
        width: Scenario grid width.
        depth: Scenario grid depth.

    Returns:
        True if the target box successfully dropped, False otherwise.
    """
    box_below = get_box_at(target.x, target.y - 1, target.z, cubes)
    if box_below is None:
        return False

    await do_withdraw(client, box_below.id)
    await do_displace(client, target.id)
    if not await do_extend(client, target, cubes):
        await do_withdraw(client, target.id)
        return False

    if box_below.y > 0:
        box_below_below = get_box_at(box_below.x, box_below.y - 1, box_below.z, cubes)
        if box_below_below is not None and get_legs(box_below_below.id) == 'withdrawn':
            await do_displace(client, box_below_below.id)

    await do_withdraw(client, box_below.id)
    moved = await try_sideways_move(client, box_below, cubes, width, depth)

    if not moved:
        cleared = await clear_space_around(client, box_below.x, box_below.y, box_below.z, cubes, width, depth)
        if cleared:
            await do_withdraw(client, box_below.id)
            moved = await try_sideways_move(client, box_below, cubes, width, depth)

    if not moved:
        await do_retract(client, target, cubes)
        await do_withdraw(client, target.id)
        if not await drain_column_below(client, target, cubes, width, depth):
            return False
        return True

    if not await do_retract(client, target, cubes):
        await do_withdraw(client, target.id)
        return False

    await do_withdraw(client, target.id)
    return True

async def drain_column_below(client, target, cubes, width, depth):
    """Removes boxes from the bottom of a column until only the uppermost
    boxes (including the target) remain. Used when dropping a target box fails 
    due to horizontal immobility.

    Args:
        target: The box whose underlying column needs draining.
        cubes: The list of current boxes.
        width: Scenario grid width.
        depth: Scenario grid depth.

    Returns:
        True if the column was successfully drained, False otherwise.
    """
    column_x, column_z = target.x, target.z

    while True:
        below_boxes = []
        for y in range(target.y):
            b = get_box_at(column_x, y, column_z, cubes)
            if b is not None:
                below_boxes.append(b)

        if len(below_boxes) <= 1:
            return True

        lowest = below_boxes[0]
        second_lowest = below_boxes[1]

        await do_withdraw(client, lowest.id)
        await do_displace(client, second_lowest.id)
        if not await do_extend(client, second_lowest, cubes):
            await do_withdraw(client, second_lowest.id)
            return False

        await do_withdraw(client, lowest.id)
        moved = await try_sideways_move(client, lowest, cubes, width, depth)

        if not moved:
            cleared = await clear_space_around(client, lowest.x, lowest.y, lowest.z, cubes, width, depth)
            if cleared:
                await do_withdraw(client, lowest.id)
                moved = await try_sideways_move(client, lowest, cubes, width, depth)

        if not moved:
            await do_retract(client, second_lowest, cubes)
            await do_withdraw(client, second_lowest.id)
            return False

        if not await do_retract(client, second_lowest, cubes):
            await do_withdraw(client, second_lowest.id)
            return False
        await do_withdraw(client, second_lowest.id)

async def raise_target_one(client, target, cubes, width, depth):
    """Raises the target box by exactly one Y level.

    drain_column_below removes boxes from the bottom - raise does the inverse:
      1. displace + extend bottom - pushes stack up, gap at Y=0
      2. move a new box IN sideways (find_and_move_box_to)
      3. retract + withdraw old bottom

    Repeating this grows the column from the bottom, raising the target.

    Args:
        target: The box to raise.
        cubes: The list of current boxes.
        width: Scenario grid width.
        depth: Scenario grid depth.

    Returns:
        True if the target was successfully raised, False otherwise.
    """
    # get the bottom box of the column (at Y=0)
    bottom = get_box_at(target.x, 0, target.z, cubes)
    if bottom is None:
        return False

    # if the box directly above bottom has extended legs, retract + withdraw
    # it first (server blocks displace when box above has extended legs)
    box_above_bottom = get_box_at(bottom.x, bottom.y + 1, bottom.z, cubes)
    if box_above_bottom is not None and get_legs(box_above_bottom.id) == 'extended':
        await do_retract(client, box_above_bottom, cubes)
        await do_withdraw(client, box_above_bottom.id)

    # step 1: displace + extend bottom - pushes entire stack up, gap at Y=0
    await do_withdraw(client, bottom.id)
    await do_displace(client, bottom.id)
    if not await do_extend(client, bottom, cubes):
        await do_withdraw(client, bottom.id)
        return False

    # step 2: find a box from an adjacent column and move it INTO Y=0
    moved_in = await find_and_move_box_to(
        client, target.x, 0, target.z, cubes, width, depth
    )

    if not moved_in:
        # fallback: clear space around and retry to find a box to move in
        cleared = await clear_space_around(
            client, target.x, 0, target.z, cubes, width, depth
        )
        if cleared:
            moved_in = await find_and_move_box_to(
                client, target.x, 0, target.z, cubes, width, depth
            )

    if not moved_in:
        # undo extend if no support box could be found
        await do_retract(client, bottom, cubes)
        await do_withdraw(client, bottom.id)
        return False

    # step 3: retract + withdraw old bottom box, then new box at y=0 supports it
    await do_retract(client, bottom, cubes)
    await do_withdraw(client, bottom.id)
    return True

async def find_and_move_box_to(client, x, y, z, cubes, width, depth):
    """Finds a box at y=0 in any adjacent column and moves it to (x, 0, z).
    Uses the same nestle technique as drain_column_below:
      1. withdraw base box
      2. displace + extend box above (nestles box above onto base box)
      3. move candidate to (x,0,z)
      4. retract box above
    This only happens once the empty space has already been created by raise_target_one

    Args:
        x, y, z: The target position to fill.
        cubes: The list of current boxes.
        width: Scenario grid width.
        depth: Scenario grid depth.

    Returns:
        True if a box was successfully moved in, False otherwise.
    """
    for ddx, ddz in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
        sx = x + ddx
        sz = z + ddz
        if sx < 0 or sx >= width or sz < 0 or sz >= depth:
            continue
        candidate = get_box_at(sx, y, sz, cubes)
        if candidate is None:
            continue

        # step 1: withdraw candidate
        await do_withdraw(client, candidate.id)

        # step 2: if there's a box above, nestle it onto the candidate
        box_above = get_box_at(sx, y + 1, sz, cubes)
        if box_above is not None:
            await do_displace(client, box_above.id)
            if not await do_extend(client, box_above, cubes):
                await do_withdraw(client, box_above.id)
                continue

        # step 3: move candidate into the gap
        await do_withdraw(client, candidate.id)
        if await do_move(client, candidate, -ddx, 0, -ddz):
            # step 4: retract box_above - drops adjacent column to refill Y=0
            if box_above is not None:
                await do_retract(client, box_above, cubes)
                await do_withdraw(client, box_above.id)
            return True

        # undo the nestle if move failed
        if box_above is not None:
            await do_retract(client, box_above, cubes)
            await do_withdraw(client, box_above.id)
    return False

async def clear_space_around(client, x, y, z, cubes, width, depth):
    """Attempts to find and lift an adjacent blocking box around a specific coordinate
    to create horizontal breathing room.

    Args:
        x: The center x coordinate.
        y: The center y coordinate.
        z: The center z coordinate.
        cubes: The list of current boxes.
        width: Scenario grid width.
        depth: Scenario grid depth.

    Returns:
        True if space was cleared or is already clear, False otherwise.
    """
    for ddx, ddz in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
        bx = x + ddx
        bz = z + ddz
        if bx < 0 or bx >= width or bz < 0 or bz >= depth:
            continue
        obstruction = get_box_at(bx, y, bz, cubes)
        if obstruction is None:
            return True
        if await lift_obstruction(client, obstruction, cubes):
            return True
    return False

# main algorithm function
async def algorithm(client: Client, scenario: Scenario):
    global legs_state
    legs_state = {}

    if scenario.box_type != 2:
        await client.skip_scenario()
        return

    reqs = list(scenario.requirements)
    if len(reqs) != 1:
        await client.skip_scenario()
        return

    req = reqs[0]
    target = None
    for cube in scenario.start:
        if cube.id == req.id:
            target = cube
            break

    if target is None:
        await client.skip_scenario()
        return

    cubes = scenario.start
    width = int(scenario.width)
    height = int(scenario.height)
    depth = int(scenario.depth)

    for cube in cubes:
        await do_withdraw(client, cube.id)

    max_iterations = 10000
    stuck = 0
    last_pos = None

    for i in range(max_iterations):
        if target.x == req.x and target.y == req.y and target.z == req.z:
            break

        pos = (target.x, target.y, target.z)
        if pos == last_pos:
            stuck += 1
        else:
            stuck = 0
        last_pos = pos

        if stuck > 200:
            await client.fail_scenario()
            return

        # free target from stack if box above
        box_above = get_box_at(target.x, target.y + 1, target.z, cubes)
        if box_above is not None and (target.x != req.x or target.z != req.z):
            await prepare_slide_out(client, target, cubes)
            await do_withdraw(client, target.id)

        # Y descent before horizontal moves
        if target.y > req.y:
            await do_withdraw(client, target.id)
            if target.y == 0:
                break
            await drop_target_one(client, target, cubes, width, depth)
            continue

        # move in X direction
        if target.x != req.x:
            dx = 1 if target.x < req.x else -1
            await do_withdraw(client, target.id)

            obs = get_box_at(target.x + dx, target.y, target.z, cubes)
            if obs is not None:
                await lift_obstruction(client, obs, cubes)
                await do_withdraw(client, target.id)

            moved = await do_move(client, target, dx, 0, 0)
            if not moved:
                box_above = get_box_at(target.x, target.y + 1, target.z, cubes)
                if box_above is not None and get_legs(box_above.id) != 'extended':
                    await prepare_slide_out(client, target, cubes)
                    await do_withdraw(client, target.id)
                elif box_above is not None and get_legs(box_above.id) == 'extended':
                    await do_retract(client, box_above, cubes)
                    await do_withdraw(client, box_above.id)
                if target.y > 0:
                    support_box = get_box_at(target.x + dx, target.y - 1, target.z, cubes)
                    if support_box is None:
                        await drop_target_one(client, target, cubes, width, depth)
                else:
                    new_obs = get_box_at(target.x + dx, target.y, target.z, cubes)
                    if new_obs is not None:
                        await lift_obstruction(client, new_obs, cubes)
                        await do_withdraw(client, target.id)
            continue

        # move in Z direction
        if target.z != req.z:
            dz = 1 if target.z < req.z else -1
            await do_withdraw(client, target.id)

            obs = get_box_at(target.x, target.y, target.z + dz, cubes)
            if obs is not None:
                await lift_obstruction(client, obs, cubes)
                await do_withdraw(client, target.id)

            moved = await do_move(client, target, 0, 0, dz)
            if not moved:
                box_above = get_box_at(target.x, target.y + 1, target.z, cubes)
                if box_above is not None and get_legs(box_above.id) != 'extended':
                    await prepare_slide_out(client, target, cubes)
                    await do_withdraw(client, target.id)
                elif box_above is not None and get_legs(box_above.id) == 'extended':
                    await do_retract(client, box_above, cubes)
                    await do_withdraw(client, box_above.id)
                if target.y > 0:
                    support_box = get_box_at(target.x, target.y - 1, target.z + dz, cubes)
                    if support_box is None:
                        await drop_target_one(client, target, cubes, width, depth)
                else:
                    new_obs = get_box_at(target.x, target.y, target.z + dz, cubes)
                    if new_obs is not None:
                        await lift_obstruction(client, new_obs, cubes)
                        await do_withdraw(client, target.id)
            continue

        # Y ascent
        if target.y < req.y:
            await raise_target_one(client, target, cubes, width, depth)
            continue

async def main():
    scenarios = []
    """
    Edit this section to add which scenarios you want to run.
    Always use your token from the website. Example file path is shown as a comment.
    url = "ws://13.49.70.251:7071/ws" to run on the deployed server
    """
    for i in range (11, 18):  
        path = "" # f"/~/2025-RoboSim/tests/scenarios/Scenario {i}.json"
        scenarios.append(Scenario.from_file(path))

    await start_client(
        algorithm, token=TOKEN, name="Type 2", url=WS_URL
    )


if __name__ == "__main__":
    asyncio.run(main())
