import { Hono } from "hono";
import { bearerToken, SESSION_COOKIE } from "../../auth/middleware.js";
import type { AppEnv } from "../../auth/middleware.js";
import { Bind, Component, Use } from "@prismshadow/penguin-core/kernel";
import type { Auth } from "@prismshadow/penguin-library-auth";
import { HttpError } from "../errors.js";
import { readJson } from "../validate.js";
import { mediaType } from "@prismshadow/penguin-library-http/media-type";

export interface RemoteSessionResponse {
  cookieName: typeof SESSION_COOKIE;
  sessionToken: string;
  expiresAt: string;
  maxAgeSeconds: number;
}

export function remoteRoutes(deps: { authService: Auth }): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.post("/session", async (c) => {
    if (c.var.sessionVia !== "token" || bearerToken(c.req.header("authorization")) === null) {
      throw new HttpError(
        403,
        "local_api_token_required",
        "Only the local API token may issue a remote browser session.",
      );
    }
    if (mediaType(c.req.header("content-type"))?.essence !== "application/json") {
      throw new HttpError(
        415,
        "unsupported_media_type",
        "Remote session exchange requires application/json.",
      );
    }
    await readJson(c);
    const session = deps.authService.issueRemoteSession();
    c.header("cache-control", "no-store");
    return c.json({
      cookieName: SESSION_COOKIE,
      sessionToken: session.token,
      expiresAt: session.expiresAt,
      maxAgeSeconds: session.maxAgeSeconds,
    } satisfies RemoteSessionResponse);
  });

  return app;
}

@Component({
  contributes: {
    "AgentAuthPermissionProvider.roles": [
      { id: "role.browser.read", role: "browser.read", parents: ["readonly"] },
      {
        id: "role.browser.maintain",
        role: "browser.maintain",
        children: ["browser.read"],
        parents: ["general"],
      },
      {
        id: "role.browser.all",
        role: "browser.all",
        children: ["browser.maintain"],
        parents: ["admin"],
      },
    ],
    "HttpModule.routes": [
      { id: "remote", prefix: "/api/remote", auth: "token", order: 55 },
    ],
    "AgentAuthPermissionProvider.roleBindings": [
      {
        id: "browser.bindings",
        endpoints: {
          "builtin-browser.routes": {
            "GET /status": "browser.getStatus",
            "GET /backend": "browser.getBackend",
            "PUT /backend": "browser.setBackend",
            "POST /extension/pairings": "browser.createExtensionPairing",
            "GET /extension": "browser.listExtensions",
            "DELETE /extension/:id": "browser.revokeExtension",
            "GET /tabs": "browser.listTabs",
            "POST /tabs": "browser.openTab",
            "POST /tabs/session": "browser.openSessionTab",
            "POST /tabs/claim": "browser.claimTabs",
            "POST /tabs/on-screen": "browser.setOnScreen",
            "POST /tabs/:tab/activate": "browser.activateTab",
            "DELETE /tabs/:tab": "browser.closeTab",
            "POST /tabs/:tab/navigate": "browser.navigate",
            "POST /tabs/:tab/scan": "browser.scan",
            "POST /tabs/:tab/exec": "browser.exec",
            "POST /tabs/:tab/click": "browser.click",
            "POST /tabs/:tab/type": "browser.type",
            "POST /tabs/:tab/screenshot": "browser.screenshot",
            "POST /tabs/:tab/cdp": "browser.cdp",
            "GET /import/sources": "browser.listImportSources",
            "POST /import": "browser.importData",
            "GET /settings": "browser.getSettings",
            "PUT /settings": "browser.updateSettings",
            "GET /history": "browser.getHistory",
            "DELETE /history": "browser.clearHistory",
            "POST /clear-data": "browser.clearData",
          },
        },
        bindings: {
          "browser.read": [
            "browser.getStatus",
            "browser.getBackend",
            "browser.listExtensions",
            "browser.listTabs",
            "browser.listImportSources",
            "browser.getSettings",
            "browser.getHistory",
          ],
          "browser.maintain": [
            "browser.openTab",
            "browser.openSessionTab",
            "browser.claimTabs",
            "browser.setOnScreen",
            "browser.activateTab",
            "browser.closeTab",
            "browser.navigate",
            "browser.scan",
            "browser.exec",
            "browser.click",
            "browser.type",
            "browser.screenshot",
            "browser.cdp",
          ],
          "browser.all": [
            "browser.setBackend",
            "browser.createExtensionPairing",
            "browser.revokeExtension",
            "browser.importData",
            "browser.updateSettings",
            "browser.clearHistory",
            "browser.clearData",
          ],
        },
      },
    ],
  },
})
export class RemoteRoutes {
  @Use() private readonly auth!: Auth;
  @Bind("remote") routes!: Hono<AppEnv>;
  setup() {
    this.routes = remoteRoutes({ authService: this.auth });
  }
}
