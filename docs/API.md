# API inicial

La API usa JSON y está disponible en el prefijo `/api`.

## `GET /api/health`

Devuelve el estado del servidor y si se configuró una clave de IA:

```json
{ "status": "ok", "aiConfigured": false }
```

## `POST /api/chat`

Solicita una respuesta para uno de los cuatro módulos:

```json
{ "module": "spiritual", "message": "Me siento desanimado" }
```

`module` acepta `spiritual`, `recovery`, `psychology` o `motivation`. El mensaje debe contener entre 1 y 1,200 caracteres. La API rechaza entradas no válidas (`400`), limita el chat a 20 solicitudes por minuto por IP (`429`), devuelve respuestas de crisis sin llamar a la IA (`200`, modo `safety`) y usa respuesta de demostración si no hay credenciales (`200`, modo `demo`). Un fallo del proveedor devuelve `503`.

Los mensajes no se persisten ni se asocian a una cuenta. Si se configura OpenAI, el contenido se envía a su servicio externo. No incluyas información personal o identificable.
