/**
 * Datei: src/feature-auftrag/ist-nach-abnahme.ts
 *
 * Zweck: F45 B5b-3 „Ist nach Abnahme“ (R7, docs/projekt/fixpaket-f45.md §2; features/F45/plan-b5b3-v2.md) — nach der Abnahme
 * (ANGENOMMEN) eines Ablaufs mit feature_ref schreibt der Kern die eine laufende Workstream-Zeile der Akte fort: Status
 * `erledigt`, Abgenommen = Tag der Abnahme, Begonnen (nur wenn leer) aus der Anlage des Ablaufs, Ist = Arbeitstage Begonnen →
 * Abnahme nach der Regel der Ist-Zone (arbeitstageBis), 0 ⇒ `–` (Entscheidung Stefan A3: keine erfundene 0). Rein, kein I/O,
 * wirft nicht; Lesen, Schreiben und Rückbau liegen bei scripts/leitstand/ist-nach-abnahme.mjs.
 *
 * Regeln in fester Reihenfolge: CRLF ⇒ Hinweis (Auftrag: nichts schreiben) · Feature ABGESCHLOSSEN/ABGEBROCHEN ⇒ Hinweis ·
 * eine Änderungszeile endet schon mit `· Abnahme <workflowId>` ⇒ schon_geschrieben (idempotent, Token exakt am Zeilenende) ·
 * kein strenger Abschnitt `## Workstreams` oder Formfehler ⇒ Hinweis · keine laufende Zeile ⇒ Hinweis auf die Vorbedingung, mehrere ⇒ Hinweis mit Anzahl · Begonnen nach
 * dem Abnahmetag ⇒ Hinweis (das Akte-Gate meldete es, Advisor A1) · Zeile ersetzen, Änderungszeile anhängen
 * (Grund „Abnahme <workflowId>“), Akte-Gate und Rundlauf über lesePlanung ⇒ sonst Hinweis.
 *
 * Wird aufgerufen von: scripts/leitstand/ist-nach-abnahme.mjs, src/feature-auftrag/ist-nach-abnahme.test.ts.
 *
 * Wichtig — bekannte Grenzen (DEKLARIERT, Plan v2): Die Zuordnung geht nur über feature_ref und den Status `laeuft`; wer die
 * Zeile vor dem Start nicht auf `laeuft` setzt und committet, bekommt einen Hinweis (A2). Ein Workstream mit mehreren Abläufen
 * ist mit der ersten Abnahme erledigt. Feiertage kennt die Rechnung nicht.
 */

import { leseFeatureStatus, pruefeFeatureAkteInhalt } from '../workboard/feature-akte-pruefung.ts'
import { lesePlanung } from '../workboard/feature-planung.ts'
import { arbeitstageBis } from '../workboard/roadmap-planung.ts'
import { haengeAenderungAn, pruefeAkteGate, STATUS_NICHT_BEARBEITBAR, wendeAn } from './akte-schreiben.ts'
import { ersetzeZelle, workstreamZeilen } from './planung-schreiben.ts'

/** Eingaben neben dem Akte-Text. */
export interface IstNachAbnahmeEingabe {
  workflowId: string
  /** Tag der Abnahme, JJJJ-MM-TT */
  datum: string
  /** Tag der Anlage des Ablaufs (JJJJ-MM-TT) oder null — nur genutzt, wenn Begonnen leer ist */
  begonnenErsatz: string | null
}

export type IstNachAbnahmeErgebnis =
  | { art: 'geschrieben'; inhalt: string; workstream: string; ist: number | null }
  | { art: 'schon_geschrieben' }
  | { art: 'hinweis'; grund: string }

const VON_HAND = '— von Hand nachtragen'

/**
 * Schreibt die laufende Workstream-Zeile nach der Abnahme fort (Regeln im Dateikopf).
 * @param inhalt - Akte als gültiges UTF-8
 * @param eingabe - workflowId, datum, begonnenErsatz
 * @returns Ergebnis
 */
export function schreibeIstNachAbnahme(inhalt: string, eingabe: IstNachAbnahmeEingabe): IstNachAbnahmeErgebnis {
  const hinweis = (grund: string): IstNachAbnahmeErgebnis => ({ art: 'hinweis', grund })
  if (inhalt.includes('\r')) return hinweis(`Die Akte hat CRLF-Zeilenenden ${VON_HAND}`)
  const status = leseFeatureStatus(inhalt)
  if (status !== null && STATUS_NICHT_BEARBEITBAR.has(status)) return hinweis(`Feature-Status '${status}' — die Akte wird nicht mehr fortgeschrieben`)
  const token = `· Abnahme ${eingabe.workflowId}`
  if (inhalt.split('\n').some((zeile) => zeile.startsWith('- ') && zeile.trimEnd().endsWith(token))) return { art: 'schon_geschrieben' }

  const planung = lesePlanung(inhalt)
  if (planung.workstreams === null) return hinweis(`Die Akte hat keinen Abschnitt „## Workstreams“ als Tabelle ${VON_HAND}`)
  if (planung.workstreams_fehlerhaft) return hinweis(`Der Abschnitt „## Workstreams“ hat Formfehler ${VON_HAND}`)
  const laufend = planung.workstreams.filter((w) => w.status === 'laeuft')
  // qa 2: keine laufende Zeile ist die verfehlte Vorbedingung (A2), mehrere sind mehrdeutig — zwei Texte.
  if (laufend.length === 0) return hinweis(`Keine Workstream-Zeile steht auf „laeuft“ (vor dem Start setzen und committen) ${VON_HAND}`)
  if (laufend.length > 1) return hinweis(`Workstream nicht eindeutig (${laufend.length} laufende Zeilen) ${VON_HAND}`)
  const [w] = laufend

  const ersatz = w.begonnen === null ? eingabe.begonnenErsatz : null
  const begonnen = w.begonnen ?? ersatz
  if (begonnen !== null && begonnen > eingabe.datum) return hinweis(`Workstream ${w.id}: Begonnen (${begonnen}) liegt nach dem Abnahmetag ${VON_HAND}`)
  const tage = begonnen === null ? 0 : arbeitstageBis(begonnen, eingabe.datum)
  const ist = tage > 0 ? tage : null

  const zeile = workstreamZeilen(inhalt).find((z) => z.text.split('|')[1]?.trim() === w.id)
  if (zeile === undefined) return hinweis(`Workstream ${w.id}: Tabellenzeile nicht gefunden ${VON_HAND}`)
  let neueZeile = ersetzeZelle(zeile.text, 'Status', 'erledigt')
  neueZeile = ersetzeZelle(neueZeile, 'Ist AT', ist === null ? '–' : String(ist))
  neueZeile = ersetzeZelle(neueZeile, 'Begonnen', begonnen ?? '–')
  neueZeile = ersetzeZelle(neueZeile, 'Abgenommen', eingabe.datum)
  const herkunft = ersatz !== null ? ', Begonnen aus der Anlage des Ablaufs' : ''
  const aenderung = `- ${eingabe.datum} · Workstream ${w.id} erledigt, Ist ${ist === null ? '–' : ist} AT${herkunft} ${token}`
  const neu = wendeAn(inhalt, [{ start: zeile.start, ende: zeile.start + zeile.text.length, text: neueZeile }, haengeAenderungAn(inhalt, aenderung, '\n')])

  const gate = pruefeAkteGate(pruefeFeatureAkteInhalt(inhalt), neu)
  if (gate !== null) return hinweis(`${gate.grund} (${gate.verstoesse.slice(0, 3).join('; ')}) ${VON_HAND}`)
  const gelesen = lesePlanung(neu).workstreams?.find((x) => x.id === w.id)
  if (leseFeatureStatus(neu) !== status || gelesen?.status !== 'erledigt' || gelesen.abgenommen !== eingabe.datum || gelesen.ist !== ist) return hinweis(`Die fortgeschriebene Akte liest sich nicht wie erwartet ${VON_HAND}`)
  return { art: 'geschrieben', inhalt: neu, workstream: w.id, ist }
}
