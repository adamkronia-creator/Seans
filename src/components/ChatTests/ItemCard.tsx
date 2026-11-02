import type { CSSProperties, ReactNode } from 'react';
import '../TestCard/TestCard.css';
import '../TestSettings/TestSettings.css';
import { usePick, type PickProps } from '../ChatCase/ChatCase';
import type { PsyTest } from '../../data/tests';

/** Один показатель в полосе под названием: значение крупнее, подпись мельче */
export interface Fact {
  value: string;
  label: string;
}

/** Полоса показателей: до трёх равных колонок, подписи под значениями */
export function Facts({ items }: { items: Fact[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="facts">
      {items.map(({ value, label }) => (
        <li key={label} className="facts__item">
          <span className="facts__value">{value}</span>
          <span className="facts__label">{label}</span>
        </li>
      ))}
    </ul>
  );
}

export interface ItemCardProps extends PickProps {
  item: PsyTest;
  /** Подпись под названием: описание, «Выполнено …», «Пройден …» */
  caption: string;
  /** Дата справа от названия (у отправленных и постоянных) */
  date?: string;
  /** Плитка под карточкой: действие, которое нужно здесь чаще всего */
  action?: { label: string; primary?: boolean; onClick: () => void };
  /** Нажатие на шапку: открыть тест, задание или результат */
  onOpen: (item: PsyTest) => void;
  /** Содержимое под шапкой: итог результата, текст ответа, показатели */
  children?: ReactNode;
}

/**
 * Карточка теста или задания во вкладках чата: стеклянная панель (шапка как у строки списка, под ней содержимое)
 * и через просвет 4 плитка действия во всю ширину, как «Читать далее» в описании теста. Долгое нажатие начинает выбор.
 */
export function ItemCard({ item, caption, date, action, onOpen, children, selecting, selected, onPick }: ItemCardProps) {
  const pick = usePick(item.id, { selecting, onPick }, true);
  return (
    <li className="item-card" data-selecting={selecting || undefined} data-selected={selected || undefined} {...pick}>
      <div className={`item-card__panel chat-tests__list${children ? '' : ' item-card__panel--bare'}`}>
        <button type="button" className="test-card" onClick={() => onOpen(item)}>
          <span className="test-card__avatar" style={{ '--tint': item.tint } as CSSProperties}>
            <img className="test-card__icon" src={item.icon} alt="" loading="lazy" decoding="async" />
          </span>
          <span className="test-card__body">
            <span className="test-card__top">
              <span className="test-card__title">{item.title}</span>
              {date && <span className="test-card__date">{date}</span>}
            </span>
            <span className="test-card__description">{caption}</span>
          </span>
          {selecting && <span className="pick-mark" aria-hidden="true" />}
        </button>
        {/* Нажатие на содержимое открывает то же, что шапка; в режиме выбора его перехватывает карточка целиком (usePick) */}
        {children && (
          <div className="item-card__body" onClick={() => onOpen(item)}>
            {children}
          </div>
        )}
      </div>
      {action && (
        <button type="button" className={`ts-desc__toggle item-card__action${action.primary ? ' item-card__action--primary' : ''}`} onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </li>
  );
}
