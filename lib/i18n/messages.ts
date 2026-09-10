/**
 * UI text, in the four languages Switzerland actually has.
 *
 * German is the REFERENCE locale: `MessageKey` is derived from it, and the
 * other three are typed as `Record<MessageKey, string>`. A missing French
 * string is therefore a compile error, not a key rendered raw to a passenger
 * on a train. That is the whole reason this is TypeScript rather than JSON —
 * a JSON catalogue can go out of sync in silence, and the failure surfaces to
 * the person least able to do anything about it.
 *
 * `lib/labels.ts` was the SSOT for UI text but held one locale. It was a
 * single-language SSOT, not i18n.
 *
 * Rules:
 *   - no string in a component, ever
 *   - keys name the MEANING, not the text ("report.submit", not "report.send")
 *   - anything with a count takes a function, because plural rules differ per
 *     language and prose cannot express that
 */

export const LOCALES = ['de', 'fr', 'it', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'de';

/** Endonyms — a language picker that says "German" to a French speaker is for us, not them. */
export const LOCALE_NAMES: Record<Locale, string> = {
  de: 'Deutsch',
  fr: 'Français',
  it: 'Italiano',
  en: 'English',
};

const de = {
  'nav.back': 'Zurück',
  'nav.next': 'Weiter',

  'time.now': 'jetzt',
  'time.minutesShort': 'min',
  'time.hoursShort': 'Std.',

  'category.electronics': 'Elektronik',
  'category.bags': 'Taschen',
  'category.clothing': 'Kleidung',
  'category.documents': 'Dokumente',
  'category.keys': 'Schlüssel',
  'category.wallet': 'Portemonnaie',
  'category.glasses': 'Brille',
  'category.umbrella': 'Regenschirm',
  'category.other': 'Anderes',

  'area.seat': 'Sitzplatz',
  'area.table': 'Tisch',
  'area.overhead': 'Gepäckablage',
  'area.floor': 'Boden',
  'area.wc': 'WC-Bereich',
  'area.entrance': 'Einstieg',
  'area.unknown': 'Weiss nicht',

  'app.conceptNotice': 'Unabhängiges Konzept — kein offizielles Produkt',
  'app.skipToContent': 'Zum Inhalt springen',

  'nav.report': 'Melden',
  'nav.myReports': 'Meine Meldungen',
  'nav.staff': 'Personal',

  'report.title': 'Etwas verloren?',
  'report.lede': 'Melden Sie es jetzt — solange der Zug noch unterwegs ist.',
  'report.step.journey': 'Welche Fahrt?',
  'report.step.what': 'Was haben Sie verloren?',
  'report.step.where': 'Wo im Fahrzeug?',
  'report.step.contact': 'Wie erreichen wir Sie?',
  'report.field.station': 'Haltestelle',
  'report.field.stationHint': 'Wo sind Sie eingestiegen oder ausgestiegen?',
  'report.field.time': 'Ungefähre Zeit',
  'report.field.category': 'Art des Gegenstands',
  'report.field.description': 'Beschreibung',
  'report.field.descriptionHint': 'Was macht ihn erkennbar?',
  'report.field.identifier': 'Seriennummer, IMEI oder Gravur',
  'report.field.identifierHint':
    'Das Wichtigste überhaupt — damit ist Ihr Gegenstand eindeutig identifizierbar.',
  'report.field.coach': 'Wagen',
  'report.field.seat': 'Sitzplatz',
  'report.field.email': 'E-Mail',
  'report.field.phone': 'Telefon',
  'report.submit': 'Verlust melden',
  'report.submitting': 'Wird gemeldet…',
  'report.success.title': 'Meldung erfasst',
  'report.success.reference': 'Ihre Referenz',
  'report.success.keepReference': 'Notieren Sie diese Referenz — damit fragen Sie den Status ab.',

  'trip.suggest.heading': 'Welche Fahrt war es?',
  'trip.suggest.none': 'Keine Fahrt gefunden. Bitte Zeit oder Haltestelle anpassen.',
  'trip.suggest.tooMany': 'Zu viele mögliche Fahrten — bitte die Zeit eingrenzen.',
  'trip.suggest.confirm': 'Diese Fahrt',

  'status.submitted': 'Eingegangen',
  'status.notified': 'Personal informiert',
  'status.searching': 'Wird gesucht',
  'status.found_onboard': 'Im Fahrzeug gefunden',
  'status.not_found_onboard': 'Im Fahrzeug nicht gefunden',
  'status.matched': 'Möglicher Treffer',
  'status.returned': 'Zurückgegeben',
  'status.closed': 'Abgeschlossen',
  'status.withdrawn': 'Zurückgezogen',
  'status.expired': 'Abgelaufen',

  'match.strength.identifier': 'Eindeutig identifiziert',
  'match.strength.strong': 'Starker Treffer',
  'match.strength.plausible': 'Möglicher Treffer',
  'match.strength.weak': 'Schwacher Treffer',
  'match.explain': 'Gefunden über Seriennummer bzw. Fahrt — nicht über die Beschreibung allein.',

  'staff.title': 'Meldungen',
  'staff.empty': 'Keine offenen Meldungen.',
  'staff.connected': 'Verbunden',
  'staff.disconnected': 'Keine Verbindung',
  'staff.reconnecting': 'Verbindung wird wiederhergestellt…',
  'staff.acknowledge': 'Übernehmen',
  'staff.found': 'Gefunden',
  'staff.notFound': 'Nicht gefunden',

  'error.generic': 'Etwas ist schiefgelaufen. Bitte nochmals versuchen.',
  'error.offline': 'Keine Verbindung. Ihre Meldung wird gesendet, sobald Sie wieder online sind.',
  'error.queued': 'Offline gespeichert — wird automatisch gesendet.',
  'error.required': 'Dieses Feld wird benötigt.',
  'error.contactRequired':
    'Bitte E-Mail oder Telefon angeben, sonst können wir Sie nicht erreichen.',

  'privacy.retention': 'Ihre Kontaktdaten werden nach Abschluss automatisch gelöscht.',
} as const;

/**
 * Every key in the product. Derived from German, so adding a key there and
 * nowhere else fails the build in the other three catalogues.
 */
export type MessageKey = keyof typeof de;

const fr: Record<MessageKey, string> = {
  'nav.back': 'Retour',
  'nav.next': 'Continuer',

  'time.now': 'maintenant',
  'time.minutesShort': 'min',
  'time.hoursShort': 'h',

  'category.electronics': 'Électronique',
  'category.bags': 'Sacs',
  'category.clothing': 'Vêtements',
  'category.documents': 'Documents',
  'category.keys': 'Clés',
  'category.wallet': 'Portemonnaie',
  'category.glasses': 'Lunettes',
  'category.umbrella': 'Parapluie',
  'category.other': 'Autre',

  'area.seat': 'Place assise',
  'area.table': 'Tablette',
  'area.overhead': 'Porte-bagages',
  'area.floor': 'Sol',
  'area.wc': 'Toilettes',
  'area.entrance': 'Entrée',
  'area.unknown': 'Je ne sais pas',

  'app.conceptNotice': 'Concept indépendant — pas un produit officiel',
  'app.skipToContent': 'Aller au contenu',

  'nav.report': 'Signaler',
  'nav.myReports': 'Mes signalements',
  'nav.staff': 'Personnel',

  'report.title': 'Vous avez perdu quelque chose ?',
  'report.lede': 'Signalez-le maintenant — pendant que le train circule encore.',
  'report.step.journey': 'Quel trajet ?',
  'report.step.what': "Qu'avez-vous perdu ?",
  'report.step.where': 'Où dans le véhicule ?',
  'report.step.contact': 'Comment vous joindre ?',
  'report.field.station': 'Arrêt',
  'report.field.stationHint': 'Où êtes-vous monté ou descendu ?',
  'report.field.time': 'Heure approximative',
  'report.field.category': "Type d'objet",
  'report.field.description': 'Description',
  'report.field.descriptionHint': "Qu'est-ce qui le rend reconnaissable ?",
  'report.field.identifier': 'Numéro de série, IMEI ou gravure',
  'report.field.identifierHint':
    "Le plus important — c'est ce qui identifie votre objet de façon certaine.",
  'report.field.coach': 'Voiture',
  'report.field.seat': 'Place',
  'report.field.email': 'E-mail',
  'report.field.phone': 'Téléphone',
  'report.submit': 'Signaler la perte',
  'report.submitting': 'Envoi en cours…',
  'report.success.title': 'Signalement enregistré',
  'report.success.reference': 'Votre référence',
  'report.success.keepReference': 'Notez cette référence — elle permet de suivre le statut.',

  'trip.suggest.heading': 'De quel trajet s’agissait-il ?',
  'trip.suggest.none': "Aucun trajet trouvé. Ajustez l'heure ou l'arrêt.",
  'trip.suggest.tooMany': "Trop de trajets possibles — précisez l'heure.",
  'trip.suggest.confirm': 'Ce trajet',

  'status.submitted': 'Reçu',
  'status.notified': 'Personnel informé',
  'status.searching': 'Recherche en cours',
  'status.found_onboard': 'Trouvé à bord',
  'status.not_found_onboard': 'Non trouvé à bord',
  'status.matched': 'Correspondance possible',
  'status.returned': 'Restitué',
  'status.closed': 'Clôturé',
  'status.withdrawn': 'Retiré',
  'status.expired': 'Expiré',

  'match.strength.identifier': 'Identifié de façon certaine',
  'match.strength.strong': 'Correspondance forte',
  'match.strength.plausible': 'Correspondance possible',
  'match.strength.weak': 'Correspondance faible',
  'match.explain': 'Trouvé via le numéro de série ou le trajet — pas via la description seule.',

  'staff.title': 'Signalements',
  'staff.empty': 'Aucun signalement ouvert.',
  'staff.connected': 'Connecté',
  'staff.disconnected': 'Hors ligne',
  'staff.reconnecting': 'Reconnexion…',
  'staff.acknowledge': 'Prendre en charge',
  'staff.found': 'Trouvé',
  'staff.notFound': 'Non trouvé',

  'error.generic': "Une erreur s'est produite. Veuillez réessayer.",
  'error.offline': 'Hors ligne. Votre signalement sera envoyé dès le retour du réseau.',
  'error.queued': 'Enregistré hors ligne — sera envoyé automatiquement.',
  'error.required': 'Ce champ est requis.',
  'error.contactRequired':
    'Indiquez un e-mail ou un téléphone, sinon nous ne pourrons pas vous joindre.',

  'privacy.retention': 'Vos coordonnées sont supprimées automatiquement après clôture.',
};

const it: Record<MessageKey, string> = {
  'nav.back': 'Indietro',
  'nav.next': 'Avanti',

  'time.now': 'adesso',
  'time.minutesShort': 'min',
  'time.hoursShort': 'h',

  'category.electronics': 'Elettronica',
  'category.bags': 'Borse',
  'category.clothing': 'Abbigliamento',
  'category.documents': 'Documenti',
  'category.keys': 'Chiavi',
  'category.wallet': 'Portafoglio',
  'category.glasses': 'Occhiali',
  'category.umbrella': 'Ombrello',
  'category.other': 'Altro',

  'area.seat': 'Posto a sedere',
  'area.table': 'Tavolino',
  'area.overhead': 'Portabagagli',
  'area.floor': 'Pavimento',
  'area.wc': 'Zona WC',
  'area.entrance': 'Entrata',
  'area.unknown': 'Non so',

  'app.conceptNotice': 'Concetto indipendente — non è un prodotto ufficiale',
  'app.skipToContent': 'Vai al contenuto',

  'nav.report': 'Segnala',
  'nav.myReports': 'Le mie segnalazioni',
  'nav.staff': 'Personale',

  'report.title': 'Ha perso qualcosa?',
  'report.lede': 'Lo segnali ora — mentre il treno è ancora in viaggio.',
  'report.step.journey': 'Quale corsa?',
  'report.step.what': 'Che cosa ha perso?',
  'report.step.where': 'Dove nel veicolo?',
  'report.step.contact': 'Come possiamo contattarla?',
  'report.field.station': 'Fermata',
  'report.field.stationHint': 'Dove è salito o sceso?',
  'report.field.time': 'Ora approssimativa',
  'report.field.category': 'Tipo di oggetto',
  'report.field.description': 'Descrizione',
  'report.field.descriptionHint': 'Che cosa lo rende riconoscibile?',
  'report.field.identifier': 'Numero di serie, IMEI o incisione',
  'report.field.identifierHint':
    'La cosa più importante — è ciò che identifica il suo oggetto con certezza.',
  'report.field.coach': 'Carrozza',
  'report.field.seat': 'Posto',
  'report.field.email': 'E-mail',
  'report.field.phone': 'Telefono',
  'report.submit': 'Segnala la perdita',
  'report.submitting': 'Invio in corso…',
  'report.success.title': 'Segnalazione registrata',
  'report.success.reference': 'Il suo riferimento',
  'report.success.keepReference': 'Annoti questo riferimento — le serve per verificare lo stato.',

  'trip.suggest.heading': 'Di quale corsa si trattava?',
  'trip.suggest.none': 'Nessuna corsa trovata. Modifichi ora o fermata.',
  'trip.suggest.tooMany': "Troppe corse possibili — precisi l'ora.",
  'trip.suggest.confirm': 'Questa corsa',

  'status.submitted': 'Ricevuta',
  'status.notified': 'Personale informato',
  'status.searching': 'Ricerca in corso',
  'status.found_onboard': 'Trovato a bordo',
  'status.not_found_onboard': 'Non trovato a bordo',
  'status.matched': 'Possibile corrispondenza',
  'status.returned': 'Restituito',
  'status.closed': 'Chiuso',
  'status.withdrawn': 'Ritirata',
  'status.expired': 'Scaduta',

  'match.strength.identifier': 'Identificato con certezza',
  'match.strength.strong': 'Corrispondenza forte',
  'match.strength.plausible': 'Possibile corrispondenza',
  'match.strength.weak': 'Corrispondenza debole',
  'match.explain': 'Trovato tramite numero di serie o corsa — non solo tramite la descrizione.',

  'staff.title': 'Segnalazioni',
  'staff.empty': 'Nessuna segnalazione aperta.',
  'staff.connected': 'Connesso',
  'staff.disconnected': 'Non connesso',
  'staff.reconnecting': 'Riconnessione…',
  'staff.acknowledge': 'Prendi in carico',
  'staff.found': 'Trovato',
  'staff.notFound': 'Non trovato',

  'error.generic': 'Si è verificato un errore. Riprovi.',
  'error.offline': 'Non connesso. La segnalazione sarà inviata al ritorno della rete.',
  'error.queued': 'Salvata offline — sarà inviata automaticamente.',
  'error.required': 'Questo campo è obbligatorio.',
  'error.contactRequired': 'Indichi e-mail o telefono, altrimenti non potremo contattarla.',

  'privacy.retention': 'I suoi dati di contatto vengono cancellati automaticamente alla chiusura.',
};

const en: Record<MessageKey, string> = {
  'nav.back': 'Back',
  'nav.next': 'Continue',

  'time.now': 'just now',
  'time.minutesShort': 'min',
  'time.hoursShort': 'h',

  'category.electronics': 'Electronics',
  'category.bags': 'Bags',
  'category.clothing': 'Clothing',
  'category.documents': 'Documents',
  'category.keys': 'Keys',
  'category.wallet': 'Wallet',
  'category.glasses': 'Glasses',
  'category.umbrella': 'Umbrella',
  'category.other': 'Other',

  'area.seat': 'Seat',
  'area.table': 'Table',
  'area.overhead': 'Overhead rack',
  'area.floor': 'Floor',
  'area.wc': 'Toilet area',
  'area.entrance': 'Entrance',
  'area.unknown': "Don't know",

  'app.conceptNotice': 'Independent concept — not an official product',
  'app.skipToContent': 'Skip to content',

  'nav.report': 'Report',
  'nav.myReports': 'My reports',
  'nav.staff': 'Staff',

  'report.title': 'Lost something?',
  'report.lede': 'Report it now — while the train is still running.',
  'report.step.journey': 'Which journey?',
  'report.step.what': 'What did you lose?',
  'report.step.where': 'Where in the vehicle?',
  'report.step.contact': 'How can we reach you?',
  'report.field.station': 'Stop',
  'report.field.stationHint': 'Where did you get on or off?',
  'report.field.time': 'Approximate time',
  'report.field.category': 'Type of item',
  'report.field.description': 'Description',
  'report.field.descriptionHint': 'What makes it recognisable?',
  'report.field.identifier': 'Serial number, IMEI or engraving',
  'report.field.identifierHint':
    'The single most useful thing — it identifies your item beyond doubt.',
  'report.field.coach': 'Coach',
  'report.field.seat': 'Seat',
  'report.field.email': 'Email',
  'report.field.phone': 'Phone',
  'report.submit': 'Report the loss',
  'report.submitting': 'Sending…',
  'report.success.title': 'Report filed',
  'report.success.reference': 'Your reference',
  'report.success.keepReference': 'Note this reference — you need it to check the status.',

  'trip.suggest.heading': 'Which journey was it?',
  'trip.suggest.none': 'No journey found. Adjust the time or the stop.',
  'trip.suggest.tooMany': 'Too many possible journeys — narrow the time.',
  'trip.suggest.confirm': 'This journey',

  'status.submitted': 'Received',
  'status.notified': 'Crew notified',
  'status.searching': 'Being searched for',
  'status.found_onboard': 'Found on board',
  'status.not_found_onboard': 'Not found on board',
  'status.matched': 'Possible match',
  'status.returned': 'Returned',
  'status.closed': 'Closed',
  'status.withdrawn': 'Withdrawn',
  'status.expired': 'Expired',

  'match.strength.identifier': 'Identified beyond doubt',
  'match.strength.strong': 'Strong match',
  'match.strength.plausible': 'Possible match',
  'match.strength.weak': 'Weak match',
  'match.explain': 'Found via a serial number or the journey — not by description alone.',

  'staff.title': 'Reports',
  'staff.empty': 'No open reports.',
  'staff.connected': 'Connected',
  'staff.disconnected': 'Offline',
  'staff.reconnecting': 'Reconnecting…',
  'staff.acknowledge': 'Take it on',
  'staff.found': 'Found',
  'staff.notFound': 'Not found',

  'error.generic': 'Something went wrong. Please try again.',
  'error.offline': 'Offline. Your report will be sent as soon as you are back online.',
  'error.queued': 'Saved offline — will send automatically.',
  'error.required': 'This field is required.',
  'error.contactRequired': 'Give an email or a phone number, or we cannot tell you if it turns up.',

  'privacy.retention': 'Your contact details are deleted automatically once the case closes.',
};

export const CATALOGUES: Record<Locale, Record<MessageKey, string>> = { de, fr, it, en };
