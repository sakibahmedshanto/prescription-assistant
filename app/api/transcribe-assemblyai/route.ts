import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const ASSEMBLYAI_BASE_URL = 'https://api.assemblyai.com/v2';

const getAssemblyAIHeaders = () => {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    throw new Error('ASSEMBLYAI_API_KEY environment variable is required');
  }
  return {
    authorization: apiKey,
    'Content-Type': 'application/json'
  };
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioContent, config, isTraining, voiceProfile } = body;

    if (!audioContent) {
      return NextResponse.json(
        { error: 'Audio content is required' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const audioBuffer = Buffer.from(audioContent, 'base64');

    // Save to temporary file
    const tempDir = join(process.cwd(), 'temp');
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    const tempFilePath = join(tempDir, `audio_${Date.now()}.webm`);
    writeFileSync(tempFilePath, audioBuffer);

    try {
      // Upload audio to AssemblyAI
      const uploadResponse = await axios.post(
        `${ASSEMBLYAI_BASE_URL}/upload`,
        audioBuffer,
        {
          headers: {
            authorization: getAssemblyAIHeaders().authorization
          }
        }
      );

      const uploadUrl = uploadResponse.data.upload_url;

      // Start transcription with enhanced speaker diarization
      const transcriptionData = {
        audio_url: uploadUrl,
        speaker_labels: true,
        speakers_expected: isTraining ? 1 : 2,
        language_code: 'en_us',
        punctuate: true,
        format_text: true,
        // Enhanced settings for better speaker detection
        auto_highlights: true, // Helps identify key medical terms
        entity_detection: true, // Detects medical entities
        sentiment_analysis: false,
        word_boost: [
          // Medical terminology (Doctor indicators)
          'doctor', 'physician', 'diagnose', 'diagnosis', 'prescription', 
          'medication', 'treatment', 'examine', 'symptoms', 'condition',
          'blood pressure', 'temperature', 'pulse', 'heart rate',
          'mg', 'dosage', 'twice daily', 'three times', 'follow up',
          
          // Patient indicators
          'patient', 'feel', 'pain', 'hurt', 'ache', 'sick', 'uncomfortable',
          'started', 'began', 'experiencing', 'having', 'getting',
          
          // Common medical terms
          'medical', 'health', 'clinic', 'hospital', 'appointment'
        ],
        boost_param: 'high'
      };

      const transcriptResponse = await axios.post(
        `${ASSEMBLYAI_BASE_URL}/transcript`,
        transcriptionData,
        {
          headers: getAssemblyAIHeaders()
        }
      );

      const transcriptId = transcriptResponse.data.id;

      // Poll for completion
      const pollingEndpoint = `${ASSEMBLYAI_BASE_URL}/transcript/${transcriptId}`;
      
      let transcriptionResult;
      let attempts = 0;
      const maxAttempts = 60; // 3 minutes max

      while (attempts < maxAttempts) {
        const pollingResponse = await axios.get(pollingEndpoint, {
          headers: getAssemblyAIHeaders()
        });

        transcriptionResult = pollingResponse.data;

        if (transcriptionResult.status === 'completed') {
          break;
        } else if (transcriptionResult.status === 'error') {
          throw new Error(`Transcription failed: ${transcriptionResult.error}`);
        }

        // Wait 3 seconds before next poll
        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
      }

      if (transcriptionResult.status !== 'completed') {
        throw new Error('Transcription timeout');
      }

      // Process utterances with enhanced speaker mapping
      const speakerSegments = processUtterancesEnhanced(
        transcriptionResult.utterances || [],
        transcriptionResult.auto_highlights || [],
        transcriptionResult.entities || [],
        isTraining,
        voiceProfile
      );

      // If training, return voice features
      if (isTraining) {
        const voiceFeatures = extractVoiceFeatures(transcriptionResult, speakerSegments);
        return NextResponse.json({
          success: true,
          transcriptions: [transcriptionResult],
          speakerSegments,
          voiceFeatures,
          isTraining: true,
        });
      }

      return NextResponse.json({
        success: true,
        transcriptions: [transcriptionResult],
        speakerSegments,
      });

    } finally {
      // Clean up temporary file
      try {
        unlinkSync(tempFilePath);
      } catch (err) {
        console.warn('Could not delete temp file:', err);
      }
    }

  } catch (error: any) {
    console.error('AssemblyAI transcription error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to transcribe audio',
        details: error.response?.data || error.toString()
      },
      { status: 500 }
    );
  }
}

// Enhanced helper function to process utterances with intelligent speaker mapping
function processUtterancesEnhanced(
  utterances: any[], 
  autoHighlights: any[] = [],
  entities: any[] = [],
  isTraining: boolean = false,
  voiceProfile: any = null
) {
  if (!utterances || utterances.length === 0) return [];

  // For training, everything is Doctor
  if (isTraining) {
    return utterances.map(utterance => ({
      speaker: 'Doctor',
      text: utterance.text,
      startTime: utterance.start,
      endTime: utterance.end,
      confidence: utterance.confidence || 0,
    }));
  }

  // If voice profile exists, use voice recognition for doctor identification
  if (voiceProfile && voiceProfile.voiceSignature) {
    return processWithVoiceRecognition(utterances, voiceProfile);
  }

  // Enhanced speaker analysis
  const speakerAnalysis = new Map<string, {
    utteranceCount: number;
    totalWords: number;
    questionCount: number;
    medicalTermCount: number;
    avgConfidence: number;
    totalDuration: number;
    firstSpeaker: boolean;
    commandPhrases: number;
  }>();

  // Medical terminology patterns
  const medicalTerms = [
    'diagnose', 'diagnosis', 'prescription', 'medication', 'treatment',
    'examine', 'symptoms', 'condition', 'blood pressure', 'temperature',
    'pulse', 'heart rate', 'mg', 'dosage', 'follow up', 'recommend',
    'suggest', 'prescribe', 'test', 'lab', 'results', 'chronic', 'acute'
  ];

  const commandPhrases = [
    'let me', 'i need to', 'i want to', 'i\'m going to', 'we should',
    'you need to', 'you should', 'take this', 'come back', 'schedule'
  ];

  const questionWords = ['what', 'when', 'where', 'how', 'why', 'can you', 'do you', 'have you', 'are you'];

  // Analyze each utterance
  utterances.forEach((utterance, index) => {
    const speaker = utterance.speaker;
    const text = utterance.text.toLowerCase();
    const words = text.split(/\s+/);
    const duration = utterance.end - utterance.start;

    if (!speakerAnalysis.has(speaker)) {
      speakerAnalysis.set(speaker, {
        utteranceCount: 0,
        totalWords: 0,
        questionCount: 0,
        medicalTermCount: 0,
        avgConfidence: 0,
        totalDuration: 0,
        firstSpeaker: index === 0,
        commandPhrases: 0
      });
    }

    const analysis = speakerAnalysis.get(speaker)!;
    analysis.utteranceCount++;
    analysis.totalWords += words.length;
    analysis.avgConfidence += utterance.confidence || 0;
    analysis.totalDuration += duration;

    // Count questions (doctors ask more questions)
    const hasQuestion = questionWords.some(q => text.includes(q)) || text.includes('?');
    if (hasQuestion) analysis.questionCount++;

    // Count medical terms (doctors use more medical terminology)
    const medicalCount = medicalTerms.filter(term => text.includes(term)).length;
    analysis.medicalTermCount += medicalCount;

    // Count command phrases (doctors give more instructions)
    const commandCount = commandPhrases.filter(phrase => text.includes(phrase)).length;
    analysis.commandPhrases += commandCount;
  });

  // Calculate scores for each speaker
  const speakerScores = new Map<string, number>();
  
  speakerAnalysis.forEach((analysis, speaker) => {
    let score = 0;

    // More utterances = more likely to be doctor (weight: 2)
    score += (analysis.utteranceCount / utterances.length) * 2;

    // More words = more likely to be doctor (weight: 1.5)
    const totalWords = Array.from(speakerAnalysis.values()).reduce((sum, a) => sum + a.totalWords, 0);
    score += (analysis.totalWords / totalWords) * 1.5;

    // More questions = more likely to be doctor (weight: 3)
    const totalQuestions = Array.from(speakerAnalysis.values()).reduce((sum, a) => sum + a.questionCount, 0);
    if (totalQuestions > 0) {
      score += (analysis.questionCount / totalQuestions) * 3;
    }

    // More medical terms = more likely to be doctor (weight: 4)
    const totalMedicalTerms = Array.from(speakerAnalysis.values()).reduce((sum, a) => sum + a.medicalTermCount, 0);
    if (totalMedicalTerms > 0) {
      score += (analysis.medicalTermCount / totalMedicalTerms) * 4;
    }

    // More command phrases = more likely to be doctor (weight: 2)
    const totalCommands = Array.from(speakerAnalysis.values()).reduce((sum, a) => sum + a.commandPhrases, 0);
    if (totalCommands > 0) {
      score += (analysis.commandPhrases / totalCommands) * 2;
    }

    // First speaker is more likely to be doctor (weight: 1)
    if (analysis.firstSpeaker) {
      score += 1;
    }

    // Longer speaking duration = more likely to be doctor (weight: 1)
    const totalDuration = Array.from(speakerAnalysis.values()).reduce((sum, a) => sum + a.totalDuration, 0);
    score += (analysis.totalDuration / totalDuration) * 1;

    speakerScores.set(speaker, score);
  });

  // Sort speakers by score (highest = Doctor)
  const sortedSpeakers = Array.from(speakerScores.entries()).sort((a, b) => b[1] - a[1]);
  
  // Create speaker map
  const speakerMap = new Map<string, string>();
  sortedSpeakers.forEach(([speaker, score], index) => {
    if (index === 0) {
      speakerMap.set(speaker, 'Doctor');
    } else if (index === 1) {
      speakerMap.set(speaker, 'Patient');
    } else {
      speakerMap.set(speaker, `Speaker ${speaker}`);
    }
    
    // Log analysis for debugging
    console.log(`Speaker ${speaker} -> ${speakerMap.get(speaker)} (Score: ${score.toFixed(2)})`);
    const analysis = speakerAnalysis.get(speaker)!;
    console.log(`  - Utterances: ${analysis.utteranceCount}, Words: ${analysis.totalWords}`);
    console.log(`  - Questions: ${analysis.questionCount}, Medical Terms: ${analysis.medicalTermCount}`);
    console.log(`  - Commands: ${analysis.commandPhrases}, First: ${analysis.firstSpeaker}`);
  });

  // Map utterances to speakers
  return utterances.map(utterance => ({
    speaker: speakerMap.get(utterance.speaker) || utterance.speaker,
    text: utterance.text,
    startTime: utterance.start,
    endTime: utterance.end,
    confidence: utterance.confidence || 0,
  }));
}

// Helper function to extract voice features for training
function extractVoiceFeatures(transcriptionResult: any, speakerSegments: any[]) {
  return {
    averageConfidence: transcriptionResult.confidence || 0,
    speechRate: 0,
    wordCount: transcriptionResult.words?.length || 0,
    totalDuration: transcriptionResult.audio_duration || 0,
    service: 'AssemblyAI',
    speakerPattern: {
      utteranceCount: speakerSegments.length,
      avgWordsPerUtterance: speakerSegments.length > 0 
        ? speakerSegments.reduce((sum, seg) => sum + seg.text.split(/\s+/).length, 0) / speakerSegments.length 
        : 0
    }
  };
}

// Process utterances with voice recognition profile matching
function processWithVoiceRecognition(utterances: any[], voiceProfile: any) {
  const doctorName = voiceProfile.doctorName || 'Doctor';
  const voiceSignature = voiceProfile.voiceSignature;
  
  console.log(`🎯 Using voice recognition for: ${doctorName}`);
  
  // Analyze each speaker's characteristics and match to profile
  const speakerCharacteristics = new Map<string, any>();
  
  utterances.forEach(utterance => {
    const speaker = utterance.speaker;
    const text = utterance.text || '';
    const words = text.split(/\s+/);
    
    if (!speakerCharacteristics.has(speaker)) {
      speakerCharacteristics.set(speaker, {
        utterances: [],
        totalWords: 0,
        medicalTerms: 0,
        questions: 0,
        avgConfidence: 0,
        speechRate: 0,
      });
    }
    
    const char = speakerCharacteristics.get(speaker)!;
    char.utterances.push(utterance);
    char.totalWords += words.length;
    char.avgConfidence += utterance.confidence || 0;
    
    // Count medical terms
    const medicalTerms = [
      'diagnose', 'diagnosis', 'prescription', 'medication', 'treatment',
      'examine', 'symptoms', 'condition', 'blood pressure'
    ];
    const lowerText = text.toLowerCase();
    char.medicalTerms += medicalTerms.filter(term => lowerText.includes(term)).length;
    
    // Count questions
    const questionWords = ['what', 'when', 'how', 'why', 'can you', 'do you'];
    if (questionWords.some(q => lowerText.includes(q)) || text.includes('?')) {
      char.questions++;
    }
  });
  
  // Calculate similarity scores to voice profile
  const speakerScores = new Map<string, number>();
  
  speakerCharacteristics.forEach((char, speaker) => {
    const avgConfidence = char.avgConfidence / char.utterances.length;
    const medicalTermDensity = char.medicalTerms / Math.max(char.totalWords, 1);
    const questionDensity = char.questions / Math.max(char.utterances.length, 1);
    
    // Match to voice profile characteristics
    let matchScore = 0;
    
    // Confidence similarity
    if (voiceSignature.characteristics) {
      const profileConf = voiceSignature.characteristics.averageConfidence || 0;
      const confDiff = Math.abs(avgConfidence - profileConf);
      matchScore += (1 - Math.min(confDiff, 1)) * 2;
      
      // Medical term density similarity
      const profileMedical = voiceSignature.characteristics.medicalTermDensity || 0;
      const medicalDiff = Math.abs(medicalTermDensity - profileMedical);
      matchScore += (1 - Math.min(medicalDiff, 1)) * 4;
      
      // Question frequency similarity
      const profileQuestions = voiceSignature.characteristics.questionFrequency || 0;
      const questionSim = Math.min(char.questions, profileQuestions) / Math.max(char.questions, profileQuestions, 1);
      matchScore += questionSim * 3;
    }
    
    // Prefer speaker with more medical terms
    matchScore += medicalTermDensity * 5;
    
    speakerScores.set(speaker, matchScore);
    
    console.log(`  Speaker ${speaker} -> Match score: ${matchScore.toFixed(2)}`);
    console.log(`    - Medical terms: ${char.medicalTerms}, Questions: ${char.questions}`);
    console.log(`    - Confidence: ${avgConfidence.toFixed(2)}`);
  });
  
  // Assign labels based on match scores
  const sortedSpeakers = Array.from(speakerScores.entries()).sort((a, b) => b[1] - a[1]);
  const speakerMap = new Map<string, string>();
  
  if (sortedSpeakers.length >= 1) {
    speakerMap.set(sortedSpeakers[0][0], doctorName);
    console.log(`  ✅ ${sortedSpeakers[0][0]} identified as: ${doctorName} (Score: ${sortedSpeakers[0][1].toFixed(2)})`);
  }
  
  if (sortedSpeakers.length >= 2) {
    speakerMap.set(sortedSpeakers[1][0], 'Patient');
    console.log(`  ✅ ${sortedSpeakers[1][0]} identified as: Patient (Score: ${sortedSpeakers[1][1].toFixed(2)})`);
  }
  
  // Map utterances
  return utterances.map(utterance => ({
    speaker: speakerMap.get(utterance.speaker) || utterance.speaker,
    text: utterance.text,
    startTime: utterance.start,
    endTime: utterance.end,
    confidence: utterance.confidence || 0,
    recognitionMethod: 'voice_profile'
  }));
}