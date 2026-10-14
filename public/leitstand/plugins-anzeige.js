/**
 * Datei: public/leitstand/plugins-anzeige.js
 *
 * Zweck: Reine Anzeigeregeln des Reiters „Plugins aus deinem Claude Code“ der Capability Library (F45 F-3a-2, Plan
 * features/F45/plan-f3a2.md): aus der Antwort von GET …/plugins (F-3a-1, scripts/leitstand/routen-plugins.mjs; Form
 * PluginAntwort in src/claude-plugins/types.ts) Kopfzeile, Liste (Name, Marketplace, Version, Status), Detail mit
 * Bestandteilen (Skills, Agents, Commands mit allowed-tools, Hooks mit Ereignis, MCP mit gepinnt ja/nein, LSP), Risiken als
 * Fakten und Teilfehlern, dazu die eingebauten Plugins getrennt mit der Messversion der Referenzliste (F-1091 (1)). Dazu die
 * Steuerung des Ladens (erzeugePluginSteuerung): abgerufen wird nur bei der Wahl des Reiters und per „Neu laden“.
 * Ohne Netz und ohne DOM-Zugriff, damit node:test die Regeln direkt prüft (plugins-anzeige.test.mjs).
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/plugins.js (DOM-Anbindung)
 * - public/leitstand/plugins-anzeige.test.mjs, scripts/check-f45-f3a2-anzeige.mjs
 *
 * Wichtig:
 * - Jede Zeichenkette der Route (Namen, Befehle, Pfade, Risiko-Texte, Gründe) geht nur durch escapeHtml, nie durch t()
 *   (XSS-Rotfall im Gate). Codes der Route (Scope, Pin, Risiko-Art) übersetzt die Oberfläche; unbekannte bleiben roh.
 * - `aktiv` bei scope ≠ user ist nicht der Stand dieses Projekts: gemessen hängt `enabled` vom Arbeitsordner des
 *   CLI-Aufrufs ab (features/F45/nachweise/f3a2/messung-scope-local.json) — gezeigt wird der Wert nur mit dem Ordner des
 *   Abrufs (instanz_pfad) und dem Installationsprojekt (projekt_pfad), F-1091 (2).
 * - Keine Aktivierung, kein Knopf mit Wirkung: die einzigen Knöpfe wählen ein Plugin aus.
 */

import { formatiereZahl, t, tHtml } from './i18n.js'
import { escapeHtml, formatiereUhrzeit } from './render.js'

/** Bestandteil-Arten in Anzeigereihenfolge. */
const TEILE = Object.freeze(['skills', 'agents', 'commands', 'hooks', 'mcp', 'lsp'])
const SCOPES = new Set(['user', 'local', 'project'])
const PINS = new Set(['gepinnt', 'ungepinnt', 'anderer_befehl', 'entfernt', 'unbestimmt'])
const RISIKEN = new Set(['hook_befehl', 'hook_andere', 'mcp_ungepinnt', 'mcp_entfernt', 'rechte_ausserhalb', 'rechte_nicht_bestimmbar', 'externe_wirkung'])
const EINGEBAUT_QUELLEN = new Set(['referenzliste', 'cli-liste'])

/** Alle dynamisch gebildeten i18n-Schlüssel (das i18n-Gate prüft nur literale; der Test prüft diese in allen Sprachen). */
export const DYNAMISCHE_SCHLUESSEL = Object.freeze([
  ...TEILE.map((teil) => `plugins.teil.${teil}`),
  ...[...SCOPES].map((s) => `plugins.scope.${s}`),
  ...[...PINS].map((p) => `plugins.pin.${p}`),
  ...[...RISIKEN].map((r) => `plugins.risiko.${r}`),
  ...[...EINGEBAUT_QUELLEN].map((q) => `plugins.eingebaut.quelle.${q}`),
  ...['an', 'aus', 'unbekannt', 'ordner'].map((s) => `plugins.status.${s}`),
  ...['an', 'aus', 'unbekannt'].map((w) => `plugins.wert.${w}`),
  ...['ja', 'nein'].map((g) => `plugins.gepinnt.${g}`),
  // Über eine Variable gewählt (das i18n-Gate erkennt nur literale Aufrufe; Nachpass N4/QA N3).
  'plugins.aktiv.ordnerHinweis',
  'plugins.aktiv.ordnerHinweisUngemessen',
  'plugins.lizenz.datei',
  'plugins.lizenz.keine',
])

/** Zeitlimit des Abrufs in api.js (PLUGINS_ZEITLIMIT_MS) — hier nur für den Text bei Zeitüberschreitung. */
const ZEITLIMIT_SEKUNDEN = 20

/**
 * Anzeigename: name, sonst id (Liste und Detail gleich).
 * @param plugin - PluginEintrag
 * @returns Text
 */
function anzeigeName(plugin) {
  return typeof plugin?.name === 'string' && plugin.name !== '' ? plugin.name : String(plugin?.id ?? '')
}

/**
 * Text eines Werts oder „—“ (fehlend/leer).
 * @param wert - beliebiger Wert
 * @returns HTML
 */
function textOderStrich(wert) {
  return typeof wert === 'string' && wert !== '' ? escapeHtml(wert) : '<span class="unbekannt">—</span>'
}

/**
 * Code-Element für einen Routenwert.
 * @param wert - Text
 * @returns HTML
 */
function code(wert) {
  return `<code>${escapeHtml(wert)}</code>`
}

/**
 * Übersetzt einen Code der Route, wenn er bekannt ist; sonst bleibt er roh (escaped).
 * @param menge - bekannte Codes
 * @param praefix - i18n-Präfix
 * @param wert - Code
 * @returns HTML
 */
function codeText(menge, praefix, wert) {
  return menge.has(wert) ? tHtml(`${praefix}.${wert}`) : textOderStrich(wert)
}

/**
 * Status eines Plugins für die Liste: bei scope user der Wert der CLI-Liste, sonst „je nach Ordner“ (F-1091 (2)).
 * @param plugin - PluginEintrag
 * @returns 'an' | 'aus' | 'unbekannt' | 'ordner'
 */
export function pluginStatus(plugin) {
  if (plugin?.scope !== 'user') return 'ordner'
  if (plugin.aktiv === true) return 'an'
  if (plugin.aktiv === false) return 'aus'
  return 'unbekannt'
}

/**
 * Status als Chip (Farben aus .ablauf-status: an mint, sonst gedämpft).
 * @param status - pluginStatus
 * @returns HTML
 */
function statusChip(status) {
  return `<span class="ablauf-status${status === 'an' ? '' : ' neutral'}" data-plugin-status="${status}">${tHtml(`plugins.status.${status}`)}</span>`
}

/**
 * Zustände ohne Bestand: nicht geladen, lädt, Fehler mit Grund.
 * @param art - 'nicht_geladen' | 'laedt' | 'fehler'
 * @param grund - Grund bei 'fehler'
 * @returns HTML
 */
export function renderPluginsZustand(art, grund = '') {
  if (art === 'laedt') return `<p class="leer" data-pl-zustand="laedt">${tHtml('plugins.laedt')}</p>`
  if (art === 'nicht_geladen') return `<p class="leer" data-pl-zustand="nicht_geladen">${tHtml('plugins.nichtGeladen')}</p>`
  return `<div class="note red pl-band" data-pl-zustand="fehler">${tHtml('plugins.ladeFehler', { grund: String(grund) })}</div>`
}

/**
 * Eine Zeile der Liste; der Name ist der Knopf zur Auswahl.
 * @param plugin - PluginEintrag
 * @param index - Index in antwort.plugins
 * @param gewaehlt - true, wenn ausgewählt
 * @returns HTML
 */
function zeileHtml(plugin, index, gewaehlt) {
  // Scope steht unter dem Namen, sobald er nicht user ist — dieselbe id in mehreren Scopes bleibt so unterscheidbar (F-1091 (4)).
  const scope =
    plugin.scope === 'user'
      ? ''
      : `<span class="library-anzeigename" data-pl-scope="${escapeHtml(plugin.scope ?? '')}">${codeText(SCOPES, 'plugins.scope', plugin.scope)}${typeof plugin.projekt_pfad === 'string' && plugin.projekt_pfad !== '' ? ` · ${code(plugin.projekt_pfad)}` : ''}</span>`
  const risiken = Array.isArray(plugin.risiken) ? plugin.risiken.length : 0
  const marken = [
    risiken > 0 ? `<span class="ablauf-status warten" data-pl-risiken="${risiken}">${tHtml('plugins.risikenAnzahl', { anzahl: risiken, zahl: formatiereZahl(risiken) })}</span>` : '',
    Array.isArray(plugin.fehler) && plugin.fehler.length > 0 ? `<span class="ablauf-status fehler pl-teilfehler">${tHtml('plugins.teilfehler')}</span>` : '',
  ].join('')
  return `<tr class="library-zeile" data-plugin-index="${index}"${gewaehlt ? ' data-gewaehlt="true"' : ''}>
    <td data-spalte="${escapeHtml(t('plugins.spalte.plugin'))}"><button type="button" class="library-name" data-plugin-index="${index}" aria-pressed="${gewaehlt}" aria-controls="plugins-detail">${escapeHtml(anzeigeName(plugin))}</button>${scope}${marken === '' ? '' : `<span class="pl-marken">${marken}</span>`}</td>
    <td data-spalte="${escapeHtml(t('plugins.spalte.marketplace'))}">${textOderStrich(plugin.marketplace)}</td>
    <td data-spalte="${escapeHtml(t('plugins.spalte.version'))}">${textOderStrich(plugin.version)}</td>
    <td data-spalte="${escapeHtml(t('plugins.spalte.status'))}">${statusChip(pluginStatus(plugin))}</td>
  </tr>`
}

/**
 * Liste der Plugins als Tabelle (eingebaute stehen nicht darin, siehe renderEingebaut).
 * @param antwort - PluginAntwort mit status 'ok'
 * @param auswahl - Index des gewählten Plugins oder null
 * @returns HTML
 */
export function renderPluginListe(antwort, auswahl) {
  const plugins = Array.isArray(antwort?.plugins) ? antwort.plugins : []
  if (plugins.length === 0) return `<p class="leer" data-pl-zustand="leer">${tHtml('plugins.leer')}</p>`
  return `<div class="library-tabelle-rahmen"><table class="library-tabelle pl-tabelle">
    <caption class="sr-only">${tHtml('plugins.tabelle')}</caption>
    <thead><tr><th scope="col">${tHtml('plugins.spalte.plugin')}</th><th scope="col">${tHtml('plugins.spalte.marketplace')}</th><th scope="col">${tHtml('plugins.spalte.version')}</th><th scope="col">${tHtml('plugins.spalte.status')}</th></tr></thead>
    <tbody>${plugins.map((p, i) => zeileHtml(p, i, i === auswahl)).join('')}</tbody>
  </table></div>`
}

/**
 * Regeln (allowed-tools/tools) als Code-Liste oder „keine“.
 * @param regeln - Strings
 * @returns HTML
 */
function regelnHtml(regeln) {
  return Array.isArray(regeln) && regeln.length > 0 ? regeln.map(code).join(' ') : tHtml('plugins.teil.keine')
}

/**
 * Eine Zeile „Feld: Wert“ innerhalb eines Bestandteils.
 * @param schluessel - i18n-Schlüssel des Felds
 * @param wertHtml - fertiges HTML
 * @returns HTML
 */
function feld(schluessel, wertHtml) {
  return `<span class="pl-feld"><span class="pl-feld-name">${tHtml(schluessel)}</span> ${wertHtml}</span>`
}

/**
 * Befehl mit Argumenten als ein Code-Element (oder „—“).
 * @param befehl - Programm oder null
 * @param args - Argumente
 * @returns HTML
 */
function befehlHtml(befehl, args) {
  if (typeof befehl !== 'string' || befehl === '') return textOderStrich(null)
  return code([befehl, ...(Array.isArray(args) ? args : [])].join(' '))
}

/** Darstellung je Bestandteil-Art: ein <li> je Eintrag. */
const TEIL_ZEILE = {
  skills: (s) => `<li>${code(s.name)}${feld('plugins.feld.allowedTools', regelnHtml(s.allowed_tools))}</li>`,
  agents: (a) => `<li>${code(a.name)}${feld('plugins.feld.tools', regelnHtml(a.tools))}</li>`,
  commands: (c) => `<li>${code(c.name)}${feld('plugins.feld.allowedTools', regelnHtml(c.allowed_tools))}</li>`,
  hooks: (h) =>
    `<li><strong>${escapeHtml(h.ereignis)}</strong>${feld('plugins.feld.matcher', textOderStrich(h.matcher))}${feld('plugins.feld.typ', textOderStrich(h.typ))}${feld('plugins.feld.befehl', typeof h.befehl === 'string' ? code(h.befehl) : textOderStrich(null))}${feld('plugins.feld.quelle', textOderStrich(h.quelle))}</li>`,
  mcp: (m) => {
    const gepinnt = m.pin === 'gepinnt' ? 'ja' : 'nein'
    const ziel = typeof m.url === 'string' && m.url !== '' ? code(m.url) : befehlHtml(m.befehl, m.args)
    const paket = typeof m.paket === 'string' && m.paket !== '' ? feld('plugins.feld.paket', code(m.paket)) : ''
    return `<li data-pl-mcp="${escapeHtml(m.name)}" data-pl-gepinnt="${gepinnt}">${code(m.name)} <span class="pl-art">${escapeHtml(m.art)}</span>${feld('plugins.feld.gepinnt', `<strong>${tHtml(`plugins.gepinnt.${gepinnt}`)}</strong> · ${codeText(PINS, 'plugins.pin', m.pin)}`)}${feld('plugins.feld.ziel', ziel)}${paket}</li>`
  },
  lsp: (l) => `<li>${code(l.name)}${feld('plugins.feld.befehl', befehlHtml(l.befehl, l.args))}</li>`,
}

/**
 * Bestandteile: je Art mit Einträgen ein aufklappbarer Block (zu, „Mehr bei Bedarf“), leere Arten in einer Zeile.
 * @param bestandteile - plugin.bestandteile
 * @returns HTML
 */
function teileHtml(bestandteile) {
  const liste = (teil) => (Array.isArray(bestandteile?.[teil]) ? bestandteile[teil] : [])
  const mit = TEILE.filter((teil) => liste(teil).length > 0)
  const ohne = TEILE.filter((teil) => liste(teil).length === 0)
  const bloecke = mit
    .map(
      (teil) =>
        `<details class="pl-teil" data-pl-teil="${teil}"><summary>${tHtml('plugins.teil.mitAnzahl', { name: t(`plugins.teil.${teil}`), zahl: formatiereZahl(liste(teil).length) })}</summary><ul class="pl-teile">${liste(teil).map(TEIL_ZEILE[teil]).join('')}</ul></details>`
    )
    .join('')
  const leer = ohne.length === 0 ? '' : `<p class="pl-keine" data-pl-teile-leer>${tHtml('plugins.teile.leer', { namen: ohne.map((teil) => t(`plugins.teil.${teil}`)).join(', ') })}</p>`
  return `${bloecke}${leer}`
}

/**
 * Zeile „Aktiv“ des Details: scope user direkt, sonst mit Ordner des Abrufs und Installationsprojekt (F-1091 (2)).
 * @param plugin - PluginEintrag
 * @param instanzPfad - Ordner, aus dem die CLI-Liste abgefragt wurde
 * @returns HTML
 */
function aktivHtml(plugin, instanzPfad) {
  const status = pluginStatus(plugin)
  if (status !== 'ordner') return `<span data-pl-aktiv="${status}">${tHtml(`plugins.status.${status}`)}</span>`
  const wert = plugin.aktiv === true ? 'an' : plugin.aktiv === false ? 'aus' : 'unbekannt'
  // Gemessen ist nur scope local (features/F45/nachweise/f3a2/messung-scope-local.json); andere Scopes mit „nicht gemessen“.
  const hinweis = plugin.scope === 'local' ? 'plugins.aktiv.ordnerHinweis' : 'plugins.aktiv.ordnerHinweisUngemessen'
  return `<span data-pl-aktiv="ordner">${tHtml('plugins.aktiv.ordner', { wert: t(`plugins.wert.${wert}`) }, { ordner: typeof instanzPfad === 'string' && instanzPfad !== '' ? code(instanzPfad) : textOderStrich(null), projekt: typeof plugin.projekt_pfad === 'string' && plugin.projekt_pfad !== '' ? code(plugin.projekt_pfad) : textOderStrich(null) })}</span><span class="hinweis pl-ordner-hinweis" data-pl-hinweis="${plugin.scope === 'local' ? 'gemessen' : 'ungemessen'}">${tHtml(hinweis)}</span>`
}

/**
 * Lizenz als Text: Datei vorhanden/fehlt, dazu Feld aus plugin.json.
 * @param plugin - PluginEintrag
 * @returns HTML
 */
function lizenzHtml(plugin) {
  const datei = tHtml(plugin.lizenz_datei === true ? 'plugins.lizenz.datei' : 'plugins.lizenz.keine')
  return typeof plugin.lizenz_feld === 'string' && plugin.lizenz_feld !== '' ? `${datei} · ${tHtml('plugins.lizenz.feld', { wert: plugin.lizenz_feld })}` : datei
}

/**
 * Detail des gewählten Plugins (oder Leertext).
 * @param antwort - PluginAntwort mit status 'ok'
 * @param auswahl - Index oder null
 * @returns HTML (Inhalt des Detail-Bereichs)
 */
export function renderPluginDetail(antwort, auswahl) {
  const plugin = Number.isInteger(auswahl) && Array.isArray(antwort?.plugins) ? antwort.plugins[auswahl] : undefined
  if (plugin === undefined || plugin === null) return `<p class="leer">${tHtml('plugins.detailLeer')}</p>`
  const zeile = (schluessel, wertHtml) => `<dt>${tHtml(schluessel)}</dt><dd>${wertHtml}</dd>`
  // Hash und Commit voll (umbrechend) — gekürzt wären sie per Tastatur/Touch nicht ganz lesbar (design-guardian 7).
  const hash = typeof plugin.inhalt_hash === 'string' ? code(plugin.inhalt_hash) : tHtml('plugins.hash.ohne', { grund: plugin.hash_grund ?? '—' })
  const commit = typeof plugin.commit === 'string' && plugin.commit !== '' ? code(plugin.commit) : textOderStrich(null)
  const risiken = Array.isArray(plugin.risiken) ? plugin.risiken : []
  const risikenHtml =
    risiken.length === 0
      ? `<p class="pl-keine">${tHtml('plugins.risiken.keine')}</p>`
      : `<ul class="pl-risiken">${risiken.map((r) => `<li data-pl-risiko="${escapeHtml(r.art)}"><span class="ablauf-status warten">${codeText(RISIKEN, 'plugins.risiko', r.art)}</span> ${code(r.bestandteil)} <span class="pl-risiko-text">${escapeHtml(r.text)}</span></li>`).join('')}</ul>`
  const fehler = Array.isArray(plugin.fehler) && plugin.fehler.length > 0 ? `<div class="note red pl-fehler"><strong>${tHtml('plugins.fehler.titel')}</strong><ul>${plugin.fehler.map((f) => `<li data-pl-fehler>${escapeHtml(f)}</li>`).join('')}</ul></div>` : ''
  return `<div class="library-detail-eyebrow">${tHtml('plugins.detail.eyebrow')}</div>
    <h3 id="plugins-detail-titel" class="library-detail-name">${escapeHtml(anzeigeName(plugin))}</h3>
    ${fehler}
    <dl class="library-detail-daten">
      ${zeile('plugins.detail.id', code(String(plugin.id ?? '')))}
      ${zeile('plugins.spalte.marketplace', textOderStrich(plugin.marketplace))}
      ${zeile('plugins.spalte.version', textOderStrich(plugin.version))}
      ${zeile('plugins.detail.commit', commit)}
      ${zeile('plugins.detail.scope', codeText(SCOPES, 'plugins.scope', plugin.scope))}
      ${zeile('plugins.detail.aktiv', aktivHtml(plugin, antwort.instanz_pfad))}
      ${zeile('plugins.detail.pfad', typeof plugin.pfad === 'string' ? code(plugin.pfad) : textOderStrich(null))}
      ${zeile('plugins.detail.hash', hash)}
      ${zeile('plugins.detail.lizenz', lizenzHtml(plugin))}
    </dl>
    <section class="pl-abschnitt"><h4 class="pl-abschnitt-titel">${tHtml('plugins.risiken.titel', { zahl: formatiereZahl(risiken.length) })}</h4>${risikenHtml}</section>
    <section class="pl-abschnitt"><h4 class="pl-abschnitt-titel">${tHtml('plugins.teile.titel')}</h4>${teileHtml(plugin.bestandteile)}</section>`
}

/**
 * Eingebaute Plugins getrennt, mit Messversion der Referenzliste (F-1091 (1)) und Lesefehler der Liste.
 * @param antwort - PluginAntwort mit status 'ok'
 * @returns HTML
 */
export function renderEingebaut(antwort) {
  const eingebaut = Array.isArray(antwort?.eingebaut) ? antwort.eingebaut : []
  const version = eingebaut.find((e) => e?.quelle === 'referenzliste' && typeof e.cli_version === 'string')?.cli_version
  const messung = typeof version === 'string' ? `<p class="pl-messung">${tHtml('plugins.eingebaut.referenz', { version })}</p>` : ''
  const fehler = typeof antwort?.eingebaut_fehler === 'string' && antwort.eingebaut_fehler !== '' ? `<div class="note red pl-band">${tHtml('plugins.eingebaut.fehler', { grund: antwort.eingebaut_fehler })}</div>` : ''
  const liste =
    eingebaut.length === 0
      ? `<p class="pl-keine">${tHtml('plugins.eingebaut.leer')}</p>`
      : `<ul class="pl-eingebaut-liste">${eingebaut.map((e) => `<li data-pl-eingebaut="${escapeHtml(e.id)}" data-pl-quelle="${escapeHtml(e.quelle)}">${code(e.id)} <span class="pl-art">${codeText(EINGEBAUT_QUELLEN, 'plugins.eingebaut.quelle', e.quelle)}</span></li>`).join('')}</ul>`
  return `<section class="pl-eingebaut" aria-labelledby="plugins-eingebaut-titel"><h3 id="plugins-eingebaut-titel" class="pl-abschnitt-titel">${tHtml('plugins.eingebaut.titel')}</h3>${messung}${fehler}${liste}</section>`
}

/**
 * Ganzer Inhalt des Reiters zu einem Zustand der Steuerung.
 * @param zustand - { art: 'nicht_geladen' | 'laedt' | 'fehler' | 'ok', antwort?, auswahl?, grund?, geladen_am? }
 * @returns HTML
 */
export function renderPlugins(zustand) {
  if (zustand?.art === 'nicht_geladen' || zustand?.art === 'laedt') return renderPluginsZustand(zustand.art)
  if (zustand?.art !== 'ok') return renderPluginsZustand('fehler', zustand?.grund ?? '')
  const antwort = zustand.antwort
  if (antwort?.status !== 'ok') return renderPluginsZustand('fehler', antwort?.grund ?? '—')
  const anzahl = Array.isArray(antwort.plugins) ? antwort.plugins.length : 0
  const auswahl = Number.isInteger(zustand.auswahl) ? zustand.auswahl : null
  const kopf = `<p class="pl-kopf">${tHtml('plugins.kopf', { anzahl, zahl: formatiereZahl(anzahl), zeit: formatiereUhrzeit(zustand.geladen_am) ?? '—' }, { ordner: typeof antwort.instanz_pfad === 'string' ? code(antwort.instanz_pfad) : textOderStrich(null), befehl: code(antwort.quelle?.befehl ?? '—') })}</p>`
  const inhalt =
    anzahl === 0
      ? renderPluginListe(antwort, null)
      : `<div class="library-raster pl-raster"><div class="library-liste">${renderPluginListe(antwort, auswahl)}</div><aside id="plugins-detail" class="library-detail pl-detail" ${auswahl === null || antwort.plugins[auswahl] === undefined ? `aria-label="${escapeHtml(t('plugins.detail.bereich'))}"` : 'aria-labelledby="plugins-detail-titel"'} tabindex="-1">${renderPluginDetail(antwort, auswahl)}</aside></div>`
  return `${kopf}${inhalt}${renderEingebaut(antwort)}`
}

/**
 * Schlüssel eines Plugins über Neuladen hinweg (dieselbe id kann in mehreren Scopes stehen, F-1091 (4)).
 * @param plugin - PluginEintrag
 * @returns Text
 */
function schluesselVon(plugin) {
  return JSON.stringify([plugin?.id ?? null, plugin?.scope ?? null, plugin?.projekt_pfad ?? null])
}

/**
 * Steuerung des Reiters: lädt nur über beiReiterwahl() und neuLaden() (kein Abruf beim Erzeugen, Zurücksetzen oder Wählen),
 * verwirft überholte Antworten und hält die Auswahl über ein Neuladen am selben Plugin.
 * @param o - { hole: () => Promise<PluginAntwort>, zeichne: (zustand) => void }
 * @returns { beiReiterwahl, neuLaden, waehle, zuruecksetzen, zustand }
 */
export function erzeugePluginSteuerung({ hole, zeichne }) {
  let zustand = { art: 'nicht_geladen', antwort: null, auswahl: null, grund: '', geladen_am: null }
  let zaehler = 0
  let auswahlSchluessel = null
  const setze = (neu) => {
    zustand = { antwort: null, auswahl: null, grund: '', geladen_am: null, ...neu }
    zeichne(zustand)
  }
  async function lade() {
    const meine = ++zaehler
    setze({ art: 'laedt' })
    try {
      const antwort = await hole()
      if (meine !== zaehler) return
      const plugins = antwort?.status === 'ok' && Array.isArray(antwort.plugins) ? antwort.plugins : []
      const index = auswahlSchluessel === null ? -1 : plugins.findIndex((p) => schluesselVon(p) === auswahlSchluessel)
      setze({ art: 'ok', antwort, auswahl: index === -1 ? null : index, geladen_am: new Date().toISOString() })
    } catch (fehler) {
      if (meine !== zaehler) return
      // Zeitlimit (AbortSignal.timeout) als eigener Text statt der englischen Browsermeldung (QA 7).
      const grund = fehler?.name === 'TimeoutError' ? t('plugins.zeitlimit', { sekunden: ZEITLIMIT_SEKUNDEN }) : fehler instanceof Error ? fehler.message : String(fehler)
      console.error('plugins: GET …/plugins nicht ladbar', fehler)
      setze({ art: 'fehler', grund })
    }
  }
  return {
    beiReiterwahl: lade,
    neuLaden: lade,
    /** @param index - Index in antwort.plugins */
    waehle(index) {
      const plugin = zustand.antwort?.plugins?.[index]
      if (zustand.art !== 'ok' || plugin === undefined) return
      auswahlSchluessel = schluesselVon(plugin)
      setze({ ...zustand, auswahl: index })
    },
    /** Projektwechsel: Bestand und Auswahl verwerfen, laufende Antwort überholen — ohne Abruf. */
    zuruecksetzen() {
      zaehler++
      auswahlSchluessel = null
      setze({ art: 'nicht_geladen' })
    },
    zustand: () => zustand,
  }
}
