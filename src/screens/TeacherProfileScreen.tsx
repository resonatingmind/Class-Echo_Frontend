import { AppTheme } from '../theme/AppTheme';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
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

import { TeacherTabBar } from '../components/TeacherTabBar';
import { useAuth } from '../context/AuthContext';
import {
  getTeacherMe,
  updateTeacherMe,
  uploadTeacherProfileImage,
} from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { ScreenHeader } from '../components/common/ScreenHeader';
import { colors } from '../theme/colors';
import { TeacherOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'TeacherProfile'>;

export function TeacherProfileScreen({ navigation }: Props) {
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState<TeacherOut | null>(null);
  const [draftName, setDraftName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const nextProfile = await getTeacherMe(session.token);
      setProfile(nextProfile);
      setDraftName(nextProfile.name);
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
    <SafeAreaView edges={[]} style={styles.safe}>
      <ScreenHeader title="My Account" />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={AppTheme.colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={[AppTheme.colors.primary, AppTheme.colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
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
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons color="#fff" name="camera" size={14} />
                )}
              </View>
            </Pressable>
            <Text style={styles.roleBadge}>Teacher</Text>
          </LinearGradient>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Profile</Text>
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

            <Text style={styles.label}>NAME</Text>
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
              <Text style={styles.value}>{profile?.name ?? '—'}</Text>
            )}

            <Text style={styles.label}>EMAIL</Text>
            <Text style={styles.value}>{profile?.email ?? '—'}</Text>

            <Text style={styles.label}>MEMBER SINCE</Text>
            <Text style={styles.value}>
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '—'}
            </Text>

            {editing ? (
              <Pressable
                disabled={saving || !draftName.trim()}
                onPress={() => void handleSave()}
                style={[styles.primaryButton, (saving || !draftName.trim()) && styles.buttonDisabled]}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : null}
                <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable onPress={signOut} style={styles.signOutButton}>
            <Ionicons color="#EF4444" name="log-out-outline" size={18} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </Pressable>
        </ScrollView>
      )}

      {/* <TeacherTabBar
        active="account"
        onTabPress={(key) => {
          if (key === 'home') navigation.navigate('TeacherSubjects');
        }}
      /> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 20, paddingBottom: 32, gap: 18 },
  hero: { 
    alignItems: 'center', 
    gap: 12, 
    paddingVertical: 32, 
    borderRadius: 24, 
    marginHorizontal: 0,
    marginBottom: 8,
    shadowColor: AppTheme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarWrap: { 
    position: 'relative',
    padding: 4,
    backgroundColor: '#fff',
    borderRadius: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImage: { width: 104, height: 104, borderRadius: 52 },
  avatarFallback: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: { fontSize: 34, fontWeight: '800', color: AppTheme.colors.primaryDark },
  cameraBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  roleBadge: {
    marginTop: 4,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: AppTheme.colors.primaryDark,
    fontWeight: '800',
    overflow: 'hidden',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: AppTheme.colors.textPrimary },
  linkText: { color: AppTheme.colors.primaryDark, fontSize: 14, fontWeight: '700' },
  label: { fontSize: 11, letterSpacing: 1.2, color: AppTheme.colors.textSecondary, fontWeight: '800', marginTop: 4 },
  value: { fontSize: 16, color: AppTheme.colors.textPrimary, fontWeight: '600' },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    fontSize: 16,
    color: AppTheme.colors.textPrimary,
  },
  primaryButton: {
    marginTop: 12,
    height: 52,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: AppTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  buttonDisabled: { opacity: 0.5 },
  signOutButton: {
    marginTop: 12,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  signOutText: { color: '#DC2626', fontSize: 16, fontWeight: '700' },
});


