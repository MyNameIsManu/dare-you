import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import {
  UrgencyColors,
  remainingParts,
  type DareProgress,
} from "@/../utils/dare-progress";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";
import { useI18n } from "@/i18n";

type Props = {
  progress: DareProgress;
  size?: number;
  strokeWidth?: number;
};

/** Ring that fills up as the time of a dare runs out; time left in the middle. */
export function DeadlineRing({
  progress,
  size = 200,
  strokeWidth = 14,
}: Props) {
  const theme = useTheme();
  const { t } = useI18n();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = UrgencyColors[progress.urgency];
  // Big number in the middle, unit below: "3" + "Tage übrig"
  const parts = remainingParts(progress.remainingMs);
  const amount = parts ? String(parts.count) : "0";
  const unit = parts
    ? `${parts.unit} ${t("progress.left")}`
    : t("progress.expired");

  return (
    <View
      style={{ width: size, height: size }}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(progress.elapsed * 100),
      }}
    >
      {/* Start at 12 o'clock and fill clockwise */}
      <Svg width={size} height={size} style={styles.rotated}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.backgroundSelected}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress.elapsed)}
          fill="none"
        />
      </Svg>

      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <ThemedText style={[styles.amount, { color }]}>{amount}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {unit}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rotated: {
    transform: [{ rotate: "-90deg" }],
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  amount: {
    fontSize: 48,
    lineHeight: 52,
    fontWeight: 700,
  },
});
