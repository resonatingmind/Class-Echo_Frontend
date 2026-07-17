import { StyleSheet, TextInput, View } from "react-native";

import { colors } from "../../theme/colors";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
};

export function TeacherFilterBar({ search, onSearchChange }: Props) {
  return (
    <View style={styles.container}>
      <TextInput
        placeholder="Search class, subject..."
        value={search}
        onChangeText={onSearchChange}
        style={styles.search}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 18,
  },

  search: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
});
