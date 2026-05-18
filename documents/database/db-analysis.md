# These steps have all been completed!!
## Database Analysis and Planning
I have outlined the critical issues identified in the current database and have listed the necessary steps, as advised by previous team members for a solution.

### The Current Database's Core Problem
The current implementation uses **SQLite3** (using the better-sqlite3 package.) This operates by reading and writing data to a single file. 
While this is functionsl for local development, this setup causes a critical issue with deployment (e.g. to cloud platforms): the database file is deleted everytime the application is redeployed or restarted. This means all user data, runs an application history is deleted.

### To Fix
#### 1. Choose a Non-Embedded Database
We must select a database that supports client-server architecture and is designed for persistence in a cloud environment.
We are going to use **PostgreSQL** because it runs as an independent service rather than a single file which our application can connect to over a network. 

#### 2. Implement Local Development Setup with Docker
To ensure everyone can run the new database on their local machines, we will use **Docker Compose** to define and run the PostgreSQL service alongside the application.
  1. Install docker and docker compose.
  2. Create a 'docker-compose.yaml' file
  3. Run 'docker compose up'

#### 3. Update Application Code
The application's backend logic needs to be updated to communicate with the new database server instead of the local SQLite file. Most of the code to change is inside 'src/db_handler.ts'.
  1. Find suitable javascript client for database (postgres for PostgreSQL) use instead of "better-sqlite3"
  2. Change or remove some of the SQLite specific stuff

#### 4. Set Up a Database Migration Tool
To handle future changes (e.g. adding a new column to a table) without loosing existing data, we need to implement a proper migration tool. 
Currently schema changes require editting the CREATE TABLE IF NOT EXISTS statement, which leads to distruction and recreation of the table causing data loss. We need to implement a tool that supports raw SQL migration (e.g. using ALTER TABLE statements.)
  1. Decide on tool that works with raw SQL and our chosen database (PostgreSQL)
       - Update: decided on Flyway due to it's simplicity of raw SQL, maturity, community and it works regardless of our programming language.

#### 5. Update GitHub Actions
All GitHub Actions workflows that interact with the database must be adjusted to set up a database and run migrations.
  1. Adjust many of the YAML files (anything that needs the database)

#### 6. Set Up a Database on AWS
We will need to ensure the application code connects to the correct database instance using environment variable for connection details.
  1. Using AmazonRDS, set up database on AWS
  2. Make sure code connects to correct database in developement and production - use environment variables.
