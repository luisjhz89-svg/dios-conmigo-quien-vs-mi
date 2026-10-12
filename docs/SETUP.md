# Configuración

## Desarrollo local

1. Instala Node.js 22 o posterior.
2. Instala las dependencias con `npm install --prefix backend` y `npm install --prefix frontend`.
3. Opcionalmente, copia `.env.example` como `backend/.env` y añade `OPENAI_API_KEY` en un entorno privado.
4. Ejecuta `npm start --prefix backend` y `npm run dev --prefix frontend` en terminales separadas.
5. Abre `http://localhost:5173`.

Sin API key, el chat usa una respuesta de demostración. No uses credenciales reales en el cliente ni confirmes información sensible en el chat. Los mensajes no se guardan en esta versión, pero sí se envían a OpenAI si se configura esa integración.

## Docker

Ejecuta `docker compose up --build` desde la raíz. La interfaz se publica en el puerto `5173` y la API en el `3001`. Define `OPENAI_API_KEY` en el entorno de Docker si deseas habilitar IA.

## Comprobaciones

- `npm test --prefix backend`
- `npm run build --prefix frontend`
- `npm run lint --prefix frontend`

Antes de producción se requieren autenticación y autorización seguras, límites de solicitudes, gestión de consentimiento y datos, recursos de crisis locales verificados, monitoreo y revisión legal/clínica.
