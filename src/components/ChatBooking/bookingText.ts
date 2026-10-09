import { endTime, type Slot } from '../../data/appointments';
import { dayShort, durationLabel } from '../../utils/ruDate';

/** «18:00–18:50» для точного времени и «с 15:00 до 19:00» для промежутка */
export function slotTime(slot: Slot, duration: number): string {
  return slot.kind === 'exact' ? `${slot.start}–${endTime(slot.start, duration)}` : `с ${slot.from} до ${slot.to}`;
}

/** Вторая строка карточки: «18:00–18:50 · 50 мин» или «с 15:00 до 19:00 · прием 50 мин» */
export function slotDetail(slot: Slot, duration: number): string {
  return slot.kind === 'exact'
    ? `${slotTime(slot, duration)} · ${durationLabel(duration)}`
    : `${slotTime(slot, duration)} · прием ${durationLabel(duration)}`;
}

/** Короткая запись для подписей: «чт, 15 окт, 18:00–18:50» */
export function slotShort(slot: Slot, duration: number, now: Date): string {
  return `${dayShort(slot.date, now)}, ${slotTime(slot, duration)}`;
}
