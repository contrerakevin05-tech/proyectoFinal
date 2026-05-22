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
// HOST
// ========================================

const HOST = '0.0.0.0';

// ========================================
// MYSQL CONFIG
// ========================================

const pool = mysql.createPool({

    host:
        process.env.DB_HOST ||
        'mysql-68cfa5b-pokemon.a.aivencloud.com',

    user:
        process.env.DB_USER ||
        'avnadmin',

    password:
        process.env.DB_PASSWORD ||
        'AVNS_mGAvK97g1YIoDQpXXZw',

    database:
        process.env.DB_NAME ||
        'defaultdb',

    port:
        process.env.DB_PORT || 12160,

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
            'Content-Type, Authorization',

        'Cache-Control':
            'no-cache'
    });

    res.end(
        JSON.stringify(data)
    );
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
/>

<style>

html {

    box-sizing: border-box;

    overflow-y: scroll;
}

*,
*:before,
*:after {

    box-sizing: inherit;
}

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

        url: '/swagger.json',

        dom_id: '#swagger-ui',

        deepLinking: true,

        presets: [
            SwaggerUIBundle.presets.apis
        ],

        layout: "BaseLayout"
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
                    'Content-Type, Authorization'
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

                        environment:
                            process.env.NODE_ENV || 'development',

                        database:
                            'MySQL Aiven',

                        endpoints: {

                            pokemon:
                                '/api/pokemon',

                            pokemonById:
                                '/api/pokemon/1',

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
                                'connected',

                            uptime:
                                process.uptime()
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

                res.writeHead(200, {

                    'Content-Type':
                        'text/html'
                });

                return res.end(
                    getSwaggerHTML(
                        swaggerDocument
                    )
                );
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

    HOST,

    async () => {

        console.log(`

========================================
 POKEMON MICROSERVICE RUNNING
========================================

ENV:
${process.env.NODE_ENV || 'development'}

PORT:
${PORT}

HOST:
${HOST}

API:
http://localhost:${PORT}/api/pokemon

SWAGGER:
http://localhost:${PORT}/api-docs

========================================

        `);

        try {

            const connection =
                await pool.getConnection();

            console.log(
                'MySQL Connected'
            );

            connection.release();

        } catch (dbError) {

            console.error(
                'Database connection error:',
                dbError
            );
        }
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
