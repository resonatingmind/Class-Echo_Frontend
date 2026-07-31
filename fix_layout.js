const fs = require('fs');
let file = fs.readFileSync('src/screens/SchoolAdminClassDetailScreen.tsx', 'utf8');

// 1. Fix SafeAreaView edges
file = file.replace(/<SafeAreaView edges=\{\[\]\} style=\{styles\.safe\}>/g, '<SafeAreaView edges={["top", "bottom"]} style={styles.safe}>');

// 2. Replace ScreenHeader with AdminNavbar
file = file.replace(/<ScreenHeader[\s\S]*?\/>/, `<AdminNavbar
        title={\`\${className} - Section \${section}\`}
        onBack={() => {
          if (navigation.canGoBack()) navigation.goBack();
          else navigation.navigate("SchoolAdminClasses");
        }}
      />`);

// 3. Add AdminNavbar import if missing
if (!file.includes('import { AdminNavbar }')) {
  file = file.replace(
    /import \{ ScreenHeader \} from '\.\.\/components\/common\/ScreenHeader';/,
    `import { AdminNavbar } from '../components/common/AdminNavbar';`
  );
}

// 4. CenterContainer wrapper inside ScrollView
if (!file.includes('<View style={styles.centerContainer}>')) {
  file = file.replace(
    /\{?\/\* Page heading \*\/\}?/,
    `<View style={styles.centerContainer}>
          <View style={styles.body}>
            {/* Page heading */}`
  );
  // Add closing views before ScrollView closes
  file = file.replace(
    /(\s*)<\/ScrollView>/,
    `$1  </View>
$1</View>
$1</ScrollView>`
  );
}

// 5. Replace statsRow with statsGrid
file = file.replace(/<View style=\{styles\.statsRow\}>/g, '<View style={styles.statsGrid}>');
file = file.replace(/styles\.statsRow/g, 'styles.statsGrid');

// 6. Replace statValue with statNumber
file = file.replace(/styles\.statValue/g, 'styles.statNumber');
file = file.replace(/statValueWarn/g, 'statNumberWarn');

// 7. Update stats section text labels to Title Case
file = file.replace(/>SUBJECTS<\/Text>/g, '>Subjects</Text>');
file = file.replace(/>ASSIGNED<\/Text>/g, '>Assigned</Text>');
file = file.replace(/>UNASSIGNED<\/Text>/g, '>Unassigned</Text>');

// 8. Fix editClass open modal to include section (since I might have missed it in previous script if it didn't match)
file = file.replace(
  /onPress=\{\(\) => \{\s*setEditClassName\(className\);\s*setEditClassError\(null\);\s*setShowEditClass\(true\);\s*\}\}/g,
  `onPress={() => {
                setEditClassName(className);
                setEditClassSection(section || "");
                setEditClassError(null);
                setShowEditClass(true);
              }}`
);

// 9. Fix styles
// statCard
file = file.replace(
  /statCard: \{[\s\S]*?\},/,
  `statCard: {
    flex: 1,
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    padding: AppTheme.spacing.xl,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },`
);

// statsRow to statsGrid in styles
file = file.replace(
  /statsRow: \{[\s\S]*?gap: 16,\n  \},/,
  `statsGrid: {
    flexDirection: "row",
    gap: AppTheme.spacing.m,
  },`
);

// statValue to statNumber in styles
file = file.replace(
  /statValue: \{ color: AppTheme\.colors\.textPrimary, fontSize: 24, fontWeight: "800" \},\n  statValueWarn: \{ color: AppTheme\.colors\.warning \},\n  statLabel: \{ color: AppTheme\.colors\.textSecondary, fontSize: 10, fontWeight: "700", marginTop: 4 \},/,
  `statNumber: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.display },
  statNumberWarn: { color: AppTheme.colors.warning },
  statLabel: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body, marginTop: AppTheme.spacing.xs },`
);

// pageHeading style
file = file.replace(
  /pageHeading: \{\n    backgroundColor: AppTheme\.colors\.surface,\n    padding: 20,\n    borderBottomWidth: 1,\n    borderBottomColor: AppTheme\.colors\.border,\n    gap: 8,\n  \},/,
  `pageHeading: {
    gap: AppTheme.spacing.s,
    marginBottom: AppTheme.spacing.xs,
  },`
);

// subjectsSection style
file = file.replace(
  /subjectsSection: \{ paddingHorizontal: 20, gap: 14 \},/,
  `subjectsSection: { gap: 14 },`
);

// scroll style
file = file.replace(
  /scroll: \{ paddingBottom: 48, gap: 0 \},/,
  `scroll: { flexGrow: 1 },
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
  },`
);

fs.writeFileSync('src/screens/SchoolAdminClassDetailScreen.tsx', file);
console.log('done layout fix');
