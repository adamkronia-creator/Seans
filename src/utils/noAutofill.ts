/*
 * Во всех полях приложения отключено автозаполнение: Chrome на Android иначе показывает над клавиатурой пароли, карты и геолокацию.
 * Атрибуты ставятся каждому полю ввода, как только оно появится в документе (поля создаются и убираются на ходу), поэтому
 * новые экраны ничего не должны помнить. Поля с явными своими настройками (autocomplete уже задан) не трогаются.
 */
const FIELDS = 'input:not([type=hidden]):not([type=file]):not([type=checkbox]):not([type=radio]), textarea';

let seq = 0;

function mark(field: Element) {
  if (field.hasAttribute('data-autofill-off')) return;
  field.setAttribute('data-autofill-off', '');
  // «off» Chrome для адресов, имён и телефонов игнорирует; незнакомое значение он за подсказку для автозаполнения не считает.
  // Имя у каждого поля своё и ничего не значит, иначе по имени и подписи поле опознаётся как «имя», «телефон» и т. д.
  field.setAttribute('autocomplete', 'nope');
  field.setAttribute('name', `f-${(seq += 1)}-${Math.random().toString(36).slice(2, 7)}`);
  field.setAttribute('aria-autocomplete', 'none');
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
