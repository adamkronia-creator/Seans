/* Необязательные «крючки» для общей полосы прокрутки: подпись при перетаскивании и действие по нажатию на точку */
export interface ScrollHooks {
  /** Подпись рядом с точкой, пока её тянут */
  label?: () => string;
  /** Короткое нажатие на точку */
  tap?: () => void;
}

export const scrollHooks = new WeakMap<HTMLElement, ScrollHooks>();
