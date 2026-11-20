const APPLE_TONES = [
  ['blue', 'Синий'],
  ['cyan', 'Голубой'],
  ['teal', 'Бирюзовый'],
  ['mint', 'Мятный'],
  ['green', 'Зелёный'],
  ['yellow', 'Жёлтый'],
  ['orange', 'Оранжевый'],
  ['red', 'Красный'],
  ['pink', 'Розовый'],
  ['magenta', 'Пурпурный'],
  ['slate', 'Индиго'],
  ['brown', 'Коричневый'],
] as const;

type AppleToneId = typeof APPLE_TONES[number][0];

const EXTRA_TONES = [
  ['ice', 'Ледяной голубой', 'cyan', 'white', 42],
  ['sea-glass', 'Морское стекло', 'mint', 'white', 52],
  ['pistachio', 'Фисташковый', 'green', 'yellow', 56],
  ['vanilla', 'Ванильный', 'yellow', 'white', 48],
  ['apricot', 'Абрикосовый', 'orange', 'white', 58],
  ['blossom', 'Лепестковый', 'pink', 'white', 46],
  ['lilac-mist', 'Сиреневая дымка', 'slate', 'white', 51],
  ['dusty-rose', 'Пыльная роза', 'pink', 'brown', 44],
  ['salmon', 'Лососёвый', 'red', 'orange', 55],
  ['gold', 'Золотистый', 'yellow', 'brown', 63],
  ['sage', 'Шалфейный', 'mint', 'brown', 56],
  ['lagoon', 'Лагунный', 'teal', 'blue', 55],
  ['cornflower', 'Васильковый', 'blue', 'slate', 56],
  ['orchid', 'Орхидея', 'magenta', 'slate', 61],
  ['forest', 'Хвойный', 'green', 'black', 52],
  ['petrol', 'Нефтяной синий', 'teal', 'black', 54],
  ['midnight', 'Полуночный индиго', 'slate', 'black', 53],
  ['wine', 'Винный', 'pink', 'black', 56],
] as const;

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
  | 'slate'
  | 'navy'
  | 'lavender'
  | 'plum'
  | 'raspberry'
  | 'ochre'
  | 'terracotta'
  | 'olive'
  | 'jade'
  | 'white'
  | 'black'
  | `shade-${AppleToneId}`
  | `mix-${typeof EXTRA_TONES[number][0]}`;

const tone = (id: ToneId, label: string, color: string, outline?: string) => ({
  id,
  label,
  swatch: color,
  fg: color,
  bg: `color-mix(in srgb, ${color} 18%, var(--color-bg-app))`,
  iconFilter: outline ? `drop-shadow(0 0 1px ${outline})` : undefined,
});

// Цвета папок хранятся как HEX, поэтому их прежняя палитра остаётся доступной.
export const FOLDER_TONES = [
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
  tone('navy', 'Тёмно-синий', '#3C548D'),
  tone('lavender', 'Лавандовый', '#846BD1'),
  tone('plum', 'Сливовый', '#813989'),
  tone('raspberry', 'Малиновый', '#B82C68'),
  tone('ochre', 'Охра', '#A96F22'),
  tone('terracotta', 'Терракотовый', '#B34D37'),
  tone('olive', 'Оливковый', '#687821'),
  tone('jade', 'Нефритовый', '#178264'),
];

const savedShades = APPLE_TONES.map(([id, label]) =>
  tone(`shade-${id}`, `${label} · глубокий оттенок`, `color-mix(in srgb, var(--palette-${id}) 74%, var(--palette-black))`),
);

const editorTones = [
  ...APPLE_TONES.map(([id, label]) => tone(id, label, `var(--palette-${id})`)),
  tone('white', 'Белый', 'var(--palette-white)', 'rgb(0 0 0 / 60%)'),
  tone('black', 'Чёрный', 'var(--palette-black)', 'rgb(255 255 255 / 60%)'),
  ...EXTRA_TONES.map(([id, label, first, second, weight]) =>
    tone(`mix-${id}`, label, `color-mix(in oklab, var(--palette-${first}) ${weight}%, var(--palette-${second}))`),
  ),
];


// От тёплых цветов к холодным, затем нейтральные.
const editorOrder: ToneId[] = [
  'red', 'mix-salmon', 'orange', 'mix-apricot', 'brown', 'mix-gold', 'yellow', 'mix-vanilla',
  'mix-pistachio', 'green', 'mix-sage', 'mint', 'mix-sea-glass', 'teal', 'mix-lagoon',
  'cyan', 'mix-ice', 'blue', 'mix-cornflower', 'slate', 'mix-lilac-mist',
  'mix-orchid', 'magenta', 'pink', 'mix-blossom', 'mix-dusty-rose', 'white', 'black',
];

const editorToneById = new Map(editorTones.map((entry) => [entry.id, entry]));
export const TONES = editorOrder.flatMap((id) => {
  const entry = editorToneById.get(id);
  return entry ? [entry] : [];
});

/** Без цвета: белая шапка, текст стандартного цвета, иконка акцентная */
const NEUTRAL_TONE = { id: null, iconFilter: undefined, label: 'Без цвета', swatch: 'var(--color-accent)', fg: 'var(--color-accent)', bg: 'var(--color-bg-panel)' };

// Сохранённые цвета продолжают отображаться на существующих карточках.
const toneById = new Map([...FOLDER_TONES, ...savedShades, ...editorTones].map((entry) => [entry.id, entry]));

export const toneOf = (id: ToneId | null) =>
  id === null ? NEUTRAL_TONE : (toneById.get(id) ?? editorTones[0]);
