/**
 * The Agent auth service: issuing Agent sessions, authenticating a presented token, and the
 * per-route grant a request runs under. One service over the repo — the issuing point the
 * Agent-creation path calls, the authenticator the HTTP gate reads, and the re-derivation
 * point that keeps a live session's grant CURRENT with the Agent's generation instead of
 * frozen at its issue time.
 *
 * Authorization is per HTTP route id (`"HttpModule.routes"` entry `id`): one check governs
 * HTTP and CLI alike, since CLI commands reach the server over HTTP.
 */
import { Component, Use } from "@prismshadow/penguin-core/kernel";
import type { ClassCtx } from "@prismshadow/penguin-core/kernel";
import type {
  AgentAuth,
  AgentAuthGrant,
  AgentAuthPermissions,
  AuthRoleSessions,
} from "../mechanisms/agent-auth.js";
import type { AuthRoleSessionRow } from "../db/repos/auth-role-sessions.js";
import { authRoleSessionTokenHash } from "../db/repos/auth-role-sessions.js";
import {
  DEFAULT_AGENT_AUTH_ROLE,
  RoleRegistry,
  assertNoWildcard,
  matchesRouteGrant,
  roleHasAgentApi,
  type AgentAuthRole,
  type RoleContribution,
  type RoleHttpBindingContribution,
  type RouteAuthDebugInfo,
  type RouteRoleRegistration,
} from "./agent-roles.js";

/** How long an Agent session lives; the Agent re-derives nothing about this — it is a lease. */
export const AGENT_SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

/** The authenticated caller the HTTP gate receives. */
export interface AgentAuthContext {
  projectId: string;
  agentId: string;
  grant: AgentAuthGrant;
  /** Whether the grant also reaches the Agent's own API settings and keys. */
  agentApi: boolean;
}

@Component()
export class AgentAuthService implements AgentAuth {
  @Use() private readonly authRoleSessions!: AuthRoleSessions;
  /** The Agent's per-route grant, derived at its CURRENT generation and role. */
  @Use() private readonly agentAuthPermissions!: AgentAuthPermissions;
  private readonly activeTokens = new Map<string, string>();

  /**
   * Issues the Agent's session. Called when the Agent is created (and by the re-issue path);
   * the raw token goes back once — the caller stores it where the Agent can reach and nothing
   * else does. The session stamps the Agent's CURRENT generation, whatever the caller asked.
   */
  issueSession(
    projectId: string,
    agentId: string,
    now: Date,
  ): { token: string; expiresAt: string; generation: number; role: AgentAuthRole } {
    const out = this.authRoleSessions.issue({
      projectId,
      agentId,
      role: DEFAULT_AGENT_AUTH_ROLE,
      apiIds: [],
      generation: 0,
      now,
      ttlMs: AGENT_SESSION_TTL_MS,
    });
    this.activeTokens.set(`${projectId}\0${agentId}`, out.token);
    const current = this.authRoleSessions.generationOf(projectId, agentId);
    return { ...out, role: current?.role ?? DEFAULT_AGENT_AUTH_ROLE };
  }

  /** Returns a live session token for the Agent, issuing a new one when none is cached or valid. */
  ensureSessionToken(projectId: string, agentId: string, now: Date): string {
    const key = `${projectId}\0${agentId}`;
    const cached = this.activeTokens.get(key);
    if (cached !== undefined && this.authenticate(cached, now) !== null) {
      return cached;
    }
    return this.issueSession(projectId, agentId, now).token;
  }

  /** Updates the Agent's role and explicit route grants (bumping its generation) and returns the new state. */
  updateGrant(
    projectId: string,
    agentId: string,
    role: AgentAuthRole,
    apiIds: readonly string[],
    now: Date,
  ): { generation: number; role: AgentAuthRole; apiIds: readonly string[]; token: string } {
    assertNoWildcard(role, "updateGrant(role)");
    for (const apiId of apiIds) {
      assertNoWildcard(apiId, "updateGrant(apiIds)");
    }
    const current = this.authRoleSessions.generationOf(projectId, agentId);
    const nextGen = (current?.generation ?? 0) + 1;
    this.authRoleSessions.bumpGeneration(projectId, agentId, role, apiIds, nextGen);
    const token = this.ensureSessionToken(projectId, agentId, now);
    return { generation: nextGen, role, apiIds: [...apiIds], token };
  }

  /** The Agent's CURRENT grant, from its CURRENT generation and role. */
  currentGrant(projectId: string, agentId: string): AgentAuthGrant | null {
    return this.agentAuthPermissions.grantOf(projectId, agentId);
  }

  /** Whether the CURRENT grant reaches the HTTP route `apiId`. */
  allowsEndpoint(projectId: string, agentId: string, apiId: string): boolean {
    const grant = this.agentAuthPermissions.grantOf(projectId, agentId);
    if (grant === null) return false;
    return grant.allEndpoints === true || matchesRouteGrant(grant.apiIds, apiId);
  }

  /** Registers or extends a role node in the permission provider's role registry. */
  registerRole(
    roleId: string,
    contribution: RoleContribution,
    sourceModule?: string,
  ): void {
    this.agentAuthPermissions.registerRole(roleId, contribution, sourceModule);
  }

  /** Registers a route's sub-endpoint mappings and direct role bindings. */
  registerRoute(registration: RouteRoleRegistration, sourceModule?: string): void {
    this.agentAuthPermissions.registerRoute(registration, sourceModule);
  }

  /** Registers a unified `role -> http` route binding contribution. */
  registerRoleBinding(
    contribution: RoleHttpBindingContribution,
    sourceModule?: string,
  ): void {
    this.agentAuthPermissions.registerRoleBinding(contribution, sourceModule);
  }

  /** Returns source-module debug attribution for an authorization failure on `routeId`. */
  describeRouteAuthFailure(
    routeId: string,
    role: string,
    groupId?: string,
  ): RouteAuthDebugInfo {
    return this.agentAuthPermissions.describeRouteAuthFailure(routeId, role, groupId);
  }

  /** The Agent's CURRENT generation row; null before its first session. */
  generationOf(projectId: string, agentId: string) {
    return this.authRoleSessions.generationOf(projectId, agentId);
  }

  /**
   * Authenticates a presented Bearer: the session must exist and be unexpired; the context
   * it answers with carries the Agent's CURRENT grant — a session issued at an older
   * generation reads the new one here.
   */
  authenticate(bearer: string, now: Date): AgentAuthContext | null {
    const row: AuthRoleSessionRow | null = this.authRoleSessions.findByTokenHash(
      authRoleSessionTokenHash(bearer),
    );
    if (row === null) return null;
    if (row.expiresAt <= now.toISOString()) return null;
    const grant = this.agentAuthPermissions.grantOf(row.projectId, row.agentId);
    if (grant === null) return null;
    this.authRoleSessions.touch(row.tokenHash, now.toISOString());
    return {
      projectId: row.projectId,
      agentId: row.agentId,
      grant,
      agentApi: grant.agentApi ?? roleHasAgentApi(grant.role),
    };
  }

  /** Drops the Agent's sessions AND its generation row (the Agent is archived). */
  revokeAll(projectId: string, agentId: string): void {
    this.activeTokens.delete(`${projectId}\0${agentId}`);
    this.authRoleSessions.deleteByAgent(projectId, agentId);
  }
}

interface CachedAgentGrant {
  readonly generation: number;
  readonly registryVersion: number;
  readonly role: AgentAuthRole;
  readonly grant: AgentAuthGrant;
}

/** Derives and caches the grant from the Agent's CURRENT generation row — the one reader of the pair. */
@Component({
  contributes: {
    "AgentAuthPermissionProvider.roles": [
      { id: "role.none", role: "none" },
      { id: "role.readonly", role: "readonly" },
      { id: "role.general", role: "general", children: ["readonly"] },
      {
        id: "role.system-maintainer",
        role: "system-maintainer",
        children: ["general"],
        flags: { allEndpoints: false, agentApi: true },
      },
      {
        id: "role.admin",
        role: "admin",
        children: ["system-maintainer"],
        flags: { allEndpoints: true, agentApi: false },
      },
      {
        id: "role.full-permissions",
        role: "full-permissions",
        children: ["admin"],
        flags: { allEndpoints: true, agentApi: true },
      },
    ],
  },
})
export class AgentAuthPermissionProvider implements AgentAuthPermissions {
  @Use() private readonly authRoleSessions!: AuthRoleSessions;
  private readonly roleRegistry = new RoleRegistry();
  private readonly grantCache = new Map<string, CachedAgentGrant>();

  setup({ contributions }: ClassCtx): void {
    const roles = contributions.roles as
      | ReadonlyArray<{
          readonly id: string;
          readonly from?: string;
          readonly data: RoleContribution;
        }>
      | undefined;
    if (roles !== undefined) {
      for (const r of roles) this.roleRegistry.registerRole(r.id, r.data ?? r, r.from);
    }
    const roleBindings = contributions.roleBindings as
      | ReadonlyArray<{
          readonly id: string;
          readonly from?: string;
          readonly data: RoleHttpBindingContribution;
        }>
      | undefined;
    if (roleBindings !== undefined) {
      for (const rb of roleBindings) this.roleRegistry.registerRoleBinding(rb.data ?? rb, rb.from);
    }
  }

  registerRole(
    roleId: string,
    contribution: RoleContribution,
    sourceModule?: string,
  ): void {
    this.roleRegistry.registerRole(roleId, contribution, sourceModule);
  }

  registerRoute(registration: RouteRoleRegistration, sourceModule?: string): void {
    this.roleRegistry.registerRoute(registration, sourceModule);
  }

  registerRoleBinding(
    contribution: RoleHttpBindingContribution,
    sourceModule?: string,
  ): void {
    this.roleRegistry.registerRoleBinding(contribution, sourceModule);
  }

  describeRouteAuthFailure(
    routeId: string,
    role: string,
    groupId?: string,
  ): RouteAuthDebugInfo {
    return this.roleRegistry.describeRouteAuthFailure(routeId, role, groupId);
  }

  grantOf(projectId: string, agentId: string): AgentAuthGrant | null {
    const cacheKey = `${projectId}\0${agentId}`;
    const current = this.authRoleSessions.generationOf(projectId, agentId);
    if (current === null) {
      this.grantCache.delete(cacheKey);
      return null;
    }
    const registryVersion = this.roleRegistry.version;
    const cached = this.grantCache.get(cacheKey);
    if (
      cached !== undefined &&
      cached.generation === current.generation &&
      cached.registryVersion === registryVersion &&
      cached.role === current.role
    ) {
      return cached.grant;
    }
    const expanded = this.roleRegistry.expandRoleGrant(current.role, current.apiIds);
    const grant: AgentAuthGrant = {
      role: current.role,
      generation: current.generation,
      allEndpoints: expanded.allEndpoints,
      agentApi: expanded.agentApi,
      apiIds: expanded.apiIds,
    };
    this.grantCache.set(cacheKey, {
      generation: current.generation,
      registryVersion,
      role: current.role,
      grant,
    });
    return grant;
  }
}
