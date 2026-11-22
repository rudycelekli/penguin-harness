/**
 * Role-bound authorization session & permission mechanisms: what the server requires of the
 * role-scoped sessions it issues, declared apart from `db/repos/auth-role-sessions.ts`.
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

/** The principal's CURRENT grant: role scope plus explicit route ids, cached per generation. */
export interface AgentAuthGrant {
  role: AgentAuthRole;
  generation: number;
  allEndpoints: boolean;
  agentApi?: boolean;
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

export interface AgentAuthPermissionsSlots {
  roles: Slot<RoleContribution>;
  roleBindings: Slot<RoleHttpBindingContribution>;
}

/** The per-route grant face: what AgentAuthPermissionProvider implements. */
@Interface()
export abstract class AgentAuthPermissions {
  abstract grantOf(projectId: string, agentId: string): AgentAuthGrant | null;
  abstract registerRole(
    roleId: string,
    contribution: RoleContribution,
    sourceModule?: string,
  ): void;
  abstract registerRoute(registration: RouteRoleRegistration, sourceModule?: string): void;
  abstract registerRoleBinding(
    contribution: RoleHttpBindingContribution,
    sourceModule?: string,
  ): void;
  abstract describeRouteAuthFailure(
    routeId: string,
    role: string,
    groupId?: string,
  ): RouteAuthDebugInfo;
}

/** AuthRoleSessions: the mechanism AuthRoleSessionsRepo implements. */
@Interface()
export abstract class AuthRoleSessions {
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
  abstract findByTokenHash(tokenHash: string): AuthRoleSessionRow | null;
  abstract generationBySubject(subjectId: string): AuthGenerationRow | null;
  abstract generationOf(projectId: string, agentId: string): AuthGenerationRow | null;
  abstract bumpSubjectGeneration(opts: {
    subjectId?: string;
    userId?: string | null;
    projectId?: string | null;
    agentId?: string | null;
    role: string;
    apiIds: readonly string[];
    generation: number;
  }): void;
  abstract bumpGeneration(
    projectId: string,
    agentId: string,
    role: string,
    apiIds: readonly string[],
    generation: number,
  ): void;
  abstract touch(tokenHash: string, at: string): void;
  abstract deleteSessionsOf(projectId: string, agentId: string): void;
  abstract deleteBySubject(subjectId: string): void;
  abstract deleteByAgent(projectId: string, agentId: string): void;
  abstract deleteExpired(at: string): void;
}

/** AgentAuth: the mechanism the auth service implements (`auth/agent-auth-service.ts`). */
@Interface()
export abstract class AgentAuth {
  abstract issueSession(
    projectId: string,
    agentId: string,
    now: Date,
  ): { token: string; expiresAt: string; generation: number; role: AgentAuthRole };
  abstract currentGrant(projectId: string, agentId: string): AgentAuthGrant | null;
  abstract allowsEndpoint(projectId: string, agentId: string, apiId: string): boolean;
  abstract generationOf(projectId: string, agentId: string): AuthGenerationRow | null;
  abstract authenticate(bearer: string, now: Date): AgentAuthContext | null;
  abstract revokeAll(projectId: string, agentId: string): void;
  abstract ensureSessionToken(projectId: string, agentId: string, now: Date): string;
  abstract updateGrant(
    projectId: string,
    agentId: string,
    role: AgentAuthRole,
    apiIds: readonly string[],
    now: Date,
  ): { generation: number; role: AgentAuthRole; apiIds: readonly string[]; token: string };
  abstract registerRole(
    roleId: string,
    contribution: RoleContribution,
    sourceModule?: string,
  ): void;
  abstract registerRoute(registration: RouteRoleRegistration, sourceModule?: string): void;
  abstract registerRoleBinding(
    contribution: RoleHttpBindingContribution,
    sourceModule?: string,
  ): void;
  abstract describeRouteAuthFailure(
    routeId: string,
    role: string,
    groupId?: string,
  ): RouteAuthDebugInfo;
}
