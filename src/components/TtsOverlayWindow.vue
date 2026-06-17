<template>
  <div class="pointer-events-none flex h-screen w-screen items-center justify-center overflow-hidden bg-transparent">
    <Transition name="dock" appear>
      <div
        v-if="isVisible"
        class="relative flex h-[64px] w-[500px] items-center gap-3 overflow-hidden rounded-full border px-4 text-white backdrop-blur-2xl transition-all duration-500"
        :class="barClass"
      >
        <!-- Soft inner ambient glow -->
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
            v-if="isSpeaking"
            class="absolute h-10 w-10 animate-ping rounded-full bg-emerald-400/20"
          ></span>

          <!-- Generating icon -->
          <svg
            v-if="isGenerating"
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

          <!-- Speaking icon -->
          <svg
            v-else-if="isSpeaking"
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
              d="M11 5 6 9H3v6h3l5 4V5Z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M15.54 8.46a5 5 0 0 1 0 7.08"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M18.36 5.64a9 9 0 0 1 0 12.72"
            />
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
        <div class="relative z-10 min-w-[135px]">
          <div class="flex items-center gap-2">
            <p class="text-sm font-semibold tracking-tight">
              {{ titleText }}
            </p>

            <span
              v-if="isSpeaking"
              class="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.9)]"
            ></span>
          </div>

          <p class="mt-0.5 max-w-[150px] truncate text-[11px] text-white/45">
            {{ subtitleText }}
          </p>
        </div>

        <!-- Speaking waveform -->
        <div
          v-if="isSpeaking"
          class="relative z-10 flex h-9 flex-1 items-center justify-center gap-1 overflow-hidden rounded-full bg-white/[0.045] px-3"
        >
          <div
            v-for="(bar, index) in compactBars"
            :key="index"
            class="w-1 rounded-full bg-gradient-to-t from-emerald-300 via-cyan-200 to-sky-200 transition-all duration-75"
            :style="{ height: `${bar}px` }"
          ></div>
        </div>

        <!-- Generating scanner -->
        <div
          v-else-if="isGenerating"
          class="relative z-10 h-9 flex-1 overflow-hidden rounded-full bg-white/[0.045]"
        >
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-violet-400/15 to-transparent"></div>

          <div class="h-full w-1/2 animate-scan rounded-full bg-gradient-to-r from-violet-500/0 via-fuchsia-300/70 to-cyan-400/0"></div>

          <div class="absolute inset-0 flex items-center justify-center">
            <div class="flex gap-1">
              <span
                v-for="item in 3"
                :key="item"
                class="h-1.5 w-1.5 animate-dot rounded-full bg-fuchsia-200/80"
                :style="{ animationDelay: `${item * 120}ms` }"
              ></span>
            </div>
          </div>
        </div>

        <!-- Error message -->
        <div
          v-else
          class="relative z-10 max-w-[230px] flex-1 truncate text-xs text-red-200/90"
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
import { processTtsTextBeforeSpeech } from "../services/llmService";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { speakText, stopTextToSpeech } from "../services/ttsService";

const isVisible = ref(false);
const state = ref("idle");
const errorMessage = ref("");

const bars = ref(Array.from({ length: 28 }, () => 8));

let unlistenTtsCommand = null;
let audioContext = null;
let analyser = null;
let animationFrameId = null;
let hideTimer = null;

const compactBars = computed(() => bars.value.slice(0, 24));

const isGenerating = computed(() => state.value === "generating");
const isSpeaking = computed(() => state.value === "speaking");

const titleText = computed(() => {
  if (isGenerating.value) return "Generating speech";
  if (isSpeaking.value) return "Speaking";
  return "Error";
});

const subtitleText = computed(() => {
  if (isGenerating.value) return "Converting selected text";
  if (isSpeaking.value) return "Playing selected text";
  return "Something went wrong";
});

const badgeText = computed(() => {
  if (isGenerating.value) return "TTS";
  if (isSpeaking.value) return "PLAY";
  return "!";
});

const barClass = computed(() => {
  if (isGenerating.value) {
    return "border-violet-500/10 bg-zinc-950/85 shadow-[0_8px_32px_rgba(168,85,247,0.12)]";
  }

  if (isSpeaking.value) {
    return "border-emerald-500/10 bg-zinc-950/85 shadow-[0_8px_32px_rgba(52,211,153,0.12)]";
  }

  return "border-red-500/10 bg-zinc-950/85 shadow-[0_8px_32px_rgba(248,113,113,0.11)]";
});

const glowClass = computed(() => {
  if (isGenerating.value) {
    return "bg-[radial-gradient(circle_at_20%_50%,rgba(168,85,247,0.14),transparent_45%),radial-gradient(circle_at_80%_50%,rgba(34,211,238,0.10),transparent_45%)]";
  }

  if (isSpeaking.value) {
    return "bg-[radial-gradient(circle_at_20%_50%,rgba(52,211,153,0.15),transparent_45%),radial-gradient(circle_at_80%_50%,rgba(56,189,248,0.10),transparent_45%)]";
  }

  return "bg-[radial-gradient(circle_at_30%_50%,rgba(248,113,113,0.12),transparent_45%)]";
});

const orbClass = computed(() => {
  if (isGenerating.value) {
    return "bg-violet-400/10 text-violet-200 ring-1 ring-violet-300/10 shadow-[0_0_16px_rgba(168,85,247,0.14)]";
  }

  if (isSpeaking.value) {
    return "bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-300/10 shadow-[0_0_16px_rgba(52,211,153,0.15)]";
  }

  return "bg-red-400/10 text-red-200 ring-1 ring-red-300/10";
});

const badgeClass = computed(() => {
  if (isGenerating.value) {
    return "bg-violet-400/8 text-violet-200 ring-1 ring-violet-300/10";
  }

  if (isSpeaking.value) {
    return "bg-emerald-400/8 text-emerald-200 ring-1 ring-emerald-300/10";
  }

  return "bg-red-400/8 text-red-200 ring-1 ring-red-300/10";
});

const startTts = async (text) => {
  const selectedText = String(text || "").trim();

  if (!selectedText) {
    showError("No selected text");
    return;
  }

  clearHideTimer();
  stopVisualizer();
  stopTextToSpeech();

  isVisible.value = true;
  errorMessage.value = "";
  state.value = "generating";

  try {
    /**
     * New flow:
     * 1. If enableLlm + translateBeforeTts => translate selected text to ttsOutputLanguage
     * 2. Send final text to TTS
     */
    const finalText = await processTtsTextBeforeSpeech(selectedText);

    if (!finalText) {
      throw new Error("Empty text after TTS preprocessing");
    }

    await speakText(finalText, {
      onGenerating: () => {
        isVisible.value = true;
        state.value = "generating";
      },

      onSpeaking: (audioElement) => {
        isVisible.value = true;
        state.value = "speaking";
        startAudioVisualizer(audioElement);
      },

      onEnded: async () => {
        stopVisualizer();

        state.value = "idle";
        isVisible.value = false;

        await invoke("hide_tts_overlay").catch(() => {});
      },

      onError: (error) => {
        console.error("TTS failed:", error);
        showError(error.message || "TTS failed");
      },
    });
  } catch (error) {
    console.error("TTS preprocessing failed:", error);
    showError(error.message || "TTS preprocessing failed");
  }
};

const showError = (message) => {
  clearHideTimer();

  stopVisualizer();
  stopTextToSpeech();

  errorMessage.value = message;
  state.value = "error";
  isVisible.value = true;

  hideTimer = setTimeout(async () => {
    errorMessage.value = "";
    state.value = "idle";
    isVisible.value = false;

    await invoke("hide_tts_overlay").catch(() => {});
  }, 2500);
};

const startAudioVisualizer = (audioElement) => {
  stopVisualizer();

  audioContext = new AudioContext();

  const source = audioContext.createMediaElementSource(audioElement);

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 128;
  analyser.smoothingTimeConstant = 0.68;

  source.connect(analyser);
  analyser.connect(audioContext.destination);

  const dataArray = new Uint8Array(analyser.frequencyBinCount);

  const draw = () => {
    if (!analyser) {
      return;
    }

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

const clearHideTimer = () => {
  if (hideTimer) {
    clearTimeout(hideTimer);
    hideTimer = null;
  }
};

onMounted(async () => {
  unlistenTtsCommand = await listen("start-tts-command", async (event) => {
    await startTts(event.payload);
  });
});

onBeforeUnmount(() => {
  if (unlistenTtsCommand) {
    unlistenTtsCommand();
  }

  clearHideTimer();
  stopTextToSpeech();
  stopVisualizer();

  invoke("hide_tts_overlay").catch(() => {});
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
  0%,
  80%,
  100% {
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