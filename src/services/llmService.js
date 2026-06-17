import { ChatOpenAI } from "@langchain/openai";

const STORAGE_KEY = "echokey_config";

const DEFAULT_LLM_MODEL = "gpt-3.5-turbo";

const DEFAULT_CLEANUP_PROMPT =
  "You are EchoKey's text cleanup assistant. Fix transcription mistakes, remove filler words, improve clarity, and keep the user's original meaning. Return only the final corrected text.";

const DEFAULT_TRANSLATION_PROMPT =
  "Translate the following text to the target language. Preserve the original meaning, formatting, and tone. Return only the translated text.";

const LANGUAGE_LABELS = {
  auto: "Auto Detect",
  fa: "Persian",
  en: "English",
  ar: "Arabic",
  tr: "Turkish",
  de: "German",
  fr: "French",
  es: "Spanish",
};

/**
 * Reads full EchoKey config from localStorage.
 */
export const getEchoKeyConfig = () => {
  const storedConfig = localStorage.getItem(STORAGE_KEY);

  if (!storedConfig) {
    throw new Error("Settings are not configured. Please set them in the settings panel.");
  }

  return JSON.parse(storedConfig);
};

/**
 * Reads LLM configuration from localStorage.
 * @returns {{baseUrl: string, apiKey: string, llmModel: string}}
 */
const getLlmConfig = () => {
  const config = getEchoKeyConfig();

  const baseUrl = String(config.baseUrl || "").replace(/\/+$/, "");
  const apiKey = String(config.apiKey || "").trim();
  const llmModel = String(config.llmModel || DEFAULT_LLM_MODEL).trim();

  if (!baseUrl || !apiKey) {
    throw new Error("Missing API Key or Base URL in settings.");
  }

  if (!llmModel) {
    throw new Error("Missing LLM model in settings.");
  }

  return {
    baseUrl,
    apiKey,
    llmModel,
  };
};

const getLanguageName = (languageCode) => {
  const cleanLanguageCode = String(languageCode || "auto").trim();

  return LANGUAGE_LABELS[cleanLanguageCode] || cleanLanguageCode;
};

const extractTextContent = (responseContent) => {
  if (typeof responseContent === "string") {
    return responseContent.trim();
  }

  if (Array.isArray(responseContent)) {
    return responseContent
      .map((part) => {
        if (typeof part === "string") return part;
        if (part?.text) return part.text;
        if (part?.content) return part.content;
        return "";
      })
      .join("")
      .trim();
  }

  return String(responseContent || "").trim();
};

/**
 * Sends a prompt to the configured Language Model using LangChain and returns the response.
 * @param {string} prompt
 * @returns {Promise<string>}
 */
export const sendMessageToLLM = async (prompt) => {
  const cleanPrompt = String(prompt || "").trim();

  if (!cleanPrompt) {
    throw new Error("Prompt cannot be empty");
  }

  try {
    const { baseUrl, apiKey, llmModel } = getLlmConfig();

    const chatModel = new ChatOpenAI({
      apiKey,
      modelName: llmModel,
      temperature: 0.3,
      configuration: {
        baseURL: baseUrl,
      },
    });

    const response = await chatModel.invoke(cleanPrompt);

    return extractTextContent(response.content);
  } catch (error) {
    console.error("LangChain LLM request failed:", error);
    throw error;
  }
};

/**
 * Checks whether LLM is globally enabled in Settings.
 */
export const isLlmEnabled = () => {
  try {
    const config = getEchoKeyConfig();

    return config.enableLlm === true;
  } catch {
    return false;
  }
};

/**
 * Cleans/corrects/rewrites text using user's LLM prompt.
 * Used after STT before paste.
 *
 * @param {string} text
 * @returns {Promise<string>}
 */
export const processTextWithLLM = async (text) => {
  const cleanText = String(text || "").trim();

  if (!cleanText) {
    throw new Error("Text cannot be empty");
  }

  const config = getEchoKeyConfig();

  const userPrompt = String(config.llmPrompt || DEFAULT_CLEANUP_PROMPT).trim();

  const prompt = `
${userPrompt}

Rules:
- Return only the final text.
- Do not explain what you changed.
- Do not wrap the answer in quotes or markdown.
- Keep the original meaning.

Text:
${cleanText}
`.trim();

  const result = await sendMessageToLLM(prompt);

  return String(result || "").trim();
};

/**
 * Translates text using user's translation prompt.
 * Used for STT translation before paste and TTS translation before speech.
 *
 * @param {string} text
 * @param {string} targetLanguage
 * @returns {Promise<string>}
 */
export const translateTextWithLLM = async (text, targetLanguage) => {
  const cleanText = String(text || "").trim();

  if (!cleanText) {
    throw new Error("Text cannot be empty");
  }

  const languageCode = String(targetLanguage || "auto").trim();

  if (!languageCode || languageCode === "auto") {
    return cleanText;
  }

  const config = getEchoKeyConfig();

  const translationPrompt = String(
    config.translationPrompt || DEFAULT_TRANSLATION_PROMPT,
  ).trim();

  const targetLanguageName = getLanguageName(languageCode);

  const prompt = `
${translationPrompt}

Target language: ${targetLanguageName}

Rules:
- Return only the translated text.
- Do not explain anything.
- Do not include markdown.
- Preserve meaning, tone, and formatting as much as possible.

Text:
${cleanText}
`.trim();

  const result = await sendMessageToLLM(prompt);

  return String(result || "").trim();
};

/**
 * Applies STT post-processing:
 * 1. LLM correction if enabled
 * 2. LLM translation if enabled
 *
 * @param {string} text
 * @returns {Promise<string>}
 */
export const processSttTextBeforePaste = async (text) => {
  let finalText = String(text || "").trim();

  if (!finalText) {
    throw new Error("Text cannot be empty");
  }

  const config = getEchoKeyConfig();

  if (config.enableLlm !== true) {
    return finalText;
  }

  if (config.correctSttWithLlm === true) {
    finalText = await processTextWithLLM(finalText);
  }

  if (config.translateAfterStt === true) {
    const targetLanguage =
      config.sttOutputLanguage ||
      config.sttTargetLanguage ||
      "fa";

    finalText = await translateTextWithLLM(finalText, targetLanguage);
  }

  return finalText;
};

/**
 * Applies TTS pre-processing:
 * 1. LLM translation if enabled
 *
 * @param {string} text
 * @returns {Promise<string>}
 */
export const processTtsTextBeforeSpeech = async (text) => {
  let finalText = String(text || "").trim();

  if (!finalText) {
    throw new Error("Text cannot be empty");
  }

  const config = getEchoKeyConfig();

  if (config.enableLlm !== true) {
    return finalText;
  }

  if (config.translateBeforeTts === true) {
    const targetLanguage =
      config.ttsOutputLanguage ||
      config.ttsTargetLanguage ||
      "en";

    finalText = await translateTextWithLLM(finalText, targetLanguage);
  }

  return finalText;
};