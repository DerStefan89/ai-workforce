/**
 * Datei: scripts/leitstand/f35-ws3-adjust-automatik.mjs
 *
 * Zweck: F35 WS-3 (features/F35/feature.md, zielfassung.md §13.6 E-M5-4) —
 * endet ein Review-Schritt mit Urteil BLOCKIERT oder mit AK-Verstößen
 * (F35 WS-2, Regel 1i), legt der Kern AUTOMATISCH dieselbe Abnahme-
 * Entscheidung an, die bislang nur ein Mensch über POST
 * /api/workflows/<id>/abnahme (ergebnis 'ANPASSUNG_ANGEFORDERT') anlegen
 * konnte — mit Lineage-herkunft.erzeuger 'kern' statt 'mensch'.
 *
 * Reine Fachlogik, kein I/O (Muster src/ak-pruefung/index.ts,
 * src/korrekturschleife/index.ts): baueAutomatischeAnpassungsBegruendung baut
 * die Begründung, ermittleAutomatischeAnpassung entscheidet, OB der Kern
 * jetzt auslösen soll, zaehleKernVersionen zählt die Rückwege der Bau-Stufe.
 * Importiert nur listeVersionen (Lesezugriff, kein Schreiben) aus
 * src/lineage-registry.
 *
 * F45 B2b-1a (features/F45/plan-b2b1.md, löst F-203 für die Bau-Stufe und den
 * Halt-Teil von F-981): die Grenze kommt aus grenzen.max_replans des Workflows
 * (Summe über die Stufen), je Stufe höchstens GRENZE_JE_STUFE Rückweg —
 * pruefeRueckweg ist die eine Regel für Bau- und Plan-Stufe (F45 B2b-1b-2a:
 * ermittlePlanRueckweg, baueSchritteFuerPlanRueckweg, uebernimmRueckwege,
 * planStufenSatz — Plan v2 nach FREIGEGEBEN_MIT_AUFLAGEN/UEBERARBEITEN).
 * Meldet der Review nach einer Korrektur dieselben Befunde
 * (sindDieselbenBefunde), gibt es keinen weiteren Rückweg.
 * pruefschrittWiederholbar ist die Vorbedingung von „Prüfer wiederholen“
 * (POST /api/workflows/<id>/pruefer-wiederholen, F-1085 (1)): ein Prüfschritt
 * (code-reviewer, architecture-advisor, seit F45 B2b-2b-1 qa) läuft nach Werkzeugausfall oder
 * unlesbarem Ergebnis allein erneut — das zählt nicht als Rückweg.
 * F45 B2b-2b-1 (F-820, features/F45/plan-b2b2b.md): folgt dem Review ein qa-Schritt, entscheidet
 * ermittleAutomatischeAnpassung im Nachlauf des qa (qaErgebnis) — Review und qa zusammen eine Runde,
 * Wiederholung über beide Befundlisten, die Begründung nennt beide Urteile und je Herkunft die Befunde.
 *
 * Die eigentliche Schreiblogik (Entscheidungsartefakt registrieren,
 * Ausführungs-/Review-Schritt zurücksetzen — 'wendeAutomatischeAnpassungAn')
 * bleibt bewusst in scripts/leitstand-server.mjs stehen, NICHT hier: sie
 * ruft schreibeWorkflowFortschritt auf, und genau diese Aufrufstellen prüft
 * scripts/check-f15-workflow.mjs (F-228, textuelle Zählung "jede
 * Schreibstelle liest den GESTOPPT-Schutz") ausschließlich innerhalb DIESER
 * einen Datei — ein zweiter Aufrufort in einem anderen Modul unterliefe
 * diese Prüfung, ohne dass sie es bemerkte (Muster
 * scripts/leitstand/routen-f39.mjs, Kopfkommentar: "der POST-Dispatch selbst
 * ... bleibt im Server").
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (Auslöser-Prüfung im
 * starteWorkflowSchritt-Rückruf, Begründung dort UND im POST
 * .../abnahme-Handler für erzeuger 'mensch', Grenze/GET-Projektion),
 * scripts/check-f35-ws3-adjust-automatik.mjs,
 * scripts/leitstand/f35-ws3-adjust-automatik.test.mjs,
 * scripts/check-f45-b2b1-rueckweg.mjs.
 */

import { listeVersionen } from '../../src/lineage-registry/index.ts'
import { istReviewBeanstandet, planV2Sprungziel } from '../../src/workflow/index.ts'

/** Höchstens ein automatischer Rückweg je Stufe (Stefan, B2b-1: wie der manuelle Ablauf, eine Korrekturrunde). */
const GRENZE_JE_STUFE = 1

/** Anzeigename je Stufe für die lesbaren Halt-Gründe. */
const STUFEN_NAMEN = { bau: 'Bau-Stufe', plan: 'Plan-Stufe' }

/** Satz, mit dem jeder Rückweg-Halt endet: der Weg des Menschen — je Stufe (F45 B2b-1b-2a: in der Plan-Stufe entscheidet Stefan bei der Freigabe der Ausführung). */
const AUSWEG = { bau: 'Entscheide selbst: „Anpassung wünschen“ oder „Ablehnen“.', plan: 'Entscheide bei der Freigabe der Ausführung: Freigeben oder Ablehnen.' }

/** Vorsatz der Grenz-Gründe je Stufe (erste / weitere Korrekturrunde). Die Plan-Stufe trägt keinen: ihr Satz steht hinter „Kein Plan v2:“ (Delta-Advisor D8). */
const GRENZ_VORSATZ = { bau: { erste: 'Keine automatische Anpassung: ', weitere: 'Keine weitere automatische Anpassung: ' }, plan: { erste: '', weitere: '' } }

/** Lesbare Advisor-Urteile für die Halt-Gründe (keine internen Kennungen im sichtbaren Text). */
const ADVISOR_URTEIL_TEXT = { FREIGEGEBEN: 'freigegeben', FREIGEGEBEN_MIT_AUFLAGEN: 'freigegeben mit Auflagen', UEBERARBEITEN: 'überarbeiten' }

/** Advisor-Urteile, die Plan v2 verlangen (schemas/ergebnis-architecture-advisor.schema.json). */
const PLAN_V2_URTEILE = new Set(['FREIGEGEBEN_MIT_AUFLAGEN', 'UEBERARBEITEN'])

/** So viele Befunde nennt der Wiederholungs-Grund höchstens, der Rest als „+n weitere“ (der Grund steht in Listen ohne Kürzung). */
const MAX_GENANNTE_BEFUNDE = 3

/** Die drei Gesamturteile aus schemas/ergebnis-code-reviewer.schema.json — nur sie dürfen die Automatik auslösen (AK18, K1). */
const BEKANNTE_URTEILE = new Set(['BEREIT', 'BEREIT_NACH_KORREKTUR', 'BLOCKIERT'])

/** Name der Kernartefakt-Kette einer Workflow-Abnahme-Entscheidung — dieselbe ID wie GET/POST /api/workflows/<id>/abnahme (D5, kein zweiter Lesepfad). */
function abnahmeArtefaktId(workflowId) {
  return `entscheidung-workflow-${workflowId}-abnahme`
}

/**
 * Zählt die bisherigen AUTOMATISCH (herkunft.erzeuger 'kern') erzeugten
 * Abnahme-Versionen eines Workflows (= Rückwege der Bau-Stufe; eine
 * menschliche „Anpassung wünschen“ zählt nicht) — genutzt sowohl vom Auslöser
 * (pruefeRueckweg, vor dem Schreiben gezählt) als
 * auch von der GET-Projektion (automatische_iteration, nach dem Laden der
 * aktuellen Version gezählt) — EINE Funktion, zwei Aufrufer.
 * @param workflowId - id des betroffenen Workflows
 * @param ladeOptionen - { basisVerzeichnis, schreiber }
 * @returns Anzahl der bisher mit erzeuger 'kern' geschriebenen Abnahme-Versionen
 */
export function zaehleKernVersionen(workflowId, ladeOptionen) {
  return listeVersionen(abnahmeArtefaktId(workflowId), ladeOptionen).filter((version) => version.herkunft?.erzeuger === 'kern').length
}

/**
 * Baut die Begründung einer automatischen Anpassung — reine Funktion,
 * deterministisch, minLength-konform (der feste Kopf allein reicht bereits,
 * nie leer). Muster baueReviewKorrekturInstruktion (src/korrekturschleife/
 * index.ts): Befunde als nummerierte Liste, AK-Verstöße als Liste — die
 * Verstoß-Strings aus pruefeAkUrteile (src/ak-pruefung/index.ts) nennen die
 * betroffene ak_id bereits wörtlich, keine Zusatzlogik nötig.
 * @param urteil - das Gesamturteil des Reviews ('BLOCKIERT' im Regelfall, kann bei reinen AK-Verstößen auch 'BEREIT'/'BEREIT_NACH_KORREKTUR' sein), oder null/undefined
 * @param befunde - befunde[] aus dem geparsten Reviewer-Ergebnis (schwere/fundstelle/zusammenfassung)
 * @param akVerstoesse - Verstoß-Strings aus pruefeAkUrteile, ggf. leer
 * @param iteration - 1-basierte Nummer dieses Rückwegs der Bau-Stufe (1..GRENZE_JE_STUFE)
 * @param qaErgebnis - F45 B2b-2b-1 (F-820): { urteil, befunde } der Prüfung aus Nutzersicht derselben Runde, oder null
 *   (Vorgabe) — dann bitgleich wie zuvor; sonst nennt der Kopf beide Urteile und je Herkunft steht ein eigener Abschnitt
 * @returns die Begründung als Text
 */
export function baueAutomatischeAnpassungsBegruendung(urteil, befunde, akVerstoesse, iteration, qaErgebnis = null) {
  const qaKopf = qaErgebnis === null ? '' : ` und Urteil der Prüfung aus Nutzersicht (qa) ${qaErgebnis.urteil ?? 'unbekannt'}`
  const zeilen = [`Automatische Anpassung (Korrekturrunde ${iteration} von ${GRENZE_JE_STUFE}, Bau-Stufe) nach Review-Urteil ${urteil ?? 'unbekannt'}${qaKopf}:`]
  const abschnitt = (titel, liste) => {
    if (liste.length === 0) return
    zeilen.push('', titel)
    liste.forEach((befund, index) => {
      zeilen.push(`${index + 1}. [${befund.schwere ?? '?'}] ${befund.fundstelle ?? '?'} — ${befund.zusammenfassung ?? ''}`)
    })
  }
  abschnitt(qaErgebnis === null ? 'Befunde:' : 'Befunde des Reviews:', befunde)
  if (qaErgebnis !== null) abschnitt('Befunde der Prüfung aus Nutzersicht (qa):', Array.isArray(qaErgebnis.befunde) ? qaErgebnis.befunde : [])
  if (akVerstoesse.length > 0) {
    zeilen.push('', 'Verletzte Akzeptanzkriterien:')
    akVerstoesse.forEach((verstoss) => zeilen.push(`- ${verstoss}`))
  }
  return zeilen.join('\n')
}

/**
 * Reine Entscheidungsfunktion: soll der Kern JETZT automatisch
 * 'ANPASSUNG_ANGEFORDERT' anlegen? Bauauftrag Punkt 2, alle Bedingungen
 * müssen gelten. Bewusst OHNE D13-Parameter — der Aufrufer (der
 * starteLaufUndVergiss-Rückruf in starteWorkflowSchritt) prüft laufAktiv/
 * globalerLaufZustand.aktiv selbst, VOR dem Aufruf dieser Funktion, weil
 * D13 dort strukturell (synchroner Tick, kein await) immer erfüllt ist —
 * eine Tiefenverteidigung ohne eigenen Rot-Fall gehört an die Aufrufstelle,
 * nicht in diese reine Funktion.
 *
 * F45 B2b-1a: nach den Auslösebedingungen zuerst die Wiederholung (dieselben Befunde wie im Review vor der letzten
 * Anpassung), dann die Grenze (pruefeRueckweg, max_replans). Nur diese beiden Ablehnungen tragen `art` — genau dann
 * hängt der Aufrufer den Grund an den Halt (Advisor B10: ein 1k- oder Urteil-Halt bekommt keinen Grenzsatz).
 * @param eingabe - { outputSchema, schrittStatus, heilbar, urteil, akVerstoesse, anzahlBisherigerKernVersionen,
 *   maxReplans (grenzen.max_replans), befunde (dieses Reviews), vorherigeBefunde (Review vor der letzten Anpassung, sonst null),
 *   planRueckwege (zaehlePlanRueckwege, F45 B2b-1b-2a; Vorgabe 0), qaErgebnis (F45 B2b-2b-1: { urteil, befunde } des
 *   qa-Laufs, nur beim Aufruf aus dem qa-Nachlauf mit outputSchema 'ergebnis-qa'; dann sind urteil/akVerstoesse/befunde die des
 *   Reviews derselben Runde, ausgelöst wird bei beanstandetem Review ODER qa BLOCKIERT, Wiederholung über beide Befundlisten) }
 * @returns { ausloesen: true } oder { ausloesen: false, grund, art? } — art 'wiederholung' | 'grenze' nur bei diesen Ablehnungen
 */
export function ermittleAutomatischeAnpassung({ outputSchema, schrittStatus, heilbar, urteil, akVerstoesse, anzahlBisherigerKernVersionen, maxReplans, befunde = [], vorherigeBefunde = null, planRueckwege = 0, qaErgebnis = null }) {
  const mitQa = outputSchema === 'ergebnis-qa'
  if (outputSchema !== 'ergebnis-code-reviewer' && !mitQa) {
    return { ausloesen: false, grund: "output_schema ist nicht 'ergebnis-code-reviewer'" }
  }
  if (mitQa && (qaErgebnis === null || typeof qaErgebnis !== 'object')) {
    return { ausloesen: false, grund: 'Kein gültiges Ergebnis der Prüfung aus Nutzersicht — Entscheidung beim Menschen' }
  }
  if (heilbar) {
    return { ausloesen: false, grund: 'Lauf ist heilbar (kein Checkpoint geschrieben) — kein auswertbares Ergebnis' }
  }
  if (schrittStatus !== 'ERFOLGREICH') {
    return { ausloesen: false, grund: `Lauf ist '${schrittStatus}', nicht ERFOLGREICH` }
  }
  // K1 (features/F35/review-pass.md, AK18): ohne eines der drei bekannten
  // Urteile entscheidet der Mensch — auch dann, wenn zusätzlich AK-Verstöße
  // vorliegen (Regel 1b hält den Workflow ohnehin in KLAERUNG_ERFORDERLICH).
  if (!BEKANNTE_URTEILE.has(urteil)) {
    return { ausloesen: false, grund: 'Urteil fehlt/unbekannt — Entscheidung beim Menschen (AK18)' }
  }
  if (mitQa && !BEKANNTE_URTEILE.has(qaErgebnis.urteil)) {
    return { ausloesen: false, grund: 'Urteil der Prüfung aus Nutzersicht fehlt/unbekannt — Entscheidung beim Menschen' }
  }
  // F45 B2b-2b-1 (Advisor A3): „beanstandet“ an EINER Stelle (src/workflow, istReviewBeanstandet) — dieselbe wie Regel 1q.
  if (!istReviewBeanstandet(urteil, akVerstoesse) && !(mitQa && qaErgebnis.urteil === 'BLOCKIERT')) {
    return { ausloesen: false, grund: mitQa ? 'Weder der Review noch die Prüfung aus Nutzersicht beanstanden' : `Urteil '${urteil ?? 'fehlend'}' ist nicht 'BLOCKIERT' und es gibt keine AK-Verstöße` }
  }
  // Wiederholung über beide Prüfer (Schlüssel Schwere|Datei wie bisher, die Herkunft zählt nicht — Plan O3).
  const alleBefunde = mitQa ? [...befunde, ...(Array.isArray(qaErgebnis.befunde) ? qaErgebnis.befunde : [])] : befunde
  if (sindDieselbenBefunde(vorherigeBefunde, alleBefunde)) {
    return {
      ausloesen: false,
      art: 'wiederholung',
      grund: `Keine weitere automatische Anpassung: ${mitQa ? 'Die Prüfer melden' : 'Der Review meldet'} nach der Korrektur dieselben Befunde wie zuvor (${nenneBefunde(alleBefunde)}). ${AUSWEG.bau}`,
    }
  }
  // F45 B2b-1b-2a: max_replans ist die Summe über beide Stufen — ein Plan v2 verbraucht eine Runde mit.
  const rueckweg = pruefeRueckweg({ stufe: 'bau', rueckwegeStufe: anzahlBisherigerKernVersionen, rueckwegeGesamt: anzahlBisherigerKernVersionen + planRueckwege, maxReplans })
  if (!rueckweg.erlaubt) return { ausloesen: false, art: rueckweg.art, grund: rueckweg.grund }
  return { ausloesen: true }
}

/**
 * Die eine Rückweg-Regel (F45 B2b-1a, Umfang 1): je Stufe höchstens GRENZE_JE_STUFE automatischer Rückweg, über alle
 * Stufen zusammen höchstens grenzen.max_replans. Ein fehlendes oder ungültiges max_replans sperrt (fail closed — der
 * Validator verlangt das Feld, ein solcher Datensatz käme nur über einen Fehler hier an); ebenso nicht ganzzahlige
 * Zählungen. Reine Funktion. Bau-Stufe:
 * ermittleAutomatischeAnpassung; Plan-Stufe (F45 B2b-1b-2a): ermittlePlanRueckweg — beide mit rueckwegeGesamt = Bau + Plan.
 * Die Gründe sind für Stefan geschrieben (Prüfpass B2b-1a): „Korrekturrunde“ statt interner Feldnamen, keine Zählung
 * „n von 1“ (Bestandsabläufe aus der Zeit der Grenze 3 trügen sonst „3 von 1“). Die Bau-Texte sind seit B2b-1a bitgleich;
 * die Plan-Stufe trägt keinen Vorsatz und ihren eigenen Ausweg.
 * @param eingabe - { stufe ('bau' | 'plan'), rueckwegeStufe, rueckwegeGesamt, maxReplans }
 * @returns { erlaubt: true } oder { erlaubt: false, art: 'grenze', grund } mit lesbarem Grund
 */
export function pruefeRueckweg({ stufe, rueckwegeStufe, rueckwegeGesamt, maxReplans }) {
  const name = STUFEN_NAMEN[stufe] ?? stufe
  const vorsatz = GRENZ_VORSATZ[stufe] ?? GRENZ_VORSATZ.bau
  const ausweg = AUSWEG[stufe] ?? AUSWEG.bau
  const gesperrt = (art, satz) => ({ erlaubt: false, art: 'grenze', grund: `${vorsatz[art]}${satz} ${ausweg}` })
  if (!Number.isInteger(maxReplans) || maxReplans < 0) return gesperrt('erste', 'Die Grenze der Korrekturrunden dieses Ablaufs ist nicht lesbar.')
  // Fail closed auch bei den Zählungen (Code-Review B2b-1b-2a 2): NaN/undefined bestünde jeden Vergleich unten.
  if (!Number.isInteger(rueckwegeStufe) || !Number.isInteger(rueckwegeGesamt)) return gesperrt('erste', 'Die bisherigen Korrekturrunden dieses Ablaufs sind nicht zählbar.')
  if (maxReplans === 0) return gesperrt('erste', 'Die Vorlage dieses Ablaufs erlaubt keine automatische Korrekturrunde.')
  if (rueckwegeStufe >= GRENZE_JE_STUFE) return gesperrt('weitere', `Die ${name} hatte ihre eine automatische Korrekturrunde schon.`)
  if (rueckwegeGesamt >= maxReplans) return gesperrt('weitere', `Die automatischen Korrekturrunden dieses Ablaufs (höchstens ${maxReplans}) sind verbraucht.`)
  return { erlaubt: true }
}

// ─── F45 B2b-1b-2a: Rückweg der Plan-Stufe (features/F45/plan-b2b1b2.md) ───────────────────────────────────────────
// Reine Funktionen. Geschrieben wird im Server (Nachlauf des Advisors, im SELBEN Schreibvorgang wie dessen Ausgang —
// F-228-Begründung im Dateikopf); gestartet wird nichts Neues (in hoch hält der Architekt an seiner ZWINGEND-Freigabe).

/**
 * Rückwege der Plan-Stufe (Advisor B7): 1, sobald ein Architekt-Schritt den Rückweg trägt (er schreibt Plan v2), sonst 0.
 * @param schritte - Schrittliste des Workflows (beliebiger Wert; kein Array = 0)
 * @returns 0 oder 1
 */
export function zaehlePlanRueckwege(schritte) {
  return Array.isArray(schritte) && schritte.some((s) => s?.rolle === 'architekt' && s.rueckweg !== undefined) ? 1 : 0
}

/**
 * Soll nach einem gültigen Advisor-Urteil Plan v2 entstehen? Nur bei FREIGEGEBEN_MIT_AUFLAGEN/UEBERARBEITEN, nur mit einem
 * gelaufenen Architekten direkt vor dem Advisor, und nur innerhalb der Rückweg-Regel (pruefeRueckweg, Plan-Stufe; „Plan v2
 * lief schon“ ist deren Stufengrenze, Delta-Advisor D4). Urteil und Befundzahl reist mit (Halt-Gründe, planStufenSatz).
 * @param eingabe - { schritte (aktuelle Fassung, datenMitSchritt), maxReplans, advisorSchrittId, urteil, befundAnzahl, kernVersionen (zaehleKernVersionen) }
 * @returns { ausloesen: true, architektSchrittId, urteil, befundAnzahl } oder { ausloesen: false, art?, grund, urteil, befundAnzahl } — art 'grenze' nur aus pruefeRueckweg
 */
export function ermittlePlanRueckweg({ schritte, maxReplans, advisorSchrittId, urteil, befundAnzahl, kernVersionen }) {
  const basis = { urteil, befundAnzahl }
  if (!PLAN_V2_URTEILE.has(urteil)) return { ...basis, ausloesen: false, grund: 'Der Advisor hat den Plan freigegeben.' }
  const architekt = (Array.isArray(schritte) ? schritte : []).find((s) => s?.nachfolger === advisorSchrittId)
  if (architekt === undefined || architekt.rolle !== 'architekt' || architekt.status !== 'ERFOLGREICH' || typeof architekt.lauf_id !== 'string') {
    return { ...basis, ausloesen: false, grund: `Vor dem Advisor steht kein gelaufener Architekt, der den Plan überarbeiten könnte. ${AUSWEG.plan}` }
  }
  const planRueckwege = zaehlePlanRueckwege(schritte)
  const regel = pruefeRueckweg({ stufe: 'plan', rueckwegeStufe: planRueckwege, rueckwegeGesamt: planRueckwege + kernVersionen, maxReplans })
  if (!regel.erlaubt) return { ...basis, ausloesen: false, art: regel.art, grund: regel.grund }
  return { ...basis, ausloesen: true, architektSchrittId: architekt.schritt_id }
}

/**
 * F45 B2b-1b-2b (F-1108): der Satz „Kein Plan v2: <Grund>“ zur LESEZEIT (Projektion planFreigabe), für jede Lage „Urteil ≠
 * FREIGEGEBEN, kein Rückweg für diesen Advisor-Lauf“ — auch dort, wo der gespeicherte Halt-Grund ihn nicht trägt (Nachlauf
 * traf auf GESTOPPT, danach Reparatur; Bestand aus 1b-1). „Plan v2 lief“ heißt: der Architekt vor dem Advisor trägt den
 * Rückweg genau dieses Laufs (dieselbe Bedingung wie planV2Sprungziel). Sonst entscheidet ermittlePlanRueckweg auf dem
 * heutigen Stand: gesperrt ⇒ dessen Grund; „würde auslösen“ ⇒ der Rückweg ist damals nicht gelaufen (eigener Satz).
 * @param eingabe - wie ermittlePlanRueckweg, dazu advisorLaufId (lauf_id des Advisor-Ergebnisses, das die Seite zeigt)
 * @returns Grund (Text ohne Kennungen) oder null
 */
export function ermittleKeinPlanV2({ schritte, maxReplans, advisorSchrittId, advisorLaufId, urteil, befundAnzahl, kernVersionen }) {
  if (!PLAN_V2_URTEILE.has(urteil)) return null
  const architekt = (Array.isArray(schritte) ? schritte : []).find((s) => s?.nachfolger === advisorSchrittId)
  if (architekt?.rolle === 'architekt' && architekt.rueckweg?.anlass_lauf_id === advisorLaufId) return null
  const entscheid = ermittlePlanRueckweg({ schritte, maxReplans, advisorSchrittId, urteil, befundAnzahl, kernVersionen })
  if (!entscheid.ausloesen) return entscheid.grund
  return `Plan v2 wurde für dieses Advisor-Ergebnis nicht ausgelöst (der Ablauf war angehalten oder stammt aus der Zeit vor Plan v2). ${AUSWEG.plan}`
}

/**
 * Schrittliste der neuen Fassung beim Rückweg der Plan-Stufe: der Architekt steht wieder OFFEN (lauf_id null, ohne
 * freigabe_erteilt — ein neuer Lauf braucht eine neue Freigabe) und trägt den Rückweg; der Advisor bleibt ERFOLGREICH mit
 * seinem Lauf (Regel 3a springt nach Plan v2 über genau ihn). B13: der Nachfolger des Advisors verliert die Eingabe
 * 'artefakt:ergebnis-@<advisor>' (Bestands-hoch) — die Ausführung bekommt nur den letzten Plan.
 * @param schritte - Schrittliste (datenMitSchritt.schritte, Advisor bereits mit seinem Ausgang)
 * @param ids - { architektSchrittId, advisorSchrittId }
 * @returns neue Schrittliste (Eingabe unverändert)
 */
export function baueSchritteFuerPlanRueckweg(schritte, { architektSchrittId, advisorSchrittId }) {
  const architekt = schritte.find((s) => s.schritt_id === architektSchrittId)
  const advisor = schritte.find((s) => s.schritt_id === advisorSchrittId)
  return schritte.map((s) => {
    if (s.schritt_id === architektSchrittId) {
      const { freigabe_erteilt: _verworfen, ...rest } = s
      return { ...rest, status: 'OFFEN', lauf_id: null, rueckweg: { anlass_schritt_id: advisorSchrittId, anlass_lauf_id: advisor.lauf_id, vorheriger_lauf_id: architekt.lauf_id } }
    }
    if (s.schritt_id === advisor.nachfolger) return { ...s, eingaben: s.eingaben.filter((e) => e !== `artefakt:ergebnis-@${advisorSchrittId}`) }
    return s
  })
}

/**
 * Der Rückweg gehört dem Server (Advisor B11, Delta-Advisor M1/D7): eine eingereichte Fassung (POST /api/workflows) bringt
 * ihn nie mit; je Architekt-Schritt wird der Wert der gespeicherten Fassung übernommen — nur, wenn der Schritt dort und im
 * Body die Rolle architekt trägt und der Anlass-Schritt im Body existiert. Danach validiert der Aufrufer den Datensatz.
 * @param bodySchritte - Schrittliste aus dem Body (bereits formgeprüft)
 * @param gespeicherteSchritte - Schrittliste der gespeicherten Fassung, oder null (keine)
 * @returns Schrittliste ohne Body-rueckweg, ggf. mit übernommenem
 */
export function uebernimmRueckwege(bodySchritte, gespeicherteSchritte) {
  const ids = new Set(bodySchritte.map((s) => s.schritt_id))
  return bodySchritte.map((s) => {
    const { rueckweg: _ausBody, ...rest } = s
    const gespeichert = Array.isArray(gespeicherteSchritte) ? gespeicherteSchritte.find((g) => g?.schritt_id === s.schritt_id) : undefined
    const rueckweg = gespeichert?.rolle === 'architekt' && s.rolle === 'architekt' ? gespeichert.rueckweg : undefined
    // Nur ein formgültiger gespeicherter Wert wird übernommen (Nachpass Code-Review): ein beschädigter Bestand bliebe sonst
    // dauerhaft bei 400 bzw. würfe hier — er soll ersetzbar bleiben wie jeder ungültige Bestand.
    const formgueltig = typeof rueckweg === 'object' && rueckweg !== null && ['anlass_schritt_id', 'anlass_lauf_id', 'vorheriger_lauf_id'].every((feld) => typeof rueckweg[feld] === 'string' && rueckweg[feld].length > 0)
    return formgueltig && ids.has(rueckweg.anlass_schritt_id) ? { ...rest, rueckweg } : rest
  })
}

/**
 * Der Satz der Plan-Stufe am Grund eines Freigabe-Halts (Delta-Advisor D2/M2) — bis B2b-1b-2b die einzige Stelle, an
 * der Stefan sieht, warum die Freigabe ansteht: Plan v2 folgt (Freigabe des Architekten), Plan v2 entfällt mit Grund
 * (Freigabe der Ausführung), oder Plan v2 liegt vor und der Advisor prüft ihn nicht erneut (Regel 3a hat gegriffen).
 * @param eingabe - { naechster (Ausgang von ermittleNaechstenSchritt), schritte (Fassung, auf der er berechnet wurde),
 *   vorschrittId (gerade gemeldeter Schritt), planEntscheid (ermittlePlanRueckweg nach einem Advisor-Lauf, sonst null) }
 * @returns Satz oder null
 */
export function planStufenSatz({ naechster, schritte, vorschrittId, planEntscheid }) {
  if (naechster?.art !== 'haltFreigabe') return null
  if (planEntscheid !== null && planEntscheid !== undefined) {
    const urteil = `Urteil „${ADVISOR_URTEIL_TEXT[planEntscheid.urteil] ?? planEntscheid.urteil}“`
    if (planEntscheid.ausloesen) return `Plan v2: Der Architekt überarbeitet den Plan mit ${planEntscheid.befundAnzahl} Befund(en) des Advisors (${urteil}).`
    if (PLAN_V2_URTEILE.has(planEntscheid.urteil)) return `Advisor: ${urteil} mit ${planEntscheid.befundAnzahl} Befund(en). Kein Plan v2: ${planEntscheid.grund}`
    return null
  }
  const liste = Array.isArray(schritte) ? schritte : []
  const vorschritt = liste.find((s) => s?.schritt_id === vorschrittId)
  // Dieselbe Sprung-Regel wie ermittleNaechstenSchritt (Regel 3a) — der Satz erscheint nur, wenn der Sprung wirklich griff.
  const anlass = vorschritt === undefined ? undefined : planV2Sprungziel(liste, vorschritt)
  if (anlass === undefined || naechster.schrittId !== anlass.nachfolger) return null
  return 'Plan v2 liegt vor; der Advisor prüft ihn nicht erneut. Plan v2 und die Befunde des Advisors stehen in den Läufen des Architekten und des Advisors.'
}

/**
 * Dateipfad einer Fundstelle ohne Zeilen- und Spaltenangabe am Ende (":12", ":12:5", ":12-20", "#L12", "Z. 12",
 * "(Zeile 12)", "line 12") — nach einer Korrektur verschieben sich Zeilen, derselbe Befund soll trotzdem als derselbe
 * gelten (Advisor B8). Abgeschnitten wird nur am Ende und nur, wenn davor ein Pfad bleibt.
 * @param fundstelle - Fundstelle eines Befunds (beliebiger Wert)
 * @returns der bereinigte Pfad (leer bei fehlendem Wert)
 */
function dateipfadAusFundstelle(fundstelle) {
  if (typeof fundstelle !== 'string') return ''
  const roh = fundstelle.trim()
  // F-1104 (11): kombinierte Formen ('src/a.ts:12 (Zeile 12)') — abschneiden, bis sich nichts mehr ändert.
  let ohneZeile = roh
  for (let vorher = ''; vorher !== ohneZeile; ) {
    vorher = ohneZeile
    ohneZeile = ohneZeile
      .replace(/(?::\d+(?:[-–—]\d+)?(?::\d+)?|#L\d+(?:-L?\d+)?)$/u, '')
      .replace(/,?\s*\(?\s*(?:Z\.|Zeilen?|line|lines)\s*\d[\d\s,–—-]*\)?$/iu, '')
      .trim()
  }
  return ohneZeile.length > 0 ? ohneZeile : roh
}

/**
 * Schlüsselmenge „Schwere|Dateipfad“ einer Befundliste. Ein Befund ohne Fundstelle macht die Liste unvergleichbar
 * (null): zwei Befunde „HOCH ohne Datei“ wären sonst fälschlich derselbe.
 * @param befunde - Befundliste (beliebiger Wert; kein Array = leer)
 * @returns Set der Schlüssel, oder null, wenn ein Befund keine Fundstelle trägt
 */
function befundSchluessel(befunde) {
  if (!Array.isArray(befunde)) return new Set()
  const schluessel = new Set()
  for (const befund of befunde) {
    const pfad = dateipfadAusFundstelle(befund?.fundstelle)
    if (pfad === '') return null
    schluessel.add(`${befund?.schwere ?? '?'}|${pfad}`)
  }
  return schluessel
}

/**
 * Nennt Befunde lesbar („HOCH in src/a.ts“), höchstens MAX_GENANNTE_BEFUNDE, der Rest als „+n weitere“.
 * @param befunde - Befundliste
 * @returns Text
 */
function nenneBefunde(befunde) {
  const liste = [...(befundSchluessel(befunde) ?? [])].map((schluessel) => schluessel.replace('|', ' in '))
  const rest = liste.length - MAX_GENANNTE_BEFUNDE
  return rest > 0 ? `${liste.slice(0, MAX_GENANNTE_BEFUNDE).join('; ')}; +${rest} weitere` : liste.join('; ')
}

/**
 * Halt bei Wiederholung (F45 B2b-1a, Umfang 2): meldet der Review nach der Korrektur dieselben Befunde — gleiche, nicht
 * leere Menge aus Schwere und Dateipfad, Reihenfolge und Doppelte egal? Eine Teilmenge (die Korrektur hat einen Teil
 * behoben) ist keine Wiederholung, ein Befund ohne Fundstelle macht den Vergleich unmöglich (keine Wiederholung, die
 * Grenze greift weiterhin). Reine Funktion.
 * @param vorher - Befunde des Reviews vor der letzten Anpassung, oder null
 * @param jetzt - Befunde dieses Reviews
 * @returns true, wenn beide Mengen gleich und nicht leer sind
 */
export function sindDieselbenBefunde(vorher, jetzt) {
  const a = befundSchluessel(vorher)
  const b = befundSchluessel(jetzt)
  if (a === null || b === null || a.size === 0 || a.size !== b.size) return false
  return [...a].every((schluessel) => b.has(schluessel))
}

/** Urteile, mit denen ein Review trägt (Regel 1b) — dieselbe Menge wie src/workflow/index.ts. */
const TRAGENDE_REVIEW_URTEILE = new Set(['BEREIT', 'BEREIT_NACH_KORREKTUR'])

/**
 * Vorbedingung von „Prüfer wiederholen“ (F45 B2b-1a, Umfang 5, Entscheidung Stefan B4; löst F-1085 (1)): der Workflow
 * hält (KLAERUNG_ERFORDERLICH) an einem gelaufenen Prüfschritt, dessen Ergebnis nicht trägt, weil das Werkzeug ausfiel
 * oder das Ergebnis nicht lesbar war — nicht, weil der Prüfer etwas beanstandet hat. Reine Funktion; den `befund` liest
 * der Server aus der Laufakte (ermittlePrueferBefund, dieselben Leser wie im Nachlauf).
 *
 * Review (Rolle code-reviewer) — FEHLGESCHLAGEN (Werkzeugausfall, Zeitgrenze) · ERFOLGREICH mit fehlendem/unbekanntem Urteil (ein
 * unlesbares Ergebnis macht auch die AK-Prüfung gegenstandslos) · ERFOLGREICH mit tragendem Urteil, ohne AK-Verstoß und
 * mit Vertragsverstoß (Regel 1k). BLOCKIERT und AK-Verstöße sind Beanstandungen — dafür gibt es die Anpassung, nicht
 * das Würfeln bis grün (Advisor B9).
 * Advisor (Rolle architecture-advisor) — FEHLGESCHLAGEN · ERFOLGREICH mit Verstößen gegen das Advisor-Schema (Regel 1d; F45
 * B2b-1b, vorher: ohne Urteilszeile). Ein gültiges Urteil mit Befunden ist eine Beanstandung, kein Ausfall — nicht wiederholbar.
 * VERWEIGERT nie: ein lesender Prüfer liefe erneut in dieselbe Ablehnung.
 * qa (output_schema 'ergebnis-qa', F45 B2b-2b-1) — FEHLGESCHLAGEN · ERFOLGREICH mit Verstößen gegen das qa-Schema (Regel 1q (a)).
 * @param eingabe - { workflowStatus, schritt (Cursor-Schritt oder null), befund: { urteil, akVerstoesse, reviewVerstoesse, advisorVerstoesse, qaVerstoesse } }
 * @returns { wiederholbar: true } oder { wiederholbar: false, grund }
 */
export function pruefschrittWiederholbar({ workflowStatus, schritt, befund }) {
  if (workflowStatus !== 'KLAERUNG_ERFORDERLICH') {
    return { wiederholbar: false, grund: `Der Ablauf steht auf '${workflowStatus}' — wiederholbar ist ein Prüfer nur, solange der Ablauf auf Klärung wartet` }
  }
  if (schritt === null || schritt === undefined) return { wiederholbar: false, grund: 'Der Ablauf zeigt auf keinen Schritt' }
  if (schritt.lauf_id === null) return { wiederholbar: false, grund: `Schritt '${schritt.schritt_id}' ist noch nicht gelaufen — er kann normal gestartet werden` }
  const b = befund ?? {}
  if (schritt.output_schema === 'ergebnis-code-reviewer') {
    if (schritt.status === 'FEHLGESCHLAGEN') return { wiederholbar: true }
    if (schritt.status !== 'ERFOLGREICH') return { wiederholbar: false, grund: `Der Review endete ${schritt.status} — nur nach Werkzeugausfall oder unlesbarem Ergebnis wiederholbar` }
    if (b.urteil === 'BLOCKIERT') return { wiederholbar: false, grund: 'Der Review hat BLOCKIERT geurteilt — dafür gibt es „Anpassung wünschen“, nicht die Wiederholung' }
    if (!TRAGENDE_REVIEW_URTEILE.has(b.urteil)) return { wiederholbar: true }
    if (Array.isArray(b.akVerstoesse) && b.akVerstoesse.length > 0) return { wiederholbar: false, grund: 'Der Review meldet verletzte Akzeptanzkriterien — dafür gibt es „Anpassung wünschen“' }
    if (Array.isArray(b.reviewVerstoesse) && b.reviewVerstoesse.length > 0) return { wiederholbar: true }
    return { wiederholbar: false, grund: 'Der Review trägt — es gibt nichts zu wiederholen' }
  }
  // F45 B2b-2b-1 (Advisor A6): die Prüfung aus Nutzersicht (qa) nach Werkzeugausfall oder mit Verstößen gegen das qa-Schema
  // (Regel 1q (a)); jedes gültige Ergebnis ist eine Beurteilung, auch wenn der Halt aus dem Review derselben Runde kommt.
  if (schritt.output_schema === 'ergebnis-qa') {
    if (schritt.status === 'FEHLGESCHLAGEN') return { wiederholbar: true }
    if (schritt.status === 'VERWEIGERT') return { wiederholbar: false, grund: 'Die Prüfung aus Nutzersicht endete VERWEIGERT — ein lesender Prüfer liefe erneut in dieselbe Ablehnung' }
    if (schritt.status === 'ERFOLGREICH' && Array.isArray(b.qaVerstoesse) && b.qaVerstoesse.length > 0) return { wiederholbar: true }
    return { wiederholbar: false, grund: 'Die Prüfung aus Nutzersicht hat ein gültiges Ergebnis — dafür gibt es „Anpassung wünschen“ oder „Ablehnen“, nicht die Wiederholung' }
  }
  if (schritt.rolle === 'architecture-advisor') {
    if (schritt.status === 'FEHLGESCHLAGEN') return { wiederholbar: true }
    if (schritt.status === 'ERFOLGREICH' && Array.isArray(b.advisorVerstoesse) && b.advisorVerstoesse.length > 0) return { wiederholbar: true }
    if (schritt.status === 'VERWEIGERT') return { wiederholbar: false, grund: 'Der Advisor endete VERWEIGERT — ein lesender Prüfer liefe erneut in dieselbe Ablehnung' }
    return { wiederholbar: false, grund: `Der Advisor endete ${schritt.status} mit gültigem Ergebnis — nichts zu wiederholen` }
  }
  return { wiederholbar: false, grund: `Schritt '${schritt.schritt_id}' (${schritt.rolle}) ist kein Prüfschritt — wiederholbar sind nur Review, Advisor und qa` }
}
