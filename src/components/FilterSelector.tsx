import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors } from "../theme/colors";

export type FilterOption = {
  id?: number;
  label: string;
  value: string | number | undefined;
};

type Props = {
  title: string;

  placeholder: string;

  value?: string | number;

  options: FilterOption[];

  onSelect: (value: any) => void;

  visible: boolean;

  onClose: () => void;
};

export function FilterSelector({
  title,
  placeholder,
  value,
  options,
  onSelect,
  visible,
  onClose,
}: Props) {
  const selected =
    options.find((o) => o.value === value)?.label ??
    placeholder;

  return (
    <>
      <Pressable
        style={styles.selector}
        onPress={onClose}
      >
        <Text style={styles.label}>
          {title}
        </Text>

        <View style={styles.row}>
          <Text
            style={styles.value}
            numberOfLines={1}
          >
            {selected}
          </Text>

          <Ionicons
            name="chevron-down"
            size={18}
            color={colors.textSecondary}
          />
        </View>
      </Pressable>

      <Modal
        visible={visible}
        animationType="slide"
        transparent
      >
        <Pressable
          style={styles.overlay}
          onPress={onClose}
        >
          <Pressable style={styles.sheet}>
            <Text style={styles.title}>
              {title}
            </Text>

            <ScrollView>
              {options.map((item) => (
                <Pressable
                  key={String(item.value)}
                  style={styles.option}
                  onPress={() => {
                    onSelect(item.value);

                    onClose();
                  }}
                >
                  <Text style={styles.optionText}>
                    {item.label}
                  </Text>

                  {item.value === value && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={colors.accent}
                    />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    width: "48%",
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  label: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  value: {
    flex: 1,
    fontWeight: "600",
    fontSize: 15,
    color: colors.textPrimary,
  },

  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: "70%",
    padding: 20,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 18,
    color: colors.textPrimary,
  },

  option: {
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
  },

  optionText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
});