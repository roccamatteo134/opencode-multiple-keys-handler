import { type PluginWorkspacePanelProps } from "@getpaseo/plugin";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { useConfigQuery, useUsageQuery } from "./usage.client";

const short = (label: string) => label.split(/\s+/)[0]?.charAt(0).toUpperCase() ?? "?";

/**
 * Compact one-line panel intended to be docked in a split workspace tab
 * (Ctrl+K → "OpenCode Usage bar"): the closest thing to a status bar that
 * the plugin API currently offers.
 */
export function UsageBarPanel({ theme, layout }: PluginWorkspacePanelProps) {
  const configQuery = useConfigQuery();
  const accounts = configQuery.data?.accounts ?? [];
  const activeAccountId = configQuery.data?.activeAccountId ?? "";
  const activeName =
    accounts.find((a) => a.id === activeAccountId)?.name ?? "";
  const usageQuery = useUsageQuery(activeAccountId);

  const styles = useMemo(
    () => ({
      bar: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 8,
        paddingVertical: layout.compact ? 6 : 8,
        paddingHorizontal: layout.compact ? 12 : 16,
        backgroundColor: theme.colors.surface0,
      },
      text: { color: theme.colors.foreground, fontSize: 13, fontWeight: "500" as const },
      muted: { color: theme.colors.foregroundMuted, fontSize: 12 },
      error: { color: theme.colors.statusDanger, fontSize: 12 },
      zen: { color: theme.colors.foreground, fontSize: 13, fontWeight: "700" as const },
    }),
    [theme, layout.compact]
  );

  const data = usageQuery.data;
  if (usageQuery.isLoading) {
    return (
      <View style={styles.bar}>
        <Text style={styles.muted}>Loading…</Text>
      </View>
    );
  }
  if (!data?.ok || !data.items) {
    return (
      <View style={styles.bar}>
        <Text style={styles.error}>{data?.error ?? "Errore sconosciuto."}</Text>
      </View>
    );
  }

  const parts: string[] = [];
  if (accounts.length > 1 && activeName) parts.push(activeName);
  parts.push(data.items.map((item) => `${short(item.label)} ${item.percent}%`).join(" · "));
  if (typeof data.zenBalance === "number") parts.push(`Zen $${data.zenBalance.toFixed(2)}`);

  return (
    <View style={styles.bar}>
      <Text style={styles.text}>{parts.join(" — ")}</Text>
      {data.updatedAt ? (
        <Text style={styles.muted}>{new Date(data.updatedAt).toLocaleTimeString()}</Text>
      ) : null}
    </View>
  );
}
