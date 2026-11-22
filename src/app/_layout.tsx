import { AuthProvider, useAuth } from "@/../utils/auth-context";
import { DaresProvider } from "@/../utils/dares-context";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";

import { SettingsProvider } from "@/components/settings-drawer";
import { useI18n } from "@/i18n";

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
  const colorScheme = useColorScheme();
  // Re-renders the stack when the language changes, so titles update
  const { t } = useI18n();

  // Wait until we know whether a saved login exists
  if (isLoading) return null;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
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
