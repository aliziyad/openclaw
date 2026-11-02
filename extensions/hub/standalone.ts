import os from "node:os";
import path from "node:path";
import { openDb } from "./src/db.js";
import { createHubServer } from "./src/server.js";
import { registerBuiltinHubTools } from "./src/mcp.js";

const port = Number(process.env.HUB_PORT ?? 1420);
const stateDir = process.env.HUB_STATE_DIR ?? path.join(os.homedir(), ".openclaw", "hub-state");

const db = openDb(stateDir);
registerBuiltinHubTools();
createHubServer(db, port);
