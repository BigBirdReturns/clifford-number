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
    publicRole: 'Public decisions to outcomes', withReceipts: 'With receipts',
    heroDek: 'Trace documented public decisions through people, programs, money, and companies—then inspect what happened later, with every step timestamped and receipted.',
    checkConnection: 'Check a connection', exploreTopology: 'Explore the topology',
    boundaryStrong: 'A timeline is not a causal verdict.',
    boundaryText: 'The instrument distinguishes source-explicit causation from attribution, temporal association, and causation not established.',
    purposeKicker: 'What this instrument traces', purposeTitle: 'From a public decision to its later consequences.',
    purposeSurfaceTitle: 'Decision surfaces', purposeSurfaceText: 'Who authored, commissioned, accepted, funded, advised, or joined a bounded public process.',
    purposeFlowTitle: 'Programs and flows', purposeFlowText: 'How commitments, contracts, capital, public roles, and claimed capabilities move across time.',
    purposeOutcomeTitle: 'Later outcomes', purposeOutcomeText: 'What happened later, which receipts support it, and whether a causal link is established or merely temporal.',
    liveTopology: 'Live topology', loadingGraph: 'Loading graph', actor: 'Actor', boundedSurface: 'Bounded surface', anchor: 'Anchor',
    compiling: 'Compiling the public view…', interrogate: 'Interrogate the corpus', followEvidence: 'Follow the evidence.',
    explorerIntro: 'Browse research tracks, cases, claims, receipts, people, organizations, and bounded surfaces—or verify a two-person connection as of a specific date.',
    topologyExplorer: 'Research explorer', connectionChecker: 'Connection checker',
    searchLabel: 'Search tracks, people, cases, claims, or receipts', pressFocus: 'Press / to focus',
    searchPlaceholder: 'Try Ben Warner, Electric Twin, Simon Case…', startWith: 'Start with:', browseIndex: 'Browse index',
    newsroomMode: 'Newsroom mode', deskTitle: 'Check a connection before it prints.', deskRule: 'Every step must carry a receipt.',
    from: 'From', to: 'To', asOf: 'As of', optional: '(optional)', checkPath: 'Check path', verifiedExample: 'Try a verified example:',
    deskScope: 'Use any two people in the corpus. Leave “To” blank only when you want the classic Clifford Number to Matt Clifford.',
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
    publicRole: 'Decisiones públicas y resultados', withReceipts: 'Con comprobantes',
    heroDek: 'Sigue decisiones públicas documentadas a través de personas, programas, dinero y empresas, y examina qué ocurrió después con cada paso fechado y documentado.',
    checkConnection: 'Comprobar una conexión', exploreTopology: 'Explorar la topología',
    boundaryStrong: 'Una cronología no es un veredicto causal.',
    boundaryText: 'El instrumento distingue la causalidad explícita en la fuente, la atribución, la asociación temporal y la causalidad no establecida.',
    purposeKicker: 'Qué rastrea este instrumento', purposeTitle: 'De una decisión pública a sus consecuencias posteriores.',
    purposeSurfaceTitle: 'Superficies de decisión', purposeSurfaceText: 'Quién redactó, encargó, aceptó, financió, asesoró o participó en un proceso público delimitado.',
    purposeFlowTitle: 'Programas y flujos', purposeFlowText: 'Cómo se mueven en el tiempo los compromisos, contratos, capital, funciones públicas y capacidades declaradas.',
    purposeOutcomeTitle: 'Resultados posteriores', purposeOutcomeText: 'Qué ocurrió después, qué comprobantes lo respaldan y si el vínculo causal está establecido o solo es temporal.',
    liveTopology: 'Topología activa', loadingGraph: 'Cargando grafo', actor: 'Actor', boundedSurface: 'Superficie delimitada', anchor: 'Ancla',
    compiling: 'Compilando la vista pública…', interrogate: 'Interrogar el corpus', followEvidence: 'Sigue la evidencia.',
    explorerIntro: 'Explora líneas de investigación, casos, afirmaciones, comprobantes, personas, organizaciones y superficies delimitadas, o verifica una conexión entre dos personas en una fecha concreta.',
    topologyExplorer: 'Explorador de investigación', connectionChecker: 'Verificador de conexiones',
    searchLabel: 'Buscar línea, persona, caso, afirmación o comprobante', pressFocus: 'Pulsa / para enfocar',
    searchPlaceholder: 'Prueba Ben Warner, Electric Twin, Simon Case…', startWith: 'Empieza con:', browseIndex: 'Explorar índice',
    newsroomMode: 'Modo redacción', deskTitle: 'Comprueba una conexión antes de publicarla.', deskRule: 'Cada paso debe llevar un comprobante.',
    from: 'Desde', to: 'Hasta', asOf: 'A fecha de', optional: '(opcional)', checkPath: 'Comprobar ruta', verifiedExample: 'Prueba un ejemplo verificado:',
    deskScope: 'Usa dos personas cualesquiera del corpus. Deja «Hasta» vacío solo para obtener el Clifford Number clásico respecto a Matt Clifford.',
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
    publicRole: 'Décisions publiques et résultats', withReceipts: 'Avec justificatifs',
    heroDek: 'Suivez les décisions publiques documentées à travers les personnes, programmes, capitaux et entreprises, puis examinez ce qui s’est produit plus tard, chaque étape étant datée et sourcée.',
    checkConnection: 'Vérifier une connexion', exploreTopology: 'Explorer la topologie',
    boundaryStrong: 'Une chronologie n’est pas un verdict causal.',
    boundaryText: 'L’instrument distingue la causalité explicite dans la source, l’attribution, l’association temporelle et la causalité non établie.',
    purposeKicker: 'Ce que cet instrument retrace', purposeTitle: 'D’une décision publique à ses conséquences ultérieures.',
    purposeSurfaceTitle: 'Surfaces de décision', purposeSurfaceText: 'Qui a rédigé, commandé, accepté, financé, conseillé ou rejoint un processus public délimité.',
    purposeFlowTitle: 'Programmes et flux', purposeFlowText: 'Comment les engagements, contrats, capitaux, rôles publics et capacités revendiquées évoluent dans le temps.',
    purposeOutcomeTitle: 'Résultats ultérieurs', purposeOutcomeText: 'Ce qui s’est produit ensuite, les justificatifs disponibles et si le lien causal est établi ou seulement temporel.',
    liveTopology: 'Topologie active', loadingGraph: 'Chargement du graphe', actor: 'Acteur', boundedSurface: 'Surface délimitée', anchor: 'Ancrage',
    compiling: 'Compilation de la vue publique…', interrogate: 'Interroger le corpus', followEvidence: 'Suivez les preuves.',
    explorerIntro: 'Parcourez les axes de recherche, dossiers, affirmations, justificatifs, personnes, organisations et surfaces délimitées, ou vérifiez une connexion entre deux personnes à une date précise.',
    topologyExplorer: 'Explorateur de recherche', connectionChecker: 'Vérificateur de connexions',
    searchLabel: 'Rechercher un axe, une personne, un dossier, une affirmation ou un justificatif', pressFocus: 'Appuyez sur / pour cibler',
    searchPlaceholder: 'Essayez Ben Warner, Electric Twin, Simon Case…', startWith: 'Commencez par :', browseIndex: 'Parcourir l’index',
    newsroomMode: 'Mode rédaction', deskTitle: 'Vérifiez une connexion avant publication.', deskRule: 'Chaque étape doit avoir un justificatif.',
    from: 'De', to: 'À', asOf: 'À la date du', optional: '(facultatif)', checkPath: 'Vérifier le chemin', verifiedExample: 'Essayez un exemple vérifié :',
    deskScope: 'Utilisez deux personnes quelconques du corpus. Laissez « À » vide uniquement pour obtenir le Clifford Number classique vers Matt Clifford.',
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

/* The public app already imports this module on every release. Use that stable
 * bootstrap edge to mount the visual aperture without coupling the projection
 * to the compiler-facing app module. Standalone builds set the bundle flag and
 * inline the same CSS and JavaScript instead. */
if (typeof document !== 'undefined'
  && !globalThis.__CLIFFORD_APERTURE_BUNDLED__
  && !globalThis.__CLIFFORD_APERTURE_LOADING__) {
  globalThis.__CLIFFORD_APERTURE_LOADING__ = true;
  if (!document.getElementById('clifford-visual-aperture-css')) {
    const link = document.createElement('link');
    link.id = 'clifford-visual-aperture-css';
    link.rel = 'stylesheet';
    link.href = 'src/visual-aperture.css?v=20260721-command-deck';
    document.head.append(link);
  }
  import('./visual-aperture.js?v=20260721-command-deck').catch(error => {
    console.error('Could not load the visual aperture.', error);
  });
}
