import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type PluginSurfaceProps, useRpc } from "@getpaseo/plugin/client";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View, type ViewStyle } from "react-native";
import {
  keyDelete,
  keySave,
  keySwitch,
  keysGet,
  type KeyEntry,
} from "../shared/keys";

const CACHE_KEY = ["opencode-keys"];

export function useKeysQuery() {
  const getKeys = useRpc(keysGet);
  return useQuery({
    queryKey: ["opencode-keys", "list"],
    queryFn: () => getKeys({}),
    refetchInterval: 30 * 1000,
  });
}

export function KeysSurface({ theme, layout }: PluginSurfaceProps) {
  const saveRpc = useRpc(keySave);
  const deleteRpc = useRpc(keyDelete);
  const switchRpc = useRpc(keySwitch);
  const queryClient = useQueryClient();

  const keysQuery = useKeysQuery();
  const keys = keysQuery.data?.keys ?? [];
  const activeKey = keys.find((k) => k.active);

  const [editing, setEditing] = useState<KeyEntry | "new" | null>(null);
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState("");

  function startEdit(key: KeyEntry) {
    setEditing(key);
    setName(key.name);
    setApiKey("");
    setError("");
  }

  function startNew() {
    setEditing("new");
    setName("");
    setApiKey("");
    setError("");
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: CACHE_KEY });
  }

  async function onSave() {
    setSaving(true);
    setError("");
    try {
      const res = await saveRpc({
        id: editing && editing !== "new" ? editing.id : undefined,
        name,
        apiKey: apiKey || undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "Errore durante il salvataggio.");
        return;
      }
      setEditing(null);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(key: KeyEntry) {
    await deleteRpc({ id: key.id });
    setEditing(null);
    await refresh();
  }

  async function onSwitch(key: KeyEntry) {
    setSwitching(true);
    setError("");
    try {
      const res = await switchRpc({ id: key.id });
      if (!res.ok) setError(res.error ?? "Errore durante lo switch.");
      else if (res.reloadWarning) setError(res.reloadWarning);
      await refresh();
    } finally {
      setSwitching(false);
    }
  }

  const styles = useMemo(
    () => ({
      screen: {
        flex: 1,
        backgroundColor: theme.colors.surface0,
      } as ViewStyle,
      screenContent: {
        padding: layout.compact ? 16 : 24,
        gap: layout.compact ? 12 : 16,
      } as ViewStyle,
      header: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        alignItems: "center" as const,
      },
      title: {
        color: theme.colors.foreground,
        fontSize: layout.compact ? 18 : 20,
        fontWeight: "600" as const,
      },
      muted: { color: theme.colors.foregroundMuted, fontSize: 11 },
      error: { color: theme.colors.statusDanger, fontSize: 13, lineHeight: 19 },
      chips: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
      chip: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: `${theme.colors.foreground}40`,
      },
      chipActive: {
        backgroundColor: theme.colors.accent,
        borderColor: theme.colors.accent,
      },
      chipText: { color: theme.colors.foreground, fontSize: 12, fontWeight: "500" as const },
      chipTextActive: {
        color: theme.colors.accentForeground,
        fontSize: 12,
        fontWeight: "600" as const,
      },
      button: {
        paddingVertical: layout.compact ? 8 : 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        backgroundColor: theme.colors.accent,
      },
      buttonText: {
        color: theme.colors.accentForeground,
        fontSize: 13,
        fontWeight: "600" as const,
      },
      ghostButton: {
        paddingVertical: layout.compact ? 8 : 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: `${theme.colors.foreground}40`,
      },
      ghostButtonText: { color: theme.colors.foreground, fontSize: 13 },
      dangerButton: {
        paddingVertical: layout.compact ? 8 : 10,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: `${theme.colors.statusDanger}66`,
      },
      dangerButtonText: { color: theme.colors.statusDanger, fontSize: 13 },
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
      row: { flexDirection: "row" as const, gap: 8 },
    }),
    [theme, layout.compact]
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>OpenCode Keys Handler</Text>
        <Text style={styles.muted}>{keys.length} key</Text>
      </View>

      {keys.length > 0 ? (
        <Text style={styles.hint}>
          Tocco su una key per attivarla (scrive ~/.local/share/opencode/auth.json). Le
          sessioni opencode attive vengono ricaricate in automatico e rileggono la key.
        </Text>
      ) : (
        <Text style={styles.hint}>
          Nessuna key configurata: aggiungine una con “+ Key”.
        </Text>
      )}

      <View style={styles.chips}>
        {keys.map((key) => (
          <Pressable
            key={key.id}
            accessibilityRole="button"
            disabled={switching}
            onPress={() => void onSwitch(key)}
            style={[styles.chip, key.active && styles.chipActive]}
          >
            <Text style={[styles.chipText, key.active && styles.chipTextActive]}>
              {key.name}
              {key.active ? " — attiva" : ""}
              {!key.hasApiKey ? " ⚠" : ""}
            </Text>
          </Pressable>
        ))}
        <Pressable accessibilityRole="button" onPress={startNew} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>+ Key</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (editing) {
              setEditing(null);
            } else if (activeKey) {
              startEdit(activeKey);
            } else {
              startNew();
            }
          }}
          style={styles.ghostButton}
        >
          <Text style={styles.ghostButtonText}>
            {editing
              ? "Chiudi"
              : activeKey
                ? `Configura "${activeKey.name}"`
                : "Configura"}
          </Text>
        </Pressable>
      </View>

      {editing ? (
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>Nome</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="es. Personale"
            placeholderTextColor={theme.colors.foregroundMuted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={styles.fieldLabel}>
            API key opencode (opencode.ai → API Keys)
          </Text>
          <TextInput
            value={apiKey}
            onChangeText={setApiKey}
            placeholder={editing !== "new" ? "lascia vuoto per non cambiarla" : "sk-…"}
            placeholderTextColor={theme.colors.foregroundMuted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <Text style={styles.hint}>
            Le key restano sul daemon (file ~/.paseo/opencode-usage.json, chmod 600) e non
            vengono mai esposte al client.
          </Text>
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              onPress={() => void onSave()}
              disabled={saving}
              style={styles.button}
            >
              <Text style={styles.buttonText}>{saving ? "Salvataggio…" : "Salva"}</Text>
            </Pressable>
            {editing !== "new" ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void onDelete(editing)}
                style={styles.dangerButton}
              >
                <Text style={styles.dangerButtonText}>Elimina</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
