import { EventItem } from '../../components/EventItem/EventItem';
import { IconBack } from '../../components/icons';
import { appEvents, useClientData } from '../../data/clientStore';
import { goBack, navigate } from '../../router';
import './EventsPage.css';

export function EventsPage() {
  const events = appEvents(useClientData());
  return (
    <section className="events">
      <header className="events__header">
        <button type="button" className="events__back" aria-label="Назад" onClick={() => goBack()}>
          <IconBack />
        </button>
        <h1 className="events__title">События</h1>
      </header>

      <ul className="events__list">
        {events.map((event) => (
          <EventItem key={event.id} event={event} onClick={(e) => e.href && navigate(e.href)} />
        ))}
      </ul>
    </section>
  );
}
