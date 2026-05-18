import { rmSync } from "fs";
try {
    rmSync("./database.db");
    rmSync("./database.db-wal");
    rmSync("./database.db-shm");
    console.log("database file deleted successfully");
} catch {
    console.error("database file not found");
}
