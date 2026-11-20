export function TestDescription({ intro, lead }: { intro: string; lead?: string }) {
  const paragraphs = intro.split('\n\n');
  // Строки «● …» — маркированный список, остальные — обычный текст абзаца
  const renderParagraph = (paragraph: string, i: number) => {
    const lines = paragraph.split('\n');
    const items = lines.filter((l) => l.startsWith('●')).map((l) => l.replace(/^●\s*/, ''));
    const text = lines.filter((l) => !l.startsWith('●')).join('\n');
    return (
      <div key={i} className="ts-card__paragraph">
        {text && (
          <p>
            {i === 0 && lead && text.startsWith(lead) ? (
              <>
                <strong>{lead}</strong>
                {text.slice(lead.length)}
              </>
            ) : (
              text
            )}
          </p>
        )}
        {items.length > 0 && (
          <ul className="ts-card__list">
            {items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };
  return <>{paragraphs.map(renderParagraph)}</>;
}
