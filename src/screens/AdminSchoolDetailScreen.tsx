import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { deleteAdminSchool, getAdminSchool, getAdminSchoolClasses, updateAdminSchool, approveAdminSchool, rejectAdminSchool, suspendAdminSchool, reactivateAdminSchool } from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { AppTheme } from '../theme/AppTheme';
import { AppLogo } from '../components/ui/AppLogo';
import { ClassOut, SchoolOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'AdminSchoolDetail'>;

function SchoolHero({ school }: { school: SchoolOut }) {
  const initials = school.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();

  return (
    <View style={styles.hero}>
      <View style={styles.heroIconWrap}>
        <Text style={styles.heroInitials}>{initials}</Text>
      </View>
      <View style={styles.heroTextWrap}>
        <Text style={styles.institutionalLabel}>INSTITUTIONAL DETAIL</Text>
        <Text style={styles.heroName}>{school.name}</Text>
        {school.address ? (
          <View style={styles.heroAddrRow}>
            <Ionicons color={AppTheme.AppTheme.colors.textSecondary} name="location-outline" size={14} />
            <Text style={styles.heroAddr}>{school.address}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function AdminContact({ school }: { school: SchoolOut }) {
  if (!school.admin) {
    return (
      <View style={styles.adminCard}>
        <View style={styles.adminCardHeader}>
          <Ionicons color={AppTheme.AppTheme.colors.textSecondary} name="person-circle-outline" size={20} />
          <Text style={styles.adminCardTitle}>Admin Contact</Text>
        </View>
        <View style={styles.adminEmptyRow}>
          <Ionicons color={AppTheme.colors.warning} name="warning-outline" size={16} />
          <Text style={styles.adminEmptyText}>No admin assigned to this school yet.</Text>
        </View>
        <Text style={styles.adminEmptyHint}>
          Edit the school profile to set up administrator credentials.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.adminCard}>
      <View style={styles.adminCardHeader}>
        <Ionicons color={AppTheme.colors.primary} name="person-circle-outline" size={20} />
        <Text style={styles.adminCardTitle}>Admin Contact</Text>
      </View>

      <View style={styles.adminProfile}>
        <View style={styles.adminAvatar}>
          <Text style={styles.adminAvatarText}>
            {school.admin.name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2)}
          </Text>
        </View>
        <View style={styles.adminInfo}>
          <Text style={styles.adminName}>{school.admin.name}</Text>
          <Text style={styles.adminRole}>School Administrator</Text>
        </View>
      </View>

      <View style={styles.adminContactRow}>
        <View style={styles.adminContactItem}>
          <Ionicons color={AppTheme.AppTheme.colors.textSecondary} name="mail-outline" size={15} />
          <Text style={styles.adminContactText} numberOfLines={1}>
            {school.admin.email}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ClassRow({
  classItem,
  index,
  onPress,
}: {
  classItem: ClassOut;
  index: number;
  onPress: () => void;
}) {
  const bgColors = ['#D1E4FF', '#E8F7EE', '#FFF4E0', '#F5F0FF', '#FFE8EC'];
  const textColors = ['#0061A3', '#127A40', '#92400E', '#6B21A8', '#9B1239'];
  const colorIdx = index % bgColors.length;

  return (
    <Pressable onPress={onPress} style={styles.classRow}>
      <View style={[styles.classTag, { backgroundColor: bgColors[colorIdx] }]}>
        <Text style={[styles.classTagText, { color: textColors[colorIdx] }]}>
          {classItem.name.slice(0, 3).toUpperCase()}
        </Text>
      </View>
      <View style={styles.classInfo}>
        <Text style={styles.className}>{classItem.name}</Text>
        <Text style={styles.classDate}>
          Added {new Date(classItem.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <Ionicons color={AppTheme.AppTheme.colors.textSecondary} name="chevron-forward" size={16} />
    </Pressable>
  );
}

const showAlert = (title: string, message: string, buttons?: { text: string; onPress?: () => void; style?: string }[]) => {
  if (Platform.OS === 'web') {
    if (buttons && buttons.length > 1) {
      const confirmResult = window.confirm(`${title}\n\n${message}`);
      if (confirmResult) {
        const okBtn = buttons.find(b => b.style !== 'cancel');
        if (okBtn && okBtn.onPress) okBtn.onPress();
      } else {
        const cancelBtn = buttons.find(b => b.style === 'cancel');
        if (cancelBtn && cancelBtn.onPress) cancelBtn.onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
      if (buttons && buttons[0] && buttons[0].onPress) {
        buttons[0].onPress();
      }
    }
  } else {
    Alert.alert(title, message, buttons as any);
  }
};

export function AdminSchoolDetailScreen({ navigation, route }: Props) {
  const { session, signOut } = useAuth();
  const [school, setSchool] = useState<SchoolOut | null>(null);
  const [classes, setClasses] = useState<ClassOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Approval/Rejection Action States
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);

  // Edit modal state
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const load = async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      const [schoolData, classesData] = await Promise.all([
        getAdminSchool(session.token, route.params.schoolId),
        getAdminSchoolClasses(session.token, route.params.schoolId),
      ]);
      setSchool(schoolData);
      setClasses(classesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load school');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, [route.params.schoolId, session]); // eslint-disable-line react-hooks/exhaustive-deps

  const openEdit = () => {
    if (!school) return;
    setEditName(school.name);
    setEditAddress(school.address ?? '');
    setEditError(null);
    setShowEdit(true);
  };

  const handleEditSave = async () => {
    if (!session || !school) return;
    if (!editName.trim()) { setEditError('School name is required'); return; }
    setEditSaving(true);
    setEditError(null);
    try {
      const updated = await updateAdminSchool(session.token, school.id, {
        name: editName.trim(),
        address: editAddress.trim() || null,
      });
      setSchool(updated);
      setShowEdit(false);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Could not save changes');
    } finally {
      setEditSaving(false);
    }
  };


  const handleApprove = async () => {
    if (!session || !school) return;
    setActionLoading(true);
    try {
      const updated = await approveAdminSchool(session.token, school.id);
      setSchool(updated);
      showAlert('Success', 'School registration has been approved successfully.');
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Could not approve school');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!session || !school) return;
    setActionLoading(true);
    setRejectError(null);
    try {
      const updated = await rejectAdminSchool(session.token, school.id, rejectReason.trim() || undefined);
      setSchool(updated);
      setShowRejectModal(false);
      setRejectReason('');
      showAlert('Rejected', 'School registration request has been rejected.');
    } catch (e) {
      setRejectError(e instanceof Error ? e.message : 'Could not reject school');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = () => {
    if (!session || !school) return;
    showAlert(
      'Suspend School',
      `Are you sure you want to suspend "${school.name}"? The school admin and staff will lose access to the system.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Suspend',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const updated = await suspendAdminSchool(session.token, school.id);
              setSchool(updated);
              showAlert('Success', 'School has been suspended.');
            } catch (e) {
              showAlert('Error', e instanceof Error ? e.message : 'Could not suspend school');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleReactivate = async () => {
    if (!session || !school) return;
    setActionLoading(true);
    try {
      const updated = await reactivateAdminSchool(session.token, school.id);
      setSchool(updated);
      showAlert('Success', 'School has been reactivated successfully.');
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'Could not reactivate school');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = () => {
    if (!session || !school) return;
    setDeletePassword('');
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!session || !school) return;
    if (!deletePassword) {
      setDeleteError('Password is required');
      return;
    }
    setActionLoading(true);
    setDeleteError(null);
    try {
      await deleteAdminSchool(session.token, school.id, deletePassword);
      setShowDeleteModal(false);
      navigation.goBack();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete school');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
      {/* Global Header */}
      <View style={styles.globalHeader}>
        <View style={styles.headerLeft}>
           <AppLogo hideText size={24} />
        </View>
        <Text style={styles.headerTitle}>Super Admin</Text>
        <View style={styles.headerRight}>
          <Pressable onPress={signOut} style={styles.iconBtn}>
            <Ionicons color={AppTheme.AppTheme.colors.textPrimary} name="log-out-outline" size={24} />
          </Pressable>
        </View>
      </View>

      {/* Rejection Reason Modal */}
      <Modal animationType="slide" transparent visible={showRejectModal} onRequestClose={() => setShowRejectModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject School Registration</Text>
              <Pressable hitSlop={8} onPress={() => setShowRejectModal(false)}>
                <Ionicons color={AppTheme.AppTheme.colors.textSecondary} name="close" size={22} />
              </Pressable>
            </View>
            <Text style={styles.inputLabel}>Reason for Rejection (optional)</Text>
            <TextInput
              autoCapitalize="sentences"
              multiline
              numberOfLines={3}
              onChangeText={setRejectReason}
              placeholder="e.g. Invalid school info, unverified school email domain"
              placeholderTextColor={AppTheme.AppTheme.colors.textPlaceholder}
              style={[styles.input, styles.inputMultiline]}
              value={rejectReason}
            />
            {rejectError ? <Text style={styles.modalError}>{rejectError}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <Pressable
                onPress={() => setShowRejectModal(false)}
                style={[styles.modalCancelBtn, { flex: 1 }]}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={actionLoading}
                onPress={() => { void handleReject(); }}
                style={[styles.modalSaveBtn, { flex: 1, backgroundColor: AppTheme.colors.error }, actionLoading && { opacity: 0.6 }]}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Confirm Reject</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit School Modal */}
      <Modal animationType="slide" transparent visible={showEdit} onRequestClose={() => setShowEdit(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit School</Text>
              <Pressable hitSlop={8} onPress={() => setShowEdit(false)}>
                <Ionicons color={AppTheme.AppTheme.colors.textSecondary} name="close" size={22} />
              </Pressable>
            </View>
            <Text style={styles.inputLabel}>School Name *</Text>
            <TextInput
              autoCapitalize="words"
              onChangeText={setEditName}
              placeholder="School name"
              placeholderTextColor={AppTheme.AppTheme.colors.textPlaceholder}
              style={styles.input}
              value={editName}
            />
            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              autoCapitalize="sentences"
              multiline
              numberOfLines={2}
              onChangeText={setEditAddress}
              placeholder="School address (optional)"
              placeholderTextColor={AppTheme.AppTheme.colors.textPlaceholder}
              style={[styles.input, styles.inputMultiline]}
              value={editAddress}
            />
            {editError ? <Text style={styles.modalError}>{editError}</Text> : null}
            <Pressable
              disabled={editSaving}
              onPress={() => { void handleEditSave(); }}
              style={[styles.modalSaveBtn, editSaving && { opacity: 0.6 }]}
            >
              {editSaving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalSaveBtnText}>Save Changes</Text>
              )}
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Delete School Modal */}
      <Modal animationType="slide" transparent visible={showDeleteModal} onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Delete School</Text>
              <Pressable hitSlop={8} onPress={() => setShowDeleteModal(false)}>
                <Ionicons color={AppTheme.AppTheme.colors.textSecondary} name="close" size={22} />
              </Pressable>
            </View>
            <Text style={styles.modalBodyText}>
              Are you sure you want to permanently delete "{school?.name}"? This will remove all associated classes, subjects, teachers, students, and recordings.
            </Text>
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Admin Password *</Text>
            <TextInput
              secureTextEntry
              onChangeText={setDeletePassword}
              placeholder="••••••••"
              placeholderTextColor={AppTheme.AppTheme.colors.textPlaceholder}
              style={styles.input}
              value={deletePassword}
            />
            {deleteError ? <Text style={styles.modalError}>{deleteError}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
              <Pressable
                onPress={() => setShowDeleteModal(false)}
                style={[styles.modalCancelBtn, { flex: 1 }]}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={actionLoading}
                onPress={() => { void confirmDelete(); }}
                style={[styles.modalSaveBtn, { flex: 1, backgroundColor: AppTheme.colors.error }, actionLoading && { opacity: 0.6 }]}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Confirm Delete</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.centerContainer}>
            <View style={styles.body}>
              <Pressable onPress={() => navigation.goBack()} style={styles.backBtnRow}>
                <Ionicons name="arrow-back" size={20} color={AppTheme.AppTheme.colors.textSecondary} />
                <Text style={styles.backBtnText}>Back</Text>
              </Pressable>

              <View style={styles.titleRow}>
                <View>
                  <Text style={styles.breadcrumb}>DISTRICT MANAGEMENT</Text>
                  <Text style={styles.topTitle}>School Profile</Text>
                </View>
                {school ? (
                  <View style={styles.titleActions}>
                    {school.admin?.status === 'active' ? (
                      <Pressable onPress={handleSuspend} style={styles.actionBtn}>
                        <Ionicons color={AppTheme.colors.warning} name="ban-outline" size={20} />
                      </Pressable>
                    ) : null}
                    <Pressable onPress={openEdit} style={styles.actionBtn}>
                      <Ionicons color={AppTheme.AppTheme.colors.textPrimary} name="pencil-outline" size={20} />
                    </Pressable>
                    <Pressable onPress={handleDelete} style={styles.actionBtn}>
                      <Ionicons color={AppTheme.colors.error} name="trash-outline" size={20} />
                    </Pressable>
                  </View>
                ) : null}
              </View>

              {isLoading ? (
                <View style={styles.center}>
                  <ActivityIndicator color={AppTheme.colors.primary} size="large" />
                  <Text style={styles.loadingText}>Loading school profile…</Text>
                </View>
              ) : error ? (
                <View style={styles.center}>
                  <Ionicons color={AppTheme.AppTheme.colors.textSecondary} name="cloud-offline-outline" size={40} />
                  <Text style={styles.errorTitle}>Could not load school</Text>
                  <Text style={styles.errorBody}>{error}</Text>
                </View>
              ) : school ? (
                <>
                  {/* Hero */}
                  <SchoolHero school={school} />

                  {school.admin?.status === 'pending_approval' ? (
                    <View style={styles.approvalCard}>
                      <View style={styles.approvalHeader}>
                        <Ionicons color={AppTheme.colors.warning} name="shield-checkmark-outline" size={20} />
                        <Text style={styles.approvalTitle}>Registration Pending Approval</Text>
                      </View>
                      <Text style={styles.approvalText}>
                        This school was self-registered and is awaiting authorization before it can access the system.
                      </Text>
                      <View style={styles.approvalActions}>
                        <Pressable
                          onPress={handleApprove}
                          disabled={actionLoading}
                          style={[styles.approveBtn, actionLoading && { opacity: 0.6 }]}
                        >
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => setShowRejectModal(true)}
                          disabled={actionLoading}
                          style={[styles.rejectBtn, actionLoading && { opacity: 0.6 }]}
                        >
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : school.admin?.status === 'rejected' ? (
                    <View style={[styles.approvalCard, styles.rejectedCard]}>
                      <View style={styles.approvalHeader}>
                        <Ionicons color={AppTheme.colors.error} name="close-circle-outline" size={20} />
                        <Text style={[styles.approvalTitle, { color: AppTheme.colors.error }]}>Registration Rejected</Text>
                      </View>
                      <Text style={styles.approvalText}>
                        This school registration has been rejected.
                        {school.admin.rejected_reason ? `\n\nReason: "${school.admin.rejected_reason}"` : ''}
                      </Text>
                    </View>
                  ) : school.admin?.status === 'suspended' ? (
                    <View style={[styles.approvalCard, styles.suspendedCard]}>
                      <View style={styles.approvalHeader}>
                        <Ionicons color={AppTheme.AppTheme.colors.textSecondary} name="ban-outline" size={20} />
                        <Text style={[styles.approvalTitle, { color: AppTheme.AppTheme.colors.textSecondary }]}>Account Suspended</Text>
                      </View>
                      <Text style={styles.approvalText}>
                        This school's administrator account has been suspended. The admin and staff will not be able to log in.
                      </Text>
                      <View style={styles.approvalActions}>
                        <Pressable
                          onPress={handleReactivate}
                          disabled={actionLoading}
                          style={[styles.approveBtn, actionLoading && { opacity: 0.6 }]}
                        >
                          <Text style={styles.approveBtnText}>Reactivate</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}

                  {/* Admin Contact */}
                  <AdminContact school={school} />

                  {/* Academic Units */}
                  <View style={styles.unitsSection}>
                    <View style={styles.unitsSectionHeader}>
                      <Text style={styles.unitsSectionTitle}>Academic Units</Text>
                      <Text style={styles.unitsSectionSub}>
                        {classes.length > 0
                          ? `${classes.length} classes in this school`
                          : 'No classes added yet'}
                      </Text>
                    </View>

                    {classes.length > 0 ? (
                      <View style={styles.classTable}>
                        {/* Table header */}
                        <View style={styles.tableHeader}>
                          <Text style={[styles.tableHeaderText, { flex: 1 }]}>CLASS NAME</Text>
                          <Text style={styles.tableHeaderText}>ADDED</Text>
                        </View>

                        {classes.map((classItem, idx) => (
                          <View key={classItem.id}>
                            {idx > 0 ? <View style={styles.rowDivider} /> : null}
                            <ClassRow
                              classItem={classItem}
                              index={idx}
                              onPress={() => navigation.navigate('AdminClassDetail', {
                                schoolId: route.params.schoolId,
                                classId: classItem.id,
                                className: classItem.name,
                                schoolName: school.name,
                              })}
                            />
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View style={styles.emptyClasses}>
                        <Ionicons color={AppTheme.AppTheme.colors.textSecondary} name="school-outline" size={24} />
                        <Text style={styles.emptyClassesText}>
                          No academic classes have been added to this school yet.
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: AppTheme.AppTheme.colors.background,
  },
  globalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.m,
    backgroundColor: AppTheme.AppTheme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.AppTheme.colors.border,
  },
  headerLeft: { width: 60, alignItems: 'flex-start' },
  headerTitle: { flex: 1, textAlign: 'center', color: AppTheme.AppTheme.colors.textPrimary, ...AppTheme.typography.h3 },
  headerRight: { flexDirection: 'row', gap: AppTheme.spacing.s, width: 60, justifyContent: 'flex-end' },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  centerContainer: { flex: 1, alignItems: 'center', paddingHorizontal: AppTheme.spacing.l, paddingVertical: AppTheme.spacing.xl },
  body: { width: '100%', maxWidth: 800, gap: AppTheme.spacing.l },
  backBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, alignSelf: 'flex-start' },
  backBtnText: { color: AppTheme.AppTheme.colors.textSecondary, ...AppTheme.typography.body, fontWeight: '600' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  flex: { flex: 1 },
  breadcrumb: {
    color: AppTheme.AppTheme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  topTitle: {
    color: AppTheme.AppTheme.colors.textPrimary,
    ...AppTheme.typography.h1,
    marginTop: 4,
  },
  titleActions: { flexDirection: 'row', gap: 10 },
  actionBtn: { width: 40, height: 40, borderRadius: AppTheme.radius.medium, backgroundColor: AppTheme.AppTheme.colors.surface, borderWidth: 1, borderColor: AppTheme.AppTheme.colors.border, alignItems: 'center', justifyContent: 'center' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 40,
  },
  loadingText: {
    color: AppTheme.AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
  },
  errorTitle: {
    color: AppTheme.AppTheme.colors.textPrimary,
    ...AppTheme.typography.h3,
  },
  errorBody: {
    color: AppTheme.AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
    textAlign: 'center',
  },
  scroll: {
    flexGrow: 1,
  },
  // Hero
  hero: {
    backgroundColor: AppTheme.AppTheme.colors.surface,
    padding: AppTheme.spacing.xl,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.AppTheme.colors.border,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  heroIconWrap: {
    width: 88,
    height: 88,
    borderRadius: AppTheme.radius.large,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: AppTheme.AppTheme.colors.surface,
  },
  heroInitials: {
    color: AppTheme.colors.primary,
    ...AppTheme.typography.h1,
    fontSize: 36,
  },
  heroTextWrap: {
    alignItems: 'center',
    gap: 6,
  },
  institutionalLabel: {
    color: AppTheme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  heroName: {
    color: AppTheme.AppTheme.colors.textPrimary,
    ...AppTheme.typography.h2,
    textAlign: 'center',
  },
  heroAddrRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 2,
  },
  heroAddr: {
    color: AppTheme.AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
    textAlign: 'center',
    flex: 1,
  },

  // Admin contact
  adminCard: {
    backgroundColor: AppTheme.AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.AppTheme.colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  adminCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.AppTheme.colors.border,
    backgroundColor: AppTheme.AppTheme.colors.surface,
  },
  adminCardTitle: {
    color: AppTheme.AppTheme.colors.textPrimary,
    ...AppTheme.typography.body,
    fontWeight: '700',
  },
  adminProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.AppTheme.colors.border,
  },
  adminAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppTheme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminAvatarText: {
    color: AppTheme.colors.primary,
    fontSize: 16,
    fontWeight: '800',
  },
  adminInfo: {
    flex: 1,
    gap: 3,
  },
  adminName: {
    color: AppTheme.AppTheme.colors.textPrimary,
    ...AppTheme.typography.body,
    fontWeight: '700',
  },
  adminRole: {
    color: AppTheme.AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
  },
  adminContactRow: {
    padding: 16,
    gap: 12,
  },
  adminContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adminContactText: {
    color: AppTheme.AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
    flex: 1,
  },
  adminEmptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    paddingBottom: 4,
  },
  adminEmptyText: {
    color: AppTheme.AppTheme.colors.textPrimary,
    ...AppTheme.typography.body,
    fontWeight: '600',
  },
  adminEmptyHint: {
    color: AppTheme.AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  // Academic Units
  unitsSection: {
    gap: 12,
  },
  unitsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  unitsSectionTitle: {
    color: AppTheme.AppTheme.colors.textPrimary,
    ...AppTheme.typography.h3,
  },
  unitsSectionSub: {
    color: AppTheme.AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
  },
  classTable: {
    backgroundColor: AppTheme.AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.AppTheme.colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: AppTheme.AppTheme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.AppTheme.colors.border,
    gap: 12,
  },
  tableHeaderText: {
    color: AppTheme.AppTheme.colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  classRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  rowDivider: {
    height: 1,
    backgroundColor: AppTheme.AppTheme.colors.border,
    marginHorizontal: 16,
  },
  classTag: {
    width: 40,
    height: 40,
    borderRadius: AppTheme.radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classTagText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  classInfo: {
    flex: 1,
    gap: 3,
  },
  className: {
    color: AppTheme.AppTheme.colors.textPrimary,
    ...AppTheme.typography.body,
    fontWeight: '700',
  },
  classDate: {
    color: AppTheme.AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
  },
  emptyClasses: {
    backgroundColor: AppTheme.AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.AppTheme.colors.border,
    alignItems: 'center',
    padding: 32,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyClassesText: {
    color: AppTheme.AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
    textAlign: 'center',
  },
  approvalCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: AppTheme.radius.large,
    padding: 16,
    gap: 12,
  },
  rejectedCard: {
    backgroundColor: '#FDF2F2',
    borderColor: '#FDE8E8',
  },
  suspendedCard: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  approvalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  approvalTitle: {
    color: '#B45309',
    ...AppTheme.typography.body,
    fontWeight: '700',
  },
  approvalText: {
    color: AppTheme.AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
  },
  approvalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  approveBtn: {
    backgroundColor: AppTheme.colors.success,
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  approveBtnText: {
    color: '#fff',
    ...AppTheme.typography.button,
  },
  rejectBtn: {
    backgroundColor: AppTheme.AppTheme.colors.surface,
    borderColor: AppTheme.colors.error,
    borderWidth: 1,
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  rejectBtnText: {
    color: AppTheme.colors.error,
    ...AppTheme.typography.button,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalSheet: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: AppTheme.AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    padding: 24,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    color: AppTheme.AppTheme.colors.textPrimary,
    ...AppTheme.typography.h3,
  },
  modalBodyText: {
    color: AppTheme.AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
    lineHeight: 18,
    marginBottom: 8,
  },
  inputLabel: {
    color: AppTheme.AppTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  input: {
    backgroundColor: AppTheme.AppTheme.colors.background,
    borderWidth: 1,
    borderColor: AppTheme.AppTheme.colors.border,
    borderRadius: AppTheme.radius.medium,
    padding: 12,
    color: AppTheme.AppTheme.colors.textPrimary,
    ...AppTheme.typography.body,
    // @ts-ignore
    outlineStyle: 'none',
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalError: {
    color: AppTheme.colors.error,
    ...AppTheme.typography.caption,
  },
  modalSaveBtn: {
    backgroundColor: AppTheme.colors.primary,
    paddingVertical: 12,
    borderRadius: AppTheme.radius.medium,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSaveBtnText: {
    color: '#fff',
    ...AppTheme.typography.button,
  },
  modalCancelBtn: {
    backgroundColor: AppTheme.AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.AppTheme.colors.border,
    paddingVertical: 12,
    borderRadius: AppTheme.radius.medium,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelBtnText: {
    color: AppTheme.AppTheme.colors.textPrimary,
    ...AppTheme.typography.button,
  },
});
