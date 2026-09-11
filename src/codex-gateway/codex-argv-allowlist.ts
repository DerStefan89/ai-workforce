/**
 * Datei: src/codex-gateway/codex-argv-allowlist.ts
 *
 * Zweck: Argv-Grammatik für `codex exec` (F16 WS-1, AK2,
 * features/F16/feature.md). pruefeCodexAufruf entscheidet, ob ein
 * Tokens-Array an einen Codex-Prozessstart weitergereicht werden darf —
 * als ALLOWLIST, nicht als Liste von Verbotswerten.
 *
 * WARUM Allowlist statt Verbotsliste (E-182-Muster, ARCHITECTURE.md §7,
 * Zeile „Aufrufparameter, die eine Schutzschicht abwählen", Ausnahmespalte
 * „keine"): `codex exec` 0.153.4 kennt `-c`/`--config` als generischen
 * TOML-Override über einen OFFENEN Schlüsselraum — das Beispiel aus der
 * eigenen Hilfe lautet `-c 'sandbox_permissions=["disk-full-read-access"]'`
 * und wählt damit genau die Schutzschicht ab, die dieses Gateway pinnt.
 * Dazu kommen `--enable`/`--disable` („Equivalent to -c
 * features.<name>=…"), `-p`/`--profile` sowie die beiden Schalter, die
 * Nutzerkonfiguration bzw. Regeln abwählen (`ignore-user-config`,
 * `ignore-rules`, hier bewusst ohne führende Striche geschrieben, siehe
 * „Wichtig" unten). Eine Verbotsliste über einen offenen Schlüsselraum ist
 * nicht schließbar: sie müsste jeden künftigen TOML-Schlüssel und jeden
 * neuen Schalter kennen und bräche bei der nächsten Codex-Version STILL —
 * also ohne Fehlermeldung, mit abgeschalteter Sandbox (F-281). Eine
 * Allowlist bricht im entgegengesetzten, sicheren Sinn: ein heute
 * unbekanntes Token wird abgelehnt, nicht durchgelassen. Genau das ist
 * hier die gewünschte Ausfallrichtung.
 *
 * WARUM eine eigene Funktion statt F4s pruefeAufrufparameter
 * (src/invocation-policy/verbotene-aufrufparameter.ts): jene Funktion
 * prüft exakte Token und mehrwortige Token-Fenster (F-048) gegen eine
 * feste E-182-Liste — sie kennt keine Präfixe, keine Wertepositionen und
 * keine Grammatik, könnte also `-c <beliebiger TOML-Ausdruck>` prinzipiell
 * nicht fassen. Sie wird zudem vom Claude-Code-Gateway mitbenutzt und
 * bleibt deshalb unangetastet; src/invocation-policy/ wird von F16 WS-1
 * nicht angefasst (F-282). Die beiden Prüfungen stehen nebeneinander, sie
 * ersetzen einander nicht.
 *
 * Wird aufgerufen von:
 * - src/codex-gateway/index.ts (pruefeUndVerweigereCodexBeiTreffer)
 * - src/codex-gateway/codex-gateway.test.ts (direkt)
 * - scripts/check-f16-codex-gateway.mjs (mittelbar, über
 *   pruefeUndVerweigereCodexBeiTreffer)
 *
 * Wichtig: Diese Datei ist die einzige Produktionsdatei des Moduls, in der
 * abwählende Schalternamen überhaupt vorkommen dürfen — und auch hier nur
 * im Fließtext, nie als Vergleichswert im Code. Das Gate
 * scripts/check-f16-codex-gateway.mjs (c) belegt mechanisch, dass in den
 * übrigen Produktionsdateien dieses Moduls kein Token mit den Präfixen
 * `--dangerously` oder `--ignore-` steht; deshalb stehen die beiden
 * Schalternamen oben ohne führende Striche. Wer hier eine Ausnahme „nur
 * für diesen einen Schalter" einbaut, hebt die oben begründete
 * Ausfallrichtung auf.
 */

import { resolve } from 'node:path'

/** Ergebnis einer Argv-Prüfung — bei ok:false trägt grund den konkreten, protokollierbaren Ablehnungsgrund (Muster F4s pruefeAufrufparameter). */
export type CodexAufrufUrteil = { ok: true } | { ok: false; grund: string }

/** Der einzige zulässige Wert hinter dem Sandbox-Schalter. Steht bewusst als Konstante und nicht als Literal im Code, damit es genau eine Stelle gibt, an der ein anderer Modus überhaupt diskutiert werden müsste (E-M3-2: schreibende Execution bleibt Claude Code). */
const ERLAUBTER_SANDBOX_WERT = 'read-only'

/**
 * Prüft den Wert hinter einem Schalter auf die Eigenschaften, die JEDE
 * Wertposition erfüllen muss: vorhanden, ein String, nicht leer und ohne
 * führendes '-'. Letzteres ist die eigentliche Schutzregel — ein Token
 * wie '-c' in einer Wertposition würde sonst ungeprüft mitgeschluckt und
 * das restliche Argv verschöbe sich um eine Position, sodass ein
 * abwählender Parameter die Grammatik passiert, ohne je als Token geprüft
 * worden zu sein.
 * @param schalter - der Schaltername, nur für die Fehlermeldung
 * @param wert - das Token an der Wertposition (kann fehlen)
 * @returns null, wenn der Wert zulässig ist, sonst der Ablehnungsgrund
 */
function wertMangel(schalter: string, wert: unknown): string | null {
  if (wert === undefined) return `'${schalter}' steht ohne Wert am Ende des Argv`
  if (typeof wert !== 'string') return `'${schalter}' trägt einen Wert, der kein String ist, sondern ${typeof wert}`
  if (wert.length === 0) return `'${schalter}' steht ohne nicht-leeren Wert im Argv`
  if (wert.startsWith('-')) return `'${schalter}' trägt einen Wert mit führendem '-': '${wert}'`
  return null
}

/**
 * Prüft ein Codex-Tokens-Array gegen die erlaubte Grammatik von
 * `codex exec`. Erlaubt ist ausschließlich: `exec` an Position 0; der
 * JSON-Schalter höchstens einmal; der Sandbox-Schalter genau einmal,
 * gefolgt von 'read-only'; `--model` genau einmal, gefolgt von einem
 * nicht-leeren Wert; `--output-schema` höchstens einmal, gefolgt von einem
 * absoluten Pfad; genau ein abschließendes Prompt-Token, das nicht mit '-'
 * beginnt. Jedes andere Token wird abgelehnt — auch ein heute
 * unbekanntes; das ist der Zweck der Bauart, kein Nebeneffekt.
 * @param tokens - vollständiges Argv OHNE das Programm selbst (das Startziel steht davor, F6a-Muster)
 * @returns { ok: true } oder { ok: false, grund } — wirft nie
 */
export function pruefeCodexAufruf(tokens: string[]): CodexAufrufUrteil {
  if (tokens.length === 0) {
    return { ok: false, grund: 'Argv ist leer — erwartet wird mindestens exec, Sandbox-Schalter, --model <wert> und ein Prompt-Token' }
  }
  if (tokens[0] !== 'exec') {
    return { ok: false, grund: `Position 0 muss 'exec' sein, gefunden: '${tokens[0]}'` }
  }

  let jsonAnzahl = 0
  let sandboxAnzahl = 0
  let modellAnzahl = 0
  let ausgabeSchemaAnzahl = 0
  let promptAnzahl = 0

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i]

    // Die Signatur verspricht string[], der Argv kann aber aus einer
    // geparsten Startvorlage stammen. Ein TypeError an einer
    // Schutzschicht wäre die falsche Ausfallrichtung — abgelehnt wird,
    // was nicht geprüft werden kann. Hält zugleich die Zusage „wirft nie".
    if (typeof token !== 'string') {
      return { ok: false, grund: `Token an Position ${i} ist kein String, sondern ${typeof token}` }
    }

    if (token === '--json') {
      jsonAnzahl++
      if (jsonAnzahl > 1) return { ok: false, grund: "'--json' steht mehr als einmal im Argv" }
      continue
    }

    if (token === '--sandbox') {
      sandboxAnzahl++
      if (sandboxAnzahl > 1) return { ok: false, grund: "'--sandbox' steht mehr als einmal im Argv — genau ein Vorkommen ist erlaubt" }
      const wert = tokens[i + 1]
      if (wert === undefined) return { ok: false, grund: "'--sandbox' steht ohne Wert am Ende des Argv" }
      if (wert !== ERLAUBTER_SANDBOX_WERT) {
        return { ok: false, grund: `'--sandbox' erlaubt ausschließlich '${ERLAUBTER_SANDBOX_WERT}', gefunden: '${String(wert)}'` }
      }
      i++
      continue
    }

    if (token === '--model') {
      modellAnzahl++
      if (modellAnzahl > 1) return { ok: false, grund: "'--model' steht mehr als einmal im Argv" }
      const mangel = wertMangel('--model', tokens[i + 1])
      if (mangel !== null) return { ok: false, grund: mangel }
      i++
      continue
    }

    if (token === '--output-schema') {
      ausgabeSchemaAnzahl++
      if (ausgabeSchemaAnzahl > 1) return { ok: false, grund: "'--output-schema' steht mehr als einmal im Argv" }
      const wert = tokens[i + 1]
      const mangel = wertMangel('--output-schema', wert)
      if (mangel !== null) return { ok: false, grund: mangel }
      if (resolve(wert) !== wert) return { ok: false, grund: `'--output-schema' verlangt einen absoluten Pfad, gefunden: '${wert}'` }
      i++
      continue
    }

    // Jedes verbleibende Token mit führendem '-' ist per Bauart unbekannt
    // — unabhängig davon, ob es in `codex exec` heute existiert.
    if (token.startsWith('-')) {
      return { ok: false, grund: `Token '${token}' steht nicht in der erlaubten Grammatik (Allowlist) — jedes nicht ausdrücklich erlaubte Token wird abgelehnt` }
    }

    // Ein Token ohne führendes '-' ist das Prompt-Token. Es muss das
    // letzte sein: ein zweites freies Token wäre entweder ein zweiter
    // Prompt oder der Wert eines Schalters, den diese Grammatik nicht
    // kennt — beides wird abgelehnt. Dass die Endprüfung VOR dem Zähler
    // steht, ist Absicht: sie fängt den Fall „zwei Prompt-Tokens" bereits
    // am ersten der beiden, also mit der genaueren Meldung.
    if (i !== tokens.length - 1) {
      return { ok: false, grund: `Prompt-Token '${token}' steht nicht am Ende des Argv — genau ein abschließendes Prompt-Token ist erlaubt` }
    }
    if (token.length === 0) return { ok: false, grund: 'Das abschließende Prompt-Token ist leer' }
    promptAnzahl++
  }

  if (sandboxAnzahl !== 1) return { ok: false, grund: "Der Sandbox-Schalter mit 'read-only' fehlt im Argv — genau ein Vorkommen ist Pflicht" }
  if (modellAnzahl !== 1) return { ok: false, grund: "'--model <wert>' fehlt im Argv — genau ein Vorkommen ist Pflicht" }
  if (promptAnzahl !== 1) return { ok: false, grund: 'Argv trägt kein abschließendes Prompt-Token' }

  return { ok: true }
}
