const http = require('http');

function makeRequest(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/documents/analyze',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk.toString());
      res.on('end', () => resolve(JSON.parse(body)));
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log("--- TEST 1: AADHAAR ---");
  const res1 = await makeRequest({
    fileName: "aadhaar.pdf",
    textContext: "Government of India. Aadhaar. Name: Rahul Sharma. DOB: 15-08-1990. Gender: Male. Address: 123 Main Street, Bangalore, Karnataka. UID: 1234 5678 9012."
  });
  console.log(JSON.stringify(res1, null, 2));

  console.log("\n--- TEST 2: MARKS CARD ---");
  const res2 = await makeRequest({
    fileName: "mca_marks.pdf",
    textContext: "Visvesvaraya Technological University. Marks Card. Student: Priya Patel. USN: 1RV20MCA01. Course: MCA. Semester: 4. Academic Year: 2022. Exam Date: June 2022. Total Marks: 850/1000. Percentage: 85%. Class: First Class with Distinction."
  });
  console.log(JSON.stringify(res2, null, 2));

  console.log("\n--- TEST 3: INCOME CERTIFICATE ---");
  const res3 = await makeRequest({
    fileName: "income_cert.pdf",
    textContext: "Government of Karnataka. Income Certificate. This is to certify that the annual family income of Amit Kumar residing at Mysore is Rs. 75,000 (Seventy Five Thousand only). Certificate No: INC12345. Issue Date: 10-01-2026. Valid until: 09-01-2027. Issuing Authority: Tahsildar."
  });
  console.log(JSON.stringify(res3, null, 2));

  console.log("\n--- TEST 4: CASTE CERTIFICATE ---");
  const res4 = await makeRequest({
    fileName: "caste_cert.pdf",
    textContext: "Government of Maharashtra. Caste Certificate. Certified that Sneha Desai belongs to the OBC category. Certificate No: CST999. Issue Date: 05-05-2025."
  });
  console.log(JSON.stringify(res4, null, 2));
}

runTests().catch(console.error);
