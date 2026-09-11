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

  // ── Website (public site, not the app) ─────────────────────────────────────
  'site.nav.home': 'Start',
  'site.nav.how': 'So funktioniert es',
  'site.nav.research': 'Forschung',
  'site.nav.app': 'Verlust melden',
  'site.skipToContent': 'Zum Inhalt springen',

  'site.hero.title': 'Liegengeblieben ist nicht verloren.',
  'site.hero.lead':
    'Wer etwas im Zug vergisst, hat keinen Weg, die Person zu erreichen, die es findet. Genau diese Lücke schliesst dieses Konzept — in einem Schritt, solange die Fahrt noch läuft.',
  'site.hero.cta': 'Verlust melden',
  'site.hero.ctaSecondary': 'Die Belege ansehen',

  'site.problem.title': 'Das Problem ist nicht das Zuordnen.',
  'site.problem.body':
    'Die Zuordnung funktioniert bereits: abgegebene Fundstücke werden laufend mit offenen Verlustmeldungen abgeglichen, auch Tage später. Die Lücke liegt davor — bei den Gegenständen, die nie abgegeben werden.',
  'site.problem.gapLabel': 'Meldungen gegenüber tatsächlich abgegebenen Fundstücken',

  'site.thesis.title': 'Ehrlichkeit ist nicht der Engpass. Der fehlende Kanal ist es.',
  'site.thesis.body':
    'Im grössten Feldversuch dazu wurden über 17 000 Portemonnaies ausgelegt. Je mehr Geld darin lag, desto häufiger meldeten sich die Finderinnen und Finder — das Gegenteil dessen, was Eigennutz erwarten liesse. Entscheidend ist ein Detail, das meist übersehen wird: In jedem Portemonnaie lag eine Visitenkarte mit einer E-Mail-Adresse. Gemessen wurde also, was Menschen tun, wenn ein Kanal zur Eigentümerin existiert. Eine Jacke auf einem Sitz hat keine Visitenkarte.',
  'site.thesis.source': 'Quelle',

  'site.steps.title': 'Ein Schritt, während der Zug noch fährt',
  'site.steps.1.title': 'Die Fahrt ist bereits bekannt',
  'site.steps.1.body':
    'Aus Ticket, EasyRide-Check-in oder der zuletzt gewählten Verbindung ergibt sich Zug und Zeit. Ohne Ticket lässt sich die Fahrt aus dem echten Fahrplan auswählen.',
  'site.steps.2.title': 'Melden mit einer Eingabe',
  'site.steps.2.body':
    'Kategorie und kurze Beschreibung genügen. Kein Konto, kein Formular über mehrere Seiten.',
  'site.steps.3.title': 'Die Meldung erreicht, wer in der Nähe ist',
  'site.steps.3.body':
    'Das Zugpersonal sieht die Meldung in Echtzeit und kann suchen, bevor der Zug die Wendestelle erreicht. Mitreisende auf derselben Fahrt können sich freiwillig benachrichtigen lassen.',

  'site.notify.title': 'Wer benachrichtigt wird — und wer nicht',
  'site.notify.crew': 'Zugpersonal auf dieser Fahrt',
  'site.notify.crewNote':
    'Referenz, Kategorie und Ort. Nie Beschreibung, Kontaktdaten oder Kennzeichen.',
  'site.notify.passengers': 'Mitreisende, die es aktiviert haben',
  'site.notify.passengersNote': 'Nur freiwillig, nur für dieselbe Fahrt, jederzeit abschaltbar.',
  'site.notify.public': 'Öffentliche Liste der Fundstücke',
  'site.notify.publicNote':
    'Nein. Eine öffentliche Liste gefundener Gegenstände ist eine Einkaufsliste.',
  'site.notify.reward': 'Finderlohn',
  'site.notify.rewardNote':
    'Nein. Rechtlich ausgeschlossen — und Bezahlung verdrängt nachweislich genau das Motiv, das sie kaufen soll.',

  'site.research.title': 'Woran wir uns halten',
  'site.research.lead':
    'Jede Zahl auf dieser Seite hat eine Quelle, oder sie ist als Annahme gekennzeichnet. Das ist keine Haltung, sondern ein Test, der den Build rot macht.',
  'site.research.published': 'Belegt',
  'site.research.measured': 'Hier gemessen',
  'site.research.assumption': 'Annahme — nicht gemessen',
  'site.research.limit': 'Was daraus nicht folgt',
  'site.research.sources': 'Quellen',
  'site.research.noNumber':
    'Die verbreitete Behauptung «innerhalb von 30 Minuten melden, dann über 70 % Rückgabequote» liess sich nirgends belegen. Sie steht darum nicht auf dieser Seite.',

  'site.footer.concept': 'Unabhängiges Konzept. Kein Dienst im Betrieb.',
  'site.footer.code': 'Quellcode',

  'site.status.title': 'Was läuft, und was entworfen ist',
  'site.status.lead':
    'Ein Konzept, das nicht sagt, welche Hälfte bereits existiert, ist eine Attrappe mit besserem Satz. Darum steht es an jedem Punkt.',
  'site.status.built': 'Gebaut und lauffähig',
  'site.status.designed': 'Entworfen, nicht gebaut',
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

  // ── Website (public site, not the app) ─────────────────────────────────────
  'site.nav.home': 'Accueil',
  'site.nav.how': 'Comment ça marche',
  'site.nav.research': 'Recherche',
  'site.nav.app': 'Signaler une perte',
  'site.skipToContent': 'Aller au contenu',

  'site.hero.title': 'Oublié ne veut pas dire perdu.',
  'site.hero.lead':
    'Qui oublie quelque chose dans le train n’a aucun moyen de joindre la personne qui le trouve. C’est précisément cette lacune que comble ce concept — en une étape, pendant que le trajet dure encore.',
  'site.hero.cta': 'Signaler une perte',
  'site.hero.ctaSecondary': 'Voir les preuves',

  'site.problem.title': 'Le problème n’est pas l’appariement.',
  'site.problem.body':
    'L’appariement fonctionne déjà : les objets remis sont comparés en continu aux déclarations de perte ouvertes, même plusieurs jours plus tard. La lacune se situe avant — dans les objets qui ne sont jamais remis.',
  'site.problem.gapLabel': 'Déclarations par rapport aux objets effectivement remis',

  'site.thesis.title': 'L’honnêteté n’est pas le facteur limitant. Le canal manquant l’est.',
  'site.thesis.body':
    'Dans la plus vaste expérience de terrain sur le sujet, plus de 17 000 portefeuilles ont été déposés. Plus il y avait d’argent à l’intérieur, plus les personnes qui les trouvaient contactaient le propriétaire — l’inverse de ce que prédit l’intérêt personnel. Un détail décisif passe souvent inaperçu : chaque portefeuille contenait une carte de visite avec une adresse e-mail. Ce qui est mesuré, c’est donc ce que font les gens lorsqu’un canal vers le propriétaire existe. Une veste sur un siège n’a pas de carte de visite.',
  'site.thesis.source': 'Source',

  'site.steps.title': 'Une étape, pendant que le train roule encore',
  'site.steps.1.title': 'Le trajet est déjà connu',
  'site.steps.1.body':
    'Le billet, l’enregistrement EasyRide ou la dernière liaison choisie donnent le train et l’heure. Sans billet, le trajet se choisit dans l’horaire réel.',
  'site.steps.2.title': 'Signaler en une saisie',
  'site.steps.2.body':
    'Une catégorie et une brève description suffisent. Pas de compte, pas de formulaire sur plusieurs pages.',
  'site.steps.3.title': 'La déclaration atteint les personnes présentes',
  'site.steps.3.body':
    'Le personnel de bord voit la déclaration en temps réel et peut chercher avant que le train n’atteigne son terminus. Les autres voyageurs du même trajet peuvent choisir d’être notifiés.',

  'site.notify.title': 'Qui est notifié — et qui ne l’est pas',
  'site.notify.crew': 'Personnel de bord sur ce trajet',
  'site.notify.crewNote':
    'Référence, catégorie et lieu. Jamais la description, les coordonnées ou un identifiant.',
  'site.notify.passengers': 'Voyageurs qui l’ont activé',
  'site.notify.passengersNote':
    'Uniquement volontaire, uniquement pour le même trajet, désactivable à tout moment.',
  'site.notify.public': 'Liste publique des objets trouvés',
  'site.notify.publicNote': 'Non. Une liste publique d’objets trouvés est une liste de courses.',
  'site.notify.reward': 'Récompense au trouveur',
  'site.notify.rewardNote':
    'Non. Juridiquement exclu — et payer évince précisément le motif que l’on cherche à acheter.',

  'site.research.title': 'Ce à quoi nous nous tenons',
  'site.research.lead':
    'Chaque chiffre de cette page a une source, ou il est signalé comme une hypothèse. Ce n’est pas une posture, c’est un test qui fait échouer le build.',
  'site.research.published': 'Établi',
  'site.research.measured': 'Mesuré ici',
  'site.research.assumption': 'Hypothèse — non mesurée',
  'site.research.limit': 'Ce qui n’en découle pas',
  'site.research.sources': 'Sources',
  'site.research.noNumber':
    'L’affirmation répandue « signaler dans les 30 minutes, donc plus de 70 % de restitution » n’a pu être sourcée nulle part. Elle ne figure donc pas sur cette page.',

  'site.footer.concept': 'Concept indépendant. Pas un service en exploitation.',
  'site.footer.code': 'Code source',

  'site.status.title': 'Ce qui fonctionne, et ce qui est conçu',
  'site.status.lead':
    'Un concept qui ne dit pas quelle moitié existe déjà est un leurre mieux composé. C’est pourquoi c’est indiqué à chaque point.',
  'site.status.built': 'Construit et fonctionnel',
  'site.status.designed': 'Conçu, non construit',
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

  // ── Website (public site, not the app) ─────────────────────────────────────
  'site.nav.home': 'Inizio',
  'site.nav.how': 'Come funziona',
  'site.nav.research': 'Ricerca',
  'site.nav.app': 'Segnala una perdita',
  'site.skipToContent': 'Vai al contenuto',

  'site.hero.title': 'Dimenticato non significa perduto.',
  'site.hero.lead':
    'Chi dimentica qualcosa in treno non ha modo di raggiungere la persona che lo trova. È proprio questa lacuna che questo concetto colma — in un solo passaggio, mentre il viaggio è ancora in corso.',
  'site.hero.cta': 'Segnala una perdita',
  'site.hero.ctaSecondary': 'Guarda le evidenze',

  'site.problem.title': 'Il problema non è l’abbinamento.',
  'site.problem.body':
    'L’abbinamento funziona già: gli oggetti consegnati vengono confrontati di continuo con le segnalazioni aperte, anche giorni dopo. La lacuna sta prima — negli oggetti che non vengono mai consegnati.',
  'site.problem.gapLabel': 'Segnalazioni rispetto agli oggetti effettivamente consegnati',

  'site.thesis.title': 'L’onestà non è il vincolo. Lo è il canale mancante.',
  'site.thesis.body':
    'Nel più ampio esperimento sul campo sono stati depositati oltre 17 000 portafogli. Più denaro contenevano, più spesso chi li trovava contattava il proprietario — l’opposto di quanto prevedrebbe l’interesse personale. Un dettaglio decisivo sfugge quasi sempre: ogni portafoglio conteneva un biglietto da visita con un indirizzo e-mail. Ciò che si misura è quindi che cosa fanno le persone quando esiste un canale verso il proprietario. Una giacca su un sedile non ha un biglietto da visita.',
  'site.thesis.source': 'Fonte',

  'site.steps.title': 'Un passaggio, mentre il treno è ancora in viaggio',
  'site.steps.1.title': 'Il viaggio è già noto',
  'site.steps.1.body':
    'Biglietto, check-in EasyRide o l’ultima connessione scelta indicano treno e orario. Senza biglietto, il viaggio si sceglie dall’orario reale.',
  'site.steps.2.title': 'Segnalare con un solo inserimento',
  'site.steps.2.body':
    'Bastano una categoria e una breve descrizione. Nessun account, nessun modulo su più pagine.',
  'site.steps.3.title': 'La segnalazione raggiunge chi è nelle vicinanze',
  'site.steps.3.body':
    'Il personale di bordo vede la segnalazione in tempo reale e può cercare prima che il treno raggiunga il capolinea. Gli altri viaggiatori dello stesso viaggio possono scegliere di essere avvisati.',

  'site.notify.title': 'Chi viene avvisato — e chi no',
  'site.notify.crew': 'Personale di bordo su questo viaggio',
  'site.notify.crewNote':
    'Riferimento, categoria e luogo. Mai la descrizione, i contatti o un identificativo.',
  'site.notify.passengers': 'Viaggiatori che lo hanno attivato',
  'site.notify.passengersNote':
    'Solo volontario, solo per lo stesso viaggio, disattivabile in qualsiasi momento.',
  'site.notify.public': 'Elenco pubblico degli oggetti trovati',
  'site.notify.publicNote': 'No. Un elenco pubblico di oggetti trovati è una lista della spesa.',
  'site.notify.reward': 'Ricompensa per chi trova',
  'site.notify.rewardNote':
    'No. Giuridicamente escluso — e pagare spiazza proprio il motivo che si vorrebbe comprare.',

  'site.research.title': 'A che cosa ci atteniamo',
  'site.research.lead':
    'Ogni cifra su questa pagina ha una fonte, oppure è contrassegnata come ipotesi. Non è una posa: è un test che fa fallire la build.',
  'site.research.published': 'Documentato',
  'site.research.measured': 'Misurato qui',
  'site.research.assumption': 'Ipotesi — non misurata',
  'site.research.limit': 'Che cosa non ne consegue',
  'site.research.sources': 'Fonti',
  'site.research.noNumber':
    'L’affermazione diffusa «segnalare entro 30 minuti, quindi oltre il 70 % di restituzione» non è stata documentabile da nessuna parte. Per questo non compare su questa pagina.',

  'site.footer.concept': 'Concetto indipendente. Non è un servizio in esercizio.',
  'site.footer.code': 'Codice sorgente',

  'site.status.title': 'Che cosa funziona e che cosa è progettato',
  'site.status.lead':
    'Un concetto che non dice quale metà esiste già è un’imitazione con una composizione migliore. Per questo è indicato a ogni punto.',
  'site.status.built': 'Costruito e funzionante',
  'site.status.designed': 'Progettato, non costruito',
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

  // ── Website (public site, not the app) ─────────────────────────────────────
  'site.nav.home': 'Home',
  'site.nav.how': 'How it works',
  'site.nav.research': 'Research',
  'site.nav.app': 'Report a loss',
  'site.skipToContent': 'Skip to content',

  'site.hero.title': 'Left behind is not lost.',
  'site.hero.lead':
    'Someone who forgets something on a train has no way to reach the person who finds it. That is the gap this concept closes — in one step, while the journey is still running.',
  'site.hero.cta': 'Report a loss',
  'site.hero.ctaSecondary': 'See the evidence',

  'site.problem.title': 'The problem is not matching.',
  'site.problem.body':
    'Matching already works: handed-in items are compared continuously against open loss reports, days later included. The gap sits earlier — in the items that are never handed in at all.',
  'site.problem.gapLabel': 'Reports filed, against items actually handed in',

  'site.thesis.title': 'Honesty is not the constraint. The missing channel is.',
  'site.thesis.body':
    'In the largest field experiment on this, over 17,000 wallets were turned in. The more money inside, the more often finders contacted the owner — the opposite of what self-interest predicts. One decisive detail is usually missed: every wallet held a business card with an email address. What was measured is what people do when a channel to the owner exists. A jacket on a seat has no business card.',
  'site.thesis.source': 'Source',

  'site.steps.title': 'One step, while the train is still moving',
  'site.steps.1.title': 'The journey is already known',
  'site.steps.1.body':
    'A ticket, an EasyRide check-in or the last connection chosen gives the train and the time. Without a ticket, the journey is picked from the real timetable.',
  'site.steps.2.title': 'Report in a single entry',
  'site.steps.2.body':
    'A category and a short description are enough. No account, no multi-page form.',
  'site.steps.3.title': 'The report reaches whoever is nearby',
  'site.steps.3.body':
    'Crew on that journey see it in real time and can search before the train reaches its turnaround. Fellow passengers on the same journey can opt in to be notified.',

  'site.notify.title': 'Who is notified — and who is not',
  'site.notify.crew': 'Crew on this journey',
  'site.notify.crewNote':
    'Reference, category and location. Never a description, a contact detail or an identifier.',
  'site.notify.passengers': 'Passengers who opted in',
  'site.notify.passengersNote': 'Opt-in only, same journey only, switchable off at any time.',
  'site.notify.public': 'A public list of found items',
  'site.notify.publicNote': 'No. A public list of recovered items is a shopping list.',
  'site.notify.reward': 'A finder’s reward',
  'site.notify.rewardNote':
    'No. Legally barred — and paying crowds out the very motive it tries to buy.',

  'site.research.title': 'What we hold ourselves to',
  'site.research.lead':
    'Every number on this site has a source, or it is labelled an assumption. That is not a posture — it is a test that turns the build red.',
  'site.research.published': 'Established',
  'site.research.measured': 'Measured here',
  'site.research.assumption': 'Assumption — not measured',
  'site.research.limit': 'What this does not support',
  'site.research.sources': 'Sources',
  'site.research.noNumber':
    'The widely repeated claim that “reporting within 30 minutes gives over 70% recovery” could not be sourced anywhere. It therefore does not appear on this site.',

  'site.footer.concept': 'Independent concept. Not a service in operation.',
  'site.footer.code': 'Source code',

  'site.status.title': 'What runs, and what is designed',
  'site.status.lead':
    'A concept that does not say which half already exists is a mock-up with better typesetting. So it is stated at every point.',
  'site.status.built': 'Built and running',
  'site.status.designed': 'Designed, not built',
};

export const CATALOGUES: Record<Locale, Record<MessageKey, string>> = { de, fr, it, en };
