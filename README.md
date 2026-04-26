# AI Vídeo Engine

> **Automate video creation from research to rendering**

AI Vídeo Engine is a Node.js toolkit that orchestrates multiple LLMs, text-to-speech, and Remotion compositions to create engaging short videos for social media.

**See examples:** [YouTube @codestackme](https://youtube.com/@codestackme) | [TikTok @codestackme](https://www.tiktok.com/@codestackme)

## Table of Contents

- [AI Vídeo Engine](#ai-vídeo-engine)
  - [Table of Contents](#table-of-contents)
  - [Requirements](#requirements)
  - [Installation](#installation)
  - [Environment variables](#environment-variables)
  - [Codex](#codex)
  - [Pre-requisites](#pre-requisites)
  - [Available scripts](#available-scripts)
    - [Content Generation](#content-generation)
    - [Video Production](#video-production)
    - [Utilities](#utilities)
  - [Usage examples](#usage-examples)
  - [Contributing](#contributing)

## Requirements

- Node.js v24 (see `.nvmrc`)
- [pnpm](https://pnpm.io/)
- FFmpeg installed and in your `PATH`
- Modal services:
    - [Montreal Forced Aligner (MFA)](https://github.com/FelippeChemello/modal_montreal_forced_aligner)
    - [Aeneas](https://github.com/FelippeChemello/modal_aeneas)
    - [QwenTTS](https://github.com/FelippeChemello/modal_qwenTTS)

## Installation

```bash
pnpm install
```

## Environment variables

Create a `.env` file at the project root. Required variables are validated in [`src/config/env.ts`](src/config/env.ts):

- **AI Models:** `GEMINI_PAID_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GROK_API_KEY`, `CODEX_ACCOUNT_ID`, `CODEX_REFRESH_TOKEN`
- **Search & Email:** `GOOGLE_SERP_API_KEY`, `GOOGLE_SERP_ID`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`
- **Audio Services:** `MFA_BASE_URL`, `MFA_API_KEY`, `AENEAS_BASE_URL`, `AENEAS_API_KEY`, `ELEVENLABS_API_KEY`, `QWEN_TTS_API_KEY`, `FISH_AUDIO_API_KEY`
- **Script Management:** `NOTION_TOKEN`, `NOTION_DEFAULT_DATABASE_ID`
- **Video Output:** `YOUTUBE_REFRESH_TOKEN_<CHANNEL_NAME>`

## Codex

To get the updated refresh token for Codex, run:

```bash
npx @openai/codex login
```

To see the available models for your account, you can either run:

```bash
npx openai-oauth
```

Or run Codex interactively and type `/models` inside it.

## Pre-requisites

- Download background videos (mp4 files) and place them in `public/assets/`. These will be used randomly in video compositions.
- Add more assets (gifs) for background on `public/assets` and update `notion.ts` to include them in the script generation logic.

## Available scripts

Run any command with `pnpm <command>`:

### Content Generation

- **`dev:script <topic>`** – Generate a video script about any topic using AI research and writing
- **`dev:newsletter [file]`** – Convert newsletter content into video scripts (fetches from Gmail if no file provided)
- **`dev:news`** – Research latest news and generate video scripts automatically
- **`dev:debate <topic1> [topic2...]`** – Create debate videos with opinions from multiple AI models (OpenAI, Anthropic, Gemini, Grok)
- **`dev:tinder-roast <archetype>`** – Generate a funny Tinder roast video script for a given archetype (e.g., "bro", "Karen", "techie")
- **`dev:umbanda <question> <file-path-for-grounding>`** – Create a video religious script answering a question grounded in specific content (e.g., a PDF or text file)

### Video Production

- **`dev:video`** – Download scripts from Notion, align audio, and render all video compositions
- **`dev:remotion`** – Preview video compositions in the browser using Remotion Studio

### Utilities

- **`dev:metrics`** – Fetch and display TikTok analytics metrics
- **`dev:output`** – Download finished videos and thumbnails from Notion

## Usage examples

**Generate a video from a topic:**

```bash
pnpm dev:script "Artificial Intelligence"
pnpm dev:video
```

**Create a debate video:**

```bash
pnpm dev:debate "Should AI replace developers?" "Future of remote work"
pnpm dev:video
```

**Process newsletter into video:**

```bash
pnpm dev:newsletter
pnpm dev:video
```

**Preview compositions:**

```bash
pnpm dev:remotion
```

## Contributing

Contributions are welcome! If you spot a bug or want to add features:

1. Fork this repository and create a new branch for your changes.
2. Install dependencies with `pnpm install`.
3. Commit your work and open a pull request describing what you've done.

Feel free to open issues for questions or ideas.
