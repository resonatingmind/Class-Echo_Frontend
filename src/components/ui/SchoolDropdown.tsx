import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, Platform } from "react-native";
import { AppTheme } from "../../theme/AppTheme";
import { SchoolOut } from "../../types/api";
import { AppTextField } from "./AppTextField";

interface SchoolDropdownProps {
  schools: SchoolOut[];
  loading: boolean;
  value: SchoolOut | null;
  onChange: (school: SchoolOut) => void;
  error?: string | null;
}

export function SchoolDropdown({ schools, loading, value, onChange, error }: SchoolDropdownProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = search.trim()
    ? schools.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()))
    : schools;

  const displayValue = isOpen ? search : (value ? value.name : "");

  return (
    <View style={[styles.container, Platform.OS !== "web" && { zIndex: 1000 }]}>
      <AppTextField
        label="School"
        placeholder="Search for your school..."
        value={displayValue}
        onChangeText={(text) => {
          setSearch(text);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => {
          setIsOpen(true);
          setSearch("");
        }}
        onBlur={() => {
          // Delay closing so tap events on items process before the menu unmounts
          setTimeout(() => setIsOpen(false), 200);
        }}
        error={error}
        autoCapitalize="none"
      />
      {isOpen && (
        <View style={styles.dropdown}>
          {loading ? (
            <ActivityIndicator style={{ padding: 16 }} color={AppTheme.colors.primary} />
          ) : filtered.length === 0 ? (
            <Text style={styles.empty}>No schools found</Text>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 200 }}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.item}
                  onPress={() => {
                    onChange(item);
                    setIsOpen(false);
                  }}
                >
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.address ? <Text style={styles.itemSub}>{item.address}</Text> : null}
                </Pressable>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    ...(Platform.OS === 'web' ? { zIndex: 1000 } : {}),
  },
  dropdown: {
    position: "absolute",
    top: 76, 
    left: 0,
    right: 0,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.medium,
    ...AppTheme.shadows.card,
    maxHeight: 200,
    overflow: "hidden",
  },
  item: {
    padding: AppTheme.spacing.m,
    borderBottomWidth: 1,
    borderBottomColor: AppTheme.colors.divider,
  },
  itemName: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.body, fontWeight: "500" },
  itemSub: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.caption },
  empty: { padding: AppTheme.spacing.m, color: AppTheme.colors.textSecondary, textAlign: "center" }
});
