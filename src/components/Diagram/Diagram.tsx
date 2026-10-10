import { useId, type ReactNode } from 'react';
import './Diagram.css';

/*
 * Знаки «Сеанса»: схемы и формулы из психологии, нарисованные одной тонкой линией — как на доске у психолога.
 * Правило у всех одно: сплошное — то, что уже есть, пунктир — то, чего пока нет, синий — на чем держится схема.
 * Поэтому пустой экран показывает схему с недостающим звеном пунктиром: пустота выглядит как место, которое предстоит заполнить.
 *
 *  schemaL  — схема L Лакана (S, a′, a, A): сообщение Другого доходит до субъекта через воображаемое; диалоги
 *  formula  — формула фантазма $ ◊ a: субъект ищет объект-причину желания, и он не находится; поиск
 *  bell     — нормальное распределение (μ, σ), основа шкал и норм в тестах; тесты
 *  abc      — ABC(D) Эллиса из КПТ: событие → убеждение → следствие, а D — оспаривание, то есть само задание; задания
 *  chain    — цепочка означающих S₁ → S₂ → S₃, у нас это сеансы одного за другим; история, события
 *  levels   — модель Бека: автоматические мысли над водой, промежуточные и глубинные убеждения под ней; сведения кейса
 *  triangle — когнитивный треугольник КПТ: мысли, эмоции, поведение; заметки
 *  record   — бланк-«дневник мыслей» (КПТ): колонки A, B, C; файлы и документы
 *  window   — окно толерантности (Сигел): спокойная линия между возбуждением и спадом; свободный день
 *  dyad     — двое и то, что между ними: встреча терапевта и клиента; прием
 *  object   — объект a и его орбита: то, что выбрано и держится рядом; избранное
 *  rings    — узел Борромео: Реальное, Символическое, Воображаемое; пустая категория, раздел в разработке, значок
 */

export type DiagramKind = 'schemaL' | 'formula' | 'bell' | 'abc' | 'chain' | 'levels' | 'triangle' | 'record' | 'window' | 'dyad' | 'object' | 'rings';

type P = readonly [number, number];
type Tone = 'ink' | 'acc';

/** Размер холста: все схемы нарисованы в нем и масштабируются целиком */
export const DIAGRAM_W = 176;
export const DIAGRAM_H = 112;

const n2 = (n: number) => Math.round(n * 100) / 100;
const cls = (...names: (string | false | undefined)[]) => names.filter(Boolean).join(' ');

/** Точка на отрезке a→b на расстоянии d от a */
function toward(a: P, b: P, d: number): P {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return [a[0] + ((b[0] - a[0]) / L) * d, a[1] + ((b[1] - a[1]) / L) * d];
}

/** Острие стрелки: два коротких штриха назад от кончика */
function head(tip: P, from: P, size = 6.5, spread = 0.52) {
  const a = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  const p1: P = [tip[0] - size * Math.cos(a - spread), tip[1] - size * Math.sin(a - spread)];
  const p2: P = [tip[0] - size * Math.cos(a + spread), tip[1] - size * Math.sin(a + spread)];
  return `M${n2(p1[0])} ${n2(p1[1])}L${n2(tip[0])} ${n2(tip[1])}L${n2(p2[0])} ${n2(p2[1])}`;
}

/** Связь между двумя узлами: концы не доходят до кружков, у стрелки острие на конце (или с обоих концов) */
function Link({ from, to, ra = 13, rb = 13, gap = 4, tone = 'ink', dotted = false, arrow = 'end' }: { from: P; to: P; ra?: number; rb?: number; gap?: number; tone?: Tone; dotted?: boolean; arrow?: 'end' | 'both' | 'none' }) {
  const a = toward(from, to, ra + gap);
  const b = toward(to, from, rb + gap);
  const heads = [arrow !== 'none' ? head(b, a) : '', arrow === 'both' ? head(a, b) : ''].join('');
  return (
    <>
      <path className={cls('dg__ln', `dg__ln--${tone}`, dotted && 'dg__ln--dot')} d={`M${n2(a[0])} ${n2(a[1])}L${n2(b[0])} ${n2(b[1])}`} />
      {heads && <path className={cls('dg__ln', `dg__ln--${tone}`)} d={heads} />}
    </>
  );
}

/** Окружность пунктиром: точки ложатся ровно, без шва */
function dots(r: number) {
  const k = Math.max(6, Math.round((2 * Math.PI * r) / 5.4));
  return { strokeDasharray: `0.01 ${n2((2 * Math.PI * r) / k)}` };
}

/** Узел схемы: кружок с буквой (курсивом, как в формулах), у буквы может быть индекс */
function Node({ at, r = 13, label, sub, tone = 'ink', dotted = false, size = 15 }: { at: P; r?: number; label: string; sub?: string; tone?: Tone; dotted?: boolean; size?: number }) {
  return (
    <>
      <circle cx={at[0]} cy={at[1]} r={r} className={cls('dg__ln', `dg__ln--${tone}`, dotted && 'dg__ln--dot')} style={dotted ? dots(r) : undefined} />
      <text x={at[0]} y={at[1]} dy=".36em" textAnchor="middle" fontSize={size} className={cls('dg__t', `dg__t--${tone}`)}>
        {label}
        {sub && (
          <tspan fontSize={size * 0.64} dy=".42em" fontStyle="normal">
            {sub}
          </tspan>
        )}
      </text>
    </>
  );
}

/** Схема L: путь A → a′ → a → S — Другой говорит, но сообщение проходит через воображаемую ось и доходит искаженным; пунктиром — прямая символическая ось S—A */
function SchemaL() {
  const S: P = [30, 22];
  const a1: P = [146, 22];
  const a: P = [30, 90];
  const A: P = [146, 90];
  return (
    <>
      <Link from={S} to={A} tone="acc" dotted arrow="none" ra={14} rb={14} gap={5} />
      <Link from={A} to={a1} />
      <Link from={a1} to={a} />
      <Link from={a} to={S} />
      <Node at={S} label="S" tone="acc" />
      <Node at={A} label="A" tone="acc" />
      <Node at={a1} label="a′" />
      <Node at={a} label="a" />
    </>
  );
}

/** Формула фантазма $ ◊ a: перечеркнутый субъект, ромб (желание) и объект a, которого нет на месте */
function Formula() {
  return (
    <>
      <text x="34" y="56" dy=".36em" textAnchor="middle" fontSize="42" className="dg__t dg__t--ink dg__t--lg">
        S
      </text>
      <path className="dg__ln dg__ln--acc" d="M24 76L45 36" />
      <path className="dg__ln dg__ln--acc" d="M88 38L104 56L88 74L72 56Z" />
      <circle cx="142" cy="56" r="23" className="dg__ln dg__ln--ink dg__ln--dot" style={dots(23)} />
      <text x="142" y="56" dy=".36em" textAnchor="middle" fontSize="32" className="dg__t dg__t--faint dg__t--lg">
        a
      </text>
    </>
  );
}

/** Нормальная кривая со шкалой в σ; результат клиента — точка на ней, пока пунктиром */
function Bell() {
  const x = (t: number): number => 88 + t * 23.4;
  const y = (t: number): number => 90 - 66 * Math.exp((-t * t) / 2);
  const pts = (a: number, b: number) => {
    const out: string[] = [];
    for (let t = a; t <= b + 1e-9; t += 0.1) out.push(`${n2(x(t))} ${n2(y(t))}`);
    return out;
  };
  const curve = `M${pts(-3.2, 3.2).join('L')}`;
  const area = `M${n2(x(-1))} 90L${pts(-1, 1).join('L')}L${n2(x(1))} 90Z`;
  const t0 = 1.35;
  return (
    <>
      <path className="dg__soft" d={area} />
      <path className="dg__ln dg__ln--ink" d={curve} />
      <path className="dg__ln dg__ln--ink" d="M10 90H166" />
      {[-2, -1, 0, 1, 2].map((t) => (
        <path key={t} className="dg__ln dg__ln--ink" d={`M${n2(x(t))} 90V${t === 0 ? 96 : 94}`} />
      ))}
      <text x="88" y="107" textAnchor="middle" fontSize="13" className="dg__t dg__t--ink">
        μ
      </text>
      <path className="dg__ln dg__ln--acc dg__ln--dot" d={`M${n2(x(t0))} 88V${n2(y(t0) + 7)}`} />
      <circle cx={n2(x(t0))} cy={n2(y(t0))} r="4.6" className="dg__ln dg__ln--acc" />
    </>
  );
}

/** ABC(D) Эллиса: D — оспаривание убеждения, это и есть задание; пока его нет, оно пунктиром */
function Abc() {
  const A: P = [28, 36];
  const B: P = [88, 36];
  const C: P = [148, 36];
  const D: P = [88, 88];
  return (
    <>
      <Link from={A} to={B} />
      <Link from={B} to={C} />
      <Link from={D} to={B} tone="acc" dotted />
      <Node at={A} label="A" />
      <Node at={B} label="B" />
      <Node at={C} label="C" />
      <Node at={D} label="D" tone="acc" dotted />
    </>
  );
}

/** Цепочка означающих: сеансы друг за другом; ни одного пока нет */
function Chain() {
  const xs = [26, 88, 150];
  return (
    <>
      {xs.slice(0, -1).map((x, i) => (
        <Link key={x} from={[x, 56]} to={[xs[i + 1], 56]} ra={17} rb={17} tone={i === 0 ? 'acc' : 'ink'} dotted />
      ))}
      {xs.map((x, i) => (
        <Node key={x} at={[x, 56]} r={17} label="S" sub={String(i + 1)} size={17} tone={i === 0 ? 'acc' : 'ink'} dotted />
      ))}
    </>
  );
}

/** Модель Бека как айсберг: над водой автоматические мысли, под ней промежуточные и глубинные убеждения */
function Levels() {
  return (
    <>
      <path className="dg__soft" d="M72 40L104 40L88 12Z" />
      <path className="dg__soft dg__soft--weak" d="M38 66L138 66L88 104Z" />
      <path className="dg__ln dg__ln--acc" d="M88 12L104 40H72Z" />
      <path className="dg__ln dg__ln--ink" d="M72 40L38 66L88 104L138 66L104 40" />
      <path className="dg__ln dg__ln--ink" d="M38 66H138" />
      <path className="dg__ln dg__ln--faint dg__ln--dot" d="M12 40H164" />
      <path className="dg__ln dg__ln--faint" d="M160 14V90M155.5 84.5L160 90.5L164.5 84.5" />
    </>
  );
}

/** Когнитивный треугольник: мысли, эмоции, поведение влияют друг на друга; в середине тот, о ком запись */
function Triangle() {
  const M: P = [88, 21];
  const E: P = [40, 90];
  const B: P = [136, 90];
  return (
    <>
      <Link from={M} to={E} arrow="both" />
      <Link from={M} to={B} arrow="both" />
      <Link from={E} to={B} arrow="both" />
      <Node at={M} label="М" />
      <Node at={E} label="Э" />
      <Node at={B} label="П" />
      <circle cx="88" cy="68" r="3.2" className="dg__fill-acc" />
      <circle cx="88" cy="68" r="8.5" className="dg__ln dg__ln--acc dg__ln--dot" style={dots(8.5)} />
    </>
  );
}

/** Бланк «дневника мыслей»: колонки A, B, C; строки еще не заполнены */
function Record() {
  const cols = [20, 65.3, 110.7, 156];
  return (
    <>
      <path className="dg__soft" d="M20 36V22a8 8 0 0 1 8-8H148a8 8 0 0 1 8 8V36Z" />
      <rect x="20" y="14" width="136" height="84" rx="8" className="dg__ln dg__ln--ink" />
      <path className="dg__ln dg__ln--ink" d="M20 36H156M65.3 14V98M110.7 14V98" />
      {['A', 'B', 'C'].map((c, i) => (
        <text key={c} x={(cols[i] + cols[i + 1]) / 2} y="25.5" dy=".36em" textAnchor="middle" fontSize="13" className="dg__t dg__t--acc">
          {c}
        </text>
      ))}
      {[0, 1, 2].map((i) =>
        [54, 74].map((yy) => <path key={`${i}-${yy}`} className="dg__ln dg__ln--faint dg__ln--dot" d={`M${n2(cols[i] + 9)} ${yy}H${n2(cols[i + 1] - 9)}`} />),
      )}
    </>
  );
}

/** Окно толерантности: ровная линия между «слишком много» и «слишком мало» */
function Window() {
  const wave: string[] = [];
  for (let x = 14; x <= 162; x += 2) wave.push(`${x} ${n2(58 + 9 * Math.sin(((x - 14) / 58) * 2 * Math.PI))}`);
  return (
    <>
      <rect x="14" y="36" width="148" height="44" className="dg__soft" />
      <path className="dg__ln dg__ln--faint dg__ln--dot" d="M14 36H162M14 80H162" />
      <path className="dg__ln dg__ln--faint" d="M82 22L88 16L94 22M82 94L88 100L94 94" />
      <path className="dg__ln dg__ln--acc" d={`M${wave.join('L')}`} />
      <circle cx="162" cy={n2(58 + 9 * Math.sin(((162 - 14) / 58) * 2 * Math.PI))} r="3.6" className="dg__fill-acc" />
    </>
  );
}

/** Двое и то, что возникает между ними; второй круг, пока встречи нет, пунктиром */
function Dyad() {
  const id = useId();
  return (
    <>
      <clipPath id={id}>
        <circle cx="106" cy="56" r="32" />
      </clipPath>
      <circle cx="70" cy="56" r="32" className="dg__soft" clipPath={`url(#${id})`} />
      <circle cx="70" cy="56" r="32" className="dg__ln dg__ln--ink" />
      <circle cx="106" cy="56" r="32" className="dg__ln dg__ln--acc dg__ln--dot" style={dots(32)} />
      <circle cx="70" cy="56" r="2.6" className="dg__fill-ink" />
      <circle cx="106" cy="56" r="2.6" className="dg__fill-acc" />
    </>
  );
}

/** Объект a с орбитой: то, что выбрано и держится рядом */
function ObjectA() {
  const ang = (-32 * Math.PI) / 180;
  return (
    <>
      <ellipse cx="88" cy="56" rx="60" ry="32" className="dg__ln dg__ln--faint dg__ln--dot" style={dots(46)} />
      <circle cx={n2(88 + 60 * Math.cos(ang))} cy={n2(56 + 32 * Math.sin(ang))} r="4.4" className="dg__ln dg__ln--ink" />
      <circle cx="88" cy="56" r="21" className="dg__ln dg__ln--acc" />
      <text x="88" y="56" dy=".36em" textAnchor="middle" fontSize="28" className="dg__t dg__t--acc dg__t--lg">
        a
      </text>
    </>
  );
}

/* Узел Борромео: три кольца, снятие любого освобождает два других. Центры колец — вершины правильного треугольника */
const RING_R = 30;
const RING_D = 17;
const RING_C: P = [88, 60];
const ringCenter = (i: number): P => {
  const a = ((-90 + i * 120) * Math.PI) / 180;
  return [RING_C[0] + RING_D * Math.cos(a), RING_C[1] + RING_D * Math.sin(a)];
};
/** Две точки пересечения колец i и j */
function crossings(i: number, j: number): P[] {
  const c1 = ringCenter(i);
  const c2 = ringCenter(j);
  const dx = c2[0] - c1[0];
  const dy = c2[1] - c1[1];
  const D = Math.hypot(dx, dy);
  const h = Math.sqrt(RING_R * RING_R - (D / 2) * (D / 2));
  const m: P = [c1[0] + dx / 2, c1[1] + dy / 2];
  return [
    [m[0] + (h * dy) / D, m[1] - (h * dx) / D],
    [m[0] - (h * dy) / D, m[1] + (h * dx) / D],
  ];
}

/** Дуги кольца i без разрывов под кольцом i−1: у каждой дуги ровный срез поперек линии, как у настоящего узла */
function ringArcs(i: number, stroke: number, gap: number): string[] {
  const c = ringCenter(i);
  const over = (i + 2) % 3;
  const cuts = crossings(over, i)
    .map((p) => {
      const mid = Math.atan2(p[1] - c[1], p[0] - c[0]);
      // Угол пересечения колец: чем он острее, тем длиннее разрыв вдоль дуги
      const co = ringCenter(over);
      const cosPhi = (2 * RING_R * RING_R - Math.hypot(c[0] - co[0], c[1] - co[1]) ** 2) / (2 * RING_R * RING_R);
      const half = (stroke / 2 + gap) / Math.sin(Math.acos(cosPhi)) / RING_R;
      return { from: mid - half, to: mid + half };
    })
    .sort((x, y) => x.from - y.from);
  const point = (t: number) => `${n2(c[0] + RING_R * Math.cos(t))} ${n2(c[1] + RING_R * Math.sin(t))}`;
  return cuts.map((cut, k) => {
    const next = cuts[(k + 1) % cuts.length];
    let end = next.from;
    while (end <= cut.to) end += 2 * Math.PI;
    return `M${point(cut.to)}A${RING_R} ${RING_R} 0 ${end - cut.to > Math.PI ? 1 : 0} 1 ${point(end)}`;
  });
}

/** Кольцо i лежит поверх кольца i+1, а под кольцом i−1: так плетется узел, где пары колец не сцеплены */
export function Rings({ letters = false, stroke = 2.2, gap = 2.2 }: { letters?: boolean; stroke?: number; gap?: number }): ReactNode {
  const tones: Tone[] = letters ? ['ink', 'ink', 'ink'] : ['acc', 'ink', 'ink'];
  return (
    <>
      {[0, 1, 2].map((i) => (
        <path key={i} d={ringArcs(i, stroke, gap).join('')} className={cls('dg__ln', `dg__ln--${tones[i]}`)} style={{ strokeWidth: stroke, strokeLinecap: 'butt' }} />
      ))}
      {letters &&
        ['R', 'S', 'I'].map((ch, i) => {
          const a = ((-90 + i * 120) * Math.PI) / 180;
          const c = ringCenter(i);
          return (
            <text key={ch} x={n2(c[0] + Math.cos(a) * 19)} y={n2(c[1] + Math.sin(a) * 19)} dy=".36em" textAnchor="middle" fontSize="14" className="dg__t dg__t--acc">
              {ch}
            </text>
          );
        })}
    </>
  );
}

const ART: Record<Exclude<DiagramKind, 'rings'>, () => ReactNode> = {
  schemaL: SchemaL,
  formula: Formula,
  bell: Bell,
  abc: Abc,
  chain: Chain,
  levels: Levels,
  triangle: Triangle,
  record: Record,
  window: Window,
  dyad: Dyad,
  object: ObjectA,
};

/** Схема или формула на холсте 176×112; размер задает ширина, высота идет по пропорции */
export function Diagram({ kind, width = DIAGRAM_W, className = '' }: { kind: DiagramKind; width?: number; className?: string }) {
  const Art = kind === 'rings' ? () => <Rings letters /> : ART[kind];
  return (
    <svg className={cls('dg', className)} width={width} height={n2((width * DIAGRAM_H) / DIAGRAM_W)} viewBox={`0 0 ${DIAGRAM_W} ${DIAGRAM_H}`} aria-hidden="true" focusable="false">
      <Art />
    </svg>
  );
}
