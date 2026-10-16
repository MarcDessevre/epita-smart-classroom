# EPITA Smart Classroom

EPITA Smart Classroom est un outil front-end d’aide au contrôle visuel d’une salle de cours. Il analyse une image locale ou une vue caméra dans le navigateur, compte les classes reconnues par OWL-ViT et compare les résultats à une configuration attendue modifiable.

## Technologies

- HTML5, CSS3 et JavaScript natif
- Transformers.js 3.7.2
- OWL-ViT `Xenova/owlvit-base-patch32`, modèle pré-entraîné exécuté côté client
- Node.js Test Runner pour les tests unitaires

OWL-ViT est interrogé avec les libellés `chair`, `dining table`, `laptop`, `tv`, `blackboard`, `whiteboard`, `window` et `person`. Les scores restent indicatifs et un contrôle humain est nécessaire. La classe `person` est volontairement ignorée.

## Lancement local

Un serveur HTTP est nécessaire pour les scripts CDN et l’accès caméra :

```bash
python3 -m http.server 8080
```

Puis ouvrir `http://localhost:8080`. Sous Windows, `py -m http.server 8080` convient également.

## Utilisation

1. Attendre l’état « Modèle disponible ».
2. Démarrer la caméra ou importer une image avec le sélecteur local.
3. Lancer l’analyse, puis régler le seuil si nécessaire.
4. Modifier la configuration attendue pour la salle.
5. Lire le statut global et imprimer le rapport via « Imprimer / PDF ».

Une analyse sans détection ne prouve pas l’absence d’un objet : cadrage, lumière, occlusion et faux négatifs restent possibles.

## Sécurité et confidentialité

L’inférence est réalisée dans le navigateur. Les images importées sont conservées uniquement en mémoire locale pendant la session; elles ne sont ni téléversées ni enregistrées par l’application. La caméra est arrêtée lorsque l’utilisateur le demande ou quitte la page. Aucune personne n’est identifiée ni analysée.

L’outil est une aide à la vérification et ne remplace pas un contrôle humain.

## Tests

Lancer :

```bash
npm test
```

Les tests automatisés couvrent le filtrage de seuil, l’exclusion des personnes, l’agrégation par catégorie, les écarts, les catégories non supportées et les statuts d’analyse vide ou indisponible.

Les scénarios avec images réelles et refus de permission caméra nécessitent un navigateur et doivent être vérifiés manuellement :

- image contenant plusieurs objets reconnus;
- image sans objet pertinent;
- refus caméra ou indisponibilité du CDN/modèle.

Aucune mesure de précision n’est annoncée sans jeu de test annoté.

## Déploiement GitHub / Cloudflare Pages

Le projet est statique et ne possède ni étape de compilation ni répertoire de sortie séparé. Pour Cloudflare Pages, sélectionner le dépôt GitHub, laisser la commande de build vide et utiliser `/` comme répertoire de sortie. Pour GitHub Pages, publier la racine du dépôt.

Aucune URL publique n’est indiquée ici car aucun dépôt distant ni déploiement n’a été confirmé dans cet environnement.

## Limites connues

- Les libellés proposés à OWL-ViT ne couvrent pas toutes les catégories métier.
- Les résultats dépendent de la qualité de l’image, du navigateur et du seuil.
- Le chargement initial des CDN nécessite un réseau disponible.
- Un contrôle humain est requis pour conclure sur une salle, surtout pour les catégories non supportées.
