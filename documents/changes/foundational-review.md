# Last Year's System
## Database
### Issue
Last year's implementation used **SQLite3** (using the better-sqlite3 package.) This operated by reading and writing data to a single file. 
While this was functionsl for local development, this setup caused a critical issue with deployment (e.g. to cloud platforms): the database file was deleted everytime the application was redeployed or restarted. This means all user data, runs and application history was deleted.
### To Fix
We had to select a database that supported client-server architecture and was designed for persistence in a cloud environment.
We decided to use **PostgreSQL** because it runs as an independent service rather than a single file which our application can connect to over a network. 
The process involved us changing a lot of last year's code to integrate this new database because the code that accessed the database needed to be changed.
All the steps we took to fix this database issue were documented in documents/database.

## Features
The 2024 team created a very good UI for the Robosim platform but we decided we needed to add some more features to make the simulation more usable.
### Improvements made
We created a replay feature to re-run a scenario that the user wants to watch.
We also made it possible for a user to track a specific box in the playground to allow focus on a singular box. When showing this to Marius in our MVP he requested to make the camera movement on a specific box slower which has now been implemented.
### Future improvements
Future improvements we are working on include making any boxes not being followed transparent so when the camera focuses on a specific box it can be seen when moving under other boxes in the playground.
Another piece of feedback we recieved from our MVP was to add the ability to more clearly compare results between stats given from different algorithms. The system currently has the ability to generate a graph to compare these results but we want to make it more accesasible and give it it's own page in the heading part.
We are also planning on making the system show trails left by boxes to highlight the route it took around the playground.
We are also working on making the UI more clean.

## Type2 Boxes
The 2024 RoboSim team created a new type of box which has legs allowing it to move vertically. We have been working on an algorithm for them to move efficently to target locations in the warehouse simulation. Marius's feedback for our currently created algorithm was to consider the energy usage of boxes being moved straight to the ground. 

## Warehouse features
We are also working on making the current playground simulation more realistic to a real world warehouse environment. We are looking into adding entrances and exits that act as target locations for boxes. We might look into considering walls and vertical height limits for boxes. Also including obstacles and pillars which might exist in a warehouse environment.