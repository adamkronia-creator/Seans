import type { CSSProperties, ReactNode } from 'react';
import './Avatar.css';

/** Подписи точки присутствия для чтения с экрана: форма точки несёт смысл, цвет только помогает */
const PRESENCE_LABEL = { online: 'в сети', session: 'на сессии', offline: 'не в сети' } as const;

/** Буквы имени для контакта без фото: «Анна Лебедева» → «АЛ» */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = (words.length > 1 ? [words[0], words[1]] : words.slice(0, 1)).map((word) => Array.from(word)[0] ?? '');
  return letters.join('').toLocaleUpperCase('ru-RU');
}

interface AvatarProps {
  src?: string;
  alt?: string;
  /** Имя владельца: у контакта без фото на круге стоят его буквы. Без имени и без фото — нейтральный кружок (фото ещё читается) */
  name?: string;
  /** Размер в пикселях; без него размер берёт стиль (--avatar-size, по умолчанию 48) — так экраны на сетке 4 задают его токеном */
  size?: number;
  online?: boolean;
  /** Присутствие собеседника: сплошная точка, точка с паузой (на сессии) или пустое кольцо */
  presence?: keyof typeof PRESENCE_LABEL;
  /** Вместо фото: иконка на цветном фоне (например, «Избранное») */
  icon?: ReactNode;
}

export function Avatar({ src, alt = '', name, size, online, presence, icon }: AvatarProps) {
  const style = size === undefined ? undefined : ({ '--avatar-size': `${size}px` } as CSSProperties);
  return (
    <span className="avatar" style={style}>
      {icon ? (
        <span className="avatar__icon">{icon}</span>
      ) : src ? (
        <img className="avatar__img" src={src} alt={alt} />
      ) : name && initialsOf(name) ? (
        <span className="avatar__icon avatar__initials" aria-hidden="true">
          {initialsOf(name)}
        </span>
      ) : (
        // Фото ещё читается из хранилища: нейтральный кружок, чтобы не мелькало другое
        <span className="avatar__img avatar__img--empty" />
      )}
      {online && !presence && <span className="avatar__online" aria-label="В сети" />}
      {presence && <span className={`avatar__presence avatar__presence--${presence}`} role="img" aria-label={PRESENCE_LABEL[presence]} />}
    </span>
  );
}
