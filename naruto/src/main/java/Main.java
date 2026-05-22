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
import java.nio.file.Paths;

import java.time.Duration;

public class Main {

    // =========================================
    // CONFIGURACIÓN SUPABASE
    // =========================================

    private static final String SUPABASE_URL =
            "https://ujskykirumlohkquuqzh.supabase.co/rest/v1/characters?select=*";

    private static final String SUPABASE_KEY =
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqc2t5a2lydW1sb2hrcXV1cXpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwMTA5NTAsImV4cCI6MjA5MzU4Njk1MH0.BW2NVoaiwngyCgassAnVPkl2-bRkVw84Q1afiVQA9vA";

    // =========================================
    // CLIENTE HTTP
    // =========================================

    private static final HttpClient client =
            HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

    // =========================================
    // MAIN
    // =========================================

    public static void main(String[] args) throws Exception {

        int port =
                System.getenv("PORT") != null
                        ? Integer.parseInt(System.getenv("PORT"))
                        : 8081;

        HttpServer server =
                HttpServer.create(
                        new InetSocketAddress(port),
                        0
                );

        // =========================================
        // ENDPOINTS
        // =========================================

        server.createContext(
                "/api/naruto",
                new NarutoHandler()
        );

        server.createContext(
                "/api-docs",
                new SwaggerHandler()
        );

        server.setExecutor(null);

        System.out.println("=======================================");
        System.out.println("NARUTO MICROSERVICE RUNNING");
        System.out.println("PORT: " + port);
        System.out.println("URL: http://localhost:" + port + "/api/naruto");
        System.out.println("=======================================");

        server.start();
    }

    // =========================================
    // NARUTO HANDLER
    // =========================================

    static class NarutoHandler implements HttpHandler {

        @Override
        public void handle(HttpExchange exchange)
                throws IOException {

            // =========================================
            // CORS
            // =========================================

            exchange.getResponseHeaders().add(
                    "Access-Control-Allow-Origin",
                    "*"
            );

            exchange.getResponseHeaders().add(
                    "Access-Control-Allow-Methods",
                    "GET, OPTIONS"
            );

            exchange.getResponseHeaders().add(
                    "Access-Control-Allow-Headers",
                    "Content-Type, Authorization"
            );

            exchange.getResponseHeaders().add(
                    "Content-Type",
                    "application/json; charset=UTF-8"
            );

            // =========================================
            // OPTIONS
            // =========================================

            if ("OPTIONS".equalsIgnoreCase(
                    exchange.getRequestMethod()
            )) {

                exchange.sendResponseHeaders(204, -1);
                return;
            }

            // =========================================
            // VALIDAR MÉTODO
            // =========================================

            if (!"GET".equalsIgnoreCase(
                    exchange.getRequestMethod()
            )) {

                sendResponse(
                        exchange,
                        405,
                        """
                        {
                            "error":"Método no permitido"
                        }
                        """
                );

                return;
            }

            try {

                // =========================================
                // REQUEST SUPABASE
                // =========================================

                HttpRequest request =
                        HttpRequest.newBuilder()
                                .uri(
                                        URI.create(
                                                SUPABASE_URL
                                        )
                                )
                                .timeout(
                                        Duration.ofSeconds(15)
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

                // =========================================
                // ENVIAR REQUEST
                // =========================================

                HttpResponse<String> response =
                        client.send(
                                request,
                                HttpResponse.BodyHandlers.ofString()
                        );

                int statusCode =
                        response.statusCode();

                String responseBody =
                        response.body();

                System.out.println(
                        "SUPABASE STATUS: " + statusCode
                );

                // =========================================
                // VALIDAR RESPUESTA
                // =========================================

                if (statusCode >= 200 &&
                        statusCode < 300) {

                    sendResponse(
                            exchange,
                            statusCode,
                            responseBody
                    );

                } else {

                    System.out.println(
                            "SUPABASE ERROR:"
                    );

                    System.out.println(
                            responseBody
                    );

                    sendResponse(
                            exchange,
                            500,
                            """
                            {
                                "error":"Error obteniendo datos de Supabase"
                            }
                            """
                    );
                }

            } catch (Exception e) {

                e.printStackTrace();

                sendResponse(
                        exchange,
                        500,
                        """
                        {
                            "error":"Error interno del servidor"
                        }
                        """
                );
            }
        }
    }

    // =========================================
    // SWAGGER HANDLER
    // =========================================

    static class SwaggerHandler implements HttpHandler {

        @Override
        public void handle(HttpExchange exchange)
                throws IOException {

            exchange.getResponseHeaders().add(
                    "Access-Control-Allow-Origin",
                    "*"
            );

            exchange.getResponseHeaders().add(
                    "Content-Type",
                    "application/json"
            );

            try {

                String content =
                        Files.readString(
                                Paths.get("swagger.json")
                        );

                sendResponse(
                        exchange,
                        200,
                        content
                );

            } catch (Exception e) {

                sendResponse(
                        exchange,
                        404,
                        """
                        {
                            "error":"swagger.json no encontrado"
                        }
                        """
                );
            }
        }
    }

    // =========================================
    // SEND RESPONSE
    // =========================================

    private static void sendResponse(
            HttpExchange exchange,
            int statusCode,
            String response
    ) throws IOException {

        byte[] bytes =
                response.getBytes(
                        StandardCharsets.UTF_8
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