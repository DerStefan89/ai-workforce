/**
 * Datei: src/sammlung/quelle.ts
 *
 * Zweck: Pinnen und Holen einer fremden Quelle für den Prüflauf (F45 F-2b-2, F-1056) — ohne Ausführung von Code der Quelle
 * und ohne Installation in die Workforce (npm installiert seit F-2b-2b ohne Skripte in einen Temp-Ordner, siehe holeNpmInhalt):
 * - pinneNpm: `npm view <paket>@latest …` → exakte Version + Integrity (nur sha512, Advisor A7), Lizenz, Pflege-Daten;
 *   cwd ist ein leerer Temp-Ordner (keine .npmrc eines Projekts).
 * - holeGitInhalt: Temp-Repo mit der Härtung der Installation (gitHaertung, skill-installation.ts), flacher Fetch GENAU
 *   der angezeigten SHA, `ls-tree -r -l -z` über den Pfad (ohne Pfadargument beim ganzen Repo, A8), Auswahl und Grenzen
 *   VOR dem Checkout (nur reguläre Dateien ≤ 1 MB mit zulässigem Pfad; Symlink/Submodul/zu groß/abgelehnt → Fakt),
 *   Checkout NUR der ausgewählten Dateien (`--literal-pathspecs`, Pfadliste per Datei) — dieselbe Checkout-Mechanik wie
 *   die Installation, damit geprüft wird, was installiert würde. Danach Kopie in den Prüfordner mit Neutralisierung.
 * - holeNpmInhalt (F45 F-2b-2b, F-1075 Variante C „prüfen, was npm selbst schreibt“): `npm install` mit derselben Funktion
 *   wie die Installation (installiereNpmPaketInOrdner, src/ressourcen/installation.ts) in <wurzel>/install — Lockfile-version
 *   und -integrity = angezeigt, nur Registry-Abhängigkeiten, kein verschachteltes node_modules —, dann den Paketordner von der
 *   Platte lesen (lstat; Symlink/Junction → 422), Filter und Kopie mit Neutralisierung. Kein npm pack, kein Tar-Leser mehr.
 * Beide liefern den Prüfordner (`<wurzel>/inhalt`), mechanische Fakten und die geprüfte Dateiliste mit sha256 je Datei
 * (F-1075: die Installation vergleicht sie mit dem, was sie tatsächlich schreibt). Pfad-Zwillinge (Schreibweise, Unicode-Form)
 * und Datei/Ordner-Konflikte im GANZEN gepinnten git-Baum (alle ls-tree-Einträge, ohne Größengrenze) → 422 vor dem Checkout.
 *
 * Seit F45 F-3b-1 legt legeLokalenInhaltAb einen im Speicher vorliegenden Inhalt (gefilterte Plugin-Kopie) mit demselben
 * Schreiber in den Prüfordner.
 *
 * Wird aufgerufen von: scripts/leitstand/routen-pruefung.mjs, src/sammlung/quelle.test.ts, src/ressourcen/npm-echt.test.ts,
 * scripts/leitstand/routen-plugin-freigabe.mjs (Prüflauf eines Plugins, F45 F-3b-1).
 *
 * Wichtig: Runner (git, npm) sind injizierbar (Tests ohne Netz). Jeder Fehlschlag liefert { ok:false, status, grund };
 * aufräumen muss der Aufrufer (er besitzt die Wurzel). Kein Fehlschlag lässt einen halben Prüfordner als Erfolg stehen.
 */

import { createHash } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve, sep } from 'node:path'
import { installiereNpmPaketInOrdner, type NpmRunner, type ProzessErgebnis } from '../ressourcen/installation.ts'
import { type GitRunner, gitHaertung, rufeGit } from '../ressourcen/skill-installation.ts'
import { findeNamensKonflikt, GRENZEN, SHA512_INTEGRITY, type InhaltDatei, type InhaltFakten, istBinaer, neutralisierePfad, pfadSchluessel, pruefePfad, sammleFakten, type Uebersprungen } from './inhalt.ts'

/** Ablehnung mit HTTP-Status für den Aufrufer. */
export type QuellFehler = { ok: false; status: number; grund: string }

/** Exakte npm-Version (keine Range, kein Tag) — Zwilling von EXAKTE_VERSION in installation.ts. */
export const EXAKTE_VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

/** Nur sha512-SRI — definiert in inhalt.ts (reines Modul, auch für pruefbericht.ts), hier für bestehende Aufrufer. */
export { SHA512_INTEGRITY }

/** package.json-Name der Wurzel im Installationsordner des Prüflaufs (die Installation nimmt `aiw-cap-<id>`). */
export const NPM_PRUEF_WURZELNAME = 'aiw-cap-pruefung'

/** Ergebnis von pinneNpm. */
export type NpmPin = { ok: true; paket: string; version: string; integrity: string; lizenz: string | null; geaendert: string | null; pfleger: string[] } | QuellFehler

/**
 * Letzte Zeilen einer Prozessausgabe für den Grund.
 * @param e - Prozessergebnis
 * @returns gekürzter Text
 */
function kurz(e: ProzessErgebnis): string {
  const t = `${e.stderr}\n${e.stdout}`.trim().split(/\r?\n/).slice(-3).join(' | ')
  return t.length > 300 ? `${t.slice(0, 300)}…` : t
}

/**
 * Ruft npm auf und übersetzt Wurf, Zeitgrenze und Exit ≠ 0 in einen Grund (502).
 * @param npm - Runner
 * @param args - Argumente
 * @param cwd - Arbeitsordner (leer)
 * @param timeoutMs - Zeitgrenze
 * @returns stdout oder Fehler
 */
async function rufeNpm(npm: NpmRunner, args: string[], cwd: string, timeoutMs: number): Promise<{ ok: true; stdout: string } | QuellFehler> {
  let e: ProzessErgebnis
  try {
    e = await npm(args, { cwd, timeoutMs })
  } catch (fehler) {
    console.error(`[pruefung] npm ${args[0]} nicht ausführbar:`, fehler)
    return { ok: false, status: 502, grund: `npm ${args[0]} nicht ausführbar: ${(fehler as Error).message}` }
  }
  if (e.zeitueberschritten) return { ok: false, status: 502, grund: `npm ${args[0]}: Zeitgrenze (${timeoutMs} ms) überschritten` }
  if (e.code !== 0) return { ok: false, status: 502, grund: `npm ${args[0]} fehlgeschlagen (Exit ${e.code}): ${kurz(e)}` }
  return { ok: true, stdout: e.stdout }
}

/**
 * Pinnt ein npm-Paket nur lesend (Registry): neueste Version, Integrity (nur sha512), Lizenz, Änderungszeit, Pfleger.
 * @param paket - Paketname (ohne „npm:“)
 * @param npm - Runner
 * @param leerOrdner - leerer Ordner als cwd
 * @param timeoutMs - Zeitgrenze
 * @returns NpmPin
 */
export async function pinneNpm(paket: string, npm: NpmRunner, leerOrdner: string, timeoutMs: number): Promise<NpmPin> {
  const r = await rufeNpm(npm, ['view', `${paket}@latest`, 'version', 'dist.integrity', 'license', 'time.modified', 'maintainers', '--json'], leerOrdner, timeoutMs)
  if (!r.ok) return r
  let a: Record<string, unknown>
  try {
    a = JSON.parse(r.stdout) as Record<string, unknown>
  } catch {
    return { ok: false, status: 502, grund: `npm view ${paket}: Antwort ist kein JSON` }
  }
  const version = a.version
  const integrity = a['dist.integrity']
  if (typeof version !== 'string' || !EXAKTE_VERSION.test(version)) return { ok: false, status: 502, grund: `npm view ${paket}: keine exakte Version (${JSON.stringify(version)})` }
  if (typeof integrity !== 'string' || !SHA512_INTEGRITY.test(integrity)) return { ok: false, status: 422, grund: `npm view ${paket}: keine sha512-Integrity (${JSON.stringify(integrity)}) — nicht pinnbar` }
  const pfleger = Array.isArray(a.maintainers) ? a.maintainers.filter((m): m is string => typeof m === 'string').map((m) => m.replace(/\s*<[^>]*>/, '')) : []
  return { ok: true, paket, version, integrity, lizenz: typeof a.license === 'string' ? a.license : null, geaendert: typeof a['time.modified'] === 'string' ? a['time.modified'] : null, pfleger }
}

/** Eine geprüfte Datei: Pfad wie in der Quelle (relativ zum Paket bzw. zum gepinnten Pfad) und sha256 der Bytes (F-1075). */
export interface GepruefteDatei {
  pfad: string
  sha256: string
}

/** Ergebnis beider Holer. */
export type GeholterInhalt = { ok: true; inhaltOrdner: string; fakten: InhaltFakten; commitZeit: string | null; dateien: GepruefteDatei[] } | QuellFehler

/**
 * Dateiliste mit sha256 (sortiert nach Pfad).
 * @param dateien - geschriebene Dateien
 * @returns geprüfte Dateien
 */
function dateiListe(dateien: readonly InhaltDatei[]): GepruefteDatei[] {
  return dateien.map((d) => ({ pfad: d.pfad, sha256: createHash('sha256').update(d.bytes).digest('hex') })).sort((a, b) => (a.pfad < b.pfad ? -1 : a.pfad > b.pfad ? 1 : 0))
}

/**
 * Schreibt die ausgewählten Dateien neutralisiert in den Prüfordner. Zwillinge (auch durch die Neutralisierung, z. B. `.claude/x`
 * neben `_.claude/x`) und Datei/Ordner-Konflikte → 422.
 * @param inhaltOrdner - Ziel (wird angelegt)
 * @param dateien - Dateien mit Pfad wie in der Quelle
 * @param uebersprungen - Sammelliste (wird ergänzt)
 * @returns Umbenennungen und tatsächlich geschriebene Dateien
 */
function schreibeInhalt(inhaltOrdner: string, dateien: readonly InhaltDatei[], uebersprungen: Uebersprungen[]): { umbenannt: Array<{ von: string; nach: string }>; geschrieben: InhaltDatei[] } | QuellFehler {
  // Code-Review F-2b-2a (1): gleiche Pfade in anderer Schreibweise oder Datei/Ordner-Konflikte sind fail-closed — beim Installieren
  // gewänne ein anderer Eintrag als der geprüfte.
  const konflikt = findeNamensKonflikt(dateien.map((d) => neutralisierePfad(d.pfad).pfad))
  if (konflikt !== null) return { ok: false, status: 422, grund: `Prüfordner: ${konflikt} — abgebrochen` }
  mkdirSync(inhaltOrdner, { recursive: true })
  const wurzel = resolve(inhaltOrdner)
  const belegt = new Set<string>()
  const umbenannt: Array<{ von: string; nach: string }> = []
  const geschrieben: InhaltDatei[] = []
  for (const d of dateien) {
    const neu = neutralisierePfad(d.pfad)
    const schluessel = pfadSchluessel(neu.pfad)
    if (belegt.has(schluessel)) return { ok: false, status: 422, grund: `'${d.pfad}' kollidiert im Prüfordner mit einem anderen Pfad — abgebrochen` }
    const ziel = resolve(wurzel, ...neu.pfad.split('/'))
    // Tiefenverteidigung: pruefePfad hat ausbrechende Pfade schon abgelehnt.
    if (!ziel.startsWith(wurzel + sep)) {
      uebersprungen.push({ pfad: d.pfad, grund: 'pfad_abgelehnt', detail: 'außerhalb des Prüfordners' })
      continue
    }
    belegt.add(schluessel)
    mkdirSync(dirname(ziel), { recursive: true })
    writeFileSync(ziel, d.bytes, { flag: 'wx' })
    if (neu.umbenannt) umbenannt.push({ von: d.pfad, nach: neu.pfad })
    geschrieben.push(d)
  }
  return { umbenannt, geschrieben }
}

/**
 * Prüft die Grenzen der Auswahl (Anzahl, Bytes).
 * @param anzahl - ausgewählte Dateien
 * @param bytes - ausgewählte Bytes
 * @returns null oder Fehler 422
 */
function pruefeGrenzen(anzahl: number, bytes: number): QuellFehler | null {
  const hinweis = ' — bei einem Repo einen Ordner wählen (Pfad im Repo); ein npm-Paket dieser Größe ist nicht prüfbar'
  if (anzahl > GRENZEN.maxDateien) return { ok: false, status: 422, grund: `Quelle zu groß für die Prüfung: ${anzahl} Dateien (höchstens ${GRENZEN.maxDateien})${hinweis}` }
  if (bytes > GRENZEN.maxBytes) return { ok: false, status: 422, grund: `Quelle zu groß für die Prüfung: ${bytes} Bytes (höchstens ${GRENZEN.maxBytes})${hinweis}` }
  if (anzahl === 0) return { ok: false, status: 422, grund: 'Quelle enthält keine prüfbare Datei' }
  return null
}

/**
 * Holt genau die SHA und nur die ausgewählten Dateien unter pfad in den Prüfordner (Details im Dateikopf).
 * @param quelle - { repoUrl, sha, pfad ('' = ganzes Repo) }
 * @param git - Runner
 * @param wurzel - Temp-Wurzel des Prüflaufs (Unterordner repo/, inhalt/ werden angelegt)
 * @param timeoutMs - Zeitgrenze je git-Aufruf
 * @returns Prüfordner + Fakten oder Fehler (502 Netz/git, 422 Pfad/Grenzen)
 */
export async function holeGitInhalt(quelle: { repoUrl: string; sha: string; pfad: string }, git: GitRunner, wurzel: string, timeoutMs: number): Promise<GeholterInhalt> {
  const repo = join(wurzel, 'repo')
  const { konfig, env, leereHooks } = gitHaertung(wurzel)
  const lauf = (args: string[], status = 502) => rufeGit(git, [...konfig, ...args], { cwd: wurzel, timeoutMs, env }, status)
  const init = await lauf(['init', '--quiet', `--template=${leereHooks}`, repo])
  if (!init.ok) return init
  const fetch = await lauf(['-C', repo, 'fetch', '--quiet', '--depth', '1', '--no-tags', '--no-recurse-submodules', quelle.repoUrl, quelle.sha])
  if (!fetch.ok) return { ...fetch, grund: `Fetch der Commit-SHA ${quelle.sha} gescheitert: ${fetch.grund}` }
  const baum = await lauf(['-C', repo, 'ls-tree', '-r', '-l', '-z', '--full-tree', quelle.sha, ...(quelle.pfad === '' ? [] : ['--', quelle.pfad])])
  if (!baum.ok) return baum
  const praefix = quelle.pfad === '' ? '' : `${quelle.pfad}/`
  // F-1075: Pfad-Zwillinge und Datei/Ordner-Konflikte im GANZEN gepinnten Baum — alle Einträge, jede Größe, jeder Modus.
  const alleEintraege = baum.stdout.split('\0').filter((z) => z.length > 0)
  const alleRelativ = alleEintraege.map((e) => {
    const voll = e.slice(e.indexOf('\t') + 1)
    return voll.startsWith(praefix) ? voll.slice(praefix.length) : voll
  })
  const zwilling = findeNamensKonflikt(alleRelativ)
  if (zwilling !== null) return { ok: false, status: 422, grund: `gepinnter Baum: ${zwilling} — beim Auschecken gewänne ein anderer Eintrag als der geprüfte; abgebrochen` }
  const uebersprungen: Uebersprungen[] = []
  const auswahl: Array<{ voll: string; relativ: string }> = []
  let bytes = 0
  for (const eintrag of alleEintraege) {
    const tab = eintrag.indexOf('\t')
    const [modus, , , groesseText] = eintrag.slice(0, tab).split(/\s+/)
    const voll = eintrag.slice(tab + 1)
    const relativ = voll.startsWith(praefix) ? voll.slice(praefix.length) : voll
    if (modus === '120000') uebersprungen.push({ pfad: relativ, grund: 'symlink' })
    else if (modus === '160000') uebersprungen.push({ pfad: relativ, grund: 'submodul' })
    else if (modus !== '100644' && modus !== '100755') uebersprungen.push({ pfad: relativ, grund: 'eintragstyp', detail: `Modus ${modus}` })
    else {
      const pfadGrund = pruefePfad(relativ)
      const groesse = Number(groesseText)
      if (pfadGrund !== null) uebersprungen.push({ pfad: relativ, grund: 'pfad_abgelehnt', detail: pfadGrund })
      else if (!Number.isSafeInteger(groesse) || groesse > GRENZEN.maxDateiBytes) uebersprungen.push({ pfad: relativ, grund: 'zu_gross', detail: `${groesseText} Bytes` })
      else {
        auswahl.push({ voll, relativ })
        bytes += groesse
      }
    }
  }
  if (auswahl.length === 0 && uebersprungen.length === 0) return { ok: false, status: 422, grund: `Pfad '${quelle.pfad}' existiert im Commit ${quelle.sha} nicht` }
  const grenze = pruefeGrenzen(auswahl.length, bytes)
  if (grenze !== null) return grenze
  // Nur die ausgewählten Pfade auschecken: Pfadliste per Datei (NUL-getrennt), wörtlich (keine Wildcards aus Dateinamen).
  const liste = join(wurzel, 'pfade.lst')
  writeFileSync(liste, `${auswahl.map((a) => a.voll).join('\0')}\0`)
  const checkout = await lauf(['--literal-pathspecs', '-C', repo, 'checkout', '--quiet', quelle.sha, `--pathspec-from-file=${liste}`, '--pathspec-file-nul'])
  if (!checkout.ok) return checkout
  const dateien: InhaltDatei[] = []
  for (const a of auswahl) {
    const pfad = join(repo, ...a.voll.split('/'))
    const st = lstatSync(pfad, { throwIfNoEntry: false })
    if (st === undefined || !st.isFile()) {
      uebersprungen.push({ pfad: a.relativ, grund: 'eintragstyp', detail: 'nach dem Checkout keine reguläre Datei' })
      continue
    }
    const inhalt = readFileSync(pfad)
    if (istBinaer(inhalt)) uebersprungen.push({ pfad: a.relativ, grund: 'binaer' })
    else dateien.push({ pfad: a.relativ, bytes: inhalt })
  }
  const geschriebenErgebnis = schreibeInhalt(join(wurzel, 'inhalt'), dateien, uebersprungen)
  if ('ok' in geschriebenErgebnis) return geschriebenErgebnis
  const { umbenannt, geschrieben } = geschriebenErgebnis
  if (geschrieben.length === 0) return { ok: false, status: 422, grund: 'Quelle enthält nach dem Filtern (Binärdateien) keine prüfbare Datei' }
  const commit = await lauf(['-C', repo, 'cat-file', '-p', quelle.sha])
  const zeit = commit.ok ? /^committer .* (\d+) ([+-]\d{4})$/m.exec(commit.stdout) : null
  return { ok: true, inhaltOrdner: join(wurzel, 'inhalt'), fakten: sammleFakten(geschrieben, uebersprungen, umbenannt), commitZeit: zeit === null ? null : new Date(Number(zeit[1]) * 1000).toISOString(), dateien: dateiListe(geschrieben) }
}

/**
 * Liest den Paketordner, den npm geschrieben hat (F-1075 Variante C), rekursiv mit lstat: ein Symlink, eine Junction oder
 * ein sonstiger Nicht-Datei-/Nicht-Ordner-Eintrag → 422 (npm verwirft Symlinks selbst; ein solcher Eintrag heißt, der Ordner
 * ist nicht der von npm geschriebene). Dateien gehen durch dieselben Filter wie beim git-Holen: pruefePfad → pfad_abgelehnt,
 * zu groß → zu_gross (ohne Lesen), binär → binaer. Besuchte Einträge, ausgewählte Dateien und Bytes sind gedeckelt (Advisor F7).
 * @param paketOrdner - node_modules/<paket>
 * @returns Dateien (Pfad relativ, „/“) und Übersprungene oder Fehler
 */
function lesePaketordner(paketOrdner: string): { dateien: InhaltDatei[]; uebersprungen: Uebersprungen[] } | QuellFehler {
  const dateien: InhaltDatei[] = []
  const uebersprungen: Uebersprungen[] = []
  let eintraege = 0
  let bytes = 0
  const stapel: Array<{ absolut: string; relativ: string }> = [{ absolut: paketOrdner, relativ: '' }]
  while (stapel.length > 0) {
    const { absolut, relativ } = stapel.pop() as { absolut: string; relativ: string }
    for (const name of readdirSync(absolut).sort()) {
      eintraege++
      if (eintraege > GRENZEN.maxEintraege) return { ok: false, status: 422, grund: `Quelle zu groß für die Prüfung: mehr als ${GRENZEN.maxEintraege} Einträge im Paketordner` }
      const pfad = join(absolut, name)
      const rel = relativ === '' ? name : `${relativ}/${name}`
      const st = lstatSync(pfad)
      if (st.isSymbolicLink() || (!st.isDirectory() && !st.isFile())) return { ok: false, status: 422, grund: `'${rel}' im Paketordner ist ${st.isSymbolicLink() ? 'ein Symlink bzw. eine Junction' : 'keine reguläre Datei'} — npm schreibt so etwas nicht; abgebrochen, nichts geprüft` }
      if (st.isDirectory()) {
        stapel.push({ absolut: pfad, relativ: rel })
        continue
      }
      const pfadGrund = pruefePfad(rel)
      if (pfadGrund !== null) uebersprungen.push({ pfad: rel, grund: 'pfad_abgelehnt', detail: pfadGrund })
      else if (st.size > GRENZEN.maxDateiBytes) uebersprungen.push({ pfad: rel, grund: 'zu_gross', detail: `${st.size} Bytes` })
      else {
        const inhalt = readFileSync(pfad)
        if (istBinaer(inhalt)) uebersprungen.push({ pfad: rel, grund: 'binaer' })
        else {
          dateien.push({ pfad: rel, bytes: inhalt })
          bytes += inhalt.length
          const grenze = dateien.length > GRENZEN.maxDateien || bytes > GRENZEN.maxBytes ? pruefeGrenzen(dateien.length, bytes) : null
          if (grenze !== null) return grenze
        }
      }
    }
  }
  return { dateien, uebersprungen }
}

/**
 * Installiert genau version des Pakets mit derselben Funktion wie „Freigeben & installieren“ (installiereNpmPaketInOrdner:
 * gleiche npm-Argumente, ohne Skripte, Lockfile = angezeigt, kein verschachteltes node_modules) in <wurzel>/install, liest den
 * Paketordner von der Platte und legt ihn neutralisiert in den Prüfordner (F-1075 Variante C: geprüft wird, was npm schreibt).
 * <wurzel>/install wird danach entfernt (Advisor F6); den Rest räumt der Aufrufer.
 * @param quelle - { paket, version, integrity } wie angezeigt
 * @param npm - Runner
 * @param wurzel - Temp-Wurzel des Prüflaufs
 * @param timeoutMs - Zeitgrenze des npm install
 * @returns Prüfordner + Fakten oder Fehler
 */
export async function holeNpmInhalt(quelle: { paket: string; version: string; integrity: string }, npm: NpmRunner, wurzel: string, timeoutMs: number): Promise<GeholterInhalt> {
  if (!SHA512_INTEGRITY.test(quelle.integrity)) return { ok: false, status: 422, grund: 'angezeigte Integrity ist keine sha512-SRI' }
  const install = join(wurzel, 'install')
  mkdirSync(install, { recursive: true })
  try {
    const npmInstallation = await installiereNpmPaketInOrdner({ ...quelle, ordner: install, wurzelName: NPM_PRUEF_WURZELNAME, npm, timeoutMs })
    if (!npmInstallation.ok) return npmInstallation
    const gelesen = lesePaketordner(npmInstallation.paketOrdner)
    if ('ok' in gelesen) return gelesen
    const grenze = pruefeGrenzen(
      gelesen.dateien.length,
      gelesen.dateien.reduce((s, d) => s + d.bytes.length, 0)
    )
    if (grenze !== null) return grenze
    const uebersprungen = [...gelesen.uebersprungen]
    const geschriebenErgebnis = schreibeInhalt(join(wurzel, 'inhalt'), gelesen.dateien, uebersprungen)
    if ('ok' in geschriebenErgebnis) return geschriebenErgebnis
    const { umbenannt, geschrieben } = geschriebenErgebnis
    if (geschrieben.length === 0) return { ok: false, status: 422, grund: 'Quelle enthält nach dem Filtern (Binärdateien) keine prüfbare Datei' }
    return { ok: true, inhaltOrdner: join(wurzel, 'inhalt'), fakten: sammleFakten(geschrieben, uebersprungen, umbenannt), commitZeit: null, dateien: dateiListe(geschrieben) }
  } finally {
    try {
      rmSync(install, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
    } catch (fehler) {
      // Der Aufrufer räumt die ganze Wurzel ohnehin; liegen lassen ist besser als den Prüflauf daran scheitern zu lassen.
      console.error(`[pruefung] Installationsordner '${install}' nicht entfernbar:`, fehler)
    }
  }
}

/**
 * F45 F-3b-1: legt einen schon im Speicher vorliegenden Inhalt (gefilterte Plugin-Kopie, src/plugin-kopie) neutralisiert in
 * den Prüfordner `<wurzel>/inhalt` — derselbe Schreiber und dieselben Grenzen wie bei git/npm (Advisor F4b: `.claude-plugin`
 * → `_.claude-plugin`, Zwillinge 422). Die Dateiliste trägt die Pfade des Inhalts (vor der Neutralisierung), damit später
 * vergleicheInhalt die geschriebene Kopie gegen den Bericht prüfen kann. Synchron, kein Netz.
 * @param dateien - Inhalt mit Pfad wie in der Kopie
 * @param wurzel - Temp-Wurzel des Prüflaufs (der Aufrufer räumt sie)
 * @returns Prüfordner + Fakten oder Fehler
 */
export function legeLokalenInhaltAb(dateien: readonly InhaltDatei[], wurzel: string): GeholterInhalt {
  const grenze = pruefeGrenzen(
    dateien.length,
    dateien.reduce((s, d) => s + d.bytes.length, 0)
  )
  if (grenze !== null) return grenze
  const uebersprungen: Uebersprungen[] = []
  const geschriebenErgebnis = schreibeInhalt(join(wurzel, 'inhalt'), dateien, uebersprungen)
  if ('ok' in geschriebenErgebnis) return geschriebenErgebnis
  const { umbenannt, geschrieben } = geschriebenErgebnis
  if (uebersprungen.length > 0) return { ok: false, status: 422, grund: `Prüfordner: ${uebersprungen.length} Datei(en) nicht ablegbar — abgebrochen` }
  return { ok: true, inhaltOrdner: join(wurzel, 'inhalt'), fakten: sammleFakten(geschrieben, uebersprungen, umbenannt), commitZeit: null, dateien: dateiListe(geschrieben) }
}

/**
 * true, wenn der Prüfordner existiert und Dateien trägt (Tests, Nachweis).
 * @param ordner - Prüfordner
 * @returns vorhanden
 */
export function hatInhalt(ordner: string): boolean {
  return existsSync(ordner) && readdirSync(ordner).length > 0
}
