/**
 * Datei: scripts/leitstand-server.mjs
 *
 * Zweck: F10-Leitstand. Lesend liefert der Server kontrollzustand/
 * (F1-Checkpoints, F2-Lineage-Einträge, seit WS-1 zusätzlich der echte
 * F1B-Laufstatus, AK8) als JSON an eine statische Seite unter
 * public/leitstand/. Seit WS-1 (F10-Feature-Akte) hat der Server zusätzlich
 * einen Schreibpfad: POST /api/laeufe nimmt einen Startauftrag entgegen und
 * löst ihn ausschließlich über F8s fuehreAufgabeDurch aus (AK2) — der
 * Server selbst schreibt nie nach kontrollzustand/ (Scope-Grenze aus der
 * F10-Akte). AusfuehrungsOptionen wird nie aus dem Body gelesen (AK3,
 * Options-Sperre). Der Server bindet ausschließlich auf 127.0.0.1 (AK4,
 * löst F-120). Eine laufId wird synchron vor dem fuehreAufgabeDurch-Aufruf
 * reserviert (AK5) und bei Fehlschlag der Kette wieder freigegeben. Ein
 * Wurf aus fuehreAufgabeDurch beendet den Prozess nicht (AK6) — er landet
 * in einer flüchtigen In-Memory-Liste unter GET /api/startfehler.
 *
 * Wird aufgerufen von: `npm run leitstand`, scripts/check-f10-leitstand.mjs
 *
 * Wichtig: Kein eigener Schreibzugriff auf kontrollzustand/ hinzufügen —
 * jede Schreibwirkung läuft ausschließlich mittelbar über
 * fuehreAufgabeDurch (F8 → F5/F6a/F7/F1B). erzeugeRequestHandler hält ihren
 * eigenen In-Memory-Zustand (angenommene laufIds, Startfehler) pro Aufruf
 * isoliert — wichtig für parallele Gate-Tests (scripts/check-f10-
 * leitstand.mjs), die eigene Serverinstanzen gegen ein Testverzeichnis
 * starten, ohne sich gegenseitig zu beeinflussen. Seed-Daten kommen separat
 * aus scripts/leitstand-seed.mjs, nicht aus diesem Server.
 *
 * F11 WS-1 (Option B, state/plan-v1-f11-auftrag-ws1.md Abschnitt 2.4):
 * auftragstext ist jetzt Pflichtfeld eines Startauftrags (AK2 macht es zum
 * Pflichtfeld von AusfuehrungsEingaben) — ERLAUBTE_STARTAUFTRAG_FELDER/
 * PFLICHT_STARTAUFTRAG_FELDER/pruefeStartauftrags eingaben-Rückgabe
 * entsprechend erweitert. Reine Formprüfung, keine Verhaltens-/Routen-
 * Änderung.
 *
 * F11 WS-2 (AK4-AK7, features/F11/feature.md): die maschinenkonstanten
 * Startfelder (werkzeugStartziel, werkzeugVersionDeklariert,
 * berechtigungskontext, profilReferenz) kommen nicht mehr aus dem Body,
 * sondern aus einer serverseitig einmal geladenen Startvorlage
 * (src/startvorlage/); ein Startauftrag wählt stattdessen einen benannten
 * Werkzeugsatz über das neue Feld `werkzeugsatz` (AK4/AK5,
 * VERBOTENE_STARTVORLAGE_FELDER). anfragen[] benennt Evidenz nur noch über
 * `pfad` — der Server liest jede Datei selbst, nach Pfadsicherheitsprüfung
 * über F3s leiteRepoRelativenPfadAb (AK6, loeseEvidenzPfadAuf). Eine reine
 * In-Memory-Sperre (laufAktiv) lässt je Serverinstanz nur einen
 * ausstehenden fuehreAufgabeDurch-Aufruf gleichzeitig zu (AK7, D13, löst
 * F-128) — nie aus kontrollzustand/ abgeleitet, ein Serverneustart setzt
 * sie zurück.
 *
 * F16 WS-3a (features/F16/feature.md, AK10/AK11): der Dispatcher startet
 * auch Schritte mit worker 'codex'. Zwei Stellen tragen das:
 * loeseAusgabeSchemaAuf löst schritt.output_schema — einen SCHEMANAMEN — zu
 * schemas/<name>.schema.json auf und lehnt vor jedem Prozessstart ab, wenn
 * der Name nicht auf SCHEMANAME_MUSTER passt (positive Allowlist: nur
 * Kleinbuchstaben, Ziffern, Bindestriche), die Datei fehlt, eine
 * UTF-8-BOM trägt (F-306) oder auf der Wurzel kein
 * additionalProperties:false führt (HTTP 400 invalid_json_schema,
 * state/tp-m3-01-codex.md Lauf 3). Und loeseAusfuehrungsEingabenAuf wählt
 * werkzeugStartziel/werkzeugVersionDeklariert/berechtigungskontext nach dem
 * Worker: für Codex aus vorlage.worker.codex bzw. aus der importierten
 * Gateway-Konstante CODEX_BERECHTIGUNGSKONTEXT, und lehnt einen
 * Codex-Schritt mit schreibendem Werkzeugsatz oder ohne worker.codex-Block
 * ab. Ein Claude-Code-Lauf behält dabei exakt seinen bisherigen Feldsatz
 * (F-286): worker und ausgabeSchemaPfad erscheinen nur im Codex-Zweig.
 * Beide Felder kommen ausschließlich aus einem geplanten Schritt, nie aus
 * einem HTTP-Body — sie stehen nicht in ERLAUBTE_STARTAUFTRAG_FELDER.
 *
 * F12 WS-1 (AK1-AK3, state/plan-v1-f12-ws1.md): GET /api/laeufe listet nur
 * noch echte Läufe (mindestens eine Wirkungsmarke in der gültigen Kette,
 * istLaufkette) - F2-Lineage-Ketten (lauf_id-Präfix "lineage-") erscheinen
 * nicht mehr (F-137). Die Antwort ist auf Kopfdaten geschrumpft
 * (sammleLaufKopfdaten); die volle Checkpoint-Projektion (unverändert
 * sammleCheckpoints) zieht in den neuen Detailendpunkt GET
 * /api/laeufe/<laufId> um (404 bei unbekannter laufId). Dessen laufId wird
 * nach decodeURIComponent gegen dieselbe Zeichenregel wie ein
 * Startauftrag geprüft (LAUFID_UNZULAESSIGE_ZEICHEN), bevor sie in einen
 * Dateisystempfad eingesetzt wird - sonst 400. Angezeigte Zeitpunkte
 * kommen seit E-M2-5 aus payload.erstellt_am (Artefaktinhalt), nicht mehr
 * aus statSync(pfad).mtime (F-141); fehlt das Feld (Bestandsdaten), liefert
 * der Server null statt eines Ersatzwerts.
 *
 * F12 WS-2 (AK4-AK6, state/plan-v1-f12-ws2.md): POST/GET /api/auftraege
 * legt einen Auftrag über den unveränderten registriereAuftrag-Pfad an
 * bzw. listet alle Aufträge (Verzeichnis-Scan nach dem Präfix
 * lineage-auftrag-, Abschnitt 0 des Plans — keine Lineage-Registry-
 * Funktion listet alle Artefakt-IDs einer Art). Ein Startauftrag trägt
 * seither `auftragId` statt `auftragstext` (VERBOTENE_AUFTRAG_FELDER);
 * der Auftragstext wird serverseitig aus dem Auftragsartefakt geladen. Die
 * auftragId-Existenzprüfung läuft SYNCHRON in erzeugeRequestHandler, nach
 * D13/laufIdBelegt und vor jeder Zustandsänderung — anders als das
 * vorgaengerLaufId-Vorbild (das erst innerhalb von fuehreAufgabeDurch,
 * also nach der bereits gesendeten 202-Antwort, wirft), weil AK5 einen
 * synchronen 400 vor jedem Schreibzugriff verlangt (D2, Plan Abschnitt 4).
 * GET /api/startvorlage/werkzeugsaetze liefert die Werkzeugsätze der
 * Startvorlage auf { name, modus, erlaubte_werkzeuge } reduziert — nie
 * werkzeugStartziel/berechtigungskontext/profilReferenz (D5).
 *
 * F12 WS-3 (AK7/AK8/AK10, state/plan-v1-f12-ws3.md): GET /api/laeufe/<laufId>
 * trägt seither vier zusätzliche Top-Level-Felder — kontextpaket, auftrag,
 * laufakte, rohstrom —, jedes mit eigenem status-Unterfeld statt Weglassen
 * bei Fehlen (kein 500 bei fehlender Zusatzquelle, sechs von sieben
 * Bestandsläufen haben keinen Auftragsbezug). auftrag hängt kausal vom
 * Kontextpaket ab (baueAuftragsbezug liest die artefakt:auftrag-<id>-
 * Referenz aus dessen elemente[]) — ohne Kontextpaket ist die Referenz nicht
 * auffindbar (status 'kontextpaket_fehlt', nicht 'kein_auftragsbezug').
 * baueAuftragsbezug wird zusätzlich von sammleLaufKopfdaten wiederverwendet
 * (F-147: auftragsbezug-Kopfdatum), mit einem Request-lokalen Memo
 * (auftragMemo, in sammleLaeufe angelegt) — eine von mehreren Läufen
 * geteilte Auftragskette wird pro Poll nur einmal geladen, kein
 * serverübergreifender Cache. rohstrom löst rohstrom_referenz.pfad
 * AUSSCHLIESSLICH über die Laufakte auf (nie aus der laufId gebaut), prüft
 * den Inhalts-Hash VOR jeder Feldprojektion (D2: hash_weicht_ab liefert kein
 * einziges Inhaltsfeld) und liest permission_denials ausschließlich über
 * F6as leseErgebnisobjekt(rohstrom.stdout) — nie eigenes Parsing (D5).
 * ergebnisobjekt.status 'kein_ergebnisobjekt' deckt sowohl ein leeres/nicht-
 * JSON-stdout als auch ein Nicht-"result"-Objekt ab (K1-Korrektur: die
 * ursprüngliche Planfassung nahm fälschlich an, leseErgebnisobjekt liefere
 * bei rohstrom.status 'ok' immer ein Objekt — real beobachtet in
 * kontrollzustand/lineage-laufakte-e2e-referenzfeature-2026-09-06,
 * beobachtungsbasis_vollstaendig: false). tool_input wird nie ausgeliefert,
 * nur tool_name (dedupliziert in toolNamen, anzahl zählt roh).
 *
 * F13 WS-2 (AK3-AK7, features/F13/feature.md): POST /api/entscheidungen ist
 * der einzige Schreibpfad für eine menschliche Entscheidung — Body-
 * Diskriminator `art` ('antwort'|'stale'|'terminal') wählt zwischen genau
 * drei bestehenden Kernverben: F9s importiereAntwort (E-186-Eskalation),
 * F9s entscheideStale (STALE-Entscheidung), F1Bs
 * schreibeWirkungsmarke(art:'terminal') (Auflösung von
 * KLAERUNG_ERFORDERLICH) — kein neuer Speicher, keine eigene Schreibfunktion
 * (D5, AK3). pruefeEntscheidungsformular ist reine Formprüfung (kein
 * Dateizugriff) und lehnt ein unbekanntes `art` UND ein Pflichtfeld ab, BEVOR
 * irgendetwas geschrieben wird (D2). F-162: das Wirkungsmarke-Schema kennt
 * kein erzeuger-Feld — AK4 wird für Fall 'terminal' stattdessen über ein
 * Pflichtfeld `begruendung` erfüllt (nicht-leerer String), das als
 * daten.mensch_begruendung mitgeschrieben wird; für 'antwort'/'stale' ist
 * `erzeuger: 'mensch'` bereits in den F9-Funktionen selbst fest codiert.
 * Eine geworfene Vorbedingungsverletzung aus importiereAntwort/entscheideStale
 * (keine bestehende transport-<laufId>-Kette, D3-Muster) wird als 400 mit
 * Klartext durchgereicht, kein 500/Absturz — der Aufruf ist synchron, kein
 * 202/Polling nötig. AK6 (D13): dieser Endpunkt prüft laufAktiv nicht — ein
 * Entscheidungs-POST ist kein Laufstart und bleibt von der Sperre unberührt.
 *
 * F13 WS-3 (AK5, nur art:'terminal' — features/F13/feature.md): eine Wirkungsmarke allein
 * ist für eine Wiederaufnahme unsichtbar (execution-controller löst 'artefakt:'-Pfade
 * ausschließlich gegen per registriereKernArtefakt registrierte Lineage-Artefakte auf, nie
 * gegen einen rohen Checkpoint-/Wirkungsmarke-Eintrag). Deshalb registriert der
 * art:'terminal'-Zweig NACH der Wirkungsmarke zusätzlich ein entscheidung-<laufId>-
 * Lineage-Artefakt (Vorbild: erzeugeTransportpaket, human-transport/index.ts:106-138) — kein
 * neues Schema, daten bleibt unknown (D5). Für 'antwort'/'stale' bewusst zurückgestellt
 * (F-163, kein belegter Fall — der Folgelauf verweist dort bereits über die Transportpaket-
 * Kette, F9). Die Response trägt seither zusätzlich artefaktId/versionSequenz dieses
 * Lineage-Artefakts.
 *
 * F13 WS-4 (F-166/F-167, features/F13/feature.md): vor WS-4 war ein über den
 * Leitstand gestarteter Lauf real nie entscheidbar — art:'terminal' wurde nur
 * bei KLAERUNG_ERFORDERLICH angeboten (praktisch unerreichbar, weil
 * klassifiziereLauf jeden Ausgang terminal markiert), der reale Klärfall
 * VERWEIGERT-durch-Werkzeuggrenze landet in ABGESCHLOSSEN und bekam dort nur
 * das art:'antwort'-Formular, das ohne transport-<laufId>-Kette (nur bei der
 * E-186-Eskalation vorhanden) garantiert 400 wirft (F-166). Deshalb eine
 * vierte Entscheidungsart 'kenntnisnahme': erlaubt nur bei ABGESCHLOSSEN mit
 * ergebnis VERWEIGERT oder FEHLGESCHLAGEN, schreibt KEINE zweite
 * Wirkungsmarke (der Lauf ist bereits terminal) — nur dieselbe
 * registriereKernArtefakt(entscheidung-<laufId>-…)-Registrierung, die der
 * terminal-Zweig für die Lineage-Sichtbarkeit schon nutzt (D5, kein neuer
 * Speicher). ergebnis kommt dabei ausschließlich aus stelleLaufstatusFest,
 * nie aus dem Body (verhindert Divergenz zwischen angezeigtem und
 * festgehaltenem Ergebnis). Zusätzlich (F-167): art:'terminal' prüfte den
 * Laufstatus bisher nicht und konnte auf einem bereits ABGESCHLOSSENEN Lauf
 * eine verwaiste zweite Terminalmarke erzeugen — beide Zweige rufen jetzt VOR
 * jedem Schreiben stelleLaufstatusFest auf: 'terminal' nur bei
 * KLAERUNG_ERFORDERLICH, 'kenntnisnahme' nur bei ABGESCHLOSSEN/VERWEIGERT
 * oder ABGESCHLOSSEN/FEHLGESCHLAGEN, sonst 400 mit Klartext-Grund, bevor
 * irgendetwas geschrieben wird (D2). QA-Nachtrag: bei VERWEIGERT lehnt
 * 'kenntnisnahme' zusätzlich ab, wenn die Terminalmarke einen echten
 * Bypass-Verdacht trägt (bypass_verdacht_anzahl > 0, über dieselbe
 * baueVerweigertDatenProjektion wie das GET-Detail) — das ist der E-186-Fall,
 * für den die UI bewusst 'antwort' statt 'kenntnisnahme' anbietet; ohne
 * diese Spiegelung wäre die Unterscheidung nur eine client-seitige
 * Formularweiche und der Server nicht mehr maßgeblich (D2-Verstoß).
 *
 * F14 WS-4 (features/F14/feature.md, AK7/AK8, F-177): ergänzt einen
 * AbortController je aktivem Lauf (laufAktivAbortController, D13 — genau
 * einer, kein Multi-Lauf-Registry), dessen .signal als abbruchSignal in die
 * AusfuehrungsOptionen DIESES Laufs gegeben wird. POST
 * /api/laeufe/<laufId>/abbrechen löst ihn aus (404 bei unbekannter/inaktiver
 * laufId, sonst 202 sofort, ohne auf das Laufende zu warten — die
 * bestehende fuehreAufgabeDurch-Kette WS-1/WS-2/WS-3 läuft danach
 * unverändert asynchron fertig). AK8 (löst F-175): POST /api/entscheidungen
 * lehnt 'terminal'/'kenntnisnahme' auf der gerade aktiven laufId mit 400 ab
 * (VOR jedem Schreiben) — 'antwort'/'stale' bleiben unberührt (AK6 aus F13
 * WS-2 gilt weiter). F-177: zeitgrenzeMs kommt jetzt ebenfalls serverseitig
 * aus der Startvorlage (Muster werkzeugStartziel/berechtigungskontext, F11
 * WS-2) statt nirgends gesetzt zu werden — Voraussetzung für AK10 (WS-5).
 * F-172 (trivialer Nachtrag, kein vollständiger Fix): GET
 * /api/laeufe/<laufId> trägt seither zusätzlich `aktiv`.
 *
 * F15 WS-2a (Meilenstein 3, docs/projekt/zielfassung.md §13.4 E-M3-1):
 * zwei Dinge, beide Vorbereitung für den Schritt-Automaten in WS-2b — der
 * Automat selbst ist NICHT hier. (1) Die Auflösung eines geprüften
 * Startauftrags zu fertigen AusfuehrungsEingaben (Werkzeugsatz aus der
 * Startvorlage, Evidenzdateien selbst gelesen nach AK6-Pfadprüfung,
 * auftragstext aus dem Auftragsartefakt) steht nicht mehr inline im POST
 * /api/laeufe-Handler, sondern in loeseAusfuehrungsEingabenAuf —
 * verhaltensgleich extrahiert, ohne HTTP-Kenntnis, der Handler übersetzt
 * den Ablehnungsgrund weiterhin selbst in seine 400er. Damit startet WS-2bs
 * Schritt n+1 über denselben Weg wie ein HTTP-Start, statt einen zweiten,
 * divergierenden aufzubauen. Die Reihenfolge D13 → laufIdBelegt →
 * auftragId-Existenz im Handler bleibt davon unberührt. (2) Drei
 * Workflow-Endpunkte: POST /api/workflows legt eine vollständige, mit F15s
 * validiereWorkflowDaten geprüfte WORKFLOW_V0-Payload als Kernartefakt
 * workflow-<workflow_id> an (Muster POST /api/auftraege; kein Start, keine
 * Ausführung), GET /api/workflows und GET /api/workflows/<id> projizieren
 * daraus (Muster /api/auftraege bzw. /api/laeufe). Ein Startendpunkt gehört
 * bewusst nicht dazu — er ist WS-2b.
 *
 *
 * F15 WS-2b (Meilenstein 3): POST /api/workflows/<id>/starten startet GENAU
 * EINEN Schritt eines Workflows über den Automatenpfad — die automatische
 * Fortsetzung auf Schritt n+1 ist WS-2c und steht bewusst nicht hier. Drei
 * Dinge sind dafür neu: (1) loeseSchrittEingabenAuf baut aus einem
 * WORKFLOW_V0-Schritt dieselben AusfuehrungsEingaben wie ein Startauftrag-Body
 * und löst dabei schritte[].eingaben ('artefakt:<id>') über ladeArtefaktVersion
 * auf — als notwendig:true-Anfragen VORANGESTELLT, mit Halt statt stillem
 * Überspringen, wenn ein Artefakt fehlt; budget kommt aus
 * vorlage.standardBudget, modell und zeitgrenze_ms aus dem Schritt (E-185/
 * E-M3-3: das gepinnte Plandatum gewinnt gegen die Startvorlage).
 * (2) starteLaufUndVergiss ist seither der EINZIGE Aufrufpunkt des
 * Werkzeuglaufs in dieser Datei — der Block stand bis WS-2a inline im POST
 * /api/laeufe-Handler und ist verhaltensgleich extrahiert, damit der
 * Automatenpfad keinen zweiten, divergierenden bekommt. (3)
 * schreibeWorkflowFortschritt legt über registriereWorkflow eine neue
 * Workflow-Version an: einmal VOR dem Laufstart (Schritt auf LAEUFT mit
 * lauf_id, Workflow auf LAEUFT), einmal nach dem Laufende. Die laufId erzeugt
 * der Server per randomUUID; sie kommt nie aus einer Payload. POST /api/laeufe
 * ist unverändert.
 *
 * Nach dem Laufende passieren zwei Dinge, beide in derselben neuen Version:
 * (a) der Schritt bekommt seinen normalisierten Ausgang — es sei denn, der Lauf
 * wurde FACHLICH abgelehnt, OHNE dass ein Checkpoint entstanden ist; dann geht
 * er auf OFFEN mit lauf_id null zurück, weil eine lauf_id ohne Kette den Schritt
 * über Regel 3 dauerhaft unstartbar machte (ein Tippfehler in schritt.rolle
 * mauerte ihn zu). Die Bedingung ist ENGER als ok === false und wird am
 * Dateisystem abgelesen: F6as verweigereStart schreibt in fünf von sieben
 * Ablehnungszweigen eine reale VERWEIGERT-Wirkungsmarke, und wo ein Artefakt
 * entstanden ist, wird nichts zurückgesetzt (F1s Kette ist append-only).
 * (b) der Cursor wandert über ermittleNaechstenSchritt auf den nächsten fälligen
 * Schritt weiter, und der Workflow-Status folgt dessen Ausgang
 * (workflowStatusZuAusgang). Gestartet wird dabei NICHTS: WS-2b ist ein
 * manueller Schritt-für-Schritt-Modus, in dem ein zweiter POST .../starten den
 * nächsten Schritt ausführt; WS-2c ersetzt nur diesen zweiten Aufruf.
 *
 * Zusätzlich seit WS-2b: POST /api/workflows lehnt eine neue Fassung eines
 * Workflows mit 409 ab, solange sein aktueller Stand LAEUFT, WARTET_FREIGABE oder
 * ABGESCHLOSSEN ist (GESPERRTE_ERSETZUNGS_STATUS) — sonst gäbe der Mensch Fassung 1
 * frei und der laufende Schritt schriebe seinen Ausgang in Fassung 2, oder eine
 * Freigabe ließe sich durch eine neue Fassung umgehen. In OFFEN,
 * KLAERUNG_ERFORDERLICH und GESTOPPT ist die neue Fassung dagegen der menschliche
 * Reparaturzug und ausdrücklich erlaubt; ein ungültiger Bestand ist es immer. Der
 * eingereichte Datensatz selbst darf keinen gesperrten status tragen, sonst sperrte
 * sich der Mensch mit einer Feldangabe aus.
 * F-145-Fix: der Fire-and-forget-Aufruf des Startlaufs in POST /api/laeufe
 * reicht seither sein viertes Argument (optionen) strukturell durch
 * (dieselben Optionen, mit denen erzeugeRequestHandler selbst aufgerufen
 * wurde) — vorher respektierten nur die synchronen Prüfungen davor (D13,
 * laufIdBelegt, auftragId-Existenz) ein Nicht-Default-basisVerzeichnis, der
 * eigentliche Lauf fiel intern auf den Default 'kontrollzustand' zurück
 * (stille Divergenz, in Produktion unsichtbar bei Default=Default). Hinweis
 * für künftige Codeeingriffe: check-f11-auftrag.mjs' D13-Vertragsprüfung
 * findet die reale Aufrufstelle des Fire-and-forget-Laufs über deren
 * ERSTES Vorkommen im Quelltext — Kommentare oberhalb dürfen den
 * zusammengesetzten Funktionsnamen und die öffnende Klammer deshalb nie
 * unmittelbar hintereinander als Literalstring nennen.
 *
 * F15 WS-2c (a), AK6b: der Schritt-Automat setzt nach einem erfolgreichen
 * Schritt selbst fort. Zwei Dinge sind dafür neu: (1) starteWorkflowSchritt —
 * die Schritte (5)-(8) des Startendpunkts als benannte Funktion ohne
 * res-Bezug, damit der HTTP-Aufruf und die automatische Fortsetzung
 * DENSELBEN Startpfad benutzen (derselbe Grund, aus dem der
 * Fire-and-forget-Block nur einmal existiert). Der HTTP-Endpunkt übersetzt
 * ihre Rückgabe über STARTFEHLER_STATUS in 202/400/409/500 und verhält sich
 * nach außen unverändert; die Fortsetzung übersetzt sie in einen
 * startfehlerListe-Eintrag — kein zweiter Fehlerkanal. (2) Der bestehende
 * nachLauf-Rückruf setzt nach dem Schreibvorgang fort, wenn der Fortschritt
 * geschrieben ist, der Schritt nicht geheilt wurde und der Ausgang von
 * ermittleNaechstenSchritt 'starte' lautet; jeder andere Ausgang beendet den
 * Automaten still im bereits geschriebenen Zustand. grenzen.max_schritte
 * (über haltGrenze) ist die einzige Abbruchbedingung — kein zweiter Zähler,
 * grenzen.max_replans bleibt unangetastet (F-203).
 *
 * Die Invariante dahinter (AK6b): zwischen dem Reset von
 * laufAktiv/laufAktivLaufId/laufAktivAbortController im .then des
 * Fire-and-forget-Blocks und dem erneuten laufAktiv = true in
 * starteWorkflowSchritt liegt KEIN Kontrollflusswechsel — sonst schlüpfte
 * ein paralleler POST /api/laeufe durch das Fenster. Die betroffenen
 * Bereiche sind im Quelltext mit D13-UEBERGABE-OHNE-FENSTER markiert und
 * werden von scripts/check-f15-workflow.mjs geprüft.
 *
 * Ebenfalls neu (F-202): WORKFLOW_V0 trägt ein OPTIONALES Feld grund auf
 * Workflow-Ebene. Bis WS-2b entstand jeder Halt als Antwort auf einen
 * HTTP-Aufruf und der Mensch las den Grund im 409; ab WS-2c hält der Automat
 * an, während niemand hinsieht. Der Text ist derselbe, den
 * beschreibeAutomatAusgang ohnehin erzeugt; ein startender Schritt setzt das
 * Feld auf null.
 *
 * F15 WS-2c-Vorbereitung (F-201): belegeInstanzLock schreibt vor dem Binden
 * eine Datei <basis>/.leitstand.lock mit { pid, port, gestartetAm } und
 * bricht den Start ab, wenn die darin genannte PID noch lebt. Damit können
 * nicht mehr zwei Serverprozesse aus demselben Arbeitsverzeichnis dasselbe
 * kontrollzustand/ bespielen (auf Standardport verhinderte das bisher allein
 * EADDRINUSE; LEITSTAND_PORT=<anderer> blieb offen). Das ist die EINZIGE
 * Ausnahme zur Regel "kein eigener Schreibzugriff auf kontrollzustand/":
 * die Lock-Datei ist flüchtiger Betriebszustand, kein Kernartefakt — kein
 * registriereKernArtefakt, keine Lineage, keine Hash-Kette, git-ignoriert.
 * Sie wird ausschließlich aus dem CLI-Bindeblock am Dateiende belegt, nie
 * aus erzeugeRequestHandler oder einem Request-Handler heraus: parallele,
 * voneinander unabhängige Serverinstanzen in Tests (scripts/check-f10-
 * leitstand.mjs, check-f13/f14) müssen möglich bleiben.
 *
 * F15 WS-2c (b2): POST /api/workflows/<id>/stoppen (löst F-216) — die Bremse
 * für eine laufende automatische Kette. Sie zielt auf den WORKFLOW, nicht auf
 * einen Lauf: POST /api/laeufe/<laufId>/abbrechen trifft eine laufId, die
 * sich mit jedem Schritt ändert, und war zwischen zwei Schritten gar nicht
 * bedienbar. Der Endpunkt verlangt eine Pflichtbegründung, setzt ZUERST
 * status GESTOPPT / aktiver_schritt_id null / grund und bricht ERST DANN den
 * aktiven Lauf ab, falls er zu diesem Workflow gehört (abgelesen am
 * Artefakt: ein Schritt auf LAEUFT, dessen lauf_id die des aktiven Laufs
 * ist). Die Reihenfolge ist die Wirkung: der abgebrochene Lauf endet Sekunden
 * später, seine Nachbereitung lädt frisch, findet GESTOPPT vor und wird vom
 * Schutz in schreibeWorkflowFortschritt eingefroren — der Schritt bekommt
 * seinen tatsächlichen Ausgang, der Workflow bleibt GESTOPPT, Schritt n+1
 * startet nicht. Es wird NICHT auf das Laufende gewartet (Muster
 * /abbrechen). Danach — und nur danach, weil der Stopp zuerst stehen muss und
 * der Abbruch nicht auf I/O warten darf — wird die Entscheidung bezeugt
 * (F-233): Kernartefakt entscheidung-workflow-<id>-stopp, erzeuger 'mensch',
 * ergebnis 'GESTOPPT', mit Pflichtbegründung und einem eingaben-Verweis auf
 * die Workflow-Version, die der Mensch beim Stoppen VOR SICH HATTE (also die
 * Fassung vor dem Stopp, nicht die neue GESTOPPT-Fassung — eine Freigabe
 * bezeugt ebenfalls den Plan, über den entschieden wurde). Aufrufform
 * wortgleich zum ABGELEHNT-Zweig der Freigabe. Scheitert das, wird NICHT
 * zurückgerollt: der Stopp bleibt gültig, der Fehlschlag geht in die
 * Startfehlerliste, und die Antwort trägt bezeugt: false samt grund. Die
 * Antwort ist 200 mit { workflowId, laufAbgebrochen, bezeugt }, dazu
 * artefaktId/versionSequenz bei bezeugt true und grund bei false. AK8
 * (Leitstand-Ansicht mit Freigeben/Überspringen/Stoppen) bleibt WS-3 und
 * bleibt offen — hier entsteht nur der Endpunkt.
 *
 * Zwei Härtungen desselben Zuschnitts kommen mit ihm, weil erst der Stopp sie
 * erreichbar macht:
 * (F-227) schreibeWorkflowFortschritt kennt eine Identitätsprüfung: die
 * Nachbereitung eines Laufs schreibt nur, wenn der geladene Schritt noch die
 * lauf_id GENAU DIESES Laufs trägt. Sonst bekäme ein fremder Plan den Ausgang
 * eines Laufs, den niemand für ihn gestartet hat — möglich, seit man stoppen
 * und danach (GESTOPPT ist ersetzbar) eine neue Fassung einreichen kann,
 * während der alte Lauf noch fliegt. Nur die Nachbereitung setzt sie; jeder
 * andere Schreibpfad soll auf dem Stand wirken, der jetzt daliegt.
 * (F-228) Der GESTOPPT-Schutz MELDET seither, dass er gegriffen hat
 * ({ ok: true, eingefroren: true }). Vorher fror er die Workflow-Ebene ein,
 * gab aber ok:true zurück — starteWorkflowSchritt las das als Erfolg und
 * startete den Lauf samt D13-Belegung: ein Schritt auf LAEUFT unter einem
 * Workflow auf GESTOPPT. Alle Aufrufstellen lesen das Feld; keine darf es
 * stillschweigend als Erfolg nehmen.
 *
 * F15 WS-2c (b3, löst F-226): POST /api/workflows bezeugt eine Fassung, die
 * eine FREIGABEPFLICHT ZURÜCKNIMMT. Ein ZWINGEND-Schritt war bis dahin auf
 * zwei Wegen startbar zu machen — über den Freigabe-Endpunkt (mit
 * Pflichtbegründung und Artefakt) und über eine neue Fassung, in der derselbe
 * Schritt AUTOMATISCH trägt (unbezeugt). Der Bedrohungsfall ist nicht
 * Böswilligkeit, sondern Unachtsamkeit: der Mensch ändert einen Plan und
 * merkt nicht, dass er dabei eine Freigabepflicht verloren hat — der Automat
 * fährt den Schritt danach unbeaufsichtigt.
 * ermittleFreigabeAbschwaechungen vergleicht die eingereichte Fassung mit dem
 * ohnehin geladenen Bestand (kein zusätzliches I/O) und meldet jeden Schritt,
 * der nicht mehr ZWINGEND trägt oder ganz entfällt. Bei einem Treffer ist
 * begruendung Pflicht — ein Transportfeld, das VOR der Schemaprüfung aus dem
 * Rumpf gelöst wird und nie im Workflow landet —, die 400-Meldung nennt die
 * betroffenen schritt_ids NAMENTLICH, und es entsteht
 * entscheidung-workflow-<id>-planaenderung. Das Artefakt entsteht VOR dem
 * Schreiben der neuen Fassung; scheitert es, wird die Fassung NICHT
 * geschrieben (Unterschied zum Stopp, wo die Wirkung schon eingetreten war).
 * OHNE Treffer ändert sich nichts: gewöhnliche Planänderungen, die Erstanlage
 * und die VERSCHÄRFUNG AUTOMATISCH -> ZWINGEND bleiben begründungsfrei.
 *
 * F15 WS-3b: zwei ADDITIVE Projektionsfelder für die Leitstand-Bedienung, kein
 * geänderter Antwortvertrag. (1) 'naechster' ({ art, schrittId, grund }) in
 * BEIDEN Workflow-Projektionen — GET /api/workflows und GET
 * /api/workflows/<id> —, ausschließlich aus ermittleNaechstenSchritt ohne
 * Vorschrittergebnis (baueNaechsterProjektion, D5). Damit rendert die Ansicht
 * das Verdikt des Servers, statt einen zweiten Regelsatz im Browser zu führen;
 * ohne das Feld hätte der wichtigste Zustand überhaupt — ein fälliger
 * ZWINGEND-Schritt OHNE persistierten Halt — keine Anzeige (F-253). (2)
 * 'verstoesse' (string[] aus validiereWorkflowDaten) im Detail, weiterhin mit
 * 200 und vollem Datensatz (F-247): eine ungültige Fassung muss ansehbar
 * bleiben, denn sie anzusehen ist der erste Schritt ihrer Reparatur.
 */

import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { extname, isAbsolute, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { kanonischesJson, ladeGueltigeCheckpoints, schreibeWirkungsmarke, sha256Hex, stelleLaufstatusFest } from '../src/checkpoint-store/index.ts'
import { ladeArtefaktVersion, pruefeStale, registriereKernArtefakt } from '../src/lineage-registry/index.ts'
import { entscheideStale, importiereAntwort } from '../src/human-transport/index.ts'
import { fuehreAufgabeDurch } from '../src/execution-controller/index.ts'
import { leiteRepoRelativenPfadAb } from '../src/authorization-boundary/index.ts'
import { ladeStartvorlage, leiteProfilReferenzAb, loeseWerkzeugsatzAuf } from '../src/startvorlage/index.ts'
import { registriereAuftrag } from '../src/auftrag/index.ts'
import { ermittleNaechstenSchritt, registriereWorkflow, validiereWorkflowDaten } from '../src/workflow/index.ts'
import { leseErgebnisobjekt } from '../src/claude-code-gateway/index.ts'
import { CODEX_BERECHTIGUNGSKONTEXT } from '../src/codex-gateway/index.ts'

const PORT = Number(process.env.LEITSTAND_PORT ?? 4173)
const BASISVERZEICHNIS = 'kontrollzustand'
const PUBLIC_VERZEICHNIS = join(import.meta.dirname, '..', 'public', 'leitstand')
const STANDARD_STARTVORLAGE_PFAD = 'startvorlagen/beispielprojekt.json'
const DATEINAME_MUSTER = /^(\d+)-([0-9a-f]{64})\.json$/
const STILLER_SCHREIBER = () => {}

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
}

/**
 * F9-Erweiterung: die innere daten.daten (F2s registriereKernArtefakt-
 * Parameter 'daten') trägt bei Human-Transport-Artefakten ihren eigenen
 * Diskriminator (bedarf_schema/transport_schema) — daten.art ist bei
 * jedem kern-erzeugten Artefakt unverändert "artefakt_version" (F2s
 * eigener Diskriminator, eine Ebene höher), nie "bedarf"/"transportpaket".
 */
function humanTransportFelder(innereDaten) {
  if (typeof innereDaten !== 'object' || innereDaten === null) return {}
  if (innereDaten.bedarf_schema === 'v0') {
    return { humanTransportArt: 'bedarf', beschreibung: innereDaten.beschreibung, werkzeugAuswahl: innereDaten.werkzeug_auswahl }
  }
  if (innereDaten.transport_schema === 'v0') {
    return {
      humanTransportArt: 'transportpaket',
      transportStatus: innereDaten.status,
      executor: innereDaten.executor,
      bezugBedarf: innereDaten.bezieht_sich_auf_bedarf,
    }
  }
  return {}
}

function lineageFelder(daten) {
  return {
    art: daten.art,
    artefaktId: daten.artefakt_id,
    ...(daten.art === 'artefakt_version' ? { erzeugungsart: daten.erzeugungsart } : {}),
    ...(daten.art === 'stale_entscheidung' ? { entscheidung: daten.entscheidung, beziehtSichAuf: daten.bezieht_sich_auf } : {}),
    ...humanTransportFelder(daten.daten),
  }
}

/** F9-Erweiterung: art/ergebnis einer Wirkungsmarke (F1B) — RUN_PREPARED/Terminal, für Status-/Ergebnis-Spalten. */
function wirkungsmarkeFelder(payload) {
  return {
    art: payload.art,
    ...(payload.ergebnis !== undefined ? { ergebnis: payload.ergebnis } : {}),
  }
}

/** Liest den aktuellen Inhalt der referenzierten Dateien live von der Platte — nur lesend, für die Staleness-Live-Prüfung. */
function leseAktuelleEingaben(eingaben) {
  const inhalte = {}
  for (const eingabe of eingaben) {
    if (existsSync(eingabe.pfad)) {
      try {
        inhalte[eingabe.pfad] = readFileSync(eingabe.pfad, 'utf8')
      } catch {
        // Datei existiert laut existsSync, ist aber nicht lesbar — Eingabe einfach auslassen (pruefeStale ignoriert fehlende Pfade ohnehin).
      }
    }
  }
  return inhalte
}

/**
 * Liest alle Checkpoints einer lauf_id, sortiert aufsteigend nach sequenz.
 * Kettenintegrität (gültig/ungültig + Grund) kommt ausschließlich aus der
 * echten F1-Validierung (ladeGueltigeCheckpoints) — keine zweite,
 * selbstgebaute Prüfung. Staleness wird für artefakt_version-Einträge mit
 * Eingaben live über die echte pruefeStale-Funktion berechnet, nicht
 * vorberechnet. Seit F12 WS-1 (AK3, E-M2-5) liefert zeitstempel bei
 * gültigen Einträgen payload.erstellt_am (null bei Bestandsdaten ohne das
 * Feld) statt statSync(pfad).mtime — nur die "ungültig"-Zeile ohne
 * validierten Payload zeigt weiterhin die Datei-mtime als Diagnosewert.
 * @param laufId - Lauf-Kennung
 * @param basisVerzeichnis - Kontrollzustand-Wurzel (Default 'kontrollzustand', überschreibbar für Tests)
 * @returns Checkpoint-Liste, aufsteigend nach sequenz
 */
function sammleCheckpoints(laufId, basisVerzeichnis = BASISVERZEICHNIS) {
  const verzeichnis = join(basisVerzeichnis, laufId, 'checkpoints')
  if (!existsSync(verzeichnis)) return []

  const pfadNachSequenz = new Map()
  for (const datei of readdirSync(verzeichnis)) {
    const treffer = DATEINAME_MUSTER.exec(datei)
    if (treffer) pfadNachSequenz.set(Number(treffer[1]), join(verzeichnis, datei))
  }
  if (pfadNachSequenz.size === 0) return []

  const gruendeNachSequenz = new Map()
  const gueltigeEintraege = ladeGueltigeCheckpoints(laufId, {
    basisVerzeichnis,
    schreiber: (ereignis) => {
      if (ereignis.ereignis === 'checkpoint_validierungsfehler' && ereignis.sequenz !== undefined) {
        gruendeNachSequenz.set(ereignis.sequenz, ereignis.verstoesse ?? [])
      }
    },
  })
  const gueltigNachSequenz = new Map(gueltigeEintraege.map((eintrag) => [eintrag.payload.sequenz, eintrag]))

  const checkpoints = []
  for (const [sequenz, pfad] of pfadNachSequenz) {
    const eintrag = gueltigNachSequenz.get(sequenz)

    if (eintrag === undefined) {
      checkpoints.push({
        sequenz,
        // Kein validierter Payload vorhanden (Parse-/Ketten-/Hash-Fehler) — Diagnosewert für die
        // "ungültig"-Zeile, keine Aussage über einen Artefaktinhalt. AK3 betrifft nur gültige Einträge.
        zeitstempel: statSync(pfad).mtime.toISOString(),
        gueltig: false,
        gruende: gruendeNachSequenz.get(sequenz) ?? ['unbekannter Validierungsfehler'],
        typ: '(ungültig)',
      })
      continue
    }

    const daten = eintrag.payload.daten
    const istLineage = typeof daten === 'object' && daten !== null && daten.typ === 'lineage'
    const istStaleFaehig = istLineage && daten.art === 'artefakt_version' && (daten.eingaben?.length ?? 0) > 0
    const istWirkungsmarke = eintrag.typ === 'wirkungsmarke'

    checkpoints.push({
      sequenz,
      // AK3, E-M2-5: aus dem Artefaktinhalt (payload.erstellt_am), nicht mehr aus statSync(pfad).mtime
      // (F-141) — fehlt das Feld (Bestandsdaten), null statt eines Ersatzwerts.
      zeitstempel: eintrag.payload.erstellt_am ?? null,
      gueltig: true,
      typ: istLineage ? `lineage/${daten.art}` : eintrag.typ,
      ...(istLineage ? { lineage: lineageFelder(daten) } : {}),
      ...(istWirkungsmarke ? { wirkungsmarke: wirkungsmarkeFelder(eintrag.payload) } : {}),
      ...(istStaleFaehig
        ? { stale: pruefeStale(daten.artefakt_id, sequenz, leseAktuelleEingaben(daten.eingaben), { basisVerzeichnis, schreiber: STILLER_SCHREIBER }) }
        : {}),
    })
  }
  checkpoints.sort((a, b) => a.sequenz - b.sequenz)
  return checkpoints
}

/** Eine gültige Kette zählt nur als Lauf, wenn sie mindestens eine Wirkungsmarke enthält — Konvention (lauf_id-Präfix) ist dafür nie maßgeblich (F-137, AK1). */
function istLaufkette(gueltigeEintraege) {
  return gueltigeEintraege.some((eintrag) => eintrag.typ === 'wirkungsmarke')
}

// ─── F12 WS-3 (AK7/AK8): Detailprojektion — Kontextpaket, Auftragsbezug, Laufakte, Rohstrom ──

/** Lädt die Kontextpaket-Version eines Laufs, oder null (Bestandslauf ohne Kontextpaket, Befund 6). @param laufId - Lauf-Kennung @param basisVerzeichnis - Kontrollzustand-Wurzel @returns ArtefaktVersion des Kontextpakets, oder null */
function ladeKontextpaketVersion(laufId, basisVerzeichnis) {
  return ladeArtefaktVersion(`kontextpaket-${laufId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
}

/** Detailprojektion des Kontextpakets (AK7) — rolle/elemente/ausgeschlossen aus dem bereits geladenen Artefakt, kein zweiter Ladevorgang. @param kontextpaketVersion - Ergebnis von ladeKontextpaketVersion @returns { status: 'ok', rolle, elemente, ausgeschlossen } | { status: 'nicht_vorhanden' } */
function baueKontextpaketProjektion(kontextpaketVersion) {
  if (kontextpaketVersion === null) return { status: 'nicht_vorhanden' }
  const daten = kontextpaketVersion.daten
  return {
    status: 'ok',
    rolle: daten?.rolle,
    elemente: Array.isArray(daten?.elemente) ? daten.elemente : [],
    ausgeschlossen: Array.isArray(daten?.ausgeschlossen) ? daten.ausgeschlossen : [],
  }
}

const ARTEFAKT_AUFTRAG_PRAEFIX = 'artefakt:auftrag-'

/**
 * Leitet den Auftragsbezug eines Laufs aus dem Kontextpaket-Element mit
 * Pfad 'artefakt:auftrag-<auftragId>' ab (E-M2-4, Befund 2) und lädt bei
 * Treffer das Auftragsartefakt — lädt IMMER titel + auftragstext (D4, Q2):
 * der Kopfdaten-Aufrufer (sammleLaufKopfdaten) schneidet auftragstext weg,
 * die Detailansicht (GET /api/laeufe/<laufId>) nutzt die volle Rückgabe
 * unverändert als 'auftrag'-Feld. auftragMemo ist ein Request-lokales
 * Map(auftragId → Ergebnis), von sammleLaeufe angelegt — eine von mehreren
 * Läufen geteilte Auftragskette wird pro Poll nur einmal geladen (Q2),
 * kein serverübergreifender Cache, kein Zustand über den Request hinaus.
 * @param kontextpaketVersion - Ergebnis von ladeKontextpaketVersion
 * @param basisVerzeichnis - Kontrollzustand-Wurzel
 * @param auftragMemo - optionales Request-lokales Memo (Map)
 * @returns vier Ausprägungen, siehe state/plan-v1-f12-ws3.md Abschnitt 2.1 (D1)
 */
function baueAuftragsbezug(kontextpaketVersion, basisVerzeichnis, auftragMemo) {
  if (kontextpaketVersion === null) return { status: 'kontextpaket_fehlt' }
  const elemente = Array.isArray(kontextpaketVersion.daten?.elemente) ? kontextpaketVersion.daten.elemente : []
  const element = elemente.find((e) => typeof e?.pfad === 'string' && e.pfad.startsWith(ARTEFAKT_AUFTRAG_PRAEFIX))
  if (element === undefined) return { status: 'kein_auftragsbezug' }

  const auftragId = element.pfad.slice(ARTEFAKT_AUFTRAG_PRAEFIX.length)
  if (auftragMemo?.has(auftragId)) return auftragMemo.get(auftragId)

  const auftragVersion = ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
  const ergebnis =
    auftragVersion === null
      ? { status: 'auftrag_fehlt', auftragId }
      : { status: 'ok', auftragId, titel: auftragVersion.daten?.titel, auftragstext: auftragVersion.daten?.auftragstext }
  auftragMemo?.set(auftragId, ergebnis)
  return ergebnis
}

/** Detailprojektion der Laufakte (AK7) — modellBeobachtet/beobachtungsbasisVollstaendig/arbeitsverzeichnisPfad, ohne rohstrom_referenz (die bleibt intern, AK8: nie aus der laufId gebaut, nie an den Client ausgeliefert). @param laufakteVersion - ArtefaktVersion der Laufakte, oder null @returns { status: 'ok', ... } | { status: 'nicht_vorhanden' } */
function baueLaufakteProjektion(laufakteVersion) {
  if (laufakteVersion === null) return { status: 'nicht_vorhanden' }
  const daten = laufakteVersion.daten ?? {}
  return {
    status: 'ok',
    modellBeobachtet: daten.modell_beobachtet ?? null,
    beobachtungsbasisVollstaendig: daten.beobachtungsbasis_vollstaendig ?? null,
    arbeitsverzeichnisPfad: daten.arbeitsverzeichnis_pfad ?? null,
  }
}

/**
 * F13 WS-1 (AK2): bei ABGESCHLOSSEN/VERWEIGERT das daten-Feld der
 * terminalen Wirkungsmarke (bypass_verdacht_anzahl, is_error,
 * non_execution_kind — src/result-evaluator/index.ts, Schritt 0 dieser
 * Iteration) direkt aus der Checkpoint-Kette lesen. NICHT aus
 * baueLaufakteProjektion (die Felder liegen dort nicht, siehe oben) — ein
 * eigener, kleiner Projektionszweig (D5: kein neuer Endpunkt, GET
 * /api/laeufe/<laufId> bleibt der einzige Lieferant). Ein Bestandslauf vor
 * dieser Änderung trägt kein daten-Feld — 'unbekannt' je fehlendem Feld,
 * nie 0/false raten (Muster renderRohstrom "unbekannt (kein
 * Ergebnisobjekt)").
 * @param laufId - Lauf-Kennung
 * @param laufStatus - Ergebnis von stelleLaufstatusFest, unverändert übernommen
 * @param basisVerzeichnis - Kontrollzustand-Wurzel
 * @returns null außer bei ABGESCHLOSSEN/VERWEIGERT, sonst { bypassVerdachtAnzahl, isError, nonExecutionKind } (je 'unbekannt' bei fehlendem Feld)
 */
function baueVerweigertDatenProjektion(laufId, laufStatus, basisVerzeichnis) {
  if (laufStatus.status !== 'ABGESCHLOSSEN' || laufStatus.ergebnis !== 'VERWEIGERT') return null

  const kette = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
  const terminal = kette.find((eintrag) => eintrag.typ === 'wirkungsmarke' && eintrag.payload.sequenz === laufStatus.terminalSequenz)
  const daten = terminal?.payload?.daten
  const hatDaten = typeof daten === 'object' && daten !== null

  return {
    bypassVerdachtAnzahl: hatDaten && typeof daten.bypass_verdacht_anzahl === 'number' ? daten.bypass_verdacht_anzahl : 'unbekannt',
    isError: hatDaten && 'is_error' in daten ? daten.is_error : 'unbekannt',
    nonExecutionKind: hatDaten && 'non_execution_kind' in daten ? daten.non_execution_kind : 'unbekannt',
  }
}

/**
 * Begrenzte, hashgeprüfte Rohstrom-Projektion (AK8). Auflösung
 * AUSSCHLIESSLICH über laufakteVersion.daten.rohstrom_referenz.pfad (nie
 * aus der laufId gebaut), Pfadsicherheit über F11s loeseEvidenzPfadAuf
 * (D5, kein zweiter Check). Reihenfolge zwingend (D2): Hash zuerst, dann
 * JSON.parse des Wurzelobjekts, dann Feldprojektion — bei hash_weicht_ab
 * oder nicht_parsebar wird KEIN Inhaltsfeld ausgeliefert, auch nicht
 * teilweise. exitCode/startfehler/stdoutLaenge/stderrLaenge stammen direkt
 * aus dem geparsten Wurzelobjekt (ProzessErgebnis-Form); permissionDenials
 * kommt ausschließlich über F6as leseErgebnisobjekt(wurzel.stdout) (Befund
 * 4, D5) — ergebnisobjekt.status 'kein_ergebnisobjekt' deckt sowohl
 * leeres/kaputtes stdout als auch ein Nicht-"result"-Objekt ab (K1: real
 * beobachtet bei beobachtungsbasis_vollstaendig: false, e2e-
 * referenzfeature-2026-09-06). tool_input wird nie ausgeliefert (D3), nur
 * der dedupliziert String-Wert tool_name (toolNamen); anzahl zählt roh
 * (Q7) — toolNamen darf leer sein, während anzahl > 0.
 * @param laufakteVersion - ArtefaktVersion der Laufakte, oder null
 * @param repoWurzel - absoluter Pfad der Repo-Wurzel (AK6-Muster)
 * @returns siehe state/plan-v1-f12-ws3.md Abschnitt 2.1/2.2 (K1-Korrektur)
 */
function baueRohstromProjektion(laufakteVersion, repoWurzel) {
  if (laufakteVersion === null) return { status: 'laufakte_fehlt' }
  const referenz = laufakteVersion.daten?.rohstrom_referenz
  if (typeof referenz?.pfad !== 'string' || typeof referenz?.inhalts_hash !== 'string') return { status: 'nicht_verfuegbar' }

  const pfadErgebnis = loeseEvidenzPfadAuf(referenz.pfad, repoWurzel)
  if (!pfadErgebnis.ok) return { status: 'nicht_verfuegbar' }
  const zielPfad = join(repoWurzel, pfadErgebnis.relativerPfad)
  if (!existsSync(zielPfad) || !statSync(zielPfad).isFile()) return { status: 'nicht_verfuegbar' }

  let rohInhalt
  try {
    rohInhalt = readFileSync(zielPfad, 'utf8')
  } catch {
    return { status: 'nicht_verfuegbar' }
  }

  // D2: Hash zuerst, DANN projizieren — bei Abweichung kein einziges Inhaltsfeld.
  if (sha256Hex(rohInhalt) !== referenz.inhalts_hash) return { status: 'hash_weicht_ab' }

  let wurzel
  try {
    wurzel = JSON.parse(rohInhalt)
  } catch {
    return { status: 'nicht_parsebar' }
  }
  if (typeof wurzel !== 'object' || wurzel === null || Array.isArray(wurzel)) return { status: 'nicht_parsebar' }

  const ergebnisobjekt = typeof wurzel.stdout === 'string' ? leseErgebnisobjekt(wurzel.stdout) : null
  const denialsRoh = ergebnisobjekt?.permission_denials
  const denials = Array.isArray(denialsRoh) ? denialsRoh.filter((d) => typeof d === 'object' && d !== null) : []

  return {
    status: 'ok',
    exitCode: wurzel.exitCode ?? null,
    startfehler: wurzel.startfehler ?? null,
    stdoutLaenge: typeof wurzel.stdout === 'string' ? wurzel.stdout.length : null,
    stderrLaenge: typeof wurzel.stderr === 'string' ? wurzel.stderr.length : null,
    ergebnisobjekt:
      ergebnisobjekt === null
        ? { status: 'kein_ergebnisobjekt' }
        : {
            status: 'ok',
            permissionDenials: {
              anzahl: denials.length,
              toolNamen: [...new Set(denials.map((d) => d.tool_name).filter((t) => typeof t === 'string'))],
            },
          },
  }
}

/**
 * Kopfdaten eines einzelnen Laufs (AK2) — die schlanke Projektion für GET
 * /api/laeufe. Ruft ladeGueltigeCheckpoints genau einmal auf (D1, F-140);
 * die volle Checkpoint-Projektion liefert erst GET /api/laeufe/<laufId>
 * (sammleCheckpoints, unverändert). zeitpunkt kommt aus payload.erstellt_am
 * des letzten gültigen Eintrags (AK3, E-M2-5) — statSync/mtime wird hier
 * nicht mehr gelesen; fehlt erstellt_am (Bestandsdaten), liefert dieses
 * Feld null. auftragsbezug kommt seit F12 WS-3 (F-147) aus baueAuftragsbezug
 * (status 'ok') → { auftragId, titel }, sonst null — auftragstext bleibt
 * bewusst außen vor (D4 aus WS-2 gilt weiter, nur die Detailansicht braucht
 * den Volltext).
 * @param laufId - Lauf-Kennung
 * @param basisVerzeichnis - Kontrollzustand-Wurzel
 * @param auftragMemo - Request-lokales Memo für baueAuftragsbezug (F-147, Q2)
 * @returns Kopfdaten, oder null, wenn das Verzeichnis keine echte Laufkette ist (AK1)
 */
function sammleLaufKopfdaten(laufId, basisVerzeichnis, auftragMemo) {
  const gueltigeEintraege = ladeGueltigeCheckpoints(laufId, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
  if (!istLaufkette(gueltigeEintraege)) return null

  const verzeichnis = join(basisVerzeichnis, laufId, 'checkpoints')
  const alleDateien = existsSync(verzeichnis) ? readdirSync(verzeichnis).filter((datei) => DATEINAME_MUSTER.test(datei)) : []
  const kettenintegritaet = gueltigeEintraege.length === alleDateien.length
  const laufStatus = stelleLaufstatusFest(laufId, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
  const letzter = gueltigeEintraege.at(-1)

  const auftragsbezugVoll = baueAuftragsbezug(ladeKontextpaketVersion(laufId, basisVerzeichnis), basisVerzeichnis, auftragMemo)
  const auftragsbezug = auftragsbezugVoll.status === 'ok' ? { auftragId: auftragsbezugVoll.auftragId, titel: auftragsbezugVoll.titel } : null

  return {
    laufId,
    laufStatus,
    ergebnis: laufStatus.status === 'ABGESCHLOSSEN' ? laufStatus.ergebnis : null,
    zeitpunkt: letzter?.payload.erstellt_am ?? null,
    auftragsbezug,
    anzahlCheckpoints: gueltigeEintraege.length,
    kettenintegritaet,
  }
}

/**
 * Liefert die Kopfdaten aller echten Läufe unter basisVerzeichnis (AK1,
 * AK2) — reine F2-Lineage-Ketten ohne jede Wirkungsmarke werden
 * inhaltsbasiert ausgefiltert (istLaufkette), nicht über den
 * lauf_id-Präfix. auftragMemo (F-147, Q2) lebt genau einen Aufruf lang —
 * eine von mehreren Läufen geteilte Auftragskette wird pro Poll nur einmal
 * geladen, kein serverübergreifender Cache.
 * @param basisVerzeichnis - Kontrollzustand-Wurzel (Default 'kontrollzustand', überschreibbar für Tests)
 * @returns Liste aller Lauf-Kopfdaten
 */
function sammleLaeufe(basisVerzeichnis = BASISVERZEICHNIS) {
  if (!existsSync(basisVerzeichnis)) return []
  const auftragMemo = new Map()
  return readdirSync(basisVerzeichnis, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
    .map((laufId) => sammleLaufKopfdaten(laufId, basisVerzeichnis, auftragMemo))
    .filter((kopfdaten) => kopfdaten !== null)
}

/** Verzeichnispräfix eines Auftrags unter basisVerzeichnis (Abschnitt 0 des Plans — registriereAuftrag→registriereKernArtefakt schreibt real unter lineage-auftrag-<auftragId>, nicht auftrag-<auftragId>). */
const AUFTRAG_VERZEICHNIS_PRAEFIX = 'lineage-auftrag-'

/**
 * Kopfdaten aller Aufträge unter basisVerzeichnis (AK4) — es gibt keine
 * Lineage-Registry-Funktion, die alle Artefakt-IDs einer Art listet
 * (Abschnitt 0), deshalb selbst per Verzeichnis-Scan gefiltert (Muster
 * sammleLaeufe). auftragstext bewusst NICHT enthalten (D4, Q2/Offene
 * Frage 2) — nur beim Start/in der Detailansicht relevant. Ein Auftrag,
 * dessen Kette keine gültige Version mehr liefert, wird übersprungen statt
 * den gesamten Request 500en zu lassen (Q4).
 * @param basisVerzeichnis - Kontrollzustand-Wurzel
 * @returns Kopfdaten je Auftrag, neueste zuerst (erstellt_am, Fallback Verzeichnis-mtime)
 */
function sammleAuftraege(basisVerzeichnis = BASISVERZEICHNIS) {
  if (!existsSync(basisVerzeichnis)) return []
  const eintraege = []
  for (const verzeichnisName of readdirSync(basisVerzeichnis, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()) {
    if (!verzeichnisName.startsWith(AUFTRAG_VERZEICHNIS_PRAEFIX)) continue
    const auftragId = verzeichnisName.slice(AUFTRAG_VERZEICHNIS_PRAEFIX.length)
    const version = ladeArtefaktVersion(`auftrag-${auftragId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
    if (version === null) continue
    const erstelltAm = version.daten?.erstellt_am ?? statSync(join(basisVerzeichnis, verzeichnisName)).mtime.toISOString()
    eintraege.push({ auftragId, titel: version.daten?.titel, erstellt_am: erstelltAm })
  }
  eintraege.sort((a, b) => (a.erstellt_am < b.erstellt_am ? 1 : a.erstellt_am > b.erstellt_am ? -1 : 0))
  return eintraege
}

const WORKFLOW_VERZEICHNIS_PRAEFIX = 'lineage-workflow-'

/**
 * Das Verdikt des Schritt-Automaten zu EINEM Workflow, als Projektion für die
 * Ansicht (F15 WS-3b, löst F-253).
 *
 * WARUM DER SERVER DAS MITLIEFERT: der Zustand "ein fälliger ZWINGEND-Schritt
 * wartet auf einen Menschen" ist ABGELEITET, nicht persistiert. Trägt der
 * ERSTE Schritt eines Workflows ZWINGEND, ist nichts gelaufen, also steht
 * nirgends WARTET_FREIGABE — und genau dort ist der Mensch die einzige
 * Entscheidungsinstanz. Die Oberfläche darf diesen Zustand nicht selbst
 * ausrechnen (D5, kein zweiter Regelsatz im Browser); sie rendert das Verdikt,
 * das hier entsteht.
 *
 * Quelle ist ausschließlich ermittleNaechstenSchritt OHNE Vorschrittergebnis —
 * dieselbe Funktion und derselbe Aufruf, den POST /api/workflows/<id>/starten
 * und POST /api/workflows/<id>/freigabe für ihre Entscheidung benutzen. Was
 * die Ansicht anbietet, kann deshalb nicht auseinanderlaufen mit dem, was der
 * Endpunkt annimmt.
 *
 * AUFLAGE, bitte stehen lassen: 'naechster' ist eine PROJEKTION, kein Feld von
 * WORKFLOW_V0. Es wird nirgends persistiert, steht in keinem Schema und darf
 * in keinen Schreibpfad geraten — wer es in einen Artefaktinhalt schreibt,
 * erzeugt eine zweite Wahrheit über den Automatenzustand neben der Regel, die
 * ihn berechnet (§16.2). Die einzigen Felder, die der Automat wirklich ABLEGT,
 * sind status, aktiver_schritt_id und grund.
 *
 * Ungültige Fassung -> null: ermittleNaechstenSchritt setzt einen bereits
 * validierten Datensatz voraus (sie greift ungeprüft auf daten.schritte zu)
 * und würde auf einer kaputten Fassung werfen. null heißt "nicht bestimmbar",
 * und der Detailendpunkt liefert daneben die Verstöße, aus denen hervorgeht,
 * warum.
 * @param daten - WORKFLOW_V0-Datensatz einer geladenen Artefaktversion
 * @param verstoesse - bereits ermitteltes validiereWorkflowDaten-Ergebnis, wenn der Aufrufer es ohnehin hat
 * @returns { art, schrittId, grund } oder null, wenn die Fassung nicht validiert
 */
function baueNaechsterProjektion(daten, verstoesse = undefined) {
  if ((verstoesse ?? validiereWorkflowDaten(daten)).length > 0) return null
  const ausgang = ermittleNaechstenSchritt(daten)
  // Nur zwei der sechs Ausgänge FÜHREN einen Schritt in einem eigenen Feld: 'starte' den ganzen
  // Schritt, 'haltFreigabe' die Kennung. Die übrigen vier tragen `schrittId` nicht — das heißt
  // aber NICHT, dass kein Schritt gemeint wäre (Reviewer-/QA-Pass 10.09.2026): 'haltKlaerung'
  // und 'haltGestoppt' führen sehr wohl einen `aktiverSchrittId`, und bei Regel 3 und 4 ist das
  // genau der blockierende Schritt. Ihn hier zusätzlich zu projizieren hieße, Cursor und
  // Blockierer in EIN Feld zu legen — zwei verschiedene Aussagen unter einem Namen. Der Verlust
  // ist real und als F-263 festgehalten; er wird hier nicht durch eine Vermischung geheilt.
  const schrittId = ausgang.art === 'starte' ? ausgang.schritt.schritt_id : (ausgang.schrittId ?? null)
  return { art: ausgang.art, schrittId, grund: beschreibeAutomatAusgang(ausgang) }
}

/**
 * Kopfdaten eines WORKFLOW_V0-Datensatzes für die Listenansicht (F15
 * WS-2a) — die Projektion, die GET /api/workflows je Eintrag liefert.
 * schritte[] bleibt bewusst draußen (Muster sammleAuftraege, das
 * auftragstext ebenfalls nur im Detail liefert): eine Liste zeigt, wo ein
 * Workflow steht, nicht seinen ganzen Inhalt.
 *
 * F15 WS-3a (löst F-221 (a)): grund gehört dazu. Eine Liste, die
 * KLAERUNG_ERFORDERLICH oder GESTOPPT ohne Grund zeigt, ist genau die
 * Ansicht, wegen der WS-2c (a) das Feld eingeführt hat — der Automat hält
 * an, während niemand hinsieht, und die Startfehlerliste ist flüchtig.
 * Anders als schritte[] ist grund ein Kopfdatum, kein Inhalt: er sagt, WO
 * der Workflow steht, nicht was in ihm steht.
 * @param workflowId - Kennung aus dem Verzeichnisnamen
 * @param version - geladene Artefaktversion (ladeArtefaktVersion)
 * @returns Kopfdaten-Objekt für die Liste
 */
function baueWorkflowKopfdaten(workflowId, version) {
  const daten = version.daten ?? {}
  return {
    workflowId,
    auftragId: daten.auftrag_id ?? null,
    ziel: daten.ziel ?? null,
    status: daten.status ?? null,
    aktiverSchrittId: daten.aktiver_schritt_id ?? null,
    grund: daten.grund ?? null,
    // F15 WS-3b (löst F-253): das Automaten-Verdikt gehört auch in die LISTE,
    // nicht nur ins Detail. Der Kern des Befunds ist, dass der Mensch sehen
    // muss, WO er gebraucht wird, ohne jeden Workflow einzeln zu öffnen — und
    // die Daten sind ohnehin geladen, es ist reine Rechnung ohne zusätzliches
    // I/O. Wie grund ist das Verdikt ein Kopfdatum, kein Inhalt: es sagt, wo
    // der Workflow steht, nicht was in ihm steht.
    naechster: baueNaechsterProjektion(daten),
    schritteAnzahl: Array.isArray(daten.schritte) ? daten.schritte.length : 0,
    versionSequenz: version.versionSequenz,
  }
}

/**
 * Kopfdaten aller Workflows unter basisVerzeichnis (F15 WS-2a) — derselbe
 * Verzeichnis-Scan wie sammleAuftraege, aus demselben Grund: es gibt keine
 * Lineage-Registry-Funktion, die alle Artefakt-IDs einer Art listet. Ein
 * Workflow, dessen Kette keine gültige Version mehr liefert, wird
 * übersprungen statt den gesamten Request 500en zu lassen.
 *
 * Sortierung: alphabetisch nach workflowId (readdirSync().sort()) — anders
 * als sammleAuftraege, das nach erstellt_am sortiert. WORKFLOW_V0 hat kein
 * Zeitfeld; eine Sortierung nach Verzeichnis-mtime wäre genau der
 * Ersatzwert, den E-M2-5/F-141 aus der Laufliste entfernt haben.
 * @param basisVerzeichnis - Kontrollzustand-Wurzel
 * @returns Kopfdaten je Workflow, alphabetisch nach workflowId
 */
function sammleWorkflows(basisVerzeichnis = BASISVERZEICHNIS) {
  if (!existsSync(basisVerzeichnis)) return []
  const eintraege = []
  for (const verzeichnisName of readdirSync(basisVerzeichnis, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()) {
    if (!verzeichnisName.startsWith(WORKFLOW_VERZEICHNIS_PRAEFIX)) continue
    const workflowId = verzeichnisName.slice(WORKFLOW_VERZEICHNIS_PRAEFIX.length)
    const version = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
    if (version === null) continue
    eintraege.push(baueWorkflowKopfdaten(workflowId, version))
  }
  return eintraege
}

/** Reine Formprüfung eines POST /api/auftraege-Bodys (AK4) — beide Felder nicht-leere Strings, keine Zweitvalidierung des Auftragsinhalts über registriereAuftrags Feldregeln hinaus (D5, Q2). @param body - geparster JSON-Body @returns bei Erfolg titel/auftragstext, sonst grund der Ablehnung */
export function pruefeAuftragsformular(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, grund: 'Body muss ein JSON-Objekt sein' }
  }
  for (const feld of Object.keys(body)) {
    if (!ERLAUBTE_AUFTRAG_FELDER.has(feld)) {
      return { ok: false, grund: `unbekanntes Feld '${feld}'` }
    }
  }
  if (typeof body.titel !== 'string' || body.titel.length === 0) {
    return { ok: false, grund: "'titel' muss ein nicht-leerer String sein" }
  }
  if (typeof body.auftragstext !== 'string' || body.auftragstext.length === 0) {
    return { ok: false, grund: "'auftragstext' muss ein nicht-leerer String sein" }
  }
  return { ok: true, titel: body.titel, auftragstext: body.auftragstext }
}

const ENTSCHEIDUNG_ARTEN = new Set(['antwort', 'stale', 'terminal', 'kenntnisnahme'])
const ENTSCHEIDUNG_EINSTUFUNG_WERTE = new Set(['ERFOLGREICH', 'VERWEIGERT'])
const ENTSCHEIDUNG_ENTSCHEIDUNG_WERTE = new Set(['neu_erzeugen', 'nachtrag', 'unveraendert_gueltig'])
const ENTSCHEIDUNG_ERGEBNIS_WERTE = new Set(['ERFOLGREICH', 'VERWEIGERT', 'FEHLGESCHLAGEN'])

/**
 * Reine Formprüfung eines POST /api/entscheidungen-Bodys (F13 WS-2, AK3) —
 * lehnt ein unbekanntes `art`, eine unzulässige laufId (Muster GET
 * /api/laeufe/<laufId>, D5 — dieselbe Zeichenregel) und je Art fehlende/
 * ungültige Pflichtfelder ab, BEVOR irgendetwas geschrieben wird (D2).
 * `begruendung` ist bei art 'terminal' Pflicht (F-162, das Wirkungsmarke-
 * Schema kennt kein erzeuger-Feld) — bei 'stale' bleibt sie optional, die
 * eigentliche Pflicht nur bei entscheidung 'unveraendert_gueltig' erzwingt
 * bereits haltFestStaleEntscheidung selbst (D5, keine Zweitprüfung hier).
 * F13 WS-4: `begruendung` ist auch bei art 'kenntnisnahme' Pflicht — kein
 * `ergebnis`-Feld erlaubt, das kommt serverseitig aus stelleLaufstatusFest
 * (verhindert Divergenz zwischen angezeigtem und festgehaltenem Ergebnis).
 * @param body - geparster JSON-Body
 * @returns bei Erfolg die geprüften Felder, sonst { ok: false, grund }
 */
export function pruefeEntscheidungsformular(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, grund: 'Body muss ein JSON-Objekt sein' }
  }
  if (!ENTSCHEIDUNG_ARTEN.has(body.art)) {
    return { ok: false, grund: `unbekannte Entscheidungsart ${JSON.stringify(body.art)} — erlaubt: ${[...ENTSCHEIDUNG_ARTEN].join(', ')}` }
  }
  if (typeof body.laufId !== 'string' || body.laufId.length === 0) {
    return { ok: false, grund: "'laufId' muss ein nicht-leerer String sein" }
  }
  if (LAUFID_UNZULAESSIGE_ZEICHEN.test(body.laufId)) {
    return { ok: false, grund: `'laufId' enthält unzulässige Zeichen: ${JSON.stringify(body.laufId)}` }
  }

  if (body.art === 'antwort') {
    for (const feld of Object.keys(body)) {
      if (!new Set(['art', 'laufId', 'antwort', 'einstufung']).has(feld)) {
        return { ok: false, grund: `unbekanntes Feld '${feld}' für art 'antwort'` }
      }
    }
    if (typeof body.antwort !== 'string' || body.antwort.length === 0) {
      return { ok: false, grund: "'antwort' muss ein nicht-leerer String sein" }
    }
    if (!ENTSCHEIDUNG_EINSTUFUNG_WERTE.has(body.einstufung)) {
      return { ok: false, grund: `'einstufung' muss eines von ${[...ENTSCHEIDUNG_EINSTUFUNG_WERTE].join(', ')} sein, erhalten: ${JSON.stringify(body.einstufung)}` }
    }
    return { ok: true, art: 'antwort', laufId: body.laufId, antwort: body.antwort, einstufung: body.einstufung }
  }

  if (body.art === 'stale') {
    for (const feld of Object.keys(body)) {
      if (!new Set(['art', 'laufId', 'entscheidung', 'begruendung']).has(feld)) {
        return { ok: false, grund: `unbekanntes Feld '${feld}' für art 'stale'` }
      }
    }
    if (!ENTSCHEIDUNG_ENTSCHEIDUNG_WERTE.has(body.entscheidung)) {
      return { ok: false, grund: `'entscheidung' muss eines von ${[...ENTSCHEIDUNG_ENTSCHEIDUNG_WERTE].join(', ')} sein, erhalten: ${JSON.stringify(body.entscheidung)}` }
    }
    if (body.begruendung !== undefined && (typeof body.begruendung !== 'string' || body.begruendung.length === 0)) {
      return { ok: false, grund: "'begruendung' muss, wenn angegeben, ein nicht-leerer String sein" }
    }
    return { ok: true, art: 'stale', laufId: body.laufId, entscheidung: body.entscheidung, begruendung: body.begruendung }
  }

  if (body.art === 'kenntnisnahme') {
    for (const feld of Object.keys(body)) {
      if (!new Set(['art', 'laufId', 'begruendung']).has(feld)) {
        return { ok: false, grund: `unbekanntes Feld '${feld}' für art 'kenntnisnahme'` }
      }
    }
    if (typeof body.begruendung !== 'string' || body.begruendung.length === 0) {
      return { ok: false, grund: "'begruendung' muss ein nicht-leerer String sein (Pflichtfeld bei art 'kenntnisnahme')" }
    }
    return { ok: true, art: 'kenntnisnahme', laufId: body.laufId, begruendung: body.begruendung }
  }

  // art === 'terminal'
  for (const feld of Object.keys(body)) {
    if (!new Set(['art', 'laufId', 'ergebnis', 'begruendung']).has(feld)) {
      return { ok: false, grund: `unbekanntes Feld '${feld}' für art 'terminal'` }
    }
  }
  if (!ENTSCHEIDUNG_ERGEBNIS_WERTE.has(body.ergebnis)) {
    return { ok: false, grund: `'ergebnis' muss eines von ${[...ENTSCHEIDUNG_ERGEBNIS_WERTE].join(', ')} sein, erhalten: ${JSON.stringify(body.ergebnis)}` }
  }
  if (typeof body.begruendung !== 'string' || body.begruendung.length === 0) {
    return { ok: false, grund: "'begruendung' muss ein nicht-leerer String sein (F-162, Pflichtfeld bei art 'terminal')" }
  }
  return { ok: true, art: 'terminal', laufId: body.laufId, ergebnis: body.ergebnis, begruendung: body.begruendung }
}

/**
 * Dekodiert ein Pfadsegment und liefert null statt zu werfen (F15 WS-2a).
 * decodeURIComponent wirft bei kaputter Prozentkodierung ('%', '%zz') einen
 * URIError. requestHandler ist eine async function, deren Promise niemand
 * awaitet — ein ungefangener Wurf wird zur unhandled rejection und beendet
 * unter Node 24 den Prozess. Genau das schließt F10 AK6 aus, und real
 * reproduziert: `GET /api/workflows/%` beendete den Server (Reviewer-/
 * QA-Pass 10.09.2026).
 *
 * Bekannte Grenze, bewusst nicht in diesem Auftrag behoben: dieselbe Lücke
 * besteht seit F12/F14 in GET /api/laeufe/<laufId> und POST
 * /api/laeufe/<laufId>/abbrechen. Sie dort zu schließen ändert das Verhalten
 * zweier Endpunkte außerhalb des WS-2a-Zuschnitts (heute Prozesstod, danach
 * 400) — das ist eine eigene, kleine Iteration und Stefans Entscheidung,
 * kein stiller Nebeneffekt dieses Auftrags.
 * @param segment - rohes, noch kodiertes Pfadsegment
 * @returns dekodiertes Segment, oder null bei kaputter Kodierung
 */
function dekodiereSegment(segment) {
  try {
    return decodeURIComponent(segment)
  } catch {
    return null
  }
}

function sendeDatei(res, pfad) {
  const inhalt = readFileSync(pfad)
  res.writeHead(200, { 'Content-Type': CONTENT_TYPES[extname(pfad)] ?? 'application/octet-stream' })
  res.end(inhalt)
}

function sendeJson(res, statusCode, wert) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(wert))
}

/** Top-Level-Felder eines Startauftrags, die AusfuehrungsOptionen (src/execution-controller/types.ts) zuzuordnen sind — AK3, nie aus dem Body gelesen. */
export const VERBOTENE_OPTIONEN_FELDER = new Set([
  'schreiber',
  'basisVerzeichnis',
  'rohBasisVerzeichnis',
  'starter',
  'settingsPfad',
  'aktuelleAutorisierungPfad',
  'startfreigabeRepoWurzel',
  // F14 WS-1, AK2: neu in AusfuehrungsOptionen (src/execution-controller/types.ts), PFLICHT-Nachtrag.
  'zeitgrenzeMs',
  // F14 WS-4, AK7: ebenso — entsteht serverseitig (ein AbortController je aktivem Lauf), kommt nie über den Body.
  'abbruchSignal',
])

/**
 * Zulässige Form eines output_schema-Werts (F16 WS-3a, AK10). Positive
 * Allowlist statt einer Liste verbotener Zeichen: Kleinbuchstaben, Ziffern
 * und Bindestriche, beginnend mit Buchstabe oder Ziffer. Alle mitgelieferten
 * Schemata unter schemas/ tragen bereits Namen dieser Form. Begründung am
 * Kopf von loeseAusgabeSchemaAuf.
 */
const SCHEMANAME_MUSTER = /^[a-z0-9][a-z0-9-]*$/

/** Erlaubte Top-Level-Felder eines Startauftrags (AK2, F11 WS-2 AK4/AK5) — laufId plus die AusfuehrungsEingaben-Felder, die noch aus dem Body kommen, plus werkzeugsatz (Name aus der Startvorlage) und optional vorgaengerLaufId. werkzeugStartziel/werkzeugVersionDeklariert/berechtigungskontext/profilReferenz sind NICHT mehr erlaubt (VERBOTENE_STARTVORLAGE_FELDER) — sie kommen serverseitig aus der Startvorlage. */
const ERLAUBTE_STARTAUFTRAG_FELDER = new Set(['laufId', 'rolle', 'anfragen', 'budget', 'aufrufEingaben', 'auftragId', 'werkzeugsatz', 'vorgaengerLaufId'])

/** F11 WS-2, AK5: diese vier Felder sind jetzt Sache der Startvorlage, nicht mehr des Body — ein Vorkommen wird wie ein AusfuehrungsOptionen-Feld mit 400 abgelehnt, nicht still ignoriert. */
export const VERBOTENE_STARTVORLAGE_FELDER = new Set(['werkzeugStartziel', 'werkzeugVersionDeklariert', 'berechtigungskontext', 'profilReferenz'])

/** F12 WS-2, AK5: auftragstext kommt jetzt ausschließlich aus dem Auftragsartefakt (ladeArtefaktVersion) — ein Vorkommen im Body wird wie ein Startvorlage-Feld mit 400 abgelehnt, nicht still ignoriert (Muster F11 WS-2 AK5). */
export const VERBOTENE_AUFTRAG_FELDER = new Set(['auftragstext'])

/**
 * Workflow-Status, in denen POST /api/workflows eine neue Fassung mit 409 ablehnt (F15 WS-2b).
 * Bewusst eine SPERRliste und keine Allowlist — anders als bei den Entscheidungsregeln in
 * src/workflow/index.ts ist die sichere Richtung hier "erlauben", nicht "anhalten": ein
 * Workflow, den niemand mehr ersetzen darf, ist zugemauert, und der Mensch verliert seinen
 * Reparaturzug. Ein künftig ergänzter WORKFLOW_STATUS ist deshalb erst einmal ersetzbar und
 * muss hier eine bewusste Zeile bekommen, wenn er es nicht sein soll.
 */
const GESPERRTE_ERSETZUNGS_STATUS = new Set(['LAEUFT', 'WARTET_FREIGABE', 'ABGESCHLOSSEN'])

/** Nur für den Ablehnungstext — die Gegenmenge zu GESPERRTE_ERSETZUNGS_STATUS, damit der Mensch liest, was geht. */
const ERSETZBARE_STATUS_TEXT = ['OFFEN', 'KLAERUNG_ERFORDERLICH', 'GESTOPPT']

/**
 * Zustände, aus denen POST /api/workflows/<id>/stoppen einen Workflow stoppt
 * (F15 WS-2c (b2), löst F-216).
 *
 * Die Gegenmenge ist klein und absichtlich so: bei ABGESCHLOSSEN und GESTOPPT
 * gibt es nichts mehr anzuhalten — der Automat setzt aus keinem der beiden
 * fort (Regel 0), und ein zweiter Stopp überschriebe nur die Begründung des
 * ersten mit einer jüngeren. Beide enden als 409.
 *
 * NICHT gemeint ist „dort läuft kein Prozess mehr" (Reviewer-Pass 10.09.2026):
 * unmittelbar nach einem Stopp mitten im Schritt steht der Workflow auf
 * GESTOPPT, während der abgebrochene Lauf noch fliegt — das ist der
 * Normalfall, den check-f15-automat-real.mjs (e) belegt, nicht die Ausnahme.
 * Wer diesen Lauf beenden will, benutzt POST /api/laeufe/<laufId>/abbrechen.
 *
 * ALLOWLIST wie überall in F15: ein künftiger WORKFLOW_STATUS, den niemand
 * hier einträgt, ist nicht stoppbar — die sichere Richtung, weil ein nicht
 * gestoppter Workflow sichtbar bleibt, ein fälschlich gestoppter dagegen eine
 * laufende Kette abreißt.
 */
const STOPPBARE_WORKFLOW_STATUS = new Set(['OFFEN', 'LAEUFT', 'WARTET_FREIGABE', 'KLAERUNG_ERFORDERLICH'])

/**
 * Vergleicht zwei Fassungen desselben Workflows und meldet jeden Schritt, der
 * dabei seine Freigabepflicht verliert (F15 WS-2c (b3), löst F-226).
 *
 * Der zweite Weg an der Freigabe vorbei: ein ZWINGEND-Schritt lässt sich seit
 * (b1) über POST /api/workflows/<id>/freigabe auflösen — mit Pflichtbegründung
 * und Entscheidungsartefakt —, aber ebenso über eine neue Fassung, in der
 * derselbe Schritt AUTOMATISCH trägt. Der Bedrohungsfall ist nicht
 * Böswilligkeit, sondern Unachtsamkeit: der Mensch ändert einen Plan und merkt
 * nicht, dass er dabei eine Freigabepflicht verloren hat — der Automat fährt
 * den Schritt danach unbeaufsichtigt.
 *
 * Zwei Formen von Abschwächung, beide gleich behandelt:
 *   - derselbe Schritt trägt nicht mehr ZWINGEND (nachher: der neue Wert),
 *   - der Schritt fehlt in der neuen Fassung ganz (nachher: null). Ein
 *     entfernter ZWINGEND-Schritt ist keine kleinere Änderung als ein
 *     abgestufter, sondern eine größere.
 *
 * ABSICHTLICH als "nicht mehr ZWINGEND" formuliert und nicht als Aufzählung
 * der beiden heutigen Gegenwerte (EMPFOHLEN, AUTOMATISCH): käme je eine vierte
 * Freigabestufe dazu, fiele sie sonst still aus der Bezeugungspflicht. Die
 * sichere Richtung ist hier die umgekehrte als bei den Allowlists in
 * ermittleNaechstenSchritt — dort heißt sie "hält an", hier "wird bezeugt".
 *
 * Die VERSCHÄRFUNG ist ausdrücklich frei: wer AUTOMATISCH auf ZWINGEND hebt,
 * legt sich selbst eine Pflicht auf und braucht dafür keine Begründung.
 * @param vorherigeSchritte - schritte-Liste der abgelegten Fassung
 * @param neueSchritte - schritte-Liste der eingereichten Fassung
 * @returns [{ schritt_id, vorher: 'ZWINGEND', nachher: <neuer Wert> | null }], leer bei keinem Treffer
 */
function ermittleFreigabeAbschwaechungen(vorherigeSchritte, neueSchritte) {
  if (!Array.isArray(vorherigeSchritte)) return []
  const neueNachId = new Map((Array.isArray(neueSchritte) ? neueSchritte : []).map((schritt) => [schritt?.schritt_id, schritt]))
  const treffer = []
  for (const alt of vorherigeSchritte) {
    if (alt?.freigabe !== 'ZWINGEND') continue
    const neu = neueNachId.get(alt.schritt_id)
    if (neu === undefined) {
      treffer.push({ schritt_id: alt.schritt_id, vorher: 'ZWINGEND', nachher: null })
      continue
    }
    if (neu.freigabe !== 'ZWINGEND') {
      treffer.push({ schritt_id: alt.schritt_id, vorher: 'ZWINGEND', nachher: neu.freigabe ?? null })
    }
  }
  return treffer
}

/** Erlaubte Top-Level-Felder eines POST /api/auftraege-Bodys (AK4). */
const ERLAUBTE_AUFTRAG_FELDER = new Set(['titel', 'auftragstext'])

/** Spiegelt src/checkpoint-store/index.ts' pruefeLaufId (nicht exportiert) — dieselbe rein strukturelle Zeichenregel, kein zweiter fachlicher Regelsatz (D5). Fängt einen unzulässigen Wert ab, BEVOR laufIdBelegt() ihn ungeprüft in einen existsSync-Pfad einsetzt. */
const LAUFID_UNZULAESSIGE_ZEICHEN = /[/\\]|\.\.|[\u0000-\u001f]/

const PFLICHT_STARTAUFTRAG_FELDER = ['laufId', 'rolle', 'anfragen', 'budget', 'aufrufEingaben', 'auftragId', 'werkzeugsatz']

/**
 * Prüft einen geparsten Startauftrag-Body gegen AK2/AK3 und F11 WS-2
 * AK5/AK6: nur die genannten Felder sind erlaubt, ein AusfuehrungsOptionen-
 * oder Startvorlage-Feld oder ein sonstiges unbekanntes Feld führt zur
 * Ablehnung — nicht stillem Ignorieren. Reine Formprüfung (Pflichtfelder,
 * Grundtypen), keine Datei-/Netz-I/O: die Auflösung von werkzeugsatz gegen
 * die Startvorlage und das Lesen der Evidenzdateien (AK6) macht der
 * Aufrufer danach. Die fachliche Prüfung von Rolle/Anfragen/Budget/
 * Aufrufkonstruktion bleibt F5/F6a vorbehalten (D5 — kein zweiter,
 * selbstgebauter Regelsatz).
 * @param body - geparster JSON-Body
 * @returns bei Erfolg laufId/werkzeugsatzName/eingaben, sonst grund der Ablehnung
 */
export function pruefeStartauftrag(body) {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, grund: 'Body muss ein JSON-Objekt sein' }
  }

  for (const feld of Object.keys(body)) {
    if (VERBOTENE_OPTIONEN_FELDER.has(feld)) {
      return { ok: false, grund: `Feld '${feld}' gehört zu AusfuehrungsOptionen und wird nicht aus dem Body gelesen (AK3)` }
    }
    if (VERBOTENE_STARTVORLAGE_FELDER.has(feld)) {
      return { ok: false, grund: `Feld '${feld}' gehört zur Startvorlage und wird nicht mehr aus dem Body gelesen (F11 WS-2 AK5)` }
    }
    if (VERBOTENE_AUFTRAG_FELDER.has(feld)) {
      return { ok: false, grund: `Feld '${feld}' wird serverseitig aus dem Auftragsartefakt geladen und nicht mehr aus dem Body gelesen (F12 WS-2 AK5)` }
    }
    if (!ERLAUBTE_STARTAUFTRAG_FELDER.has(feld)) {
      return { ok: false, grund: `unbekanntes Feld '${feld}'` }
    }
  }

  for (const feld of PFLICHT_STARTAUFTRAG_FELDER) {
    if (!(feld in body)) {
      return { ok: false, grund: `Pflichtfeld '${feld}' fehlt` }
    }
  }

  if (typeof body.laufId !== 'string' || body.laufId.length === 0) {
    return { ok: false, grund: "'laufId' muss ein nicht-leerer String sein" }
  }
  if (LAUFID_UNZULAESSIGE_ZEICHEN.test(body.laufId)) {
    return { ok: false, grund: `'laufId' enthält unzulässige Zeichen: ${JSON.stringify(body.laufId)}` }
  }
  if (typeof body.werkzeugsatz !== 'string' || body.werkzeugsatz.length === 0) {
    return { ok: false, grund: "'werkzeugsatz' muss ein nicht-leerer String sein (F11 WS-2 AK5 — Name eines in der Startvorlage benannten Werkzeugsatzes)" }
  }
  if (typeof body.auftragId !== 'string' || body.auftragId.length === 0) {
    return { ok: false, grund: "'auftragId' muss ein nicht-leerer String sein (F12 WS-2 AK5)" }
  }
  if (typeof body.aufrufEingaben === 'object' && body.aufrufEingaben !== null && !Array.isArray(body.aufrufEingaben) && 'werkzeugsatz' in body.aufrufEingaben) {
    return {
      ok: false,
      grund: "'aufrufEingaben.werkzeugsatz' ist eine freie erlaubte_werkzeuge-Liste und nicht mehr erlaubt (F11 WS-2 AK5) — wähle stattdessen einen benannten Werkzeugsatz über das Top-Level-Feld 'werkzeugsatz'",
    }
  }
  if (!Array.isArray(body.anfragen)) {
    return { ok: false, grund: "'anfragen' muss ein Array sein" }
  }
  for (const anfrage of body.anfragen) {
    if (typeof anfrage !== 'object' || anfrage === null || Array.isArray(anfrage)) {
      return { ok: false, grund: 'jede Anfrage muss ein Objekt sein' }
    }
    if ('inhalt' in anfrage) {
      return { ok: false, grund: "eine Anfrage darf kein Feld 'inhalt' enthalten — der Server liest die Datei selbst (F11 WS-2 AK6)" }
    }
    if (typeof anfrage.pfad !== 'string' || anfrage.pfad.length === 0) {
      return { ok: false, grund: "jede Anfrage braucht ein nicht-leeres 'pfad'-Feld" }
    }
  }
  if (body.vorgaengerLaufId !== undefined && typeof body.vorgaengerLaufId !== 'string') {
    return { ok: false, grund: "'vorgaengerLaufId' muss ein String sein" }
  }

  return {
    ok: true,
    laufId: body.laufId,
    werkzeugsatzName: body.werkzeugsatz,
    eingaben: {
      rolle: body.rolle,
      anfragen: body.anfragen,
      budget: body.budget,
      aufrufEingaben: body.aufrufEingaben,
      auftragId: body.auftragId,
      ...(body.vorgaengerLaufId !== undefined ? { vorgaengerLaufId: body.vorgaengerLaufId } : {}),
    },
  }
}

/**
 * Löst einen von einem Startauftrag benannten Evidenzpfad sicher gegen die
 * Repo-Wurzel auf (F11 WS-2, AK6). Reine Funktion, keine I/O — existsSync/
 * readFileSync bleiben Sache des Aufrufers. Drei Rot-Fälle, in dieser
 * Reihenfolge geprüft: absoluter Pfad, ein '..'-Segment, außerhalb der
 * Repo-Wurzel aufgelöst. Der dritte Fall nutzt F3s leiteRepoRelativenPfadAb
 * wieder (D5, keine zweite Pfadprüfung) — nach den ersten beiden Prüfungen
 * kann `join(repoWurzel, pfad)` die Repo-Wurzel nicht mehr über '..'
 * verlassen, die Wiederverwendung ist zusätzliche Tiefenverteidigung, kein
 * Ersatz für die ersten beiden Prüfungen.
 *
 * Bekannte Grenze (Reviewer-Pass, F11 WS-2): geprüft wird nur die logische
 * Pfad-Zeichenkette, nicht der aufgelöste Realpfad. Ein Symlink innerhalb
 * der Repo-Wurzel, der nach außen zeigt, besteht alle drei Prüfungen und
 * das anschließende readFileSync läse real außerhalb der Repo-Wurzel.
 * Angesichts des Bedrohungsmodells (Server bindet nur auf 127.0.0.1, ein
 * einziger lokaler Nutzer, F10 AK4) kein Blocker für WS-2, aber bewusst
 * nicht durch diese Funktion abgedeckt.
 *
 * CI-Rotfall (F11 WS-2, real auf dem Linux-CI-Runner beobachtet, lokal unter
 * Windows grün): node:path's isAbsolute() ist plattformabhängig — unter
 * POSIX erkennt es einen Windows-Laufwerksbuchstaben-Pfad (`C:\...`) oder
 * einen UNC-Pfad (`\\...`) NICHT als absolut, weil ein Doppelpunkt bzw.
 * Backslash dort kein reserviertes Pfad-Zeichen ist. AK6 verlangt aber die
 * Ablehnung JEDES absoluten Pfads, unabhängig vom Ausführungs-Betriebssystem
 * (das Repo läuft nachweislich auf beiden — CI auf Linux, Stefans
 * Dev-Rechner auf Windows). Deshalb zusätzlich zu isAbsolute() explizit auf
 * beide Muster geprüft, statt sich auf das plattformabhängige Verhalten von
 * node:path allein zu verlassen.
 * @param pfad - vom Startauftrag gelieferter Pfad (anfrage.pfad)
 * @param repoWurzel - absoluter Pfad der Repo-Wurzel
 * @returns bei Erfolg den repo-relativen Pfad, sonst einen Ablehnungsgrund
 */
const WINDOWS_LAUFWERKSBUCHSTABE_PFAD = /^[a-zA-Z]:[\\/]/
const WINDOWS_UNC_PFAD = /^\\\\/

export function loeseEvidenzPfadAuf(pfad, repoWurzel) {
  if (isAbsolute(pfad) || WINDOWS_LAUFWERKSBUCHSTABE_PFAD.test(pfad) || WINDOWS_UNC_PFAD.test(pfad)) {
    return { ok: false, grund: 'Pfad ist absolut' }
  }
  if (pfad.split(/[/\\]/).includes('..')) {
    return { ok: false, grund: "Pfad enthält ein '..'-Segment" }
  }
  const relativerPfad = leiteRepoRelativenPfadAb(join(repoWurzel, pfad), repoWurzel)
  if (relativerPfad === null) {
    return { ok: false, grund: 'Pfad liegt außerhalb der Repo-Wurzel' }
  }
  return { ok: true, relativerPfad }
}

/**
 * Löst einen geprüften Startauftrag zu fertigen AusfuehrungsEingaben auf
 * (F15 WS-2a) — verhaltensgleich aus dem POST /api/laeufe-Handler
 * extrahiert, wo dieser Block seit F11 WS-2 inline stand. Zwei Schritte,
 * unverändert in dieser Reihenfolge: (1) Werkzeugsatz über seinen Namen aus
 * der Startvorlage auflösen (F11 WS-2 AK4/AK5, nie über eine freie Liste),
 * (2) jede benannte Evidenzdatei selbst lesen — Pfadsicherheit VOR dem
 * Lesen, fehlende Datei → Ablehnung, nie leerer Inhalt (F11 WS-2 AK6).
 *
 * Warum überhaupt extrahiert: WS-2b startet Schritt n+1 eines Workflows und
 * braucht dieselben AusfuehrungsEingaben. Ein zweiter, eigener Weg dorthin
 * wäre eine zweite Fassung der AK6-Pfadprüfung — und die zweite Fassung ist
 * die, die beim nächsten Eingriff vergessen wird.
 *
 * KEINE HTTP-Kenntnis (kein res, kein sendeJson): die Funktion liefert einen
 * Ablehnungsgrund zurück, der Handler übersetzt ihn weiterhin selbst in
 * seine 400er — Muster der pruefe*-Funktionen oben. Ebenso wenig prüft sie
 * D13, laufIdBelegt oder die Existenz des Auftrags: diese drei stehen in
 * einer bewusst begründeten Reihenfolge im Handler und bleiben dort.
 * @param eingabenRoh - der eingaben-Teil aus pruefeStartauftrag
 * @param werkzeugsatzName - Name des Werkzeugsatzes aus dem Startauftrag
 * @param auftragstext - Text aus dem bereits geladenen Auftragsartefakt
 * @param vorlage - die geladene Startvorlage
 * @param repoWurzel - absoluter Pfad der Repo-Wurzel (AK6-Pfadsicherheit)
 * @returns bei Erfolg { ok: true, eingaben }, sonst { ok: false, grund }
 */
export function loeseAusfuehrungsEingabenAuf(eingabenRoh, werkzeugsatzName, auftragstext, vorlage, repoWurzel) {
  // Worker-Vorgabe (F16 WS-3a, AK11): fehlt das Feld, ist es 'claude-code'.
  // Dieselbe Lesart wie in der Laufakte (AK4) und im Result Evaluator (AK8) —
  // eine dritte, abweichende Vorgabe an dieser Stelle wäre der Anfang zweier
  // Wahrheiten darüber, was ein Lauf ohne worker-Angabe ist.
  //
  // Die Angabe kommt ausschließlich aus loeseSchrittEingabenAuf, nie aus einem
  // HTTP-Body: 'worker' steht nicht in ERLAUBTE_STARTAUFTRAG_FELDER, ein
  // Startauftrag mit diesem Feld wird schon in pruefeStartauftrag mit 400
  // abgelehnt. Ohne diese Sperre könnte ein Body den Berechtigungskontext
  // eines Laufs umdeklarieren.
  const worker = eingabenRoh.worker ?? 'claude-code'
  // ALLOWLIST, keine `=== 'codex'`-Abfrage mit stillem Rest (QA-Pass
  // 11.09.2026, Befund 7): ein unbekannter Worker fiele sonst in den
  // Claude-Code-Zweig und bekäme Startziel, Version und Berechtigungskontext
  // aus den flachen Vorlagenfeldern — samt des geplanten, womöglich
  // schreibenden Werkzeugsatzes. Dass ermittleNaechstenSchritt denselben Wert
  // schon abfängt, ist kein Ersatz: das ist eine Regel ANDERSWO, und genau
  // diese Konstruktion benennt src/workflow/index.ts in seinem eigenen
  // Kommentar als Fehler.
  if (worker !== 'claude-code' && worker !== 'codex') {
    return { ok: false, grund: `Worker '${worker}' ist keinem Aufrufbauer zugeordnet — bekannt: claude-code, codex` }
  }

  const werkzeugsatz = loeseWerkzeugsatzAuf(vorlage, werkzeugsatzName)
  if (werkzeugsatz === undefined) {
    return { ok: false, grund: `unbekannter Werkzeugsatz '${werkzeugsatzName}' — bekannt: ${Object.keys(vorlage.werkzeugsaetze).join(', ')}` }
  }

  // AK10, Ablehnung 5 von 6 (siehe die Zählung am Kopf von
  // loeseAusgabeSchemaAuf): codex + nicht-lesender Werkzeugsatz. Steht
  // HIER und nicht im Dispatcher, weil die Art eines Werkzeugsatzes erst nach
  // loeseWerkzeugsatzAuf feststeht — ermittleNaechstenSchritt kennt nur den
  // NAMEN und hat die Startvorlage überhaupt nicht (sie entscheidet, sie liest
  // nicht, siehe Kopf von src/workflow/index.ts). Ablehnung VOR dem
  // Prozessstart, nicht erst an der Sandbox: '--sandbox read-only' fängt die
  // Schreibwirkung zwar real ab (AK9), aber ein Lauf, der mit einem Werkzeugsatz
  // startet, den er strukturell nicht einlösen kann, ist ein Planungsfehler und
  // kein Laufergebnis. Schreibende Execution bleibt Claude Code (E-M3-2).
  // Formuliert als `art !== 'lesend'` und nicht als `art === 'schreibend'`
  // (Reviewer-Pass 11.09.2026, Befund 3): dieselbe Allowlist-Richtung wie in
  // src/workflow/index.ts. Wächst die Wertemenge von 'art' je um eine dritte
  // Stufe, fällt sie hier in "abgelehnt" statt lautlos in "erlaubt".
  if (worker === 'codex' && werkzeugsatz.art !== 'lesend') {
    return {
      ok: false,
      grund: `Worker 'codex' mit dem nicht-lesenden Werkzeugsatz '${werkzeugsatzName}' (art '${werkzeugsatz.art}') — schreibende Execution bleibt Claude Code (E-M3-2), Codex läuft strukturell nur lesend`,
    }
  }

  // AK11: Startziel, deklarierte Version und Berechtigungskontext kommen je
  // nach Worker aus verschiedenen Quellen. Die Asymmetrie — Claude-Code-Felder
  // flach an der Vorlagenwurzel, Codex genestet unter worker.codex — ist
  // bewusste v0-Schuld und in der Schema-description benannt (AK5).
  //
  // Für Codex ist der Berechtigungskontext KEIN Vorlagenfeld, sondern die
  // importierte Konstante des Gateways: '--sandbox read-only' steht fest im
  // Argv und ist über die Allowlist nicht abwählbar (AK2). Ein aus der Vorlage
  // umdeklarierbarer Kontext wäre eine Behauptung ohne Deckung.
  //
  // Ausdrücklich benannte Grenze (QA-Pass 11.09.2026, Befund 8): dieser Wert
  // hat im Codex-Zweig heute KEINEN Verbraucher. CodexGatewayEingaben trägt
  // kein berechtigungskontext-Feld; starteCodexGateway schreibt dieselbe
  // Konstante selbst in die Laufakte (AK7), und genau das ist die Absicht —
  // ein vom Aufrufer setzbarer Kontext wäre wieder umdeklarierbar. Der Wert
  // steht hier, damit die AusfuehrungsEingaben eines Codex-Laufs nicht den
  // FALSCHEN (Claude-Code-)Kontext behaupten, nicht weil er etwas bewirkt.
  // Dass beide Stellen denselben Wert führen, ist über den gemeinsamen Import
  // gesichert und nicht über zwei Literale.
  let werkzeugStartziel = vorlage.werkzeugStartziel
  let werkzeugVersionDeklariert = vorlage.werkzeugVersionDeklariert
  let berechtigungskontext = vorlage.berechtigungskontext
  if (worker === 'codex') {
    const codexBlock = vorlage.worker?.codex
    if (codexBlock === undefined) {
      // Ablehnung 6 von 6.
      return {
        ok: false,
        grund: "Worker 'codex' verlangt den Block 'worker.codex' in der Startvorlage (startziel, versionDeklariert, sandbox) — er fehlt",
      }
    }
    werkzeugStartziel = codexBlock.startziel
    werkzeugVersionDeklariert = codexBlock.versionDeklariert
    berechtigungskontext = CODEX_BERECHTIGUNGSKONTEXT
  }

  const anfragenMitInhalt = []
  for (const anfrage of eingabenRoh.anfragen) {
    const pfadErgebnis = loeseEvidenzPfadAuf(anfrage.pfad, repoWurzel)
    if (!pfadErgebnis.ok) {
      return { ok: false, grund: `Anfrage-Pfad '${anfrage.pfad}': ${pfadErgebnis.grund}` }
    }
    const zielPfad = join(repoWurzel, pfadErgebnis.relativerPfad)
    if (!existsSync(zielPfad) || !statSync(zielPfad).isFile()) {
      return { ok: false, grund: `Anfrage-Pfad '${anfrage.pfad}': Datei nicht gefunden` }
    }
    let inhalt
    try {
      inhalt = readFileSync(zielPfad, 'utf8')
    } catch (fehler) {
      return { ok: false, grund: `Anfrage-Pfad '${anfrage.pfad}': nicht lesbar (${fehler.message})` }
    }
    anfragenMitInhalt.push({ ...anfrage, inhalt })
  }

  return {
    ok: true,
    eingaben: {
      rolle: eingabenRoh.rolle,
      anfragen: anfragenMitInhalt,
      budget: eingabenRoh.budget,
      aufrufEingaben: { ...eingabenRoh.aufrufEingaben, werkzeugsatz: { modus: werkzeugsatz.modus, erlaubte_werkzeuge: werkzeugsatz.erlaubte_werkzeuge } },
      werkzeugStartziel,
      werkzeugVersionDeklariert,
      berechtigungskontext,
      auftragstext,
      auftragId: eingabenRoh.auftragId,
      ...(eingabenRoh.vorgaengerLaufId !== undefined ? { vorgaengerLaufId: eingabenRoh.vorgaengerLaufId } : {}),
      // worker/ausgabeSchemaPfad erscheinen NUR beim Codex-Zweig im Ergebnis
      // (F-286): ein Claude-Code-Lauf behält damit exakt den Feldsatz, den er
      // vor F16 hatte — byte-identisch, kein bestehender Test muss angepasst
      // werden. Die Vorgabe 'fehlend = claude-code' macht das tragbar; zwei
      // zusätzliche Felder mit Vorgabewerten wären hier reines Rauschen in
      // jedem einzelnen Claude-Code-Lauf.
      //
      // Beide stehen eine Ebene ÜBER aufrufEingaben, neben werkzeugStartziel.
      // aufrufEingaben ist der Parametersatz genau EINES Aufrufbauers, und
      // baueAufruf/baueCodexAufruf haben unterschiedliche Pflichtfelder — wer
      // den Worker dort hineinlegt, reicht dem einen Bauer ein Feld, das er
      // nicht kennt, und macht die Weiche unsichtbar.
      ...(worker !== 'claude-code' ? { worker } : {}),
      ...(worker === 'codex' ? { ausgabeSchemaPfad: eingabenRoh.ausgabeSchemaPfad ?? null } : {}),
    },
  }
}

/**
 * Löst schritt.output_schema — einen SCHEMANAMEN, keinen Pfad — zum absoluten
 * Pfad von schemas/<name>.schema.json auf (F16 WS-3a, AK10) und prüft die
 * Datei, bevor irgendein Prozess startet.
 *
 * Warum hier und nicht im Gateway (E-193 gilt nicht dagegen, sondern dafür):
 * baueCodexAufruf VERLANGT einen absoluten Pfad und wirft sonst — es nimmt
 * einen Pfad entgegen, es beschafft keinen. Die Beschaffung ist eine
 * Auflösung aus Planungsdaten gegen das Dateisystem des Repos, und die sitzt
 * in dieser Datei, gleich neben der AK6-Pfadsicherheit für Evidenzpfade. Ein
 * Gateway, das aus einem Namen einen Repo-Pfad baut, hätte damit eine zweite
 * Vorstellung davon, wo die Repo-Wurzel liegt.
 *
 * Vier der insgesamt sechs Ablehnungen des Dispatchers stehen hier (1)-(4);
 * die beiden übrigen sitzen in loeseAusfuehrungsEingabenAuf, weil sie die
 * geladene Startvorlage brauchen: (5) codex mit nicht-lesendem Werkzeugsatz,
 * (6) codex ohne worker.codex-Block. Alle sechs greifen vor dem Prozessstart
 * und alle als { ok: false, grund } statt eines Wurfs: ein fehlerhaft
 * geplanter Schritt ist ein Fachergebnis des Schrittstarts (der Automat hält
 * an und legt es dem Menschen vor), kein Konfigurationsfehler des Servers.
 *
 * (1) Der Name passt nicht auf SCHEMANAME_MUSTER. Das ist eine positive
 *     Allowlist (Kleinbuchstaben, Ziffern, Bindestriche) und keine Liste
 *     verbotener Zeichen (QA-Pass 11.09.2026, Befund 3). Eine Sperrliste aus
 *     '/', '\\' und '..' ließ real mehr durch, als sie sollte: unter Windows
 *     etwa 'C:x' oder 'gueltig:strom' — der Doppelpunkt öffnet einen
 *     NTFS-Alternate-Data-Stream, der Pfad zeigt dann auf ein Dateiobjekt,
 *     das der Name nicht meint. Die Allowlist nimmt zugleich die
 *     Groß-/Kleinschreibungsfrage aus der Welt: ein Name mit Großbuchstaben
 *     wird abgelehnt, statt auf NTFS zu funktionieren und auf einem
 *     case-sensitiven Dateisystem zu scheitern — derselbe Workflow-Datensatz
 *     wäre sonst plattformabhängig startbar. Alle mitgelieferten Schemata
 *     unter schemas/ tragen bereits Namen dieser Form.
 * (2) Die Datei existiert nicht ODER ist keine reguläre Datei (ein
 *     Verzeichnis 'name.schema.json/' fällt hierher). Ohne diese Prüfung
 *     liefe der Codex-Prozess an und scheiterte erst in seiner eigenen
 *     Fehlerbehandlung.
 * (3) Die Datei trägt eine UTF-8-BOM. Real gemessen (F-306,
 *     state/tp-m3-01-codex.md): Codex' JSON-Parser verträgt keine BOM, sein
 *     TOML-Parser schon — die Datei sieht in jedem Editor korrekt aus und
 *     zerstört den Lauf trotzdem. scripts/check-f16-codex-gateway.mjs (d)
 *     prüft dasselbe für alle mitgelieferten Schemata; diese Prüfung hier
 *     gilt auch dem Schema, das erst nach dem Gate-Lauf ins Repo kam.
 * (4) Die Wurzel trägt kein additionalProperties: false. Ebenfalls real
 *     gemessen (state/tp-m3-01-codex.md, Lauf 3): die Modell-API antwortet im
 *     Strict-Modus sonst mit HTTP 400 invalid_json_schema. Geprüft wird nur
 *     die WURZEL, nicht rekursiv — die rekursive Fassung steht im Gate für
 *     die mitgelieferten Schemata; hier soll die Ablehnung genau das treffen,
 *     was der gemessene Fehlerfall hergibt, und nicht mehr.
 * Zwei weitere Zweige lehnen ebenfalls ab, ohne eigene Nummer, weil sie
 * keine fachliche Regel sind, sondern ein kaputtes Artefakt: eine Datei, die
 * kein gültiges JSON ist, und eine, die sich nicht lesen lässt. Der
 * JSON-Zweig ist rot kalibriert (scripts/check-f16-codex-gateway.mjs (h),
 * Fall 'kaputtes-json'). Der Lesefehler-Zweig ist es NICHT und bleibt ein
 * unkalibrierter Defensivzweig: eine existierende reguläre Datei unlesbar zu
 * machen, verlangt eine ACL-Änderung, die ein Gate auf jedem Rechner anders
 * herbeiführen müsste. Hier ausdrücklich benannt statt stillschweigend
 * mitgezählt — ein Zweig ohne Rot-Fall heißt nach ARCHITECTURE.md §8 nicht
 * ERZWUNGEN, und ein Kommentar, der ihn trotzdem als kalibriert ausgibt,
 * wäre die schlimmere Hälfte davon (QA-Pass 11.09.2026, Nachprüfung).
 *
 * Symlinks sind ein benanntes Restrisiko, keine geprüfte Grenze: existsSync
 * und statSync FOLGEN Links, ein schemas/x.schema.json, das aus dem Repo
 * hinauszeigt, passiert diese Funktion. Voraussetzung dafür ist
 * Schreibzugriff auf schemas/ — wer den hat, kann die Schemadatei ohnehin
 * ersetzen, und die Auflösung ist nicht die Stelle, die das abwehren könnte.
 * @param name - der Wert von schritt.output_schema (nie null, das prüft der Aufrufer)
 * @param repoWurzel - absoluter Pfad der Repo-Wurzel
 * @returns bei Erfolg { ok: true, pfad } mit absolutem Pfad, sonst { ok: false, grund }
 */
export function loeseAusgabeSchemaAuf(name, repoWurzel) {
  if (typeof name !== 'string' || !SCHEMANAME_MUSTER.test(name)) {
    return {
      ok: false,
      grund: `output_schema ${JSON.stringify(name)} ist kein zulässiger Schemaname — erlaubt sind Kleinbuchstaben, Ziffern und Bindestriche (${SCHEMANAME_MUSTER.source}); ein Pfad ist es nie`,
    }
  }

  const pfad = join(repoWurzel, 'schemas', `${name}.schema.json`)
  if (!existsSync(pfad) || !statSync(pfad).isFile()) {
    return { ok: false, grund: `output_schema '${name}': schemas/${name}.schema.json nicht gefunden (fehlt oder ist keine reguläre Datei)` }
  }

  let inhalt
  try {
    inhalt = readFileSync(pfad, 'utf8')
  } catch (fehler) {
    return { ok: false, grund: `output_schema '${name}': schemas/${name}.schema.json nicht lesbar (${fehler.message})` }
  }

  // '﻿' an Position 0: readFileSync('utf8') entfernt die BOM NICHT, sie
  // erscheint als erstes Zeichen. Genau deshalb ist der Fehler im Editor
  // unsichtbar und hier prüfbar.
  if (inhalt.charCodeAt(0) === 0xfeff) {
    return { ok: false, grund: `output_schema '${name}': schemas/${name}.schema.json trägt eine UTF-8-BOM — Codex' JSON-Parser verträgt keine (F-306)` }
  }

  let geparst
  try {
    geparst = JSON.parse(inhalt)
  } catch (fehler) {
    return { ok: false, grund: `output_schema '${name}': schemas/${name}.schema.json ist kein gültiges JSON (${fehler.message})` }
  }
  if (typeof geparst !== 'object' || geparst === null || Array.isArray(geparst) || geparst.additionalProperties !== false) {
    return {
      ok: false,
      grund: `output_schema '${name}': schemas/${name}.schema.json trägt auf der Wurzel kein 'additionalProperties: false' — die Modell-API antwortet im Strict-Modus sonst mit HTTP 400 invalid_json_schema`,
    }
  }

  return { ok: true, pfad }
}

/**
 * Baut aus einem WORKFLOW_V0-Schritt dieselben AusfuehrungsEingaben, die
 * POST /api/laeufe aus einem Startauftrag-Body baut (F15 WS-2b, (A)/(B) des
 * Bauauftrags). Der letzte Schritt ist deshalb bewusst ein Aufruf von
 * loeseAusfuehrungsEingabenAuf und keine eigene Zusammenstellung: Werkzeugsatz-
 * Auflösung und AK6-Pfadprüfung sollen für Automat und HTTP-Start EIN Weg
 * bleiben, nicht zwei, von denen einer altert (Begründung wortgleich zur
 * Extraktion in WS-2a).
 *
 * Abbildung (Bauauftrag (A)):
 *   schritt.rolle            -> eingabenRoh.rolle
 *   schritt.werkzeugsatz     -> Name des Werkzeugsatzes in der Startvorlage
 *   schritt.modell           -> aufrufEingaben.modell (E-185/E-M3-3: das
 *                               gepinnte Plandatum des Schritts, nie
 *                               vorlage.modell)
 *   workflowDaten.auftrag_id -> eingabenRoh.auftragId
 *   schritt.eingaben[]       -> aufgelöste Artefakt-Anfragen, siehe unten
 * schritt.zeitgrenze_ms gehört NICHT hierher: es ist eine AusfuehrungsOption,
 * keine Eingabe, und wird vom Aufrufer an laufOptionen gereicht — dort
 * gewinnt es ebenso gegenüber vorlage.zeitgrenzeMs.
 *
 * budget kommt aus vorlage.standardBudget — der einzige verwendbare Wert, den
 * eine Serverkonfiguration dafür trägt (F11 WS-2 AK4). Ein Workflow-Schritt
 * hat keine eigene Budgetquelle: WORKFLOW_V0 kennt kein Budgetfeld, und ein
 * hier erfundener Default wäre eine stille fachliche Entscheidung. Damit weicht
 * der Automat bewusst von der F11-WS-2-[EMPFEHLUNG] ab, standardBudget nicht
 * anzuwenden — die galt für einen Body, der ein eigenes budget mitbringt; ein
 * Schritt bringt keins.
 *
 * (B) schritte[].eingaben: jede 'artefakt:<id>'-Referenz wird über
 * ladeArtefaktVersion aufgelöst und der Anfragenliste als notwendig:true-
 * Eintrag VORANGESTELLT — dasselbe Muster, mit dem
 * src/execution-controller/index.ts Auftrag, Laufakte und Entscheidung
 * einhängt, mit kanonischesJson(daten) als inhalt. Fehlt ein Artefakt, entsteht
 * KEINE Anfrage weniger, sondern eine Ablehnung, die die Artefakt-ID nennt: ein
 * Schritt, dem eine erklärte Eingabe fehlt, liefe mit stillschweigend weniger
 * Kontext, als der Mensch geplant hat.
 *
 * Auftrag, Laufakte und Entscheidung des Vorgängerlaufs werden hier NICHT
 * eingehängt — fuehreAufgabeDurch stellt genau diese drei selbst voran. Wer sie
 * zusätzlich in schritte[].eingaben schreibt, bekommt sie doppelt; das ist eine
 * Eigenschaft des Workflows, keine des Automaten.
 * @param schritt - der zu startende WORKFLOW_V0-Schritt (bereits validiert)
 * @param workflowDaten - der Workflow, zu dem der Schritt gehört
 * @param vorgaengerLaufId - lauf_id des Vorschritts, oder undefined beim ersten Schritt
 * @param auftragstext - Text aus dem bereits geladenen Auftragsartefakt
 * @param vorlage - die geladene Startvorlage
 * @param repoWurzel - absoluter Pfad der Repo-Wurzel (AK6-Pfadsicherheit)
 * @param ladeOptionen - basisVerzeichnis/schreiber für ladeArtefaktVersion
 * @returns bei Erfolg { ok: true, eingaben }, sonst { ok: false, grund }
 */
export function loeseSchrittEingabenAuf(schritt, workflowDaten, vorgaengerLaufId, auftragstext, vorlage, repoWurzel, ladeOptionen) {
  // AK10, ZUERST: der Schemaname wird aufgelöst und geprüft, bevor diese
  // Funktion irgendetwas lädt oder zusammenstellt. Die Reihenfolge ist die
  // Aussage (QA-Pass 11.09.2026, Befund 4): ein Schritt mit kaputtem
  // Ausgabeschema soll den Schemafehler melden und nicht zuerst über eine
  // fehlende Artefakt-Eingabe stolpern — der Schemaname ist die Angabe, die
  // der Mensch gerade geplant hat, die Artefakt-Referenz stand schon vorher
  // da. Gepinnt in scripts/check-f16-codex-gateway.mjs (h).
  //
  // Unabhängig vom Worker geprüft: ein claude-code-Schritt mit gesetztem
  // output_schema kommt hier gar nicht an (Regel 4b in
  // ermittleNaechstenSchritt hält ihn vorher), und eine zweite,
  // worker-abhängige Bedingung an dieser Stelle wäre ein stiller Durchlass,
  // falls diese Funktion je aus einem anderen Pfad gerufen wird.
  let ausgabeSchemaPfad = null
  if (schritt.output_schema !== null) {
    const schemaErgebnis = loeseAusgabeSchemaAuf(schritt.output_schema, repoWurzel)
    if (!schemaErgebnis.ok) {
      return { ok: false, grund: `Schritt '${schritt.schritt_id}': ${schemaErgebnis.grund}` }
    }
    ausgabeSchemaPfad = schemaErgebnis.pfad
  }

  const artefaktAnfragen = []
  for (const referenz of schritt.eingaben) {
    if (typeof referenz !== 'string' || !referenz.startsWith('artefakt:')) {
      return { ok: false, grund: `Schritt '${schritt.schritt_id}': Eingabe ${JSON.stringify(referenz)} ist keine 'artefakt:<id>'-Referenz` }
    }
    const artefaktId = referenz.slice('artefakt:'.length)
    // Dieselbe Zeichenregel wie für laufId/workflow_id (D5, kein zweiter Regelsatz): die
    // artefaktId geht über 'lineage-<id>' in einen Dateisystempfad ein, und ihr Wert stammt
    // aus einer Workflow-Payload, nicht aus dem Server. validiereWorkflowDaten verlangt an
    // dieser Stelle nur das Muster '^artefakt:.+'.
    if (artefaktId.length === 0 || LAUFID_UNZULAESSIGE_ZEICHEN.test(artefaktId)) {
      return { ok: false, grund: `Schritt '${schritt.schritt_id}': Eingabe-Artefakt-ID ${JSON.stringify(artefaktId)} enthält unzulässige Zeichen` }
    }
    const version = ladeArtefaktVersion(artefaktId, undefined, ladeOptionen)
    if (version === null) {
      return { ok: false, grund: `Schritt '${schritt.schritt_id}': Eingabe-Artefakt '${artefaktId}' nicht gefunden — der Schritt wird nicht gestartet` }
    }
    artefaktAnfragen.push({
      pfad: `artefakt:${artefaktId}`,
      frage: `Erklärte Eingabe des Workflow-Schritts '${schritt.schritt_id}'`,
      begruendung: `In schritte[].eingaben des Workflows '${workflowDaten.workflow_id}' festgelegt (F15 WS-2b)`,
      inhalt: kanonischesJson(version.daten),
      notwendig: true,
    })
  }

  // anfragen bleibt hier leer: ein Schritt benennt seine Eingaben ausschließlich als
  // Artefakt-Referenzen, nie als Dateipfade. Die aufgelösten Artefakt-Anfragen dürfen NICHT
  // durch loeseAusfuehrungsEingabenAuf laufen — die Funktion behandelt jede Anfrage als
  // repo-relativen Dateipfad und läse 'artefakt:...' als Datei, die es nicht gibt.
  const eingabenRoh = {
    rolle: schritt.rolle,
    anfragen: [],
    budget: vorlage.standardBudget,
    aufrufEingaben: { modell: schritt.modell },
    auftragId: workflowDaten.auftrag_id,
    // AK11/AK10: die beiden einzigen Felder, die ein Startauftrag über HTTP
    // NICHT setzen kann (nicht in ERLAUBTE_STARTAUFTRAG_FELDER) — sie stammen
    // ausschließlich aus dem geplanten Schritt.
    worker: schritt.worker,
    ausgabeSchemaPfad,
    ...(vorgaengerLaufId !== undefined ? { vorgaengerLaufId } : {}),
  }

  const ergebnis = loeseAusfuehrungsEingabenAuf(eingabenRoh, schritt.werkzeugsatz, auftragstext, vorlage, repoWurzel)
  if (!ergebnis.ok) {
    return { ok: false, grund: `Schritt '${schritt.schritt_id}': ${ergebnis.grund}` }
  }
  return { ok: true, eingaben: { ...ergebnis.eingaben, anfragen: [...artefaktAnfragen, ...ergebnis.eingaben.anfragen] } }
}

/**
 * Normalisiert ein AusfuehrungsErgebnis (F8) zu einem der drei SCHRITT_STATUS-
 * Ausgänge, die WORKFLOW_V0 für einen gelaufenen Schritt kennt (F15 WS-2b,
 * Schritt 8 des Bauauftrags).
 *
 * ALLOWLIST wie in ermittleNaechstenSchritt (Reviewer-Pass 10.09.2026, K2/R2):
 * ERFOLGREICH entsteht nur, wenn F7s Klassifikation UND F1Bs Laufstatus es
 * beide sagen. Jeder andere Ausgang — eine F5-/F6a-Ablehnung (ok:false), ein
 * KLAERUNG_ERFORDERLICH, ein Laufstatus, den diese Funktion nicht kennt —
 * fällt auf FEHLGESCHLAGEN und damit auf einen Workflow-Halt. Der Preis ist
 * eine überflüssige Rückfrage an den Menschen; der umgekehrte Fehler wäre eine
 * Automatik, die auf einem ungeklärten Lauf weiterrechnet.
 *
 * Bewusste Ungenauigkeit, ausdrücklich benannt: SCHRITT_STATUS kennt kein
 * KLAERUNG_ERFORDERLICH. Ein Lauf, der dort landet, erscheint am Schritt als
 * FEHLGESCHLAGEN; die Klärbedürftigkeit trägt der Workflow-Status
 * (KLAERUNG_ERFORDERLICH), nicht der Schritt.
 * @param ergebnis - Rückgabe von fuehreAufgabeDurch
 * @returns 'ERFOLGREICH', 'VERWEIGERT' oder 'FEHLGESCHLAGEN'
 */
export function normalisiereSchrittAusgang(ergebnis) {
  if (ergebnis?.ok !== true) return 'FEHLGESCHLAGEN'
  const klassifiziert = ergebnis.klassifikation?.ergebnis
  if (klassifiziert === 'ERFOLGREICH') {
    return ergebnis.laufStatus?.status === 'ABGESCHLOSSEN' && ergebnis.laufStatus.ergebnis === 'ERFOLGREICH' ? 'ERFOLGREICH' : 'FEHLGESCHLAGEN'
  }
  if (klassifiziert === 'VERWEIGERT') return 'VERWEIGERT'
  return 'FEHLGESCHLAGEN'
}

/**
 * Schreibt eine neue Workflow-Version, in der genau ein Schritt und die
 * Workflow-Felder status/aktiver_schritt_id/grund fortgeschrieben sind (F15
 * WS-2b, grund seit WS-2c). Kein Überschreiben: registriereWorkflow legt über
 * F2 eine neue Version an (ARCHITECTURE.md §2, versioniert statt
 * überschrieben).
 *
 * MUSS SYNCHRON BLEIBEN (F15 WS-2c, AK6b): diese Funktion läuft mitten in der
 * D13-Übergabe ohne Fenster — zwischen dem Reset von laufAktiv und seiner
 * erneuten Belegung. Ein await hier drin (oder in einem ihrer Callees:
 * ladeArtefaktVersion, validiereWorkflowDaten, registriereWorkflow) öffnet
 * genau das Fenster, durch das ein paralleler POST /api/laeufe schlüpft. Die
 * Quelltextprüfung in scripts/check-f15-workflow.mjs sieht nur die markierten
 * Bereiche, nicht die Callees — diese Zeile ist die einzige Warnung, die ein
 * späterer Umbau hier vorfindet (F-217).
 *
 * Der Datensatz wird bewusst FRISCH geladen und nicht aus einem im Speicher
 * gehaltenen Stand fortgeschrieben: zwischen Start und Laufende kann ein
 * zweiter POST /api/workflows eine neue Fassung angelegt haben, und die
 * Fortschreibung soll auf der jüngsten aufsetzen, nicht eine ältere
 * wiederbeleben.
 * @param workflowId - Kennung des Workflows
 * @param schrittId - der fortzuschreibende Schritt, oder null, wenn NUR die Workflow-Ebene fortgeschrieben wird (Workflow-Stopp, WS-2c (b2))
 * leiteWorkflowFelderAb bekommt den bereits fortgeschriebenen Datensatz und nicht
 * den geladenen (F15 WS-2b (6)): der Cursor entsteht aus ermittleNaechstenSchritt,
 * und das braucht die Schrittliste MIT dem gerade gesetzten Schrittausgang. Eine
 * vorher berechnete Feldmenge müsste den Datensatz ein zweites Mal laden oder auf
 * einem veralteten Stand rechnen.
 * @param schrittFelder - zu setzende Schrittfelder (status, lauf_id); leeres Objekt, wenn nur die Workflow-Ebene fortgeschrieben wird
 * @param leiteWorkflowFelderAb - (datenMitSchritt) => { status, aktiver_schritt_id, grund }
 * @param profilReferenz - Profilbezug, unverändert an F2 gereicht
 * @param ladeOptionen - basisVerzeichnis/schreiber
 * @param erwarteteLaufId - Identitätsprüfung (F-227, WS-2c (b2)): ist sie gesetzt, muss der GELADENE Schritt genau diese lauf_id tragen, sonst wird NICHTS geschrieben. Nur die Nachbereitung eines Laufs setzt sie.
 * @returns bei Erfolg { ok: true, versionSequenz } — zusätzlich eingefroren: true, wenn der GESTOPPT-Schutz gegriffen hat (F-228); sonst { ok: false, grund }
 */
function schreibeWorkflowFortschritt(workflowId, schrittId, schrittFelder, leiteWorkflowFelderAb, profilReferenz, ladeOptionen, erwarteteLaufId = undefined) {
  const version = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)
  if (version === null) {
    return { ok: false, grund: `Workflow '${workflowId}' nicht mehr ladbar` }
  }
  const daten = version.daten
  if (!Array.isArray(daten?.schritte)) {
    return { ok: false, grund: `Workflow '${workflowId}' hat keine lesbare Schrittliste mehr` }
  }
  // schrittId null heißt: KEIN Schritt adressiert, nur die Workflow-Ebene wird fortgeschrieben
  // (WS-2c (b2), Workflow-Stopp). Der Stopp hat keinen Schritt, dem er etwas zuschreiben
  // könnte — er beendet den Workflow, nicht einen Schritt. Ein Platzhalter-Schritt (Cursor,
  // erster der Liste) wäre eine Adressierung ohne Aussage, und die Existenzprüfung darunter
  // ließe einen Stopp an einem Workflow scheitern, dessen Cursor gerade auf null steht.
  const geladenerSchritt = schrittId === null ? null : daten.schritte.find((s) => s.schritt_id === schrittId)
  if (geladenerSchritt === undefined) {
    return { ok: false, grund: `Workflow '${workflowId}' kennt den Schritt '${schrittId}' nicht mehr` }
  }

  // IDENTITÄTSPRÜFUNG (F-227, Reviewer-Pass 10.09.2026, V1): die Nachbereitung eines Laufs
  // adressiert ihren Schritt allein über die schritt_id und stempelt ihren Ausgang in den
  // Datensatz, der beim LAUFENDE auf der Platte liegt — nicht in den, der beim Start dort lag.
  // Der Workflow-Stopp aus (b2) öffnet genau die Tür, die das erreichbar macht: GESTOPPT
  // setzen, neue Fassung einreichen (GESTOPPT ist ersetzbar), während der alte Lauf noch
  // fliegt. Die neue Fassung steht auf OFFEN — der GESTOPPT-Schutz darunter greift also nicht
  // mehr, weil er den ZUSTAND liest und nicht die IDENTITÄT. Ohne diese Prüfung bekäme ein
  // fremder Plan den Ausgang eines Laufs, den niemand für ihn gestartet hat, und die
  // Auto-Fortsetzung führe in ihm weiter.
  //
  // NUR die Nachbereitung setzt erwarteteLaufId. Freigabe, Ablehnung, Stopp und die beiden
  // Heilungen adressieren keinen bestimmten Lauf — für sie wäre dieselbe Prüfung falsch: sie
  // sollen auf dem Stand wirken, der jetzt daliegt.
  if (erwarteteLaufId !== undefined && geladenerSchritt?.lauf_id !== erwarteteLaufId) {
    const jetzt = geladenerSchritt?.lauf_id === null || geladenerSchritt?.lauf_id === undefined ? 'null' : `'${geladenerSchritt.lauf_id}'`
    return {
      ok: false,
      grund: `Workflow '${workflowId}': Schritt '${schrittId}' trägt nicht mehr die lauf_id '${erwarteteLaufId}' dieses Laufs (dort steht jetzt ${jetzt}) — der Ausgang dieses Laufs wird NICHT in eine fremde Fassung geschrieben (F-227)`,
    }
  }

  const datenMitSchritt =
    schrittId === null
      ? daten
      : {
          ...daten,
          schritte: daten.schritte.map((s) => (s.schritt_id === schrittId ? { ...s, ...schrittFelder } : s)),
        }
  // GESTOPPT-Schutz (F15 WS-2c (b1), Reviewer-Pass 10.09.2026, K1): ein auf der Platte
  // stehendes GESTOPPT überschreibt diese Funktion NIE.
  //
  // Der eigene Automaten-Ausgang haltGestoppt deckt nur den Pfad ab, der über
  // ermittleNaechstenSchritt läuft — die Nachbereitung. Zwei weitere Schreibpfade fragen die
  // Regel gar nicht: die Heilung einer verwaisten lauf_id und schreibeStartfehlerHalt schreiben
  // KLAERUNG_ERFORDERLICH hart. Damit wäre der Schutz genau dort gelöchert, wo er zuerst
  // gebraucht wird: stoppt der Mensch während eines Schritts, dessen Lauf gleich darauf
  // heilbar scheitert, machte die Heilung aus dem Stopp einen wieder fortsetzbaren Workflow —
  // derselbe Defekt, gegen den haltGestoppt gebaut ist, eine Verzweigung daneben.
  //
  // Deshalb steht der Schutz hier, an der EINEN Funktion, durch die jeder Schreibpfad läuft,
  // und nicht als Wächter an drei Aufrufstellen. Was geschrieben wird, ist trotzdem nicht
  // nichts: die SCHRITTfelder gelten weiter (der Schritt bekommt seinen tatsächlichen Ausgang),
  // eingefroren werden nur status, Cursor und Grund des Menschen. Ein Stopp verschweigt nicht,
  // was gelaufen ist — er verhindert nur, dass daraus weitergefahren wird.
  //
  // leiteWorkflowFelderAb wird in diesem Fall NICHT aufgerufen. Das ist beabsichtigt und
  // trägt eine zweite Wirkung: die Nachbereitung erfährt darüber kein Ergebnis von
  // ermittleNaechstenSchritt (ihr `naechster` bleibt null) und bricht die Auto-Fortsetzung ab,
  // ohne dass es dafür eine eigene Bedingung braucht.
  //
  // Der Weg aus GESTOPPT heraus führt nicht durch diese Funktion, sondern über POST
  // /api/workflows — eine neue Fassung, also eine menschliche Entscheidung (GESTOPPT steht
  // nicht in GESPERRTE_ERSETZUNGS_STATUS).
  //
  // WS-2c (b2) (F-228): dass der Schutz gegriffen hat, wird SEITHER GEMELDET und nicht nur
  // getan. Die eingefrorene Fassung sieht von außen aus wie jede andere erfolgreiche
  // Fortschreibung — ok:true, eine neue versionSequenz —, obwohl status, Cursor und Grund
  // NICHT das sind, was der Aufrufer verlangt hat. Wer daraufhin weiterarbeitet, als wäre sein
  // Wunsch geschrieben worden, baut auf einer Annahme. Genau das tat starteWorkflowSchritt: es
  // las ok:true und startete den Lauf samt D13-Belegung, während der Workflow auf GESTOPPT
  // stand. EINE Form, kein zweiter Rückgabetyp — dasselbe Objekt, ein zusätzliches Feld.
  const eingefroren = daten.status === 'GESTOPPT'
  const neueDaten = eingefroren
    ? { ...datenMitSchritt, status: 'GESTOPPT', aktiver_schritt_id: daten.aktiver_schritt_id, grund: daten.grund ?? null }
    : { ...datenMitSchritt, ...leiteWorkflowFelderAb(datenMitSchritt) }
  // Vor dem Schreiben validieren (Reviewer-Pass 10.09.2026, V5): registriereWorkflow prüft
  // bewusst nicht selbst, und der Startendpunkt validiert beim LADEN — ein hier geschriebener
  // ungültiger Datensatz käme also erst später als 409 zurück, und der Workflow wäre zugemauert.
  // Eine Zeile schließt die ganze Klasse; die Invariante hält heute, aber sie hängt an vier
  // Aufrufstellen, nicht an einer.
  const verstoesse = validiereWorkflowDaten(neueDaten)
  if (verstoesse.length > 0) {
    return { ok: false, grund: `fortgeschriebener Workflow '${workflowId}' wäre kein gültiger WORKFLOW_V0: ${verstoesse.join('; ')}` }
  }
  try {
    const registriert = registriereWorkflow(neueDaten, profilReferenz, { basisVerzeichnis: ladeOptionen.basisVerzeichnis })
    return { ok: true, versionSequenz: registriert.versionSequenz, eingefroren }
  } catch (fehler) {
    return { ok: false, grund: `Workflow-Version konnte nicht geschrieben werden: ${fehler.message}` }
  }
}

/**
 * Workflow-Status, der zu einem Ausgang von ermittleNaechstenSchritt gehört
 * (F15 WS-2b (6)). Der Cursor kommt in allen fünf Fällen unverändert aus
 * ausgang.aktiverSchrittId — die Union trägt ihn selbst, es gibt hier nichts
 * zu rechnen.
 *
 * 'starte' setzt LAEUFT, startet aber NICHTS: WS-2b ist ein manueller
 * Schritt-für-Schritt-Modus, in dem der Cursor nach jedem Schritt auf den
 * nächsten fälligen weiterwandert und ein zweiter POST .../starten ihn
 * ausführt. WS-2c ersetzt nur diesen zweiten Aufruf durch den automatischen —
 * der Zustand auf der Platte ist derselbe.
 * @param ausgang - Rückgabe von ermittleNaechstenSchritt
 * @returns der zu setzende Workflow-Status
 */
function workflowStatusZuAusgang(ausgang) {
  if (ausgang.art === 'starte') return 'LAEUFT'
  if (ausgang.art === 'haltFreigabe') return 'WARTET_FREIGABE'
  if (ausgang.art === 'haltGrenze') return 'GESTOPPT'
  // F15 WS-2c (b1): der Ausgang, der zu einem bestehenden Stopp gehört.
  //
  // Als SCHREIBSCHUTZ ist diese Zeile unerreichbar, und das ist kein Versehen
  // (Reviewer-Pass 10.09.2026, W2): schreibeWorkflowFortschritt ruft
  // leiteWorkflowFelderAb — den einzigen Aufrufer dieser Funktion — auf einem
  // GESTOPPT gar nicht mehr auf. Den Stopp hält dort der eigene Schutz, nicht
  // diese Abbildung. Die Zeile bleibt trotzdem stehen, aus demselben Grund wie
  // jede andere ALLOWLIST-Zeile hier: fiele haltGestoppt in den Default, hinge
  // die Richtigkeit an einer zweiten Stelle, die ihn zufällig abfängt.
  // Wirksam ist der Ausgang selbst dagegen sehr wohl — er trägt die
  // 409-Antworten von POST .../starten und POST .../freigabe.
  if (ausgang.art === 'haltGestoppt') return 'GESTOPPT'
  if (ausgang.art === 'fertig') return 'ABGESCHLOSSEN'
  if (ausgang.art === 'haltKlaerung') return 'KLAERUNG_ERFORDERLICH'
  // ALLOWLIST wie überall in F15 (Reviewer-Pass 10.09.2026, V6): ein künftiger sechster Ausgang
  // fällt in "hält an" und muss hier eine bewusste Zeile bekommen, statt sich still einen Status
  // zu nehmen. KLAERUNG_ERFORDERLICH ist dabei nicht der Default, sondern eine eigene Zeile —
  // sonst wäre die Unterscheidung nur behauptet.
  return 'KLAERUNG_ERFORDERLICH'
}

/**
 * Übersetzt einen Ausgang von ermittleNaechstenSchritt in einen lesbaren Grund
 * (F15 WS-2b). Nötig, weil zwei der Ausgänge kein grund-Feld tragen:
 * 'haltFreigabe' nennt nur die schrittId, 'fertig' gar nichts.
 *
 * Ursprünglich nur für die 409-Antwort des Startendpunkts geschrieben, also für
 * einen Nicht-'starte'-Ausgang. Seit WS-2c (b1) reicht der Freigabe-Endpunkt
 * auch ein 'starte' hinein, und seit WS-3b liefert die Funktion den grund ALLER
 * sechs Ausgänge für die Anzeige (baueNaechsterProjektion) — die Texte werden
 * also von jemandem gelesen, der nichts falsch gemacht hat, nicht nur von
 * jemandem, dessen Aufruf gerade abgelehnt wurde (Reviewer-Pass 10.09.2026).
 * @param ausgang - Rückgabe von ermittleNaechstenSchritt
 * @returns lesbarer Grund
 */
function beschreibeAutomatAusgang(ausgang) {
  if (ausgang.art === 'haltFreigabe') {
    // Der Text landet seit (a5) auch als dauerhafter grund im Artefakt und wird dort von einem
    // Menschen gelesen, der den Workflow ansieht — nicht von dem, der gerade einen Endpunkt
    // aufgerufen hat (QA-Pass 10.09.2026, Fehler 7). Er nennt deshalb die Bedingung und den
    // Ausweg, nicht den Aufrufweg.
    return `Schritt '${ausgang.schrittId}' verlangt eine menschliche Freigabe (freigabe 'ZWINGEND') — er startet erst, wenn für ihn eine Freigabe erteilt ist (POST /api/workflows/<id>/freigabe)`
  }
  if (ausgang.art === 'fertig') {
    return 'der Workflow hat keinen zu startenden Schritt mehr — er ist durchgelaufen'
  }
  if (ausgang.art === 'haltGestoppt') {
    return 'der Workflow ist GESTOPPT — daraus wird kein Schritt fortgesetzt, solange der Stopp steht'
  }
  // 'starte' trägt kein grund-Feld. Bis (b1) war das folgenlos — nur der Startendpunkt rief
  // diese Funktion, und dort kam ein 'starte' nie in den Nicht-'starte'-Zweig. Der
  // Freigabe-Endpunkt reicht ihn sehr wohl hinein, und zwar auf den zwei WAHRSCHEINLICHSTEN
  // Fehlbedienungen: zweimal freigeben (nach der ersten liefert die Regel 'starte') und einen
  // Workflow freigeben, der gar keine Freigabe braucht. Beide antworteten mit dem Wort
  // 'undefined' im Grund (QA-Pass 10.09.2026, Befund 2).
  if (ausgang.art === 'starte') {
    // Wortlaut bewusst neutral: dieser Text ist seit WS-3b auch die Anzeige eines völlig
    // normalen, startbereiten Workflows und darf sich nicht wie die Rückweisung einer
    // Fehlbedienung lesen. Für den Freigabe-Endpunkt bleibt er zutreffend — dort ist genau das
    // der Grund, warum die Freigabe abprallt.
    return `Schritt '${ausgang.schritt.schritt_id}' ist startbar — es liegt keine offene Freigabefrage vor`
  }
  return ausgang.grund
}

/**
 * HTTP-Status je Fehlerart von starteWorkflowSchritt (F15 WS-2c (a1)). Die
 * Funktion kennt kein res; diese Tabelle ist die einzige Stelle, an der ihre
 * Rückgabe in einen Statuscode übersetzt wird — die automatische Fortsetzung
 * übersetzt dieselbe Rückgabe stattdessen in einen startfehlerListe-Eintrag.
 *
 * Die Zuordnung hält den Endpunkt bei EXAKT dem Verhalten, das er vor der
 * Extraktion hatte: 400 für ein untaugliches Plandatum, 409 für einen
 * Konflikt, 500 für einen Schreibfehler.
 */
const STARTFEHLER_STATUS = { ungueltig: 400, konflikt: 409, schreibfehler: 500, nichtLadbar: 500 }

/** Baut einen lesbaren Ablehnungsgrund aus einem ok:false-AusfuehrungsErgebnis (F5- oder F6a-Stufe). @param ergebnis - ok:false-Zweig von AusfuehrungsErgebnis @returns lesbarer Text für die Startfehlerliste */
function beschreibeAblehnung(ergebnis) {
  if (ergebnis.stufe === 'kontextpaket') {
    return `F5-Ablehnung (${ergebnis.ergebnis.grund})`
  }
  return `F6a-Ablehnung: ${ergebnis.grund}`
}

/** Sammelt den Request-Body eines eingehenden Requests als Text. @param req - eingehender Request @returns Body als Text */
function leseBody(req) {
  return new Promise((resolve, reject) => {
    let daten = ''
    req.on('data', (chunk) => {
      daten += chunk
    })
    req.on('end', () => resolve(daten))
    req.on('error', reject)
  })
}

/**
 * Baut den Request-Handler des Leitstands. Eigener, in sich
 * abgeschlossener In-Memory-Zustand je Aufruf (angenommene laufIds,
 * Startfehlerliste, F11 WS-2 zusätzlich laufAktiv/D13) — erlaubt
 * parallele, voneinander unabhängige Serverinstanzen in Tests
 * (scripts/check-f10-leitstand.mjs). Die Startvorlage wird einmal beim
 * Aufbau geladen und validiert (ladeStartvorlage wirft bei Fehlschlag —
 * ein Konfigurationsfehler des Servers, kein Fachergebnis eines
 * Startauftrags), ProfilReferenz wird daraus einmal frisch abgeleitet
 * (leiteProfilReferenzAb) statt je Request neu von der Platte gelesen zu
 * werden — die Profildatei ändert sich während eines Serverlaufs nicht
 * ([EMPFEHLUNG], YAGNI).
 * @param optionen - fuehreAufgabeDurchFn (Default: die echte F8-Funktion, austauschbar für Tests, Muster wie F6as Starter), basisVerzeichnis (Default 'kontrollzustand'), publicVerzeichnis (Default public/leitstand), startvorlagePfad (Default startvorlagen/beispielprojekt.json), repoWurzel (Default process.cwd(), für AK6-Pfadsicherheit)
 * @returns Node-http-Request-Handler
 */
export function erzeugeRequestHandler(optionen = {}) {
  const {
    fuehreAufgabeDurchFn = fuehreAufgabeDurch,
    basisVerzeichnis = BASISVERZEICHNIS,
    publicVerzeichnis = PUBLIC_VERZEICHNIS,
    startvorlagePfad = STANDARD_STARTVORLAGE_PFAD,
    repoWurzel = process.cwd(),
  } = optionen

  const vorlage = ladeStartvorlage(startvorlagePfad)
  const profilReferenz = leiteProfilReferenzAb(vorlage)

  /** Synchron VOR dem fuehreAufgabeDurch-Aufruf reservierte laufIds dieser Serverinstanz (AK5) — die erste run_prepared-Marke liegt erst Sekunden später auf der Platte. */
  const angenommeneLaufIds = new Set()
  /** Flüchtige Projektion eines Wurfs aus fuehreAufgabeDurch (AK6) — kein Zustand, keine Datei unter kontrollzustand/, geht bei Serverneustart verloren. */
  const startfehlerListe = []
  /** F11 WS-2, AK7 (D13): true, solange ein über diese Serverinstanz gestarteter Lauf den fuehreAufgabeDurch-Aufruf noch nicht durch .then/.catch verlassen hat. NIE aus kontrollzustand/ abgeleitet (F-128) — ein Serverneustart setzt sie zurück, ein alter, verwaister KLAERUNG_ERFORDERLICH-Lauf aus einem früheren Serverlauf blockiert nicht. */
  let laufAktiv = false
  /** laufId des gerade aktiven Laufs (QA-Hinweis, F11 WS-2) — nur für die 409-Ablehnungsmeldung unten, keine eigene Fachbedeutung. */
  let laufAktivLaufId = null
  /** F14 WS-4 (AK7, D13): AbortController des gerade aktiven Laufs — genau einer, weil D13 genau einen aktiven Arbeitsstrang je Serverinstanz garantiert. Lebt nur so lange wie laufAktiv true ist, wird in JEDEM Fall (ok:false, ok:true, Wurf) zusammen mit laufAktiv/laufAktivLaufId zurückgesetzt (kein Leak, keine Wiederverwendung über Läufe hinweg). */
  let laufAktivAbortController = null

  /** Prüft AK5(a)+(b): laufId hat bereits ein Verzeichnis unter kontrollzustand/, oder ist in dieser Serverinstanz schon reserviert. @param laufId - zu prüfende laufId @returns true, wenn laufId belegt ist */
  function laufIdBelegt(laufId) {
    return angenommeneLaufIds.has(laufId) || existsSync(join(basisVerzeichnis, laufId))
  }

  /**
   * Der EINZIGE Aufrufpunkt des Werkzeuglaufs in dieser Datei (F10 AK2/AK6,
   * F11 WS-2 AK7, F15 WS-2b). Vor WS-2b stand dieser Block inline im
   * POST /api/laeufe-Handler; seit WS-2b braucht ihn zusätzlich der
   * Startendpunkt des Schritt-Automaten. Ein zweiter Aufrufpunkt ist bewusst
   * NICHT entstanden: die D13-Rückgabe und die Startfehlerliste sind
   * Sicherheitsverhalten, und die zweite Fassung davon ist die, die beim
   * nächsten Eingriff vergessen wird. scripts/check-f11-auftrag.mjs prüft
   * genau diesen Block als D13-Vertrag (Sperre vor laufIdBelegt, Reset in
   * .then UND .catch) über das ERSTE Vorkommen des zusammengesetzten
   * Funktionsnamens im Quelltext — Kommentare oberhalb dürfen ihn deshalb nie
   * unmittelbar vor einer öffnenden Klammer nennen.
   *
   * Vorbedingung, vom Aufrufer zu erfüllen (unverändert zum Stand vor der
   * Extraktion): laufAktiv/laufAktivLaufId/laufAktivAbortController sind
   * gesetzt, die laufId ist reserviert, und die 202-Antwort ist bereits raus.
   *
   * nachLauf läuft im selben synchronen Tick, in dem laufAktiv zurückgesetzt
   * wird — Vorbedingung für AK6 (D13-Übergabe ohne Fenster) in WS-2c. Ein Wurf
   * daraus wird gefangen und als Startfehler protokolliert: er darf weder die
   * D13-Rückgabe noch den Serverprozess mitreißen.
   * @param laufId - reservierte laufId dieses Laufs
   * @param eingaben - fertige AusfuehrungsEingaben
   * @param zeitgrenzeMsUeberschreibung - überstimmt vorlage.zeitgrenzeMs (F15 WS-2b: das gepinnte schritt.zeitgrenze_ms), sonst undefined
   * @param nachLauf - optionaler Rückruf (ergebnis, fehler) nach Laufende
   */
  function starteLaufUndVergiss(laufId, eingaben, zeitgrenzeMsUeberschreibung = undefined, nachLauf = undefined) {
    // F-145: dieselben Optionen, mit denen erzeugeRequestHandler selbst aufgerufen wurde,
    // strukturell durchgereicht (nicht basisVerzeichnis einzeln herauskopiert) — sonst
    // respektieren die synchronen Prüfungen im Handler (D13, laufIdBelegt, auftragId-Existenz)
    // ein Nicht-Default-basisVerzeichnis, der eigentliche Lauf aber nicht (stille Divergenz).
    // Extra Felder von optionen (fuehreAufgabeDurchFn/publicVerzeichnis/startvorlagePfad/
    // repoWurzel), die AusfuehrungsOptionen nicht kennt: fuehreAufgabeDurch kopiert für
    // starteGateway nur die neun bekannten Felder einzeln heraus (src/execution-controller/
    // index.ts, F-107; F14 WS-4 ergänzt abbruchSignal als neuntes), das rohe Objekt selbst
    // reicht es nur an die F9-Eskalationshelfer (erfasseBedarf/erzeugeTransportpaket/
    // haendigeAus) unverändert weiter — auch die lesen nur bekannte Felder per
    // Property-Zugriff, Extrafelder bleiben überall ungelesen (D5).
    // F14 WS-4 (AK7, F-177): zeitgrenzeMs kommt serverseitig aus der Startvorlage (Muster
    // werkzeugStartziel/berechtigungskontext), abbruchSignal aus dem gerade angelegten
    // Controller — beide reine Durchreichung an AusfuehrungsOptionen (D5, execution-controller
    // interpretiert keins der beiden selbst). F15 WS-2b: zeitgrenzeMsUeberschreibung steht NACH
    // der Startvorlage und gewinnt deshalb gegen sie — das gepinnte zeitgrenze_ms eines
    // Workflow-Schritts ist ein Plandatum, das der Mensch freigegeben hat (E-M3-3). Bewusst ein
    // SKALAR und kein Optionen-Objekt: ein durchgereichtes Objekt an dieser Stelle überstimmte
    // auch basisVerzeichnis/starter/settingsPfad — genau die Felder, die diese Datei sonst mit
    // VERBOTENE_OPTIONEN_FELDER am härtesten verteidigt (Reviewer-Pass 10.09.2026).
    const laufOptionen = {
      ...optionen,
      ...(vorlage.zeitgrenzeMs !== undefined ? { zeitgrenzeMs: vorlage.zeitgrenzeMs } : {}),
      ...(zeitgrenzeMsUeberschreibung !== undefined ? { zeitgrenzeMs: zeitgrenzeMsUeberschreibung } : {}),
      abbruchSignal: laufAktivAbortController.signal,
    }

    /** Ruft nachLauf auf, ohne dass ein Wurf daraus zur unhandled rejection wird. @param ergebnis - AusfuehrungsErgebnis oder null @param fehler - Wurf oder null */
    const meldeLaufende = (ergebnis, fehler) => {
      if (nachLauf === undefined) return
      try {
        nachLauf(ergebnis, fehler)
      } catch (nachLaufFehler) {
        const eintrag = { zeitstempel: new Date().toISOString(), laufId, fehler: `Nachbereitung fehlgeschlagen: ${String(nachLaufFehler?.message ?? nachLaufFehler)}` }
        startfehlerListe.push(eintrag)
        console.error(`[leitstand] Nachbereitung von Lauf '${laufId}' fehlgeschlagen:`, nachLaufFehler)
      }
    }

    // Fire-and-forget mit Pflicht-.catch() (AK6) — ein Wurf aus dem Lauf beendet den Server
    // nicht. laufAktiv wird in JEDEM Fall zurückgesetzt (AK7, D13) — anders als die
    // laufId-Reservierung, die nur bei ok:false/Wurf freigegeben wird. Ein korrigierter Retry
    // unter DERSELBEN laufId gelingt danach nur, wenn die Ablehnung keinen Checkpoint
    // geschrieben hat (reine F5-Ablehnung, oder F6as pruefeStartziel-Zweig) — laufIdBelegt()
    // prüft zusätzlich das Dateisystem, und die meisten F6a-Ablehnungen (Invocation Policy,
    // E-182, fehlende/ungültige Autorisierung, Startfreigabe ABGELEHNT) schreiben über
    // verweigereStart bereits eine reale VERWEIGERT-Wirkungsmarke, BEVOR starteGateway
    // ok:false zurückgibt — die laufId bleibt danach absichtlich belegt (F1s Hash-Kette ist
    // append-only, kein Überschreiben eines persistierten Artefakts, ARCHITECTURE.md §7).
    fuehreAufgabeDurchFn(laufId, profilReferenz, eingaben, laufOptionen)
      .then((ergebnis) => {
        // D13-UEBERGABE-OHNE-FENSTER: START (F15 WS-2c, AK6b)
        laufAktiv = false
        laufAktivLaufId = null
        laufAktivAbortController = null
        if (ergebnis.ok === false) {
          angenommeneLaufIds.delete(laufId)
          const eintrag = { zeitstempel: new Date().toISOString(), laufId, fehler: beschreibeAblehnung(ergebnis) }
          startfehlerListe.push(eintrag)
          console.error(`[leitstand] Lauf '${laufId}' abgelehnt:`, eintrag.fehler)
        }
        meldeLaufende(ergebnis, null)
        // D13-UEBERGABE-OHNE-FENSTER: ENDE
      })
      .catch((fehler) => {
        laufAktiv = false
        laufAktivLaufId = null
        laufAktivAbortController = null
        angenommeneLaufIds.delete(laufId)
        const eintrag = { zeitstempel: new Date().toISOString(), laufId, fehler: String(fehler?.message ?? fehler) }
        startfehlerListe.push(eintrag)
        console.error(`[leitstand] Lauf '${laufId}' fehlgeschlagen:`, fehler)
        meldeLaufende(null, fehler)
      })
  }

  /**
   * Schreibt den Halt fest, den ein GESCHEITERTER Start hinterlässt, und meldet
   * ihn in der Startfehlerliste (F15 WS-2c; seit (b1) an zwei Stellen gebraucht
   * und deshalb hier statt zweimal inline).
   *
   * Der Zustand, den dieser Schreibvorgang verhindert, ist der zugemauerte
   * Workflow: die vorangegangene Fortschreibung hat LAEUFT mit einem Cursor auf
   * dem Folgeschritt hinterlassen, aber KEIN Schritt steht auf LAEUFT. Dort
   * greift die Stale-Heilung nicht (sie verlangt einen SCHRITT auf LAEUFT),
   * jeder weitere Start scheitert an derselben Ursache, und eine korrigierte
   * Fassung ist gesperrt, weil LAEUFT in GESPERRTE_ERSETZUNGS_STATUS steht. Ein
   * gewöhnlicher Planfehler im Folgeschritt reichte damit aus, um den Workflow
   * endgültig zu verlieren. KLAERUNG_ERFORDERLICH ist dagegen ersetzbar — der
   * Mensch kommt über eine neue Fassung wieder heraus.
   *
   * Zwei Aufrufer, ein Regelsatz: die automatische Fortsetzung nach einem
   * erfolgreichen Schritt (a) und der Start nach einer erteilten Freigabe (b1).
   * Ein zweiter Satz Formulierungen und ein zweiter Fehlerkanal wären genau die
   * Doppelung, die beim nächsten Eingriff halb vergessen wird.
   * @param workflowId - Kennung des Workflows
   * @param schrittId - Schritt, dessen Start gescheitert ist (nur zur Adressierung, es werden keine Schrittfelder geändert)
   * @param aktiverSchrittId - Cursor, der stehen bleiben soll
   * @param laufId - laufId für den Startfehlereintrag, oder null, wenn kein Lauf im Spiel war
   * @param anlass - lesbarer Grund; geht wortgleich in die Startfehlerliste UND in das Artefakt
   * @param ladeOptionen - basisVerzeichnis/schreiber
   * @returns Rückgabe von schreibeWorkflowFortschritt
   */
  function schreibeStartfehlerHalt(workflowId, schrittId, aktiverSchrittId, laufId, anlass, ladeOptionen) {
    // Kein neuer Fehlerkanal: dieselbe Startfehlerliste, die auch ein abgelehnter Lauf füllt.
    // Ein zweiter Kanal wäre eine zweite Stelle, an der der Mensch nachsehen muss.
    const eintrag = { zeitstempel: new Date().toISOString(), laufId, fehler: anlass }
    startfehlerListe.push(eintrag)
    console.error(`[leitstand] ${eintrag.fehler}`)

    const halt = schreibeWorkflowFortschritt(
      workflowId,
      schrittId,
      {},
      () => ({ status: 'KLAERUNG_ERFORDERLICH', aktiver_schritt_id: aktiverSchrittId, grund: anlass }),
      profilReferenz,
      ladeOptionen
    )
    if (!halt.ok) {
      const haltEintrag = { zeitstempel: new Date().toISOString(), laufId, fehler: `Halt nach gescheitertem Start konnte nicht festgeschrieben werden: ${halt.grund}` }
      startfehlerListe.push(haltEintrag)
      console.error(`[leitstand] ${haltEintrag.fehler}`)
    } else if (halt.eingefroren) {
      // F-228, (b2): der Halt wurde NICHT geschrieben — der Workflow ist gestoppt und bleibt es.
      // Das ist kein Fehler (GESTOPPT ist selbst ein Halt, und zwar der stärkere), aber es
      // stillschweigend als geschriebenen KLAERUNG_ERFORDERLICH zu lesen wäre eine Behauptung
      // über die Platte, die dort nicht steht.
      const eingefrorenEintrag = { zeitstempel: new Date().toISOString(), laufId, fehler: `Workflow '${workflowId}' ist GESTOPPT — der Halt nach dem gescheiterten Start wurde NICHT festgeschrieben, der Stopp bleibt stehen` }
      startfehlerListe.push(eingefrorenEintrag)
      console.error(`[leitstand] ${eingefrorenEintrag.fehler}`)
    }
    return halt
  }

  /**
   * Startet GENAU EINEN Workflow-Schritt und hängt seine Nachbereitung an
   * (F15 WS-2c (a1)). Bis WS-2b stand dieser Block inline im Handler von
   * POST /api/workflows/<id>/starten; seit WS-2c braucht ihn zusätzlich die
   * automatische Fortsetzung nach einem erfolgreichen Schritt.
   *
   * KEIN res-Bezug: die Funktion liefert ein Ergebnisobjekt, aus dem der
   * HTTP-Endpunkt 202/400/409/500 macht und die Auto-Fortsetzung einen
   * startfehlerListe-Eintrag. Genau derselbe Grund, aus dem der
   * Fire-and-forget-Block darüber nur einmal existiert: die zweite Fassung
   * eines Startpfads ist die, die beim nächsten Eingriff vergessen wird — und
   * an ihr hängen die D13-Rückgabe, die laufId-Reservierung und die
   * Zustandsfortschreibung.
   *
   * INVARIANTE (AK6b, D13-Übergabe ohne Fenster): zwischen dem Reset von
   * laufAktiv/laufAktivLaufId/laufAktivAbortController im .then oben und dem
   * erneuten `laufAktiv = true` hier liegt KEIN Kontrollflusswechsel — kein
   * await, kein queueMicrotask, kein setTimeout. Sonst schlüpfte ein
   * paralleler POST /api/laeufe durch das Fenster und es liefen zwei
   * Arbeitsstränge. Der Bereich ist unten mit D13-UEBERGABE-OHNE-FENSTER
   * markiert; scripts/check-f15-workflow.mjs prüft ihn im Quelltext.
   *
   * Der Workflow wird FRISCH geladen und nicht aus dem Aufrufer
   * übernommen (WS-2c (a3)): die unmittelbar zuvor geschriebene Version trägt
   * lauf_id und Status des Vorschritts, die im Aufrufer vorhandene Fassung
   * nicht. ladeArtefaktVersion ist synchron — die Invariante bleibt gewahrt.
   * @param workflowId - Kennung des Workflows
   * @param ausgang - 'starte'-Ausgang von ermittleNaechstenSchritt
   * @returns { ok: true, schrittId, laufId } oder { ok: false, art, grund }
   */
  function starteWorkflowSchritt(workflowId, ausgang) {
    // D13-UEBERGABE-OHNE-FENSTER: START (F15 WS-2c, AK6b)
    const ladeOptionen = { basisVerzeichnis, schreiber: STILLER_SCHREIBER }

    const version = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)
    if (version === null) {
      return { ok: false, art: 'nichtLadbar', grund: `Workflow '${workflowId}' ist nicht mehr ladbar` }
    }
    const workflowDaten = version.daten
    const schritt = workflowDaten.schritte?.find((s) => s.schritt_id === ausgang.schritt.schritt_id)
    if (schritt === undefined) {
      return { ok: false, art: 'nichtLadbar', grund: `Workflow '${workflowId}' kennt den Schritt '${ausgang.schritt.schritt_id}' nicht mehr` }
    }

    // Die laufId eines Workflow-Schritts erzeugt der Server (Muster auftragId, D1) — sie kommt
    // nie aus einer Payload. Die Belegtprüfung bleibt trotzdem: randomUUID ist praktisch
    // kollisionsfrei, aber die Reservierung ist die Zusage, nicht die Wahrscheinlichkeit.
    //
    // Bewusst über eine Zwischenvariable statt als direkte Bedingung: die D13-Vertragsprüfung
    // in scripts/check-f11-auftrag.mjs sucht im Quelltext das ERSTE Vorkommen der
    // D13-Sperrbedingung und das ERSTE Vorkommen der Belegtprüfung als Bedingung und verlangt
    // jenes vor diesem. Diese Funktion steht VOR dem Handler von POST /api/laeufe; eine direkte
    // Bedingung hier verschöbe das erste Vorkommen der Belegtprüfung hierher, und das Gate
    // prüfte seine Zusage nicht mehr an dem Handler, für den sie geschrieben wurde. Aus
    // demselben Grund nennt dieser Kommentar die beiden gesuchten Zeichenketten nicht
    // wörtlich — ein Kommentar, den ein indexOf zuerst trifft, prüft sich selbst.
    const laufId = randomUUID()
    const laufIdIstBelegt = laufIdBelegt(laufId)
    if (laufIdIstBelegt) {
      return { ok: false, art: 'konflikt', grund: `laufId '${laufId}' ist bereits vergeben` }
    }

    // Der Auftragstext kommt aus dem Auftragsartefakt — dieselbe synchrone Existenzprüfung wie
    // in POST /api/laeufe (F12 WS-2 AK5), vor jeder Zustandsänderung (D2). POST /api/workflows
    // prüft auftrag_id bewusst NICHT; beim Start ist der Zwischenzustand „Auftrag kommt später"
    // nicht mehr zulässig.
    if (LAUFID_UNZULAESSIGE_ZEICHEN.test(workflowDaten.auftrag_id)) {
      return { ok: false, art: 'ungueltig', grund: `'auftrag_id' des Workflows enthält unzulässige Zeichen: ${JSON.stringify(workflowDaten.auftrag_id)}` }
    }
    const auftragVersion = ladeArtefaktVersion(`auftrag-${workflowDaten.auftrag_id}`, undefined, ladeOptionen)
    if (auftragVersion === null) {
      return { ok: false, art: 'ungueltig', grund: `Auftrag '${workflowDaten.auftrag_id}' nicht gefunden` }
    }

    // Lineage-Verweis auf den Vorschritt: die lauf_id des Schritts, dessen nachfolger auf
    // diesen zeigt und der real gelaufen ist. Beim ERSTEN Schritt gibt es keinen — dann bleibt
    // vorgaengerLaufId weg. Kein neuer Mechanismus, nur die bestehende Verweisbildung aus
    // F8 WS-2b / F13 WS-3 (Nicht-Ziel „Keine neue Lineage-Mechanik").
    //
    // Ein geheilter Schritt trägt lauf_id null und ist damit kein Vorschritt — richtig so, es
    // lief nichts, worauf ein Verweis zeigen könnte.
    //
    // Sind ZWEI Vorschritte gelaufen, ist der Lineage-Vorgänger nicht bestimmbar — dann wird
    // angehalten statt geraten (D2). HEUTE UNERREICHBAR, und das ist Absicht: seit der fünften
    // Querverweisregel lehnt validiereWorkflowDaten jede Zusammenführung ab, und der
    // HTTP-Endpunkt validiert den geladenen Datensatz, bevor er hierher kommt. Die Prüfung
    // bleibt als Tiefenverteidigung stehen, falls die Validierung je verschoben wird; sie wird
    // deshalb NICHT als eigene Grenze im Gate behauptet (ARCHITECTURE.md §8: eine Grenze ohne
    // Rotfall heißt nicht ERZWUNGEN).
    const gelaufeneVorschritte = workflowDaten.schritte.filter((s) => s.nachfolger === schritt.schritt_id && s.lauf_id !== null)
    if (gelaufeneVorschritte.length > 1) {
      return {
        ok: false,
        art: 'konflikt',
        grund: `Schritt '${schritt.schritt_id}' hat ${gelaufeneVorschritte.length} gelaufene Vorschritte (${gelaufeneVorschritte.map((s) => s.schritt_id).join(', ')}) — der Lineage-Vorgänger ist nicht bestimmbar`,
      }
    }
    const vorgaengerLaufId = gelaufeneVorschritte[0]?.lauf_id ?? undefined

    const eingabenErgebnis = loeseSchrittEingabenAuf(
      schritt,
      workflowDaten,
      vorgaengerLaufId,
      auftragVersion.daten.auftragstext,
      vorlage,
      repoWurzel,
      ladeOptionen
    )
    if (!eingabenErgebnis.ok) {
      return { ok: false, art: 'ungueltig', grund: eingabenErgebnis.grund }
    }

    // Die neue Workflow-Version wird geschrieben, BEVOR der Lauf startet: stirbt der Server
    // danach, zeigt der Zustand auf der Platte, welcher Schritt lief — ein Schritt auf LAEUFT
    // mit gesetzter lauf_id ist nach Regel 3 von ermittleNaechstenSchritt nicht mehr
    // startbereit und wird nie automatisch neu gestartet (ARCHITECTURE.md §4).
    // workflowDaten.version bleibt unangetastet: das Feld zählt Planfassungen (Replans), nicht
    // Artefaktversionen — die zählt F2 als versionSequenz.
    //
    // grund geht auf null (WS-2c (a5)): ein laufender Schritt hat keinen Halt-Grund, und ein
    // stehengebliebener Text aus dem vorigen Halt wäre eine Lüge auf der Platte.
    const fortschritt = schreibeWorkflowFortschritt(
      workflowId,
      schritt.schritt_id,
      { status: 'LAEUFT', lauf_id: laufId },
      () => ({ status: 'LAEUFT', aktiver_schritt_id: ausgang.aktiverSchrittId, grund: null }),
      profilReferenz,
      ladeOptionen
    )
    if (!fortschritt.ok) {
      console.error(`[leitstand] Workflow '${workflowId}' konnte nicht fortgeschrieben werden:`, fortschritt.grund)
      return { ok: false, art: 'schreibfehler', grund: fortschritt.grund }
    }
    // F-228, (b2): der GESTOPPT-Schutz hat gegriffen — die Workflow-Ebene wurde eingefroren,
    // status/Cursor/Grund des Menschen stehen unverändert. Bis (b1) las diese Stelle nur
    // fortschritt.ok, sah true und startete den Lauf samt D13-Belegung: ein Schritt auf LAEUFT
    // unter einem Workflow auf GESTOPPT, mit einem Cursor, der woanders hinzeigt. Hier wird
    // deshalb VOR der laufId-Reservierung und VOR der D13-Belegung abgebrochen; nichts läuft,
    // und der Aufrufer macht daraus einen Startfehler.
    //
    // Die SCHRITTfelder sind allerdings mitgeschrieben worden — der Schutz friert nur die
    // Workflow-Ebene ein (das ist bei der Nachbereitung genau richtig, dort trägt der Schritt
    // seinen tatsächlichen Ausgang). Hier ist es das nicht: LAEUFT mit einer lauf_id, unter der
    // nie etwas lief, machte den Schritt nach Regel 3 dauerhaft nicht mehr startbereit. Also
    // zurück auf den Stand davor — dieselbe Regel wie bei der Heilung einer verwaisten lauf_id:
    // es ist nichts gelaufen, also steht auch nichts am Schritt. Der zweite Schreibvorgang wird
    // ebenfalls eingefroren, der Stopp des Menschen bleibt also unangetastet.
    //
    // HEUTE UNERREICHBAR und bewusst trotzdem gebaut (wie der unbestimmbare Lineage-Vorgänger
    // oben): alle drei Aufrufer prüfen vorher ermittleNaechstenSchritt, und ein GESTOPPT
    // verlässt dessen Regel 0 über haltGestoppt, nie über 'starte'. Der Stopp aus (b2) schreibt
    // sein GESTOPPT synchron, es gibt also auch kein Fenster zwischen Prüfung und Schreiben.
    // Die Zusage hängt damit an einer Regel anderswo — genau die Art Annahme, die F-228
    // benennt. Kein eigener Rot-Fall im Gate, weil kein Verhaltensweg dorthin führt
    // (ARCHITECTURE.md §8: eine Grenze ohne Rot-Fall wird nicht als ERZWUNGEN behauptet); die
    // Behandlung selbst prüft das Gate im Quelltext.
    if (fortschritt.eingefroren) {
      const zurueck = schreibeWorkflowFortschritt(
        workflowId,
        schritt.schritt_id,
        { status: 'OFFEN', lauf_id: null },
        () => ({ status: workflowDaten.status, aktiver_schritt_id: workflowDaten.aktiver_schritt_id, grund: workflowDaten.grund ?? null }),
        profilReferenz,
        ladeOptionen
      )
      // Auch dieser Rückgabewert wird auf eingefroren gelesen, und zwar auf das Gegenteil: hier
      // ist true das Erwartete. Käme false zurück, stünde der Workflow nicht mehr auf GESTOPPT,
      // und der Rücksetzer hätte gerade den Zustand des Menschen überschrieben — das gehört
      // gemeldet, nicht verschwiegen.
      if (!zurueck.ok || !zurueck.eingefroren) {
        console.error(
          `[leitstand] Workflow '${workflowId}': Schritt '${schritt.schritt_id}' konnte nach dem Abbruch am Stopp nicht sauber zurückgesetzt werden:`,
          zurueck.ok ? 'der Workflow stand beim Rücksetzen nicht mehr auf GESTOPPT' : zurueck.grund
        )
      }
      return {
        ok: false,
        art: 'konflikt',
        grund: `Workflow '${workflowId}' ist GESTOPPT — es wurde kein Schritt gestartet (der Stopp bleibt stehen; der Weg heraus ist eine neue Fassung über POST /api/workflows)`,
      }
    }

    // Reservierung und D13-Belegung synchron vor dem Laufstart — Muster POST /api/laeufe.
    angenommeneLaufIds.add(laufId)
    laufAktiv = true
    laufAktivLaufId = laufId
    laufAktivAbortController = new AbortController()
    // D13-UEBERGABE-OHNE-FENSTER: ENDE

    // Nach dem Laufende: der Schritt bekommt seinen Ausgang, der Cursor wandert über
    // ermittleNaechstenSchritt auf den nächsten fälligen Schritt weiter, der Workflow-Status
    // folgt diesem Ausgang (WS-2b (6)) — und seit WS-2c setzt der Automat auf einem 'starte'
    // selbst fort (AK6b).
    //
    // Heilung einer verwaisten lauf_id: schlägt der Lauf FACHLICH fehl, ohne dass ein
    // Checkpoint entstanden ist, trägt der Schritt sonst eine lauf_id, unter der es nichts zu
    // sehen gibt — und Regel 3 von ermittleNaechstenSchritt macht ihn damit dauerhaft nicht
    // mehr startbar. Ein Tippfehler in schritt.rolle mauerte den Schritt zu. Deshalb: lauf_id
    // zurück auf null, Schritt zurück auf OFFEN, Workflow auf KLAERUNG_ERFORDERLICH mit dem
    // Ablehnungsgrund. Das ist KEIN Replan (es lief nichts) und verbraucht kein max_replans.
    //
    // Die Bedingung ist ENGER als ok === false und wird deshalb am Dateisystem abgelesen, nicht
    // am Ergebnistyp: F6as verweigereStart schreibt in fünf von sieben Ablehnungszweigen eine
    // reale VERWEIGERT-Wirkungsmarke, BEVOR starteGateway ok:false zurückgibt. Wo eine solche
    // Marke liegt, wird nichts zurückgesetzt — F1s Kette ist append-only (ARCHITECTURE.md §7),
    // und ein OFFEN über einer realen Wirkungsmarke wäre eine Lüge auf der Platte.
    // existsSync(<basis>/<laufId>) ist genau die Prüfung, mit der laufIdBelegt() schon heute
    // entscheidet, ob ein Retry unter derselben laufId möglich ist (D5, kein zweiter Regelsatz).
    //
    // GENAU gelesen (Reviewer-Pass 10.09.2026, K2): die Prüfung sagt „kein Checkpoint und keine
    // Wirkungsmarke unter <basis>/<laufId>", NICHT „kein Artefakt". Lineage-Artefakte liegen
    // woanders — registriereKernArtefakt schreibt nach <basis>/lineage-<artefaktId>/. Es gibt
    // deshalb einen realen Pfad, auf dem geheilt wird, obwohl etwas entstanden ist: F5 gelingt
    // und registriert kontextpaket-<laufId>, danach lehnt F6as pruefeStartziel-Zweig OHNE
    // Wirkungsmarke ab. Zurück bleibt ein verwaistes Kontextpaket, auf das kein Schritt mehr
    // zeigt (F-206). Die Kette selbst bleibt heil — der nächste Start zieht eine frische
    // randomUUID.
    //
    // schritt.zeitgrenze_ms überstimmt vorlage.zeitgrenzeMs (E-M3-3, gepinntes Plandatum).
    starteLaufUndVergiss(laufId, eingabenErgebnis.eingaben, schritt.zeitgrenze_ms, (ergebnis, fehler) => {
      // D13-UEBERGABE-OHNE-FENSTER: START (F15 WS-2c, AK6b)
      //
      // Dieser Rückruf läuft im selben synchronen Tick, in dem der Block oben laufAktiv
      // zurückgesetzt hat. Vom ersten Zeichen hier bis zum erneuten `laufAktiv = true` in der
      // Fortsetzung unten darf deshalb kein Kontrollflusswechsel liegen.
      //
      // Das Dateisystem ist das faktische Prädikat, nicht der Ergebnistyp: ein Wurf, BEVOR
      // etwas geschrieben wurde, heißt genauso „nichts ist passiert" wie eine F5-Ablehnung
      // (fuehreAufgabeDurch wirft z.B. bei einer Vorbedingungsverletzung, lange vor dem
      // ersten Checkpoint); ein Wurf DANACH findet das Verzeichnis und heilt nicht. Die
      // frühere Zusatzbedingung 'fehler === null' schloss den technischen Wurf aus und ließ
      // damit dieselbe verwaiste lauf_id zurück, die die Heilung verhindern soll
      // (Reviewer-Pass 10.09.2026, V1).
      //
      // Was das Dateisystem NICHT ersetzt: ein ok:true-Lauf wird nie geheilt, auch wenn unter
      // seiner laufId nichts läge. Ein ok:true ist durch F6a und F7 gelaufen, hat also
      // per Konstruktion eine Wirkungsmarke — läge trotzdem nichts da, wäre das ein Defekt und
      // kein Anlass, ein reales Ergebnis wegzuwerfen.
      const nichtErfolgreich = fehler !== null || ergebnis?.ok === false
      const heilbar = nichtErfolgreich && !existsSync(join(basisVerzeichnis, laufId))

      const schrittStatus = fehler !== null ? 'FEHLGESCHLAGEN' : normalisiereSchrittAusgang(ergebnis)
      const schrittFelder = heilbar ? { status: 'OFFEN', lauf_id: null } : { status: schrittStatus, lauf_id: laufId }
      // Vorgezogen aus dem Heilungszweig unten, weil der Text seit WS-2c zusätzlich als
      // dauerhafter grund in die neue Workflow-Version geht (a5) und nicht nur in die
      // flüchtige Startfehlerliste.
      const anlass = fehler !== null ? `Wurf: ${String(fehler?.message ?? fehler)}` : nichtErfolgreich ? beschreibeAblehnung(ergebnis) : null
      const heilungsGrund = `Schritt '${schritt.schritt_id}': ${anlass} — kein Checkpoint geschrieben, Schritt auf OFFEN zurückgesetzt (kein Replan)`

      // WS-2c (a2) 1.: das Ergebnis von ermittleNaechstenSchritt, das der Updater ohnehin
      // berechnet, zusätzlich hier festhalten. Kein Trick — schreibeWorkflowFortschritt ruft
      // leiteWorkflowFelderAb synchron auf, die Zuweisung ist nach dem Aufruf sicher belegt.
      // Ein zweiter Aufruf von ermittleNaechstenSchritt auf einem selbst zusammengebauten
      // Datensatz wäre die zweite Fassung derselben Entscheidung.
      let naechster = null

      const nachlauf = schreibeWorkflowFortschritt(
        workflowId,
        schritt.schritt_id,
        schrittFelder,
        (datenMitSchritt) => {
          // Ein geheilter Schritt hat nicht stattgefunden — es gibt kein Schrittergebnis, aus
          // dem ein Folgeschritt entstehen dürfte. Der Cursor bleibt auf ihm stehen, der
          // Mensch klärt (KLAERUNG_ERFORDERLICH), und ein erneuter Start ist danach möglich.
          if (heilbar) return { status: 'KLAERUNG_ERFORDERLICH', aktiver_schritt_id: schritt.schritt_id, grund: heilungsGrund }
          naechster = ermittleNaechstenSchritt(datenMitSchritt, { schrittId: schritt.schritt_id, ergebnis: schrittStatus, laufId })
          return {
            status: workflowStatusZuAusgang(naechster),
            aktiver_schritt_id: naechster.aktiverSchrittId,
            // (a5): der Halt-Grund wird persistiert, ein Start räumt ihn ab. Derselbe Text, den
            // die 409-Antwort des Startendpunkts nennt — kein zweiter Formulierungssatz.
            //
            // Den Grund eines vom Menschen gestoppten Workflows kann dieser Ausdruck nicht mehr
            // überschreiben: auf einem GESTOPPT ruft schreibeWorkflowFortschritt
            // leiteWorkflowFelderAb gar nicht erst auf (b1, GESTOPPT-Schutz dort). Eine zweite
            // Bedingung hier wäre eine zweite Fassung derselben Regel.
            grund: naechster.art === 'starte' ? null : beschreibeAutomatAusgang(naechster),
          }
        },
        profilReferenz,
        ladeOptionen,
        // Der EINZIGE Aufruf mit Identitätsprüfung (F-227): dieser Schreibvorgang gehört zu
        // GENAU DIESEM Lauf und darf seinen Ausgang nur dem Schritt geben, der beim Laufende
        // noch dessen lauf_id trägt. Liegt inzwischen eine andere Fassung da — nach einem Stopp
        // ist genau das erlaubt —, wird nichts geschrieben und nichts fortgesetzt.
        laufId
      )
      if (heilbar) {
        const eintrag = { zeitstempel: new Date().toISOString(), laufId, fehler: `Workflow '${workflowId}', ${heilungsGrund}` }
        startfehlerListe.push(eintrag)
        console.error(`[leitstand] ${eintrag.fehler}`)
      }
      if (!nachlauf.ok) {
        // Kein Wurf: der Fire-and-forget-Block fängt ihn zwar, aber ein stiller
        // Startfehler-Eintrag ist hier die ehrlichere Meldung — der Lauf selbst ist real
        // gelaufen.
        const eintrag = { zeitstempel: new Date().toISOString(), laufId, fehler: `Workflow '${workflowId}' nach Schritt '${schritt.schritt_id}': ${nachlauf.grund}` }
        startfehlerListe.push(eintrag)
        console.error(`[leitstand] ${eintrag.fehler}`)
      }

      // ─── Auto-Fortsetzung (F15 WS-2c, AK6b) ──────────────────────────────────
      //
      // Vier Bedingungen, in genau dieser Reihenfolge:
      // 1. Der Fortschritt ist geschrieben. Auf einem NICHT geschriebenen Zustand wird nie
      //    fortgesetzt — sonst liefe Schritt n+1 über einer Platte, auf der Schritt n noch
      //    als laufend steht.
      // 2. Nicht geheilt. Ein geheilter Schritt hat nicht stattgefunden; es gibt kein
      //    Ergebnis, aus dem ein Folgeschritt entstehen dürfte (siehe oben).
      // 3. Es gibt einen Ausgang. naechster bleibt null, wenn der Updater ihn nie erreicht
      //    hat (Heilung oben, oder ein Abbruch in schreibeWorkflowFortschritt vor dem Aufruf).
      // 4. Der Ausgang ist 'starte'. Jeder andere Wert beendet den Automaten STILL im bereits
      //    geschriebenen Zustand — haltFreigabe, haltGrenze, haltKlaerung und fertig sind
      //    keine Fehler, sondern das erklärte Ende. Ihr Grund steht seit (a5) im Artefakt.
      //
      // grenzen.max_schritte ist über haltGrenze die einzige ZÄHLgrenze dieser Schleife (a4) —
      // kein zweiter Zähler daneben, der mit dem ersten auseinanderlaufen könnte, und
      // grenzen.max_replans bleibt unangetastet (F-203). Die TERMINIERUNG hängt nicht an ihr
      // allein (Reviewer-Pass 10.09.2026): max_schritte zählt verschiedene gelaufene Schritte,
      // nicht Werkzeugaufrufe (src/workflow/index.ts, „GRENZE DIESER GRENZE"). Was einen Zyklus
      // wirklich fängt, ist Regel 3 — ein Schritt mit gesetzter lauf_id ist nie startbereit —
      // zusammen mit der Zyklen- und Zusammenführungsfreiheit, die validiereWorkflowDaten beim
      // Anlegen UND beim Laden erzwingt.
      if (!nachlauf.ok) return
      if (heilbar) return
      // 1b. Der GESTOPPT-Schutz hat gegriffen (F-228, (b2)): der Schritt hat seinen
      //     tatsächlichen Ausgang bekommen, die Workflow-Ebene ist eingefroren, und `naechster`
      //     bleibt null, weil der Updater nie gelaufen ist. Die Bedingung darunter fängt den
      //     Fall damit ohnehin — aber still. Dass ein vom Menschen gestoppter Workflow gerade
      //     ein Laufende eingesammelt hat, gehört in die Liste, in der der Mensch nachsieht:
      //     es ist die einzige Spur davon, dass der Stopp gehalten hat.
      if (nachlauf.eingefroren) {
        const eintrag = {
          zeitstempel: new Date().toISOString(),
          laufId,
          fehler: `Workflow '${workflowId}' ist GESTOPPT — Schritt '${schritt.schritt_id}' hat seinen Ausgang (${schrittStatus}) bekommen, die Kette wird NICHT fortgesetzt`,
        }
        startfehlerListe.push(eintrag)
        console.error(`[leitstand] ${eintrag.fehler}`)
        return
      }
      if (naechster === null || naechster.art !== 'starte') return

      const fortsetzung = starteWorkflowSchritt(workflowId, naechster)
      // D13-UEBERGABE-OHNE-FENSTER: ENDE
      if (!fortsetzung.ok) {
        const anlassDerFortsetzung = `automatische Fortsetzung von Workflow '${workflowId}' nach Schritt '${schritt.schritt_id}' fehlgeschlagen (${fortsetzung.art}): ${fortsetzung.grund}`

        // Der SECHSTE Halt-Anlass, den erst WS-2c geschaffen hat — und der einzige, den (a5)
        // in seiner ersten Fassung nicht abdeckte (Reviewer-/QA-Pass 10.09.2026). Warum ohne
        // diesen Schreibvorgang ein zugemauerter Workflow zurückbliebe, steht bei
        // schreibeStartfehlerHalt; der Cursor bleibt dabei auf dem Schritt stehen, an dem es
        // hakt.
        //
        // Der Aufruf liegt hinter dem markierten Übergabebereich: laufAktiv ist hier bereits
        // false (jeder ok:false-Rückgabepunkt von starteWorkflowSchritt liegt VOR der
        // D13-Belegung), die Invariante bleibt unberührt.
        schreibeStartfehlerHalt(workflowId, naechster.schritt.schritt_id, naechster.aktiverSchrittId, laufId, anlassDerFortsetzung, ladeOptionen)
      }
    })

    return { ok: true, schrittId: schritt.schritt_id, laufId }
  }

  return async function requestHandler(req, res) {
    const pfad = new URL(req.url, `http://${req.headers.host}`).pathname

    // Detailendpunkt (AK2) VOR dem Listenendpunkt geprüft — längeres, spezielleres
    // Präfix zuerst. laufId wird nach decodeURIComponent gegen dieselbe Zeichenregel
    // wie ein Startauftrag geprüft (Offene Frage 2/Advisor-Entscheidung), BEVOR sie
    // in join(basisVerzeichnis, laufId) eingesetzt wird — sonst 400 statt Pfad-Escape.
    if (req.method === 'GET' && pfad.startsWith('/api/laeufe/')) {
      const laufId = decodeURIComponent(pfad.slice('/api/laeufe/'.length))
      if (LAUFID_UNZULAESSIGE_ZEICHEN.test(laufId)) {
        sendeJson(res, 400, { grund: `laufId enthält unzulässige Zeichen: ${JSON.stringify(laufId)}` })
        return
      }
      if (!existsSync(join(basisVerzeichnis, laufId))) {
        sendeJson(res, 404, { grund: `Lauf '${laufId}' nicht gefunden` })
        return
      }

      // F12 WS-3 (AK7/AK8): vier Zusatzquellen, jede unabhängig ladbar/fehlerfähig (2.1) —
      // kontextpaket zuerst (auftrag hängt kausal davon ab, Befund 2), laufakte danach (eigene
      // Artefaktkette), rohstrom nutzt dieselbe laufakteVersion (kein zweiter Ladevorgang).
      const kontextpaketVersion = ladeKontextpaketVersion(laufId, basisVerzeichnis)
      const laufakteVersion = ladeArtefaktVersion(`laufakte-${laufId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
      const laufStatus = stelleLaufstatusFest(laufId, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })

      sendeJson(res, 200, {
        laufId,
        checkpoints: sammleCheckpoints(laufId, basisVerzeichnis),
        laufStatus,
        // F14 WS-4 (F-172, trivialer Nachtrag): ob DIESER Lauf gerade der aktive Arbeitsstrang der
        // Serverinstanz ist (D13) — kein Ersatz für eine vollständige F-172-Lösung (auch andere
        // Leitstand-Ansichten), nur dieses eine, bereits vorhandene In-Memory-Feld mitgeliefert.
        aktiv: laufAktiv && laufId === laufAktivLaufId,
        verweigertDaten: baueVerweigertDatenProjektion(laufId, laufStatus, basisVerzeichnis),
        kontextpaket: baueKontextpaketProjektion(kontextpaketVersion),
        auftrag: baueAuftragsbezug(kontextpaketVersion, basisVerzeichnis),
        laufakte: baueLaufakteProjektion(laufakteVersion),
        rohstrom: baueRohstromProjektion(laufakteVersion, repoWurzel),
      })
      return
    }

    if (req.method === 'GET' && pfad === '/api/laeufe') {
      sendeJson(res, 200, sammleLaeufe(basisVerzeichnis))
      return
    }

    if (req.method === 'GET' && pfad === '/api/startfehler') {
      sendeJson(res, 200, startfehlerListe)
      return
    }

    if (req.method === 'GET' && pfad === '/api/auftraege') {
      sendeJson(res, 200, sammleAuftraege(basisVerzeichnis))
      return
    }

    // F15 WS-2a: Detailendpunkt VOR dem Listenendpunkt (längeres, spezielleres Präfix zuerst,
    // Muster /api/laeufe). workflowId wird nach decodeURIComponent gegen dieselbe Zeichenregel
    // geprüft wie eine laufId, BEVOR sie über 'lineage-workflow-<id>' in einen
    // Dateisystempfad eingeht — sonst 400 statt Pfad-Escape.
    if (req.method === 'GET' && pfad.startsWith('/api/workflows/')) {
      const workflowId = dekodiereSegment(pfad.slice('/api/workflows/'.length))
      if (workflowId === null || workflowId.length === 0 || LAUFID_UNZULAESSIGE_ZEICHEN.test(workflowId)) {
        sendeJson(res, 400, { grund: `workflowId fehlt, ist nicht dekodierbar oder enthält unzulässige Zeichen: ${JSON.stringify(pfad.slice('/api/workflows/'.length))}` })
        return
      }
      const version = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
      if (version === null) {
        sendeJson(res, 404, { grund: `Workflow '${workflowId}' nicht gefunden` })
        return
      }
      // Der Detailendpunkt liefert den WORKFLOW_V0-Datensatz unverändert (daten), nicht auf
      // eine Auswahl reduziert: anders als bei der Startvorlage (D5, strikte Allowlist) trägt
      // ein Workflow kein einziges Feld, das ein Geheimnis wäre — er ist genau das, was der
      // Mensch vorher freigegeben hat.
      //
      // F15 WS-3b (löst F-247): zusätzlich die Verstöße und das Automaten-Verdikt. Beide sind
      // ADDITIV — der bestehende Antwortvertrag ändert sich nicht, kein Feld verschwindet.
      //
      // KEIN 409 bei einer ungültigen Fassung, und das ist die eigentliche Entscheidung: eine
      // Fassung anzusehen ist der erste Schritt ihrer Reparatur. Ein Detailendpunkt, der genau
      // die Fassung verweigert, die repariert werden muss, wäre die zugemauerte Sackgasse aus
      // F-207 in neuer Form — dieselbe Linie, aus der POST /api/workflows einen ungültigen
      // Bestand ausdrücklich ersetzbar lässt (bestandUngueltig). Die Ansicht zeigt die
      // Verstöße und lässt den Menschen daran arbeiten, statt ihn auszusperren.
      const verstoesse = validiereWorkflowDaten(version.daten)
      sendeJson(res, 200, {
        workflowId,
        versionSequenz: version.versionSequenz,
        daten: version.daten,
        verstoesse,
        // verstoesse wird durchgereicht statt ein zweites Mal berechnet: dieselbe Prüfung auf
        // demselben Datensatz im selben Request (Reviewer-Pass 10.09.2026).
        naechster: baueNaechsterProjektion(version.daten, verstoesse),
      })
      return
    }

    if (req.method === 'GET' && pfad === '/api/workflows') {
      sendeJson(res, 200, sammleWorkflows(basisVerzeichnis))
      return
    }

    if (req.method === 'GET' && pfad === '/api/startvorlage/werkzeugsaetze') {
      // AK6, D5: strikte Allowlist — nie art/werkzeugStartziel/berechtigungskontext/profilReferenz ausliefern.
      const werkzeugsaetze = Object.entries(vorlage.werkzeugsaetze).map(([name, w]) => ({ name, modus: w.modus, erlaubte_werkzeuge: w.erlaubte_werkzeuge }))
      sendeJson(res, 200, werkzeugsaetze)
      return
    }

    if (req.method === 'POST' && pfad === '/api/auftraege') {
      let body
      try {
        const roh = await leseBody(req)
        body = JSON.parse(roh.length === 0 ? '{}' : roh)
      } catch (fehler) {
        sendeJson(res, 400, { grund: `Body ist kein gültiges JSON (${fehler.message})` })
        return
      }

      const pruefung = pruefeAuftragsformular(body)
      if (!pruefung.ok) {
        sendeJson(res, 400, { grund: pruefung.grund })
        return
      }

      // D1: auftragId wird serverseitig per randomUUID() erzeugt, nie vom Client gewählt (AK4).
      const auftragId = randomUUID()
      // registriereAuftrag führt echte, synchrone Disk-I/O aus und kann werfen (Disk voll,
      // Berechtigungsfehler, transientes Sperrverhalten — CLAUDE.md "Bekannte Fallen"). requestHandler
      // ist eine async function, deren Promise niemand awaitet — ein ungefangener Wurf würde zur
      // unhandled promise rejection und (Node 24) zum Prozessabsturz führen, Reviewer-Pass F12 WS-2.
      try {
        registriereAuftrag(auftragId, profilReferenz, pruefung.titel, pruefung.auftragstext, { basisVerzeichnis })
      } catch (fehler) {
        console.error(`[leitstand] Auftrag '${auftragId}' konnte nicht registriert werden:`, fehler)
        sendeJson(res, 500, { grund: `Auftrag konnte nicht registriert werden: ${fehler.message}` })
        return
      }
      sendeJson(res, 201, { auftragId })
      return
    }

    // F15 WS-2a: nimmt eine vollständige WORKFLOW_V0-Payload entgegen und legt sie als
    // Kernartefakt workflow-<workflow_id> an (Muster POST /api/auftraege). Startet NICHTS und
    // führt NICHTS aus — der Startendpunkt des Schritt-Automaten ist WS-2b.
    if (req.method === 'POST' && pfad === '/api/workflows') {
      let body
      try {
        const roh = await leseBody(req)
        body = JSON.parse(roh.length === 0 ? '{}' : roh)
      } catch (fehler) {
        sendeJson(res, 400, { grund: `Body ist kein gültiges JSON (${fehler.message})` })
        return
      }

      // begruendung ist KEIN WORKFLOW_V0-Feld und wird deshalb vor der Validierung aus dem
      // Rumpf gelöst (F15 WS-2c (b3)): das Schema ist additionalProperties:false, ein
      // mitgeschicktes Feld käme sonst als "unbekanntes Feld" zurück. Es ist ein
      // TRANSPORTfeld — es begründet nicht den Plan, sondern die ENTSCHEIDUNG, ihn so zu
      // ändern, und landet ausschließlich im Entscheidungsartefakt, nie im Workflow.
      //
      // Nebenwirkung, bewusst in Kauf genommen: ein versehentlich mitgeschicktes begruendung
      // ohne Freigabe-Abschwächung wird jetzt still verworfen statt mit 400 abgelehnt. Das ist
      // dieselbe Behandlung wie bei grund und freigabe_erteilt weiter unten — ein Feld, das dem
      // Server gehört und nicht dem Body.
      let begruendungDerPlanaenderung
      if (body !== null && typeof body === 'object' && !Array.isArray(body) && 'begruendung' in body) {
        const { begruendung, ...ohneBegruendung } = body
        begruendungDerPlanaenderung = begruendung
        body = ohneBegruendung
      }

      // Einzige fachliche Prüfung: F15s validiereWorkflowDaten (D5, kein zweiter,
      // selbstgebauter Regelsatz im Server). Die Verstoßtexte gehen unverändert an den Client.
      const verstoesse = validiereWorkflowDaten(body)
      if (verstoesse.length > 0) {
        sendeJson(res, 400, { grund: `WORKFLOW_V0-Verstöße: ${verstoesse.join('; ')}`, verstoesse })
        return
      }

      // Anders als eine auftragId (D1, serverseitig per randomUUID) kommt workflow_id aus der
      // Payload — sie geht über 'lineage-workflow-<id>' in einen Dateisystempfad ein.
      // validiereWorkflowDaten verlangt nur einen nicht-leeren String; die Zeichenregel steht
      // deshalb hier, VOR jedem Schreibversuch (D2), statt sich auf den Wurf des Checkpoint
      // Store zu verlassen, der als 500 herauskäme.
      if (LAUFID_UNZULAESSIGE_ZEICHEN.test(body.workflow_id)) {
        sendeJson(res, 400, { grund: `'workflow_id' enthält unzulässige Zeichen: ${JSON.stringify(body.workflow_id)}` })
        return
      }
      // F15 WS-2b: der eingereichte Datensatz darf selbst keinen der Zustände tragen, in denen
      // er anschließend nicht mehr ersetzbar wäre. Ohne diese Zeile sperrte sich der Mensch mit
      // EINER falschen Feldangabe dauerhaft aus — eine Fassung mit status 'ABGESCHLOSSEN' wurde
      // angenommen und war danach weder ersetzbar (der Bestand ist jetzt gesperrt) noch startbar
      // (Regel 0). 400 statt 409: hier ist der Body schuld, nicht der abgelegte Zustand
      // (QA-Pass 10.09.2026).
      if (GESPERRTE_ERSETZUNGS_STATUS.has(body.status)) {
        sendeJson(res, 400, {
          grund: `'status' darf beim Anlegen oder Ersetzen nicht '${body.status}' sein — ein so eingereichter Workflow wäre weder startbar noch ersetzbar (erlaubt: ${ERSETZBARE_STATUS_TEXT.join(', ')})`,
        })
        return
      }

      // Dieselbe Regel für auftrag_id, aus demselben Grund und seit F15 WS-2b nicht mehr
      // theoretisch: der Startendpunkt lädt 'auftrag-<auftrag_id>', und ladeArtefaktVersion
      // WIRFT bei einem unzulässigen Zeichen (F1s pruefeLaufId) — aus einem async-Handler,
      // dessen Promise niemand awaitet, also mit Prozesstod statt 400 (Reviewer-Pass
      // 10.09.2026, real reproduziert). Hier abgefangen, damit ein solches Artefakt gar nicht
      // erst entsteht; der Startendpunkt prüft zusätzlich, weil Bestandsartefakte es schon
      // sein können.
      if (LAUFID_UNZULAESSIGE_ZEICHEN.test(body.auftrag_id)) {
        sendeJson(res, 400, { grund: `'auftrag_id' enthält unzulässige Zeichen: ${JSON.stringify(body.auftrag_id)}` })
        return
      }

      // F15 WS-2b (4): ein zweiter POST ersetzte bis hierher die Definition eines Workflows,
      // den der Automat gerade abarbeitet — der Mensch hätte Fassung 1 freigegeben, der Schritt
      // schriebe seinen Ausgang in Fassung 2, und E-M3-1s Voraussetzung ("innerhalb eines vom
      // Menschen freigegebenen Workflows") wäre unterlaufen. Gesperrt sind deshalb genau die
      // drei Zustände, in denen eine neue Fassung wirklich Schaden anrichtet:
      //
      //   LAEUFT           — es läuft etwas; die Fassung würde unter dem laufenden Schritt getauscht.
      //   WARTET_FREIGABE  — es wartet etwas auf eine menschliche Freigabe; eine neue Fassung wäre
      //                      eine Freigabe-Umgehung durch die Hintertür.
      //   ABGESCHLOSSEN    — eine fertige Historie wird nicht umgeschrieben; dafür gibt es eine
      //                      neue workflow_id.
      //
      // OFFEN, KLAERUNG_ERFORDERLICH und GESTOPPT sind ERLAUBT. Eine frühere, breitere Fassung
      // dieser Regel ("alles außer OFFEN") sperrte auch die beiden Zustände, in denen die neue
      // Fassung der menschliche REPARATURZUG selbst ist — und mauerte damit genau den Fall zu,
      // für den die Heilung einer verwaisten lauf_id gebaut wurde: ein Tippfehler in
      // schritt.rolle war danach nicht mehr korrigierbar (Reviewer-/QA-Pass 10.09.2026).
      //
      // KEIN max_replans-Verbrauch: max_replans begrenzt die AUTOMATISCHE Wiederholung. Ein
      // Mensch, der eine neue Fassung einreicht, ist selbst die Grenze.
      // Ein Bestand, der die heutigen WORKFLOW_V0-Regeln verletzt, ist IMMER ersetzbar,
      // unabhängig von seinem status: aus ihm kann kein Lauf mehr gestartet werden (der
      // Startendpunkt validiert beim Laden und antwortet 409), also gibt es nichts zu schützen —
      // und ohne diese Ausnahme wäre er dauerhaft unerreichbar. Der Fall entsteht real, sobald
      // eine neue Validatorregel dazukommt: Zusammenführungen waren bis WS-2b gültig UND
      // startbar (Reviewer-Pass 10.09.2026).
      const bestand = ladeArtefaktVersion(`workflow-${body.workflow_id}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
      const bestandUngueltig = bestand !== null && validiereWorkflowDaten(bestand.daten).length > 0
      if (bestand !== null && !bestandUngueltig && GESPERRTE_ERSETZUNGS_STATUS.has(bestand.daten?.status)) {
        sendeJson(res, 409, {
          grund: `Workflow '${body.workflow_id}' existiert bereits mit status '${bestand.daten?.status}' — in diesem Zustand wird er nicht durch eine neue Fassung ersetzt (erlaubt: ${[...ERSETZBARE_STATUS_TEXT].join(', ')})`,
          status: bestand.daten?.status ?? null,
        })
        return
      }

      // ─── Bezeugung einer abgeschwächten Freigabepflicht (F15 WS-2c (b3), löst F-226) ────
      //
      // Der Vergleich läuft gegen den ohnehin geladenen Bestand — kein zusätzliches I/O. Bei
      // einer Erstanlage (bestand === null) gibt es nichts abzuschwächen; dort greift nichts.
      //
      // Auch auf einem UNGÜLTIGEN Bestand wird verglichen: er kann sehr wohl ZWINGEND-Schritte
      // tragen, und dass er die heutigen Formregeln verletzt, macht die Freigabepflicht darin
      // nicht wertlos. ermittleFreigabeAbschwaechungen liest nur schritte[].freigabe und
      // schritt_id, beides prüft die Validierung ohnehin nicht auf Sinn.
      //
      // KEINE Begründungspflicht für gewöhnliche Planänderungen. Das ist der Kern der
      // Variante B (Challenger-Entscheidung 10.09.2026, F-226): eine Pflicht, die bei jedem
      // Speichern anschlägt, wird zur Klickstrecke und dann von niemandem mehr gelesen —
      // dieselbe Erosion, gegen die der Lock-Hinweis aus der WS-2c-Vorbereitung geschrieben
      // ist. Sie greift nur dort, wo real eine Freigabepflicht verschwindet.
      const abschwaechungen = bestand === null ? [] : ermittleFreigabeAbschwaechungen(bestand.daten?.schritte, body.schritte)
      let planaenderungsArtefakt = null
      if (abschwaechungen.length > 0) {
        // Die schritt_ids stehen NAMENTLICH in der Meldung, und das ist der eigentliche Zweck
        // dieser Prüfung — nicht die Begründung selbst. Der Mensch soll lesen können, WELCHE
        // Freigabepflicht er gerade aufgibt; der häufigste Fall ist, dass er es gar nicht
        // bemerkt hat und die Fassung daraufhin korrigiert, statt sie zu begründen.
        const aufzaehlung = abschwaechungen
          .map((eintrag) => `'${eintrag.schritt_id}' (ZWINGEND -> ${eintrag.nachher === null ? 'Schritt entfällt' : eintrag.nachher})`)
          .join(', ')
        if (typeof begruendungDerPlanaenderung !== 'string' || begruendungDerPlanaenderung.trim().length === 0) {
          sendeJson(res, 400, {
            grund: `Diese Fassung nimmt eine Freigabepflicht zurück: ${aufzaehlung}. Dafür ist 'begruendung' Pflicht (nicht-leerer String) — sie wird als Entscheidung festgehalten. War die Abschwächung nicht beabsichtigt, korrigiere die Fassung statt sie zu begründen.`,
            abgeschwaechteFreigaben: abschwaechungen,
          })
          return
        }

        // Das Artefakt entsteht VOR dem Schreiben der neuen Fassung (D2, Muster
        // ABGELEHNT-Zweig des Freigabe-Endpunkts). Anders als beim Stopp aus (b2), wo die
        // Wirkung schon eingetreten war und deshalb nicht zurückgerollt wurde, ist hier noch
        // nichts geschehen: scheitert die Bezeugung, wird die neue Fassung NICHT geschrieben.
        // Eine abgeschwächte Freigabepflicht ohne Bezeugung ist genau der Zustand, den F-226
        // benennt — er darf nicht als Nebenwirkung eines I/O-Fehlers entstehen.
        //
        // Der eingaben-Verweis zeigt auf die VORHERIGE Version: sie ist der Plan, in dem die
        // Freigabepflicht noch stand, und ohne sie ist später nicht mehr feststellbar, WAS
        // aufgegeben wurde. Form wortgleich zu (b1)/(b2) (D5).
        try {
          planaenderungsArtefakt = registriereKernArtefakt(
            `entscheidung-workflow-${body.workflow_id}-planaenderung`,
            profilReferenz,
            { erzeuger: 'mensch', schritt: 'entscheidung-workflow-planaenderung' },
            {
              entscheidung_schema: 'v0',
              ergebnis: 'FREIGABEPFLICHT_ABGESCHWAECHT',
              begruendung: begruendungDerPlanaenderung,
              entschieden_am: new Date().toISOString(),
              abgeschwaechte_freigaben: abschwaechungen,
            },
            [
              {
                pfad: `artefakt:workflow-${body.workflow_id}`,
                zitierter_bereich: `WORKFLOW_V0 versionSequenz ${bestand.versionSequenz}, abgeschwächt: ${aufzaehlung}`,
                inhalts_hash: bestand.inhaltsHash,
              },
            ],
            { basisVerzeichnis, schreiber: STILLER_SCHREIBER }
          )
        } catch (fehler) {
          console.error(`[leitstand] Planänderung an Workflow '${body.workflow_id}' konnte nicht bezeugt werden:`, fehler)
          sendeJson(res, 500, {
            grund: `Die Rücknahme einer Freigabepflicht konnte nicht als Entscheidung festgehalten werden (${fehler.message}) — die neue Fassung wurde deshalb NICHT geschrieben.`,
            abgeschwaechteFreigaben: abschwaechungen,
          })
          return
        }
      }

      // registriereWorkflow führt echte, synchrone Disk-I/O aus und kann werfen — derselbe
      // Grund wie bei registriereAuftrag oben (requestHandler ist eine async function, deren
      // Promise niemand awaitet; ein ungefangener Wurf würde den Prozess beenden).
      // F15 WS-2c: ein eingereichter grund wird auf null normalisiert, nicht übernommen
      // (Reviewer-Pass 10.09.2026). Der Mensch baut seine Reparaturfassung typischerweise aus
      // der aktuellen Version — dann wanderte der Halt-Grund der ALTEN Fassung in eine frische,
      // die gar nicht angehalten ist. Das Feld gehört dem Automaten, nicht dem Body; eine
      // Ablehnung wie bei status wäre hier zu scharf, weil ein kopierter grund ein
      // nachvollziehbarer Bedienfehler ist und keine Umgehung.
      //
      // F15 WS-2c (b1): dasselbe für schritte[].freigabe_erteilt, aber aus einem SCHÄRFEREN
      // Grund. Bliebe das Feld aus dem Body stehen, wäre der ganze Freigabe-Endpunkt
      // umgehbar: ein POST /api/workflows, der das Feld selbst auf wahr setzt, auf einem
      // ZWINGEND-Schritt startete ihn beim nächsten /starten, ohne dass je eine
      // Entscheidung festgehalten wurde — eine Freigabe, die sich der Body selbst erteilt,
      // gegen AK7 Satz 2 und gegen ARCHITECTURE.md §3 ("Der Kern erzeugt niemals ein
      // Freigabeartefakt; Autorisierungen entstehen ausschließlich aus direkter
      // menschlicher Eingabe" — die hier gerade NICHT stattgefunden hat).
      //
      // Normalisiert statt abgelehnt, wie bei grund: der Mensch baut seine Reparaturfassung
      // typischerweise aus der aktuellen Version, und dann kopiert er das Feld versehentlich
      // mit. Die Wirkung ist die sichere Richtung — eine neue Fassung ist ein neuer Plan und
      // braucht eine neue Freigabe; der Schritt hält wieder an, statt ungefragt loszulaufen.
      const koerperOhneFreigaben = {
        ...body,
        grund: null,
        schritte: body.schritte.map((schritt) => {
          const { freigabe_erteilt: _verworfen, ...rest } = schritt
          return rest
        }),
      }
      let registriert
      try {
        registriert = registriereWorkflow(koerperOhneFreigaben, profilReferenz, { basisVerzeichnis })
      } catch (fehler) {
        console.error(`[leitstand] Workflow '${body.workflow_id}' konnte nicht registriert werden:`, fehler)
        sendeJson(res, 500, { grund: `Workflow konnte nicht registriert werden: ${fehler.message}` })
        return
      }
      // Ein zweiter POST mit derselben workflow_id ist kein Fehler, sondern eine neue Version
      // desselben Artefakts (ARCHITECTURE.md §2: versioniert, nicht überschrieben) — deshalb
      // trägt die Antwort versionSequenz, damit der Aufrufer sieht, welche er bekommen hat.
      //
      // Zwei Prüfungen fehlen hier weiterhin BEWUSST (die dritte, der zweite POST auf einen
      // laufenden Workflow, ist seit F15 WS-2b oben umgesetzt):
      // (1) auftrag_id wird NICHT auf EXISTENZ geprüft — anders als POST /api/laeufe, das genau
      //     das synchron tut (F12 AK5). Ein Workflow ohne existierenden Auftrag ist hier ein
      //     zulässiger Zwischenzustand (der Auftrag kann später entstehen); beim Start ist er es
      //     nicht mehr (400 dort). Die ZEICHENregel dagegen greift seit WS-2b auch hier.
      // (2) workflow_id wird nur gegen LAUFID_UNZULAESSIGE_ZEICHEN geprüft (Spiegel von
      //     pruefeLaufId, D5 — kein zweiter Regelsatz). Länge und die unter Windows
      //     unzulässigen Zeichen (: < > " | ? *) bleiben ungeprüft und enden als 500 statt 400,
      //     unter Linux dagegen als 201 — OS-divergent. Eine strengere Regel gehört in den
      //     Checkpoint Store (eine Wahrheitsquelle), nicht als Zweitregel hierher.
      // Bei einer bezeugten Abschwächung trägt die Antwort, WAS bezeugt wurde (b3): sonst
      // sieht der Mensch am 201 nicht, dass er gerade eine Freigabepflicht aufgegeben und
      // dafür ein Entscheidungsartefakt erzeugt hat.
      sendeJson(res, 201, {
        workflowId: body.workflow_id,
        versionSequenz: registriert.versionSequenz,
        ...(planaenderungsArtefakt === null
          ? {}
          : {
              abgeschwaechteFreigaben: abschwaechungen,
              artefaktId: `entscheidung-workflow-${body.workflow_id}-planaenderung`,
              entscheidungVersionSequenz: planaenderungsArtefakt.versionSequenz,
            }),
      })
      return
    }

    if (req.method === 'POST' && pfad === '/api/laeufe') {
      let body
      try {
        const roh = await leseBody(req)
        body = JSON.parse(roh.length === 0 ? '{}' : roh)
      } catch (fehler) {
        sendeJson(res, 400, { grund: `Body ist kein gültiges JSON (${fehler.message})` })
        return
      }

      const startauftrag = pruefeStartauftrag(body)
      if (!startauftrag.ok) {
        sendeJson(res, 400, { grund: startauftrag.grund })
        return
      }

      // F11 WS-2, AK7 (D13): genau ein aktiver Arbeitsstrang je Serverinstanz — geprüft VOR der
      // laufId-spezifischen 409-Prüfung unten, weil D13 unabhängig von der konkreten laufId gilt.
      if (laufAktiv) {
        sendeJson(res, 409, { grund: `ein anderer, über diese Serverinstanz gestarteter Lauf ('${laufAktivLaufId}') ist noch aktiv (D13) — genau ein aktiver Arbeitsstrang` })
        return
      }

      const { laufId, werkzeugsatzName, eingaben: eingabenRoh } = startauftrag
      if (laufIdBelegt(laufId)) {
        sendeJson(res, 409, { grund: `laufId '${laufId}' ist bereits vergeben` })
        return
      }

      // F12 WS-2, AK5: auftragId-Existenzprüfung SYNCHRON, vor jeder Zustandsänderung (Reservierung/202) —
      // anders als das vorgaengerLaufId-Muster in fuehreAufgabeDurch, das erst NACH der 202-Antwort wirft
      // (D2, Plan Abschnitt 0/4). ladeArtefaktVersion ist rein synchron, kein Umbau nötig.
      // Reihenfolge bewusst NACH D13/laufIdBelegt (nicht davor, wie der ursprüngliche Plantext vorsah) —
      // Stefans Korrektur zum Bauauftrag: D13 ist unbedingt und läuft vor jedem request-feld-spezifischen
      // Check, weil es unabhängig vom konkreten Request gilt (Prinzip aus F11 WS-2). D13/laufIdBelegt sind
      // reine Lesezugriffe ohne Zustandsänderung — AK5s "vor jeder Zustandsänderung" bleibt davon unberührt.
      const auftragVersion = ladeArtefaktVersion(`auftrag-${eingabenRoh.auftragId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
      if (auftragVersion === null) {
        sendeJson(res, 400, { grund: `Auftrag '${eingabenRoh.auftragId}' nicht gefunden` })
        return
      }

      // F15 WS-2a: die Auflösung von Werkzeugsatz und Evidenzdateien zu fertigen
      // AusfuehrungsEingaben steht seither in loeseAusfuehrungsEingabenAuf (verhaltensgleich
      // extrahiert, gleiche Reihenfolge/Prüftiefe/Fehlertexte, alle drei Ablehnungsgründe
      // weiterhin 400). Grund für die Extraktion: der Schritt-Automat (WS-2b) muss Schritt n+1
      // über GENAU denselben Weg starten wie ein HTTP-Start — zwei divergierende Wege zu
      // AusfuehrungsEingaben wären zwei Sicherheitsprüfungen, von denen eine altert.
      const eingabenErgebnis = loeseAusfuehrungsEingabenAuf(eingabenRoh, werkzeugsatzName, auftragVersion.daten.auftragstext, vorlage, repoWurzel)
      if (!eingabenErgebnis.ok) {
        sendeJson(res, 400, { grund: eingabenErgebnis.grund })
        return
      }
      const { eingaben } = eingabenErgebnis

      // Reservierung SYNCHRON vor dem fuehreAufgabeDurch-Aufruf (AK5) — sonst gewinnt bei zwei
      // unmittelbar aufeinanderfolgenden POSTs derselbe laufId-Wert zweimal die Prüfung oben.
      angenommeneLaufIds.add(laufId)
      laufAktiv = true
      laufAktivLaufId = laufId
      // F14 WS-4 (AK7): ein AbortController je aktivem Lauf — sein .signal wird unten als
      // abbruchSignal in die AusfuehrungsOptionen DIESES EINEN Laufs gegeben. POST
      // /api/laeufe/<laufId>/abbrechen löst später genau diesen Controller aus (D13: genau ein
      // aktiver Lauf, ein einzelner Controller reicht, kein Multi-Lauf-Registry).
      laufAktivAbortController = new AbortController()
      sendeJson(res, 202, { laufId })

      // F15 WS-2b: der Fire-and-forget-Block stand bis hier inline; seit WS-2b liegt er in
      // starteLaufUndVergiss (oben), weil der Startendpunkt des Schritt-Automaten denselben
      // Block braucht. Verhaltensgleich extrahiert — dieselben Optionen (F-145, F-177), dieselbe
      // D13-Rückgabe in .then UND .catch (AK7), dieselbe Startfehlerliste (AK6). Kein zweiter
      // Aufrufpunkt des Werkzeuglaufs; die Begründung steht am Helfer.
      starteLaufUndVergiss(laufId, eingaben)
      return
    }

    // F15 WS-2b (Meilenstein 3, docs/projekt/zielfassung.md §13.4 E-M3-1): startet GENAU EINEN
    // Schritt eines Workflows über den Automatenpfad. Die automatische Fortsetzung auf Schritt
    // n+1 ist NICHT hier — sie ist WS-2c. Die Route steht bewusst NACH POST /api/laeufe: die
    // D13-Vertragsprüfung in scripts/check-f11-auftrag.mjs sucht das ERSTE 'if (laufAktiv)' und
    // das ERSTE 'if (laufIdBelegt(' im Quelltext; stünde diese Route davor, prüfte das Gate
    // seine Zusage nicht mehr an dem Handler, für den sie geschrieben wurde (Reviewer-Pass
    // 10.09.2026). Gegen die GET-Detailroute ist sie nicht mehrdeutig: dort req.method === 'GET'.
    if (req.method === 'POST' && pfad.startsWith('/api/workflows/') && pfad.endsWith('/starten')) {
      const rohId = pfad.slice('/api/workflows/'.length, pfad.length - '/starten'.length)
      const workflowId = dekodiereSegment(rohId)
      if (workflowId === null || workflowId.length === 0 || LAUFID_UNZULAESSIGE_ZEICHEN.test(workflowId)) {
        sendeJson(res, 400, { grund: `workflowId fehlt, ist nicht dekodierbar oder enthält unzulässige Zeichen: ${JSON.stringify(rohId)}` })
        return
      }

      // (1) Workflow laden.
      const workflowVersion = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, { basisVerzeichnis, schreiber: STILLER_SCHREIBER })
      if (workflowVersion === null) {
        sendeJson(res, 404, { grund: `Workflow '${workflowId}' nicht gefunden` })
        return
      }
      const workflowDaten = workflowVersion.daten

      // (2) validiereWorkflowDaten auch beim LADEN, nicht nur beim Anlegen (features/F15/
      // feature.md, „Entschieden", max_schritte-Eintrag): die Terminierung des Automaten hängt
      // an der Zyklenfreiheit der nachfolger-Kette, und zwischen Anlegen und Start kann eine
      // zweite Fassung desselben Workflows angelegt worden sein. 409 statt 400: der Body ist
      // nicht schuld, der abgelegte Zustand ist es.
      const verstoesse = validiereWorkflowDaten(workflowDaten)
      if (verstoesse.length > 0) {
        sendeJson(res, 409, { grund: `Workflow '${workflowId}' verletzt WORKFLOW_V0: ${verstoesse.join('; ')}`, verstoesse })
        return
      }

      // (2b) Stale LAEUFT: der abgelegte Zustand sagt "läuft", D13 sagt "nichts läuft". Dann ist
      // der Server mitten im Schritt gestorben — der aufgezeichnete Zustand ist veraltet, nicht
      // falsch. Ohne diese Heilung liefe der Aufruf in Regel 3 ("Schritt trägt eine lauf_id")
      // und der Workflow bliebe dauerhaft auf 409 stehen, ohne dass irgendwo steht, warum.
      //
      // Muster: F1Bs stelleLaufstatusFest erkennt denselben Zustand eine Ebene tiefer — ein
      // run_prepared ohne Terminalmarke — und liefert dafür KLAERUNG_ERFORDERLICH statt eines
      // Fehlers. Genau das hier auf Workflow-Ebene: der Zustand wird als klärungsbedürftig
      // FESTGESCHRIEBEN und der Mensch bekommt einen reparierbaren Workflow (er darf jetzt eine
      // neue Fassung einreichen, siehe (A)), statt eines zugemauerten.
      //
      // Der betroffene Schritt wird dabei NICHT angefasst: seine lauf_id bleibt stehen. Das ist
      // der Unterschied zur Heilung nach einem Laufende — dort ist BELEGT, dass nichts
      // geschrieben wurde; hier ist unbekannt, ob unter dieser lauf_id real ein Lauf gelaufen
      // ist, dessen Ausgang niemand mehr eingesammelt hat. Eine lauf_id wegzuwerfen, die auf
      // eine reale Kette zeigt, wäre der schlimmere Fehler.
      //
      // GENAUER als "Workflow steht auf LAEUFT" (Kalibrierung am Gate, 10.09.2026): seit der
      // Cursor-Wanderung steht ein Workflow auch dann auf LAEUFT, wenn der letzte Schritt sauber
      // fertig ist und der Cursor auf dem nächsten, noch OFFENEN Schritt wartet — das ist der
      // gesunde Zwischenstand des Schritt-für-Schritt-Modus, kein Stale-State. Der belastbare
      // Marker ist ein SCHRITT auf LAEUFT: den setzt der Endpunkt unmittelbar vor dem Laufstart,
      // und die Nachbereitung nimmt ihn in jedem Fall wieder herunter. Steht er noch, obwohl D13
      // nichts kennt, hat die Nachbereitung nie stattgefunden.
      const laufenderSchritt = laufAktiv ? undefined : workflowDaten.schritte.find((s) => s.status === 'LAEUFT')
      if (workflowDaten.status === 'LAEUFT' && laufenderSchritt !== undefined) {
        const grund = `Workflow '${workflowId}' steht auf LAEUFT und Schritt '${laufenderSchritt.schritt_id}' ebenfalls, aber über diese Serverinstanz ist kein Lauf aktiv (D13) — der aufgezeichnete Zustand ist veraltet (Serverneustart mitten im Schritt). Der Workflow wurde auf KLAERUNG_ERFORDERLICH gesetzt; die lauf_id des Schritts bleibt unverändert, weil unbekannt ist, ob unter ihr real ein Lauf gelaufen ist.`
        const geheilt = schreibeWorkflowFortschritt(
          workflowId,
          laufenderSchritt.schritt_id,
          {},
          // grund wird mitgeschrieben (WS-2c (a5)): der Stale-Befund entsteht ohne Zutun des
          // Menschen, und die 409-Antwort unten sieht niemand mehr, wenn der Automat ihn
          // ausgelöst hat.
          (datenMitSchritt) => ({ status: 'KLAERUNG_ERFORDERLICH', aktiver_schritt_id: datenMitSchritt.aktiver_schritt_id, grund }),
          profilReferenz,
          { basisVerzeichnis, schreiber: STILLER_SCHREIBER }
        )
        if (!geheilt.ok) {
          console.error(`[leitstand] Stale-LAEUFT-Heilung für Workflow '${workflowId}' fehlgeschlagen:`, geheilt.grund)
          sendeJson(res, 500, { grund: geheilt.grund })
          return
        }
        // F-228, (b2): unerreichbar — die Bedingung oben verlangt status 'LAEUFT', also gerade
        // NICHT 'GESTOPPT'. Trotzdem gelesen statt als Erfolg unterstellt: sonst meldete diese
        // Antwort eine Heilung, die nicht stattgefunden hat.
        if (geheilt.eingefroren) {
          sendeJson(res, 409, { grund: `Workflow '${workflowId}' ist GESTOPPT — es wurde nichts geheilt und nichts gestartet`, art: 'haltGestoppt' })
          return
        }
        sendeJson(res, 409, { grund, stale: true })
        return
      }

      // (3) D13, wortgleich zu POST /api/laeufe und aus demselben Grund an derselben Stelle:
      // die Sperre gilt unabhängig vom konkreten Request und läuft deshalb vor jeder
      // request-spezifischen Prüfung.
      if (laufAktiv) {
        sendeJson(res, 409, { grund: `ein anderer, über diese Serverinstanz gestarteter Lauf ('${laufAktivLaufId}') ist noch aktiv (D13) — genau ein aktiver Arbeitsstrang` })
        return
      }

      // (4) Die Entscheidung trifft ausschließlich F15s ermittleNaechstenSchritt (D5) — ohne
      // Vorschrittergebnis, weil dieser Endpunkt den ERSTEN Schritt startet. Jeder Ausgang
      // außer 'starte' ist ein 409, bei dem nichts geschrieben und nichts gestartet wird.
      const ausgang = ermittleNaechstenSchritt(workflowDaten)
      if (ausgang.art !== 'starte') {
        sendeJson(res, 409, { grund: `Workflow '${workflowId}' ist nicht startbar (${ausgang.art}): ${beschreibeAutomatAusgang(ausgang)}`, art: ausgang.art })
        return
      }
      // (5)-(8) liegen seit F15 WS-2c in starteWorkflowSchritt (a1) — derselbe Startpfad, den
      // die automatische Fortsetzung nach einem erfolgreichen Schritt benutzt. Dieser Endpunkt
      // übersetzt nur noch die Rückgabe in einen Statuscode und verhält sich nach außen
      // unverändert: 202 mit { workflowId, schrittId, laufId }, 400 bei einem untauglichen
      // Plandatum (auftrag_id, fehlendes Eingabe-Artefakt), 409 bei einem Konflikt (vergebene
      // laufId, unbestimmbarer Lineage-Vorgänger), 500, wenn die neue Workflow-Version nicht
      // geschrieben werden konnte oder der Workflow zwischen (1) und hier verschwunden wäre
      // (art 'nichtLadbar' — in diesem Handler unerreichbar, weil dazwischen kein await liegt;
      // die Auto-Fortsetzung erreicht ihn sehr wohl).
      const gestartet = starteWorkflowSchritt(workflowId, ausgang)
      if (!gestartet.ok) {
        sendeJson(res, STARTFEHLER_STATUS[gestartet.art] ?? 500, { grund: gestartet.grund })
        return
      }
      // Die 202 geht raus, sobald der Start synchron durch ist. Sie steht jetzt NACH dem
      // Fire-and-forget-Aufruf statt davor — für den Aufrufer ist das derselbe Ablauf: der
      // Rückruf des Laufs kann frühestens im nächsten Microtask feuern, die Antwort ist da
      // längst geschrieben.
      sendeJson(res, 202, { workflowId, schrittId: gestartet.schrittId, laufId: gestartet.laufId })
      return
    }

    // ─── POST /api/workflows/<id>/freigabe (F15 WS-2c (b1), AK7, löst F-207) ─────────────
    //
    // Der Ausweg aus WARTET_FREIGABE — bis hierher der einzige Halt ohne jeden Weg zurück:
    // FORTSETZBARE_WORKFLOW_STATUS enthält WARTET_FREIGABE, aber ein erneuter POST
    // .../starten läuft über dieselbe Regel wieder in haltFreigabe, und eine korrigierte
    // Fassung ist gesperrt, weil WARTET_FREIGABE in GESPERRTE_ERSETZUNGS_STATUS steht (das ist
    // richtig so: sie wäre eine Freigabe-Umgehung durch die Hintertür). Seit der
    // Auto-Fortsetzung aus (a) fährt der Automat unbeaufsichtigt dorthin.
    //
    // Warum NICHT über POST /api/entscheidungen (D5 wäre das nähere Muster): dessen
    // pruefeEntscheidungsformular verlangt in allen vier Arten eine laufId, und bei
    // WARTET_FREIGABE existiert noch kein Lauf — die Freigabe entscheidet ja gerade darüber,
    // ob einer entsteht. Ein Umbau dort hieße, vier bestehende Arten um einen laufId-losen
    // Sonderfall zu erweitern; das wäre der größere Eingriff am empfindlicheren Pfad.
    //
    // `freigabe` selbst bleibt unverändertes Plandatum (AK7 Satz 2, F-195). Was dieser
    // Endpunkt setzt, ist das Schrittfeld freigabe_erteilt — und nur das löst den Halt auf.
    if (req.method === 'POST' && pfad.startsWith('/api/workflows/') && pfad.endsWith('/freigabe')) {
      const rohId = pfad.slice('/api/workflows/'.length, pfad.length - '/freigabe'.length)
      const workflowId = dekodiereSegment(rohId)
      if (workflowId === null || workflowId.length === 0 || LAUFID_UNZULAESSIGE_ZEICHEN.test(workflowId)) {
        sendeJson(res, 400, { grund: `workflowId fehlt, ist nicht dekodierbar oder enthält unzulässige Zeichen: ${JSON.stringify(rohId)}` })
        return
      }

      let body
      try {
        const roh = await leseBody(req)
        body = JSON.parse(roh.length === 0 ? '{}' : roh)
      } catch (fehler) {
        sendeJson(res, 400, { grund: `Body ist kein gültiges JSON (${fehler.message})` })
        return
      }

      // D13-UEBERGABE-OHNE-FENSTER: START (F15 WS-2c, (b1))
      //
      // Der Bereich beginnt hier, direkt hinter dem Einlesen des Bodys, und nicht erst bei der
      // D13-Prüfung (QA-Pass 10.09.2026, Fehler 6): er schützt ZWEI Eindeutigkeiten, nicht eine.
      // D13 (genau ein aktiver Arbeitsstrang) hängt daran, dass zwischen der Prüfung und der
      // Belegung in starteWorkflowSchritt kein Kontrollflusswechsel liegt. Die Eindeutigkeit der
      // ENTSCHEIDUNG hängt daran, dass zwischen dem Laden des Workflows und dem Schreiben der
      // neuen Fassung ebenfalls keiner liegt — sonst könnten zwei gleichzeitige Freigaben
      // denselben Halt beide auflösen. Alles hier drin ist synchron: ladeArtefaktVersion,
      // validiereWorkflowDaten, ermittleNaechstenSchritt, registriereKernArtefakt,
      // schreibeWorkflowFortschritt, starteWorkflowSchritt.
      const ladeOptionen = { basisVerzeichnis, schreiber: STILLER_SCHREIBER }

      // (1) Laden und validieren — wortgleich zum Startendpunkt und aus demselben Grund: 409
      // statt 400, weil bei einem ungültigen Bestand nicht der Body schuld ist, sondern der
      // abgelegte Zustand.
      const workflowVersion = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)
      if (workflowVersion === null) {
        sendeJson(res, 404, { grund: `Workflow '${workflowId}' nicht gefunden` })
        return
      }
      const workflowDaten = workflowVersion.daten
      const verstoesse = validiereWorkflowDaten(workflowDaten)
      if (verstoesse.length > 0) {
        sendeJson(res, 409, { grund: `Workflow '${workflowId}' verletzt WORKFLOW_V0: ${verstoesse.join('; ')}`, verstoesse })
        return
      }

      // (2) Body-Form. `JSON.parse('null')` und `JSON.parse('[]')` sind gültiges JSON, aber
      // kein Formular: ohne diese Zeile warf der Feldzugriff darunter aus einem async-Handler,
      // dessen Promise niemand einsammelt — Prozesstod statt 400. Real beim ersten Lauf des
      // neuen Gate-Falls reproduziert; POST /api/workflows fängt dieselbe Klasse über
      // validiereWorkflowDaten ("Wurzel ist kein Objekt") ab.
      if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        sendeJson(res, 400, { grund: 'Body muss ein JSON-Objekt sein' })
        return
      }
      // schrittId-Form. Vor der SACHprüfung (3), aber nach dem Laden: ein kaputter Body auf
      // einem unbekannten Workflow ergibt deshalb 404 und nicht 400 (Reviewer-Pass
      // 10.09.2026, V5). Ohne Schreibwirkung, und die Reihenfolge Laden→Validieren bleibt
      // damit wortgleich zum Startendpunkt — das ist der Tausch, der hier bewusst gemacht ist.
      if (typeof body.schrittId !== 'string' || body.schrittId.length === 0) {
        sendeJson(res, 400, { grund: "'schrittId' muss ein nicht-leerer String sein" })
        return
      }
      // Tiefenverteidigung, keine Bequemlichkeit: schritt_id ist im Schema nur „nicht-leerer
      // String", geht hier aber über 'entscheidung-workflow-<workflowId>-<schrittId>' in einen
      // Dateisystempfad ein. Ohne diese Zeile würfe der Checkpoint Store (F1s pruefeLaufId) aus
      // einem async-Handler, dessen Promise niemand einsammelt — Prozesstod statt 400, dieselbe
      // Klasse wie bei auftrag_id (Reviewer-Pass 10.09.2026).
      if (LAUFID_UNZULAESSIGE_ZEICHEN.test(body.schrittId)) {
        sendeJson(res, 400, { grund: `'schrittId' enthält unzulässige Zeichen: ${JSON.stringify(body.schrittId)}` })
        return
      }

      // (3) Liegt für GENAU DIESEN Schritt wirklich eine Freigabefrage vor? Die Antwort gibt
      // F15s ermittleNaechstenSchritt (D5), nicht der abgelegte status.
      //
      // Die erste Fassung dieses Endpunkts verlangte status === 'WARTET_FREIGABE' und war damit
      // in der häufigsten Bauform unbedienbar (QA-Pass 10.09.2026, TC-05/TC-06): diesen Status
      // schreibt AUSSCHLIESSLICH die Nachbereitung eines erfolgreichen Vorschritts. Ist der
      // ERSTE Schritt eines Workflows ZWINGEND — oder der fällige Schritt einer
      // Reparaturfassung —, antwortet POST .../starten 409 und schreibt bewusst nichts; der
      // Workflow bleibt auf OFFEN bzw. KLAERUNG_ERFORDERLICH. Die Freigabe war dann nicht
      // erteilbar, und der einzige verbleibende Weg wäre gewesen, ZWINGEND aus dem Plan zu
      // entfernen — also die Governance-Regel abzuschaffen, ohne dass je eine Entscheidung
      // festgehalten wird. Genau das, was AK7 verhindern soll.
      //
      // Die Regel ist zugleich die SCHÄRFERE Prüfung, nicht die laxere: sie fängt alles, was
      // der Statusvergleich fing (LAEUFT, GESTOPPT, ABGESCHLOSSEN enden in Regel 0/3 und damit
      // nicht in haltFreigabe), und zusätzlich jeden Fall, in dem der Schritt aus einem anderen
      // Grund gar nicht startbar wäre — erreichte Grenze, nicht dispatchbarer Worker. Eine
      // Freigabe, die folgenlos bliebe, wird gar nicht erst entgegengenommen (D2: vor jeder
      // Zustandsänderung, Reviewer-Pass V1). Ein bereits freigegebener Schritt liefert 'starte'
      // statt 'haltFreigabe' — eine zweite Freigabe prallt damit ebenfalls hier ab.
      const ausgang = ermittleNaechstenSchritt(workflowDaten)
      if (ausgang.art !== 'haltFreigabe') {
        sendeJson(res, 409, {
          grund: `Workflow '${workflowId}' hat keine offene Freigabefrage (${ausgang.art}): ${beschreibeAutomatAusgang(ausgang)}`,
          art: ausgang.art,
        })
        return
      }
      // Stale-Schutz: die Entscheidung gilt genau dem Schritt, den der Mensch vor Augen hatte.
      // Ist der Halt zwischen Anzeige und Klick weitergewandert (neue Fassung, Heilung), wird
      // die Freigabe abgelehnt statt auf den neuen Schritt umgedeutet — eine Freigabe für
      // Schritt A darf nie Schritt B starten.
      if (body.schrittId !== ausgang.schrittId) {
        sendeJson(res, 409, {
          grund: `Freigabe nennt Schritt '${body.schrittId}', die offene Freigabefrage betrifft aber '${ausgang.schrittId}' — die Anzeige ist veraltet`,
        })
        return
      }

      // (4) Entscheidung und Begründung. Die Begründung ist Pflicht, wie bei F13s 'terminal'
      // und 'kenntnisnahme' (F-162): eine festgehaltene Menschenentscheidung ohne Begründung
      // ist ein Artefakt, das später niemand mehr einordnen kann.
      if (body.entscheidung !== 'FREIGEGEBEN' && body.entscheidung !== 'ABGELEHNT') {
        sendeJson(res, 400, { grund: "'entscheidung' muss 'FREIGEGEBEN' oder 'ABGELEHNT' sein" })
        return
      }
      if (typeof body.begruendung !== 'string' || body.begruendung.trim().length === 0) {
        sendeJson(res, 400, { grund: "'begruendung' muss ein nicht-leerer String sein (Pflichtfeld)" })
        return
      }

      // (5) D13, wortgleich zu POST /api/laeufe und POST .../starten und aus demselben Grund an
      // derselben Stelle: die Sperre gilt unabhängig vom konkreten Request und läuft deshalb
      // vor jeder Zustandsänderung. Sie gilt auch für ABGELEHNT — dort startet zwar nichts,
      // aber eine zweite Wahrheit über den aktiven Arbeitsstrang entstünde genauso.
      //
      // Der Zusatz zum sonst wortgleichen Text ist hier nötig (QA-Pass 10.09.2026, Befund 9):
      // dieser Endpunkt verbindet ZWEI Akte, entscheiden und starten. Wer hier abgewiesen wird,
      // hat auch seine Entscheidung nicht abgelegt — das sagt eine Meldung über eine fremde
      // laufId von sich aus nicht.
      if (laufAktiv) {
        sendeJson(res, 409, {
          grund: `ein anderer, über diese Serverinstanz gestarteter Lauf ('${laufAktivLaufId}') ist noch aktiv (D13) — genau ein aktiver Arbeitsstrang. Die Entscheidung wurde NICHT festgehalten; nach dem Ende des Laufs erneut einreichen.`,
        })
        return
      }
      const schrittId = body.schrittId
      const begruendung = body.begruendung
      const entschiedenAm = new Date().toISOString()

      // Das Entscheidungsartefakt entsteht VOR jeder Zustandsänderung und in BEIDEN Zweigen
      // (D2, AK7 Satz 2). Muster: der kenntnisnahme-Zweig in POST /api/entscheidungen — kein
      // neues Schema, daten bleibt unknown wie dort (D5). Der Kern erzeugt hier kein
      // Freigabeartefakt aus eigenem Antrieb (ARCHITECTURE.md §3): erzeuger ist 'mensch', und
      // der Inhalt kommt vollständig aus dieser einen menschlichen Eingabe.
      //
      // Die eingaben-Referenz auf die freigegebene Workflow-VERSION ist nicht Zierrat
      // (QA-Pass 10.09.2026, Fehler 5): ohne sie ist später nicht feststellbar, WELCHEN Plan
      // der Mensch freigegeben hat — und eine Freigabe, die nicht sagt, wofür sie gilt, ist als
      // Bezeugung wertlos. Mit ihr greift zusätzlich F2s STALE-Mechanik (D6). Form wortgleich
      // zum Transportpaket in src/human-transport/index.ts (D5, kein zweiter Regelsatz):
      // synthetischer 'artefakt:'-Schlüssel, zitierter_bereich mit versionSequenz,
      // inhalts_hash der geladenen Version.
      const freigegebeneVersion = [
        {
          pfad: `artefakt:workflow-${workflowId}`,
          zitierter_bereich: `WORKFLOW_V0 versionSequenz ${workflowVersion.versionSequenz}, Schritt '${schrittId}'`,
          inhalts_hash: workflowVersion.inhaltsHash,
        },
      ]
      let entscheidungsArtefakt
      try {
        entscheidungsArtefakt = registriereKernArtefakt(
          `entscheidung-workflow-${workflowId}-${schrittId}`,
          profilReferenz,
          { erzeuger: 'mensch', schritt: 'entscheidung-workflow-freigabe' },
          { entscheidung_schema: 'v0', ergebnis: body.entscheidung, begruendung, entschieden_am: entschiedenAm },
          freigegebeneVersion,
          ladeOptionen
        )
      } catch (fehler) {
        console.error(`[leitstand] Freigabeartefakt für Workflow '${workflowId}' konnte nicht registriert werden:`, fehler)
        sendeJson(res, 500, { grund: `Freigabeentscheidung konnte nicht festgehalten werden: ${fehler.message}` })
        return
      }

      if (body.entscheidung === 'ABGELEHNT') {
        // GESTOPPT, nicht KLAERUNG_ERFORDERLICH: die Ablehnung ist eine bewusste
        // Menschenentscheidung, kein ungeklärter Zustand — und GESTOPPT steht NICHT in
        // GESPERRTE_ERSETZUNGS_STATUS. Genau das ist der Reparaturpfad: der Mensch kann danach
        // eine korrigierte Fassung desselben Workflows einreichen. Der Cursor geht auf null,
        // wie bei jedem GESTOPPT (Cursor-Festlegung aus WS-1).
        const gestoppt = schreibeWorkflowFortschritt(
          workflowId,
          schrittId,
          {},
          () => ({ status: 'GESTOPPT', aktiver_schritt_id: null, grund: `Freigabe für Schritt '${schrittId}' ABGELEHNT: ${begruendung}` }),
          profilReferenz,
          ladeOptionen
        )
        if (!gestoppt.ok) {
          console.error(`[leitstand] Workflow '${workflowId}' konnte nach der Ablehnung nicht fortgeschrieben werden:`, gestoppt.grund)
          sendeJson(res, 500, { grund: gestoppt.grund })
          return
        }
        // F-228, (b2): unerreichbar — ein GESTOPPT verlässt Regel 0 über haltGestoppt, und die
        // Prüfung (3) oben verlangt haltFreigabe. Gelesen wird es trotzdem: die Ablehnung will
        // GESTOPPT setzen, und wenn der Workflow schon gestoppt IST, ist das Ergebnis dasselbe,
        // aber der Grund im Artefakt ist der ältere. Die Antwort sagt das, statt eine Begründung
        // zu behaupten, die nirgends steht.
        if (gestoppt.eingefroren) {
          console.error(`[leitstand] Workflow '${workflowId}' war bei der Ablehnung bereits GESTOPPT — die Begründung der Ablehnung steht nur im Entscheidungsartefakt.`)
        }
        sendeJson(res, 200, {
          workflowId,
          schrittId,
          entscheidung: 'ABGELEHNT',
          status: 'GESTOPPT',
          artefaktId: `entscheidung-workflow-${workflowId}-${schrittId}`,
          versionSequenz: entscheidungsArtefakt.versionSequenz,
        })
        return
      }

      // FREIGEGEBEN: das Schrittfeld setzen, den Workflow aus dem Wartezustand holen und den
      // Halt-Grund abräumen (a5 — ein laufender Workflow trägt keinen Halt-Grund).
      const fortschritt = schreibeWorkflowFortschritt(
        workflowId,
        schrittId,
        { freigabe_erteilt: true },
        () => ({ status: 'LAEUFT', aktiver_schritt_id: schrittId, grund: null }),
        profilReferenz,
        ladeOptionen
      )
      if (!fortschritt.ok) {
        console.error(`[leitstand] Workflow '${workflowId}' konnte nach der Freigabe nicht fortgeschrieben werden:`, fortschritt.grund)
        sendeJson(res, 500, { grund: fortschritt.grund })
        return
      }
      // F-228, (b2): unerreichbar aus demselben Grund wie im ABGELEHNT-Zweig. Wäre der Workflow
      // gestoppt, stünde freigabe_erteilt zwar am Schritt, der Workflow bliebe aber GESTOPPT —
      // eine 202 „status: LAEUFT" wäre dann schlicht falsch. Hier wird deshalb abgebrochen,
      // bevor irgendetwas gestartet wird.
      if (fortschritt.eingefroren) {
        const anlassGestoppt = `Freigabe für Schritt '${schrittId}' von Workflow '${workflowId}' ist festgehalten, aber der Workflow ist GESTOPPT — es wurde nichts gestartet`
        console.error(`[leitstand] ${anlassGestoppt}`)
        sendeJson(res, 409, {
          grund: anlassGestoppt,
          art: 'haltGestoppt',
          status: 'GESTOPPT',
          entscheidung: 'FREIGEGEBEN',
          artefaktId: `entscheidung-workflow-${workflowId}-${schrittId}`,
          versionSequenz: entscheidungsArtefakt.versionSequenz,
        })
        return
      }

      // Die Entscheidung, ob jetzt wirklich gestartet wird, trifft auch hier ausschließlich
      // F15s ermittleNaechstenSchritt (D5) — auf dem eben geschriebenen Stand, frisch geladen.
      // Ein selbst zusammengebauter 'starte'-Ausgang wäre die zweite Fassung derselben Regel
      // und umginge jede der sechs Prüfungen, die dort hängen (Grenze, Startbereitschaft,
      // Worker). Die Freigabe erlaubt einen Schritt; sie erzwingt ihn nicht.
      const neueVersion = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)
      const startAusgang = neueVersion === null ? null : ermittleNaechstenSchritt(neueVersion.daten)
      if (startAusgang === null || startAusgang.art !== 'starte') {
        const anlass = `Freigabe für Schritt '${schrittId}' von Workflow '${workflowId}' erteilt, aber der Schritt ist nicht startbar (${startAusgang === null ? 'nichtLadbar' : startAusgang.art}): ${startAusgang === null ? 'Workflow nicht mehr ladbar' : beschreibeAutomatAusgang(startAusgang)}`
        schreibeStartfehlerHalt(workflowId, schrittId, schrittId, null, anlass, ladeOptionen)
        sendeJson(res, 409, {
          grund: anlass,
          art: startAusgang === null ? 'nichtLadbar' : startAusgang.art,
          status: 'KLAERUNG_ERFORDERLICH',
          entscheidung: 'FREIGEGEBEN',
          artefaktId: `entscheidung-workflow-${workflowId}-${schrittId}`,
          versionSequenz: entscheidungsArtefakt.versionSequenz,
        })
        return
      }

      const gestartet = starteWorkflowSchritt(workflowId, startAusgang)
      // D13-UEBERGABE-OHNE-FENSTER: ENDE
      if (!gestartet.ok) {
        // Derselbe Behandlungspfad wie bei der gescheiterten Auto-Fortsetzung aus (a), über
        // dieselbe Funktion: ohne festgeschriebenen Halt bliebe der Workflow auf LAEUFT ohne
        // laufenden Schritt stehen — zugemauert, weil LAEUFT in GESPERRTE_ERSETZUNGS_STATUS
        // steht. Kein zweiter Regelsatz dafür.
        //
        // BEWUSST NICHT über STARTFEHLER_STATUS (QA-Pass 10.09.2026, Fehler 3): dort stünde
        // 400 für ein untaugliches Plandatum — derselbe Code, den dieser Endpunkt sonst für
        // „Body falsch, NICHTS geschrieben" benutzt. Hier ist sehr wohl etwas geschrieben: die
        // Entscheidung ist festgehalten, freigabe_erteilt steht, und der Workflow ist auf
        // KLAERUNG_ERFORDERLICH verschoben. Ein eigener Code mit ausdrücklichem status-Feld,
        // damit die Antwort nicht das Gegenteil dessen nahelegt, was auf der Platte steht.
        const anlass = `Start nach erteilter Freigabe für Schritt '${schrittId}' von Workflow '${workflowId}' fehlgeschlagen (${gestartet.art}): ${gestartet.grund}. Die Entscheidung ist festgehalten; der Workflow steht auf KLAERUNG_ERFORDERLICH und ist über eine korrigierte Fassung erreichbar.`
        schreibeStartfehlerHalt(workflowId, schrittId, schrittId, null, anlass, ladeOptionen)
        sendeJson(res, 409, {
          grund: anlass,
          art: gestartet.art,
          status: 'KLAERUNG_ERFORDERLICH',
          entscheidung: 'FREIGEGEBEN',
          artefaktId: `entscheidung-workflow-${workflowId}-${schrittId}`,
          versionSequenz: entscheidungsArtefakt.versionSequenz,
        })
        return
      }
      // Antwortform bewusst deckungsgleich mit dem ABGELEHNT-Zweig, bis auf die laufId (QA-Pass
      // 10.09.2026, Fehler 7): ein Endpunkt, zwei Entscheidungen, ein Antwortschnitt.
      sendeJson(res, 202, {
        workflowId,
        schrittId: gestartet.schrittId,
        entscheidung: 'FREIGEGEBEN',
        status: 'LAEUFT',
        laufId: gestartet.laufId,
        artefaktId: `entscheidung-workflow-${workflowId}-${schrittId}`,
        versionSequenz: entscheidungsArtefakt.versionSequenz,
      })
      return
    }

    // ─── POST /api/workflows/<id>/stoppen (F15 WS-2c (b2), löst F-216) ──────────────────
    //
    // Die Bremse für eine laufende automatische Kette. Bis hierher war der einzige Eingriff
    // POST /api/laeufe/<laufId>/abbrechen — und der zielt auf eine laufId, die sich mit jedem
    // Schritt ändert: trifft die Anfrage nach dem Ende von Schritt n ein, antwortet sie 404,
    // während Schritt n+1 bereits läuft. Eine neue Fassung als Notbremse ist in LAEUFT gesperrt.
    // Der Mensch hatte also, seit die Kette selbsttätig fährt, keinen verlässlichen Halt.
    //
    // Dieser Endpunkt zielt auf den WORKFLOW, nicht auf einen Lauf. Er ist damit auch dann
    // bedienbar, wenn zwischen zwei Schritten gerade gar nichts läuft.
    //
    // NICHT über POST /api/entscheidungen (D5 wäre das nähere Muster): dessen
    // pruefeEntscheidungsformular verlangt in allen vier Arten eine laufId — genau die Bindung,
    // von der dieser Endpunkt wegkommen soll. Dieselbe Begründung wie beim Freigabe-Endpunkt.
    //
    // AK8 (Leitstand-Oberfläche mit Freigeben/Überspringen/Stoppen) bleibt WS-3 und bleibt
    // offen: hier entsteht der Endpunkt, keine Ansicht und kein Bedienelement.
    if (req.method === 'POST' && pfad.startsWith('/api/workflows/') && pfad.endsWith('/stoppen')) {
      const rohId = pfad.slice('/api/workflows/'.length, pfad.length - '/stoppen'.length)
      const workflowId = dekodiereSegment(rohId)
      if (workflowId === null || workflowId.length === 0 || LAUFID_UNZULAESSIGE_ZEICHEN.test(workflowId)) {
        sendeJson(res, 400, { grund: `workflowId fehlt, ist nicht dekodierbar oder enthält unzulässige Zeichen: ${JSON.stringify(rohId)}` })
        return
      }

      let body
      try {
        const roh = await leseBody(req)
        body = JSON.parse(roh.length === 0 ? '{}' : roh)
      } catch (fehler) {
        sendeJson(res, 400, { grund: `Body ist kein gültiges JSON (${fehler.message})` })
        return
      }

      const ladeOptionen = { basisVerzeichnis, schreiber: STILLER_SCHREIBER }

      // (1) Laden und validieren — wortgleich zum Start- und zum Freigabe-Endpunkt und aus
      // demselben Grund: 409 statt 400, weil bei einem ungültigen Bestand nicht der Body schuld
      // ist, sondern der abgelegte Zustand.
      const workflowVersion = ladeArtefaktVersion(`workflow-${workflowId}`, undefined, ladeOptionen)
      if (workflowVersion === null) {
        sendeJson(res, 404, { grund: `Workflow '${workflowId}' nicht gefunden` })
        return
      }
      const workflowDaten = workflowVersion.daten
      const verstoesse = validiereWorkflowDaten(workflowDaten)
      if (verstoesse.length > 0) {
        sendeJson(res, 409, { grund: `Workflow '${workflowId}' verletzt WORKFLOW_V0: ${verstoesse.join('; ')}`, verstoesse })
        return
      }

      // (2) Body-Form, wortgleich zum Freigabe-Endpunkt: JSON.parse('null') und JSON.parse('[]')
      // sind gültiges JSON, aber kein Formular. Ohne diese Zeile würfe der Feldzugriff darunter
      // aus einem Handler, dessen Promise niemand einsammelt — Prozesstod statt 400. Genau der
      // Defekt, der in (b1) am Freigabe-Endpunkt real reproduziert wurde; er wiederholt sich
      // hier nicht.
      if (body === null || typeof body !== 'object' || Array.isArray(body)) {
        sendeJson(res, 400, { grund: 'Body muss ein JSON-Objekt sein' })
        return
      }

      // (3) Ist überhaupt etwas zu stoppen? ABGESCHLOSSEN und GESTOPPT sind es nicht.
      if (!STOPPBARE_WORKFLOW_STATUS.has(workflowDaten.status)) {
        sendeJson(res, 409, {
          grund: `Workflow '${workflowId}' steht auf '${workflowDaten.status}' — daran ist nichts zu stoppen (stoppbar: ${[...STOPPBARE_WORKFLOW_STATUS].join(', ')})`,
          art: 'nichtStoppbar',
        })
        return
      }

      // (4) Begründung ist Pflicht, wie bei der Freigabe und bei F13s 'terminal' (F-162): ein
      // Stopp ist eine festgehaltene Menschenentscheidung, und er ist der Text, den derselbe
      // Mensch in drei Tagen liest, wenn er wissen will, warum die Kette steht.
      if (typeof body.begruendung !== 'string' || body.begruendung.trim().length === 0) {
        sendeJson(res, 400, { grund: "'begruendung' muss ein nicht-leerer String sein (Pflichtfeld)" })
        return
      }
      const begruendung = body.begruendung

      // (5) ZUERST SCHREIBEN, DANN ABBRECHEN — die Reihenfolge ist die Wirkung, nicht ihr
      // Beiwerk.
      //
      // Der abgebrochene Lauf endet Sekunden später, und seine Nachbereitung lädt den Workflow
      // FRISCH von der Platte. Steht dort schon GESTOPPT, greift der Schutz in
      // schreibeWorkflowFortschritt: der Schritt bekommt seinen tatsächlichen Ausgang, der
      // Workflow bleibt GESTOPPT, und Schritt n+1 startet nicht. Wäre erst abgebrochen und dann
      // geschrieben worden, träfe die Nachbereitung im ungünstigen Fall auf einen noch nicht
      // gestoppten Workflow — und der Automat setzte einen Workflow fort, den der Mensch gerade
      // angehalten hat. Genau dagegen ist der ganze Endpunkt gebaut.
      //
      // schrittId null: der Stopp adressiert keinen Schritt. Der laufende Schritt behält seinen
      // Status LAEUFT und seine lauf_id, bis SEINE Nachbereitung den tatsächlichen Ausgang
      // einträgt — hier etwas anderes hinzuschreiben, hieße den Ausgang eines noch fliegenden
      // Laufs zu raten.
      //
      // Cursor auf null wie bei jedem GESTOPPT (Cursor-Festlegung aus WS-1).
      // STOPP-REIHENFOLGE: START (F15 WS-2c (b2), F-216)
      const grund = `Vom Menschen gestoppt: ${begruendung}`
      const gestoppt = schreibeWorkflowFortschritt(
        workflowId,
        null,
        {},
        () => ({ status: 'GESTOPPT', aktiver_schritt_id: null, grund }),
        profilReferenz,
        ladeOptionen
      )
      if (!gestoppt.ok) {
        console.error(`[leitstand] Workflow '${workflowId}' konnte nicht gestoppt werden:`, gestoppt.grund)
        sendeJson(res, 500, { grund: gestoppt.grund })
        return
      }
      // F-228, (b2): unerreichbar — (3) oben lässt GESTOPPT gar nicht erst durch. Gelesen wird
      // es trotzdem, wie an jeder anderen Aufrufstelle: ein eingefrorener Schreibvorgang hieße,
      // dass die Begründung dieses Stopps nicht auf der Platte steht, und die 200 darunter
      // behauptete das Gegenteil.
      if (gestoppt.eingefroren) {
        sendeJson(res, 409, { grund: `Workflow '${workflowId}' war bereits GESTOPPT — die neue Begründung wurde NICHT festgeschrieben`, art: 'nichtStoppbar' })
        return
      }

      // (6) DANN abbrechen — aber nur, wenn der aktive Lauf wirklich zu DIESEM Workflow gehört.
      //
      // Die Zugehörigkeit wird am Artefakt abgelesen und nicht geraten: es braucht einen Schritt
      // mit status LAEUFT, dessen lauf_id die des aktiven Laufs IST. Ein bloßes laufAktiv würde
      // auch einen Lauf abbrechen, den jemand über POST /api/laeufe gestartet hat, oder den
      // eines ganz anderen Workflows — D13 kennt genau einen aktiven Arbeitsstrang, aber nicht,
      // wem er gehört. Gehört keiner dazu, wird nichts abgebrochen, und das ist kein Fehler:
      // ein Stopp zwischen zwei Schritten ist der Normalfall, für den dieser Endpunkt existiert.
      //
      // KEIN Warten auf das Laufende — Muster POST /api/laeufe/<laufId>/abbrechen: die Antwort
      // geht sofort raus, der abgebrochene Lauf fliegt noch. Was danach passiert, hält der
      // GESTOPPT-Schutz, nicht dieser Handler.
      const laufenderSchritt = workflowDaten.schritte.find((s) => s.status === 'LAEUFT' && s.lauf_id !== null && s.lauf_id === laufAktivLaufId)
      const laufAbgebrochen = laufAktiv && laufenderSchritt !== undefined
      if (laufAbgebrochen) {
        laufAktivAbortController.abort()
        console.error(`[leitstand] Workflow '${workflowId}' gestoppt — laufender Schritt '${laufenderSchritt?.schritt_id ?? '—'}' (Lauf '${laufAktivLaufId}') abgebrochen.`)
      }
      // STOPP-REIHENFOLGE: ENDE

      // (7) Die Bezeugung (F-233, Challenger-Entscheidung 10.09.2026): ein vom Menschen
      // ausgelöster Stopp ist dieselbe Klasse wie eine abgelehnte Freigabe und bekommt
      // dieselbe Spur. Ohne sie stünde die Begründung NUR im Feld grund der neuen
      // Workflow-Version — und GESTOPPT ist ausdrücklich ersetzbar, das ist der vorgesehene
      // Reparaturzug. Die nächste eingereichte Fassung überschriebe den Text, und danach wäre
      // nicht mehr feststellbar, dass ein Mensch gestoppt hat, warum, und welchen Plan er
      // dabei vor Augen hatte. Der Stopp wäre die einzige Menschenentscheidung im System ohne
      // Bezeugung gewesen (ARCHITECTURE.md §3).
      //
      // Aufrufform wortgleich zum ABGELEHNT-Zweig des Freigabe-Endpunkts (D5, kein zweiter
      // Regelsatz): erzeuger 'mensch', entscheidung_schema v0, Pflichtbegründung, Zeitstempel,
      // und ein eingaben-Verweis auf die Workflow-VERSION, die der Mensch beim Stoppen vor
      // sich hatte. Mehrere Stopps desselben Workflows brauchen keine eigene Regel: die
      // artefaktId ist stabil, F2 legt jedes Mal eine neue Version an.
      //
      // D2 ist eingehalten: sämtliche Prüfungen dieses Endpunkts — Zeichenregel der
      // workflowId, Ladbarkeit, WORKFLOW_V0-Gültigkeit, Body-Form, Stoppbarkeit des Status und
      // Pflichtbegründung — liegen VOR dem ersten Schreibvorgang. Es gibt keinen Pfad, auf dem
      // hier etwas geschrieben wird, bevor geprüft wurde.
      //
      // Was abweicht, ist die Reihenfolge GEGENÜBER DEM FREIGABE-ENDPUNKT: dort steht das
      // Entscheidungsartefakt vor der Zustandsänderung, hier steht es danach. Der Stopp muss
      // zuerst auf der Platte stehen — daran hängt, dass die Nachbereitung des abgebrochenen
      // Laufs ihn vorfindet (siehe (5)) —, und der Abbruch darf nicht auf Artefakt-I/O warten.
      // Die Reihenfolge ist damit: stoppen, abbrechen, bezeugen.
      //
      // Die frühere Fassung dieses Absatzes nannte das eine „ABWEICHUNG von D2" und glossierte
      // D2 als „Artefakt vor jeder Zustandsänderung". Beides war falsch: D2 heißt in dieser
      // Datei an vierzehn Stellen „prüfen VOR jedem Schreibzugriff", nirgends „Artefakt zuerst".
      // Eine Textstelle, die eine D-Entscheidung für verhandelbar erklärt, wird von der
      // nächsten Sitzung als Präzedenzfall gelesen — dasselbe Muster wie bei F-215, wo eine
      // Gate-Prüfung die Codeform anderswo diktierte, weil niemand ihre Reichweite nachlas.
      const gestopptAm = new Date().toISOString()
      const stoppArtefaktId = `entscheidung-workflow-${workflowId}-stopp`
      let stoppArtefakt = null
      try {
        stoppArtefakt = registriereKernArtefakt(
          stoppArtefaktId,
          profilReferenz,
          { erzeuger: 'mensch', schritt: 'entscheidung-workflow-stopp' },
          { entscheidung_schema: 'v0', ergebnis: 'GESTOPPT', begruendung, entschieden_am: gestopptAm },
          [
            {
              pfad: `artefakt:workflow-${workflowId}`,
              zitierter_bereich: `WORKFLOW_V0 versionSequenz ${workflowVersion.versionSequenz}`,
              inhalts_hash: workflowVersion.inhaltsHash,
            },
          ],
          ladeOptionen
        )
      } catch (fehler) {
        // KEIN Rückrollen: der Stopp steht bereits auf der Platte und bleibt gültig — er ist
        // die Wirkung, die der Mensch wollte, und ein Workflow, der nach einem 500 doch
        // weiterliefe, wäre der schlimmere Ausgang. Was fehlt, ist die Bezeugung, und genau
        // das sagt die Antwort: eine ehrliche Teilmeldung statt eines stillen Verlusts.
        const eintrag = {
          zeitstempel: gestopptAm,
          laufId: laufAbgebrochen ? laufAktivLaufId : null,
          fehler: `Workflow '${workflowId}' ist gestoppt, aber die Entscheidung konnte nicht als Artefakt festgehalten werden: ${fehler.message}`,
        }
        startfehlerListe.push(eintrag)
        console.error(`[leitstand] ${eintrag.fehler}`)
      }

      sendeJson(res, 200, {
        workflowId,
        laufAbgebrochen,
        bezeugt: stoppArtefakt !== null,
        ...(stoppArtefakt === null
          ? { grund: 'Der Workflow ist gestoppt, aber die Entscheidung wurde NICHT als Artefakt festgehalten — siehe GET /api/startfehler.' }
          : { artefaktId: stoppArtefaktId, versionSequenz: stoppArtefakt.versionSequenz }),
      })
      return
    }

    // F14 WS-4 (AK7, Teil 2): manueller Abbruch des gerade aktiven Laufs. Prüft ausschließlich gegen
    // laufAktivLaufId (D13, kein Multi-Lauf-Registry) — bei Treffer wird der bei dessen Start angelegte
    // AbortController ausgelöst und SOFORT geantwortet, ohne auf das Laufende zu warten (die bestehende
    // fuehreAufgabeDurch-Kette WS-1/WS-2/WS-3 läuft danach asynchron wie bisher fertig, siehe .then oben).
    if (req.method === 'POST' && pfad.startsWith('/api/laeufe/') && pfad.endsWith('/abbrechen')) {
      const laufId = decodeURIComponent(pfad.slice('/api/laeufe/'.length, pfad.length - '/abbrechen'.length))
      if (laufId.length === 0) {
        sendeJson(res, 400, { grund: "laufId darf nicht leer sein (Pfadform '/api/laeufe/<laufId>/abbrechen')" })
        return
      }
      if (LAUFID_UNZULAESSIGE_ZEICHEN.test(laufId)) {
        sendeJson(res, 400, { grund: `laufId enthält unzulässige Zeichen: ${JSON.stringify(laufId)}` })
        return
      }
      if (!laufAktiv || laufId !== laufAktivLaufId) {
        sendeJson(res, 404, { grund: `kein aktiver Lauf mit laufId '${laufId}' (D13) — Abbruch nicht möglich` })
        return
      }
      laufAktivAbortController.abort()
      sendeJson(res, 202, { grund: 'Abbruch angefordert' })
      return
    }

    // F13 WS-2 (AK3-AK7): einziger Entscheidungs-Schreibpfad — kein laufAktiv-Bezug (AK6, D13
    // gilt nur für Laufstarts), keine eigene Schreibfunktion (D5): ausschließlich importiereAntwort/
    // entscheideStale/schreibeWirkungsmarke, synchron, unbekanntes `art` und fehlende Pflichtfelder
    // (inkl. F-162s begruendung bei 'terminal') werden VOR jedem Aufruf abgelehnt (D2). F13 WS-4
    // (F-166/F-167): zusätzlich eine vierte Art 'kenntnisnahme' — beide Arten 'terminal'/
    // 'kenntnisnahme' prüfen VOR jedem Schreiben den echten Laufstatus (stelleLaufstatusFest).
    if (req.method === 'POST' && pfad === '/api/entscheidungen') {
      let body
      try {
        const roh = await leseBody(req)
        body = JSON.parse(roh.length === 0 ? '{}' : roh)
      } catch (fehler) {
        sendeJson(res, 400, { grund: `Body ist kein gültiges JSON (${fehler.message})` })
        return
      }

      const pruefung = pruefeEntscheidungsformular(body)
      if (!pruefung.ok) {
        sendeJson(res, 400, { grund: pruefung.grund })
        return
      }

      // F14 WS-4 (AK8, löst F-175): eine terminale Entscheidung auf dem gerade aktiven Lauf würde
      // die noch laufende fuehreAufgabeDurch-Kette unterlaufen — nur 'terminal'/'kenntnisnahme' sind
      // betroffen (D13 gilt für Laufstarts, nicht für 'antwort'/'stale', AK6 aus F13 WS-2 bleibt
      // unverändert). Geprüft VOR jedem Schreiben, synchron gegen laufAktivLaufId (kein Dateizugriff nötig).
      if ((pruefung.art === 'terminal' || pruefung.art === 'kenntnisnahme') && laufAktiv && pruefung.laufId === laufAktivLaufId) {
        sendeJson(res, 400, { grund: `Lauf '${pruefung.laufId}' ist noch aktiv, Entscheidung nicht möglich (AK8)` })
        return
      }

      // Eine geworfene Vorbedingungsverletzung (keine bestehende transport-<laufId>-Kette,
      // D3-Muster) ist bei (a)/(b) korrekt, kein Bug — 400 mit Klartext statt 500/Absturz.
      try {
        if (pruefung.art === 'antwort') {
          const ergebnis = importiereAntwort(pruefung.laufId, profilReferenz, { antwort: pruefung.antwort }, pruefung.einstufung, optionen)
          if (ergebnis.ok === false) {
            sendeJson(res, 400, { grund: ergebnis.grund })
            return
          }
          sendeJson(res, 200, { versionSequenz: ergebnis.versionSequenz })
          return
        }
        if (pruefung.art === 'stale') {
          const ergebnis = entscheideStale(pruefung.laufId, profilReferenz, pruefung.entscheidung, pruefung.begruendung, optionen)
          sendeJson(res, 200, ergebnis)
          return
        }

        // F13 WS-4 (F-167): 'terminal' und 'kenntnisnahme' brauchen beide den aktuellen
        // Laufstatus VOR jedem Schreiben (D2) — derselbe synchrone Aufruf, den auch der
        // GET /api/laeufe/<laufId>-Detailendpunkt nutzt (D5, kein zweiter Regelsatz).
        const laufStatus = stelleLaufstatusFest(pruefung.laufId, optionen)

        if (pruefung.art === 'terminal') {
          // F-167: vorher ungeprüft — konnte auf einem bereits ABGESCHLOSSENEN Lauf eine
          // verwaiste zweite Terminalmarke erzeugen. 'terminal' löst ausschließlich die von
          // stelleLaufstatusFest selbst benannte aufloesungsbedingung auf.
          if (laufStatus.status !== 'KLAERUNG_ERFORDERLICH') {
            sendeJson(res, 400, { grund: `art 'terminal' ist nur bei Status KLAERUNG_ERFORDERLICH erlaubt (F-167), aktueller Status: ${laufStatus.status}` })
            return
          }
          // art === 'terminal': F-162 — begruendung landet als daten.mensch_begruendung, das
          // Wirkungsmarke-Schema selbst kennt kein erzeuger-Feld.
          const ergebnis = schreibeWirkungsmarke(
            pruefung.laufId,
            profilReferenz,
            'terminal',
            { ergebnis: pruefung.ergebnis, daten: { mensch_begruendung: pruefung.begruendung } },
            optionen
          )
          // F13 WS-3 (AK5, nur art:'terminal' — Stefan-Entscheidung, siehe features/F13/feature.md):
          // die Wirkungsmarke allein ist für eine Wiederaufnahme unsichtbar (context-builder liest nie
          // selbst von der Platte, execution-controller löst 'artefakt:'-Pfade ausschließlich gegen
          // per registriereKernArtefakt registrierte Lineage-Artefakte auf). Deshalb zusätzlich als
          // eigenes Lineage-Artefakt registriert, exakt nach dem Transportpaket-Vorbild
          // (human-transport/index.ts:106-138) — kein neues Schema, daten bleibt unknown wie dort (D5).
          const entscheidungsArtefakt = registriereKernArtefakt(
            `entscheidung-${pruefung.laufId}`,
            profilReferenz,
            { erzeuger: 'mensch', schritt: 'entscheidung-terminal' },
            { entscheidung_schema: 'v0', ergebnis: pruefung.ergebnis, begruendung: pruefung.begruendung, entschieden_am: new Date().toISOString() },
            [],
            optionen
          )
          sendeJson(res, 200, { ...ergebnis, artefaktId: `entscheidung-${pruefung.laufId}`, versionSequenz: entscheidungsArtefakt.versionSequenz })
          return
        }

        // art === 'kenntnisnahme' (F13 WS-4, F-166): der Lauf ist bereits terminal — keine
        // zweite Wirkungsmarke, nur dieselbe Lineage-Registrierung wie im terminal-Zweig (D5).
        // ergebnis kommt ausschließlich aus laufStatus, nie vom Client (verhindert Divergenz
        // zwischen angezeigtem und festgehaltenem Ergebnis).
        if (laufStatus.status !== 'ABGESCHLOSSEN' || (laufStatus.ergebnis !== 'VERWEIGERT' && laufStatus.ergebnis !== 'FEHLGESCHLAGEN')) {
          const statusText = laufStatus.status === 'ABGESCHLOSSEN' ? `${laufStatus.status} (${laufStatus.ergebnis})` : laufStatus.status
          sendeJson(res, 400, { grund: `art 'kenntnisnahme' ist nur bei Status ABGESCHLOSSEN mit Ergebnis VERWEIGERT oder FEHLGESCHLAGEN erlaubt, aktueller Status: ${statusText}` })
          return
        }
        // QA-Befund (F13 WS-4): ein VERWEIGERT MIT echtem Bypass-Verdacht ist der E-186-Fall —
        // renderEntscheidungBlock zeigt dafür bewusst 'antwort' statt 'kenntnisnahme' (app.js,
        // hatBypassVerdacht). Diese client-seitige Weiche allein wäre ein zweiter, nur im Client
        // durchgesetzter Regelsatz (Verstoß gegen "Server ist maßgeblich") — deshalb serverseitig
        // gespiegelt, über dieselbe Projektion (baueVerweigertDatenProjektion), die auch das
        // GET /api/laeufe/<laufId>-Detail nutzt (D5, kein zweiter Regelsatz, keine neue Prüfung).
        if (laufStatus.ergebnis === 'VERWEIGERT') {
          const verweigertDaten = baueVerweigertDatenProjektion(pruefung.laufId, laufStatus, basisVerzeichnis)
          if (typeof verweigertDaten?.bypassVerdachtAnzahl === 'number' && verweigertDaten.bypassVerdachtAnzahl > 0) {
            sendeJson(res, 400, {
              grund: `art 'kenntnisnahme' ist bei VERWEIGERT mit Bypass-Verdacht (bypass_verdacht_anzahl=${verweigertDaten.bypassVerdachtAnzahl}) nicht erlaubt — das ist der E-186-Fall, der eine echte Antwort (art 'antwort') statt einer bloßen Kenntnisnahme erfordert`,
            })
            return
          }
        }
        const kenntnisnahmeArtefakt = registriereKernArtefakt(
          `entscheidung-${pruefung.laufId}`,
          profilReferenz,
          { erzeuger: 'mensch', schritt: 'entscheidung-kenntnisnahme' },
          { entscheidung_schema: 'v0', ergebnis: laufStatus.ergebnis, begruendung: pruefung.begruendung, entschieden_am: new Date().toISOString() },
          [],
          optionen
        )
        sendeJson(res, 200, { artefaktId: `entscheidung-${pruefung.laufId}`, versionSequenz: kenntnisnahmeArtefakt.versionSequenz })
        return
      } catch (fehler) {
        sendeJson(res, 400, { grund: fehler.message })
        return
      }
    }

    const statischerPfad = join(publicVerzeichnis, pfad === '/' ? 'index.html' : pfad)
    if (statischerPfad.startsWith(publicVerzeichnis) && existsSync(statischerPfad) && statSync(statischerPfad).isFile()) {
      sendeDatei(res, statischerPfad)
      return
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Nicht gefunden')
  }
}

/**
 * Prüft, ob die genannte PID noch lebt. process.kill(pid, 0) sendet kein Signal, sondern
 * fragt nur die Existenz ab: ESRCH = Prozess weg, EPERM = Prozess da, aber fremder
 * Eigentümer (zählt als lebend — Abbruch ist hier die sichere Seite).
 * @param pid - zu prüfende Prozesskennung
 * @returns true, wenn der Prozess existiert
 */
function pidLebt(pid) {
  // Ein pid-Feld, das keine positive Ganzzahl ist (fehlend, null, String, negativ), gilt
  // bewusst als tot und führt damit in den Heilungspfad — dieselbe Entscheidung wie bei
  // kaputtem JSON, kein Sonderfall. Eine Lock-Datei mit unbrauchbarem Inhalt ist kein Beleg
  // für eine laufende Instanz.
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (fehler) {
    return fehler.code === 'EPERM'
  }
}

/**
 * Belegt den prozessübergreifenden Instanz-Lock für ein Arbeitsverzeichnis (F-201).
 *
 * Der Erwerb läuft über EXKLUSIVES Anlegen (Flag 'wx'), nicht über existsSync-dann-
 * schreiben: zwei gleichzeitig gestartete Instanzen fänden beide keine Datei vor und
 * belegten beide den Lock — exakt die Race-Klasse, gegen die F-201 gebaut wurde. Nur
 * wenn 'wx' mit EEXIST scheitert, wird die vorgefundene Datei überhaupt gelesen.
 *
 * Lebt die darin genannte PID, wirft die Funktion — der Aufrufer (CLI-Bindeblock)
 * bricht damit VOR server.listen ab; die fremde Datei bleibt dabei unangetastet. Ist
 * die Datei unlesbar, kein gültiges JSON oder nennt sie eine tote PID, wird sie
 * entfernt und GENAU EINMAL neu angelegt: das ist der Heilungspfad nach einem harten
 * Absturz und führt bewusst NICHT zum Abbruch. Scheitert auch dieser zweite Versuch an
 * EEXIST, hat eine andere Instanz das Rennen um die verwaiste Datei gewonnen — dann
 * wird geworfen statt weiterprobiert.
 *
 * Bewusst als eigenständige Funktion und nicht inline im Bindeblock, damit
 * scripts/check-f15-instanzlock.mjs beide Pfade prüfen kann, ohne einen echten Server
 * zu binden. Aufgerufen wird sie ausschließlich aus dem CLI-Bindeblock unten — nie aus
 * erzeugeRequestHandler oder einem Request-Handler (siehe Dateikopf).
 *
 * @param basisVerzeichnis - Kontrollzustand-Wurzel, in der die Lock-Datei liegt
 * @param port - Port, den diese Instanz binden will (nur zur Diagnose in der Datei)
 * @returns { lockPfad, uebernommen } — uebernommen:true genau dann, wenn eine vorgefundene Datei entfernt und ersetzt wurde
 * @throws Error mit menschenlesbarer Meldung (PID, Port, Startzeit, Dateipfad), wenn eine lebende Instanz den Lock hält oder eine andere Instanz das Rennen gewonnen hat
 */
export function belegeInstanzLock(basisVerzeichnis, port) {
  const lockPfad = join(basisVerzeichnis, '.leitstand.lock')
  // Leerzustand wiederherstellen: vor dem Lock startete der Server auch ohne vorhandenes
  // kontrollzustand/ sauber mit leeren Listen (sammleLaeufe/sammleAuftraege/sammleWorkflows
  // prüfen alle mit existsSync). Der wx-Erwerb hat daraus einen ENOENT-Abbruch gemacht —
  // ein frisch geklontes Arbeitsverzeichnis wäre damit nicht mehr startbar. recursive:true
  // ist ein No-op, wenn das Verzeichnis schon existiert.
  mkdirSync(basisVerzeichnis, { recursive: true })
  /** Legt die Lock-Datei exklusiv an. @returns true bei Erfolg, false bei EEXIST (jeder andere fs-Fehler wird eingekleidet weitergeworfen) */
  const legeExklusivAn = () => {
    try {
      writeFileSync(lockPfad, `${JSON.stringify({ pid: process.pid, port, gestartetAm: new Date().toISOString() }, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' })
      return true
    } catch (fehler) {
      if (fehler.code === 'EEXIST') return false
      // Jeder andere fs-Fehler wird NICHT geschluckt, aber eingekleidet: der nackte
      // Node-Text nennt weder den Leitstand noch eine Handlung. Deckt zugleich den Fall ab,
      // dass .leitstand.lock ein Verzeichnis ist (EISDIR/EPERM) — dafür bewusst kein eigener
      // Zweig. Originalfehler bleibt als cause erhalten.
      throw new Error(
        `Der Leitstand konnte die Lock-Datei ${lockPfad} nicht anlegen (Fehlercode ${fehler.code ?? 'unbekannt'}). ` +
          'Prüfe die Schreibrechte auf das Verzeichnis; unter Windows kann auch ein Virenscanner- oder ' +
          'OneDrive-Handle die Datei kurzzeitig sperren — dann hilft ein zweiter Versuch.',
        { cause: fehler }
      )
    }
  }

  let uebernommen = false
  if (!legeExklusivAn()) {
    let vorgefunden = null
    try {
      const gelesen = JSON.parse(readFileSync(lockPfad, 'utf8'))
      if (typeof gelesen === 'object' && gelesen !== null) vorgefunden = gelesen
    } catch {
      // Unlesbar oder kaputtes JSON: wie eine verwaiste Datei behandeln (Heilungspfad).
      vorgefunden = null
    }
    if (vorgefunden !== null && pidLebt(vorgefunden.pid)) {
      throw new Error(
        `Es läuft bereits eine Leitstand-Instanz für dieses Arbeitsverzeichnis: PID ${vorgefunden.pid}, Port ${vorgefunden.port ?? 'unbekannt'}, gestartet ${vorgefunden.gestartetAm ?? 'unbekannt'}. ` +
          `Beende sie, oder entferne nach einem harten Absturz die Lock-Datei ${lockPfad} von Hand.`
      )
    }
    unlinkSync(lockPfad)
    uebernommen = true
    if (!legeExklusivAn()) {
      throw new Error(
        `Die verwaiste Lock-Datei ${lockPfad} wurde im selben Moment von einer anderen Leitstand-Instanz übernommen — diese hier startet nicht. Versuche es erneut, sobald klar ist, welche Instanz laufen soll.`
      )
    }
  }

  // Nur die EIGENE Datei wieder aufräumen: hat sie inzwischen eine fremde pid, gehört sie
  // einer anderen Instanz, die den Lock nach unserem Ende legitim übernommen hat.
  const raeumeAuf = () => {
    try {
      const aktuell = JSON.parse(readFileSync(lockPfad, 'utf8'))
      if (aktuell?.pid === process.pid) unlinkSync(lockPfad)
    } catch {
      // Datei bereits weg oder unlesbar — nichts zu tun.
    }
  }
  process.on('exit', raeumeAuf)
  // Signale lösen 'exit' NICHT aus. Ohne die beiden Handler bliebe nach jedem normalen
  // Ctrl+C eine Lock-Datei liegen, und der nächste Start meldete "Verwaiste Lock-Datei
  // übernommen" — eine Meldung, die bei fast jedem Start kommt, verliert ihre Warnwirkung
  // für den Fall, für den sie gedacht ist (echter Absturz bei laufendem Schritt).
  // SIGTERM wird unter Windows nicht real zugestellt; der Handler schadet dort nicht, der
  // Aufräumpfad läuft dort über SIGINT (Ctrl+C). Der exit-Hook bleibt als Netz für den
  // normalen Programmablauf. Kein Graceful-Shutdown des HTTP-Servers — bewusst nicht Teil
  // dieses Auftrags.
  // Exit-Code 0 statt der konventionellen 130/143 ist bewusst gewählt: der Leitstand wird
  // interaktiv über `npm run leitstand` beendet, und npm druckt bei jedem Exit != 0 einen
  // ELIFECYCLE-Fehlerblock nach einem völlig normalen Ctrl+C. Der Vertragsfall, der Exit 0
  // festschreibt, prüft damit eine gewollte Entscheidung, keine Nachlässigkeit.
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
      raeumeAuf()
      process.exit(0)
    })
  }
  return { lockPfad, uebernommen }
}

// Nur beim direkten Aufruf (`npm run leitstand`) tatsächlich binden — ein Import dieser Datei aus
// scripts/check-f10-leitstand.mjs darf keinen echten Server starten.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // F14 WS-5 (Vorbereitung AK10): Startvorlage per Umgebungsvariable überschreibbar (Muster
  // LEITSTAND_PORT oben) — erlaubt Stefan einen realen Lauf gegen z. B.
  // startvorlagen/beispielprojekt-kurze-zeitgrenze.json, ohne startvorlagen/beispielprojekt.json
  // anzufassen: `LEITSTAND_STARTVORLAGE_PFAD=startvorlagen/beispielprojekt-kurze-zeitgrenze.json npm run leitstand`.
  const startvorlagePfad = process.env.LEITSTAND_STARTVORLAGE_PFAD ?? STANDARD_STARTVORLAGE_PFAD
  // F-201: prozessübergreifender Instanz-Lock, VOR dem Binden. Dasselbe BASISVERZEICHNIS,
  // das erzeugeRequestHandler hier per Default benutzt — der Lock schützt genau dieses
  // kontrollzustand/, nicht den Port (den schützt EADDRINUSE ohnehin).
  try {
    const { lockPfad, uebernommen } = belegeInstanzLock(BASISVERZEICHNIS, PORT)
    if (uebernommen) console.log(`Verwaiste Lock-Datei ${lockPfad} übernommen (kein lebender Vorbesitzer).`)
  } catch (fehler) {
    console.error(fehler.message)
    process.exit(1)
  }
  const server = createServer(erzeugeRequestHandler({ startvorlagePfad }))
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Leitstand läuft auf http://127.0.0.1:${PORT} (Startvorlage: ${startvorlagePfad})`)
  })
}
