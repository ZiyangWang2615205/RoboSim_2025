# algorithm client Python Package

This is a python package to facilitate your development of an algorithm client.

## What is an algorithm client?

An Algorithm Client allows you to test algorithms and send them to the
server. It is designed to be flexible and can run any algorithm packaged
in the correct format.

## Installation

You need to have [Python 3.8+](https://www.python.org/downloads/) and pip
installed.

First, download the [wheel file](../../dist/algorithm_client-0.0.1-py3-none-any.whl).

Then, install the package using `pip install WHEEL_FILE`.

Alternatively, download the [source code](../../dist/algorithm_client-0.0.1.tar.gz),
extract it by running `tar -xzf algorithm-client.tar.gz`, enter the extracted
directory and run `pip install .`.

## Usage

Your algorithm will be tested against an initial and final state via the main
server. Your algorithm is expected to send a set of moves that it wants to make
to take the boxes from the designated initial configuration of boxes to the
expected final configuration. Some boxes may not be included in the final
configuration, meaning that you can move them anywhere.

An algorithm is a function that takes a `Client` and a `Scenario`, and
repeatedly sends moves to the server until the scenario is complete.

Here's an example:

```python
import asyncio
import random

from algorithm_client.client import AuthOptions, Client
from algorithm_client.scenario import Scenario
from algorithm_client.start import start_client


async def algorithm(client: Client, scenario: Scenario):
    """A simple algorithm that repeatedly chooses a random move."""
    state = scenario.start

    while True:
        moves = state.get_all_available_moves(
            width=scenario.width,
            height=scenario.height,
            depth=scenario.depth,
        )

        move = random.choice(moves)

        pending_move = await client.send_move(move)
        # Wait for the move to finish executing
        await pending_move.executed()

        # Apply the move to our local state
        state.apply_move(move)
```

You can then start the client like so:

```python
asyncio.run(
    start_client(
        algorithm,
        token = "YOUR-TOKEN",
        name = "Your Algorithm Name"
    )
)
```

This will run the algorithm on each scenario in turn, using your token for authentication.

A few things to note about this example:

- It is required to authenticate your algorithm with the server. This is done
  through the use of a token. You can retrive your token from the account
  page on the RoboSim website. You then need to add it to your algorithm file as shown above.

- The algorithm uses `scenario.start` - a `Cubes` object - to manage the state
  of the boxes in the scenario. This class is not optimized for performance,
  and you may want to create your own implementation of box state, depending
  on your needs.

- When a move is sent to the server, it is either accepted or rejected. Once
  it has been accepted, a move will take about a second to be executed.
  `client.send_move()` returns a `PendingMove` object, which can be used to
  wait for the move to be accepted or executed.

### Different box types

Scenarios can have two different types of boxes. The first type is less
restricted in how it can move, while the second type of box has legs. You can
move the legs of a box using the `displace_legs()`, `retract_legs()`,
`extend_legs()` and `retract_legs()` methods of the `Client` class.

A scenario has a `box_type` attribute, which can be used to determine the type
of the boxes in the scenario.

```python
async def type_2_algorithm(client: Client, scenario: Scenario) -> None:
    if scenario.box_type == 2:
        for cube in scenario.start:
            await client.displace_legs(cube.id)
```

### Adding your algorithm to the leaderboard

If you want your algorithm to be featured on the leaderboard, you can set the
`publish_runs` option to `True` in `start_client()`:

```python
asyncio.run(
    start_client(
        algorithm,
        token = "YOUR-TOKEN",
        name = "Your Algorithm Name",
        publish_runs = True
    )
)
```

### Decentralized algorithms

Decentralized algorithms are simple to implement asynchronously. Here's
another simple example:

```python
import asyncio
import random

from algorithm_client.client import Client
from algorithm_client.pending_move import MoveError
from algorithm_client.scenario import Scenario


async def node_algorithm(client: Client, scenario: Scenario, id: int) -> None:
    """Manages a specific node in a decentralized algorithm."""
    state = scenario.start

    while True:
        moves = state.get_available_moves(
            id,
            width=scenario.width,
            height=scenario.height,
            depth=scenario.depth,
        )

        move = random.choice(moves)
        pending_move = await client.send_move(move)
        try:
            await pending_move.executed()
            state.apply_move(move)
        except MoveError:
            pass


async def algorithm(client: Client, scenario: Scenario) -> None:
    await asyncio.gather(
        *(node_algorithm(client, scenario, box.id) for box in scenario.start)
    )
```

This algorithm is similar to the one above, but it chooses a random move for
each box, rather than for all the boxes. This approach can allow for move
conflicts, if e.g. two boxes try to move to the same place. In this case, the
move will be rejected by the server and `pending_move.executed()` will raise a
`MoveError`. We guard against this by catching the error and trying again.

### Skipping and failing scenarios

You can skip and fail a scenario using the `skip_scenario()` and
`fail_scenario()` methods, respectively.

Skipping a scenario should be done at the start of the algorithm, and is useful
for scenarios that you don't want to solve in the first place. For example,
many algorithms only work on one type of box, in which case they should skip
scenarios involving the other type.

Failing a scenario should be done when your algorithm fails to solve the
scenario. Note that if an algorithm takes too long to run on a scenario, or
disconnects, the scenario will be failed on the server side.

Below is a simple example:

```python
async def algorithm(client: Client, scenario: Scenario) -> None:
    if scenario.box_type == 2:
        await client.skip_scenario()
        return

    # Your algorithm runs, but can't find a solution...

    await client.fail_scenario()
```

### Using custom scenarios

If you don't want to use the default scenarios, you can define your own custom scenarios.
Your algorithm will be run on these instead of the default ones.

You will need to pass in a list of Scenario objects to the `custom_scenarios` parameter of the `start_client` function.
You cannot submit scenarios if you have any that are completely identical
in every field.

Below is an example:

```python
my_scenario1 = Scenario(
    width=5,
    height=5,
    depth=5,
    start=Cubes([Cube(id=1, x=0, y=0, z=0)]),
    requirements=Cubes([Cube(id=1, x=1, y=0, z=0)]),
    name="my_scenario1",
)
my_scenario2 = Scenario(
    width=5,
    height=5,
    depth=5,
    start=Cubes([Cube(id=1, x=0, y=0, z=0), Cube(id=2, x=1, y=0, z=0)]),
    requirements=Cubes([Cube(id=1, x=1, y=0, z=3)]),
    name="my_scenario2",
)

asyncio.run(
    start_client(
        algorithm,
        token = "YOUR-TOKEN",
        name = "Your Algorithm Name",
        custom_scenarios=[my_scenario1, my_scenario2],
    )
)
```

#### Using downloaded scenarios

You can also use scenarios that you have downloaded from the playground.

You can extract the scenario from a downloaded file by using the
`Scenario.from_file(file_path: str)` function.
You can then use this scenario in `custom_scenarios` as above.

For example:

```python
    my_scenario3 = Scenario.from_file("/path/to/file/scenario.json")
```

Note: the path to the file must be absolute!

### Logging

The algorithm client supports a logging functionality, where it will output
the state of your algorithm to a file.

To enable this, you need to pass in a file path to the `log_file` parameter of the `start_client` function.
This will be the file that the logs are written to.

For example:

```python
asyncio.run(
    start_client(
        algorithm,
        token="YOUR-TOKEN",
        name="Your Algorithm Name",
        log_file="/my/file/path",
    )
)
```

Note: the path to the file must be absolute!

### Considerations

- The client manages the handling incoming messages and running the algorithm
  asynchronously. This means that long-running, blocking operations on the
  main thread should be avoided. Use `asyncio.loop.run_in_executor()` to run
  operations on a separate thread or process.
