/** Цвета шапок карточек «Кейса» и заметок: фон шапки и цвет иконки */
export type ToneId = 'blue' | 'brown' | 'purple' | 'green' | 'orange' | 'red' | 'pink';

export const TONES: { id: ToneId; label: string; bg: string; fg: string }[] = [
  { id: 'blue', label: 'Синий', bg: 'rgb(0 136 255 / 10%)', fg: '#0088FF' },
  { id: 'brown', label: 'Коричневый', bg: 'rgb(172 127 94 / 10%)', fg: '#AC7F5E' },
  { id: 'purple', label: 'Фиолетовый', bg: '#EEEDFD', fg: '#6155F5' },
  { id: 'green', label: 'Зелёный', bg: 'rgb(52 199 89 / 10%)', fg: '#34C759' },
  { id: 'orange', label: 'Оранжевый', bg: 'rgb(255 141 40 / 10%)', fg: '#FF8D28' },
  { id: 'red', label: 'Красный', bg: 'rgb(255 56 60 / 10%)', fg: '#FF383C' },
  { id: 'pink', label: 'Розовый', bg: 'rgb(203 48 224 / 10%)', fg: '#CB30E0' },
];

export const toneOf = (id: ToneId) => TONES.find((t) => t.id === id) ?? TONES[0];
