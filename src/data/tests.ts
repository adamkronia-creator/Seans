// Вид теста или задания в карточке чата: статус и дата берутся из журнала клиента (clientStore),
// название, описание, иконка и цвет — из библиотеки (library.ts)

/** assigned — назначено, sent — отправлено клиенту, done — завершено, permanent — постоянное задание, которое клиент выполняет снова и снова */
export type TestStatus = 'assigned' | 'sent' | 'done' | 'permanent';

export interface PsyTest {
  id: string;
  /** Короткое название и полное: «ИТТ: Интегративный тест тревожности» */
  title: string;
  description: string;
  /** Дата назначения, отправки или завершения — по разделу */
  date: string;
  status: TestStatus;
  icon: string;
  /** Цвет фона аватарки, накладывается с прозрачностью 75% */
  tint: string;
}
