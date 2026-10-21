import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Avatar } from '../../components/Avatar/Avatar';
import { Collapse } from '../../components/EditSheet/EditSheet';
import '../../components/EditSheet/EditSheet.css';
import { Switch } from '../../components/Switch/Switch';
import { TONES } from '../../data/tones';
import { Frame } from '../../components/Frame/Frame';
import { IconClose } from '../../components/ChatParts/ChatIcons';
import { removeFolderText } from '../../components/FolderMenu/folderTexts';
import { IconBack, IconEmoji } from '../../components/icons';
import { EmojiPanel } from '../../components/MessageInput/EmojiPanel';
import { IconCheck, IconPlusLine } from '../../components/Profile/ProfileIcons';
import { RemoveSheet } from '../../components/Profile/ProfileSheets';
import { CHATS, type ChatCategory } from '../../data/chats';
import {
  FOLDER_NAME_MAX,
  nameLength,
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

/** Цвета чипса — те же 16, что у шапок заметок и сведений; для текста вместо коричневого и серого белый и чёрный */
const FOLDER_COLORS = TONES.map((t) => ({ id: t.id, label: t.label, color: t.swatch }));
const FOLDER_INKS = TONES.map((t) => (t.id === 'brown' ? { id: 'white', label: 'Белый', color: '#FFFFFF' } : t.id === 'gray' ? { id: 'black', label: 'Чёрный', color: '#1C1C1E' } : { id: t.id, label: t.label, color: t.swatch }));

type Swatch = { id: string; label: string; color: string };

/** Панель цвета, как у заметок и сведений: строка с переключателем и сетка из 16 цветов (выключено — цвет не задан) */
function ColorCard({ label, value, palette, onChange }: { label: string; value: string | undefined; palette: Swatch[]; onChange: (color: string | undefined) => void }) {
  const uid = useId();
  const last = useRef(value ?? palette[0].color);
  if (value) last.current = value;
  const on = value !== undefined;
  return (
    <section className="fp__card fp-color" aria-label={label}>
      <div className="fp-color__row">
        <span className="fp-color__label" id={`${uid}-l`}>
          {label}
        </span>
        <Switch checked={on} onChange={(next) => onChange(next ? last.current : undefined)} label={label} />
      </div>
      <Collapse open={on}>
        <div className="fp-tones" role="radiogroup" aria-labelledby={`${uid}-l`}>
          {palette.map((sw) => (
            <button
              key={sw.id}
              type="button"
              role="radio"
              aria-checked={sw.color === value}
              aria-label={sw.label}
              className={`fp-tone${sw.color === value ? ' fp-tone--active' : ''}`}
              data-light={sw.color === '#FFFFFF' || undefined}
              style={{ '--swatch': sw.color } as CSSProperties}
              onClick={() => onChange(sw.color)}
            />
          ))}
        </div>
      </Collapse>
    </section>
  );
}

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

const TEXTS: Record<FolderScope, { selected: string; add: string }> = {
  chats: { selected: 'Выбранные чаты', add: 'Добавить чаты' },
  tests: { selected: 'Выбранные тесты', add: 'Добавить тесты' },
  tasks: { selected: 'Выбранные задания', add: 'Добавить задания' },
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
  const [emojiOpen, setEmojiOpen] = useState(false);
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
    // Лишнее за пределом обрезается по знакам: эмодзи не рвётся пополам
    const cut = Array.from(value).slice(0, FOLDER_NAME_MAX).join('');
    setName(cut);
    renameFolder(scope, id, cut);
  };

  /** Эмодзи встаёт в место курсора (или в конец); если названию не хватает места, не вставляется */
  const insertEmoji = (emoji: string) => {
    const el = field.current;
    const chars = Array.from(name);
    // Положение курсора в кодовых единицах переводим в знаки
    const at = el ? Array.from(name.slice(0, el.selectionStart ?? name.length)).length : chars.length;
    const end = el ? Array.from(name.slice(0, el.selectionEnd ?? name.length)).length : chars.length;
    const next = [...chars.slice(0, at), emoji, ...chars.slice(end)];
    if (next.length > FOLDER_NAME_MAX) return;
    const value = next.join('');
    rename(value);
    const caret = [...chars.slice(0, at), emoji].join('').length;
    window.requestAnimationFrame(() => el?.setSelectionRange(caret, caret));
  };

  const remove = () => {
    deleteFolder(scope, id);
    goBack('/');
  };

  return (
    <section className="fp" data-emoji={emojiOpen ? '' : undefined}>
      <header className="fp__header">
        {/* Как шапка открытого чата: слева чипс таким, каким он будет в ряду (цвета видно сразу), правее название и подпись, справа «назад» */}
        <span
          className="fp__preview"
          style={{ ...(folder.color && { '--preview-bg': folder.color }), ...(folder.ink && { '--preview-ink': folder.ink }) } as CSSProperties}
          aria-hidden="true"
        >
          <span className="fp__preview-text">{folder.name}</span>
        </span>
        <div className="fp__who">
          <h1 className="fp__title">Настройка папки</h1>
        </div>
        <button type="button" className="fp__back" aria-label="Назад" onClick={() => goBack('/')}>
          <IconBack />
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
                placeholder="Например, Практика"
                autoComplete="off"
                enterKeyHint="done"
                onFocus={() => setEmojiOpen(false)}
                onChange={(e) => rename(e.target.value)}
                // Пустое название не сохраняется: поле возвращает последнее сохранённое
                onBlur={() => setName(getFolder(scope, id)?.name ?? name)}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              />
              <span className="fp__counter" aria-label={`Можно ввести ещё ${FOLDER_NAME_MAX - nameLength(name)}`}>
                {FOLDER_NAME_MAX - nameLength(name)}
              </span>
              <button
                type="button"
                className="fp__emoji"
                aria-label="Эмодзи"
                aria-expanded={emojiOpen}
                // Нажатие не уводит фокус с поля: иначе при потере фокуса название сбрасывалось бы
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  setEmojiOpen((v) => !v);
                  // Панель вместо клавиатуры: поле остаётся с курсором, но экранную клавиатуру не поднимает
                  if (!emojiOpen) field.current?.blur();
                }}
              >
                <IconEmoji />
              </button>
            </span>
          </label>
        </section>

        <ColorCard label="Цвет чипса" value={folder.color} palette={FOLDER_COLORS} onChange={(color) => setFolderPaint(scope, id, { color })} />
        <ColorCard label="Цвет текста" value={folder.ink} palette={FOLDER_INKS} onChange={(ink) => setFolderPaint(scope, id, { ink })} />

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

        <button type="button" className="fp__card fp__delete" onClick={() => setAsking(true)}>
          Удалить папку
        </button>
      </div>

      <div className="fp__footer">
        <button type="button" className="fp__done" onClick={() => goBack('/')}>
          Готово
        </button>
      </div>

      {emojiOpen && (
        <div className="fp__emoji-panel">
          <EmojiPanel onPick={insertEmoji} />
        </div>
      )}
      {picking && <PickSheet scope={scope} folder={folder} entries={entries} onClose={() => setPicking(false)} />}
      {asking && (
        <RemoveSheet title="Удалить папку?" text={removeFolderText(scope, folder.name)} confirm="Удалить" onConfirm={remove} onClose={() => setAsking(false)} />
      )}
    </section>
  );
}
