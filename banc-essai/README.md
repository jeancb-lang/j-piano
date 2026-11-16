# Banc d'essai de la détection micro

Piano simulé (cordes, marteau, pièce, micro de téléphone, bruit) pour mesurer la détection.

- `node run.js ./det_new` : détection libre (mode Défi)
- `node learn.js ./det_new` : mode Apprentissage + rejet des fausses notes

`det_new.js` est le détecteur copié tel quel dans `index.html` (entre /*DET-BEGIN*/ et /*DET-END*/).

- `node reject.js ./det_new` : bruits non-piano (chocs, frottements, téléphone manipulé, voix) et fausses notes, avec et sans octave libre
