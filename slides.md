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

Paying for processing, not for waiting

<!--
Part two is the orchestration layer: the machinery that notices a new Landsat or Sentinel-2 granule, waits for the ancillary data it needs, submits the processing job, watches it, retries it, and records what happened. This part of the system is not glamorous, and it is not where most of the money goes, but it is where most of our operational pain came from and it is the main thing standing between us and an affordable reprocessing campaign. The theme for this section is in the subtitle: we want to pay for processing, not for waiting.

Sources: hls-nextgen-orchestration PR 7 docs/orchestration-design.md.
-->

---
layout: odsi
routeAlias: hurts
---

# Today

## What hurts in the current system

<div class="flowdgm mt-1">
  <div class="fbox hot"><b>Step Functions</b><small>wakes on a timer, polls every job every 30 to 60 s</small></div>
  <div class="farrow">→</div>
  <div class="fbox"><b>AWS Batch</b><small>one long job per granule: fmask, LaSRC, post-processing, upload</small></div>
  <div class="farrow">→</div>
  <div class="fbox hot"><b>RDS log database</b><small>always on, pruned to stay fast</small></div>
</div>

<div class="grid g2 mt-4" style="gap:.6rem">
  <div class="card"><h3><span class="chip coral">1</span>Granules silently dropped</h3><p>Database timeouts before submission drop the job; timeouts afterwards leave finished work unrecorded and never retried.</p></div>
  <div class="card"><h3><span class="chip coral">2</span>Polling cost and rate limits</h3><p>About 113 billed state transitions per granule, and AWS API limits at 10 to 20 thousand concurrent jobs.</p></div>
  <div class="card"><h3><span class="chip coral">3</span>Spot risk on long jobs</h3><p>LaSRC is about half of Sentinel-2 runtime. An interruption late in a job throws away the most expensive work.</p></div>
  <div class="card"><h3><span class="chip coral">4</span>History pruned away</h3><p>The audit trail needed for reprocessing and reconciliation is deleted to keep the database fast.</p></div>
</div>

<!--
Here is the current system, simplified. A Step Functions state machine wakes up on a timer and polls every running Batch job every 30 to 60 seconds. Each granule runs as one long Batch job: fmask, LaSRC, post-processing and upload all in one. And every step writes to an always-on relational database. Four things hurt. First, and most serious: when the database times out under load, granules are silently dropped, or a job finishes and nobody records it, so it is never retried. Second, polling costs money and hits AWS rate limits once we have 10 to 20 thousand jobs in flight, which is exactly what a reprocessing campaign looks like. Third, because the job is one long unit, a Spot interruption near the end throws away the most expensive work. Fourth, we have to prune the database to keep it fast, which throws away the history we need to answer basic questions later.

Sources: hls-nextgen-orchestration PR 7 docs/orchestration-design.md (Problems with the Current Architecture); docs/cost-analysis.md (113 transitions per granule).
-->

---
layout: odsi
routeAlias: new-design
---

# The new design

## Event-driven, with S3 as the log

<div class="flowdgm mt-1">
  <div class="fbox cool"><b>Granule lands</b><small>S3 event, no timer</small></div>
  <div class="farrow">→</div>
  <div class="fbox"><b>Lambda</b><small>records it, checks ancillary data</small></div>
  <div class="farrow">→</div>
  <div class="fbox"><b>Batch on Spot</b><small>scales to zero</small></div>
  <div class="farrow">→</div>
  <div class="fbox"><b>EventBridge</b><small>job finished event</small></div>
  <div class="farrow">→</div>
  <div class="fbox"><b>Job monitor</b><small>reads the outcome</small></div>
  <div class="farrow">→</div>
  <div class="fbox ok"><b>S3 log</b><small>append-only, never pruned</small></div>
</div>

<div class="outcomes">
  <span><b>Success, cloudy, low sun:</b> recorded as final states</span>
  <span><b>Spot interruption:</b> retry queue, resubmitted automatically</span>
  <span><b>Unexpected failure:</b> dead-letter queue, redriven after a fix</span>
</div>

<div class="band mt-4">The core principle: <b>S3 is the event store, the log and the coordination mechanism.</b> No database, no polling. Nothing runs while nothing is arriving.</div>

<p class="foot-note">Prototype built with Claude as a coding assistant.</p>

<!--
The new design turns this around. Nothing runs on a timer. When a granule lands in S3, that event triggers a small Lambda function that records it and checks whether its ancillary data is there. If it is, the job goes to AWS Batch on Spot instances, which scale to zero when there is nothing to do. When the job finishes, AWS publishes an event, and a job monitor reads the outcome and writes it to an append-only log in S3. Successes, cloudy and low-sun-angle granules are recorded as final states. Spot interruptions go to a retry queue and are resubmitted automatically. Genuine failures go to a dead-letter queue, so a spike there means something is actually broken, and we can redrive them once it is fixed. The core principle is that S3 is the event store, the log and the coordination mechanism. No database and no polling. We built the prototype with Claude as a coding assistant.

Sources: hls-nextgen-orchestration PR 7 docs/orchestration-design.md (Target Architecture, State Machine).
-->

---
layout: odsi
routeAlias: cost-table
---

# Cost

## Orchestration cost, line by line

<div class="cols mt-1" style="align-items:center">
<div class="col" style="flex:1.7">
<table>
  <thead><tr><th>Annual cost</th><th>Current (polling)</th><th>New (event-driven)</th></tr></thead>
  <tbody>
    <tr><td>Step Functions</td><td>$15,518</td><td>not used</td></tr>
    <tr><td>RDS database</td><td>$4,375</td><td>not used</td></tr>
    <tr><td>Lambda</td><td>$205</td><td>~$2</td></tr>
    <tr><td>S3 polling for ancillary data</td><td>~$60</td><td>~$0</td></tr>
    <tr><td>S3 event store</td><td>not used</td><td>~$180</td></tr>
    <tr><td>SQS and EventBridge</td><td>not used</td><td>~$15</td></tr>
    <tr class="total"><td>Total</td><td>~$20,160</td><td>~$200</td></tr>
  </tbody>
</table>
</div>
<div class="col">
  <div class="stat"><span class="n">~100×</span></div>
  <p style="font-size:.85rem">cheaper to orchestrate the same 15,000 granules a day.</p>
  <p style="font-size:.75rem;color:var(--mute)">2025 bill: Step Functions plus RDS came to about $20.7k, in line with the model.</p>
</div>
</div>

<!--
Here is what that means in dollars, line by line. The current system spends about $15,518 a year on Step Functions and $4,375 on the database, plus small amounts on Lambda and on S3 calls that poll for ancillary data: about $20,160 a year in total. The new design spends about $180 a year storing its log in S3 and about $15 on queues and events, roughly $200 a year. That is about a hundred times cheaper to orchestrate the same 15,000 granules a day. These are modeled figures from our cost analysis. On the 2025 bill, Step Functions and the database together came to about $20.7k, in line with the model; the split differs because database costs fell early in the year. I want to be honest about scale: twenty thousand dollars is not the biggest line in our budget. The bigger prize is what this does to reprocessing, which is two slides from now.

Sources: hls-nextgen-orchestration docs/cost-analysis.md (Scheduled/Poll vs Event-Driven comparison); HLS_MCP_costs_breakdown_2025.csv (Step Functions $12,408, RDS $8,266).
-->

---
layout: odsi
routeAlias: polling
---

# Where the money went

## Paying to ask "are you done yet?"

<div class="mt-3">
  <div class="hbar"><span class="lab">Real state changes in a job's life</span><div class="bar good" style="--w:10.6%">12</div></div>
  <div class="hbar"><span class="lab">State transitions billed per granule</span><div class="bar" style="--w:100%">113</div></div>
</div>

<div class="cols mt-4">
<div class="col">

A 20 to 30 minute job is polled every 30 to 60 seconds. Every poll is a **wait, a Lambda call and a decision**, and each one is billed.

</div>
<div class="col">
<div class="band" style="margin:0">Polling is <b>about $15,518 a year</b> in Step Functions alone. An event costs nothing until something actually happens.</div>
</div>
</div>

<!--
Why was the old system so expensive to run? Step Functions bills per state transition. A job's real life has about 12 of them: submitted, waiting, retried, succeeded or failed. But we were billed for about 113 per granule. The difference is polling. A job that runs 20 to 30 minutes gets checked every 30 to 60 seconds, and every check is a wait, a Lambda call and a decision, three billed transitions that tell us nothing new. We worked the 113 backwards from the actual spend, and it matches that polling pattern. In other words, we were paying to ask "are you done yet?" tens of times per granule, fifteen thousand granules a day. An event-driven design asks nothing. It just gets told when something happens.

Sources: hls-nextgen-orchestration docs/cost-analysis.md (Where polling costs accumulate: $15,517.69/year, 1.7M transitions/day, about 113 per granule against about 12).
-->

---
layout: odsi
routeAlias: reprocessing
---

# Reprocessing

## A full reprocessing campaign

<p style="margin-top:0">Orchestration cost to reprocess the full archive, about <strong>30M granules</strong> (for example, HLS v3):</p>

<div class="mt-2">
  <div class="hbar"><span class="lab">Current, at the full production rate</span><div class="bar" style="--w:100%">$85k</div></div>
  <div class="hbar"><span class="lab">Current, ancillary data already available</span><div class="bar mid" style="--w:65%">$55k</div></div>
  <div class="hbar"><span class="lab">New, event-driven</span><div class="bar good" style="--w:4.8%">~$4.1k</div></div>
</div>

<div class="cols mt-3">
<div class="col"><div class="band" style="margin:0">From <b>$55–85k</b> to <b>about $4.1k</b>, and <b>no rate-limit ceiling</b> on how fast we can go.</div></div>
<div class="col">
  <div class="todo">
    <div class="tag">Sean: confirm</div>
    <p>The cost analysis gives $4.1k in one table and $2.7k in another. Which is right?</p>
  </div>
</div>
</div>

<!--
This is the slide I would most like managers to remember. Reprocessing the full HLS archive, around 30 million granules, for example for an HLS version 3, would cost between 55 and 85 thousand dollars in orchestration alone on the current system, depending on whether the ancillary data is already available. On the new system it is about 4 thousand dollars. So $55–85k becomes about $4.1k. Just as important, the new design removes the rate-limit ceiling, so we can run a campaign as fast as we are willing to pay for compute, rather than as fast as the polling loop can keep up. And a later phase splits each job so fmask runs first: the 10 to 15 percent of Sentinel-2 granules that are too cloudy or have too low a sun angle exit early on a small instance, before the expensive LaSRC step.

Sources: hls-nextgen-orchestration docs/cost-analysis.md (One-time full historical reprocessing); PR 7 docs/orchestration-design.md (rate limits, Job Splitting).
-->

---
layout: odsi
routeAlias: answers
---

# Observability

## Questions we can now answer

<div class="grid g2 mt-1" style="gap:.6rem">
  <div class="card"><h3><span class="chip teal">?</span>Did every product reach LP DAAC?</h3><p>Compare our output log against the LP DAAC catalog, by date.</p></div>
  <div class="card"><h3><span class="chip teal">?</span>Did we try every granule ESA and USGS published?</h3><p>Compare our input log against CMR, by date.</p></div>
  <div class="card"><h3><span class="chip teal">?</span>How much is cloudy or low sun?</h3><p>Recorded as their own outcomes, not lumped in with failures.</p></div>
  <div class="card"><h3><span class="chip teal">?</span>What fails, how often, and does retrying help?</h3><p>Every attempt and exit code, queryable with Athena.</p></div>
</div>

<div class="band mt-4">The full history is kept <b>indefinitely, for about $180 a year</b>. No database to prune, no extra service to run.</div>

<!--
Lower cost is only half of it. Because every state change is written to a log in S3 and never deleted, we can answer questions that today we simply cannot. Did every product we made reach LP DAAC? Did we at least attempt every granule that ESA and USGS published? How much of the archive is screened out as cloudy or low sun, as opposed to genuinely failing? What fails, how often, and does a retry fix it? Each of these becomes a query with Athena over S3, rather than a manual investigation. And the full history is kept indefinitely for about $180 a year, because S3 storage is cheap and there is no database to prune.

Sources: hls-nextgen-orchestration PR 7 docs/orchestration-design.md (Analytics: Athena over S3 Inventory, reconciliation queries); docs/cost-analysis.md (S3 event store about $180/year).
-->

---
layout: odsi
routeAlias: phased
---

# Rollout

## Proven, then phased

<div class="cols mt-1">
<div class="col" style="flex:.9">
  <div class="card" style="border-left:4px solid var(--green)">
    <h3><span class="chip green">✓</span>Already proven</h3>
    <p style="margin-bottom:.4rem!important">The HLS-VI historical backfill processed about <strong>30M granules</strong> on this same pattern.</p>
    <p>The log never needed pruning, retries handled Spot interruptions cleanly, and weekly progress reports were a single query.</p>
  </div>
</div>
<div class="col">
<ol class="steps" style="counter-reset: step -1">
  <li><strong>Phase 0, shadow.</strong> The new job monitor watches the current system read-only. Zero risk, real data from day one.</li>
  <li><strong>Phase 1, event-driven.</strong> Retire Step Functions polling and the database.</li>
  <li><strong>Phase 2, split jobs.</strong> fmask first, so cloudy granules exit early and Spot is safer.</li>
  <li><strong>Phase 3, reconcile.</strong> Use the log to find what is missing and drive reprocessing.</li>
</ol>
</div>
</div>

<!--
This is not a leap of faith. The same pattern already ran the HLS vegetation index historical backfill, about 30 million granules. The log never needed pruning, the retry design handled Spot interruptions cleanly, and when a bug fix caused unexpected failures we resubmitted every affected granule with a single query. Weekly progress reporting was a query too. We are rolling it out to HLS production in phases. Phase 0 runs the new job monitor in shadow mode alongside the current system, read-only, so we get real production data with zero risk. Phase 1 switches to event-driven orchestration and retires the polling and the database. Phase 2 splits jobs so fmask runs first. Phase 3 uses the log to reconcile the archive and drive reprocessing.

Sources: hls-nextgen-orchestration PR 7 docs/orchestration-design.md (Prototype Validation, Implementation Sequencing).
-->

---
layout: odsi-section
routeAlias: snwg
---

# Part three

## Applying this to other SNWG solutions

What we would look for in any production system, and how we can help

<!--
That is the HLS story. For the last part I want to turn it around, because the reason we are in this room is not to show off HLS. It is that I suspect many of your solutions are paying for the same problems we were. I want to be careful here. Everything in this section comes from public code and documentation, it describes patterns rather than any one team, and I am not going to name anyone. If something sounds familiar, that is the point, and we would love to talk about it.

Sources: docs/research/snwg-solutions.md.
-->

---
layout: odsi
routeAlias: patterns
---

# Across solutions

## Patterns we see

<div class="pairs mt-1">
  <div class="head">What we see</div><div></div><div class="head">What HLS learned</div>
  <div class="pat"><b>Whole granules copied</b> to local disk, sometimes more than once</div><div class="arr">→</div><div class="les"><b>Read only the bytes you need</b>, straight from cloud-optimized sources</div>
  <div class="pat"><b>Long single-step jobs</b> forced onto on-demand instances</div><div class="arr">→</div><div class="les"><b>Split jobs</b> so a Spot interruption costs minutes, not hours</div>
  <div class="pat"><b>Always-on servers and databases</b>, paid for while idle</div><div class="arr">→</div><div class="les"><b>Event-driven, scale to zero</b>: pay only when something arrives</div>
  <div class="pat"><b>Legacy Fortran or C</b> wrapped in layers of Python</div><div class="arr">→</div><div class="les"><b>Port with agents</b>, held to a validation suite</div>
  <div class="pat"><b>Homemade audit scripts</b> to check what was produced</div><div class="arr">→</div><div class="les"><b>An append-only log</b> you can query</div>
  <div class="pat"><b>Reprocessing with no cost estimate</b> up front</div><div class="arr">→</div><div class="les"><b>Model the cost</b> before you run the campaign</div>
</div>

<p class="foot-note">Patterns, not assessments of any one team.</p>

<!--
Here are six patterns we found looking across public code and documentation for SNWG solutions, each paired with what HLS learned. First, whole granules copied to local disk before processing, sometimes more than once. The lesson is to read only the bytes you need from cloud-optimized sources. Second, long single-step jobs that end up on on-demand instances because an interruption would waste too much work; split the job and Spot becomes safe. Third, always-on control servers and databases that are paid for while idle; event-driven designs that scale to zero avoid paying for idle time. Fourth, legacy Fortran or C wrapped in layers of Python, which is exactly where we were with LaSRC. Fifth, homemade scripts to check what was produced, which an append-only log answers by design. Sixth, reprocessing campaigns with no published cost estimate; model it first, the way we did.

Sources: docs/research/snwg-solutions.md (patterns 1 to 7, with evidence and confidence levels).
-->

---
layout: odsi
routeAlias: self-check
---

# Self-assessment

## Questions to ask about your own system

<div class="cols mt-1">
<div class="col">
<ul class="checklist">
  <li>Do you know your <strong>cost per granule</strong>, and what a full reprocessing would cost?</li>
  <li>Are you paying for anything <strong>while nothing is arriving</strong>?</li>
  <li>Do you copy <strong>whole files</strong> when you only need some of the bytes?</li>
</ul>
</div>
<div class="col">
<ul class="checklist">
  <li>Would a <strong>Spot interruption</strong> waste an hour of work?</li>
  <li>If a granule went missing last month, could you <strong>prove it with one query</strong>?</li>
  <li>Could you change your science code tomorrow and <strong>prove nothing broke</strong>?</li>
</ul>
</div>
</div>

<div class="band mt-4">If you answered "no" or "not sure" to any of these, <b>we have been there</b>, and we would be glad to compare notes.</div>

<!--
If you want something to take back to your team, here are six questions. Do you know your cost per granule, and what a full reprocessing would cost? Are you paying for anything while nothing is arriving: servers, databases, polling loops? Do you copy whole files when you only need some of the bytes? Would a Spot interruption waste an hour of work? If a granule went missing last month, could you prove it with one query? And could you change your science code tomorrow and prove that nothing broke? Two years ago HLS would have answered "no" or "not sure" to most of these. If that is where you are, we have been there, and we would be glad to compare notes.

Sources: docs/research/snwg-solutions.md; the HLS lessons on the preceding slides.
-->

---
layout: odsi
routeAlias: downstream
---

# Multiplier

## HLS gains carry downstream

<div class="grid g3 mt-1">
  <div class="card"><h3><span class="chip teal">→</span>OPERA</h3><p>DSWx-HLS surface water and DIST-HLS disturbance products are built from HLS.</p></div>
  <div class="card"><h3><span class="chip teal">→</span>FIRMS-2G</h3><p>Burned area mapping uses the HLS vegetation indices.</p></div>
  <div class="card"><h3><span class="chip teal">→</span>HLS-LST</h3><p>Land surface temperature builds on the HLS record.</p></div>
</div>

<div class="cols mt-4">
<div class="col"><p style="font-size:.9rem;margin:0">When HLS gets <strong>faster, cheaper and more reliable</strong>, so does every product built on it. Lower HLS latency is lower latency for them.</p></div>
<div class="col"><div class="band" style="margin:0">Newer solutions, such as <b>GABAN</b> and <b>MWOW</b>, can build these patterns in <b>from the start</b> rather than retrofit them later.</div></div>
</div>

<!--
One more reason this matters beyond HLS. HLS is an input to other SNWG solutions: the surface water and disturbance products on the left, burned area mapping through the HLS vegetation indices, and land surface temperature. When HLS becomes faster, cheaper and more reliable, so does everything built on top of it, and any latency we take out of HLS comes straight out of theirs. And for solutions that are newer and still being built, the patterns in this talk are much cheaper to adopt at the start than to retrofit later, which is exactly what we are doing now, six years in.

Sources: docs/research/snwg-solutions.md (Solutions downstream of HLS; Solutions with no public pipeline code).
-->

---
layout: odsi-dark
routeAlias: takeaways
---

# Takeaways

## What we'd like you to take away

<div class="ask"><div class="num">1</div><div><h3>Measure first</h3><p>Know your cost per granule. You cannot reduce what you have not measured.</p></div></div>
<div class="ask"><div class="num">2</div><div><h3>Pay for events, not for waiting</h3><p>For HLS, orchestration is modeled to fall from about $20,160 to about $200 a year, and reprocessing from $55–85k to about $4.1k.</p></div></div>
<div class="ask"><div class="num">3</div><div><h3>Legacy science code is now affordable to modernize</h3><p>AI agents made a 5–6 month port practical, but only because a validation suite proved every result.</p></div></div>
<div class="ask"><div class="num">4</div><div><h3>Talk to us</h3><p>We can share our designs, cost models and validation tooling.</p>
  <div class="todo"><div class="tag">Sean: fill in</div><p>What exactly we offer (reviews, office hours, shared templates) and contact details.</p></div>
</div></div>

<!--
Four things to take away. First, measure. Know your cost per granule, because you cannot reduce what you have not measured. Second, pay for events, not for waiting: for HLS our cost model takes orchestration from about $20,160 a year to about $200, and a full reprocessing from $55–85k to about $4.1k. Those are modeled figures; the rollout is under way. Third, legacy science code is now affordable to modernize. AI agents turned a five to six month port into something we could actually prioritize, but only because we had a validation suite that proved every result; the agents supplied speed, the suite supplied trust. And fourth, talk to us. Everything in this talk, the designs, the cost models and the validation tooling, we are happy to share, and we would genuinely like to help other teams avoid the problems we spent six years learning about. Thank you.

Sources: summary of slides 10, 14, 16 and 8 to 9.
-->
