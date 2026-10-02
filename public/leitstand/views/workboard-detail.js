/**
 * Datei: public/leitstand/views/workboard-detail.js
 *
 * Zweck: Anzeige-Bausteine des Details `#/workboard/<id>` der Seite „Entwicklung“ (F46 D3,
 * docs/design/abgleich-f46.md Leitprinzip, §4.6 Feature, §4.8 Bug; Bilder 07-eintrag-detail--Main und
 * --Bug). Drei Ebenen:
 * 1. Wo bin ich? — Kopf mit Typ-Chip · ID (· Priorität), Titel, bei Befunden „gefunden bei“;
 *    Status-Block rechts daneben.
 * 2. Was ist wichtig? — „Kurz gesagt“ (was, gerade, als Nächstes — nur aus Daten) und das Jetzt-Band:
 *    genau ein Hauptknopf, wenn Stefan dran ist, sonst eine ruhige Zeile.
 * 3. Mehr bei Bedarf — Feature: Das Was (Register Auftrag · Abnahmekriterien mit Urteil · Nicht-Ziele
 *    · Fertig, wenn), Fortschritt (Rollen-Kreis), Code & Doku Review, Verlauf; Befund: Fehlerbild,
 *    Behebung in Schritten, Verlauf des Befunds. Rechte Spalte „Deine Planung“ bzw. „Einordnung“ mit
 *    Links. Was keine Quelle hat, steht als „kommt“ (kommt.js) mit Ziel, nie mit Beispielwerten.
 *
 * Reine Render-Funktionen: Sie bekommen eine „Sicht“ und liefern HTML. Laden, Zustand, Click-to-Work
 * und Routen bleiben in views/workboard.js — dieses Modul kennt weder fetch noch DOM.
 *
 * Eine Sicht:
 *   { workitem,
 *     workflow: Workflow-Eintrag des Aggregats (Kopfdaten mit abnahme: { offen, status }) oder null,
 *     verknuepfung: 'laedt' | 'fehlt' | 'ok' (ob der verknüpfte Workflow bestimmbar ist),
 *     schritte: undefined (lädt) | null (nicht ladbar) | Schritte aus GET …/workflows/<id>,
 *     abnahme: undefined (lädt bzw. kein Ablauf) | null (nicht ladbar) | Antwort von GET …/abnahme,
 *     akte: undefined (lädt, nur Features) | { status: 'ok', titel, featureStatus, ziel, nicht_ziele,
 *           akzeptanzkriterien } | { status: 'unvollstaendig', grund } | { status: 'fehler', meldung },
 *     roadmap: undefined (lädt, nur Features) | Projektion von GET …/roadmap | { status: 'fehler' },
 *     workitems: alle Workitems (für Befunde je Feature und die Zahl offener Befunde) | null | undefined,
 *     ctw: Click-to-Work-Stand — 'frei' | 'gesperrt' | 'laedt' (Einstieg sichtbar), 'vorschlag'
 *          (Vorschlag wartet auf Freigeben/Ablehnen), 'stoerung' (Fehler oder Konflikt mit
 *          „Wiederholen“), 'aktiv' (anderer Zwischenstand), 'keiner',
 *     repoPfad: absoluter Projektordner oder null (VS-Code-Links),
 *     remoteWebUrl: geprüfte GitHub-Adresse des Repos oder null (F46 D4, „Pull Requests“),
 *     kreisAuswahl: gewählte Rolle im Rollen-Kreis oder null (Vorauswahl),
 *     wasReiter: gewählter Reiter in „Das Was“ oder null (Vorauswahl) }
 *
 * Wird aufgerufen von:
 * - public/leitstand/views/workboard.js
 * - public/leitstand/views/workboard-detail.test.mjs (node:test)
 *
 * Wichtig:
 * - Import-sicher: kein Zugriff auf DOM oder Storage beim Import.
 * - Akten-, Workitem- und Servertexte (Titel, Ziel, AKs, Belege, Gründe, IDs, Statuswerte) werden
 *   nie übersetzt und immer escaped; alle übrigen Texte über t().
 * - Offen ist eine Abnahme nur nach dem Kopfdatum abnahme.offen (ermittleAbnahmeStand im Server,
 *   eine Regel mit GET …/abnahme und „Deine Entscheidungen“).
 * - Sätze in „Kurz gesagt“ und im Jetzt-Band sind feste Vorlagen, gefüllt nur mit Daten (Regel 8).
 */

import { befundeAusFeature, findeFundstellenPfad, fundstelleHtml, jetztBandHtml, kuerzeText, kurzGesagtHtml, statusBlockHtml } from '../eintrag-bausteine.js'
import { istNichtTerminal, schrittFortschritt, workflowPhase } from '../entwicklung-daten.js'
import { schrittFolge } from '../fokus-daten.js'
import { formatiereZahl, t, tHtml } from '../i18n.js'
import { kommtBadge, kommtKnopf } from '../kommt.js'
import { baueVsCodeLink } from '../kopf-werkzeuge.js'
import { escapeHtml } from '../render.js'
import { roadmapZustand, statusKategorie as roadmapStatusKategorie } from '../roadmap-anzeige.js'
import { rollenName, workerName } from '../rollen-anzeige.js'
import { kreisStatus, rollenKreisHtml, vorgewaehlteRolle } from '../rollen-kreis.js'
import { chipTypVonWorkitem, typChip } from '../typ-chip.js'

/** Bekannte Workitem-Typen mit übersetzter Bezeichnung; ein anderer Typ erscheint roh. */
const BEKANNTE_TYPEN = new Set(['FEATURE', 'BUG', 'HARNESS_IMPROVEMENT', 'TECH_DEBT', 'PROCESS_IMPROVEMENT'])

/** Schritt-Status mit übersetzter Bezeichnung (SCHRITT_STATUS, src/workflow/index.ts); ein anderer erscheint roh. */
const SCHRITT_STATUS = new Set(['OFFEN', 'WARTET_FREIGABE', 'LAEUFT', 'ERFOLGREICH', 'VERWEIGERT', 'FEHLGESCHLAGEN', 'UEBERSPRUNGEN'])

/** Urteile je AK aus dem Review (ak_urteile) mit Wörterbuchschlüssel abnahme.ak.<Urteil>. */
const AK_URTEILE = new Set(['ERFUELLT', 'NICHT_ERFUELLT', 'NICHT_PRUEFBAR'])

/** Reiter von „Das Was“ in Reihenfolge des Bilds 07-Main. */
export const WAS_REITER = Object.freeze(['auftrag', 'ak', 'nicht', 'dod'])

/** ID-Präfix des Rollen-Kreises im Detail (die Übersicht nutzt den Standard 'rollen-kreis'). */
export const DETAIL_KREIS_PRAEFIX = 'detail-kreis'

/** ID des Panels „Rolle im Detail“ unter dem Rollen-Kreis. */
const KREIS_PANEL_ID = 'detail-kreis-rolle'

/** Feature-Status, unter denen kein Bau-Auftrag mehr angelegt werden kann (F35 WS-1 AK6). */
export const FEATURE_ENDSTATUS = new Set(['ABGESCHLOSSEN', 'ABGEBROCHEN'])

// ─── Gemeinsame kleine Bausteine ─────────────────────────────────────────────

/**
 * Ordnet den Status eines Workitems einer der drei .status-punkt-Klassen zu (ok/aktiv/neutral,
 * F29 WS-1b) — kein neues Farbvokabular.
 * @param workitem - ein Workitem
 * @returns 'ok' | 'aktiv' | 'neutral'
 */
export function statusKategorie(workitem) {
  if (workitem.status === 'ERLEDIGT' || workitem.status === 'ABGESCHLOSSEN') return 'ok'
  if (workitem.status === 'OFFEN' || workitem.status === 'FEATURE_GATE') return 'aktiv'
  return 'neutral'
}

/**
 * Übersetzte Typbezeichnung als Text; ein unbekannter Typ erscheint roh (Projektinhalt).
 * @param typ - workitem.typ
 * @returns Text
 */
export function typBezeichnung(typ) {
  return BEKANNTE_TYPEN.has(typ) ? t(`entwicklung.typ.${typ}`) : String(typ ?? '')
}

/**
 * Übersetzter Status eines Workitems: Feature-Akten über die Kategorien der Roadmap
 * (roadmap-anzeige.js, eine Regel), Findings OFFEN/ERLEDIGT/SONSTIGES; der Rohwert steht im title.
 * @param workitem - ein Workitem
 * @returns HTML
 */
export function kartenStatus(workitem) {
  const roh = workitem.quelle === 'finding' ? (workitem.statusRoh ?? workitem.status) : workitem.status
  const text = workitem.quelle === 'feature' ? t(`roadmap.status.${roadmapStatusKategorie(workitem.status)}`) : t(`entwicklung.findingStatus.${['OFFEN', 'ERLEDIGT'].includes(workitem.status) ? workitem.status : 'SONSTIGES'}`)
  return `<span title="${escapeHtml(roh ?? '')}">${escapeHtml(text)}</span>`
}

/**
 * Übersetzte Phase eines Workflows (workflowPhase) mit dem Rohstatus im title — Karte und Status-Block.
 * @param workflow - Workflow-Eintrag des Aggregats
 * @returns HTML, oder '' ohne Workflow
 */
export function phaseHtml(workflow) {
  const phase = workflowPhase(workflow)
  if (phase === null) return ''
  return `<span title="${escapeHtml(workflow.status ?? '')}">${tHtml(`entwicklung.phase.${phase}`)}</span>`
}

/**
 * Titel eines Workitems (Projektinhalt), sonst die ID.
 * @param workitem - ein Workitem
 * @returns Text
 */
export function titelVon(workitem) {
  return typeof workitem.titel === 'string' && workitem.titel.trim() !== '' ? workitem.titel : workitem.id
}

/**
 * Eyebrow des Kopfs: Typ-Chip mit ID (und bei Befunden der Priorität), Bild „FEATURE · F44“ bzw.
 * „BUG · F-885 · P3“. Ein unbekannter Typ erscheint als Text „Typ · ID“.
 * @param workitem - ein Workitem
 * @returns HTML
 */
export function detailEyebrowHtml(workitem) {
  const zusatz = workitem.quelle === 'finding' && typeof workitem.prioritaet === 'string' ? `${workitem.id} · ${workitem.prioritaet}` : String(workitem.id)
  const chip = typChip(chipTypVonWorkitem(workitem.typ), { zusatz })
  return chip !== '' ? chip : escapeHtml(`${typBezeichnung(workitem.typ)} · ${workitem.id}`)
}

/** true, wenn die Abnahme des verknüpften Ablaufs offen ist (Kopfdatum abnahme.offen). @param sicht - siehe Dateikopf */
function abnahmeOffen(sicht) {
  return sicht.workflow?.abnahme?.offen === true
}

/** true für einen Befund vom Typ BUG. @param workitem - ein Workitem */
export function istBug(workitem) {
  return workitem.quelle === 'finding' && workitem.typ === 'BUG'
}

/**
 * Status eines Schritts als Text (übersetzt, unbekannt roh).
 * @param status - schritt.status
 * @returns Text
 */
function schrittStatusText(status) {
  return SCHRITT_STATUS.has(status) ? t(`entwicklung.detail.schrittStatus.${status}`) : String(status ?? '')
}

/**
 * Link „In VS Code öffnen“ für eine Datei des Projekts — ohne bekannten Projektordner gesperrt
 * (aria-disabled, Muster Kopf-Werkzeuge; initKommt hält Klick und Enter an).
 * @param repoPfad - absoluter Projektordner oder null
 * @param relPfad - Repo-relativer Pfad
 * @param zeile - Zeilennummer oder null
 * @param text - sichtbarer Text (übersetzt)
 * @returns HTML
 */
function vsCodeLink(repoPfad, relPfad, zeile, text) {
  const link = typeof repoPfad === 'string' && repoPfad !== '' ? baueVsCodeLink(`${repoPfad.replace(/[\\/]+$/, '')}/${relPfad}${zeile !== null ? `:${zeile}` : ''}`) : null
  if (link === null) return `<a class="text-link" role="link" tabindex="0" aria-disabled="true" title="${tHtml('kopf.vscodeOhne')}">${escapeHtml(text)}</a>`
  return `<a class="text-link" href="${escapeHtml(link)}">${escapeHtml(text)}</a>`
}

/**
 * Inhalt der Kachel „Änderungen“ (F46 D4): Verweis auf den Code-Reiter. Die Leseroute kennt den
 * Arbeitsstand des ganzen Repos, nicht die Dateien eines Eintrags — der Satz sagt das, statt eine
 * Zuordnung zu behaupten (Regel 8 des Abgleichs).
 * @returns HTML
 */
function aenderungenInhalt() {
  return `<p><a class="text-link" href="#/code">${tHtml('eintrag.review.aenderungenLink')} <span aria-hidden="true">→</span></a></p><p class="subtle">${tHtml('eintrag.review.aenderungenHinweis')}</p>`
}

/**
 * Eine Kachel mit Eyebrow, Inhalt und optionalem Chip (Code & Doku Review, Verlauf, Fehlerbild).
 * @param titel - Eyebrow (übersetzt)
 * @param inhaltHtml - Inhalt als HTML
 * @param optionen - { chipHtml, klasse }
 * @returns HTML
 */
function kachel(titel, inhaltHtml, optionen = {}) {
  return `<div class="eintrag-kachel${optionen.klasse ? ` ${optionen.klasse}` : ''}"><p class="eintrag-kachel-kopf"><span>${escapeHtml(titel)}</span>${optionen.chipHtml ?? ''}</p>${inhaltHtml}</div>`
}

/**
 * Inhalt einer Kachel „kommt“: Badge und Ziel (Fixpaket bzw. Vorhaben), keine Beispielwerte.
 * @param zielSchluessel - Wörterbuchschlüssel des Satzes, wohin das Element kommt
 * @returns HTML
 */
function kommtInhalt(zielSchluessel) {
  return `<p class="eintrag-kommt">${kommtBadge()} <span class="subtle">${tHtml(zielSchluessel)}</span></p>`
}

/**
 * Hinweis auf eine unvollständige oder nicht lesbare Akte (Grund ist Servertext).
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
function akteHinweis(sicht) {
  const pfad = `<p><code>${escapeHtml(sicht.workitem.pfad ?? `features/${sicht.workitem.id}/feature.md`)}</code></p>`
  if (sicht.akte?.status === 'unvollstaendig') return `<div class="note amber"><strong>${tHtml('entwicklung.detail.akte.unvollstaendig')}</strong><p>${escapeHtml(sicht.akte.grund ?? '')}</p>${pfad}</div>`
  return `<div class="note red"><strong>${tHtml('entwicklung.detail.akte.fehler')}</strong><p><code>${escapeHtml(sicht.akte?.meldung ?? '')}</code></p>${pfad}</div>`
}

/**
 * Meilenstein eines Features aus der Roadmap-Projektion (nur lesend).
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
function meilensteinText(sicht) {
  const zustand = sicht.roadmap === undefined ? 'laedt' : roadmapZustand(sicht.roadmap)
  if (zustand === 'laedt') return tHtml('entwicklung.laedt')
  if (zustand === 'nicht_vorhanden') return tHtml('entwicklung.detail.planung.keineRoadmap')
  if (zustand !== 'ok') return tHtml('entwicklung.detail.planung.nichtVerfuegbar')
  const meilenstein = sicht.roadmap.meilensteine.find((m) => m.features.some((f) => f?.id === sicht.workitem.id))
  return meilenstein === undefined ? tHtml('entwicklung.detail.planung.nichtEingeplant') : escapeHtml(meilenstein.titel ?? meilenstein.id ?? '')
}

// ─── Ebene 2: Kurz gesagt (nur aus Daten) ────────────────────────────────────

/**
 * Der Schritt zu einer Schritt-ID.
 * @param sicht - siehe Dateikopf
 * @param schrittId - Kennung oder null
 * @returns Schritt oder null
 */
function schrittMitId(sicht, schrittId) {
  return Array.isArray(sicht.schritte) && typeof schrittId === 'string' ? (sicht.schritte.find((s) => s?.schritt_id === schrittId) ?? null) : null
}

/**
 * „Was gerade passiert“: feste Sätze je Ablaufphase, mit Rolle und Worker des laufenden Schritts.
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
export function geradeHtml(sicht) {
  if (sicht.verknuepfung === 'laedt') return tHtml('entwicklung.laedt')
  if (sicht.verknuepfung === 'fehlt') return tHtml('entwicklung.spalte.leer.unvollstaendig')
  if (sicht.workflow === null) return tHtml('eintrag.gerade.keinAblauf')
  const phase = workflowPhase(sicht.workflow)
  if (phase === 'abgeschlossen') {
    if (abnahmeOffen(sicht)) return tHtml('eintrag.gerade.abnahmeOffen')
    return tHtml(sicht.workflow.abnahme?.status === 'ok' ? 'eintrag.gerade.entschieden' : 'eintrag.gerade.abgeschlossen')
  }
  if (phase === 'laeuft' && Array.isArray(sicht.schritte)) {
    const { jetzt } = schrittFolge(sicht.workflow, sicht.schritte)
    if (jetzt?.status === 'LAEUFT') return tHtml('eintrag.gerade.rolle', { rolle: rollenName(jetzt.rolle), worker: workerName(jetzt.worker) || '–' })
  }
  return tHtml(`eintrag.gerade.${['freigabe', 'rueckfrage', 'bereit', 'laeuft', 'klaerung', 'gestoppt'].includes(phase) ? phase : 'unbekannt'}`)
}

/**
 * „Was als Nächstes kommt“: offene Abnahme, sonst nach naechster.art des Automaten (Kopfdaten), bei
 * einem laufenden Schritt sein Nachfolger. Ohne Ablauf: Feature baubar → „Auftrag vorbereiten“,
 * Endstatus → nichts.
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
export function naechstesHtml(sicht) {
  const { workitem, workflow } = sicht
  if (sicht.verknuepfung === 'laedt') return tHtml('entwicklung.laedt')
  if (sicht.verknuepfung === 'fehlt') return tHtml('entwicklung.spalte.leer.unvollstaendig')
  if (workflow === null) {
    const ende = workitem.quelle === 'feature' ? FEATURE_ENDSTATUS.has(workitem.status) : workitem.status === 'ERLEDIGT'
    return tHtml(ende ? 'eintrag.naechstes.nichts' : 'eintrag.naechstes.vorbereiten')
  }
  if (abnahmeOffen(sicht)) return tHtml('eintrag.naechstes.abnahme')
  if (Array.isArray(sicht.schritte)) {
    const { jetzt, danach } = schrittFolge(workflow, sicht.schritte)
    if (jetzt?.status === 'LAEUFT') return danach !== null ? tHtml('eintrag.naechstes.danach', { rolle: rollenName(danach.rolle) }) : tHtml('eintrag.naechstes.letzterSchritt')
  }
  const art = workflow.naechster?.art
  if (art === 'haltFreigabe') {
    const schritt = schrittMitId(sicht, workflow.naechster.schrittId)
    return schritt !== null ? tHtml('eintrag.naechstes.freigabeRolle', { rolle: rollenName(schritt.rolle) }) : tHtml('eintrag.naechstes.freigabe')
  }
  if (art === 'starte') {
    const schritt = schrittMitId(sicht, workflow.naechster.schrittId)
    return schritt !== null ? tHtml('eintrag.naechstes.starteRolle', { rolle: rollenName(schritt.rolle) }) : tHtml('eintrag.naechstes.starte')
  }
  if (art === 'haltKlaerung') return tHtml(workflowPhase(workflow) === 'rueckfrage' ? 'eintrag.naechstes.rueckfrage' : 'eintrag.naechstes.klaerung')
  if (['haltGestoppt', 'haltGrenze', 'fertig'].includes(art)) return tHtml(`eintrag.naechstes.${art}`)
  return '–'
}

/**
 * „Kurz gesagt“ des Details: Feature — was (Ziel der Akte, gekürzt), gerade, als Nächstes;
 * Befund — was passiert (Beschreibung), wie schlimm (Auswirkung), was als Nächstes (Maßnahme), je
 * gekürzt, nicht umformuliert. Fehlt ein Registerfeld, steht „–“.
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
export function detailKurzHtml(sicht) {
  const { workitem } = sicht
  if (workitem.quelle === 'feature') {
    let was
    if (sicht.akte === undefined) was = tHtml('entwicklung.detail.akte.laedt')
    else if (sicht.akte.status === 'ok') was = escapeHtml(kuerzeText(sicht.akte.ziel) ?? '–')
    else was = tHtml('eintrag.kurz.akteNichtLesbar')
    return kurzGesagtHtml([
      { label: t('eintrag.kurz.was'), wertHtml: was },
      { label: t('eintrag.kurz.gerade'), wertHtml: geradeHtml(sicht) },
      { label: t('eintrag.kurz.naechstes'), wertHtml: naechstesHtml(sicht) },
    ])
  }
  const feld = (wert) => escapeHtml(kuerzeText(wert) ?? '–')
  return kurzGesagtHtml([
    { label: t(istBug(workitem) ? 'eintrag.kurz.wasPassiert' : 'eintrag.kurz.worum'), wertHtml: feld(workitem.beschreibung ?? workitem.titel) },
    { label: t('eintrag.kurz.wieSchlimm'), wertHtml: feld(workitem.auswirkung) },
    { label: t('eintrag.kurz.naechstes'), wertHtml: naechstesBefundHtml(sicht) },
  ])
}

/**
 * „Was als Nächstes kommt“ eines Befunds: erledigt → nichts mehr; gibt es einen verknüpften Ablauf (oder
 * ist er noch nicht bestimmbar), dieselbe Regel wie beim Feature (naechstesHtml — sonst widerspräche
 * „Kurz gesagt“ dem Jetzt-Band); sonst die Maßnahme des Registers, gekürzt.
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
function naechstesBefundHtml(sicht) {
  if (sicht.workitem.status === 'ERLEDIGT') return tHtml('eintrag.naechstes.nichts')
  if (sicht.verknuepfung !== 'ok' || sicht.workflow !== null) return naechstesHtml(sicht)
  return escapeHtml(kuerzeText(sicht.workitem.massnahme) ?? '–')
}

/**
 * Zeile unter dem Titel eines Befunds: „gefunden: <Feld Feature/Run>“ (Register), dazu „verwandt“
 * und „Bereich“ als „kommt“ (Fixpaket B5). Features haben keine solche Zeile.
 * @param sicht - siehe Dateikopf
 * @returns HTML ('' bei Features)
 */
export function detailKopfZusatzHtml(sicht) {
  const { workitem } = sicht
  if (workitem.quelle !== 'finding') return ''
  // Das Register schreibt das Feld meist als „Entdeckt: …“ — vor „gefunden:“ entfällt das doppelte Wort.
  const wert = typeof workitem.featureRun === 'string' ? workitem.featureRun.trim().replace(/^Entdeckt:\s*/i, '') : ''
  const gefunden = wert !== '' ? `<span class="eintrag-chip">${tHtml('eintrag.kopf.gefunden', { wert })}</span>` : ''
  return `${gefunden}<span class="eintrag-chip">${tHtml('eintrag.kopf.verwandt')} ${kommtBadge()}</span><span class="eintrag-chip">${tHtml('eintrag.kopf.bereich')} ${kommtBadge()}</span>`
}

// ─── Ebene 1: Status-Block ───────────────────────────────────────────────────

/**
 * „Gerade dran“: bei Freigabe, Rückfrage oder offener Abnahme „Du“, bei einem sonst abgeschlossenen
 * Ablauf „–“, sonst Rolle · Worker des Jetzt-Schritts (schrittFolge), ohne Schritte „–“.
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
function dranHtml(sicht) {
  const art = workflowPhase(sicht.workflow)
  if (art === 'freigabe' || art === 'rueckfrage' || abnahmeOffen(sicht)) return tHtml('entwicklung.detail.status.du')
  if (art === null || art === 'abgeschlossen' || !Array.isArray(sicht.schritte)) return '–'
  const { jetzt } = schrittFolge(sicht.workflow, sicht.schritte)
  if (jetzt === null) return '–'
  const worker = workerName(jetzt.worker)
  return escapeHtml(worker ? `${rollenName(jetzt.rolle)} · ${worker}` : rollenName(jetzt.rolle))
}

/**
 * Phase des verknüpften Ablaufs: lädt, nicht bestimmbar, kein Ablauf, „Deine Abnahme“ bei offener
 * Abnahme, sonst phaseHtml.
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
function ablaufPhaseHtml(sicht) {
  if (sicht.verknuepfung === 'laedt') return tHtml('entwicklung.laedt')
  if (sicht.verknuepfung === 'fehlt') return tHtml('entwicklung.spalte.leer.unvollstaendig')
  if (sicht.workflow === null) return tHtml('entwicklung.detail.status.keinAblauf')
  return abnahmeOffen(sicht) ? tHtml('entwicklung.detail.wer.abnahme') : phaseHtml(sicht.workflow)
}

/**
 * Status-Block des Details. Feature: Status, Phase, Gerade dran, Workstreams/Rest/Ist („kommt“,
 * Fixpaket B2/B5), Meilenstein. Befund: Priorität, Eingeplant (Maßnahme, gekürzt), Ablauf,
 * Auslöser/Schätzung/Offen seit („kommt“, kein Registerfeld). Die Kopfzeile nennt „Abnahme offen“
 * bzw. bei einem Bug „Fix bereit zur Bestätigung“, wenn die Abnahme des Ablaufs offen ist.
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
export function detailStatusBlockHtml(sicht) {
  const { workitem } = sicht
  const offen = abnahmeOffen(sicht)
  const art = workflowPhase(sicht.workflow)
  const wartet = offen || art === 'freigabe' || art === 'rueckfrage'
  let kopfHtml = kartenStatus(workitem)
  if (offen) kopfHtml += ` · ${tHtml(istBug(workitem) ? 'eintrag.status.fixBereit' : 'eintrag.status.abnahmeOffen')}`
  else if (wartet) kopfHtml += ` · ${phaseHtml(sicht.workflow)}`
  const kategorie = statusKategorie(workitem)
  let ton = kategorie === 'ok' ? 'ok' : kategorie === 'aktiv' ? 'aktiv' : 'neutral'
  if (istBug(workitem) && workitem.status === 'OFFEN') ton = 'offen'
  if (wartet) ton = 'warten'
  if (workitem.quelle === 'feature') {
    return statusBlockHtml({
      kopfHtml,
      ton,
      zeilen: [
        { schluessel: t('entwicklung.detail.status.phase'), wertHtml: ablaufPhaseHtml(sicht) },
        { schluessel: t('entwicklung.detail.status.dran'), wertHtml: dranHtml(sicht) },
        { schluessel: t('eintrag.status.workstreams'), wertHtml: null },
        { schluessel: t('eintrag.status.rest'), wertHtml: null },
        { schluessel: t('eintrag.status.ist'), wertHtml: null },
        { schluessel: t('entwicklung.detail.planung.meilenstein'), wertHtml: meilensteinText(sicht) },
      ],
    })
  }
  return statusBlockHtml({
    kopfHtml,
    ton,
    zeilen: [
      { schluessel: t('entwicklung.detail.planung.prioritaet'), wertHtml: escapeHtml(workitem.prioritaet ?? '–') },
      { schluessel: t('eintrag.status.eingeplant'), wertHtml: escapeHtml(kuerzeText(workitem.massnahme, 90) ?? '–') },
      { schluessel: t('eintrag.status.ablauf'), wertHtml: ablaufPhaseHtml(sicht) },
      { schluessel: t('eintrag.status.ausloeser'), wertHtml: null },
      { schluessel: t('eintrag.status.schaetzung'), wertHtml: null },
      { schluessel: t('eintrag.status.offenSeit'), wertHtml: null },
    ],
  })
}

// ─── Ebene 2: Jetzt-Band ─────────────────────────────────────────────────────

/**
 * Das Jetzt-Band des Details. Stefan ist dran, wenn der Click-to-Work-Vorschlag auf Freigeben/Ablehnen
 * wartet (der Hauptknopf „Freigeben“ steht dann im Click-to-Work-Bereich darunter), die Abnahme offen
 * ist („Ergebnis prüfen →“), der Ablauf auf eine Freigabe oder Rückfrage wartet (→ #/workflows/<id>)
 * oder ein offener Bug ohne aktiven bzw. auf die Abnahme wartenden Ablauf auf die Entscheidung wartet,
 * was mit ihm passiert (der Hauptknopf „Jetzt beheben lassen“ ist der Einstieg von Click-to-Work darunter; Triage nur bei
 * freiem Einstieg — solange der Stand lädt, wird nichts behauptet). Braucht Click-to-Work Stefan
 * (Fehler, Konflikt mit „Wiederholen“), gehört der Bereich ebenfalls zum Band. Ist die Verknüpfung
 * noch nicht bestimmbar, steht nur „lädt“ bzw. „nicht bestimmbar“. Sonst die ruhige Zeile mit
 * „Ablauf ansehen“, wenn es einen Ablauf gibt.
 * @param sicht - siehe Dateikopf
 * @returns { zustand: 'dran' | 'dran-verbunden' | 'ruhig', html } — 'dran-verbunden' heißt: der
 *   Click-to-Work-Bereich darunter gehört zum Band (er trägt den Hauptknopf)
 */
export function detailJetzt(sicht) {
  const { workitem, workflow } = sicht
  const href = workflow !== null ? `#/workflows/${encodeURIComponent(workflow.workflowId)}` : null
  if (sicht.ctw === 'vorschlag') return { zustand: 'dran-verbunden', html: jetztBandHtml({ zustand: 'dran', titel: t('eintrag.jetzt.vorschlag.titel'), text: t('eintrag.jetzt.vorschlag.text'), knopf: null }) }
  if (sicht.ctw === 'stoerung') return { zustand: 'dran-verbunden', html: jetztBandHtml({ zustand: 'dran', titel: t('eintrag.jetzt.stoerung.titel'), text: t('eintrag.jetzt.stoerung.text'), knopf: null }) }
  if (sicht.verknuepfung !== 'ok') return { zustand: 'ruhig', html: jetztBandHtml({ zustand: 'ruhig', ohneSatz: true, text: t(sicht.verknuepfung === 'laedt' ? 'entwicklung.laedt' : 'entwicklung.spalte.leer.unvollstaendig') }) }
  if (workflow !== null && abnahmeOffen(sicht)) {
    const art = workitem.quelle === 'feature' ? 'feature' : istBug(workitem) ? 'bug' : 'sonst'
    return { zustand: 'dran', html: jetztBandHtml({ zustand: 'dran', titel: t(`eintrag.jetzt.abnahme.${art}.titel`), text: t(`eintrag.jetzt.abnahme.${art}.text`), knopf: { href, text: t('entwicklung.detail.ergebnisPruefen') } }) }
  }
  const phase = workflowPhase(workflow)
  if (phase === 'freigabe' || phase === 'rueckfrage') {
    return { zustand: 'dran', html: jetztBandHtml({ zustand: 'dran', titel: t(`eintrag.jetzt.${phase}.titel`), text: t(`eintrag.jetzt.${phase}.text`), knopf: { href, text: t(`eintrag.jetzt.${phase}.knopf`) } }) }
  }
  // F-997 (Entscheidung Challenger, abgleich-f46.md §4.8 „Umsetzung D3“): Triage, solange der Bug offen ist und
  // kein verknüpfter Ablauf aktiv ist oder auf die Abnahme wartet — nach einem beendeten, abgelehnten oder
  // gestoppten Fix-Ablauf also wieder. Der freie Einstieg (ctw 'frei', auftragsSperre) sagt dasselbe über alle
  // verknüpften Abläufe; die Prüfung des maßgeblichen hier hält die Regel im Render-Modul lesbar.
  const aktiv = workflow !== null && (istNichtTerminal(workflow) || abnahmeOffen(sicht))
  if (istBug(workitem) && workitem.status === 'OFFEN' && !aktiv && sicht.ctw === 'frei') {
    return { zustand: 'dran-verbunden', html: jetztBandHtml({ zustand: 'dran', titel: t('eintrag.jetzt.triage.titel'), text: t('eintrag.jetzt.triage.text'), knopf: null }) }
  }
  return { zustand: 'ruhig', html: jetztBandHtml({ zustand: 'ruhig', link: href !== null ? { href, text: t('eintrag.jetzt.ablaufAnsehen') } : undefined }) }
}

// ─── Ebene 3: Feature ────────────────────────────────────────────────────────

/**
 * Urteil eines AK aus der Abnahme des verknüpften Ablaufs (ak_urteile), sonst „noch kein Urteil“.
 * @param sicht - siehe Dateikopf
 * @param akId - Kennung des AK aus der Akte
 * @returns HTML (Chip und, wenn vorhanden, Beleg)
 */
function akUrteilHtml(sicht, akId) {
  const urteile = sicht.abnahme?.urteil?.status === 'ok' && Array.isArray(sicht.abnahme.urteil.ak_urteile) ? sicht.abnahme.urteil.ak_urteile : []
  const urteil = urteile.find((u) => u?.ak_id === akId)
  if (urteil === undefined) return { chip: `<span class="ak-urteil-chip" data-urteil="keins">${tHtml('eintrag.was.keinUrteil')}</span>`, beleg: '' }
  const text = AK_URTEILE.has(urteil.urteil) ? t(`abnahme.ak.${urteil.urteil}`) : String(urteil.urteil ?? '')
  const beleg = typeof urteil.beleg === 'string' && urteil.beleg !== '' ? `<span class="ak-beleg">${escapeHtml(urteil.beleg)}</span>` : ''
  return { chip: `<span class="ak-urteil-chip" data-urteil="${AK_URTEILE.has(urteil.urteil) ? urteil.urteil : 'sonst'}">${escapeHtml(text)}</span>`, beleg }
}

/**
 * Der vorgewählte Reiter von „Das Was“: Abnahmekriterien, wenn die Akte welche hat (Bild 07-Main),
 * sonst Auftrag.
 * @param sicht - siehe Dateikopf
 * @returns Reiter-ID
 */
export function wasReiterVon(sicht) {
  if (WAS_REITER.includes(sicht.wasReiter)) return sicht.wasReiter
  return sicht.akte?.status === 'ok' && sicht.akte.akzeptanzkriterien.length > 0 ? 'ak' : 'auftrag'
}

/**
 * „Das Was“ (Register, Muster role=tablist mit Pfeiltasten — verdrahtet in workboard.js):
 * Auftrag (Ziel der Akte und Link auf die ganze Akte), Abnahmekriterien mit Urteil, Nicht-Ziele,
 * „Fertig, wenn“ (kommt, Fixpaket B2).
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
function wasBlock(sicht) {
  const kopf = (reiterHtml) => `<div class="eintrag-karte-kopf"><h2 id="was-titel">${tHtml('eintrag.was.titel')}</h2>${reiterHtml}</div>`
  if (sicht.akte === undefined) return `<section class="eintrag-karte" aria-labelledby="was-titel">${kopf('')}<p class="subtle">${tHtml('entwicklung.detail.akte.laedt')}</p></section>`
  if (sicht.akte.status !== 'ok') return `<section class="eintrag-karte" aria-labelledby="was-titel">${kopf('')}${akteHinweis(sicht)}</section>`
  const { akte, workitem } = sicht
  const gewaehlt = wasReiterVon(sicht)
  const beschriftung = {
    auftrag: t('eintrag.was.auftrag'),
    ak: t('eintrag.was.ak', { zahl: formatiereZahl(akte.akzeptanzkriterien.length) }),
    nicht: t('eintrag.was.nicht', { zahl: formatiereZahl(akte.nicht_ziele.length) }),
    dod: t('eintrag.was.dod'),
  }
  const reiter = WAS_REITER.map(
    (id) => `<button type="button" role="tab" id="was-tab-${id}" class="was-reiter" data-was-reiter="${id}" aria-selected="${id === gewaehlt}" aria-controls="was-panel" tabindex="${id === gewaehlt ? 0 : -1}">${escapeHtml(beschriftung[id])}</button>`
  ).join('')
  let panel
  if (gewaehlt === 'auftrag') {
    panel = `<p class="was-auftrag">${escapeHtml(akte.ziel)}</p><p>${vsCodeLink(sicht.repoPfad, workitem.pfad ?? `features/${workitem.id}/feature.md`, null, t('eintrag.was.ganzeAkte'))}</p>`
  } else if (gewaehlt === 'ak') {
    panel =
      akte.akzeptanzkriterien.length === 0
        ? `<p class="subtle">${tHtml('eintrag.was.keineAk')}</p>`
        : `<ul class="was-ak-liste">${akte.akzeptanzkriterien
            .map((ak) => {
              const { chip, beleg } = akUrteilHtml(sicht, ak.id)
              return `<li class="was-ak-zeile"><code class="was-ak-id">${escapeHtml(ak.id)}</code><span class="was-ak-text">${escapeHtml(ak.text)}${beleg}</span>${chip}</li>`
            })
            .join('')}</ul>${urteileNichtLadbar(sicht)}`
  } else if (gewaehlt === 'nicht') {
    panel = akte.nicht_ziele.length === 0 ? `<p class="subtle">${tHtml('eintrag.was.keineNichtZiele')}</p>` : `<ul class="was-nicht-liste">${akte.nicht_ziele.map((z) => `<li>${escapeHtml(z)}</li>`).join('')}</ul>`
  } else {
    panel = kommtInhalt('eintrag.was.dodKommt')
  }
  return `<section class="eintrag-karte" aria-labelledby="was-titel">
      ${kopf(`<div class="was-reiterzeile" role="tablist" aria-labelledby="was-titel">${reiter}</div>`)}
      <div id="was-panel" class="was-panel" role="tabpanel" aria-labelledby="was-tab-${gewaehlt}">${panel}</div>
    </section>`
}

/**
 * Zustand für den Rollen-Kreis (rollen-kreis.js kreisStatus): Schritte des Ablaufs, Status, Prüfergebnis
 * und Abnahme-Entscheidung aus der einen Abnahme-Antwort; ohne Ablauf null (alle Rollen offen).
 * @param sicht - siehe Dateikopf
 * @returns Nachtrag für kreisStatus oder null
 */
function kreisNachtrag(sicht) {
  if (sicht.workflow === null || !Array.isArray(sicht.schritte)) return null
  const abnahme = sicht.abnahme !== null && typeof sicht.abnahme === 'object' ? sicht.abnahme : null
  return { schritte: sicht.schritte, workflowStatus: sicht.workflow.status, pruefergebnis: abnahme?.pruefergebnis ?? null, abnahmeEntscheidung: abnahme?.entscheidung ?? null }
}

/**
 * Die im Rollen-Kreis gewählte Rolle: Auswahl der Sicht, sonst die laufende Rolle (vorgewaehlteRolle).
 * @param sicht - siehe Dateikopf
 * @returns Rollen-ID
 */
export function kreisAuswahlVon(sicht) {
  const status = kreisStatus(kreisNachtrag(sicht))
  return typeof sicht.kreisAuswahl === 'string' && Object.hasOwn(status, sicht.kreisAuswahl) ? sicht.kreisAuswahl : vorgewaehlteRolle(status)
}

/**
 * Die Schritte des Ablaufs im Einzelnen (aufklappbar, Ebene 3): Mini-Pipeline, x/y, erwartetes
 * Ergebnis (Ziel des Ablaufs) — was das Detail vor D3 als „Stand der Entwicklung“ und „Wer macht
 * was“ zeigte, bleibt so erreichbar (Regel 7).
 * @param sicht - siehe Dateikopf
 * @returns HTML ('' ohne Ablauf)
 */
function schritteDetails(sicht) {
  if (sicht.workflow === null || sicht.verknuepfung !== 'ok') return ''
  let inhalt
  if (sicht.schritte === undefined) inhalt = `<p class="subtle">${tHtml('entwicklung.laedt')}</p>`
  else if (sicht.schritte === null) inhalt = `<p>${tHtml('uebersicht.wer.fehler')}</p>`
  else if (sicht.schritte.length === 0) inhalt = `<p class="subtle">${tHtml('entwicklung.detail.stand.keineSchritte')}</p>`
  else {
    const { erledigt, gesamt, prozent } = schrittFortschritt(sicht.schritte)
    const schritte = sicht.schritte
      .map((schritt, index) => {
        const klasse = schritt.status === 'ERFOLGREICH' ? 'done' : schritt.status === 'LAEUFT' || schritt.status === 'WARTET_FREIGABE' ? 'current' : ''
        const symbol = schritt.status === 'ERFOLGREICH' ? '✓' : formatiereZahl(index + 1)
        return `<li${klasse ? ` class="${klasse}"` : ''}><span aria-hidden="true">${escapeHtml(symbol)}</span><div>${escapeHtml(rollenName(schritt.rolle))}<small>${escapeHtml(workerName(schritt.worker) || '–')} · ${escapeHtml(schrittStatusText(schritt.status))}</small></div></li>`
      })
      .join('')
    inhalt = `<ol class="mini-pipeline">${schritte}</ol>
      <div class="work-progress">
        <div class="progress-caption"><span>${tHtml('entwicklung.detail.stand.schritte', { anzahl: gesamt, erledigt: formatiereZahl(erledigt), gesamt: formatiereZahl(gesamt) })}</span><strong>${tHtml('entwicklung.detail.stand.prozent', { zahl: formatiereZahl(prozent) })}</strong></div>
        <div class="progress-track" role="progressbar" aria-label="${tHtml('entwicklung.detail.stand.fortschritt')}" aria-valuemin="0" aria-valuemax="${gesamt}" aria-valuenow="${erledigt}"><span style="width: ${prozent}%"></span></div>
      </div>`
  }
  const ziel = typeof sicht.workflow.ziel === 'string' && sicht.workflow.ziel.trim() !== '' ? sicht.workflow.ziel : '–'
  return `<details class="eintrag-schritte" data-klappe="schritte"><summary>${tHtml('eintrag.schritte.titel')}</summary>${inhalt}<p class="eintrag-schritte-ziel"><span class="subtle">${tHtml('uebersicht.wer.output')}:</span> ${escapeHtml(ziel)}</p></details>`
}

/**
 * „Fortschritt“ (Feature): Rollen-Kreis mit „Rolle im Detail“, Workstream-Tabelle „kommt“
 * (Fixpaket B2/B5) mit Link zur Roadmap, darunter die Schritte im Einzelnen.
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
function fortschrittBlock(sicht) {
  const status = kreisStatus(kreisNachtrag(sicht))
  const auswahl = kreisAuswahlVon(sicht)
  let zeile
  if (sicht.verknuepfung !== 'ok' || (sicht.workflow !== null && sicht.schritte === undefined)) zeile = tHtml('entwicklung.laedt')
  else if (sicht.workflow === null) zeile = tHtml('uebersicht.wer.keinAblauf')
  else if (sicht.schritte === null) zeile = tHtml('uebersicht.wer.schritteFehler')
  else {
    const jetzt = Object.entries(status).find(([, s]) => s.status === 'jetzt')
    zeile = jetzt !== undefined ? tHtml('uebersicht.wer.rolleJetzt', { rolle: t(`kreis.rolle.${jetzt[0]}`) }) : ablaufPhaseHtml(sicht)
  }
  const mitte = `<span class="rk-mitte-titel">${escapeHtml(sicht.workitem.id)}</span><span class="rk-mitte-zeile">${zeile}</span>`
  const eintrag = status[auswahl]
  const worker = typeof eintrag.schritt?.worker === 'string' ? workerName(eintrag.schritt.worker) : t(`kreis.worker.${auswahl}`)
  const panel = `<div class="eintrag-rolle" id="${KREIS_PANEL_ID}" role="tabpanel" aria-labelledby="${DETAIL_KREIS_PRAEFIX}-tab-${auswahl}" data-status="${eintrag.status}">
      <p><strong>${tHtml(`kreis.rolle.${auswahl}`)}</strong> · ${escapeHtml(worker)} · ${tHtml(`kreis.aufgabe.${auswahl}`)}</p>
      <p class="subtle">${tHtml('eintrag.fortschritt.rolleStatus', { status: t(`kreis.status.${eintrag.status}`) })}${eintrag.schritt !== null && schrittStatusText(eintrag.schritt.status) !== t(`kreis.status.${eintrag.status}`) ? ` · ${escapeHtml(schrittStatusText(eintrag.schritt.status))}` : ''}</p>
    </div>`
  return `<section class="eintrag-karte" aria-labelledby="fortschritt-titel">
      <div class="eintrag-fortschritt">
        <div class="eintrag-fortschritt-kreis">
          <h2 id="fortschritt-titel">${tHtml('eintrag.fortschritt.titel')}</h2>
          <p class="eintrag-eyebrow">${tHtml('eintrag.fortschritt.wer')}</p>
          ${rollenKreisHtml({ status, auswahl, panelId: KREIS_PANEL_ID, mitteHtml: mitte, idPraefix: DETAIL_KREIS_PRAEFIX })}
          ${panel}
        </div>
        <div class="eintrag-fortschritt-ws">
          <p class="eintrag-eyebrow">${tHtml('eintrag.fortschritt.workstreams')}</p>
          ${kommtInhalt('eintrag.fortschritt.workstreamsKommt')}
          <a class="text-link" href="#/roadmap">${tHtml('eintrag.fortschritt.roadmap')} <span aria-hidden="true">→</span></a>
        </div>
      </div>
      ${schritteDetails(sicht)}
    </section>`
}

/**
 * Zahl offener Befunde im Register (alle Findings mit Status OFFEN aus der einen Workitem-Liste).
 * @param workitems - sicht.workitems
 * @returns Zahl oder null ohne Liste
 */
function offeneBefunde(workitems) {
  return Array.isArray(workitems) ? workitems.filter((w) => w?.quelle === 'finding' && w.status === 'OFFEN').length : null
}

/**
 * „Code & Doku Review“ (Feature): Änderungen → Code-Reiter #/code (F46 D4), Prüfungen „kommt“
 * (F-962), Doku echt (Akte mit VS-Code-Link, Register mit Zahl offener Befunde), Nachweise „kommt“.
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
function reviewBlock(sicht) {
  const akte = sicht.workitem.pfad ?? `features/${sicht.workitem.id}/feature.md`
  const offen = offeneBefunde(sicht.workitems)
  let register
  if (sicht.workitems === undefined) register = tHtml('entwicklung.laedt')
  else if (offen === null) register = tHtml('entwicklung.nichtVerfuegbar')
  else register = tHtml('eintrag.review.offen', { anzahl: offen, zahl: formatiereZahl(offen) })
  const doku = `<dl class="eintrag-felder"><dt>${tHtml('eintrag.review.akte')}</dt><dd><code>${escapeHtml(akte)}</code></dd><dt>${tHtml('eintrag.review.register')}</dt><dd><code>state/findings.md</code> · ${register}</dd></dl><p>${vsCodeLink(sicht.repoPfad, akte, null, t('eintrag.review.akteOeffnen'))}</p>`
  return `<section class="eintrag-karte" aria-labelledby="review-titel">
      <div class="eintrag-karte-kopf"><h2 id="review-titel">${tHtml('eintrag.review.titel')}</h2></div>
      <div class="eintrag-kacheln eintrag-kacheln-2">
        ${kachel(t('eintrag.review.aenderungen'), aenderungenInhalt())}
        ${kachel(t('eintrag.review.pruefungen'), kommtInhalt('eintrag.review.pruefungenKommt'))}
        ${kachel(t('eintrag.review.doku'), doku)}
        ${kachel(t('eintrag.review.nachweise'), kommtInhalt('eintrag.review.nachweiseKommt'))}
      </div>
    </section>`
}

/** Höchstzahl der Befund-Links in „Befunde aus diesem Feature“ (die neuesten). */
const BEFUNDE_LINKS = 6

/**
 * „Verlauf“ (Feature): Entscheidungen „kommt“ (die Leseroute der Akte liefert den Abschnitt nicht),
 * Befunde aus diesem Feature laut Feld „Entdeckt“ (Feature/Run), Verbrauch „kommt“.
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
function verlaufBlock(sicht) {
  const befunde = befundeAusFeature(sicht.workitems, sicht.workitem.id)
  let befundInhalt
  if (sicht.workitems === undefined) befundInhalt = `<p class="subtle">${tHtml('entwicklung.laedt')}</p>`
  else if (befunde === null) befundInhalt = `<p class="subtle">${tHtml('entwicklung.nichtVerfuegbar')}</p>`
  else if (befunde.gesamt === 0) befundInhalt = kommtInhalt('eintrag.verlauf.befundeKommt')
  else {
    const links = befunde.ids
      .slice(-BEFUNDE_LINKS)
      .reverse()
      .map((id) => `<a class="text-link" href="#/workboard/${encodeURIComponent(id)}">${escapeHtml(id)}</a>`)
      .join(' ')
    befundInhalt = `<p class="eintrag-zahl">${escapeHtml(formatiereZahl(befunde.offen))} <span class="subtle">${tHtml('eintrag.verlauf.offenVon', { gesamt: formatiereZahl(befunde.gesamt) })}</span></p>
      <p class="subtle">${tHtml('eintrag.verlauf.lautFeld')}</p>
      <p class="eintrag-befund-links">${links}</p>`
  }
  return `<section class="eintrag-verlauf" aria-labelledby="verlauf-titel">
      <h2 id="verlauf-titel">${tHtml('eintrag.verlauf.titel')}</h2>
      <div class="eintrag-kacheln eintrag-kacheln-3">
        ${kachel(t('eintrag.verlauf.entscheidungen'), kommtInhalt('eintrag.verlauf.entscheidungenKommt'), { klasse: 'eintrag-kachel-flaeche' })}
        ${kachel(t('eintrag.verlauf.befunde'), befundInhalt, { klasse: 'eintrag-kachel-flaeche' })}
        ${kachel(t('eintrag.verlauf.verbrauch'), kommtInhalt('eintrag.verlauf.verbrauchKommt'), { klasse: 'eintrag-kachel-flaeche' })}
      </div>
    </section>`
}

// ─── Ebene 3: Befund (Bug und die übrigen Typen) ─────────────────────────────

/**
 * Feld eines Befunds als HTML, fehlend „–“.
 * @param wert - Feldwert oder null
 * @returns HTML
 */
function feldHtml(wert) {
  return typeof wert === 'string' && wert.trim() !== '' ? escapeHtml(wert) : '<span class="subtle">–</span>'
}

/**
 * „Fehlerbild“ (Bug) bzw. „Worum es geht“ (übrige Typen). Bug: Nachstellen, Erwartet/Tatsächlich und
 * Ursache „kommt“ (strukturierte Felder, F-975, Fixpaket B5); Fundstelle und vorgeschlagene
 * Behebung (Maßnahme) aus dem Register. Übrige Typen: Beschreibung, Fundstelle, Behebung. Darunter
 * aufklappbar der ganze Registereintrag (alle Felder ungekürzt — kein heutiges Feld fällt weg).
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
function fehlerbildBlock(sicht) {
  const { workitem } = sicht
  const bug = istBug(workitem)
  const fundstelle = kachel(t('entwicklung.detail.finding.fundstelle'), `<p>${workitem.fundstelle ? fundstelleHtml(workitem.fundstelle) : feldHtml(null)}</p>`)
  const behebung = kachel(t('eintrag.befund.behebungVorschlag'), `<p>${feldHtml(workitem.massnahme)}</p>`)
  const oben = bug
    ? `<div class="eintrag-fehlerbild">
        <div><p class="eintrag-eyebrow">${tHtml('eintrag.befund.nachstellen')}</p>${kommtInhalt('eintrag.befund.feldKommt')}</div>
        <dl class="eintrag-felder"><dt>${tHtml('eintrag.befund.erwartet')}</dt><dd>${kommtBadge()}</dd><dt>${tHtml('eintrag.befund.tatsaechlich')}</dt><dd>${kommtBadge()}</dd></dl>
      </div>`
    : `<p class="eintrag-beschreibung">${feldHtml(workitem.beschreibung)}</p>`
  const kacheln = bug ? `${kachel(t('eintrag.befund.ursache'), kommtInhalt('eintrag.befund.feldKommt'))}${fundstelle}${behebung}` : `${fundstelle}${behebung}${kachel(t('entwicklung.detail.finding.auswirkung'), `<p>${feldHtml(workitem.auswirkung)}</p>`)}`
  const felder = ['fundstelle', 'auswirkung', 'massnahme', 'featureRun'].map((f) => `<dt>${tHtml(`entwicklung.detail.finding.${f}`)}</dt><dd>${f === 'fundstelle' && workitem.fundstelle ? fundstelleHtml(workitem.fundstelle) : feldHtml(workitem[f])}</dd>`).join('')
  const ganz = `<details class="eintrag-ganz" data-klappe="ganz"><summary>${tHtml('eintrag.befund.ganzerEintrag')}</summary><p class="eintrag-beschreibung">${workitem.beschreibung ? escapeHtml(workitem.beschreibung) : tHtml('entwicklung.detail.finding.keineBeschreibung')}</p><dl class="eintrag-felder">${felder}</dl></details>`
  return `<section class="eintrag-karte" aria-labelledby="fehlerbild-titel">
      <div class="eintrag-karte-kopf"><h2 id="fehlerbild-titel">${tHtml(bug ? 'eintrag.befund.fehlerbild' : 'eintrag.befund.worum')}</h2></div>
      ${oben}
      <div class="eintrag-kacheln eintrag-kacheln-3">${kacheln}</div>
      ${ganz}
    </section>`
}

/**
 * Stand einer Gruppe von Schritten derselben Rolle: läuft, erledigt (alle ERFOLGREICH/UEBERSPRUNGEN,
 * mindestens einer ERFOLGREICH), Fehler (FEHLGESCHLAGEN/VERWEIGERT), wartet (WARTET_FREIGABE), sonst offen.
 * @param schritte - Schritte des Ablaufs
 * @param rolle - Schritt-Rolle
 * @returns 'laeuft' | 'erledigt' | 'fehler' | 'wartet' | 'offen'
 */
function rollenStand(schritte, rolle) {
  const eigene = schritte.filter((s) => s?.rolle === rolle)
  if (eigene.some((s) => s.status === 'LAEUFT')) return 'laeuft'
  if (eigene.some((s) => s.status === 'FEHLGESCHLAGEN' || s.status === 'VERWEIGERT')) return 'fehler'
  if (eigene.some((s) => s.status === 'WARTET_FREIGABE')) return 'wartet'
  if (eigene.length > 0 && eigene.every((s) => s.status === 'ERFOLGREICH' || s.status === 'UEBERSPRUNGEN') && eigene.some((s) => s.status === 'ERFOLGREICH')) return 'erledigt'
  return 'offen'
}

/**
 * Die Schritte der Behebung mit Stand aus dem verknüpften Ablauf: Nachstellen (nur Bug; „kommt“ —
 * Regressionstest als eigener Schritt, Fixpaket B5), Beheben/Umsetzen (Ausführungsschritt), Prüfen
 * (Prüfergebnis GRÜN/ROT aus GET …/abnahme), Review (Review-Schritt), Bestätigen (Abnahme: offen →
 * wartet, gültig ANGENOMMEN → erledigt). Ohne Ablauf steht jeder Stand als „kommt“.
 * @param sicht - siehe Dateikopf
 * @returns [{ id, stand: 'laeuft' | 'erledigt' | 'fehler' | 'wartet' | 'offen' | 'kommt' }]
 */
export function behebungsSchritte(sicht) {
  const bug = istBug(sicht.workitem)
  const ids = bug ? ['nachstellen', 'beheben', 'pruefen', 'review', 'bestaetigen'] : ['umsetzen', 'pruefen', 'review', 'bestaetigen']
  if (sicht.workflow === null || sicht.verknuepfung !== 'ok') return ids.map((id) => ({ id, stand: 'kommt' }))
  const schritte = Array.isArray(sicht.schritte) ? sicht.schritte : []
  const pruefung = sicht.abnahme?.pruefergebnis
  const entscheidung = sicht.abnahme?.entscheidung
  const stand = {
    nachstellen: 'kommt',
    beheben: rollenStand(schritte, 'ausfuehrung'),
    umsetzen: rollenStand(schritte, 'ausfuehrung'),
    pruefen: pruefung?.status === 'ok' ? (pruefung.ergebnis === 'GRUEN' ? 'erledigt' : 'fehler') : 'offen',
    review: rollenStand(schritte, 'code-reviewer'),
    bestaetigen: abnahmeOffen(sicht) ? 'wartet' : entscheidung?.status === 'ok' && entscheidung.ergebnis === 'ANGENOMMEN' ? 'erledigt' : 'offen',
  }
  return ids.map((id) => ({ id, stand: stand[id] }))
}

/**
 * Hinweis, dass die Abnahme-Projektion (Urteile je AK, Prüfergebnis, Entscheidung) nicht ladbar war —
 * sonst läse sich „noch kein Urteil“ bzw. „offen“ wie ein echter Stand.
 * @param sicht - siehe Dateikopf
 * @returns HTML ('' ohne Ablauf oder bei geladener Projektion)
 */
function urteileNichtLadbar(sicht) {
  return sicht.workflow !== null && sicht.abnahme === null ? `<p class="note amber eintrag-hinweis">${tHtml('eintrag.was.urteileNichtLadbar')}</p>` : ''
}

/** Schritt-Rolle je Behebungsschritt mit eigenem Workflow-Schritt (für den Worker aus dem Ablauf). */
const ROLLE_JE_BEHEBUNG = Object.freeze({ beheben: 'ausfuehrung', umsetzen: 'ausfuehrung', review: 'code-reviewer' })

/**
 * Zeile unter dem Namen eines Behebungsschritts: die Aufgabe (fester Text) und — nur wenn der Ablauf
 * einen Schritt dieser Rolle hat — dessen Worker (keine angenommenen Worker-Namen).
 * @param sicht - siehe Dateikopf
 * @param id - Behebungsschritt
 * @returns HTML
 */
function behebungInfo(sicht, id) {
  const rolle = ROLLE_JE_BEHEBUNG[id]
  const schritt = rolle !== undefined && Array.isArray(sicht.schritte) ? sicht.schritte.find((s) => s?.rolle === rolle) : undefined
  const worker = schritt !== undefined ? workerName(schritt.worker) : ''
  return `${tHtml(`eintrag.behebung.${id}Info`)}${worker ? ` · ${escapeHtml(worker)}` : ''}`
}

/**
 * „Behebung“ (Bug) bzw. „Umsetzung“: die Schritte (behebungsSchritte), darunter Regressionstest
 * („kommt“), Änderungen (→ Code-Reiter #/code, F46 D4) und Auftrag (Ablauf des Eintrags oder der
 * Hinweis, dass Click-to-Work ihn anlegt); aufklappbar die Schritte des Ablaufs im Einzelnen.
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
function behebungBlock(sicht) {
  const bug = istBug(sicht.workitem)
  const liste = behebungsSchritte(sicht)
    .map(({ id, stand }) => {
      const chip = stand === 'kommt' ? kommtBadge() : `<span class="behebung-stand" data-stand="${stand}">${tHtml(`eintrag.behebung.stand.${stand}`)}</span>`
      return `<li class="behebung-schritt" data-stand="${stand}"><span class="behebung-name">${tHtml(`eintrag.behebung.${id}`)}</span><span class="behebung-info">${behebungInfo(sicht, id)}</span>${chip}</li>`
    })
    .join('')
  const auftrag =
    sicht.workflow !== null
      ? `<p><a class="text-link" href="#/workflows/${encodeURIComponent(sicht.workflow.workflowId)}">${escapeHtml(sicht.workflow.auftragId ?? sicht.workflow.workflowId)}</a></p><p class="subtle">${ablaufPhaseHtml(sicht)}</p>`
      : `<p>–</p><p class="subtle">${tHtml(bug ? 'eintrag.behebung.auftragLeerBug' : 'eintrag.behebung.auftragLeer')}</p>`
  return `<section class="eintrag-karte" aria-labelledby="behebung-titel">
      <div class="eintrag-karte-kopf"><h2 id="behebung-titel">${tHtml(bug ? 'eintrag.behebung.titel' : 'eintrag.behebung.titelSonst')}</h2><span class="subtle">${tHtml(bug ? 'eintrag.behebung.fertigWenn' : 'eintrag.behebung.fertigWennSonst')}</span></div>
      <ol class="behebung-schritte">${liste}</ol>
      ${urteileNichtLadbar(sicht)}
      <div class="eintrag-kacheln eintrag-kacheln-3">
        ${bug ? kachel(t('eintrag.behebung.regressionstest'), kommtInhalt('eintrag.befund.feldKommt')) : ''}
        ${kachel(t('eintrag.review.aenderungen'), aenderungenInhalt())}
        ${kachel(t('eintrag.behebung.auftrag'), auftrag)}
      </div>
      ${schritteDetails(sicht)}
    </section>`
}

/**
 * „Verlauf des Befunds“: „kommt“ — das Register trägt keine strukturierte Historie (Fixpaket B5).
 * @returns HTML
 */
function befundVerlaufBlock() {
  return `<section class="eintrag-karte" aria-labelledby="befund-verlauf-titel">
      <div class="eintrag-karte-kopf"><h2 id="befund-verlauf-titel">${tHtml('eintrag.befund.verlauf')}</h2></div>
      ${kommtInhalt('eintrag.befund.verlaufKommt')}
    </section>`
}

// ─── Hauptspalte und rechte Spalte ───────────────────────────────────────────

/**
 * Inhalt des Details unterhalb von Kopf, Jetzt-Band und Click-to-Work (Ebene 3).
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
export function detailInhaltHtml(sicht) {
  if (sicht.workitem.quelle === 'feature') return `${wasBlock(sicht)}${fortschrittBlock(sicht)}${reviewBlock(sicht)}${verlaufBlock(sicht)}`
  return `${fehlerbildBlock(sicht)}${behebungBlock(sicht)}${befundVerlaufBlock()}`
}

/**
 * Rechte Spalte: Feature „Deine Planung“ (Priorität keine, Meilenstein echt; Schätzung und Speichern
 * „kommt“, Fixpaket B5), Befund „Einordnung“ (Priorität echt; Zuordnung, Schätzung, Speichern
 * „kommt“). Darunter die Links: Akte bzw. Fundstelle (nur bei eindeutigem Pfad) und Registereintrag
 * in VS Code, Pull Requests (F46 D4: <remoteWebUrl>/pulls in neuem Tab, ohne GitHub-Remote gesperrt), Roadmap,
 * „Frag Jarvis dazu“ (befüllt nur die Eingabe).
 * @param sicht - siehe Dateikopf
 * @returns HTML
 */
export function detailSpalteHtml(sicht) {
  const { workitem } = sicht
  const feature = workitem.quelle === 'feature'
  const felder = feature
    ? `<dt>${tHtml('entwicklung.detail.planung.prioritaet')}</dt><dd>${tHtml('entwicklung.detail.planung.ohnePrioritaet')}</dd><dt>${tHtml('entwicklung.detail.planung.meilenstein')}</dt><dd>${meilensteinText(sicht)}</dd><dt>${tHtml('eintrag.spalte.schaetzungRest')}</dt><dd>${kommtBadge()}</dd>`
    : `<dt>${tHtml('entwicklung.detail.planung.prioritaet')}</dt><dd>${escapeHtml(workitem.prioritaet ?? '–')}</dd><dt>${tHtml('eintrag.spalte.zugeordnet')}</dt><dd>${kommtBadge()}</dd><dt>${tHtml('eintrag.spalte.schaetzung')}</dt><dd>${kommtBadge()}</dd>`
  const links = []
  if (feature) {
    links.push(vsCodeLink(sicht.repoPfad, workitem.pfad ?? `features/${workitem.id}/feature.md`, null, t('eintrag.spalte.akteVsCode')))
    links.push(
      typeof sicht.remoteWebUrl === 'string'
        ? `<a class="text-link" href="${escapeHtml(`${sicht.remoteWebUrl}/pulls`)}" target="_blank" rel="noopener noreferrer">${tHtml('eintrag.spalte.pullRequests')} <span aria-hidden="true">↗</span></a>`
        : `<a class="text-link" role="link" tabindex="0" aria-disabled="true" title="${tHtml('kopf.githubOhne')}">${tHtml('eintrag.spalte.pullRequests')}</a>`
    )
    links.push(`<a class="text-link" href="#/roadmap">${tHtml('entwicklung.detail.planung.roadmap')} <span aria-hidden="true">→</span></a>`)
  } else {
    const fund = findeFundstellenPfad(workitem.fundstelle)
    if (fund !== null) links.push(vsCodeLink(sicht.repoPfad, fund.pfad, fund.zeile, t('eintrag.spalte.fundstelleVsCode')))
    links.push(vsCodeLink(sicht.repoPfad, 'state/findings.md', Number.isInteger(workitem.zeile) ? workitem.zeile : null, t('eintrag.spalte.registerVsCode')))
  }
  links.push(`<button type="button" class="text-link eintrag-jarvis" data-detail-jarvis>${tHtml('eintrag.spalte.jarvis')}</button>`)
  return `<aside class="eintrag-spalte" aria-labelledby="eintrag-spalte-titel">
      <h2 id="eintrag-spalte-titel">${tHtml(feature ? 'eintrag.spalte.planung' : 'eintrag.spalte.einordnung')}</h2>
      <dl class="eintrag-felder">${felder}</dl>
      ${kommtKnopf(t(feature ? 'entwicklung.detail.planung.speichern' : 'eintrag.spalte.speichern'))}
      <p class="subtle eintrag-spalte-hinweis">${tHtml('eintrag.spalte.hinweis')}</p>
      <div class="eintrag-links">${links.join('')}</div>
    </aside>`
}

/**
 * Text für „Frag Jarvis dazu“: feste Vorlage mit Typ, ID und Titel — befüllt nur die Chat-Eingabe.
 * @param workitem - ein Workitem
 * @returns Text
 */
export function jarvisEntwurf(workitem) {
  return t('eintrag.spalte.jarvisEntwurf', { typ: typBezeichnung(workitem.typ), id: workitem.id, titel: titelVon(workitem) })
}
