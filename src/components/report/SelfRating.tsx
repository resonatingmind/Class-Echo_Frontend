import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { putSelfRating } from '../../lib/api';
import { AppTheme } from '../../theme/AppTheme';
import { ScoreBreakdown, SelfRating, SelfRatingArea } from '../../types/api';

/** The four plain-language areas, and the rubric dimensions each one covers. */
export const SELF_RATING_AREAS: {
  key: SelfRatingArea;
  label: string;
  hint: string;
  dimensions: (keyof ScoreBreakdown)[];
}[] = [
  {
    key: 'clarity',
    label: 'Clarity',
    hint: 'Were your explanations easy to follow?',
    dimensions: ['verbal_clarity', 'pacing_delivery', 'language_accessibility'],
  },
  {
    key: 'engagement',
    label: 'Engagement',
    hint: 'Did students take part and think?',
    dimensions: ['student_engagement'],
  },
  {
    key: 'coverage',
    label: 'Coverage',
    hint: 'Did you get through what you planned?',
    dimensions: ['content_structure', 'conceptual_depth'],
  },
  {
    key: 'recap',
    label: 'Recap',
    hint: 'Did you close with the key points?',
    dimensions: ['closure_recap'],
  },
];

const DIMENSION_MAX: Record<keyof ScoreBreakdown, number> = {
  verbal_clarity: 20,
  pacing_delivery: 15,
  content_structure: 15,
  conceptual_depth: 20,
  student_engagement: 15,
  language_accessibility: 10,
  closure_recap: 5,
};

/** The report's view of an area on the same 1-5 scale the teacher used. */
export function reportAreaRating(breakdown: ScoreBreakdown | null | undefined, area: SelfRatingArea): number | null {
  const dims = SELF_RATING_AREAS.find((a) => a.key === area)?.dimensions ?? [];
  let score = 0;
  let max = 0;
  for (const d of dims) {
    const entry = breakdown?.[d];
    if (!entry) continue;
    score += entry.score;
    max += DIMENSION_MAX[d];
  }
  return max ? 1 + Math.round((score / max) * 4) : null;
}

/**
 * "How do you think it went?" — shown in place of the report until the
 * teacher rates the lecture or skips. One tap skips.
 */
export function SelfRatingPrompt({ token, recordingId, onDone }: {
  token: string;
  recordingId: number;
  onDone: (rating: SelfRating) => void;
}) {
  const [ratings, setRatings] = useState<Partial<Record<SelfRatingArea, number>>>({});
  const [reflection, setReflection] = useState('');
  const [saving, setSaving] = useState<'rate' | 'skip' | null>(null);
  const rated = Object.keys(ratings).length;

  const save = async (skipped: boolean) => {
    setSaving(skipped ? 'skip' : 'rate');
    try {
      onDone(await putSelfRating(token, recordingId, skipped
        ? { skipped: true }
        : { ratings, reflection: reflection.trim() || null }));
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
      setSaving(null);
    }
  };

  return (
    <View style={sr.card}>
      <View style={sr.headRow}>
        <Ionicons color={AppTheme.colors.primary} name="sparkles-outline" size={20} />
        <Text style={sr.title}>Your report is ready</Text>
      </View>
      <Text style={sr.subtitle}>
        Before you look: how do you think this lecture went? Rate what you like, then compare with the report.
      </Text>

      {SELF_RATING_AREAS.map((area) => (
        <View key={area.key} style={sr.area}>
          <View style={sr.areaText}>
            <Text style={sr.areaLabel}>{area.label}</Text>
            <Text style={sr.areaHint}>{area.hint}</Text>
          </View>
          <View accessibilityLabel={`${area.label} rating`} style={sr.scale}>
            {[1, 2, 3, 4, 5].map((n) => {
              const on = ratings[area.key] === n;
              return (
                <Pressable
                  accessibilityLabel={`${area.label} ${n} of 5`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  key={n}
                  onPress={() => setRatings((r) => (r[area.key] === n
                    ? Object.fromEntries(Object.entries(r).filter(([k]) => k !== area.key))
                    : { ...r, [area.key]: n }))}
                  style={[sr.dot, on && sr.dotOn]}
                >
                  <Text style={[sr.dotText, on && sr.dotTextOn]}>{n}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <Text style={sr.scaleHint}>1 = needs work · 5 = went really well</Text>

      <TextInput
        maxLength={500}
        multiline
        onChangeText={setReflection}
        placeholder="One thing you'd change? (optional)"
        placeholderTextColor={AppTheme.colors.hint}
        style={sr.input}
        value={reflection}
      />

      <View style={sr.actions}>
        <Pressable
          accessibilityRole="button"
          disabled={saving !== null}
          onPress={() => void save(true)}
          style={sr.secondary}
        >
          {saving === 'skip' ? <ActivityIndicator color={AppTheme.colors.textSecondary} size="small" /> : null}
          <Text style={sr.secondaryText}>Skip</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={saving !== null || rated === 0}
          onPress={() => void save(false)}
          style={[sr.primary, (saving !== null || rated === 0) && sr.disabled]}
        >
          {saving === 'rate' ? <ActivityIndicator color={AppTheme.colors.white} size="small" /> : null}
          <Text style={sr.primaryText}>Show my report</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** The teacher's view beside the report's, after the reveal. Matches first; gaps framed as discoveries. */
export function SelfRatingComparison({ rating, breakdown }: {
  rating: SelfRating;
  breakdown: ScoreBreakdown | null | undefined;
}) {
  const rows = SELF_RATING_AREAS
    .filter((a) => rating.ratings[a.key] != null)
    .map((a) => {
      const mine = rating.ratings[a.key] as number;
      const theirs = reportAreaRating(breakdown, a.key);
      return { ...a, mine, theirs, match: theirs != null && Math.abs(mine - theirs) <= 1 };
    });
  if (rows.length === 0) return null;
  const matches = rows.filter((r) => r.match).length;

  return (
    <View style={sr.card}>
      <View style={sr.headRow}>
        <Ionicons color={AppTheme.colors.primary} name="git-compare-outline" size={18} />
        <Text style={sr.compareTitle}>Your view and the report</Text>
      </View>
      {matches > 0 ? (
        <Text style={sr.matchNote}>
          You spotted {matches === rows.length ? 'all of this' : `${matches} of ${rows.length}`} yourself 👏
        </Text>
      ) : null}
      {rows.map((r) => (
        <View key={r.key} style={sr.compareRow}>
          <Text style={sr.compareLabel}>{r.label}</Text>
          <Text style={sr.compareValue}>You {r.mine}/5</Text>
          <Text style={sr.compareValue}>Report {r.theirs ?? '—'}/5</Text>
          <Ionicons
            color={r.match ? AppTheme.colors.successText : AppTheme.colors.primary}
            name={r.match ? 'checkmark-circle' : 'search-outline'}
            size={16}
          />
        </View>
      ))}
      {rows.some((r) => !r.match) ? (
        <Text style={sr.gapNote}>
          Where the views differ, the details below show what the report heard. Worth a look.
        </Text>
      ) : null}
      {rating.reflection ? <Text style={sr.reflection}>Your note: “{rating.reflection}”</Text> : null}
    </View>
  );
}

const sr = StyleSheet.create({
  card: {
    padding: 24,
    borderRadius: AppTheme.radius.large,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    gap: 14,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '800', color: AppTheme.colors.textPrimary },
  subtitle: { fontSize: 14, lineHeight: 21, color: AppTheme.colors.textSecondary },
  area: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 },
  areaText: { flex: 1, minWidth: 160, gap: 2 },
  areaLabel: { fontSize: 15, fontWeight: '700', color: AppTheme.colors.textPrimary },
  areaHint: { fontSize: 12, color: AppTheme.colors.textSecondary },
  scale: { flexDirection: 'row', gap: 6 },
  dot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: AppTheme.colors.primary, borderColor: AppTheme.colors.primary },
  dotText: { fontSize: 14, fontWeight: '700', color: AppTheme.colors.textSecondary },
  dotTextOn: { color: AppTheme.colors.white },
  scaleHint: { fontSize: 12, color: AppTheme.colors.textSecondary },
  input: {
    minHeight: 64,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.background,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: AppTheme.colors.textPrimary,
    textAlignVertical: 'top',
  },
  actions: { flexDirection: 'row', gap: 12 },
  secondary: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  secondaryText: { fontSize: 15, fontWeight: '700', color: AppTheme.colors.textSecondary },
  primary: {
    flex: 2,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primary,
  },
  primaryText: { fontSize: 15, fontWeight: '800', color: AppTheme.colors.white },
  disabled: { opacity: 0.5 },
  compareTitle: { fontSize: 17, fontWeight: '800', color: AppTheme.colors.textPrimary },
  matchNote: { fontSize: 14, fontWeight: '700', color: AppTheme.colors.successText },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 },
  compareLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: AppTheme.colors.textPrimary },
  compareValue: { fontSize: 13, color: AppTheme.colors.textSecondary, minWidth: 64, textAlign: 'right' },
  gapNote: { fontSize: 13, lineHeight: 19, color: AppTheme.colors.textSecondary },
  reflection: { fontSize: 13, lineHeight: 19, color: AppTheme.colors.textPrimary, fontStyle: 'italic' },
});
