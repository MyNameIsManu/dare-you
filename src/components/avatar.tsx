import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { useTheme } from "@/hooks/use-theme";

/** "Max Mustermann" → "MM", "max" → "M" */
function initials(name: string) {
  const parts = name.replace(/^@/, "").trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts.at(-1)!] : parts;
  return letters.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

/** Round profile picture; falls back to initials while there is no photo. */
export function Avatar({
  name,
  url,
  size = 64,
}: {
  name: string;
  url?: string | null;
  size?: number;
}) {
  const theme = useTheme();
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={shape}
        contentFit="cover"
        accessibilityIgnoresInvertColors
      />
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        shape,
        { backgroundColor: theme.backgroundSelected },
      ]}
      accessible={false}
    >
      <ThemedText
        style={{
          fontSize: size * 0.38,
          lineHeight: size * 0.5,
          fontWeight: 700,
        }}
      >
        {initials(name)}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: "center",
    justifyContent: "center",
  },
});
