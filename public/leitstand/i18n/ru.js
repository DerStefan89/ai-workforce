/**
 * Datei: public/leitstand/i18n/ru.js
 *
 * Zweck: Russisches Wörterbuch des Leitstands (F44 WS-1a, E-F44-2 = B).
 *
 * Wird aufgerufen von:
 * - public/leitstand/i18n.js
 * - scripts/check-f44-i18n.mjs
 *
 * Wichtig: Maschinell übersetzt, nicht muttersprachlich geprüft (F-866).
 * Schlüsselmenge und Platzhalter wie public/leitstand/i18n/de.js (i18n-Gate).
 * Pluralobjekte brauchen hier one/few/many/other (Intl.PluralRules('ru')).
 */

export default {
  // F44 WS-1b: Shell (Sidebar, Kopf, Persona-Status, Startfläche, Baustein „kommt“, Platzhalterseiten).
  'nav.haupt': 'Основная навигация',
  'nav.weitere': 'Другие разделы',
  'nav.produktuebersicht': 'Обзор продукта',
  'nav.roadmap': 'Дорожная карта',
  'nav.entwicklung': 'Разработка',
  'nav.ausfuehrungen': 'Запуски',
  'nav.auftragStart': 'Задание и запуск',
  'nav.entscheidungen': 'Решения',
  'nav.produktzyklus': 'Цикл продукта',
  'nav.brain': 'Brain',
  'nav.alleProdukte': 'Все продукты',
  'nav.nutzung': 'Использование',
  'nav.einstellungen': 'Настройки',
  'nav.profil.unterzeile': 'Твоё личное ателье',
  'nav.workforce': 'Workforce',
  'nav.zuletzt': 'Недавно открытые',

  'kopf.menue': 'Открыть навигацию',
  'kopf.menueSchliessen': 'Закрыть навигацию',
  'kopf.projekt': 'Проект',
  'kopf.projektAuswahl': 'Активный проект',
  'kopf.projekteFehler': 'Не удалось загрузить список проектов.',
  'kopf.neuesProjekt': 'Создать новый проект',
  'kopf.personaOeffnen': 'Открыть стартовый экран',
  'kopf.sprache': 'Язык',
  'kopf.themeTitel': 'Светлая / Тёмная',
  'kopf.themeHell': 'Включить светлое оформление',
  'kopf.themeDunkel': 'Включить тёмное оформление',
  'kopf.fragJarvis': 'Спросить Jarvis',
  'kopf.pollFehler': 'Обновление не удалось — на экране может быть устаревшее состояние.',

  'persona.status.idle': 'Готов к твоей идее',
  'persona.status.thinking': 'Работает для тебя',
  'persona.status.waiting_for_human': 'Ждёт тебя',
  'persona.status.error': 'Сообщает о проблеме',

  'start.signatur': 'JARVIS',
  'start.wortmarke': 'AI WORKFORCE',
  'start.betreten': 'Enter the Rabbit hole',
  'start.gesicht': 'Jarvis – глаза и улыбка просыпаются',
  'start.warte.laedt': 'Загрузка…',
  'start.warte.aufmerksamkeit': { one: '{anzahl} пункт требует внимания', few: '{anzahl} пункта требуют внимания', many: '{anzahl} пунктов требуют внимания', other: '{anzahl} пункта требуют внимания' },
  'start.warte.fehlgeschlagen': 'Обновление не удалось',
  'start.warte.entscheidungen': { one: '{anzahl} решение ждёт', few: '{anzahl} решения ждут', many: '{anzahl} решений ждут', other: '{anzahl} решения ждут' },
  'start.warte.lauf': 'Сейчас идёт запуск',
  'start.warte.nichts': 'Сейчас ничего не ждёт',

  'kommt.badge': 'скоро',

  'platzhalter.brain.eyebrow': 'Brain',
  'platzhalter.brain.beschreibung': 'Знания, код и решения во взаимосвязи.',
  'platzhalter.brain.aktion': 'Добавить знание',
  'platzhalter.brain.leer.titel': 'Графа знаний пока нет',
  'platzhalter.brain.leer.text': 'Здесь появится связь знаний, кода и решений этого продукта. Источника данных для этого пока нет.',
  'platzhalter.produktzyklus.eyebrow': 'Управление продуктом',
  'platzhalter.produktzyklus.beschreibung': 'Ideate · Plan · Deliver',
  'platzhalter.produktzyklus.aktion': 'Добавить заметку',
  'platzhalter.produktzyklus.leer.titel': 'Бриф продукта',
  'platzhalter.produktzyklus.leer.text': 'Пока не записано ни выводов, ни решений.',
  'platzhalter.roadmap.eyebrow': 'Путь к продукту',
  'platzhalter.roadmap.titel': 'Дорожная карта',
  'platzhalter.roadmap.text': 'До переработки дорожная карта находится карточкой в разделе «Разработка».',
  'platzhalter.roadmap.link': 'К карточке дорожной карты',
  'platzhalter.nutzung.eyebrow': 'Понятно по полочкам',
  'platzhalter.nutzung.titel': 'Использование',
  'platzhalter.nutzung.text': 'До переработки расход находится карточкой в обзоре продукта.',
  'platzhalter.nutzung.link': 'К расходу',

  'einstellungen.eyebrow': 'Твоя мастерская',
  'einstellungen.titel': 'Настройки',
  'einstellungen.beschreibung': 'Спокойный интерфейс, который подходит к твоему стилю работы.',

  'einstellungen.darstellung.titel': 'Оформление и движение',
  'einstellungen.farbschema.gruppe': 'Цветовая схема',
  'einstellungen.farbschema.dunkel': 'Тёмная',
  'einstellungen.farbschema.hell': 'Светлая',
  'einstellungen.farbschema.hinweis': 'Твой выбор сохраняется в этом браузере.',
  'einstellungen.bewegung.titel': 'Включить плавное движение',
  'einstellungen.bewegung.beschreibung': 'Jarvis просыпается и деликатно реагирует на указатель. Системная настройка уменьшения движения имеет приоритет.',
  'einstellungen.bewegung.systemvorrang': 'Системная настройка сейчас уменьшает движение.',

  'einstellungen.sprache.titel': 'Язык',
  'einstellungen.sprache.feld': 'Язык интерфейса',
  'einstellungen.sprache.hinweis': 'После смены языка страница перезагрузится. Содержимое проектов, ответы сервера и твой ввод остаются на исходном языке. Ещё не переведённые разделы пока остаются на немецком.',
  'einstellungen.sprache.fehler': 'Не удалось сохранить язык в этом браузере (хранилище заблокировано, например в приватном окне).',

  'einstellungen.gestaltung.titel': 'Серебряная гравюра и небесная механика',
  'einstellungen.gestaltung.text': 'Матовый сланцево-синий. Тёплые оттенки слоновой кости. Нефрит как тихий акцент. Щедрые отступы и типографская иерархия.',
  'einstellungen.gestaltung.prinzip': 'Принцип оформления',
  'einstellungen.gestaltung.prinzip.zeile1': 'Сначала главное.',
  'einstellungen.gestaltung.prinzip.zeile2': 'Подробности — по желанию.',
  'einstellungen.gestaltung.prinzip.zeile3': 'Каждое решение — осознанно.',

  'sprache.de': 'Deutsch',
  'sprache.en': 'English',
  'sprache.tr': 'Türkçe',
  'sprache.ru': 'Русский',
}
