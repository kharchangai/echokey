<template>
  <div class="pointer-events-none flex h-screen w-screen items-center justify-center overflow-hidden bg-transparent">
    <Transition name="dock" appear>
      <div
        v-if="isRecording || isProcessing || errorMessage"
        class="relative flex h-[64px] w-[500px] items-center gap-3 overflow-hidden rounded-full border px-4 text-white backdrop-blur-2xl transition-all duration-500"
        :class="barClass"
      >
        <!-- Animated glow background -->
        <div
          class="absolute inset-0 opacity-70 transition-all duration-500"
          :class="glowClass"
        ></div>

        <!-- Glass highlight -->
        <div class="absolute inset-x-5 top-0 h-px bg-white/25"></div>

        <!-- Status orb -->
        <div
          class="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all duration-500"
          :class="orbClass"
        >
          <span
            v-if="isRecording"
            class="absolute h-10 w-10 animate-ping rounded-full bg-red-400/25"
          ></span>

          <!-- Recording mic icon -->
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

        <!-- Text -->
        <div class="relative z-10 min-w-[120px]">
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
          <div class="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent"></div>

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

        <!-- Error short text -->
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
import { ref } from "vue";

const STORAGE_KEY = "echokey_config";

const status = ref("idle"); // 'idle' | 'recording' | 'transcribing'
const resultText = ref("");
const error = ref("");

let mediaRecorder = null;
let audioChunks = [];

// 1. Start Recording
const startRecording = async () => {
  error.value = "";
  resultText.value = "";
  audioChunks = [];

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      
      // Stop microphone hardware
      stream.getTracks().forEach((track) => track.stop());

      // Send to API
      await transcribeAudio(audioBlob);
    };

    mediaRecorder.start();
    status.value = "recording";
  } catch (err) {
    console.error(err);
    error.value = "Could not access microphone.";
    status.value = "idle";
  }
};

// 2. Stop Recording
const stopRecording = () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    status.value = "transcribing";
  }
};

// 3. Send Audio to your saved Provider API
const transcribeAudio = async (audioBlob) => {
  // Read saved settings
  const storedConfig = localStorage.getItem(STORAGE_KEY);
  if (!storedConfig) {
    error.value = "Please save your settings first.";
    status.value = "idle";
    return;
  }

  const { baseUrl, apiKey, sttModel } = JSON.parse(storedConfig);

  if (!baseUrl || !apiKey || !sttModel) {
    error.value = "Base URL, API Key, and STT Model are required in settings.";
    status.value = "idle";
    return;
  }

  try {
    const formData = new FormData();
    formData.append("file", audioBlob, "audio.webm");
    formData.append("model", sttModel);

    const response = await fetch(`${baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`API Error (Status ${response.status})`);
    }

    const data = await response.json();
    
    if (data && data.text) {
      resultText.value = data.text; // Here is your final text!
    } else {
      throw new Error("No text returned from API.");
    }

  } catch (err) {
    console.error(err);
    error.value = err.message || "Something went wrong.";
  } finally {
    status.value = "idle";
  }
};
</script>