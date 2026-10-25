import { useMemo, useState } from 'react';
import { ContactSheetsHost } from './ContactSheetsHost';
import { ChipMenu, type ChipMenuItem } from '../../components/FolderMenu/ChipMenu';
import { IconArchive, IconBellOff, IconBellOn, IconPinned, IconUnarchive } from '../../components/FolderMenu/FolderIcons';
import { IconBackMk } from '../../components/ChatItem/ChatIcons';
import { Toast } from '../../components/Toast/Toast';
import { useToast } from '../../components/Toast/useToast';
import { linksIn, SHARED_FILES, SHARED_LINKS, SHARED_MEDIA } from '../../data/contactShared';
import { useStoryAuthors } from '../../data/stories';
import { setArchived, setBlockedMany, setMutedMany, setPinnedMany, setSubscribed, useChats, useMessages } from '../../data/chatStore';
import { countOf, useClientData } from '../../data/clientStore';
import { roleOf } from '../../data/roles';
import { goBack, navigate } from '../../router';
import { useSwipeBack } from '../../utils/swipeBack';
import {
  IconBlock,
  IconChatBubble,
  IconCopyLine,
  IconDotsV,
  IconEraser,
  IconFlag,
  IconGift,
  IconPencilLine,
  IconShare,
  IconTag,
  IconTrashLine,
  IconUser,
  IconUserCheck,
  IconUserPlus,
} from './ContactIcons';
import { ContactTabs } from './ContactTabs';
import '../FolderPage/FolderPage.css';
import './ContactPage.css';

export type ContactSheet = 'edit' | 'role' | 'gift' | 'report' | 'delete' | 'clear' | 'block';

/**
 * Профиль собеседника (адрес /chat/<чат>/contact): фото во всю ширину, которое внизу растворяется в фоне (светлом или тёмном по цвету текста), имя, роль, кнопки «Чат», «Звук», «Роль», «Поделиться»,
 * данные контакта и итоги по материалам. В шапке «назад» и «⋯»: меню из четырёх групп (контакт; подписка, роль, подарок;
 * закрепить, архив, очистить; заблокировать, пожаловаться). Роль можно выбрать чипсом или написать свою.
 */
export function ContactPage({ chatId }: { chatId: string }) {
  const chat = useChats().find((c) => c.id === chatId);
  const clientData = useClientData();
  const [toast, say] = useToast();
  const [menu, setMenu] = useState<{ rect: DOMRect; opener: HTMLElement } | null>(null);
  const [sheet, setSheet] = useState<ContactSheet | null>(null);
  // Экран профиля: на нём лежит просмотр историй
  const [screen, setScreen] = useState<HTMLElement | null>(null);
  const groups = useMessages(chatId);
  const stories = useStoryAuthors().find((a) => a.id === chatId)?.stories ?? [];
  const links = useMemo(() => [...linksIn(groups), ...(SHARED_LINKS[chatId] ?? [])], [groups, chatId]);
  const back = () => goBack(`/chat/${chatId}`);
  useSwipeBack('.ct', menu === null && sheet === null, back);

  const materials = useMemo(
    () => (chatId === 'maxim' ? [['Сеансы', countOf(clientData, 'session')], ['Тесты', countOf(clientData, 'test')], ['Задания', countOf(clientData, 'task')]] as const : null),
    [chatId, clientData],
  );

  if (!chat) return <section className="fp ct" />;

  const copy = (text: string, done: string) => {
    void navigator.clipboard?.writeText(text).then(() => say(done), () => say('Не удалось скопировать'));
  };
  const share = () => {
    const text = [chat.name, roleOf(chat), chat.phone, chat.username].filter(Boolean).join('\n');
    if (navigator.share) void navigator.share({ title: chat.name, text }).catch(() => undefined);
    else copy(text, 'Контакт скопирован');
  };
  const toggleMute = () => {
    setMutedMany([chat.id], !chat.muted);
    say(chat.muted ? 'Уведомления включены' : 'Уведомления выключены');
  };

  const items: ChipMenuItem[] = [
    { key: 'c-edit', label: 'Изменить контакт', Icon: IconPencilLine, run: () => setSheet('edit') },
    { key: 'c-share', label: 'Поделиться контактом', Icon: IconShare, run: share },
    { key: 'c-delete', label: 'Удалить контакт', Icon: IconTrashLine, danger: true, run: () => setSheet('delete') },
    {
      key: 'c-sub',
      label: chat.subscribed ? 'Отписаться' : 'Подписаться',
      Icon: chat.subscribed ? IconUserCheck : IconUserPlus,
      gap: true,
      run: () => {
        setSubscribed(chat.id, !chat.subscribed);
        say(chat.subscribed ? 'Вы отписались от событий контакта' : 'Вы подписаны на события контакта');
      },
    },
    { key: 'c-role', label: 'Поменять роль', Icon: IconTag, run: () => setSheet('role') },
    { key: 'c-gift', label: 'Отправить подарок', Icon: IconGift, run: () => setSheet('gift') },
    {
      key: 'c-pin',
      label: chat.pinned ? 'Открепить' : 'Закрепить',
      Icon: IconPinned,
      gap: true,
      run: () => {
        setPinnedMany([chat.id], !chat.pinned);
        say(chat.pinned ? 'Чат откреплён' : 'Чат закреплён');
      },
    },
    {
      key: 'c-archive',
      label: chat.archived ? 'Вернуть из архива' : 'Архивировать',
      Icon: chat.archived ? IconUnarchive : IconArchive,
      run: () => {
        setArchived(chat.id, !chat.archived);
        say(chat.archived ? 'Чат возвращён из архива' : 'Чат в архиве');
      },
    },
    { key: 'c-clear', label: 'Очистить историю', Icon: IconEraser, run: () => setSheet('clear') },
    {
      key: 'c-block',
      label: chat.blocked ? 'Разблокировать' : 'Заблокировать',
      Icon: IconBlock,
      gap: true,
      danger: true,
      run: () => {
        if (chat.blocked) {
          setBlockedMany([chat.id], false);
          say('Собеседник разблокирован');
        } else setSheet('block');
      },
    },
    { key: 'c-report', label: 'Пожаловаться', Icon: IconFlag, danger: true, run: () => setSheet('report') },
  ];

  const rows: { key: string; value: string; label: string; onClick?: () => void; icon?: JSX.Element }[] = [
    chat.phone ? { key: 'phone', value: chat.phone, label: 'Телефон', onClick: () => copy(chat.phone!, 'Номер скопирован'), icon: <IconCopyLine /> } : null,
    chat.about ? { key: 'about', value: chat.about, label: 'О себе' } : null,
    chat.username ? { key: 'user', value: chat.username, label: 'Имя пользователя', onClick: () => copy(chat.username!, 'Имя скопировано'), icon: <IconCopyLine /> } : null,
    chat.birthday ? { key: 'birth', value: chat.birthday, label: 'День рождения' } : null,
    { key: 'role', value: roleOf(chat), label: 'Роль', onClick: () => setSheet('role'), icon: <IconTag /> },
  ].filter((r): r is NonNullable<typeof r> => r !== null);

  return (
    <section ref={setScreen} className="fp ct">
      {/* «Назад» и «⋯» справа, как в шапке открытого чата */}
      <header className="fp__header ct__bar">
        <button type="button" className="fp__back" aria-label="Назад" onClick={back}>
          <IconBackMk />
        </button>
        <button
          type="button"
          className="fp__back"
          aria-label="Меню контакта"
          aria-haspopup="menu"
          aria-expanded={menu !== null}
          onClick={(e) => setMenu({ rect: e.currentTarget.getBoundingClientRect(), opener: e.currentTarget })}
        >
          <IconDotsV />
        </button>
      </header>

      <div className="fp__scroll ct__scroll">
        <div className="ct__hero">
          <div className="ct__photo">
            {chat.avatar ? <img src={chat.avatar} alt="" /> : <span className="ct__photo-empty" />}
          </div>
          <div className="ct__id">
            <h1 className="ct__name">{chat.name}</h1>
            <p className="ct__status">
              {roleOf(chat)} · {chat.online ? 'в сети' : 'был(а) недавно'}
            </p>
          </div>
        </div>

        <div className="ct__body">
          <div className="ct__actions" role="group" aria-label="Действия">
            <button type="button" className="ct__action" onClick={back}>
              <IconChatBubble />
              Чат
            </button>
            <button type="button" className="ct__action" onClick={() => navigate(`/chat/${chatId}/profile`)}>
              <IconUser />
              Профиль
            </button>
            <button type="button" className="ct__action" aria-pressed={!chat.muted} onClick={toggleMute}>
              {chat.muted ? <IconBellOff /> : <IconBellOn />}
              {chat.muted ? 'Без звука' : 'Звук'}
            </button>
            <button type="button" className="ct__action" onClick={() => setSheet('role')}>
              <IconTag />
              Роль
            </button>
          </div>

          <section className="fp__card ct__card" aria-label="Контакт">
            <ul className="ct__rows">
              {rows.map((row) => {
                const body = (
                  <>
                    <span className="ct__value">{row.value}</span>
                    <span className="ct__label">{row.label}</span>
                    {row.icon && <span className="ct__row-icon">{row.icon}</span>}
                  </>
                );
                return (
                  <li key={row.key}>
                    {row.onClick ? (
                      <button type="button" className="ct__row ct__row--tap" onClick={row.onClick}>
                        {body}
                      </button>
                    ) : (
                      <div className="ct__row">{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {materials && (
            <section className="fp__card ct__card" aria-label="Материалы">
              <ul className="ct__stats">
                {materials.map(([label, n]) => (
                  <li key={label} className="ct__stat">
                    <strong>{n}</strong>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <ContactTabs author={{ id: chat.id, name: chat.name, avatar: chat.avatar }} root={screen} stories={stories} media={SHARED_MEDIA[chatId] ?? []} files={SHARED_FILES[chatId] ?? []} links={links} onCopy={copy} />
        </div>
      </div>

      {menu && <ChipMenu anchor={menu.rect} opener={menu.opener} items={items} label="Меню контакта" width={272} onClose={() => setMenu(null)} />}
      <ContactSheetsHost chat={chat} sheet={sheet} onClose={() => setSheet(null)} say={say} />
      {toast && <Toast text={toast} />}
    </section>
  );
}
