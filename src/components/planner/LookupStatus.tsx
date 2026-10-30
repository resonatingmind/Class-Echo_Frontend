import { AppTheme } from '../../theme/AppTheme';
import { View, Text, StyleSheet } from "react-native";

type Props = {
  type: "existing" | "new";
  label: string;
  description?: string;
};

export function LookupStatus({ type, label, description }: Props) {
  return (
    <View
      style={[
        styles.container,
        type === "existing" ? styles.success : styles.warning,
      ]}
    >
      <Text style={styles.text}>
        {type === "existing" ? "🟢" : "🟡"} {label}
      </Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,

    marginBottom: 14,

    paddingVertical: 10,

    paddingHorizontal: 12,

    borderRadius: AppTheme.radius.medium,
  },

  success: {
    backgroundColor: "#ECFDF5",
  },

  warning: {
    backgroundColor: "#FEFCE8",
  },

  text: {
    fontSize: 13,

    fontWeight: "600",

    color: AppTheme.colors.slate700,
  },
  description: {
    marginTop: 4,
    fontSize: 12,
    color: AppTheme.colors.slate500,
  },
});


