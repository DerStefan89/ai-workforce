/**
 * Datei: scripts/_rueckfrage-aus-pruefung.mjs
 *
 * Zweck: Gemeinsame Quelltext-Regel „Rückfrage-Kanal nur über das Opt-in“ (F45 B2b-3b-2b-2a-1, Plan v2 B1/B2,
 * features/F45/advisor-b2b3b2b2a.md). Ersetzt in vier Gates die frühere Aussage „kein Produktaufrufer setzt die Option
 * rueckfrage“, die mit dem Einschalten absichtlich nicht mehr gilt, durch eine gleich strenge:
 * - In jeder Argumentliste von `erzeugeRequestHandler(` (Server und scripts/leitstand/*.mjs) bleibt nach Entfernen genau der
 *   erlaubten Spread-Tokens kein Bezeichner `rueckfrage…` übrig — die Option entsteht nur aus `rueckfrageOptionFuer` und damit nur
 *   mit `LEITSTAND_RUECKFRAGE=1` (funktional belegt in scripts/check-f45-b2b3b2b2a-einschalten.mjs (o1)).
 * - Dasselbe für jede Argumentliste von `baueProjektHandlerMap(` mit den zwei erlaubten Formen von `rueckfrageBasis`.
 * - `rueckfrageStand` wird im Server genau einmal zugewiesen, aus `rueckfrageBasisAusUmgebung(process.env, PORT)`, und nie
 *   verändert (`rueckfrageStand.… =`).
 * - Der Schlüssel `rueckfrage:` steht im Server genau einmal (die Kanal-Zuweisung hinter `if (rueckfrageAn && …`) — so fällt auch
 *   ein vorab gebautes Optionsobjekt (`const o = { rueckfrage: … }; erzeugeRequestHandler(o)`) auf (code-reviewer 1).
 * Eine feste Adresse oder eine injizierte Vermittlung direkt im Aufruf oder als Schlüssel im Server wird damit rot.
 * Grenzen (DEKLARIERT): Klammern in Strings/Kommentaren einer Argumentliste beenden sie zu früh; ein umbenannter Import
 * (`erzeugeRequestHandler as …`) oder ein berechneter Schlüssel (`['rueck' + 'frage']`) wird nicht erkannt.
 *
 * Wird aufgerufen von: scripts/check-f45-b2b3b1-rueckfrage.mjs (f), scripts/check-f45-b2b3b2a-absicherung.mjs (f),
 * scripts/check-f45-b2b3b2b1a-rest.mjs (f), scripts/check-f45-b2b3b2b1b-r1.mjs (f), scripts/check-f45-b2b3b2b2a-einschalten.mjs (o3).
 */

/** Erlaubte Formen in `erzeugeRequestHandler(`-Argumentlisten (Workforce-Instanz bzw. Projektinstanz). */
export const ERLAUBT_HANDLER = Object.freeze(['...rueckfrageOptionFuer(rueckfrageStand.basis)', '...rueckfrageOptionFuer(rueckfrageBasis, projekt.id)'])
/** Erlaubte Formen in `baueProjektHandlerMap(`-Argumentlisten (CLI-Bindeblock bzw. Live-Anlage der Workforce-Instanz). */
export const ERLAUBT_KARTE = Object.freeze(['rueckfrageBasis: rueckfrageStand.basis', 'rueckfrageBasis: istWorkforceInstanz && rueckfrageAn ? rueckfrage.url : undefined'])
/** Die einzige erlaubte Zuweisung des Opt-in-Stands im Server. */
export const STAND_ZUWEISUNG = 'const rueckfrageStand = rueckfrageBasisAusUmgebung(process.env, PORT)'

/**
 * Argumentlisten aller Aufrufe von `name(` (ohne die Definition `function name(`), bis zur passenden Klammer.
 * @param {string} text - Quelltext
 * @param {string} name - Funktionsname
 * @returns {string[]}
 */
export function argumentlisten(text, name) {
  const listen = []
  for (let i = text.indexOf(`${name}(`); i >= 0; i = text.indexOf(`${name}(`, i + 1)) {
    if (/\w/.test(text[i - 1] ?? '') || text.slice(Math.max(0, i - 9), i) === 'function ') continue
    let tiefe = 0
    let j = i + name.length
    do {
      if (text[j] === '(') tiefe++
      else if (text[j] === ')') tiefe--
      j++
    } while (tiefe > 0 && j < text.length)
    listen.push(text.slice(i + name.length, j))
  }
  return listen
}

/**
 * Prüft die Regel über Server und Leitstand-Module.
 * @param {{ pfad: string, text: string }[]} dateien - Produktdateien (Server zuerst erwartet: scripts/leitstand-server.mjs)
 * @returns {{ befunde: string[], handlerAufrufe: number }}
 */
export function pruefeKanalNurUeberOptIn(dateien) {
  const befunde = []
  let handlerAufrufe = 0
  const rest = (liste, erlaubt) => erlaubt.reduce((t, token) => t.split(token).join(''), liste)
  for (const { pfad, text } of dateien) {
    for (const liste of argumentlisten(text, 'erzeugeRequestHandler')) {
      handlerAufrufe++
      const treffer = rest(liste, ERLAUBT_HANDLER).match(/\brueckfrage\w*/)
      if (treffer !== null) befunde.push(`${pfad}: erzeugeRequestHandler( nennt '${treffer[0]}' außerhalb von rueckfrageOptionFuer`)
    }
    for (const liste of argumentlisten(text, 'baueProjektHandlerMap')) {
      const treffer = rest(liste, ERLAUBT_KARTE).match(/\brueckfrage\w*/)
      if (treffer !== null) befunde.push(`${pfad}: baueProjektHandlerMap( nennt '${treffer[0]}' außerhalb der erlaubten Formen`)
    }
  }
  const server = dateien.find((d) => d.pfad === 'scripts/leitstand-server.mjs')?.text ?? ''
  const zuweisungen = server.match(/\brueckfrageStand\s*=(?!=)/g)?.length ?? 0
  if (zuweisungen !== 1 || server.split(STAND_ZUWEISUNG).length !== 2) befunde.push(`scripts/leitstand-server.mjs: rueckfrageStand nicht genau einmal als '${STAND_ZUWEISUNG}' zugewiesen (${zuweisungen}×)`)
  if (/\brueckfrageStand\s*(\.\s*\w+|\[[^\]]*\])\s*=(?!=)/.test(server)) befunde.push('scripts/leitstand-server.mjs: rueckfrageStand wird nachträglich verändert')
  // qa M3: die Vorgabewerte beim Zerlegen der Optionen bleiben „aus“.
  for (const vorgabe of ['    rueckfrage = undefined,', 'rueckfrageBasis = undefined } = optionen']) if (!server.includes(vorgabe)) befunde.push(`scripts/leitstand-server.mjs: Vorgabe '${vorgabe.trim()}' fehlt`)
  const schluessel = server.match(/\brueckfrage\s*:/g)?.length ?? 0
  if (schluessel !== 1) befunde.push(`scripts/leitstand-server.mjs: Schlüssel 'rueckfrage:' ${schluessel}× statt genau 1× (nur die Kanal-Zuweisung hinter if (rueckfrageAn && …))`)
  return { befunde, handlerAufrufe }
}
