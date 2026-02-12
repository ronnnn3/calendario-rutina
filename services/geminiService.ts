
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getDailyCoachTip = async (type: string, week: number, progress: number) => {
  try {
    const prompt = `Actúa como un coach experto en CrossFit y nutrición deportiva. 
    El usuario está en la Semana ${week} de una transformación de 12 semanas. 
    La rutina de hoy es Tipo ${type} (${type === 'A' ? 'Cardio Intenso + CrossFit' : type === 'B' ? 'CrossFit Focus' : 'Descanso'}).
    El progreso es del ${Math.round(progress)}%.
    
    Dame un consejo corto (máximo 2 frases), motivador y científico en español para hoy.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "¡Mantén el enfoque! Cada día cuenta.";
  } catch (error) {
    return "¡Sigue adelante! La disciplina es la clave.";
  }
};

export const getMealAlternative = async (mealDescription: string, routineType: string) => {
  try {
    const prompt = `Como nutricionista de FitLife 12, sugiere 3 alternativas rápidas para: "${mealDescription}".
    Rutina: ${routineType}. Opciones: Pollo, Pescado, Atún. Máximo 40 palabras.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Intercambia por 200g de proteína magra con tu porción de carbohidratos.";
  } catch (error) {
    return "Sugiero variar la proteína manteniendo tus macros.";
  }
};

export const getRecipesByType = async (mealType: string, routineType: string, week: number) => {
  try {
    const prompt = `Actúa como un Chef de Nutrición Deportiva. El usuario necesita ideas para "${mealType}".
    Contexto: Semana ${week} de FitLife 12. Rutina de hoy: ${routineType} (${routineType === 'A' ? 'Alta en Carbos' : 'Low Carb'}).
    
    Genera 2 o 3 variaciones de recetas creativas. Cada una debe incluir:
    1. Nombre atractivo.
    2. Ingredientes clave (enfocados en pollo, pescado, atún, huevos, avena, etc).
    3. Un tip de preparación rápida (<15 min).
    
    Responde en español, con formato limpio y apetitoso. Máximo 120 palabras.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text;
  } catch (error) {
    console.error("Recipe Error:", error);
    return "No pudimos conectar con el Chef AI. Intenta preparar una proteína a la plancha con vegetales al vapor.";
  }
};
