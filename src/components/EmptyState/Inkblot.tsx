import './EmptyState.css';

/*
* Чернильное пятно — знак «Сеанса»: симметричная клякса, как в тесте Роршаха. Рисуется как половина формы и ее зеркальная копия,
* цвета берет из токенов (петроль). Три формы для разных пустых экранов.
*/

export type InkblotKind = 'blot' | 'wings' | 'drop';

const SHAPES: Record<InkblotKind, { body: string; pool: string; dots: [number, number, number][] }> = {
  blot: {
    body: 'M60 12C70 10 80 14 84 24C87 32 83 38 88 44C95 52 108 50 110 62C112 74 100 80 92 82C84 84 82 90 78 98C75 104 68 108 62 106L60 106Z',
    pool: 'M60 34C66 33 72 37 73 43C74 49 70 52 73 57C76 62 83 61 84 68C85 74 78 77 73 78C68 79 66 84 62 86L60 86Z',
    dots: [[96, 26, 3], [104, 36, 1.8], [100, 98, 2.4], [88, 108, 1.6]],
  },
  wings: {
    body: 'M60 34C66 16 88 8 100 20C112 31 107 47 93 54C104 59 110 72 101 84C93 95 76 91 67 82C63 78 61 75 60 74Z',
    pool: 'M60 44C64 33 76 30 83 36C90 43 86 52 77 57C84 61 86 68 79 73C73 77 66 74 62 69C61 67 60 66 60 66Z',
    dots: [[104, 12, 2.6], [112, 24, 1.6], [96, 100, 2.2], [108, 94, 1.4]],
  },
  drop: {
    body: 'M60 8C75 10 84 26 79 40C76 50 87 55 89 70C91 87 76 110 60 110Z',
    pool: 'M60 30C68 32 72 40 70 47C69 53 76 58 77 68C78 78 70 90 60 92Z',
    dots: [[100, 24, 2.8], [106, 40, 1.6], [98, 108, 2], [20, 100, 1.6]],
  },
};

const MIRROR = 'matrix(-1 0 0 1 120 0)';

export function Inkblot({ kind = 'blot', size = 104, className = '' }: { kind?: InkblotKind; size?: number; className?: string }) {
  const { body, pool, dots } = SHAPES[kind];
  return (
    <svg className={`ink ${className}`} width={size} height={size} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <ellipse className="ink__wash" cx="60" cy="62" rx="55" ry="52" />
      {[undefined, MIRROR].map((transform) => (
        <g key={transform ?? 'right'} transform={transform}>
          <path className="ink__body" d={body} />
          <path className="ink__pool" d={pool} />
        </g>
      ))}
      {dots.map(([x, y, r]) => (
        <g key={`${x}-${y}`}>
          <circle className="ink__dot" cx={x} cy={y} r={r} />
          <circle className="ink__dot" cx={120 - x} cy={y} r={r} />
        </g>
      ))}
    </svg>
  );
}
