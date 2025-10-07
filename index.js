const express = require('express');
const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Configuration base de données via variables d'environnement
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'crud_app',
    port: process.env.DB_PORT || 3306
};

// Pool de connexions
let pool;

// Système de logging
const LOG_DIR = '/var/logs/crud';

// Créer le répertoire de logs s'il n'existe pas
async function ensureLogDirectory() {
    try {
        await fs.mkdir(LOG_DIR, { recursive: true });
    } catch (error) {
        console.error('Erreur création répertoire logs:', error);
    }
}

// Fonction de logging
async function writeLog(level, message, context = {}) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        level: level,
        message: message,
        context: context
    };
    
    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
        await fs.appendFile(path.join(LOG_DIR, 'app.log'), logLine);
        console.log(JSON.stringify(logEntry));
    } catch (error) {
        console.error('Erreur écriture log:', error);
    }
}

// Initialisation de la base de données
async function initDatabase() {
    try {
        pool = mysql.createPool(dbConfig);

        // Test de connexion
        const connection = await pool.getConnection();
        connection.release();

        // Création de la table users si elle n'existe pas
        await pool.execute(`
            CREATE TABLE IF NOT EXISTS users (
                uuid VARCHAR(36) PRIMARY KEY,
                fullname VARCHAR(255) NOT NULL,
                study_level VARCHAR(255) NOT NULL,
                age INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

        await writeLog('INFO', 'Base de données initialisée avec succès', { 
            host: dbConfig.host, 
            database: dbConfig.database 
        });
    } catch (error) {
        await writeLog('ERROR', 'Erreur initialisation DB', { error: error.message });
        throw error;
    }
}

// Validation des données utilisateur
function validateUser(userData) {
    const { fullname, study_level, age } = userData;
    
    // Vérifier que tous les champs requis sont présents
    if (!fullname || !study_level || age === undefined) {
        return {
            valid: false,
            error: 'Les champs fullname, study_level et age sont requis'
        };
    }
    
    // Vérifier que fullname et study_level ne sont pas vides
    if (typeof fullname !== 'string' || fullname.trim() === '') {
        return {
            valid: false,
            error: 'Le champ fullname doit être une chaîne non vide'
        };
    }
    
    if (typeof study_level !== 'string' || study_level.trim() === '') {
        return {
            valid: false,
            error: 'Le champ study_level doit être une chaîne non vide'
        };
    }
    
    // Vérifier que age est un nombre positif
    if (typeof age !== 'number' || !Number.isInteger(age) || age <= 0) {
        return {
            valid: false,
            error: 'Le champ age doit être un nombre entier positif'
        };
    }
    
    // Vérifier que l'âge est dans une plage raisonnable
    if (age > 150) {
        return {
            valid: false,
            error: 'L\'âge doit être inférieur à 150 ans'
        };
    }
    
    return { valid: true };
}

// Routes API

// GET /api/users
app.get('/api/users', async (req, res) => {
    try {
        await writeLog('INFO', 'Récupération de tous les utilisateurs', { 
            endpoint: '/api/users',
            method: 'GET'
        });
        
        const [rows] = await pool.execute('SELECT * FROM users ORDER BY created_at DESC');
        
        await writeLog('INFO', 'Utilisateurs récupérés avec succès', { 
            count: rows.length 
        });
        
        res.status(200).json({
            success: true,
            data: rows,
            count: rows.length
        });
        
    } catch (error) {
        await writeLog('ERROR', 'Erreur lors de la récupération des utilisateurs', { 
            error: error.message 
        });
        res.status(500).json({ 
            success: false, 
            error: 'Erreur interne du serveur' 
        });
    }
});

// GET /api/users/:uuid
app.get('/api/users/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        
        await writeLog('INFO', 'Récupération d\'un utilisateur par UUID', { 
            endpoint: '/api/users/:uuid',
            method: 'GET',
            uuid: uuid
        });
        
        const [rows] = await pool.execute('SELECT * FROM users WHERE uuid = ?', [uuid]);

        if (rows.length === 0) {
            await writeLog('WARN', 'Utilisateur non trouvé', { uuid: uuid });
            return res.status(404).json({ 
                success: false, 
                error: 'Utilisateur non trouvé' 
            });
        }

        await writeLog('INFO', 'Utilisateur récupéré avec succès', { 
            uuid: uuid,
            fullname: rows[0].fullname
        });
        
        res.status(200).json({
            success: true,
            data: rows[0]
        });
        
    } catch (error) {
        await writeLog('ERROR', 'Erreur lors de la récupération de l\'utilisateur', { 
            error: error.message,
            uuid: req.params.uuid
        });
        res.status(500).json({ 
            success: false, 
            error: 'Erreur interne du serveur' 
        });
    }
});

// POST /api/users
app.post('/api/users', async (req, res) => {
    try {
        const { fullname, study_level, age } = req.body;

        await writeLog('INFO', 'Création d\'un nouvel utilisateur', { 
            endpoint: '/api/users',
            method: 'POST',
            data: { fullname, study_level, age }
        });

        // Validation des données
        const validation = validateUser({ fullname, study_level, age });
        if (!validation.valid) {
            await writeLog('WARN', 'Validation des données échouée', { 
                error: validation.error,
                data: { fullname, study_level, age }
            });
            return res.status(400).json({ 
                success: false, 
                error: validation.error 
            });
        }

        const uuid = uuidv4();

        await pool.execute(
            'INSERT INTO users (uuid, fullname, study_level, age) VALUES (?, ?, ?, ?)',
            [uuid, fullname.trim(), study_level.trim(), age]
        );

        const newUser = { uuid, fullname: fullname.trim(), study_level: study_level.trim(), age };
        
        await writeLog('INFO', 'Utilisateur créé avec succès', { 
            uuid: uuid,
            fullname: fullname.trim()
        });
        
        res.status(201).json({
            success: true,
            data: newUser,
            message: 'Utilisateur créé avec succès'
        });

    } catch (error) {
        await writeLog('ERROR', 'Erreur lors de la création de l\'utilisateur', { 
            error: error.message,
            data: req.body
        });
        res.status(500).json({ 
            success: false, 
            error: 'Erreur interne du serveur' 
        });
    }
});

// PUT /api/users/:uuid
app.put('/api/users/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;
        const { fullname, study_level, age } = req.body;

        await writeLog('INFO', 'Mise à jour d\'un utilisateur', { 
            endpoint: '/api/users/:uuid',
            method: 'PUT',
            uuid: uuid,
            data: { fullname, study_level, age }
        });

        // Validation des données
        const validation = validateUser({ fullname, study_level, age });
        if (!validation.valid) {
            await writeLog('WARN', 'Validation des données échouée pour la mise à jour', { 
                error: validation.error,
                uuid: uuid
            });
            return res.status(400).json({ 
                success: false, 
                error: validation.error 
            });
        }

        // Vérifier que l'utilisateur existe
        const [existingUser] = await pool.execute('SELECT * FROM users WHERE uuid = ?', [uuid]);
        if (existingUser.length === 0) {
            await writeLog('WARN', 'Tentative de mise à jour d\'un utilisateur inexistant', { 
                uuid: uuid 
            });
            return res.status(404).json({ 
                success: false, 
                error: 'Utilisateur non trouvé' 
            });
        }

        const [result] = await pool.execute(
            'UPDATE users SET fullname = ?, study_level = ?, age = ? WHERE uuid = ?',
            [fullname.trim(), study_level.trim(), age, uuid]
        );

        const updatedUser = { uuid, fullname: fullname.trim(), study_level: study_level.trim(), age };
        
        await writeLog('INFO', 'Utilisateur mis à jour avec succès', { 
            uuid: uuid,
            fullname: fullname.trim()
        });
        
        res.status(200).json({
            success: true,
            data: updatedUser,
            message: 'Utilisateur mis à jour avec succès'
        });

    } catch (error) {
        await writeLog('ERROR', 'Erreur lors de la mise à jour de l\'utilisateur', { 
            error: error.message,
            uuid: req.params.uuid
        });
        res.status(500).json({ 
            success: false, 
            error: 'Erreur interne du serveur' 
        });
    }
});

// DELETE /api/users/:uuid
app.delete('/api/users/:uuid', async (req, res) => {
    try {
        const { uuid } = req.params;

        await writeLog('INFO', 'Suppression d\'un utilisateur', { 
            endpoint: '/api/users/:uuid',
            method: 'DELETE',
            uuid: uuid
        });

        const [result] = await pool.execute('DELETE FROM users WHERE uuid = ?', [uuid]);

        if (result.affectedRows === 0) {
            await writeLog('WARN', 'Tentative de suppression d\'un utilisateur inexistant', { 
                uuid: uuid 
            });
            return res.status(404).json({ 
                success: false, 
                error: 'Utilisateur non trouvé' 
            });
        }

        await writeLog('INFO', 'Utilisateur supprimé avec succès', { 
            uuid: uuid 
        });

        res.status(200).json({ 
            success: true,
            message: 'Utilisateur supprimé avec succès' 
        });

    } catch (error) {
        await writeLog('ERROR', 'Erreur lors de la suppression de l\'utilisateur', { 
            error: error.message,
            uuid: req.params.uuid
        });
        res.status(500).json({ 
            success: false, 
            error: 'Erreur interne du serveur' 
        });
    }
});

// GET /health
app.get('/health', async (req, res) => {
    try {
        await writeLog('INFO', 'Health check demandé', { 
            endpoint: '/health',
            method: 'GET'
        });

        let dbStatus = 'OK';
        let dbMessage = 'Connexion réussie';
        
        try {
            // Tester la connexion à la base de données
            const connection = await pool.getConnection();
            await connection.ping();
            connection.release();
        } catch (dbError) {
            dbStatus = 'ERROR';
            dbMessage = dbError.message;
            await writeLog('ERROR', 'Erreur de connexion à la base de données', { 
                error: dbError.message 
            });
        }

        const healthData = {
            status: dbStatus === 'OK' ? 'OK' : 'ERROR',
            timestamp: new Date().toISOString(),
            services: {
                api: 'OK',
                database: {
                    status: dbStatus,
                    message: dbMessage
                }
            },
            version: process.env.APP_VERSION || '1.0.0'
        };

        const statusCode = dbStatus === 'OK' ? 200 : 503;
        
        await writeLog('INFO', 'Health check terminé', { 
            status: healthData.status,
            database_status: dbStatus
        });

        res.status(statusCode).json(healthData);
        
    } catch (error) {
        await writeLog('ERROR', 'Erreur lors du health check', { 
            error: error.message 
        });
        res.status(500).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            message: 'Erreur interne du serveur'
        });
    }
});

// Middleware de gestion des routes non trouvées
app.use('*', (req, res) => {
    writeLog('WARN', 'Route non trouvée', { 
        method: req.method,
        path: req.originalUrl
    });
    res.status(404).json({ 
        success: false, 
        error: 'Route non trouvée' 
    });
});

// Middleware de gestion des erreurs globales
app.use((error, req, res, next) => {
    writeLog('ERROR', 'Erreur non gérée', { 
        error: error.message,
        stack: error.stack,
        method: req.method,
        path: req.originalUrl
    });
    res.status(500).json({ 
        success: false, 
        error: 'Erreur interne du serveur' 
    });
});

// Point d'entrée de l'application
app.listen(PORT, async () => {
    try {
        await ensureLogDirectory();
        await initDatabase();
        
        await writeLog('INFO', 'Serveur démarré avec succès', { 
            port: PORT,
            environment: process.env.NODE_ENV || 'development'
        });
        
        console.log(`Serveur démarré sur le port ${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/health`);
        console.log(`API Users: http://localhost:${PORT}/api/users`);
        
    } catch (error) {
        console.error('Erreur lors du démarrage:', error);
        process.exit(1);
    }
});

// Gestion propre de l'arrêt de l'application
process.on('SIGTERM', async () => {
    await writeLog('INFO', 'Arrêt du serveur demandé (SIGTERM)');
    if (pool) {
        await pool.end();
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    await writeLog('INFO', 'Arrêt du serveur demandé (SIGINT)');
    if (pool) {
        await pool.end();
    }
    process.exit(0);
});