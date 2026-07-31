import { AppTheme } from '../../theme/AppTheme';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

import { useEffect } from "react";
import { LookupStatus } from "./LookupStatus";

import { useClassLookup } from "../../hooks/useClassLookup";

type ClassLookupResult = {
  exists: boolean | null;
  classId?: number;
};

type Props = {
  token: string;

  className: string;
  section: string;
  subject: string;

  onClassNameChange: (value: string) => void;
  onSectionChange: (value: string) => void;
  onSubjectChange: (value: string) => void;

  onLookupChange: (result: ClassLookupResult) => void;
};

export function ClassSection({
  token,
  className,
  section,
  subject,

  onClassNameChange,
  onSectionChange,
  onSubjectChange,
  onLookupChange,
}: Props) {
  const { loading, classExists, classData } = useClassLookup(
    token,
    className,
    section,
  );

    useEffect(() => {
    onLookupChange({
        exists: classExists,
        classId: classData?.id,
    });
    }, [classExists, classData, onLookupChange]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Class Information</Text>

      <TextInput
        placeholder="Class"
        value={className}
        onChangeText={onClassNameChange}
        style={styles.input}
      />

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Section"
          value={section}
          onChangeText={onSectionChange}
          autoCapitalize="characters"
          style={[styles.input, { marginBottom: 0 }]}
        />

        {loading && <ActivityIndicator size="small" style={styles.loader} />}
      </View>

      {classExists === true && (
        <LookupStatus
          type="existing"
          label="Existing Class"
          description={`${classData?.name} • Section ${classData?.section}`}
        />
      )}

      {classExists === false && (
        <LookupStatus type="new" label="New Class will be created" />
      )}

      <TextInput
        placeholder="Subject"
        value={subject}
        onChangeText={onSubjectChange}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#0F172A",
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  inputContainer: {
    position: "relative",
    marginBottom: 14,
  },

  loader: {
    position: "absolute",
    right: 14,
    top: 13,
  },
});


