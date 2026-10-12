/**
 * Datei: scripts/leitstand/routen-faehigkeiten.mjs
 *
 * Zweck: Bausteine der Fähigkeiten-Routen je Projekt (F45 F-1, F-1012 Serverteil; Arbeitsregel M5: der Server
 * registriert nur, die Logik steht hier bzw. in src/faehigkeiten):
 * - GET /api/faehigkeiten — Status je Eintrag: installiert · aktiv · benutzt im letzten Lauf (Katalog-MCPs und
 *   Ort-B-Skills, Projekt-Agents/-Skills des Projektordners mit Hash und Freigabestand) — baueFaehigkeitenStatus;
 * - POST /api/faehigkeiten/aktivierung { eintrag, aktiv } — Projekt-Eintrag in an (Opt-in, E-F45-6), Katalog-id
 *   (MCP/Ort-B-Skill) aus aus; wirkt ab dem nächsten Lauf — pruefeAktivierungKoerper + aendereLokaleDatei;
 * - POST /api/faehigkeiten/freigabe { eintrag, hash } — Freigabe nach Inhalt; abgelehnt (409), wenn der Hash im
 *   Projektordner nicht mehr dem angezeigten entspricht (Muster eintragHash) — pruefeFreigabeKoerper + aendereLokaleDatei.
 * Von außen: /api/projekte/<id>/faehigkeiten…; die projekt_id kommt nur aus der Instanz, nie aus dem Körper.
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (Registrierung der drei Routen)
 * - scripts/leitstand/routen-faehigkeiten.test.mjs (node:test), scripts/check-f45-f1-faehigkeiten.mjs
 *
 * Wichtig:
 * - Geschrieben wird nur ~/.ai-workforce/faehigkeiten.lokal.json (E-F45-8), nie ressourcen.json, projekte.json oder
 *   .claude/settings.json (E-F46-2). Über eine ungültige Datei wird nie geschrieben (409, E-F45-7).
 * - Die Laufsperre (409 während eines Laufs, E-F45-8) und CSRF/Host (zentral) prüft der Server vor diesen Bausteinen.
 */

import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { aendereAktivierung, ladeFaehigkeitenLokal, projektEinstellungen, SHA256_MUSTER, schreibeFaehigkeitenLokal, setzeInhaltsfreigabe, zerlegeSchluessel } from '../../src/faehigkeiten/index.ts'
import { ID_MUSTER } from '../../src/projekte/index.ts'

/**
 * Stand eines Eintrags im letzten Ausführungslauf (QA 5: eindeutig statt eines mehrdeutigen true/false/null):
 * im_lauf 'aktiv' | 'nicht_aktiv' (im Lauf aufgeführt, aber gesperrt/nicht eingeschaltet) | 'nicht_im_lauf' |
 * 'ohne_erfassung' (kein letzter Lauf, oder seine Laufakte trägt kein faehigkeiten_im_lauf — z. B. Fortsetzungs-
 * lauf ohne Katalog-Kontext); benutzt = mindestens ein Aufruf ohne Fehler (null ohne Beobachtung oder Erfassung).
 * @param laufakteDaten - Laufakte des jüngsten Ausführungslaufs oder null
 * @param id - Eintrags-id (Katalog-id bzw. agent:/skill:<name>)
 * @returns { im_lauf, benutzt }
 */
export function nutzungImLauf(laufakteDaten, id) {
  const feld = laufakteDaten?.faehigkeiten_im_lauf
  if (feld === undefined || feld === null || !Array.isArray(feld.eintraege)) return { im_lauf: 'ohne_erfassung', benutzt: null }
  const e = feld.eintraege.find((x) => x?.id === id)
  if (e === undefined) return { im_lauf: 'nicht_im_lauf', benutzt: false }
  const benutzt = typeof e.aufrufe === 'number' && typeof e.fehlgeschlagen === 'number' ? e.aufrufe - e.fehlgeschlagen > 0 : null
  return { im_lauf: e.aktiv === true ? 'aktiv' : 'nicht_aktiv', benutzt }
}

/**
 * Antwort von GET /api/faehigkeiten.
 * Katalog-Einträge (MCP, installierter Skill): aktiv = installiert, FREIGEGEBEN und im Projekt nicht abgeschaltet — ob
 * er in einen Lauf kommt, entscheidet zusätzlich die Empfehlung (anwendbar_wenn, Obergrenze). Projekt-Einträge: aktiv =
 * eingeschaltet und nach Inhalt freigegeben (Stand des Projektordners; im Lauf zählt der Arbeitsordner).
 * @param eingabe - { projektId, lokal (ladeFaehigkeitenLokal), katalog (aufgelöste Ressourcen), projekt (ermittleProjektFaehigkeiten),
 *   letzterLauf: { laufId, daten } | null, kennung (empfehlungsKennung) }
 * @returns Status-Objekt
 */
export function baueFaehigkeitenStatus({ projektId, lokal, katalog, projekt, letzterLauf, kennung }) {
  const einst = lokal.zustand === 'ungueltig' ? { an: [], aus: [], inhalt_freigaben: {} } : projektEinstellungen(lokal.daten, projektId)
  const lauf = letzterLauf?.daten ?? null
  const katalogEintraege = katalog
    .filter((r) => r.typ === 'extern' && (r.unterart === 'mcp' || r.unterart === 'skill'))
    .map((r) => {
      const installiert = r.installation !== undefined && r.verfuegbar === true
      const abgeschaltet = einst.aus.includes(r.id)
      const hash = r.unterart === 'skill' ? r.installation?.inhalt_hash : r.installation !== undefined ? kennung(r).split('@')[1] : undefined
      const aktiv = installiert && r.freigabe === 'FREIGEGEBEN' && !abgeschaltet
      return {
        id: r.id,
        name: r.name,
        typ: r.unterart,
        quelle: 'katalog',
        installiert,
        freigabe: r.freigabe,
        ...(typeof hash === 'string' ? { hash } : {}),
        aktiv,
        grund: aktiv ? null : abgeschaltet ? 'im Projekt deaktiviert' : r.grund,
        letzter_lauf: nutzungImLauf(lauf, r.id),
      }
    })
  const projektEintraege = projekt.eintraege.map((e) => ({
    id: e.schluessel,
    name: e.name,
    typ: e.typ,
    quelle: 'projekt',
    installiert: true,
    freigabe: e.freigabe ?? (e.katalog_hash !== null || einst.inhalt_freigaben[e.schluessel] !== undefined ? 'abweichend' : 'keine'),
    ...(e.hash !== null ? { hash: e.hash } : {}),
    katalog_hash: e.katalog_hash,
    eingeschaltet: e.eingeschaltet,
    aktiv: e.aktiv,
    grund: e.grund,
    letzter_lauf: nutzungImLauf(lauf, e.schluessel),
  }))
  return {
    projekt_id: projektId,
    lokale_datei:
      lokal.zustand === 'ungueltig'
        ? { zustand: 'ungueltig', grund: `${lokal.grund} — Läufe mit Fähigkeiten starten in allen Projekten nicht, bis die Datei repariert oder gelöscht ist (E-F45-7)` }
        : { zustand: lokal.zustand },
    letzter_lauf_id: letzterLauf?.laufId ?? null,
    hindernis: projekt.hindernis,
    eintraege: [...katalogEintraege, ...projektEintraege],
  }
}

/**
 * Prüft den Körper von POST /api/faehigkeiten/aktivierung (Delta B4).
 * @param body - geparster Körper
 * @param katalog - validierte Katalogeinträge
 * @returns { ok: true, eintrag, aktiv } oder { ok: false, status, grund }
 */
export function pruefeAktivierungKoerper(body, katalog) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { ok: false, status: 400, grund: 'Körper muss ein Objekt { eintrag, aktiv } sein' }
  if (Object.keys(body).some((k) => k !== 'eintrag' && k !== 'aktiv')) return { ok: false, status: 400, grund: "nur die Felder 'eintrag' und 'aktiv' sind zulässig" }
  if (typeof body.aktiv !== 'boolean') return { ok: false, status: 400, grund: "'aktiv' muss true oder false sein" }
  if (zerlegeSchluessel(body.eintrag) !== null) return { ok: true, eintrag: body.eintrag, aktiv: body.aktiv }
  if (typeof body.eintrag !== 'string' || !ID_MUSTER.test(body.eintrag)) return { ok: false, status: 400, grund: "'eintrag' muss 'agent:<name>', 'skill:<name>' oder eine Katalog-id sein" }
  const r = katalog.find((x) => x.id === body.eintrag)
  if (r === undefined) return { ok: false, status: 404, grund: `Katalogeintrag '${body.eintrag}' nicht gefunden` }
  if (r.typ === 'agent' || r.typ === 'skill') return { ok: false, status: 400, grund: `'${r.id}' ist ein Projekt-${r.typ === 'agent' ? 'Agent' : 'Skill'} — als '${r.typ}:<name>' schalten` }
  if (r.typ !== 'extern' || (r.unterart !== 'mcp' && r.unterart !== 'skill')) return { ok: false, status: 400, grund: `'${r.id}' (${r.typ}${r.unterart !== undefined ? `/${r.unterart}` : ''}) ist je Projekt nicht schaltbar — nur MCPs und installierte Skills` }
  return { ok: true, eintrag: body.eintrag, aktiv: body.aktiv }
}

/**
 * QA 2: Einschalten nur für einen Projekt-Eintrag, den es im Projektordner gibt (Groß-/Kleinschreibung genau); bei einer
 * Abweichung nur in der Schreibweise nennt der Grund den vorhandenen Namen. Ausschalten bleibt immer erlaubt (Aufräumen).
 * @param projekt - ermittleProjektFaehigkeiten des Projektordners
 * @param eintrag - 'agent:<n>'/'skill:<n>'
 * @param aktiv - Wunsch
 * @returns null oder { status, grund }
 */
export function einschaltSperrgrund(projekt, eintrag, aktiv) {
  if (!aktiv || zerlegeSchluessel(eintrag) === null) return null
  if (projekt.eintraege.some((e) => e.schluessel === eintrag && e.hash !== null)) return null
  const aehnlich = projekt.eintraege.find((e) => e.schluessel.toLowerCase() === eintrag.toLowerCase() && e.hash !== null)
  return { status: 404, grund: aehnlich !== undefined ? `'${eintrag}' gibt es im Projektordner nicht — gemeint ist vermutlich '${aehnlich.schluessel}'` : `'${eintrag}' gibt es im Projektordner nicht` }
}

/**
 * Prüft den Körper von POST /api/faehigkeiten/freigabe.
 * @param body - geparster Körper
 * @returns { ok: true, eintrag, hash } oder { ok: false, status, grund }
 */
export function pruefeFreigabeKoerper(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { ok: false, status: 400, grund: 'Körper muss ein Objekt { eintrag, hash } sein' }
  if (Object.keys(body).some((k) => k !== 'eintrag' && k !== 'hash')) return { ok: false, status: 400, grund: "nur die Felder 'eintrag' und 'hash' sind zulässig" }
  if (zerlegeSchluessel(body.eintrag) === null) return { ok: false, status: 400, grund: "'eintrag' muss 'agent:<name>' oder 'skill:<name>' sein" }
  if (typeof body.hash !== 'string' || !SHA256_MUSTER.test(body.hash)) return { ok: false, status: 400, grund: "'hash' (aus der Anzeige) fehlt oder ist kein sha256" }
  return { ok: true, eintrag: body.eintrag, hash: body.hash }
}

/**
 * Freigabe nach Inhalt gegen den aktuellen Stand prüfen (Muster eintragHash).
 * @param projekt - ermittleProjektFaehigkeiten des Projektordners
 * @param eintrag - 'agent:<n>'/'skill:<n>'
 * @param hash - angezeigter Hash
 * @returns null, wenn freigebbar, sonst { status, grund }
 */
export function freigabeSperrgrund(projekt, eintrag, hash) {
  const e = projekt.eintraege.find((x) => x.schluessel === eintrag)
  if (e === undefined) return { status: 404, grund: `'${eintrag}' gibt es im Projektordner nicht` }
  if (e.hash === null) return { status: 409, grund: `Inhalt von '${eintrag}' nicht lesbar (${e.grund ?? 'unbekannt'})` }
  if (e.hash !== hash) return { status: 409, grund: `Inhalt von '${eintrag}' hat sich seit der Anzeige geändert (jetzt ${e.hash.slice(0, 12)}…) — nichts freigegeben, neu laden` }
  return null
}

/**
 * Liest die lokale Datei, wendet eine Änderung an und schreibt sie synchron. Nie über eine ungültige Datei (E-F45-7).
 * @param pfad - Pfad der lokalen Datei oder null (Instanz ohne Datei: 500)
 * @param projektId - Projekt dieser Instanz
 * @param aenderung - { art: 'aktivierung', eintrag, aktiv } | { art: 'freigabe', eintrag, hash }
 * @returns { ok: true, einstellungen } oder { ok: false, status, grund }
 */
export function aendereLokaleDatei(pfad, projektId, aenderung) {
  if (pfad === null) return { ok: false, status: 500, grund: 'Diese Instanz hat keinen Pfad für faehigkeiten.lokal.json (nur der reale Leitstand schreibt sie)' }
  const lokal = ladeFaehigkeitenLokal(pfad)
  if (lokal.zustand === 'ungueltig') return { ok: false, status: 409, grund: `${lokal.grund} — erst von Hand reparieren oder löschen, nichts geändert` }
  const neu = aenderung.art === 'aktivierung' ? aendereAktivierung(lokal.daten, projektId, aenderung.eintrag, aenderung.aktiv) : setzeInhaltsfreigabe(lokal.daten, projektId, aenderung.eintrag, aenderung.hash)
  try {
    mkdirSync(dirname(pfad), { recursive: true })
    schreibeFaehigkeitenLokal(pfad, neu)
  } catch (fehler) {
    console.error(`[faehigkeiten] '${pfad}' nicht schreibbar:`, fehler)
    return { ok: false, status: 500, grund: `'${pfad}' nicht schreibbar: ${fehler.message}` }
  }
  return { ok: true, einstellungen: projektEinstellungen(neu, projektId) }
}
