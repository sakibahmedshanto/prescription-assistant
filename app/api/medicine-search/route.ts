import { NextRequest, NextResponse } from 'next/server';
import {
  searchMedicinesByGeneric,
  searchMedicinesByIndication,
  searchMedicinesCombined,
  getTopMedicines,
  MedicineSearchResult
} from '@/app/lib/medicineDatabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { genericNames = [], indications = [], limit = 20 } = body;

    if (!genericNames.length && !indications.length) {
      return NextResponse.json(
        { error: 'Please provide genericNames or indications' },
        { status: 400 }
      );
    }

    let results: MedicineSearchResult[] = [];

    if (genericNames.length && indications.length) {
      // Search by both
      results = searchMedicinesCombined(genericNames, indications);
    } else if (genericNames.length) {
      // Search by generic only
      results = searchMedicinesByGeneric(genericNames);
    } else {
      // Search by indication only
      results = searchMedicinesByIndication(indications);
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

