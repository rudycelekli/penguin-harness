/**
 * The Agent auth service: issuing Agent sessions, authenticating a presented token, and
 * re-deriving the per-route grant from the Agent's CURRENT generation.
 */
import { Component, Use } from "@prismshadow/penguin-core/kernel";
import type { ClassCtx } from "@prismshadow/penguin-core/kernel";
import type {
  AgentAuth,
  AgentAuthGrant,
  AgentAuthPermissions,
  AuthRoleSessions,
} from "../mechanisms/agent-auth.js";
import {
  authRoleSessionTokenHash,
  type AuthRoleSessionRow,
} from "../db/repos/auth-role-sessions.js";
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

export const AGENT_SESSION_TTL_MS = 30 * 24 * 60 * 60_000;

export interface AgentAuthContext {
  projectId: string;
  agentId: string;
  grant: AgentAuthGrant;
  agentApi: boolean;
}

@Component()
export class AgentAuthService implements AgentAuth {
  @Use() private readonly authRoleSessions!: AuthRoleSessions;
  @Use() private readonly agentAuthPermissions!: AgentAuthPermissions;
  private readonly activeTokens = new Map<string, string>();

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

  ensureSessionToken(projectId: string, agentId: string, now: Date): string {
    const cached = this.activeTokens.get(`${projectId}\0${agentId}`);
    if (cached !== undefined && this.authenticate(cached, now) !== null) return cached;
    return this.issueSession(projectId, agentId, now).token;
  }

  updateGrant(
    projectId: string,
    agentId: string,
    role: AgentAuthRole,
    apiIds: readonly string[],
    now: Date,
  ): { generation: number; role: AgentAuthRole; apiIds: readonly string[]; token: string } {
    assertNoWildcard(role, "updateGrant(role)");
    for (const apiId of apiIds) assertNoWildcard(apiId, "updateGrant(apiIds)");
    const current = this.authRoleSessions.generationOf(projectId, agentId);
    const nextGen = (current?.generation ?? 0) + 1;
    this.authRoleSessions.bumpGeneration(projectId, agentId, role, apiIds, nextGen);
    const token = this.ensureSessionToken(projectId, agentId, now);
    return { generation: nextGen, role, apiIds: [...apiIds], token };
  }

  currentGrant(projectId: string, agentId: string): AgentAuthGrant | null {
    return this.agentAuthPermissions.grantOf(projectId, agentId);
  }

  allowsEndpoint(projectId: string, agentId: string, apiId: string): boolean {
    const grant = this.agentAuthPermissions.grantOf(projectId, agentId);
    return (
      grant !== null && (grant.allEndpoints === true || matchesRouteGrant(grant.apiIds, apiId))
    );
  }

  registerRole(roleId: string, contribution: RoleContribution, sourceModule?: string): void {
    this.agentAuthPermissions.registerRole(roleId, contribution, sourceModule);
  }

  registerRoute(registration: RouteRoleRegistration, sourceModule?: string): void {
    this.agentAuthPermissions.registerRoute(registration, sourceModule);
  }

  registerRoleBinding(contribution: RoleHttpBindingContribution, sourceModule?: string): void {
    this.agentAuthPermissions.registerRoleBinding(contribution, sourceModule);
  }

  describeRouteAuthFailure(routeId: string, role: string, groupId?: string): RouteAuthDebugInfo {
    return this.agentAuthPermissions.describeRouteAuthFailure(routeId, role, groupId);
  }

  generationOf(projectId: string, agentId: string) {
    return this.authRoleSessions.generationOf(projectId, agentId);
  }

  authenticate(bearer: string, now: Date): AgentAuthContext | null {
    const row: AuthRoleSessionRow | null = this.authRoleSessions.findByTokenHash(
      authRoleSessionTokenHash(bearer),
    );
    if (row === null || row.expiresAt <= now.toISOString()) return null;
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

@Component({
  contributes: {
    "AgentAuthPermissionProvider.roles": [
      { id: "role.none" },
      { id: "role.readonly" },
      { id: "role.general", children: ["readonly"] },
      {
        id: "role.system-maintainer",
        children: ["general"],
        flags: { allEndpoints: false, agentApi: true },
      },
      {
        id: "role.admin",
        children: ["system-maintainer"],
        flags: { allEndpoints: true, agentApi: false },
      },
      {
        id: "role.full-permissions",
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
    if (roles) for (const r of roles) this.roleRegistry.registerRole(r.id, r.data ?? r, r.from);

    const bindings = contributions.roleBindings as
      | ReadonlyArray<{
          readonly id: string;
          readonly from?: string;
          readonly data: RoleHttpBindingContribution;
        }>
      | undefined;
    if (bindings)
      for (const rb of bindings) this.roleRegistry.registerRoleBinding(rb.data ?? rb, rb.from);
  }

  registerRole(roleId: string, contribution: RoleContribution, sourceModule?: string): void {
    this.roleRegistry.registerRole(roleId, contribution, sourceModule);
  }

  registerRoute(registration: RouteRoleRegistration, sourceModule?: string): void {
    this.roleRegistry.registerRoute(registration, sourceModule);
  }

  registerRoleBinding(contribution: RoleHttpBindingContribution, sourceModule?: string): void {
    this.roleRegistry.registerRoleBinding(contribution, sourceModule);
  }

  describeRouteAuthFailure(routeId: string, role: string, groupId?: string): RouteAuthDebugInfo {
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
