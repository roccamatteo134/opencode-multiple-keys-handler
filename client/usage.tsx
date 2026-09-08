import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type PluginSurfaceProps, useRpc } from "@getpaseo/plugin/client";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View, type ViewStyle } from "react-native";
import {
  usageAccountDelete,
  usageAccountSave,
  usageAccountActivate,
  usageConfigGet,
  usageGet,
  usageKeyStatus,
  usageKeySwitch,
  type Account,
  type UsageItem,
} from "../shared/usage";

const CACHE_KEY = ["opencode-usage"];

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

export function useUsageQuery(accountId?: string) {
  const getUsage = useRpc(usageGet);
  return useQuery({
    queryKey: ["opencode-usage", "usage", accountId ?? "none"],
    queryFn: () => getUsage({ accountId }),
    enabled: Boolean(accountId),
    refetchInterval: 10 * 60 * 1000,
  });
}

export function useConfigQuery() {
  const getConfig = useRpc(usageConfigGet);
  return useQuery({
    queryKey: ["opencode-usage", "config"],
    queryFn: () => getConfig({}),
    refetchInterval: 10 * 60 * 1000,
  });
}

export function useKeyStatusQuery() {
  const getStatus = useRpc(usageKeyStatus);
  return useQuery({
    queryKey: ["opencode-usage", "key-status"],
    queryFn: () => getStatus({}),
    refetchInterval: 30 * 1000,
  });
}

export function UsageSurface({ theme, layout }: PluginSurfaceProps) {
  const saveAccountRpc = useRpc(usageAccountSave);
  const deleteAccountRpc = useRpc(usageAccountDelete);
  const setActiveRpc = useRpc(usageAccountActivate);
  const switchKeyRpc = useRpc(usageKeySwitch);
  const queryClient = useQueryClient();

  const configQuery = useConfigQuery();
  const accounts = configQuery.data?.accounts ?? [];
  const activeAccountId = configQuery.data?.activeAccountId ?? "";
  const activeAccount = accounts.find((a) => a.id === activeAccountId);
  const usageQuery = useUsageQuery(activeAccountId);
  const keyStatusQuery = useKeyStatusQuery();
  const keyActiveById = new Map(
    (keyStatusQuery.data?.accounts ?? []).map((a) => [a.id, a.active] as const)
  );

  const [editing, setEditing] = useState<Account | "new" | null>(null);
  const [name, setName] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [cookie, setCookie] = useState("");
  const [saving, setSaving] = useState(false);
  const [switchingKey, setSwitchingKey] = useState(false);
  const [keyError, setKeyError] = useState("");

  function startEdit(account: Account) {
    setEditing(account);
    setName(account.name);
    setWorkspaceId(account.workspaceId);
    setApiKey("");
    setCookie("");
  }

  function startNew() {
    setEditing("new");
    setName("");
    setWorkspaceId("");
    setApiKey("");
    setCookie("");
  }

  async function onSaveAccount() {
    setSaving(true);
    try {
      const res = await saveAccountRpc({
        id: editing && editing !== "new" ? editing.id : undefined,
        name,
        workspaceId,
        apiKey: apiKey || undefined,
        cookie: cookie || undefined,
      });
      if (!res.ok) return;
      if (editing === "new" && res.id) {
        await setActiveRpc({ id: res.id });
      }
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: CACHE_KEY });
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteAccount(account: Account) {
    await deleteAccountRpc({ id: account.id });
    setEditing(null);
    await queryClient.invalidateQueries({ queryKey: CACHE_KEY });
  }

  async function onSetActive(account: Account) {
    await setActiveRpc({ id: account.id });
    await queryClient.invalidateQueries({ queryKey: CACHE_KEY });
  }

  async function onKeySwitch(account: Account) {
    setSwitchingKey(true);
    setKeyError("");
    try {
      const res = await switchKeyRpc({ accountId: account.id });
      if (!res.ok) setKeyError(res.error ?? "Errore durante lo switch.");
      await queryClient.invalidateQueries({ queryKey: CACHE_KEY });
    } finally {
      setSwitchingKey(false);
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
      title: { color: theme.colors.foreground, fontSize: layout.compact ? 18 : 20, fontWeight: "600" as const },
      updated: { color: theme.colors.foregroundMuted, fontSize: 11 },
      error: { color: theme.colors.statusDanger, fontSize: 13, lineHeight: 19 },
      zen: {
        color: theme.colors.foreground,
        fontSize: layout.compact ? 15 : 16,
        fontWeight: "700" as const,
      },
      zenMuted: { color: theme.colors.foregroundMuted, fontSize: 12 },
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
      chipTextActive: { color: theme.colors.accentForeground, fontSize: 12, fontWeight: "600" as const },
      chipDot: { color: theme.colors.foregroundMuted, fontSize: 11 },
      chipDotActive: { color: theme.colors.accentForeground, fontSize: 11 },
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
      row: { gap: layout.compact ? 8 : 12 },
    }),
    [theme, layout.compact]
  );

  const data = usageQuery.data;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.title}>OpenCode Usage</Text>
        {data?.ok && data.updatedAt ? (
          <Text style={styles.updated}>
            updated {new Date(data.updatedAt).toLocaleTimeString()}
          </Text>
        ) : null}
      </View>

      {accounts.some((a) => a.hasApiKey) ? (
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>
            Key opencode attiva (~/.local/share/opencode/auth.json)
          </Text>
          <View style={styles.chips}>
            {accounts
              .filter((a) => a.hasApiKey)
              .map((account) => {
                const active = keyActiveById.get(account.id) ?? false;
                return (
                  <Pressable
                    key={account.id}
                    accessibilityRole="button"
                    disabled={switchingKey}
                    onPress={() => void onKeySwitch(account)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {account.name} — {active ? "attiva" : "inattiva"}
                    </Text>
                  </Pressable>
                );
              })}
          </View>
          {keyError ? <Text style={styles.error}>{keyError}</Text> : null}
          {keyStatusQuery.data && !keyStatusQuery.data.hasActiveKey ? (
            <Text style={styles.hint}>
              Nessuna key attiva in auth.json: premine una per attivarla.
            </Text>
          ) : (
            <Text style={styles.hint}>
              Tocco sulla key per attivarla (scrive auth.json). Riavvia le sessioni opencode/Paseo
              già aperte: la key è letta all'avvio.
            </Text>
          )}
        </View>
      ) : null}

      <View style={styles.chips}>
        {accounts.map((account) => {
          const active = account.id === activeAccountId;
          return (
            <Pressable
              key={account.id}
              accessibilityRole="button"
              onPress={() => void onSetActive(account)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {account.name}
                {!account.hasApiKey ? " ⚠" : ""}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityRole="button"
          onPress={() => void startNew()}
          style={styles.ghostButton}
        >
          <Text style={styles.ghostButtonText}>+ Account</Text>
        </Pressable>
      </View>

      {data?.ok && typeof data.zenBalance === "number" ? (
        <View>
          <Text style={styles.zen}>Zen ${data.zenBalance.toFixed(2)}</Text>
          <Text style={styles.zenMuted}>saldo account attivo</Text>
        </View>
      ) : null}

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
          onPress={() => void queryClient.invalidateQueries({ queryKey: CACHE_KEY })}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Aggiorna</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            if (editing) {
              setEditing(null);
            } else if (activeAccount) {
              startEdit(activeAccount);
            } else {
              startNew();
            }
          }}
          style={styles.ghostButton}
        >
          <Text style={styles.ghostButtonText}>
            {editing ? "Chiudi" : "Configura"}
          </Text>
        </Pressable>
      </View>

      {editing ? (
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>Nome account</Text>
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
            API key Go (obbligatoria — opencode.ai/zen → API Keys)
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
          <Text style={styles.fieldLabel}>
            workspaceId (opzionale — solo per il saldo Zen, dalla URL della pagina workspace)
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
            cookie auth (opzionale — solo per il saldo Zen, DevTools → Cookies → opencode.ai)
          </Text>
          <TextInput
            value={cookie}
            onChangeText={setCookie}
            placeholder={editing !== "new" ? "lascia vuoto per non cambiarlo" : "Fe26.2**…"}
            placeholderTextColor={theme.colors.foregroundMuted}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
          />
          <Text style={styles.hint}>
            L'usage Go usa l'endpoint ufficiale (https://opencode.ai/zen/go/v1/usage) con la API
            key. Il saldo Zen è opzionale e, non avendo un endpoint pubblico, viene letto dalla
            dashboard workspace col cookie. Credenziali e API key restano sul daemon
            (file ~/.paseo/opencode-usage.json, chmod 600).
          </Text>
          <View style={styles.row}>
            <Pressable
              accessibilityRole="button"
              onPress={() => void onSaveAccount()}
              disabled={saving}
              style={styles.button}
            >
              <Text style={styles.buttonText}>{saving ? "Salvataggio…" : "Salva"}</Text>
            </Pressable>
            {editing !== "new" ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void onDeleteAccount(editing)}
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
