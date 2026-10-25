import type { CSSProperties } from 'react';
import { useEmblems } from '../../data/groupStore';
import type { Emblem, Group } from '../../data/groups';
import { toneOf } from '../../data/tones';
import { openGroup } from '../GroupSheets/groupSheets';
import './Emblem.css';

export type EmblemSize = 'xs' | 'sm' | 'md' | 'row' | 'lg' | 'xl';

interface TileProps {
  emblem: Emblem;
  size?: EmblemSize;
  /** Подпись для чтения с экрана; без неё плитка считается украшением рядом с названием */
  label?: string;
  /** Вы в этой группе: в углу плитки галочка (с размера md) */
  mark?: boolean;
}

/** Значок группы: эмодзи на плитке цвета группы. Пара «эмодзи и цвет» уникальна, поэтому значки не путаются */
export function EmblemTile({ emblem, size = 'md', label, mark = false }: TileProps) {
  return (
    <span className={`emblem emblem--${size}`} style={{ '--tone': toneOf(emblem.tone).swatch } as CSSProperties} {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}>
      <span className="emblem__glyph">{emblem.emoji}</span>
      {mark && (
        <span className="emblem__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
      )}
    </span>
  );
}

/** Значок с названием группы: нажатие открывает группу (кто в ней, канал, вступление) */
export function EmblemChip({ group }: { group: Group }) {
  return (
    <button type="button" className="emblem-chip" onClick={() => openGroup(group.id)}>
      <EmblemTile emblem={group.emblem} size="sm" />
      <span className="emblem-chip__name">{group.name}</span>
    </button>
  );
}

/** Ряд значков человека, как их видите вы. Пусто — ничего не рисуется */
export function EmblemChips({ personId, className }: { personId: string; className?: string }) {
  const emblems = useEmblems(personId);
  if (emblems.length === 0) return null;
  return (
    <div className={`emblem-chips${className ? ` ${className}` : ''}`} role="group" aria-label="Группы">
      {emblems.map(({ group }) => (
        <EmblemChip key={group.id} group={group} />
      ))}
    </div>
  );
}

/**
 * Значки рядом с именем (список чатов, шапка чата). Только показ: строка, где они стоят, сама кнопка, а кнопка в кнопке недопустима.
 * Остальные — числом «+N»; нажать и посмотреть их можно в карточке человека.
 */
export function EmblemMarks({ personId, max = 3 }: { personId: string; max?: number }) {
  const emblems = useEmblems(personId);
  if (emblems.length === 0) return null;
  const shown = emblems.slice(0, max);
  const rest = emblems.length - shown.length;
  return (
    <span className="emblem-marks" role="img" aria-label={`Группы: ${emblems.map((e) => e.group.name).join(', ')}`}>
      {shown.map(({ group }) => (
        <EmblemTile key={group.id} emblem={group.emblem} size="xs" />
      ))}
      {rest > 0 && (
        <span className="emblem-marks__more" aria-hidden="true">
          +{rest}
        </span>
      )}
    </span>
  );
}
