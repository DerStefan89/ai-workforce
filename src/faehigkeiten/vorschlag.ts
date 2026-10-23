/**
 * Datei: src/faehigkeiten/vorschlag.ts
 *
 * Zweck: F45 FB-1a „Fähigkeit bauen“ (F-1069, features/F45/plan-fb1-v2.md): Erkennung der Fähigkeit-Vorschläge im
 * Arbeitsordner eines Ablaufs. Ein Lauf schreibt nie unter .claude/ (deny-Regel CLAUDE_ORDNER_SPERREN bleibt), sondern legt
 * Skills unter vorschlaege/faehigkeiten/skills/<name>/ (mit SKILL.md) und Agents unter vorschlaege/faehigkeiten/agents/<name>.md
 * ab; Stefan übernimmt sie (FB-1b). Je Vorschlag: typ, name, beschreibung (Frontmatter), hash (dieselbe Form wie beim Start:
 * Agent = sha256 der Bytes, Skill = berechneInhaltHash), ziel_existiert, grund bei Ungültigkeit; ziel_ignoriert über
 * pruefeZielIgnoriert (git check-ignore, lesend).
 *
 * Wird aufgerufen von:
 * - scripts/leitstand/routen-faehigkeit-vorschlag.mjs (Projektion für GET …/abnahme)
 * - scripts/leitstand-server.mjs (FAEHIGKEIT_VORSCHLAG_REGEL im Auftrag der Ausführung, über das Routenmodul)
 * - src/faehigkeiten/vorschlag.test.ts, scripts/check-f45-fb1-faehigkeit-vorschlag.mjs
 *
 * Wichtig:
 * - Nur lesend. Nie durch eine Verknüpfung (Symlink/Junction) lesen — auch nicht beim Zielordner unter .claude/ —, keine
 *   Nicht-Datei lesen, Größe vor dem Lesen per lstat (Advisor B7); Skill-Ordner begrenzt durchlaufen, bevor gehasht wird, und
 *   eine Gesamtgrenze über alle Vorschläge, weil die Abnahme alle 2 s abgefragt wird (B8, code-reviewer 1). Wirft nie — Fehler
 *   werden zum grund. DEKLARIERT: zwischen lstat und Lesen kann ein laufender Prozess eine Datei durch eine Verknüpfung
 *   ersetzen (kleines Zeitfenster; im Skill-Baum wirft listeSkillDateien zusätzlich bei Verknüpfungen).
 * - Grenzen: skillEintraege zählt Dateien und Ordner eines Skills; vorschlaege zählt bewertete Einträge (Skills, Agents und
 *   Meldungen zu Behältern bzw. unbekannten Einträgen).
 * - Frontmatter über pruefeFrontmatter (streng, unverändert); agent.tools nur der Form nach (werkzeugNamen null), die
 *   Zugehörigkeit zum Werkzeugsatz prüft der Start (fail-closed).
 * - Ein Vorschlag mit grund ist nie übernehmbar. ziel_existiert vergleicht ohne Unterschied der Schreibweise nur im direkten
 *   Zielordner; Skills zusätzlich gegen Projekt-Commands (sonst sperrt der Start den ganzen Lauf). Mehrdeutigkeit über
 *   Frontmatter-Namen anderer Dateien und Agents in Unterordnern prüft weiter der Start (F-1167).
 */

import { createHash } from 'node:crypto'
import { lstatSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fuehreGitAsync } from '../git-starter/index.ts'
import { EINGEBAUT_REST_SKILLS, leseProjektCommandNamen } from '../ressourcen/ort-b-start.ts'
import { berechneInhaltHash, EINGEBAUTE_SKILLS_S7, pruefeSkillDateiNamen } from '../ressourcen/skill-dateien.ts'
import { leseEingebautReferenz, NAME_MUSTER, pruefeFrontmatter } from './index.ts'
import type { ProjektTyp } from './types.ts'

/** Ordner der Vorschläge, relativ zur Wurzel des Arbeitsordners ('/' als Trenner). */
export const VORSCHLAG_ORDNER = 'vorschlaege/faehigkeiten'

/** Grenzen (Plan v2 §1, angelehnt an GRENZEN.maxDateiBytes in src/sammlung/inhalt.ts); gesamtBytes über alle Vorschläge. */
export const VORSCHLAG_GRENZEN = Object.freeze({ agentBytes: 256 * 1024, skillBytes: 1024 * 1024, skillEintraege: 200, vorschlaege: 20, gesamtBytes: 4 * 1024 * 1024 })

/**
 * Regelzeile für den Auftrag der Ausführung im Arbeitsordner (Plan v2 §3; beginnt nie mit „- [x]“). Nennt die Formregeln der
 * strengen Frontmatter-Prüfung (qa FB-1a 2) — ohne sie scheitern übliche Felder wie allowed-tools oder model: sonnet.
 */
export const FAEHIGKEIT_VORSCHLAG_REGEL =
  'Fähigkeit bauen: Agents/Skills nie unter .claude/, sondern unter vorschlaege/faehigkeiten/skills/<name>/ (mit SKILL.md) bzw. vorschlaege/faehigkeiten/agents/<name>.md; Stefan übernimmt sie in der Abnahme. Frontmatter nur name (= Ordner- bzw. Dateiname) und description, ein Skill zusätzlich höchstens argument-hint und license; ein Agent braucht tools (Komma-Liste ohne Agent, Task, Skill), model nur inherit.'

/** Ein erkannter Vorschlag; typ/name null nur bei einem Problem an einem Behälter bzw. einem unbekannten Eintrag. */
export interface FaehigkeitVorschlag {
  typ: ProjektTyp | null
  name: string | null
  /** relativ zur Wurzel, '/' als Trenner */
  pfad: string
  beschreibung: string | null
  hash: string | null
  /** true auch, wenn der Zielordner nicht lesbar oder eine Verknüpfung ist (fail-closed); null bei einem Behälter-Eintrag */
  ziel_existiert: boolean | null
  grund: string | null
}

/** Art eines Pfads nach lstat (folgt nie einer Verknüpfung). */
type Art = { art: 'fehlt' } | { art: 'ordner' } | { art: 'datei'; groesse: number } | { art: 'verknuepfung' } | { art: 'sonst' } | { art: 'fehler'; grund: string }

/**
 * Art eines Pfads per lstat.
 * @param pfad - absoluter Pfad
 * @returns Art
 */
function artVon(pfad: string): Art {
  try {
    const info = lstatSync(pfad)
    if (info.isSymbolicLink()) return { art: 'verknuepfung' }
    if (info.isDirectory()) return { art: 'ordner' }
    if (info.isFile()) return { art: 'datei', groesse: info.size }
    return { art: 'sonst' }
  } catch (fehler) {
    return (fehler as NodeJS.ErrnoException).code === 'ENOENT' ? { art: 'fehlt' } : { art: 'fehler', grund: (fehler as Error).message }
  }
}

/**
 * Grund für eine Art, die an dieser Stelle nicht erwartet ist.
 * @param art - Art
 * @param erwartet - Beschreibung des Erwarteten
 * @returns Grund
 */
function artGrund(art: Art, erwartet: string): string {
  if (art.art === 'verknuepfung') return 'Verknüpfung (Symlink/Junction) — abgelehnt'
  if (art.art === 'fehler') return `nicht lesbar (${art.grund})`
  return `${erwartet} erwartet`
}

/** Bytes lesbar (KiB/MiB). @param bytes - Anzahl @returns Text */
const groesse = (bytes: number): string => (bytes >= 1024 * 1024 ? `${bytes / (1024 * 1024)} MiB` : `${bytes / 1024} KiB`)

/**
 * Absoluter Pfad zu einem relativen Pfad mit '/'.
 * @param wurzel - Wurzel
 * @param rel - relativer Pfad
 * @returns absoluter Pfad
 */
const absolut = (wurzel: string, rel: string): string => join(wurzel, ...rel.split('/'))

/**
 * Durchläuft einen Skill-Ordner begrenzt (lstat, Abbruch bei zu vielen Einträgen bzw. Bytes, Verknüpfung oder Sonderdatei).
 * @param ordner - absoluter Pfad
 * @returns relative Dateipfade und Bytes oder Grund
 */
function durchlaufeBegrenzt(ordner: string): { ok: true; dateien: string[]; bytes: number } | { ok: false; grund: string } {
  const dateien: string[] = []
  let eintraege = 0
  let bytes = 0
  /**
   * Eine Ebene des Durchlaufs.
   * @param abs - absoluter Pfad der Ebene
   * @param rel - relativer Pfad der Ebene ('' = Skill-Ordner)
   * @returns Grund oder null
   */
  const gehe = (abs: string, rel: string): string | null => {
    for (const n of readdirSync(abs).sort()) {
      const r = rel === '' ? n : `${rel}/${n}`
      const art = artVon(join(abs, n))
      if (++eintraege > VORSCHLAG_GRENZEN.skillEintraege) return `mehr als ${VORSCHLAG_GRENZEN.skillEintraege} Einträge (Dateien und Ordner) im Skill-Ordner`
      if (art.art === 'ordner') {
        const grund = gehe(join(abs, n), r)
        if (grund !== null) return grund
      } else if (art.art === 'datei') {
        dateien.push(r)
        bytes += art.groesse
        if (bytes > VORSCHLAG_GRENZEN.skillBytes) return `Skill-Ordner größer als ${groesse(VORSCHLAG_GRENZEN.skillBytes)}`
      } else return `'${r}': ${artGrund(art, 'Datei oder Ordner')}`
    }
    return null
  }
  try {
    const grund = gehe(ordner, '')
    return grund === null ? { ok: true, dateien, bytes } : { ok: false, grund }
  } catch (fehler) {
    return { ok: false, grund: `Skill-Ordner nicht lesbar (${(fehler as Error).message})` }
  }
}

/**
 * Namen im Zielordner (.claude/skills bzw. .claude/agents), klein geschrieben — Skills: alle Einträge, Agents: Stamm der
 * .md-Dateien. Fehlt der Ordner ⇒ leer; ist .claude oder der Zielordner eine Verknüpfung, kein Ordner oder nicht lesbar ⇒
 * null (dann gilt jedes Ziel als vorhanden, ohne durch die Verknüpfung zu lesen).
 * @param wurzel - Wurzel
 * @param typ - skill | agent
 * @returns Namen oder null
 */
function zielNamen(wurzel: string, typ: ProjektTyp): Set<string> | null {
  for (const rel of ['.claude', `.claude/${typ === 'skill' ? 'skills' : 'agents'}`]) {
    const art = artVon(absolut(wurzel, rel))
    if (art.art === 'fehlt') return new Set()
    if (art.art !== 'ordner') return null
  }
  try {
    const liste = readdirSync(join(wurzel, '.claude', typ === 'skill' ? 'skills' : 'agents'))
    return new Set(typ === 'skill' ? liste.map((n) => n.toLowerCase()) : liste.filter((n) => n.toLowerCase().endsWith('.md')).map((n) => n.slice(0, -3).toLowerCase()))
  } catch {
    return null
  }
}

/**
 * Namen der Projekt-Commands (klein) — ein Skill gleichen Namens wäre am Start mehrdeutig (Hindernis für den ganzen Lauf).
 * Nur, wenn .claude und .claude/commands keine Verknüpfungen sind; sonst bzw. nicht lesbar ⇒ Grund.
 * @param wurzel - Wurzel
 * @returns Namen oder Grund
 */
function commandNamen(wurzel: string): { ok: true; namen: Set<string> } | { ok: false; grund: string } {
  for (const rel of ['.claude', '.claude/commands']) {
    const art = artVon(absolut(wurzel, rel))
    if (art.art === 'fehlt') return { ok: true, namen: new Set() }
    if (art.art !== 'ordner') return { ok: false, grund: `${rel}: ${artGrund(art, 'ein Ordner')} — Kollision mit Projekt-Commands nicht prüfbar` }
  }
  const gelesen = leseProjektCommandNamen(wurzel)
  return gelesen.ok ? { ok: true, namen: new Set(gelesen.namen.map((n) => n.toLowerCase())) } : { ok: false, grund: gelesen.grund }
}

/** Bewertungs-Kontext: Namen eingebauter Einträge (klein) bzw. Grund, Namen im Zielordner, Commands, Restbudget in Bytes. */
interface Kontext {
  eingebaut: { ok: true; namen: Set<string> } | { ok: false; grund: string }
  ziel: Set<string> | null
  commands: { ok: true; namen: Set<string> } | { ok: false; grund: string }
  budget: { bytes: number }
}

/**
 * Bucht Bytes vom Gesamtbudget ab.
 * @param kontext - Kontext
 * @param bytes - zu lesende Bytes
 * @returns Grund, wenn das Budget nicht reicht, sonst null
 */
function bucheBudget(kontext: Kontext, bytes: number): string | null {
  if (bytes > kontext.budget.bytes) return `alle Vorschläge zusammen größer als ${groesse(VORSCHLAG_GRENZEN.gesamtBytes)} — nicht geprüft`
  kontext.budget.bytes -= bytes
  return null
}

/**
 * Bewertet Name und Frontmatter (gemeinsam für Skill und Agent).
 * @param typ - skill | agent
 * @param name - Ordnername bzw. Dateistamm
 * @param text - Inhalt der SKILL.md bzw. Agent-Datei
 * @param kontext - Kontext
 * @returns { grund, beschreibung }
 */
function bewerteInhalt(typ: ProjektTyp, name: string, text: string, kontext: Kontext): { grund: string | null; beschreibung: string | null } {
  if (!NAME_MUSTER.test(name)) return { grund: `Name '${name.slice(0, 40)}' nicht schlicht (nur Buchstaben, Ziffern, Punkt, _ und -; beginnt mit Buchstabe oder Ziffer)`, beschreibung: null }
  const fm = pruefeFrontmatter(typ, text, null)
  if (!fm.ok) return { grund: fm.grund, beschreibung: null }
  if (fm.name !== name) return { grund: `Frontmatter-name '${fm.name}' ≠ ${typ === 'skill' ? 'Ordnername' : 'Dateiname'} '${name}'`, beschreibung: fm.beschreibung }
  if (!kontext.eingebaut.ok) return { grund: kontext.eingebaut.grund, beschreibung: fm.beschreibung }
  if (kontext.eingebaut.namen.has(name.toLowerCase())) return { grund: `Name eines eingebauten ${typ === 'skill' ? 'Skills' : 'Agents'}`, beschreibung: fm.beschreibung }
  if (typ === 'skill' && !kontext.commands.ok) return { grund: kontext.commands.grund, beschreibung: fm.beschreibung }
  if (typ === 'skill' && kontext.commands.ok && kontext.commands.namen.has(name.toLowerCase())) return { grund: `Name eines Projekt-Commands (.claude/commands) — am Start mehrdeutig`, beschreibung: fm.beschreibung }
  return { grund: null, beschreibung: fm.beschreibung }
}

/**
 * Bewertet einen Skill-Vorschlag (Ordner mit SKILL.md).
 * @param wurzel - Wurzel
 * @param name - Ordnername
 * @param kontext - Kontext
 * @returns Vorschlag
 */
function bewerteSkill(wurzel: string, name: string, kontext: Kontext): FaehigkeitVorschlag {
  const pfad = `${VORSCHLAG_ORDNER}/skills/${name}`
  const abs = absolut(wurzel, pfad)
  const e: FaehigkeitVorschlag = { typ: 'skill', name, pfad, beschreibung: null, hash: null, ziel_existiert: kontext.ziel === null || kontext.ziel.has(name.toLowerCase()), grund: null }
  const art = artVon(abs)
  if (art.art !== 'ordner') return { ...e, grund: artGrund(art, 'ein Ordner mit SKILL.md') }
  const durchlauf = durchlaufeBegrenzt(abs)
  if (!durchlauf.ok) return { ...e, grund: durchlauf.grund }
  const budget = bucheBudget(kontext, durchlauf.bytes)
  if (budget !== null) return { ...e, grund: budget }
  let hash: string
  let text: string | null = null
  try {
    hash = berechneInhaltHash(abs)
    if (durchlauf.dateien.includes('SKILL.md')) text = readFileSync(join(abs, 'SKILL.md'), 'utf8')
  } catch (fehler) {
    return { ...e, grund: `Skill-Ordner nicht prüfbar (${(fehler as Error).message})` }
  }
  const harness = pruefeSkillDateiNamen(durchlauf.dateien)
  if (harness !== null) return { ...e, hash, grund: harness }
  if (text === null) {
    const aehnlich = durchlauf.dateien.find((d) => d.toLowerCase() === 'skill.md')
    return { ...e, hash, grund: aehnlich !== undefined ? `gefunden '${aehnlich}' — die Datei muss genau SKILL.md heißen` : 'SKILL.md fehlt' }
  }
  return { ...e, hash, ...bewerteInhalt('skill', name, text, kontext) }
}

/**
 * Bewertet einen Agent-Vorschlag (Datei <name>.md direkt unter agents/).
 * @param wurzel - Wurzel
 * @param datei - Dateiname
 * @param kontext - Kontext
 * @returns Vorschlag
 */
function bewerteAgent(wurzel: string, datei: string, kontext: Kontext): FaehigkeitVorschlag {
  const pfad = `${VORSCHLAG_ORDNER}/agents/${datei}`
  const istMd = datei.toLowerCase().endsWith('.md')
  const name = istMd ? datei.slice(0, -3) : datei
  const e: FaehigkeitVorschlag = { typ: 'agent', name, pfad, beschreibung: null, hash: null, ziel_existiert: kontext.ziel === null || kontext.ziel.has(name.toLowerCase()), grund: null }
  const art = artVon(absolut(wurzel, pfad))
  if (art.art === 'ordner') return { ...e, grund: 'Unterordner unter agents/ nicht zulässig — ein Agent ist eine Datei <name>.md' }
  if (art.art !== 'datei') return { ...e, grund: artGrund(art, 'eine Datei <name>.md') }
  if (!istMd) return { ...e, grund: 'keine .md-Datei — ein Agent ist eine Datei <name>.md' }
  if (art.groesse > VORSCHLAG_GRENZEN.agentBytes) return { ...e, grund: `Agent-Datei größer als ${groesse(VORSCHLAG_GRENZEN.agentBytes)}` }
  const budget = bucheBudget(kontext, art.groesse)
  if (budget !== null) return { ...e, grund: budget }
  let bytes: Buffer
  try {
    bytes = readFileSync(absolut(wurzel, pfad))
  } catch (fehler) {
    return { ...e, grund: `Datei nicht lesbar (${(fehler as Error).message})` }
  }
  const hash = createHash('sha256').update(bytes).digest('hex')
  return { ...e, hash, ...bewerteInhalt('agent', name, bytes.toString('utf8'), kontext) }
}

/**
 * Eintrag für ein Problem an einem Behälter bzw. einen unbekannten Eintrag.
 * @param typ - Typ des Behälters oder null
 * @param pfad - relativer Pfad
 * @param grund - Grund
 * @returns Vorschlag ohne Namen
 */
const behaelter = (typ: ProjektTyp | null, pfad: string, grund: string): FaehigkeitVorschlag => ({ typ, name: null, pfad, beschreibung: null, hash: null, ziel_existiert: null, grund })

/**
 * Erkennt die Fähigkeit-Vorschläge unter vorschlaege/faehigkeiten/ einer Wurzel (Arbeitsordner). Fehlt der Ordner, ist die
 * Liste leer (der häufige Fall, ein lstat). Andere Einträge als skills/ und agents/ werden gemeldet (qa FB-1a 3: ein falsch
 * abgelegter Vorschlag verschwindet nicht still). Höchstens VORSCHLAG_GRENZEN.vorschlaege Einträge werden bewertet; darüber
 * ein Eintrag mit Grund. Wirft nie.
 * @param wurzel - absoluter Pfad des Arbeitsordners
 * @returns Vorschläge (unbekannte Einträge, dann Skills, dann Agents, je nach Namen sortiert)
 */
export function erkenneFaehigkeitVorschlaege(wurzel: string): FaehigkeitVorschlag[] {
  for (const rel of ['vorschlaege', VORSCHLAG_ORDNER]) {
    const art = artVon(absolut(wurzel, rel))
    if (art.art === 'fehlt') return []
    if (art.art !== 'ordner') return [behaelter(null, rel, artGrund(art, 'ein Ordner'))]
  }
  const ergebnis: FaehigkeitVorschlag[] = []
  let uebrig = 0
  const nimm = (eintrag: () => FaehigkeitVorschlag): void => {
    if (ergebnis.length >= VORSCHLAG_GRENZEN.vorschlaege) uebrig++
    else ergebnis.push(eintrag())
  }
  try {
    for (const n of readdirSync(absolut(wurzel, VORSCHLAG_ORDNER)).sort()) {
      if (n !== 'skills' && n !== 'agents') nimm(() => behaelter(null, `${VORSCHLAG_ORDNER}/${n}`, 'unbekannter Eintrag — erwartet skills/<name>/ (mit SKILL.md) oder agents/<name>.md'))
    }
  } catch (fehler) {
    return [behaelter(null, VORSCHLAG_ORDNER, `nicht lesbar (${(fehler as Error).message})`)]
  }
  const referenz = leseEingebautReferenz()
  const budget = { bytes: VORSCHLAG_GRENZEN.gesamtBytes }
  for (const typ of ['skill', 'agent'] as const) {
    const rel = `${VORSCHLAG_ORDNER}/${typ === 'skill' ? 'skills' : 'agents'}`
    const art = artVon(absolut(wurzel, rel))
    if (art.art === 'fehlt') continue
    if (art.art !== 'ordner') {
      nimm(() => behaelter(typ, rel, artGrund(art, 'ein Ordner')))
      continue
    }
    let namen: string[]
    try {
      namen = readdirSync(absolut(wurzel, rel)).sort()
    } catch (fehler) {
      nimm(() => behaelter(typ, rel, `nicht lesbar (${(fehler as Error).message})`))
      continue
    }
    const eingebaut = typ === 'skill' ? [...EINGEBAUTE_SKILLS_S7, ...EINGEBAUT_REST_SKILLS, ...(referenz.ok ? referenz.referenz.plugin_skills : [])] : referenz.ok ? referenz.referenz.agents : []
    const kontext: Kontext = {
      eingebaut: referenz.ok ? { ok: true, namen: new Set(eingebaut.map((n) => n.toLowerCase())) } : { ok: false, grund: referenz.grund },
      ziel: zielNamen(wurzel, typ),
      commands: typ === 'skill' ? commandNamen(wurzel) : { ok: true, namen: new Set() },
      budget,
    }
    for (const n of namen) nimm(() => (typ === 'skill' ? bewerteSkill(wurzel, n, kontext) : bewerteAgent(wurzel, n, kontext)))
  }
  if (uebrig > 0) ergebnis.push(behaelter(null, VORSCHLAG_ORDNER, `mehr als ${VORSCHLAG_GRENZEN.vorschlaege} Vorschläge — ${uebrig} weitere nicht geprüft; überzählige Vorschläge im Arbeitsordner löschen`))
  return ergebnis
}

/**
 * Zielpfad eines Vorschlags unter .claude/ (relativ, '/'): Skill → .claude/skills/<name>/SKILL.md (Datei, damit eine
 * Ordnerregel greift), Agent → .claude/agents/<name>.md.
 * @param v - Vorschlag mit typ und schlichtem name
 * @returns Pfad oder null
 */
export function zielPfad(v: Pick<FaehigkeitVorschlag, 'typ' | 'name'>): string | null {
  if (v.typ === null || v.name === null || !NAME_MUSTER.test(v.name)) return null
  return v.typ === 'skill' ? `.claude/skills/${v.name}/SKILL.md` : `.claude/agents/${v.name}.md`
}

/**
 * ziel_ignoriert je gültigem Vorschlag (grund null): ein asynchroner Aufruf `git --no-optional-locks check-ignore --no-index
 * -- <ziele>` im Arbeitsordner über den Git-Starter (fuehreGitAsync, F-1000: absoluter Programmpfad, ohne geerbte GIT_*-Variablen;
 * nur Regeln, kein Index, kein Filter-Treiber; die globale git-Konfiguration des Nutzers gilt mit, wie für git selbst).
 * Exit 0/1 ⇒ ausgegebene Pfade sind ignoriert, die übrigen nicht; anderer Code, code null (Startfehler, kein git) oder ein
 * Abbruch (Zeitgrenze, Ausgabegrenze) ⇒ null (nicht bestimmbar). Wirft nie.
 * @param wurzel - Arbeitsordner (cwd)
 * @param vorschlaege - erkannte Vorschläge
 * @param zeitgrenzeMs - Zeitgrenze des git-Aufrufs
 * @returns Map pfad → true | false | null (nur gültige Einträge mit Zielpfad)
 */
export function pruefeZielIgnoriert(wurzel: string, vorschlaege: readonly FaehigkeitVorschlag[], zeitgrenzeMs = 5000): Promise<Map<string, boolean | null>> {
  const ziele = vorschlaege
    .filter((v) => v.grund === null)
    .map((v) => ({ pfad: v.pfad, ziel: zielPfad(v) }))
    .filter((z): z is { pfad: string; ziel: string } => z.ziel !== null)
  if (ziele.length === 0) return Promise.resolve(new Map())
  return fuehreGitAsync(['--no-optional-locks', 'check-ignore', '--no-index', '--', ...ziele.map((z) => z.ziel)], { cwd: wurzel, zeitgrenzeMs }).then((ergebnis) => {
    if (ergebnis.abbruch !== undefined || (ergebnis.code !== 0 && ergebnis.code !== 1)) {
      console.error(`[faehigkeiten] git check-ignore in '${wurzel}' nicht auswertbar (code ${ergebnis.code}${ergebnis.abbruch !== undefined ? `, ${ergebnis.abbruch}` : ''}):`, ergebnis.stderr)
      return new Map(ziele.map((z) => [z.pfad, null]))
    }
    const ignoriert = new Set(ergebnis.stdout.split(/\r?\n/).filter((z) => z !== ''))
    return new Map(ziele.map((z) => [z.pfad, ignoriert.has(z.ziel)]))
  })
}
