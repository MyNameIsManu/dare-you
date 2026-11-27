import { Platform, StyleSheet, View, type ViewProps } from "react-native";

import { useTheme } from "@/hooks/use-theme";

/** A soft colour spot: a radial gradient from the theme's orb colour to transparent. */
function Orb({
  size,
  top,
  left,
  right,
}: {
  size: number;
  top: number;
  left?: number;
  right?: number;
}) {
  const theme = useTheme();
  const gradient = `radial-gradient(circle closest-side, ${theme.orb}, ${theme.orbFade})`;

  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        width: size,
        height: size,
        top,
        left,
        right,
        experimental_backgroundImage: gradient,
        ...(Platform.OS === "web"
          ? ({ backgroundImage: gradient } as object)
          : {}),
      }}
    />
  );
}

/**
 * Screen background for the glass look: the ground colour with soft colour
 * spots behind it, so frosted surfaces have something to blur.
 * Put transparent content (ScrollView, plain Views) inside, not ThemedView.
 */
export function GlassScreen({ style, children, ...rest }: ViewProps) {
  const theme = useTheme();

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.background }, style]}
      {...rest}
    >
      <Orb size={460} top={-160} right={-180} />
      <Orb size={520} top={380} left={-260} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden" },
});
