import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
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
import {
  getPublicSchools,
  registerTeacher,
  registerSchool,
  getTeacherMe,
  getSchoolAdminMe,
} from "../lib/api";
import { RootStackParamList } from "../navigation/AppNavigator";
import { AppTheme } from "../theme/AppTheme";
import { SchoolOut } from "../types/api";

import { AppLogo } from "../components/ui/AppLogo";
import { AppTextField } from "../components/ui/AppTextField";
import { PasswordField } from "../components/ui/PasswordField";
import { PrimaryButton } from "../components/ui/PrimaryButton";
import { SegmentedSelector } from "../components/ui/SegmentedSelector";
import { SectionTitle } from "../components/ui/SectionTitle";
import { SchoolDropdown } from "../components/ui/SchoolDropdown";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

export function SignupScreen({ navigation }: Props) {
  const { signInDirect } = useAuth();

  const [role, setRole] = useState<"teacher" | "school">("teacher");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [schoolName, setSchoolName] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");

  const [schools, setSchools] = useState<SchoolOut[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolOut | null>(null);
  const [loadingSchools, setLoadingSchools] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  
  const [schoolError, setSchoolError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    if (role !== "teacher") return;
    const load = async () => {
      setLoadingSchools(true);
      try {
        setSchools(await getPublicSchools());
      } catch {
        setGeneralError("Could not load schools");
      } finally {
        setLoadingSchools(false);
      }
    };
    void load();
  }, [role]);

  useEffect(() => {
    // Clear errors when swapping roles
    setSchoolError(null);
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setGeneralError(null);
  }, [role]);

  async function handleCreateAccount() {
    if (submitting) return;

    setSchoolError(null);
    setNameError(null);
    setEmailError(null);
    setPasswordError(null);
    setGeneralError(null);

    let hasError = false;

    if (role === "teacher" && !selectedSchool) {
      setSchoolError("Please select your school");
      hasError = true;
    }
    if (role === "school" && !schoolName.trim()) {
      setSchoolError("School name is required");
      hasError = true;
    }
    if (!name.trim()) {
      setNameError("Full name is required");
      hasError = true;
    }
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
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      hasError = true;
    }

    if (hasError) return;

    setSubmitting(true);
    try {
      if (role === "teacher") {
        const resp = await registerTeacher({
          name: name.trim(),
          email: email.trim(),
          password,
          school_id: selectedSchool!.id,
        });
        const me = await getTeacherMe(resp.access_token);
        signInDirect(resp.access_token, resp.role, me.status);
      } else if (role === "school") {
        const resp = await registerSchool({
          school_name: schoolName.trim(),
          school_address: schoolAddress.trim() || undefined,
          admin_name: name.trim(),
          admin_email: email.trim(),
          admin_password: password,
        });
        const me = await getSchoolAdminMe(resp.access_token);
        signInDirect(resp.access_token, resp.role, me.status);
      }
    } catch (e) {
      setGeneralError(e instanceof Error ? e.message : "Signup failed");
    } finally {
      setSubmitting(false);
    }
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
                title="Create Account" 
                subtitle="Sign up to join ClassEcho." 
              />
              
              <SegmentedSelector
                options={[
                  { label: "Teacher", value: "teacher" },
                  { label: "School Admin", value: "school" },
                ]}
                value={role}
                onChange={(v) => setRole(v as typeof role)}
              />

              {generalError ? (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle-outline" size={20} color={AppTheme.colors.error} />
                  <Text style={styles.errorText}>{generalError}</Text>
                </View>
              ) : null}

              <View style={styles.form}>
                {role === "teacher" && (
                  <SchoolDropdown
                    schools={schools}
                    loading={loadingSchools}
                    value={selectedSchool}
                    onChange={(school) => {
                      setSelectedSchool(school);
                      setSchoolError(null);
                    }}
                    error={schoolError}
                  />
                )}

                {role === "school" && (
                  <>
                    <AppTextField
                      label="School Name"
                      placeholder="Springfield High"
                      autoCapitalize="words"
                      value={schoolName}
                      onChangeText={(text) => {
                        setSchoolName(text);
                        setSchoolError(null);
                      }}
                      error={schoolError}
                    />
                    <AppTextField
                      label="School Address (optional)"
                      placeholder="123 Main St"
                      autoCapitalize="words"
                      value={schoolAddress}
                      onChangeText={setSchoolAddress}
                    />
                  </>
                )}
                
                <AppTextField
                  label={role === "school" ? "Your Name" : "Full Name"}
                  placeholder="Alex Morgan"
                  autoCapitalize="words"
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    setNameError(null);
                  }}
                  error={nameError}
                />
                <AppTextField
                  label={role === "school" ? "Your Email" : "Email"}
                  placeholder="alex@school.edu"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    setEmailError(null);
                  }}
                  error={emailError}
                />
                <PasswordField
                  label="Password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    setPasswordError(null);
                  }}
                  error={passwordError}
                />
              </View>

              <PrimaryButton
                title="Create Account"
                onPress={handleCreateAccount}
                loading={submitting}
                style={styles.buttonSpacing}
              />
              
              <Text style={styles.approvalNotice}>
                {role === "teacher"
                  ? "Your school's admin will need to approve your request."
                  : "ClassEcho's admin will need to approve your school."}
              </Text>

              <View style={styles.loginRow}>
                <Text style={styles.loginLabel}>Already have an account?</Text>
                <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Login")}>
                  <Text style={styles.loginLink}> Sign In</Text>
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
    color: AppTheme.colors.dangerText,
    ...AppTheme.typography.body,
    flex: 1,
  },
  form: {
    gap: AppTheme.spacing.l,
    zIndex: 10,
  },
  buttonSpacing: {
    marginTop: AppTheme.spacing.s,
  },
  approvalNotice: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
    textAlign: "center",
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginLabel: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
  },
  loginLink: {
    color: AppTheme.colors.primaryText,
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

