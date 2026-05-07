import { Alert, Platform } from "react-native";

// Alert.alert con múltiples botones no funciona de forma fiable en react-native-web
// (los callbacks destructivos no se disparan). Este helper usa window.confirm en
// web y Alert nativo en iOS/Android.
export function confirmDestructive(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = "Eliminar",
) {
  if (Platform.OS === "web") {
    const ok = window.confirm(`${title}\n\n${message}`);
    if (ok) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: "Cancelar", style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}
