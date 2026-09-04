const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const models = ['gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.5-flash'];
  for (const model of models) {
    try {
      console.log('Testing', model);
      const res = await ai.models.generateContent({
        model,
        contents: "Hello"
      });
      console.log('SUCCESS:', model, res.text);
    } catch (e) {
      console.error('FAILED:', model, e.message);
    }
  }
}
run();
