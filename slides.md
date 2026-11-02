---
theme: default
title: "Finding Efficiencies in HLS Production"
info: |
  What operating HLS since 2020 taught us about cost and risk, and how other
  SNWG solutions can use it. Development Seed / ODSI, November 2026.
layout: odsi-title
routeAlias: title
colorSchema: light
aspectRatio: 16/9
canvasWidth: 980
fonts:
  provider: none
transition: fade
---

# SNWG · HLS

## Finding Efficiencies in HLS Production

What six years of operating HLS have taught us about cost and risk, and what other solutions can take from it

<div class="rule"></div>

<p class="foot">Sean Harkins · Development Seed</p>

<!--
Thanks for having me. I want to use the next twenty minutes to do two things. First, walk you through the work the HLS team has been doing to make HLS production cheaper, more reliable and easier to maintain: a modernized atmospheric correction code and a new orchestration architecture. Second, and this is really the point of being in this room, talk about how the lessons we learned the hard way might apply to your solutions, because I suspect many of you are running into the same problems we did. I will be specific about numbers throughout, and I will be clear about where AI tools helped and where they did not.

Sources: none, title slide.
-->

---
layout: odsi
routeAlias: glance
---

# Orientation

## HLS at a glance

<div class="statrow mt-2">
  <div class="cell"><span class="n">2020</span><span class="k">Global v2.0 production running continuously since</span></div>
  <div class="cell"><span class="n">15,000</span><span class="k">Landsat and Sentinel-2 granules processed a day</span></div>
  <div class="cell"><span class="n">~$450k</span><span class="k">AWS spend in 2025 (about $418k after credits)</span></div>
</div>

<div class="cols mt-5">
<div class="col">

Harmonized Landsat and Sentinel-2 turns two missions into **one consistent 30 m surface reflectance record**, distributed by LP DAAC.

</div>
<div class="col">
<div class="band" style="margin:0">
HLS is also an input. <b>Several other SNWG solutions build on it</b>, so our cost and latency become part of theirs. More on that at the end.
</div>
</div>
</div>

<!--
A quick orientation for anyone who does not live with HLS every day. HLS takes Landsat 8 and 9 from USGS and Sentinel-2 from ESA, and harmonizes them into a single 30 meter surface reflectance record, so a user can treat the two missions as one. The version 2.0 global pipeline has been running continuously since 2020. Today it processes around 15,000 granules a day, roughly 5,500 to 6,000 Landsat and 8,500 to 9,000 Sentinel-2. In 2025 the AWS bill for running it came to about 450 thousand dollars before credits, about 418 thousand after. Hold on to that number, because the rest of the talk is about where it goes and how we are bringing it down. One more thing worth knowing up front: HLS is not only a product, it is an input. Several other SNWG solutions consume HLS, which means our cost and our latency flow into theirs. I will come back to that.

Sources: granule volumes from hls-nextgen-orchestration docs/cost-analysis.md; 2025 spend from HLS_MCP_costs_breakdown_2025.csv (gross $452,535, net $417,593); downstream consumers in docs/research/snwg-solutions.md.
-->

---
layout: odsi
routeAlias: why-now
---

# Background

## Why now

<div class="ba mt-3">
  <div class="panel" style="background:#F4F8FB">
    <h3><span class="chip navy">6</span>Six years of operations</h3>
    <ul>
      <li>Cloud architecture patterns have changed a lot since 2020</li>
      <li>At scale, the hard problems are failures, accounting and cost, not the happy path</li>
      <li>Our riskiest code was the science code we did not control</li>
    </ul>
  </div>
  <div class="arrowmid">→</div>
  <div class="panel" style="background:#ECF6F2">
    <h3><span class="chip teal">↻</span>A new requirement</h3>
    <ul>
      <li>The HLS low-latency solution needs new auxiliary data and faster turnaround</li>
      <li>Patching the old system for it would add to the debt</li>
      <li>So we used it as the opportunity to <strong>re-architect</strong></li>
    </ul>
  </div>
</div>

<!--
Why are we doing this now? Two things came together. On the left: six years of operating a production system. Cloud architecture patterns have moved a long way since 2020, and we have learned that at this scale the difficult problems are not the happy path. They are what happens when things fail, how you account for every granule, and what you pay while you wait. We also learned that our largest source of risk was core science code maintained outside our team. On the right: a new requirement. The HLS low-latency solution needs a different auxiliary data source and faster turnaround. We could have patched the existing system to meet it, but that would have added to the debt. Instead we treated the new requirement as the reason to re-architect the parts that were hurting us most.

Sources: Outline.md (Background); LaSRC deck (developmentseed/lasrc_rust_presentation) for the external-dependency risk.
-->

---
layout: odsi
routeAlias: goals
---

# Our goals

## What we set out to improve

<div class="grid g5 mt-2">
  <div class="card trigger"><h3><span class="chip mint">0</span>Low latency</h3><p>The trigger: meet the new low-latency targets.</p></div>
  <div class="card"><h3><span class="chip navy">1</span>Science-code risk</h3><p>Own and test the core algorithm code we depend on.</p></div>
  <div class="card"><h3><span class="chip deep">2</span>Cost at its floor</h3><p>Pay for processing, not for waiting.</p></div>
  <div class="card"><h3><span class="chip teal">3</span>Reprocessing at scale</h3><p>No bottleneck that blocks a 30M-granule campaign.</p></div>
  <div class="card"><h3><span class="chip green">4</span>Observability</h3><p>Answer "what happened to every granule?" quickly.</p></div>
</div>

<p style="margin:1.4rem 0 .4rem;font-size:.8rem;font-weight:700;color:var(--navy)">Where the 2025 money went</p>
<div class="spendbar">
  <div class="ec2" style="--w:53%">EC2 compute · 53%</div>
  <div class="s3" style="--w:34%">S3 storage and requests · 34%</div>
  <div class="other" style="--w:13%">Other · 13%</div>
</div>
<p class="spendcap">Share of about $450k gross AWS spend, 2025. The LaSRC work targets compute; the orchestration work targets part of "other" and unlocks cheaper reprocessing.</p>

<!--
Beyond the immediate need to support low latency, which is the dark card on the left, we set four goals. One, reduce the development and maintenance risk in our core science code. Two, bring infrastructure cost down to its theoretical floor, which in practice means paying for processing and not for waiting. Three, remove the scalability bottlenecks that would stop us running a full reprocessing campaign, which for HLS is on the order of 30 million granules. Four, improve observability, so we can answer what happened to any granule quickly and cheaply. The bar underneath shows where the 2025 money actually went. Compute, EC2, was about $240k, 53 percent. S3 storage and requests about 34 percent. Everything else, including orchestration, databases and account security services, about 13 percent. The LaSRC work goes after the compute line. The orchestration work goes after part of that last slice, and more importantly makes reprocessing cheap.

Sources: Outline.md (Our Goals); HLS_MCP_costs_breakdown_2025.csv (EC2 $240,404, S3 $153,913, gross total $452,535); 30M granule figure from hls-nextgen-orchestration docs/cost-analysis.md.
-->

---
layout: odsi-section
routeAlias: lasrc
---

# Part one

## Modernizing LaSRC

<!--
TODO notes.
-->

---
layout: odsi
routeAlias: science-vs-prod
---

# The problem

## Science code is not production code

<!--
TODO notes.
-->

---
layout: odsi
routeAlias: five-months
---

# The trigger

## Why now: the 5–6 month problem

<!--
TODO notes.
-->

---
layout: odsi
routeAlias: loop
---

# Approach

## Agents plus a reference to check against

<!--
TODO notes.
-->

---
layout: odsi
routeAlias: validation
---

# Validation

## The suite found what the agents missed

<!--
TODO notes.
-->

---
layout: odsi
routeAlias: lasrc-results
---

# Results

## Same output, faster and cheaper

<!--
TODO notes.
-->

---
layout: odsi-section
routeAlias: infra
---

# Part two

## Next-generation infrastructure

<!--
TODO notes.
-->

---
layout: odsi
routeAlias: hurts
---

# Today

## What hurts in the current system

<!--
TODO notes.
-->

---
layout: odsi
routeAlias: new-design
---

# The new design

## Event-driven, with S3 as the log

<!--
TODO notes.
-->

---
layout: odsi
routeAlias: cost-table
---

# Cost

## Orchestration cost, line by line

<!--
TODO notes.
-->

---
layout: odsi
routeAlias: polling
---

# Where the money went

## Paying to ask "are you done yet?"

<!--
TODO notes.
-->

---
layout: odsi
routeAlias: reprocessing
---

# Reprocessing

## A full reprocessing campaign

<!--
TODO notes.
-->

---
layout: odsi
routeAlias: answers
---

# Observability

## Questions we can now answer

<!--
TODO notes.
-->

---
layout: odsi
routeAlias: phased
---

# Rollout

## Proven, then phased

<!--
TODO notes.
-->

---
layout: odsi-section
routeAlias: snwg
---

# Part three

## Applying this to other SNWG solutions

<!--
TODO notes.
-->

---
layout: odsi
routeAlias: patterns
---

# Across solutions

## Patterns we see

<!--
TODO notes.
-->

---
layout: odsi
routeAlias: self-check
---

# Self-assessment

## Questions to ask about your own system

<!--
TODO notes.
-->

---
layout: odsi
routeAlias: downstream
---

# Multiplier

## HLS gains carry downstream

<!--
TODO notes.
-->

---
layout: odsi-dark
routeAlias: takeaways
---

# Takeaways

## What we'd like you to take away

<!--
TODO notes.
-->
