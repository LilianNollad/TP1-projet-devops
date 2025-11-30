# API CRUD - TP DevOps CI/CD

**Étudiant** : Master 1 CCM
**Sujet** : Déploiement Continu et Monitoring d'une API REST

Application REST développée dans le cadre du TP sur l'intégration continue, le déploiement continu et le monitoring. Cette API permet la gestion complète d'utilisateurs avec une architecture conteneurisée déployée sur Google Cloud Run, incluant un système de monitoring centralisé avec Loki/Grafana.

## Objectifs du TP

Ce projet implémente les trois exercices du TP DevOps :

### Exercice 1 : Envoi des logs vers GCP
- Collecte des logs applicatifs avec Fluent Bit
- Envoi vers Loki déployé sur Google Kubernetes Engine (GKE)
- Visualisation et alerting dans Grafana
- Alertes Discord configurées pour les erreurs 404

### Exercice 2 : Isolation des migrations
- Séparation des migrations dans un conteneur dédié
- Exécution automatique avant le démarrage de l'application
- Gestion des dépendances entre services via Docker Compose

### Exercice 3 : Pipeline CD avec GitHub Actions
- Workflow automatisé déclenché par tags Git
- Build et push des images Docker (API, Fluent Bit, Migration)
- Déploiement sur Google Cloud Run
- Exécution des migrations via Cloud SQL Proxy

## Fonctionnalités

L'application implémente les fonctionnalités suivantes :

- API REST complète pour les opérations CRUD sur les utilisateurs
- Base de données MariaDB/MySQL avec migrations isolées
- Reverse proxy Nginx avec logs au format JSON
- Containerisation via Docker et Docker Compose
- Déploiement automatisé sur Google Cloud Run
- Monitoring centralisé avec Fluent Bit → Loki → Grafana
- Système d'alerting Discord pour les erreurs HTTP
- Endpoint de health check pour la supervision
- Validation des données en entrée et gestion appropriée des erreurs

## Architecture

### Architecture locale (Docker Compose)

```
Client → [Conteneur App: Nginx + Node.js] → [Conteneur DB: MariaDB]
                    ↓                              ↑
         [Conteneur Fluent Bit]          [Conteneur Migration]
                    ↓                         (run once)
            [Loki sur GKE]
                    ↓
            [Grafana + Alerting]
                    ↓
              [Discord]
```

**Services déployés localement** :
- **app** : Nginx + Application Node.js (même conteneur)
- **db** : MariaDB avec health check
- **migration** : Exécution des migrations (run once, dépendance pour app)
- **fluent-bit** : Collecte et envoi des logs vers Loki

### Architecture production (Google Cloud)

```
GitHub (tag v*.*.*)
    ↓
GitHub Actions Pipeline
    ├─ Build images Docker
    ├─ Push vers Docker Hub
    ├─ Migration via Cloud SQL Proxy
    └─ Deploy vers Cloud Run
         ├─ Container: CRUD API (Node.js + Nginx)
         └─ Container: Fluent Bit (sidecar)
              ↓
         [Cloud SQL MySQL]
              ↓
         [Loki sur GKE]
              ↓
         [Grafana + Alerting]
```

**Services GCP** :
- **Cloud Run** : Application + Fluent Bit (multi-container)
- **Cloud SQL** : Base de données MySQL managée
- **GKE** : Cluster Kubernetes hébergeant Loki et Grafana

## Installation et démarrage

### Prérequis

- Docker version 20.10 ou supérieure
- Docker Compose version 2.0 ou supérieure

### Lancement de l'application

1. Cloner le dépôt
```bash
git clone <repository-url>
cd crud-api-tp
```

2. Créer et configurer le fichier `.env` (optionnel)
```bash
cp .env.example .env
# Ajuster les variables selon l'environnement
```

3. Démarrer les services
```bash
docker-compose up -d
```

4. Vérifier le bon fonctionnement
```bash
curl http://localhost/health
curl http://localhost/api/users
```

L'application est accessible sur http://localhost (port 80 par défaut)

## Documentation API

### URL de base
```
http://localhost/api
```

### Endpoints disponibles

| Méthode | Route | Description | Paramètres |
|---------|-------|-------------|------------|
| GET | /users | Récupère la liste des utilisateurs | - |
| GET | /users/:uuid | Récupère un utilisateur spécifique | uuid dans l'URL |
| POST | /users | Crée un nouvel utilisateur | fullname, study_level, age |
| PUT | /users/:uuid | Modifie un utilisateur existant | fullname, study_level, age |
| DELETE | /users/:uuid | Supprime un utilisateur | uuid dans l'URL |

### Endpoint de monitoring

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /health | Retourne l'état de l'API et de la connexion base de données |

## Exemples d'utilisation

### Création d'un utilisateur
```bash
curl -X POST http://localhost/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "fullname": "Jean Dupont",
    "study_level": "Master",
    "age": 24
  }'
```

### Récupération de tous les utilisateurs
```bash
curl http://localhost/api/users
```

### Mise à jour d'un utilisateur
```bash
curl -X PUT http://localhost/api/users/{uuid} \
  -H "Content-Type: application/json" \
  -d '{
    "fullname": "Jean Dupont",
    "study_level": "Doctorat",
    "age": 25
  }'
```

### Vérification de l'état de l'application
```bash
curl http://localhost/health
```

## Structure du projet

```
.
├── index.js                          Application Node.js principale
├── migrate.js                        Script de migration isolé
├── package.json                      Configuration et dépendances npm
├── .env                              Variables d'environnement
├── Dockerfile                        Image Docker de l'application
├── Dockerfile.migrate                Image Docker pour les migrations
├── Dockerfile.fluent-bit             Image Docker Fluent Bit personnalisée
├── docker-compose.yml                Orchestration locale des conteneurs
├── fluent-bit.conf                   Configuration Fluent Bit
├── parsers.conf                      Parsers JSON pour les logs
├── cloud-run-service.yaml            Configuration Cloud Run
├── nginx/
│   └── nginx-single-container.conf   Configuration Nginx
├── .github/
│   └── workflows/
│       └── cd.yml                    Pipeline GitHub Actions
├── README.md                         Documentation principale
├── README-CD.md                      Guide de déploiement complet
├── GITHUB-SECRETS-SETUP.md           Configuration des secrets GitHub
├── SECRETS-TO-COPY.md                Valeurs des secrets à copier
├── VERIFICATION-GUIDE.md             Guide de vérification
├── verify-before-deploy.sh           Script de vérification automatique
└── test-local.sh                     Tests d'intégration locaux
```

## Configuration

### Variables d'environnement

| Variable | Valeur par défaut | Description |
|----------|-------------------|-------------|
| NODE_ENV | production | Environnement d'exécution |
| APP_VERSION | 1.0.0 | Version de l'application |
| APP_PORT | 80 | Port HTTP externe de l'application |
| DB_ROOT_PASSWORD | rootpassword | Mot de passe root MariaDB |
| DB_NAME | crud_app | Nom de la base de données |
| DB_USER | crud_user | Utilisateur applicatif |
| DB_PASSWORD | crud_password | Mot de passe utilisateur |

Les valeurs par défaut peuvent être modifiées via un fichier `.env` à la racine du projet.

## Logs et observabilité

### Organisation des logs

Les logs sont organisés selon la structure suivante :

```
/var/logs/crud/
├── app.log          Logs de l'application au format JSON
├── access.log       Logs d'accès Nginx au format JSON
└── error.log        Logs d'erreur Nginx
```

### Consultation des logs

```bash
# Logs de l'application et Nginx (même conteneur)
docker-compose logs app

# Logs de la base de données
docker-compose logs db

# Suivre les logs en temps réel
docker-compose logs -f
```

### Accès direct aux fichiers de logs

```bash
# Consultation des logs applicatifs
docker exec crud_app cat /var/logs/crud/app.log

# Interface web (si activée)
curl http://localhost:8080/logs/
```

## Commandes utiles

### Gestion des services

```bash
# Démarrer l'application
docker-compose up -d

# Arrêter l'application
docker-compose down

# Redémarrer les services
docker-compose restart

# Reconstruire les images
docker-compose up -d --build

# Supprimer les volumes (attention : perte de données)
docker-compose down -v
```

### Débogage et maintenance

```bash
# Accéder au shell du conteneur applicatif
docker exec -it crud_app sh

# Connexion à la base de données
docker exec -it crud_db mysql -u root -p

# État des conteneurs
docker-compose ps

# Utilisation des ressources
docker stats
```

## Tests de validation

### Vérification des endpoints

Un script de test complet peut être exécuté :

```bash
# Création d'un utilisateur de test
curl -X POST http://localhost/api/users \
  -H "Content-Type: application/json" \
  -d '{"fullname":"Test User","study_level":"Licence","age":23}'

# Récupération de la liste
curl http://localhost/api/users

# Vérification du health check
curl http://localhost/health
```

### Points de validation

- Application accessible via le reverse proxy Nginx
- Persistance des données dans MariaDB
- Format JSON pour tous les logs
- Health check retournant le statut de tous les services
- Configuration via variables d'environnement fonctionnelle
- Redémarrage automatique des conteneurs en cas d'échec

## Déploiement en production

### Prérequis

1. **Compte Google Cloud Platform**
   - Projet GCP créé
   - Cloud SQL instance MySQL configurée
   - GKE avec Loki/Grafana déployé

2. **Compte Docker Hub**
   - Username et Access Token configurés


### Configuration des secrets GitHub

12 secrets doivent être configurés dans GitHub Actions :

```
DOCKERHUB_USERNAME, DOCKERHUB_TOKEN
GCP_PROJECT_ID, GCP_REGION, GCP_SA_KEY
DB_INSTANCE_NAME, DB_CONNECTION_NAME
DB_USER, DB_PASSWORD, DB_NAME
LOKI_URL, DISCORD_WEBHOOK_URL (optionnel)
```


### Déploiement automatique

Le déploiement se fait automatiquement via GitHub Actions :

```bash
# Créer un tag de version
git tag v1.0.0

# Pousser le tag (déclenche le pipeline)
git push origin v1.0.0
```

Le workflow GitHub Actions exécute automatiquement :
1. Build de 3 images Docker (API, Fluent Bit, Migration)
2. Push vers Docker Hub
3. Exécution des migrations sur Cloud SQL
4. Déploiement multi-container sur Cloud Run
5. Health check de validation

## Monitoring et observabilité

### Logs centralisés

Architecture de collecte des logs :

```
Application (JSON logs)
    → Fluent Bit (collecte)
    → Loki (stockage)
    → Grafana (visualisation)
```

**Configuration Fluent Bit** :
- Parser JSON personnalisé
- Filtres pour ne garder que message + context
- Labels dynamiques (job, environment, source)
- Envoi vers Loki via protocole HTTP

### Alerting

**Alertes configurées dans Grafana** :
- Déclenchement : Plus de 5 erreurs 404 en 1 minute
- Notification : Webhook Discord
- Résolution : Message vert après 1 minute sans erreur

**Requête LogQL** :
```logql
sum(count_over_time({job="crud-api"} | json | status="404" [1m]))
```

### Accès Grafana

```bash
# Récupérer l'IP externe de Grafana
kubectl get svc grafana-external -n ccm-monitoring

# Ouvrir dans le navigateur
# URL: http://IP_EXTERNE
# Login: admin / admin123
```

## Tests et validation

### Tests locaux

```bash
# Test de création d'utilisateur
curl -X POST http://localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"fullname":"Test User","study_level":"Master","age":24}'

# Vérification health check
curl http://localhost:8080/health

# Consultation des logs
docker logs crud_app
docker logs crud_fluent_bit
```

### Validation de la production

```bash
# Récupérer l'URL Cloud Run
gcloud run services describe crud-api \
  --region=europe-west1 \
  --format='value(status.url)'

# Tester l'API déployée
curl https://VOTRE-URL.run.app/health
curl https://VOTRE-URL.run.app/api/users
```

## Documentation technique

### Guides disponibles

- **[README-CD.md](README-CD.md)** : Guide complet du pipeline CD et configuration GCP
- **[GITHUB-SECRETS-SETUP.md](GITHUB-SECRETS-SETUP.md)** : Configuration détaillée des secrets GitHub
- **[SECRETS-TO-COPY.md](SECRETS-TO-COPY.md)** : Valeurs exactes des secrets à copier-coller
- **[VERIFICATION-GUIDE.md](VERIFICATION-GUIDE.md)** : Procédures de vérification avant déploiement

### Scripts utiles

- `get-secrets-values.sh` : Récupère automatiquement les valeurs des secrets GCP
- `verify-before-deploy.sh` : Vérification syntaxique et structurelle
- `test-local.sh` : Tests d'intégration complets avec Docker

## Technologies utilisées

**Backend** :
- Node.js 18
- Express.js
- MySQL2

**Infrastructure** :
- Docker & Docker Compose
- Nginx
- MariaDB 10.9 (local) / Cloud SQL MySQL 8.4 (production)

**Monitoring** :
- Fluent Bit 2.2
- Loki
- Grafana

**CI/CD** :
- GitHub Actions
- Google Cloud Run
- Google Cloud SQL
- Docker Hub

**Cloud** :
- Google Cloud Platform (GCP)
- Google Kubernetes Engine (GKE)

## Intégration CI/CD

Cette application implémente un pipeline complet de déploiement continu :

- Workflow GitHub Actions déclenché par tags Git
- Build automatique de 3 images Docker optimisées
- Gestion des migrations via Cloud SQL Proxy
- Déploiement multi-container sur Cloud Run
- Health checks pour validation automatique
- Rollback possible via versioning des images
- Configuration externalisée via variables d'environnement
- Logs structurés JSON pour observabilité
- Architecture stateless facilitant le scaling horizontal

## Troubleshooting

### Problèmes locaux (Docker Compose)

En cas de problème en local :

1. Vérifier les logs des conteneurs : `docker-compose logs -f`
2. Tester le health check : `curl http://localhost:8080/health`
3. Vérifier la configuration dans le fichier `.env`
4. S'assurer que le port 8080 n'est pas déjà utilisé
5. Vérifier l'espace disque disponible pour les volumes Docker
6. Attendre que la base de données soit complètement initialisée (healthcheck)
7. Vérifier que les migrations se sont exécutées : `docker logs crud_migration`

### Problèmes de déploiement

**GitHub Actions échoue** :
- Vérifier que tous les 12 secrets sont configurés
- Consulter les logs dans l'onglet Actions sur GitHub
- Vérifier les permissions du service account GCP

**Migrations échouent** :
```bash
# Tester la connexion Cloud SQL
gcloud sql connect mon-instance-mysql --user=crud_user

# Vérifier l'instance existe
gcloud sql instances list
```

**Cloud Run ne démarre pas** :
```bash
# Consulter les logs Cloud Run
gcloud run services logs read crud-api \
  --region=europe-west1 \
  --limit=50
```

**Logs n'arrivent pas dans Loki** :
```bash
# Vérifier logs Fluent Bit dans Cloud Run
gcloud run services logs read crud-api \
  --region=europe-west1 \
  --container=fluent-bit

# Tester connectivité Loki
curl http://IP_LOKI:3100/ready
```


