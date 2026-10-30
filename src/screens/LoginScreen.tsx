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
import { RootStackParamList } from "../navigation/AppNavigator";
import { AppTheme } from "../theme/AppTheme";
import { AppLogo } from "../components/ui/AppLogo";
import { SectionTitle } from "../components/ui/SectionTitle";
import { AppTextField } from "../components/ui/AppTextField";
import { PasswordField } from "../components/ui/PasswordField";
import { PrimaryButton } from "../components/ui/PrimaryButton";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSignIn = async () => {
    if (submitting) return;
    
    setEmailError(null);
    setPasswordError(null);
    setGeneralError(null);

    let hasError = false;

    if (!email.trim()) {
      setEmailError("Email is required");
      hasError = true;
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setEmailError("Invalid email address");
      hasError = true;
    }

    if (!password) {
      setPasswordError("Password is required");
      hasError = true;
    }

    if (hasError) return;

    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setGeneralError(
        err instanceof Error
          ? err.message
          : "Login failed. Check your credentials.",
      );
      setSubmitting(false);
    }
  };

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
                title="Welcome back" 
                subtitle="Sign in to continue learning." 
              />

              {generalError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={20} color={AppTheme.colors.error} />
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
                  returnKeyType="next"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setEmailError(null);
                  }}
                  onSubmitEditing={handleSignIn}
                  error={emailError}
                />

                <PasswordField
                  label="Password"
                  placeholder="••••••••"
                  returnKeyType="done"
                  textContentType="password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordError(null);
                  }}
                  onSubmitEditing={handleSignIn}
                  error={passwordError}
                />

                <Pressable
                  onPress={() =>
                    navigation.navigate("ForgotPassword", { email: email.trim() || undefined })
                  }
                  style={styles.forgotRow}
                  hitSlop={8}
                >
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </Pressable>

                <PrimaryButton
                  title="Sign In"
                  onPress={handleSignIn}
                  loading={submitting}
                  style={styles.buttonSpacing}
                />
              </View>

              <View style={styles.signupRow}>
                <Text style={styles.signupLabel}>Don't have an account?</Text>
                <Pressable onPress={() => navigation.navigate("Signup")}>
                  <Text style={styles.signupLink}> Sign Up</Text>
                </Pressable>
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © {new Date().getFullYear()} ClassEcho. All rights reserved.
            </Text>
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
  scroll: {
    flexGrow: 1,
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
    color: AppTheme.colors.error,
    ...AppTheme.typography.body,
    flex: 1,
  },
  form: {
    gap: AppTheme.spacing.l,
  },
  buttonSpacing: {
    marginTop: AppTheme.spacing.s,
  },
  forgotRow: {
    alignSelf: "flex-end",
    marginTop: -AppTheme.spacing.s,
  },
  forgotLink: {
    color: AppTheme.colors.primary,
    ...AppTheme.typography.caption,
    fontWeight: "600",
  },
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signupLabel: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
  },
  signupLink: {
    color: AppTheme.colors.primary,
    ...AppTheme.typography.button,
  },
  footer: {
    width: "100%",
    paddingVertical: AppTheme.spacing.xxl,
    alignItems: "center",
  },
  footerText: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
    textAlign: "center",
  },
});

