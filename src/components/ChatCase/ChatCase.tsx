import { useRef, useState, type CSSProperties } from 'react';
import { Badge } from '../Badge/Badge';
import { QuickEdit } from '../QuickEdit/QuickEdit';
import { TruncatedText } from '../TruncatedText/TruncatedText';
import { EditSheet, type EditValues } from '../EditSheet/EditSheet';
import {
  IconCaseAdd,
  IconCaseAddNote,
  IconCaseAttach,
  IconCaseFileDownload,
  IconCaseEdit,
  IconCaseLock,
} from '../icons';
import {
  blocksToText,
  paragraphsToText,
  textToBlocks,
  textToParagraphs,
  type CaseSection,
} from '../../data/case';
import type { CaseFile } from '../../data/files';
import type { CaseNote } from '../../data/notes';
import { toneOf } from '../../data/tones';
import { attachFiles, updateNote, updateSection, useClientData } from '../../data/clientStore';
import { useDoubleActivate } from '../../utils/useDoubleActivate';
import { HEAD_ICONS, ROW_ICONS } from './caseIcons';
import './ChatCase.css';

/** Фон шапки и цвет иконки задаются переменными: цвет можно менять в редакторе */
const toneStyle = (tone: CaseSection['tone']): CSSProperties => {
  const { bg, fg } = toneOf(tone);
  return { '--head-bg': bg, '--head-fg': fg } as CSSProperties;
};

type SegmentId = 'info' | 'notes' | 'materials';

function CaseCard({ section, onEdit }: { section: CaseSection; onEdit: () => void }) {
  const { Icon, size } = HEAD_ICONS[section.icon];
  // Двойной клик/касание: быстрая правка текста на месте; полный редактор открывает карандаш
  const [quick, setQuick] = useState(false);
  const doubleTap = useDoubleActivate(() => setQuick(true), !!section.blocks && !quick);

  return (
    <li className="case-card case-card--editable" {...doubleTap}>
      <div className="case-card__head" style={toneStyle(section.tone)}>
        <span className="case-card__icon" style={{ fontSize: size }}>
          <Icon />
        </span>
        <TruncatedText className="case-card__title" text={section.title} />
        <button
          type="button"
          className="case-card__edit"
          aria-label={`Изменить: ${section.title}`}
          onClick={onEdit}
        >
          <IconCaseEdit />
        </button>
      </div>

      {section.rows && (
        <ul className="case-card__rows">
          {section.rows.map(({ icon, label, value }) => {
            const RowIcon = ROW_ICONS[icon];
            return (
              <CaseRow
                key={label}
                Icon={RowIcon}
                label={label}
                value={value}
                onSave={(v) =>
                  updateSection(section.id, {
                    rows: section.rows!.map((r) => (r.label === label ? { ...r, value: v } : r)),
                  })
                }
              />
            );
          })}
        </ul>
      )}

      {section.blocks && (
        <div className="case-card__body">
          <QuickEdit
            editing={quick}
            value={blocksToText(section.blocks)}
            className="case-card__text"
            onCancel={() => setQuick(false)}
            onCommit={(text) => {
              setQuick(false);
              if (text !== blocksToText(section.blocks!)) updateSection(section.id, { blocks: textToBlocks(text) });
            }}
          >
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
          </QuickEdit>
          {section.updated && (
            <p className="case-card__updated">Последнее обновление: {section.updated}</p>
          )}
        </div>
      )}
    </li>
  );
}

/** Строка «подпись — значение»: значение правится двойным кликом на месте */
function CaseRow({
  Icon,
  label,
  value,
  onSave,
}: {
  Icon: (typeof ROW_ICONS)[keyof typeof ROW_ICONS];
  label: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [quick, setQuick] = useState(false);
  const doubleTap = useDoubleActivate(() => setQuick(true), !quick);
  return (
    <li className="case-row" {...doubleTap}>
      <Icon className="case-row__icon" />
      <span className="case-row__label">{label}</span>
      <QuickEdit
        editing={quick}
        value={value}
        as="span"
        className="case-row__value"
        onCancel={() => setQuick(false)}
        onCommit={(v) => {
          setQuick(false);
          if (v !== value) onSave(v);
        }}
      >
        <span className="case-row__value">{value}</span>
      </QuickEdit>
    </li>
  );
}

function FileCard({ file }: { file: CaseFile }) {
  const body = (
    <>
      <span className={`case-file__thumb case-file__thumb--${file.kind}`}>
        <IconCaseFileDownload />
      </span>
      <div className="case-file__info">
        <TruncatedText className="case-file__name" text={file.name} />
        <span className="case-file__meta">{file.meta}</span>
      </div>
      <span className="case-file__date">{file.date}</span>
    </>
  );
  // Загруженный файл открывается и скачивается по нажатию
  return (
    <li>
      {file.url ? (
        <a className="case-file case-file--link" href={file.url} download={file.name} target="_blank" rel="noreferrer">
          {body}
        </a>
      ) : (
        <div className="case-file">{body}</div>
      )}
    </li>
  );
}

function NoteCard({ note, onEdit }: { note: CaseNote; onEdit: () => void }) {
  const { Icon, size } = HEAD_ICONS[note.icon];
  const [quick, setQuick] = useState(false);
  const doubleTap = useDoubleActivate(() => setQuick(true), !quick);
  return (
    <li className="case-card case-card--editable" {...doubleTap}>
      <div className="case-card__head case-card__head--note" style={toneStyle(note.tone)}>
        <span className="case-card__icon" style={{ fontSize: size }}>
          <Icon />
        </span>
        <TruncatedText className="case-card__title" text={note.title} />
        <button type="button" className="case-card__edit" aria-label="Изменить заметку" onClick={onEdit}>
          <IconCaseEdit />
        </button>
      </div>
      <div className="case-card__body case-card__body--note">
        <QuickEdit
          editing={quick}
          value={paragraphsToText(note.paragraphs)}
          className="case-card__text"
          onCancel={() => setQuick(false)}
          onCommit={(text) => {
            setQuick(false);
            if (text !== paragraphsToText(note.paragraphs)) updateNote(note.id, { paragraphs: textToParagraphs(text) });
          }}
        >
          {note.paragraphs.map((text, i) => (
            <p key={i} className="case-card__text">
              {text}
            </p>
          ))}
        </QuickEdit>
        <p className="case-card__updated">Последнее обновление: {note.updated}</p>
      </div>
    </li>
  );
}

/** Вкладка «Кейс» в открытом чате: сведения о клиенте, заметки и материалы */
export function ChatCase({ hasData, clientId }: { hasData: boolean; clientId: string }) {
  const { notes, caseSections, files: allFiles } = useClientData();
  const files = allFiles[clientId] ?? [];
  const fileInput = useRef<HTMLInputElement>(null);
  const [segment, setSegment] = useState<SegmentId>('info');
  // Что сейчас редактируется: сведение или заметка
  const [editing, setEditing] = useState<{ kind: 'section' | 'note'; id: string } | null>(null);
  const editSection = editing?.kind === 'section' ? caseSections.find((x) => x.id === editing.id) : undefined;
  const editNote = editing?.kind === 'note' ? notes.find((x) => x.id === editing.id) : undefined;

  const segments: { id: SegmentId; label: string; count: number }[] = [
    { id: 'info', label: 'Сведения', count: hasData ? caseSections.length : 0 },
    { id: 'notes', label: 'Заметки', count: hasData ? notes.length : 0 },
    { id: 'materials', label: 'Материалы', count: files.length },
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

          <ul className="case-cards" hidden={!hasData}>
            {(hasData ? caseSections : []).map((section) => (
              <CaseCard
                key={section.id}
                section={section}
                onEdit={() => setEditing({ kind: 'section', id: section.id })}
              />
            ))}
          </ul>

          <p className="case-note">
            <IconCaseLock className="case-note__icon" />
            <span>Психологический кейс виден только вам</span>
          </p>
        </>
      ) : segment === 'notes' ? (
        <>
          <button type="button" className="case-add">
            <svg className="case-add__border" aria-hidden="true">
              <rect className="case-add__rect" />
            </svg>
            <IconCaseAddNote className="case-add__icon" />
            <span>Добавить заметку</span>
          </button>

          <ul className="case-cards" hidden={!hasData}>
            {notes.map((note) => (
              <NoteCard key={note.id} note={note} onEdit={() => setEditing({ kind: 'note', id: note.id })} />
            ))}
          </ul>

          <p className="case-note">
            <IconCaseLock className="case-note__icon" />
            <span>Заметки видны только вам</span>
          </p>
        </>
      ) : (
        <>
          <button type="button" className="case-add" onClick={() => fileInput.current?.click()}>
            <svg className="case-add__border" aria-hidden="true">
              <rect className="case-add__rect" />
            </svg>
            <IconCaseAttach className="case-add__icon" />
            <span>Прикрепить файл</span>
          </button>
          {/* Системное окно выбора файлов; можно выбрать несколько */}
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              if (picked.length > 0) attachFiles(clientId, picked);
              e.target.value = ''; // тот же файл можно выбрать снова
            }}
          />

          <ul className="case-cards" hidden={files.length === 0}>
            {files.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </ul>

          <p className="case-note">
            <IconCaseLock className="case-note__icon" />
            <span>Файлы видны только вам</span>
          </p>
        </>
      )}

      {editSection && (
        <EditSheet
          key={editSection.id}
          heading="Редактирование сведений"
          initial={{
            title: editSection.title,
            icon: editSection.icon,
            tone: editSection.tone,
            ...(editSection.blocks ? { text: blocksToText(editSection.blocks) } : {}),
            ...(editSection.rows ? { rows: editSection.rows.map((r) => r.value) } : {}),
          }}
          rowLabels={editSection.rows?.map((r) => r.label)}
          textPlaceholder="Абзацы разделяйте пустой строкой, пункты списка начинайте с «• »"
          onClose={() => setEditing(null)}
          onSave={(v: EditValues) => {
            updateSection(editSection.id, {
              title: v.title,
              icon: v.icon,
              tone: v.tone,
              ...(v.text !== undefined ? { blocks: textToBlocks(v.text) } : {}),
              ...(v.rows && editSection.rows
                ? { rows: editSection.rows.map((r, i) => ({ ...r, value: v.rows![i] })) }
                : {}),
            });
            setEditing(null);
          }}
        />
      )}

      {editNote && (
        <EditSheet
          key={editNote.id}
          heading="Редактирование заметки"
          initial={{
            title: editNote.title,
            text: paragraphsToText(editNote.paragraphs),
            icon: editNote.icon,
            tone: editNote.tone,
          }}
          textPlaceholder="Абзацы разделяйте пустой строкой"
          onClose={() => setEditing(null)}
          onSave={(v: EditValues) => {
            updateNote(editNote.id, {
              title: v.title,
              paragraphs: textToParagraphs(v.text ?? ''),
              icon: v.icon,
              tone: v.tone,
            });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
