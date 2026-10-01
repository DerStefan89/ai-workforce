/**
 * Datei: public/leitstand/views/nutzung.js
 *
 * Zweck: Seite `#/nutzung` nach Vorlage V10 d_nutzung (F44 WS-6b, Abgleich F-725 I1–I3; Route seit
 * WS-2b). Quelle ist GET …/verbrauch (F32 WS-2) mit drei festen Zeiträumen (verbrauch-zeitraum.js):
 * - Kopf „Verständlich eingeordnet“ / „Nutzung“ mit Beschreibung, darunter der Projektname (roh);
 * - Zeitraum als Register „Letzte 7 Tage“ / „Letzte 30 Tage“ / „Gesamter Zeitraum“ (Knöpfe mit
 *   aria-pressed, Standard 30 Tage);
 * - drei Kennzahlen: Ausführungen, Mit Nutzungsdaten („x von y“), Nicht erfasst (bernstein, mit
 *   aufklappbarer Erklärung „Verbrauch unbekannt · nicht null“);
 * - „Was wurde verarbeitet?“: Gelesen · Eingabe (Eingabe + Cache gelesen + Cache geschrieben, davon
 *   aus dem Zwischenspeicher), Erzeugt · Ausgabe, Balken nur relativ zueinander;
 * - `<details>` „Technische Aufschlüsselung nach Rolle und Worker“ (Modell je Zeile, Cache getrennt)
 *   und die eigene Tabelle „Nach Modell“;
 * - Schlusshinweis „Fehlende Modellbeobachtung bleibt ausdrücklich ‚nicht erfasst‘.“
 * Kein Kontingent (Nicht-Ziel F32), keine Kosten in Euro/USD (Entscheidung 30). Die Rechnungen
 * stehen rein in nutzung-daten.js.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js (initNutzungView beim Bootstrap, vor starteRouter())
 *
 * Wichtig:
 * - Laden beim Betreten der Seite, bei einem Projektwechsel (abonniereProjektWechsel, F-860) und
 *   bei jedem Klick auf einen anderen Zeitraum — NIE aus dem Poll (Laufakten ändern sich nur
 *   durch echte Läufe). Ein Klick auf den aktiven Zeitraum ist ein No-Op, außer der letzte Abruf
 *   ist fehlgeschlagen (erneuter Versuch, QA-Pass F32); dasselbe tut „Erneut versuchen“.
 * - Überholschutz über verbrauchAnfrageZaehler: eine späte Antwort (alter Zeitraum, altes
 *   Projekt) überschreibt die neuere nicht.
 * - Projektname und Rollen-, Worker- und Modellnamen sind Projekt- bzw. Serverdaten: escaped, nicht
 *   übersetzt.
 * - Die aufgeklappte Aufschlüsselung und die Erklärung „Nicht erfasst“ bleiben über ein Neurendern
 *   (Zeitraumwechsel) offen bzw. zu, wie der Nutzer sie gestellt hat.
 */

import { holeVerbrauch } from '../api.js'
import { formatiereZahl, t, tHtml } from '../i18n.js'
import { balkenBreiten, kennzahlen, nachModell, nachRolleUndWorker, verarbeitet } from '../nutzung-daten.js'
import { abonniereProjektWechsel, holeAktivesProjekt } from '../projekt-kontext.js'
import { escapeHtml } from '../render.js'
import { registriere } from '../router.js'
import { berechneVerbrauchsVon, VERBRAUCH_ZEITRAEUME } from '../verbrauch-zeitraum.js'

/** Letzte Antwort aus holeVerbrauch, oder null vor dem ersten Abruf. { fehler: true } ist ein reiner Client-Sentinel (Muster views/workboard.js letzteRoadmap) für einen fehlgeschlagenen Abruf, kein Server-Status. */
let verbrauchAntwort = null

/** Aktuell gewählter Zeitraum (F32 WS-2) — Standard 30 Tage. */
let verbrauchZeitraum = '30t'

/** Aufklappzustand, über ein Neurendern erhalten (Dateikopf). */
let aufschluesselungOffen = false
let hilfeOffen = false

/**
 * Formatierte Zahl als HTML.
 * @param wert - Zahl
 * @returns HTML
 */
function zahlHtml(wert) {
  return escapeHtml(formatiereZahl(wert))
}

/**
 * „unbekannt“ für eine null-Rolle bzw. ein null-Modell, mit erklärendem title (F32 Bekannte Grenze
 * „Überladene null-Gruppierung“); sonst der Rohwert escaped.
 * @param wert - Rohwert oder null
 * @param tooltipSchluessel - i18n-Schlüssel des title
 * @returns HTML
 */
function wertOderUnbekannt(wert, tooltipSchluessel) {
  if (wert !== null) return escapeHtml(wert)
  return `<span class="unbekannt" title="${tHtml(tooltipSchluessel)}">${tHtml('nutzung.unbekannt')}</span>`
}

/**
 * Register der drei Zeiträume als Knöpfe mit aria-pressed.
 * @returns HTML
 */
function zeitraumRegister() {
  const knoepfe = VERBRAUCH_ZEITRAEUME.map((p) => {
    const aktiv = p === verbrauchZeitraum
    return `<button type="button" class="${aktiv ? 'active' : ''}" aria-pressed="${aktiv}" data-verbrauch-zeitraum="${p}">${tHtml(`nutzung.zeitraum.${p}`)}</button>`
  }).join('')
  return `<div class="tabs nutzung-zeitraum" role="group" aria-label="${tHtml('nutzung.zeitraum.label')}">${knoepfe}</div>`
}

/**
 * Die drei Kennzahlen (I1).
 * @param zahlen - aus kennzahlen()
 * @returns HTML
 */
function kennzahlenHtml(zahlen) {
  const hilfe = `<button type="button" class="nutzung-hilfe-knopf" data-aktion="hilfe" aria-expanded="${hilfeOffen}" aria-controls="nutzung-hilfe-text" aria-label="${tHtml('nutzung.nichtErfasst.hilfe')}" title="${tHtml('nutzung.nichtErfasst.hilfe')}">?</button>`
  return `<div class="nutzung-kennzahlen">
      <div class="nutzung-kennzahl">
        <div class="eyebrow">${tHtml('nutzung.ausfuehrungen')}</div>
        <span class="nutzung-wert">${zahlHtml(zahlen.ausfuehrungen)}</span>
        <p>${tHtml('nutzung.ausfuehrungen.text')}</p>
      </div>
      <div class="nutzung-kennzahl">
        <div class="eyebrow">${tHtml('nutzung.mitDaten')}</div>
        <span class="nutzung-wert">${zahlHtml(zahlen.mitNutzungsdaten)} <small>${tHtml('nutzung.vonGesamt', { gesamt: formatiereZahl(zahlen.ausfuehrungen) })}</small></span>
        <p>${tHtml('nutzung.mitDaten.text')}</p>
      </div>
      <div class="nutzung-kennzahl">
        <div class="eyebrow nutzung-kennzahl-kopf">${tHtml('nutzung.nichtErfasst')} ${hilfe}</div>
        <span class="nutzung-wert nicht-erfasst">${zahlHtml(zahlen.nichtErfasst)}</span>
        <p>${tHtml('nutzung.nichtErfasst.text')}</p>
        <p id="nutzung-hilfe-text" class="nutzung-hilfe-text"${hilfeOffen ? '' : ' hidden'}>${tHtml('nutzung.nichtErfasst.erklaerung', { anzahl: zahlen.nichtErfasst, zahl: formatiereZahl(zahlen.nichtErfasst) })}</p>
      </div>
    </div>`
}

/**
 * Eine Fläche „Gelesen“ bzw. „Erzeugt“ mit Balken.
 * @param eyebrowSchluessel - i18n-Schlüssel der Überschrift
 * @param wert - Zahl, oder null ohne Messwerte („—“, nicht erfasst)
 * @param textHtml - Erklärung (fertiges HTML)
 * @param breite - Balkenbreite in Prozent
 * @returns HTML
 */
function verarbeitetFlaeche(eyebrowSchluessel, wert, textHtml, breite) {
  return `<div class="nutzung-flaeche">
      <div class="eyebrow">${tHtml(eyebrowSchluessel)}</div>
      <span class="nutzung-gross">${wert === null ? nichtErfasstHtml() : zahlHtml(wert)}</span>
      ${textHtml}
      <div class="nutzung-balken" aria-hidden="true"><span style="width: ${breite}%"></span></div>
    </div>`
}

/**
 * „Was wurde verarbeitet?“ (I2).
 * @param summe - aus verarbeitet()
 * @param hatMesswerte - false, wenn keine Ausführung Nutzungsdaten hat (dann „—“ statt 0)
 * @returns HTML
 */
function verarbeitetHtml(summe, hatMesswerte) {
  const [gelesenBreite, erzeugtBreite] = balkenBreiten(summe.gelesen, summe.erzeugt)
  // Ohne eine einzige Ausführung mit Nutzungsdaten wäre „0“ falsch — der Verbrauch ist unbekannt, nicht null (Korrekturrunde WS-6b, qa 4).
  const davon = hatMesswerte ? `<p class="nutzung-davon">${tHtml('nutzung.gelesen.davon', { zahl: formatiereZahl(summe.ausZwischenspeicher) })}</p>` : ''
  const gelesenText = `<p>${tHtml('nutzung.gelesen.text')}</p>${davon}`
  return `<div class="section-label"><h2>${tHtml('nutzung.verarbeitet')}</h2><span class="nutzung-chip">${tHtml('nutzung.nurErfasst')}</span></div>
    <div class="nutzung-flaechen">
      ${verarbeitetFlaeche('nutzung.gelesen', hatMesswerte ? summe.gelesen : null, gelesenText, gelesenBreite)}
      ${verarbeitetFlaeche('nutzung.erzeugt', hatMesswerte ? summe.erzeugt : null, `<p>${tHtml('nutzung.erzeugt.text')}</p>`, erzeugtBreite)}
    </div>
    <p class="nutzung-scope">${tHtml('nutzung.tokensHinweis')}</p>`
}

/**
 * „—“ mit lesbarem „nicht erfasst“ für einen Tokenwert ohne Messung.
 * @returns HTML
 */
function nichtErfasstHtml() {
  return `<span aria-hidden="true">—</span><span class="sr-only">${tHtml('nutzung.nichtErfasst')}</span>`
}

/**
 * Die sechs Zahlenzellen einer Aufschlüsselungszeile. Hat keine Ausführung der Zeile Nutzungsdaten,
 * stehen die vier Tokenwerte als „—“ (nicht erfasst) statt 0.
 * @param z - Zeile aus nachRolleUndWorker() bzw. nachModell()
 * @returns HTML
 */
function zahlenZellen(z) {
  const ohneMessung = z.anzahlLaeufe > 0 && z.ohneBeobachtung >= z.anzahlLaeufe
  const tokens = [z.eingabe, z.ausgabe, z.cacheGelesen, z.cacheGeschrieben].map((w) => (ohneMessung ? nichtErfasstHtml() : zahlHtml(w)))
  return [zahlHtml(z.anzahlLaeufe), zahlHtml(z.ohneBeobachtung), ...tokens].map((zelle) => `<td>${zelle}</td>`).join('')
}

/**
 * Kopfzeile einer Aufschlüsselungstabelle.
 * @param ersteSpalteSchluessel - i18n-Schlüssel der ersten Spalte
 * @returns HTML
 */
function tabellenKopf(ersteSpalteSchluessel) {
  const spalten = ['nutzung.spalte.laeufe', 'nutzung.spalte.ohneBeobachtung', 'nutzung.spalte.eingabe', 'nutzung.spalte.ausgabe', 'nutzung.spalte.cacheGelesen', 'nutzung.spalte.cacheGeschrieben']
  return `<thead><tr><th scope="col">${tHtml(ersteSpalteSchluessel)}</th>${spalten.map((s) => `<th scope="col">${tHtml(s)}</th>`).join('')}</tr></thead>`
}

/**
 * Technische Aufschlüsselung (I3): nach Rolle und Worker (Modell je Zeile) und nach Modell.
 * @param gruppen - antwort.gruppen
 * @returns HTML
 */
function aufschluesselungHtml(gruppen) {
  const rollen = nachRolleUndWorker(gruppen)
  const modelle = nachModell(gruppen)
  let inhalt
  if (rollen.length === 0) {
    inhalt = `<p class="leer">${tHtml('nutzung.leer')}</p>`
  } else {
    const rollenZeilen = rollen
      .map((z) => {
        const modellListe = z.modelle.map((m) => wertOderUnbekannt(m, 'nutzung.unbekannt.modell')).join(', ')
        return `<tr><th scope="row">${wertOderUnbekannt(z.rolle, 'nutzung.unbekannt.rolle')} · ${wertOderUnbekannt(z.worker, 'nutzung.unbekannt.worker')}<br><span class="subtle">${tHtml('nutzung.modellZeile', {}, { modelle: modellListe })}</span></th>${zahlenZellen(z)}</tr>`
      })
      .join('')
    const modellZeilen = modelle.map((z) => `<tr><th scope="row">${wertOderUnbekannt(z.modell, 'nutzung.unbekannt.modell')}</th>${zahlenZellen(z)}</tr>`).join('')
    inhalt = `<div class="nutzung-tabelle"><table>${tabellenKopf('nutzung.spalte.rolleWorker')}<tbody>${rollenZeilen}</tbody></table></div>
      <h3>${tHtml('nutzung.nachModell')}</h3>
      <div class="nutzung-tabelle"><table>${tabellenKopf('nutzung.spalte.modell')}<tbody>${modellZeilen}</tbody></table></div>
      <p class="subtle">${tHtml('nutzung.cacheHinweis')}</p>`
  }
  return `<details class="nutzung-aufschluesselung" id="nutzung-aufschluesselung"${aufschluesselungOffen ? ' open' : ''}>
      <summary>${tHtml('nutzung.aufschluesselung')}</summary>
      ${inhalt}
    </details>`
}

/**
 * Inhalt unter dem Register: Ladezustand, Fehler mit „Erneut versuchen“ oder die Auswertung.
 * @returns HTML
 */
function inhaltHtml() {
  if (verbrauchAntwort === null) return `<p class="leer">${tHtml('nutzung.laedt')}</p>`
  // F-603: ladeVerbrauch normalisiert jede Fehlerform auf den Sentinel { fehler: true }.
  if (verbrauchAntwort.fehler === true) {
    return `<div class="note red nutzung-fehler" id="nutzung-fehler" tabindex="-1"><p>${tHtml('nutzung.fehler')}</p><button type="button" class="button" data-aktion="erneut">${tHtml('nutzung.erneut')}</button></div>`
  }
  const zahlen = kennzahlen(verbrauchAntwort)
  // Leerzustand auch bei zugeklappter Aufschlüsselung sichtbar (Korrekturrunde WS-6b, qa 3).
  const leer = zahlen.ausfuehrungen === 0 ? `<p class="leer nutzung-leer">${tHtml('nutzung.leer')}</p>` : ''
  return `${leer}${kennzahlenHtml(zahlen)}
    ${verarbeitetHtml(verarbeitet(verbrauchAntwort.gruppen), zahlen.mitNutzungsdaten > 0)}
    ${aufschluesselungHtml(verbrauchAntwort.gruppen)}`
}

/** Rendert die Seite in #view-nutzung; ein fehlender Container wird gemeldet, nicht geworfen. */
function render() {
  const container = document.getElementById('view-nutzung')
  if (container === null) {
    console.error('nutzung: Container view-nutzung fehlt')
    return
  }
  container.innerHTML = `<div class="page-heading">
      <div>
        <div class="eyebrow">${tHtml('nutzung.eyebrow')}</div>
        <h1>${tHtml('nutzung.titel')}</h1>
        <p class="description">${tHtml('nutzung.beschreibung')}</p>
        <p class="nutzung-projekt">${tHtml('nutzung.projekt', { projekt: holeAktivesProjekt().name })}</p>
      </div>
    </div>
    ${zeitraumRegister()}
    <div class="nutzung-inhalt">${inhaltHtml()}</div>
    <div class="note nutzung-schluss">${tHtml('nutzung.schluss')}</div>`
}

/** Überholschutz (Muster views/workboard.js roadmapAnfrageZaehler) — ein schneller zweiter Zeitraum- oder Projektwechsel, während der erste Abruf noch unterwegs ist, darf dessen später eintreffende, aber veraltete Antwort nicht mehr übernehmen. */
let verbrauchAnfrageZaehler = 0

/** Lädt GET …/verbrauch für den aktuell gewählten Zeitraum — beim Betreten, bei Projekt- und Zeitraumwechsel, NIE aus dem Poll (siehe Dateikopf). F-603-Fix: ein server-seitiges Fachergebnis `{ status: 'fehler', grund }` wird hier auf denselben Client-Sentinel `{ fehler: true }` normalisiert wie ein echter Netzwerk-/HTTP-Fehler — Anzeige und Wiederholen kennen dadurch nur EINE Fehlerform. */
async function ladeVerbrauch() {
  const meineAnfrageNummer = ++verbrauchAnfrageZaehler
  try {
    const antwort = await holeVerbrauch(berechneVerbrauchsVon(verbrauchZeitraum, new Date()))
    if (meineAnfrageNummer !== verbrauchAnfrageZaehler) return
    if (antwort?.status === 'fehler') {
      console.error('GET /api/verbrauch lieferte ein Fehler-Fachergebnis:', antwort.grund)
      verbrauchAntwort = { fehler: true }
    } else if (!Array.isArray(antwort?.gruppen)) {
      // Auch ein Körper ohne gruppen-Array (oder null) ist dieselbe Fehlerform — sonst bliebe die Seite
      // auf „Lädt…“ bzw. der Klick auf den aktiven Zeitraum gesperrt (Korrekturrunde WS-6b).
      console.error('GET /api/verbrauch lieferte keinen gruppen-Array:', antwort)
      verbrauchAntwort = { fehler: true }
    } else {
      verbrauchAntwort = antwort
    }
  } catch (fehler) {
    if (meineAnfrageNummer !== verbrauchAnfrageZaehler) return
    console.error('GET /api/verbrauch fehlgeschlagen:', fehler)
    verbrauchAntwort = { fehler: true }
  }
  render()
  stelleFokusWiederHer()
}

/**
 * Selektor des Elements, das nach dem Neurendern den Fokus bekommt, oder null (Eintritt, Projektwechsel:
 * kein Fokusraub). Gesetzt nur bei einer Bedienung auf der Seite — render() ersetzt den ganzen Inhalt
 * samt Knopf, der Fokus fiele sonst auf body (Korrekturrunde WS-6b).
 */
let fokusNachRender = null

/**
 * Setzt den Fokus nach dem Rendern: im Fehlerzustand auf die Fehlernotiz (keine eigene Live-Region),
 * sonst auf den gemerkten Knopf.
 */
function stelleFokusWiederHer() {
  if (fokusNachRender === null) return
  const fehlerNotiz = verbrauchAntwort?.fehler === true ? document.getElementById('nutzung-fehler') : null
  const ziel = fehlerNotiz ?? document.getElementById('view-nutzung')?.querySelector(fokusNachRender)
  ziel?.focus()
  // Nach der endgültigen Antwort ist der Fokus gesetzt; ein späteres Neurendern ohne Bedienung raubt ihn nicht.
  if (verbrauchAntwort !== null) fokusNachRender = null
}

/**
 * Verwirft die angezeigte Antwort, zeigt „Lädt…“ und lädt neu.
 * @param fokusSelektor - Selektor für den Fokus nach dem Rendern (Bedienung), sonst null
 */
function ladeNeu(fokusSelektor = null) {
  fokusNachRender = fokusSelektor
  verbrauchAntwort = null
  render()
  stelleFokusWiederHer()
  void ladeVerbrauch()
}

/**
 * Klick-Delegation (die Knöpfe entstehen bei jedem render() neu, ein Listener auf dem Container
 * bleibt gültig): Zeitraum (No-Op auf dem aktiven, außer nach einem Fehler), „Erneut versuchen“
 * (lädt den aktiven Zeitraum neu), Erklärung „Nicht erfasst“ auf/zu. Dazu merkt ein toggle-Listener
 * den Zustand der Aufschlüsselung.
 */
function initVerbrauchBedienung() {
  const container = document.getElementById('view-nutzung')
  container?.addEventListener('click', (ereignis) => {
    const ziel = ereignis.target
    if (!(ziel instanceof Element)) return
    const knopf = ziel.closest('[data-verbrauch-zeitraum]')
    if (knopf !== null) {
      const periode = knopf.dataset.verbrauchZeitraum
      if (periode === verbrauchZeitraum && verbrauchAntwort?.fehler !== true) return
      verbrauchZeitraum = periode
      ladeNeu(`[data-verbrauch-zeitraum="${periode}"]`)
      return
    }
    if (ziel.closest('[data-aktion="erneut"]') !== null) {
      ladeNeu(`[data-verbrauch-zeitraum="${verbrauchZeitraum}"]`)
      return
    }
    const hilfe = ziel.closest('[data-aktion="hilfe"]')
    if (hilfe !== null) {
      hilfeOffen = !hilfeOffen
      hilfe.setAttribute('aria-expanded', String(hilfeOffen))
      const text = document.getElementById('nutzung-hilfe-text')
      if (text !== null) text.hidden = !hilfeOffen
    }
  })
  // toggle sprudelt nicht — in der Einfangphase am Container mithören.
  container?.addEventListener(
    'toggle',
    (ereignis) => {
      if (ereignis.target instanceof Element && ereignis.target.id === 'nutzung-aufschluesselung') aufschluesselungOffen = ereignis.target.open
    },
    true
  )
}

/** Registriert #/nutzung, die Bedienung und den Neuladen bei Projektwechsel. Einmalig beim Bootstrap. */
export function initNutzungView() {
  initVerbrauchBedienung()
  registriere(/^#\/nutzung$/, 'nutzung', ladeNeu)
  abonniereProjektWechsel(ladeNeu)
}
