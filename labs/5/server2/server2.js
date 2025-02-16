require('dotenv').config();

const http = require('http');
const mysql = require('mysql2/promise');
const url = require('url');
const { serverMessages } = require('./lang/messages/en/user.js');

class DatabaseServer {
    constructor() {
        this.dbConfig = {
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT || 25060,
            ssl: {
                rejectUnauthorized: true
            }
        };
        
        this.sampleData = [
            ['Sara Brown', '1901-01-01'],
            ['John Smith', '1941-01-01'],
            ['Jack Ma', '1961-01-30'],
            ['Elon Musk', '1999-01-01']
        ];
    }

    async initializeDatabase() {
        const connection = await mysql.createConnection({
            ...this.dbConfig,
            multipleStatements: true
        });

        try {
            await connection.query(`
                CREATE DATABASE IF NOT EXISTS patient_db;
                USE patient_db;
                CREATE TABLE IF NOT EXISTS patient (
                    patientid INT(11) AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100),
                    dateOfBirth DATETIME
                ) ENGINE=InnoDB;
            `);
            console.log(serverMessages.SUCCESS_DB_INIT);
        } catch (error) {
            console.error(`${serverMessages.ERROR_DB_INIT} ${error.message}`);
        } finally {
            await connection.end();
        }
    }

    async handleRequest(req, res) {
        const parsedUrl = url.parse(req.url, true);
        
        res.setHeader('Access-Control-Allow-Origin', 'http://your-client-url:8080');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        try {
            if (parsedUrl.pathname === '/insert' && req.method === 'POST') {
                await this.handleInsertSampleData(req, res);
            } else if (parsedUrl.pathname === '/query') {
                if (req.method === 'GET') {
                    await this.handleQuery(parsedUrl.query.query, res);
                } else if (req.method === 'POST') {
                    await this.handlePostQuery(req, res);
                }
            } else {
                this.sendResponse(res, 404, { error: serverMessages.ERROR_NOT_FOUND });
            }
        } catch (error) {
            this.sendResponse(res, 500, { error: error.message });
        }
    }

    async handleInsertSampleData(req, res) {
        const connection = await mysql.createConnection(this.dbConfig);
        try {
            const values = this.sampleData.map(([name, dob]) => [name, dob]);
            await connection.query(
                'INSERT INTO patient (name, dateOfBirth) VALUES ?',
                [values]
            );
            this.sendResponse(res, 200, { message: serverMessages.SUCCESS_INSERT });
        } catch (error) {
            this.sendResponse(res, 500, { error: `${serverMessages.ERROR_QUERY_EXECUTION} ${error.message}` });
        } finally {
            await connection.end();
        }
    }

    async handleQuery(query, res) {
        if (!query) {
            this.sendResponse(res, 400, { error: serverMessages.ERROR_QUERY_REQUIRED });
            return;
        }

        if (!this.isValidQuery(query)) {
            this.sendResponse(res, 400, { error: serverMessages.ERROR_INVALID_QUERY });
            return;
        }

        const connection = await mysql.createConnection(this.dbConfig);
        try {
            const [results] = await connection.query(query);
            this.sendResponse(res, 200, { results });
        } catch (error) {
            this.sendResponse(res, 500, { error: `${serverMessages.ERROR_QUERY_EXECUTION} ${error.message}` });
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
        if (upperQuery.startsWith('SELECT')) {
            return !upperQuery.includes('DROP') && 
                   !upperQuery.includes('DELETE') && 
                   !upperQuery.includes('UPDATE');
        }
        if (upperQuery.startsWith('INSERT')) {
            return !upperQuery.includes('DROP') && 
                   !upperQuery.includes('DELETE') && 
                   !upperQuery.includes('UPDATE');
        }
        return false;
    }

    sendResponse(res, statusCode, data) {
        res.writeHead(statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
    }
}

const server = new DatabaseServer();
server.initializeDatabase().then(() => {
    http.createServer((req, res) => server.handleRequest(req, res))
        .listen(3000, () => console.log(`${serverMessages.SUCCESS_SERVER_START} 3000`));
});