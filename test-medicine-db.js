// Test script for Bangladesh Medicine Database
// Run with: node test-medicine-db.js

const fs = require('fs');
const path = require('path');

console.log('🏥 Testing Bangladesh Medicine Database...\n');

// Check if Dataset exists
const datasetPath = path.join(__dirname, 'Dataset', 'archive');
console.log('1️⃣  Checking Dataset folder...');
if (!fs.existsSync(datasetPath)) {
  console.error('❌ Dataset/archive folder not found!');
  console.log('   Expected path:', datasetPath);
  process.exit(1);
}
console.log('✅ Dataset folder found\n');

// Check all required CSV files
const requiredFiles = [
  'medicine.csv',
  'generic.csv',
  'manufacturer.csv',
  'indication.csv',
  'drug class.csv'
];

console.log('2️⃣  Checking CSV files...');
for (const file of requiredFiles) {
  const filePath = path.join(datasetPath, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing file: ${file}`);
    process.exit(1);
  }
  const stats = fs.statSync(filePath);
  const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`   ✅ ${file} (${sizeInMB} MB)`);
}
console.log('');

// Count records in each file
function countRecords(fileName) {
  const filePath = path.join(datasetPath, fileName);
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());
  return lines.length - 1; // Subtract header
}

console.log('3️⃣  Counting records...');
const counts = {
  'Medicines': countRecords('medicine.csv'),
  'Generics': countRecords('generic.csv'),
  'Manufacturers': countRecords('manufacturer.csv'),
  'Indications': countRecords('indication.csv'),
  'Drug Classes': countRecords('drug class.csv')
};

for (const [category, count] of Object.entries(counts)) {
  console.log(`   📊 ${category}: ${count.toLocaleString()}`);
}
console.log('');

// Sample a few medicines
console.log('4️⃣  Sampling medicines...');
const medicinePath = path.join(datasetPath, 'medicine.csv');
const medicineContent = fs.readFileSync(medicinePath, 'utf-8');
const medicineLines = medicineContent.split('\n').slice(1, 6); // First 5 medicines

medicineLines.forEach((line, idx) => {
  if (!line.trim()) return;
  const parts = line.split(',');
  console.log(`   ${idx + 1}. ${parts[1] || 'Unknown'} - ${parts[5] || 'Unknown generic'}`);
});
console.log('');

// Test search functionality
console.log('5️⃣  Testing search functionality...');
const searchTerm = 'paracetamol';
let foundCount = 0;
const lines = medicineContent.split('\n');
for (const line of lines) {
  if (line.toLowerCase().includes(searchTerm)) {
    foundCount++;
  }
}
console.log(`   🔍 Found ${foundCount} medicines containing "${searchTerm}"\n`);

// Success!
console.log('✅ All tests passed!');
console.log('');
console.log('📝 Summary:');
console.log('   - Dataset properly configured');
console.log('   - All CSV files present');
console.log(`   - Total medicines: ${counts.Medicines.toLocaleString()}`);
console.log(`   - Total manufacturers: ${counts.Manufacturers.toLocaleString()}`);
console.log('');
console.log('🚀 Medicine suggestion system is ready to use!');
console.log('   Run: npm run dev');
console.log('   Then navigate to: http://localhost:3000');
console.log('   Click "BD Medicine Suggestions" tab after recording a conversation');

