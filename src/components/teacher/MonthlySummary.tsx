import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Text } from 'react-native';

import { describeMilestone } from '../../lib/milestones';
import { DIMENSION_LABELS } from '../../lib/reportFindings';
import { AppTheme } from '../../theme/AppTheme';
import { AreaTrend, GrowthOut } from '../../types/api';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const areaLabel = (area: string | null) => (area ? DIMENSION_LABELS[area] ?? area : 'Your focus');

function change(t: AreaTrend): string {
  if (t.change == null || t.direction == null) return 'Not enough lectures yet';
  if (t.direction === 'steady') return 'Steady';
  return `${t.change > 0 ? '▲' : '▼'} ${Math.abs(Math.round(t.change))} pts`;
}

/** The month's summary as a printable page: trends, focus, streak and this month's milestones. */
export function monthlySummaryHtml(growth: GrowthOut, now = new Date()): string {
  const month = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const thisMonth = (growth.milestones ?? []).filter((m) => {
    const d = new Date(m.achieved_at);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const rows = [growth.overall, ...growth.areas]
    .map((t) => `<tr><td>${esc(t.area === 'overall' ? 'Overall score' : areaLabel(t.area))}</td>
      <td>${t.recent_avg != null ? Math.round(t.recent_avg) : '–'}</td><td>${esc(change(t))}</td></tr>`)
    .join('');
  const focus = growth.focus;
  const streak = growth.streak;

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #1a1c1c; margin: 32px; }
    h1 { font-size: 22px; margin: 0 0 4px; } h2 { font-size: 16px; margin: 24px 0 8px; }
    p, td, th, li { font-size: 13px; line-height: 1.5; } .muted { color: #5f6368; }
    table { border-collapse: collapse; width: 100%; } th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e3e3e3; }
    .focus { background: #e8f1ff; border-radius: 10px; padding: 12px 14px; }
  </style></head><body>
    <h1>My Growth · ${esc(month)}</h1>
    <p class="muted">Your last ${growth.window} lectures compared with the ${growth.window} before. Only ever compared with your own past.</p>
    ${focus ? `<h2>Your focus · ${esc(areaLabel(focus.area))}</h2><div class="focus"><p>${esc(focus.try_this)}</p>
      ${focus.recent ? `<p class="muted">${focus.improved} of your last ${focus.recent} lectures beat your earlier average.</p>` : ''}</div>` : ''}
    ${streak ? `<h2>Streak</h2><p>${streak.weeks} week${streak.weeks === 1 ? '' : 's'} in a row (best ${streak.best}), counting weeks with ${streak.threshold}+ recordings.</p>` : ''}
    <h2>Trends</h2>
    <table><tr><th>Area</th><th>Lately (/100)</th><th>Change</th></tr>${rows}</table>
    <h2>Milestones this month</h2>
    ${thisMonth.length
      ? `<ul>${thisMonth.map((m) => { const t = describeMilestone(m); return `<li><b>${esc(t.title)}</b> · ${esc(t.detail)}</li>`; }).join('')}</ul>`
      : '<p class="muted">None this month.</p>'}
    <p class="muted">${growth.lecture_count} lectures in these trends. Made with ClassEcho on ${esc(now.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }))}.</p>
  </body></html>`;
}

/** Monthly summary as a PDF: the print dialog on web (Save as PDF), a shareable file on phones. */
export function MonthlySummaryButton({ growth }: { growth: GrowthOut }) {
  const [busy, setBusy] = useState(false);
  if (growth.lecture_count === 0) return null;

  const make = async () => {
    setBusy(true);
    try {
      const html = monthlySummaryHtml(growth);
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Monthly summary', UTI: 'com.adobe.pdf' });
      }
    } catch (e) {
      Alert.alert('Could not make the summary', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => void make()} style={styles.button}>
      {busy ? (
        <ActivityIndicator color={AppTheme.colors.primaryDark} size="small" />
      ) : (
        <Ionicons color={AppTheme.colors.primaryDark} name="document-text-outline" size={16} />
      )}
      <Text style={styles.text}>Monthly summary (PDF)</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    minHeight: 44,
    marginTop: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: AppTheme.colors.primary,
  },
  text: { fontSize: 14, fontWeight: '700', color: AppTheme.colors.primaryDark },
});
