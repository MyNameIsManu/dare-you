import { useAuth } from "@/../utils/auth-context";
import {
  getDare,
  getProofUrl,
  personName,
  reviewDareProof,
  submitDareProof,
  type Dare,
} from "@/../utils/dares";
import { useDares } from "@/../utils/dares-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { ActionButton } from "@/components/profile-row";
import { ThemedText } from "@/components/themed-text";
import { MaxContentWidth, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { getLocale, t, useI18n } from "@/i18n";

type PickedPhoto = { uri: string; mimeType?: string | null };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(getLocale(), {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function DareDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dareId = Number(id);
  const theme = useTheme();
  useI18n(); // re-render when the language changes
  const { session } = useAuth();
  const myId = session?.user.id;

  const [dare, setDare] = useState<Dare | null | undefined>(undefined);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [picked, setPicked] = useState<PickedPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const found = await getDare(dareId);
      setDare(found);
      setProofUrl(
        found?.proof_path ? await getProofUrl(found.proof_path) : null,
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("detail.loadFailed"));
    }
  }, [dareId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Live: reload when one of my dares changes (e.g. the friend submits proof)
  const { onDareChange } = useDares();
  useEffect(() => onDareChange(load), [onDareChange, load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      setPicked(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.somethingWentWrong"));
    } finally {
      await load();
      setBusy(false);
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted && Platform.OS !== "web") {
      setError(t("detail.noCamera"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) setPicked(result.assets[0]);
  }

  async function choosePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!result.canceled && result.assets?.[0]) setPicked(result.assets[0]);
  }

  function reject() {
    const title = t("detail.rejectConfirm");
    const message =
      dare && new Date(dare.deadline) > new Date()
        ? t("detail.rejectReopens")
        : t("detail.rejectFails");
    const doReject = () => run(() => reviewDareProof(dareId, false));

    if (Platform.OS === "web") {
      if (globalThis.confirm(`${title}\n\n${message}`)) doReject();
      return;
    }
    Alert.alert(title, message, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.decline"),
        style: "destructive",
        onPress: doReject,
      },
    ]);
  }

  if (dare === undefined) {
    return error ? (
      <ThemedText style={[styles.error, styles.padded]}>{error}</ThemedText>
    ) : (
      <ActivityIndicator style={styles.padded} />
    );
  }
  if (dare === null) {
    return (
      <ThemedText themeColor="textSecondary" style={styles.padded}>
        {t("detail.notFound")}
      </ThemedText>
    );
  }

  const isAssignee = dare.assignee_id === myId;
  const isCreator = dare.creator_id === myId;
  const isOwnDare = dare.creator_id === dare.assignee_id;
  const isOverdue = new Date(dare.deadline) < new Date();
  const canSubmit = isAssignee && dare.status === "open" && !isOverdue;
  const canReview = isCreator && !isOwnDare && dare.status === "submitted";

  return (
    <>
      <Stack.Screen options={{ title: dare.title }} />

      <ScrollView
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* About the dare */}
        <View style={styles.section}>
          {!isOwnDare && (
            <ThemedText type="small" themeColor="textSecondary">
              {isCreator
                ? t("common.to", { name: personName(dare.assignee) })
                : t("common.from", { name: personName(dare.creator) })}
            </ThemedText>
          )}
          <ThemedText type="subtitle">{dare.title}</ThemedText>
          {dare.description && <ThemedText>{dare.description}</ThemedText>}
          <ThemedText
            type="smallBold"
            themeColor={
              isOverdue && dare.status === "open" ? undefined : "textSecondary"
            }
            style={
              isOverdue && dare.status === "open" ? styles.overdue : undefined
            }
          >
            {t("common.dueUntil", { date: formatDate(dare.deadline) })}
          </ThemedText>
        </View>

        {/* Where the dare stands */}
        <View
          style={[
            styles.statusBox,
            { backgroundColor: theme.backgroundElement },
          ]}
        >
          <ThemedText type="smallBold">
            {statusText(dare, { isAssignee, isCreator, isOverdue })}
          </ThemedText>
        </View>

        {/* Submitted / accepted proof */}
        {proofUrl && !picked && (
          <Image
            source={{ uri: proofUrl }}
            style={styles.photo}
            contentFit="cover"
            accessibilityLabel={t("detail.proofPhoto")}
          />
        )}

        {/* Assignee: pick a photo, check it, submit */}
        {canSubmit && (
          <View style={styles.section}>
            {picked ? (
              <>
                <Image
                  source={{ uri: picked.uri }}
                  style={styles.photo}
                  contentFit="cover"
                  accessibilityLabel={t("detail.selectedPhoto")}
                />
                <View style={styles.buttons}>
                  <ActionButton
                    label={t("detail.otherPhoto")}
                    variant="secondary"
                    disabled={busy}
                    onPress={() => setPicked(null)}
                  />
                  <ActionButton
                    label={
                      isOwnDare ? t("detail.markDone") : t("detail.submitProof")
                    }
                    busy={busy}
                    onPress={() => run(() => submitDareProof(dareId, picked))}
                  />
                </View>
              </>
            ) : (
              <>
                <ThemedText type="small" themeColor="textSecondary">
                  {isOwnDare
                    ? t("detail.uploadOwn")
                    : t("detail.uploadFriend", {
                        name: personName(dare.creator),
                      })}
                </ThemedText>
                <View style={styles.buttons}>
                  <ActionButton
                    label={t("detail.takePhoto")}
                    onPress={takePhoto}
                  />
                  <ActionButton
                    label={t("detail.choosePhoto")}
                    variant="secondary"
                    onPress={choosePhoto}
                  />
                </View>
              </>
            )}
          </View>
        )}

        {/* Creator: decide on the proof */}
        {canReview && (
          <View style={styles.buttons}>
            <ActionButton
              label={t("common.decline")}
              variant="danger"
              disabled={busy}
              onPress={reject}
            />
            <ActionButton
              label={t("detail.approve")}
              busy={busy}
              onPress={() => run(() => reviewDareProof(dareId, true))}
            />
          </View>
        )}

        {error && <ThemedText style={styles.error}>{error}</ThemedText>}
      </ScrollView>
    </>
  );
}

/** One sentence that explains the current state from my point of view. */
function statusText(
  dare: Dare,
  me: { isAssignee: boolean; isCreator: boolean; isOverdue: boolean },
) {
  const creator = personName(dare.creator);
  const assignee = personName(dare.assignee);

  switch (dare.status) {
    case "pending":
      return me.isAssignee
        ? t("detail.status.pendingMe")
        : t("detail.status.pendingOther", { name: assignee });
    case "open":
      if (me.isOverdue) return t("detail.status.overdue");
      return me.isAssignee
        ? t("detail.status.openMe")
        : t("detail.status.openOther", { name: assignee });
    case "submitted":
      return me.isCreator
        ? t("detail.status.submittedCreator", { name: assignee })
        : t("detail.status.submittedAssignee", { name: creator });
    case "completed":
      return dare.completed_at
        ? t("detail.status.completedOn", {
            date: formatDate(dare.completed_at),
          })
        : t("detail.status.completed");
    case "failed":
      return t("detail.status.failed");
    case "declined":
      return me.isCreator
        ? t("detail.status.declinedCreator", { name: assignee })
        : t("detail.status.declinedMe");
    case "expired":
      return me.isCreator
        ? t("detail.status.expiredCreator", { name: assignee })
        : t("detail.status.expiredMe");
  }
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.four,
    gap: Spacing.four,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  padded: {
    padding: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  statusBox: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  photo: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: Spacing.three,
  },
  buttons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  overdue: {
    color: "#E5484D",
  },
  error: {
    color: "#c62828",
  },
});
