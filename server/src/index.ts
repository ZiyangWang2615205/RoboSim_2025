import { Manager } from "./model/manager.js";

process.env.ac_port = "7071";

export const manager = new Manager();

manager.start(parseInt(process.env.ac_port), 3000);
