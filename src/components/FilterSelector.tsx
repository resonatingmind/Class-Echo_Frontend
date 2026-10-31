import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

import { AppTheme } from "../theme/AppTheme";

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
        accessibilityRole="button"
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
            color={AppTheme.colors.textSecondary}
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
                  accessibilityRole="button"
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
                      color={AppTheme.colors.primary}
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
  // selector: {
  //   width: "48%",
  //   backgroundColor: AppTheme.colors.surface,
  //   borderRadius: AppTheme.radius.large,
  //   padding: 14,
  //   borderWidth: 1,
  //   borderColor: AppTheme.colors.border,
  // },

  selector: {
    width: "100%",
    backgroundColor: AppTheme.colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },

  label: {
    fontSize: 13,
    color: AppTheme.colors.textSecondary,
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
    color: AppTheme.colors.textPrimary,
  },

  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  sheet: {
    backgroundColor: AppTheme.colors.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: "70%",
    padding: 20,
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 18,
    color: AppTheme.colors.textPrimary,
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
    color: AppTheme.colors.textPrimary,
  },
});