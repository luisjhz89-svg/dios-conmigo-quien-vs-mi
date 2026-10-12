# SANACIÓN INTEGRAL

Plataforma inicial de acompañamiento espiritual y emocional con cuatro espacios:

- **Dios conmigo, ¿quién contra mí?** — conversación de reflexión espiritual.
- **Salir de las adicciones** — acompañamiento general para la recuperación.
- **¿Ocupo un psicólogo?** — escucha y orientación no diagnóstica.
- **¿Realmente estoy solo?** — motivación y selección de música por estado de ánimo.

La interfaz funciona en español y en móvil. Las conversaciones permanecen solo en el estado temporal del navegador y no se guardan en una base de datos. Si configuras OpenAI, el mensaje se envía a ese proveedor para generar una respuesta; no incluyas datos identificables o sensibles. Sin una clave, el backend responde en modo de demostración.

## Inicio rápido

Requisitos: Node.js 22 o posterior y npm.

```sh
cp .env.example backend/.env
npm install --prefix frontend
npm install --prefix backend
```

En dos terminales:

```sh
cd backend && npm start
```

```sh
cd frontend && npm run dev
```

Abre la URL que muestra Vite (normalmente `http://localhost:5173`). Para habilitar respuestas de OpenAI, configura `OPENAI_API_KEY` en `backend/.env`. La clave nunca va en el frontend.

Con Docker:

```sh
docker compose up --build
```

## Validación

```sh
npm test --prefix backend
npm run build --prefix frontend
npm run lint --prefix frontend
```

## Seguridad y alcance

Este proyecto es un prototipo funcional, no un servicio clínico ni una aplicación lista para producción. No ofrece diagnósticos, tratamiento, desintoxicación ni asesoría médica. Síntomas graves de abstinencia o peligro inmediato requieren atención urgente: llama al **911**. El chat aplica respuestas de seguridad para señales explícitas, pero no sustituye un servicio de emergencia.

No están implementados autenticación, almacenamiento MongoDB, suscripciones ni pagos. El precio de 7 días gratis y luego $5 MXN/mes es solo el modelo propuesto; Stripe no está conectado. Tampoco se recolectan canciones ni se afirma que Spotify esté integrado: la recomendación abre una búsqueda del título elegido por la persona.

Antes de lanzar a usuarios, implementa y audita consentimiento, privacidad, autenticación y sesiones seguras, moderación y escalamiento humano, persistencia protegida, facturación, recursos locales verificados y una revisión clínica/legal de los contenidos y términos.

Consulta [la guía de configuración](docs/SETUP.md), [la arquitectura](docs/ARCHITECTURE.md), [la API](docs/API.md) y los [términos de licencia](LICENSE.md).
