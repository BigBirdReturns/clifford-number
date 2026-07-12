export const SUPPORTED_LOCALES = ['en', 'es', 'fr'];

/* AXM chrome-only translation law, inherited from axm-tools/pta-tracker:
 * - curate menus, controls, status labels, and accessibility text here;
 * - never translate names, source titles, receipts, or evidence prose in code;
 * - unsupported languages and full-content translation belong to the browser's
 *   built-in “Translate page” capability. English is the deterministic fallback. */

const messages = {
  en: {
    skip: 'Skip to the explorer', status: 'Public research instrument', method: 'Method', source: 'Source',
    view: 'View', preferences: 'Display & language', theme: 'Theme', themeSystem: 'System', themeLight: 'Light', themeDark: 'Dark',
    language: 'Language', reading: 'Reading size', readingStandard: 'Standard', readingLarge: 'Large / squint test',
    density: 'Density', densityComfortable: 'Comfortable', densityCompact: 'Compact', highContrast: 'High contrast', reset: 'Reset view',
    interfaceNote: 'Menus and controls are hand-translated. Evidence prose and source titles stay in their recorded language; use your browser’s “Translate page” for those or any other language.',
    themeToLight: 'Switch to light theme', themeToDark: 'Switch to dark theme',
    publicRole: 'Public-role connections', withReceipts: 'With receipts',
    heroDek: 'Check how public actors are documented to connect through named, bounded surfaces—then inspect the dates, roles, and receipts behind every step.',
    checkConnection: 'Check a connection', exploreTopology: 'Explore the topology',
    boundaryStrong: 'Connections you can check. Inferences we won’t make.',
    boundaryText: 'Shared context is not influence, coordination, agreement, or wrongdoing.',
    liveTopology: 'Live topology', loadingGraph: 'Loading graph', actor: 'Actor', boundedSurface: 'Bounded surface', anchor: 'Anchor',
    compiling: 'Compiling the public view…', interrogate: 'Interrogate the corpus', followEvidence: 'Follow the evidence.',
    explorerIntro: 'Search the topology or open the newsroom desk for a two-person, date-aware verification.',
    topologyExplorer: 'Topology explorer', connectionChecker: 'Connection checker',
    searchLabel: 'Search actor, organization, or surface', pressFocus: 'Press / to focus',
    searchPlaceholder: 'Try Ben Warner, Electric Twin, Simon Case…', startWith: 'Start with:', browseIndex: 'Browse index',
    newsroomMode: 'Newsroom mode', deskTitle: 'Check a connection before it prints.', deskRule: 'Every step must carry a receipt.',
    from: 'From', to: 'To', asOf: 'As of', optional: '(optional)', checkPath: 'Check path', verifiedExample: 'Try a verified example:',
    deskHelp: 'The checker only asserts a connection where two people share a bounded, receipted surface during overlapping documented windows. Listed, registered, and attended remain separate states.',
    understand: 'Understand', verify: 'Verify', contribute: 'Contribute',
    copyCite: 'Copy / cite', copyLink: 'Copy link', copyCitation: 'Plain citation', copyMarkdown: 'Markdown', copyBibtex: 'BibTeX', copyJson: 'Evidence JSON', shareCitation: 'Share citation', copied: 'Copied', generatedCitation: 'Generated citation',
    boundedSurfaces: 'bounded surfaces', validHops: 'valid actor-to-actor hops', releaseReceipts: 'receipts in the release', refusedConnections: 'time-overlap connections refused',
    compilerRule: 'The compiler rule', whatCounts: 'What counts as a connection?',
    browseShowing: 'Browse index: showing {count} public records.', noRecords: 'No public records are available in this release.'
  },
  es: {
    skip: 'Saltar al explorador', status: 'Instrumento de investigación pública', method: 'Método', source: 'Fuente',
    view: 'Vista', preferences: 'Pantalla e idioma', theme: 'Tema', themeSystem: 'Sistema', themeLight: 'Claro', themeDark: 'Oscuro',
    language: 'Idioma', reading: 'Tamaño de lectura', readingStandard: 'Estándar', readingLarge: 'Grande / prueba de entrecerrar',
    density: 'Densidad', densityComfortable: 'Cómoda', densityCompact: 'Compacta', highContrast: 'Alto contraste', reset: 'Restablecer vista',
    interfaceNote: 'Los menús y controles están traducidos manualmente. La evidencia y los títulos de las fuentes conservan su idioma; use «Traducir página» del navegador para esos textos u otros idiomas.',
    themeToLight: 'Cambiar al tema claro', themeToDark: 'Cambiar al tema oscuro',
    publicRole: 'Conexiones de función pública', withReceipts: 'Con comprobantes',
    heroDek: 'Comprueba cómo se documentan las conexiones entre actores públicos mediante superficies delimitadas, y revisa las fechas, funciones y comprobantes de cada paso.',
    checkConnection: 'Comprobar una conexión', exploreTopology: 'Explorar la topología',
    boundaryStrong: 'Conexiones comprobables. Inferencias que no haremos.',
    boundaryText: 'Un contexto compartido no demuestra influencia, coordinación, acuerdo ni conducta indebida.',
    liveTopology: 'Topología activa', loadingGraph: 'Cargando grafo', actor: 'Actor', boundedSurface: 'Superficie delimitada', anchor: 'Ancla',
    compiling: 'Compilando la vista pública…', interrogate: 'Interrogar el corpus', followEvidence: 'Sigue la evidencia.',
    explorerIntro: 'Busca en la topología o abre la mesa de verificación para comprobar dos personas con fechas.',
    topologyExplorer: 'Explorador de topología', connectionChecker: 'Verificador de conexiones',
    searchLabel: 'Buscar actor, organización o superficie', pressFocus: 'Pulsa / para enfocar',
    searchPlaceholder: 'Prueba Ben Warner, Electric Twin, Simon Case…', startWith: 'Empieza con:', browseIndex: 'Explorar índice',
    newsroomMode: 'Modo redacción', deskTitle: 'Comprueba una conexión antes de publicarla.', deskRule: 'Cada paso debe llevar un comprobante.',
    from: 'Desde', to: 'Hasta', asOf: 'A fecha de', optional: '(opcional)', checkPath: 'Comprobar ruta', verifiedExample: 'Prueba un ejemplo verificado:',
    deskHelp: 'El verificador solo afirma una conexión cuando dos personas comparten una superficie delimitada y documentada durante periodos que se solapan.',
    understand: 'Comprender', verify: 'Verificar', contribute: 'Contribuir',
    copyCite: 'Copiar / citar', copyLink: 'Copiar enlace', copyCitation: 'Cita simple', copyMarkdown: 'Markdown', copyBibtex: 'BibTeX', copyJson: 'JSON de evidencia', shareCitation: 'Compartir cita', copied: 'Copiado', generatedCitation: 'Cita generada',
    boundedSurfaces: 'superficies delimitadas', validHops: 'saltos válidos entre actores', releaseReceipts: 'comprobantes de la versión', refusedConnections: 'conexiones rechazadas por fechas',
    compilerRule: 'La regla del compilador', whatCounts: '¿Qué cuenta como conexión?',
    browseShowing: 'Índice: se muestran {count} registros públicos.', noRecords: 'No hay registros públicos disponibles en esta versión.'
  },
  fr: {
    skip: 'Aller à l’explorateur', status: 'Instrument de recherche publique', method: 'Méthode', source: 'Source',
    view: 'Affichage', preferences: 'Affichage et langue', theme: 'Thème', themeSystem: 'Système', themeLight: 'Clair', themeDark: 'Sombre',
    language: 'Langue', reading: 'Taille de lecture', readingStandard: 'Standard', readingLarge: 'Grande / test de plissement',
    density: 'Densité', densityComfortable: 'Confortable', densityCompact: 'Compacte', highContrast: 'Contraste élevé', reset: 'Réinitialiser l’affichage',
    interfaceNote: 'Les menus et contrôles sont traduits manuellement. Les preuves et titres des sources gardent leur langue ; utilisez « Traduire la page » du navigateur pour ces textes ou toute autre langue.',
    themeToLight: 'Passer au thème clair', themeToDark: 'Passer au thème sombre',
    publicRole: 'Connexions de rôle public', withReceipts: 'Avec justificatifs',
    heroDek: 'Vérifiez comment les acteurs publics sont reliés par des surfaces nommées et délimitées, puis examinez les dates, rôles et justificatifs de chaque étape.',
    checkConnection: 'Vérifier une connexion', exploreTopology: 'Explorer la topologie',
    boundaryStrong: 'Des connexions vérifiables. Des inférences que nous ne faisons pas.',
    boundaryText: 'Un contexte partagé ne prouve ni influence, ni coordination, ni accord, ni faute.',
    liveTopology: 'Topologie active', loadingGraph: 'Chargement du graphe', actor: 'Acteur', boundedSurface: 'Surface délimitée', anchor: 'Ancrage',
    compiling: 'Compilation de la vue publique…', interrogate: 'Interroger le corpus', followEvidence: 'Suivez les preuves.',
    explorerIntro: 'Recherchez dans la topologie ou ouvrez le bureau de vérification pour contrôler deux personnes selon une date.',
    topologyExplorer: 'Explorateur de topologie', connectionChecker: 'Vérificateur de connexions',
    searchLabel: 'Rechercher un acteur, une organisation ou une surface', pressFocus: 'Appuyez sur / pour cibler',
    searchPlaceholder: 'Essayez Ben Warner, Electric Twin, Simon Case…', startWith: 'Commencez par :', browseIndex: 'Parcourir l’index',
    newsroomMode: 'Mode rédaction', deskTitle: 'Vérifiez une connexion avant publication.', deskRule: 'Chaque étape doit avoir un justificatif.',
    from: 'De', to: 'À', asOf: 'À la date du', optional: '(facultatif)', checkPath: 'Vérifier le chemin', verifiedExample: 'Essayez un exemple vérifié :',
    deskHelp: 'Le vérificateur n’affirme une connexion que lorsque deux personnes partagent une surface délimitée et documentée pendant des périodes qui se chevauchent.',
    understand: 'Comprendre', verify: 'Vérifier', contribute: 'Contribuer',
    copyCite: 'Copier / citer', copyLink: 'Copier le lien', copyCitation: 'Citation simple', copyMarkdown: 'Markdown', copyBibtex: 'BibTeX', copyJson: 'JSON des preuves', shareCitation: 'Partager la citation', copied: 'Copié', generatedCitation: 'Citation générée',
    boundedSurfaces: 'surfaces délimitées', validHops: 'sauts valides entre acteurs', releaseReceipts: 'justificatifs de la version', refusedConnections: 'connexions refusées pour chevauchement temporel',
    compilerRule: 'La règle du compilateur', whatCounts: 'Qu’est-ce qui constitue une connexion ?',
    browseShowing: 'Index : {count} dossiers publics affichés.', noRecords: 'Aucun dossier public n’est disponible dans cette version.'
  }
};

export function normalizeLocale(value) {
  const locale = String(value || '').toLowerCase().split('-')[0];
  return SUPPORTED_LOCALES.includes(locale) ? locale : 'en';
}

export function translate(locale, key, vars = {}) {
  const lang = normalizeLocale(locale);
  const template = messages[lang]?.[key] ?? messages.en[key] ?? key;
  return String(template).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
}

export function applyTranslations(root, locale) {
  const lang = normalizeLocale(locale);
  root.documentElement.lang = lang;
  for (const element of root.querySelectorAll('[data-i18n]')) element.textContent = translate(lang, element.dataset.i18n);
  for (const element of root.querySelectorAll('[data-i18n-placeholder]')) element.setAttribute('placeholder', translate(lang, element.dataset.i18nPlaceholder));
  for (const element of root.querySelectorAll('[data-i18n-aria-label]')) element.setAttribute('aria-label', translate(lang, element.dataset.i18nAriaLabel));
  return lang;
}
