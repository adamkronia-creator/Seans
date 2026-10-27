import { useRef } from 'react';
import { IconBack } from '../../components/icons';
import { Switch } from '../../components/Switch/Switch';
import { ALWAYS_SHOWN, moveChatTab, setChatTabShown, useChatTabs, type SectionId } from '../../data/chatTabs';
import { goBack } from '../../router';
import { flip } from '../../utils/flip';
import { useSwipeBack } from '../../utils/swipeBack';
import { SECTION_ICON, SECTION_LABEL } from '../ChatPage/chatSections';
import '../FolderPage/FolderPage.css';
import '../FoldersPage/FoldersPage.css';
import './ChatTabsPage.css';

/**
 * «Настройки чата» (пункт меню чата): вкладки списком. Строку можно перетащить за значок слева, переключатель скрывает вкладку.
 * Порядок и видимость общие для всех чатов; меню чата и листание страниц пальцем следуют им. «Диалог» скрыть нельзя.
 */
export function ChatTabsPage({ chatId }: { chatId: string }) {
  const { order, hidden } = useChatTabs();
  const list = useRef<HTMLUListElement>(null);
  const back = () => goBack(`/chat/${chatId}`);
  useSwipeBack('.ctabs', true, back);

  // Перетаскивание за значок: строка идёт за пальцем, при пересечении середины соседа порядок меняется
  const grab = (e: React.PointerEvent<HTMLElement>, id: SectionId) => {
    const handle = e.currentTarget;
    const row = handle.closest('li') as HTMLElement | null;
    if (!row) return;
    e.preventDefault();
    handle.setPointerCapture(e.pointerId);
    const y0 = e.clientY;
    const top0 = row.offsetTop;
    row.classList.add('fs-row--dragging');
    row.style.transition = 'box-shadow 0.16s';
    const place = (y: number) => {
      row.style.transform = `translateY(${top0 + (y - y0) - row.offsetTop}px)`;
    };
    const rowsOf = () => Array.from(list.current?.querySelectorAll<HTMLElement>('li[data-id]') ?? []);
    const moveEv = (ev: PointerEvent) => {
      place(ev.clientY);
      const rows = rowsOf();
      const at = rows.indexOf(row);
      const h = row.offsetHeight;
      const c = row.offsetTop + (parseFloat(row.style.transform.replace(/[^-\d.]/g, '')) || 0) + h / 2;
      const n = rows[at + 1];
      const p = rows[at - 1];
      const before = new Map(rows.map((el) => [el, el.offsetTop]));
      if (n && c > n.offsetTop + h / 2) moveChatTab(id, 1);
      else if (p && c < p.offsetTop + h / 2) moveChatTab(id, -1);
      else return;
      place(ev.clientY);
      requestAnimationFrame(() => {
        place(ev.clientY);
        flip(rowsOf().filter((el) => el !== row), before, 'y');
      });
    };
    const done = () => {
      handle.removeEventListener('pointermove', moveEv);
      handle.removeEventListener('pointerup', done);
      handle.removeEventListener('pointercancel', done);
      row.classList.remove('fs-row--dragging');
      row.style.transition = 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s';
      row.style.transform = '';
      window.setTimeout(() => (row.style.transition = ''), 240);
    };
    handle.addEventListener('pointermove', moveEv);
    handle.addEventListener('pointerup', done);
    handle.addEventListener('pointercancel', done);
  };

  return (
    <section className="fp fs ctabs">
      <header className="fp__header">
        <button type="button" className="fp__back" aria-label="Назад" onClick={back}>
          <IconBack />
        </button>
        <div className="fp__who">
          <h1 className="fp__title">Настройки чата</h1>
          <p className="fp__subtitle">Вкладки</p>
        </div>
      </header>
      <div className="fp__scroll">
        <div className="fs__lead">
          <p>Меняйте порядок вкладок для более комфортного взаимодействия, свайп разделов подстроится автоматически.</p>
        </div>

        <section className="fp__card" aria-label="Вкладки чата">
          <h2 className="fp__heading fp__heading--pad">Вкладки чата</h2>
          <ul ref={list} className="fs__list">
            {order.map((id) => {
              const Icon = SECTION_ICON[id];
              const shown = !hidden.includes(id);
              return (
                <li key={id} className="fs-row ctabs__row" data-id={id}>
                  <span className="fs-row__grip" role="button" aria-label={`Переставить вкладку «${SECTION_LABEL[id]}»`} onPointerDown={(e) => grab(e, id)}>
                    <Grip />
                  </span>
                  <span className="ctabs__icon" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className={`fs-row__name${shown ? '' : ' ctabs__name--off'}`}>{SECTION_LABEL[id]}</span>
                  <span className="ctabs__switch">
                    <Switch checked={shown} onChange={(next) => id !== ALWAYS_SHOWN && setChatTabShown(id, next)} label={`Показывать вкладку «${SECTION_LABEL[id]}»`} />
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </section>
  );
}

const Grip = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M5 9h14M5 15h14" />
  </svg>
);
