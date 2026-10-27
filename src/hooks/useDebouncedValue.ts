import { useEffect, useState } from 'react';

/**
 * Devuelve `value` solo cuando dejó de cambiar durante `delayMs`.
 * Cada tecla reinicia el timer (el cleanup cancela el anterior), así que
 * mientras el usuario escribe NO se dispara ninguna request.
 */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
