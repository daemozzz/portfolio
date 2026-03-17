# daemoz — Portfolio API Backend

Serverless API backend for [daemoz.neocities.org](https://daemoz.neocities.org), deployed on Vercel.

## Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/counter` | GET | Read current hit count |
| `/api/counter` | POST | Increment hit count |
| `/api/counter?page=gis` | POST | Increment per-page count |
| `/api/posts` | GET | List all blog posts |
| `/api/posts?slug=my-post` | GET | Get single post as HTML |
| `/api/geodata` | GET | List available GeoJSON datasets |
| `/api/geodata?file=name` | GET | Get a GeoJSON file |
| `/api/geodata?file=name&bbox=-117,32,-116,33` | GET | Get filtered GeoJSON |

## Adding a Blog Post

1. Go to `/posts` folder on GitHub
2. Click **Add file → Create new file**
3. Name it: `YYYY-MM-DD-your-post-title.md`
4. Start with frontmatter:

```markdown
---
title: Your Post Title
date: 2025-06-01
category: GIS
tags: [gis, mapping]
excerpt: One sentence description shown in the post list.
---

Your content here...
```

5. Click **Commit changes** — post is live immediately

## Adding GeoJSON Data

1. Go to `/geodata` folder on GitHub
2. Upload or create a `.geojson` file
3. Access it at `/api/geodata?file=your-filename` (no extension needed)

## Environment Variables (set in Vercel dashboard)

| Variable | Value |
|---|---|
| `GITHUB_USER` | your GitHub username |
| `GITHUB_REPO` | portfolio |
| `GITHUB_BRANCH` | main |
| `KV_REST_API_URL` | auto-set by Vercel KV |
| `KV_REST_API_TOKEN` | auto-set by Vercel KV |

## Local Dev

```bash
npm install -g vercel
vercel dev
```
