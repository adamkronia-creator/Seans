import { useId, useState } from 'react';
import { Frame } from '../Frame/Frame';
import { setMyStatus, useStatus } from '../../data/groupStore';
import { STATUS_EMOJIS, STATUS_PRESETS, STATUS_TERMS, STATUS_TEXT_MAX, untilLabel } from '../../data/status';
import { plainText } from '../../utils/plainText';
import { closeGroupSheet, toastGroup } from './groupSheets';
import { ME } from '../../data/people';

/**
 * Свой статус: эмодзи и короткий текст рядом с вашим именем в профиле («Принимаю новых клиентов», «В отпуске»). Готовые варианты
 * для доступности и свой текст; срок выбирается, по его окончании статус исчезает сам.
 */
export function StatusSheet({ onClose }: { onClose: () => void }) {
  const uid = useId();
  const current = useStatus(ME);
  const [emoji, setEmoji] = useState(current?.emoji ?? STATUS_PRESETS[0].emoji);
  const [text, setText] = useState(current?.text ?? STATUS_PRESETS[0].text);
  // «keep» — у текущего статуса есть срок, и его не трогают, пока человек не выберет другой
  const [term, setTerm] = useState<string>(current ? (current.until === undefined ? 'none' : 'keep') : 'week');
  const clean = text.trim();

  const save = () => {
    if (!clean) return;
    const ms = STATUS_TERMS.find((t) => t.id === term)?.ms;
    const until = term === 'keep' ? current?.until : ms !== undefined ? Date.now() + ms : undefined;
    setMyStatus({ emoji, text: clean, ...(until !== undefined && { until }) });
    closeGroupSheet();
    toastGroup('Статус сохранён');
  };

  return (
    <Frame
      title="Статус"
      subtitle="Виден рядом с вашим именем в профиле"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="sheet__button sheet__button--primary" disabled={!clean} onClick={save}>
            Сохранить
          </button>
        </>
      }
    >
      <section className="sheet__card frame-card">
        <span className="frame-label">Готовые</span>
        <div className="ct-chips" role="group" aria-label="Готовые статусы">
          {STATUS_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              className="ct-chip"
              aria-pressed={emoji === p.emoji && text === p.text}
              onClick={() => {
                setEmoji(p.emoji);
                setText(p.text);
              }}
            >
              {p.emoji} {p.text}
            </button>
          ))}
        </div>
      </section>

      <section className="sheet__card frame-card">
        <label className="frame-label" htmlFor={`${uid}-text`}>
          Свой текст
        </label>
        <div className="gs-status">
          <span className="gs-status__emoji" aria-hidden="true">
            {emoji}
          </span>
          <input id={`${uid}-text`} className="frame-textarea" value={text} maxLength={STATUS_TEXT_MAX} name="status-text" placeholder="Что вы хотите сказать" {...plainText} onChange={(e) => setText(e.target.value)} />
        </div>
        <div className="gs-status-emojis" role="radiogroup" aria-label="Эмодзи статуса">
          {[...new Set([...STATUS_PRESETS.map((p) => p.emoji), ...STATUS_EMOJIS])].map((e) => (
            <button key={e} type="button" role="radio" aria-checked={emoji === e} className="gs-emoji" onClick={() => setEmoji(e)}>
              {e}
            </button>
          ))}
        </div>
      </section>

      <section className="sheet__card frame-card">
        <span className="frame-label">Сколько показывать</span>
        <div className="ct-chips" role="group" aria-label="Срок статуса">
          {STATUS_TERMS.map((t) => (
            <button key={t.id} type="button" className="ct-chip" aria-pressed={term === t.id} onClick={() => setTerm(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <span className="ct-hint">{term === 'keep' && current?.until ? `Сейчас статус стоит ${untilLabel(current.until)}.` : term === 'none' ? 'Статус останется, пока вы его не уберёте.' : 'По окончании срока статус исчезнет сам.'}</span>
      </section>

      {current && (
        <section className="sheet__card frame-card">
          <button
            type="button"
            className="gs-link gs-link--danger"
            onClick={() => {
              setMyStatus(undefined);
              closeGroupSheet();
              toastGroup('Статус убран');
            }}
          >
            Убрать статус
          </button>
        </section>
      )}
    </Frame>
  );
}
