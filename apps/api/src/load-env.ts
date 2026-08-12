import { config } from "dotenv";
import { existsSync } from "fs";
import { resolve } from "path";

/** Turbo runs API with cwd=apps/api; monorepo .env lives at repo root. */
const candidates = [
  resolve(process.cwd(), "../../.env"),
  resolve(process.cwd(), ".env"),
  resolve(process.cwd(), "../.env"),
];

for (const path of candidates) {
  if (existsSync(path)) {
    // Override stale shell exports (e.g. AWS_VIKELA_ACCESS_KEY_ID set to account id).
    config({ path, override: true });
    break;
  }
}
