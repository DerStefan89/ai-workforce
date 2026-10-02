/**
 * Datei: public/leitstand/views/live.js
 *
 * Zweck: Live-Teile der Lauf-Seite und der Zustand „Die Workforce wartet“ (F46 D5,
 * docs/design/abgleich-f46.md §4.9; Bilder 08-live--Main und --Main-nichts-laeuft). views/runs.js
 * besitzt die Seite, lädt das Lauf-Detail und ruft zeichneLive nach jedem Laden; dieses Modul
 * ergänzt Kopf-Chips, „Gerade“, Status-Block, Ablaufleiste, Aktivität, „Mehr dazu“, Berührte Dateien,
 * Bremsen & Warnungen, Fähigkeiten, Output und „Was der Builder bekommen hat“, dazu Zuletzt/Als
 * Nächstes für #/live ohne aktiven Lauf.
 *
 * Daten: das Lauf-Detail (von runs.js), das Poll-Aggregat (abonniere, zustand.js) und — einmal je
 * Workflow-Version — GET /api/workflows/<id> für die Zuordnung Lauf → Workflow-Schritt (Rolle,
 * Worker, Modell, Werkzeugsatz, Zeitgrenze, Ablaufleiste, Output). Dazu einmal je Projekt die
 * Aufträge für „Zum Eintrag“ und einmal je letztem Lauf dessen Detail für die Dauer. Kein Timer,
 * kein eigener Poll; fetch nur über api.js.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/runs.js (initLive, zeichneLive, zeigeWartet, abbruchArt, workflowZuLauf,
 *   raeumeLive)
 *
 * Wichtig:
 * - Ein Poll-Tick ersetzt Aktivität und Karten nur bei geändertem HTML; die Auswahl („Mehr dazu“) und
 *   der Fokus bleiben über den Schlüssel erhalten; „Mehr dazu“ wird nur bei anderer Auswahl neu gezeichnet
 *   (eine getippte Frage bleibt stehen).
 * - Antworten zu einem inzwischen anderen Lauf oder Projekt werden verworfen.
 * - „Frag Jarvis dazu“ befüllt nur die Chat-Eingabe (oeffneChatMitEntwurf) — es sendet nichts.
 */

import { holeAuftraegeBegrenzt, holeLaufDetail, holeWorkflowDetail } from '../api.js'
import { baueReferenzJeAuftrag } from '../attention-daten.js'
import { oeffneChatMitEntwurf } from '../chat-dock.js'
import { t, tHtml } from '../i18n.js'
import { waehleLetztenLauf } from '../fokus-daten.js'
import { ablaufStufen, eintragSchluessel, findeLaufSchritt, kandidatenWorkflows, laufDauerMinuten, laufStart, waehleAlsNaechstes, zeitgrenzeStand } from '../live-daten.js'
import { abonniereProjektWechsel } from '../projekt-kontext.js'
import { abonniere } from '../zustand.js'
import { escapeHtml } from '../render.js'
import { laufStatusBadge, laufStatusPunkt, statusText } from './lauf-detail.js'
import {
  baueJarvisEntwurf,
  renderAblaufleiste,
  renderAktivitaet,
  renderAlsNaechstes,
  renderBeruehrteDateien,
  renderBremsen,
  renderBuilderPaket,
  renderFremderLauf,
  renderFaehigkeitenKarte,
  renderGerade,
  renderKopfChips,
  renderMehrDazu,
  renderOutput,
  renderStatusBlock,
  renderZuletzt,
} from './live-anzeige.js'

/** Ton des Status-Blocks je Kategorie des Statuspunkts (laufStatusPunkt). */
const STATUS_TON = Object.freeze({ ok: 'aktiv', fehler: 'offen', warten: 'warten', neutral: 'neutral' })

/** Letztes Poll-Aggregat (oder null vor dem ersten Tick). */
let letzterZustand = null

/** Geladene Workflow-Details: workflowId → { versionSequenz, detail }. */
const workflowCache = new Map()

/** Zuordnung laufId → { workflow, schritt } | null (kein Workflow) — undefined, solange offen. */
const zuordnung = new Map()

/** true, solange eine Zuordnung lädt (genau eine zur Zeit). */
let zuordnungLaeuft = false

/** Map auftragId → workitem_referenz (für „Zum Eintrag“), null solange nicht geladen. */
let referenzJeAuftrag = null

/** true, sobald die Aufträge für dieses Projekt angefragt wurden. */
let referenzAngefragt = false

/** Der zuletzt gezeichnete Lauf: { laufId, detail, stand } oder null. */
let letzteZeichnung = null

/** Bedienzustand: Filter und gewählter Eintrag (Schlüssel) je Lauf. */
let bedienung = { laufId: null, filter: 'alle', gewaehlt: null }

/** Zuletzt geschriebenes HTML je Container (ein Tick schreibt nur bei Änderung). */
const geschrieben = new Map()

/** Dauer des letzten Laufs für „Zuletzt“: { laufId, dauerMinuten } oder null; angefragt je laufId einmal. */
let zuletztDauer = null
let zuletztAngefragt = null

/** Generation (Projektwechsel) — späte Antworten einer älteren Generation werden verworfen. */
let generation = 0

/**
 * Schreibt HTML in einen Container, nur bei Änderung; der Fokus bleibt auf dem Element mit demselben
 * data-Schlüssel (Filter, Eintrag, Frage), sonst auf dem Container.
 * @param id - Element-ID
 * @param html - neues HTML
 */
function schreibe(id, html) {
  if (geschrieben.get(id) === html) return
  const element = document.getElementById(id)
  if (element === null) return
  const aktiv = element.contains(document.activeElement) ? document.activeElement : null
  const merkmal = aktiv === null ? null : ['liveEintrag', 'liveFilter', 'liveFrage', 'liveAktion', 'aktion'].find((k) => aktiv.dataset?.[k] !== undefined)
  const wert = merkmal ? aktiv.dataset[merkmal] : null
  element.innerHTML = html
  geschrieben.set(id, html)
  if (merkmal) {
    const attribut = merkmal.replace(/[A-Z]/g, (b) => `-${b.toLowerCase()}`)
    const ziel = [...element.querySelectorAll(`[data-${attribut}]`)].find((el) => el.dataset[merkmal] === wert)
    if (ziel) ziel.focus({ preventScroll: true })
    else if (element.hasAttribute('tabindex')) element.focus({ preventScroll: true })
  }
}

// ─── Zuordnung Lauf → Workflow-Schritt ──────────────────────────────────────

/**
 * Lädt (nur bei neuer Workflow-Version) die in Frage kommenden Workflows und ordnet den Lauf seinem
 * Schritt zu; danach wird neu gezeichnet. Ein Fehler lässt die Zuordnung offen (nächster Tick).
 * @param laufId - Kennung
 * @param detail - Lauf-Detail
 */
async function ordneZu(laufId, detail) {
  if (zuordnungLaeuft || letzterZustand === null) return
  const workflows = Array.isArray(letzterZustand.workflows) ? letzterZustand.workflows : []
  const ids = kandidatenWorkflows(workflows, detail.auftrag?.status === 'ok' ? detail.auftrag.auftragId : null, detail.aktiv === true)
  const veraltet = ids.filter((id) => workflowCache.get(id)?.versionSequenz !== workflows.find((w) => w.workflowId === id)?.versionSequenz)
  const bekannt = zuordnung.has(laufId)
  if (bekannt && veraltet.length === 0) return
  zuordnungLaeuft = true
  const meineGeneration = generation
  let unvollstaendig = false
  let geaendert = false
  try {
    for (const id of veraltet) {
      const antwort = await holeWorkflowDetail(id)
      if (meineGeneration !== generation) return
      if (!antwort.ok) {
        unvollstaendig = true
        console.error(`[live] Workflow '${id}' für die Zuordnung nicht ladbar (HTTP ${antwort.status}).`)
        continue
      }
      const inhalt = await antwort.json()
      if (meineGeneration !== generation) return
      workflowCache.set(id, { versionSequenz: inhalt.versionSequenz, detail: inhalt })
    }
    const details = ids.map((id) => workflowCache.get(id)?.detail).filter((d) => d !== undefined)
    const treffer = findeLaufSchritt(details, laufId)
    // Ein Ladefehler lässt die Zuordnung offen (Abbruch bleibt gesperrt), statt „kein Workflow“ zu behaupten —
    // sonst bekäme ein Workflow-Lauf den Abbruch ohne Pflichtbegründung.
    if (treffer !== null || !unvollstaendig) {
      geaendert = zuordnung.get(laufId) !== treffer
      zuordnung.set(laufId, treffer)
    }
  } catch (fehler) {
    console.error('[live] Zuordnung Lauf → Workflow fehlgeschlagen:', fehler)
    return
  } finally {
    zuordnungLaeuft = false
  }
  if (meineGeneration !== generation || letzteZeichnung === null) return
  // Nur bei geänderter Zuordnung neu zeichnen — sonst stieße das Neuzeichnen (zeichneLive → ordneZu) nach einem
  // Ladefehler sofort den nächsten Abruf an (Schleife); der nächste Versuch kommt mit dem nächsten Tick.
  if (letzteZeichnung.laufId === laufId) {
    if (geaendert) zeichneLive(laufId, letzteZeichnung.detail, letzteZeichnung.stand)
  }
  // Inzwischen ein anderer Lauf gezeichnet (die Sperre hat ihn übersprungen): jetzt für ihn zuordnen.
  else if (!zuordnung.has(letzteZeichnung.laufId)) void ordneZu(letzteZeichnung.laufId, letzteZeichnung.detail)
}

/** Lädt einmal je Projekt die Aufträge (workitem_referenz für „Zum Eintrag“). */
async function ladeReferenzen() {
  if (referenzAngefragt) return
  referenzAngefragt = true
  const meineGeneration = generation
  try {
    const auftraege = await holeAuftraegeBegrenzt()
    if (meineGeneration !== generation) return
    referenzJeAuftrag = baueReferenzJeAuftrag(auftraege)
    if (letzteZeichnung !== null) zeichneLive(letzteZeichnung.laufId, letzteZeichnung.detail, letzteZeichnung.stand)
  } catch (fehler) {
    console.error('[live] Aufträge für „Zum Eintrag“ nicht ladbar:', fehler)
  }
}

/**
 * Workflow und Schritt des Laufs, falls zugeordnet.
 * @param laufId - Kennung
 * @returns { workflow, schritt } | null | undefined (undefined: noch offen)
 */
export function workflowZuLauf(laufId) {
  return zuordnung.get(laufId)
}

/**
 * Welche Abbruch-Bedienung gilt: 'stopp' (Lauf eines Workflow-Schritts — bestehender Stopp mit
 * Pflichtbegründung, bricht den Lauf ab), 'abbrechen' (Einzellauf — bestehender Abbruch ohne
 * Begründungsfeld, der Endpunkt speichert keinen Grund) oder 'offen' (Zuordnung lädt noch).
 * @param laufId - Kennung
 * @returns 'stopp' | 'abbrechen' | 'offen'
 */
export function abbruchArt(laufId) {
  const z = zuordnung.get(laufId)
  if (z === undefined) return 'offen'
  return z !== null && z.schritt?.status === 'LAEUFT' ? 'stopp' : 'abbrechen'
}

// ─── Zeichnen ───────────────────────────────────────────────────────────────

/**
 * Zeichnet alle Live-Teile der Lauf-Seite.
 * @param laufId - Kennung
 * @param detail - GET /api/laeufe/<laufId>
 * @param stand - { abbrechenKnopf: () => HTML } — der Abbruch-Knopf (runs.js, an Lage, Abbruchstand und Zuordnung gebunden; je Zeichnen neu gebaut)
 */
export function zeichneLive(laufId, detail, stand) {
  if (bedienung.laufId !== laufId) bedienung = { laufId, filter: 'alle', gewaehlt: null }
  letzteZeichnung = { laufId, detail, stand }
  const aktiv = detail.aktiv === true
  const jetztMs = Date.now()
  const treffer = zuordnung.get(laufId) ?? null
  const schritt = treffer?.schritt ?? null
  const workflow = treffer?.workflow ?? null
  const auftragId = detail.auftrag?.status === 'ok' ? detail.auftrag.auftragId : null
  const eintragHash = eintragHashAus(auftragId)

  // data-i18n mitführen: ein Sprachwechsel übersetzt das Dokument neu (uebersetzeDokument) und behielte sonst „Ein Arbeitsschritt“.
  const eyebrow = document.getElementById('lauf-detail-eyebrow')
  eyebrow.dataset.i18n = aktiv ? 'live.eyebrow.laeuft' : 'live.eyebrow.beendet'
  eyebrow.textContent = t(eyebrow.dataset.i18n)
  document.getElementById('lauf-detail').dataset.liveZustand = aktiv ? 'laeuft' : 'beendet'
  schreibe('live-chips', renderKopfChips({ detail, schritt, eintragHash }))
  const gerade = document.getElementById('live-gerade')
  gerade.hidden = !aktiv
  schreibe('live-gerade', aktiv ? renderGerade(detail.aktivitaet ?? null, detail.fortschritt ?? null) : '')

  const punkt = laufStatusPunkt(detail.laufStatus, aktiv)
  const startIso = laufStart(detail.checkpoints)
  const grenzeMs = typeof schritt?.zeitgrenze_ms === 'number' ? schritt.zeitgrenze_ms : detail.startvorlageZeitgrenzeMs
  schreibe(
    'live-status',
    renderStatusBlock({
      aktiv,
      startIso,
      dauerMinuten: laufDauerMinuten(detail.checkpoints),
      zeitgrenze: aktiv ? zeitgrenzeStand(startIso, grenzeMs, jetztMs) : null,
      aktivitaet: detail.aktivitaet ?? null,
      laufStatusHtml: escapeHtml(statusText(punkt.schluessel)),
      ton: STATUS_TON[punkt.kategorie] ?? 'neutral',
      abbrechenHtml: typeof stand?.abbrechenKnopf === 'function' ? stand.abbrechenKnopf() : '',
      jetztMs,
    })
  )
  schreibe('live-ablauf', renderAblaufleiste(workflow === null ? null : ablaufStufen(workflow.daten?.schritte, workflow.pruefergebnis ?? null)))
  const aktivitaet = detail.aktivitaet ?? null
  schreibe('live-aktivitaet', renderAktivitaet({ aktiv, aktivitaet, filter: bedienung.filter, gewaehlt: bedienung.gewaehlt, jetztMs }))
  // Nach dem Lauf gibt es keine Aktivität mehr — „Mehr dazu“ entfällt (leer, per CSS ausgeblendet).
  if (aktiv) zeichneMehrDazu(aktivitaet, schritt)
  else {
    mehrSchluessel = null
    schreibe('live-mehr', '')
  }
  schreibe('live-dateien', renderBeruehrteDateien({ aktiv, aktivitaet }))
  schreibe('live-bremsen', renderBremsen())
  schreibe('live-faehigkeiten', renderFaehigkeitenKarte({ aktiv, laufakte: detail.laufakte }))
  schreibe('live-output', renderOutput({ workflow, laufId }))
  schreibe('live-paket', renderBuilderPaket(detail.kontextpaket))

  void ordneZu(laufId, detail)
  void ladeReferenzen()
}

/** Zuletzt gezeichneter Schlüssel von „Mehr dazu“ (Auswahl + Schritt), damit eine getippte Frage stehen bleibt. */
let mehrSchluessel = null

/**
 * „Mehr dazu“ — nur bei anderer Auswahl neu.
 * @param aktivitaet - detail.aktivitaet (nur solange der Lauf läuft) oder null
 * @param schritt - Workflow-Schritt oder null
 */
function zeichneMehrDazu(aktivitaet, schritt) {
  const eintraege = Array.isArray(aktivitaet?.eintraege) ? aktivitaet.eintraege : []
  const eintrag = eintraege.find((e) => eintragSchluessel(e) === bedienung.gewaehlt) ?? null
  // Ein aus dem Puffer gefallener Eintrag bleibt gewählt sichtbar, bis eine neue Auswahl kommt.
  const anzeige = eintrag ?? (bedienung.gewaehlt !== null ? (bedienung.eintrag ?? null) : null)
  const schluessel = `${bedienung.laufId}|${anzeige === null ? '' : eintragSchluessel(anzeige)}|${schritt?.schritt_id ?? ''}`
  if (schluessel === mehrSchluessel) return
  mehrSchluessel = schluessel
  const eingabe = document.getElementById('live-jarvis-eingabe')
  const getippt = eingabe?.value ?? ''
  const hatteFokus = eingabe !== null && document.activeElement === eingabe
  schreibe('live-mehr', renderMehrDazu({ eintrag: anzeige, schritt }))
  const neu = document.getElementById('live-jarvis-eingabe')
  if (neu !== null && getippt !== '') neu.value = getippt
  if (neu !== null && hatteFokus) neu.focus({ preventScroll: true })
}

/** @param auftragId - auftragId oder null @returns `#/workboard/<id>` oder null */
function eintragHashAus(auftragId) {
  const referenz = typeof auftragId === 'string' ? referenzJeAuftrag?.get(auftragId) : undefined
  if (typeof referenz !== 'string') return null
  const teile = referenz.split(':')
  if (teile.length < 3 || teile[0] !== 'workitem') return null
  const id = teile.slice(2).join(':')
  return id === '' ? null : `#/workboard/${encodeURIComponent(id)}`
}

/**
 * Zustand „Die Workforce wartet“ aus dem Poll: Zuletzt (Dauer aus dem Detail des letzten Laufs,
 * einmal je Lauf geladen) und Als Nächstes.
 * @param zustand - Poll-Aggregat oder null (vor dem ersten Tick)
 */
export function zeigeWartet(zustand) {
  if (zustand === null) {
    schreibe('live-zuletzt', `<p class="subtle">${tHtml('live.laedt')}</p>`)
    schreibe('live-naechstes', `<p class="subtle">${tHtml('live.laedt')}</p>`)
    return
  }
  const lauf = waehleLetztenLauf(zustand.laeufe)
  const dauer = lauf !== null && zuletztDauer?.laufId === lauf.laufId ? zuletztDauer.dauerMinuten : null
  schreibe('live-zuletzt', renderZuletzt({ lauf, dauerMinuten: dauer, ergebnisHtml: lauf === null ? '' : laufStatusBadge(lauf.laufStatus, false), jetztMs: Date.now() }))
  schreibe('live-naechstes', aktiverLaufOhneSeite(zustand) ? renderFremderLauf() : renderAlsNaechstes(waehleAlsNaechstes(zustand)))
  if (lauf !== null && zuletztAngefragt !== lauf.laufId) void ladeZuletztDauer(lauf.laufId)
}

/**
 * true, wenn laut Poll ein Lauf aktiv ist, der hier keine Seite hat (anderes Projekt, D13 projektübergreifend,
 * oder noch nicht in der Laufliste) — dann bietet „Als Nächstes“ keinen Start an, der ohnehin gesperrt wäre.
 * @param zustand - Poll-Aggregat
 * @returns true/false
 */
function aktiverLaufOhneSeite(zustand) {
  const aktiver = zustand?.aktiverLauf
  if (aktiver?.aktiv !== true) return false
  return !(Array.isArray(zustand.laeufe) && zustand.laeufe.some((l) => l?.laufId === aktiver.laufId))
}

/** Lädt das Detail des letzten Laufs einmal für die Dauer. @param laufId - Kennung */
async function ladeZuletztDauer(laufId) {
  zuletztAngefragt = laufId
  const meineGeneration = generation
  try {
    const antwort = await holeLaufDetail(laufId)
    if (!antwort.ok) return
    const detail = await antwort.json()
    if (meineGeneration !== generation) return
    zuletztDauer = { laufId, dauerMinuten: laufDauerMinuten(detail.checkpoints) }
    if (!document.getElementById('live-wartet').hidden) zeigeWartet(letzterZustand)
  } catch (fehler) {
    console.error('[live] Detail des letzten Laufs nicht ladbar:', fehler)
  }
}

/** Räumt den Bedienzustand beim Schließen der Seite (Auswahl, geschriebenes HTML). */
export function raeumeLive() {
  letzteZeichnung = null
  mehrSchluessel = null
  geschrieben.clear()
  bedienung = { laufId: null, filter: 'alle', gewaehlt: null }
}

// ─── Bedienung ──────────────────────────────────────────────────────────────

/** Klick-Delegation: Filter, Auswahl eines Aufrufs, „Laufakte“, „Frag Jarvis dazu“. */
function initBedienung() {
  const seite = document.getElementById('lauf-detail')
  seite.addEventListener('click', (ereignis) => {
    const filter = ereignis.target.closest('[data-live-filter]')
    if (filter !== null) {
      bedienung.filter = filter.dataset.liveFilter
      neuZeichnen()
      return
    }
    const zeile = ereignis.target.closest('[data-live-eintrag]')
    if (zeile !== null) {
      const schluessel = zeile.dataset.liveEintrag
      bedienung.gewaehlt = schluessel
      bedienung.eintrag = (letzteZeichnung?.detail?.aktivitaet?.eintraege ?? []).find((e) => eintragSchluessel(e) === schluessel) ?? null
      neuZeichnen()
      // Einspaltig steht „Mehr dazu“ unter der Liste — ins Bild holen, Fokus bleibt auf der Zeile.
      if (window.matchMedia?.('(max-width: 1100px)').matches) document.getElementById('live-mehr').scrollIntoView({ block: 'nearest' })
      return
    }
    if (ereignis.target.closest('[data-live-aktion="laufakte"]')) {
      const herkunft = document.getElementById('lauf-herkunft')
      herkunft.open = true
      herkunft.querySelector('summary')?.focus()
      herkunft.scrollIntoView({ block: 'start' })
      return
    }
    const frage = ereignis.target.closest('[data-live-frage]')
    if (frage !== null) fragJarvis(t(`live.jarvis.${frage.dataset.liveFrage}`), frage)
  })
  seite.addEventListener('submit', (ereignis) => {
    if (!ereignis.target.closest('[data-live-jarvis-form]')) return
    ereignis.preventDefault()
    const eingabe = document.getElementById('live-jarvis-eingabe')
    const text = eingabe.value.trim()
    if (text === '') {
      eingabe.focus()
      return
    }
    fragJarvis(text, ereignis.submitter ?? eingabe)
    eingabe.value = ''
  })
}

/** Zeichnet mit dem letzten Detail neu (nach einer Bedienung). */
function neuZeichnen() {
  if (letzteZeichnung !== null) zeichneLive(letzteZeichnung.laufId, letzteZeichnung.detail, letzteZeichnung.stand)
}

/**
 * Öffnet das Chat-Dock mit einem Entwurf (Frage + Bezug auf Lauf und Aufruf) — sendet nichts.
 * @param frage - Fragetext
 * @param ausloeser - auslösendes Element (Fokus-Rückgabe)
 */
function fragJarvis(frage, ausloeser) {
  const laufId = bedienung.laufId ?? ''
  const eintrag = bedienung.gewaehlt === null ? null : (bedienung.eintrag ?? null)
  oeffneChatMitEntwurf({ modus: 'jarvis', entwurf: baueJarvisEntwurf(frage, laufId, eintrag) }, ausloeser)
}

/**
 * Initialisiert die Live-Teile einmalig: Bedienung, Abonnement des Polls (für „wartet“ und die
 * Zuordnung), Projektwechsel.
 * @param beiZustand - Rückruf von runs.js je Tick (für #/live: aktiver Lauf gewechselt?)
 */
export function initLive(beiZustand) {
  initBedienung()
  abonniere((zustand) => {
    letzterZustand = zustand
    // Kaltstart (Detail vor dem ersten Tick) oder Ladefehler: die Zuordnung mit dem Poll nachholen.
    if (letzteZeichnung !== null && !zuordnung.has(letzteZeichnung.laufId)) void ordneZu(letzteZeichnung.laufId, letzteZeichnung.detail)
    if (!document.getElementById('live-wartet').hidden) zeigeWartet(zustand)
    beiZustand(zustand)
  })
  abonniereProjektWechsel(() => {
    generation += 1
    letzterZustand = null
    workflowCache.clear()
    zuordnung.clear()
    referenzJeAuftrag = null
    referenzAngefragt = false
    zuletztDauer = null
    zuletztAngefragt = null
    raeumeLive()
  })
}

/** @returns das letzte Poll-Aggregat oder null */
export function letztesAggregat() {
  return letzterZustand
}
