import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY not found in environment variables');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface HealthProfile {
  age: number;
  height: number; // in cm
  weight: number; // in kg
  bloodGroup: string;
  gender?: string;
}

export interface HealthAnalysis {
  bmi: number;
  bmiCategory: string;
  riskAssessment: string[];
  recommendations: string[];
  doctorConsultation: string[];
}

export function calculateBMI(height: number, weight: number): number {
  const heightInMeters = height / 100;
  return Number((weight / (heightInMeters * heightInMeters)).toFixed(2));
}

export function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

export async function analyzeHealthProfile(
  profile: HealthProfile,
  reports?: { name: string; type: string; date: string }[]
): Promise<HealthAnalysis> {
  const bmi = calculateBMI(profile.height, profile.weight);
  const bmiCategory = getBMICategory(bmi);

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
You are a health analysis AI assistant. Analyze the following health profile and provide a comprehensive assessment.

**Patient Profile:**
- Age: ${profile.age} years
- Height: ${profile.height} cm
- Weight: ${profile.weight} kg
- Blood Group: ${profile.bloodGroup}
${profile.gender ? `- Gender: ${profile.gender}` : ''}
- BMI: ${bmi} (${bmiCategory})

${reports && reports.length > 0 ? `\n**Medical Reports:**\n${reports.map(r => `- ${r.name} (${r.type}) - ${r.date}`).join('\n')}` : ''}

Please provide:
1. **Risk Assessment**: List potential health risks based on the BMI category and age
2. **Recommendations**: Provide actionable health and lifestyle recommendations
3. **Doctor Consultation**: List specific medical specialties or tests the patient should consider consulting

Format your response as JSON:
{
  "riskAssessment": ["risk1", "risk2", ...],
  "recommendations": ["recommendation1", "recommendation2", ...],
  "doctorConsultation": ["consultation1", "consultation2", ...]
}
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return {
        bmi,
        bmiCategory,
        riskAssessment: analysis.riskAssessment || [],
        recommendations: analysis.recommendations || [],
        doctorConsultation: analysis.doctorConsultation || [],
      };
    }
  } catch (error) {
    console.error('Gemini API error:', error);
  }

  // Fallback analysis if API fails
  return {
    bmi,
    bmiCategory,
    riskAssessment: generateBasicRiskAssessment(bmi, profile.age),
    recommendations: generateBasicRecommendations(bmi),
    doctorConsultation: generateBasicConsultations(bmi, profile.age),
  };
}

function generateBasicRiskAssessment(bmi: number, age: number): string[] {
  const risks: string[] = [];
  
  if (bmi < 18.5) {
    risks.push('Malnutrition risk', 'Weakened immune system', 'Osteoporosis risk');
  } else if (bmi >= 25 && bmi < 30) {
    risks.push('Increased cardiovascular risk', 'Pre-diabetes risk', 'Joint problems');
  } else if (bmi >= 30) {
    risks.push('High cardiovascular disease risk', 'Type 2 diabetes risk', 'Hypertension', 'Sleep apnea');
  }
  
  if (age > 45) {
    risks.push('Age-related metabolic changes', 'Regular health screening recommended');
  }
  
  return risks.length > 0 ? risks : ['No significant risk factors identified'];
}

function generateBasicRecommendations(bmi: number): string[] {
  const recommendations: string[] = ['Stay hydrated (8-10 glasses of water daily)', 'Regular exercise (150 mins/week)', 'Balanced diet with fruits and vegetables'];
  
  if (bmi < 18.5) {
    recommendations.push('Increase caloric intake with nutritious foods', 'Consider protein supplements', 'Weight training exercises');
  } else if (bmi >= 25) {
    recommendations.push('Reduce processed foods and sugar intake', 'Portion control', 'Increase physical activity', 'Consider meal planning');
  }
  
  return recommendations;
}

function generateBasicConsultations(bmi: number, age: number): string[] {
  const consultations: string[] = ['Annual general health check-up'];
  
  if (bmi < 18.5 || bmi >= 30) {
    consultations.push('Nutritionist/Dietitian consultation', 'Endocrinologist (for metabolic evaluation)');
  }
  
  if (bmi >= 25) {
    consultations.push('Cardiologist (cardiovascular screening)', 'Blood sugar level test');
  }
  
  if (age > 40) {
    consultations.push('Complete blood count (CBC)', 'Lipid profile test');
  }
  
  return consultations;
}

export async function analyzeReportSummary(
  profile: HealthProfile,
  reports: Array<{ name: string; type: string; uploadDate: string; repoName: string }>
): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const bmi = calculateBMI(profile.height, profile.weight);

    const prompt = `
You are a medical AI assistant. Create a comprehensive health summary based on the following information:

**Patient Profile:**
- Age: ${profile.age} years, Height: ${profile.height} cm, Weight: ${profile.weight} kg
- Blood Group: ${profile.bloodGroup}, BMI: ${bmi}

**Medical Reports:**
${reports.map((r, i) => `${i + 1}. ${r.name} (${r.type}) - Repository: ${r.repoName} - Date: ${r.uploadDate}`).join('\n')}

Provide a concise medical summary (200-300 words) highlighting:
1. Overall health status based on available reports
2. Key findings or concerns
3. Recommendations for the consulting doctor
4. Areas requiring immediate attention (if any)

Keep the tone professional and medical.
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini summary error:', error);
    return `Health summary for patient (Age: ${profile.age}, BMI: ${calculateBMI(profile.height, profile.weight)}). Total reports available: ${reports.length}. Reports span across ${new Set(reports.map(r => r.repoName)).size} health repositories.`;
  }
}

export async function analyzeHealthDocument(prompt: string): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini document analysis error:', error);
    throw new Error('AI analysis service temporarily unavailable. Please try again later.');
  }
}
