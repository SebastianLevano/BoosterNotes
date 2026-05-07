import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { createNote, deleteNote, listNotes, type Note } from "../../lib/notes";
import { confirmDestructive } from "../../lib/confirm";
import { colors, font, radius, shadow, space } from "../../lib/theme";

export default function NotesListScreen() {
  const router = useRouter();
  const qc = useQueryClient();

  const notesQuery = useQuery({
    queryKey: ["notes"],
    queryFn: listNotes,
  });

  const createMut = useMutation({
    mutationFn: createNote,
    onSuccess: (note) => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      router.push(`/note/${note.id}`);
    },
    onError: (err: Error) => Alert.alert("Error al crear nota", err.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteNote,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
    onError: (err: Error) => Alert.alert("Error al borrar", err.message),
  });

  const confirmDelete = (note: Note) => {
    confirmDestructive(
      "Borrar nota",
      `¿Eliminar "${note.title || "Nueva nota"}"? Esta acción no se puede deshacer.`,
      () => deleteMut.mutate(note.id),
      "Borrar",
    );
  };

  const notes = notesQuery.data ?? [];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mis notas</Text>
          <Text style={styles.subtitle}>
            {notes.length} {notes.length === 1 ? "apunte" : "apuntes"}
          </Text>
        </View>
      </View>

      {notesQuery.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : notesQuery.isError ? (
        <View style={styles.center}>
          <Ionicons
            name="alert-circle-outline"
            size={32}
            color={colors.danger}
          />
          <Text style={styles.errorText}>
            {(notesQuery.error as Error).message}
          </Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={notesQuery.isRefetching}
              onRefresh={() => notesQuery.refetch()}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={32}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>Aún no tienes notas</Text>
              <Text style={styles.emptyText}>
                Toca el botón + para crear tu primer apunte.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Pressable
                style={({ pressed }) => [
                  styles.rowMain,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => router.push(`/note/${item.id}`)}
              >
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.title || "Nueva nota"}
                </Text>
                <Text style={styles.rowSnippet} numberOfLines={2}>
                  {item.content?.trim() || "Sin contenido"}
                </Text>
                <View style={styles.rowMeta}>
                  <Ionicons
                    name="time-outline"
                    size={12}
                    color={colors.textMuted}
                  />
                  <Text style={styles.rowDate}>
                    {new Date(item.updated_at).toLocaleDateString("es", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  {item.organized_content ? (
                    <View style={styles.badge}>
                      <Ionicons
                        name="sparkles"
                        size={10}
                        color={colors.primary}
                      />
                      <Text style={styles.badgeText}>Organizada</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
              <Pressable
                style={styles.rowDelete}
                onPress={() => confirmDelete(item)}
                hitSlop={8}
                disabled={
                  deleteMut.isPending && deleteMut.variables === item.id
                }
              >
                {deleteMut.isPending && deleteMut.variables === item.id ? (
                  <ActivityIndicator size="small" color={colors.danger} />
                ) : (
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={colors.danger}
                  />
                )}
              </Pressable>
            </View>
          )}
        />
      )}

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
          createMut.isPending && styles.fabDisabled,
        ]}
        onPress={() => createMut.mutate()}
        disabled={createMut.isPending}
      >
        {createMut.isPending ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <Ionicons name="add" size={28} color={colors.textOnPrimary} />
        )}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  title: { fontSize: font.xxl, fontWeight: "700", color: colors.text },
  subtitle: {
    fontSize: font.sm,
    color: colors.textMuted,
    marginTop: 2,
  },
  list: { padding: space.lg, gap: space.md, paddingBottom: 120 },
  row: {
    flexDirection: "row",
    alignItems: "stretch",
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceElevated,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  rowMain: { flex: 1, padding: space.md + 2, gap: space.xs },
  rowPressed: { backgroundColor: colors.surface },
  rowTitle: { fontSize: font.md, fontWeight: "600", color: colors.text },
  rowSnippet: {
    color: colors.textSecondary,
    fontSize: font.sm,
    lineHeight: 19,
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    marginTop: space.xs,
  },
  rowDate: { fontSize: font.xs, color: colors.textMuted },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginLeft: space.xs,
  },
  badgeText: { fontSize: 10, fontWeight: "700", color: colors.primary },
  rowDelete: {
    paddingHorizontal: space.lg,
    justifyContent: "center",
    alignItems: "center",
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    backgroundColor: colors.dangerSoft,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: space.md,
  },
  empty: { padding: space.xxl, alignItems: "center", marginTop: space.xxl },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
  },
  emptyTitle: {
    fontSize: font.lg,
    fontWeight: "700",
    color: colors.text,
    marginBottom: space.xs,
  },
  emptyText: { color: colors.textSecondary, textAlign: "center" },
  errorText: { color: colors.danger, textAlign: "center" },
  fab: {
    position: "absolute",
    right: space.lg,
    bottom: space.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.elevated,
  },
  fabPressed: { backgroundColor: colors.primaryDark, transform: [{ scale: 0.96 }] },
  fabDisabled: { opacity: 0.7 },
});
