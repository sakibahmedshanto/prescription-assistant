import fs from 'fs';
import path from 'path';

export interface Medicine {
  brandId: string;
  brandName: string;
  type: string;
  dosageForm: string;
  generic: string;
  strength: string;
  manufacturer: string;
  packageContainer: string;
  packageSize: string;
}

export interface Generic {
  genericId: string;
  genericName: string;
  drugClass: string;
  indication: string;
  indicationDescription: string;
  therapeuticClass: string;
  pharmacology: string;
}

export interface Manufacturer {
  manufacturerId: string;
  manufacturerName: string;
  genericsCount: string;
  brandNamesCount: string;
}

export interface Indication {
  indicationId: string;
  indicationName: string;
  genericsCount: string;
}

export interface DrugClass {
  drugClassId: string;
  drugClassName: string;
  genericsCount: string;
}

// Cache for parsed CSV data
let medicineCache: Medicine[] | null = null;
let genericCache: Generic[] | null = null;
let manufacturerCache: Manufacturer[] | null = null;
let indicationCache: Indication[] | null = null;
let drugClassCache: DrugClass[] | null = null;

function parseCSV(content: string): any[] {
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const data: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Handle CSV with quoted fields and commas inside quotes
    const values: string[] = [];
    let currentValue = '';
    let insideQuotes = false;

    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    values.push(currentValue.trim());

    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    data.push(row);
  }

  return data;
}

export function loadMedicineData(): Medicine[] {
  if (medicineCache) return medicineCache;

  try {
    const dataPath = path.join(process.cwd(), 'Dataset', 'archive', 'medicine.csv');
    const content = fs.readFileSync(dataPath, 'utf-8');
    const rawData = parseCSV(content);

    medicineCache = rawData.map(row => ({
      brandId: row['brand id'],
      brandName: row['brand name'],
      type: row['type'],
      dosageForm: row['dosage form'],
      generic: row['generic'],
      strength: row['strength'],
      manufacturer: row['manufacturer'],
      packageContainer: row['package container'],
      packageSize: row['Package Size']
    }));

    return medicineCache;
  } catch (error) {
    console.error('Error loading medicine data:', error);
    return [];
  }
}

export function loadGenericData(): Generic[] {
  if (genericCache) return genericCache;

  try {
    const dataPath = path.join(process.cwd(), 'Dataset', 'archive', 'generic.csv');
    const content = fs.readFileSync(dataPath, 'utf-8');
    const rawData = parseCSV(content);

    genericCache = rawData.map(row => ({
      genericId: row['generic id'],
      genericName: row['generic name'],
      drugClass: row['drug class'],
      indication: row['indication'],
      indicationDescription: row['indication description'],
      therapeuticClass: row['therapeutic class description'],
      pharmacology: row['pharmacology description']
    }));

    return genericCache;
  } catch (error) {
    console.error('Error loading generic data:', error);
    return [];
  }
}

function loadIndicationData(): Indication[] {
  if (indicationCache) return indicationCache;

  try {
    const dataPath = path.join(process.cwd(), 'Dataset', 'archive', 'indication.csv');
    const content = fs.readFileSync(dataPath, 'utf-8');
    const rawData = parseCSV(content);

    indicationCache = rawData.map(row => ({
      indicationId: row['indication id'],
      indicationName: row['indication name'],
      genericsCount: row['generics count']
    }));

    return indicationCache;
  } catch (error) {
    console.error('Error loading indication data:', error);
    return [];
  }
}

function loadDrugClassData(): DrugClass[] {
  if (drugClassCache) return drugClassCache;

  try {
    const dataPath = path.join(process.cwd(), 'Dataset', 'archive', 'drug class.csv');
    const content = fs.readFileSync(dataPath, 'utf-8');
    const rawData = parseCSV(content);

    drugClassCache = rawData.map(row => ({
      drugClassId: row['drug class id'],
      drugClassName: row['drug class name'],
      genericsCount: row['generics count']
    }));

    return drugClassCache;
  } catch (error) {
    console.error('Error loading drug class data:', error);
    return [];
  }
}

export interface MedicineSearchResult {
  medicine: Medicine;
  genericInfo?: Generic;
  relevanceScore: number;
}

export function searchMedicinesByGeneric(genericNames: string[]): MedicineSearchResult[] {
  const medicines = loadMedicineData();
  const generics = loadGenericData();
  const results: MedicineSearchResult[] = [];

  // Normalize search terms
  const normalizedSearchTerms = genericNames.map(name => 
    name.toLowerCase().trim()
  );

  // Search medicines
  for (const medicine of medicines) {
    const medicineGeneric = medicine.generic.toLowerCase();
    
    for (const searchTerm of normalizedSearchTerms) {
      // Exact match or contains match
      if (medicineGeneric === searchTerm || medicineGeneric.includes(searchTerm)) {
        // Find additional generic info
        const genericInfo = generics.find(g => 
          g.genericName.toLowerCase() === medicine.generic.toLowerCase()
        );

        results.push({
          medicine,
          genericInfo,
          relevanceScore: medicineGeneric === searchTerm ? 100 : 80
        });
        break;
      }
    }
  }

  // Sort by relevance score
  return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
}

export function searchMedicinesByIndication(indications: string[]): MedicineSearchResult[] {
  const medicines = loadMedicineData();
  const generics = loadGenericData();
  const results: MedicineSearchResult[] = [];

  // Normalize search terms
  const normalizedIndications = indications.map(ind => 
    ind.toLowerCase().trim()
  );

  // First, find generics that match the indications
  const matchingGenerics = generics.filter(generic => {
    const genericIndication = generic.indication.toLowerCase();
    const genericIndicationDesc = generic.indicationDescription.toLowerCase();
    
    return normalizedIndications.some(indication => 
      genericIndication.includes(indication) || 
      genericIndicationDesc.includes(indication)
    );
  });

  // Then find medicines for those generics
  for (const generic of matchingGenerics) {
    const matchingMedicines = medicines.filter(med => 
      med.generic.toLowerCase() === generic.genericName.toLowerCase()
    );

    for (const medicine of matchingMedicines) {
      results.push({
        medicine,
        genericInfo: generic,
        relevanceScore: 90
      });
    }
  }

  return results;
}

export function searchMedicinesCombined(
  genericNames: string[], 
  indications: string[]
): MedicineSearchResult[] {
  const genericResults = searchMedicinesByGeneric(genericNames);
  const indicationResults = searchMedicinesByIndication(indications);

  // Combine and deduplicate results
  const combinedMap = new Map<string, MedicineSearchResult>();

  for (const result of [...genericResults, ...indicationResults]) {
    const key = result.medicine.brandId;
    const existing = combinedMap.get(key);
    
    if (!existing || result.relevanceScore > existing.relevanceScore) {
      combinedMap.set(key, result);
    }
  }

  return Array.from(combinedMap.values())
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
}

// Get top medicines (limit results)
export function getTopMedicines(
  results: MedicineSearchResult[], 
  limit: number = 20
): MedicineSearchResult[] {
  return results.slice(0, limit);
}

