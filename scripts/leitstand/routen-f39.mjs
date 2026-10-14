/**
 * Datei: scripts/leitstand/routen-f39.mjs
 *
 * Zweck: Reine Logik für POST /api/workflows/<id>/entscheidung (F39 WS-2b,
 * löst state/findings.md F-632 Teil b) — den Fortsetzungsweg für eine
 * Architektur-Entscheidung, die Regel 1c (src/workflow/index.ts) über
 * 'entscheidungen_mensch[]' (schemas/ergebnis-architektur.schema.json)
 * verlangt hat. Muster scripts/leitstand/routen-sparring.mjs:
 * registriereWorkflowEntscheidung/findeWorkflowEntscheidungFuerSchritt/
 * formatiereWorkflowEntscheidungAlsText sind reine Schreib-/Lese-/
 * Formatierfunktionen ohne D13-Bezug (kein Lauf wird gestartet); der
 * POST-Dispatch selbst — D13-Fenster, Statusprüfung über
 * ermittleNaechstenSchritt, Weiterschalten über starteWorkflowSchritt —
 * bleibt im Server (braucht die Closure-Sperre laufAktiv, wie bei POST
 * /api/sparring/POST /api/workflows/<id>/freigabe).
 *
 * pruefeWorkflowEntscheidungsformular prüft NUR die Form des HTTP-Bodys
 * (schrittId, antworten[] — wiederverwendet validiereWorkflowEntscheidungDaten,
 * D5, kein zweiter Regelsatz). Die Kreuzprüfung gegen die tatsächlichen
 * 'entscheidungen_mensch[]' des referenzierten Architektur-Laufs
 * (vollständig beantwortet, keine erfundene Option) ist
 * pruefeAntwortenGegenFragen (src/workflow-entscheidung/index.ts) — der
 * Server ruft sie direkt auf, NACHDEM er den Lauf geladen hat (dieses Modul
 * kennt weder Laufakten noch den Checkpoint Store dafür).
 *
 * F45 B2b-1b-2a: findeWorkflowEntscheidungFuerSchritt führt alle Versionen einer schritt_id zusammen (Plan v2),
 * offeneArchitekturFragen nennt die Fragen, die noch eine Antwort brauchen.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs,
 * scripts/check-f39-architekt.mjs, scripts/leitstand/routen-f39.test.mjs.
 */

import { listeVersionen, registriereKernArtefakt } from '../../src/lineage-registry/index.ts'
import { validiereWorkflowEntscheidungDaten } from '../../src/workflow-entscheidung/index.ts'

const ENTSCHEIDUNG_HERKUNFT_SCHRITT = 'entscheidung-workflow-architektur'

function STILLER_SCHREIBER() {}

/** Name der Kernartefakt-Kette für die Architektur-Entscheidungen eines Workflows (Muster 'sparring-auftrag-<projektId>', F-625). */
export function workflowEntscheidungArtefaktId(workflowId) {
  return `workflow-entscheidung-${workflowId}`
}

/**
 * Reine Formprüfung des HTTP-Bodys von POST /api/workflows/<id>/entscheidung.
 * Kennt die 'entscheidungen_mensch[]' des Architektur-Laufs NICHT — dafür
 * pruefeAntwortenGegenFragen (Kopfkommentar).
 * @param body - geparster, sonst unbekannter Request-Body
 * @returns { ok: true, schrittId, antworten } oder { ok: false, grund }
 */
export function pruefeWorkflowEntscheidungsformular(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, grund: 'Body muss ein JSON-Objekt sein' }
  }
  if (typeof body.schrittId !== 'string' || body.schrittId.length === 0) {
    return { ok: false, grund: "'schrittId' muss ein nicht-leerer String sein" }
  }
  if (!Array.isArray(body.antworten)) {
    return { ok: false, grund: "'antworten' muss ein Array sein" }
  }
  // Wiederverwendung der Payload-Formprüfung (D5): 'entschieden_am' entsteht serverseitig erst
  // NACH dieser Prüfung (new Date().toISOString(), Muster POST .../freigabe) — ein Platzhalter
  // genügt hier, weil ein nicht-leerer String ihn ohnehin bestehen lässt.
  const verstoesse = validiereWorkflowEntscheidungDaten({ schritt_id: body.schrittId, antworten: body.antworten, entschieden_am: 'platzhalter' })
  if (verstoesse.length > 0) {
    return { ok: false, grund: `Body verletzt die erwartete Form: ${verstoesse.join('; ')}` }
  }
  return { ok: true, schrittId: body.schrittId, antworten: body.antworten }
}

/**
 * Schreibt EINE Architektur-Entscheidung (F39 WS-2b) — additiv auf der Kette
 * 'workflow-entscheidung-<workflowId>' (Muster registriereSparringAuftragZuordnung,
 * routen-sparring.mjs): mehrere Architektur-Schritte oder ein Korrekturdurchgang
 * in demselben Workflow schreiben mehrere Versionen, unterschieden über
 * 'schritt_id'. Validiert die Payload-Form nochmals selbst (Verteidigungslinie,
 * Muster der 'freigabe'/'stopp'-Schreibstellen in scripts/leitstand-server.mjs) —
 * ein Aufrufer, der pruefeWorkflowEntscheidungsformular übersprungen hat, schreibt
 * kein ungültiges Artefakt.
 * @param basisVerzeichnis - Kontrollzustand-Wurzel
 * @param workflowId - id des betroffenen Workflows
 * @param profilReferenz - Profilreferenz dieser Serverinstanz
 * @param schrittId - schritt_id des Architektur-Schritts
 * @param antworten - bereits gegen den Lauf geprüfte Antworten (pruefeAntwortenGegenFragen)
 * @param entschiedenAm - ISO-Zeitstempel, vom Aufrufer erzeugt (new Date().toISOString())
 * @param eingaben - Eingabe-Referenzen (Muster: die freigegebene Workflow-Version), optional
 * @returns pfad, versionSequenz und inhaltsHash der geschriebenen Version
 */
export function registriereWorkflowEntscheidung(basisVerzeichnis, workflowId, profilReferenz, schrittId, antworten, entschiedenAm, eingaben) {
  const daten = { schritt_id: schrittId, antworten, entschieden_am: entschiedenAm }
  const verstoesse = validiereWorkflowEntscheidungDaten(daten)
  if (verstoesse.length > 0) {
    throw new Error(`verstößt gegen schemas/kontrollzustand-architektur-entscheidung-payload.schema.json: ${verstoesse.join('; ')}`)
  }
  return registriereKernArtefakt(
    workflowEntscheidungArtefaktId(workflowId),
    profilReferenz,
    { erzeuger: 'mensch', schritt: ENTSCHEIDUNG_HERKUNFT_SCHRITT },
    daten,
    eingaben,
    { basisVerzeichnis, schreiber: STILLER_SCHREIBER }
  )
}

/**
 * Findet die für 'schrittId' erfassten Architektur-Entscheidungen —
 * genutzt sowohl von Regel 1c' Aufrufer (architekturEntscheidungAusstehend
 * bestimmen) als auch vom 'entscheidung-@<schrittId>'-Eingabe-Platzhalter.
 * Eine (noch) leere oder fehlende Kette ist kein Fehler (Muster
 * baueSparringVerlaufsProjektion) — sie liefert dann null.
 *
 * F45 B2b-1b-2a (Advisor A1, features/F45/plan-b2b1b2.md): ZUSAMMENGEFÜHRT über alle Versionen derselben schritt_id —
 * nach Plan v2 trägt dieselbe schritt_id eine zweite Entscheidung (nur die neuen Fragen), und Stefans Antworten zu
 * Plan v1 gelten weiter. Je 'frage' gewinnt die letzte Antwort (Reihenfolge der ersten Nennung), entschieden_am ist das
 * der neuesten Version. Gleiche Rückgabeform wie bisher; bei nur einer Version ist das Ergebnis diese Version.
 * @param basisVerzeichnis - Kontrollzustand-Wurzel
 * @param workflowId - id des betroffenen Workflows
 * @param schrittId - schritt_id des Architektur-Schritts
 * @returns { schritt_id, antworten, entschieden_am } (zusammengeführt) für 'schrittId', oder null
 */
export function findeWorkflowEntscheidungFuerSchritt(basisVerzeichnis, workflowId, schrittId) {
  const versionen = listeVersionen(workflowEntscheidungArtefaktId(workflowId), { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
  let treffer = null
  const antwortJeFrage = new Map()
  for (const version of versionen) {
    if (version.daten?.schritt_id !== schrittId) continue
    treffer = version.daten
    for (const antwort of version.daten.antworten ?? []) antwortJeFrage.set(antwort.frage, antwort)
  }
  return treffer === null ? null : { ...treffer, antworten: [...antwortJeFrage.values()] }
}

/**
 * F45 B2b-1b-2a (Entscheidung Stefan H1, Delta-Advisor D3): die Fragen eines Architekt-Laufs, die noch eine Antwort
 * brauchen — ohne Antwort in der Zusammenführung, oder deren letzte Antwort keine Option der AKTUELLEN Frage mehr nennt
 * (Plan v2 hat die Optionen geändert). Eine Stelle für Regel-1c-Aufrufer (Nachlauf), GET-Projektion
 * architekturEntscheidung und die Route POST …/entscheidung. Für Plan v1 (keine Entscheidung) sind es alle Fragen.
 * @param fragen - entscheidungen_mensch[] des aktuellen Architekt-Laufs
 * @param entscheidung - Rückgabe von findeWorkflowEntscheidungFuerSchritt, oder null
 * @returns die offenen Fragen (Teilliste von 'fragen', Reihenfolge erhalten)
 */
export function offeneArchitekturFragen(fragen, entscheidung) {
  const antworten = new Map((entscheidung?.antworten ?? []).map((antwort) => [antwort.frage, antwort.gewaehlt]))
  return fragen.filter((frage) => {
    const gewaehlt = antworten.get(frage.frage)
    return gewaehlt === undefined || !(frage.optionen ?? []).some((option) => option.titel === gewaehlt)
  })
}

/**
 * Formatiert eine gefundene Architektur-Entscheidung als lesbaren Text für
 * den 'entscheidung-@<schrittId>'-Eingabe-Platzhalter (Muster: der
 * formatierte JSON-Inhalt von 'ergebnis-@', hier als Prosa statt JSON, weil
 * die Entscheidung selbst kein vom Modell zu lesendes Ausgabeschema ist).
 * @param entscheidung - Rückgabe von findeWorkflowEntscheidungFuerSchritt, oder null
 * @returns lesbarer Text, oder '' wenn keine Entscheidung vorliegt (Auftrags-Vorgabe Punkt 4: leerer Hinweistext statt Startsperre)
 */
export function formatiereWorkflowEntscheidungAlsText(entscheidung) {
  if (entscheidung === null) return ''
  return entscheidung.antworten.map((antwort) => `- ${antwort.frage} → ${antwort.gewaehlt}${antwort.begruendung ? ` (${antwort.begruendung})` : ''}`).join('\n')
}
