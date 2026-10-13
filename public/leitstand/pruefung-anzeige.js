/**
 * Datei: public/leitstand/pruefung-anzeige.js
 *
 * Zweck: Reine Anzeigeregeln der Eignungsprüfung (F45 F-2b-2a, F-1056): Ablauf „Auswählen → Prüfung → Bericht“ im Detail
 * eines Sammlungseintrags und der Prüfbericht-Block im Freigabedialog („Freigeben & installieren“). Ohne Netz und ohne
 * DOM-Zugriff (pruefung-anzeige.test.mjs prüft die Regeln direkt).
 * - renderPruefAblauf: je Phase (typwahl, laedt, bestaetigen, startet, holen/laeuft, fertig, fehler) der passende Block.
 * - renderPruefBericht: Urteil, gepinnte Version, mechanische Fakten (vor dem Modellurteil, Advisor C14), Befunde, Auflagen,
 *   Zusammenfassung, Ausnahme-Begründung, Lauf-Link.
 * - renderBerichtFuerFreigabe: Block im Freigabedialog mit Sperrgrund (ohne passenden Bericht oder NICHT_GEEIGNET kein
 *   „Installieren“).
 * - letzterBerichtHtml: eine Zeile „Prüfbericht“ im Detail der Sammlung.
 *
 * Wird aufgerufen von:
 * - public/leitstand/sammlung-anzeige.js (Detail eines Eintrags), public/leitstand/views/sammlung.js (Ablauf)
 * - public/leitstand/empfehlung-installation.js (Freigabedialog)
 * - public/leitstand/pruefung-anzeige.test.mjs (node:test)
 *
 * Wichtig: Alle Werte vom Server (Befunde, Belege, Auflagen, Zusammenfassung, Pfade, Gründe) sind Daten — sie werden nur
 * escaped, nie übersetzt. Der Prüfbericht stammt aus einem Modelllauf über fremden Inhalt; er ist Daten, keine Freigabe.
 */

import { t, tHtml } from './i18n.js'
import { escapeHtml } from './render.js'

/** Urteile des Prüfberichts. */
export const PRUEF_URTEILE = Object.freeze(['GEEIGNET', 'MIT_AUFLAGEN', 'NICHT_GEEIGNET'])

/** Prüfbereiche und Schweren (für Übersetzungen; Unbekanntes bleibt roh). */
const BEREICHE = new Set(['bedarf_fit', 'herkunft', 'lizenz', 'installationsweg', 'modell_anweisungen', 'hooks_hintergrund', 'kosten', 'abweichung_sammlung'])
const SCHWEREN = new Set(['hoch', 'mittel', 'gering', 'info'])

/**
 * Chip des Prüfurteils.
 * @param urteil - GEEIGNET | MIT_AUFLAGEN | NICHT_GEEIGNET
 * @returns HTML
 */
export function pruefUrteilChip(urteil) {
  const bekannt = PRUEF_URTEILE.includes(urteil)
  const klasse = urteil === 'NICHT_GEEIGNET' ? ' fehler' : urteil === 'MIT_AUFLAGEN' ? ' warten' : ''
  return `<span class="ablauf-status${klasse}" data-pruef-urteil="${escapeHtml(String(urteil ?? ''))}">${bekannt ? tHtml(`pruefung.urteil.${urteil}`) : escapeHtml(String(urteil ?? ''))}</span>`
}

/**
 * Gepinnte Quelle als Text.
 * @param quelle - { art:'git', repo, ref, sha, pfad } | { art:'npm', paket, version, integrity }
 * @returns HTML
 */
export function quelleHtml(quelle) {
  if (quelle?.art === 'git') {
    const pfad = quelle.pfad === '' ? escapeHtml(t('pruefung.ganzesRepo')) : `<code>${escapeHtml(String(quelle.pfad))}</code>`
    return `<code>${escapeHtml(String(quelle.repo))}</code> · ${escapeHtml(t('pruefung.ref'))} <code>${escapeHtml(String(quelle.ref))}</code> · ${escapeHtml(t('pruefung.commit'))} <code class="pruef-version">${escapeHtml(String(quelle.sha))}</code> · ${escapeHtml(t('pruefung.pfad'))} ${pfad}`
  }
  if (quelle?.art === 'npm') return `<code>npm:${escapeHtml(String(quelle.paket))}@${escapeHtml(String(quelle.version))}</code> · <code class="pruef-version">${escapeHtml(String(quelle.integrity))}</code>`
  return `<span class="subtle">—</span>`
}

/**
 * Mechanische Fakten (vom Server gezählt, nicht vom Modell) — stehen vor dem Urteil (C14).
 * @param fakten - InhaltFakten
 * @returns HTML
 */
export function faktenHtml(fakten) {
  if (fakten === null || typeof fakten !== 'object') return ''
  const zeilen = []
  const lz = fakten.paket?.lebenszyklus ?? {}
  const lzNamen = Object.keys(lz)
  zeilen.push(`<li${lzNamen.length > 0 ? ' class="pruef-fakt-warnung"' : ''}><strong>${tHtml('pruefung.fakten.lebenszyklus')}</strong> ${lzNamen.length === 0 ? tHtml('pruefung.fakten.keine') : lzNamen.map((n) => `<code>${escapeHtml(n)}: ${escapeHtml(String(lz[n]))}</code>`).join(', ')}</li>`)
  const bin = fakten.paket?.bin ?? []
  if (bin.length > 0) zeilen.push(`<li><strong>${tHtml('pruefung.fakten.bin')}</strong> ${bin.map((b) => `<code>${escapeHtml(String(b))}</code>`).join(', ')}</li>`)
  const hooks = Array.isArray(fakten.hooks) ? fakten.hooks : []
  zeilen.push(`<li${hooks.length > 0 ? ' class="pruef-fakt-warnung"' : ''}><strong>${tHtml('pruefung.fakten.hooks')}</strong> ${hooks.length === 0 ? tHtml('pruefung.fakten.keine') : hooks.map((h) => `<code>${escapeHtml(String(h))}</code>`).join(', ')}</li>`)
  const umbenannt = Array.isArray(fakten.umbenannt) ? fakten.umbenannt : []
  if (umbenannt.length > 0) zeilen.push(`<li><strong>${tHtml('pruefung.fakten.umbenannt')}</strong> ${umbenannt.map((u) => `<code>${escapeHtml(String(u.von))}</code>`).join(', ')}</li>`)
  const je = fakten.uebersprungen?.je_grund ?? {}
  const uebersprungen = Object.entries(je)
  if (uebersprungen.length > 0) zeilen.push(`<li><strong>${tHtml('pruefung.fakten.uebersprungen')}</strong> ${uebersprungen.map(([g, n]) => `${escapeHtml(g)} ${escapeHtml(String(n))}`).join(', ')}</li>`)
  zeilen.push(`<li><strong>${tHtml('pruefung.fakten.umfang')}</strong> ${tHtml('pruefung.fakten.dateien', { anzahl: Number(fakten.dateien ?? 0) })}, ${escapeHtml(String(Math.round(Number(fakten.bytes ?? 0) / 1024)))} KB</li>`)
  return `<div class="pruef-fakten"><p class="pruef-fakten-titel"><strong>${tHtml('pruefung.fakten.titel')}</strong> <span class="subtle">${tHtml('pruefung.fakten.erklaerung')}</span></p><ul>${zeilen.join('')}</ul></div>`
}

/**
 * Verweis auf den Prüflauf: Link nur, wenn die Workforce aktiv ist (Prüfläufe laufen immer dort, QA 1), sonst Hinweis.
 * @param laufId - laufId
 * @param laufLink - Workforce aktiv
 * @returns HTML
 */
function laufVerweis(laufId, laufLink) {
  return laufLink ? `<a href="#/runs/${encodeURIComponent(laufId)}">${tHtml('pruefung.zumLauf')}</a>` : `<span class="subtle">${tHtml('pruefung.laufInWorkforce')}</span>`
}

/**
 * Der Prüfbericht.
 * @param b - Payload (oder Zustand.bericht) mit ergebnis, quelle, fakten, ausnahme_begruendung, lauf_id, erstellt_am
 * @param laufLink - false, wenn nicht die Workforce aktiv ist (der Lauf liegt in der Workforce, QA 1)
 * @returns HTML
 */
export function renderPruefBericht(b, laufLink = true) {
  const e = b?.ergebnis ?? {}
  const RANG = { hoch: 0, mittel: 1, gering: 2, info: 3 }
  const befunde = (Array.isArray(e.befunde) ? [...e.befunde] : []).sort((x, y) => (RANG[x.schwere] ?? 4) - (RANG[y.schwere] ?? 4))
  const auflagen = Array.isArray(e.auflagen) ? e.auflagen : []
  /** Tabellenzeilen einer Befundliste. @param liste - Befunde @returns HTML */
  const zeilenHtml = (liste) => liste
    .map((f) => {
      const bereich = BEREICHE.has(f.bereich) ? t(`pruefung.bereich.${f.bereich}`) : String(f.bereich ?? '')
      const schwere = SCHWEREN.has(f.schwere) ? t(`pruefung.schwere.${f.schwere}`) : String(f.schwere ?? '')
      return `<tr><td data-spalte="${escapeHtml(t('pruefung.spalte.bereich'))}">${escapeHtml(bereich)}</td><td data-spalte="${escapeHtml(t('pruefung.spalte.schwere'))}"><span class="pruef-schwere pruef-schwere-${escapeHtml(String(f.schwere ?? ''))}">${escapeHtml(schwere)}</span></td><td data-spalte="${escapeHtml(t('pruefung.spalte.beleg'))}" class="pruef-beleg">${escapeHtml(String(f.beleg ?? ''))}</td></tr>`
    })
    .join('')
  const tabelle = (liste) => `<table class="pruef-befunde"><caption class="sr-only">${tHtml('pruefung.befunde')}</caption><thead><tr><th scope="col">${tHtml('pruefung.spalte.bereich')}</th><th scope="col">${tHtml('pruefung.spalte.schwere')}</th><th scope="col">${tHtml('pruefung.spalte.beleg')}</th></tr></thead><tbody>${zeilenHtml(liste)}</tbody></table>`
  const wichtig = befunde.filter((f) => f.schwere === 'hoch' || f.schwere === 'mittel')
  const rest = befunde.filter((f) => !(f.schwere === 'hoch' || f.schwere === 'mittel'))
  const zaehlung = ['hoch', 'mittel', 'gering', 'info']
    .map((s) => [s, befunde.filter((f) => f.schwere === s).length])
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `${n} × ${escapeHtml(t(`pruefung.schwere.${s}`))}`)
    .join(', ')
  const befundTabelle =
    befunde.length === 0
      ? `<p class="subtle">${tHtml('pruefung.keineBefunde')}</p>`
      : `<p class="subtle pruef-zaehlung">${zaehlung}</p>${wichtig.length > 0 ? tabelle(wichtig) : ''}${rest.length > 0 ? `<details class="pruef-weitere"><summary>${tHtml('pruefung.weitereBefunde', { anzahl: rest.length })}</summary>${tabelle(rest)}</details>` : ''}`
  const ausnahme = typeof b?.ausnahme_begruendung === 'string' && b.ausnahme_begruendung !== '' ? `<p class="note amber"><strong>${tHtml('pruefung.ausnahme')}</strong> ${escapeHtml(b.ausnahme_begruendung)}</p>` : ''
  const lauf = typeof b?.lauf_id === 'string' && b.lauf_id !== '' ? laufVerweis(b.lauf_id, laufLink) : ''
  return `<section class="pruef-bericht" data-pruef-bericht="${escapeHtml(String(e.urteil ?? ''))}">
    <p class="pruef-kopf"><strong>${tHtml('pruefung.bericht')}</strong> ${pruefUrteilChip(e.urteil)} <span class="subtle">${tHtml('pruefung.version', { version: String(e.gepinnte_version ?? '') })}</span></p>
    <p class="subtle pruef-quelle">${quelleHtml(b?.quelle)}</p>
    ${faktenHtml(b?.fakten)}
    <p class="pruef-zusammenfassung">${escapeHtml(String(e.zusammenfassung ?? ''))}</p>
    ${auflagen.length > 0 ? `<div class="pruef-auflagen"><strong>${tHtml('pruefung.auflagen')}</strong><ul>${auflagen.map((a) => `<li>${escapeHtml(String(a))}</li>`).join('')}</ul></div>` : ''}
    <h4 class="pruef-befunde-titel">${tHtml('pruefung.befunde')}</h4>
    ${befundTabelle}
    ${ausnahme}
    <p class="subtle pruef-fuss">${tHtml('pruefung.keineFreigabe')} ${lauf}</p>
  </section>`
}

/**
 * Kurzzeile des letzten Berichts im Detail der Sammlung.
 * @param letzter - pruefbericht_letzter (berichtKurz) oder null
 * @returns HTML oder ''
 */
export function letzterBerichtHtml(letzter) {
  if (letzter === null || typeof letzter !== 'object') return ''
  return `${pruefUrteilChip(letzter.urteil)} <span class="subtle">${tHtml('pruefung.version', { version: String(letzter.gepinnte_version ?? '') })} · ${escapeHtml(String(letzter.erstellt_am ?? '').slice(0, 10))}</span>`
}

/**
 * Ablauf im Detail eines Sammlungseintrags je Phase.
 * @param e - Sammlungseintrag
 * @param ablauf - { phase, vorbereitung, zustand, meldung, typ } oder undefined
 * @param bedeutung - urteil_bedeutung der Antwort
 * @param praefix - Präfix der DOM-ids (Standard 'sm')
 * @returns HTML
 */
export function renderPruefAblauf(e, ablauf, bedeutung = {}, praefix = 'sm') {
  const id = escapeHtml(String(e?.id ?? ''))
  /** DOM-id je Feld mit Präfix (F45 F-2b-2c: Sammlung 'sm', Capability Library 'lib' auf derselben Seite). @param name - Feld @returns id */
  const dom = (name) => `${escapeHtml(praefix)}-${name}-${id}`
  const laufLink = ablauf?.laufLink !== false
  const abbrechen = `<button type="button" class="button" data-sm-pruefung-zurueck="${id}"${ablauf?.phase === 'startet' ? ' disabled' : ''}>${tHtml('pruefung.zurueck')}</button>`
  if (ablauf === undefined || ablauf === null) return ''
  if (ablauf.phase === 'typwahl')
    return `<div class="pruef-ablauf" data-pruef-phase="typwahl"><label for="${dom('typ')}">${tHtml('pruefung.typWaehlen')}</label> <select id="${dom('typ')}" data-sm-typ="${id}">${e?.pruefbare_quelle?.art === 'npm' ? '' : `<option value="skill">${tHtml('sammlung.typ.skill')}</option>`}${e?.pruefbare_quelle?.art === 'git' ? '' : `<option value="mcp">${tHtml('sammlung.typ.mcp')}</option>`}</select> <button type="button" class="button primary" data-sm-typ-weiter="${id}">${tHtml('pruefung.weiter')}</button> ${abbrechen}</div>`
  if (ablauf.phase === 'laedt') return `<p class="hinweis pruef-ablauf" data-pruef-phase="laedt" tabindex="-1" data-pruef-fokus>${tHtml('pruefung.pinnt')}</p>`
  if (ablauf.phase === 'fehler') return `<div class="pruef-ablauf" data-pruef-phase="fehler"><p class="fehler" tabindex="-1" data-pruef-fokus>${escapeHtml(String(ablauf.meldung ?? ''))}</p>${ablauf.zustand?.lauf_id ? `<p class="subtle">${laufVerweis(ablauf.zustand.lauf_id, laufLink)}</p>` : ''}${abbrechen}</div>`
  if (ablauf.phase === 'bestaetigen' || ablauf.phase === 'startet') {
    const v = ablauf.vorbereitung ?? {}
    const urteil = typeof v.urteil_sammlung === 'string' ? `<li><strong>${tHtml('pruefung.urteilSammlung')}</strong> ${escapeHtml(v.urteil_sammlung)}${typeof (v.urteil_bedeutung ?? bedeutung?.[v.urteil_sammlung]) === 'string' ? ` — ${escapeHtml(v.urteil_bedeutung ?? bedeutung[v.urteil_sammlung])}` : ''}</li>` : ''
    const letzter = v.letzter_bericht ? `<li><strong>${tHtml('pruefung.letzterBericht')}</strong> ${letzterBerichtHtml(v.letzter_bericht)} ${v.letzter_bericht.aktuell === true ? `<span class="subtle">${tHtml('pruefung.letzterAktuell')}</span>` : `<span class="subtle">${tHtml('pruefung.letzterVeraltet')}</span>`}</li>` : ''
    const ausnahme =
      v.ausgeschlossen === true
        ? `<div class="pruef-ausnahme"><label for="${dom('ausnahme')}"><strong>${tHtml('pruefung.ausnahmeLabel')}</strong></label><textarea id="${dom('ausnahme')}" data-sm-ausnahme="${id}" rows="3" minlength="20" maxlength="2000" aria-describedby="${dom('ausnahme-hilfe')}${ablauf.meldung ? ` ${dom('meldung')}` : ''}"${ablauf.meldung ? ' aria-invalid="true"' : ''}>${escapeHtml(String(ablauf.ausnahme ?? ''))}</textarea><p class="subtle" id="${dom('ausnahme-hilfe')}">${tHtml('pruefung.ausnahmeHilfe')}</p></div>`
        : ''
    const startet = ablauf.phase === 'startet'
    // Nur git: einen Ordner im Repo prüfen statt des ganzen Repos (Monorepos mit vielen Kopien eines Skills).
    const pfadFeld =
      v.quelle?.art === 'git'
        ? `<div class="pruef-pfad"><label for="${dom('pfad')}">${tHtml('pruefung.pfadLabel')}</label> <input type="text" id="${dom('pfad')}" data-sm-pfad="${id}" value="${escapeHtml(String(ablauf.pfadEingabe ?? v.quelle.pfad ?? ''))}" autocomplete="off" spellcheck="false" aria-describedby="${dom('pfad-hilfe')}" /> <button type="button" class="button" data-sm-pfad-uebernehmen="${id}"${startet ? ' disabled' : ''}>${tHtml('pruefung.pfadUebernehmen')}</button><p class="subtle" id="${dom('pfad-hilfe')}">${tHtml('pruefung.pfadHilfe')}</p></div>`
        : ''
    return `<div class="pruef-ablauf pruef-bestaetigung" data-pruef-phase="${ablauf.phase}">
      <p class="pruef-frage"${ablauf.meldung ? '' : ' tabindex="-1" data-pruef-fokus'}><strong>${tHtml('pruefung.frage', { name: String(v.subjekt?.name ?? e?.name ?? '') })}</strong></p>
      <ul>
        <li><strong>${tHtml('sammlung.typ.titel')}:</strong> ${escapeHtml(t(`sammlung.typ.${['skill', 'mcp', 'agent'].includes(v.typ) ? v.typ : 'unbestimmt'}`))}</li>
        <li><strong>${tHtml('pruefung.quelle')}</strong> ${quelleHtml(v.quelle)}</li>
        ${urteil}${letzter}
      </ul>
      ${pfadFeld}
      ${ausnahme}
      ${ablauf.meldung ? `<p class="fehler" id="${dom('meldung')}" tabindex="-1" data-pruef-fokus>${escapeHtml(String(ablauf.meldung))}</p>` : ''}
      <p class="hinweis">${tHtml('pruefung.kostenHinweis')}</p>
      <button type="button" class="button primary" data-sm-pruefung-start="${id}"${startet ? ' disabled' : ''}>${tHtml(startet ? 'pruefung.startet' : 'pruefung.starten')}</button> ${abbrechen}
    </div>`
  }
  if (ablauf.phase === 'holen' || ablauf.phase === 'laeuft') {
    const z = ablauf.zustand ?? {}
    return `<div class="pruef-ablauf" data-pruef-phase="${ablauf.phase}"><p class="hinweis" tabindex="-1" data-pruef-fokus>${tHtml(ablauf.phase === 'holen' ? 'pruefung.holt' : 'pruefung.laeuft')}</p>${z.lauf_id ? `<p class="subtle">${laufVerweis(z.lauf_id, laufLink)}</p>` : ''}<p class="subtle">${tHtml('pruefung.laeuftHinweis')}</p>${abbrechen}</div>`
  }
  if (ablauf.phase === 'fertig') return `<div class="pruef-ablauf" data-pruef-phase="fertig">${renderPruefBericht(ablauf.zustand?.bericht, laufLink)}${abbrechen}</div>`
  return ''
}

/**
 * Prüfbericht-Block im Freigabedialog (Antwort von …/installation/vorbereiten, additiv pruefbericht/pruefbericht_sperre).
 * Seit F45 F-2b-2c: mit optionen.eignungPruefen (nur die Capability Library, die den Ablauf selbst führt) steht bei einer Sperre
 * OHNE geltenden Bericht statt des Verweises auf die Sammlung der Knopf „Eignung prüfen“ (data-sm-auswaehlen, Katalog-id).
 * NICHT_GEEIGNET oder übersprungene Dateien (ein Bericht liegt vor) zeigen keinen Verweis — ein neuer Lauf derselben Version
 * änderte daran nichts.
 * @param daten - Antwort von vorbereiten
 * @param optionen - { eignungPruefen: boolean }
 * @returns { html, gesperrt }
 */
export function renderBerichtFuerFreigabe(daten, optionen = {}) {
  const sperre = typeof daten?.pruefbericht_sperre === 'string' && daten.pruefbericht_sperre !== '' ? daten.pruefbericht_sperre : null
  const hatBericht = daten?.pruefbericht !== null && typeof daten?.pruefbericht === 'object'
  const bericht = hatBericht ? renderPruefBericht(daten.pruefbericht) : ''
  const id = escapeHtml(String(daten?.id ?? ''))
  const weiter = hatBericht ? '' : optionen.eignungPruefen === true ? `<div class="pruef-sperre-aktion"><button type="button" class="button primary" data-sm-auswaehlen="${id}" data-sm-typ-offen="false">${tHtml('pruefung.eignungPruefen')}</button> <span class="subtle">${tHtml('pruefung.eignungPruefenText')}</span></div>` : `<br /><a href="#/capabilities">${tHtml('pruefung.eignungPruefenHinweis')}</a>`
  const sperrBlock = sperre === null ? '' : `<div class="note red pruef-sperre" data-pruef-sperre="1" id="installation-sperre"><strong>${tHtml('pruefung.freigabeGesperrt')}</strong> ${escapeHtml(sperre)}${weiter}</div>`
  return { html: `${sperrBlock}${bericht}`, gesperrt: sperre !== null }
}
