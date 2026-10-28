const verseGuidance = [
  {
    terms: ["ansiedad", "miedo", "preocup", "temor"],
    reference: "Filipenses 4:6-7",
    guidance: "Este pasaje invita a presentar las preocupaciones a Dios y buscar su paz.",
  },
  {
    terms: ["triste", "dolor", "duelo", "solo", "soledad"],
    reference: "Salmo 34:18",
    guidance: "Este salmo recuerda que Dios está cerca de quienes atraviesan un corazón herido.",
  },
  {
    terms: ["cans", "agot", "descans"],
    reference: "Mateo 11:28",
    guidance: "Jesús ofrece descanso a quienes se sienten cansados y cargados.",
  },
  {
    terms: ["decis", "decid", "duda", "camino", "futuro"],
    reference: "Proverbios 3:5-6",
    guidance: "Este pasaje anima a confiar en Dios y buscar su dirección.",
  },
  {
    terms: ["problema", "difícil", "dificil", "crisis", "fuerza"],
    reference: "Isaías 41:10",
    guidance: "Este pasaje anima a no temer y recuerda el apoyo de Dios en tiempos difíciles.",
  },
];

export function chooseVerse(message: string) {
  const normalizedMessage = message.toLocaleLowerCase("es");
  return (
    verseGuidance.find(({ terms }) =>
      terms.some((term) => normalizedMessage.includes(term)),
    ) ?? {
      reference: "Salmo 23:1-4",
      guidance: "Este salmo expresa confianza en la compañía y el cuidado de Dios.",
    }
  );
}
