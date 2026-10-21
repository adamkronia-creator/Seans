import { useState } from 'react';
import { Avatar } from '../Avatar/Avatar';
import { useChats } from '../../data/chatStore';
import { useAvatarSrc } from '../../data/profile';
import { can, capState, type CapId } from '../../data/roles';
import { useAllLinks } from '../../data/roleStore';
import { IconTestPass, IconTestSend, IconTestSendMany } from '../icons';
import { SheetOverlay } from '../EditSheet/SheetOverlay';
import { useSheet } from '../EditSheet/useSheet';
import '../EditSheet/EditSheet.css';
import './TestActions.css';

export type TestAction = 'self' | 'one' | 'many';

interface ActionSheetProps {
  onPick: (action: TestAction) => void;
  onClose: () => void;
  /** Какие действия показать (по умолчанию все): у задания нельзя «пройти» */
  actions?: TestAction[];
}

/** Что сделать с тестом: пройти самому, отправить клиенту или нескольким */
export function ActionSheet({ onPick, onClose, actions }: ActionSheetProps) {
  useSheet(onClose);
  const options = [
    { id: 'self' as const, title: 'Пройти', Icon: IconTestPass },
    { id: 'one' as const, title: 'Отправить', Icon: IconTestSend },
    { id: 'many' as const, title: 'Отправить нескольким', Icon: IconTestSendMany },
  ].filter((o) => !actions || actions.includes(o.id));
  return (
    <SheetOverlay onClose={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Пройти или отправить">
        <div className="sheet__grab" aria-hidden="true" />
        <div className="sheet__body">
          <ul className="test-actions test-actions--cards">
            {options.map(({ id, title, Icon }) => (
              <li key={id}>
                <button type="button" className="test-actions__card" onClick={() => onPick(id)}>
                  <Icon className="test-actions__icon" aria-hidden="true" />
                  <span className="test-actions__card-title">{title}</span>
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
    </SheetOverlay>
  );
}

interface RecipientSheetProps {
  /** Что отправляем: от этого зависит, у кого включена нужная функция (тесты или задания) */
  kind: 'test' | 'task';
  mode: 'one' | 'many';
  onSend: (chatIds: string[]) => void;
  onClose: () => void;
}

/** Получатели: сначала вы сами (тест придет в «Избранное»), затем те, с кем в роли включены тесты или задания */
export const SELF_ID = 'favorites';

interface Recipient {
  id: string;
  name: string;
  avatar?: string;
  /** Приглашение ещё без ответа: в списке виден, выбрать нельзя; здесь сказано, чьего ответа ждём */
  waiting?: string;
}

/** Выбор получателей (вы сами и те, кому это можно отправить): одного (нажатие заменяет выбор) или нескольких */
export function RecipientSheet({ kind, mode, onSend, onClose }: RecipientSheetProps) {
  useSheet(onClose);
  // «Себе» с вашим фото профиля
  const myAvatar = useAvatarSrc();
  const chats = useChats();
  const links = useAllLinks();
  const cap: CapId = kind === 'test' ? 'tests' : 'tasks';
  // Отправить можно туда, где функция работает; где ждёт согласия — строка видна, но недоступна, чтобы было понятно, почему человека нет
  const people = chats.flatMap<Recipient>((c) => {
    const roles = links[c.id];
    if (c.favorites || c.blocked || !roles) return [];
    if (can(roles, cap)) return [{ id: c.id, name: c.name, avatar: c.avatar }];
    if (capState(roles, cap) !== 'locked') return [];
    // Входящее приглашение ждёт ответа от вас, исходящее — от собеседника
    const mine = roles.some((l) => l.status === 'pending' && l.dir === 'in' && l.caps.includes(cap));
    return [{ id: c.id, name: c.name, avatar: c.avatar, waiting: mine ? 'Нужен ваш ответ на приглашение' : 'Ждёт согласия на приглашение' }];
  });
  const recipients: Recipient[] = [{ id: SELF_ID, name: 'Себе', avatar: myAvatar }, ...people];
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (id: string) =>
    setPicked((p) => (mode === 'one' ? [id] : p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return (
    <SheetOverlay onClose={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Кому отправить">
        <div className="sheet__header">
          <h2 className="sheet__heading">{mode === 'one' ? 'Кому отправить?' : 'Выберите получателей'}</h2>
        </div>
        <div className="sheet__body">
          <ul className="test-actions" role={mode === 'one' ? 'radiogroup' : 'group'}>
            {recipients.map((c) => {
              const on = picked.includes(c.id);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    role={mode === 'one' ? 'radio' : 'checkbox'}
                    aria-checked={on}
                    disabled={!!c.waiting}
                    className={`test-actions__item test-actions__client${on ? ' test-actions__item--on' : ''}${c.waiting ? ' test-actions__item--waiting' : ''}`}
                    onClick={() => toggle(c.id)}
                  >
                    <Avatar src={c.avatar} name={c.id === SELF_ID ? undefined : c.name} alt="" size={40} />
                    <span className="test-actions__title">
                      {c.name}
                      {c.waiting && <span className="test-actions__wait">{c.waiting}</span>}
                    </span>
                    {!c.waiting && <span className={`test-actions__mark${on ? ' test-actions__mark--on' : ''}`} aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
          {people.length === 0 && (
            <p className="test-actions__hint">
              Пока больше некому: {kind === 'test' ? 'тесты' : 'задания'} включаются в роли собеседника. Откройте его профиль, выберите роль «Клиент» и дождитесь согласия.
            </p>
          )}
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
    </SheetOverlay>
  );
}
