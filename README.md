# Galerie de thèmes de Sillon

Les thèmes que la communauté partage. **Ce dépôt ne contient que du texte** : pas d'image,
pas de code, pas de compte. Un thème est une liste de couleurs — quelques centaines
d'octets — et Sillon dessine lui-même son aperçu à partir de ces couleurs.

C'est ce qui permet à cette galerie de ne rien coûter à héberger, et de n'avoir **aucune
limite du nombre de thèmes** que l'on peut publier (voir « Les règles » plus bas pour la
seule borne qui subsiste, et pourquoi elle existe).

---

## Publier un thème

1. Dans Sillon : **Paramètres → Personnalisation → Thèmes**, crée ton thème.
2. Clique **Partager** : tu obtiens un code qui commence par `SILLON1:`.
   *Ce code suffit déjà pour l'envoyer à quelqu'un.* Passer par cette galerie n'est utile
   que si tu veux qu'on le trouve sans te le demander.
3. Ouvre `themes.json`, ajoute ton entrée à la fin du tableau `themes` :

```json
{
  "format": 1,
  "id": "mon-theme",
  "nom": "Mon thème",
  "auteur": "ton pseudo",
  "description": "Une phrase : ce qu'il évoque, quand on l'utilise.",
  "base": "sillon",
  "jetons": { "fond": "#0b0f1a", "accent": "#7aa2f7" }
}
```

4. Ouvre une **pull request**. La CI valide en quelques secondes. Il n'y a personne à
   attendre : si c'est vert, c'est publiable.

Pour retrouver les valeurs de ton thème sans les recopier à la main, son fichier est déjà
sur ton disque : `data/themes/<id>.json` dans ton dossier Sillon.

### Vérifier avant d'ouvrir la pull request

```bash
node valider.mjs
```

---

## Le format

| Champ | | |
|---|---|---|
| `format` | oui | toujours `1` pour l'instant |
| `id` | oui | minuscules, chiffres et tirets ; unique dans la galerie |
| `nom` | oui | 40 caractères maximum |
| `auteur` | oui *(en galerie)* | ton pseudo |
| `description` | oui *(en galerie)* | une phrase, 140 caractères maximum |
| `base` | non | `sillon` (défaut) ou `studio` — l'habillage pour lequel tu as réglé les couleurs |
| `jetons` | oui | au moins un ; tout ce que tu ne déclares pas garde la couleur de la base |

Les jetons disponibles, leurs noms exacts et leurs valeurs par défaut sont dans
**`themes-format.mjs`** — c'est le fichier qui fait autorité, et c'est lui que la CI
exécute. Les couleurs s'écrivent `#rrggbb`, en six chiffres.

---

## Les règles, et pourquoi

**Aucun CSS, aucun code — uniquement des couleurs et des nombres.** Ce n'est pas une
restriction de confort : du CSS libre pourrait charger une image distante (donc relever
l'adresse IP de chaque personne qui installe le thème), ou masquer un bouton de
confirmation et en recouvrir un autre. Des valeurs typées ne le peuvent pas. C'est aussi ce
qui fait que ton thème continuera de fonctionner après les prochaines mises à jour de
Sillon, là où du CSS accroché à la structure de la page casserait à la première refonte.

**Le texte doit rester lisible.** La CI calcule les rapports de contraste (WCAG) entre le
texte et les fonds sur lesquels il est réellement posé. En dessous de 3:1 c'est refusé ;
entre 3 et 4,5 c'est accepté avec un avertissement. Le contrôle porte sur la palette
*complète* — base comprise —, parce qu'un thème qui pose un fond blanc sans toucher au
texte est illisible alors que chacune de ses valeurs, prise seule, est irréprochable.

**Pas deux fois la même palette.** Deux entrées aux jetons identiques sont le même thème
sous deux noms.

**Dix thèmes par personne, au maximum.** Ce n'est *pas* une question de place — mille
thèmes tiennent dans un fichier plus léger qu'une seule pochette d'album. C'est qu'une
galerie où une personne a publié quatre-vingts variantes n'est plus une galerie : les
autres n'y sont plus visibles. **Ce que tu gardes chez toi reste illimité**, et le code de
partage n'a aucune limite non plus.

---

## Comment Sillon lit ce dépôt

Sillon récupère `themes.json` **via un CDN public**, pas via l'API GitHub :

```
https://cdn.jsdelivr.net/gh/<compte>/<dépôt>@main/themes.json
```

L'API GitHub limite à 60 requêtes par heure et par adresse IP quand on n'est pas
authentifié : derrière le partage de connexion d'un opérateur ou dans une école, la galerie
tomberait en panne pour tout le monde sans que personne ne comprenne pourquoi. Un CDN est
fait pour ça, et il met en cache.

Sillon garde une copie de la dernière galerie qu'il a vue : hors ligne, la liste reste
consultable, datée. Installer un thème en fait **une copie locale** — il devient le tien,
tu peux le modifier, et il ne changera plus jamais sous tes pieds, même si son auteur le
modifie ici.

---

## À propos des fichiers `themes-format.mjs` et `themes-galerie.mjs`

Ce sont des **copies** des modules de Sillon. Elles vivent ici parce que la CI doit pouvoir
valider une pull request venue de n'importe qui, sans aucun accès au dépôt de Sillon, qui
est privé.

⚠️ **Quand le format évolue, ces deux fichiers sont à recopier** depuis le dépôt de Sillon
(`themes-format.mjs` et `themes-galerie.mjs`, à sa racine). Côté Sillon, le test
`scripts/test-themes.mjs` compare la copie de préparation à l'original et rougit si elles
divergent. Un changement de format se voit aussi au numéro `FORMAT`, qui s'incrémente.
