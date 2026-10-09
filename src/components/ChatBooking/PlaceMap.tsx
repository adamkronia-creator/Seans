import { useEffect, useRef, useState } from 'react';
import { embedUrl, geocode, type Point } from './geocode';
import { IconBookingRoute } from '../icons';

type MapState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready'; point: Point }
  | { kind: 'missing' }
  | { kind: 'error' };

const TEXT: Record<Exclude<MapState['kind'], 'ready'>, { label: string; hint: string }> = {
  idle: { label: 'Показать на карте', hint: 'Загрузится с openstreetmap.org' },
  loading: { label: 'Ищем адрес…', hint: '' },
  missing: { label: 'Адреса нет на карте', hint: 'Проверьте адрес или откройте его в картах' },
  error: { label: 'Карта не загрузилась', hint: 'Нажмите, чтобы повторить' },
};

/**
 * Карта места приема. Пока не нажали «Показать на карте», это просто плитка: сторонние сервисы не вызываются.
 * Карта в рамке не двигается (pointer-events: none в CSS), иначе она перехватывала бы прокрутку и листание вкладок;
 * для крупной карты есть «Открыть в картах».
 */
export function PlaceMap({ address, onOpenMaps }: { address: string; onOpenMaps: () => void }) {
  const [state, setState] = useState<MapState>({ kind: 'idle' });
  const run = useRef<AbortController | null>(null);

  // Адрес поменяли: прежняя карта не нужна, незаконченный поиск отменяется
  useEffect(() => {
    setState({ kind: 'idle' });
    return () => {
      run.current?.abort();
      run.current = null;
    };
  }, [address]);

  const show = () => {
    run.current?.abort();
    const controller = new AbortController();
    run.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    setState({ kind: 'loading' });
    geocode(address, controller.signal)
      .then((point) => {
        if (run.current === controller) setState(point ? { kind: 'ready', point } : { kind: 'missing' });
      })
      .catch(() => {
        if (run.current === controller) setState({ kind: 'error' });
      })
      .finally(() => window.clearTimeout(timeout));
  };

  if (state.kind === 'ready') {
    return (
      <div className="place-map place-map--ready">
        <iframe
          className="place-map__frame"
          src={embedUrl(state.point)}
          title={`Карта: ${address}`}
          sandbox="allow-scripts allow-same-origin"
          tabIndex={-1}
        />
        <button type="button" className="place-map__open" onClick={onOpenMaps}>
          Открыть в картах
        </button>
      </div>
    );
  }

  const { label, hint } = TEXT[state.kind];
  return (
    <button type="button" className="place-map place-map--tile" disabled={state.kind === 'loading'} onClick={show}>
      <IconBookingRoute className="place-map__icon" />
      <span className="place-map__label">{label}</span>
      {hint && <span className="place-map__hint">{hint}</span>}
    </button>
  );
}
