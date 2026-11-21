/**
 * Built-in role contributions (`"AgentAuthPermissionProvider.roles"`) and unified `role -> http`
 * route binding contributions (`"AgentAuthPermissionProvider.roleBindings"`).
 *
 * All built-in server roles (20 domain triples `<domain>.read` -> `<domain>.maintain` -> `<domain>.all`,
 * organization sub-domain tiers, and 6 composite persona roles `none`, `readonly`, `general`,
 * `system-maintainer`, `admin`, `full-permissions`) and their exact HTTP route bindings are
 * contributed declaratively through this component rather than hardcoded inside `agent-roles.ts`.
 */
import { Component } from "@prismshadow/penguin-core/kernel";

@Component({
  contributes: {
    "AgentAuthPermissionProvider.roles": [
  {
    "id": "role.session.read",
    "role": "session.read"
  },
  {
    "id": "role.session.maintain",
    "role": "session.maintain",
    "children": [
      "session.read"
    ]
  },
  {
    "id": "role.session.all",
    "role": "session.all",
    "children": [
      "session.maintain"
    ]
  },
  {
    "id": "role.workspace.read",
    "role": "workspace.read"
  },
  {
    "id": "role.workspace.maintain",
    "role": "workspace.maintain",
    "children": [
      "workspace.read"
    ]
  },
  {
    "id": "role.workspace.all",
    "role": "workspace.all",
    "children": [
      "workspace.maintain"
    ]
  },
  {
    "id": "role.agent.read",
    "role": "agent.read"
  },
  {
    "id": "role.agent.maintain",
    "role": "agent.maintain",
    "children": [
      "agent.read"
    ]
  },
  {
    "id": "role.agent.all",
    "role": "agent.all",
    "children": [
      "agent.maintain"
    ]
  },
  {
    "id": "role.memory.read",
    "role": "memory.read"
  },
  {
    "id": "role.memory.maintain",
    "role": "memory.maintain",
    "children": [
      "memory.read"
    ]
  },
  {
    "id": "role.memory.all",
    "role": "memory.all",
    "children": [
      "memory.maintain"
    ]
  },
  {
    "id": "role.schedule.read",
    "role": "schedule.read"
  },
  {
    "id": "role.schedule.maintain",
    "role": "schedule.maintain",
    "children": [
      "schedule.read"
    ]
  },
  {
    "id": "role.schedule.all",
    "role": "schedule.all",
    "children": [
      "schedule.maintain"
    ]
  },
  {
    "id": "role.skill.read",
    "role": "skill.read"
  },
  {
    "id": "role.skill.maintain",
    "role": "skill.maintain",
    "children": [
      "skill.read"
    ]
  },
  {
    "id": "role.skill.all",
    "role": "skill.all",
    "children": [
      "skill.maintain"
    ]
  },
  {
    "id": "role.plugin.read",
    "role": "plugin.read"
  },
  {
    "id": "role.plugin.maintain",
    "role": "plugin.maintain",
    "children": [
      "plugin.read"
    ]
  },
  {
    "id": "role.plugin.all",
    "role": "plugin.all",
    "children": [
      "plugin.maintain"
    ]
  },
  {
    "id": "role.workbench.read",
    "role": "workbench.read"
  },
  {
    "id": "role.workbench.maintain",
    "role": "workbench.maintain",
    "children": [
      "workbench.read"
    ]
  },
  {
    "id": "role.workbench.all",
    "role": "workbench.all",
    "children": [
      "workbench.maintain"
    ]
  },
  {
    "id": "role.model.read",
    "role": "model.read"
  },
  {
    "id": "role.model.maintain",
    "role": "model.maintain",
    "children": [
      "model.read"
    ]
  },
  {
    "id": "role.model.all",
    "role": "model.all",
    "children": [
      "model.maintain"
    ]
  },
  {
    "id": "role.vault.read",
    "role": "vault.read"
  },
  {
    "id": "role.vault.maintain",
    "role": "vault.maintain",
    "children": [
      "vault.read"
    ]
  },
  {
    "id": "role.vault.all",
    "role": "vault.all",
    "children": [
      "vault.maintain"
    ]
  },
  {
    "id": "role.trace.read",
    "role": "trace.read"
  },
  {
    "id": "role.trace.maintain",
    "role": "trace.maintain",
    "children": [
      "trace.read"
    ]
  },
  {
    "id": "role.trace.all",
    "role": "trace.all",
    "children": [
      "trace.maintain"
    ]
  },
  {
    "id": "role.benchmark.read",
    "role": "benchmark.read"
  },
  {
    "id": "role.benchmark.maintain",
    "role": "benchmark.maintain",
    "children": [
      "benchmark.read"
    ]
  },
  {
    "id": "role.benchmark.all",
    "role": "benchmark.all",
    "children": [
      "benchmark.maintain"
    ]
  },
  {
    "id": "role.org.employee.read",
    "role": "org.employee.read"
  },
  {
    "id": "role.org.employee.maintain",
    "role": "org.employee.maintain",
    "children": [
      "org.employee.read"
    ]
  },
  {
    "id": "role.org.employee.all",
    "role": "org.employee.all",
    "children": [
      "org.employee.maintain"
    ]
  },
  {
    "id": "role.org.handbook.read",
    "role": "org.handbook.read"
  },
  {
    "id": "role.org.handbook.maintain",
    "role": "org.handbook.maintain",
    "children": [
      "org.handbook.read"
    ]
  },
  {
    "id": "role.org.handbook.all",
    "role": "org.handbook.all",
    "children": [
      "org.handbook.maintain"
    ]
  },
  {
    "id": "role.org.calendar.read",
    "role": "org.calendar.read"
  },
  {
    "id": "role.org.calendar.maintain",
    "role": "org.calendar.maintain",
    "children": [
      "org.calendar.read"
    ]
  },
  {
    "id": "role.org.calendar.all",
    "role": "org.calendar.all",
    "children": [
      "org.calendar.maintain"
    ]
  },
  {
    "id": "role.org.ticket.read",
    "role": "org.ticket.read"
  },
  {
    "id": "role.org.ticket.maintain",
    "role": "org.ticket.maintain",
    "children": [
      "org.ticket.read"
    ]
  },
  {
    "id": "role.org.channel.read",
    "role": "org.channel.read"
  },
  {
    "id": "role.org.channel.maintain",
    "role": "org.channel.maintain",
    "children": [
      "org.channel.read"
    ]
  },
  {
    "id": "role.org.channel.all",
    "role": "org.channel.all",
    "children": [
      "org.channel.maintain"
    ]
  },
  {
    "id": "role.org.finance.read",
    "role": "org.finance.read"
  },
  {
    "id": "role.org.read",
    "role": "org.read",
    "children": [
      "org.employee.read",
      "org.handbook.read",
      "org.calendar.read",
      "org.ticket.read",
      "org.channel.read",
      "org.finance.read"
    ]
  },
  {
    "id": "role.org.maintain",
    "role": "org.maintain",
    "children": [
      "org.read",
      "org.employee.maintain",
      "org.handbook.maintain",
      "org.calendar.maintain",
      "org.ticket.maintain",
      "org.channel.maintain"
    ]
  },
  {
    "id": "role.org.all",
    "role": "org.all",
    "children": [
      "org.maintain",
      "org.employee.all",
      "org.handbook.all",
      "org.calendar.all",
      "org.channel.all"
    ]
  },
  {
    "id": "role.browser.read",
    "role": "browser.read"
  },
  {
    "id": "role.browser.maintain",
    "role": "browser.maintain",
    "children": [
      "browser.read"
    ]
  },
  {
    "id": "role.browser.all",
    "role": "browser.all",
    "children": [
      "browser.maintain"
    ]
  },
  {
    "id": "role.machine.read",
    "role": "machine.read"
  },
  {
    "id": "role.machine.maintain",
    "role": "machine.maintain",
    "children": [
      "machine.read"
    ]
  },
  {
    "id": "role.machine.all",
    "role": "machine.all",
    "children": [
      "machine.maintain"
    ]
  },
  {
    "id": "role.agents.messaging.read",
    "role": "agents.messaging.read"
  },
  {
    "id": "role.agents.messaging.maintain",
    "role": "agents.messaging.maintain",
    "children": [
      "agents.messaging.read"
    ]
  },
  {
    "id": "role.agents.messaging.all",
    "role": "agents.messaging.all",
    "children": [
      "agents.messaging.maintain"
    ]
  },
  {
    "id": "role.messaging.read",
    "role": "messaging.read",
    "children": [
      "agents.messaging.read"
    ]
  },
  {
    "id": "role.messaging.maintain",
    "role": "messaging.maintain",
    "children": [
      "messaging.read",
      "agents.messaging.maintain"
    ]
  },
  {
    "id": "role.messaging.all",
    "role": "messaging.all",
    "children": [
      "messaging.maintain",
      "agents.messaging.all"
    ]
  },
  {
    "id": "role.project.read",
    "role": "project.read"
  },
  {
    "id": "role.project.maintain",
    "role": "project.maintain",
    "children": [
      "project.read"
    ]
  },
  {
    "id": "role.project.all",
    "role": "project.all",
    "children": [
      "project.maintain"
    ]
  },
  {
    "id": "role.command.read",
    "role": "command.read"
  },
  {
    "id": "role.command.maintain",
    "role": "command.maintain",
    "children": [
      "command.read"
    ]
  },
  {
    "id": "role.command.all",
    "role": "command.all",
    "children": [
      "command.maintain"
    ]
  },
  {
    "id": "role.system.read",
    "role": "system.read"
  },
  {
    "id": "role.system.maintain",
    "role": "system.maintain",
    "children": [
      "system.read"
    ]
  },
  {
    "id": "role.system.all",
    "role": "system.all",
    "children": [
      "system.maintain"
    ]
  },
  {
    "id": "role.admin.read",
    "role": "admin.read"
  },
  {
    "id": "role.admin.maintain",
    "role": "admin.maintain",
    "children": [
      "admin.read"
    ]
  },
  {
    "id": "role.admin.all",
    "role": "admin.all",
    "children": [
      "admin.maintain"
    ]
  },
  {
    "id": "role.none",
    "role": "none"
  },
  {
    "id": "role.readonly",
    "role": "readonly",
    "children": [
      "session.read",
      "workspace.read",
      "agent.read",
      "memory.read",
      "schedule.read",
      "skill.read",
      "plugin.read",
      "workbench.read",
      "model.read",
      "trace.read",
      "benchmark.read",
      "org.read",
      "browser.read",
      "machine.read",
      "messaging.read",
      "project.read",
      "command.read",
      "system.read"
    ]
  },
  {
    "id": "role.general",
    "role": "general",
    "children": [
      "readonly",
      "session.maintain",
      "workspace.maintain",
      "agent.maintain@self",
      "memory.maintain@self",
      "schedule.maintain@self",
      "workbench.maintain@self",
      "org.maintain",
      "browser.maintain",
      "command.maintain"
    ]
  },
  {
    "id": "role.system-maintainer",
    "role": "system-maintainer",
    "children": [
      "general",
      "session.all",
      "workspace.all",
      "agent.all",
      "memory.all",
      "schedule.all",
      "skill.all",
      "plugin.all",
      "workbench.all",
      "model.maintain",
      "vault.read",
      "trace.all",
      "benchmark.all",
      "machine.maintain",
      "messaging.maintain"
    ],
    "flags": {
      "allEndpoints": false,
      "agentApi": true
    }
  },
  {
    "id": "role.admin",
    "role": "admin",
    "children": [
      "system-maintainer",
      "model.all",
      "vault.all",
      "org.all",
      "browser.all",
      "machine.all",
      "messaging.all",
      "project.all",
      "command.all",
      "system.all",
      "admin.all"
    ],
    "flags": {
      "allEndpoints": true,
      "agentApi": false
    }
  },
  {
    "id": "role.full-permissions",
    "role": "full-permissions",
    "children": [
      "admin"
    ],
    "flags": {
      "allEndpoints": true,
      "agentApi": true
    }
  }
],
    "AgentAuthPermissionProvider.roleBindings": [
      {
        id: "bind.builtin",
        endpoints: {
  "sessions.agents": {
    "GET /": "agent.list",
    "POST /": "agent.create",
    "DELETE /:agentId": "agent.delete",
    "GET /:agentId/auth": "agent.auth.get",
    "PUT /:agentId/auth": "agent.auth.update"
  },
  "sessions.agent-deletions": {
    "GET /:deletionId": "agent.getDeletion"
  },
  "sessions.agent-config": {
    "GET /": "agent.config.get",
    "PUT /": "agent.config.update",
    "POST /mcp-test": "agent.config.mcpTest",
    "POST /kernel-update": "agent.config.kernelUpdate",
    "POST /reset": "agent.config.reset"
  },
  "agents.avatar": {
    "GET /": "agent.avatar.get",
    "PUT /": "agent.avatar.update"
  },
  "agents.archive": {
    "GET /:agentId/archive": "agent.archive.export",
    "POST /import": "agent.archive.import"
  },
  "agents.api": {
    "GET /": "agent.api.get",
    "PUT /": "agent.api.update",
    "POST /keys": "agent.api.createKey",
    "DELETE /keys/:keyId": "agent.api.deleteKey"
  },
  "amsp.try": {
    "POST /": "agent.api.try"
  },
  "agents.memory": {
    "GET /": "memory.get",
    "POST /template-placeholder": "memory.templatePlaceholder",
    "GET /scopes/:scopeKey/files": "memory.listFiles",
    "GET /scopes/:scopeKey/files/:filePath{.+}": "memory.readFile",
    "GET /scopes/:scopeKey/export": "memory.export",
    "POST /scopes/:scopeKey/import": "memory.import",
    "DELETE /scopes/:scopeKey/files/:filePath{.+}": "memory.deleteFile"
  },
  "schedules": {
    "GET /": "schedule.list",
    "POST /": "schedule.create",
    "POST /template-placeholder": "schedule.templatePlaceholder",
    "GET /:name": "schedule.get",
    "PUT /:name": "schedule.update",
    "DELETE /:name": "schedule.delete"
  },
  "schedules.project-routes": {
    "GET /": "schedule.listProject"
  },
  "agents.skills": {
    "GET /": "skill.list",
    "POST /template-placeholder": "skill.templatePlaceholder",
    "POST /archive": "skill.importArchive",
    "GET /:name/archive": "skill.exportArchive",
    "GET /:name/icon": "skill.getIcon",
    "DELETE /:name": "skill.delete"
  },
  "projects.dir-skills": {
    "GET /": "skill.listDir",
    "GET /icon": "skill.getDirIcon"
  },
  "plugins.library": {
    "GET /": "plugin.library.list",
    "GET /:plugin/files": "plugin.library.listFiles",
    "GET /:plugin/readme": "plugin.library.getReadme",
    "GET /:plugin/archive": "plugin.library.getArchive",
    "GET /:plugin/icon": "plugin.library.getIcon"
  },
  "plugin-registry": {
    "GET /": "plugin.registry.list",
    "GET /icon": "plugin.registry.getIcon",
    "GET /readme": "plugin.registry.getReadme",
    "GET /archive": "plugin.registry.getArchive"
  },
  "installed-plugins": {
    "GET /": "plugin.installed.list",
    "POST /": "plugin.installed.install",
    "POST /link": "plugin.installed.link",
    "POST /archive": "plugin.installed.importArchive",
    "PUT /": "plugin.installed.setEnabled",
    "DELETE /": "plugin.installed.uninstall"
  },
  "plugins.agent-plugins": {
    "GET /": "plugin.agent.list",
    "POST /": "plugin.agent.install",
    "DELETE /:name": "plugin.agent.uninstall"
  },
  "plugins.agent-hooks": {
    "GET /": "plugin.hook.list",
    "POST /archive": "plugin.hook.importArchive",
    "GET /:name/archive": "plugin.hook.exportArchive",
    "GET /:name/icon": "plugin.hook.getIcon",
    "DELETE /:name": "plugin.hook.delete"
  },
  "plugins.agent-mcp-servers": {
    "GET /": "plugin.mcp.list",
    "DELETE /:name": "plugin.mcp.delete"
  },
  "PluginMarketRoutes.routes": {
    "GET /": "plugin.market.get",
    "GET /asset": "plugin.market.getAsset"
  },
  "PluginModuleRoutes.project": {
    "POST /": "plugin.modules.request"
  },
  "workbenches": {
    "GET /": "workbench.list",
    "PUT /enabled": "workbench.setAllEnabled",
    "PUT /:id/enabled": "workbench.setEnabled",
    "POST /archive": "workbench.importArchive",
    "GET /:id/archive": "workbench.exportArchive",
    "POST /:id/reload": "workbench.reload",
    "GET /:id/history": "workbench.getHistory",
    "POST /:id/rollback": "workbench.rollback",
    "PATCH /:id/sidebar": "workbench.updateSidebar",
    "PATCH /:id/app-center": "workbench.updateAppCenter",
    "GET /:id/app-center/icon": "workbench.getAppCenterIcon",
    "DELETE /:id": "workbench.delete",
    "GET /:id/ui/*": "workbench.serveUi",
    "GET /:id/sdk/ui/*": "workbench.serveSdkUi",
    "GET /:id/sdk/:file": "workbench.serveSdkFile",
    "ALL /:id/api/*": "workbench.callApi"
  },
  "workbenches.app-center": {
    "GET /": "workbench.appCenter.list",
    "PUT /layout": "workbench.appCenter.updateLayout"
  },
  "sessions.models": {
    "GET /": "model.list",
    "PUT /": "model.update",
    "PUT /providers/:provider": "model.updateProvider",
    "POST /sync-presets": "model.syncPresets",
    "GET /balance": "model.getBalance",
    "PUT /default": "model.setDefault",
    "POST /test": "model.test",
    "POST /detect": "model.detect",
    "POST /list": "model.listRemote",
    "POST /detect-vision": "model.detectVision"
  },
  "sessions.model-oauth": {
    "GET /": "model.oauth.list",
    "POST /start": "model.oauth.start",
    "POST /:flowId/code": "model.oauth.submitCode",
    "GET /:flowId": "model.oauth.getStatus"
  },
  "sessions.platform-auth": {
    "POST /start": "model.platformAuth.start",
    "POST /sync": "model.platformAuth.sync",
    "GET /:flowId/status": "model.platformAuth.getStatus",
    "POST /:flowId/retry": "model.platformAuth.retry",
    "POST /:flowId/cancel": "model.platformAuth.cancel"
  },
  "sessions.modelscope-auth": {
    "POST /start": "model.modelscopeAuth.start",
    "GET /:flowId/status": "model.modelscopeAuth.getStatus",
    "POST /:flowId/retry": "model.modelscopeAuth.retry",
    "POST /:flowId/cancel": "model.modelscopeAuth.cancel"
  },
  "sessions.chat-defaults": {
    "GET /": "model.chatDefaults.get",
    "PUT /": "model.chatDefaults.update"
  },
  "ToolModelBindingsProvider.routes": {
    "GET /": "model.toolBindings.list",
    "PATCH /": "model.toolBindings.update"
  },
  "sessions.vault": {
    "GET /": "vault.get",
    "PUT /": "vault.update",
    "PUT /entries/:key": "vault.setEntry",
    "DELETE /entries/:key": "vault.deleteEntry",
    "POST /template-placeholder": "vault.templatePlaceholder"
  },
  "agents.traces": {
    "GET /": "trace.list",
    "GET /:sessionId/:index": "trace.get",
    "GET /:sessionId/:index/analysis": "trace.getAnalysis",
    "GET /:sessionId/:index/download": "trace.download",
    "POST /import": "trace.import"
  },
  "sessions.usage": {
    "GET /": "usage.get",
    "GET /model-totals": "usage.getModelTotals",
    "GET /errors": "usage.listErrors",
    "DELETE /errors": "usage.clearErrors"
  },
  "agents.benchmarks": {
    "GET /": "benchmark.list",
    "POST /": "benchmark.create",
    "DELETE /:benchmarkId": "benchmark.delete",
    "POST /archive": "benchmark.importArchive",
    "GET /:benchmarkId/archive": "benchmark.exportArchive",
    "GET /:benchmarkId/cases": "benchmark.listCases",
    "GET /:benchmarkId/cases/:caseId/files": "benchmark.listCaseFiles",
    "GET /:benchmarkId/cases/:caseId/files/content": "benchmark.readCaseFile",
    "GET /:benchmarkId/cases/:caseId/rubric/files": "benchmark.listRubricFiles",
    "GET /:benchmarkId/cases/:caseId/rubric/files/content": "benchmark.readRubricFile"
  },
  "org": {
    "GET /": "org.list",
    "POST /": "org.create",
    "GET /:orgId": "org.get",
    "PATCH /:orgId": "org.update",
    "DELETE /:orgId": "org.delete",
    "GET /:orgId/chart": "org.getChart",
    "POST /:orgId/employees": "org.employee.hire",
    "PATCH /:orgId/employees/:agentId": "org.employee.update",
    "GET /:orgId/employees/:agentId/avatar": "org.employee.getAvatar",
    "PUT /:orgId/employees/:agentId/avatar": "org.employee.updateAvatar",
    "DELETE /:orgId/employees/:agentId": "org.employee.remove",
    "GET /:orgId/employees/:agentId/desk": "org.employee.getDesk",
    "POST /:orgId/employees/:agentId/desk": "org.employee.startDesk",
    "GET /:orgId/handbook": "org.handbook.get",
    "PUT /:orgId/handbook": "org.handbook.update",
    "GET /:orgId/handbook/files": "org.handbook.listFiles",
    "GET /:orgId/handbook/files/:path{.+}": "org.handbook.readFile",
    "PUT /:orgId/handbook/files/:path{.+}": "org.handbook.writeFile",
    "DELETE /:orgId/handbook/files/:path{.+}": "org.handbook.deleteFile",
    "GET /:orgId/calendar": "org.calendar.list",
    "POST /:orgId/calendar": "org.calendar.create",
    "GET /:orgId/calendar/:agentId/:name": "org.calendar.get",
    "PUT /:orgId/calendar/:agentId/:name": "org.calendar.update",
    "DELETE /:orgId/calendar/:agentId/:name": "org.calendar.delete",
    "GET /:orgId/tickets": "org.ticket.list",
    "POST /:orgId/tickets": "org.ticket.create",
    "GET /:orgId/tickets/:ticketId": "org.ticket.get",
    "PUT /:orgId/tickets/:ticketId": "org.ticket.update",
    "POST /:orgId/tickets/:ticketId/move": "org.ticket.move",
    "POST /:orgId/tickets/:ticketId/block": "org.ticket.block",
    "POST /:orgId/tickets/:ticketId/unblock": "org.ticket.unblock",
    "POST /:orgId/tickets/:ticketId/progress": "org.ticket.progress",
    "POST /:orgId/tickets/:ticketId/start": "org.ticket.start",
    "POST /:orgId/tickets/:ticketId/attach": "org.ticket.attach",
    "GET /:orgId/channels": "org.channel.list",
    "POST /:orgId/channels": "org.channel.create",
    "GET /:orgId/channels/:channelId": "org.channel.get",
    "PATCH /:orgId/channels/:channelId": "org.channel.update",
    "POST /:orgId/channels/:channelId/members": "org.channel.addMember",
    "DELETE /:orgId/channels/:channelId/members/:principal": "org.channel.removeMember",
    "GET /:orgId/channels/:channelId/messages": "org.channel.listMessages",
    "POST /:orgId/channels/:channelId/messages": "org.channel.postMessage",
    "POST /:orgId/channels/:channelId/read": "org.channel.markRead",
    "GET /:orgId/finance": "org.finance.get",
    "GET /:orgId/sessions": "org.session.list"
  },
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
    "POST /clear-data": "browser.clearData"
  },
  "machines": {
    "GET /": "machine.list",
    "GET /events": "machine.events",
    "POST /use": "machine.use",
    "POST /stop-using": "machine.stopUsing",
    "GET /ssh-hosts": "machine.listSshHosts",
    "POST /ssh-hosts": "machine.createSshHost",
    "GET /ssh-hosts/:alias": "machine.getSshHost",
    "PUT /ssh-hosts/:alias": "machine.updateSshHost",
    "POST /add": "machine.add",
    "POST /probe": "machine.probe",
    "POST /:machineId/install": "machine.install",
    "POST /:machineId/connect": "machine.connect",
    "POST /:machineId/reconnect": "machine.reconnect",
    "POST /:machineId/stop-reconnecting": "machine.stopReconnecting",
    "GET /:machineId/dirs": "machine.listDirs",
    "POST /:machineId/release": "machine.release",
    "POST /:machineId/restart": "machine.restart",
    "POST /:machineId/stop": "machine.stop",
    "POST /:machineId/uninstall": "machine.uninstall",
    "POST /:machineId/sync": "machine.sync",
    "POST /:machineId/diagnose": "machine.diagnose",
    "POST /:machineId/disconnect": "machine.disconnect"
  },
  "machines.server-proxy": {
    "ALL /*": "machine.proxy"
  },
  "messaging.accounts": {
    "GET /accounts": "messaging.listAccounts"
  },
  "messaging.account-holders": {
    "GET /account-holders": "messaging.listAccountHolders"
  },
  "messaging.session-routes": {
    "GET /:sessionId/messaging": "messaging.session.list",
    "GET /:sessionId/messaging/feishu": "agents.messaging.feishu.get",
    "PUT /:sessionId/messaging/feishu": "agents.messaging.feishu.update",
    "POST /:sessionId/messaging/feishu/state": "agents.messaging.feishu.setState",
    "DELETE /:sessionId/messaging/feishu": "agents.messaging.feishu.delete",
    "POST /:sessionId/messaging/feishu/test": "agents.messaging.feishu.test",
    "POST /:sessionId/messaging/feishu/test-message": "agents.messaging.feishu.testMessage",
    "GET /:sessionId/messaging/telegram": "agents.messaging.telegram.get",
    "PUT /:sessionId/messaging/telegram": "agents.messaging.telegram.update",
    "POST /:sessionId/messaging/telegram/state": "agents.messaging.telegram.setState",
    "DELETE /:sessionId/messaging/telegram": "agents.messaging.telegram.delete",
    "POST /:sessionId/messaging/telegram/test": "agents.messaging.telegram.test",
    "POST /:sessionId/messaging/telegram/test-message": "agents.messaging.telegram.testMessage",
    "GET /:sessionId/messaging/qq": "agents.messaging.qq.get",
    "PUT /:sessionId/messaging/qq": "agents.messaging.qq.update",
    "POST /:sessionId/messaging/qq/state": "agents.messaging.qq.setState",
    "DELETE /:sessionId/messaging/qq": "agents.messaging.qq.delete",
    "POST /:sessionId/messaging/qq/scan": "agents.messaging.qq.scanStart",
    "POST /:sessionId/messaging/qq/scan/poll": "agents.messaging.qq.scanPoll",
    "POST /:sessionId/messaging/qq/scan/cancel": "agents.messaging.qq.scanCancel",
    "POST /:sessionId/messaging/qq/test": "agents.messaging.qq.test",
    "POST /:sessionId/messaging/qq/test-message": "agents.messaging.qq.testMessage",
    "GET /:sessionId/messaging/wechat": "agents.messaging.wechat.get",
    "PUT /:sessionId/messaging/wechat": "agents.messaging.wechat.update",
    "POST /:sessionId/messaging/wechat/state": "agents.messaging.wechat.setState",
    "DELETE /:sessionId/messaging/wechat": "agents.messaging.wechat.delete",
    "POST /:sessionId/messaging/wechat/scan": "agents.messaging.wechat.scanStart",
    "GET /:sessionId/messaging/wechat/scan": "agents.messaging.wechat.scanPoll",
    "POST /:sessionId/messaging/wechat/scan/poll": "agents.messaging.wechat.scanPoll",
    "POST /:sessionId/messaging/wechat/scan/verify": "agents.messaging.wechat.scanVerify",
    "POST /:sessionId/messaging/wechat/scan/cancel": "agents.messaging.wechat.scanCancel",
    "POST /:sessionId/messaging/wechat/test": "agents.messaging.wechat.test",
    "POST /:sessionId/messaging/wechat/test-message": "agents.messaging.wechat.testMessage"
  },
  "agents.messaging.feishu": {
    "GET /": "agents.messaging.feishu.get",
    "PUT /": "agents.messaging.feishu.update",
    "POST /state": "agents.messaging.feishu.setState",
    "DELETE /": "agents.messaging.feishu.delete",
    "POST /test": "agents.messaging.feishu.test",
    "POST /test-message": "agents.messaging.feishu.testMessage"
  },
  "agents.messaging.telegram": {
    "GET /": "agents.messaging.telegram.get",
    "PUT /": "agents.messaging.telegram.update",
    "POST /state": "agents.messaging.telegram.setState",
    "DELETE /": "agents.messaging.telegram.delete",
    "POST /test": "agents.messaging.telegram.test",
    "POST /test-message": "agents.messaging.telegram.testMessage"
  },
  "agents.messaging.qq": {
    "GET /": "agents.messaging.qq.get",
    "PUT /": "agents.messaging.qq.update",
    "POST /state": "agents.messaging.qq.setState",
    "DELETE /": "agents.messaging.qq.delete",
    "POST /scan": "agents.messaging.qq.scanStart",
    "POST /scan/poll": "agents.messaging.qq.scanPoll",
    "POST /scan/cancel": "agents.messaging.qq.scanCancel",
    "POST /test": "agents.messaging.qq.test",
    "POST /test-message": "agents.messaging.qq.testMessage"
  },
  "agents.messaging.wechat": {
    "GET /": "agents.messaging.wechat.get",
    "PUT /": "agents.messaging.wechat.update",
    "POST /state": "agents.messaging.wechat.setState",
    "DELETE /": "agents.messaging.wechat.delete",
    "POST /scan": "agents.messaging.wechat.scanStart",
    "GET /scan": "agents.messaging.wechat.scanPoll",
    "POST /scan/poll": "agents.messaging.wechat.scanPoll",
    "POST /scan/verify": "agents.messaging.wechat.scanVerify",
    "POST /scan/cancel": "agents.messaging.wechat.scanCancel",
    "POST /test": "agents.messaging.wechat.test",
    "POST /test-message": "agents.messaging.wechat.testMessage"
  },
  "projects": {
    "GET /": "project.list",
    "POST /": "project.create",
    "PATCH /:projectId": "project.update",
    "DELETE /:projectId": "project.delete"
  },
  "projects.members": {
    "GET /": "project.member.list",
    "POST /": "project.member.add",
    "DELETE /:userId": "project.member.remove"
  },
  "projects.dirs": {
    "GET /": "project.dir.list",
    "POST /access": "project.dir.checkAccess"
  },
  "suggest-id": {
    "POST /": "project.suggestId"
  },
  "sessions.command-policy": {
    "GET /": "project.commandPolicy.get",
    "PUT /": "project.commandPolicy.update"
  },
  "cli.commands": {
    "GET /": "cli.commands.list",
    "POST /run": "cli.commands.run"
  },
  "version": {
    "GET /": "version.get",
    "GET /history": "version.listHistory",
    "GET /history/ifaces/:hash": "version.getHistoryIfaces",
    "GET /history/diff": "version.getHistoryDiff",
    "POST /history/rollback": "version.rollback",
    "GET /update-check": "version.getUpdateCheck",
    "GET /update": "version.getUpdate",
    "POST /update": "version.startUpdate",
    "POST /restart": "version.restart"
  },
  "handshake": {
    "GET /": "handshake.get"
  },
  "events": {
    "GET /": "events.stream"
  },
  "web.contributions": {
    "GET /": "web.contributions.list"
  },
  "languages": {
    "GET /": "languages.list",
    "GET /:id/grammar": "languages.getGrammar"
  },
  "themes": {
    "GET /": "themes.list",
    "GET /:id/files/*": "themes.getFile",
    "POST /": "themes.create",
    "DELETE /:id": "themes.delete",
    "GET /:id/export": "themes.export"
  },
  "me": {
    "GET /": "me.get",
    "PUT /password": "me.updatePassword",
    "PUT /profile": "me.updateProfile",
    "GET /prefs": "me.getPrefs",
    "PUT /prefs": "me.updatePrefs",
    "GET /background-image": "me.getBackgroundImage",
    "PUT /background-image": "me.updateBackgroundImage",
    "GET /drafts": "me.getDrafts",
    "PATCH /drafts": "me.updateDrafts"
  },
  "desktop.update": {
    "GET /": "desktop.update.get",
    "POST /check": "desktop.update.check",
    "POST /download": "desktop.update.download",
    "POST /install": "desktop.update.install"
  },
  "desktop.tray": {
    "GET /": "desktop.tray.get",
    "PUT /": "desktop.tray.update"
  },
  "desktop.privacy": {
    "POST /": "desktop.privacy.open"
  },
  "desktop.window": {
    "POST /": "desktop.window.action"
  },
  "admin.users": {
    "GET /": "admin.users.list",
    "POST /": "admin.users.create",
    "POST /:userId/password": "admin.users.setPassword",
    "DELETE /:userId": "admin.users.delete"
  },
  "admin.settings": {
    "GET /": "admin.settings.get",
    "PUT /": "admin.settings.update",
    "GET /proxy-probe": "admin.settings.listProxyProbes",
    "POST /proxy-probe/:provider": "admin.settings.runProxyProbe"
  },
  "admin.plugin-config": {
    "GET /": "admin.pluginConfig.get",
    "PUT /": "admin.pluginConfig.update",
    "POST /action": "admin.pluginConfig.action"
  },
  "PluginModuleRoutes.admin": {
    "GET /": "admin.pluginModules.list",
    "POST /decide": "admin.pluginModules.decide"
  }
},
        aliases: {
  "agents.feishu": "agents.messaging.feishu",
  "agents.telegram": "agents.messaging.telegram",
  "agents.qq": "agents.messaging.qq",
  "agents.wechat": "agents.messaging.wechat",
  "messaging.feishu": "agents.messaging.feishu",
  "messaging.telegram": "agents.messaging.telegram",
  "messaging.qq": "agents.messaging.qq",
  "messaging.wechat": "agents.messaging.wechat",
  "messaging.accounts": "messaging.listAccounts",
  "messaging.account-holders": "messaging.listAccountHolders"
},
        bindings: {
  "session.read": [
    "session.list",
    "session.listBatch",
    "session.get",
    "session.getScratchpadFile",
    "session.getTraceImage",
    "session.getMessages",
    "session.getAmsp",
    "session.listApprovals",
    "session.stream",
    "session.getGoal",
    "session.listProcesses",
    "session.listFiles",
    "session.readFile",
    "session.searchFiles",
    "session.previewFileRedirect",
    "session.statFiles",
    "session.getContext",
    "session.listTraces",
    "session.getTrace",
    "session.getTraceAnalysis",
    "session.getHistory",
    "session.getHistoryLines",
    "session.getTraceBody",
    "session.listArchivedGroups",
    "session.listArchived"
  ],
  "session.maintain": [
    "session.create",
    "session.update",
    "session.fork",
    "session.runTask",
    "session.steer",
    "session.deleteSteer",
    "session.messageSubagent",
    "session.abortSubagent",
    "session.deleteFollowUp",
    "session.interrupt",
    "session.resolveApproval",
    "session.backgroundToolCall",
    "session.abort",
    "session.killProcess",
    "session.deleteProcess",
    "session.retryNow",
    "session.retry",
    "session.compact",
    "session.switchModel",
    "session.writeFile",
    "session.createFile",
    "session.moveFile",
    "session.revealFile",
    "session.unarchive"
  ],
  "session.all": [
    "session.delete",
    "session.deleteFile",
    "session.archiveWorkspace",
    "session.deleteArchived"
  ],
  "workspace.read": [
    "workspace.listFiles",
    "workspace.readFile",
    "workspace.searchFiles"
  ],
  "workspace.maintain": [
    "workspace.writeFile",
    "workspace.createFile",
    "workspace.moveFile",
    "workspace.revealFile"
  ],
  "workspace.all": [
    "workspace.deleteFile"
  ],
  "agent.read": [
    "agent.list",
    "agent.getDeletion",
    "agent.auth.get",
    "agent.config.get",
    "agent.avatar.get",
    "agent.archive.export",
    "agent.api.get"
  ],
  "agent.maintain": [
    "agent.create",
    "agent.config.update",
    "agent.config.mcpTest",
    "agent.config.kernelUpdate",
    "agent.avatar.update",
    "agent.archive.import",
    "agent.api.try"
  ],
  "agent.all": [
    "agent.delete",
    "agent.config.reset",
    "agent.api.update",
    "agent.api.createKey",
    "agent.api.deleteKey"
  ],
  "memory.read": [
    "memory.get",
    "memory.listFiles",
    "memory.readFile",
    "memory.export"
  ],
  "memory.maintain": [
    "memory.templatePlaceholder",
    "memory.import"
  ],
  "memory.all": [
    "memory.deleteFile"
  ],
  "schedule.read": [
    "schedule.list",
    "schedule.get",
    "schedule.listProject"
  ],
  "schedule.maintain": [
    "schedule.create",
    "schedule.templatePlaceholder",
    "schedule.update"
  ],
  "schedule.all": [
    "schedule.delete"
  ],
  "skill.read": [
    "skill.list",
    "skill.exportArchive",
    "skill.getIcon",
    "skill.listDir",
    "skill.getDirIcon"
  ],
  "skill.maintain": [
    "skill.templatePlaceholder",
    "skill.importArchive"
  ],
  "skill.all": [
    "skill.delete"
  ],
  "plugin.read": [
    "plugin.library.list",
    "plugin.library.listFiles",
    "plugin.library.getReadme",
    "plugin.library.getArchive",
    "plugin.library.getIcon",
    "plugin.registry.list",
    "plugin.registry.getIcon",
    "plugin.registry.getReadme",
    "plugin.registry.getArchive",
    "plugin.installed.list",
    "plugin.agent.list",
    "plugin.hook.list",
    "plugin.hook.exportArchive",
    "plugin.hook.getIcon",
    "plugin.mcp.list",
    "plugin.market.get",
    "plugin.market.getAsset"
  ],
  "plugin.maintain": [
    "plugin.agent.install",
    "plugin.hook.importArchive",
    "plugin.installed.install",
    "plugin.installed.link",
    "plugin.installed.importArchive",
    "plugin.installed.setEnabled",
    "plugin.modules.request"
  ],
  "plugin.all": [
    "plugin.agent.uninstall",
    "plugin.hook.delete",
    "plugin.mcp.delete",
    "plugin.installed.uninstall"
  ],
  "workbench.read": [
    "workbench.list",
    "workbench.exportArchive",
    "workbench.getHistory",
    "workbench.getAppCenterIcon",
    "workbench.serveUi",
    "workbench.serveSdkUi",
    "workbench.serveSdkFile",
    "workbench.appCenter.list"
  ],
  "workbench.maintain": [
    "workbench.setAllEnabled",
    "workbench.setEnabled",
    "workbench.importArchive",
    "workbench.reload",
    "workbench.rollback",
    "workbench.updateSidebar",
    "workbench.updateAppCenter",
    "workbench.callApi",
    "workbench.appCenter.updateLayout"
  ],
  "workbench.all": [
    "workbench.delete"
  ],
  "model.read": [
    "model.list",
    "model.getBalance",
    "model.test",
    "model.detect",
    "model.listRemote",
    "model.detectVision",
    "model.oauth.list",
    "model.oauth.getStatus",
    "model.platformAuth.getStatus",
    "model.modelscopeAuth.getStatus",
    "model.chatDefaults.get",
    "model.toolBindings.list"
  ],
  "model.maintain": [
    "model.setDefault",
    "model.syncPresets",
    "model.platformAuth.sync",
    "model.chatDefaults.update",
    "model.toolBindings.update"
  ],
  "model.all": [
    "model.update",
    "model.updateProvider",
    "model.oauth.start",
    "model.oauth.submitCode",
    "model.platformAuth.start",
    "model.platformAuth.retry",
    "model.platformAuth.cancel",
    "model.modelscopeAuth.start",
    "model.modelscopeAuth.retry",
    "model.modelscopeAuth.cancel"
  ],
  "vault.read": [
    "vault.get"
  ],
  "vault.maintain": [
    "vault.update",
    "vault.setEntry",
    "vault.templatePlaceholder"
  ],
  "vault.all": [
    "vault.deleteEntry"
  ],
  "trace.read": [
    "trace.list",
    "trace.get",
    "trace.getAnalysis",
    "trace.download",
    "usage.get",
    "usage.getModelTotals",
    "usage.listErrors"
  ],
  "trace.maintain": [
    "trace.import"
  ],
  "trace.all": [
    "usage.clearErrors"
  ],
  "benchmark.read": [
    "benchmark.list",
    "benchmark.exportArchive",
    "benchmark.listCases",
    "benchmark.listCaseFiles",
    "benchmark.readCaseFile",
    "benchmark.listRubricFiles",
    "benchmark.readRubricFile"
  ],
  "benchmark.maintain": [
    "benchmark.create",
    "benchmark.importArchive"
  ],
  "benchmark.all": [
    "benchmark.delete"
  ],
  "org.employee.read": [
    "org.employee.getAvatar",
    "org.employee.getDesk"
  ],
  "org.employee.maintain": [
    "org.employee.hire",
    "org.employee.update",
    "org.employee.updateAvatar",
    "org.employee.startDesk"
  ],
  "org.employee.all": [
    "org.employee.remove"
  ],
  "org.handbook.read": [
    "org.handbook.get",
    "org.handbook.listFiles",
    "org.handbook.readFile"
  ],
  "org.handbook.maintain": [
    "org.handbook.update",
    "org.handbook.writeFile"
  ],
  "org.handbook.all": [
    "org.handbook.deleteFile"
  ],
  "org.calendar.read": [
    "org.calendar.list",
    "org.calendar.get"
  ],
  "org.calendar.maintain": [
    "org.calendar.create",
    "org.calendar.update"
  ],
  "org.calendar.all": [
    "org.calendar.delete"
  ],
  "org.ticket.read": [
    "org.ticket.list",
    "org.ticket.get"
  ],
  "org.ticket.maintain": [
    "org.ticket.create",
    "org.ticket.update",
    "org.ticket.move",
    "org.ticket.block",
    "org.ticket.unblock",
    "org.ticket.progress",
    "org.ticket.start",
    "org.ticket.attach"
  ],
  "org.channel.read": [
    "org.channel.list",
    "org.channel.get",
    "org.channel.listMessages"
  ],
  "org.channel.maintain": [
    "org.channel.create",
    "org.channel.update",
    "org.channel.addMember",
    "org.channel.postMessage",
    "org.channel.markRead"
  ],
  "org.channel.all": [
    "org.channel.removeMember"
  ],
  "org.finance.read": [
    "org.finance.get"
  ],
  "org.read": [
    "org.list",
    "org.get",
    "org.getChart",
    "org.session.list"
  ],
  "org.maintain": [
    "org.update"
  ],
  "org.all": [
    "org.create",
    "org.delete"
  ],
  "browser.read": [
    "browser.getStatus",
    "browser.getBackend",
    "browser.listExtensions",
    "browser.listTabs",
    "browser.listImportSources",
    "browser.getSettings",
    "browser.getHistory"
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
    "browser.cdp"
  ],
  "browser.all": [
    "browser.setBackend",
    "browser.createExtensionPairing",
    "browser.revokeExtension",
    "browser.importData",
    "browser.updateSettings",
    "browser.clearHistory",
    "browser.clearData"
  ],
  "machine.read": [
    "machine.list",
    "machine.events",
    "machine.listSshHosts",
    "machine.getSshHost",
    "machine.listDirs",
    "machine.probe",
    "machine.diagnose"
  ],
  "machine.maintain": [
    "machine.use",
    "machine.stopUsing",
    "machine.connect",
    "machine.reconnect",
    "machine.stopReconnecting",
    "machine.disconnect",
    "machine.restart",
    "machine.stop",
    "machine.sync"
  ],
  "machine.all": [
    "machine.add",
    "machine.createSshHost",
    "machine.updateSshHost",
    "machine.install",
    "machine.uninstall",
    "machine.release",
    "machine.proxy"
  ],
  "agents.messaging.read": [
    "agents.messaging.feishu.get",
    "agents.messaging.telegram.get",
    "agents.messaging.qq.get",
    "agents.messaging.wechat.get"
  ],
  "agents.messaging.maintain": [
    "agents.messaging.feishu.update",
    "agents.messaging.feishu.setState",
    "agents.messaging.feishu.test",
    "agents.messaging.feishu.testMessage",
    "agents.messaging.telegram.update",
    "agents.messaging.telegram.setState",
    "agents.messaging.telegram.test",
    "agents.messaging.telegram.testMessage",
    "agents.messaging.qq.update",
    "agents.messaging.qq.setState",
    "agents.messaging.qq.scanStart",
    "agents.messaging.qq.scanPoll",
    "agents.messaging.qq.scanCancel",
    "agents.messaging.qq.test",
    "agents.messaging.qq.testMessage",
    "agents.messaging.wechat.update",
    "agents.messaging.wechat.setState",
    "agents.messaging.wechat.scanStart",
    "agents.messaging.wechat.scanPoll",
    "agents.messaging.wechat.scanVerify",
    "agents.messaging.wechat.scanCancel",
    "agents.messaging.wechat.test",
    "agents.messaging.wechat.testMessage"
  ],
  "agents.messaging.all": [
    "agents.messaging.feishu.delete",
    "agents.messaging.telegram.delete",
    "agents.messaging.qq.delete",
    "agents.messaging.wechat.delete"
  ],
  "messaging.read": [
    "messaging.listAccounts",
    "messaging.listAccountHolders",
    "messaging.session.list"
  ],
  "project.read": [
    "project.list",
    "project.member.list",
    "project.dir.list",
    "project.dir.checkAccess",
    "project.suggestId",
    "project.commandPolicy.get"
  ],
  "project.maintain": [
    "project.create",
    "project.update",
    "project.member.add"
  ],
  "project.all": [
    "project.delete",
    "project.member.remove",
    "project.commandPolicy.update"
  ],
  "command.read": [
    "command.list",
    "cli.commands.list"
  ],
  "command.maintain": [
    "command.run"
  ],
  "command.all": [
    "cli.commands.run"
  ],
  "system.read": [
    "version.get",
    "version.listHistory",
    "version.getHistoryIfaces",
    "version.getHistoryDiff",
    "version.getUpdateCheck",
    "version.getUpdate",
    "handshake.get",
    "events.stream",
    "web.contributions.list",
    "languages.list",
    "languages.getGrammar",
    "themes.list",
    "themes.getFile",
    "themes.export",
    "me.get",
    "me.getPrefs",
    "me.getBackgroundImage",
    "me.getDrafts",
    "desktop.update.get",
    "desktop.tray.get"
  ],
  "system.maintain": [
    "me.updateProfile",
    "me.updatePrefs",
    "me.updateBackgroundImage",
    "me.updateDrafts",
    "themes.create",
    "desktop.tray.update",
    "desktop.window.action"
  ],
  "system.all": [
    "me.updatePassword",
    "themes.delete",
    "version.rollback",
    "version.startUpdate",
    "version.restart",
    "desktop.update.check",
    "desktop.update.download",
    "desktop.update.install",
    "desktop.privacy.open"
  ],
  "admin.read": [
    "admin.users.list",
    "admin.settings.get",
    "admin.settings.listProxyProbes",
    "admin.pluginConfig.get",
    "admin.pluginModules.list"
  ],
  "admin.maintain": [
    "agent.auth.update",
    "admin.settings.update",
    "admin.settings.runProxyProbe",
    "admin.pluginConfig.update",
    "admin.pluginConfig.action",
    "admin.pluginModules.decide"
  ],
  "admin.all": [
    "admin.users.create",
    "admin.users.setPassword",
    "admin.users.delete"
  ]
},
      },
    ],
  },
})
export class BuiltinAuthRoles {}
