# Brainrot Video Maker

> **Turn AI-generated scripts into shareable videos**

Brainrot Video Maker is a Node.js toolkit that orchestrates multiple LLMs, text‑to‑speech and Remotion compositions to create short educational clips.

## Table of Contents

- [Brainrot Video Maker](#brainrot-video-maker)
  - [Table of Contents](#table-of-contents)
  - [Requirements](#requirements)
  - [Environment variables](#environment-variables)
  - [Installation](#installation)
  - [Pre-requisites](#pre-requisites)
  - [Available scripts](#available-scripts)
  - [Usage overview](#usage-overview)
  - [Contributing](#contributing)

## Requirements

- Node.js v20 (see `.nvmrc`)
- [pnpm](https://pnpm.io/)
- FFmpeg installed and in your `PATH`
- Modal service running Montreal Forced Aligner (MFA) ([see setup here](https://github.com/FelippeChemello/modal_montreal_forced_aligner)) and Aeneas instance ([see setup here](https://github.com/FelippeChemello/modal_aeneas))

## Environment variables

Create a `.env` file at the project root with the following entries:

- `GEMINI_API_KEY`
- `GOOGLE_SERP_API_KEY`
- `GOOGLE_SERP_ID`
- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`
- `MFA_BASE_URL`
- `MFA_API_KEY`
- `AENEAS_BASE_URL`
- `AENEAS_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `NOTION_TOKEN`
- `NOTION_DEFAULT_DATABASE_ID`
- `NOTION_NEWS_DATABASE_ID`
- `ELEVENLABS_API_KEY`

These variables are validated in [`src/config/env.ts`](src/config/env.ts).

## Installation

```bash
pnpm install
```

## Pre-requisites

- Download and place mp4 files in `public/assets/` for background videos. These will be chosen randomly for each video composition.
- Change the `public/assets/cody.png`and `src/video/Felippe.tsx` images to your own profile pictures. These are used in the video compositions.

## Available scripts

Run any of the commands below with `pnpm <command>`:

- **`dev:script <topic>`** – generate a video script about the given topic
- **`dev:video`** – download the script from Notion, align audio and render the compositions
- **`dev:remotion`** – preview compositions in the browser using Remotion

## Usage overview

1. Run `pnpm dev:script "<topic>"` to generate a script draft and store it in your Notion database.
2. Execute `pnpm dev:video` to fetch the script, synthesize audio and render the video files.
3. Use `pnpm dev:remotion` to preview the compositions during development or run one of the render commands to export the final video.

## Contributing

Contributions are welcome! If you spot a bug or want to add features:

1. Fork this repository and create a new branch for your changes.
2. Install dependencies with `pnpm install`.
3. Commit your work and open a pull request describing what you've done.

Feel free to open issues for questions or ideas.