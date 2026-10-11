/** Абзацы текста карточки: пустая строка разделяет абзацы, `lead` в начале первого абзаца выделен полужирным */
export function Paragraphs({ text, lead }: { text: string; lead?: string }) {
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
