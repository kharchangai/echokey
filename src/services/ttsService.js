const STORAGE_KEY = "echokey_config";

let currentAudio = null;
let currentObjectUrl = null;

/**
 * Reads TTS config from localStorage.
 */
const getTtsConfig = () => {
  const storedConfig = localStorage.getItem(STORAGE_KEY);

  if (!storedConfig) {
    throw new Error("Settings are not configured");
  }

  const config = JSON.parse(storedConfig);

  const baseUrl = String(config.baseUrl || "").replace(/\/+$/, "");
  const apiKey = String(config.apiKey || "").trim();

  const ttsModel = String(
    config.ttsModel || "gemini-2.5-flash-preview-tts",
  ).trim();

  const ttsVoice = String(config.ttsVoice || "Kore").trim();

  if (!baseUrl || !apiKey) {
    throw new Error("Missing API settings");
  }

  return {
    baseUrl,
    apiKey,
    ttsModel,
    ttsVoice,
  };
};

/**
 * Requests speech audio from the configured API.
 */
const requestSpeechAudio = async (text) => {
  const cleanText = String(text || "").trim();

  if (!cleanText) {
    throw new Error("No selected text");
  }

  const { baseUrl, apiKey, ttsModel, ttsVoice } = getTtsConfig();

  const response = await fetch(`${baseUrl}/audio/speech`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ttsModel,
      input: cleanText,
      voice: ttsVoice,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`TTS failed ${response.status} ${errorText}`);
  }

  return response.blob();
};

/**
 * Stops current TTS playback.
 */
export const stopTextToSpeech = () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }

  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
};

/**
 * Converts text to speech and plays it.
 */
export const speakText = async (
  text,
  {
    onGenerating = () => {},
    onSpeaking = () => {},
    onEnded = () => {},
    onError = () => {},
  } = {},
) => {
  try {
    stopTextToSpeech();

    onGenerating();

    const audioBlob = await requestSpeechAudio(text);

    currentObjectUrl = URL.createObjectURL(audioBlob);
    currentAudio = new Audio(currentObjectUrl);

    currentAudio.onplay = () => {
      onSpeaking(currentAudio);
    };

    currentAudio.onended = () => {
      stopTextToSpeech();
      onEnded();
    };

    currentAudio.onerror = () => {
      const error = new Error("Audio playback failed");

      stopTextToSpeech();
      onError(error);
    };

    await currentAudio.play();
  } catch (error) {
    stopTextToSpeech();
    onError(error);
  }
};