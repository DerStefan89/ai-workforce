/**
 * Datei: src/ressourcen/installation.ts
 *
 * Zweck: F36 WS-5a „MCP-Installation“ (features/F36/feature.md WS-5a, E-F36-6/E-F36-9, F-786 Teil
 * mcp). „Freigeben & installieren“ für einen Katalogeintrag typ 'extern', unterart 'mcp', wirkung
 * 'lokal' mit herkunft.paket und installation_vorlage, in zwei Schritten:
 * - bereiteInstallationVor: löst die Version NUR LESEND aus der Registry auf (npm view) und liefert,
 *   was vor dem Klick angezeigt wird (paket, exakte version, integrity, Lizenz, Kosten, Wirkung,
 *   werkzeuge, Zielordner) samt eintragHash über diese Katalogfelder.
 * - installiereRessource: lehnt ab, wenn der Eintrag seit der Anzeige geändert ist (eintragHash), und
 *   installiert sonst genau diese version in den Workforce-Ordner <cap>/<id>
 *   (npm install --ignore-scripts --save-exact), prüft fail-closed (Lockfile-version und -integrity
 *   = angezeigte, bin existiert, Serverstart mit MCP initialize + tools/list bietet alle werkzeuge,
 *   Prozess beendet) und schreibt ERST DANN installation + freigabe FREIGEGEBEN in ressourcen.json.
 *   Jeder Fehlschlag: ressourcen.json unverändert, der eigene Zielordner wird wieder entfernt,
 *   Klartext-Grund. Immer nur eine Installation zur Zeit (prozessweit).
 * Die Runner (npm, Serverstart) sind injizierbar — Gate und Tests laufen ohne Netz und ohne Prozesse.
 *
 * F36 WS-5b (F-786 Teil skill): dieselben zwei Schritte und Routen für typ 'extern', unterart 'skill'
 * mit installation_vorlage { skill_pfad } — Vorbereiten löst die Ref der herkunft.url per git ls-remote
 * zur Commit-SHA auf (SkillVorbereitung); Installieren prüft eintragHash (409) und dass die Ref noch auf
 * diese SHA zeigt (409), holt genau diese SHA und nur <unterpfad>/<skill_pfad> (skill-installation.ts),
 * prüft SKILL.md/Namen, kopiert nach <cap>/<id>/.claude/skills/<name>/ und schreibt installation
 * { pfad, version = SHA, inhalt_hash } + FREIGEGEBEN. Gleiche Sperre (eine zur Zeit), gleiches Aufräumen.
 * Extern-Agents: 400 „erst später“ (pruefeInstallierbarkeit). git-Runner injizierbar (runner.git).
 *
 * Wichtig: Kein npx zur Laufzeit — die installation trägt command = absoluter node-Pfad und
 * args = [<bin im cap-Ordner>, ...Vorlagen-args mit Platzhaltern]; die Platzhalter ersetzt erst der
 * Start (baueMcpAufruf). ressourcen.json ist versioniert: nach einer Installation committet der
 * Mensch (Bekannte Grenze, features/F36/feature.md). Geschrieben wird nur der Text des einen
 * Eintrags (übrige Formatierung bleibt), atomar über eine Nachbardatei + rename.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (POST /api/ressourcen/<id>/installation/
 * vorbereiten, POST /api/ressourcen/<id>/installation), scripts/check-f36-ws5a-installation.mjs,
 * src/ressourcen/installation.test.ts.
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { kanonischesJson, sha256Hex } from '../checkpoint-store/index.ts'
import { ersetzePlatzhalter, paketNameAus, pruefeInstallierbarkeit, validiereRessourcenDaten } from './index.ts'
import { berechneInhaltHash, pruefeSkillDateiNamen, zerlegeGithubUrl } from './skill-dateien.ts'
import { COMMIT_SHA, type GitRunner, holeSkillQuelle, kopiereSkill, loeseSkillCommitAuf, pruefeSkillQuelle, SKILL_SKRIPT_HINWEIS } from './skill-installation.ts'
import type { Installation, McpInstallationsVorlage, Ressource, SkillInstallationsVorlage } from './types.ts'

/** Ergebnis eines Kindprozesses. */
export interface ProzessErgebnis {
  code: number | null
  stdout: string
  stderr: string
  zeitueberschritten: boolean
}

/** Führt npm mit den gegebenen Argumenten aus (ohne Shell). */
export type NpmRunner = (args: string[], optionen: { cwd: string; timeoutMs: number }) => Promise<ProzessErgebnis>

/** Startet den MCP-Server, fragt initialize + tools/list ab und beendet ihn wieder. */
export type ServerPruefer = (command: string, args: string[], optionen: { cwd: string; timeoutMs: number }) => Promise<{ ok: true; werkzeuge: string[] } | { ok: false; grund: string }>

export interface InstallationsRunner {
  npm: NpmRunner
  pruefeServer: ServerPruefer
  /** F36 WS-5b: git für die Skill-Installation (ls-remote, fetch, ls-tree, checkout); fehlt er, gilt der echte. */
  git?: GitRunner
}

export interface InstallationsKontext {
  /** Installationswurzel der Workforce (ressourcen.json). */
  installWurzel: string
  /** Workforce-Ordner für installierte Fähigkeiten (Ort B), je Eintrag <capWurzel>/<id>. */
  capWurzel: string
  /** Default: echte Runner (npm über node + npm-cli.js, Serverstart über spawn). */
  runner?: InstallationsRunner
  /** Absoluter node-Pfad für command; Default process.execPath. */
  nodePfad?: string
  /** Zeitgrenzen je Schritt in ms; Default siehe STANDARD_ZEITGRENZEN. */
  zeitgrenzen?: Partial<typeof STANDARD_ZEITGRENZEN>
}

/** Antwort beider Schritte — status ist der HTTP-Status, den der Server daraus macht. */
export type InstallationsAntwort<T> = { ok: true; daten: T } | { ok: false; status: number; grund: string }

/** Was vor dem Klick „Installieren“ angezeigt wird — je unterart (art). */
export type InstallationsVorbereitung = McpVorbereitung | SkillVorbereitung

/** WS-5a: Anzeige für einen MCP. */
export interface McpVorbereitung {
  art: 'mcp'
  id: string
  name: string
  paket: string
  version: string
  integrity: string
  lizenz: string | null
  lizenzRegistry: string | null
  kosten: string | null
  wirkung: string
  werkzeuge: string[]
  zielordner: string
  herkunftUrl: string
  /** sha256 über die angezeigten Katalogfelder (eintragsKennung) — geht mit „Installieren“ zurück. */
  eintragHash: string
}

/** F36 WS-5b: Anzeige für einen Skill (Auftrag Punkt 2: Repo, Ref, SHA, skill_pfad, Lizenz, Kosten, Zielordner, Hinweis). */
export interface SkillVorbereitung {
  art: 'skill'
  id: string
  name: string
  /** git-Adresse des Repos (https://github.com/<owner>/<repo>.git). */
  repo: string
  ref: string
  /** Die aufgelöste 40-stellige Commit-SHA — geht mit „Installieren“ als version zurück. */
  version: string
  skillPfad: string
  /** Pfad im Repo, der ausgecheckt wird (<unterpfad>/<skill_pfad>). */
  quellPfad: string
  lizenz: string | null
  kosten: string | null
  zielordner: string
  herkunftUrl: string
  hinweis: string
  eintragHash: string
}

/** Ergebnis einer erfolgreichen Installation — je unterart (art). */
export type InstallationsErgebnis = McpErgebnis | SkillErgebnis

/** WS-5a: Ergebnis einer MCP-Installation. */
export interface McpErgebnis {
  art: 'mcp'
  id: string
  paket: string
  version: string
  integrity: string
  zielordner: string
  installation: Installation
  werkzeugeGefunden: string[]
  dauerMs: number
}

/** F36 WS-5b: Ergebnis einer Skill-Installation. */
export interface SkillErgebnis {
  art: 'skill'
  id: string
  /** Commit-SHA */
  version: string
  /** Frontmatter-name der SKILL.md = Ordnername unter <cap>/<id>/.claude/skills/ */
  name: string
  zielordner: string
  installation: Installation
  dateien: string[]
  dauerMs: number
}

const STANDARD_ZEITGRENZEN = {
  viewMs: 60_000,
  installMs: 300_000,
  serverMs: 60_000,
  /** F36 WS-5b: je git-Aufruf (ls-remote, fetch, ls-tree, checkout). */
  gitMs: 120_000,
}
/** Exakte Version (keine Range, kein Tag). */
const EXAKTE_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/
/** SRI-integrity, wie npm sie im Lockfile führt. */
const INTEGRITY_MUSTER = /^sha(?:256|384|512)-[A-Za-z0-9+/]+={0,2}$/
/** Testwerte der Platzhalter für die Serverstart-Prüfung (Port 9 = discard, nie ein echter Dienst). */
const PRUEF_ORIGINS = 'http://localhost:9;http://127.0.0.1:9'

/** 64 Hex-Zeichen (sha256). */
const HASH_MUSTER = /^[0-9a-f]{64}$/

/**
 * Kennung der vor dem Klick angezeigten Katalogfelder (name, herkunft inkl. paket, installation_vorlage,
 * lizenz, kosten, wirkung). Ändert sich eines davon zwischen Vorbereiten und Installieren (z. B. git
 * pull in der Installationswurzel), lehnt die Installation ab — freigegeben wird nur, was angezeigt war.
 * @param eintrag - Katalogeintrag
 * @returns sha256 (hex) der kanonischen JSON
 */
export function eintragsKennung(eintrag: Ressource): string {
  const { name, herkunft, installation_vorlage, lizenz, kosten, wirkung } = eintrag
  return sha256Hex(kanonischesJson({ name, herkunft, installation_vorlage, lizenz, kosten, wirkung }))
}

/** Prozessweite Sperre: immer nur eine Installation zur Zeit. */
let installationLaeuft = false

/** Liest den Katalog roh und validiert ihn. */
function ladeKatalog(installWurzel: string): { ok: true; pfad: string; roh: string; daten: { ressourcen: Ressource[] } } | { ok: false; grund: string } {
  const pfad = join(installWurzel, 'ressourcen.json')
  let roh: string
  let daten: unknown
  try {
    roh = readFileSync(pfad, 'utf8')
    daten = JSON.parse(roh)
  } catch (fehler) {
    return {
      ok: false,
      grund: `ressourcen.json nicht lesbar: ${(fehler as Error).message}`,
    }
  }
  const verstoesse = validiereRessourcenDaten(daten)
  if (verstoesse.length > 0)
    return {
      ok: false,
      grund: `ressourcen.json ungültig: ${verstoesse.join('; ')}`,
    }
  return { ok: true, pfad, roh, daten: daten as { ressourcen: Ressource[] } }
}

/**
 * Gemeinsame Vorprüfung beider Schritte: Katalog gültig, Eintrag vorhanden, installierbar (sonst 400),
 * noch nicht installiert (sonst 409).
 */
function findeInstallierbaren(
  id: string,
  installWurzel: string
):
  | {
      ok: true
      katalog: {
        pfad: string
        roh: string
        daten: { ressourcen: Ressource[] }
      }
      eintrag: Ressource
    }
  | { ok: false; status: number; grund: string } {
  const katalog = ladeKatalog(installWurzel)
  if (!katalog.ok) return { ok: false, status: 500, grund: katalog.grund }
  const eintrag = katalog.daten.ressourcen.find((r) => r.id === id)
  if (eintrag === undefined)
    return {
      ok: false,
      status: 404,
      grund: `Katalogeintrag '${id}' nicht gefunden`,
    }
  const nicht = pruefeInstallierbarkeit(eintrag)
  if (nicht !== null)
    return {
      ok: false,
      status: 400,
      grund: `'${id}' ist nicht installierbar: ${nicht}`,
    }
  if (eintrag.installation !== undefined || eintrag.freigabe === 'FREIGEGEBEN') {
    return {
      ok: false,
      status: 409,
      grund: `'${id}' trägt bereits installation bzw. freigabe FREIGEGEBEN — keine zweite Installation über die Oberfläche`,
    }
  }
  return { ok: true, katalog, eintrag }
}

/** Paketname eines installierbaren MCP (pruefeInstallierbarkeit hat die Form schon geprüft). */
function paketVon(eintrag: Ressource): string {
  return paketNameAus((eintrag.herkunft as { paket?: string }).paket) as string
}

/** Letzte Zeilen einer Prozessausgabe für den Klartext-Grund. */
function ausgabeKurz(ergebnis: ProzessErgebnis): string {
  const text = `${ergebnis.stderr}\n${ergebnis.stdout}`.trim().split(/\r?\n/).slice(-3).join(' | ')
  return text.length > 400 ? `${text.slice(0, 400)}…` : text
}

/**
 * Schritt 1: löst die aktuelle Version des Pakets nur lesend aus der Registry auf (npm view
 * <paket>@latest). Nichts wird installiert oder geschrieben.
 * @param id - Katalog-id
 * @param kontext - Installationswurzel, cap-Wurzel, Runner
 * @returns Anzeige-Daten oder Ablehnung mit HTTP-Status (400 nicht installierbar, 404, 409 schon installiert, 502 Registry)
 */
export async function bereiteInstallationVor(id: string, kontext: InstallationsKontext): Promise<InstallationsAntwort<InstallationsVorbereitung>> {
  const gefunden = findeInstallierbaren(id, kontext.installWurzel)
  if (!gefunden.ok) return gefunden
  const { eintrag } = gefunden
  const runner = kontext.runner ?? ECHTE_RUNNER
  const zeitgrenzen = { ...STANDARD_ZEITGRENZEN, ...kontext.zeitgrenzen }
  if (eintrag.unterart === 'skill') return bereiteSkillVor(eintrag, kontext.capWurzel, runner.git ?? gitReal, zeitgrenzen.gitMs)
  const paket = paketVon(eintrag)
  let ergebnis: ProzessErgebnis
  try {
    ergebnis = await runner.npm(['view', `${paket}@latest`, 'version', 'dist.integrity', 'license', '--json'], { cwd: kontext.installWurzel, timeoutMs: zeitgrenzen.viewMs })
  } catch (fehler) {
    console.error(`[installation] npm view für '${id}' nicht ausführbar:`, fehler)
    return {
      ok: false,
      status: 502,
      grund: `npm view nicht ausführbar: ${(fehler as Error).message}`,
    }
  }
  if (ergebnis.zeitueberschritten)
    return {
      ok: false,
      status: 502,
      grund: `npm view ${paket}: Zeitgrenze überschritten`,
    }
  if (ergebnis.code !== 0)
    return {
      ok: false,
      status: 502,
      grund: `npm view ${paket} fehlgeschlagen (Exit ${ergebnis.code}): ${ausgabeKurz(ergebnis)}`,
    }
  let antwort: Record<string, unknown>
  try {
    antwort = JSON.parse(ergebnis.stdout)
  } catch {
    return {
      ok: false,
      status: 502,
      grund: `npm view ${paket}: Antwort ist kein JSON`,
    }
  }
  const version = antwort.version
  const integrity = antwort['dist.integrity']
  if (typeof version !== 'string' || !EXAKTE_VERSION.test(version))
    return {
      ok: false,
      status: 502,
      grund: `npm view ${paket}: keine exakte Version in der Antwort (${JSON.stringify(version)})`,
    }
  if (typeof integrity !== 'string' || !INTEGRITY_MUSTER.test(integrity))
    return {
      ok: false,
      status: 502,
      grund: `npm view ${paket}: keine integrity in der Antwort`,
    }
  const vorlage = eintrag.installation_vorlage as McpInstallationsVorlage
  return {
    ok: true,
    daten: {
      art: 'mcp',
      id,
      name: eintrag.name ?? id,
      paket,
      version,
      integrity,
      lizenz: eintrag.lizenz ?? null,
      lizenzRegistry: typeof antwort.license === 'string' ? antwort.license : null,
      kosten: eintrag.kosten ?? null,
      wirkung: String(eintrag.wirkung),
      werkzeuge: [...vorlage.werkzeuge],
      zielordner: join(kontext.capWurzel, id),
      herkunftUrl: (eintrag.herkunft as { url: string }).url,
      eintragHash: eintragsKennung(eintrag),
    },
  }
}

/**
 * Schritt 2: installiert genau version + integrity aus der Anzeige, prüft fail-closed und schreibt
 * erst danach installation + freigabe FREIGEGEBEN (Details im Dateikopf).
 * @param id - Katalog-id
 * @param angezeigt - { version, integrity, eintragHash } aus bereiteInstallationVor, wie angezeigt
 * @param kontext - Installationswurzel, cap-Wurzel, Runner, node-Pfad
 * @returns Ergebnis oder Ablehnung mit HTTP-Status (400 Form/nicht installierbar, 404, 409 läuft schon/
 *   schon installiert/Zielordner vorhanden/Katalog geändert, 422 Prüfung fehlgeschlagen, 500 Schreiben)
 */
export async function installiereRessource(id: string, angezeigt: { version: unknown; integrity: unknown; eintragHash: unknown }, kontext: InstallationsKontext): Promise<InstallationsAntwort<InstallationsErgebnis>> {
  // F36 WS-5b: ein Skill wird mit { version = Commit-SHA, eintragHash } installiert (keine integrity);
  // welche Form gilt, entscheidet die unterart des Katalogeintrags (vorab gelesen, unter der Sperre erneut).
  const vorab = findeInstallierbaren(id, kontext.installWurzel)
  if (!vorab.ok) return vorab
  if (vorab.eintrag.unterart === 'skill') return installiereSkill(id, angezeigt, kontext)
  if (typeof angezeigt.version !== 'string' || !EXAKTE_VERSION.test(angezeigt.version))
    return {
      ok: false,
      status: 400,
      grund: "'version' muss eine exakte Version sein (z. B. '1.2.3'), keine Range",
    }
  if (typeof angezeigt.integrity !== 'string' || !INTEGRITY_MUSTER.test(angezeigt.integrity))
    return {
      ok: false,
      status: 400,
      grund: "'integrity' muss eine SRI-Prüfsumme sein (z. B. 'sha512-…')",
    }
  if (typeof angezeigt.eintragHash !== 'string' || !HASH_MUSTER.test(angezeigt.eintragHash))
    return { ok: false, status: 400, grund: "'eintragHash' (aus dem Vorbereiten) fehlt oder ist kein sha256" }
  if (installationLaeuft)
    return {
      ok: false,
      status: 409,
      grund: 'Es läuft bereits eine Installation — immer nur eine zur Zeit',
    }
  installationLaeuft = true
  try {
    return await installiereGesperrt(id, angezeigt.version, angezeigt.integrity, angezeigt.eintragHash, kontext)
  } finally {
    installationLaeuft = false
  }
}

/** Kern von installiereRessource unter der Sperre. */
async function installiereGesperrt(id: string, version: string, integrity: string, eintragHash: string, kontext: InstallationsKontext): Promise<InstallationsAntwort<InstallationsErgebnis>> {
  const start = Date.now()
  const gefunden = findeInstallierbaren(id, kontext.installWurzel)
  if (!gefunden.ok) return gefunden
  const { katalog, eintrag } = gefunden
  if (eintrag.unterart !== 'mcp') return { ok: false, status: 409, grund: `Katalogeintrag '${id}' ist seit der Anzeige kein MCP mehr — nichts installiert, erneut vorbereiten` }
  const paket = paketVon(eintrag)
  if (eintragsKennung(eintrag) !== eintragHash) {
    return { ok: false, status: 409, grund: `Katalogeintrag '${id}' hat sich seit der Anzeige geändert (Paket, Vorlage, Lizenz, Kosten oder Wirkung) — nichts installiert, erneut vorbereiten` }
  }
  const vorlage = eintrag.installation_vorlage as McpInstallationsVorlage
  const runner = kontext.runner ?? ECHTE_RUNNER
  const zeitgrenzen = { ...STANDARD_ZEITGRENZEN, ...kontext.zeitgrenzen }
  const nodePfad = kontext.nodePfad ?? process.execPath
  const zielordner = resolve(kontext.capWurzel, id)
  const belegt: InstallationsAntwort<InstallationsErgebnis> = {
    ok: false,
    status: 409,
    grund: `Zielordner '${zielordner}' existiert bereits — vermutlich von einem anderen Checkout/Worktree installiert oder von einem abgebrochenen Versuch übrig. Erst prüfen, ob ein anderer Katalog ihn nutzt; nur dann entfernen und erneut installieren`,
  }
  if (existsSync(zielordner)) return belegt

  /** Fehlschlag nach dem Anlegen des Zielordners: eigenen Ordner wieder entfernen, ressourcen.json bleibt unberührt. */
  const scheitere = (status: number, grund: string): InstallationsAntwort<InstallationsErgebnis> => {
    try {
      rmSync(zielordner, { recursive: true, force: true })
    } catch (fehler) {
      console.error(`[installation] Zielordner '${zielordner}' nach Fehlschlag nicht entfernbar:`, fehler)
      return {
        ok: false,
        status,
        grund: `${grund} (Zielordner '${zielordner}' konnte nicht entfernt werden: ${(fehler as Error).message})`,
      }
    }
    return { ok: false, status, grund }
  }

  // Zielordner selbst OHNE recursive: EEXIST (z. B. ein zweiter Prozess dazwischen) heißt 409, und
  // scheitere löscht nur, was diese Installation selbst angelegt hat.
  try {
    mkdirSync(kontext.capWurzel, { recursive: true })
  } catch (fehler) {
    console.error(`[installation] cap-Wurzel '${kontext.capWurzel}' nicht anlegbar:`, fehler)
    return { ok: false, status: 500, grund: `cap-Wurzel '${kontext.capWurzel}' nicht anlegbar: ${(fehler as Error).message}` }
  }
  try {
    mkdirSync(zielordner)
  } catch (fehler) {
    if ((fehler as NodeJS.ErrnoException).code === 'EEXIST') return belegt
    console.error(`[installation] Zielordner '${zielordner}' nicht anlegbar:`, fehler)
    return {
      ok: false,
      status: 500,
      grund: `Zielordner nicht anlegbar: ${(fehler as Error).message}`,
    }
  }
  // Jede unerwartete Ausnahme nach dem Anlegen läuft über scheitere — sonst bliebe der Zielordner
  // liegen und jeder weitere Versuch endete mit 409.
  try {
    return await pruefeUndSchreibe()
  } catch (fehler) {
    console.error(`[installation] Installation von '${id}' unerwartet abgebrochen:`, fehler)
    return scheitere(500, `Installation unerwartet abgebrochen: ${(fehler as Error).message}`)
  }

  /** Schritte (0)–(5) nach dem Anlegen des Zielordners. */
  async function pruefeUndSchreibe(): Promise<InstallationsAntwort<InstallationsErgebnis>> {
    writeFileSync(join(zielordner, 'package.json'), `${JSON.stringify({ name: `aiw-cap-${id}`, private: true }, null, 2)}\n`)

    // (1) npm install — exakte Version, keine Install-Skripte.
    const npmArgs = ['install', `${paket}@${version}`, '--prefix', zielordner, '--ignore-scripts', '--save-exact', '--no-audit', '--no-fund']
    let npmErgebnis: ProzessErgebnis
    try {
      npmErgebnis = await runner.npm(npmArgs, {
        cwd: zielordner,
        timeoutMs: zeitgrenzen.installMs,
      })
    } catch (fehler) {
      console.error(`[installation] npm install für '${id}' nicht ausführbar:`, fehler)
      return scheitere(422, `npm install nicht ausführbar: ${(fehler as Error).message}`)
    }
    if (npmErgebnis.zeitueberschritten) return scheitere(422, `npm install ${paket}@${version}: Zeitgrenze (${zeitgrenzen.installMs} ms) überschritten`)
    if (npmErgebnis.code !== 0) return scheitere(422, `npm install ${paket}@${version} fehlgeschlagen (Exit ${npmErgebnis.code}): ${ausgabeKurz(npmErgebnis)}`)

    // (2) Lockfile: installierte version und integrity = angezeigte (F-786, Registry-Integrität).
    let lock: {
      packages?: Record<string, { version?: unknown; integrity?: unknown }>
    }
    try {
      lock = JSON.parse(readFileSync(join(zielordner, 'package-lock.json'), 'utf8'))
    } catch (fehler) {
      return scheitere(422, `package-lock.json im Zielordner nicht lesbar: ${(fehler as Error).message}`)
    }
    const gesperrt = lock.packages?.[`node_modules/${paket}`]
    if (gesperrt?.version !== version) return scheitere(422, `installierte Version '${String(gesperrt?.version)}' ≠ angezeigte '${version}' — abgelehnt`)
    if (gesperrt?.integrity !== integrity) return scheitere(422, `integrity im Lockfile ≠ angezeigte — abgelehnt (Lockfile: ${String(gesperrt?.integrity)})`)

    // (3) bin existiert und liegt im Paket.
    const paketOrdner = join(zielordner, 'node_modules', ...paket.split('/'))
    const binPfad = resolve(paketOrdner, ...vorlage.bin.split('/'))
    if (relative(paketOrdner, binPfad).startsWith('..') || !binPfad.startsWith(paketOrdner + sep)) return scheitere(422, `bin '${vorlage.bin}' liegt außerhalb des Pakets — abgelehnt`)
    if (!existsSync(binPfad)) return scheitere(422, `bin '${vorlage.bin}' fehlt im Paket (${binPfad}) — abgelehnt`)

    // (4) Serverstart mit den Vorlagen-args (Platzhalter mit Testwerten), initialize + tools/list, alle werkzeuge.
    const pruefOrdner = mkdtempSync(join(tmpdir(), 'aiw-ws5a-pruef-'))
    let server: Awaited<ReturnType<ServerPruefer>>
    try {
      const pruefArgs = ersetzePlatzhalter(vorlage.args, {
        projekt_origins: PRUEF_ORIGINS,
        ausgabe_ordner: join(pruefOrdner, 'ausgabe'),
      })
      server = await runner.pruefeServer(nodePfad, [binPfad, ...pruefArgs], {
        cwd: pruefOrdner,
        timeoutMs: zeitgrenzen.serverMs,
      })
    } catch (fehler) {
      console.error(`[installation] Serverstart-Prüfung für '${id}' geworfen:`, fehler)
      server = { ok: false, grund: (fehler as Error).message }
    } finally {
      try {
        rmSync(pruefOrdner, { recursive: true, force: true })
      } catch (fehler) {
        // Nur ein Temp-Ordner — liegen lassen ist besser als die Installation daran scheitern zu lassen.
        console.error(`[installation] Prüfordner '${pruefOrdner}' nicht entfernbar:`, fehler)
      }
    }
    if (!server.ok) return scheitere(422, `Serverstart-Prüfung fehlgeschlagen: ${server.grund}`)
    const praefix = `mcp__${id}__`
    const fehlend = vorlage.werkzeuge.filter((w) => !server.werkzeuge.includes(w.slice(praefix.length)))
    if (fehlend.length > 0) return scheitere(422, `Server bietet nicht alle freigegebenen Werkzeuge an — fehlend: ${fehlend.join(', ')}`)

    // (5) Erst jetzt: installation + FREIGEGEBEN, nur wenn der Katalog seit dem Lesen unverändert ist.
    const installation: Installation = {
      version,
      mcp_server: { command: nodePfad, args: [binPfad, ...vorlage.args] },
      werkzeuge: [...vorlage.werkzeuge],
    }
    const geschrieben = schreibeInstallierteRessource(katalog, id, installation)
    if (!geschrieben.ok) return scheitere(geschrieben.status, geschrieben.grund)
    return {
      ok: true,
      daten: {
        art: 'mcp',
        id,
        paket,
        version,
        integrity,
        zielordner,
        installation,
        werkzeugeGefunden: [...server.werkzeuge],
        dauerMs: Date.now() - start,
      },
    }
  }
}

// ─── F36 WS-5b: Skill ──────────────────────────────────────────────────────────

/** Zielordner-Anzeige vor dem Fetch — der Name steht erst in der SKILL.md. */
const NAME_AUS_SKILL_MD = '<name aus SKILL.md>'

/**
 * Vorbereiten für einen Skill: herkunft.url zerlegen und die Ref nur lesend zur Commit-SHA auflösen
 * (git ls-remote). Nichts wird geholt oder geschrieben.
 * @param eintrag - installierbarer Katalogeintrag (extern skill)
 * @param capWurzel - Workforce-Ordner der Installationen
 * @param git - git-Runner
 * @param gitMs - Zeitgrenze je git-Aufruf
 * @returns Anzeige-Daten oder Ablehnung (400 URL, 502 Remote)
 */
async function bereiteSkillVor(eintrag: Ressource, capWurzel: string, git: GitRunner, gitMs: number): Promise<InstallationsAntwort<SkillVorbereitung>> {
  const quelle = zerlegeGithubUrl((eintrag.herkunft as { url: string }).url)
  if (!quelle.ok) return { ok: false, status: 400, grund: quelle.grund }
  const vorlage = eintrag.installation_vorlage as SkillInstallationsVorlage
  const aufgeloest = await loeseSkillCommitAuf(quelle, git, gitMs)
  if (!aufgeloest.ok) return aufgeloest
  return {
    ok: true,
    daten: {
      art: 'skill',
      id: eintrag.id,
      name: eintrag.name ?? eintrag.id,
      repo: quelle.repoUrl,
      ref: quelle.ref,
      version: aufgeloest.sha,
      skillPfad: vorlage.skill_pfad,
      quellPfad: quelle.unterpfad === '' ? vorlage.skill_pfad : `${quelle.unterpfad}/${vorlage.skill_pfad}`,
      lizenz: eintrag.lizenz ?? null,
      kosten: eintrag.kosten ?? null,
      zielordner: join(capWurzel, eintrag.id, '.claude', 'skills', NAME_AUS_SKILL_MD),
      herkunftUrl: (eintrag.herkunft as { url: string }).url,
      hinweis: SKILL_SKRIPT_HINWEIS,
      eintragHash: eintragsKennung(eintrag),
    },
  }
}

/**
 * Formprüfung und Sperre für die Skill-Installation (Muster installiereRessource).
 * @param id - Katalog-id
 * @param angezeigt - { version = angezeigte SHA, eintragHash }
 * @param kontext - Installationswurzel, cap-Wurzel, Runner
 * @returns Ergebnis oder Ablehnung (400 Form, 409 Sperre)
 */
async function installiereSkill(id: string, angezeigt: { version: unknown; eintragHash: unknown }, kontext: InstallationsKontext): Promise<InstallationsAntwort<InstallationsErgebnis>> {
  if (typeof angezeigt.version !== 'string' || !COMMIT_SHA.test(angezeigt.version)) return { ok: false, status: 400, grund: "'version' muss bei einem Skill die angezeigte 40-stellige Commit-SHA sein" }
  if (typeof angezeigt.eintragHash !== 'string' || !HASH_MUSTER.test(angezeigt.eintragHash)) return { ok: false, status: 400, grund: "'eintragHash' (aus dem Vorbereiten) fehlt oder ist kein sha256" }
  if (installationLaeuft) return { ok: false, status: 409, grund: 'Es läuft bereits eine Installation — immer nur eine zur Zeit' }
  installationLaeuft = true
  try {
    return await installiereSkillGesperrt(id, angezeigt.version, angezeigt.eintragHash, kontext)
  } finally {
    installationLaeuft = false
  }
}

/**
 * Kern der Skill-Installation unter der Sperre: eintragHash = angezeigter (sonst 409), ls-remote
 * erneut = angezeigte SHA (sonst 409), Zielordner <cap>/<id> exklusiv anlegen, Quelle holen und prüfen
 * (skill-installation.ts), nach <cap>/<id>/.claude/skills/<name>/ kopieren, inhalt_hash berechnen, erst
 * dann installation + FREIGEGEBEN schreiben. Jeder Fehlschlag entfernt <cap>/<id> und lässt
 * ressourcen.json unverändert.
 * @param id - Katalog-id
 * @param sha - angezeigte Commit-SHA
 * @param eintragHash - angezeigter eintragHash
 * @param kontext - Installationswurzel, cap-Wurzel, Runner
 * @returns Ergebnis oder Ablehnung mit HTTP-Status
 */
async function installiereSkillGesperrt(id: string, sha: string, eintragHash: string, kontext: InstallationsKontext): Promise<InstallationsAntwort<InstallationsErgebnis>> {
  const start = Date.now()
  const gefunden = findeInstallierbaren(id, kontext.installWurzel)
  if (!gefunden.ok) return gefunden
  const { katalog, eintrag } = gefunden
  if (eintrag.unterart !== 'skill') return { ok: false, status: 409, grund: `Katalogeintrag '${id}' ist seit der Anzeige kein Skill mehr — nichts installiert, erneut vorbereiten` }
  if (eintragsKennung(eintrag) !== eintragHash) return { ok: false, status: 409, grund: `Katalogeintrag '${id}' hat sich seit der Anzeige geändert (Adresse, Vorlage, Lizenz oder Kosten) — nichts installiert, erneut vorbereiten` }
  const quelle = zerlegeGithubUrl((eintrag.herkunft as { url: string }).url)
  if (!quelle.ok) return { ok: false, status: 400, grund: quelle.grund }
  const vorlage = eintrag.installation_vorlage as SkillInstallationsVorlage
  const git = (kontext.runner ?? ECHTE_RUNNER).git ?? gitReal
  const zeitgrenzen = { ...STANDARD_ZEITGRENZEN, ...kontext.zeitgrenzen }
  const aufgeloest = await loeseSkillCommitAuf(quelle, git, zeitgrenzen.gitMs)
  if (!aufgeloest.ok) return aufgeloest
  if (aufgeloest.sha !== sha) return { ok: false, status: 409, grund: `Ref '${quelle.ref}' zeigt inzwischen auf ${aufgeloest.sha}, angezeigt war ${sha} — nichts installiert, erneut vorbereiten` }

  const capOrdner = resolve(kontext.capWurzel, id)
  const belegt: InstallationsAntwort<InstallationsErgebnis> = {
    ok: false,
    status: 409,
    grund: `Zielordner '${capOrdner}' existiert bereits — vermutlich von einem anderen Checkout/Worktree installiert oder von einem abgebrochenen Versuch übrig. Erst prüfen, ob ein anderer Katalog ihn nutzt; nur dann entfernen und erneut installieren`,
  }
  if (existsSync(capOrdner)) return belegt
  try {
    mkdirSync(kontext.capWurzel, { recursive: true })
    // Ohne recursive: EEXIST (zweiter Prozess dazwischen) heißt 409, scheitere löscht nur Eigenes.
    mkdirSync(capOrdner)
  } catch (fehler) {
    if ((fehler as NodeJS.ErrnoException).code === 'EEXIST') return belegt
    console.error(`[installation] Zielordner '${capOrdner}' nicht anlegbar:`, fehler)
    return { ok: false, status: 500, grund: `Zielordner nicht anlegbar: ${(fehler as Error).message}` }
  }
  const scheitere = (status: number, grund: string): InstallationsAntwort<InstallationsErgebnis> => {
    try {
      rmSync(capOrdner, { recursive: true, force: true })
    } catch (fehler) {
      console.error(`[installation] Zielordner '${capOrdner}' nach Fehlschlag nicht entfernbar:`, fehler)
      return { ok: false, status, grund: `${grund} (Zielordner '${capOrdner}' konnte nicht entfernt werden: ${(fehler as Error).message})` }
    }
    return { ok: false, status, grund }
  }

  // try: auch ein Wurf beim Anlegen des Temp-Repos darf den cap-Ordner nicht liegen lassen (sonst 409 für immer).
  let geholt: Awaited<ReturnType<typeof holeSkillQuelle>>
  try {
    geholt = await holeSkillQuelle(quelle, sha, vorlage.skill_pfad, git, zeitgrenzen.gitMs)
  } catch (fehler) {
    console.error(`[installation] Skill-Quelle für '${id}' nicht holbar:`, fehler)
    return scheitere(500, `Skill-Quelle nicht holbar: ${(fehler as Error).message}`)
  }
  if (!geholt.ok) return scheitere(geholt.status, geholt.grund)
  try {
    // Namen der übrigen installierten Ort-B-Skills = letzter Ordner ihres installation.pfad.
    const belegteNamen = katalog.daten.ressourcen.flatMap((r) =>
      r.id !== id && r.typ === 'extern' && r.unterart === 'skill' && r.installation !== undefined && 'pfad' in r.installation ? [basename(r.installation.pfad.replace(/[\\/]+$/, ''))] : []
    )
    const harness = pruefeSkillDateiNamen(geholt.dateien)
    if (harness !== null) return scheitere(422, harness)
    const geprueft = pruefeSkillQuelle(geholt.quellOrdner, belegteNamen)
    if (!geprueft.ok) return scheitere(geprueft.status, geprueft.grund)
    const ziel = join(capOrdner, '.claude', 'skills', geprueft.name)
    mkdirSync(dirname(ziel), { recursive: true })
    kopiereSkill(geholt.quellOrdner, ziel)
    const installation: Installation = { pfad: ziel, version: sha, inhalt_hash: berechneInhaltHash(ziel) }
    const geschrieben = schreibeInstallierteRessource(katalog, id, installation)
    if (!geschrieben.ok) return scheitere(geschrieben.status, geschrieben.grund)
    return { ok: true, daten: { art: 'skill', id, version: sha, name: geprueft.name, zielordner: ziel, installation, dateien: geholt.dateien, dauerMs: Date.now() - start } }
  } catch (fehler) {
    console.error(`[installation] Skill-Installation von '${id}' unerwartet abgebrochen:`, fehler)
    return scheitere(500, `Installation unerwartet abgebrochen: ${(fehler as Error).message}`)
  } finally {
    geholt.aufraeumen()
  }
}

// ─── Katalog schreiben ─────────────────────────────────────────────────────────

/** JSON-Wert kompakt mit Leerzeichen (Stil von ressourcen.json: '{ "a": 1 }', '["x", "y"]'). */
function inline(wert: unknown): string {
  if (Array.isArray(wert)) return `[${wert.map(inline).join(', ')}]`
  if (typeof wert === 'object' && wert !== null) {
    const teile = Object.entries(wert).map(([k, v]) => `${JSON.stringify(k)}: ${inline(v)}`)
    return teile.length === 0 ? '{}' : `{ ${teile.join(', ')} }`
  }
  return JSON.stringify(wert)
}

/** Formatiert einen Wert: inline, solange die Zeile ≤ 120 Zeichen bleibt, sonst mehrzeilig. */
function formatiere(wert: unknown, einzug: string, praefixLaenge: number): string {
  const kurz = inline(wert)
  if (einzug.length + praefixLaenge + kurz.length <= 120 || typeof wert !== 'object' || wert === null) return kurz
  const innen = `${einzug}  `
  if (Array.isArray(wert)) return `[\n${wert.map((v) => `${innen}${formatiere(v, innen, 0)}`).join(',\n')}\n${einzug}]`
  const zeilen = Object.entries(wert).map(([k, v]) => `${innen}${JSON.stringify(k)}: ${formatiere(v, innen, k.length + 4)}`)
  return `{\n${zeilen.join(',\n')}\n${einzug}}`
}

/**
 * Schreibt den Eintrag <id> mit installation + freigabe FREIGEGEBEN zurück: nur der Text dieses
 * Eintrags wird ersetzt (übrige Formatierung bleibt), der Rest ist bitgleich. Prüft vorher, dass die
 * Datei seit dem Lesen unverändert ist (sonst 409), validiert das Ergebnis und schreibt atomar.
 */
function schreibeInstallierteRessource(
  katalog: { pfad: string; roh: string; daten: { ressourcen: Ressource[] } },
  id: string,
  installation: Installation
): { ok: true } | { ok: false; status: number; grund: string } {
  let aktuell: string
  try {
    aktuell = readFileSync(katalog.pfad, 'utf8')
  } catch (fehler) {
    return {
      ok: false,
      status: 500,
      grund: `ressourcen.json vor dem Schreiben nicht lesbar: ${(fehler as Error).message}`,
    }
  }
  if (aktuell !== katalog.roh)
    return {
      ok: false,
      status: 409,
      grund: 'ressourcen.json hat sich während der Installation geändert — nichts geschrieben, erneut versuchen',
    }

  const neueDaten = structuredClone(katalog.daten)
  const index = neueDaten.ressourcen.findIndex((r) => r.id === id)
  const alt = neueDaten.ressourcen[index]
  // Feldreihenfolge des Eintrags bleibt; installation steht direkt hinter installation_vorlage.
  const neu: Record<string, unknown> = {}
  for (const [schluessel, wert] of Object.entries(alt)) {
    neu[schluessel] = schluessel === 'freigabe' ? 'FREIGEGEBEN' : wert
    if (schluessel === 'installation_vorlage') neu.installation = installation
  }
  if (!('installation' in neu)) neu.installation = installation
  neueDaten.ressourcen[index] = neu as unknown as Ressource
  const verstoesse = validiereRessourcenDaten(neueDaten)
  if (verstoesse.length > 0)
    return {
      ok: false,
      status: 500,
      grund: `neuer Katalog wäre ungültig, nichts geschrieben: ${verstoesse.join('; ')}`,
    }

  const zeilenende = aktuell.includes('\r\n') ? '\r\n' : '\n'
  let text = ersetzeEintragText(aktuell.replaceAll('\r\n', '\n'), id, neu)
  // Fallback: lässt sich der Eintrag nicht eindeutig im Text finden, wird die Datei neu formatiert.
  if (text === null || !gleicherInhalt(text, neueDaten)) text = `${JSON.stringify(neueDaten, null, 2)}\n`
  if (zeilenende === '\r\n') text = text.replaceAll('\n', '\r\n')

  const temp = join(dirname(katalog.pfad), `.ressourcen.json.${process.pid}.${Date.now()}.tmp`)
  try {
    writeFileSync(temp, text)
    renameSync(temp, katalog.pfad)
  } catch (fehler) {
    console.error('[installation] ressourcen.json nicht schreibbar:', fehler)
    rmSync(temp, { force: true })
    return {
      ok: false,
      status: 500,
      grund: `ressourcen.json nicht schreibbar: ${(fehler as Error).message}`,
    }
  }
  return { ok: true }
}

/** true, wenn text gültiges JSON mit genau diesem Inhalt ist (ungültiges JSON → false, kein Wurf). */
function gleicherInhalt(text: string, daten: unknown): boolean {
  try {
    return kanonischesJson(JSON.parse(text)) === kanonischesJson(daten)
  } catch {
    return false
  }
}

/** Ersetzt im Text genau den Eintrag mit dieser id ('    {' … '    }'); null, wenn er nicht eindeutig zu finden ist. */
function ersetzeEintragText(text: string, id: string, eintrag: Record<string, unknown>): string | null {
  const marke = `"id": ${JSON.stringify(id)}`
  const stelle = text.indexOf(marke)
  if (stelle === -1 || text.indexOf(marke, stelle + 1) !== -1) return null
  const anfang = text.lastIndexOf('\n    {\n', stelle)
  const ende = text.indexOf('\n    }', stelle)
  if (anfang === -1 || ende === -1) return null
  const zeilen = Object.entries(eintrag).map(([k, v]) => `      ${JSON.stringify(k)}: ${formatiere(v, '      ', k.length + 4)}`)
  return `${text.slice(0, anfang)}\n    {\n${zeilen.join(',\n')}${text.slice(ende)}`
}

// ─── Echte Runner ──────────────────────────────────────────────────────────────

/** Nachfrist, bevor ein nicht beendetes Kind hart beendet wird. */
const KILL_NACHFRIST_MS = 5000

/** Nachfrist nach 'exit', in der 'close' (alle stdio-Pipes zu) noch kommen darf. */
const CLOSE_NACHFRIST_MS = 2000

/**
 * Beendet ein Kind: erst kill(), nach KILL_NACHFRIST_MS SIGKILL — damit ein Kind, das SIGTERM
 * ignoriert, die Installationssperre nicht für immer hält.
 */
function beendeHart(kind: ReturnType<typeof spawn>): void {
  kind.kill()
  setTimeout(() => {
    if (kind.exitCode === null && kind.signalCode === null) kind.kill('SIGKILL')
  }, KILL_NACHFRIST_MS).unref()
}

/**
 * Ruft fertig() bei 'close' auf — oder spätestens CLOSE_NACHFRIST_MS nach 'exit', dann mit
 * zerstörten Pipes: ein Enkelprozess, der geerbte stdout/stderr offen hält, verhindert 'close' sonst
 * für immer (und damit die Freigabe der Installationssperre). fertig() darf mehrfach kommen, die
 * Aufrufer lösen ein Promise auf (nur der erste Aufruf wirkt).
 * @param kind - Kindprozess
 * @param fertig - (code) => void
 */
function beiEnde(kind: ReturnType<typeof spawn>, fertig: (code: number | null) => void): void {
  kind.on('close', (code) => fertig(code))
  kind.on('exit', (code) => {
    setTimeout(() => {
      kind.stdout?.destroy()
      kind.stderr?.destroy()
      kind.stdin?.destroy()
      fertig(code)
    }, CLOSE_NACHFRIST_MS).unref()
  })
}

/**
 * Gemeinsamer Prozess-Runner für npm und git (ohne Shell): sammelt stdout/stderr, beendet nach
 * timeoutMs hart und löst erst bei Prozessende auf.
 * @param befehl - Programm
 * @param args - Argumente
 * @param optionen - cwd, timeoutMs, optional die vollständige Umgebung env
 * @returns ProzessErgebnis (Wurf nur bei Spawn-Fehler)
 */
function laufeProzess(befehl: string, args: string[], { cwd, timeoutMs, env }: { cwd: string; timeoutMs: number; env?: NodeJS.ProcessEnv }): Promise<ProzessErgebnis> {
  return new Promise((aufloesen, ablehnen) => {
    const kind = spawn(befehl, args, { cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], ...(env !== undefined ? { env } : {}) })
    let stdout = ''
    let stderr = ''
    let zeitueberschritten = false
    const timer = setTimeout(() => {
      zeitueberschritten = true
      beendeHart(kind)
    }, timeoutMs)
    kind.stdout.setEncoding('utf8')
    kind.stderr.setEncoding('utf8')
    kind.stdout.on('data', (d) => {
      stdout += d
    })
    kind.stderr.on('data', (d) => {
      stderr += d
    })
    kind.on('error', (fehler) => {
      clearTimeout(timer)
      ablehnen(fehler)
    })
    beiEnde(kind, (code) => {
      clearTimeout(timer)
      aufloesen({ code, stdout, stderr, zeitueberschritten })
    })
  })
}

/** npm ohne Shell: node + npm-cli.js neben der laufenden node.exe (Spike WS-2s S5: Startform node + *-cli.js). */
const npmReal: NpmRunner = (args, { cwd, timeoutMs }) => {
  const npmCli = join(dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js')
  if (!existsSync(npmCli)) return Promise.reject(new Error(`npm-cli.js nicht gefunden unter '${npmCli}'`))
  return laufeProzess(process.execPath, [npmCli, ...args], { cwd, timeoutMs })
}

/**
 * Echter Serverstart: MCP über stdio (zeilenweise JSON-RPC), initialize → notifications/initialized →
 * tools/list, danach beenden; aufgelöst erst, wenn der Prozess beendet ist.
 */
const pruefeServerReal: ServerPruefer = (command, args, { cwd, timeoutMs }) =>
  new Promise((aufloesen) => {
    const kind = spawn(command, args, {
      cwd,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let puffer = ''
    let stderr = ''
    let ergebnis: { ok: true; werkzeuge: string[] } | { ok: false; grund: string } | null = null
    const beende = (e: { ok: true; werkzeuge: string[] } | { ok: false; grund: string }): void => {
      if (ergebnis === null) ergebnis = e
      beendeHart(kind)
    }
    kind.stdout.setEncoding('utf8')
    kind.stderr.setEncoding('utf8')
    const timer = setTimeout(
      () =>
        beende({
          ok: false,
          grund: `keine vollständige Antwort binnen ${timeoutMs} ms${stderr ? ` (stderr: ${stderr.trim().slice(-300)})` : ''}`,
        }),
      timeoutMs
    )
    const sende = (nachricht: unknown): void => {
      kind.stdin.write(`${JSON.stringify(nachricht)}\n`)
    }
    // Ein früh beendeter Server schließt stdin — EPIPE ist dann kein eigener Fehler, 'close' meldet ihn.
    kind.stdin.on('error', () => {})
    kind.stderr.on('data', (d) => {
      stderr += d
    })
    kind.stdout.on('data', (d) => {
      puffer += d
      let umbruch = puffer.indexOf('\n')
      while (umbruch !== -1) {
        const zeile = puffer.slice(0, umbruch).trim()
        puffer = puffer.slice(umbruch + 1)
        umbruch = puffer.indexOf('\n')
        if (zeile.length === 0) continue
        let nachricht: {
          id?: unknown
          result?: { tools?: Array<{ name?: unknown }> }
          error?: { message?: unknown }
        }
        try {
          nachricht = JSON.parse(zeile)
        } catch {
          continue
        }
        if (nachricht.error !== undefined) {
          beende({
            ok: false,
            grund: `MCP-Fehler: ${String(nachricht.error.message)}`,
          })
        } else if (nachricht.id === 1) {
          sende({ jsonrpc: '2.0', method: 'notifications/initialized' })
          sende({ jsonrpc: '2.0', id: 2, method: 'tools/list' })
        } else if (nachricht.id === 2) {
          const namen = (nachricht.result?.tools ?? []).flatMap((t) => (typeof t.name === 'string' ? [t.name] : []))
          beende({ ok: true, werkzeuge: namen })
        }
      }
    })
    kind.on('error', (fehler) => {
      clearTimeout(timer)
      if (ergebnis === null)
        ergebnis = {
          ok: false,
          grund: `Server nicht startbar: ${fehler.message}`,
        }
      aufloesen(ergebnis)
    })
    beiEnde(kind, (code) => {
      clearTimeout(timer)
      aufloesen(
        ergebnis ?? {
          ok: false,
          grund: `Server beendet ohne tools/list-Antwort (Exit ${code})${stderr ? `: ${stderr.trim().slice(-300)}` : ''}`,
        }
      )
    })
    sende({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'ai-workforce-installation', version: '0' },
      },
    })
  })

/**
 * F36 WS-5b: git ohne Shell ('git' aus PATH). Aus process.env fallen alle GIT_*-Variablen weg (Reviewer:
 * GIT_CONFIG_PARAMETERS/-COUNT, GIT_DIR, GIT_SSL_NO_VERIFY, GIT_ASKPASS … könnten sonst Filter, Hooks oder
 * eine andere Quelle einschleusen); env aus skill-installation.ts (GIT_CONFIG_NOSYSTEM, GIT_CONFIG_GLOBAL
 * auf eine leere Datei, GIT_TERMINAL_PROMPT=0) kommt danach dazu.
 */
const gitReal: GitRunner = (args, { cwd, timeoutMs, env }) => laufeProzess('git', args, { cwd, timeoutMs, env: gitUmgebung(process.env, env) })

/**
 * Umgebung eines git-Aufrufs: die Server-Umgebung ohne jede GIT_*-Variable (Groß-/Kleinschreibung egal),
 * darüber die Werte aus skill-installation.ts.
 * @param basis - process.env des Servers
 * @param zusatz - GIT_CONFIG_NOSYSTEM, GIT_CONFIG_GLOBAL … des Aufrufs
 * @returns vollständige Umgebung
 */
export function gitUmgebung(basis: NodeJS.ProcessEnv, zusatz: Record<string, string> = {}): NodeJS.ProcessEnv {
  return { ...Object.fromEntries(Object.entries(basis).filter(([schluessel]) => !schluessel.toUpperCase().startsWith('GIT_'))), ...zusatz }
}

/** Echte Runner — Default, wenn der Kontext keine injiziert. */
export const ECHTE_RUNNER: InstallationsRunner = {
  npm: npmReal,
  pruefeServer: pruefeServerReal,
  git: gitReal,
}
