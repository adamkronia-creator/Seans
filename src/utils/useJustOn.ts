import { useEffect, useRef, useState } from 'react';

/**
 * true на время анимации, если признак включили уже после показа элемента (отметили избранным, закрепили).
 * Элемент, который показан сразу с включённым признаком, не «выскакивает»: движение только у перемены, которую человек видит.
 */
export function useJustOn(value: boolean, ms = 480): boolean {
  const before = useRef(value);
  const [fresh, setFresh] = useState(false);
  useEffect(() => {
    const turnedOn = value && !before.current;
    before.current = value;
    if (!turnedOn) {
      setFresh(false);
      return;
    }
    setFresh(true);
    const timer = window.setTimeout(() => setFresh(false), ms);
    return () => window.clearTimeout(timer);
  }, [value, ms]);
  return fresh;
}
