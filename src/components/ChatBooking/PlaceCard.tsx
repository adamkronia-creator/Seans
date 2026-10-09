import type { Place } from '../../data/appointments';
import { IconCopy } from '../ChatParts/ChatIcons';
import { IconExternal, IconPin } from './BookingIcons';
import { PlaceMap } from './PlaceMap';

function Detail({ label, text }: { label: string; text: string }) {
  return (
    <div className="place__detail">
      <h3 className="place__label">{label}</h3>
      {text ? <p className="place__text">{text}</p> : <p className="place__text place__text--empty">Не указано</p>}
    </div>
  );
}

/** Где проходит прием: карта, адрес, как пройти в кабинет и что принести */
export function PlaceCard({ place, onCopy, onMaps }: { place: Place; onCopy: () => void; onMaps: () => void }) {
  return (
    <div className="place">
      <PlaceMap address={place.address} onOpenMaps={onMaps} />
      <div className="place__main">
        <div className="place__address">
          <IconPin className="place__pin" />
          <p className="place__address-text">{place.address}</p>
        </div>
        <div className="bk-actions">
          <button type="button" className="bk-button" onClick={onCopy}>
            <IconCopy />
            Скопировать
          </button>
          <button type="button" className="bk-button" onClick={onMaps}>
            <IconExternal />В картах
          </button>
        </div>
      </div>
      <Detail label="Как пройти" text={place.howTo} />
      <Detail label="Что принести" text={place.bring} />
    </div>
  );
}
