import {
  searchUsers,
  sendFriendRequest,
  type PublicProfile,
} from "@/../utils/friends";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const STATUS_TEXT = {
  requested: "Request sent",
  accepted: "You are now friends",
  already_requested: "Already requested",
  already_friends: "Already friends",
} as const;

export function FriendSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Per-user feedback after tapping "Add", keyed by profile id
  const [sent, setSent] = useState<Record<string, string>>({});

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    // Wait until the user pauses typing for 300 ms before searching
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const found = await searchUsers(q);
        if (!cancelled) {
          setResults(found);
          setError(null);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);

    // A new keystroke cancels the pending search and ignores late results
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  async function handleAdd(profile: PublicProfile) {
    if (!profile.username) return;
    try {
      const status = await sendFriendRequest(profile.username);
      setSent((prev) => ({ ...prev, [profile.id]: STATUS_TEXT[status] }));
    } catch (e) {
      setSent((prev) => ({
        ...prev,
        [profile.id]: e instanceof Error ? e.message : "Something went wrong",
      }));
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search by username"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
        {loading && <ActivityIndicator style={styles.spinner} />}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          query.trim().length >= 2 && !loading && !error ? (
            <Text style={styles.empty}>No users found</Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.names}>
              <Text style={styles.displayName}>
                {item.display_name ?? item.username}
              </Text>
              <Text style={styles.username}>@{item.username}</Text>
            </View>

            {sent[item.id] ? (
              <Text style={styles.status}>{sent[item.id]}</Text>
            ) : (
              <Pressable
                style={styles.addButton}
                onPress={() => handleAdd(item)}
              >
                <Text style={styles.addText}>Add</Text>
              </Pressable>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  searchRow: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  spinner: { marginLeft: 10 },
  error: { color: "#c62828", marginTop: 8 },
  empty: { color: "#888", textAlign: "center", marginTop: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  names: { flex: 1 },
  displayName: { fontSize: 16, fontWeight: "600" },
  username: { fontSize: 14, color: "#888", marginTop: 2 },
  addButton: {
    backgroundColor: "#111",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addText: { color: "#fff", fontWeight: "600" },
  status: { color: "#2e7d32", fontSize: 14 },
});
