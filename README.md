# EPITA Smart Classroom

Application web de démonstration pour auditer visuellement une salle de cours à partir d'un modèle de détection d'objets pré-entraîné (TensorFlow.js + COCO-SSD), exécuté directement dans le navigateur.

## Lancer l'application

Comme l'application charge des scripts depuis CDN et accède à la webcam, servez les fichiers en HTTP local :

```bash
cd /home/runner/work/epita-smart-classroom/epita-smart-classroom
python3 -m http.server 8080
```

Puis ouvrez `http://localhost:8080`.

## Fonctionnalités couvertes

- Interface d'accueil et d'audit (caméra, résultats, tableau de bord, rapport).
- Démarrage/arrêt webcam.
- Analyse d'image webcam ou d'image de test fournie dans l'application.
- Chargement optionnel d'une image de test via URL (ex. GitHub user-attachments).
- Affichage des catégories détectées, scores de confiance, cadres de détection, comptage par catégorie.
- Seuil de confiance paramétrable.
- Configuration théorique modifiable (tables, chaises, tableau, laptops, fenêtres, écrans).
- Comparaison attendu/détecté sur catégories vérifiables.
- Catégories non prises en charge affichées explicitement.
- Exclusion des personnes (`person`) de l'analyse.
- Rapport d'audit généré à partir des résultats réels.
- Renforcement de la détection sur image fixe via analyse multi-zones + déduplication (meilleur rappel sur les chaises).

## Mini-dossier de gestion de projet

### Cadrage

- **Problématique métier** : vérifier rapidement la conformité d'équipement d'une salle sans comptage manuel systématique.
- **Objectifs** : automatiser un premier niveau d'audit visuel, signaler les écarts et clarifier les limites du modèle.
- **Utilisateurs cibles** : responsables pédagogiques/techniques non experts IA.
- **Périmètre MVP** : application web front-only, détection locale navigateur, dashboard, rapport texte.
- **Fonctionnalités exclues** : reconnaissance de personnes, identification nominative, backend obligatoire, entraînement de modèle custom.

### Planification (tâches / user stories)

| ID | Tâche | Priorité | Statut |
|---|---|---|---|
| US1 | Afficher une page d'accueil claire du projet | Haute | Terminé |
| US2 | Démarrer/arrêter la webcam depuis l'interface | Haute | Terminé |
| US3 | Charger le modèle COCO-SSD dans le navigateur | Haute | Terminé |
| US4 | Analyser image webcam et afficher cadres + scores | Haute | Terminé |
| US5 | Permettre l'analyse d'une image de test fournie | Moyenne | Terminé |
| US6 | Configurer un seuil de confiance dynamique | Haute | Terminé |
| US7 | Comparer attendu vs détecté pour catégories vérifiables | Haute | Terminé |
| US8 | Afficher les catégories non prises en charge | Haute | Terminé |
| US9 | Générer un rapport d'audit contextualisé | Haute | Terminé |
| US10 | Produire un tableau de bord synthétique | Haute | Terminé |

### Risques

1. **Détections incomplètes** (objets masqués/hors champ/faible luminosité).
2. **Couverture limitée COCO-SSD** (ex. tableau/fenêtre non garantis).
3. **Dépendance navigateur** (permissions caméra, performances machine).
4. **Perception d'exactitude absolue** par l'utilisateur non technique malgré les limites.
