import { useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { acceptInvite } from "../lib/api";
import { RootStackParamList } from "../navigation/AppNavigator";
import { UserRole } from "../types/api";
import { AppTheme } from "../theme/AppTheme";
import { AppLogo } from "../components/ui/AppLogo";
import { SectionTitle } from "../components/ui/SectionTitle";
import { PasswordField } from "../components/ui/PasswordField";
import { PrimaryButton } from "../components/ui/PrimaryButton";

type Props = NativeStackScreenProps<RootStackParamList, "AcceptInvite">;

const MIN_PASSWORD_LENGTH = 8;

export function AcceptInviteScreen({ navigation, route }: Props) {
  const { signInDirect } = useAuth();
  // React Navigation surfaces the ?token= query string as a route param.
  const token = route.params?.token ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleAccept = async () => {
    if (submitting) return;

    setPasswordError(null);
    setConfirmError(null);
    setGeneralError(null);

    if (!token) {
      setGeneralError(
        "This link is missing its invitation code. Open the link from your invitation email again.",
      );
      return;
    }

    let hasError = false;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setPasswordError(`Use at least ${MIN_PASSWORD_LENGTH} characters`);
      hasError = true;
    }
    if (confirmPassword !== password) {
      setConfirmError("Passwords do not match");
      hasError = true;
    }
    if (hasError) return;

    setSubmitting(true);
    try {
      const result = await acceptInvite({ token, password });
      // Accepting an invite activates the account, so the session goes straight
      // to the role's home rather than back through the login screen.
      signInDirect(result.access_token, result.role as UserRole, "active");
    } catch (err) {
      setGeneralError(
        err instanceof Error
          ? err.message
          : "We could not accept this invitation. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // A link opened without a token is almost always a copy-paste that dropped the
  // query string, so say that instead of showing an empty password form.
  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerContainer}>
          <View style={styles.body}>
            <AppLogo />
            <View style={styles.errorContainer}>
              <Ionicons color={AppTheme.colors.error} name="alert-circle-outline" size={20} />
              <Text style={styles.errorText}>
                This invitation link is incomplete. Open it directly from your
                invitation email, or ask your administrator to resend it.
              </Text>
            </View>
            <Pressable onPress={() => navigation.navigate("Login")}>
              <Text style={styles.link}>Back to sign in</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.centerContainer}>
            <View style={styles.body}>
              <AppLogo />

              <SectionTitle
                title="Accept your invitation"
                subtitle="Choose a password to activate your Class Echo account."
              />

              {generalError ? (
                <View style={styles.errorContainer}>
                  <Ionicons
                    color={AppTheme.colors.error}
                    name="alert-circle-outline"
                    size={20}
                  />
                  <Text style={styles.errorText}>{generalError}</Text>
                </View>
              ) : null}

              <View style={styles.form}>
                <PasswordField
                  label="New password"
                  placeholder="••••••••"
                  textContentType="newPassword"
                  returnKeyType="next"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordError(null);
                  }}
                  error={passwordError}
                />

                <PasswordField
                  label="Confirm password"
                  placeholder="••••••••"
                  textContentType="newPassword"
                  returnKeyType="done"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    setConfirmError(null);
                  }}
                  onSubmitEditing={handleAccept}
                  error={confirmError}
                />

                <PrimaryButton
                  title="Activate account"
                  onPress={handleAccept}
                  loading={submitting}
                  style={styles.buttonSpacing}
                />
              </View>

              <Text style={styles.hint}>
                Invitation links expire 7 days after they are sent. If yours has
                expired, ask your administrator to send a new one.
              </Text>

              <Pressable onPress={() => navigation.navigate("Login")}>
                <Text style={styles.link}>Already activated? Sign in</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  flex: { flex: 1 },
  scroll: { flexGrow: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.huge,
  },
  body: {
    width: "100%",
    maxWidth: 400,
    gap: AppTheme.spacing.xl,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FDF2F2",
    borderWidth: 1,
    borderColor: "#FDE8E8",
    padding: AppTheme.spacing.m,
    borderRadius: AppTheme.radius.medium,
    gap: AppTheme.spacing.s,
  },
  errorText: {
    color: AppTheme.colors.error,
    ...AppTheme.typography.body,
    flex: 1,
  },
  form: { gap: AppTheme.spacing.l },
  buttonSpacing: { marginTop: AppTheme.spacing.s },
  hint: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
    textAlign: "center",
  },
  link: {
    color: AppTheme.colors.primary,
    ...AppTheme.typography.button,
    textAlign: "center",
  },
});
