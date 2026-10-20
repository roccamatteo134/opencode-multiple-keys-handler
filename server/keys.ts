import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import type {
  KeyDeleteInput,
  KeyDeleteOutput,
  KeySaveInput,
  KeySaveOutput,
  KeysGetOutput,
  KeySwitchInput,
  KeySwitchOutput,
} from "../shared/keys";

interface StoredKey {
  id: string;
  name: string;
  apiKey?: string;
  createdAt?: string;
  updatedAt?: string;
  /* campi legacy, migrati al primo write */
  zenApiKey?: string;
  workspaceId?: string;
  cookie?: string;
  pageUrl?: string;
}

interface StoredConfig {
  accounts?: StoredKey[];
  updatedAt?: string;
  /* campi legacy (config flat a singolo account) */
  activeAccountId?: string;
  workspaceId?: string;
  pageUrl?: string;
  cookie?: string;
}

/* ponytail: path invariato per non perdere le key già configurate e non rompere lo script CLI */
const CONFIG_PATH = path.join(homedir(), ".paseo", "opencode-usage.json");
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
  config.accounts = (config.accounts ?? []).map((key) => ({
    id: key.id,
    name: key.name,
    apiKey: key.zenApiKey || key.apiKey,
    createdAt: key.createdAt,
    updatedAt: key.updatedAt,
  }));
  delete config.activeAccountId;
  delete config.workspaceId;
  delete config.pageUrl;
  delete config.cookie;
  return config;
}

function newId(): string {
  return `key-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

type OpenCodeAuth = Record<string, { type?: string; key?: string }>;

function readOpenCodeAuth(): OpenCodeAuth | undefined {
  try {
    return JSON.parse(readFileSync(OPENCODE_AUTH_PATH, "utf8")) as OpenCodeAuth;
  } catch {
    return undefined;
  }
}

function getActiveOpenCodeKey(): string | undefined {
  return readOpenCodeAuth()?.["opencode-go"]?.key;
}

function setActiveOpenCodeKey(key: string): void {
  const auth = readOpenCodeAuth() ?? {};
  auth["opencode-go"] = { type: "api", key };
  mkdirSync(path.dirname(OPENCODE_AUTH_PATH), { recursive: true });
  writeFileSync(OPENCODE_AUTH_PATH, JSON.stringify(auth, null, 2), "utf8");
  try {
    chmodSync(OPENCODE_AUTH_PATH, 0o600);
  } catch {
    /* Windows: no-op */
  }
}

export function getKeys(): KeysGetOutput {
  const config = migrateConfig(readConfig());
  const active = getActiveOpenCodeKey();
  const keys = (config.accounts ?? []).map((key) => ({
    id: key.id,
    name: key.name,
    hasApiKey: Boolean(key.apiKey),
    active: Boolean(active && key.apiKey && key.apiKey === active),
  }));
  return { keys, activeKeyId: keys.find((key) => key.active)?.id };
}

export function saveKey(input: KeySaveInput): KeySaveOutput {
  const config = migrateConfig(readConfig());
  const keys = config.accounts ?? [];
  const name = input.name.trim() || "Key";

  let key: StoredKey | undefined;
  if (input.id) {
    key = keys.find((k) => k.id === input.id);
    if (!key) return { ok: false, error: "Key non trovata." };
    key.name = name;
    if (input.apiKey?.trim()) key.apiKey = input.apiKey.trim();
    key.updatedAt = new Date().toISOString();
  } else {
    if (!input.apiKey?.trim()) return { ok: false, error: "API key obbligatoria." };
    key = {
      id: newId(),
      name,
      apiKey: input.apiKey.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    keys.push(key);
  }

  config.accounts = keys;
  config.updatedAt = new Date().toISOString();
  writeConfig(config);
  return { ok: true, id: key.id };
}

export function deleteKey(input: KeyDeleteInput): KeyDeleteOutput {
  const config = migrateConfig(readConfig());
  config.accounts = (config.accounts ?? []).filter((k) => k.id !== input.id);
  config.updatedAt = new Date().toISOString();
  writeConfig(config);
  return { ok: true };
}

export function switchKey(input: KeySwitchInput): KeySwitchOutput {
  const config = migrateConfig(readConfig());
  const key = (config.accounts ?? []).find((k) => k.id === input.id);
  if (!key) return { ok: false, error: "Key non trovata." };
  if (!key.apiKey) {
    return { ok: false, error: `Nessuna API key configurata per "${key.name}".` };
  }
  try {
    setActiveOpenCodeKey(key.apiKey);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
  return { ok: true };
}
