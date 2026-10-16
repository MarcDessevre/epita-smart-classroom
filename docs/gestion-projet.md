# Mini-dossier de gestion de projet

## Cadrage

### Problématique métier
Un responsable de salle doit vérifier rapidement une configuration sans compter chaque équipement manuellement, tout en sachant quelles catégories une IA peut réellement observer.

### Objectifs
- Fournir une première observation visuelle locale.
- Comparer les catégories couvertes à une configuration théorique modifiable.
- Rendre visibles les incertitudes et les catégories non supportées.
- Produire un rapport imprimable exploitable lors d’un contrôle humain.

### Utilisateurs cibles
Responsables de salles, équipes logistiques et encadrants pédagogiques non spécialistes de l’IA.

### MVP
Caméra, import d’image locale, OWL-ViT via Transformers.js dans le navigateur, seuil réglable, cadres et scores, audit, KPI, rapport et messages d’erreur.

### Hors périmètre
Reconnaissance ou identification de personnes, stockage serveur, entraînement d’un modèle, garantie de détection parfaite des catégories, authentification et historique multi-utilisateur.

### Architecture technique
Application statique composée de `index.html`, `styles.css`, `app.js` et `utils.js`. Transformers.js et OWL-ViT sont chargés depuis CDN. Les fonctions métier pures sont testées avec le Node.js Test Runner. Aucun backend ni base de données.

## Backlog

| ID | User story / tâche | Priorité | Statut | Critère d’acceptation |
|---|---|---|---|---|
| US01 | Présenter l’objectif et la confidentialité | Haute | Fait | Le premier écran explique l’usage et l’absence de téléversement. |
| US02 | Démarrer et arrêter la caméra | Haute | Fait | Les boutons et messages reflètent l’état; les pistes sont libérées à l’arrêt. |
| US03 | Importer une image locale | Haute | Fait | Une image valide est lue localement sans URL publique. |
| US04 | Charger OWL-ViT | Haute | Fait | L’état de chargement, de succès et d’échec est visible. |
| US05 | Afficher cadres, catégories et scores | Haute | Fait | Les détections au-dessus du seuil sont listées et dessinées. |
| US06 | Régler le seuil | Haute | Fait | Le filtrage et les résultats se mettent à jour sans relancer inutilement le modèle. |
| US07 | Comparer attendu et observé | Haute | Fait | Les quantités et écarts sont calculés seulement quand l’analyse le permet. |
| US08 | Signaler les limites des catégories | Haute | Fait | Les catégories interrogées et leurs scores sont visibles; les limites restent explicites. |
| US09 | Calculer le tableau de bord | Haute | Fait | Les cinq KPI proviennent des résultats et de la configuration courante. |
| US10 | Générer et imprimer le rapport | Moyenne | Fait | Le rapport reflète la source, le modèle, le seuil, les résultats et les limites. |
| US11 | Valider les scénarios navigateur | Haute | À exécuter | Trois scénarios manuels sont joués avec images et permissions réelles. |

## Risques et mitigations

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Classes OWL-ViT et prompts imparfaits | Haute | Élevé | Interroger les libellés mobilier, afficher les scores et conserver le contrôle humain. |
| Faux positifs ou faux négatifs | Haute | Élevé | Seuil réglable, scores visibles, plusieurs angles et contrôle humain. |
| Objet masqué, hors champ ou mal éclairé | Haute | Élevé | Recommander plusieurs captures et ne jamais interpréter zéro comme une absence certaine. |
| Refus ou absence de caméra | Moyenne | Moyen | Message explicite et parcours alternatif par import local. |
| CDN ou modèle indisponible | Moyenne | Élevé | État d’erreur récupérable, interface conservée et diagnostic réseau. |
| Compatibilité navigateur / performance | Moyenne | Moyen | HTML statique, navigateur récent recommandé, analyse non concurrente. |
| Temps de développement limité | Haute | Moyen | MVP sans backend, tests ciblés et documentation concise. |

## KPI

### Taux de détection sur jeu annoté
Constituer un jeu d’images représentatif, annoter les objets attendus, puis comparer les objets détectés aux annotations à seuil fixé. Publier précision, rappel et taux de détection par classe; ne pas présenter de valeur avant cette mesure.

### Temps moyen d’un audit
Mesurer avec un chronomètre le délai entre l’ouverture de l’application et l’impression du rapport sur un échantillon d’audits, puis calculer la moyenne et la médiane. Documenter séparément le temps de chargement du modèle.

### Nombre d’écarts identifiés
Pour chaque audit, compter les lignes vérifiables dont l’écart attendu/observé est différent de zéro. Comparer ensuite ce nombre au relevé humain afin d’identifier les écarts manqués ou superflus.

## Validation de présentation

- Les tests unitaires sont exécutables avec `npm test`.
- Les tests image réelle, absence de détection et refus caméra restent des scénarios manuels navigateur à exécuter avant présentation.
- Le déploiement GitHub Pages utilise la racine du dépôt, sans commande de build.
