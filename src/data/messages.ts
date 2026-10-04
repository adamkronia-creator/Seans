export interface Message {
  id: string;
  from: 'me' | 'them';
  text: string;
  time: string;
}

export interface MessageGroup {
  /** Подпись разделителя дня */
  label: string;
  messages: Message[];
}

// Тестовая переписка с Максимом, как в макете. Переносы строк («\n») повторяют
// переносы из макета; в рабочем приложении текст будет переноситься сам.
export const MESSAGES: Record<string, MessageGroup[]> = {
  maxim: [
    {
      label: 'Сегодня',
      messages: [
        { id: '1', from: 'them', text: 'Доброго вечера!', time: '17:00' },
        { id: '2', from: 'me', text: 'И вам доброго. Вы что-\nто хотели спросить?', time: '17:00' },
        { id: '3', from: 'them', text: 'Да :)', time: '17:00' },
        { id: '4', from: 'them', text: 'Завтрашний сеанс в силе?', time: '17:00' },
        { id: '5', from: 'me', text: 'Да, все верно.', time: '17:00' },
        {
          id: '6',
          from: 'me',
          text: 'Напомню: сеанс состоится\n21/04, в 18:00. Кабинет №91.',
          time: '17:00',
        },
      ],
    },
  ],
};
