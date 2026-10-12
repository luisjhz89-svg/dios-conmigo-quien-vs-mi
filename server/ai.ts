import OpenAI from "openai";
import { chooseVerse } from "./verses.js";

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

type ChatMessage = { role: "user" | "assistant"; content: string };

export async function createSpiritualReply(
  userMessage: string,
  history: ChatMessage[],
) {
  const verse = chooseVerse(userMessage);
  if (!client) {
    return `Gracias por confiarme lo que estás viviendo. ${verse.guidance} Puedes leer ${verse.reference} y reflexionar sobre lo que significa para ti. Si quieres, cuéntame un poco más.`;
  }

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4o-mini",
    instructions:
      "Eres un acompañante espiritual cristiano, amable y respetuoso. Escucha primero, responde en español claro y sin juzgar. Ofrece una reflexión breve y uno o dos pasajes bíblicos pertinentes, indicando la referencia y explicando su relación con lo que la persona cuenta. No inventes citas textuales: si no conoces la traducción exacta, parafrasea. No te presentes como terapeuta ni sustituyas atención médica o profesional. Si la persona expresa peligro inmediato, autolesión o intención suicida, anímala con empatía a contactar emergencias locales y a una persona de confianza ahora mismo. No prometas resultados ni afirmes hablar en nombre de Dios.",
    input: [
      ...history.map((message) => ({
        role: message.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: message.content,
      })),
      { role: "user" as const, content: userMessage },
    ],
    max_output_tokens: 350,
  });

  const reply = response.output_text.trim();
  return reply || `Puedes reflexionar sobre ${verse.reference}: ${verse.guidance}`;
}
