/*
 * Фото из телефона весят 3–10 МБ и раскрываются в десятки мегабайт памяти. Перед сохранением снимок уменьшается:
 * «full» — до FULL_SIDE по длинной стороне (хватает и для просмотра, и для обложки на экране с плотностью 3),
 * «thumb» — до THUMB_SIDE (сетка и аватар). Поворот по данным камеры (EXIF) применяется, прозрачность заливается белым.
 */

const FULL_SIDE = 1600;
const FULL_QUALITY = 0.85;
const THUMB_SIDE = 480;
const THUMB_QUALITY = 0.8;

interface PreparedImage {
  thumb: Blob;
  full: Blob;
}

interface Decoded {
  source: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

/** Расшифровать файл в картинку: createImageBitmap понимает поворот камеры, обычный <img> — запасной путь */
async function decode(file: Blob): Promise<Decoded> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
    } catch {
      // Формат, который не понял createImageBitmap: пробуем через <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { source: image, width: image.naturalWidth, height: image.naturalHeight, close: () => undefined };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Не удалось сжать снимок'))), 'image/jpeg', quality);
  });
}

/** Нарисовать картинку на холсте, не больше maxSide по длинной стороне (меньше — не растягиваем) */
function draw(source: CanvasImageSource, width: number, height: number, maxSide: number): HTMLCanvasElement {
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Холст недоступен');
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** Уменьшить снимок: копия для сетки и снимок для просмотра. Бросает ошибку, если файл не картинка */
export async function prepareImage(file: Blob): Promise<PreparedImage> {
  const image = await decode(file);
  try {
    const fullCanvas = draw(image.source, image.width, image.height, FULL_SIDE);
    // Маленькая копия рисуется с уже уменьшенного снимка: резкое сжатие с оригинала дало бы «лесенку»
    const thumbCanvas = draw(fullCanvas, fullCanvas.width, fullCanvas.height, THUMB_SIDE);
    const [full, thumb] = await Promise.all([toBlob(fullCanvas, FULL_QUALITY), toBlob(thumbCanvas, THUMB_QUALITY)]);
    return { full, thumb };
  } finally {
    image.close();
  }
}
