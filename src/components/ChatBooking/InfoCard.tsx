import type { ComponentType, ReactNode, SVGProps } from 'react';
import type { Info } from '../../data/appointments';
import { IconBookingBag, IconBookingDirections, IconBookingPin, IconBookingRoute, IconBookingWallet } from '../icons';
import { IconCopy } from '../ChatParts/ChatIcons';
import { PlaceMap } from './PlaceMap';

interface RowProps {
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  text: string;
  /** Выделить текст (адрес) */
  strong?: boolean;
  children?: ReactNode;
}

/** Строка информации: значок, подпись и текст (если текста нет, серое «Не указано»); дополнение идет под ними на всю ширину */
function Row({ Icon, label, text, strong, children }: RowProps) {
  return (
    <div className="info__row">
      <div className="info__head">
        <Icon className="info__icon" aria-hidden="true" />
        <div className="info__body">
          <h3 className="info__label">{label}</h3>
          {text ? (
            <p className={`info__text${strong ? ' info__text--strong' : ''}`}>{text}</p>
          ) : (
            <p className="info__text info__text--empty">Не указано</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

/** Информация о приеме: карта, адрес, как пройти в кабинет, что принести и как оплатить сеанс */
export function InfoCard({ info, onCopy, onMaps }: { info: Info; onCopy: () => void; onMaps: () => void }) {
  return (
    <div className="info">
      <PlaceMap address={info.address} onOpenMaps={onMaps} />
      <Row Icon={IconBookingPin} label="Адрес" text={info.address} strong>
        <div className="bk-actions">
          <button type="button" className="bk-button" onClick={onCopy}>
            <IconCopy />
            Скопировать
          </button>
          <button type="button" className="bk-button" onClick={onMaps}>
            <IconBookingRoute />В картах
          </button>
        </div>
      </Row>
      <Row Icon={IconBookingDirections} label="Как пройти" text={info.howTo} />
      <Row Icon={IconBookingBag} label="Что принести" text={info.bring} />
      <Row Icon={IconBookingWallet} label="Оплата сеанса" text={info.payment} />
    </div>
  );
}
