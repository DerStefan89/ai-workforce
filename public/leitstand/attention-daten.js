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
  return workflows.filter((w) => w.naechster?.art === 'haltFreigabe' || w.naechster?.art === 'haltKlaerung')
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

/** Arten eines Entscheidungseintrags (F44 WS-2a) — zugleich Reihenfolge der Liste „Deine Entscheidungen“. */
export const ENTSCHEIDUNGS_ARTEN = ['freigabe', 'rueckfrage', 'lauf', 'startproblem', 'befund']

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
 * Baut die Einträge von „Deine Entscheidungen“ (F44 WS-2a, Abgleich F-725 C1–C3) aus dem
 * Zustands-Aggregat und den offenen P0/P1-Workitems. Rein (kein I/O, kein DOM), damit
 * views/attention.js und in WS-2b „Deine nächsten Entscheidungen“ in views/dashboard.js
 * dieselbe Auswahl, Reihenfolge und Beschriftung zeigen. Filterregeln wie oben
 * (filtereAttentionWorkflows/filtereAttentionLaeufe), keine zweite Regel.
 *
 * Reihenfolge: Freigaben (naechster.art haltFreigabe) → Rückfragen (haltKlaerung) →
 * unbestätigte fehlgeschlagene Läufe → Startprobleme → Befunde (P0 vor P1). Innerhalb einer Art
 * bleibt die Reihenfolge der Quelle.
 *
 * Ein Eintrag: { art, id, titel, satz, hash, prioritaet?, zeitpunkt?, zeitstempel?, fehler? }.
 * `titel` ist der menschenlesbare Titel aus dem Aggregat (Workflow-Ziel, Auftragstitel des
 * Laufs, Workitem-Titel), sonst die ID. `satz` ist der Servertext `grund` (nur Workflows), sonst
 * null — die View setzt dann einen übersetzten Standardsatz. `hash` ist das Navigationsziel;
 * Startprobleme haben keines (flüchtige Projektion ohne Detailroute), tragen dafür Zeitstempel,
 * laufId und Fehlertext. Alle Texte sind roh (Server-/Projekttexte) und müssen beim Rendern
 * escaped werden.
 *
 * @param zustand - Aggregat aus dem Poll ({ workflows, laeufe, startfehler }, je null bei defekter Quelle), oder null vor dem ersten Tick
 * @param workitems - offene P0/P1-Workitems (holeOffeneP0P1Workitems().workitems), null bei defekter Quelle, undefined solange der Abruf läuft
 * @returns { gruppen: { workflows, laeufe, startfehler, workitems } je Eintrag[] (null = defekt, undefined = lädt), eintraege: alle vorhandenen Einträge in Listenreihenfolge, zaehler: je Gruppe Anzahl oder null/undefined, defekt: mindestens eine Quelle null, alleLeer: alle vier Quellen geladen und leer }
 */
export function baueEntscheidungen(zustand, workitems) {
  const workflowsRoh = zustand === null ? undefined : filtereAttentionWorkflows(zustand.workflows ?? null)
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
        }))
      : workflowsRoh,
    laeufe: Array.isArray(laeufeRoh)
      ? laeufeRoh.map((l) => ({
          art: 'lauf',
          id: l.laufId,
          titel: textOderNull(l.auftragsbezug?.titel) ?? l.laufId,
          satz: null,
          hash: `#/runs/${encodeURIComponent(l.laufId)}`,
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
            prioritaet: w.prioritaet,
          }))
      : workitems,
  }

  const listen = [gruppen.workflows, gruppen.laeufe, gruppen.startfehler, gruppen.workitems]
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
