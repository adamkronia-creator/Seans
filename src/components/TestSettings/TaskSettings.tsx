import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { IconTestChevron, IconTestChevronDown } from '../icons';
import { Switch } from '../Switch/Switch';
import { ScrollHost } from '../ScrollHost/ScrollHost';
import { Toast } from '../Toast/Toast';
import { ActionSheet, RecipientSheet, type TestAction } from './TestActions';
import { BlankRules, CollapseCard } from './TestBlank';
import { IconTaskState } from './TaskIcons';
import { MessageField, Row } from './TestSettings';
import { TestHeader } from './TestHeader';
import { CHATS } from '../../data/chats';
import { sendMessage } from '../../data/chatStore';
import { logStep } from '../../data/clientStore';
import type { LibraryTask } from '../../data/library';
import { TASK_DEADLINES, TASK_MESSAGE_LIMIT, taskSettings, type TaskSettingsData } from '../../data/taskSettings';
import { useBackHandler } from '../../utils/backHandler';
import { useSwipeBack } from '../../utils/swipeBack';
import { transition } from '../../utils/transition';
import './TestSettings.css';
import './TaskSettings.css';

/** Высота свернутого описания: 6 строк по 22 и промежуток между абзацами 12, как у тестов */
const DESC_COLLAPSED = 6 * 22 + 12;

type View = 'settings' | 'blank' | 'example';

const STATUS: Record<View, string> = {
  settings: 'Настройка задания',
  blank: 'Бланк задания',
  example: 'Пример выполнения',
};

/** Что включено в настройках: от этого зависит, что есть в бланке и примере */
interface Options {
  comment: boolean;
  state: boolean;
}

function Paragraphs({ text, lead }: { text: string; lead?: string }) {
  return (
    <>
      {text.split('\n\n').map((paragraph, i) => (
        <div key={i} className="ts-card__paragraph">
          <p>
            {i === 0 && lead && paragraph.startsWith(lead) ? (
              <>
                <strong>{lead}</strong>
                {paragraph.slice(lead.length)}
              </>
            ) : (
              paragraph
            )}
          </p>
        </div>
      ))}
    </>
  );
}

/** Поле ответа в бланке: растет по тексту; в бланке задания можно печатать (ничего не сохраняется) */
function AnswerField({ label, placeholder }: { label: string; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState('');
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      className="task-field"
      rows={1}
      value={value}
      placeholder={placeholder ?? 'Ваш ответ'}
      aria-label={label}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}

function StateScale({ data, selected, locked }: { data: TaskSettingsData; selected?: number; locked?: boolean }) {
  const [picked, setPicked] = useState<number | undefined>(undefined);
  const value = locked ? selected : picked;
  return (
    <ul className="blank-answers" role="radiogroup" aria-label="Как вы себя чувствуете">
      {data.blank.state.map((label, i) => (
        <li key={label}>
          <label className={`blank-answer${locked ? ' blank-answer--locked' : ''}`}>
            <input
              type="radio"
              className="blank-answer__input"
              name="task-state"
              checked={value === i}
              disabled={locked}
              onChange={() => setPicked(i)}
            />
            <span className="blank-answer__radio" aria-hidden="true" />
            <span className="blank-answer__text task-state__text">
              <IconTaskState level={i} className="task-state__icon" />
              {label}
            </span>
          </label>
        </li>
      ))}
    </ul>
  );
}

/** Бланк задания так, как его увидит клиент: правила, предложения, комментарий и шкала состояния (если включены) */
function TaskBlank({ data, form, options }: { data: TaskSettingsData; form: string; options: Options }) {
  const starters = data.blank.starters[form] ?? Object.values(data.blank.starters)[0];
  return (
    <>
      <CollapseCard title="Правила задания" id="blank-rules">
        <BlankRules rules={data.blank.rules} />
      </CollapseCard>
      <CollapseCard title="Предложения">
        <ol className="blank-questions">
          {starters.map((start, i) => (
            <li key={i} className="blank-question">
              <p className="blank-question__prompt">
                <strong>{i + 1}.</strong> {start}
              </p>
              <AnswerField label={`Предложение ${i + 1}`} />
            </li>
          ))}
        </ol>
      </CollapseCard>
      {options.comment && (
        <CollapseCard title="Комментарий">
          <p className="task-hint">{data.blank.commentHint}</p>
          <AnswerField label="Комментарий" placeholder="Ваш комментарий" />
        </CollapseCard>
      )}
      {options.state && (
        <CollapseCard title="Как вы себя чувствуете?">
          <StateScale data={data} />
        </CollapseCard>
      )}
    </>
  );
}

/** Пример выполнения: те же предложения с ответами, комментарий, состояние и что можно отметить при разборе */
function TaskExample({ data, form, options }: { data: TaskSettingsData; form: string; options: Options }) {
  const starters = data.blank.starters[form] ?? Object.values(data.blank.starters)[0];
  const answers = data.example.answers[form] ?? Object.values(data.example.answers)[0];
  return (
    <>
      <CollapseCard title="Предложения">
        <ol className="blank-questions">
          {starters.map((start, i) => (
            <li key={i} className="blank-question">
              <p className="blank-question__prompt">
                <strong>{i + 1}.</strong> {start}
              </p>
              <p className="task-answer">{answers[i]}</p>
            </li>
          ))}
        </ol>
      </CollapseCard>
      {options.comment && (
        <CollapseCard title="Комментарий">
          <p className="task-answer">{data.example.comment[form] ?? Object.values(data.example.comment)[0]}</p>
        </CollapseCard>
      )}
      {options.state && (
        <CollapseCard title="Как вы себя чувствуете?">
          <StateScale data={data} selected={data.example.state} locked />
        </CollapseCard>
      )}
      <CollapseCard title="Что можно отметить">
        <ul className="ts-scale__list task-notes">
          {data.example.notes.map((note) => (
            <li key={note}>
              <span className="ts-dot ts-dot--text" />
              {note}
            </li>
          ))}
        </ul>
        <p className="task-hint">Пример учебный: выводы по реальному заданию делайте вместе с клиентом.</p>
      </CollapseCard>
    </>
  );
}

interface TaskSettingsProps {
  task: LibraryTask;
  onBack: () => void;
}

/**
 * Экран «Настройка задания»: описание, бланк и пример выполнения, информация, цель, анализ материалов,
 * особенности (комментарий клиента, оценка состояния, срок, напоминание), сообщение клиенту и кнопка «Отправить клиенту».
 */
export function TaskSettings({ task, onBack }: TaskSettingsProps) {
  const data = taskSettings(task);
  const [view, setView] = useState<View>('settings');
  const [form, setForm] = useState(data?.forms[0] ?? '');
  const [comment, setComment] = useState(true);
  const [state, setState] = useState(true);
  const [saveBlank, setSaveBlank] = useState(true);
  const [remind, setRemind] = useState(true);
  const [deadline, setDeadline] = useState(TASK_DEADLINES[0]);
  const [messageOn, setMessageOn] = useState(true);
  const [message, setMessage] = useState(data?.message ?? '');
  const [sheet, setSheet] = useState<'actions' | 'one' | 'many' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
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
  }, [view]);

  const openView = (next: View) => transition(() => setView(next), next === 'settings' ? 'back' : 'forward');
  useBackHandler(view !== 'settings', () => openView('settings'));
  useSwipeBack('.test-settings', true, () => (view === 'settings' ? onBack() : openView('settings')));

  if (!data) return null;
  const options: Options = { comment, state };

  const send = (ids: string[]) => {
    ids.forEach((id) => {
      sendMessage(id, messageOn ? message : '', undefined, { task: task.id });
      // Журнал действий (история, вкладка «Задания») пока ведется только у Максима
      if (id === 'maxim') logStep('task', task.id, 'sent');
    });
    setSheet(null);
    const names = ids.map((id) => CHATS.find((c) => c.id === id)?.name).filter(Boolean);
    notify(ids.length === 1 ? `Задание отправлено: ${names[0]}` : `Задание отправлено: ${ids.length} клиентам`);
  };
  const pick = (action: TestAction) => setSheet(action === 'self' ? null : action);

  const link = (label: string, next: View) => (
    <li
      className="ts-row ts-row--link"
      role="button"
      tabIndex={0}
      onClick={() => openView(next)}
      onKeyDown={(e) => e.key === 'Enter' && openView(next)}
    >
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

  return (
    <section className="test-settings">
      <TestHeader test={task} kind="task" status={STATUS[view]} onBack={view === 'settings' ? onBack : () => openView('settings')} />

      {view === 'blank' ? (
        <ScrollHost className="test-settings__scroll" key="blank">
          <TaskBlank data={data} form={form} options={options} />
        </ScrollHost>
      ) : view === 'example' ? (
        <ScrollHost className="test-settings__scroll" key="example">
          <TaskExample data={data} form={form} options={options} />
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

            <ul className="ts-card">
              {link('Бланк задания', 'blank')}
              {link('Пример выполнения', 'example')}
            </ul>

            <CollapseCard title="Информация о задании">
              <ul className="ts-rows">
                <Row label="Количество предложений" value={data.sentences} />
                <Row label="Время выполнения" value={data.duration} />
                <Row label="Возраст" value={data.age} />
                <Row label="Форма бланка" info>
                  {select('Форма бланка', form, data.forms, setForm)}
                </Row>
              </ul>
            </CollapseCard>

            <CollapseCard title="Цель задания">
              <Paragraphs text={data.goal} />
            </CollapseCard>

            <CollapseCard title="Анализ материалов">
              <Paragraphs text={data.analysis} />
            </CollapseCard>

            <CollapseCard title="Особенности задания">
              <ul className="ts-rows">
                <Row label="Разрешить комментарий клиента">
                  <Switch checked={comment} onChange={setComment} label="Разрешить комментарий клиента" />
                </Row>
                <Row label="Оценить психоэмоциональное состояние">
                  <Switch checked={state} onChange={setState} label="Оценить психоэмоциональное состояние" />
                </Row>
                <Row label="Сохранить бланк">
                  <Switch checked={saveBlank} onChange={setSaveBlank} label="Сохранить бланк" />
                </Row>
                <Row label="Срок выполнения" info>
                  {select('Срок выполнения', deadline, TASK_DEADLINES, setDeadline)}
                </Row>
                <Row label="Напомнить, если не выполнено">
                  <Switch checked={remind} onChange={setRemind} label="Напомнить, если не выполнено" />
                </Row>
              </ul>
            </CollapseCard>

            <section className="ts-card ts-message-card">
              <ul className="ts-rows">
                <Row label="Сообщение для клиента">
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
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="test-settings__cta">
            <button type="button" className="test-settings__cta-button" onClick={() => setSheet('actions')}>
              Отправить клиенту
            </button>
          </div>
        </>
      )}

      {toast && <Toast text={toast} className={view === 'settings' ? 'test-settings__toast--cta' : undefined} />}

      {sheet === 'actions' && <ActionSheet actions={['one', 'many']} onPick={pick} onClose={() => setSheet(null)} />}
      {(sheet === 'one' || sheet === 'many') && <RecipientSheet mode={sheet} onSend={send} onClose={() => setSheet(null)} />}
    </section>
  );
}

