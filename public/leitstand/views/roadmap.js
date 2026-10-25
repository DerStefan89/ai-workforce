/**
 * Datei: public/leitstand/views/roadmap.js
 *
 * Zweck: Seite `#/roadmap` — seit F46 D1 nach Design 03-roadmap--Main (docs/design/abgleich-f46.md
 * §4.2; vorher F44 WS-2a, Vorlage V10). Von oben nach unten:
 * - Kopf: Rücklink, Eyebrow, „<Projekt> · Roadmap“, aktueller Meilenstein; „Jarvis zur Roadmap
 *   fragen“ (öffnet den Chat mit vorbefüllter Eingabe, sendet nie selbst) und „+ Eintrag erfassen“
 *   als „kommt“; Register Überblick · Roadmap · Projektakte (produktplanung-kopf.js).
 * - Kennzahlen: Meilensteine x / y abgeschlossen, Features x / y abgenommen, „Bis <M> fertig“ und
 *   „Plan gegen Ist“ aus kennzahlen der Projektion (F45 B5b-2a; fehlt das Feld: „nicht verfügbar“).
 * - Gesamte Roadmap (F45 B5b-2a, features/F45/plan-b5b2a-v2.md): Gantt lesend — Zeilen Meilenstein →
 *   Feature → Workstream/Fixpaket/Design, erledigte Kinder in einer Gruppenzeile, linke Spalte steht
 *   beim Scrollen, Zeitachse in AT ab heute mit Ist-Band links und Heute-Linie, Zoom Tage/Wochen,
 *   Farbe = Ebene, Form = Status, punktierte Marke ohne Schätzung. Der aktuelle Meilenstein steht
 *   oben und ist aufgeklappt, abgeschlossene sind ausgeblendet („Einblenden“), „Alles aufklappen“.
 *   Daneben das Detailpanel lesend (Typ, Status, Teil von, Inhalt, Schätzung, Ist, danach, Hinweise)
 *   mit „Frag Jarvis dazu“; „Anpassen“, Balken ziehen und „+ Eintrag erfassen“ bleiben „kommt“ (B5b-2b).
 *   Alle Rechnungen in roadmap-anzeige.js; hier wird nur gerendert.
 * - Entwicklungsstand mit Filter Alle · Features · Bugs · Harness · Tech Debt (zieht aus der
 *   Produktübersicht hierher): offene P0–P2-Befunde und offene Features des aktuellen Meilensteins.
 * - Noch nicht eingeplant (F44 D3, bleibt).
 *
 * Zustände: Lädt · nicht_vorhanden → Leerzustand · ungueltig → Fehler mit Regelverstößen · Abruffehler
 * → Fehler mit „Erneut laden“ (F-854: nie „keine Roadmap“). Workitems und Akten scheitern je für sich.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initRoadmapView beim Bootstrap, vor starteRouter())
 * - public/leitstand/projekt-wechsel.test.mjs (Neuladen beim Projektwechsel)
 *
 * Wichtig:
 * - Laden nur beim Betreten und bei einem Projektwechsel, nie aus dem Poll; Überholschutz über den
 *   Anfragezähler. Die Akte eines gewählten Features lädt einmal je ID (holeFeatureAkte).
 * - „Frag Jarvis dazu“ nutzt chat-dock.js oeffneChatMitEntwurf (F44 WS-8b): Dock öffnen, Eingabe
 *   befüllen — nie senden. Keine Schreibaktion auf dieser Seite.
 * - Projektinhalte (Name, Titel, IDs, Statuswerte, Ziel, Regelverstöße) werden nicht übersetzt und
 *   immer escaped; alle übrigen Texte über t().
 * - Die Seite wird bei jeder Zustandsänderung ganz neu geschrieben (kein Poll); Fokus und der Text im
 *   Fragefeld werden dabei über data-Attribute bzw. den Wert erhalten.
 */

import { holeFeatureAkte, holeRoadmap, holeWorkitems } from '../api.js'
import { oeffneChatMitEntwurf } from '../chat-dock.js'
import { formatiereZahl, t, tHtml } from '../i18n.js'
import { kommtKnopf } from '../kommt.js'
import { planungsRegister, zurueckZurUebersicht } from '../produktplanung-kopf.js'
import { abonniereProjektWechsel, holeAktivesProjekt } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import {
  aktuellerMeilenstein,
  aufklappbareSchluessel,
  baueAchse,
  bisFertig,
  featuresAbgenommen,
  ganttZeilen,
  gewaehlteZeile,
  IST_BREITE,
  nichtEingeplant,
  planGegenIst,
  roadmapZustand,
  STATUS_SYMBOL,
  statusKategorie,
  waehleEntwicklungsstand,
  zeilenSchluessel,
  zeitachseVon,
} from '../roadmap-anzeige.js'
import { registriere } from '../router.js'
import { chipTypVonWorkitem, typChip } from '../typ-chip.js'

/** Letzte Roadmap-Antwort: null = lädt, { status: 'fehler', grund } nach einem Wurf, sonst die Projektion. */
let roadmap = null

/** Alle Workitems: undefined = lädt, null = nicht verfügbar, sonst Liste. */
let workitems

/** Akten je Feature-ID für das Detailpanel: { status: 'laedt' | 'ok' | 'fehler', daten? }. */
const akten = new Map()

/** Überholschutz für ladeRoadmap (Muster roadmapAnfrageZaehler in views/workboard.js). */
let roadmapAnfrageZaehler = 0

/** Schlüssel der gewählten Gantt-Zeile (zeilenSchluessel) oder null = vorgewählt. */
let auswahl = null

/** Aufgeklappte Zeilen (Schlüssel); null = Standard (aktueller Meilenstein und seine Features in Arbeit). */
let aufgeklappt = null

/** true, wenn die abgeschlossenen Meilensteine eingeblendet sind. */
let abgeschlosseneSichtbar = false

/** Zoom der Zeitachse: 'tage' | 'wochen' — nur im Speicher. */
let massstab = 'tage'

/** Filter des Entwicklungsstands. */
let standFilter = 'alle'

/** Workitem-Typen je Filter des Entwicklungsstands (null = alle). */
const STAND_FILTER = Object.freeze({ alle: null, features: ['FEATURE'], bugs: ['BUG'], harness: ['HARNESS_IMPROVEMENT'], techdebt: ['TECH_DEBT', 'PROCESS_IMPROVEMENT'] })

/** Höchstzahl der Zeilen im Entwicklungsstand. */
const STAND_MAX = 12

/** Höchstzahl der IDs je Kennzahl-Unterzeile. */
const IDS_MAX = 4

// ─── Kleine Bausteine ────────────────────────────────────────────────────────

/**
 * Statussymbol mit Kategorie-Klasse — dekorativ, der Status steht daneben als Text.
 * @param kategorie - Statuskategorie
 * @returns HTML
 */
function symbol(kategorie) {
  return `<span class="roadmap-symbol roadmap-kat-${kategorie}" aria-hidden="true">${STATUS_SYMBOL[kategorie]}</span>`
}

/**
 * Übersetzter Text einer Statuskategorie; der rohe Status steht im title.
 * @param status - roher Statuswert (Projektinhalt)
 * @returns HTML
 */
function statusText(status) {
  const kategorie = statusKategorie(status)
  return `<span class="roadmap-status roadmap-kat-${kategorie}" title="${escapeHtml(status ?? '')}">${symbol(kategorie)} ${tHtml(`roadmap.status.${kategorie}`)}</span>`
}

/**
 * Titel eines Eintrags, sonst die ID.
 * @param eintrag - { id, titel? }
 * @returns Rohtext
 */
function titelVon(eintrag) {
  return typeof eintrag?.titel === 'string' && eintrag.titel.trim() !== '' ? eintrag.titel : String(eintrag?.id ?? '')
}

/**
 * IDs als kurze Liste („F1, F2, F3 …“).
 * @param ids - Liste
 * @returns Rohtext oder '–'
 */
function idListe(ids) {
  if (ids.length === 0) return '–'
  return ids.length > IDS_MAX ? `${ids.slice(0, IDS_MAX).join(', ')} …` : ids.join(', ')
}

// ─── Abgeleitete Lage ─────────────────────────────────────────────────────────

/**
 * Gantt-Lage für den aktuellen Anzeigezustand (Achse je Zoom, alle Zeilen samt eingeklappter).
 * @returns { achse, oben, unten, trenner, standardOffen, alle: Zeile[], jeSchluessel: Map }
 */
function ganttLage() {
  const achse = baueAchse(zeitachseVon(roadmap), massstab)
  const lage = ganttZeilen(roadmap, { aufgeklappt, abgeschlosseneSichtbar, achse })
  const alle = [...lage.oben, ...lage.unten]
  return { achse, ...lage, alle, jeSchluessel: new Map(alle.map((z) => [z.schluessel, z])) }
}

/**
 * Zahl in Sprache des Leitstands, höchstens zwei Nachkommastellen.
 * @param zahl - Wert
 * @returns Text
 */
function zahl(zahl) {
  return formatiereZahl(zahl, { maximumFractionDigits: 2 })
}

/**
 * Spanne „a–b“ bzw. „a“, wenn beide gleich sind.
 * @param min - untere Grenze
 * @param max - obere Grenze
 * @returns Text
 */
function spanne(min, max) {
  return min === max ? zahl(min) : `${zahl(min)}–${zahl(max)}`
}

// ─── Kopf und Kennzahlen ─────────────────────────────────────────────────────

/**
 * Kopf der Seite.
 * @returns HTML
 */
function seitenkopf() {
  const aktueller = roadmapZustand(roadmap) === 'ok' ? aktuellerMeilenstein(roadmap) : null
  const zeile = aktueller !== null ? tHtml('roadmap.aktuell', { id: aktueller.id, titel: aktueller.titel }) : tHtml('roadmap.beschreibung')
  return `${zurueckZurUebersicht()}
    <div class="page-heading">
      <div>
        <div class="eyebrow">${tHtml('roadmap.eyebrow')}</div>
        <h1 tabindex="-1">${tHtml('roadmap.titel', { projekt: holeAktivesProjekt().name })}</h1>
        <p class="description">${zeile}</p>
      </div>
      <div class="action-row">
        <button type="button" class="button" data-roadmap-jarvis-kopf>${tHtml('roadmap.jarvis.kopf')}</button>
        ${kommtKnopf(t('roadmap.eintragErfassen'), { primaer: true, symbol: '+' })}
      </div>
    </div>
    ${planungsRegister('roadmap')}`
}

/**
 * Eine Kennzahl-Karte.
 * @param optionen - { eyebrow, wertHtml, unterHtml, klasse }
 * @returns HTML
 */
function kennzahl({ eyebrow, wertHtml, unterHtml, klasse = '' }) {
  return `<div class="roadmap-kennzahl${klasse ? ` ${klasse}` : ''}"><span class="eyebrow">${escapeHtml(eyebrow)}</span><strong>${wertHtml}</strong><small>${unterHtml}</small></div>`
}

/**
 * Die vier Kennzahlen.
 * @returns HTML
 */
function kennzahlen() {
  const alle = roadmap.meilensteine
  const abgeschlossen = alle.filter((m) => m.status === 'ABGESCHLOSSEN').length
  const aktueller = aktuellerMeilenstein(roadmap)
  const { abgenommen, gesamt } = featuresAbgenommen(roadmap)
  const features = aktueller?.features ?? []
  const idsMit = (kategorie) => features.filter((f) => statusKategorie(f?.status) === kategorie).map((f) => f.id)
  const bis = bisFertig(roadmap, aktueller?.id ?? null)
  let bisWert = tHtml('roadmap.kennzahl.nichtVerfuegbar')
  let bisUnter = tHtml('roadmap.kennzahl.nichtVerfuegbar.unter')
  if (aktueller === null) {
    // Kein offener Meilenstein: die Daten fehlen nicht, es gibt nur nichts mehr zu rechnen (Prüfpass qa 2/cr 4).
    bisWert = tHtml('roadmap.kennzahl.bis.keinOffener')
    bisUnter = tHtml('roadmap.kennzahl.bis.keinOffenerUnter')
  } else if (bis?.berechenbar === true) {
    bisWert = tHtml('roadmap.kennzahl.bis.spanne', { spanne: spanne(bis.min, bis.max) })
    bisUnter = tHtml('roadmap.kennzahl.bis.berechnet')
  } else if (bis !== null) {
    bisWert = tHtml('roadmap.kennzahl.bis.wert')
    bisUnter = tHtml('roadmap.kennzahl.bis.unter', { anzahl: bis.ohne_schaetzung, zahl: formatiereZahl(bis.ohne_schaetzung) })
  }
  const pgi = planGegenIst(roadmap)
  let pgiWert = tHtml('roadmap.kennzahl.nichtVerfuegbar')
  let pgiUnter = tHtml('roadmap.kennzahl.nichtVerfuegbar.unter')
  if (pgi?.zustand === 'leer') {
    pgiWert = tHtml('roadmap.kennzahl.planIst.leer')
    pgiUnter = tHtml('roadmap.kennzahl.planIst.leerUnter')
  } else if (pgi !== null) {
    if (pgi.zustand === 'im_plan') pgiWert = tHtml('roadmap.kennzahl.planIst.imPlan')
    else if (pgi.prozent === null) pgiWert = tHtml('roadmap.kennzahl.planIst.ueberOhne')
    else pgiWert = tHtml(pgi.zustand === 'ueber' ? 'roadmap.kennzahl.planIst.ueber' : 'roadmap.kennzahl.planIst.unterPlan', { prozent: formatiereZahl(Math.abs(pgi.prozent)) })
    pgiUnter = tHtml('roadmap.kennzahl.planIst.unter', { ist: zahl(pgi.ist), plan: spanne(pgi.plan_min, pgi.plan_max), anzahl: pgi.anzahl, zahl: formatiereZahl(pgi.anzahl) })
  }
  return `<div class="roadmap-kennzahlen">
      ${kennzahl({
        eyebrow: t('roadmap.kennzahl.meilensteine'),
        wertHtml: tHtml('roadmap.kennzahl.meilensteine.wert', { abgeschlossen: formatiereZahl(abgeschlossen), gesamt: formatiereZahl(alle.length) }),
        unterHtml: aktueller !== null ? tHtml('roadmap.kennzahl.meilensteine.unter', { id: aktueller.id }) : '–',
      })}
      ${kennzahl({
        eyebrow: t('roadmap.kennzahl.features'),
        wertHtml: tHtml('roadmap.kennzahl.features.wert', { abgenommen: formatiereZahl(abgenommen), gesamt: formatiereZahl(gesamt) }),
        unterHtml: tHtml('roadmap.kennzahl.features.unter', { inArbeit: idListe(idsMit('in_arbeit')), geplant: idListe(idsMit('geplant')) }),
      })}
      ${kennzahl({
        eyebrow: aktueller !== null ? t('roadmap.kennzahl.bis', { id: aktueller.id }) : t('roadmap.kennzahl.bisOhne'),
        wertHtml: bisWert,
        unterHtml: bisUnter,
        klasse: 'betont',
      })}
      ${kennzahl({ eyebrow: t('roadmap.kennzahl.planIst'), wertHtml: pgiWert, unterHtml: pgiUnter })}
    </div>`
}

// ─── Gantt und Detailpanel ────────────────────────────────────────────────────

/**
 * Name einer Zeile (Gruppenzeilen tragen keinen eigenen Titel).
 * @param zeile - aus ganttZeilen
 * @returns Rohtext
 */
function zeilenName(zeile) {
  if (zeile.art !== 'gruppe') return zeile.art === 'meilenstein' || zeile.art === 'feature' ? `${zeile.id} · ${zeile.titel}` : zeile.titel
  return zeile.farbe === 'feature' ? t('roadmap.gruppe.features', { id: zeile.id }) : t('roadmap.gruppe.zeilen')
}

/**
 * Kurzinfo unter dem Namen (Zähler, Schätzung, Ist, Hinweise) — Projektinhalte escaped.
 * @param zeile - aus ganttZeilen
 * @returns Rohtext
 */
function kurzinfo(zeile) {
  const teile = []
  if (zeile.art === 'meilenstein') teile.push(t('roadmap.meilenstein.abgenommen', { abgenommen: formatiereZahl(zeile.zaehler.abgenommen), gesamt: formatiereZahl(zeile.zaehler.gesamt) }))
  else if (zeile.art === 'gruppe') teile.push(t(zeile.farbe === 'feature' ? 'roadmap.gruppe.featuresInfo' : 'roadmap.gruppe.zeilenInfo', { anzahl: zeile.anzahl, zahl: formatiereZahl(zeile.anzahl) }))
  else if (zeile.art === 'feature') {
    teile.push(t('typ.feature'))
    const dauer = zeile.spur.label?.dauer ?? null
    if (dauer !== null) teile.push(t('roadmap.info.rest', { spanne: spanne(dauer.min, dauer.max) }))
    else if (zeile.spur.marke !== null) teile.push(t('roadmap.info.ohneSchaetzung'))
  } else {
    teile.push(`${zeile.id} · ${t(`typ.${zeile.art}`)}`)
    if (zeile.schaetzung !== null) teile.push(t('roadmap.info.schaetzung', { spanne: spanne(zeile.schaetzung.min, zeile.schaetzung.max) }))
    else if (zeile.status === 'geplant' || zeile.status === 'laeuft') teile.push(t('roadmap.info.ohneSchaetzung'))
  }
  if (zeile.istAt !== null) teile.push(t('roadmap.info.ist', { wert: zahl(zeile.istAt) }))
  if (zeile.hinweise.includes('fehlerhaft')) teile.push(t('roadmap.info.fehlerhaft'))
  if (zeile.hinweise.includes('befunde')) teile.push(t('roadmap.info.befunde'))
  if (zeile.hinweise.includes('ohne_lage')) teile.push(t('roadmap.info.ohneLage'))
  if (zeile.hinweise.includes('abweichung')) teile.push(t('roadmap.info.abweichung'))
  return teile.join(' · ')
}

/**
 * Beschriftung hinter dem Balken bzw. der Marke (Plan v2 Nr. 3: „frühestens“ und „ohne Schätzung“ sichtbar).
 * @param label - spur.label
 * @returns Rohtext
 */
function spurText(label) {
  if (label.dauer === null) return t('roadmap.spur.fehlt', { at: zahl(label.fruehestensAb) })
  const teile = [t('roadmap.spur.dauer', { spanne: spanne(label.dauer.min, label.dauer.max) })]
  if (label.fruehestensAb !== null) teile.unshift(t('roadmap.spur.fruehestens', { at: zahl(label.fruehestensAb) }))
  if (label.ohneSchaetzung > 0) teile.push(t('roadmap.spur.ohne', { anzahl: label.ohneSchaetzung, zahl: formatiereZahl(label.ohneSchaetzung) }))
  return teile.join(' · ')
}

/**
 * Zeitspur einer Zeile: Ist-Band, Planbalken, Spanne bis Max., Marke und Beschriftung. Positionen als px aus baueSpur,
 * Farben nur über Klassen (--ebene-* der Zeile).
 * @param spur - aus baueSpur
 * @returns HTML
 */
function spurHtml(spur) {
  const lage = (links, breite) => `left: ${links}px;${breite === undefined ? '' : ` width: ${breite}px;`}`
  const teile = []
  if (spur.istBand) teile.push('<span class="rm-ist-band" aria-hidden="true"></span>')
  if (spur.plan !== null) teile.push(`<span class="rm-balken rm-${spur.plan.form}" style="${lage(spur.plan.links, spur.plan.breite)}" aria-hidden="true"></span>`)
  if (spur.max !== null) teile.push(`<span class="rm-max" style="${lage(spur.max.links, spur.max.breite)}" aria-hidden="true"></span>`)
  if (spur.marke !== null) teile.push(`<span class="rm-marke" style="${lage(spur.marke.links)}" aria-hidden="true"></span>`)
  if (spur.label !== null) {
    const klassen = ['rm-spur-text', spur.label.dauer === null ? 'rm-spur-fehlt' : '', spur.label.seite === 'links' ? 'rm-spur-links' : ''].filter(Boolean).join(' ')
    teile.push(`<span class="${klassen}" style="${lage(spur.label.links)}">${escapeHtml(spurText(spur.label))}</span>`)
  }
  else if (spur.ohneLage) teile.push(`<span class="rm-spur-text" style="${lage(IST_BREITE + 8)}">${tHtml('roadmap.spur.ohneLage')}</span>`)
  return `<div class="rm-spur">${teile.join('')}</div>`
}

/**
 * Eine Zeile des Gantt: sticky linke Zelle (Pfeil, Farbquadrat, Name, Kurzinfo, Status) und Zeitspur.
 * @param zeile - aus ganttZeilen
 * @param gewaehlt - gewählte Zeile
 * @returns HTML
 */
function ganttZeile(zeile, gewaehlt) {
  const istGewaehlt = gewaehlt?.schluessel === zeile.schluessel
  const name = zeilenName(zeile)
  const schluessel = escapeHtml(zeile.schluessel)
  const klappe = zeile.hatKinder
    ? `<button type="button" class="rm-klappe" data-roadmap-klappe="${schluessel}" aria-expanded="${zeile.offen}" aria-label="${tHtml(zeile.offen ? 'roadmap.baum.zuklappen' : 'roadmap.baum.aufklappen', { titel: name })}"><span aria-hidden="true">›</span></button>`
    : '<span class="rm-klappe-platz" aria-hidden="true"></span>'
  const inhalt = `<span class="rm-name"><span class="rm-quadrat" aria-hidden="true"></span><span class="rm-name-text" title="${escapeHtml(name)}">${escapeHtml(name)}</span></span><small>${escapeHtml(kurzinfo(zeile))}</small>`
  const waehlen = zeile.art === 'gruppe' ? `<span class="rm-waehlen rm-gruppe-name">${inhalt}</span>` : `<button type="button" class="rm-waehlen" data-roadmap-waehlen="${schluessel}" aria-pressed="${istGewaehlt}">${inhalt}</button>`
  const klassen = ['rm-zeile', `rm-ebene-${zeile.ebene}`, istGewaehlt ? 'gewaehlt' : '', zeile.aktuell ? 'aktuell' : ''].filter(Boolean).join(' ')
  return `<li class="${klassen}" data-farbe="${escapeHtml(zeile.farbe)}">
      <div class="rm-links" style="--rm-einzug: ${zeile.ebene}">${klappe}${waehlen}<span class="rm-status">${statusText(zeile.status)}</span></div>
      ${spurHtml(zeile.spur)}
    </li>`
}

/**
 * Inhalt des Detailpanels für ein Feature: Ziel aus der Akte (lädt einmal je ID).
 * @param feature - { id, status }
 * @returns HTML
 */
function featureInhalt(feature) {
  if (statusKategorie(feature.status) === 'ohne_akte') return `<span class="subtle">${tHtml('roadmap.detail.ohneAkte')}</span>`
  const akte = akten.get(feature.id)
  if (akte === undefined || akte.status === 'laedt') return `<span class="subtle">${tHtml('roadmap.laedt')}</span>`
  if (akte.status === 'fehler') return `<span class="unbekannt">${tHtml('uebersicht.nichtVerfuegbar')}</span>`
  const ziel = typeof akte.daten?.ziel === 'string' && akte.daten.ziel.trim() !== '' ? akte.daten.ziel : null
  return ziel === null ? `<span class="subtle">${tHtml('roadmap.detail.keinZiel')}</span>` : `<span class="rm-detail-ziel" title="${escapeHtml(ziel)}">${escapeHtml(ziel)}</span>`
}

/**
 * „Teil von“ einer Zeile: Feature und Meilenstein darüber.
 * @param zeile - gewählte Zeile
 * @param lage - aus ganttLage
 * @returns HTML
 */
function teilVon(zeile, lage) {
  const meilenstein = lage.jeSchluessel.get(zeilenSchluessel('m', zeile.bezug.meilenstein)) ?? null
  if (zeile.art === 'meilenstein' || meilenstein === null) return tHtml('roadmap.detail.roadmap')
  const mText = `${meilenstein.id} · ${meilenstein.titel}`
  if (zeile.art === 'feature') return escapeHtml(mText)
  const feature = lage.jeSchluessel.get(zeilenSchluessel('f', zeile.bezug.meilenstein, zeile.bezug.feature)) ?? null
  return escapeHtml(feature === null ? mText : `${feature.id} · ${feature.titel} · ${meilenstein.id}`)
}

/**
 * Schätzung einer Zeile im Detail: Workstream min–max, sonst der Rest aus der Spur, sonst „fehlt“.
 * @param zeile - gewählte Zeile
 * @returns HTML
 */
function detailSchaetzung(zeile) {
  if (zeile.art !== 'meilenstein' && zeile.art !== 'feature') return zeile.schaetzung === null ? tHtml('roadmap.detail.schaetzungFehlt') : tHtml('roadmap.info.schaetzung', { spanne: spanne(zeile.schaetzung.min, zeile.schaetzung.max) })
  const label = zeile.spur.label
  if (label === null) return '–'
  return escapeHtml(label.dauer === null ? spurText(label) : [t('roadmap.info.rest', { spanne: spanne(label.dauer.min, label.dauer.max) }), ...(label.ohneSchaetzung > 0 ? [t('roadmap.spur.ohne', { anzahl: label.ohneSchaetzung, zahl: formatiereZahl(label.ohneSchaetzung) })] : [])].join(' · '))
}

/**
 * Hinweise einer Zeile (nichts verstecken): Formfehler der Tabelle, Befunde der Planung, „nach unbekannt“, ohne Planlage.
 * @param zeile - gewählte Zeile
 * @returns Liste von HTML-Texten
 */
function detailHinweise(zeile) {
  const hinweise = []
  if (zeile.hinweise.includes('fehlerhaft')) hinweise.push(tHtml('roadmap.detail.fehlerhaft'))
  for (const befund of zeile.befunde ?? []) hinweise.push(escapeHtml(String(befund)))
  if (zeile.spur.label?.dauer && zeile.spur.label.fruehestensAb !== null) hinweise.push(tHtml('roadmap.detail.nachUnbekannt'))
  if (zeile.hinweise.includes('ohne_lage')) hinweise.push(tHtml('roadmap.detail.ohneLage'))
  if (zeile.hinweise.includes('abweichung')) hinweise.push(tHtml('roadmap.detail.abweichung'))
  return hinweise
}

/**
 * Das Detailpanel der gewählten Zeile, lesend, mit „Frag Jarvis dazu“ und „Anpassen“ („kommt“, B5b-2b).
 * @param gewaehlt - gewählte Zeile oder null
 * @param lage - aus ganttLage
 * @returns HTML
 */
function detailPanel(gewaehlt, lage) {
  if (gewaehlt === null) return `<aside class="rm-detail" aria-label="${tHtml('roadmap.detail.titel')}"><p class="subtle">${tHtml('roadmap.detail.nichtsSichtbar')}</p></aside>`
  const istFeature = gewaehlt.art === 'feature'
  const felder = [
    [t('roadmap.detail.id'), `<code>${escapeHtml(gewaehlt.id)}</code>`],
    [t('roadmap.detail.teilVon'), teilVon(gewaehlt, lage)],
  ]
  if (istFeature) felder.push([t('roadmap.detail.ziel'), featureInhalt(gewaehlt)])
  else if (gewaehlt.art === 'meilenstein') {
    const { abgenommen, gesamt } = gewaehlt.zaehler
    felder.push([t('roadmap.detail.inhalt'), tHtml('roadmap.detail.meilensteinInhalt', { anzahl: gesamt, abgenommen: formatiereZahl(abgenommen), gesamt: formatiereZahl(gesamt) })])
  } else felder.push([t('roadmap.detail.inhalt'), escapeHtml(gewaehlt.notiz.trim() === '' ? gewaehlt.titel : `${gewaehlt.titel} — ${gewaehlt.notiz}`)])
  felder.push([t('roadmap.detail.schaetzung'), detailSchaetzung(gewaehlt)])
  felder.push([t('roadmap.detail.ist'), gewaehlt.istAt === null ? '–' : tHtml('roadmap.detail.istWert', { wert: zahl(gewaehlt.istAt) })])
  felder.push([t('roadmap.detail.danach'), gewaehlt.danach === null ? '–' : escapeHtml(zeilenName(gewaehlt.danach))])
  const hinweise = detailHinweise(gewaehlt)
  if (hinweise.length > 0) felder.push([t('roadmap.detail.hinweise'), `<ul class="rm-detail-hinweise">${hinweise.map((h) => `<li>${h}</li>`).join('')}</ul>`])
  const featureId = gewaehlt.bezug.feature
  const featureZeile = featureId === null ? null : lage.jeSchluessel.get(zeilenSchluessel('f', gewaehlt.bezug.meilenstein, featureId))
  const link = featureZeile !== null && featureZeile !== undefined && featureZeile.kategorie !== 'ohne_akte' ? `<a class="text-link" href="#/workboard/${encodeURIComponent(featureId)}">${tHtml(istFeature ? 'roadmap.detail.oeffnen' : 'roadmap.detail.zumFeature')} <span aria-hidden="true">→</span></a>` : ''
  const chips = ['reihenfolge', 'blockiert', 'schaetzung'].map((f) => `<button type="button" class="rm-frage-chip" data-roadmap-jarvis-frage="${f}">${tHtml(`roadmap.jarvis.frage.${f}`)}</button>`).join('')
  return `<aside class="rm-detail" aria-labelledby="rm-detail-titel">
      <div class="rm-detail-kopf">
        ${typChip(gewaehlt.art)}
        <h3 id="rm-detail-titel">${escapeHtml(gewaehlt.titel)}</h3>
        ${statusText(gewaehlt.status)}
      </div>
      <dl class="rm-detail-felder">${felder.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${v}</dd>`).join('')}</dl>
      ${link}
      <div class="rm-jarvis">
        <label class="eyebrow" for="roadmap-jarvis-eingabe">${tHtml('roadmap.jarvis.titel')}</label>
        <div class="rm-frage-chips">${chips}</div>
        <div class="rm-frage-zeile">
          <input id="roadmap-jarvis-eingabe" type="text" placeholder="${tHtml('roadmap.jarvis.platzhalter')}" />
          <button type="button" class="button primary" data-roadmap-jarvis-fragen>${tHtml('roadmap.jarvis.fragen')}</button>
        </div>
        <p class="subtle">${tHtml('roadmap.jarvis.hinweis')}</p>
      </div>
      <div class="rm-anpassen">${kommtKnopf(t('roadmap.detail.anpassen'))}</div>
    </aside>`
}

/**
 * Legende: Ebenen-Quadrate und Formen (Design 03-roadmap).
 * @returns HTML
 */
function legende() {
  const ebenen = ['meilenstein', 'feature', 'workstream', 'fixpaket', 'design'].map((e) => `<span class="rm-leg" data-farbe="${e}"><span class="rm-leg-ebene" aria-hidden="true"></span>${tHtml(`typ.${e}`)}</span>`)
  const formen = ['laeuft', 'ist', 'geplant', 'max', 'ohne'].map((f) => `<span class="rm-leg"><span class="rm-leg-form rm-leg-${f}" aria-hidden="true"></span>${tHtml(`roadmap.legende.${f}`)}</span>`)
  return `${ebenen.join('')}<span class="rm-legende-trenner" aria-hidden="true"></span>${formen.join('')}`
}

/**
 * Gesamte Roadmap: Werkzeugleiste, Gantt (Kopf mit Achse, Heute-Linie, Zeilen, Trennzeile), Fußnote, Detailpanel.
 * @returns HTML
 */
function gesamteRoadmap() {
  if (roadmap.meilensteine.length === 0) return `<p class="subtle">${tHtml('roadmap.keineMeilensteine')}</p>`
  const lage = ganttLage()
  const gewaehlt = gewaehlteZeile(roadmap, lage, auswahl)
  if (gewaehlt?.art === 'feature') stelleAkteSicher(gewaehlt)
  const aufklappbar = aufklappbareSchluessel(lage, abgeschlosseneSichtbar)
  const offenSet = aufgeklappt ?? lage.standardOffen
  const alleAuf = aufklappbar.length > 0 && aufklappbar.every((s) => offenSet.has(s))
  const { trenner, achse } = lage
  const trennzeile =
    trenner === null
      ? ''
      : `<li class="rm-ausgeblendet">
        <span aria-hidden="true">✓</span>
        <span>${tHtml(abgeschlosseneSichtbar ? 'roadmap.baum.abgeschlossenSichtbar' : 'roadmap.baum.abgeschlossenAus', { anzahl: trenner.anzahl, zahl: formatiereZahl(trenner.anzahl), abgenommen: formatiereZahl(trenner.abgenommen), gesamt: formatiereZahl(trenner.gesamt) })}</span>
        <button type="button" class="button" data-roadmap-abgeschlossene aria-pressed="${abgeschlosseneSichtbar}">${tHtml(abgeschlosseneSichtbar ? 'roadmap.baum.ausblenden' : 'roadmap.baum.einblenden')}</button>
      </li>`
  const einblenden =
    trenner === null
      ? ''
      : `<button type="button" class="button" data-roadmap-abgeschlossene-kopf aria-pressed="${abgeschlosseneSichtbar}">${tHtml(abgeschlosseneSichtbar ? 'roadmap.baum.abgeschlosseneAus' : 'roadmap.baum.abgeschlosseneEin', { zahl: formatiereZahl(trenner.anzahl) })}</button>`
  const zoom = ['tage', 'wochen'].map((z) => `<button type="button" class="rm-zoom" data-roadmap-zoom="${z}" aria-pressed="${massstab === z}">${tHtml(`roadmap.massstab.${z}`)}</button>`).join('')
  const spalten = achse.spalten.map((s) => `<span class="rm-achse-spalte" style="left: ${s.links}px">${tHtml(achse.massstab === 'wochen' ? 'roadmap.achse.woche' : 'roadmap.achse.at', { n: formatiereZahl(s.nummer) })}</span>`).join('')
  const zeilen = (liste) => liste.filter((z) => z.sichtbar).map((z) => ganttZeile(z, gewaehlt)).join('')
  return `<div class="rm-werkzeuge">
      <div class="rm-legende" role="group" aria-label="${tHtml('roadmap.legende')}">${legende()}</div>
      <div class="rm-knoepfe">
        <div class="rm-massstab" role="group" aria-label="${tHtml('roadmap.massstab')}">${zoom}</div>
        <button type="button" class="button" data-roadmap-alles aria-pressed="${alleAuf}"${aufklappbar.length === 0 ? ' disabled' : ''}>${tHtml(alleAuf ? 'roadmap.baum.allesZu' : 'roadmap.baum.allesAuf')}</button>
        ${einblenden}
      </div>
    </div>
    <div class="rm-raster">
      <div class="rm-gantt-rahmen">
        <div class="rm-gantt" role="region" aria-label="${tHtml('roadmap.gantt.titel')}" tabindex="0" data-massstab="${massstab}">
          <div class="rm-gantt-inhalt" style="--rm-spur-breite: ${achse.breite}px; --rm-ist-breite: ${IST_BREITE}px">
            <div class="rm-gantt-kopf" aria-hidden="true">
              <div class="rm-links">${tHtml('roadmap.spalte.eintrag')}</div>
              <div class="rm-spur"><span class="rm-ist-kopf">${tHtml('roadmap.achse.ist')}</span>${spalten}</div>
            </div>
            <div class="rm-heute" aria-hidden="true"><span>${tHtml('roadmap.achse.heute')}</span></div>
            <ul class="rm-zeilen" aria-label="${tHtml('roadmap.baum.titel')}">
              ${zeilen(lage.oben)}
              ${trennzeile}
              ${abgeschlosseneSichtbar ? zeilen(lage.unten) : ''}
            </ul>
          </div>
        </div>
        <p class="roadmap-fussnote">${tHtml('roadmap.zeitplanung.hinweis')}</p>
      </div>
      ${detailPanel(gewaehlt, lage)}
    </div>`
}

/**
 * Lädt die Akte eines gewählten Features einmal (Ziel im Detailpanel).
 * @param feature - { id, status }
 */
function stelleAkteSicher(feature) {
  if (akten.has(feature.id) || statusKategorie(feature.status) === 'ohne_akte') return
  akten.set(feature.id, { status: 'laedt' })
  const nummer = roadmapAnfrageZaehler
  holeFeatureAkte(feature.id).then(
    (daten) => {
      if (nummer !== roadmapAnfrageZaehler) return
      akten.set(feature.id, { status: 'ok', daten })
      render()
    },
    (fehler) => {
      if (nummer !== roadmapAnfrageZaehler) return
      console.error(`GET …/features/${feature.id}/akte fehlgeschlagen:`, fehler)
      akten.set(feature.id, { status: 'fehler' })
      render()
    }
  )
}

// ─── Entwicklungsstand und Noch nicht eingeplant ──────────────────────────────

/**
 * Eine Zeile des Entwicklungsstands.
 * @param eintrag - aus waehleEntwicklungsstand
 * @returns HTML
 */
function standZeile(eintrag) {
  const chipTyp = chipTypVonWorkitem(eintrag.typ)
  const chip = chipTyp === null ? `<span class="typ-chip typ-chip-neutral">${escapeHtml(String(eintrag.typ ?? ''))}</span>` : typChip(chipTyp, { zusatz: eintrag.prioritaet ?? '' })
  const ohneAkte = eintrag.art === 'feature' && statusKategorie(eintrag.status) === 'ohne_akte'
  const status = eintrag.art === 'feature' ? statusText(eintrag.status) : `<span class="roadmap-status" title="${escapeHtml(eintrag.status ?? '')}">${tHtml('uebersicht.stand.offen')}</span>`
  const oeffnen = ohneAkte ? '' : `<a class="button" href="#/workboard/${encodeURIComponent(eintrag.id)}">${tHtml('roadmap.stand.oeffnen')}</a>`
  return `<tr>
      <td><span class="rm-stand-titel">${escapeHtml(titelVon(eintrag))}</span><small><code>${escapeHtml(eintrag.id)}</code></small></td>
      <td>${chip}</td>
      <td>${status}</td>
      <td>${kommtKnopf(eintrag.prioritaet ?? t('uebersicht.stand.ohnePrioritaet'))}</td>
      <td>${oeffnen}</td>
    </tr>`
}

/**
 * Entwicklungsstand mit Filter (zieht aus der Produktübersicht hierher).
 * @returns HTML
 */
function entwicklungsstand() {
  const filter = Object.keys(STAND_FILTER)
    .map((f) => `<button type="button" class="filter-chip" data-roadmap-stand="${f}" aria-pressed="${standFilter === f}">${tHtml(`roadmap.stand.filter.${f}`)}</button>`)
    .join('')
  const kopf = `<div class="section-label">
      <div><h2>${tHtml('uebersicht.stand.titel')}</h2><p class="subtle">${tHtml('roadmap.stand.text')}</p></div>
      <div class="rm-stand-filter" role="group" aria-label="${tHtml('roadmap.stand.filter')}">${filter}</div>
    </div>`
  const meilenstein = aktuellerMeilenstein(roadmap)
  const typen = STAND_FILTER[standFilter]
  const { eintraege, gesamt } = waehleEntwicklungsstand(meilenstein, workitems, STAND_MAX, typen === null ? {} : { typen })
  const hinweise = []
  if (workitems === undefined) hinweise.push(tHtml('roadmap.laedt'))
  if (workitems === null) hinweise.push(tHtml('uebersicht.stand.befundeNichtVerfuegbar'))
  let inhalt = ''
  if (eintraege.length > 0) {
    inhalt = `<div class="rm-stand-scroll"><table class="rm-stand">
        <thead><tr><th scope="col">${tHtml('roadmap.stand.spalte.eintrag')}</th><th scope="col">${tHtml('roadmap.stand.spalte.typ')}</th><th scope="col">${tHtml('roadmap.stand.spalte.status')}</th><th scope="col">${tHtml('roadmap.stand.spalte.prioritaet')}</th><th scope="col"><span class="sr-only">${tHtml('roadmap.stand.oeffnen')}</span></th></tr></thead>
        <tbody>${eintraege.map(standZeile).join('')}</tbody>
      </table></div>`
    if (gesamt > eintraege.length) inhalt += `<p class="subtle">${tHtml('roadmap.stand.weitere', { anzahl: gesamt - eintraege.length, zahl: formatiereZahl(gesamt - eintraege.length) })}</p>`
  } else if (hinweise.length === 0) inhalt = `<p class="subtle">${tHtml('roadmap.stand.leer')}</p>`
  return `<section class="rm-entwicklungsstand">${kopf}${inhalt}${hinweise.map((h) => `<p class="subtle">${h}</p>`).join('')}<p class="rm-stand-alle"><a class="text-link" href="#/workboard">${tHtml('uebersicht.stand.alle')} <span aria-hidden="true">→</span></a></p></section>`
}

/**
 * „Noch nicht eingeplant“ (F44 D3).
 * @returns HTML
 */
function nichtEingeplantAbschnitt() {
  const kopf = `<div class="section-label">
      <h2>${tHtml('roadmap.nichtEingeplant.titel')}</h2>
      <a class="text-link" href="#/workboard">${tHtml('roadmap.arbeitsvorrat')} <span aria-hidden="true">→</span></a>
    </div>`
  let inhalt
  if (workitems === undefined) inhalt = `<p class="subtle">${tHtml('roadmap.laedt')}</p>`
  else if (workitems === null) inhalt = `<p class="subtle">${tHtml('roadmap.nichtEingeplant.nichtVerfuegbar')}</p>`
  else {
    const liste = nichtEingeplant(roadmap, workitems.filter((w) => w?.typ === 'FEATURE')) ?? []
    if (liste.length === 0) inhalt = `<p class="subtle">${tHtml('roadmap.nichtEingeplant.alle')}</p>`
    else {
      inhalt = `<div class="unplanned-chips">${liste
        .map((w) => `<a class="roadmap-chip" href="#/workboard/${encodeURIComponent(w.id)}"><code>${escapeHtml(w.id)}</code><span class="chip-title">${escapeHtml(titelVon(w))}</span></a>`)
        .join('')}</div>`
    }
  }
  return `<section class="roadmap-nicht-eingeplant">${kopf}${inhalt}</section>`
}

// ─── Hauptteil ────────────────────────────────────────────────────────────────

/**
 * Hauptteil je Zustand.
 * @returns HTML
 */
function hauptteil() {
  const zustand = roadmapZustand(roadmap)
  if (zustand === 'laedt') return `<p class="subtle">${tHtml('roadmap.laedt')}</p>`
  if (zustand === 'nicht_vorhanden') {
    return `<section class="empty">
        <svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z" /></svg>
        <h2>${tHtml('roadmap.leer.titel')}</h2>
        <p>${tHtml('roadmap.leer.text')}</p>
      </section>${nichtEingeplantAbschnitt()}`
  }
  if (zustand === 'ungueltig') {
    const anzahl = roadmap.fehler.length
    return `<div class="note red roadmap-fehler">
        <strong>${tHtml('roadmap.ungueltig.titel', { anzahl })}</strong>
        <p>${tHtml('roadmap.ungueltig.text')}</p>
        ${anzahl === 0 ? '' : `<details><summary>${tHtml('roadmap.ungueltig.details')}</summary><ul>${roadmap.fehler.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul></details>`}
      </div>`
  }
  if (zustand === 'fehler') {
    const grund = typeof roadmap.grund === 'string' && roadmap.grund !== '' ? `<p><code>${escapeHtml(roadmap.grund)}</code></p>` : ''
    return `<div class="note red roadmap-fehler">
        <strong>${tHtml('roadmap.fehler.titel')}</strong>
        <p>${tHtml('roadmap.fehler.text')}</p>
        ${grund}
        <button type="button" class="button" data-roadmap-erneut>${tHtml('roadmap.fehler.erneut')}</button>
      </div>`
  }
  return `${kennzahlen()}
    <section class="rm-gesamt" aria-labelledby="rm-gesamt-titel">
      <div class="rm-gesamt-kopf">
        <h2 id="rm-gesamt-titel">${tHtml('roadmap.gesamt.titel')}</h2>
        <p class="subtle">${tHtml('roadmap.gesamt.text')}</p>
      </div>
      ${gesamteRoadmap()}
    </section>
    ${entwicklungsstand()}
    ${nichtEingeplantAbschnitt()}`
}

/**
 * Rendert die ganze Seite in #view-roadmap; Fokus (über data-Attribute) und der Text im Fragefeld
 * bleiben erhalten. Ein fehlender Container wird gemeldet, nicht geworfen.
 */
function render() {
  const container = document.getElementById('view-roadmap')
  if (container === null) {
    console.error('roadmap: Container view-roadmap fehlt')
    return
  }
  const eingabe = document.getElementById('roadmap-jarvis-eingabe')
  const text = eingabe?.value ?? ''
  const aktiv = document.activeElement
  // Element fehlt außerhalb des Browsers (node:test mit Schein-DOM) — dort gibt es keinen Fokus.
  const fokusSelektor = typeof Element !== 'undefined' && aktiv instanceof Element && container.contains(aktiv) ? fokusSchluessel(aktiv) : null
  // Querscroll des Gantt überlebt das Neuschreiben (Prüfpass cr 1/qa 1); nach einem Zoom-Wechsel passt er ohnehin nicht mehr.
  const gantt = container.querySelector('.rm-gantt')
  const quer = gantt !== null && gantt.getAttribute('data-massstab') === massstab ? gantt.scrollLeft : 0
  container.innerHTML = `${seitenkopf()}${hauptteil()}`
  const neuerGantt = container.querySelector('.rm-gantt')
  if (neuerGantt !== null && quer > 0) neuerGantt.scrollLeft = quer
  const neueEingabe = document.getElementById('roadmap-jarvis-eingabe')
  if (neueEingabe !== null) neueEingabe.value = text
  if (fokusSelektor !== null) container.querySelector(fokusSelektor)?.focus()
}

/**
 * Selektor, mit dem ein fokussiertes Bedienelement nach dem Neuschreiben wiedergefunden wird.
 * @param element - fokussiertes Element
 * @returns CSS-Selektor oder null
 */
function fokusSchluessel(element) {
  if (element.id === 'roadmap-jarvis-eingabe') return '#roadmap-jarvis-eingabe'
  for (const attribut of ['data-roadmap-klappe', 'data-roadmap-waehlen', 'data-roadmap-zoom', 'data-roadmap-stand', 'data-roadmap-jarvis-frage']) {
    if (element.hasAttribute(attribut)) return `[${attribut}="${CSS.escape(element.getAttribute(attribut))}"]`
  }
  for (const attribut of ['data-roadmap-alles', 'data-roadmap-abgeschlossene', 'data-roadmap-abgeschlossene-kopf', 'data-roadmap-jarvis-fragen', 'data-roadmap-jarvis-kopf']) {
    if (element.hasAttribute(attribut)) return `[${attribut}]`
  }
  return null
}

// ─── Laden und Bedienung ─────────────────────────────────────────────────────

/**
 * Lädt Roadmap und Workitems neu (beim Betreten, bei Projektwechsel, über „Erneut laden“). Beide
 * Abrufe laufen parallel, scheitern unabhängig und rendern je für sich. Eine überholte Antwort wird
 * verworfen; Auswahl und Aufklappzustand bleiben nur innerhalb desselben Projekts.
 * @param optionen - { fokus: true } setzt danach den Fokus auf die Überschrift
 */
async function ladeRoadmap(optionen = {}) {
  const meineAnfrageNummer = ++roadmapAnfrageZaehler
  const aktuell = () => meineAnfrageNummer === roadmapAnfrageZaehler
  roadmap = null
  workitems = undefined
  akten.clear()
  render()
  const roadmapAbruf = holeRoadmap().then(
    (antwort) => {
      if (!aktuell()) return
      roadmap = antwort
      render()
    },
    (fehler) => {
      if (!aktuell()) return
      console.error('GET …/roadmap fehlgeschlagen:', fehler)
      roadmap = { status: 'fehler', grund: fehler instanceof Error ? fehler.message : String(fehler) }
      render()
    }
  )
  const workitemsAbruf = holeWorkitems().then(
    (antwort) => {
      if (!aktuell()) return
      workitems = Array.isArray(antwort?.workitems) ? antwort.workitems : null
      render()
    },
    (fehler) => {
      if (!aktuell()) return
      console.error('GET …/workitems fehlgeschlagen:', fehler)
      workitems = null
      render()
    }
  )
  await Promise.all([roadmapAbruf, workitemsAbruf])
  if (optionen.fokus === true && aktuell()) document.querySelector('#view-roadmap h1')?.focus()
}

/**
 * Text für „Frag Jarvis dazu“: die Frage plus der Bezug auf den gewählten Eintrag.
 * @param frage - Fragetext (übersetzt oder vom Nutzer)
 * @returns Entwurf für die Chat-Eingabe
 */
function jarvisEntwurf(frage) {
  const gewaehlt = roadmapZustand(roadmap) === 'ok' && roadmap.meilensteine.length > 0 ? gewaehlteZeile(roadmap, ganttLage(), auswahl) : null
  if (gewaehlt === null) return frage
  return t('roadmap.jarvis.entwurf', { frage, typ: t(`typ.${gewaehlt.art}`), id: gewaehlt.id, titel: gewaehlt.titel }).trim()
}

/**
 * Klick-Behandlung der Seite (Delegation).
 * @param ereignis - Klick
 */
function beiKlick(ereignis) {
  if (!(ereignis.target instanceof Element)) return
  const ziel = ereignis.target
  if (ziel.closest('[data-roadmap-erneut]') !== null) {
    void ladeRoadmap({ fokus: true })
    return
  }
  const kopf = ziel.closest('[data-roadmap-jarvis-kopf]')
  if (kopf !== null) {
    oeffneChatMitEntwurf({ modus: 'jarvis', entwurf: t('roadmap.jarvis.kopfEntwurf', { projekt: holeAktivesProjekt().name }) }, kopf)
    return
  }
  const frage = ziel.closest('[data-roadmap-jarvis-frage]')
  if (frage !== null) {
    oeffneChatMitEntwurf({ modus: 'jarvis', entwurf: jarvisEntwurf(t(`roadmap.jarvis.frage.${frage.getAttribute('data-roadmap-jarvis-frage')}`)) }, frage)
    return
  }
  const fragen = ziel.closest('[data-roadmap-jarvis-fragen]')
  if (fragen !== null) {
    const eingabe = document.getElementById('roadmap-jarvis-eingabe')
    oeffneChatMitEntwurf({ modus: 'jarvis', entwurf: jarvisEntwurf((eingabe?.value ?? '').trim()) }, fragen)
    return
  }
  const klappe = ziel.closest('[data-roadmap-klappe]')
  if (klappe !== null && roadmapZustand(roadmap) === 'ok') {
    if (aufgeklappt === null) aufgeklappt = new Set(ganttLage().standardOffen)
    const schluessel = klappe.getAttribute('data-roadmap-klappe')
    if (aufgeklappt.has(schluessel)) aufgeklappt.delete(schluessel)
    else aufgeklappt.add(schluessel)
    render()
    return
  }
  const waehlen = ziel.closest('[data-roadmap-waehlen]')
  if (waehlen !== null) {
    auswahl = waehlen.getAttribute('data-roadmap-waehlen')
    render()
    return
  }
  const zoom = ziel.closest('[data-roadmap-zoom]')
  if (zoom !== null) {
    massstab = zoom.getAttribute('data-roadmap-zoom') === 'wochen' ? 'wochen' : 'tage'
    render()
    return
  }
  if (ziel.closest('[data-roadmap-alles]') !== null && roadmapZustand(roadmap) === 'ok') {
    const lage = ganttLage()
    const aufklappbar = aufklappbareSchluessel(lage, abgeschlosseneSichtbar)
    const offen = aufgeklappt ?? lage.standardOffen
    aufgeklappt = new Set(aufklappbar.every((s) => offen.has(s)) ? [] : aufklappbar)
    render()
    return
  }
  if (ziel.closest('[data-roadmap-abgeschlossene], [data-roadmap-abgeschlossene-kopf]') !== null) {
    abgeschlosseneSichtbar = !abgeschlosseneSichtbar
    render()
    return
  }
  const stand = ziel.closest('[data-roadmap-stand]')
  if (stand !== null) {
    standFilter = stand.getAttribute('data-roadmap-stand')
    render()
  }
}

/** Registriert #/roadmap, die Bedienung und das Neuladen bei Projektwechsel. Einmalig beim Bootstrap. */
export function initRoadmapView() {
  const container = document.getElementById('view-roadmap')
  container?.addEventListener('click', beiKlick)
  container?.addEventListener('keydown', (ereignis) => {
    // Enter im Fragefeld wirkt wie „Fragen“ (befüllt nur den Chat, sendet nicht).
    if (ereignis.key === 'Enter' && ereignis.target instanceof Element && ereignis.target.id === 'roadmap-jarvis-eingabe') {
      ereignis.preventDefault()
      document.querySelector('[data-roadmap-jarvis-fragen]')?.click()
    }
  })
  registriere(/^#\/roadmap$/, 'roadmap', () => {
    void ladeRoadmap()
  })
  abonniereProjektWechsel(() => {
    auswahl = null
    aufgeklappt = null
    abgeschlosseneSichtbar = false
    massstab = 'tage'
    standFilter = 'alle'
    void ladeRoadmap()
  })
}
