import { Chip } from '../Chip/Chip';
import { EmptyState } from '../EmptyState/EmptyState';
import { SwipePager } from '../SwipePager/SwipePager';
import { ScaleChips } from './ScaleChips';
import { followChips, type PositionVia } from '../../utils/followChips';
import { TestDescription } from './TestDescription';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ComponentType, type SVGProps } from 'react';
import {
  IconTestChevronDown,
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
import { SAVE_BLANK_LABEL, type OptionHelpId } from '../../data/optionHelp';
import { CollapseCard, TestBlank } from './TestBlank';
import { TestConclusion } from './TestConclusion';
import { formatTestForm } from './FormMenu';
import { RESULT_MODES, blindTitle, type ResultMode } from '../../data/resultMode';
import { TestHeader } from './TestHeader';
import { TestPreview } from './TestPreview';
import { ScrollHost } from '../ScrollHost/ScrollHost';
import { TestPass } from './TestPass';
import { TestResult } from './TestResult';
import { conclusionFor } from '../../data/conclusions';
import { formHint, takePass } from '../../data/selfTest';
import { Toast } from '../Toast/Toast';
import { useBackHandler } from '../../utils/backHandler';
import { useSwipeBack } from '../../utils/swipeBack';
import { transition } from '../../utils/transition';
import IconRowQuestions from '../../assets/icons/solar/list-ordered.svg?react';
import IconRowTime from '../../assets/icons/solar/clock-circle.svg?react';
import IconRowAge from '../../assets/icons/solar/user.svg?react';
import IconRowForm from '../../assets/icons/solar/document-text.svg?react';
import IconRowResult from '../../assets/icons/solar/eye.svg?react';
import IconRowBlind from '../../assets/icons/solar/incognito.svg?react';
import IconRowBlank from '../../assets/icons/solar/clipboard-check.svg?react';
import IconRowShuffle from '../../assets/icons/solar/shuffle.svg?react';
import IconRowMain from '../../assets/icons/solar/list.svg?react';
import IconRowPoints from '../../assets/icons/solar/tuning-2.svg?react';
import IconRowMessage from '../../assets/icons/solar/chat-round-dots.svg?react';
import './TestSettings.css';
import './TestSettings.pm.css';

type Svg = ComponentType<SVGProps<SVGSVGElement>>;

/** Что показано под шапкой: настройки, бланк, пример заключения или прохождение теста */
type View = 'settings' | 'blank' | 'conclusion' | 'pass';
const SETTINGS_TABS = ['Настройки', 'Описание', 'Материалы'];
const CHOICE_CONFIRM_MS = 420;
const COMPLETION_OPTIONS = RESULT_MODES.map(({ id, short }) => ({ value: id, label: id === 'thanks' ? 'Спасибо' : short }));

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
      {Icon && <Icon className="ts-row__icon" aria-hidden="true" />}
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

function SettingChoice<T extends string>({ Icon, label, hint, value, options, disabled, active, onChange }: {
  Icon: Svg;
  label: string;
  hint: string;
  value: T;
  options: { value: T; label: string }[];
  disabled: boolean;
  active: boolean;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number>();
  const selected = options.find((option) => option.value === value)?.label ?? value;

  useLayoutEffect(() => {
    const menu = menuRef.current;
    const button = trigger.current;
    if (!menu || !button) return;

    const position = () => {
      const anchor = button.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewportTop = viewport?.offsetTop ?? 0;
      const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
      const above = anchor.top - viewportTop;
      const below = viewportBottom - anchor.bottom;
      const styles = getComputedStyle(menu);
      const space = parseFloat(styles.getPropertyValue('--space-1'));
      const rowHeight = parseFloat(styles.getPropertyValue('--size-touch')) + space;
      const opensAbove = below < options.length * rowHeight + 2 * space && above > below;
      menu.dataset.side = opensAbove ? 'above' : 'below';
      menu.style.top = opensAbove ? 'auto' : `${anchor.bottom + space}px`;
      menu.style.bottom = opensAbove ? `${window.innerHeight - anchor.top + space}px` : 'auto';
      menu.style.right = `${Math.max(0, document.documentElement.clientWidth - anchor.right)}px`;
      menu.style.minWidth = `${anchor.width}px`;
      menu.style.maxHeight = `${Math.max(0, (opensAbove ? above : below) - 2 * space)}px`;
    };

    const beforeToggle = (event: ToggleEvent) => {
      if (event.newState === 'open') position();
    };
    const onToggle = () => {
      window.clearTimeout(closeTimer.current);
      setOpen(menu.matches(':popover-open'));
    };
    const onScroll = (event: Event) => {
      if (!menu.contains(event.target as Node) && menu.matches(':popover-open')) menu.hidePopover();
    };
    menu.addEventListener('beforetoggle', beforeToggle);
    menu.addEventListener('toggle', onToggle);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', position);
    return () => {
      window.clearTimeout(closeTimer.current);
      menu.removeEventListener('beforetoggle', beforeToggle);
      menu.removeEventListener('toggle', onToggle);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', position);
    };
  }, [options.length]);

  useEffect(() => {
    const menu = menuRef.current;
    if (!active && menu?.matches(':popover-open')) menu.hidePopover();
  }, [active]);

  if (options.length < 2) {
    return <Row Icon={Icon} label={label} hint={hint}><span className="ts-row__value">{selected}</span></Row>;
  }

  if (typeof HTMLElement.prototype.showPopover !== 'function') {
    return (
      <Row Icon={Icon} label={label} hint={hint}>
        <select className="ts-select ts-select--settings" aria-label={label} disabled={disabled} value={value} onChange={(event) => {
          const option = options.find((option) => option.value === event.currentTarget.value);
          if (option) onChange(option.value);
        }}>
          {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </Row>
    );
  }

  return (
    <Row Icon={Icon} label={label} hint={hint}>
      <button
        ref={trigger}
        type="button"
        className="ts-select ts-select--settings"
        aria-label={`${label}: ${selected}`}
        aria-controls={menuId}
        aria-expanded={open}
        disabled={disabled}
        {...{ popovertarget: menuId }}
      >
        <span className="ts-select__value">{selected}</span>
        <IconTestChevronDown className="ts-select__chevron" aria-hidden="true" />
      </button>
      <div ref={menuRef} id={menuId} className="blank-answers ts-choice-menu" role="group" aria-label={label} {...{ popover: 'auto' }}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className="blank-answer"
            aria-pressed={option.value === value}
            onClick={() => {
              onChange(option.value);
              window.clearTimeout(closeTimer.current);
              closeTimer.current = window.setTimeout(() => {
                const menu = menuRef.current;
                if (menu?.matches(':popover-open')) menu.hidePopover();
              }, CHOICE_CONFIRM_MS);
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </Row>
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
  const [settingsTab, setSettingsTab] = useState(0);
  const chips = useRef<HTMLDivElement>(null);
  const chipPosition = useRef(0);
  const syncChips = useCallback((position: number, via?: PositionVia) => {
    chipPosition.current = position;
    if (chips.current) followChips(chips.current.querySelectorAll<HTMLButtonElement>('.chip'), position, via);
  }, []);
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
    <HelpContext.Provider value={{ test, blank: blank ?? null, conclusion: conclusion ?? null, form, testForms: data.forms, formDetails: formHint(test.id), duration: data.duration }}>
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
                <CollapseCard title="Прохождение">
                  <ul className="ts-rows">
                    <Row Icon={IconRowBlind} label="Слепое тестирование" hint="Скрыть название и цель теста">
                      <Switch checked={blind} disabled={locked} onChange={setBlind} label="Слепое тестирование" />
                    </Row>
                    <Row Icon={IconRowShuffle} label="Перемешать вопросы" hint="Вопросы в произвольном порядке">
                      <Switch checked={shuffle} disabled={locked} onChange={setShuffle} label="Перемешать вопросы" />
                    </Row>
                    {data.forms && (
                      <SettingChoice
                        Icon={IconRowForm}
                        label="Форма бланка"
                        hint="Особенности подсчёта"
                        value={form}
                        options={data.forms.map((form) => ({ value: form, label: formatTestForm(form) }))}
                        disabled={locked}
                        active={settingsTab === 0}
                        onChange={setForm}
                      />
                    )}
                  </ul>
                </CollapseCard>

                <CollapseCard title="Заключение">
                  <ul className="ts-rows">
                    <Row Icon={IconRowBlank} label={SAVE_BLANK_LABEL} hint="Остается в заключении теста">
                      <Switch checked={saveBlank} disabled={locked} onChange={setSaveBlank} label={SAVE_BLANK_LABEL} />
                    </Row>
                    {conclusion && (
                      <SettingChoice
                        Icon={IconRowResult}
                        label="Экран завершения"
                        hint="Что видит клиент"
                        value={result}
                        options={COMPLETION_OPTIONS}
                        disabled={locked}
                        active={settingsTab === 0}
                        onChange={setResult}
                      />
                    )}
                  </ul>
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
                {(data.questions || data.duration || data.age) && (
                  <CollapseCard title="Тестовая информация">
                    <ul className="ts-rows ts-info-rows">
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
                <CollapseCard title="Описание теста">
                  <div className="ts-desc">
                    <TestDescription intro={data.intro} lead={data.lead} />
                  </div>
                </CollapseCard>
              </div>
            ),
          },
          {
            key: 'materials',
            node: (
              <div className="test-settings__scroll ts-settings-page">
                {(conclusion || blank) && (
                  <ul className="ts-actions ts-actions--materials">
                    {blank && <li>
                      <button type="button" className="ts-action" onClick={openBlank}>
                        <span className="ts-action__label">Бланк<br />тестирования</span>
                      </button>
                    </li>}
                    {conclusion && (
                      <li>
                        <button type="button" className="ts-action" onClick={openConclusion}>
                          <span className="ts-action__label">Пример<br />заключения</span>
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
                          <ScaleChips testId={test.id} scales={data.scales.main} />
                        </div>
                      </li>
                      {data.scales.extra.length > 0 && (
                      <li className="ts-row ts-row--top">
                        <IconRowQuestions className="ts-row__icon" />
                        <div className="ts-scale">
                          <p className="ts-scale__title">Дополнительные шкалы:</p>
                          <ScaleChips testId={test.id} scales={data.scales.extra} groupSize={data.extraGroup} />
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
