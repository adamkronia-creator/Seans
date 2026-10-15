/** Цвета шапок карточек сведений и заметок: фон шапки и цвет иконки */
export type ToneId =
  | 'blue'
  | 'cyan'
  | 'teal'
  | 'mint'
  | 'green'
  | 'lime'
  | 'yellow'
  | 'coral'
  | 'orange'
  | 'red'
  | 'pink'
  | 'magenta'
  | 'purple'
  | 'brown'
  | 'gray'
  | 'slate';

// Пастель с палитры (tokens.css) годится для заливок, но не для штрихов значка: на светлой плитке значок рисуется тёмным оттенком того же цвета
// (≥ 4,8:1), плитка — та же пастель вполсилы на бумаге, а в окне выбора цвета кружок залит самой пастелью
const tone = (id: ToneId, label: string, token: string, ink: string) => ({
  id,
  label,
  swatch: `var(--color-${token})`,
  fg: ink,
  bg: `color-mix(in srgb, var(--color-${token}) 50%, var(--color-bg-app))`,
});

// 16 цветов: два ряда по 8 в окне редактирования
export const TONES = [
  tone('blue', 'Синий', 'blue', '#0E6091'),
  tone('cyan', 'Голубой', 'cyan', '#356B74'),
  tone('teal', 'Бирюзовый', 'teal', '#105556'),
  tone('mint', 'Мятный', 'mint', '#005C38'),
  tone('green', 'Зелёный', 'green', '#116223'),
  tone('lime', 'Салатовый', 'lime', '#566A1B'),
  tone('yellow', 'Жёлтый', 'yellow', '#854900'),
  tone('orange', 'Оранжевый', 'orange', '#873300'),
  tone('coral', 'Коралловый', 'coral', '#913719'),
  tone('red', 'Красный', 'red', '#892936'),
  tone('pink', 'Розовый', 'pink', '#815964'),
  tone('magenta', 'Пурпурный', 'magenta', '#6D576E'),
  tone('purple', 'Фиолетовый', 'purple', '#514F78'),
  tone('brown', 'Коричневый', 'brown', '#624F2D'),
  tone('gray', 'Серо-лиловый', 'gray', '#5C4451'),
  tone('slate', 'Серо-бирюзовый', 'slate', '#275C5D'),
];

/** Без цвета: белая шапка, текст стандартного цвета, иконка акцентная */
export const NEUTRAL_TONE = { id: null, label: 'Без цвета', swatch: 'var(--color-accent)', fg: 'var(--color-accent)', bg: 'var(--color-bg-panel)' };

export const toneOf = (id: ToneId | null) =>
  id === null ? NEUTRAL_TONE : (TONES.find((t) => t.id === id) ?? TONES[0]);
