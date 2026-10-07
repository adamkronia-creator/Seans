import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type SVGProps } from 'react';
import {
  IconBack,
  IconHeartGrayLg,
  IconHeartRedLg,
  IconTestAge,
  IconTestBlank,
  IconTestBlind,
  IconTestChevron,
  IconTestChevronDown,
  IconTestConclusion,
  IconTestMessage,
  IconTestGender,
  IconTestHide,
  IconTestMic,
  IconTestQuestions,
  IconTestSaveBlank,
  IconTestScalesExtra,
  IconTestScalesMain,
  IconTestScoring,
  IconTestTime,
} from '../icons';
import { Switch } from '../Switch/Switch';
import { ActionSheet, RecipientSheet, type TestAction } from './TestActions';
import { CHATS } from '../../data/chats';
import { sendMessage } from '../../data/chatStore';
import { logStep } from '../../data/clientStore';
import { toggleFavorite, useFavorites, type LibraryTest } from '../../data/library';
import { MESSAGE_LIMIT, testSettings } from '../../data/testSettings';
import { testBlank } from '../../data/testBlank';
import { CollapseCard, TestBlank, blankSections } from './TestBlank';
import { conclusionSections, TestConclusion } from './TestConclusion';
import { conclusionFor } from '../../data/conclusions';
import { SectionNav } from '../SectionNav/SectionNav';
import './TestSettings.css';

/** Высота свёрнутого описания: 6 строк по 19 и промежуток между абзацами 12, одинаково у всех тестов */
const DESC_COLLAPSED = 6 * 19 + 12;

type Svg = ComponentType<SVGProps<SVGSVGElement>>;

interface TestSettingsProps {
  test: LibraryTest;
  /** Чат клиента, из которого открыт тест; без него тест открыт из библиотеки */
  chatId?: string;
  onBack: () => void;
}

/** В шапке название без аббревиатуры: «BDI: Шкала депрессии А. Бека» → «Шкала депрессии А. Бека» */
const shortTitle = (title: string) => title.replace(/^[^:]+:\s*/, '');

/** Строка карточки: иконка 24, подпись и значение или переключатель справа */
function Row({ Icon, label, children }: { Icon: Svg; label: string; children?: React.ReactNode }) {
  return (
    <li className="ts-row">
      <Icon className="ts-row__icon" />
      <span className="ts-row__label">{label}</span>
      {children}
    </li>
  );
}

/** Поле, которое растёт по тексту */
function MessageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  useLayoutEffect(fit, [value]);
  // Ширина поля устанавливается уже после первой отрисовки (и при повороте экрана): высоту считаем заново
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <textarea
      ref={ref}
      id="ts-message"
      className="ts-message__input"
      rows={1}
      maxLength={MESSAGE_LIMIT}
      value={value}
      aria-label="Сообщение для клиента"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/**
 * Экран «Настройка теста»: шапка с названием и сердечком, описание, шкалы, параметры,
 * сообщение клиенту, переключатели и кнопка «Провести тест» над нижней панелью.
 */
export function TestSettings({ test, chatId, onBack }: TestSettingsProps) {
  const data = testSettings(test);
  const favorite = useFavorites().has(test.id);
  const [form, setForm] = useState(data.forms?.[0] ?? '');
  const [message, setMessage] = useState(data.message);
  const [messageOn, setMessageOn] = useState(true);
  const [blind, setBlind] = useState(true);
  const [hideConclusion, setHideConclusion] = useState(true);
  const [saveBlank, setSaveBlank] = useState(true);
  const [sheet, setSheet] = useState<'actions' | 'one' | 'many' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Открыт ли «Бланк тестирования» (вместо настроек, шапка та же)
  const [blankOpen, setBlankOpen] = useState(false);
  // Длинное описание свёрнуто до шести строк, пока его не раскроют
  const [descOpen, setDescOpen] = useState(false);
  const [descFull, setDescFull] = useState(0);
  const descRef = useRef<HTMLDivElement>(null);
  const descLong = descFull > DESC_COLLAPSED + 19;
  // Открыт ли «Пример заключения» (пока есть только у СМОЛ)
  const [conclusionOpen, setConclusionOpen] = useState(false);
  const blank = testBlank(test.id);
  const conclusion = conclusionFor(test.id);
  const toastTimer = useRef<number>();

  const client = chatId ? CHATS.find((c) => c.id === chatId) : undefined;
  const clientName = client?.name;

  const notify = (text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  const send = (ids: string[]) => {
    ids.forEach((id) => {
      if (messageOn) sendMessage(id, message);
      // Журнал действий (история, вкладка «Тесты») пока ведётся только у Максима
      if (id === 'maxim') logStep('test', test.id, 'sent');
    });
    setSheet(null);
    const names = ids.map((id) => CHATS.find((c) => c.id === id)?.name).filter(Boolean);
    notify(ids.length === 1 ? `Тест отправлен: ${names[0]}` : `Тест отправлен: ${ids.length} клиентам`);
  };

  const pick = (action: TestAction) => {
    if (action === 'self') {
      setSheet(null);
      notify('Бланк теста для самостоятельного прохождения пока недоступен');
    } else if (action === 'one' && chatId) send([chatId]);
    else setSheet(action);
  };

  const chars = message.length;
  // Полная высота описания нужна, чтобы понять, длинное ли оно, и плавно раскрыть до нужной высоты
  useLayoutEffect(() => {
    const el = descRef.current;
    if (!el) return;
    const measure = () => setDescFull(el.scrollHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [blankOpen, conclusionOpen]);
  const paragraphs = data.intro.split('\n\n');
  // Строки «● …» — маркированный список, остальные — обычный текст абзаца
  const renderParagraph = (paragraph: string, i: number) => {
    const lines = paragraph.split('\n');
    const items = lines.filter((l) => l.startsWith('●')).map((l) => l.replace(/^●\s*/, ''));
    const text = lines.filter((l) => !l.startsWith('●')).join('\n');
    return (
      <div key={i} className="ts-card__paragraph">
        {text && (
          <p>
            {i === 0 && data.lead && text.startsWith(data.lead) ? (
              <>
                <strong>{data.lead}</strong>
                {text.slice(data.lead.length)}
              </>
            ) : (
              text
            )}
          </p>
        )}
        {items.length > 0 && (
          <ul className="ts-card__list">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };
  const openConclusion = () => (conclusion ? setConclusionOpen(true) : notify('Пример заключения этого теста пока недоступен'));
  const openBlank = () => (blank ? setBlankOpen(true) : notify('Бланк этого теста пока недоступен'));

  return (
    <section className="test-settings">
      <header className="test-settings__header">
        <button type="button" className="test-settings__button" aria-label="Назад" onClick={blankOpen || conclusionOpen ? () => (setBlankOpen(false), setConclusionOpen(false)) : onBack}>
          <IconBack />
        </button>
        <div className="test-settings__peer">
          <img className="test-settings__icon" src={test.icon} alt="" />
          <div className="test-settings__who">
            <h1 className="test-settings__name">{shortTitle(test.title)}</h1>
            <p className="test-settings__status">{blankOpen ? 'Бланк тестирования' : conclusionOpen ? 'Пример заключения' : 'Настройка теста'}</p>
          </div>
        </div>
        <button
          type="button"
          className={`test-settings__button${favorite ? '' : ' test-settings__button--muted'}`}
          aria-label={favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
          aria-pressed={favorite}
          onClick={() => toggleFavorite(test.id)}
        >
          {favorite ? <IconHeartRedLg /> : <IconHeartGrayLg />}
        </button>
      </header>

      {conclusionOpen && conclusion ? (
        <div className="cc-wrap" key="conclusion">
          <div className="test-settings__scroll">
            <TestConclusion data={conclusion} form={form} />
          </div>
          <SectionNav sections={conclusionSections(conclusion)} scroller=".test-settings__scroll" />
        </div>
      ) : blankOpen && blank ? (
        <>
          <div className="test-settings__scroll" key="blank">
            <TestBlank data={blank} />
          </div>
          <SectionNav sections={blankSections(blank)} scroller=".test-settings__scroll" />
        </>
      ) : (
      <>
      <div className="test-settings__scroll">
        <CollapseCard title="Описание теста">
          <div className="ts-desc">
            <div className="ts-desc__clip">
              <div ref={descRef} className="ts-desc__body" style={descLong ? { maxHeight: descOpen ? descFull : DESC_COLLAPSED } : undefined}>
                {paragraphs.map((paragraph, i) => renderParagraph(paragraph, i))}
              </div>
              {/* Свёрнуто: последние строки плавно уходят в белый, кнопка стоит под ними на белом */}
              {descLong && <span className={`ts-desc__fade${descOpen ? ' ts-desc__fade--hidden' : ''}`} aria-hidden="true" />}
            </div>
            {descLong && <hr className="ts-desc__rule" />}
            {descLong && (
              <button
                type="button"
                className={`ts-desc__toggle${descOpen ? ' ts-desc__toggle--open' : ''}`}
                aria-expanded={descOpen}
                onClick={() => setDescOpen(!descOpen)}
              >
                {descOpen ? 'Скрыть' : 'Читать далее'}
              </button>
            )}
          </div>
        </CollapseCard>

        {(data.scales || blank) && (
          <ul className="ts-card ts-card--wide-dividers">
            <li
              className="ts-row ts-row--link"
              role="button"
              tabIndex={0}
              onClick={openBlank}
              onKeyDown={(e) => e.key === 'Enter' && openBlank()}
            >
              <IconTestBlank className="ts-row__icon" />
              <span className="ts-row__link">Бланк тестирования</span>
              <IconTestChevron className="ts-row__chevron" />
            </li>
            {data.scales && (
              <li
                className="ts-row ts-row--link"
                role="button"
                tabIndex={0}
                onClick={openConclusion}
                onKeyDown={(e) => e.key === 'Enter' && openConclusion()}
              >
                <IconTestConclusion className="ts-row__icon" />
                <span className="ts-row__link">Пример заключения</span>
                <IconTestChevron className="ts-row__chevron" />
              </li>
            )}
          </ul>
        )}

        {(data.questions || data.duration || data.age || data.forms) && (
          <CollapseCard title="Тестовая информация">
            <ul className="ts-rows">
              {data.questions !== undefined && (
                <Row Icon={IconTestQuestions} label="Количество вопросов">
                  <span className="ts-row__value">{data.questions}</span>
                </Row>
              )}
              {data.duration && (
                <Row Icon={IconTestTime} label="Время выполнения">
                  <span className="ts-row__value">{data.duration}</span>
                </Row>
              )}
              {data.age && (
                <Row Icon={IconTestAge} label="Возраст">
                  <span className="ts-row__value">{data.age}</span>
                </Row>
              )}
              {data.forms && (
                <Row Icon={IconTestGender} label="Форма бланка">
                  {data.forms.length === 1 ? (
                    <span className="ts-row__value">{data.forms[0]}</span>
                  ) : (
                  <label className="ts-select">
                    <span className="ts-select__value">{form}</span>
                    <IconTestChevronDown className="ts-select__chevron" />
                    <select
                      className="ts-select__native"
                      aria-label="Форма бланка"
                      value={form}
                      onChange={(e) => setForm(e.target.value)}
                    >
                      {data.forms.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </label>
                  )}
                </Row>
              )}
            </ul>
          </CollapseCard>
        )}

        {data.scales && (
          <CollapseCard title="Шкалы и баллы">
            <ul className="ts-rows">
              <li className="ts-row ts-row--top">
                <IconTestScalesMain className="ts-row__icon" />
                <div className="ts-scale">
                  <p className="ts-scale__title">Основные шкалы:</p>
                  <ul className="ts-scale__list">
                    {data.scales.main.map((s) => (
                      <li key={s}>
                        <span className="ts-dot ts-dot--text" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
              {data.scales.extra.length > 0 && (
              <li className="ts-row ts-row--top">
                <IconTestScalesExtra className="ts-row__icon" />
                <div className="ts-scale">
                  <p className="ts-scale__title">Дополнительные шкалы:</p>
                  <ul className="ts-scale__list">
                    {data.scales.extra.map((s) => (
                      <li key={s}>
                        <span className="ts-dot ts-dot--text" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
              )}
              {(
                [
                  [data.scoring, data.scoringExtra ? 'Система баллов (Осн. шкалы):' : 'Система баллов:'],
                  [data.scoringExtra, 'Система баллов (Доп. шкалы):'],
                ] as const
              ).map(
                ([items, title]) =>
                  items && (
                    <li key={title} className="ts-row ts-row--top">
                      <IconTestScoring className="ts-row__icon" />
                      <div className="ts-scale">
                        <p className="ts-scale__title">{title}</p>
                        <ul className="ts-scale__list">
                          {items.map(({ range, label, tone }) => (
                            <li key={label}>
                              <span className={`ts-dot ts-dot--${tone}`} />
                              {tone === 'text' ? `${label} — ${range}` : `${range} — ${label}`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  ),
              )}
            </ul>
          </CollapseCard>
        )}

        <CollapseCard title="Особенности тестирования">
          <ul className="ts-rows">
            <Row Icon={IconTestBlind} label="Слепое тестирование">
              <Switch checked={blind} onChange={setBlind} label="Слепое тестирование" />
            </Row>
            <Row Icon={IconTestHide} label="Скрыть заключение">
              <Switch checked={hideConclusion} onChange={setHideConclusion} label="Скрыть заключение" />
            </Row>
            <Row Icon={IconTestSaveBlank} label="Сохранить бланк">
              <Switch checked={saveBlank} onChange={setSaveBlank} label="Сохранить бланк" />
            </Row>
          </ul>
        </CollapseCard>

        <section className="ts-card ts-message-card">
          <ul className="ts-rows">
            <Row Icon={IconTestMessage} label="Сообщение для клиента">
              <Switch checked={messageOn} onChange={setMessageOn} label="Сообщение для клиента" />
            </Row>
          </ul>
          <div className={`blank-card__collapse${messageOn ? ' blank-card__collapse--open' : ''}`} aria-hidden={!messageOn}>
            <div className="blank-card__inner">
              <div className="blank-card__body ts-message">
                <MessageField value={message} onChange={setMessage} />
                <div className="ts-message__foot">
                  <span className="ts-message__count">
                    {chars} / {MESSAGE_LIMIT}
                  </span>
                  <button type="button" className="ts-message__mic" aria-label="Надиктовать сообщение">
                    <IconTestMic />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="test-settings__cta">
        <button type="button" className="test-settings__cta-button" onClick={() => setSheet('actions')}>
          Провести тест
        </button>
      </div>
      </>
      )}

      {toast && (
        <p className="test-settings__toast" role="status">
          {toast}
        </p>
      )}

      {sheet === 'actions' && <ActionSheet clientName={clientName} onPick={pick} onClose={() => setSheet(null)} />}
      {(sheet === 'one' || sheet === 'many') && (
        <RecipientSheet mode={sheet} onSend={send} onClose={() => setSheet(null)} />
      )}
    </section>
  );
}
