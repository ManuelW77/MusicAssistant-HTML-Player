# CLAUDE.md

Diese Datei gibt Claude Code (claude.ai/code) Anleitung für das Projekt `MA-HTML-Player`.

## Projekt

Ein selbst gehosteter HTML-Dashboard-Controller für [Music Assistant](https://www.music-assistant.io/) (MA). Die Datei `ma-dashboard.html` läuft direkt im Browser – auch auf alten iPads mit iOS 9 / Safari 9 – und spricht direkt mit der MA-WebSocket-API. Sie ersetzt eine frühere Fassung, die über Home Assistant REST-Services medierte und nur sehr eingeschränkte Funktionen bot.

## Zweck und Funktionsumfang

- **Direkte MA-Steuerung** über WebSocket (`/ws`) mit Long-Lived-Token-Authentifizierung.
- **Player-Auswahl** als stationsartige Leiste oben (alle oder eine konfigurierbare Whitelist). Ein Klick auf die bereits aktive Station öffnet ein Gruppierungs-Menü: aktuelle Gruppenmitglieder sind dort entfernbar, weitere gruppierfähige Player können hinzugefügt werden.
- **Now-Playing-Anzeige** mit Cover, Titel, Interpret, Album, Fortschrittsbalken, Transport, Shuffle/Repeat und Lautstärke. Bei Gruppen- oder Sync-Playern lässt sich ein aufklappbares Menü öffnen, um die Lautstärke jedes einzelnen Gruppenmitglieds zu regeln.
- **Suche** über Titel, Alben, Interpreten, Playlists, Radio, Podcasts, Hörbücher.
- **Navigation** innerhalb der Suchergebnisse: Interpret → Alben + Top-Titel, Album → Titel, Playlist → Titel, Podcast → Folgen. Wird eine Detailansicht aus der Bibliothek oder dem Now-Playing-Bereich heraus geöffnet, bleibt der ursprüngliche Reiter (Bibliothek/Warteschlange) optisch aktiv markiert; „Zurück“ führt beim Verlassen der Detailansicht dorthin zurück.
- **Detail-Tabs mit Lazy Loading** in der Interpretansicht: „Top-Titel“ (echte Top-/Featured-Titel, `music/artists/top_tracks`), „Titel“ (vollständige Titelliste, `music/artists/artist_tracks`) und „Alben“ werden erst beim Öffnen des Tabs geladen. Bei Interpreten aus der Bibliothek wird dafür automatisch der echte Streaming-Provider aus `provider_mappings` verwendet statt des Pseudo-Providers `library`, da Letzterer serverseitig nur bibliotheksverknüpfte Einträge liefert (siehe Abschnitt „Bibliothekselemente und Provider-Auflösung“).
- **Bibliothek-Tab** auf der Startseite: schneller Zugriff auf gespeicherte Playlists, Interpreten, Alben, Titel, Radio, Podcasts und Hörbücher – inklusive Favoriten-Herz-Anzeige. Über einen Toggle-Chip "Nur Favoriten" lassen sich alle oder nur favorisierte Einträge anzeigen. Zusätzliche Chips "Name"/"Jahr" sortieren die Liste clientseitig um.
- **Sortierung**: Bibliothek, Suche sowie die Tabs „Titel“ und „Alben“ der Interpretenansicht bieten Chips zum Umschalten der Sortierung ("Name"/"Jahr" bzw. in der Suche zusätzlich "Relevanz" als Default). Sortiert wird clientseitig über `sortMediaItems()`. Der Tab „Top-Titel“ ist bewusst nicht sortierbar, da seine Reihenfolge die Popularitäts-Rangfolge des Servers ist; ebenso bleiben Track-Nummern/Playlist-Reihenfolgen in anderen Detailansichten unverändert.
- **Aktionsblatt** pro Medium: Jetzt abspielen, Als Nächstes, Hinten anhängen, Zur Playlist hinzufügen, Favorit setzen/entfernen, Öffnen/Interpret/Album.
- **Add to Playlist** sowohl aus dem Aktionsblatt als auch vom Now-Playing-Cover aus. Im Sheet werden favorisierte Playlists zuerst angezeigt, danach alle anderen alphabetisch nach Name sortiert.
- **Automix / Smart Crossfade** ein/aus schalten; bei laufender Wiedergabe wird dazu kurz pausiert und fortgesetzt.
- **Warteschlange** anzeigen, direkten Titel anwählen, Einzelpositionen löschen, Queue leeren.
- **Favoriten-Herz** sowohl im Now-Playing-Bereich als auch in jeder Detailansicht.

## Wichtige Dateien

- `ma-dashboard.html` – komplette Single-Page-App (HTML, CSS, JS). Keine Build-Schritt, keine externen Abhängigkeiten.
- `CLAUDE.md` – diese Datei.

## Architektur

### Warum WebSocket statt HTTP JSON-RPC?

MA bietet sowohl den WebSocket-Endpunkt `/ws` als auch eine POST-Route `/api` für JSON-RPC. Die POST-Route sendet **keine CORS-Header**, deshalb scheitern XHR/Fetch aus einer anderen Herkunft (z. B. `file://` auf einem iPad oder einem beliebigen lokalen Webserver) am Preflight. WebSocket-Handshakes unterliegen der Same-Origin-Policy nicht, daher funktioniert die Datei von überall.

### Kommunikationsablauf

1. `connect()` öffnet `ws://<host>/ws` bzw. `wss://<host>/ws`.
2. Als erstes Kommando muss `auth` mit `token` gesendet werden (`send('auth', { token: CFG.TOKEN }, …)`).
3. Nach erfolgreicher Authentifizierung werden initial alle Player und Queues geladen (`bootstrap`).
4. Alle weiteren Zustandsänderungen kommen als Server-Events herein (`player_updated`, `queue_updated`, `queue_time_updated`, `queue_items_updated`, `media_item_updated`).

### Partial-Response-Handling

Lange Listen (z. B. `players/all`, `player_queues/items`, Suchergebnisse) können in Blöcken zu bis zu 500 Einträgen mit `partial: true` eintreffen. Erst die letzte, nicht-partial Nachricht schließt die Antwort ab. Der Client sammelt in `pending[id].chunks` und liefert dann das zusammengefügte Array an den Callback.

### ES5-/iPad-Kompatibilität

- Keine CSS-Variablen, kein CSS-Grid, keine `@supports`.
- `display: -webkit-flex` und `display: flex` mit Vendor-Prefixes.
- Keine Arrow-Funktionen, kein `fetch`, kein `const`/`let`, kein `Promise`, kein `class`, kein `Object.assign`.
- `XMLHttpRequest` nur für den initialen `/info`-Request (zum Auslesen des `Date`-Headers für die Uhr-Korrektur).
- WebSocket ist in Safari 9 vorhanden.
- Schriften kommen ausschließlich aus iOS selbst (`Avenir Next`, `Futura`, `Helvetica Neue`).

## Konfiguration

Zugangsdaten und gerätespezifische Einstellungen liegen in der separaten Datei `ma-env.js`. Diese wird von `ma-dashboard.html` per `<script src="ma-env.js">` geladen und ist in `.gitignore` ausgeschlossen. Als Vorlage dient `ma-env.example.js`.

```javascript
var CFG = {
  MA: 'http://192.168.1.5:8095',   // MA-Basis-URL, ohne abschließenden /
  TOKEN: '<long-lived-token>',     // MA: Einstellungen > Benutzer > Token
  PLAYERS: [],                     // optionale Whitelist von player_ids
  DEFAULT_PLAYER: '',              // player_id, die beim Start aktiv sein soll; leer = automatisch der gerade spielende Player/Gruppe, sonst der erste
  SEARCH_LIMIT: 12,                // Treffer pro Kategorie
  LIST_LIMIT: 200,                 // Titel/Alben je Detailansicht
  IMG_COVER: 512,                  // Cover-Kantenlänge über imageproxy
  IMG_THUMB: 160                   // Thumbnail-Kantenlänge über imageproxy
};
```

Fehlt `ma-env.js` oder einzelne Werte, greifen Fallback-Defaults im Hauptscript. Ist `CFG.MA` leer, wird die aktuelle `location.host` verwendet (z. B. wenn MA die Datei selbst ausliefert).

## Wichtige WebSocket-Befehle

### Player

- `players/all` – alle Player auflisten.
- `players/cmd/play_pause` – Play/Pause umschalten.
- `players/cmd/next`, `players/cmd/previous` – Titel wechseln.
- `players/cmd/seek` – Position im aktuellen Titel setzen.
- `players/cmd/volume_set`, `players/cmd/group_volume` – Lautstärke; bei Sync-Gruppen ist `volume_level` null, dann `group_volume` verwenden.
- Für einzelne Mitglieder eines Gruppenplayers wird `players/cmd/volume_set` mit der jeweiligen `player_id` des Mitglieds gesendet.
- `players/cmd/group` – Player zu einer Gruppe hinzufügen (Parameter: `player_id` des hinzuzufügenden Players, `target_player` als Gruppenleiter).
- `players/cmd/ungroup` – Player aus jeder Sync-/Gruppenzugehörigkeit entfernen (Parameter: `player_id`).
- Ob ein Player überhaupt gruppierbar ist, zeigt das Feature-Flag `set_members` in `supported_features`.

### Queue

- `player_queues/all` – alle Queues laden.
- `player_queues/get_active_queue` – aktive Queue eines Players.
- `player_queues/items` – Inhalte einer Queue.
- `player_queues/play_media` – Medium abspielen (`option: 'replace'|'next'|'add'`).
- `player_queues/play_index` – zu einem bestimmten Queue-Eintrag springen.
- `player_queues/shuffle`, `player_queues/repeat` – Shuffle/Repeat steuern.
- `player_queues/clear`, `player_queues/delete_item` – Queue leeren / Eintrag entfernen.
- Bei aktivem `shuffle_enabled` oder `radio_mode` zeigt die Queue einen Hinweis-Banner an, dass Titel dynamisch gemischt oder generiert werden.
- Die Anzeige zeigt nur die letzten `QUEUE_HISTORY_LIMIT` (3) bereits gespielten Titel vor dem aktuellen Titel, nicht die komplette Verlaufs-Historie – betrifft nur das Rendering in `loadQueue()`, die Server-Queue bleibt unverändert.

### Medien

- `music/search` – globale Suche.
- `music/item_by_uri` – ein Medium anhand seiner URI auflösen (liefert Bibliothekselement mit `favorite`-Flag).
- `music/artists/artist_albums`, `music/artists/artist_tracks` – Detailansicht Interpret: vollständige Diskografie bzw. vollständige Titelliste.
- `music/artists/top_tracks` – echte Top-/Featured-Titel eines Interpreten (bei Bibliothekselementen providerübergreifend aggregiert/dedupliziert); nicht zu verwechseln mit `artist_tracks`, das die komplette Titelliste liefert.
- `music/albums/album_tracks` – Detailansicht Album.
- `music/playlists/playlist_tracks` – Detailansicht Playlist.
- `music/podcasts/podcast_episodes` – Detailansicht Podcast.
- `music/<type>s/library_items` – gespeicherte Einträge eines Medientyps auflisten (`type` = `playlists`, `artists`, `albums`, `tracks`, `radios`, `podcasts`, `audiobooks`).
- `music/playlists/create_playlist` – Playlist erstellen (Parameter: `name`).
- `music/playlists/add_playlist_tracks` – Titel zu Playlist hinzufügen (Parameter: `db_playlist_id`, `uris`).
- `music/favorites/add_item` – Favorit hinzufügen (Parameter: `item: uri`).
- `music/favorites/remove_item` – Favorit entfernen (Parameter: `media_type`, `library_item_id`).

### Player-Konfiguration

- `config/players/get_value` – Config-Wert lesen (Parameter: `player_id`, `key`).
- `config/players/save` – Config-Werte schreiben (Parameter: `player_id`, `values`).

Wird **Automix / Smart Crossfade** umgeschaltet (`smart_fades_mode`), muss bei laufender Wiedergabe zuerst pausiert, dann geschaltet und nach ~300 ms wieder fortgesetzt werden.

## Fortschrittsbalken und der Beta-Bug

In aktuellen MA-Beta-Versionen (ab Commit `cadcd96fd`) sendet der Server keine kontinuierlichen Positions-Ticks mehr. Stattdessen liefert er nur noch Anker-Paare:

- `elapsed_time` – Position im Titel in Sekunden.
- `elapsed_time_last_updated` – Server-Unixzeit dieses Ankers.

Wer den Balken nur bei jedem Event neu zeichnet, sieht einen stehenden Balken, der erst bei Pause/Seek/Titelwechsel nachspringt – genau das alte Verhalten der HA-Fassung.

Die korrekte Implementierung im Dashboard:

1. Anker merken (`anchorPos`, `anchorAt`).
2. Bei laufender Wiedergabe lokal interpolieren: `pos = anchorPos + (serverNow() - anchorAt)`.
3. Alle 500 ms `tick()` aufrufen, um den Balken flüssig zu aktualisieren.
4. Uhr-Korrektur gegen den MA-Server mittels HTTP `Date`-Header von `/info`, damit ein falsch gehendes iPad den Balken nicht verschiebt.

## Favoriten-Asymmetrie

MA behandelt Favoriten absichtlich asymmetrisch:

- **Hinzufügen** geht über `music/favorites/add_item` mit der URI des Elements.
- **Entfernen** braucht dagegen `media_type` + `library_item_id` aus dem Bibliothekselement.

Das Dashboard löst deshalb vor jeder Favoriten-Aktion das Element über `music/item_by_uri` auf. Nur so ist sicher, ob das Element in der Bibliothek liegt und ob `favorite` bereits gesetzt ist.

## Bibliothekselemente und Provider-Auflösung

Elemente aus der Bibliothek (`music/<type>s/library_items`) tragen `provider === 'library'` statt eines echten Streaming-Provider-Domains. `music/artists/artist_albums`/`artist_tracks` liefert bei `provider_instance_id_or_domain: 'library'` serverseitig nur die bereits in der Bibliothek verknüpften Einträge (reine DB-Abfrage), nicht die vollständige Diskografie des Providers.

`resolveProviderRef(it)` löst deshalb bei Bibliothekselementen über `it.provider_mappings` (Pflichtfeld auf jedem MA-Medienobjekt) auf einen echten Provider auf und liefert `{ item_id, provider_instance_id_or_domain }` für den eigentlichen Streaming-Provider. `openArtist()` nutzt das, damit „Top-Titel“/„Alben“ auch bei Navigation über die Bibliothek die vollständige Liste zeigen, statt nur der wenigen bereits bibliotheksverknüpften Einträge.

## Bilder und Imageproxy

MA liefert zu jedem Medium eine `proxy_id`. Über `/imageproxy/<proxy_id>?size=<n>&fmt=jpeg` skaliert der Server das Bild auf die gewünschte Kantenlänge. Das ist auf alten iPads essenziell, da Original-Cover mehrere Megabyte groß sein können.

Der Imageproxy akzeptiert nur die Größen `{0, 80, 160, 256, 512, 1024}`; andere Werte führen zu HTTP 400. `CFG.IMG_COVER` und `CFG.IMG_THUMB` müssen daher auf diese Werte gesetzt werden (Standard: 512 für Cover, 160 für Thumbnails). Falls kein `proxy_id` vorhanden ist, wird als Fallback die Legacy-URL `/imageproxy?path=…&provider=…` verwendet.

Falls `current_media.image_url` aus einer falsch konfigurierten internen `base_url` des MA-Servers stammt (typisch bei Reverse-Proxy oder Docker), wird der Host für proxy-URLs auf `CFG.MA` umgebogen (`fixUrl`).

## Entwicklung und Anpassung

- Änderungen nur in `ma-env.js` vornehmen; der Rest sollte normalerweise nicht angefasst werden müssen.
- `ma-env.js` wird in `.gitignore` ausgeschlossen; Änderungen daran nicht committen.
- Neue Medientypen oder API-Endpunkte in `NAVIGABLE`, `GROUPS`, `LIB_TYPES` und den Detail-Funktionen (`openArtist`, `openAlbum`, `openPlaylist`, `openPodcast`) ergänzen.
- Tabs in Detailansichten werden im View-Objekt als `tabs: [{ key, label, load }]`, `activeTab` und `cache` modelliert.
- „Zur Playlist hinzufügen“ und Automix erweitern das Aktionsblatt bzw. die Toggle-Leiste; neue UI-Elemente müssen ES5-tauglich bleiben.
- Im „Zur Playlist hinzufügen“-Sheet sortiert `loadUserPlaylists()` Favoriten nach oben und ordnet die restlichen Playlists alphabetisch nach Namen.
- Der Bibliothek-Tab ruft `music/<type>s/library_items` ohne `favorite`-Filter auf, damit jedes Item das `favorite`-Flag mitbringt und `mediaRow()` das Herz anzeigen kann. Ein Toggle-Chip „Nur Favoriten“ filtert die Liste client-seitig.
- Gruppen-Member-Lautstärke: Mitglieder werden aus `group_members`/`group_childs` bzw. als Fallback über `synced_to`/`active_group` ermittelt. Jedes Mitglied, das `supported_features` enthält, bekommt einen eigenen Slider unter dem Haupt-Volume-Slider.
- Gruppierungs-Menü: `resolveGroupMembers(id, filterVolume)` ist die gemeinsame Basis für Gruppenmitglieder – mit `filterVolume=true` liefert `getGroupMembers()` nur lautstärkefähige Mitglieder (für die Lautstärke-Slider), mit `filterVolume=false` liefert `renderGroupMenu()` alle Mitglieder (für Anzeige/Entfernen). Kandidaten zum Hinzufügen werden aus `playerIds` gefiltert nach `set_members` in `supported_features`.
- Reiter-Herkunft bei Detailnavigation: `enterDetail()` merkt sich in `navOriginTab`, aus welchem Tab (Bibliothek/Warteschlange) eine Detailansicht geöffnet wurde, und übergibt das an `switchTab(name, pillName)` als zweiten Parameter, damit der ursprüngliche Reiter optisch aktiv bleibt, obwohl die Detailansicht technisch immer in `#paneSearch` läuft. `popView()` schaltet beim Leerwerden des Navigations-Stacks zurück auf `navOriginTab`. Neue Navigationseinstiege in Detailansichten sollten `enterDetail()` statt eines direkten `switchTab('search')` verwenden.
- Sortierung: `sortMediaItems(items, mode)` (`'name'`/`'year'`, bei `'year'` Fallback auf `item.album.year` für Titel ohne eigenes Jahresfeld) ist der gemeinsame Sortier-Helfer für Bibliothek (`libSortMode`), Suche (`searchSortMode`, zusätzlich `'relevance'` als Server-Reihenfolge) und die Tabs „Titel“/„Alben“ der Interpretenansicht (`artistSortMode`, angewendet in `renderActiveSections()`). Die gemeinsame `SORT_MODES`-Konstante (`Name`/`Jahr`) speist sowohl die Bibliothek-Chips als auch die Sortier-Chips in `renderTabs()`. Tabs im View-Objekt tragen dafür ein `sortable`-Flag; „Top-Titel“ ist bewusst `sortable: false`, da seine Reihenfolge die Popularitäts-Rangfolge ist. Nicht in der gemeinsam genutzten `renderSections()` angewendet, da diese auch von Detail-Titellisten mit fixer Reihenfolge (Track-Nummern, Playlist-Reihenfolge) genutzt wird.
- Default-Player-Auswahl: `pickDefaultPlayer()` (in `bootstrap()` verwendet) übernimmt `CFG.DEFAULT_PLAYER` nur, wenn `isPlayerUsable()` (`available`/`enabled` nicht `false`) zutrifft; sonst wird aus `playerIds` der erste Player mit `state === 'playing'` gewählt (Gruppen werden dabei über ihren Leader erkannt, siehe `synced_to`-Filterung in `rebuildPlayerOrder()`), sonst der erste aus `playerIds`.
- UI-Anpassungen nur mit ES5-tauglichem CSS und JS vornehmen.
- Keine externen Bibliotheken einbinden; die Datei soll weiterhin eigenständig lauffähig bleiben.

## Troubleshooting

- **„Anmeldung abgelehnt“** – `CFG.TOKEN` prüfen; Token muss Long-Lived sein und die Rolle mindestens `user` haben.
- **„Dieser Browser kann kein WebSocket“** – iPad/Safari zu alt; mindestens iOS 9.3 erforderlich.
- **Verbindungsampel bleibt rot** – `CFG.MA` prüfen, MA-Server erreichbar, Firewall/WebSocket-Proxy beachten.
- **Balken läuft nicht mit** – siehe Abschnitt „Fortschrittsbalken und der Beta-Bug“; ist kein Client-Bug, sondern erwartetes Server-Verhalten.
- **Bilder laden nicht** – `CFG.MA` muss korrekt sein; bei Reverse-Proxy muss `/imageproxy` erreichbar sein.
