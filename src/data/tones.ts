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

// Цвета подобраны под синий акцент #2688EB: та же насыщенность, значок и кружок — один цвет (≥ 3:1 на белой карточке);
// плитка шапки — тот же цвет на 18% на бумаге
const tone = (id: ToneId, label: string, color: string) => ({
  id,
  label,
  swatch: color,
  fg: color,
  bg: `color-mix(in srgb, ${color} 18%, var(--color-bg-app))`,
});

// 16 цветов: два ряда по 8 в окне редактирования
export const TONES = [
  tone('blue', 'Синий', '#2688EB'),
  tone('cyan', 'Голубой', '#0E9DB8'),
  tone('teal', 'Бирюзовый', '#0F9488'),
  tone('mint', 'Мятный', '#12A67A'),
  tone('green', 'Зелёный', '#2E9E4F'),
  tone('lime', 'Салатовый', '#6FA51E'),
  tone('yellow', 'Жёлтый', '#C98A00'),
  tone('orange', 'Оранжевый', '#E8710A'),
  tone('coral', 'Коралловый', '#E5583F'),
  tone('red', 'Красный', '#DC3C46'),
  tone('pink', 'Розовый', '#E0508F'),
  tone('magenta', 'Пурпурный', '#B54BBE'),
  tone('purple', 'Фиолетовый', '#7A56D6'),
  tone('brown', 'Коричневый', '#96663A'),
  tone('gray', 'Серый', '#6F7C95'),
  tone('slate', 'Сине-серый', '#46689A'),
];

/** Без цвета: белая шапка, текст стандартного цвета, иконка акцентная */
export const NEUTRAL_TONE = { id: null, label: 'Без цвета', swatch: 'var(--color-accent)', fg: 'var(--color-accent)', bg: 'var(--color-bg-panel)' };

export const toneOf = (id: ToneId | null) =>
  id === null ? NEUTRAL_TONE : (TONES.find((t) => t.id === id) ?? TONES[0]);
