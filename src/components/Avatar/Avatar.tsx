import type { CSSProperties, ReactNode } from 'react';
import './Avatar.css';

/** Подписи точки присутствия для чтения с экрана: форма точки несёт смысл, цвет только помогает */
const PRESENCE_LABEL = { online: 'в сети', session: 'на сессии', offline: 'не в сети' } as const;

interface AvatarProps {
  src?: string;
  alt?: string;
  /** Размер в пикселях; без него размер берёт стиль (--avatar-size, по умолчанию 48) — так экраны на сетке 4 задают его токеном */
  size?: number;
  online?: boolean;
  /** Присутствие собеседника: сплошная точка, точка с паузой (на сессии) или пустое кольцо */
  presence?: keyof typeof PRESENCE_LABEL;
  /** Вместо фото: иконка на цветном фоне (например, «Избранное») */
  icon?: ReactNode;
}

export function Avatar({ src, alt = '', size, online, presence, icon }: AvatarProps) {
  const style = size === undefined ? undefined : ({ '--avatar-size': `${size}px` } as CSSProperties);
  return (
    <span className="avatar" style={style}>
      {icon ? (
        <span className="avatar__icon">{icon}</span>
      ) : src ? (
        <img className="avatar__img" src={src} alt={alt} />
      ) : (
        // Фото ещё читается из хранилища: нейтральный кружок, чтобы не мелькало другое
        <span className="avatar__img avatar__img--empty" />
      )}
      {online && !presence && <span className="avatar__online" aria-label="В сети" />}
      {presence && <span className={`avatar__presence avatar__presence--${presence}`} role="img" aria-label={PRESENCE_LABEL[presence]} />}
    </span>
  );
}
