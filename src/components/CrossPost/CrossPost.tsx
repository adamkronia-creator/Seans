import type { CSSProperties } from 'react';
import { Frame } from '../Frame/Frame';
import { IconCheckMark, IconClockLine, IconWarning } from '../GroupUi/GroupIcons';
import { NETWORK_META, crosspostLabel, failureText, limitOf, planPublish, type Crosspost, type Network } from '../../data/crosspost';
import { setPick, useConnections, usePicked } from '../../data/integrations';
import type { Message } from '../../data/messages';
import './CrossPost.css';

/*
 * Публикация поста канала в Telegram и ВК на экранах: цветная плашка сети, полоса «Также в…» над полем ввода,
 * состояние отправки в строке поста и окно с причиной, если не вышло. Данные и «сервер» — data/integrations.ts.
 */

/** Плашка сети: монограмма на цветном квадрате. Логотипов Telegram и ВК в приложении нет — плашки отличаются буквами и цветом */
export function NetworkTile({ network, size = 24 }: { network: Network; size?: number }) {
  const meta = NETWORK_META[network];
  return (
    <span className="net-tile" style={{ '--tile': `${size}px`, '--hue': meta.hue } as CSSProperties} aria-hidden="true">
      {meta.short}
    </span>
  );
}

function Mark({ state }: { state: Crosspost['state'] }) {
  if (state === 'sent') return <IconCheckMark className="cross-mark cross-mark--ok" aria-hidden="true" />;
  if (state === 'sending') return <IconClockLine className="cross-mark" aria-hidden="true" />;
  return <IconWarning className="cross-mark cross-mark--bad" aria-hidden="true" />;
}

/**
 * Состояние поста в сетях, в нижней строке поста: плашка сети и отметка — часы (идёт отправка), галочка (вышел), треугольник (не вышел, есть причина и «Повторить»).
 * Нажатие на плашку неудачи открывает окно; у вышедшего поста со ссылкой — саму запись в сети.
 */
export function CrossStatus({ items, onFailed }: { items: Crosspost[]; onFailed: (network: Network) => void }) {
  return (
    <span className="cross-status">
      {items.map((c) => {
        const label = crosspostLabel(c);
        const body = (
          <>
            <NetworkTile network={c.network} size={16} />
            <Mark state={c.state} />
            {c.state === 'failed' && <span className="cross-chip__text">{c.op === 'edit' ? 'Не обновлено' : 'Не отправлено'}</span>}
          </>
        );
        const cls = `cross-chip cross-chip--${c.state}`;
        if (c.state === 'failed') {
          return (
            <button key={c.network} type="button" className={cls} aria-label={`${label}. Подробнее`} onClick={() => onFailed(c.network)}>
              {body}
            </button>
          );
        }
        if (c.url) {
          const url = c.url;
          return (
            <button key={c.network} type="button" className={cls} aria-label={`${label}. Открыть`} onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}>
              {body}
            </button>
          );
        }
        return (
          <span key={c.network} className={cls} role="img" aria-label={label}>
            {body}
          </span>
        );
      })}
    </span>
  );
}

/**
 * Строка состояния в верху меню поста (как «изменено в 14:39» в Telegram): плашка сети, «Опубликовано в Telegram» и отметка.
 * Неудачу можно нажать: откроется окно с причиной и «Повторить».
 */
export function CrossMenuRow({ item, onFailed }: { item: Crosspost; onFailed: (network: Network) => void }) {
  const body = (
    <>
      <NetworkTile network={item.network} size={20} />
      <span className="msg-menu__status-text">{crosspostLabel(item)}</span>
      <Mark state={item.state} />
    </>
  );
  if (item.state === 'failed') {
    return (
      <button type="button" role="menuitem" className="msg-menu__status msg-menu__status--bad" onClick={() => onFailed(item.network)}>
        {body}
      </button>
    );
  }
  return <div className="msg-menu__status">{body}</div>;
}

/** 4210 → «4 210»: число знаков в подсказке читается легче */
const grouped = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

interface CrossBarProps {
  chatId: string;
  /** Набранный текст: от него зависит, вмещается ли пост в выбранные сети */
  text: string;
  /** Нажали на сеть, подключение к которой не работает */
  onBroken: (network: Network) => void;
}

/**
 * Полоса над полем ввода канала: «Также в Telegram · ВК». Нажатие включает или выключает сеть для следующего поста
 * (по умолчанию — как в настройках подключения). Если текст длиннее, чем принимает сеть, плашка краснеет, а под полосой сказано, на сколько.
 * Пока у канала нет ни одного подключения, полосы нет.
 */
export function CrossBar({ chatId, text, onBroken }: CrossBarProps) {
  const connections = useConnections(chatId);
  const picked = usePicked(chatId);
  if (connections.length === 0) return null;
  const over = planPublish({ text }, picked).filter((p) => !p.fits);
  return (
    <div className="cross-bar" role="group" aria-label="Также опубликовать">
      <div className="cross-bar__row">
        <span className="cross-bar__label">Также в</span>
        {connections.map((c) => {
          const meta = NETWORK_META[c.network];
          const broken = c.status !== 'connected';
          const on = !broken && picked.includes(c.network);
          const long = over.some((o) => o.network === c.network);
          return (
            <button
              key={c.network}
              type="button"
              className={`cross-pick${on ? ' cross-pick--on' : ''}${broken ? ' cross-pick--broken' : ''}${long ? ' cross-pick--long' : ''}`}
              aria-pressed={broken ? undefined : on}
              aria-label={broken ? `${meta.name}: подключение не работает` : meta.name}
              // Нажатие не уводит фокус из поля: клавиатура остаётся на месте
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => (broken ? onBroken(c.network) : setPick(chatId, c.network, !on))}
            >
              <NetworkTile network={c.network} size={20} />
              <span className="cross-pick__name">{meta.name}</span>
              {broken ? <IconWarning className="cross-mark cross-mark--warn" aria-hidden="true" /> : on ? <IconCheckMark className="cross-mark" aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
      {over.map((o) => (
        <p key={o.network} className="cross-bar__warn" role="status">
          {NETWORK_META[o.network].name} принимает не больше {grouped(o.limit)} знаков, сейчас&nbsp;{grouped(o.length)}
        </p>
      ))}
    </div>
  );
}

interface CrossSheetProps {
  chatId: string;
  post: Message;
  network: Network;
  /** Вы владелец канала и можете открыть «Подключения» */
  owner: boolean;
  onRetry: () => void;
  onSettings: () => void;
  onClose: () => void;
}

/** Окно с причиной, почему пост не ушёл (или не обновился) в сеть, и тем, что с этим делать */
export function CrossSheet({ chatId, post, network, owner, onRetry, onSettings, onClose }: CrossSheetProps) {
  const connections = useConnections(chatId);
  const cross = post.crossposts?.find((c) => c.network === network);
  if (!cross) return null;
  const conn = connections.find((c) => c.network === network);
  const photo = Boolean(post.image);
  const working = conn?.status === 'connected';
  const fits = planPublish({ text: post.text, photo }, [network])[0].fits;
  // Пока подключение не работает, причина — в нём, а не в самой отправке
  const reason = working ? (cross.failure ?? 'unknown') : (conn?.problem ?? 'not_connected');
  return (
    <Frame
      title={crosspostLabel(cross)}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onClose}>
            Закрыть
          </button>
          {working && fits && (
            <button
              type="button"
              className="sheet__button sheet__button--primary"
              onClick={() => {
                onClose();
                onRetry();
              }}
            >
              Повторить
            </button>
          )}
          {!working && owner && (
            <button
              type="button"
              className="sheet__button sheet__button--primary"
              onClick={() => {
                onClose();
                onSettings();
              }}
            >
              Подключения
            </button>
          )}
        </>
      }
    >
      <p className="cross-sheet__text">{failureText(network, reason, limitOf(network, photo))}</p>
      {!working && !owner && <p className="cross-sheet__note">Подключение настраивает владелец канала.</p>}
      {working && !fits && <p className="cross-sheet__note">Измените пост (меню → «Изменить») и повторите отправку.</p>}
    </Frame>
  );
}
