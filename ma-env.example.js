// ma-env.example.js – kopieren nach ma-env.js und anpassen
// ma-env.js enthält sensible Zugangsdaten und wird in .gitignore ausgeschlossen.
var CFG = {
  /* Basis-URL des MA-Servers, ohne Schrägstrich am Ende.
     Leer lassen, wenn die Datei vom MA-Server selbst ausgeliefert wird. */
  MA: 'http://192.168.1.5:8095',

  /* Long-Lived Token aus MA: Einstellungen > Benutzer > Token erzeugen.
     Rolle "user" genügt; "guest" kann keine Favoriten setzen. */
  TOKEN: 'HIER_LONG_LIVED_TOKEN_EINFÜGEN',

  /* Optionale Auswahl/Reihenfolge der Player anhand ihrer MA-player_id.
     Leer lassen = alle verfügbaren Player, alphabetisch. */
  PLAYERS: [],

  /* Player, der beim Start ausgewählt sein soll (player_id). Leer = erster. */
  DEFAULT_PLAYER: '',

  SEARCH_LIMIT: 12,      /* Treffer je Kategorie */
  LIST_LIMIT: 200,       /* Titel/Alben je Detailansicht */
  IMG_COVER: 512,        /* Cover-Kantenlänge über imageproxy */
  IMG_THUMB: 160         /* Thumbnail-Kantenlänge über imageproxy */
};
