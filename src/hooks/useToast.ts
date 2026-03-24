"use client";

import { useState, useCallback, useRef } from "react";

interface Toast {
  icon: string;
  message: string;
  visible: boolean;
}

export function useToast() {
  const [toast, setToast] = useState<Toast>({ icon: "", message: "", visible: false });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((icon: string, message: string, duration = 2800) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ icon, message, visible: true });
    timerRef.current = setTimeout(() => {
      setToast((t) => ({ ...t, visible: false }));
    }, duration);
  }, []);

  return { toast, show };
}
