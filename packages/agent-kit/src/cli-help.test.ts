import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  COMMANDS,
  commandHelp,
  findCommand,
  parseOptions,
  synopsis,
  usage,
  usageLine,
} from "./cli-help.js";

describe("the CLI's help text", () => {
  it("lists every command with its synopsis, the settings and the exit codes", () => {
    const text = usage();
    for (const name of [
      "address",
      "analyze",
      "submit",
      "pay",
      "x402",
      "review",
      "wallet",
      "policy",
    ]) {
      expect(text).toContain(`baret ${name}`);
    }
    expect(text).toContain("baret pay --vault 0x.. --merchant 0x.. --amount <n> --ref <text>");
    expect(text).toContain("baret x402 <url> [--max <n>]");
    expect(text).toContain("BARET_AGENT_PRIVATE_KEY");
    expect(text).toContain("Exit codes: 0");
    expect(text).not.toContain("cli.ts");
  });

  it("marks only the required flags as bare on the usage line", () => {
    const pay = findCommand("pay");
    const review = findCommand("review");
    if (!pay || !review) throw new Error("pay and review exist");
    expect(synopsis(pay)).toContain("--ref <text> [--intent <text>]");
    expect(synopsis(review)).toContain("--intent <text> [--from 0x..]");
  });

  it("explains each flag of one command", () => {
    const x402 = findCommand("x402");
    if (!x402) throw new Error("x402 exists");
    const text = commandHelp(x402);
    expect(text).toContain("baret x402 <url> [--max <n>]");
    expect(text).toContain("--max  never sign a payment above this many base units");
  });

  it("builds parseArgs options per command, with --help on each", () => {
    const options = parseOptions(findCommand("analyze"));
    expect(Object.keys(options).sort()).toEqual(["data", "help", "to", "value"]);
    expect(options.help).toEqual({ type: "boolean", short: "h" });
    expect(parseOptions(findCommand("address"))).toEqual({ help: { type: "boolean", short: "h" } });
  });

  it("keeps the one-line usage free of source paths and names every command", () => {
    const line = usageLine();
    expect(line).not.toContain("cli.ts");
    for (const command of COMMANDS) expect(line).toContain(command.name);
  });
});

/** The CLI as a process: tsx is a dev dependency of the workspace. */
function baret(...args: string[]): { stdout: string; stderr: string; status: number } {
  const cli = fileURLToPath(new URL("./cli.ts", import.meta.url));
  try {
    const stdout = execFileSync("pnpm", ["exec", "tsx", cli, ...args], {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, BARET_AGENT_PRIVATE_KEY: "" },
    });
    return { stdout, stderr: "", status: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", status: e.status ?? -1 };
  }
}

describe("baret --help from a shell", () => {
  it("prints the usage and exits 0 for --help, help and <command> --help", () => {
    const top = baret("--help");
    expect(top.status).toBe(0);
    expect(top.stdout).toContain("baret x402 <url>");
    expect(baret("help").status).toBe(0);
    const pay = baret("pay", "--help");
    expect(pay.status).toBe(0);
    expect(pay.stdout).toContain("--ref");
  });

  it("answers an unknown flag with a one-line hint, the command's help and exit 2", () => {
    const r = baret("analyze", "--bogus");
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("Unknown option '--bogus'");
    expect(r.stderr).not.toContain("To specify a positional");
    expect(r.stderr).toContain("baret analyze --to 0x..");
  });

  it("answers no command or an unknown one with the usage line and exit 2", () => {
    expect(baret().status).toBe(2);
    const r = baret("nope");
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('unknown command "nope"');
    expect(r.stderr).toContain("baret --help");
  });
}, 60_000);
