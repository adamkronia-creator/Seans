/*
 * Во всех полях приложения отключено автозаполнение: Chrome на Android иначе показывает над клавиатурой пароли, карты и геолокацию.
 * Атрибуты ставятся каждому полю ввода, как только оно появится в документе (поля создаются и убираются на ходу), поэтому
 * новые экраны ничего не должны помнить. Поля с явными своими настройками (autocomplete уже задан) не трогаются.
 */
const FIELDS = 'input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]), textarea';

function mark(field: Element) {
  if (field.hasAttribute('data-autofill-off')) return;
  field.setAttribute('data-autofill-off', '');
  if (!field.hasAttribute('autocomplete')) field.setAttribute('autocomplete', 'off');
  if (!field.hasAttribute('name')) field.setAttribute('name', 'plain-text');
  field.setAttribute('data-form-type', 'other');
  field.setAttribute('data-lpignore', 'true');
  field.setAttribute('data-1p-ignore', 'true');
}

export function installNoAutofill() {
  const scan = (root: ParentNode) => root.querySelectorAll(FIELDS).forEach(mark);
  scan(document);
  new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches(FIELDS)) mark(node);
        scan(node);
      });
    }
  }).observe(document.body, { childList: true, subtree: true });
}
