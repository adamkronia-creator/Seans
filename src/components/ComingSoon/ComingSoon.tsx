import { EmptyState } from '../EmptyState/EmptyState';

interface ComingSoonProps {
  /** Название раздела */
  title: string;
  /** Что в нем появится: одним предложением */
  text: string;
}

/** Раздела пока нет: знак «Сеанса», название и пояснение, что здесь будет, по центру экрана над нижней панелью */
export function ComingSoon({ title, text }: ComingSoonProps) {
  return <EmptyState title={title} text={`Раздел в разработке. ${text}`} />;
}
