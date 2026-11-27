import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import {
  Platform,
  View,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from "react-native";

import { Colors, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

/** The frosted look as a style object, for surfaces that can't be a GlassCard. */
export function glassSurface(theme: typeof Colors.light): ViewStyle {
  return {
    backgroundColor: theme.glass,
    borderColor: theme.glassBorder,
    borderWidth: 1,
    boxShadow: `0 10px 30px ${theme.glassShadow}, inset 0 1px 0 ${theme.glassHighlight}`,
    // Real blur only exists on the web; native falls back to the translucent fill
    ...(Platform.OS === "web"
      ? ({
          backdropFilter: "blur(22px) saturate(170%)",
          WebkitBackdropFilter: "blur(22px) saturate(170%)",
        } as object)
      : {}),
  };
}

type GlassCardProps = ViewProps & {
  radius?: number;
  padding?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * A frosted-glass surface.
 * - iOS 26+: the system's Liquid Glass (expo-glass-effect).
 * - Web: translucent fill with a real backdrop blur.
 * - Android and older iOS: translucent fill, light border, soft shadow.
 * All colours come from the theme tokens (glass, glassBorder, ...).
 */
export function GlassCard({
  radius = Spacing.four,
  padding = Spacing.three,
  style,
  children,
  ...rest
}: GlassCardProps) {
  const theme = useTheme();
  const shape = { borderRadius: radius, padding };

  if (Platform.OS === "ios" && isLiquidGlassAvailable()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme="light"
        style={[shape, style]}
        {...rest}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[glassSurface(theme), shape, style]} {...rest}>
      {children}
    </View>
  );
}
