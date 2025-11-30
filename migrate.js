const mysql = require('mysql2/promise');

// Configuration de la base de données depuis les variables d'environnement
const dbConfig = {
	host: process.env.DB_HOST || 'db',
	user: process.env.DB_USER || 'root',
	password: process.env.DB_PASSWORD || 'rootpassword',
	database: process.env.DB_NAME || 'crud_app'
};

async function runMigrations() {
	let connection;

	try {
		console.log('🚀 Démarrage des migrations de base de données...');
		console.log(`📍 Connexion à ${dbConfig.host}/${dbConfig.database}`);

		// Créer une connexion
		connection = await mysql.createConnection(dbConfig);

		console.log('✅ Connexion à la base de données établie');

		// Migration 1: Créer la table users
		console.log('📝 Migration: Création de la table users...');
		await connection.execute(`
			CREATE TABLE IF NOT EXISTS users (
				uuid VARCHAR(36) PRIMARY KEY,
				fullname VARCHAR(255) NOT NULL,
				study_level VARCHAR(255) NOT NULL,
				age INT NOT NULL,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
			)
		`);
		console.log('✅ Table users créée ou déjà existante');

		// Vérifier que la table existe bien
		const [tables] = await connection.execute(
			"SHOW TABLES LIKE 'users'"
		);

		if (tables.length === 0) {
			throw new Error('La table users n\'a pas été créée correctement');
		}

		// Vérifier le nombre d'enregistrements
		const [rows] = await connection.execute('SELECT COUNT(*) as count FROM users');
		console.log(`📊 Nombre d'utilisateurs dans la base: ${rows[0].count}`);

		console.log('✅ Toutes les migrations ont été exécutées avec succès');

		// Fermer la connexion
		await connection.end();

		// Sortir avec code succès
		process.exit(0);

	} catch (error) {
		console.error('❌ Erreur lors de l\'exécution des migrations:', error.message);
		console.error('Stack trace:', error.stack);

		if (connection) {
			await connection.end();
		}

		// Sortir avec code erreur
		process.exit(1);
	}
}

// Attendre quelques secondes pour que la base de données soit prête
async function waitForDatabase() {
	const maxRetries = 30;
	const retryDelay = 2000; // 2 secondes

	for (let i = 1; i <= maxRetries; i++) {
		try {
			console.log(`⏳ Tentative ${i}/${maxRetries} de connexion à la base de données...`);
			const connection = await mysql.createConnection(dbConfig);
			await connection.execute('SELECT 1');
			await connection.end();
			console.log('✅ Base de données prête !');
			return true;
		} catch (error) {
			if (i === maxRetries) {
				console.error('❌ Impossible de se connecter à la base de données après', maxRetries, 'tentatives');
				throw error;
			}
			console.log(`⏳ Base de données pas encore prête, nouvelle tentative dans ${retryDelay/1000}s...`);
			await new Promise(resolve => setTimeout(resolve, retryDelay));
		}
	}
}

// Point d'entrée principal
async function main() {
	console.log('='.repeat(60));
	console.log('🔧 SERVICE DE MIGRATION DE BASE DE DONNÉES');
	console.log('='.repeat(60));

	await waitForDatabase();
	await runMigrations();
}

main();
