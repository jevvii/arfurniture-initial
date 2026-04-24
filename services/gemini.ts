import { GoogleGenAI } from "@google/genai";
import { Product } from "../types";

// Initialize Gemini Client
// The API Key comes from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateProductDescription = async (productName: string, features: string): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
        console.warn("No API Key found. Returning fallback text.");
        return "Experience luxury and comfort with this exquisite piece, designed to elevate your living space.";
    }

    const model = 'gemini-2.5-flash';
    const prompt = `
      You are a high-end furniture copywriter. 
      Write a short, compelling, and elegant product description (max 50 words) for a piece of furniture named "${productName}".
      Key features/style: ${features}.
      Focus on lifestyle, comfort, and aesthetic appeal. Do not use hashtags.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
    });

    return response.text || "A beautiful addition to your home.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Experience modern elegance with this premium furniture piece, crafted for style and durability.";
  }
};

export const askProductAssistant = async (question: string, product: Product): Promise<string> => {
    try {
        if (!process.env.API_KEY) return "I can help answer questions about dimensions and materials!";
        
        const model = 'gemini-2.5-flash';
        const context = `
            Product: ${product.name}
            Price: $${product.price}
            Dimensions: ${product.dimensions.width}x${product.dimensions.height}x${product.dimensions.depth} ${product.dimensions.unit}
            Category: ${product.category}
        `;
        
        const prompt = `
            Context: ${context}
            User Question: "${question}"
            
            Answer the user's question about the furniture product accurately and briefly based on the context provided.
            If the answer isn't in the context, use general knowledge about this type of furniture but be honest about not knowing specific details.
        `;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt
        });
        
        return response.text || "I'm not sure about that detail.";
    } catch (e) {
        return "Sorry, I'm having trouble connecting to the AI assistant right now.";
    }
}