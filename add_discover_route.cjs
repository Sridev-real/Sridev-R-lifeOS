const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const targetStr = "// Opportunity Verification Analyzer";

if (code.includes(targetStr)) {
  const replacement = `// Opportunity Discovery Engine
app.post('/api/opportunities/discover', async (req: Request, res: Response) => {
  try {
    const { userProfile } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ opportunities: [] });
    }
    
    const prompt = \`Based on the user's Life Vault records and extracted data:
\${JSON.stringify(userProfile || {})}

Identify 3-5 real-world opportunities (e.g., government schemes, scholarships, financial benefits, document renewals/upgrades) they might be eligible for in India. DO NOT hallucinate fake schemes. Only suggest well-known ones that match their profile (e.g. Post Matric Scholarship for OBC, EWS schemes, etc).

Respond ONLY with valid JSON:
{
  "opportunities": [
    {
      "id": "opp_auto_1",
      "title": "Opportunity Title",
      "category": "education",
      "deadline": "YYYY-MM-DD",
      "matchReason": "Why they match based on their data",
      "eligibilityConfidence": "Likely eligible",
      "requiredDocuments": ["Doc 1", "Doc 2"],
      "verificationNotes": "Check portal X"
    }
  ]
}
\`;
    const { response } = await generateWithGemini(ai, prompt, {
      responseMimeType: 'application/json',
      temperature: 0.3
    });
    
    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (error) {
    console.error('Error in /api/opportunities/discover:', error);
    res.json({ opportunities: [] });
  }
});

// Opportunity Verification Analyzer`;

  code = code.replace(targetStr, replacement);
  fs.writeFileSync('server.ts', code);
  console.log("Added /api/opportunities/discover.");
} else {
  console.log("Could not find Opportunity Verification Analyzer.");
}
