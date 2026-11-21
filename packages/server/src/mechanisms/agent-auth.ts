/**
 * Role-bound authorization session & permission mechanisms: what the server requires of the
 * role-scoped sessions it issues (serving Agents today and human principals alike), declared
 * apart from what implements it (`db/repos/auth-role-sessions.ts`).
 *
 * A server-side row per session in `auth_role_sessions` stores only the token's sha256, and
 * `auth_generations` tracks the principal's CURRENT permission generation. Authorization is
 * per HTTP route id — the server's HTTP routes are addressed by their `"HttpModule.routes"` id,
 * and one per-route check governs HTTP and CLI alike (since CLI commands reach the server over
 * HTTP). Each request re-derives the grant from the CURRENT generation, so a role or grant
 * change hot-reloads without re-issue and no stale grant outlives one request.
 */
import { Interface } from "@prismshadow/penguin-core/kernel";
import type { Slot } from "@prismshadow/penguin-core/kernel";
import type {
  AgentAuthRole,
  RoleContribution,
  RoleHttpBindingContribution,
  RouteAuthDebugInfo,
  RouteRoleRegistration,
} from "../auth/agent-roles.js";
import type { AgentAuthContext } from "../auth/agent-auth-service.js";
import type { AuthSubjectKind } from "../db/repos/auth-role-sessions.js";

/** One issued session, as surfaces show it (never the raw token). */
export interface AuthRoleSessionInfo {
  subjectId?: string;
  subjectKind?: AuthSubjectKind;
  userId?: string | null;
  projectId: string;
  agentId: string;
  role: AgentAuthRole;
  generation: number;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
}

export type AgentAuthSessionInfo = AuthRoleSessionInfo;

/** One stored session with its token hash — what authentication reads. */
export interface AuthRoleSessionRow {
  tokenHash: string;
  subjectId: string;
  subjectKind: AuthSubjectKind;
  userId: string | null;
  projectId: string;
  agentId: string;
  role: AgentAuthRole;
  generation: number;
  createdAt: string;
  expiresAt: string;
  lastUsedAt: string | null;
}

export type AgentAuthSessionRow = AuthRoleSessionRow;

/**
 * The principal's CURRENT grant: the role's scope over the server's HTTP routes plus the explicit
 * route ids granted to it, cached per generation. What every request is checked against.
 */
export interface AgentAuthGrant {
  role: AgentAuthRole;
  generation: number;
  /** true = the role spans every HTTP route the server registers (`admin`, `full-permissions`). */
  allEndpoints: boolean;
  /** true = the role reaches human-gated endpoints (`requireHuman`) such as session creation/deletion. */
  agentApi?: boolean;
  /** The effective HTTP route ids after expanding the role tree and explicit extra grants, built and cached per generation. */
  apiIds: ReadonlySet<string>;
}

/** The principal's CURRENT generation row: what re-derivation reads. */
export interface AuthGenerationRow {
  subjectId: string;
  subjectKind: AuthSubjectKind;
  userId: string | null;
  projectId: string;
  agentId: string;
  generation: number;
  role: AgentAuthRole;
  apiIds: readonly string[];
}

export type AgentAuthGenerationRow = AuthGenerationRow;

export interface AgentAuthPermissionsSlots {
  /**
   * Declarative role node definitions or extensions (`RoleContribution`) contributed to
   * `AgentAuthPermissionProvider.roles`.
   */
  roles: Slot<RoleContribution>;
  /**
   * Unified `role -> http` route binding contributions (`RoleHttpBindingContribution`)
   * contributed to `AgentAuthPermissionProvider.roleBindings`.
   */
  roleBindings: Slot<RoleHttpBindingContribution>;
}

/** The per-route grant face: what AgentAuthPermissionProvider implements. */
@Interface()
export abstract class AgentAuthPermissions {
  /** The principal's CURRENT grant, from its CURRENT generation and role. */
  abstract grantOf(projectId: string, agentId: string): AgentAuthGrant | null;
  /** Registers or extends a role node in the permission provider's role registry. */
  abstract registerRole(
    roleId: string,
    contribution: RoleContribution,
    sourceModule?: string,
  ): void;
  /** Registers a route's sub-endpoint mappings and direct role bindings. */
  abstract registerRoute(registration: RouteRoleRegistration, sourceModule?: string): void;
  /** Registers a unified `role -> http` route binding contribution. */
  abstract registerRoleBinding(
    contribution: RoleHttpBindingContribution,
    sourceModule?: string,
  ): void;
  /** Returns source-module debug attribution for an authorization failure on `routeId`. */
  abstract describeRouteAuthFailure(
    routeId: string,
    role: string,
    groupId?: string,
  ): RouteAuthDebugInfo;
}

/** AuthRoleSessions: the mechanism AuthRoleSessionsRepo implements. */
@Interface()
export abstract class AuthRoleSessions {
  /** Mints a role-bound session for an Agent or human user; the raw token leaves once, into the caller's hands. */
  abstract issue(opts: {
    projectId?: string | null;
    agentId?: string | null;
    userId?: string | null;
    subjectId?: string;
    role: AgentAuthRole;
    apiIds: readonly string[];
    generation: number;
    now: Date;
    ttlMs: number;
  }): { token: string; expiresAt: string; generation: number };
  /** The session whose token hashes to `tokenHash`; null when none does or it is expired. */
  abstract findByTokenHash(tokenHash: string): AuthRoleSessionRow | null;
  /** The principal's CURRENT generation row by subjectId; null before its first session. */
  abstract generationBySubject(subjectId: string): AuthGenerationRow | null;
  /** The Agent's CURRENT generation row; null before its first session. */
  abstract generationOf(projectId: string, agentId: string): AuthGenerationRow | null;
  /**
   * Sets a principal's CURRENT generation, role and granted route ids. Every live session keeps
   * its token but re-derives its grant from this at its next request.
   */
  abstract bumpSubjectGeneration(opts: {
    subjectId?: string;
    userId?: string | null;
    projectId?: string | null;
    agentId?: string | null;
    role: string;
    apiIds: readonly string[];
    generation: number;
  }): void;
  /**
   * Sets the Agent's CURRENT generation, role and granted route ids. Every live session keeps
   * its token but re-derives its grant from this at its next request.
   */
  abstract bumpGeneration(
    projectId: string,
    agentId: string,
    role: string,
    apiIds: readonly string[],
    generation: number,
  ): void;
  abstract touch(tokenHash: string, at: string): void;
  /** Drops the Agent's sessions (re-issue follows); the generation row stays. */
  abstract deleteSessionsOf(projectId: string, agentId: string): void;
  /** Drops everything of a principal by subjectId — sessions AND its generation row. */
  abstract deleteBySubject(subjectId: string): void;
  /** Drops everything of the Agent — sessions AND its generation row (the Agent is archived). */
  abstract deleteByAgent(projectId: string, agentId: string): void;
  abstract deleteExpired(at: string): void;
}

export { AuthRoleSessions as AgentAuthSessions };

/**
 * AgentAuth: the mechanism the auth service implements — what the issue/authenticate paths
 * call, declared apart from the class that implements it (auth/agent-auth-service.ts).
 */
@Interface()
export abstract class AgentAuth {
  /** Issues the Agent's session; the raw token leaves once. */
  abstract issueSession(
    projectId: string,
    agentId: string,
    now: Date,
  ): { token: string; expiresAt: string; generation: number; role: AgentAuthRole };
  /** The Agent's CURRENT grant, from its CURRENT generation and role. */
  abstract currentGrant(projectId: string, agentId: string): AgentAuthGrant | null;
  /** Whether the CURRENT grant reaches the HTTP route `apiId`. */
  abstract allowsEndpoint(projectId: string, agentId: string, apiId: string): boolean;
  /** The Agent's CURRENT generation row; null before its first session. */
  abstract generationOf(projectId: string, agentId: string): AuthGenerationRow | null;
  /**
   * Authenticates a presented Bearer; the context carries the Agent's CURRENT grant —
   * a session issued at an older generation reads the new one here.
   */
  abstract authenticate(bearer: string, now: Date): AgentAuthContext | null;
  /** Drops the Agent's sessions AND its generation row (the Agent is archived). */
  abstract revokeAll(projectId: string, agentId: string): void;
  /** Returns a live session token for the Agent, issuing a new one when none is cached or valid. */
  abstract ensureSessionToken(projectId: string, agentId: string, now: Date): string;
  /** Updates the Agent's role and explicit route grants (bumping its generation) and returns the new state. */
  abstract updateGrant(
    projectId: string,
    agentId: string,
    role: AgentAuthRole,
    apiIds: readonly string[],
    now: Date,
  ): { generation: number; role: AgentAuthRole; apiIds: readonly string[]; token: string };
  /** Registers or extends a role node in the permission provider's role registry. */
  abstract registerRole(
    roleId: string,
    contribution: RoleContribution,
    sourceModule?: string,
  ): void;
  /** Registers a route's sub-endpoint mappings and direct role bindings. */
  abstract registerRoute(registration: RouteRoleRegistration, sourceModule?: string): void;
  /** Registers a unified `role -> http` route binding contribution. */
  abstract registerRoleBinding(
    contribution: RoleHttpBindingContribution,
    sourceModule?: string,
  ): void;
  /** Returns source-module debug attribution for an authorization failure on `routeId`. */
  abstract describeRouteAuthFailure(
    routeId: string,
    role: string,
    groupId?: string,
  ): RouteAuthDebugInfo;
}
