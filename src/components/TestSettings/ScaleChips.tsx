import { useEffect, useRef, useState } from 'react';
import { testScaleInfo } from '../../data/testScaleInfo';
import { SheetOverlay } from '../EditSheet/SheetOverlay';
import { useSheet } from '../EditSheet/useSheet';
import './ScaleChips.css';

type ScaleDescription = NonNullable<ReturnType<typeof testScaleInfo>>;

function ScaleSheet({ name, description, onClose }: { name: string; description: ScaleDescription; onClose: () => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  useSheet(onClose);
  useEffect(() => {
    const sheet = dialog.current;
    if (!sheet) return;
    heading.current?.focus({ preventScroll: true });

    const keepFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      event.preventDefault();
      sheet.querySelector<HTMLButtonElement>('.sheet__close')?.focus();
    };

    sheet.addEventListener('keydown', keepFocus);
    return () => sheet.removeEventListener('keydown', keepFocus);
  }, []);

  return (
    <SheetOverlay onClose={onClose}>
      <div ref={dialog} className="sheet scale-sheet" role="dialog" aria-modal="true" aria-label={name}>
        <div className="sheet__header">
          <h2 className="sheet__heading" ref={heading} tabIndex={-1}>{name}</h2>
        </div>
        <div className="sheet__body">
          <div className="sheet__card scale-sheet__description">
            {description.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </div>
      </div>
    </SheetOverlay>
  );
}

export function ScaleChips({ testId, scales, groupSize = scales.length || 1 }: {
  testId: string;
  scales: readonly string[];
  groupSize?: number;
}) {
  const [selected, setSelected] = useState<{ name: string; description: ScaleDescription } | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const groups = Array.from({ length: Math.ceil(scales.length / groupSize) }, (_, index) =>
    scales.slice(index * groupSize, (index + 1) * groupSize),
  );

  function close() {
    setSelected(null);
    trigger.current?.focus({ preventScroll: true });
  }

  return (
    <>
      {groups.map((group) => (
        <ul key={group[0]} className="scale-chips">
          {group.map((name) => {
            const description = testScaleInfo(testId, name);
            return (
              <li key={name}>
                {description ? (
                  <button type="button" className="scale-chip" aria-haspopup="dialog" onClick={(event) => {
                    trigger.current = event.currentTarget;
                    setSelected({ name, description });
                  }}>{name}</button>
                ) : <span className="scale-chip">{name}</span>}
              </li>
            );
          })}
        </ul>
      ))}
      {selected && <ScaleSheet name={selected.name} description={selected.description} onClose={close} />}
    </>
  );
}
