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
  const [error, setError] = useState<string | null>(null);

  const handleAssign = async (teacherId: number) => {
    if (!session || !subjectId || assigningId) return;
    setAssigningId(teacherId);
    setError(null);
    try {
      const updated = await assignTeacherToSubject(session.token, subjectId, teacherId);
      onAssigned(updated);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to assign teacher');
    } finally {
      setAssigningId(null);
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
              <Ionicons color="#B42318" name="alert-circle-outline" size={14} />
              <Text style={styles.modalErrorText}>{error}</Text>
            </View>
          ) : null}

          {teachers.length === 0 ? (
            <View style={styles.noTeachersBox}>
              <Ionicons color={colors.textMuted} name="people-outline" size={32} />
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
                      <ActivityIndicator color={colors.accent} size="small" />
                    ) : isCurrentTeacher ? (
                      <Ionicons color={colors.accent} name="checkmark-circle" size={20} />
                    ) : (
                      <Ionicons color={colors.textMuted} name="chevron-forward" size={18} />
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
    backgroundColor: colors.surface,
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
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: '800' },
  modalSubtitle: { color: colors.textSecondary, fontSize: 14, lineHeight: 20 },
  modalError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalErrorText: { color: '#B42318', fontSize: 13, flex: 1 },
  teacherList: { maxHeight: 300 },
  teacherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  teacherRowActive: {
    backgroundColor: colors.accentSoft + '55',
    borderRadius: 12,
  },
  teacherAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teacherAvatarActive: { backgroundColor: colors.accentSoft },
  teacherAvatarText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  teacherAvatarTextActive: { color: colors.accentDark },
  teacherInfo: { flex: 1, gap: 2 },
  teacherName: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' },
  teacherEmail: { color: colors.textMuted, fontSize: 12 },
  noTeachersBox: { alignItems: 'center', padding: 24, gap: 10 },
  noTeachersText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
