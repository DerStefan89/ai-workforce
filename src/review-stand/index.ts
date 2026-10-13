/**
 * Datei: src/review-stand/index.ts
 *
 * Zweck: Geprüfter Stand des Reviews und „Review veraltet“ (F45 B2a-3b, Codex-Review-Spec §9.6, F-1063; Plan
 * features/F45/plan-b2a3b.md v2, Advisor-Pass B2a-3 B1). Ein Inhalts-Fingerabdruck des Arbeitsordners `{ commit, inhalt }`:
 * - Baum von HEAD (`ls-tree -r -z HEAD`, Pfad → Blob),
 * - geänderte Dateien (`diff-index --raw -z --no-renames HEAD`; gelöschte fallen weg),
 * - neue Dateien (`ls-files --others --exclude-standard -z`),
 * - Inhalte der geänderten/neuen Dateien über `hash-object --stdin-paths` OHNE `-w`;
 * inhalt = sha256 über die sortierten Zeilen `pfad\tblob`. „Veraltet“ vergleicht NUR inhalt — ein Commit derselben Inhalte
 * („Sichern“, Metadaten-Commit) ändert inhalt nicht. Ausgeschlossen sind die bekannten Ausnahmen (istAusnahmePfad, u. a.
 * kontrollzustand/) — in JS, weil der Git-Starter des Leitstands mit --literal-pathspecs ':(exclude)' wirkungslos macht.
 *
 * Zeilenenden (Advisor N3, am Wegwerf-Repo geprüft): diff-index ohne Index-Auffrischung meldet auch nur berührte Dateien
 * (Null-Hash). Deshalb je Datei erst `hash-object --no-filters` — gleich dem HEAD-Blob heißt unverändert (deckt CRLF-Blobs in
 * HEAD bei text=auto); sonst `hash-object` mit EOL-Umwandlung (deckt autocrlf=true mit LF in HEAD). Ein gesetzter
 * Filter-Treiber (z. B. LFS) würde dabei ein fremdes Programm starten → null mit Grund (`check-attr filter` vorab).
 *
 * Aufbau: reine Funktionen (parse…, fingerabdruckAusTeilen, standIstVeraltet) und EIN Ablauf (ablauf, Generator: er
 * fordert Git-Aufrufe, Dateigrößen und realpath an, ohne selbst I/O zu machen). Zwei dünne Hüllen treiben ihn:
 * leseGeprueftenStandSync (Schrittstart, synchron wie leseVorherStand) und leseGeprueftenStandAsync (GET …/abnahme, der
 * Event-Loop bleibt frei). Beide mit Gesamtbudget (Zeitgrenze über alle Aufrufe), maxBuffer und Kappen; jeder Fehler →
 * { stand: null, grund }, nie ein Wurf.
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (Start des code-reviewer-Schritts → Laufakte review.geprueft_stand; GET …/abnahme)
 * - scripts/check-f45-b2a3b-review-stand.mjs
 * - src/review-stand/review-stand.test.ts (node:test)
 *
 * Wichtig:
 * - Rein lesend (ARCHITECTURE.md §2): nur Plumbing, immer --no-optional-locks, kein `git status`, kein update-index,
 *   kein write-tree, KEIN `-w` — es entsteht nichts in .git/objects und der Index wird nie geschrieben (Gate (a) misst es).
 * - Grenzen (Durchsetzungsgrad geprüft, nicht ERZWUNGEN): Symlinks — hash-object folgt dem Link, eine berührte verlinkte
 *   Datei kann fälschlich als geändert gelten; Submodule und eingebettete Repos → null mit Grund.
 * - Die Wurzel muss die Toplevel-Wurzel ihres Repos sein (Advisor N4) — sonst liefe Git gegen ein umgebendes Repo.
 */

import { createHash } from 'node:crypto'
import { realpathSync, statSync } from 'node:fs'
import { realpath, stat } from 'node:fs/promises'
import { join } from 'node:path'
import { istAusnahmePfad } from '../ausfuehrung-vorbedingung/index.ts'
import { fuehreGitAsync, fuehreGitSync } from '../git-starter/index.ts'

/** Der geprüfte (oder aktuelle) Stand: Commit von HEAD und Inhalts-Fingerabdruck (sha256, hex). */
export interface Stand {
  commit: string
  inhalt: string
}

/** Ergebnis einer Hülle: der Stand, oder null mit Grund (nie ein Wurf). */
export type StandErgebnis = { stand: Stand; grund?: undefined } | { stand: null; grund: string }

/** Grenzen einer Berechnung. */
export interface StandGrenzen {
  /** Gesamtbudget über alle Git-Aufrufe in ms. */
  zeitgrenzeMs: number
  /** Höchstzahl der zu hashenden Pfade (geändert + neu). */
  maxPfade: number
  /** Höchstsumme der Dateigrößen der zu hashenden Pfade in Bytes. */
  maxBytes: number
  /** maxBuffer je Git-Aufruf in Bytes. */
  maxAusgabe: number
}

/** Standardgrenzen (Advisor O1/N5): 5 s gesamt, 2 000 Pfade, 64 MiB Inhalt, 64 MiB Ausgabe je Aufruf. */
export const STANDARD_GRENZEN: StandGrenzen = Object.freeze({ zeitgrenzeMs: 5000, maxPfade: 2000, maxBytes: 64 * 1024 * 1024, maxAusgabe: 64 * 1024 * 1024 })

/** Feste Optionen vor jedem Git-Befehl: lesend, kein Fremdprogramm (fsmonitor), Pfade unquotiert. */
const GRUND_ARGUMENTE = Object.freeze(['--no-optional-locks', '-c', 'core.quotePath=false', '-c', 'core.fsmonitor=false'])

/** Zusatzumgebung: Meldungen unabhängig von der Sprache. GIT_*-Werte hier wären im synchronen Pfad wirkungslos
 * (fuehreGitSync entfernt jede GIT_*-Variable aus env); keine optionalen Locks regelt --no-optional-locks, den
 * Terminal-Prompt verhindert stdin als Pipe bzw. fuehreGitAsync selbst. */
const UMGEBUNG = Object.freeze({ LC_ALL: 'C' })

/** Eintrag des HEAD-Baums. */
interface BaumEintrag {
  typ: string
  blob: string
}

/**
 * Zerlegt eine NUL-getrennte Liste (Ausgabe mit -z) in Einträge; der leere Rest nach dem letzten NUL fällt weg.
 * @param roh - Ausgabe
 * @returns Einträge
 */
export function parseNulListe(roh: string): string[] {
  return roh.split('\0').filter((eintrag) => eintrag !== '')
}

/**
 * Liest `ls-tree -r -z HEAD`: je Eintrag `<mode> <typ> <hash>\t<pfad>`.
 * @param roh - Ausgabe
 * @returns Map Pfad → { typ, blob }
 * @throws Error bei einer Zeile, die nicht dem Format entspricht
 */
export function parseLsTree(roh: string): Map<string, BaumEintrag> {
  const baum = new Map<string, BaumEintrag>()
  for (const zeile of parseNulListe(roh)) {
    const treffer = /^(\d{6}) (\w+) ([0-9a-f]{40,64})\t(.+)$/s.exec(zeile)
    if (treffer === null) throw new Error(`ls-tree: unerwartete Zeile ${JSON.stringify(zeile.slice(0, 80))}`)
    baum.set(treffer[4], { typ: treffer[2], blob: treffer[3] })
  }
  return baum
}

/**
 * Liest `diff-index --raw -z --no-renames HEAD`: je Änderung `:<m1> <m2> <h1> <h2> <S>` NUL `<pfad>` NUL.
 * @param roh - Ausgabe
 * @returns { geaendert, geloescht, submodule } (Status D → gelöscht, alles andere → geändert; submodule = geänderte Pfade mit
 *   Modus 160000 auf einer Seite — auch ein neu hinzugefügtes Submodul, das im HEAD-Baum noch fehlt)
 * @throws Error bei einem Eintrag, der nicht dem Format entspricht
 */
export function parseDiffIndexRaw(roh: string): { geaendert: string[]; geloescht: string[]; submodule: string[] } {
  const teile = parseNulListe(roh)
  const geaendert: string[] = []
  const geloescht: string[] = []
  const submodule: string[] = []
  for (let i = 0; i < teile.length; i += 2) {
    const kopf = /^:(\d{6}) (\d{6}) [0-9a-f]{40,64} [0-9a-f]{40,64} ([A-Z])\d*$/.exec(teile[i])
    const pfad = teile[i + 1]
    if (kopf === null || pfad === undefined) throw new Error(`diff-index: unerwarteter Eintrag ${JSON.stringify(teile[i].slice(0, 80))}`)
    if (kopf[3] === 'D') geloescht.push(pfad)
    else geaendert.push(pfad)
    if (kopf[3] !== 'D' && (kopf[1] === '160000' || kopf[2] === '160000')) submodule.push(pfad)
  }
  return { geaendert, geloescht, submodule }
}

/**
 * Liest `check-attr filter -z --stdin`: Tripel Pfad NUL 'filter' NUL Wert NUL.
 * @param roh - Ausgabe
 * @returns Pfade mit gesetztem Filter-Treiber (Wert weder 'unspecified' noch 'unset')
 */
export function parseCheckAttrFilter(roh: string): string[] {
  const teile = roh.split('\0')
  const mitFilter: string[] = []
  for (let i = 0; i + 2 < teile.length; i += 3) if (teile[i + 2] !== 'unspecified' && teile[i + 2] !== 'unset') mitFilter.push(teile[i])
  return mitFilter
}

/**
 * Setzt den Fingerabdruck zusammen (rein): HEAD-Baum ohne gelöschte und ohne Ausnahmen, überschrieben mit den gehashten
 * Inhalten; inhalt = sha256 über die sortierten Zeilen `pfad\tblob`, mit \n verbunden (sortiert mit Array.sort,
 * deterministisch).
 * @param teile - commit, baum (Pfad → Blob), geloescht, gehasht (Pfad → Blob)
 * @param istAusnahme - Ausnahmeregel (Standard istAusnahmePfad; austauschbar nur für den Rotfall des Gates)
 * @returns Stand
 */
export function fingerabdruckAusTeilen(
  teile: { commit: string; baum: ReadonlyMap<string, string>; geloescht: readonly string[]; gehasht: ReadonlyMap<string, string> },
  istAusnahme: (pfad: string) => boolean = istAusnahmePfad
): Stand {
  const inhalt = new Map<string, string>()
  for (const [pfad, blob] of teile.baum) if (!istAusnahme(pfad)) inhalt.set(pfad, blob)
  for (const pfad of teile.geloescht) inhalt.delete(pfad)
  for (const [pfad, blob] of teile.gehasht) if (!istAusnahme(pfad)) inhalt.set(pfad, blob)
  const zeilen = [...inhalt].map(([pfad, blob]) => `${pfad}\t${blob}`).sort()
  return { commit: teile.commit, inhalt: createHash('sha256').update(zeilen.join('\n')).digest('hex') }
}

/**
 * Ist der Review veraltet? Vergleicht nur den Inhalt (ein Commit derselben Inhalte zählt nicht).
 * @param geprueft - Stand zum Review-Start oder null
 * @param aktuell - aktueller Stand oder null
 * @returns true | false | null (nicht bestimmbar)
 */
export function standIstVeraltet(geprueft: Stand | null | undefined, aktuell: Stand | null | undefined): boolean | null {
  if (geprueft === null || geprueft === undefined || aktuell === null || aktuell === undefined) return null
  return geprueft.inhalt !== aktuell.inhalt
}

/** Anforderungen des Ablaufs an seine Hülle. */
export type Anfrage = { art: 'git'; argumente: string[]; eingabe?: string } | { art: 'groesse'; pfade: string[] } | { art: 'realpath'; pfad: string }

/** Antwort der Hülle auf eine Git-Anfrage. */
export type GitAntwort = { ok: true; stdout: string } | { ok: false; grund: string }

/**
 * Vergleicht zwei Pfade nach realpath (unter Windows ohne Groß-/Kleinschreibung).
 * @param a - Pfad
 * @param b - Pfad
 * @returns gleich?
 */
function gleicherPfad(a: string, b: string): boolean {
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b
}

/**
 * Der eine Ablauf der Berechnung als Generator: fordert Git-Aufrufe (Antwort GitAntwort), Dateigrößen (Antwort Summe in
 * Bytes oder null) und realpath (Antwort Pfad oder null) an und liefert am Ende das Ergebnis. Kein I/O hier.
 * @param wurzel - Arbeitsordner (Toplevel seines Repos)
 * @param grenzen - Kappen
 * @returns Generator, Rückgabe StandErgebnis
 */
export function* ablauf(wurzel: string, grenzen: StandGrenzen): Generator<Anfrage, StandErgebnis, unknown> {
  const git = function* (argumente: string[], eingabe?: string): Generator<Anfrage, GitAntwort, unknown> {
    return (yield { art: 'git', argumente: [...GRUND_ARGUMENTE, ...argumente], ...(eingabe !== undefined ? { eingabe } : {}) }) as GitAntwort
  }
  const nichtBestimmbar = (grund: string): StandErgebnis => ({ stand: null, grund })

  const toplevel = yield* git(['rev-parse', '--show-toplevel'])
  if (!toplevel.ok) return nichtBestimmbar(`kein Git-Repo (${toplevel.grund})`)
  const [obenReal, wurzelReal] = [(yield { art: 'realpath', pfad: toplevel.stdout.trim() }) as string | null, (yield { art: 'realpath', pfad: wurzel }) as string | null]
  if (obenReal === null || wurzelReal === null || !gleicherPfad(obenReal, wurzelReal)) return nichtBestimmbar('kein eigenes Git-Repo an der Wurzel des Arbeitsordners')
  const kopf = yield* git(['rev-parse', '--verify', '--quiet', 'HEAD^{commit}'])
  if (!kopf.ok) return nichtBestimmbar('kein Commit (HEAD fehlt)')
  const commit = kopf.stdout.trim()

  const lsTree = yield* git(['ls-tree', '-r', '-z', 'HEAD'])
  if (!lsTree.ok) return nichtBestimmbar(`ls-tree: ${lsTree.grund}`)
  const diff = yield* git(['diff-index', '--raw', '-z', '--no-renames', 'HEAD'])
  if (!diff.ok) return nichtBestimmbar(`diff-index: ${diff.grund}`)
  const others = yield* git(['ls-files', '--others', '--exclude-standard', '-z'])
  if (!others.ok) return nichtBestimmbar(`ls-files: ${others.grund}`)

  let baum: Map<string, BaumEintrag>
  let aenderung: { geaendert: string[]; geloescht: string[]; submodule: string[] }
  try {
    baum = parseLsTree(lsTree.stdout)
    aenderung = parseDiffIndexRaw(diff.stdout)
  } catch (fehler) {
    return nichtBestimmbar((fehler as Error).message)
  }
  const neu = parseNulListe(others.stdout).filter((pfad) => !istAusnahmePfad(pfad))
  const geaendert = aenderung.geaendert.filter((pfad) => !istAusnahmePfad(pfad))
  if (neu.some((pfad) => pfad.endsWith('/'))) return nichtBestimmbar('eingebettetes Git-Repo im Arbeitsordner')
  if (aenderung.submodule.some((pfad) => !istAusnahmePfad(pfad)) || geaendert.some((pfad) => baum.get(pfad)?.typ === 'commit')) return nichtBestimmbar('Submodul geändert')
  const zuHashen = [...new Set([...geaendert, ...neu])].sort()
  if (zuHashen.length > grenzen.maxPfade) return nichtBestimmbar(`zu viele geänderte Dateien (${zuHashen.length} > ${grenzen.maxPfade}; Index veraltet? einmal „git status“)`)
  if (zuHashen.some((pfad) => pfad.includes('\n') || pfad.startsWith('"'))) return nichtBestimmbar('Dateiname mit Zeilenumbruch oder führendem Anführungszeichen')

  const gehasht = new Map<string, string>()
  if (zuHashen.length > 0) {
    const bytes = (yield { art: 'groesse', pfade: zuHashen }) as number | null
    if (bytes === null) return nichtBestimmbar('eine geänderte Datei ist während der Berechnung verschwunden oder nicht lesbar')
    if (bytes > grenzen.maxBytes) return nichtBestimmbar(`geänderte Dateien zu groß (${bytes} Bytes > ${grenzen.maxBytes})`)
    // Erst ohne Filter: gleich dem HEAD-Blob → unverändert (nur berührt, oder CRLF-Blob in HEAD bei text=auto).
    const roh = yield* git(['hash-object', '--no-filters', '--stdin-paths'], `${zuHashen.join('\n')}\n`)
    if (!roh.ok) return nichtBestimmbar(`hash-object: ${roh.grund}`)
    const rohHashes = roh.stdout.split('\n').filter((z) => z !== '')
    if (rohHashes.length !== zuHashen.length) return nichtBestimmbar('hash-object: Anzahl der Ergebnisse passt nicht')
    const rest: string[] = []
    zuHashen.forEach((pfad, i) => {
      if (baum.get(pfad)?.blob === rohHashes[i]) gehasht.set(pfad, rohHashes[i])
      else rest.push(pfad)
    })
    if (rest.length > 0) {
      const attr = yield* git(['check-attr', '-z', '--stdin', 'filter'], `${rest.join('\0')}\0`)
      if (!attr.ok) return nichtBestimmbar(`check-attr: ${attr.grund}`)
      if (parseCheckAttrFilter(attr.stdout).length > 0) return nichtBestimmbar('Filter-Treiber (z. B. LFS) — Stand nicht lesend bestimmbar')
      const gefiltert = yield* git(['hash-object', '--stdin-paths'], `${rest.join('\n')}\n`)
      if (!gefiltert.ok) return nichtBestimmbar(`hash-object: ${gefiltert.grund}`)
      const hashes = gefiltert.stdout.split('\n').filter((z) => z !== '')
      if (hashes.length !== rest.length) return nichtBestimmbar('hash-object: Anzahl der Ergebnisse passt nicht')
      rest.forEach((pfad, i) => {
        gehasht.set(pfad, hashes[i])
      })
    }
  }
  const baumBlobs = new Map([...baum].map(([pfad, eintrag]) => [pfad, eintrag.blob]))
  return { stand: fingerabdruckAusTeilen({ commit, baum: baumBlobs, geloescht: aenderung.geloescht, gehasht }) }
}

/**
 * Erste Zeile eines Fehlertexts.
 * @param text - Text
 * @param ersatz - Text, wenn leer
 * @returns Zeile
 */
function ersteZeile(text: unknown, ersatz: string): string {
  return String(text ?? '').trim().split(/\r?\n/)[0] || ersatz
}

/**
 * Synchrone Hülle (Start des code-reviewer-Schritts; starteWorkflowSchritt ist synchron, Muster leseVorherStand).
 * @param wurzel - Arbeitsordner des Laufs
 * @param grenzen - Kappen (Standard STANDARD_GRENZEN)
 * @returns StandErgebnis — wirft nie
 */
export function leseGeprueftenStandSync(wurzel: string, grenzen: StandGrenzen = STANDARD_GRENZEN): StandErgebnis {
  try {
    const ende = Date.now() + grenzen.zeitgrenzeMs
    const schritte = ablauf(wurzel, grenzen)
    let antwort: unknown
    for (;;) {
      const naechster = schritte.next(antwort)
      if (naechster.done) return naechster.value
      const anfrage = naechster.value
      if (anfrage.art === 'realpath') {
        try {
          antwort = realpathSync.native(anfrage.pfad)
        } catch {
          antwort = null
        }
      } else if (anfrage.art === 'groesse') {
        try {
          antwort = anfrage.pfade.reduce((summe, pfad) => summe + statSync(join(wurzel, pfad)).size, 0)
        } catch {
          antwort = null
        }
      } else {
        const rest = ende - Date.now()
        if (rest <= 0) return { stand: null, grund: `Zeitgrenze von ${grenzen.zeitgrenzeMs} ms überschritten` }
        try {
          const stdout = fuehreGitSync(anfrage.argumente, {
            cwd: wurzel,
            encoding: 'utf8',
            input: anfrage.eingabe ?? '',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: rest,
            maxBuffer: grenzen.maxAusgabe,
            windowsHide: true,
            env: { ...process.env, ...UMGEBUNG },
          })
          antwort = { ok: true, stdout }
        } catch (fehler) {
          const f = fehler as { code?: unknown; signal?: unknown; stderr?: unknown; message?: unknown }
          if (f.code === 'ENOBUFS') return { stand: null, grund: 'Git-Ausgabe zu groß' }
          if (f.code === 'ETIMEDOUT' || (f.signal !== null && f.signal !== undefined)) return { stand: null, grund: `Zeitgrenze von ${grenzen.zeitgrenzeMs} ms überschritten` }
          antwort = { ok: false, grund: ersteZeile(f.stderr, ersteZeile(f.message, 'git fehlgeschlagen')) }
        }
      }
    }
  } catch (fehler) {
    return { stand: null, grund: ersteZeile((fehler as Error)?.message, 'Berechnung fehlgeschlagen') }
  }
}

/**
 * Asynchrone Hülle (GET …/abnahme — der Event-Loop bleibt frei), gleiche Semantik wie die synchrone.
 * @param wurzel - Arbeitsordner des Laufs
 * @param grenzen - Kappen (Standard STANDARD_GRENZEN)
 * @returns Promise<StandErgebnis> — lehnt nie ab
 */
export async function leseGeprueftenStandAsync(wurzel: string, grenzen: StandGrenzen = STANDARD_GRENZEN): Promise<StandErgebnis> {
  try {
    const ende = Date.now() + grenzen.zeitgrenzeMs
    const schritte = ablauf(wurzel, grenzen)
    let antwort: unknown
    for (;;) {
      const naechster = schritte.next(antwort)
      if (naechster.done) return naechster.value
      const anfrage = naechster.value
      if (anfrage.art === 'realpath') {
        antwort = await realpath(anfrage.pfad).catch(() => null)
      } else if (anfrage.art === 'groesse') {
        const groessen = await Promise.all(anfrage.pfade.map((pfad) => stat(join(wurzel, pfad)).then((s) => s.size)))
          .then((liste) => liste.reduce((summe, groesse) => summe + groesse, 0))
          .catch(() => null)
        antwort = groessen
      } else {
        const rest = ende - Date.now()
        if (rest <= 0) return { stand: null, grund: `Zeitgrenze von ${grenzen.zeitgrenzeMs} ms überschritten` }
        const ergebnis = await fuehreGitAsync(anfrage.argumente, { cwd: wurzel, zeitgrenzeMs: rest, maxBuffer: grenzen.maxAusgabe, eingabe: anfrage.eingabe ?? '', umgebung: { ...UMGEBUNG } })
        if (ergebnis.abbruch === 'ausgabe_zu_gross') return { stand: null, grund: 'Git-Ausgabe zu groß' }
        if (ergebnis.abbruch === 'zeitgrenze') return { stand: null, grund: `Zeitgrenze von ${grenzen.zeitgrenzeMs} ms überschritten` }
        antwort = ergebnis.code === 0 ? { ok: true, stdout: ergebnis.stdout } : { ok: false, grund: ersteZeile(ergebnis.stderr, 'git fehlgeschlagen') }
      }
    }
  } catch (fehler) {
    return { stand: null, grund: ersteZeile((fehler as Error)?.message, 'Berechnung fehlgeschlagen') }
  }
}
