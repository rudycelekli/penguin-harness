import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { Interface, Module, Provide, Use } from "@prismshadow/penguin-core/kernel";
import type { Opaque, Slot, ClassCtx } from "@prismshadow/penguin-core/kernel";
import { Hono } from "hono";
import type { Context, ErrorHandler, MiddlewareHandler } from "hono";
import type { AppEnv } from "../auth/middleware.js";
import { Config, Log } from "../hmr/capabilities.js";
import { bodyLimit } from "hono/body-limit";
import {
  authMiddleware,
  bearerToken,
  jsonOnlyWrites,
  sameOriginWrites,
} from "../auth/middleware.js";
import { AMSP_PREFIX, amspAllowOrigin } from "../amsp/cors.js";
import { HttpError, handleError } from "./errors.js";
import { originRule } from "@prismshadow/penguin-library-http/public-origin";
import { ownOriginPrefixes } from "./own-origin.js";
import { adoptGroup } from "./foreign-groups.js";
import { upgradeDispatch } from "./upgrade-endpoints.js";
import type { WebSocketUpgrade } from "./upgrade-endpoints.js";
import { attributedProjectId } from "@prismshadow/penguin-library-http/attribution";
import { jsonCompression } from "@prismshadow/penguin-library-http/json-compression";
import { jsonValidators } from "@prismshadow/penguin-library-http/json-validators";
import { bodyLimitBytes } from "@prismshadow/penguin-library-setting/attachment-limits";
import { isAgentImport, MAX_PACKAGE_BYTES } from "@prismshadow/penguin-library-agent/agent-zip";
import { declined } from "../hmr/hono-seam.js";
import type { Auth, Users } from "@prismshadow/penguin-library-auth";
import type { Access, Projects } from "@prismshadow/penguin-library-project";
import type { Errors } from "@prismshadow/penguin-library-observability";
import type { Settings } from "@prismshadow/penguin-library-setting";
import type { AgentAuth } from "../mechanisms/agent-auth.js";
import {
  DEFAULT_ROLE_REGISTRY,
  RoleRegistry,
  matchesRouteGrant,
  resolveRouteRefiners,
  type RoleContribution,
  type RoleHttpBindingContribution,
} from "../auth/agent-roles.js";
import {
  AuthRefinerRegistry,
  type AuthRefiner,
  type AuthRefinerAction,
  type AuthRefinerContext,
  type AuthRefinerInput,
} from "../auth/auth-refiners.js";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "ALL";

/**
 * The assembled business surface: one request in, one response (or a decline) out.
 *
 * `fetchAs` is the same surface entered as a user already established by other means — the
 * API socket (socket/serve.ts), whose handshake the runtime authenticated and whose owner it
 * checked before the platform ever saw the socket. Those requests carry no cookie, so the
 * gate in front of the routes is not the cookie one but "this user": the routes themselves,
 * their authorization and their errors are identical.
 */
@Interface()
export abstract class Http {
  abstract fetch(request: Opaque<"Request", Request>): Promise<Opaque<"Response", Response>>;
  abstract fetchAs(
    userId: string,
    request: Opaque<"Request", Request>,
  ): Promise<Opaque<"Response", Response>>;
  /**
   * Hands a WebSocket upgrade to the contributed endpoint (`HttpModule.upgrades`) whose prefix
   * covers its path most specifically — checking the handshake's Origin and session cookie first
   * for an `auth: "user"` one (http/upgrade-endpoints.ts) — and answers true; false when none
   * covers it, leaving the socket untouched. The runtime asks this per upgrade of the generation
   * current at that moment (hmr/upgrade-seam.ts): a socket cannot cross the HTTP seam, so this is
   * the in-process half.
   */
  abstract upgrade(
    request: Opaque<"IncomingMessage", IncomingMessage>,
    socket: Opaque<"Duplex", Duplex>,
    head: Opaque<"Buffer", Buffer>,
  ): boolean;
  /**
   * Whether a write to `path` may reach a route group that judges its callers' origin itself
   * (`origin: "own"`): what the runtime's copy of the same-origin check, in front of the seam,
   * lets through for this generation's exact one to decide (http/own-origin.ts, app.ts).
   */
  abstract ownOrigin(path: string): boolean;
}

export type { UpgradeCaller, WebSocketUpgrade } from "./upgrade-endpoints.js";

export interface HttpSlots {
  /**
   * A route group or single-method endpoint. `auth: "user"` accepts a cookie, the local API
   * token, or an Agent auth session whose grant includes the route's `id`; `"token"` accepts
   * only the local API token, without renewing cookies; `"none"` is public. `order` is the
   * mount position (a stable number, since Hono matches in order). `origin: "own"` says the
   * group judges its callers' origin itself (a caller that is cross-origin by design, such as a
   * browser extension): such groups are mounted ahead of the others and of the same-origin rule
   * for writes, which so never runs for a request one of them answers (http/own-origin.ts). The
   * code half is the Hono app — any copy of Hono: one built with a plugin's own copy is made to
   * hand its errors to the App's handler (http/foreign-groups.ts). `role` / `roles` (optional)
   * bind this route directly into the named role nodes (supporting `<roleId>@<refinerId>` such
   * as `["myPlugin.maintain", "general@self"]`).
   */
  routes: Slot<
    {
      method?: HttpMethod;
      prefix: string;
      auth: "user" | "token" | "none";
      order: number;
      origin?: "own";
      role?: string;
      roles?: readonly string[];
    },
    Opaque<"Hono", Hono<AppEnv>>
  >;
  /**
   * Declarative role node definitions or extensions (`RoleContribution`).
   * Allows modules and plugins to define new domain roles (`<domain>.read`, `<domain>.maintain`,
   * `<domain>.all`), merge additional `routes` / `children` / `flags` into existing roles (via `role`),
   * or graft roles into composite parent roles like `readonly`, `general@self`, or
   * `system-maintainer` (via `parents`).
   */
  roles: Slot<RoleContribution>;
  /**
   * Unified `role -> http` route binding contributions (`RoleHttpBindingContribution`).
   * Allows modules and plugins to contribute `role -> http` route mappings separately from
   * route mounts and role node declarations.
   */
  roleBindings: Slot<RoleHttpBindingContribution>;
  /**
   * An auth refiner (`<roleOrRoute>@<refinerId>`) contributed by a component or plugin.
   * `scope` declares the route IDs, role node names, or domain prefixes (e.g. `["agent."]`)
   * this refiner matches, avoiding middleware scans across unrelated actions.
   * `order` (optional, default `0`) controls override priority alongside module `children`
   * list order; built-in refiners (`AuthWithAskRefiner`, `AuthSelfRefiner`) use `1000+`
   * so custom and plugin refiners override them by default.
   */
  authRefiners: Slot<
    { scope: readonly string[]; order?: number },
    Opaque<"AuthRefiner", AuthRefiner>
  >;
  /**
   * A WebSocket endpoint: the upgrades whose path `prefix` covers (that path, or below it;
   * `:name` segments match any one segment) are handed to the code half. `auth: "user"` has the
   * host check the handshake's Origin and session cookie first and hand the endpoint the user;
   * `"none"` hands it the bare request, and the endpoint checks the Origin and its own credential
   * itself (http/upgrade-endpoints.ts). The runtime's own upgrades (a terminal's stream, the API
   * socket) are never offered here.
   */
  upgrades: Slot<
    { prefix: string; auth: "none" | "user" },
    Opaque<"WebSocketUpgrade", WebSocketUpgrade>
  >;
}

/**
 * Extracts one `(method, subPath)` endpoint from a route group as a single-route Hono app
 * mounted at the endpoint's full path (`mergePath(groupPrefix, subPath)`). Any group-wide
 * middleware (`ALL /*`) on the source group runs ahead of the route's own handler on the
 * same `(method, "/")` entry, so mounting the endpoint adds no wildcard middleware.
 */
export function endpointOf(
  group: Hono<AppEnv>,
  method: HttpMethod,
  subPath: string,
): Hono<AppEnv> {
  const normalized = subPath === "" ? "/" : subPath;
  const middlewares = group.routes.filter((r) => r.method === "ALL" && r.path === "/*");
  const matches = group.routes.filter((r) => r.method === method && r.path === normalized);
  if (matches.length === 0) {
    throw new Error(`No ${method} ${normalized} route found in group`);
  }
  const app = new Hono<AppEnv>();
  const groupErr = (group as unknown as { errorHandler: ErrorHandler<AppEnv> }).errorHandler;
  const appErr = (app as unknown as { errorHandler: ErrorHandler<AppEnv> }).errorHandler;
  if (groupErr !== appErr) {
    app.onError(groupErr);
  }
  for (const mw of middlewares) app.on(method, "/", mw.handler);
  for (const r of matches) app.on(method, "/", r.handler);
  return app;
}

/**
 * Routes where `c.var.user.isAdmin` inside the handler controls session sandbox ceiling
 * escalation (`session.create`, `session.updateSandbox`) or global error visibility (`usage.*`),
 * rather than acting as a coarse route-level admin gate. All other routes that have already
 * passed fine-grained `checkRouteAuth` elevate `c.var.user.isAdmin` so built-in and plugin
 * handlers with internal `if (!c.var.user.isAdmin)` checks honor the explicit route grant.
 */
const NON_ELEVATED_USER_ROUTE_PREFIXES = ["session.", "usage."] as const;

/**
 * Checks whether an Agent-authenticated request is granted the matched route's `id`,
 * evaluates any `<roleOrRoute>@<refinerId>` refiners bound to that route, and enforces
 * project and cross-Agent isolation.
 */
async function checkRouteAuth(
  c: Context<AppEnv>,
  routeId: string,
  groupId: string | undefined,
  refinerRegistry: AuthRefinerRegistry,
  roleRegistry: RoleRegistry = DEFAULT_ROLE_REGISTRY,
  log?: { line(msg: string): void },
): Promise<void> {
  const agentAuth = (c.var as AppEnv["Variables"]).agentAuth;
  if (agentAuth === undefined) return;
  const { grant } = agentAuth;
  const normalized = roleRegistry.normalizeRouteId(routeId);
  const normalizedGroup =
    groupId !== undefined ? roleRegistry.normalizeRouteId(groupId) : undefined;
  if (
    !grant.allEndpoints &&
    !matchesRouteGrant(grant.apiIds, normalized, normalizedGroup, roleRegistry)
  ) {
    const debugInfo = roleRegistry.describeRouteAuthFailure(
      normalized,
      grant.role,
      normalizedGroup,
    );
    log?.line(
      `[agent-auth] auth fail: code=permission_required reason=role_missing_route_grant route=${normalized} role=${grant.role} agent=${agentAuth.projectId}/${agentAuth.agentId} sourceModule=${debugInfo.sourceModule} routeSource=${debugInfo.routeSourceModule} roleSource=${debugInfo.roleSourceModules.join(",") || "none"} bindingSource=${debugInfo.bindingSourceModules.join(",") || "none"}`,
    );
    throw new HttpError(
      403,
      "permission_required",
      `Agent role "${grant.role}" does not grant "${normalized}" (sourceModule: ${debugInfo.sourceModule}).`,
      undefined,
      {
        sourceModule: debugInfo.sourceModule,
        routeSourceModule: debugInfo.routeSourceModule,
        ...(debugInfo.roleSourceModules.length > 0
          ? { roleSourceModule: debugInfo.roleSourceModules.join(",") }
          : {}),
        ...(debugInfo.bindingSourceModules.length > 0
          ? { bindingSourceModule: debugInfo.bindingSourceModules.join(",") }
          : {}),
        ...(debugInfo.requiredRoles.length > 0
          ? { requiredRoles: debugInfo.requiredRoles.join(",") }
          : {}),
        routeId: normalized,
        ...(normalizedGroup !== undefined ? { groupId: normalizedGroup } : {}),
        role: grant.role,
        reason: "role_missing_route_grant",
      },
    );
  }
  const routeProjectId = c.req.param("projectId");
  if (
    !grant.allEndpoints &&
    routeProjectId !== undefined &&
    routeProjectId !== agentAuth.projectId
  ) {
    const debugInfo = roleRegistry.describeRouteAuthFailure(
      normalized,
      grant.role,
      normalizedGroup,
    );
    log?.line(
      `[agent-auth] auth fail: code=permission_required reason=cross_project_denied route=${normalized} role=${grant.role} agent=${agentAuth.projectId}/${agentAuth.agentId} targetProject=${routeProjectId} sourceModule=${debugInfo.sourceModule}`,
    );
    throw new HttpError(
      403,
      "permission_required",
      `Agent session for project "${agentAuth.projectId}" cannot access project "${routeProjectId}" (sourceModule: ${debugInfo.sourceModule}).`,
      undefined,
      {
        sourceModule: debugInfo.sourceModule,
        routeSourceModule: debugInfo.routeSourceModule,
        routeId: normalized,
        role: grant.role,
        reason: "cross_project_denied",
      },
    );
  }

  const refinerIds = resolveRouteRefiners(
    grant.apiIds,
    normalized,
    normalizedGroup,
    roleRegistry,
  );
  if (!grant.allEndpoints && refinerIds !== undefined && refinerIds.length > 0) {
    const rawParams = (c.req.param() ?? {}) as Record<string, string>;
    const refinerCtx: AuthRefinerContext = {
      projectId: agentAuth.projectId,
      agentId: agentAuth.agentId,
      role: grant.role,
      generation: grant.generation,
    };
    const action: AuthRefinerAction = {
      routeId: normalized,
      ...(normalizedGroup !== undefined ? { groupId: normalizedGroup } : {}),
      method: c.req.method.toUpperCase(),
      path: c.req.path,
      params: rawParams,
    };
    const evalResult = await refinerRegistry.evaluate(
      refinerIds,
      refinerCtx,
      action,
      c.req.raw,
    );
    if (!evalResult.ok) {
      log?.line(
        `[agent-auth] auth fail: code=${evalResult.code} reason=${evalResult.reason} route=${normalized} role=${grant.role} agent=${agentAuth.projectId}/${agentAuth.agentId} refiner=@${evalResult.refinerId} sourceModule=${evalResult.sourceModule} routeSource=${evalResult.routeSourceModule}`,
      );
      throw new HttpError(403, evalResult.code, evalResult.message, undefined, {
        sourceModule: evalResult.sourceModule,
        routeSourceModule: evalResult.routeSourceModule,
        ...(evalResult.refinerSourceModule !== undefined
          ? { refinerSourceModule: evalResult.refinerSourceModule }
          : {}),
        refinerId: evalResult.refinerId,
        routeId: normalized,
        role: grant.role,
        reason: evalResult.reason,
      });
    }
  }

  if (
    !c.var.user.isAdmin &&
    !NON_ELEVATED_USER_ROUTE_PREFIXES.some((prefix) => normalized.startsWith(prefix))
  ) {
    c.set("user", { ...c.var.user, isAdmin: true });
  }
}

function withRouteAuth(
  source: Hono<AppEnv>,
  groupId: string,
  refinerRegistry: AuthRefinerRegistry,
  roleRegistry: RoleRegistry = DEFAULT_ROLE_REGISTRY,
  log?: { line(msg: string): void },
): Hono<AppEnv> {
  const normalizedGroup = roleRegistry.normalizeRouteId(groupId);
  if (normalizedGroup === "session.forward") return source;
  const gated = new Hono<AppEnv>();
  const sourceErr = (source as unknown as { errorHandler: ErrorHandler<AppEnv> }).errorHandler;
  const gatedErr = (gated as unknown as { errorHandler: ErrorHandler<AppEnv> }).errorHandler;
  if (sourceErr !== gatedErr) {
    gated.onError(sourceErr);
  }
  const groupMiddlewares: MiddlewareHandler<AppEnv>[] = [];
  let hasConcreteRoute = false;
  for (const route of source.routes) {
    if (
      route.method === "ALL" &&
      route.path === "/*" &&
      normalizedGroup !== "machine.proxy"
    ) {
      if (!hasConcreteRoute) {
        groupMiddlewares.push(route.handler);
      } else {
        gated.on(route.method, route.path, route.handler);
      }
      continue;
    }
    hasConcreteRoute = true;
    gated.on(
      route.method,
      route.path,
      async (c, next) => {
        await checkRouteAuth(
          c,
          normalizedGroup,
          normalizedGroup,
          refinerRegistry,
          roleRegistry,
          log,
        );
        await next();
      },
      ...groupMiddlewares,
      route.handler,
    );
  }
  if (!hasConcreteRoute) {
    for (const mw of groupMiddlewares) {
      gated.on("ALL", "/*", mw);
    }
  }
  return gated;
}

/**
 * The platform's whole HTTP surface, assembled from `HttpModule.routes` contributions: every
 * module that serves requests contributes its groups here as data (prefix, auth, order)
 * and binds the Hono app by id. Adding an endpoint is adding a line to a manifest.
 */
@Module()
export class HttpModule {
  @Use() private readonly config!: Config;
  @Use() private readonly log!: Log;
  @Use() private readonly auth!: Auth;
  @Use() private readonly agentAuth!: AgentAuth;
  @Use() private readonly errors!: Errors;
  @Use() private readonly settings!: Settings;
  @Use() private readonly access!: Access;
  @Use() private readonly projects!: Projects;
  @Use() private readonly users!: Users;
  /** Optional priority-ordered refiner list (`[AuthMyRefiner, AuthWithAskRefiner, AuthSelfRefiner]`). */
  private readonly refiners?: readonly AuthRefinerInput[];
  @Provide() http!: Http;
  setup({ contributions }: ClassCtx) {
    const roleRegistry = new RoleRegistry();
    const roleContribs = (contributions.roles ?? []) as ReadonlyArray<{
      readonly id: string;
      readonly from?: string;
      readonly data: RoleContribution;
    }>;
    for (const rc of roleContribs) {
      roleRegistry.registerRole(rc.id, rc.data, rc.from);
      this.agentAuth?.registerRole?.(rc.id, rc.data, rc.from);
    }

    const roleBindingContribs = (contributions.roleBindings ?? []) as ReadonlyArray<{
      readonly id: string;
      readonly from?: string;
      readonly data: RoleHttpBindingContribution;
    }>;
    for (const rb of roleBindingContribs) {
      roleRegistry.registerRoleBinding(rb.data, rb.from);
      this.agentAuth?.registerRoleBinding?.(rb.data, rb.from);
    }

    const rawRoutes = contributions.routes ?? [];
    for (const c of rawRoutes) {
      const role = c.data.role as string | undefined;
      const roles = c.data.roles as readonly string[] | undefined;
      const sourceModule = (c as { readonly from?: string }).from;
      const reg = {
        id: c.id,
        ...(role !== undefined ? { role } : {}),
        ...(roles !== undefined ? { roles } : {}),
        ...(sourceModule !== undefined ? { sourceModule } : {}),
      };
      roleRegistry.registerRoute(reg, sourceModule);
      this.agentAuth?.registerRoute?.(reg, sourceModule);
    }

    const hasCustomRolesOrRoutes =
      roleContribs.length > 0 ||
      roleBindingContribs.length > 0 ||
      rawRoutes.some(
        (c) =>
          c.data.role !== undefined ||
          c.data.roles !== undefined,
      );
    const agentAuthSynced =
      typeof this.agentAuth?.registerRole === "function" &&
      typeof this.agentAuth?.registerRoute === "function" &&
      typeof this.agentAuth?.registerRoleBinding === "function";

    const routes = [...rawRoutes]
      .map((c, index) => ({
        id: c.id,
        from: ((c as { readonly from?: string }).from ?? ""),
        index,
        ...(c.data.method !== undefined ? { method: c.data.method as HttpMethod } : {}),
        prefix: c.data.prefix as string,
        auth: c.data.auth as "user" | "token" | "none",
        order: c.data.order as number,
        ...(c.data.origin === "own" ? { origin: "own" as const } : {}),
        app: c.code as Hono<AppEnv>,
      }))
      .sort((a, b) => a.order - b.order || a.from.localeCompare(b.from) || a.index - b.index);
    for (const r of routes) adoptGroup(r.app);
    const upgrade = upgradeDispatch(
      (contributions.upgrades ?? []).map((c) => ({
        id: c.id,
        prefix: c.data.prefix as string,
        auth: c.data.auth === "user" ? ("user" as const) : ("none" as const),
        code: c.code as WebSocketUpgrade,
      })),
      { auth: this.auth, rule: originRule(this.config), log: (line) => this.log.line(line) },
    );

    const refinerRegistry = new AuthRefinerRegistry(
      this.refiners,
      contributions.authRefiners ?? [],
      roleRegistry,
    );

    const fallbackGrantCache = new Map<
      string,
      { generation: number; role: string; ctx: NonNullable<ReturnType<AgentAuth["authenticate"]>> }
    >();
    const agentAuthHook =
      this.agentAuth !== undefined
        ? {
            authenticate: (bearer: string, now: Date) => {
              const ctx = this.agentAuth.authenticate(bearer, now);
              if (ctx === null || !hasCustomRolesOrRoutes || agentAuthSynced) return ctx;
              const cacheKey = `${ctx.projectId}\0${ctx.agentId}`;
              const cached = fallbackGrantCache.get(cacheKey);
              if (
                cached !== undefined &&
                cached.generation === ctx.grant.generation &&
                cached.role === ctx.grant.role
              ) {
                return cached.ctx;
              }
              const reExpanded = roleRegistry.expandRoleGrant(
                ctx.grant.role,
                [...ctx.grant.apiIds],
              );
              const nextCtx = {
                ...ctx,
                agentApi: Boolean(ctx.agentApi || reExpanded.agentApi),
                grant: {
                  ...ctx.grant,
                  allEndpoints: Boolean(ctx.grant.allEndpoints || reExpanded.allEndpoints),
                  agentApi: Boolean(ctx.grant.agentApi || reExpanded.agentApi),
                  apiIds: reExpanded.apiIds,
                },
              };
              fallbackGrantCache.set(cacheKey, {
                generation: ctx.grant.generation,
                role: ctx.grant.role,
                ctx: nextCtx,
              });
              return nextCtx;
            },
            resolveUser: (projectId: string) => {
              const project = this.projects?.findById(projectId);
              if (project !== null && project !== undefined) {
                const owner = this.users?.findById(project.ownerUserId);
                if (owner !== null && owner !== undefined) return owner;
              }
              return this.users?.findById("admin") ?? null;
            },
          }
        : undefined;

    // The HTTP surface, gated on the cookie; and the same surface once per socket user,
    // gated on that user — assembled lazily, since most users never open a socket, and kept,
    // since the one who did opens it on every page load. Hono copies a group's routes into
    // each parent it is mounted on, so mounting the groups twice shares handlers, not state.
    const cookieGated = this.assemble(
      routes,
      authMiddleware(this.auth, this.config.trustProxy, {
        ...(agentAuthHook !== undefined ? { agentAuth: agentAuthHook } : {}),
      }),
      refinerRegistry,
      roleRegistry,
    );
    const asUser = new Map<string, Hono<AppEnv>>();
    const enteredAs = (userId: string): Hono<AppEnv> => {
      let app = asUser.get(userId);
      if (app === undefined) {
        app = this.assemble(
          routes,
          async (c, next) => {
            const user = this.users.findById(userId);
            if (user === null) throw new HttpError(401, "unauthorized", "Unknown user.");
            c.set("user", user);
            // The handshake does not say how the cookie behind it was minted, so the most
            // demanding kind is assumed; the routes whose answer turns on the kind never reach
            // here, the socket declines them for HTTP (api/types.ts sessionKindPath).
            c.set("sessionVia", "password");
            await next();
          },
          refinerRegistry,
          roleRegistry,
        );
        asUser.set(userId, app);
      }
      return app;
    };
    this.http = {
      fetch: (request: Request) => Promise.resolve(cookieGated.fetch(request)),
      fetchAs: (userId: string, request: Request) =>
        Promise.resolve(enteredAs(userId).fetch(request)),
      upgrade: (request: IncomingMessage, socket: Duplex, head: Buffer) =>
        upgrade(request, socket, head),
      ownOrigin: ownOriginPrefixes(routes),
    };
  }

  /**
   * The whole surface behind one gate: error handling, logging, body cap, the groups that judge
   * their callers' origin themselves, the same-origin and JSON-only write checks, the
   * runtime-prefix decline, then every other group in order.
   */
  private assemble(
    routes: {
      id: string;
      method?: HttpMethod;
      prefix: string;
      auth: "user" | "token" | "none";
      order: number;
      origin?: "own";
      app: Hono<AppEnv>;
    }[],
    gate: MiddlewareHandler<AppEnv>,
    refinerRegistry: AuthRefinerRegistry,
    roleRegistry: RoleRegistry,
  ): Hono<AppEnv> {
    const errors = this.errors;
    const access = this.access;
    const app = new Hono<AppEnv>();
    app.onError((err, c) => {
      const projectId = attributedProjectId(c, { access });
      errors.record({
        source: "http",
        err,
        ...(projectId !== undefined ? { ctx: { projectId } } : {}),
      });
      return handleError(err, c);
    });
    app.notFound(() => declined());
    app.use("*", async (c, next) => {
      const start = performance.now();
      await next();
      this.log.line(
        `${c.req.method} ${c.req.path} ${c.res.status} ${Math.round(performance.now() - start)}ms`,
      );
    });
    // Every JSON answer under the API — this server's own and those it relays from a machine —
    // carries a validator and answers a caller who holds it with a 304 (json-validators.ts), and
    // is compressed for a caller that asks (json-compression.ts). Inside the request line, so it
    // logs the 304; compression outside the validator, so it encodes what the validator kept.
    for (const scope of ["/api/*", "/server/*"]) {
      app.use(scope, jsonCompression());
      app.use(scope, jsonValidators());
    }
    // The same header the host layer puts ahead of its copies of these two checks (src/app.ts):
    // their refusals answer before the Agent API's group runs, and a browser caller must read the
    // code, not a CORS failure.
    app.use(`${AMSP_PREFIX}/*`, amspAllowOrigin);
    let capped: { size: number; mw: MiddlewareHandler } | null = null;
    app.use("/api/*", (c, next) => {
      // An Agent package is uploaded raw, under the package cap rather than the attachment budget.
      const size = isAgentImport(c.req.method, c.req.path)
        ? MAX_PACKAGE_BYTES
        : bodyLimitBytes(this.settings.getAttachmentLimitsMb());
      if (capped === null || capped.size !== size) {
        capped = {
          size,
          mw: bodyLimit({
            maxSize: size,
            onError: () => {
              throw new HttpError(
                413,
                "payload_too_large",
                `Request body exceeds the ${Math.floor(size / (1024 * 1024))}MB limit.`,
              );
            },
          }),
        };
      }
      return capped.mw(c, next);
    });
    const origins = originRule(this.config);

    // A group's own auth declaration applies to both HTTP and socket calls, independent of order.
    const authenticate = gate;
    const authenticateToken = authMiddleware(this.auth, this.config.trustProxy, {
      apiTokenOnly: true,
    });
    const once: MiddlewareHandler<AppEnv> = (c, next) =>
      (c.var.user as AppEnv["Variables"]["user"] | undefined) === undefined
        ? authenticate(c, next)
        : next();
    // Only an actual Bearer may exchange credentials: a cookie an earlier user gate already
    // authenticated (a Remote one included) must not skip this transport check.
    const tokenGate: MiddlewareHandler<AppEnv> = (c, next) =>
      c.var.sessionVia === "token" && bearerToken(c.req.header("authorization")) !== null
        ? next()
        : authenticateToken(c, next);
    const mount = (r: (typeof routes)[number]) => {
      // Each group keeps its own gate, including protected prefixes outside /api.
      if (r.method !== undefined) {
        // A single-(method, prefix) group: the gate and the Agent-role check ride on that one
        // method, so another group's wider gate under the same prefix is not crossed.
        if (r.auth === "user") {
          app.on(r.method, r.prefix, once, async (c, next) => {
            await checkRouteAuth(
              c,
              r.id,
              undefined,
              refinerRegistry,
              roleRegistry,
              this.log,
            );
            await next();
          });
        }
        if (r.auth === "token") app.on(r.method, r.prefix, tokenGate);
        app.route(r.prefix, r.app);
      } else {
        // Each group keeps its own gate, including protected prefixes outside /api; the
        // Agent-role check wraps the group's own handlers (withRouteAuth).
        if (r.auth === "user") {
          app.use(`${r.prefix.replace(/\/$/, "")}/*`, once);
          app.route(
            r.prefix,
            withRouteAuth(r.app, r.id, refinerRegistry, roleRegistry, this.log),
          );
        } else {
          if (r.auth === "token") app.use(`${r.prefix.replace(/\/$/, "")}/*`, tokenGate);
          app.route(r.prefix, r.app);
        }
      }
    };

    // The groups that judge their callers' origin themselves (`origin: "own"`) go ahead of the
    // same-origin rule, each behind its own copy of the JSON-only one: a request one of them
    // answers never meets the same-origin check, while anything else under their prefixes —
    // another method, a path the group does not serve — falls through to it like every other
    // write (http/own-origin.ts).
    for (const r of routes) {
      if (r.origin !== "own") continue;
      app.use(`${r.prefix.replace(/\/$/, "")}/*`, jsonOnlyWrites(origins));
      mount(r);
    }
    app.use("/api/*", sameOriginWrites(origins));
    // A machine's API is reached through this server (machines/proxy.ts), with this server's
    // cookie: the same question, asked here because the hop drops the Origin.
    app.use("/server/*", sameOriginWrites(origins));
    app.use("/api/*", jsonOnlyWrites(origins));
    for (const r of routes) if (r.origin !== "own") mount(r);
    return app;
  }
}
