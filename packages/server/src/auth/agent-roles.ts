/**
 * Modular authorization role registry (`RoleRegistry`), declarative role contributions
 * (`RoleContribution`), route role declarations (`RouteRoleRegistration`), unified `role -> http`
 * binding contributions (`RoleHttpBindingContribution`), and source-module debug attribution.
 *
 * Design principles:
 * 1. Roles are contributed declaratively via `"AgentAuthPermissionProvider.roles"` or
 *    `"HttpModule.roles"` (built-in roles live in `BuiltinAuthRoles`).
 * 2. `"HttpModule.routes"` contributions can directly declare `role` / `roles` and `endpoints`.
 *    Wildcards (`*`) in route IDs or role bindings are strictly forbidden.
 * 3. Unified `role -> http` route bindings can be contributed separately via
 *    `"AgentAuthPermissionProvider.roleBindings"` or `"HttpModule.roleBindings"`.
 * 4. Every role, route, and `role -> http` binding records its contributing `sourceModule`
 *    (`c.from`) so authorization failures report which module caused the failure.
 */
import { moduleMetaOf, type ModuleClass } from "@prismshadow/penguin-core/kernel";
import { BuiltinAuthRoles } from "./builtin-roles.js";

/**
 * Open role identifier type: includes all built-in roles contributed by `BuiltinAuthRoles`
 * as well as custom roles contributed by modules and plugins.
 */
export type AgentAuthRole = string;

/** A role reference in `RoleNode.children`, optionally qualified by `@<refinerId>` (e.g. `agent.maintain@self`). */
export type RoleChildRef = string;

/**
 * Default role assigned to newly created Agents (`general`).
 */
export const DEFAULT_AGENT_AUTH_ROLE: AgentAuthRole = "general";

/** The built-in roles whose sessions reach every route the server registers. */
export const ALL_ENDPOINT_ROLES: readonly AgentAuthRole[] = ["admin", "full-permissions"];

export interface RoleFlags {
  /** true = reaches every HTTP route without naming it (`admin`, `full-permissions`). */
  allEndpoints?: boolean;
  /** true = reaches human-gated endpoints (`requireHuman`) such as session creation/deletion and model key management. */
  agentApi?: boolean;
}

export interface RoleNode {
  /** Child roles (or route IDs) whose permissions are inherited by this role, optionally suffixed with `@<refinerId>`. */
  children?: readonly RoleChildRef[];
  /** Direct HTTP route IDs granted at this role node, optionally suffixed with `@<refinerId>`. Wildcards (`*`) are forbidden. */
  routes?: readonly string[];
  /** Special capability flags carried by this role node. */
  flags?: RoleFlags;
  /** Modules that contributed or extended this role node. */
  sourceModules?: readonly string[];
}

/**
 * Declarative role contribution for `"HttpModule.roles"` or `"AgentAuthPermissionProvider.roles"`.
 *
 * - When defining a new role node, the contribution entry `id` is used as the role ID unless
 *   `role` is explicitly specified (allowing multiple contributions with globally unique `id`s
 *   to extend the same role node, such as `"readonly"` or `"general"`).
 * - `children`, `routes`, and `flags` are merged additively (set union) into the target role node.
 * - `parents` grafts the target role into each named parent role's `children` (supporting
 *   optional `@<refinerId>` on the parent entry, e.g. `parents: ["general@self", "system-maintainer"]`).
 */
export interface RoleContribution {
  /** Target role ID to define or extend; defaults to the contribution entry `id`. */
  role?: string;
  /** Child roles or exact route IDs inherited by this role, optionally suffixed with `@<refinerId>`. */
  children?: readonly string[];
  /** Exact HTTP route IDs granted by this role, optionally suffixed with `@<refinerId>`. Wildcards (`*`) are forbidden. */
  routes?: readonly string[];
  /** Special capability flags carried by this role. */
  flags?: RoleFlags;
  /**
   * Parent roles that should inherit this role (e.g. `["readonly"]` or `["general@self"]`).
   * When a parent entry carries `@<refinerId>` (such as `"general@self"`), the parent role
   * inherits `<targetRole>@<refinerId>`.
   */
  parents?: readonly string[];
}

/**
 * Route-level authorization metadata declared on `"HttpModule.routes"` contributions or registered
 * programmatically via `RoleRegistry.registerRoute`.
 */
export interface RouteRoleRegistration {
  /** The `"HttpModule.routes"` contribution `id`. */
  id: string;
  /** Optional `"METHOD /subpath"` -> fine-grained route ID mapping for multi-endpoint Hono route groups. */
  endpoints?: { readonly [methodPath: string]: string };
  /**
   * Optional single role ID (or `<roleId>@<refinerId>`, e.g. `"readonly"` or `"general@self"`)
   * granted this route (and any sub-routes declared in `endpoints`).
   */
  role?: string;
  /**
   * Optional role IDs (or `<roleId>@<refinerId>`, e.g. `["readonly"]` or `["myPlugin.maintain", "general@self"]`)
   * granted this route (and any sub-routes declared in `endpoints`).
   */
  roles?: readonly string[];
  /** Module that contributed this route (`c.from`). */
  sourceModule?: string;
}

/**
 * Unified `role -> http` route binding contribution for `"AgentAuthPermissionProvider.roleBindings"`
 * or `"HttpModule.roleBindings"`.
 *
 * Allows modules and plugins to bind roles to exact HTTP route IDs (and register group endpoint
 * mappings or route aliases) separately from both the role declaration and the HTTP route mount.
 * Wildcards (`*`) in route IDs or role bindings are strictly forbidden.
 */
export interface RoleHttpBindingContribution {
  /** Optional target role ID when binding `routes` to a single role. */
  role?: string;
  /** Exact HTTP route IDs (optionally suffixed with `@<refinerId>`) bound to `role`. */
  routes?: readonly string[];
  /** Batch mapping of `{ [roleId]: readonly routeId[] }` for binding roles to exact HTTP route IDs. */
  bindings?: { readonly [roleId: string]: readonly string[] };
  /** Alias of `bindings` for `{ [roleId]: readonly routeId[] }` maps. */
  roles?: { readonly [roleId: string]: readonly string[] };
  /** Optional multi-endpoint group mapping (`{ [groupId]: { "METHOD /subpath": routeId } }`). */
  endpoints?: {
    readonly [groupId: string]: { readonly [methodPath: string]: string };
  };
  /** Optional route prefix aliases (`{ [fromPrefix]: toPrefix }`). */
  aliases?: { readonly [fromPrefix: string]: string };
}

/**
 * Source-module attribution details recorded and reported when an authorization check fails.
 */
export interface RouteAuthDebugInfo {
  readonly routeId: string;
  readonly groupId?: string;
  readonly role: string;
  /** Primary module responsible for the route or role binding involved in the failure. */
  readonly sourceModule: string;
  /** Module that registered the target HTTP route (`c.from` on `"HttpModule.routes"`). */
  readonly routeSourceModule: string;
  /** Module(s) that contributed the caller's role node. */
  readonly roleSourceModules: readonly string[];
  /** Module(s) that contributed `role -> http` bindings for the target route. */
  readonly bindingSourceModules: readonly string[];
  /** Role IDs that directly grant the target route. */
  readonly requiredRoles: readonly string[];
}

/** Parsed `<target>` and optional `@<refinerId>` suffix from a role or route grant entry. */
export interface RefinedGrantRef {
  target: string;
  refinerId: string | null;
}

/**
 * Splits a grant entry such as `"agent.maintain@self"` or `"session.delete@withAsk"`
 * into `{ target, refinerId }`. When no `@<refinerId>` is present, `refinerId` is `null`.
 */
export function parseRefinedGrant(spec: string): RefinedGrantRef {
  const trimmed = spec.trim();
  const atIdx = trimmed.indexOf("@");
  if (atIdx <= 0 || atIdx === trimmed.length - 1) {
    return { target: trimmed, refinerId: null };
  }
  const target = trimmed.slice(0, atIdx).trim();
  const refinerId = trimmed.slice(atIdx + 1).trim();
  return {
    target,
    refinerId: refinerId !== "" ? refinerId : null,
  };
}

/**
 * Enforces the no-wildcard invariant on route IDs, role IDs, and `role -> http` bindings.
 */
export function assertNoWildcard(value: string, context: string): void {
  if (value.includes("*")) {
    throw new Error(
      `Wildcard pattern "${value}" is not allowed in ${context}; declare exact HTTP route IDs or role bindings.`,
    );
  }
}

/** Result of expanding a role and extra grants against a `RoleRegistry`. */
export interface ExpandedRoleGrant {
  allEndpoints: boolean;
  agentApi: boolean;
  apiIds: ReadonlySet<string>;
  routeRefiners: Record<string, string[]>;
}

interface MutableRoleNode {
  children: string[];
  routes: string[];
  flags: RoleFlags;
  sourceModules: string[];
}

interface CompiledGrantMeta {
  readonly unconditionalSet: ReadonlySet<string>;
  readonly routeRefinerMap: ReadonlyMap<string, readonly string[]>;
}

const COMPILED_GRANT_META = new WeakMap<ReadonlySet<string>, CompiledGrantMeta>();

/**
 * Checks whether `grantedApiIds` (from an `AgentAuthGrant`) authorizes `routeId` (or its
 * enclosing `groupId`) using exact O(1) `Set.has` lookup on cached generation sets.
 * Wildcard patterns (`*`) are not allowed.
 */
export function matchesRouteGrant(
  grantedApiIds: ReadonlySet<string> | readonly string[],
  routeId: string,
  groupId?: string,
  registry: RoleRegistry = DEFAULT_ROLE_REGISTRY,
): boolean {
  assertNoWildcard(routeId, "matchesRouteGrant(routeId)");
  if (groupId !== undefined) {
    assertNoWildcard(groupId, "matchesRouteGrant(groupId)");
  }
  const normalized = registry.normalizeRouteId(routeId);
  const normalizedGroup = groupId !== undefined ? registry.normalizeRouteId(groupId) : undefined;
  if (!Array.isArray(grantedApiIds)) {
    const grantedSet = grantedApiIds as ReadonlySet<string>;
    if (grantedSet.has(normalized) || grantedSet.has(routeId)) {
      return true;
    }
    if (
      normalizedGroup !== undefined &&
      (grantedSet.has(normalizedGroup) || (groupId !== undefined && grantedSet.has(groupId)))
    ) {
      return true;
    }
    return false;
  }
  const grantedList = grantedApiIds as readonly string[];
  for (const granted of grantedList) {
    assertNoWildcard(granted, "matchesRouteGrant(grantedApiIds)");
    if (granted === normalized || granted === routeId) {
      return true;
    }
    if (
      normalizedGroup !== undefined &&
      (granted === normalizedGroup || granted === groupId)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Resolves the list of `@<refinerId>` IDs required for `routeId` (or `groupId`) under a cached
 * `grant.apiIds` set (or an explicit `routeRefiners` map). Unconditional exact grants take
 * precedence over refined grants.
 */
export function resolveRouteRefiners(
  grantedApiIds: ReadonlySet<string>,
  routeId: string,
  groupId?: string,
  registry?: RoleRegistry,
): readonly string[] | undefined;
export function resolveRouteRefiners(
  routeRefiners: Readonly<Record<string, readonly string[]>> | undefined,
  grantedApiIds: ReadonlySet<string> | readonly string[],
  routeId: string,
  groupId?: string,
  registry?: RoleRegistry,
): readonly string[] | undefined;
export function resolveRouteRefiners(
  grantOrRefiners:
    | ReadonlySet<string>
    | Readonly<Record<string, readonly string[]>>
    | undefined,
  routeIdOrGrantedApiIds: string | ReadonlySet<string> | readonly string[],
  groupIdOrRouteId?: string,
  registryOrGroupId?: RoleRegistry | string,
  maybeRegistry: RoleRegistry = DEFAULT_ROLE_REGISTRY,
): readonly string[] | undefined {
  if (grantOrRefiners instanceof Set) {
    const grantedSet = grantOrRefiners as ReadonlySet<string>;
    const meta = COMPILED_GRANT_META.get(grantedSet);
    if (meta === undefined) return undefined;
    const routeId = routeIdOrGrantedApiIds as string;
    const groupId = groupIdOrRouteId;
    const registry =
      registryOrGroupId instanceof RoleRegistry ? registryOrGroupId : DEFAULT_ROLE_REGISTRY;
    const normalized = registry.normalizeRouteId(routeId);
    const normalizedGroup =
      groupId !== undefined ? registry.normalizeRouteId(groupId) : undefined;

    if (
      meta.unconditionalSet.has(normalized) ||
      meta.unconditionalSet.has(routeId) ||
      (normalizedGroup !== undefined &&
        (meta.unconditionalSet.has(normalizedGroup) ||
          (groupId !== undefined && meta.unconditionalSet.has(groupId))))
    ) {
      return undefined;
    }

    return (
      meta.routeRefinerMap.get(normalized) ??
      meta.routeRefinerMap.get(routeId) ??
      (normalizedGroup !== undefined ? meta.routeRefinerMap.get(normalizedGroup) : undefined)
    );
  }

  const routeRefiners = grantOrRefiners as
    | Readonly<Record<string, readonly string[]>>
    | undefined;
  if (routeRefiners === undefined) return undefined;
  const grantedApiIds = routeIdOrGrantedApiIds as ReadonlySet<string> | readonly string[];
  const routeId = groupIdOrRouteId as string;
  const groupId = typeof registryOrGroupId === "string" ? registryOrGroupId : undefined;
  const registry =
    registryOrGroupId instanceof RoleRegistry ? registryOrGroupId : maybeRegistry;
  const normalized = registry.normalizeRouteId(routeId);
  const normalizedGroup = groupId !== undefined ? registry.normalizeRouteId(groupId) : undefined;

  return (
    (Object.hasOwn(routeRefiners, normalized) ? routeRefiners[normalized] : undefined) ??
    (Object.hasOwn(routeRefiners, routeId) ? routeRefiners[routeId] : undefined) ??
    (normalizedGroup !== undefined && Object.hasOwn(routeRefiners, normalizedGroup)
      ? routeRefiners[normalizedGroup]
      : undefined)
  );
}

/**
 * Dynamic, extensible registry of Agent authorization roles, route-group sub-endpoint mappings,
 * unified `role -> http` bindings, and `sourceModule` attribution.
 *
 * Built-in roles and bindings are loaded from `BuiltinAuthRoles` contributions rather than
 * hardcoded in this file, and external modules/plugins extend the registry via
 * `"HttpModule.roles"`, `"HttpModule.routes"`, `"HttpModule.roleBindings"`,
 * `"AgentAuthPermissionProvider.roles"`, or `"AgentAuthPermissionProvider.roleBindings"`.
 */
export class RoleRegistry {
  private readonly tree: Record<string, MutableRoleNode> = {};
  private readonly roleList: string[] = [];
  private readonly groupEndpoints: Record<string, Record<string, string>> = {};
  private readonly allRoutesList: string[] = [];
  private readonly allRoutesSet = new Set<string>();
  private readonly prefixAliases: Record<string, string> = {};
  private readonly baseRoleCache = new Map<string, ExpandedRoleGrant>();
  private readonly roleSources = new Map<string, Set<string>>();
  private readonly routeSources = new Map<string, string>();
  private readonly routeBindingSources = new Map<string, Set<string>>();
  private readonly routeRequiredRoles = new Map<string, Set<string>>();
  private readonly refinerBindingSources = new Map<string, string>();
  private readonly staticallyRefinedRoles = new Map<string, Set<string>>();
  private readonly staticallyRefinedRoutes = new Map<string, Set<string>>();
  private registryVersion = 0;

  constructor(options?: { seedBuiltin?: boolean }) {
    if (options?.seedBuiltin !== false) {
      this.seedFromComponent(BuiltinAuthRoles as unknown as ModuleClass, "BuiltinAuthRoles");
    }
  }

  private seedFromComponent(cls: ModuleClass, defaultSourceModule: string): void {
    const meta = moduleMetaOf(cls);
    const contributes = meta.contributes as
      | Readonly<Record<string, ReadonlyArray<Record<string, unknown>>>>
      | undefined;
    if (contributes === undefined) return;

    const roles =
      (contributes["AgentAuthPermissionProvider.roles"] as
        | ReadonlyArray<{ readonly id: string } & RoleContribution>
        | undefined) ??
      (contributes["HttpModule.roles"] as
        | ReadonlyArray<{ readonly id: string } & RoleContribution>
        | undefined);
    if (roles !== undefined) {
      for (const entry of roles) {
        this.registerRole(entry.id, entry, defaultSourceModule);
      }
    }

    const roleBindings =
      (contributes["AgentAuthPermissionProvider.roleBindings"] as
        | ReadonlyArray<{ readonly id: string } & RoleHttpBindingContribution>
        | undefined) ??
      (contributes["HttpModule.roleBindings"] as
        | ReadonlyArray<{ readonly id: string } & RoleHttpBindingContribution>
        | undefined);
    if (roleBindings !== undefined) {
      for (const entry of roleBindings) {
        this.registerRoleBinding(entry, defaultSourceModule);
      }
    }
  }

  /** Monotonic version incremented whenever roles, routes, bindings, or aliases are registered. */
  get version(): number {
    return this.registryVersion;
  }

  private bumpVersion(): void {
    this.registryVersion++;
    this.baseRoleCache.clear();
  }

  /** Live view of the role tree in this registry. */
  get roleTree(): Readonly<Record<string, RoleNode>> {
    return this.tree;
  }

  /** Live list of all role IDs registered in this registry. */
  get roles(): readonly string[] {
    return this.roleList;
  }

  /** Live mapping of multi-endpoint group IDs to `"METHOD /subpath"` -> fine-grained route ID. */
  get groupEndpointIds(): Readonly<Record<string, Readonly<Record<string, string>>>> {
    return this.groupEndpoints;
  }

  /** Live list of all concrete HTTP route IDs registered in this registry. */
  get allHttpRouteIds(): readonly string[] {
    return this.allRoutesList;
  }

  private recordKnownRouteId(routeId: string, sourceModule?: string, isRouteOwner = false): void {
    assertNoWildcard(routeId, "routeId");
    if (routeId === "") return;
    if (!this.allRoutesSet.has(routeId)) {
      this.allRoutesSet.add(routeId);
      this.allRoutesList.push(routeId);
    }
    if (sourceModule !== undefined && sourceModule !== "") {
      const existing = this.routeSources.get(routeId);
      if (existing === undefined || isRouteOwner || existing === "BuiltinAuthRoles") {
        this.routeSources.set(routeId, sourceModule);
      }
    }
  }

  private recordRoleSource(roleId: string, sourceModule?: string): void {
    if (roleId === "" || sourceModule === undefined || sourceModule === "") return;
    let set = this.roleSources.get(roleId);
    if (set === undefined) {
      set = new Set<string>();
      this.roleSources.set(roleId, set);
    }
    set.add(sourceModule);
    const node = this.tree[roleId];
    if (node !== undefined && !node.sourceModules.includes(sourceModule)) {
      node.sourceModules.push(sourceModule);
    }
  }

  private recordRouteBindingSource(
    roleId: string,
    routeId: string,
    sourceModule?: string,
    refinerId?: string | null,
  ): void {
    if (routeId === "") return;
    if (roleId !== "") {
      let roles = this.routeRequiredRoles.get(routeId);
      if (roles === undefined) {
        roles = new Set<string>();
        this.routeRequiredRoles.set(routeId, roles);
      }
      roles.add(roleId);
    }
    if (sourceModule !== undefined && sourceModule !== "") {
      let sources = this.routeBindingSources.get(routeId);
      if (sources === undefined) {
        sources = new Set<string>();
        this.routeBindingSources.set(routeId, sources);
      }
      sources.add(sourceModule);
      if (refinerId !== undefined && refinerId !== null && refinerId !== "") {
        this.refinerBindingSources.set(`${routeId}@${refinerId}`, sourceModule);
        if (roleId !== "") {
          this.refinerBindingSources.set(`${roleId}@${refinerId}`, sourceModule);
        }
      }
    }
    if (refinerId !== undefined && refinerId !== null && refinerId !== "") {
      let staticSet = this.staticallyRefinedRoutes.get(refinerId);
      if (staticSet === undefined) {
        staticSet = new Set<string>();
        this.staticallyRefinedRoutes.set(refinerId, staticSet);
      }
      staticSet.add(routeId);
    }
  }

  private recordStaticallyRefinedRole(roleId: string, refinerId: string, sourceModule?: string): void {
    let set = this.staticallyRefinedRoles.get(refinerId);
    if (set === undefined) {
      set = new Set<string>();
      this.staticallyRefinedRoles.set(refinerId, set);
    }
    set.add(roleId);
    if (sourceModule !== undefined && sourceModule !== "") {
      this.refinerBindingSources.set(`${roleId}@${refinerId}`, sourceModule);
    }
  }

  /**
   * Whether `routeId` is covered by a role or route binding that was statically attached to
   * `@<refinerId>` via module/component contributions (`registerRole`, `registerRoute`,
   * `registerRoleBinding`). Used by `AuthSelfRefiner` so plugin roles grafted into `general@self`
   * match `@self` without opening `AuthSelfRefiner` to arbitrary `admin.*@self` runtime grants.
   */
  isStaticallyRefinedRoute(refinerId: string, routeId: string): boolean {
    const norm = this.normalizeRouteId(routeId);
    const direct = this.staticallyRefinedRoutes.get(refinerId);
    if (direct !== undefined && (direct.has(norm) || direct.has(routeId))) {
      return true;
    }
    const roles = this.staticallyRefinedRoles.get(refinerId);
    if (roles !== undefined) {
      for (const roleId of roles) {
        const expanded = this.expandRoleGrant(roleId);
        if (expanded.apiIds.has(norm) || expanded.apiIds.has(routeId)) {
          return true;
        }
      }
    }
    return false;
  }

  /** Returns the module that registered `routeId` (or `groupId`), falling back to binding sources. */
  getRouteSourceModule(routeId: string, groupId?: string): string {
    const norm = this.normalizeRouteId(routeId);
    const normGroup = groupId !== undefined ? this.normalizeRouteId(groupId) : undefined;
    const direct =
      this.routeSources.get(norm) ??
      this.routeSources.get(routeId) ??
      (normGroup !== undefined ? this.routeSources.get(normGroup) : undefined) ??
      (groupId !== undefined ? this.routeSources.get(groupId) : undefined);
    if (direct !== undefined) return direct;
    const bindingSet =
      this.routeBindingSources.get(norm) ??
      (normGroup !== undefined ? this.routeBindingSources.get(normGroup) : undefined);
    if (bindingSet !== undefined && bindingSet.size > 0) {
      return [...bindingSet][0]!;
    }
    return "unknown";
  }

  /** Returns the module(s) that contributed or extended `roleId`. */
  getRoleSourceModules(roleId: string): readonly string[] {
    const parsed = parseRefinedGrant(roleId);
    const set = this.roleSources.get(parsed.target);
    return set !== undefined ? [...set] : [];
  }

  /** Returns the module that bound `@<refinerId>` to `routeId` or `roleId`, if known. */
  getRefinerBindingSource(routeId: string, refinerId: string, roleId?: string): string | undefined {
    const norm = this.normalizeRouteId(routeId);
    if (roleId !== undefined) {
      const parsedRole = parseRefinedGrant(roleId);
      const byRole =
        this.refinerBindingSources.get(`${parsedRole.target}@${refinerId}`) ??
        this.refinerBindingSources.get(`${roleId}@${refinerId}`);
      if (byRole !== undefined) return byRole;
    }
    return (
      this.refinerBindingSources.get(`${norm}@${refinerId}`) ??
      this.refinerBindingSources.get(`${routeId}@${refinerId}`)
    );
  }

  /**
   * Builds structured source-module attribution when a request for `routeId` under `role` fails
   * authorization, identifying which module contributed the route, the role, and the role bindings.
   */
  describeRouteAuthFailure(
    routeId: string,
    role: string,
    groupId?: string,
  ): RouteAuthDebugInfo {
    const norm = this.normalizeRouteId(routeId);
    const normGroup = groupId !== undefined ? this.normalizeRouteId(groupId) : undefined;
    const routeSourceModule = this.getRouteSourceModule(norm, normGroup);
    const roleSourceModules = this.getRoleSourceModules(role);
    const bindingSet =
      this.routeBindingSources.get(norm) ??
      (normGroup !== undefined ? this.routeBindingSources.get(normGroup) : undefined);
    const bindingSourceModules = bindingSet !== undefined ? [...bindingSet] : [];
    const reqRolesSet =
      this.routeRequiredRoles.get(norm) ??
      (normGroup !== undefined ? this.routeRequiredRoles.get(normGroup) : undefined);
    const requiredRoles = reqRolesSet !== undefined ? [...reqRolesSet] : [];
    const sourceModule =
      routeSourceModule !== "unknown"
        ? routeSourceModule
        : (bindingSourceModules[0] ?? roleSourceModules[0] ?? "unknown");

    return {
      routeId: norm,
      ...(normGroup !== undefined ? { groupId: normGroup } : {}),
      role,
      sourceModule,
      routeSourceModule,
      roleSourceModules,
      bindingSourceModules,
      requiredRoles,
    };
  }

  private ensureRoleNode(roleId: string, sourceModule?: string): MutableRoleNode {
    assertNoWildcard(roleId, "roleId");
    let node = this.tree[roleId];
    if (node === undefined) {
      node = { children: [], routes: [], flags: {}, sourceModules: [] };
      this.tree[roleId] = node;
      this.roleList.push(roleId);
    }
    this.recordRoleSource(roleId, sourceModule);
    return node;
  }

  /** Whether `value` is a registered role node in this registry. */
  isRole(value: string): boolean {
    return Object.hasOwn(this.tree, value);
  }

  /** Registers a legacy or shorthand route prefix alias (e.g. `"agents.slack"` -> `"agents.messaging.slack"`). */
  registerRouteAlias(fromPrefix: string, toPrefix: string): void {
    assertNoWildcard(fromPrefix, "registerRouteAlias(fromPrefix)");
    assertNoWildcard(toPrefix, "registerRouteAlias(toPrefix)");
    const from = fromPrefix.trim().replace(/^penguin\./, "");
    const to = toPrefix.trim().replace(/^penguin\./, "");
    if (from !== "" && to !== "") {
      this.prefixAliases[from] = to;
      this.bumpVersion();
    }
  }

  /**
   * Normalizes a route ID by stripping the optional `"penguin."` namespace prefix and mapping
   * registered prefix aliases.
   */
  normalizeRouteId(routeId: string): string {
    const trimmed = routeId.trim();
    const stripped = trimmed.startsWith("penguin.") ? trimmed.slice("penguin.".length) : trimmed;
    for (const [aliasFrom, canonicalTo] of Object.entries(this.prefixAliases)) {
      if (stripped === aliasFrom) return canonicalTo;
      if (stripped.startsWith(`${aliasFrom}.`)) {
        return `${canonicalTo}${stripped.slice(aliasFrom.length)}`;
      }
    }
    return stripped;
  }

  /**
   * Resolves the fine-grained route ID for a sub-route inside an `HttpModule.routes` contribution
   * using registered `groupEndpointIds`, falling back to the normalized contribution ID.
   */
  resolveHttpRouteId(routeContributionId: string, method: string, subPath: string): string {
    const upperMethod = method.toUpperCase();
    const normSubPath = subPath === "" ? "/" : subPath;
    const key = `${upperMethod} ${normSubPath}`;
    const normGroupId = this.normalizeRouteId(routeContributionId);

    const groupMap = this.groupEndpoints[routeContributionId] ?? this.groupEndpoints[normGroupId];
    const mapped = groupMap?.[key] ?? groupMap?.[`${upperMethod} ${subPath}`];
    if (mapped !== undefined) return mapped;

    return normGroupId;
  }

  private bindRouteToRole(
    roleSpec: string,
    rawRouteSpec: string,
    sourceModule?: string,
    isRouteOwner = false,
  ): void {
    assertNoWildcard(roleSpec, `role binding "${roleSpec}"`);
    assertNoWildcard(rawRouteSpec, `route binding "${rawRouteSpec}"`);
    const parsedRole = parseRefinedGrant(roleSpec);
    const parsedRoute = parseRefinedGrant(rawRouteSpec);
    if (parsedRole.target === "" || parsedRoute.target === "") return;

    const roleNode = this.ensureRoleNode(parsedRole.target, sourceModule);
    const normRoute = this.normalizeRouteId(parsedRoute.target);
    const effectiveRefiner = parsedRoute.refinerId ?? parsedRole.refinerId;
    const routeEntry =
      effectiveRefiner !== null ? `${normRoute}@${effectiveRefiner}` : normRoute;
    if (!roleNode.routes.includes(routeEntry)) {
      roleNode.routes.push(routeEntry);
    }
    this.recordKnownRouteId(normRoute, sourceModule, isRouteOwner);
    this.recordRouteBindingSource(parsedRole.target, normRoute, sourceModule, effectiveRefiner);
  }

  /**
   * Registers or extends a role node in this registry.
   * - `contribution.role` overrides `roleId` as the target role name.
   * - `children`, `routes`, and `flags` are merged additively (set union).
   * - `parents` attaches the target role into each named parent role's `children`.
   * - Wildcards (`*`) are strictly forbidden.
   */
  registerRole(
    roleId: string,
    contribution: RoleContribution,
    sourceModule?: string,
  ): void {
    const rawTarget = (contribution.role ?? roleId).trim();
    assertNoWildcard(rawTarget, `registerRole("${rawTarget}")`);
    const parsedTarget = parseRefinedGrant(rawTarget);
    const targetRole = parsedTarget.target;
    if (targetRole === "") return;

    const node = this.ensureRoleNode(targetRole, sourceModule);

    if (contribution.children !== undefined) {
      for (const childSpec of contribution.children) {
        const trimmed = childSpec.trim();
        if (trimmed === "") continue;
        assertNoWildcard(trimmed, `registerRole("${targetRole}").children`);
        const parsedChild = parseRefinedGrant(trimmed);
        if (parsedChild.refinerId !== null) {
          this.recordStaticallyRefinedRole(
            parsedChild.target,
            parsedChild.refinerId,
            sourceModule,
          );
        }
        if (!node.children.includes(trimmed)) {
          node.children.push(trimmed);
        }
      }
    }

    if (contribution.routes !== undefined) {
      for (const routeSpec of contribution.routes) {
        const trimmed = routeSpec.trim();
        if (trimmed === "") continue;
        this.bindRouteToRole(targetRole, trimmed, sourceModule, false);
      }
    }

    if (contribution.flags !== undefined) {
      if (contribution.flags.allEndpoints) node.flags.allEndpoints = true;
      if (contribution.flags.agentApi) node.flags.agentApi = true;
    }

    if (contribution.parents !== undefined) {
      for (const parentSpec of contribution.parents) {
        const trimmedParent = parentSpec.trim();
        if (trimmedParent === "") continue;
        assertNoWildcard(trimmedParent, `registerRole("${targetRole}").parents`);
        const parsedParent = parseRefinedGrant(trimmedParent);
        if (parsedParent.target === "") continue;
        const parentNode = this.ensureRoleNode(parsedParent.target, sourceModule);
        const childRef =
          parsedParent.refinerId !== null ? `${targetRole}@${parsedParent.refinerId}` : targetRole;
        if (parsedParent.refinerId !== null) {
          this.recordStaticallyRefinedRole(targetRole, parsedParent.refinerId, sourceModule);
        }
        if (!parentNode.children.includes(childRef)) {
          parentNode.children.push(childRef);
        }
      }
    }

    this.bumpVersion();
  }

  /**
   * Registers a batch of role contributions from either a `{ [roleId]: RoleContribution }` record
   * or an array of `"HttpModule.roles"` / `"AgentAuthPermissionProvider.roles"` slot entries.
   */
  registerRoles(
    input:
      | Readonly<Record<string, RoleContribution>>
      | ReadonlyArray<
          {
            readonly id: string;
            readonly from?: string;
            readonly data?: RoleContribution;
          } & RoleContribution
        >,
    defaultSourceModule?: string,
  ): void {
    if (Array.isArray(input)) {
      for (const item of input) {
        const contrib: RoleContribution = item.data !== undefined ? item.data : item;
        this.registerRole(item.id, contrib, item.from ?? defaultSourceModule);
      }
      return;
    }
    const record = input as Readonly<Record<string, RoleContribution>>;
    for (const [roleId, contrib] of Object.entries(record)) {
      this.registerRole(roleId, contrib, defaultSourceModule);
    }
  }

  /**
   * Registers or merges `"METHOD /subpath"` -> fine-grained route ID mappings for a multi-endpoint
   * `HttpModule.routes` group contribution.
   */
  registerGroupEndpoints(
    groupId: string,
    endpoints: Readonly<Record<string, string>>,
    sourceModule?: string,
    isRouteOwner = false,
  ): void {
    const rawGroup = groupId.trim();
    if (rawGroup === "") return;
    assertNoWildcard(rawGroup, `registerGroupEndpoints("${rawGroup}")`);
    const normGroup = this.normalizeRouteId(rawGroup);
    if (sourceModule !== undefined && sourceModule !== "") {
      const existingGroupSource = this.routeSources.get(normGroup);
      if (
        existingGroupSource === undefined ||
        isRouteOwner ||
        existingGroupSource === "BuiltinAuthRoles"
      ) {
        this.routeSources.set(normGroup, sourceModule);
        if (rawGroup !== normGroup) {
          this.routeSources.set(rawGroup, sourceModule);
        }
      }
    }
    const existing = this.groupEndpoints[normGroup] ?? this.groupEndpoints[rawGroup] ?? {};
    const merged: Record<string, string> = { ...existing };

    for (const [rawMethodPath, rawEndpointId] of Object.entries(endpoints)) {
      assertNoWildcard(rawEndpointId, `registerGroupEndpoints("${rawGroup}") endpoint`);
      const trimmedKey = rawMethodPath.trim();
      const spaceIdx = trimmedKey.indexOf(" ");
      const normalizedKey =
        spaceIdx > 0
          ? `${trimmedKey.slice(0, spaceIdx).toUpperCase()} ${trimmedKey.slice(spaceIdx + 1).trim() || "/"}`
          : trimmedKey;
      const normEndpointId = this.normalizeRouteId(rawEndpointId);
      if (normalizedKey !== "" && normEndpointId !== "") {
        merged[normalizedKey] = normEndpointId;
        this.recordKnownRouteId(normEndpointId, sourceModule, isRouteOwner);
      }
    }

    this.groupEndpoints[normGroup] = merged;
    if (rawGroup !== normGroup) {
      this.groupEndpoints[rawGroup] = merged;
    }
    this.bumpVersion();
  }

  /**
   * Registers a route contribution's sub-endpoint mappings (`endpoints`), direct role bindings
   * (`role` / `roles`, supporting `<roleId>@<refinerId>`), and contributing `sourceModule`.
   */
  registerRoute(registration: RouteRoleRegistration, sourceModule?: string): void {
    const rawId = registration.id.trim();
    if (rawId === "") return;
    assertNoWildcard(rawId, `registerRoute("${rawId}")`);
    const effectiveSource = registration.sourceModule ?? sourceModule;
    const normId = this.normalizeRouteId(rawId);

    const leafRouteIds: string[] = [];
    if (registration.endpoints !== undefined && Object.keys(registration.endpoints).length > 0) {
      this.registerGroupEndpoints(rawId, registration.endpoints, effectiveSource, true);
      for (const epId of Object.values(registration.endpoints)) {
        const normEp = this.normalizeRouteId(epId);
        if (normEp !== "" && !leafRouteIds.includes(normEp)) {
          leafRouteIds.push(normEp);
        }
      }
    } else {
      const existingGroup = this.groupEndpoints[normId] ?? this.groupEndpoints[rawId];
      if (existingGroup !== undefined) {
        if (effectiveSource !== undefined && effectiveSource !== "") {
          this.routeSources.set(normId, effectiveSource);
          if (rawId !== normId) {
            this.routeSources.set(rawId, effectiveSource);
          }
        }
        for (const epId of Object.values(existingGroup)) {
          if (effectiveSource !== undefined && effectiveSource !== "") {
            this.routeSources.set(epId, effectiveSource);
          }
          if (!leafRouteIds.includes(epId)) leafRouteIds.push(epId);
        }
      } else {
        this.recordKnownRouteId(normId, effectiveSource, true);
      }
    }
    if (!leafRouteIds.includes(normId)) {
      leafRouteIds.push(normId);
      if (effectiveSource !== undefined && effectiveSource !== "") {
        this.routeSources.set(normId, effectiveSource);
      }
    }

    const declaredRoles: string[] = [];
    if (registration.role !== undefined && registration.role.trim() !== "") {
      declaredRoles.push(registration.role.trim());
    }
    if (registration.roles !== undefined) {
      for (const r of registration.roles) {
        if (r.trim() !== "") declaredRoles.push(r.trim());
      }
    }

    for (const roleSpec of declaredRoles) {
      assertNoWildcard(roleSpec, `registerRoute("${rawId}").roles`);
      for (const leafId of leafRouteIds) {
        this.bindRouteToRole(roleSpec, leafId, effectiveSource, true);
      }
    }
    this.bumpVersion();
  }

  /**
   * Registers a batch of route registrations or `"HttpModule.routes"` slot contribution entries.
   */
  registerRoutes(
    routes: ReadonlyArray<
      RouteRoleRegistration & {
        readonly from?: string;
        readonly data?: {
          readonly endpoints?: { readonly [methodPath: string]: string };
          readonly role?: string;
          readonly roles?: readonly string[];
        };
      }
    >,
    defaultSourceModule?: string,
  ): void {
    for (const item of routes) {
      const endpoints = item.endpoints ?? item.data?.endpoints;
      const role = item.role ?? item.data?.role;
      const roles = item.roles ?? item.data?.roles;
      const sourceModule = item.sourceModule ?? item.from ?? defaultSourceModule;
      this.registerRoute({
        id: item.id,
        ...(endpoints !== undefined ? { endpoints } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(roles !== undefined ? { roles } : {}),
        ...(sourceModule !== undefined ? { sourceModule } : {}),
      });
    }
  }

  /**
   * Registers a unified `role -> http` binding contribution (`RoleHttpBindingContribution`).
   * Supports `aliases`, `endpoints` (`{ [groupId]: { "METHOD /subpath": routeId } }`),
   * single-role `role` + `routes`, and multi-role `bindings` / `roles` maps.
   */
  registerRoleBinding(
    contribution: RoleHttpBindingContribution,
    sourceModule?: string,
  ): void {
    if (contribution.aliases !== undefined) {
      for (const [fromPrefix, toPrefix] of Object.entries(contribution.aliases)) {
        this.registerRouteAlias(fromPrefix, toPrefix);
      }
    }

    if (contribution.endpoints !== undefined) {
      for (const [groupId, map] of Object.entries(contribution.endpoints)) {
        this.registerGroupEndpoints(groupId, map, sourceModule, false);
      }
    }

    if (contribution.role !== undefined && contribution.routes !== undefined) {
      const roleSpec = contribution.role.trim();
      assertNoWildcard(roleSpec, "registerRoleBinding(role)");
      for (const routeSpec of contribution.routes) {
        const trimmed = routeSpec.trim();
        if (trimmed === "") continue;
        this.bindRouteToRole(roleSpec, trimmed, sourceModule, false);
      }
    }

    const roleMap = contribution.bindings ?? contribution.roles;
    if (roleMap !== undefined) {
      for (const [roleSpec, routeList] of Object.entries(roleMap)) {
        const trimmedRole = roleSpec.trim();
        if (trimmedRole === "") continue;
        assertNoWildcard(trimmedRole, `registerRoleBinding("${trimmedRole}")`);
        for (const routeSpec of routeList) {
          const trimmedRoute = routeSpec.trim();
          if (trimmedRoute === "") continue;
          this.bindRouteToRole(trimmedRole, trimmedRoute, sourceModule, false);
        }
      }
    }

    this.bumpVersion();
  }

  /**
   * Registers a batch of unified `role -> http` binding contributions.
   */
  registerRoleBindings(
    bindings: ReadonlyArray<
      {
        readonly id?: string;
        readonly from?: string;
        readonly data?: RoleHttpBindingContribution;
      } & RoleHttpBindingContribution
    >,
    defaultSourceModule?: string,
  ): void {
    for (const item of bindings) {
      const data: RoleHttpBindingContribution = item.data !== undefined ? item.data : item;
      this.registerRoleBinding(data, item.from ?? defaultSourceModule);
    }
  }

  /**
   * Expands a primary `role` (which may carry `<role>@<refinerId>`) and optional `extraGrants`
   * (additional role nodes or exact route IDs, with optional `@<refinerId>`) into the effective
   * route `Set`, capability flags, and pre-compiled refiner metadata.
   * Wildcard patterns (`*`) are strictly forbidden.
   */
  expandRoleGrant(role: string, extraGrants: readonly string[] = []): ExpandedRoleGrant {
    assertNoWildcard(role, `expandRoleGrant(role="${role}")`);
    for (const extra of extraGrants) {
      assertNoWildcard(extra, `expandRoleGrant(extraGrants="${extra}")`);
    }

    if (extraGrants.length === 0) {
      const cached = this.baseRoleCache.get(role);
      if (cached !== undefined) {
        return cached;
      }
    }

    const visited = new Set<string>();
    const allRoutes = new Set<string>();
    const unconditionalRoutes = new Set<string>();
    const refinedRouteMap = new Map<string, Set<string>>();
    let allEndpoints = false;
    let agentApi = false;

    const recordRoute = (routeId: string, refinerId: string | null): void => {
      assertNoWildcard(routeId, `expandRoleGrant route "${routeId}"`);
      const normalized = this.normalizeRouteId(routeId);
      if (normalized === "") return;
      allRoutes.add(normalized);
      if (refinerId === null) {
        unconditionalRoutes.add(normalized);
      } else {
        let set = refinedRouteMap.get(normalized);
        if (set === undefined) {
          set = new Set<string>();
          refinedRouteMap.set(normalized, set);
        }
        set.add(refinerId);
      }
    };

    const visitRole = (
      r: string,
      inheritedRefiner: string | null,
      isRootRefined: boolean,
    ): void => {
      const isReadTier = r === "readonly" || r.endsWith(".read");
      const effectiveRefiner =
        inheritedRefiner !== null && isReadTier && !isRootRefined ? null : inheritedRefiner;
      const visitKey = `${r}@${effectiveRefiner ?? ""}`;
      if (visited.has(visitKey)) return;
      visited.add(visitKey);

      const node = this.tree[r];
      if (node === undefined) return;
      if (effectiveRefiner === null) {
        if (node.flags.allEndpoints) allEndpoints = true;
        if (node.flags.agentApi) agentApi = true;
      }
      for (const routeSpec of node.routes) {
        const parsed = parseRefinedGrant(routeSpec);
        const routeRefiner = parsed.refinerId ?? effectiveRefiner;
        recordRoute(parsed.target, routeRefiner);
      }
      for (const childSpec of node.children) {
        const parsed = parseRefinedGrant(childSpec);
        if (this.isRole(parsed.target)) {
          const childRefiner = parsed.refinerId ?? effectiveRefiner;
          const childRootRefined = parsed.refinerId !== null;
          visitRole(parsed.target, childRefiner, childRootRefined);
        } else if (parsed.target !== "") {
          recordRoute(parsed.target, parsed.refinerId ?? effectiveRefiner);
        }
      }
    };

    const applyGrantSpec = (spec: string): void => {
      const parsed = parseRefinedGrant(spec);
      if (parsed.target === "") return;
      if (this.isRole(parsed.target)) {
        visitRole(parsed.target, parsed.refinerId, parsed.refinerId !== null);
      } else {
        recordRoute(parsed.target, parsed.refinerId);
      }
    };

    applyGrantSpec(role);
    for (const item of extraGrants) {
      applyGrantSpec(item);
    }

    const routeRefiners: Record<string, string[]> = {};
    const routeRefinerMap = new Map<string, readonly string[]>();
    if (!allEndpoints) {
      for (const [routeId, refiners] of refinedRouteMap.entries()) {
        if (!unconditionalRoutes.has(routeId) && refiners.size > 0) {
          const list = [...refiners];
          routeRefiners[routeId] = list;
          routeRefinerMap.set(routeId, list);
        }
      }
    }

    COMPILED_GRANT_META.set(allRoutes, {
      unconditionalSet: unconditionalRoutes,
      routeRefinerMap,
    });

    const result: ExpandedRoleGrant = {
      allEndpoints,
      agentApi,
      apiIds: allRoutes,
      routeRefiners,
    };
    if (extraGrants.length === 0) {
      this.baseRoleCache.set(role, result);
    }
    return result;
  }

  /** Whether the role reaches every route without its granted set naming it. */
  roleSpansAllEndpoints(role: string): boolean {
    return this.expandRoleGrant(role).allEndpoints;
  }

  /** Whether the role carries the Agent's own API settings and keys (human-gated endpoints). */
  roleHasAgentApi(role: string): boolean {
    return this.expandRoleGrant(role).agentApi;
  }
}

/**
 * Default process-wide `RoleRegistry` instance seeded from `BuiltinAuthRoles`.
 */
export const DEFAULT_ROLE_REGISTRY = new RoleRegistry();

/** Declarative Role Tree (`ROLE_TREE`) backed by `DEFAULT_ROLE_REGISTRY`. */
export const ROLE_TREE: Readonly<Record<string, RoleNode>> = DEFAULT_ROLE_REGISTRY.roleTree;

/** All registered role IDs in `DEFAULT_ROLE_REGISTRY`. */
export const AGENT_AUTH_ROLES: readonly string[] = DEFAULT_ROLE_REGISTRY.roles;

/** Built-in role IDs contributed by `BuiltinAuthRoles`. */
export const BUILTIN_AGENT_AUTH_ROLES: readonly string[] = [...DEFAULT_ROLE_REGISTRY.roles];
export type BuiltinAgentAuthRole = string;

/** Group endpoint sub-route map backed by `DEFAULT_ROLE_REGISTRY`. */
export const HTTP_GROUP_ENDPOINT_IDS: Readonly<
  Record<string, Readonly<Record<string, string>>>
> = DEFAULT_ROLE_REGISTRY.groupEndpointIds;

/** Complete list of concrete HTTP route IDs registered in `DEFAULT_ROLE_REGISTRY`. */
export const ALL_HTTP_ROUTE_IDS: readonly string[] = DEFAULT_ROLE_REGISTRY.allHttpRouteIds;

/**
 * Normalizes a route ID by stripping the optional `"penguin."` namespace prefix and mapping
 * registered prefix aliases in `DEFAULT_ROLE_REGISTRY`.
 */
export function normalizeRouteId(routeId: string): string {
  return DEFAULT_ROLE_REGISTRY.normalizeRouteId(routeId);
}

/**
 * Resolves the fine-grained route ID for a sub-route inside an `HttpModule.routes` contribution
 * against `DEFAULT_ROLE_REGISTRY`.
 */
export function resolveHttpRouteId(
  routeContributionId: string,
  method: string,
  subPath: string,
): string {
  return DEFAULT_ROLE_REGISTRY.resolveHttpRouteId(routeContributionId, method, subPath);
}

/** Whether `value` is a registered role node in `DEFAULT_ROLE_REGISTRY` (or `registry` when provided). */
export function isAgentAuthRole(
  value: string,
  registry: RoleRegistry = DEFAULT_ROLE_REGISTRY,
): value is AgentAuthRole {
  return registry.isRole(value);
}

/**
 * Expands a primary `role` (which may carry `<role>@<refinerId>`) and optional `extraGrants`
 * against `DEFAULT_ROLE_REGISTRY` (or `registry` when provided).
 */
export function expandRoleGrant(
  role: string,
  extraGrants: readonly string[] = [],
  registry: RoleRegistry = DEFAULT_ROLE_REGISTRY,
): ExpandedRoleGrant {
  return registry.expandRoleGrant(role, extraGrants);
}

/** Whether the role reaches every route without its granted set naming it. */
export function roleSpansAllEndpoints(
  role: string,
  registry: RoleRegistry = DEFAULT_ROLE_REGISTRY,
): boolean {
  return registry.roleSpansAllEndpoints(role);
}

/** Whether the role carries the Agent's own API settings and keys (human-gated endpoints). */
export function roleHasAgentApi(
  role: string,
  registry: RoleRegistry = DEFAULT_ROLE_REGISTRY,
): boolean {
  return registry.roleHasAgentApi(role);
}
