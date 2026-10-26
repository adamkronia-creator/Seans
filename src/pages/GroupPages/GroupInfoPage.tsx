import { useState, type CSSProperties } from 'react';
import { IconBackMk } from '../../components/ChatItem/ChatIcons';
import { IconBellOff, IconBellOn } from '../../components/FolderMenu/FolderIcons';
import { HeaderButton, Card, PersonRow, Row } from '../../components/GroupUi/GroupUi';
import { IconCopyLine, IconInfo, IconLeave, IconLinkRound, IconPenNew, IconQr, IconTrashLine, IconUserCheck, IconUserPlus } from '../../components/GroupUi/GroupIcons';
import { LeaveSheet } from '../../components/GroupUi/GroupSheets';
import { targetOfLink, targetOfPublic, useLinkTools } from '../../components/GroupUi/LinkTools';
import { IconChatBubble } from '../ContactPage/ContactIcons';
import { Toast } from '../../components/Toast/Toast';
import { useToast } from '../../components/Toast/useToast';
import { setMutedMany, useChat } from '../../data/chatStore';
import { canChangeInfo, canInvite, can, countWord, leaveGroup, myMember, shortUrl, sortedMembers, subtitleOf, useGroup } from '../../data/groups';
import { goBack, goBackBy, navigate } from '../../router';
import { heroAvatar } from '../../utils/initialsAvatar';
import { useSwipeBack } from '../../utils/swipeBack';
import '../FolderPage/FolderPage.css';
import '../ContactPage/ContactPage.css';
import { gPath, rolePills, useMemberActions } from './shared';

/** Сколько участников видно на самой странице; остальных открывает «Показать всех» */
const PREVIEW = 5;

/**
 * Страница группы или канала (адрес /chat/<чат>/g): фото во всю ширину, как в профиле собеседника, название и число участников,
 * кнопки «Чат», «Звук» и «Ссылка», описание и адрес с QR-кодом, участники, заявки на вступление и выход. Справа в шапке карандаш:
 * «Управление» (профиль, тип, ссылки, администраторы, права, журнал) — у владельца и администраторов.
 */
export function GroupInfoPage({ chatId }: { chatId: string }) {
  const chat = useChat(chatId);
  const info = useGroup(chatId);
  const [toast, say] = useToast();
  const tools = useLinkTools(info, say);
  const people = useMemberActions(info, say);
  const [leaving, setLeaving] = useState(false);
  const back = () => goBack(`/chat/${chatId}`);
  useSwipeBack('.ct', !leaving && !tools.open && !people.active, back);
  if (!chat || !info) return <section className="fp ct" />;

  const channel = info.kind === 'channel';
  const me = myMember(info);
  const staff = me?.role === 'owner' || me?.role === 'admin';
  const manage = staff || canChangeInfo(info);
  const seeMembers = !channel || staff;
  const mayInvite = canInvite(info);
  const primary = info.links.find((l) => l.primary && !l.revoked);
  // Что показать как ссылку: публичный адрес, а у частной — основная ссылка-приглашение (тем, кому разрешено звать людей)
  const link = info.isPublic ? targetOfPublic(info) : mayInvite && primary ? targetOfLink(primary) : null;
  const members = sortedMembers(info);
  const shown = members.slice(0, PREVIEW);
  const word = channel ? 'подписчик' : 'участник';

  const tiles: Array<{ key: string; label: string; icon: JSX.Element; onClick: () => void; pressed?: boolean }> = [
    { key: 'chat', label: channel ? 'Канал' : 'Чат', icon: <IconChatBubble />, onClick: back },
    {
      key: 'mute',
      label: chat.muted ? 'Без звука' : 'Звук',
      icon: chat.muted ? <IconBellOff /> : <IconBellOn />,
      pressed: !chat.muted,
      onClick: () => {
        setMutedMany([chatId], !chat.muted);
        say(chat.muted ? 'Звук включён' : 'Звук отключён');
      },
    },
    ...(link ? [{ key: 'link', label: 'Ссылка', icon: <IconCopyLine />, onClick: () => tools.copy(link.url) }] : []),
  ];
  const leave = () => {
    setLeaving(false);
    // Страницу и чат под ней нужно пройти разом; из списка группа исчезает, когда экран уже уехал
    goBackBy(2);
    window.setTimeout(() => leaveGroup(chatId), 450);
  };

  return (
    <section className="fp ct gu-info">
      <header className="fp__header ct__bar">
        <button type="button" className="fp__back" aria-label="Назад" onClick={back}>
          <IconBackMk />
        </button>
        {manage && (
          <HeaderButton label="Управление" onClick={() => navigate(gPath(chatId, 'edit'))}>
            <IconPenNew />
          </HeaderButton>
        )}
      </header>

      <div className="fp__scroll ct__scroll">
        <div className="ct__hero">
          <div className="ct__photo">
            <img src={heroAvatar(info.avatar)} alt="" />
          </div>
          <div className="ct__id">
            <h1 className="ct__name">{info.name}</h1>
            <p className="ct__status">{subtitleOf(info)}</p>
          </div>
        </div>

        <div className="ct__body">
          <div className="ct__actions" role="group" aria-label="Действия" style={{ '--tiles': tiles.length } as CSSProperties}>
            {tiles.map((t) => (
              <button key={t.key} type="button" className="ct__action" aria-pressed={t.pressed} onClick={t.onClick}>
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {(info.description || link) && (
            <section className="fp__card ct__card" aria-label="О группе">
              <ul className="ct__rows">
                {info.description && (
                  <li>
                    <div className="ct__row">
                      <span className="ct__icon" aria-hidden="true">
                        <IconInfo />
                      </span>
                      <span className="ct__text">
                        <span className="ct__label">Описание</span>
                        <span className="ct__value gu-about">{info.description}</span>
                      </span>
                    </div>
                  </li>
                )}
                {link && (
                  <>
                    <li>
                      <button type="button" className="ct__row ct__row--tap" onClick={() => tools.copy(link.url)}>
                        <span className="ct__icon" aria-hidden="true">
                          <IconLinkRound />
                        </span>
                        <span className="ct__text">
                          <span className="ct__label">{info.isPublic ? 'Публичная ссылка' : 'Ссылка-приглашение'}</span>
                          <span className="ct__value">{shortUrl(link.url)}</span>
                        </span>
                        <span className="ct__row-icon">
                          <IconCopyLine />
                        </span>
                      </button>
                    </li>
                    <li>
                      <button type="button" className="ct__row ct__row--tap" onClick={() => tools.showQr(link.url, info.name)}>
                        <span className="ct__icon" aria-hidden="true">
                          <IconQr />
                        </span>
                        <span className="ct__text">
                          <span className="ct__label">QR-код</span>
                          <span className="ct__value">Показать для сканирования</span>
                        </span>
                      </button>
                    </li>
                  </>
                )}
              </ul>
            </section>
          )}

          {can(info, 'inviteUsers') && info.requests.length > 0 && (
            <Card>
              <Row icon={<IconUserCheck />} title="Заявки на вступление" value={String(info.requests.length)} chevron onClick={() => navigate(gPath(chatId, 'requests'))} />
            </Card>
          )}

          {seeMembers && (
            <Card heading={`${channel ? 'Подписчики' : 'Участники'}: ${info.members.length}`}>
              {mayInvite && <Row tone="link" icon={<IconUserPlus />} title={channel ? 'Добавить подписчиков' : 'Добавить участников'} onClick={() => navigate(gPath(chatId, 'add'))} />}
              {shown.map((m) => (
                <PersonRow key={m.id} id={m.id} pills={rolePills(m)} onClick={m.id === me?.id ? undefined : () => people.open(m.id)} />
              ))}
              {members.length > shown.length && (
                <Row title="Показать всех" value={String(members.length)} chevron onClick={() => navigate(gPath(chatId, 'members'))} />
              )}
            </Card>
          )}
          {!seeMembers && me && <p className="gu-hint gu-hint--alone">В канале {info.members.length} {countWord(info.kind, info.members.length)}. Список {word}ов видят только администраторы.</p>}

          <Card>
            <Row
              tone="danger"
              icon={me?.role === 'owner' ? <IconTrashLine /> : <IconLeave />}
              title={me?.role === 'owner' ? (channel ? 'Удалить канал' : 'Удалить группу') : channel ? 'Отписаться от канала' : 'Покинуть группу'}
              onClick={() => setLeaving(true)}
            />
          </Card>
        </div>
      </div>

      {leaving && <LeaveSheet group={info} onClose={() => setLeaving(false)} onConfirm={leave} />}
      {tools.node}
      {people.node}
      {toast && <Toast text={toast} />}
    </section>
  );
}
