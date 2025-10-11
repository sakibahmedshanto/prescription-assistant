import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation, analysisType } = body;

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation transcript is required' },
        { status: 400 }
      );
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (analysisType) {
      case 'summary':
        systemPrompt = `You are an expert medical AI assistant specializing in clinical documentation. 
Your task is to analyze doctor-patient conversations and create comprehensive, structured medical summaries 
that follow standard medical documentation format (SOAP notes).`;
        userPrompt = `Analyze the following doctor-patient conversation and provide a detailed medical summary in SOAP note format:

**SUBJECTIVE:**
- Chief Complaint (CC)
- History of Present Illness (HPI) - Include onset, location, duration, character, aggravating/alleviating factors, radiation, timing, severity (OLDCARTS)
- Past Medical History (PMH)
- Current Medications
- Allergies (if mentioned)
- Social History (if mentioned)
- Family History (if mentioned)
- Review of Systems (ROS) - relevant positives and negatives

**OBJECTIVE:**
- Vital Signs (if mentioned)
- Physical Examination findings
- Laboratory/Imaging results (if mentioned)

**ASSESSMENT:**
- Primary diagnosis or differential diagnoses
- Clinical impression

**PLAN:**
- Diagnostic workup
- Treatment plan
- Medications prescribed
- Patient education
- Follow-up arrangements

Conversation:
${conversation}

Format the response clearly with headers and bullet points for easy reading.`;
        break;

      case 'symptoms':
        systemPrompt = `You are an expert medical AI assistant specialized in symptom analysis and clinical pattern recognition. 
Your task is to extract, categorize, and analyze all symptoms mentioned in the conversation using medical terminology.`;
        userPrompt = `Analyze the following doctor-patient conversation and provide a comprehensive symptom analysis:

**PRIMARY SYMPTOMS:**
- Main complaint(s)
- Onset (when did it start)
- Character/Quality (describe the symptom)
- Severity (mild/moderate/severe or scale 1-10)

**ASSOCIATED SYMPTOMS:**
- Related symptoms
- Constitutional symptoms (fever, chills, fatigue, weight changes)
- System-specific symptoms

**SYMPTOM TIMELINE:**
- Duration
- Frequency (constant, intermittent, episodic)
- Progression (improving, worsening, stable)
- Pattern (time of day, triggers)

**MODIFYING FACTORS:**
- Aggravating factors
- Alleviating factors
- Previous treatments tried and their effectiveness

**RED FLAGS:**
- Any concerning or emergency symptoms that require immediate attention

**CLINICAL SIGNIFICANCE:**
- How these symptoms might be related
- Possible system involvement (cardiovascular, respiratory, GI, neurological, etc.)

Conversation:
${conversation}

Format as a structured clinical note with clear headers and bullet points.`;
        break;

      case 'diagnosis':
        systemPrompt = `You are an expert medical AI assistant specializing in differential diagnosis and clinical reasoning. 
Your task is to provide evidence-based differential diagnoses based on the clinical presentation, 
using systematic diagnostic reasoning. Always emphasize that this is clinical decision support 
and final diagnosis must be made by the treating physician.`;
        userPrompt = `Based on the following doctor-patient conversation, provide a comprehensive differential diagnosis analysis:

**DIFFERENTIAL DIAGNOSES (Ranked by Likelihood):**
For each diagnosis provide:
1. Diagnosis name (with ICD-10 code if applicable)
2. Probability (High/Medium/Low)
3. Supporting evidence from the conversation
4. Evidence against this diagnosis

**MOST LIKELY DIAGNOSIS:**
- Primary diagnosis with rationale
- Key clinical features that support this

**DIAGNOSTIC WORKUP RECOMMENDATIONS:**
- Laboratory tests needed
- Imaging studies recommended
- Specialist referrals to consider
- Additional history or examination needed

**RED FLAGS & URGENT CONSIDERATIONS:**
- Life-threatening conditions to rule out
- Symptoms requiring immediate intervention
- When to escalate care

**CLINICAL PEARLS:**
- Important diagnostic clues from the history
- Physical exam findings to look for
- Common pitfalls to avoid

**IMPORTANT DISCLAIMER:**
This analysis is for clinical decision support only. Final diagnosis and treatment decisions 
must be made by the licensed physician based on complete clinical evaluation.

Conversation:
${conversation}

Use evidence-based medicine principles and cite reasoning for each diagnosis when possible.`;
        break;

      case 'prescription':
        systemPrompt = `You are an expert clinical pharmacologist and medical AI assistant specializing in medication therapy. 
Your task is to provide evidence-based medication recommendations based on the patient's condition, 
following current clinical guidelines and considering safety, efficacy, and patient-specific factors.`;
        userPrompt = `Based on the following doctor-patient conversation, provide comprehensive prescription recommendations:

**MEDICATION RECOMMENDATIONS:**
For each medication provide:
1. Generic name (Brand name)
2. Indication/Reason for prescribing
3. Dosage (with route and frequency)
4. Duration of treatment
5. Instructions (with/without food, time of day, etc.)

**PATIENT COUNSELING POINTS:**
- How to take the medication correctly
- Expected therapeutic effects (when they should feel better)
- Common side effects to expect
- Serious side effects requiring immediate medical attention
- What to do if a dose is missed

**SAFETY CONSIDERATIONS:**
- Contraindications to check (based on conversation)
- Potential drug-drug interactions
- Drug-disease interactions
- Special populations (pregnancy, breastfeeding, elderly, renal/hepatic impairment)
- Allergy considerations

**MONITORING PARAMETERS:**
- Clinical response to monitor
- Laboratory monitoring if needed
- Follow-up timeline

**NON-PHARMACOLOGICAL RECOMMENDATIONS:**
- Lifestyle modifications
- Dietary advice
- Activity restrictions or recommendations

**PRESCRIPTION FORMAT:**
(Ready to use prescription format)
Rx:
[List medications in standard prescription format]

**IMPORTANT SAFETY DISCLAIMER:**
- Verify patient allergies before prescribing
- Check for contraindications and drug interactions
- Adjust doses based on patient-specific factors
- This is a recommendation for physician review - final prescribing decision rests with the licensed physician

Conversation:
${conversation}

Base recommendations on current clinical guidelines and evidence-based medicine.`;
        break;

      case 'follow-up':
        systemPrompt = `You are an expert medical AI assistant specializing in care continuity and patient follow-up planning. 
Your task is to create comprehensive follow-up plans that ensure proper monitoring, patient safety, 
and optimal health outcomes.`;
        userPrompt = `Based on the following doctor-patient conversation, create a detailed follow-up and care continuity plan:

**FOLLOW-UP SCHEDULE:**
- Recommended follow-up timeline (days/weeks/months)
- Purpose of follow-up visit
- What will be assessed at follow-up

**MONITORING INSTRUCTIONS:**
**What to Monitor:**
- Symptom improvement or resolution
- Side effects of medications
- Vital signs (if applicable)
- Specific measurements (pain scale, functional status, etc.)

**How to Monitor:**
- Self-monitoring techniques
- When and how to record symptoms
- Tools or devices needed

**RED FLAG SYMPTOMS - SEEK IMMEDIATE CARE IF:**
- Emergency symptoms requiring immediate medical attention
- Worsening conditions that need urgent evaluation
- Medication-related emergencies

**RETURN PRECAUTIONS:**
Instruct patient to contact doctor or go to ER if:
- [List specific concerning symptoms]
- [List emergency scenarios]

**SCHEDULED TESTS & INVESTIGATIONS:**
- Laboratory tests to schedule (with timeline)
- Imaging studies needed (with timeline)
- Specialist referrals
- Follow-up procedures

**LIFESTYLE MODIFICATIONS:**
**Diet:**
- Dietary recommendations
- Foods to avoid
- Nutritional supplements

**Activity:**
- Activity restrictions
- Exercise recommendations
- Work/school limitations
- Gradual return to normal activities

**Self-Care:**
- Home remedies
- Symptom management strategies
- Sleep hygiene
- Stress management

**MEDICATION ADHERENCE:**
- Importance of compliance
- How to remember medications
- What to do if doses are missed
- Duration of treatment

**PATIENT EDUCATION:**
- Understanding the condition
- Expected course and prognosis
- Warning signs to watch for
- Resources for more information

**CARE COORDINATION:**
- Specialist appointments needed
- Community resources
- Support groups
- Home health services if needed

**DOCUMENTATION FOR PATIENT:**
Provide patient with:
- Written follow-up instructions
- Emergency contact numbers
- Appointment schedule
- Medication list

Conversation:
${conversation}

Create a patient-friendly, actionable plan that ensures safety and optimal outcomes.`;
        break;

      default:
        systemPrompt = `You are a medical AI assistant helping doctors with clinical documentation.`;
        userPrompt = `Analyze the following doctor-patient conversation and provide relevant medical insights:\n\n${conversation}`;
    }

    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your .env file.',
          suggestion: 'Get your API key from https://platform.openai.com/api-keys'
        },
        { status: 503 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const analysis = completion.choices[0]?.message?.content || '';

    return NextResponse.json({
      success: true,
      analysis,
      analysisType,
      usage: completion.usage,
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to analyze conversation', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Batch analysis endpoint
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversation, analysisTypes } = body;

    if (!conversation || !Array.isArray(analysisTypes)) {
      return NextResponse.json(
        { error: 'Conversation and analysisTypes array are required' },
        { status: 400 }
      );
    }

    // Run multiple analyses in parallel
    const analyses = await Promise.all(
      analysisTypes.map(async (type) => {
        try {
          const response = await fetch(
            `${request.nextUrl.origin}/api/analyze`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversation, analysisType: type }),
            }
          );
          const data = await response.json();
          return { type, ...data };
        } catch (err) {
          return { type, error: 'Analysis failed' };
        }
      })
    );

    return NextResponse.json({
      success: true,
      analyses,
    });

  } catch (error: any) {
    console.error('Batch analysis error:', error);
    return NextResponse.json(
      { error: 'Batch analysis failed', details: error.message },
      { status: 500 }
    );
  }
}

