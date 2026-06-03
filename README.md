# Gemini Converter

If you have ever found yourself thirty minutes deep into a Gemini conversation — one of those conversations where a casual Google search spiralled into a full education on a subject you had no business learning at 11pm on a Tuesday — only to realise you were browsing in an incognito window, then you understand the problem this application was built to solve.

The conversation is gone. The tabs are closed. The knowledge, which moments ago felt permanent and important, has evaporated like rain on hot pavement. You are left with nothing but the vague memory that you learned something fascinating and the quiet certainty that you will never be able to recall what it was.

This tool exists so that particular tragedy never has to happen again.

## What It Does

Gemini Converter is a small, single-purpose web application. You paste a Gemini conversation into it. It gives you back clean, properly formatted markdown that you can download, print, or read on your iPad while pretending to be productive.

- **Paste & Convert** — paste the raw conversation text, receive structured markdown. It is, unfortunately, that simple.
- **Source Toggle** — Gemini enjoys citing its sources with enthusiastic inline markers like `[1, 2, 3, 4, 5]`. You may toggle these on or off, depending on whether you find them informative or visually aggressive.
- **Download as .md** — generates a sensibly named file like `2026-06-03-what-were-the-last-big-ipos.md`, because you will not remember what you learned, much less what to name the file.
- **Print to PDF** — a clean print stylesheet for exporting to Goodnotes, where you can annotate it with highlighters and pretend you are studying.
- **PWA** — installable on your iPhone or iPad home screen. Works offline, which is convenient, since the conversations you are trying to save were already lost to the void of incognito browsing.
- **HTML Stripping** — Gemini occasionally embeds interactive stock charts and other widgets into its responses. These do not survive the copy-paste process gracefully. The parser removes them so your markdown is not decorated with six hundred lines of SVG coordinates.

## Supported Formats

The parser is trained on the particular habit of prefixing questions with markers before pasting them. It recognises patterns like:

```
initial q: what were the last big deal IPOs?
answer: The last major IPOs include...

q: how much were reddit shares at IPO?
answer: Reddit priced its IPO at $34 per share...

my q2: what about the valuation?
answer: ...
```

Prefixes such as `q:`, `my q:`, `initial q:`, `follow up q:`, `final q:`, and numbered variants (`q2:`, `my q3:`) are all detected. If you invent a new prefix, the parser will likely ignore it, which is fair.

## Tech Stack

- React 19
- Vite 8
- Tailwind CSS v4
- react-markdown + remark-gfm
- vite-plugin-pwa

No backend. No database. No API keys. Nothing to leak, nothing to expire, nothing to bill you for.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Marvel at what you have built. Paste a conversation. Download the markdown. Close the incognito window with confidence for the first time in your life.

## Build & Deploy

```bash
npm run build
npm run preview  # inspect the production build locally, if you are the cautious type
```

Deploy the `dist/` folder to Vercel, Netlify, or any static host that will have you.

## Installing as a PWA

After deploying, visit the app in Safari on your iPhone or iPad and tap **Share → Add to Home Screen**. It will launch in standalone mode, which means it will look and behave like a real app, despite being a website wearing a convincing disguise.
