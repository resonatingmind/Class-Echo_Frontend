import { AppTheme } from '../../theme/AppTheme';
// import {
//   View,
//   Text,
//   TextInput,
//   StyleSheet,
//   ActivityIndicator,
// } from "react-native";

// import { useEffect, useState } from "react";
// import { useTeacherLookup } from "../../hooks/useTeacherLookup";
// import { LookupStatus } from "./LookupStatus";

// type Props = {
//   token: string;

//   teacherEmail: string;
//   teacherName: string;
//   password: string;

//   onTeacherEmailChange: (value: string) => void;
//   onTeacherNameChange: (value: string) => void;
//   onPasswordChange: (value: string) => void;
// };

// async function lookup() {
//   // TODO
// }

// export function TeacherSection({
//   token,
//   teacherEmail,
//   teacherName,
//   password,
//   onTeacherEmailChange,
//   onTeacherNameChange,
//   onPasswordChange,
// }: Props) {
//   const [setLoading] = useState(false);

//   const [, setTeacherExists] = useState<boolean | null>(null);

//   const { loading, teacherExists, teacher } = useTeacherLookup(
//     token,
//     teacherEmail,
//   );

//   useEffect(() => {
//     if (teacherExists && teacher) {
//       onTeacherNameChange(teacher.name ?? "");
//       onPasswordChange("");
//     }
//   }, [teacherExists, teacher]);

//   useEffect(() => {
//     if (teacherEmail.trim() === "") {
//       setTeacherExists(null);
//       return;
//     }

//     const timer = setTimeout(() => {
//       lookup();
//     }, 500);

//     return () => clearTimeout(timer);
//   }, [teacherEmail]);

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Teacher</Text>

//       {/* <TextInput
//         placeholder="Teacher Email"
//         value={teacherEmail}
//         onChangeText={onTeacherEmailChange}
//         autoCapitalize="none"
//         keyboardType="email-address"
//         style={styles.input}
//       /> */}

//       <View style={styles.inputContainer}>
//         <TextInput
//           placeholder="Teacher Email"
//           value={teacherEmail}
//           onChangeText={onTeacherEmailChange}
//           autoCapitalize="none"
//           keyboardType="email-address"
//           style={[styles.input, { marginBottom: 0 }]}
//         />
//         {loading && <ActivityIndicator size="small" style={styles.loader} />}
//       </View>

//       {teacherExists === true && (
//         <LookupStatus type="existing" label="Existing Teacher" />
//       )}

//       {teacherExists === false && (
//         <LookupStatus type="new" label="New teacher will be created" />
//       )}

//       <TextInput
//         placeholder="Teacher Name"
//         value={teacherName}
//         onChangeText={onTeacherNameChange}
//         style={styles.input}
//       />

//       {/* <TextInput
//         placeholder="Temporary Password"
//         value={password}
//         onChangeText={onPasswordChange}
//         style={styles.input}
//       /> */}
//       {teacherExists !== true && (
//         <TextInput
//           placeholder="Temporary Password"
//           value={password}
//           onChangeText={onPasswordChange}
//           secureTextEntry
//           style={styles.input}
//         />
//       )}
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     marginBottom: 24,
//   },

//   title: {
//     fontSize: 18,

//     fontWeight: "700",

//     marginBottom: 12,

//     color: "#0F172A",
//   },

//   input: {
//     height: 50,

//     borderWidth: 1,

//     borderColor: "#CBD5E1",

//     borderRadius: AppTheme.radius.medium,

//     paddingHorizontal: 14,

//     marginBottom: 14,
//   },
//   inputContainer: {
//     position: "relative",
//     marginBottom: 14,
//   },

//   loader: {
//     position: "absolute",
//     right: 14,
//     top: 13,
//   },
// });

import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useEffect } from "react";
import { useTeacherLookup } from "../../hooks/useTeacherLookup";
import { LookupStatus } from "./LookupStatus";


type TeacherLookupResult = {
  exists: boolean | null;
  teacherId?: number;
};


type Props = {
  token: string;

  teacherEmail: string;
  teacherName: string;
  password: string;

  onTeacherEmailChange: (value: string) => void;
  onTeacherNameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onLookupChange: (result: TeacherLookupResult) => void;
};

export function TeacherSection({
  token,
  teacherEmail,
  teacherName,
  password,
  onTeacherEmailChange,
  onTeacherNameChange,
  onPasswordChange,
  onLookupChange,
}: Props) {
  // Access data and status dynamically from your hook setup
  const { loading, teacherExists, teacher } = useTeacherLookup(
    token,
    teacherEmail,
  );

    useEffect(() => {
    onLookupChange({
        exists: teacherExists,
        teacherId: teacher?.id,
    });
    }, [teacherExists, teacher, onLookupChange]);

  // Auto-fill or clear values depending on user profile lookup parameters
//   useEffect(() => {
//     if (teacherExists && teacher) {
//       onTeacherNameChange(teacher.name ?? "");
//       onPasswordChange("");
//     }
//   }, [teacherExists, teacher, onTeacherNameChange, onPasswordChange]);

    useEffect(() => {
    if (teacherExists && teacher) {
        onTeacherNameChange(teacher.name ?? "");
        onPasswordChange("");
    }
    }, [teacherExists, teacher, onTeacherNameChange, onPasswordChange]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Teacher</Text>

      {/* Email Input Field Container with Loading Spinner Wrapper */}

      <View style={styles.inputContainer}>
        <TextInput
          placeholder="Teacher Email"
          value={teacherEmail}
          onChangeText={onTeacherEmailChange}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[styles.input, { marginBottom: 0 }]}
        />

        {loading && <ActivityIndicator size="small" style={styles.loader} />}
      </View>

      {/* Status Badges with optional description properties applied */}
      {teacherExists === true && (
        <LookupStatus
          type="existing"
          label="Existing Teacher"
          description={teacher?.name}
        />
      )}

      {teacherExists === false && (
        <LookupStatus type="new" label="New Teacher" />
      )}

      {/* Teacher Name text field is non-editable if teacher already profile matches */}
      <TextInput
        placeholder="Teacher Name"
        value={teacherName}
        onChangeText={onTeacherNameChange}
        editable={teacherExists !== true}
        style={[styles.input, teacherExists === true && styles.disabledInput]}
      />

      {/* Temporary Password Text Entry hides completely if profile matches */}
      {teacherExists !== true && (
        <TextInput
          placeholder="Temporary Password"
          value={password}
          onChangeText={onPasswordChange}
          secureTextEntry
          style={styles.input}
        />
      )}
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
    color: "#0F172A",
  },
  disabledInput: {
    backgroundColor: "#F1F5F9",
    color: "#64748B",
    borderColor: "#E2E8F0",
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

