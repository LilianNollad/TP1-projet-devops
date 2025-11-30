# 🔐 Configuration des Secrets GitHub - Guide Complet

## 📍 URL de configuration

Allez sur cette page :
```
https://github.com/LilianNollad/TP1-projet-devops/settings/secrets/actions
```

Cliquez sur **"New repository secret"** pour chaque secret ci-dessous.

---

## 📋 Secrets à configurer

### 1️⃣ DOCKERHUB_USERNAME
**Nom** : `DOCKERHUB_USERNAME`
**Valeur** : `VOTRE_NOM_UTILISATEUR_DOCKERHUB`
**Exemple** : `liliannollad` ou `johndoe`

> ⚠️ **Action requise** : Remplacez par votre vrai nom d'utilisateur Docker Hub

---

### 2️⃣ DOCKERHUB_TOKEN
**Nom** : `DOCKERHUB_TOKEN`
**Valeur** : `VOTRE_TOKEN_DOCKERHUB`

**Comment obtenir ce token :**
1. Allez sur https://hub.docker.com/settings/security
2. Cliquez sur **"New Access Token"**
3. Nom du token : `GitHub Actions`
4. Permissions : **Read, Write, Delete**
5. Cliquez sur **"Generate"**
6. **COPIEZ LE TOKEN** (il ne sera affiché qu'une seule fois !)
7. Collez-le dans GitHub Secrets

---

### 3️⃣ GCP_PROJECT_ID
**Nom** : `GCP_PROJECT_ID`
**Valeur** : `VOTRE_PROJECT_ID_GCP`

**Comment obtenir votre Project ID :**
```bash
# Dans votre terminal (Git Bash ou WSL)
gcloud config get-value project
```

Ou allez sur https://console.cloud.google.com/ et copiez le **Project ID** (pas le nom du projet).

---

### 4️⃣ GCP_REGION
**Nom** : `GCP_REGION`
**Valeur** : `europe-west1`

> ✅ Utilisez la région la plus proche de vous (europe-west1 pour l'Europe)

---

### 5️⃣ GCP_SA_KEY
**Nom** : `GCP_SA_KEY`
**Valeur** : Contenu complet du fichier JSON du service account

**Comment créer ce service account :**
```bash
# 1. Définir vos variables
export GCP_PROJECT_ID=$(gcloud config get-value project)

# 2. Créer le service account
gcloud iam service-accounts create github-actions-sa \
  --display-name="GitHub Actions Service Account"

# 3. Donner les permissions nécessaires
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:github-actions-sa@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:github-actions-sa@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:github-actions-sa@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:github-actions-sa@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.admin"

# 4. Générer la clé JSON
gcloud iam service-accounts keys create gcp-sa-key.json \
  --iam-account=github-actions-sa@$GCP_PROJECT_ID.iam.gserviceaccount.com

# 5. Afficher le contenu (à copier dans GitHub)
cat gcp-sa-key.json
```

**IMPORTANT** : Copiez **TOUT LE CONTENU** du fichier JSON (de `{` à `}` inclus)

---

### 6️⃣ DB_INSTANCE_NAME
**Nom** : `DB_INSTANCE_NAME`
**Valeur** : `VOTRE_NOM_INSTANCE_CLOUD_SQL`

**Comment obtenir le nom :**
```bash
gcloud sql instances list --format="value(name)"
```

**Exemple** : `mon-instance-mysql` ou `crud-db-instance`

> ⚠️ **Si vous n'avez pas encore créé l'instance**, voir la section "Créer Cloud SQL" ci-dessous

---

### 7️⃣ DB_CONNECTION_NAME
**Nom** : `DB_CONNECTION_NAME`
**Valeur** : Format `PROJECT_ID:REGION:INSTANCE_NAME`

**Comment obtenir cette valeur :**
```bash
gcloud sql instances describe VOTRE_INSTANCE_NAME \
  --format='value(connectionName)'
```

**Exemple** : `mon-projet-123456:europe-west1:mon-instance-mysql`

---

### 8️⃣ DB_USER
**Nom** : `DB_USER`
**Valeur** : `crud_user`

> ✅ Cette valeur est déjà correcte (correspond à votre .env local)

---

### 9️⃣ DB_PASSWORD
**Nom** : `DB_PASSWORD`
**Valeur** : `crud_password123`

> ✅ Cette valeur est déjà correcte (correspond à votre .env local)

---

### 🔟 DB_NAME
**Nom** : `DB_NAME`
**Valeur** : `crud_app`

> ✅ Cette valeur est déjà correcte (correspond à votre .env local)

---

### 1️⃣1️⃣ LOKI_URL
**Nom** : `LOKI_URL`
**Valeur** : `34.79.17.22`

> ✅ Cette valeur est déjà correcte (correspond à votre IP Loki actuelle)

---

### 1️⃣2️⃣ DISCORD_WEBHOOK_URL (Optionnel)
**Nom** : `DISCORD_WEBHOOK_URL`
**Valeur** : `https://discord.com/api/webhooks/...`

> ⚠️ Optionnel - Seulement si vous voulez des notifications Discord

---

## 🗄️ Créer Cloud SQL (si pas encore fait)

```bash
# 1. Définir vos variables
export GCP_PROJECT_ID=$(gcloud config get-value project)
export GCP_REGION="europe-west1"
export DB_INSTANCE_NAME="crud-db-instance"

# 2. Activer l'API Cloud SQL
gcloud services enable sqladmin.googleapis.com

# 3. Créer l'instance Cloud SQL
gcloud sql instances create $DB_INSTANCE_NAME \
  --database-version=MYSQL_8_4 \
  --tier=db-f1-micro \
  --region=$GCP_REGION \
  --storage-type=SSD \
  --storage-size=10 \
  --root-password='rootpassword123'

# 4. Créer la base de données
gcloud sql databases create crud_app \
  --instance=$DB_INSTANCE_NAME

# 5. Créer l'utilisateur
gcloud sql users create crud_user \
  --instance=$DB_INSTANCE_NAME \
  --password='crud_password123'

# 6. Récupérer le connection name
gcloud sql instances describe $DB_INSTANCE_NAME \
  --format='value(connectionName)'
```

---

## 🔐 Créer Service Account pour Cloud Run

```bash
export GCP_PROJECT_ID=$(gcloud config get-value project)

# Créer le service account
gcloud iam service-accounts create cloud-run-sa \
  --display-name="Cloud Run Service Account"

# Permissions pour Cloud SQL
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:cloud-run-sa@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

# Permissions pour les secrets
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:cloud-run-sa@$GCP_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## ✅ Checklist finale

Avant de pousser sur GitHub, vérifiez que vous avez configuré :

- [ ] `DOCKERHUB_USERNAME` ✅
- [ ] `DOCKERHUB_TOKEN` ✅
- [ ] `GCP_PROJECT_ID` ✅
- [ ] `GCP_REGION` ✅
- [ ] `GCP_SA_KEY` ✅
- [ ] `DB_INSTANCE_NAME` ✅
- [ ] `DB_CONNECTION_NAME` ✅
- [ ] `DB_USER` ✅
- [ ] `DB_PASSWORD` ✅
- [ ] `DB_NAME` ✅
- [ ] `LOKI_URL` ✅
- [ ] `DISCORD_WEBHOOK_URL` (optionnel)

---

## 🚀 Après configuration des secrets

Une fois tous les secrets configurés :

```bash
cd "C:\Users\lilia\Documents\M1 CCM\CI CD\TP1"

# Commiter et pousser
git add .
git commit -m "feat: pipeline CD complet avec monitoring"

# Créer un tag
git tag v1.0.0

# Pousser (déclenche le déploiement)
git push origin main
git push origin v1.0.0
```

Le workflow GitHub Actions va automatiquement :
1. ✅ Builder les 3 images Docker
2. ✅ Les pousser sur Docker Hub
3. ✅ Exécuter les migrations sur Cloud SQL
4. ✅ Déployer sur Cloud Run
5. ✅ Tester le health check

---

## 📞 En cas de problème

Si le workflow échoue, vérifiez :
1. Tous les secrets sont bien configurés dans GitHub
2. Le service account a les bonnes permissions
3. Cloud SQL est bien créé et accessible
4. Les logs dans l'onglet "Actions" sur GitHub

**Bon déploiement ! 🎉**
