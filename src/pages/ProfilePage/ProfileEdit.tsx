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

/** Прокрутить область ровно настолько, чтобы элемент оказался на виду (высокий — верхним краем) */
function reveal(scroller: HTMLElement, el: HTMLElement, margin = 16) {
  const box = scroller.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  if (rect.top < box.top + margin || rect.height > box.height - margin * 2) scroller.scrollTop += rect.top - box.top - margin;
  else if (rect.bottom > box.bottom - margin) scroller.scrollTop += rect.bottom - box.bottom + margin;
}

const titleOf = (field: ProfileField) => field.label.trim() || 'Без названия';

/**
 * «Редактирование профиля»: фото профиля и обложка, имя со специализацией и городом, а ниже личная информация,
 * которую человек собирает сам: каждое поле можно переименовать, написать, переставить и убрать, а новое добавить (своё или из подсказок).
 * Правки сохраняются сразу, как печатаешь, поэтому «Готово» просто возвращает на страницу профиля.
 */
export function ProfileEditPage() {
  const profile = useProfile();
  const { fields, name, headline, city } = profile;
  const [picking, setPicking] = useState<'avatar' | 'cover' | null>(null);
  const [asking, setAsking] = useState<ProfileField | null>(null);
  const [toast, show] = useToast();
  // К чему перейти при открытии: к полю, которое нажали на странице профиля, или к «Добавить поле»
  const [target] = useState(wantedEdit);
  const scroller = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);
  useSwipeBack(root, () => goBack('/'));
  const addCard = useRef<HTMLElement>(null);
  /** Что сделать, когда появится новое поле: встать на его название (своё поле) или на текст (из подсказки) */
  const pending = useRef<{ id: string; part: 'label' | 'value' } | null>(null);
  /** Поле, которое только что переставили: после этого оно остаётся на виду */
  const moved = useRef<string | null>(null);

  const cover = coverSrcOf(profile);
  const used = new Set(fields.map((f) => f.label.trim().toLowerCase()));
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
    reveal(box, found);
    found.querySelector<HTMLElement>(want.part === 'label' ? 'input' : 'textarea')?.focus({ preventScroll: true });
  }, [fields.length]);

  useLayoutEffect(() => {
    const box = scroller.current;
    const id = moved.current;
    if (!box || !id) return;
    moved.current = null;
    const found = card(id);
    if (found) reveal(box, found);
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
    pending.current = { id: addField(label), part: label ? 'value' : 'label' };
  };

  const move = (id: string, step: -1 | 1) => {
    moved.current = id;
    moveField(id, step);
  };

  // Пустое поле убирается сразу: терять нечего; с текстом — сначала вопрос
  const askRemove = (field: ProfileField) => {
    if (!field.label.trim() && !field.value.trim()) removeField(field.id);
    else setAsking(field);
  };

  const confirmRemove = () => {
    if (asking) {
      removeField(asking.id);
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
        <h1 className="pe__title" aria-label="Редактирование профиля">
          Редактирование
        </h1>
        <button type="button" className="pe__done" onClick={() => goBack('/')}>
          Готово
        </button>
      </header>

      <div ref={scroller} className="pe__scroll">
        <section className="pe__card" aria-label="Фото">
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

        <section className="pe__card" aria-label="Основное">
          <label className="pe__input">
            <span className="pe__label">Имя</span>
            <input
              value={name}
              onChange={(e) => updateBasics({ name: e.target.value })}
              placeholder="Как к вам обращаться"
              autoComplete="name"
              maxLength={80}
            />
          </label>
          <label className="pe__input">
            <span className="pe__label">Специализация</span>
            <input
              value={headline}
              onChange={(e) => updateBasics({ headline: e.target.value })}
              placeholder="Например, психолог-консультант"
              autoComplete="off"
              maxLength={120}
            />
          </label>
          <label className="pe__input">
            <span className="pe__label">Город</span>
            <input
              value={city}
              onChange={(e) => updateBasics({ city: e.target.value })}
              placeholder="Где вы принимаете"
              autoComplete="address-level2"
              maxLength={80}
            />
          </label>
        </section>

        <div className="pe__group">
          <h2 className="pe__group-title">Личная информация</h2>
          <p className="pe__hint">Показывайте только то, что хотите. Название, текст и порядок полей меняются, ненужные можно убрать.</p>
        </div>

        {fields.length > 0 && (
          <ul className="pe__fields">
            {fields.map((field, i) => (
              <li key={field.id} className="pe__card pe__field" data-field={field.id}>
                <div className="pe__field-head">
                  <input
                    className="pe__field-label"
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    placeholder="Название поля"
                    aria-label="Название поля"
                    autoComplete="off"
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
                  aria-label={`Текст поля «${titleOf(field)}»`}
                  maxLength={3000}
                />
              </li>
            ))}
          </ul>
        )}

        <section ref={addCard} className="pe__card pe__add" aria-labelledby="pe-add">
          <h2 id="pe-add" className="pe__add-title">
            Добавить поле
          </h2>
          <p className="pe__hint pe__hint--inside">Выберите подсказку или создайте своё, например «Личный анализ».</p>
          <div className="pe__chips">
            <button type="button" className="pe__chip pe__chip--own" onClick={() => add('')}>
              Своё поле
            </button>
            {suggestions.map((label) => (
              <button key={label} type="button" className="pe__chip" onClick={() => add(label)}>
                {label}
              </button>
            ))}
          </div>
        </section>
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
