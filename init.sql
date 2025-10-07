-- Script d'initialisation de la base de données CRUD API

-- Création de la base de données si elle n'existe pas
CREATE DATABASE IF NOT EXISTS crud_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Utilisation de la base de données
USE crud_app;

-- Création de la table users avec contraintes et index
CREATE TABLE IF NOT EXISTS users (
    uuid VARCHAR(36) PRIMARY KEY COMMENT 'UUID unique de l\'utilisateur',
    fullname VARCHAR(255) NOT NULL COMMENT 'Nom complet de l\'utilisateur',
    study_level VARCHAR(255) NOT NULL COMMENT 'Niveau d\'études',
    age INT NOT NULL CHECK (age > 0 AND age <= 150) COMMENT 'Âge de l\'utilisateur',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Date de création',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Date de dernière modification'
) ENGINE=InnoDB COMMENT='Table des utilisateurs de l\'application CRUD';

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_users_fullname ON users(fullname);
CREATE INDEX IF NOT EXISTS idx_users_study_level ON users(study_level);
CREATE INDEX IF NOT EXISTS idx_users_age ON users(age);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Insertion de données de test (optionnel)
INSERT IGNORE INTO users (uuid, fullname, study_level, age) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Jean Dupont', 'Master', 25),
('550e8400-e29b-41d4-a716-446655440002', 'Marie Martin', 'Licence', 22),
('550e8400-e29b-41d4-a716-446655440003', 'Pierre Bernard', 'Doctorat', 28);

-- Affichage du résultat de l'initialisation
SELECT 'Base de données initialisée avec succès' AS message;
SELECT COUNT(*) AS nombre_utilisateurs FROM users;