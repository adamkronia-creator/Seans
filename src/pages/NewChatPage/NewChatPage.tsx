import { useRef, useState } from 'react';
import { Frame } from '../../components/Frame/Frame';
import { Card, ContactList, ContactPicker, Field, Hint, PersonRow, PhotoField, RadioDot, Row, SubPage } from '../../components/GroupUi/GroupUi';
import { IconGlobal, IconLock, IconQr, IconStation, IconUserPlus, IconUsersGroup } from '../../components/GroupUi/GroupIcons';
import { SearchField } from '../../components/SearchField/SearchField';
import { useToast } from '../../components/Toast/useToast';
import { ensureContactChat } from '../../data/chatStore';
import { addContact, useContacts } from '../../data/contacts';
import { USERNAME_TEXT, createGroup, usernameStatus, type GroupKind } from '../../data/groups';
import { patchDraft, startDraft, toggleDraftMember, useDraft } from '../../data/newChat';
import { goBack, navigate, navigateOver } from '../../router';

/*
 * Новый чат (кнопка «+» в «Диалогах»): список контактов с действиями «Создать общий чат» и «Создать канал». Группа создаётся в три шага
 * (участники → название и фото → создана), канал в четыре (название, описание и фото → тип и адрес → подписчики → создан).
 * Адреса экранов: /new, /new/group, /new/group/info, /new/channel, /new/channel/type, /new/channel/members.
 * Когда группа создана, экраны мастера выбрасываются из истории: «назад» из нового чата ведёт в список, а не в мастер.
 */

export type NewStep = 'start' | 'group' | 'group-info' | 'channel' | 'channel-type' | 'channel-members';

/** Сколько адресов мастер положил в историю поверх списка чатов */
const DEPTH: Record<NewStep, number> = { start: 1, group: 2, 'group-info': 3, channel: 2, 'channel-type': 3, 'channel-members': 4 };

const NAME_MAX = 64;
const ABOUT_MAX = 255;
const USERNAME_MAX = 32;

export function NewChatPage({ step }: { step: NewStep }) {
  switch (step) {
    case 'start':
      return <StartScreen />;
    case 'group':
      return <GroupMembers />;
    case 'group-info':
      return <Details kind="group" />;
    case 'channel':
      return <Details kind="channel" />;
    case 'channel-type':
      return <ChannelType />;
    case 'channel-members':
      return <ChannelMembers />;
  }
}

/** Контакты и две кнопки создания; нажатие на контакт открывает личный чат с ним */
function StartScreen() {
  const contacts = useContacts();
  const [toast, say] = useToast();
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const searching = query.trim() !== '';
  const open = (id: string) => {
    const contact = contacts.find((c) => c.id === id);
    if (!contact) return;
    ensureContactChat(contact);
    navigateOver(`/chat/${id}`, DEPTH.start);
  };
  const begin = (kind: GroupKind) => {
    startDraft(kind);
    navigate(kind === 'group' ? '/new/group' : '/new/channel');
  };
  return (
    <SubPage title="Новый чат" subtitle="Выберите контакт или создайте группу" onBack={() => goBack('/')} swipe={!adding} toast={toast}>
      <div className="gu-search">
        <SearchField value={query} onChange={setQuery} placeholder="Поиск контактов" onClear={() => setQuery('')} />
      </div>
      {!searching && (
        <Card label="Создать">
          <div className="gu-rows">
            <Row tone="link" icon={<IconUsersGroup />} title="Создать общий чат" onClick={() => begin('group')} />
            <Row tone="link" icon={<IconStation />} title="Создать канал" onClick={() => begin('channel')} />
          </div>
        </Card>
      )}
      <ContactList contacts={contacts} query={query} onPick={(c) => open(c.id)} />
      <button type="button" className="gu-fab" aria-label="Новый контакт" onClick={() => setAdding(true)}>
        <IconUserPlus />
      </button>
      {adding && (
        <NewContactSheet
          onClose={() => setAdding(false)}
          onQr={() => say('Сканирование QR-кода появится позже')}
          onCreate={(name, surname, phone) => {
            addContact(name, surname, phone);
            setAdding(false);
            say('Контакт создан');
          }}
        />
      )}
    </SubPage>
  );
}

/** Окно «Новый контакт»: имя (обязательно), фамилия, телефон с кодом +7, синхронизация, добавление по QR */
function NewContactSheet({ onClose, onCreate, onQr }: { onClose: () => void; onCreate: (name: string, surname: string, phone: string) => void; onQr: () => void }) {
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [sync, setSync] = useState(false);
  const digits = phone.replace(/\D/g, '').slice(0, 10);
  const shown = [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6)].filter(Boolean).join(' ');
  const ready = name.trim() !== '';
  return (
    <Frame
      title="Новый контакт"
      onClose={onClose}
      footer={
        <button type="button" className="sheet__button" disabled={!ready} onClick={() => onCreate(name, surname, digits)}>
          Создать контакт
        </button>
      }
    >
      <section className="sheet__card frame-card">
        <label className="frame-label" htmlFor="nc-name">
          Имя (обязательно)
        </label>
        <input id="nc-name" className="frame-textarea" value={name} maxLength={64} autoFocus autoComplete="off" onChange={(e) => setName(e.target.value)} />
      </section>
      <section className="sheet__card frame-card">
        <label className="frame-label" htmlFor="nc-surname">
          Фамилия (необязательно)
        </label>
        <input id="nc-surname" className="frame-textarea" value={surname} maxLength={64} autoComplete="off" onChange={(e) => setSurname(e.target.value)} />
      </section>
      <section className="sheet__card frame-card">
        <label className="frame-label" htmlFor="nc-phone">
          Номер телефона
        </label>
        <div className="gu-phone">
          <span className="gu-phone__code">+7</span>
          <input id="nc-phone" className="frame-textarea" type="tel" inputMode="tel" placeholder="000 000 0000" value={shown} autoComplete="off" onChange={(e) => setPhone(e.target.value)} />
        </div>
      </section>
      <button type="button" className="sheet__card gu-sync" role="checkbox" aria-checked={sync} onClick={() => setSync(!sync)}>
        <RadioDot on={sync} />
        <span>Синхронизировать с телефоном</span>
      </button>
      <button type="button" className="sheet__card gu-qr" onClick={onQr}>
        <IconQr />
        <span>Добавить по QR-коду</span>
      </button>
    </Frame>
  );
}

/** Шаг 1 группы: выбрать участников, хотя бы одного */
function GroupMembers() {
  const contacts = useContacts();
  const draft = useDraft();
  const n = draft.members.length;
  return (
    <SubPage
      title="Новая группа"
      subtitle={n ? `Выбрано: ${n}` : 'Выберите участников'}
      onBack={() => goBack('/new')}
      footer={{ label: 'Далее', disabled: n === 0, onClick: () => navigate('/new/group/info') }}
    >
      <ContactPicker contacts={contacts} chosen={draft.members} onToggle={toggleDraftMember} empty="Отметьте участников в списке ниже" />
    </SubPage>
  );
}

/** Название, описание и фото: шаг 2 группы и шаг 1 канала */
function Details({ kind }: { kind: GroupKind }) {
  const draft = useDraft();
  const [toast, say] = useToast();
  const busy = useRef(false);
  const group = kind === 'group';
  const ready = draft.name.trim() !== '';
  const next = () => {
    if (!ready || busy.current) return;
    if (!group) {
      navigate('/new/channel/type');
      return;
    }
    busy.current = true;
    const id = createGroup({ ...draft, kind: 'group' });
    navigateOver(`/chat/${id}`, DEPTH['group-info']);
  };
  return (
    <SubPage
      title={group ? 'Новая группа' : 'Новый канал'}
      subtitle={group ? `${draft.members.length} ${draft.members.length === 1 ? 'участник' : 'участников'}` : 'Название и описание'}
      onBack={() => goBack(group ? '/new/group' : '/new')}
      toast={toast}
      footer={{ label: group ? 'Создать' : 'Далее', disabled: !ready, onClick: next }}
    >
      <PhotoField value={draft.photo} name={draft.name} seed="new" onChange={(photo) => patchDraft({ photo })} say={say} />
      <Field label={group ? 'Название группы' : 'Название канала'} value={draft.name} onChange={(name) => patchDraft({ name })} max={NAME_MAX} placeholder={group ? 'Например, Супервизия' : 'Например, Психология без мифов'} autoFocus />
      <Field
        label="Описание"
        value={draft.description}
        onChange={(description) => patchDraft({ description })}
        max={ABOUT_MAX}
        multiline
        placeholder="Необязательно"
        hint={group ? 'О чём эта группа: увидят все участники.' : 'О чём этот канал: увидят все, кто его откроет.'}
      />
      {group && (
        <Card heading={`Участники: ${draft.members.length}`}>
          {draft.members.map((id) => (
            <PersonRow key={id} id={id} presence={false} />
          ))}
        </Card>
      )}
    </SubPage>
  );
}

/** Шаг 2 канала: публичный (с адресом) или частный (только по ссылке) */
function ChannelType() {
  const draft = useDraft();
  const status = usernameStatus(draft.username);
  const ok = !draft.isPublic || status === 'free';
  return (
    <SubPage title="Тип канала" subtitle="Как люди смогут его найти" onBack={() => goBack('/new/channel')} footer={{ label: 'Далее', disabled: !ok, onClick: () => navigate('/new/channel/members') }}>
      <Card label="Тип канала">
        <Row
          tall
          icon={<IconLock />}
          title="Частный"
          note="Подписаться можно только по ссылке-приглашению"
          role="radio"
          checked={!draft.isPublic}
          end={<RadioDot on={!draft.isPublic} />}
          onClick={() => patchDraft({ isPublic: false })}
        />
        <Row
          tall
          icon={<IconGlobal />}
          title="Публичный"
          note="Его находят через поиск и открывают по адресу"
          role="radio"
          checked={draft.isPublic}
          end={<RadioDot on={draft.isPublic} />}
          onClick={() => patchDraft({ isPublic: true })}
        />
      </Card>
      {draft.isPublic ? (
        <Field
          label="Адрес канала"
          prefix="@"
          value={draft.username}
          onChange={(v) => patchDraft({ username: v.replace(/[\s@]/g, '') })}
          max={USERNAME_MAX}
          inputMode="url"
          placeholder="psy_channel"
          status={status === 'empty' ? null : { tone: status === 'free' ? 'ok' : 'error', text: USERNAME_TEXT[status] }}
          hint={status === 'empty' ? USERNAME_TEXT.empty : 'По этому адресу канал можно найти и открыть.'}
        />
      ) : (
        <Hint>Ссылку-приглашение вы получите, когда канал будет создан: её можно скопировать или отправить в чат.</Hint>
      )}
    </SubPage>
  );
}

/** Шаг 3 канала: добавить подписчиков (можно пропустить) и создать */
function ChannelMembers() {
  const contacts = useContacts();
  const draft = useDraft();
  const busy = useRef(false);
  const n = draft.members.length;
  const create = () => {
    if (busy.current) return;
    busy.current = true;
    const id = createGroup({ ...draft, kind: 'channel' });
    navigateOver(`/chat/${id}`, DEPTH['channel-members']);
  };
  return (
    <SubPage title="Подписчики" subtitle={n ? `Выбрано: ${n}` : 'Можно добавить позже'} onBack={() => goBack('/new/channel/type')} footer={{ label: n ? 'Создать' : 'Пропустить', onClick: create }}>
      <ContactPicker contacts={contacts} chosen={draft.members} onToggle={toggleDraftMember} empty="Подписчиков можно добавить и позже" />
    </SubPage>
  );
}
