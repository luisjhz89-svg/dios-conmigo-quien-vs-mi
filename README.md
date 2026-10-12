# Dios conmigo, ¿quién contra mí?

Aplicación de acompañamiento espiritual en español. Incluye chat con referencias bíblicas, cuentas personales, historial privado y una prueba gratis de siete días; después ofrece una suscripción de **$5 MXN al mes**.

## Requisitos

- Node.js 22 o posterior
- PostgreSQL 14 o posterior
- Una clave de OpenAI para respuestas generadas por IA (opcional en desarrollo)
- Una cuenta de Stripe para activar cobros (opcional en desarrollo)

## Desarrollo local

1. Crea una base de datos PostgreSQL, por ejemplo `dios_conmigo`.
2. Instala las dependencias y copia la configuración de ejemplo:

   ```sh
   npm install
   cp .env.example .env
   ```

3. Configura `DATABASE_URL` y un `JWT_SECRET` aleatorio de al menos 32 caracteres en `.env`. Para habilitar respuestas de IA, agrega `OPENAI_API_KEY`; sin esta clave se usan respuestas de guía predefinidas con referencias bíblicas.
4. Inicia la API y el cliente en terminales separadas:

   ```sh
   npm run dev:api
   npm run dev:client
   ```

   Abre <http://localhost:5173>. Las tablas se crean al iniciar la API.

## Activar pagos

Agrega `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` a `.env`. El checkout crea una suscripción recurrente en MXN por 500 centavos ($5 MXN). Para probar webhooks localmente con Stripe CLI:

```sh
stripe listen --forward-to localhost:3000/api/billing/webhook
```

Configura también el endpoint `/api/billing/webhook` en Stripe y habilita los eventos `checkout.session.completed`, `customer.subscription.updated` y `customer.subscription.deleted`. No guardes claves reales en el repositorio.

## Producción y validación

Configura `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` como variables seguras del entorno. Habilita TLS para PostgreSQL con `DATABASE_SSL=true`, despliega la carpeta `client/dist` junto a la API y usa HTTPS. La aplicación aplica Helmet, límites de solicitudes, validación de entrada, contraseñas con hash y consultas parametrizadas.

```sh
npm test
npm run build
npm start
```
