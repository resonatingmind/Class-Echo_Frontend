import { useCallback, useEffect, useRef, useState } from "react";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { verifyEmail } from "../lib/api";
import { RootStackParamList, roleHome } from "../navigation/AppNavigator";
import { AppTheme } from "../theme/AppTheme";
import { AppLogo } from "../components/ui/AppLogo";
import { SectionTitle } from "../components/ui/SectionTitle";
import { PrimaryButton } from "../components/ui/PrimaryButton";

type Props = NativeStackScreenProps<RootStackParamList, "VerifyEmail">;

type Status = "verifying" | "verified" | "failed";

export function VerifyEmailScreen({ navigation, route }: Props) {
  const { session, signOut } = useAuth();
  // React Navigation surfaces the ?token= query string as a route param.
  const token = route.params?.token ?? "";

  const [status, setStatus] = useState<Status>(token ? "verifying" : "failed");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    token
      ? null
      : "This verification link is incomplete. Open it directly from your verification email.",
  );
  // The link is single-use, so a re-render must never spend the token twice.
  const attempted = useRef(false);

  const runVerification = useCallback(async () => {
    if (!token) return;
    setStatus("verifying");
    setErrorMessage(null);
    try {
      await verifyEmail(token);
      setStatus("verified");
    } catch (err) {
      setStatus("failed");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "We could not verify this email address. Please try again.",
      );
    }
  }, [token]);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;
    void runVerification();
  }, [runVerification]);

  // Where "continue" should land depends on the session this browser happens to
  // hold: verification links are optional and often opened while already signed
  // in, and a pending school admin or teacher only has AwaitingApproval
  // registered.
  const handleContinue = () => {
    if (!session) {
      navigation.navigate("Login");
      return;
    }
    const target: keyof RootStackParamList =
      (session.role === "school_admin" || session.role === "teacher") &&
      session.status !== "active"
        ? "AwaitingApproval"
        : roleHome(session.role);
    navigation.reset({ index: 0, routes: [{ name: target } as never] });
  };

  // Mirrors AcceptInvite: with a session held, the Login screen is not
  // registered, so clearing the session is what returns to the sign-in form.
  const goToSignIn = () => {
    if (session) {
      void signOut();
      return;
    }
    navigation.navigate("Login");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.centerContainer}>
        <View style={styles.body}>
          <AppLogo />

          {status === "verifying" ? (
            <>
              <SectionTitle
                title="Verifying your email"
                subtitle="This only takes a moment."
              />
              <ActivityIndicator color={AppTheme.colors.primary} size="large" />
            </>
          ) : null}

          {status === "verified" ? (
            <>
              <View style={styles.successContainer}>
                <Ionicons
                  color={AppTheme.colors.success}
                  name="checkmark-circle-outline"
                  size={20}
                />
                <Text style={styles.successText}>
                  Your email address is verified.
                </Text>
              </View>

              <SectionTitle
                title="You're all set"
                subtitle="Thanks for confirming your email address."
              />

              <PrimaryButton title="Continue" onPress={handleContinue} />
            </>
          ) : null}

          {status === "failed" ? (
            <>
              <View style={styles.errorContainer}>
                <Ionicons
                  color={AppTheme.colors.error}
                  name="alert-circle-outline"
                  size={20}
                />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>

              {token ? (
                <PrimaryButton title="Try again" onPress={() => void runVerification()} />
              ) : null}

              <Text style={styles.hint}>
                Verification links expire 3 days after they are sent. Email
                verification is optional — it never blocks access to your
                account.
              </Text>

              <Pressable onPress={goToSignIn}>
                <Text style={styles.link}>Back to sign in</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
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
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3FAF7",
    borderWidth: 1,
    borderColor: "#DEF7EC",
    padding: AppTheme.spacing.m,
    borderRadius: AppTheme.radius.medium,
    gap: AppTheme.spacing.s,
  },
  successText: {
    color: AppTheme.colors.success,
    ...AppTheme.typography.body,
    flex: 1,
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
