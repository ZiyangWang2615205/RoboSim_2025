import { readFileSync, existsSync } from "fs";
import { SentScenario } from "../types/index.js";
import path from 'path';

// to determine which path to use (given scenarios are now in tests folder)
const basePath = existsSync("scenarios") ? "scenarios" : "tests/scenarios";

export const defaultScenarios: SentScenario[] = [];

for (let i = 1; i <= 21; i++) {
    try {
        // constructing path using absolute project root
        const filePath = path.join(process.cwd(), 'tests', 'scenarios', `Scenario ${i}.json`);
        //reading file from that path
        const file = readFileSync(filePath);
        // const file = readFileSync(`scenarios/Scenario ${i}.json`);
        const scenario = JSON.parse(file.toString());
        defaultScenarios.push(scenario);
    } catch (err) {
        // avoiding whole thing crashing if scenario not found
        console.warn(`Skipping Scenario ${i}: Not found in ${basePath}`);
    }
}
