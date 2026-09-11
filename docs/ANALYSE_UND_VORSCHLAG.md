# Nordbahn Fundbüro: Eine Analyse aus ersten Prinzipien und Verbesserungsvorschlag

> **Faktencheck 2026-09-08.** Dieses Dokument stammt aus Januar 2026. Die
> Kernanalyse hat sich bei der Überprüfung als richtig erwiesen — die Zahlen in
> Teil 1 stimmen mit den Angaben von SBBs Fundservice-Dienstleister überein.
> Vier Stellen waren jedoch falsch oder unbelegt und sind unten korrigiert bzw.
> markiert:
>
> 1. **Echtzeit-Zugposition ist NICHT verfügbar** (Teil 2.1). GTFS-RT liefert
>    Verspätungen und Ausfälle, keine Fahrzeugpositionen — das ist auf der
>    Plattform ausdrücklich so festgehalten.
> 2. **Formationsdaten gibt es nur für heute bis heute+3 Tage**, ohne Archiv
>    (Teil 2.1). Eine Verlustmeldung kommt immer *nachher*.
> 3. **Die Express-Suche kostet seit 1.1.2026 CHF 75**, nicht CHF 50.
> 4. **Teil 3 (internationale Beispiele) ist unbelegt** und wurde nicht
>    verifiziert.
>
> Alles ohne Quellenangabe ist als Annahme zu lesen, nicht als Tatsache.

## Zusammenfassung

Das Schweizer ÖV-Fundsystem hat einen **grundlegenden Designfehler**: Es behandelt die Rückgabe verlorener Gegenstände als *reaktiven Verwaltungsprozess* statt als *zeitkritische operative Aufgabe*. Dieser Bericht analysiert den Status quo, identifiziert Ursachen und schlägt drei Lösungen vor – von inkrementell bis transformativ.

**Kernaussage**: Du weisst bereits den genauen Zug/Tram (Zeit, Linie, Richtung). Das System verfolgt Fahrzeuge in Echtzeit. Trotzdem gibt es keinen Mechanismus, um die Lücke zwischen "Fahrgast merkt, dass etwas fehlt" und "Fahrer/Kontrolleur wird benachrichtigt" in unter 60 Sekunden zu schliessen.

---

## Teil 1: Analyse des Status Quo

### 1.1 Das SBB-Fundsystem

**Umfang**: Die SBB bearbeitet jährlich ca. **120'000 Fundgegenstände** und
**180'000 Verlustmeldungen** bei einer Rückgabequote von ~55%
([RUBICON](https://www.rubicon.eu/en/portfolio-item/lost-property-service-of-the-swiss-federal-railways-sbb/),
Betreiber von SBBs Fundservice seit 2004). Neuere, SBB zugeschriebene Zahlen:
**~130'000 abgegebene Gegenstände und ~60% Rückgabequote für 2024**
([watson](https://www.watson.ch/schweiz/oev/327531280-fundgegenstaende-im-zug-sbb-erhoeht-preise-fuer-verlorene-dinge)),
gegenüber 52,3% im Jahr 2016
([swissinfo](https://www.swissinfo.ch/ger/fundus-der-sbb-fundsachen-gleicht-einer-wundertuete/43375672)).

**Die eigentliche Lücke** ist die Differenz: rund 180'000 Meldungen jagen rund
120'000 abgegebene Gegenstände. Der Engpass ist nicht der Abgleich — der
funktioniert — sondern dass Gegenstände gar nie beim Betreiber ankommen.

**Aktueller Prozessablauf**:
```
Fahrgast merkt Verlust → Öffnet Browser → Navigiert zur SBB-Website →
Füllt mehrteiliges Formular aus → Wartet auf Abgleich → Gegenstand geht ins Depot →
Gegenstand wird im System erfasst → Treffer gefunden (vielleicht) → Benachrichtigung →
Abholung am Bahnhof (1-3 Tage später)
```

**Mitarbeiter-System**: Die SBB hat bereits eine Mobile-App für ~7'000 Mitarbeitende (entwickelt von RUBICON), die:
- Fundgegenstände mit Barcode erfassen kann
- Verfolgung während des gesamten Prozesses ermöglicht
- Informationen während der Fahrt bereitstellen kann
- Suchanfragen in der App anzeigt

**Die Lücke**: Das Mitarbeiter-System existiert, aber es gibt keine **Echtzeit-Verbindung von Fahrgast → Personal**, solange der Gegenstand noch im Fahrzeug ist.

### 1.2 Die ZVV/Regionalverkehr-Fragmentierung

Bei regionalen Verkehrsmitteln (Trams, Busse) ist die Situation noch schlechter:

| Betreiber | Fundprozess |
|-----------|-------------|
| VBZ (Zürich Trams/Busse) | Separates Fundbüro an der Werdmühlestrasse, online via Easyfind |
| ZVV Dachorganisation | Verweist auf einzelne Betreiber |
| SZU | Kontaktformular pro Betreiber |
| PostAuto | Separates Kontaktformular |
| VZO | Eigenes Fundbüro-System |

**Problem**: Wenn du etwas im Tram verlierst, musst du:
1. Herausfinden, welcher Betreiber diese Linie betreibt
2. Deren spezifischen Fundkontakt finden
3. Deren spezifisches Formular ausfüllen
4. Hoffen, dass sie sich untereinander koordinieren

### 1.3 Zeitkritisch: Das entscheidende Zeitfenster

**Die Physik des Problems**:
- Tram/Zug erreicht Endstation: **10-30 Minuten** nach deinem Ausstieg
- Schnelle Wendereinigung: **5-15 Minuten**
- Gegenstand kann von anderem Fahrgast mitgenommen werden: **jederzeit**
- Fahrer/Kontrolleur hat Kapazität zum Nachschauen: **nur während Wende**

**Aktuell schnellste Option**: Express-Suchauftrag für **CHF 75** pauschal
(inkl. Rücksendung), Rückmeldung innerhalb **4 Stunden**. Bedingungen: der Zug
muss Zugpersonal haben und noch ≥30 Minuten unterwegs sein, oder es muss ein
bedienter Schalter vorhanden sein
([SBB](https://www.sbb.ch/de/hilfe-und-kontakt/fundbuero/express-suchauftrag-aufgeben.html)).
Der Preis wurde per 1.1.2026 von CHF 50 auf CHF 75 erhöht; die Meldung selbst
ist weiterhin gratis, die Gebühr fällt bei erfolgreicher Rückgabe an.

Das ist absurd unpassend zur tatsächlichen Zeitdynamik.

---

## Teil 2: Analyse der Dateninfrastruktur

### 2.1 Was die SBB bereits weiss

Die technische Fähigkeit existiert. Das Open-Data- und App-Ökosystem der SBB umfasst:

| Datenpunkt | Verfügbarkeit für uns (geprüft 2026-09-08) |
|------------|---------------|
| Zug-/Tramnummer zu Zeitpunkt X | ✅ **Ja.** GTFS `trips.txt`: `trip_short_name` = Zugnummer, `original_trip_id` = SJYID. Ohne API-Key. |
| Was tatsächlich gefahren ist | ✅ **Ja.** Ist-Daten, Archiv zurück bis 2016, ohne API-Key. `FAHRT_BEZEICHNER` = SJYID. |
| Haltestellen-/Sektorenregister | ✅ **Ja.** 59'530 Dienststellen; `sektortafel` auf data.sbb.ch mit Koordinaten. |
| Verspätungen / Ausfälle | ✅ **Ja**, mit kostenlosem API-Key (GTFS-RT, 5 Anfragen/Min). |
| Zugformation (welche Wagen, Sektoren) | ⚠️ **Nur heute bis heute+3 Tage. Kein Archiv.** Vier Archiv-Endpunkte geprüft, alle 404. Eine Verlustmeldung kommt immer nachher → **wir müssen den Feed ab Tag eins selbst täglich archivieren.** |
| **Echtzeit-Zugposition** | ❌ **Nein.** Wird auf der Plattform ausdrücklich *nicht* veröffentlicht. Die ursprüngliche Behauptung „✓ GTFS-RT API" war falsch. |
| Reisehistorie (EasyRide) | ❌ **Nicht für Dritte.** SBB-intern; keine öffentliche Schnittstelle gefunden. |
| SwissPass-Identität | ❌ **Nicht für Dritte.** OAuth existiert, ist aber an SBB-Partnerverträge gebunden. |
| Mitarbeiter-Mobile-System (~7'000 Geräte) | ❌ **Kein öffentliches API.** Weder bei RUBICON/Nova Find noch bei easyfind eine Spezifikation gefunden (nicht gefunden ≠ existiert nicht). |

**Quelle für alle ✅-Zeilen**: [opentransportdata.swiss](https://opentransportdata.swiss/),
Lizenz „freie Nutzung, Quellenangabe erforderlich"; API-Keys gratis und
selbstbedient.

**Kernaussage, korrigiert**: Die SBB weiss über EasyRide vermutlich sehr genau,
in welchem Fahrzeug jemand war — aber **wir kommen an diese Daten nicht heran**,
und ein Konzept, das darauf baut, baut auf nichts. Was wir tatsächlich haben,
reicht jedoch: aus Ort und Zeit lassen sich über GTFS die plausiblen Fahrten
vorschlagen, die der Fahrgast dann bestätigt. Das braucht keinen Zugriff auf
seine Reisehistorie — und ist datenschutzrechtlich ohnehin die bessere
Konstruktion.

### 2.2 Was Regionalbetreiber wissen

- VBZ/ZVV haben Echtzeit-Fahrzeugverfolgung
- Fahrerkommunikationssysteme existieren (für Betriebsmeldungen)
- Kontrolleur-Tablets/Handys sind Standard

**Das fehlende Glied**: Kein Pfad von "Fahrgast-Meldung" → "Fahrer-Benachrichtigung" in Echtzeit.

---

## Teil 3: Internationale Best Practices

> ⚠️ **Unbelegt.** Die Angaben in diesem Teil stammen aus der ursprünglichen
> Recherche ohne Quellenangabe und wurden **nicht verifiziert** — insbesondere
> die Gebühr von CHF 4.50 (iLost) und der Sprung der Rückgabequote von <10% auf
> 30% (Keio Corp). Als Hypothesen lesen, nicht zitieren.

### 3.1 Niederlande: iLost-Plattform

Die Niederlande haben das **Fragmentierungsproblem** weitgehend gelöst:
- **iLost** ist eine zentrale Plattform, die von mehreren Betreibern genutzt wird (GVB, HTM, Arriva, RET, NS)
- Fundgegenstände werden vom Personal fotografiert und in Datenbank hochgeladen
- KI-unterstützter Abgleich
- CHF 4.50 Verwaltungsgebühr für Rückversand
- Bearbeitung: Gegenstände werden bis 14-18 Uhr am nächsten Werktag erfasst

**Einschränkung**: Immer noch nicht Echtzeit. Fokus auf nachträglichem Abgleich.

### 3.2 Japan: Find-KI-System

Tokioter Bahnbetreiber implementieren **KI-gestütztes Fundbüro**:
- Personal fotografiert Fundgegenstände mit Tablets
- KI kategorisiert nach Farbe, Form, Merkmalen
- Fahrgäste fragen via LINE-Messenger-App an
- **Rückgabequote stieg von <10% auf 30%** bei Keio Corp
- Yurikamome-Monorail: 15'000 Gegenstände/Jahr, deutliche Reduktion der Anfragezeit

**Kulturfaktor**: Japan hat extrem hohe Ehrlichkeitsraten (Gegenstände bleiben unangetastet).

### 3.3 UK Transit App: Fundbüro-Links

Die Transit-App (in 1000+ Städten) enthält neu:
- Direktlinks zu Fundbüro-Seiten der Partnerbetriebe
- "Lost and found? Ticketing info? We'll now point you to all yer agency's most important pages"

**Einschränkung**: Nur Links – keine Integration, keine Echtzeit-Fähigkeit.

---

## Teil 4: Ursachenanalyse

### 4.1 Warum das aktuelle System versagt

**Aufschlüsselung nach ersten Prinzipien**:

1. **Falsches mentales Modell**: System behandelt dies als "Versicherungsfall" (alles dokumentieren, verifizieren, bearbeiten) statt als "Notfallreaktion" (schnell handeln, später verifizieren)

2. **Fehlanreize**: SBB verlangt für Express-Suche CHF 75, Standardsuche ist gratis. Das macht die tatsächliche Lösung (schnelles Handeln) teuer und subventioniert die ineffektive (langsamer Abgleich).

3. **Organisatorische Silos**: Fundbüro ist eine "Supportfunktion", keine "Betriebsfunktion". Fahrer/Kontrolleure werden nicht an Fundrückgaben gemessen.

4. **Kein Echtzeit-Kanal**: Die App hat Push-Benachrichtigungen für Verspätungen. Warum nicht für Verlustmeldungen auf dem eigenen Fahrzeug?

### 4.2 Die verschwendeten Informationen

Wenn du merkst, dass du etwas verloren hast:

| Du weisst | System weiss | Aktuell genutzt? |
|-----------|--------------|------------------|
| Genaue Ausstiegszeit | Deine EasyRide-Reise | ❌ |
| Ungefährer Sitzbereich | Zugformation | ❌ |
| Linie/Richtung | Echtzeit-Fahrzeugverfolgung | ❌ |
| Gegenstandsbeschreibung | Nichts bis du es sagst | Teilweise |

---

## Teil 5: Lösungsvorschläge

### Option 1: Quick Win – "Verlust melden" in SBB Mobile (Empfehlung)

**Meine Präferenz**, weil mit bestehender Infrastruktur umsetzbar.

**Was es macht**:
- "Etwas verloren?" Button bei kürzlichen Reisen im Reisen-Tab
- Vorausgefüllt: Datum, Zeit, Zug-/Tramnummer, Linie, Haltestellen
- Nutzer ergänzt: Gegenstandsbeschreibung (Foto optional)
- System sendet Benachrichtigung an Mitarbeiter-App für dieses Fahrzeug
- Fahrer/Kontrolleur prüft bei nächster Gelegenheit (Endstation, Pause)
- Status-Updates via Push an Nutzer

**Implementierung**:
```
Nutzer-Reisehistorie → Fahrzeug identifizieren → Mitarbeiter-App-Benachrichtigung
                                                          ↓
                                                    Fahrer prüft
                                                          ↓
                                           Gefunden: Markieren + Standort-Update
                                           Nicht gefunden: Status aktualisieren
```

**Technische Anforderungen**:
- API-Verbindung zwischen SBB Mobile Verlustmeldung → Mitarbeiter-App
- Push-Notification-Fähigkeit für Mitarbeiter-App (existiert bereits)
- Neuer UI-Screen in SBB Mobile (bestehende Patterns)

**Kosten**: Internes Entwicklungsprojekt. Keine neue Infrastruktur.

**Erwartete Wirkung**:
- 10x schnellere Meldungen (2 Taps statt mehrstufiges Formular)
- Höhere Rückgabequote (Gegenstände vor Depot abgefangen)
- Weniger CHF 75 Express-Suchen (bessere Gratis-Option)

### Option 2: Drittanbieter-Companion-App / Browser-Erweiterung

**Für den Fall, dass die SBB nicht handelt**:

**Browser-Erweiterung-Ansatz**:
- Überwacht SBB Mobile Web oder App-Aktivität
- Nach Reiseabschluss: dezenter "Etwas verloren?"-Hinweis
- Klick zum Melden: Erweiterung nutzt SBB Open Data APIs zur Fahrzeugidentifikation
- Generiert vorausgefüllte Verlustmeldung
- Öffnet lostandfound.sbb.ch mit Parametern vorausgefüllt

**Eigenständige App-Ansatz**:
- "FundHelfer" / "SwissTransport Fundbüro"
- Manuelle Eingabe von Zug/Zeit oder automatisch via Standortverlauf
- Einheitliches Interface für SBB, VBZ, ZVV, BLT, etc.
- Ein Formular → leitet zum korrekten Betreiber-System
- Verfolgt Status über Betreiber hinweg

**Technische Anforderungen**:
- SBB Open Data API-Zugang (verfügbar)
- Scraping/Formular-Submission zu Fundbüro-Portalen
- Standortdienste für Reiserekonstruktion
- Betreiber-System-Integration (variiert)

**Einschränkung**: Kann keine Echtzeit-Benachrichtigung an Fahrer ermöglichen (erfordert Betreiberkooperation).

**Wert**: Löst Fragmentierungs- und Friktionsprobleme, nicht Zeitkritikalität.

### Option 3: Transformativ – Echtzeit-Fundsachen-Netzwerk

**Die vollständige Lösung, die SBB bauen sollte**:

**Fahrgastseite**:
- Ein-Tap "Verlust-Alarm" aus kürzlicher Reise
- Foto oder Gegenstandstyp-Auswahl
- Sofortige Benachrichtigung an aktives Fahrzeug

**Betriebsseite**:
- Alarm erscheint auf Fahrer/Kontrolleur-Gerät
- "Fahrgast meldet: Schwarzer Rucksack, Wagen 2, Sitzbereich bei Tür"
- Fahrer bestätigt, prüft bei Endstation
- Kontrolleur kann sofort prüfen falls verfügbar

**Netzwerkeffekte**:
- Andere Fahrgäste können gefragt werden (opt-in Crowd-Assistenz)
- "Ist ein schwarzer Rucksack in deiner Nähe?" Benachrichtigung an Fahrgäste noch im Zug
- Hilfsbereite Person kann "Gefunden" tippen und Übergabe arrangieren

**Integration**:
- Einheitlich über alle Schweizer ÖV-Betreiber
- Eine SwissPass-verknüpfte Identität
- Gamification: "Helfer"-Badge für erfolgreiche Rückgaben

**Geschäftsmodell**:
- Gratis für Meldungen innerhalb 15 Min. nach Reiseende
- CHF 5 für Meldungen 15min-2h
- CHF 15 für Meldungen 2-24h
- CHF 25 für ältere Meldungen
- Fördert schnelle Meldung (wenn Erfolg am höchsten)

---

## Teil 6: Umsetzungsempfehlung

### Phase 1 (3-6 Monate): Quick Wins
1. "Verlust melden" zu SBB Mobile Reisen-Tab hinzufügen
2. Reisedaten automatisch vorausfüllen
3. Mit bestehendem Mitarbeiter-Benachrichtigungssystem verbinden
4. Pilot auf S-Bahn Zürich Strecken

### Phase 2 (6-12 Monate): Regionale Integration
1. Partnerschaft mit ZVV, VBZ für einheitlichen Einstiegspunkt
2. Echtzeit-Benachrichtigungen auf Tram-/Busfahrer erweitern
3. Bilderkennung für schnelleren Abgleich hinzufügen

### Phase 3 (12-24 Monate): Netzwerkeffekt
1. Opt-in Fahrgast-Benachrichtigungssystem
2. Betreiberübergreifende Koordination
3. KI-unterstützter Abgleich und Vorhersage

---

## Teil 7: Technische Demo-Implementierung

Dieses Repository enthält eine **funktionale Demonstration** der vorgeschlagenen Lösung:

### Demo-Komponenten

1. **Fahrgast-App** (SBB Mobile Simulation)
   - Reisehistorie mit "Etwas verloren?" Button
   - Vorausgefülltes Verlustmeldeformular
   - Echtzeit-Statusverfolgung

2. **Fahrer/Personal-Interface**
   - Push-Benachrichtigungen für Verlustmeldungen
   - Ein-Tap "Gefunden"/"Nicht gefunden" Aktionen
   - Fahrzeug-spezifische Meldungsliste

3. **Backend-Services**
   - Reporting Service: Verlust-/Fundmeldungen
   - Matching Service: KI-gestützter Abgleich
   - Notification Service: Echtzeit-WebSocket-Updates

### Technologie-Stack

- **Frontend**: Next.js mit SBB Design System
- **Backend**: Node.js/TypeScript Microservices
- **Datenbank**: PostgreSQL mit Volltextsuche
- **Echtzeit**: Redis Pub/Sub + WebSocket
- **Infrastruktur**: Docker, Kubernetes-ready

---

## Fazit

Das Schweizer ÖV-Fundsystem hat solide Infrastruktur, aber grundlegend falsches Prozessdesign. Die Technologie existiert, um Echtzeit-Zwei-Tap-Verlustmeldungen mit sofortiger Fahrerbenachrichtigung zu ermöglichen. Die Frage ist, ob SBB und Regionalbetreiber ihren Ansatz modernisieren, oder ob eine Drittanbieter-Lösung die Lücke füllt.

**Fazit**: Du solltest nicht mehr als 2 Taps brauchen, um einen verlorenen Gegenstand zu melden, wenn das System bereits genau weiss, in welchem Fahrzeug du warst.

---

*Bericht erstellt: 23. Januar 2026*
*Basierend auf öffentlich verfügbaren Informationen über SBB, ZVV, VBZ und internationale Transitsysteme*
