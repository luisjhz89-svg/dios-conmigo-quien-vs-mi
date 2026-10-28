# Dios conmigo, ¿quién contra mí?

Aplicación de acompañamiento espiritual en español. Incluye chat con referencias bíblicas, cuentas personales, historial privado y una prueba gratis de siete días; después ofrece una suscripción de **$5 MXN al mes**.

## Autoría y licencia

Creada por **Luis Javier Hernández Zúñiga**. El código de este proyecto se distribuye bajo la licencia [MIT](LICENSE), que permite usarlo, modificarlo y compartirlo, conservando el aviso de copyright y la licencia.

La licencia del código no concede derechos sobre marcas, servicios o materiales de terceros. En particular, los textos bíblicos de traducciones específicas pueden tener sus propias condiciones de uso; verifica los permisos de cualquier contenido que incorpores o distribuyas.

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

3. Configura `DATABASE_URL`, un `JWT_SECRET` aleatorio de al menos 32 caracteres y `DATA_ENCRYPTION_KEY` en `.env`. Genera la clave de cifrado con `openssl rand -base64 32` y guárdala en un gestor de secretos; perderla impide descifrar las conversaciones. Para habilitar respuestas de IA, agrega `OPENAI_API_KEY`; sin esta clave se usan respuestas de guía predefinidas con referencias bíblicas.
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

Stripe Checkout puede mostrar Apple Pay cuando Apple Pay está habilitado en el panel de Stripe y el dominio de la app se registra/verifica allí. La disponibilidad también depende del dispositivo, navegador y país del cliente. El correo de una cuenta Apple Pay no configura este método de cobro.

### PayPal

Para aceptar suscripciones por PayPal, configura en el entorno del servidor `PAYPAL_ENVIRONMENT=sandbox` (o `live`), `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_PLAN_ID` y `PAYPAL_WEBHOOK_ID`. Crea en el panel de PayPal un plan recurrente de **5 MXN al mes**; configura el webhook en `https://TU-DOMINIO/api/billing/paypal/webhook` para los eventos `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.UPDATED`, `BILLING.SUBSCRIPTION.CANCELLED`, `BILLING.SUBSCRIPTION.EXPIRED`, `BILLING.SUBSCRIPTION.SUSPENDED` y `BILLING.SUBSCRIPTION.PAYMENT.FAILED`. Selecciona `live` únicamente cuando la cuenta y el plan estén listos para cobrar de verdad.

El correo de la cuenta no habilita por sí solo la API: las credenciales se obtienen en el panel de desarrolladores de PayPal y deben guardarse como secretos del servidor, nunca en el frontend ni en el repositorio.

## Producción y validación

Configura `DATABASE_URL`, `JWT_SECRET`, `DATA_ENCRYPTION_KEY`, `CLIENT_URL`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y, si usas PayPal, sus variables anteriores como secretos del entorno. Habilita TLS para PostgreSQL con `DATABASE_SSL=true`, despliega la carpeta `client/dist` junto a la API y usa HTTPS. La aplicación aplica Helmet, límites de solicitudes, cookies de sesión `HttpOnly`, validación de origen, contraseñas con hash y consultas parametrizadas.

Las sesiones usan una cookie `HttpOnly` limitada a `/api`; en producción se agrega `Secure`. Configura `CLIENT_URL` con el origen exacto del frontend. El contenido de conversaciones y títulos se cifra con AES-256-GCM en la aplicación; la clave de cifrado no se guarda en la base de datos. La app no permite subir ni leer documentos personales ni controlar dispositivos o cuentas externas. Solo procesa el correo para iniciar sesión, un hash de contraseña, el estado de suscripción y las conversaciones asociadas a la cuenta. Si se configura OpenAI, el texto del chat se envía a ese proveedor para generar respuestas (con `store: false`); evita incluir contraseñas, datos bancarios o información que no quieras compartir con un proveedor externo. Stripe y PayPal reciben los datos necesarios cuando el usuario decide pagar.

```sh
npm test
npm run build
npm start
```
