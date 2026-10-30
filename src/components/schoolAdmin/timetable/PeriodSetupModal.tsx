import { AppTheme } from '../../../theme/AppTheme';
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { PeriodSlot } from "./TimetableEntryModal";

const STORAGE_KEY = "school_period_slots_v1";

const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function fmt12(time: string): string {
  if (!TIME_PATTERN.test(time)) return time;
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function addMinutes(timeStr: string, mins: number): string {
  let [h, m] = timeStr.split(":").map(Number);
  m += mins;
  while (m >= 60) {
    m -= 60;
    h++;
  }
  while (m < 0) {
    m += 60;
    h--;
  }
  h = h % 24;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function buildSlots(count: number, startTime: string, durationMin: number, bufferMin = 0): PeriodSlot[] {
  const slots: PeriodSlot[] = [];
  let curTime = startTime;
  for (let i = 1; i <= count; i++) {
    const start = curTime;
    const end = addMinutes(start, durationMin);
    slots.push({
      number: i,
      startTime: start,
      endTime: end,
      isBreak: false,
      periodNumber: i,
    });
    curTime = addMinutes(end, bufferMin);
  }
  return slots;
}

function buildSlotsWithLunch(
  count: number,
  startTime: string,
  durationMin: number,
  lunchAfterPeriod = 3,
  lunchDurationMin = 45,
  bufferMin = 0,
  lunchLabel = "Lunch Break",
): PeriodSlot[] {
  const slots: PeriodSlot[] = [];
  let curTime = startTime;
  let slotIndex = 1;
  let periodCount = 0;

  for (let i = 1; i <= count; i++) {
    periodCount++;
    const start = curTime;
    const end = addMinutes(start, durationMin);
    slots.push({
      number: slotIndex++,
      startTime: start,
      endTime: end,
      isBreak: false,
      periodNumber: periodCount,
    });
    curTime = addMinutes(end, bufferMin);

    if (periodCount === lunchAfterPeriod && i < count) {
      const lunchStart = curTime;
      const lunchEnd = addMinutes(lunchStart, lunchDurationMin);
      slots.push({
        number: slotIndex++,
        startTime: lunchStart,
        endTime: lunchEnd,
        label: lunchLabel,
        isBreak: true,
      });
      curTime = addMinutes(lunchEnd, bufferMin);
    }
  }
  return slots;
}

function buildSlotsWithBreaks(
  count: number,
  startTime: string,
  durationMin: number,
  breaks: { afterPeriod: number; label: string; durationMin: number }[],
  bufferMin = 0,
): PeriodSlot[] {
  const slots: PeriodSlot[] = [];
  let curTime = startTime;
  let slotIndex = 1;
  let periodCount = 0;

  for (let i = 1; i <= count; i++) {
    periodCount++;
    const start = curTime;
    const end = addMinutes(start, durationMin);
    slots.push({
      number: slotIndex++,
      startTime: start,
      endTime: end,
      isBreak: false,
      periodNumber: periodCount,
    });
    curTime = addMinutes(end, bufferMin);

    const matchingBreak = breaks.find((b) => b.afterPeriod === periodCount);
    if (matchingBreak && i < count) {
      const breakStart = curTime;
      const breakEnd = addMinutes(breakStart, matchingBreak.durationMin);
      slots.push({
        number: slotIndex++,
        startTime: breakStart,
        endTime: breakEnd,
        label: matchingBreak.label,
        isBreak: true,
      });
      curTime = addMinutes(breakEnd, bufferMin);
    }
  }
  return slots;
}

/** Default quick templates (back-to-back periods with explicit breaks) */
const DEFAULT_TEMPLATES = [
  {
    label: "6 Periods + Lunch (45 min)",
    slots: buildSlotsWithLunch(6, "08:00", 45, 3, 45, 0, "Lunch Break"),
  },
  {
    label: "7 Periods + Recess & Lunch (40 min)",
    slots: buildSlotsWithBreaks(
      7,
      "08:00",
      40,
      [
        { afterPeriod: 3, label: "Recess", durationMin: 15 },
        { afterPeriod: 5, label: "Lunch Break", durationMin: 45 },
      ],
      0,
    ),
  },
  {
    label: "8 Periods + Lunch (40 min)",
    slots: buildSlotsWithLunch(8, "08:00", 40, 4, 45, 0, "Lunch Break"),
  },
  {
    label: "6 Periods (45 min, continuous)",
    slots: buildSlots(6, "08:00", 45, 0),
  },
];

const BREAK_SUGGESTIONS = [
  "Lunch Break",
  "Recess",
  "Morning Break",
  "Snacks",
  "Assembly",
  "Tea Break",
];

type EditRow = {
  id: string;
  number: number;
  startTime: string;
  endTime: string;
  label: string;
  isBreak: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (slots: PeriodSlot[]) => void;
  initialSlots?: PeriodSlot[];
};

export function PeriodSetupModal({ visible, onClose, onSave, initialSlots = [] }: Props) {
  const [rows, setRows] = useState<EditRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Custom Generator State ───────────────────────────────────────────────
  const [showGenerator, setShowGenerator] = useState(false);
  const [genPeriodCount, setGenPeriodCount] = useState("7");
  const [genStartTime, setGenStartTime] = useState("08:00");
  const [genDuration, setGenDuration] = useState("40");
  const [genBuffer, setGenBuffer] = useState("0");
  const [genAddLunch, setGenAddLunch] = useState(true);
  const [genLunchLabel, setGenLunchLabel] = useState("Lunch Break");
  const [genLunchAfter, setGenLunchAfter] = useState("4");
  const [genLunchDuration, setGenLunchDuration] = useState("45");

  // Initialise rows when modal opens
  useEffect(() => {
    if (!visible) return;
    if (initialSlots.length > 0) {
      setRows(
        initialSlots.map((s, idx) => ({
          id: `slot-${idx}-${Date.now()}`,
          number: s.number,
          startTime: s.startTime,
          endTime: s.endTime,
          label: s.label ?? "",
          isBreak: Boolean(s.isBreak),
        })),
      );
    } else {
      // Default initial layout
      setRows(
        DEFAULT_TEMPLATES[0].slots.map((s, idx) => ({
          id: `slot-${idx}-${Date.now()}`,
          number: s.number,
          startTime: s.startTime,
          endTime: s.endTime,
          label: s.label ?? "",
          isBreak: Boolean(s.isBreak),
        })),
      );
    }
    setErrors({});
  }, [visible]);

  // Recalculate teaching period numbering
  const getTeachingPeriodNumber = (index: number): number | null => {
    if (rows[index]?.isBreak) return null;
    let p = 0;
    for (let i = 0; i <= index; i++) {
      if (!rows[i].isBreak) p++;
    }
    return p;
  };

  const addPeriodRow = () => {
    const lastRow = rows[rows.length - 1];
    let nextStart = "08:00";
    let nextEnd = "08:45";

    if (lastRow && TIME_PATTERN.test(lastRow.endTime)) {
      nextStart = lastRow.endTime; // Contiguous: 0 min gap
      let prevDur = 45;
      if (TIME_PATTERN.test(lastRow.startTime)) {
        const [sh, sm] = lastRow.startTime.split(":").map(Number);
        const [eh, em] = lastRow.endTime.split(":").map(Number);
        const diff = eh * 60 + em - (sh * 60 + sm);
        if (diff > 0 && diff <= 180) prevDur = diff;
      }
      nextEnd = addMinutes(nextStart, prevDur);
    }

    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random()}`,
        number: prev.length + 1,
        startTime: nextStart,
        endTime: nextEnd,
        label: "",
        isBreak: false,
      },
    ]);
  };

  const addBreakRow = (presetLabel = "Lunch Break") => {
    const lastRow = rows[rows.length - 1];
    let nextStart = "12:00";
    let nextEnd = "12:45";

    if (lastRow && TIME_PATTERN.test(lastRow.endTime)) {
      nextStart = lastRow.endTime; // Contiguous: 0 min gap
      nextEnd = addMinutes(nextStart, 40);
    }

    setRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random()}`,
        number: prev.length + 1,
        startTime: nextStart,
        endTime: nextEnd,
        label: presetLabel,
        isBreak: true,
      },
    ]);
  };

  const removeRow = (id: string) => {
    setRows((prev) =>
      prev
        .filter((r) => r.id !== id)
        .map((r, i) => ({ ...r, number: i + 1 })),
    );
  };

  const toggleRowType = (id: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const newIsBreak = !r.isBreak;
        return {
          ...r,
          isBreak: newIsBreak,
          label: newIsBreak ? (r.label || "Lunch Break") : "",
        };
      }),
    );
  };

  const updateRow = (id: string, key: keyof EditRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)),
    );
    setErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const applyTemplate = (slots: PeriodSlot[]) => {
    setRows(
      slots.map((s, idx) => ({
        id: `template-${idx}-${Date.now()}`,
        number: s.number,
        startTime: s.startTime,
        endTime: s.endTime,
        label: s.label ?? "",
        isBreak: Boolean(s.isBreak),
      })),
    );
    setErrors({});
  };

  // ─── Generate from Custom Wizard ──────────────────────────────────────────
  const handleGenerateCustom = () => {
    const pCount = parseInt(genPeriodCount, 10);
    const dur = parseInt(genDuration, 10);
    const buf = parseInt(genBuffer, 10) || 0;
    const lunchAfter = parseInt(genLunchAfter, 10);
    const lunchDur = parseInt(genLunchDuration, 10);

    if (!pCount || pCount <= 0 || pCount > 15) {
      Alert.alert("Invalid period count", "Please enter a period count between 1 and 15.");
      return;
    }
    if (!TIME_PATTERN.test(genStartTime.trim())) {
      Alert.alert("Invalid start time", "Please enter a valid start time like 08:00 or 09:00.");
      return;
    }
    if (!dur || dur < 15 || dur > 180) {
      Alert.alert("Invalid duration", "Please enter a period duration between 15 and 180 minutes.");
      return;
    }

    let generated: PeriodSlot[] = [];
    if (genAddLunch && lunchAfter > 0 && lunchAfter < pCount && (lunchDur || 45) > 0) {
      generated = buildSlotsWithLunch(
        pCount,
        genStartTime.trim(),
        dur,
        lunchAfter,
        lunchDur || 45,
        buf,
        genLunchLabel.trim() || "Lunch Break",
      );
    } else {
      generated = buildSlots(pCount, genStartTime.trim(), dur, buf);
    }

    applyTemplate(generated);
    setShowGenerator(false);
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    for (const r of rows) {
      if (!TIME_PATTERN.test(r.startTime.trim())) {
        errs[r.id] = 'Start time must be like "08:00"';
      } else if (!TIME_PATTERN.test(r.endTime.trim())) {
        errs[r.id] = 'End time must be like "09:00"';
      } else if (r.startTime >= r.endTime) {
        errs[r.id] = "End time must be after start time";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (rows.length === 0) {
      Alert.alert("No periods", "Add at least one period slot before saving.");
      return;
    }
    if (!validate()) return;

    setSaving(true);
    try {
      let teachingCount = 0;
      const slots: PeriodSlot[] = rows.map((r, i) => {
        const isBreak = r.isBreak;
        let periodNumber: number | undefined = undefined;
        if (!isBreak) {
          teachingCount++;
          periodNumber = teachingCount;
        }

        return {
          number: i + 1,
          startTime: r.startTime.trim(),
          endTime: r.endTime.trim(),
          label: r.label.trim() || (isBreak ? "Break" : undefined),
          isBreak: isBreak,
          periodNumber: periodNumber,
        };
      });

      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
      onSave(slots);
      onClose();
    } catch {
      Alert.alert("Error", "Couldn't save period slots. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              {/* ── Drag handle ────────────────────────────────────── */}
              <View style={styles.dragHandle} />

              {/* ── Header ─────────────────────────────────────────── */}
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Period & Break Setup</Text>
                  <Text style={styles.subtitle}>
                    Configure daily teaching periods, lunch breaks, and recess
                  </Text>
                </View>
                <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={AppTheme.colors.textSecondary} />
                </Pressable>
              </View>

              {/* ── Custom Generator Toggle & Quick Presets ──────────── */}
              <View style={styles.topActionsContainer}>
                <Pressable
                  accessibilityRole="button"
                  style={[
                    styles.generatorToggleBtn,
                    showGenerator && styles.generatorToggleBtnActive,
                  ]}
                  onPress={() => setShowGenerator(!showGenerator)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons
                      name="flash"
                      size={15}
                      color={showGenerator ? AppTheme.colors.white : AppTheme.colors.primary}
                    />
                    <Text
                      style={[
                        styles.generatorToggleText,
                        showGenerator && { color: AppTheme.colors.white },
                      ]}
                    >
                      {showGenerator ? "Hide Custom Generator" : "⚡ Custom Schedule Generator"}
                    </Text>
                  </View>
                  <Ionicons
                    name={showGenerator ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={showGenerator ? AppTheme.colors.white : AppTheme.colors.primary}
                  />
                </Pressable>

                {/* ── Custom Generator Expanded Box ──────────────────── */}
                {showGenerator && (
                  <View style={styles.generatorBox}>
                    <Text style={styles.generatorBoxTitle}>Generate Schedule Automatically</Text>
                    <Text style={styles.generatorBoxSub}>
                      Enter your periods, timing, and lunch break to create your full timetable layout.
                    </Text>

                    {/* Inputs Row 1: Periods, Start Time, Duration & Gap */}
                    <View style={styles.genInputsRow}>
                      <View style={styles.genField}>
                        <Text style={styles.genFieldLabel}>Total Periods</Text>
                        <TextInput
                          style={styles.genInput}
                          value={genPeriodCount}
                          onChangeText={setGenPeriodCount}
                          keyboardType="numeric"
                          placeholder="7"
                        />
                      </View>

                      <View style={styles.genField}>
                        <Text style={styles.genFieldLabel}>Start Time</Text>
                        <TextInput
                          style={styles.genInput}
                          value={genStartTime}
                          onChangeText={setGenStartTime}
                          placeholder="08:00"
                        />
                      </View>

                      <View style={styles.genField}>
                        <Text style={styles.genFieldLabel}>Period (min)</Text>
                        <TextInput
                          style={styles.genInput}
                          value={genDuration}
                          onChangeText={setGenDuration}
                          keyboardType="numeric"
                          placeholder="40"
                        />
                      </View>

                      <View style={styles.genField}>
                        <Text style={styles.genFieldLabel}>Gap / Buffer</Text>
                        <TextInput
                          style={styles.genInput}
                          value={genBuffer}
                          onChangeText={setGenBuffer}
                          keyboardType="numeric"
                          placeholder="0"
                        />
                      </View>
                    </View>

                    {/* Quick Duration Chips */}
                    <View style={styles.quickChipsRow}>
                      <Text style={styles.quickChipLabel}>Period Duration:</Text>
                      {["35", "40", "45", "50", "60"].map((d) => (
                        <Pressable
                          accessibilityRole="button"
                          key={d}
                          style={[
                            styles.quickChip,
                            genDuration === d && styles.quickChipActive,
                          ]}
                          onPress={() => setGenDuration(d)}
                        >
                          <Text
                            style={[
                              styles.quickChipText,
                              genDuration === d && styles.quickChipTextActive,
                            ]}
                          >
                            {d}m
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {/* Quick Gap / Buffer Chips */}
                    <View style={styles.quickChipsRow}>
                      <Text style={styles.quickChipLabel}>Gap between Periods:</Text>
                      {[
                        { val: "0", label: "0m (Continuous)" },
                        { val: "2", label: "2m" },
                        { val: "5", label: "5m" },
                        { val: "10", label: "10m" },
                      ].map((g) => (
                        <Pressable
                          accessibilityRole="button"
                          key={g.val}
                          style={[
                            styles.quickChip,
                            genBuffer === g.val && styles.quickChipActive,
                          ]}
                          onPress={() => setGenBuffer(g.val)}
                        >
                          <Text
                            style={[
                              styles.quickChipText,
                              genBuffer === g.val && styles.quickChipTextActive,
                            ]}
                          >
                            {g.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {/* Lunch Break Option */}
                    <View style={styles.lunchOptionRow}>
                      <Pressable
                        accessibilityRole="button"
                        style={styles.lunchCheckRow}
                        onPress={() => setGenAddLunch(!genAddLunch)}
                      >
                        <Ionicons
                          name={genAddLunch ? "checkbox" : "square-outline"}
                          size={20}
                          color={genAddLunch ? AppTheme.colors.orange : AppTheme.colors.textSecondary}
                        />
                        <Text style={styles.lunchCheckLabel}>Insert Break / Lunch</Text>
                      </Pressable>

                      {genAddLunch && (
                        <View style={styles.lunchConfigRow}>
                          <TextInput
                            style={[styles.lunchMiniInput, { width: 95, textAlign: "left", paddingHorizontal: 6 }]}
                            value={genLunchLabel}
                            onChangeText={setGenLunchLabel}
                            placeholder="Lunch Break"
                          />
                          <Text style={styles.lunchConfigLabel}>After P</Text>
                          <TextInput
                            style={styles.lunchMiniInput}
                            value={genLunchAfter}
                            onChangeText={setGenLunchAfter}
                            keyboardType="numeric"
                          />
                          <Text style={styles.lunchConfigLabel}>Duration:</Text>
                          <TextInput
                            style={[styles.lunchMiniInput, { width: 42 }]}
                            value={genLunchDuration}
                            onChangeText={setGenLunchDuration}
                            keyboardType="numeric"
                          />
                          <Text style={styles.lunchConfigLabel}>min</Text>
                        </View>
                      )}
                    </View>

                    {/* Generate Button */}
                    <Pressable
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.generateBtn,
                        pressed && { opacity: 0.85 },
                      ]}
                      onPress={handleGenerateCustom}
                    >
                      <Ionicons name="sparkles" size={15} color={AppTheme.colors.white} />
                      <Text style={styles.generateBtnText}>Generate & Populate Periods</Text>
                    </Pressable>
                  </View>
                )}

                {/* ── Quick template strip ────────────────────────────── */}
                {!showGenerator && (
                  <View style={styles.templateStrip}>
                    <Text style={styles.templateLabel}>Quick presets:</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.templateRow}
                    >
                      {DEFAULT_TEMPLATES.map((t) => (
                        <Pressable
                          accessibilityRole="button"
                          key={t.label}
                          style={({ pressed }) => [
                            styles.templateChip,
                            pressed && { opacity: 0.7 },
                          ]}
                          onPress={() => applyTemplate(t.slots)}
                        >
                          <Ionicons
                            name="flash-outline"
                            size={11}
                            color={AppTheme.colors.primary}
                          />
                          <Text style={styles.templateChipText}>{t.label}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* ── Rows List ───────────────────────────────────────── */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                style={styles.scroll}
              >
                {rows.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Ionicons
                      name="time-outline"
                      size={36}
                      color={AppTheme.colors.disabled}
                    />
                    <Text style={styles.emptyText}>
                      No periods configured yet. Use the Custom Generator above or add periods manually.
                    </Text>
                  </View>
                ) : (
                  rows.map((row, idx) => {
                    const isBreak = row.isBreak;
                    const pNum = getTeachingPeriodNumber(idx);

                    return (
                      <View
                        key={row.id}
                        style={[
                          styles.periodRow,
                          isBreak && styles.breakRow,
                        ]}
                      >
                        {/* Period/Break badge & Type toggle */}
                        <Pressable
                          accessibilityRole="button"
                          style={[
                            styles.periodBadge,
                            isBreak && styles.breakBadge,
                          ]}
                          onPress={() => toggleRowType(row.id)}
                        >
                          {isBreak ? (
                            <Ionicons name="cafe" size={15} color={AppTheme.colors.orangeText} />
                          ) : (
                            <Text style={styles.periodBadgeText}>P{pNum}</Text>
                          )}
                        </Pressable>

                        <View style={styles.periodFields}>
                          {/* Row Header: Type switch & Title */}
                          <View style={styles.rowTypeRow}>
                            <View style={styles.rowTypePill}>
                              <Pressable
                                accessibilityRole="button"
                                onPress={() => {
                                  if (row.isBreak) toggleRowType(row.id);
                                }}
                                style={[
                                  styles.typeOption,
                                  !isBreak && styles.typeOptionActive,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.typeOptionText,
                                    !isBreak && styles.typeOptionTextActive,
                                  ]}
                                >
                                  Class Period
                                </Text>
                              </Pressable>

                              <Pressable
                                accessibilityRole="button"
                                onPress={() => {
                                  if (!row.isBreak) toggleRowType(row.id);
                                }}
                                style={[
                                  styles.typeOption,
                                  isBreak && styles.typeOptionBreakActive,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.typeOptionText,
                                    isBreak && styles.typeOptionBreakTextActive,
                                  ]}
                                >
                                  ☕ Break
                                </Text>
                              </Pressable>
                            </View>

                            {isBreak ? (
                              <Text style={styles.breakNoticeText}>School Break</Text>
                            ) : null}
                          </View>

                          {/* Times row */}
                          <View style={styles.timesRow}>
                            <View style={styles.timeField}>
                              <Text style={styles.fieldLabel}>Start Time</Text>
                              <TextInput
                                style={[
                                  styles.timeInput,
                                  errors[row.id] ? styles.inputError : null,
                                ]}
                                value={row.startTime}
                                onChangeText={(v) => updateRow(row.id, "startTime", v)}
                                placeholder="08:00"
                                placeholderTextColor={AppTheme.colors.hint}
                                keyboardType="numbers-and-punctuation"
                                maxLength={5}
                              />
                            </View>

                            <Text style={styles.timeDash}>–</Text>

                            <View style={styles.timeField}>
                              <Text style={styles.fieldLabel}>End Time</Text>
                              <TextInput
                                style={[
                                  styles.timeInput,
                                  errors[row.id] ? styles.inputError : null,
                                ]}
                                value={row.endTime}
                                onChangeText={(v) => updateRow(row.id, "endTime", v)}
                                placeholder="08:45"
                                placeholderTextColor={AppTheme.colors.hint}
                                keyboardType="numbers-and-punctuation"
                                maxLength={5}
                              />
                            </View>

                            {/* Label */}
                            <View style={[styles.timeField, { flex: 1.4 }]}>
                              <Text style={styles.fieldLabel}>
                                {isBreak ? "Break Name" : "Label (opt.)"}
                              </Text>
                              <TextInput
                                style={[
                                  styles.timeInput,
                                  isBreak && styles.breakInput,
                                ]}
                                value={row.label}
                                onChangeText={(v) => updateRow(row.id, "label", v)}
                                placeholder={isBreak ? "e.g. Lunch Break" : "e.g. Activity"}
                                placeholderTextColor={AppTheme.colors.hint}
                              />
                            </View>
                          </View>

                          {/* Quick suggestions for breaks */}
                          {isBreak && (
                            <ScrollView
                              horizontal
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.breakSuggestionsRow}
                            >
                              {BREAK_SUGGESTIONS.map((sugg) => (
                                <Pressable
                                  accessibilityRole="button"
                                  key={sugg}
                                  onPress={() => updateRow(row.id, "label", sugg)}
                                  style={[
                                    styles.suggestionChip,
                                    row.label === sugg && styles.suggestionChipActive,
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.suggestionChipText,
                                      row.label === sugg && styles.suggestionChipTextActive,
                                    ]}
                                  >
                                    {sugg}
                                  </Text>
                                </Pressable>
                              ))}
                            </ScrollView>
                          )}

                          {/* Time range preview */}
                          {TIME_PATTERN.test(row.startTime) && TIME_PATTERN.test(row.endTime) && (
                            <Text
                              style={[
                                styles.timePreview,
                                isBreak && { color: AppTheme.colors.orangeText },
                              ]}
                            >
                              {fmt12(row.startTime)} – {fmt12(row.endTime)}
                            </Text>
                          )}

                          {/* Error */}
                          {errors[row.id] ? (
                            <Text style={styles.rowError}>{errors[row.id]}</Text>
                          ) : null}
                        </View>

                        {/* Delete */}
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Remove period"
                          onPress={() => removeRow(row.id)}
                          hitSlop={8}
                          style={styles.removeBtn}
                        >
                          <Ionicons name="trash-outline" size={16} color={AppTheme.colors.error} />
                        </Pressable>
                      </View>
                    );
                  })
                )}

                {/* ── Add Buttons (Period & Break) ────────────────────── */}
                <View style={styles.addButtonsContainer}>
                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.addRowBtn,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={addPeriodRow}
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={18}
                      color={AppTheme.colors.primary}
                    />
                    <Text style={styles.addRowText}>+ Add Period</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.addBreakBtn,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => addBreakRow("Lunch Break")}
                  >
                    <Ionicons name="cafe-outline" size={18} color={AppTheme.colors.orange} />
                    <Text style={styles.addBreakText}>+ Add Lunch / Break</Text>
                  </Pressable>
                </View>

                <View style={{ height: 16 }} />
              </ScrollView>

              {/* ── Footer ─────────────────────────────────────────── */}
              <View style={styles.footer}>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={onClose}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.saveBtn,
                    pressed && { opacity: 0.88 },
                  ]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={AppTheme.colors.white} size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color={AppTheme.colors.white} />
                      <Text style={styles.saveText}>Save Schedule</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/** Load saved period slots from AsyncStorage */
export async function loadPeriodSlots(): Promise<PeriodSlot[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PeriodSlot[];
  } catch {
    return [];
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
  },

  sheet: {
    backgroundColor: AppTheme.colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    maxHeight: "92%",
  },

  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: AppTheme.colors.border,
    alignSelf: "center",
    marginBottom: 14,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  title: {
    fontSize: 20,
    fontWeight: "800",
    color: AppTheme.colors.textPrimary,
  },

  subtitle: {
    marginTop: 2,
    fontSize: 13,
    color: AppTheme.colors.textSecondary,
  },

  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },

  topActionsContainer: {
    marginBottom: 12,
    gap: 8,
  },

  generatorToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: AppTheme.colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1,
    borderColor: AppTheme.colors.primary + "33",
  },
  generatorToggleBtnActive: {
    backgroundColor: AppTheme.colors.primary,
    borderColor: AppTheme.colors.primary,
  },
  generatorToggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: AppTheme.colors.primaryText,
  },

  generatorBox: {
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderRadius: AppTheme.radius.medium,
    padding: 14,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    gap: 10,
  },
  generatorBoxTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: AppTheme.colors.textPrimary,
  },
  generatorBoxSub: {
    fontSize: 12,
    color: AppTheme.colors.textSecondary,
    lineHeight: 16,
  },

  genInputsRow: {
    flexDirection: "row",
    gap: 10,
  },
  genField: {
    flex: 1,
    gap: 4,
  },
  genFieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: AppTheme.colors.textSecondary,
  },
  genNumberInputWrap: {
    flexDirection: "row",
  },
  genInput: {
    height: 38,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.small,
    paddingHorizontal: 10,
    fontSize: 14,
    color: AppTheme.colors.textPrimary,
    backgroundColor: AppTheme.colors.surface,
  },

  quickChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  quickChipLabel: {
    fontSize: 11,
    color: AppTheme.colors.textSecondary,
    fontWeight: "600",
  },
  quickChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: AppTheme.colors.surface,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  quickChipActive: {
    backgroundColor: AppTheme.colors.primary,
    borderColor: AppTheme.colors.primary,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: AppTheme.colors.textSecondary,
  },
  quickChipTextActive: {
    color: AppTheme.colors.white,
  },

  lunchOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: AppTheme.colors.border + "88",
  },
  lunchCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  lunchCheckLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: AppTheme.colors.orangeText,
  },
  lunchConfigRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  lunchConfigLabel: {
    fontSize: 11,
    color: AppTheme.colors.textSecondary,
    fontWeight: "600",
  },
  lunchMiniInput: {
    width: 32,
    height: 30,
    borderWidth: 1,
    borderColor: AppTheme.colors.orangeBorder,
    borderRadius: 4,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: AppTheme.colors.orangeText,
    backgroundColor: AppTheme.colors.orangeTint,
  },

  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: AppTheme.colors.primary,
    borderRadius: AppTheme.radius.medium,
    paddingVertical: 10,
    marginTop: 4,
  },
  generateBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: AppTheme.colors.white,
  },

  templateStrip: {
    gap: 6,
  },
  templateLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: AppTheme.colors.textSecondary,
    letterSpacing: 0.4,
  },
  templateRow: {
    gap: 8,
  },
  templateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: AppTheme.colors.primaryLight,
    borderRadius: AppTheme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: AppTheme.colors.primary + "33",
  },
  templateChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: AppTheme.colors.primaryText,
  },

  scroll: { flex: 1 },

  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: AppTheme.colors.textSecondary,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 18,
  },

  // ── Period & Break rows ───────────────────────────────────────────
  periodRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
    backgroundColor: AppTheme.colors.surfaceSoft,
    borderRadius: AppTheme.radius.medium,
    padding: 12,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
  },
  breakRow: {
    backgroundColor: "#FFFBF7",
    borderColor: AppTheme.colors.orangeBorder,
  },

  periodBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  breakBadge: {
    backgroundColor: AppTheme.colors.orangeSoft,
    borderWidth: 1,
    borderColor: AppTheme.colors.orangeBorder,
  },
  periodBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: AppTheme.colors.white,
  },

  periodFields: {
    flex: 1,
    gap: 6,
  },

  rowTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowTypePill: {
    flexDirection: "row",
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.pill,
    padding: 2,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    alignSelf: "flex-start",
  },
  typeOption: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: AppTheme.radius.pill,
  },
  typeOptionActive: {
    backgroundColor: AppTheme.colors.primary,
  },
  typeOptionBreakActive: {
    backgroundColor: AppTheme.colors.orange,
  },
  typeOptionText: {
    fontSize: 10,
    fontWeight: "700",
    color: AppTheme.colors.textSecondary,
  },
  typeOptionTextActive: {
    color: AppTheme.colors.white,
  },
  typeOptionBreakTextActive: {
    color: AppTheme.colors.white,
  },

  breakNoticeText: {
    fontSize: 11,
    fontWeight: "700",
    color: AppTheme.colors.orangeText,
  },

  timesRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
  },

  timeField: {
    flex: 1,
    gap: 3,
  },

  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: AppTheme.colors.textSecondary,
    letterSpacing: 0.3,
  },

  timeInput: {
    height: 38,
    borderWidth: 1,
    borderColor: AppTheme.colors.border,
    borderRadius: AppTheme.radius.small,
    paddingHorizontal: 10,
    fontSize: 13,
    color: AppTheme.colors.textPrimary,
    backgroundColor: AppTheme.colors.surface,
  },
  breakInput: {
    borderColor: AppTheme.colors.orangeBorder,
    backgroundColor: AppTheme.colors.white,
    color: AppTheme.colors.orangeText,
    fontWeight: "700",
  },

  inputError: {
    borderColor: AppTheme.colors.error,
    backgroundColor: AppTheme.colors.dangerBg,
  },

  timeDash: {
    fontSize: 16,
    color: AppTheme.colors.textSecondary,
    paddingBottom: 8,
  },

  breakSuggestionsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 2,
  },
  suggestionChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: AppTheme.colors.orangeSoft,
    borderWidth: 1,
    borderColor: AppTheme.colors.orangeBorder,
  },
  suggestionChipActive: {
    backgroundColor: AppTheme.colors.orange,
    borderColor: AppTheme.colors.orange,
  },
  suggestionChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: AppTheme.colors.orangeStrong,
  },
  suggestionChipTextActive: {
    color: AppTheme.colors.white,
  },

  timePreview: {
    fontSize: 11,
    color: AppTheme.colors.primaryText,
    fontWeight: "600",
    marginTop: 1,
  },

  rowError: {
    fontSize: 11,
    color: AppTheme.colors.danger,
    marginTop: 2,
  },

  removeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: AppTheme.colors.dangerBg,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  addButtonsContainer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  addRowBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.primary + "66",
    borderStyle: "dashed",
    justifyContent: "center",
    backgroundColor: AppTheme.colors.surface,
  },
  addRowText: {
    fontSize: 13,
    fontWeight: "700",
    color: AppTheme.colors.primaryText,
  },
  addBreakBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: AppTheme.radius.medium,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.orangeBorder,
    borderStyle: "dashed",
    justifyContent: "center",
    backgroundColor: "#FFFBF7",
  },
  addBreakText: {
    fontSize: 13,
    fontWeight: "700",
    color: AppTheme.colors.orangeText,
  },

  // ── Footer ───────────────────────────────────────────────────────
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: AppTheme.colors.border,
  },

  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: AppTheme.radius.large,
    borderWidth: 1.5,
    borderColor: AppTheme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: AppTheme.colors.textSecondary,
  },

  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: AppTheme.radius.large,
    backgroundColor: AppTheme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  saveText: {
    fontSize: 15,
    fontWeight: "700",
    color: AppTheme.colors.white,
  },
});
