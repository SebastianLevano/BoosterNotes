import { Pressable, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";

import type { Citation } from "../lib/ai";
import { colors, font, radius, space } from "../lib/theme";

export function CitationCard({ citation }: { citation: Citation }) {
  const open = () => {
    WebBrowser.openBrowserAsync(citation.url).catch(() => {});
  };

  let host = citation.url;
  try {
    host = new URL(citation.url).hostname.replace(/^www\./, "");
  } catch {
    /* noop */
  }

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={open}
    >
      <Text style={styles.title} numberOfLines={2}>
        {citation.title}
      </Text>
      {citation.snippet ? (
        <Text style={styles.snippet} numberOfLines={3}>
          {citation.snippet}
        </Text>
      ) : null}
      <View style={styles.urlRow}>
        <Ionicons
          name="open-outline"
          size={12}
          color={colors.primary}
        />
        <Text style={styles.host} numberOfLines={1}>
          {host}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.md,
    padding: space.md,
    gap: 4,
  },
  cardPressed: { backgroundColor: colors.surface },
  title: { fontWeight: "600", fontSize: font.sm, color: colors.text },
  snippet: { color: colors.textSecondary, fontSize: font.sm },
  urlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  host: { color: colors.primary, fontSize: font.xs, fontWeight: "600" },
});
