import { useState, type ComponentType, type SVGProps } from 'react';
import { Badge } from '../Badge/Badge';
import { TruncatedText } from '../TruncatedText/TruncatedText';
import {
  IconCaseAdd,
  IconCaseAnamnesis,
  IconCaseBirthday,
  IconCaseCalendar,
  IconCaseClient,
  IconCaseClock,
  IconCaseEdit,
  IconCaseFormat,
  IconCaseGeneral,
  IconCaseHypothesis,
  IconCaseLock,
  IconCaseRequest,
  IconCaseScenario,
  IconCaseSignifiers,
  IconCaseStructure,
  IconCaseTransfer,
} from '../icons';
import {
  CASE_MATERIALS_COUNT,
  CASE_NOTES_COUNT,
  CASE_SECTIONS,
  type CaseIconId,
  type CaseRowIconId,
  type CaseSection,
} from '../../data/case';
import './ChatCase.css';

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

// Иконки шапок карточек; size — размер файла иконки из Figma (22 или 24)
const HEAD_ICONS: Record<CaseIconId, { Icon: Icon; size: 22 | 24 }> = {
  general: { Icon: IconCaseGeneral, size: 22 },
  anamnesis: { Icon: IconCaseAnamnesis, size: 22 },
  request: { Icon: IconCaseRequest, size: 22 },
  hypothesis: { Icon: IconCaseHypothesis, size: 24 },
  structure: { Icon: IconCaseStructure, size: 22 },
  signifiers: { Icon: IconCaseSignifiers, size: 24 },
  scenario: { Icon: IconCaseScenario, size: 24 },
  transfer: { Icon: IconCaseTransfer, size: 24 },
};

const ROW_ICONS: Record<CaseRowIconId, Icon> = {
  client: IconCaseClient,
  birthday: IconCaseBirthday,
  calendar: IconCaseCalendar,
  clock: IconCaseClock,
  format: IconCaseFormat,
};

type SegmentId = 'info' | 'notes' | 'materials';

function CaseCard({ section }: { section: CaseSection }) {
  const { Icon, size } = HEAD_ICONS[section.icon];

  return (
    <li className="case-card">
      <div className={`case-card__head case-card__head--${section.tone}`}>
        <span className="case-card__icon" style={{ fontSize: size }}>
          <Icon />
        </span>
        <TruncatedText className="case-card__title" text={section.title} />
        <button type="button" className="case-card__edit" aria-label={`Изменить: ${section.title}`}>
          <IconCaseEdit />
        </button>
      </div>

      {section.rows && (
        <ul className="case-card__rows">
          {section.rows.map(({ icon, label, value }) => {
            const RowIcon = ROW_ICONS[icon];
            return (
              <li key={label} className="case-row">
                <RowIcon className="case-row__icon" />
                <span className="case-row__label">{label}</span>
                <span className="case-row__value">{value}</span>
              </li>
            );
          })}
        </ul>
      )}

      {section.blocks && (
        <div className="case-card__body">
          {section.blocks.map((block, i) =>
            block.type === 'p' ? (
              <p key={i} className="case-card__text">
                {block.text}
              </p>
            ) : (
              <ul key={i} className="case-card__list">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          )}
          {section.updated && (
            <p className="case-card__updated">Последнее обновление: {section.updated}</p>
          )}
        </div>
      )}
    </li>
  );
}

/** Вкладка «Кейс» в открытом чате: сведения о клиенте, заметки и материалы */
export function ChatCase() {
  const [segment, setSegment] = useState<SegmentId>('info');

  const segments: { id: SegmentId; label: string; count: number }[] = [
    { id: 'info', label: 'Сведения', count: CASE_SECTIONS.length },
    { id: 'notes', label: 'Заметки', count: CASE_NOTES_COUNT },
    { id: 'materials', label: 'Материалы', count: CASE_MATERIALS_COUNT },
  ];

  return (
    <div className="chat-case">
      <div className="case-segments" role="tablist" aria-label="Разделы кейса">
        {segments.map(({ id, label, count }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={segment === id}
            className={`case-segments__item${segment === id ? ' case-segments__item--active' : ''}`}
            onClick={() => setSegment(id)}
          >
            <span>{label}</span>
            <Badge count={count} variant={segment === id ? 'accent' : 'muted'} />
          </button>
        ))}
      </div>

      {segment === 'info' ? (
        <>
          <button type="button" className="case-add">
            <svg className="case-add__border" aria-hidden="true">
              <rect className="case-add__rect" />
            </svg>
            <IconCaseAdd className="case-add__icon" />
            <span>Добавить сведения</span>
          </button>

          <ul className="case-cards">
            {CASE_SECTIONS.map((section) => (
              <CaseCard key={section.id} section={section} />
            ))}
          </ul>

          <p className="case-note">
            <IconCaseLock className="case-note__icon" />
            <span>Психологический кейс виден только вам</span>
          </p>
        </>
      ) : (
        <p className="case-empty">Раздел в разработке</p>
      )}
    </div>
  );
}
