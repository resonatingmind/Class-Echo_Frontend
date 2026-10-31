import { useEffect, useState } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, Text, View } from "react-native";

import { getPublicSystemStatus } from "../../lib/api";
import { AppTheme } from "../../theme/AppTheme";

/**
 * Tells everyone why their changes are being refused.
 *
 * Without this, maintenance mode is indistinguishable from the app being
 * broken: every save fails with a 503 and no explanation attached to anything
 * the user can see. Polled rather than pushed because the whole point is that
 * it has to keep working while the interesting parts of the system are down.
 */

const POLL_MS = 60_000;

export function MaintenanceBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        const status = await getPublicSystemStatus();
        if (!cancelled) {
          setMessage(status.maintenance_mode ? status.maintenance_message : null);
        }
      } catch {
        // A failed check must not itself raise a banner: the API being briefly
        // unreachable is not the same claim as "we are in maintenance", and
        // guessing wrong here would show a false notice to every user.
      }
    };

    void check();
    const timer = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (!message) return null;

  return (
    <View style={styles.banner}>
      <Ionicons color="#7A2E0E" name="construct-outline" size={15} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: AppTheme.spacing.s,
    backgroundColor: AppTheme.colors.warningSoft,
    paddingVertical: AppTheme.spacing.s,
    paddingHorizontal: AppTheme.spacing.l,
  },
  text: { flex: 1, fontSize: 12, color: "#7A2E0E", fontWeight: "600", lineHeight: 17 },
});
