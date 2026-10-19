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

// Цвета подобраны под синий акцент #007AFF: та же насыщенность, значок и кружок — один цвет (≥ 3:1 на белой карточке);
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
  tone('blue', 'Синий', '#007AFF'),
  tone('cyan', 'Голубой', '#32ADE6'),
  tone('teal', 'Бирюзовый', '#30B0C7'),
  tone('mint', 'Мятный', '#00A89F'),
  tone('green', 'Зелёный', '#28A745'),
  tone('lime', 'Салатовый', '#7FB000'),
  tone('yellow', 'Жёлтый', '#C98A00'),
  tone('orange', 'Оранжевый', '#FF9500'),
  tone('coral', 'Коралловый', '#FF6B5B'),
  tone('red', 'Красный', '#FF3B30'),
  tone('pink', 'Розовый', '#FF2D55'),
  tone('magenta', 'Пурпурный', '#C644C9'),
  tone('purple', 'Фиолетовый', '#AF52DE'),
  tone('brown', 'Коричневый', '#A2845E'),
  tone('gray', 'Серый', '#8E8E93'),
  tone('slate', 'Индиго', '#5856D6'),
];

/** Без цвета: белая шапка, текст стандартного цвета, иконка акцентная */
export const NEUTRAL_TONE = { id: null, label: 'Без цвета', swatch: 'var(--color-accent)', fg: 'var(--color-accent)', bg: 'var(--color-bg-panel)' };

export const toneOf = (id: ToneId | null) =>
  id === null ? NEUTRAL_TONE : (TONES.find((t) => t.id === id) ?? TONES[0]);
