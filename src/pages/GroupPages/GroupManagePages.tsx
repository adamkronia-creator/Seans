import { useState } from 'react';
import { ActionSheet, Card, CheckMark, Empty, Field, Hint, PersonAvatar, PersonRow, PhotoField, RadioDot, Row, SubPage, SwitchRow } from '../../components/GroupUi/GroupUi';
import {
  IconCheckMark,
  IconCloseLine,
  IconCopyLine,
  IconGlobal,
  IconHistory,
  IconKey,
  IconLinkRound,
  IconLock,
  IconShieldUser,
  IconSmile,
  IconTrashLine,
  IconUserBlock,
  IconUserCheck,
  IconUsersGroup,
} from '../../components/GroupUi/GroupIcons';
import { LeaveSheet } from '../../components/GroupUi/GroupSheets';
import { targetOfLink, useLinkTools } from '../../components/GroupUi/LinkTools';
import { useToast } from '../../components/Toast/useToast';
import { useChat } from '../../data/chatStore';
import { firstNameOf, gendered, nameOf } from '../../data/contacts';
import { whenText } from '../../data/groupFormat';
import {
  PERMISSION_LABELS,
  REACTION_CHOICES,
  SLOW_MODES,
  USERNAME_TEXT,
  approveAll,
  approveRequest,
  can,
  canChangeInfo,
  declineAll,
  declineRequest,
  isLinkAlive,
  leaveGroup,
  myRole,
  setPermissions,
  setSetting,
  setType,
  slowLabel,
  unban,
  updateInfo,
  usernameStatus,
  useGroup,
  type GroupInfo,
} from '../../data/groups';
import { goBack, goBackBy, navigate } from '../../router';
import { gPath, useMemberActions } from './shared';

/*
 * Страницы управления группой и каналом, кроме людей и ссылок: общий экран «Управление», тип и адрес, разрешения и медленный режим,
 * реакции, заблокированные, заявки на вступление и журнал действий. Переключатели действуют сразу, поля с текстом — по кнопке «Сохранить».
 */

const NAME_MAX = 64;
const ABOUT_MAX = 255;
const USERNAME_MAX = 32;

/** Свою фотографию отличает от нарисованной аватарки с инициалами адрес: нарисованная — SVG */
const hasPhoto = (g: GroupInfo) => !g.avatar.startsWith('data:image/svg+xml');

/** Страница, которой нужны чат и группа: пока их нет (экран уезжает после выхода), рисуется пустая рамка */
function useGroupOf(chatId: string) {
  return { chat: useChat(chatId), info: useGroup(chatId) };
}

// ---------------------------------------------------------------- Управление

/** Общий экран управления: профиль (фото, название, описание), настройки, люди, журнал и удаление */
export function GroupManagePage({ chatId }: { chatId: string }) {
  const { info } = useGroupOf(chatId);
  const [toast, say] = useToast();
  const [name, setName] = useState(info?.name ?? '');
  const [about, setAbout] = useState(info?.description ?? '');
  // undefined — фото не трогали, null — убрали, строка — новое
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [deleting, setDeleting] = useState(false);
  if (!info) return <SubPage title="Управление" onBack={() => goBack(gPath(chatId))}>{null}</SubPage>;

  const channel = info.kind === 'channel';
  const owner = myRole(info) === 'owner';
  const staff = myRole(info) !== 'member';
  // Профиль правят и участники, которым это разрешено; остальные настройки — владелец и администратор с нужным правом
  const editInfo = canChangeInfo(info);
  const adminInfo = can(info, 'changeInfo');
  const showLinks = can(info, 'inviteUsers');
  const showPerms = !channel && (owner || can(info, 'banUsers'));
  const hasSettings = owner || showLinks || adminInfo || showPerms;
  const hasToggles = owner || (channel && adminInfo);
  const shownPhoto = photo === undefined ? (hasPhoto(info) ? info.avatar : null) : photo;
  const dirty = name.trim() !== info.name || about.trim() !== info.description || photo !== undefined;
  const ready = name.trim() !== '' && dirty;
  const open = (sub: string) => navigate(gPath(chatId, sub));
  const alive = info.links.filter(isLinkAlive).length;
  const banned = info.banned.length;
  const admins = info.members.filter((m) => m.role !== 'member').length;
  const save = () => {
    updateInfo(chatId, { name, description: about, ...(photo !== undefined ? { photo } : {}) });
    goBack(gPath(chatId));
  };
  const reactionsText = info.reactions.length === 0 ? 'Выкл.' : info.reactions.length === REACTION_CHOICES.length ? 'Все' : String(info.reactions.length);

  return (
    <SubPage
      title={channel ? 'Управление каналом' : 'Управление группой'}
      subtitle={info.name}
      onBack={() => goBack(gPath(chatId))}
      toast={toast}
      footer={editInfo ? { label: 'Сохранить', disabled: !ready, onClick: save } : null}
    >
      {editInfo && (
        <>
          <PhotoField value={shownPhoto} name={name} seed={chatId} onChange={setPhoto} say={say} />
          <Field label={channel ? 'Название канала' : 'Название группы'} value={name} onChange={setName} max={NAME_MAX} />
          <Field label="Описание" value={about} onChange={setAbout} max={ABOUT_MAX} multiline placeholder="Необязательно" hint={channel ? 'О чём этот канал: увидят все, кто его откроет.' : 'О чём эта группа: увидят все участники.'} />
        </>
      )}

      {hasSettings && (
        <Card heading="Настройки">
          {owner && <Row icon={info.isPublic ? <IconGlobal /> : <IconLock />} title={channel ? 'Тип канала' : 'Тип группы'} value={info.isPublic ? 'Публичный' : 'Частный'} chevron onClick={() => open('type')} />}
          {showLinks && <Row icon={<IconLinkRound />} title="Ссылки-приглашения" value={String(alive)} chevron onClick={() => open('links')} />}
          {adminInfo && <Row icon={<IconSmile />} title="Реакции" value={reactionsText} chevron onClick={() => open('reactions')} />}
          {showPerms && <Row icon={<IconKey />} title="Разрешения" value={info.slowMode ? `Пауза ${slowLabel(info.slowMode)}` : undefined} chevron onClick={() => open('perms')} />}
        </Card>
      )}

      {hasToggles && (
        <Card hint={channel ? 'Под постами канала будет подпись автора. Защита содержимого запрещает пересылать и копировать публикации.' : 'Защита содержимого запрещает пересылать и копировать сообщения. История показывает новым участникам прежнюю переписку.'}>
          {channel && adminInfo && (
            <SwitchRow
              icon={<IconShieldUser />}
              title="Подписи авторов"
              note="Под постами будет имя автора"
              checked={info.signatures}
              onChange={(v) => {
                setSetting(chatId, { signatures: v });
                say(v ? 'Подписи включены' : 'Подписи выключены');
              }}
            />
          )}
          {owner && (
            <SwitchRow
              icon={<IconLock />}
              title="Защита содержимого"
              note="Запретить пересылать и копировать"
              checked={info.protectContent}
              onChange={(v) => {
                setSetting(chatId, { protectContent: v });
                say(v ? 'Защита включена' : 'Защита выключена');
              }}
            />
          )}
          {owner && !channel && (
            <SwitchRow
              icon={<IconHistory />}
              title="История для новых участников"
              note="Новые участники видят прежнюю переписку"
              checked={info.historyVisible}
              onChange={(v) => {
                setSetting(chatId, { historyVisible: v });
                say(v ? 'История открыта' : 'История скрыта');
              }}
            />
          )}
        </Card>
      )}

      {staff && (
        <>
          <Card heading="Люди">
            <Row icon={<IconShieldUser />} title="Администраторы" value={String(admins)} chevron onClick={() => open('admins')} />
            <Row icon={<IconUsersGroup />} title={channel ? 'Подписчики' : 'Участники'} value={String(info.members.length)} chevron onClick={() => open('members')} />
            {can(info, 'inviteUsers') && <Row icon={<IconUserCheck />} title="Заявки на вступление" value={info.requests.length ? String(info.requests.length) : undefined} chevron onClick={() => open('requests')} />}
            {can(info, 'banUsers') && <Row icon={<IconUserBlock />} title="Заблокированные" value={banned ? String(banned) : undefined} chevron onClick={() => open('banned')} />}
          </Card>

          <Card>
            <Row icon={<IconHistory />} title="Журнал действий" chevron onClick={() => open('log')} />
          </Card>
        </>
      )}

      {owner && (
        <Card>
          <Row tone="danger" icon={<IconTrashLine />} title={channel ? 'Удалить канал' : 'Удалить группу'} onClick={() => setDeleting(true)} />
        </Card>
      )}

      {deleting && (
        <LeaveSheet
          group={info}
          onClose={() => setDeleting(false)}
          onConfirm={() => {
            setDeleting(false);
            // Управление, страница группы и чат — за один шаг в список; из него группа исчезает, когда экран уже уехал
            goBackBy(3);
            window.setTimeout(() => leaveGroup(chatId), 450);
          }}
        />
      )}
    </SubPage>
  );
}

// ---------------------------------------------------------------- Тип и адрес

/** Тип: публичный (адрес @имя, находится поиском) или частный (только по ссылке); у публичной группы ещё вступление по заявкам */
export function GroupTypePage({ chatId }: { chatId: string }) {
  const { info } = useGroupOf(chatId);
  const [toast, say] = useToast();
  const [isPublic, setPublic] = useState(info?.isPublic ?? false);
  const [username, setUsername] = useState(info?.username ?? '');
  const [approval, setApproval] = useState(info?.joinApproval ?? false);
  const tools = useLinkTools(info, say);
  if (!info) return <SubPage title="Тип" onBack={() => goBack(gPath(chatId, 'edit'))}>{null}</SubPage>;

  const channel = info.kind === 'channel';
  const status = usernameStatus(username, chatId);
  const valid = !isPublic || status === 'free';
  const dirty = isPublic !== info.isPublic || (isPublic && username.trim() !== info.username) || (isPublic && !channel && approval !== info.joinApproval);
  const primary = info.links.find((l) => l.primary && !l.revoked);
  const save = () => {
    setType(chatId, isPublic, username);
    if (!channel) setSetting(chatId, { joinApproval: isPublic ? approval : false });
    goBack(gPath(chatId, 'edit'));
  };

  return (
    <SubPage
      title={channel ? 'Тип канала' : 'Тип группы'}
      subtitle="Как люди смогут вас найти"
      onBack={() => goBack(gPath(chatId, 'edit'))}
      toast={toast}
      swipe={!tools.open}
      footer={{ label: 'Сохранить', disabled: !dirty || !valid, onClick: save }}
    >
      <Card label="Тип">
        <Row tall icon={<IconLock />} title="Частный" note="Вступить можно только по ссылке-приглашению" role="radio" checked={!isPublic} end={<RadioDot on={!isPublic} />} onClick={() => setPublic(false)} />
        <Row tall icon={<IconGlobal />} title="Публичный" note="Находится поиском и открывается по адресу" role="radio" checked={isPublic} end={<RadioDot on={isPublic} />} onClick={() => setPublic(true)} />
      </Card>
      {isPublic ? (
        <>
          <Field
            label={channel ? 'Адрес канала' : 'Адрес группы'}
            prefix="@"
            value={username}
            onChange={(v) => setUsername(v.replace(/[\s@]/g, ''))}
            max={USERNAME_MAX}
            inputMode="url"
            placeholder="psy_group"
            status={status === 'empty' ? null : { tone: status === 'free' ? 'ok' : 'error', text: USERNAME_TEXT[status] }}
            hint={status === 'empty' ? USERNAME_TEXT.empty : 'По этому адресу можно найти и открыть ' + (channel ? 'канал.' : 'группу.')}
          />
          {!channel && (
            <Card hint="Новые участники вступают после вашего одобрения: заявки лежат в разделе «Заявки на вступление».">
              <SwitchRow icon={<IconUserCheck />} title="Вступление по заявкам" checked={approval} onChange={setApproval} />
            </Card>
          )}
        </>
      ) : (
        primary && (
          <Card hint="Любой, у кого есть эта ссылка, сможет вступить.">
            <Row icon={<IconLinkRound />} title="Ссылка-приглашение" note={targetOfLink(primary).url.replace(/^https?:\/\//, '')} end={<IconCopyLine />} onClick={() => tools.copy(targetOfLink(primary).url)} />
          </Card>
        )
      )}
      {tools.node}
    </SubPage>
  );
}

// ---------------------------------------------------------------- Разрешения и медленный режим

/** Что можно обычным участникам группы и медленный режим; ограниченные участники ниже, нажатие на них возвращает право писать */
export function GroupPermsPage({ chatId }: { chatId: string }) {
  const { info } = useGroupOf(chatId);
  const [toast, say] = useToast();
  const people = useMemberActions(info, say);
  if (!info) return <SubPage title="Разрешения" onBack={() => goBack(gPath(chatId, 'edit'))}>{null}</SubPage>;
  const silenced = info.members.filter((m) => m.silenced);
  return (
    <SubPage title="Разрешения" subtitle="Что можно участникам" onBack={() => goBack(gPath(chatId, 'edit'))} toast={toast} swipe={!people.active}>
      <Card heading="Участникам разрешено" hint="Администраторы могут всё, что им разрешено в правах администратора.">
        {PERMISSION_LABELS.map(({ key, label }) => (
          <SwitchRow key={key} title={label} checked={info.permissions[key]} onChange={(v) => setPermissions(chatId, { [key]: v })} />
        ))}
      </Card>
      <Card heading="Медленный режим" hint="Участники смогут отправлять одно сообщение за выбранное время. Администраторов это не касается.">
        {SLOW_MODES.map((s) => (
          <Row key={s} title={s === 0 ? 'Выключен' : `Пауза ${slowLabel(s)}`} role="radio" checked={info.slowMode === s} end={<RadioDot on={info.slowMode === s} />} onClick={() => setSetting(chatId, { slowMode: s })} />
        ))}
      </Card>
      {silenced.length > 0 && (
        <Card heading={`Нельзя писать: ${silenced.length}`} hint="Нажмите на человека, чтобы вернуть ему право писать.">
          {silenced.map((m) => (
            <PersonRow key={m.id} id={m.id} onClick={() => people.open(m.id)} />
          ))}
        </Card>
      )}
      {people.node}
    </SubPage>
  );
}

// ---------------------------------------------------------------- Реакции

const REACTION_NAMES: Record<string, string> = { '❤️': 'Сердце', '👍': 'Нравится', '👎': 'Не нравится', '🔥': 'Огонь', '🥰': 'Влюблённость', '👏': 'Аплодисменты', '😁': 'Смех' };

/** Какие реакции можно ставить на сообщения: все, выбранные или никакие */
export function GroupReactionsPage({ chatId }: { chatId: string }) {
  const { info } = useGroupOf(chatId);
  const [toast, say] = useToast();
  if (!info) return <SubPage title="Реакции" onBack={() => goBack(gPath(chatId, 'edit'))}>{null}</SubPage>;
  const on = info.reactions.length > 0;
  const toggle = (emoji: string) => {
    const has = info.reactions.includes(emoji);
    if (has && info.reactions.length === 1) {
      say('Оставьте хотя бы одну реакцию или выключите реакции');
      return;
    }
    setSetting(chatId, { reactions: REACTION_CHOICES.filter((e) => (e === emoji ? !has : info.reactions.includes(e))) });
  };
  return (
    <SubPage title="Реакции" subtitle={info.kind === 'channel' ? 'Под постами канала' : 'Под сообщениями группы'} onBack={() => goBack(gPath(chatId, 'edit'))} toast={toast}>
      <Card hint="Реакции можно ставить на сообщения. Участники выбирают только из разрешённых.">
        <SwitchRow icon={<IconSmile />} title="Реакции" checked={on} onChange={(v) => setSetting(chatId, { reactions: v ? [...REACTION_CHOICES] : [] })} />
      </Card>
      {on && (
        <Card heading="Разрешённые реакции">
          {REACTION_CHOICES.map((emoji) => {
            const checked = info.reactions.includes(emoji);
            return (
              <Row
                key={emoji}
                tall
                role="checkbox"
                checked={checked}
                ariaLabel={`${REACTION_NAMES[emoji] ?? emoji}: ${checked ? 'разрешена' : 'запрещена'}`}
                lead={
                  <>
                    <CheckMark on={checked} />
                    <span className="gu-emoji" aria-hidden="true">
                      {emoji}
                    </span>
                  </>
                }
                title={REACTION_NAMES[emoji] ?? emoji}
                onClick={() => toggle(emoji)}
              />
            );
          })}
        </Card>
      )}
    </SubPage>
  );
}

// ---------------------------------------------------------------- Заблокированные

/** Заблокированные: вернуться по ссылке не могут; нажатие на человека разблокирует его */
export function GroupBannedPage({ chatId }: { chatId: string }) {
  const { info } = useGroupOf(chatId);
  const [toast, say] = useToast();
  const [who, setWho] = useState<string | null>(null);
  if (!info) return <SubPage title="Заблокированные" onBack={() => goBack(gPath(chatId, 'edit'))}>{null}</SubPage>;
  return (
    <SubPage title="Заблокированные" subtitle={info.banned.length ? `Заблокировано: ${info.banned.length}` : undefined} onBack={() => goBack(gPath(chatId, 'edit'))} toast={toast} swipe={who === null}>
      {info.banned.length === 0 ? (
        <Card hint={`Заблокированные не могут вернуться в ${info.kind === 'channel' ? 'канал' : 'группу'} по ссылке. Заблокировать можно человека из списка ${info.kind === 'channel' ? 'подписчиков' : 'участников'}.`}>
          <Empty>Заблокированных нет</Empty>
        </Card>
      ) : (
        <Card heading={`Заблокировано: ${info.banned.length}`} hint="Нажмите на человека, чтобы разблокировать.">
          {info.banned.map((id) => (
            <PersonRow key={id} id={id} presence={false} note="Заблокирован" onClick={() => setWho(id)} />
          ))}
        </Card>
      )}
      {who && (
        <ActionSheet
          title={nameOf(who)}
          subtitle="Заблокирован"
          onClose={() => setWho(null)}
          actions={[
            {
              key: 'unban',
              label: 'Разблокировать',
              note: 'Сможет вернуться по ссылке',
              Icon: IconUserCheck,
              run: () => {
                unban(chatId, who);
                say(`${firstNameOf(who)} ${gendered(who, 'разблокирован', 'разблокирована')}`);
              },
            },
          ]}
        />
      )}
    </SubPage>
  );
}

// ---------------------------------------------------------------- Заявки на вступление

/** Заявки на вступление: принять или отклонить каждую, а при нескольких — сразу все */
export function GroupRequestsPage({ chatId }: { chatId: string }) {
  const { info } = useGroupOf(chatId);
  const [toast, say] = useToast();
  if (!info) return <SubPage title="Заявки" onBack={() => goBack(gPath(chatId, 'edit'))}>{null}</SubPage>;
  const channel = info.kind === 'channel';
  const noteOf = (r: GroupInfo['requests'][number]) => {
    const via = r.linkId ? info.links.find((l) => l.id === r.linkId) : undefined;
    return `${whenText(r.at)}${via ? `, по ссылке${via.name ? ` «${via.name}»` : ''}` : ''}`;
  };
  return (
    <SubPage title="Заявки на вступление" subtitle={info.requests.length ? `Заявок: ${info.requests.length}` : undefined} onBack={() => goBack(gPath(chatId, 'edit'))} toast={toast}>
      {info.requests.length === 0 ? (
        <Card hint={`Когда в ${channel ? 'канале' : 'группе'} включено вступление по заявкам (у публичного адреса или у ссылки-приглашения), заявки появятся здесь.`}>
          <Empty>Заявок нет</Empty>
        </Card>
      ) : (
        <>
          {info.requests.length > 1 && (
            <Card>
              <Row
                tone="link"
                icon={<IconCheckMark />}
                title="Принять всех"
                onClick={() => {
                  const n = info.requests.length;
                  approveAll(chatId);
                  say(`Принято: ${n}`);
                }}
              />
              <Row
                tone="danger"
                icon={<IconCloseLine />}
                title="Отклонить всех"
                onClick={() => {
                  const n = info.requests.length;
                  declineAll(chatId);
                  say(`Отклонено: ${n}`);
                }}
              />
            </Card>
          )}
          <Card heading={`Заявки: ${info.requests.length}`}>
            {info.requests.map((r) => (
              <PersonRow
                key={r.id}
                id={r.contactId}
                presence={false}
                note={noteOf(r)}
                end={
                  <span className="gu-ibtns">
                    <button
                      type="button"
                      className="gu-ibtn gu-ibtn--no"
                      aria-label={`Отклонить: ${nameOf(r.contactId)}`}
                      onClick={() => {
                        declineRequest(chatId, r.id);
                        say(`Заявка отклонена: ${firstNameOf(r.contactId)}`);
                      }}
                    >
                      <IconCloseLine />
                    </button>
                    <button
                      type="button"
                      className="gu-ibtn gu-ibtn--ok"
                      aria-label={`Принять: ${nameOf(r.contactId)}`}
                      onClick={() => {
                        approveRequest(chatId, r.id);
                        say(`${firstNameOf(r.contactId)} ${gendered(r.contactId, 'принят', 'принята')} в ${channel ? 'канал' : 'группу'}`);
                      }}
                    >
                      <IconCheckMark />
                    </button>
                  </span>
                }
              />
            ))}
          </Card>
        </>
      )}
    </SubPage>
  );
}

// ---------------------------------------------------------------- Журнал действий

/** Журнал: кто и что менял в группе или канале, свежее выше (хранится последние 200 записей) */
export function GroupLogPage({ chatId }: { chatId: string }) {
  const { info } = useGroupOf(chatId);
  if (!info) return <SubPage title="Журнал действий" onBack={() => goBack(gPath(chatId, 'edit'))}>{null}</SubPage>;
  return (
    <SubPage title="Журнал действий" subtitle={info.name} onBack={() => goBack(gPath(chatId, 'edit'))}>
      {info.log.length === 0 ? (
        <Card>
          <Empty>Действий пока нет</Empty>
        </Card>
      ) : (
        <Card heading={`Записей: ${info.log.length}`}>
          {info.log.map((e) => (
            <Row key={e.id} top lead={<PersonAvatar id={e.actor} size={36} presence={false} />} title={e.text} note={whenText(e.at)} />
          ))}
        </Card>
      )}
      <Hint>В журнале хранятся последние 200 действий администраторов.</Hint>
    </SubPage>
  );
}
