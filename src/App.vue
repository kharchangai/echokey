<template>
  <VoiceOverlayWindow v-if="currentWindowType === 'overlay'" />
  <TtsOverlayWindow v-else-if="currentWindowType === 'tts_overlay'" />
  <Settings v-else />
</template>

<script setup>
import { computed } from "vue";
import Settings from "./components/Settings.vue";
import VoiceOverlayWindow from "./components/VoiceOverlayWindow.vue";
import TtsOverlayWindow from "./components/TtsOverlayWindow.vue";

const currentWindowType = computed(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get("window") || "main";
});
</script>

<style>
html,
body,
#app {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: transparent !important;
  background-color: transparent !important;
}

body {
  background: transparent !important;
  background-color: transparent !important;
}

* {
  box-sizing: border-box;
}
</style>