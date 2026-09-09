# Journal — F14

Anhängeprotokoll. Neue Einträge unten anfügen, bestehende nicht ändern.

## 2026-09-09 — Akte angelegt (Status READY_FOR_TECH), WS-1 gebaut

Akte auf Grundlage des F14-Auftrags vom 09.09.2026 (Repo-Stand `be8a62f`)
angelegt. Zehn Akzeptanzkriterien (AK1–AK10). Zwei neue Findings ins
Register aufgenommen (F-175, F-176).

WS-1 (AK1, AK2, AK3) real gebaut: `Starter` (`src/claude-code-gateway/
types.ts`) trägt additiv einen dritten, optionalen Parameter
`StarterOptionen` (`zeitgrenzeMs`, `abbruchSignal`); `ProzessErgebnis`
trägt additiv `beendigungsart: 'TIMEOUT' | 'ABBRUCH' | null`.
`echterStarter` (`src/claude-code-gateway/prozessstart.ts`) nutzt
`execFile`s eingebaute `timeout`-/`signal`-Optionen — kein eigener Timer.
`zeitgrenzeMs` von `AusfuehrungsOptionen`
(`src/execution-controller/types.ts`) über `starteGateway`
(`src/claude-code-gateway/index.ts`) bis `starteProzess` durchgereicht,
kein fest codierter Default (nur `execFile`s eigener Default, dokumentiert
an der einen Stelle). `zeitgrenzeMs` in `VERBOTENE_OPTIONEN_FELDER`
(`scripts/leitstand-server.mjs`) nachgetragen. Löst F-176.

Bewusst nicht in WS-1: Prozessbaum-Kill unter Windows (WS-2), F7-
Klassifikation (WS-3), Leitstand-Endpunkt (WS-4).
