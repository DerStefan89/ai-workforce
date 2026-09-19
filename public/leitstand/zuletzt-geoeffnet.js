/**
 * Datei: public/leitstand/zuletzt-geoeffnet.js
 *
 * Zweck: F29 WS-D2 (Auftrag Punkt B) — merkt die zuletzt geöffneten
 * Projekte/Workflows DIESER Sitzung für die Schnellzugriff-Box
 * (index.html #schnellzugriff-verlauf, shell.js). Rein client-seitig
 * (sessionStorage, Muster projekt-kontext.js) — kein neuer Server-Endpunkt,
 * kein neuer Schreibpfad gegen kontrollzustand/. Zeigt ausschließlich, was
 * diese Sitzung wirklich geöffnet hat (echte Daten, Auftrag: "sofern Daten
 * vorhanden") — bleibt leer, bis der erste echte Eintrag gemerkt wurde,
 * kein erfundener Platzhaltereintrag.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/projekte-uebersicht.js (merkeGeoeffnet bei "Öffnen")
 * - public/leitstand/views/workboard.js (merkeGeoeffnet bei "Workflow öffnen")
 * - public/leitstand/shell.js (holeVerlauf für die Schnellzugriff-Box)
 */

const SESSION_SCHLUESSEL = 'leitstand-zuletzt-geoeffnet'
const MAX_EINTRAEGE = 2

function leseVerlauf() {
  try {
    const roh = sessionStorage.getItem(SESSION_SCHLUESSEL)
    if (roh === null) return []
    const geparst = JSON.parse(roh)
    return Array.isArray(geparst) ? geparst : []
  } catch {
    return []
  }
}

function schreibeVerlauf(liste) {
  try {
    sessionStorage.setItem(SESSION_SCHLUESSEL, JSON.stringify(liste))
  } catch {
    // Privates Fenster/blockierter Zugriff — die Liste gilt dann nur für die laufende Ansicht, kein Absturz (Muster projekt-kontext.js).
  }
}

/**
 * Merkt einen geöffneten Eintrag ganz vorn — ein bereits vorhandener Eintrag (typ+id) wird an den
 * Anfang verschoben statt dupliziert, die Liste bleibt auf MAX_EINTRAEGE begrenzt.
 * @param eintrag - { typ: 'projekt' | 'workflow', id, label, hash, statusKategorie: 'ok' | 'aktiv' | 'neutral' } — hash ist das Navigationsziel (navigiere()), statusKategorie dieselbe Dreiteilung wie .status-punkt/.badge anderswo im Leitstand (kein neues Farbvokabular)
 */
export function merkeGeoeffnet(eintrag) {
  const bisherige = leseVerlauf().filter((e) => !(e.typ === eintrag.typ && e.id === eintrag.id))
  schreibeVerlauf([eintrag, ...bisherige].slice(0, MAX_EINTRAEGE))
}

/** @returns die zuletzt geöffneten Einträge dieser Sitzung (höchstens MAX_EINTRAEGE), neuester zuerst — leeres Array, solange nichts gemerkt wurde */
export function holeVerlauf() {
  return leseVerlauf()
}
