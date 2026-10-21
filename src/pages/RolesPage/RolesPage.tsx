import { useId, useState } from 'react';
import { Frame } from '../../components/Frame/Frame';
import { IconChevronMk } from '../../components/ChatItem/ChatIcons';
import { IconBack } from '../../components/icons';
import { IconPlusLine } from '../../components/Profile/ProfileIcons';
import { inSentence, ROLE_MAX } from '../../data/roles';
import { createRole, isNameFree, useAllLinks, useRoles } from '../../data/roleStore';
import { plural } from '../../data/taskValues';
import { goBack, navigate } from '../../router';
import { plainText } from '../../utils/plainText';
import { useSwipeBack } from '../../utils/swipeBack';
import '../FolderPage/FolderPage.css';
import './RolesPage.css';

export const rolesPath = '/roles';
export const rolePath = (id: string) => `/roles/${id}`;

/** Новая роль: название и «вы для него». Роль создаётся с заметками, остальное включается на её экране */
function NewRoleSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const uid = useId();
  const [name, setName] = useState('');
  const [mirror, setMirror] = useState('');
  const clean = name.trim();
  const taken = clean !== '' && !isNameFree(clean);
  const create = () => {
    if (!clean || taken) return;
    const role = createRole({ name: clean, mirror });
    if (role) onCreated(role.id);
  };
  return (
    <Frame
      title="Новая роль"
      subtitle="Название увидите только вы, «вы для него» — он"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="sheet__button sheet__button--primary" disabled={!clean || taken} onClick={create}>
            Создать
          </button>
        </>
      }
    >
      <section className="sheet__card frame-card">
        <label className="frame-label" htmlFor={`${uid}-name`}>
          Кем он для вас
        </label>
        <input id={`${uid}-name`} className="frame-textarea" value={name} maxLength={ROLE_MAX} name="role-name" placeholder="Например, наставник" autoFocus {...plainText} onChange={(e) => setName(e.target.value)} />
        {taken && <span className="rp-error">Роль с таким названием уже есть</span>}
      </section>
      <section className="sheet__card frame-card">
        <label className="frame-label" htmlFor={`${uid}-mirror`}>
          Кем вы для него
        </label>
        <input id={`${uid}-mirror`} className="frame-textarea" value={mirror} maxLength={ROLE_MAX} name="role-mirror" placeholder="Пусто — то же слово" {...plainText} onChange={(e) => setMirror(e.target.value)} />
      </section>
    </Frame>
  );
}

/**
 * «Роли» (открывается из профиля): все роли списком, у каждой сколько людей сейчас работают в этой роли. Нажатие открывает экран роли:
 * название, приветствие, функции по умолчанию и папка. Роль человеку назначают в карточке контакта.
 */
export function RolesPage() {
  const roles = useRoles();
  const links = useAllLinks();
  const [creating, setCreating] = useState(false);
  useSwipeBack('.rp', !creating, () => goBack('/'));

  const people = (roleId: string) => Object.values(links).flat().filter((l) => l.roleId === roleId && l.status === 'active').length;

  return (
    <section className="fp rp">
      <header className="fp__header">
        <button type="button" className="fp__back" aria-label="Назад" onClick={() => goBack('/')}>
          <IconBack />
        </button>
        <div className="fp__who">
          <h1 className="fp__title">Роли</h1>
          <p className="fp__subtitle">Что можно делать с человеком</p>
        </div>
      </header>
      <div className="fp__scroll">
        <p className="rp__lead">
          Роль задаёт, что вы делаете с человеком в диалоге: присылаете тесты и задания, ведёте заметки, храните сведения. Тесты и задания собеседник включает, согласившись на приглашение.
        </p>
        <section className="fp__card" aria-label="Роли">
          <ul className="rp__list">
            {roles.map((role) => {
              const n = people(role.id);
              return (
                <li key={role.id}>
                  <button type="button" className="rp-row" onClick={() => navigate(rolePath(role.id))}>
                    <span className="rp-row__text">
                      <span className="rp-row__title">{role.name}</span>
                      <span className="rp-row__note">
                        {n > 0 ? `${n} ${plural(n, ['человек', 'человека', 'человек'])}` : 'Пока никого'} · вы — {inSentence(role.mirror)}
                      </span>
                    </span>
                    <IconChevronMk className="rp-row__chevron" />
                  </button>
                </li>
              );
            })}
          </ul>
          <button type="button" className="fp__add" onClick={() => setCreating(true)}>
            <span className="fp__add-icon" aria-hidden="true">
              <IconPlusLine />
            </span>
            Новая роль
          </button>
        </section>
      </div>
      <div className="fp__footer">
        <button type="button" className="fp__done" onClick={() => goBack('/')}>
          Готово
        </button>
      </div>
      {creating && (
        <NewRoleSheet
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            navigate(rolePath(id));
          }}
        />
      )}
    </section>
  );
}
