import { IconBackMk } from '../../components/ChatItem/ChatIcons';
import { Avatar } from '../../components/Avatar/Avatar';
import { IconPin } from '../../components/icons';
import { useChats } from '../../data/chatStore';
import { SHARED_MEDIA } from '../../data/contactShared';
import { PERSON_PROFILES } from '../../data/contactProfiles';
import { useRoleLine } from '../../data/roleStore';
import { goBack } from '../../router';
import { useSwipeBack } from '../../utils/swipeBack';
import '../ProfilePage/ProfilePage.css';
import './PersonProfilePage.css';

/**
 * Профиль собеседника (адрес /chat/<чат>/profile): та же страница, что «Профиль» у специалиста (обложка, фото, имя, подпись, сводка,
 * информация и фото), только для просмотра. Открывается кнопкой «Профиль» в карточке контакта.
 */
export function PersonProfilePage({ chatId }: { chatId: string }) {
  const chat = useChats().find((c) => c.id === chatId);
  const roleLine = useRoleLine(chatId);
  const back = () => goBack(`/chat/${chatId}/contact`);
  useSwipeBack('.profile', true, back);
  if (!chat) return <section className="profile" />;

  const info = PERSON_PROFILES[chatId];
  const headline = info?.headline ?? roleLine;
  const photos = SHARED_MEDIA[chatId] ?? [];

  return (
    <section className="profile person">
      <button type="button" className="person__back" aria-label="Назад" onClick={back}>
        <IconBackMk />
      </button>
      <div className="profile__scroll">
        <div className="profile__top">
          <div className="profile__cover">
            {chat.avatar && <img className="profile__cover-img person__cover" src={chat.avatar} alt="" />}
          </div>
          <div className="profile__head">
            <div className="profile__row">
              <div className="profile__avatar">
                <span className="profile__avatar-hit">
                  <Avatar src={chat.avatar} name={chat.name} size={88} />
                </span>
              </div>
            </div>

            <h1 className="profile__name">{chat.name}</h1>
            <p className="profile__headline">{headline}</p>
            {info?.city && (
              <p className="profile__city">
                <IconPin />
                {info.city}
              </p>
            )}

            {info && (
              <ul className="profile__stats" aria-label="Сводка">
                {info.stats.map(([n, label]) => (
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
