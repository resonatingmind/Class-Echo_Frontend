import { useCallback, useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  getAdminSettings,
  resetAdminSetting,
  updateAdminSetting,
} from "../../lib/api";
import { AppTheme } from "../../theme/AppTheme";
import { SettingOut } from "../../types/api";

/**
 * Operational settings, changeable without a redeploy.
 *
 * Booleans save on toggle because that is what a switch promises. Text and
 * number fields save on an explicit button: half-typed URLs and partial numbers
 * would otherwise be written on every keystroke, and this is the screen where a
 * wrong value stops invitations from working.
 */
export function SettingsPanel({ token }: { token: string }) {
  const [settings, setSettings] = useState<SettingOut[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await getAdminSettings(token);
      setSettings(next);
      setDrafts(
        Object.fromEntries(
          next
            .filter((s) => s.kind !== "bool")
            .map((s) => [s.key, String(s.value)]),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load settings");
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyResult = (updated: SettingOut) => {
    setSettings((prev) =>
      prev ? prev.map((s) => (s.key === updated.key ? updated : s)) : prev,
    );
    if (updated.kind !== "bool") {
      setDrafts((prev) => ({ ...prev, [updated.key]: String(updated.value) }));
    }
    setSavedKey(updated.key);
    // Cleared on the next interaction rather than a timer: a "Saved" mark that
    // vanishes on its own is easy to miss on a slow connection.
  };

  const save = async (setting: SettingOut, value: string | number | boolean) => {
    setBusyKey(setting.key);
    setError(null);
    try {
      applyResult(await updateAdminSetting(token, setting.key, value));
    } catch (err) {
      setError(
        err instanceof Error
          ? `${setting.label}: ${err.message}`
          : `Could not save ${setting.label}`,
      );
      // Put the field back to what the server still holds, so the screen never
      // shows a value that was not accepted.
      void load();
    } finally {
      setBusyKey(null);
    }
  };

  const reset = async (setting: SettingOut) => {
    setBusyKey(setting.key);
    setError(null);
    try {
      applyResult(await resetAdminSetting(token, setting.key));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset");
    } finally {
      setBusyKey(null);
    }
  };

  if (!settings) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={AppTheme.colors.primary} />
      </View>
    );
  }

  const categories = Array.from(new Set(settings.map((s) => s.category)));

  return (
    <>
      <Text style={styles.intro}>
        These take effect within about 30 seconds, across the API and the
        background worker, with no redeploy. Credentials are deliberately not
        here — those stay in the host's environment variables.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {categories.map((category) => (
        <View key={category} style={styles.group}>
          <Text style={styles.groupTitle}>{category}</Text>

          {settings
            .filter((s) => s.category === category)
            .map((setting) => (
              <View key={setting.key} style={styles.row}>
                <View style={styles.rowHead}>
                  <Text style={styles.label}>{setting.label}</Text>
                  {setting.is_overridden ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={busyKey === setting.key}
                      onPress={() => void reset(setting)}
                      style={styles.resetBtn}
                    >
                      <Text style={styles.resetText}>Reset</Text>
                    </Pressable>
                  ) : (
                    <Text style={styles.envTag}>from environment</Text>
                  )}
                </View>

                <Text style={styles.description}>{setting.description}</Text>

                {setting.kind === "bool" ? (
                  <View style={styles.switchRow}>
                    <Switch
                      disabled={busyKey === setting.key}
                      onValueChange={(next) => void save(setting, next)}
                      trackColor={{
                        false: AppTheme.colors.disabled,
                        true: AppTheme.colors.primary,
                      }}
                      value={Boolean(setting.value)}
                    />
                    <Text style={styles.switchLabel}>
                      {setting.value ? "On" : "Off"}
                    </Text>
                    {busyKey === setting.key ? (
                      <ActivityIndicator color={AppTheme.colors.primary} size="small" />
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.inputRow}>
                    <TextInput
                      autoCapitalize="none"
                      keyboardType={setting.kind === "int" ? "number-pad" : "default"}
                      onChangeText={(text) => {
                        setSavedKey(null);
                        setDrafts((prev) => ({ ...prev, [setting.key]: text }));
                      }}
                      style={styles.input}
                      value={drafts[setting.key] ?? ""}
                    />
                    <Pressable
                      accessibilityRole="button"
                      disabled={
                        busyKey === setting.key ||
                        (drafts[setting.key] ?? "") === String(setting.value)
                      }
                      onPress={() =>
                        void save(
                          setting,
                          setting.kind === "int"
                            ? Number(drafts[setting.key])
                            : drafts[setting.key],
                        )
                      }
                      style={[
                        styles.saveBtn,
                        (busyKey === setting.key ||
                          (drafts[setting.key] ?? "") === String(setting.value)) &&
                          styles.saveBtnDisabled,
                      ]}
                    >
                      {busyKey === setting.key ? (
                        <ActivityIndicator color={AppTheme.colors.white} size="small" />
                      ) : (
                        <Text style={styles.saveText}>Save</Text>
                      )}
                    </Pressable>
                  </View>
                )}

                {savedKey === setting.key ? (
                  <View style={styles.savedRow}>
                    <Ionicons color={AppTheme.colors.successText} name="checkmark-circle" size={13} />
                    <Text style={styles.savedText}>Saved</Text>
                  </View>
                ) : null}

                {setting.is_overridden ? (
                  <Text style={styles.defaultNote}>
                    Environment default: {String(setting.default)}
                  </Text>
                ) : null}
              </View>
            ))}
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 40, alignItems: "center" },
  intro: {
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
    lineHeight: 18,
  },
  error: { fontSize: 12, color: AppTheme.colors.dangerText, lineHeight: 17 },
  group: { gap: AppTheme.spacing.s },
  groupTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: AppTheme.colors.textSecondary,
    marginTop: AppTheme.spacing.s,
  },
  row: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing.m,
    gap: 6,
  },
  rowHead: { flexDirection: "row", alignItems: "center", gap: AppTheme.spacing.s },
  label: { flex: 1, fontSize: 14, fontWeight: "700", color: AppTheme.colors.textPrimary },
  envTag: { fontSize: 10, color: AppTheme.colors.hint, fontWeight: "700" },
  resetBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: AppTheme.colors.surfaceMuted,
  },
  resetText: { fontSize: 11, fontWeight: "700", color: AppTheme.colors.textSecondary },
  description: { fontSize: 12, color: AppTheme.colors.textSecondary, lineHeight: 17 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: AppTheme.spacing.m },
  switchLabel: { fontSize: 13, fontWeight: "700", color: AppTheme.colors.textPrimary },
  inputRow: { flexDirection: "row", gap: AppTheme.spacing.s, alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: 10,
    paddingHorizontal: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.s,
    fontSize: 13,
    color: AppTheme.colors.textPrimary,
    backgroundColor: AppTheme.colors.surfaceSoft,
  },
  saveBtn: {
    backgroundColor: AppTheme.colors.primary,
    borderRadius: 10,
    paddingVertical: AppTheme.spacing.s + 2,
    paddingHorizontal: AppTheme.spacing.l,
    minWidth: 68,
    alignItems: "center",
  },
  saveBtnDisabled: { backgroundColor: AppTheme.colors.disabled },
  saveText: { color: AppTheme.colors.white, fontWeight: "700", fontSize: 12 },
  savedRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  savedText: { fontSize: 11, color: AppTheme.colors.successText, fontWeight: "700" },
  defaultNote: { fontSize: 11, color: AppTheme.colors.hint },
});
