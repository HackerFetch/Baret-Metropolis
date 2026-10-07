// Builds the tarball the MetaMask Agent Wallet installs: the compiled commands
// and a package.json without the workspace's dev dependencies.
//
// Installing this folder directly (`mm plugins install file:<folder>`) links
// it, and the commands then import the copy of @metamask/agent-wallet in this
// workspace's node_modules instead of the CLI's own. Two copies of that
// library in one process break every `mm` command, so the plugin is always
// installed from the tarball.
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const stage = join(root, "pack");

rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
for (const key of ["devDependencies", "scripts", "private"]) delete manifest[key];
writeFileSync(join(stage, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
cpSync(join(root, "dist"), join(stage, "dist"), { recursive: true });
cpSync(join(root, "README.md"), join(stage, "README.md"));

const out = execFileSync("npm", ["pack", "--silent"], { cwd: stage, encoding: "utf8" }).trim();
console.log(join(stage, out.split("\n").at(-1)));
