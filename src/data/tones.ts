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
  ['ice', 'Ледяной голубой'],
  ['sea-glass', 'Морское стекло'],
  ['pistachio', 'Фисташковый'],
  ['vanilla', 'Ванильный'],
  ['apricot', 'Абрикосовый'],
  ['blossom', 'Лепестковый'],
  ['lilac-mist', 'Сиреневая дымка'],
  ['dusty-rose', 'Пыльная роза'],
  ['salmon', 'Лососёвый'],
  ['gold', 'Золотистый'],
  ['sage', 'Шалфейный'],
  ['lagoon', 'Лагунный'],
  ['cornflower', 'Васильковый'],
  ['orchid', 'Орхидея'],
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
  | `mix-${typeof EXTRA_TONES[number][0] | 'forest' | 'petrol' | 'midnight' | 'wine'}`;

const tone = (id: ToneId, label: string, color: string, outline?: string) => ({
  id,
  label,
  swatch: color,
  fg: color,
  bg: `color-mix(in srgb, ${color} 18%, var(--color-bg-app))`,
  iconFilter: outline ? `drop-shadow(0 0 1px ${outline})` : undefined,
});

const editorTones = [
  ...APPLE_TONES.map(([id, label]) => tone(id, label, `var(--palette-${id})`)),
  tone('white', 'Белый', 'var(--palette-white)', 'color-mix(in srgb, var(--palette-black) 60%, transparent)'),
  tone('black', 'Чёрный', 'var(--palette-black)'),
  ...EXTRA_TONES.map(([id, label]) => tone(`mix-${id}`, label, `var(--palette-mix-${id})`)),
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

// Старые идентификаторы отображаются ближайшим цветом из действующей палитры.
const legacyTones: Partial<Record<ToneId, ToneId>> = {
  lime: 'mix-pistachio',
  coral: 'mix-salmon',
  purple: 'mix-orchid',
  gray: 'black',
  navy: 'slate',
  lavender: 'mix-lilac-mist',
  plum: 'magenta',
  raspberry: 'pink',
  ochre: 'mix-gold',
  terracotta: 'brown',
  olive: 'mix-sage',
  jade: 'mint',
  'mix-forest': 'green',
  'mix-petrol': 'mix-lagoon',
  'mix-midnight': 'slate',
  'mix-wine': 'mix-dusty-rose',
};

export function editorToneId(id: ToneId): ToneId {
  if (id.startsWith('shade-')) return id.slice(6) as AppleToneId;
  return legacyTones[id] ?? id;
}

export const toneOf = (id: ToneId | null) =>
  id === null ? NEUTRAL_TONE : (editorToneById.get(editorToneId(id)) ?? editorTones[0]);
