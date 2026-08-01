---
title: Eight Years, 170 Sessions — What My PDU History Says About How I Keep Learning
date: 2026-07-31
category: Project Management
tags: [Continuing Education, PMP, PDUs, Talent Triangle, Data Aggregation & Management, Career Timeline]
excerpt: I pulled every Accepted PDU I've logged with PMI since 2018 into one dataset and charted it. The pattern wasn't what I expected — three renewal-cycle crunches, two binge-watched webinar series, and a lopsided bet on Power Skills.
---

# Eight Years, 170 Sessions — What My PDU History Says About How I Keep Learning

## Why I Pulled This Data

Maintaining a PMP requires every three years I show PMI 60 Professional Development Units (PDUs), and every one of those units has to trace back to something I actually did: a course, a webinar, a conference session, a piece of volunteer work. PMI buckets all of it under what they call the **Talent Triangle** — three skill domains they consider essential to the modern practitioner:

- **Ways of Working** — the mechanics: agile, waterfall, hybrid delivery, the methodology layer of the job.
- **Power Skills** — the human layer: leadership, communication, negotiation, facilitation, conflict, influence.
- **Business Acumen** — the strategic layer: portfolio thinking, governance, organizational strategy, the "why" behind the project.

I export my *Accepted* claims from pmi.org periodically, mostly to sanity-check my renewal math. This time, instead of filing it away, I ran it through the same recap audit been applying to the [rest of my project history](#) as part of my PMP portfolio. In this post I intended to: aggregate it, normalize it, and see what the shape of eight years of continuing education actually looks like.  I have 9 Credits remaining before the renewal date coming up in the next few months.

## The Dataset

170 approved PDU claims, spanning **March 2, 2018 → July 29, 2026** — roughly three full PMI renewal cycles plus the start of a fourth. The raw export is just two fields: the date PMI approved the claim, and the title of the session. 

1. **Parse** the approval dates into real dates (PMI exports them as `29-Jul-26` — in PDF, so i moved it to CSV).
2. **Classify** each title into one of the three Talent Triangle domains using keyword matching against the session name — imperfect, but close enough to see the shape of the data. (maybe ill grab domain codes later, didnt seem crit for this review)
3. **Aggregate** by year to see volume over time, and by domain within each year to see the mix.

## The Chart - this might not work, testing how neocities handles a DIV in an referenced MD

<div style="max-width: 780px; margin: 2rem auto;">
  <canvas id="pduChart" role="img" aria-label="Stacked bar chart of PDU sessions by year, broken out by Ways of Working, Power Skills, and Business Acumen"></canvas>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js"></script>
<script>
(function () {
  const data = {
    labels: ["2018","2019","2020","2021","2022","2023","2024","2025","2026"],
    datasets: [
      {
        label: "Ways of Working",
        data: [2, 11, 4, 5, 7, 3, 2, 7, 4],
        backgroundColor: "#4C6EF5"
      },
      {
        label: "Power Skills",
        data: [9, 20, 4, 9, 15, 4, 3, 16, 9],
        backgroundColor: "#F76707"
      },
      {
        label: "Business Acumen",
        data: [3, 3, 3, 2, 13, 2, 2, 7, 1],
        backgroundColor: "#2F9E44"
      }
    ]
  };

  const ctx = document.getElementById('pduChart');
  if (ctx && window.Chart) {
    new Chart(ctx, {
      type: 'bar',
      data: data,
      options: {
        responsive: true,
        plugins: {
          title: { display: true, text: 'Approved PDU Sessions by Year & Talent Triangle Domain' },
          legend: { position: 'bottom' },
          tooltip: { mode: 'index', intersect: false }
        },
        scales: {
          x: { stacked: true, title: { display: true, text: 'Year' } },
          y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Sessions Approved' }, ticks: { precision: 0 } }
        }
      }
    });
  }
})();
</script>

*Setup  maystrips inline `<script>` tags (some static-site pipelines sanitize markdown-embedded HTML), the raw numbers are in the table below — if i want to try a different approach

| Year | Ways of Working | Power Skills | Business Acumen | Total |
|---|---|---|---|---|
| 2018 | 2 | 9 | 3 | 14 |
| 2019 | 11 | 20 | 3 | 34 |
| 2020 | 4 | 4 | 3 | 11 |
| 2021 | 5 | 9 | 2 | 16 |
| 2022 | 7 | 15 | 13 | 35 |
| 2023 | 3 | 4 | 2 | 9 |
| 2024 | 2 | 3 | 2 | 7 |
| 2025 | 7 | 16 | 7 | 30 |
| 2026* | 4 | 9 | 1 | 14 |

*2026 is partial — through July 29.*

**Note on the chart component:** I reached for Chart.js here (CDN, single script tag, no build step) rather than ECharts, which I'm already using on the [portfolio dashboard](#) — mostly because a stacked bar for nine data points doesn't need ECharts' footprint, and I didn't want to pull that whole config pattern into a blog post. If you're dropping this into a Jekyll/Hugo/Astro/Eleventy pipeline, raw HTML in markdown usually passes through untouched; if you're on something that renders markdown through a sanitizer (some MDX setups, certain CMS previews), you'll want to confirm the `<script>` tag survives before you publish, or swap it for a static image export.

## Some AI analysis - What Actually Jumped Out

**The cramming is real, and it's cyclical.** 2019, 2022, and 2025 are the three clear volume spikes — 34, 35, and 30 sessions respectively — each sitting roughly three years apart. That's not a coincidence; that's a PMI renewal deadline visible in the data. The quiet years in between (2020, 2023, 2024) are where I apparently told myself "plenty of time left."

**Power Skills carries more than half the total.** 89 of 170 sessions — about 52% — landed in the Power Skills bucket, more than Ways of Working and Business Acumen combined. Some of that is a classification artifact (webinar titles skew toward leadership-and-communication framing even when the content is broader), but it also tracks with where the free/cheap webinar content actually lives — ProjectManagement.com and PMI Chapter programming lean heavily on soft-skill panels.

**Two recurring series account for nearly 1 in 7 sessions.** I apparently kept coming back to "Project HEADWAY" (16 episodes across the full eight years) and "The Agile Enterprise" (8 episodes) — long-running panel series rather than one-off webinars. Effectively binge-watching a show, but each episode happens to be worth a PDU.

**Some days did the whole month's work.** Three separate days each produced 4 approved sessions in a single sitting: April 3, 2018; September 25, 2025; and October 1, 2025. That's a full afternoon of back-to-back webinars, almost certainly timed right against a deadline.

## Worth Considering

I might not maintain this list forever, i just wanted a backup and a way to showcase the continued Ed somewhere 'public'.

---

*Data pulled directly from my Accepted PDU export on pmi.org, current through July 29, 2026.*
