import { NextRequest, NextResponse } from 'next/server';
import {
  searchMedicinesByGeneric,
  searchMedicinesByIndication,
  searchMedicinesCombined,
  getTopMedicines,
  loadMedicineData
} from '@/app/lib/medicineDatabase';

export async function POST(request) {
  try {
    const body = await request.json();
    const { genericNames = [], indications = [], query, limit = 20 } = body;

    let results = [];

    // Handle simple query search (for RxEditor)
    if (query) {
      const medicines = loadMedicineData();
      const lowerQuery = query.toLowerCase();

      results = medicines
        .filter(med =>
          med.brandName?.toLowerCase().includes(lowerQuery) ||
          med.generic?.toLowerCase().includes(lowerQuery) ||
          med.manufacturer?.toLowerCase().includes(lowerQuery)
        )
        .slice(0, limit)
        .map(medicine => ({
          medicine,
          relevanceScore: 80
        }));
    }
    // Handle structured search (existing functionality)
    else if (genericNames.length && indications.length) {
      results = searchMedicinesCombined(genericNames, indications);
    } else if (genericNames.length) {
      results = searchMedicinesByGeneric(genericNames);
    } else if (indications.length) {
      results = searchMedicinesByIndication(indications);
    } else {
      return NextResponse.json(
        { error: 'Please provide query, genericNames, or indications' },
        { status: 400 }
      );
    }

    // Limit results
    const topResults = getTopMedicines(results, limit);

    return NextResponse.json({
      success: true,
      count: topResults.length,
      medicines: topResults
    });
  } catch (error) {
    console.error('Medicine search error:', error);
    return NextResponse.json(
      { error: 'Failed to search medicines' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Medicine search API is running'
  });
}