import { usePick, type PickProps } from '../ChatCase/ChatCase';
import { IconTickSingle } from '../ChatParts/ChatIcons';
import { IconTestChevron } from '../icons';
import type { TestCover } from '../../data/testCovers';
import type { PsyTest } from '../../data/tests';

interface CoverCardProps extends PickProps {
  item: PsyTest;
  cover: TestCover;
  /** Когда тест пройден: «21.09.2026» */
  date: string;
  /** Нажатие: открыть результат */
  onOpen: (item: PsyTest) => void;
}

/**
 * Завершённый тест с картинкой: без значка, только название, подпись, дата прохождения и шеврон справа.
 * Подложка — стекло, как у блоков профиля (рамка 1 px, скругление, прозрачная заливка), внутри картинка теста; отступ от края подложки до содержимого 12.
 * Галочка перед датой — «пройден» (раньше это показывала метка на значке). Долгое нажатие начинает выбор, как у остальных строк вкладки.
 */
export function CoverCard({ item, cover, date, onOpen, selecting, selected, onPick }: CoverCardProps) {
  const pick = usePick(item.id, { selecting, onPick }, true);
  return (
    <li
      className="cover-card"
      data-cover-tone={cover.tone}
      data-selecting={selecting || undefined}
      data-selected={selected || undefined}
      {...pick}
    >
      <img className="cover-card__img" src={cover.src} alt="" loading="lazy" decoding="async" style={{ objectPosition: cover.position }} />
      <button type="button" className="cover-card__body" aria-label={`${item.title}, ${item.description}, пройден ${date}`} onClick={() => onOpen(item)}>
        <span className="cover-card__title">{item.title}</span>
        <span className="cover-card__text">{item.description}</span>
        <span className="cover-card__date">
          <IconTickSingle className="cover-card__tick" aria-hidden="true" />
          {date}
        </span>
        {selecting ? <span className="pick-mark" aria-hidden="true" /> : <IconTestChevron className="cover-card__chevron" aria-hidden="true" />}
      </button>
    </li>
  );
}
