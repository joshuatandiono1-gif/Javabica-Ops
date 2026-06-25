import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const apiUrl = (process.env.VITE_API_URL || "").trim().replace(/\/$/, "");

writeFileSync(".env.production.local", `VITE_API_URL=${apiUrl}\n`);
writeFileSync("public/config.json", JSON.stringify({ apiUrl }, null, 2));

console.log(`Building frontend with API URL: ${apiUrl || "(not set)"}`);

execSync("vite build", { stdio: "inherit" });
