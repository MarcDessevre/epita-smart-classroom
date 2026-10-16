# EPITA Smart Classroom

Application web d'audit visuel de salle de cours basée sur TensorFlow.js + COCO-SSD.

## Fonctionnalités
- Interface d'accueil expliquant limites et confidentialité.
- Démarrage/arrêt caméra + capture d'image.
- Chargement d'image locale (mode sans caméra).
- Détection d'objets avec seuil de confiance paramétrable.
- Exclusion stricte des personnes (`person`) des résultats.
- Compteurs, audit attendu/observé, tableau de bord.
- Rapport d'audit généré, imprimable et téléchargeable.

## Correspondance vocabulaire métier ↔ classes COCO-SSD
- Chaises → `chair`
- Tables/Bureaux → `dining table`
- Ordinateurs portables → `laptop`
- Écrans → `tv`
- Tableaux / Fenêtres → **non supportés nativement** (catégories non vérifiables)

## Lancer localement
Depuis la racine du dépôt :

```bash
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000`.

## Tests
Tests unitaires simples des fonctions d'agrégation/audit/tableau de bord :

```bash
npm test
```

## Déploiement GitHub Pages
Projet 100% statique (HTML/CSS/JS). Publier la branche sur GitHub Pages (racine du dépôt) suffit.
