#!/usr/bin/env python3
"""
Скриншоты для подсказок к настройкам теста (src/assets/help/*.webp, данные — src/data/optionHelp.ts).

Снимает приложение в рамке телефона 393 px при плотности 2 и вырезает кадр 393×340 (786×680 пикселей):
  blind-off, blind-on, blind-chat — «Слепое тестирование»: предпросмотр без слепого режима и с ним, пометка в чате;
  blank-off, blank-on, blank-view — «Сохранить заполненный бланк»: результат без бланка и с ним, сам бланк;
  result-thanks, result-score, result-full — «Итог для клиента»: экран завершения у клиента при каждом из трёх вариантов.
Кроме картинок печатает рамки (x, y, w, h в процентах кадра): их нужно перенести в `mark` слайдов в optionHelp.ts.

Запуск (нужны Python-пакеты playwright и pillow, у playwright — Chromium):
  npm run build && npm run preview -- --port 4179 &
  python3 scripts/help-shots.py            # или: --base http://localhost:4179/ --out src/assets/help
Прохождение теста на 71 вопрос идёт дважды, весь запуск занимает около четырёх минут.
Если интерфейс этих экранов изменился, скриншоты снимаются заново и подставляются в те же файлы.
"""
import argparse
import json
import os

from PIL import Image
from playwright.sync_api import sync_playwright

W, H = 393, 340
TOP = '.screen[data-layer=top]'
SMOL = 'Сокращенный многофакторный опросник личности'


class Phone:
    """Одна чистая сессия приложения: состояние (отправленные тесты, прохождения) хранится только в памяти страницы."""

    def __init__(self, playwright, base):
        self.base = base
        self.browser = playwright.chromium.launch()
        context = self.browser.new_context(viewport={'width': W, 'height': 852}, device_scale_factor=2, has_touch=True, is_mobile=True)
        self.page = context.new_page()
        self.page.set_default_timeout(8000)
        self.errors = []
        self.page.on('pageerror', lambda e: self.errors.append(str(e)))

    def close(self):
        self.browser.close()
        if self.errors:
            raise SystemExit(f'Ошибки в приложении: {self.errors}')

    def wait(self, ms=500):
        self.page.wait_for_timeout(ms)

    def tab(self, label):
        self.page.locator(f'{TOP} .tabbar [aria-label="{label}"]').first.click()
        self.wait(700)

    def open_smol(self):
        self.page.goto(self.base)
        self.wait(1200)
        self.tab('Диагностика')
        self.page.locator(TOP).get_by_text(SMOL, exact=True).first.click()
        self.wait(1000)

    def send(self, recipient):
        page = self.page
        page.get_by_role('button', name='Пройти или отправить').click()
        self.wait()
        page.get_by_role('button', name='Отправить', exact=True).click()
        self.wait()
        page.get_by_role('radio', name=recipient).click()
        self.wait(200)
        page.get_by_role('button', name='Отправить', exact=True).last.click()
        self.wait(900)

    def back(self):
        self.page.get_by_role('button', name='Назад').first.click()
        self.wait(800)

    def open_chat(self, name):
        self.tab('Диалоги')
        self.page.locator(TOP).get_by_text(name, exact=True).first.click()
        self.wait(1500)

    def pass_test(self, questions=71):
        """Пройти тест из «Избранного» (отвечаем через один) и открыть результат из сообщения «Вы прошли…»"""
        page = self.page
        page.get_by_role('button', name='Пройти', exact=True).last.click()
        self.wait(1000)
        page.locator(f'{TOP} .test-settings__cta-button', has_text='Начать').click()
        self.wait()
        for q in range(questions):
            page.locator(f'{TOP} .blank-answer').nth(q % 2).click()
            self.wait(330)
        page.locator(f'{TOP} .test-settings__cta-button', has_text='Завершить тест').click()
        self.wait(1400)
        page.locator(f'{TOP} .test-settings__cta-button', has_text='Завершить').click()
        self.wait(1200)
        page.get_by_role('button', name='Посмотреть', exact=True).last.click()
        self.wait(1500)

    def rect(self, selector=None, box=None, pad=0):
        if box is None:
            box = self.page.locator(selector).last.bounding_box()
        return {'x': box['x'] - pad, 'y': box['y'] - pad, 'width': box['width'] + 2 * pad, 'height': box['height'] + 2 * pad}


class Shots:
    def __init__(self, out):
        self.out = out
        self.marks = {}
        os.makedirs(out, exist_ok=True)

    def take(self, phone, name, y0, mark=None):
        """Кадр от y0 высотой H; mark — рамка вокруг изменившегося места (в пикселях страницы)"""
        phone.wait(600)
        raw = os.path.join(self.out, f'{name}.png')
        phone.page.screenshot(path=raw, clip={'x': 0, 'y': y0, 'width': W, 'height': H})
        Image.open(raw).convert('RGB').save(os.path.join(self.out, f'{name}.webp'), 'WEBP', lossless=True, method=6)
        os.remove(raw)
        if mark:
            self.marks[name] = {
                'x': round(mark['x'] / W * 100, 2),
                'y': round((mark['y'] - y0) / H * 100, 2),
                'w': round(mark['width'] / W * 100, 2),
                'h': round(mark['height'] / H * 100, 2),
            }


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--base', default='http://localhost:4179/', help='адрес запущенного приложения (npm run preview)')
    parser.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'help'))
    parser.add_argument('--only', choices=['blind', 'blank', 'result'], help='снять только одну подсказку (по умолчанию все)')
    args = parser.parse_args()
    want = lambda name: args.only in (None, name)
    shots = Shots(os.path.normpath(args.out))

    with sync_playwright() as p:
        if want('blind'):
            # Слепое тестирование: предпросмотр клиентского экрана без слепого режима и с ним (кадр под шапкой, с y = 56)
            for blind in (False, True):
                phone = Phone(p, args.base)
                phone.open_smol()
                if not blind:
                    phone.page.get_by_role('switch', name='Слепое тестирование').click()
                    phone.wait(300)
                phone.page.locator(TOP).get_by_text('Предпросмотр', exact=True).first.click()
                phone.wait(1000)
                title = phone.rect(f'{TOP} .tp__phone .test-settings__peer', pad=4)
                shots.take(phone, 'blind-on' if blind else 'blind-off', 56, title)
                phone.close()

            # Пометка «Слепой тест» в переписке с клиентом (без сообщения клиенту карточка короче)
            phone = Phone(p, args.base)
            phone.open_smol()
            phone.page.get_by_role('switch', name='Сообщение для клиента').click()
            phone.wait(300)
            phone.send('Максим Мартынов')
            phone.back()
            phone.open_chat('Максим Мартынов')
            note = phone.rect(f'{TOP} .tcard__note')
            note = {'x': note['x'] - 6, 'y': note['y'] - 4, 'width': note['width'] + 12, 'height': note['height'] + 8}
            shots.take(phone, 'blind-chat', 456, note)
            phone.close()

        if want('blank'):
            # Сохранить бланк: результат без бланка и с ним, затем сам бланк (прокручен к первым вопросам)
            for save in (False, True):
                phone = Phone(p, args.base)
                phone.open_smol()
                if not save:
                    phone.page.get_by_role('switch', name='Сохранить заполненный бланк').click()
                    phone.wait(300)
                phone.send('Себе')
                phone.back()
                phone.open_chat('Избранное')
                phone.pass_test()
                if not save:
                    shots.take(phone, 'blank-off', 56)
                else:
                    row = phone.rect(f'{TOP} .ts-row--link', pad=4)
                    shots.take(phone, 'blank-on', 56, row)
                    phone.page.locator(TOP).get_by_text('Посмотреть бланк тестирования', exact=True).first.click()
                    phone.wait(1200)
                    phone.page.evaluate("document.querySelector('.screen[data-layer=top] .test-settings__scroll').scrollTop = 304")
                    shots.take(phone, 'blank-view', 56)
                phone.close()

        if want('result'):
            # Итог для клиента: предпросмотр, этап «Конец» (кадр с карточки «Спасибо», с y = 270; рамок нет)
            for name, mode in (('result-thanks', 'Только благодарность'), ('result-score', 'Только баллы'), ('result-full', 'Полное заключение')):
                phone = Phone(p, args.base)
                phone.open_smol()
                row = phone.page.locator('.result-choice__row', has_text=mode)
                row.scroll_into_view_if_needed()
                row.click()
                phone.wait(300)
                preview = phone.page.locator(TOP).get_by_text('Предпросмотр', exact=True).first
                preview.scroll_into_view_if_needed()
                preview.click()
                phone.wait(900)
                phone.page.get_by_role('button', name='Конец').click()
                phone.wait(900)
                shots.take(phone, name, 270)
                phone.close()

    print('Рамки для optionHelp.ts (mark):')
    print(json.dumps(shots.marks, indent=2, ensure_ascii=False))


if __name__ == '__main__':
    main()
