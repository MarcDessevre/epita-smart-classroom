# Mini-dossier de gestion de projet — EPITA Smart Classroom

## 1) Cadrage

### Problématique
Permettre à un responsable non technique de vérifier rapidement la configuration d'une salle (mobilier/équipements) à partir d'une image, avec transparence sur les limites du modèle.

### Objectifs
- Détecter et compter les objets reconnus par COCO-SSD (ex. chaises, tables, laptops, écrans).
- Comparer attendu vs observé pour les catégories vérifiables.
- Produire un tableau de bord et un rapport d'audit compréhensibles.
- Exclure toute analyse ou identification des personnes.

### Utilisateurs cibles
- Responsable de salle / équipe logistique EPITA.
- Encadrant pédagogique non technique.

### Périmètre MVP
- Interface web responsive.
- Webcam (capture) + chargement image locale.
- Détection COCO-SSD côté navigateur avec seuil de confiance paramétrable.
- Audit, indicateurs et rapport exportable (impression/téléchargement texte).

### Exclusions
- Reconnaissance d'identité/personne.
- Entraînement d'un modèle personnalisé.
- Détection native garantie des tableaux/fenêtres (non supportés par COCO-SSD).

## 2) Planification (user stories / tâches)

| ID | Tâche / User story | Priorité | Statut |
|---|---|---|---|
| US1 | En tant que responsable, je vois une page d'accueil expliquant l'objectif, la confidentialité et les limites. | Haute | Fait |
| US2 | En tant qu'utilisateur, je démarre/arrête la webcam et visualise l'aperçu. | Haute | Fait |
| US3 | En tant qu'utilisateur, je capture une image webcam et lance l'analyse. | Haute | Fait |
| US4 | En tant qu'utilisateur, je peux charger une image locale de test sans webcam. | Haute | Fait |
| US5 | En tant qu'utilisateur, je règle le seuil de confiance appliqué à l'affichage/comptage. | Haute | Fait |
| US6 | En tant qu'utilisateur, je vois les comptages et l'audit attendu/observé pour les catégories vérifiables. | Haute | Fait |
| US7 | En tant qu'utilisateur, je vois clairement les catégories non prises en charge (tableaux, fenêtres). | Haute | Fait |
| US8 | En tant qu'utilisateur, je consulte un tableau de bord synthétique avec statut global. | Moyenne | Fait |
| US9 | En tant qu'utilisateur, je génère/imprime/télécharge un rapport d'audit. | Moyenne | Fait |
| US10 | En tant qu'équipe projet, nous validons la logique d'agrégation et d'audit par tests simples. | Moyenne | Fait |

## 3) Risques principaux

1. **Faux négatifs/faux positifs** liés aux limites du modèle, cadrage, occlusions, lumière.
2. **Catégories métier non couvertes** (tableaux/fenêtres) pouvant être mal interprétées sans message clair.
3. **Performance navigateur** sur machines anciennes pendant l'inférence.
4. **Refus caméra (permissions)** empêchant le flux live, d'où besoin du mode image locale.
5. **Confiance excessive dans les chiffres** si l'utilisateur ignore les limites d'observation.

