import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
} from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import { AppTheme } from "../../theme/AppTheme";

type Props = {
  visible: boolean;
  title: string;

  options: string[];

  selected: string | null;

  onClose: () => void;

  onSelect: (value: string | null) => void;
};

export function PlannerFilterModal({
  visible,
  title,
  options,
  selected,
  onClose,
  onSelect,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{title}</Text>

          <FlatList
            data={["All", ...options]}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const active =
                (item === "All" && selected == null) || item === selected;

              return (
                <Pressable
                  style={styles.item}
                  onPress={() => {
                    onSelect(item === "All" ? null : item);

                    onClose();
                  }}
                >
                  <Text style={[styles.itemText, active && styles.activeText]}>
                    {item}
                  </Text>

                  {active && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={AppTheme.colors.primary}
                    />
                  )}
                </Pressable>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,

    backgroundColor: "rgba(0,0,0,0.35)",

    justifyContent: "center",

    padding: 24,
  },

  card: {
    backgroundColor: "#fff",

    borderRadius: 18,

    maxHeight: "70%",

    paddingTop: 18,
  },

  title: {
    fontSize: 18,

    fontWeight: "700",

    color: AppTheme.colors.textPrimary,

    paddingHorizontal: 20,

    paddingBottom: 12,
  },

  item: {
    height: 52,

    paddingHorizontal: 20,

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",
  },

  itemText: {
    fontSize: 16,

    color: AppTheme.colors.textPrimary,
  },

  activeText: {
    color: AppTheme.colors.primary,

    fontWeight: "700",
  },
});
