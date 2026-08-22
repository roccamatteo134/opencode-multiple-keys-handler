import { execSync } from "node:child_process";

execSync(`paseo plugin install "${process.cwd()}"`, { stdio: "inherit" });