import { useId, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { addToNamedAlbum, setAvatar, setCaption, setCover, useProfile } from '../../data/profile';
import { Frame } from '../Frame/Frame';
import { CropSheet } from '../CropSheet/CropSheet';
import { AutoTextarea } from '../EditSheet/AutoTextarea';
import { BackgroundControls } from '../BackgroundControls/BackgroundControls';
import { IconCamera, IconCheck } from './ProfileIcons';
import { filesOf, uploadPhotos } from './upload';
import '../AttachSheet/AttachSheet.css';
import './ProfileSheets.css';

/*
 * Нижние окна профиля. Подписи и поле текста — общие для нижних окон (.frame-card, .frame-label, .frame-textarea из Frame.css).
 */

interface PickProps {
  /** Что выбираем: круглое фото профиля или обложку */
  kind: 'avatar' | 'cover';
  onClose: () => void;
  /** Короткое сообщение внизу экрана (его показывает экран, а не окно: окно закрывается сразу) */
  onNote: (text: string) => void;
}

/** Выбор фото профиля или обложки: загрузить новое или взять из своих фото */
export function PhotoPickSheet({ kind, onClose, onNote }: PickProps) {
  const profile = useProfile();
  const input = useRef<HTMLInputElement>(null);
  const [cropping, setCropping] = useState<File | null>(null);
  const isAvatar = kind === 'avatar';
  const current = isAvatar ? profile.avatarId : profile.coverId;
  const apply = (id: string | null) => (isAvatar ? setAvatar(id) : setCover(id));
  const done = isAvatar ? 'Фото профиля обновлено' : 'Обложка обновлена';

  const choose = (id: string) => {
    apply(id);
    onNote(done);
    onClose();
  };

  const remove = () => {
    apply(null);
    onNote(isAvatar ? 'Фото профиля убрано' : 'Обложка убрана');
    onClose();
  };

  // Окно закрывается сразу, а снимок дорабатывается и встаёт на место, когда готов; фото профиля сначала кадрируется
  const save = async (files: File[]) => {
    onClose();
    const { added, ok } = await uploadPhotos(files.slice(0, 1), onNote);
    if (added[0]) {
      apply(added[0]);
      // Загруженное для аватарки или обложки складывается в свой альбом и потом доступно для выбора
      addToNamedAlbum(isAvatar ? 'Фото профиля' : 'Обложки', added.slice(0, 1));
    }
    if (ok && added[0]) onNote(done);
  };

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = filesOf(event);
    if (files.length === 0) return;
    if (isAvatar) setCropping(files[0]);
    else void save(files);
  };

  if (cropping) {
    return <CropSheet file={cropping} onCancel={() => setCropping(null)} onError={() => { setCropping(null); onNote('Не удалось открыть файл: выберите фото в формате JPG, PNG или WebP'); }} onDone={(file) => void save([file])} />;
  }

  return (
    <Frame
      title={isAvatar ? 'Фото профиля' : 'Обложка'}
      onClose={onClose}
      footer={
        <button type="button" className="sheet__button" onClick={onClose}>
          Закрыть
        </button>
      }
    >
      {/* Плитка картинок, как в окне «Прикрепить»: камера первая, фото по три в ряд вплотную */}
      <div className="at-card">
        <ul className="at-photos">
          <li>
            <button type="button" className="at-photo at-photo--camera" aria-label="Загрузить фото" onClick={() => input.current?.click()}>
              <IconCamera />
            </button>
          </li>
          {profile.photos.map((photo, i) => (
            <li key={photo.id}>
              <button
                type="button"
                className={`at-photo${photo.id === current ? ' at-photo--on' : ''}`}
                aria-label={`Фото ${i + 1}`}
                aria-pressed={photo.id === current}
                onClick={() => choose(photo.id)}
              >
                {profile.thumbs[photo.id] && <img src={profile.thumbs[photo.id]} alt="" />}
                {photo.id === current && (
                  <span className="pf-check">
                    <IconCheck />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {profile.photos.length === 0 && <p className="pf-note">Загруженное фото останется и в вашей галерее</p>}
      {current && (
        <button type="button" className="sheet__card pf-remove" onClick={remove}>
          {isAvatar ? 'Убрать фото профиля' : 'Убрать обложку'}
        </button>
      )}
      <input ref={input} type="file" accept="image/*" hidden onChange={upload} />
    </Frame>
  );
}

/** Фон приложения: картинка, размытие и цвет текста */
export function BackgroundSheet({ onClose }: { onClose: () => void }) {
  return (
    <Frame
      title="Фон приложения"
      onClose={onClose}
      footer={
        <button type="button" className="sheet__button" onClick={onClose}>
          Закрыть
        </button>
      }
    >
      <BackgroundControls />
    </Frame>
  );
}

/** Подпись к фото */
export function CaptionSheet({ photoId, onClose }: { photoId: string; onClose: () => void }) {
  const profile = useProfile();
  const [text, setText] = useState(() => profile.photos.find((p) => p.id === photoId)?.caption ?? '');
  const uid = useId();
  const save = () => {
    setCaption(photoId, text.trim());
    onClose();
  };
  return (
    <Frame
      title="Редактировать описание"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="sheet__button sheet__button--primary" onClick={save}>
            Сохранить
          </button>
        </>
      }
    >
      <section className="sheet__card frame-card">
        <label className="frame-label" htmlFor={`${uid}-caption`}>
          Описание фотографии
        </label>
        <AutoTextarea
          id={`${uid}-caption`}
          className="frame-textarea"
          rows={2}
          value={text}
          onChange={setText}
          placeholder="Добавьте описание"
          maxLength={300}
        />
      </section>
    </Frame>
  );
}

interface ConfirmProps {
  title: string;
  text: ReactNode;
  confirm: string;
  onConfirm: () => void;
  onClose: () => void;
}

/** Вопрос перед удалением: отмена и красная кнопка */
export function RemoveSheet({ title, text, confirm, onConfirm, onClose }: ConfirmProps) {
  return (
    <Frame
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onClose}>
            Отмена
          </button>
          <button type="button" className="sheet__button sheet__button--danger" onClick={onConfirm}>
            {confirm}
          </button>
        </>
      }
    >
      <p className="pf-confirm">{text}</p>
    </Frame>
  );
}
