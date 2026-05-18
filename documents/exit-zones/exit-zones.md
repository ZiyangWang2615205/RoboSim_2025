# Exit zones

## Purpose

As mentioned in the handover, the plan was to make the warehouse more realistic by having an exit (and then doing similar for an entrance!) Bugs while developing the frontend meant this feature was left half-finished.

## Definition

Exit zones are defined in scenario files, go to the directory tests/scenarios to find them. The property exit-zone uses a set of two coordinates to define its location, think of two diagonally opposite ends of a cuboid. The only scenario currently with an exit zone is Scenario 21, everything else has had the two coordinates set to (0,0,0),(0,0,0)

A note if you want to create new scenario files: After creating the file in the same directory as the others, with all the data, we've found you have to clear all the scenarios in the database and then run the startup of Robosim again to update what scenarios are in the system.
Look up how to access a PostgreSQL database when it's in a Docker container to do this. Then just delete all data in the scenarios table.

## What's left to do

An idea that Marius was quite keen on was that boxes get deleted when they exit the exit zone. This should probably be set so it's only boxes headed to the exit zone and not just any box passing through. 

You'd also need to modify the completion conditions of algorithms - e.g. only ends when boxes are in target locations AND boxes meant to go to the exit have been deleted. I wouldn't recommend using the "requirements" variable in scenario files to say a box should be in the exit zone,
it currently only takes a box ID and a single coordinate as the requirement for a box, but the exit zone probably contains multiple coordinates. 

It would probably be a good idea to add a new variable to scenario files containing a list of box IDs which need to be in the exit zone, then working from there. You'd also have to update the Scenarios table in the database to include a column for the new variable. 
Use Flyway migrations for that, our current migrations are in server/sql. 

## Further thoughts

If you do all this, there's also the idea of adding an entrance zone and having new boxes appear during the duration of a scenario from this zone.

Good luck!
