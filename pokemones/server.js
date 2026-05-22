const http = require('http');

const mysql = require('mysql2/promise');

const url = require('url');

const fs = require('fs');

const path = require('path');

// ========================================
// PORT
// ========================================

const PORT =
    process.env.PORT || 10000;

// ========================================
// MYSQL AIVEN
// ========================================

const pool = mysql.createPool({

    host:
        'mysql-68cfa5b-pokemon.a.aivencloud.com',

    user:
        'avnadmin',

    password:
        'AVNS_mGAvK97g1YIoDQpXXZw',

    database:
        'defaultdb',

    port:
        12160,

    ssl: {
        rejectUnauthorized: false
    },

    waitForConnections: true,

    connectionLimit: 10,

    queueLimit: 0,

    connectTimeout: 10000
});

// ========================================
// SEND JSON
// ========================================

function sendJSON(
    res,
    statusCode,
    data
) {

    res.writeHead(statusCode, {

        'Content-Type':
            'application/json; charset=utf-8',

        'Access-Control-Allow-Origin':
            '*',

        'Access-Control-Allow-Methods':
            'GET, POST, PUT, DELETE, OPTIONS',

        'Access-Control-Allow-Headers':
            'Content-Type'
    });

    res.end(
        JSON.stringify(data)
    );
}

// ========================================
// INIT DATABASE
// ========================================

async function initDB() {

    let connection;

    try {

        connection =
            await pool.getConnection();

        console.log(
            'Connected to MySQL Aiven'
        );

        // ========================================
        // CREATE TABLE
        // ========================================

        await connection.query(`

            CREATE TABLE IF NOT EXISTS pokemon (

                id INT PRIMARY KEY AUTO_INCREMENT,

                nombre VARCHAR(100) NOT NULL,

                altura DECIMAL(5,2),

                peso DECIMAL(5,2),

                habilidades JSON,

                imagen_frontal TEXT,

                imagen_trasera TEXT

            )

        `);

        // ========================================
        // VERIFY DATA
        // ========================================

        const [rows] =
            await connection.query(`

                SELECT COUNT(*) AS total

                FROM pokemon

            `);

        // ========================================
        // INSERT DATA
        // ========================================

        if (rows[0].total === 0) {

            console.log(
                'Insertando Pokémon...'
            );

            const pokemonData = [

                [
                    'Pikachu',
                    0.40,
                    6.00,
                    '["Static","Lightning Rod"]',
                    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
                    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/25.png'
                ],

                [
                    'Bulbasaur',
                    0.70,
                    6.90,
                    '["Overgrow","Chlorophyll"]',
                    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png',
                    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/1.png'
                ],

                [
                    'Charmander',
                    0.60,
                    8.50,
                    '["Blaze","Solar Power"]',
                    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png',
                    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/4.png'
                ],

                [
                    'Squirtle',
                    0.50,
                    9.00,
                    '["Torrent","Rain Dish"]',
                    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png',
                    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/7.png'
                ],

                [
                    'Gengar',
                    1.50,
                    40.50,
                    '["Cursed Body"]',
                    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png',
                    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/94.png'
                ]

            ];

            await connection.query(`

                INSERT INTO pokemon
                (
                    nombre,
                    altura,
                    peso,
                    habilidades,
                    imagen_frontal,
                    imagen_trasera
                )

                VALUES ?

            `, [pokemonData]);

            console.log(
                'Pokémon insertados correctamente'
            );
        }

    } catch (error) {

        console.error(
            'DATABASE ERROR:',
            error
        );

    } finally {

        if (connection) {

            connection.release();
        }
    }
}

// ========================================
// LOAD SWAGGER
// ========================================

function loadSwaggerDocument() {

    const swaggerPath =
        path.join(
            __dirname,
            'swagger.json'
        );

    if (
        !fs.existsSync(swaggerPath)
    ) {

        return null;
    }

    return JSON.parse(
        fs.readFileSync(
            swaggerPath,
            'utf8'
        )
    );
}

// ========================================
// SWAGGER HTML
// ========================================

function getSwaggerHTML(swaggerDocument) {

    return `

<!DOCTYPE html>

<html lang="en">

<head>

    <meta charset="UTF-8">

    <title>
        Pokemon API Docs
    </title>

    <link
        rel="stylesheet"
        href="https://unpkg.com/swagger-ui-dist/swagger-ui.css"
    >

    <style>

        body {

            margin: 0;

            background: #0f172a;
        }

        .topbar {

            display: none;
        }

    </style>

</head>

<body>

    <div id="swagger-ui"></div>

    <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>

    <script>

        window.onload = () => {

            SwaggerUIBundle({

                spec: ${JSON.stringify(swaggerDocument)},

                dom_id: '#swagger-ui',

                deepLinking: true,

                presets: [
                    SwaggerUIBundle.presets.apis
                ]

            });

        };

    </script>

</body>

</html>

    `;
}

// ========================================
// SERVER
// ========================================

const server = http.createServer(

    async (req, res) => {

        // ========================================
        // CORS
        // ========================================

        if (
            req.method === 'OPTIONS'
        ) {

            res.writeHead(204, {

                'Access-Control-Allow-Origin':
                    '*',

                'Access-Control-Allow-Methods':
                    'GET, POST, PUT, DELETE, OPTIONS',

                'Access-Control-Allow-Headers':
                    'Content-Type'
            });

            return res.end();
        }

        // ========================================
        // URL
        // ========================================

        const parsedUrl =
            url.parse(req.url, true);

        const pathname =
            parsedUrl.pathname;

        try {

            // ========================================
            // HOME
            // ========================================

            if (

                req.method === 'GET' &&

                pathname === '/'

            ) {

                return sendJSON(
                    res,
                    200,
                    {

                        service:
                            'Pokemon API',

                        status:
                            'Running',

                        database:
                            'MySQL Aiven',

                        endpoints: {

                            pokemon:
                                '/api/pokemon',

                            pokemonById:
                                '/api/pokemon/:id',

                            health:
                                '/health',

                            swagger:
                                '/api-docs'
                        }
                    }
                );
            }

            // ========================================
            // HEALTH
            // ========================================

            if (

                req.method === 'GET' &&

                pathname === '/health'

            ) {

                try {

                    await pool.query(
                        'SELECT 1'
                    );

                    return sendJSON(
                        res,
                        200,
                        {

                            status:
                                'ok',

                            database:
                                'connected'
                        }
                    );

                } catch (dbError) {

                    return sendJSON(
                        res,
                        500,
                        {

                            status:
                                'error',

                            database:
                                'disconnected',

                            message:
                                dbError.message
                        }
                    );
                }
            }

            // ========================================
            // GET ALL POKEMON
            // ========================================

            if (

                req.method === 'GET' &&

                pathname === '/api/pokemon'

            ) {

                const [pokemon] =
                    await pool.query(`

                        SELECT *

                        FROM pokemon

                        ORDER BY id ASC

                    `);

                return sendJSON(
                    res,
                    200,
                    pokemon
                );
            }

            // ========================================
            // GET POKEMON BY ID
            // ========================================

            if (

                req.method === 'GET' &&

                pathname.startsWith(
                    '/api/pokemon/'
                )

            ) {

                const id =
                    pathname.split('/')[3];

                // VALIDATE ID

                if (
                    !id ||
                    isNaN(id)
                ) {

                    return sendJSON(
                        res,
                        400,
                        {

                            error:
                                'ID inválido'
                        }
                    );
                }

                const [pokemon] =
                    await pool.query(`

                        SELECT *

                        FROM pokemon

                        WHERE id = ?

                    `, [id]);

                if (
                    pokemon.length === 0
                ) {

                    return sendJSON(
                        res,
                        404,
                        {

                            error:
                                'Pokemon no encontrado'
                        }
                    );
                }

                return sendJSON(
                    res,
                    200,
                    pokemon[0]
                );
            }

            // ========================================
            // SWAGGER JSON
            // ========================================

            if (

                req.method === 'GET' &&

                pathname === '/swagger.json'

            ) {

                const swaggerDocument =
                    loadSwaggerDocument();

                if (!swaggerDocument) {

                    return sendJSON(
                        res,
                        404,
                        {

                            error:
                                'swagger.json no encontrado'
                        }
                    );
                }

                return sendJSON(
                    res,
                    200,
                    swaggerDocument
                );
            }

            // ========================================
            // SWAGGER UI
            // ========================================

            if (

                req.method === 'GET' &&

                pathname === '/api-docs'

            ) {

                const swaggerDocument =
                    loadSwaggerDocument();

                if (!swaggerDocument) {

                    return sendJSON(
                        res,
                        404,
                        {

                            error:
                                'swagger.json no encontrado'
                        }
                    );
                }

                const html =
                    getSwaggerHTML(
                        swaggerDocument
                    );

                res.writeHead(200, {

                    'Content-Type':
                        'text/html'
                });

                return res.end(html);
            }

            // ========================================
            // 404
            // ========================================

            return sendJSON(
                res,
                404,
                {

                    error:
                        'Ruta no encontrada'
                }
            );

        } catch (error) {

            console.error(
                'SERVER ERROR:',
                error
            );

            return sendJSON(
                res,
                500,
                {

                    error:
                        'Internal Server Error',

                    message:
                        error.message
                }
            );
        }
    }
);

// ========================================
// START SERVER
// ========================================

server.listen(

    PORT,

    async () => {

        console.log(`

========================================
 POKEMON MICROSERVICE RUNNING
========================================

PORT:
http://localhost:${PORT}

API:
http://localhost:${PORT}/api/pokemon

POKEMON BY ID:
http://localhost:${PORT}/api/pokemon/1

HEALTH:
http://localhost:${PORT}/health

SWAGGER UI:
http://localhost:${PORT}/api-docs

SWAGGER JSON:
http://localhost:${PORT}/swagger.json

========================================

        `);

        await initDB();
    }
);

// ========================================
// HANDLE ERRORS
// ========================================

process.on(

    'unhandledRejection',

    (error) => {

        console.error(
            'UNHANDLED REJECTION:',
            error
        );
    }
);

process.on(

    'uncaughtException',

    (error) => {

        console.error(
            'UNCAUGHT EXCEPTION:',
            error
        );
    }
);