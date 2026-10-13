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
 * Seit F45 F-2a (F-1012 Oberfläche, F-1055 (1)): Status zusätzlich mit beschreibung/pfad je Eintrag, lauf_aktiv (Schalter
 * vorab sperren) und lokale_datei.fremd_geaendert aus dem Wächter (erzeugeLokalWaechter: Änderung der lokalen Datei, die
 * nicht über diese Routen kam).
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (Registrierung der drei Routen, Wächter je Prozess)
 * - scripts/leitstand/routen-faehigkeiten.test.mjs (node:test), scripts/check-f45-f1-faehigkeiten.mjs
 * - scripts/leitstand/routen-sammlung.mjs (F45 F-2b-1: baueKatalogStatus für den Stand der Sammlung)
 *
 * Wichtig:
 * - Geschrieben wird nur ~/.ai-workforce/faehigkeiten.lokal.json (E-F45-8), nie ressourcen.json, projekte.json oder
 *   .claude/settings.json (E-F46-2). Über eine ungültige Datei wird nie geschrieben (409, E-F45-7).
 * - Die Laufsperre (409 während eines Laufs, E-F45-8) und CSRF/Host (zentral) prüft der Server vor diesen Bausteinen.
 * - Der Wächter rechnet im Speicher; seit F45 F-2b-2c speichert er den bekannten Stand in faehigkeiten.stand.json neben der
 *   lokalen Datei (ARCHITECTURE.md §2, Ausnahme) und liest ihn nur beim Erzeugen — nie mit eigenem Lesen im 2-s-Takt.
 */

import { mkdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { aendereAktivierung, hashLokaleDatei, ladeFaehigkeitenLokal, projektEinstellungen, SHA256_MUSTER, schreibeFaehigkeitenLokal, setzeInhaltsfreigabe, zerlegeSchluessel } from '../../src/faehigkeiten/index.ts'
import { ladeLokalStand, schreibeLokalStand } from '../../src/faehigkeiten/stand.ts'
import { ID_MUSTER } from '../../src/projekte/index.ts'

/**
 * F45 F-2a (F-1055 (1)): Wächter der lokalen Datei — merkt den zuletzt bekannten Stand (Hash) und meldet eine Änderung,
 * die nicht über die POST-Routen kam (z. B. ein nach Laufende weiterlebender Prozess oder eine Handänderung).
 * Bekannt wird ein Stand beim Erzeugen (Serverstart) und nach einem Schreiben über die Routen (Hash der geschriebenen
 * Bytes, Advisor A3). Ein Laufende übernimmt nichts (Advisor A2): eine Änderung im Lauf färbt den Lauf rot, eine danach
 * bliebe sonst unsichtbar. Seit der Entscheidung zu F-1061 (3) (Stefan, 12.10.2026, Empfehlung Challenger) gilt ein fremd
 * geänderter Stand erst nach ausdrücklicher Bestätigung (bestaetige, POST …/faehigkeiten/bestaetigung); bis dahin sperren
 * die Schreib-Routen und jeder Start mit Katalog-Fähigkeiten.
 * Seit F45 F-2b-2c (F-1061 (1)) überdauert der bekannte Stand Neustarts, wenn ein standPfad gegeben ist (nur der
 * CLI-Bindeblock, src/faehigkeiten/stand.ts): Startregel (Advisor A1/A2, fail-closed) —
 * - gespeicherter Stand gültig und für denselben Pfad: gleich → bekannt; abweichend → bekannt bleibt der gespeicherte Hash
 *   mit quelle 'neustart' (Band + Sperre bis zur Bestätigung);
 * - kein, ein ungültiger oder ein Stand für einen anderen Pfad: nur wenn die lokale Datei fehlt, gilt 'fehlt' als bekannt
 *   (und wird gespeichert); sonst ist der Stand 'unbekannt' (quelle 'unbekannt') → gesperrt bis zur Bestätigung (einmalig
 *   beim ersten Start mit F-2b-2c).
 * nachRoute/bestaetige speichern den neuen Stand; ein Schreibfehler wird geloggt (nach dem nächsten Neustart zeigt der alte
 * Stand ein Band — fail-closed). Grenze (F-1061 (2)): eine Anfrage an die POST-Routen ohne Browser-Header gilt als
 * Route-Schreiben, solange nichts fremd geändert ist.
 * @param pfad - Pfad der lokalen Datei
 * @param jetzt - Zeitquelle (Tests), liefert ISO-Zeit
 * @param standPfad - Ablage des bekannten Stands (standPfadFuer) oder null (nur im Speicher: Gates, Tests)
 * @returns { nachRoute(hash), bestaetige(hash), pruefe(aktuellerHash), bekannt() }
 */
export function erzeugeLokalWaechter(pfad, jetzt = () => new Date().toISOString(), standPfad = null) {
  const absolut = resolve(pfad)
  /** Speichert einen bekannten Stand (wirft nie). @param stand - { hash, zeitpunkt, quelle } */
  const speichere = (stand) => {
    if (standPfad === null || !/^([0-9a-f]{64}|fehlt)$/.test(stand.hash)) return
    try {
      mkdirSync(dirname(standPfad), { recursive: true })
      schreibeLokalStand(standPfad, { faehigkeiten_stand_schema: 'v0', pfad: absolut, ...stand })
    } catch (fehler) {
      console.error(`[faehigkeiten] Stand '${standPfad}' nicht schreibbar (nach dem nächsten Neustart erscheint ein Band):`, fehler)
    }
  }
  const aktuell = hashLokaleDatei(pfad)
  let bekannt = { hash: aktuell, zeitpunkt: jetzt(), quelle: 'serverstart' }
  if (standPfad !== null) {
    const geladen = ladeLokalStand(standPfad)
    if (geladen.zustand === 'gueltig' && geladen.stand.pfad === absolut) {
      const { hash, zeitpunkt, quelle } = geladen.stand
      bekannt = hash === aktuell ? { hash, zeitpunkt, quelle } : { hash, zeitpunkt, quelle: 'neustart' }
    } else if (aktuell === 'fehlt') {
      speichere(bekannt)
    } else {
      const grund = geladen.zustand === 'ungueltig' ? geladen.grund : geladen.zustand === 'gueltig' ? `Stand gehört zu '${geladen.stand.pfad}'` : 'kein gespeicherter Stand'
      console.error(`[faehigkeiten] Stand von '${pfad}' unbekannt (${grund}) — gesperrt bis zur Bestätigung auf der Seite Workforce.`)
      bekannt = { hash: 'unbekannt', zeitpunkt: null, quelle: 'unbekannt' }
    }
  }
  return {
    /** Nach einem erfolgreichen Schreiben über die Routen. @param hash - sha256 der geschriebenen Bytes */
    nachRoute(hash) {
      bekannt = { hash, zeitpunkt: jetzt(), quelle: 'route' }
      speichere(bekannt)
    },
    /** F-1061 (3): Stefan hat den angezeigten, fremd geänderten Stand geprüft und übernommen. @param hash - bestätigter Hash */
    bestaetige(hash) {
      bekannt = { hash, zeitpunkt: jetzt(), quelle: 'bestaetigt' }
      speichere(bekannt)
    },
    /**
     * Vergleicht den aktuellen Stand mit dem bekannten.
     * @param aktuellerHash - hashLokaleDatei bzw. lokal.hash ('fehlt' ohne Datei)
     * @returns null oder { bekannt_seit, quelle }
     */
    pruefe(aktuellerHash) {
      return aktuellerHash === bekannt.hash ? null : { bekannt_seit: bekannt.zeitpunkt, quelle: bekannt.quelle }
    },
    /** @returns Kopie des bekannten Stands (Tests, Nachweis) */
    bekannt() {
      return { ...bekannt }
    },
  }
}

/** F-1061 (3): Grund, solange eine Änderung von außen nicht bestätigt ist (Startabbruch, Band, Schreib-Routen). */
export const FREMD_UNBESTAETIGT = 'faehigkeiten.lokal.json wurde außerhalb des Leitstands geändert und ist noch nicht bestätigt — auf der Seite Workforce prüfen und „Datei geprüft – Stand übernehmen“'

/**
 * F-1061 (3): POST /api/faehigkeiten/bestaetigung { stand } — übernimmt genau den angezeigten Stand der Datei. Abgelehnt,
 * wenn sich die Datei seit der Anzeige geändert hat (409), wenn sie ungültig ist (409, erst reparieren, E-F45-7) oder
 * wenn es nichts zu bestätigen gibt (409). Die Laufsperre und CSRF/Host prüft der Server vorher.
 * @param body - geparster Körper
 * @param pfad - Pfad der lokalen Datei oder null
 * @param waechter - erzeugeLokalWaechter oder null
 * @returns { ok: true, bekannt } oder { ok: false, status, grund }
 */
export function bestaetigeLokaleDatei(body, pfad, waechter) {
  if (pfad === null || waechter === null) return { ok: false, status: 500, grund: 'Diese Instanz hat keinen Pfad bzw. Wächter für faehigkeiten.lokal.json' }
  if (typeof body !== 'object' || body === null || Array.isArray(body) || Object.keys(body).some((k) => k !== 'stand')) return { ok: false, status: 400, grund: "Körper muss ein Objekt { stand } sein" }
  if (body.stand !== 'fehlt' && (typeof body.stand !== 'string' || !SHA256_MUSTER.test(body.stand))) return { ok: false, status: 400, grund: "'stand' (Hash der Datei aus der Anzeige) muss ein sha256 oder 'fehlt' sein" }
  const aktuell = hashLokaleDatei(pfad)
  if (aktuell !== body.stand) return { ok: false, status: 409, grund: `'${pfad}' hat sich seit der Anzeige erneut geändert — neu laden und prüfen, nichts bestätigt` }
  if (waechter.pruefe(aktuell) === null) return { ok: false, status: 409, grund: 'Es gibt keine unbestätigte Änderung — nichts bestätigt' }
  const lokal = ladeFaehigkeitenLokal(pfad)
  if (lokal.zustand === 'ungueltig') return { ok: false, status: 409, grund: `${lokal.grund} — erst reparieren oder löschen, nichts bestätigt (E-F45-7)` }
  waechter.bestaetige(aktuell)
  return { ok: true, bekannt: waechter.bekannt() }
}

/**
 * Fremdänderung für die Status-Route: Wächter-Vergleich mit dem Hash der Bytes (hashLokaleDatei), dazu die Änderungszeit
 * der Datei (mtime) bzw. null, wenn sie fehlt. Wirft nie.
 * @param waechter - erzeugeLokalWaechter oder null
 * @param pfad - Pfad der lokalen Datei oder null
 * @returns null oder { bekannt_seit, quelle, geaendert_am }
 */
export function fremdGeaendert(waechter, pfad) {
  if (waechter === null || pfad === null) return null
  const abweichung = waechter.pruefe(hashLokaleDatei(pfad))
  if (abweichung === null) return null
  let geaendert = null
  try {
    geaendert = statSync(pfad).mtime.toISOString()
  } catch {
    // Datei gelöscht: die Änderung bleibt sichtbar, nur ohne Zeitpunkt.
  }
  return { ...abweichung, geaendert_am: geaendert }
}

/**
 * Stand eines Eintrags im letzten Ausführungslauf (QA 5: eindeutig statt eines mehrdeutigen true/false/null):
 * im_lauf 'aktiv' | 'nicht_aktiv' (im Lauf aufgeführt, aber gesperrt/nicht eingeschaltet) | 'nicht_im_lauf' |
 * 'ohne_erfassung' (kein letzter Lauf, oder seine Laufakte trägt kein faehigkeiten_im_lauf — z. B. Fortsetzungs-
 * lauf ohne Katalog-Kontext); benutzt = mindestens ein Aufruf ohne Fehler (null ohne Beobachtung oder Erfassung).
 * @param laufakteDaten - Laufakte des jüngsten Ausführungslaufs oder null
 * @param id - Eintrags-id (Katalog-id bzw. agent:/skill:<name>)
 * @returns { im_lauf, benutzt } bzw. mit Eintrag zusätzlich { aufrufe, fehler } (F45 F-2a)
 */
export function nutzungImLauf(laufakteDaten, id) {
  const feld = laufakteDaten?.faehigkeiten_im_lauf
  if (feld === undefined || feld === null || !Array.isArray(feld.eintraege)) return { im_lauf: 'ohne_erfassung', benutzt: null }
  const e = feld.eintraege.find((x) => x?.id === id)
  if (e === undefined) return { im_lauf: 'nicht_im_lauf', benutzt: false }
  const benutzt = typeof e.aufrufe === 'number' && typeof e.fehlgeschlagen === 'number' ? e.aufrufe - e.fehlgeschlagen > 0 : null
  // F45 F-2a: Anzahl der Aufrufe und Fehler für die Spalte „Im letzten Lauf“ (null ohne Beobachtung).
  return { im_lauf: e.aktiv === true ? 'aktiv' : 'nicht_aktiv', benutzt, aufrufe: typeof e.aufrufe === 'number' ? e.aufrufe : null, fehler: typeof e.fehlgeschlagen === 'number' ? e.fehlgeschlagen : null }
}

/**
 * Antwort von GET /api/faehigkeiten.
 * Katalog-Einträge (MCP, installierter Skill): aktiv = installiert, FREIGEGEBEN und im Projekt nicht abgeschaltet — ob
 * er in einen Lauf kommt, entscheidet zusätzlich die Empfehlung (anwendbar_wenn, Obergrenze). Projekt-Einträge: aktiv =
 * eingeschaltet und nach Inhalt freigegeben (Stand des Projektordners; im Lauf zählt der Arbeitsordner).
 * @param eingabe - { projektId, lokal (ladeFaehigkeitenLokal), katalog (aufgelöste Ressourcen), projekt (ermittleProjektFaehigkeiten),
 *   letzterLauf: { laufId, daten } | null, kennung (empfehlungsKennung), laufAktiv (F45 F-2a: { aktiv, grund? } — Schalter
 *   vorab sperren; Standard nicht aktiv), fremd (F45 F-2a: fremdGeaendert oder null), lokalPfad (Anzeige im Band),
 *   standHash (F45 F-2a, QA 1: Hash der Datei, den die Oberfläche mit jeder Änderung zurückschickt; 'fehlt' ohne Datei) }
 * @returns Status-Objekt
 */
export function baueFaehigkeitenStatus({ projektId, lokal, katalog, projekt, letzterLauf, kennung, laufAktiv = { aktiv: false }, fremd = null, lokalPfad = null, standHash = null }) {
  const ungueltig = lokal.zustand === 'ungueltig'
  const einst = ungueltig ? { an: [], aus: [], inhalt_freigaben: {} } : projektEinstellungen(lokal.daten, projektId)
  const lauf = letzterLauf?.daten ?? null
  const katalogEintraege = baueKatalogStatus({ projektId, lokal, katalog, letzterLauf, kennung })
  const projektEintraege = baueProjektStatus(projekt, einst, lauf)
  return {
    projekt_id: projektId,
    lokale_datei: {
      ...(lokal.zustand === 'ungueltig'
        ? { zustand: 'ungueltig', grund: `${lokal.grund} — Läufe mit Fähigkeiten starten in allen Projekten nicht, bis die Datei repariert oder gelöscht ist (E-F45-7)` }
        : { zustand: lokal.zustand }),
      pfad: lokalPfad,
      hash: standHash,
      fremd_geaendert: fremd,
    },
    lauf_aktiv: laufAktiv,
    letzter_lauf_id: letzterLauf?.laufId ?? null,
    hindernis: projekt.hindernis,
    eintraege: [...katalogEintraege, ...projektEintraege],
  }
}

/**
 * Katalog-Teil von GET /api/faehigkeiten (MCP, installierter Skill) — seit F45 F-2b-1 eigene Funktion, weil die Sammlung
 * (GET /api/sammlung, Stand installiert · aktiv · benutzt) dieselbe Regel braucht. Verhalten wie vorher in
 * baueFaehigkeitenStatus.
 * @param eingabe - { projektId, lokal, katalog (aufgelöste Ressourcen), letzterLauf: { laufId, daten } | null, kennung }
 * @returns Katalog-Einträge des Status
 */
export function baueKatalogStatus({ projektId, lokal, katalog, letzterLauf, kennung }) {
  const ungueltig = lokal.zustand === 'ungueltig'
  const einst = ungueltig ? { an: [], aus: [], inhalt_freigaben: {} } : projektEinstellungen(lokal.daten, projektId)
  const lauf = letzterLauf?.daten ?? null
  return katalog
    .filter((r) => r.typ === 'extern' && (r.unterart === 'mcp' || r.unterart === 'skill'))
    .map((r) => {
      const installiert = r.installation !== undefined && r.verfuegbar === true
      const abgeschaltet = einst.aus.includes(r.id)
      const hash = r.unterart === 'skill' ? r.installation?.inhalt_hash : r.installation !== undefined ? kennung(r).split('@')[1] : undefined
      // QA 6: bei ungültiger Datei startet kein Lauf mit Fähigkeiten — dann ist auch kein Katalog-Eintrag aktiv.
      const aktiv = installiert && r.freigabe === 'FREIGEGEBEN' && !abgeschaltet && !ungueltig
      return {
        id: r.id,
        name: r.name,
        typ: r.unterart,
        quelle: 'katalog',
        // F45 F-2a: Kurzbeschreibung aus dem Katalog (aufgelöst).
        beschreibung: typeof r.beschreibung === 'string' && r.beschreibung !== '' ? r.beschreibung : null,
        installiert,
        freigabe: r.freigabe,
        ...(typeof hash === 'string' ? { hash } : {}),
        // F45 F-2a: Stellung des Schalters — Katalog-Einträge sind an, bis sie im Projekt abgeschaltet werden (aus).
        eingeschaltet: !abgeschaltet,
        aktiv,
        grund: aktiv ? null : ungueltig ? UNGUELTIG_GRUND : abgeschaltet ? 'im Projekt deaktiviert' : r.grund,
        letzter_lauf: nutzungImLauf(lauf, r.id),
      }
    })
}

/**
 * Projekt-Teil von GET /api/faehigkeiten (Projekt-Agents/-Skills) — herausgezogen mit baueKatalogStatus (F45 F-2b-1).
 * @param projekt - ermittleProjektFaehigkeiten
 * @param einst - Einstellungen des Projekts aus der lokalen Datei
 * @param lauf - Laufakte des jüngsten Ausführungslaufs oder null
 * @returns Projekt-Einträge des Status
 */
function baueProjektStatus(projekt, einst, lauf) {
  return projekt.eintraege.map((e) => ({
    id: e.schluessel,
    name: e.name,
    typ: e.typ,
    quelle: 'projekt',
    beschreibung: e.beschreibung ?? null,
    // F45 F-2a: Ort im Projektordner (für „Freigeben nach Inhalt“), leer bei „eingeschaltet, aber nicht vorhanden“.
    pfad: e.pfad === '' ? null : `.claude/${e.pfad}`,
    installiert: e.hash !== null,
    // QA 2: ohne Datei im Projektordner 'fehlt' (nicht „abweichend“).
    freigabe: e.freigabe ?? (e.hash === null ? 'fehlt' : e.katalog_hash !== null || einst.inhalt_freigaben[e.schluessel] !== undefined ? 'abweichend' : 'keine'),
    ...(e.hash !== null ? { hash: e.hash } : {}),
    katalog_hash: e.katalog_hash,
    eingeschaltet: e.eingeschaltet,
    aktiv: e.aktiv,
    grund: e.grund,
    letzter_lauf: nutzungImLauf(lauf, e.schluessel),
  }))
}

/** Grund eines Katalog-Eintrags bei ungültiger lokaler Datei (QA 6). */
const UNGUELTIG_GRUND = 'lokale Datei ungültig — kein Lauf mit Fähigkeiten, bis sie repariert oder gelöscht ist (E-F45-7)'

/**
 * F45 F-2a (QA 1): optionales Feld stand — der Hash der lokalen Datei, den die Oberfläche angezeigt hat.
 * @param wert - Feldwert
 * @returns true, wenn fehlend oder in gültiger Form
 */
function standGueltig(wert) {
  return wert === undefined || wert === 'fehlt' || (typeof wert === 'string' && SHA256_MUSTER.test(wert))
}

/**
 * Prüft den Körper von POST /api/faehigkeiten/aktivierung (Delta B4).
 * @param body - geparster Körper
 * @param katalog - validierte Katalogeinträge
 * @returns { ok: true, eintrag, aktiv, stand? } oder { ok: false, status, grund }
 */
export function pruefeAktivierungKoerper(body, katalog) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { ok: false, status: 400, grund: 'Körper muss ein Objekt { eintrag, aktiv } sein' }
  if (Object.keys(body).some((k) => k !== 'eintrag' && k !== 'aktiv' && k !== 'stand')) return { ok: false, status: 400, grund: "nur die Felder 'eintrag', 'aktiv' und 'stand' sind zulässig" }
  if (typeof body.aktiv !== 'boolean') return { ok: false, status: 400, grund: "'aktiv' muss true oder false sein" }
  if (!standGueltig(body.stand)) return { ok: false, status: 400, grund: "'stand' (Hash der Datei aus der Anzeige) muss ein sha256 oder 'fehlt' sein" }
  const stand = body.stand !== undefined ? { stand: body.stand } : {}
  if (zerlegeSchluessel(body.eintrag) !== null) return { ok: true, eintrag: body.eintrag, aktiv: body.aktiv, ...stand }
  if (typeof body.eintrag !== 'string' || !ID_MUSTER.test(body.eintrag)) return { ok: false, status: 400, grund: "'eintrag' muss 'agent:<name>', 'skill:<name>' oder eine Katalog-id sein" }
  const r = katalog.find((x) => x.id === body.eintrag)
  if (r === undefined) return { ok: false, status: 404, grund: `Katalogeintrag '${body.eintrag}' nicht gefunden` }
  if (r.typ === 'agent' || r.typ === 'skill') return { ok: false, status: 400, grund: `'${r.id}' ist ein Projekt-${r.typ === 'agent' ? 'Agent' : 'Skill'} — als '${r.typ}:<name>' schalten` }
  if (r.typ !== 'extern' || (r.unterart !== 'mcp' && r.unterart !== 'skill')) return { ok: false, status: 400, grund: `'${r.id}' (${r.typ}${r.unterart !== undefined ? `/${r.unterart}` : ''}) ist je Projekt nicht schaltbar — nur MCPs und installierte Skills` }
  return { ok: true, eintrag: body.eintrag, aktiv: body.aktiv, ...stand }
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
 * @returns { ok: true, eintrag, hash, stand? } oder { ok: false, status, grund }
 */
export function pruefeFreigabeKoerper(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { ok: false, status: 400, grund: 'Körper muss ein Objekt { eintrag, hash } sein' }
  if (Object.keys(body).some((k) => k !== 'eintrag' && k !== 'hash' && k !== 'stand')) return { ok: false, status: 400, grund: "nur die Felder 'eintrag', 'hash' und 'stand' sind zulässig" }
  if (zerlegeSchluessel(body.eintrag) === null) return { ok: false, status: 400, grund: "'eintrag' muss 'agent:<name>' oder 'skill:<name>' sein" }
  if (typeof body.hash !== 'string' || !SHA256_MUSTER.test(body.hash)) return { ok: false, status: 400, grund: "'hash' (aus der Anzeige) fehlt oder ist kein sha256" }
  if (!standGueltig(body.stand)) return { ok: false, status: 400, grund: "'stand' (Hash der Datei aus der Anzeige) muss ein sha256 oder 'fehlt' sein" }
  return { ok: true, eintrag: body.eintrag, hash: body.hash, ...(body.stand !== undefined ? { stand: body.stand } : {}) }
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
 * @param stand - F45 F-2a (QA 1): angezeigter Hash der Datei (oder 'fehlt'); weicht der aktuelle ab, wird nichts geschrieben
 *   (409) — so übernimmt kein Klick eine Fremdänderung, die nach dem Laden der Seite geschah. undefined = ohne Vergleich.
 * @returns { ok: true, einstellungen, hash (F45 F-2a: sha256 der geschriebenen Bytes, für den Wächter) } oder { ok: false, status, grund }
 */
export function aendereLokaleDatei(pfad, projektId, aenderung, stand = undefined, waechter = null) {
  if (pfad === null) return { ok: false, status: 500, grund: 'Diese Instanz hat keinen Pfad für faehigkeiten.lokal.json (nur der reale Leitstand schreibt sie)' }
  if (stand !== undefined && hashLokaleDatei(pfad) !== stand) return { ok: false, status: 409, grund: `'${pfad}' hat sich seit der Anzeige geändert — neu laden und die Datei prüfen, nichts geändert` }
  // F-1061 (3): solange eine Änderung von außen nicht bestätigt ist, übernimmt kein Schreiben sie stillschweigend.
  if (waechter !== null && waechter.pruefe(hashLokaleDatei(pfad)) !== null) return { ok: false, status: 409, grund: `${FREMD_UNBESTAETIGT} — nichts geändert` }
  const lokal = ladeFaehigkeitenLokal(pfad)
  if (lokal.zustand === 'ungueltig') return { ok: false, status: 409, grund: `${lokal.grund} — erst von Hand reparieren oder löschen, nichts geändert` }
  const neu = aenderung.art === 'aktivierung' ? aendereAktivierung(lokal.daten, projektId, aenderung.eintrag, aenderung.aktiv) : setzeInhaltsfreigabe(lokal.daten, projektId, aenderung.eintrag, aenderung.hash)
  let hash
  try {
    mkdirSync(dirname(pfad), { recursive: true })
    hash = schreibeFaehigkeitenLokal(pfad, neu)
  } catch (fehler) {
    console.error(`[faehigkeiten] '${pfad}' nicht schreibbar:`, fehler)
    return { ok: false, status: 500, grund: `'${pfad}' nicht schreibbar: ${fehler.message}` }
  }
  return { ok: true, einstellungen: projektEinstellungen(neu, projektId), hash }
}
