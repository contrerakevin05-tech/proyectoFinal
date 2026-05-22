import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;

import java.net.InetSocketAddress;
import java.net.URI;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import java.nio.charset.StandardCharsets;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import java.time.Duration;

import java.util.concurrent.Executors;

public class Main {

    // ======================================
    // SUPABASE
    // ======================================

    private static final String SUPABASE_URL =
            "https://ujskykirumlohkquuqzh.supabase.co/rest/v1/characters?select=*";

    private static final String SUPABASE_KEY =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqc2t5a2lydW1sb2hrcXV1cXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTA5NTAsImV4cCI6MjA5MzU4Njk1MH0.BW2NVoaiwngyCgassAnVPkl2-bRkVw84Q1afiVQA9vA";

    // ======================================
    // HTTP CLIENT
    // ======================================

    private static final HttpClient client =
            HttpClient.newBuilder()

                    .connectTimeout(
                            Duration.ofSeconds(15)
                    )

                    .build();

    // ======================================
    // MAIN
    // ======================================

    public static void main(String[] args)
            throws Exception {

        // ======================================
        // PORT RENDER
        // ======================================

        int port =
                Integer.parseInt(

                        System.getenv()
                                .getOrDefault(
                                        "PORT",
                                        "3002"
                                )
                );

        // ======================================
        // SERVER
        // ======================================

        HttpServer server =
                HttpServer.create(

                        new InetSocketAddress(
                                "0.0.0.0",
                                port
                        ),

                        0
                );

        // ======================================
        // ROUTES
        // ======================================

        server.createContext(
                "/",
                new HomeHandler()
        );

        server.createContext(
                "/health",
                new HealthHandler()
        );

        server.createContext(
                "/api/naruto",
                new NarutoHandler()
        );

        server.createContext(
                "/swagger.json",
                new SwaggerJsonHandler()
        );

        server.createContext(
                "/api-docs",
                new SwaggerUIHandler()
        );

        // ======================================
        // EXECUTOR
        // ======================================

        server.setExecutor(
                Executors.newCachedThreadPool()
        );

        // ======================================
        // START
        // ======================================

        server.start();

        System.out.println(
                """

=======================================
 NARUTO API RUNNING
=======================================

PORT:
""" + port + """

API:
/api/naruto

HEALTH:
/health

SWAGGER:
/api-docs

=======================================

"""
        );
    }

    // ======================================
    // HOME
    // ======================================

    static class HomeHandler
            implements HttpHandler {

        @Override
        public void handle(
                HttpExchange exchange
        ) throws IOException {

            handleCors(exchange);

            sendJson(

                    exchange,

                    200,

                    """
                    {
                      "service":"Naruto API",
                      "status":"Running",
                      "endpoints":{
                        "api":"/api/naruto",
                        "health":"/health",
                        "swagger":"/api-docs"
                      }
                    }
                    """
            );
        }
    }

    // ======================================
    // HEALTH
    // ======================================

    static class HealthHandler
            implements HttpHandler {

        @Override
        public void handle(
                HttpExchange exchange
        ) throws IOException {

            handleCors(exchange);

            sendJson(

                    exchange,

                    200,

                    """
                    {
                      "status":"ok"
                    }
                    """
            );
        }
    }

    // ======================================
    // API
    // ======================================

    static class NarutoHandler
            implements HttpHandler {

        @Override
        public void handle(
                HttpExchange exchange
        ) throws IOException {

            handleCors(exchange);

            // OPTIONS

            if (
                    "OPTIONS".equalsIgnoreCase(
                            exchange.getRequestMethod()
                    )
            ) {

                exchange.sendResponseHeaders(
                        204,
                        -1
                );

                return;
            }

            // ONLY GET

            if (
                    !"GET".equalsIgnoreCase(
                            exchange.getRequestMethod()
                    )
            ) {

                sendJson(

                        exchange,

                        405,

                        """
                        {
                          "error":"Method Not Allowed"
                        }
                        """
                );

                return;
            }

            try {

                HttpRequest request =

                        HttpRequest.newBuilder()

                                .uri(
                                        URI.create(
                                                SUPABASE_URL
                                        )
                                )

                                .timeout(
                                        Duration.ofSeconds(
                                                20
                                        )
                                )

                                .header(
                                        "apikey",
                                        SUPABASE_KEY
                                )

                                .header(
                                        "Authorization",
                                        "Bearer " + SUPABASE_KEY
                                )

                                .header(
                                        "Content-Type",
                                        "application/json"
                                )

                                .GET()

                                .build();

                HttpResponse<String> response =

                        client.send(

                                request,

                                HttpResponse.BodyHandlers
                                        .ofString()
                        );

                int statusCode =
                        response.statusCode();

                String body =
                        response.body();

                System.out.println(
                        "SUPABASE STATUS: " +
                                statusCode
                );

                // SUCCESS

                if (
                        statusCode >= 200 &&
                                statusCode < 300
                ) {

                    sendJson(
                            exchange,
                            200,
                            body
                    );

                } else {

                    System.out.println(body);

                    sendJson(

                            exchange,

                            500,

                            """
                            {
                              "error":"Supabase Error"
                            }
                            """
                    );
                }

            } catch (Exception e) {

                e.printStackTrace();

                sendJson(

                        exchange,

                        500,

                        """
                        {
                          "error":"Internal Server Error"
                        }
                        """
                );
            }
        }
    }

    // ======================================
    // SWAGGER JSON
    // ======================================

    static class SwaggerJsonHandler
            implements HttpHandler {

        @Override
        public void handle(
                HttpExchange exchange
        ) throws IOException {

            handleCors(exchange);

            try {

                Path swaggerPath =

                        Paths.get(
                                System.getProperty(
                                        "user.dir"
                                ),
                                "swagger.json"
                        );

                String content =
                        Files.readString(
                                swaggerPath
                        );

                sendJson(
                        exchange,
                        200,
                        content
                );

            } catch (Exception e) {

                sendJson(

                        exchange,

                        404,

                        """
                        {
                          "error":"swagger.json not found"
                        }
                        """
                );
            }
        }
    }

    // ======================================
    // SWAGGER UI
    // ======================================

    static class SwaggerUIHandler
            implements HttpHandler {

        @Override
        public void handle(
                HttpExchange exchange
        ) throws IOException {

            handleCors(exchange);

            String html = """
<!DOCTYPE html>
<html lang="en">
<head>

<meta charset="UTF-8">

<title>Naruto API Docs</title>

<link rel="stylesheet"
href="https://unpkg.com/swagger-ui-dist/swagger-ui.css">

<style>

body{
    margin:0;
    background:#0f172a;
}

.topbar{
    display:none;
}

</style>

</head>

<body>

<div id="swagger-ui"></div>

<script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>

<script>

window.onload = () => {

    SwaggerUIBundle({

        url:'/swagger.json',

        dom_id:'#swagger-ui'

    });

};

</script>

</body>
</html>
""";

            byte[] bytes =
                    html.getBytes(
                            StandardCharsets.UTF_8
                    );

            exchange.getResponseHeaders().set(
                    "Content-Type",
                    "text/html; charset=UTF-8"
            );

            exchange.sendResponseHeaders(
                    200,
                    bytes.length
            );

            try (

                    OutputStream os =
                            exchange.getResponseBody()

            ) {

                os.write(bytes);
            }
        }
    }

    // ======================================
    // CORS
    // ======================================

    private static void handleCors(
            HttpExchange exchange
    ) {

        exchange.getResponseHeaders().set(
                "Access-Control-Allow-Origin",
                "*"
        );

        exchange.getResponseHeaders().set(
                "Access-Control-Allow-Methods",
                "GET, POST, OPTIONS"
        );

        exchange.getResponseHeaders().set(
                "Access-Control-Allow-Headers",
                "Content-Type, Authorization"
        );
    }

    // ======================================
    // SEND JSON
    // ======================================

    private static void sendJson(

            HttpExchange exchange,

            int statusCode,

            String response

    ) throws IOException {

        byte[] bytes =
                response.getBytes(
                        StandardCharsets.UTF_8
                );

        exchange.getResponseHeaders().set(
                "Content-Type",
                "application/json; charset=UTF-8"
        );

        exchange.sendResponseHeaders(
                statusCode,
                bytes.length
        );

        try (

                OutputStream os =
                        exchange.getResponseBody()

        ) {

            os.write(bytes);
        }
    }
}
