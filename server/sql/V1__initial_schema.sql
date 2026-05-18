-- `UserModel` in`db_types.ts`
CREATE TABLE IF NOT EXISTS Users(
            ID BIGSERIAL PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            name TEXT NOT NULL
        );

 -- `TokenModel` in `db_types.ts`
 CREATE TABLE IF NOT EXISTS Tokens (
            ID BIGSERIAL PRIMARY KEY,
            token TEXT NOT NULL,
            timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            userid BIGINT NOT NULL,
            FOREIGN KEY (userid) REFERENCES Users(ID) ON DELETE CASCADE
        );

-- `AlgorithmClientModel` in `db_types.ts`
CREATE TABLE IF NOT EXISTS ACReg (
            ACID VARCHAR(32) NOT NULL PRIMARY KEY,
            name VARCHAR(64) NOT NULL,
            state INTEGER NOT NULL DEFAULT 0,
            tokenid INTEGER NOT NULL,
            publish_runs BOOLEAN NOT NULL DEFAULT FALSE,
            FOREIGN KEY (tokenid) REFERENCES Tokens(ID) ON DELETE CASCADE
        );

-- `ScenarioModel` in `db_types.ts`
CREATE TABLE IF NOT EXISTS Scenarios (
            SID BIGSERIAL PRIMARY KEY,
            width BIGINT NOT NULL CHECK (width>=0),
            height BIGINT NOT NULL CHECK (height>=0),
            depth BIGINT NOT NULL CHECK (depth>=0),
            name VARCHAR(32) NOT NULL,
            start TEXT NOT NULL,
            requirements TEXT NOT NULL,
            box_type INT NOT NULL,
            is_default BOOLEAN NOT NULL DEFAULT TRUE
        );

-- `RunModel` in `db_types.ts`
CREATE TABLE IF NOT EXISTS Runs (
            RID VARCHAR(32) NOT NULL PRIMARY KEY,
            SID INTEGER NOT NULL,
            ACID VARCHAR(32) NOT NULL,
            start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            state INT NOT NULL DEFAULT 0,
            finish_time TIMESTAMP DEFAULT NULL,
            actions TEXT DEFAULT NULL,
            move_count BIGINT DEFAULT NULL CHECK (move_count>=0),
            time_taken BIGINT DEFAULT NULL CHECK (time_taken>=0),
            FOREIGN KEY (SID) REFERENCES Scenarios(SID) ON DELETE CASCADE,
            FOREIGN KEY (ACID) REFERENCES ACReg(ACID) ON DELETE CASCADE
        );


CREATE INDEX IF NOT EXISTS username_idx ON Users (username);

-- `SessionModel` in `db_types.ts`
CREATE TABLE IF NOT EXISTS Sessions(
            sessionid TEXT NOT NULL PRIMARY KEY,
            expiry INTEGER NOT NULL,
            userid BIGINT NOT NULL UNIQUE,
            FOREIGN KEY (userid) REFERENCES Users(ID) ON DELETE CASCADE
        );
