import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type PluginSurfaceProps, useRpc } from "@getpaseo/plugin";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, TextInput, View, type ViewStyle } from "react-native";
import {
  usageConfigGet,
  usageConfigSave,
  usageGet,
  type UsageItem,
} from "./usage.shared";

function UsageRow({
  theme,
  layout,
  item,
}: {
  theme: PluginSurfaceProps["theme"];
  layout: PluginSurfaceProps["layout"];
  item: UsageItem;
}) {
  const styles = useMemo(
    () => ({
      row: { gap: layout.compact ? 4 : 8, paddingVertical: layout.compact ? 8 : 12 },
      header: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        alignItems: "center" as const,
      },
      label: { color: theme.colors.foregroundMuted, fontSize: 13 },
      value: { color: theme.colors.foreground, fontSize: 14, fontWeight: "600" as const },
      track: {
        height: layout.compact ? 6 : 8,
        borderRadius: 4,
        backgroundColor: `${theme.colors.foreground}26`,
        overflow: "hidden" as const,
      },
      fill: {
        height: "100%" as const,
        width: `${Math.max(0, Math.min(100, item.percent))}%` as ViewStyle["width"],
        backgroundColor: theme.colors.accent,
      },
      reset: { color: theme.colors.foregroundMuted, fontSize: 11 },
    }),
    [theme, layout.compact, item.percent]
  );

  return (
    <View style={styles.row}>
      <View style={styles.header}>
        <Text style={styles.label}>{item.label}</Text>
        <Text style={styles.value}>{item.percent}%</Text>
      </View>
      <View style={styles.track}>
        <View style={styles.fill} />
      </View>
      {item.reset ? <Text style={styles.reset}>Resets in {item.reset}</Text> : null}
    </View>
  );
}

export function useUsageQuery() {
  const getUsage = useRpc(usageGet);
  return useQuery({
    queryKey: ["opencode-usage", "usage"],
    queryFn: () => getUsage({}),
    refetchInterval: 10 * 60 * 1000,
  });
}

export function UsageSurface({ theme, layout }: PluginSurfaceProps) {
  const getConfig = useRpc(usageConfigGet);
  const saveConfigRpc = useRpc(usageConfigSave);
  const queryClient = useQueryClient();

  const usageQuery = useUsageQuery();
  const configQuery = useQuery({
    queryKey: ["opencode-usage", "config"],
    queryFn: () => getConfig({}),
    refetchInterval: 10 * 60 * 1000,
  });

  const [showForm, setShowForm] = useState(false);
  const [workspaceId, setWorkspaceId] = useState("");
  const [pageUrl, setPageUrl] = useState("");
  const [cookie, setCookie] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const cfg = configQuery.data;
    if (!cfg || !cfg.workspaceId) return;
    setWorkspaceId((value) => value || cfg.workspaceId);
    setPageUrl((value) => value || cfg.pageUrl);
  }, [configQuery.data]);

  async function onSave() {
    setSaving(true);
    try {
      await saveConfigRpc({
        workspaceId,
        pageUrl,
        cookie: cookie || undefined,
      });
      setShowForm(false);
      setCookie("");
      await queryClient.invalidateQueries({ queryKey: ["opencode-usage"] });
    } finally {
      setSaving(false);
    }
  }

  const styles = useMemo(
    () => ({
      screen: {
        flex: 1,
        padding: layout.compact ? 16 : 24,
        gap: layout.compact ? 12 : 16,
        backgroundColor: theme.colors.surface0,
      } as ViewStyle,
      header: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        alignItems: "center" as const,
      },
      title: { color: theme.colors.foreground, fontSize: layout.compact ? 18 : 20, fontWeight: "600" as const },
      updated: { color: theme.colors.foregroundMuted, fontSize: 11 },
      error: { color: theme.colors.statusDanger, fontSize: 13, lineHeight: 19 },
      button: {
        paddingVertical: layout.compact ? 8 : 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: theme.colors.accent,
      },
      buttonText: { color: theme.colors.accentForeground, fontSize: 13, fontWeight: "600" as const },
      ghostButton: {
        paddingVertical: layout.compact ? 8 : 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: `${theme.colors.foreground}40`,
      },
      ghostButtonText: { color: theme.colors.foreground, fontSize: 13 },
      form: { gap: layout.compact ? 8 : 12 },
      fieldLabel: { color: theme.colors.foregroundMuted, fontSize: 12 },
      input: {
        color: theme.colors.foreground,
        borderBottomWidth: 1,
        borderBottomColor: `${theme.colors.foreground}40`,
        paddingVertical: 6,
        fontSize: 13,
      },
      hint: { color: theme.colors.foregroundMuted, fontSize: 11, lineHeight: 16 },
    }),
    [theme, layout.compact]
  );

  const data = usageQuery.data;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>OpenCode Usage</Text>
        {data?.ok && data.updatedAt ? (
          <Text style={styles.updated}>
            updated {new Date(data.updatedAt).toLocaleTimeString()}
          </Text>
        ) : null}
      </View>

      {usageQuery.isLoading ? (
        <Text style={styles.updated}>Caricamento…</Text>
      ) : data?.ok && data.items ? (
        data.items.map((item) => (
          <UsageRow key={item.label} theme={theme} layout={layout} item={item} />
        ))
      ) : (
        <Text style={styles.error}>{data?.error ?? "Errore sconosciuto."}</Text>
      )}

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          onPress={() => void queryClient.invalidateQueries({ queryKey: ["opencode-usage", "usage"] })}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Aggiorna</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => setShowForm((value) => !value)}
          style={styles.ghostButton}
        >
          <Text style={styles.ghostButtonText}>{showForm ? "Chiudi" : "Configura"}</Text>
        </Pressable>
      </View>

      {showForm ? (
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>
            workspaceId — dalla URL della pagina workspace
          </Text>
          <TextInput
            value={workspaceId}
            onChangeText={setWorkspaceId}
            placeholder="abc-123…"
            placeholderTextColor={theme.colors.foregroundMuted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.fieldLabel}>
            pageUrl (opzionale — sovrascrive il template workspaceId)
          </Text>
          <TextInput
            value={pageUrl}
            onChangeText={setPageUrl}
            placeholder="https://opencode.ai/workspace/…/go"
            placeholderTextColor={theme.colors.foregroundMuted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.fieldLabel}>
            cookie auth (DevTools → Application → Cookies → opencode.ai)
          </Text>
          <TextInput
            value={cookie}
            onChangeText={setCookie}
            placeholder="Fe26.2**…"
            placeholderTextColor={theme.colors.foregroundMuted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <Text style={styles.hint}>
            Il cookie resta sul daemon (file ~/.paseo/opencode-usage.json). Quando scade, la
            barra mostra l'errore e devi ri-incollarlo.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void onSave()}
            disabled={saving}
            style={styles.button}
          >
            <Text style={styles.buttonText}>{saving ? "Salvataggio…" : "Salva"}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}