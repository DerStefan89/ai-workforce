/**
 * Datei: scripts/leitstand/routen-plugins.mjs
 *
 * Zweck: Baustein der Route GET /api/plugins (F45 F-3a-1, Plan features/F45/plan-f3a.md v2): Plugin-Bestand aus Stefans
 * Claude Code (Entscheidung E-F3a-1 = CLI-Liste) — Regeln in src/claude-plugins, hier nur
 * - der echte Listenläufer: `<claude> plugin list --json` über das unveränderte starteProzess (pruefeStartziel, Zeitgrenze
 *   10 s, stdin leer, cwd = Projektordner der Instanz; kein dritter Prozess-Starter, Advisor M1),
 * - der geteilte Abruf: gleichzeitige Anfragen teilen einen Lauf, nach dem Abschluss (auch nach einem Fehler) startet die
 *   nächste Anfrage neu — kein gemerktes Ergebnis (Advisor M6/Auflage 4),
 * - die Maskierung: rekursiv über alle Strings der Antwort (Hook-Befehle, MCP-args/url, Risiko-Texte, Fehler, Grund;
 *   Auflage 2) mit maskiereGeheimnisse.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs (GET /api/plugins), scripts/check-f45-f3a-plugins.mjs.
 *
 * Wichtig:
 * - Nur lesen. Unser Code schreibt nichts unter ~/.claude; die CLI selbst legt beim Listen eine flüchtige Marke in
 *   `.in_use/` der synced-Plugins an und löscht sie wieder (gemessen, features/F45/nachweise/f3a/spike.md H1) — als
 *   Nebenwirkung von Stefan angenommen (E-F3a-1). Kein windowsHide (wie jeder Lauf über starteProzess).
 * - Nie im Poll; die Oberfläche (F-3a-2) lädt nur beim Wählen des Reiters und per „Neu laden“.
 */

import { homedir } from 'node:os'
import { bestimmeClaudeOrdner, lesePluginBestand, listenErgebnisAusProzess, PLUGIN_LISTE_ARGUMENTE, pruefeClaudeProgramm } from '../../src/claude-plugins/index.ts'
import { starteProzess } from '../../src/claude-code-gateway/prozessstart.ts'
import { leseEingebautReferenz } from '../../src/faehigkeiten/index.ts'
import { MASKE, maskiereGeheimnisse } from './geheimnisse-maskieren.mjs'

/** Zeitgrenze des Listenaufrufs (gemessen ≈ 1,5 s). */
export const PLUGIN_LISTE_ZEITGRENZE_MS = 10_000

/**
 * Echter Listenläufer: Claude-CLI aus der Startvorlage mit `plugin list --json`.
 * @param startziel - werkzeugStartziel der Startvorlage
 * @param cwd - Projektordner der Instanz (Bezug von enabled bei scope local)
 * @returns () => Promise<ListenErgebnis>
 */
export function echterPluginListenLaeufer(startziel, cwd) {
  return async () => {
    const grund = pruefeClaudeProgramm(Array.isArray(startziel) ? startziel[0] : undefined)
    if (grund !== null) return { ok: false, grund }
    const erg = await starteProzess(startziel, [...PLUGIN_LISTE_ARGUMENTE], { zeitgrenzeMs: PLUGIN_LISTE_ZEITGRENZE_MS, stdinLeer: true, cwd })
    return listenErgebnisAusProzess(erg)
  }
}

/**
 * Maskiert eine Argumentliste (MCP/LSP args): jedes Element einzeln und zusätzlich Flag + Folgeelement zusammen — ein Geheimnis
 * als eigenes Element hinter seinem Flag (['--token', 'abc…']) sähe das Muster sonst nicht (QA 1). Trifft nur das Paar, wird
 * das Folgeelement ganz ersetzt.
 * @param args - Argumente
 * @returns maskierte Kopie
 */
export function maskiereArgs(args) {
  return args.map((a, i) => {
    if (typeof a !== 'string') return a
    const einzeln = maskiereGeheimnisse(a)
    const vorher = args[i - 1]
    if (einzeln !== a || typeof vorher !== 'string' || maskiereGeheimnisse(vorher) !== vorher) return einzeln
    const paar = `${vorher} ${a}`
    return maskiereGeheimnisse(paar) !== paar ? MASKE : a
  })
}

/**
 * Maskiert jeden String in einem JSON-Wert (rekursiv, neue Struktur); Felder 'args' über maskiereArgs.
 * @param wert - Antwort
 * @returns maskierte Kopie
 */
export function maskiereTief(wert) {
  if (typeof wert === 'string') return maskiereGeheimnisse(wert)
  if (Array.isArray(wert)) return wert.map(maskiereTief)
  if (wert !== null && typeof wert === 'object') return Object.fromEntries(Object.entries(wert).map(([k, v]) => [k, k === 'args' && Array.isArray(v) ? maskiereArgs(v) : maskiereTief(v)]))
  return wert
}

/**
 * Baut den Abruf einer Projektinstanz: ein geteilter Lauf je Zeitpunkt, maskierte Antwort, wirft nie.
 * Antwort bei status 'ok' zusätzlich `instanz_pfad` = Projektordner dieser Instanz (cwd des Listenaufrufs). Nicht zu verwechseln
 * mit `plugins[].projekt_pfad` (Projekt, für das die CLI ein Plugin mit scope local installiert hat; QA 4).
 * @param o - { liste: () => Promise<ListenErgebnis>, claudeOrdner?: string, werkzeugsatz: string[] | null, projektPfad: string }
 * @returns () => Promise<Antwort>
 */
export function erzeugePluginAbruf(o) {
  let laufend = null
  const claudeOrdner = o.claudeOrdner ?? bestimmeClaudeOrdner(process.env, homedir())
  return () => {
    if (laufend !== null) return laufend
    laufend = (async () => {
      // Code-Review 4: erst nach der Zuweisung von laufend weiterarbeiten — ein synchroner Wurf darunter würde sonst das
      // Fehlerergebnis dauerhaft als laufenden Abruf merken.
      await null
      try {
        const bestand = await lesePluginBestand({ liste: o.liste, claudeOrdner, werkzeugsatz: o.werkzeugsatz, eingebaut: leseEingebautReferenz() })
        return maskiereTief(bestand.status === 'ok' ? { ...bestand, instanz_pfad: o.projektPfad } : bestand)
      } catch (fehler) {
        const grund = maskiereGeheimnisse(`Plugin-Bestand nicht lesbar: ${fehler.message}`)
        console.error(`[leitstand] GET /api/plugins: ${grund}`)
        return { status: 'fehler', grund }
      } finally {
        laufend = null
      }
    })()
    return laufend
  }
}
