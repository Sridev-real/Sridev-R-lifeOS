const fs = require('fs');
const content = fs.readFileSync('server.ts', 'utf8');

const newFunc = `async function generateWithGemini(ai: GoogleGenAI, contents: any, config: any) {
  const modelsToTry = [
    'gemini-3.7-flash',
    'gemini-3.1-flash-lite'
  ];
  let lastError: any = null;
  
  for (const model of modelsToTry) {
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      try {
        console.log(\`[Gemini Request] Model: \${model}, Attempt: \${attempts + 1}\`);
        const response = await ai.models.generateContent({
          model,
          contents,
          config
        });
        return { response, modelUsed: model };
      } catch (err: any) {
        lastError = err;
        const errMsg = err.message || String(err);
        
        // If it's a network error or 503, retry once
        if (errMsg.includes('fetch failed') || errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('timeout')) {
          attempts++;
          if (attempts < maxAttempts) {
            console.log(\`[Gemini Notice] Network glitch with \${model}, retrying in 1s...\`);
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
        }
        
        // For other errors (or if retries exhausted), break out of the while loop to try the next model
        console.log(\`[Gemini Notice] Switching from \${model} due to API response.\`);
        break;
      }
    }
  }
  
  throw lastError;
}`;

const patchedContent = content.replace(
/async function generateWithGemini\(ai: GoogleGenAI, contents: any, config: any\) \{[\s\S]*?throw lastError;\n\}/, 
newFunc
);

fs.writeFileSync('server.ts', patchedContent);
console.log('Patched generateWithGemini');
