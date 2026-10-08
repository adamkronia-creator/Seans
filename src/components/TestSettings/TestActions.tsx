import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Avatar } from '../Avatar/Avatar';
import { CHATS } from '../../data/chats';
import { IconTestChevron, IconTestPass, IconTestSend, IconTestSendMany } from '../icons';
import '../EditSheet/EditSheet.css';
import './TestActions.css';

export type TestAction = 'self' | 'one' | 'many';

export function useSheet(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
}

interface ActionSheetProps {
  onPick: (action: TestAction) => void;
  onClose: () => void;
}

/** Что сделать с тестом: пройти самому, отправить клиенту или нескольким */
export function ActionSheet({ onPick, onClose }: ActionSheetProps) {
  useSheet(onClose);
  const options = [
    { id: 'self' as const, title: 'Пройти', Icon: IconTestPass },
    { id: 'one' as const, title: 'Отправить', Icon: IconTestSend },
    { id: 'many' as const, title: 'Отправить нескольким', Icon: IconTestSendMany },
  ];
  return createPortal(
    <div className="sheet-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Пройти или отправить">
        <div className="sheet__grab" aria-hidden="true" />
        <div className="sheet__body test-actions-body">
          <ul className="test-actions test-actions--cards">
            {options.map(({ id, title, Icon }) => (
              <li key={id}>
                <button type="button" className="test-actions__card" onClick={() => onPick(id)}>
                  <Icon className="test-actions__icon" aria-hidden="true" />
                  <span className="test-actions__card-title">{title}</span>
                  <IconTestChevron className="test-actions__arrow" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="sheet__footer">
          <button type="button" className="sheet__button" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface RecipientSheetProps {
  mode: 'one' | 'many';
  onSend: (chatIds: string[]) => void;
  onClose: () => void;
}

const CLIENTS = CHATS.filter((c) => c.category === 'clients');

/** Выбор клиентов: одного (нажатие заменяет выбор) или нескольких */
export function RecipientSheet({ mode, onSend, onClose }: RecipientSheetProps) {
  useSheet(onClose);
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) =>
    setPicked((p) => (mode === 'one' ? [id] : p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return createPortal(
    <div className="sheet-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Кому отправить">
        <div className="sheet__header">
          <h2 className="sheet__heading">{mode === 'one' ? 'Кому отправить?' : 'Выберите клиентов'}</h2>
        </div>
        <div className="sheet__body">
          <ul className="test-actions" role={mode === 'one' ? 'radiogroup' : 'group'}>
            {CLIENTS.map((c) => {
              const on = picked.includes(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    role={mode === 'one' ? 'radio' : 'checkbox'}
                    aria-checked={on}
                    className={`test-actions__item test-actions__client${on ? ' test-actions__item--on' : ''}`}
                    onClick={() => toggle(c.id)}
                  >
                    <Avatar src={c.avatar} alt="" size={40} />
                    <span className="test-actions__title">{c.name}</span>
                    <span className={`test-actions__mark${on ? ' test-actions__mark--on' : ''}`} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="sheet__footer">
          <button type="button" className="sheet__button" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="sheet__button sheet__button--primary"
            disabled={picked.length === 0}
            onClick={() => onSend(picked)}
          >
            Отправить{picked.length > 1 ? ` (${picked.length})` : ''}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
