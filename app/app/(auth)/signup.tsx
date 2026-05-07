import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { supabase } from "../../lib/supabase";
import { colors, font, radius, shadow, space } from "../../lib/theme";

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Faltan campos", "Ingresa email y contraseña.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Contraseña corta", "Usa al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert("No se pudo crear la cuenta", error.message);
    } else {
      Alert.alert(
        "Listo",
        "Cuenta creada. Si la confirmación por email está activa, revisa tu bandeja.",
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Ionicons name="person-add" size={26} color={colors.primary} />
        </View>
        <Text style={styles.title}>Crear cuenta</Text>
        <Text style={styles.subtitle}>Empieza a tomar apuntes inteligentes</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="tu@email.com"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
        />

        <Text style={[styles.label, { marginTop: space.lg }]}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="Mínimo 6 caracteres"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          editable={!loading}
        />

        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <>
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={colors.textOnPrimary}
              />
              <Text style={styles.buttonText}>Registrarme</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>¿Ya tienes cuenta? </Text>
        <Link href="/login" style={styles.footerLink}>
          Iniciar sesión
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: space.xl,
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  brand: { alignItems: "center", marginBottom: space.xxl },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.md,
  },
  title: { fontSize: font.xxl, fontWeight: "700", color: colors.text },
  subtitle: {
    fontSize: font.sm,
    color: colors.textSecondary,
    marginTop: space.xs,
  },
  form: { gap: space.xs },
  label: {
    fontSize: font.sm,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: space.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md + 2,
    fontSize: font.base,
    color: colors.text,
    backgroundColor: colors.surfaceElevated,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: space.md + 2,
    borderRadius: radius.md,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: space.sm,
    marginTop: space.xl,
    ...shadow.card,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: {
    color: colors.textOnPrimary,
    fontSize: font.base,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: space.xl,
  },
  footerText: { color: colors.textSecondary },
  footerLink: { color: colors.primary, fontWeight: "600" },
});
