import { useCallback, useEffect, useRef, useState } from "react";

export default function useToasts() {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const dismiss = useCallback((id) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);
  const notify = useCallback((message, tone = "info") => {
    if (!message) return;
    const id = Date.now() + Math.random();
    setToasts((previous) => [...previous.slice(-3), { id, message, tone }]);
    timers.current.set(id, setTimeout(() => dismiss(id), 4500));
  }, [dismiss]);
  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  }, []);
  return { toasts, notify, dismiss };
}
