---
title: First Post — Getting This Site Online
date: 2025-01-01
category: MISC
tags: [neocities, web, meta]
excerpt: How I built a retro-cyberpunk portfolio site on Neocities in 2025, complete with a Vercel API backend, real hit counter, and GeoJSON serving.
---

# First Post — Getting This Site Online

Welcome to the blog. If you're reading this, the whole stack is working — Neocities front end, GitHub repo, Vercel API, the hit counter that actually counts, and this very post being served as Markdown from GitHub and rendered on the fly.

## What I Built

The site runs on a split architecture:

- **Neocities** hosts the static HTML/CSS/JS — the stuff you see
- **Vercel** runs serverless API functions — the stuff that makes it dynamic
- **GitHub** is the source of truth for everything, including these blog posts

The fun part is that to write a new post, I just create a `.md` file on GitHub and it instantly appears on the blog. No database, no CMS login, no build step — just Markdown files and a small parser.

## The Tech Stack

The API layer has three endpoints:

`/api/counter` — real persistent hit counter using Vercel KV (Redis). Every visitor increments it atomically, so the number is actually real.

`/api/posts` — reads Markdown files from the `/posts` directory in the GitHub repo, parses frontmatter and content, returns JSON. The Markdown parser is built from scratch with no npm dependencies.

`/api/geodata` — serves GeoJSON files with proper CORS headers so any webmap client can consume them directly. Supports optional bounding box filtering via query param.

## What's Next

- Add actual GIS project write-ups
- Upload some STL files to the 3D viewer
- Actually fill in the PMP and Facilities pages
- Add more geodata to the API

---

*Posted from GitHub.com — no local dev environment required.*
edit 4/14 to keep redis from going offline from inactivity
