# Arquitectura

El prototipo separa dos aplicaciones:

- `frontend/`: React, TypeScript, Vite y Tailwind CSS. Maneja la presentación y mantiene el historial de conversación solo en memoria del navegador.
- `backend/`: Express y TypeScript. Valida módulo y longitud, aplica respuestas de crisis antes de llamar al proveedor de IA y usa un prompt distinto para cada módulo.

En desarrollo, Vite reenvía `/api` al backend (`localhost:3001`). Docker Compose ajusta el destino al servicio `api`. La variable `OPENAI_API_KEY` solo se lee en el servidor. Sin ella, la API responde con contenido de demostración. El chat limita las solicitudes por dirección IP para acotar abuso y gasto; al desplegar detrás de un proxy, configura con cuidado las direcciones de proxy de confianza.

No se persisten conversaciones y no hay cuentas, refresh tokens, MongoDB, Stripe ni Spotify API. Estos servicios necesitan diseño de privacidad, revisión de seguridad y credenciales propias antes de implementarse. El proveedor de IA puede procesar los mensajes enviados cuando se configura una clave; informa a tus usuarios y no envíes datos identificables.

Los prompts limitan consejos médicos y diagnósticos, pero no garantizan detectar todas las crisis ni evitar respuestas incorrectas. La aplicación no es un servicio de emergencia.
