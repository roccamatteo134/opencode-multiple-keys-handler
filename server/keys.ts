import { chmodSync, copyFileSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
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

function writeJsonAtomic(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2), "utf8");
  try {
    chmodSync(tmp, 0o600);
  } catch {
    /* Windows: no-op */
  }
  renameSync(tmp, filePath);
}

function setActiveOpenCodeKey(key: string): void {
  let raw: string | undefined;
  try {
    raw = readFileSync(OPENCODE_AUTH_PATH, "utf8");
  } catch {
    raw = undefined; /* file mancante: si parte da oggetto vuoto */
  }
  let auth: Record<string, unknown>;
  if (raw === undefined) {
    auth = {};
  } else {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) throw new Error("auth.json non valido");
      auth = parsed as Record<string, unknown>;
    } catch {
      /* Mai azzerare le credenziali altrui su file corrotto: backup + abort */
      const bak = `${OPENCODE_AUTH_PATH}.corrupt-${Date.now()}.bak`;
      try {
        copyFileSync(OPENCODE_AUTH_PATH, bak);
      } catch {
        /* best effort */
      }
      throw new Error(`auth.json illeggibile (backup in ${bak}). Nessuna modifica applicata.`);
    }
  }
  const prev = auth["opencode-go"];
  auth["opencode-go"] = {
    ...(typeof prev === "object" && prev !== null ? prev : {}),
    type: "api",
    key,
  };
  writeJsonAtomic(OPENCODE_AUTH_PATH, auth);
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

export async function switchKey(
  input: KeySwitchInput,
  context: PluginHandlerContext,
): Promise<KeySwitchOutput> {
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
  /* Hot-switch: `opencode serve` legge le credenziali all'avvio e ignora le
     scritture out-of-band su auth.json. Riapre le sessioni opencode attive
     così i nuovi processi rileggono la key appena scritta. */
  let reloaded = 0;
  const reloadErrors: string[] = [];
  try {
    const { entries } = await context.paseo.agents.list({});
    for (const { agent } of entries) {
      if (agent.provider !== "opencode") continue;
      try {
        await context.paseo.agents.ref(agent.id).reload();
        reloaded++;
      } catch (err) {
        reloadErrors.push(`${agent.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } catch (err) {
    reloadErrors.push(`lista agenti: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (reloadErrors.length > 0) {
    return {
      ok: true,
      reloaded,
      reloadWarning: `Key scritta, ma ${reloadErrors.length} sessioni non ricaricate (riavvia Paseo): ${reloadErrors.slice(0, 3).join("; ")}`,
    };
  }
  return { ok: true, reloaded };
}
