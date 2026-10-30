import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView
} from "react-native";

import React, { useEffect, useState } from "react";

import { TeacherSection } from "./TeacherSection";
import { ClassSection } from "./ClassSection";
import { AssignmentSummary } from "./AssignmentSummary";
import { quickAssignment } from "../../lib/api";
import { AssignmentConflict } from "./AssignmentConflict";
import { replaceAssignment } from "../../lib/api";
import { QuickAssignmentResponse } from "../../types/api";

import { AppTheme } from "../../theme/AppTheme";

type Props = {
  visible: boolean;
  onClose: () => void;
  token: string;
  onSuccess: () => Promise<void>;
  initialAssignment?: {
    className: string;
    section: string;
    subject: string;
  } | null;
};

export function QuickAssignmentModal({
  visible,
  onClose,
  token,
  onSuccess,
  initialAssignment,
}: Props) {
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [password, setPassword] = useState("");
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [subject, setSubject] = useState("");
  const [teacherLookup, setTeacherLookup] = useState<{ exists: boolean | null; teacherId?: number }>({
    exists: null,
    teacherId: undefined,
  });
  const [classLookup, setClassLookup] = useState<{ exists: boolean | null; classId?: number }>({
    exists: null,
    classId: undefined,
  });

  const [submitting, setSubmitting] = useState(false);

  const [replaceData, setReplaceData] =
    useState<QuickAssignmentResponse | null>(null);

  const [replacing, setReplacing] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setClassName(initialAssignment?.className ?? "");
    setSection(initialAssignment?.section ?? "");
    setSubject(initialAssignment?.subject ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialAssignment]);

  async function handleAssign() {
    try {
      setSubmitting(true);

      const response = await quickAssignment(token, {
        teacher_email: teacherEmail,
        teacher_name: teacherName,
        temporary_password: password,

        class_name: className,
        section,
        subject_name: subject,
      });

      if (response.status === "created") {
        await onSuccess();
        resetForm();
        onClose();
        return;
      }

      if (response.status === "already_assigned") {
        alert(response.message);
        return;
      }

      if (response.status === "replace_required") {
        setReplaceData(response);
        return;
      }
    } catch (error) {
      console.log(error);
      alert("Unable to assign teacher.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReplace() {
    if (!replaceData) return;

    try {
      setReplacing(true);

      await replaceAssignment(token, {
        teacher_id: replaceData.teacher_id,
        subject_id: replaceData.subject_id,
      });

      await onSuccess();

      resetForm();
      onClose();
    } finally {
      setReplacing(false);
    }
  }

  function resetForm() {
    setTeacherEmail("");
    setTeacherName("");
    setPassword("");

    setClassName("");
    setSection("");
    setSubject("");

    setReplaceData(null);

    setTeacherLookup({
      exists: null,
      teacherId: undefined,
    });

    setClassLookup({
      exists: null,
      classId: undefined,
    });
  }

  if (replaceData) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={styles.card}>
            <AssignmentConflict
              subjectName={subject}
              currentTeacherName={replaceData.current_teacher_name ?? ""}
              currentTeacherEmail={replaceData.current_teacher_email ?? ""}
              loading={replacing}
              onCancel={() => setReplaceData(null)}
              onReplace={handleReplace}
            />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <ScrollView>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.title}>Quick Assignment</Text>

            <Text style={styles.subtitle}>
              Create or assign teachers, classes and subjects.
            </Text>

            <TeacherSection
              token={token}
              teacherEmail={teacherEmail}
              teacherName={teacherName}
              password={password}
              onTeacherEmailChange={setTeacherEmail}
              onTeacherNameChange={setTeacherName}
              onPasswordChange={setPassword}
              onLookupChange={setTeacherLookup}
            />
            <ClassSection
              token={token}
              className={className}
              section={section}
              subject={subject}
              onClassNameChange={setClassName}
              onSectionChange={setSection}
              onSubjectChange={setSubject}
              onLookupChange={setClassLookup}
            />

            <AssignmentSummary
              teacherExists={teacherLookup.exists}
              teacherName={teacherName}
              classExists={classLookup.exists}
              className={className}
              section={section}
              subject={subject}
            />

            <View style={styles.actions}>
              <Pressable style={styles.cancel} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                onPress={handleAssign}
                disabled={
                  submitting ||
                  !teacherEmail ||
                  !className ||
                  !section ||
                  !subject
                }
                style={[
                  styles.assign,
                  (!teacherEmail || !className || !section || !subject) && {
                    opacity: 0.5,
                  },
                ]}
                // disabled={!teacherEmail || !className || !section || !subject}
              >
                <Text style={styles.assignText}>
                  {submitting ? "Assigning..." : "Assign"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,

    backgroundColor: "rgba(0,0,0,0.45)",

    justifyContent: "center",

    padding: 20,
  },

  card: {
    backgroundColor: AppTheme.colors.white,

    borderRadius: 20,

    padding: 24,
  },

  title: {
    fontSize: 22,

    fontWeight: "700",

    color: AppTheme.colors.slate900,
  },

  subtitle: {
    marginTop: 6,

    marginBottom: 22,

    color: AppTheme.colors.slate500,
  },

  input: {
    height: 50,

    borderWidth: 1,

    borderColor: AppTheme.colors.slate300,

    borderRadius: AppTheme.radius.medium,

    paddingHorizontal: 14,

    marginBottom: 14,
  },

  actions: {
    flexDirection: "row",

    justifyContent: "flex-end",

    marginTop: 10,
  },

  cancel: {
    paddingHorizontal: 18,

    justifyContent: "center",
  },

  cancelText: {
    color: AppTheme.colors.slate500,

    fontWeight: "600",
  },

  assign: {
    backgroundColor: AppTheme.colors.primary,

    marginLeft: 12,

    paddingHorizontal: 20,

    paddingVertical: 12,

    borderRadius: AppTheme.radius.medium,
  },

  assignText: {
    color: AppTheme.colors.slate500,
    fontWeight: "700",
  },
});


