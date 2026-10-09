import { useLayoutEffect, useRef } from 'react';

/** Textarea, которая растёт по тексту: виден весь текст без внутренней прокрутки */
export function AutoTextarea({
  value,
  onChange,
  ...rest
}: { value: string; onChange: (v: string) => void } & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'value' | 'onChange'
>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Высота по тексту плюс рамка: иначе появляется лишняя полоса прокрутки
    const border = el.offsetHeight - el.clientHeight;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + border}px`;
  }, [value]);
  return <textarea ref={ref} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />;
}
