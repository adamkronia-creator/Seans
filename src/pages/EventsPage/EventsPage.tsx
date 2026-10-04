import { EventItem } from '../../components/EventItem/EventItem';
import { IconBack } from '../../components/icons';
import { EVENTS } from '../../data/events';
import { goBack } from '../../router';
import './EventsPage.css';

export function EventsPage() {
  return (
    <section className="events">
      <header className="events__header">
        <button type="button" className="events__back" aria-label="Назад" onClick={() => goBack()}>
          <IconBack />
        </button>
        <h1 className="events__title">События</h1>
      </header>

      <ul className="events__list">
        {EVENTS.map((event) => (
          <EventItem key={event.id} event={event} />
        ))}
      </ul>
    </section>
  );
}
