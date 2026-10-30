import { useEffect, useState } from "react";
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
import { AppTheme } from "../theme/AppTheme";
import { AppLogo } from "../components/ui/AppLogo";
import { SectionTitle } from "../components/ui/SectionTitle";
import { PasswordField } from "../components/ui/PasswordField";
import { PrimaryButton } from "../components/ui/PrimaryButton";

type Props = NativeStackScreenProps<RootStackParamList, "AcceptInvite">;

const MIN_PASSWORD_LENGTH = 8;

export function AcceptInviteScreen({ navigation, route }: Props) {
  const { session, signOut } = useAuth();
  // React Navigation surfaces the ?token= query string as a route param.
  const token = route.params?.token ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [activated, setActivated] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // reset rather than navigate: this screen is registered in every session
  // state, so nothing pops it off the stack on its own, and a plain navigate
  // leaves it sitting underneath with the invite URL still in the address bar.
  const resetToLogin = () => {
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  // When this browser still holds a session the Login screen is not registered
  // at all, so the session has to be cleared first and the navigation deferred
  // until that has actually landed - hence the effect below rather than an
  // await here.
  const goToSignIn = () => {
    if (session) {
      setSigningOut(true);
      void signOut();
      return;
    }
    resetToLogin();
  };

  useEffect(() => {
    if (!signingOut || session) return;
    setSigningOut(false);
    resetToLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signingOut, session]);

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
      await acceptInvite({ token, password });
      // Deliberately not signing in here. Confirming the activation is what tells
      // the invited user the link worked, and a fresh sign-in both proves the new
      // password and clears any stale session this browser was still holding.
      setActivated(true);
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

  if (activated) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerContainer}>
          <View style={styles.body}>
            <AppLogo />
            <Ionicons
              color={AppTheme.colors.success}
              name="checkmark-circle"
              size={48}
            />
            <SectionTitle
              title="Account activated"
              subtitle="Your password has been set. Sign in to access your Class Echo account."
            />
            <PrimaryButton title="Go to sign in" onPress={goToSignIn} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
            <Pressable accessibilityRole="button" onPress={goToSignIn}>
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

              <Pressable accessibilityRole="button" onPress={goToSignIn}>
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
    backgroundColor: AppTheme.colors.dangerBg,
    borderWidth: 1,
    borderColor: AppTheme.colors.dangerSoft,
    padding: AppTheme.spacing.m,
    borderRadius: AppTheme.radius.medium,
    gap: AppTheme.spacing.s,
  },
  errorText: {
    color: AppTheme.colors.dangerText,
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
    color: AppTheme.colors.primaryText,
    ...AppTheme.typography.button,
    textAlign: "center",
  },
});
