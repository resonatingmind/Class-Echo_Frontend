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

import { forgotPassword } from "../lib/api";
import { RootStackParamList } from "../navigation/AppNavigator";
import { AppTheme } from "../theme/AppTheme";
import { AppLogo } from "../components/ui/AppLogo";
import { SectionTitle } from "../components/ui/SectionTitle";
import { AppTextField } from "../components/ui/AppTextField";
import { PrimaryButton } from "../components/ui/PrimaryButton";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation, route }: Props) {
  const [email, setEmail] = useState(route.params?.email ?? "");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const backToLogin = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    setEmailError(null);
    setGeneralError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setEmailError("Email is required");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(trimmed)) {
      setEmailError("Invalid email address");
      return;
    }

    setSubmitting(true);
    try {
      await forgotPassword(trimmed);
      setSentTo(trimmed);
    } catch (err) {
      setGeneralError(
        err instanceof Error
          ? err.message
          : "We could not send the reset email. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.centerContainer}>
          <View style={styles.body}>
            <AppLogo />
            <Ionicons color={AppTheme.colors.success} name="mail-outline" size={48} />
            {/* Worded as "if" on purpose: the server answers the same way for
                unknown addresses, so this screen must not claim an account exists. */}
            <SectionTitle
              title="Check your email"
              subtitle={`If an account exists for ${sentTo}, we've sent a link to reset your password. The link expires in 60 minutes.`}
            />
            <PrimaryButton title="Back to sign in" onPress={backToLogin} />
            <Pressable accessibilityRole="button" onPress={() => setSentTo(null)}>
              <Text style={styles.link}>Didn't get it? Send again</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerContainer}>
            <View style={styles.body}>
              <AppLogo />

              <SectionTitle
                title="Forgot your password?"
                subtitle="Enter the email you sign in with and we'll send you a link to reset it."
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
                <AppTextField
                  label="Email"
                  placeholder="name@university.edu"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setEmailError(null);
                  }}
                  onSubmitEditing={handleSubmit}
                  error={emailError}
                />

                <PrimaryButton
                  title="Send reset link"
                  onPress={handleSubmit}
                  loading={submitting}
                  style={styles.buttonSpacing}
                />
              </View>

              <Pressable accessibilityRole="button" onPress={backToLogin}>
                <Text style={styles.link}>Back to sign in</Text>
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
  link: {
    color: AppTheme.colors.primaryText,
    ...AppTheme.typography.button,
    textAlign: "center",
  },
});
