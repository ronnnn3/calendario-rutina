
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getDailyCoachTip = async (type: string, week: number, progress: number) => {
  try {
    const prompt = `Actúa como un coach experto en CrossFit y nutrición deportiva. 
    El usuario está en la Semana ${week} de una transformación de 12 semanas. 
    La rutina de hoy es Tipo ${type} (${type === 'A' ? 'Cardio Intenso + CrossFit' : type === 'B' ? 'CrossFit Focus' : 'Descanso'}).
    El progreso es del ${Math.round(progress)}%.
    
    Dame un consejo corto (máximo 2 frases), motivador y científico en español para hoy. 
    Enfócate en recuperación, mentalidad o hidratación según el tipo de rutina.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "¡Mantén el enfoque! Cada día cuenta para tu mejor versión.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "¡Sigue adelante! La disciplina es el puente entre tus metas y tus logros.";
  }
};

export const getMealAlternative = async (mealDescription: string, routineType: string) => {
  try {
    const prompt = `Como nutricionista de FitLife 12, sugiere 3 alternativas saludables para esta comida: "${mealDescription}".
    La rutina de hoy es de tipo ${routineType} (importante para las porciones de carbohidratos).
    
    Opciones obligatorias a considerar: Pechuga de pollo, Pescado blanco (Tilapia/Merluza) y Atún.
    Mantén exactamente los mismos gramos de proteína y carbohidratos que la comida original.
    Responde en español de forma directa y profesional. Máximo 50 palabras.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Opción: 200g de Pechuga de pollo con la misma base de carbohidratos de tu plan.";
  } catch (error) {
    console.error("Gemini Meal Error:", error);
    return "Sugiero intercambiar la proteína por 200g de pescado o pollo manteniendo los carbohidratos indicados.";
  }
};
