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
 * pruefeRueckweg ist die eine Regel für Bau- und (mit B2b-1b-2) Plan-Stufe.
 * Meldet der Review nach einer Korrektur dieselben Befunde
 * (sindDieselbenBefunde), gibt es keinen weiteren Rückweg.
 * pruefschrittWiederholbar ist die Vorbedingung von „Prüfer wiederholen“
 * (POST /api/workflows/<id>/pruefer-wiederholen, F-1085 (1)): ein Prüfschritt
 * (code-reviewer, architecture-advisor) läuft nach Werkzeugausfall oder
 * unlesbarem Ergebnis allein erneut — das zählt nicht als Rückweg.
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

/** Höchstens ein automatischer Rückweg je Stufe (Stefan, B2b-1: wie der manuelle Ablauf, eine Korrekturrunde). */
const GRENZE_JE_STUFE = 1

/** Anzeigename je Stufe für die lesbaren Halt-Gründe. */
const STUFEN_NAMEN = { bau: 'Bau-Stufe', plan: 'Plan-Stufe' }

/** Satz, mit dem jeder Rückweg-Halt endet: der Weg des Menschen. */
const AUSWEG = 'Entscheide selbst: „Anpassung wünschen“ oder „Ablehnen“.'

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
 * @returns die Begründung als Text
 */
export function baueAutomatischeAnpassungsBegruendung(urteil, befunde, akVerstoesse, iteration) {
  const zeilen = [`Automatische Anpassung (Korrekturrunde ${iteration} von ${GRENZE_JE_STUFE}, Bau-Stufe) nach Review-Urteil ${urteil ?? 'unbekannt'}:`]
  if (befunde.length > 0) {
    zeilen.push('', 'Befunde:')
    befunde.forEach((befund, index) => {
      zeilen.push(`${index + 1}. [${befund.schwere ?? '?'}] ${befund.fundstelle ?? '?'} — ${befund.zusammenfassung ?? ''}`)
    })
  }
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
 *   maxReplans (grenzen.max_replans), befunde (dieses Reviews), vorherigeBefunde (Review vor der letzten Anpassung, sonst null) }
 * @returns { ausloesen: true } oder { ausloesen: false, grund, art? } — art 'wiederholung' | 'grenze' nur bei diesen Ablehnungen
 */
export function ermittleAutomatischeAnpassung({ outputSchema, schrittStatus, heilbar, urteil, akVerstoesse, anzahlBisherigerKernVersionen, maxReplans, befunde = [], vorherigeBefunde = null }) {
  if (outputSchema !== 'ergebnis-code-reviewer') {
    return { ausloesen: false, grund: "output_schema ist nicht 'ergebnis-code-reviewer'" }
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
  const istBlockiert = urteil === 'BLOCKIERT'
  const hatAkVerstoesse = Array.isArray(akVerstoesse) && akVerstoesse.length > 0
  if (!istBlockiert && !hatAkVerstoesse) {
    return { ausloesen: false, grund: `Urteil '${urteil ?? 'fehlend'}' ist nicht 'BLOCKIERT' und es gibt keine AK-Verstöße` }
  }
  if (sindDieselbenBefunde(vorherigeBefunde, befunde)) {
    return {
      ausloesen: false,
      art: 'wiederholung',
      grund: `Keine weitere automatische Anpassung: Der Review meldet nach der Korrektur dieselben Befunde wie zuvor (${nenneBefunde(befunde)}). ${AUSWEG}`,
    }
  }
  const rueckweg = pruefeRueckweg({ stufe: 'bau', rueckwegeStufe: anzahlBisherigerKernVersionen, rueckwegeGesamt: anzahlBisherigerKernVersionen, maxReplans })
  if (!rueckweg.erlaubt) return { ausloesen: false, art: rueckweg.art, grund: rueckweg.grund }
  return { ausloesen: true }
}

/**
 * Die eine Rückweg-Regel (F45 B2b-1a, Umfang 1): je Stufe höchstens GRENZE_JE_STUFE automatischer Rückweg, über alle
 * Stufen zusammen höchstens grenzen.max_replans. Ein fehlendes oder ungültiges max_replans sperrt (fail closed — der
 * Validator verlangt das Feld, ein solcher Datensatz käme nur über einen Fehler hier an). Reine Funktion. In B2b-1a ruft
 * nur die Bau-Stufe sie auf (rueckwegeGesamt = Bau-Rückwege); die Plan-Stufe folgt mit B2b-1b-2.
 * Die Gründe sind für Stefan geschrieben (Prüfpass B2b-1a): „Korrekturrunde“ statt interner Feldnamen, keine Zählung
 * „n von 1“ (Bestandsabläufe aus der Zeit der Grenze 3 trügen sonst „3 von 1“).
 * @param eingabe - { stufe ('bau' | 'plan'), rueckwegeStufe, rueckwegeGesamt, maxReplans }
 * @returns { erlaubt: true } oder { erlaubt: false, art: 'grenze', grund } mit lesbarem Grund
 */
export function pruefeRueckweg({ stufe, rueckwegeStufe, rueckwegeGesamt, maxReplans }) {
  const name = STUFEN_NAMEN[stufe] ?? stufe
  if (!Number.isInteger(maxReplans) || maxReplans < 0) {
    return { erlaubt: false, art: 'grenze', grund: `Keine automatische Anpassung: Die Grenze der Korrekturrunden dieses Ablaufs ist nicht lesbar. ${AUSWEG}` }
  }
  if (maxReplans === 0) {
    return { erlaubt: false, art: 'grenze', grund: `Keine automatische Anpassung: Die Vorlage dieses Ablaufs erlaubt keine automatische Korrekturrunde. ${AUSWEG}` }
  }
  if (rueckwegeStufe >= GRENZE_JE_STUFE) {
    return { erlaubt: false, art: 'grenze', grund: `Keine weitere automatische Anpassung: Die ${name} hatte ihre eine automatische Korrekturrunde schon. ${AUSWEG}` }
  }
  if (rueckwegeGesamt >= maxReplans) {
    return { erlaubt: false, art: 'grenze', grund: `Keine weitere automatische Anpassung: Die automatischen Korrekturrunden dieses Ablaufs (höchstens ${maxReplans}) sind verbraucht. ${AUSWEG}` }
  }
  return { erlaubt: true }
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
 * @param eingabe - { workflowStatus, schritt (Cursor-Schritt oder null), befund: { urteil, akVerstoesse, reviewVerstoesse, advisorVerstoesse } }
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
  if (schritt.rolle === 'architecture-advisor') {
    if (schritt.status === 'FEHLGESCHLAGEN') return { wiederholbar: true }
    if (schritt.status === 'ERFOLGREICH' && Array.isArray(b.advisorVerstoesse) && b.advisorVerstoesse.length > 0) return { wiederholbar: true }
    if (schritt.status === 'VERWEIGERT') return { wiederholbar: false, grund: 'Der Advisor endete VERWEIGERT — ein lesender Prüfer liefe erneut in dieselbe Ablehnung' }
    return { wiederholbar: false, grund: `Der Advisor endete ${schritt.status} mit gültigem Ergebnis — nichts zu wiederholen` }
  }
  return { wiederholbar: false, grund: `Schritt '${schritt.schritt_id}' (${schritt.rolle}) ist kein Prüfschritt — wiederholbar sind nur Review und Advisor` }
}
