import type { ScopeTabValue } from "./scopeUi";
import type { PermissionEntry, TokenLimitEntry, TokenLimitScope } from "./type";
import { arePermissionEntriesEqual } from "./components/permissions/permissionsState";
import { DEFAULT_SCOPE } from "./scopeCodec";

export type TokenPermissionTemplateValue = "agent" | "visitor" | "custom";

type TokenPermissionTemplateOption = {
  value: TokenPermissionTemplateValue;
  label: string;
  description: string;
};

type TokenPermissionTemplateConfig = {
  value: Exclude<TokenPermissionTemplateValue, "custom">;
  buildPermissions: () => PermissionEntry[];
  matches: (
    tokenLimit: TokenLimitEntry,
    currentScopeTab: ScopeTabValue,
  ) => boolean;
  apply: (tokenLimit: TokenLimitEntry) => {
    tokenLimit: TokenLimitEntry;
    scopeTab: ScopeTabValue;
  };
};

const AGENT_PERMISSIONS: PermissionEntry[] = [
  { static_monitoring: "write" },
  { dynamic_monitoring: "write" },
  { task: "listen" },
];

const VISITOR_PERMISSIONS: PermissionEntry[] = [
  { static_monitoring: { read: "cpu" } },
  { static_monitoring: { read: "system" } },
  { dynamic_monitoring: { read: "cpu" } },
  { dynamic_monitoring: { read: "system" } },
];

const normalizeAgentTemplateScopes = (
  scopes: TokenLimitScope,
): TokenLimitScope => {
  const agentScopes = (scopes ?? []).filter((item) => "agent_uuid" in item);
  return agentScopes.length > 0 ? agentScopes : [];
};

const normalizeGlobalTemplateScopes = (): TokenLimitScope => [...DEFAULT_SCOPE];

export const getTokenPermissionTemplateOptions = (
  t: (key: string) => string,
): TokenPermissionTemplateOption[] => [
  {
    value: "agent",
    label: t(
      "dashboard.token.permissionsConfig.limitItem.template.agent.title",
    ),
    description: t(
      "dashboard.token.permissionsConfig.limitItem.template.agent.description",
    ),
  },
  {
    value: "visitor",
    label: t(
      "dashboard.token.permissionsConfig.limitItem.template.visitor.title",
    ),
    description: t(
      "dashboard.token.permissionsConfig.limitItem.template.visitor.description",
    ),
  },
  {
    value: "custom",
    label: t(
      "dashboard.token.permissionsConfig.limitItem.template.custom.title",
    ),
    description: t(
      "dashboard.token.permissionsConfig.limitItem.template.custom.description",
    ),
  },
];

const TEMPLATE_CONFIGS: Record<
  Exclude<TokenPermissionTemplateValue, "custom">,
  TokenPermissionTemplateConfig
> = {
  agent: {
    value: "agent",
    buildPermissions: () => AGENT_PERMISSIONS.map((item) => ({ ...item })),
    matches: (tokenLimit, currentScopeTab) => {
      if (currentScopeTab !== "Global") return false;
      return arePermissionEntriesEqual(
        tokenLimit.permissions ?? [],
        AGENT_PERMISSIONS,
      );
    },
    apply: (tokenLimit) => ({
      tokenLimit: {
        ...tokenLimit,
        scopes: normalizeGlobalTemplateScopes(),
        permissions: AGENT_PERMISSIONS.map((item) => ({ ...item })),
      },
      scopeTab: "Global",
    }),
  },
  visitor: {
    value: "visitor",
    buildPermissions: () => VISITOR_PERMISSIONS.map((item) => ({ ...item })),
    matches: (tokenLimit, currentScopeTab) => {
      if (currentScopeTab !== "AgentUuid") return false;
      return arePermissionEntriesEqual(
        tokenLimit.permissions ?? [],
        VISITOR_PERMISSIONS,
      );
    },
    apply: (tokenLimit) => ({
      tokenLimit: {
        ...tokenLimit,
        scopes: normalizeAgentTemplateScopes(tokenLimit.scopes),
        permissions: VISITOR_PERMISSIONS.map((item) => ({ ...item })),
      },
      scopeTab: "AgentUuid",
    }),
  },
};

export const applyTokenPermissionTemplate = (
  template: TokenPermissionTemplateValue,
  tokenLimit: TokenLimitEntry,
) => {
  if (template === "custom") {
    return {
      tokenLimit: {
        ...tokenLimit,
      },
      scopeTab: "Global" as ScopeTabValue,
    };
  }

  return TEMPLATE_CONFIGS[template].apply(tokenLimit);
};

export const detectTokenPermissionTemplate = (
  tokenLimit: TokenLimitEntry,
  currentScopeTab: ScopeTabValue,
): TokenPermissionTemplateValue => {
  for (const template of Object.values(TEMPLATE_CONFIGS)) {
    if (template.matches(tokenLimit, currentScopeTab)) {
      return template.value;
    }
  }

  return "custom";
};
