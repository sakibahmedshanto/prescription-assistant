'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { saveAs } from 'file-saver';

// Types matching your medicine database
interface Medicine {
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

interface MedicineHit {
  medicine: Medicine;
  genericInfo?: any;
  relevanceScore: number;
}

// Debounce hook
function useDebounce<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// Client-side medicine search function using API route
async function searchMedicines(query: string): Promise<MedicineHit[]> {
  if (!query || query.trim().length < 1) return [];

  try {
    const response = await fetch('/api/medicine-search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: query,
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

interface PrescriptionMedicine {
  id: string;
  brandName: string;
  generic: string;
  strength: string;
  dosageForm: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
  timing: string[];
}

interface RxEditorProps {
  initialData?: {
    patientName?: string;
    age?: string;
    gender?: string;
  };
}

export default function RxEditor({ initialData }: RxEditorProps) {
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<'patient' | 'diagnosis' | 'medicines' | 'tests' | 'advice' | 'summary' | 'notes'>('patient');

  // Patient Information
  const [patientName, setPatientName] = useState(initialData?.patientName || '');
  const [age, setAge] = useState(initialData?.age || '');
  const [gender, setGender] = useState(initialData?.gender || '');
  const [weight, setWeight] = useState('');
  const [contact, setContact] = useState('');
  const [patientId, setPatientId] = useState('');

  // Generate patient ID only on client side to avoid hydration mismatch
  useEffect(() => {
    if (!patientId) {
      setPatientId(`PAT-${Date.now().toString().slice(-6)}`);
    }
  }, [patientId]);

  // Medical Information
  const [diagnosis, setDiagnosis] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [tests, setTests] = useState('');
  const [advice, setAdvice] = useState('');
  const [summary, setSummary] = useState('');
  const [notes, setNotes] = useState('');

  // Medicines
  const [medicines, setMedicines] = useState<PrescriptionMedicine[]>([]);
  const [medSearchQuery, setMedSearchQuery] = useState('');
  const [medSearchResults, setMedSearchResults] = useState<MedicineHit[]>([]);
  const [showMedSearch, setShowMedSearch] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const debouncedSearch = useDebounce(medSearchQuery, 500);
  const previewRef = useRef<HTMLDivElement>(null);

  // Fix hydration: Use static date/time on server, update on client
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    // This only runs on client side
    const now = new Date();
    setCurrentDate(now.toLocaleDateString());
    setCurrentTime(now.toLocaleTimeString());
  }, []);

  // Medicine search effect
  useEffect(() => {
    let mounted = true;

    const performSearch = async () => {
      if (!debouncedSearch.trim()) {
        setMedSearchResults([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      const results = await searchMedicines(debouncedSearch);
      if (mounted) {
        setMedSearchResults(results);
        setIsSearching(false);
      }
    };

    performSearch();

    return () => {
      mounted = false;
    };
  }, [debouncedSearch]);

  // Add medicine from search result
  const addMedicine = (hit: MedicineHit) => {
    const newMed: PrescriptionMedicine = {
      id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      brandName: hit.medicine.brandName,
      generic: hit.medicine.generic,
      strength: hit.medicine.strength,
      dosageForm: hit.medicine.dosageForm,
      dosage: '1+0+1',
      frequency: 'After meals',
      duration: '7 days',
      instructions: '',
      timing: ['morning', 'evening']
    };

    setMedicines(prev => [...prev, newMed]);
    setMedSearchQuery('');
    setMedSearchResults([]);
    setShowMedSearch(false);
    setActiveSection('medicines');
  };

  // Add custom medicine manually
  const addCustomMedicine = () => {
    if (!medSearchQuery.trim()) return;

    const newMed: PrescriptionMedicine = {
      id: `med-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      brandName: medSearchQuery,
      generic: medSearchQuery,
      strength: '',
      dosageForm: 'Tablet',
      dosage: '1+0+1',
      frequency: 'After meals',
      duration: '7 days',
      instructions: '',
      timing: ['morning', 'evening']
    };

    setMedicines(prev => [...prev, newMed]);
    setMedSearchQuery('');
    setShowMedSearch(false);
    setActiveSection('medicines');
  };

  // Update medicine
  const updateMedicine = (id: string, updates: Partial<PrescriptionMedicine>) => {
    setMedicines(prev =>
      prev.map(med => med.id === id ? { ...med, ...updates } : med)
    );
  };

  // Remove medicine
  const removeMedicine = (id: string) => {
    setMedicines(prev => prev.filter(med => med.id !== id));
  };

  // Generate PDF
    const generatePDF = async () => {
    try {
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf')
        ]);

        if (!previewRef.current) {
        alert('No prescription content to generate PDF from');
        return null;
        }

        console.log('Generating PDF...');

        // Create a clone of the preview element to avoid modifying the original
        const element = previewRef.current;
        const clone = element.cloneNode(true) as HTMLElement;

        // Apply styles to ensure proper rendering and avoid lab() color issues
        clone.style.width = element.offsetWidth + 'px';
        clone.style.height = 'auto';
        clone.style.position = 'absolute';
        clone.style.left = '-9999px';
        clone.style.top = '0';
        clone.style.backgroundColor = '#ffffff';

        // Add the clone to the DOM temporarily
        document.body.appendChild(clone);

        const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        removeContainer: true,
        // Additional options to handle color issues
        onclone: (clonedDoc, element) => {
            // Force all elements to use RGB colors instead of lab()
            const allElements = element.querySelectorAll('*');
            allElements.forEach((el: Element) => {
            const htmlEl = el as HTMLElement;
            const computedStyle = window.getComputedStyle(htmlEl);

            // Force background color to RGB
            const bgColor = computedStyle.backgroundColor;
            if (bgColor && bgColor.includes('lab')) {
                htmlEl.style.backgroundColor = '#ffffff';
            }

            // Force text color to RGB
            const textColor = computedStyle.color;
            if (textColor && textColor.includes('lab')) {
                htmlEl.style.color = '#000000';
            }

            // Force border colors to RGB
            const borderColor = computedStyle.borderColor;
            if (borderColor && borderColor.includes('lab')) {
                htmlEl.style.borderColor = '#cccccc';
            }
            });
        }
        });

        // Remove the clone from DOM
        document.body.removeChild(clone);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = pdfWidth - 20; // margins
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 10;

        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        // Add new pages if content is too long
        while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
        }

        console.log('PDF generated successfully');
        return pdf;
    } catch (error) {
        console.error('PDF generation error:', error);

        // Fallback: Try simpler approach without cloning
        try {
        console.log('Trying fallback PDF generation...');
        const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
            import('html2canvas'),
            import('jspdf')
        ]);

        const canvas = await html2canvas(previewRef.current!, {
            scale: 1, // Lower scale for fallback
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            ignoreElements: (element) => {
            // Ignore problematic elements
            const style = window.getComputedStyle(element);
            return style.backgroundColor.includes('lab') ||
                    style.color.includes('lab') ||
                    style.borderColor.includes('lab');
            }
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgWidth = pdfWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);

        console.log('Fallback PDF generated successfully');
        return pdf;
        } catch (fallbackError) {
        console.error('Fallback PDF generation also failed:', fallbackError);
        alert('Error generating PDF. Please try printing the page directly using browser print (Ctrl+P).');
        return null;
        }
    }
    };

  // Print Prescription
    const printPrescription = async () => {
    console.log('Print button clicked');

    if (!hasPrescriptionContent) {
        alert('Please add some prescription content first');
        return;
    }

    try {
        const pdf = await generatePDF();
        if (pdf) {
        console.log('Saving PDF...');
        const blob = pdf.output('blob');
        saveAs(blob, `prescription_${patientId}_${Date.now()}.pdf`);
        console.log('PDF saved successfully');
        } else {
        // If PDF generation fails, offer browser print as fallback
        if (confirm('PDF generation failed. Would you like to print using browser print instead?')) {
            window.print();
        }
        }
    } catch (error) {
        console.error('Print error:', error);
        alert('Error printing prescription: ' + (error as Error).message);
    }
    };

  // Save to Firebase and CSV
  const savePrescription = async () => {
    console.log('Save to Firebase button clicked');

    if (!hasPrescriptionContent) {
      alert('Please add some prescription content first');
      return;
    }

    try {
      const pdf = await generatePDF();
      if (!pdf) {
        alert('Failed to generate PDF');
        return;
      }

      console.log('Converting PDF to base64...');
      // Convert PDF to base64 for server
      const pdfBase64 = pdf.output('datauristring').split(',')[1];

      const prescriptionData = {
        prescriptionId: `RX-${Date.now()}`,
        patientId,
        patientName,
        age,
        gender,
        diagnosis,
        medicines: JSON.stringify(medicines),
        tests,
        advice,
        doctorName: "Demo Doctor",
        createdAt: new Date().toISOString(),
        printedAt: new Date().toISOString(),
        historyFile: '',
        status: 'active',
        pdfBase64
      };

      console.log('Sending to server...', {
        prescriptionId: prescriptionData.prescriptionId,
        patientName: prescriptionData.patientName,
        medicinesCount: medicines.length
      });

      // Send to your API route
      const response = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prescriptionData)
      });

      console.log('Server response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Save successful:', result);
        alert('Prescription saved successfully! PDF: ' + result.pdfFilename);

        // Also download locally
        const blob = await pdf.output('blob');
        saveAs(blob, `prescription_${patientId}.pdf`);
      } else {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`Failed to save prescription: ${response.status} ${errorText}`);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Error saving prescription: ' + (error as Error).message);
    }
  };

  // Reset prescription
  const resetPrescription = () => {
    if (confirm('Are you sure you want to reset the prescription? All data will be lost.')) {
      setPatientName('');
      setAge('');
      setGender('');
      setWeight('');
      setContact('');
      setPatientId(''); // Clear it, useEffect will regenerate
      setDiagnosis('');
      setSymptoms('');
      setTests('');
      setAdvice('');
      setSummary('');
      setNotes('');
      setMedicines([]);
    }
  };

  // Check if prescription has content
  const hasPrescriptionContent = useMemo(() => {
    return patientName || diagnosis || medicines.length > 0 || tests || advice;
  }, [patientName, diagnosis, medicines, tests, advice]);

  // Sidebar sections
  const sections = [
    { key: 'patient' as const, label: 'Patient Info', icon: '👤' },
    { key: 'diagnosis' as const, label: 'Diagnosis & Symptoms', icon: '🩺' },
    { key: 'medicines' as const, label: 'Medicines', icon: '💊' },
    { key: 'tests' as const, label: 'Tests', icon: '🔬' },
    { key: 'advice' as const, label: 'Advice', icon: '💡' },
    { key: 'summary' as const, label: 'Summary', icon: '📋' },
    { key: 'notes' as const, label: 'Notes', icon: '📝' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Prescription Generator</h1>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={resetPrescription}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Delete Prescription</span>
              </button>

              {hasPrescriptionContent && (
                <button
                  onClick={printPrescription}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>Print PDF</span>
                </button>
              )}

              {hasPrescriptionContent && (
                <button
                  onClick={savePrescription}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span>Save to Firebase</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Collapsible Sidebar */}
          <div className={`transition-all duration-300 ${sidebarOpen ? 'w-80' : 'w-0 overflow-hidden'}`}>
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Prescription Sections</h3>
              <div className="space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.key}
                    onClick={() => setActiveSection(section.key)}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 ${
                      activeSection === section.key
                        ? 'bg-blue-50 border border-blue-200 text-blue-700'
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="text-lg">{section.icon}</span>
                    <span className="font-medium">{section.label}</span>
                  </button>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="mt-8 pt-6 border-t">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Quick Actions
                </h4>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowMedSearch(true)}
                    className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    💡 Search Medicines
                  </button>
                  <button
                    onClick={resetPrescription}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    🗑️ Clear All Data
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Patient Information - Full Width */}
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient Name *
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Enter patient name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Patient ID
                  </label>
                  <input
                    type="text"
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  <input
                    type="text"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="e.g., 35 years"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="text"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="e.g., 65 kg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact
                  </label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    placeholder="Phone number"
                  />
                </div>
              </div>
            </div>

            {/* Two Column Layout - Prescription Editor and Preview */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Prescription Editor Section */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Prescription Editor</h3>

                  {/* Diagnosis & Symptoms */}
                  {activeSection === 'diagnosis' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Diagnosis *
                        </label>
                        <textarea
                          value={diagnosis}
                          onChange={(e) => setDiagnosis(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          placeholder="Enter primary diagnosis..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Symptoms & Presentation
                        </label>
                        <textarea
                          value={symptoms}
                          onChange={(e) => setSymptoms(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                          placeholder="Describe symptoms, duration, severity..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Medicines Section */}
                  {activeSection === 'medicines' && (
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-semibold text-gray-900">Medicines</h4>
                        <button
                          onClick={() => setShowMedSearch(true)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Add Medicine</span>
                        </button>
                      </div>

                      {/* Medicine Search Modal */}
                      {showMedSearch && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
                            <div className="flex justify-between items-center mb-4">
                              <h4 className="text-lg font-semibold">Search Medicines</h4>
                              <button
                                onClick={() => setShowMedSearch(false)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>

                            <div className="flex gap-2 mb-4">
                              <input
                                type="text"
                                value={medSearchQuery}
                                onChange={(e) => setMedSearchQuery(e.target.value)}
                                placeholder="Search by brand name, generic, manufacturer..."
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                              />
                              <button
                                onClick={addCustomMedicine}
                                disabled={!medSearchQuery.trim()}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Add Custom
                              </button>
                            </div>

                            {isSearching && (
                              <div className="text-center py-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="text-gray-600 mt-2">Searching medicines...</p>
                              </div>
                            )}

                            <div className="max-h-96 overflow-y-auto">
                              {medSearchResults.map((result, index) => (
                                <div
                                  key={index}
                                  className="p-4 border-b hover:bg-gray-50 cursor-pointer"
                                  onClick={() => addMedicine(result)}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-semibold text-gray-900">
                                        {result.medicine.brandName}
                                      </div>
                                      <div className="text-sm text-gray-600">
                                        Generic: {result.medicine.generic}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        Strength: {result.medicine.strength} | Form: {result.medicine.dosageForm}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        Manufacturer: {result.medicine.manufacturer}
                                      </div>
                                    </div>
                                    <div className="text-green-600 font-semibold">Add</div>
                                  </div>
                                </div>
                              ))}

                              {medSearchQuery && !isSearching && medSearchResults.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                  No medicines found for "{medSearchQuery}"
                                  <div className="mt-2">
                                    <button
                                      onClick={addCustomMedicine}
                                      className="text-blue-600 hover:text-blue-800 font-medium"
                                    >
                                      Click here to add as custom medicine
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Current Medicines List */}
                      <div className="space-y-4">
                        {medicines.map((medicine) => (
                          <div key={medicine.id} className="border rounded-lg p-4 bg-gray-50">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h4 className="font-semibold text-gray-900">{medicine.brandName}</h4>
                                <p className="text-sm text-gray-600">{medicine.generic} • {medicine.strength}</p>
                              </div>
                              <button
                                onClick={() => removeMedicine(medicine.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                              <div>
                                <label className="block text-xs font-medium text-gray-500">Dosage</label>
                                <input
                                  type="text"
                                  value={medicine.dosage}
                                  onChange={(e) => updateMedicine(medicine.id, { dosage: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-gray-900"
                                  placeholder="e.g., 1+0+1"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500">Frequency</label>
                                <select
                                  value={medicine.frequency}
                                  onChange={(e) => updateMedicine(medicine.id, { frequency: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-gray-900"
                                >
                                  <option>After meals</option>
                                  <option>Before meals</option>
                                  <option>With meals</option>
                                  <option>Empty stomach</option>
                                  <option>As needed</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500">Duration</label>
                                <input
                                  type="text"
                                  value={medicine.duration}
                                  onChange={(e) => updateMedicine(medicine.id, { duration: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-gray-900"
                                  placeholder="e.g., 7 days"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500">Instructions</label>
                                <input
                                  type="text"
                                  value={medicine.instructions}
                                  onChange={(e) => updateMedicine(medicine.id, { instructions: e.target.value })}
                                  className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 text-gray-900"
                                  placeholder="Additional instructions"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        {medicines.length === 0 && (
                          <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                            <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <p className="mt-2">No medicines added yet</p>
                            <button
                              onClick={() => setShowMedSearch(true)}
                              className="mt-2 text-blue-600 hover:text-blue-800 font-medium"
                            >
                              Click here to add medicines
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Tests Section */}
                  {activeSection === 'tests' && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Recommended Tests</h4>
                      <textarea
                        value={tests}
                        onChange={(e) => setTests(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        placeholder="List recommended laboratory tests, imaging studies, or other investigations..."
                      />
                    </div>
                  )}

                  {/* Advice Section */}
                  {activeSection === 'advice' && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Patient Advice</h4>
                      <textarea
                        value={advice}
                        onChange={(e) => setAdvice(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        placeholder="Provide lifestyle advice, follow-up instructions, warning signs, etc..."
                      />
                    </div>
                  )}

                  {/* Summary Section */}
                  {activeSection === 'summary' && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Clinical Summary</h4>
                      <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        placeholder="Overall clinical summary and assessment..."
                      />
                    </div>
                  )}

                  {/* Notes Section */}
                  {activeSection === 'notes' && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Clinical Notes</h4>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={8}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        placeholder="Additional clinical notes, observations, or follow-up plans..."
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Prescription Preview Section */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Prescription Preview</h3>
                <div ref={previewRef} className="bg-white p-8 border-2 border-gray-200 rounded-lg">
                  {/* Clinic Header */}
                  <div className="text-center mb-8 pb-6 border-b-2 border-gray-300">
                    <div className="text-xs text-gray-500 mb-2 italic">
                      Demo Clinic Information - For demonstration purposes only
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Demo Clinic</h1>
                    <p className="text-gray-600 mb-1">123 Demo Road, Dhaka, Bangladesh</p>
                    <p className="text-gray-600">Phone: +880 XXXX-XXXXXX | Email: demo@clinic.com</p>
                  </div>

                  {/* Patient Information */}
                  <div className="mb-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">Patient Information</h2>
                        <div className="mt-2 space-y-1 text-sm">
                          <div><span className="font-medium">Name:</span> {patientName || '________________'}</div>
                          <div><span className="font-medium">Age/Gender:</span> {age || '___'} / {gender || '_______'}</div>
                          <div><span className="font-medium">Weight:</span> {weight || '___'} kg</div>
                          <div><span className="font-medium">Patient ID:</span> {patientId}</div>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <div>Date: {currentDate || 'Loading...'}</div>
                        <div>Time: {currentTime || 'Loading...'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Diagnosis */}
                  {diagnosis && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Diagnosis</h3>
                      <p className="text-gray-700">{diagnosis}</p>
                    </div>
                  )}

                  {/* Medicines */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">Prescription</h3>
                    {medicines.length > 0 ? (
                      <div className="space-y-4">
                        {medicines.map((medicine, index) => (
                          <div key={medicine.id} className="flex justify-between items-start py-2 border-b">
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900">{medicine.brandName}</div>
                              <div className="text-sm text-gray-600">
                                {medicine.generic} • {medicine.strength} • {medicine.dosageForm}
                              </div>
                              <div className="text-sm text-gray-700 mt-1">
                                <strong>Dosage:</strong> {medicine.dosage} • <strong>Frequency:</strong> {medicine.frequency}
                              </div>
                              <div className="text-sm text-gray-700">
                                <strong>Duration:</strong> {medicine.duration}
                                {medicine.instructions && ` • ${medicine.instructions}`}
                              </div>
                            </div>
                            <div className="text-right text-sm text-gray-500">
                              #{index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 italic">
                        No medicines prescribed yet
                      </div>
                    )}
                  </div>

                  {/* Tests and Advice */}
                  {(tests || advice) && (
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                      {tests && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Recommended Tests</h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{tests}</p>
                        </div>
                      )}
                      {advice && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Patient Advice</h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{advice}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Summary and Notes */}
                  {(summary || notes) && (
                    <div className="mb-6">
                      {summary && (
                        <div className="mb-4">
                          <h4 className="font-semibold text-gray-900 mb-2">Clinical Summary</h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{summary}</p>
                        </div>
                      )}
                      {notes && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Clinical Notes</h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-8 pt-6 border-t-2 border-gray-300">
                    <div className="flex justify-between items-end">
                      <div>
                        <div className="font-semibold text-gray-900">Demo Doctor</div>
                        <div className="text-sm text-gray-600">Consultant Physician (Demo)</div>
                        <div className="text-sm text-gray-600">BMDC: BMDC-00000 (Demo)</div>
                      </div>
                      <div className="text-right">
                        <div className="mb-8 border-t border-gray-400 pt-8 w-48 text-center">
                          <div className="text-sm text-gray-600">Signature</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 text-center mt-4 italic">
                      This is a demo prescription generated for testing purposes only
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}