const http = require('http');

const data = JSON.stringify({
  userProfile: {
    vaultSummary: [
      {
        title: "Income Certificate",
        category: "Government",
        documentType: "Income Certificate",
        extractedData: {
          annualFamilyIncome: "45000",
          categoryClassification: "OBC"
        }
      },
      {
        title: "SSLC Marks Card",
        category: "Education",
        documentType: "Marks Card",
        extractedData: {
          percentage: "96.6%",
          courseClass: "10th Standard"
        }
      }
    ]
  }
});

const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/opportunities/discover',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('Response:', body));
});

req.on('error', console.error);
req.write(data);
req.end();
