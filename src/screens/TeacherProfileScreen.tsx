import { AppTheme } from '../theme/AppTheme';
import { useCallback, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import {
  getTeacherMe,
  getTeacherDashboard,
  updateTeacherMe,
  uploadTeacherProfileImage,
} from '../lib/api';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { TeacherOut, TeacherDashboardSubject } from '../types/api';

export function TeacherProfileScreen() {
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState<TeacherOut | null>(null);
  const [subjects, setSubjects] = useState<TeacherDashboardSubject[]>([]);
  const [draftName, setDraftName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const [nextProfile, dashboard] = await Promise.all([
        getTeacherMe(session.token),
        getTeacherDashboard(session.token),
      ]);
      setProfile(nextProfile);
      setDraftName(nextProfile.name);
      setSubjects(dashboard.subjects);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const initials = profile?.name
    ?.split(' ')
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '?';

  // Derived stats from the dashboard subjects
  const stats = useMemo(() => {
    const totalRecordings = subjects.reduce((sum, s) => sum + s.recording_count, 0);
    const totalStudents   = subjects.reduce((sum, s) => sum + s.student_count, 0);
    return {
      subjects: subjects.length,
      recordings: totalRecordings,
      students: totalStudents,
    };
  }, [subjects]);

  const handleAvatarPick = async () => {
    if (!session || uploading) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploading(true);
      const updated = await uploadTeacherProfileImage(
        session.token,
        asset.uri,
        asset.mimeType ?? 'image/jpeg',
      );
      setProfile(updated);
      setDraftName(updated.name);
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Could not upload image.');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!session || !draftName.trim() || saving) return;
    try {
      setSaving(true);
      const updated = await updateTeacherMe(session.token, { name: draftName.trim() });
      setProfile(updated);
      setDraftName(updated.name);
      setEditing(false);
    } catch (e) {
      Alert.alert('Save failed', e instanceof Error ? e.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      <ScreenHeader title="My Account" />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AppTheme.colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Hero banner ── */}
          <LinearGradient
            colors={[AppTheme.colors.primary, AppTheme.colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            {/* School name kicker */}
            {profile?.school_name ? (
              <Text style={styles.schoolKicker}>{profile.school_name.toUpperCase()}</Text>
            ) : null}

            {/* Avatar */}
            <Pressable onPress={() => void handleAvatarPick()} style={styles.avatarWrap}>
              {profile?.profile_image_url ? (
                <Image source={{ uri: profile.profile_image_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{initials}</Text>
                </View>
              )}
              <View style={styles.cameraBadge}>
                {uploading ? (
                  <ActivityIndicator color={AppTheme.colors.surface} size="small" />
                ) : (
                  <Ionicons color={AppTheme.colors.surface} name="camera" size={14} />
                )}
              </View>
            </Pressable>

            <Text style={styles.roleBadge}>Teacher</Text>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.subjects}</Text>
                <Text style={styles.statLabel}>Subjects</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.recordings}</Text>
                <Text style={styles.statLabel}>Recordings</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{stats.students}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
            </View>
          </LinearGradient>

          {/* ── Profile card ── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Profile Details</Text>
              {editing ? (
                <Pressable onPress={() => { setEditing(false); setDraftName(profile?.name ?? ''); }}>
                  <Text style={styles.linkText}>Cancel</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => setEditing(true)}>
                  <Text style={styles.linkText}>Edit</Text>
                </Pressable>
              )}
            </View>

            {/* Name */}
            <View style={styles.fieldRow}>
              <View style={styles.fieldIconWrap}>
                <Ionicons name="person-outline" size={16} color={AppTheme.colors.primary} />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>NAME</Text>
                {editing ? (
                  <TextInput
                    autoCapitalize="words"
                    onChangeText={setDraftName}
                    placeholder="Full name"
                    placeholderTextColor={AppTheme.colors.textPlaceholder}
                    style={styles.input}
                    value={draftName}
                  />
                ) : (
                  <Text style={styles.fieldValue}>{profile?.name ?? '—'}</Text>
                )}
              </View>
            </View>

            {/* Email */}
            <View style={styles.fieldRow}>
              <View style={styles.fieldIconWrap}>
                <Ionicons name="mail-outline" size={16} color={AppTheme.colors.primary} />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>EMAIL</Text>
                <Text style={styles.fieldValue}>{profile?.email ?? '—'}</Text>
              </View>
            </View>

            {/* Member since */}
            <View style={[styles.fieldRow, { borderBottomWidth: 0 }]}>
              <View style={styles.fieldIconWrap}>
                <Ionicons name="calendar-outline" size={16} color={AppTheme.colors.primary} />
              </View>
              <View style={styles.fieldContent}>
                <Text style={styles.fieldLabel}>MEMBER SINCE</Text>
                <Text style={styles.fieldValue}>
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—'}
                </Text>
              </View>
            </View>

            {editing && (
              <Pressable
                disabled={saving || !draftName.trim()}
                onPress={() => void handleSave()}
                style={[styles.primaryButton, (saving || !draftName.trim()) && styles.buttonDisabled]}
              >
                {saving ? <ActivityIndicator color={AppTheme.colors.surface} size="small" /> : null}
                <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
              </Pressable>
            )}
          </View>

          {/* ── Sign out ── */}
          <Pressable onPress={signOut} style={styles.signOutButton}>
            <Ionicons color={AppTheme.colors.error} name="log-out-outline" size={18} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: {
    padding: AppTheme.spacing.xl,
    paddingBottom: AppTheme.spacing.xxxl,
    gap: AppTheme.spacing.l,
  },

  // ── Hero ──
  hero: {
    alignItems: 'center',
    gap: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.xxxl,
    paddingHorizontal: AppTheme.spacing.xl,
    borderRadius: AppTheme.radius.xlarge,
    marginBottom: AppTheme.spacing.xs,
    ...AppTheme.shadows.card,
  },
  schoolKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: 'rgba(255,255,255,0.7)',
  },
  avatarWrap: {
    position: 'relative',
    padding: 4,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 60,
    ...AppTheme.shadows.card,
  },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarFallback: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 32,
    fontWeight: '800',
    color: AppTheme.colors.primaryDark,
  },
  cameraBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: AppTheme.colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: AppTheme.colors.surface,
  },
  roleBadge: {
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: 5,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    color: AppTheme.colors.surface,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.8,
    overflow: 'hidden',
  },

  // Stats row inside hero
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: AppTheme.spacing.s,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: AppTheme.radius.large,
    paddingVertical: AppTheme.spacing.m,
    paddingHorizontal: AppTheme.spacing.xl,
    gap: AppTheme.spacing.l,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: AppTheme.colors.surface,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  // ── Profile card ──
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.xlarge,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    overflow: 'hidden',
    ...AppTheme.shadows.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppTheme.spacing.xl,
    paddingVertical: AppTheme.spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.divider,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: AppTheme.colors.textPrimary,
  },
  linkText: {
    color: AppTheme.colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },

  // Field rows
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppTheme.spacing.xl,
    paddingVertical: AppTheme.spacing.l,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.divider,
    gap: AppTheme.spacing.m,
  },
  fieldIconWrap: {
    width: 32,
    height: 32,
    borderRadius: AppTheme.radius.small,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fieldContent: { flex: 1, gap: 3 },
  fieldLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: AppTheme.colors.textSecondary,
    fontWeight: '800',
  },
  fieldValue: {
    fontSize: 15,
    color: AppTheme.colors.textPrimary,
    fontWeight: '600',
  },
  input: {
    height: 44,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.background,
    paddingHorizontal: AppTheme.spacing.m,
    fontSize: 15,
    color: AppTheme.colors.textPrimary,
    marginTop: 4,
  },
  primaryButton: {
    marginHorizontal: AppTheme.spacing.xl,
    marginBottom: AppTheme.spacing.l,
    marginTop: AppTheme.spacing.s,
    height: 50,
    borderRadius: AppTheme.radius.large,
    backgroundColor: AppTheme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppTheme.spacing.s,
    ...AppTheme.shadows.card,
  },
  primaryButtonText: {
    color: AppTheme.colors.surface,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: { opacity: 0.5 },

  // ── Sign out ──
  signOutButton: {
    height: 50,
    borderRadius: AppTheme.radius.large,
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppTheme.spacing.s,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  signOutText: {
    color: AppTheme.colors.error,
    fontSize: 15,
    fontWeight: '700',
  },
});
