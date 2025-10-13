# Bangladesh Medicine Suggestion System - User Guide

## Overview

The Prescription Assistant now includes an intelligent medicine suggestion system that analyzes doctor-patient conversations and recommends medicines available in Bangladesh. This feature combines AI-powered medical analysis with a comprehensive local medicine database.

## Features

### 1. **Intelligent Analysis**
- GPT analyzes conversations to extract:
  - Medical conditions and diagnoses
  - Generic medicine names needed
  - Dosage recommendations
  - Treatment duration
  - Safety considerations

### 2. **Bangladesh Medicine Database**
- **21,716+ medicines** from Bangladesh pharmaceutical companies
- **222 manufacturers** (Square, Beximco, Incepta, ACME, etc.)
- **2,045 medical indications**
- **455 drug classes**
- Complete details: brand names, generics, strengths, prices, dosage forms

### 3. **Smart Search**
- Searches by generic name
- Searches by medical condition/indication
- Combines both approaches for comprehensive results
- Ranks medicines by relevance

## How to Use

### Step 1: Record Conversation
Use the existing transcription feature to record a doctor-patient conversation.

### Step 2: Request Medicine Analysis
Click on the **"BD Medicine Suggestions"** tab in the Medical Analysis panel.

### Step 3: Generate Analysis
Click the **"Generate"** button to:
1. Analyze the conversation with GPT
2. Extract conditions and required medicines
3. Search Bangladesh medicine database
4. Display matching medicines

### Step 4: Review Suggestions
The system displays:
- **Medical Analysis**: Conditions, recommended generics, dosage, safety notes
- **Available BD Medicines**: Local medicines matching the recommendations
  - Brand name
  - Generic composition
  - Strength
  - Dosage form (tablet, syrup, injection, etc.)
  - Manufacturer
  - Package details
  - Indications
  - Drug class

## Example Workflow

```
Doctor: "Hello, what brings you in today?"
Patient: "I've had a severe headache and fever for 2 days."
Doctor: "Any other symptoms?"
Patient: "Yes, body aches and feeling weak."
Doctor: "I'll prescribe something for fever and pain relief."
```

**System Analysis:**
- Conditions: Fever, Headache, Body aches
- Recommended: Paracetamol, NSAIDs
- **BD Medicines Shown:**
  - Napa (Paracetamol 500mg) - Beximco
  - Ace (Paracetamol 500mg) - Square
  - Paracetamol (500mg) - Various manufacturers
  - Naproxen tablets - For pain/inflammation

## API Endpoints

### 1. Medicine Search API
**Endpoint:** `/api/medicine-search`  
**Method:** POST

**Request:**
```json
{
  "genericNames": ["Paracetamol", "Amoxicillin"],
  "indications": ["Fever", "Bacterial infection"],
  "limit": 20
}
```

**Response:**
```json
{
  "success": true,
  "count": 15,
  "medicines": [
    {
      "medicine": {
        "brandName": "Napa",
        "generic": "Paracetamol",
        "strength": "500 mg",
        "dosageForm": "Tablet",
        "manufacturer": "Beximco Pharmaceuticals Ltd.",
        "packageContainer": "Unit Price: ৳ 0.80"
      },
      "genericInfo": {
        "indication": "Fever, Pain relief",
        "drugClass": "Analgesics"
      },
      "relevanceScore": 100
    }
  ]
}
```

### 2. Analysis with Medicines
**Endpoint:** `/api/analyze`  
**Method:** POST

**Request:**
```json
{
  "conversation": "Doctor-patient conversation transcript...",
  "analysisType": "prescription_with_medicines"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": "Formatted analysis text...",
  "structuredData": {
    "conditions": ["Fever", "Headache"],
    "medicines": [...],
    "nonPharmacological": ["Rest", "Hydration"],
    "safetyNotes": ["Check for paracetamol allergies"]
  },
  "bdMedicines": [...]
}
```

## Database Structure

### Data Files Location
`Dataset/archive/`
- `medicine.csv` - All medicines with brand names, generics, prices
- `generic.csv` - Generic information with indications, drug classes
- `manufacturer.csv` - Pharmaceutical companies
- `indication.csv` - Medical conditions
- `drug class.csv` - Therapeutic classifications

### Medicine Search Logic
1. **By Generic Name**: Exact and partial matching
2. **By Indication**: Searches generic indications and descriptions
3. **Combined**: Merges results and removes duplicates
4. **Ranking**: Prioritizes exact matches over partial matches

## Safety & Disclaimers

### ⚠️ Important Medical Disclaimers

1. **Not a Replacement for Medical Judgment**
   - This is a clinical decision support tool
   - Final prescribing decisions must be made by licensed physicians
   - Always conduct complete patient evaluation

2. **Verify Before Prescribing**
   - Check patient allergies
   - Review current medications for interactions
   - Verify contraindications
   - Consider patient-specific factors (age, renal/hepatic function, pregnancy)

3. **Data Accuracy**
   - Medicine database is web-scraped and should be verified
   - Prices and availability may change
   - Always confirm with current pharmaceutical references

4. **Legal Responsibility**
   - Prescribing physician retains full legal responsibility
   - System provides suggestions, not prescriptions
   - Document clinical reasoning for all prescriptions

## Technical Implementation

### Medicine Database Utility
Located at: `app/lib/medicineDatabase.ts`

**Key Functions:**
- `searchMedicinesByGeneric(genericNames: string[])`
- `searchMedicinesByIndication(indications: string[])`
- `searchMedicinesCombined(genericNames, indications)`
- `getTopMedicines(results, limit)`

### Caching
- CSV data is cached in memory after first load
- Improves performance for subsequent searches
- Cache clears on server restart

### Error Handling
- Graceful fallback if data files not found
- Returns empty arrays instead of crashing
- Logs errors to console for debugging

## Future Enhancements

Potential improvements:
1. ✅ **Price comparison** between different brands
2. ✅ **Alternative medicine suggestions** (same generic, different brands)
3. 📋 **Drug interaction checker**
4. 📋 **Dosage calculator** based on patient weight/age
5. 📋 **Stock availability** integration with pharmacies
6. 📋 **Generic substitution recommendations**
7. 📋 **Cost-effective alternatives**
8. 📋 **Prescription formatting and printing**

## Troubleshooting

### No medicines found
- Check if Dataset folder exists in project root
- Verify CSV files are in `Dataset/archive/`
- Check console for parsing errors
- Ensure generic names are spelled correctly

### Slow performance
- First search loads CSV data (may take 1-2 seconds)
- Subsequent searches use cache (fast)
- Limit results to improve response time

### Inaccurate matches
- Use more specific generic names
- Add multiple indications for better matching
- Review GPT's extracted data in structuredData field

## Support

For issues or questions:
1. Check console logs for errors
2. Verify OpenAI API key is configured
3. Ensure Dataset files are accessible
4. Review API response for error messages

---

**Version:** 1.0.0  
**Last Updated:** October 2025  
**Developed for:** Bangladesh Medical Practice

