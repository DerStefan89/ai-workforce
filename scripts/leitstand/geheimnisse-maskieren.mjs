/**
 * Datei: scripts/leitstand/geheimnisse-maskieren.mjs
 *
 * Zweck: Geheimnisse maskieren, bevor der Leitstand Text zeigt (F45 S, löst F-1005). Rein, ohne I/O.
 * - maskiereGeheimnisse(text): bekannte Muster in beliebigem Text (Befehlstext eines Werkzeugaufrufs,
 *   Harness-Datei). Der Wert wird durch MASKE ersetzt — gleich lang, egal wie lang das Geheimnis war —;
 *   Schlüsselname, Flag, Schema bzw. Präfix bleiben sichtbar.
 * - maskiereEinstellungenJson(text): zusätzlich JEDER Wert im env-Block einer Einstellungsdatei
 *   (.claude/settings.json), textuell — Formatierung und Kommentare der Datei bleiben, auch bei
 *   gekürztem oder ungültigem JSON.
 *
 * Muster (MUSTER, in dieser Reihenfolge):
 * - URL mit Benutzer:Passwort@ (auch leerer Benutzer, '@' im Passwort) → Benutzer bleibt, Passwort maskiert
 * - Authorization-Kopf (Bearer/Basic/Token/Digest/Bot bleibt sichtbar) und „Bearer <Token>“ an beliebiger Stelle
 * - curl -u/--user benutzer:passwort → Benutzer bleibt
 * - Flags --password/--passwd/--token/--secret/--api-key (auch mit Vorsilbe, z. B. --github-token, und mit
 *   einem Strich wie PowerShell -Password) mit '=' oder Leerzeichen
 * - Zuweisungen und Parameter, deren Schlüssel auf token, passwd, password, secret, api_key/apikey/api-key,
 *   access_key oder private_key endet (GITHUB_TOKEN=…, ?access_token=…, "apiKey": "…", password: …,
 *   $env:TOKEN = '…', auch mit escapten Anführungszeichen wie \"password\":\"…\")
 * - Schlüssel-Präfixe sk-, sk_live_/sk_test_/rk_live_/rk_test_, ghp_/gho_/ghu_/ghs_/ghr_, github_pat_,
 *   glpat-, xoxa-/xoxb-/xoxp-/xoxr-, AKIA…/ASIA…, AIza…
 *
 * Wird aufgerufen von:
 * - scripts/leitstand/lauf-aktivitaet.mjs (zielFuerAnzeige: Ringpuffer und „Gerade“)
 * - scripts/leitstand/routen-harness.mjs (baueHarnessDatei)
 * - scripts/leitstand-server.mjs (leseAbgelehnteBefehleAusRohstrom: abgelehnte Befehle im F-760-Halt-Grund)
 * - scripts/leitstand/geheimnisse-maskieren.test.mjs (node:test)
 *
 * Wichtig: Maskiert wird nach bekannten Mustern — ein Geheimnis ohne erkennbares Muster bleibt sichtbar
 * (Durchsetzungsgrad: geprüft, nicht ERZWUNGEN; nicht erkannt werden z. B. key=/sig=-Parameter und ein
 * gequoteter Wert über einen Zeilenumbruch). Lieber zu viel als zu wenig maskieren; harmlose Befehle und
 * Pfade müssen aber unverändert bleiben (Tests). Laufzeit: Jede Regex beginnt an einem festen Text oder
 * einer Wortgrenze, und jede variable Wiederholung vor diesem Anker ist begrenzt (Schema ≤ 32, Benutzer,
 * Passwort und Schlüsselname ≤ 256 bzw. 64 Zeichen) — auch 64-KB-Texte ohne Treffer bleiben schnell (Test).
 */

/** Platzhalter für jeden maskierten Wert (längenunabhängig). */
export const MASKE = '••••'

/**
 * Ein Wert: mit escapten Anführungszeichen (\"…\"), doppelt oder einfach gequotet (am Textende auch
 * abgeschnitten) oder bis zum nächsten Trenner — ungequotet nie mit '{', '[' oder '\' beginnend (ein
 * Objekt oder Array ist kein Wert, der maskiert wird). Ein Anführungszeichen, auf das Leerraum oder ein
 * zweites folgt, beginnt keinen Wert — es schließt einen Text (grep -n "token:" datei, QA-Nachpass).
 */
const WERT = String.raw`(\\"(?![\s\\])(?:(?!\\")[^\n]){0,4096}(?:\\"|$)|"(?![\s"])(?:[^"\\\n]|\\.){0,4096}(?:"|$)|'(?![\s'])[^'\n]{0,4096}(?:'|$)|[^\s"'&;,{[\\][^\s"'&;,]*)`

/**
 * Ersetzt einen Wert durch die Maske; Anführungszeichen (auch escapte) bleiben.
 * @param wert - roher Wert (ggf. gequotet)
 * @returns maskierter Wert
 */
function maskiereWert(wert) {
  if (wert.startsWith('\\"')) return `\\"${MASKE}\\"`
  const q = wert[0]
  return q === '"' || q === "'" ? `${q}${MASKE}${q}` : MASKE
}

/** Schlüsselwörter, deren Wert ein Geheimnis ist (Ende eines Schlüsselnamens). */
const SCHLUESSEL = 'token|passwd|password|secret|api[_-]?key|access[_-]?key|private[_-]?key'

/** Die Muster: [Name, RegExp, Ersetzer]. Der Name dient nur Tests und Kommentaren. */
export const MUSTER = Object.freeze([
  ['url-benutzer-passwort', /\b([a-z][a-z0-9+.-]{0,31}:\/\/[^\s:/@"'<>]{0,256}:)[^\s/"'<>]{1,256}@/gi, (_, vorne) => `${vorne}${MASKE}@`],
  [
    'authorization',
    /(\bAuthorization(?:\\?["'])?[ \t]*[:=][ \t]*(?:\\?["'])?)(?:(Bearer|Basic|Token|Digest|Bot)[ \t]+)?([^\s"'<>,;\\]+)/gi,
    (_, vorne, schema) => `${vorne}${schema ? `${schema} ` : ''}${MASKE}`,
  ],
  ['bearer', /\b(Bearer[ \t]+)[A-Za-z0-9._~+/=-]{8,}/g, (_, vorne) => `${vorne}${MASKE}`],
  ['curl-benutzer', /((?<![\w-])(?:-u|--user)(?:=|[ \t]+)["']?[^\s:"'/]{1,256}:)(?![\\/])[^\s"']{1,256}/g, (_, vorne) => `${vorne}${MASKE}`],
  [
    'flag',
    new RegExp(String.raw`(?<![\w-])(--?[A-Za-z0-9-]{0,64}?(?:password|passwd|token|secret|api-?key)(?:=|[ \t]+)(?![-\s]))${WERT}`, 'gi'),
    (_, vorne, wert) => `${vorne}${maskiereWert(wert)}`,
  ],
  [
    'zuweisung',
    new RegExp(String.raw`((?<![A-Za-z0-9_.-])(?:\\?["'])?[A-Za-z0-9_.-]{0,64}?(?:${SCHLUESSEL})(?:\\?["'])?[ \t]*[=:][ \t]*)${WERT}`, 'gi'),
    (_, vorne, wert) => `${vorne}${maskiereWert(wert)}`,
  ],
  ['openai-anthropic', /\bsk-[A-Za-z0-9_-]{16,}/g, () => `sk-${MASKE}`],
  ['stripe', /\b([sr]k_(?:live|test)_)[A-Za-z0-9]{16,}/g, (_, praefix) => `${praefix}${MASKE}`],
  ['github', /\b(gh[pousr]_)[A-Za-z0-9]{20,}/g, (_, praefix) => `${praefix}${MASKE}`],
  ['github-pat', /\bgithub_pat_[A-Za-z0-9_]{20,}/g, () => `github_pat_${MASKE}`],
  ['gitlab', /\bglpat-[A-Za-z0-9_-]{20,}/g, () => `glpat-${MASKE}`],
  ['slack', /\b(xox[abpr]-)[A-Za-z0-9-]{10,}/g, (_, praefix) => `${praefix}${MASKE}`],
  ['aws', /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g, (_, praefix) => `${praefix}${MASKE}`],
  ['google', /\bAIza[0-9A-Za-z_-]{35}/g, () => `AIza${MASKE}`],
])

/**
 * Maskiert bekannte Geheimnis-Muster in einem Text. Rein; idempotent.
 * @param text - beliebiger Text, oder null
 * @returns maskierter Text (ohne Treffer derselbe Text); kein Text bleibt unverändert
 */
export function maskiereGeheimnisse(text) {
  if (typeof text !== 'string' || text === '') return text
  let ergebnis = text
  for (const [, regex, ersetzer] of MUSTER) ergebnis = ergebnis.replace(regex, ersetzer)
  return ergebnis
}

/**
 * Index der schließenden Klammer zum '{' an Position start; Texte in "…" zählen nicht. Rein.
 * @param text - JSON-Text
 * @param start - Index des '{'
 * @returns Index der passenden '}' oder text.length (gekürzter Text)
 */
function endeDesObjekts(text, start) {
  let tiefe = 0
  let inText = false
  for (let i = start; i < text.length; i++) {
    const z = text[i]
    if (inText) {
      if (z === '\\') i++
      else if (z === '"') inText = false
    } else if (z === '"') inText = true
    else if (z === '{') tiefe++
    else if (z === '}' && --tiefe === 0) return i
  }
  return text.length
}

/** Ein Schlüssel-Wert-Paar mit Text- oder Zahlwert innerhalb eines JSON-Objekts; ein am Textende abgeschnittener Text zählt mit. */
const JSON_PAAR = /("(?:[^"\\\n]|\\.)*"\s*:\s*)("(?:[^"\\\n]|\\.)*(?:"|$)|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g

/**
 * Maskiert eine Einstellungsdatei: jeden Wert in jedem "env"-Block und danach alle bekannten Muster. Rein.
 * @param text - Inhalt (auch gekürzt oder ungültig)
 * @returns maskierter Text
 */
export function maskiereEinstellungenJson(text) {
  if (typeof text !== 'string' || text === '') return text
  let ergebnis = ''
  let rest = 0
  for (const m of text.matchAll(/"env"\s*:\s*\{/g)) {
    const start = m.index + m[0].length - 1
    if (start < rest) continue
    const ende = endeDesObjekts(text, start)
    ergebnis += text.slice(rest, start) + text.slice(start, ende).replace(JSON_PAAR, (_, vorne) => `${vorne}"${MASKE}"`)
    rest = ende
  }
  return maskiereGeheimnisse(ergebnis + text.slice(rest))
}
