const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

const anchor = `- For Marks Card: extract student name, roll/register number, institution, university/board, course/class, semester/year, academic year, examination date, subjects, marks obtained, maximum marks, total marks, percentage, CGPA/grade, pass/fail, issue date.
 - For Student ID: extract student name, student ID/USN/enrollment number, institution, course, department, semester/year, admission/validity information.`;

const patch = `- For Marks Card: extract student name, roll/register number, institution, university/board, course/class, semester/year, academic year, examination date, subjects, marks obtained, maximum marks, total marks, percentage, CGPA/grade, pass/fail, issue date.
 - For Student ID: extract student name, student ID/USN/enrollment number, institution, course, department, semester/year, admission/validity information.
 - For Income Certificate: extract name, annual income (numeric and text), address, validity year.
 - For Caste Certificate: extract name, caste/category (e.g., OBC, SC, ST, General), issuing authority, date.
 - For Aadhaar: extract name, gender, DOB, address.`;

code = code.replace(anchor, patch);

fs.writeFileSync('server.ts', code);
console.log("Done patching extractedData prompt.");
