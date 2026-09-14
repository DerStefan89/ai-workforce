/**
 * Datei: src/workboard/findings.ts
 *
 * Zweck: Reiner Parser für state/findings.md (F21 WS-1, AK1). Nimmt den
 * bereits gelesenen Dateiinhalt entgegen (kein eigenes readFileSync — Muster
 * src/ressourcen/index.ts) und liefert { workitems, befunde }. Wirft NICHT:
 * eine nicht parsebare Kopfzeile, eine doppelt vergebene ID oder ein
 * Eintrag ohne Titel-Feld sind Daten in befunde[], keine Ausnahme — die
 * aufrufende Seite (GET /api/workitems, scripts/check-f21-workboard.mjs)
 * entscheidet, was ein Befund bedeutet (Regressionsschutz nach F-367).
 *
 * Format (state/findings.md, Kopfzeile): `**F-NNN** · \`TYP\` · PN · Status`.
 * Freitext-Felder im Fließtext danach: Titel/Beschreibung/Fundstelle/
 * Auswirkung/Maßnahme/Feature/Run, je durch ein Label am Zeilenanfang
 * erkannt; eine Zeile ohne erkanntes Label ist Fortsetzung des zuletzt
 * offenen Feldes (die Fundstelle in F-221/F-222 zeigt, dass auch
 * Nicht-Standard-Label wie "Empfohlene Maßnahme:" real vorkommen — nur die
 * sechs benannten Label werden erkannt, alles andere bleibt Fortsetzungstext
 * des vorherigen Feldes statt eigenes Feld, F-369).
 */

import type { Befund, FindingWorkitem, ParseErgebnis, Prioritaet, WorkitemStatus } from './types.ts'

const HEADER_MUSTER = /^\*\*F-(\d+)\*\* · `([A-Z_]+)` · (P[0-4]) · (.+)$/
/** Erkennt einen Kopfzeilen-VERSUCH (für die Meldung "nicht parsebare Kopfzeile") — bewusst lockerer als HEADER_MUSTER. */
const HEADER_VERSUCH_MUSTER = /^\*\*F-/
const FELD_MUSTER = /^(Titel|Beschreibung|Fundstelle|Auswirkung|Maßnahme|Feature\/Run):\s*(.*)$/
const FELD_NAME_ZU_SCHLUESSEL: Record<string, keyof Pick<FindingWorkitem, 'titel' | 'beschreibung' | 'fundstelle' | 'auswirkung' | 'massnahme' | 'featureRun'>> = {
  Titel: 'titel',
  Beschreibung: 'beschreibung',
  Fundstelle: 'fundstelle',
  Auswirkung: 'auswirkung',
  Maßnahme: 'massnahme',
  'Feature/Run': 'featureRun',
}

const ERLEDIGT_WOERTER = ['gelöst', 'behoben', 'erledigt', 'korrigiert']

/** Normalisiert den Rohwert der Kopfzeilen-Status-Spalte auf OFFEN/ERLEDIGT/SONSTIGES (Feature-Akte F21, AK1). */
export function normalisiereStatus(roh: string): WorkitemStatus {
  const bereinigt = roh.replace(/\*\*/g, '').trim().toLowerCase()
  if (bereinigt.startsWith('offen')) return 'OFFEN'
  if (ERLEDIGT_WOERTER.some((wort) => bereinigt.includes(wort))) return 'ERLEDIGT'
  return 'SONSTIGES'
}

interface OffenerEintrag {
  id: string
  typ: string
  prioritaet: Prioritaet
  statusRoh: string
  zeile: number
  felder: Partial<Record<'titel' | 'beschreibung' | 'fundstelle' | 'auswirkung' | 'massnahme' | 'featureRun', string>>
  offenesFeld: 'titel' | 'beschreibung' | 'fundstelle' | 'auswirkung' | 'massnahme' | 'featureRun' | null
}

function schliesseEintrag(eintrag: OffenerEintrag, gesehen: Map<string, number>, workitems: FindingWorkitem[], befunde: Befund[]): void {
  if (eintrag.felder.titel === undefined) {
    befunde.push({ quelle: 'finding', art: 'fehlendes_titel_feld', meldung: `F-${eintrag.id}: Eintrag ohne 'Titel:'-Feld`, zeile: eintrag.zeile, id: `F-${eintrag.id}` })
  }
  const idKurz = `F-${eintrag.id}`
  const vorherigeZeile = gesehen.get(idKurz)
  if (vorherigeZeile !== undefined) {
    befunde.push({ quelle: 'finding', art: 'doppelte_id', meldung: `${idKurz}: doppelt vergeben (erste Kopfzeile in Zeile ${vorherigeZeile}, hier Zeile ${eintrag.zeile})`, zeile: eintrag.zeile, id: idKurz })
  } else {
    gesehen.set(idKurz, eintrag.zeile)
  }

  workitems.push({
    quelle: 'finding',
    id: idKurz,
    typ: eintrag.typ,
    prioritaet: eintrag.prioritaet,
    status: normalisiereStatus(eintrag.statusRoh),
    statusRoh: eintrag.statusRoh,
    titel: eintrag.felder.titel ?? '',
    beschreibung: eintrag.felder.beschreibung?.trim() ?? null,
    fundstelle: eintrag.felder.fundstelle?.trim() ?? null,
    auswirkung: eintrag.felder.auswirkung?.trim() ?? null,
    massnahme: eintrag.felder.massnahme?.trim() ?? null,
    featureRun: eintrag.felder.featureRun?.trim() ?? null,
    zeile: eintrag.zeile,
  })
}

/**
 * Parst den Inhalt von state/findings.md.
 * @param inhalt - bereits gelesener Dateiinhalt
 * @returns Findings-Workitems plus Befunde (nicht parsebare Kopfzeile, doppelte ID, fehlendes Titel-Feld)
 */
export function parseFindings(inhalt: string): ParseErgebnis<FindingWorkitem> {
  const workitems: FindingWorkitem[] = []
  const befunde: Befund[] = []
  const gesehen = new Map<string, number>()
  let aktuell: OffenerEintrag | null = null

  const zeilen = inhalt.split(/\r?\n/)
  for (let i = 0; i < zeilen.length; i++) {
    const zeile = zeilen[i]
    const zeilenNummer = i + 1
    const headerTreffer = zeile.match(HEADER_MUSTER)

    if (headerTreffer) {
      if (aktuell) schliesseEintrag(aktuell, gesehen, workitems, befunde)
      const [, id, typ, prioritaet, statusRoh] = headerTreffer
      aktuell = { id, typ, prioritaet: prioritaet as Prioritaet, statusRoh, zeile: zeilenNummer, felder: {}, offenesFeld: null }
      continue
    }

    if (HEADER_VERSUCH_MUSTER.test(zeile)) {
      if (aktuell) schliesseEintrag(aktuell, gesehen, workitems, befunde)
      aktuell = null
      befunde.push({ quelle: 'finding', art: 'nicht_parsebare_kopfzeile', meldung: `Zeile ${zeilenNummer}: sieht wie eine Kopfzeile aus, passt aber nicht auf '**F-NNN** · \`TYP\` · PN · Status': ${zeile}`, zeile: zeilenNummer })
      continue
    }

    if (!aktuell) continue

    const feldTreffer = zeile.match(FELD_MUSTER)
    if (feldTreffer) {
      const schluessel = FELD_NAME_ZU_SCHLUESSEL[feldTreffer[1]]
      aktuell.felder[schluessel] = feldTreffer[2]
      aktuell.offenesFeld = schluessel
      continue
    }

    if (zeile.trim() === '' || !aktuell.offenesFeld) continue
    aktuell.felder[aktuell.offenesFeld] = `${aktuell.felder[aktuell.offenesFeld]}\n${zeile}`
  }
  if (aktuell) schliesseEintrag(aktuell, gesehen, workitems, befunde)

  return { workitems, befunde }
}
