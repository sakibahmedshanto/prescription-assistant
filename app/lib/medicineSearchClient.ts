export interface MedicineSearchResult {
  medicine: {
    brandId: string;
    brandName: string;
    type: string;
    dosageForm: string;
    generic: string;
    strength: string;
    manufacturer: string;
    packageContainer: string;
    packageSize: string;
  };
  genericInfo?: any;
  relevanceScore: number;
}

export async function searchMedicinesClient(query: string): Promise<MedicineSearchResult[]> {
  if (!query || query.trim().length < 1) return [];

  try {
    const response = await fetch('/api/medicine-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        genericNames: [query],
        limit: 20
      }),
    });

    if (!response.ok) {
      throw new Error('Search failed');
    }

    const data = await response.json();

    if (data.success) {
      return data.medicines;
    }

    return [];
  } catch (error) {
    console.error('Medicine search error:', error);
    return [];
  }
}

// Simple client-side fallback search (if API fails)
export function simpleSearchMedicines(query: string, medicineList: any[]): MedicineSearchResult[] {
  if (!query || !medicineList.length) return [];

  const lowerQuery = query.toLowerCase();

  return medicineList
    .filter(med =>
      med.brandName?.toLowerCase().includes(lowerQuery) ||
      med.generic?.toLowerCase().includes(lowerQuery) ||
      med.manufacturer?.toLowerCase().includes(lowerQuery)
    )
    .slice(0, 20)
    .map(medicine => ({
      medicine,
      relevanceScore: 80
    }));
}