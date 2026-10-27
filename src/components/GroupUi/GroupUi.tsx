import { useRef, useState, type ChangeEvent, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { CATEGORIES } from '../../data/chats';
import { ME, avatarOf, byName, contactOf, firstNameOf, nameOf, type Contact } from '../../data/contacts';
import { useAvatarSrc, useProfile } from '../../data/profile';
import { initialsAvatar } from '../../utils/initialsAvatar';
import { squareAvatar } from '../../utils/imageResize';
import { plainText } from '../../utils/plainText';
import { useSwipeBack } from '../../utils/swipeBack';
import { Avatar } from '../Avatar/Avatar';
import { IconBackMk } from '../ChatItem/ChatIcons';
import { AutoTextarea } from '../EditSheet/AutoTextarea';
import { Frame } from '../Frame/Frame';
import { IconCheck } from '../Profile/ProfileIcons';
import { SearchField } from '../SearchField/SearchField';
import '../Switch/Switch.css';
import { Toast } from '../Toast/Toast';
import { IconCameraAdd, IconChevron, IconCloseLine } from './GroupIcons';
import '../../pages/FolderPage/FolderPage.css';
import './GroupUi.css';

/*
 * Общие части экранов групп и каналов: каркас страницы (шапка, прокрутка, кнопка внизу), карточки со строками, строки людей,
 * выбор контактов, поля ввода, выбор фото и нижние окна действий. Всё построено на каркасе .fp и его токенах (layout.css),
 * новых размеров не вводится: экраны групп выглядят так же, как «Настройка папки» и профиль контакта.
 */

// ---------------------------------------------------------------- страница

interface SubPageProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  /** Кнопка справа в шапке (значок) */
  action?: ReactNode;
  /** Основная кнопка внизу: «Далее», «Создать», «Сохранить» */
  footer?: { label: string; onClick: () => void; disabled?: boolean } | null;
  /** Свайп вправо как «назад»; выключают, пока открыто окно */
  swipe?: boolean;
  toast?: string | null;
  className?: string;
  children: ReactNode;
}

/** Каркас вложенного экрана: «назад» и название в стеклянной шапке, прокручиваемые карточки, кнопка внизу */
export function SubPage({ title, subtitle, onBack, action, footer, swipe = true, toast, className, children }: SubPageProps) {
  useSwipeBack('.fp', swipe, onBack);
  return (
    <section className={`fp gu-page${footer ? '' : ' gu-page--bare'}${className ? ` ${className}` : ''}`}>
      <header className="fp__header">
        <button type="button" className="fp__back" aria-label="Назад" onClick={onBack}>
          <IconBackMk />
        </button>
        <div className="fp__who">
          <h1 className="fp__title">{title}</h1>
          {subtitle && <p className="fp__subtitle">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className="fp__scroll">{children}</div>
      {footer && (
        <div className="fp__footer">
          <button type="button" className="fp__done gu-done" disabled={footer.disabled} onClick={footer.onClick}>
            {footer.label}
          </button>
        </div>
      )}
      {toast && <Toast text={toast} />}
    </section>
  );
}

/** Круглая стеклянная кнопка справа в шапке */
export function HeaderButton({ label, onClick, children, expanded }: { label: string; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; children: ReactNode; expanded?: boolean }) {
  return (
    <button type="button" className="fp__back" aria-label={label} aria-haspopup={expanded === undefined ? undefined : 'menu'} aria-expanded={expanded} onClick={onClick}>
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- карточки и строки

interface CardProps {
  heading?: ReactNode;
  /** Пояснение под карточкой */
  hint?: ReactNode;
  label?: string;
  children: ReactNode;
}

/** Блок страницы: стеклянная карточка с заголовком строкой и пояснением под ней. Строки лежат прямо в карточке: между ними просвет 1 px */
export function Card({ heading, hint, label, children }: CardProps) {
  return (
    <div className="gu-block">
      <section className="fp__card" aria-label={label ?? (typeof heading === 'string' ? heading : undefined)}>
        {heading && <h2 className="fp__heading fp__heading--pad">{heading}</h2>}
        {children}
      </section>
      {hint && <p className="gu-hint">{hint}</p>}
    </div>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="gu-hint gu-hint--alone">{children}</p>;
}

interface RowProps {
  /** Значок 24 слева */
  icon?: ReactNode;
  /** Свой элемент слева вместо значка (аватар, отметка) */
  lead?: ReactNode;
  title: ReactNode;
  note?: ReactNode;
  /** Значение справа («Публичный», «Выкл.») */
  value?: ReactNode;
  /** Свой элемент справа */
  end?: ReactNode;
  chevron?: boolean;
  tone?: 'danger' | 'link';
  onClick?: () => void;
  disabled?: boolean;
  /** Строка высотой 64 (под аватар и две строки текста) */
  tall?: boolean;
  /** Аватар и значок у верхнего края, а не посередине: для строк, где текст бывает в несколько строк */
  top?: boolean;
  role?: 'checkbox' | 'radio';
  checked?: boolean;
  ariaLabel?: string;
}

/** Строка карточки: значок или аватар, название, пояснение, значение и стрелка справа. С onClick это кнопка */
export function Row({ icon, lead, title, note, value, end, chevron, tone, onClick, disabled, tall, top, role, checked, ariaLabel }: RowProps) {
  const cls = `gu-row${tone ? ` gu-row--${tone}` : ''}${tall || lead ? ' gu-row--tall' : ''}${top ? ' gu-row--top' : ''}`;
  const body = (
    <>
      {lead ?? (icon && <span className="gu-row__icon" aria-hidden="true">{icon}</span>)}
      <span className="gu-row__text">
        <span className="gu-row__title">{title}</span>
        {note && <span className="gu-row__note">{note}</span>}
      </span>
      {value && <span className="gu-row__value">{value}</span>}
      {end}
      {chevron && (
        <span className="gu-row__chevron" aria-hidden="true">
          <IconChevron />
        </span>
      )}
    </>
  );
  return onClick ? (
    <button type="button" className={cls} role={role} aria-checked={role ? Boolean(checked) : undefined} aria-label={ariaLabel} disabled={disabled} onClick={onClick}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

interface SwitchRowProps {
  icon?: ReactNode;
  title: ReactNode;
  note?: ReactNode;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/** Строка с переключателем: нажатие на любую её часть меняет значение */
export function SwitchRow({ icon, title, note, checked, onChange, disabled }: SwitchRowProps) {
  return (
    <button type="button" role="switch" aria-checked={checked} disabled={disabled} className="gu-row gu-row--tall gu-row--switch" onClick={() => onChange(!checked)}>
      {icon && <span className="gu-row__icon" aria-hidden="true">{icon}</span>}
      <span className="gu-row__text">
        <span className="gu-row__title">{title}</span>
        {note && <span className="gu-row__note">{note}</span>}
      </span>
      <span className={`switch${checked ? ' switch--on' : ''}`} aria-hidden="true" />
    </button>
  );
}

/** Круглая отметка выбора: пустая серая или акцентная с галочкой (та же, что в «Добавить чаты») */
export function CheckMark({ on }: { on: boolean }) {
  return (
    <span className={`fp-pick__box${on ? ' fp-pick__box--on' : ''}`} aria-hidden="true">
      {on && <IconCheck />}
    </span>
  );
}

/** Точка выбора одного из нескольких вариантов */
export function RadioDot({ on }: { on: boolean }) {
  return <span className={`gu-radio${on ? ' gu-radio--on' : ''}`} aria-hidden="true" />;
}

export function Pill({ children, tone = 'quiet' }: { children: ReactNode; tone?: 'quiet' | 'accent' }) {
  return <span className={`gu-pill gu-pill--${tone}`}>{children}</span>;
}

// ---------------------------------------------------------------- люди

/** Аватар человека: у самого пользователя актуальное фото профиля, у остальных — из справочника (или цветные инициалы) */
export function PersonAvatar({ id, size = 48, presence }: { id: string; size?: number; presence?: boolean }) {
  const mine = useAvatarSrc();
  const src = id === ME ? mine || avatarOf(ME) : avatarOf(id);
  const online = presence && (id === ME || Boolean(contactOf(id)?.online));
  return <Avatar src={src} size={size} presence={online ? 'online' : undefined} />;
}

/** Имя для списка: у самого пользователя имя из профиля */
export function usePersonName(id: string): string {
  const profile = useProfile();
  return id === ME ? profile.name : nameOf(id);
}

export function PersonName({ id }: { id: string }) {
  return <>{usePersonName(id)}</>;
}

interface PersonRowProps {
  id: string;
  note?: ReactNode;
  /** Метки рядом с именем: «Владелец», «Куратор» */
  pills?: ReactNode;
  /** Режим выбора: отметка слева */
  check?: boolean;
  end?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  presence?: boolean;
}

/** Строка человека: аватар 48, имя, статус; в режиме выбора слева круглая отметка */
export function PersonRow({ id, note, pills, check, end, chevron, onClick, presence = true }: PersonRowProps) {
  const name = usePersonName(id);
  const status = note ?? (id === ME ? 'вы' : contactOf(id)?.status);
  return (
    <Row
      tall
      role={check === undefined ? undefined : 'checkbox'}
      checked={check}
      ariaLabel={check === undefined ? undefined : name}
      lead={
        <span className="gu-pick">
          <PersonAvatar id={id} presence={presence && !check} />
          {check && (
            <span className="gu-pick__badge" aria-hidden="true">
              <IconCheck />
            </span>
          )}
        </span>
      }
      title={
        <>
          <span className="gu-row__name">{name}</span>
          {pills}
        </>
      }
      note={status}
      end={end}
      chevron={chevron}
      onClick={onClick}
    />
  );
}

/** Выбранные люди, как в Telegram: чипсы с аватаром и именем переносятся на новые строки, нажатие убирает; пока никого нет, стоит подсказка */
export function ChosenChips({ ids, onRemove, none = 'Выберите людей из списка ниже' }: { ids: string[]; onRemove: (id: string) => void; none?: string }) {
  return (
    <div className="gu-chosen">
      {ids.length === 0 && <p className="gu-chosen__none">{none}</p>}
      {ids.map((id) => (
        <button key={id} type="button" className="gu-chosen__chip" aria-label={`Убрать: ${nameOf(id)}`} onClick={() => onRemove(id)}>
          <PersonAvatar id={id} size={40} presence={false} />
          <span className="gu-chosen__name">{firstNameOf(id)}</span>
        </button>
      ))}
    </div>
  );
}

/** Контакты по папкам записной книжки (клиенты, коллеги, семинар), внутри — по алфавиту */
export function groupContacts(contacts: Contact[]): Array<{ key: string; label: string; items: Contact[] }> {
  const sorted = [...contacts].sort(byName);
  const known = new Set<string>(CATEGORIES.map((c) => c.id));
  const sections = CATEGORIES.map((c) => ({ key: c.id as string, label: c.label, items: sorted.filter((x) => x.category === c.id) }));
  const rest = sorted.filter((x) => !x.category || !known.has(x.category));
  if (rest.length) sections.push({ key: 'rest', label: 'Остальные', items: rest });
  return sections.filter((x) => x.items.length > 0);
}

/** Показ контактов по запросу: имя или @адрес содержит запрос */
export function matchContacts(contacts: Contact[], query: string): Contact[] {
  const q = query.trim().toLowerCase().replace(/^@/, '');
  return q ? contacts.filter((c) => c.name.toLowerCase().includes(q) || c.username?.toLowerCase().replace(/^@/, '').includes(q)) : contacts;
}

interface ContactListProps {
  contacts: Contact[];
  /** Режим выбора: отметки у строк */
  chosen?: string[];
  onPick: (contact: Contact) => void;
  /** Текст, если никого нет (пустой список без запроса) */
  none?: string;
  /** Запрос поиска: в нём пустой результат объясняется иначе */
  query: string;
}

/** Контакты карточками по папкам записной книжки */
export function ContactList({ contacts, chosen, onPick, none = 'Контактов пока нет.', query }: ContactListProps) {
  const shown = matchContacts(contacts, query);
  if (shown.length === 0) {
    return (
      <section className="fp__card" aria-label="Контакты">
        <p className="gu-empty">{contacts.length === 0 ? none : 'Никого не нашли'}</p>
      </section>
    );
  }
  return (
    <>
      {groupContacts(shown).map((section) => (
        <section key={section.key} className="fp__card" aria-label={section.label}>
          <h2 className="fp__heading fp__heading--pad">{section.label}</h2>
          <div className="gu-rows">
            {section.items.map((c) => (
              <PersonRow key={c.id} id={c.id} check={chosen ? chosen.includes(c.id) : undefined} note={c.status} onClick={() => onPick(c)} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

interface PickerProps {
  /** Кого можно выбрать */
  contacts: Contact[];
  chosen: string[];
  onToggle: (id: string) => void;
  /** Текст, если выбирать некого */
  none?: string;
  /** Подсказка в строке выбранных, пока никого нет */
  empty?: string;
}

/** Выбор контактов: поиск, под ним выбранные чипсами (или подсказка) и список с отметками */
export function ContactPicker({ contacts, chosen, onToggle, none = 'Все ваши контакты уже здесь.', empty }: PickerProps) {
  const [query, setQuery] = useState('');
  return (
    <>
      <div className="gu-search">
        <SearchField value={query} onChange={setQuery} placeholder="Поиск контактов" onClear={() => setQuery('')} />
      </div>
      <ChosenChips ids={chosen} onRemove={onToggle} none={empty} />
      <ContactList contacts={contacts} chosen={chosen} onPick={(c) => onToggle(c.id)} none={none} query={query} />
    </>
  );
}

// ---------------------------------------------------------------- поля

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Сколько знаков можно ввести; справа счётчик оставшихся */
  max?: number;
  multiline?: boolean;
  autoFocus?: boolean;
  /** Подсказка о введённом (адрес занят, свободен): под полем */
  status?: { tone: 'error' | 'ok' | 'info'; text: string } | null;
  hint?: ReactNode;
  prefix?: string;
  inputMode?: 'text' | 'url';
  /** Enter заканчивает ввод (в многострочном поле — перенос) */
  onEnter?: () => void;
}

/** Поле в карточке: подпись, текст, счётчик оставшихся знаков; под полем строка-подсказка о введённом */
export function Field({ label, value, onChange, placeholder, max, multiline, autoFocus, status, hint, prefix, inputMode = 'text', onEnter }: FieldProps) {
  const left = max === undefined ? undefined : max - Array.from(value).length;
  const set = (raw: string) => onChange(max === undefined ? raw : Array.from(raw).slice(0, max).join(''));
  const input = multiline ? (
    <AutoTextarea className="fp__input gu-textarea" value={value} placeholder={placeholder} rows={3} autoFocus={autoFocus} {...plainText} onChange={set} />
  ) : (
    <input
      className="fp__input"
      value={value}
      placeholder={placeholder}
      autoFocus={autoFocus}
      inputMode={inputMode}
      autoCapitalize={inputMode === 'url' ? 'none' : undefined}
      spellCheck={inputMode === 'url' ? false : undefined}
      {...plainText}
      enterKeyHint={onEnter ? 'done' : undefined}
      onChange={(e) => set(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
    />
  );
  return (
    <div className="gu-block">
      <section className="fp__card" aria-label={label}>
        <label className="fp__field">
          <span className="fp__heading">{label}</span>
          <span className={`fp__input-row${multiline ? ' gu-input-row--multi' : ''}`}>
            {prefix && <span className="gu-prefix">{prefix}</span>}
            {input}
            {left !== undefined && (left <= 20 || !multiline) && (
              <span className="fp__counter" aria-label={`Можно ввести ещё ${left}`}>
                {left}
              </span>
            )}
          </span>
        </label>
        {status && (
          <p className={`gu-status gu-status--${status.tone}`} role="status">
            {status.text}
          </p>
        )}
      </section>
      {hint && <p className="gu-hint">{hint}</p>}
    </div>
  );
}

interface PhotoFieldProps {
  value: string | null;
  /** Название для цветных инициалов, пока фото нет */
  name: string;
  seed: string;
  onChange: (photo: string | null) => void;
  say: (text: string) => void;
}

/** Фото группы или канала: круг 96 с камерой; нажатие — выбор снимка (на телефоне можно сразу сфотографировать), у готового фото — окно «заменить или убрать» */
export function PhotoField({ value, name, seed, onChange, say }: PhotoFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const [asking, setAsking] = useState(false);
  const pick = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      onChange(await squareAvatar(file));
    } catch {
      say('Не удалось открыть файл: выберите фото в формате JPG, PNG или WebP');
    }
  };
  const preview = value ?? (name.trim() ? initialsAvatar(name.trim(), seed) : null);
  return (
    <div className="gu-photo">
      <div className="gu-photo__frame">
        <button type="button" className="gu-photo__button" aria-label={value ? 'Изменить фото' : 'Добавить фото'} onClick={() => (value ? setAsking(true) : input.current?.click())}>
          {preview ? (
            <img className="gu-photo__img" src={preview} alt="" />
          ) : (
            <span className="gu-photo__camera" aria-hidden="true">
              <IconCameraAdd />
            </span>
          )}
        </button>
        {/* У готовой картинки камера — значок в углу: по центру она закрывала бы инициалы */}
        {preview && (
          <span className="gu-photo__badge" aria-hidden="true">
            <IconCameraAdd />
          </span>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={pick} />
      {asking && (
        <ActionSheet
          title="Фото"
          onClose={() => setAsking(false)}
          actions={[
            { key: 'new', label: 'Выбрать другое', Icon: IconCameraAdd, run: () => input.current?.click() },
            { key: 'remove', label: 'Убрать фото', Icon: IconCloseLine, danger: true, run: () => onChange(null) },
          ]}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------- нижние окна

export interface SheetAction {
  key: string;
  label: string;
  note?: string;
  Icon?: ComponentType<SVGProps<SVGSVGElement>>;
  danger?: boolean;
  run: () => void;
  /** Отмечено (для выбора из вариантов) */
  checked?: boolean;
}

/** Нижнее окно с действиями: список строк, внизу «Отмена». Окно закрывается само, потом выполняется действие */
export function ActionSheet({ title, subtitle, actions, onClose, cancel = 'Отмена' }: { title: string; subtitle?: string; actions: SheetAction[]; onClose: () => void; cancel?: string }) {
  return (
    <Frame
      title={title}
      subtitle={subtitle}
      onClose={onClose}
      footer={
        <button type="button" className="sheet__button" onClick={onClose}>
          {cancel}
        </button>
      }
    >
      <div className="gu-list">
        {actions.map(({ key, label, note, Icon, danger, run, checked }) => (
          <button
            key={key}
            type="button"
            className={`gu-row${danger ? ' gu-row--danger' : ''}${note ? ' gu-row--tall' : ''}`}
            role={checked === undefined ? undefined : 'radio'}
            aria-checked={checked}
            onClick={() => {
              onClose();
              run();
            }}
          >
            {Icon && (
              <span className="gu-row__icon" aria-hidden="true">
                <Icon />
              </span>
            )}
            <span className="gu-row__text">
              <span className="gu-row__title">{label}</span>
              {note && <span className="gu-row__note">{note}</span>}
            </span>
            {checked !== undefined && <RadioDot on={checked} />}
          </button>
        ))}
      </div>
    </Frame>
  );
}

/** Пустое место внутри карточки */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="gu-empty">{children}</p>;
}
