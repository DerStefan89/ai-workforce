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
 * - Keine Aktivierung in Claude Code. Seit F45 F-3b-1 trägt das Detail den Workforce-Abschnitt (renderPluginWorkforce: übernommen /
 *   nicht übernommen mit Grund, Prüfung und Freigabe mit Prüfbericht, Zuordnung je Rolle); die Knöpfe und Kästchen bindet
 *   views/plugins.js an die POST-Routen; renderVerwaist zeigt Freigaben/Zuordnungen zu Plugins, die nicht mehr installiert sind. Server-Gründe der Sperre (laufSperre) zeigt die Oberfläche nicht (können interne
 *   Kennungen tragen), nur einen eigenen Text.
 */

import { formatiereZahl, t, tHtml } from './i18n.js'
import { escapeHtml, formatiereUhrzeit } from './render.js'

/** Bestandteil-Arten in Anzeigereihenfolge. */
const TEILE = Object.freeze(['skills', 'agents', 'commands', 'hooks', 'mcp', 'lsp'])
const SCOPES = new Set(['user', 'local', 'project'])
const PINS = new Set(['gepinnt', 'ungepinnt', 'anderer_befehl', 'entfernt', 'unbestimmt'])
const RISIKEN = new Set(['hook_befehl', 'hook_andere', 'mcp_ungepinnt', 'mcp_entfernt', 'rechte_ausserhalb', 'rechte_nicht_bestimmbar', 'externe_wirkung', 'agent_werkzeuge', 'text_veroeffentlichen', 'text_worktree', 'text_subagenten', 'text_shell_inline'])
/** F45 F-3b-1: Codes des Workforce-Stands (src/plugin-kopie) — die Oberfläche übersetzt sie, unbekannte bleiben roh. */
const ZUSTAENDE = new Set(['keine', 'freigegeben', 'veraltet', 'kopie_veraendert', 'quelle_fehlt', 'unbestimmbar', 'bericht_fehlt', 'bericht_ueberholt', 'mehrdeutig'])
const SCHWEREN = new Set(['hoch', 'mittel', 'gering', 'info'])
const GRUENDE = new Set(['hook_nie', 'mcp_spaeter', 'lsp_nicht', 'nur_standardordner', 'frontmatter_unklar', 'frontmatter_fehlt', 'frontmatter_feld', 'allowed_tools', 'name_abweichend', 'name_unzulaessig', 'agent_tools_fehlt', 'agent_tools_verboten', 'agent_tools_ausserhalb', 'agent_model', 'werkzeugsatz_unbestimmt', 'unterordner', 'sperrname', 'weitere_skill_md', 'link', 'binaer', 'zu_gross', 'pfad_abgelehnt', 'plugin_daten'])
const KOPIE_TYPEN = new Set(['skill', 'agent', 'command', 'hook', 'mcp', 'lsp', 'pfad'])
const URTEILE = new Set(['GEEIGNET', 'MIT_AUFLAGEN', 'NICHT_GEEIGNET'])
const ROLLEN = new Set(['ausfuehrung'])
const EINGEBAUT_QUELLEN = new Set(['referenzliste', 'cli-liste'])

/** Alle dynamisch gebildeten i18n-Schlüssel (das i18n-Gate prüft nur literale; der Test prüft diese in allen Sprachen). */
export const DYNAMISCHE_SCHLUESSEL = Object.freeze([
  ...TEILE.map((teil) => `plugins.teil.${teil}`),
  ...[...SCOPES].map((s) => `plugins.scope.${s}`),
  ...[...PINS].map((p) => `plugins.pin.${p}`),
  ...[...RISIKEN].map((r) => `plugins.risiko.${r}`),
  ...[...EINGEBAUT_QUELLEN].map((q) => `plugins.eingebaut.quelle.${q}`),
  ...[...ZUSTAENDE].map((z) => `plugins.wf.zustand.${z}`),
  ...[...GRUENDE].map((g) => `plugins.wf.grund.${g}`),
  ...[...KOPIE_TYPEN].map((t) => `plugins.wf.typ.${t}`),
  ...[...URTEILE].map((u) => `plugins.wf.urteil.${u}`),
  ...[...SCHWEREN].map((x) => `plugins.wf.schwere.${x}`),
  ...['pruefen', 'freigeben', 'zuruecknehmen', 'zuordnen'].map((x) => `plugins.wf.ok.${x}`),
  ...[...ROLLEN].map((r) => `plugins.wf.rolle.${r}`),
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
    typeof plugin.workforce?.freigabe?.zustand === 'string' && plugin.workforce.freigabe.zustand !== 'keine' ? freigabeChip(plugin.workforce.freigabe.zustand) : '',
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
 * F45 F-3b-1: Sperre der Bedienung aus dem Kopf der Antwort (Lauf aktiv, lokale Datei ungültig oder von außen geändert) — Text
 * ohne Server-Grund (der kann interne Kennungen tragen).
 * @param antwort - PluginAntwort (status ok)
 * @returns null oder i18n-Schlüssel des Hinweises
 */
export function pluginSperre(antwort) {
  if (antwort?.workforce?.lauf_sperre?.aktiv === true) return 'plugins.wf.gesperrt.lauf'
  if (antwort?.workforce?.lokale_datei?.zustand === 'ungueltig') return 'plugins.wf.gesperrt.datei'
  if (antwort?.workforce?.lokale_datei?.fremd === true) return 'plugins.wf.gesperrt.fremd'
  return null
}

/**
 * Ein Knopf des Workforce-Abschnitts im V10-Stil (button / button primary; data-pl-aktion, data-pl-index — nicht
 * data-plugin-index, sonst wählt der Klick die Zeile). Gesperrt mit aria-describedby auf den Grund (design-guardian 9).
 * @param art - 'pruefen' | 'freigeben' | 'zuruecknehmen'
 * @param index - Index des Plugins
 * @param text - i18n-Schlüssel
 * @param an - bedienbar
 * @param primaer - nächster sinnvoller Schritt (design-guardian 3)
 * @param grundId - id des Hinweises, der die Sperre erklärt (oder null)
 * @returns HTML
 */
function aktionsKnopf(art, index, text, an, primaer, grundId) {
  const gesperrt = an ? '' : ` disabled${grundId !== null ? ` aria-describedby="${grundId}"` : ''}`
  return `<button type="button" class="button${primaer ? ' primary' : ''}" data-pl-aktion="${art}" data-pl-index="${index}"${gesperrt}>${tHtml(text)}</button>`
}

/**
 * Farbe der Schwere eines Befunds (design-guardian 8): hoch fehler, mittel warten, sonst gedämpft.
 * @param schwere - Code
 * @returns Klasse
 */
function schwereKlasse(schwere) {
  return schwere === 'hoch' ? 'fehler' : schwere === 'mittel' ? 'warten' : 'neutral'
}

/** Arten einer Aktion mit eigener Erfolgsmeldung (i18n plugins.wf.ok.<art>). */
const AKTION_ARTEN = new Set(['pruefen', 'freigeben', 'zuruecknehmen', 'zuordnen'])

/**
 * Attributwert für einen CSS-Attributselektor (doppelte Anführungszeichen und Backslash maskiert) — rein, ohne CSS.escape.
 * @param wert - Wert
 * @returns maskierter Wert
 */
function selektorWert(wert) {
  return String(wert).replace(/["\\]/g, (zeichen) => `\\${zeichen}`)
}

/**
 * F45 F-3b-1 (F-1094 (8)): Status bzw. Meldung einer Aktion an einem Plugin — fokussierbar (tabindex -1), über
 * data-pl-meldung-fuer dem Plugin zugeordnet. Läuft: Statusbereich (data-pl-fokus="status"); Fehler und Erfolg: Meldung
 * (data-pl-fokus="meldung"). Angesagt wird über die feste Live-Region des Reiters (#plugins-status, statusText).
 * @param pluginId - Plugin-id
 * @param aktion - Aktion oder null
 * @returns HTML (leer ohne Aktion)
 */
function aktionsStatus(pluginId, aktion) {
  const fuer = `data-pl-meldung-fuer="${escapeHtml(pluginId)}"`
  if (aktion?.phase === 'laeuft') return `<p class="pl-ordner-hinweis" tabindex="-1" data-pl-fokus="status" ${fuer} data-pl-aktion-status="laeuft">${tHtml(aktion.art === 'pruefen' ? 'plugins.wf.pruefungLaeuft' : 'plugins.wf.aktionLaeuft')}</p>`
  if (aktion?.phase === 'fehler') return `<div class="note red pl-band" tabindex="-1" data-pl-fokus="meldung" ${fuer} data-pl-aktion-status="fehler">${tHtml('plugins.wf.aktionFehler', { grund: String(aktion.grund ?? '—') })}</div>`
  if (aktion?.phase === 'ok' && AKTION_ARTEN.has(aktion.art)) return `<p class="pl-ordner-hinweis pl-wf-ok" tabindex="-1" data-pl-fokus="meldung" ${fuer} data-pl-aktion-status="ok">${tHtml(`plugins.wf.ok.${aktion.art}`)}</p>`
  return ''
}

/**
 * F45 F-3b-1 (F-1094 (8)): Text für die feste Live-Region des Reiters (#plugins-status) zu einer Aktion.
 * @param aktion - Aktion oder null
 * @returns Text (leer ohne Aktion)
 */
export function statusText(aktion) {
  if (aktion?.phase === 'laeuft') return t(aktion.art === 'pruefen' ? 'plugins.wf.pruefungLaeuft' : 'plugins.wf.aktionLaeuft')
  if (aktion?.phase === 'fehler') return t('plugins.wf.aktionFehler', { grund: String(aktion.grund ?? '—') })
  if (aktion?.phase === 'ok' && AKTION_ARTEN.has(aktion.art)) return t(`plugins.wf.ok.${aktion.art}`)
  return ''
}

/**
 * F45 F-3b-1 (F-1094 (8)): Fokusziele in Reihenfolge — das erste vorhandene, bedienbare Element bekommt den Fokus (nie body).
 * Läuft: Statusbereich des Plugins. Fehler: Meldung, sonst das auslösende Element. Erfolg: bei der Zuordnung das Kästchen, sonst
 * die Meldung des Plugins; bei nicht mehr installierten Plugins danach die Überschrift der Liste bzw. der Kopf des Reiters.
 * @param e - { pluginId, art, phase, selektor (auslösendes Element oder null), verwaist }
 * @returns Selektoren
 */
export function fokusZiele({ pluginId, art, phase, selektor = null, verwaist = false }) {
  const m = `[data-pl-meldung-fuer="${selektorWert(pluginId)}"]`
  const ende = verwaist ? ['#plugins-verwaist-titel', '#plugins-kopf'] : ['#plugins-detail', '#plugins-kopf']
  const liste = phase === 'laeuft' ? [`${m}[data-pl-fokus="status"]`] : phase === 'fehler' ? [`${m}[data-pl-fokus="meldung"]`, selektor] : art === 'zuordnen' && !verwaist ? [selektor, `${m}[data-pl-fokus="meldung"]`] : [`${m}[data-pl-fokus="meldung"]`, selektor]
  return [...liste, ...ende].filter((x) => typeof x === 'string' && x !== '')
}

/**
 * Status-Chip eines Freigabe-Zustands (Detail und Liste).
 * @param zustand - Code
 * @returns HTML
 */
function freigabeChip(zustand) {
  const klasse = zustand === 'freigegeben' ? '' : zustand === 'keine' ? ' neutral' : ' warten'
  return `<span class="ablauf-status${klasse}" data-pl-freigabe="${escapeHtml(zustand)}">${codeText(ZUSTAENDE, 'plugins.wf.zustand', zustand)}</span>`
}

/**
 * Teil „Prüfung und Freigabe“: Zustand, Prüfbericht, Knöpfe, Sperr- und Fehlerhinweis.
 * @param antwort - PluginAntwort
 * @param wf - plugin.workforce
 * @param index - Index des Plugins
 * @param aktion - Aktion oder null
 * @param sperre - pluginSperre(antwort)
 * @param pluginId - Plugin-id (Zuordnung von Status und Meldung, F-1094 (8))
 * @returns HTML
 */
function freigabeTeil(antwort, wf, index, aktion, sperre, pluginId) {
  const laeuft = aktion?.phase === 'laeuft'
  const kopie = wf.kopie ?? {}
  const f = wf.freigabe ?? {}
  const zustand = typeof f.zustand === 'string' ? f.zustand : 'unbestimmbar'
  const b = wf.pruefbericht !== null && typeof wf.pruefbericht === 'object' ? wf.pruefbericht : null
  const seit = typeof f.freigegeben_am === 'string' && typeof f.kopie_hash === 'string' ? `<p class="pl-ordner-hinweis">${tHtml('plugins.wf.freigegebenAm', { zeit: formatiereUhrzeit(f.freigegeben_am) ?? f.freigegeben_am }, { hash: code(f.kopie_hash.slice(0, 12)) })}</p>` : ''
  const abw = typeof f.abweichung === 'string' && f.abweichung !== '' ? `<p class="pl-ordner-hinweis">${tHtml('plugins.wf.abweichung', { grund: f.abweichung })}</p>` : ''
  let berichtHtml = `<p class="pl-keine" data-pl-bericht="keiner">${tHtml('plugins.wf.bericht.keiner')}</p>`
  if (b !== null) {
    const befunde = Array.isArray(b.befunde) ? b.befunde : []
    const auflagen = Array.isArray(b.auflagen) ? b.auflagen : []
    berichtHtml = `<div class="pl-wf-bericht" data-pl-bericht="${b.passt === true ? 'passt' : 'anderer'}">
      <p class="pl-keine">${tHtml('plugins.wf.bericht.kopf', { zeit: formatiereUhrzeit(b.erstellt_am) ?? String(b.erstellt_am ?? '—') }, { urteil: `<strong>${codeText(URTEILE, 'plugins.wf.urteil', b.urteil)}</strong>` })}</p>
      ${b.passt === true ? '' : `<p class="pl-ordner-hinweis">${tHtml('plugins.wf.bericht.anderer', {}, { hash: code(String(b.kopie_hash ?? '').slice(0, 12)) })}</p>`}
      ${typeof b.zusammenfassung === 'string' && b.zusammenfassung !== '' ? `<p data-pl-zusammenfassung>${escapeHtml(b.zusammenfassung)}</p>` : ''}
      ${befunde.length === 0 ? '' : `<p class="pl-keine pl-wf-zwischen">${tHtml('plugins.wf.bericht.befunde')}</p><ul class="pl-risiken">${befunde.map((x) => `<li data-pl-befund><span class="ablauf-status ${schwereKlasse(x?.schwere)}">${codeText(SCHWEREN, 'plugins.wf.schwere', String(x?.schwere ?? ''))}</span> ${code(String(x?.bereich ?? ''))} <span class="pl-risiko-text">${escapeHtml(String(x?.beleg ?? ''))}</span></li>`).join('')}</ul>`}
      ${auflagen.length === 0 ? '' : `<p class="pl-keine pl-wf-zwischen">${tHtml('plugins.wf.bericht.auflagen')}</p><ul class="pl-teile">${auflagen.map((a) => `<li data-pl-auflage>${escapeHtml(String(a))}</li>`).join('')}</ul>`}
    </div>`
  }
  const uebernommen = Array.isArray(kopie.uebernommen) ? kopie.uebernommen : []
  const mitTeilen = uebernommen.some((u) => u.typ === 'skill' || u.typ === 'agent')
  const pruefenHier = antwort?.workforce?.pruefen_hier === true
  const sperrId = `pl-wf-sperre-${index}`
  const kannPruefen = sperre === null && !laeuft && kopie.ok === true && mitTeilen && pruefenHier
  const kannFreigeben = sperre === null && !laeuft && kopie.ok === true && b?.passt === true && wf.freigabe_sperre === null && zustand !== 'freigegeben'
  const kannZuruecknehmen = sperre === null && !laeuft && typeof f.kopie_hash === 'string'
  const prueft = b === null || b.passt !== true
  const knoepfe = [
    pruefenHier ? aktionsKnopf('pruefen', index, b !== null ? 'plugins.wf.knopf.erneut' : 'plugins.wf.knopf.pruefen', kannPruefen, kannPruefen && prueft && zustand !== 'freigegeben', sperre !== null ? sperrId : null) : '',
    aktionsKnopf('freigeben', index, 'plugins.wf.knopf.freigeben', kannFreigeben, kannFreigeben, sperre !== null ? sperrId : null),
    typeof f.kopie_hash === 'string' ? aktionsKnopf('zuruecknehmen', index, 'plugins.wf.knopf.zuruecknehmen', kannZuruecknehmen, false, sperre !== null ? sperrId : null) : '',
  ].join('')
  const hinweise = [
    sperre === null ? '' : `<p class="pl-ordner-hinweis" id="${sperrId}" data-pl-sperre>${tHtml(sperre)}</p>`,
    pruefenHier ? '' : `<p class="pl-ordner-hinweis" data-pl-pruefen-woanders>${tHtml('plugins.wf.pruefenWorkforce')}</p>`,
    kopie.ok === true && !mitTeilen ? `<p class="pl-ordner-hinweis" data-pl-ohne-teile>${tHtml('plugins.wf.ohneTeile')}</p>` : '',
  ].join('')
  // Status und Meldung sind fokussierbar (aktionsStatus); angesagt wird über die feste Live-Region #plugins-status (F-1094 (8),
  // Entscheidung Challenger 14.10.2026).
  const status = aktionsStatus(pluginId, aktion)
  return `<section class="pl-abschnitt" data-pl-wf="freigabe"><h4 class="pl-abschnitt-titel">${tHtml('plugins.wf.titel.freigabe')}</h4><p class="pl-keine">${freigabeChip(zustand)}</p>${seit}${abw}${berichtHtml}${hinweise}<div class="pl-aktionen">${knoepfe}</div>${status}</section>`
}

/**
 * Teil „In die Workforce übernommen“: übernommen als Liste, nicht übernommen aufklappbar (design-guardian 5).
 * @param wf - plugin.workforce
 * @returns HTML
 */
function uebernahmeTeil(wf) {
  const kopie = wf.kopie ?? {}
  const uebernommen = Array.isArray(kopie.uebernommen) ? kopie.uebernommen : []
  const nicht = Array.isArray(kopie.nicht_uebernommen) ? kopie.nicht_uebernommen : []
  const typ = (x) => codeText(KOPIE_TYPEN, 'plugins.wf.typ', x)
  const uebernahme =
    kopie.ok === true
      ? `<p class="pl-keine">${tHtml('plugins.wf.uebernommen', { zahl: formatiereZahl(uebernommen.length) })}</p>${uebernommen.length === 0 ? '' : `<ul class="pl-teile" data-pl-uebernommen>${uebernommen.map((u) => `<li data-pl-teil-typ="${escapeHtml(u.typ)}">${typ(u.typ)} ${code(u.name)}</li>`).join('')}</ul>`}${uebernommen.some((u) => u.typ === 'command') ? `<p class="pl-ordner-hinweis">${tHtml('plugins.wf.commandHinweis')}</p>` : ''}`
      : `<div class="note red pl-band" data-pl-kopie="nicht">${tHtml('plugins.wf.kopieNicht', { grund: String(kopie.grund ?? '—') })}</div>`
  const nichtHtml =
    nicht.length === 0
      ? ''
      : `<details class="pl-teil pl-wf-zwischen" data-pl-nicht-uebernommen-block><summary>${tHtml('plugins.wf.nichtUebernommen', { zahl: formatiereZahl(nicht.length) })}</summary><ul class="pl-teile" data-pl-nicht-uebernommen>${nicht.map((n) => `<li data-pl-grund="${escapeHtml(n.grund)}">${typ(n.typ)} ${code(n.name)} <span class="pl-risiko-text">${codeText(GRUENDE, 'plugins.wf.grund', n.grund)}${typeof n.detail === 'string' && n.detail !== '' ? ` · ${code(n.detail)}` : ''}</span></li>`).join('')}</ul></details>`
  return `<section class="pl-abschnitt" data-pl-wf="uebernahme"><h4 class="pl-abschnitt-titel">${tHtml('plugins.wf.titel.uebernahme')}</h4>${uebernahme}${nichtHtml}</section>`
}

/**
 * Teil „Zuordnung je Rolle“: je übernommenem Skill/Agent ein Kästchen je Rolle; gespeicherte Zuordnungen zu Teilen, die nicht
 * mehr in der Kopie stehen, bleiben sichtbar und abwählbar (QA 3).
 * @param antwort - PluginAntwort
 * @param wf - plugin.workforce
 * @param index - Index des Plugins
 * @param aktion - Aktion oder null
 * @param sperre - pluginSperre(antwort)
 * @returns HTML
 */
function zuordnungTeil(antwort, wf, index, aktion, sperre) {
  const laeuft = aktion?.phase === 'laeuft'
  const kopie = wf.kopie ?? {}
  const uebernommen = Array.isArray(kopie.uebernommen) ? kopie.uebernommen : []
  const zuordnung = (Array.isArray(wf.zuordnung) ? wf.zuordnung : []).filter((z) => z !== null && typeof z === 'object')
  const rollen = (Array.isArray(antwort?.workforce?.rollen) ? antwort.workforce.rollen : []).filter((r) => typeof r === 'string')
  const gueltig = wf.freigabe?.zustand === 'freigegeben'
  const typ = (x) => codeText(KOPIE_TYPEN, 'plugins.wf.typ', x)
  const hinweisId = `pl-wf-zuordnung-hinweis-${index}`
  const zuordenbar = uebernommen.filter((u) => u.typ === 'skill' || u.typ === 'agent').map((u) => ({ typ: u.typ, name: u.name, verwaist: false }))
  const weg = zuordnung.filter((z) => !zuordenbar.some((u) => u.typ === z.typ && u.name === z.name)).map((z) => ({ typ: z.typ, name: z.name, verwaist: true }))
  const zeilen = [...zuordenbar, ...weg.filter((w, i) => weg.findIndex((x) => x.typ === w.typ && x.name === w.name) === i)]
  const zeile = (u) =>
    `<li${u.verwaist ? ' data-pl-zuordnung-verwaist' : ''}><span>${typ(u.typ)} ${code(u.name)}${u.verwaist ? ` <span class="pl-art">${tHtml('plugins.wf.zuordnung.nichtMehr')}</span>` : ''}</span><span class="pl-zuordnung-rollen">${rollen
      .map((rolle) => {
        const an = zuordnung.some((z) => z.rolle === rolle && z.typ === u.typ && z.name === u.name)
        const bedienbar = sperre === null && !laeuft && ((gueltig && !u.verwaist) || an)
        const label = codeText(ROLLEN, 'plugins.wf.rolle', rolle)
        const beschrieben = bedienbar ? '' : ` aria-describedby="${sperre !== null ? `pl-wf-sperre-${index}` : hinweisId}"`
        return `<label class="check"><input type="checkbox" data-pl-zuordnung data-pl-index="${index}" data-pl-typ="${escapeHtml(u.typ)}" data-pl-name="${escapeHtml(u.name)}" data-pl-rolle="${escapeHtml(rolle)}" aria-label="${escapeHtml(t('plugins.wf.zuordnung.kaestchen', { name: u.name, rolle: t(ROLLEN.has(rolle) ? `plugins.wf.rolle.${rolle}` : rolle) }))}"${an ? ' checked' : ''}${bedienbar ? '' : ' disabled'}${beschrieben} /><span>${label}</span></label>`
      })
      .join('')}</span></li>`
  const hinweis = gueltig ? '' : `<p class="pl-ordner-hinweis" id="${hinweisId}" data-pl-zuordnung-hinweis>${tHtml(zuordnung.length > 0 ? 'plugins.wf.zuordnung.wirktNicht' : 'plugins.wf.zuordnung.ohneFreigabe')}</p>`
  const inhalt = zeilen.length === 0 ? `<p class="pl-keine">${tHtml('plugins.wf.zuordnung.leer')}</p>` : `${hinweis}<ul class="pl-teile pl-zuordnung">${zeilen.map(zeile).join('')}</ul>`
  return `<section class="pl-abschnitt" data-pl-wf="zuordnung"><h4 class="pl-abschnitt-titel">${tHtml('plugins.wf.titel.zuordnung')}</h4><p class="pl-ordner-hinweis">${tHtml('plugins.wf.zuordnung.hinweis')}</p>${inhalt}</section>`
}

/**
 * F45 F-3b-1: Workforce-Abschnitt des Details — Prüfung und Freigabe (zuerst, design-guardian 5), übernommen / nicht übernommen,
 * Zuordnung je Rolle. Jede Zeichenkette der Route nur über escapeHtml; Codes über i18n (unbekannte roh).
 * @param antwort - PluginAntwort (status ok)
 * @param plugin - PluginEintrag mit workforce
 * @param index - Index des Plugins
 * @param aktion - laufende/gescheiterte Aktion oder null
 * @returns HTML (leer ohne workforce, älterer Server)
 */
export function renderPluginWorkforce(antwort, plugin, index, aktion) {
  const wf = plugin?.workforce
  if (wf === null || typeof wf !== 'object') return ''
  const sperre = pluginSperre(antwort)
  return `${freigabeTeil(antwort, wf, index, aktion, sperre, String(plugin.id ?? ''))}${uebernahmeTeil(wf)}${zuordnungTeil(antwort, wf, index, aktion, sperre)}`
}

/**
 * F45 F-3b-1 (QA 2): Freigaben und Zuordnungen zu Plugins, die nicht mehr in Claude Code installiert sind — sichtbar und
 * zurücknehmbar (data-pl-verwaist-aktion, Plugin-id in data-pl-id).
 * @param antwort - PluginAntwort (status ok)
 * @param aktionen - Aktionen je Plugin-id
 * @returns HTML (leer ohne verwaiste Einträge)
 */
export function renderVerwaist(antwort, aktionen = {}) {
  const liste = Array.isArray(antwort?.workforce?.verwaist) ? antwort.workforce.verwaist : []
  if (liste.length === 0) return ''
  const sperre = pluginSperre(antwort)
  const eintrag = (v) => {
    const id = String(v?.plugin_id ?? '')
    const aktion = aktionen[id] ?? null
    const an = sperre === null && aktion?.phase !== 'laeuft'
    const knopf = (art, text, extra = '') => `<button type="button" class="button" data-pl-verwaist-aktion="${art}" data-pl-id="${escapeHtml(id)}"${extra}${an ? '' : ' disabled'}>${tHtml(text)}</button>`
    const zuordnungen = (Array.isArray(v?.zuordnung) ? v.zuordnung : []).map((z) => `<li>${codeText(KOPIE_TYPEN, 'plugins.wf.typ', z?.typ)} ${code(String(z?.name ?? ''))} · ${codeText(ROLLEN, 'plugins.wf.rolle', z?.rolle)} ${knopf('zuordnung', 'plugins.wf.verwaist.zuordnungEntfernen', ` data-pl-rolle="${escapeHtml(String(z?.rolle ?? ''))}" data-pl-typ="${escapeHtml(String(z?.typ ?? ''))}" data-pl-name="${escapeHtml(String(z?.name ?? ''))}"`)}</li>`)
    const fehler = aktionsStatus(id, aktion)
    return `<li data-pl-verwaist="${escapeHtml(id)}">${code(id)}${v?.freigabe !== null && typeof v?.freigabe === 'object' ? `<span class="pl-feld">${tHtml('plugins.wf.verwaist.freigabe')} ${knopf('zuruecknehmen', 'plugins.wf.knopf.zuruecknehmen')}</span>` : ''}${zuordnungen.length > 0 ? `<ul class="pl-teile">${zuordnungen.join('')}</ul>` : ''}${fehler}</li>`
  }
  return `<section class="pl-eingebaut pl-verwaist" aria-labelledby="plugins-verwaist-titel"><h3 id="plugins-verwaist-titel" class="pl-abschnitt-titel" tabindex="-1">${tHtml('plugins.wf.verwaist.titel')}</h3><p class="pl-messung">${tHtml('plugins.wf.verwaist.text')}</p><ul class="pl-eingebaut-liste">${liste.map(eintrag).join('')}</ul></section>`
}

/**
 * Detail des gewählten Plugins (oder Leertext).
 * @param antwort - PluginAntwort mit status 'ok'
 * @param auswahl - Index oder null
 * @returns HTML (Inhalt des Detail-Bereichs)
 */
export function renderPluginDetail(antwort, auswahl, aktionen = {}) {
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
    ${renderPluginWorkforce(antwort, plugin, auswahl, aktionen[plugin.id] ?? null)}
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
  const kopf = `<p class="pl-kopf" id="plugins-kopf" tabindex="-1">${tHtml('plugins.kopf', { anzahl, zahl: formatiereZahl(anzahl), zeit: formatiereUhrzeit(zustand.geladen_am) ?? '—' }, { ordner: typeof antwort.instanz_pfad === 'string' ? code(antwort.instanz_pfad) : textOderStrich(null), befehl: code(antwort.quelle?.befehl ?? '—') })}</p>`
  const inhalt =
    anzahl === 0
      ? renderPluginListe(antwort, null)
      : `<div class="library-raster pl-raster"><div class="library-liste">${renderPluginListe(antwort, auswahl)}</div><aside id="plugins-detail" class="library-detail pl-detail" ${auswahl === null || antwort.plugins[auswahl] === undefined ? `aria-label="${escapeHtml(t('plugins.detail.bereich'))}"` : 'aria-labelledby="plugins-detail-titel"'} tabindex="-1">${renderPluginDetail(antwort, auswahl, zustand.aktionen ?? {})}</aside></div>`
  return `${kopf}${inhalt}${renderVerwaist(antwort, zustand.aktionen ?? {})}${renderEingebaut(antwort)}`
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
 * @returns { beiReiterwahl, neuLaden, waehle, zuruecksetzen, generation, setzeAktion, zustand }
 */
export function erzeugePluginSteuerung({ hole, zeichne }) {
  let zustand = { art: 'nicht_geladen', antwort: null, auswahl: null, grund: '', geladen_am: null, aktionen: {} }
  let zaehler = 0
  let auswahlSchluessel = null
  // F45 F-3b-1: laufende bzw. gescheiterte Aktion je Plugin-id (Prüfung, Freigabe, Rücknahme, Zuordnung) — überdauert ein Neuladen.
  let aktionen = {}
  // Code-Review 3 / QA 6: zählt jeden Projektwechsel; eine Aktion, die über einen Wechsel hinweg endet, setzt und lädt nichts mehr.
  let generation = 0
  const setze = (neu) => {
    zustand = { antwort: null, auswahl: null, grund: '', geladen_am: null, ...neu, aktionen }
    zeichne(zustand)
  }
  /**
   * Lädt den Bestand. still (F-1094 (8)): steht schon eine Antwort, bleibt sie bis zur neuen sichtbar (kein Ladezustand) — so
   * verliert ein Fokus auf Meldung oder Bedienelement nach einer Aktion nie sein Element an einen leeren Ladezustand.
   * @param optionen - { still?: boolean }
   */
  async function lade(optionen = {}) {
    const meine = ++zaehler
    if (!(optionen?.still === true && zustand.art === 'ok')) setze({ art: 'laedt' })
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
    beiReiterwahl: () => lade(),
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
      aktionen = {}
      generation++
      setze({ art: 'nicht_geladen' })
    },
    /** @returns Generation (steigt bei jedem Projektwechsel) */
    generation: () => generation,
    /**
     * F45 F-3b-1: Aktion eines Plugins setzen (null = keine) und neu zeichnen — ohne Abruf.
     * @param pluginId - Plugin-id
     * @param aktion - { art, phase: 'laeuft' | 'fehler', grund? } oder null
     */
    setzeAktion(pluginId, aktion) {
      const rest = { ...aktionen }
      if (aktion === null) delete rest[pluginId]
      else rest[pluginId] = aktion
      aktionen = rest
      setze({ ...zustand })
    },
    zustand: () => zustand,
  }
}
