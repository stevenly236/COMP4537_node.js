const http = require('http');
const mysql = require('mysql2/promise');
const url = require('url');
require('dotenv').config();

class DatabaseServer {
    constructor() {
        this.dbConfig = {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 25060,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            ssl: {
                rejectUnauthorized: false
            },
            connectTimeout: 60000,
            waitForConnections: true,
            connectionLimit: 10
        };
        
        this.sampleData = [
            ['Sara Brown', '1901-01-01'],
            ['John Smith', '1941-01-01'],
            ['Jack Ma', '1961-01-30'],
            ['Elon Musk', '1999-01-01']
        ];
    }

    async initializeDatabase() {
        try {
            console.log('Attempting to connect to database...');
            const connection = await mysql.createConnection(this.dbConfig);
            
            await connection.query(`
                CREATE TABLE IF NOT EXISTS patient (
                    patientid INT(11) AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100),
                    dateOfBirth DATETIME
                ) ENGINE=InnoDB;
            `);

            await connection.end();
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Database initialization error:', error);
            throw error;
        }
    }

    async handleRequest(req, res) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        const parsedUrl = url.parse(req.url, true);

        try {
            switch(parsedUrl.pathname.replace(/\/+$/, '')) {
                case '/insert':
                    if (req.method === 'POST') {
                        await this.handleInsertSampleData(res);
                    }
                    break;
                case '/query':
                    if (req.method === 'GET') {
                        await this.handleQuery(parsedUrl.query.query, res);
                    } else if (req.method === 'POST') {
                        await this.handlePostQuery(req, res);
                    }
                    break;
                default:
                    this.sendResponse(res, 404, { error: 'Not found' });
            }
        } catch (error) {
            this.sendResponse(res, 500, { error: error.message });
        }
    }

    async handleInsertSampleData(res) {
        const connection = await mysql.createConnection(this.dbConfig);
        try {
            await this.ensureTableExists(connection);
    
            const values = this.sampleData.map(([name, dob]) => [name, dob]);
            await connection.query(
                'INSERT INTO patient (name, dateOfBirth) VALUES ?', 
                [values]
            );
    
            this.sendResponse(res, 200, { message: 'Sample data inserted successfully' });
        } catch (error) {
            this.sendResponse(res, 500, { error: error.message });
        } finally {
            await connection.end();
        }
    }
    

    async handleQuery(query, res) {
        if (!query) {
            this.sendResponse(res, 400, { error: 'Query is required' });
            return;
        }
    
        if (!this.isValidQuery(query)) {
            this.sendResponse(res, 400, { error: 'Invalid query. Only SELECT and INSERT queries are allowed' });
            return;
        }
    
        const connection = await mysql.createConnection(this.dbConfig);
        try {
            await this.ensureTableExists(connection);
    
            const [results] = await connection.query(query);
            this.sendResponse(res, 200, { results });
        } catch (error) {
            this.sendResponse(res, 500, { error: error.message });
        } finally {
            await connection.end();
        }
    }
    

    async handlePostQuery(req, res) {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
            try {
                const { query } = JSON.parse(body);
                if (!this.isValidQuery(query)) {
                    this.sendResponse(res, 400, { error: 'Invalid query. Only INSERT queries are allowed' });
                    return;
                }

                const connection = await mysql.createConnection(this.dbConfig);
                try {
                    const [results] = await connection.query(query);
                    this.sendResponse(res, 200, { results });
                } catch (error) {
                    this.sendResponse(res, 500, { error: error.message });
                } finally {
                    await connection.end();
                }
            } catch (error) {
                this.sendResponse(res, 400, { error: 'Invalid request body' });
            }
        });
    }

    isValidQuery(query) {
        const upperQuery = query.toUpperCase().trim();
        const disallowedKeywords = ['DROP', 'DELETE', 'UPDATE', 'TRUNCATE', 'ALTER'];
        
        if (upperQuery.startsWith('SELECT')) {
            return !disallowedKeywords.some(keyword => upperQuery.includes(keyword));
        }
        if (upperQuery.startsWith('INSERT INTO patient')) {
            return !disallowedKeywords.some(keyword => upperQuery.includes(keyword));
        }
        return false;
    }

    async ensureTableExists(connection) {
        await connection.query(`
            CREATE TABLE IF NOT EXISTS patient (
                patientid INT(11) AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100),
                dateOfBirth DATETIME
            ) ENGINE=InnoDB;
        `);
    }
    

    sendResponse(res, statusCode, data) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }
}

const server = new DatabaseServer();
server.initializeDatabase()
    .then(() => {
        http.createServer((req, res) => server.handleRequest(req, res))
            .listen(3000, () => console.log('Server running on port 3000'));
    })
    .catch(error => {
        console.error('Failed to start server:', error);
        process.exit(1);
    });

    // chat-gpt helped 