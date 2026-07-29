import { Feather, Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import {
  getPublicSchoolClasses,
  getPublicSchools,
  studentSignup,
  registerTeacher,
  registerSchool,
  getTeacherMe,
  getSchoolAdminMe,
} from "../lib/api";
import { RootStackParamList } from "../navigation/AppNavigator";
import { colors } from "../theme/colors";
import { ClassOut, SchoolOut } from "../types/api";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

// ── Shared field component ────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "email-address" | "default" | "phone-pad";
  autoCapitalize?: "none" | "words";
}) {
  return (
    <View style={fieldStyles.wrap}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize ?? "none"}
        keyboardType={keyboardType ?? "default"}
        placeholder={placeholder}
        placeholderTextColor={colors.textPlaceholder}
        secureTextEntry={secureTextEntry}
        style={fieldStyles.input}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrap: { gap: 6 },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  input: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.textPrimary,
  },
});

// ── Progress dots ─────────────────────────────────────────────────────────────

function StepDots({ step }: { step: number }) {
  return (
    <View style={dotStyles.row}>
      {[1, 2, 3].map((s) => (
        <View
          key={s}
          style={[
            dotStyles.dot,
            s === step ? dotStyles.active : s < step ? dotStyles.done : null,
          ]}
        />
      ))}
    </View>
  );
}

const dotStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  active: { width: 24, backgroundColor: colors.accent },
  done: { backgroundColor: colors.accentDark },
});


// ── Role Tabs ─────────────────────────────────────────────────────────────────

function RoleTabs({
  role,
  setRole,
}: {
  role: "student" | "teacher" | "school";
  setRole: (r: "student" | "teacher" | "school") => void;
}) {
  return (
    <View style={roleStyles.container}>
      <Pressable
        style={[roleStyles.tab, role === "student" && roleStyles.activeTab]}
        onPress={() => setRole("student")}
      >
        <Text style={[roleStyles.tabText, role === "student" && roleStyles.activeText]}>Student</Text>
      </Pressable>
      <Pressable
        style={[roleStyles.tab, role === "teacher" && roleStyles.activeTab]}
        onPress={() => setRole("teacher")}
      >
        <Text style={[roleStyles.tabText, role === "teacher" && roleStyles.activeText]}>Teacher</Text>
      </Pressable>
      <Pressable
        style={[roleStyles.tab, role === "school" && roleStyles.activeTab]}
        onPress={() => setRole("school")}
      >
        <Text style={[roleStyles.tabText, role === "school" && roleStyles.activeText]}>School</Text>
      </Pressable>
    </View>
  );
}

const roleStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.border,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 24,
    marginTop: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  activeText: {
    color: colors.textPrimary,
  },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export function SignupScreen({ navigation }: Props) {
  const { signInDirect } = useAuth();

  const [role, setRole] = useState<"student" | "teacher" | "school">("student");

  // Step 1 — credentials
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 1 — school admin specific
  const [schoolName, setSchoolName] = useState("");
  const [schoolAddress, setSchoolAddress] = useState("");

  // Step 2 — school
  const [schools, setSchools] = useState<SchoolOut[]>([]);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [selectedSchool, setSelectedSchool] = useState<SchoolOut | null>(null);
  const [loadingSchools, setLoadingSchools] = useState(false);

  // Step 3 — class
  const [classes, setClasses] = useState<ClassOut[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassOut | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(false);

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load schools when entering step 2
  useEffect(() => {
    if (step !== 2) return;
    const load = async () => {
      setLoadingSchools(true);
      try {
        setSchools(await getPublicSchools());
      } catch {
        setError("Could not load schools");
      } finally {
        setLoadingSchools(false);
      }
    };
    void load();
  }, [step]);

  // Filter schools by search
  const filteredSchools = schoolSearch.trim()
    ? schools.filter((s) =>
        s.name.toLowerCase().includes(schoolSearch.toLowerCase()),
      )
    : schools;

  // Load classes when a school is selected
  useEffect(() => {
    if (!selectedSchool) return;
    const load = async () => {
      setLoadingClasses(true);
      setClasses([]);
      setSelectedClass(null);
      try {
        setClasses(await getPublicSchoolClasses(selectedSchool.id));
      } catch {
        setError("Could not load classes");
      } finally {
        setLoadingClasses(false);
      }
    };
    void load();
  }, [selectedSchool]);

  function goBack() {
    setError(null);
    if (step === 1) {
      navigation.goBack();
    } else {
      setStep((s) => s - 1);
    }
  }

  // Reset steps and state when role changes
  useEffect(() => {
    setStep(1);
    setError(null);
  }, [role]);

  function nextStep() {
    setError(null);
    if (step === 1) {
      if (role === "school") {
        if (!schoolName.trim()) {
          setError("Please enter your school name");
          return;
        }
      }
      if (!name.trim()) {
        setError("Please enter your full name");
        return;
      }
      if (!email.trim() || !email.includes("@")) {
        setError("Please enter a valid email");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
      }
      if (role === "school") {
        void handleCreateAccount();
      } else {
        setStep(2);
      }
    } else if (step === 2) {
      if (!selectedSchool) {
        setError("Please select a school");
        return;
      }
      if (role === "teacher") {
        void handleCreateAccount();
      } else {
        setStep(3);
      }
    }
  }

  async function handleCreateAccount() {
    setError(null);
    setSubmitting(true);
    try {
      if (role === "student") {
        if (!selectedClass) {
          setError("Please select a class");
          setSubmitting(false);
          return;
        }
        const resp = await studentSignup({
          name: name.trim(),
          email: email.trim(),
          password,
          school_id: selectedSchool!.id,
          class_id: selectedClass.id,
        });
        signInDirect(resp.access_token, resp.role);
      } else if (role === "teacher") {
        if (!selectedSchool) {
          setError("Please select a school");
          setSubmitting(false);
          return;
        }
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
      setError(e instanceof Error ? e.message : "Signup failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={goBack} style={styles.backBtn}>
          <Ionicons color={colors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {step === 1
              ? "Create Account"
              : step === 2
                ? "Choose School"
                : "Choose Class"}
          </Text>
          {role === "student" ? (
            <StepDots step={step} />
          ) : role === "teacher" ? (
            <View style={dotStyles.row}>
              {[1, 2].map((s) => (
                <View
                  key={s}
                  style={[
                    dotStyles.dot,
                    s === step ? dotStyles.active : s < step ? dotStyles.done : null,
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>
        <View style={styles.backBtn} />
      </View>

      {step === 1 && <RoleTabs role={role} setRole={setRole} />}

      {/* Step 1 — Credentials */}
      {step === 1 && (
        <View style={styles.body}>
          <Text style={styles.stepHint}>
            {role === "student" ? "Step 1 of 3 — Your Details" : role === "teacher" ? "Step 1 of 2 — Your Details" : "Your Details"}
          </Text>
          <View style={styles.form}>
            {role === "school" && (
              <>
                <Field
                  autoCapitalize="words"
                  label="School Name"
                  placeholder="Springfield High"
                  value={schoolName}
                  onChangeText={setSchoolName}
                />
                <Field
                  autoCapitalize="words"
                  label="School Address (optional)"
                  placeholder="123 Main St"
                  value={schoolAddress}
                  onChangeText={setSchoolAddress}
                />
              </>
            )}
            <Field
              autoCapitalize="words"
              label={role === "school" ? "Your Name" : "Full Name"}
              placeholder="Alex Morgan"
              value={name}
              onChangeText={setName}
            />
            <Field
              keyboardType="email-address"
              label={role === "school" ? "Your Email" : "Email"}
              placeholder="alex@school.edu"
              value={email}
              onChangeText={setEmail}
            />
            <Field
              label="Password"
              placeholder="Min 6 characters"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable onPress={nextStep} style={styles.btn} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.btnText}>{role === "school" ? "Create Account" : "Continue"}</Text>
                {role === "school" ? (
                  <Ionicons color="#fff" name="checkmark" size={18} />
                ) : (
                  <Ionicons color="#fff" name="arrow-forward" size={18} />
                )}
              </>
            )}
          </Pressable>
          {role !== "student" && (
            <Text style={{ fontSize: 12, color: colors.textMuted, textAlign: "center", marginTop: -8 }}>
              {role === "teacher" 
                ? "Your school's admin will need to approve your request."
                : "Class Echo's platform admin will need to approve your school."}
            </Text>
          )}
          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account?</Text>
            <Pressable onPress={() => navigation.navigate("Login")}>
              <Text style={styles.loginLink}>Log in</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Step 2 — School selection */}
      {step === 2 && (
        <View style={styles.bodyFlex}>
          <View style={styles.searchWrap}>
            <Text style={styles.stepHint}>
              {role === "teacher" ? "Step 2 of 2 — Select Your School" : "Step 2 of 3 — Select Your School"}
            </Text>
            <View style={styles.searchBar}>
              <Ionicons
                color={colors.textMuted}
                name="search-outline"
                size={18}
              />
              <TextInput
                autoCapitalize="none"
                placeholder="Search schools…"
                placeholderTextColor={colors.textPlaceholder}
                style={styles.searchInput}
                value={schoolSearch}
                onChangeText={setSchoolSearch}
              />
            </View>
          </View>

          {loadingSchools ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <FlatList
              data={filteredSchools}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const selected = selectedSchool?.id === item.id;
                return (
                  <Pressable
                    onPress={() => setSelectedSchool(item)}
                    style={[
                      styles.listItem,
                      selected && styles.listItemSelected,
                    ]}
                  >
                    <View style={styles.schoolInitials}>
                      <Text style={styles.schoolInitialsText}>
                        {item.name.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.listItemText}>
                      <Text style={styles.listItemName}>{item.name}</Text>
                      {item.address ? (
                        <Text style={styles.listItemSub}>{item.address}</Text>
                      ) : null}
                    </View>
                    {selected && (
                      <Ionicons
                        color={colors.accent}
                        name="checkmark-circle"
                        size={22}
                      />
                    )}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.emptyText}>No schools found</Text>
                </View>
              }
            />
          )}

          {error ? <Text style={styles.errorBottom}>{error}</Text> : null}
          <View style={styles.bottomBtn}>
            <Pressable
              onPress={nextStep}
              disabled={submitting || !selectedSchool}
              style={[styles.btn, (!selectedSchool || submitting) && styles.btnDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.btnText}>{role === "teacher" ? "Create Account" : "Continue"}</Text>
                  {role === "teacher" ? (
                    <Ionicons color="#fff" name="checkmark" size={18} />
                  ) : (
                    <Ionicons color="#fff" name="arrow-forward" size={18} />
                  )}
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}

      {/* Step 3 — Class selection */}
      {step === 3 && (
        <View style={styles.bodyFlex}>
          <View style={styles.searchWrap}>
            <Text style={styles.stepHint}>Step 3 of 3 — Select Your Class</Text>
            <Text style={styles.schoolBadge}>{selectedSchool?.name}</Text>
          </View>

          {loadingClasses ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <FlatList
              data={classes}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const selected = selectedClass?.id === item.id;
                return (
                  <Pressable
                    onPress={() => setSelectedClass(item)}
                    style={[
                      styles.listItem,
                      selected && styles.listItemSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.classIcon,
                        selected && styles.classIconSelected,
                      ]}
                    >
                      <Ionicons
                        color={selected ? "#fff" : colors.accent}
                        name="school-outline"
                        size={18}
                      />
                    </View>
                    <Text style={[styles.listItemName, styles.classItemName]}>
                      {item.name}
                    </Text>
                    {selected && (
                      <Ionicons
                        color={colors.accent}
                        name="checkmark-circle"
                        size={22}
                      />
                    )}
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.emptyText}>No classes available</Text>
                </View>
              }
            />
          )}

          {error ? <Text style={styles.errorBottom}>{error}</Text> : null}
          <View style={styles.bottomBtn}>
            <Pressable
              disabled={submitting}
              onPress={handleCreateAccount}
              style={[
                styles.btn,
                (!selectedClass || submitting) && styles.btnDisabled,
              ]}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.btnText}>Create Account</Text>
                  <Ionicons color="#fff" name="checkmark" size={18} />
                </>
              )}
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center", gap: 6 },
  headerTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },

  body: {
    flex: 1,
    width: "100%",
    maxWidth: 520,
    alignSelf: "center",
    padding: 24,
    gap: 20,
  },
  bodyFlex: { flex: 1, width: "100%", maxWidth: 520, alignSelf: "center" },
  stepHint: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  form: { gap: 16 },

  btn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  loginRow: { flexDirection: "row", justifyContent: "center", gap: 4 },
  loginText: { color: colors.textSecondary, fontSize: 14 },
  loginLink: { color: colors.accent, fontSize: 14, fontWeight: "700" },

  error: { color: "#EF4444", fontSize: 13, textAlign: "center" },
  errorBottom: {
    color: "#EF4444",
    fontSize: 13,
    textAlign: "center",
    marginHorizontal: 24,
    marginBottom: 8,
  },

  searchWrap: { padding: 20, gap: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary },

  listContent: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  listItemSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  schoolInitials: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  schoolInitialsText: {
    color: colors.accentDark,
    fontSize: 15,
    fontWeight: "800",
  },
  listItemText: { flex: 1, gap: 2 },
  listItemName: { color: colors.textPrimary, fontSize: 15, fontWeight: "700" },
  listItemSub: { color: colors.textMuted, fontSize: 12 },

  classIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  classIconSelected: { backgroundColor: colors.accent },
  classItemName: { flex: 1 },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: { color: colors.textMuted, fontSize: 14 },

  bottomBtn: { padding: 20, paddingBottom: 8 },
  schoolBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    color: colors.accentDark,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 13,
    fontWeight: "700",
    overflow: "hidden",
  },
});
