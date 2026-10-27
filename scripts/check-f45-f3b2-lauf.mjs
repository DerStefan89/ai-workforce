/**
 * Datei: scripts/check-f45-f3b2-lauf.mjs
 *
 * Zweck: Gate F45 F-3b-2 (Plugins aus Stefans Claude Code im Workforce-Lauf; Plan features/F45/plan-f3b.md v3/v3.1, Spike
 * features/F45/nachweise/f3b2/spike.md). Grün + kalibrierter Rotfall je Prüfung:
 * (a) zentrale Sperre (Spike S3: allowed-tools im Skill erweitert den Werkzeugsatz): Skill mit allowed-tools nicht übernommen,
 *     seine Zuordnung startet nicht;
 * (b) Variante A: CLAUDE_PLUGIN_DATA in Skill/Agent/Command → nicht übernommen (plugin_daten);
 * (c) ohne empfehlungIds bzw. ohne 'plugin:'-Kennung darin ist der Startweg (loeseAusfuehrungsEingabenAuf) bitgleich, auch mit
 *     Zuordnung in der lokalen Datei; auf der Routenebene (bereiteEmpfehlungFuerStartVor) bricht eine Zuordnung MIT Freigabe ohne
 *     angezeigte Kennung ab („Anzeige veraltet“), eine Zuordnung ohne Freigabe sperrt nichts (Advisor A15, Code-Review K3);
 * (d) mit Zuordnung: genau ein --plugin-dir je Lauf-Kopie unmittelbar vor -p, enabledPlugins nur '<name>@inline' true + eingebaute
 *     false, Skill(<name>:<s>) erlaubt, Bash(git:*) weiter gesperrt (Gegenprobe git, Spike P4a/P4b — keine Zusatzsperre);
 * (e) Init-Gate: Soll durchläuft, weiteres/fehlendes Plugin und fremde Präfixnamen in skills/agents/slash_commands = Verstoß;
 *     ohne Plugin-Soll bleibt 'sub:tief' (Projekt-Command, gesperrt) erlaubt (Advisor A1);
 * (f) Drift vor dem Lauf: Quelle geändert, gepinnte Kopie verändert, Bericht NICHT_GEEIGNET, Bericht überholt, Teil nicht übernommen, doppelter Manifest-Name,
 *     Lauf-Kopie verändert → kein Start, Grund sichtbar;
 * (g) Anzeige = Start: angezeigte ≠ geprüfte Plugin-Kennungen → Konflikt; trenneAngezeigteIds trennt 'plugin:';
 * (h) Lauf-Kopie: Ordnername = Hash, außerhalb des Arbeitsordners, nur zugeordnete Teile, Hash in faehigkeiten_im_lauf/pluginsImLauf;
 * (i) Laufakte: faehigkeiten_im_lauf.plugins (Zwilling) gültig, falsche Form abgewiesen; Datenordner-Vergleich relativ, nur lesend;
 * (j) Instruktion nennt '<plugin>:<skill>' (E-F3b-1);
 * (k) Worker ≠ claude-code → nicht geladen (nur Claude Code), ohne CLI-Abruf;
 * (l) XSS: Nutzlast in Lauf-Kopie, Datenordner und Plugin-Zeile der Empfehlung erscheint nur escaped;
 * (m) Quelltext: in POST /api/laeufe kein await zwischen `if (laufAktiv)` und `laufAktiv = true`
 *     (Advisor A3); der Plugin-Abruf der Freigabe steht vor dem D13-Bereich;
 * (o) Zuordnung ohne Freigabe (Plan v3.1 Punkt 2): Argv bitgleich, „keine Freigabe — wirkt nicht“ in faehigkeiten_im_lauf;
 * (n) Rot-Selbsttest: jede Prüfung schlägt bei verfälschtem Eingang an.
 *
 * Wird aufgerufen von: npm run check
 *
 * Wichtig: Kein Netz, kein CLI-Start, kein Modell. Fixtures unter tmpdir (Quelle, Kopie-Wurzel, Lauf-Wurzel, lokale Datei); nie
 * unter dem echten ~/.claude oder ~/.ai-workforce.
 */

import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, relative } from 'node:path'
import { lesePluginOrdner } from '../src/claude-plugins/index.ts'
import { baueAufruf, pruefeInitZeile, validiereLaufakteDaten } from '../src/claude-code-gateway/index.ts'
import { ladeFaehigkeitenLokal, leseEingebautReferenz, trenneAngezeigteIds } from '../src/faehigkeiten/index.ts'
import { leseKopieQuelle, projiziereKopie } from '../src/plugin-kopie/index.ts'
import { bereitePluginStartVor, erfassePluginDatenordner, vergleichePluginDatenordner } from '../src/plugin-lauf/index.ts'
import { ladeStartvorlage } from '../src/startvorlage/index.ts'
import { raeumeVerzeichnis } from './_aufraeumen.ts'
import { schreibeFixtureDatei } from './_plugin-kopie-fixture.ts'
import { KRAFT_ID, LAUF_SATZ, legeFreigegebenesKraftAn } from './_plugin-lauf-fixture.ts'
import { renderEmpfehlung } from '../public/leitstand/empfehlung-anzeige.js'
import { renderPluginsImLauf } from '../public/leitstand/views/lauf-detail.js'
import { bereiteEmpfehlungFuerStartVor, ermittleAusfuehrungsEmpfehlung, loeseAusfuehrungsEingabenAuf } from './leitstand-server.mjs'

const befunde = []
console.log('\n=== F45-F-3b-2-Lauf-Check ===\n')
const aufraeumen = []
process.on('exit', () => {
  for (const pfad of aufraeumen) raeumeVerzeichnis(pfad)
})
const ordner = (praefix) => {
  const pfad = mkdtempSync(join(tmpdir(), praefix))
  aufraeumen.push(pfad)
  return pfad
}
const XSS = '<script>alert(1)</script>"><img src=x onerror=alert(2)>'
const vorlage = ladeStartvorlage('startvorlagen/ai-workforce.json')
const NAMEN = [...new Set(LAUF_SATZ.map((r) => r.split('(')[0]))]
const referenz = leseEingebautReferenz()
if (!referenz.ok) throw new Error(referenz.grund)

// ─── Prüffunktionen (rein; Eingänge als Werte, damit (n) sie verfälscht aufrufen kann) ─────────────────────────────

/**
 * (a) zentrale Sperre.
 * @param nicht - 'typ:name:grund' der nicht übernommenen Teile
 * @param start - Ergebnis von bereitePluginStartVor mit Zuordnung auf den Skill mit allowed-tools
 * @returns Befunde
 */
function pruefeA(nicht, start) {
  const b = []
  if (!nicht.includes('skill:mit-rechten:allowed_tools')) b.push('(a) Skill mit allowed-tools wird übernommen (zentrale Sperre fehlt, Spike S3)')
  if (start.art !== 'fehler' || !/mit-rechten.*nicht übernommen/.test(start.grund)) b.push('(a) Zuordnung eines Skills mit allowed-tools startet')
  return b
}

/**
 * (b) Variante A.
 * @param nicht - 'typ:name:grund'
 * @returns Befunde
 */
function pruefeB(nicht) {
  const b = []
  for (const e of ['skill:daten:plugin_daten', 'agent:datenagent:plugin_daten', 'command:datencmd:plugin_daten']) if (!nicht.includes(e)) b.push(`(b) ${e} fehlt — CLAUDE_PLUGIN_DATA würde im Lauf einen Ordner unter ~/.claude anlegen`)
  return b
}

/**
 * (c) bitgleich ohne Kennung.
 * @param r - { mitZuordnung, ohneZuordnung } Ergebnisse von loeseAusfuehrungsEingabenAuf
 * @returns Befunde
 */
function pruefeC(r) {
  if (!r.mitZuordnung.ok || !r.ohneZuordnung.ok) return [`(c) Start abgelehnt: ${r.mitZuordnung.grund ?? r.ohneZuordnung.grund}`]
  const b = []
  if (JSON.stringify(tokens(r.mitZuordnung)) !== JSON.stringify(tokens(r.ohneZuordnung))) b.push('(c) Argv mit Zuordnung (ohne plugin:-Kennung) nicht bitgleich')
  if ('pluginsImLauf' in r.mitZuordnung.eingaben) b.push('(c) pluginsImLauf ohne plugin:-Kennung gesetzt')
  // Code-Review K3: auf der Routenebene (bereiteEmpfehlungFuerStartVor) — Zuordnung MIT Freigabe, aber ohne angezeigte Kennung = Abbruch
  // („Anzeige veraltet“); mit Kennung bzw. bei Zuordnung ohne Freigabe weiter.
  if (r.empfehlung.mitFreigabeOhneKennung.ok || !/Plugin-Zuordnung/.test(r.empfehlung.mitFreigabeOhneKennung.grund ?? '')) b.push('(c) Zuordnung mit Freigabe ohne angezeigte Kennung startet (Anzeige ≠ Start)')
  if (!r.empfehlung.mitKennung.ok || JSON.stringify(r.empfehlung.mitKennung.pluginKennungen) !== JSON.stringify(r.empfehlung.kennungen)) b.push(`(c) angezeigte Kennung nicht durchgereicht (${r.empfehlung.mitKennung.grund ?? ''})`)
  if (!r.empfehlung.ohneFreigabe.ok) b.push(`(c) Zuordnung ohne Freigabe sperrt den Start (${r.empfehlung.ohneFreigabe.grund})`)
  return b
}

/**
 * (o) Zuordnung ohne Freigabe (Plan v3.1 Punkt 2, QA M1): Argv bitgleich, Eintrag „keine Freigabe — wirkt nicht“ in der Laufakte.
 * @param e - Ergebnis von loeseAusfuehrungsEingabenAuf mit Zuordnung ohne Freigabe (ohne plugin:-Kennung)
 * @param ohne - Ergebnis ohne Zuordnung
 * @returns Befunde
 */
function pruefeO(e, ohne) {
  if (!e.ok || !ohne.ok) return [`(o) Start abgelehnt: ${e.grund ?? ohne.grund}`]
  const b = []
  if (JSON.stringify(tokens(e)) !== JSON.stringify(tokens(ohne))) b.push('(o) Argv mit Zuordnung ohne Freigabe nicht bitgleich')
  const eintrag = (e.eingaben.faehigkeitenImLauf ?? []).find((f) => f.quelle === 'plugin')
  if (eintrag === undefined || eintrag.aktiv !== false || eintrag.grund !== 'keine Freigabe — wirkt nicht') b.push('(o) Zuordnung ohne Freigabe fehlt in faehigkeiten_im_lauf (aktiv false, „keine Freigabe — wirkt nicht“)')
  return b
}

/**
 * (d) Start mit Zuordnung.
 * @param e - Ergebnis von loeseAusfuehrungsEingabenAuf mit Plugin
 * @returns Befunde
 */
function pruefeD(e) {
  if (!e.ok) return [`(d) Start mit Plugin abgelehnt: ${e.grund}`]
  const b = []
  const t = tokens(e)
  const p = t.indexOf('-p')
  const dirs = t.flatMap((x, i) => (x === '--plugin-dir' ? [t[i + 1]] : []))
  const ordnerSoll = e.eingaben.pluginsImLauf?.lauf_kopien?.map((k) => k.ordner) ?? []
  if (dirs.length !== 1 || dirs[0] !== ordnerSoll[0] || t[p - 2] !== '--plugin-dir') b.push(`(d) --plugin-dir nicht genau einmal mit der Lauf-Kopie vor -p (${JSON.stringify(dirs)})`)
  const settings = JSON.parse(t[t.indexOf('--settings') + 1])
  const soll = { ...Object.fromEntries(referenz.referenz.plugins.map((x) => [x, false])), 'kraft@inline': true }
  if (JSON.stringify(settings.enabledPlugins) !== JSON.stringify(soll)) b.push(`(d) enabledPlugins ≠ eingebaute false + kraft@inline true (${JSON.stringify(settings.enabledPlugins)})`)
  if (!t[t.indexOf('--allowedTools') + 1].split(',').includes('Skill(kraft:debuggen)')) b.push('(d) Skill(kraft:debuggen) nicht erlaubt')
  if (!t[t.indexOf('--disallowedTools') + 1].split(',').includes('Bash(git:*)')) b.push('(d) Bash(git:*) fehlt in --disallowedTools (Gegenprobe git)')
  return b
}

/**
 * (e) Init-Gate.
 * @param g - { gruen, mehr, fehlend, fremdSkill, fremdAgent, fremdSlash, subOhneSoll } Rückgaben von pruefeInitZeile
 * @returns Befunde
 */
function pruefeE(g) {
  const b = []
  if (g.gruen !== null) b.push(`(e) Soll-init abgewiesen: ${g.gruen}`)
  if (!/init\.plugins ≠ Lauf-Kopien.*fremd@inline/.test(g.mehr ?? '')) b.push('(e) weiteres Plugin nicht abgewiesen')
  if (!/init\.plugins ≠ Lauf-Kopien.*fehlend: kraft@inline/.test(g.fehlend ?? '')) b.push('(e) fehlende Lauf-Kopie nicht abgewiesen')
  if (!/kraft:abschluss/.test(g.fremdSkill ?? '')) b.push('(e) fremder Präfix-Skill nicht abgewiesen')
  if (!/kraft:anders/.test(g.fremdAgent ?? '')) b.push('(e) fremder Präfix-Agent nicht abgewiesen')
  if (!/kraft:baeume/.test(g.fremdSlash ?? '')) b.push('(e) fremder Präfix-Command nicht abgewiesen')
  if (g.subOhneSoll !== null) b.push(`(e) Projekt-Command sub:tief ohne Plugin-Soll abgewiesen (Advisor A1): ${g.subOhneSoll}`)
  return b
}

/**
 * (f) Drift.
 * @param d - Gründe je Fall (string) oder 'kein Fehler'
 * @returns Befunde
 */
function pruefeF(d) {
  const b = []
  const soll = { quelle: /veraltet/, gepinnt: /kopie_veraendert/, ungeeignet: /bericht_fehlt/, ueberholt: /bericht_ueberholt/, teil: /nicht übernommen/, laufKopie: /Lauf-Kopie.*verändert/, doppelt: /Manifest-Name 'kraft' doppelt/ }
  for (const [fall, muster] of Object.entries(soll)) if (!muster.test(d[fall] ?? '')) b.push(`(f) ${fall}: kein Abbruch mit Grund (${String(d[fall]).slice(0, 120)})`)
  return b
}

/**
 * (g) Anzeige = Start.
 * @param g - { ohneAnzeige, falscherHash, getrennt }
 * @returns Befunde
 */
function pruefeG(g) {
  const b = []
  for (const fall of ['ohneAnzeige', 'falscherHash']) if (g[fall].ok || g[fall].konflikt !== true) b.push(`(g) ${fall}: angezeigt ≠ geprüft startet`)
  if (JSON.stringify(g.getrennt) !== JSON.stringify({ katalog: ['pw@x'], projekt: ['agent:qa@y'], plugin: ['plugin:skill:kraft@markt:debuggen@z'] })) b.push(`(g) trenneAngezeigteIds trennt plugin: nicht (${JSON.stringify(g.getrennt)})`)
  return b
}

/**
 * (h) Lauf-Kopie.
 * @param e - Ergebnis von loeseAusfuehrungsEingabenAuf mit Plugin
 * @param arbeitsordner - Arbeitsordner (cwd)
 * @param kopieHash - kopie_hash der Freigabe
 * @returns Befunde
 */
function pruefeH(e, arbeitsordner, kopieHash) {
  if (!e.ok) return ['(h) Start abgelehnt']
  const b = []
  const k = e.eingaben.pluginsImLauf?.lauf_kopien?.[0]
  if (k === undefined) return ['(h) keine Lauf-Kopie in den Eingaben']
  if (basename(k.ordner) !== k.lauf_kopie_hash || !/^[0-9a-f]{64}$/.test(k.lauf_kopie_hash)) b.push('(h) Ordnername der Lauf-Kopie ≠ Hash')
  if (!relative(arbeitsordner, k.ordner).startsWith('..')) b.push('(h) Lauf-Kopie liegt im Arbeitsordner')
  const dateien = k.dateien.map((d) => d.pfad).sort()
  if (JSON.stringify(dateien) !== JSON.stringify(['.claude-plugin/plugin.json', 'LICENSE', 'skills/debuggen/SKILL.md', 'skills/debuggen/vorlage.md'])) b.push(`(h) Lauf-Kopie enthält mehr als die zugeordneten Teile (${dateien.join(', ')})`)
  const eintrag = (e.eingaben.faehigkeitenImLauf ?? []).find((f) => f.quelle === 'plugin' && f.name === 'kraft:debuggen')
  if (eintrag === undefined || eintrag.hash !== kopieHash || k.kopie_hash !== kopieHash) b.push('(h) Hash der Kopie fehlt in faehigkeiten_im_lauf bzw. pluginsImLauf')
  return b
}

/**
 * (i) Laufakte und Datenordner.
 * @param i - { gueltig: string[], falsch: string[], abweichungen: string[], vorherGleich: boolean }
 * @returns Befunde
 */
function pruefeI(i) {
  const b = []
  if (i.gueltig.length > 0) b.push(`(i) gültige faehigkeiten_im_lauf.plugins abgewiesen: ${i.gueltig.join('; ')}`)
  if (i.falsch.length === 0) b.push('(i) falsche Form von faehigkeiten_im_lauf.plugins nicht abgewiesen')
  if (JSON.stringify(i.abweichungen) !== JSON.stringify(['+ kraft-inline'])) b.push(`(i) Datenordner-Vergleich ≠ ['+ kraft-inline'] (${JSON.stringify(i.abweichungen)})`)
  if (!i.vorherGleich) b.push('(i) Momentaufnahme des Datenordners hat etwas verändert (nur lesend)')
  return b
}

/**
 * (j) Instruktion.
 * @param auftragstext - Auftragstext des Starts mit Plugin
 * @returns Befunde
 */
function pruefeJ(auftragstext) {
  return /Plugin-Fähigkeiten in diesem Lauf \(von Stefan der Ausführung zugeordnet\): Skills kraft:debuggen \(Skill-Werkzeug\)/.test(auftragstext ?? '') ? [] : ['(j) Instruktion nennt kraft:debuggen nicht']
}

/**
 * (k) Worker ≠ claude-code.
 * @param k - { start, abgerufen }
 * @returns Befunde
 */
function pruefeK(k) {
  const ok = k.start.art === 'start' && k.start.plugins.length === 0 && k.start.nichtGeladen.every((n) => n.grund === 'nur_claude_code') && k.start.nichtGeladen.length > 0 && !k.abgerufen
  return ok ? [] : ['(k) Codex-Rolle mit Zuordnung nicht als „nicht geladen (nur Claude Code)“ ohne CLI-Abruf']
}

/**
 * (l) XSS.
 * @param html - gerendertes HTML
 * @returns Befunde
 */
function pruefeL(html) {
  return html.includes('<script>') || html.includes('<img src=x') ? ['(l) Nutzlast unescaped im Lauf-Detail oder in der Empfehlung'] : []
}

/**
 * (m) Quelltext des Servers.
 * @param server - Text
 * @returns Befunde
 */
function pruefeM(server) {
  const b = []
  const route = server.indexOf("if (req.method === 'POST' && pfad === '/api/laeufe')")
  const von = server.indexOf('if (laufAktiv) {', route)
  const bis = server.indexOf('laufAktiv = true', von)
  if (route < 0 || von < 0 || bis < 0) b.push('(m) Fenster in POST /api/laeufe nicht gefunden')
  else if (/\bawait\b/.test(server.slice(von, bis))) b.push('(m) await zwischen `if (laufAktiv)` und `laufAktiv = true` in POST /api/laeufe (D13-Fenster, Advisor A3)')
  const freigabe = server.indexOf("pfad.endsWith('/freigabe')) {")
  const d13 = server.indexOf('D13-UEBERGABE-OHNE-FENSTER: START (F15 WS-2c, (b1))', freigabe)
  const abruf = server.indexOf('await bereitePluginStartFuerInstanz(', freigabe)
  if (freigabe < 0 || d13 < 0 || abruf < 0 || abruf > d13) b.push('(m) Plugin-Abruf der Freigabe nicht vor dem D13-Bereich')
  return b
}

// ─── Hilfen ──────────────────────────────────────────────────────────────────

/**
 * Argv eines Starts (wie der Controller).
 * @param e - Ergebnis von loeseAusfuehrungsEingabenAuf (ok)
 * @returns Tokens
 */
function tokens(e) {
  return baueAufruf({ ...e.eingaben.aufrufEingaben, prompt: e.eingaben.auftragstext })
}

/**
 * Startet den echten Startweg (loeseAusfuehrungsEingabenAuf) mit Katalog-Kontext und Plugin-Prüfung.
 * @param k - Fixture
 * @param o - { zuordnung, angezeigt, pluginStart, arbeitsordner }
 * @returns Ergebnis
 */
function starte(k, o) {
  const pfad = join(ordner('f45-f3b2-lokal-'), 'faehigkeiten.lokal.json')
  writeFileSync(pfad, JSON.stringify(k.lokal(o.zuordnung)))
  const lokal = ladeFaehigkeitenLokal(pfad)
  if (lokal.zustand !== 'gueltig') throw new Error(`Fixture-Datei ungültig: ${lokal.grund}`)
  const roh = { rolle: 'ausfuehrung', anfragen: [], budget: vorlage.standardBudget, aufrufEingaben: { modell: 'claude-sonnet-5' }, auftragId: 'gate' }
  return loeseAusfuehrungsEingabenAuf(roh, 'schreibend', 'AUFTRAG', vorlage, o.arbeitsordner, {
    leseAusfuehrungsVorbedingung: () => ({ ok: true }),
    faehigkeitenKontext: {
      lokal,
      lokalPfad: pfad,
      projektId: 'testprojekt',
      katalog: new Map(),
      deaktiviert: [],
      angezeigteProjektKennungen: [],
      angezeigtePluginKennungen: o.angezeigt ?? [],
      ...(o.pluginStart !== undefined ? { pluginStart: o.pluginStart } : {}),
      pluginLaufWurzel: join(k.kopienWurzel, '_lauf'),
      pluginDatenordner: join(ordner('f45-f3b2-daten-'), 'data'),
    },
  })
}

/**
 * Eingabe von bereitePluginStartVor für das Fixture.
 * @param k - Fixture
 * @param zuordnung - Zuordnung
 * @returns Eingabe
 */
function startEingabe(k, zuordnung) {
  return { projektId: 'testprojekt', rolle: 'ausfuehrung', worker: 'claude-code', art: 'schreibend', leseBestand: k.leseBestand, berichte: k.berichte, kopienWurzel: k.kopienWurzel, kopieWerkzeugsatz: LAUF_SATZ, schrittWerkzeugNamen: NAMEN, lokal: k.lokal(zuordnung) }
}

/**
 * 'typ:name:grund' der nicht übernommenen Teile eines Plugin-Ordners.
 * @param pluginOrdner - Ordner
 * @returns Liste
 */
async function nichtUebernommen(pluginOrdner) {
  const q = await leseKopieQuelle(pluginOrdner)
  if (!q.ok) throw new Error(q.grund)
  const p = projiziereKopie({ pluginId: KRAFT_ID, quelle: q.quelle, bestandteile: (await lesePluginOrdner(pluginOrdner)).bestandteile, werkzeugsatz: LAUF_SATZ })
  return p.nicht_uebernommen.map((n) => `${n.typ}:${n.name}:${n.grund}`)
}

// ─── Läufe der Prüfungen ─────────────────────────────────────────────────────

const E = {}
const ZUORDNUNG = ['skill:kraft@markt:debuggen']
{
  const k = await legeFreigegebenesKraftAn(ordner('f45-f3b2-a-'))
  E.a = { nicht: await nichtUebernommen(k.quelle), start: await bereitePluginStartVor(startEingabe(k, ['skill:kraft@markt:mit-rechten'])) }
  befunde.push(...pruefeA(E.a.nicht, E.a.start))
  if (befunde.length === 0) console.log('✓ (a) Skill mit allowed-tools nicht übernommen, seine Zuordnung startet nicht (zentrale Sperre, Spike S3).')
}
{
  const vor = befunde.length
  const k = await legeFreigegebenesKraftAn(ordner('f45-f3b2-b-'))
  schreibeFixtureDatei(k.quelle, 'skills/daten/SKILL.md', '---\nname: daten\ndescription: x\n---\n\nOrdner ${CLAUDE_PLUGIN_DATA}\n')
  schreibeFixtureDatei(k.quelle, 'agents/datenagent.md', '---\nname: datenagent\ndescription: x\ntools: Read\n---\n\n$CLAUDE_PLUGIN_DATA\n')
  schreibeFixtureDatei(k.quelle, 'commands/datencmd.md', 'Nutze ${CLAUDE_PLUGIN_DATA}.\n')
  E.b = await nichtUebernommen(k.quelle)
  befunde.push(...pruefeB(E.b))
  if (befunde.length === vor) console.log('✓ (b) CLAUDE_PLUGIN_DATA in Skill, Agent und Command → nicht übernommen (plugin_daten, Variante A).')
}
const K = await legeFreigegebenesKraftAn(ordner('f45-f3b2-k-'))
const ARBEIT = ordner('f45-f3b2-arbeit-')
const START = await bereitePluginStartVor(startEingabe(K, ZUORDNUNG))
if (START.art !== 'start') throw new Error(`Fixture-Start: ${START.art === 'fehler' ? START.grund : START.art}`)
const MIT = starte(K, { zuordnung: ZUORDNUNG, angezeigt: START.kennungen, pluginStart: START, arbeitsordner: ARBEIT })
{
  const vor = befunde.length
  // Routenebene: dieselbe Funktion wie POST …/freigabe und POST /api/laeufe (Katalog-ids aus der Anzeige derselben Empfehlung).
  const zusatz = (eintraege, kennungen) => ({ faehigkeiten: { einstellungen: { an: [], aus: [], inhalt_freigaben: {} }, werkzeugNamen: NAMEN, plugins: { eintraege, kennungen } } })
  const ladeOptionen = { basisVerzeichnis: ordner('f45-f3b2-kz-'), schreiber: () => {} }
  const eintraege = [{ id: ZUORDNUNG[0], typ: 'skill', plugin_id: KRAFT_ID, name: 'debuggen', kennung: START.kennungen[0] }]
  const anzeige = ermittleAusfuehrungsEmpfehlung('gate', ARBEIT, process.cwd(), 'startvorlagen/ai-workforce.json', ladeOptionen, zusatz(eintraege, START.kennungen))
  const katalogIds = anzeige.ok ? anzeige.empfehlung.wirdGenutzt.map((x) => x.empfehlungId) : []
  const bereite = (ids, z) => bereiteEmpfehlungFuerStartVor(ids, 'gate', ARBEIT, process.cwd(), 'startvorlagen/ai-workforce.json', ladeOptionen, z)
  E.c = {
    mitZuordnung: starte(K, { zuordnung: ZUORDNUNG, arbeitsordner: ARBEIT }),
    ohneZuordnung: starte(K, { zuordnung: [], arbeitsordner: ARBEIT }),
    empfehlung: {
      kennungen: START.kennungen,
      mitFreigabeOhneKennung: bereite(katalogIds, zusatz(eintraege, START.kennungen)),
      mitKennung: bereite([...katalogIds, ...START.kennungen], zusatz(eintraege, START.kennungen)),
      ohneFreigabe: bereite(katalogIds, zusatz([{ id: ZUORDNUNG[0], typ: 'skill', plugin_id: KRAFT_ID, name: 'debuggen', grund: 'keine_freigabe' }], [])),
    },
  }
  befunde.push(...pruefeC(E.c))
  if (befunde.length === vor) console.log('✓ (c) ohne plugin:-Kennung bitgleich (auch mit Zuordnung in der lokalen Datei); auf der Routenebene bricht eine Zuordnung mit Freigabe ohne angezeigte Kennung ab, ohne Freigabe läuft der Start weiter (A15, Code-Review K3).')
}
{
  const vor = befunde.length
  E.o = { mit: starte(K, { zuordnung: ['skill:anders@markt:x'], arbeitsordner: ARBEIT }), ohne: starte(K, { zuordnung: [], arbeitsordner: ARBEIT }) }
  befunde.push(...pruefeO(E.o.mit, E.o.ohne))
  if (befunde.length === vor) console.log('✓ (o) Zuordnung ohne Freigabe: Argv bitgleich, „keine Freigabe — wirkt nicht“ in faehigkeiten_im_lauf (QA M1).')
}
{
  const vor = befunde.length
  befunde.push(...pruefeD(MIT))
  if (befunde.length === vor) console.log('✓ (d) genau ein --plugin-dir (Lauf-Kopie) vor -p, enabledPlugins nur kraft@inline + eingebaute false, Skill(kraft:debuggen) erlaubt, Bash(git:*) bleibt gesperrt.')
}
{
  const vor = befunde.length
  const o = MIT.ok ? MIT.eingaben.ortBLauf : { skillNamen: [], gesperrteNamen: [], plugins: [] }
  const erwartet = { skills: o.skillNamen, mcpServer: [], gesperrt: o.gesperrteNamen, ...(o.pflichtSkills !== undefined ? { pflichtSkills: o.pflichtSkills } : {}), ...(o.plugins !== undefined ? { plugins: o.plugins } : {}) }
  const quelle = (s) => ({ name: s.split('@')[0], path: 'x', source: s })
  const init = { type: 'system', subtype: 'init', tools: ['Read', 'Skill'], skills: ['kraft:debuggen'], agents: ['claude'], slash_commands: ['kraft:debuggen', 'clear'], mcp_servers: [], plugins: [quelle('kraft@inline')] }
  E.e = {
    gruen: pruefeInitZeile(init, erwartet),
    mehr: pruefeInitZeile({ ...init, plugins: [quelle('kraft@inline'), quelle('fremd@inline')] }, erwartet),
    fehlend: pruefeInitZeile({ ...init, plugins: [] }, erwartet),
    fremdSkill: pruefeInitZeile({ ...init, skills: [...init.skills, 'kraft:abschluss'] }, erwartet),
    fremdAgent: pruefeInitZeile({ ...init, agents: [...init.agents, 'kraft:anders'] }, erwartet),
    fremdSlash: pruefeInitZeile({ ...init, slash_commands: [...init.slash_commands, 'kraft:baeume'] }, erwartet),
    subOhneSoll: pruefeInitZeile({ ...init, skills: [], plugins: [], slash_commands: ['sub:tief', 'clear'] }, { skills: [], mcpServer: [], gesperrt: ['sub:tief'] }),
  }
  befunde.push(...pruefeE(E.e))
  if (befunde.length === vor) console.log('✓ (e) Init-Gate: Soll läuft, weiteres/fehlendes Plugin und fremde Präfixnamen in skills/agents/slash_commands abgewiesen; sub:tief ohne Plugin-Soll erlaubt.')
}
{
  const vor = befunde.length
  const grund = (s) => (s.art === 'fehler' ? s.grund : 'kein Fehler')
  const d = {}
  {
    const k = await legeFreigegebenesKraftAn(ordner('f45-f3b2-f1-'))
    schreibeFixtureDatei(k.quelle, 'skills/debuggen/vorlage.md', 'neu\n')
    d.quelle = grund(await bereitePluginStartVor(startEingabe(k, ZUORDNUNG)))
  }
  {
    const k = await legeFreigegebenesKraftAn(ordner('f45-f3b2-f2-'))
    writeFileSync(join(k.kopienWurzel, KRAFT_ID, k.kopieHash, 'skills', 'debuggen', 'SKILL.md'), 'verändert\n')
    d.gepinnt = grund(await bereitePluginStartVor(startEingabe(k, ZUORDNUNG)))
  }
  {
    const k = await legeFreigegebenesKraftAn(ordner('f45-f3b2-f3-'), 'NICHT_GEEIGNET')
    d.ungeeignet = grund(await bereitePluginStartVor(startEingabe(k, ZUORDNUNG)))
  }
  {
    const k = await legeFreigegebenesKraftAn(ordner('f45-f3b2-f4-'))
    const neuer = { ...k.berichte[0], version: 2, daten: { ...k.berichte[0].daten, erstellt_am: '2026-10-15T00:00:00.000Z', ergebnis: { ...k.berichte[0].daten.ergebnis, urteil: 'NICHT_GEEIGNET' } } }
    d.ueberholt = grund(await bereitePluginStartVor({ ...startEingabe(k, ZUORDNUNG), berichte: [...k.berichte, neuer] }))
  }
  d.teil = grund(await bereitePluginStartVor(startEingabe(K, ['agent:kraft@markt:ohne-tools'])))
  {
    // Code-Review 3: zwei Plugins mit demselben Manifest-Namen → kein eindeutiges Präfix.
    const k = await legeFreigegebenesKraftAn(ordner('f45-f3b2-f7-'))
    const zweite = 'kraft@anders'
    cpSync(join(k.kopienWurzel, KRAFT_ID), join(k.kopienWurzel, zweite), { recursive: true })
    const bericht2 = { ...k.berichte[0], artefakt_id: 'pruefbericht-p-kraft-anders-00000000', daten: { ...k.berichte[0].daten, quelle: { ...k.berichte[0].daten.quelle, plugin_id: zweite } } }
    const lokal = k.lokal([...ZUORDNUNG, `skill:${zweite}:baeume`])
    lokal.plugin_freigaben = { ...lokal.plugin_freigaben, [zweite]: { kopie_hash: k.kopieHash, pruefbericht: 'pruefbericht-p-kraft-anders-00000000@1', freigegeben_am: 'x' } }
    d.doppelt = grund(await bereitePluginStartVor({ ...startEingabe(k, []), lokal, leseBestand: async () => ({ status: 'ok', plugins: [k.plugin, { ...k.plugin, id: zweite, marketplace: 'anders' }] }), berichte: [...k.berichte, bericht2] }))
  }
  {
    const k = await legeFreigegebenesKraftAn(ordner('f45-f3b2-f6-'))
    const s = await bereitePluginStartVor(startEingabe(k, ZUORDNUNG))
    const erst = starte(k, { zuordnung: ZUORDNUNG, angezeigt: s.kennungen, pluginStart: s, arbeitsordner: ordner('f45-f3b2-f6a-') })
    if (erst.ok) writeFileSync(join(erst.eingaben.pluginsImLauf.lauf_kopien[0].ordner, 'fremd.md'), 'x')
    const zweit = starte(k, { zuordnung: ZUORDNUNG, angezeigt: s.kennungen, pluginStart: s, arbeitsordner: ordner('f45-f3b2-f6b-') })
    d.laufKopie = zweit.ok ? 'kein Fehler' : zweit.grund
  }
  E.f = d
  befunde.push(...pruefeF(E.f))
  if (befunde.length === vor) console.log('✓ (f) Drift vor dem Lauf: Quelle, gepinnte Kopie, Bericht NICHT_GEEIGNET/überholt, Teil nicht übernommen, doppelter Manifest-Name, Lauf-Kopie verändert → kein Start, Grund sichtbar.')
}
{
  const vor = befunde.length
  E.g = {
    ohneAnzeige: starte(K, { zuordnung: ZUORDNUNG, angezeigt: [], pluginStart: START, arbeitsordner: ARBEIT }),
    falscherHash: starte(K, { zuordnung: ZUORDNUNG, angezeigt: [`plugin:skill:kraft@markt:debuggen@${'0'.repeat(64)}`], pluginStart: START, arbeitsordner: ARBEIT }),
    getrennt: trenneAngezeigteIds(['pw@x', 'agent:qa@y', 'plugin:skill:kraft@markt:debuggen@z']),
  }
  befunde.push(...pruefeG(E.g))
  if (befunde.length === vor) console.log('✓ (g) Anzeige = Start: angezeigte ≠ geprüfte Plugin-Kennungen → Konflikt; trenneAngezeigteIds trennt plugin:.')
}
{
  const vor = befunde.length
  befunde.push(...pruefeH(MIT, ARBEIT, K.kopieHash))
  if (befunde.length === vor) console.log('✓ (h) Lauf-Kopie: Ordnername = Hash, außerhalb des Arbeitsordners, nur zugeordnete Teile, Hash in faehigkeiten_im_lauf und pluginsImLauf.')
}
{
  const vor = befunde.length
  const basisAkte = { laufakte_schema: 'v0', lauf_id: 'x', werkzeug_version_deklariert: 'x', berechtigungskontext: 'x', arbeitsverzeichnis_pfad: 'x', modell_beobachtet: null, beobachtungsbasis_vollstaendig: true, rohstrom_referenz: { pfad: 'x', inhalts_hash: 'a'.repeat(64) }, erstellt_am: 'x' }
  const plugins = { lauf_kopien: [{ plugin_id: KRAFT_ID, name: 'kraft', kopie_hash: 'a'.repeat(64), lauf_kopie_hash: 'b'.repeat(64), pruefbericht: 'p@1', abweichung_nachher: null }], datenordner: { abweichungen: [] } }
  const akte = (p) => ({ ...basisAkte, faehigkeiten_im_lauf: { eintraege: [{ id: 'skill:kraft@markt:debuggen', name: 'kraft:debuggen', typ: 'skill', quelle: 'plugin', aktiv: true, aufrufe: 1, fehlgeschlagen: 0 }], fremde_aufrufe: [], plugins: p } })
  const daten = join(ordner('f45-f3b2-i-'), 'data')
  mkdirSync(join(daten, 'alt'), { recursive: true })
  const liste = () => JSON.stringify(readdirSync(daten, { recursive: true }).sort())
  const listeVor = liste()
  const v = erfassePluginDatenordner(daten, {})
  const vorherGleich = liste() === listeVor
  mkdirSync(join(daten, 'kraft-inline'))
  const n = erfassePluginDatenordner(daten, {})
  E.i = {
    gueltig: validiereLaufakteDaten(akte(plugins)),
    falsch: validiereLaufakteDaten(akte({ ...plugins, datenordner: { abweichungen: 'x' } })),
    abweichungen: v.ok && n.ok ? vergleichePluginDatenordner(v.stand, n.stand) : [],
    vorherGleich,
  }
  befunde.push(...pruefeI(E.i))
  if (befunde.length === vor) console.log('✓ (i) faehigkeiten_im_lauf.plugins gültig, falsche Form abgewiesen; Datenordner-Vergleich relativ und nur lesend.')
}
{
  const vor = befunde.length
  E.j = MIT.ok ? MIT.eingaben.auftragstext : ''
  befunde.push(...pruefeJ(E.j))
  if (befunde.length === vor) console.log('✓ (j) Instruktion nennt kraft:debuggen (E-F3b-1).')
}
{
  const vor = befunde.length
  let abgerufen = false
  E.k = { start: await bereitePluginStartVor({ ...startEingabe(K, ZUORDNUNG), worker: 'codex', leseBestand: async () => ((abgerufen = true), K.leseBestand()) }) }
  E.k.abgerufen = abgerufen
  befunde.push(...pruefeK(E.k))
  if (befunde.length === vor) console.log('✓ (k) Worker ≠ claude-code: nicht geladen (nur Claude Code), kein CLI-Abruf.')
}
{
  const vor = befunde.length
  E.l =
    renderPluginsImLauf({ lauf_kopien: [{ plugin_id: XSS, name: XSS, kopie_hash: XSS, lauf_kopie_hash: XSS, pruefbericht: XSS, abweichung_nachher: XSS }], datenordner: { abweichungen: [XSS] } }) +
    renderPluginsImLauf({ lauf_kopien: [], datenordner: { grund: XSS } }) +
    renderEmpfehlung({ wirdGenutzt: [], passtNichtImLauf: [], weitereAnzahl: { wirdGenutzt: 0, passtNichtImLauf: 0 }, nichtFreigebbarAnzahl: 0, hinweise: [], projektUrl: null, projektFaehigkeiten: [], pluginFaehigkeiten: [{ id: XSS, typ: 'skill', plugin_id: XSS, name: XSS, kennung: XSS }, { id: XSS, typ: 'agent', plugin_id: XSS, name: XSS, grund: XSS }] })
  befunde.push(...pruefeL(E.l))
  if (befunde.length === vor) console.log('✓ (l) XSS: Lauf-Kopie, Datenordner und Plugin-Zeile der Empfehlung nur escaped.')
}
const SERVER = readFileSync('scripts/leitstand-server.mjs', 'utf8')
{
  const vor = befunde.length
  befunde.push(...pruefeM(SERVER))
  if (befunde.length === vor) console.log('✓ (m) Kein await im D13-Fenster von POST /api/laeufe, Plugin-Abruf der Freigabe vor dem D13-Bereich.')
}

// ─── (n) Rot-Selbsttest ──────────────────────────────────────────────────────
{
  const vor = befunde.length
  const rot = [
    ['allowed-tools übernommen', pruefeA(E.a.nicht.filter((x) => !x.endsWith(':allowed_tools')), E.a.start)],
    ['allowed-tools-Zuordnung startet', pruefeA(E.a.nicht, { art: 'start', kennungen: [], plugins: [], nichtGeladen: [] })],
    ['plugin_daten fehlt', pruefeB(E.b.filter((x) => !x.startsWith('agent:datenagent')))],
    ['nicht bitgleich', pruefeC({ ...E.c, mitZuordnung: MIT })],
    ['Freigabe ohne Kennung startet', pruefeC({ ...E.c, empfehlung: { ...E.c.empfehlung, mitFreigabeOhneKennung: { ok: true } } })],
    ['ohne Freigabe gesperrt', pruefeC({ ...E.c, empfehlung: { ...E.c.empfehlung, ohneFreigabe: { ok: false, grund: 'x' } } })],
    ['keine Freigabe nicht in der Laufakte', pruefeO(E.o.ohne, E.o.ohne)],
    ['keine Freigabe ändert Argv', pruefeO(MIT, E.o.ohne)],
    ['doppelter Manifest-Name startet', pruefeF({ ...E.f, doppelt: 'kein Fehler' })],
    [
      'Plugin-Abruf der Freigabe im D13-Bereich',
      (() => {
        // Den Abruf der Freigabe-Route (nicht den von POST /api/laeufe, der davor steht) hinter die D13-Marke verschieben.
        const marke = 'D13-UEBERGABE-OHNE-FENSTER: START (F15 WS-2c, (b1))'
        const ab = SERVER.indexOf("pfad.endsWith('/freigabe')) {")
        const ohne = SERVER.slice(0, ab) + SERVER.slice(ab).replace('await bereitePluginStartFuerInstanz(', 'bereitePluginStartFuerInstanz(')
        return pruefeM(ohne.replace(marke, `${marke}\n await bereitePluginStartFuerInstanz({})`))
      })(),
    ],
    ['zwei --plugin-dir', MIT.ok ? pruefeD({ ...MIT, eingaben: { ...MIT.eingaben, aufrufEingaben: { ...MIT.eingaben.aufrufEingaben, pluginDirs: [...MIT.eingaben.aufrufEingaben.pluginDirs, 'x'] } } }) : ['-']],
    ['git nicht gesperrt', MIT.ok ? pruefeD({ ...MIT, eingaben: { ...MIT.eingaben, aufrufEingaben: { ...MIT.eingaben.aufrufEingaben, werkzeugsatz: { ...MIT.eingaben.aufrufEingaben.werkzeugsatz, erlaubte_werkzeuge: MIT.eingaben.aufrufEingaben.werkzeugsatz.erlaubte_werkzeuge.filter((r) => !r.startsWith('Bash(')) } } } }) : ['-']],
    ['Init-Gate lässt mehr zu', pruefeE({ ...E.e, mehr: null })],
    ['Init-Gate bricht sub:tief', pruefeE({ ...E.e, subOhneSoll: 'Verstoß' })],
    ['Drift startet', pruefeF({ ...E.f, quelle: 'kein Fehler' })],
    ['Lauf-Kopie verändert startet', pruefeF({ ...E.f, laufKopie: 'kein Fehler' })],
    ['Anzeige ≠ Start startet', pruefeG({ ...E.g, ohneAnzeige: { ok: true } })],
    ['Lauf-Kopie im Arbeitsordner', MIT.ok ? pruefeH(MIT, join(MIT.eingaben.pluginsImLauf.lauf_kopien[0].ordner, '..', '..'), K.kopieHash) : ['-']],
    ['Lauf-Kopie mit fremdem Teil', MIT.ok ? pruefeH({ ...MIT, eingaben: { ...MIT.eingaben, pluginsImLauf: { ...MIT.eingaben.pluginsImLauf, lauf_kopien: [{ ...MIT.eingaben.pluginsImLauf.lauf_kopien[0], dateien: [...MIT.eingaben.pluginsImLauf.lauf_kopien[0].dateien, { pfad: 'skills/abschluss/SKILL.md' }] }] } } }, ARBEIT, K.kopieHash) : ['-']],
    ['falsche Laufakte gültig', pruefeI({ ...E.i, falsch: [] })],
    ['Datenordner absolut', pruefeI({ ...E.i, abweichungen: [`+ ${tmpdir()}/kraft-inline`] })],
    ['Instruktion ohne Plugin', pruefeJ('AUFTRAG')],
    ['Codex lädt', pruefeK({ start: { art: 'start', plugins: [{}], nichtGeladen: [] }, abgerufen: false })],
    ['XSS roh', pruefeL(`<li>${XSS}</li>`)],
    [
      'await im D13-Fenster',
      (() => {
        const route = SERVER.indexOf("if (req.method === 'POST' && pfad === '/api/laeufe')")
        const von = SERVER.indexOf('if (laufAktiv) {', route) + 'if (laufAktiv) {'.length
        return pruefeM(`${SERVER.slice(0, von)} await x; ${SERVER.slice(von)}`)
      })(),
    ],
  ]
  for (const [name, b] of rot) if (b.length === 0) befunde.push(`(n) Rot-Selbsttest: '${name}' wurde nicht erkannt`)
  if (befunde.length === vor) console.log(`✓ (n) Rot-Selbsttest: ${rot.length} verfälschte Eingänge erkannt.`)
}

if (befunde.length > 0) {
  console.error(`\n✗ ${befunde.length} Befund(e):`)
  for (const b of befunde) console.error(`  - ${b}`)
  process.exit(1)
}
console.log('\n✓ Keine Befunde.')
