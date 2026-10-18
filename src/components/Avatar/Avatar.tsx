import type { ReactNode } from 'react';
import './Avatar.css';

const PRESENCE_LABEL = { online: 'в сети', session: 'на сессии', offline: 'не в сети' } as const;

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: number;
  online?: boolean;
  /** Присутствие собеседника: форма точки (сплошная, с паузой, пустое кольцо) и подпись для чтения с экрана */
  presence?: 'online' | 'session' | 'offline';
  /** Вместо фото: иконка на цветном фоне (например, «Избранное») */
  icon?: ReactNode;
}

export function Avatar({ src, alt = '', size = 48, online, presence, icon }: AvatarProps) {
  return (
    <span className="avatar" style={{ width: size, height: size }}>
      {icon ? (
        <span className="avatar__icon" style={{ fontSize: size * 0.48 }}>
          {icon}
        </span>
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
