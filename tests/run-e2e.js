import { execSync } from "child_process";

const version = process.versions.node;
const majorVersion = parseInt(version.split(".")[0], 10);

if (majorVersion >= 23) {
    // https://github.com/microsoft/playwright/issues/34263
    process.env.NODE_OPTIONS = "--no-experimental-strip-types";
}

execSync("npx playwright test", { stdio: "inherit" });
