import { useId, useState } from 'react';
import { LineInput } from '../LineInput/LineInput';
import { Frame } from '../Frame/Frame';
import { AutoTextarea } from '../EditSheet/AutoTextarea';
import { roleOf, rolesOf, ROLE_MAX } from '../../data/roles';
import { useChats } from '../../data/chatStore';
import type { Chat } from '../../data/chats';
import './ContactSheets.css';

/* Нижние окна профиля собеседника: изменить контакт, роль, подарок, жалоба. Каркас и поля — общие для окон (Frame) */

const footer = (onClose: () => void, ok: { label: string; run: () => void; disabled?: boolean; danger?: boolean }) => (
  <>
    <button type="button" className="sheet__button" onClick={onClose}>
      Отмена
    </button>
    <button
      type="button"
      className={`sheet__button ${ok.danger ? 'sheet__button--danger' : 'sheet__button--primary'}`}
      disabled={ok.disabled}
      onClick={ok.run}
    >
      {ok.label}
    </button>
  </>
);

/** Изменить контакт: имя и телефон */
export function EditContactSheet({ chat, onSave, onClose }: { chat: Chat; onSave: (v: { name: string; phone: string }) => void; onClose: () => void }) {
  const uid = useId();
  const [name, setName] = useState(chat.name);
  const [phone, setPhone] = useState(chat.phone ?? '');
  return (
    <Frame title="Изменить контакт" onClose={onClose} footer={footer(onClose, { label: 'Сохранить', disabled: !name.trim(), run: () => onSave({ name, phone }) })}>
      <section className="sheet__card frame-card">
        <label className="frame-label" htmlFor={`${uid}-name`}>
          Имя
        </label>
        <LineInput id={`${uid}-name`} className="frame-textarea" value={name} maxLength={40} autoComplete="nope" name="contact-name" onChange={(e) => setName(e.target.value)} placeholder="Имя и фамилия" />
      </section>
      <section className="sheet__card frame-card">
        <label className="frame-label" htmlFor={`${uid}-phone`}>
          Телефон
        </label>
        <LineInput id={`${uid}-phone`} className="frame-textarea" type="tel" inputMode="tel" autoComplete="nope" name="contact-phone" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (900) 000-00-00" />
      </section>
    </Frame>
  );
}

/** Роль: выбрать чипсом или написать свою; роль показывается под именем в открытом чате */
export function RoleSheet({ chat, onSave, onClose }: { chat: Chat; onSave: (role: string) => void; onClose: () => void }) {
  const uid = useId();
  const roles = rolesOf(useChats());
  // Сейчас выбрана та роль, что показана под именем (по папке чата — тоже)
  const [value, setValue] = useState(chat.role ?? (chat.category ? roleOf(chat) : ''));
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
  return (
    <Frame
      title="Роль"
      subtitle="Показывается под именем в открытом чате"
      onClose={onClose}
      footer={footer(onClose, { label: 'Сохранить', run: () => onSave(value) })}
    >
      <section className="sheet__card frame-card">
        <span className="frame-label">Выберите роль</span>
        <div className="ct-chips" role="group" aria-label="Роли">
          {roles.map((role) => (
            <button key={role} type="button" className="ct-chip" aria-pressed={same(role, value)} onClick={() => setValue(same(role, value) ? '' : role)}>
              {role}
            </button>
          ))}
        </div>
      </section>
      <section className="sheet__card frame-card">
        <label className="frame-label" htmlFor={`${uid}-role`}>
          Или напишите свою
        </label>
        <LineInput
          id={`${uid}-role`}
          className="frame-textarea"
          value={value}
          maxLength={ROLE_MAX}
          autoComplete="nope"
          name="contact-role"
          onChange={(e) => setValue(e.target.value)}
          placeholder="Например, студент"
        />
        <span className="ct-hint">Пусто — роль по папке чата</span>
      </section>
    </Frame>
  );
}

const GIFTS = [
  { emoji: '🌿', name: 'Растение' },
  { emoji: '📖', name: 'Книга' },
  { emoji: '🍵', name: 'Чай' },
  { emoji: '🕯️', name: 'Свеча' },
  { emoji: '🧸', name: 'Игрушка' },
  { emoji: '💐', name: 'Цветы' },
];

/** Подарок: выбирается значок, в чат уходит сообщение с ним */
export function GiftSheet({ onSend, onClose }: { onSend: (text: string) => void; onClose: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const gift = picked === null ? null : GIFTS[picked];
  return (
    <Frame
      title="Отправить подарок"
      onClose={onClose}
      footer={footer(onClose, { label: 'Отправить', disabled: !gift, run: () => gift && onSend(`🎁 Подарок: ${gift.emoji} ${gift.name}`) })}
    >
      <section className="sheet__card frame-card">
        <div className="ct-gifts" role="group" aria-label="Подарки">
          {GIFTS.map((g, i) => (
            <button key={g.name} type="button" className="ct-gift" aria-pressed={picked === i} onClick={() => setPicked(i)}>
              <span className="ct-gift__emoji" aria-hidden="true">
                {g.emoji}
              </span>
              {g.name}
            </button>
          ))}
        </div>
      </section>
    </Frame>
  );
}

const REASONS = ['Спам', 'Оскорбления', 'Мошенничество', 'Нарушение границ', 'Другое'];

/** Жалоба: причина чипсами и необязательный комментарий */
export function ReportSheet({ name, onSend, onClose }: { name: string; onSend: () => void; onClose: () => void }) {
  const uid = useId();
  const [reason, setReason] = useState<string | null>(null);
  const [text, setText] = useState('');
  return (
    <Frame
      title="Пожаловаться"
      subtitle={name}
      onClose={onClose}
      footer={footer(onClose, { label: 'Отправить', danger: true, disabled: !reason, run: onSend })}
    >
      <section className="sheet__card frame-card">
        <span className="frame-label">Причина</span>
        <div className="ct-chips" role="group" aria-label="Причина жалобы">
          {REASONS.map((r) => (
            <button key={r} type="button" className="ct-chip" aria-pressed={reason === r} onClick={() => setReason(r)}>
              {r}
            </button>
          ))}
        </div>
      </section>
      <section className="sheet__card frame-card">
        <label className="frame-label" htmlFor={`${uid}-text`}>
          Комментарий
        </label>
        <AutoTextarea id={`${uid}-text`} className="frame-textarea" rows={2} value={text} onChange={setText} placeholder="Что произошло (необязательно)" maxLength={500} />
      </section>
    </Frame>
  );
}
