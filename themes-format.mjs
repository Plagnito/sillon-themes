/* themes-format.mjs — FORMAT d'un thème Sillon. Décision PURE.
 *
 * POURQUOI CE FICHIER EXISTE, ET POURQUOI IL EST PUR. Trois programmes doivent s'accorder
 * au bit près sur « ce thème est-il valable » :
 *
 *   • le serveur, quand on enregistre ou qu'on importe un thème ;
 *   • la CI de la galerie publique, quand quelqu'un ouvre une pull request ;
 *   • les tests.
 *
 * S'ils divergent, la galerie accepte un thème que Sillon refusera d'afficher — et
 * l'auteur n'a aucun moyen de comprendre pourquoi. D'où un seul module, sans `fs`, sans
 * réseau, sans horloge : on lui donne un objet, il rend un verdict. Même découpage que
 * `communaute.mjs`.
 *
 * ────────────────────────────────────────────────────────────────────────────────────────
 * LA DÉCISION CENTRALE : UN THÈME EST UNE DONNÉE, PAS DU CSS.
 * ────────────────────────────────────────────────────────────────────────────────────────
 * Un thème ne contient QUE des valeurs typées — des couleurs `#rrggbb` et des nombres
 * bornés. Il n'y a nulle part un champ de texte libre qui atteindrait la feuille de style.
 * Ce n'est pas de la prudence excessive, c'est ce qui rend le reste possible :
 *
 *   1. AUCUNE EXFILTRATION. Du CSS libre peut écrire `background: url(https://…)` : chaque
 *      utilisateur qui applique le thème donne son adresse IP à son auteur, et les
 *      sélecteurs d'attribut permettent d'en faire fuir davantage. Ici il n'existe aucune
 *      construction capable de porter une URL.
 *   2. AUCUN DÉTOURNEMENT D'INTERFACE. Du CSS libre peut rendre « Annuler » invisible et
 *      étirer « Confirmer » par-dessus. Sillon a des actions destructrices — « Tout retirer
 *      du téléphone » efface de vrais fichiers. Un thème ne pose ici que des variables : il
 *      ne peut ni déplacer, ni cacher, ni recouvrir quoi que ce soit.
 *   3. LA VALIDATION EST DÉCIDABLE. C'est la propriété qui compte le plus. Une machine peut
 *      dire oui ou non avec certitude, donc la galerie n'a pas besoin d'un relecteur humain,
 *      donc il n'y a pas de file d'attente de modération — donc aucune raison de plafonner
 *      le nombre de thèmes publiés par personne.
 *   4. LES THÈMES SURVIVENT AUX REFONTES. Du CSS libre s'accroche au DOM : le jour où l'on
 *      renomme une classe, deux cents thèmes de la communauté cassent d'un coup, et deux
 *      cents tickets sont ouverts contre Sillon. Des jetons nommés continuent de valoir.
 *
 * Les noms de jetons sont d'ailleurs DÉLIBÉRÉMENT différents des noms de variables CSS :
 * `fond` n'est pas `--bg`. La table ci-dessous est la seule jointure entre les deux, ce qui
 * laisse libre de renommer une variable CSS sans invalider un seul thème publié.
 */

export const FORMAT = 1;

/* Un identifiant sert de nom de fichier ET d'entrée de galerie : on n'accepte que
   l'inoffensif. Même règle que les extensions (`extensions.mjs`), pour ne pas avoir deux
   idées différentes de ce qu'est un identifiant valable. */
export const ID_RE = /^[a-z0-9][a-z0-9-]{1,48}$/;
const HEX_RE = /^#[0-9a-f]{6}$/i;

/* Le préfixe d'un code de partage. Il est VERSIONNÉ : le jour où le format changera, un
   vieux code restera reconnaissable et l'on pourra dire « ce code vient d'une version plus
   ancienne » au lieu de rendre une erreur d'analyse incompréhensible. */
export const PREFIXE_CODE = 'SILLON1:';

/* ---------------------------------------------------------------------------------------
   Les jetons.
   ---------------------------------------------------------------------------------------
   `css`    la variable posée dans la page.
   `nom`    l'étiquette montrée dans l'éditeur.
   `studio` vrai quand le jeton n'a d'effet que sur l'habillage Studio — l'éditeur les
            range à part plutôt que de les mêler aux autres, sinon on règle une couleur
            pendant dix minutes sans voir l'écran bouger.
   ------------------------------------------------------------------------------------- */
export const JETONS = [
  { cle: 'fond',         css: '--bg',        type: 'couleur', nom: 'Fond',          aide: 'Le fond de toute l\'application.' },
  { cle: 'surface',      css: '--bg-raised', type: 'couleur', nom: 'Surfaces',      aide: 'Cartes, panneaux, champs — ce qui est posé sur le fond.' },
  { cle: 'survol',       css: '--bg-hover',  type: 'couleur', nom: 'Survol',        aide: 'La teinte d\'un élément sous la souris.' },
  { cle: 'bordure',      css: '--border',    type: 'couleur', nom: 'Bordures',      aide: 'Traits de séparation et contours.' },
  { cle: 'texte',        css: '--text',      type: 'couleur', nom: 'Texte',         aide: 'La couleur du texte principal.' },
  { cle: 'texteDiscret', css: '--text-dim',  type: 'couleur', nom: 'Texte discret', aide: 'Sous-titres, légendes, mentions secondaires.' },
  { cle: 'accent',       css: '--accent',    type: 'couleur', nom: 'Accent',        aide: 'Boutons actifs, barre de progression, surbrillances.' },
  { cle: 'modale',       css: '--modale',    type: 'couleur', nom: 'Fenêtres',      aide: 'Fond des Paramètres et des dialogues.' },
  { cle: 'rayon', css: '--studio-rayon', type: 'nombre', nom: 'Arrondi des coins', unite: 'px', min: 0, max: 24, studio: true, aide: 'De 0 (coins vifs) à 24 (très arrondi).' },
  { cle: 'panneau',            css: '--panneau',          type: 'couleur', nom: 'Panneaux',        studio: true, aide: 'Fond de la barre latérale et du panneau de droite.' },
  { cle: 'studioSurvol',       css: '--st-survol',        type: 'couleur', nom: 'Survol (Studio)', studio: true, aide: 'Survol du logo, de la pastille de recherche et des cartes.' },
  { cle: 'studioPastille',     css: '--st-pastille',      type: 'couleur', nom: 'Pastilles',       studio: true, aide: 'Fond des pastilles et des champs posés sur le fond.' },
  { cle: 'studioFondProfond',  css: '--st-fond-profond',  type: 'couleur', nom: 'Fond profond',    studio: true, aide: 'Plus sombre que les panneaux : vignettes, fonds de Jam.' },
  { cle: 'studioTexteFaible',  css: '--st-texte-faible',  type: 'couleur', nom: 'Intertitres',     studio: true, aide: 'Libellés secondaires et intertitres en capitales.' },
  { cle: 'studioBordureFocus', css: '--st-bordure-focus', type: 'couleur', nom: 'Bordure active',  studio: true, aide: 'Contour d\'un champ en cours de saisie.' },
];
const PAR_CLE = new Map(JETONS.map((j) => [j.cle, j]));

/* ---------------------------------------------------------------------------------------
   Les deux palettes de départ.
   ---------------------------------------------------------------------------------------
   Un thème ne déclare que ce qu'il change : « fond bleu nuit » doit pouvoir tenir en une
   ligne. Tout le reste vient de la base, et c'est CETTE palette complète — la base fusionnée
   avec ce que le thème déclare — qu'il faut examiner pour juger de la lisibilité. Contrôler
   les seuls jetons déclarés laisserait passer un thème qui pose un fond blanc sans toucher
   au texte : chaque valeur prise isolément est irréprochable, l'écran est illisible.

   Recopiées de `public/style.css` (:root) et `public/skin-studio.css`. `scripts/test-themes.mjs`
   vérifie qu'elles n'ont pas divergé — une copie muette qui vieillit ferait porter les
   contrôles de contraste sur une palette qui n'est plus à l'écran.
   ------------------------------------------------------------------------------------- */
export const BASES = {
  sillon: {
    nom: 'Sillon (d\'origine)',
    jetons: {
      fond: '#030303', surface: '#161616', survol: '#1d1d1d', bordure: '#2a2a2a',
      texte: '#ffffff', texteDiscret: '#aaaaaa', accent: '#ff0033', modale: '#1c1c1c',
      rayon: 10, panneau: '#121212',
      studioSurvol: '#2a2a2a', studioPastille: '#1f1f1f', studioFondProfond: '#0f0f0f',
      studioTexteFaible: '#8b8b8b', studioBordureFocus: '#555555',
    },
  },
  studio: {
    nom: 'Studio',
    jetons: {
      fond: '#000000', surface: '#181818', survol: '#232323', bordure: '#2a2a2a',
      texte: '#ffffff', texteDiscret: '#b3b3b3', accent: '#1ed760', modale: '#1c1c1c',
      rayon: 10, panneau: '#121212',
      studioSurvol: '#2a2a2a', studioPastille: '#1f1f1f', studioFondProfond: '#0f0f0f',
      studioTexteFaible: '#8b8b8b', studioBordureFocus: '#555555',
    },
  },
};
export const BASES_CONNUES = Object.keys(BASES);

/* ---------------------------------------------------------------------------------------
   Contraste (WCAG 2.1).
   ------------------------------------------------------------------------------------- */
function canal(v) { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
/** Luminance relative d'une couleur `#rrggbb`. */
export function luminance(hex) {
  const n = parseInt(String(hex).slice(1), 16);
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}
/** Rapport de contraste entre deux couleurs, de 1 (identiques) à 21 (noir sur blanc). */
export function contraste(a, b) {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/* Les seuils. Le niveau AA de WCAG demande 4,5 pour du texte courant ; on REFUSE en dessous
   de 3 et on AVERTIT en dessous de 4,5.

   Pourquoi cette gradation plutôt qu'un seuil unique. Refuser à 4,5 rejetterait des thèmes
   sombres tout à fait lisibles dont le texte secondaire est volontairement effacé, et l'on
   passerait la journée à expliquer un refus à des gens de bonne foi. N'avertir que, c'est
   accepter des thèmes où le texte est INVISIBLE — et c'est l'application qui en porterait la
   réputation, pas l'auteur du thème. Le refus est donc réservé à ce qui est indéfendable. */
export const SEUIL_REFUS = 3;
export const SEUIL_CONSEIL = 4.5;

/* Les couples réellement à l'écran. Le texte se lit sur le fond ET sur les surfaces : une
   palette peut être irréprochable sur l'un et illisible sur l'autre, c'est même le défaut
   le plus courant quand on éclaircit les cartes sans toucher au reste. */
const COUPLES = [
  { texte: 'texte',        fond: 'fond',    quoi: 'Le texte principal sur le fond' },
  { texte: 'texte',        fond: 'surface', quoi: 'Le texte principal sur les surfaces' },
  { texte: 'texteDiscret', fond: 'fond',    quoi: 'Le texte discret sur le fond' },
  { texte: 'texteDiscret', fond: 'surface', quoi: 'Le texte discret sur les surfaces' },
  { texte: 'texte',        fond: 'modale',  quoi: 'Le texte principal dans les fenêtres' },
  { texte: 'texteDiscret', fond: 'modale',  quoi: 'Le texte discret dans les fenêtres' },
];

/**
 * Examine une palette COMPLÈTE (base + déclarations) et rend les problèmes de lisibilité.
 * @returns {{erreurs: string[], avertissements: string[]}}
 */
export function verifierLisibilite(palette) {
  const erreurs = [], avertissements = [];
  for (const c of COUPLES) {
    const r = contraste(palette[c.texte], palette[c.fond]);
    const dit = `${c.quoi} : contraste de ${r.toFixed(1)}:1`;
    if (r < SEUIL_REFUS) erreurs.push(`${dit} — illisible (minimum ${SEUIL_REFUS}:1).`);
    else if (r < SEUIL_CONSEIL) avertissements.push(`${dit} — juste lisible (${SEUIL_CONSEIL}:1 conseillé).`);
  }
  /* L'accent sert aussi de couleur de TEXTE (le titre en cours de lecture, par exemple), pas
     seulement de fond de bouton : un accent trop proche du fond fait disparaître ces mots-là
     alors que le reste de la page paraît normal. Un simple avertissement — beaucoup de
     thèmes n'emploient l'accent que sur des aplats, où le seuil ne s'applique pas. */
  const ra = contraste(palette.accent, palette.fond);
  if (ra < SEUIL_REFUS) avertissements.push(`L'accent sur le fond : contraste de ${ra.toFixed(1)}:1 — le texte mis en avant sera difficile à lire.`);
  return { erreurs, avertissements };
}

/* ---------------------------------------------------------------------------------------
   Validation.
   ------------------------------------------------------------------------------------- */
/* Les caractères de contrôle n'ont rien à faire dans un nom : ils ne s'affichent pas et
   servent surtout à déguiser une chaîne en une autre. */
const CONTROLE_RE = /[\u0000-\u001f\u007f]/g;
function texteCourt(v, max) {
  if (typeof v !== 'string') return null;
  const s = v.replace(CONTROLE_RE, '').trim();
  return s && s.length <= max ? s : null;
}

/**
 * Valide et normalise un thème brut (issu d'un fichier, d'un code partagé ou de la galerie).
 *
 * @param {any} brut
 * @returns {{ok: boolean, erreurs: string[], avertissements: string[], theme: object|null}}
 */
export function normaliser(brut) {
  const erreurs = [], avertissements = [];
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) {
    return { ok: false, erreurs: ['Ce n\'est pas un thème (objet attendu).'], avertissements, theme: null };
  }

  /* Le numéro de format d'abord : s'il vient du futur, tout le reste de l'analyse dirait des
     choses fausses. « Ce thème demande une version plus récente de Sillon » est un message
     que l'on peut suivre ; « jeton inconnu : reflet » ne l'est pas. */
  const format = brut.format === undefined ? FORMAT : brut.format;
  if (!Number.isInteger(format) || format < 1) erreurs.push('Numéro de format invalide.');
  else if (format > FORMAT) erreurs.push(`Ce thème est au format ${format}, cette version de Sillon comprend jusqu'au format ${FORMAT}. Mets Sillon à jour.`);
  if (erreurs.length) return { ok: false, erreurs, avertissements, theme: null };

  const id = typeof brut.id === 'string' && ID_RE.test(brut.id) ? brut.id : null;
  if (!id) erreurs.push('Identifiant absent ou invalide (minuscules, chiffres et tirets, 2 à 49 caractères).');

  const nom = texteCourt(brut.nom, 40);
  if (!nom) erreurs.push('Nom absent ou trop long (40 caractères maximum).');

  const auteur = brut.auteur === undefined || brut.auteur === null || brut.auteur === '' ? '' : texteCourt(brut.auteur, 40);
  if (auteur === null) erreurs.push('Nom d\'auteur trop long (40 caractères maximum).');

  const base = brut.base === undefined || brut.base === null ? 'sillon' : brut.base;
  if (!BASES_CONNUES.includes(base)) erreurs.push(`Base inconnue : ${JSON.stringify(base)}. Attendu ${BASES_CONNUES.join(' ou ')}.`);

  const description = brut.description === undefined || brut.description === null || brut.description === '' ? '' : texteCourt(brut.description, 140);
  if (description === null) erreurs.push('Description trop longue (140 caractères maximum).');

  /* Les jetons. Un jeton inconnu est une ERREUR, pas un silence : c'est presque toujours une
     faute de frappe, et une couleur qu'on a réglée mais qui ne s'applique jamais est
     exactement le genre de défaut qu'on cherche une heure. La compatibilité ascendante est
     assurée par le numéro de format, contrôlé plus haut — pas en avalant l'inattendu. */
  const jetons = {};
  const brutJ = brut.jetons;
  if (brutJ !== undefined && (typeof brutJ !== 'object' || brutJ === null || Array.isArray(brutJ))) {
    erreurs.push('« jetons » doit être un objet.');
  } else {
    for (const [cle, val] of Object.entries(brutJ || {})) {
      const j = PAR_CLE.get(cle);
      if (!j) { erreurs.push(`Jeton inconnu : ${JSON.stringify(cle)}.`); continue; }
      if (j.type === 'couleur') {
        if (typeof val !== 'string' || !HEX_RE.test(val)) { erreurs.push(`« ${j.nom} » doit être une couleur au format #rrggbb (reçu ${JSON.stringify(val)}).`); continue; }
        jetons[cle] = val.toLowerCase();
      } else {
        const n = typeof val === 'number' ? val : NaN;
        if (!Number.isFinite(n)) { erreurs.push(`« ${j.nom} » doit être un nombre (reçu ${JSON.stringify(val)}).`); continue; }
        if (n < j.min || n > j.max) { erreurs.push(`« ${j.nom} » doit être compris entre ${j.min} et ${j.max} (reçu ${n}).`); continue; }
        jetons[cle] = Math.round(n);
      }
    }
  }
  if (!Object.keys(jetons).length && !erreurs.length) erreurs.push('Ce thème ne change rien : il faut au moins un jeton.');
  if (erreurs.length) return { ok: false, erreurs, avertissements, theme: null };

  const lis = verifierLisibilite(Object.assign({}, BASES[base].jetons, jetons));
  erreurs.push(...lis.erreurs);
  avertissements.push(...lis.avertissements);
  if (erreurs.length) return { ok: false, erreurs, avertissements, theme: null };

  return { ok: true, erreurs, avertissements, theme: { format: FORMAT, id, nom, auteur, description, base, jetons } };
}

/**
 * Palette complète d'un thème : la base, recouverte par ce qu'il déclare.
 * Sert à l'aperçu et aux contrôles.
 */
export function palette(theme) {
  const b = BASES[theme.base] ? BASES[theme.base] : BASES.sillon;
  return Object.assign({}, b.jetons, theme.jetons || {});
}

/**
 * Les variables CSS à poser dans la page.
 *
 * On rend les jetons DÉCLARÉS uniquement — pas la palette complète. La différence est
 * importante : poser toute la palette figerait les treize autres variables, et un thème qui
 * ne change que l'accent empêcherait « accent d'après la pochette » de fonctionner sur le
 * reste. Un thème n'occupe que le terrain qu'il revendique.
 */
export function css(theme) {
  const out = {};
  for (const [cle, val] of Object.entries(theme.jetons || {})) {
    const j = PAR_CLE.get(cle);
    if (!j) continue;
    out[j.css] = j.type === 'nombre' ? `${val}${j.unite || ''}` : val;
  }
  return out;
}

/**
 * L'objet minimal à mettre dans un code de partage ou dans la galerie : ni date, ni
 * compteur, ni chemin de fichier — rien qui ne serve à peindre l'écran.
 */
export function charge(theme) {
  const c = { format: FORMAT, id: theme.id, nom: theme.nom, base: theme.base, jetons: theme.jetons };
  if (theme.auteur) c.auteur = theme.auteur;
  if (theme.description) c.description = theme.description;
  return c;
}
