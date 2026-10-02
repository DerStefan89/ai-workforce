/**
 * Datei: public/leitstand/attention-daten.js
 *
 * Zweck: Geteiltes Modul für die beiden Attention-Zahlen (F21 WS-2) —
 * verhindert, dass views/attention.js und views/dashboard.js je eine eigene,
 * potenziell abweichende Filterregel für "braucht Aufmerksamkeit" führen.
 * filtereAttentionWorkflows/filtereAttentionLaeufe rechnen auf dem ohnehin
 * gepollten Zustands-Aggregat (kein I/O); holeOffeneP0P1Workitems kapselt
 * den einen GET /api/workitems-Abruf (kein Attention-Endpunkt, F21
 * Nicht-Ziele) und filtert P0/P1 client-seitig, nachdem der Server bereits
 * auf status=OFFEN gefiltert hat.
 *
 * F44 WS-2a: baueEntscheidungen baut daraus die Einträge von „Deine Entscheidungen“ (Auswahl,
 * Reihenfolge, Titel, Ziel) als reine Funktion — wiederverwendet in WS-2b für „Deine nächsten
 * Entscheidungen“ der Übersicht.
 *
 * F46 D2 (abgleich-f46.md §4.4, F-972): Art „abnahme“ aus dem Kopfdatum abnahme.offen
 * (filtereOffeneAbnahmen), Filter der Chips (ENTSCHEIDUNGS_FILTER, zaehleJeFilter, passtZuFilter),
 * „Zum Eintrag“ über den Auftrag (baueReferenzJeAuftrag) und die Zahl am Navigationspunkt
 * (zaehleOffeneEntscheidungen, public/leitstand/entscheidungen-zaehler.js).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/attention.js
 * - public/leitstand/views/dashboard.js
 * - public/leitstand/jarvis-vorfilter.js (F26 WS-2a, "was braucht mich")
 * - public/leitstand/fokus-daten.js (F44 WS-3a, F-913: Fokuswahl über baueEntscheidungen)
 * - public/leitstand/entwicklung-daten.js (F44 WS-3a: Spalte „Braucht dich“ über filtereAttentionWorkflows;
 *   F44 WS-3b: verknüpfter Ablauf und Phase Freigabe/Rückfrage über baueEntscheidungen)
 * - public/leitstand/views/projekte-uebersicht.js (F44 WS-6a: waehleP0P1 und baueEntscheidungen je Produktkarte)
 * - public/leitstand/attention-daten.test.mjs (node:test, baueEntscheidungen)
 */

import { holeWorkitems } from './api.js'

/** Workflows, die auf eine menschliche Aktion warten (F15 WS-3b Automaten-Verdikt). @param workflows - zustand.workflows, oder null bei defekter Quelle @returns gefilterte Liste, oder null */
export function filtereAttentionWorkflows(workflows) {
  if (workflows === null) return null
  return workflows.filter((w) => w.naechster?.art === 'haltFreigabe' || (w.naechster?.art === 'haltKlaerung' && !laeuftGerade(w)))
}

/**
 * F46 D3 (löst F-996): Läuft ein Workflow, meldet der Automat für den laufenden Schritt `haltKlaerung`
 * („Schritt … ist nicht startbereit (status LAEUFT …)“, ermittleNaechstenSchritt) — das ist keine
 * Rückfrage an Stefan. Laufend heißt: Status LAEUFT oder ein Schritt mit Status LAEUFT (die Kopfdaten
 * des Polls tragen keine Schritte; wo ein Aufrufer sie mitgibt, zählen sie mit). Eine echte Rückfrage
 * setzt den Workflow auf KLAERUNG_ERFORDERLICH und bleibt eine Rückfrage.
 * @param workflow - Workflow-Eintrag (Kopfdaten, optional mit schritte)
 * @returns true, solange der Workflow läuft
 */
export function laeuftGerade(workflow) {
  return workflow?.status === 'LAEUFT' || (Array.isArray(workflow?.schritte) && workflow.schritte.some((s) => s?.status === 'LAEUFT'))
}

/**
 * Workflows mit offener Abnahme (F46 D2, löst F-972): allein das Kopfdatum abnahme.offen aus dem
 * Server (ermittleAbnahmeStand in scripts/leitstand-server.mjs, dieselbe Regel wie GET …/abnahme) —
 * keine zweite Regel im Client.
 * @param workflows - zustand.workflows, oder null bei defekter Quelle
 * @returns gefilterte Liste, oder null
 */
export function filtereOffeneAbnahmen(workflows) {
  if (workflows === null) return null
  return workflows.filter((w) => w.abnahme?.offen === true)
}

/** Läufe, die fehlgeschlagen und noch nicht kenntnisgenommen sind (F21 WS-1 AK4). @param laeufe - zustand.laeufe, oder null bei defekter Quelle @returns gefilterte Liste, oder null */
export function filtereAttentionLaeufe(laeufe) {
  if (laeufe === null) return null
  return laeufe.filter((l) => l.ergebnis === 'FEHLGESCHLAGEN' && l.kenntnisgenommen === false)
}

/**
 * Ein GET /api/workitems?status=OFFEN, P0/P1 danach client-seitig gefiltert
 * (der Server kennt 'OFFEN' nur für Findings — Feature-Akten fallen über den
 * status-Filter bereits heraus, siehe src/workboard/index.ts erfuelltFilter).
 * @returns { workitems, befunde, fehler } — workitems null bei defekter Quelle
 */
export async function holeOffeneP0P1Workitems() {
  return waehleP0P1(await holeWorkitems({ status: 'OFFEN' }))
}

/**
 * Filtert eine Antwort von GET …/workitems?status=OFFEN auf P0/P1 — rein, damit auch
 * views/projekte-uebersicht.js (F44 WS-6a, Abruf je Projekt mit expliziter id) dieselbe Regel nutzt.
 * @param antwort - geparste Antwort ({ workitems: Liste oder null, befunde?, fehler? })
 * @returns { workitems, befunde, fehler } — workitems null bei defekter Quelle
 */
export function waehleP0P1(antwort) {
  const workitems = antwort.workitems === null ? null : antwort.workitems.filter((w) => w.prioritaet === 'P0' || w.prioritaet === 'P1')
  return { workitems, befunde: antwort.befunde ?? [], fehler: antwort.fehler ?? [] }
}

/** Arten eines Entscheidungseintrags (F44 WS-2a; F46 D2: 'abnahme'). */
export const ENTSCHEIDUNGS_ARTEN = ['freigabe', 'rueckfrage', 'abnahme', 'lauf', 'startproblem', 'befund']

/**
 * Filter der Liste „Deine Entscheidungen“ (F46 D2, Bild 09-Main) in Chip-Reihenfolge, je mit den
 * Arten, die er zeigt. „Fehler“ fasst unbestätigte Lauf-Fehler und Startprobleme zusammen;
 * „sichern“ hat keine Art (kein Zustand, Fixpaket) und erscheint als „kommt“.
 */
export const ENTSCHEIDUNGS_FILTER = Object.freeze([
  { id: 'alle', arten: null },
  { id: 'freigabe', arten: ['freigabe'] },
  { id: 'abnahme', arten: ['abnahme'] },
  { id: 'sichern', arten: [] },
  { id: 'rueckfrage', arten: ['rueckfrage'] },
  { id: 'fehler', arten: ['lauf', 'startproblem'] },
  { id: 'befund', arten: ['befund'] },
])

/** Quelle (Gruppe in baueEntscheidungen) je Art — ein Filter ist unvollständig, solange eine seiner Quellen lädt oder defekt ist. */
const GRUPPE_JE_ART = { freigabe: 'workflows', rueckfrage: 'workflows', abnahme: 'abnahmen', lauf: 'laeufe', startproblem: 'startfehler', befund: 'workitems' }

/**
 * Anzahl je Filter für die Chips (F46 D2). Ein Filter, dessen Quelle defekt ist, bekommt null, eine
 * noch ladende undefined — nie eine Zahl, die nach Entwarnung aussieht.
 * @param ergebnis - Rückgabe von baueEntscheidungen
 * @returns Map Filter-id → Zahl | null | undefined (für 'sichern' immer undefined: „kommt“)
 */
export function zaehleJeFilter(ergebnis) {
  const anzahl = new Map()
  for (const filter of ENTSCHEIDUNGS_FILTER) {
    if (filter.id === 'sichern') {
      anzahl.set(filter.id, undefined)
      continue
    }
    const gruppen = [...new Set((filter.arten ?? ENTSCHEIDUNGS_ARTEN).map((art) => GRUPPE_JE_ART[art]))]
    const zustaende = gruppen.map((name) => ergebnis.gruppen[name])
    if (zustaende.some((liste) => liste === null)) anzahl.set(filter.id, null)
    else if (zustaende.some((liste) => liste === undefined)) anzahl.set(filter.id, undefined)
    else anzahl.set(filter.id, ergebnis.eintraege.filter((e) => filter.arten === null || filter.arten.includes(e.art)).length)
  }
  return anzahl
}

/**
 * Ob ein Eintrag zum gewählten Filter gehört.
 * @param eintrag - Eintrag aus baueEntscheidungen
 * @param filterId - id aus ENTSCHEIDUNGS_FILTER
 * @returns true, wenn der Eintrag sichtbar ist
 */
export function passtZuFilter(eintrag, filterId) {
  const filter = ENTSCHEIDUNGS_FILTER.find((f) => f.id === filterId)
  return filter === undefined || filter.arten === null || filter.arten.includes(eintrag.art)
}

/**
 * Navigationsziel des Eintrags hinter einem Auftrag (F46 D2, „Zum Eintrag“): workitem_referenz
 * des Auftrags im Format 'workitem:<quelle>:<id>' (leseWorkitemReferenz im Server) → `#/workboard/<id>`.
 * @param auftragId - Auftrags-ID (Workflow-Kopfdatum auftragId bzw. auftragsbezug.auftragId eines Laufs)
 * @param referenzJeAuftrag - Map auftragId → workitem_referenz (baueReferenzJeAuftrag), oder null
 * @returns Hash oder null, wenn keine Verknüpfung bekannt ist
 */
function eintragHash(auftragId, referenzJeAuftrag) {
  const referenz = referenzJeAuftrag?.get(auftragId)
  if (typeof referenz !== 'string') return null
  const teile = referenz.split(':')
  if (teile.length < 3 || teile[0] !== 'workitem') return null
  const id = teile.slice(2).join(':')
  return id === '' ? null : `#/workboard/${encodeURIComponent(id)}`
}

/**
 * Map auftragId → workitem_referenz aus GET …/auftraege (F46 D2) — dieselbe Verknüpfung wie
 * baueVerknuepfung in entwicklung-daten.js (workflow.auftragId → Auftrag → workitem_referenz).
 * @param auftraege - Liste der Aufträge, oder null/undefined (nicht verfügbar bzw. lädt)
 * @returns Map oder null
 */
export function baueReferenzJeAuftrag(auftraege) {
  if (!Array.isArray(auftraege)) return null
  const karte = new Map()
  for (const auftrag of auftraege) {
    if (typeof auftrag?.auftragId === 'string' && typeof auftrag.workitem_referenz === 'string') karte.set(auftrag.auftragId, auftrag.workitem_referenz)
  }
  return karte
}

/** Reihenfolge der Befund-Prioritäten innerhalb der Gruppe (P0 vor P1). */
const PRIORITAETS_RANG = { P0: 0, P1: 1 }

/**
 * Nicht-leerer, getrimmter Text oder null — für optionale menschenlesbare Titel aus dem Aggregat.
 * @param wert - beliebiger Wert
 * @returns der Text oder null
 */
function textOderNull(wert) {
  return typeof wert === 'string' && wert.trim().length > 0 ? wert.trim() : null
}

/**
 * Baut die Einträge von „Deine Entscheidungen“ (F44 WS-2a, Abgleich F-725 C1–C3; F46 D2) aus dem
 * Zustands-Aggregat und den offenen P0/P1-Workitems. Rein (kein I/O, kein DOM), damit
 * views/attention.js und in WS-2b „Deine nächsten Entscheidungen“ in views/dashboard.js
 * dieselbe Auswahl, Reihenfolge und Beschriftung zeigen. Filterregeln wie oben
 * (filtereAttentionWorkflows/filtereOffeneAbnahmen/filtereAttentionLaeufe), keine zweite Regel.
 *
 * Reihenfolge: Freigaben (naechster.art haltFreigabe) → Rückfragen (haltKlaerung) → offene
 * Abnahmen (F46 D2, Kopfdatum abnahme.offen) → unbestätigte fehlgeschlagene Läufe →
 * Startprobleme → Befunde (P0 vor P1). Innerhalb einer Art bleibt die Reihenfolge der Quelle.
 *
 * Ein Eintrag: { art, id, titel, satz, hash, eintragHash, prioritaet?, zeitpunkt?, zeitstempel?,
 * fehler?, abnahmeStatus? }. `titel` ist der menschenlesbare Titel aus dem Aggregat
 * (Workflow-Ziel, Auftragstitel des Laufs, Workitem-Titel), sonst die ID. `satz` ist der
 * Servertext `grund` (nur Freigabe und Rückfrage), sonst null — die View setzt dann einen
 * übersetzten Standardsatz. `hash` ist das Navigationsziel; Startprobleme haben keines (flüchtige
 * Projektion ohne Detailroute), tragen dafür Zeitstempel, laufId und Fehlertext. `eintragHash`
 * (F46 D2, „Zum Eintrag“) ist das Workitem hinter dem Auftrag, null ohne bekannte Verknüpfung.
 * `abnahmeStatus` ist bei Abnahmen 'nicht_vorhanden' oder 'veraltet' (Kopfdatum). Alle Texte sind
 * roh (Server-/Projekttexte) und müssen beim Rendern escaped werden.
 *
 * @param zustand - Aggregat aus dem Poll ({ workflows, laeufe, startfehler }, je null bei defekter Quelle), oder null vor dem ersten Tick
 * @param workitems - offene P0/P1-Workitems (holeOffeneP0P1Workitems().workitems), null bei defekter Quelle, undefined solange der Abruf läuft
 * @param referenzJeAuftrag - optional baueReferenzJeAuftrag(auftraege) für „Zum Eintrag“; ohne (null/undefined) ist eintragHash null
 * @returns { gruppen: { workflows, abnahmen, laeufe, startfehler, workitems } je Eintrag[] (null = defekt, undefined = lädt), eintraege: alle vorhandenen Einträge in Listenreihenfolge, zaehler: je Gruppe Anzahl oder null/undefined, defekt: mindestens eine Quelle null, alleLeer: alle Quellen geladen und leer }
 */
export function baueEntscheidungen(zustand, workitems, referenzJeAuftrag = null) {
  const workflowsRoh = zustand === null ? undefined : filtereAttentionWorkflows(zustand.workflows ?? null)
  const abnahmenRoh = zustand === null ? undefined : filtereOffeneAbnahmen(zustand.workflows ?? null)
  const laeufeRoh = zustand === null ? undefined : filtereAttentionLaeufe(zustand.laeufe ?? null)
  const startfehlerRoh = zustand === null ? undefined : (zustand.startfehler ?? null)

  const gruppen = {
    workflows: Array.isArray(workflowsRoh)
      ? [...workflowsRoh.filter((w) => w.naechster?.art === 'haltFreigabe'), ...workflowsRoh.filter((w) => w.naechster?.art !== 'haltFreigabe')].map((w) => ({
          art: w.naechster?.art === 'haltFreigabe' ? 'freigabe' : 'rueckfrage',
          id: w.workflowId,
          titel: textOderNull(w.ziel) ?? w.workflowId,
          satz: textOderNull(w.grund),
          hash: `#/workflows/${encodeURIComponent(w.workflowId)}`,
          eintragHash: eintragHash(w.auftragId, referenzJeAuftrag),
        }))
      : workflowsRoh,
    abnahmen: Array.isArray(abnahmenRoh)
      ? abnahmenRoh.map((w) => ({
          art: 'abnahme',
          id: w.workflowId,
          titel: textOderNull(w.ziel) ?? w.workflowId,
          satz: null,
          hash: `#/workflows/${encodeURIComponent(w.workflowId)}`,
          eintragHash: eintragHash(w.auftragId, referenzJeAuftrag),
          abnahmeStatus: w.abnahme.status,
        }))
      : abnahmenRoh,
    laeufe: Array.isArray(laeufeRoh)
      ? laeufeRoh.map((l) => ({
          art: 'lauf',
          id: l.laufId,
          titel: textOderNull(l.auftragsbezug?.titel) ?? l.laufId,
          satz: null,
          hash: `#/runs/${encodeURIComponent(l.laufId)}`,
          eintragHash: eintragHash(l.auftragsbezug?.auftragId, referenzJeAuftrag),
          zeitpunkt: l.zeitpunkt ?? null,
        }))
      : laeufeRoh,
    startfehler: Array.isArray(startfehlerRoh)
      ? startfehlerRoh.map((s) => ({
          art: 'startproblem',
          id: s.laufId,
          titel: s.laufId,
          satz: null,
          hash: null,
          eintragHash: null,
          zeitstempel: s.zeitstempel ?? null,
          fehler: s.fehler ?? null,
        }))
      : startfehlerRoh,
    workitems: Array.isArray(workitems)
      ? workitems
          .map((w, index) => ({ w, index }))
          .sort((a, b) => (PRIORITAETS_RANG[a.w.prioritaet] ?? 9) - (PRIORITAETS_RANG[b.w.prioritaet] ?? 9) || a.index - b.index)
          .map(({ w }) => ({
            art: 'befund',
            id: w.id,
            titel: textOderNull(w.titel) ?? w.id,
            satz: null,
            hash: `#/workboard/${encodeURIComponent(w.id)}`,
            eintragHash: null,
            prioritaet: w.prioritaet,
          }))
      : workitems,
  }

  const listen = [gruppen.workflows, gruppen.abnahmen, gruppen.laeufe, gruppen.startfehler, gruppen.workitems]
  const zaehler = {}
  for (const [name, liste] of Object.entries(gruppen)) zaehler[name] = Array.isArray(liste) ? liste.length : liste
  return {
    gruppen,
    eintraege: listen.flatMap((liste) => (Array.isArray(liste) ? liste : [])),
    zaehler,
    defekt: listen.some((liste) => liste === null),
    alleLeer: listen.every((liste) => Array.isArray(liste) && liste.length === 0),
  }
}

/**
 * Zahl am Navigationspunkt „Entscheidungen“ (F46 D2, abgleich-f46.md §1) aus dem einen Poll:
 * Freigaben, Rückfragen, offene Abnahmen, unbestätigte Lauf-Fehler und Startprobleme. Befunde
 * P0/P1 zählen hier nicht — sie kommen aus einem eigenen Abruf, nicht aus dem Poll (kein zweiter
 * Poll); die Liste selbst zeigt sie.
 * @param zustand - Aggregat aus dem Poll, oder null vor dem ersten Tick
 * @returns Anzahl, oder null, solange eine Poll-Quelle fehlt oder defekt ist
 */
export function zaehleOffeneEntscheidungen(zustand) {
  if (zustand === null || zustand === undefined) return null
  const { gruppen } = baueEntscheidungen(zustand, [])
  const listen = [gruppen.workflows, gruppen.abnahmen, gruppen.laeufe, gruppen.startfehler]
  if (!listen.every(Array.isArray)) return null
  return listen.reduce((summe, liste) => summe + liste.length, 0)
}
