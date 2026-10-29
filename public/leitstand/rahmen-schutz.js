/**
 * Datei: public/leitstand/rahmen-schutz.js
 *
 * Zweck: Rahmen-Schutz des Leitstands (F45 V1, Entscheidung Stefan 28.10.2026, features/F45/plan-v1-v2.md). Die meta-CSP
 * erlaubt Frames auf http://localhost:* und http://127.0.0.1:* — damit auch auf den Leitstand-Port. Lenkt eine eingebettete
 * Projekt-App ihren Frame per Weiterleitung auf den Leitstand um, liefe er im sandbox-iframe mit allow-scripts und
 * allow-same-origin in derselben Herkunft wie die einbettende Seite. Dieser Baustein verhindert das im Leitstand selbst:
 * läuft er in einem Rahmen (window.self !== window.top), ersetzt er den Seiteninhalt durch einen kurzen Hinweis und wirft.
 *
 * Wird aufgerufen von:
 * - public/leitstand/app.js als ERSTER Import — ein Wurf beim Auswerten dieses Moduls bricht die Auswertung des ganzen
 *   Modulgraphen ab, bevor ein anderes Modul (Poll, Router, Projekt-Kontext, API-Aufruf, View) läuft. Vorher ausgewertet werden
 *   nur seine eigenen Abhängigkeiten i18n.js (mit den Wörterbüchern) und render.js — beide ohne Nebenwirkung beim Laden;
 *   bekommen sie einen Import mit Nebenwirkung, läuft der vor dem Schutz (DEKLARIERT).
 * - scripts/check-f45-v1-vorschau.mjs (e) mit simuliertem Fenster.
 *
 * Wichtig: Ein Header-Schutz (frame-ancestors, X-Frame-Options) ist bewusst nicht gesetzt — Serveränderung außerhalb des
 * Umfangs (Wachstumsbremse, DEKLARIERT im Gate-Kopf). Außerhalb des Browsers (node:test, Gates ohne window) tut das Modul
 * beim Laden nichts.
 */

import { initialisiereSprache, tHtml } from './i18n.js'

/**
 * Prüft, ob der Leitstand in einem Rahmen läuft; wenn ja, zeigt er nur den Hinweis und wirft.
 * @param fenster - window (oder ein simuliertes Fenster mit self, top)
 * @param dokument - document (body.innerHTML wird ersetzt)
 * @param waehleSprache - setzt die gespeicherte Sprache (Standard initialisiereSprache; das Gate injiziert einen Ersatz)
 * @throws Error, wenn der Leitstand eingebettet ist
 */
export function pruefeRahmen(fenster, dokument, waehleSprache = initialisiereSprache) {
  if (fenster.self === fenster.top) return
  waehleSprache()
  dokument.body.innerHTML = `<p class="rahmen-hinweis">${tHtml('rahmen.hinweis')}</p>`
  throw new Error('Leitstand läuft in einem Rahmen — Start abgebrochen (F45 V1, Rahmen-Schutz)')
}

if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.body) pruefeRahmen(window, document)
