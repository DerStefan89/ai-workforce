/**
 * Datei: src/projekt-anlegen/nachruesten.ts
 *
 * Zweck: F45 B1a-2 (Umfang 5) — bestehende Projekte bekommen Vorlagenänderungen des Skeletts
 * (vorlagen/projekt-skelett/) nachgerüstet, ohne dass etwas überschrieben wird. kopiereSkelett wirkt
 * nur beim Anlegen; ein schon angelegtes Projekt (z. B. haushaltsbuch2) bliebe sonst auf dem alten
 * Stand. Aufgerufen über die CLI `npm run projekt:nachruesten -- <Projektpfad> [--anwenden]`
 * (scripts/projekt-nachruesten.mjs), keine Oberfläche.
 *
 * Regeln (Plan features/F45/plan-b1a2.md v2):
 * - Standard ist ein Probelauf: je Skelett-Datei fehlt / gleich / weicht ab / Gruppe übersprungen.
 *   Schreibt nichts.
 * - `anwenden` kopiert nur fehlende Dateien (copyFileSync mit COPYFILE_EXCL), überschreibt nie,
 *   legt package.json und .gitignore nie an (auch wenn sie fehlen; fehlende Skripte nur als Hinweis),
 *   schreibt nichts außerhalb des Projektpfads (jedes Ziel wird vorab über den realpath des nächsten
 *   vorhandenen Elternordners geprüft — eine Junction im Projekt nach außen bricht ab, bevor eine Datei
 *   entsteht). Scheitert eine einzelne Kopie, läuft der Rest weiter; der Bericht nennt Kopiertes und
 *   Fehler. Existenz über lstat: ein verwaister Link gilt als vorhanden, nicht als „fehlt“.
 * - Hook-Gruppe ganz oder gar nicht (planeSkelettKopie, dieselbe Regel wie kopiereSkelett). Zusätzlich:
 *   Projekt mit `"type": "module"` bekommt die Template-Hooks nicht — sie sind CommonJS, stürzten ab, und
 *   ein abgestürzter Hook lässt den Befehl durch (Bremse still offen).
 * - Wird die settings.json kopiert, ändert sich der E-183-Hash des Projekts → Pflichtzeile
 *   „Startfreigabe neu erteilen“.
 * - Ziel: existierender Ordner ohne Symlink/Junction auf dem Weg, unter dem Elternordner der Installation
 *   (wie POST /api/projekte), nicht die Installation, kein `*-laeufe`-Ordner (Arbeitsordner der Abläufe),
 *   Wurzel eines eigenen Git-Repos (kein verknüpfter Worktree; als zusätzliche Absicherung nicht dasselbe
 *   Git-Verzeichnis wie die Installation — ein eigenständiger Klon von ai-workforce wird NICHT erkannt).
 *   Git nur über src/git-starter, nur lesend.
 *
 * Wird aufgerufen von: scripts/projekt-nachruesten.mjs, src/projekt-anlegen/nachruesten.test.ts.
 */

import { constants, copyFileSync, existsSync, mkdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fuehreGitSync } from '../git-starter/index.ts'
import { existiertEintrag, gehoertZurHookGruppe, type HookGruppenZustand, normalisierePfadFuerVergleich, planeSkelettKopie } from './index.ts'

/** Installationswurzel von ai-workforce (Quelle des Skeletts) — über den Ort dieser Datei, nicht über process.cwd(). */
export const INSTALL_WURZEL = resolve(import.meta.dirname, '..', '..')

const SETTINGS_RELATIV = join('.claude', 'settings.json')
const PFLICHT_SKRIPTE = ['check', 'check:template', 'lint', 'typecheck', 'test'] as const
/** Projektdateien, die das Nachrüsten nie anlegt — auch wenn sie fehlen (package.json: nur Hinweise; .gitignore gehört dem Projekt). */
const NIE_KOPIEREN = new Set(['package.json', '.gitignore'])

export type ZielPruefung = { ok: true; projektWurzel: string } | { ok: false; grund: string }

export interface NachruestOptionen {
  /** Quelle des Skeletts (Standard INSTALL_WURZEL). */
  installWurzel?: string
  /** Erlaubte Basis der Projekte (Standard: Elternordner der Installation). */
  basis?: string
}

export type DateiZustand = 'fehlt' | 'gleich' | 'weicht_ab' | 'gruppe_uebersprungen' | 'nie_kopiert'

export interface NachruestBericht {
  projektWurzel: string
  /** Je Skelett-Datei (Pfad mit '/'). */
  dateien: { pfad: string; zustand: DateiZustand }[]
  hookGruppe: HookGruppenZustand | 'type_module'
  /** Tatsächlich kopiert (nur bei anwenden, Pfade mit '/'). */
  kopiert: string[]
  hinweise: string[]
  /** Fehler beim Anwenden je Datei ('Pfad: Grund'); bisher Kopiertes steht in kopiert. */
  fehler: string[]
  /** true, wenn die settings.json kopiert wurde (anwenden) bzw. kopiert würde (Probelauf). */
  startfreigabeNeu: boolean
}

/**
 * Pfad mit '/' als Trenner (Bericht und Ausgabe, plattformunabhängig).
 * @param pfad - Pfad mit plattformeigenem Trenner
 * @returns Pfad mit '/'
 */
const mitSchraegstrich = (pfad: string): string => pfad.split(sep).join('/')

/**
 * Prüft, ob ein realer Pfad gleich basis ist oder darunter liegt (plattformgerechter Vergleich).
 * @param pfad - realer, absoluter Pfad
 * @param basis - realer, absoluter Basispfad
 * @returns true, wenn pfad in basis liegt
 */
function liegtIn(pfad: string, basis: string): boolean {
  const p = normalisierePfadFuerVergleich(pfad)
  const b = normalisierePfadFuerVergleich(basis.replace(/[\\/]+$/, ''))
  return p === b || p.startsWith(`${b}${sep}`)
}

/**
 * Liest zwei Pfadangaben von git rev-parse als absolute, reale Pfade.
 * @param cwd - Ordner, in dem git läuft
 * @param argumente - rev-parse-Optionen (je eine Ausgabezeile)
 * @returns die Zeilen als realpath
 */
function gitPfade(cwd: string, argumente: string[]): string[] {
  const ausgabe = fuehreGitSync(['rev-parse', '--path-format=absolute', ...argumente], { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return ausgabe
    .split(/\r?\n/)
    .filter((zeile) => zeile.length > 0)
    .map((zeile) => realpathSync(resolve(cwd, zeile)))
}

/**
 * Prüft den Projektpfad für das Nachrüsten (siehe Dateikopf). Schreibt nichts.
 * @param projektPfad - Pfad aus der Kommandozeile (absolut oder relativ zum cwd)
 * @param optionen - installWurzel/basis (Tests)
 * @returns { ok: true, projektWurzel } oder { ok: false, grund }
 */
export function pruefeNachruestZiel(projektPfad: string, optionen: NachruestOptionen = {}): ZielPruefung {
  const installWurzel = realpathSync(optionen.installWurzel ?? INSTALL_WURZEL)
  const basis = realpathSync(optionen.basis ?? dirname(installWurzel))
  const ziel = resolve(projektPfad)

  if (!existsSync(ziel) || !statSync(ziel).isDirectory()) return { ok: false, grund: `'${ziel}' ist kein vorhandener Ordner` }
  const real = realpathSync(ziel)
  if (normalisierePfadFuerVergleich(real) !== normalisierePfadFuerVergleich(ziel)) {
    return { ok: false, grund: `'${ziel}' ist ein Symlink oder führt über einen Symlink/eine Junction — abgelehnt` }
  }
  if (!liegtIn(real, basis) || normalisierePfadFuerVergleich(real) === normalisierePfadFuerVergleich(basis)) {
    return { ok: false, grund: `'${real}' liegt außerhalb der erlaubten Basis '${basis}' (Projekte liegen neben der Installation)` }
  }
  if (liegtIn(real, installWurzel) || liegtIn(installWurzel, real)) {
    return { ok: false, grund: `'${real}' ist die Installation von ai-workforce selbst oder enthält sie — abgelehnt` }
  }
  if (relative(basis, real).split(sep).some((segment) => segment.endsWith('-laeufe'))) {
    return { ok: false, grund: `'${real}' liegt in einem Arbeitsordner der Abläufe (*-laeufe) — dort wird nicht nachgerüstet` }
  }

  let toplevel: string
  let gitDir: string
  let commonDir: string
  try {
    ;[toplevel, gitDir, commonDir] = gitPfade(real, ['--show-toplevel', '--git-dir', '--git-common-dir'])
  } catch (fehler) {
    const stderr = String((fehler as { stderr?: unknown }).stderr ?? '').trim()
    const grund = stderr.split(/\r?\n/).filter((z) => z.trim().length > 0).at(-1) ?? (fehler as Error).message.split(/\r?\n/)[0]
    return { ok: false, grund: `'${real}' ist kein nutzbares Git-Repo (${grund})` }
  }
  if (normalisierePfadFuerVergleich(toplevel) !== normalisierePfadFuerVergleich(real)) {
    return { ok: false, grund: `'${real}' ist nicht die Wurzel seines Git-Repos ('${toplevel}')` }
  }
  if (normalisierePfadFuerVergleich(gitDir) !== normalisierePfadFuerVergleich(commonDir)) {
    return { ok: false, grund: `'${real}' ist ein verknüpfter Git-Worktree — nur im Hauptordner des Projekts nachrüsten` }
  }
  try {
    const [installCommonDir] = gitPfade(installWurzel, ['--git-common-dir'])
    if (normalisierePfadFuerVergleich(installCommonDir) === normalisierePfadFuerVergleich(commonDir)) {
      return { ok: false, grund: `'${real}' teilt das Git-Verzeichnis der Installation (Worktree von ai-workforce) — abgelehnt` }
    }
  } catch {
    // Installation ohne Git (z. B. entpackte Kopie): dann kann das Ziel deren Repo nicht teilen.
  }
  return { ok: true, projektWurzel: real }
}

/**
 * Liest package.json des Projekts tolerant.
 * @param projektWurzel - Projektordner
 * @returns geparstes Objekt oder null (fehlt/ungültig)
 */
function lesePaket(projektWurzel: string): { type?: unknown; scripts?: Record<string, unknown> } | null {
  try {
    const daten: unknown = JSON.parse(readFileSync(join(projektWurzel, 'package.json'), 'utf8'))
    return typeof daten === 'object' && daten !== null ? (daten as { type?: unknown; scripts?: Record<string, unknown> }) : null
  } catch {
    return null
  }
}

/**
 * Hinweise zur package.json — sie wird nie geschrieben.
 * @param paket - gelesene package.json oder null
 * @returns Hinweistexte
 */
function paketHinweise(paket: ReturnType<typeof lesePaket>): string[] {
  if (paket === null) return ['package.json fehlt oder ist ungültig — wird nicht angelegt; Skripte von Hand aus vorlagen/projekt-skelett/package.json übernehmen.']
  const skripte = paket.scripts ?? {}
  const hinweise = PFLICHT_SKRIPTE.filter((name) => typeof skripte[name] !== 'string').map((name) => `package.json: Skript '${name}' fehlt (wird nicht ergänzt — Vorlage: vorlagen/projekt-skelett/package.json).`)
  if (typeof skripte.check === 'string' && !skripte.check.includes('check-gates')) {
    hinweise.push("package.json: 'check' ruft scripts/check-gates.mjs nicht auf — die Mindest-Gates wirken erst, wenn 'node scripts/check-gates.mjs && ' vorne steht.")
  }
  return hinweise
}

/**
 * Vergleicht zwei Dateiinhalte; CRLF und LF gelten als gleich (ein Windows-Checkout mit
 * core.autocrlf=true ist keine inhaltliche Abweichung — sonst meldete der Probelauf jede Datei).
 * @param a - Inhalt im Projekt
 * @param b - Inhalt im Skelett
 * @returns true, wenn gleich bis auf Zeilenenden
 */
function gleichBisAufZeilenenden(a: Buffer, b: Buffer): boolean {
  if (a.equals(b)) return true
  const ohneCr = (inhalt: Buffer): string => inhalt.toString('latin1').replaceAll('\r\n', '\n')
  return ohneCr(a) === ohneCr(b)
}

/**
 * Prüft vor dem Schreiben, dass ein Ziel im Projekt bleibt: der realpath des nächsten vorhandenen
 * Elternordners muss im Projekt liegen (eine Junction/ein Symlink im Projekt nach außen fällt auf).
 * @param projektWurzel - realer Projektordner
 * @param zielDatei - absoluter Zielpfad
 * @returns true, wenn das Schreiben im Projekt bleibt
 */
function bleibtImProjekt(projektWurzel: string, zielDatei: string): boolean {
  let ordner = dirname(zielDatei)
  while (!existiertEintrag(ordner)) ordner = dirname(ordner)
  try {
    return liegtIn(realpathSync(ordner), projektWurzel)
  } catch {
    // Verwaister Link auf dem Weg: Ziel unbekannt → nicht schreiben.
    return false
  }
}

/**
 * Probelauf oder Anwenden gegen ein geprüftes Projekt (pruefeNachruestZiel vorher!).
 * @param projektWurzel - geprüfter, realer Projektordner
 * @param anwenden - false = nur melden, true = fehlende Dateien kopieren
 * @param optionen - installWurzel (Tests)
 * @returns Bericht
 * @throws Error, wenn beim Anwenden ein Ziel außerhalb des Projekts läge (geprüft vor dem ersten Schreiben — dann wurde nichts geschrieben). Fehler einzelner Kopien werfen nicht, sie stehen in bericht.fehler.
 */
export function nachruesten(projektWurzel: string, anwenden: boolean, optionen: NachruestOptionen = {}): NachruestBericht {
  const skelettWurzel = join(optionen.installWurzel ?? INSTALL_WURZEL, 'vorlagen', 'projekt-skelett')
  const plan = planeSkelettKopie(skelettWurzel, projektWurzel)
  const paket = lesePaket(projektWurzel)
  const hinweise = paketHinweise(paket)

  let hookGruppe: NachruestBericht['hookGruppe'] = plan.hookGruppe
  let kopieren = plan.kopieren
  let gruppeUebersprungen = plan.gruppeUebersprungen
  if (plan.hookGruppe === 'kopierbar' && paket?.type === 'module') {
    hookGruppe = 'type_module'
    gruppeUebersprungen = kopieren.filter(gehoertZurHookGruppe)
    kopieren = kopieren.filter((pfad) => !gehoertZurHookGruppe(pfad))
    hinweise.push('Hook-Gruppe übersprungen: das Projekt hat "type": "module", die Template-Hooks sind CommonJS und stürzten ab — ein abgestürzter Hook lässt den Befehl durch. Hooks von Hand als .cjs einrichten.')
  }
  const nieKopiert = kopieren.filter((pfad) => NIE_KOPIEREN.has(pfad))
  kopieren = kopieren.filter((pfad) => !NIE_KOPIEREN.has(pfad))
  if (plan.hookGruppe === 'teilweise_vorhanden') {
    hinweise.push('Hook-Gruppe übersprungen: einzelne Hook-Dateien liegen schon im Projekt, aber keine .claude/settings.json — von Hand zusammenführen.')
  }

  const dateien: NachruestBericht['dateien'] = []
  const status = new Map<string, DateiZustand>()
  for (const pfad of kopieren) status.set(pfad, 'fehlt')
  for (const pfad of gruppeUebersprungen) status.set(pfad, 'gruppe_uebersprungen')
  for (const pfad of nieKopiert) status.set(pfad, 'nie_kopiert')
  for (const pfad of plan.vorhanden) {
    let gleich = false
    try {
      gleich = gleichBisAufZeilenenden(readFileSync(join(projektWurzel, pfad)), readFileSync(join(skelettWurzel, pfad)))
    } catch {
      // Nicht lesbar (z. B. verwaister Link, Ordner statt Datei): gilt als Abweichung, wird nie angefasst.
    }
    status.set(pfad, gleich ? 'gleich' : 'weicht_ab')
  }
  for (const [pfad, zustand] of [...status].sort(([a], [b]) => a.localeCompare(b))) dateien.push({ pfad: mitSchraegstrich(pfad), zustand })

  const kopiert: string[] = []
  const fehler: string[] = []
  if (anwenden) {
    const ausserhalb = kopieren.filter((pfad) => !bleibtImProjekt(projektWurzel, join(projektWurzel, pfad)))
    if (ausserhalb.length > 0) {
      throw new Error(`Abgebrochen, nichts geschrieben: Ziel läge außerhalb des Projekts (Symlink/Junction): ${ausserhalb.map(mitSchraegstrich).join(', ')}`)
    }
    // Je Datei: ein Fehler (gesperrte Datei, Wettlauf → EEXIST) bricht nicht ab; bisher Kopiertes bleibt im Bericht.
    for (const pfad of kopieren) {
      const zielDatei = join(projektWurzel, pfad)
      try {
        mkdirSync(dirname(zielDatei), { recursive: true })
        copyFileSync(join(skelettWurzel, pfad), zielDatei, constants.COPYFILE_EXCL)
        kopiert.push(mitSchraegstrich(pfad))
      } catch (grund) {
        fehler.push(`${mitSchraegstrich(pfad)}: ${(grund as Error).message}`)
      }
    }
  }

  // Scheitert eine Kopie innerhalb der Hook-Gruppe, ist sie unvollständig (die settings.json kann auf einen
  // fehlenden Hook zeigen) — ausdrücklich melden, statt nur die Fehlerliste zu zeigen.
  const gruppeFehler = kopieren.filter(gehoertZurHookGruppe).filter((pfad) => !kopiert.includes(mitSchraegstrich(pfad)))
  if (anwenden && gruppeFehler.length > 0) {
    hinweise.push(`Hook-Gruppe UNVOLLSTÄNDIG (nicht kopiert: ${gruppeFehler.map(mitSchraegstrich).join(', ')}) — erst ergänzen, dann Startfreigabe erteilen; check-gates (d) bleibt bis dahin rot.`)
  }
  const settingsNeu = anwenden ? kopiert.includes(mitSchraegstrich(SETTINGS_RELATIV)) : kopieren.includes(SETTINGS_RELATIV)
  return { projektWurzel, dateien, hookGruppe, kopiert, hinweise, fehler, startfreigabeNeu: settingsNeu }
}

/**
 * Formatiert den Bericht als Textzeilen für die CLI.
 * @param bericht - Ergebnis von nachruesten
 * @param anwenden - ob angewendet wurde
 * @returns Zeilen
 */
export function formatiereNachruestBericht(bericht: NachruestBericht, anwenden: boolean): string[] {
  const zeilen = [`Projekt: ${bericht.projektWurzel}`, anwenden ? 'Modus: anwenden (nur fehlende Dateien, nichts überschrieben)' : 'Modus: Probelauf (schreibt nichts; --anwenden kopiert die fehlenden Dateien)', '']
  const gruppen: [DateiZustand, string][] = [
    ['fehlt', anwenden ? 'Fehlte:' : 'Fehlt im Projekt (würde kopiert):'],
    ['weicht_ab', 'Weicht von der Vorlage ab (nur gemeldet, nie überschrieben):'],
    ['gruppe_uebersprungen', 'Hook-Gruppe übersprungen (ganz oder gar nicht):'],
    ['nie_kopiert', 'Fehlt, wird aber nie angelegt (nur Hinweis):'],
    ['gleich', 'Gleich der Vorlage:'],
  ]
  for (const [zustand, titel] of gruppen) {
    const pfade = bericht.dateien.filter((d) => d.zustand === zustand).map((d) => d.pfad)
    zeilen.push(`${titel} ${pfade.length}`)
    for (const pfad of pfade) zeilen.push(`  ${pfad}`)
  }
  if (anwenden) {
    zeilen.push(`Kopiert: ${bericht.kopiert.length}`)
    if (bericht.fehler.length > 0) zeilen.push(`NICHT kopiert (Fehler): ${bericht.fehler.length}`, ...bericht.fehler.map((f) => `  ${f}`))
  }
  if (bericht.hinweise.length > 0) zeilen.push('', 'Hinweise:', ...bericht.hinweise.map((h) => `  - ${h}`))
  if (bericht.startfreigabeNeu) {
    zeilen.push('', anwenden ? '.claude/settings.json neu → Startfreigabe für dieses Projekt neu erteilen' : '.claude/settings.json würde neu → nach --anwenden Startfreigabe für dieses Projekt neu erteilen')
  }
  return zeilen
}
