/**
 * The Git this plugin runs: the Git command line this host already has — the same `git` a
 * person uses on this machine — or the program an operator names with `PENGUIN_GIT_PATH`.
 *
 * Nothing is downloaded and nothing is kept: the host's Git is used where it stands, and finds
 * its own exec path (the plugin sets no `GIT_EXEC_PATH` for it). Whether the program actually
 * runs is the probe's answer (./engine.ts): a host with no git on its PATH, a program that does
 * not start, or one that is not Git is no Git, and the engine says so — the harness then records
 * versions with its built-in engine, or with the next engine a plugin offers (the
 * agent-state-dugite plugin, which fetches a build of its own).
 */
import path from "node:path";

/** The Git to run: the program, and the exec path to hand it — null for a Git on the PATH. */
export interface GitProgram {
  /** An absolute path when the operator named one, else the bare name the PATH resolves. */
  program: string;
  /** Null: the program finds its own exec path, and none is forced on it. */
  execPath: string | null;
}

/**
 * The Git to run here. Never null — there is nothing to look up before the first process —
 * whether the program runs is what probing it answers (./engine.ts).
 */
export async function locateGit(opts: {
  env?: Readonly<Record<string, string | undefined>>;
  log?: (line: string) => void;
} = {}): Promise<{ git: GitProgram; source: string } | null> {
  const env = opts.env ?? process.env;
  const named = env.PENGUIN_GIT_PATH;
  if (named) {
    return { git: { program: path.resolve(named), execPath: null }, source: "PENGUIN_GIT_PATH" };
  }
  return { git: { program: "git", execPath: null }, source: "PATH" };
}
