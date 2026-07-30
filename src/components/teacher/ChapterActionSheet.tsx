import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { AppTheme } from "../../theme/AppTheme";

type Props = {
  visible: boolean;

  chapterName?: string;

  onClose: () => void;

  onEdit: () => void;

  onReferenceMaterial: () => void;

  onDelete: () => void;
};

export function ChapterActionSheet({
  visible,
  chapterName,
  onClose,
  onEdit,
  onReferenceMaterial,
  onDelete,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <Text style={styles.title}>{chapterName ?? "Chapter"}</Text>

              <Pressable style={styles.item} onPress={onEdit}>
                <Ionicons
                  name="create-outline"
                  size={20}
                  color={AppTheme.colors.primary}
                />

                <Text style={styles.itemText}>Edit Chapter</Text>
              </Pressable>

              <Pressable style={styles.item} onPress={onReferenceMaterial}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={AppTheme.colors.primary}
                />

                <Text style={styles.itemText}>Reference Material</Text>
              </Pressable>

              {/* <Pressable style={styles.item} onPress={onDelete}> */}
              <Pressable
                style={styles.item}
                onPress={() => {
                  onDelete();
                }}
              >
                <Ionicons name="trash-outline" size={20} color="#DC2626" />

                <Text style={[styles.itemText, { color: "#DC2626" }]}>
                  Delete Chapter
                </Text>
              </Pressable>

              <Pressable style={styles.cancel} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 34,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: AppTheme.colors.textPrimary,
    marginBottom: 18,
  },

  item: {
    flexDirection: "row",
    alignItems: "center",
    height: 54,
  },

  itemText: {
    marginLeft: 14,
    fontSize: 16,
    color: AppTheme.colors.textPrimary,
    fontWeight: "500",
  },

  cancel: {
    marginTop: 14,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: AppTheme.radius.medium,
    backgroundColor: "#F3F4F6",
  },

  cancelText: {
    fontWeight: "700",
    color: AppTheme.colors.textSecondary,
    fontSize: 15,
  },
});
