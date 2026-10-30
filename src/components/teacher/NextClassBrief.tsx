import { ReactNode, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { getClassBrief, markClassBriefOpened, setClassBriefMuted } from '../../lib/api';
import { todayIsoDate } from '../../lib/lectureContext';
import { AppTheme } from '../../theme/AppTheme';
import { NextClassBriefOut } from '../../types/api';

type Props = {
  token: string;
  entryId: number;
  /** Starts folded behind a toggle, for a class already under way where Record comes first. */
  collapsed?: boolean;
};

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function Bullets({ items, numbered = false }: { items: string[]; numbered?: boolean }) {
  return (
    <View style={styles.bullets}>
      {items.map((item, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={styles.bulletMark}>{numbered ? `${i + 1}.` : '•'}</Text>
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function Section({ icon, title, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Ionicons name={icon} size={14} color={AppTheme.colors.textSecondary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

/**
 * The recap before a timetabled class: what was covered last time, what was left
 * unfinished, today's planner lecture, questions to open with and the teacher's
 * current focus. Everything comes from earlier analysis, so it loads instantly.
 */
export function NextClassBrief({ token, entryId, collapsed = false }: Props) {
  const [brief, setBrief] = useState<NextClassBriefOut | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(!collapsed);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    setBrief(null);
    setFailed(false);
    getClassBrief(token, entryId, todayIsoDate())
      .then((b) => live && setBrief(b))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [token, entryId]);

  // Seeing the brief open is what counts as an open (the brief open-rate metric).
  const seen = !!brief && !brief.muted && open;
  useEffect(() => {
    if (seen) void markClassBriefOpened(token, entryId, todayIsoDate());
  }, [seen, token, entryId]);

  const setMuted = async (muted: boolean) => {
    setSaving(true);
    try {
      setBrief(await setClassBriefMuted(token, entryId, muted));
    } catch {
      // Leave the brief as it was; the teacher can tap again.
    } finally {
      setSaving(false);
    }
  };

  // The brief is extra help: if it can't load, the card simply goes without it.
  if (failed) return null;
  if (!brief) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="small" color={AppTheme.colors.hint} />
      </View>
    );
  }

  if (brief.muted) {
    return (
      <View style={styles.mutedRow}>
        <Text style={styles.mutedText}>Recap is off for this class</Text>
        <Pressable
          accessibilityRole="button"
          disabled={saving}
          hitSlop={8}
          onPress={() => void setMuted(false)}
        >
          <Text style={styles.link}>Turn on</Text>
        </Pressable>
      </View>
    );
  }

  const { last_lesson: last, todays_plan: plan, focus } = brief;

  if (!open) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: false }}
        onPress={() => setOpen(true)}
        style={styles.toggle}
      >
        <Ionicons name="reader-outline" size={16} color={AppTheme.colors.primaryDark} />
        <Text style={styles.toggleText}>Recap for this class</Text>
        <Ionicons name="chevron-down" size={16} color={AppTheme.colors.primaryDark} />
      </Pressable>
    );
  }

  return (
    <View style={styles.wrap}>
      {last ? (
        <>
          <Section icon="time-outline" title={`Last time · ${shortDate(last.recorded_at)}`}>
            {last.by_other_teacher ? (
              <Text style={styles.note}>Taught by the class's regular teacher</Text>
            ) : null}
            {last.covered.length ? <Bullets items={last.covered} /> : null}
          </Section>
          {last.unfinished.length ? (
            <Section icon="alert-circle-outline" title="Left unfinished">
              <Bullets items={last.unfinished} />
            </Section>
          ) : null}
        </>
      ) : (
        <Text style={styles.note}>
          No recording of this class yet. Record today to get a recap next time.
        </Text>
      )}

      {plan ? (
        <Section icon="calendar-outline" title="Today's plan">
          <Text style={styles.planTitle}>{plan.sub_topic}</Text>
          {plan.topic_name && plan.topic_name !== plan.sub_topic ? (
            <Text style={styles.planSub}>{plan.topic_name}</Text>
          ) : null}
        </Section>
      ) : null}

      {last?.recall_questions.length ? (
        <Section icon="chatbubbles-outline" title="Open with">
          <Bullets items={last.recall_questions} numbered />
        </Section>
      ) : null}

      {focus ? (
        <View style={styles.focus}>
          <Text style={styles.focusLabel}>YOUR FOCUS TODAY</Text>
          <Text style={styles.focusText}>{focus.try_this}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        {collapsed ? (
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setOpen(false)}>
            <Text style={styles.link}>Hide recap</Text>
          </Pressable>
        ) : <View />}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Turn off the recap for this class"
          disabled={saving}
          hitSlop={8}
          onPress={() => void setMuted(true)}
        >
          <Text style={styles.footerMuted}>Turn off for this class</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: AppTheme.spacing.m, alignItems: 'flex-start' },
  wrap: {
    marginTop: AppTheme.spacing.m,
    paddingTop: AppTheme.spacing.m,
    borderTopWidth: 1,
    borderTopColor: AppTheme.colors.divider,
    gap: AppTheme.spacing.m,
  },
  section: { gap: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
    color: AppTheme.colors.textSecondary,
  },
  bullets: { gap: 3 },
  bulletRow: { flexDirection: 'row', gap: 6 },
  bulletMark: { width: 14, fontSize: 14, lineHeight: 20, color: AppTheme.colors.textSecondary },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 20, color: AppTheme.colors.textPrimary },
  note: { fontSize: 13, lineHeight: 18, color: AppTheme.colors.textSecondary },
  planTitle: { fontSize: 15, fontWeight: '700', color: AppTheme.colors.textPrimary },
  planSub: { fontSize: 13, color: AppTheme.colors.textSecondary },
  focus: {
    backgroundColor: AppTheme.colors.primaryLight,
    borderRadius: AppTheme.radius.medium,
    padding: AppTheme.spacing.m,
    gap: 4,
  },
  focusLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8, color: AppTheme.colors.primaryText },
  focusText: { fontSize: 14, lineHeight: 20, color: AppTheme.colors.textPrimary },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 },
  footerMuted: { fontSize: 12, fontWeight: '600', color: AppTheme.colors.textSecondary },
  link: { fontSize: 13, fontWeight: '700', color: AppTheme.colors.primaryText },
  mutedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: AppTheme.spacing.s,
    minHeight: 32,
  },
  mutedText: { fontSize: 13, color: AppTheme.colors.textSecondary },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: AppTheme.spacing.s,
    minHeight: 44,
  },
  toggleText: { fontSize: 14, fontWeight: '700', color: AppTheme.colors.primaryText },
});
