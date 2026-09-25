/**
 * Datei: src/ausfuehrung-vorbedingung/index.ts
 *
 * Zweck: E-F39-1 = B (Stefans Entscheidung, löst F-643 — "ausfuehrung schreibt ungeschützt in
 * den Haupt-Checkout auf main", real beobachtet im F39-WS-3b-Reallauf, Lauf
 * ad0025e4-5796-41a8-b2cd-6d527f40e2b4, 23.09.2026). Ein schreibender Schritt (Werkzeugsatz-Art
 * 'schreibend' — sowohl im Workflow als auch im Einzellauf POST /api/laeufe, dieselbe
 * loeseAusfuehrungsEingabenAuf-Prüfung deckt beide Pfade ab) darf niemals main/master oder einen
 * unsauberen Arbeitsbaum treffen.
 *
 * pruefeAusfuehrungsVorbedingung ist eine REINE Funktion (D5, Muster jeder anderen Prüfung
 * dieses Repos): sie nimmt den bereits gelesenen Inhalt von .git/HEAD und die bereits
 * ausgeführte Ausgabe von `git --no-optional-locks status --porcelain` entgegen — kein
 * Dateisystem-/Prozesszugriff hier, das übernimmt der Aufrufer (scripts/leitstand-server.mjs).
 * `--no-optional-locks` ist Pflicht (Stefans Vorgabe): die Prüfung ist rein lesend und darf nie
 * gegen ein bestehendes index.lock eines anderen, echten Git-Vorgangs laufen.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs,
 * src/ausfuehrung-vorbedingung/ausfuehrung-vorbedingung.test.ts.
 */

/** Bekannte Ausnahme-Pfadpräfixe (Stefans Vorgabe) — Dateien/Verzeichnisse, die ein unsauberer Baum ignorieren darf. */
const AUSNAHME_PRAEFIXE = ['kontrollzustand/', 'state/nachweis-runde2-', 'scripts/.aufraeumen-reste/']
/** Bekannte Ausnahme-Pfade, exakt (kein Präfix-Treffer nötig). */
const AUSNAHME_EXAKT = new Set(['stdin-check.js'])

/**
 * Prüft, ob ein Pfad aus `git status --porcelain` unter eine bekannte Ausnahme fällt.
 * @param pfad - der Pfad-Teil einer Porcelain-Zeile (ohne den zweistelligen Statuscode)
 */
export function istAusnahmePfad(pfad: string): boolean {
  if (AUSNAHME_EXAKT.has(pfad)) return true
  return AUSNAHME_PRAEFIXE.some((praefix) => pfad.startsWith(praefix))
}

/**
 * Liest den Branch aus dem rohen Inhalt von .git/HEAD. Ein Branch-HEAD hat die Form
 * `ref: refs/heads/<name>\n`; ein losgelöster (detached) HEAD trägt stattdessen roh einen
 * Commit-Hash — kein 'ref:'-Präfix, deshalb null (zählt als Verstoß, Stefans Vorgabe:
 * "detached HEAD zählt als Verstoß").
 * @param headInhalt - roher Inhalt von .git/HEAD
 * @returns der Branch-Name, oder null bei losgelöstem HEAD (oder unlesbarem Inhalt)
 */
export function ermittleBranchAusHead(headInhalt: string): string | null {
  const treffer = /^ref:\s*refs\/heads\/(.+?)\s*$/m.exec(headInhalt)
  return treffer !== null ? treffer[1] : null
}

/**
 * Filtert die Zeilen von `git --no-optional-locks status --porcelain` auf jene AUSSERHALB der
 * bekannten Ausnahmen. Porcelain-v1-Kurzform: die ersten zwei Zeichen sind der Statuscode, dann
 * genau ein Leerzeichen, dann der Pfad (`XY pfad`) — bei einer Umbenennung `R  alt -> neu`; diese
 * Funktion prüft dann den gesamten `alt -> neu`-Rest gegen die Ausnahmen (bekannte Grenze: eine
 * Umbenennung INNERHALB eines Ausnahme-Präfixes wird nicht eigens erkannt, real unbedeutend für
 * die hier genannten Ausnahmen — kein bisheriger Testfall verlangt es, YAGNI).
 * @param statusPorcelainRoh - rohe Ausgabe von `git status --porcelain`
 * @returns die Porcelain-Zeilen, die KEINER bekannten Ausnahme entsprechen
 */
export function filtereUnsaubereZeilen(statusPorcelainRoh: string): string[] {
  return statusPorcelainRoh
    .split('\n')
    .map((zeile) => zeile.replace(/\r$/, ''))
    .filter((zeile) => zeile.length > 0)
    .filter((zeile) => !istAusnahmePfad(zeile.slice(3)))
}

/**
 * Prüft die E-F39-1=B-Vorbedingung für einen schreibenden Schritt: der Haupt-Checkout muss auf
 * einem Branch ≠ main/master stehen (kein losgelöster HEAD), und der Arbeitsbaum muss sauber
 * sein (bekannte Ausnahmen ausgenommen). Reine Funktion, kein I/O.
 * @param headInhalt - roher Inhalt von .git/HEAD
 * @param statusPorcelainRoh - rohe Ausgabe von `git --no-optional-locks status --porcelain`
 * @returns { ok: true } wenn die Vorbedingung erfüllt ist, sonst { ok: false, grund }
 */
export function pruefeAusfuehrungsVorbedingung(headInhalt: string, statusPorcelainRoh: string): { ok: true } | { ok: false; grund: string } {
  const branch = ermittleBranchAusHead(headInhalt)
  if (branch === null) {
    return {
      ok: false,
      grund: 'Ausführung gesperrt: HEAD ist losgelöst (detached), kein Branch. Lege zuerst einen Branch an: git switch -c <name>',
    }
  }
  if (branch === 'main' || branch === 'master') {
    return { ok: false, grund: `Ausführung gesperrt: du bist auf ${branch}. Lege zuerst einen Branch an: git switch -c <name>` }
  }
  const unsaubereZeilen = filtereUnsaubereZeilen(statusPorcelainRoh)
  if (unsaubereZeilen.length > 0) {
    return {
      ok: false,
      grund: `Ausführung gesperrt: der Arbeitsbaum ist nicht sauber (${unsaubereZeilen.length} Datei(en) außerhalb der bekannten Ausnahmen) — committen oder stashen, bevor ein schreibender Schritt startet.`,
    }
  }
  return { ok: true }
}
