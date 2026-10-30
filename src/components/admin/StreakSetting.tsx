import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { updateSchoolAdminMe } from '../../lib/api';
import { AppTheme } from '../../theme/AppTheme';

const MIN = 1;
const MAX = 10;

/** How many recordings make a teacher's week count towards their streak. Saved on each tap. */
export function StreakSetting({ token, value, onSaved }: {
  token: string;
  value: number;
  onSaved: (value: number) => void;
}) {
  const [saving, setSaving] = useState(false);

  const save = async (next: number) => {
    setSaving(true);
    try {
      const updated = await updateSchoolAdminMe(token, { streak_min_recordings: next });
      onSaved(updated.streak_min_recordings ?? next);
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const step = (delta: number) => {
    const next = Math.min(MAX, Math.max(MIN, value + delta));
    if (next !== value) void save(next);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Recording streaks</Text>
      <Text style={styles.body}>
        A teacher's week counts towards their streak when they record at least this many lectures. Weeks when
        nobody at school records (holidays) never break a streak.
      </Text>
      <View style={styles.row}>
        <Pressable
          accessibilityLabel="One fewer recording per week"
          accessibilityRole="button"
          disabled={saving || value <= MIN}
          onPress={() => step(-1)}
          style={[styles.stepper, (saving || value <= MIN) && styles.disabled]}
        >
          <Ionicons color={AppTheme.colors.primaryDark} name="remove" size={20} />
        </Pressable>
        <View style={styles.valueBox}>
          {saving ? <ActivityIndicator color={AppTheme.colors.primary} size="small" /> : null}
          <Text style={styles.value}>{value} per week</Text>
        </View>
        <Pressable
          accessibilityLabel="One more recording per week"
          accessibilityRole="button"
          disabled={saving || value >= MAX}
          onPress={() => step(1)}
          style={[styles.stepper, (saving || value >= MAX) && styles.disabled]}
        >
          <Ionicons color={AppTheme.colors.primaryDark} name="add" size={20} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing.l,
    gap: AppTheme.spacing.s,
  },
  title: { fontSize: 16, fontWeight: '800', color: AppTheme.colors.textPrimary },
  body: { fontSize: 13, lineHeight: 19, color: AppTheme.colors.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: AppTheme.spacing.m, marginTop: 4 },
  stepper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.colors.primaryLight,
  },
  valueBox: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 110, justifyContent: 'center' },
  value: { fontSize: 16, fontWeight: '700', color: AppTheme.colors.textPrimary },
  disabled: { opacity: 0.45 },
});
