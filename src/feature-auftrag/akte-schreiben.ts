/**
 * Datei: src/feature-auftrag/akte-schreiben.ts
 *
 * Zweck: F45 B5a-1 „Akte schreiben“ (E-F45-1, zielfassung §13.6; features/F45/plan-b5a1-v2.md, Advisor
 * features/F45/advisor-b5a1.md) — reine Funktionen zum Bearbeiten einer Feature-Akte: prüfeAkteAenderung prüft und
 * normalisiert den Körper von PUT …/features/<id>/akte, bearbeiteFeatureAkte ersetzt nur die Abschnitte
 * '## Ziel', '## Nicht-Ziele' und '## Akzeptanzkriterien' und hängt eine Zeile unter '## Änderungen' an.
 * Kein I/O: Lesen, Hash, Sperre und Schreiben liegen bei scripts/leitstand/routen-f35.mjs.
 *
 * Regeln (Plan v2):
 * - Abschnittsgrenzen aus findeAbschnitt (src/feature-auftrag/index.ts) — dieselbe Spanne, die Anzeige und Bau-Auftrag
 *   lesen. Vor dem Körper eines ersetzten Abschnitts und ab seinem Ende bleibt jedes Byte erhalten; die Überschriftzeile
 *   selbst auch. Ein unveränderter Abschnitt (gleicher gelesener Wert) wird nicht angefasst.
 * - Zeilenende: das erste der Datei (`\r\n` oder `\n`); neue Zeilen tragen es (Ausnahme zu ARCHITECTURE.md §7 für
 *   bestehende Akten, Entscheidung Stefan A2).
 * - Listen: `- <text>` bzw. `- AK<n>: <text>`, Folgezeilen eines mehrzeiligen Eintrags mit zwei Leerzeichen eingerückt
 *   (der Leser hängt sie wieder an); leere Nicht-Ziele ⇒ Zeile `keine`. Ein Listenabschnitt, der sich ändert, darf nur
 *   Leerzeilen, Top-Level-Bullets, eingerückte Zeilen und `keine` enthalten — sonst 422 (Entscheidung Stefan A3: kein
 *   stiller Verlust von Vortext, Unterüberschriften oder Tabellen).
 * - Rundlauf-Probe: die neue Akte muss über leseFeatureAkteAnzeige genau die normalisierten Werte liefern, die Status-Zeile
 *   unverändert tragen und das Feature-Akte-Gate bestehen (pruefeFeatureAkteInhalt) — sonst 422, nichts geschrieben.
 *
 * Wird aufgerufen von: scripts/leitstand/routen-f35.mjs, src/product-coach/index.ts (Normalisierung, Bullet-Zeilen),
 * src/feature-auftrag/akte-schreiben.test.ts, scripts/check-f45-b5a1-akte.mjs.
 *
 * Wichtig — bekannte Grenzen (DEKLARIERT): Eine Überschrift in einem Code-Fence vor dem echten Abschnitt und
 * Präfix-Treffer wie '## Akzeptanzkriterien WS-2' vor '## Akzeptanzkriterien' (F27, F28) treffen die erste Überschrift —
 * wie Anzeige und Bau-Auftrag. Ein erlaubter Listenabschnitt wird ganz neu formatiert (Checkboxen entfallen,
 * `- AK1 Text` wird `- AK1: Text`).
 */

import { leseFeatureStatus, pruefeFeatureAkteInhalt } from '../workboard/feature-akte-pruefung.ts'
import { BULLET_EINLEITUNG_MUSTER, CHECKBOX_PRAEFIX_MUSTER, type FeatureAuftragAkzeptanzkriterium, findeAbschnitt, leseAkzeptanzkriterien, leseFeatureAkteAnzeige, leseTopLevelBullets } from './index.ts'

/** Status, in denen eine Akte im Leitstand nicht mehr bearbeitet wird (Entscheidung Stefan C15, Zwilling STATUS_NICHT_BAUBAR). */
export const STATUS_NICHT_BEARBEITBAR = new Set(['ABGESCHLOSSEN', 'ABGEBROCHEN'])

/** Obergrenzen der Listen und der Begründung. */
export const AKTE_LISTE_OBERGRENZE = 100
export const AKTE_GRUND_OBERGRENZE = 500

/**
 * Steuerzeichen außer Tabulator, Zeilenvorschub und Wagenrücklauf — dazu U+2028/U+2029: die JS-Leser mit `m`-Flag nähmen sie
 * als Zeilenanfang (ein verdeckter Abschnitt, den git und Markdown als eine Zeile zeigen; code-reviewer V3).
 */
const STEUERZEICHEN = new Set([...Array(32).keys()].filter((code) => code !== 9 && code !== 10 && code !== 13).concat(0x7f, 0x2028, 0x2029))

/** true, wenn der Text ein Zeichen aus STEUERZEICHEN trägt. @param text - Text @returns boolean */
function enthaeltSteuerzeichen(text: string): boolean {
  for (const zeichen of text) if (STEUERZEICHEN.has(zeichen.charCodeAt(0))) return true
  return false
}

/** Eine Zeile, die der Leser als Abschnittsgrenze nähme (`^##\s+`, auch `##` allein). */
const UEBERSCHRIFT_ZEILE_MUSTER = /^##(?:\s|$)/
/** Eine einzeilige Angabe (Titel), die am Zeilenanfang Überschrift oder Status-Zeile würde (code-reviewer M1). */
const ZEILE_UNZULAESSIG_MUSTER = /^(?:#|Status:)/
/** Wie der Leser (AK_ID_PRAEFIX_MUSTER: `AK\d+`) — sonst scheiterte der Rundlauf an Bestandsakten mit AK0 (F29, qa 3). */
const AK_ID_MUSTER = /^AK[0-9]+$/
const SHA256_MUSTER = /^[0-9a-f]{64}$/
/** Inhalt eines leeren Listenabschnitts, den der Schreiber erzeugt bzw. zulässt. */
const LEER_ZEILEN = new Set(['keine', '(keine)'])

/** Ein normalisierter Bearbeitungsauftrag (Körper von PUT …/akte ohne hash). */
export interface AkteAenderung {
  ziel: string
  nicht_ziele: string[]
  akzeptanzkriterien: FeatureAuftragAkzeptanzkriterium[]
  grund: string
}

export type AkteAenderungPruefung = { ok: true; aenderung: AkteAenderung; hash: string } | { ok: false; grund: string }

export type AkteBearbeitung = { ok: true; inhalt: string; geaendert: string[] } | { ok: false; grund: string; verstoesse?: string[] }

/**
 * Normalisiert einen Listeneintrag: Zeilenenden vereinheitlicht, Zeilen getrimmt, leere entfallen.
 * @param text - Eintrag
 * @returns Zeilen mit `\n` verbunden
 */
export function normalisiereEintrag(text: string): string {
  return text
    .split(/\r\n|\r|\n/)
    .map((zeile) => zeile.trim())
    .filter((zeile) => zeile !== '')
    .join('\n')
}

/**
 * Normalisiert einen Fließtext (Ziel, Problem): Zeilenenden vereinheitlicht, außen getrimmt, innere Leerzeilen bleiben.
 * @param text - Text
 * @returns normalisierter Text
 */
export function normalisiereZiel(text: string): string {
  return text.replace(/\r\n|\r/g, '\n').trim()
}

/**
 * Prüft ein Textfeld der Akte (PUT und POST, Advisor B5/C2).
 * @param feld - Name für die Meldung
 * @param text - Rohwert
 * @param art - 'fliesstext' (Ziel, Problem: keine Zeile `##`) | 'eintrag' (Listeneintrag: kein Checkbox-Präfix — der Leser
 *   entfernte es) | 'ak' (AK-Text: hinter `AK<n>: ` entfernt der Leser keine Checkbox) | 'zeile' (einzeilig, nicht mit `#` oder
 *   `Status:` beginnend)
 * @returns Grund oder null
 */
export function pruefeAkteText(feld: string, text: unknown, art: 'fliesstext' | 'eintrag' | 'ak' | 'zeile'): string | null {
  if (typeof text !== 'string') return `'${feld}' muss ein String sein`
  if (enthaeltSteuerzeichen(text)) return `'${feld}' enthält ein Steuerzeichen`
  const normal = art === 'fliesstext' ? normalisiereZiel(text) : normalisiereEintrag(text)
  if (normal === '') return `'${feld}' ist leer`
  if (art === 'fliesstext' && normal.split('\n').some((zeile) => UEBERSCHRIFT_ZEILE_MUSTER.test(zeile))) return `'${feld}' enthält eine Zeile, die mit '##' beginnt (sie würde einen neuen Abschnitt öffnen)`
  if (art === 'eintrag' && CHECKBOX_PRAEFIX_MUSTER.test(normal)) return `'${feld}' beginnt mit einer Checkbox ('[ ] '/'[x] ') — der Leser entfernte sie`
  if (art === 'zeile' && /[\r\n]/.test(text.trim())) return `'${feld}' muss einzeilig sein`
  if (art === 'zeile' && ZEILE_UNZULAESSIG_MUSTER.test(normal)) return `'${feld}' darf nicht mit '#' oder 'Status:' beginnen`
  return null
}

/**
 * Zeilen eines Listeneintrags: erste Zeile mit Präfix, Folgezeilen mit zwei Leerzeichen eingerückt.
 * @param praefix - z. B. '- ' oder '- AK3: '
 * @param text - Eintrag (wird normalisiert)
 * @returns Zeilen ohne Zeilenende
 */
export function baueBulletZeilen(praefix: string, text: string): string[] {
  const [erste, ...rest] = normalisiereEintrag(text).split('\n')
  return [`${praefix}${erste}`, ...rest.map((zeile) => `  ${zeile}`)]
}

/**
 * Das Zeilenende der Datei: das erste vorkommende.
 * @param inhalt - Dateitext
 * @returns '\r\n' oder '\n' (ohne Zeilenende: '\n')
 */
export function erkenneZeilenende(inhalt: string): '\r\n' | '\n' {
  const index = inhalt.indexOf('\n')
  return index > 0 && inhalt[index - 1] === '\r' ? '\r\n' : '\n'
}

/**
 * Prüft und normalisiert den Körper von PUT …/features/<id>/akte (genau { ziel, nicht_ziele, akzeptanzkriterien, grund, hash }).
 * @param daten - geparster Körper
 * @returns { ok: true, aenderung, hash } oder { ok: false, grund } (HTTP 400)
 */
export function pruefeAkteAenderung(daten: unknown): AkteAenderungPruefung {
  const fehler = (grund: string): AkteAenderungPruefung => ({ ok: false, grund })
  if (daten === null || typeof daten !== 'object' || Array.isArray(daten)) return fehler('Body muss ein JSON-Objekt { ziel, nicht_ziele, akzeptanzkriterien, grund, hash } sein')
  const obj = daten as Record<string, unknown>
  const erlaubt = ['ziel', 'nicht_ziele', 'akzeptanzkriterien', 'grund', 'hash']
  const fremd = Object.keys(obj).filter((k) => !erlaubt.includes(k))
  if (fremd.length > 0) return fehler(`unbekannte Felder: ${fremd.slice(0, 5).join(', ')} — erlaubt sind ${erlaubt.join(', ')}`)
  const fehlend = erlaubt.filter((k) => !(k in obj))
  if (fehlend.length > 0) return fehler(`Felder fehlen: ${fehlend.join(', ')}`)

  if (typeof obj.grund !== 'string' || obj.grund.trim() === '') return fehler("'grund' fehlt oder ist leer — jede Änderung braucht eine Begründung")
  if (enthaeltSteuerzeichen(obj.grund)) return fehler("'grund' enthält ein Steuerzeichen")
  const grund = obj.grund.replace(/\s+/g, ' ').trim()
  if (grund.length > AKTE_GRUND_OBERGRENZE) return fehler(`'grund' ist länger als ${AKTE_GRUND_OBERGRENZE} Zeichen`)
  if (typeof obj.hash !== 'string' || !SHA256_MUSTER.test(obj.hash)) return fehler("'hash' muss ein sha256 (64 Hex-Zeichen, klein) sein — der Hash der gelesenen Akte")

  const zielFehler = pruefeAkteText('ziel', obj.ziel, 'fliesstext')
  if (zielFehler !== null) return fehler(zielFehler)

  if (!Array.isArray(obj.nicht_ziele) || obj.nicht_ziele.length > AKTE_LISTE_OBERGRENZE) return fehler(`'nicht_ziele' muss eine Liste mit höchstens ${AKTE_LISTE_OBERGRENZE} Einträgen sein`)
  for (const [index, eintrag] of obj.nicht_ziele.entries()) {
    const f = pruefeAkteText(`nicht_ziele[${index}]`, eintrag, 'eintrag')
    if (f !== null) return fehler(f)
  }

  const aks = obj.akzeptanzkriterien
  if (!Array.isArray(aks) || aks.length === 0 || aks.length > AKTE_LISTE_OBERGRENZE) return fehler(`'akzeptanzkriterien' muss eine Liste mit 1 bis ${AKTE_LISTE_OBERGRENZE} Einträgen sein`)
  const ids = new Set<string>()
  const akzeptanzkriterien: FeatureAuftragAkzeptanzkriterium[] = []
  for (const [index, ak] of aks.entries()) {
    if (ak === null || typeof ak !== 'object' || Array.isArray(ak)) return fehler(`akzeptanzkriterien[${index}] muss ein Objekt { id, text } sein`)
    const akObj = ak as Record<string, unknown>
    if (Object.keys(akObj).some((k) => k !== 'id' && k !== 'text')) return fehler(`akzeptanzkriterien[${index}]: erlaubt sind nur id und text`)
    if (typeof akObj.id !== 'string' || !AK_ID_MUSTER.test(akObj.id)) return fehler(`akzeptanzkriterien[${index}].id muss dem Muster ^AK[0-9]+$ entsprechen`)
    if (ids.has(akObj.id)) return fehler(`akzeptanzkriterien: ID '${akObj.id}' ist doppelt`)
    ids.add(akObj.id)
    const f = pruefeAkteText(`akzeptanzkriterien[${index}].text`, akObj.text, 'ak')
    if (f !== null) return fehler(f)
    akzeptanzkriterien.push({ id: akObj.id, text: normalisiereEintrag(akObj.text as string) })
  }

  return {
    ok: true,
    hash: obj.hash,
    aenderung: {
      ziel: normalisiereZiel(obj.ziel as string),
      nicht_ziele: (obj.nicht_ziele as string[]).map(normalisiereEintrag),
      akzeptanzkriterien,
      grund,
    },
  }
}

/** Ein bearbeitbarer Abschnitt: Name (Überschrift und Meldung) und wie er gelesen bzw. geschrieben wird. */
interface AbschnittRegel {
  name: string
  liste: boolean
  /** gelesener Wert aus dem Abschnittstext (null = nicht lesbar) */
  lies: (koerper: string | null) => unknown
  /** Wert aus der Änderung */
  wert: (a: AkteAenderung) => unknown
  /** Inhaltszeilen ohne Zeilenende */
  zeilen: (a: AkteAenderung) => string[]
  /** fehlt der Abschnitt und ist dieser Wert leer, wird er nicht angelegt */
  leer: (a: AkteAenderung) => boolean
}

const ABSCHNITTE: AbschnittRegel[] = [
  {
    name: 'Ziel',
    liste: false,
    lies: (k) => (k === null ? null : normalisiereZiel(k)),
    wert: (a) => a.ziel,
    zeilen: (a) => a.ziel.split('\n'),
    leer: () => false,
  },
  {
    name: 'Nicht-Ziele',
    liste: true,
    // Altwerte wie die Anfrage normalisiert (qa 1): sonst gälte ein unveränderter Eintrag mit Leerzeichen am Zeilenende als geändert.
    lies: (k) => (k === null ? [] : leseTopLevelBullets(k).map(normalisiereEintrag)),
    wert: (a) => a.nicht_ziele,
    zeilen: (a) => (a.nicht_ziele.length === 0 ? ['keine'] : a.nicht_ziele.flatMap((e) => baueBulletZeilen('- ', e))),
    leer: (a) => a.nicht_ziele.length === 0,
  },
  {
    name: 'Akzeptanzkriterien',
    liste: true,
    lies: (k) => {
      const ak = leseAkzeptanzkriterien(k)
      return ak.ok ? ak.akzeptanzkriterien.map((eintrag) => ({ id: eintrag.id, text: normalisiereEintrag(eintrag.text) })) : null
    },
    wert: (a) => a.akzeptanzkriterien,
    zeilen: (a) => a.akzeptanzkriterien.flatMap((ak) => baueBulletZeilen(`- ${ak.id}: `, ak.text)),
    leer: () => false,
  },
]

/** Eine Textänderung an der Originalfassung: [start, ende) wird durch text ersetzt (ende = start: Einfügen). */
interface Ersetzung {
  start: number
  ende: number
  text: string
}

/**
 * Beginn des Körpers: nach dem Zeilenumbruch der Überschriftzeile. kopfEnde liegt vor `\r\n` bzw. `\n` — in JS trifft `.`
 * kein `\r`, und `$` mit `m`-Flag greift auch vor `\r` (code-reviewer V2).
 * @param inhalt - Dateitext
 * @param kopfEnde - Ende des Überschrift-Treffers
 * @returns Index, oder kopfEnde, wenn die Überschrift die letzte Zeile ohne Zeilenende ist
 */
function koerperStart(inhalt: string, kopfEnde: number): number {
  if (inhalt[kopfEnde] === '\n') return kopfEnde + 1
  if (inhalt[kopfEnde] === '\r' && inhalt[kopfEnde + 1] === '\n') return kopfEnde + 2
  return kopfEnde
}

/**
 * A3: Zeilen eines Listenabschnitts, die der Schreiber nicht verlustfrei ersetzen kann — Text in Spalte 0 außerhalb eines
 * Punkts, und eingerückte Zeilen VOR dem ersten Punkt (der Leser verwirft sie, qa 2).
 * @param koerper - Abschnittstext (ab dem Ende der Überschriftzeile)
 * @returns erste unzulässige Zeile (getrimmt, gekürzt) oder null
 */
function unzulaessigeListenZeile(koerper: string): string | null {
  let imPunkt = false
  for (const zeile of koerper.split(/\r\n|\n/)) {
    const leer = zeile.trim() === ''
    if (BULLET_EINLEITUNG_MUSTER.test(zeile)) imPunkt = true
    else if (!(leer || LEER_ZEILEN.has(zeile.trim()) || (imPunkt && /^[ \t]/.test(zeile)))) return zeile.trim().slice(0, 80)
  }
  return null
}

/**
 * Einfügepunkt hinter der letzten nicht-leeren Zeile eines Bereichs (vor deren Zeilenende) — Rückwärts-Scan, linear.
 * @param inhalt - Dateitext
 * @param von - Beginn des Bereichs
 * @param bis - Ende des Bereichs (exklusiv)
 * @returns Index oder null, wenn der Bereich nur Leerraum trägt
 */
function hinterLetzterZeile(inhalt: string, von: number, bis: number): number | null {
  let i = bis
  while (i > von && /\s/.test(inhalt[i - 1])) i -= 1
  if (i === von) return null
  // Bis zum Zeilenende vorrücken, damit Leerzeichen am Ende der letzten Zeile vor der Einfügung bleiben.
  while (i < bis && inhalt[i] !== '\r' && inhalt[i] !== '\n') i += 1
  return i
}

/**
 * Wendet Ersetzungen auf die Originalfassung an — von hinten, damit die Indizes stimmen. Gleicher Start (Einfügungen an
 * derselben Stelle, z. B. leerer Körper direkt vor '## Änderungen'): die später angelegte zuerst, sie landet dahinter —
 * so bleibt die Reihenfolge des Anlegens die Reihenfolge im Text.
 * @param inhalt - Originaltext
 * @param ersetzungen - nicht überlappende Ersetzungen in der gewünschten Textreihenfolge
 * @returns neuer Text
 */
function wendeAn(inhalt: string, ersetzungen: Ersetzung[]): string {
  let text = inhalt
  const geordnet = ersetzungen.map((e, rang) => ({ ...e, rang })).sort((a, b) => b.start - a.start || b.rang - a.rang)
  for (const e of geordnet) text = text.slice(0, e.start) + e.text + text.slice(e.ende)
  return text
}

/**
 * Bearbeitet eine Feature-Akte (Regeln im Dateikopf). Rein, kein I/O, wirft nicht.
 * @param inhalt - aktueller Dateitext (bereits als gültiges UTF-8 gelesen)
 * @param featureId - Ordner-id (für die Rundlauf-Probe)
 * @param aenderung - normalisierte Änderung (pruefeAkteAenderung)
 * @param datum - Datum der Änderungszeile (JJJJ-MM-TT)
 * @returns { ok: true, inhalt, geaendert } | { ok: false, grund, verstoesse? } (HTTP 422, nichts schreiben)
 */
export function bearbeiteFeatureAkte(inhalt: string, featureId: string, aenderung: AkteAenderung, datum: string): AkteBearbeitung {
  const status = leseFeatureStatus(inhalt)
  if (status !== null && STATUS_NICHT_BEARBEITBAR.has(status)) return { ok: false, grund: `Feature-Status '${status}' — abgeschlossene oder abgebrochene Akten werden im Leitstand nicht mehr bearbeitet (C15)` }

  const eol = erkenneZeilenende(inhalt)
  const mitEol = (zeilen: string[]) => zeilen.map((z) => z + eol).join('')
  // Exakte Überschrift (qa 6): „## Änderungen gegenüber v1“ ist ein anderer Abschnitt.
  const aenderungen = findeAbschnitt(inhalt, 'Änderungen', true)
  // Vorher-Stand des Gates (qa 5): ein Verstoß, den die Bearbeitung nicht verursacht, wird als solcher gemeldet.
  const verstoesseVorher = pruefeFeatureAkteInhalt(inhalt)
  const ersetzungen: Ersetzung[] = []
  const fehlendeBloecke: string[] = []
  const geaendert: string[] = []

  for (const regel of ABSCHNITTE) {
    const spanne = findeAbschnitt(inhalt, regel.name)
    const alt = regel.lies(spanne === null ? null : inhalt.slice(spanne.kopfEnde, spanne.koerperEnde))
    if (JSON.stringify(alt) === JSON.stringify(regel.wert(aenderung))) continue
    if (spanne === null) {
      if (regel.leer(aenderung)) continue
      geaendert.push(regel.name)
      fehlendeBloecke.push(mitEol([`## ${regel.name}`, ...regel.zeilen(aenderung), '']))
      continue
    }
    if (regel.liste) {
      const zeile = unzulaessigeListenZeile(inhalt.slice(spanne.kopfEnde, spanne.koerperEnde))
      if (zeile !== null) return { ok: false, grund: `Abschnitt '## ${regel.name}' enthält Text außerhalb der Liste („${zeile}“) — von Hand bereinigen, dann erneut speichern (A3)` }
    }
    geaendert.push(regel.name)
    const start = koerperStart(inhalt, spanne.kopfEnde)
    const fuehrendLeer = /^[ \t]*\r?\n/.test(inhalt.slice(start, spanne.koerperEnde))
    const folgtUeberschrift = spanne.koerperEnde < inhalt.length
    const text = (start === spanne.kopfEnde && start === inhalt.length ? eol : '') + (fuehrendLeer ? eol : '') + mitEol(regel.zeilen(aenderung)) + (folgtUeberschrift ? eol : '')
    ersetzungen.push({ start, ende: spanne.koerperEnde, text })
  }

  if (geaendert.length === 0) return { ok: false, grund: 'Keine Änderung an Ziel, Nicht-Zielen oder Akzeptanzkriterien — nichts geschrieben' }

  const aenderungsZeile = `- ${datum} · ${geaendert.join(', ')} · ${aenderung.grund}`
  if (aenderungen === null) {
    // Abschnitt fehlt: am Dateiende anlegen, fehlende Abschnitte davor.
    // Endet die Datei ohne Zeilenende, fehlt es vor der Leerzeile — außer ein ersetzter letzter Abschnitt bringt es schon mit.
    const endetMitZeilenende = inhalt.length === 0 || inhalt.endsWith('\n') || ersetzungen.some((e) => e.ende === inhalt.length && e.text.endsWith('\n'))
    const vorlauf = endetMitZeilenende ? '' : eol
    ersetzungen.push({ start: inhalt.length, ende: inhalt.length, text: `${vorlauf}${eol}${fehlendeBloecke.join('')}${mitEol(['## Änderungen', aenderungsZeile])}` })
  } else {
    if (fehlendeBloecke.length > 0) ersetzungen.push({ start: aenderungen.kopfStart, ende: aenderungen.kopfStart, text: fehlendeBloecke.join('') })
    // Hinter der letzten nicht-leeren Zeile des Abschnitts (vor deren Zeilenende), sonst hinter der Überschrift.
    const punkt = hinterLetzterZeile(inhalt, aenderungen.kopfEnde, aenderungen.koerperEnde) ?? aenderungen.kopfEnde
    ersetzungen.push({ start: punkt, ende: punkt, text: `${eol}${aenderungsZeile}` })
  }

  const neu = wendeAn(inhalt, ersetzungen)

  // Rundlauf-Probe (Advisor B5): genau die normalisierten Werte, Status unverändert, Gate bestanden.
  const gelesen = leseFeatureAkteAnzeige(neu, featureId)
  const verstoesse = pruefeFeatureAkteInhalt(neu)
  if (verstoesse.length > 0) {
    const schonVorher = verstoesse.every((v) => verstoesseVorher.includes(v))
    const grund = schonVorher ? 'Die Akte besteht das Feature-Akte-Gate schon vor der Bearbeitung nicht — die Verstöße in der Akte von Hand beheben, dann erneut speichern' : 'Die bearbeitete Akte bestünde das Feature-Akte-Gate nicht — nichts geschrieben'
    return { ok: false, grund, verstoesse }
  }
  const gleich =
    gelesen.ok &&
    normalisiereZiel(gelesen.ziel) === aenderung.ziel &&
    JSON.stringify(gelesen.nicht_ziele.map(normalisiereEintrag)) === JSON.stringify(aenderung.nicht_ziele) &&
    JSON.stringify(gelesen.akzeptanzkriterien.map((ak) => ({ id: ak.id, text: normalisiereEintrag(ak.text) }))) === JSON.stringify(aenderung.akzeptanzkriterien) &&
    leseFeatureStatus(neu) === status
  if (!gleich) return { ok: false, grund: `Die bearbeitete Akte liest sich nicht wie angefragt (${gelesen.ok ? 'Werte oder Status abweichend' : gelesen.grund}) — nichts geschrieben` }
  return { ok: true, inhalt: neu, geaendert }
}
