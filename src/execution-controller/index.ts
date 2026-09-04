/**
 * Datei: src/execution-controller/index.ts
 *
 * Zweck: Execution Controller (F8 WS-1/WS-2a, state/tasks/f8-execution-
 * controller-ws1.md, state/tasks/f8-execution-controller-ws2a.md,
 * state/plan-v1-f8-execution-controller.md Abschnitt 2.1/2.2,
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
 */

import { randomUUID } from 'node:crypto'
import { starteGateway, baueAufruf } from '../claude-code-gateway/index.ts'
import { baueKontextpaket } from '../context-builder/index.ts'
import { kanonischesJson, sha256Hex, stelleLaufstatusFest } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { erfasseBedarf, erzeugeTransportpaket, haendigeAus } from '../human-transport/index.ts'
import { klassifiziereLauf } from '../result-evaluator/index.ts'
import type { AusfuehrungsEingaben, AusfuehrungsErgebnis, AusfuehrungsOptionen } from './types.ts'

/** Eigene, vom auslösenden Lauf syntaktisch verschiedene laufId für eine E-186-Eskalation (plan-v1 Abschnitt 2.2, D3). Der randomUUID-Suffix verhindert eine ID-Kollision bei einer etwaigen zweiten Eskalation desselben Laufs. */
function eskalationsLaufId(ausloesenderLaufId: string): string {
  return `${ausloesenderLaufId}-eskalation-${randomUUID()}`
}

/**
 * Führt einen Lauf vollständig durch F5 → F6a → F7 → F1B (feste
 * Reihenfolge, plan-v1 Abschnitt 2.1, Schritte 1–5).
 * @param laufId - eindeutige Lauf-Kennung, unverändert an jeden Schritt gereicht
 * @param profilReferenz - Profilbezug, unverändert an F5/F6a/F7 gereicht
 * @param eingaben - Rolle, Anfragen, Budget, Aufrufkonstruktion, Startziel
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
  const kontextpaketErgebnis = baueKontextpaket(laufId, eingaben.rolle, eingaben.anfragen, profilReferenz, eingaben.budget, {
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
