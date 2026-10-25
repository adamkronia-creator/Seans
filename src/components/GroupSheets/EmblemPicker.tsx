import { useState, type CSSProperties } from 'react';
import { EmblemTile } from '../Emblem/Emblem';
import { EMBLEM_EMOJIS, EMBLEM_TONES, emblemOwner, plainEmoji, type Emblem, type Group } from '../../data/groups';
import { plainText } from '../../utils/plainText';

/** Эмодзи, склеенные из частей («👩‍⚕️», флаги, цифры в рамке) и с вариантом начертания: ищем целиком, а не по кускам */
const EMOJI = /\p{Regional_Indicator}{2}|[#*0-9]️?⃣|\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?(?:‍\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?)*/u;

/** Первый эмодзи из того, что ввели или вставили; нет эмодзи — пустая строка */
export function firstEmoji(text: string): string {
  return text.match(EMOJI)?.[0] ?? '';
}

interface EmblemPickerProps {
  value: Emblem;
  onChange: (next: Emblem) => void;
  /** Все группы: пара «эмодзи и цвет» не должна повторяться */
  groups: readonly Group[];
  /** Редактируемая группа: свой значок занятым не считается */
  exceptId?: string;
}

/**
 * Выбор значка группы: эмодзи (набор для специалистов или любой свой) и цвет из 16. Пара «эмодзи и цвет» у каждой группы своя:
 * цвета, уже занятые другой группой с этим эмодзи, затемнены и не нажимаются, а при смене эмодзи цвет сам переходит на свободный.
 */
export function EmblemPicker({ value, onChange, groups, exceptId }: EmblemPickerProps) {
  const [custom, setCustom] = useState('');
  const taken = (emoji: string, tone: Emblem['tone']) => emblemOwner(groups, { emoji, tone }, exceptId);

  const pick = (emoji: string) => {
    // Новый эмодзи с прежним цветом уже занят другой группой: берём первый свободный цвет
    const tone = taken(emoji, value.tone) ? (EMBLEM_TONES.find((t) => !taken(emoji, t.id))?.id ?? value.tone) : value.tone;
    onChange({ emoji, tone });
  };

  const clash = taken(value.emoji, value.tone);

  return (
    <div className="gs-picker">
      <div className="gs-picker__head">
        <EmblemTile emblem={value} size="xl" label="Значок группы" />
        <p className="gs-picker__lead">Значок видят рядом с именем участников. Пара «эмодзи и цвет» у каждой группы своя.</p>
      </div>

      <div className="gs-emojis" role="radiogroup" aria-label="Эмодзи значка">
        {EMBLEM_EMOJIS.map((emoji) => {
          const on = plainEmoji(emoji) === plainEmoji(value.emoji);
          return (
            <button key={emoji} type="button" role="radio" aria-checked={on} className="gs-emoji" onClick={() => pick(emoji)}>
              {emoji}
            </button>
          );
        })}
      </div>

      <label className="gs-custom">
        <span className="gs-custom__label">Свой эмодзи</span>
        <input
          className="gs-custom__input"
          value={custom}
          inputMode="text"
          name="emblem-emoji"
          placeholder="Вставьте с клавиатуры"
          aria-label="Свой эмодзи"
          {...plainText}
          onChange={(e) => {
            const text = e.target.value;
            const emoji = firstEmoji(text);
            setCustom(emoji || text);
            if (emoji) pick(emoji);
          }}
        />
      </label>
      {custom && !firstEmoji(custom) && <span className="gs-error">Здесь нужен эмодзи, например 🧠</span>}

      <div className="gs-tones" role="radiogroup" aria-label="Цвет значка">
        {EMBLEM_TONES.map((tone) => {
          const owner = taken(value.emoji, tone.id);
          return (
            <button
              key={tone.id}
              type="button"
              role="radio"
              aria-checked={value.tone === tone.id}
              aria-label={owner ? `${tone.label}: занят группой «${owner.name}»` : tone.label}
              disabled={owner !== undefined && value.tone !== tone.id}
              className="gs-tone"
              style={{ '--swatch': tone.swatch } as CSSProperties}
              onClick={() => onChange({ ...value, tone: tone.id })}
            />
          );
        })}
      </div>
      {clash && <span className="gs-error">Такой значок уже у группы «{clash.name}». Выберите другой цвет или эмодзи.</span>}
    </div>
  );
}
