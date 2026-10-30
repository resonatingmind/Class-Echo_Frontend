import { useCallback, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import * as DocumentPicker from "expo-document-picker";
import { LinearGradient } from "expo-linear-gradient";
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
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import {
  getSchoolAdminMe,
  updateSchoolAdminMe,
  uploadSchoolAdminProfileImage,
  uploadSchoolLogo,
} from "../lib/api";
import { RootStackParamList } from "../navigation/AppNavigator";
import { AppTheme } from "../theme/AppTheme";
import { SchoolAdminProfileOut } from "../types/api";
import { StreakSetting } from "../components/admin/StreakSetting";

type Props = NativeStackScreenProps<RootStackParamList, "SchoolAdminProfile">;

export function SchoolAdminProfileScreen({ navigation }: Props) {
  const { session, signOut } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [profile, setProfile] = useState<SchoolAdminProfileOut | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftSchoolName, setDraftSchoolName] = useState("");
  const [draftSchoolAddress, setDraftSchoolAddress] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const nextProfile = await getSchoolAdminMe(session.token);
      setProfile(nextProfile);
      setDraftName(nextProfile.name);
      setDraftSchoolName(nextProfile.school_name);
      setDraftSchoolAddress(nextProfile.school_address ?? "");
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const initials =
    profile?.name
      ?.split(" ")
      .map((word) => word[0] ?? "")
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "SA";

  const pickImage = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*"],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];
    return { uri: asset.uri, mimeType: asset.mimeType ?? "image/jpeg" };
  };

  const handleAvatarUpload = async () => {
    if (!session || avatarUploading) return;
    try {
      const asset = await pickImage();
      if (!asset) return;
      setAvatarUploading(true);
      const updated = await uploadSchoolAdminProfileImage(
        session.token,
        asset.uri,
        asset.mimeType,
      );
      setProfile(updated);
      setDraftName(updated.name);
      setDraftSchoolName(updated.school_name);
      setDraftSchoolAddress(updated.school_address ?? "");
    } catch (e) {
      Alert.alert(
        "Upload failed",
        e instanceof Error ? e.message : "Could not upload image.",
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleLogoUpload = async () => {
    if (!session || logoUploading) return;
    try {
      const asset = await pickImage();
      if (!asset) return;
      setLogoUploading(true);
      await uploadSchoolLogo(session.token, asset.uri, asset.mimeType);
      await load();
    } catch (e) {
      Alert.alert(
        "Upload failed",
        e instanceof Error ? e.message : "Could not upload logo.",
      );
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSave = async () => {
    if (!session || !draftName.trim() || !draftSchoolName.trim() || saving)
      return;
    try {
      setSaving(true);
      const updated = await updateSchoolAdminMe(session.token, {
        name: draftName.trim(),
        school_name: draftSchoolName.trim(),
        school_address: draftSchoolAddress.trim() || null,
      });
      setProfile(updated);
      setDraftName(updated.name);
      setDraftSchoolName(updated.school_name);
      setDraftSchoolAddress(updated.school_address ?? "");
      setEditing(false);
    } catch (e) {
      Alert.alert(
        "Save failed",
        e instanceof Error ? e.message : "Could not save changes.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" hitSlop={8} onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Ionicons color={AppTheme.colors.textPrimary} name="arrow-back" size={24} />
          </Pressable>
        </View>
        <Text style={styles.headerTitle}>{isMobile ? "" : "My Profile"}</Text>
        <View style={styles.headerRight}>
           {/* Placeholder to balance the flex header */}
        </View>
      </View>

      <View style={styles.flex}>
        {isLoading ? (
          <View style={[styles.centerContainer, { justifyContent: "center" }]}>
            <ActivityIndicator color={AppTheme.colors.primary} size="large" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.centerContainer}>
              <View style={styles.body}>
                {/* Page heading */}
                <View style={styles.pageHeading}>
                  <Text style={styles.pageTitle}>My Profile</Text>
                  <Text style={styles.pageSubtitle}>
                    Manage your account details and school information
                  </Text>
                </View>

                <LinearGradient
                  colors={[AppTheme.colors.primary, AppTheme.colors.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.hero}
                >
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void handleAvatarUpload()}
                    style={styles.avatarWrap}
                  >
                    {profile?.profile_pic_url ? (
                      <Image
                        source={{ uri: profile.profile_pic_url }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <View style={styles.avatarFallback}>
                        <Text style={styles.avatarFallbackText}>{initials}</Text>
                      </View>
                    )}
                    <View style={styles.cameraBadge}>
                      {avatarUploading ? (
                        <ActivityIndicator color={AppTheme.colors.white} size="small" />
                      ) : (
                        <Ionicons color={AppTheme.colors.white} name="camera" size={14} />
                      )}
                    </View>
                  </Pressable>
                  <Text style={styles.roleBadge}>School Administrator</Text>
                </LinearGradient>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Admin Details</Text>
                    {editing ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setEditing(false);
                          setDraftName(profile?.name ?? "");
                          setDraftSchoolName(profile?.school_name ?? "");
                          setDraftSchoolAddress(profile?.school_address ?? "");
                        }}
                      >
                        <Text style={styles.linkText}>Cancel</Text>
                      </Pressable>
                    ) : (
                      <Pressable accessibilityRole="button" onPress={() => setEditing(true)}>
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
                      placeholderTextColor={AppTheme.colors.hint}
                      style={styles.input}
                      value={draftName}
                      // @ts-ignore
                      outlineStyle="none"
                    />
                  ) : (
                    <Text style={styles.value}>{profile?.name ?? "—"}</Text>
                  )}

                  <Text style={styles.label}>EMAIL</Text>
                  <Text style={styles.value}>{profile?.email ?? "—"}</Text>
                </View>

                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>School</Text>
                    <Pressable accessibilityRole="button" onPress={() => void handleLogoUpload()}>
                      <Text style={styles.linkText}>
                        {logoUploading ? "Uploading…" : "Upload Logo"}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.logoRow}>
                    {profile?.school_logo_url ? (
                      <Image
                        source={{ uri: profile.school_logo_url }}
                        style={styles.logoImage}
                      />
                    ) : (
                      <View style={styles.logoFallback}>
                        <Ionicons
                          color={AppTheme.colors.hint}
                          name="image-outline"
                          size={24}
                        />
                      </View>
                    )}
                    <View style={styles.logoInfo}>
                      <Text style={styles.subtleValue}>
                        Tap the action above to change the school logo.
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.label}>SCHOOL NAME</Text>
                  {editing ? (
                    <TextInput
                      autoCapitalize="words"
                      onChangeText={setDraftSchoolName}
                      placeholder="School name"
                      placeholderTextColor={AppTheme.colors.hint}
                      style={styles.input}
                      value={draftSchoolName}
                      // @ts-ignore
                      outlineStyle="none"
                    />
                  ) : (
                    <Text style={styles.value}>{profile?.school_name ?? "—"}</Text>
                  )}

                  <Text style={styles.label}>ADDRESS</Text>
                  {editing ? (
                    <TextInput
                      autoCapitalize="sentences"
                      multiline
                      numberOfLines={3}
                      onChangeText={setDraftSchoolAddress}
                      placeholder="School address"
                      placeholderTextColor={AppTheme.colors.hint}
                      style={[styles.input, styles.addressInput]}
                      value={draftSchoolAddress}
                      // @ts-ignore
                      outlineStyle="none"
                    />
                  ) : (
                    <Text style={styles.subtleValue}>
                      {profile?.school_address ?? "No address added"}
                    </Text>
                  )}

                  {editing ? (
                    <Pressable
                      accessibilityRole="button"
                      disabled={
                        saving || !draftName.trim() || !draftSchoolName.trim()
                      }
                      onPress={() => void handleSave()}
                      style={[
                        styles.primaryButton,
                        (saving || !draftName.trim() || !draftSchoolName.trim()) &&
                          styles.buttonDisabled,
                      ]}
                    >
                      {saving ? (
                        <ActivityIndicator color={AppTheme.colors.white} size="small" />
                      ) : null}
                      <Text style={styles.primaryButtonText}>
                        {saving ? "Saving…" : "Save Changes"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                {profile && session?.token ? (
                  <StreakSetting
                    onSaved={(value) => setProfile({ ...profile, streak_min_recordings: value })}
                    token={session.token}
                    value={profile.streak_min_recordings ?? 2}
                  />
                ) : null}

                <Pressable accessibilityRole="button" onPress={signOut} style={styles.signOutButton}>
                  <Ionicons color={AppTheme.colors.error} name="log-out-outline" size={20} />
                  <Text style={styles.signOutText}>Sign Out</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.m,
    backgroundColor: AppTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
  },
  headerLeft: {
    width: 60,
    alignItems: "flex-start",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading3,
  },
  headerRight: {
    width: 60,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.xl,
  },
  body: {
    width: "100%",
    maxWidth: 800,
    gap: AppTheme.spacing.l,
  },
  pageHeading: {
    gap: AppTheme.spacing.s,
    marginBottom: AppTheme.spacing.xs,
  },
  pageTitle: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading1,
  },
  pageSubtitle: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
  },
  hero: { 
    alignItems: "center", 
    gap: AppTheme.spacing.m, 
    marginBottom: AppTheme.spacing.m,
    paddingVertical: 32, 
    borderRadius: 24, 
    marginHorizontal: 0,
    shadowColor: AppTheme.colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarWrap: { 
    position: 'relative',
    padding: 4,
    backgroundColor: AppTheme.colors.white,
    borderRadius: 60,
    shadowColor: AppTheme.colors.black,
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
    backgroundColor: AppTheme.colors.gray100,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarFallbackText: {
    ...AppTheme.typography.display,
    color: AppTheme.colors.primaryText,
  },
  cameraBadge: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: AppTheme.colors.white,
  },
  roleBadge: {
    marginTop: 4,
    paddingHorizontal: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.xs,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    color: AppTheme.colors.primaryText,
    ...AppTheme.typography.caption,
    fontWeight: "800",
    overflow: "hidden",
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 24,
    padding: 24,
    gap: 16,
    shadowColor: AppTheme.colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 16,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: AppTheme.spacing.xs },
  cardTitle: {
    flex: 1,
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.heading3,
  },
  linkText: { color: AppTheme.colors.primaryText, ...AppTheme.typography.button, fontSize: 14 },
  label: {
    ...AppTheme.typography.caption,
    letterSpacing: 1.2,
    color: AppTheme.colors.textSecondary,
    fontWeight: '800',
    marginTop: AppTheme.spacing.xs,
  },
  value: { ...AppTheme.typography.bodyLarge, color: AppTheme.colors.textPrimary, fontWeight: "600" },
  subtleValue: { ...AppTheme.typography.body, color: AppTheme.colors.textSecondary },
  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.gray50,
    paddingHorizontal: AppTheme.spacing.m,
    ...AppTheme.typography.body,
    color: AppTheme.colors.textPrimary,
  },
  addressInput: {
    minHeight: 92,
    paddingVertical: AppTheme.spacing.m,
    textAlignVertical: "top",
  },
  primaryButton: {
    marginTop: 12,
    height: 52,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: AppTheme.spacing.s,
    shadowColor: AppTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: { color: AppTheme.colors.white, ...AppTheme.typography.button },
  buttonDisabled: { opacity: 0.6 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: AppTheme.spacing.m },
  logoImage: { width: 64, height: 64, borderRadius: AppTheme.radius.medium },
  logoFallback: {
    width: 64,
    height: 64,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.background,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  logoInfo: { flex: 1, gap: 4 },
  signOutButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.dangerBg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: AppTheme.spacing.s,
    marginTop: AppTheme.spacing.m,
    borderWidth: 1,
    borderColor: AppTheme.colors.dangerBorderStrong,
  },
  signOutText: { color: AppTheme.colors.danger, ...AppTheme.typography.button, fontWeight: '700' },
});

