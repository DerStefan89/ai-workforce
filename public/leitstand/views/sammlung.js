/**
 * Datei: public/leitstand/views/sammlung.js
 *
 * Zweck: Bereich „Sammlung“ der Capability Library (Seite Workforce `#/capabilities`, F45 F-2b-1): lädt
 * GET …/sammlung des aktiven Projekts (Stand je Projekt), rendert über sammlung-anzeige.js und bedient Suche, Filter
 * (Urteil, Stand) und die Details. Seit F45 F-2b-2a zusätzlich „Auswählen“ im Detail (Ablauf: Typwahl, Pin, Bestätigung,
 * Prüflauf, Bericht — seit F-2b-2c gemeinsam mit der Capability Library in views/pruefung-ablauf.js). Seit F45 F-2b-2c:
 * - das Detail steht in einer eigenen, vollen Tabellenzeile; der Knopf „Details“ schaltet sie (F-1068 (3));
 * - „Vormerken“ für Einträge ohne Katalog mit Prüfbericht — derselbe Weg wie beim Scout (vormerken-ablauf.js: Auftrag →
 *   Routen → Freigabe am Ausführungsschritt), Text aus vormerken-auftrag.js (F-1056 Rest). Nur in der Workforce.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/capabilities.js (initSammlung, ladeSammlung, setzeSammlungZurueck)
 *
 * Wichtig:
 * - Nie im Poll: geladen beim Betreten der Seite, per „Neu laden“ und beim Projektwechsel. Der Detail-Auffrischer fragt nur
 *   Prüfläufe ab, die gerade holen/laufen (kein eigener Timer).
 * - Überholschutz über ladeZaehler (eine Antwort nach einem Projektwechsel wird verworfen).
 * - Kopf (Suche, Chips) und Liste sind getrennte Container: Tippen zeichnet nur die Liste neu, der Fokus bleibt im Suchfeld.
 * - Offene Details bleiben über Filterwechsel offen (offeneDetails). Ein Auffrischer-Wechsel öffnet kein geschlossenes Detail.
 */

import { holeSammlung, workforceAktiv } from '../api.js'
import { renderSammlungKopf, renderSammlungListe, renderSammlungZustand } from '../sammlung-anzeige.js'
import { legeVormerkenAnUndRoute } from '../vormerken-ablauf.js'
import { baueSammlungVormerkenAuftragstext, sammlungNichtVormerkbar } from '../vormerken-auftrag.js'
import { erzeugePruefAblauf } from './pruefung-ablauf.js'

/** Container des Bereichs (index.html). */
const CONTAINER_ID = 'sammlung'

/** Zustand: letzte Antwort, Filter, offene Details. */
let zustand = { antwort: null, filter: { suche: '', urteil: '', stand: '' } }
let offeneDetails = new Set()
/** F-2b-2c: Vormerken je Eintrag (id → { phase, auftragId, workflowId, meldung }). Überlebt Neuladen, nicht den Projektwechsel. */
let vormerken = new Map()
/** Überholschutz für Ladevorgänge. */
let ladeZaehler = 0

/** @returns der Container oder null. */
function container() {
  return document.getElementById(CONTAINER_ID)
}

/** Ablauf „Auswählen“ (Eignungsprüfung) je Sammlungseintrag. */
const pruefAblauf = erzeugePruefAblauf({
  container,
  schluessel: 'sammlung_id',
  zeichne: () => zeichneListe(),
  block: (id) => container()?.querySelector(`[data-sm-detail="${CSS.escape(id)}"] .sm-auswahl`) ?? null,
  oeffne: (id) => offeneDetails.add(id),
  nachBericht: (id, z) => uebernehmeBericht(id, z),
})

/** @returns Zusatzdaten der Liste (Vormerken, Workforce aktiv). */
function extras() {
  return { vormerken, workforce: workforceAktiv() }
}

/** Zeichnet Kopf und Liste neu (nach dem Laden oder einem Chip-Klick). */
function zeichneAlles() {
  const ziel = container()
  if (ziel === null || zustand.antwort === null) return
  ziel.innerHTML = `<div class="sm-kopf">${renderSammlungKopf(zustand.antwort, zustand.filter)}</div><div class="sm-liste">${renderSammlungListe(zustand.antwort, zustand.filter, offeneDetails, pruefAblauf.ablaeufe(), extras())}</div>`
}

/** Zeichnet nur die Liste neu (Tippen in der Suche, Wechsel einer Ablauf-Phase — der Fokus im Suchfeld bleibt). */
function zeichneListe() {
  const liste = container()?.querySelector('.sm-liste')
  if (liste === null || liste === undefined || zustand.antwort === null) return
  liste.innerHTML = renderSammlungListe(zustand.antwort, zustand.filter, offeneDetails, pruefAblauf.ablaeufe(), extras())
}

/**
 * Übernimmt einen fertigen Bericht in den angezeigten Eintrag (Stand „geprüft“, Zeile „Prüfbericht“, Vormerken), wie es die Route
 * beim nächsten Laden täte (ergaenzeSammlung) — kein Neuladen der ganzen Sammlung (es zöge den Fokus weg, QA 7).
 * @param id - Sammlungs-id
 * @param z - Zustand des Prüflaufs (bericht, bericht_kurz)
 */
function uebernehmeBericht(id, z) {
  const e = zustand.antwort?.eintraege?.find((x) => x.id === id)
  const bericht = z?.bericht
  if (e === undefined || bericht === null || typeof bericht !== 'object') return
  if (e.stand === 'vorgemerkt' || e.stand === 'nur_sammlung') e.stand = 'geprueft'
  if (e.pruefbericht !== 'lokal') e.pruefbericht = 'vorhanden'
  const q = bericht.quelle ?? {}
  // F-2b-2c: bericht_kurz (Server, berichtKurz) trägt typ, geprüftes bin und SKILL.md für „Vormerken“.
  e.pruefbericht_letzter = z.bericht_kurz ?? { artefakt_id: bericht.artefakt_id, version: bericht.version, urteil: bericht.ergebnis?.urteil, gepinnte_version: q.art === 'git' ? q.sha : q.art === 'npm' ? q.version : q.kopie_hash, quelle: q, erstellt_am: bericht.erstellt_am, lauf_id: bericht.lauf_id }
  // QA M5: ein schon vorgemerkter Eintrag bleibt vorgemerkt (kein zweites Vormerken nach „Erneut prüfen“); nur ein Fehler wird verworfen.
  if (vormerken.get(id)?.phase === 'fehler') vormerken.delete(id)
  zeichneListe()
}

/**
 * „Vormerken“: Auftrag anlegen und routen (Scout-Weg); ein Fehlversuch reicht beim nächsten Klick denselben Auftrag ein.
 * @param id - Sammlungs-id
 */
async function merkeVor(id) {
  const e = zustand.antwort?.eintraege?.find((x) => x.id === id)
  if (e === undefined || sammlungNichtVormerkbar(e) !== null || !workforceAktiv() || vormerken.get(id)?.phase === 'unterwegs') return
  const auftragId = vormerken.get(id)?.auftragId ?? null
  const fokus = () => container()?.querySelector(`[data-sm-detail="${CSS.escape(id)}"] [data-sm-vormerken-fokus]`)?.focus?.()
  vormerken.set(id, { phase: 'unterwegs', auftragId })
  zeichneListe()
  fokus()
  const ergebnis = await legeVormerkenAnUndRoute({ titel: `Vormerken: ${e.name}`, auftragstext: baueSammlungVormerkenAuftragstext(e, e.pruefbericht_letzter), auftragId })
  vormerken.set(id, ergebnis)
  zeichneListe()
  fokus()
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
  vormerken = new Map()
  pruefAblauf.zuruecksetzen()
}

/** Einmalig beim Bootstrap: Delegation für Chips, Suche, Details, Vormerken; der Prüf-Ablauf bindet sich selbst. */
export function initSammlung() {
  const ziel = container()
  if (ziel === null) return
  pruefAblauf.init()
  ziel.addEventListener('click', (ereignis) => {
    const element = ereignis.target instanceof Element ? ereignis.target : null
    if (element === null) return
    const knopf = element.closest('[data-sm-detail-knopf]')
    if (knopf !== null) {
      const id = knopf.dataset.smDetailKnopf ?? ''
      if (offeneDetails.has(id)) offeneDetails.delete(id)
      else offeneDetails.add(id)
      zeichneListe()
      // Fokus zurück auf denselben Knopf (die Liste wurde neu gezeichnet).
      container()?.querySelector(`[data-sm-detail-knopf="${CSS.escape(id)}"]`)?.focus?.()
      return
    }
    const vormerkenKnopf = element.closest('[data-sm-vormerken]')
    if (vormerkenKnopf !== null) {
      void merkeVor(vormerkenKnopf.dataset.smVormerken ?? '')
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
  ziel.addEventListener('input', (ereignis) => {
    if (!(ereignis.target instanceof HTMLInputElement) || ereignis.target.id !== 'sammlung-suche') return
    zustand = { ...zustand, filter: { ...zustand.filter, suche: ereignis.target.value } }
    zeichneListe()
  })
}
