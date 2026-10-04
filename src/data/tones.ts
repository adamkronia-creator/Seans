/** Цвета шапок карточек «Кейса» и заметок: фон шапки и цвет иконки */
export type ToneId =
  | 'blue'
  | 'cyan'
  | 'teal'
  | 'mint'
  | 'green'
  | 'orange'
  | 'red'
  | 'pink'
  | 'magenta'
  | 'purple'
  | 'brown';

// Цвет иконки — основной цвет из палитры (tokens.css); фон шапки — тот же цвет с прозрачностью 10%
const tone = (id: ToneId, label: string, token: string) => ({
  id,
  label,
  fg: `var(--color-${token})`,
  bg: `color-mix(in srgb, var(--color-${token}) 10%, transparent)`,
});

export const TONES = [
  tone('blue', 'Синий', 'blue'),
  tone('cyan', 'Голубой', 'cyan'),
  tone('teal', 'Бирюзовый', 'teal'),
  tone('mint', 'Мятный', 'mint'),
  tone('green', 'Зелёный', 'green'),
  tone('orange', 'Оранжевый', 'orange'),
  tone('red', 'Красный', 'red'),
  tone('pink', 'Розовый', 'pink'),
  tone('magenta', 'Пурпурный', 'magenta'),
  tone('purple', 'Фиолетовый', 'purple'),
  tone('brown', 'Коричневый', 'brown'),
];

export const toneOf = (id: ToneId) => TONES.find((t) => t.id === id) ?? TONES[0];
