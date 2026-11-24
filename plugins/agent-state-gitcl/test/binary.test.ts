/**
 * Which Git the CLI engine runs.
 *
 * - The host's `git` from the PATH by default, with no exec path forced on it — the program
 *   finds its own.
 * - A program the operator names with `PENGUIN_GIT_PATH` is used as it is, resolved.
 */
import path from "node:path";
import { describe, expect, it } from "vitest";
import { locateGit } from "../src/binary.js";

describe("the Git the CLI engine runs", () => {
  it("is the host's git from the PATH, with no exec path forced on it", async () => {
    const found = await locateGit({ env: {} });
    expect(found).toEqual({ git: { program: "git", execPath: null }, source: "PATH" });
  });

  it("is the program PENGUIN_GIT_PATH names, resolved", async () => {
    const found = await locateGit({ env: { PENGUIN_GIT_PATH: "operators/git" } });
    expect(found?.source).toBe("PENGUIN_GIT_PATH");
    expect(found?.git.program.endsWith(path.join("operators", "git"))).toBe(true);
    expect(found?.git.execPath).toBeNull();
  });
});
