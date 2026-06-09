---
title: Phase Three — The Casino Map, and That Third Endpoint I Promised
date: 2026-06-09
category: GIS
tags: [gis, maplibre, geojson, vercel, cartography, devlog]
excerpt: I finally built the GeoJSON endpoint I bailed on back in Phase Two — and hung a nationwide casino, card-room, tribal-gaming, and racetrack map off of it. The hard part was never the map.
---

# Phase Three — The Casino Map, and That Third Endpoint I Promised

Remember Phase Two? Three endpoints planned: a hit counter, a blog API, and a GeoJSON service for serving spatial data to webmaps. I shipped the first two and then wrote, word for word, "didn't make it to the third one — I'm tired and back to the office tomorrow."

Well. Here's the third one. And it brought friends.

## The Concept

I wanted one interactive map of the U.S. gaming landscape — casinos, card rooms and poker clubs, tribal gaming, and racetracks — that I could actually *trust*. Not a marketing pin-map where every dot is a confident lie, but something honest about what it knows and what it's guessing.

The requirements were short but strict:

- One map, every venue type, filterable by state, by offering (poker / table games), and by table count.
- Free to host and free to run. No recurring cost. (More on that word "free" later.)
- It had to be honest — if a location is a rough guess, the map should *show* that, not pretend it's gospel.

## The Stack

I didn't want a heavyweight framework babysitting a hobby map, so the frontend is plain vanilla JavaScript driving **MapLibre GL** with free **OpenFreeMap** tiles. No build step, no `npm install` to forget about in six months. It drops onto Neocities as three static files and just runs.

The data is served by a **Vercel serverless GeoJSON API** — yes, *that* endpoint — which reads the dataset straight out of the same GitHub repo that already powers this blog. Nothing new to provision: GitHub stores it, Vercel serves it, Neocities renders it. The exact same GitHub → Vercel → Neocities spine from Phase Two, just with one more bone in it.

That "use what you already have" instinct turned out to be the whole trick. I had a backend sitting around looking for a job, and the map gave it one.

## The Actual Work: Data

Here's the part nobody warns you about with map projects: drawing the map is the easy 10%. The other 90% is the data.

I built the dataset from **official state gaming-regulator records** — the public licensee lists each state's gaming authority publishes — and blended them with **open public datasets** for the geographic and reference layers. Authoritative where I could get it, open where I couldn't.

Then the real work started, because raw venue data is a swamp:

- **Deduplication.** The same casino shows up under three slightly different names, plus a rebrand or two. I ran multi-pass fuzzy matching to collapse the duplicates *without* accidentally merging two genuinely different rooms that happen to share a block.
- **Geocoding.** Thousands of addresses turned into coordinates, each one tagged with a confidence score.
- **Classification.** Every venue sorted into casino / casino-hotel / card club / tribal / racetrack, then reconciled against each state's actual regulatory model — some states are tribal-only, some prohibit commercial gaming outright, and the data has to respect that.
- **Honesty.** My favorite part. Low-confidence locations render *dimmer* than rooftop-accurate ones, so a city-centroid guess doesn't get to cosplay as a verified address. There's a "verified only" toggle that hides everything still under review.

Final tally: roughly 3,600 venues wrangled, about 2,600 confidently placed across five point layers, plus context layers for state regulation and tribal lands.

## On That Word "Free"

The whole thing runs at $0 recurring, which was a hard line — and let's just say I learned *exactly* how un-free some "free" data services can get before I made it back to that line. The version that shipped leans entirely on public records and open data. Lesson filed permanently under "expensive."

---

*Next up: writing up the methodology properly, and maybe a 3D venue model or two. The map's live, the dots are honest, and the third endpoint finally exists. Phase Two can rest.*
