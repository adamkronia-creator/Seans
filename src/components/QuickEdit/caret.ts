let pending: Range | null = null;

/** Запоминает позицию курсора под точкой нажатия: двойной клик ставит курсор туда, а не в конец */
export function rememberCaret(x: number, y: number) {
  pending = null;
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  if (doc.caretPositionFromPoint) {
    const pos = doc.caretPositionFromPoint(x, y);
    if (pos) {
      const r = document.createRange();
      r.setStart(pos.offsetNode, pos.offset);
      r.collapse(true);
      pending = r;
    }
  } else if (doc.caretRangeFromPoint) {
    pending = doc.caretRangeFromPoint(x, y);
  }
}

export function takeCaret(): Range | null {
  const r = pending;
  pending = null;
  return r;
}
