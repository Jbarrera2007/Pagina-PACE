// Etiqueta de esfuerzo derivada exclusivamente del dato real `suffer_score`
// de la actividad. Si no existe el dato, no se inventa nada: se devuelve "—".
export function effortLabel(sufferScore: number | null | undefined): string {
  if (sufferScore === null || sufferScore === undefined) return "—";
  if (sufferScore < 30) return "Suave";
  if (sufferScore < 80) return "Moderado";
  if (sufferScore < 150) return "Duro";
  return "Muy duro";
}
