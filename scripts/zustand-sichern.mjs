#!/usr/bin/env node
/**
 * Datei: scripts/zustand-sichern.mjs
 *
 * Zweck: Bereitet die Sicherung von `kontrollzustand/` vor (F-733, Option A,
 * Entscheidung Stefan 25.09.2026). `kontrollzustand/` ist laut .gitignore
 * getrackt, wurde aber nie committet — bei einem Neu-Klon oder Reset ginge
 * der Zustand verloren. Dieses Skript legt einen Branch `zustand/<JJJJ-MM-TT>`
 * an, stagt AUSSCHLIESSLICH `kontrollzustand/` und gibt die nächsten Befehle
 * für Stefan aus.
 *
 * Fail-closed, jeder Abbruch mit Meldung und Exit ≠ 0, in dieser Reihenfolge:
 * (a) `kontrollzustand/.leitstand.lock` existiert (Leitstand läuft → keine
 *     konsistente Momentaufnahme),
 * (b) aktueller Branch ist nicht `main`; zusätzlich: main liegt hinter dem
 *     lokal bekannten origin/main (sonst weist .githooks/pre-push später ab),
 * (c) außerhalb von `kontrollzustand/` gibt es geänderte, ungetrackte oder
 *     gestagte Dateien — ausgenommen .gitignore-Ignoriertes (taucht in
 *     `git status` gar nicht auf) und die ungestagten Altlasten aus
 *     ALTLASTEN (werden gemeldet, nie gestagt),
 * (d) `kontrollzustand/` hat keine Änderungen.
 * Scheitert nach der Branch-Anlage etwas (Staging außerhalb, Mengenabgleich
 * mit fehlenden Dateien, Git-Fehler), rollt das Skript zurück: Index leeren,
 * zurück auf main, Branch löschen.
 *
 * Wird aufgerufen von: `npm run zustand:sichern` (Stefan, von Hand);
 * scripts/check-zustand-sichern.mjs startet es als Kindprozess gegen
 * Wegwerf-Repos, scripts/zustand-sichern.test.mjs prüft die reinen Teile.
 *
 * Wichtig: Es committet nie, pusht nie und schreibt die Freigabedatei nie —
 * Commit-Hook und zweiter Schlüssel bleiben unumgangen. Die ausgegebenen
 * Befehle enthalten keine Freigabe-Zeilen (F-736, siehe FREIGABE_HINWEIS). Alle Git-Aufrufe
 * laufen über execFileSync mit argv (keine Shell) und explizitem
 * cwd = Repo-Wurzel.
 *
 * Aufruf: npm run zustand:sichern
 * Exit 0 = gestagt, Exit 1 = Abbruch
 */

import { execFileSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ZUSTAND_ORDNER = 'kontrollzustand'
export const LOCK_DATEI = 'kontrollzustand/.leitstand.lock'
export const BRANCH_PRAEFIX = 'zustand/'

/** Grenze, ab der GitHub eine einzelne Datei beim Push abweist. */
export const GITHUB_DATEI_GRENZE = 100 * 1024 * 1024

/**
 * Bekannte Altlasten außerhalb von kontrollzustand/, die (c) nicht auslösen.
 * `praefix` trifft jeden Pfad, der damit beginnt; `exakt` nur genau diesen.
 */
export const ALTLASTEN = [{ praefix: 'state/nachweis-runde2-' }, { exakt: 'stdin-check.js' }]

/** true, wenn der repo-relative Pfad (mit `/`) in kontrollzustand/ liegt. */
export function istZustandPfad(pfad) {
  return pfad === ZUSTAND_ORDNER || pfad.startsWith(`${ZUSTAND_ORDNER}/`)
}

/** true, wenn der Pfad eine bekannte Altlast aus ALTLASTEN ist. */
export function istAltlast(pfad) {
  return ALTLASTEN.some((a) => (a.exakt !== undefined ? pfad === a.exakt : pfad.startsWith(a.praefix)))
}

/**
 * Parst `git status --porcelain=v1 -z` in [{ status, pfad }]. Bei
 * Umbenennung/Kopie (R/C) folgt der Ursprungspfad als eigenes Token — er
 * wird ebenfalls als Eintrag geführt, damit ein Verschieben aus
 * kontrollzustand/ heraus nicht unbemerkt bleibt.
 *
 * @param {string} ausgabe
 * @returns {{ status: string, pfad: string }[]}
 */
export function parsePorcelain(ausgabe) {
  const tokens = ausgabe.split('\0').filter((t) => t.length > 0)
  const eintraege = []
  for (let i = 0; i < tokens.length; i++) {
    const status = tokens[i].slice(0, 2)
    eintraege.push({ status, pfad: tokens[i].slice(3) })
    if (status.includes('R') || status.includes('C')) {
      i++
      if (tokens[i] !== undefined) eintraege.push({ status, pfad: tokens[i] })
    }
  }
  return eintraege
}

/**
 * Teilt Status-Einträge in kontrollzustand/, bekannte Altlasten und Fremdes.
 * Eine bereits GESTAGTE Altlast zählt als fremd — sie würde sonst im Commit
 * landen.
 *
 * @param {{ status: string, pfad: string }[]} eintraege
 * @returns {{ zustand: string[], altlasten: string[], fremd: string[] }}
 */
export function teileAenderungen(eintraege) {
  const zustand = []
  const altlasten = []
  const fremd = []
  for (const e of eintraege) {
    const ungestagt = e.status[0] === ' ' || e.status[0] === '?'
    if (istZustandPfad(e.pfad)) zustand.push(e.pfad)
    else if (istAltlast(e.pfad) && ungestagt) altlasten.push(e.pfad)
    else fremd.push(e.pfad)
  }
  return { zustand, altlasten, fremd }
}

/** Lokales Datum als JJJJ-MM-TT. */
export function formatiereDatum(datum) {
  const zwei = (n) => String(n).padStart(2, '0')
  return `${datum.getFullYear()}-${zwei(datum.getMonth() + 1)}-${zwei(datum.getDate())}`
}

/**
 * Erster freier Branchname: `zustand/<datum>`, bei Kollision `-2`, `-3` …
 *
 * @param {string} datumText JJJJ-MM-TT
 * @param {Set<string>} vorhandene Kurznamen lokaler und entfernter Branches (ohne Remote-Präfix)
 * @returns {string}
 */
export function waehleBranchName(datumText, vorhandene) {
  const basis = `${BRANCH_PRAEFIX}${datumText}`
  if (!vorhandene.has(basis)) return basis
  for (let n = 2; ; n++) {
    const kandidat = `${basis}-${n}`
    if (!vorhandene.has(kandidat)) return kandidat
  }
}

/**
 * Kurznamen aus `for-each-ref --format=%(refname)`-Zeilen: `refs/heads/x` → `x`,
 * `refs/remotes/<remote>/x` → `x`. Für die Kollisionsprüfung zählen lokale und
 * entfernte Branches gleich.
 *
 * @param {string} ausgabe
 * @returns {Set<string>}
 */
export function kurznamenAusRefs(ausgabe) {
  return new Set(
    ausgabe
      .split('\n')
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
      .map((r) => r.replace(/^refs\/heads\//, '').replace(/^refs\/remotes\/[^/]+\//, ''))
  )
}

/**
 * Pfade aus `erwartet`, die in `gestagt` fehlen — Mengenabgleich nach
 * `git add` gegen die OneDrive-Falle (CLAUDE.md „Bekannte Fallen").
 *
 * @param {string[]} erwartet
 * @param {string[]} gestagt
 * @returns {string[]}
 */
export function fehlendeGestagte(erwartet, gestagt) {
  const menge = new Set(gestagt)
  return erwartet.filter((p) => !menge.has(p))
}

/** Menschlich lesbare Größe (B/KB/MB). */
export function formatiereGroesse(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Hinweis zur Freigabedatei (F-736): commit-guard.cjs ist ein PreToolUse-Hook
 * auf Claudes Bash und prüft nur Claude-Befehle. Stefan committet hier von
 * Hand — eine dort geschriebene Freigabedatei bliebe unverbraucht als
 * gültiger Schlüssel liegen. Deshalb keine Set-Content-Zeilen in den Befehlen.
 */
export const FREIGABE_HINWEIS =
  '# Freigabedatei state/freigabe-commit.md nur nötig, wenn Claude Code committet/pusht (je einmal vor Commit und vor Push).'

/**
 * Die Befehle, die Stefan nach dem Staging selbst ausführt (PowerShell).
 * Zeilen mit `#` sind Hinweise, keine Befehle.
 *
 * @param {string} repoWurzel
 * @param {string} branch
 * @param {string} datumText
 * @returns {string[]}
 */
export function naechsteBefehle(repoWurzel, branch, datumText) {
  const nachricht = `chore(zustand): Kontrollzustand sichern ${datumText}`
  return [
    FREIGABE_HINWEIS,
    `cd "${repoWurzel}"`,
    `git commit -m "${nachricht}"`,
    `git push -u origin ${branch}`,
    `gh pr create --base main --head ${branch} --title "${nachricht}" --body "Sicherung kontrollzustand/ (F-733)."`,
    '# PR in der Weboberfläche mergen, danach:',
    'git checkout main; git pull',
  ]
}

/** Git-Aufruf ohne Shell, mit explizitem cwd. */
function git(repoWurzel, argumente) {
  return execFileSync('git', argumente, { cwd: repoWurzel, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

/** Abbruch-Ergebnis. */
function abbruch(grund, meldung, extra = {}) {
  return { ok: false, grund, meldung, ...extra }
}

/** Fehlertext eines gefangenen Werts. */
function fehlerText(fehler) {
  return fehler instanceof Error ? fehler.message : String(fehler)
}

/**
 * Rollt nach einem Abbruch NACH der Branch-Anlage zurück: Index leeren
 * (Arbeitsdateien bleiben unberührt), zurück auf main, Branch löschen.
 *
 * @returns {string} Zusatz für die Abbruchmeldung — bei gescheitertem
 *   Rückweg die Befehle zum Nachholen von Hand.
 */
function rolleZurueck(repoWurzel, branch) {
  try {
    git(repoWurzel, ['reset', '--quiet'])
    git(repoWurzel, ['switch', '--quiet', 'main'])
    git(repoWurzel, ['branch', '--quiet', '-D', branch])
    return `\nZurückgerollt: Index geleert, zurück auf main, Branch ${branch} gelöscht.`
  } catch (fehler) {
    return `\nZurückrollen gescheitert (${fehlerText(fehler)}). Von Hand: git reset; git switch main; git branch -D ${branch}`
  }
}

/**
 * Führt die Prüfungen (a)–(d) aus, legt den Branch an und stagt kontrollzustand/.
 * Wirft nicht: ein unerwarteter Fehler wird als grund 'fehler' gemeldet;
 * geschah er nach der Branch-Anlage, wird zurückgerollt.
 *
 * @param {{ repoWurzel: string, datum?: Date }} optionen
 * @returns {{ ok: true, branch: string, anzahl: number, geloescht: number, bytes: number,
 *   grosse: string[], altlasten: string[], befehle: string[] }
 *   | { ok: false, grund: 'lock'|'branch'|'veraltet'|'fremd'|'leer'|'staging'|'fehler', meldung: string }}
 */
export function sichereZustand({ repoWurzel, datum = new Date() }) {
  let branch
  try {
    if (existsSync(join(repoWurzel, LOCK_DATEI))) {
      return abbruch(
        'lock',
        `${LOCK_DATEI} existiert — der Leitstand läuft vermutlich. Leitstand beenden, dann erneut. Läuft sicher keiner (Absturz), den Lock von Hand löschen.`
      )
    }

    const aktuell = git(repoWurzel, ['rev-parse', '--abbrev-ref', 'HEAD']).trim()
    if (aktuell !== 'main') {
      return abbruch('branch', `Aktueller Branch ist '${aktuell}', nicht 'main'. Erst 'git checkout main; git pull'.`)
    }

    const hatOriginMain = git(repoWurzel, ['for-each-ref', '--format=%(refname)', 'refs/remotes/origin/main']).trim().length > 0
    if (hatOriginMain) {
      const rueckstand = Number(git(repoWurzel, ['rev-list', '--count', 'HEAD..origin/main']).trim())
      if (rueckstand > 0) {
        return abbruch('veraltet', `main liegt ${rueckstand} Commit(s) hinter origin/main. Erst 'git pull'.`)
      }
    }

    const status = git(repoWurzel, ['status', '--porcelain=v1', '-z', '--untracked-files=all'])
    const { zustand, altlasten, fremd } = teileAenderungen(parsePorcelain(status))
    if (fremd.length > 0) {
      return abbruch(
        'fremd',
        `Außerhalb von ${ZUSTAND_ORDNER}/ gibt es ${fremd.length} geänderte/ungetrackte/gestagte Datei(en) — erst committen oder verwerfen:\n${fremd.map((p) => `  - ${p}`).join('\n')}`,
        { fremd, altlasten }
      )
    }
    if (zustand.length === 0) {
      return abbruch('leer', `Nichts zu sichern — ${ZUSTAND_ORDNER}/ hat keine Änderungen.`, { altlasten })
    }

    const datumText = formatiereDatum(datum)
    const vorhandene = kurznamenAusRefs(git(repoWurzel, ['for-each-ref', '--format=%(refname)', 'refs/heads/zustand/', 'refs/remotes/']))
    const zielBranch = waehleBranchName(datumText, vorhandene)

    git(repoWurzel, ['switch', '--quiet', '-c', zielBranch])
    branch = zielBranch
    git(repoWurzel, ['add', '--', `${ZUSTAND_ORDNER}/`])

    const gestagt = git(repoWurzel, ['diff', '--cached', '--no-renames', '--name-only', '-z'])
      .split('\0')
      .filter((p) => p.length > 0)
    const ausserhalb = gestagt.filter((p) => !istZustandPfad(p))
    if (ausserhalb.length > 0) {
      const meldung = `Gestagt außerhalb von ${ZUSTAND_ORDNER}/ (darf nicht sein):\n${ausserhalb.map((p) => `  - ${p}`).join('\n')}`
      return abbruch('staging', meldung + rolleZurueck(repoWurzel, branch))
    }
    const fehlend = fehlendeGestagte(zustand, gestagt)
    if (fehlend.length > 0) {
      const meldung = `${fehlend.length} Änderung(en) in ${ZUSTAND_ORDNER}/ wurden nicht gestagt (OneDrive?):\n${fehlend.map((p) => `  - ${p}`).join('\n')}`
      return abbruch('staging', meldung + rolleZurueck(repoWurzel, branch))
    }

    let bytes = 0
    let geloescht = 0
    const grosse = []
    for (const p of gestagt) {
      const voll = join(repoWurzel, p)
      if (!existsSync(voll)) {
        geloescht++
        continue
      }
      const groesse = statSync(voll).size
      bytes += groesse
      if (groesse >= GITHUB_DATEI_GRENZE) grosse.push(`${p} (${formatiereGroesse(groesse)})`)
    }

    return {
      ok: true,
      branch,
      anzahl: gestagt.length,
      geloescht,
      bytes,
      grosse,
      altlasten,
      befehle: naechsteBefehle(repoWurzel, branch, datumText),
    }
  } catch (fehler) {
    const zusatz = branch !== undefined ? rolleZurueck(repoWurzel, branch) : ''
    return abbruch('fehler', `Unerwarteter Fehler: ${fehlerText(fehler)}${zusatz}`)
  }
}

/**
 * true, wenn das Modul direkt gestartet wurde. Unter Windows ohne Beachtung
 * der Groß-/Kleinschreibung, weil der Laufwerksbuchstabe je nach Aufrufer
 * (`c:\` aus VS Code, `C:\` aus der Shell) abweichen kann.
 */
function istDirekterAufruf() {
  if (process.argv[1] === undefined) return false
  const aufgerufen = resolve(process.argv[1])
  const modul = fileURLToPath(import.meta.url)
  return process.platform === 'win32' ? aufgerufen.toLowerCase() === modul.toLowerCase() : aufgerufen === modul
}

// Nur beim direkten Aufruf melden und beenden — ein Import aus Test/Gate darf
// das nicht mitausführen. Muster: scripts/aufraeumen-nachlauf.mjs.
if (istDirekterAufruf()) {
  let ergebnis
  try {
    const repoWurzel = git(process.cwd(), ['rev-parse', '--show-toplevel']).trim()
    ergebnis = sichereZustand({ repoWurzel })
  } catch (fehler) {
    ergebnis = abbruch('fehler', `Kein Git-Repo erkannt: ${fehlerText(fehler)}`)
  }

  if (ergebnis.altlasten !== undefined && ergebnis.altlasten.length > 0) {
    console.log(`Hinweis: ${ergebnis.altlasten.length} bekannte Altlast(en) — nicht gestagt:\n${ergebnis.altlasten.map((p) => `  - ${p}`).join('\n')}\n`)
  }

  if (!ergebnis.ok) {
    console.error(`zustand:sichern ABGEBROCHEN (${ergebnis.grund}): ${ergebnis.meldung}`)
    process.exit(1)
  }

  const davonGeloescht = ergebnis.geloescht > 0 ? `, davon ${ergebnis.geloescht} Löschung(en)` : ''
  console.log(
    `Branch ${ergebnis.branch} angelegt, ${ergebnis.anzahl} Datei(en) gestagt${davonGeloescht} (${formatiereGroesse(ergebnis.bytes)}), nur ${ZUSTAND_ORDNER}/.`
  )
  if (ergebnis.grosse.length > 0) {
    console.log(`WARNUNG: Datei(en) ab 100 MB — GitHub weist den Push ab:\n${ergebnis.grosse.map((p) => `  - ${p}`).join('\n')}`)
  }
  console.log('Kein Commit, kein Push. Nächste Schritte (PowerShell):\n')
  for (const befehl of ergebnis.befehle) console.log(`  ${befehl}`)
  process.exit(0)
}
