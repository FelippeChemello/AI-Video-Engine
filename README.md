# AI Vídeo Engine

> **Automate video creation from research to rendering**

AI Vídeo Engine is a Node.js toolkit that orchestrates multiple LLMs, text-to-speech, and Remotion compositions to create engaging short videos for social media.

**See examples:** [YouTube @codestackme](https://youtube.com/@codestackme) | [TikTok @codestackme](https://www.tiktok.com/@codestackme)

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Environment variables](#environment-variables)
- [Pre-requisites](#pre-requisites)
- [Available scripts](#available-scripts)
- [Usage examples](#usage-examples)
- [Contributing](#contributing)

## Requirements

- Node.js v20 (see `.nvmrc`)
- [pnpm](https://pnpm.io/)
- FFmpeg installed and in your `PATH`
- Modal services for audio alignment:
  - [Montreal Forced Aligner (MFA)](https://github.com/FelippeChemello/modal_montreal_forced_aligner)
  - [Aeneas](https://github.com/FelippeChemello/modal_aeneas)

## Installation

```bash
pnpm install
```

## Environment variables

Create a `.env` file at the project root. Required variables are validated in [`src/config/env.ts`](src/config/env.ts):

- **AI Models:** `GEMINI_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
- **Search & Email:** `GOOGLE_SERP_API_KEY`, `GOOGLE_SERP_ID`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`
- **Audio Services:** `MFA_BASE_URL`, `MFA_API_KEY`, `AENEAS_BASE_URL`, `AENEAS_API_KEY`, `ELEVENLABS_API_KEY`
- **Script Management:** `NOTION_TOKEN`, `NOTION_DEFAULT_DATABASE_ID`, `NOTION_NEWS_DATABASE_ID`

## Pre-requisites

- Download background videos (mp4 files) and place them in `public/assets/`. These will be used randomly in video compositions.
- Replace `public/assets/cody.png` and images in `src/video/Felippe.tsx` with your own profile pictures.

## Available scripts

Run any command with `pnpm <command>`:

### Content Generation

- **`dev:script <topic>`** – Generate a video script about any topic using AI research and writing
- **`dev:newsletter [file]`** – Convert newsletter content into video scripts (fetches from Gmail if no file provided)
- **`dev:news`** – Research latest news and generate video scripts automatically
- **`dev:debate <topic1> [topic2...]`** – Create debate videos with opinions from multiple AI models (OpenAI, Anthropic, Gemini, Grok)

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