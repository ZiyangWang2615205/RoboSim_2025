# Documentation file explain how to run algorithms 

Before we start the quick introduction of running algorithms,
We strongly recommend you to read the [detailed document](https://cautious-adventure-plj4wz9.pages.github.io/).
By this file, you will figure out what is **_algorithm client package_**.

---

# Algorithm Client

A Python client package for interacting with the RoboSim algorithm service.

## Requirements

1.Python 3.8 or higher: [Python 3.8+](https://www.python.org/downloads/)
2._**pip**_ installed

---

## Installation

We recommend installing the package in a virtual environment.

### 1. Create and activate a virtual environment

From your project root directory (for example, `2025-RoboSim`), run:

```text
python3 -m venv venv
source venv/bin/activate
```

---

### 2. Install the package

You can install the package using either a wheel file or the source archive.

#### Option A: Install from wheel

Download the wheel file: [wheel file](/docs/algorithm_client-0.0.1-py3-none-any.whl)

Then install it with: 

```text
pip install WHEEL_FILE_NAME.whl
```
---

#### Option B: Install from source

Download the source archive: [source code](/docs/algorithm_client-0.0.1.tar.gz)

extract it by running :

```text
tar -xzf algorithm-client.tar.gz
```


then enter the extracted directory and run:

```text
pip install .
```

---

## Usage

After installation, you can import the package in Python:

```python
import algorithm_client
```

---
## Algorithm client should then be ready

You will find that algorithm client is under _your_root_dir/venv/lib/python/site-packages/_ .

If you want to run algorithm in our website. Don't forget add our website url in:

```python
asyncio.run(
    start_client(
        algorithm,
        token = "YOUR-TOKEN",
        name = "Your Algorithm Name",
        url = "ws://our_web_url/ws"
    )
)

```
---

## Quick start algorithm: Simple Algorithm

To help you make a quick start of our project, we provide a Simple Algorithm as an example: 

[simple_algorithm.py](/docs/simple_algorithm.py)

You could copy this python file and put it under _site-packages/_

Then you could cd into _site-packages/_ and run: (If you name it simple_algorithm.py)

```text
python simple_algorithm.py
```

After that, you will find your algorithm running in our website!

---

## Introduction of Simple Algorithm

The algorithm selects a box that is not yet in its target position and moves it step by step until it reaches the correct location.

It uses a simple strategy:
At each step, check all possible moves
Choose the move that gets the box closest to the target
Repeat until the target is reached

This is a _**greedy algorithm based on Manhattan distance**._

