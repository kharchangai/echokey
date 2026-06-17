# EchoKey 🎙️⌨️

**EchoKey** is a modern, local-first desktop app for fast **Speech-to-Text**, **Text-to-Speech**, AI cleanup, and translation — all triggered with simple global keyboard shortcuts.

Speak anywhere. Listen to selected text anywhere. Fix grammar without changing your tone.  
EchoKey is built for people who write, code, study, translate, create content, or just want a faster way to interact with text.

<p align="center">
  <img src="assets/echokey-banner.png" alt="EchoKey Banner" width="720" />
</p>

---

## ✨ Features

- 🎙️ **Speech to Text**
  - Press a shortcut, speak, press again, and EchoKey pastes the transcribed text into the active app.

- 🔊 **Text to Speech**
  - Select text in any app, press a shortcut, and EchoKey reads it aloud.

- 🧠 **Optional LLM Cleanup**
  - Fix transcription mistakes, grammar, punctuation, and filler words using an LLM.

- 🌍 **Optional Translation**
  - Translate your speech or selected text before pasting or speaking.

- ⌨️ **Global Shortcuts**
  - Works from almost anywhere on your desktop.

- 🪄 **Floating Overlays**
  - Minimal modern recording and playback UI so you always know what EchoKey is doing.

- 🔐 **Local-First Settings**
  - Your API key and settings stay on your own device.


---

## 🧠 What EchoKey Can Do

### Speech to Text

Use EchoKey to dictate text into any app:

- browsers
- editors
- chat apps
- documents
- IDEs
- note-taking apps

Default shortcut:

```txt
Ctrl + Alt + 1
```

Press once to start recording.  
Press again to stop recording and transcribe.  

---

### Text to Speech

Use EchoKey to listen to selected text from any app.

Default shortcut:

```txt
Ctrl + Alt + S
```

Select text anywhere, press the shortcut, and EchoKey will copy the selected text and play it as audio.

---

### AI Text Cleanup

EchoKey can optionally send transcribed text to an LLM before pasting it.

Example cleanup behavior:

```txt
Fix transcription mistakes, spelling, punctuation, and grammar errors.
Remove filler words and meaningless repetitions.
Keep the original tone, style, and casual wording as much as possible.
Do not make the text sound formal, professional, academic, literary, or overly polished.
Only make small edits needed for clarity and correctness.
Preserve the original meaning.
Return only the final text.
```

This is useful when you want clean text, but you still want it to sound like you.

---

## 📦 Installation

## Windows

For Windows users, the easiest way is to download the ready-to-use executable file from the **Releases** page.

### Option 1: Download the Windows App

1. Go to the GitHub **Releases** page.
2. Download the latest Windows file.
3. Run the installer or executable.
4. Open EchoKey.
5. Add your API settings.
6. Start using the shortcuts.

> If Windows shows a security warning, choose **More info** → **Run anyway** if you trust the downloaded release.

---

### Option 2: Run from Source on Windows

If you want to run the project manually:

### Requirements

Install these first:

- [Node.js](https://nodejs.org/) `v18` or newer
- [Rust](https://www.rust-lang.org/tools/install)
- [Git](https://git-scm.com/)
- Microsoft WebView2 Runtime  
  Usually already installed on Windows 10/11.

Then clone and run:

```bash
git clone https://github.com/kharchangai/echokey.git
cd echokey
npm install
npm run tauri dev
```

To build the Windows version:

```bash
npm run tauri build
```

The final Windows build will be generated inside:

```txt
src-tauri/target/release/bundle/
```

---

## macOS

Currently, EchoKey does not provide a pre-built macOS app by default.  
macOS users need to run or build the app from source.

### Requirements

Install:

- [Node.js](https://nodejs.org/) `v18` or newer
- [Rust](https://www.rust-lang.org/tools/install)
- [Git](https://git-scm.com/)
- Xcode Command Line Tools

Install Xcode Command Line Tools:

```bash
xcode-select --install
```

Clone and run:

```bash
git clone https://github.com/kharchangai/echokey.git
cd echokey
npm install
npm run tauri dev
```

Build for macOS:

```bash
npm run tauri build
```

The macOS build will be generated inside:

```txt
src-tauri/target/release/bundle/
```

---

### macOS Permissions

For global shortcuts, clipboard access, and automatic paste behavior, macOS may require Accessibility permissions.

Go to:

```txt
System Settings → Privacy & Security → Accessibility
```

Then enable EchoKey or the terminal app you are using to run EchoKey.

You may also need to allow permissions for:

```txt
System Settings → Privacy & Security → Microphone
```

If EchoKey cannot record audio, check microphone permissions.

---

## Linux

Linux users need to run or build EchoKey from source.

### Requirements

Install:

- [Node.js](https://nodejs.org/) `v18` or newer
- [Rust](https://www.rust-lang.org/tools/install)
- [Git](https://git-scm.com/)
- Linux build dependencies for Tauri

### Ubuntu / Debian Dependencies

```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.0-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf
```

Then clone and run:

```bash
git clone https://github.com/kharchangai/echokey.git
cd echokey
npm install
npm run tauri dev
```

Build for Linux:

```bash
npm run tauri build
```

The Linux build will be generated inside:

```txt
src-tauri/target/release/bundle/
```

Depending on your Tauri configuration, the output may include:

```txt
.deb
.AppImage
.rpm
```

---

## ⚙️ Settings Guide

EchoKey needs API configuration before it can use Speech-to-Text, Text-to-Speech, translation, or LLM cleanup.

Open the EchoKey settings window and configure the following fields.

---

## API Settings

### Base URL

The API base URL for your OpenAI-compatible provider.

Example:

```txt
https://api.openai.com/v1
```

Or your own compatible gateway:

```txt
https://your-api-gateway.com/v1
```

---

### API Key

Your API key for the selected provider.

Example:

```txt
sk-...
```

EchoKey stores this locally on your device.

> Do not share your API key publicly.  
> Do not commit your API key to GitHub.

---

## Model Settings

### Speech-to-Text Model

Used for converting recorded voice into text.

Example:

```txt
whisper-1
```

or any compatible STT model supported by your provider.

---

### Text-to-Speech Model

Used for generating speech from selected text.

Example:

```txt
tts-1
```

or any compatible TTS model supported by your provider.

---

### LLM Model

Used for grammar cleanup, rewriting rules, and translation when enabled.

Example:

```txt
gpt-4o-mini
```

or any compatible chat/completions model supported by your provider.

---

### TTS Voice

The voice used for Text-to-Speech.

Example:

```txt
zephyr
```

Available voices depend on your API provider.

---

## Language Settings

### Correct STT with LLM

When enabled, EchoKey sends transcribed text to the selected LLM for cleanup before pasting.

Recommended prompt:

```txt
Fix transcription mistakes, spelling, punctuation, and grammar errors.
Remove filler words and meaningless repetitions.
Keep the original tone, style, and casual wording exactly as much as possible.
Do not make the text sound formal, professional, academic, literary, or overly polished.
Only make small edits needed for clarity and correctness.
Preserve the original meaning.
Return only the final text.
```

---

### Translate After STT

When enabled, EchoKey translates the transcribed speech before pasting it.

Example workflow:

```txt
Speak Persian → Transcribe → Translate to English → Paste English text
```

---

### Translate Before TTS

When enabled, EchoKey translates selected text before reading it aloud.

Example workflow:

```txt
Select Persian text → Translate to English → Read English audio
```

---

## ⌨️ Default Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Alt + 1` | Start / stop Speech-to-Text recording |
| `Ctrl + Alt + S` | Read selected text with Text-to-Speech |

---

## 🎙️ Speech-to-Text Workflow

1. Click where you want the final text to be pasted.
2. Press:

```txt
Ctrl + Alt + 1
```

3. Speak normally.
4. Press again:

```txt
Ctrl + Alt + 1
```

5. EchoKey sends the audio to the STT model.
6. If enabled, EchoKey cleans or translates the text using the LLM.
7. If Auto Paste is enabled, EchoKey pastes the final text into the active app.

---

## 🔊 Text-to-Speech Workflow

1. Select text in any app.
2. Press:

```txt
Ctrl + Alt + S
```

3. EchoKey copies the selected text.
4. If enabled, EchoKey translates the text before speech generation.
5. EchoKey generates audio using the selected TTS model and voice.
6. The audio plays in a small floating overlay.

---

## 🔐 Privacy

EchoKey is designed to be local-first.

- Settings are stored locally.
- API keys are stored locally.
- EchoKey does not require its own backend server.
- Audio and text are sent only to the API provider you configure.
- You control your own API endpoint and models.

Important:

> If you use a third-party API provider, your audio/text is processed according to that provider’s privacy policy.

---

## ⭐ Support

If you like EchoKey, consider giving the project a star on GitHub.
It helps others discover the project and supports future development.

