/**
 * Datei: scripts/leitstand/cli-version.mjs
 *
 * Zweck: F45 B1b-2 (Kleinpunkt b, F-1044) — Start-Hinweis, wenn die installierte Claude-Code-Version von
 * `werkzeugVersionDeklariert` der Startvorlage abweicht. Nach jedem Claude-Code-Update sind die Belege der
 * Startfreigabe nicht mehr belegt (sie gelten für die alte Version); der Leitstand sagt das beim Start klar („CLI-Version geändert — Startfreigabe neu
 * erzeugen“) und verweist auf docs/harness/startfreigabe-erneuern.md. Kein automatisches Neuerzeugen (E3).
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (CLI-Bindeblock: einmal nach dem Binden, asynchron)
 * - scripts/leitstand/cli-version.test.mjs (node:test)
 *
 * Wichtig:
 * - Nur Anzeige: kein Durchsetzungsort. E-183/E-188 bleiben unverändert (die Startfreigabe vergleicht die
 *   deklarierte Version mit dem Wirksamkeitsnachweis, nicht mit der installierten).
 * - Läuft genau einmal je Serverprozess, nie im Poll; GET /api/zustand liefert nur den gemerkten Wert.
 * - `--version` startet die CLI ohne Shell (execFile) mit Zeitgrenze; ein Fehlschlag ergibt keinen Hinweis,
 *   nur eine Warnung im Log.
 */

import { execFile } from 'node:child_process'

/** Anleitung, auf die der Hinweis verweist (repo-relativ). */
export const ANLEITUNG_STARTFREIGABE = 'docs/harness/startfreigabe-erneuern.md'

/** Zeitgrenze für `<startziel> --version`. */
export const CLI_VERSION_ZEITGRENZE_MS = 15_000

/**
 * Vergleicht installierte und deklarierte Version (getrimmt, sonst exakt — derselbe Text, den
 * `claude --version` ausgibt und den die Startvorlage trägt). Rein.
 * @param installiert - Ausgabe von `--version` oder null
 * @param deklariert - werkzeugVersionDeklariert der Startvorlage oder null
 * @returns Hinweis { art: 'cliVersionGeaendert', installiert, deklariert, anleitung } oder null
 */
export function vergleicheCliVersion(installiert, deklariert) {
  if (typeof installiert !== 'string' || typeof deklariert !== 'string') return null
  const ist = installiert.trim()
  const soll = deklariert.trim()
  if (ist === '' || soll === '' || ist === soll) return null
  return { art: 'cliVersionGeaendert', installiert: ist, deklariert: soll, anleitung: ANLEITUNG_STARTFREIGABE }
}

/**
 * Fragt die installierte Version über `<startziel…> --version` ab (ohne Shell, mit Zeitgrenze). Wirft nie.
 * @param startziel - werkzeugStartziel der Startvorlage (argv-Präfix, [0] absoluter Programmpfad)
 * @param zeitgrenzeMs - Zeitgrenze
 * @returns { ok: true, version } oder { ok: false, grund }
 */
export function frageCliVersion(startziel, zeitgrenzeMs = CLI_VERSION_ZEITGRENZE_MS) {
  return new Promise((aufloesen) => {
    if (!Array.isArray(startziel) || startziel.length === 0 || typeof startziel[0] !== 'string') {
      aufloesen({ ok: false, grund: 'kein werkzeugStartziel' })
      return
    }
    try {
      execFile(startziel[0], [...startziel.slice(1), '--version'], { timeout: zeitgrenzeMs, windowsHide: true, encoding: 'utf8' }, (fehler, stdout) => {
        if (fehler) aufloesen({ ok: false, grund: fehler.code !== undefined ? `${fehler.code}: ${fehler.message}` : fehler.message })
        else aufloesen({ ok: true, version: String(stdout).trim() })
      })
    } catch (fehler) {
      aufloesen({ ok: false, grund: fehler instanceof Error ? fehler.message : String(fehler) })
    }
  })
}

/**
 * Ermittelt den Start-Hinweis zur CLI-Version für eine geladene Startvorlage und meldet eine Abweichung per
 * console.warn. Wirft nie.
 * @param vorlage - geladene Startvorlage ({ werkzeugStartziel, werkzeugVersionDeklariert }) oder null
 * @param frage - Abfragefunktion (Tests), Standard frageCliVersion
 * @returns Hinweis oder null
 */
export async function ermittleCliHinweis(vorlage, frage = frageCliVersion) {
  if (vorlage === null || typeof vorlage !== 'object') return null
  const antwort = await frage(vorlage.werkzeugStartziel)
  if (!antwort.ok) {
    console.warn(`[leitstand] Claude-Code-Version nicht abfragbar (${antwort.grund}) — kein Versionshinweis.`)
    return null
  }
  const hinweis = vergleicheCliVersion(antwort.version, vorlage.werkzeugVersionDeklariert)
  if (hinweis !== null) {
    console.warn(`[leitstand] CLI-Version geändert: installiert '${hinweis.installiert}', deklariert '${hinweis.deklariert}' — Startfreigabe neu erzeugen (${ANLEITUNG_STARTFREIGABE})`)
  }
  return hinweis
}
