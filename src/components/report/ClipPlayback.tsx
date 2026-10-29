import { createContext, ReactNode, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { recordClipPlay } from '../../lib/api';
import { formatAudioTime } from '../../lib/audio';
import { AppTheme } from '../../theme/AppTheme';
import { TranscriptSegment } from '../../types/api';

/** A clip runs from this long before the cited moment... */
const LEAD_SECONDS = 10;
/** ...to this long after it. */
const TAIL_SECONDS = 20;

type ClipContextValue = {
  canPlay: boolean;
  openClip: (start: number, title?: string) => void;
};

const ClipContext = createContext<ClipContextValue>({ canPlay: false, openClip: () => {} });

/**
 * Lets any finding on the report open a short clip of the moment it cites.
 * Clips are private to the teacher, so they are only offered when canPlay
 * (the teacher's own report with a segmented transcript and audio).
 */
export function ClipProvider({ audioUrl, segments, canPlay, token, recordingId, children }: {
  audioUrl: string;
  segments: TranscriptSegment[] | null | undefined;
  canPlay: boolean;
  token: string | undefined;
  recordingId: number;
  children: ReactNode;
}) {
  const [clip, setClip] = useState<{ start: number; title?: string } | null>(null);
  const enabled = canPlay && !!audioUrl && !!segments?.length;

  const value = useMemo<ClipContextValue>(() => ({
    canPlay: enabled,
    openClip: (start, title) => {
      setClip({ start, title });
      if (token) void recordClipPlay(token, recordingId);
    },
  }), [enabled, token, recordingId]);

  return (
    <ClipContext.Provider value={value}>
      {children}
      {clip && enabled ? (
        <ClipSheet
          audioUrl={audioUrl}
          key={clip.start}
          moment={clip.start}
          onClose={() => setClip(null)}
          segments={segments ?? []}
          title={clip.title}
        />
      ) : null}
    </ClipContext.Provider>
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
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Ionicons color="#fff" name={status.playing ? 'pause' : 'play'} size={24} />
              )}
            </Pressable>
            <Text style={cs.time}>{formatAudioTime(Math.max(from, Math.min(now, to)))}</Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

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
  text: { fontSize: 12, fontWeight: '700', color: AppTheme.colors.primaryDark, fontVariant: ['tabular-nums'] },
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
});
