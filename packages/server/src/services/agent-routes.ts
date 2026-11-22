import { Bind, Component, Use } from "@prismshadow/penguin-core/kernel";
import type { AppEnv } from "../auth/middleware.js";
import type { Hono } from "hono";
import type { Clock, Config, Paths } from "../hmr/capabilities.js";
import { memoryRoutes } from "../http/routes/memory.js";
import { benchmarksRoutes } from "../http/routes/benchmarks.js";
import { agentSkillsRoutes } from "../http/routes/skills.js";
import { agentArchiveRoutes } from "../http/routes/agent-archive.js";
import { agentTracesRoutes } from "../http/routes/agent-traces.js";
import { agentApiRoutes } from "../http/routes/agent-api.js";
import { agentAvatarRoutes } from "../http/routes/agent-avatar.js";
import type { AgentApi } from "@prismshadow/penguin-library-agent-api";
import type {
  AgentConfig,
  AgentLifecycle,
  Benchmarks,
  Memory,
  Snapshots,
} from "../mechanisms/agents.js";
import type { Access, ProjectConfigStore } from "@prismshadow/penguin-library-project";
import type { Settings } from "@prismshadow/penguin-library-setting";
import type { SessionIndex } from "@prismshadow/penguin-library-session";
import type { TraceIndex, TraceIndexStore, Traces } from "@prismshadow/penguin-library-trace";
import type { Workbenches } from "../mechanisms/workbenches.js";

/**
 * The Agent-scoped route groups: memory, skills, the API tab's settings and keys, the Agent's
 * own avatar, export and import, traces — and benchmarks, which are Project-level peers of an Agent but read through the same
 * services.
 */
@Component({
  contributes: {
    "AgentAuthPermissionProvider.roles": [
      { id: "role.agent.read", role: "agent.read", parents: ["readonly"] },
      {
        id: "role.agent.maintain",
        role: "agent.maintain",
        children: ["agent.read"],
        parents: ["general@self"],
      },
      {
        id: "role.agent.all",
        role: "agent.all",
        children: ["agent.maintain"],
        parents: ["system-maintainer"],
      },
      { id: "role.memory.read", role: "memory.read", parents: ["readonly"] },
      {
        id: "role.memory.maintain",
        role: "memory.maintain",
        children: ["memory.read"],
        parents: ["general@self"],
      },
      {
        id: "role.memory.all",
        role: "memory.all",
        children: ["memory.maintain"],
        parents: ["system-maintainer"],
      },
      { id: "role.skill.read", role: "skill.read", parents: ["readonly"] },
      { id: "role.skill.maintain", role: "skill.maintain", children: ["skill.read"] },
      {
        id: "role.skill.all",
        role: "skill.all",
        children: ["skill.maintain"],
        parents: ["system-maintainer"],
      },
      { id: "role.trace.read", role: "trace.read", parents: ["readonly"] },
      { id: "role.trace.maintain", role: "trace.maintain", children: ["trace.read"] },
      {
        id: "role.trace.all",
        role: "trace.all",
        children: ["trace.maintain"],
        parents: ["system-maintainer"],
      },
      { id: "role.benchmark.read", role: "benchmark.read", parents: ["readonly"] },
      {
        id: "role.benchmark.maintain",
        role: "benchmark.maintain",
        children: ["benchmark.read"],
      },
      {
        id: "role.benchmark.all",
        role: "benchmark.all",
        children: ["benchmark.maintain"],
        parents: ["system-maintainer"],
      },
    ],
    "HttpModule.routes": [
      {
        id: "agents.benchmarks",
        prefix: "/api/projects/:projectId/benchmarks",
        auth: "user",
        order: 165,
      },
      {
        id: "agents.memory",
        prefix: "/api/projects/:projectId/agents/:agentId/memory",
        auth: "user",
        order: 190,
      },
      {
        id: "agents.skills",
        prefix: "/api/projects/:projectId/agents/:agentId/skills",
        auth: "user",
        order: 220,
      },
      {
        id: "agents.api",
        prefix: "/api/projects/:projectId/agents/:agentId/api",
        auth: "user",
        order: 225,
      },
      {
        id: "agents.avatar",
        prefix: "/api/projects/:projectId/agents/:agentId/avatar",
        auth: "user",
        order: 228,
      },
      {
        id: "agents.archive",
        prefix: "/api/projects/:projectId/agents",
        auth: "user",
        order: 230,
      },
      {
        id: "agents.traces",
        prefix: "/api/projects/:projectId/agents/:agentId/traces",
        auth: "user",
        order: 240,
      },
    ],
    "AgentAuthPermissionProvider.roleBindings": [
      {
        id: "agents.routes.bindings",
        endpoints: {
          "agents.avatar": {
            "GET /": "agent.avatar.get",
            "PUT /": "agent.avatar.update",
          },
          "agents.archive": {
            "GET /:agentId/archive": "agent.archive.export",
            "POST /import": "agent.archive.import",
          },
          "agents.api": {
            "GET /": "agent.api.get",
            "PUT /": "agent.api.update",
            "POST /keys": "agent.api.createKey",
            "DELETE /keys/:keyId": "agent.api.deleteKey",
          },
          "agents.memory": {
            "GET /": "memory.get",
            "POST /template-placeholder": "memory.templatePlaceholder",
            "GET /scopes/:scopeKey/files": "memory.listFiles",
            "GET /scopes/:scopeKey/files/:filePath{.+}": "memory.readFile",
            "GET /scopes/:scopeKey/export": "memory.export",
            "POST /scopes/:scopeKey/import": "memory.import",
            "DELETE /scopes/:scopeKey/files/:filePath{.+}": "memory.deleteFile",
          },
          "agents.skills": {
            "GET /": "skill.list",
            "POST /template-placeholder": "skill.templatePlaceholder",
            "POST /archive": "skill.importArchive",
            "GET /:name/archive": "skill.exportArchive",
            "GET /:name/icon": "skill.getIcon",
            "DELETE /:name": "skill.delete",
          },
          "agents.traces": {
            "GET /": "trace.list",
            "GET /:sessionId/:index": "trace.get",
            "GET /:sessionId/:index/analysis": "trace.getAnalysis",
            "GET /:sessionId/:index/download": "trace.download",
            "POST /import": "trace.import",
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
            "GET /:benchmarkId/cases/:caseId/rubric/files/content": "benchmark.readRubricFile",
          },
        },
        bindings: {
          "agent.read": ["agent.avatar.get", "agent.archive.export", "agent.api.get"],
          "agent.maintain": ["agent.avatar.update", "agent.archive.import"],
          "agent.all": ["agent.api.update", "agent.api.createKey", "agent.api.deleteKey"],
          "memory.read": ["memory.get", "memory.listFiles", "memory.readFile", "memory.export"],
          "memory.maintain": ["memory.templatePlaceholder", "memory.import"],
          "memory.all": ["memory.deleteFile"],
          "skill.read": ["skill.list", "skill.exportArchive", "skill.getIcon"],
          "skill.maintain": ["skill.templatePlaceholder", "skill.importArchive"],
          "skill.all": ["skill.delete"],
          "trace.read": ["trace.list", "trace.get", "trace.getAnalysis", "trace.download"],
          "trace.maintain": ["trace.import"],
          "benchmark.read": [
            "benchmark.list",
            "benchmark.exportArchive",
            "benchmark.listCases",
            "benchmark.listCaseFiles",
            "benchmark.readCaseFile",
            "benchmark.listRubricFiles",
            "benchmark.readRubricFile",
          ],
          "benchmark.maintain": ["benchmark.create", "benchmark.importArchive"],
          "benchmark.all": ["benchmark.delete"],
        },
      },
    ],
  },
})
export class AgentRoutes {
  @Use() private readonly config!: Config;
  @Use() private readonly paths!: Paths;
  @Use() private readonly access!: Access;
  @Use() private readonly agentConfig!: AgentConfig;
  @Use() private readonly memory!: Memory;
  @Use() private readonly snapshots!: Snapshots;
  @Use() private readonly benchmarks!: Benchmarks;
  @Use() private readonly traces!: Traces;
  @Use() private readonly agentApi!: AgentApi;
  @Use() private readonly projectConfig!: ProjectConfigStore;
  @Use() private readonly clock!: Clock;
  @Use() private readonly settings!: Settings;
  @Use() private readonly workbenches!: Workbenches;
  @Use() private readonly agents!: AgentLifecycle;
  @Use() private readonly traceIndex!: TraceIndex;
  @Use() private readonly traceStore!: TraceIndexStore;
  @Use() private readonly sessions!: SessionIndex;
  @Bind("agents.memory") memoryRoutes!: Hono<AppEnv>;
  @Bind("agents.benchmarks") benchmarksRoutes!: Hono<AppEnv>;
  @Bind("agents.skills") skillsRoutes!: Hono<AppEnv>;
  @Bind("agents.api") apiRoutes!: Hono<AppEnv>;
  @Bind("agents.avatar") avatarRoutes!: Hono<AppEnv>;
  @Bind("agents.archive") archiveRoutes!: Hono<AppEnv>;
  @Bind("agents.traces") tracesRoutes!: Hono<AppEnv>;

  setup() {
    const access = this.access;
    const agentConfigService = this.agentConfig;
    this.memoryRoutes = memoryRoutes({ memoryService: this.memory, access });
    this.benchmarksRoutes = benchmarksRoutes({ benchmarks: this.benchmarks, access });
    this.skillsRoutes = agentSkillsRoutes({ agentConfigService, config: this.config, access });
    const clock = this.clock;
    this.apiRoutes = agentApiRoutes({
      agentApi: this.agentApi,
      projectConfig: this.projectConfig,
      agentConfigService,
      access,
      settings: this.settings,
      now: () => clock.now(),
    });
    this.avatarRoutes = agentAvatarRoutes({
      root: this.paths.root,
      agentConfigService,
      access,
    });
    this.archiveRoutes = agentArchiveRoutes({
      root: this.paths.root,
      access,
      agentConfig: agentConfigService,
      agents: this.agents,
      snapshots: this.snapshots,
      traces: this.traces,
      workbenches: this.workbenches,
      traceIndex: this.traceIndex,
      traceStore: this.traceStore,
      sessions: this.sessions,
      now: () => clock.now(),
    });
    this.tracesRoutes = agentTracesRoutes({
      agentConfigService,
      access,
      traceService: this.traces,
    });
  }
}
