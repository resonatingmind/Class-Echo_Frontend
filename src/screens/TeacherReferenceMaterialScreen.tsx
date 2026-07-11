import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import {
  getChapterDocuments,
  uploadChapterDocument,
  deleteChapterDocument,
} from '../lib/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { colors } from '../theme/colors';
import { ChapterDocumentOut } from '../types/api';

type Props = NativeStackScreenProps<RootStackParamList, 'TeacherReferenceMaterial'>;

function docIcon(fileType: string) {
  const t = fileType.toLowerCase();
  if (t.includes('pdf')) return 'document-text';
  if (t.includes('word') || t.includes('docx')) return 'document';
  if (t.includes('ppt') || t.includes('pptx')) return 'easel';
  return 'attach';
}

function statusStyle(status: string) {
  const s = status.toLowerCase();
  if (s === 'completed' || s === 'processed') return { bg: '#E8F7EE', text: '#127A40', label: 'Processed' };
  if (s === 'processing') return { bg: '#FFF4E0', text: '#92400E', label: 'Processing' };
  if (s === 'pending') return { bg: colors.surfaceMuted, text: colors.textSecondary, label: 'Pending' };
  return { bg: '#FFF1F1', text: '#B42318', label: 'Failed' };
}

export function TeacherReferenceMaterialScreen({ navigation, route }: Props) {
  const { session } = useAuth();
  const { chapterId, chapterName } = route.params;

  const [documents, setDocuments] = useState<ChapterDocumentOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const load = useCallback(
    async (silent = false) => {
      if (!session) return;
      if (!silent) setIsLoading(true);
      setError(null);
      try {
        const data = await getChapterDocuments(session.token, chapterId);
        setDocuments(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load documents.');
      } finally {
        setIsLoading(false);
        setRefreshing(false);
      }
    },
    [session, chapterId],
  );

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleUpload = async () => {
    if (!session || uploading) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.ms-powerpoint',
        ],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setUploading(true);
      setUploadProgress(0);

      await uploadChapterDocument(
        session.token,
        chapterId,
        asset.uri,
        asset.mimeType ?? 'application/octet-stream',
        asset.name ?? 'document',
        (pct) => setUploadProgress(pct),
      );

      void load(true);
    } catch (e) {
      Alert.alert('Upload Failed', e instanceof Error ? e.message : 'Could not upload file.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = (doc: ChapterDocumentOut) => {
    Alert.alert(
      'Delete Document',
      `Delete "${doc.file_name}"? This will remove it from the knowledge base.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!session) return;
            try {
              await deleteChapterDocument(session.token, doc.id);
              void load(true);
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete.');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons color={colors.textPrimary} name="arrow-back" size={22} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Reference Material</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>{chapterName}</Text>
        </View>
        <Pressable
          onPress={handleUpload}
          disabled={uploading}
          style={styles.uploadHeaderBtn}
        >
          {uploading ? (
            <ActivityIndicator color={colors.accent} size="small" />
          ) : (
            <Ionicons color={colors.accent} name="cloud-upload-outline" size={22} />
          )}
        </Pressable>
      </View>

      {uploading && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${uploadProgress}%` as any }]} />
          <Text style={styles.progressText}>{uploadProgress}% uploading…</Text>
        </View>
      )}

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading documents…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons color={colors.textMuted} name="cloud-offline-outline" size={40} />
          <Text style={styles.emptyTitle}>Could not load</Text>
          <Text style={styles.emptyBody}>{error}</Text>
          <Pressable onPress={() => void load()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              onRefresh={() => { setRefreshing(true); void load(true); }}
              refreshing={refreshing}
              tintColor={colors.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoBanner}>
            <Ionicons color={colors.accent} name="information-circle-outline" size={16} />
            <Text style={styles.infoText}>
              Upload reference PDFs for students. Materials are processed by AI to enrich chapter analytics.
            </Text>
          </View>

          {documents.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons color={colors.textMuted} name="document-outline" size={48} />
              <Text style={styles.emptyTitle}>No documents yet</Text>
              <Text style={styles.emptyBody}>
                Upload PDFs, Word docs, or PowerPoints for this chapter.
              </Text>
              <Pressable onPress={handleUpload} style={styles.uploadBtn} disabled={uploading}>
                <Ionicons color="#fff" name="cloud-upload-outline" size={18} />
                <Text style={styles.uploadBtnText}>Upload Document</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.docList}>
              {documents.map((doc) => {
                const ss = statusStyle(doc.processing_status);
                return (
                  <View key={doc.id} style={styles.docCard}>
                    <View style={styles.docIconWrap}>
                      <Ionicons color={colors.accent} name={docIcon(doc.file_type)} size={22} />
                    </View>
                    <View style={styles.docInfo}>
                      <Text style={styles.docName} numberOfLines={2}>{doc.file_name}</Text>
                      <View style={styles.docMeta}>
                        <View style={[styles.statusBadge, { backgroundColor: ss.bg }]}>
                          <Text style={[styles.statusBadgeText, { color: ss.text }]}>
                            {ss.label}
                          </Text>
                        </View>
                        <Text style={styles.docDate}>
                          {new Date(doc.uploaded_at).toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </Text>
                      </View>
                    </View>
                    <Pressable onPress={() => handleDelete(doc)} hitSlop={8} style={styles.deleteBtn}>
                      <Ionicons color="#B42318" name="trash-outline" size={18} />
                    </Pressable>
                  </View>
                );
              })}

              <Pressable
                onPress={handleUpload}
                disabled={uploading}
                style={[styles.uploadMoreBtn, uploading && styles.btnDisabled]}
              >
                <Ionicons color={colors.accent} name="add-circle-outline" size={18} />
                <Text style={styles.uploadMoreText}>Upload More</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 2 },
  headerTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  headerSubtitle: { color: colors.textMuted, fontSize: 11 },
  uploadHeaderBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  progressBar: { height: 36, backgroundColor: colors.accentSoft, justifyContent: 'center', overflow: 'hidden' },
  progressFill: { position: 'absolute', top: 0, left: 0, bottom: 0, backgroundColor: colors.accent, opacity: 0.2 },
  progressText: { textAlign: 'center', color: colors.accentDark, fontSize: 13, fontWeight: '600' },

  listContent: { paddingBottom: 40 },
  infoBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: colors.accentSoft, margin: 16, borderRadius: 12, padding: 12 },
  infoText: { flex: 1, color: colors.accentDark, fontSize: 13, lineHeight: 18 },

  docList: { paddingHorizontal: 16, gap: 12 },
  docCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 14 },
  docIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  docInfo: { flex: 1, gap: 6 },
  docName: { color: colors.textPrimary, fontSize: 14, fontWeight: '600', lineHeight: 18 },
  docMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  docDate: { color: colors.textMuted, fontSize: 11 },
  deleteBtn: { padding: 4 },

  uploadMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8, borderRadius: 14, borderWidth: 1.5, borderColor: colors.accent, borderStyle: 'dashed', paddingVertical: 14 },
  uploadMoreText: { color: colors.accent, fontWeight: '700', fontSize: 14 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 },
  emptyState: { alignItems: 'center', padding: 40, gap: 12 },
  loadingText: { color: colors.textSecondary, fontSize: 14 },
  emptyTitle: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  emptyBody: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },
  retryBtn: { backgroundColor: colors.accentSoft, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: colors.accentDark, fontWeight: '700', fontSize: 14 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accent, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
  uploadBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.45 },
});
