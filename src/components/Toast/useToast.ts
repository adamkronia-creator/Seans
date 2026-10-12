import { useCallback, useEffect, useRef, useState } from 'react';

/** Подсказка внизу экрана на 2,6 секунды: показать(текст); повторный вызов меняет текст и начинает отсчёт заново */
export function useToast(): [string | null, (text: string) => void] {
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<number>();
  const show = useCallback((text: string) => {
    setToast(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(null), 2600);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return [toast, show];
}
