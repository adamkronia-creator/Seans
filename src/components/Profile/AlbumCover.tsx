import { useProfile, type ProfileAlbum } from '../../data/profile';
import { IconAlbum } from './ProfileIcons';

/** Обложка альбома: первое фото в нём, а у пустого — значок альбома. Размер и скругление задаёт родитель */
export function AlbumCover({ album }: { album: ProfileAlbum }) {
  const { thumbs } = useProfile();
  const src = album.photoIds.map((id) => thumbs[id]).find(Boolean);
  return src ? <img src={src} alt="" loading="lazy" decoding="async" /> : <IconAlbum />;
}
