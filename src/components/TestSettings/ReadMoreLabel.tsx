/** Обе подписи занимают одно место и меняются вместе с высотой блока. */
export function ReadMoreLabel({ open }: { open: boolean }) {
  return (
    <span className="ts-read-more">
      <span aria-hidden={open}>Читать далее</span>
      <span aria-hidden={!open}>Скрыть</span>
    </span>
  );
}
