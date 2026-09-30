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
  'navigation.einstellungen': 'Einstellungen',

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
  'einstellungen.hinweis': 'Hinweise öffnen sich nach kurzem Verweilen auf einem Fragezeichen. Mit Tastaturfokus und Antippen sind sie ebenfalls erreichbar.',

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
