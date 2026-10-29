import { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';

import { setExcludedFromTrends } from '../../lib/api';
import { AppTheme } from '../../theme/AppTheme';
import { useReportFeedback } from './FindingFeedback';

/**
 * Once the teacher says a finding doesn't fit this type of class (a lab, a
 * test, a revision lesson), they may leave the whole lecture out of My Growth
 * trends. Taking that dispute back puts it back in, on the server too.
 */
export function TrendsExclusion({ token, recordingId, initial }: {
  token: string;
  recordingId: number;
  initial: boolean;
}) {
  const ctx = useReportFeedback();
  const [excluded, setExcluded] = useState(initial);
  const [saving, setSaving] = useState(false);

  const disputed = !!ctx?.feedback.some((f) => f.verdict === 'disagree' && f.reasons.includes('class_type'));
  if (!ctx?.canEdit || !disputed) return null;

  const toggle = async (value: boolean) => {
    setSaving(true);
    setExcluded(value);
    try {
      setExcluded((await setExcludedFromTrends(token, recordingId, value)).excluded_from_trends);
    } catch (e) {
      setExcluded(!value);
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.body}>
        <Text style={styles.title}>Leave out of My Growth</Text>
        <Text style={styles.hint}>
          You said this report doesn't fit this type of class. Its scores won't count in your trends.
        </Text>
      </View>
      <Switch
        accessibilityLabel="Leave this lecture out of My Growth trends"
        disabled={saving}
        onValueChange={(v) => void toggle(v)}
        thumbColor={AppTheme.colors.surface}
        trackColor={{ false: AppTheme.colors.disabled, true: AppTheme.colors.primary }}
        value={excluded}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppTheme.spacing.m,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    padding: AppTheme.spacing.l,
  },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 14, fontWeight: '700', color: AppTheme.colors.textPrimary },
  hint: { fontSize: 13, lineHeight: 18, color: AppTheme.colors.textSecondary },
});
