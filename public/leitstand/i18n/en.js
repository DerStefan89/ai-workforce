/**
 * Datei: public/leitstand/i18n/en.js
 *
 * Zweck: Englisches Wörterbuch des Leitstands (F44 WS-1a, E-F44-2 = B).
 *
 * Wird aufgerufen von:
 * - public/leitstand/i18n.js
 * - scripts/check-f44-i18n.mjs
 *
 * Wichtig: Maschinell übersetzt, nicht muttersprachlich geprüft (F-866).
 * Schlüsselmenge und Platzhalter wie public/leitstand/i18n/de.js (i18n-Gate).
 */

export default {
  // F44 WS-1b: Shell (Sidebar, Kopf, Persona-Status, Startfläche, Baustein „kommt“, Platzhalterseiten).
  'nav.haupt': 'Main navigation',
  'nav.weitere': 'More areas',
  'nav.produktuebersicht': 'Product overview',
  'nav.roadmap': 'Roadmap',
  'nav.entwicklung': 'Development',
  'nav.ausfuehrungen': 'Executions',
  'nav.auftragStart': 'Task & start',
  'nav.entscheidungen': 'Decisions',
  'nav.produktzyklus': 'Product cycle',
  'nav.brain': 'Brain',
  'nav.alleProdukte': 'All products',
  'nav.nutzung': 'Usage',
  'nav.einstellungen': 'Settings',
  'nav.profil.unterzeile': 'Your personal atelier',
  'nav.workforce': 'Workforce',
  'nav.zuletzt': 'Recently opened',

  'kopf.menue': 'Open navigation',
  'kopf.menueSchliessen': 'Close navigation',
  'kopf.projekt': 'Project',
  'kopf.projektAuswahl': 'Active project',
  'kopf.projekteFehler': 'The project list could not be loaded.',
  'kopf.neuesProjekt': 'Create new project',
  'kopf.personaOeffnen': 'Open start screen',
  'kopf.sprache': 'Language',
  'kopf.themeTitel': 'Light / Dark',
  'kopf.themeHell': 'Switch to light design',
  'kopf.themeDunkel': 'Switch to dark design',
  'kopf.fragJarvis': 'Ask Jarvis',
  'kopf.pollFehler': 'Update failed — the display may show an outdated state.',

  'persona.status.idle': 'Ready for your idea',
  'persona.status.thinking': 'Working for you',
  'persona.status.waiting_for_human': 'Waiting for you',
  'persona.status.error': 'Reporting a problem',

  'start.signatur': 'JARVIS',
  'start.wortmarke': 'AI WORKFORCE',
  'start.betreten': 'Enter the Rabbit hole',
  'start.gesicht': 'Jarvis – eyes and grin wake up',
  'start.warte.laedt': 'Loading…',
  'start.warte.aufmerksamkeit': { one: '{anzahl} item needs attention', other: '{anzahl} items need attention' },
  'start.warte.fehlgeschlagen': 'Update failed',
  'start.warte.entscheidungen': { one: '{anzahl} decision is waiting', other: '{anzahl} decisions are waiting' },
  'start.warte.lauf': 'A run is currently active',
  'start.warte.nichts': 'Nothing is waiting right now',

  'kommt.badge': 'coming',

  'platzhalter.brain.eyebrow': 'Brain',
  'platzhalter.brain.beschreibung': 'Knowledge, code and decisions in context.',
  'platzhalter.brain.aktion': 'Add knowledge',
  'platzhalter.brain.leer.titel': 'No knowledge graph yet',
  'platzhalter.brain.leer.text': 'This is where the connections between knowledge, code and decisions of this product will appear. The data source does not exist yet.',
  'platzhalter.produktzyklus.eyebrow': 'Product management',
  'platzhalter.produktzyklus.beschreibung': 'Ideate · Plan · Deliver',
  'platzhalter.produktzyklus.aktion': 'Add note',
  'platzhalter.produktzyklus.leer.titel': 'Product brief',
  'platzhalter.produktzyklus.leer.text': 'No insights or decisions recorded yet.',
  'platzhalter.roadmap.eyebrow': 'The path to the product',
  'platzhalter.roadmap.titel': 'Roadmap',
  'platzhalter.roadmap.text': 'Until the redesign, the roadmap is a card in Development.',
  'platzhalter.roadmap.link': 'Go to the roadmap card',
  'platzhalter.nutzung.eyebrow': 'Clearly explained',
  'platzhalter.nutzung.titel': 'Usage',
  'platzhalter.nutzung.text': 'Until the redesign, usage is a card in the product overview.',
  'platzhalter.nutzung.link': 'Go to usage',

  'einstellungen.eyebrow': 'Your atelier',
  'einstellungen.titel': 'Settings',
  'einstellungen.beschreibung': 'A calm interface that fits the way you work.',

  'einstellungen.darstellung.titel': 'Appearance & motion',
  'einstellungen.farbschema.gruppe': 'Color scheme',
  'einstellungen.farbschema.dunkel': 'Dark',
  'einstellungen.farbschema.hell': 'Light',
  'einstellungen.farbschema.hinweis': 'Your choice is saved in this browser.',
  'einstellungen.bewegung.titel': 'Enable gentle motion',
  'einstellungen.bewegung.beschreibung': 'Jarvis wakes up and reacts subtly to the pointer. Your system setting for reduced motion takes precedence.',
  'einstellungen.bewegung.systemvorrang': 'Your system setting is currently reducing motion.',

  'einstellungen.sprache.titel': 'Language',
  'einstellungen.sprache.feld': 'Interface language',
  'einstellungen.sprache.hinweis': 'The page reloads after switching. Project content, server responses and your input stay in their original language. Views that have not been converted yet remain in German for now.',
  'einstellungen.sprache.fehler': 'The language could not be saved in this browser (storage blocked, e.g. a private window).',

  'einstellungen.gestaltung.titel': 'Silverpoint & celestial mechanics',
  'einstellungen.gestaltung.text': 'Matte slate blue. Warm ivory tones. Jade as a quiet accent. Generous spacing and typographic hierarchy.',
  'einstellungen.gestaltung.prinzip': 'Design principle',
  'einstellungen.gestaltung.prinzip.zeile1': 'The essentials first.',
  'einstellungen.gestaltung.prinzip.zeile2': 'Details on demand.',
  'einstellungen.gestaltung.prinzip.zeile3': 'Every decision deliberate.',

  'sprache.de': 'Deutsch',
  'sprache.en': 'English',
  'sprache.tr': 'Türkçe',
  'sprache.ru': 'Русский',
}
