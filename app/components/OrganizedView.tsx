import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { organizeNote } from "../lib/notes";
import { colors, font, radius, shadow, space } from "../lib/theme";

type Props = {
  noteId: string;
  noteContent: string;
  organizedContent: string | null;
  organizedAt: string | null;
};

export function OrganizedView({
  noteId,
  noteContent,
  organizedContent,
  organizedAt,
}: Props) {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => organizeNote(noteId, noteContent),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["note", noteId] });
      qc.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (err: Error) => Alert.alert("Error al organizar", err.message),
  });

  const hasContent = !!organizedContent?.trim();
  const hasOriginal = !!noteContent.trim();

  const handle = () => {
    if (!hasOriginal) {
      Alert.alert(
        "Nota vacía",
        "Escribe algo en la pestaña Original antes de organizar.",
      );
      return;
    }
    mutation.mutate();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          {organizedAt ? (
            <View style={styles.metaRow}>
              <Ionicons
                name="time-outline"
                size={12}
                color={colors.textMuted}
              />
              <Text style={styles.meta}>
                {new Date(organizedAt).toLocaleString("es", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          ) : (
            <Text style={styles.meta}>Aún no se ha generado.</Text>
          )}
        </View>
        <Pressable
          style={[styles.button, mutation.isPending && styles.buttonDisabled]}
          onPress={handle}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <>
              <Ionicons
                name={hasContent ? "refresh" : "sparkles"}
                size={14}
                color={colors.textOnPrimary}
              />
              <Text style={styles.buttonText}>
                {hasContent ? "Regenerar" : "Generar"}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {mutation.isPending ? (
        <Text style={styles.hint}>
          Reorganizando tus apuntes en jerarquía…
        </Text>
      ) : null}

      {hasContent ? (
        <View style={styles.contentCard}>
          <Markdown style={markdownStyles}>{organizedContent!}</Markdown>
        </View>
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="layers" size={24} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Vista organizada</Text>
          <Text style={styles.emptyText}>
            La IA reestructura tus apuntes en jerarquía (encabezados + bullets)
            para facilitar el estudio. No agrega información nueva — solo
            reordena lo que escribiste.
          </Text>
          <Text style={styles.emptyText}>
            {hasOriginal
              ? 'Pulsa "Generar" para crear la primera versión.'
              : "Escribe primero algo en la pestaña Original."}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: space.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { color: colors.textMuted, fontSize: font.xs },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    minWidth: 110,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: space.xs,
    ...shadow.card,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: {
    color: colors.textOnPrimary,
    fontWeight: "600",
    fontSize: font.sm,
  },
  hint: { color: colors.textMuted, fontStyle: "italic", fontSize: font.sm },
  contentCard: {
    padding: space.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  empty: {
    padding: space.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: space.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.sm,
  },
  emptyTitle: { fontSize: font.md, fontWeight: "700", color: colors.text },
  emptyText: {
    color: colors.textSecondary,
    lineHeight: 20,
    textAlign: "center",
    fontSize: font.sm,
  },
});

const markdownStyles = {
  body: { color: colors.text, fontSize: font.base, lineHeight: 22 },
  heading1: { fontSize: font.xl, fontWeight: "700" as const, marginTop: 12 },
  heading2: { fontSize: font.lg, fontWeight: "700" as const, marginTop: 10 },
  heading3: { fontSize: font.md, fontWeight: "600" as const, marginTop: 8 },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
};
