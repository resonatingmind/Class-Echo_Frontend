import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DIMENSION_LABELS } from '../../lib/reportFindings';
import { statusOf } from '../../lib/teacherStatus';
import { AppTheme } from '../../theme/AppTheme';
import { SchoolGrowth } from '../../types/api';

/**
 * The school's teachers, each against their own past, and where the school as
 * a whole is weakest, to guide group training. Listed by name: no ranking.
 */
export function SchoolGrowthCard({ growth, onOpenTeacher }: {
  growth: SchoolGrowth;
  onOpenTeacher: (teacherId: number) => void;
}) {
  const top = growth.weakest_areas[0];
  const counts = growth.status_counts;
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Teacher growth</Text>
      <Text style={styles.subtitle}>Each teacher compared only with their own past.</Text>

      <View style={styles.counts}>
        {(['improving', 'steady', 'needs_support'] as const).map((k) => (
          <View key={k} style={[styles.count, { backgroundColor: statusOf(k).bg }]}>
            <Text style={[styles.countValue, { color: statusOf(k).fg }]}>{counts[k] ?? 0}</Text>
            <Text style={[styles.countLabel, { color: statusOf(k).fg }]}>{statusOf(k).label}</Text>
          </View>
        ))}
      </View>

      {top ? (
        <View style={styles.pattern}>
          <Ionicons color={AppTheme.colors.primaryDark} name="school-outline" size={18} />
          <Text style={styles.patternText}>
            {DIMENSION_LABELS[top.area] ?? top.area} is the weakest area for {Math.round(top.share * 100)}% of teachers
            ({top.teachers} of {growth.teachers_counted}). A good topic for group training.
          </Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {growth.teachers.map((t) => {
          const status = statusOf(t.status);
          return (
            <Pressable
              accessibilityRole="button"
              key={t.teacher_id}
              onPress={() => onOpenTeacher(t.teacher_id)}
              style={styles.row}
            >
              <View style={styles.rowBody}>
                <Text numberOfLines={1} style={styles.name}>{t.name}</Text>
                <Text numberOfLines={1} style={styles.meta}>
                  {t.focus_area ? `Focus: ${DIMENSION_LABELS[t.focus_area] ?? t.focus_area}` : `${t.lecture_count} lecture${t.lecture_count === 1 ? '' : 's'} in trends`}
                  {t.streak_weeks > 0 ? ` · ${t.streak_weeks}-week streak` : ''}
                </Text>
              </View>
              <View style={[styles.status, { backgroundColor: status.bg }]}>
                <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
              </View>
              <Ionicons color={AppTheme.colors.hint} name="chevron-forward" size={16} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: AppTheme.spacing.m },
  title: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.heading3 },
  subtitle: { fontSize: 13, color: AppTheme.colors.textSecondary, marginTop: -8 },
  counts: { flexDirection: 'row', gap: AppTheme.spacing.s },
  count: { flex: 1, borderRadius: AppTheme.radius.medium, padding: AppTheme.spacing.m, gap: 2 },
  countValue: { fontSize: 22, fontWeight: '800' },
  countLabel: { fontSize: 12, fontWeight: '700' },
  pattern: {
    flexDirection: 'row',
    gap: AppTheme.spacing.s,
    padding: AppTheme.spacing.m,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primaryLight,
  },
  patternText: { flex: 1, fontSize: 13, lineHeight: 19, color: AppTheme.colors.textPrimary },
  list: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppTheme.spacing.s,
    minHeight: 56,
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.divider,
  },
  rowBody: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: '700', color: AppTheme.colors.textPrimary },
  meta: { fontSize: 12, color: AppTheme.colors.textSecondary },
  status: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  statusText: { fontSize: 12, fontWeight: '700' },
});
