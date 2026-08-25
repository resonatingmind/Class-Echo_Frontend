import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  getAdminSchoolTeachers,
  inviteAdminSchoolTeachers,
  resendAdminSchoolAdminInvite,
  resendAdminTeacherInvite,
  revokeAdminTeacherInvite,
} from '../../lib/api';
import { AppTheme } from '../../theme/AppTheme';
import { SchoolOut, TeacherInviteResult, TeacherOut } from '../../types/api';

const EMAIL_RE = /\S+@\S+\.\S+/;

type InviteDraft = { key: string; name: string; email: string };

const STATUS_STYLES: Record<string, { label: string; color: string; background: string }> = {
  invited: { label: 'Invite sent', color: '#B45309', background: '#FFFBEB' },
  pending_approval: { label: 'Awaiting approval', color: '#B45309', background: '#FFFBEB' },
  active: { label: 'Active', color: '#127A40', background: '#E8F7EE' },
  suspended: { label: 'Suspended', color: '#6B7280', background: '#F3F4F6' },
  rejected: { label: 'Rejected', color: '#B42318', background: '#FDF2F2' },
};

function StatusPill({ status }: { status: string }) {
  const style = STATUS_STYLES[status] ?? {
    label: status,
    color: AppTheme.colors.textSecondary,
    background: '#F3F4F6',
  };
  return (
    <View style={[styles.pill, { backgroundColor: style.background }]}>
      <Text style={[styles.pillText, { color: style.color }]}>{style.label}</Text>
    </View>
  );
}

export function OrganisationTeachersSection({
  token,
  school,
}: {
  token: string;
  school: SchoolOut;
}) {
  const [teachers, setTeachers] = useState<TeacherOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Keyed by teacher id so only the row being acted on shows a spinner.
  const [rowBusy, setRowBusy] = useState<number | null>(null);
  const [adminBusy, setAdminBusy] = useState(false);

  const [showInvite, setShowInvite] = useState(false);
  const [drafts, setDrafts] = useState<InviteDraft[]>([]);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [inviteResults, setInviteResults] = useState<TeacherInviteResult[] | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setTeachers(await getAdminSchoolTeachers(token, school.id));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to load teachers');
    } finally {
      setIsLoading(false);
    }
  }, [token, school.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = useMemo(
    () => teachers.filter((t) => t.status === 'invited').length,
    [teachers],
  );

  const openInvite = () => {
    setDrafts([{ key: 'draft-0', name: '', email: '' }]);
    setInviteError(null);
    setInviteResults(null);
    setShowInvite(true);
  };

  const addDraft = () =>
    setDrafts((rows) => [...rows, { key: `draft-${rows.length}-${rows.length + 1}`, name: '', email: '' }]);

  const updateDraft = (key: string, patch: Partial<InviteDraft>) =>
    setDrafts((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const removeDraft = (key: string) =>
    setDrafts((rows) => (rows.length === 1 ? rows : rows.filter((r) => r.key !== key)));

  const filledDrafts = drafts.filter(
    (d) => d.name.trim().length > 0 || d.email.trim().length > 0,
  );
  const draftsValid =
    filledDrafts.length > 0 &&
    filledDrafts.every((d) => d.name.trim().length > 1 && EMAIL_RE.test(d.email.trim()));

  const handleInvite = async () => {
    if (!draftsValid || inviting) return;
    setInviting(true);
    setInviteError(null);
    try {
      const response = await inviteAdminSchoolTeachers(
        token,
        school.id,
        filledDrafts.map((d) => ({ name: d.name.trim(), email: d.email.trim() })),
      );
      // The endpoint reports per-address outcomes, so the modal stays open to
      // show which addresses were skipped rather than silently dropping them.
      setInviteResults(response.results);
      await load();
      if (response.skipped_count === 0) {
        setShowInvite(false);
        setNotice(
          `Invitation${response.invited_count === 1 ? '' : 's'} sent to ${response.invited_count} teacher${
            response.invited_count === 1 ? '' : 's'
          }.`,
        );
      }
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Could not send invitations');
    } finally {
      setInviting(false);
    }
  };

  const handleResendTeacher = async (teacher: TeacherOut) => {
    setRowBusy(teacher.id);
    setNotice(null);
    try {
      const res = await resendAdminTeacherInvite(token, school.id, teacher.id);
      setNotice(res.detail);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not resend the invitation');
    } finally {
      setRowBusy(null);
    }
  };

  const handleRevoke = async (teacher: TeacherOut) => {
    setRowBusy(teacher.id);
    setNotice(null);
    try {
      await revokeAdminTeacherInvite(token, school.id, teacher.id);
      setNotice(`Invitation to ${teacher.email} was withdrawn.`);
      await load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not withdraw the invitation');
    } finally {
      setRowBusy(null);
    }
  };

  const handleResendAdmin = async () => {
    setAdminBusy(true);
    setNotice(null);
    try {
      const res = await resendAdminSchoolAdminInvite(token, school.id);
      setNotice(res.detail);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not resend the invitation');
    } finally {
      setAdminBusy(false);
    }
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderText}>
          <Text style={styles.sectionTitle}>Teachers</Text>
          <Text style={styles.sectionSub}>
            {teachers.length === 0
              ? 'No teachers invited yet'
              : `${teachers.length} teacher${teachers.length === 1 ? '' : 's'}` +
                (pendingCount > 0 ? ` · ${pendingCount} awaiting acceptance` : '')}
          </Text>
        </View>
        <Pressable onPress={openInvite} style={styles.inviteBtn}>
          <Ionicons color="#fff" name="mail-outline" size={16} />
          <Text style={styles.inviteBtnText}>Invite teachers</Text>
        </Pressable>
      </View>

      {/* The school admin's own invite can also go unanswered, so it gets the
          same resend affordance as the teachers below it. */}
      {school.admin?.status === 'invited' ? (
        <View style={styles.adminPendingCard}>
          <Ionicons color="#B45309" name="time-outline" size={16} />
          <Text style={styles.adminPendingText}>
            {school.admin.name} has not accepted their school admin invitation yet.
          </Text>
          <Pressable
            disabled={adminBusy}
            onPress={() => void handleResendAdmin()}
            style={[styles.linkBtn, adminBusy && styles.disabled]}
          >
            <Text style={styles.linkBtnText}>{adminBusy ? 'Sending…' : 'Resend'}</Text>
          </Pressable>
        </View>
      ) : null}

      {notice ? (
        <View style={styles.noticeCard}>
          <Ionicons color="#127A40" name="checkmark-circle-outline" size={16} />
          <Text style={styles.noticeText}>{notice}</Text>
          <Pressable hitSlop={8} onPress={() => setNotice(null)}>
            <Ionicons color={AppTheme.colors.textSecondary} name="close" size={16} />
          </Pressable>
        </View>
      ) : null}

      {loadError ? (
        <View style={styles.errorCard}>
          <Ionicons color="#B42318" name="alert-circle-outline" size={16} />
          <Text style={styles.errorText}>{loadError}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={AppTheme.colors.primary} />
        </View>
      ) : teachers.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons color={AppTheme.colors.textSecondary} name="people-outline" size={24} />
          <Text style={styles.emptyText}>
            Invite teachers by email and they'll set their own password from the link.
          </Text>
        </View>
      ) : (
        <View style={styles.table}>
          {teachers.map((teacher, idx) => (
            <View key={teacher.id}>
              {idx > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {teacher.name
                      .split(' ')
                      .map((w) => w[0] ?? '')
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.rowInfo}>
                  <Text numberOfLines={1} style={styles.rowName}>
                    {teacher.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.rowEmail}>
                    {teacher.email}
                  </Text>
                </View>
                <StatusPill status={teacher.status} />
                {teacher.status === 'invited' ? (
                  rowBusy === teacher.id ? (
                    <ActivityIndicator color={AppTheme.colors.primary} size="small" />
                  ) : (
                    <View style={styles.rowActions}>
                      <Pressable
                        hitSlop={6}
                        onPress={() => void handleResendTeacher(teacher)}
                        style={styles.linkBtn}
                      >
                        <Text style={styles.linkBtnText}>Resend</Text>
                      </Pressable>
                      <Pressable
                        hitSlop={6}
                        onPress={() => void handleRevoke(teacher)}
                        style={styles.linkBtn}
                      >
                        <Text style={[styles.linkBtnText, styles.destructive]}>Revoke</Text>
                      </Pressable>
                    </View>
                  )
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}

      <Modal animationType="fade" transparent visible={showInvite}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite teachers</Text>
              <Pressable hitSlop={8} onPress={() => setShowInvite(false)}>
                <Ionicons color={AppTheme.colors.textSecondary} name="close" size={20} />
              </Pressable>
            </View>
            <Text style={styles.modalSub}>
              Each teacher receives an email inviting them to {school.name}.
            </Text>

            <ScrollView style={styles.modalScroll}>
              {drafts.map((draft, index) => (
                <View key={draft.key} style={styles.draftRow}>
                  <View style={styles.draftFields}>
                    <TextInput
                      autoCapitalize="words"
                      onChangeText={(v) => updateDraft(draft.key, { name: v })}
                      placeholder="Full name"
                      placeholderTextColor={AppTheme.colors.textPlaceholder}
                      style={styles.input}
                      value={draft.name}
                    />
                    <TextInput
                      autoCapitalize="none"
                      keyboardType="email-address"
                      onChangeText={(v) => updateDraft(draft.key, { email: v })}
                      placeholder="teacher@school.edu"
                      placeholderTextColor={AppTheme.colors.textPlaceholder}
                      style={styles.input}
                      textContentType="emailAddress"
                      value={draft.email}
                    />
                  </View>
                  <Pressable
                    accessibilityLabel={`Remove row ${index + 1}`}
                    disabled={drafts.length === 1}
                    hitSlop={8}
                    onPress={() => removeDraft(draft.key)}
                    style={[styles.removeBtn, drafts.length === 1 && styles.disabled]}
                  >
                    <Ionicons
                      color={AppTheme.colors.textSecondary}
                      name="trash-outline"
                      size={18}
                    />
                  </Pressable>
                </View>
              ))}

              <Pressable onPress={addDraft} style={styles.addBtn}>
                <Ionicons color={AppTheme.colors.primary} name="add" size={18} />
                <Text style={styles.addBtnText}>Add another</Text>
              </Pressable>

              {inviteResults ? (
                <View style={styles.resultsBox}>
                  {inviteResults.map((r) => (
                    <View key={r.email} style={styles.resultRow}>
                      <Ionicons
                        color={r.outcome === 'skipped' ? '#B45309' : '#127A40'}
                        name={
                          r.outcome === 'skipped'
                            ? 'alert-circle-outline'
                            : 'checkmark-circle-outline'
                        }
                        size={15}
                      />
                      <Text style={styles.resultText}>
                        <Text style={styles.resultEmail}>{r.email}</Text>
                        {r.outcome === 'skipped'
                          ? ` — skipped: ${r.reason ?? 'not invited'}`
                          : r.outcome === 'reinvited'
                            ? ' — new invitation sent'
                            : ' — invited'}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {inviteError ? (
                <View style={styles.errorCard}>
                  <Ionicons color="#B42318" name="alert-circle-outline" size={16} />
                  <Text style={styles.errorText}>{inviteError}</Text>
                </View>
              ) : null}
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowInvite(false)} style={styles.secondaryBtn}>
                <Text style={styles.secondaryBtnText}>
                  {inviteResults ? 'Done' : 'Cancel'}
                </Text>
              </Pressable>
              <Pressable
                disabled={!draftsValid || inviting}
                onPress={() => void handleInvite()}
                style={[styles.primaryBtn, (!draftsValid || inviting) && styles.disabled]}
              >
                <Text style={styles.primaryBtnText}>
                  {inviting ? 'Sending…' : 'Send invitations'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: AppTheme.spacing.m, marginTop: AppTheme.spacing.xxl },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: AppTheme.spacing.m,
    flexWrap: 'wrap',
  },
  sectionHeaderText: { flex: 1, minWidth: 200, gap: 2 },
  sectionTitle: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.heading3 },
  sectionSub: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.caption },
  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.m,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primary,
  },
  inviteBtnText: { color: '#fff', ...AppTheme.typography.label, fontWeight: '700' },
  adminPendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppTheme.spacing.s,
    padding: AppTheme.spacing.m,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: '#FCD34D',
    backgroundColor: '#FFFBEB',
  },
  adminPendingText: { flex: 1, color: '#92400E', ...AppTheme.typography.caption },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppTheme.spacing.s,
    padding: AppTheme.spacing.m,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    backgroundColor: '#E8F7EE',
  },
  noticeText: { flex: 1, color: '#127A40', ...AppTheme.typography.caption },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppTheme.spacing.s,
    padding: AppTheme.spacing.m,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: '#FDE8E8',
    backgroundColor: '#FDF2F2',
    marginTop: AppTheme.spacing.s,
  },
  errorText: { flex: 1, color: '#B42318', ...AppTheme.typography.caption },
  loadingBox: { paddingVertical: AppTheme.spacing.xxl, alignItems: 'center' },
  emptyBox: {
    alignItems: 'center',
    gap: AppTheme.spacing.s,
    paddingVertical: AppTheme.spacing.xxl,
    paddingHorizontal: AppTheme.spacing.l,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: AppTheme.colors.border,
  },
  emptyText: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.body,
    textAlign: 'center',
  },
  table: {
    borderRadius: AppTheme.radius.large,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    backgroundColor: AppTheme.colors.surface,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: AppTheme.colors.border },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppTheme.spacing.m,
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.m,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  avatarText: { color: AppTheme.colors.primary, ...AppTheme.typography.caption, fontWeight: '700' },
  rowInfo: { flex: 1, minWidth: 0, gap: 2 },
  rowName: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.label },
  rowEmail: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.caption },
  rowActions: { flexDirection: 'row', gap: AppTheme.spacing.m },
  pill: {
    paddingHorizontal: AppTheme.spacing.s,
    paddingVertical: 4,
    borderRadius: AppTheme.radius.pill,
  },
  pillText: { ...AppTheme.typography.caption, fontWeight: '700' },
  linkBtn: { paddingVertical: 2 },
  linkBtnText: { color: AppTheme.colors.primary, ...AppTheme.typography.caption, fontWeight: '700' },
  destructive: { color: '#B42318' },
  disabled: { opacity: 0.45 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: AppTheme.spacing.l,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    borderRadius: AppTheme.radius.large,
    backgroundColor: AppTheme.colors.surface,
    padding: AppTheme.spacing.xl,
    gap: AppTheme.spacing.s,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.heading3 },
  modalSub: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.caption },
  modalScroll: { marginVertical: AppTheme.spacing.m },
  draftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppTheme.spacing.s,
    marginBottom: AppTheme.spacing.m,
  },
  draftFields: { flex: 1, gap: AppTheme.spacing.s },
  input: {
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.m,
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.body,
  },
  removeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: AppTheme.spacing.m,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: AppTheme.colors.border,
  },
  addBtnText: { color: AppTheme.colors.primary, ...AppTheme.typography.body, fontWeight: '700' },
  resultsBox: { marginTop: AppTheme.spacing.m, gap: AppTheme.spacing.s },
  resultRow: { flexDirection: 'row', alignItems: 'flex-start', gap: AppTheme.spacing.s },
  resultText: { flex: 1, color: AppTheme.colors.textSecondary, ...AppTheme.typography.caption },
  resultEmail: { color: AppTheme.colors.textPrimary, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: AppTheme.spacing.m, justifyContent: 'flex-end' },
  secondaryBtn: {
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.m,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  secondaryBtnText: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.label },
  primaryBtn: {
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.m,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primary,
  },
  primaryBtnText: { color: '#fff', ...AppTheme.typography.label, fontWeight: '700' },
});
