/**
 * Datei: public/leitstand/i18n/de.js
 *
 * Zweck: Deutsches Wörterbuch des Leitstands (F44 WS-1a, E-F44-2 = B). Quelle und
 * Rückfall aller anderen Sprachen (public/leitstand/i18n.js).
 *
 * Wird aufgerufen von:
 * - public/leitstand/i18n.js
 * - scripts/check-f44-i18n.mjs
 *
 * Wichtig: Flaches Objekt, Schlüssel `bereich.element[.variante]`. Neue Schlüssel
 * gleichzeitig in en/tr/ru anlegen — das i18n-Gate prüft gleiche Schlüsselmengen,
 * gleiche Platzhalter, vollständige Pluralformen und keine leeren Werte. Kein `#`
 * vor Ziffern oder 3–8 Hex-Zeichen (Token-Gate). Nur Oberflächentexte; Server-
 * antworten und Projektinhalte werden nie übersetzt.
 */

export default {
  // F44 WS-1b: Shell (Sidebar, Kopf, Persona-Status, Startfläche, Baustein „kommt“, Platzhalterseiten).
  'nav.haupt': 'Hauptnavigation',
  'nav.weitere': 'Weitere Bereiche',
  'nav.produktuebersicht': 'Produktübersicht',
  'nav.roadmap': 'Roadmap',
  'nav.entwicklung': 'Entwicklung',
  'nav.ausfuehrungen': 'Ausführungen',
  'nav.auftragStart': 'Auftrag & Start',
  'nav.entscheidungen': 'Entscheidungen',
  'nav.produktzyklus': 'Produktzyklus',
  'nav.brain': 'Brain',
  'nav.alleProdukte': 'Alle Produkte',
  'nav.nutzung': 'Nutzung',
  'nav.einstellungen': 'Einstellungen',
  'nav.profil.unterzeile': 'Dein persönliches Atelier',
  'nav.workforce': 'Workforce',
  'nav.zuletzt': 'Zuletzt geöffnet',

  'kopf.menue': 'Navigation öffnen',
  'kopf.menueSchliessen': 'Navigation schließen',
  'kopf.projekt': 'Projekt',
  'kopf.projektAuswahl': 'Aktives Projekt',
  'kopf.projekteFehler': 'Die Projektliste konnte nicht geladen werden.',
  'kopf.neuesProjekt': 'Neues Projekt anlegen',
  'kopf.personaOeffnen': 'Startfläche öffnen',
  'kopf.sprache': 'Sprache',
  'kopf.themeTitel': 'Hell / Dunkel',
  'kopf.themeHell': 'Helles Design aktivieren',
  'kopf.themeDunkel': 'Dunkles Design aktivieren',
  'kopf.fragJarvis': 'Frag Jarvis',
  'kopf.pollFehler': 'Aktualisierung fehlgeschlagen — die Anzeige zeigt möglicherweise einen veralteten Stand.',

  'persona.status.idle': 'Bereit für deine Idee',
  'persona.status.thinking': 'Arbeitet für dich',
  'persona.status.waiting_for_human': 'Wartet auf dich',
  'persona.status.error': 'Meldet ein Problem',

  'start.signatur': 'JARVIS',
  'start.wortmarke': 'AI WORKFORCE',
  'start.betreten': 'Enter the Rabbit hole',
  'start.gesicht': 'Jarvis – Augen und Grinsen wachen auf',
  'start.warte.laedt': 'Lädt…',
  'start.warte.aufmerksamkeit': { one: '{anzahl} Punkt braucht Aufmerksamkeit', other: '{anzahl} Punkte brauchen Aufmerksamkeit' },
  'start.warte.fehlgeschlagen': 'Aktualisierung fehlgeschlagen',
  'start.warte.entscheidungen': { one: '{anzahl} Entscheidung wartet', other: '{anzahl} Entscheidungen warten' },
  'start.warte.lauf': 'Ein Lauf ist gerade aktiv',
  'start.warte.nichts': 'Nichts wartet gerade',

  'kommt.badge': 'kommt',

  'platzhalter.brain.eyebrow': 'Brain',
  'platzhalter.brain.beschreibung': 'Wissen, Code und Entscheidungen im Zusammenhang.',
  'platzhalter.brain.aktion': 'Wissen hinzufügen',
  'platzhalter.brain.leer.titel': 'Noch kein Wissensgraph',
  'platzhalter.brain.leer.text': 'Hier entsteht der Zusammenhang aus Wissen, Code und Entscheidungen dieses Produkts. Die Datenquelle dafür gibt es noch nicht.',
  'platzhalter.produktzyklus.eyebrow': 'Produktmanagement',
  'platzhalter.produktzyklus.beschreibung': 'Ideate · Plan · Deliver',
  'platzhalter.produktzyklus.aktion': 'Notiz hinzufügen',
  'platzhalter.produktzyklus.leer.titel': 'Produktbriefing',
  'platzhalter.produktzyklus.leer.text': 'Noch keine Erkenntnisse oder Entscheidungen erfasst.',
  'platzhalter.roadmap.eyebrow': 'Der Weg zum Produkt',
  'platzhalter.roadmap.titel': 'Roadmap',
  'platzhalter.roadmap.text': 'Bis zum Umbau steht die Roadmap als Karte in der Entwicklung.',
  'platzhalter.roadmap.link': 'Zur Roadmap-Karte',
  'platzhalter.nutzung.eyebrow': 'Verständlich eingeordnet',
  'platzhalter.nutzung.titel': 'Nutzung',
  'platzhalter.nutzung.text': 'Bis zum Umbau steht der Verbrauch als Karte in der Produktübersicht.',
  'platzhalter.nutzung.link': 'Zum Verbrauch',

  'einstellungen.eyebrow': 'Dein Atelier',
  'einstellungen.titel': 'Einstellungen',
  'einstellungen.beschreibung': 'Eine ruhige Oberfläche, die zu deiner Arbeitsweise passt.',

  'einstellungen.darstellung.titel': 'Darstellung & Bewegung',
  'einstellungen.farbschema.gruppe': 'Farbschema',
  'einstellungen.farbschema.dunkel': 'Dunkel',
  'einstellungen.farbschema.hell': 'Hell',
  'einstellungen.farbschema.hinweis': 'Deine Auswahl wird in diesem Browser gespeichert.',
  'einstellungen.bewegung.titel': 'Sanfte Bewegung aktivieren',
  'einstellungen.bewegung.beschreibung': 'Jarvis wacht auf und reagiert dezent auf den Zeiger. Die Systemeinstellung für reduzierte Bewegung hat Vorrang.',
  'einstellungen.bewegung.systemvorrang': 'Deine Systemeinstellung reduziert gerade die Bewegung.',

  'einstellungen.sprache.titel': 'Sprache',
  'einstellungen.sprache.feld': 'Sprache der Oberfläche',
  'einstellungen.sprache.hinweis': 'Nach dem Wechsel lädt die Seite neu. Projektinhalte, Serverantworten und deine Eingaben bleiben in ihrer Originalsprache. Noch nicht umgestellte Ansichten bleiben vorerst deutsch.',
  'einstellungen.sprache.fehler': 'Die Sprache konnte in diesem Browser nicht gespeichert werden (Speicher gesperrt, z. B. privates Fenster).',

  'einstellungen.gestaltung.titel': 'Silberstich & Himmelsmechanik',
  'einstellungen.gestaltung.text': 'Mattes Schieferblau. Warme Elfenbeintöne. Jade als leiser Akzent. Großzügige Abstände und typografische Hierarchie.',
  'einstellungen.gestaltung.prinzip': 'Gestaltungsprinzip',
  'einstellungen.gestaltung.prinzip.zeile1': 'Das Wesentliche zuerst.',
  'einstellungen.gestaltung.prinzip.zeile2': 'Details bei Interesse.',
  'einstellungen.gestaltung.prinzip.zeile3': 'Jede Entscheidung bewusst.',

  // Sprachnamen stehen in allen Wörterbüchern in der jeweils eigenen Sprache (Endonym).
  'sprache.de': 'Deutsch',
  'sprache.en': 'English',
  'sprache.tr': 'Türkçe',
  'sprache.ru': 'Русский',
}
