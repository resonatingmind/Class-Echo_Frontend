const fs = require('fs');

let file = fs.readFileSync('src/screens/SchoolAdminClassDetailScreen.tsx', 'utf8');
// Normalize line endings to \n
file = file.replace(/\r\n/g, '\n');

// 1. Imports
file = file.replace(
  `import { RootStackParamList } from '../navigation/AppNavigator';\nimport { ScreenHeader } from '../components/common/ScreenHeader';`,
  `import { RootStackParamList } from '../navigation/AppNavigator';\nimport { AdminNavbar } from '../components/common/AdminNavbar';\nimport { SelectDropdown } from '../components/ui/SelectDropdown';\nimport { CLASS_NAME_OPTIONS, SECTION_OPTIONS } from '../constants';`
);

// 2. State
file = file.replace(
  `  const { classId, className } = route.params;\n\n  const [subjects, setSubjects] = useState<SubjectOut[]>([]);`,
  `  const { classId, className, section } = route.params;\n\n  const [subjects, setSubjects] = useState<SubjectOut[]>([]);`
);

file = file.replace(
  `  const [editClassName, setEditClassName] = useState(className);\n  const [editingClass, setEditingClass] = useState(false);`,
  `  const [editClassName, setEditClassName] = useState(className);\n  const [editClassSection, setEditClassSection] = useState(section || "");\n  const [editingClass, setEditingClass] = useState(false);`
);

// 3. Save Edit Class
file = file.replace(
  `  const handleEditClassSave = async () => {\n    if (!session || !editClassName.trim() || editingClass) return;\n    setEditingClass(true);\n    setEditClassError(null);\n    try {\n      await updateSchoolAdminClass(session.token, classId, { name: editClassName.trim() });\n      await load(true);\n      setShowEditClass(false);\n      navigation.setParams({ className: editClassName.trim() } as never);\n    } catch (e) {`,
  `  const handleEditClassSave = async () => {\n    if (!session || !editClassName.trim() || !editClassSection.trim() || editingClass) return;\n    setEditingClass(true);\n    setEditClassError(null);\n    try {\n      await updateSchoolAdminClass(session.token, classId, { \n        name: editClassName.trim(),\n        section: editClassSection.trim()\n      });\n      await load(true);\n      setShowEditClass(false);\n      navigation.setParams({ \n        className: editClassName.trim(),\n        section: editClassSection.trim() \n      } as never);\n    } catch (e) {`
);

// 4. Header & SafeArea Replacement
file = file.replace(
  `    <SafeAreaView edges={[]} style={styles.safe}>\n      <ScreenHeader\n        title={className}\n        onBack={() => {\n          if (navigation.canGoBack()) navigation.goBack();\n          else navigation.navigate("SchoolAdminClasses");\n        }}\n        rightActions={\n          <View style={styles.avatarCircle}>\n            <Ionicons color={AppTheme.colors.primary} name="person" size={16} />\n          </View>\n        }\n      />`,
  `    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>\n      <AdminNavbar\n        title={\`\${className} \${section || ""}\`}\n        onBack={() => {\n          if (navigation.canGoBack()) navigation.goBack();\n          else navigation.navigate("SchoolAdminClasses");\n        }}\n      />`
);

// 5. Open Edit Modal
file = file.replace(
  `            <Pressable\n              onPress={() => {\n                setEditClassName(className);\n                setEditClassError(null);\n                setShowEditClass(true);\n              }}`,
  `            <Pressable\n              onPress={() => {\n                setEditClassName(className);\n                setEditClassSection(section || "");\n                setEditClassError(null);\n                setShowEditClass(true);\n              }}`
);

// 6. Modal Inputs
file = file.replace(
  `            <Text style={styles.modalTitle}>Edit Class</Text>\n            <View style={styles.modalField}>\n              <Text style={styles.modalFieldLabel}>CLASS NAME</Text>\n              <TextInput\n                autoCapitalize="words"\n                autoFocus\n                onChangeText={setEditClassName}\n                onSubmitEditing={handleEditClassSave}\n                placeholder="e.g. Class 10B"\n                placeholderTextColor={AppTheme.colors.textPlaceholder}\n                returnKeyType="done"\n                style={styles.modalInput}\n                value={editClassName}\n              />\n            </View>\n            {editClassError ? (`,
  `            <Text style={styles.modalTitle}>Edit Class</Text>\n            <SelectDropdown\n              label="CLASS NAME"\n              placeholder="Select a class"\n              options={CLASS_NAME_OPTIONS}\n              value={editClassName}\n              onChange={setEditClassName}\n            />\n            <SelectDropdown\n              label="SECTION"\n              placeholder="Select a section"\n              options={SECTION_OPTIONS}\n              value={editClassSection}\n              onChange={setEditClassSection}\n            />\n            {editClassError ? (`
);

// 7. Modal Save Button
file = file.replace(
  `              <Pressable\n                disabled={!editClassName.trim() || editingClass}\n                onPress={handleEditClassSave}\n                style={[\n                  styles.modalSubmitBtn,\n                  (!editClassName.trim() || editingClass) && styles.btnDisabled,\n                ]}\n              >`,
  `              <Pressable\n                disabled={!editClassName.trim() || !editClassSection.trim() || editingClass}\n                onPress={handleEditClassSave}\n                style={[\n                  styles.modalSubmitBtn,\n                  (!editClassName.trim() || !editClassSection.trim() || editingClass) && styles.btnDisabled,\n                ]}\n              >`
);

// 8. Layout and Header consistency
file = file.replace(
  `      <ScrollView\n        contentContainerStyle={styles.scroll}\n        refreshControl={\n          <RefreshControl\n            onRefresh={onRefresh}\n            refreshing={refreshing}\n            tintColor={AppTheme.colors.primary}\n          />\n        }\n        showsVerticalScrollIndicator={false}\n      >\n        {/* Page heading */}\n        <View style={styles.pageHeading}>`,
  `      <ScrollView\n        contentContainerStyle={styles.scroll}\n        refreshControl={\n          <RefreshControl\n            onRefresh={onRefresh}\n            refreshing={refreshing}\n            tintColor={AppTheme.colors.primary}\n          />\n        }\n        showsVerticalScrollIndicator={false}\n      >\n        <View style={styles.centerContainer}>\n          <View style={styles.body}>\n            {/* Page heading */}\n            <View style={styles.pageHeading}>`
);

file = file.replace(
  `        {/* Stats strip */}\n        <View style={styles.statsRow}>\n          <View style={styles.statCard}>\n            <Text style={styles.statValue}>{subjects.length}</Text>\n            <Text style={styles.statLabel}>SUBJECTS</Text>\n          </View>\n          <View style={styles.statCard}>\n            <Text style={styles.statValue}>\n              {subjects.filter((s) => s.teacher_id !== null).length}\n            </Text>\n            <Text style={styles.statLabel}>ASSIGNED</Text>\n          </View>\n          <View style={styles.statCard}>\n            <Text\n              style={[\n                styles.statValue,\n                subjects.filter((s) => !s.teacher_id).length > 0 &&\n                  styles.statValueWarn,\n              ]}\n            >\n              {subjects.filter((s) => !s.teacher_id).length}\n            </Text>\n            <Text style={styles.statLabel}>UNASSIGNED</Text>\n          </View>\n        </View>`,
  `        {/* Stats strip */}\n            <View style={styles.statsGrid}>\n              <View style={styles.statCard}>\n                <Text style={styles.statNumber}>{subjects.length}</Text>\n                <Text style={styles.statLabel}>Subjects</Text>\n              </View>\n              <View style={styles.statCard}>\n                <Text style={styles.statNumber}>\n                  {subjects.filter((s) => s.teacher_id !== null).length}\n                </Text>\n                <Text style={styles.statLabel}>Assigned</Text>\n              </View>\n              <View style={styles.statCard}>\n                <Text\n                  style={[\n                    styles.statNumber,\n                    subjects.filter((s) => !s.teacher_id).length > 0 &&\n                      styles.statNumberWarn,\n                  ]}\n                >\n                  {subjects.filter((s) => !s.teacher_id).length}\n                </Text>\n                <Text style={styles.statLabel}>Unassigned</Text>\n              </View>\n            </View>`
);

file = file.replace(
  `              )}\n            </View>\n          )}\n        </View>\n      </ScrollView>`,
  `              )}\n            </View>\n          )}\n          </View>\n        </View>\n      </ScrollView>`
);

// 9. Typography and Styles fixes
file = file.replace(
  `  academicLabel: {\n    color: AppTheme.colors.primary,\n    fontSize: 11,\n    fontWeight: "700",\n    letterSpacing: 1.2,\n  },`,
  `  academicLabel: {\n    color: AppTheme.colors.primary,\n    ...AppTheme.typography.caption,\n    fontWeight: "700",\n    letterSpacing: 1.2,\n  },`
);

file = file.replace(
  `  pageTitle: {\n    color: AppTheme.colors.textPrimary,\n    fontSize: 26,\n    fontWeight: "800",\n    letterSpacing: -0.5,\n  },`,
  `  pageTitle: {\n    color: AppTheme.colors.textPrimary,\n    ...AppTheme.typography.heading1,\n  },`
);

file = file.replace(
  `  editClassText: {\n    color: AppTheme.colors.textSecondary,\n    fontSize: 13,\n    fontWeight: "600",\n  },`,
  `  editClassText: {\n    color: AppTheme.colors.textSecondary,\n    ...AppTheme.typography.body,\n    fontWeight: "600",\n  },`
);

file = file.replace(
  `  addSubjectText: { color: "#fff", fontSize: 13, fontWeight: "700" },`,
  `  addSubjectText: { color: "#fff", ...AppTheme.typography.body, fontWeight: "700" },`
);

file = file.replace(
  `  sectionTitle: { color: AppTheme.colors.textPrimary, fontSize: 18, fontWeight: "800" },`,
  `  sectionTitle: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.heading3, marginTop: AppTheme.spacing.s },`
);

file = file.replace(
  `  subjectIconText: { fontSize: 18, fontWeight: "800" },\n  subjectInfo: { flex: 1, gap: 4 },\n  subjectName: { color: AppTheme.colors.textPrimary, fontSize: 16, fontWeight: "700" },\n  subjectMeta: { color: AppTheme.colors.textSecondary, fontSize: 12 },`,
  `  subjectIconText: { ...AppTheme.typography.heading3 },\n  subjectInfo: { flex: 1, gap: 4 },\n  subjectName: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.bodyLarge, fontWeight: "700" },\n  subjectMeta: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.caption },`
);

file = file.replace(
  `  miniAvatarText: { color: AppTheme.colors.primaryDark, fontSize: 10, fontWeight: "800" },\n  assignedTeacherText: {\n    color: AppTheme.colors.textPrimary,\n    fontSize: 13,\n    fontWeight: "600",\n    flex: 1,\n  },`,
  `  miniAvatarText: { color: AppTheme.colors.primaryDark, ...AppTheme.typography.caption, fontSize: 10, fontWeight: "800" },\n  assignedTeacherText: {\n    color: AppTheme.colors.textPrimary,\n    ...AppTheme.typography.body,\n    fontWeight: "600",\n    flex: 1,\n  },`
);

file = file.replace(
  `  unassignedText: { color: AppTheme.colors.textSecondary, fontSize: 13 },`,
  `  unassignedText: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body },`
);

file = file.replace(
  `  assignBtnText: { color: AppTheme.colors.primary, fontSize: 12, fontWeight: "700" },`,
  `  assignBtnText: { color: AppTheme.colors.primary, ...AppTheme.typography.caption, fontWeight: "700" },`
);

file = file.replace(
  `  loadingText: { color: AppTheme.colors.textSecondary, fontSize: 14 },\n  emptyTitle: { color: AppTheme.colors.textPrimary, fontSize: 16, fontWeight: "700" },\n  emptyBody: { color: AppTheme.colors.textSecondary, fontSize: 14, textAlign: "center" },`,
  `  loadingText: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body },\n  emptyTitle: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.bodyLarge, fontWeight: "700" },\n  emptyBody: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body, textAlign: "center" },`
);

file = file.replace(
  `  modalTitle: { color: AppTheme.colors.textPrimary, fontSize: 20, fontWeight: "800" },\n  modalSubtitle: { color: AppTheme.colors.textSecondary, fontSize: 14, lineHeight: 20 },\n  modalField: { gap: 8 },\n  modalFieldLabel: {\n    color: AppTheme.colors.textSecondary,\n    fontSize: 11,\n    fontWeight: "700",\n    letterSpacing: 0.8,\n    textTransform: "uppercase",\n  },`,
  `  modalTitle: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.heading3 },\n  modalSubtitle: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body },\n  modalField: { gap: 8 },\n  modalFieldLabel: {\n    color: AppTheme.colors.textSecondary,\n    ...AppTheme.typography.caption,\n    fontWeight: "700",\n    letterSpacing: 0.8,\n    textTransform: "uppercase",\n  },`
);

file = file.replace(
  `    borderColor: AppTheme.colors.border,\n    paddingHorizontal: 16,\n    fontSize: 16,\n    color: AppTheme.colors.textPrimary,\n  },`,
  `    borderColor: AppTheme.colors.border,\n    paddingHorizontal: 16,\n    ...AppTheme.typography.bodyLarge,\n    color: AppTheme.colors.textPrimary,\n  },`
);

file = file.replace(
  `  modalErrorText: { color: "#B42318", fontSize: 13, flex: 1 },\n  modalActions: { flexDirection: "row", gap: 12, marginTop: 4 },\n  modalCancelBtn: {\n    flex: 1,\n    height: 50,\n    borderRadius: AppTheme.radius.medium,\n    borderWidth: 1.5,\n    borderColor: AppTheme.colors.border,\n    alignItems: "center",\n    justifyContent: "center",\n  },\n  modalCancelText: {\n    color: AppTheme.colors.textSecondary,\n    fontWeight: "600",\n    fontSize: 15,\n  },\n  modalSubmitBtn: {\n    flex: 1,\n    height: 50,\n    borderRadius: AppTheme.radius.medium,\n    backgroundColor: AppTheme.colors.primary,\n    alignItems: "center",\n    justifyContent: "center",\n  },\n  btnDisabled: { opacity: 0.45 },\n  modalSubmitText: { color: "#fff", fontWeight: "700", fontSize: 15 },`,
  `  modalErrorText: { color: "#B42318", ...AppTheme.typography.body, flex: 1 },\n  modalActions: { flexDirection: "row", gap: 12, marginTop: 4 },\n  modalCancelBtn: {\n    flex: 1,\n    height: 50,\n    borderRadius: AppTheme.radius.medium,\n    borderWidth: 1.5,\n    borderColor: AppTheme.colors.border,\n    alignItems: "center",\n    justifyContent: "center",\n  },\n  modalCancelText: {\n    color: AppTheme.colors.textSecondary,\n    ...AppTheme.typography.button,\n  },\n  modalSubmitBtn: {\n    flex: 1,\n    height: 50,\n    borderRadius: AppTheme.radius.medium,\n    backgroundColor: AppTheme.colors.primary,\n    alignItems: "center",\n    justifyContent: "center",\n  },\n  btnDisabled: { opacity: 0.45 },\n  modalSubmitText: { color: "#fff", ...AppTheme.typography.button },`
);

file = file.replace(
  `  searchInput: {\n    flex: 1,\n    paddingVertical: 12,\n    paddingHorizontal: 10,\n    fontSize: 16,\n  },`,
  `  searchInput: {\n    flex: 1,\n    paddingVertical: 12,\n    paddingHorizontal: 10,\n    ...AppTheme.typography.bodyLarge,\n  },`
);

file = file.replace(
  `  filterText: {\n    color: AppTheme.colors.textPrimary,\n    fontWeight: "600",\n  },`,
  `  filterText: {\n    color: AppTheme.colors.textPrimary,\n    ...AppTheme.typography.body,\n    fontWeight: "600",\n  },`
);

file = file.replace(
  `  scroll: { paddingBottom: 48, gap: 0 },`,
  `  scroll: { flexGrow: 1 },\n  centerContainer: {\n    flex: 1,\n    alignItems: "center",\n    paddingHorizontal: AppTheme.spacing.l,\n    paddingVertical: AppTheme.spacing.xl,\n  },\n  body: {\n    width: "100%",\n    maxWidth: 800,\n    gap: AppTheme.spacing.l,\n  },`
);

file = file.replace(
  `  pageHeading: {\n    backgroundColor: AppTheme.colors.surface,\n    padding: 20,\n    borderBottomWidth: 1,\n    borderBottomColor: AppTheme.colors.border,\n    gap: 8,\n  },`,
  `  pageHeading: {\n    gap: AppTheme.spacing.s,\n    marginBottom: AppTheme.spacing.xs,\n  },`
);

file = file.replace(
  `  statsRow: {\n    flexDirection: "row",\n    backgroundColor: AppTheme.colors.surface,\n    borderBottomWidth: 1,\n    borderBottomColor: AppTheme.colors.border,\n    paddingVertical: 16,\n    paddingHorizontal: 20,\n    gap: 16,\n  },`,
  `  statsGrid: {\n    flexDirection: "row",\n    gap: AppTheme.spacing.m,\n  },`
);

file = file.replace(
  `  statCard: {\n    flex: 1,\n    backgroundColor: AppTheme.colors.background,\n    borderRadius: AppTheme.radius.medium,\n    padding: 12,\n    alignItems: "center",\n    borderWidth: 1,\n    borderColor: AppTheme.colors.border,\n  },`,
  `  statCard: {\n    flex: 1,\n    backgroundColor: AppTheme.colors.surface,\n    borderRadius: AppTheme.radius.large,\n    padding: AppTheme.spacing.xl,\n    alignItems: "center",\n    borderWidth: 1,\n    borderColor: AppTheme.colors.border,\n  },`
);

file = file.replace(
  `  statValue: { color: AppTheme.colors.textPrimary, fontSize: 24, fontWeight: "800" },\n  statValueWarn: { color: AppTheme.colors.warning },\n  statLabel: { color: AppTheme.colors.textSecondary, fontSize: 10, fontWeight: "700", marginTop: 4 },`,
  `  statNumber: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.display },\n  statNumberWarn: { color: AppTheme.colors.warning },\n  statLabel: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body, marginTop: AppTheme.spacing.xs },`
);

file = file.replace(
  `  subjectsSection: { paddingHorizontal: 20, gap: 14 },`,
  `  subjectsSection: { gap: 14 },`
);

fs.writeFileSync('src/screens/SchoolAdminClassDetailScreen.tsx', file);
console.log('done layout script execution');
