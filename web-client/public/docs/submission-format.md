# Submission Format

Before reading this file, make sure you have read [how to run algorithm](/instructions?doc=getting-started).

---

## What is a submission?

A submission is a Python program that connects to the RoboSim server and solves scenarios.

Your submission must:

- define an `async algorithm(client, scenario)` function
- call `start_client(...)`
- provide a valid authentication token

---

## Minimal example

```python
import asyncio

from algorithm_client.client import Client
from algorithm_client.scenario import Scenario
from algorithm_client.start import start_client

TOKEN = "YOUR-TOKEN"


async def algorithm(client: Client, scenario: Scenario) -> None:
    state = scenario.start

    while True:
        moves = state.get_all_available_moves(
            width=scenario.width,
            height=scenario.height,
            depth=scenario.depth,
        )

        if not moves:
            await client.fail_scenario()
            return

        move = moves[0]
        pending_move = await client.send_move(move)
        await pending_move.executed()
        state.apply_move(move)


asyncio.run(
    start_client(
        algorithm,
        token=TOKEN,
        name="My Algorithm",
        url = "could be your localhost if you want"
    )
)
```
---

## File structure

You can submit either:

Single file (recommended):

```text
simple_algorithm.py
```

Multi-file project:

```text
my_algorithm/
├── main.py
├── utils.py
```

---

## Scenarios

Your algorithm will be tested against server-provided scenarios.

A scenario includes:

dimensions (width, height, depth)
initial state (start)
target state (requirements)
box type (box_type)

You may also provide custom scenarios:

```python
from algorithm_client.scenario import Scenario

scenario = Scenario.from_file("/absolute/path/to/file.json")

asyncio.run(
    start_client(
        algorithm,
        token="YOUR-TOKEN",
        name="My Algorithm",
        url="xxx",
        custom_scenarios=[scenario],
    )
)
```
---

## Running your submission

Run your algorithm:

```text
python simple_algorithm.py
```
---

## Notes:

1.Always await move execution before updating state
2.Use skip_scenario() or fail_scenario() when needed
3.Avoid blocking operations in async code


