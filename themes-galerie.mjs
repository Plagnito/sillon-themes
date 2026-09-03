/* themes-galerie.mjs — les règles de la GALERIE publique. Décision PURE.
 *
 * `themes-format.mjs` répond à « ce thème est-il valable ». Ce fichier-ci répond à une autre
 * question, qui ne se pose que pour une collection : « cette galerie est-elle saine ». Deux
 * thèmes irréprochables peuvent former une galerie qui ne l'est pas — s'ils portent le même
 * identifiant, ou s'ils sont la même chose sous deux noms.
 *
 * ────────────────────────────────────────────────────────────────────────────────────────
 * POURQUOI IL N'Y A PLUS DE PLAFOND DE CINQ, ET CE QUI LE REMPLACE
 * ────────────────────────────────────────────────────────────────────────────────────────
 * Un plafond par personne se justifiait par le stockage. Il ne se justifie plus : un thème
 * pèse quelques centaines d'octets, mille thèmes tiennent dans un fichier plus léger qu'une
 * seule pochette d'album, et ce fichier n'est même pas hébergé par Sillon.
 *
 * Ce qui reste vrai, en revanche, c'est qu'une galerie où une seule personne a publié quatre-
 * vingts variantes de la même chose n'est plus une galerie : les autres n'y sont plus
 * visibles. Le plafond change donc de NATURE — il ne rationne pas une ressource, il protège
 * la lisibilité d'une liste — et donc de valeur : dix, et non cinq. Les deux règles qui
 * suivent (identifiants uniques, pas de doublon de palette) font le reste du travail, et
 * mieux : elles visent le comportement gênant plutôt que le nombre.
 *
 * Rien de tout cela ne limite ce que l'on garde CHEZ SOI, qui est et reste illimité.
 */
import { normaliser } from './themes-format.mjs';

export const MAX_PAR_AUTEUR = 10;

/* Deux thèmes qui déclarent exactement les mêmes jetons sur la même base SONT le même thème,
   quels que soient leurs noms. On les compare par leur palette déclarée, triée — sinon
   l'ordre des clés dans le fichier suffirait à les distinguer, ce qui n'a aucun sens. */
function empreinte(theme) {
  const j = theme.jetons || {};
  return theme.base + '|' + Object.keys(j).sort().map((k) => k + ':' + j[k]).join(',');
}

/**
 * Vérifie un fichier de galerie entier.
 *
 * @param {any} brut  le contenu de `themes.json`
 * @returns {{ok: boolean, erreurs: string[], avertissements: string[], themes: object[]}}
 */
export function validerGalerie(brut, { maxParAuteur = MAX_PAR_AUTEUR } = {}) {
  const erreurs = [], avertissements = [], themes = [];
  if (!brut || typeof brut !== 'object' || !Array.isArray(brut.themes)) {
    return { ok: false, erreurs: ['Le fichier doit être un objet avec un tableau « themes ».'], avertissements, themes };
  }

  const vus = new Map();          // id -> rang
  const palettes = new Map();     // empreinte -> nom
  const parAuteur = new Map();

  brut.themes.forEach((entree, i) => {
    const ou = `thème ${i + 1}${entree && entree.id ? ` (${entree.id})` : ''}`;
    const r = normaliser(entree);
    if (!r.ok) { r.erreurs.forEach((m) => erreurs.push(`${ou} : ${m}`)); return; }
    const t = r.theme;
    r.avertissements.forEach((m) => avertissements.push(`${ou} : ${m}`));

    /* Un auteur et une description sont FACULTATIFS pour un thème gardé chez soi — on ne va
       pas faire remplir un formulaire à quelqu'un qui se peint son propre lecteur. Ils
       deviennent obligatoires en galerie : sans eux, une liste publique n'est qu'une suite
       de vignettes anonymes que personne ne sait départager. */
    if (!t.auteur) erreurs.push(`${ou} : un thème publié doit nommer son auteur.`);
    if (!t.description) erreurs.push(`${ou} : un thème publié doit porter une description (une phrase suffit).`);

    if (vus.has(t.id)) { erreurs.push(`${ou} : l'identifiant « ${t.id} » est déjà pris par le thème ${vus.get(t.id)}.`); return; }
    vus.set(t.id, i + 1);

    const emp = empreinte(t);
    if (palettes.has(emp)) { erreurs.push(`${ou} : palette identique à « ${palettes.get(emp)} » — c'est le même thème sous un autre nom.`); return; }
    palettes.set(emp, t.nom);

    const cle = t.auteur.toLowerCase();
    parAuteur.set(cle, (parAuteur.get(cle) || 0) + 1);
    themes.push(t);
  });

  for (const [auteur, n] of parAuteur) {
    if (n > maxParAuteur) erreurs.push(`« ${auteur} » publie ${n} thèmes ; le maximum est ${maxParAuteur} pour que la galerie reste lisible. Garde tes préférés en ligne — les autres restent chez toi, sans limite.`);
  }

  return { ok: erreurs.length === 0, erreurs, avertissements, themes };
}
