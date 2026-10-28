import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Avatar } from '../Avatar/Avatar';
import { CHATS } from '../../data/chats';
import { useAvatarSrc } from '../../data/profile';
import { roleOf } from '../../data/roles';
import { copyText } from '../../utils/clipboard';
import { navigate } from '../../router';
import { CopyIcon } from '../CopyIcon/CopyIcon';
import { IconShareLine } from '../GroupUi/GroupIcons';
import { Frame } from '../Frame/Frame';
import { SearchField } from '../SearchField/SearchField';
import { SELF_ID } from './TestActions';
import './SendSheet.css';

const IconPass = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" />
  </svg>
);

const CLIENTS = CHATS.filter((c) => c.category === 'clients');
/** Сколько заполняется обводка кнопки: пока она идёт, отправку можно отменить */
export const SEND_MS = 3000;

type State = 'idle' | 'sending' | 'sent';

interface SendSheetProps {
  /** Что отправляем: «тест» или «задание» (для подписей) */
  noun: string;
  /** Ссылка на тест или задание: её копируют и отправляют через системное «Поделиться» */
  url: string;
  /** Название — для системного «Поделиться» */
  title: string;
  /** Чат, из которого открыты настройки: его строка идёт первой */
  chatId?: string;
  /** Обводка заполнилась: отправить получателю */
  onDeliver: (chatId: string) => void;
  /** Скопировать ссылку */
  onCopy: (url: string) => void;
  /** Пройти самому: окно закрывается, открывается прохождение */
  onPass?: () => void;
  onClose: () => void;
}

/**
 * «Отправить»: получатели в виде строк «выбранных чатов» (фото, имя, роль), справа кнопка «Отправить». Нажатие запускает обводку кнопки,
 * надпись меняется на «Отменить»; когда обводка заполнилась, отправка идёт, под именем «Отправлено», а кнопка становится «Открыть чат».
 * Закрытое окно отменяет то, что ещё не отправлено. Внизу «Скопировать» (ссылка) и «Поделиться через…».
 */
export function SendSheet({ noun, url, title, chatId, onDeliver, onCopy, onPass, onClose }: SendSheetProps) {
  const myAvatar = useAvatarSrc();
  const rows = [
    { id: SELF_ID, name: 'Себе', note: 'Избранное', avatar: myAvatar },
    ...CLIENTS.map((c) => ({ id: c.id, name: c.name, note: roleOf(c), avatar: c.avatar })),
  ];
  if (chatId) rows.sort((a, b) => Number(b.id === chatId) - Number(a.id === chatId));
  const [query, setQuery] = useState('');
  const [state, setState] = useState<Record<string, State>>({});
  const timers = useRef<Record<string, number>>({});
  const deliver = useRef(onDeliver);
  deliver.current = onDeliver;
  useEffect(() => () => Object.values(timers.current).forEach((t) => window.clearTimeout(t)), []);

  const set = (id: string, next: State) => setState((s) => ({ ...s, [id]: next }));
  const start = (id: string) => {
    set(id, 'sending');
    timers.current[id] = window.setTimeout(() => {
      delete timers.current[id];
      deliver.current(id);
      set(id, 'sent');
    }, SEND_MS);
  };
  const cancel = (id: string) => {
    window.clearTimeout(timers.current[id]);
    delete timers.current[id];
    set(id, 'idle');
  };
  const share = () => {
    if (typeof navigator.share === 'function') void navigator.share({ title, url }).catch(() => undefined);
    else void copyText(url).then(() => onCopy(url));
  };

  const action = (id: string): ReactNode => {
    const s = state[id] ?? 'idle';
    if (s === 'sent') {
      return (
        <button type="button" className="send-row__button send-row__button--open" onClick={() => navigate(`/chat/${id}`)}>
          Открыть чат
        </button>
      );
    }
    if (s === 'sending') {
      return (
        <button type="button" className="send-row__button send-row__button--sending" onClick={() => cancel(id)}>
          <svg className="send-row__ring" aria-hidden="true">
            <rect pathLength="1" style={{ animationDuration: `${SEND_MS}ms` }} />
          </svg>
          Отменить
        </button>
      );
    }
    return (
      <button type="button" className="send-row__button" onClick={() => start(id)}>
        Отправить
      </button>
    );
  };

  const q = query.trim().toLowerCase();
  const shown = q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;

  return (
    <Frame title="Отправить" onClose={onClose}>
      <SearchField value={query} onChange={setQuery} placeholder="Поиск контактов" onClear={() => setQuery('')} />
      <div className="sheet__card">
      <ul className="send-list" aria-label={`Кому отправить ${noun}`}>
        {shown.map((r) => {
          const sent = state[r.id] === 'sent';
          return (
            <li key={r.id} className="send-row">
              <Avatar src={r.avatar} alt="" size={48} />
              <span className="send-row__text">
                <span className="send-row__name">{r.name}</span>
                <span className={`send-row__note${sent ? ' send-row__note--sent' : ''}`}>{sent ? 'Отправлено' : r.note}</span>
              </span>
              {action(r.id)}
            </li>
          );
        })}
      </ul>
      {shown.length === 0 && <p className="send-empty">Никого не нашли</p>}
      </div>
      <div className="send-tools">
        <button type="button" className="send-tools__item" onClick={() => onCopy(url)}>
          <span className="send-tools__disc">
            <CopyIcon />
          </span>
          Скопировать
        </button>
        {onPass && (
          <button type="button" className="send-tools__item" onClick={onPass}>
            <span className="send-tools__disc send-tools__disc--accent">
              <IconPass />
            </span>
            Пройти
          </button>
        )}
        <button type="button" className="send-tools__item" onClick={share}>
          <span className="send-tools__disc">
            <IconShareLine />
          </span>
          Поделиться через…
        </button>
      </div>
    </Frame>
  );
}

/** «Предпросмотр»: то, что увидит клиент, с вкладками «Начало / В процессе / Конец» */
export function PreviewSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Frame title="Предпросмотр" subtitle={title} onClose={onClose}>
      {children}
    </Frame>
  );
}
