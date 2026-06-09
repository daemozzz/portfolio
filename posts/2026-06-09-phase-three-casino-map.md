---
title: Phase Three — The Casino Map, and That Third Endpoint I Promised
date: 2026-06-09
category: GIS
tags: [gis, maplibre, geojson, vercel, cartography, devlog]
excerpt: I finally built the GeoJSON endpoint I bailed on in Phase Two — and hung an analytic gaming-venue map off of it. Filter by criteria, draw your own boundary, export the result. Not a pin-map.
---

# Phase Three — The Casino Map, and That Third Endpoint I Promised

Remember Phase Two? Three endpoints planned: a hit counter, a blog API, and a GeoJSON service for serving spatial data to webmaps. I shipped the first two and then wrote, word for word, "didn't make it to the third one — I'm tired and back to the office tomorrow."

Well. Here's the third one. And it brought friends.

## The Concept

I didn't want a map you just look at. I wanted one you can *use* — an analytic tool for answering real questions about the U.S. gaming landscape:

- "Which card clubs in Texas actually spread poker?"
- "Show me every tribal venue in the Pacific Northwest."
- "Give me everything matching that, but only inside this metro area — as a spreadsheet."

If the map couldn't answer questions like those, it wasn't worth building. The goal was a finder, not a poster.

## The Stack

I didn't want a heavyweight framework babysitting a hobby map, so the frontend is plain vanilla JavaScript driving **MapLibre GL** with free **OpenFreeMap** tiles. No build step, no `npm install` to forget about in six months. It drops onto Neocities as three static files and just runs.

The data is served by a **Vercel serverless GeoJSON API** — yes, *that* endpoint — which reads the dataset straight out of the same GitHub repo that already powers this blog. Nothing new to provision: GitHub stores it, Vercel serves it, Neocities renders it. The exact same GitHub → Vercel → Neocities spine from Phase Two, just with one more bone in it. I had a backend looking for a job, and the map gave it one.

## The Data

The part nobody warns you about with map projects: drawing the map is the easy 10%. The other 90% is the data.

I built the dataset from **official state gaming-regulator records** — the public licensee lists each state's gaming authority publishes — blended with **open public datasets** for the geographic and reference layers. Then the real work started, because raw venue data is a swamp:

- **Deduplication.** The same casino shows up under three slightly different names, plus a rebrand or two. Multi-pass fuzzy matching collapsed the duplicates without merging two genuinely different rooms that happen to share a block.
- **Geocoding.** Thousands of addresses turned into coordinates, each tagged with a confidence score.
- **Classification.** Every venue sorted into casino / casino-hotel / card club / tribal / racetrack, reconciled against each state's regulatory model — some states are tribal-only, some prohibit commercial gaming outright, and the data has to respect that.

Roughly 3,600 venues wrangled, about 2,600 confidently placed.

## What You Can Actually Do With It

The map is just the interface; the point is the analysis underneath. Here's what it gives a user:

**Read it at a glance — layers and symbology.** Every venue is a point, but the styling carries the information. A pin's *color* tells you the venue type — casino, casino-hotel, card club, tribal, or racetrack. Its *halo* tells you the offering: a green ring means confirmed poker, white means table games, no ring means it's still unknown. Pins also fade by location confidence, so a precisely-placed venue reads solid while a rough approximation reads faint — you can tell at a glance how much to trust a dot before you act on it. Above the venue points sit context layers you can toggle on and off: each state shaded by its gaming-regulation model, tribal lands, and more — so a single pin always carries its legal and geographic context. The legend spells all of it out.

**Narrow it down — filters.** This is where it turns into a tool. Filter by state, by minimum table count, by whether a venue spreads poker or table games, by location confidence, and hide closed or unverified records. The filters stack: *card clubs, in California, with 10+ tables, poker confirmed* is four controls, and the map redraws to exactly that set.

**Draw your own boundary — geospatial selection.** Sometimes the question is spatial, not categorical. Switch to select mode and drag a box around a metro area, a corridor, a stretch of coastline, and the map drills into only what's inside it. Now geography and criteria compose: *everything matching my filters, but only within this box.*

**Take it with you — the attribute table.** Open the table view and every record currently passing your filters shows up as rows you can scan and sort. Critically, you can **export that filtered set to CSV** — so the map isn't a dead end. Find what you need visually, then pull it out as data to work in a spreadsheet, share, or feed into whatever's next. The visual is the query; the table is the answer you walk away with.

## Built in Passes

None of this landed in one shot, and it wasn't supposed to. The symbology especially went through rounds — the halo colors got reworked more than once until "poker" read instantly, the racetrack color flipped to free up green for it, the filter ribbon got restructured to fit more controls into less space, and the "verified only" view became the default so the map opens clean instead of dumping every uncertain record on you at once. That's the kind of thing you only get right by living with it: change one thing, look again, change the next. The map you see is a lot of small "look again" decisions stacked up.

---

*Next up: writing the methodology up properly, and maybe a 3D venue model or two. The map's live, it answers questions, and that third endpoint finally exists. Phase Two can rest.*
