import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppTheme } from "../../theme/AppTheme";

export type SelectionItem = {
  id: string;
  label: string;
};

type Props = {
  visible: boolean;

  title: string;

  items: SelectionItem[];

  selectedId?: string;

  searchable?: boolean;

  placeholder?: string;

  onClose: () => void;

  onSelect: (item: SelectionItem) => void;
};

export function SelectionBottomSheet({
  visible,
  title,
  items,
  selectedId,
  searchable = true,
  placeholder = "Search...",
  onClose,
  onSelect,
}: Props) {
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    if (!search.trim()) {
      return items;
    }

    return items.filter((item) =>
      item.label.toLowerCase().includes(search.toLowerCase()),
    );
  }, [items, search]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>

          {searchable && (
            <TextInput
              placeholder={placeholder}
              value={search}
              onChangeText={setSearch}
              style={styles.search}
            />
          )}

          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                style={styles.item}
                onPress={() => {
                  onSelect(item);
                  setSearch("");
                  onClose();
                }}
              >
                <Text style={styles.itemText}>{item.label}</Text>

                {selectedId === item.id && (
                  <Ionicons name="checkmark" size={20} color={AppTheme.colors.primary} />
                )}
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No results found</Text>
              </View>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },

  sheet: {
    backgroundColor: AppTheme.colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "80%",
  },

  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
    color: AppTheme.colors.textPrimary,
  },

  search: {
    height: 46,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: AppTheme.colors.white,
  },

  item: {
    height: 52,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.slate100,
  },

  itemText: {
    fontSize: 15,
    color: AppTheme.colors.textPrimary,
  },

  empty: {
    paddingVertical: 30,
    alignItems: "center",
  },

  emptyText: {
    color: AppTheme.colors.textSecondary,
    fontSize: 14,
  },
});
