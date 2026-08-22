import { chmodSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import type {
  UsageConfigGetOutput,
  UsageConfigSaveInput,
  UsageConfigSaveOutput,
  UsageGetOutput,
  UsageItem,
} from "./usage.shared";

interface StoredConfig {
  workspaceId?: string;
  pageUrl?: string;
  cookie?: string;
  updatedAt?: string;
}

const CONFIG_PATH = path.join(homedir(), ".paseo", "opencode-usage.json");

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

function parseUsagePage(html: string): UsageItem[] | undefined {
  const clean = html.replace(/<!--[\s\S]*?-->/g, "");
  const blocks = clean.split('data-slot="usage-item"').slice(1);
  if (blocks.length === 0) return undefined;

  const items: UsageItem[] = [];
  for (const block of blocks) {
    const label = block.match(/data-slot="usage-label">\s*([^<]+?)\s*</)?.[1];
    const percent = block.match(/data-slot="usage-value">\s*(\d+)\s*%/)?.[1];
    if (!label || percent === undefined) continue;
    const reset =
      block.match(/data-slot="reset-time">\s*Resets in\s*([^<]+?)\s*</)?.[1] ?? "";
    items.push({
      label: label.trim(),
      percent: parseInt(percent, 10),
      reset: reset.trim(),
    });
  }
  return items.length > 0 ? items : undefined;
}

export async function fetchUsage(): Promise<UsageGetOutput> {
  const config = readConfig();
  if (!config.cookie) {
    return {
      ok: false,
      error:
        "Nessun cookie configurato: apri il pannello OpenCode Usage e incolla il cookie auth.",
    };
  }
  if (!config.workspaceId && !config.pageUrl) {
    return { ok: false, error: "Manca il workspaceId: impostalo nel pannello." };
  }
  const url =
    config.pageUrl && config.pageUrl.trim()
      ? config.pageUrl.trim()
      : `https://opencode.ai/workspace/${config.workspaceId}/go`;

  try {
    const res = await fetch(url, {
      headers: { Cookie: `auth=${config.cookie}` },
      redirect: "follow",
    });
    if (res.status !== 200) {
      return {
        ok: false,
        error: `HTTP ${res.status} — cookie scaduto o sessione non valida.`,
      };
    }
    const html = await res.text();
    const items = parseUsagePage(html);
    if (!items) {
      return {
        ok: false,
        error: "Pagina senza dati usage: cookie non valido o markup cambiato.",
      };
    }
    const updatedAt = new Date().toISOString();
    writeConfig({ ...config, updatedAt });
    return { ok: true, items, updatedAt };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function getConfig(): UsageConfigGetOutput {
  const config = readConfig();
  return {
    workspaceId: config.workspaceId ?? "",
    pageUrl: config.pageUrl ?? "",
    hasCookie: Boolean(config.cookie),
    updatedAt: config.updatedAt,
  };
}

export function saveConfig(input: UsageConfigSaveInput): UsageConfigSaveOutput {
  const config = readConfig();
  if (input.workspaceId !== undefined) config.workspaceId = input.workspaceId.trim();
  if (input.pageUrl !== undefined) config.pageUrl = input.pageUrl.trim();
  if (input.cookie !== undefined) config.cookie = input.cookie.trim();
  writeConfig(config);
  return { ok: true };
}