/**
 * Datei: scripts/leitstand/routen-plugin-freigabe.mjs
 *
 * Zweck: Bausteine der Plugin-Freigabe im Leitstand (F45 F-3b-1, Plan features/F45/plan-f3b.md v2.1; Arbeitsregel M5: der
 * Server registriert die Routen und hält Laufsperre/D13, die Abläufe stehen hier, die Regeln in src/plugin-kopie):
 * - pruefePluginKoerper: Körper von POST …/plugins/pruefung | freigabe | freigabe/ruecknahme | zuordnung;
 * - ergaenzePluginBestand: GET …/plugins additiv je Plugin um `workforce` (Kopie übernommen/nicht übernommen, Freigabe-Zustand,
 *   neuester Prüfbericht, Sperre der Freigabe, Zuordnung dieses Projekts) und oben um `workforce` (zuordenbare Rollen, Stand
 *   der lokalen Datei);
 * - bereitePluginPruefungVor: Bestand frisch → eindeutiges Plugin → Projektion → kopie_hash = angezeigt → Subjekt, Quelle und
 *   holen() für den bestehenden Prüflauf (starteEignungspruefung); holen legt eine neutralisierte Temp-Kopie ab;
 * - fuehrePluginFreigabeDurch: Reihenfolge nach Advisor N1 (Bestand → Projektion → Hash in Body/Projektion/Bericht gleich →
 *   Kopie schreiben → vergleicheInhalt → Laufsperre und stand erneut → aendereLokaleDatei);
 * - fuehrePluginRuecknahmeDurch, fuehrePluginZuordnungDurch.
 *
 * Wird aufgerufen von: scripts/leitstand-server.mjs, scripts/leitstand/routen-plugin-freigabe.test.mjs,
 * scripts/check-f45-f3b1-freigabe.mjs.
 *
 * Wichtig:
 * - Kein Lauf ändert sich (F-3b-1): nichts hier wirkt auf Startargumente oder Init-Gate; die Zuordnung wirkt erst mit F-3b-2.
 * - Unter ~/.claude wird nie geschrieben. Geschrieben werden nur die lokale Fähigkeiten-Datei (über aendere = aendereLokaleDatei)
 *   und die Kopie unter der Kopie-Wurzel (schreibeKopie), beides nur auf direkte Eingabe.
 * - Der Auftrag des Prüflaufs nennt nicht übernommene Teile nur mit Art, Name und Grund-Code — keine Befehle, Argumente, URLs
 *   (Advisor F5, F-1091 (12)).
 */

import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PLUGIN_ROLLEN, projektEinstellungen, SHA256_MUSTER, zuordnungsEintrag } from '../../src/faehigkeiten/index.ts'
import { berichtDerFreigabe, ermittlePluginStand, leseKopieQuelle, loesePluginAuf, projiziereKopie, pruefePluginId, schreibeKopie } from '../../src/plugin-kopie/index.ts'
import { pluginBerichtSchluessel, PRUEFBERICHT_PRAEFIX, vergleicheInhalt, waehleBericht } from '../../src/sammlung/pruefbericht.ts'
import { legeLokalenInhaltAb } from '../../src/sammlung/quelle.ts'
import { PRUEF_TEMP_PRAEFIX } from './routen-pruefung.mjs'

/** Felder je Körper. */
const FELDER = {
  pruefung: ['plugin_id', 'kopie_hash'],
  freigabe: ['plugin_id', 'kopie_hash', 'pruefbericht', 'stand'],
  ruecknahme: ['plugin_id', 'stand'],
  zuordnung: ['plugin_id', 'rolle', 'typ', 'name', 'an', 'stand'],
}

/** Kennung eines Berichts '<artefakt_id>@<version>'. */
const BERICHT_KENNUNG = /^pruefbericht-[a-z0-9][a-z0-9-]*@[1-9][0-9]*$/

/**
 * Prüft die Form eines Körpers (ohne Bestand).
 * @param body - geparster Körper
 * @param art - 'pruefung' | 'freigabe' | 'ruecknahme' | 'zuordnung'
 * @returns { ok: true, … } oder { ok: false, status: 400, grund }
 */
export function pruefePluginKoerper(body, art) {
  const nein = (grund) => ({ ok: false, status: 400, grund })
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return nein('Körper muss ein Objekt sein')
  for (const k of Object.keys(body)) if (!FELDER[art].includes(k)) return nein(`unbekanntes Feld '${k}'`)
  const idGrund = pruefePluginId(body.plugin_id)
  if (idGrund !== null) return nein(idGrund)
  const erg = { ok: true, pluginId: body.plugin_id }
  if (art === 'pruefung' || art === 'freigabe') {
    if (typeof body.kopie_hash !== 'string' || !SHA256_MUSTER.test(body.kopie_hash)) return nein("'kopie_hash' muss ein sha256 sein (angezeigter Stand)")
    erg.kopieHash = body.kopie_hash
  }
  if (art === 'freigabe') {
    if (typeof body.pruefbericht !== 'string' || !BERICHT_KENNUNG.test(body.pruefbericht)) return nein("'pruefbericht' muss der angezeigte Bericht '<artefakt_id>@<version>' sein")
    erg.pruefbericht = body.pruefbericht
  }
  if (art !== 'pruefung') {
    if (body.stand !== undefined && (typeof body.stand !== 'string' || !/^([0-9a-f]{64}|fehlt)$/.test(body.stand))) return nein("'stand' muss ein sha256 oder 'fehlt' sein")
    erg.stand = body.stand
  }
  if (art === 'zuordnung') {
    if (!PLUGIN_ROLLEN.includes(body.rolle)) return nein(`'rolle' ist nicht zuordenbar (nur ${PLUGIN_ROLLEN.join(', ')})`)
    if (body.typ !== 'skill' && body.typ !== 'agent') return nein("'typ' muss 'skill' oder 'agent' sein (Commands sind nicht zuordenbar)")
    const eintrag = typeof body.name === 'string' ? zuordnungsEintrag(body.typ, body.plugin_id, body.name) : null
    if (eintrag === null) return nein("'name' ist kein schlichter Name")
    if (typeof body.an !== 'boolean') return nein("'an' muss true oder false sein")
    Object.assign(erg, { rolle: body.rolle, typ: body.typ, name: body.name, an: body.an, eintrag })
  }
  return erg
}

/**
 * Status-Code für eine Auflösung, die nicht eindeutig ist.
 * @param art - AufloesungArt
 * @param pluginId - id
 * @returns { status, grund }
 */
function aufloesungFehler(art, pluginId) {
  if (art === 'fehlt') return { ok: false, status: 404, grund: `Plugin '${pluginId}' ist in Claude Code nicht (mehr) installiert` }
  if (art === 'mehrdeutig') return { ok: false, status: 409, grund: `Plugin '${pluginId}' steht mehrfach im Bestand (mehrere Scopes oder nur Schreibweise verschieden) — nicht eindeutig` }
  return { ok: false, status: 503, grund: 'Plugin-Bestand nicht bestimmbar — neu laden' }
}

/**
 * Bestand lesen, Plugin auflösen, projizieren (gemeinsamer Anfang von Prüfstart, Freigabe und Zuordnung).
 * @param pluginId - id
 * @param ctx - { leseBestand, werkzeugsatz }
 * @returns { ok, plugin, projektion } oder Fehler
 */
async function projiziereAktuell(pluginId, ctx) {
  const bestand = await ctx.leseBestand()
  const aufl = loesePluginAuf(bestand, pluginId)
  if (aufl.art !== 'eindeutig') return aufloesungFehler(aufl.art, pluginId)
  const quelle = await leseKopieQuelle(aufl.plugin.pfad)
  if (!quelle.ok) return { ok: false, status: 422, grund: quelle.grund }
  const projektion = projiziereKopie({ pluginId, quelle: quelle.quelle, bestandteile: aufl.plugin.bestandteile, werkzeugsatz: ctx.werkzeugsatz })
  if (!projektion.ok) return { ok: false, status: 422, grund: projektion.grund }
  return { ok: true, plugin: aufl.plugin, projektion }
}

/**
 * Ergänzt den (ungeschwärzten) Bestand um den Workforce-Stand je Plugin; maskiert wird danach im Abruf. Wirft nie: ein
 * Fehler je Plugin wird zum Zustand 'unbestimmbar'.
 * @param bestand - PluginBestand (status ok)
 * Seit der Korrekturrunde zusätzlich oben: pruefen_hier (nur die Workforce-Instanz startet Prüfläufe, QA 1), lokale_datei.fremd
 * (unbestätigte Änderung von außen sperrt wie eine ungültige Datei, QA 4) und verwaist (Freigaben/Zuordnungen zu Plugins, die nicht
 * mehr im Bestand stehen — sichtbar und zurücknehmbar, QA 2).
 * @param ctx - { lokal (LokaleDatei), berichte, kopienWurzel, werkzeugsatz, projektId, standHash, laufSperre, fremd, pruefenHier }
 * @returns ergänzter Bestand
 */
export async function ergaenzePluginBestand(bestand, ctx) {
  const freigaben = ctx.lokal.zustand === 'ungueltig' ? {} : (ctx.lokal.daten.plugin_freigaben ?? {})
  const zuordnung = ctx.lokal.zustand === 'ungueltig' ? {} : (projektEinstellungen(ctx.lokal.daten, ctx.projektId).plugin_zuordnung ?? {})
  const ids = new Set(bestand.plugins.map((p) => p.id))
  const alleZuordnungen = Object.entries(zuordnung).flatMap(([rolle, liste]) => liste.map((x) => ({ rolle, ...zerlegeZuordnung(x) })).filter((z) => z.plugin !== null))
  const verwaistIds = [...new Set([...Object.keys(freigaben), ...alleZuordnungen.map((z) => z.plugin)])].filter((id) => !ids.has(id)).sort()
  const verwaist = verwaistIds.map((id) => ({
    plugin_id: id,
    freigabe: Object.hasOwn(freigaben, id) ? { kopie_hash: freigaben[id].kopie_hash, freigegeben_am: freigaben[id].freigegeben_am } : null,
    zuordnung: alleZuordnungen.filter((z) => z.plugin === id).map(({ rolle, typ, name }) => ({ rolle, typ, name })),
  }))
  const plugins = []
  for (const p of bestand.plugins) {
    const eigene = alleZuordnungen.filter((z) => z.plugin === p.id).map(({ rolle, typ, name }) => ({ rolle, typ, name }))
    let stand
    try {
      stand = await ermittlePluginStand({ plugin: p, aufloesung: loesePluginAuf(bestand, p.id).art, freigabe: Object.hasOwn(freigaben, p.id) ? freigaben[p.id] : undefined, berichte: ctx.berichte, kopienWurzel: ctx.kopienWurzel, werkzeugsatz: ctx.werkzeugsatz })
    } catch (fehler) {
      console.error(`[leitstand] Plugin-Stand '${p.id}' nicht bestimmbar:`, fehler)
      stand = { kopie: { ok: false, kopie_hash: null, grund: `nicht bestimmbar: ${fehler.message}`, uebernommen: [], nicht_uebernommen: [] }, freigabe: { zustand: 'unbestimmbar', kopie_hash: null, pruefbericht: null, freigegeben_am: null, abweichung: null }, pruefbericht: null, freigabe_sperre: 'nicht bestimmbar' }
    }
    plugins.push({ ...p, workforce: { ...stand, zuordnung: eigene } })
  }
  return {
    ...bestand,
    plugins,
    workforce: {
      rollen: [...PLUGIN_ROLLEN],
      lokale_datei: { zustand: ctx.lokal.zustand, grund: ctx.lokal.zustand === 'ungueltig' ? ctx.lokal.grund : null, stand: ctx.standHash ?? null, fremd: ctx.fremd !== null && ctx.fremd !== undefined },
      lauf_sperre: ctx.laufSperre ?? { aktiv: false },
      kopien_wurzel_gesetzt: ctx.kopienWurzel !== null,
      pruefen_hier: ctx.pruefenHier === true,
      verwaist,
    },
  }
}

/**
 * Zerlegt einen Eintrag der Zuordnung '<typ>:<plugin-id>:<name>'.
 * @param eintrag - Eintrag
 * @returns { typ, plugin, name } (plugin null bei falscher Form)
 */
function zerlegeZuordnung(eintrag) {
  const typ = eintrag.slice(0, eintrag.indexOf(':'))
  const rest = eintrag.slice(typ.length + 1)
  const trenner = rest.lastIndexOf(':')
  return trenner <= 0 || (typ !== 'skill' && typ !== 'agent') ? { typ, plugin: null, name: '' } : { typ, plugin: rest.slice(0, trenner), name: rest.slice(trenner + 1) }
}

/**
 * Auftragszusatz des Prüflaufs für ein Plugin: nicht übernommene Teile nur mit Art, Name und Grund-Code; Risiko-Fakten nur
 * der übernommenen Teile (Text-Fakten mit Datei:Zeile, Agent-Werkzeuge). Keine Befehle, Argumente, URLs (Advisor F5).
 * @param plugin - PluginEintrag
 * @param projektion - Projektion (ok)
 * @returns { nicht_uebernommen: string[], risiken: string[] }
 */
export function pluginPruefZusatz(plugin, projektion) {
  const uebernommen = new Set(projektion.uebernommen.map((t) => `${t.typ}:${t.name}`))
  const risiken = (plugin.risiken ?? []).filter((r) => uebernommen.has(r.bestandteil) && (r.art.startsWith('text_') || r.art === 'agent_werkzeuge')).map((r) => `${r.art} ${r.bestandteil}: ${r.text}`)
  return { nicht_uebernommen: projektion.nicht_uebernommen.map((n) => `${n.typ} ${n.name} (${n.grund})`), risiken }
}

/**
 * Bereitet den Prüflauf eines Plugins vor (ohne zu schreiben): Subjekt und Quelle für starteEignungspruefung und holen().
 * @param koerper - pruefePluginKoerper(…, 'pruefung')
 * @param ctx - { leseBestand, werkzeugsatz }
 * @returns { ok, subjekt, quelle, herkunft, holen } oder { ok:false, status, grund }
 */
export async function bereitePluginPruefungVor(koerper, ctx) {
  const aktuell = await projiziereAktuell(koerper.pluginId, ctx)
  if (!aktuell.ok) return aktuell
  const { plugin, projektion } = aktuell
  if (projektion.kopie_hash !== koerper.kopieHash) return { ok: false, status: 409, grund: 'Das Plugin hat sich seit der Anzeige geändert (anderer Stand der Kopie) — neu laden, nichts gestartet' }
  // QA 8: ohne zuordenbaren Skill/Agent hätte ein Prüflauf (Modell) keinen Nutzen.
  if (!projektion.uebernommen.some((t) => t.typ === 'skill' || t.typ === 'agent')) return { ok: false, status: 422, grund: 'Die Kopie enthält keinen Skill und keinen Agent — nichts zu prüfen' }
  const zusatz = pluginPruefZusatz(plugin, projektion)
  const subjekt = {
    schluessel: pluginBerichtSchluessel(plugin.id).slice(PRUEFBERICHT_PRAEFIX.length),
    katalog_id: null,
    sammlung_id: null,
    name: plugin.id,
    typ: 'plugin',
    roh: null,
    urteil_sammlung: null,
    urteil_bedeutung: null,
    ausgeschlossen: false,
    sammlung: null,
    katalog: null,
    plugin: zusatz,
  }
  const quelle = { art: 'plugin', plugin_id: plugin.id, kopie_hash: projektion.kopie_hash, plugin_version: typeof plugin.version === 'string' && plugin.version !== '' ? plugin.version : null, commit: typeof plugin.commit === 'string' && /^[0-9a-f]{40}$/.test(plugin.commit) ? plugin.commit : null }
  // holen: eigene Temp-Wurzel (raeumeAuf löscht sie), nie die Kopie-Wurzel (Advisor F4a); Neutralisierung im Schreiber (F4b).
  const holen = async () => {
    const wurzel = mkdtempSync(join(tmpdir(), PRUEF_TEMP_PRAEFIX))
    try {
      return { wurzel, ergebnis: legeLokalenInhaltAb(projektion.dateien, wurzel) }
    } catch (fehler) {
      console.error('[pruefung] Plugin-Kopie nicht ablegbar:', fehler)
      return { wurzel, ergebnis: { ok: false, status: 500, grund: `Plugin-Kopie nicht ablegbar: ${fehler.message}` } }
    }
  }
  return { ok: true, subjekt, quelle, herkunft: { commit_zeit: null, geaendert: null, pfleger: [], lizenz_registry: null }, holen }
}

/**
 * Freigabe eines Plugins (Reihenfolge Advisor N1, Kopf der Datei). Alles nach dem asynchronen Bestandsabruf ist synchron.
 * @param koerper - pruefePluginKoerper(…, 'freigabe')
 * @param ctx - { leseBestand, werkzeugsatz, berichte: () => Bericht[], kopienWurzel, laufGesperrt: () => string | null, aendere: (aenderung, stand) => Ergebnis, jetzt?: () => string }
 * @returns { ok: true, ergebnis, kopie } oder { ok: false, status, grund }
 */
export async function fuehrePluginFreigabeDurch(koerper, ctx) {
  const aktuell = await projiziereAktuell(koerper.pluginId, ctx)
  if (!aktuell.ok) return aktuell
  const { projektion } = aktuell
  if (projektion.kopie_hash !== koerper.kopieHash) return { ok: false, status: 409, grund: 'Das Plugin hat sich seit der Anzeige geändert (anderer Stand der Kopie) — neu laden und neu prüfen, nichts freigegeben' }
  const wahl = waehleBericht(ctx.berichte(), { art: 'plugin', plugin_id: koerper.pluginId, kopie_hash: koerper.kopieHash })
  if (wahl.bericht === null || wahl.sperre !== null) return { ok: false, status: 409, grund: `${wahl.sperre ?? 'ohne Prüfbericht'} — nichts freigegeben` }
  const kennung = `${wahl.bericht.artefakt_id}@${wahl.bericht.version}`
  if (kennung !== koerper.pruefbericht) return { ok: false, status: 409, grund: 'Inzwischen gilt ein anderer Prüfbericht als der angezeigte — neu laden und lesen, nichts freigegeben' }
  if (ctx.kopienWurzel === null) return { ok: false, status: 500, grund: 'Diese Instanz hat keine Ablage für Plugin-Kopien (nur der reale Leitstand setzt sie) — nichts freigegeben' }
  const kopie = schreibeKopie(ctx.kopienWurzel, koerper.pluginId, projektion)
  if (!kopie.ok) return kopie
  const abweichung = vergleicheInhalt(wahl.bericht, kopie.ordner, { unterpfad: '' })
  if (abweichung !== null) return { ok: false, status: 409, grund: `Kopie entspricht nicht dem Prüfbericht: ${abweichung} — nichts freigegeben` }
  // Laufsperre erneut unmittelbar vor dem synchronen Schreiben (Advisor F6) — zwischen Abruf und hier kann ein Lauf begonnen haben.
  const gesperrt = ctx.laufGesperrt()
  if (gesperrt !== null) return { ok: false, status: 409, grund: `${gesperrt} — nichts freigegeben (die Kopie bleibt ohne Freigabe liegen)` }
  const freigabe = { kopie_hash: koerper.kopieHash, pruefbericht: kennung, freigegeben_am: (ctx.jetzt ?? (() => new Date().toISOString()))() }
  const ergebnis = ctx.aendere({ art: 'plugin_freigabe', pluginId: koerper.pluginId, freigabe }, koerper.stand)
  if (!ergebnis.ok) return ergebnis
  return { ok: true, ergebnis, freigabe, kopie: { ordner: kopie.ordner, neu: kopie.neu } }
}

/**
 * Rücknahme einer Plugin-Freigabe (synchron; Zuordnungen bleiben gespeichert, wirken aber nicht).
 * @param koerper - pruefePluginKoerper(…, 'ruecknahme')
 * @param ctx - { freigaben, laufGesperrt, aendere }
 * @returns { ok, ergebnis } oder Fehler (404 ohne bestehende Freigabe — nichts geschrieben, Code-Review H4)
 */
export function fuehrePluginRuecknahmeDurch(koerper, ctx) {
  if (!Object.hasOwn(ctx.freigaben(), koerper.pluginId)) return { ok: false, status: 404, grund: 'Für dieses Plugin besteht keine Freigabe — nichts geändert' }
  const gesperrt = ctx.laufGesperrt()
  if (gesperrt !== null) return { ok: false, status: 409, grund: `${gesperrt} — nichts geändert` }
  const ergebnis = ctx.aendere({ art: 'plugin_ruecknahme', pluginId: koerper.pluginId }, koerper.stand)
  return ergebnis.ok ? { ok: true, ergebnis } : ergebnis
}

/**
 * Zuordnung eines Plugin-Skills/-Agents zu einer Rolle: einschalten nur mit gültiger Freigabe (Zustand 'freigegeben') und nur
 * für einen übernommenen Bestandteil; ausschalten immer (auch ohne Freigabe).
 * @param koerper - pruefePluginKoerper(…, 'zuordnung')
 * @param ctx - { leseBestand, werkzeugsatz, berichte, kopienWurzel, freigaben: () => Record<string, PluginFreigabe>, zuordnung: () => Record<string, string[]>, laufGesperrt, aendere }
 * @returns { ok, ergebnis } oder Fehler (Ausschalten eines nicht gespeicherten Eintrags → 404, nichts geschrieben, Code-Review H4)
 */
export async function fuehrePluginZuordnungDurch(koerper, ctx) {
  if (!koerper.an && !(ctx.zuordnung()[koerper.rolle] ?? []).includes(koerper.eintrag)) return { ok: false, status: 404, grund: 'Diese Zuordnung besteht nicht — nichts geändert' }
  if (koerper.an) {
    const bestand = await ctx.leseBestand()
    const aufl = loesePluginAuf(bestand, koerper.pluginId)
    if (aufl.art !== 'eindeutig') return aufloesungFehler(aufl.art, koerper.pluginId)
    const freigaben = ctx.freigaben()
    const freigabe = Object.hasOwn(freigaben, koerper.pluginId) ? freigaben[koerper.pluginId] : undefined
    const stand = await ermittlePluginStand({ plugin: aufl.plugin, aufloesung: aufl.art, freigabe, berichte: ctx.berichte(), kopienWurzel: ctx.kopienWurzel, werkzeugsatz: ctx.werkzeugsatz })
    if (stand.freigabe.zustand !== 'freigegeben') return { ok: false, status: 409, grund: `Plugin '${koerper.pluginId}' hat keine gültige Freigabe (${stand.freigabe.zustand}) — erst prüfen und freigeben, nichts zugeordnet` }
    if (!stand.kopie.uebernommen.some((t) => t.typ === koerper.typ && t.name === koerper.name)) return { ok: false, status: 409, grund: `${koerper.typ} '${koerper.name}' ist nicht in der Kopie übernommen — nicht zuordenbar` }
    if (freigabe !== undefined && berichtDerFreigabe(ctx.berichte(), koerper.pluginId, freigabe) === null) return { ok: false, status: 409, grund: 'Prüfbericht der Freigabe fehlt — nichts zugeordnet' }
  }
  const gesperrt = ctx.laufGesperrt()
  if (gesperrt !== null) return { ok: false, status: 409, grund: `${gesperrt} — nichts geändert` }
  const ergebnis = ctx.aendere({ art: 'plugin_zuordnung', rolle: koerper.rolle, eintrag: koerper.eintrag, an: koerper.an }, koerper.stand)
  return ergebnis.ok ? { ok: true, ergebnis } : ergebnis
}
