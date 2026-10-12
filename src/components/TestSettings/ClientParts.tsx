import type { ReactNode } from 'react';
import { RESULT_FACT, type ResultMode } from '../../data/resultMode';
import { TASK_DEADLINES, volumeText, type TaskSettingsData } from '../../data/taskValues';
import { IconCalendar, IconCheck, IconClock, IconEye, IconLock, IconUndo } from '../icons';
import { BlankRules, CollapseCard } from './TestBlank';
import './ClientParts.css';

/**
 * То, чем экран клиента (тест или задание, присланное специалистом) отличается от прохождения самому.
 * Всё остальное — шапка, карточки бланка, счётчик и кнопки — те же, что при самостоятельном прохождении:
 * клиент видит ровно тот же интерфейс, а от специалиста у него только сообщение, сведения перед началом и «Спасибо» в конце.
 */

export interface ClientFact {
  icon: ReactNode;
  text: string;
}

/** «1 вопрос», «2 вопроса», «5 вопросов» */
function questionsWord(n: number) {
  const last = n % 10;
  if (n % 100 >= 11 && n % 100 <= 14) return 'вопросов';
  if (last === 1) return 'вопрос';
  return last >= 2 && last <= 4 ? 'вопроса' : 'вопросов';
}

/** Что клиент должен знать о тесте до начала: объём и время, что можно менять, кто увидит ответы и результат */
export function testFacts(total: number, duration: string | undefined, result: ResultMode): ClientFact[] {
  return [
    { icon: <IconClock className="tp__fact-icon" />, text: `${total} ${questionsWord(total)}${duration ? ` · ${duration.replace(/\.$/, '')}` : ''}` },
    { icon: <IconUndo className="tp__fact-icon" />, text: 'Ответы можно менять до конца' },
    { icon: <IconLock className="tp__fact-icon" />, text: 'Ответы увидит только специалист' },
    { icon: <IconEye className="tp__fact-icon" />, text: RESULT_FACT[result] },
  ];
}

/** То же для задания: объём и время, срок, что поля можно пропустить, кто увидит ответы */
export function taskFacts(data: TaskSettingsData, form: string, deadline: string): ClientFact[] {
  return [
    { icon: <IconClock className="tp__fact-icon" />, text: `${volumeText(data, form)} · ${data.duration}` },
    ...(deadline !== TASK_DEADLINES[0] ? [{ icon: <IconCalendar className="tp__fact-icon" />, text: `Срок выполнения: ${deadline.toLowerCase()}` }] : []),
    { icon: <IconUndo className="tp__fact-icon" />, text: 'Любое поле можно пропустить' },
    { icon: <IconLock className="tp__fact-icon" />, text: 'Ответы увидит только специалист' },
  ];
}

/** Первый экран клиента: сообщение специалиста, инструкция и сведения перед началом, каждое своим блоком */
export function ClientIntro({ message, rules, facts }: { message: string; rules: string[]; facts: ClientFact[] }) {
  const paragraphs = message
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <>
      {paragraphs.length > 0 && (
        <CollapseCard title="Сообщение специалиста">
          <div className="blank-rules">
            {paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </CollapseCard>
      )}
      <CollapseCard title="Инструкция" id="blank-rules">
        <BlankRules rules={rules} />
      </CollapseCard>
      <ul className="ts-card tp__facts">
        {facts.map((fact) => (
          <li key={fact.text}>
            {fact.icon}
            <span>{fact.text}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Экран клиента после выполнения: блок с благодарностью; под ним то, что клиент увидит дальше */
export function ClientDone({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <section className="blank-card tp__done">
      <span className="tp__done-mark" aria-hidden="true">
        <IconCheck strokeWidth={2.5} />
      </span>
      <h2 className="tp__done-title">{title}</h2>
      <p className="tp__done-text">Ответы переданы вашему специалисту</p>
      {children}
    </section>
  );
}

/** Окончание задания: благодарность и что будет дальше */
export function TaskDone() {
  return (
    <ClientDone title="Спасибо, задание выполнено">
      <p className="tp__done-text">Вы обсудите их на ближайшей встрече</p>
    </ClientDone>
  );
}
