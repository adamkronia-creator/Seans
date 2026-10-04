import './Badge.css';

/** Синий кружок со счётчиком непрочитанных */
export function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="badge" aria-label={`Непрочитанных: ${count}`}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
