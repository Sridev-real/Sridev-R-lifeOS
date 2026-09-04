const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const oldPrompt = `Identify 3-5 real-world opportunities (e.g., government schemes, scholarships, financial benefits, document renewals/upgrades) they might be eligible for in India. DO NOT hallucinate fake schemes. Only suggest well-known ones that match their profile (e.g. Post Matric Scholarship for OBC, EWS schemes, etc).

Respond ONLY with valid JSON:
{
  "opportunities": [
    {
      "id": "opp_auto_1",
      "title": "Opportunity Title",
      "category": "education",`;

const newPrompt = `Identify 3-5 real-world opportunities they might be eligible for in India based on their profile. DO NOT hallucinate fake schemes. Only suggest well-known ones that match their profile.
Categories to pick from: "Scholarships", "Government Benefits", "Education", "Financial Assistance", "Grants", "Tax Benefits", "Freelancer Grants".

Respond ONLY with valid JSON:
{
  "opportunities": [
    {
      "id": "opp_auto_1",
      "title": "Opportunity Title",
      "category": "Scholarships",`;

code = code.replace(oldPrompt, newPrompt);
fs.writeFileSync('server.ts', code);
