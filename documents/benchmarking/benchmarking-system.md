# Benchmarking and Leaderboard system

## System Overview

The Leaderboard System displays, sorts, filters and manages algorithm benchmark runs. It allows users to view previous runs, filter by specific parameters (scenario, author, completion status), delete their own runs and monitor actively running algorithms in real-time.

Frontend: main.ts 
- handles the UI rendering, sorting, click listeners and live connections

API route: server/src/api/leaderboard.ts
- handles requests, authentication checks and parameter parsing

Database: server/src/db_handler.ts
- handles SQL query generation

## Frontend Architecture

Column sorting is handled on the frontend to minimise database calls. The UI translates the clicked HTML column index into database keys using a sortKeys dictionary array.
For maximum performance and to avoid memory leaks, the table is updated via a full DOM wipe (container.innerHTML = '').
Because this destroys attached event listeners, the attachRowActions() function is called at the end of renderTable() to wire the Play/Delete buttons to the newly generated rows. 

## Backend Architecture

The /benchmarks route accepts multiple optional query parameters (filter, status, type, author, scenario). If a parameter isn't passed in, it safely defaults to null.
The /benchmarks/:id DELETE route checks the session for a valid loggedInUserId and returns a 401 response if a user tries to bypass the UI to delete someone else's run.
Actively running algorithms stream their status in the UI via the /api/summary/:id endpoint.

## Energy Tracker

Before making this page, I created the energy tracker for the boxes as they run through scenarios. Before they were being tracked as their number of moves however for differnt box types in different directions, this wasn't accurate.
How we track energy usage for the boxes:
- Horizontal movement: 1 unit (for all box types)
- Type 1 vertical movement: 2 units
- Type 2 vertical movement: 1 unit for box being moved + 1 unit for every box stacked on top of it

# Future Development

I have referred to next steps to take for improving the benchmarking page in documents/Handover.md.