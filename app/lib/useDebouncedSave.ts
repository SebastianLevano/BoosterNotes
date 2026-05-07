import { useEffect, useRef } from "react";

// Llama a `save(value)` después de `delay` ms sin cambios. Cancela en unmount
// y limpia timers cuando `value` cambia.
export function useDebouncedSave<T>(
  value: T,
  save: (v: T) => void | Promise<void>,
  delay = 600,
  enabled = true,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    // No guardar en el primer render (cargamos la nota desde el server)
    if (first.current) {
      first.current = false;
      return;
    }

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void save(value);
    }, delay);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, delay, enabled, save]);
}
