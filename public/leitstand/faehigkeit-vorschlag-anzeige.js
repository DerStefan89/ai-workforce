/**
 * Datei: public/leitstand/faehigkeit-vorschlag-anzeige.js
 *
 * Zweck: Karte „Vorgeschlagene Fähigkeiten“ der Abnahme (F45 FB-2, features/F45/plan-fb2.md/plan-fb2-v2.md, Advisor
 * advisor-fb2.md; F-1069, F-1167, F-1169). Quelle sind allein die Felder faehigkeitVorschlaege und faehigkeitUngesichert von
 * GET …/abnahme (scripts/leitstand/routen-faehigkeit-vorschlag.mjs baueVorschlagFelder):
 * - je Vorschlag Typ, Name, Beschreibung, Ziel, Hash-Präfix und bei Ungültigkeit der Grund (alles Serverwerte, escaped);
 * - „Übernehmen“ nur, wenn uebernehmenHindernis null ist (Anzeige-Zwilling der Route: kein Grund, Ziel fehlt, Ziel nicht ignoriert,
 *   Abnahme-Lage E-FB1-3 wie ermittleAbnahmeStand); „Verwerfen“ zweistufig (Entscheidung Stefan 23.10.2026: erst „Wirklich
 *   verwerfen?“); beides nur für adressierbare Vorschläge (Feld des Servers, kein Zwilling) und nicht während des eigenen Laufs —
 *   dann ist die Liste ein Zwischenstand. Eine fremde Laufsperre sagt die Anzeige nicht vorher (D13), sie kommt als 409;
 * - der Hinweis „ungesichert“ steht dauerhaft, solange faehigkeitUngesichert da ist — abgeleitet aus dem Stand von .claude/ im
 *   Arbeitsordner, nicht aus einem Klick (qa FB-1b 1); „nicht bestimmbar“ als eigene Zeile. Der Ausweg „Bereit zum Sichern“ nur
 *   bei ABGESCHLOSSEN, sonst (Freigabe-Seite, Freigabe-Halt, Lauf) „von Hand committen“ (F-1173 N1).
 * Dazu der Erfolgstext nach einer Aktion und die Abtrennung der Vorschlagsdateien im Umfangs-Hinweis.
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workflow-abnahme.js (renderAbnahme, renderUmfangHinweis)
 * - public/leitstand/views/workflow-entscheiden.js (renderUngesichertHinweis auf der Freigabe-Seite, qa 1)
 * - public/leitstand/views/workflows.js (Kennzeichen, Klick „Übernehmen“/„Verwerfen“, Erfolgstext)
 * - public/leitstand/faehigkeit-vorschlag-anzeige.test.mjs (node:test), scripts/check-f45-fb2-faehigkeit-anzeige.mjs
 *
 * Wichtig: Rein — kein fetch, kein DOM, in Node importierbar. Knöpfe tragen die Klasse .wf-faehigkeit-vorschlag mit data-aktion
 * (uebernehmen | verwerfen | verwerfen-bestaetigt | abbrechen), data-workflow-id, data-typ, data-name, data-hash; den POST schickt
 * views/workflows.js über sendeAbnahmeBedienung (genau ein POST, ganze Abnahme gesperrt). Die Route prüft alles selbst.
 * Auf der Seite „entscheidbar“ ist „Übernehmen“ kein Hauptknopf (die Abnahme ist es, design-guardian 1). Importiert nur
 * Blattmodule (kein Zyklus mit views/workflow-abnahme.js).
 */

import { t, tHtml } from './i18n.js'
import { escapeHtml } from './render.js'
import { ausfuehrungGelaufen } from './abnahme-ausfuehrung.js'

/** Präfix der Vorschlagsdateien (src/faehigkeiten/vorschlag.ts VORSCHLAG_ORDNER + '/'; Gate fb2 prüft die Gleichheit). */
export const VORSCHLAG_PRAEFIX = 'vorschlaege/faehigkeiten/'

/** Länge des gezeigten Hash-Präfixes. */
const HASH_PRAEFIX = 12

/** Bekannte Typen mit übersetztem Text. */
const TYPEN = new Set(['skill', 'agent'])

/**
 * Die Vorschläge der Projektion (nur Objekte), oder [].
 * @param abnahme - Antwort von GET …/abnahme
 * @returns Vorschläge
 */
function vorschlaegeAus(abnahme) {
  const liste = abnahme?.faehigkeitVorschlaege
  return Array.isArray(liste) ? liste.filter((v) => v !== null && typeof v === 'object') : []
}

/**
 * Der Stand von .claude/ (faehigkeitUngesichert) in bekannter Form, sonst null.
 * @param abnahme - Antwort von GET …/abnahme
 * @returns { status: 'ok', pfade, anzahl } | { status: 'nicht_bestimmbar' } | null
 */
function ungesichertAus(abnahme) {
  const u = abnahme?.faehigkeitUngesichert
  if (u?.status === 'ok' && Array.isArray(u.pfade) && u.pfade.length > 0) return u
  return u?.status === 'nicht_bestimmbar' ? u : null
}

/**
 * Ob der eigene Ablauf gerade läuft (die Vorschläge sind dann ein Zwischenstand).
 * @param abnahme - Antwort von GET …/abnahme
 * @returns läuft?
 */
const laeuft = (abnahme) => abnahme?.workflowStatus === 'LAEUFT'

/**
 * Schlüssel eines Vorschlags für die Stufe „Wirklich verwerfen?“ (ein anderer Hash hebt sie auf).
 * @param workflowId - Kennung @param v - Vorschlag
 * @returns Schlüssel
 */
export function vorschlagSchluessel(workflowId, v) {
  return `${workflowId}|${v.typ}:${v.name}|${v.hash}`
}

/**
 * Ob die Abnahme-Lage das Übernehmen zulässt — Zwilling von ermittleAbnahmeStand + lageSperre (E-FB1-3): Ablauf ABGESCHLOSSEN mit
 * gelaufener Ausführung und (keine aktuelle Entscheidung oder ANGENOMMEN).
 * @param abnahme - Antwort von GET …/abnahme
 * @returns erlaubt?
 */
export function abnahmeLaesstUebernehmenZu(abnahme) {
  const e = abnahme?.entscheidung ?? {}
  return abnahme?.workflowStatus === 'ABGESCHLOSSEN' && ausfuehrungGelaufen(abnahme) && (e.status !== 'ok' || e.ergebnis === 'ANGENOMMEN')
}

/**
 * Warum „Übernehmen“ nicht angeboten wird, oder null — dieselben Bedingungen wie die Route (dort prüft die Lage zuerst; hier steht
 * der Grund am Vorschlag vorn, weil er für diesen Vorschlag gilt).
 * @param abnahme - Antwort von GET …/abnahme
 * @param v - Vorschlag
 * @returns Schlüssel unter abnahme.faehigkeiten.nicht.* oder null (anbieten)
 */
export function uebernehmenHindernis(abnahme, v) {
  if (v.adressierbar !== true) return 'adressierbar'
  if (v.grund !== null && v.grund !== undefined) return 'grund'
  if (v.ziel_existiert !== false) return 'zielExistiert'
  if (v.ziel_ignoriert === true) return 'zielIgnoriert'
  if (v.ziel_ignoriert !== false) return 'zielIgnoriertUnbekannt'
  return abnahmeLaesstUebernehmenZu(abnahme) ? null : 'lage'
}

/**
 * Ein Knopf der Karte.
 * @param klasse - Stil ('button primary' | 'button' | 'button danger')
 * @param aktion - data-aktion
 * @param workflowId - Kennung @param v - Vorschlag
 * @param text - Beschriftung (Schlüssel) @param label - aria-label (Text)
 * @param beschrieben - id für aria-describedby (qa 5: die Warnung „unwiderruflich“ am bestätigenden Knopf), oder ''
 * @returns HTML
 */
function knopf(klasse, aktion, workflowId, v, text, label, beschrieben = '') {
  const beschreibung = beschrieben === '' ? '' : ` aria-describedby="${beschrieben}"`
  return `<button type="button" class="${klasse} wf-faehigkeit-vorschlag" data-aktion="${aktion}" data-workflow-id="${escapeHtml(workflowId)}" data-typ="${escapeHtml(v.typ)}" data-name="${escapeHtml(v.name)}" data-hash="${escapeHtml(v.hash)}" aria-label="${escapeHtml(label)}"${beschreibung}>${tHtml(text)}</button>`
}

/**
 * Eine Zeile je Vorschlag.
 * @param workflowId - Kennung @param abnahme - Antwort @param v - Vorschlag
 * @param verwerfenOffen - Schlüssel des Vorschlags in der Stufe „Wirklich verwerfen?“, oder null
 * @param hauptknopf - false: „Übernehmen“ ohne primary (Seite „entscheidbar“: dort ist die Abnahme der Hauptknopf, design-guardian 1)
 * @returns HTML
 */
function renderVorschlag(workflowId, abnahme, v, verwerfenOffen, hauptknopf) {
  const typ = TYPEN.has(v.typ) ? t(`abnahme.faehigkeiten.typ.${v.typ}`) : String(v.typ ?? '?')
  const name = typeof v.name === 'string' ? v.name : String(v.pfad ?? '')
  // Ziel kommt vom Server (zielPfad, code-reviewer 9) — kein Zwilling hier.
  const ziel = typeof v.ziel === 'string' ? `<span class="subtle">${tHtml('abnahme.faehigkeiten.ziel', {}, { ziel: `<code>${escapeHtml(v.ziel)}</code>` })}</span>` : ''
  const kopf = `<p class="abnahme-faehigkeit-kopf"><span class="ablauf-marke">${escapeHtml(typ)}</span> <strong><code>${escapeHtml(name)}</code></strong>${ziel === '' ? '' : ` ${ziel}`}</p>`
  const beschreibung = typeof v.beschreibung === 'string' && v.beschreibung !== '' ? `<p>${escapeHtml(v.beschreibung)}</p>` : ''
  const hash = typeof v.hash === 'string' ? `<p class="subtle">${tHtml('abnahme.faehigkeiten.hash', {}, { hash: `<code>${escapeHtml(v.hash.slice(0, HASH_PRAEFIX))}</code>` })}</p>` : ''
  const grund = v.grund !== null && v.grund !== undefined ? `<p class="abnahme-faehigkeit-grund"><span class="ablauf-status warten">${tHtml('abnahme.faehigkeiten.ungueltig')}</span> ${escapeHtml(String(v.grund))}</p>` : ''
  let bedienung = ''
  if (!laeuft(abnahme)) {
    const hindernis = uebernehmenHindernis(abnahme, v)
    if (hindernis === 'adressierbar') bedienung = `<p class="subtle">${tHtml('abnahme.faehigkeiten.nicht.adressierbar', {}, { pfad: `<code>${escapeHtml(String(v.pfad ?? ''))}</code>` })}</p>`
    else if (verwerfenOffen === vorschlagSchluessel(workflowId, v)) {
      // Höchstens eine Stufe ist offen — die id ist damit eindeutig.
      bedienung = `<p id="abnahme-faehigkeit-verwerfen-text">${tHtml('abnahme.faehigkeiten.verwerfenText')}</p><div class="action-row">${knopf('button danger', 'verwerfen-bestaetigt', workflowId, v, 'abnahme.faehigkeiten.aktion.verwerfenBestaetigen', t('abnahme.faehigkeiten.aria.verwerfenBestaetigen', { name }), 'abnahme-faehigkeit-verwerfen-text')}${knopf('button', 'abbrechen', workflowId, v, 'abnahme.faehigkeiten.aktion.abbrechen', t('abnahme.faehigkeiten.aria.abbrechen', { name }))}</div>`
    } else {
      const uebernehmen = hindernis === null ? knopf(hauptknopf ? 'button primary' : 'button', 'uebernehmen', workflowId, v, 'abnahme.faehigkeiten.aktion.uebernehmen', t('abnahme.faehigkeiten.aria.uebernehmen', { name })) : ''
      const warum = hindernis === null ? '' : `<p class="subtle">${tHtml(`abnahme.faehigkeiten.nicht.${hindernis}`)}</p>`
      bedienung = `${warum}<div class="action-row">${uebernehmen}${knopf('button danger', 'verwerfen', workflowId, v, 'abnahme.faehigkeiten.aktion.verwerfen', t('abnahme.faehigkeiten.aria.verwerfen', { name }))}</div>`
    }
  }
  return `<li class="abnahme-faehigkeit">${kopf}${beschreibung}${hash}${grund}${bedienung}</li>`
}

/**
 * Der dauerhafte Hinweis zum Stand von .claude/ (F-1169): amber mit den Pfaden, oder eine graue Zeile „nicht bestimmbar“. Auch auf
 * der Freigabe-Seite (views/workflow-entscheiden.js, qa 1): dort wird der nächste Lauf freigegeben, und der Weg mit der Karte ist
 * zugeklappt.
 * Der Ausweg je Lage (F-1173 N1): „Bereit zum Sichern“ gibt es nur bei ABGESCHLOSSEN (scripts/leitstand/ablauf-sichern.mjs,
 * Grund nichtAbgeschlossen) — sonst, also auch auf der Freigabe-Seite und im Freigabe-Halt, der Satz „von Hand committen, dann neu
 * laden“. Ein Befehlsblock steht dort nicht: der einzige Block für den Arbeitsordner (code-daten.js ablaufSicherBefehle) setzt
 * sichern.bereit voraus, und die Freigabe-Seite lädt den Sichern-Stand nicht.
 * @param feld - abnahme.faehigkeitUngesichert (roh)
 * @param optionen - { sichernMoeglich: true nur, wo „Bereit zum Sichern“ angeboten wird (Abnahme eines ABGESCHLOSSENEN Ablaufs) }
 * @returns HTML oder ''
 */
export function renderUngesichertHinweis(feld, { sichernMoeglich = false } = {}) {
  const stand = ungesichertAus({ faehigkeitUngesichert: feld })
  if (stand === null) return ''
  if (stand.status === 'nicht_bestimmbar') return `<p class="subtle abnahme-faehigkeit-ungesichert">${tHtml('abnahme.faehigkeiten.ungesichert.nichtBestimmbar')}</p>`
  const pfade = stand.pfade.map((p) => `<li><code>${escapeHtml(String(p))}</code></li>`).join('')
  const anzahl = Number.isInteger(stand.anzahl) ? stand.anzahl : stand.pfade.length
  const rest = anzahl - stand.pfade.length
  const weitere = rest > 0 ? `<p>${tHtml('abnahme.faehigkeiten.ungesichert.weitere', { anzahl: rest })}</p>` : ''
  // Advisor 13: der Satz zur Freigabe nur, wenn eine Fähigkeit dort liegt, wo eine Übernahme sie ablegt.
  const faehigkeit = stand.pfade.some((p) => /(^|\/)\.claude\/(skills|agents)\//i.test(String(p)))
  return `<div class="note amber abnahme-faehigkeit-ungesichert" role="note"><p><strong>${tHtml('abnahme.faehigkeiten.ungesichert.titel')}</strong></p><p>${tHtml(sichernMoeglich ? 'abnahme.faehigkeiten.ungesichert.text' : 'abnahme.faehigkeiten.ungesichert.textHand')}</p><ul>${pfade}</ul>${weitere}${faehigkeit ? `<p>${tHtml('abnahme.faehigkeiten.ungesichert.uebernommen')}</p>` : ''}</div>`
}

/**
 * Die Karte „Vorgeschlagene Fähigkeiten“ — '' ohne beide Felder.
 * @param workflowId - Kennung
 * @param abnahme - Antwort von GET …/abnahme
 * @param optionen - { ebene: 2 | 3 (Überschrift; 2 = Seite „entscheidbar“, dort „Übernehmen“ ohne primary), verwerfenOffen: Schlüssel
 *   oder null }
 * @returns HTML oder ''
 */
export function renderFaehigkeitVorschlaege(workflowId, abnahme, { ebene = 3, verwerfenOffen = null } = {}) {
  const vorschlaege = vorschlaegeAus(abnahme)
  const hinweis = renderUngesichertHinweis(abnahme?.faehigkeitUngesichert, { sichernMoeglich: abnahme?.workflowStatus === 'ABGESCHLOSSEN' })
  if (vorschlaege.length === 0 && hinweis === '') return ''
  const h = ebene === 2 ? 'h2' : 'h3'
  const zwischenstand = laeuft(abnahme) && vorschlaege.length > 0 ? `<div class="note" role="note"><p>${tHtml('abnahme.faehigkeiten.zwischenstand')}</p></div>` : ''
  const liste =
    vorschlaege.length > 0
      ? `<p class="subtle">${tHtml('abnahme.faehigkeiten.text')}</p><ul class="abnahme-faehigkeiten-liste">${vorschlaege.map((v) => renderVorschlag(workflowId, abnahme, v, verwerfenOffen, ebene !== 2)).join('')}</ul>`
      : `<p class="subtle">${tHtml('abnahme.faehigkeiten.keine')}</p>`
  return `<section class="entscheiden-karte abnahme-faehigkeiten" aria-labelledby="abnahme-faehigkeiten-titel" data-faehigkeit-vorschlaege="${vorschlaege.length}">
    <${h} id="abnahme-faehigkeiten-titel">${tHtml('abnahme.faehigkeiten.titel')}</${h}>
    ${hinweis}${zwischenstand}${liste}
  </section>`
}

/**
 * Teil des Kennzeichens der Abnahme (Muster umfangKennung) — sonst zeichnet der Poll die Karte nicht neu.
 * @param abnahme - Antwort von GET …/abnahme
 * @returns Text
 */
export function faehigkeitVorschlagKennung(abnahme) {
  const v = vorschlaegeAus(abnahme).map((x) => [x.typ, x.name, x.hash, x.grund, x.ziel_existiert, x.ziel_ignoriert, x.adressierbar, x.beschreibung, x.pfad])
  return encodeURIComponent(JSON.stringify([v, abnahme?.faehigkeitUngesichert ?? null, laeuft(abnahme)]))
}

/**
 * Meldung nach einer erfolgreichen Aktion (Antwort der Route).
 * @param aktion - 'uebernehmen' | 'verwerfen'
 * @param inhalt - Antwortkörper ({ name, vorschlag_geblieben? })
 * @param abnahmeOffen - true, wenn die Abnahme beim Klick offen war (das Review gilt danach als veraltet, E-FB1-3)
 * @returns Text oder { text, art: 'hinweis' } (Teilerfolg)
 */
export function vorschlagErfolg(aktion, inhalt, abnahmeOffen) {
  const name = String(inhalt?.name ?? '')
  if (aktion !== 'uebernehmen') return t('abnahme.faehigkeiten.erfolg.verworfen', { name })
  const text = [t('abnahme.faehigkeiten.erfolg.uebernommen', { name }), abnahmeOffen ? t('abnahme.faehigkeiten.erfolg.reviewVeraltet') : ''].filter((s) => s !== '').join(' ')
  // Der deutsche Server-hinweis steht nicht wörtlich hier (i18n) — sein Inhalt steht dauerhaft im Hinweis „ungesichert“.
  if (typeof inhalt?.vorschlag_geblieben === 'string') return { text: `${text} ${t('abnahme.faehigkeiten.erfolg.vorschlagGeblieben')}`, art: 'hinweis' }
  return text
}

/** Ordner-Einträge, die git für einen ganz ungetrackten Vorschlagsordner meldet (`?? vorschlaege/`, code-reviewer 1). */
const VORSCHLAG_ORDNER_EINTRAEGE = new Set(['vorschlaege/', VORSCHLAG_PRAEFIX])

/**
 * Trennt die Einträge des Vorschlagsordners aus einer Dateiliste des Umfangs-Hinweises (F-1167: sie liegen gewollt außerhalb der
 * Bereiche) — Dateien darunter und die Ordner-Einträge `vorschlaege/` bzw. `vorschlaege/faehigkeiten/`. Grenze (DEKLARIERT): liegt
 * unter einem ganz ungetrackten `vorschlaege/` noch anderes, zählt es mit (git meldet nur den Ordner).
 * @param pfade - umfang.ausserhalb
 * @returns { uebrige, vorschlaege } (Anzahl der abgetrennten Einträge)
 */
export function trenneVorschlagDateien(pfade) {
  const uebrige = pfade.filter((p) => !String(p).startsWith(VORSCHLAG_PRAEFIX) && !VORSCHLAG_ORDNER_EINTRAEGE.has(String(p)))
  return { uebrige, vorschlaege: pfade.length - uebrige.length }
}
