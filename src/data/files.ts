/** Файлы, прикреплённые к кейсу клиента (пока тестовые данные только для Максима) */
export interface CaseFile {
  id: string;
  name: string;
  kind: 'image' | 'pdf';
  /** Подпись под названием */
  meta: string;
  /** Дата добавления */
  date: string;
}

export const CASE_FILES: CaseFile[] = [
  { id: 'f1', name: 'session_03_excerpt.jpeg', kind: 'image', meta: 'Изображение • 1.2 MB', date: '10.08' },
  { id: 'f2', name: 'patient_timeline.jpeg', kind: 'image', meta: 'Изображение • 1.2 MB', date: '10.08' },
  { id: 'f3', name: 'key_signifiers_2026.pdf', kind: 'pdf', meta: 'PDF • 240 КБ', date: '10.08' },
  { id: 'f4', name: 'family_scheme.jpeg', kind: 'image', meta: 'Изображение • 1.2 MB', date: '10.08' },
  { id: 'f5', name: 'session_notes_01-06.pdf', kind: 'pdf', meta: 'PDF • 240 КБ', date: '10.08' },
  { id: 'f6', name: 'task_03_associations.jpeg', kind: 'image', meta: 'Изображение • 1.2 MB', date: '10.08' },
  { id: 'f7', name: 'psychological_tasks_01-04.pdf', kind: 'pdf', meta: 'PDF • 240 КБ', date: '10.08' },
  { id: 'f8', name: 'test_results_2026.pdf', kind: 'pdf', meta: 'PDF • 240 КБ', date: '10.08' },
  { id: 'f9', name: 'initial_request_2026.pdf', kind: 'pdf', meta: 'PDF • 240 КБ', date: '10.08' },
  { id: 'f10', name: 'anamnesis_morozov_2026.pdf', kind: 'pdf', meta: 'PDF • 240 КБ', date: '10.08' },
];
