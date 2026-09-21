/**
 * Datei: src/jarvis/index.ts
 *
 * Zweck: Jarvis-Modul (F26 WS-1). Zwei Verantwortlichkeiten:
 * validiereErgebnisJarvis prüft ein geparstes Objekt gegen
 * schemas/ergebnis-jarvis.schema.json (Muster validiereErgebnisScout,
 * src/scout/index.ts, D5 — handgeschrieben statt ajv, dieselbe
 * Repo-Entscheidung); baueJarvisAuftragstext baut den Auftragstext, der als
 * EINZIGER Eingabekanal an den Lauf geht (F-269-Muster, Router-Nachweis
 * features/F18/nachweis-ws3-szenario-a.md) — bei router/scout wurde diese
 * Rolleninstruktion je Lauf von Hand in den Auftragstext geschrieben; ein
 * Chat hat keinen Menschen, der das vor jeder Nachricht neu formuliert, also
 * übernimmt der Server es hier (v0, ohne '--output-schema' für claude-code,
 * F-337-Lehre: Enum-Werte wörtlich aufzählen, Codezaun ausdrücklich
 * verbieten). Kein Kernartefaktbau, kein Vorfilter, keine
 * Chat-Verlauf-Schreiblogik: WS-1 liefert die Mechanik bis zum validen
 * Ergebnis, Chat-View und Verlauf (lineage-chat-<projekt>) sind WS-2.
 *
 * F31 WS-2 (löst F-488, "Jarvis ist gedächtnislos"): waehleVerlaufsfenster
 * wählt aus der bereits geladenen 'lineage-chat-<projektId>'-Kette ein
 * begrenztes Fenster (ab dem letzten Zusammenfassungs-Turn, sonst ab Anfang;
 * dann letzte maxTurns; dann von vorn verworfen bis maxZeichen eingehalten
 * ist) — reine Funktion, kein I/O, die Kette selbst lädt weiterhin
 * scripts/leitstand-server.mjs. baueJarvisAuftragstext bekommt dieses
 * Fenster als optionalen zweiten Parameter (Default leeres Array — leerer
 * Verlauf bleibt byte-identisch zum bisherigen WS-1-Text, bestehende Tests
 * unverändert grün) und hängt es als eigenen, klar als Kontext markierten
 * Block vor die eigentliche Nachricht.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (leseJarvisErgebnisAusLaufakte,
 * POST /api/chat, POST /api/chat/zusammenfassen), scripts/check-f26-jarvis.mjs,
 * scripts/check-f31-gedaechtnis.mjs, src/jarvis/jarvis.test.ts.
 */

import type { ErgebnisJarvis, JarvisAktion, JarvisAktionTyp, JarvisArt, JarvisAuftragVorschlag, JarvisBezug, JarvisVerlaufsEintrag } from './types.ts'

const ART = ['antwort', 'auftrag_vorschlag', 'aktion']
const AKTION_TYP = ['routen', 'oeffnen', 'anpassen']

const ERGEBNIS_JARVIS_FELDER = new Set(['art', 'antwort', 'auftrag', 'aktion', 'bezug'])
const AUFTRAG_FELDER = new Set(['titel', 'text'])
const AKTION_FELDER = new Set(['typ', 'ziel'])
const BEZUG_FELDER = new Set(['auftrag_id', 'workitem'])

function istObjekt(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === 'object' && wert !== null && !Array.isArray(wert)
}

function istNichtLeererString(wert: unknown): wert is string {
  return typeof wert === 'string' && wert.length > 0
}

/**
 * F-423: ein Feld gilt als GESETZT, wenn es im Objekt vorkommt UND nicht
 * 'null' ist — ein fehlendes Feld (ältere claude-code-Form) und ein
 * explizit auf 'null' gesetztes Feld (Codex-Form, --output-schema erzwingt
 * jedes 'properties'-Feld in 'required') sind für den Validator
 * gleichbedeutend. Zentral statt an jeder der sechs Kopplungsstellen
 * wiederholt (D5).
 */
function istGesetzt(objekt: Record<string, unknown>, feld: string): boolean {
  return feld in objekt && objekt[feld] !== null
}

/**
 * Prüft daten.auftrag gegen schemas/ergebnis-jarvis.schema.json' auftrag-Form.
 * @param auftrag - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereAuftragVorschlag(auftrag: unknown): string[] {
  if (!istObjekt(auftrag)) return ["'auftrag' muss ein Objekt sein"]
  const verstoesse: string[] = []
  for (const feld of Object.keys(auftrag)) {
    if (!AUFTRAG_FELDER.has(feld)) verstoesse.push(`'auftrag' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of AUFTRAG_FELDER) {
    if (!(feld in auftrag)) verstoesse.push(`'auftrag.${feld}' fehlt`)
  }
  if ('titel' in auftrag && !istNichtLeererString(auftrag.titel)) verstoesse.push("'auftrag.titel' muss ein nicht-leerer String sein")
  if ('text' in auftrag && !istNichtLeererString(auftrag.text)) verstoesse.push("'auftrag.text' muss ein nicht-leerer String sein")
  return verstoesse
}

/**
 * Prüft daten.aktion gegen schemas/ergebnis-jarvis.schema.json' aktion-Form.
 * @param aktion - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereAktion(aktion: unknown): string[] {
  if (!istObjekt(aktion)) return ["'aktion' muss ein Objekt sein"]
  const verstoesse: string[] = []
  for (const feld of Object.keys(aktion)) {
    if (!AKTION_FELDER.has(feld)) verstoesse.push(`'aktion' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of AKTION_FELDER) {
    if (!(feld in aktion)) verstoesse.push(`'aktion.${feld}' fehlt`)
  }
  if ('typ' in aktion && (typeof aktion.typ !== 'string' || !AKTION_TYP.includes(aktion.typ))) {
    verstoesse.push(`'aktion.typ' muss einer von ${AKTION_TYP.join(', ')} sein`)
  }
  if ('ziel' in aktion && !istNichtLeererString(aktion.ziel)) verstoesse.push("'aktion.ziel' muss ein nicht-leerer String sein")
  return verstoesse
}

/**
 * Prüft daten.bezug gegen schemas/ergebnis-jarvis.schema.json' bezug-Form —
 * genau eines von auftrag_id/workitem, nicht beide, nicht keines.
 * @param bezug - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leer = gültig
 */
function validiereBezug(bezug: unknown): string[] {
  if (!istObjekt(bezug)) return ["'bezug' muss ein Objekt sein"]
  const verstoesse: string[] = []
  for (const feld of Object.keys(bezug)) {
    if (!BEZUG_FELDER.has(feld)) verstoesse.push(`'bezug' trägt unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  // F-423: 'auftrag_id'/'workitem' sind im Codex-kompatiblen Schema
  // PFLICHTFELDER mit Typ ["string","null"] (kein 'oneOf' mehr) — ein
  // gesetztes, aber null-wertiges Feld zählt hier wie ein fehlendes.
  const hatAuftragId = istGesetzt(bezug, 'auftrag_id')
  const hatWorkitem = istGesetzt(bezug, 'workitem')
  if (hatAuftragId === hatWorkitem) {
    verstoesse.push("'bezug' muss genau eines von 'auftrag_id' oder 'workitem' tragen, nicht beide oder keines")
  }
  if (hatAuftragId && !istNichtLeererString(bezug.auftrag_id)) verstoesse.push("'bezug.auftrag_id' muss ein nicht-leerer String sein")
  if (hatWorkitem && !istNichtLeererString(bezug.workitem)) verstoesse.push("'bezug.workitem' muss ein nicht-leerer String sein")
  return verstoesse
}

/**
 * Reine Funktion: prüft ein geparstes Objekt gegen
 * schemas/ergebnis-jarvis.schema.json. Keine Seiteneffekte, kein Datei-I/O —
 * Muster validiereErgebnisScout (src/scout/index.ts, D5).
 * @param daten - geparstes, sonst unbekanntes Objekt
 * @returns Liste der Regelverletzungen; leeres Array = gültig
 */
export function validiereErgebnisJarvis(daten: unknown): string[] {
  if (!istObjekt(daten)) {
    return ['Wurzel ist kein Objekt']
  }
  const verstoesse: string[] = []

  for (const feld of Object.keys(daten)) {
    if (!ERGEBNIS_JARVIS_FELDER.has(feld)) verstoesse.push(`unbekanntes Feld '${feld}' (additionalProperties: false)`)
  }
  for (const feld of ['art', 'antwort']) {
    if (!(feld in daten)) verstoesse.push(`Pflichtfeld '${feld}' fehlt`)
  }

  if ('art' in daten && (typeof daten.art !== 'string' || !ART.includes(daten.art))) {
    verstoesse.push(`'art' muss einer von ${ART.join(', ')} sein`)
  }
  if ('antwort' in daten && !istNichtLeererString(daten.antwort)) {
    verstoesse.push("'antwort' muss ein nicht-leerer String sein")
  }
  // F-423: 'auftrag'/'aktion'/'bezug' sind im Codex-kompatiblen Schema
  // TOP-LEVEL PFLICHTFELDER mit Typ ["object","null"] (kein 'allOf'/'if'/'then'
  // mehr) — ein gesetztes, aber null-wertiges Feld zählt hier wie ein
  // fehlendes; der claude-code-Worker (kein --output-schema-Zwang) darf das
  // Feld weiterhin ganz weglassen, beides ist gleichbedeutend.
  const hatAuftrag = istGesetzt(daten, 'auftrag')
  const hatAktion = istGesetzt(daten, 'aktion')
  const hatBezug = istGesetzt(daten, 'bezug')
  if (hatAuftrag) verstoesse.push(...validiereAuftragVorschlag(daten.auftrag))
  if (hatAktion) verstoesse.push(...validiereAktion(daten.aktion))
  if (hatBezug) verstoesse.push(...validiereBezug(daten.bezug))

  // QA-Befund WS-1: 'art' und ihr passendes Unterobjekt sind gekoppelt — ein
  // 'auftrag_vorschlag' ohne 'auftrag' (oder 'aktion' ohne 'aktion') validierte
  // sonst grün, obwohl ein WS-2-Client sich auf das Unterobjekt verlassen würde.
  // Nur noch im Validator erzwungen, nicht mehr im Schema (F-423).
  if (daten.art === 'auftrag_vorschlag' && !hatAuftrag) {
    verstoesse.push("'auftrag' fehlt — bei art 'auftrag_vorschlag' Pflicht")
  }
  if (daten.art === 'aktion' && !hatAktion) {
    verstoesse.push("'aktion' fehlt — bei art 'aktion' Pflicht")
  }

  // WS-2b: 'anpassen' fordert eine Anpassung für einen bestehenden Workflow über den
  // F23-ADJUST-Pfad (POST /api/workflows/<id>/abnahme, 'ergebnis: ANPASSUNG_ANGEFORDERT') an —
  // ohne 'bezug.auftrag_id' wüsste der WS-2b-Client nicht, welcher Workflow gemeint ist; ein
  // Bezug auf ein bloßes Workitem reicht dafür nicht. Nur noch im Validator erzwungen (F-423).
  if (istObjekt(daten.aktion) && daten.aktion.typ === 'anpassen' && !(hatBezug && istObjekt(daten.bezug) && istGesetzt(daten.bezug, 'auftrag_id'))) {
    verstoesse.push("'bezug.auftrag_id' fehlt — bei aktion.typ 'anpassen' Pflicht (kein Bezug auf ein Workitem)")
  }

  return verstoesse
}

/**
 * F31 WS-2: wählt aus einer aufsteigend sortierten Verlaufskette ein
 * begrenztes Fenster für den Prompt. Reine Funktion, kein I/O.
 *
 * Ohne Zusammenfassungs-Turn (kein Eintrag mit istZusammenfassung): unverändertes
 * Vor-Korrektur-Verhalten — die letzten maxTurns Einträge, danach von vorn (den
 * ältesten zuerst) verworfen, bis die Summe aus nachricht.length + antwort.length
 * aller verbliebenen Einträge maxZeichen nicht überschreitet; der jüngste Eintrag
 * bleibt dabei immer erhalten, notfalls hart gekürzt.
 *
 * Mit Zusammenfassungs-Turn (Code-Review-Korrektur, ursprüngliche Spezifikation an
 * dieser Stelle falsch: eine reine "letzte maxTurns der Sub-Kette ab Zusammenfassung"-
 * Kappung konnte die Zusammenfassung selbst verdrängen, sobald genug Folgeturns
 * aufgelaufen waren): der letzte Eintrag mit istZusammenfassung ist IMMER Teil des
 * Fensters (gepinnt) — er ersetzt strukturell alles Ältere, sein Verwerfen widerspräche
 * genau diesem Zweck. maxTurns gilt für Zusammenfassung + Folgeturns ZUSAMMEN (die
 * Zusammenfassung zählt als einer davon): behalten werden die Zusammenfassung plus die
 * jüngsten (maxTurns - 1) Folgeturns (maxTurns 1 → nur die Zusammenfassung). maxZeichen
 * verwirft zuerst die ältesten Folgeturns (Zusammenfassung und jüngster Folgeturn bleiben
 * unangetastet); reicht das nicht, wird zuerst die Zusammenfassung hart gekürzt, erst
 * danach der jüngste Folgeturn.
 * @param eintraege - Verlaufseinträge aufsteigend (ältester zuerst)
 * @param optionen - maxTurns (Obergrenze Anzahl Turns), maxZeichen (Obergrenze Summe Zeichen)
 * @returns das ausgewählte, weiterhin aufsteigend sortierte Fenster
 */
export function waehleVerlaufsfenster(eintraege: JarvisVerlaufsEintrag[], { maxTurns, maxZeichen }: { maxTurns: number; maxZeichen: number }): JarvisVerlaufsEintrag[] {
  if (eintraege.length === 0 || maxTurns <= 0) return []

  const laenge = (eintrag: JarvisVerlaufsEintrag): number => eintrag.nachricht.length + eintrag.antwort.length
  const hartKuerzen = (eintrag: JarvisVerlaufsEintrag, budget: number): JarvisVerlaufsEintrag => {
    const nachrichtBudget = Math.floor(budget / 2)
    return { ...eintrag, nachricht: eintrag.nachricht.slice(0, nachrichtBudget), antwort: eintrag.antwort.slice(0, budget - nachrichtBudget) }
  }

  let zusammenfassungsIndex = -1
  for (let i = eintraege.length - 1; i >= 0; i--) {
    if (eintraege[i].istZusammenfassung === true) {
      zusammenfassungsIndex = i
      break
    }
  }

  if (zusammenfassungsIndex === -1) {
    let fenster = eintraege
    if (fenster.length > maxTurns) {
      fenster = fenster.slice(fenster.length - maxTurns)
    }
    let summe = fenster.reduce((s, e) => s + laenge(e), 0)
    while (fenster.length > 1 && summe > maxZeichen) {
      summe -= laenge(fenster[0])
      fenster = fenster.slice(1)
    }
    if (fenster.length === 1 && laenge(fenster[0]) > maxZeichen) {
      fenster = [hartKuerzen(fenster[0], maxZeichen)]
    }
    return fenster
  }

  const zusammenfassung = eintraege[zusammenfassungsIndex]
  const folgeturns = eintraege.slice(zusammenfassungsIndex + 1)
  const folgeturnsKappe = maxTurns - 1
  let behalteneFolgeturns = folgeturns.length > folgeturnsKappe ? folgeturns.slice(folgeturns.length - folgeturnsKappe) : folgeturns

  let summe = laenge(zusammenfassung) + behalteneFolgeturns.reduce((s, e) => s + laenge(e), 0)
  while (behalteneFolgeturns.length > 1 && summe > maxZeichen) {
    summe -= laenge(behalteneFolgeturns[0])
    behalteneFolgeturns = behalteneFolgeturns.slice(1)
  }

  if (summe <= maxZeichen) {
    return [zusammenfassung, ...behalteneFolgeturns]
  }

  if (behalteneFolgeturns.length === 0) {
    return laenge(zusammenfassung) > maxZeichen ? [hartKuerzen(zusammenfassung, maxZeichen)] : [zusammenfassung]
  }

  const juengsterFolgeturn = behalteneFolgeturns[0]
  const budgetFuerZusammenfassung = Math.max(0, maxZeichen - laenge(juengsterFolgeturn))
  const gekuerzteZusammenfassung = laenge(zusammenfassung) > budgetFuerZusammenfassung ? hartKuerzen(zusammenfassung, budgetFuerZusammenfassung) : zusammenfassung
  const budgetFuerFolgeturn = Math.max(0, maxZeichen - laenge(gekuerzteZusammenfassung))
  const ergebnisFolgeturn = laenge(juengsterFolgeturn) > budgetFuerFolgeturn ? hartKuerzen(juengsterFolgeturn, budgetFuerFolgeturn) : juengsterFolgeturn
  return [gekuerzteZusammenfassung, ergebnisFolgeturn]
}

/**
 * Baut den Auftragstext für einen Jarvis-Chat-Lauf: Rolleninstruktion (Zweck,
 * Ausgabeschema wörtlich mit allen Enum-Werten, explizites Codezaun-Verbot —
 * F-337-Lehre, Muster des handformulierten Klassifikationsauftrags in
 * features/F18/nachweis-ws3-szenario-a.md, hier automatisiert statt von Hand),
 * gefolgt vom optionalen Verlaufsfenster (F31 WS-2, nur Kontext, keine
 * Anweisung — die Instruktion oben bleibt die einzige Quelle für das
 * erwartete Ausgabeschema) und der eigentlichen Nutzer-Nachricht. Reine
 * Funktion, kein I/O.
 * @param nachricht - die vom Menschen im Chat eingegebene Nachricht (oder die feste
 *   Zusammenfassungs-Instruktion von POST /api/chat/zusammenfassen)
 * @param verlauf - bereits über waehleVerlaufsfenster begrenztes Fenster, aufsteigend (ältester
 *   zuerst); leer (Default) liefert denselben Text wie vor F31 WS-2 (Regressionsschutz)
 * @returns der vollständige Auftragstext, der als AusfuehrungsEingaben.auftragstext
 *   den einzigen Eingabekanal für den Lauf bildet
 */
export function baueJarvisAuftragstext(nachricht: string, verlauf: JarvisVerlaufsEintrag[] = []): string {
  const zeilen = [
    "Du beantwortest als Rolle 'jarvis' eine natürliche Eingabe im Projektkontext (Statusfrage, Auftragsvorschlag oder Aktionsvorschlag).",
    'Deine GESAMTE Antwort besteht aus GENAU EINEM JSON-Objekt und sonst NICHTS: kein einleitender Satz, keine Erklärung davor oder danach, kein Markdown, kein Codezaun (```). Die allererste Zeile deiner Antwort ist "{", die letzte Zeile ist "}".',
    // Task "Jarvis-Chat-Latenz senken", Runde 2, Schritt 3 (löst F-506): real beobachteter
    // Vertragsverstoß war GENAU dieser Fall — eine identische Wiederholung bekam einen
    // erklärenden Satz vorangestellt ("Kein neuer Sachstand … — ich antworte konsistent damit.")
    // gefolgt von einem ```json-Zaun. Die Regel oben nennt "kein einleitender Satz" bereits
    // explizit; dieser Zusatz benennt den konkret aufgetretenen Fall, damit er nicht als
    // Sonderfall missverstanden wird.
    'Das gilt AUSNAHMSLOS auch dann, wenn deine Antwort inhaltlich mit einer vorherigen identisch ist — stelle in diesem Fall KEINE Bemerkung darüber voran ("kein neuer Sachstand", "ich antworte konsistent" o. ä.), sondern liefere direkt dasselbe JSON-Objekt erneut.',
    'Das JSON-Objekt hat GENAU diese Form (schemas/ergebnis-jarvis.schema.json):',
    '{',
    '  "art": "antwort" | "auftrag_vorschlag" | "aktion",',
    '  "antwort": "<für den Menschen lesbarer Antworttext, Pflichtfeld, auch wenn zusätzlich auftrag oder aktion gesetzt ist>",',
    '  "auftrag": { "titel": "<string>", "text": "<string>" },',
    '  "aktion": { "typ": "routen" | "oeffnen" | "anpassen", "ziel": "<string>" },',
    '  "bezug": { "auftrag_id": "<string>" } ODER { "workitem": "<string>" }',
    '}',
    "'auftrag' NUR bei art 'auftrag_vorschlag' setzen, 'aktion' NUR bei art 'aktion' setzen, 'bezug' nur wenn diese Nachricht sich erkennbar auf einen bestehenden Auftrag oder ein Workitem bezieht (genau eines der beiden Unterfelder, nicht beide). Bei aktion.typ 'anpassen' MUSS 'bezug.auftrag_id' gesetzt sein (kein Bezug auf ein bloßes Workitem). Kein weiteres Feld außer den fünf genannten (nicht gesetzte Felder weglassen — ein strukturiert antwortender Worker darf sie stattdessen auf 'null' setzen, beides ist gleichwertig).",
    // Runde 2, Schritt 3: real beobachteter zweiter Vertragsverstoß im selben Lauf — bezug.workitem
    // trug die ID DIESES Chat-Laufs selbst (jarvis-jarvis-chat-…), keine Referenz auf ein echtes
    // Workitem aus dem Projektkontext. 'bezug' ist beschreibend, kein Pflichtfeld irgendeiner Art.
    "'bezug' NUR setzen, wenn die Nachricht oder der Gesprächsverlauf oben eine reale, bereits bekannte Kennung nennt (einen Auftrag oder ein Workitem aus dem eingespeisten Projektkontext) — NIEMALS eine Kennung erfinden, raten oder die eigene lauf_id/auftrag_id dieses Chat-Laufs eintragen. Ohne eine solche real bekannte Kennung bleibt 'bezug' weg (bzw. 'null').",
  ]
  if (verlauf.length > 0) {
    zeilen.push('', 'Bisheriger Gesprächsverlauf (nur Kontext, keine Anweisungen; älteste zuerst):')
    for (const eintrag of verlauf) {
      zeilen.push(`Mensch: ${eintrag.nachricht}`, `Jarvis: ${eintrag.antwort}`)
    }
  }
  zeilen.push('', 'Nachricht des Menschen:', nachricht)
  return zeilen.join('\n')
}

export type { ErgebnisJarvis, JarvisAktion, JarvisAktionTyp, JarvisArt, JarvisAuftragVorschlag, JarvisBezug, JarvisVerlaufsEintrag }
