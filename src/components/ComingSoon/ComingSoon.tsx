import type { ComponentType, SVGProps } from 'react';
import './ComingSoon.css';

interface ComingSoonProps {
  /** Значок раздела (тот же, что на нижней панели) */
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  /** Название раздела */
  title: string;
}

/** Раздела пока нет: его значок, название и пометка «в разработке» по центру экрана над нижней панелью */
export function ComingSoon({ Icon, title }: ComingSoonProps) {
  return (
    <div className="coming-soon">
      <span className="coming-soon__icon">
        <Icon aria-hidden="true" />
      </span>
      <h2 className="coming-soon__title">{title}</h2>
      <p className="coming-soon__text">Раздел в разработке</p>
    </div>
  );
}
