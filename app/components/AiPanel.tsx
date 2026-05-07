import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";

import {
  clearAiMessages,
  deleteAiMessage,
  listAiMessages,
  researchNote,
  type AiMessageRow,
  type Citation,
} from "../lib/ai";
import { confirmDestructive } from "../lib/confirm";
import { colors, font, radius, shadow, space } from "../lib/theme";
import { CitationCard } from "./CitationCard";

type Props = {
  noteId: string;
  noteContent: string;
};

export function AiPanel({ noteId, noteContent }: Props) {
  const [question, setQuestion] = useState("");
  const qc = useQueryClient();

  const messagesQuery = useQuery({
    queryKey: ["ai_messages", noteId],
    queryFn: () => listAiMessages(noteId),
  });

  const messages = messagesQuery.data ?? [];

  const researchMut = useMutation({
    mutationFn: (q: string) => researchNote(noteId, noteContent, q),
    onSuccess: () => {
      setQuestion("");
      messagesQuery.refetch();
    },
    onError: (err: Error) => Alert.alert("Error del agente", err.message),
  });

  const deleteOneMut = useMutation({
    mutationFn: (id: string) => deleteAiMessage(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["ai_messages", noteId] }),
    onError: (err: Error) => Alert.alert("Error al borrar", err.message),
  });

  const clearAllMut = useMutation({
    mutationFn: () => clearAiMessages(noteId),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["ai_messages", noteId] }),
    onError: (err: Error) => Alert.alert("Error al borrar", err.message),
  });

  const handleResearch = () => {
    const q = question.trim();
    if (!q) return;
    researchMut.mutate(q);
  };

  const handleClearAll = () => {
    confirmDestructive(
      "Borrar historial",
      "¿Eliminar todas las preguntas y respuestas de la IA en esta nota?",
      () => clearAllMut.mutate(),
      "Borrar todo",
    );
  };

  const handleDeleteOne = (id: string) => {
    confirmDestructive(
      "Borrar mensaje",
      "¿Eliminar este mensaje del historial?",
      () => deleteOneMut.mutate(id),
      "Borrar",
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.headingWrap}>
          <View style={styles.headingIcon}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
          </View>
          <Text style={styles.heading}>Asistente IA</Text>
        </View>
        {messages.length > 0 ? (
          <Pressable
            onPress={handleClearAll}
            disabled={clearAllMut.isPending}
            hitSlop={6}
            style={styles.clearAllButton}
          >
            {clearAllMut.isPending ? (
              <ActivityIndicator size="small" color={colors.danger} />
            ) : (
              <>
                <Ionicons
                  name="trash-outline"
                  size={14}
                  color={colors.danger}
                />
                <Text style={styles.clearAllText}>Borrar historial</Text>
              </>
            )}
          </Pressable>
        ) : null}
      </View>
      <Text style={styles.subheading}>
        Pídele al agente que investigue sobre tu nota. Buscará en la web y
        citará fuentes.
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="¿Qué quieres saber sobre esta nota?"
          placeholderTextColor={colors.textMuted}
          value={question}
          onChangeText={setQuestion}
          multiline
          editable={!researchMut.isPending}
        />
        <Pressable
          style={[
            styles.button,
            (researchMut.isPending || !question.trim()) &&
              styles.buttonDisabled,
          ]}
          onPress={handleResearch}
          disabled={researchMut.isPending || !question.trim()}
        >
          {researchMut.isPending ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <>
              <Ionicons
                name="search"
                size={16}
                color={colors.textOnPrimary}
              />
              <Text style={styles.buttonText}>Investigar</Text>
            </>
          )}
        </Pressable>
      </View>

      {researchMut.isPending ? (
        <Text style={styles.hint}>
          Buscando en la web… esto puede tardar unos segundos.
        </Text>
      ) : null}

      <View style={styles.history}>
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            onDelete={() => handleDeleteOne(m.id)}
            isDeleting={
              deleteOneMut.isPending && deleteOneMut.variables === m.id
            }
          />
        ))}
      </View>
    </View>
  );
}

function MessageBubble({
  message,
  onDelete,
  isDeleting,
}: {
  message: AiMessageRow;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <View
      style={[
        styles.bubbleWrapper,
        isUser ? styles.userBubbleWrapper : null,
      ]}
    >
      <View
        style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}
      >
        {isUser ? (
          <Text style={styles.userText}>{message.content}</Text>
        ) : (
          <>
            <Markdown style={markdownStyles}>{message.content}</Markdown>
            {message.citations && message.citations.length > 0 ? (
              <View style={styles.citations}>
                <View style={styles.citationsHeader}>
                  <Ionicons
                    name="link-outline"
                    size={14}
                    color={colors.primary}
                  />
                  <Text style={styles.citationsHeading}>Fuentes</Text>
                </View>
                {message.citations.map((c: Citation, i: number) => (
                  <CitationCard key={`${c.url}-${i}`} citation={c} />
                ))}
              </View>
            ) : null}
          </>
        )}
      </View>
      <Pressable
        onPress={onDelete}
        disabled={isDeleting}
        hitSlop={8}
        style={styles.deleteIcon}
      >
        {isDeleting ? (
          <ActivityIndicator size="small" color={colors.textMuted} />
        ) : (
          <Ionicons name="close" size={14} color={colors.textMuted} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: space.xl,
    paddingTop: space.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: space.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headingWrap: { flexDirection: "row", alignItems: "center", gap: space.sm },
  headingIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: { fontSize: font.lg, fontWeight: "700", color: colors.text },
  clearAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  clearAllText: {
    color: colors.danger,
    fontWeight: "600",
    fontSize: font.xs,
  },
  subheading: {
    color: colors.textSecondary,
    fontSize: font.sm,
    marginBottom: space.sm,
  },
  inputRow: { gap: space.sm },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    minHeight: 60,
    fontSize: font.base,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: space.md,
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
    marginTop: space.xs,
    fontSize: font.sm,
  },
  history: { marginTop: space.lg, gap: space.md },
  bubbleWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.xs,
  },
  userBubbleWrapper: { justifyContent: "flex-end" },
  bubble: { padding: space.md, borderRadius: radius.lg, flexShrink: 1 },
  userBubble: { backgroundColor: colors.primarySoft, maxWidth: "85%" },
  userText: { color: colors.primaryDark, fontSize: font.base },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
  },
  deleteIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  citations: { marginTop: space.md, gap: space.sm },
  citationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: space.xs,
  },
  citationsHeading: {
    fontWeight: "700",
    fontSize: font.sm,
    color: colors.text,
  },
});

const markdownStyles = {
  body: { color: colors.text, fontSize: font.base, lineHeight: 22 },
  heading1: { fontSize: font.xl, fontWeight: "700" as const, marginTop: 8 },
  heading2: { fontSize: font.lg, fontWeight: "700" as const, marginTop: 6 },
  heading3: { fontSize: font.md, fontWeight: "700" as const },
  link: { color: colors.primary },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  code_inline: {
    backgroundColor: colors.surface,
    paddingHorizontal: 4,
    borderRadius: 4,
    fontFamily: "Menlo",
  },
  fence: {
    backgroundColor: "#0f172a",
    color: "#e2e8f0",
    padding: 12,
    borderRadius: 8,
    fontFamily: "Menlo",
  },
};
