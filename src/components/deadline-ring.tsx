import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import {
  UrgencyColors,
  formatRemaining,
  type DareProgress,
} from "@/../utils/dare-progress";
import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

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
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const color = UrgencyColors[progress.urgency];
  const [amount, unit] = splitRemaining(progress.remainingMs);

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

/** "3 Tage" → ["3", "Tage übrig"], "abgelaufen" → ["0", "abgelaufen"] */
function splitRemaining(ms: number): [string, string] {
  const text = formatRemaining(ms);
  const [amount, ...rest] = text.split(" ");
  if (rest.length === 0) return ["0", text];
  return [amount, `${rest.join(" ")} übrig`];
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
