const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const regex = /let contentsPayload: any = sanitizedMessage;[\s\S]*?if \(!replyText\) {/;

const replacement = `let contentsPayload: any = [{ role: 'user', parts: [{ text: sanitizedMessage }] }];
    
    // Add history support
    const history = req.body.history || [];
    if (Array.isArray(history) && history.length > 0) {
      contentsPayload = history.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content || '' }]
      }));
      contentsPayload.push({ role: 'user', parts: [{ text: sanitizedMessage }] });
    }

    // Multimodal payload assembly if attachments exist
    if (Array.isArray(attachments) && attachments.length > 0) {
      const parts: any[] = [];
      for (const att of attachments) {
        if (att.data && att.type) {
          const cleanBase64 = att.data.includes('base64,') ? att.data.split('base64,')[1] : att.data;
          parts.push({
            inlineData: {
              data: cleanBase64,
              mimeType: att.type === 'application/pdf' ? 'application/pdf' : (att.type || 'image/jpeg')
            }
          });
        }
      }
      parts.push({ text: sanitizedMessage || 'Please analyze this attached document.' });
      
      // Replace the last user message with the multimodal parts
      contentsPayload[contentsPayload.length - 1].parts = parts;
    }

    let replyText = '';
    let executionPayload = null;
    let modelUsed = 'system-intelligence';

    try {
      // Append a clear instruction for structured output
      const finalInstruction = systemInstruction + \`
      
7. STRUCTURED ACTION EXECUTION:
If the user explicitly asks to "Save this", "Add a reminder", "Create a task", "Update my record", or "Track this deadline", you MUST provide a structured execution payload in JSON format embedded in your response. 
Format it EXACTLY like this inside a markdown code block labeled \`\`\`json execution:
\`\`\`json execution
{
  "type": "deadline" | "action" | "vault",
  "title": "Action Title",
  "description": "Action Details",
  "dueDate": "YYYY-MM-DD",
  "priority": "high" | "medium" | "low",
  "category": "String"
}
\`\`\`
Do not include this JSON unless an action is actually requested and ready to be confirmed.\`;

      const result = await generateWithGemini(ai, contentsPayload, {
        systemInstruction: finalInstruction,
        temperature: 0.2,
      });
      replyText = result.response.text || '';
      modelUsed = result.modelUsed;
      
      // Extract execution payload if present
      const execMatch = replyText.match(/\`\`\`json execution\\n([\\s\\S]*?)\\n\`\`\`/);
      if (execMatch && execMatch[1]) {
        try {
          executionPayload = JSON.parse(execMatch[1]);
          replyText = replyText.replace(execMatch[0], '').trim();
        } catch (e) {
          console.error('Failed to parse execution payload from Gemini');
        }
      }
    } catch (genError: any) {
      console.log('[Gemini Quota/Connection Notice] Switching to local fallback:', genError?.message);
      replyText = generateIntelligentFallback(sanitizedMessage || 'Attached document analysis', context);
      modelUsed = 'local-intelligence-engine';
    }

    if (!replyText) {`;

content = content.replace(regex, replacement);

fs.writeFileSync('server.ts', content);
console.log('Patched server.ts copilot chat');
