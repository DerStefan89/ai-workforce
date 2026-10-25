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
 *   mit „Frag Jarvis dazu“ und aufklappbarem „Anpassen“ (F45 B5b-2b-1, features/F45/plan-b5b2b-v2.md: Priorität und
 *   Meilenstein an der Feature-Zeile, Schätzung Min/Max an Workstream/Fixpaket/Design über PUT …/planung; Bausteine in
 *   roadmap-anpassen.js); Balken ziehen und „+ Eintrag erfassen“ bleiben „kommt“.
 * - Bereinigung (n) (F45 B5b-2b-2, features/F45/plan-b5b2b2-v2.md): R1-Abweichungen aus GET /api/roadmap/bereinigung mit
 *   Vorschlägen (nicht mögliche deaktiviert, Grund sichtbar), Pflicht-Begründung, Bestätigungsschritt und POST …/bestaetigen für
 *   genau einen Eintrag; Zähler als Sprungknopf an der Trennzeile. Bausteine in roadmap-bereinigung.js.
 * - Pflege & Fixes (F45 B5b-2c-2-AB, features/F45/plan-b5b2c2-v2.md): offene P0–P2-Befunde aus den Workitems nach der Regel in
 *   befund-zuordnung.js — Zähler je Feature und Meilenstein (Kurzinfo und Detailfeld „Offene Befunde“), an der Trennzeile, und die
 *   Zeile „Pflege & Fixes“ (grau wie die Vorlage, Standard zu) mit bis zu 20 Befund-Zeilen und „+ n weitere“ samt Link ins Kanban ·
 *   Priorität mit vorgemerktem Filter (views/workboard.js oeffneKanbanPrioritaet). Laden die Workitems nach der Roadmap, erscheint die
 *   Zeile später; ein „Alles aufklappen“ dazwischen lässt sie zu (DEKLARIERT, Advisor B6). Ebenfalls DEKLARIERT (Prüfpass qa 4,
 *   cr 4): scheitern die Workitems, fehlen Pflege-Zeile und Zähler im Gantt — „nicht verfügbar“ steht im Detailfeld „Offene
 *   Befunde“ und im Entwicklungsstand; eine Roadmap ohne Meilensteine zeigt keinen Gantt und damit auch keine Pflege-Zeile.
 *   Alle Rechnungen in roadmap-anzeige.js bzw. roadmap-anpassen.js; hier wird nur gerendert und verdrahtet.
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
 *   befüllen — nie senden; Jarvis füllt nichts in „Anpassen“.
 * - Schreibaktionen: „Jetzt schreiben“ in der Bereinigung (genau ein Eintrag, hashes aus dem GET; nach jeder Antwort Liste neu, nach
 *   200 auch die Roadmap; Erfolge samt Git-Block bleiben bis „Schließen“) und „Änderung speichern“ in „Anpassen“ (Begründung Pflicht, Hash frisch vor dem Speichern gelesen,
 *   Doppelklick-Sperre über die Phase im Zustand). Nach 200 Git-Block (nur Text, nichts ausgeführt), Roadmap neu ohne
 *   „Lädt“-Zwischenstand, Auswahl bleibt (nach einem Meilenstein-Wechsel auf dem Feature im aufgeklappten Ziel); nach
 *   409/400/422 Servertext und „Neu laden“, die Eingaben bleiben. Eingaben schreiben in den Zustand, ohne die Seite neu zu
 *   schreiben; der Speichern-Knopf und der Hinweis darunter werden direkt geschaltet. Der Formularzustand gilt je Zeile
 *   (anpassenStaende) und übersteht Auswahlwechsel und Zuklappen; verworfen nur durch „Schließen“ und den Projektwechsel.
 * - Projektinhalte (Name, Titel, IDs, Statuswerte, Ziel, Regelverstöße) werden nicht übersetzt und
 *   immer escaped; alle übrigen Texte über t().
 * - Die Seite wird bei jeder Zustandsänderung ganz neu geschrieben (kein Poll); Fokus und der Text im
 *   Fragefeld werden dabei über data-Attribute bzw. den Wert erhalten.
 */

import { bestaetigeBereinigung, holeBereinigung, holeFeatureAkte, holeRoadmap, holeWorkitems, SCHREIB_ZEITLIMIT_MS, speicherePlanung } from '../api.js'
import { kopiereBefehlsblock } from '../befehlsblock.js'
import { ordneBefundeZu } from '../befund-zuordnung.js'
import { oeffneChatMitEntwurf } from '../chat-dock.js'
import { formatiereZahl, t, tHtml } from '../i18n.js'
import { kommtKnopf } from '../kommt.js'
import { planungsRegister, zurueckZurUebersicht } from '../produktplanung-kopf.js'
import { abonniereProjektWechsel, holeAktivesProjekt } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import {
  baueBestaetigung,
  bereinigungHinweis,
  bereinigungHtml,
  bereinigungsAnzahl,
  darfBestaetigen,
  darfSchreiben,
  deuteBereinigung,
  deuteBestaetigungAntwort,
  gewaehlterVorschlag,
  neuerEintragsStand,
  trennzeileBereinigungHtml,
  zeigeBereinigung,
} from '../roadmap-bereinigung.js'
import { anpassbar, anpassenHinweis, anpassenHtml, anpassenWerte, baueAnpassenKoerper, darfAnpassenSpeichern, deutePlanungAntwort, meilensteinZiele, nichtAnpassbarHtml, offenNachWechsel, pruefeAnpassen } from '../roadmap-anpassen.js'
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
import { oeffneKanbanPrioritaet } from './workboard.js'

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

/**
 * Formularzustände „Anpassen“ je Zeile, Schlüssel anpassenSchluessel (Projekt, Feature, Workstream — nicht der Zeilenschlüssel, der
 * sich beim Meilenstein-Wechsel ändert): { schluessel, projektId, featureId, offen, phase: 'offen' | 'speichert' | 'gespeichert' |
 * 'konflikt' | 'gesperrt' | 'abgelehnt' | 'fehler', werte, ausgang, meldung, ergebnis }. Ein Zustand übersteht Auswahlwechsel,
 * Zuklappen und Neuschreiben (Prüfpass cr 1/qa 1: kein Erfolg samt Git-Block geht verloren); verworfen nur durch „Schließen“ und
 * den Projektwechsel.
 */
const anpassenStaende = new Map()

/** true, wenn das Neuladen nach „Anpassen“ scheiterte und die Anzeige den Stand davor zeigt. */
let roadmapVeraltet = false

/** Nachlauf eines gescheiterten Neuladens (Auswahl nach Meilenstein-Wechsel), den „Erneut laden“ nachholt (Prüfpass qa 3). */
let ausstehendNachRoadmap = null

/**
 * Bereinigungsliste (F45 B5b-2b-2): { laden: 'laedt' | 'ok' | 'fehler', fehlerGrund, liste (deuteBereinigung oder null), staende:
 * Map<eintrag, Formularstand> (neuerEintragsStand), oben ({ eintrag, meldung } eines nach dem Neuladen verschwundenen bzw. nicht
 * angezeigten Eintrags), sendet (Eintrag mit laufendem POST oder null), neuLaden (Liste lädt mit altem Stand) }. Verworfen beim
 * Projektwechsel.
 */
const bereinigung = leereBereinigung()

/**
 * Erfolge samt Git-Block je Projekt-ID (neueste zuerst, bis „Schließen“). Überstehen den Projektwechsel (Prüfpass qa 3: geschrieben,
 * nicht committet — der Block darf nicht verloren gehen); eine Antwort 200 nach einem Wechsel landet beim Projekt des POST.
 */
const erfolgeJeProjekt = new Map()

/** Überholschutz für ladeBereinigung. */
let bereinigungAnfrageZaehler = 0

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

/** Zwischenspeicher der Befund-Zuordnung je (workitems, roadmap) — eine Rechnung je Datenstand, nicht je Render (Advisor B6). */
let zuordnungSpeicher = { workitems: undefined, roadmap: null, wert: null }

/**
 * Zuordnung der offenen P0–P2-Befunde (befund-zuordnung.js) zum aktuellen Datenstand, null solange die Workitems laden oder fehlen.
 * @returns Ergebnis von ordneBefundeZu oder null
 */
function befundZuordnung() {
  if (zuordnungSpeicher.workitems !== workitems || zuordnungSpeicher.roadmap !== roadmap) zuordnungSpeicher = { workitems, roadmap, wert: ordneBefundeZu(workitems, roadmap) }
  return zuordnungSpeicher.wert
}

/**
 * Gantt-Lage für den aktuellen Anzeigezustand (Achse je Zoom, alle Zeilen samt eingeklappter, mit Befund-Zuordnung — eine Stelle für
 * Render und Handler, Advisor B6).
 * @returns { achse, oben, unten, trenner, standardOffen, alle: Zeile[], jeSchluessel: Map }
 */
function ganttLage() {
  const achse = baueAchse(zeitachseVon(roadmap), massstab)
  const lage = ganttZeilen(roadmap, { aufgeklappt, abgeschlosseneSichtbar, achse, zuordnung: befundZuordnung() })
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
  if (zeile.art === 'pflege') return t('roadmap.pflege.titel')
  if (zeile.art !== 'gruppe') return zeile.art === 'meilenstein' || zeile.art === 'feature' ? `${zeile.id} · ${zeile.titel}` : zeile.titel
  return zeile.farbe === 'feature' ? t('roadmap.gruppe.features', { id: zeile.id }) : t('roadmap.gruppe.zeilen')
}

/**
 * Übersetzter Typ eines Befunds (Workitem-Typ über typ-chip.js; ein unbekannter Typ steht roh, Advisor B4).
 * @param typ - workitem.typ
 * @returns Rohtext
 */
function befundTyp(typ) {
  const chipTyp = chipTypVonWorkitem(typ)
  return chipTyp === null ? String(typ ?? '') : t(`typ.${chipTyp}`)
}

/**
 * Kurzinfo unter dem Namen (Zähler, Schätzung, Ist, Hinweise) — Projektinhalte escaped.
 * @param zeile - aus ganttZeilen
 * @returns Rohtext
 */
function kurzinfo(zeile) {
  if (zeile.art === 'pflege') return zeile.anzahl === 0 ? t('roadmap.pflege.keine') : t('roadmap.pflege.info', { anzahl: zeile.anzahl, zahl: formatiereZahl(zeile.anzahl) })
  if (zeile.art === 'befund') return [zeile.id, befundTyp(zeile.typ), zeile.prioritaet ?? ''].filter((teil) => teil !== '').join(' · ')
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
  if (typeof zeile.befundeOffen === 'number' && zeile.befundeOffen > 0) teile.push(t('roadmap.befunde.info', { anzahl: zeile.befundeOffen, zahl: formatiereZahl(zeile.befundeOffen) }))
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
 * Nicht wählbare Zeile „+ n weitere“ hinter dem letzten Befund unter „Pflege & Fixes“ mit dem Link ins Kanban · Priorität (Advisor
 * B5b-2c B3: keine Zeile in der Lage).
 * @param weitere - Zahl der nicht gezeigten Befunde
 * @returns HTML
 */
function weitereZeile(weitere) {
  return `<li class="rm-zeile rm-ebene-1 rm-weitere" data-farbe="befund">
      <div class="rm-links" style="--rm-einzug: 1"><span class="rm-klappe-platz" aria-hidden="true"></span><span class="rm-weitere-text">${tHtml('roadmap.pflege.weitere', { anzahl: weitere, zahl: formatiereZahl(weitere) })}</span>${entwicklungsLink()}</div>
      <div class="rm-spur"></div>
    </li>`
}

/**
 * Knopf „In der Entwicklung ansehen →“ (öffnet Kanban · Priorität mit vorgemerktem Filter „Pflege & Fixes“; kein Hash-Link, der
 * Vormerker braucht den Aufruf).
 * @returns HTML
 */
function entwicklungsLink() {
  return `<button type="button" class="text-link" data-roadmap-entwicklung>${tHtml('roadmap.pflege.entwicklung')} <span aria-hidden="true">→</span></button>`
}

/**
 * Detailfeld „Offene Befunde“ einer Feature- bzw. Meilenstein-Zeile (P0–P2 nach befund-zuordnung.js; am Meilenstein samt Features).
 * @param zeile - Feature- oder Meilenstein-Zeile
 * @returns HTML
 */
function befundeFeld(zeile) {
  if (typeof zeile.befundeOffen !== 'number') return `<span class="subtle">${tHtml(workitems === undefined ? 'roadmap.laedt' : 'uebersicht.nichtVerfuegbar')}</span>`
  if (zeile.befundeOffen === 0) return tHtml('roadmap.befunde.keine')
  const zahlen = { anzahl: zeile.befundeOffen, zahl: formatiereZahl(zeile.befundeOffen) }
  return zeile.art === 'meilenstein' && zeile.befundeDirekt > 0 ? tHtml('roadmap.befunde.wertDirekt', { ...zahlen, direkt: formatiereZahl(zeile.befundeDirekt) }) : tHtml('roadmap.befunde.wert', zahlen)
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
 * Das Detailpanel der gewählten Zeile mit „Frag Jarvis dazu“ und aufklappbarem „Anpassen“ (B5b-2b-1). Ist „Anpassen“ offen, ist
 * „Fragen“ kein Hauptknopf (ein Hauptknopf je Handlung, design-guardian B2).
 * @param gewaehlt - gewählte Zeile oder null
 * @param lage - aus ganttLage
 * @returns HTML
 */
function detailPanel(gewaehlt, lage) {
  if (gewaehlt === null) return `<aside class="rm-detail" aria-label="${tHtml('roadmap.detail.titel')}"><p class="subtle">${tHtml('roadmap.detail.nichtsSichtbar')}</p></aside>`
  if (gewaehlt.art === 'pflege' || gewaehlt.art === 'befund') return pflegeDetail(gewaehlt)
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
  if (istFeature || gewaehlt.art === 'meilenstein') felder.push([t('roadmap.befunde.detail'), befundeFeld(gewaehlt)])
  felder.push([t('roadmap.detail.ist'), gewaehlt.istAt === null ? '–' : tHtml('roadmap.detail.istWert', { wert: zahl(gewaehlt.istAt) })])
  felder.push([t('roadmap.detail.danach'), gewaehlt.danach === null ? '–' : escapeHtml(zeilenName(gewaehlt.danach))])
  const hinweise = detailHinweise(gewaehlt)
  if (hinweise.length > 0) felder.push([t('roadmap.detail.hinweise'), `<ul class="rm-detail-hinweise">${hinweise.map((h) => `<li>${h}</li>`).join('')}</ul>`])
  const featureId = gewaehlt.bezug.feature
  const featureZeile = featureId === null ? null : lage.jeSchluessel.get(zeilenSchluessel('f', gewaehlt.bezug.meilenstein, featureId))
  const link = featureZeile !== null && featureZeile !== undefined && featureZeile.kategorie !== 'ohne_akte' ? `<a class="text-link" href="#/workboard/${encodeURIComponent(featureId)}">${tHtml(istFeature ? 'roadmap.detail.oeffnen' : 'roadmap.detail.zumFeature')} <span aria-hidden="true">→</span></a>` : ''
  const anpassenTeil = anpassenBereich(gewaehlt, featureZeile ?? null)
  return `<aside class="rm-detail" aria-labelledby="rm-detail-titel">
      <div class="rm-detail-kopf">
        ${typChip(gewaehlt.art)}
        <h3 id="rm-detail-titel">${escapeHtml(gewaehlt.titel)}</h3>
        ${statusText(gewaehlt.status)}
      </div>
      ${felderHtml(felder)}
      ${link}
      ${jarvisBlock(!anpassenTeil.offen)}
      ${anpassenTeil.html}
    </aside>`
}

/**
 * Detailfelder als Definitionsliste (Schlüssel escaped, Werte schon HTML).
 * @param felder - [[Beschriftung, HTML], …]
 * @returns HTML
 */
function felderHtml(felder) {
  return `<dl class="rm-detail-felder">${felder.map(([k, v]) => `<dt>${escapeHtml(k)}</dt><dd>${v}</dd>`).join('')}</dl>`
}

/**
 * „Frag Jarvis dazu“ im Detailpanel: Fragechips, Eingabe, „Fragen“ (Hauptknopf nur ohne offenes „Anpassen“, design-guardian B2).
 * @param primaer - „Fragen“ als Hauptknopf
 * @returns HTML
 */
function jarvisBlock(primaer) {
  const chips = ['reihenfolge', 'blockiert', 'schaetzung'].map((f) => `<button type="button" class="rm-frage-chip" data-roadmap-jarvis-frage="${f}">${tHtml(`roadmap.jarvis.frage.${f}`)}</button>`).join('')
  return `<div class="rm-jarvis">
        <label class="eyebrow" for="roadmap-jarvis-eingabe">${tHtml('roadmap.jarvis.titel')}</label>
        <div class="rm-frage-chips">${chips}</div>
        <div class="rm-frage-zeile">
          <input id="roadmap-jarvis-eingabe" type="text" placeholder="${tHtml('roadmap.jarvis.platzhalter')}" />
          <button type="button" class="button${primaer ? ' primary' : ''}" data-roadmap-jarvis-fragen>${tHtml('roadmap.jarvis.fragen')}</button>
        </div>
        <p class="subtle">${tHtml('roadmap.jarvis.hinweis')}</p>
      </div>`
}

/**
 * Detailpanel der Zeile „Pflege & Fixes“ bzw. eines Befunds darunter (F45 B5b-2c-2-AB): kein „Anpassen“ (anpassbar ⇒ nein ohne
 * Grund), kein „danach“. Chip der Spur neutral mit festem Text (Advisor B4: typChip kennt 'pflege' nicht), am Befund Typ und
 * Priorität (unbekannter Typ: neutraler Chip mit dem Rohwert).
 * @param zeile - Pflege- oder Befund-Zeile
 * @returns HTML
 */
function pflegeDetail(zeile) {
  const pflege = zeile.art === 'pflege'
  let chip = `<span class="typ-chip typ-chip-neutral"><span class="typ-chip-punkt" aria-hidden="true"></span>${tHtml('roadmap.pflege.chip')}</span>`
  if (!pflege) {
    const chipTyp = chipTypVonWorkitem(zeile.typ)
    chip = chipTyp === null ? `<span class="typ-chip typ-chip-neutral">${escapeHtml([String(zeile.typ ?? ''), zeile.prioritaet ?? ''].filter((s) => s !== '').join(' · '))}</span>` : typChip(chipTyp, { zusatz: zeile.prioritaet ?? '' })
  }
  const felder = pflege
    ? [
        [t('roadmap.detail.teilVon'), tHtml('roadmap.detail.roadmap')],
        [t('roadmap.detail.inhalt'), `${tHtml('roadmap.pflege.inhalt', { anzahl: zeile.anzahl, zahl: formatiereZahl(zeile.anzahl) })} <span class="subtle">${tHtml('roadmap.pflege.regel')}</span>`],
        [t('roadmap.detail.schaetzung'), '–'],
      ]
    : [
        [t('roadmap.detail.id'), `<code>${escapeHtml(zeile.id)}</code>`],
        [t('roadmap.detail.teilVon'), tHtml('roadmap.pflege.titel')],
        [t('roadmap.detail.inhalt'), escapeHtml(zeile.titel)],
        [t('roadmap.detail.schaetzung'), tHtml('roadmap.befund.schaetzung')],
      ]
  const link = pflege ? entwicklungsLink() : `<a class="text-link" href="#/workboard/${encodeURIComponent(zeile.id)}">${tHtml('roadmap.befund.oeffnen')} <span aria-hidden="true">→</span></a>`
  return `<aside class="rm-detail" aria-labelledby="rm-detail-titel">
      <div class="rm-detail-kopf">
        ${chip}
        <h3 id="rm-detail-titel">${escapeHtml(pflege ? t('roadmap.pflege.titel') : zeile.titel)}</h3>
        ${statusText(zeile.status)}
      </div>
      ${felderHtml(felder)}
      ${link}
      ${jarvisBlock(true)}
    </aside>`
}

/**
 * Schlüssel des Formularzustands einer Zeile (Projekt, Feature, Workstream bzw. null an der Feature-Zeile).
 * @param zeile - Feature- oder Workstream-Zeile
 * @returns Text
 */
function anpassenSchluessel(zeile) {
  return JSON.stringify([holeAktivesProjekt().id, zeile.bezug.feature, zeile.art === 'feature' ? null : zeile.bezug.workstream])
}

/**
 * true, wenn zwei Formularstände bis auf die Begründung gleich sind.
 * @param a - Formularstand
 * @param b - Formularstand
 * @returns boolean
 */
function gleicheWerte(a, b) {
  const schluessel = new Set([...Object.keys(a), ...Object.keys(b)])
  schluessel.delete('grund')
  return [...schluessel].every((k) => a[k] === b[k])
}

/**
 * Formularzustand einer Zeile; legt ihn beim ersten Mal an. Unberührte Werte folgen neuen Daten (Prüfpass cr 3: nach „Schließen“
 * vor dem Ende des Neuladens entstünde sonst eine Scheinänderung zurück auf den alten Stand); eigene Eingaben bleiben.
 * @param zeile - Feature- oder Workstream-Zeile
 * @returns Zustand
 */
function anpassenZustand(zeile) {
  const schluessel = anpassenSchluessel(zeile)
  const ausgang = anpassenWerte(zeile)
  let zustand = anpassenStaende.get(schluessel)
  if (zustand === undefined) {
    zustand = { schluessel, projektId: holeAktivesProjekt().id, featureId: zeile.bezug.feature, offen: false, phase: 'offen', werte: ausgang, ausgang, meldung: null, ergebnis: null }
    anpassenStaende.set(schluessel, zustand)
  } else if (zustand.phase === 'offen' && gleicheWerte(zustand.werte, zustand.ausgang) && !gleicheWerte(ausgang, zustand.ausgang)) {
    zustand.werte = { ...ausgang, grund: zustand.werte.grund }
    zustand.ausgang = ausgang
  }
  return zustand
}

/**
 * Feature-Zeile über einer Zeile (bei einer Feature-Zeile sie selbst) oder null.
 * @param zeile - Zeile
 * @param lage - aus ganttLage
 * @returns Zeile oder null
 */
function featureZeileVon(zeile, lage) {
  return zeile.bezug.feature === null ? null : (lage.jeSchluessel.get(zeilenSchluessel('f', zeile.bezug.meilenstein, zeile.bezug.feature)) ?? null)
}

/**
 * „Anpassen“ der gewählten Zeile: Formular, Hinweis („nicht möglich, weil …“) oder nichts (Meilenstein).
 * @param zeile - gewählte Zeile
 * @param featureZeile - Feature-Zeile darüber oder null
 * @returns { html, offen }
 */
function anpassenBereich(zeile, featureZeile) {
  const moeglich = anpassbar(zeile, featureZeile)
  if (moeglich.art === 'nein') return { html: moeglich.grund === null ? '' : nichtAnpassbarHtml(moeglich.grund), offen: false }
  const zustand = anpassenZustand(zeile)
  return { html: anpassenHtml({ ...zustand, zeile, ziele: zeile.art === 'feature' ? meilensteinZiele(roadmap, zeile.bezug.meilenstein) : [] }), offen: zustand.offen }
}

/**
 * Legende: Ebenen-Quadrate und Formen (Design 03-roadmap).
 * @returns HTML
 */
function legende() {
  const ebenen = ['meilenstein', 'feature', 'workstream', 'fixpaket', 'design', 'bug'].map((e) => `<span class="rm-leg" data-farbe="${e}"><span class="rm-leg-ebene" aria-hidden="true"></span>${tHtml(`typ.${e}`)}</span>`)
  // „Pflege & Fixes“ mit festem Schlüssel (typ.pflege gibt es nicht; das i18n-Gate prüft dynamische Schlüssel nicht — Advisor B4).
  ebenen.push(`<span class="rm-leg" data-farbe="pflege"><span class="rm-leg-ebene" aria-hidden="true"></span>${tHtml('roadmap.legende.pflege')}</span>`)
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
        <span>${tHtml(abgeschlosseneSichtbar ? 'roadmap.baum.abgeschlossenSichtbar' : 'roadmap.baum.abgeschlossenAus', { anzahl: trenner.anzahl, zahl: formatiereZahl(trenner.anzahl), abgenommen: formatiereZahl(trenner.abgenommen), gesamt: formatiereZahl(trenner.gesamt) })}${(trenner.befunde ?? 0) > 0 ? ` ${tHtml('roadmap.baum.befunde', { anzahl: trenner.befunde, zahl: formatiereZahl(trenner.befunde) })}` : ''}</span>
        ${trennzeileBereinigungHtml(bereinigungsAnzahl(bereinigung.liste))}
        <button type="button" class="button" data-roadmap-abgeschlossene aria-pressed="${abgeschlosseneSichtbar}">${tHtml(abgeschlosseneSichtbar ? 'roadmap.baum.ausblenden' : 'roadmap.baum.einblenden')}</button>
      </li>`
  const einblenden =
    trenner === null
      ? ''
      : `<button type="button" class="button" data-roadmap-abgeschlossene-kopf aria-pressed="${abgeschlosseneSichtbar}">${tHtml(abgeschlosseneSichtbar ? 'roadmap.baum.abgeschlosseneAus' : 'roadmap.baum.abgeschlosseneEin', { zahl: formatiereZahl(trenner.anzahl) })}</button>`
  const zoom = ['tage', 'wochen'].map((z) => `<button type="button" class="rm-zoom" data-roadmap-zoom="${z}" aria-pressed="${massstab === z}">${tHtml(`roadmap.massstab.${z}`)}</button>`).join('')
  const spalten = achse.spalten.map((s) => `<span class="rm-achse-spalte" style="left: ${s.links}px">${tHtml(achse.massstab === 'wochen' ? 'roadmap.achse.woche' : 'roadmap.achse.at', { n: formatiereZahl(s.nummer) })}</span>`).join('')
  // Hinter dem letzten sichtbaren Befund einer offenen Pflege-Zeile mit Rest: „+ n weitere“ (keine Zeile der Lage).
  const zeilen = (liste) =>
    liste
      .filter((z) => z.sichtbar)
      .map((z, i, sichtbar) => {
        const pflege = z.art === 'befund' && sichtbar[i + 1]?.art !== 'befund' ? lage.jeSchluessel.get(z.eltern) : null
        return `${ganttZeile(z, gewaehlt)}${pflege?.weitere > 0 ? weitereZeile(pflege.weitere) : ''}`
      })
      .join('')
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
  const veraltet = roadmapVeraltet ? `<div class="note amber roadmap-fehler"><p>${tHtml('roadmap.anpassen.veraltet')}</p><button type="button" class="button" data-roadmap-erneut-behalten>${tHtml('roadmap.fehler.erneut')}</button></div>` : ''
  return `${veraltet}${kennzahlen()}
    <section class="rm-gesamt" aria-labelledby="rm-gesamt-titel">
      <div class="rm-gesamt-kopf">
        <h2 id="rm-gesamt-titel">${tHtml('roadmap.gesamt.titel')}</h2>
        <p class="subtle">${tHtml('roadmap.gesamt.text')}</p>
      </div>
      ${gesamteRoadmap()}
    </section>
    ${bereinigungAbschnitt()}
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
  // Caret eines Textfelds in „Anpassen“ überlebt ein Neuschreiben während des Tippens (z. B. Akte lädt nach; Advisor B3).
  const caret = fokusSelektor !== null && typeof aktiv.selectionStart === 'number' ? [aktiv.selectionStart, aktiv.selectionEnd] : null
  // Querscroll des Gantt überlebt das Neuschreiben (Prüfpass cr 1/qa 1); nach einem Zoom-Wechsel passt er ohnehin nicht mehr.
  const gantt = container.querySelector('.rm-gantt')
  const quer = gantt !== null && gantt.getAttribute('data-massstab') === massstab ? gantt.scrollLeft : 0
  container.innerHTML = `${seitenkopf()}${hauptteil()}`
  const neuerGantt = container.querySelector('.rm-gantt')
  if (neuerGantt !== null && quer > 0) neuerGantt.scrollLeft = quer
  const neueEingabe = document.getElementById('roadmap-jarvis-eingabe')
  if (neueEingabe !== null) neueEingabe.value = text
  if (fokusSelektor === null) return
  const neu = container.querySelector(fokusSelektor)
  neu?.focus()
  if (caret !== null && typeof neu?.setSelectionRange === 'function') neu.setSelectionRange(caret[0], caret[1])
}

/**
 * Selektor, mit dem ein fokussiertes Bedienelement nach dem Neuschreiben wiedergefunden wird.
 * @param element - fokussiertes Element
 * @returns CSS-Selektor oder null
 */
function fokusSchluessel(element) {
  if (element.id === 'roadmap-jarvis-eingabe') return '#roadmap-jarvis-eingabe'
  for (const attribut of ['data-roadmap-klappe', 'data-roadmap-waehlen', 'data-roadmap-zoom', 'data-roadmap-stand', 'data-roadmap-jarvis-frage', 'data-roadmap-anpassen-feld', 'data-roadmap-anpassen-aktion', 'data-roadmap-bereinigung-fokus']) {
    if (element.hasAttribute(attribut)) return `[${attribut}="${CSS.escape(element.getAttribute(attribut))}"]`
  }
  for (const attribut of ['data-roadmap-alles', 'data-roadmap-abgeschlossene', 'data-roadmap-abgeschlossene-kopf', 'data-roadmap-jarvis-fragen', 'data-roadmap-jarvis-kopf', 'data-roadmap-erneut-behalten', 'data-roadmap-zur-bereinigung', 'data-roadmap-entwicklung']) {
    if (element.hasAttribute(attribut)) return `[${attribut}]`
  }
  return null
}

// ─── Laden und Bedienung ─────────────────────────────────────────────────────

/**
 * Lädt Roadmap und Workitems neu (beim Betreten, bei Projektwechsel, über „Erneut laden“). Beide
 * Abrufe laufen parallel, scheitern unabhängig und rendern je für sich. Eine überholte Antwort wird
 * verworfen; Auswahl und Aufklappzustand bleiben nur innerhalb desselben Projekts.
 * @param optionen - { fokus: true } setzt danach den Fokus auf die Überschrift; { behalten: true } (nach „Anpassen“) zeigt bis
 *   zur Antwort den bisherigen Stand statt „Lädt“ und behält ihn bei einem Abruffehler mit Hinweis (das Ergebnis samt Git-Block
 *   bleibt sichtbar); { nachRoadmap } läuft nach dem Eintreffen der neuen Projektion, vor dem Rendern (Auswahl nach Wechsel);
 *   scheitert das Neuladen, holt das nächste Laden mit behalten den Nachlauf nach (Prüfpass qa 3)
 */
async function ladeRoadmap(optionen = {}) {
  const meineAnfrageNummer = ++roadmapAnfrageZaehler
  const aktuell = () => meineAnfrageNummer === roadmapAnfrageZaehler
  const behalten = optionen.behalten === true && roadmapZustand(roadmap) === 'ok'
  if (behalten) {
    ausstehendNachRoadmap = optionen.nachRoadmap ?? ausstehendNachRoadmap
    // Ein laufender Akte-Abruf wird durch den neuen Zähler verworfen — sonst bliebe sein Eintrag auf „lädt“ (Prüfpass cr 10).
    for (const [id, akte] of akten) if (akte.status === 'laedt') akten.delete(id)
  } else {
    roadmap = null
    workitems = undefined
    akten.clear()
    ausstehendNachRoadmap = null
  }
  roadmapVeraltet = false
  // Ein Ladeweg für die Bereinigungsliste (Advisor B5b-2b-2 B9): mit der Roadmap, scheitert für sich. Vor dem render(), damit die
  // Sperre „wird neu geladen“ schon im ersten Bild steht (Prüfpass cr 3); das synchrone Stück setzt nur die Flags.
  const bereinigungAbruf = ladeBereinigung({ behalten: bereinigung.liste !== null, anzeigen: false })
  render()
  const roadmapAbruf = holeRoadmap().then(
    (antwort) => {
      if (!aktuell()) return
      roadmap = antwort
      if (roadmapZustand(roadmap) === 'ok' && ausstehendNachRoadmap !== null) {
        ausstehendNachRoadmap()
        ausstehendNachRoadmap = null
      }
      render()
    },
    (fehler) => {
      if (!aktuell()) return
      console.error('GET …/roadmap fehlgeschlagen:', fehler)
      if (behalten) roadmapVeraltet = true
      else roadmap = { status: 'fehler', grund: fehler instanceof Error ? fehler.message : String(fehler) }
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
  await Promise.all([roadmapAbruf, workitemsAbruf, bereinigungAbruf])
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
  if (gewaehlt.art === 'pflege') return t('roadmap.jarvis.entwurfPflege', { frage }).trim()
  const typ = gewaehlt.art === 'befund' ? befundTyp(gewaehlt.typ) : t(`typ.${gewaehlt.art}`)
  return t('roadmap.jarvis.entwurf', { frage, typ, id: gewaehlt.id, titel: gewaehlt.titel }).trim()
}

/**
 * Gewählte Zeile und ihr Formularzustand, wenn die Zeile angepasst werden kann.
 * @returns { zeile, zustand } oder null
 */
function gewaehltesAnpassen() {
  if (roadmapZustand(roadmap) !== 'ok' || roadmap.meilensteine.length === 0) return null
  const lage = ganttLage()
  const zeile = gewaehlteZeile(roadmap, lage, auswahl)
  if (zeile === null || anpassbar(zeile, featureZeileVon(zeile, lage)).art === 'nein') return null
  const zustand = anpassenStaende.get(anpassenSchluessel(zeile))
  return zustand === undefined ? null : { zeile, zustand }
}

/**
 * Eingabe im Formular: Wert in den Zustand, Speichern-Knopf und Hinweis direkt schalten (kein Neuschreiben — Fokus und Caret
 * bleiben im Feld).
 * @param ereignis - input oder change
 */
function beiAnpassenEingabe(ereignis) {
  const feld = ereignis.target instanceof Element ? ereignis.target.closest('[data-roadmap-anpassen-feld]') : null
  const gewaehlt = feld === null ? null : gewaehltesAnpassen()
  if (gewaehlt === null || gewaehlt.zustand.phase === 'speichert') return
  const { zeile, zustand } = gewaehlt
  zustand.werte = { ...zustand.werte, [feld.getAttribute('data-roadmap-anpassen-feld')]: feld.value }
  const container = document.getElementById('view-roadmap')
  const knopf = container?.querySelector('[data-roadmap-anpassen-aktion="speichern"]') ?? null
  if (knopf !== null) {
    const frei = darfAnpassenSpeichern(zustand.werte, zeile, zustand.phase)
    knopf.disabled = !frei
    if (frei) knopf.removeAttribute('aria-disabled')
    else knopf.setAttribute('aria-disabled', 'true')
  }
  const hinweis = container?.querySelector('[data-roadmap-anpassen-hinweis]') ?? null
  if (hinweis !== null) hinweis.textContent = anpassenHinweis(zustand.werte, zeile)
}

/**
 * Knöpfe in „Anpassen“: speichern, neu laden (Eingaben bleiben), schließen (nach dem Erfolg; der nächste Stand entsteht aus den
 * dann aktuellen Daten).
 * @param aktion - Wert von data-roadmap-anpassen-aktion
 */
function beiAnpassenAktion(aktion) {
  const gewaehlt = gewaehltesAnpassen()
  if (gewaehlt === null) return
  const { zustand } = gewaehlt
  if (aktion === 'speichern') void speichereAnpassen(gewaehlt)
  else if (aktion === 'neu-laden' && zustand.phase !== 'speichert') {
    zustand.phase = 'offen'
    zustand.meldung = null
    akten.delete(zustand.featureId)
    void ladeRoadmap({ behalten: true })
  } else if (aktion === 'schliessen') {
    anpassenStaende.delete(zustand.schluessel)
    render()
  }
}

/**
 * Setzt den Fokus nach dem Neuschreiben auf Meldung bzw. Ergebnis des Formulars.
 */
function fokusAufAnpassen() {
  document.querySelector('#view-roadmap [data-roadmap-anpassen-fokus]')?.focus?.()
}

/**
 * „Änderung speichern“: Hash frisch lesen (Akte; mit Meilenstein-Wechsel auch roadmap_hash), PUT …/planung. Die Sperre gegen
 * Doppelklick steht in der Phase. Nach jedem Abruf wird geprüft, ob Projekt und Formularzustand noch gelten (Prüfpass qa 2: kein PUT
 * mit dem Hash des alten Projekts an das neue). Ein Erfolg bleibt im Zustand der Zeile, auch wenn inzwischen eine andere Zeile
 * gewählt ist — zurück auf der Zeile stehen Ergebnis und Git-Block da; die Roadmap lädt in jedem Fall neu (Prüfpass cr 2/qa 1).
 * Verworfen wird eine Antwort nur nach einem Projektwechsel (geloggt).
 * @param gewaehlt - { zeile, zustand } aus gewaehltesAnpassen
 */
async function speichereAnpassen({ zeile, zustand }) {
  if (!darfAnpassenSpeichern(zustand.werte, zeile, zustand.phase)) return
  const projektId = zustand.projektId
  const gilt = () => anpassenStaende.get(zustand.schluessel) === zustand && holeAktivesProjekt().id === projektId
  const wechsel = pruefeAnpassen(zustand.werte, zeile).aenderungen.includes('meilenstein') ? zustand.werte.meilenstein : null
  zustand.phase = 'speichert'
  zustand.meldung = null
  render()
  let deutung = null
  try {
    const akte = await holeFeatureAkte(zustand.featureId)
    const roadmapHash = !gilt() || wechsel === null ? null : ((await holeRoadmap())?.roadmap_hash ?? null)
    if (gilt()) {
      const antwort = await speicherePlanung(zustand.featureId, baueAnpassenKoerper(zustand.werte, zeile, akte?.hash ?? null, roadmapHash))
      deutung = deutePlanungAntwort(antwort.status, await antwort.json().catch(() => ({})))
    }
  } catch (fehler) {
    console.error(`PUT …/features/${zustand.featureId}/planung fehlgeschlagen:`, fehler)
    // Zeitlimit: die Datei kann trotzdem geschrieben sein — der Text sagt es (Prüfpass qa 6).
    const zeitlimit = fehler instanceof Error && fehler.name === 'TimeoutError'
    deutung = { art: 'fehler', status: 0, grund: zeitlimit ? t('roadmap.anpassen.zeitlimit') : t('roadmap.anpassen.fehlerAnfrage', { meldung: fehler instanceof Error ? fehler.message : String(fehler) }) }
  }
  if (deutung === null || !gilt()) {
    if (deutung?.art === 'ok') console.info(`[planung] ${zustand.featureId} gespeichert (${deutung.geaendert.join(', ')}), Projekt inzwischen gewechselt — nicht committet`)
    return
  }
  if (deutung.art === 'ok') {
    zustand.phase = 'gespeichert'
    zustand.ergebnis = deutung
    zustand.offen = true
    akten.delete(zustand.featureId)
    // Advisor A5: nach einem Meilenstein-Wechsel bleibt die Auswahl auf dem Feature (sofern noch gewählt), das Ziel wird aufgeklappt.
    const auswahlVorher = auswahl
    const nachRoadmap =
      wechsel === null
        ? undefined
        : () => {
            if (auswahl === auswahlVorher) auswahl = zeilenSchluessel('f', wechsel, zustand.featureId)
            aufgeklappt = offenNachWechsel(ganttLage().standardOffen, aufgeklappt, wechsel)
          }
    void ladeRoadmap({ behalten: true, nachRoadmap }).then(fokusAufAnpassen)
  } else {
    zustand.phase = deutung.art
    zustand.meldung = deutung
  }
  render()
  fokusAufAnpassen()
}

// ─── Bereinigungsliste (F45 B5b-2b-2) ───────────────────────────────────────

/** Leerer Zustand der Bereinigungsliste (ohne Erfolge — die liegen je Projekt in erfolgeJeProjekt). @returns Zustand */
function leereBereinigung() {
  return { laden: 'laedt', fehlerGrund: null, liste: null, staende: new Map(), oben: null, sendet: null, neuLaden: false }
}

/**
 * Erfolge eines Projekts (legt die Liste beim ersten Mal an).
 * @param projektId - Projekt-ID (Standard: das aktive)
 * @returns Liste, neueste zuerst
 */
function erfolgeVon(projektId = holeAktivesProjekt().id) {
  let liste = erfolgeJeProjekt.get(projektId)
  if (liste === undefined) {
    liste = []
    erfolgeJeProjekt.set(projektId, liste)
  }
  return liste
}

/**
 * Sperre aller Einträge (genau ein Eintrag je Klick): eine Bestätigung läuft, die Liste lädt neu, oder ein Git-Block ist noch offen
 * (Prüfpass qa 2: STATUS.md und roadmap-ausnahmen.json gehören zu jeder Bestätigung — zwei offene landeten in einem Commit).
 * @returns null | 'sendet' | 'laedt' | 'erfolg'
 */
function bereinigungSperre() {
  if (bereinigung.sendet !== null) return 'sendet'
  if (bereinigung.neuLaden) return 'laedt'
  return erfolgeVon().length > 0 ? 'erfolg' : null
}

/** Heutiges Datum (Ortszeit, JJJJ-MM-TT) für den Datumshinweis (qa6; Server und Browser laufen auf demselben Rechner). @returns Text */
function heute() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Abschnitt „Bereinigung (n)“ zwischen Gesamter Roadmap und Entwicklungsstand (Advisor B12).
 * @returns HTML ('' wenn zeigeBereinigung nein sagt)
 */
function bereinigungAbschnitt() {
  const stand = { ...bereinigung, erfolge: erfolgeVon() }
  return zeigeBereinigung(stand) ? bereinigungHtml({ ...stand, sperre: bereinigungSperre(), datum: heute() }) : ''
}

/**
 * Lädt die Bereinigungsliste (mit der Roadmap, nach jeder Bestätigung, über „Erneut laden“). Mit behalten bzw. nach einem Ladefehler
 * bleibt der alte Stand bis zur Antwort stehen, alle Einträge bzw. „Erneut laden“ sind solange gesperrt (Prüfpass cr 4, qa 5). Danach:
 * Zustände verschwundener Einträge verworfen (ihre Meldung wandert nach oben), eine nicht mehr mögliche Wahl zurückgesetzt; ein Stand
 * mit laufendem POST bleibt (Prüfpass cr 2). Scheitert das Laden, wandert die Meldung eines Eintrags ebenfalls nach oben (cr 1: sonst
 * wäre gerade der Zeitlimit- bzw. 500-Text unsichtbar). Überholte Antworten und Antworten für ein anderes Projekt werden verworfen.
 * @param optionen - { behalten, anzeigen (Standard true: sofort mit Sperre neu zeichnen; ladeRoadmap zeichnet selbst) }
 */
async function ladeBereinigung(optionen = {}) {
  const nummer = ++bereinigungAnfrageZaehler
  const projektId = holeAktivesProjekt().id
  const gilt = () => nummer === bereinigungAnfrageZaehler && holeAktivesProjekt().id === projektId
  if ((optionen.behalten === true && bereinigung.liste !== null) || bereinigung.laden === 'fehler') bereinigung.neuLaden = true
  else {
    bereinigung.laden = 'laedt'
    bereinigung.liste = null
  }
  if (optionen.anzeigen !== false) render()
  try {
    const antwort = await holeBereinigung()
    if (!gilt()) return
    bereinigung.liste = deuteBereinigung(antwort)
    bereinigung.laden = 'ok'
    bereinigung.fehlerGrund = null
  } catch (fehler) {
    if (!gilt()) return
    console.error('GET …/roadmap/bereinigung fehlgeschlagen:', fehler)
    bereinigung.laden = 'fehler'
    bereinigung.fehlerGrund = fehler instanceof Error ? fehler.message : String(fehler)
    bereinigung.liste = null
  }
  bereinigung.neuLaden = false
  const eintraege = new Map((bereinigung.liste?.zustand === 'ok' ? bereinigung.liste.eintraege : []).map((e) => [e.eintrag, e]))
  for (const [id, stand] of bereinigung.staende) {
    if (stand.phase === 'sendet') continue
    const eintrag = eintraege.get(id)
    if (eintrag === undefined) {
      if (stand.meldung !== null) bereinigung.oben = { eintrag: id, meldung: stand.meldung }
      if (bereinigung.laden === 'ok') bereinigung.staende.delete(id)
      else stand.meldung = null
    } else if (gewaehlterVorschlag(eintrag, stand) === null) {
      stand.wahl = null
      stand.schritt = 'auswahl'
      stand.haekchen = false
    }
  }
  render()
}

/**
 * Formularzustand eines Eintrags (legt ihn beim ersten Mal an).
 * @param id - Eintrag '<M>/<F>'
 * @returns Zustand
 */
function bereinigungsStand(id) {
  let stand = bereinigung.staende.get(id)
  if (stand === undefined) {
    // Mit dem Eintrag: Standard-Vorauswahl wie in der Anzeige (Advisor B7); ohne ihn keine.
    stand = neuerEintragsStand(bereinigungsEintrag(id))
    bereinigung.staende.set(id, stand)
  }
  return stand
}

/** Aktueller Eintrag der Liste oder undefined. @param id - Eintrag @returns Eintrag */
const bereinigungsEintrag = (id) => (bereinigung.liste?.zustand === 'ok' ? bereinigung.liste.eintraege.find((e) => e.eintrag === id) : undefined)

/**
 * Eingabe in der Bereinigungsliste: Wahl, Begründung, Häkchen in den Zustand; Knöpfe (disabled, aria-disabled, primary — dg 2) und
 * Hinweis direkt schalten (kein Neuschreiben — Advisor B5b-2b-2 O2; input und change feuern bei Radios beide, das Schalten ist
 * idempotent).
 * @param feld - Element mit data-roadmap-bereinigung-feld
 */
function beiBereinigungEingabe(feld) {
  const id = feld.getAttribute('data-roadmap-bereinigung-eintrag-id')
  const eintrag = id === null ? undefined : bereinigungsEintrag(id)
  if (eintrag === undefined) return
  const stand = bereinigungsStand(id)
  if (stand.phase === 'sendet') return
  const art = feld.getAttribute('data-roadmap-bereinigung-feld')
  if (art === 'wahl' && feld.checked === true) stand.wahl = feld.value
  else if (art === 'grund') stand.grund = feld.value
  else if (art === 'haekchen') stand.haekchen = feld.checked === true
  const container = document.getElementById('view-roadmap')
  const gesperrt = bereinigungSperre() !== null
  for (const [aktion, frei] of [
    ['bestaetigen', darfBestaetigen(eintrag, stand, gesperrt)],
    ['schreiben', darfSchreiben(eintrag, stand, gesperrt)],
  ]) {
    const knopf = container?.querySelector(`[data-roadmap-bereinigung-aktion="${aktion}"][data-roadmap-bereinigung-eintrag-id="${CSS.escape(id)}"]`) ?? null
    if (knopf === null) continue
    knopf.disabled = !frei
    knopf.classList.toggle('primary', frei)
    if (frei) knopf.removeAttribute('aria-disabled')
    else knopf.setAttribute('aria-disabled', 'true')
  }
  const hinweis = container?.querySelector(`[data-roadmap-bereinigung-hinweis="${CSS.escape(id)}"]`) ?? null
  if (hinweis !== null) hinweis.textContent = bereinigungHinweis(eintrag, stand, bereinigungSperre())
}

/**
 * Setzt den Fokus auf ein Element der Bereinigung (Schlüssel data-roadmap-bereinigung-fokus, Prüfpass qa 1 — dieselben Schlüssel findet
 * fokusSchluessel beim nächsten Neuschreiben wieder). Ohne Treffer der Reihe nach: Meldung oben (cr 5), neuester Erfolg, Ladefehler,
 * Titel des Abschnitts, Seitentitel (cr 7: nach dem letzten „Schließen“ bei n = 0 gibt es den Abschnitt nicht mehr).
 * @param schluessel - bevorzugter Schlüssel ('<M>/<F>|pruefen', '<M>/<F>|meldung' …) oder null
 */
function fokusAufBereinigung(schluessel) {
  const finde = (s) => document.querySelector(`#view-roadmap [data-roadmap-bereinigung-fokus="${CSS.escape(s)}"]`)
  for (const s of [schluessel, 'oben|meldung', 'erfolg-0|ziel', 'liste|fehler', 'liste|titel']) {
    const ziel = s === null ? null : finde(s)
    if (ziel !== null) {
      ziel.focus()
      return
    }
  }
  document.querySelector('#view-roadmap h1')?.focus()
}

/**
 * Knöpfe der Bereinigungsliste: Bestätigen … (Bestätigungsschritt), Zurück, Jetzt schreiben, Erfolg bzw. Meldung oben schließen,
 * Erneut laden.
 * @param knopf - Element mit data-roadmap-bereinigung-aktion
 */
function beiBereinigungAktion(knopf) {
  const aktion = knopf.getAttribute('data-roadmap-bereinigung-aktion')
  if (aktion === 'laden') {
    void ladeBereinigung().then(() => fokusAufBereinigung(null))
    return
  }
  if (aktion === 'erfolg-schliessen' || aktion === 'oben-schliessen') {
    if (aktion === 'oben-schliessen') bereinigung.oben = null
    else erfolgeVon().splice(Number(knopf.getAttribute('data-roadmap-bereinigung-index')), 1)
    render()
    fokusAufBereinigung(null)
    return
  }
  const id = knopf.getAttribute('data-roadmap-bereinigung-eintrag-id')
  const eintrag = id === null ? undefined : bereinigungsEintrag(id)
  if (eintrag === undefined) return
  const stand = bereinigungsStand(id)
  if (aktion === 'bestaetigen' && darfBestaetigen(eintrag, stand, bereinigungSperre() !== null)) {
    stand.schritt = 'pruefen'
    stand.haekchen = false
    stand.meldung = null
    bereinigung.oben = null
    render()
    fokusAufBereinigung(`${id}|pruefen`)
  } else if (aktion === 'zurueck' && stand.phase !== 'sendet') {
    stand.schritt = 'auswahl'
    stand.haekchen = false
    render()
    fokusAufBereinigung(`${id}|bestaetigen`)
  } else if (aktion === 'schreiben') void schreibeBereinigung(eintrag, stand)
}

/**
 * „Jetzt schreiben“: POST genau dieses einen Eintrags mit den Hashes aus dem GET. Solange er läuft, sind alle Einträge gesperrt.
 * Nach 200 Erfolg oben (beim Projekt des POST, bleibt bis „Schließen“, sperrt bis dahin weitere Bestätigungen), Roadmap und Liste neu
 * (ein Ladeweg, Advisor B9); nach 409/400/422/Fehler Meldung am Eintrag (bzw. oben, wenn er danach weg ist) und Liste neu — der
 * nächste Versuch beginnt wieder mit „Bestätigen …“. Gilt der Zustand nach der Antwort nicht mehr (Projektwechsel, auch A→B→A —
 * Prüfpass cr 2, qa 4), wird nur ein Erfolg beim Projekt des POST abgelegt und geloggt.
 * @param eintrag - Eintrag
 * @param stand - Formularzustand
 */
async function schreibeBereinigung(eintrag, stand) {
  if (!darfSchreiben(eintrag, stand, bereinigungSperre() !== null)) return
  const vorschlag = gewaehlterVorschlag(eintrag, stand)
  const projektId = holeAktivesProjekt().id
  const gilt = () => bereinigung.staende.get(eintrag.eintrag) === stand && holeAktivesProjekt().id === projektId
  stand.phase = 'sendet'
  stand.meldung = null
  bereinigung.sendet = eintrag.eintrag
  bereinigung.oben = null
  render()
  // Der fokussierte Knopf ist jetzt gesperrt neu geschrieben — Fokus auf den Bestätigungsschritt (Prüfpass cr 7).
  fokusAufBereinigung(`${eintrag.eintrag}|pruefen`)
  let deutung
  try {
    const antwort = await bestaetigeBereinigung(baueBestaetigung(eintrag, vorschlag.entscheidung, stand.grund))
    deutung = deuteBestaetigungAntwort(antwort.status, await antwort.json().catch(() => ({})))
  } catch (fehler) {
    console.error(`POST …/roadmap/bereinigung/bestaetigen ${eintrag.eintrag} fehlgeschlagen:`, fehler)
    // Zeitlimit: die Dateien können trotzdem geschrieben sein — der Text sagt es.
    const zeitlimit = fehler instanceof Error && fehler.name === 'TimeoutError'
    deutung = { art: 'fehler', status: 0, grund: zeitlimit ? t('roadmap.bereinigung.zeitlimit', { sekunden: formatiereZahl(SCHREIB_ZEITLIMIT_MS / 1000) }) : t('roadmap.bereinigung.fehlerAnfrage', { meldung: fehler instanceof Error ? fehler.message : String(fehler) }) }
  }
  if (deutung.art === 'ok') erfolgeVon(projektId).unshift({ ...deutung, text: vorschlag.text })
  else console.warn(`[bereinigung] ${eintrag.eintrag} ${vorschlag.entscheidung}: ${deutung.status} ${deutung.grund}`)
  if (!gilt()) {
    if (deutung.art === 'ok') console.info(`[bereinigung] ${eintrag.eintrag} geschrieben (${deutung.geschrieben.join(', ')}), Zustand inzwischen gewechselt — Git-Block beim Projekt ${projektId}, nicht committet`)
    return
  }
  bereinigung.sendet = null
  stand.phase = 'offen'
  if (deutung.art === 'ok') {
    bereinigung.staende.delete(eintrag.eintrag)
    akten.delete(eintrag.feature)
    await ladeRoadmap({ behalten: true })
    fokusAufBereinigung(null)
    return
  }
  stand.meldung = deutung
  stand.schritt = 'auswahl'
  stand.haekchen = false
  await ladeBereinigung({ behalten: true })
  fokusAufBereinigung(`${eintrag.eintrag}|meldung`)
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
  if (ziel.closest('[data-roadmap-erneut-behalten]') !== null) {
    void ladeRoadmap({ behalten: true })
    return
  }
  const kopieren = ziel.closest('[data-befehl-kopieren]')
  if (kopieren !== null) {
    void kopiereBefehlsblock(kopieren)
    return
  }
  const bereinigen = ziel.closest('[data-roadmap-bereinigung-aktion]')
  if (bereinigen !== null && !bereinigen.disabled) {
    beiBereinigungAktion(bereinigen)
    return
  }
  if (ziel.closest('[data-roadmap-entwicklung]') !== null) {
    oeffneKanbanPrioritaet({ pflege: true })
    return
  }
  if (ziel.closest('[data-roadmap-zur-bereinigung]') !== null) {
    // Kein Hash-Link: der Router nutzt den Hash.
    const titel = document.getElementById('rm-bereinigung-titel')
    titel?.scrollIntoView({ block: 'start' })
    titel?.focus({ preventScroll: true })
    return
  }
  const aktion = ziel.closest('[data-roadmap-anpassen-aktion]')
  if (aktion !== null && !aktion.disabled) {
    beiAnpassenAktion(aktion.getAttribute('data-roadmap-anpassen-aktion'))
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
    // Der Formularzustand der bisherigen Zeile bleibt (anpassenStaende) — zurück auf der Zeile stehen Eingaben bzw. Ergebnis da.
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
  const beiEingabe = (ereignis) => {
    const feld = ereignis.target instanceof Element ? ereignis.target.closest('[data-roadmap-bereinigung-feld]') : null
    if (feld !== null) beiBereinigungEingabe(feld)
    else beiAnpassenEingabe(ereignis)
  }
  container?.addEventListener('input', beiEingabe)
  container?.addEventListener('change', beiEingabe)
  // toggle steigt nicht auf — Erfassung in der Capture-Phase.
  container?.addEventListener(
    'toggle',
    (ereignis) => {
      if (!(ereignis.target instanceof Element) || !ereignis.target.hasAttribute('data-roadmap-anpassen-details')) return
      const gewaehlt = gewaehltesAnpassen()
      if (gewaehlt === null) return
      gewaehlt.zustand.offen = ereignis.target.open === true
      // Ein Hauptknopf je Handlung (design-guardian B2): bei offenem „Anpassen“ ist „Fragen“ kein Hauptknopf.
      document.querySelector('#view-roadmap [data-roadmap-jarvis-fragen]')?.classList.toggle('primary', !gewaehlt.zustand.offen)
    },
    true
  )
  registriere(/^#\/roadmap$/, 'roadmap', () => {
    void ladeRoadmap()
  })
  abonniereProjektWechsel(() => {
    anpassenStaende.clear()
    Object.assign(bereinigung, leereBereinigung())
    auswahl = null
    aufgeklappt = null
    abgeschlosseneSichtbar = false
    massstab = 'tage'
    standFilter = 'alle'
    void ladeRoadmap()
  })
}
