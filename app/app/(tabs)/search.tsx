import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Markdown from "react-native-markdown-display";
import { useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { searchNotes, type SearchMatch } from "../../lib/search";
import { colors, font, radius, shadow, space } from "../../lib/theme";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const mutation = useMutation({
    mutationFn: (q: string) => searchNotes(q),
    onError: (err: Error) => Alert.alert("Error en la búsqueda", err.message),
  });

  const handleSearch = () => {
    const q = query.trim();
    if (!q) return;
    mutation.mutate(q);
  };

  const result = mutation.data;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Buscar en mis notas</Text>
        <Text style={styles.subtitle}>
          Filtra entre todos tus apuntes y la IA consolida solo lo que tú has
          escrito.
        </Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons
          name="search"
          size={18}
          color={colors.textMuted}
          style={{ marginRight: space.sm }}
        />
        <TextInput
          style={styles.input}
          placeholder="ej: fotosíntesis, derivadas..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          editable={!mutation.isPending}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <Ionicons
              name="close-circle"
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>

      <Pressable
        style={[
          styles.button,
          (mutation.isPending || !query.trim()) && styles.buttonDisabled,
        ]}
        onPress={handleSearch}
        disabled={mutation.isPending || !query.trim()}
      >
        {mutation.isPending ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <>
            <Ionicons name="sparkles" size={16} color={colors.textOnPrimary} />
            <Text style={styles.buttonText}>Buscar y consolidar</Text>
          </>
        )}
      </Pressable>

      {mutation.isPending ? (
        <Text style={styles.hint}>
          Buscando entre tus notas y consolidando…
        </Text>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {result ? (
          <>
            {result.matches.length > 0 ? (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons
                    name="bulb-outline"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.sectionTitle}>Síntesis</Text>
                </View>
                <View style={styles.synthesisCard}>
                  <Markdown style={markdownStyles}>{result.synthesis}</Markdown>
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="documents-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.sectionTitle}>
                  Notas encontradas ({result.matches.length})
                </Text>
              </View>
              {result.matches.length === 0 ? (
                <View style={styles.empty}>
                  <Ionicons
                    name="search-outline"
                    size={28}
                    color={colors.textMuted}
                  />
                  <Text style={styles.emptyText}>
                    {result.synthesis ||
                      "No hay notas que coincidan con ese tema."}
                  </Text>
                </View>
              ) : (
                result.matches.map((m) => (
                  <MatchCard
                    key={m.id}
                    match={m}
                    onPress={() => router.push(`/note/${m.id}`)}
                  />
                ))
              )}
            </View>
          </>
        ) : (
          <View style={styles.placeholder}>
            <View style={styles.placeholderIcon}>
              <Ionicons
                name="search"
                size={28}
                color={colors.primary}
              />
            </View>
            <Text style={styles.placeholderTitle}>
              Tu archivo personal de estudio
            </Text>
            <Text style={styles.placeholderText}>
              Escribe un tema arriba y la IA reúne todo lo que has anotado al
              respecto. Sin información de internet — solo tus apuntes.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MatchCard({
  match,
  onPress,
}: {
  match: SearchMatch;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.match, pressed && styles.matchPressed]}
      onPress={onPress}
    >
      <View style={styles.matchHeader}>
        <Ionicons
          name="document-text-outline"
          size={16}
          color={colors.primary}
        />
        <Text style={styles.matchTitle} numberOfLines={1}>
          {match.title || "Nueva nota"}
        </Text>
      </View>
      <SnippetText snippet={match.snippet} />
      <Text style={styles.matchDate}>
        {new Date(match.updated_at).toLocaleString("es", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </Text>
    </Pressable>
  );
}

// Renderiza el snippet con highlights <<...>> resaltados.
function SnippetText({ snippet }: { snippet: string }) {
  const parts = snippet.split(/(<<[^>]+>>)/g).filter(Boolean);
  return (
    <Text style={styles.snippet}>
      {parts.map((p, i) => {
        if (p.startsWith("<<") && p.endsWith(">>")) {
          return (
            <Text key={i} style={styles.snippetHighlight}>
              {p.slice(2, -2)}
            </Text>
          );
        }
        return <Text key={i}>{p}</Text>;
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: space.lg, paddingVertical: space.md },
  title: { fontSize: font.xxl, fontWeight: "700", color: colors.text },
  subtitle: {
    color: colors.textSecondary,
    fontSize: font.sm,
    marginTop: 2,
    lineHeight: 18,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: space.lg,
    paddingHorizontal: space.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    paddingVertical: space.md,
    fontSize: font.base,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    marginHorizontal: space.lg,
    marginTop: space.md,
    paddingVertical: space.md + 2,
    borderRadius: radius.md,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: space.sm,
    ...shadow.card,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: colors.textOnPrimary,
    fontWeight: "600",
    fontSize: font.base,
  },
  hint: {
    color: colors.textMuted,
    fontStyle: "italic",
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    fontSize: font.sm,
  },
  scroll: { padding: space.lg, paddingBottom: 60, gap: space.lg },
  section: { gap: space.sm, marginBottom: space.lg },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  sectionTitle: { fontSize: font.md, fontWeight: "700", color: colors.text },
  synthesisCard: {
    backgroundColor: colors.surface,
    padding: space.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  match: {
    padding: space.md + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: space.sm,
    gap: space.xs,
    ...shadow.card,
  },
  matchPressed: { backgroundColor: colors.surface },
  matchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
  },
  matchTitle: {
    fontWeight: "700",
    fontSize: font.base,
    color: colors.text,
    flex: 1,
  },
  snippet: { color: colors.textSecondary, fontSize: font.sm, lineHeight: 20 },
  snippetHighlight: {
    backgroundColor: colors.highlight,
    color: colors.text,
    fontWeight: "700",
  },
  matchDate: {
    color: colors.textMuted,
    fontSize: font.xs,
    marginTop: space.xs,
  },
  empty: {
    padding: space.xl,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: space.sm,
  },
  emptyText: {
    color: colors.textSecondary,
    fontStyle: "italic",
    textAlign: "center",
  },
  placeholder: {
    padding: space.xl,
    alignItems: "center",
    marginTop: space.xl,
  },
  placeholderIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
  },
  placeholderTitle: {
    fontSize: font.lg,
    fontWeight: "700",
    color: colors.text,
    marginBottom: space.xs,
    textAlign: "center",
  },
  placeholderText: {
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 320,
  },
});

const markdownStyles = {
  body: { color: colors.text, fontSize: font.base, lineHeight: 22 },
  heading1: { fontSize: font.xl, fontWeight: "700" as const, marginTop: 8 },
  heading2: { fontSize: font.lg, fontWeight: "700" as const, marginTop: 6 },
  heading3: { fontSize: font.md, fontWeight: "700" as const },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
};
