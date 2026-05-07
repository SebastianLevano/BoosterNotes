import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../../lib/supabase";
import { colors, font, radius, shadow, space } from "../../lib/theme";

export default function SettingsScreen() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (error) Alert.alert("Error", error.message);
  };

  const initial = email?.[0]?.toUpperCase() ?? "?";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Ajustes</Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Sesión iniciada como</Text>
          <Text style={styles.email}>{email ?? "—"}</Text>
        </View>
      </View>

      <View style={styles.about}>
        <View style={styles.aboutRow}>
          <Ionicons
            name="sparkles-outline"
            size={18}
            color={colors.primary}
          />
          <Text style={styles.aboutText}>
            Tus apuntes se sincronizan en la nube. La IA usa OpenAI vía un
            backend seguro — tu API key nunca queda en el dispositivo.
          </Text>
        </View>
      </View>

      <Pressable
        style={[styles.logoutButton, loading && styles.buttonDisabled]}
        onPress={handleLogout}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.textOnPrimary} />
        ) : (
          <>
            <Ionicons
              name="log-out-outline"
              size={18}
              color={colors.textOnPrimary}
            />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </>
        )}
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: space.lg, paddingVertical: space.md },
  title: { fontSize: font.xxl, fontWeight: "700", color: colors.text },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    marginHorizontal: space.lg,
    marginTop: space.sm,
    padding: space.lg,
    backgroundColor: colors.surfaceElevated,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.textOnPrimary,
    fontSize: font.xl,
    fontWeight: "700",
  },
  label: { color: colors.textMuted, fontSize: font.xs },
  email: {
    fontSize: font.md,
    fontWeight: "600",
    color: colors.text,
    marginTop: 2,
  },
  about: {
    marginHorizontal: space.lg,
    marginTop: space.lg,
    padding: space.lg,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
  },
  aboutRow: { flexDirection: "row", gap: space.sm, alignItems: "flex-start" },
  aboutText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: font.sm,
    lineHeight: 19,
  },
  logoutButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: space.sm,
    backgroundColor: colors.danger,
    marginHorizontal: space.lg,
    marginTop: space.xl,
    padding: space.md + 2,
    borderRadius: radius.md,
  },
  buttonDisabled: { opacity: 0.6 },
  logoutText: {
    color: colors.textOnPrimary,
    fontWeight: "600",
    fontSize: font.base,
  },
});
