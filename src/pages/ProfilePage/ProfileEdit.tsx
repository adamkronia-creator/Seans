import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Avatar } from '../../components/Avatar/Avatar';
import { IconChevronDown, IconChevronUp, IconTrash } from '../../components/ChatParts/ChatIcons';
import { AutoTextarea } from '../../components/EditSheet/AutoTextarea';
import { IconBack } from '../../components/icons';
import { IconImage } from '../../components/Profile/ProfileIcons';
import { PhotoPickSheet, RemoveSheet } from '../../components/Profile/ProfileSheets';
import { Toast } from '../../components/Toast/Toast';
import { useToast } from '../../components/Toast/useToast';
import {
  FIELD_SUGGESTIONS,
  addField,
  avatarSrcOf,
  coverSrcOf,
  moveField,
  pruneEmptyFields,
  removeField,
  updateBasics,
  updateField,
  useProfile,
  type ProfileField,
} from '../../data/profile';
import { clearWantedEdit, wantedEdit } from '../../data/profileIntent';
import { goBack } from '../../router';
import { useSwipeBack } from '../../utils/tabNav';
import './ProfileEdit.css';
import { plainText } from '../../utils/plainText';
import { flip } from '../../utils/flip';

/** Прокрутить область ровно настолько, чтобы элемент оказался на виду (высокий — верхним краем) */
function reveal(scroller: HTMLElement, el: HTMLElement, margin = 16) {
  const box = scroller.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  if (rect.top < box.top + margin || rect.height > box.height - margin * 2) scroller.scrollTop += rect.top - box.top - margin;
  else if (rect.bottom > box.bottom - margin) scroller.scrollTop += rect.bottom - box.bottom + margin;
}

/** Новое поле не вставляется рывком: карточка вырастает из нуля (зеркало ухода, см. pe-field-out), а область прокрутки идёт за ней, пока она не окажется на виду */
function growIn(scroller: HTMLElement, el: HTMLElement) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    reveal(scroller, el);
    return;
  }
  const list = el.parentElement as HTMLElement;
  const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
  const style = getComputedStyle(el);
  const border = style.borderTopWidth;
  const h = el.offsetHeight;
  // Первое поле: список появляется вместе с отступом до соседних блоков, его тоже раскрываем плавно
  const first = list.children.length === 1;
  const options = { duration: 280, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' } as const;
  el.style.overflow = 'hidden';
  const grow = el.animate(
    [
      { height: '0px', marginTop: first ? '0px' : `${-gap}px`, borderWidth: '0px', opacity: 0, transform: 'scale(0.96)' },
      { height: `${h}px`, marginTop: '0px', borderWidth: border, opacity: 1, transform: 'scale(1)' },
    ],
    options,
  );
  if (first) list.animate([{ marginBottom: `${-gap}px` }, { marginBottom: '0px' }], options);
  const follow = () => {
    reveal(scroller, el);
    if (grow.playState === 'running') requestAnimationFrame(follow);
  };
  follow();
  const done = () => el.style.removeProperty('overflow');
  grow.addEventListener('finish', done);
  grow.addEventListener('cancel', done);
}

/** Строка с подписью в карточке: подпись сверху, поле под ней; правки сохраняются сразу */
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

/** Телефон по мере набора: +7 (908) 943-38-19 */
function formatPhone(raw: string): string {
  let d = raw.replace(/\D/g, '');
  if (!d) return '';
  if (d[0] === '8' || d[0] === '7') d = d.slice(1);
  d = d.slice(0, 10);
  let out = '+7';
  if (d.length > 0) out += ` (${d.slice(0, 3)}`;
  if (d.length >= 3) out += ')';
  if (d.length > 3) out += ` ${d.slice(3, 6)}`;
  if (d.length > 6) out += `-${d.slice(6, 8)}`;
  if (d.length > 8) out += `-${d.slice(8, 10)}`;
  return out;
}

/** «29 июля 1998» или «29.07.1998» → «29 июля 1998 (28 лет)»; текст, который не похож на дату, остаётся как есть */
function formatBirthday(raw: string): string {
  const text = raw.replace(/\(.*?\)/g, '').trim().replace(/\s+/g, ' ');
  let day = 0;
  let month = -1;
  let year = 0;
  const word = /^(\d{1,2}) ([а-яё]+) (\d{4})$/i.exec(text);
  const num = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text);
  if (word) {
    day = Number(word[1]);
    month = MONTHS.indexOf(word[2].toLowerCase());
    year = Number(word[3]);
  } else if (num) {
    day = Number(num[1]);
    month = Number(num[2]) - 1;
    year = Number(num[3]);
  }
  if (month < 0 || month > 11 || day < 1 || day > 31 || year < 1900) return raw.trim();
  const now = new Date();
  let age = now.getFullYear() - year;
  if (now.getMonth() < month || (now.getMonth() === month && now.getDate() < day)) age -= 1;
  if (age < 0 || age > 120) return `${day} ${MONTHS[month]} ${year}`;
  const last = age % 10;
  const unit = age % 100 >= 11 && age % 100 <= 14 ? 'лет' : last === 1 ? 'год' : last >= 2 && last <= 4 ? 'года' : 'лет';
  return `${day} ${MONTHS[month]} ${year} (${age} ${unit})`;
}

function TextInput({ label, value, onChange, onBlur, placeholder, max, type, inputMode }: { label: string; value: string; onChange: (value: string) => void; onBlur?: (value: string) => void; placeholder: string; max: number; type?: string; inputMode?: 'tel' }) {
  return (
    <label className="pe__input">
      <span className="pe__label">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur ? (e) => onBlur(e.target.value) : undefined} placeholder={placeholder} {...plainText} type={type} inputMode={inputMode} maxLength={max} />
    </label>
  );
}

const titleOf = (field: ProfileField) => field.label.trim() || 'Без названия';

/**
 * «Редактирование профиля»: фото профиля и обложка, имя со специализацией и городом, а ниже личная информация,
 * которую человек собирает сам: каждое поле можно переименовать, написать, переставить и убрать, а новое добавить (своё или из подсказок).
 * Правки сохраняются сразу, как печатаешь, поэтому «Готово» просто возвращает на страницу профиля.
 */
export function ProfileEditPage() {
  const profile = useProfile();
  const { fields, name, headline, city, username, phone, birthday, family } = profile;
  const [picking, setPicking] = useState<'avatar' | 'cover' | null>(null);
  const [asking, setAsking] = useState<ProfileField | null>(null);
  const [toast, show] = useToast();
  // К чему перейти при открытии: к полю, которое нажали на странице профиля, или к «Добавить поле»
  const [target] = useState(wantedEdit);
  const scroller = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  useSwipeBack(root, () => goBack('/'));
  const addCard = useRef<HTMLElement>(null);
  /** Новое поле: когда оно появится, его показывают на экране; курсор в него не ставится, клавиатура сама не открывается */
  const pending = useRef<{ id: string } | null>(null);
  /** Поле, которое только что переставили: после этого оно остаётся на виду */
  const moved = useRef<string | null>(null);
  /** Где стояли карточки полей до перестановки: от этих мест они плавно переезжают на новые */
  const placed = useRef<Map<HTMLElement, number> | null>(null);

  const cover = coverSrcOf(profile);
  // Уходящее поле уже не считается занятым: подсказка возвращается в начале анимации, а не скачком в её конце, когда список под ним меняет высоту
  const used = new Set(fields.filter((f) => f.id !== leaving).map((f) => f.label.trim().toLowerCase()));
  const suggestions = FIELD_SUGGESTIONS.filter((label) => !used.has(label.toLowerCase()));
  const order = fields.map((f) => f.id).join();

  const card = (id: string) => scroller.current?.querySelector<HTMLElement>(`[data-field="${id}"]`) ?? null;

  useLayoutEffect(() => {
    const box = scroller.current;
    if (!box || !target) return;
    if (target === 'add') {
      if (addCard.current) reveal(box, addCard.current);
      return;
    }
    const found = card(target);
    if (!found) return;
    reveal(box, found);
    found.querySelector<HTMLTextAreaElement>('textarea')?.focus({ preventScroll: true });
  }, [target]);

  useLayoutEffect(() => {
    const box = scroller.current;
    const want = pending.current;
    if (!box || !want) return;
    pending.current = null;
    const found = card(want.id);
    if (!found) return;
    growIn(box, found);
  }, [fields.length]);

  useLayoutEffect(() => {
    const box = scroller.current;
    const id = moved.current;
    if (!box || !id) return;
    moved.current = null;
    const found = card(id);
    // Сначала на виду оказывается конечное положение, затем карточки (переставленная и уступившая место) переезжают к нему плавно
    if (found) reveal(box, found);
    const before = placed.current;
    placed.current = null;
    if (before) flip(Array.from(box.querySelectorAll<HTMLElement>('.pe__fields > li[data-field]')), before, 'y');
  }, [order]);

  // Брошенные «Добавить поле» без названия и текста при выходе убираются
  useEffect(
    () => () => {
      clearWantedEdit();
      pruneEmptyFields();
    },
    [],
  );

  const add = (label: string) => {
    pending.current = { id: addField(label) };
  };

  const move = (id: string, step: -1 | 1) => {
    moved.current = id;
    placed.current = new Map(Array.from(scroller.current?.querySelectorAll<HTMLElement>('.pe__fields > li[data-field]') ?? []).map((el) => [el, el.offsetTop]));
    moveField(id, step);
  };

  // Поле не пропадает рывком: карточка тает и сворачивается по высоте, и только потом исчезает из данных
  const dismiss = (id: string) => {
    const li = root.current?.querySelector<HTMLElement>(`[data-field="${id}"]`);
    if (!li || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      removeField(id);
      return;
    }
    li.style.setProperty('--h', `${li.offsetHeight}px`);
    setLeaving(id);
    window.setTimeout(() => {
      removeField(id);
      setLeaving(null);
    }, 280);
  };

  // Пустое поле убирается сразу: терять нечего; с текстом — сначала вопрос
  const askRemove = (field: ProfileField) => {
    if (!field.label.trim() && !field.value.trim()) dismiss(field.id);
    else setAsking(field);
  };

  const confirmRemove = () => {
    if (asking) {
      dismiss(asking.id);
      show(`Поле «${titleOf(asking)}» удалено`);
    }
    setAsking(null);
  };

  return (
    <section ref={root} className="pe">
      <header className="pe__header">
        <button type="button" className="pe__back" aria-label="Назад" onClick={() => goBack('/')}>
          <IconBack />
        </button>
        <div className="pe__who">
          <h1 className="pe__title" aria-label="Редактирование профиля">
            Редактирование
          </h1>
          <p className="pe__subtitle">Ваш профиль</p>
        </div>
      </header>

      <div ref={scroller} className="pe__scroll">
        <div className="pe__group">
          <h2 className="pe__group-title">Фотографии и обложки</h2>
        </div>
        <section className="pe__card" aria-label="Фотографии и обложки">
          <button type="button" className="pe__row" onClick={() => setPicking('avatar')}>
            <Avatar src={avatarSrcOf(profile)} size={40} />
            <span className="pe__row-label">Фото профиля</span>
            <span className="pe__row-action">Изменить</span>
          </button>
          <button type="button" className="pe__row" onClick={() => setPicking('cover')}>
            <span className="pe__cover-thumb">{cover ? <img src={cover} alt="" /> : <IconImage />}</span>
            <span className="pe__row-label">Обложка</span>
            <span className="pe__row-action">{cover ? 'Изменить' : 'Добавить'}</span>
          </button>
        </section>

        <div className="pe__group">
          <h2 className="pe__group-title">Контактная информация</h2>
        </div>
        <section className="pe__card" aria-label="Контактная информация">
          <TextInput label="Имя пользователя" value={name} onChange={(v) => updateBasics({ name: v })} placeholder="Как к вам обращаться" max={80} />
          <TextInput label="Никнейм" value={username} onChange={(v) => updateBasics({ username: v.replace(/\s/g, '') })} placeholder="@nickname" max={40} />
          <TextInput label="Телефон" value={phone} onChange={(v) => updateBasics({ phone: formatPhone(v) })} placeholder="+7 (908) 943-38-19" max={18} type="tel" inputMode="tel" />
        </section>

        <div className="pe__group">
          <h2 className="pe__group-title">Общая информация</h2>
        </div>
        <section className="pe__card" aria-label="Общая информация">
          <TextInput label="Дата рождения" value={birthday} onChange={(v) => updateBasics({ birthday: v })} placeholder="29 июля 1998 (28 лет)" max={40} onBlur={(v) => updateBasics({ birthday: formatBirthday(v) })} />
          <TextInput label="Специализация" value={headline} onChange={(v) => updateBasics({ headline: v })} placeholder="Например, психолог-консультант" max={120} />
          <TextInput label="Семейное положение" value={family} onChange={(v) => updateBasics({ family: v })} placeholder="Например, женат" max={60} />
          <TextInput label="Город" value={city} onChange={(v) => updateBasics({ city: v })} placeholder="Где вы принимаете" max={80} />
        </section>

        <div className="pe__group">
          <h2 className="pe__group-title">Личная информация</h2>
        </div>

        {fields.length > 0 && (
          <ul className="pe__fields">
            {fields.map((field, i) => (
              <li key={field.id} className={`pe__card pe__field${leaving === field.id ? ' pe__field--leaving' : ''}`} data-field={field.id}>
                <div className="pe__field-head">
                  <input
                    className="pe__field-label"
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    placeholder="Название поля"
                    aria-label="Название поля"
                    {...plainText}
                    maxLength={60}
                  />
                  <button
                    type="button"
                    className="pe__tool"
                    aria-label={`Поднять поле «${titleOf(field)}» выше`}
                    disabled={i === 0}
                    onClick={() => move(field.id, -1)}
                  >
                    <IconChevronUp />
                  </button>
                  <button
                    type="button"
                    className="pe__tool"
                    aria-label={`Опустить поле «${titleOf(field)}» ниже`}
                    disabled={i === fields.length - 1}
                    onClick={() => move(field.id, 1)}
                  >
                    <IconChevronDown />
                  </button>
                  <button type="button" className="pe__tool pe__tool--danger" aria-label={`Удалить поле «${titleOf(field)}»`} onClick={() => askRemove(field)}>
                    <IconTrash />
                  </button>
                </div>
                <AutoTextarea
                  className="pe__field-text"
                  rows={2}
                  value={field.value}
                  onChange={(value) => updateField(field.id, { value })}
                  placeholder="Напишите здесь"
                  {...plainText}
                  aria-label={`Текст поля «${titleOf(field)}»`}
                  maxLength={3000}
                />
              </li>
            ))}
          </ul>
        )}

        <section ref={addCard} className="pe__card pe__field pe__add" aria-labelledby="pe-add">
          <div className="pe__field-head">
            <h2 id="pe-add" className="pe__add-title">
              Добавить поле
            </h2>
          </div>
          <div className="pe__chips">
            <button type="button" className="pe__chip pe__chip--own" onClick={() => add('')}>
              Создать
            </button>
            {suggestions.map((label) => (
              <button key={label} type="button" className="pe__chip" onClick={() => add(label)}>
                {label}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="pe__footer">
        <button type="button" className="pe__done" onClick={() => goBack('/')}>
          Готово
        </button>
      </div>

      {toast && <Toast text={toast} />}
      {picking && <PhotoPickSheet kind={picking} onClose={() => setPicking(null)} onNote={show} />}
      {asking && (
        <RemoveSheet
          title="Удалить поле?"
          text={`Поле «${titleOf(asking)}» и его текст исчезнут из профиля. Позже его можно добавить снова.`}
          confirm="Удалить"
          onConfirm={confirmRemove}
          onClose={() => setAsking(null)}
        />
      )}
    </section>
  );
}
