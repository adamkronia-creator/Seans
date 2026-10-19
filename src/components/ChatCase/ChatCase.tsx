import { ScrollHost } from '../ScrollHost/ScrollHost';
import { useState, type CSSProperties } from 'react';
import { QuickEdit } from '../QuickEdit/QuickEdit';
import { EditSheet, type EditValues } from '../EditSheet/EditSheet';
import { EmptyState } from '../EmptyState/EmptyState';
import { IconCaseEdit, IconTabInfo, IconTabNotes } from '../icons';
import {
  blocksToText,
  paragraphsToText,
  textToBlocks,
  textToParagraphs,
  type CaseSection,
} from '../../data/case';
import type { CaseNote } from '../../data/notes';
import { toneOf } from '../../data/tones';
import { CLIENT_CHAT, updateNote, updateSection, useClientData } from '../../data/clientStore';
import { parseBlocks, RichBlocks } from '../../utils/richText';
import { useDoubleActivate } from '../../utils/useDoubleActivate';
import { HEAD_ICONS } from './caseIcons';
import './ChatCase.css';

/** Фон шапки и цвет иконки задаются переменными: цвет можно менять в редакторе */
const toneStyle = (tone: CaseSection['tone']): CSSProperties => {
  const { bg, fg } = toneOf(tone);
  return { '--head-bg': bg, '--head-fg': fg } as CSSProperties;
};

function CaseCard({ section, onEdit }: { section: CaseSection; onEdit: () => void }) {
  const head = section.icon ? HEAD_ICONS[section.icon] : null;
  // Двойной клик/касание: быстрая правка текста на месте; полный редактор открывает карандаш
  const [quick, setQuick] = useState(false);
  const doubleTap = useDoubleActivate(() => setQuick(true), !!section.blocks && !quick);

  return (
    <li id={`case-s-${section.id}`} className="case-card case-card--editable" {...doubleTap}>
      <div className="case-card__head" style={toneStyle(section.tone)}>
        {head && (
          <span className="case-card__icon" style={{ fontSize: head.size }}>
            <head.Icon />
          </span>
        )}
        <span className="case-card__title">{section.title}</span>
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
          {section.rows.map(({ label, value }) => (
            <CaseRow
              key={label}
              label={label}
              value={value}
              onSave={(v) =>
                updateSection(section.id, {
                  rows: section.rows!.map((r) => (r.label === label ? { ...r, value: v } : r)),
                })
              }
            />
          ))}
        </ul>
      )}

      {section.blocks && (
        <div className="case-card__body">
          <QuickEdit
            editing={quick}
            className="quick-edit-flow"
            onCancel={() => setQuick(false)}
            onCommit={(text) => {
              setQuick(false);
              if (text !== blocksToText(section.blocks!)) updateSection(section.id, { blocks: textToBlocks(text) });
            }}
          >
            <RichBlocks blocks={section.blocks} textClass="case-card__text" listClass="case-card__list" />
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
  label,
  value,
  onSave,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
}) {
  const [quick, setQuick] = useState(false);
  const doubleTap = useDoubleActivate(() => setQuick(true), !quick);
  return (
    <li className="case-row" {...doubleTap}>
      <span className="case-row__label">{label}</span>
      <QuickEdit
        editing={quick}
        as="span"
        className="case-row__value"
        onCancel={() => setQuick(false)}
        onCommit={(v) => {
          setQuick(false);
          if (v !== value) onSave(v);
        }}
      >
        {value}
      </QuickEdit>
    </li>
  );
}

function NoteCard({ note, onEdit }: { note: CaseNote; onEdit: () => void }) {
  const head = note.icon ? HEAD_ICONS[note.icon] : null;
  const [quick, setQuick] = useState(false);
  const doubleTap = useDoubleActivate(() => setQuick(true), !quick);
  return (
    <li id={`case-n-${note.id}`} className="case-card case-card--editable" {...doubleTap}>
      <div className="case-card__head case-card__head--note" style={toneStyle(note.tone)}>
        {head && (
          <span className="case-card__icon" style={{ fontSize: head.size }}>
            <head.Icon />
          </span>
        )}
        <span className="case-card__title">{note.title}</span>
        <button type="button" className="case-card__edit" aria-label="Изменить заметку" onClick={onEdit}>
          <IconCaseEdit />
        </button>
      </div>
      <div className="case-card__body case-card__body--note">
        <QuickEdit
          editing={quick}
          className="quick-edit-flow"
          onCancel={() => setQuick(false)}
          onCommit={(text) => {
            setQuick(false);
            if (text !== paragraphsToText(note.paragraphs)) updateNote(note.id, { paragraphs: textToParagraphs(text) });
          }}
        >
          <RichBlocks blocks={parseBlocks(paragraphsToText(note.paragraphs))} textClass="case-card__text" listClass="case-card__list" />
          {quick && note.paragraphs.length === 0 && (
            <p className="case-card__text">
              <br />
            </p>
          )}
        </QuickEdit>
        <p className="case-card__updated">Последнее обновление: {note.updated}</p>
      </div>
    </li>
  );
}

/** Дата «дд.мм.гггг» как число для порядка; без даты — самое давнее */
const dayKey = (date?: string) => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(date ?? '');
  return m ? Number(m[3]) * 372 + Number(m[2]) * 31 + Number(m[1]) : 0;
};
/** Как в переписке: давние выше, свежие ниже (при одной дате порядок записи сохраняется) */
const oldestFirst = <T extends { updated?: string }>(list: T[]) => list.map((x, i) => ({ x, i })).sort((a, b) => dayKey(a.x.updated) - dayKey(b.x.updated) || a.i - b.i).map(({ x }) => x);

/** Вкладка «Заметки» в открытом чате: заметки этого чата, новые добавляются полем внизу (см. CaseComposer) */
export function ChatNotes({ chatId }: { chatId: string }) {
  const { notes } = useClientData();
  // Тестовые заметки Максима не привязаны к чату, остальные — к чату, где их написали
  const mine = oldestFirst(notes.filter((note) => (note.chatId ?? CLIENT_CHAT) === chatId));
  const [editingId, setEditingId] = useState<string | null>(null);
  const editNote = mine.find((x) => x.id === editingId);

  return (
    <ScrollHost className="chat-case" anchorEnd>
      <div className="case-page">
        {mine.length === 0 && (
          <EmptyState icon={<IconTabNotes />} title="Заметок пока нет" text="Напишите первую в поле внизу — она появится здесь." />
        )}
        <ul className="case-cards" hidden={mine.length === 0}>
          {mine.map((note) => (
            <NoteCard key={note.id} note={note} onEdit={() => setEditingId(note.id)} />
          ))}
        </ul>
      </div>

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
          textPlaceholder="Введите текст"
          onClose={() => setEditingId(null)}
          onSave={(v: EditValues) => {
            updateNote(editNote.id, {
              title: v.title,
              paragraphs: textToParagraphs(v.text ?? ''),
              icon: v.icon,
              tone: v.tone,
            });
            setEditingId(null);
          }}
        />
      )}
    </ScrollHost>
  );
}

/** Вкладка «Сведения» в открытом чате: сведения о клиенте этого чата, новые добавляются полем внизу (см. CaseComposer) */
export function ChatInfo({ chatId }: { chatId: string }) {
  const { caseSections } = useClientData();
  const mine = oldestFirst(caseSections.filter((section) => (section.chatId ?? CLIENT_CHAT) === chatId));
  const [editingId, setEditingId] = useState<string | null>(null);
  const editSection = mine.find((x) => x.id === editingId);

  return (
    <ScrollHost className="chat-case" anchorEnd>
      <div className="case-page">
        {mine.length === 0 && (
          <EmptyState icon={<IconTabInfo />} title="Сведений пока нет" text="Добавьте первое в поле внизу — оно появится здесь." />
        )}
        <ul className="case-cards" hidden={mine.length === 0}>
          {mine.map((section) => (
            <CaseCard key={section.id} section={section} onEdit={() => setEditingId(section.id)} />
          ))}
        </ul>
      </div>

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
          textPlaceholder="Введите текст"
          onClose={() => setEditingId(null)}
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
            setEditingId(null);
          }}
        />
      )}
    </ScrollHost>
  );
}
