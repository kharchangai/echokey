<template>
  <div class="pointer-events-none flex h-screen w-screen items-center justify-center overflow-hidden bg-transparent">
    <Transition name="dock" appear>
      <div
        v-if="isRecording || isProcessing || errorMessage"
        class="relative flex h-[64px] w-[500px] items-center gap-3 overflow-hidden rounded-full border px-4 text-white backdrop-blur-2xl transition-all duration-500"
        :class="barClass"
      >
        <!-- Soft inner ambient glow, clipped inside the capsule -->
        <div
          class="pointer-events-none absolute inset-0 opacity-80 transition-all duration-500"
          :class="glowClass"
        ></div>

        <!-- Status orb -->
        <div
          class="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-500"
          :class="orbClass"
        >
          <span
            v-if="isRecording"
            class="absolute h-10 w-10 animate-ping rounded-full bg-red-400/25"
          ></span>

          <!-- Recording icon -->
          <svg
            v-if="isRecording"
            xmlns="http://www.w3.org/2000/svg"
            class="relative h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 14a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3Z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M19 11a7 7 0 0 1-14 0"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 18v3"
            />
          </svg>

          <!-- Processing icon -->
          <svg
            v-else-if="isProcessing"
            class="relative h-5 w-5 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-20"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            ></circle>
            <path
              class="opacity-90"
              fill="currentColor"
              d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z"
            ></path>
          </svg>

          <!-- Error icon -->
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            class="relative h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
            />
          </svg>
        </div>

        <!-- Text info -->
        <div class="relative z-10 min-w-[122px]">
          <div class="flex items-center gap-2">
            <p class="text-sm font-semibold tracking-tight">
              {{ titleText }}
            </p>

            <span
              v-if="isRecording"
              class="h-1.5 w-1.5 rounded-full bg-red-300 shadow-[0_0_12px_rgba(252,165,165,0.9)]"
            ></span>
          </div>

          <p class="mt-0.5 text-[11px] text-white/45">
            {{ subtitleText }}
          </p>
        </div>

        <!-- Recording waveform -->
        <div
          v-if="isRecording"
          class="relative z-10 flex h-9 flex-1 items-center justify-center gap-1 overflow-hidden rounded-full bg-white/[0.045] px-3"
        >
          <div
            v-for="(bar, index) in compactBars"
            :key="index"
            class="w-1 rounded-full bg-gradient-to-t from-red-300 via-pink-300 to-orange-200 transition-all duration-75"
            :style="{ height: `${bar}px` }"
          ></div>
        </div>

        <!-- Processing scanner -->
        <div
          v-else-if="isProcessing"
          class="relative z-10 h-9 flex-1 overflow-hidden rounded-full bg-white/[0.045]"
        >
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/15 to-transparent"></div>

          <div class="h-full w-1/2 animate-scan rounded-full bg-gradient-to-r from-blue-500/0 via-cyan-300/70 to-violet-400/0"></div>

          <div class="absolute inset-0 flex items-center justify-center">
            <div class="flex gap-1">
              <span
                v-for="item in 3"
                :key="item"
                class="h-1.5 w-1.5 animate-dot rounded-full bg-cyan-200/80"
                :style="{ animationDelay: `${item * 120}ms` }"
              ></span>
            </div>
          </div>
        </div>

        <!-- Error message -->
        <div
          v-else
          class="relative z-10 max-w-[210px] truncate text-xs text-red-200/90"
        >
          {{ errorMessage }}
        </div>

        <!-- Badge -->
        <div
          class="relative z-10 shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide transition-all duration-500"
          :class="badgeClass"
        >
          {{ badgeText }}
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { processSttTextBeforePaste } from "../services/llmService";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

const STORAGE_KEY = "echokey_config";

const isRecording = ref(false);
const isProcessing = ref(false);
const errorMessage = ref("");

const bars = ref(Array.from({ length: 28 }, () => 8));

let mediaRecorder = null;
let audioChunks = [];
let audioStream = null;

let audioContext = null;
let analyser = null;
let animationFrameId = null;

let unlistenStartCommand = null;
let unlistenStopCommand = null;

const compactBars = computed(() => bars.value.slice(0, 24));

const titleText = computed(() => {
  if (isRecording.value) return "Listening";
  if (isProcessing.value) return "Writing";
  return "Error";
});

const subtitleText = computed(() => {
  if (isRecording.value) return "Press Ctrl Alt 1 to stop";
  if (isProcessing.value) return "Generating text";
  return "Something went wrong";
});

const badgeText = computed(() => {
  if (isRecording.value) return "REC";
  if (isProcessing.value) return "AI";
  return "!";
});

const barClass = computed(() => {
  if (isRecording.value) {
    return "border-red-500/10 bg-zinc-950/85 shadow-[0_8px_32px_rgba(248,113,113,0.12)]";
  }

  if (isProcessing.value) {
    return "border-cyan-500/10 bg-zinc-950/85 shadow-[0_8px_32px_rgba(34,211,238,0.11)]";
  }

  return "border-red-500/10 bg-zinc-950/85 shadow-[0_8px_32px_rgba(248,113,113,0.11)]";
});

const glowClass = computed(() => {
  if (isRecording.value) {
    return "bg-[radial-gradient(circle_at_20%_50%,rgba(248,113,113,0.16),transparent_45%),radial-gradient(circle_at_80%_50%,rgba(244,114,182,0.10),transparent_45%)]";
  }

  if (isProcessing.value) {
    return "bg-[radial-gradient(circle_at_20%_50%,rgba(34,211,238,0.14),transparent_45%),radial-gradient(circle_at_80%_50%,rgba(139,92,246,0.10),transparent_45%)]";
  }

  return "bg-[radial-gradient(circle_at_30%_50%,rgba(248,113,113,0.12),transparent_45%)]";
});

const orbClass = computed(() => {
  if (isRecording.value) {
    return "bg-red-400/10 text-red-200 ring-1 ring-red-300/10 shadow-[0_0_16px_rgba(248,113,113,0.15)]";
  }

  if (isProcessing.value) {
    return "bg-cyan-400/10 text-cyan-200 ring-1 ring-cyan-300/10 shadow-[0_0_16px_rgba(34,211,238,0.13)]";
  }

  return "bg-red-400/10 text-red-200 ring-1 ring-red-300/10";
});

const badgeClass = computed(() => {
  if (isRecording.value) {
    return "bg-red-400/8 text-red-200 ring-1 ring-red-300/10";
  }

  if (isProcessing.value) {
    return "bg-cyan-400/8 text-cyan-200 ring-1 ring-cyan-300/10";
  }

  return "bg-red-400/8 text-red-200 ring-1 ring-red-300/10";
});

const startRecording = async () => {
  if (isRecording.value || isProcessing.value) {
    return;
  }

  errorMessage.value = "";
  audioChunks = [];

  try {
    audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    const mimeType = getSupportedMimeType();

    mediaRecorder = new MediaRecorder(
      audioStream,
      mimeType ? { mimeType } : undefined,
    );

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      stopVisualizer();

      const audioBlob = new Blob(audioChunks, {
        type: mimeType || "audio/webm",
      });

      cleanupStream();

      isRecording.value = false;
      isProcessing.value = true;

      await transcribeAudio(audioBlob);

      isProcessing.value = false;

      await invoke("set_recording_state", { isRecording: false }).catch(() => {});
      await invoke("hide_overlay").catch(() => {});
    };

    mediaRecorder.start(250);
    isRecording.value = true;

    await invoke("set_recording_state", { isRecording: true }).catch(() => {});

    startVisualizer(audioStream);
  } catch (error) {
    console.error("Failed to start recording:", error);
    errorMessage.value = "Microphone access failed";
    isRecording.value = false;
    isProcessing.value = false;
    cleanupStream();
    await invoke("set_recording_state", { isRecording: false }).catch(() => {});
    hideErrorLater();
  }
};

const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    return;
  }

  isRecording.value = false;
  cleanupStream();
  stopVisualizer();

  invoke("set_recording_state", { isRecording: false }).catch(() => {});
  invoke("hide_overlay").catch(() => {});
};

const transcribeAudio = async (audioBlob) => {
  try {
    const storedConfig = localStorage.getItem(STORAGE_KEY);

    if (!storedConfig) {
      throw new Error("Settings are not configured");
    }

    const config = JSON.parse(storedConfig);

    const baseUrl = String(config.baseUrl || "").replace(/\/+$/, "");
    const apiKey = String(config.apiKey || "").trim();
    const sttModel = String(config.sttModel || "").trim();

    if (!baseUrl || !apiKey || !sttModel) {
      throw new Error("Missing API settings");
    }

    const formData = new FormData();

    formData.append("file", audioBlob, getAudioFileName(audioBlob.type));
    formData.append("model", sttModel);

    /**
     * Important:
     * We removed Dictation Language from Settings UI.
     * If old configs still have config.language, we keep backward compatibility.
     * But if language is auto, we do not send it.
     */
    if (config.language && config.language !== "auto") {
      formData.append("language", config.language);
    }

    const response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(`STT failed ${response.status} ${errorText}`);
    }

    const data = await response.json();

    let text = String(data.text || "").trim();

    if (!text) {
      throw new Error("Empty text");
    }

    console.log("Raw transcribed text:", text);

    /**
     * New flow:
     * 1. If enableLlm + correctSttWithLlm => clean/rewrite with user's llmPrompt
     * 2. If enableLlm + translateAfterStt => translate to sttOutputLanguage
     * 3. Paste final text
     */
    text = await processSttTextBeforePaste(text);

    if (!text) {
      throw new Error("Empty processed text");
    }

    if (config.autoPaste !== false) {
      try {
        await invoke("paste_text", { text });
      } catch (shiftInsertError) {
        console.warn("Shift + Insert paste failed:", shiftInsertError);
        await invoke("paste_text_with_ctrl_v", { text });
      }
    }

    console.log("Final STT text:", text);
  } catch (error) {
    console.error("Transcription failed:", error);
    errorMessage.value = error.message || "Transcription failed";
    hideErrorLater();
  }
};

const startVisualizer = (stream) => {
  audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.68;

  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  const draw = () => {
    if (!analyser) return;
    analyser.getByteFrequencyData(dataArray);

    const nextBars = [];
    for (let i = 0; i < 28; i += 1) {
      const value = dataArray[i] || 0;
      const height = Math.max(4, Math.min(28, Math.round(value / 7)));
      nextBars.push(height);
    }

    bars.value = nextBars;
    animationFrameId = requestAnimationFrame(draw);
  };

  draw();
};

const stopVisualizer = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }
  analyser = null;
  bars.value = Array.from({ length: 28 }, () => 8);
};

const cleanupStream = () => {
  if (audioStream) {
    audioStream.getTracks().forEach((track) => track.stop());
    audioStream = null;
  }
};

const getSupportedMimeType = () => {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
};

const getAudioFileName = (mimeType) => {
  if (mimeType.includes("ogg")) return "audio.ogg";
  if (mimeType.includes("mp4")) return "audio.mp4";
  return "audio.webm";
};

const hideErrorLater = () => {
  setTimeout(async () => {
    errorMessage.value = "";
    if (!isRecording.value && !isProcessing.value) {
      await invoke("hide_overlay").catch(() => {});
    }
  }, 2500);
};

onMounted(async () => {
  unlistenStartCommand = await listen("start-recording-command", async () => {
    await startRecording();
  });

  unlistenStopCommand = await listen("stop-recording-command", () => {
    stopRecording();
  });
});

onBeforeUnmount(() => {
  if (unlistenStartCommand) unlistenStartCommand();
  if (unlistenStopCommand) unlistenStopCommand();
  stopVisualizer();
  cleanupStream();
  invoke("set_recording_state", { isRecording: false }).catch(() => {});
});
</script>

<style scoped>
.dock-enter-active,
.dock-leave-active {
  transition:
    opacity 220ms cubic-bezier(0.16, 1, 0.3, 1),
    transform 220ms cubic-bezier(0.16, 1, 0.3, 1),
    filter 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

.dock-enter-from,
.dock-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.96);
  filter: blur(6px);
}

@keyframes scan {
  0% {
    transform: translateX(-130%);
  }
  100% {
    transform: translateX(260%);
  }
}

.animate-scan {
  animation: scan 1.35s ease-in-out infinite;
}

@keyframes dot {
  0%, 80%, 100% {
    opacity: 0.25;
    transform: translateY(0);
  }
  40% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

.animate-dot {
  animation: dot 1s ease-in-out infinite;
}
</style>