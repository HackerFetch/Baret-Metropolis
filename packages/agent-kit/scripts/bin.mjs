/**
 * After the build: the CLI's first line runs it through tsx in the workspace,
 * and a published package has only JavaScript. Point it at node, and let it
 * be executed.
 */
import { chmodSync, readFileSync, writeFileSync } from "node:fs";

const file = new URL("../dist/cli.js", import.meta.url);
const source = readFileSync(file, "utf8");
writeFileSync(file, source.replace(/^#!.*\n/, "#!/usr/bin/env node\n"));
chmodSync(file, 0o755);
