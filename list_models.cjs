const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const response = await ai.models.listModels();
  console.log(response.models.map(m => m.name));
}
run().catch(console.error);
