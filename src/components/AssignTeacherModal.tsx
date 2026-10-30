import { AppTheme } from '../theme/AppTheme';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useAuth } from '../context/AuthContext';
import { assignTeacherToSubject } from '../lib/api';
import { colors } from '../theme/colors';
import { SubjectOut, TeacherOut } from '../types/api';

// Shared by the Class Detail and Planner screens so there is a single UI for
// assigning an existing teacher to an existing subject, instead of each
// screen rolling its own picker.
type Props = {
  visible: boolean;
  subjectId: number | null;
  subjectName: string;
  currentTeacherId: number | null;
  teachers: TeacherOut[];
  onClose: () => void;
  onAssigned: (updated: SubjectOut) => void;
};

export function AssignTeacherModal({
  visible,
  subjectId,
  subjectName,
  currentTeacherId,
  teachers,
  onClose,
  onAssigned,
}: Props) {
  const { session } = useAuth();
  const [assigningId, setAssigningId] = useState<number | null>(null);
  const [unassigning, setUnassigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async (teacherId: number | null) => {
    if (!session || !subjectId || assigningId || unassigning) return;
    if (teacherId === null) {
      setUnassigning(true);
    } else {
      setAssigningId(teacherId);
    }
    setError(null);
    try {
      const updated = await assignTeacherToSubject(session.token, subjectId, teacherId);
      onAssigned(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to assign teacher');
    } finally {
      setAssigningId(null);
      setUnassigning(false);
    }
  };

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable onPress={onClose} style={styles.modalOverlay}>
        <Pressable style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Assign Teacher</Text>
          {subjectName ? (
            <Text style={styles.modalSubtitle}>
              Assign a faculty member to <Text style={{ fontWeight: '700' }}>{subjectName}</Text>.
            </Text>
          ) : null}

          {error ? (
            <View style={styles.modalError}>
              <Ionicons color={AppTheme.colors.dangerText} name="alert-circle-outline" size={14} />
              <Text style={styles.modalErrorText}>{error}</Text>
            </View>
          ) : null}

          {currentTeacherId !== null ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => handleAssign(null)}
              disabled={assigningId !== null || unassigning}
              style={styles.unassignBtn}
            >
              {unassigning ? (
                <ActivityIndicator color={AppTheme.colors.dangerText} size="small" />
              ) : (
                <>
                  <Ionicons name="person-remove-outline" size={16} color={AppTheme.colors.dangerText} />
                  <Text style={styles.unassignBtnText}>Unassign Current Teacher</Text>
                </>
              )}
            </Pressable>
          ) : null}

          {teachers.length === 0 ? (
            <View style={styles.noTeachersBox}>
              <Ionicons color={AppTheme.colors.textSecondary} name="people-outline" size={32} />
              <Text style={styles.noTeachersText}>
                No teachers available. Add faculty from the Teachers tab first.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.teacherList} showsVerticalScrollIndicator={false}>
              {teachers.map((teacher) => {
                const isCurrentTeacher = currentTeacherId === teacher.id;
                const isAssigning = assigningId === teacher.id;
                const initials = teacher.name.split(' ').map((w) => w[0] ?? '').join('').toUpperCase().slice(0, 2);
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={teacher.id}
                    onPress={() => handleAssign(teacher.id)}
                    style={[styles.teacherRow, isCurrentTeacher && styles.teacherRowActive]}
                  >
                    <View style={[styles.teacherAvatar, isCurrentTeacher && styles.teacherAvatarActive]}>
                      <Text style={[styles.teacherAvatarText, isCurrentTeacher && styles.teacherAvatarTextActive]}>
                        {initials}
                      </Text>
                    </View>
                    <View style={styles.teacherInfo}>
                      <Text style={styles.teacherName}>{teacher.name}</Text>
                      <Text style={styles.teacherEmail}>{teacher.email}</Text>
                    </View>
                    {isAssigning ? (
                      <ActivityIndicator color={AppTheme.colors.primary} size="small" />
                    ) : isCurrentTeacher ? (
                      <Ionicons color={AppTheme.colors.primary} name="checkmark-circle" size={20} />
                    ) : (
                      <Ionicons color={AppTheme.colors.textSecondary} name="chevron-forward" size={18} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: AppTheme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    gap: 16,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppTheme.colors.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalTitle: { color: AppTheme.colors.textPrimary, fontSize: 20, fontWeight: '800' },
  modalSubtitle: { color: AppTheme.colors.textSecondary, fontSize: 14, lineHeight: 20 },
  modalError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppTheme.colors.dangerBg,
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalErrorText: { color: AppTheme.colors.dangerText, fontSize: 13, flex: 1 },
  teacherList: { maxHeight: 300 },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.border,
  },
  teacherRowActive: {
    backgroundColor: AppTheme.colors.primaryLight + '55',
    borderRadius: AppTheme.radius.medium,
  },
  teacherAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: AppTheme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherAvatarActive: { backgroundColor: AppTheme.colors.primaryLight },
  teacherAvatarText: {
    color: AppTheme.colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  teacherAvatarTextActive: { color: AppTheme.colors.primaryText },
  teacherInfo: { flex: 1, gap: 2 },
  teacherName: { color: AppTheme.colors.textPrimary, fontSize: 15, fontWeight: '700' },
  teacherEmail: { color: AppTheme.colors.textSecondary, fontSize: 12 },
  noTeachersBox: { alignItems: 'center', padding: 24, gap: 10 },
  noTeachersText: {
    color: AppTheme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  unassignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: AppTheme.colors.dangerBg,
    borderWidth: 1,
    borderColor: AppTheme.colors.dangerBorderStrong,
    paddingVertical: 10,
    borderRadius: AppTheme.radius.medium,
    marginTop: 4,
  },
  unassignBtnText: {
    color: AppTheme.colors.dangerText,
    fontSize: 14,
    fontWeight: '700',
  },
});
