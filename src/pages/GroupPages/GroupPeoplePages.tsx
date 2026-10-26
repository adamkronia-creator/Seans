import { useState } from 'react';
import { Card, ContactPicker, Empty, Field, Hint, PersonRow, Row, SubPage, SwitchRow } from '../../components/GroupUi/GroupUi';
import { IconLinkRound, IconShieldKey, IconUserCross, IconUserPlus } from '../../components/GroupUi/GroupIcons';
import { SearchField } from '../../components/SearchField/SearchField';
import { RemoveSheet } from '../../components/Profile/ProfileSheets';
import { useToast } from '../../components/Toast/useToast';
import { CONTACTS, ME, firstNameOf, nameOf } from '../../data/contacts';
import {
  RIGHT_LABELS,
  addMembers,
  can,
  canInvite,
  countText,
  defaultRights,
  memberOf,
  setAdmin,
  sortedMembers,
  useGroup,
  type AdminRights,
} from '../../data/groups';
import { goBack, navigate, navigateOver } from '../../router';
import { gPath, rolePills, roleName, useMemberActions } from './shared';

/*
 * Люди в группе и канале: список участников (поиск, действия над человеком), добавление, администраторы и права администратора.
 */

/** Совпадает ли имя с запросом */
const matches = (name: string, query: string) => !query.trim() || name.toLowerCase().includes(query.trim().toLowerCase());

// ---------------------------------------------------------------- Участники

/** Участники или подписчики: владелец и администраторы сверху, потом остальные (в сети выше); нажатие открывает действия над человеком */
export function GroupMembersPage({ chatId }: { chatId: string }) {
  const info = useGroup(chatId);
  const [toast, say] = useToast();
  const people = useMemberActions(info, say);
  const [query, setQuery] = useState('');
  const back = () => goBack(gPath(chatId));
  if (!info) return <SubPage title="Участники" onBack={back}>{null}</SubPage>;
  const channel = info.kind === 'channel';
  const list = sortedMembers(info).filter((m) => matches(nameOf(m.id), query) || (m.id === ME && matches('вы', query)));
  return (
    <SubPage title={channel ? 'Подписчики' : 'Участники'} subtitle={countText(info)} onBack={back} toast={toast} swipe={!people.active}>
      <div className="gu-search">
        <SearchField value={query} onChange={setQuery} placeholder={channel ? 'Поиск подписчиков' : 'Поиск участников'} onClear={() => setQuery('')} />
      </div>
      {canInvite(info) && !query.trim() && (
        <Card>
          <Row tone="link" icon={<IconUserPlus />} title={channel ? 'Добавить подписчиков' : 'Добавить участников'} onClick={() => navigate(gPath(chatId, 'add'))} />
        </Card>
      )}
      {list.length === 0 ? (
        <Card>
          <Empty>Никого не нашли</Empty>
        </Card>
      ) : (
        <Card>
          {list.map((m) => (
            <PersonRow key={m.id} id={m.id} pills={rolePills(m)} note={m.silenced ? 'Нельзя писать' : undefined} onClick={m.id === ME ? undefined : () => people.open(m.id)} />
          ))}
        </Card>
      )}
      <Hint>Нажмите на человека, чтобы написать ему, назначить администратором или убрать из {channel ? 'канала' : 'группы'}.</Hint>
      {people.node}
    </SubPage>
  );
}

// ---------------------------------------------------------------- Добавление

/** Добавить людей из контактов: поиск, выбранные чипсами, внизу кнопка «Добавить» */
export function GroupAddMembersPage({ chatId }: { chatId: string }) {
  const info = useGroup(chatId);
  const [picked, setPicked] = useState<string[]>([]);
  const back = () => goBack(gPath(chatId));
  if (!info) return <SubPage title="Добавить" onBack={back}>{null}</SubPage>;
  const channel = info.kind === 'channel';
  const candidates = CONTACTS.filter((c) => !memberOf(info, c.id) && !info.banned.includes(c.id));
  const toggle = (id: string) => setPicked((now) => (now.includes(id) ? now.filter((x) => x !== id) : [...now, id]));
  return (
    <SubPage
      title={channel ? 'Добавить подписчиков' : 'Добавить участников'}
      subtitle={picked.length ? `Выбрано: ${picked.length}` : undefined}
      onBack={back}
      footer={{
        label: picked.length ? `Добавить: ${picked.length}` : 'Добавить',
        disabled: picked.length === 0,
        onClick: () => {
          addMembers(chatId, picked);
          back();
        },
      }}
    >
      {can(info, 'inviteUsers') && (
        <Card>
          <Row tone="link" icon={<IconLinkRound />} title="Пригласить по ссылке" note="Ссылку можно скопировать или отправить в чат" chevron onClick={() => navigate(gPath(chatId, 'links'))} />
        </Card>
      )}
      <ContactPicker contacts={candidates} chosen={picked} onToggle={toggle} none="Все ваши контакты уже здесь." empty="Отметьте людей в списке ниже" />
    </SubPage>
  );
}

// ---------------------------------------------------------------- Администраторы

/** Администраторы: владелец и назначенные; нажатие открывает права, кнопка сверху ведёт к выбору нового */
export function GroupAdminsPage({ chatId }: { chatId: string }) {
  const info = useGroup(chatId);
  const back = () => goBack(gPath(chatId, 'edit'));
  if (!info) return <SubPage title="Администраторы" onBack={back}>{null}</SubPage>;
  const channel = info.kind === 'channel';
  const staff = sortedMembers(info).filter((m) => m.role !== 'member');
  const mayAdd = can(info, 'addAdmins');
  return (
    <SubPage title="Администраторы" subtitle={`Администраторов: ${staff.length}`} onBack={back}>
      {mayAdd && (
        <Card>
          <Row tone="link" icon={<IconShieldKey />} title="Добавить администратора" onClick={() => navigate(gPath(chatId, 'admin/new'))} />
        </Card>
      )}
      <Card>
        {staff.map((m) => (
          <PersonRow
            key={m.id}
            id={m.id}
            note={m.role === 'owner' ? 'Создатель' : m.title ? `Администратор, ${m.title}` : 'Администратор'}
            pills={rolePills(m)}
            chevron={mayAdd && m.role === 'admin'}
            onClick={mayAdd && m.role === 'admin' ? () => navigate(gPath(chatId, `admin/${m.id}`)) : undefined}
          />
        ))}
      </Card>
      <Hint>
        Администраторы помогают вести {channel ? 'канал' : 'группу'} в рамках выданных прав. Владельца нельзя убрать, а права других администраторов можно менять.
      </Hint>
    </SubPage>
  );
}

/** Выбор человека, которого назначают администратором: любой из участников, кто ещё не администратор */
export function GroupAdminPickPage({ chatId }: { chatId: string }) {
  const info = useGroup(chatId);
  const [query, setQuery] = useState('');
  const back = () => goBack(gPath(chatId, 'admins'));
  if (!info) return <SubPage title="Новый администратор" onBack={back}>{null}</SubPage>;
  const candidates = sortedMembers(info).filter((m) => m.role === 'member' && matches(nameOf(m.id), query));
  return (
    <SubPage title="Новый администратор" subtitle="Выберите человека" onBack={back}>
      <div className="gu-search">
        <SearchField value={query} onChange={setQuery} placeholder="Поиск" onClear={() => setQuery('')} />
      </div>
      {candidates.length === 0 ? (
        <Card>
          <Empty>{query.trim() ? 'Никого не нашли' : `Сначала добавьте ${info.kind === 'channel' ? 'подписчиков' : 'участников'}`}</Empty>
        </Card>
      ) : (
        <Card>
          {candidates.map((m) => (
            // Экран выбора уходит из истории: «назад» с прав ведёт в список администраторов
            <PersonRow key={m.id} id={m.id} chevron onClick={() => navigateOver(gPath(chatId, `admin/${m.id}`), 1, 'forward', gPath(chatId, 'admins'))} />
          ))}
        </Card>
      )}
    </SubPage>
  );
}

/** Права администратора: что ему разрешено, подпись рядом с именем, «Назначить» или «Сохранить» и «Снять администратора» */
export function GroupAdminRightsPage({ chatId, memberId }: { chatId: string; memberId: string }) {
  const info = useGroup(chatId);
  const target = info ? memberOf(info, memberId) : undefined;
  const [rights, setRights] = useState<AdminRights>(() => target?.rights ?? defaultRights(info?.kind ?? 'group'));
  const [title, setTitle] = useState(target?.title ?? '');
  const [dismissing, setDismissing] = useState(false);
  const back = () => goBack(gPath(chatId, 'admins'));
  if (!info || !target || target.role === 'owner') return <SubPage title="Права администратора" onBack={back}>{null}</SubPage>;
  const channel = info.kind === 'channel';
  const isAdmin = target.role === 'admin';
  const editable = can(info, 'addAdmins');
  const save = () => {
    setAdmin(chatId, memberId, rights, channel ? '' : title);
    back();
  };
  return (
    <SubPage
      title={isAdmin ? 'Права администратора' : 'Новый администратор'}
      subtitle={firstNameOf(memberId)}
      onBack={back}
      swipe={!dismissing}
      footer={editable ? { label: isAdmin ? 'Сохранить' : 'Назначить', onClick: save } : null}
    >
      <Card>
        <PersonRow id={memberId} presence={false} note={roleName(target, info)} />
      </Card>
      <Card heading="Что может администратор" hint={editable ? undefined : 'Права меняет владелец или администратор с правом назначать других.'}>
        {RIGHT_LABELS[info.kind].map(({ key, label }) => (
          <SwitchRow key={key} title={label} checked={rights[key]} disabled={!editable} onChange={(v) => setRights((now) => ({ ...now, [key]: v }))} />
        ))}
      </Card>
      {!channel && (
        <Field
          label="Подпись администратора"
          value={title}
          onChange={setTitle}
          max={16}
          placeholder="Например, Куратор"
          hint="Видна рядом с именем администратора в сообщениях группы."
        />
      )}
      {isAdmin && editable && (
        <Card>
          <Row tone="danger" icon={<IconUserCross />} title="Снять администратора" onClick={() => setDismissing(true)} />
        </Card>
      )}
      {dismissing && (
        <RemoveSheet
          title="Снять администратора?"
          text={`${nameOf(memberId)} станет обычным ${channel ? 'подписчиком' : 'участником'} и потеряет права администратора.`}
          confirm="Снять"
          onClose={() => setDismissing(false)}
          onConfirm={() => {
            setDismissing(false);
            setAdmin(chatId, memberId, null);
            back();
          }}
        />
      )}
    </SubPage>
  );
}
