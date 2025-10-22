'use client';
import { useState } from 'react';
import { MedicalAnalysis as MedicalAnalysisType, AnalysisType } from '../types';
import {
  FileText,
  Activity,
  ClipboardList,
  Pill,
  Calendar,
  Loader2,
  RefreshCw
} from 'lucide-react';

interface MedicalAnalysisProps {
  analyses: Map<AnalysisType, MedicalAnalysisType>;
  onRequestAnalysis: (type: AnalysisType) => void;
  isAnalyzing: boolean;
}

const analysisConfig = {
  summary: {
    title: 'Medical Summary',
    icon: FileText,
    color: 'blue',
    description: 'Comprehensive visit summary'
  },
  symptoms: {
    title: 'Symptom Analysis',
    icon: Activity,
    color: 'red',
    description: 'Detected symptoms and patterns'
  },
  diagnosis: {
    title: 'Diagnosis',
    icon: ClipboardList,
    color: 'purple',
    description: 'Possible diagnoses and recommendations'
  },
  prescription: {
    title: 'Prescription',
    icon: Pill,
    color: 'green',
    description: 'Medication recommendations with Bangladesh medicines'
  }
};

export function MedicalAnalysis({
  analyses,
  onRequestAnalysis,
  isAnalyzing
}: MedicalAnalysisProps) {
  const [activeTab, setActiveTab] = useState<AnalysisType>('summary');

  const config = analysisConfig[activeTab];
  const Icon = config.icon;
  const analysis = analyses.get(activeTab);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Medical Analysis & Suggestions
      </h2>

      {/* Analysis Type Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {(Object.keys(analysisConfig) as AnalysisType[]).map((type) => {
          const tabConfig = analysisConfig[type];
          const TabIcon = tabConfig.icon;
          const hasAnalysis = analyses.has(type);

          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === type
                  ? `bg-${tabConfig.color}-500 text-white`
                  : `bg-gray-100 text-gray-700 hover:bg-gray-200`
              } ${hasAnalysis ? 'ring-2 ring-green-400' : ''}`}
            >
              <TabIcon className="w-4 h-4" />
              <span className="text-sm font-medium">{tabConfig.title}</span>
              {hasAnalysis && (
                <div className={`w-2 h-2 rounded-full bg-${tabConfig.color}-500`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Analysis Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon className={`w-6 h-6 text-${config.color}-500`} />
              <h3 className="text-lg font-semibold text-gray-800">
                {config.title}
              </h3>
            </div>

            <button
              onClick={() => onRequestAnalysis(activeTab)}
              disabled={isAnalyzing}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                isAnalyzing
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : `bg-${config.color}-500 text-white hover:bg-${config.color}-600`
              }`}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  {analysis ? 'Refresh' : (activeTab === 'prescription' ? 'Generate Prescription' : 'Generate')}
                </>
              )}
            </button>
          </div>

          <p className="text-sm text-gray-500">{config.description}</p>
        </div>

        {analysis ? (
          <div className="space-y-4">
            {/* Special display for prescription tab - PRESCRIPTION FORMAT */}
            {activeTab === 'prescription' && analysis.bdMedicines && analysis.bdMedicines.length > 0 ? (
              <div className="space-y-4">
                {/* Prescription Header */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border-2 border-green-200">
                  <h4 className="text-xl font-bold text-green-800 mb-2 flex items-center gap-2">
                    <Pill className="w-6 h-6" />
                    💊 Prescription
                  </h4>
                  <p className="text-sm text-green-700">
                    Bangladesh medicines with dosage instructions
                  </p>
                </div>

                {/* Prescription Items */}
                <div className="space-y-3">
                  {analysis.structuredData && analysis.structuredData.medicines && analysis.structuredData.medicines.map((med, idx) => {
                    const firstMedicine = analysis.bdMedicines.find(result =>
                      result.medicine.generic.toLowerCase() === med.genericName.toLowerCase()
                    );

                    if (!firstMedicine) return null;

                    return (
                      <div key={idx} className="bg-white rounded-lg border-2 border-green-200 p-4 hover:shadow-lg transition-all">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h5 className="font-bold text-gray-900 text-lg">
                              {firstMedicine.medicine.brandName} {firstMedicine.medicine.strength}
                            </h5>
                            <p className="text-sm text-green-700 font-semibold mt-1">
                              Generic name: {med.genericName}
                            </p>
                          </div>
                          <button className="text-blue-600 hover:text-blue-800 text-sm font-medium underline">
                            (click to see other alternatives)
                          </button>
                        </div>

                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-gray-800 font-medium">
                            {med.dosage || 'As directed by physician'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {med.instructions || 'Follow physician instructions'}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                  <p className="text-sm text-yellow-900 leading-relaxed">
                    <strong>⚠️ Medical Disclaimer:</strong> This prescription is for reference only.
                    Always verify patient allergies, contraindications, and potential drug interactions before prescribing.
                    Final medication selection and dosage must be determined by a licensed physician based on complete patient evaluation.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Main Analysis Content for other tabs */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap text-gray-700">
                      {analysis.content}
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-gray-400">
                    Generated at {analysis.timestamp.toLocaleTimeString()}
                  </div>
                </div>

                {/* Bangladesh Medicines Section */}
                {analysis.bdMedicines && analysis.bdMedicines.length > 0 && (
                  <div className="bg-white rounded-lg border-2 border-teal-200 p-4">
                    {analysis.structuredData && (
                      <>
                        {analysis.structuredData.conditions && analysis.structuredData.conditions.length > 0 && (
                          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 mb-4 border border-blue-200">
                            <h4 className="text-lg font-bold text-blue-800 mb-2">
                              🩺 Diagnosed Conditions
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {analysis.structuredData.conditions.map((condition, idx) => (
                                <span
                                  key={idx}
                                  className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium"
                                >
                                  {condition}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {analysis.structuredData.medicines && analysis.structuredData.medicines.length > 0 && (
                          <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4 mb-4 border border-green-200">
                            <h4 className="text-lg font-bold text-green-800 mb-3">
                              💊 Recommended Generic Medicines
                            </h4>
                            <div className="space-y-2">
                              {analysis.structuredData.medicines.map((med, idx) => (
                                <div key={idx} className="bg-white rounded-lg p-3 border border-green-100">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <h5 className="font-bold text-gray-800">{med.genericName}</h5>
                                      <p className="text-sm text-gray-600 mt-1">
                                        <span className="font-medium">For:</span> {med.indication}
                                      </p>
                                      <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                        <span>📋 {med.dosage}</span>
                                        <span>⏱️ {med.duration}</span>
                                      </div>
                                      {med.instructions && (
                                        <p className="text-xs text-blue-600 mt-1">
                                          ℹ️ {med.instructions}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <h4 className="text-lg font-semibold text-teal-700 mb-3 flex items-center gap-2">
                      <Pill className="w-5 h-5" />
                      💊 Available Bangladesh Medicines ({analysis.bdMedicines.length})
                    </h4>

                    <div className="grid gap-3 max-h-96 overflow-y-auto">
                      {analysis.bdMedicines.map((result, idx) => (
                        <div
                          key={`${result.medicine.brandId}-${idx}`}
                          className="bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg p-4 border border-teal-100 hover:shadow-md transition-shadow"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h5 className="font-bold text-gray-800 text-base">
                                {result.medicine.brandName}
                              </h5>
                              <p className="text-sm text-teal-600 font-medium">
                                {result.medicine.generic}
                              </p>
                            </div>
                            <span className="bg-teal-500 text-white text-xs px-2 py-1 rounded-full">
                              {result.medicine.type}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                            <div>
                              <span className="text-gray-500">Strength:</span>
                              <p className="text-gray-700 font-medium">{result.medicine.strength}</p>
                            </div>
                            <div>
                              <span className="text-gray-500">Form:</span>
                              <p className="text-gray-700 font-medium">{result.medicine.dosageForm}</p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-500">Manufacturer:</span>
                              <p className="text-gray-700 font-medium">{result.medicine.manufacturer}</p>
                            </div>
                            {result.medicine.packageContainer && (
                              <div className="col-span-2">
                                <span className="text-gray-500">Package:</span>
                                <p className="text-gray-700 font-medium">{result.medicine.packageContainer}</p>
                              </div>
                            )}
                          </div>

                          {result.genericInfo && result.genericInfo.indication && (
                            <div className="mt-3 pt-3 border-t border-teal-200">
                              <span className="text-gray-500 text-xs">Indication:</span>
                              <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                                {result.genericInfo.indication}
                              </p>
                            </div>
                          )}

                          {result.genericInfo && result.genericInfo.drugClass && (
                            <div className="mt-2">
                              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                {result.genericInfo.drugClass}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-xs text-yellow-800">
                        <strong>⚠️ Medical Disclaimer:</strong> This information is for reference only.
                        Always verify patient allergies, contraindications, and drug interactions before prescribing.
                        Final medication selection must be made by a licensed physician.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-lg">
            <Icon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No analysis yet</p>
            <p className="text-sm mt-1">
              Click &quot;Generate&quot; to analyze the conversation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}