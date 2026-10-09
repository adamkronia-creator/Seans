import { createContext, useContext } from 'react';

/*
 * Экраны приложения лежат слоями (App.tsx). Компонент внутри экрана узнаёт отсюда, верхний ли это слой
 * и какой у него корневой элемент: оглавление теста, например, должно ездить вместе со своим экраном, а не торчать в каркасе.
 */

export interface LayerInfo {
  /** Слой лежит сверху (true) или под другим, выглядывая при жесте «назад» (false) */
  top: boolean;
  /** Корневой элемент слоя. null — слой ещё не нарисован; undefined — компонент вне слоёв */
  element: HTMLElement | null | undefined;
}

export const LayerContext = createContext<LayerInfo>({ top: true, element: undefined });

export const useLayer = () => useContext(LayerContext);
