/** CSS-цвет в sRGB, включая токены и смеси из палитры. */
export function colorPixels(color: string, scope: Element = document.documentElement): Uint8ClampedArray {
  const sample = document.createElement('span');
  sample.hidden = true;
  sample.style.color = color;
  scope.append(sample);
  const resolved = getComputedStyle(sample).color;
  sample.remove();

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = resolved;
  ctx.fillRect(0, 0, 1, 1);
  return ctx.getImageData(0, 0, 1, 1).data;
}

const contrastInk = new Map<string, string>();

/** Выбирает белый или чёрный по максимальному контрасту с заливкой палитры. */
export function inkOn(color: string): string {
  const cached = contrastInk.get(color);
  if (cached) return cached;
  const [r, g, b] = colorPixels(color);
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
  const ink = luminance > Math.sqrt(0.05 * 1.05) - 0.05 ? 'var(--palette-black)' : 'var(--palette-white)';
  contrastInk.set(color, ink);
  return ink;
}
