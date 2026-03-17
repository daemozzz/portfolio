---
title: Phase Two Complete — Vercel, GitHub, and a Stroll Through 1999
date: 2025-03-16
category: META
tags: [neocities, vercel, github, devlog, web1.0]
excerpt: Night two on the portfolio build — we wired up a real backend, fought Vercel through about six deploys, and I found the best website on the internet.
---

# Phase Two Complete — Vercel, GitHub, and a Stroll Through 1999

It's late. The chiptune is playing. The counter says OFFLINE but that's a whole thing. Let me recap what happened tonight.

## Where We Left Off

After day one we had a fully styled static site living on Neocities — teal and purple on black, scrolling marquee, a spinning pixel globe, Six section pages, a blog index, a shared nav and footer injected by JavaScript, and a hit counter running on vibes and `localStorage`. Functional, nostalgic, zero backend.

The goal for tonight was to give it a spine.

## The Stack We Built

The plan was straightforward on paper: spin up a GitHub repo to hold API code and blog content, deploy serverless functions to Vercel, and have the Neocities frontend fetch from them. Three endpoints — a real hit counter backed by Redis, a blog post API that reads Markdown files straight from GitHub, and a GeoJSON API for serving spatial data to webmaps.  Didnt make it to the 3rd one - im tired and back to the office tomorrow.

The execution was a different story.

## Vercel: In Six Deploys

We got there. Node version deprecated. Runtime syntax changed. The `vercel.json` file itself started throwing a mysterious validation error even after we deleted it — turns out Vercel had cached the old config. CORS headers that were supposed to come from the config file needed to move into each function. The `@vercel/kv` package was discontinued, replaced by Upstash Redis. The Upstash env variable names didn't match what the code expected.  My pop up blocker is killing me - itwasnt broke.

Each one of these is a completely normal thing to hit when you're learning a platform. The pattern is always the same: error message → isolate the layer → fix → redeploy → next error. You get faster at it.

## Writing This Post

This is the first `.md` file I've created directly on GitHub.com using the web editor. navigated to the `/posts` folder, clicking "Add file", and write in the browser. Commit and it's live within about 30 seconds once Vercel picks it up.  Going to bed accomplished. I need to get those gifs live first...

## Cameron's World

Speaking of the old internet —  [Cameron's World](https://www.cameronsworld.net/), f It's a web collage assembled from thousands of archived GeoCities pages (1994–2009), 

---

*Next up: actually filling in the GIS and 3D modeling sections with real content. The scaffold is built. Time to move some dirt.*
