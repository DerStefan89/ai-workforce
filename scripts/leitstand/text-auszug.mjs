/**
 * Datei: scripts/leitstand/text-auszug.mjs
 *
 * Zweck: Reine Textauszüge aus einem Rollen-Ergebnistext — Codezaun entfernen (erster bzw. äußerster Zaun) und das erste
 * balancierte JSON-Objekt herauslösen; dazu JSON.parse ohne Wurf (versucheJsonParse) und die gekürzte Liste abgelehnter
 * Befehle (formatiereAbgelehnteBefehle, F45 B2b-4b). Wörtlich aus scripts/leitstand-server.mjs ausgelagert (F45 B2b-4a-1 und
 * B2b-4b, Ausgleich der Wachstumsbremse, ARCHITECTURE.md §1): kein I/O, nicht schreibend, ohne Abhängigkeit.
 *
 * Wird aufgerufen von:
 * - scripts/leitstand-server.mjs (leseRollenErgebnisRohstrom, leseRollenErgebnisStufen; dort auch weiter exportiert —
 *   scripts/check-f22-click-to-work.mjs und scripts/check-f31-gedaechtnis.mjs importieren sie aus dem Server;
 *   versucheJsonParse in leseRollenErgebnisRohstrom/leseRollenErgebnisStufen, formatiereAbgelehnteBefehle im F-760-Halt des
 *   Schritt-Nachlaufs — beide nur intern, kein Re-Export)
 * - scripts/leitstand/text-auszug.test.mjs (node:test)
 *
 * Wichtig: Den Re-Export im Server nicht entfernen — die Gates f22 und f31 importieren die Funktionen von dort.
 */

/**
 * Entfernt einen Markdown-Codezaun (```lang\n...\n```), falls einer im Text vorkommt,
 * sonst null. Reine Funktion, kein Wurf (F22 WS-1). NUR im worker 'claude-code'-
 * Rückfallzweig von verarbeiteRouterErgebnis gebraucht (F-337/F-346, state/findings.md):
 * 'codex' liefert strukturierte Ausgabe über '--output-schema' und braucht keinen
 * Zweitversuch. Muster: scripts/eval-router.mjs' versucheForensischeEntzaunung — dort
 * rein forensisch/berichtend, hier PRODUKTIV im Nachbearbeitungspfad.
 *
 * Task "Jarvis-Chat-Latenz senken", Runde 2, Schritt 1 (löst F-506): der Zaun muss NICHT
 * mehr den GESAMTEN (getrimmten) Text umschließen — ein realer Jarvis-Lauf lieferte Prosa
 * VOR dem Zaun ("Kein neuer Sachstand … — ich antworte konsistent damit." gefolgt von
 * ```json\n{…}\n```), die bisherige startsWith('```')-Prüfung verwarf das gesamt als
 * "kein Codezaun" und lieferte null, obwohl ein gültiges JSON-Objekt im Zaun stand. Die
 * Regex sucht den ersten Zaun IRGENDWO im Text und verwirft Prosa davor/danach — ein Text
 * ganz ohne Zaun liefert weiterhin null (Regressionsschutz, scripts/check-f22-click-to-
 * work.mjs Abschnitt (0): entferneCodezaun('{"a":1}') !== null muss falsch bleiben).
 * @param text - roher Klassifikationstext
 * @returns der Zaun-Inhalt (Prosa davor/danach verworfen), oder null, wenn kein Codezaun vorlag
 */
export function entferneCodezaun(text) {
  const treffer = text.match(/```[a-zA-Z]*[ \t]*\r?\n?([\s\S]*?)```/)
  return treffer === null ? null : treffer[1].trim()
}

/**
 * F44 WS-8b (löst F-966): der ÄUSSERSTE Codezaun — vom ersten Öffner bis zum LETZTEN ``` im
 * Text. entferneCodezaun endet am ersten schließenden ```; steht im Feld 'antwort' selbst ein
 * Codeblock (```powershell …```, Regel „direkt ausführbar“, F-959), schneidet der erste Zaun
 * das Objekt mitten im String ab. Reine Funktion, kein Wurf. Nur ein Zweitversuch in
 * leseRollenErgebnisRohstrom, NACH allen bisherigen Stufen.
 * @param text - roher Ergebnistext
 * @returns der Inhalt zwischen erstem Öffner und letztem ``` (getrimmt), oder null ohne zweites ```
 */
export function entferneAeusserstenCodezaun(text) {
  const oeffner = text.match(/```[a-zA-Z]*[ \t]*\r?\n?/)
  if (oeffner === null) return null
  const inhaltStart = oeffner.index + oeffner[0].length
  const ende = text.lastIndexOf('```')
  if (ende < inhaltStart) return null
  return text.slice(inhaltStart, ende).trim()
}

/**
 * Löst das erste vollständige, balancierte {…}-JSON-Objekt aus einem Text, Prosa
 * davor/danach verworfen — Task "Jarvis-Chat-Latenz senken", Runde 2, Schritt 1 (löst
 * F-506), zweite Fallback-Stufe NACH entferneCodezaun (die deckt nur den Fall mit
 * Codezaun ab; hier: Prosa + rohes JSON-Objekt ganz ohne Zaun). Reine Funktion, kein
 * Wurf. Klammerzählung überspringt Anführungszeichen-Inhalte (Escape-bewusst, sonst
 * zählte eine geschweifte Klammer INNERHALB eines String-Werts mit) — reicht für dieses
 * Anwendungsfeld (Jarvis-Ergebnistext), kein vollständiger JSON-Tokenizer.
 * @param text - roher Ergebnistext
 * @returns der Objekt-Ausschnitt vom ersten '{' bis zur passenden '}', oder null, wenn
 *   kein '{' vorkommt oder keine Klammer je wieder auf 0 zurückfällt (unvollständiges Objekt)
 */
export function extrahiereErstesJsonObjekt(text) {
  const start = text.indexOf('{')
  if (start === -1) return null
  let tiefe = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const zeichen = text[i]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (zeichen === '\\') {
        escaped = true
      } else if (zeichen === '"') {
        inString = false
      }
      continue
    }
    if (zeichen === '"') {
      inString = true
    } else if (zeichen === '{') {
      tiefe++
    } else if (zeichen === '}') {
      tiefe--
      if (tiefe === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

/**
 * Versucht JSON.parse, ohne zu werfen (aus scripts/leitstand-server.mjs ausgelagert, F45 B2b-4b, Wachstumsbremse).
 * @param kandidat - Text
 * @returns { ok: true, geparst } oder { ok: false, grund }
 */
export function versucheJsonParse(kandidat) {
  try {
    return { ok: true, geparst: JSON.parse(kandidat) }
  } catch (fehler) {
    return { ok: false, grund: fehler.message }
  }
}

/** F-760: kürzt die Liste abgelehnter Befehle (leseAbgelehnteBefehleAusRohstrom) für den persistierten Halt-Grund — der Text soll nicht mit der Zahl der Probeaufrufe beliebig wachsen (aus dem Server ausgelagert, F45 B2b-4b). @param befehle - Befehle @returns lesbarer Fließtext */
export function formatiereAbgelehnteBefehle(befehle) {
  if (befehle.length === 0) return 'keine im Rohstrom lesbar'
  const GRENZE = 8
  const sichtbar = befehle.slice(0, GRENZE)
  const rest = befehle.length - sichtbar.length
  return rest > 0 ? `${sichtbar.join(', ')}, … (+${rest} weitere)` : sichtbar.join(', ')
}
