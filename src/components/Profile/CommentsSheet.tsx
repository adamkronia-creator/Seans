import { useId, useState } from 'react';
import { addComment, removeComment, useProfile } from '../../data/profile';
import { AutoTextarea } from '../EditSheet/AutoTextarea';
import { Frame } from '../Frame/Frame';
import { IconClose } from '../ChatParts/ChatIcons';

const timeOf = (at: number) => new Date(at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** Комментарии к фото: список своих заметок и поле нового. Видны только вам */
export function CommentsSheet({ photoId, onClose }: { photoId: string; onClose: () => void }) {
  const photo = useProfile().photos.find((p) => p.id === photoId);
  const [text, setText] = useState('');
  const uid = useId();
  const comments = photo?.comments ?? [];
  const send = () => {
    if (!text.trim()) return;
    addComment(photoId, text);
    setText('');
  };
  return (
    <Frame
      title="Комментарии"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="sheet__button" onClick={onClose}>
            Закрыть
          </button>
          <button type="button" className="sheet__button sheet__button--primary" disabled={!text.trim()} onClick={send}>
            Отправить
          </button>
        </>
      }
    >
      {comments.length > 0 ? (
        <section className="sheet__card pf-comments">
          <ul>
            {comments.map((c) => (
              <li key={c.id} className="pf-comment">
                <div className="pf-comment__body">
                  <p className="pf-comment__text">{c.text}</p>
                  <p className="pf-comment__time">{timeOf(c.at)}</p>
                </div>
                <button type="button" className="pf-comment__remove" aria-label="Удалить комментарий" onClick={() => removeComment(photoId, c.id)}>
                  <IconClose />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="pf-note">Комментариев пока нет. Заметки к фото видны только вам</p>
      )}
      <section className="sheet__card frame-card">
        <label className="frame-label" htmlFor={`${uid}-comment`}>
          Новый комментарий
        </label>
        <AutoTextarea id={`${uid}-comment`} className="frame-textarea" rows={1} value={text} onChange={setText} placeholder="Напишите комментарий" maxLength={500} />
      </section>
    </Frame>
  );
}
