import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconTestChevron, IconTestChevronDown, IconTestMic } from '../icons';
import { Switch } from '../Switch/Switch';
import { ScrollHost } from '../ScrollHost/ScrollHost';
import { Toast } from '../Toast/Toast';
import { SELF_ID } from './TestActions';
import { PreviewSheet, SendSheet } from './SendSheet';
import { copyText } from '../../utils/clipboard';
import { CollapseCard } from './TestBlank';
import { FormMenu } from './FormMenu';
import { MessageField, Row } from './TestSettings';
import { HelpContext } from '../OptionHelp/HelpScenes';
import { TestHeader } from './TestHeader';
import { TaskForm } from './TaskForm';
import { Paragraphs } from './TaskParts';
import { TaskPass } from './TaskPass';
import { TaskPreview } from './TaskPreview';
import { TaskResult } from './TaskResult';
import { sendMessage } from '../../data/chatStore';
import { logStep } from '../../data/clientStore';
import type { LibraryTask } from '../../data/library';
import type { Message } from '../../data/messages';
import {
  emptyValues,
  exampleValues,
  formText,
  limitText,
  PERMANENT_LIMITS,
  permanentNote,
  TASK_DEADLINES,
  TASK_MESSAGE_LIMIT,
  taskSettings,
  type PermanentRule,
  type TaskValues,
} from '../../data/taskSettings';
import { takeTaskPass } from '../../data/selfTask';
import { useBackHandler } from '../../utils/backHandler';
import { useSwipeBack } from '../../utils/swipeBack';
import { transition } from '../../utils/transition';
import './TestSettings.css';
import './TestSettings.pm.css';
import IconLinkBlank from '../../assets/icons/solar/clipboard-list.svg?react';
import IconLinkExample from '../../assets/icons/solar/notebook.svg?react';
import './TaskSettings.css';

/** Строка текста для чтения (--line-height-read, typography.css): описание 16/25 */
const DESC_LINE = 25;
/** Высота свёрнутого описания: 6 строк и промежуток между абзацами 12, одинаково у всех тестов и заданий */
const DESC_COLLAPSED = 6 * DESC_LINE + 12;

/** Что показано под шапкой: настройки, бланк, пример выполнения или выполнение самому */
type View = 'settings' | 'blank' | 'example' | 'pass';

const STATUS: Record<View, string> = {
  settings: 'Настройка задания',
  blank: 'Бланк задания',
  example: 'Пример выполнения',
  pass: 'Выполнение задания',
};

/** Бланк задания, как его увидит клиент: можно печатать, но написанное нигде не сохраняется */
function BlankView({ task, form, options }: { task: LibraryTask; form: string; options: { comment: boolean; state: boolean } }) {
  const data = taskSettings(task);
  const [values, setValues] = useState<TaskValues>(emptyValues);
  if (!data) return null;
  return <TaskForm data={data} form={form} options={options} values={values} onChange={setValues} rules />;
}

/** Пример выполнения: заполненный бланк и что можно отметить при разборе */
function ExampleView({ task, form, options }: { task: LibraryTask; form: string; options: { comment: boolean; state: boolean } }) {
  const data = taskSettings(task);
  if (!data) return null;
  return (
    <TaskForm
      data={data}
      form={form}
      options={options}
      values={exampleValues(data, form)}
      after={
        <CollapseCard title="Что можно отметить">
          <div className="task-pad">
            <ul className="ts-scale__list task-notes">
              {data.example.notes.map((note) => (
                <li key={note}>
                  <span className="ts-dot ts-dot--text" />
                  {note}
                </li>
              ))}
            </ul>
            <p className="task-hint">Пример учебный: выводы по реальному заданию делайте вместе с клиентом</p>
          </div>
        </CollapseCard>
      }
    />
  );
}

interface TaskSettingsProps {
  task: LibraryTask;
  /** Чат клиента, из которого открыто задание; без него задание открыто из раздела «Задания» */
  chatId?: string;
  /** Отправленная клиенту карточка задания: экран открывается только для просмотра, с теми настройками, с какими задание ушло */
  sent?: Message;
  onBack: () => void;
}

/**
 * Экран «Настройка задания»: шапка с названием и сердечком, описание, бланк, пример выполнения и предпросмотр,
 * информация, интерпретация (в начале подходы), особенности (комментарий, состояние), правила назначения
 * (постоянное задание с числом записей, а у обычного срок и напоминание), сообщение клиенту
 * и кнопка «Пройти или отправить» над нижней панелью.
 */
export function TaskSettings({ task, chatId, sent, onBack }: TaskSettingsProps) {
  const data = taskSettings(task);
  const so = sent?.taskOptions;
  const locked = Boolean(sent);
  const noop = () => undefined;
  // Задание, отправленное себе, открывается сразу выполнением, как у клиента; «назад» возвращает в чат
  const [passRequest] = useState(() => takeTaskPass(task.id));
  const [form, setForm] = useState(so?.form ?? (passRequest?.form || (data?.defaultForm ?? data?.forms?.[0] ?? '')));
  const [comment, setComment] = useState(so?.comment ?? passRequest?.comment ?? true);
  const [state, setState] = useState(so?.state ?? passRequest?.state ?? true);
  // Срока выполнения и напоминания в настройках нет: задание уходит без срока
  const deadline = passRequest?.deadline ?? TASK_DEADLINES[0];
  // Правила назначения: постоянное задание и сколько записей всего (0 — без ограничения)
  const [permanent, setPermanent] = useState(Boolean(so?.permanent));
  const [limit, setLimit] = useState(so?.permanent?.limit ?? 0);
  const [messageOn, setMessageOn] = useState(so ? so.note !== '' : true);
  const [message, setMessage] = useState(so ? so.note : (data?.message ?? ''));
  const [sheet, setSheet] = useState<'preview' | 'send' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<View>(passRequest && data ? 'pass' : 'settings');
  // Результат только что выполненного задания: открывается вместо настроек, «назад» возвращает к ним
  const [resultId, setResultId] = useState<string | null>(null);
  const toastTimer = useRef<number>();
  const [descOpen, setDescOpen] = useState(false);
  const [descFull, setDescFull] = useState(0);
  const descRef = useRef<HTMLDivElement>(null);
  const descLong = descFull > DESC_COLLAPSED + DESC_LINE;

  const notify = (text: string) => {
    setToast(text);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

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

  // Бланк, пример, выполнение и предпросмотр открываются как следующий экран: выезжают справа, «назад» возвращает к настройкам
  const openView = (next: View) => transition(() => setView(next), next === 'settings' ? 'back' : 'forward');
  const stepBack = () => (passRequest && view === 'pass' ? onBack() : openView('settings'));
  useBackHandler(Boolean(resultId) || view !== 'settings', () => (resultId ? transition(() => setResultId(null), 'back') : stepBack()));
  // Свайп вправо на настройках, бланке и примере — тот же «назад», что стрелка в шапке
  useSwipeBack('.test-settings', !resultId && (view === 'settings' || view === 'blank' || view === 'example'), () => (view === 'settings' ? onBack() : openView('settings')));

  if (!data) return null;
  const options = { comment, state };
  const formLabel = data.formLabel ?? 'Форма бланка';

  // Постоянное задание: срока и напоминания у него нет, вместо них в сообщении строка про постоянство и число записей
  const rule: PermanentRule | undefined = permanent ? (limit ? { limit } : {}) : undefined;

  // Сообщение клиенту и, если выбран, срок или правило: клиент видит их в карточке задания
  const note = messageOn ? message.trim() : '';
  const ruleLine = rule ? permanentNote(rule) : deadline !== TASK_DEADLINES[0] ? `Срок выполнения: ${deadline.toLowerCase()}.` : '';
  const outgoing = [note, ruleLine].filter(Boolean).join('\n\n');

  /** Задание уходит одному получателю, когда у него заполнилась обводка кнопки в окне «Отправить» */
  const deliver = (id: string) => {
    // В чат уходит карточка задания; настройки, с которыми оно ушло, лежат в ней же (их показывает кнопка «Настройки задания»)
    sendMessage(id, outgoing, undefined, {
      task: task.id,
      ...(id === SELF_ID ? { toSelf: true } : {}),
      taskOptions: {
        ...(data.forms ? { form, ...(data.formLabel ? { formLabel: data.formLabel } : {}) } : {}),
        comment,
        state,
        deadline: rule ? TASK_DEADLINES[0] : deadline,
        remind: false,
        note,
        ...(rule ? { permanent: rule } : {}),
      },
    });
    // Журнал действий (история, вкладка «Задания») пока ведется только у Максима
    if (id === 'maxim') logStep('task', task.id, 'sent', rule ? { permanent: rule } : undefined);
  };
  const taskUrl = `${window.location.href.split('#')[0]}#/tasks/${task.id}`;
  const copyUrl = (url: string) => void copyText(url).then((ok) => notify(ok ? 'Ссылка скопирована' : 'Не удалось скопировать'));

  const link = (label: string, next: View) => {
    const Icon = next === 'blank' ? IconLinkBlank : IconLinkExample;
    return (
    <li className="ts-row ts-row--link" role="button" tabIndex={0} onClick={() => openView(next)} onKeyDown={(e) => e.key === 'Enter' && openView(next)}>
      <Icon className="ts-row__icon" />
      <span className="ts-row__link">{label}</span>
      <IconTestChevron className="ts-row__chevron" />
    </li>
    );
  };

  const select = (label: string, value: string, values: string[], onChange: (v: string) => void) => (
    <label className="ts-select">
      <span className="ts-select__value">{value}</span>
      <IconTestChevronDown className="ts-select__chevron" />
      <select className="ts-select__native" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
        {values.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </label>
  );

  if (resultId) {
    return (
      <>
        <TaskResult resultId={resultId} onBack={() => transition(() => setResultId(null), 'back')} />
        {toast && <Toast text={toast} />}
      </>
    );
  }

  // Задание, отправленное себе, открыто как у клиента: тот же интерфейс, только без «избранного» в шапке, с сообщением специалиста и «Спасибо» в конце
  const live = Boolean(passRequest) && view === 'pass';
  // Полоса шагов лежит внутри шапки: шапка и она — одна стеклянная панель
  const [stripSlot, setStripSlot] = useState<HTMLDivElement | null>(null);

  return (
    <HelpContext.Provider value={{ test: task, task: { data }, blank: null, conclusion: null, form, duration: data.duration }}>
    <section className={`test-settings${locked ? ' test-settings--sent' : ''}`}>
      <TestHeader
        test={task}
        kind="task"
        client={live ? {} : undefined}
        status={live ? 'Задание от вашего специалиста' : locked && view === 'settings' ? 'Отправленное задание' : STATUS[view]}
        onBack={view === 'settings' ? onBack : stepBack}
        slotRef={view === 'pass' ? setStripSlot : undefined}
      />

      {view === 'pass' ? (
        <TaskPass
          stripHost={stripSlot}
          taskId={task.id}
          data={data}
          form={form}
          options={options}
          client={
            passRequest
              ? { message: passRequest.message, deadline: passRequest.deadline, permanent: passRequest.permanent, assignment: passRequest.assignment, onExit: onBack }
              : undefined
          }
          onDone={(id) => {
            // Результат открывается сразу; его копия лежит в «Избранное» → «Задания», в чате — сообщение с кнопкой
            transition(() => {
              setView('settings');
              setResultId(id);
              notify('Результат задания сохранён в избранном');
            }, 'forward');
          }}
        />
      ) : view === 'blank' ? (
        <ScrollHost className="test-settings__scroll" key="blank">
          <BlankView task={task} form={form} options={options} />
        </ScrollHost>
      ) : view === 'example' ? (
        <ScrollHost className="test-settings__scroll" key="example">
          <ExampleView task={task} form={form} options={options} />
        </ScrollHost>
      ) : (
        <>
          <div className="test-settings__scroll">
            <div className="ts-desc-unit">
            <CollapseCard title="Описание задания">
              <div className="ts-desc">
                <div className="ts-desc__clip">
                  <div ref={descRef} className="ts-desc__body" style={descLong ? { maxHeight: descOpen ? descFull : DESC_COLLAPSED } : undefined}>
                    <Paragraphs text={data.intro} lead={data.lead} />
                  </div>
                  {descLong && <span className={`ts-desc__fade${descOpen ? ' ts-desc__fade--hidden' : ''}`} aria-hidden="true" />}
                </div>
              </div>
            </CollapseCard>
            {descLong && (
              <button type="button" className={`ts-desc__toggle${descOpen ? ' ts-desc__toggle--open' : ''}`} aria-expanded={descOpen} onClick={() => setDescOpen(!descOpen)}>
                {descOpen ? 'Скрыть' : 'Читать далее'}
              </button>
            )}
            </div>

            <ul className="ts-card">
              {link('Бланк задания', 'blank')}
              {link('Пример выполнения', 'example')}
            </ul>

            <CollapseCard title="Общая информация">
              <ul className="ts-rows">
                <Row label="Время выполнения" value={data.duration} />
                <Row label="Возраст" value={data.age} />
              </ul>
            </CollapseCard>

            <CollapseCard title="Интерпретация задания">
              <ul className="ts-rows">
                <li className="ts-row ts-row--top">
                  <div className="ts-scale">
                    <p className="ts-scale__title">Цель задания:</p>
                    <div className="task-pad task-pad--inline">
                      <Paragraphs text={data.goal} />
                    </div>
                  </div>
                </li>
                <li className="ts-row ts-row--top">
                  <div className="ts-scale">
                    <p className="ts-scale__title">Анализ материалов:</p>
                    <div className="task-pad task-pad--inline">
                      <Paragraphs text={data.analysis} />
                    </div>
                  </div>
                </li>
              </ul>
            </CollapseCard>

            <CollapseCard title="Особенности задания">
              <ul className="ts-rows">
                {/* Выбор формы бланка (у заданий с записями — «Количество записей») */}
                {data.formCount && data.forms ? (
                  <Row label={formLabel} info value={locked ? formText(data, form) : undefined}>
                    {!locked && <FormMenu forms={data.forms} value={form} title={formLabel} hint={data.formHint} format={(v) => formText(data, v)} onChange={setForm} />}
                  </Row>
                ) : (
                  data.forms && (
                    <Row label={formLabel} info value={locked ? form : data.forms.length === 1 ? data.forms[0] : undefined}>
                      {!locked && data.forms.length > 1 && <FormMenu forms={data.forms} value={form} title={formLabel} hint={data.formHint} onChange={setForm} />}
                    </Row>
                  )
                )}
                <Row label="Комментарий клиента" help="comment">
                  <Switch checked={comment} onChange={locked ? noop : setComment} label="Комментарий клиента" />
                </Row>
                <Row label="Оценить состояние" help="state">
                  <Switch checked={state} onChange={locked ? noop : setState} label="Оценить состояние" />
                </Row>
                <Row label="Назначить постоянным">
                  <Switch checked={permanent} onChange={locked ? noop : setPermanent} label="Назначить постоянным" />
                </Row>
                <li className={`ts-fold${permanent ? ' ts-fold--open' : ''}`} aria-hidden={!permanent}>
                  <div className="ts-fold__inner">
                    <ul className="ts-rows">
                      <Row label="Всего записей" info value={locked ? limitText(limit) : undefined}>
                        {!locked && select('Всего записей', limitText(limit), PERMANENT_LIMITS.map(limitText), (v) => setLimit(PERMANENT_LIMITS[PERMANENT_LIMITS.map(limitText).indexOf(v)] ?? 0))}
                      </Row>
                    </ul>
                  </div>
                </li>
              </ul>
            </CollapseCard>


            <section className="ts-card ts-message-card">
              <ul className="ts-rows">
                <Row label="Сообщение для клиента">
                  <Switch checked={messageOn} onChange={locked ? noop : setMessageOn} label="Сообщение для клиента" />
                </Row>
              </ul>
              <div className={`blank-card__collapse${messageOn ? ' blank-card__collapse--open' : ''}`} aria-hidden={!messageOn}>
                <div className="blank-card__inner">
                  <div className="blank-card__body ts-message">
                    <MessageField value={message} onChange={locked ? noop : setMessage} limit={TASK_MESSAGE_LIMIT} />
                    <div className="ts-message__foot">
                      <span className="ts-message__count">
                        {message.length} / {TASK_MESSAGE_LIMIT}
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

          {locked ? (
            <div className="ts-watermark ts-watermark--task" aria-hidden="true" />
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

      {sheet === 'preview' && (
        <PreviewSheet title={task.title} onClose={() => setSheet(null)}>
          {(tabsHost) => <TaskPreview task={task} data={data} form={form} options={options} deadline={deadline} permanent={rule} tabsHost={tabsHost} />}
        </PreviewSheet>
      )}
      {sheet === 'send' && <SendSheet noun="задание" title={task.title} url={taskUrl} chatId={chatId} onDeliver={deliver} onCopy={copyUrl} onPass={() => { setSheet(null); openView('pass'); }} onClose={() => setSheet(null)} />}
    </section>
    </HelpContext.Provider>
  );
}
