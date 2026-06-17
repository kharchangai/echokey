import { computed, h, nextTick, reactive, ref } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";

const STORAGE_KEY = "echokey_config";

const defaultSettings = {
  baseUrl: "",
  apiKey: "",

  sttModel: "gemini-2.5-flash",
  llmModel: "gemini-2.5-flash",
  ttsModel: "gemini-2.5-flash-preview-tts",
  ttsVoice: "zephyr",

  // LLM control
  enableLlm: true,

  // Prompts
  llmPrompt:
    "Fix transcription mistakes, remove filler words, clean grammar, and rewrite the text in a clear professional tone. Keep the original meaning. Return only the final text.",
  translationPrompt:
    "Translate the text to the target language naturally. Preserve meaning, tone, names, technical terms, and formatting. Return only the translated text.",

  // Output languages
  sttOutputLanguage: "fa",
  ttsOutputLanguage: "en",

  // Kept for app behavior, but hidden from Settings UI
  autoPaste: true,

  correctSttWithLlm: false,

  translateBeforeTts: false,
  ttsTargetLanguage: "en",

  translateAfterStt: false,
  sttTargetLanguage: "fa",

  sttShortcut: "Control+Alt+1",
  ttsShortcut: "Control+Alt+S",
};

const normalizeSettings = (value) => {
  const normalizedValue = {
    ...defaultSettings,
    ...(value || {}),
  };

  // Backward compatibility with old configs
  if (value?.language && !value?.sttOutputLanguage) {
    normalizedValue.sttOutputLanguage = value.language;
  }

  if (value?.sttTargetLanguage && !value?.sttOutputLanguage) {
    normalizedValue.sttOutputLanguage = value.sttTargetLanguage;
  }

  if (value?.ttsTargetLanguage && !value?.ttsOutputLanguage) {
    normalizedValue.ttsOutputLanguage = value.ttsTargetLanguage;
  }

  return normalizedValue;
};

const loadSettings = () => {
  try {
    const rawValue = localStorage.getItem(STORAGE_KEY);

    if (!rawValue) {
      return { ...defaultSettings };
    }

    return normalizeSettings(JSON.parse(rawValue));
  } catch (error) {
    console.error("Failed to load settings:", error);
    return { ...defaultSettings };
  }
};

const saveSettingsToStorage = (settings) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...settings }));
};

const SelectArrow = {
  name: "SelectArrow",

  setup() {
    return () =>
      h(
        "span",
        {
          class:
            "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500",
        },
        "▼",
      );
  },
};

const ToggleSwitch = {
  name: "ToggleSwitch",

  props: {
    enabled: {
      type: Boolean,
      default: false,
    },
  },

  emits: ["toggle"],

  setup(props, { emit }) {
    return () =>
      h(
        "button",
        {
          type: "button",
          class: [
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200",
            props.enabled ? "bg-emerald-500" : "bg-zinc-700",
          ],
          onClick: () => emit("toggle"),
        },
        [
          h("span", {
            class: [
              "inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200",
              props.enabled ? "translate-x-5" : "translate-x-1",
            ],
          }),
        ],
      );
  },
};

const SettingToggle = {
  name: "SettingToggle",

  props: {
    title: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    enabled: {
      type: Boolean,
      default: false,
    },
  },

  emits: ["toggle"],

  setup(props, { emit }) {
    return () =>
      h(
        "div",
        {
          class:
            "flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4",
        },
        [
          h("div", { class: "min-w-0" }, [
            h(
              "p",
              {
                class: "text-sm font-semibold text-white",
              },
              props.title,
            ),

            props.description
              ? h(
                  "p",
                  {
                    class: "mt-1 text-xs leading-5 text-zinc-500",
                  },
                  props.description,
                )
              : null,
          ]),

          h(ToggleSwitch, {
            enabled: props.enabled,
            onToggle: () => emit("toggle"),
          }),
        ],
      );
  },
};

const FeatureStatus = {
  name: "FeatureStatus",

  props: {
    label: {
      type: String,
      default: "",
    },

    enabled: {
      type: Boolean,
      default: false,
    },
  },

  setup(props) {
    return () =>
      h(
        "div",
        {
          class:
            "flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3",
        },
        [
          h(
            "span",
            {
              class: "text-sm text-zinc-400",
            },
            props.label,
          ),

          h(
            "span",
            {
              class: [
                "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium",
                props.enabled
                  ? "bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-300/15"
                  : "bg-zinc-400/10 text-zinc-500 ring-1 ring-zinc-300/10",
              ],
            },
            [
              h("span", {
                class: [
                  "h-1.5 w-1.5 rounded-full",
                  props.enabled ? "bg-emerald-300" : "bg-zinc-500",
                ],
              }),

              props.enabled ? "On" : "Off",
            ],
          ),
        ],
      );
  },
};

export default {
  name: "Settings",

  components: {
    SelectArrow,
    SettingToggle,
    ToggleSwitch,
    FeatureStatus,
  },

  setup() {
    const settings = reactive(loadSettings());

    const showKey = ref(false);
    const saveStatus = ref("idle");
    const isSaving = ref(false);

    const capturingShortcut = ref(null);

    const isConfigured = computed(() => {
      const requiredValues = [
        settings.baseUrl,
        settings.apiKey,
        settings.sttModel,
        settings.llmModel,
        settings.ttsModel,
        settings.ttsVoice,
      ];

      return requiredValues.every((value) => String(value || "").trim());
    });

    const closeWindow = async () => {
      try {
        await getCurrentWindow().hide();
      } catch (error) {
        console.error("Failed to close settings window:", error);
      }
    };

    const resetConfiguration = () => {
      Object.assign(settings, { ...defaultSettings });

      saveSettingsToStorage(settings);

      saveStatus.value = "success";

      window.setTimeout(() => {
        saveStatus.value = "idle";
      }, 1800);
    };

    const saveConfiguration = async () => {
      isSaving.value = true;
      saveStatus.value = "idle";

      try {
        const isValid = [
          settings.baseUrl,
          settings.apiKey,
          settings.sttModel,
          settings.llmModel,
          settings.ttsModel,
          settings.ttsVoice,
        ].every((value) => String(value || "").trim());

        if (!isValid) {
          saveStatus.value = "error";
          return;
        }

        // Keep old target language fields in sync for services that still use them.
        settings.sttTargetLanguage = settings.sttOutputLanguage;
        settings.ttsTargetLanguage = settings.ttsOutputLanguage;

        saveSettingsToStorage(settings);

        saveStatus.value = "success";

        window.setTimeout(() => {
          saveStatus.value = "idle";
        }, 1800);
      } catch (error) {
        console.error("Failed to save settings:", error);
        saveStatus.value = "error";
      } finally {
        isSaving.value = false;
      }
    };

    const startShortcutCapture = async (shortcutKey) => {
      capturingShortcut.value = shortcutKey;

      await nextTick();

      const activeElement = document.activeElement;

      if (activeElement && typeof activeElement.blur === "function") {
        activeElement.blur();
      }

      window.setTimeout(() => {
        const buttons = document.querySelectorAll(".shortcut-capture-field");

        for (const button of buttons) {
          if (button.textContent.includes("Press shortcut")) {
            button.focus();
            break;
          }
        }
      }, 0);
    };

    const cancelShortcutCapture = () => {
      capturingShortcut.value = null;
    };

    const normalizeShortcutKey = (event) => {
      if (event.code === "Space") return "Space";
      if (event.code === "Escape") return "Escape";
      if (event.code === "Enter") return "Enter";
      if (event.code === "Tab") return "Tab";

      if (event.code.startsWith("Key")) {
        return event.code.replace("Key", "").toUpperCase();
      }

      if (event.code.startsWith("Digit")) {
        return event.code.replace("Digit", "");
      }

      if (event.code.startsWith("Numpad")) {
        return event.code.replace("Numpad", "Numpad");
      }

      return event.key.length === 1 ? event.key.toUpperCase() : event.key;
    };

    const handleShortcutKeydown = (event) => {
      if (!capturingShortcut.value) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") {
        cancelShortcutCapture();
        return;
      }

      const parts = [];

      if (event.ctrlKey || event.metaKey) {
        parts.push("Control");
      }

      if (event.altKey) {
        parts.push("Alt");
      }

      if (event.shiftKey) {
        parts.push("Shift");
      }

      const mainKey = normalizeShortcutKey(event);

      const ignoredKeys = [
        "Control",
        "Shift",
        "Alt",
        "Meta",
        "OS",
        "Command",
        "CommandOrControl",
      ];

      if (!ignoredKeys.includes(mainKey)) {
        parts.push(mainKey);
      }

      if (parts.length < 2) {
        return;
      }

      settings[capturingShortcut.value] = parts.join("+");
      capturingShortcut.value = null;
    };

    const formatShortcutKeys = (shortcut) => {
      const value = String(shortcut || "").trim();

      if (!value) {
        return ["Not set"];
      }

      return value.split("+").filter(Boolean);
    };

    return {
      settings,

      showKey,
      saveStatus,
      isSaving,
      isConfigured,

      capturingShortcut,

      closeWindow,

      resetConfiguration,
      saveConfiguration,

      startShortcutCapture,
      cancelShortcutCapture,
      handleShortcutKeydown,
      formatShortcutKeys,
    };
  },
};