import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import { deleteNote, getNote, updateNote } from "../../lib/notes";
import { useDebouncedSave } from "../../lib/useDebouncedSave";
import { confirmDestructive } from "../../lib/confirm";
import { AiPanel } from "../../components/AiPanel";
import { OrganizedView } from "../../components/OrganizedView";
import { colors, font, radius, space } from "../../lib/theme";

type Tab = "original" | "organized";

export default function NoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const noteQuery = useQuery({
    queryKey: ["note", id],
    queryFn: () => getNote(id!),
    enabled: !!id,
  });

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tab, setTab] = useState<Tab>("original");
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  useEffect(() => {
    if (noteQuery.data) {
      setTitle(noteQuery.data.title);
      setContent(noteQuery.data.content);
    }
  }, [noteQuery.data]);

  const save = useCallback(
    async (next: { title: string; content: string }) => {
      if (!id) return;
      try {
        setSavingState("saving");
        await updateNote(id, next);
        setSavingState("saved");
        qc.invalidateQueries({ queryKey: ["notes"] });
      } catch {
        setSavingState("idle");
      }
    },
    [id, qc],
  );

  useDebouncedSave(
    { title, content },
    save,
    700,
    !noteQuery.isLoading && !!noteQuery.data,
  );

  const deleteMut = useMutation({
    mutationFn: () => deleteNote(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      router.replace("/");
    },
    onError: (err: Error) => Alert.alert("No se pudo eliminar", err.message),
  });

  const handleDelete = () => {
    confirmDestructive(
      "Eliminar nota",
      `¿Seguro que quieres eliminar "${title || "Nueva nota"}"? Esta acción no se puede deshacer.`,
      () => deleteMut.mutate(),
    );
  };

  if (noteQuery.isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!noteQuery.data) {
    return (
      <View style={styles.center}>
        <Ionicons
          name="document-outline"
          size={32}
          color={colors.textMuted}
        />
        <Text style={styles.notFound}>Nota no encontrada.</Text>
        <Pressable onPress={() => router.replace("/")} style={styles.backLink}>
          <Text style={{ color: colors.primary, fontWeight: "600" }}>
            ← Volver a notas
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <Stack.Screen options={{ headerTitle: title || "Nueva nota" }} />

      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.replace("/")}
          style={styles.iconButton}
          hitSlop={10}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={colors.primary}
          />
          <Text style={styles.backText}>Notas</Text>
        </Pressable>

        <View style={styles.statusContainer}>
          {savingState === "saving" ? (
            <>
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text style={styles.status}>Guardando…</Text>
            </>
          ) : savingState === "saved" ? (
            <>
              <Ionicons
                name="checkmark-circle"
                size={14}
                color={colors.success}
              />
              <Text style={styles.status}>Guardado</Text>
            </>
          ) : null}
        </View>

        <Pressable
          onPress={handleDelete}
          style={styles.iconButton}
          hitSlop={10}
          disabled={deleteMut.isPending}
        >
          {deleteMut.isPending ? (
            <ActivityIndicator color={colors.danger} size="small" />
          ) : (
            <>
              <Ionicons
                name="trash-outline"
                size={18}
                color={colors.danger}
              />
              <Text style={styles.deleteText}>Eliminar</Text>
            </>
          )}
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <TextInput
            style={styles.titleInput}
            placeholder="Título de la nota"
            placeholderTextColor={colors.textMuted}
            value={title}
            onChangeText={setTitle}
            multiline
          />

          <View style={styles.tabs}>
            <TabButton
              label="Original"
              icon="create-outline"
              active={tab === "original"}
              onPress={() => setTab("original")}
            />
            <TabButton
              label="Organizada"
              icon="layers-outline"
              active={tab === "organized"}
              onPress={() => setTab("organized")}
            />
          </View>

          {tab === "original" ? (
            <TextInput
              style={styles.contentInput}
              placeholder="Empieza a escribir tus apuntes…"
              placeholderTextColor={colors.textMuted}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />
          ) : (
            <OrganizedView
              noteId={noteQuery.data.id}
              noteContent={content}
              organizedContent={noteQuery.data.organized_content}
              organizedAt={noteQuery.data.organized_at}
            />
          )}

          <AiPanel noteId={noteQuery.data.id} noteContent={content} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function TabButton({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: "create-outline" | "layers-outline";
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tabButton, active && styles.tabButtonActive]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={active ? colors.primary : colors.textSecondary}
      />
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  iconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
  },
  backText: { color: colors.primary, fontWeight: "600", fontSize: font.base },
  deleteText: { color: colors.danger, fontWeight: "600", fontSize: font.sm },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  status: { color: colors.textMuted, fontSize: font.xs },
  scroll: { padding: space.lg, paddingBottom: 60 },
  titleInput: {
    fontSize: font.xxl,
    fontWeight: "700",
    color: colors.text,
    paddingVertical: space.sm,
    marginBottom: space.sm,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    padding: 4,
    borderRadius: radius.md,
    marginBottom: space.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
    paddingVertical: space.sm,
    borderRadius: radius.sm,
  },
  tabButtonActive: { backgroundColor: colors.surfaceElevated },
  tabText: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: font.sm,
  },
  tabTextActive: { color: colors.primary },
  contentInput: {
    fontSize: font.md,
    color: colors.text,
    minHeight: 240,
    paddingVertical: space.sm,
    lineHeight: 23,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: space.lg,
    gap: space.md,
    backgroundColor: colors.background,
  },
  notFound: { color: colors.textSecondary },
  backLink: { marginTop: space.sm },
});
