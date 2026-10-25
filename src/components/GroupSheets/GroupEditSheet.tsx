import { useEffect, useId, useState } from 'react';
import { Frame } from '../Frame/Frame';
import { createGroup, updateGroup, useGroupsState, validateGroup, type GroupError, type GroupInput } from '../../data/groupStore';
import { ABOUT_MAX, CHANNEL_LABEL, CITY_MAX, freeEmblem, JOIN_LABEL, NAME_MAX, type ChannelAccess, type JoinMode } from '../../data/groups';
import { afterSheetClose, navigate } from '../../router';
import { plainText } from '../../utils/plainText';
import { EmblemPicker } from './EmblemPicker';
import { closeGroupSheet, groupPath, toastGroup } from './groupSheets';

interface OptionItem<T extends string> {
  id: T;
  title: string;
  hint: string;
}

const JOINS: OptionItem<JoinMode>[] = [
  { id: 'open', title: JOIN_LABEL.open, hint: 'Любой может вступить сразу' },
  { id: 'request', title: JOIN_LABEL.request, hint: 'Заявки рассматривают владелец и администраторы' },
  { id: 'invite', title: JOIN_LABEL.invite, hint: 'Звать в группу могут владелец и администраторы' },
];

const CHANNELS: OptionItem<ChannelAccess>[] = [
  { id: 'public', title: 'Открыт всем', hint: 'Записи читают все, даже не участники группы' },
  { id: 'members', title: 'Только участники', hint: CHANNEL_LABEL.members.replace('Канал читают', 'Записи читают') },
];

/** Выбор одного из нескольких: строки с кружком слева, под названием поясняется, что это значит */
function Options<T extends string>({ label, value, items, onChange }: { label: string; value: T; items: OptionItem<T>[]; onChange: (next: T) => void }) {
  return (
    <div className="gs-opts" role="radiogroup" aria-label={label}>
      {items.map((item) => (
        <button key={item.id} type="button" role="radio" aria-checked={value === item.id} className="gs-opt" onClick={() => onChange(item.id)}>
          <span className="gs-opt__radio" aria-hidden="true" />
          <span className="gs-opt__text">
            <span className="gs-opt__title">{item.title}</span>
            <span className="gs-opt__hint">{item.hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

const ERROR_TEXT: Record<GroupError, string> = {
  name: 'Название не короче двух букв',
  'name-taken': 'Группа с таким названием уже есть',
  emblem: 'Выберите эмодзи для значка',
  'emblem-taken': 'Такой значок уже занят: выберите другой цвет или эмодзи',
};

/** Новая группа (без `id`) или правка своей. Группу может создать кто угодно, менять её — только владелец */
export function GroupEditSheet({ id, onClose }: { id?: string; onClose: () => void }) {
  const uid = useId();
  const { groups } = useGroupsState();
  const group = id ? groups.find((g) => g.id === id) : undefined;
  const [input, setInput] = useState<GroupInput>(() =>
    group
      ? { name: group.name, about: group.about, city: group.city, emblem: group.emblem, join: group.join, channel: group.channel }
      : { name: '', about: '', city: '', emblem: freeEmblem(groups), join: 'request', channel: 'members' },
  );
  // Группу, которую правили, удалили
  useEffect(() => {
    if (id && !group) onClose();
  }, [id, group, onClose]);

  const set = <K extends keyof GroupInput>(key: K, value: GroupInput[K]) => setInput((prev) => ({ ...prev, [key]: value }));
  const problem = validateGroup(input, id);
  const nameError = problem === 'name-taken' ? ERROR_TEXT['name-taken'] : problem === 'name' && input.name.trim().length === 1 ? ERROR_TEXT.name : null;

  const submit = () => {
    if (problem) return;
    if (id) {
      const error = updateGroup(id, input);
      if (error) return;
      closeGroupSheet();
      toastGroup('Изменения сохранены');
      return;
    }
    const result = createGroup(input);
    if (!result.ok) return;
    closeGroupSheet();
    toastGroup(`Группа «${result.group.name}» создана`);
    afterSheetClose(() => navigate(groupPath(result.group.id)));
  };

  return (
    <Frame
      title={id ? 'Изменить группу' : 'Новая группа'}
      subtitle={id ? group?.name : 'Группу может создать любой'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="sheet__button sheet__button--primary" disabled={problem !== null} onClick={submit}>
            {id ? 'Сохранить' : 'Создать'}
          </button>
        </>
      }
    >
      <section className="sheet__card frame-card">
        <label className="frame-label" htmlFor={`${uid}-name`}>
          Название
        </label>
        <input
          id={`${uid}-name`}
          className="frame-textarea"
          value={input.name}
          maxLength={NAME_MAX}
          name="group-name"
          placeholder="Например, Интервизия Урала"
          autoFocus={!id}
          {...plainText}
          onChange={(e) => set('name', e.target.value)}
        />
        {nameError && <span className="gs-error">{nameError}</span>}
      </section>

      <section className="sheet__card frame-card">
        <span className="frame-label">Значок</span>
        <EmblemPicker value={input.emblem} onChange={(emblem) => set('emblem', emblem)} groups={groups} exceptId={id} />
      </section>

      <section className="sheet__card frame-card">
        <label className="frame-label" htmlFor={`${uid}-about`}>
          О группе
        </label>
        <textarea
          id={`${uid}-about`}
          className="frame-textarea gs-textarea"
          value={input.about}
          maxLength={ABOUT_MAX}
          rows={3}
          name="group-about"
          placeholder="Чем занимается группа, кто в неё входит, как проходят встречи"
          {...plainText}
          onChange={(e) => set('about', e.target.value)}
        />
        <span className="gs-counter">{input.about.length} / {ABOUT_MAX}</span>
      </section>

      <section className="sheet__card frame-card">
        <label className="frame-label" htmlFor={`${uid}-city`}>
          Город
        </label>
        <input id={`${uid}-city`} className="frame-textarea" value={input.city} maxLength={CITY_MAX} name="group-city" placeholder="Пусто — группа онлайн" {...plainText} onChange={(e) => set('city', e.target.value)} />
      </section>

      <section className="sheet__card frame-card">
        <span className="frame-label">Как вступить</span>
        <Options label="Как вступить" value={input.join} items={JOINS} onChange={(join) => set('join', join)} />
      </section>

      <section className="sheet__card frame-card">
        <span className="frame-label">Кто читает канал</span>
        <Options label="Кто читает канал" value={input.channel} items={CHANNELS} onChange={(channel) => set('channel', channel)} />
        <span className="ct-hint">Писать в канал могут владелец и администраторы.</span>
      </section>
    </Frame>
  );
}
