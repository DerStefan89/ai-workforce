/**
 * Datei: public/leitstand/live-daten.js
 *
 * Zweck: Reine Datenfunktionen der Live-Ansicht (F46 D5, docs/design/abgleich-f46.md §4.9; Bilder
 * 08-live--Main und --Main-nichts-laeuft): Filter der Aktivität, Zuordnung eines Laufs zu seinem
 * Workflow-Schritt, Ablaufleiste Plan · Freigabe · Bau · Prüfschritt · Review (Sichern und Merge
 * „kommt“), Laufzeit und Zeitgrenze, Dauer eines beendeten Laufs, „Als Nächstes“ im Zustand „nichts
 * läuft“. Nichts hier rät: fehlt eine Quelle, liefern die Funktionen null bzw. den Status 'ohne'.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/live.js (Anzeige und Bedienung der Live-Teile)
 * - public/leitstand/views/live-anzeige.js (Render)
 * - public/leitstand/live-daten.test.mjs (node:test)
 *
 * Wichtig: Import-sicher (kein DOM, kein Netz).
 */

import { baueEntscheidungen } from './attention-daten.js'

/** Filter der Aktivität in Anzeige-Reihenfolge; 'warnungen' hat keine Quelle (kommt). */
export const AKTIVITAET_FILTER = Object.freeze(['alle', 'aendert', 'befehl', 'faehigkeit', 'warnungen'])

/** Filter ohne Quelle (Bremsen & Warnungen liefert das Gateway heute nicht, §4.9). */
export const KOMMT_FILTER = Object.freeze(new Set(['warnungen']))

/**
 * Einträge der Aktivität nach Filter.
 * @param eintraege - aktivitaet.eintraege (neueste zuerst) oder etwas anderes
 * @param filter - einer der AKTIVITAET_FILTER
 * @returns gefilterte Liste (leer ohne Einträge oder bei einem Filter ohne Quelle)
 */
export function filtereAktivitaet(eintraege, filter) {
  if (!Array.isArray(eintraege)) return []
  if (filter === 'alle') return eintraege
  if (KOMMT_FILTER.has(filter)) return []
  return eintraege.filter((e) => e?.art === filter)
}

/**
 * Stabiler Schlüssel eines Aktivitätseintrags (für die Auswahl „Mehr dazu“ über Ticks hinweg).
 * @param eintrag - { zeit, werkzeug, ziel }
 * @returns Schlüssel
 */
export function eintragSchluessel(eintrag) {
  return `${eintrag?.zeit ?? ''}|${eintrag?.werkzeug ?? ''}|${eintrag?.ziel ?? ''}`
}

/**
 * Minuten zwischen zwei Zeitpunkten (abgerundet, nie negativ).
 * @param vonIso - ISO-Zeitstempel
 * @param bisMs - Zeitpunkt in ms (Date.now())
 * @returns Minuten, oder null bei ungültigem Zeitstempel
 */
export function minutenSeit(vonIso, bisMs) {
  const von = typeof vonIso === 'string' ? Date.parse(vonIso) : Number.NaN
  if (Number.isNaN(von) || typeof bisMs !== 'number') return null
  return Math.max(0, Math.floor((bisMs - von) / 60000))
}

/**
 * Start eines Laufs: der früheste gültige Checkpoint-Zeitstempel.
 * @param checkpoints - detail.checkpoints
 * @returns ISO-Zeitstempel oder null
 */
export function laufStart(checkpoints) {
  const zeiten = gueltigeZeiten(checkpoints)
  return zeiten.length === 0 ? null : zeiten[0]
}

/**
 * Dauer eines Laufs in Minuten: vom frühesten bis zum spätesten gültigen Checkpoint.
 * @param checkpoints - detail.checkpoints
 * @returns Minuten oder null, wenn weniger als zwei Zeitpunkte bekannt sind
 */
export function laufDauerMinuten(checkpoints) {
  const zeiten = gueltigeZeiten(checkpoints)
  if (zeiten.length < 2) return null
  return minutenSeit(zeiten[0], Date.parse(zeiten.at(-1)))
}

/** @param checkpoints - detail.checkpoints @returns aufsteigend sortierte, gültige ISO-Zeitstempel */
function gueltigeZeiten(checkpoints) {
  if (!Array.isArray(checkpoints)) return []
  return checkpoints
    .filter((cp) => cp?.gueltig !== false && typeof cp?.zeitstempel === 'string' && !Number.isNaN(Date.parse(cp.zeitstempel)))
    .map((cp) => cp.zeitstempel)
    .sort((a, b) => Date.parse(a) - Date.parse(b))
}

/**
 * Zeitgrenze eines laufenden Laufs und ihr Rest.
 * @param startIso - Start des Laufs (laufStart)
 * @param zeitgrenzeMs - schritt.zeitgrenze_ms bzw. detail.startvorlageZeitgrenzeMs, oder null
 * @param jetztMs - Date.now()
 * @returns { grenzeMinuten, restMinuten, anteil (0–1) } oder null ohne Grenze bzw. Start
 */
export function zeitgrenzeStand(startIso, zeitgrenzeMs, jetztMs) {
  if (typeof zeitgrenzeMs !== 'number' || !Number.isFinite(zeitgrenzeMs) || zeitgrenzeMs <= 0) return null
  const gelaufen = minutenSeit(startIso, jetztMs)
  if (gelaufen === null) return null
  const grenzeMinuten = Math.round(zeitgrenzeMs / 60000)
  const verstrichenMs = Math.max(0, jetztMs - Date.parse(startIso))
  return {
    grenzeMinuten,
    restMinuten: Math.max(0, Math.ceil((zeitgrenzeMs - verstrichenMs) / 60000)),
    anteil: Math.min(1, verstrichenMs / zeitgrenzeMs),
  }
}

/**
 * Sucht den Workflow-Schritt, der diesen Lauf gestartet hat.
 * @param workflowDetails - geladene GET /api/workflows/<id>-Antworten ({ workflowId, daten: { schritte } })
 * @param laufId - Kennung des Laufs
 * @returns { workflow, schritt } oder null
 */
export function findeLaufSchritt(workflowDetails, laufId) {
  if (!Array.isArray(workflowDetails) || typeof laufId !== 'string') return null
  for (const workflow of workflowDetails) {
    const schritte = Array.isArray(workflow?.daten?.schritte) ? workflow.daten.schritte : []
    const schritt = schritte.find((s) => s?.lauf_id === laufId)
    if (schritt !== undefined) return { workflow, schritt }
  }
  return null
}

/**
 * Welche Workflows für die Zuordnung eines Laufs in Frage kommen: solange der Lauf aktiv ist, zuerst die
 * laufenden (der Workflow des aktiven Laufs darf nie hinter der Grenze landen — sonst fiele der Stopp mit
 * Pflichtbegründung weg), dann die mit derselben auftragId. Höchstens `max` (Last begrenzt).
 * @param workflows - zustand.workflows
 * @param auftragId - auftragsbezug.auftragId des Laufs oder null
 * @param aktiv - true, wenn der Lauf gerade läuft
 * @param max - Höchstzahl
 * @returns workflowIds
 */
export function kandidatenWorkflows(workflows, auftragId, aktiv, max = 3) {
  if (!Array.isArray(workflows)) return []
  const ids = []
  const nimm = (w) => {
    if (typeof w?.workflowId === 'string' && !ids.includes(w.workflowId)) ids.push(w.workflowId)
  }
  if (aktiv) for (const w of workflows) if (w?.status === 'LAEUFT') nimm(w)
  if (typeof auftragId === 'string' && auftragId !== '') for (const w of workflows) if (w?.auftragId === auftragId) nimm(w)
  return ids.slice(0, max)
}

/** Schritt-Rolle → Stufe der Ablaufleiste (wie KREIS_ROLLE_JE_SCHRITT_ROLLE im Rollen-Kreis). */
const STUFE_JE_ROLLE = Object.freeze({ architekt: 'plan', 'architecture-advisor': 'plan', ausfuehrung: 'bau', 'code-reviewer': 'review' })

/** Erledigte Schrittstatus. */
const ERLEDIGT = new Set(['ERFOLGREICH', 'UEBERSPRUNGEN'])

/** Gescheiterte Schrittstatus. */
const GESCHEITERT = new Set(['FEHLGESCHLAGEN', 'VERWEIGERT'])

/**
 * Status einer Stufe aus ihren Schritten.
 * @param schritte - Schritte der Stufe
 * @returns 'ohne' | 'jetzt' | 'fertig' | 'fehler' | 'offen'
 */
function stufenStatus(schritte) {
  if (schritte.length === 0) return 'ohne'
  if (schritte.some((s) => s.status === 'LAEUFT')) return 'jetzt'
  if (schritte.every((s) => ERLEDIGT.has(s.status)) && schritte.some((s) => s.status === 'ERFOLGREICH')) return 'fertig'
  if (schritte.some((s) => GESCHEITERT.has(s.status))) return 'fehler'
  return 'offen'
}

/**
 * Die Ablaufleiste (Abgleich §4.9): Plan · Freigabe · Bau · Prüfschritt · Review aus den
 * Workflow-Schritten; Sichern und Merge sind „kommt“.
 * - Freigabe: die Freigabe des Bau-Schritts — wartet er auf Freigabe, ist sie 'jetzt'; ist er
 *   gestartet, 'fertig'; ist seine Freigabe AUTOMATISCH, 'ohne'.
 * - Prüfschritt: aus pruefergebnis (GET /api/workflows/<id>): GRUEN 'fertig', sonst ok 'fehler';
 *   ohne Ergebnis 'offen'.
 * @param schritte - workflow.daten.schritte oder null ohne Workflow
 * @param pruefergebnis - workflow.pruefergebnis oder null
 * @returns [{ id, status }] — status 'ohne' | 'jetzt' | 'fertig' | 'fehler' | 'offen' | 'kommt'
 */
export function ablaufStufen(schritte, pruefergebnis = null) {
  const liste = Array.isArray(schritte) ? schritte.filter((s) => s !== null && typeof s === 'object') : []
  const jeStufe = (stufe) => liste.filter((s) => STUFE_JE_ROLLE[s.rolle] === stufe)
  const bau = jeStufe('bau')
  let freigabe = 'ohne'
  const pflicht = bau.filter((s) => s.freigabe !== 'AUTOMATISCH')
  if (pflicht.length > 0) {
    if (pflicht.some((s) => s.status === 'WARTET_FREIGABE')) freigabe = 'jetzt'
    else if (pflicht.every((s) => s.status === 'OFFEN')) freigabe = 'offen'
    else freigabe = 'fertig'
  }
  let pruefung = bau.length === 0 ? 'ohne' : 'offen'
  if (pruefergebnis?.status === 'ok') pruefung = pruefergebnis.ergebnis === 'GRUEN' ? 'fertig' : 'fehler'
  return [
    { id: 'plan', status: stufenStatus(jeStufe('plan')) },
    { id: 'freigabe', status: freigabe },
    { id: 'bau', status: stufenStatus(bau) },
    { id: 'pruefschritt', status: pruefung },
    { id: 'review', status: stufenStatus(jeStufe('review')) },
    { id: 'sichern', status: 'kommt' },
    { id: 'merge', status: 'kommt' },
  ]
}

/**
 * „Output bisher“: die Schritte des Workflows, die begonnen haben oder fertig sind, in Reihenfolge.
 * @param schritte - workflow.daten.schritte oder null
 * @returns Schritte (Status nicht OFFEN/WARTET_FREIGABE)
 */
export function outputSchritte(schritte) {
  if (!Array.isArray(schritte)) return []
  return schritte.filter((s) => s !== null && typeof s === 'object' && s.status !== 'OFFEN' && s.status !== 'WARTET_FREIGABE')
}

/**
 * „Als Nächstes“ im Zustand „nichts läuft“: zuerst die nächste offene Entscheidung (dieselbe Regel
 * und Reihenfolge wie #/attention, baueEntscheidungen), sonst der nächste startbereite
 * Workflow-Schritt (Automaten-Verdikt naechster.art 'starte').
 * @param zustand - Aggregat aus dem Poll
 * @returns { art: 'entscheidung', eintrag } | { art: 'schritt', workflow } | null
 */
export function waehleAlsNaechstes(zustand) {
  if (zustand === null || typeof zustand !== 'object') return null
  const { eintraege } = baueEntscheidungen(zustand, [])
  const entscheidung = eintraege.find((e) => e.art !== 'befund') ?? null
  if (entscheidung !== null) return { art: 'entscheidung', eintrag: entscheidung }
  const workflow = Array.isArray(zustand.workflows) ? (zustand.workflows.find((w) => w?.naechster?.art === 'starte') ?? null) : null
  return workflow === null ? null : { art: 'schritt', workflow }
}
