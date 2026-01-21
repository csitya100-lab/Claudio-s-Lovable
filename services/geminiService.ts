import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GroundingChunk, InfographicData, PresentationData } from "../types";

// --- USAGE & QUOTA SYSTEM ---

export interface UsageStats {
  month: string; // "YYYY-MM"
  searchCount: number;
  deepThinkCount: number;
  imageGenCount: number;
}

const LIMITS = {
  SEARCH: 15,     // Reduced: Was 50. Now ~1 search every 2 days. Encourages BYOK.
  DEEP_THINK: 5,  // Reduced: Was 20. Just enough to test the Pro reasoning capabilities.
  IMAGE_GEN: 2    // Reduced: Was 5. Image generation is expensive.
};

const getUsageStats = (): UsageStats => {
  const currentMonth = new Date().toISOString().slice(0, 7); // "2023-10"
  const stored = localStorage.getItem('endo_usage_stats');
  
  if (stored) {
    const parsed: UsageStats = JSON.parse(stored);
    if (parsed.month === currentMonth) {
      // Ensure imageGenCount exists for legacy data
      return { 
        ...parsed, 
        imageGenCount: parsed.imageGenCount ?? 0 
      };
    }
  }

  // Reset or Init
  return { month: currentMonth, searchCount: 0, deepThinkCount: 0, imageGenCount: 0 };
};

const saveUsageStats = (stats: UsageStats) => {
  localStorage.setItem('endo_usage_stats', JSON.stringify(stats));
  // Dispatch event for UI updates
  window.dispatchEvent(new Event('endo-usage-updated'));
};

export const checkUsageLimit = (type: 'SEARCH' | 'DEEP_THINK' | 'IMAGE_GEN') => {
  // 1. If BYOK (Custom Key), unlimited usage
  if (localStorage.getItem('endo_custom_api_key')) {
    return { allowed: true, remaining: 9999, limit: 9999, isCustomKey: true };
  }

  const stats = getUsageStats();
  let limit = 0;
  let current = 0;

  switch (type) {
    case 'SEARCH': limit = LIMITS.SEARCH; current = stats.searchCount; break;
    case 'DEEP_THINK': limit = LIMITS.DEEP_THINK; current = stats.deepThinkCount; break;
    case 'IMAGE_GEN': limit = LIMITS.IMAGE_GEN; current = stats.imageGenCount; break;
  }

  return {
    allowed: current < limit,
    remaining: Math.max(0, limit - current),
    limit,
    isCustomKey: false
  };
};

export const incrementUsage = (type: 'SEARCH' | 'DEEP_THINK' | 'IMAGE_GEN') => {
  // Don't increment if using custom key
  if (localStorage.getItem('endo_custom_api_key')) return;

  const stats = getUsageStats();
  if (type === 'SEARCH') stats.searchCount++;
  if (type === 'DEEP_THINK') stats.deepThinkCount++;
  if (type === 'IMAGE_GEN') stats.imageGenCount++;
  saveUsageStats(stats);
};

// --- END QUOTA SYSTEM ---

// Helper to encode file to base64
export const fileToGenerativePart = async (file: File): Promise<{ mimeType: string; data: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:image/jpeg;base64," or "data:video/mp4;base64,")
      const base64Data = base64String.split(',')[1];
      resolve({
        mimeType: file.type,
        data: base64Data
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const getAiClient = () => {
  // 1. Check for User Custom Key (BYOK - Bring Your Own Key)
  const userKey = localStorage.getItem('endo_custom_api_key');
  
  // 2. Fallback to System Key
  const apiKey = userKey || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API Key não encontrada. Configure sua chave nas configurações ou contate o suporte.");
  }
  return new GoogleGenAI({ apiKey });
};

export const getLiveClient = () => getAiClient();

// Retry utility for API calls
const withRetry = async <T>(
  operation: () => Promise<T>, 
  retries = 2, 
  baseDelay = 1000
): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    // Check for 503 or generic unavailable messages
    const isUnavailable = 
      error?.status === 503 || 
      error?.status === 429 || // Rate Limit
      error?.message?.includes('unavailable') || 
      error?.message?.includes('The service is currently unavailable') ||
      error?.message?.includes('Overloaded') ||
      error?.message?.includes('Too Many Requests');

    if (retries > 0 && isUnavailable) {
      console.warn(`API Unavailable/RateLimited (${error.status}). Retrying in ${baseDelay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, baseDelay));
      return withRetry(operation, retries - 1, baseDelay * 2);
    }
    throw error;
  }
};

// --- FALLBACK SYSTEM ---
// If the Pro model fails (common with Preview models), fallback to Flash which is more stable/generous limits.
const executeWithFallback = async (
  primaryFn: () => Promise<GenerateContentResponse>,
  fallbackFn: () => Promise<GenerateContentResponse>,
  contextName: string
): Promise<GenerateContentResponse> => {
    try {
        return await withRetry(primaryFn);
    } catch (error: any) {
        // Only fallback on transient/quota errors, not bad request errors
        const isRecoverable = 
            error?.status === 503 || 
            error?.status === 429 || 
            error?.message?.includes('Overloaded') ||
            error?.message?.includes('quota');

        if (isRecoverable) {
            console.info(`[${contextName}] Primary model failed. Switching to fallback model...`);
            return await withRetry(fallbackFn);
        }
        throw error;
    }
};


interface ResearchOptions {
  useThinking?: boolean;
  useFast?: boolean;
  images?: { mimeType: string; data: string }[]; // New image support
}

// 1. Research Mode (Perplexity Style with Grounding)
export const performMedicalResearch = async (
  query: string, 
  history: {role: string, parts: {text: string}[]}[] = [],
  options: ResearchOptions = {}
) => {
  const ai = getAiClient();
  
  // Model Selection
  const primaryModel = 'gemini-3-pro-preview';
  const fallbackModel = 'gemini-3-flash-preview'; // Flash fallback
  
  // Basic Config
  let config: any = {
    tools: [{ googleSearch: {} }],
    systemInstruction: `Você é o "Dr. Cláudio Sityá AI", um assistente médico de elite.
    Responda perguntas clínicas com precisão, citando estudos recentes e diretrizes médicas.
    Use linguagem técnica apropriada para profissionais de saúde, mas clara.
    Se imagens forem fornecidas, analise-as clinicamente no contexto da pergunta.
    Sempre cite as fontes encontradas pelo Google Search no final da resposta.`
  };

  // Override for specific modes
  let activeModel = primaryModel;

  if (options.useFast) {
    activeModel = 'gemini-2.5-flash-lite-preview';
  } else if (options.useThinking) {
    activeModel = 'gemini-3-pro-preview';
    config.thinkingConfig = { thinkingBudget: 32768 };
  }

  try {
    const currentParts: any[] = [{ text: query }];
    if (options.images && options.images.length > 0) {
      options.images.forEach(img => {
        currentParts.push({ inlineData: img });
      });
    }

    const contents = [
        ...history,
        { role: 'user', parts: currentParts }
    ];

    // Execution with Fallback Logic
    // Only use fallback if we are NOT in specific modes that require specific models (like Thinking)
    let response: GenerateContentResponse;
    
    if (options.useThinking) {
        // Thinking mode MUST use Pro, no fallback to Flash (Flash doesn't think deeply yet)
        response = await withRetry(() => ai.models.generateContent({ model: activeModel, contents, config }));
    } else if (options.useFast) {
        response = await withRetry(() => ai.models.generateContent({ model: activeModel, contents, config }));
    } else {
        // Standard Research: Try Pro -> Fallback Flash
        response = await executeWithFallback(
            () => ai.models.generateContent({ model: primaryModel, contents, config }),
            () => ai.models.generateContent({ model: fallbackModel, contents, config }),
            "MedicalResearch"
        );
    }

    if (options.useThinking) {
      incrementUsage('DEEP_THINK');
    } else {
      incrementUsage('SEARCH');
    }

    const text = response.text || "Não foi possível gerar uma resposta.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks as GroundingChunk[] | undefined;
    
    const sources = chunks
      ?.filter(c => c.web?.uri && c.web?.title)
      .map(c => ({ title: c.web!.title!, uri: c.web!.uri! })) || [];

    const uniqueSources = sources.filter((v, i, a) => a.findIndex(t => t.uri === v.uri) === i);

    return { text, sources: uniqueSources };
  } catch (error) {
    console.error("Research Error:", error);
    throw error;
  }
};

// SPECIALIZED PROMPTS FOR IMAGING
const PROTOCOL_PROMPTS = {
  GYNECOLOGY: `
    ATUE COMO ESPECIALISTA EM ULTRASSONOGRAFIA GINECOLÓGICA. APLIQUE RIGOROSAMENTE ESTAS CLASSIFICAÇÕES:
    
    1. OVÁRIOS / ANEXOS:
       - Morfologia: Use a terminologia IOTA (International Ovarian Tumor Analysis).
       - Risco: Classifique usando O-RADS (Ovarian-Adnexal Reporting and Data System) de 0 a 5.
    
    2. ÚTERO - MIOMAS:
       - Classifique a posição dos miomas segundo a FIGO (PALM-COEIN): Submucoso (0-2), Intramural (3-4), Subseroso (5-7), Híbridos (ex: 2-5).
    
    3. ÚTERO - ADENOMIOSE:
       - Aplique os critérios MUSA (Morphological Uterus Sonographic Assessment).
       - Busque: Cistos miometriais, ilhas hiperecogênicas, sombreamento em leque, zona juncional irregular ou espessada.
    
    4. ENDOMETRIOSE PROFUNDA:
       - Siga o consenso IDEA (International Deep Endometriosis Analysis).
       - Avalie sistematicamente: Compartimento anterior/posterior, Torus uterino, Ligamentos uterossacros, Obliteração do fundo de saco.
  `,
  BREAST: `
    ATUE COMO ESPECIALISTA EM IMAGEM MAMÁRIA (MAMOGRAFIA E ULTRASSOM).
    
    1. PADRONIZAÇÃO:
       - Utilize estritamente o léxico BI-RADS (Breast Imaging Reporting and Data System) - Edição 2025/Atualizada.
    
    2. DESCRITORES:
       - Massa: Forma (oval, redonda, irregular), Margem (circunscrita, indistinta, espiculada), Orientação (paralela/não paralela).
       - Calcificações: Morfologia e Distribuição.
       - Ecogenicidade e características acústicas posteriores.
    
    3. CONCLUSÃO:
       - Categoria BI-RADS Final (0 a 6) obrigatória.
  `,
  GENERAL: `
    Analise este material visual médico detalhadamente. Identifique estruturas anatômicas, padrões, possíveis patologias e sugira diagnósticos diferenciais. Use terminologia médica padrão.
  `
};

const VIDEO_INSTRUCTION = `
  ATENÇÃO: O ARQUIVO FORNECIDO É UM VÍDEO MÉDICO.
  1. Analise o MOVIMENTO e a DINÂMICA temporal das estruturas.
  2. Se for um ultrassom, observe o fluxo, a contratilidade e a mobilidade dos órgãos (sliding sign, peristaltismo).
  3. Se for dermatoscopia, observe mudanças de reflexo ou padrão vascular com o movimento.
  4. Descreva achados que só são visíveis em vídeo, não em imagens estáticas.
`;

// 2. Imaging Mode (High Fidelity Image/Video Analysis - Batch Support)
export const analyzeDiagnosticImage = async (files: File[], prompt: string, protocol: 'GENERAL' | 'GYNECOLOGY' | 'BREAST' = 'GENERAL') => {
  const ai = getAiClient();
  const fileParts = await Promise.all(files.map(fileToGenerativePart));
  
  // Detect Video
  const hasVideo = files.some(f => f.type.startsWith('video/'));
  
  const systemContext = PROTOCOL_PROMPTS[protocol] || PROTOCOL_PROMPTS.GENERAL;
  const videoContext = hasVideo ? VIDEO_INSTRUCTION : "";

  const contents = {
    parts: [
      ...fileParts.map(part => ({ inlineData: part })), 
      { text: `${systemContext}\n${videoContext}\n\nCONTEXTO DO CASO FORNECIDO PELO MÉDICO: "${prompt || 'Analise o exame.'}"\n\nForneça um laudo estruturado com técnica, descrição dos achados e impressão diagnóstica.` }
    ]
  };

  try {
    // If video is present, we MUST use the Pro model (Gemini 3 Pro Preview) as it handles multimodal better and has larger context.
    // We avoid fallback to Flash for video to ensure quality.
    if (hasVideo) {
        console.log("Video detected. Using Pro model exclusively.");
        const response = (await withRetry(() => ai.models.generateContent({ 
            model: 'gemini-3-pro-preview', 
            contents 
        }))) as GenerateContentResponse;
        return response.text;
    } 
    
    // Standard Image: Try Pro -> Fallback Flash
    const response = await executeWithFallback(
        () => ai.models.generateContent({ model: 'gemini-3-pro-preview', contents }),
        () => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents }),
        "ImageAnalysis"
    );
    
    return response.text;
  } catch (error) {
    console.error("Image/Video Analysis Error:", error);
    throw error;
  }
};

// 2.1 Edit Image (Nano Banana - Gemini 2.5 Flash Image)
export const editMedicalImage = async (file: File, prompt: string) => {
  const ai = getAiClient();
  const filePart = await fileToGenerativePart(file);
  const modelId = 'gemini-2.5-flash-image';

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: filePart },
          { text: prompt }
        ]
      }
    }));

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        incrementUsage('IMAGE_GEN');
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No edited image generated.");
  } catch (error) {
    console.error("Edit Image Error:", error);
    throw error;
  }
};

// 2.2 Generate Medical Illustration (Pro Image)
export const generateMedicalIllustration = async (prompt: string, size: '1K' | '2K' | '4K' = '1K') => {
  const ai = getAiClient();
  const modelId = 'gemini-2.5-flash-image';

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4", 
        }
      }
    }));

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        incrementUsage('IMAGE_GEN');
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No illustration generated.");
  } catch (error) {
    console.error("Illustration Error:", error);
    throw error;
  }
};

// 3. Literature Mode (PDF Analysis)
export const analyzeMedicalPdf = async (file: File, extractionOptions: string[]) => {
  const ai = getAiClient();
  const filePart = await fileToGenerativePart(file);
  
  const optionsPrompt = extractionOptions.length > 0 
    ? `Extraia especificamente os seguintes pontos com detalhes: ${extractionOptions.join(', ')}.`
    : "Faça um resumo estruturado (Objetivo, Métodos, Resultados, Conclusão).";

  const contents = {
    parts: [
      { inlineData: filePart },
      { text: `Analise este artigo científico médico. ${optionsPrompt} Destaque a relevância clínica.` }
    ]
  };

  try {
    // PDF Analysis: Pro -> Flash Fallback
    const response = await executeWithFallback(
        () => ai.models.generateContent({ model: 'gemini-3-pro-preview', contents }),
        () => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents }),
        "PdfAnalysis"
    );
    
    incrementUsage('SEARCH');
    return response.text;
  } catch (error) {
    console.error("PDF Analysis Error:", error);
    throw error;
  }
};

// 3.1 Generate Infographic Data (JSON)
export const generateInfographicData = async (file: File): Promise<InfographicData> => {
  const ai = getAiClient();
  const filePart = await fileToGenerativePart(file);
  const modelId = 'gemini-3-flash-preview'; // Flash is sufficient and fast for JSON extraction

  try {
    const response = (await withRetry(() => ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: filePart },
          { text: "Extraia os dados principais deste artigo para criar um infográfico visual." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            keyPoints: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING } 
            },
            statistics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.STRING }
                }
              }
            },
            conclusion: { type: Type.STRING }
          },
          required: ["title", "keyPoints", "conclusion"]
        }
      }
    }))) as GenerateContentResponse;

    if (response.text) {
        return JSON.parse(response.text) as InfographicData;
    }
    throw new Error("Failed to parse infographic data");
  } catch (error) {
    console.error("Infographic Data Error:", error);
    throw error;
  }
};

// 3.2 Generate Presentation Slides (JSON for PPTX)
export const generatePresentationSlides = async (file: File): Promise<PresentationData> => {
    const ai = getAiClient();
    const filePart = await fileToGenerativePart(file);
    
    const contents = {
        parts: [
          { inlineData: filePart },
          { text: "Crie uma apresentação de 5 a 8 slides baseada neste artigo. Use uma estrutura lógica (Intro, Metodologia, Resultados, Discussão, Conclusão). Seja conciso nos bullet points." }
        ]
    };

    const config = {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                presentationTitle: { type: Type.STRING },
                slides: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                            speakerNotes: { type: Type.STRING }
                        },
                        required: ["title", "bulletPoints", "speakerNotes"]
                    }
                }
            },
            required: ["presentationTitle", "slides"]
        }
    };
  
    try {
      // Slides Generation: Pro -> Flash Fallback
      // Flash 3.0 is very capable of JSON structure, good fallback for slides if Pro is busy
      const response = await executeWithFallback(
        () => ai.models.generateContent({ model: 'gemini-3-pro-preview', contents, config }),
        () => ai.models.generateContent({ model: 'gemini-3-flash-preview', contents, config }),
        "SlidesGeneration"
      );
      
      if (response.text) {
          incrementUsage('DEEP_THINK');
          return JSON.parse(response.text) as PresentationData;
      }
      throw new Error("Failed to generate slides JSON");
    } catch (error) {
      console.error("Slides Generation Error:", error);
      throw error;
    }
};

// 3.3 Chat with PDF
export const chatWithPdf = async (file: File, message: string, history: any[]) => {
    const ai = getAiClient();
    const filePart = await fileToGenerativePart(file);
    const modelId = 'gemini-3-flash-preview';

    try {
        const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: modelId,
            contents: [
                ...history, 
                { 
                    role: 'user', 
                    parts: [
                        { inlineData: filePart }, 
                        { text: message }
                    ] 
                }
            ]
        }));
        
        return response.text;
    } catch (error) {
        console.error("PDF Chat Error:", error);
        throw error;
    }
}


// 4. Generate Infographic from Summary (Advanced Chain: Text-to-Prompt -> Image)
export const generateMedicalInfographic = async (summary: string) => {
  const ai = getAiClient();
  const designModelId = 'gemini-3-flash-preview';
  const imageModelId = 'gemini-2.5-flash-image';

  try {
    const architectPrompt = `
      Atue como um Especialista em Infográficos Médicos.
      Sua missão é criar um PROMPT DE IMAGEM para gerar um infográfico.
      Contexto Médico: "${summary.slice(0, 1500)}"
      Escreva um prompt de imagem em INGLÊS.
      Gere APENAS o prompt final da imagem.
    `;

    const designResponse = await withRetry(() => ai.models.generateContent({
      model: designModelId,
      contents: { parts: [{ text: architectPrompt }] }
    })) as GenerateContentResponse;

    const creativePrompt = designResponse.text || `Medical infographic poster. Title text: "RESUMO CLÍNICO". Minimalist icons, white background. Correct Brazilian Portuguese spelling. High resolution.`;

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: imageModelId,
      contents: {
        parts: [{ text: creativePrompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "3:4", 
        }
      }
    }));

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        incrementUsage('IMAGE_GEN');
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image generated by the model.");

  } catch (error) {
    console.error("Infographic Generation Error:", error);
    throw error;
  }
};

// 5. Audio Transcription
export const transcribeAudio = async (audioBlob: Blob) => {
  const ai = getAiClient();
  const modelId = 'gemini-3-flash-preview';

  const reader = new FileReader();
  const base64Data = await new Promise<string>((resolve, reject) => {
    reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: audioBlob.type || 'audio/wav', data: base64Data } },
          { text: "Transcreva este áudio médico com precisão. Se houver terminologia técnica, use a grafia correta." }
        ]
      }
    }));

    return response.text;
  } catch (error) {
    console.error("Transcription Error:", error);
    throw error;
  }
};
