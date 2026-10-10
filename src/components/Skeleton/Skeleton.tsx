import './Skeleton.css';

/** Серая заготовка на месте содержимого, которое еще загружается: мягко мерцает (при «уменьшении движения» стоит) */
export function Skeleton({ width, height = 16, radius, className = '' }: { width?: number | string; height?: number | string; radius?: number | string; className?: string }) {
  return <span className={`skeleton ${className}`} style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}

/** Заготовка экрана: верхняя строка и три карточки. Показывается, пока подгружается код экрана */
export function ScreenSkeleton() {
  return (
    <div className="skeleton-screen" role="status" aria-label="Загрузка">
      <div className="skeleton-screen__bar">
        <Skeleton width={24} height={24} radius={12} />
        <Skeleton width={160} height={20} />
      </div>
      <div className="skeleton-screen__body">
        {[0, 1, 2].map((i) => (
          <div className="skeleton-card" key={i}>
            <Skeleton width="45%" height={18} />
            <Skeleton width="100%" height={14} />
            <Skeleton width="80%" height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}
