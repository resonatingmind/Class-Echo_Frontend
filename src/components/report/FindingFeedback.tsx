import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { deleteReportFeedback, putReportFeedback } from '../../lib/api';
import { formatAudioTime } from '../../lib/audio';
import { FEEDBACK_REASONS, findFeedback, reasonLabel } from '../../lib/reportFindings';
import { AppTheme } from '../../theme/AppTheme';
import { FeedbackReason, FeedbackTarget, ReportFeedback } from '../../types/api';
import { useClips } from './ClipPlayback';

const AGREE_COLOR = AppTheme.colors.successText;
const DISAGREE_COLOR = AppTheme.colors.dangerText;

/** The moment a finding cites, so the disagree sheet can play it back. */
export type FindingMoment = { start: number; title: string };

type Target = { type: FeedbackTarget; key: string; moment?: FindingMoment | null };

type FeedbackContextValue = {
  feedback: ReportFeedback[];
  /** Only the teacher who owns the report can give feedback; everyone else sees it read-only. */
  canEdit: boolean;
  busyKey: string | null;
  agree: (target: Target) => void;
  disagree: (target: Target) => void;
  undo: (target: Target) => void;
  editReasons: (target: Target) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const targetId = (t: Target) => `${t.type}:${t.key}`;

/**
 * Holds the report's 👍/👎 state and the disagree sheet. A 👎 is saved the
 * moment it is tapped, so the teacher's view is recorded even if they close
 * the sheet without picking reasons.
 */
export function FindingFeedbackProvider({ token, recordingId, initial, canEdit, children }: {
  token: string | undefined;
  recordingId: number;
  initial: ReportFeedback[] | null | undefined;
  canEdit: boolean;
  children: ReactNode;
}) {
  const [feedback, setFeedback] = useState<ReportFeedback[]>(initial ?? []);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [sheetTarget, setSheetTarget] = useState<Target | null>(null);
  // The sheet hides while its clip plays and comes back with the choices intact.
  const [sheetHidden, setSheetHidden] = useState(false);
  const { canPlay, openClip } = useClips();

  // A refetch of the report brings fresh feedback; adopt it unless a save is in flight.
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    if (!busyKey && initial) setFeedback(initial);
  }

  const save = useCallback(
    async (target: Target, call: () => Promise<ReportFeedback[]>) => {
      setBusyKey(targetId(target));
      try {
        setFeedback(await call());
        return true;
      } catch (e) {
        Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
        return false;
      } finally {
        setBusyKey(null);
      }
    },
    [],
  );

  const value = useMemo<FeedbackContextValue>(() => ({
    feedback,
    canEdit: canEdit && !!token,
    busyKey,
    agree: (target) => {
      if (!token) return;
      void save(target, () =>
        putReportFeedback(token, recordingId, { target_type: target.type, target_key: target.key, verdict: 'agree' }));
    },
    disagree: (target) => {
      if (!token) return;
      void save(target, () =>
        putReportFeedback(token, recordingId, { target_type: target.type, target_key: target.key, verdict: 'disagree' }),
      ).then((ok) => ok && setSheetTarget(target));
    },
    undo: (target) => {
      if (!token) return;
      void save(target, () => deleteReportFeedback(token, recordingId, target.type, target.key));
    },
    editReasons: (target) => setSheetTarget(target),
  }), [feedback, canEdit, token, busyKey, save, recordingId]);

  const current = sheetTarget ? findFeedback(feedback, sheetTarget.type, sheetTarget.key) : undefined;

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {sheetTarget ? (
        <DisagreeSheet
          initialComment={current?.comment ?? ''}
          initialReasons={current?.reasons ?? []}
          hidden={sheetHidden}
          key={targetId(sheetTarget)}
          moment={canPlay ? sheetTarget.moment : null}
          onClose={() => setSheetTarget(null)}
          onShowMoment={(m) => {
            setSheetHidden(true);
            openClip(m.start, m.title, () => setSheetHidden(false));
          }}
          onSave={async (reasons, comment) => {
            if (!token) return;
            const ok = await save(sheetTarget, () =>
              putReportFeedback(token, recordingId, {
                target_type: sheetTarget.type,
                target_key: sheetTarget.key,
                verdict: 'disagree',
                reasons,
                comment: comment.trim() || null,
              }));
            if (ok) setSheetTarget(null);
          }}
          saving={busyKey === targetId(sheetTarget)}
        />
      ) : null}
    </FeedbackContext.Provider>
  );
}

/**
 * 👍 / 👎 for one finding, placed to the right of its text. Read-only viewers
 * (school admins) see only a "Teacher disagreed" note.
 */
export function FeedbackButtons({ type, targetKey, moment }: {
  type: FeedbackTarget;
  targetKey: string;
  /** Offered as Show me the moment in the disagree sheet. */
  moment?: FindingMoment | null;
}) {
  const ctx = useContext(FeedbackContext);
  if (!ctx || !ctx.canEdit) return null;
  const target = { type, key: targetKey, moment };
  const entry = findFeedback(ctx.feedback, type, targetKey);
  const busy = ctx.busyKey === targetId(target);

  if (busy) {
    return (
      <View style={fb.buttons}>
        <View style={fb.button}><ActivityIndicator color={AppTheme.colors.textSecondary} size="small" /></View>
      </View>
    );
  }

  return (
    <View style={fb.buttons}>
      <Pressable
        accessibilityLabel={entry?.verdict === 'agree' ? 'Remove: this was useful' : 'This was useful'}
        accessibilityRole="button"
        accessibilityState={{ selected: entry?.verdict === 'agree' }}
        hitSlop={4}
        onPress={() => (entry?.verdict === 'agree' ? ctx.undo(target) : ctx.agree(target))}
        style={fb.button}
      >
        <Ionicons
          color={entry?.verdict === 'agree' ? AGREE_COLOR : AppTheme.colors.hint}
          name={entry?.verdict === 'agree' ? 'thumbs-up' : 'thumbs-up-outline'}
          size={18}
        />
      </Pressable>
      <Pressable
        accessibilityLabel={entry?.verdict === 'disagree' ? 'Remove disagreement' : 'I disagree'}
        accessibilityRole="button"
        accessibilityState={{ selected: entry?.verdict === 'disagree' }}
        hitSlop={4}
        onPress={() => (entry?.verdict === 'disagree' ? ctx.undo(target) : ctx.disagree(target))}
        style={fb.button}
      >
        <Ionicons
          color={entry?.verdict === 'disagree' ? DISAGREE_COLOR : AppTheme.colors.hint}
          name={entry?.verdict === 'disagree' ? 'thumbs-down' : 'thumbs-down-outline'}
          size={18}
        />
      </Pressable>
    </View>
  );
}

/** The report's live feedback, and whether the viewer may change it; null outside the provider. */
export function useReportFeedback(): { feedback: ReportFeedback[]; canEdit: boolean } | null {
  const ctx = useContext(FeedbackContext);
  return ctx ? { feedback: ctx.feedback, canEdit: ctx.canEdit } : null;
}

/** The disagreement under a finding: reasons and comment, shown to the teacher and to admins. */
export function DisagreementNote({ type, targetKey, moment }: {
  type: FeedbackTarget;
  targetKey: string;
  moment?: FindingMoment | null;
}) {
  const ctx = useContext(FeedbackContext);
  const entry = ctx ? findFeedback(ctx.feedback, type, targetKey) : undefined;
  if (!ctx || entry?.verdict !== 'disagree') return null;
  const reasons = entry.reasons.map(reasonLabel).join(' · ');

  return (
    <View style={fb.note}>
      <Ionicons color={DISAGREE_COLOR} name="chatbubble-ellipses-outline" size={14} style={fb.noteIcon} />
      <View style={fb.noteBody}>
        <Text style={fb.noteTitle}>{ctx.canEdit ? 'You disagreed' : 'Teacher disagreed'}</Text>
        {reasons ? <Text style={fb.noteText}>{reasons}</Text> : null}
        {entry.comment ? <Text style={fb.noteText}>“{entry.comment}”</Text> : null}
        {ctx.canEdit ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => ctx.editReasons({ type, key: targetKey, moment })}
            style={fb.noteLink}
          >
            <Text style={fb.noteLinkText}>{reasons || entry.comment ? 'Edit reason' : 'Add a reason'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function DisagreeSheet({ initialReasons, initialComment, saving, hidden, moment, onSave, onShowMoment, onClose }: {
  initialReasons: FeedbackReason[];
  initialComment: string;
  saving: boolean;
  hidden: boolean;
  moment: FindingMoment | null | undefined;
  onSave: (reasons: FeedbackReason[], comment: string) => void;
  onShowMoment: (moment: FindingMoment) => void;
  onClose: () => void;
}) {
  const [reasons, setReasons] = useState<FeedbackReason[]>(initialReasons);
  const [comment, setComment] = useState(initialComment);
  const toggle = (r: FeedbackReason) =>
    setReasons((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={!hidden}>
      <Pressable onPress={onClose} style={ds.overlay}>
        <Pressable style={ds.sheet}>
          <View style={ds.handle} />
          <Text style={ds.title}>What doesn't fit?</Text>
          <Text style={ds.subtitle}>
            Optional. Your score won't change. Your view is saved with this report and shown to your school admin
            next to the finding.
          </Text>
          {moment ? (
            <Pressable
              accessibilityLabel={`Show me the moment at ${formatAudioTime(moment.start)}`}
              accessibilityRole="button"
              onPress={() => onShowMoment(moment)}
              style={ds.moment}
            >
              <Ionicons color={AppTheme.colors.primaryDark} name="play-circle-outline" size={20} />
              <Text style={ds.momentText}>Show me the moment</Text>
              <Text style={ds.momentTime}>{formatAudioTime(moment.start)}</Text>
            </Pressable>
          ) : null}
          <View style={ds.chips}>
            {FEEDBACK_REASONS.map((r) => {
              const on = reasons.includes(r.key);
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  key={r.key}
                  onPress={() => toggle(r.key)}
                  style={[ds.chip, on && ds.chipOn]}
                >
                  {on ? <Ionicons color={AppTheme.colors.primaryDark} name="checkmark" size={14} /> : null}
                  <Text style={[ds.chipText, on && ds.chipTextOn]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <TextInput
            maxLength={1000}
            multiline
            onChangeText={setComment}
            placeholder="Anything else? (optional)"
            placeholderTextColor={AppTheme.colors.hint}
            style={ds.input}
            value={comment}
          />
          <View style={ds.actions}>
            <Pressable accessibilityRole="button" onPress={onClose} style={ds.secondary}>
              <Text style={ds.secondaryText}>Skip</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={saving}
              onPress={() => onSave(reasons, comment)}
              style={[ds.primary, saving && ds.disabled]}
            >
              {saving ? <ActivityIndicator color={AppTheme.colors.white} size="small" /> : null}
              <Text style={ds.primaryText}>Save</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const fb = StyleSheet.create({
  buttons: { flexDirection: 'row', alignItems: 'center', marginTop: -10, marginRight: -10 },
  button: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  note: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.dangerBg,
  },
  noteIcon: { marginTop: 2 },
  noteBody: { flex: 1, gap: 2 },
  noteTitle: { fontSize: 12, fontWeight: '800', color: DISAGREE_COLOR },
  noteText: { fontSize: 13, lineHeight: 18, color: AppTheme.colors.textPrimary },
  noteLink: { minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' },
  noteLinkText: { fontSize: 13, fontWeight: '700', color: AppTheme.colors.primaryText },
});

const ds = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(26, 28, 28, 0.32)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: AppTheme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 14,
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
  },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 999, backgroundColor: AppTheme.colors.border },
  title: { fontSize: 20, fontWeight: '800', color: AppTheme.colors.textPrimary },
  subtitle: { fontSize: 14, lineHeight: 20, color: AppTheme.colors.textSecondary },
  moment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primaryLight,
  },
  momentText: { flex: 1, fontSize: 14, fontWeight: '700', color: AppTheme.colors.primaryText },
  momentTime: { fontSize: 13, fontWeight: '700', color: AppTheme.colors.primaryText, fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
  },
  chipOn: { borderColor: AppTheme.colors.primary, backgroundColor: AppTheme.colors.primaryLight },
  chipText: { fontSize: 13, fontWeight: '600', color: AppTheme.colors.textPrimary },
  chipTextOn: { color: AppTheme.colors.primaryText },
  input: {
    minHeight: 72,
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
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  secondaryText: { fontSize: 15, fontWeight: '700', color: AppTheme.colors.textSecondary },
  primary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primary,
  },
  primaryText: { fontSize: 15, fontWeight: '800', color: AppTheme.colors.white },
  disabled: { opacity: 0.55 },
});
