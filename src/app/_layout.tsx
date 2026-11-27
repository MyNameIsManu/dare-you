import { AuthProvider, useAuth } from "@/../utils/auth-context";
import { DaresProvider } from "@/../utils/dares-context";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { SettingsProvider } from "@/components/settings-drawer";
import { Colors } from "@/constants/theme";
import { useI18n } from "@/i18n";

/** Navigation chrome (headers, back button, screen background) follows our tokens. */
const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: Colors.light.accent,
    background: Colors.light.background,
    text: Colors.light.text,
  },
};

export default function RootLayout() {
  return (
    <AuthProvider>
      {/* Live "my dares" for every screen (tabs, badge, detail) */}
      <DaresProvider>
        {/* Settings sidebar, reachable from every tab */}
        <SettingsProvider>
          <RootNavigator />
        </SettingsProvider>
      </DaresProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { session, isLoading } = useAuth();
  // Re-renders the stack when the language changes, so titles update
  const { t } = useI18n();

  // Wait until we know whether a saved login exists
  if (isLoading) return null;

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack>
        {/* Only reachable when logged in */}
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="profile/[id]"
            options={{
              title: t("screens.profile"),
              headerBackTitle: t("screens.back"),
            }}
          />
          <Stack.Screen
            name="dares/[id]"
            options={{
              title: t("screens.dare"),
              headerBackTitle: t("screens.back"),
            }}
          />
        </Stack.Protected>

        {/* Only reachable when logged out */}
        <Stack.Protected guard={!session}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
