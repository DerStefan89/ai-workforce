/**
 * Datei: public/leitstand/roadmap-bereinigung.js
 *
 * Zweck: Reine Bausteine für den Abschnitt „Bereinigung (n)“ auf der Roadmap-Seite (F45 B5b-2b-2, features/F45/plan-b5b2b2-v2.md,
 * Advisor features/F45/advisor-b5b2b2.md; F-1010, F-1189). Grundlage sind die Routen aus B5b-1b-2
 * (scripts/leitstand/routen-planung.mjs): GET /api/roadmap/bereinigung (je Vorschlag `moeglich`/`grund` aus derselben Vorprüfung wie
 * der POST) und POST …/bereinigung/bestaetigen { eintrag, entscheidung, grund, hashes } — genau ein Eintrag je Bestätigung.
 * - Je Eintrag: Meilenstein/Feature, Feature-Status, STATUS.md-Quelle, Vorschläge als Optionen (nicht mögliche deaktiviert, Grund
 *   sichtbar, „von Hand“), Pflicht-Begründung, „Bestätigen …“.
 * - Bestätigungsschritt inline im Eintrag statt <dialog> (Entscheidung advisor-b5b2b.md O2, plan-b5b2b-v2.md §6: die Seite wird bei
 *   jeder Zustandsänderung neu geschrieben, ein Modal ginge dabei verloren): „Feature → ABGESCHLOSSEN“ mit Datumshinweis (qa6),
 *   „Meilenstein → LAEUFT“ mit „im Leitstand nicht zurücknehmbar“ und Pflicht-Häkchen (qa2).
 * - Erfolg oben im Abschnitt: geschriebene Pfade, fester Hinweis zu Freitext und Überschriften in STATUS.md (qa7), `hinweis` der
 *   Antwort, Git-Block (akte-bearbeiten.js, nur Text). Bis „Schließen“ sind weitere Bestätigungen gesperrt (Sperre 'erfolg', Prüfpass
 *   qa 2): STATUS.md und roadmap-ausnahmen.json gehören zu jeder Bestätigung, zwei offene landeten in einem Commit.
 * - Fokusziele tragen stabile Schlüssel in data-roadmap-bereinigung-fokus (Prüfpass qa 1), die die View nach jedem Neuschreiben
 *   wiederfindet; Hauptknöpfe sind nur freigegeben „primary“ (dg 2), Sperrgründe hängen per aria-describedby am Knopf (dg 6, qa 8).
 * - qa8 Variante (a): „Dauerhaft begründete Ausnahmen sind heute nicht vorgesehen.“
 *
 * Wird aufgerufen von: public/leitstand/views/roadmap.js, public/leitstand/roadmap-bereinigung.test.mjs.
 *
 * Wichtig:
 * - Import-sicher und rein: kein fetch, kein DOM, kein Storage. Getippte Werte liest die View aus dem DOM in ihren Zustand.
 * - Projekt- und Servertexte (IDs, Status, Vorschlags- und Nebenwirkungstexte, Gründe, Pfade) werden nie übersetzt und immer
 *   escaped; alle übrigen über t().
 * - Fail-closed: ein Vorschlag ohne `moeglich: true` gilt als nicht möglich. Der Server bleibt maßgeblich (Sperre, Hash, R1).
 * - `hashes` gehen unverändert aus dem GET-Eintrag in den POST; nach jeder Antwort lädt die View die Liste neu.
 */

import { AKTE_GRUND_MAX, gitBlockHtml, gitVon, grundUndVerstoesse } from './akte-bearbeiten.js'
import { formatiereZahl, t, tHtml } from './i18n.js'
import { escapeHtml } from './render.js'
import { deutePlanungAntwort } from './roadmap-anpassen.js'

/** Die beiden Entscheidungen des Servers (ENTSCHEIDUNGEN in routen-planung.mjs). */
export const ENTSCHEIDUNGEN = Object.freeze(['feature_abgeschlossen', 'meilenstein_laeuft'])

/** true für einen String. @param wert - Rohwert @returns boolean */
const istText = (wert) => typeof wert === 'string'

/** Nur die Strings einer Liste. @param liste - Rohwert @returns string[] ([] ohne Liste) */
const nurTexte = (liste) => (Array.isArray(liste) ? liste.filter(istText) : [])

/**
 * Ein Vorschlag aus dem GET, fail-closed normalisiert.
 * @param v - Rohwert
 * @returns { entscheidung, text, nebenwirkung, moeglich, grund } oder null (unbrauchbar)
 */
function vorschlagVon(v) {
  if (v === null || typeof v !== 'object' || !ENTSCHEIDUNGEN.includes(v.entscheidung)) return null
  const moeglich = v.moeglich === true
  return { entscheidung: v.entscheidung, text: istText(v.text) ? v.text : v.entscheidung, nebenwirkung: istText(v.nebenwirkung) ? v.nebenwirkung : '', moeglich, grund: moeglich ? null : istText(v.grund) && v.grund !== '' ? v.grund : null }
}

/**
 * Ein Eintrag aus dem GET.
 * @param e - Rohwert
 * @returns Eintrag oder null (unbrauchbar: ohne ID oder Hashes)
 */
function eintragVon(e) {
  if (e === null || typeof e !== 'object' || !istText(e.eintrag) || e.hashes === null || typeof e.hashes !== 'object') return null
  return {
    eintrag: e.eintrag,
    meilenstein: istText(e.meilenstein) ? e.meilenstein : '',
    feature: istText(e.feature) ? e.feature : '',
    featureStatus: istText(e.featureStatus) ? e.featureStatus : null,
    statusMd: istText(e.quelle?.status_md) ? e.quelle.status_md : null,
    roadmap: istText(e.quelle?.roadmap) ? e.quelle.roadmap : 'docs/projekt/roadmap.json',
    vorschlaege: (Array.isArray(e.vorschlaege) ? e.vorschlaege : []).map(vorschlagVon).filter((v) => v !== null),
    hashes: e.hashes,
  }
}

/**
 * Deutet die Antwort von GET /api/roadmap/bereinigung.
 * @param antwort - geparster Körper
 * @returns { zustand: 'ok', eintraege, befunde } | { zustand: 'nicht_vorhanden' } | { zustand: 'ungueltig', fehler: string[] }
 */
export function deuteBereinigung(antwort) {
  if (antwort?.status === 'nicht_vorhanden') return { zustand: 'nicht_vorhanden' }
  if (antwort?.status === 'ungueltig') return { zustand: 'ungueltig', fehler: nurTexte(antwort.fehler) }
  if (antwort?.status !== 'ok' || !Array.isArray(antwort.eintraege)) return { zustand: 'ungueltig', fehler: [] }
  return { zustand: 'ok', eintraege: antwort.eintraege.map(eintragVon).filter((e) => e !== null), befunde: nurTexte(antwort.befunde) }
}

/** Zahl der Einträge einer gedeuteten Liste. @param liste - deuteBereinigung oder null @returns Zahl */
export const bereinigungsAnzahl = (liste) => (liste?.zustand === 'ok' ? liste.eintraege.length : 0)

/**
 * Formularstand eines Eintrags beim ersten Anzeigen — keine Vorauswahl (Stefan wählt ausdrücklich).
 * @returns { wahl: null, grund: '', haekchen: false, schritt: 'auswahl', phase: 'offen', meldung: null }
 */
export const neuerEintragsStand = () => ({ wahl: null, grund: '', haekchen: false, schritt: 'auswahl', phase: 'offen', meldung: null })

/** Gewählter, möglicher Vorschlag oder null. @param eintrag - Eintrag @param stand - Formularstand @returns Vorschlag oder null */
export const gewaehlterVorschlag = (eintrag, stand) => eintrag.vorschlaege.find((v) => v.moeglich && v.entscheidung === stand.wahl) ?? null

/**
 * true, wenn „Bestätigen …“ möglich ist: möglicher Vorschlag gewählt, Begründung nicht leer, keine Anfrage unterwegs und die Liste
 * nicht gesperrt (eine andere Bestätigung läuft oder die Liste lädt neu — genau ein Eintrag je Klick).
 * @param eintrag - Eintrag
 * @param stand - Formularstand
 * @param gesperrt - true, solange irgendwo gesendet oder neu geladen wird
 * @returns boolean
 */
export function darfBestaetigen(eintrag, stand, gesperrt) {
  return !gesperrt && stand.phase !== 'sendet' && gewaehlterVorschlag(eintrag, stand) !== null && istText(stand.grund) && stand.grund.trim() !== ''
}

/**
 * true, wenn „Jetzt schreiben“ möglich ist: wie darfBestaetigen, im Bestätigungsschritt, bei „Meilenstein → LAEUFT“ mit Häkchen.
 * @param eintrag - Eintrag
 * @param stand - Formularstand
 * @param gesperrt - wie darfBestaetigen
 * @returns boolean
 */
export function darfSchreiben(eintrag, stand, gesperrt) {
  return darfBestaetigen(eintrag, stand, gesperrt) && stand.schritt === 'pruefen' && (stand.wahl !== 'meilenstein_laeuft' || stand.haekchen === true)
}

/**
 * Hinweis unter dem Eintrag, solange nicht bestätigt bzw. geschrieben werden kann (für die View als textContent).
 * @param eintrag - Eintrag
 * @param stand - Formularstand
 * @param sperre - null | 'sendet' (eine andere Bestätigung läuft) | 'laedt' (die Liste lädt neu) | 'erfolg' (ein Git-Block ist noch
 *   offen — STATUS.md und roadmap-ausnahmen.json gehören zu jeder Bestätigung, zwei offene Bestätigungen landeten in einem Commit)
 * @returns Text ('' wenn möglich)
 */
export function bereinigungHinweis(eintrag, stand, sperre) {
  if (stand.phase === 'sendet') return t('roadmap.bereinigung.sendet')
  if (sperre === 'sendet') return t('roadmap.bereinigung.andereLaeuft')
  if (sperre === 'laedt') return t('roadmap.bereinigung.laedtNeu')
  if (sperre === 'erfolg') return t('roadmap.bereinigung.erstCommitten')
  if (eintrag.vorschlaege.every((v) => !v.moeglich)) return ''
  if (gewaehlterVorschlag(eintrag, stand) === null) return t('roadmap.bereinigung.erstWaehlen')
  if (!istText(stand.grund) || stand.grund.trim() === '') return t('roadmap.bereinigung.grundFehlt')
  if (stand.schritt === 'pruefen' && stand.wahl === 'meilenstein_laeuft' && stand.haekchen !== true) return t('roadmap.bereinigung.haekchenFehlt')
  return ''
}

/**
 * Körper für POST …/bereinigung/bestaetigen — hashes unverändert aus dem GET-Eintrag.
 * @param eintrag - Eintrag
 * @param entscheidung - gewählte Entscheidung
 * @param grund - Begründung
 * @returns { eintrag, entscheidung, grund, hashes }
 */
export const baueBestaetigung = (eintrag, entscheidung, grund) => ({ eintrag: eintrag.eintrag, entscheidung, grund, hashes: eintrag.hashes })

/**
 * Deutet die Antwort von POST …/bestaetigen; alles außer 200 über deutePlanungAntwort (dieselben 409/400/422-Formen, Advisor B6).
 * @param status - HTTP-Status
 * @param koerper - geparster Körper ({} wenn keiner)
 * @returns { art: 'ok', eintrag, entscheidung, geschrieben, hinweis, git } | Deutung aus deutePlanungAntwort
 */
export function deuteBestaetigungAntwort(status, koerper) {
  if (status === 200 && koerper?.status === 'ok') {
    return { art: 'ok', eintrag: istText(koerper.eintrag) ? koerper.eintrag : '', entscheidung: istText(koerper.entscheidung) ? koerper.entscheidung : '', geschrieben: nurTexte(koerper.geschrieben), hinweis: istText(koerper.hinweis) && koerper.hinweis !== '' ? koerper.hinweis : null, git: gitVon(koerper) }
  }
  return deutePlanungAntwort(status, koerper)
}

/**
 * Soll der Abschnitt stehen? Nur bei n > 0 (Auftrag) — begründete Abweichung (Advisor A4): auch bei offenem Erfolg samt Git-Block
 * (sonst ginge er nach der letzten Bestätigung verloren), offener Meldung, Ladefehler und ungültiger Liste. Während des Ladens und
 * ohne Roadmap steht nichts da.
 * @param stand - { laden, liste, erfolge, oben }
 * @returns boolean
 */
export function zeigeBereinigung(stand) {
  if (stand.laden === 'fehler' || stand.liste?.zustand === 'ungueltig') return true
  return bereinigungsAnzahl(stand.liste) > 0 || (stand.erfolge?.length ?? 0) > 0 || (stand.oben ?? null) !== null
}

/**
 * Attribut-Wert, über den die View ein Element nach dem Neuschreiben wiederfindet (Fokus, Prüfpass qa 1).
 * @param id - Eintrag '<M>/<F>' bzw. fester Bereich ('oben', 'liste', 'erfolg-<n>')
 * @param feld - Element im Bereich
 * @returns escapter Text
 */
const fokus = (id, feld) => escapeHtml(`${id}|${feld}`)

/**
 * Meldung (konflikt, gesperrt, abgelehnt, fehler) — Servertext wörtlich; die Liste ist danach schon neu geladen. Der Schlusssatz sagt,
 * was jetzt zu tun ist (Prüfpass qa 6): am Eintrag „prüfen und erneut bestätigen“ bzw. „nach dem Ende des Ablaufs“, oben (Eintrag nach
 * dem Neuladen weg) „erledigt oder von Hand geändert“ bzw. nach einem Fehler „vermutlich geschrieben — git status“.
 * @param meldung - Deutung
 * @param eintragId - Eintrag der Meldung
 * @param oben - true, wenn der Eintrag nicht mehr in der Liste steht (mit „Schließen“, Prüfpass cr 6)
 * @returns HTML
 */
function meldungHtml(meldung, eintragId, oben) {
  if (meldung === null || meldung === undefined) return ''
  const link = meldung.art === 'gesperrt' && meldung.workflowId !== null ? `<p><a class="text-link" href="#/workflows/${encodeURIComponent(meldung.workflowId)}">${tHtml('akteForm.gesperrt.link')} <span aria-hidden="true">→</span></a></p>` : ''
  const ton = meldung.art === 'abgelehnt' || meldung.art === 'fehler' ? 'red' : 'amber'
  let text = meldung.art === 'fehler' ? 'roadmap.bereinigung.meldungTextFehler' : meldung.art === 'gesperrt' ? 'roadmap.bereinigung.meldungTextGesperrt' : 'roadmap.bereinigung.meldungText'
  if (oben) text = meldung.art === 'fehler' ? 'roadmap.bereinigung.meldungTextWegFehler' : 'roadmap.bereinigung.meldungTextWeg'
  const bezug = oben ? `<p class="subtle"><code>${escapeHtml(eintragId)}</code></p>` : ''
  const schliessen = oben ? `<div class="action-row"><button type="button" class="button" data-roadmap-bereinigung-aktion="oben-schliessen" data-roadmap-bereinigung-fokus="oben|schliessen">${tHtml('roadmap.bereinigung.schliessen')}</button></div>` : ''
  const ziel = oben ? fokus('oben', 'meldung') : fokus(eintragId, 'meldung')
  return `<div class="note ${ton} rm-bereinigung-meldung" tabindex="-1" data-roadmap-bereinigung-fokus="${ziel}"><strong>${tHtml(`roadmap.bereinigung.${meldung.art}.titel`)}</strong>${bezug}${grundUndVerstoesse(meldung)}${link}<p>${tHtml(text)}</p>${schliessen}</div>`
}

/**
 * Eine Option (Radio) je Vorschlag; nicht mögliche deaktiviert mit Grund (Prosa, kein <code>, design-guardian dg 5) und „von Hand“.
 * @param eintrag - Eintrag
 * @param stand - Formularstand
 * @param v - Vorschlag
 * @param index - Stelle des Eintrags (für eindeutige ids)
 * @param aus - ' disabled' während einer Anfrage, sonst ''
 * @returns HTML
 */
function optionHtml(eintrag, stand, v, index, aus) {
  const id = `rm-bereinigung-${index}-${v.entscheidung}`
  const grund = v.moeglich ? '' : `<small class="rm-bereinigung-grund">${tHtml('roadmap.bereinigung.nichtMoeglich')} ${escapeHtml(v.grund ?? '')}</small>`
  const deaktiviert = !v.moeglich || aus !== ''
  return `<label class="rm-bereinigung-option${v.moeglich ? '' : ' aus'}" for="${id}"><input type="radio" id="${id}" name="rm-bereinigung-wahl-${index}" value="${escapeHtml(v.entscheidung)}" data-roadmap-bereinigung-feld="wahl" data-roadmap-bereinigung-eintrag-id="${escapeHtml(eintrag.eintrag)}" data-roadmap-bereinigung-fokus="${fokus(eintrag.eintrag, v.entscheidung)}"${stand.wahl === v.entscheidung && v.moeglich ? ' checked' : ''}${deaktiviert ? ' disabled' : ''} /><span><strong>${escapeHtml(v.text)}</strong><small>${escapeHtml(v.nebenwirkung)}</small>${grund}</span></label>`
}

/**
 * Hauptknopf eines Eintrags: nur freigegeben als „primary“ (ein sichtbarer Hauptknopf statt fünf gesperrter, dg 2), Sperrgrund über
 * aria-describedby (dg 6, qa 8). Die View schaltet disabled, aria-disabled und primary beim Tippen direkt um.
 * @param eintrag - Eintrag
 * @param aktion - 'bestaetigen' | 'schreiben'
 * @param frei - darf geklickt werden
 * @param hinweisId - id des Hinweises
 * @returns HTML
 */
function hauptknopfHtml(eintrag, aktion, frei, hinweisId) {
  return `<button type="button" class="button${frei ? ' primary' : ''}" data-roadmap-bereinigung-aktion="${aktion}" data-roadmap-bereinigung-eintrag-id="${escapeHtml(eintrag.eintrag)}" data-roadmap-bereinigung-fokus="${fokus(eintrag.eintrag, aktion)}" aria-describedby="${hinweisId}"${frei ? '' : ' disabled aria-disabled="true"'}>${tHtml(`roadmap.bereinigung.${aktion}`)}</button>`
}

/**
 * Bestätigungsschritt (inline, role=group): Nebenwirkung, Datumshinweis (qa6) bzw. „nicht zurücknehmbar“ mit Häkchen (qa2).
 * @param eintrag - Eintrag
 * @param stand - Formularstand (schritt 'pruefen', Wahl möglich)
 * @param index - Stelle des Eintrags (für eindeutige ids)
 * @param kontext - { sperre, datum }
 * @returns HTML
 */
function pruefenHtml(eintrag, stand, index, kontext) {
  const v = gewaehlterVorschlag(eintrag, stand)
  const aus = stand.phase === 'sendet' ? ' disabled' : ''
  const titelId = `rm-bereinigung-pruefen-${index}`
  const hinweisId = `rm-bereinigung-hinweis-${index}`
  let zusatz
  if (v.entscheidung === 'meilenstein_laeuft') {
    zusatz = `<div class="note amber"><strong>${tHtml('roadmap.bereinigung.laeuft.titel')}</strong><p>${tHtml('roadmap.bereinigung.laeuft.text', { id: eintrag.meilenstein }, { pfad: `<code>${escapeHtml(eintrag.roadmap)}</code>` })}</p></div>
      <label class="rm-bereinigung-haekchen" for="rm-bereinigung-haekchen-${index}"><input type="checkbox" id="rm-bereinigung-haekchen-${index}" data-roadmap-bereinigung-feld="haekchen" data-roadmap-bereinigung-eintrag-id="${escapeHtml(eintrag.eintrag)}" data-roadmap-bereinigung-fokus="${fokus(eintrag.eintrag, 'haekchen')}"${stand.haekchen ? ' checked' : ''}${aus} /><span>${tHtml('roadmap.bereinigung.laeuft.haekchen')}</span></label>`
  } else {
    zusatz = `<div class="note amber"><p>${tHtml('roadmap.bereinigung.datum', {}, { datum: `<code>${escapeHtml(kontext.datum)}</code>` })}</p></div>`
  }
  return `<div class="rm-bereinigung-pruefen" role="group" aria-labelledby="${titelId}" tabindex="-1" data-roadmap-bereinigung-fokus="${fokus(eintrag.eintrag, 'pruefen')}">
      <strong id="${titelId}">${tHtml('roadmap.bereinigung.pruefen.titel', { text: v.text })}</strong>
      <p class="subtle">${escapeHtml(v.nebenwirkung)}</p>
      <p class="subtle">${tHtml('roadmap.bereinigung.pruefen.grund')} ${escapeHtml(stand.grund.trim())}</p>
      ${zusatz}
      ${meldungHtml(stand.meldung, eintrag.eintrag, false)}
      <p class="rm-anpassen-hinweis" id="${hinweisId}" data-roadmap-bereinigung-hinweis="${escapeHtml(eintrag.eintrag)}">${escapeHtml(bereinigungHinweis(eintrag, stand, kontext.sperre))}</p>
      <div class="action-row">${hauptknopfHtml(eintrag, 'schreiben', darfSchreiben(eintrag, stand, kontext.sperre !== null), hinweisId)}<button type="button" class="button" data-roadmap-bereinigung-aktion="zurueck" data-roadmap-bereinigung-eintrag-id="${escapeHtml(eintrag.eintrag)}" data-roadmap-bereinigung-fokus="${fokus(eintrag.eintrag, 'zurueck')}"${aus}>${tHtml('roadmap.bereinigung.zurueck')}</button></div>
    </div>`
}

/**
 * Ein Eintrag der Liste (Auswahl- bzw. Bestätigungsschritt).
 * @param eintrag - Eintrag
 * @param stand - Formularstand
 * @param index - Stelle in der Liste (für eindeutige ids)
 * @param kontext - { sperre, datum }
 * @returns HTML
 */
function eintragHtml(eintrag, stand, index, kontext) {
  const kopf = `<div class="rm-bereinigung-kopf"><strong><code>${escapeHtml(eintrag.eintrag)}</code></strong><span class="subtle">${tHtml('roadmap.bereinigung.featureStatus')} <code>${escapeHtml(eintrag.featureStatus ?? '–')}</code></span><span class="subtle">${tHtml('roadmap.bereinigung.statusMd')} ${eintrag.statusMd === null ? '–' : `<code>${escapeHtml(eintrag.statusMd)}</code>`}</span></div>`
  const pruefen = stand.schritt === 'pruefen' && gewaehlterVorschlag(eintrag, stand) !== null
  if (pruefen) return `<li class="rm-bereinigung-eintrag" data-roadmap-bereinigung-eintrag="${escapeHtml(eintrag.eintrag)}">${kopf}${pruefenHtml(eintrag, stand, index, kontext)}</li>`
  const aus = stand.phase === 'sendet' ? ' disabled' : ''
  const vorschlaege =
    eintrag.vorschlaege.length === 0
      ? `<p class="subtle">${tHtml('roadmap.bereinigung.keinVorschlag')}</p>`
      : `<fieldset class="rm-bereinigung-vorschlaege"><legend>${tHtml('roadmap.bereinigung.vorschlag')}</legend>${eintrag.vorschlaege.map((v) => optionHtml(eintrag, stand, v, index, aus)).join('')}</fieldset>`
  const moeglich = eintrag.vorschlaege.some((v) => v.moeglich)
  const grundId = `rm-bereinigung-grund-${index}`
  const hinweisId = `rm-bereinigung-hinweis-${index}`
  const formular = moeglich
    ? `<div class="rm-anpassen-feld"><label for="${grundId}">${tHtml('roadmap.bereinigung.grund')} <span aria-hidden="true">*</span></label><textarea id="${grundId}" rows="2" maxlength="${AKTE_GRUND_MAX}" required aria-required="true" aria-describedby="${grundId}-hinweis" data-roadmap-bereinigung-feld="grund" data-roadmap-bereinigung-eintrag-id="${escapeHtml(eintrag.eintrag)}" data-roadmap-bereinigung-fokus="${fokus(eintrag.eintrag, 'grund')}"${aus}>${escapeHtml(stand.grund)}</textarea><p class="subtle" id="${grundId}-hinweis">${tHtml('roadmap.bereinigung.grundHinweis')}</p></div>
      ${meldungHtml(stand.meldung, eintrag.eintrag, false)}
      <p class="rm-anpassen-hinweis" id="${hinweisId}" data-roadmap-bereinigung-hinweis="${escapeHtml(eintrag.eintrag)}">${escapeHtml(bereinigungHinweis(eintrag, stand, kontext.sperre))}</p>
      <div class="action-row">${hauptknopfHtml(eintrag, 'bestaetigen', darfBestaetigen(eintrag, stand, kontext.sperre !== null), hinweisId)}</div>`
    : meldungHtml(stand.meldung, eintrag.eintrag, false)
  return `<li class="rm-bereinigung-eintrag" data-roadmap-bereinigung-eintrag="${escapeHtml(eintrag.eintrag)}">${kopf}${vorschlaege}${formular}</li>`
}

/**
 * Erfolg oben im Abschnitt: geschriebene Pfade, fester STATUS.md-Hinweis (qa7), hinweis der Antwort, Git-Block und die Bitte, ihn vor
 * der nächsten Bestätigung auszuführen (Prüfpass qa 2 — bis „Schließen“ sind weitere Bestätigungen gesperrt).
 * @param erfolg - deuteBestaetigungAntwort (art 'ok') plus text (Vorschlagstext)
 * @param index - Stelle in der Liste der Erfolge (neueste zuerst)
 * @returns HTML
 */
function erfolgHtml(erfolg, index) {
  const hinweis = erfolg.hinweis === null ? '' : `<p class="subtle">${tHtml('roadmap.bereinigung.erfolg.hinweis')} ${escapeHtml(erfolg.hinweis)}</p>`
  const pfade = erfolg.geschrieben.length > 0 ? erfolg.geschrieben.map((p) => `<code>${escapeHtml(p)}</code>`).join(', ') : '–'
  return `<div class="note rm-bereinigung-erfolg" tabindex="-1" data-roadmap-bereinigung-fokus="${fokus(`erfolg-${index}`, 'ziel')}">
      <strong>${tHtml('roadmap.bereinigung.erfolg.titel', {}, { eintrag: `<code>${escapeHtml(erfolg.eintrag)}</code>`, text: escapeHtml(erfolg.text ?? '') })}</strong>
      <p class="subtle">${tHtml('roadmap.bereinigung.erfolg.geschrieben')} ${pfade}</p>
      <p>${tHtml('roadmap.bereinigung.erfolg.statusMd')}</p>
      ${hinweis}
      ${gitBlockHtml(erfolg.git, 'roadmap.bereinigung.gitHinweis')}
      <p class="subtle">${tHtml('roadmap.bereinigung.erfolg.commitZuerst')}</p>
      <div class="action-row"><button type="button" class="button" data-roadmap-bereinigung-aktion="erfolg-schliessen" data-roadmap-bereinigung-index="${index}" data-roadmap-bereinigung-fokus="${fokus(`erfolg-${index}`, 'schliessen')}">${tHtml('roadmap.bereinigung.schliessen')}</button></div>
    </div>`
}

/**
 * Der Abschnitt „Bereinigung (n)“ (zeigeBereinigung entscheidet, ob er steht).
 * @param stand - { laden: 'laedt' | 'ok' | 'fehler', fehlerGrund, liste, staende: Map<eintrag, Formularstand>, erfolge (des aktiven
 *   Projekts, neueste zuerst; jeder bleibt bis „Schließen“), oben ({ eintrag, meldung } oder null), neuLaden, sperre: null | 'sendet' |
 *   'laedt' | 'erfolg', datum (JJJJ-MM-TT, heute) }
 * @returns HTML
 */
export function bereinigungHtml(stand) {
  const n = bereinigungsAnzahl(stand.liste)
  const kopf = `<div class="section-label"><div><h2 id="rm-bereinigung-titel" tabindex="-1" data-roadmap-bereinigung-fokus="${fokus('liste', 'titel')}">${tHtml('roadmap.bereinigung.titel', { zahl: formatiereZahl(n) })}</h2><p class="subtle">${tHtml('roadmap.bereinigung.text')}</p><p class="subtle">${tHtml('roadmap.bereinigung.ausnahmen')}</p></div></div>`
  const teile = []
  for (const [index, erfolg] of (stand.erfolge ?? []).entries()) teile.push(erfolgHtml(erfolg, index))
  if (stand.oben !== null && stand.oben !== undefined) teile.push(meldungHtml(stand.oben.meldung, stand.oben.eintrag, true))
  if (stand.laden === 'fehler') {
    // Beim erneuten Laden bleibt der Kasten mit gesperrtem Knopf stehen (Prüfpass cr 4, qa 5).
    const grund = istText(stand.fehlerGrund) && stand.fehlerGrund !== '' ? `<p><code>${escapeHtml(stand.fehlerGrund)}</code></p>` : ''
    const laedt = stand.neuLaden === true
    teile.push(`<div class="note red" tabindex="-1" data-roadmap-bereinigung-fokus="${fokus('liste', 'fehler')}"><strong>${tHtml('roadmap.bereinigung.ladefehler.titel')}</strong>${grund}<button type="button" class="button" data-roadmap-bereinigung-aktion="laden" data-roadmap-bereinigung-fokus="${fokus('liste', 'laden')}"${laedt ? ' disabled aria-disabled="true"' : ''}>${tHtml(laedt ? 'roadmap.laedt' : 'roadmap.fehler.erneut')}</button></div>`)
  } else if (stand.liste?.zustand === 'ungueltig') {
    const fehler = stand.liste.fehler.length === 0 ? '' : `<ul>${stand.liste.fehler.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>`
    teile.push(`<div class="note red"><strong>${tHtml('roadmap.bereinigung.ungueltig.titel')}</strong><p>${tHtml('roadmap.bereinigung.ungueltig.text')}</p>${fehler}</div>`)
  } else if (stand.liste?.zustand === 'ok') {
    if (stand.liste.befunde.length > 0) {
      teile.push(`<details class="rm-bereinigung-befunde"><summary>${tHtml('roadmap.bereinigung.befunde', { anzahl: stand.liste.befunde.length, zahl: formatiereZahl(stand.liste.befunde.length) })}</summary><ul>${stand.liste.befunde.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul></details>`)
    }
    if (n > 0) {
      const kontext = { sperre: stand.sperre ?? null, datum: stand.datum }
      teile.push(`<ol class="rm-bereinigung-liste">${stand.liste.eintraege.map((e, i) => eintragHtml(e, stand.staende.get(e.eintrag) ?? neuerEintragsStand(), i, kontext)).join('')}</ol>`)
    }
  }
  return `<section class="rm-bereinigung" aria-labelledby="rm-bereinigung-titel" data-roadmap-bereinigung>${kopf}${teile.join('')}</section>`
}

/**
 * Knopf an der Trennzeile: „n Abweichungen zur Bereinigung“, springt zum Abschnitt (kein Hash-Link — der Router nutzt den Hash).
 * @param n - Zahl der Einträge
 * @returns HTML ('' bei n = 0)
 */
export function trennzeileBereinigungHtml(n) {
  if (n <= 0) return ''
  return `<button type="button" class="button rm-zur-bereinigung" data-roadmap-zur-bereinigung>${tHtml('roadmap.bereinigung.zaehler', { anzahl: n, zahl: formatiereZahl(n) })}</button>`
}
