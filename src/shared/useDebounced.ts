import { useEffect, useState } from "react";

// Evita uma requisição por tecla nas buscas que vão à API.
export const useDebounced = <T>(value: T, delay = 350) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};
