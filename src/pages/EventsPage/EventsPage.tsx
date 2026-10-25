import { EventItem } from '../../components/EventItem/EventItem';
import { IconBack } from '../../components/icons';
import { appEvents, useClientData } from '../../data/clientStore';
import { goBack, navigate } from '../../router';
import { useSwipeBack } from '../../utils/swipeBack';
import './EventsPage.css';

export function EventsPage() {
  const events = appEvents(useClientData());
  // Свайп вправо — назад, как стрелка в шапке (жест от самого края остаётся)
  useSwipeBack('.events', true, () => goBack());
  return (
    <section className="events">
      <header className="events__header">
        <button type="button" className="events__back" aria-label="Назад" onClick={() => goBack()}>
          <IconBack />
        </button>
        <div className="events__who">
          <h1 className="events__title">События</h1>
          <p className="events__subtitle">Последние обновления</p>
        </div>
      </header>

      <ul className="events__list">
        {events.map((event) => (
          <EventItem key={event.id} event={event} onClick={(e) => e.href && navigate(e.href)} />
        ))}
      </ul>
    </section>
  );
}
