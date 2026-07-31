const fs = require('fs');

let file = fs.readFileSync('src/screens/SchoolAdminSubjectChaptersScreen.tsx', 'utf8');
// Normalize line endings
file = file.replace(/\r\n/g, '\n');

// 1. Imports
file = file.replace(
  `import { RootStackParamList } from '../navigation/AppNavigator';\nimport { ScreenHeader } from '../components/common/ScreenHeader';`,
  `import { RootStackParamList } from '../navigation/AppNavigator';\nimport { AdminNavbar } from '../components/common/AdminNavbar';`
);

// 2. Header & SafeArea Replacement
file = file.replace(
  `    <SafeAreaView edges={['top']} style={styles.safe}>\n      <ScreenHeader\n        title={subjectName}\n        onBack={() => {\n          if (navigation.canGoBack()) {\n            navigation.goBack();\n          } else {\n            navigation.navigate("SchoolAdminClasses");\n          }\n        }}\n        rightActions={\n          <Pressable onPress={openCreateModal} hitSlop={8}>\n            <Ionicons color={AppTheme.colors.primary} name="add" size={24} />\n          </Pressable>\n        }\n      />`,
  `    <SafeAreaView edges={["top", "bottom"]} style={styles.safe}>\n      <AdminNavbar\n        title={subjectName}\n        onBack={() => {\n          if (navigation.canGoBack()) {\n            navigation.goBack();\n          } else {\n            navigation.navigate("SchoolAdminClasses");\n          }\n        }}\n        rightActions={\n          <Pressable onPress={openCreateModal} hitSlop={8}>\n            <Ionicons color={AppTheme.colors.primary} name="add" size={24} />\n          </Pressable>\n        }\n      />`
);

// 3. Layout and Header consistency
file = file.replace(
  `      <ScrollView\n        contentContainerStyle={styles.scroll}\n        refreshControl={\n          <RefreshControl\n            onRefresh={() => {\n              setRefreshing(true);\n              void load(true);\n            }}\n            refreshing={refreshing}\n            tintColor={AppTheme.colors.primary}\n          />\n        }\n        showsVerticalScrollIndicator={false}\n      >\n        {/* Page heading */}\n        <View style={styles.pageHeading}>`,
  `      <ScrollView\n        contentContainerStyle={styles.scroll}\n        refreshControl={\n          <RefreshControl\n            onRefresh={() => {\n              setRefreshing(true);\n              void load(true);\n            }}\n            refreshing={refreshing}\n            tintColor={AppTheme.colors.primary}\n          />\n        }\n        showsVerticalScrollIndicator={false}\n      >\n        <View style={styles.centerContainer}>\n          <View style={styles.body}>\n            {/* Page heading */}\n            <View style={styles.pageHeading}>`
);

// Close body and centerContainer before ScrollView
file = file.replace(
  `      </ScrollView>\n\n      {/* Create/Edit Chapter Modal */}`,
  `          </View>\n        </View>\n      </ScrollView>\n\n      {/* Create/Edit Chapter Modal */}`
);

// 4. Styles - Layout
file = file.replace(
  `  scroll: { paddingBottom: 48 },`,
  `  scroll: { flexGrow: 1 },\n  centerContainer: {\n    flex: 1,\n    alignItems: "center",\n    paddingHorizontal: AppTheme.spacing.l,\n    paddingVertical: AppTheme.spacing.xl,\n  },\n  body: {\n    width: "100%",\n    maxWidth: 800,\n    gap: AppTheme.spacing.l,\n  },`
);

file = file.replace(
  `  pageHeading: {\n    backgroundColor: AppTheme.colors.surface,\n    padding: 20,\n    borderBottomWidth: 1,\n    borderBottomColor: AppTheme.colors.border,\n    gap: 6,\n    marginBottom: 20,\n  },`,
  `  pageHeading: {\n    gap: AppTheme.spacing.s,\n    marginBottom: AppTheme.spacing.xs,\n  },`
);

// 5. Styles - Typography
file = file.replace(
  `  kicker: {\n    color: AppTheme.colors.primary,\n    fontSize: 11,\n    fontWeight: '700',\n    letterSpacing: 1.2,\n  },`,
  `  kicker: {\n    color: AppTheme.colors.primary,\n    ...AppTheme.typography.caption,\n    fontWeight: '700',\n    letterSpacing: 1.2,\n  },`
);

file = file.replace(
  `  pageTitle: {\n    color: AppTheme.colors.textPrimary,\n    fontSize: 28,\n    fontWeight: '800',\n    letterSpacing: -0.5,\n  },`,
  `  pageTitle: {\n    color: AppTheme.colors.textPrimary,\n    ...AppTheme.typography.heading1,\n  },`
);

file = file.replace(
  `  pageSubtitle: {\n    color: AppTheme.colors.textSecondary,\n    fontSize: 14,\n    lineHeight: 20,\n  },`,
  `  pageSubtitle: {\n    color: AppTheme.colors.textSecondary,\n    ...AppTheme.typography.body,\n  },`
);

// Chapter list styles
file = file.replace(
  `  chapterList: { paddingHorizontal: 20, gap: 16 },`,
  `  chapterList: { gap: 16 },`
);

file = file.replace(
  `  chapterCard: {\n    backgroundColor: AppTheme.colors.surface,\n    borderRadius: 18,\n    borderWidth: 1,\n    borderColor: AppTheme.colors.border,\n    padding: 16,\n    gap: 12,\n  },`,
  `  chapterCard: {\n    backgroundColor: AppTheme.colors.surface,\n    borderRadius: AppTheme.radius.large,\n    borderWidth: 1,\n    borderColor: AppTheme.colors.border,\n    padding: AppTheme.spacing.xl,\n    gap: 12,\n    ...AppTheme.shadows.subtle,\n  },`
);

file = file.replace(
  `  chapterName: {\n    fontSize: 16,\n    fontWeight: '700',\n    color: AppTheme.colors.textPrimary,\n  },`,
  `  chapterName: {\n    ...AppTheme.typography.bodyLarge,\n    fontWeight: '700',\n    color: AppTheme.colors.textPrimary,\n  },`
);

file = file.replace(
  `  chapterDesc: {\n    fontSize: 13,\n    color: AppTheme.colors.textSecondary,\n    lineHeight: 18,\n  },`,
  `  chapterDesc: {\n    ...AppTheme.typography.body,\n    color: AppTheme.colors.textSecondary,\n  },`
);

file = file.replace(
  `  footerStatText: { color: AppTheme.colors.textSecondary, fontSize: 12, fontWeight: '500' },`,
  `  footerStatText: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.caption, fontWeight: '500' },`
);

file = file.replace(
  `  footerDate: { color: AppTheme.colors.textSecondary, fontSize: 11, fontStyle: 'italic' },`,
  `  footerDate: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.caption, fontStyle: 'italic' },`
);

// Empty states typography
file = file.replace(
  `  loadingText: { color: AppTheme.colors.textSecondary, fontSize: 14 },`,
  `  loadingText: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body },`
);
file = file.replace(
  `  emptyTitle: { color: AppTheme.colors.textPrimary, fontSize: 16, fontWeight: '700' },`,
  `  emptyTitle: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.bodyLarge, fontWeight: '700' },`
);
file = file.replace(
  `  emptyBody: { color: AppTheme.colors.textSecondary, fontSize: 14, textAlign: 'center', maxWidth: '80%' },`,
  `  emptyBody: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.body, textAlign: 'center', maxWidth: '80%' },`
);
file = file.replace(
  `  createBtnInlineText: { color: '#fff', fontSize: 13, fontWeight: '700' },`,
  `  createBtnInlineText: { color: '#fff', ...AppTheme.typography.body, fontWeight: '700' },`
);

// Modal typography
file = file.replace(
  `  modalTitle: { color: AppTheme.colors.textPrimary, fontSize: 20, fontWeight: '800' },`,
  `  modalTitle: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.heading3 },`
);
file = file.replace(
  `  modalFieldLabel: {\n    color: AppTheme.colors.textSecondary,\n    fontSize: 11,\n    fontWeight: '700',\n    letterSpacing: 0.8,\n    textTransform: 'uppercase',\n  },`,
  `  modalFieldLabel: {\n    color: AppTheme.colors.textSecondary,\n    ...AppTheme.typography.caption,\n    fontWeight: '700',\n    letterSpacing: 0.8,\n    textTransform: 'uppercase',\n  },`
);
file = file.replace(
  `    borderColor: AppTheme.colors.border,\n    paddingHorizontal: 16,\n    fontSize: 16,\n    color: AppTheme.colors.textPrimary,\n  },`,
  `    borderColor: AppTheme.colors.border,\n    paddingHorizontal: 16,\n    ...AppTheme.typography.bodyLarge,\n    color: AppTheme.colors.textPrimary,\n  },`
);
file = file.replace(
  `  modalErrorText: { color: '#B42318', fontSize: 13, flex: 1 },`,
  `  modalErrorText: { color: '#B42318', ...AppTheme.typography.body, flex: 1 },`
);
file = file.replace(
  `  modalCancelText: {\n    color: AppTheme.colors.textSecondary,\n    fontWeight: '600',\n    fontSize: 15,\n  },`,
  `  modalCancelText: {\n    color: AppTheme.colors.textSecondary,\n    ...AppTheme.typography.button,\n  },`
);
file = file.replace(
  `  modalSubmitText: { color: '#fff', fontWeight: '700', fontSize: 15 },`,
  `  modalSubmitText: { color: '#fff', ...AppTheme.typography.button },`
);

fs.writeFileSync('src/screens/SchoolAdminSubjectChaptersScreen.tsx', file);
console.log('done fixing subject chapters UI');
