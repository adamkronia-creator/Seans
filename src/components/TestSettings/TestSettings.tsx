import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type SVGProps } from 'react';
import {
  IconTestChevron,
  IconTestChevronDown,
  IconTestMic,
} from '../icons';
import { Switch } from '../Switch/Switch';
import { ActionSheet, RecipientSheet, type TestAction } from './TestActions';
import { CHATS } from '../../data/chats';
import { sendMessage } from '../../data/chatStore';
import { logStep } from '../../data/clientStore';
import type { LibraryTest } from '../../data/library';
import { MESSAGE_LIMIT, testSettings } from '../../data/testSettings';
import { testBlank } from '../../data/testBlank';
import { topicsOf } from '../../data/topics';
import { CollapseCard, TestBlank } from './TestBlank';
import { TestConclusion } from './TestConclusion';
import { TestHeader } from './TestHeader';
import { ScrollHost } from '../ScrollHost/ScrollHost';
import { TestPass } from './TestPass';
import { TestResult } from './TestResult';
import { conclusionFor } from '../../data/conclusions';
import { canPassSelf } from '../../data/selfTest';
import { Toast } from '../Toast/Toast';
import { useBackHandler } from '../../utils/backHandler';
import { useSwipeBack } from '../../utils/swipeBack';
import { transition } from '../../utils/transition';
import './TestSettings.css';

/** Высота свёрнутого описания: 6 строк по 22 и промежуток между абзацами 12, одинаково у всех тестов */
const DESC_COLLAPSED = 6 * 22 + 12;

type Svg = ComponentType<SVGProps<SVGSVGElement>>;

/** Что показано под шапкой: настройки, бланк, пример заключения или прохождение теста */
type View = 'settings' | 'blank' | 'conclusion' | 'pass';

const STATUS: Record<View, string> = {
  settings: 'Настройка теста',
  blank: 'Бланк тестирования',
  conclusion: 'Пример заключения',
  pass: 'Прохождение теста',
};

interface TestSettingsProps {
  test: LibraryTest;
  /** Чат клиента, из которого открыт тест; без него тест открыт из библиотеки */
  chatId?: string;
  onBack: () => void;
}

/** Темы материала: теги в конце настроек, только для просмотра */
export function TopicTags({ id }: { id: string }) {
  const topics = topicsOf(id);
  if (topics.length === 0) return null;
  return (
    <section className="ts-topics" aria-label="Темы материала">
      <ul className="ts-topics__list">
        {topics.map((topic) => (
          <li key={topic} className="ts-topics__tag">
            {topic}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Строка карточки: подпись и значение или переключатель справа; под подписью может стоять пояснение; значок бывает только у способа показа вопросов */
export function Row({
  Icon,
  label,
  hint,
  value,
  info,
  children,
}: {
  Icon?: Svg;
  label: string;
  /** Пояснение мелким шрифтом под подписью: что делает настройка */
  hint?: string;
  /** Значение справа от подписи: строка превращается в «сведение» с тихой подписью */
  value?: string | number;
  info?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <li className={`ts-row${info || value !== undefined ? ' ts-row--info' : ''}`}>
      {Icon && <Icon className="ts-row__icon" />}
      {hint ? (
        <span className="ts-row__text">
          <span className="ts-row__label">{label}</span>
          <span className="ts-row__hint">{hint}</span>
        </span>
      ) : (
        <span className="ts-row__label">{label}</span>
      )}
      {value !== undefined && <span className="ts-row__value">{value}</span>}
      {children}
    </li>
  );
}

/** Поле, которое растёт по тексту */
export function MessageField({ value, onChange, limit = MESSAGE_LIMIT }: { value: string; onChange: (v: string) => void; limit?: number }) {
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
      maxLength={limit}
      value={value}
      aria-label="Сообщение для клиента"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/**
 * Экран «Настройка теста»: шапка с названием и сердечком, описание, шкалы, параметры,
 * сообщение клиенту, переключатели и кнопка «Пройти или отправить» над нижней панелью.
 */
export function TestSettings({ test, chatId, onBack }: TestSettingsProps) {
  const data = testSettings(test);
  const [form, setForm] = useState(data.forms?.[0] ?? '');
  const [message, setMessage] = useState(data.message);
  const [messageOn, setMessageOn] = useState(true);
  const [blind, setBlind] = useState(true);
  const [hideConclusion, setHideConclusion] = useState(true);
  const [saveBlank, setSaveBlank] = useState(true);
  const [sheet, setSheet] = useState<'actions' | 'one' | 'many' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Вместо настроек можно открыть бланк, пример заключения или прохождение; шапка та же
  const [view, setView] = useState<View>('settings');
  // Результат только что пройденного теста: открывается вместо настроек, «назад» возвращает к ним
  const [resultId, setResultId] = useState<string | null>(null);
  // Длинное описание свёрнуто до шести строк, пока его не раскроют
  const [descOpen, setDescOpen] = useState(false);
  const [descFull, setDescFull] = useState(0);
  const descRef = useRef<HTMLDivElement>(null);
  const descLong = descFull > DESC_COLLAPSED + 22;
  const blank = testBlank(test.id);
  const conclusion = conclusionFor(test.id);
  const toastTimer = useRef<number>();

  const notify = (text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  const send = (ids: string[]) => {
    ids.forEach((id) => {
      // В чат уходит карточка теста: сообщение клиенту, если оно включено, стоит в ней текстом, а настройки,
      // с которыми тест ушел, лежат в ней же (их показывает кнопка «Настройки теста»)
      sendMessage(id, messageOn ? message : '', undefined, {
        test: test.id,
        testKind: 'sent',
        testOptions: { blind, hideConclusion, saveBlank, ...(data.forms ? { form } : {}) },
      });
      // Журнал действий (история, вкладка «Тесты») пока ведётся только у Максима
      if (id === 'maxim') logStep('test', test.id, 'sent');
    });
    setSheet(null);
    const names = ids.map((id) => CHATS.find((c) => c.id === id)?.name).filter(Boolean);
    notify(ids.length === 1 ? `Тест отправлен: ${names[0]}` : `Тест отправлен: ${ids.length} клиентам`);
  };

  const pick = (action: TestAction) => {
    if (action === 'self') {
      if (blank && canPassSelf(test.id)) {
        transition(() => {
          setSheet(null);
          setView('pass');
        }, 'forward');
      } else {
        setSheet(null);
        notify('Бланк теста для самостоятельного прохождения пока недоступен');
      }
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
  }, [view, resultId]);
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
  // Бланк, заключение и прохождение открываются как следующий экран: выезжают справа, «назад» возвращает к настройкам
  const openView = (next: View) => transition(() => setView(next), next === 'settings' ? 'back' : 'forward');
  const openConclusion = () => (conclusion ? openView('conclusion') : notify('Пример заключения этого теста пока недоступен'));
  const openBlank = () => (blank ? openView('blank') : notify('Бланк этого теста пока недоступен'));
  // Жест «назад» из результата, бланка, заключения или прохождения ведёт к настройкам, как кнопка в шапке
  useBackHandler(Boolean(resultId) || view !== 'settings', () =>
    resultId ? transition(() => setResultId(null), 'back') : openView('settings'),
  );
  // Свайп вправо на настройке, бланке и примере заключения — тот же «назад», что стрелка в шапке
  useSwipeBack('.test-settings', !resultId && (view === 'settings' || view === 'blank' || view === 'conclusion'), () =>
    view === 'settings' ? onBack() : openView('settings'),
  );

  if (resultId) {
    return (
      <>
        <TestResult resultId={resultId} onBack={() => transition(() => setResultId(null), 'back')} />
        {toast && <Toast text={toast} />}
      </>
    );
  }

  return (
    <section className="test-settings">
      <TestHeader test={test} status={STATUS[view]} onBack={view === 'settings' ? onBack : () => openView('settings')} />

      {view === 'pass' && blank ? (
        <TestPass
          testId={test.id}
          blank={blank}
          forms={data.forms}
          form={form}
          saveBlank={saveBlank}
          onFormChange={setForm}
          onDone={(id) => {
            // Заключение открывается сразу; его копия лежит в «Избранное» → «Тесты», в чате — сообщение с кнопкой
            transition(() => {
              setView('settings');
              setResultId(id);
              notify('Заключение теста сохранено в избранном');
            }, 'forward');
          }}
        />
      ) : view === 'conclusion' && conclusion ? (
        <div className="cc-wrap" key="conclusion">
          <ScrollHost className="test-settings__scroll">
            <TestConclusion data={conclusion} form={form} />
          </ScrollHost>
        </div>
      ) : view === 'blank' && blank ? (
        <ScrollHost className="test-settings__scroll" key="blank">
          <TestBlank data={blank} />
        </ScrollHost>
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
          <ul className="ts-card">
            <li
              className="ts-row ts-row--link"
              role="button"
              tabIndex={0}
              onClick={openBlank}
              onKeyDown={(e) => e.key === 'Enter' && openBlank()}
            >
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
                <Row label="Количество вопросов" value={data.questions} />
              )}
              {data.duration && (
                <Row label="Время выполнения" value={data.duration} />
              )}
              {data.age && (
                <Row label="Возраст" value={data.age} />
              )}
              {data.forms && (
                <Row label="Форма бланка" info value={data.forms.length === 1 ? data.forms[0] : undefined}>
                  {data.forms.length > 1 && (
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
            <Row label="Слепое тестирование" hint="Клиент не увидит название теста и его цель: так ответы честнее">
              <Switch checked={blind} onChange={setBlind} label="Слепое тестирование" />
            </Row>
            <Row label="Скрыть заключение" hint="После прохождения клиент не увидит результат, заключение останется только у вас">
              <Switch checked={hideConclusion} onChange={setHideConclusion} label="Скрыть заключение" />
            </Row>
            <Row label="Сохранить бланк" hint="Заполненный бланк сохранится в истории клиента">
              <Switch checked={saveBlank} onChange={setSaveBlank} label="Сохранить бланк" />
            </Row>
          </ul>
        </CollapseCard>

        <section className="ts-card ts-message-card">
          <ul className="ts-rows">
            <Row label="Сообщение для клиента" hint="Короткое пояснение придет вместе с тестом">
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

        <TopicTags id={test.id} />
      </div>

      <div className="test-settings__cta">
        <button type="button" className="test-settings__cta-button" onClick={() => setSheet('actions')}>
          Пройти или отправить
        </button>
      </div>
      </>
      )}

      {toast && <Toast text={toast} className={view === 'settings' ? 'test-settings__toast--cta' : undefined} />}

      {sheet === 'actions' && <ActionSheet onPick={pick} onClose={() => setSheet(null)} />}
      {(sheet === 'one' || sheet === 'many') && (
        <RecipientSheet mode={sheet} onSend={send} onClose={() => setSheet(null)} />
      )}
    </section>
  );
}
