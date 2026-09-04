/**
 * Datei: src/execution-controller/index.ts
 *
 * Zweck: Execution Controller (F8 WS-1/WS-2a/WS-2b, state/tasks/f8-execution-
 * controller-ws1.md, state/tasks/f8-execution-controller-ws2a.md,
 * state/tasks/f8-execution-controller-ws2b.md,
 * state/plan-v1-f8-execution-controller.md Abschnitt 2.1/2.2/2.3,
 * state/plan-v2-f8-execution-controller.md Delta 1/2). Führt einen Lauf
 * vollständig durch die Kette F5 → F6a → F7 → F1B in fester Reihenfolge:
 * Kontextpaket bauen, Aufruf konstruieren, Lauf starten, Laufakte
 * klassifizieren, bei VERWEIGERT mit bypass_verdacht_anzahl > 0 über F9
 * an einen Menschen eskalieren, Terminalzustand des auslösenden Laufs
 * feststellen. Bricht bei einer Ablehnung von F5 oder F6a sofort mit
 * deren unverändertem Abbruchgrund ab — kein eigener Grundtext, kein
 * nachfolgender Schritt (AK1/AK2). Ruft an keiner Stelle eine der
 * orchestrierten Prüf- oder Klassifikationsfunktionen von F4/F5/F6a/F7
 * selbst auf, nur deren öffentliche Einstiegspunkte — mechanisch per Grep
 * geprüft (AK1-/AK3-Gate, scripts/check-f8-execution-controller.mjs).
 *
 * Wird aufgerufen von:
 * - (noch niemand — WS-1/WS-2a ist der erste Aufrufer dieser Kette)
 *
 * Wichtig:
 * Kein eigener Aufruf von schreibeWirkungsmarke für die Haupt-laufId (D5)
 * — starteGateway schreibt die Start-, klassifiziereLauf die
 * Terminalmarke, beide mittelbar. Diese Datei ruft F1B nur über
 * stelleLaufstatusFest (lesend) auf. Die Eskalations-eingaben[0].pfad
 * (`artefakt:laufakte-<ausloesenderLaufId>`) belegt Herkunft, ist aber
 * bewusst kein STALE-Prüfpfad: die Laufakte ist innerhalb eines Laufs
 * unveränderlich (starteGateway registriert sie genau einmal,
 * claude-code-gateway/index.ts:301-308), und es gibt im Repo keinen
 * Aufrufer, der pruefeStale auf bedarf-<laufId> anwendet — F9s einziger
 * Einstiegspunkt pruefeUndEntscheideStale prüft ausschließlich
 * transport-<laufId> (human-transport/index.ts:348-360), befüllt von
 * baueAktuelleEingabeInhalte nur den BEDARF-Schlüssel (:329-336). Eine
 * STALE-Prüfung dieser Referenz hätte damit kein Aufrufziel
 * (lineage-registry/index.ts:222).
 *
 * WS-2b (state/tasks/f8-execution-controller-ws2b.md) ergänzt AK7: bei
 * gesetztem eingaben.vorgaengerLaufId wird vor dem baueKontextpaket-Aufruf
 * die Laufakte des Vorgängerlaufs geladen und der Anfragenliste als
 * notwendig:true-Eintrag vorangestellt (Lineage-Verweis, plan-v1 Abschnitt
 * 2.3). Fehlt sie, wirft die Funktion — Vorbedingungsverletzung, kein
 * Fachergebnis (Muster lineage-registry/index.ts:243-245,
 * human-transport/index.ts:90-92,114-117). Es existiert kein Codepfad, der
 * die Vorgänger-laufId an schreibeWirkungsmarke/schreibeCheckpoint/
 * starteGateway übergibt — der Vorgängerlauf bleibt unverändert.
 */

import { randomUUID } from 'node:crypto'
import { starteGateway, baueAufruf } from '../claude-code-gateway/index.ts'
import { baueKontextpaket } from '../context-builder/index.ts'
import type { Anfrage } from '../context-builder/types.ts'
import { kanonischesJson, sha256Hex, stelleLaufstatusFest } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { erfasseBedarf, erzeugeTransportpaket, haendigeAus } from '../human-transport/index.ts'
import { ladeArtefaktVersion } from '../lineage-registry/index.ts'
import { klassifiziereLauf } from '../result-evaluator/index.ts'
import type { AusfuehrungsEingaben, AusfuehrungsErgebnis, AusfuehrungsOptionen } from './types.ts'

/** Eigene, vom auslösenden Lauf syntaktisch verschiedene laufId für eine E-186-Eskalation (plan-v1 Abschnitt 2.2, D3). Der randomUUID-Suffix verhindert eine ID-Kollision bei einer etwaigen zweiten Eskalation desselben Laufs. */
function eskalationsLaufId(ausloesenderLaufId: string): string {
  return `${ausloesenderLaufId}-eskalation-${randomUUID()}`
}

/** Artefakt-ID der Laufakte eines Vorgängerlaufs (WS-2b, AK7) — eigene Kleinstfunktion, konsistent mit eskalationsLaufId oben, statt Zugriff auf die nicht exportierte gleichnamige Hilfsfunktion in claude-code-gateway/index.ts. */
function vorgaengerLaufakteArtefaktId(vorgaengerLaufId: string): string {
  return `laufakte-${vorgaengerLaufId}`
}

/**
 * Führt einen Lauf vollständig durch F5 → F6a → F7 → F1B (feste
 * Reihenfolge, plan-v1 Abschnitt 2.1, Schritte 1–5).
 * @param laufId - eindeutige Lauf-Kennung, unverändert an jeden Schritt gereicht
 * @param profilReferenz - Profilbezug, unverändert an F5/F6a/F7 gereicht
 * @param eingaben - Rolle, Anfragen, Budget, Aufrufkonstruktion, Startziel,
 *   optional vorgaengerLaufId für eine Wiederaufnahme (WS-2b, AK7)
 * @param optionen - reine Durchreichung an F5/F6a/F7/F1B, nicht selbst interpretiert (D5)
 * @returns den Abbruchgrund von F5/F6a, oder bei vollständigem Durchlauf Klassifikation + Laufstatus
 *   (plus eskalation bei VERWEIGERT mit bypass_verdacht_anzahl > 0). Ein Wurf aus einem der drei
 *   F9-Eskalationsaufrufe wird nicht gefangen, sondern propagiert als Promise-Rejection (plan-v2 Delta 1).
 */
export async function fuehreAufgabeDurch(
  laufId: string,
  profilReferenz: ProfilReferenz,
  eingaben: AusfuehrungsEingaben,
  optionen: AusfuehrungsOptionen = {}
): Promise<AusfuehrungsErgebnis> {
  let anfragen: Anfrage[] = eingaben.anfragen
  if (eingaben.vorgaengerLaufId !== undefined) {
    const vorgaengerLaufakteVersion = ladeArtefaktVersion(vorgaengerLaufakteArtefaktId(eingaben.vorgaengerLaufId), undefined, {
      basisVerzeichnis: optionen.basisVerzeichnis,
      schreiber: optionen.schreiber,
    })
    if (vorgaengerLaufakteVersion === null) {
      throw new Error(`Vorgängerlauf '${eingaben.vorgaengerLaufId}' hat keine Laufakte — kein gültiger Vorgängerlauf für eine Wiederaufnahme (WS-2b, AK7)`)
    }
    anfragen = [
      {
        pfad: `artefakt:laufakte-${eingaben.vorgaengerLaufId}`,
        frage: 'Kontext des vorherigen, klärungsbedürftigen/fehlgeschlagenen Laufs',
        begruendung: 'Lineage-Verweis auf den Vorgängerlauf (AK7)',
        inhalt: kanonischesJson(vorgaengerLaufakteVersion.daten),
        notwendig: true,
      },
      ...eingaben.anfragen,
    ]
  }

  const kontextpaketErgebnis = baueKontextpaket(laufId, eingaben.rolle, anfragen, profilReferenz, eingaben.budget, {
    basisVerzeichnis: optionen.basisVerzeichnis,
    schreiber: optionen.schreiber,
  })
  if (!kontextpaketErgebnis.ok) {
    return { ok: false, stufe: 'kontextpaket', ergebnis: kontextpaketErgebnis }
  }

  const tokens = baueAufruf(eingaben.aufrufEingaben)

  const gatewayErgebnis = await starteGateway(
    {
      laufId,
      profilReferenz,
      tokens,
      werkzeugStartziel: eingaben.werkzeugStartziel,
      werkzeugVersionDeklariert: eingaben.werkzeugVersionDeklariert,
      berechtigungskontext: eingaben.berechtigungskontext,
    },
    {
      schreiber: optionen.schreiber,
      basisVerzeichnis: optionen.basisVerzeichnis,
      rohBasisVerzeichnis: optionen.rohBasisVerzeichnis,
      starter: optionen.starter,
      settingsPfad: optionen.settingsPfad,
      aktuelleAutorisierungPfad: optionen.aktuelleAutorisierungPfad,
      startfreigabeRepoWurzel: optionen.startfreigabeRepoWurzel,
    }
  )
  if (!gatewayErgebnis.ok) {
    return { ok: false, stufe: 'gateway', grund: gatewayErgebnis.grund }
  }

  const klassifikation = klassifiziereLauf(
    laufId,
    profilReferenz,
    { laufakte: gatewayErgebnis.laufakte },
    { basisVerzeichnis: optionen.basisVerzeichnis, schreiber: optionen.schreiber }
  )

  let eskalation: { laufId: string; bedarfVersionSequenz: number; transportVersionSequenz: number } | undefined
  if (klassifikation.ergebnis === 'VERWEIGERT' && klassifikation.bypass_verdacht_anzahl > 0) {
    const eskLaufId = eskalationsLaufId(laufId)
    const beschreibung = `E-186-Eskalation: Lauf ${laufId} wurde VERWEIGERT mit bypass_verdacht_anzahl ${klassifikation.bypass_verdacht_anzahl}. Menschliche Prüfung der Genehmigungsverweigerungen erforderlich.`
    const { versionSequenz: bedarfVersionSequenz } = erfasseBedarf(
      eskLaufId,
      profilReferenz,
      beschreibung,
      [
        {
          pfad: `artefakt:laufakte-${laufId}`,
          zitierter_bereich: `LAUFAKTE_V0 versionSequenz ${gatewayErgebnis.versionSequenz}, bypass_verdacht_anzahl ${klassifikation.bypass_verdacht_anzahl}`,
          inhalts_hash: sha256Hex(kanonischesJson(gatewayErgebnis.laufakte)),
        },
      ],
      optionen
    )
    const { versionSequenz: transportVersionSequenz } = erzeugeTransportpaket(
      eskLaufId,
      profilReferenz,
      bedarfVersionSequenz,
      kanonischesJson(gatewayErgebnis.laufakte),
      'mensch',
      optionen
    )
    haendigeAus(eskLaufId, profilReferenz, optionen)
    eskalation = { laufId: eskLaufId, bedarfVersionSequenz, transportVersionSequenz }
  }

  const laufStatus = stelleLaufstatusFest(laufId, { basisVerzeichnis: optionen.basisVerzeichnis, schreiber: optionen.schreiber })

  return { ok: true, klassifikation, laufStatus, ...(eskalation ? { eskalation } : {}) }
}
