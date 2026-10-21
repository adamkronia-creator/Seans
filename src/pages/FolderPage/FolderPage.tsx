import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Avatar } from '../../components/Avatar/Avatar';
import { Frame } from '../../components/Frame/Frame';
import { IconClose } from '../../components/ChatParts/ChatIcons';
import { removeFolderText } from '../../components/FolderMenu/folderTexts';
import { IconBack } from '../../components/icons';
import { IconCheck, IconPlusLine } from '../../components/Profile/ProfileIcons';
import { RemoveSheet } from '../../components/Profile/ProfileSheets';
import { CHATS, type ChatCategory } from '../../data/chats';
import {
  FOLDER_NAME_MAX,
  deleteFolder,
  discardUntouchedFolder,
  getFolder,
  isFreshFolder,
  removeFromFolder,
  renameFolder,
  setFolderPaint,
  setFolderItems,
  useFolder,
  type Folder,
  type FolderScope,
} from '../../data/folders';
import { LIBRARY, TASK_LIBRARY } from '../../data/library';
import { goBack } from '../../router';
import { useSwipeBack } from '../../utils/swipeBack';
import './FolderPage.css';

/** Строка в списках экрана: что это (чат, тест или задание) и как выглядит */
interface Entry {
  id: string;
  title: string;
  note: string;
  visual: ReactNode;
}

const ROLES: Record<ChatCategory, string> = { clients: 'Клиент', colleagues: 'Коллега', seminars: 'Семинар' };

const VISUAL = 40;

/** Цвета заливки чипса (пастель и два насыщенных) и подписи на нём */
const FOLDER_COLORS = ['#8CC0F2', '#9AD58F', '#F0C27A', '#EFA08E', '#B3A8F0', '#8ED6CF', '#EE9CB8', '#2F6FDB', '#3A3A44'];
const FOLDER_INKS = ['#1C1C1E', '#FFFFFF', '#0B3D91', '#7A1F3D', '#1E5E3A'];

/** Всё, что можно положить в папку раздела, в порядке раздела («Избранное» — системный чат, в папки не кладётся) */
function entriesOf(scope: FolderScope): Entry[] {
  if (scope === 'chats') {
    return CHATS.filter((chat) => !chat.favorites).map((chat) => ({
      id: chat.id,
      title: chat.name,
      note: chat.category ? ROLES[chat.category] : '',
      visual: <Avatar src={chat.avatar} size={VISUAL} />,
    }));
  }
  return (scope === 'tests' ? LIBRARY : TASK_LIBRARY).map((item) => ({
    id: item.id,
    title: item.title,
    note: item.description,
    visual: (
      <span className="fp-icon" style={{ '--tint': item.tint } as CSSProperties}>
        <img src={item.icon} alt="" loading="lazy" decoding="async" />
      </span>
    ),
  }));
}

const TEXTS: Record<FolderScope, { selected: string; add: string; hint: string }> = {
  chats: { selected: 'Выбранные чаты', add: 'Добавить чаты', hint: 'Выберите чаты, которые нужно показывать в этой папке.' },
  tests: { selected: 'Выбранные тесты', add: 'Добавить тесты', hint: 'Выберите тесты, которые нужно показывать в этой папке.' },
  tasks: { selected: 'Выбранные задания', add: 'Добавить задания', hint: 'Выберите задания, которые нужно показывать в этой папке.' },
};

function EntryText({ entry, prefix }: { entry: Entry; prefix: string }) {
  return (
    <span className={`${prefix}__text`}>
      <span className={`${prefix}__title`}>{entry.title}</span>
      {entry.note && <span className={`${prefix}__note`}>{entry.note}</span>}
    </span>
  );
}

interface PickProps {
  scope: FolderScope;
  folder: Folder;
  entries: Entry[];
  onClose: () => void;
}

/**
 * Окно выбора, как «Добавить чаты» в Telegram: все чаты (тесты, задания) списком с галочками, уже выбранные отмечены.
 * Снять отметку тоже можно — так же, как убрать строку на самом экране. Применяется по «Готово».
 */
function PickSheet({ scope, folder, entries, onClose }: PickProps) {
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set(folder.ids));
  const text = TEXTS[scope];

  const toggle = (id: string) =>
    setChosen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const save = () => {
    setFolderItems(
      scope,
      folder.id,
      entries.map((e) => e.id).filter((id) => chosen.has(id)),
    );
    onClose();
  };

  return (
    <Frame
      title={text.add}
      subtitle={`Выбрано ${chosen.size} из ${entries.length}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="sheet__button sheet__button--primary" onClick={save}>
            Готово
          </button>
        </>
      }
    >
      <section className="sheet__card">
        <ul className="fp-pick" aria-label={text.add}>
          {entries.map((entry) => {
            const on = chosen.has(entry.id);
            return (
              <li key={entry.id}>
                <button type="button" role="checkbox" aria-checked={on} className="fp-pick__row" onClick={() => toggle(entry.id)}>
                  <span className={`fp-pick__box${on ? ' fp-pick__box--on' : ''}`} aria-hidden="true">
                    {on && <IconCheck />}
                  </span>
                  {entry.visual}
                  <EntryText entry={entry} prefix="fp-pick" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </Frame>
  );
}

interface FolderPageProps {
  scope: FolderScope;
  id: string;
}

/**
 * «Настроить папку» (как в Telegram): название со счётчиком оставшихся букв, выбранные чаты, тесты или задания с кнопкой
 * «Добавить» и «Удалить папку». Правки сохраняются сразу, как печатаешь, поэтому «Готово» просто возвращает к списку.
 * Новая папка (из меню «Все») открывается сюда же, с курсором в названии; если в ней так ничего и не тронули, при выходе она убирается.
 */
export function FolderPage({ scope, id }: FolderPageProps) {
  const stored = useFolder(scope, id);
  // Папку удалили на этом экране, а он ещё уезжает: пока идёт переход, показываем её последний вид
  const last = useRef(stored);
  if (stored) last.current = stored;
  const folder = stored ?? last.current;

  const [name, setName] = useState(folder?.name ?? '');
  const [picking, setPicking] = useState(false);
  const [asking, setAsking] = useState(false);
  const [entries] = useState(() => entriesOf(scope));
  const [created] = useState(() => isFreshFolder(id));
  const field = useRef<HTMLInputElement>(null);

  // Новая папка: сразу пишем название поверх «Новая папка»
  useLayoutEffect(() => {
    if (!created) return;
    field.current?.focus({ preventScroll: true });
    field.current?.select();
  }, [created]);

  // Вышли с экрана, ничего не тронув: созданная папка убирается. Проверка с отсрочкой, потому что в режиме разработки
  // React размонтирует экран «понарошку» и тут же возвращает его
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.setTimeout(() => {
        if (!mounted.current) discardUntouchedFolder(scope, id);
      }, 0);
    };
  }, [scope, id]);

  // Свайп вправо — назад; поля ввода жест не трогает (см. utils/swipeBack.ts)
  useSwipeBack('.fp', !picking && !asking, () => goBack('/'));

  if (!folder) return null;
  const text = TEXTS[scope];
  const inFolder = new Set(folder.ids);
  const selected = entries.filter((e) => inFolder.has(e.id));

  const rename = (value: string) => {
    setName(value);
    renameFolder(scope, id, value);
  };

  const remove = () => {
    deleteFolder(scope, id);
    goBack('/');
  };

  return (
    <section className="fp">
      <header className="fp__header">
        <button type="button" className="fp__back" aria-label="Назад" onClick={() => goBack('/')}>
          <IconBack />
        </button>
        <h1 className="fp__title">{folder.name}</h1>
        <button type="button" className="fp__done" onClick={() => goBack('/')}>
          Готово
        </button>
      </header>

      <div className="fp__scroll">
        <section className="fp__card" aria-label="Название папки">
          <label className="fp__field">
            <span className="fp__heading">Название папки</span>
            <span className="fp__input-row">
              <input
                ref={field}
                className="fp__input"
                value={name}
                maxLength={FOLDER_NAME_MAX}
                placeholder="Например, Практика"
                autoComplete="off"
                enterKeyHint="done"
                onChange={(e) => rename(e.target.value)}
                // Пустое название не сохраняется: поле возвращает последнее сохранённое
                onBlur={() => setName(getFolder(scope, id)?.name ?? name)}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
              <span className="fp__counter" aria-label={`Можно ввести ещё ${FOLDER_NAME_MAX - name.length}`}>
                {FOLDER_NAME_MAX - name.length}
              </span>
            </span>
          </label>
        </section>

        <section className="fp__card" aria-label="Цвет папки">
          <h2 className="fp__heading fp__heading--pad">Цвет чипса</h2>
          <div className="fp-swatches" role="radiogroup" aria-label="Цвет чипса">
            <button type="button" role="radio" aria-checked={!folder.color} aria-label="Обычный" className="fp-swatch fp-swatch--auto" onClick={() => setFolderPaint(scope, id, { color: undefined })} />
            {FOLDER_COLORS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={folder.color === c} aria-label={`Цвет ${c}`} className="fp-swatch" style={{ background: c }} onClick={() => setFolderPaint(scope, id, { color: c })} />
            ))}
          </div>
          <h2 className="fp__heading fp__heading--pad">Цвет текста</h2>
          <div className="fp-swatches" role="radiogroup" aria-label="Цвет текста чипса">
            <button type="button" role="radio" aria-checked={!folder.ink} aria-label="Обычный" className="fp-swatch fp-swatch--auto" onClick={() => setFolderPaint(scope, id, { ink: undefined })} />
            {FOLDER_INKS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={folder.ink === c} aria-label={`Текст ${c}`} className="fp-swatch" style={{ background: c }} onClick={() => setFolderPaint(scope, id, { ink: c })} />
            ))}
          </div>
          <span className="fp-sample" style={{ background: folder.color ?? 'var(--tone-chat)', color: folder.ink ?? 'var(--color-ink-on-pastel)' }}>
            {folder.name}
          </span>
        </section>
        <p className="fp__hint">Так выглядит выбранный чипс папки в ряду.</p>

        <section className="fp__card" aria-labelledby="fp-selected">
          <h2 id="fp-selected" className="fp__heading fp__heading--pad">
            {text.selected}
          </h2>
          <button type="button" className="fp__add" onClick={() => setPicking(true)}>
            <span className="fp__add-icon" aria-hidden="true">
              <IconPlusLine />
            </span>
            {text.add}
          </button>
          {selected.length > 0 && (
            <ul className="fp__list">
              {selected.map((entry) => (
                <li key={entry.id} className="fp__row">
                  {entry.visual}
                  <EntryText entry={entry} prefix="fp-row" />
                  <button
                    type="button"
                    className="fp__remove"
                    aria-label={`Убрать «${entry.title}» из папки`}
                    onClick={() => removeFromFolder(scope, id, entry.id)}
                  >
                    <IconClose />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
        <p className="fp__hint">{text.hint}</p>

        <button type="button" className="fp__card fp__delete" onClick={() => setAsking(true)}>
          Удалить папку
        </button>
      </div>

      {picking && <PickSheet scope={scope} folder={folder} entries={entries} onClose={() => setPicking(false)} />}
      {asking && (
        <RemoveSheet title="Удалить папку?" text={removeFolderText(scope, folder.name)} confirm="Удалить" onConfirm={remove} onClose={() => setAsking(false)} />
      )}
    </section>
  );
}
