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
import { resetPassword } from "../lib/api";
import { RootStackParamList } from "../navigation/AppNavigator";
import { AppTheme } from "../theme/AppTheme";
import { AppLogo } from "../components/ui/AppLogo";
import { SectionTitle } from "../components/ui/SectionTitle";
import { PasswordField } from "../components/ui/PasswordField";
import { PrimaryButton } from "../components/ui/PrimaryButton";

type Props = NativeStackScreenProps<RootStackParamList, "ResetPassword">;

const MIN_PASSWORD_LENGTH = 8;

type SignedOutRoute = "Login" | "ForgotPassword";

export function ResetPasswordScreen({ navigation, route }: Props) {
  const { session, signOut } = useAuth();
  // React Navigation surfaces the ?token= query string as a route param.
  const token = route.params?.token ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [pendingRoute, setPendingRoute] = useState<SignedOutRoute | null>(null);

  // Same constraint as AcceptInvite: this screen is registered in every session
  // state, but Login and ForgotPassword only exist while signed out, so any
  // session this browser still holds is cleared first and the navigation runs
  // once that has landed.
  const goTo = (name: SignedOutRoute) => {
    if (session) {
      setPendingRoute(name);
      void signOut();
      return;
    }
    navigation.reset({ index: 0, routes: [{ name }] });
  };

  useEffect(() => {
    if (!pendingRoute || session) return;
    const name = pendingRoute;
    setPendingRoute(null);
    navigation.reset({ index: 0, routes: [{ name }] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRoute, session]);

  const handleReset = async () => {
    if (submitting) return;

    setPasswordError(null);
    setConfirmError(null);
    setGeneralError(null);

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
      await resetPassword({ token, password });
      setDone(true);
    } catch (err) {
      setGeneralError(
        err instanceof Error
          ? err.message
          : "We could not reset your password. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerContainer}>
          <View style={styles.body}>
            <AppLogo />
            <Ionicons color={AppTheme.colors.success} name="checkmark-circle" size={48} />
            <SectionTitle
              title="Password updated"
              subtitle="Your password has been reset. Sign in with your new password."
            />
            <PrimaryButton title="Go to sign in" onPress={() => goTo("Login")} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!token) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerContainer}>
          <View style={styles.body}>
            <AppLogo />
            <View style={styles.errorContainer}>
              <Ionicons color={AppTheme.colors.error} name="alert-circle-outline" size={20} />
              <Text style={styles.errorText}>
                This reset link is incomplete. Open it directly from your
                password reset email, or request a new one.
              </Text>
            </View>
            <PrimaryButton title="Request a new link" onPress={() => goTo("ForgotPassword")} />
            <Pressable onPress={() => goTo("Login")}>
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
                title="Set a new password"
                subtitle="Choose a new password for your Class Echo account."
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
                  onSubmitEditing={handleReset}
                  error={confirmError}
                />

                <PrimaryButton
                  title="Reset password"
                  onPress={handleReset}
                  loading={submitting}
                  style={styles.buttonSpacing}
                />
              </View>

              <Text style={styles.hint}>
                Reset links expire 60 minutes after they are sent and work once.
              </Text>

              <Pressable onPress={() => goTo("ForgotPassword")}>
                <Text style={styles.link}>Request a new link</Text>
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
