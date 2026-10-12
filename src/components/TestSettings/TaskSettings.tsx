import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconTestChevron, IconTestChevronDown, IconTestMic } from '../icons';
import { Switch } from '../Switch/Switch';
import { ScrollHost } from '../ScrollHost/ScrollHost';
import { Toast } from '../Toast/Toast';
import { ActionSheet, RecipientSheet, SELF_ID, type TestAction } from './TestActions';
import { CollapseCard } from './TestBlank';
import { FormMenu } from './FormMenu';
import { MessageField, Row, TopicTags } from './TestSettings';
import { TestHeader } from './TestHeader';
import { TaskForm } from './TaskForm';
import { Paragraphs } from './TaskParts';
import { TaskPass } from './TaskPass';
import { TaskPreview } from './TaskPreview';
import { TaskResult } from './TaskResult';
import { CHATS } from '../../data/chats';
import { sendMessage } from '../../data/chatStore';
import { logStep } from '../../data/clientStore';
import type { LibraryTask } from '../../data/library';
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
import './TaskSettings.css';

/** Высота свернутого описания: 6 строк по 22 и промежуток между абзацами 12, как у тестов */
const DESC_COLLAPSED = 6 * 22 + 12;

/** Что показано под шапкой: настройки, бланк, пример выполнения, выполнение самому или предпросмотр */
type View = 'settings' | 'blank' | 'example' | 'pass' | 'preview';

const STATUS: Record<View, string> = {
  settings: 'Настройка задания',
  blank: 'Бланк задания',
  example: 'Пример выполнения',
  pass: 'Выполнение задания',
  preview: 'Предпросмотр задания',
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
  onBack: () => void;
}

/**
 * Экран «Настройка задания»: шапка с названием и сердечком, описание, бланк, пример выполнения и предпросмотр,
 * информация, интерпретация (в начале подходы), особенности (комментарий, состояние), правила назначения
 * (постоянное задание с числом записей, а у обычного срок и напоминание), сообщение клиенту
 * и кнопка «Пройти или отправить» над нижней панелью.
 */
export function TaskSettings({ task, chatId, onBack }: TaskSettingsProps) {
  const data = taskSettings(task);
  // Задание, отправленное себе, открывается сразу выполнением, как у клиента; «назад» возвращает в чат
  const [passRequest] = useState(() => takeTaskPass(task.id));
  const [form, setForm] = useState(passRequest?.form || (data?.defaultForm ?? data?.forms?.[0] ?? ''));
  const [comment, setComment] = useState(passRequest?.comment ?? true);
  const [state, setState] = useState(passRequest?.state ?? true);
  const [remind, setRemind] = useState(true);
  const [deadline, setDeadline] = useState(passRequest?.deadline ?? TASK_DEADLINES[0]);
  // Правила назначения: постоянное задание и сколько записей всего (0 — без ограничения)
  const [permanent, setPermanent] = useState(false);
  const [limit, setLimit] = useState(0);
  const [messageOn, setMessageOn] = useState(true);
  const [message, setMessage] = useState(data?.message ?? '');
  const [sheet, setSheet] = useState<'actions' | 'one' | 'many' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<View>(passRequest && data ? 'pass' : 'settings');
  // Результат только что выполненного задания: открывается вместо настроек, «назад» возвращает к ним
  const [resultId, setResultId] = useState<string | null>(null);
  const toastTimer = useRef<number>();
  const [descOpen, setDescOpen] = useState(false);
  const [descFull, setDescFull] = useState(0);
  const descRef = useRef<HTMLDivElement>(null);
  const descLong = descFull > DESC_COLLAPSED + 22;

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

  const send = (ids: string[]) => {
    ids.forEach((id) => {
      // В чат уходит карточка задания; настройки, с которыми оно ушло, лежат в ней же (их показывает кнопка «Настройки задания»)
      sendMessage(id, outgoing, undefined, {
        task: task.id,
        ...(id === SELF_ID ? { toSelf: true } : {}),
        taskOptions: {
          ...(data.forms ? { form, ...(data.formLabel ? { formLabel: data.formLabel } : {}) } : {}),
          comment,
          state,
          deadline: rule ? TASK_DEADLINES[0] : deadline,
          remind: rule ? false : remind,
          note,
          ...(rule ? { permanent: rule } : {}),
        },
      });
      // Журнал действий (история, вкладка «Задания») пока ведется только у Максима
      if (id === 'maxim') logStep('task', task.id, 'sent', rule ? { permanent: rule } : undefined);
    });
    setSheet(null);
    const names = ids.map((id) => CHATS.find((c) => c.id === id)?.name).filter(Boolean);
    notify(
      ids.length === 1
        ? ids[0] === SELF_ID
          ? 'Задание отправлено вам: оно в «Избранном»'
          : `Задание отправлено: ${names[0]}`
        : `Задание отправлено: ${ids.length} получателям`,
    );
  };

  const pick = (action: TestAction) => {
    if (action === 'self') {
      transition(() => {
        setSheet(null);
        setView('pass');
      }, 'forward');
    } else if (action === 'one' && chatId) send([chatId]);
    else setSheet(action);
  };

  const link = (label: string, next: View) => (
    <li className="ts-row ts-row--link" role="button" tabIndex={0} onClick={() => openView(next)} onKeyDown={(e) => e.key === 'Enter' && openView(next)}>
      <span className="ts-row__link">{label}</span>
      <IconTestChevron className="ts-row__chevron" />
    </li>
  );

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

  return (
    <section className="test-settings">
      <TestHeader
        test={task}
        kind="task"
        client={live ? {} : undefined}
        status={live ? 'Задание от вашего специалиста' : STATUS[view]}
        onBack={view === 'settings' ? onBack : stepBack}
      />

      {view === 'pass' ? (
        <TaskPass
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
      ) : view === 'preview' ? (
        <TaskPreview task={task} data={data} form={form} options={options} message={note} deadline={deadline} permanent={rule} onExit={() => openView('settings')} />
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
            <CollapseCard title="Описание задания">
              <div className="ts-desc">
                <div className="ts-desc__clip">
                  <div ref={descRef} className="ts-desc__body" style={descLong ? { maxHeight: descOpen ? descFull : DESC_COLLAPSED } : undefined}>
                    <Paragraphs text={data.intro} lead={data.lead} />
                  </div>
                  {descLong && <span className={`ts-desc__fade${descOpen ? ' ts-desc__fade--hidden' : ''}`} aria-hidden="true" />}
                </div>
                {descLong && <hr className="ts-desc__rule" />}
                {descLong && (
                  <button type="button" className={`ts-desc__toggle${descOpen ? ' ts-desc__toggle--open' : ''}`} aria-expanded={descOpen} onClick={() => setDescOpen(!descOpen)}>
                    {descOpen ? 'Скрыть' : 'Читать далее'}
                  </button>
                )}
              </div>
            </CollapseCard>

            <ul className="ts-card">
              {link('Бланк задания', 'blank')}
              {link('Пример выполнения', 'example')}
              {link('Предпросмотр', 'preview')}
            </ul>

            <CollapseCard title="Информация о задании">
              <ul className="ts-rows">
                {/* У заданий с записями объём задан выбором формы («Количество записей»): он стоит на месте объёма */}
                {data.formCount && data.forms ? (
                  <Row label={formLabel} info>
                    <FormMenu forms={data.forms} value={form} title={formLabel} hint={data.formHint} format={(v) => formText(data, v)} onChange={setForm} />
                  </Row>
                ) : (
                  <Row label={data.volume.label} value={data.volume.value} />
                )}
                <Row label="Время выполнения" value={data.duration} />
                <Row label="Время обсуждения" value={data.discussion} />
                <Row label="Возраст" value={data.age} />
                {data.forms && !data.formCount && (
                  <Row label={formLabel} info value={data.forms.length === 1 ? data.forms[0] : undefined}>
                    {data.forms.length > 1 && <FormMenu forms={data.forms} value={form} title={formLabel} hint={data.formHint} onChange={setForm} />}
                  </Row>
                )}
              </ul>
            </CollapseCard>

            <CollapseCard title="Интерпретация задания">
              <ul className="ts-rows">
                <li className="ts-row ts-row--top">
                  <div className="ts-scale">
                    <p className="ts-scale__title">Направления:</p>
                    <ul className="task-approaches">
                      {data.approaches.map((approach) => (
                        <li key={approach} className="task-approaches__tag">
                          {approach}
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
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
                <Row label="Разрешить комментарий клиента" hint="Клиент сможет дописать свои мысли после выполнения">
                  <Switch checked={comment} onChange={setComment} label="Разрешить комментарий клиента" />
                </Row>
                <Row label="Оценить психоэмоциональное состояние" hint="Клиент отметит самочувствие по шкале, чтобы вы видели динамику">
                  <Switch checked={state} onChange={setState} label="Оценить психоэмоциональное состояние" />
                </Row>
              </ul>
            </CollapseCard>

            <CollapseCard title="Правила назначения">
              <ul className="ts-rows">
                <Row label="Назначить постоянным" hint="Задание можно выполнять не один раз, а когда нужно, например записывать сны. Каждый раз — новая запись">
                  <Switch checked={permanent} onChange={setPermanent} label="Назначить постоянным" />
                </Row>
                <li className={`ts-fold${permanent ? ' ts-fold--open' : ''}`} aria-hidden={!permanent}>
                  <div className="ts-fold__inner">
                    <ul className="ts-rows">
                      <Row label="Всего записей" info>
                        {select('Всего записей', limitText(limit), PERMANENT_LIMITS.map(limitText), (v) => setLimit(PERMANENT_LIMITS[PERMANENT_LIMITS.map(limitText).indexOf(v)] ?? 0))}
                      </Row>
                    </ul>
                  </div>
                </li>
                <li className={`ts-fold${permanent ? '' : ' ts-fold--open'}`} aria-hidden={permanent}>
                  <div className="ts-fold__inner">
                    <ul className="ts-rows">
                      <Row label="Срок выполнения" info hint="Срок будет указан в сообщении с заданием">
                        {select('Срок выполнения', deadline, TASK_DEADLINES, setDeadline)}
                      </Row>
                      <Row
                        label="Напомнить, если не выполнено"
                        hint={deadline === TASK_DEADLINES[0] ? 'Заработает, когда выберете срок выполнения' : 'Клиент получит напоминание, когда срок подойдет к концу'}
                      >
                        <Switch checked={remind} onChange={setRemind} label="Напомнить, если не выполнено" />
                      </Row>
                    </ul>
                  </div>
                </li>
              </ul>
            </CollapseCard>

            <section className="ts-card ts-message-card">
              <ul className="ts-rows">
                <Row label="Сообщение для клиента" hint="Короткое пояснение придет вместе с заданием">
                  <Switch checked={messageOn} onChange={setMessageOn} label="Сообщение для клиента" />
                </Row>
              </ul>
              <div className={`blank-card__collapse${messageOn ? ' blank-card__collapse--open' : ''}`} aria-hidden={!messageOn}>
                <div className="blank-card__inner">
                  <div className="blank-card__body ts-message">
                    <MessageField value={message} onChange={setMessage} limit={TASK_MESSAGE_LIMIT} />
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

            <TopicTags id={task.id} />
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
      {(sheet === 'one' || sheet === 'many') && <RecipientSheet mode={sheet} onSend={send} onClose={() => setSheet(null)} />}
    </section>
  );
}
