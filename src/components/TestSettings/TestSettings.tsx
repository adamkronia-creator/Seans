import { Chip } from '../Chip/Chip';
import { EmptyState } from '../EmptyState/EmptyState';
import { SwipePager } from '../SwipePager/SwipePager';
import { ClientResultTiles } from './ClientResultTiles';
import { followChips, type PositionVia } from '../../utils/followChips';
import { ReadMoreLabel } from './ReadMoreLabel';
import { anchorToggle } from '../../utils/anchorToggle';
import { TestDescription } from './TestDescription';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentType, type SVGProps } from 'react';
import {
  IconTestMic,
} from '../icons';
import { Switch } from '../Switch/Switch';
import { OptionHelp } from '../OptionHelp/OptionHelp';
import { HelpContext } from '../OptionHelp/HelpScenes';
import { SELF_ID } from './TestActions';
import { PreviewSheet, SendSheet } from './SendSheet';
import { copyText } from '../../utils/clipboard';
import { sendMessage } from '../../data/chatStore';
import { logStep } from '../../data/clientStore';
import type { LibraryTest } from '../../data/library';
import { DEFAULT_SENT_OPTIONS, type Message } from '../../data/messages';
import { MESSAGE_LIMIT, testSettings } from '../../data/testSettings';
import { testBlank } from '../../data/testBlank';
import { type OptionHelpId } from '../../data/optionHelp';
import { CollapseCard, TestBlank } from './TestBlank';
import { TestConclusion } from './TestConclusion';
import { FormOptions } from './FormMenu';
import { type ResultMode } from '../../data/resultMode';
import { TestHeader } from './TestHeader';
import { TestPreview } from './TestPreview';
import { ScrollHost } from '../ScrollHost/ScrollHost';
import { TestPass } from './TestPass';
import { TestResult } from './TestResult';
import { conclusionFor } from '../../data/conclusions';
import { blindTitle } from '../../data/resultMode';
import { formHint, takePass } from '../../data/selfTest';
import { Toast } from '../Toast/Toast';
import { useBackHandler } from '../../utils/backHandler';
import { useSwipeBack } from '../../utils/swipeBack';
import { transition } from '../../utils/transition';
import IconRowQuestions from '../../assets/icons/solar/list-ordered.svg?react';
import IconRowTime from '../../assets/icons/solar/clock-circle.svg?react';
import IconRowAge from '../../assets/icons/solar/user.svg?react';
import IconRowForm from '../../assets/icons/solar/document-text.svg?react';
import IconRowMain from '../../assets/icons/solar/list.svg?react';
import IconRowPoints from '../../assets/icons/solar/tuning-2.svg?react';
import IconRowBlind from '../../assets/icons/solar/incognito.svg?react';
import IconRowBlank from '../../assets/icons/solar/clipboard-check.svg?react';
import IconRowShuffle from '../../assets/icons/solar/shuffle.svg?react';
import IconLinkBlank from '../../assets/icons/solar/clipboard-list.svg?react';
import IconLinkConclusion from '../../assets/icons/solar/notebook.svg?react';
import IconRowMessage from '../../assets/icons/solar/chat-round-dots.svg?react';
import './TestSettings.css';
import './TestSettings.pm.css';

/** Строка текста для чтения (--line-height-read, typography.css): описание 16/25 */
const DESC_LINE = 25;
/** Высота свёрнутого описания: 6 строк и промежуток между абзацами 12, одинаково у всех тестов и заданий */
const DESC_COLLAPSED = 6 * DESC_LINE + 12;

type Svg = ComponentType<SVGProps<SVGSVGElement>>;

/** Что показано под шапкой: настройки, бланк, пример заключения или прохождение теста */
type View = 'settings' | 'blank' | 'conclusion' | 'pass';
const SETTINGS_TABS = ['Настройки', 'Описание', 'Материалы'];
const FORM_LABELS: Record<string, string> = { Мужская: 'Мужской', Женская: 'Женский' };
const FORM_DESCRIPTION = 'В зависимости от формы бланка меняется система подсчета баллов, что влияет на итоги тестирования';


const STATUS: Record<View, string> = {
  settings: 'Настройка тестирования',
  blank: 'Бланк тестирования',
  conclusion: 'Пример заключения',
  pass: 'Прохождение теста',
};

interface TestSettingsProps {
  test: LibraryTest;
  /** Чат клиента, из которого открыт тест; без него тест открыт из библиотеки */
  chatId?: string;
  /** Отправленная клиенту карточка теста: экран открывается только для просмотра, с теми настройками, с какими тест ушёл */
  sent?: Message;
  onBack: () => void;
}


/** Название строки с «?» в конце: значок прижат к последнему слову, и при переносе они не расходятся по разным строкам */
function labelWithHelp(label: string, help: OptionHelpId) {
  const cut = label.lastIndexOf(' ') + 1;
  return (
    <>
      {label.slice(0, cut)}
      <span className="ts-row__tail">
        {label.slice(cut)}
        <OptionHelp id={help} />
      </span>
    </>
  );
}

/** Строка карточки: подпись и значение или переключатель справа; под подписью может стоять пояснение; значок бывает только у способа показа вопросов */
export function Row({
  Icon,
  label,
  hint,
  help,
  value,
  info,
  children,
}: {
  Icon?: Svg;
  label: string;
  /** Пояснение мелким шрифтом под подписью: что делает настройка */
  hint?: string;
  /** Вместо пояснения: «?» справа от подписи, по нажатию окно со скриншотами (OptionHelp) */
  help?: OptionHelpId;
  /** Значение справа от подписи: строка превращается в «сведение» с тихой подписью */
  value?: string | number;
  info?: boolean;
  children?: React.ReactNode;
}) {
  const title = help ? labelWithHelp(label, help) : label;
  return (
    <li className={`ts-row${info || value !== undefined ? ' ts-row--info' : ''}`}>
      {Icon && <Icon className="ts-row__icon" />}
      {hint ? (
        <span className="ts-row__text">
          <span className="ts-row__label">{title}</span>
          <span className="ts-row__hint">{hint}</span>
        </span>
      ) : (
        <span className="ts-row__label">{title}</span>
      )}
      {value !== undefined && <span className="ts-row__value">{value}</span>}
      {children}
    </li>
  );
}

/** Поле, которое растёт по тексту */
export function MessageField({ value, onChange, limit = MESSAGE_LIMIT, id = 'ts-message', readOnly = false }: { value: string; onChange: (v: string) => void; limit?: number; id?: string; readOnly?: boolean }) {
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
      id={id}
      className="ts-message__input"
      rows={1}
      maxLength={limit}
      value={value}
      readOnly={readOnly}
      aria-label="Сообщение для клиента"
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/**
 * Экран «Настройка теста»: шапка с названием и сердечком, описание, шкалы, параметры,
 * сообщение клиенту, переключатели и кнопка «Пройти или отправить» над нижней панелью.
 */
export function TestSettings({ test, chatId, sent, onBack }: TestSettingsProps) {
  const data = testSettings(test);
  const sentOptions = sent ? (sent.testOptions ?? DEFAULT_SENT_OPTIONS) : undefined;
  const locked = Boolean(sent);
  const formDetails = locked ? '' : formHint(test.id);
  // «Особенности тестирования» в новом виде (пробный запуск): короткие названия и «?» с подсказкой вместо описаний
  // Тест, отправленный себе, открывается сразу прохождением, как у клиента; «назад» возвращает в чат
  const [passRequest] = useState(() => takePass(test.id));
  const [form, setForm] = useState(sentOptions?.form ?? (passRequest?.form || (data.forms?.[0] ?? '')));
  const [message, setMessage] = useState(sent ? sent.text : data.message);
  const [messageOn, setMessageOn] = useState(sent ? sent.text.trim() !== '' : true);
  const [blind, setBlind] = useState(sentOptions?.blind ?? true);
  const [result, setResult] = useState<ResultMode>(sentOptions?.result ?? 'thanks');
  const [shuffle, setShuffle] = useState(sentOptions?.shuffle ?? passRequest?.shuffle ?? false);
  const [saveBlank, setSaveBlank] = useState(sentOptions?.saveBlank ?? passRequest?.saveBlank ?? true);
  const [sheet, setSheet] = useState<'preview' | 'send' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Вместо настроек можно открыть бланк, пример заключения или прохождение; шапка та же
  const [view, setView] = useState<View>(passRequest && testBlank(test.id) ? 'pass' : 'settings');
  // Результат только что пройденного теста: открывается вместо настроек, «назад» возвращает к ним
  const [resultId, setResultId] = useState<string | null>(null);
  // Длинное описание свёрнуто до шести строк, пока его не раскроют
  const [settingsTab, setSettingsTab] = useState(0);
  const chips = useRef<HTMLDivElement>(null);
  const chipPosition = useRef(0);
  const syncChips = useCallback((position: number, via?: PositionVia) => {
    chipPosition.current = position;
    if (chips.current) followChips(chips.current.querySelectorAll<HTMLButtonElement>('.chip'), position, via);
  }, []);
  const [descOpen, setDescOpen] = useState(false);
  const [descFull, setDescFull] = useState(0);
  const descRef = useRef<HTMLDivElement>(null);
  const descLong = descFull > DESC_COLLAPSED + DESC_LINE;
  const blank = testBlank(test.id);
  const conclusion = conclusionFor(test.id);
  const toastTimer = useRef<number>();

  const notify = (text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  /** Тест уходит одному получателю, когда у него заполнилась обводка кнопки в окне «Отправить» */
  const deliver = (id: string) => {
    // В чат уходит карточка теста: сообщение клиенту, если оно включено, стоит в ней текстом, а настройки,
    // с которыми тест ушёл, лежат в ней же (их показывает кнопка «Настройки теста»)
    sendMessage(id, messageOn ? message : '', undefined, {
      test: test.id,
      testKind: 'sent',
      ...(id === SELF_ID ? { toSelf: true } : {}),
      testOptions: { blind, ...(blind ? { blindTitle: blindTitle() } : {}), result, saveBlank, shuffle, ...(data.forms ? { form } : {}) },
    });
    // Журнал действий (история, вкладка «Тесты») пока ведётся только у Максима
    if (id === 'maxim') logStep('test', test.id, 'sent');
  };
  const testUrl = `${window.location.href.split('#')[0]}#/tests/${test.id}`;
  const copyUrl = (url: string) => void copyText(url).then((ok) => notify(ok ? 'Ссылка скопирована' : 'Не удалось скопировать'));

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
  }, [view, resultId, settingsTab]);

  useLayoutEffect(() => {
    const row = chips.current;
    if (!row) return;
    const place = () => syncChips(chipPosition.current);
    place();
    const observer = new ResizeObserver(place);
    observer.observe(row);
    row.querySelectorAll('.chip').forEach((chip) => observer.observe(chip));
    return () => observer.disconnect();
  }, [view, resultId, syncChips]);
  // Бланк, заключение и прохождение открываются как следующий экран: выезжают справа, «назад» возвращает к настройкам
  const openView = (next: View) => transition(() => setView(next), next === 'settings' ? 'back' : 'forward');
  const openConclusion = () => (conclusion ? openView('conclusion') : notify('Пример заключения этого теста пока недоступен'));
  const openBlank = () => (blank ? openView('blank') : notify('Бланк этого теста пока недоступен'));
  // Жест «назад» из результата, бланка, заключения или прохождения ведёт к настройкам, как кнопка в шапке
  const stepBack = () => (passRequest && view === 'pass' ? onBack() : openView('settings'));
  useBackHandler(Boolean(resultId) || view !== 'settings', () =>
    resultId ? transition(() => setResultId(null), 'back') : stepBack(),
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

  // Тест, отправленный себе, открыт как у клиента: тот же интерфейс, только без «избранного» в шапке, с сообщением специалиста и «Спасибо» в конце;
  // слепой тест без названия и значка методики
  const live = Boolean(passRequest) && view === 'pass';

  return (
    <HelpContext.Provider value={{ test, blank: blank ?? null, conclusion: conclusion ?? null, form, duration: data.duration }}>
    <section className={`test-settings${locked ? ' test-settings--sent' : ''}`}>
      <TestHeader
        test={test}
        client={live ? { blind: passRequest?.blind, title: passRequest?.blindTitle } : undefined}
        status={live ? 'Тест от вашего специалиста' : locked && view === 'settings' ? 'Отправленный тест' : STATUS[view]}
        onBack={view === 'settings' ? onBack : stepBack}
      />

      {view === 'pass' && blank ? (
        <TestPass
          testId={test.id}
          blank={blank}
          form={form}
          saveBlank={saveBlank}
          shuffle={shuffle}
          client={passRequest ? { message: passRequest.message, result: passRequest.result, duration: data.duration, onExit: onBack } : undefined}
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
      <div ref={chips} className="screen-header__chips ts-settings-chips" role="group" aria-label="Разделы настройки теста" data-hscroll>
        <span className="chips-pill" aria-hidden="true" />
        {SETTINGS_TABS.map((label, index) => (
          <Chip key={label} tone="chat" follow active={index === settingsTab} onClick={() => setSettingsTab(index)}>{label}</Chip>
        ))}
      </div>
      <div className="ts-settings-tabs" data-no-swipe-back>
        <SwipePager index={settingsTab} onIndexChange={setSettingsTab} onPosition={syncChips} onEdgeSwipe={(direction) => {
          if (direction < 0) onBack();
        }} pages={[
          {
            key: 'setup',
            node: (
              <div className="test-settings__scroll ts-settings-page ts-settings-page--setup">
                <CollapseCard title="Прохождение" badge={<OptionHelp id="features" corner />}>
                  <ul className="ts-rows">
                    <Row Icon={IconRowBlind} label="Слепое тестирование" hint="Скрывает название и назначение теста для пользователя. Иногда, когда не знаешь какой тест выполняешь, — ответы честнее">
                      <Switch checked={blind} disabled={locked} onChange={setBlind} label="Слепое тестирование" />
                    </Row>
                    <Row Icon={IconRowShuffle} label="Перемешать вопросы" hint="Перемешивает тестовые вопросы в произвольном порядке. Так тест сложнее распознать, если проходишь его повторно">
                      <Switch checked={shuffle} disabled={locked} onChange={setShuffle} label="Перемешать вопросы" />
                    </Row>
                    {data.forms && (
                      <Row Icon={IconRowForm} label="Форма бланка" hint={FORM_DESCRIPTION}>
                        {data.forms.length === 1 ? <span className="ts-row__value">{form}</span> : (
                          <div className="ts-form-options">
                            <FormOptions
                              forms={data.forms}
                              value={form}
                              title="Форма бланка"
                              format={(option) => FORM_LABELS[option] ?? option}
                              disabled={locked}
                              onChange={setForm}
                            />
                            {formDetails && <p className="ts-row__hint">{formDetails}</p>}
                          </div>
                        )}
                      </Row>
                    )}
                  </ul>
                </CollapseCard>

                <CollapseCard title="Заключение">
                  <ul className="ts-rows">
                    <Row Icon={IconRowBlank} label="Сохранить бланк" hint="Сохраняет бланк тестирования, заполненный пользователем, в заключении. Помогает посмотреть критически важные вопросы и ответы">
                      <Switch checked={saveBlank} disabled={locked} onChange={setSaveBlank} label="Сохранить бланк" />
                    </Row>
                  </ul>
                  {conclusion && <ClientResultTiles value={result} onChange={setResult} disabled={locked} />}
                </CollapseCard>

                <section className="ts-card ts-message-card">
                  <ul className="ts-rows">
                    <Row Icon={IconRowMessage} label="Сообщение для клиента">
                      <Switch checked={messageOn} disabled={locked} onChange={setMessageOn} label="Сообщение для клиента" />
                    </Row>
                  </ul>
                  <div className={`blank-card__collapse${messageOn ? ' blank-card__collapse--open' : ''}`} aria-hidden={!messageOn}>
                    <div className="blank-card__inner">
                      <div className="blank-card__body ts-message">
                        <MessageField value={message} readOnly={locked} onChange={setMessage} />
                        <div className="ts-message__foot">
                          <span className="ts-message__count">
                            {chars} / {MESSAGE_LIMIT}
                          </span>
                          <button type="button" disabled={locked} className="ts-message__mic" aria-label="Надиктовать сообщение">
                            <IconTestMic />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            ),
          },
          {
            key: 'description',
            node: (
              <div className="test-settings__scroll ts-settings-page">
                <div className="ts-desc-unit">
                <CollapseCard title="Описание теста">
                  <div className="ts-desc">
                    <div className="ts-desc__clip">
                      <div ref={descRef} className="ts-desc__body" style={descLong ? { maxHeight: descOpen ? descFull : DESC_COLLAPSED } : undefined}>
                        <TestDescription intro={data.intro} lead={data.lead} />
                      </div>
                      {/* Свёрнуто: последние строки плавно уходят в белый, кнопка стоит под ними на белом */}
                      {descLong && <span className={`ts-desc__fade${descOpen ? ' ts-desc__fade--hidden' : ''}`} aria-hidden="true" />}
                    </div>
                  </div>
                </CollapseCard>
                {descLong && (
                  <button
                    type="button"
                    className={`ts-desc__toggle${descOpen ? ' ts-desc__toggle--open' : ''}`}
                    aria-expanded={descOpen}
                    onClick={(event) => {
                      const body = descRef.current;
                      anchorToggle(event.currentTarget, body, () => setDescOpen(!descOpen),
                        !descOpen && body ? { reveal: body, inset: body.offsetHeight } : undefined);
                    }}
                  >
                    <ReadMoreLabel open={descOpen} />
                  </button>
                )}
                </div>

                {(data.questions || data.duration || data.age) && (
                  <CollapseCard title="Тестовая информация">
                    <ul className="ts-rows">
                      {data.questions !== undefined && (
                        <Row Icon={IconRowQuestions} label="Количество вопросов" value={data.questions} />
                      )}
                      {data.duration && (
                        <Row Icon={IconRowTime} label="Время выполнения" value={data.duration} />
                      )}
                      {data.age && (
                        <Row Icon={IconRowAge} label="Возраст" value={data.age} />
                      )}
                    </ul>
                  </CollapseCard>
                )}
              </div>
            ),
          },
          {
            key: 'materials',
            node: (
              <div className="test-settings__scroll ts-settings-page">
                {(conclusion || blank) && (
                  <ul className="ts-actions">
                    {blank && <li>
                      <button type="button" className="ts-action" onClick={openBlank}>
                        <IconLinkBlank className="ts-action__icon" />
                        <span className="ts-action__label">Бланк</span>
                      </button>
                    </li>}
                    {conclusion && (
                      <li>
                        <button type="button" className="ts-action" onClick={openConclusion}>
                          <IconLinkConclusion className="ts-action__icon" />
                          <span className="ts-action__label">Пример</span>
                        </button>
                      </li>
                    )}
                  </ul>
                )}

                {data.scales && (
                  <CollapseCard title="Шкалы и баллы">
                    <ul className="ts-rows">
                      <li className="ts-row ts-row--top">
                        <IconRowMain className="ts-row__icon" />
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
                        <IconRowQuestions className="ts-row__icon" />
                        <div className="ts-scale">
                          <p className="ts-scale__title">Дополнительные шкалы:</p>
                          <ul className="ts-scale__list">
                            {data.scales.extra.map((s, i) => (
                              <li key={s} className={data.extraGroup && i > 0 && i % data.extraGroup === 0 ? 'ts-scale__gap' : undefined}>
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
                              <IconRowPoints className="ts-row__icon" />
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

                {!blank && !conclusion && !data.scales && <EmptyState icon={<IconRowForm />} title="Материалы пока недоступны" />}
              </div>
            ),
          },
        ]} />
      </div>

      {locked ? (
        <div className="ts-watermark" aria-hidden="true" />
      ) : (
        <div className="test-settings__cta">
          <button type="button" className="test-settings__cta-button test-settings__cta-button--ghost" onClick={() => setSheet('preview')}>
            Предпросмотр
          </button>
          <button type="button" className="test-settings__cta-button" onClick={() => setSheet('send')}>
            Использовать
          </button>
        </div>
      )}
      </>
      )}

      {toast && <Toast text={toast} className={view === 'settings' ? 'test-settings__toast--cta' : undefined} />}

      {sheet === 'preview' && blank && (
        <PreviewSheet title={test.title} onClose={() => setSheet(null)}>
          <TestPreview test={test} blank={blank} blind={blind} result={result} duration={data.duration} screen onClose={() => setSheet(null)} />
        </PreviewSheet>
      )}
      {sheet === 'send' && (
        <SendSheet noun="тест" title={test.title} url={testUrl} chatId={chatId} onDeliver={deliver} onCopy={copyUrl} onPass={() => { setSheet(null); if (testBlank(test.id)) openView('pass'); else notify('Прохождение этого теста пока недоступно'); }} onClose={() => setSheet(null)} />
      )}
    </section>
    </HelpContext.Provider>
  );
}
