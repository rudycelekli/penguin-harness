/**
 * The bot-account routes as a node of their own, beside the messaging bridge rather than in it:
 * they read the stored bindings and ask the Project's machines, and never touch a connection.
 * A machine-free server serves them the same way, answering for itself alone.
 */
import { Bind, Module, Use } from "@prismshadow/penguin-core/kernel";
import type { Hono } from "hono";
import type { AppEnv } from "../../auth/middleware.js";
import {
  messagingAccountHoldersRoutes,
  messagingAccountsRoutes,
} from "../../http/routes/messaging-accounts.js";
import type { Machines } from "../../machines/service.js";
import type { MessagingBindings } from "@prismshadow/penguin-library-messaging";
import type { Access } from "@prismshadow/penguin-library-project";
import type { SessionIndex } from "@prismshadow/penguin-library-session";

@Module({
  contributes: {
    "HttpModule.routes": [
      {
        id: "messaging.accounts",
        prefix: "/api/messaging",
        auth: "user",
        order: 281,
        role: "messaging.read",
      },
      {
        id: "messaging.account-holders",
        prefix: "/api/projects/:projectId/messaging",
        auth: "user",
        order: 282,
        role: "messaging.read",
      },
    ],
    "HttpModule.roleBindings": [
      {
        id: "messaging.accounts.bindings",
        endpoints: {
          "messaging.accounts": {
            "GET /accounts": "messaging.listAccounts",
          },
          "messaging.account-holders": {
            "GET /account-holders": "messaging.listAccountHolders",
          },
        },
        role: "messaging.read",
        routes: ["messaging.listAccounts", "messaging.listAccountHolders"],
      },
    ],
  },
})
export class MessagingAccountsModule {
  @Use() private readonly messagingRepo!: MessagingBindings;
  @Use() private readonly sessionsRepo!: SessionIndex;
  @Use() private readonly machines!: Machines;
  @Use() private readonly access!: Access;
  @Bind("messaging.accounts") accountsRoutes!: Hono<AppEnv>;
  @Bind("messaging.account-holders") accountHoldersRoutes!: Hono<AppEnv>;
  setup() {
    const deps = {
      messagingRepo: this.messagingRepo,
      sessionsRepo: this.sessionsRepo,
      machines: this.machines,
      access: this.access,
    };
    this.accountsRoutes = messagingAccountsRoutes(deps);
    this.accountHoldersRoutes = messagingAccountHoldersRoutes(deps);
  }
}
