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
 * F-124 (Prompt-Übergabe): zwischen Kontextpaket und Aufrufkonstruktion baut
 * bauePromptAusKontextpaket den `-p`-Prompttext ausschließlich aus F5s
 * bereits akzeptierten Kontextpaket-Elementen (kontextpaketErgebnis.paket),
 * zurückgeführt auf die ursprünglichen Anfrage-Objekte über F5s eigene
 * elementSchluessel-Funktion (D5, kein Nachbau der Rollenfilter-/Budget-
 * Regel). eingaben.aufrufEingaben selbst bleibt unverändert (D5, reine
 * Durchreichung) — baueAufruf bekommt ein neu zusammengesetztes Objekt.
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (fuehreAufgabeDurch, Standard von fuehreAufgabeDurchFn) und Gates
 * - scripts/leitstand/routen-faehigkeit-vorschlag.mjs (claudePfadeAusStatus: Hinweis „ungesichert“ der Abnahme, F45 FB-2)
 * - scripts/check-f45-b2b3b2a-absicherung.mjs (ermittleRueckfrageProtokoll, leseRueckfrageProtokoll, Fall (a2))
 * - scripts/check-f45-b2b3b2b1a-rest.mjs (ermittleRueckfrageProtokoll, leseRueckfrageProtokoll), scripts/check-f45-b2b3b1b-auswertung.mjs
 *   (leseRueckfrageProtokoll, (p3)), scripts/leitstand/rueckfrage-protokoll.test.mjs (leseRueckfrageProtokoll)
 * - scripts/check-f45-b2b3b2b1b-r1.mjs (fuehreAufgabeDurch echt über den Gate-Server, leseRueckfrageProtokoll; (r1d)/(r1e), (r1t))
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
 *
 * F11 WS-1 (state/plan-v1-f11-auftrag-ws1.md Abschnitt 2.3,
 * state/tasks/f11-auftrag-ws1.md): eingaben.auftragstext (Pflichtfeld,
 * AK2) wird dem aus dem Kontextpaket gebauten Evidenzteil als eigener,
 * durch "===" sichtbar getrennter Abschnitt vorangestellt. Bei leerem
 * Kontextpaket entfällt der Evidenzabschnitt vollständig statt eines
 * leeren Trenners ohne Inhalt danach. bauePromptAusKontextpaket selbst
 * bleibt unverändert — sie baut weiterhin ausschließlich den Evidenzteil
 * aus den von F5 akzeptierten Elementen (F-124-Vertrag). auftragstext wird
 * an keiner Stelle an baueKontextpaket gereicht (AK3, mechanisch geprüft
 * über scripts/check-f11-auftrag.mjs).
 *
 * F12 WS-2 (state/plan-v1-f12-ws2.md Abschnitt 2.2, AK5): eingaben.auftragId
 * (Pflichtfeld) wird nach demselben Muster wie vorgaengerLaufId behandelt —
 * das Auftragsartefakt wird geladen und der Anfragenliste als
 * notwendig:true-Eintrag vorangestellt, VOR einem etwaigen
 * vorgaengerLaufId-Verweis (Reihenfolge [auftragRef, vorgaengerRef, …]).
 * Anders als bei vorgaengerLaufId ist der Check unbedingt (kein `if`) — ein
 * Lauf ohne Auftrag existiert seit WS-2 nicht mehr. Fehlt die Auftragsakte,
 * wirft die Funktion (Vorbedingungsverletzung) — der eigentliche AK5-400-
 * Vertrag ("Start wird abgelehnt, bevor irgendetwas geschrieben wird") wird
 * NICHT hier, sondern synchron VOR dem fuehreAufgabeDurch-Aufruf in
 * scripts/leitstand-server.mjs durchgesetzt (D2, Plan Abschnitt 0/4) — der
 * Wurf hier ist die zweite, unabhängige Ladung desselben Artefakts (D3,
 * bewusste Duplikation, kein Transportfeld für den bereits geladenen Wert).
 *
 * F13 WS-3 (features/F13/feature.md, AK5 — nur für art:'terminal', siehe
 * dortige Scope-Einschränkung): der vorgaengerLaufId-Block prüft zusätzlich,
 * ob ein entscheidung-<vorgaengerLaufId>-Artefakt existiert (von
 * scripts/leitstand-server.mjs' POST /api/entscheidungen im
 * art:'terminal'-Zweig registriert). Anders als die Laufakte-Prüfung ist das
 * KEIN Wurf bei null — nicht jeder Vorgängerlauf hatte eine Entscheidung.
 * Bei Treffer wird der Anfragenliste ein weiterer notwendig:true-Eintrag
 * NACH dem Laufakte-Eintrag eingefügt (Reihenfolge bleibt [auftragRef,
 * laufakteRef, entscheidungRef?, …eingaben.anfragen] — der bereits getestete
 * auftragRef/laufakteRef-Vorrang aus F12 WS-2 wird nicht verändert).
 *
 * F16 WS-3a (features/F16/feature.md, AK11): GENAU EINE Worker-Weiche, nach
 * dem Promptbau und vor dem Gateway-Aufruf. eingaben.worker (additiv,
 * optional, fehlend = 'claude-code') wählt zwischen baueAufruf +
 * starteGateway und baueCodexAufruf + starteCodexGateway; eingaben
 * .ausgabeSchemaPfad ist der bereits vom Dispatcher aufgelöste und geprüfte
 * ABSOLUTE Pfad des Ausgabeschemas (scripts/leitstand-server.mjs,
 * loeseAusgabeSchemaAuf, AK10) — der Controller reicht ihn durch und
 * beschafft ihn nicht.
 *
 * Alles vor und nach der Weiche bleibt gemeinsam: Kontextpaket (F5),
 * Prompttext, Klassifikation (F7) und der E-186-Eskalationszweig. Eine zweite
 * Weiche in der Klassifikation gibt es bewusst nicht — klassifiziereLauf
 * verzweigt seit F16 WS-2 (AK8) selbst nach laufakte.worker. Zwei Stellen,
 * die dieselbe Worker-Frage beantworten, laufen auseinander.
 *
 * F36 WS-5b: bei eingaben.ortBLauf (nur Ausführung mit Ort-B-Skills) geht ein Init-Gate an starteGateway,
 * und nach dem Lauf liest leseClaudeAenderungen den Laufdiff unter .claude/ — die Bewertung (rot) bleibt
 * bei klassifiziereLauf (eingaben.claudeAenderungen), der Controller urteilt nicht selbst. Seit F-832
 * kommt ein Dateisystem-Vergleich von <projekt>/.claude vor/nach dem Lauf hinzu (erfasseClaudeOrdner,
 * vergleicheClaudeOrdner), der auch git-ignorierte Dateien sieht.
 *
 * F45 B2b-3b-1b: nur bei eingaben.rueckfrageKanal (Rückfrage-Kanal eingeschaltet, vom Server gesetzt) liest der Controller
 * nach dem Gateway das Protokoll `rueckfragen-<laufId>` (seit B2b-3b-2b-1a alle Zuwachs-Versionen, zusammengesetzt) und reicht
 * es (oder null) als eingaben.rueckfragen an klassifiziereLauf — das Urteil (Ablehnung allein durch Stefan ⇒ ERFOLGREICH)
 * bleibt beim Evaluator. Ohne Kanal kein Lesen, Eingaben unverändert. Seit B2b-3b-2a (F-1128 (1)) gilt die Datei nur, wenn sie
 * zum Speicherstand der Vermittlung passt (optionen.rueckfrageZugang, ermittleRueckfrageProtokoll) — sonst null, und seit
 * B2b-3b-2b-1a (R3) geht die Abweichung über den Zugang in die Startfehlerliste des Servers. Seit B2b-3b-2b-2a-1 zusätzlich als
 * eingaben.rueckfrageAbweichung an den Evaluator (dauerhaft in daten der Terminalmarke), dazu die Zählung der Antworten aus dem
 * Speicherstand (leseRueckfrageZaehlung, eingaben.rueckfrageZaehlung).
 */

import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, readlinkSync } from 'node:fs'
import { join, relative } from 'node:path'
import { starteGateway, baueAufruf } from '../claude-code-gateway/index.ts'
import { starteCodexGateway, baueCodexAufruf } from '../codex-gateway/index.ts'
import { baueKontextpaket, elementSchluessel } from '../context-builder/index.ts'
import type { Anfrage, KontextpaketV0Daten } from '../context-builder/types.ts'
import { kanonischesJson, sha256Hex, stelleLaufstatusFest } from '../checkpoint-store/index.ts'
import type { ProfilReferenz } from '../checkpoint-store/types.ts'
import { fuehreGitSync } from '../git-starter/index.ts'
import { hashLokaleDatei, pruefeGegenMomentaufnahme } from '../faehigkeiten/index.ts'
import { erfassePluginDatenordner, vergleicheLaufKopie, vergleichePluginDatenordner } from '../plugin-lauf/index.ts'
import { erfasseBedarf, erzeugeTransportpaket, haendigeAus } from '../human-transport/index.ts'
import { ladeArtefaktVersion, listeVersionen } from '../lineage-registry/index.ts'
import { klassifiziereLauf } from '../result-evaluator/index.ts'
import type { RueckfrageZaehlung } from '../result-evaluator/types.ts'
import { bestaetigeProtokoll, setzeProtokollZusammen } from '../rueckfrage/protokoll.ts'
import type { AusfuehrungsEingaben, AusfuehrungsErgebnis, AusfuehrungsOptionen, RueckfrageZugang } from './types.ts'

/** F45 F-3b-2: höchstens so viele Abweichungen des Plugin-Datenordners in der Laufakte (Rest als „… und n weitere“). */
const DATENORDNER_ANZEIGE = 50

/** Eigene, vom auslösenden Lauf syntaktisch verschiedene laufId für eine E-186-Eskalation (plan-v1 Abschnitt 2.2, D3). Der randomUUID-Suffix verhindert eine ID-Kollision bei einer etwaigen zweiten Eskalation desselben Laufs. */
function eskalationsLaufId(ausloesenderLaufId: string): string {
  return `${ausloesenderLaufId}-eskalation-${randomUUID()}`
}

/** Artefakt-ID der Laufakte eines Vorgängerlaufs (WS-2b, AK7) — eigene Kleinstfunktion, konsistent mit eskalationsLaufId oben, statt Zugriff auf die nicht exportierte gleichnamige Hilfsfunktion in claude-code-gateway/index.ts. */
function vorgaengerLaufakteArtefaktId(vorgaengerLaufId: string): string {
  return `laufakte-${vorgaengerLaufId}`
}

/** Artefakt-ID einer über POST /api/entscheidungen(art:'terminal') festgehaltenen Entscheidung zum Vorgängerlauf (F13 WS-3, AK5) — Gegenstück zu scripts/leitstand-server.mjs' entscheidung-<laufId>-Registrierung. */
function vorgaengerEntscheidungArtefaktId(vorgaengerLaufId: string): string {
  return `entscheidung-${vorgaengerLaufId}`
}

/**
 * F36 WS-5b (F-791 (4b)): Pfade des Laufdiffs (`git status --porcelain -z --untracked-files=all`, also
 * geänderte, gelöschte, umbenannte und neue Dateien, ohne ignorierte) mit einem Segment '.claude'. Die
 * Ausführung verlangt vorher einen sauberen Arbeitsbaum, jeder Treffer stammt also aus dem Lauf. Ist git
 * nicht lesbar, gilt das als Treffer (fail-closed).
 * @param projektWurzel - Repo des Laufs
 * @returns betroffene Pfade ('/' als Trenner), leer = keine Änderung unter .claude/
 */
export function leseClaudeAenderungen(projektWurzel: string): string[] {
  let roh: string
  try {
    roh = fuehreGitSync(['--no-optional-locks', 'status', '--porcelain=v1', '-z', '--untracked-files=all'], {
      cwd: projektWurzel,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 50_000_000,
      timeout: 30_000,
    })
  } catch (fehler) {
    console.error(`[execution-controller] Laufdiff in '${projektWurzel}' nicht lesbar:`, fehler)
    return [`(Laufdiff nicht lesbar: ${(fehler as Error).message})`]
  }
  return claudePfadeAusStatus(roh)
}

/**
 * Pfade mit einem Segment '.claude' (ohne Unterschied der Schreibweise) aus der Ausgabe von
 * `git status --porcelain=v1 -z` — rein. F45 FB-2 (Advisor 3): dieselbe Sicht für den Laufdiff und für den
 * Hinweis „ungesichert“ der Abnahme (scripts/leitstand/routen-faehigkeit-vorschlag.mjs).
 * @param roh - Ausgabe von git status (NUL-getrennt)
 * @returns betroffene Pfade, auch der alte Pfad einer Umbenennung
 */
export function claudePfadeAusStatus(roh: string): string[] {
  const pfade: string[] = []
  const teile = roh.split('\0')
  for (let i = 0; i < teile.length; i++) {
    const eintrag = teile[i]
    if (eintrag.length < 4) continue
    const status = eintrag.slice(0, 2)
    pfade.push(eintrag.slice(3))
    // Umbenennung/Kopie: der alte Pfad folgt als eigenes Feld.
    if (/[RC]/.test(status)) pfade.push(teile[++i] ?? '')
  }
  // Groß-/Kleinschreibung egal: auf NTFS ist .Claude/skills derselbe Ort (Reviewer).
  return pfade.filter((pfad) => pfad.replaceAll('\\', '/').split('/').some((segment) => segment.toLowerCase() === '.claude'))
}

/**
 * F-832: Momentaufnahme von <projekt>/.claude im Dateisystem — rekursiv, relativer Pfad ('/' als
 * Trenner) → sha256 des Inhalts, INKLUSIVE git-ignorierter Dateien (der git-Weg sieht sie nicht:
 * `.gitignore` plus npm-Skript umgingen ihn). Symlinks zählen mit ihrem Ziel, nicht gefolgt.
 * @param projektWurzel - Repo des Laufs
 * @returns Map (leer, wenn .claude fehlt) oder null, wenn der Ordner nicht lesbar ist
 */
export function erfasseClaudeOrdner(projektWurzel: string): Map<string, string> | null {
  const wurzel = join(projektWurzel, '.claude')
  const stand = new Map<string, string>()
  if (!existsSync(wurzel)) return stand
  try {
    for (const eintrag of readdirSync(wurzel, { recursive: true, withFileTypes: true })) {
      if (eintrag.isDirectory()) continue
      const pfad = join(eintrag.parentPath, eintrag.name)
      // Nur reguläre Dateien werden gelesen — eine FIFO o. Ä. ließe readFileSync hängen; sie zählt mit ihrem Typ.
      const inhalt = eintrag.isSymbolicLink() ? `symlink:${readlinkSync(pfad)}` : eintrag.isFile() ? readFileSync(pfad) : 'sonderdatei'
      stand.set(relative(wurzel, pfad).replaceAll('\\', '/'), createHash('sha256').update(inhalt).digest('hex'))
    }
  } catch (fehler) {
    console.error(`[execution-controller] .claude-Ordner in '${projektWurzel}' nicht lesbar:`, fehler)
    return null
  }
  return stand
}

/**
 * F-832: Vorher/Nachher-Vergleich von <projekt>/.claude — neue, geänderte und gelöschte Pfade.
 * Fehlt die Momentaufnahme von vorher (nicht lesbar), gilt nur der git-Weg (leseClaudeAenderungen) —
 * bekannte Grenze. Ist der Ordner nachher nicht lesbar, zählt das als Treffer (fail-closed).
 * @param vorher - erfasseClaudeOrdner vor dem Start, oder null
 * @param projektWurzel - Repo des Laufs
 * @returns Pfade mit Präfix '.claude/', leer = unverändert
 */
export function vergleicheClaudeOrdner(vorher: Map<string, string> | null, projektWurzel: string): string[] {
  if (vorher === null) return []
  const nachher = erfasseClaudeOrdner(projektWurzel)
  if (nachher === null) return ['(.claude-Ordner nach dem Lauf nicht lesbar)']
  const pfade = [...nachher].filter(([pfad, hash]) => vorher.get(pfad) !== hash).map(([pfad]) => pfad)
  for (const pfad of vorher.keys()) if (!nachher.has(pfad)) pfade.push(pfad)
  return pfade.sort().map((pfad) => `.claude/${pfad}`)
}

/**
 * Baut den Prompttext für F6as `-p`-Argument ausschließlich aus den von F5
 * tatsächlich AKZEPTIERTEN Kontextpaket-Elementen (F-124) — eine von F5
 * ausgeschlossene Anfrage (Rollenfilter D1/D14, Budget) landet damit nie im
 * Prompt, das wäre ein Bruch der bereits getroffenen F5-Entscheidung durch
 * die Hintertür. Kein Nachbau von F5s Element-Schlüsselbildung: elementSchluessel
 * ist F5s eigene, hier nur wiederverwendete Funktion (D5).
 * @param paket - von F5 zurückgegebenes, bereits gefiltertes/budgetiertes Kontextpaket
 * @param anfragen - dieselbe Anfragenliste, die an baueKontextpaket ging (inkl. WS-2b-Lineage-Voranstellung)
 * @returns lesbarer Text, ein Abschnitt je akzeptiertem Element
 */
function bauePromptAusKontextpaket(paket: KontextpaketV0Daten, anfragen: Anfrage[]): string {
  const anfrageNachSchluessel = new Map<string, Anfrage>()
  for (const anfrage of anfragen) {
    const schluessel = elementSchluessel(anfrage)
    if (!anfrageNachSchluessel.has(schluessel)) anfrageNachSchluessel.set(schluessel, anfrage)
  }
  const abschnitte = paket.elemente.map((element) => {
    const anfrage = anfrageNachSchluessel.get(element.pfad)
    if (anfrage === undefined) {
      throw new Error(`Kontextpaket-Element '${element.pfad}' hat keine zugehörige Anfrage — F5/F8-Vertragsbruch`)
    }
    return `Pfad: ${anfrage.pfad}\nFrage: ${anfrage.frage}\nBegründung: ${anfrage.begruendung}\nInhalt:\n${anfrage.inhalt}`
  })
  return abschnitte.join('\n\n---\n\n')
}

/**
 * F45 B2b-3b-1b: liest das Protokoll `rueckfragen-<laufId>` — seit B2b-3b-2b-1a alle Versionen (je nur der Zuwachs, Schema v1),
 * lückenlos zusammengesetzt (setzeProtokollZusammen) zu einem Protokoll mit `ab: 0`. Fail closed: keine Version oder ein Wurf
 * beim Lesen ⇒ null; nicht zusammensetzbar (Lücke, fremde lauf_id, ungültige Version) ⇒ `{ ungueltig: grund }` (Delta D5:
 * bestaetigeProtokoll meldet das auch bei leerem Speicher). Der Evaluator bekommt nur bestätigte Daten. Wirft nie, damit die
 * Klassifikation eines schon gelaufenen Laufs nicht ausfällt.
 * @param laufId - Lauf
 * @param basisVerzeichnis - Kontrollzustand-Wurzel (dieselbe, in die der Server schreibt)
 * @returns zusammengesetzte daten, null oder { ungueltig: grund }
 */
export function leseRueckfrageProtokoll(laufId: string, basisVerzeichnis: string | undefined): unknown {
  try {
    const zusammen = setzeProtokollZusammen(listeVersionen(`rueckfragen-${laufId}`, { basisVerzeichnis, schreiber: () => {} }), laufId)
    if (zusammen.ok) return zusammen.daten
    console.error(`[execution-controller] Rückfrage-Protokoll von Lauf '${laufId}' nicht zusammensetzbar (${zusammen.grund}) — gilt als fehlend (Ablehnungen durch Stefan zählen nicht)`)
    return { ungueltig: zusammen.grund }
  } catch (fehler) {
    console.error(`[execution-controller] Rückfrage-Protokoll von Lauf '${laufId}' nicht lesbar — gilt als fehlend (Ablehnungen durch Stefan zählen nicht):`, fehler)
    return null
  }
}

/**
 * F45 B2b-3b-2a (F-1128 (1)): Protokoll für die Klassifikation — der Speicherstand der Vermittlung (gleicher Prozess) ist die
 * Quelle der Wahrheit, die Datei `rueckfragen-<laufId>` das Audit. Erst den Speicher, direkt danach (synchron) die Datei lesen;
 * nur eine zum Speicher passende Datei geht weiter (bestaetigeProtokoll), sonst null ⇒ wie fehlend ⇒ VERWEIGERT (fail closed:
 * gefälschte Datei, Schreibfehler, Lauf nicht offen, Neustart). Eine Abweichung wird mit Grund gemeldet — seit B2b-3b-2b-1a
 * (F-1128 R3) zusätzlich über `zugang.meldeAbweichung` (Server: Startfehlerliste); ein Lauf ohne Rückfrage (Speicher leer,
 * keine Datei) nicht. Wirft nie (Delta D1).
 * @param laufId - Lauf
 * @param basisVerzeichnis - Kontrollzustand-Wurzel (dieselbe, in die der Server schreibt)
 * @param zugang - optionen.rueckfrageZugang (Speicherstand und Meldeweg der Vermittlung) oder undefined
 * @returns daten der Datei oder null
 */
export function ermittleRueckfrageProtokoll(laufId: string, basisVerzeichnis: string | undefined, zugang: RueckfrageZugang | undefined): unknown {
  try {
    let speicher: unknown = null
    try {
      speicher = zugang?.speicher() ?? null
    } catch (fehler) {
      console.error(`[execution-controller] Speicherstand des Rückfrage-Kanals von Lauf '${laufId}' nicht lesbar:`, fehler)
    }
    const bestaetigt = bestaetigeProtokoll(leseRueckfrageProtokoll(laufId, basisVerzeichnis), speicher)
    if (bestaetigt.ok) return bestaetigt.daten
    if (bestaetigt.leer !== true) {
      console.error(`[execution-controller] Rückfrage-Protokoll von Lauf '${laufId}' nicht bestätigt (${bestaetigt.grund}) — gilt als fehlend (Ablehnungen durch Stefan zählen nicht)`)
      try {
        zugang?.meldeAbweichung(bestaetigt.grund)
      } catch (fehler) {
        console.error(`[execution-controller] Abweichung des Rückfrage-Protokolls von Lauf '${laufId}' nicht gemeldet:`, fehler)
      }
    }
    return null
  } catch (fehler) {
    console.error(`[execution-controller] Rückfrage-Protokoll von Lauf '${laufId}' nicht auswertbar — gilt als fehlend (Ablehnungen durch Stefan zählen nicht):`, fehler)
    return null
  }
}

/**
 * F45 B2b-3b-2b-2a-1 (F-1128 R3): die über den Zugang gemeldete Abweichung Speicher/Datei (`zugang.abweichung`). Wirft nie; ohne
 * Zugang, ohne Meldung, bei Wurf oder fremder Form ⇒ undefined.
 * @param laufId - Lauf (nur für die Meldung)
 * @param zugang - optionen.rueckfrageZugang oder undefined
 * @returns Grund oder undefined
 */
export function leseRueckfrageAbweichung(laufId: string, zugang: RueckfrageZugang | undefined): string | undefined {
  try {
    const grund: unknown = zugang?.abweichung?.()
    return typeof grund === 'string' && grund.length > 0 ? grund : undefined
  } catch (fehler) {
    console.error(`[execution-controller] Abweichung des Rückfrage-Kanals von Lauf '${laufId}' nicht lesbar:`, fehler)
    return undefined
  }
}

/** Felder der Zählung (RueckfrageZaehlung) — eine andere Form gilt als „keine Zählung“. */
const ZAEHLUNG_FELDER: readonly (keyof RueckfrageZaehlung)[] = ['stefan_erlaubt', 'stefan_abgelehnt', 'frage_beantwortet', 'nicht_browser', 'abgelaufen', 'lauf_ende', 'automatisch']

/**
 * F45 B2b-3b-2b-2a-1 (F-1128 (3), D13): Zählung der Rückfragen aus dem Speicherstand der Vermittlung (`zugang.zaehlung`, gleicher
 * Prozess). Wirft nie; ohne Zugang, ohne Zählung, bei Wurf oder fremder Form ⇒ undefined (daten der Terminalmarke bleiben dann ohne Feld).
 * B2b-3b-2b-2a-3 (F-1132 (1)): sieben Felder, dazu die unbeantworteten (abgelaufen, lauf_ende, automatisch).
 * @param laufId - Lauf (nur für die Meldung)
 * @param zugang - optionen.rueckfrageZugang oder undefined
 * @returns Zählung oder undefined
 */
export function leseRueckfrageZaehlung(laufId: string, zugang: RueckfrageZugang | undefined): RueckfrageZaehlung | undefined {
  try {
    const roh: unknown = zugang?.zaehlung?.()
    if (typeof roh !== 'object' || roh === null) return undefined
    const werte = roh as Record<string, unknown>
    if (!ZAEHLUNG_FELDER.every((f) => Number.isInteger(werte[f]) && (werte[f] as number) >= 0)) return undefined
    // code-reviewer 3: ausdrücklich gebaut — fehlt im Typ ein Feld oder kommt eines hinzu, meldet tsc es hier.
    const anzahl = (f: keyof RueckfrageZaehlung): number => werte[f] as number
    return { stefan_erlaubt: anzahl('stefan_erlaubt'), stefan_abgelehnt: anzahl('stefan_abgelehnt'), frage_beantwortet: anzahl('frage_beantwortet'), nicht_browser: anzahl('nicht_browser'), abgelaufen: anzahl('abgelaufen'), lauf_ende: anzahl('lauf_ende'), automatisch: anzahl('automatisch') }
  } catch (fehler) {
    console.error(`[execution-controller] Zählung des Rückfrage-Kanals von Lauf '${laufId}' nicht lesbar:`, fehler)
    return undefined
  }
}

/**
 * Führt einen Lauf vollständig durch F5 → F6a → F7 → F1B (feste
 * Reihenfolge, plan-v1 Abschnitt 2.1, Schritte 1–5).
 * @param laufId - eindeutige Lauf-Kennung, unverändert an jeden Schritt gereicht
 * @param profilReferenz - Profilbezug, unverändert an F5/F6a/F7 gereicht
 * @param eingaben - Rolle, Anfragen, Budget, Aufrufkonstruktion, Startziel,
 *   Pflichtfeld auftragId (F12 WS-2, AK5), optional vorgaengerLaufId für
 *   eine Wiederaufnahme (WS-2b, AK7)
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
  // ALLOWLIST des Ausführungswerkzeugs (F16 WS-3a, AK11), ganz vorn und vor
  // jeder Schreibwirkung — dieselbe Stelle wie die beiden Schwesterprüfungen
  // dieser Klasse (vorgaengerLaufId, auftragId). Ein Wert, den die
  // Worker-Weiche weiter unten nicht kennt, darf NICHT in den
  // Claude-Code-Zweig fallen: er bekäme dort Startziel und
  // Berechtigungskontext aus den flachen Vorlagenfeldern und liefe mit dem
  // geplanten — womöglich schreibenden — Werkzeugsatz los. Dieselbe Richtung,
  // die src/workflow/index.ts für seine Entscheidungsregeln festschreibt.
  //
  // Die Position ist Teil der Aussage (Reviewer-Pass 11.09.2026, V1): an der
  // Weiche selbst hätte baueKontextpaket längst einen Checkpoint geschrieben,
  // und laufIdBelegt() sperrte die laufId danach dauerhaft — die
  // Vorbedingungsverletzung hinterließe einen halb angelegten Lauf.
  //
  // Ein Wurf und keine Ablehnung: die Worker-Allowlists des Dispatchers
  // (Regel 4 in ermittleNaechstenSchritt, loeseAusfuehrungsEingabenAuf) haben
  // diesen Fall bereits abgefangen; ein Wert, der trotzdem hier ankommt, ist
  // eine Vorbedingungsverletzung des Aufrufers (Muster auftragId ohne
  // Auftragsakte). scripts/leitstand-server.mjs fängt ihn und meldet ihn über
  // meldeLaufende(null, fehler); der Workflow hält als FEHLGESCHLAGEN an.
  const workerGewaehlt: string = eingaben.worker ?? 'claude-code'
  if (workerGewaehlt !== 'claude-code' && workerGewaehlt !== 'codex') {
    throw new Error(`AusfuehrungsEingaben.worker '${workerGewaehlt}' ist keinem Aufrufbauer zugeordnet — Vorbedingungsverletzung (F16 WS-3a, AK11)`)
  }

  let anfragen: Anfrage[] = eingaben.anfragen
  if (eingaben.vorgaengerLaufId !== undefined) {
    const vorgaengerLaufakteVersion = ladeArtefaktVersion(vorgaengerLaufakteArtefaktId(eingaben.vorgaengerLaufId), undefined, {
      basisVerzeichnis: optionen.basisVerzeichnis,
      schreiber: optionen.schreiber,
    })
    if (vorgaengerLaufakteVersion === null) {
      throw new Error(`Vorgängerlauf '${eingaben.vorgaengerLaufId}' hat keine Laufakte — kein gültiger Vorgängerlauf für eine Wiederaufnahme (WS-2b, AK7)`)
    }

    // F13 WS-3 (AK5): nicht jeder Vorgängerlauf hatte eine über POST /api/entscheidungen(art:'terminal')
    // festgehaltene Entscheidung (z.B. ein direkt ERFOLGREICH/FEHLGESCHLAGEN beendeter Lauf) — anders als
    // die Laufakte-Prüfung oben ist das KEIN Wurf bei null, sondern ein optional übersprungener Eintrag.
    const vorgaengerEntscheidungVersion = ladeArtefaktVersion(vorgaengerEntscheidungArtefaktId(eingaben.vorgaengerLaufId), undefined, {
      basisVerzeichnis: optionen.basisVerzeichnis,
      schreiber: optionen.schreiber,
    })

    anfragen = [
      {
        pfad: `artefakt:laufakte-${eingaben.vorgaengerLaufId}`,
        frage: 'Kontext des vorherigen, klärungsbedürftigen/fehlgeschlagenen Laufs',
        begruendung: 'Lineage-Verweis auf den Vorgängerlauf (AK7)',
        inhalt: kanonischesJson(vorgaengerLaufakteVersion.daten),
        notwendig: true,
      },
      ...(vorgaengerEntscheidungVersion !== null
        ? [
            {
              pfad: `artefakt:entscheidung-${eingaben.vorgaengerLaufId}`,
              frage: 'Menschliche Entscheidung zum vorherigen, klärungsbedürftigen Lauf',
              begruendung: 'Lineage-Verweis auf die im Leitstand getroffene Entscheidung (F13 WS-3, AK5)',
              inhalt: kanonischesJson(vorgaengerEntscheidungVersion.daten),
              notwendig: true,
            },
          ]
        : []),
      ...eingaben.anfragen,
    ]
  }

  // F12 WS-2 (AK5): unbedingt, anders als der vorgaengerLaufId-Block oben — auftragId ist seit WS-2
  // Pflichtfeld. Nach dem vorgaengerLaufId-Block eingefügt, damit die Anfragenliste bei gleichzeitiger
  // Wiederaufnahme in der Reihenfolge [auftragRef, vorgaengerRef, …eingaben.anfragen] steht.
  const auftragVersion = ladeArtefaktVersion(`auftrag-${eingaben.auftragId}`, undefined, {
    basisVerzeichnis: optionen.basisVerzeichnis,
    schreiber: optionen.schreiber,
  })
  if (auftragVersion === null) {
    throw new Error(`Auftrag '${eingaben.auftragId}' hat keine Auftragsakte — Vorbedingungsverletzung (AK5)`)
  }
  anfragen = [
    {
      pfad: `artefakt:auftrag-${eingaben.auftragId}`,
      frage: 'Auftragsbezug dieses Laufs',
      begruendung: 'Lineage-Verweis auf den Auftrag (E-M2-4, AK5)',
      inhalt: kanonischesJson(auftragVersion.daten),
      notwendig: true,
    },
    ...anfragen,
  ]

  const kontextpaketErgebnis = baueKontextpaket(laufId, eingaben.rolle, anfragen, profilReferenz, eingaben.budget, {
    basisVerzeichnis: optionen.basisVerzeichnis,
    schreiber: optionen.schreiber,
  })
  if (!kontextpaketErgebnis.ok) {
    return { ok: false, stufe: 'kontextpaket', ergebnis: kontextpaketErgebnis }
  }

  const evidenzText = bauePromptAusKontextpaket(kontextpaketErgebnis.paket, anfragen)
  const promptText =
    evidenzText.length === 0 ? `Auftrag:\n${eingaben.auftragstext}` : `Auftrag:\n${eingaben.auftragstext}\n\n===\n\n${evidenzText}`
  // ─── Die EINE Worker-Weiche (F16 WS-3a, AK11) ────────────────────────────
  //
  // Die zugehörige Allowlist-Prüfung steht NICHT hier, sondern ganz am Anfang
  // dieser Funktion, vor jeder Schreibwirkung (Reviewer-Pass 11.09.2026, V1):
  // an dieser Stelle hätte baueKontextpaket längst einen Checkpoint
  // geschrieben, und laufIdBelegt() sperrte die laufId danach dauerhaft.
  //
  // Sie liegt genau hier: nach dem Promptbau, vor dem Gateway-Aufruf. Alles
  // davor ist workerunabhängig und bleibt es bewusst — Kontextpaket (F5),
  // Prompttext, und alles danach ebenso: Klassifikation (F7) und der
  // E-186-Eskalationszweig. Eine zweite Weiche in der Klassifikation gibt es
  // nicht und darf es nicht geben: klassifiziereLauf verzweigt seit F16 WS-2
  // (AK8) SELBST nach laufakte.worker, und der Controller weiß davon nichts.
  // Zwei Stellen, die dieselbe Worker-Frage beantworten, sind zwei Stellen,
  // die auseinanderlaufen können.
  //
  // Vorgabe 'fehlend = claude-code' (AK4): jeder Aufrufer von vor F16 landet
  // unverändert im bisherigen Zweig, ohne ein Feld zu setzen.
  //
  // ALLOWLIST, kein `=== 'codex' ? … : …` (Reviewer-/QA-Pass 11.09.2026,
  // Befund 1/7): ein Wert, den diese Weiche nicht kennt, darf NICHT in den
  // Claude-Code-Zweig fallen. Er bekäme dort Startziel und
  // Berechtigungskontext aus den flachen Vorlagenfeldern und liefe mit dem
  // geplanten — womöglich schreibenden — Werkzeugsatz los. Dieselbe Richtung,
  // die src/workflow/index.ts für seine Entscheidungsregeln festschreibt.
  // Hier ein Wurf und keine Ablehnung: die Worker-Allowlist des Dispatchers
  // (Regel 4) hat diesen Fall bereits abgefangen, ein Wert, der trotzdem
  // ankommt, ist eine Vorbedingungsverletzung des Aufrufers (Muster
  // auftragId ohne Auftragsakte oben).
  // F-832: Momentaufnahme von <projekt>/.claude vor dem Start (inkl. git-ignorierter Dateien).
  const claudeOrdnerVorher = eingaben.ortBLauf !== undefined ? erfasseClaudeOrdner(eingaben.ortBLauf.projektWurzel) : undefined
  // F45 F-1 (Delta B1): Stand der lokalen Fähigkeiten-Datei vor dem Lauf — ein Lauf darf sich nichts selbst freigeben.
  // Code-Review 2: für jeden Lauf, dem der Server den Pfad mitgibt (jeder schreibende Lauf), nicht nur mit Katalog-Kontext.
  const lokaleDateiVorher = typeof eingaben.faehigkeitenLokalPfad === 'string' ? hashLokaleDatei(eingaben.faehigkeitenLokalPfad) : undefined
  // F45 F-3b-2 (Variante A): Plugin-Datenordner vor dem Lauf, nur lesend; nach dem Lauf Vergleich als Befund (kein Abbruch).
  const pluginsImLauf = eingaben.pluginsImLauf
  const datenordnerVorher = pluginsImLauf !== undefined ? erfassePluginDatenordner(pluginsImLauf.datenordner, process.env) : undefined
  const gatewayErgebnis =
    workerGewaehlt === 'codex'
      ? await starteCodexGateway(
          {
            laufId,
            profilReferenz,
            // baueCodexAufruf verlangt einen ABSOLUTEN ausgabeSchemaPfad und
            // wirft sonst (AK1). Aufgelöst hat ihn der Dispatcher; hier wird
            // nur durchgereicht — der Controller kennt die Repo-Wurzel nicht.
            tokens: baueCodexAufruf({
              modell: eingaben.aufrufEingaben.modell,
              prompt: promptText,
              ausgabeSchemaPfad: eingaben.ausgabeSchemaPfad ?? null,
            }),
            werkzeugStartziel: eingaben.werkzeugStartziel,
            werkzeugVersionDeklariert: eingaben.werkzeugVersionDeklariert,
            // modell_beobachtet bleibt für Codex null (F-305); der Modellname
            // ist nur DEKLARIERT bekannt, aus demselben Wert, der eben ins
            // Argv ging (E-185).
            modellDeklariert: eingaben.aufrufEingaben.modell,
            // Benannte Grenze, nicht vergessen (F-323): aus aufrufEingaben
            // liest dieser Zweig NUR modell. Der aufgelöste Werkzeugsatz
            // bleibt hier ohne Wirkung — 'codex exec' hat keinen Schalter
            // dafür, und die Argv-Allowlist (AK2) ließe einen erfundenen
            // nicht durch. Die strukturelle Grenze trägt '--sandbox
            // read-only'; die Entscheidung, was ein geplanter Werkzeugsatz
            // an einem Codex-Schritt bedeuten soll, gehört zum Rollenvertrag
            // (F-184/F17) und ist vor AK12 zu treffen.
          },
          {
            schreiber: optionen.schreiber,
            basisVerzeichnis: optionen.basisVerzeichnis,
            rohBasisVerzeichnis: optionen.rohBasisVerzeichnis,
            starter: optionen.starter,
            zeitgrenzeMs: optionen.zeitgrenzeMs,
            abbruchSignal: optionen.abbruchSignal,
            cwd: optionen.cwd,
            // F45 B2a-1: Projektkarte für die Laufakte — für beide Worker gleich. F45 B2a-3a: ebenso review.
            ...(eingaben.projektkarte !== undefined ? { projektkarte: eingaben.projektkarte } : {}),
            ...(eingaben.review !== undefined ? { review: eingaben.review } : {}),
          }
        )
      : await starteGateway(
          {
            laufId,
            profilReferenz,
            tokens: baueAufruf({ ...eingaben.aufrufEingaben, prompt: promptText }),
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
            zeitgrenzeMs: optionen.zeitgrenzeMs,
            bashZeitgrenzeMs: optionen.bashZeitgrenzeMs,
            abbruchSignal: optionen.abbruchSignal,
            cwd: optionen.cwd,
            zeitmessung: optionen.zeitmessung,
            beiWerkzeugaufruf: optionen.beiWerkzeugaufruf,
            // Task "Jarvis-Chat-Latenz senken", Schritt 3: aus eingaben.aufrufEingaben gelesen
            // (Muster settingSources/mcpConfig oben in baueAufruf), NICHT aus optionen — bewusst
            // NICHT in AusfuehrungsOptionen (Muster-Kommentar dort), weil dieses Feld wie
            // settingSources/mcpConfig zum Aufrufbau-Parametersatz EINES Laufs gehört, nicht zur
            // Controller-weiten Durchreichung.
            umgebungsvariablen: eingaben.aufrufEingaben.umgebungsvariablen,
            // F36 WS-5b: Init-Gate nur für Läufe mit Ort-B-Skills (eingaben.ortBLauf).
            // F45 F-1: dasselbe Gate auch für Läufe mit aktiven Projekt-Agents/-Skills; agents nur mit aktivem Agent.
            ...(eingaben.ortBLauf !== undefined
              ? {
                  initGate: {
                    skills: eingaben.ortBLauf.skillNamen,
                    mcpServer: eingaben.ortBLauf.mcpServer,
                    gesperrt: eingaben.ortBLauf.gesperrteNamen,
                    ...(eingaben.ortBLauf.agents !== undefined ? { agents: eingaben.ortBLauf.agents } : {}),
                    ...(eingaben.ortBLauf.pflichtSkills !== undefined ? { pflichtSkills: eingaben.ortBLauf.pflichtSkills } : {}),
                    // F45 F-3b-2 (Advisor A12): Soll der Lauf-Kopien — fehlte es, bräche jeder Plugin-Lauf am Standard [] ab.
                    ...(eingaben.ortBLauf.plugins !== undefined ? { plugins: eingaben.ortBLauf.plugins } : {}),
                  },
                }
              : {}),
            // F45 F-1: eingefrorene Fähigkeiten (Laufakte) und Abgleich ihrer Hashes mit der Momentaufnahme vor dem Spawn (Advisor A6).
            ...(eingaben.faehigkeitenImLauf !== undefined
              ? { faehigkeitenImLauf: eingaben.faehigkeitenImLauf, vorStartPruefung: () => pruefeGegenMomentaufnahme(eingaben.faehigkeitenImLauf ?? [], claudeOrdnerVorher ?? null) }
              : {}),
            ...(pluginsImLauf !== undefined && datenordnerVorher !== undefined
              ? {
                  pluginsImLauf: {
                    // Beide Bausteine werfen nie (src/plugin-lauf) — jede Lauf-Kopie behält ihren Hash in der Laufakte (Code-Review 5).
                    nachLauf: () => {
                      const nachher = erfassePluginDatenordner(pluginsImLauf.datenordner, process.env)
                      const alle = datenordnerVorher.ok && nachher.ok ? vergleichePluginDatenordner(datenordnerVorher.stand, nachher.stand) : null
                      // Code-Review 6 / QA N3: höchstens DATENORDNER_ANZEIGE Einträge in Laufakte, Log und Anzeige, Rest als Zähler.
                      const abweichungen = alle === null ? null : alle.length > DATENORDNER_ANZEIGE ? [...alle.slice(0, DATENORDNER_ANZEIGE), `… und ${alle.length - DATENORDNER_ANZEIGE} weitere`] : alle
                      const datenordner = !datenordnerVorher.ok ? { grund: datenordnerVorher.grund } : !nachher.ok ? { grund: nachher.grund } : { abweichungen: abweichungen ?? [] }
                      if (abweichungen !== null && abweichungen.length > 0) console.error(`[execution-controller] Lauf '${laufId}': Plugin-Datenordner im Lauf verändert: ${abweichungen.join('; ')}`)
                      return {
                        lauf_kopien: pluginsImLauf.lauf_kopien.map(({ ordner, dateien, ...k }) => ({ ...k, abweichung_nachher: vergleicheLaufKopie({ ordner, dateien }) })),
                        datenordner,
                      }
                    },
                  },
                }
              : {}),
            ...(eingaben.projektkarte !== undefined ? { projektkarte: eingaben.projektkarte } : {}),
            ...(eingaben.review !== undefined ? { review: eingaben.review } : {}),
          }
        )
  if (!gatewayErgebnis.ok) {
    return { ok: false, stufe: 'gateway', grund: gatewayErgebnis.grund }
  }

  // F36 WS-5b (F-791 (4b)): Laufdiff eines Ort-B-Laufs auf Änderungen unter .claude/ — die Bewertung
  // selbst (rot) macht klassifiziereLauf; hier wird nur der Diff gelesen.
  // F-832: zusätzlich der Dateisystem-Vergleich gegen die Momentaufnahme vor dem Start.
  const claudeAenderungenOrdner =
    eingaben.ortBLauf !== undefined && claudeOrdnerVorher !== undefined
      ? [...new Set([...leseClaudeAenderungen(eingaben.ortBLauf.projektWurzel), ...vergleicheClaudeOrdner(claudeOrdnerVorher, eingaben.ortBLauf.projektWurzel)])]
      : undefined
  // F45 F-1 (Delta B1): eine im Lauf veränderte lokale Fähigkeiten-Datei zählt wie eine Änderung unter .claude/ (rot).
  const lokaleDateiGeaendert = lokaleDateiVorher !== undefined && hashLokaleDatei(eingaben.faehigkeitenLokalPfad ?? null) !== lokaleDateiVorher
  const claudeAenderungen = lokaleDateiGeaendert ? [...(claudeAenderungenOrdner ?? []), 'faehigkeiten.lokal.json (~/.ai-workforce) im Lauf verändert'] : claudeAenderungenOrdner

  // F31 WS-3-Zeitmessung (nur bei LEITSTAND_ZEITMESSUNG=1 gesetzt, sonst undefined — No-op):
  // klassifiziereLauf schreibt die terminale Wirkungsmarke über F1B, ist also die Grenze
  // zwischen "Werkzeugprozess fertig" und "Lauf terminal". Ohne diese beiden Marken war die
  // Nachbereitungsdauer nur aus (run_prepared→terminal) minus duration_ms ableitbar — eine
  // Rechnung, die CLI-Start/-Ende fälschlich der Nachbereitung zuschlägt.
  // F45 B2b-3b-1b: Protokoll des Rückfrage-Kanals — nur bei eingeschaltetem Kanal; synchron direkt vor der Klassifikation
  // (die Vermittlung schreibt jede Entscheidung vor ihrer Auslieferung, Advisor-Befund 1). Fehlt es oder wirft das Lesen
  // (z. B. EBUSY/EPERM unter OneDrive): null — wie fehlend, also VERWEIGERT; die Terminalmarke wird trotzdem geschrieben.
  // B2b-3b-2a (F-1128 (1)): die Datei gilt nur passend zum Speicherstand der Vermittlung (ermittleRueckfrageProtokoll).
  const rueckfragen = eingaben.rueckfrageKanal !== undefined ? ermittleRueckfrageProtokoll(laufId, optionen.basisVerzeichnis, optionen.rueckfrageZugang) : undefined
  // B2b-3b-2b-2a-1 (F-1128 R3/(3)): die gemeldete Abweichung (der Zugang merkt sie) und die Zählung aus dem Speicherstand (D13) —
  // beide nach ermittleRueckfrageProtokoll und vor beendeLauf gelesen; sie gehen in daten der Terminalmarke.
  // B2b-3b-2b-2a-3 (Advisor M1, Invariante): von hier bis zur Rückgabe kein await — die beim Lesen offenen Rückfragen (Zählung
  // `lauf_ende`) sind dann genau die, die beendeLauf im Server danach ablehnt; kein Timer und keine Antwort schiebt sich dazwischen.
  const rueckfrageAbweichung = eingaben.rueckfrageKanal !== undefined ? leseRueckfrageAbweichung(laufId, optionen.rueckfrageZugang) : undefined
  const rueckfrageZaehlung = eingaben.rueckfrageKanal !== undefined ? leseRueckfrageZaehlung(laufId, optionen.rueckfrageZugang) : undefined

  optionen.zeitmessung?.('klassifikation_begonnen')
  const klassifikation = klassifiziereLauf(
    laufId,
    profilReferenz,
    {
      laufakte: gatewayErgebnis.laufakte,
      ...(claudeAenderungen !== undefined ? { claudeAenderungen } : {}),
      ...(rueckfragen !== undefined ? { rueckfragen } : {}),
      ...(rueckfrageAbweichung !== undefined ? { rueckfrageAbweichung } : {}),
      ...(rueckfrageZaehlung !== undefined ? { rueckfrageZaehlung } : {}),
    },
    { basisVerzeichnis: optionen.basisVerzeichnis, schreiber: optionen.schreiber }
  )
  optionen.zeitmessung?.('terminal_checkpoint_geschrieben')

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
