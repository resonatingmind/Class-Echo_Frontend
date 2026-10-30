import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { recordClipPlay, shareClip, unshareClip } from '../../lib/api';
import { formatAudioTime } from '../../lib/audio';
import { AppTheme } from '../../theme/AppTheme';
import { SharedClip, TranscriptSegment } from '../../types/api';

/** A clip runs from this long before the cited moment... */
const LEAD_SECONDS = 10;
/** ...to this long after it. */
const TAIL_SECONDS = 20;

type ClipContextValue = {
  /** Every cited moment can be played: the teacher's own report. */
  canPlay: boolean;
  /** onClose runs when the clip sheet is dismissed, e.g. to bring back the sheet that opened it. */
  openClip: (start: number, title?: string, onClose?: () => void) => void;
  /** Moments the teacher chose to show their school admin. */
  sharedClips: SharedClip[];
  /** Clips that can be opened at all: every moment for the teacher, shared ones for the admin. */
  canOpenShared: boolean;
  /** The teacher can share and unshare moments. */
  canShare: boolean;
  shareBusy: boolean;
  share: (start: number, title: string) => void;
  unshare: (clip: SharedClip) => void;
};

const ClipContext = createContext<ClipContextValue>({
  canPlay: false,
  openClip: () => {},
  sharedClips: [],
  canOpenShared: false,
  canShare: false,
  shareBusy: false,
  share: () => {},
  unshare: () => {},
});

/**
 * Lets any finding on the report open a short clip of the moment it cites.
 * Clips are private to the teacher, so they are only offered when canPlay
 * (the teacher's own report with a segmented transcript and audio). The
 * teacher can share single moments; anyone else can play only those.
 */
export function ClipProvider({ audioUrl, segments, canPlay, token, recordingId, sharedClips: initialShared, children }: {
  audioUrl: string;
  segments: TranscriptSegment[] | null | undefined;
  canPlay: boolean;
  token: string | undefined;
  recordingId: number;
  sharedClips: SharedClip[] | null | undefined;
  children: ReactNode;
}) {
  const [clip, setClip] = useState<{ start: number; title?: string; onClose?: () => void } | null>(null);
  const [sharedClips, setSharedClips] = useState<SharedClip[]>(initialShared ?? []);
  const [shareBusy, setShareBusy] = useState(false);
  const playable = !!audioUrl && !!segments?.length;
  const enabled = canPlay && playable;
  const canOpenShared = playable && (canPlay || sharedClips.length > 0);

  // A refetch of the report brings fresh shared clips; adopt them unless a save is in flight.
  const [lastInitial, setLastInitial] = useState(initialShared);
  if (initialShared !== lastInitial) {
    setLastInitial(initialShared);
    if (!shareBusy && initialShared) setSharedClips(initialShared);
  }

  const value = useMemo<ClipContextValue>(() => {
    const save = async (call: () => Promise<SharedClip[]>) => {
      setShareBusy(true);
      try {
        setSharedClips(await call());
      } catch (e) {
        Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
      } finally {
        setShareBusy(false);
      }
    };
    return {
      canPlay: enabled,
      openClip: (start, title, onClose) => {
        setClip({ start, title, onClose });
        // Only the teacher's own plays count towards the clip-usage metric.
        if (token && enabled) void recordClipPlay(token, recordingId);
      },
      sharedClips,
      canOpenShared,
      canShare: enabled && !!token,
      shareBusy,
      share: (start, title) => {
        if (token) void save(() => shareClip(token, recordingId, { start, title }));
      },
      unshare: (c) => {
        if (token) void save(() => unshareClip(token, recordingId, c.id));
      },
    };
  }, [enabled, canOpenShared, token, recordingId, sharedClips, shareBusy]);

  return (
    <ClipContext.Provider value={value}>
      {children}
      {clip && canOpenShared ? (
        <ClipSheet
          audioUrl={audioUrl}
          key={clip.start}
          moment={clip.start}
          onClose={() => { setClip(null); clip.onClose?.(); }}
          segments={segments ?? []}
          title={clip.title}
        />
      ) : null}
    </ClipContext.Provider>
  );
}

/** The clip shared at this moment, if any. Shared starts are rounded to the hundredth by the server. */
function sharedAt(clips: SharedClip[], start: number): SharedClip | undefined {
  return clips.find((c) => Math.abs(c.start - start) < 0.01);
}

/**
 * Moments the teacher shared, at the top of the report. The teacher sees
 * what their admin can see and can stop sharing; the admin plays them.
 */
export function SharedClipsCard() {
  const { sharedClips, canOpenShared, canShare, shareBusy, openClip, unshare } = useClips();
  if (!canOpenShared || sharedClips.length === 0) return null;
  return (
    <View style={sc.card}>
      <View style={sc.heading}>
        <Ionicons color={AppTheme.colors.primaryDark} name="share-social-outline" size={18} />
        <Text style={sc.title}>{canShare ? 'Shared with your admin' : 'Shared by the teacher'}</Text>
      </View>
      {sharedClips.map((c) => (
        <View key={c.id} style={sc.row}>
          <Pressable
            accessibilityLabel={`Play ${c.title} at ${formatAudioTime(c.start)}`}
            accessibilityRole="button"
            onPress={() => openClip(c.start, c.title)}
            style={sc.play}
          >
            <Ionicons color={AppTheme.colors.primaryDark} name="play" size={14} />
            <Text style={sc.time}>{formatAudioTime(c.start)}</Text>
            <Text numberOfLines={1} style={sc.clipTitle}>{c.title}</Text>
          </Pressable>
          {canShare ? (
            <Pressable
              accessibilityLabel={`Stop sharing ${c.title}`}
              accessibilityRole="button"
              disabled={shareBusy}
              onPress={() => unshare(c)}
              style={sc.unshare}
            >
              <Text style={sc.unshareText}>Stop sharing</Text>
            </Pressable>
          ) : null}
        </View>
      ))}
      {canShare ? <Text style={sc.hint}>Your admin sees only these moments, not your other clips.</Text> : null}
    </View>
  );
}

export function useClips() {
  return useContext(ClipContext);
}

/** ▶ 12:40 — opens the clip for a cited moment. Renders nothing when clips are unavailable. */
export function ClipChip({ start, title }: { start: number | null | undefined; title?: string }) {
  const { canPlay, openClip } = useClips();
  if (!canPlay || start == null) return null;
  return (
    <Pressable
      accessibilityLabel={`Play the moment at ${formatAudioTime(start)}`}
      accessibilityRole="button"
      hitSlop={8}
      onPress={() => openClip(start, title)}
      style={chip.wrap}
    >
      <Ionicons color={AppTheme.colors.primaryDark} name="play" size={11} />
      <Text style={chip.text}>{formatAudioTime(start)}</Text>
    </Pressable>
  );
}

function ClipSheet({ audioUrl, moment, segments, title, onClose }: {
  audioUrl: string;
  moment: number;
  segments: TranscriptSegment[];
  title?: string;
  onClose: () => void;
}) {
  const player = useAudioPlayer(audioUrl, { updateInterval: 200 });
  const status = useAudioPlayerStatus(player);
  const from = Math.max(0, moment - LEAD_SECONDS);
  const to = moment + TAIL_SECONDS;
  const started = useRef(false);

  // Start at the clip once the audio has loaded, then stop at its end.
  useEffect(() => {
    if (!status.isLoaded || started.current) return;
    started.current = true;
    void player.seekTo(from).then(() => player.play());
  }, [status.isLoaded, from, player]);

  useEffect(() => {
    if (status.playing && status.currentTime >= to) player.pause();
  }, [status.playing, status.currentTime, to, player]);

  const lines = segments.filter((s) => s.end >= from && s.start <= to);
  const now = status.currentTime;
  const loading = !status.isLoaded || status.isBuffering;

  const replay = () => {
    void player.seekTo(from).then(() => player.play());
  };
  const toggle = () => {
    if (status.playing) { player.pause(); return; }
    if (now >= to || now < from) { replay(); return; }
    player.play();
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible>
      <Pressable onPress={onClose} style={cs.overlay}>
        <Pressable style={cs.sheet}>
          <View style={cs.handle} />
          <View style={cs.header}>
            <View style={cs.headerBody}>
              <Text style={cs.title}>{title ?? 'The moment'}</Text>
              <Text style={cs.meta}>
                {formatAudioTime(from)} – {formatAudioTime(to)}
              </Text>
            </View>
            <Pressable accessibilityLabel="Close clip" accessibilityRole="button" onPress={onClose} style={cs.iconBtn}>
              <Ionicons color={AppTheme.colors.textPrimary} name="close" size={22} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={cs.lines} style={cs.linesBox}>
            {lines.map((s) => {
              const active = now >= s.start && now < Math.max(s.end, s.start + 0.5);
              const cited = moment >= s.start && moment <= Math.max(s.end, s.start);
              return (
                <View key={s.id} style={[cs.line, cited && cs.lineCited, active && cs.lineActive]}>
                  <Text style={cs.lineMeta}>
                    {formatAudioTime(s.start)} · {s.speaker === 'teacher' ? 'You' : 'Student'}
                  </Text>
                  <Text style={[cs.lineText, s.speaker === 'student' && cs.lineStudent]}>{s.text}</Text>
                </View>
              );
            })}
          </ScrollView>

          <View style={cs.controls}>
            <Pressable accessibilityLabel="Replay clip" accessibilityRole="button" onPress={replay} style={cs.iconBtn}>
              <Ionicons color={AppTheme.colors.textPrimary} name="refresh" size={22} />
            </Pressable>
            <Pressable
              accessibilityLabel={status.playing ? 'Pause' : 'Play'}
              accessibilityRole="button"
              onPress={toggle}
              style={cs.play}
            >
              {loading ? (
                <ActivityIndicator color={AppTheme.colors.white} size="small" />
              ) : (
                <Ionicons color={AppTheme.colors.white} name={status.playing ? 'pause' : 'play'} size={24} />
              )}
            </Pressable>
            <Text style={cs.time}>{formatAudioTime(Math.max(from, Math.min(now, to)))}</Text>
          </View>

          <ShareRow moment={moment} title={title ?? 'The moment'} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Share this moment with the school admin, or stop sharing it. Teacher only. */
function ShareRow({ moment, title }: { moment: number; title: string }) {
  const { canShare, sharedClips, shareBusy, share, unshare } = useClips();
  if (!canShare) return null;
  const shared = sharedAt(sharedClips, moment);
  return (
    <View style={cs.shareRow}>
      <Text style={cs.shareText}>
        {shared ? 'Your admin can play this moment.' : 'Only you can hear this clip.'}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={shareBusy}
        onPress={() => (shared ? unshare(shared) : share(moment, title))}
        style={[cs.shareBtn, shared && cs.shareBtnOn, shareBusy && cs.disabled]}
      >
        {shareBusy ? (
          <ActivityIndicator color={AppTheme.colors.primaryDark} size="small" />
        ) : (
          <Ionicons
            color={AppTheme.colors.primaryDark}
            name={shared ? 'checkmark' : 'share-social-outline'}
            size={16}
          />
        )}
        <Text style={cs.shareBtnText}>{shared ? 'Shared · Stop' : 'Share with admin'}</Text>
      </Pressable>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    padding: 16,
    gap: 10,
    borderRadius: AppTheme.radius.large,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 17, fontWeight: '800', color: AppTheme.colors.textPrimary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  play: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primaryLight,
  },
  time: { fontSize: 13, fontWeight: '700', color: AppTheme.colors.primaryText, fontVariant: ['tabular-nums'] },
  clipTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: AppTheme.colors.textPrimary },
  unshare: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  unshareText: { fontSize: 13, fontWeight: '700', color: AppTheme.colors.textSecondary },
  hint: { fontSize: 12, color: AppTheme.colors.textSecondary },
});

const chip = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: AppTheme.colors.primaryLight,
  },
  text: { fontSize: 12, fontWeight: '700', color: AppTheme.colors.primaryText, fontVariant: ['tabular-nums'] },
});

const cs = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(26, 28, 28, 0.32)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: AppTheme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
    width: '100%',
    maxWidth: 800,
    maxHeight: '80%',
    alignSelf: 'center',
  },
  handle: { alignSelf: 'center', width: 42, height: 4, borderRadius: 999, backgroundColor: AppTheme.colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBody: { flex: 1, gap: 2 },
  title: { fontSize: 18, fontWeight: '800', color: AppTheme.colors.textPrimary },
  meta: { fontSize: 13, color: AppTheme.colors.textSecondary },
  linesBox: { flexGrow: 0 },
  lines: { gap: 6 },
  line: { padding: 10, borderRadius: AppTheme.radius.medium, gap: 2 },
  lineCited: { backgroundColor: AppTheme.colors.background },
  lineActive: { backgroundColor: AppTheme.colors.primaryLight },
  lineMeta: { fontSize: 11, fontWeight: '700', color: AppTheme.colors.textSecondary },
  lineText: { fontSize: 15, lineHeight: 22, color: AppTheme.colors.textPrimary },
  lineStudent: { fontStyle: 'italic' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  play: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: AppTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  time: { minWidth: 44, fontSize: 13, fontWeight: '600', color: AppTheme.colors.textSecondary },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: AppTheme.colors.border,
  },
  shareText: { flex: 1, fontSize: 13, color: AppTheme.colors.textSecondary },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppTheme.colors.primary,
  },
  shareBtnOn: { backgroundColor: AppTheme.colors.primaryLight },
  shareBtnText: { fontSize: 14, fontWeight: '700', color: AppTheme.colors.primaryText },
  disabled: { opacity: 0.55 },
});
