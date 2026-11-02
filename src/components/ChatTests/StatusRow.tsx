import type { CSSProperties } from 'react';
import { usePick, type PickProps } from '../ChatCase/ChatCase';
import type { PsyTest } from '../../data/tests';
import '../TestCard/TestCard.css';
import '../TestSettings/TestSettings.css';

/** Значок состояния на углу аватарки вместо сердечка «в избранном»: часы — отправлено, ждёт ответа; петля — постоянное задание; галочка — выполнено */
const BADGE: Record<'sent' | 'permanent' | 'done', { label: string; icon: JSX.Element }> = {
  sent: {
    label: 'Отправлено, ждёт ответа',
    icon: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </>
    ),
  },
  permanent: {
    label: 'Постоянное задание',
    icon: (
      <>
        <path d="M17 3.5l3 3-3 3" />
        <path d="M4 11.5v-1a4 4 0 0 1 4-4h12" />
        <path d="M7 20.5l-3-3 3-3" />
        <path d="M20 12.5v1a4 4 0 0 1-4 4H4" />
      </>
    ),
  },
  done: {
    label: 'Выполнено',
    icon: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  },
};

interface StatusRowProps extends PickProps {
  item: PsyTest;
  /** Строка сведений под описанием: «Отправлено 09.10.2026, ждёт 24 дня», «Записей: 2, назначено 05.10.2026», «Выполнено 27.09.2026» */
  facts: string;
  /** Описание под названием, если нужно не то, что в самом элементе (у задания — из библиотеки) */
  description?: string;
  /** Подпись значка, если она точнее общей («Пройден» вместо «Выполнено») */
  badgeLabel?: string;
  /** Нажатие: открыть тест, задание или результат */
  onOpen: (item: PsyTest) => void;
}

/**
 * Строка теста или задания во вкладках чата — как в меню «Диагностика» и «Задания»: значок в круге 48, название, описание и сведения.
 * Вместо сердечка «в избранном» на углу значка метка состояния (`BADGE`). Долгое нажатие начинает выбор, как у остальных карточек вкладки.
 */
export function StatusRow({ item, facts, description, badgeLabel, onOpen, selecting, selected, onPick }: StatusRowProps) {
  const pick = usePick(item.id, { selecting, onPick }, true);
  // Назначенное (assigned) — постоянное задание
  const kind = item.status === 'assigned' ? 'permanent' : item.status;
  const badge = BADGE[kind];
  return (
    <li className={`status-row status-row--${kind}`} data-selecting={selecting || undefined} data-selected={selected || undefined} {...pick}>
      <button type="button" className="test-card" onClick={() => onOpen(item)}>
        <span className="test-card__avatar" style={{ '--tint': item.tint } as CSSProperties}>
          <img className="test-card__icon" src={item.icon} alt="" loading="lazy" decoding="async" />
        </span>
        <span className="test-card__body">
          <span className="test-card__title">{item.title}</span>
          <span className="test-card__description">{description ?? item.description}</span>
          <span className="status-row__facts">{facts}</span>
        </span>
        {selecting && <span className="pick-mark" aria-hidden="true" />}
      </button>
      <span className="status-row__badge" role="img" aria-label={badgeLabel ?? badge.label}>
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          {badge.icon}
        </svg>
      </span>
    </li>
  );
}
