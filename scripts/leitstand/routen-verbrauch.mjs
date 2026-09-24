/**
 * Datei: scripts/leitstand/routen-verbrauch.mjs
 *
 * Zweck: Projektion für GET /api/verbrauch (F32 WS-1, §12 Kontingent-
 * Nachbarschaft). Liest alle Laufakten eines Projekts über die Lineage
 * (Verzeichnispräfix 'lineage-laufakte-', Muster sammleLaeufe/sammleAuftraege
 * in scripts/leitstand-server.mjs — es gibt keine Lineage-Registry-Funktion,
 * die alle Artefakt-IDs einer Art listet), gruppiert nach rolle, worker,
 * modell_beobachtet ?? modell_deklariert und auftrag_id, und summiert je
 * Gruppe das additive, optionale LaufakteV0Daten.verbrauch-Feld (F32 WS-1,
 * schemas/kontrollzustand-laufakte-payload.schema.json). Ein Lauf ohne
 * verbrauch (kein "type":"result"-Objekt bzw. kein turn.completed mit
 * usage) zählt mit, aber ausschließlich unter ohneBeobachtung — er geht in
 * keine Summe ein (nie geschätzt).
 *
 * leitstand-server.mjs registriert GET /api/verbrauch ausschließlich gegen
 * baueVerbrauchsProjektion — keine zweite Kopie dieser Logik dort (D5).
 * Die Auftragsbezug-Auflösung (Kontextpaket-Element 'artefakt:auftrag-
 * <auftragId>') dupliziert bewusst schmal dieselbe Konvention wie
 * baueAuftragsbezug in leitstand-server.mjs: jene Funktion ist dort nicht
 * exportiert, und dieses Modul soll laut Auftrag keine weitere Logik in
 * leitstand-server.mjs auslösen — die Duplikation ist auf die Pfad-
 * Konvention selbst begrenzt, kein zweiter Regelsatz für Läufe/Laufakten.
 *
 * Keine Kosten in Euro/USD (Nicht-Ziel, Entscheidung 30 — Abo-Modell, keine
 * Scheingenauigkeit).
 *
 * baueVerbrauchsProjektion wirft NIE (F-603-Fix, Muster baueRoadmapProjektion,
 * scripts/leitstand/routen-roadmap.mjs) — ein Fehlerfall ist ein Fachergebnis
 * im Rückgabewert (`{ status: 'fehler', grund }`), kein 500.
 *
 * F-518-Fix: `von`/`bis` (falls gesetzt) müssen ein gültiges Datum sein —
 * entweder ein Tagesdatum YYYY-MM-DD (reicht aus, da von/bis nur Tagesgrenzen
 * filtern) oder ein voller ISO-8601-Zeitstempel wie `erstellt_am`
 * (public/leitstand/verbrauch-zeitraum.js, der einzige heutige Aufrufer,
 * übergibt exakt dieses Format — UI-Änderung ist laut Auftrag F-518 nicht im
 * Scope, der Server muss also beide Formen akzeptieren). Ein Formatmuster
 * allein genügt nicht: das bezeichnete Kalenderdatum muss real existieren —
 * `Date.parse('2026-02-30T00:00:00Z')` rollt beim vollen Zeitstempel
 * stillschweigend auf März um, statt NaN zu liefern; `istGueltigesDatum`
 * vergleicht deshalb bei BEIDEN Formen den Tagesanteil vor und nach dem
 * Runden über `Date` (Rückvergleich) statt sich auf `Date.parse` allein zu
 * verlassen (Korrektur nach Review, F-518 Befund 2). `von` darf zeitlich
 * nicht nach `bis` liegen — verglichen wird als Zeitwert (`Date.parse`),
 * NICHT als Zeichenkette: zwei gültige, unterschiedlich lange ISO-Formen
 * (z. B. `...T00:00:00Z` vs. `...T00:00:00.001Z`) sind lexikographisch NICHT
 * ordnungsgleich zu ihrer Zeitordnung, ein String-Vergleich lieferte hier
 * real ein falsches "vertauscht" (Korrektur nach Review, F-518 Befund 3).
 * Jeder Verstoß liefert wie im ursprünglichen Auftrag `{ status: 'fehler',
 * grund }` (Korrektur nach Review, F-518 Befund 1 — nicht das eigene Status-
 * Literal `zeitraum_ungueltig` der Voriteration) — zur Unterscheidung vom
 * generischen IO-`{ status: 'fehler', grund }` (F-603-Fix) trägt NUR der
 * Zeitraum-Fehlerfall zusätzlich `code: 'zeitraum_ungueltig'`. leitstand-
 * server.mjs bildet ausschließlich `status === 'fehler' && code ===
 * 'zeitraum_ungueltig'` schmal auf HTTP 400 ab — ein IO-Fehler ohne `code`
 * bleibt weiterhin HTTP 200 (F-603-Fix unverändert).
 */

import { existsSync, readdirSync } from 'node:fs'
import { ladeArtefaktVersion } from '../../src/lineage-registry/index.ts'

const LAUFAKTE_VERZEICHNIS_PRAEFIX = 'lineage-laufakte-'
const ARTEFAKT_AUFTRAG_PRAEFIX = 'artefakt:auftrag-'

function STILLER_SCHREIBER() {}

/** Alle laufIds mit einer registrierten Laufakte unter basisVerzeichnis — reiner Verzeichnis-Scan (Muster sammleAuftraege), kein Lineage-Registry-Listing über alle Artefakt-Arten. @param basisVerzeichnis - Kontrollzustand-Wurzel @returns laufIds, unsortiert */
function listeLaufIdsMitLaufakte(basisVerzeichnis) {
  if (!existsSync(basisVerzeichnis)) return []
  return readdirSync(basisVerzeichnis, { withFileTypes: true })
    .filter((eintrag) => eintrag.isDirectory() && eintrag.name.startsWith(LAUFAKTE_VERZEICHNIS_PRAEFIX))
    .map((eintrag) => eintrag.name.slice(LAUFAKTE_VERZEICHNIS_PRAEFIX.length))
}

/** Lädt das Kontextpaket eines Laufs einmal (statt je einmal für Rolle und Auftragsbezug — beide werden vom selben, bereits geladenen Artefakt abgeleitet). @param laufId - Lauf-Kennung @param basisVerzeichnis - Kontrollzustand-Wurzel @returns ArtefaktVersion des Kontextpakets, oder null */
function ladeKontextpaket(laufId, basisVerzeichnis) {
  return ladeArtefaktVersion(`kontextpaket-${laufId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
}

/** Rolle aus einem bereits geladenen Kontextpaket, oder null (Bestandslauf/kein Kontextpaket/leeres Feld). @param kontextpaket - Ergebnis von ladeKontextpaket @returns rolle, oder null */
function leseRolle(kontextpaket) {
  const rolle = kontextpaket?.daten?.rolle
  return typeof rolle === 'string' && rolle.length > 0 ? rolle : null
}

/** Auftragsbezug aus einem bereits geladenen Kontextpaket über dessen Element 'artefakt:auftrag-<auftragId>' (E-M2-4-Konvention) — Pfad-Erkennung dupliziert schmal, siehe Dateikopf. @param kontextpaket - Ergebnis von ladeKontextpaket @returns auftragId, oder null */
function leseAuftragId(kontextpaket) {
  const elemente = Array.isArray(kontextpaket?.daten?.elemente) ? kontextpaket.daten.elemente : []
  const element = elemente.find((e) => typeof e?.pfad === 'string' && e.pfad.startsWith(ARTEFAKT_AUFTRAG_PRAEFIX))
  return element === undefined ? null : element.pfad.slice(ARTEFAKT_AUFTRAG_PRAEFIX.length)
}

/** true, wenn erstellt_am (falls vorhanden) innerhalb [von, bis] liegt — ISO-8601-Strings sind lexikographisch ordnungsgleich zur Zeitordnung (Muster E-M2-5). Ein Lauf ohne erstellt_am wird NIE durch einen Zeitraumfilter ausgeschlossen ("Zeit unbekannt" ist kein Ausschlussgrund, Muster F12 AK3). @param erstelltAm - erstellt_am der Laufakte, oder undefined @param von - untere Grenze (inklusiv), oder undefined @param bis - obere Grenze (inklusiv), oder undefined @returns true, wenn der Lauf im Zeitraum liegt */
function imZeitraum(erstelltAm, von, bis) {
  if (typeof erstelltAm !== 'string') return true
  if (von !== undefined && erstelltAm < von) return false
  if (bis !== undefined && erstelltAm > bis) return false
  return true
}

const TAGESDATUM_MUSTER = /^\d{4}-\d{2}-\d{2}$/
const ZEITSTEMPEL_MUSTER = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/

/** Zeitwert (Millisekunden seit Epoch) eines bereits als gültig geprüften Datums — beide Formen (Tagesdatum, voller Zeitstempel) werden über Date.parse auf denselben Zeitwert abgebildet, damit die Reihenfolgeprüfung numerisch statt lexikographisch vergleicht (F-518 Befund 3: ISO-Formen unterschiedlicher Länge sind NICHT string-ordnungsgleich zu ihrer Zeitordnung). @param wert - bereits über istGueltigesDatum geprüftes Datum @returns Zeitwert in Millisekunden */
function zeitwertMillisekunden(wert) {
  return TAGESDATUM_MUSTER.test(wert) ? Date.parse(`${wert}T00:00:00.000Z`) : Date.parse(wert)
}

/** true, wenn wert ein Tagesdatum YYYY-MM-DD oder ein voller ISO-8601-Zeitstempel ist und ein tatsächlich existierendes Kalenderdatum bezeichnet (F-518). Date.parse allein genügt nicht: es rollt z. B. '2026-02-30T00:00:00Z' stillschweigend auf März um, statt NaN zu liefern (F-518 Befund 2) — deshalb bei BEIDEN Formen ein Rückvergleich des Tagesanteils gegen das gerundete Ergebnis. @param wert - zu prüfender Rohwert @returns true, wenn wert ein gültiges, real existierendes Datum ist */
function istGueltigesDatum(wert) {
  if (typeof wert !== 'string') return false
  if (!TAGESDATUM_MUSTER.test(wert) && !ZEITSTEMPEL_MUSTER.test(wert)) return false
  const zeitstempel = zeitwertMillisekunden(wert)
  if (Number.isNaN(zeitstempel)) return false
  return new Date(zeitstempel).toISOString().slice(0, 10) === wert.slice(0, 10)
}

/** Prüft den optionalen Zeitraumfilter { von, bis } (F-518): beide, falls gesetzt, müssen ein gültiges Datum sein (YYYY-MM-DD oder voller ISO-8601-Zeitstempel, siehe Dateikopf), und von darf nicht nach bis liegen. @param von - untere Grenze, oder undefined @param bis - obere Grenze, oder undefined @returns { ok: true } | { ok: false, grund } */
function pruefeZeitraum(von, bis) {
  if (von !== undefined && !istGueltigesDatum(von)) {
    return { ok: false, grund: `'von' ist kein gültiges Datum (YYYY-MM-DD oder ISO-8601-Zeitstempel): ${JSON.stringify(von)}` }
  }
  if (bis !== undefined && !istGueltigesDatum(bis)) {
    return { ok: false, grund: `'bis' ist kein gültiges Datum (YYYY-MM-DD oder ISO-8601-Zeitstempel): ${JSON.stringify(bis)}` }
  }
  if (von !== undefined && bis !== undefined && zeitwertMillisekunden(von) > zeitwertMillisekunden(bis)) {
    return { ok: false, grund: `'von' (${von}) liegt nach 'bis' (${bis})` }
  }
  return { ok: true }
}

const LEERE_SUMME = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, dauerMs: 0 }

/**
 * Baut die Verbrauchsprojektion für GET /api/verbrauch (F32 WS-1). Gruppiert
 * nach { rolle, worker, modell, auftragId } — je Gruppe Summen über
 * verbrauch (nur Läufe, die das Feld tragen) und die Gesamtzahl der Läufe
 * dieser Gruppe (mit und ohne Beobachtung).
 *
 * Wirft NIE (F-603-Fix, Muster baueRoadmapProjektion) — ein Wurf beim
 * Verzeichnis-Scan oder Artefakt-Laden (seltener IO-/Berechtigungsfehler auf
 * `kontrollzustand/`) ist ein Fachergebnis im Rückgabewert, kein Serverfehler
 * (kein 500): der Aufrufer (dashboard.js) zeigt dafür einen Fehlerhinweis nur
 * in der Verbrauchskarte, statt dass ein unbehandelter Wurf die gesamte
 * Dashboard-Ansicht einfrieren lässt. Der Fehler wird serverseitig geloggt
 * (nicht verschluckt).
 * @param basisVerzeichnis - Kontrollzustand-Wurzel des Projekts
 * @param zeitraum - optionaler Zeitraumfilter { von, bis } über erstellt_am (je YYYY-MM-DD oder ISO-8601-Zeitstempel, inklusiv)
 * @returns { status: 'ok', gruppen, laeufeGesamt, ohneBeobachtungGesamt } | { status: 'fehler', grund, code: 'zeitraum_ungueltig' } | { status: 'fehler', grund }
 */
export function baueVerbrauchsProjektion(basisVerzeichnis, zeitraum = {}) {
  const { von, bis } = zeitraum
  const zeitraumPruefung = pruefeZeitraum(von, bis)
  if (!zeitraumPruefung.ok) {
    return { status: 'fehler', grund: zeitraumPruefung.grund, code: 'zeitraum_ungueltig' }
  }

  try {
    const gruppenNachSchluessel = new Map()
    let laeufeGesamt = 0
    let ohneBeobachtungGesamt = 0

    for (const laufId of listeLaufIdsMitLaufakte(basisVerzeichnis)) {
      const laufakteVersion = ladeArtefaktVersion(`laufakte-${laufId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
      const daten = laufakteVersion?.daten
      if (daten === undefined || daten === null) continue
      if (!imZeitraum(daten.erstellt_am, von, bis)) continue

      laeufeGesamt++

      const kontextpaket = ladeKontextpaket(laufId, basisVerzeichnis)
      const rolle = leseRolle(kontextpaket)
      const worker = daten.worker ?? 'claude-code'
      const modell = daten.modell_beobachtet ?? daten.modell_deklariert ?? null
      const auftragId = leseAuftragId(kontextpaket)
      const schluessel = JSON.stringify([rolle, worker, modell, auftragId])

      let gruppe = gruppenNachSchluessel.get(schluessel)
      if (gruppe === undefined) {
        gruppe = { rolle, worker, modell, auftragId, anzahlLaeufe: 0, ohneBeobachtung: 0, verbrauch: { ...LEERE_SUMME } }
        gruppenNachSchluessel.set(schluessel, gruppe)
      }
      gruppe.anzahlLaeufe++

      const verbrauch = daten.verbrauch
      if (typeof verbrauch !== 'object' || verbrauch === null) {
        gruppe.ohneBeobachtung++
        ohneBeobachtungGesamt++
        continue
      }
      gruppe.verbrauch.inputTokens += verbrauch.input_tokens ?? 0
      gruppe.verbrauch.outputTokens += verbrauch.output_tokens ?? 0
      gruppe.verbrauch.cacheReadTokens += verbrauch.cache_read_tokens ?? 0
      gruppe.verbrauch.cacheWriteTokens += verbrauch.cache_write_tokens ?? 0
      gruppe.verbrauch.dauerMs += verbrauch.dauer_ms ?? 0
    }

    return { status: 'ok', gruppen: [...gruppenNachSchluessel.values()], laeufeGesamt, ohneBeobachtungGesamt }
  } catch (fehler) {
    console.error('[leitstand] baueVerbrauchsProjektion fehlgeschlagen:', fehler)
    return { status: 'fehler', grund: fehler.message }
  }
}
