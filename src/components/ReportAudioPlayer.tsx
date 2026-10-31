import { useEffect, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { ActivityIndicator, GestureResponderEvent, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatAudioTime } from '../lib/audio';
import { AppTheme } from '../theme/AppTheme';

const SPEEDS = [1, 1.5, 2] as const;
const SKIP_SECONDS = 10;

type Props = {
  audioUrl: string;
  /** Shown until the player has loaded the real duration. */
  fallbackDuration?: number | null;
};

/** Plain scrubbable player for a lecture recording: seek bar, ±10 s skips and speed. */
export function ReportAudioPlayer({ audioUrl, fallbackDuration }: Props) {
  const player = useAudioPlayer(audioUrl, { updateInterval: 200 });
  const status = useAudioPlayerStatus(player);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);

  // Track geometry for tap/drag seeking. dragRatio is set while the finger is down.
  const trackRef = useRef<View>(null);
  const trackLeft = useRef(0);
  const trackWidth = useRef(0);
  const [dragRatio, setDragRatio] = useState<number | null>(null);

  useEffect(() => {
    void setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
  }, []);

  useEffect(() => {
    if (!audioUrl) return;
    try {
      player.replace(audioUrl);
    } catch {
      // ignore
    }
  }, [audioUrl, player]);

  // A new source resets the rate, so re-apply it once loaded. 'high' keeps the
  // voice at its normal pitch: on web anything else turns pitch correction off.
  useEffect(() => {
    if (status.isLoaded) player.setPlaybackRate(speed, 'high');
  }, [status.isLoaded, speed, player]);

  const duration = status.duration > 0 ? status.duration : fallbackDuration ?? 0;
  const ratio =
    dragRatio ?? (status.duration > 0 ? Math.min(1, status.currentTime / status.duration) : 0);
  const shownTime = dragRatio != null ? dragRatio * duration : status.currentTime;
  const loading = !status.isLoaded || status.isBuffering;

  const seekTo = (seconds: number) => {
    if (status.duration <= 0) return;
    void player.seekTo(Math.max(0, Math.min(status.duration, seconds)));
  };

  const handleTogglePlay = () => {
    if (status.playing) { player.pause(); return; }
    if (status.duration > 0 && status.currentTime >= status.duration - 0.2) {
      void player.seekTo(0);
    }
    player.play();
  };

  const ratioFromEvent = (e: GestureResponderEvent) => {
    if (trackWidth.current <= 0) return 0;
    return Math.max(0, Math.min(1, (e.nativeEvent.pageX - trackLeft.current) / trackWidth.current));
  };

  const measureTrack = () => {
    trackRef.current?.measureInWindow((x, _y, width) => {
      trackLeft.current = x;
      trackWidth.current = width;
    });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.controlsRow}>
        <Pressable
          accessibilityLabel={`Back ${SKIP_SECONDS} seconds`}
          accessibilityRole="button"
          disabled={loading}
          onPress={() => seekTo(status.currentTime - SKIP_SECONDS)}
          style={styles.skipBtn}
        >
          <Ionicons color={AppTheme.colors.textPrimary} name="play-back-outline" size={20} />
          <Text style={styles.skipText}>{SKIP_SECONDS}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={status.playing ? 'Pause' : 'Play'}
          accessibilityRole="button"
          onPress={handleTogglePlay}
          style={styles.playBtn}
        >
          {loading ? (
            <ActivityIndicator color={AppTheme.colors.white} size="small" />
          ) : (
            <Ionicons color={AppTheme.colors.white} name={status.playing ? 'pause' : 'play'} size={26} />
          )}
        </Pressable>
        <Pressable
          accessibilityLabel={`Forward ${SKIP_SECONDS} seconds`}
          accessibilityRole="button"
          disabled={loading}
          onPress={() => seekTo(status.currentTime + SKIP_SECONDS)}
          style={styles.skipBtn}
        >
          <Ionicons color={AppTheme.colors.textPrimary} name="play-forward-outline" size={20} />
          <Text style={styles.skipText}>{SKIP_SECONDS}</Text>
        </Pressable>
      </View>

      <View
        accessibilityLabel="Seek"
        accessibilityRole="adjustable"
        onLayout={measureTrack}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => {
          measureTrack();
          setDragRatio(ratioFromEvent(e));
        }}
        onResponderMove={(e) => setDragRatio(ratioFromEvent(e))}
        onResponderRelease={(e) => {
          seekTo(ratioFromEvent(e) * status.duration);
          setDragRatio(null);
        }}
        onResponderTerminate={() => setDragRatio(null)}
        onStartShouldSetResponder={() => true}
        ref={trackRef}
        style={styles.trackHitArea}
      >
        <View style={styles.track}>
          <View style={[styles.trackFill, { width: `${ratio * 100}%` }]} />
        </View>
        <View style={[styles.thumb, { left: `${ratio * 100}%` }]} />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.time}>{formatAudioTime(shownTime)}</Text>
        <View style={styles.speedRow}>
          {SPEEDS.map((s) => (
            <Pressable
              accessibilityLabel={`Playback speed ${s}x`}
              accessibilityRole="button"
              accessibilityState={{ selected: s === speed }}
              key={s}
              onPress={() => setSpeed(s)}
              style={[styles.speedChip, s === speed && styles.speedChipActive]}
            >
              <Text style={[styles.speedText, s === speed && styles.speedTextActive]}>{s}×</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.time, styles.timeEnd]}>{formatAudioTime(duration)}</Text>
      </View>
    </View>
  );
}

const THUMB = 16;

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    minWidth: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: { fontSize: 10, fontWeight: '700', color: AppTheme.colors.textSecondary, marginTop: -2 },
  trackHitArea: { height: 32, justifyContent: 'center' },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: AppTheme.colors.border,
    overflow: 'hidden',
  },
  trackFill: { height: 6, backgroundColor: AppTheme.colors.primary },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    marginLeft: -THUMB / 2,
    backgroundColor: AppTheme.colors.primary,
    borderWidth: 2,
    borderColor: AppTheme.colors.white,
  },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  time: { fontSize: 12, fontWeight: '600', color: AppTheme.colors.textSecondary, minWidth: 44 },
  timeEnd: { textAlign: 'right' },
  speedRow: { flexDirection: 'row', gap: 6 },
  speedChip: {
    minWidth: 44,
    minHeight: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedChipActive: { backgroundColor: AppTheme.colors.primaryLight, borderColor: AppTheme.colors.primary },
  speedText: { fontSize: 12, fontWeight: '700', color: AppTheme.colors.textSecondary },
  speedTextActive: { color: AppTheme.colors.primaryText },
});
