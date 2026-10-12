import type { ReactNode } from 'react';
import './Avatar.css';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: number;
  online?: boolean;
  /** Вместо фото: иконка на цветном фоне (например, «Избранное») */
  icon?: ReactNode;
}

export function Avatar({ src, alt = '', size = 48, online, icon }: AvatarProps) {
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
      {online && <span className="avatar__online" aria-label="В сети" />}
    </span>
  );
}
