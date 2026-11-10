import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const SMOKE_STATE = path.join(__dirname, ".auth-state.json");
export const hasCredentials = !!(process.env.SMOKE_EMAIL && process.env.SMOKE_PASSWORD);
