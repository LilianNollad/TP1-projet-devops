# API CRUD - TP DevOps CI/CD

Application REST développée dans le cadre du TP sur l'intégration continue et le monitoring. Cette API permet la gestion complète d'utilisateurs avec une architecture conteneurisée prête pour la production.

## Fonctionnalités

L'application implémente les fonctionnalités suivantes :

- API REST complète pour les opérations CRUD sur les utilisateurs
- Base de données MariaDB avec migrations automatiques
- Reverse proxy Nginx avec logs au format JSON
- Containerisation via Docker et Docker Compose
- Endpoint de monitoring pour la supervision de l'état de l'application
- Système de logs structuré pour l'application et l'infrastructure
- Validation des données en entrée et gestion appropriée des erreurs

## Architecture

L'architecture suit les spécifications du TP avec deux services :

```
Client → [Conteneur App: Nginx + Node.js] → [Conteneur DB: MariaDB]
                    ↓            ↓
               Logs Nginx   Logs Application
```

- **Service app** : Nginx et Application Node.js dans le même conteneur
- **Service db** : MariaDB dans un conteneur dédié

**Note** : Cette architecture respecte les exigences du cahier des charges qui demande explicitement "votre application + Nginx (dans le même conteneur)".

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
├── index.js                 Application Node.js principale
├── package.json             Configuration et dépendances npm
├── Dockerfile               Configuration de l'image Docker
├── docker-compose.yml       Orchestration des conteneurs
├── init.sql                 Scripts de migration de la base de données
├── nginx/
│   ├── nginx.conf          Configuration principale Nginx
│   └── conf.d/
│       └── default.conf    Configuration du virtual host
└── README.md               Documentation du projet
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

## Intégration CI/CD

Cette application est structurée pour s'intégrer dans un pipeline d'intégration continue :

- Health checks pour la validation du déploiement
- Images Docker optimisées pour la production
- Configuration externalisée via variables d'environnement
- Logs structurés pour l'observabilité et le monitoring
- Architecture stateless facilitant le scaling horizontal

## Troubleshooting

En cas de problème :

1. Vérifier les logs des conteneurs : `docker-compose logs -f`
2. Tester le health check : `curl http://localhost/health`
3. Vérifier la configuration dans le fichier `.env`
4. S'assurer que le port 80 n'est pas déjà utilisé
5. Vérifier l'espace disque disponible pour les volumes Docker
6. Attendre que la base de données soit complètement initialisée (healthcheck)
