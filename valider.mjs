#!/usr/bin/env node
/* Valide `themes.json` — c'est ce que la CI exécute sur chaque pull request.
 *
 *   node valider.mjs [chemin/themes.json]
 *
 * Sort 0 si tout passe, 1 sinon. Les AVERTISSEMENTS ne font pas échouer : ils décrivent des
 * choix discutables (un texte secondaire très pâle), pas des fautes. Faire échouer sur un
 * avertissement reviendrait à refuser du travail de bonne foi et à passer ses journées à
 * s'en expliquer ; ne rien dire reviendrait à laisser publier des thèmes pénibles à lire.
 *
 * CE PROGRAMME REMPLACE UN RELECTEUR HUMAIN, et il ne le peut que parce qu'un thème est une
 * DONNÉE : des couleurs et des nombres, jamais du CSS ni du code. Il n'y a donc rien à
 * juger au cas par cas — la réponse est calculable. C'est ce qui permet d'accepter les
 * contributions sans file d'attente, et donc sans plafonner qui que ce soit.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { validerGalerie } from './themes-galerie.mjs';
import { FORMAT } from './themes-format.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const cible = process.argv[2] || path.join(ICI, 'themes.json');

let brut;
try {
  brut = JSON.parse(fs.readFileSync(cible, 'utf8'));
} catch (e) {
  console.error(`✗ ${path.basename(cible)} n'est pas un JSON lisible : ${e.message}`);
  console.error('  (Une virgule en trop après la dernière entrée est de loin la cause la plus fréquente.)');
  process.exit(1);
}

const r = validerGalerie(brut);

for (const a of r.avertissements) console.log(`⚠ ${a}`);
for (const e of r.erreurs) console.error(`✗ ${e}`);

console.log('');
console.log(`Format ${FORMAT} · ${r.themes.length} thème(s) valides, ${r.erreurs.length} erreur(s), ${r.avertissements.length} avertissement(s).`);

if (!r.ok) {
  console.error('\nLa galerie n\'est pas publiable en l\'état. Corrige les points marqués ✗ ci-dessus.');
  process.exit(1);
}
console.log('Galerie valide.');
