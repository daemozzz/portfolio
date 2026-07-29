---
title: Phase Four — Visualizing my Project Management Work
date: 2026-07-29
category: Project Management
tags: [Data Aggregation & Management, Project Portfolio, GIS Heatmap, Slicers-Dicers-Drill Ins, Presentation Mode]
excerpt: I finally built the GeoJSON endpoint I bailed on in Phase Two — and hung an analytic gaming-venue map off of it. Filter by criteria, draw your own boundary, export the result. Not a pin-map.
---

# Phase Four — # Building The Living Project Portfolio Dashboard

## The Concept
A decade of PM work scattered across invoices, tickets, and memory — pulled into one interactive dashboard that doubles as a portfolio and a record of what I've actually shipped.

## Data: Aggregate, Normalize, Standardize
Everything funnels through a single Google Sheet on a fixed 22-field schema:
- **Aggregate** — every project as one row, GeoLens through Cardopz.
- **Normalize** — canonical statuses, ISO dates, sectors derived from client type.
- **Standardize** — budgets shown as ranges not exact figures, undated records flagged, bad rows caught by a validator instead of breaking the page.

## Why Build It
A resume flattens scope and scale. A dashboard lets a hiring manager or client *explore* — filter by sector, see how many projects ran concurrently at my busiest, drill into any single engagement.

## Business Requirements
- Fully static, hostable as flat files on my site
- No runtime services beyond a Google Sheet feed
- Never breaks on bad or missing data
- Map, career timeline, and drill-in detail views
- Matches my existing site aesthetic

## The Stack
Vanilla JS — no framework to rot. PapaParse for CSV, ECharts for charts, Leaflet for the map, all via CDN. City coordinates baked in at build time, so zero runtime geocoding.

## Maintaining It: Sheets → CSV
1. Edit projects in the Google Sheet.
2. **File → Share → Publish to web → pick the sheet → CSV → Publish.**
3. One time: paste that URL into `liveCsvUrl` in `config.js`.
4. From then on, edits show up on reload — Google republishes within ~5 min.

## The Payoff
One source of truth I'll actually keep current, a portfolio that tells a story better than bullet points, and a clean, presentation-ready tool for interviews and client calls.

---

*Next up: I want to get going on that 3D model or two. I have some fun assets from Meshy & i also found the old sketchup i did of the historic mansion we lived in on High St in Denver.  