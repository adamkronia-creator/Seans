import { commonPrefix, editDistance, indexWords, isNumber, normalize, stem, swapLayout, words } from './ruText';

/*
 * Поиск по набору документов с полями разной важности. Без зависимостей.
 *
 * Как находит:
 *  — по словам запроса: все слова должны найтись (в любой форме: «тревоги», «тревожный»), а если так ничего нет,
 *    показываются документы, где совпала хотя бы часть слов, и это отмечено;
 *  — по началу слова, пока человек печатает («трев» → «тревога»);
 *  — по смыслу: слова одного понятия считаются близкими («грусть» находит депрессию);
 *  — с опечаткой («тревожнсть») и с неверной раскладкой («nhtdj;yjcnm»), но только когда иначе ничего не нашлось;
 *  — выше стоит документ, где слово встретилось в более важном поле, а редкое слово весит больше частого.
 */

export interface FieldSpec {
  id: string;
  /** Как назвать поле в пояснении «Найдено: …» */
  label: string;
  /** Важность совпадения в этом поле */
  weight: number;
  /** Поле видно в карточке (название, описание): о совпадении в нём объяснять не нужно, его подсвечивает карточка */
  visible?: boolean;
}

export interface IndexDoc {
  id: string;
  /** Значения полей; каждая строка — отдельная запись (одна шкала, одна тема), чтобы показать, где именно нашлось */
  fields: Record<string, string[]>;
  /** Названия, которые запрос должен находить первыми: «СМОЛ», «PHQ-9» */
  exact?: string[];
  /** Понятия, которые документ называет явно, даже если нужных слов в его тексте нет */
  concepts?: string[];
}

/** Понятие: слова, близкие по смыслу («грусть», «уныние», «подавленность» — депрессия) */
export interface Concept {
  id: string;
  label: string;
  /** Отдельные слова; для каждого учитываются формы и начало */
  terms: string[];
}

export interface SearchHit {
  score: number;
  /** Поле лучшего совпадения */
  field: string;
  fieldLabel: string;
  /** Запись поля, где нашлось: «Ипохондрия (Hs)» */
  text: string;
  /** Совпало в поле, которое и так видно в карточке */
  visible: boolean;
  /** Нашлось по смыслу, а не по слову: название понятия */
  via?: string;
  /** Сколько слов запроса совпало */
  matched: number;
}

export interface SearchResult {
  /** Слова запроса без служебных («для», «тест») */
  tokens: string[];
  hits: Map<string, SearchHit>;
  /** Идентификаторы по убыванию совпадения */
  order: string[];
  /** Совпали не все слова запроса */
  partial: boolean;
  /** Поправки: что человек набрал и что поиск понял */
  fixes: { from: string; to: string }[];
  /** Слова индекса, по которым нашлось: карточка подсвечивает их в тексте */
  words: ReadonlySet<string>;
}

/**
 * Служебные слова и названия видов материала: «тест на тревогу» ищется как «тревога». Сравниваются основы, так что
 * «шкала», «шкалы» и «шкале» — одно слово. Если в запросе только они, ищется всё как есть.
 */
const STOP_STEMS = new Set(
  (
    'и в во на по с со к ко от до из за для при про о об у а но или же ли не что как это тест тесты тестирование задание задания упражнение упражнения ' +
    'опросник шкала методика инвентарь нужен нужна нужно нужны хочу найти подобрать покажи показать где мне мой моя мое клиент пациент'
  )
    .split(' ')
    .map((w) => stem(w)),
);

interface Posting {
  doc: number;
  field: number;
  entry: number;
}

interface VocabEntry {
  word: string;
  stem: string;
  postings: Posting[];
  concepts: number[];
}

interface Match {
  score: number;
  field: number;
  entry: number;
  via?: number;
}

interface TermEntry {
  concept: number;
  word: string;
  stem: string;
}

export interface SearchIndex {
  search(query: string): SearchResult | null;
  /** Понятия, к которым относится слово запроса (для подсказок) */
  conceptsOf(token: string): string[];
}

/** Насколько слово из индекса подходит слову запроса: 0 — не подходит, 1 — то же слово */
function strength(q: string, qs: string, w: string, ws: string): number {
  if (q === w) return 1;
  // Числа сравниваются целиком: «9» находит «PHQ-9», но не «SCL-90»
  if (isNumber(q) || isNumber(w)) return 0;
  let best = 0;
  if (qs === ws && qs.length >= 2) best = 0.92;
  // Начало слова: человек ещё печатает
  if (q.length >= 2 && w.startsWith(q)) best = Math.max(best, q.length >= 4 ? 0.82 : q.length === 3 ? 0.7 : 0.55);
  // Та же основа с другим окончанием или суффиксом («депрессия» и «депрессивный»)
  if (qs.length >= 3 && ws.startsWith(qs)) best = Math.max(best, 0.78);
  if (ws.length >= 4 && qs.startsWith(ws)) best = Math.max(best, 0.62);
  const common = commonPrefix(qs, ws);
  if (common >= 5 && common >= Math.min(qs.length, ws.length) - 2) best = Math.max(best, 0.55);
  return best;
}

/** Допустимое число опечаток для слова такой длины */
const typos = (length: number) => (length >= 9 ? 2 : length >= 5 ? 1 : 0);

export function createIndex(docs: IndexDoc[], fields: FieldSpec[], concepts: Concept[] = []): SearchIndex {
  const fieldIndex = new Map(fields.map((f, i) => [f.id, i]));

  // Словарь: каждое слово один раз, у него список мест, где оно встречается
  const vocab = new Map<string, VocabEntry>();
  docs.forEach((doc, d) => {
    for (const [fieldId, entries] of Object.entries(doc.fields)) {
      const f = fieldIndex.get(fieldId);
      if (f === undefined) continue;
      entries.forEach((text, e) => {
        for (const word of new Set(indexWords(text))) {
          let entry = vocab.get(word);
          if (!entry) {
            entry = { word, stem: stem(word), postings: [], concepts: [] };
            vocab.set(word, entry);
          }
          entry.postings.push({ doc: d, field: f, entry: e });
        }
      });
    }
  });
  const list = [...vocab.values()];

  // Понятия: какие слова словаря к ним относятся и в каких документах они встречаются
  const terms: TermEntry[] = concepts.flatMap((c, i) =>
    c.terms.flatMap((t) => words(t).map((word) => ({ concept: i, word, stem: stem(word) }))),
  );
  const conceptDocs: Map<number, Match>[] = concepts.map(() => new Map());
  const note = (c: number, d: number, match: Match) => {
    const map = conceptDocs[c];
    const old = map.get(d);
    if (!old || old.score < match.score) map.set(d, match);
  };
  for (const entry of list) {
    for (const term of terms) {
      // В тексте слово понятия должно встретиться само или в другой форме; по началу слова нельзя: «экспресс» — не «экспрессивность»
      if (strength(term.word, term.stem, entry.word, entry.stem) >= 0.9 && !entry.concepts.includes(term.concept)) entry.concepts.push(term.concept);
    }
    for (const c of entry.concepts) for (const p of entry.postings) note(c, p.doc, { score: fields[p.field].weight, field: p.field, entry: p.entry });
  }
  const conceptIndex = new Map(concepts.map((c, i) => [c.id, i]));
  docs.forEach((doc, d) => {
    for (const id of doc.concepts ?? []) {
      const c = conceptIndex.get(id);
      if (c !== undefined) note(c, d, { score: 60, field: fieldIndex.get('domain') ?? 0, entry: 0 });
    }
  });

  const exact = docs.map((d) => (d.exact ?? []).map(normalize));

  /** Понятия, которым близко слово запроса */
  const conceptsFor = (token: string, tokenStem: string): number[] => {
    const found = new Set<number>();
    for (const term of terms) if (strength(token, tokenStem, term.word, term.stem) >= 0.75) found.add(term.concept);
    return [...found];
  };

  /** Совпадения одного слова запроса: документ → лучшее совпадение, и слова индекса, по которым нашлось */
  function direct(token: string): { matches: Map<number, Match>; hit: Set<string> } {
    const tokenStem = stem(token);
    const matches = new Map<number, Match>();
    const hit = new Set<string>();
    const put = (d: number, m: Match) => {
      const old = matches.get(d);
      if (!old || old.score < m.score) matches.set(d, m);
    };
    for (const entry of list) {
      const s = strength(token, tokenStem, entry.word, entry.stem);
      if (s <= 0) continue;
      hit.add(entry.word);
      for (const p of entry.postings) put(p.doc, { score: fields[p.field].weight * s, field: p.field, entry: p.entry });
    }
    // По смыслу: понятие поднимает документ, но если слово есть и буквально, объясняем найденное буквальным совпадением
    const meaning = new Map<number, Match>();
    for (const c of conceptsFor(token, tokenStem)) {
      for (const [d, m] of conceptDocs[c]) {
        const old = meaning.get(d);
        const score = m.score * 0.8;
        if (!old || old.score < score) meaning.set(d, { score, field: m.field, entry: m.entry, via: c });
      }
    }
    for (const [d, m] of meaning) {
      const literal = matches.get(d);
      if (!literal) matches.set(d, m);
      else if (m.score > literal.score) matches.set(d, { ...literal, score: m.score });
    }
    return { matches, hit };
  }

  /** То же с опечаткой: только когда прямо ничего не нашлось */
  function fuzzy(token: string): { matches: Map<number, Match>; hit: Set<string>; fix?: string } | null {
    const max = typos(token.length);
    if (!max || isNumber(token)) return null;
    const tokenStem = stem(token);
    let bestWord = '';
    let bestDistance = max + 1;
    const matches = new Map<number, Match>();
    const hit = new Set<string>();
    for (const entry of list) {
      if (isNumber(entry.word)) continue;
      const d = Math.min(editDistance(token, entry.word, max), editDistance(tokenStem, entry.stem, max));
      if (d > max) continue;
      hit.add(entry.word);
      if (d < bestDistance) {
        bestDistance = d;
        bestWord = entry.word;
      }
      const s = 0.5 - 0.1 * (d - 1);
      for (const p of entry.postings) {
        const score = fields[p.field].weight * s;
        const old = matches.get(p.doc);
        if (!old || old.score < score) matches.set(p.doc, { score, field: p.field, entry: p.entry });
      }
    }
    return matches.size ? { matches, hit, fix: bestWord } : null;
  }

  function run(query: string): SearchResult | null {
    let tokens = words(query).filter((w) => w.length > 1 || isNumber(w));
    const meaningful = tokens.filter((w) => !STOP_STEMS.has(stem(w)));
    if (meaningful.length) tokens = meaningful;
    tokens = [...new Set(tokens)];
    if (!tokens.length) return null;

    const hitWords = new Set<string>();
    const fixes: { from: string; to: string }[] = [];
    const units = tokens.map((token) => {
      let r: { matches: Map<number, Match>; hit: Set<string>; fix?: string } | null = direct(token);
      if (!r.matches.size) {
        const f = fuzzy(token);
        if (f) {
          r = f;
          if (f.fix) fixes.push({ from: token, to: f.fix });
        }
      }
      r.hit.forEach((w) => hitWords.add(w));
      // Редкое слово весит больше частого: «оценки» есть почти везде и порядок почти не меняет
      const idf = Math.log(1 + docs.length / Math.max(1, r.matches.size));
      return { matches: r.matches, idf };
    });

    const covered = new Map<number, { score: number; count: number; best: Match & { score: number }; bestScore: number }>();
    units.forEach(({ matches, idf }) => {
      for (const [d, m] of matches) {
        const score = m.score * idf;
        const c = covered.get(d);
        if (!c) covered.set(d, { score, count: 1, best: { ...m, score }, bestScore: score });
        else {
          c.score += score;
          c.count += 1;
          if (score > c.bestScore) {
            c.best = { ...m, score };
            c.bestScore = score;
          }
        }
      }
    });
    if (!covered.size) return null;

    const full = [...covered.entries()].filter(([, c]) => c.count === units.length);
    const partial = full.length === 0;
    const chosen = partial ? [...covered.entries()] : full;

    const norm = normalize(query);
    const hits = new Map<string, SearchHit>();
    const rows = chosen.map(([d, c]) => {
      let bonus = 0;
      for (const e of exact[d]) {
        if (e === norm) bonus = Math.max(bonus, 200);
        else if (norm.length >= 2 && e.startsWith(norm)) bonus = Math.max(bonus, 30);
      }
      const doc = docs[d];
      const field = fields[c.best.field];
      const entries = doc.fields[field.id] ?? [];
      hits.set(doc.id, {
        score: c.score + bonus,
        field: field.id,
        fieldLabel: field.label,
        text: entries[c.best.entry] ?? '',
        visible: !!field.visible,
        via: c.best.via !== undefined ? concepts[c.best.via].label : undefined,
        matched: c.count,
      });
      return { d, matched: c.count, score: c.score + bonus };
    });
    rows.sort((a, b) => b.matched - a.matched || b.score - a.score || a.d - b.d);
    return { tokens, hits, order: rows.map((r) => docs[r.d].id), partial, fixes, words: hitWords };
  }

  const cache = new Map<string, SearchResult | null>();

  return {
    search(query) {
      const key = query.trim().toLowerCase();
      if (cache.has(key)) return cache.get(key) ?? null;
      let result = run(key);
      // Ничего не нашлось: возможно, набрано не на той раскладке
      if (!result && key) {
        const swapped = swapLayout(key);
        if (swapped !== key) {
          const again = run(swapped);
          if (again) result = { ...again, fixes: [{ from: key, to: swapped.replace(/\s+/g, ' ').trim() }] };
        }
      }
      if (cache.size > 80) cache.clear();
      cache.set(key, result);
      return result;
    },
    conceptsOf(token) {
      const t = normalize(token);
      return conceptsFor(t, stem(t)).map((c) => concepts[c].id);
    },
  };
}
