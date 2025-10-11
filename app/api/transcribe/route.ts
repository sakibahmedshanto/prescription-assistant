import { NextRequest, NextResponse } from 'next/server';
// @ts-ignore - Google Cloud Speech types
import speech from '@google-cloud/speech';

// Initialize Google Cloud Speech client
const getSpeechClient = () => {
  const credentials = process.env.GOOGLE_CLOUD_CREDENTIALS 
    ? JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS)
    : undefined;

  return new speech.SpeechClient({
    credentials,
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  });
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { audioContent, config, isTraining } = body;

    if (!audioContent) {
      return NextResponse.json(
        { error: 'Audio content is required' },
        { status: 400 }
      );
    }

    // Check if Google Cloud credentials are configured
    if (!process.env.GOOGLE_CLOUD_CREDENTIALS || !process.env.GOOGLE_CLOUD_PROJECT_ID) {
      return NextResponse.json(
        { 
          error: 'Google Cloud is not configured. Please use the AssemblyAI version at /page-assemblyai instead.',
          suggestion: 'Navigate to http://localhost:3000/page-assemblyai for superior speaker diarization with AssemblyAI.'
        },
        { status: 503 }
      );
    }

    const client = getSpeechClient();

    // Configure recognition with speaker diarization
    const recognitionConfig: any = {
      encoding: config?.encoding || 'WEBM_OPUS',
      sampleRateHertz: config?.sampleRateHertz || 48000,
      languageCode: config?.languageCode || 'en-US',
      enableAutomaticPunctuation: true,
      enableWordTimeOffsets: true,
      enableSpeakerDiarization: true,
      diarizationSpeakerCount: isTraining ? 1 : 2, // 1 for training, 2 for conversation
      model: 'medical_conversation',
      useEnhanced: true,
      // Enhanced speaker diarization settings
      enableSeparateRecognitionPerChannel: false,
      diarizationConfig: {
        enableSpeakerDiarization: true,
        minSpeakerCount: isTraining ? 1 : 2,
        maxSpeakerCount: isTraining ? 1 : 2,
      },
    };

    const audio = {
      content: audioContent,
    };

    const requestConfig = {
      audio: audio,
      config: recognitionConfig,
    };

    // Perform speech recognition
    const [response] = await client.recognize(requestConfig);

    if (!response.results) {
      return NextResponse.json(
        { error: 'No transcription results' },
        { status: 400 }
      );
    }

    // Process results with speaker diarization
    const transcriptions = response.results.map((result: any) => {
      const alternative = result.alternatives?.[0];
      if (!alternative) return null;

      const words = alternative.words?.map((wordInfo: any) => ({
        word: wordInfo.word,
        startTime: wordInfo.startTime,
        endTime: wordInfo.endTime,
        speakerTag: wordInfo.speakerTag,
      })) || [];

      return {
        transcript: alternative.transcript,
        confidence: alternative.confidence,
        words,
      };
    }).filter(Boolean);

    // Group by speaker with improved detection
    const speakerSegments = groupBySpeaker(transcriptions, isTraining);

    // If training, return voice features for profile creation
    if (isTraining) {
      const voiceFeatures = extractVoiceFeatures(transcriptions);
      return NextResponse.json({
        success: true,
        transcriptions,
        speakerSegments,
        voiceFeatures,
        isTraining: true,
      });
    }

    return NextResponse.json({
      success: true,
      transcriptions,
      speakerSegments,
    });

  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to transcribe audio', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Helper function to group transcriptions by speaker with improved detection
function groupBySpeaker(transcriptions: any[], isTraining: boolean = false) {
  const segments: any[] = [];
  let currentSpeaker: number | null = null;
  let currentText = '';
  let startTime: any = null;
  let endTime: any = null;

  // For training, everything is Doctor
  if (isTraining) {
    transcriptions.forEach((trans) => {
      if (!trans?.words) return;
      
      let segmentText = '';
      let segmentStart: any = null;
      let segmentEnd: any = null;
      
      trans.words.forEach((word: any, index: number) => {
        if (index === 0) segmentStart = word.startTime;
        segmentText += word.word + ' ';
        segmentEnd = word.endTime;
      });
      
      if (segmentText.trim()) {
        segments.push({
          speaker: 'Doctor',
          text: segmentText.trim(),
          startTime: segmentStart,
          endTime: segmentEnd,
          confidence: trans.confidence || 0,
        });
      }
    });
    
    return segments;
  }

  // For conversations, use improved speaker detection
  const speakerMap = new Map<number, string>();
  const speakerCounts = new Map<number, number>();
  
  // Count words per speaker to determine who is Doctor vs Patient
  transcriptions.forEach((trans) => {
    if (!trans?.words) return;
    
    trans.words.forEach((word: any) => {
      const count = speakerCounts.get(word.speakerTag) || 0;
      speakerCounts.set(word.speakerTag, count + 1);
    });
  });
  
  // Assign speaker labels based on speech patterns and volume
  // Generally, the doctor speaks more (gives instructions, asks questions)
  // and has more structured speech patterns
  const speakers = Array.from(speakerCounts.entries()).sort((a, b) => b[1] - a[1]);
  
  if (speakers.length >= 2) {
    // Speaker with more words is typically the doctor
    speakerMap.set(speakers[0][0], 'Doctor');
    speakerMap.set(speakers[1][0], 'Patient');
  } else if (speakers.length === 1) {
    // If only one speaker detected, assume it's the doctor
    speakerMap.set(speakers[0][0], 'Doctor');
  }

  transcriptions.forEach((trans) => {
    if (!trans?.words) return;

    trans.words.forEach((word: any) => {
      if (word.speakerTag !== currentSpeaker) {
        // Save previous segment
        if (currentSpeaker !== null && currentText) {
          segments.push({
            speaker: speakerMap.get(currentSpeaker) || 'Unknown',
            text: currentText.trim(),
            startTime,
            endTime,
          });
        }
        // Start new segment
        currentSpeaker = word.speakerTag;
        currentText = word.word;
        startTime = word.startTime;
        endTime = word.endTime;
      } else {
        currentText += ' ' + word.word;
        endTime = word.endTime;
      }
    });
  });

  // Add final segment
  if (currentSpeaker !== null && currentText) {
    segments.push({
      speaker: speakerMap.get(currentSpeaker) || 'Unknown',
      text: currentText.trim(),
      startTime,
      endTime,
    });
  }

  return segments;
}

// Helper function to extract voice features for training
function extractVoiceFeatures(transcriptions: any[]) {
  const features: any = {
    averageConfidence: 0,
    speechRate: 0,
    wordCount: 0,
    totalDuration: 0,
  };

  if (!transcriptions.length) return features;

  let totalConfidence = 0;
  let totalWords = 0;
  let startTime: any = null;
  let endTime: any = null;

  transcriptions.forEach((trans) => {
    if (trans.confidence) {
      totalConfidence += trans.confidence;
    }
    
    if (trans.words) {
      totalWords += trans.words.length;
      
      trans.words.forEach((word: any) => {
        if (!startTime || word.startTime < startTime) {
          startTime = word.startTime;
        }
        if (!endTime || word.endTime > endTime) {
          endTime = word.endTime;
        }
      });
    }
  });

  features.averageConfidence = totalConfidence / transcriptions.length;
  features.wordCount = totalWords;
  
  if (startTime && endTime) {
    const duration = parseFloat(endTime.seconds || '0') - parseFloat(startTime.seconds || '0');
    features.totalDuration = duration;
    features.speechRate = totalWords / Math.max(duration, 1); // words per second
  }

  return features;
}

// Streaming endpoint for real-time transcription
export async function PUT(request: NextRequest) {
  try {
    const client = getSpeechClient();
    
    // This would use streamingRecognize for real-time processing
    // Implementation depends on your audio streaming setup
    
    return NextResponse.json({
      message: 'Streaming endpoint - implement based on your audio source'
    });
  } catch (error: any) {
    console.error('Streaming error:', error);
    return NextResponse.json(
      { error: 'Streaming failed', details: error.message },
      { status: 500 }
    );
  }
}

