## Setup Instructions

To begin, install 
- Install NodeJS v20.18.2 LTS from [here](https://nodejs.org/en/download/)
- Install [Python](https://www.python.org/downloads/),
  [pip](https://pip.pypa.io/en/stable/installation/) (check if it's already installed with `pip --version`) and
  [hatch](https://hatch.pypa.io/latest/install/).
  
## Setting Up and Building the Project

To begin, install [Node.js](https://nodejs.org/en). 
Then, run `npm run setup` in 2025-Robosim. This will install the necessary dependencies for the
backend and frontend.

To build the server, run `npm run build` in the same directory. This will transpile the TypeScript
server code and place it in `build/server`. It will also build the frontend
using [Vite](https://vite.dev/), and place the built files in `build/client`.

## Set Variables

> [!Note]
> Never commit your `.env`and `.env.local` files to GitHub as they contain passwords! This should already be prevented on our project as they're in our `.gitignore` file

To run Robosim, you need to create a .env and a .env.local file in the 2025-Robosim directory. 

We have example .env files here:
[.env](.env.example)
[.env.local](.env.local.example)

## Setting Up The Database On Local Machines

1. Install the Docker Desktop app on your machine: https://docs.docker.com/desktop/setup/install/windows-install/ (This is the link for Windows, but other OS installs can be found on the website)
2. Either sign in or skip sign-in on the app
3. Leave the app running and return to your terminal for the code

## Running Robosim Locally

>[!Note]
>Always have your Docker app running before running Robosim locally, or it won't work!

Type `npm run start:local` into your terminal. This will start a web server,
which will serve the frontend files from the `build/client` directory. It will
also start a WebSocket server for algorithms to connect to.

The website will then be viewable at <http://localhost:3000>.

## Setting Up The Algorithm Client

>[!Note]
>Once you've made an account on the **local** Robosim site, copy and paste your token into your `.env.local` file as the data for the variable TOKEN. This is required to run algorithms! (You may also need to do this for .env if running algorithms on the deployed site, local and deployed tokens will be different)

(Some of these commands may seem repeated, but from testing it doesn't work without the repetition)

1. Cd into the `algorithm-client/package` directory.
2. Run `pip install -e .` in your terminal.
3. If you get an error, make sure you have Python installed - the terminal may suggest how. 
4. To build the package, run `hatch build`
5. Cd into the root directory of the project.
6. Create a virtual environment for Python: `python3 -m venv venv`
7. Activate the virtual environment with Linux: `source venv/bin/activate`, Windows: `venv\Scripts\activate`
8. Run `pip install hatch`
9. Cd back into the `algorithm-client/package` directory and run `hatch build`; this should create a wheel file in the `/dist` directory.
10. Install the package using `pip install WHEEL_FILE`  (Replace WHEEL_FILE with the name of the file, which should be something like: `algorithm_client-0.0.1-py3-none-any.whl`)
11. Run `pip install .` again 
12. If you want to be able to run fill-remove, cd into algorithm-client/algorithms/fill-remove and do `pip install -e .` to set it up.

## Running Algorithms

Make sure Robosim is running on your device

Open a fresh terminal to the one running Robosim. 

Cd into the `algorithm-client` directory.

From here, cd into the folder which contains the algorithm you want to run: `algorithms` for `mj-algorithm.py`, `2025` for `type_2.py` and the `fill-remove` algorithm can be run from just the root directory of the project.

To run an algorithm, type `python algorithm-name.py` into the terminal once in the right directory. (To run fill-remove, you can just type `fill-remove` in the terminal.

The algorithm should now be running and displayed on the website!
