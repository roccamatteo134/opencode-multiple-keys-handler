import { type PluginWorkspacePanelProps } from "@getpaseo/plugin";
import { useMemo } from "react";
import { Text, View } from "react-native";
import { useUsageQuery } from "./usage.client";

const short = (label: string) => label.split(/\s+/)[0]?.charAt(0).toUpperCase() ?? "?";

/**
 * Compact one-line panel intended to be docked in a split workspace tab
 * (Ctrl+K → "OpenCode Usage bar"): the closest thing to a status bar that
 * the plugin API currently offers.
 */
export function UsageBarPanel({ theme, layout }: PluginWorkspacePanelProps) {
  const usageQuery = useUsageQuery();
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

  const line = data.items.map((item) => `${short(item.label)} ${item.percent}%`).join(" · ");
  return (
    <View style={styles.bar}>
      <Text style={styles.text}>{line}</Text>
      {data.updatedAt ? (
        <Text style={styles.muted}>{new Date(data.updatedAt).toLocaleTimeString()}</Text>
      ) : null}
    </View>
  );
}