import { NextRequest, NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0-client';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Repository from '@/models/Repository';
import File from '@/models/File';
import SharedAccess from '@/models/SharedAccess';
import { downloadFromR2 } from '@/lib/r2';
import { decryptBuffer } from '@/lib/encryption';
import { google } from 'googleapis';
import stream from 'stream';

const GENAI_DISCOVERY_URL = `https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta&key=${process.env.GEMINI_API_KEY}`;
const model = 'gemini-2.0-flash-exp';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST /api/repositories/[id]/chat - Analyze files with AI
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth0.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { message, fileIds } = await request.json();

    if (!message && !fileIds?.length) {
      return NextResponse.json({ error: 'Message or files required' }, { status: 400 });
    }

    await connectDB();
    
    const user = await User.findOne({ auth0Id: session.user.sub });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Await params in Next.js 15+
    const { id } = await params;

    // Check if user has access to repository
    const repository = await Repository.findById(id);

    if (!repository) {
      return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }

    const isOwner = repository.ownerId.toString() === (user._id as any).toString();
    
    if (!isOwner) {
      const access = await SharedAccess.findOne({
        repositoryId: repository._id,
        sharedWithUserId: user._id,
        isActive: true,
        $or: [
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } },
        ],
      });

      if (!access) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    let analysisContext = '';

    // If files are provided, upload to Gemini and analyze them directly
    if (fileIds && fileIds.length > 0) {
      const files = await File.find({
        _id: { $in: fileIds },
        repositoryId: repository._id,
      });

      const genaiService = await google.discoverAPI(GENAI_DISCOVERY_URL) as any;
      const auth = new google.auth.GoogleAuth().fromAPIKey(process.env.GEMINI_API_KEY || '');
      const fileParts = [];

      for (const file of files) {
        try {
          // Download and decrypt file
          const encryptedData = await downloadFromR2(file.r2Key);
          const decryptedData = decryptBuffer(encryptedData);
          
          const mimeType = file.mimeType || 'application/pdf';
          const isPDF = mimeType === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
          
          // For PDFs and other files, upload to Gemini File API
          if (isPDF || mimeType.startsWith('application/')) {
            try {
              const bufferStream = new stream.PassThrough();
              bufferStream.end(decryptedData);
              
              const media = {
                mimeType: mimeType,
                body: bufferStream,
              };
              
              const body = { file: { displayName: file.name } };
              const createFileResponse = await genaiService.media.upload({
                media: media,
                auth: auth,
                requestBody: body,
              });
              
              const uploadedFile = createFileResponse.data.file;
              console.log(`Uploaded file to Gemini: ${uploadedFile.displayName} (${uploadedFile.uri})`);
              
              // Wait for file processing
              let fileData = uploadedFile;
              let attempts = 0;
              while (fileData.state === 'PROCESSING' && attempts < 30) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                const getFileResponse = await genaiService.files.get({
                  name: uploadedFile.name,
                  auth: auth,
                });
                fileData = getFileResponse.data;
                attempts++;
              }
              
              if (fileData.state === 'FAILED') {
                throw new Error('File processing failed');
              }
              
              fileParts.push({
                file_data: {
                  file_uri: fileData.uri,
                  mime_type: fileData.mimeType,
                },
              });
              
              analysisContext += `\n\nFile: ${file.name}\nType: ${file.fileType}\nDescription: ${file.description || 'N/A'}\nStatus: Uploaded to Gemini for deep analysis\n`;
            } catch (uploadError) {
              console.error(`Error uploading file ${file.name} to Gemini:`, uploadError);
              // Fallback to inline base64
              const base64Data = decryptedData.toString('base64');
              fileParts.push({
                inline_data: {
                  data: base64Data,
                  mime_type: mimeType,
                },
              });
              analysisContext += `\n\nFile: ${file.name}\nType: ${file.fileType}\nDescription: ${file.description || 'N/A'}\nStatus: Using inline data\n`;
            }
          } else {
            // For images, use inline data
            const base64Data = decryptedData.toString('base64');
            fileParts.push({
              inline_data: {
                data: base64Data,
                mime_type: mimeType,
              },
            });
            analysisContext += `\n\nFile: ${file.name}\nType: ${file.fileType}\nDescription: ${file.description || 'N/A'}\nStatus: Using inline data\n`;
          }
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          analysisContext += `\n\nFile: ${file.name} - Could not process file\n`;
        }
      }

      // Get user health profile for context
      const bmi = user.height && user.weight ? (user.weight / Math.pow(user.height / 100, 2)).toFixed(2) : null;
      let bmiCategory = '';
      let bmiRisks = '';
      let bmiRecommendations = '';
      
      if (bmi) {
        const bmiValue = parseFloat(bmi);
        if (bmiValue < 18.5) {
          bmiCategory = 'Underweight';
          bmiRisks = 'Weakened immune system, nutritional deficiencies, osteoporosis risk, fertility issues';
          bmiRecommendations = 'Increase caloric intake with nutrient-dense foods, focus on protein-rich meals, strength training exercises, consult nutritionist for personalized meal plan';
        } else if (bmiValue >= 18.5 && bmiValue < 25) {
          bmiCategory = 'Normal weight';
          bmiRisks = 'Minimal health risks, maintain current lifestyle';
          bmiRecommendations = 'Maintain balanced diet with fruits, vegetables, lean proteins, regular physical activity (150 min/week), adequate sleep (7-9 hours), stress management';
        } else if (bmiValue >= 25 && bmiValue < 30) {
          bmiCategory = 'Overweight';
          bmiRisks = 'Increased risk of type 2 diabetes, high blood pressure, heart disease, sleep apnea, joint problems';
          bmiRecommendations = 'Reduce caloric intake by 500-750 cal/day, increase physical activity (cardio + strength training), limit processed foods and sugars, portion control, consult dietitian';
        } else {
          bmiCategory = 'Obese';
          bmiRisks = 'High risk of type 2 diabetes, cardiovascular disease, certain cancers, stroke, fatty liver disease, respiratory problems';
          bmiRecommendations = 'Consult healthcare provider for comprehensive weight management plan, structured diet plan (Mediterranean or DASH diet), regular exercise program, behavioral therapy, consider medical interventions if BMI > 35';
        }
      }
      
      const healthContext = `
User Health Profile:
- Age: ${user.age || 'N/A'} years
- Gender: ${user.gender || 'N/A'}
- Blood Group: ${user.bloodGroup || 'N/A'}
- Height: ${user.height || 'N/A'} cm
- Weight: ${user.weight || 'N/A'} kg
- BMI: ${bmi || 'N/A'} (${bmiCategory})
${bmi ? `
- BMI Analysis:
  * Category: ${bmiCategory}
  * Health Risks: ${bmiRisks}
  * Recommendations: ${bmiRecommendations}
` : ''}
`;

      // Age-specific recommendations
      let ageRecommendations = '';
      if (user.age) {
        if (user.age < 18) {
          ageRecommendations = 'Growth phase: Focus on calcium, vitamin D, protein. Limit screen time. Ensure 8-10 hours sleep.';
        } else if (user.age >= 18 && user.age < 30) {
          ageRecommendations = 'Peak health years: Build healthy habits, maintain active lifestyle, avoid smoking/excess alcohol. Focus on career-life balance.';
        } else if (user.age >= 30 && user.age < 50) {
          ageRecommendations = 'Start preventive health checks: Annual blood work, BP monitoring. Maintain muscle mass with strength training. Watch for stress.';
        } else if (user.age >= 50 && user.age < 65) {
          ageRecommendations = 'Increased screening: Colonoscopy, bone density, heart health. Focus on joint health, flexibility. Consider supplements (B12, D, Calcium).';
        } else {
          ageRecommendations = 'Senior health: Regular comprehensive checkups, fall prevention, cognitive health exercises, social engagement, medication review.';
        }
      }
      
      // Gender-specific recommendations
      let genderRecommendations = '';
      if (user.gender === 'Male') {
        genderRecommendations = 'Male-specific: Prostate health (PSA after 50), cardiovascular vigilance, testosterone monitoring if needed. Higher protein needs.';
      } else if (user.gender === 'Female') {
        genderRecommendations = 'Female-specific: Breast health (mammogram after 40), bone density (post-menopause), iron intake, hormonal health monitoring.';
      }

      // Prepare prompt for AI with file context with enhanced medical guidance
      const prompt = `
You are a specialized medical AI assistant analyzing health reports in repository: "${repository.name}"

${healthContext}

${ageRecommendations ? `AGE-SPECIFIC GUIDANCE:\n${ageRecommendations}\n\n` : ''}
${genderRecommendations ? `GENDER-SPECIFIC GUIDANCE:\n${genderRecommendations}\n\n` : ''}

FILES BEING ANALYZED:
${analysisContext}

USER QUESTION: ${message}

INSTRUCTIONS FOR DEEP ANALYSIS:
1. **Document Analysis**: Thoroughly extract all medical data, test results, abnormal values, and clinical findings from the attached files
2. **Test Interpretation**: Flag any values outside normal ranges and explain their significance
3. **Dietary Recommendations**: 
   - Provide specific foods to eat (with portions)
   - Foods to avoid completely
   - Meal timing and frequency suggestions
   - Hydration requirements
4. **Lifestyle Modifications**:
   - Exercise type, duration, and frequency
   - Sleep hygiene recommendations
   - Stress management techniques
5. **Precautions & Warning Signs**:
   - Specific symptoms to watch for
   - When to seek immediate medical attention
   - Medication interactions to avoid
6. **Follow-up Care**:
   - Recommended tests and their frequency
   - Specialist consultations if needed
   - Timeline for reassessment

Provide detailed, actionable advice in simple language. Include specific measurements, timings, and quantities. Always emphasize that this is AI guidance supplementing, not replacing, professional medical care.
`;

      try {
        const contents = {
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }, ...fileParts],
            },
          ],
          generation_config: {
            maxOutputTokens: 4096,
            temperature: 0.4,
            topP: 0.8,
          },
        };

        const generateContentResponse = await genaiService.models.generateContent({
          model: `models/${model}`,
          requestBody: contents,
          auth: auth,
        });

        const aiResponse = generateContentResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiResponse) {
          throw new Error('No response from AI');
        }

        return NextResponse.json({
          success: true,
          response: aiResponse,
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error('Gemini API error:', error);
        return NextResponse.json(
          { error: 'AI analysis failed. Please try again.' },
          { status: 500 }
        );
      }
    }

    // If no files, just answer the question with comprehensive health context
    const bmi2 = user.height && user.weight ? (user.weight / Math.pow(user.height / 100, 2)).toFixed(2) : null;
    let bmiCategory2 = '';
    let bmiRisks2 = '';
    let bmiRecommendations2 = '';
    
    if (bmi2) {
      const bmiValue = parseFloat(bmi2);
      if (bmiValue < 18.5) {
        bmiCategory2 = 'Underweight';
        bmiRisks2 = 'Weakened immune system, nutritional deficiencies, osteoporosis risk, fertility issues';
        bmiRecommendations2 = 'Increase caloric intake with nutrient-dense foods, focus on protein-rich meals, strength training exercises, consult nutritionist for personalized meal plan';
      } else if (bmiValue >= 18.5 && bmiValue < 25) {
        bmiCategory2 = 'Normal weight';
        bmiRisks2 = 'Minimal health risks, maintain current lifestyle';
        bmiRecommendations2 = 'Maintain balanced diet with fruits, vegetables, lean proteins, regular physical activity (150 min/week), adequate sleep (7-9 hours), stress management';
      } else if (bmiValue >= 25 && bmiValue < 30) {
        bmiCategory2 = 'Overweight';
        bmiRisks2 = 'Increased risk of type 2 diabetes, high blood pressure, heart disease, sleep apnea, joint problems';
        bmiRecommendations2 = 'Reduce caloric intake by 500-750 cal/day, increase physical activity (cardio + strength training), limit processed foods and sugars, portion control, consult dietitian';
      } else {
        bmiCategory2 = 'Obese';
        bmiRisks2 = 'High risk of type 2 diabetes, cardiovascular disease, certain cancers, stroke, fatty liver disease, respiratory problems';
        bmiRecommendations2 = 'Consult healthcare provider for comprehensive weight management plan, structured diet plan (Mediterranean or DASH diet), regular exercise program, behavioral therapy, consider medical interventions if BMI > 35';
      }
    }
    
    const healthContext2 = `
User Health Profile:
- Age: ${user.age || 'N/A'} years
- Gender: ${user.gender || 'N/A'}
- Blood Group: ${user.bloodGroup || 'N/A'}
- Height: ${user.height || 'N/A'} cm
- Weight: ${user.weight || 'N/A'} kg
- BMI: ${bmi2 || 'N/A'} (${bmiCategory2})
${bmi2 ? `
- BMI Analysis:
  * Category: ${bmiCategory2}
  * Health Risks: ${bmiRisks2}
  * Recommendations: ${bmiRecommendations2}
` : ''}
`;

    const prompt = `
You are a specialized medical AI assistant for health repository: "${repository.name}"

${healthContext2}

USER QUESTION: ${message}

PROVIDE COMPREHENSIVE GUIDANCE:
1. **Direct Answer**: Address the user's specific question clearly
2. **Dietary Advice**: Specific foods to eat/avoid with portions and timing
3. **Exercise Recommendations**: Type, duration, frequency based on their BMI and age
4. **Precautions**: Warning signs, when to seek medical help
5. **Lifestyle Tips**: Sleep, stress management, hydration
6. **Preventive Care**: Recommended tests and checkup frequency

Be detailed, specific, and actionable. Use measurements and timings. Keep language simple. Always emphasize this supplements but doesn't replace professional medical care.
`;

    try {
      const genaiService = await google.discoverAPI(GENAI_DISCOVERY_URL) as any;
      const auth = new google.auth.GoogleAuth().fromAPIKey(process.env.GEMINI_API_KEY || '');

      const contents = {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generation_config: {
          maxOutputTokens: 4096,
          temperature: 0.4,
          topP: 0.8,
        },
      };

      const generateContentResponse = await genaiService.models.generateContent({
        model: `models/${model}`,
        requestBody: contents,
        auth: auth,
      });

      const aiResponse = generateContentResponse?.data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!aiResponse) {
        throw new Error('No response from AI');
      }

      return NextResponse.json({
        success: true,
        response: aiResponse,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Gemini API error:', error);
      return NextResponse.json(
        { error: 'AI analysis failed. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in POST /api/repositories/[id]/chat:', error);
    return NextResponse.json(
      { error: error.message || 'AI analysis failed' },
      { status: 500 }
    );
  }
}
