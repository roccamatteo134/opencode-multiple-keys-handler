import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import type {
  UsageAccountActivateInput,
  UsageAccountActivateOutput,
  UsageAccountDeleteInput,
  UsageAccountDeleteOutput,
  UsageAccountSaveInput,
  UsageAccountSaveOutput,
  UsageConfigGetOutput,
  UsageGetInput,
  UsageGetOutput,
  UsageItem,
  UsageKeyStatusOutput,
  UsageKeySwitchInput,
  UsageKeySwitchOutput,
} from "./usage.shared";

interface StoredAccount {
  id: string;
  name: string;
  workspaceId?: string;
  apiKey?: string;
  cookie?: string;
  /* campi legacy, migrati al primo accesso */
  zenApiKey?: string;
  pageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface StoredConfig {
  accounts?: StoredAccount[];
  activeAccountId?: string;
  updatedAt?: string;
  /* campi legacy (config flat a singolo account) */
  workspaceId?: string;
  pageUrl?: string;
  cookie?: string;
}

const CONFIG_PATH = path.join(homedir(), ".paseo", "opencode-usage.json");
const GO_USAGE_URL = "https://opencode.ai/zen/go/v1/usage";
const OPENCODE_AUTH_PATH = path.join(
  homedir(),
  ".local",
  "share",
  "opencode",
  "auth.json",
);

function readConfig(): StoredConfig {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8")) as StoredConfig;
  } catch {
    return {};
  }
}

function writeConfig(config: StoredConfig): void {
  mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  try {
    chmodSync(CONFIG_PATH, 0o600);
  } catch {
    /* Windows: no-op */
  }
}

function migrateConfig(config: StoredConfig): StoredConfig {
  for (const account of config.accounts ?? []) {
    if (account.zenApiKey && !account.apiKey) {
      account.apiKey = account.zenApiKey;
    }
    delete account.zenApiKey;
    delete account.pageUrl;
  }
  if (!config.accounts || config.accounts.length === 0) {
    if (config.workspaceId || config.cookie) {
      config.accounts = [
        {
          id: "default",
          name: "Default",
          workspaceId: config.workspaceId,
          cookie: config.cookie,
        },
      ];
      config.activeAccountId = "default";
    } else {
      config.accounts = [];
    }
  }
  delete config.workspaceId;
  delete config.pageUrl;
  delete config.cookie;
  return config;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function resolveAccount(
  config: StoredConfig,
  accountId?: string,
): StoredAccount | undefined {
  const accounts = config.accounts ?? [];
  const id = accountId ?? config.activeAccountId;
  return accounts.find((a) => a.id === id);
}

interface GoUsageWindow {
  status?: unknown;
  percent?: unknown;
  resetsAt?: unknown;
}

function asWindow(value: unknown): GoUsageWindow | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as GoUsageWindow;
}

function formatReset(resetsAt: unknown): string {
  if (typeof resetsAt !== "string" || !resetsAt.trim()) return "";
  const ms = Date.parse(resetsAt);
  if (Number.isNaN(ms)) return "";
  const secs = Math.max(0, Math.floor((ms - Date.now()) / 1000));
  const days = Math.floor(secs / 86400);
  const hours = Math.floor((secs % 86400) / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return "";
}

function parseGoUsage(payload: unknown): UsageItem[] {
  const usage = asWindow((payload as { usage?: unknown } | undefined)?.usage) as
    | Record<string, unknown>
    | undefined;
  const windows: Array<[string, string]> = [
    ["rolling", "Rolling (5h)"],
    ["weekly", "Weekly"],
    ["monthly", "Monthly"],
  ];
  const items: UsageItem[] = [];
  for (const [key, label] of windows) {
    const raw = asWindow(usage?.[key]);
    if (!raw) continue;
    const status = typeof raw.status === "string" ? raw.status : "ok";
    if (status !== "ok" && status !== "rate-limited") continue;
    if (typeof raw.percent !== "number" || !Number.isFinite(raw.percent)) continue;
    items.push({
      label,
      percent: Math.round(Math.min(100, Math.max(0, raw.percent))),
      reset: formatReset(raw.resetsAt),
    });
  }
  return items;
}

function parseZenBalance(html: string): number | undefined {
  const clean = html.replace(/<!--[\s\S]*?-->/g, "");
  const patterns: RegExp[] = [
    /data-slot="[^"]*(?:balance|credit)[^"]*"[^>]*>\s*\$?\s*(\d+(?:\.\d+)?)/i,
    /Current balance[^$]{0,80}\$?\s*(\d+(?:\.\d+)?)/i,
    /balance[^$]{0,120}\$\s*(\d+(?:\.\d+)?)/i,
  ];
  for (const re of patterns) {
    const m = clean.match(re);
    if (m) {
      const value = parseFloat(m[1]);
      if (!Number.isNaN(value)) return value;
    }
  }
  return undefined;
}

export async function fetchUsage(input: UsageGetInput): Promise<UsageGetOutput> {
  const config = migrateConfig(readConfig());
  const account = resolveAccount(config, input.accountId);
  if (!account) {
    return {
      ok: false,
      error:
        "Nessun account configurato: apri il pannello OpenCode Usage e aggiungi un account.",
    };
  }
  if (!account.apiKey) {
    return {
      ok: false,
      error: `Nessuna API key configurata per "${account.name}": incollala nella configurazione.`,
    };
  }

  let items: UsageItem[];
  try {
    const res = await fetch(GO_USAGE_URL, {
      headers: {
        Authorization: `Bearer ${account.apiKey}`,
        Accept: "application/json",
      },
      redirect: "follow",
    });
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        error: `HTTP ${res.status} — API key non valida o scaduta per "${account.name}".`,
      };
    }
    if (res.status !== 200) {
      return {
        ok: false,
        error: `HTTP ${res.status} — errore dall'endpoint usage.`,
      };
    }
    items = parseGoUsage(await res.json());
    if (items.length === 0) {
      return {
        ok: false,
        error: "Nessun dato usage dall'endpoint: account Go non attivo?",
      };
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  let zenBalance: number | undefined;
  if (account.workspaceId && account.cookie) {
    try {
      const zenRes = await fetch(
        `https://opencode.ai/workspace/${account.workspaceId}`,
        { headers: { Cookie: `auth=${account.cookie}` }, redirect: "follow" },
      );
      if (zenRes.status === 200) {
        zenBalance = parseZenBalance(await zenRes.text());
      }
    } catch {
      /* il saldo è opzionale: non blocca l'usage */
    }
  }

  const updatedAt = new Date().toISOString();
  writeConfig({ ...config, updatedAt });
  return { ok: true, accountId: account.id, items, zenBalance, updatedAt };
}

export function getConfig(): UsageConfigGetOutput {
  const config = migrateConfig(readConfig());
  const accounts = (config.accounts ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    workspaceId: a.workspaceId ?? "",
    hasApiKey: Boolean(a.apiKey),
    hasCookie: Boolean(a.cookie),
  }));
  return {
    accounts,
    activeAccountId: config.activeAccountId ?? accounts[0]?.id ?? "",
    updatedAt: config.updatedAt,
  };
}

export function saveAccount(input: UsageAccountSaveInput): UsageAccountSaveOutput {
  const config = migrateConfig(readConfig());
  const accounts = config.accounts ?? [];
  const name = input.name.trim() || "Account";

  let account: StoredAccount | undefined;
  if (input.id) {
    account = accounts.find((a) => a.id === input.id);
    if (!account) return { ok: false, error: "Account non trovato." };
    account.name = name;
    if (input.workspaceId !== undefined) {
      account.workspaceId = input.workspaceId.trim() || undefined;
    }
    if (input.apiKey !== undefined && input.apiKey.trim()) {
      account.apiKey = input.apiKey.trim();
    }
    if (input.cookie !== undefined && input.cookie.trim()) {
      account.cookie = input.cookie.trim();
    }
    account.updatedAt = new Date().toISOString();
  } else {
    if (!input.apiKey?.trim()) {
      return { ok: false, error: "API key obbligatoria." };
    }
    account = {
      id: newId("acc"),
      name,
      workspaceId: input.workspaceId?.trim() || undefined,
      apiKey: input.apiKey.trim(),
      cookie: input.cookie?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    accounts.push(account);
  }

  if (!account) return { ok: false, error: "Errore interno." };
  if (!config.activeAccountId) config.activeAccountId = account.id;
  config.accounts = accounts;
  config.updatedAt = new Date().toISOString();
  writeConfig(config);
  return { ok: true, id: account.id };
}

export function deleteAccount(input: UsageAccountDeleteInput): UsageAccountDeleteOutput {
  const config = migrateConfig(readConfig());
  const accounts = (config.accounts ?? []).filter((a) => a.id !== input.id);
  config.accounts = accounts;
  if (config.activeAccountId === input.id) {
    config.activeAccountId = accounts[0]?.id;
  }
  if (accounts.length === 0) config.activeAccountId = undefined;
  config.updatedAt = new Date().toISOString();
  writeConfig(config);
  return { ok: true };
}

export function setActiveAccount(
  input: UsageAccountActivateInput,
): UsageAccountActivateOutput {
  const config = migrateConfig(readConfig());
  const accounts = config.accounts ?? [];
  if (!accounts.some((a) => a.id === input.id)) {
    return { ok: false, error: "Account non trovato." };
  }
  config.activeAccountId = input.id;
  config.updatedAt = new Date().toISOString();
  writeConfig(config);
  return { ok: true };
}

interface OpenCodeAuthEntry {
  type?: string;
  key?: string;
}
type OpenCodeAuth = Record<string, OpenCodeAuthEntry>;

function readOpenCodeAuth(): OpenCodeAuth | undefined {
  try {
    return JSON.parse(readFileSync(OPENCODE_AUTH_PATH, "utf8")) as OpenCodeAuth;
  } catch {
    return undefined;
  }
}

function writeOpenCodeAuth(auth: OpenCodeAuth): void {
  mkdirSync(path.dirname(OPENCODE_AUTH_PATH), { recursive: true });
  writeFileSync(OPENCODE_AUTH_PATH, JSON.stringify(auth, null, 2), "utf8");
  try {
    chmodSync(OPENCODE_AUTH_PATH, 0o600);
  } catch {
    /* Windows: no-op */
  }
}

function getActiveOpenCodeKey(): string | undefined {
  return readOpenCodeAuth()?.["opencode-go"]?.key;
}

function setActiveOpenCodeKey(key: string): void {
  const auth = readOpenCodeAuth() ?? {};
  auth["opencode-go"] = { type: "api", key };
  writeOpenCodeAuth(auth);
}

export function getKeyStatus(): UsageKeyStatusOutput {
  const config = migrateConfig(readConfig());
  const active = getActiveOpenCodeKey();
  const accounts = (config.accounts ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    hasApiKey: Boolean(a.apiKey),
    active: Boolean(active && a.apiKey && a.apiKey === active),
  }));
  return {
    ok: true,
    hasActiveKey: Boolean(active),
    activeKeyAccountId: accounts.find((a) => a.active)?.id,
    accounts,
  };
}

export function switchActiveKey(input: UsageKeySwitchInput): UsageKeySwitchOutput {
  const config = migrateConfig(readConfig());
  const account = (config.accounts ?? []).find((a) => a.id === input.accountId);
  if (!account) return { ok: false, error: "Account non trovato." };
  if (!account.apiKey) {
    return { ok: false, error: `Nessuna API key configurata per "${account.name}".` };
  }
  try {
    setActiveOpenCodeKey(account.apiKey);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  return { ok: true };
}
