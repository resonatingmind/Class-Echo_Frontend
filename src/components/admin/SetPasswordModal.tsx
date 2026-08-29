import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppTheme } from '../../theme/AppTheme';

const MIN_LENGTH = 8;

/** Readable characters only: this password is usually read aloud or typed by hand. */
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generatePassword(length = 12) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export type SetPasswordSubmit = {
  newPassword: string;
  adminPassword: string;
  activate: boolean;
};

/**
 * Super admin setting another account's password directly.
 *
 * The password is shown in clear text on purpose: whoever is doing this has to
 * pass the value on to the user, and a masked field they cannot read makes that
 * impossible without an email round trip — which is the whole thing this avoids.
 */
export function SetPasswordModal({
  visible,
  subjectName,
  subjectEmail,
  canActivate,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  subjectName: string;
  subjectEmail: string;
  /** False when the account is already active, so the toggle would be a no-op. */
  canActivate: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (values: SetPasswordSubmit) => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [activate, setActivate] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  // Reopening for a different person must not carry the previous one's values.
  useEffect(() => {
    if (visible) {
      setNewPassword('');
      setConfirmPassword('');
      setAdminPassword('');
      setActivate(true);
      setLocalError(null);
    }
  }, [visible, subjectEmail]);

  const handleGenerate = () => {
    const generated = generatePassword();
    setNewPassword(generated);
    setConfirmPassword(generated);
    setLocalError(null);
  };

  const handleSubmit = () => {
    if (busy) return;
    if (newPassword.trim().length < MIN_LENGTH) {
      setLocalError(`Password must be at least ${MIN_LENGTH} characters`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setLocalError('The two passwords do not match');
      return;
    }
    if (!adminPassword) {
      setLocalError('Enter your own password to confirm this change');
      return;
    }
    setLocalError(null);
    onSubmit({
      newPassword,
      adminPassword,
      activate: canActivate ? activate : false,
    });
  };

  const message = localError ?? error;

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Set password</Text>
            <Pressable hitSlop={8} onPress={onClose}>
              <Ionicons color={AppTheme.colors.textSecondary} name="close" size={20} />
            </Pressable>
          </View>

          <Text style={styles.sub}>
            {subjectName} ({subjectEmail}) will be able to sign in with this password
            immediately. No email is sent — pass it on yourself.
          </Text>

          <ScrollView style={styles.scroll}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>New password</Text>
              <Pressable hitSlop={6} onPress={handleGenerate}>
                <Text style={styles.generateText}>Generate</Text>
              </Pressable>
            </View>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(v) => {
                setNewPassword(v);
                setLocalError(null);
              }}
              placeholder={`At least ${MIN_LENGTH} characters`}
              placeholderTextColor={AppTheme.colors.textPlaceholder}
              style={styles.input}
              value={newPassword}
            />

            <Text style={styles.label}>Confirm new password</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(v) => {
                setConfirmPassword(v);
                setLocalError(null);
              }}
              placeholder="Repeat the password"
              placeholderTextColor={AppTheme.colors.textPlaceholder}
              style={styles.input}
              value={confirmPassword}
            />

            {canActivate ? (
              <Pressable onPress={() => setActivate((v) => !v)} style={styles.checkRow}>
                <View style={[styles.checkbox, activate && styles.checkboxOn]}>
                  {activate ? <Ionicons color="#fff" name="checkmark" size={13} /> : null}
                </View>
                <Text style={styles.checkLabel}>
                  Activate this account now (skips the emailed invitation)
                </Text>
              </Pressable>
            ) : null}

            <Text style={[styles.label, styles.labelSpaced]}>Your admin password</Text>
            <TextInput
              autoCapitalize="none"
              onChangeText={(v) => {
                setAdminPassword(v);
                setLocalError(null);
              }}
              placeholder="••••••••"
              placeholderTextColor={AppTheme.colors.textPlaceholder}
              secureTextEntry
              style={styles.input}
              value={adminPassword}
            />

            <View style={styles.warnCard}>
              <Ionicons color="#B45309" name="information-circle-outline" size={15} />
              <Text style={styles.warnText}>
                Any invitation link already sent to this address stops working once
                you save.
              </Text>
            </View>

            {message ? (
              <View style={styles.errorCard}>
                <Ionicons color="#B42318" name="alert-circle-outline" size={16} />
                <Text style={styles.errorText}>{message}</Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.secondaryBtn}>
              <Text style={styles.secondaryBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={busy}
              onPress={handleSubmit}
              style={[styles.primaryBtn, busy && styles.disabled]}
            >
              {busy ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Save password</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(17,24,39,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: AppTheme.spacing.l,
  },
  card: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '90%',
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.large,
    padding: AppTheme.spacing.xl,
    gap: AppTheme.spacing.m,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.heading3 },
  sub: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.caption },
  scroll: { maxHeight: 380 },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: AppTheme.spacing.s,
  },
  label: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
    fontWeight: '700',
    marginTop: AppTheme.spacing.s,
    marginBottom: 6,
  },
  labelSpaced: { marginTop: AppTheme.spacing.l },
  generateText: {
    color: AppTheme.colors.primary,
    ...AppTheme.typography.caption,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.m,
    color: AppTheme.colors.textPrimary,
    backgroundColor: AppTheme.colors.surface,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppTheme.spacing.s,
    marginTop: AppTheme.spacing.m,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: AppTheme.colors.primary,
    borderColor: AppTheme.colors.primary,
  },
  checkLabel: { flex: 1, color: AppTheme.colors.textPrimary, ...AppTheme.typography.caption },
  warnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppTheme.spacing.s,
    backgroundColor: '#FFFBEB',
    borderRadius: AppTheme.radius.medium,
    padding: AppTheme.spacing.m,
    marginTop: AppTheme.spacing.l,
  },
  warnText: { flex: 1, color: '#B45309', ...AppTheme.typography.caption },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppTheme.spacing.s,
    backgroundColor: '#FDF2F2',
    borderRadius: AppTheme.radius.medium,
    padding: AppTheme.spacing.m,
    marginTop: AppTheme.spacing.m,
  },
  errorText: { flex: 1, color: '#B42318', ...AppTheme.typography.caption },
  actions: { flexDirection: 'row', gap: AppTheme.spacing.m, justifyContent: 'flex-end' },
  secondaryBtn: {
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.m,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  secondaryBtnText: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.caption,
    fontWeight: '700',
  },
  primaryBtn: {
    minWidth: 140,
    alignItems: 'center',
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.m,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primary,
  },
  primaryBtnText: { color: '#fff', ...AppTheme.typography.caption, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
