import { IconBackMk } from '../../components/ChatItem/ChatIcons';
import { Avatar } from '../../components/Avatar/Avatar';
import { EmblemChips } from '../../components/Emblem/Emblem';
import { IconPin } from '../../components/icons';
import { IconChatBubble } from '../ContactPage/ContactIcons';
import { ensureChat, useChats } from '../../data/chatStore';
import { SHARED_MEDIA } from '../../data/contactShared';
import { useGroupsState, useStatus } from '../../data/groupStore';
import { personOf, profileOf } from '../../data/people';
import { useRoleLine } from '../../data/roleStore';
import { statusLine } from '../../data/status';
import { goBack } from '../../router';
import { openChatAnywhere } from '../../utils/tabNav';
import { useSwipeBack } from '../../utils/swipeBack';
import '../ProfilePage/ProfilePage.css';
import './PersonProfilePage.css';

interface PersonProfilePageProps {
  /** Чат собеседника или человек из каталога специалистов */
  personId: string;
  /** Куда вести «назад», если экран открыт по прямой ссылке */
  backTo: string;
  /** Кнопка «Написать»: нужна, когда страница открыта не из чата с этим человеком (из группы, поиска) */
  write?: boolean;
}

/**
 * Профиль человека: та же страница, что «Профиль» у специалиста (обложка, фото, имя, подпись, сводка, информация и фото), только для просмотра.
 * Адреса: /chat/<чат>/profile (кнопка «Профиль» в карточке контакта) и /person/<человек> (из списка участников группы и из поиска).
 * Под именем: статус доступности и значки групп, в которых человек состоит и разрешил их показывать.
 */
export function PersonProfilePage({ personId, backTo, write = false }: PersonProfilePageProps) {
  const chats = useChats();
  const person = personOf(personId, chats);
  const roleLine = useRoleLine(personId);
  const status = useStatus(personId);
  const { members } = useGroupsState();
  const back = () => goBack(backTo);
  useSwipeBack('.profile', true, back);
  if (!person) return <section className="profile" />;

  const info = profileOf(personId);
  const chat = chats.find((c) => c.id === personId);
  const headline = info?.headline ?? (chat ? roleLine : '');
  const photos = SHARED_MEDIA[personId] ?? [];
  // «Группы» в сводке считаются по живым данным: сколько групп человек разрешил показывать в списках
  const groups = members.filter((m) => m.personId === personId && m.listed).length;
  const stats = info?.stats.map(([n, label]) => [label === 'Группы' ? groups : n, label] as const);

  const writeTo = () => {
    ensureChat({ id: person.id, name: person.name, avatar: person.avatar });
    openChatAnywhere(person.id);
  };

  return (
    <section className="profile person">
      <button type="button" className="person__back" aria-label="Назад" onClick={back}>
        <IconBackMk />
      </button>
      <div className="profile__scroll">
        <div className="profile__top">
          <div className="profile__cover">{person.avatar && <img className="profile__cover-img person__cover" src={person.avatar} alt="" />}</div>
          <div className="profile__head">
            <div className="profile__row">
              <div className="profile__avatar">
                <span className="profile__avatar-hit">
                  <Avatar src={person.avatar} name={person.name} size={88} />
                </span>
              </div>
              {write && (
                <button type="button" className="profile__edit" onClick={writeTo}>
                  <IconChatBubble />
                  Написать
                </button>
              )}
            </div>

            <h1 className="profile__name">{person.name}</h1>
            {headline && <p className="profile__headline">{headline}</p>}
            {info?.city && (
              <p className="profile__city">
                <IconPin />
                {info.city}
              </p>
            )}
            {status && <p className="profile__status">{statusLine(status)}</p>}
            <EmblemChips personId={personId} className="profile__emblems" />

            {stats && (
              <ul className="profile__stats" aria-label="Сводка">
                {stats.map(([n, label]) => (
                  <li key={label} className="profile__stat">
                    <strong>{n}</strong>
                    <span>{label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <section className="profile__card" aria-labelledby="person-info">
          <header className="profile__card-head">
            <h2 id="person-info" className="profile__card-title">
              Личная информация
            </h2>
          </header>
          {info && info.fields.length > 0 ? (
            <ul className="profile__fields">
              {info.fields.map((field) => (
                <li key={field.label}>
                  <div className="profile__field person__field">
                    <span className="profile__field-label">{field.label}</span>
                    <span className="profile__field-value">{field.value}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="profile__empty">Человек пока ничего не рассказал о себе.</p>
          )}
        </section>

        <section className="profile__card" aria-labelledby="person-photos">
          <header className="profile__card-head">
            <h2 id="person-photos" className="profile__card-title">
              Фото
              {photos.length > 0 && <span className="profile__count">{photos.length}</span>}
            </h2>
          </header>
          {photos.length > 0 ? (
            <ul className="profile__grid">
              {photos.map((photo) => (
                <li key={photo.id}>
                  <span className="profile__tile">
                    <img src={photo.src} alt="" loading="lazy" decoding="async" />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="profile__empty">Фото пока нет.</p>
          )}
        </section>
      </div>
    </section>
  );
}
