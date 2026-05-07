// api/src/server.ts
import express from "express";
import cors from "cors";
import { env } from "./config/env";

const app = express(); // Definición de la aplicación Express

app.use(cors());
app.use(express.json());

// Petición base para validar que la API está levantada
app.get("/", (_req, res) => {
    res.json({
        success: true,
        message: "Wolfy Lunar Budget API running",
    });
});

// Endpoint de monitoreo/health check
app.get("/health", (_req, res) => {
    res.json({
        success: true,
        status: "OK",
    });
});

// Información en consola al iniciar el servidor
app.listen(env.port, () => {
    console.log(`API corriendo en http://localhost:${env.port}`);
});