import { useEffect, useState } from 'react';

/** Текущее время, которое обновляется само: приём «начался», «прошёл», предложение «устарело» без перезагрузки */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
