/**
 * Datei: public/leitstand/views/sammlung.js
 *
 * Zweck: Bereich „Sammlung“ der Capability Library (Seite Workforce `#/capabilities`, F45 F-2b-1): lädt
 * GET …/sammlung des aktiven Projekts (Stand je Projekt), rendert über sammlung-anzeige.js und bedient Suche, Filter
 * (Urteil, Stand) und die aufklappbaren Details. Seit F45 F-2b-2a zusätzlich „Auswählen“ im Detail: (Typwahl, falls
 * unbestimmt) → POST /api/sammlung/pruefung/vorbereiten (Pin) → Bestätigung (Ausnahme-Begründung, falls das Urteil ausschließt)
 * → POST /api/sammlung/pruefung (202) → Prüflauf verfolgen (GET …/pruefung/<laufId> über den Detail-Auffrischer, nur solange er
 * läuft) → Bericht; danach lädt die Sammlung neu (Stand „geprüft“).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/capabilities.js (initSammlung, ladeSammlung, setzeSammlungZurueck)
 *
 * Wichtig:
 * - Nie im Poll: geladen beim Betreten der Seite, per „Neu laden“ und beim Projektwechsel. Der Detail-Auffrischer fragt nur
 *   Prüfläufe ab, die gerade holen/laufen (kein eigener Timer).
 * - Überholschutz über ladeZaehler (eine Antwort nach einem Projektwechsel wird verworfen).
 * - Kopf (Suche, Chips) und Liste sind getrennte Container: Tippen zeichnet nur die Liste neu, der Fokus bleibt im Suchfeld.
 * - Offene Details bleiben über Filterwechsel offen (offeneDetails, gemerkt über das toggle-Ereignis); ein Eintrag mit
 *   laufendem Ablauf bleibt offen.
 * - Die angezeigte Quelle (Pin) geht unverändert an den Start zurück; der Server vergleicht sie (409 bei Abweichung).
 */

import { bereitePruefungVor, holePruefung, holeSammlung, startePruefung, workforceAktiv } from '../api.js'
import { t } from '../i18n.js'
import { renderSammlungKopf, renderSammlungListe, renderSammlungZustand } from '../sammlung-anzeige.js'
import { abonniereDetailAuffrischer } from '../zustand.js'

/** Container des Bereichs (index.html). */
const CONTAINER_ID = 'sammlung'

/** Zustand: letzte Antwort, Filter, offene Details. */
let zustand = { antwort: null, filter: { suche: '', urteil: '', stand: '' } }
let offeneDetails = new Set()
/** F-2b-2a: Ablauf je Eintrag (id → { phase, vorbereitung, zustand, meldung, ausnahme, typ }). Überlebt Neuladen, nicht den Projektwechsel. */
let ablaeufe = new Map()
/** Überholschutz für Ladevorgänge. */
let ladeZaehler = 0
/** QA 8: Überholschutz je Eintrag für „vorbereiten“ (ein „Schließen“ während des Pins gewinnt gegen die späte Antwort). */
const vorbereitenZaehler = new Map()

/** @returns der Container oder null. */
function container() {
  return document.getElementById(CONTAINER_ID)
}

/** Zeichnet Kopf und Liste neu (nach dem Laden oder einem Chip-Klick). */
function zeichneAlles() {
  const ziel = container()
  if (ziel === null || zustand.antwort === null) return
  ziel.innerHTML = `<div class="sm-kopf">${renderSammlungKopf(zustand.antwort, zustand.filter)}</div><div class="sm-liste">${renderSammlungListe(zustand.antwort, zustand.filter, offeneDetails, ablaeufe)}</div>`
}

/** Zeichnet nur die Liste neu (Tippen in der Suche, Wechsel einer Ablauf-Phase — der Fokus im Suchfeld bleibt). */
function zeichneListe() {
  const liste = container()?.querySelector('.sm-liste')
  if (liste === null || liste === undefined || zustand.antwort === null) return
  liste.innerHTML = renderSammlungListe(zustand.antwort, zustand.filter, offeneDetails, ablaeufe)
}

/**
 * Setzt den Ablauf eines Eintrags und zeichnet die Liste neu; danach liegt der Fokus im Ablauf-Block (Tastatur, Screenreader).
 * @param id - Sammlungs-id
 * @param ablauf - neuer Zustand oder null (Ablauf beendet)
 * @param fokus - true (Stefans Klick), 'wennDort' (Detail-Auffrischer: nur, wenn der Fokus im Ablauf dieses Eintrags oder nirgends
 *   lag — QA 7: Bericht/Fehler werden so angesagt, ohne Stefan woanders herauszureißen) oder false
 */
function setzeAblauf(id, ablauf, fokus = true) {
  const block = () => container()?.querySelector(`[data-sm-detail="${CSS.escape(id)}"] .sm-auswahl`)
  const aktiv = document.activeElement
  const warDort = aktiv === null || aktiv === document.body || (block()?.contains(aktiv) ?? false)
  if (ablauf === null) ablaeufe.delete(id)
  else ablaeufe.set(id, { ...ablauf, laufLink: workforceAktiv() })
  offeneDetails.add(id)
  zeichneListe()
  if (fokus === false || (fokus === 'wennDort' && !warDort)) return
  // design-guardian 2: festes Fokusziel je Phase (Statuszeile, Frage oder Meldung), sonst das erste Bedienelement.
  const ziel = block()?.querySelector('[data-pruef-fokus]') ?? block()?.querySelector('select, textarea, button:not([disabled])')
  ziel?.focus?.()
}

/**
 * Grund aus einer Fehlerantwort.
 * @param antwort - Response
 * @returns Text
 */
async function grundAus(antwort) {
  const inhalt = await antwort.json().catch(() => ({}))
  return typeof inhalt.grund === 'string' ? inhalt.grund : `HTTP ${antwort.status}`
}

/**
 * Schritt „vorbereiten“: Pin holen und Bestätigung zeigen.
 * @param id - Sammlungs-id
 * @param typ - gewählter Typ oder null
 * @param pfad - gewählter Ordner im Repo oder null (nur git)
 */
async function bereiteVor(id, typ, pfad = null) {
  // design-guardian 8: eine schon eingegebene Ausnahme-Begründung überlebt „Pfad übernehmen“.
  const ausnahme = ablaeufe.get(id)?.ausnahme ?? ''
  const meine = (vorbereitenZaehler.get(id) ?? 0) + 1
  vorbereitenZaehler.set(id, meine)
  setzeAblauf(id, { phase: 'laedt', typ, pfad })
  try {
    const antwort = await bereitePruefungVor({ sammlung_id: id, ...(typ !== null ? { typ } : {}), ...(pfad !== null && pfad !== '' ? { pfad } : {}) })
    if (vorbereitenZaehler.get(id) !== meine || ablaeufe.get(id)?.phase !== 'laedt') return
    if (!antwort.ok) {
      setzeAblauf(id, { phase: 'fehler', meldung: t('pruefung.fehler.abgelehnt', { grund: await grundAus(antwort) }) })
      return
    }
    setzeAblauf(id, { phase: 'bestaetigen', vorbereitung: await antwort.json(), typ, pfad, ausnahme })
  } catch (fehler) {
    console.error('sammlung: Prüfung vorbereiten fehlgeschlagen', fehler)
    setzeAblauf(id, { phase: 'fehler', meldung: t('pruefung.fehler.anfrage', { grund: fehler instanceof Error ? fehler.message : String(fehler) }) })
  }
}

/**
 * Schritt „Prüfung starten“: angezeigten Pin (und ggf. Ausnahme-Begründung) senden, danach verfolgen.
 * @param id - Sammlungs-id
 */
async function starte(id) {
  const ablauf = ablaeufe.get(id)
  if (ablauf?.phase !== 'bestaetigen') return
  const feld = container()?.querySelector(`[data-sm-ausnahme="${CSS.escape(id)}"]`)
  const ausnahme = feld instanceof HTMLTextAreaElement ? feld.value.trim() : ''
  // QA 6: ein getippter, aber nicht übernommener Pfad würde still ignoriert — erst übernehmen.
  const pfadFeld = container()?.querySelector(`[data-sm-pfad="${CSS.escape(id)}"]`)
  if (pfadFeld instanceof HTMLInputElement && pfadFeld.value.trim().replace(/^\/+|\/+$/g, '') !== String(ablauf.vorbereitung?.quelle?.pfad ?? '')) {
    setzeAblauf(id, { ...ablauf, ausnahme, meldung: t('pruefung.fehler.pfadNichtUebernommen') })
    return
  }
  if (ablauf.vorbereitung?.ausgeschlossen === true && ausnahme.length < 20) {
    setzeAblauf(id, { ...ablauf, ausnahme, meldung: t('pruefung.fehler.ausnahmeKurz') })
    return
  }
  setzeAblauf(id, { ...ablauf, phase: 'startet', ausnahme, meldung: null })
  try {
    const koerper = { sammlung_id: id, quelle: ablauf.vorbereitung.quelle, ...(ablauf.typ !== null && ablauf.typ !== undefined ? { typ: ablauf.typ } : {}), ...(typeof ablauf.pfad === 'string' && ablauf.pfad !== '' ? { pfad: ablauf.pfad } : {}), ...(ablauf.vorbereitung?.ausgeschlossen === true ? { ausnahme_begruendung: ausnahme } : {}) }
    const antwort = await startePruefung(koerper)
    if (antwort.status !== 202) {
      setzeAblauf(id, { ...ablauf, phase: 'bestaetigen', ausnahme, meldung: t('pruefung.fehler.abgelehnt', { grund: await grundAus(antwort) }) })
      return
    }
    const { laufId } = await antwort.json()
    setzeAblauf(id, { phase: 'holen', zustand: { lauf_id: laufId } })
  } catch (fehler) {
    console.error('sammlung: Prüfung starten fehlgeschlagen', fehler)
    setzeAblauf(id, { ...ablauf, phase: 'bestaetigen', ausnahme, meldung: t('pruefung.fehler.anfrage', { grund: fehler instanceof Error ? fehler.message : String(fehler) }) })
  }
}

/**
 * Übernimmt einen fertigen Bericht in den angezeigten Eintrag (Stand „geprüft“, Zeile „Prüfbericht“), wie es die Route beim
 * nächsten Laden täte (ergaenzeSammlung).
 * @param id - Sammlungs-id
 * @param bericht - Zustand.bericht
 */
function uebernehmeBericht(id, bericht) {
  const e = zustand.antwort?.eintraege?.find((x) => x.id === id)
  if (e === undefined || bericht === null || typeof bericht !== 'object') return
  if (e.stand === 'vorgemerkt' || e.stand === 'nur_sammlung') e.stand = 'geprueft'
  if (e.pruefbericht !== 'lokal') e.pruefbericht = 'vorhanden'
  const q = bericht.quelle ?? {}
  e.pruefbericht_letzter = { artefakt_id: bericht.artefakt_id, version: bericht.version, urteil: bericht.ergebnis?.urteil, gepinnte_version: q.art === 'git' ? q.sha : q.version, quelle: q, erstellt_am: bericht.erstellt_am, lauf_id: bericht.lauf_id }
}

/**
 * Detail-Auffrischer (Poll-Tick, kein eigener Timer): fragt nur Prüfläufe in Phase holen/laeuft ab; fertig → Bericht und
 * Sammlung neu laden (Stand „geprüft“), fehler → Grund. Eine unbekannte laufId (Neustart) beendet die Verfolgung sichtbar.
 */
async function aktualisierePruefungen() {
  for (const [id, ablauf] of ablaeufe) {
    if (ablauf.phase !== 'holen' && ablauf.phase !== 'laeuft') continue
    try {
      const antwort = await holePruefung(ablauf.zustand.lauf_id)
      if (ablaeufe.get(id) !== ablauf) continue
      if (antwort.status === 404) {
        setzeAblauf(id, { phase: 'fehler', zustand: ablauf.zustand, meldung: t('pruefung.fehler.verloren') }, false)
        continue
      }
      if (!antwort.ok) continue
      const z = await antwort.json()
      if (z.phase === ablauf.phase) continue
      if (z.phase === 'fertig') {
        // QA 7: kein Neuladen der ganzen Sammlung (es zöge den Fokus weg) — der Eintrag übernimmt Stand und Bericht selbst.
        uebernehmeBericht(id, z.bericht)
        setzeAblauf(id, { phase: 'fertig', zustand: z }, 'wennDort')
      } else if (z.phase === 'fehler') setzeAblauf(id, { phase: 'fehler', zustand: z, meldung: String(z.grund ?? '') }, 'wennDort')
      else setzeAblauf(id, { phase: z.phase, zustand: z }, false)
    } catch {
      // Netzwerkfehler: der nächste Tick versucht es erneut (Muster views/capabilities.js).
    }
  }
}

/**
 * Lädt die Sammlung und zeichnet sie; Ladefehler und Fehlerstand der Route erscheinen im Bereich (catch + Logging).
 */
export async function ladeSammlung() {
  const meine = ++ladeZaehler
  const ziel = container()
  if (ziel === null) return
  if (zustand.antwort === null) ziel.innerHTML = renderSammlungZustand('laedt')
  try {
    const antwort = await holeSammlung()
    if (meine !== ladeZaehler) return
    if (antwort?.status !== 'ok') {
      console.error('sammlung: Fehlerstand der Route', antwort?.grund)
      zustand = { ...zustand, antwort: null }
      ziel.innerHTML = renderSammlungZustand('fehler', String(antwort?.grund ?? ''))
      return
    }
    // QA 4: ein gewählter Stand bzw. ein Urteil, das es in dieser Antwort nicht (mehr) gibt, fällt auf „Alle“ zurück — sonst stünde
    // „0 von 176“ ohne gedrückten Chip da.
    const filter = { ...zustand.filter }
    if (filter.stand !== '' && !((antwort.zaehlung?.je_stand ?? {})[filter.stand] > 0)) filter.stand = ''
    if (filter.urteil !== '' && !((antwort.zaehlung?.je_urteil ?? {})[filter.urteil] > 0)) filter.urteil = ''
    zustand = { ...zustand, antwort, filter }
    zeichneAlles()
  } catch (fehler) {
    if (meine !== ladeZaehler) return
    console.error('sammlung: GET …/sammlung fehlgeschlagen', fehler)
    zustand = { ...zustand, antwort: null }
    ziel.innerHTML = renderSammlungZustand('fehler', fehler instanceof Error ? fehler.message : String(fehler))
  }
}

/** Verwirft den Zustand (Projektwechsel); das nächste Laden zeigt „lädt“ und beginnt ohne Filter (QA 4). */
export function setzeSammlungZurueck() {
  ladeZaehler++
  zustand = { antwort: null, filter: { suche: '', urteil: '', stand: '' } }
  offeneDetails = new Set()
  ablaeufe = new Map()
}

/** Einmalig beim Bootstrap: Delegation für Chips, Suche, Details und den Auswählen-Ablauf. */
export function initSammlung() {
  const ziel = container()
  if (ziel === null) return
  ziel.addEventListener('click', (ereignis) => {
    const element = ereignis.target instanceof Element ? ereignis.target : null
    if (element === null) return
    const auswaehlen = element.closest('[data-sm-auswaehlen]')
    if (auswaehlen !== null) {
      const id = auswaehlen.dataset.smAuswaehlen ?? ''
      if (auswaehlen.dataset.smTypOffen === 'true') setzeAblauf(id, { phase: 'typwahl' })
      else void bereiteVor(id, null)
      return
    }
    const weiter = element.closest('[data-sm-typ-weiter]')
    if (weiter !== null) {
      const id = weiter.dataset.smTypWeiter ?? ''
      const auswahl = container()?.querySelector(`[data-sm-typ="${CSS.escape(id)}"]`)
      void bereiteVor(id, auswahl instanceof HTMLSelectElement ? auswahl.value : 'skill')
      return
    }
    const pfadKnopf = element.closest('[data-sm-pfad-uebernehmen]')
    if (pfadKnopf !== null) {
      const id = pfadKnopf.dataset.smPfadUebernehmen ?? ''
      const feld = container()?.querySelector(`[data-sm-pfad="${CSS.escape(id)}"]`)
      void bereiteVor(id, ablaeufe.get(id)?.typ ?? null, feld instanceof HTMLInputElement ? feld.value.trim() : null)
      return
    }
    const start = element.closest('[data-sm-pruefung-start]')
    if (start !== null) {
      void starte(start.dataset.smPruefungStart ?? '')
      return
    }
    const zurueck = element.closest('[data-sm-pruefung-zurueck]')
    if (zurueck !== null) {
      setzeAblauf(zurueck.dataset.smPruefungZurueck ?? '', null)
      return
    }
    const chip = element.closest('[data-sm-filter]')
    if (chip === null) return
    const name = chip.dataset.smFilter
    if (name !== 'urteil' && name !== 'stand') return
    zustand = { ...zustand, filter: { ...zustand.filter, [name]: chip.dataset.smWert ?? '' } }
    zeichneAlles()
    // Fokus zurück auf den gewählten Chip (Muster capability-library.js).
    container()?.querySelector(`[data-sm-filter="${name}"][data-sm-wert="${CSS.escape(chip.dataset.smWert ?? '')}"]`)?.focus?.()
  })
  // QA 6: Enter im Pfad-Feld übernimmt den Pfad.
  ziel.addEventListener('keydown', (ereignis) => {
    if (ereignis.key !== 'Enter' || !(ereignis.target instanceof HTMLInputElement) || ereignis.target.dataset.smPfad === undefined) return
    ereignis.preventDefault()
    const id = ereignis.target.dataset.smPfad
    void bereiteVor(id, ablaeufe.get(id)?.typ ?? null, ereignis.target.value.trim())
  })
  ziel.addEventListener('input', (ereignis) => {
    if (ereignis.target instanceof HTMLTextAreaElement && ereignis.target.dataset.smAusnahme !== undefined) {
      // Eingabe merken, ohne neu zu zeichnen (der Fokus bleibt im Feld).
      const a = ablaeufe.get(ereignis.target.dataset.smAusnahme)
      if (a !== undefined) a.ausnahme = ereignis.target.value
      return
    }
    if (!(ereignis.target instanceof HTMLInputElement) || ereignis.target.id !== 'sammlung-suche') return
    zustand = { ...zustand, filter: { ...zustand.filter, suche: ereignis.target.value } }
    zeichneListe()
  })
  // toggle bubbelt nicht — im Capture-Modus am Container mithören.
  ziel.addEventListener(
    'toggle',
    (ereignis) => {
      const details = ereignis.target
      if (!(details instanceof HTMLDetailsElement) || details.dataset.smDetail === undefined) return
      if (details.open) offeneDetails.add(details.dataset.smDetail)
      else offeneDetails.delete(details.dataset.smDetail)
    },
    true
  )
  abonniereDetailAuffrischer(() => {
    if ([...ablaeufe.values()].some((a) => a.phase === 'holen' || a.phase === 'laeuft')) void aktualisierePruefungen()
  })
}
