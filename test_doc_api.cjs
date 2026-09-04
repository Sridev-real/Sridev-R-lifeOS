const http = require('http');

const runTest = (testName, fileName, textContext) => {
  return new Promise((resolve) => {
    // Only send textContext and fileName so it sends a pure text prompt
    const data = JSON.stringify({
      fileName,
      textContext
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/documents/analyze',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          console.log(`\n=== TEST: ${testName} ===`);
          console.log(`Document Type: ${result.documentType}`);
          console.log(`Category: ${result.category}`);
          console.log(`isIncomplete: ${result.isIncomplete}`);
          console.log(`hasExpiry: ${result.hasExpiry}`);
          console.log(`Expiry Date: ${result.expiryDate}`);
          console.log(`Extracted Data: ${JSON.stringify(result.extractedData, null, 2)}`);
          if (result.error) console.log("ERROR:", result.error);
        } catch (e) {
          console.log(`Failed to parse response: ${body}`);
        }
        resolve();
      });
    });
    
    req.on('error', e => {
      console.log(`Error: ${e.message}`);
      resolve();
    });

    req.write(data);
    req.end();
  });
};

(async () => {
  console.log("Waiting for server to fully start...");
  
  await runTest(
    "Aadhaar Card", 
    "aadhaar_card.pdf", 
    "Aadhaar card for John Doe. DOB: 01/01/1990. Gender: Male. Address: 123 Main St, Bangalore."
  );
  
  await runTest(
    "Marks Card", 
    "SSLC_Marks_Card.pdf", 
    "SSLC 10th Standard Marks Card. Student: Jane Doe. Reg No: 2021A123. School: National High School. Total Marks: 580/600. Percentage: 96.6%. Issue Date: 15/05/2021."
  );
  
  await runTest(
    "Income Certificate", 
    "Income_Certificate_Kannada.pdf", 
    "Income certificate issued by Tahsildar. Name: Sridev. Annual Family Income: Rs. 45000. Validity: 1 year from issue date (issued 10/01/2026)."
  );
})();
