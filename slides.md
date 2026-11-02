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

Turning the science code at the heart of HLS into production code we can own, test and improve

<!--
Part one is about LaSRC, the atmospheric correction code at the center of HLS. LaSRC turns top of atmosphere reflectance into surface reflectance, and every HLS granule passes through it. It is also, as of the start of this work, code that we depended on but did not control. This section is a condensed version of a longer talk we gave on the Rust port, so if anyone wants the full detail I am happy to share it. The short version is that we turned outside science code into production code we own, with a test suite that proves it matches the original.

Sources: developmentseed/lasrc_rust_presentation.
-->

---
layout: odsi
routeAlias: science-vs-prod
---

# The problem

## Science code is not production code

<div class="ba mt-1">
  <div class="panel" style="background:#F4F8FB">
    <h3 style="color:var(--navy)">Science code optimizes for</h3>
    <ul>
      <li>Answering a research question correctly</li>
      <li>Rapid iteration on the algorithm</li>
      <li>Being run by the person who wrote it</li>
    </ul>
  </div>
  <div class="arrowmid">→</div>
  <div class="panel after">
    <h3>A production system requires</h3>
    <ul>
      <li>Reproducibility across millions of granules</li>
      <li>Change that is isolated, reviewable and reversible</li>
      <li>Operation by people who did not write it, for a decade</li>
    </ul>
  </div>
</div>

<div class="band mt-4">
For the USGS ESPA LaSRC code HLS has used since 2019, that gap looked like: <b>one maintainer</b> · <b>a deprecated build chain</b> · <b>no public repository or tagged releases</b> · <b>separate, non-interoperable VIIRS and MODIS auxiliary paths</b> · <b>HLS code coupled to LaSRC internals</b>
</div>

<!--
This is the framing I want to leave you with for this section, and I think it applies well beyond HLS. Science code and production code optimize for different things. Science code exists to answer a research question correctly, to iterate on the algorithm quickly, and it is usually run by the person who wrote it. A production system needs the same answer across millions of granules, every change isolated and reversible, and it is operated by people who did not write it, often for a decade. Neither column is better engineering. They are different requirements. When we picked the USGS ESPA implementation of LaSRC in 2019 it was the right choice. But for an operational product the gap showed up as risk: a single maintainer, a build chain with deprecated dependencies, no public repository or tagged releases we could pin, auxiliary data paths for VIIRS and MODIS that cannot be mixed, and our own HLS code depending on LaSRC's internal file structure.

Sources: developmentseed/lasrc_rust_presentation (slides 4 to 6 and outline.md).
-->

---
layout: odsi
routeAlias: five-months
---

# The trigger

## The 5–6 month problem

<div class="cols mt-2" style="align-items:flex-start">
<div class="col" style="flex:.8">
  <div class="stat"><span class="n">5–6</span><span class="u">months of one engineer</span></div>
  <p style="font-size:.85rem">Our estimate for porting and testing LaSRC. For a small team running production while piloting other SNWG solutions, it never made the top of the list.</p>
  <div class="todo mt-3">
    <div class="tag">Sean: confirm</div>
    <p>Days or weeks? State how long the agent-assisted port actually took.</p>
  </div>
</div>
<div class="col">
<ol class="steps">
  <li><strong>Low latency needs a new auxiliary source.</strong> NOAA GDAS, instead of the slower VIIRS and MODIS products.</li>
  <li><strong>ESPA cannot mix auxiliary sources.</strong> Adding GDAS meant large, hard-to-track changes to code we do not own.</li>
  <li><strong>So the port became the cheaper route</strong> to a requirement we had to meet anyway.</li>
</ol>
</div>
</div>

<!--
If the case was that clear, why had we not done it? Because my estimate for building and testing a Rust port was five to six months of one full time engineer. For a team our size, operating a production system while piloting other SNWG solutions, that is not a block of time you can find. What changed was the low-latency requirement. Low latency needs a faster auxiliary data source, NOAA's Global Data Assimilation System, GDAS, and the ESPA codebase cannot mix auxiliary sources: the VIIRS and MODIS paths are separate. Adding GDAS there meant large, hard to track changes to code we did not own. Once we scoped that, the port stopped being a speculative investment and became the cheaper route to something we had to deliver anyway. So the 5–6 months estimate was the barrier; the next slide is how we got past it.

Sources: developmentseed/lasrc_rust_presentation (slides 8, 11 and 12; outline.md "The arrival of a robot army").
-->

---
layout: odsi
routeAlias: loop
---

# Approach

## Agents plus a reference to check against

<svg class="loop mt-1" viewBox="0 0 900 250" role="img" aria-label="Porting loop: agents port a module, run it on a reference granule, diff against ESPA C output, accept if within threshold, otherwise adjust and rerun.">
  <defs>
    <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" style="fill:#1C7293"/></marker>
    <marker id="ahc" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" style="fill:#D9695A"/></marker>
  </defs>
  <rect class="box hot" x="10" y="40" width="170" height="86" rx="12"/>
  <text class="t" x="95" y="78" text-anchor="middle">Agents port</text>
  <text class="t" x="95" y="99" text-anchor="middle">a module</text>
  <text class="s" x="95" y="118" text-anchor="middle">C source as the spec</text>
  <rect class="box" x="220" y="40" width="170" height="86" rx="12"/>
  <text class="t" x="305" y="78" text-anchor="middle">Run on a</text>
  <text class="t" x="305" y="99" text-anchor="middle">reference granule</text>
  <rect class="box" x="430" y="40" width="170" height="86" rx="12"/>
  <text class="t" x="515" y="78" text-anchor="middle">Diff against</text>
  <text class="t" x="515" y="99" text-anchor="middle">ESPA C output</text>
  <polygon class="box" points="700,33 765,83 700,133 635,83"/>
  <text class="t" x="700" y="79" text-anchor="middle">within</text>
  <text class="t" x="700" y="98" text-anchor="middle">5 DN?</text>
  <rect class="box ok" x="800" y="50" width="92" height="66" rx="12"/>
  <text class="t" x="846" y="89" text-anchor="middle">Accept</text>
  <path class="ln" d="M180,83 H216" marker-end="url(#ah)"/>
  <path class="ln" d="M390,83 H426" marker-end="url(#ah)"/>
  <path class="ln" d="M600,83 H631" marker-end="url(#ah)"/>
  <path class="ln" d="M765,83 H796" marker-end="url(#ah)"/>
  <text class="lbl" x="781" y="73" text-anchor="middle">yes</text>
  <path class="ln back" d="M700,133 V190 H95 V130" marker-end="url(#ahc)"/>
  <text class="lbl no" x="400" y="212" text-anchor="middle">no: adjust, refactor, run again</text>
</svg>

<div class="cols mt-2">
<div class="col"><p style="font-size:.85rem;margin:0">We ran <strong>several Claude Code sessions in parallel</strong>, each porting a different part of the code, instead of one engineer working through it in sequence.</p></div>
<div class="col"><div class="band" style="margin:0">The critical ingredient was <b>the reference output, not the model</b>. Without it, you have a lot of plausible code and no way to trust it.</div></div>
</div>

<!--
This is where AI changed the timeline. The moment we reframed the port coincided with a steep rise in what large language models can do with code, and with tools that let you run several agent sessions in parallel. So we ran several Claude Code sessions at once, each working on a different part of the port, with the original C source acting as the specification. The method is the loop on the screen. An agent ports a module. We run it on a reference granule. We diff the output against the original ESPA C output. If the difference is inside the threshold, five HLS digital numbers, we accept it. If not, we adjust, refactor and run again. The point I want to underline is the band on the right. The critical ingredient was not the model. It was having a reference output to measure against. Agents supplied the throughput; the reference supplied the truth. Neither works without the other.

Sources: developmentseed/lasrc_rust_presentation (slides 12 to 14).
-->

---
layout: odsi
routeAlias: validation
---

# Validation

## The suite found what the agents missed

<div class="grid g2 mt-1">
  <div class="card">
    <h3><span class="chip teal">✓</span>An automated validation suite</h3>
    <p style="margin-bottom:.45rem!important">Built in house by Trang Vo and Madhu Sridhar. Compares C and Rust outputs on <strong>353 granules × 7 bands</strong>, at the LaSRC stage and in the final HLS product, and logs runtime and memory in the same run.</p>
    <p>Run across the full set, it surfaced bugs the first few test granules had hidden:</p>
    <ul class="mini">
      <li>Type conversions copied too faithfully</li>
      <li>Invalid auxiliary retrievals handled differently</li>
      <li>Scene-center geometry calculated, not read</li>
      <li>Bilinear instead of nearest-neighbor interpolation</li>
    </ul>
  </div>
  <div class="card">
    <h3><span class="chip navy">◎</span>Humans in the loop</h3>
    <p style="margin-bottom:.45rem!important">Chris Holden worked through each class of issue with agent-driven refactoring and <strong>manual review of every fix</strong>. The agentic loop made this dramatically faster.</p>
    <p>In two cases the model's choice was arguably <strong>more correct</strong> than the original. We matched the C code anyway, to prove equivalence first, and logged each difference to fix deliberately later.</p>
  </div>
</div>

<div class="band mt-3">AI accelerated the work, but it is <b>only as capable as the engineer or scientist using it</b>.</div>

<!--
The first agent-assisted port looked good on a handful of granules. Then we ran it through the validation suite the team built in house. Trang Vo and Madhu Sridhar built a suite that compares the C and Rust outputs across 353 granules and seven bands, at the LaSRC stage and in the final HLS product, and records runtime and memory in the same run. Across the full set it found a whole range of problems the first few granules had hidden: type conversions copied too faithfully from inconsistent C code, invalid auxiliary retrievals handled differently, scene-center geometry calculated rather than read from metadata, and bilinear interpolation where C used nearest neighbor. Chris Holden worked through each one with agents doing the refactoring and a human reviewing every fix. Interestingly, in the geometry and interpolation cases the model's choice was arguably more correct than the original. We matched the C code anyway, because equivalence is the only claim you can prove objectively, and logged each difference to fix on purpose later.

Sources: developmentseed/lasrc_rust_presentation (slides 15 to 20); NASA-IMPACT/hls-application lasrc_validation notebooks/LaSRC_container_validation.ipynb.
-->

---
layout: odsi
routeAlias: lasrc-results
---

# Results

## Same output, faster and cheaper

<div class="cols mt-1" style="align-items:center">
<div class="col" style="flex:.95">
  <div class="statrow" style="grid-auto-flow:row;grid-template-columns:1fr 1fr">
    <div class="cell"><span class="n">100%</span><span class="k">of 353 granules within 5 DN on all 7 bands</span></div>
    <div class="cell"><span class="n">30%</span><span class="k">faster than the ESPA C code</span></div>
    <div class="cell"><span class="n">7%</span><span class="k">less memory</span></div>
    <div class="cell"><span class="n warm">$21–36k</span><span class="k">a year in EC2, based on 2025 EC2 spend of $240k</span></div>
  </div>
  <p style="font-size:.75rem;color:var(--mute);margin-top:.6rem">From targeted tweaks only. Structural performance work has not started.</p>
</div>
<div class="col" style="flex:1.05">
  <img class="fig" src="/images/distribution_summary_immediate_20260922_150055.png" alt="Per-granule mean absolute reflectance difference by band, all flat at zero, far below the 0.0005 reflectance (5 HLS DN) threshold line.">
  <p class="credit">Per-granule mean |difference| by band against the 5 DN threshold, 353 granules, Sept 2026 run</p>
</div>
</div>

<!--
Where are we now? All 353 granules in the reference set agree with the ESPA C output within the 5 DN threshold on all seven bands. Five HLS DN is 0.0005 reflectance, chosen with the science team. The plot on the right shows the per-granule differences for each band, flat at zero, far below the dashed threshold line. And the Rust code is 30% faster and uses 7% less memory. Those gains came from targeted tweaks only, while the priority was matching C exactly, so most of the performance opportunity is still ahead of us. What is that worth? HLS spent about $240k on EC2 compute in 2025. If LaSRC is about half of job runtime for both sensors, a 30% faster LaSRC takes about 15% off EC2, about $36k a year. If only Sentinel-2 benefits, about 58% of granules, it is 8.8%, about $21k a year. So, about $21–36k a year, before any further optimization. This assumes EC2 cost scales with job runtime and reads "30% faster" as 30% less LaSRC runtime; if it means 1.3 times the throughput, the range is about $16–28k.

Sources: developmentseed/lasrc_rust_presentation (slides 21 to 23, validation run 2026-09-22); HLS_MCP_costs_breakdown_2025.csv (EC2-Instances $240,404); LaSRC share of runtime from hls-nextgen-orchestration PR 7 docs/orchestration-design.md.
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
