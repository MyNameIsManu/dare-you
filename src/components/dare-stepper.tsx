import { StyleSheet, View } from "react-native";

import type { Dare } from "@/../utils/dares";
import { glassSurface } from "@/components/glass-card";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n";

const STEPS = ["sent", "accepted", "proof", "review"] as const;

/** Index of the step that is happening now; STEPS.length = everything is done. */
const CURRENT_STEP: Partial<Record<Dare["status"], number>> = {
  pending: 1,
  open: 2,
  submitted: 3,
  completed: STEPS.length,
};

const DOT = 28;

/**
 * Where a dare between two people stands: sent → accepted → proof → review.
 * Renders nothing for dares that ended without a result (declined, expired, failed).
 */
export function DareStepper({ status }: { status: Dare["status"] }) {
  const theme = useTheme();
  const { t } = useI18n();
  const current = CURRENT_STEP[status];
  if (current === undefined) return null;

  // The line runs from the centre of the first dot to the centre of the last
  const lineProgress = Math.min(current, STEPS.length - 1) / (STEPS.length - 1);

  return (
    <View style={styles.row} accessibilityRole="progressbar">
      <View
        style={[styles.line, { backgroundColor: theme.backgroundSelected }]}
      />
      <View
        style={[
          styles.line,
          { backgroundColor: theme.text, width: `${lineProgress * 75}%` },
        ]}
      />
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <View key={step} style={styles.step}>
            <View
              style={[
                styles.dot,
                done && { backgroundColor: theme.text },
                active && {
                  backgroundColor: theme.accent,
                  boxShadow: `0 0 0 5px ${theme.accentGlow}`,
                },
                !done && !active && glassSurface(theme),
              ]}
            >
              {done && (
                <ThemedText style={[styles.check, { color: theme.background }]}>
                  ✓
                </ThemedText>
              )}
              {active && (
                <View
                  style={[styles.inner, { backgroundColor: theme.onAccent }]}
                />
              )}
            </View>
            <ThemedText
              type="small"
              themeColor={active ? "text" : "textSecondary"}
              style={active && styles.activeLabel}
            >
              {t(`detail.steps.${step}`)}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    position: "relative",
  },
  line: {
    position: "absolute",
    top: DOT / 2 - 1,
    left: "12.5%",
    right: "12.5%",
    height: 3,
    borderRadius: 2,
  },
  step: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: 700,
  },
  inner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeLabel: {
    fontWeight: 700,
  },
});
