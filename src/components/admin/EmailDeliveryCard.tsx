import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getAdminEmailStatus, sendAdminTestEmail } from '../../lib/api';
import { AppTheme } from '../../theme/AppTheme';
import { EmailStatusOut, EmailTestResult } from '../../types/api';

/**
 * Whether this deployment can actually deliver an invitation.
 *
 * A misconfigured mail provider fails silently — the invite endpoint returns
 * 201 either way — so without something like this the first sign of trouble is
 * a teacher saying they never got an email, days later.
 *
 * Collapsed when everything is healthy: it is a diagnostic, not a dashboard.
 */
export function EmailDeliveryCard({ token }: { token: string }) {
  const [status, setStatus] = useState<EmailStatusOut | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<EmailTestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const next = await getAdminEmailStatus(token);
      setStatus(next);
      // Auto-open when something is wrong, so a broken deployment is not one
      // more thing you have to remember to go and check.
      if (next.warnings.length > 0) setExpanded(true);
    } catch {
      // A diagnostic that breaks the page it sits on is worse than no
      // diagnostic, so a failure here just hides the card.
      setStatus(null);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleTest = async () => {
    if (!testEmail.trim() || testing) return;
    setTesting(true);
    setTestError(null);
    setTestResult(null);
    try {
      setTestResult(await sendAdminTestEmail(token, testEmail.trim()));
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Could not send the test email');
    } finally {
      setTesting(false);
    }
  };

  if (!status) return null;

  const healthy = status.warnings.length === 0;

  return (
    <View style={[styles.card, !healthy && styles.cardWarn]}>
      <Pressable onPress={() => setExpanded((v) => !v)} style={styles.header}>
        <Ionicons
          color={healthy ? AppTheme.colors.successText : AppTheme.colors.warningText}
          name={healthy ? 'mail-outline' : 'warning-outline'}
          size={18}
        />
        <View style={styles.headerText}>
          <Text style={styles.title}>Email delivery</Text>
          <Text style={styles.sub}>
            {healthy
              ? `Invitations are sent via ${status.backend}.`
              : `${status.warnings.length} problem${
                  status.warnings.length === 1 ? '' : 's'
                } — invitations may not arrive.`}
          </Text>
        </View>
        <Ionicons
          color={AppTheme.colors.textSecondary}
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.bodyWrap}>
          {status.warnings.map((warning) => (
            <View key={warning} style={styles.warnRow}>
              <Ionicons color={AppTheme.colors.warningText} name="alert-circle-outline" size={14} />
              <Text style={styles.warnText}>{warning}</Text>
            </View>
          ))}

          <View style={styles.factRow}>
            <Text style={styles.factLabel}>Provider</Text>
            <Text style={styles.factValue}>{status.backend}</Text>
          </View>
          <View style={styles.factRow}>
            <Text style={styles.factLabel}>From</Text>
            <Text numberOfLines={1} style={styles.factValue}>
              {status.from_email ?? 'not set'}
            </Text>
          </View>
          <View style={styles.factRow}>
            <Text style={styles.factLabel}>Invite links point to</Text>
            <Text numberOfLines={1} style={styles.factValue}>
              {status.frontend_url}
            </Text>
          </View>
          {/* Redacted, so it can be read off the screen and compared against
              the provider without exposing the key itself. */}
          {status.credentials ? (
            <View style={styles.factRow}>
              <Text style={styles.factLabel}>Credentials in use</Text>
              <Text numberOfLines={1} style={[styles.factValue, styles.mono]}>
                {status.credentials}
              </Text>
            </View>
          ) : null}

          <Text style={styles.testLabel}>Send a test email</Text>
          <View style={styles.testRow}>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setTestEmail}
              placeholder="you@example.com"
              placeholderTextColor={AppTheme.colors.textPlaceholder}
              style={styles.input}
              value={testEmail}
            />
            <Pressable
              disabled={testing || !testEmail.trim()}
              onPress={() => void handleTest()}
              style={[
                styles.testBtn,
                (testing || !testEmail.trim()) && styles.disabled,
              ]}
            >
              {testing ? (
                <ActivityIndicator color={AppTheme.colors.white} size="small" />
              ) : (
                <Text style={styles.testBtnText}>Send</Text>
              )}
            </Pressable>
          </View>

          {testResult ? (
            <View
              style={[
                styles.resultCard,
                testResult.delivered ? styles.resultOk : styles.resultBad,
              ]}
            >
              <Ionicons
                color={testResult.delivered ? AppTheme.colors.successText : AppTheme.colors.dangerText}
                name={
                  testResult.delivered
                    ? 'checkmark-circle-outline'
                    : 'close-circle-outline'
                }
                size={15}
              />
              <View style={styles.resultText}>
                <Text style={styles.resultDetail}>{testResult.detail}</Text>
                {testResult.error ? (
                  <Text style={styles.resultError}>{testResult.error}</Text>
                ) : null}
                {testResult.credentials ? (
                  <Text style={[styles.resultError, styles.mono]}>
                    {testResult.credentials}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {testError ? (
            <View style={[styles.resultCard, styles.resultBad]}>
              <Ionicons color={AppTheme.colors.dangerText} name="alert-circle-outline" size={15} />
              <Text style={styles.resultDetail}>{testError}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.large,
    backgroundColor: AppTheme.colors.surface,
    overflow: 'hidden',
  },
  cardWarn: { borderColor: '#FCD9A5', backgroundColor: AppTheme.colors.warningTint },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppTheme.spacing.m,
    padding: AppTheme.spacing.l,
  },
  headerText: { flex: 1, gap: 2 },
  title: { color: AppTheme.colors.textPrimary, ...AppTheme.typography.label },
  sub: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.caption },
  bodyWrap: {
    paddingHorizontal: AppTheme.spacing.l,
    paddingBottom: AppTheme.spacing.l,
    gap: AppTheme.spacing.s,
  },
  warnRow: { flexDirection: 'row', gap: AppTheme.spacing.s, alignItems: 'flex-start' },
  warnText: { flex: 1, color: AppTheme.colors.warningText, ...AppTheme.typography.caption },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: AppTheme.spacing.m,
    paddingTop: 6,
  },
  factLabel: { color: AppTheme.colors.textSecondary, ...AppTheme.typography.caption },
  factValue: {
    flex: 1,
    textAlign: 'right',
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.caption,
  },
  testLabel: {
    color: AppTheme.colors.textSecondary,
    ...AppTheme.typography.caption,
    fontWeight: '700',
    marginTop: AppTheme.spacing.m,
  },
  testRow: { flexDirection: 'row', gap: AppTheme.spacing.s, alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.medium,
    paddingHorizontal: AppTheme.spacing.m,
    paddingVertical: AppTheme.spacing.s,
    backgroundColor: AppTheme.colors.surface,
    color: AppTheme.colors.textPrimary,
  },
  testBtn: {
    minWidth: 72,
    alignItems: 'center',
    paddingHorizontal: AppTheme.spacing.l,
    paddingVertical: AppTheme.spacing.m,
    borderRadius: AppTheme.radius.medium,
    backgroundColor: AppTheme.colors.primary,
  },
  testBtnText: { color: AppTheme.colors.white, ...AppTheme.typography.caption, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  resultCard: {
    flexDirection: 'row',
    gap: AppTheme.spacing.s,
    alignItems: 'flex-start',
    borderRadius: AppTheme.radius.medium,
    padding: AppTheme.spacing.m,
    marginTop: AppTheme.spacing.s,
  },
  resultOk: { backgroundColor: AppTheme.colors.successBg },
  resultBad: { backgroundColor: AppTheme.colors.dangerBg },
  resultText: { flex: 1, gap: 4 },
  resultDetail: { flex: 1, color: AppTheme.colors.textPrimary, ...AppTheme.typography.caption },
  resultError: { color: AppTheme.colors.dangerText, ...AppTheme.typography.caption },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});
