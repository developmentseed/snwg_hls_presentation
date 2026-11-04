---
theme: default
title: "Finding Efficiency in HLS Production"
info: |
  What operating HLS since 2021 taught us about cost and risk, and how other
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

The hard lessons six years of operating HLS have taught us about cost and risk and efficiency and how other solutions can leverage these lessons.

<div class="rule"></div>

<p class="foot">Sean Harkins · Development Seed / ODSI </p>

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
  <div class="cell"><span class="n">2021</span><span class="k">Global v2.0 production running continuously since</span></div>
  <div class="cell"><span class="n">~15,000</span><span class="k">Landsat and Sentinel-2 granules processed a day</span></div>
  <div class="cell"><span class="n">~$300k</span><span class="k">AWS processing costs in 2025, not including S3 storage</span></div>
</div>

<div class="cols mt-5">
<div class="col">

Harmonized Landsat and Sentinel-2 turns two missions into **one consistent 30 m surface reflectance record**, distributed by LP DAAC.

</div>
<div class="col">
<div class="band" style="margin:0">
HLS is also an input. <b>Several other SNWG solutions build on top of it</b> so any improvements we make in latency and stability are shared with other products.
</div>
</div>
</div>

<!--
A quick orientation for anyone who does not live with HLS every day. HLS harmonizes Landsat 8 and 9 from USGS and Sentinel-2 from ESA into a single 30 meter surface reflectance record, so users can treat the two missions as one. The global pipeline has run continuously since 2020 and processes around 15,000 granules a day. In 2025 the AWS bill for running it was about 300 thousand dollars, not including storage; keeping the archive in S3 adds about 154 thousand, which comes up on the goals slide. The rest of the talk is about where that money goes and how we are bringing it down. And HLS is also an input: several other SNWG solutions build on it, so our cost and latency flow into theirs.

Sources: granule volumes from hls-nextgen-orchestration docs/cost-analysis.md; 2025 spend from HLS_MCP_costs_breakdown_2025.csv (gross $452,535 less S3 $153,913 = $298,622, before credits); downstream consumers in docs/research/snwg-solutions.md.
-->

---
layout: odsi
routeAlias: why-now
---

# Background

## Why now?

<div class="ba mt-3">
  <div class="panel" style="background:#F4F8FB">
    <h3><span class="chip navy">5</span>Five years of operations</h3>
    <ul>
      <li>Cloud architecture patterns have changed a lot since 2021</li>
      <li>We've learned the tough lessons about scaling and inefficiency the hard way</li>
      <li>Managing and integrating science code has been a continuous challenge</li>
    </ul>
  </div>
  <div class="arrowmid">→</div>
  <div class="panel" style="background:#ECF6F2">
    <h3><span class="chip teal">↻</span>A new requirement</h3>
    <ul>
      <li>The HLS low-latency solution requires a new auxiliary data source and infrastructure with zero latency</li>
      <li>Simply patching our legacy libraries and systems to handle these
      requirements would have been costly and difficult to maintain</li>
      <li>We used these new requirements as a push to <strong>re-architect</strong> with the lessons we've learned</li>
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
  <div class="card trigger"><h3><span class="chip mint">0</span>Low latency</h3><p>The push: meet the new HLS low-latency solution requirements.</p></div>
  <div class="card"><h3><span class="chip navy">1</span>Reduce science code risk</h3><p>Own, maintain and test the core algorithmic code that HLS relies on.</p></div>
  <div class="card"><h3><span class="chip deep">2</span>Reduce infrastructure costs to an absolute minimum</h3><p>Refactor the bottlenecks and inefficiencies we've found.</p></div>
  <div class="card"><h3><span class="chip green">4</span>Make observability central</h3><p>Provide a complete picture of system state and health at all times.</p></div>
</div>

<p style="margin:1.4rem 0 .4rem;font-size:.8rem;font-weight:700;color:var(--navy)">2025 Infrastructure Spending</p>
<div class="spendbar">
  <div class="ec2" style="--w:53%">EC2 compute · 53%</div>
  <div class="s3" style="--w:34%">S3 storage and requests · 34%</div>
  <div class="other" style="--w:13%">Other · 13%</div>
</div>
<p class="spendcap">Of the $450k of AWS infrastructure cost in 2025. LaSRC modernization targets EC2 compute and the orchestration modernization targets the "other" and unlocks cheaper reprocessing.</p>

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

Making core science code maintainable, performant and stable.

<!--
Part one is about LaSRC, the atmospheric correction code at the center of HLS. Every HLS granule passes through it, and until this work it was code we depended on but did not control. The slides that follow are taken from our longer talk on the Rust port.

Sources: developmentseed/lasrc_rust_presentation.
-->

---
layout: odsi
routeAlias: lasrc-sits
---

# Orientation

## Where LaSRC sits in HLS

<div class="lsrc">
<svg class="dgm" style="max-height:400px;width:auto" viewBox="0 0 1000 370" role="img" aria-label="The HLS processing chain: Landsat and Sentinel Level 1 inputs pass through the ESPA product formatter into LaSRC atmospheric correction, which also consumes auxiliary aerosol, water vapor and ozone data, then into the HLS algorithmic code which produces the L30 and S30 products. Fmask runs as a separate step on the same Level 1 inputs and feeds its cloud and shadow mask into the HLS algorithmic code.">
  <defs>
    <marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#1C7293"></path>
    </marker>
  </defs>
  <rect class="box" x="384" y="16" width="224" height="56" rx="9"></rect>
  <text class="bx" x="496" y="40" text-anchor="middle" style="font-size:16px">Auxiliary data</text>
  <text class="sb" x="496" y="60" text-anchor="middle">aerosol, water vapor, ozone</text>
  <path class="ln" marker-end="url(#ah)" d="M496 72 V98"></path>
  <rect class="box" x="8" y="112" width="168" height="60" rx="9"></rect>
  <text class="bx" x="92" y="138" text-anchor="middle">Landsat 8 / 9</text>
  <text class="sb" x="92" y="158" text-anchor="middle">Level 1, USGS</text>
  <rect class="box" x="8" y="192" width="168" height="60" rx="9"></rect>
  <text class="bx" x="92" y="218" text-anchor="middle">Sentinel-2</text>
  <text class="sb" x="92" y="238" text-anchor="middle">Level 1C, ESA</text>
  <path class="ln" marker-end="url(#ah)" d="M176 142 H198 V178 H210"></path>
  <path class="ln" marker-end="url(#ah)" d="M176 222 H198 V188 H210"></path>
  <rect class="box" x="212" y="116" width="158" height="134" rx="9"></rect>
  <text class="bx" x="291" y="168" text-anchor="middle">ESPA product</text>
  <text class="bx" x="291" y="190" text-anchor="middle">formatter</text>
  <text class="sb" x="291" y="214" text-anchor="middle">common interchange</text>
  <text class="sb" x="291" y="231" text-anchor="middle">format</text>
  <path class="ln" marker-end="url(#ah)" d="M370 183 H404"></path>
  <rect class="hot" x="406" y="100" width="180" height="166" rx="11"></rect>
  <text class="hotlbl" x="496" y="166" text-anchor="middle">LaSRC</text>
  <text class="sb" x="496" y="192" text-anchor="middle">atmospheric</text>
  <text class="sb" x="496" y="209" text-anchor="middle">correction</text>
  <text class="sb" x="496" y="236" text-anchor="middle" style="fill:#1C7293;font-weight:700">C, USGS / ESPA</text>
  <path class="ln" marker-end="url(#ah)" d="M586 183 H618"></path>
  <rect class="box" x="620" y="116" width="158" height="134" rx="9"></rect>
  <text class="bx" x="699" y="168" text-anchor="middle">HLS algorithmic</text>
  <text class="bx" x="699" y="190" text-anchor="middle">code</text>
  <text class="sb" x="699" y="214" text-anchor="middle">BRDF, bandpass,</text>
  <text class="sb" x="699" y="231" text-anchor="middle">tiling</text>
  <path class="ln" marker-end="url(#ah)" d="M778 183 H812"></path>
  <rect class="box" x="814" y="128" width="150" height="50" rx="9"></rect>
  <text class="bx" x="889" y="159" text-anchor="middle">HLS L30</text>
  <rect class="box" x="814" y="190" width="150" height="50" rx="9"></rect>
  <text class="bx" x="889" y="221" text-anchor="middle">HLS S30</text>
  <path class="ln" marker-end="url(#ah)" d="M198 178 V330 H210"></path>
  <rect class="box" x="212" y="300" width="158" height="60" rx="9"></rect>
  <text class="bx" x="291" y="326" text-anchor="middle">Fmask</text>
  <text class="sb" x="291" y="346" text-anchor="middle" style="font-size:12px">cloud and shadow mask</text>
  <path class="ln" marker-end="url(#ah)" d="M370 330 H699 V252"></path>
</svg>
<div class="band" style="margin-top:.35em">The product formatter, LaSRC and
  FMask are maintained outside our team. <b>LaSRC is the scientific heart of the product</b>.</div>
</div>

<!--
Quick orientation so the rest of the talk makes sense. HLS takes Landsat Level 1 from USGS and Sentinel-2 Level 1C from ESA. Those two formats have nothing in common, so the first thing that happens is the ESPA product formatter converts both into a common interchange format. That feeds LaSRC, which is the atmospheric correction step: it takes top of atmosphere reflectance and produces surface reflectance, using auxiliary data for aerosol, water vapor and ozone. Running alongside all of that, on the same Level 1 inputs, is Fmask, which is a separate step producing the cloud and shadow mask. It does not pass through LaSRC at all, it feeds straight into the HLS algorithmic code. Then our own HLS algorithmic code does BRDF normalisation, bandpass adjustment and tiling, combines in that mask, and out come L30 and S30. The thing I want you to take from this slide is the box in the middle. LaSRC is the scientific heart of HLS. It is also, along with the product formatter, code that is maintained outside our team, in C, by USGS ESPA. Everything I am about to say follows from that one fact.

Sources: developmentseed/lasrc_rust_presentation (slide 2, "Where LaSRC sits in HLS"), verbatim.
-->

---
layout: odsi
routeAlias: chose-espa
---

# 2020

## Why we chose ESPA

<div class="lsrc">
<p style="font-size:.64em;max-width:90%;margin:.1em 0 .5em">When we started HLS global processing we needed the LaSRC implementation that was
<strong>simplest to compile, containerize and maintain</strong>. USGS ESPA was clearly that, and it brought more than just the algorithm.</p>
<div class="grid g3">
  <div class="card"><h3><span class="chip navy">1</span>Build infrastructure</h3>
    <p>A working recipe for compiling the library into an image.</p></div>
  <div class="card"><h3><span class="chip deep">2</span>Format conversion</h3>
    <p>The product formatter, turning Landsat and Sentinel distributions into one interchange format.</p></div>
  <div class="card"><h3><span class="chip teal">3</span>Auxiliary data tooling</h3>
    <p>Utilities for obtaining and generating the water vapor and aerosol datasets LaSRC depends on.</p></div>
</div>
<div class="band" style="margin-top:.55em">At the time this was the best choice.</div>
</div>

<!--
I want to be careful about how I frame the next few slides, so let me start here. When we kicked off HLS global processing in 2019, we looked at the available LaSRC implementations and picked the one that was simplest to compile, containerise and maintain. That was the USGS ESPA implementation, and it was clearly the right choice. It did not just give us the algorithm. It gave us a working build recipe, which anyone who has tried to compile a scientific C library from scratch will tell you is worth a great deal on its own. It gave us the product formatter that converts Landsat and Sentinel into a single interchange format. And it gave us the tooling for fetching and generating the auxiliary water vapor and aerosol data. So nothing in this talk is an argument that we chose wrong. We chose right. What changed over six years is that HLS stopped being a processing effort and became a production data system with operational commitments, and the requirements that come with that are different in kind.

Sources: developmentseed/lasrc_rust_presentation (slide 3, "Why we chose ESPA"), verbatim.
-->

---
layout: odsi
routeAlias: science-vs-prod
---

# Science != Production

## Science code is not production code

<div class="lsrc">
<div class="ba" style="margin-top:.3em">
  <div class="panel before" style="background:#F1F5F9">
    <h3 style="color:var(--deep)">Science code optimizes for</h3>
    <ul>
      <li>Answering a research question correctly</li>
      <li>Rapid iteration on the algorithm itself</li>
      <li>Being run by the person who wrote it</li>
      <li>Publishing a result, then moving on</li>
      <li>Flexibility to try something different tomorrow</li>
    </ul>
  </div>
  <div class="arrowmid">&#8594;</div>
  <div class="panel after">
    <h3>A production system requires</h3>
    <ul>
      <li>Reproducibility across millions of granules</li>
      <li>Change isolated, reviewable and reversible</li>
      <li>Being operated and maintained by people who did not write it</li>
      <li>Operating continuously for a decade</li>
      <li>Stability, with change under explicit control</li>
    </ul>
  </div>
</div>
</div>

<!--
This is the framing slide for the whole talk, so I want to spend a moment on it. Science code and production code optimise for genuinely different things. Science code exists to answer a research question correctly. It needs to support rapid iteration on the algorithm, because the algorithm is the point. It is usually run by the person who wrote it, who knows where the sharp edges are. It produces a result, that result gets published, and attention moves on. And it needs to stay flexible, because tomorrow you might want to try something completely different. A production data system wants nearly the opposite. It needs the same answer across thousands of granules, reproducibly. It needs every change to arrive isolated, reviewable and reversible. It is operated by people who did not write it, often years later. It has to run continuously for a decade. And it wants stability, with change happening only under explicit control. Neither of those columns is better engineering than the other. They are different requirements. Every single point of friction I am about to describe is just the distance between those two columns, and I think it is much more useful to talk about it that way than to talk about anyone's code being good or bad.

Sources: developmentseed/lasrc_rust_presentation (slide 4, "Science code is not production code"), verbatim.
-->

---
layout: odsi
routeAlias: espa-codebase
---

# Science != Production

## The ESPA LaSRC C Codebase

<div class="lsrc">
<div class="grid g2" style="margin-top:.3em">
  <div class="card"><h3><span class="chip coral">A</span>One maintainer</h3>
    <p>A single engineer mainly responsible for the entire codebase. This is normal for science code but is a risk factor for an operational product.</p></div>
  <div class="card"><h3><span class="chip coral">B</span>Stuck on legacy
      Python</h3>
    <p>The very complex compilation chain provided for the ESPA base
    container made upgrading Python versions difficult</p></div>
  <div class="card"><h3><span class="chip coral">C</span>Deprecated build dependencies</h3>
    <p>Compilation relies on several dependencies that are no longer actively maintained, so the build gets harder to reproduce every year.</p></div>
  <div class="card"><h3><span class="chip coral">D</span>No public repository or licence</h3>
    <p>Nowhere to file an issue, track a fix, or contribute back. Our questions and our patches have no route in.</p></div>
  <div class="card" style="grid-column:1 / -1"><h3><span class="chip coral">E</span>Adding GDAS auxiliary data is hard and costly</h3>
    <p>The low latency solution needs NOAA GDAS auxiliary data, but VIIRS and MODIS are separate code paths that cannot be mixed. Adding a third source means very large changes that are difficult to track and test, in code we do not own.</p></div>
</div>
<div class="band" style="margin-top:.5em">No regular release cycle, <b>no tagged versions to pin</b>, no performance regression testing, no baseline testing against reference images.</div>
</div>

<!--
So here is what that distance actually costs us, and I have split it into the code around the algorithm and the algorithm itself. First, the codebase. There is a single engineer responsible for the whole thing. I want to say clearly that this is an entirely normal way to run a research library, and it is also an uncomfortable foundation for an operational product with availability commitments. Second, the Python wrappers around the C functions use patterns that do not work on Python above 3.8, and because they sit in our processing path, that ceiling propagates outward into everything downstream. Third, compilation depends on several packages that are no longer maintained, which means the build becomes a little harder to reproduce every year that passes. Fourth, there is no public repository and no open licence, so when we find a problem there is no issue tracker to file it in, no way to track whether it has been fixed, and no route for us to contribute a patch back. And underneath all of it, there is no regular release cycle, which means there are no tagged versions for us to pin a production deployment to and record in product metadata. There is no performance regression testing and no baseline testing against a reference image set. When a change arrives, we find out what it did by running it. And the one that forced the issue: the low latency solution needs NOAA GDAS as its auxiliary data source. In the C code, the VIIRS and MODIS auxiliary paths are separate and cannot be mixed, so adding GDAS would mean very large changes that are hard to track and test, in code we do not own, on a team that was already stretched.

Sources: developmentseed/lasrc_rust_presentation (slide 5, "The ESPA LaSRC C Codebase", verbatim; card E and its note added from slides 6 and 8).
-->

---
layout: odsi
routeAlias: production-grade
---

# The requirement

## What makes a system "production" grade?

<div class="lsrc">
<ol class="steps">
  <li><strong>Automated fidelity testing.</strong> Every change validated against a suite of test granules, proving no reflectance or performance regression.</li>
  <li><strong>Automated unit testing.</strong> Structural and semantic correctness checked on every commit, not inferred from the output looking reasonable.</li>
  <li><strong>Isolated, reviewable change.</strong> An algorithmic update arrives as a well structured pull request we can selectively test, apply and roll back.</li>
  <li><strong>Automated build and deploy.</strong> Any update compiles and deploys with minimal change to our continuous integration pipelines.</li>
  <li><strong>Pinned, tagged releases.</strong> Production deployments reference a specific version, and that version is recorded in product metadata.</li>
</ol>
<div class="band" style="margin-top:.45em">And underneath all five: a
  codebase <b>flexible enough to incorporate upstream format changes and new
  features</b>, balancing fidelity against compute cost, in a language new engineers will want to work in.</div>
</div>

<!--
So if I turn all of that around into what we actually need, it comes to five promises. One, automated fidelity testing: every change validated against a suite of test granules so that we can demonstrate, not assert, that there has been no reflectance or performance regression. Two, automated unit testing, so that structural and semantic correctness is checked on every commit rather than inferred from the output looking about right. Three, change that arrives isolated and reviewable, as a pull request we can selectively test, apply, and roll back if it turns out to be wrong. Four, automated build and deploy, so that an update does not mean a week of pipeline surgery. Five, pinned and tagged releases, so a production deployment points at a specific version and that version appears in the product metadata, which matters enormously when someone asks two years later exactly what produced a given granule. And underneath all five, we need a codebase flexible enough to absorb upstream format changes cheaply, that balances output fidelity against compute cost, and that is written in something a new engineer joining the project will actually want to work on. That last one sounds soft. It is not. It determines who we can hire and how fast they become useful.

Sources: developmentseed/lasrc_rust_presentation (slide 7, "What makes a system 'production' grade?"), verbatim.
-->

---
layout: odsi
routeAlias: community
---

# Our vision

## A community driven atmospheric correction model

<div class="lsrc">
<p style="font-size:.6em;max-width:92%;margin:.1em 0 .45em">Even with these
proposed updates, we would still depend on a legacy codebase maintained by a very small team. What we actually want is a library with
<strong>a larger community of maintainers</strong>, led by a consortium of organisations, that can react quickly to upstream change from ESA and NASA.</p>
<div class="grid g3">
  <div class="card"><h3><span class="chip rust">1</span>A Rust port</h3>
    <p>Rewrite the ESPA LaSRC C library in Rust: equal or better numerical performance, with language level safety and maintainability.</p></div>
  <div class="card"><h3><span class="chip teal">2</span>A reference image archive</h3>
    <p>A curated set of Landsat and Sentinel granules for reflectance target assessment and for memory and CPU profiling over time.</p></div>
  <div class="card"><h3><span class="chip green">3</span>Automated comparison notebooks</h3>
    <p>A repository of fully automated notebooks that compare and analyze
    LaSRC outputs, so inter-comparison testing is a pipeline step, not a
  person assessing outputs.</p></div>
</div>
<div class="band" style="margin-top:.5em">The goal is not a better fork. It
  is <b>a codebase other organizations want to both use and contribute to</b>.</div>
</div>

<!--
Here is what we actually want, and I want to be ambitious about it for a second. Suppose we fixed every item on the friction list. We would still be depending on a legacy codebase maintained principally by a very small team of developers. That is the structural problem, and patching around it does not solve it. What we would prefer is a library with a large community of maintainers, led by a consortium of organisations, that provides continuous improvement and can react quickly when ESA or NASA change something upstream. To get there we proposed three things. First, a Rust port of the existing ESPA LaSRC C library. Second, an archive of reference Landsat and Sentinel images, used both for reflectance target performance assessment and for memory and CPU profiling, so that we can track improvement and regression over time rather than arguing about it. Third, a repository of fully automated notebooks for comparing and analysing LaSRC outputs, so that inter-comparison testing is something a pipeline does rather than something a person remembers to do. The goal in all three is not a better maintained fork. It is a codebase that other organisations actively want to contribute to.

Sources: developmentseed/lasrc_rust_presentation (slide 9, "A community driven atmospheric correction model"), verbatim.
-->

---
layout: odsi
routeAlias: why-rust
---

# The choice

## Why Rust

<div class="lsrc">
<div class="cols" style="margin-top:.2em">
  <div class="col" style="flex:.34">
    <img class="rustmark" src="/images/rust-logo.png" alt="Rust programming language logo" style="height:3.4em;margin-top:.6em">
  </div>
  <div class="col" style="flex:.66">
    <div class="rowcards">
      <div class="card"><h3><span class="chip rust">1</span>Easy Python integration</h3>
        <p>Equal,throughput than the C implementation.</p></div>
      <div class="card"><h3><span class="chip rust">2</span>Safety at the language level</h3>
        <p>Memory and type safety are enforced by the compiler rather than by reviewer discipline, which is exactly where a long lived scientific codebase tends to erode.</p></div>
      <div class="card"><h3><span class="chip rust">3</span>A larger pool of future maintainers</h3>
        <p>Rust has real momentum in academic and engineering communities.
        The contributor pool for a Rust project is bigger than for a large legacy C codebase.</p></div>
    </div>
  </div>
</div>
<div class="band" style="margin-top:.45em">The third reason is the one that
  actually drove the decision. <b>Community collaboration is a core
    goal</b> for any healthy software project.</div>
</div>

<!--
Why Rust specifically, because this is a fair question and the obvious alternative answers are modern C plus plus, or Fortran, or leaving it alone. Three reasons. First, numerical performance holds. Rust gives equal and in our case better throughput than the C implementation, and we were not willing to trade fidelity or speed for developer ergonomics. Second, safety is enforced by the compiler rather than by reviewer discipline. Memory and type safety in a long lived scientific codebase erode exactly where attention lapses, and having the compiler hold that line is worth a lot over a decade. But the third reason is the one that actually drove the decision, and I want to be honest that it is a sociological argument rather than a technical one. Rust has real and growing momentum in academic and engineering communities. Substantially more people will volunteer their time to a Rust project than will volunteer for a large legacy C codebase. If the goal is a community driven library, then the language choice is a community decision. Community is a technical requirement here, not a nice to have.

Sources: developmentseed/lasrc_rust_presentation (slide 10, "Why Rust"), verbatim.
-->

---
layout: odsi
routeAlias: five-months
---

# The obstacle

## So why had we not done it?

<div class="lsrc">
<div class="statgrid" style="grid-template-columns:1fr 1.6fr;margin-top:.3em">
  <div class="cell" style="display:flex;flex-direction:column;justify-content:center">
    <span class="n warm" style="font-size:2.4em">5 to 6</span>
    <p class="k" style="font-size:.55em">months of <strong>1 FTE</strong>
    was my initial estimate for building and testing a Rust port</p>
  </div>
  <div class="cell" style="background:#FBEEEC;display:flex;flex-direction:column;justify-content:center">
    <p style="font-size:.6em;margin:0;line-height:1.4">For a team of our size, running a production system while piloting other SNWG solutions,
    that was <strong>not a block of time we could prioritize.</strong></p>
  </div>
</div>
<div class="card" style="margin-top:.5em;background:#ECF6F2">
  <h3 style="color:#1E6B5C;font-size:.9em">The HLS low-latency solution changed this prioritization</h3>
  <p style="font-size:.6em">As we scoped the ESPA changes needed to add alternative auxiliary data support for the low latency
  requirement, we realized it might be <strong>less work to add that support in a new, simpler Rust codebase</strong> than to retrofit it into the existing one.</p>
</div>
</div>

<!--
So if the case is that clear, why had we not done it? Because I estimated building and testing this port at five to six months of one full time engineer. Set that against a team of our size, which is simultaneously operating a production system and piloting other SNWG solutions, and it was simply not a block of time we could prioritise. It was a good idea that sat on the list, which is where good ideas of that size usually stay. What changed was the GDAS work. As we scoped out the ESPA changes we would need to make to add alternative auxiliary data support for the low latency solution requirements, we came to the conclusion that it might genuinely be less effort to add that support in a new, simpler Rust codebase than to retrofit it into the existing one. That reframes the whole thing. The port stops being a large speculative investment and starts being a plausible route to a requirement we have to deliver anyway.

Sources: developmentseed/lasrc_rust_presentation (slide 11, "So why had we not done it?"), verbatim.
-->

---
layout: odsi
routeAlias: agents
---

# Timing

## Agents to the rescue

<div class="lsrc">
<p style="font-size:.64em;max-width:92%;margin:.1em 0 .5em">This
prioritization coincided with a steep rise in the coding capability of large language models and the adoption of
<strong>multi-agent harnesses</strong> that decompose an engineering task into work streams which can run in parallel.</p>
<div class="grid g3">
  <div class="card"><h3><span class="chip navy">1</span>Parallel work streams</h3>
    <p>Several agent sessions working concurrently on different portions of the port rather than one engineer working sequentially.</p></div>
  <div class="card"><h3><span class="chip deep">2</span>A reference to aim at</h3>
    <p>The model was initially prompted to replicate the ESPA LaSRC codebase as closely as possible, with the C source as the specification.</p></div>
  <div class="card"><h3><span class="chip teal">3</span>An objective stopping condition</h3>
    <p>Output compared continuously against a reference ESPA LaSRC granule, refactoring until the delta was less than the sensor noise floor.</p></div>
</div>
<div class="band" style="margin-top:.5em">The critical ingredient was not
  the model. It was <b>having a reference output for the model to measure against</b>.</div>
</div>

<!--
And this is where the timing gets lucky, because the moment we reframed the port as the cheaper route to GDAS support happened to coincide with a very steep rise in the coding capability of large language models, and with the adoption of multi-agent harnesses that let you decompose an engineering task into work streams that run in parallel. So what we actually did was run several Claude Code sessions concurrently, each working on different modules of the port, rather than one engineer working through it sequentially. The agents were asked to replicate the ESPA LaSRC codebase as closely as possible, with the C source acting as the specification. And crucially there was an objective stopping condition: we continually compared the generated code's output against a reference ESPA LaSRC granule output, and kept adjusting and refactoring until the difference sat inside the sensor's noise floor threshold. I want to underline the third point, because I think it is the transferable lesson from this whole exercise. The critical ingredient was not the model. It was having a reference output to measure against. Without that, you have generated a large amount of plausible Rust and no way to know anything about it.

Sources: developmentseed/lasrc_rust_presentation (slide 12, "Agents to the rescue"), verbatim.
-->

---
layout: odsi
routeAlias: loop
---

# Approach

## The loop

<div class="lsrc">
<svg class="dgm" viewBox="0 0 1000 300" role="img" aria-label="The porting loop: an agent ports code, the result is run on a reference granule, the output is differenced against the ESPA C output, and if the difference is outside the sensor noise floor the loop returns to adjust and re-run, otherwise the module is accepted.">
  <defs>
    <marker id="ah2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0 L10 5 L0 10 z" fill="#1C7293"></path>
    </marker>
  </defs>
  <rect class="box" x="8" y="40" width="182" height="86" rx="10"></rect>
  <text class="bx" x="99" y="76" text-anchor="middle"
  style="font-size:17px">Agents port</text>
  <text class="bx" x="99" y="97" text-anchor="middle"
  style="font-size:17px">C code</text>
  <text class="sb" x="99" y="116" text-anchor="middle">C source as spec</text>
  <path class="ln" marker-end="url(#ah2)" d="M190 83 H218"></path>
  <rect class="box" x="220" y="40" width="182" height="86" rx="10"></rect>
  <text class="bx" x="311" y="76" text-anchor="middle" style="font-size:17px">Run on a</text>
  <text class="bx" x="311" y="97" text-anchor="middle" style="font-size:17px">reference granule</text>
  <path class="ln" marker-end="url(#ah2)" d="M402 83 H430"></path>
  <rect class="box" x="432" y="40" width="182" height="86" rx="10"></rect>
  <text class="bx" x="523" y="76" text-anchor="middle" style="font-size:17px">Diff against</text>
  <text class="bx" x="523" y="97" text-anchor="middle" style="font-size:17px">ESPA C output</text>
  <path class="ln" marker-end="url(#ah2)" d="M614 83 H646"></path>
  <path class="hot" d="M738 23 L812 83 L738 143 L664 83 Z"></path>
  <text class="sb" x="738" y="76" text-anchor="middle" style="font-weight:700;fill:#1C7293">inside the</text>
  <text class="sb" x="738" y="93" text-anchor="middle" style="font-weight:700;fill:#1C7293">threshold</text>
  <path class="ln" marker-end="url(#ah2)" d="M812 83 H846"></path>
  <text class="cap" x="829" y="70" text-anchor="middle" style="font-size:13px;font-weight:700;fill:#3FA796">yes</text>
  <rect class="box" x="848" y="40" width="144" height="86" rx="10" style="fill:#ECF6F2;stroke:#3FA796"></rect>
  <text class="bx" x="920" y="88" text-anchor="middle" style="font-size:17px;fill:#1E6B5C">Accept</text>
  <path class="ln" marker-end="url(#ah2)" d="M738 143 V222 H311 V130"></path>
  <text class="cap" x="524" y="212" text-anchor="middle" style="font-weight:700">no: adjust, refactor, run again</text>
</svg>
<div class="band" style="margin-top:.35em">Agents supplied the code. <b>The
    reference output supplied the source of truth.</b> Neither works without the other.</div>
</div>

<!--
This is the loop, and it is deliberately simple. An agent ports a module, using the C source as the specification. The result gets run on a reference granule. The output is differenced against the ESPA C output for that same granule. If the difference sits inside the sensor noise floor, the module is accepted. If it does not, we go back, adjust, refactor and run it again. That is the whole method. The reason I am showing it as a diagram rather than describing it is that I think the shape matters more than the detail. This is a closed loop with an objective termination condition, and that is what makes agent generated code tractable at this scale. The agents supplied throughput, which is genuinely what made a five to six month estimate collapse. The reference output supplied ground truth. Neither half works without the other, and I would be very cautious about anyone proposing the first half without the second.

Sources: developmentseed/lasrc_rust_presentation (slide 13, "The loop"), verbatim.
-->

---
layout: odsi
routeAlias: foundation
---

# A good start

## A strong foundation, not a finished port

<div class="lsrc">
<div class="ba" style="margin-top:.3em">
  <div class="panel after">
    <h3>What we had</h3>
    <ul>
      <li>A complete Rust implementation of the algorithm</li>
      <li>Drastically improved Python wrapper and CLI code</li>
      <li>Good agreement on the initial test granules</li>
      <li>Months of estimated effort compressed into a few days</li>
    </ul>
  </div>
  <div class="arrowmid">&#8594;</div>
  <div class="panel before">
    <h3>What we did not have</h3>
    <ul>
      <li>Evidence across a representative range of targets</li>
      <li>Any way to distinguish agreement from coincidence</li>
      <li>Confidence that alternative implementation choices were deliberate</li>
    </ul>
  </div>
</div>
</div>

<!--
Now I want to be careful here, because there is a version of this talk that stops at the previous slide and declares victory, and that version would be wrong. What this initial round of AI assisted development gave us was a strong foundation. We had a complete Rust implementation of the algorithm, we had good agreement on our initial test granules, and we had compressed months of estimated effort into weeks. What we did not have was evidence across a representative range of targets. We had no way to distinguish genuine agreement from coincidence on an easy scene. And we had no confidence that where the port had made an alternative implementation choice, that choice was deliberate rather than accidental. Good agreement on a handful of granules is a hypothesis, not a result. Proving it one way or the other needed exactly the thing the production team had been asking for since the start of the project.

Sources: developmentseed/lasrc_rust_presentation (slide 14, "A strong foundation, not a finished port"), verbatim.
-->

---
layout: odsi
routeAlias: suite
---

# Validation

## The testing suite we have always needed

<div class="lsrc">
<p style="font-size:.64em;max-width:92%;margin:.1em 0 .5em">Since the start
of the HLS project, the production team has asked for a large scale automated validation suite, so that algorithmic
changes could be validated safely while measuring the effect across a wide, representative set of targets.</p>
<div class="cols">
  <div class="col"><div class="card"><h3><span class="chip teal">1</span>Built in house</h3>
    <p>Rather than depend on an external team for our validation testing, <strong>Trang Vo and Madhu Sridhar</strong> have been building and refining this system continuously.</p></div></div>
  <div class="col"><div class="card"><h3><span class="chip green">2</span>Fidelity and cost together</h3>
    <p>Resource utilization can be logged while outputs are generated, so the same run that proves reflectance agreement also measures <strong>performance regression</strong>.</p></div></div>
</div>
<div class="band" style="margin-top:.5em"><b>hls-application</b> &middot; <span style="font-family:var(--mono);font-size:.9em">https://github.com/NASA-IMPACT/hls-application/blob/lasrc_validation/notebooks/LaSRC_container_validation.ipynb</span></div>
</div>

<!--
Since the HLS project started, the production team has been requesting a large scale automated validation suite from the science team. The reason is exactly what I described in the first act: we want to be able to incorporate algorithmic change safely, while measuring what that change does across a wide and representative set of targets, rather than across whichever two granules someone happened to test. The important decision we made here is that rather than continue to rely on an external team to manage our validation testing, we built it ourselves. Trang Vo and Madhu Sridhar have been continually building and refining this system, and I want to give them explicit credit because this suite is the load bearing element of everything in the rest of this talk. The second thing worth noting is that we enable resource utilisation logging while generating the outputs. That means the same run that proves reflectance agreement also gives us the data to assess performance regression. Fidelity and cost get measured together, by one process, which is the only way either of them stays honest over time.

Sources: developmentseed/lasrc_rust_presentation (slide 15, "The testing suite we have always needed"), verbatim.
-->

---
layout: odsi
routeAlias: suite-does
---

# Validation

## What the suite actually does

<div class="lsrc">
<div class="statgrid" style="grid-template-columns:repeat(4,1fr);margin-top:.25em">
  <div class="cell"><span class="n">353</span><p class="k">granules compared, each at the immediate LaSRC stage and the final HLS stage</p></div>
  <div class="cell"><span class="n">7</span><p class="k">bands compared per granule, B01 Coastal Aerosol through B07 SWIR2</p></div>
</div>
<ol class="steps" style="margin-top:.5em">
  <li><strong>Discover and pair.</strong> List rasters under both output prefixes, detect stage, keep only symmetric pairs so nothing is compared against a gap.</li>
  <li><strong>Compare per pixel.</strong> Decode reflectance for both versions, compute the difference field, and summarize it.</li>
  <li><strong>Decide against a threshold.</strong> A band passes when the absolute mean reflectance difference is within the configured threshold for that band.</li>
</ol>
</div>

<!--
So what does the suite actually do. It compares the outputs of the old and new LaSRC containers, and it does so at two stages: the immediate LaSRC outputs, the surface reflectance band files, and the final HLS outputs, the L30 and S30 products. That second stage matters because it tells us whether a difference at the LaSRC step survives into the delivered product or gets absorbed downstream. The current run covers three hundred and fifty three granules, chosen to span a representative range of targets, seven bands each from coastal aerosol through to SWIR two. The workflow is three steps. First, discover and pair: list the rasters under both prefixes, detect which stage each belongs to, and keep only the symmetric pairs, so we never compare a file against a gap and call it a difference. Second, compare per pixel: decode reflectance for both versions, compute the difference field, summarise it. Third, decide against a threshold: a band passes when the absolute mean reflectance difference between the two outputs is within the configured threshold for that band. That last step is what turns a pile of plots into a pass or fail that a pipeline can act on.

Sources: developmentseed/lasrc_rust_presentation (slide 16, "What the suite actually does"), verbatim.
-->

---
layout: odsi
routeAlias: one-comparison
---

# Validation

## What one comparison looks like

<div class="lsrc">
<img class="fig" style="max-height:330px;width:auto" src="/images/granule-panel-rows.png"
     alt="Two band rows from the granule comparison panel. Each row shows, left to right, the LaSRC C surface reflectance image, the LaSRC Rust surface reflectance image, the difference map annotated with mean difference and threshold decision, a histogram overlay of both distributions, and a scatter plot of Rust against C values.">
<p class="muted-cap" style="text-align:center;margin-top:.15em">Two of seven band rows, one granule. Left to right: C reflectance &middot; Rust reflectance &middot; difference with decision &middot; histogram overlay &middot; scatter</p>
</div>

<!--
This is what a single comparison looks like, and I am showing two of the seven band rows for one granule so that it is legible. Reading left to right. First column, the surface reflectance image produced by LaSRC C. Second column, the same band produced by LaSRC Rust. You are meant to find those two indistinguishable, and you do. Third column is the difference map, Rust minus C, with the summary statistics and the threshold decision printed onto it, so you can see not just how large the difference is but where in the scene it sits, which turns out to matter a great deal when you are hunting a bug. Fourth is a histogram overlay of both distributions, and fifth is a scatter of Rust against C values pixel by pixel. The panel runs for every band of every granule, which is what makes this a suite rather than a spot check. The thing I want to point at is the third column. A mean difference statistic tells you the size of a problem. The spatial pattern in that difference map tells you what kind of problem it is, and that is what let us find the bugs on the next slides.

Sources: developmentseed/lasrc_rust_presentation (slide 17, "What one comparison looks like"), verbatim.
-->

---
layout: odsi
routeAlias: humans
---

# Reality

## Humans in the loop

<div class="lsrc">
<p style="font-size:.66em;max-width:92%;margin:.1em 0 .5em">When we ran the Rust code and validation suite against the full set of test granules, we
<strong>discovered a host of bugs</strong>.</p>
<div class="cols">
  <div class="col"><div class="card" style="background:#FBEEEC"><h3 style="color:#9B2F23"><span class="chip coral">&#9888;</span>The foundation had gaps</h3>
    <p>Agreement on a handful of granules had concealed a range of
    inconsistencies that only appeared across a wider set of granules and targets.</p></div></div>
  <div class="col"><div class="card" style="background:#ECF6F2"><h3
        style="color:#1E6B5C"><span class="chip green">&#10003;</span>The review loop</h3>
    <p><strong>Chris Holden</strong> tackled these incrementally, combining agent driven refactoring with manual review. There was a lot to address, but working in an agentic loop accelerated it dramatically.</p></div></div>
</div>
<div class="band" style="margin-top:.5em">While LLM usage accelerated this process it is only as capable as the engineer / scientist working with it.</div>
</div>

<!--
So we ran the suite against the full set of test granules, and we discovered a host of bugs. I think that is the most important sentence in this talk, and I want to sit on it for a second. The initial agent assisted port looked good. It looked good because it was being measured against a small number of granules. As soon as we measured it across a wider representative set of targets, a whole range of inconsistencies appeared that had simply been invisible before. That is not a failure of the approach, it is the approach working. The validation suite is what converts a plausible port into a trustworthy one. Chris Holden then started incrementally tackling these, using a combination of agent driven refactoring and manual review. There were a lot of inconsistencies and bugs to work through, but working in an agentic loop accelerated that process dramatically. And the generalisable point, I think, is the combination. The agents found and fixed bugs quickly because a human was reading every fix and deciding whether it was right. Neither of those halves gets there alone.

Sources: developmentseed/lasrc_rust_presentation (slide 18, "Humans in the loop"), verbatim.
-->

---
layout: odsi
routeAlias: four-classes
---

# Bugs / Inconsitencies

## Four main classes of issues

<div class="lsrc">
<div class="rowcards" style="margin-top:.25em">
  <div class="card"><h3><span class="chip coral">1</span>Type conversion, faithfully replicated</h3>
    <p>The ESPA C codebase is inconsistent about type conversion in a number
    of places. The model replicated many of those conversions faithfully, which produced <strong>residual accumulation differences</strong>.</p></div>
  <div class="card"><h3><span class="chip amber">2</span>Invalid auxiliary retrieval</h3>
    <p>Where auxiliary retrieval fails, the model decieded to set transmittance to <strong>zero</strong>. The C implementation sets it to the <strong>closest non-fill neighbour</strong>.</p></div>
  <div class="card"><h3><span class="chip teal">3</span>Scene center geometry</h3>
    <p>The model chose to <strong>calculate</strong> the scene center geometry. The C version takes solar zenith from metadata and sets view zenith and relative azimuth to zero.</p></div>
  <div class="card"><h3><span class="chip deep">4</span>Scene center interpolation</h3>
    <p>For center pressure, ozone and water vapor the model chose <strong>bilinear interpolation</strong> where C used <strong>nearest neighbour</strong>.</p></div>
</div>
</div>

<!--
Let me give you four concrete examples, because I think they are more interesting than the headline. First, type conversion. The ESPA LaSRC C codebase is very inconsistent about type conversion in a number of places. Our port attempted to replicate many of those conversions faithfully, and the result was residual accumulation differences. That is a subtle failure mode worth naming: the port was wrong precisely because it was being faithful. Second, invalid auxiliary retrieval. Where retrieval fails, the Rust port set transmittance to zero. The C implementation sets it to the closest non-fill neighbour. Those diverge exactly over the pixels where the atmosphere is hardest to characterise, which is to say the pixels people care about. Third, scene centre geometry. The Rust port calculated the geometry. The C version takes the solar zenith angle from metadata and sets view zenith and relative azimuth to zero. Fourth, scene centre interpolation: the Rust port bilinearly interpolated to get centre pressure, ozone and water vapor, where C does nearest neighbour. Now, look at three and four again, because they are a different kind of thing from one and two, and that is the next slide.

Sources: developmentseed/lasrc_rust_presentation (slide 19, "Four main classes of issues"), verbatim.
-->

---
layout: odsi
routeAlias: more-correct
---

# Models are capable

## Sometimes the model's choices were more correct than the ESPA codebase

<div class="lsrc">
<div class="ba" style="margin-top:.3em">
  <div class="panel before" style="background:#F1F5F9">
    <h3 style="color:var(--deep)">What we chose to do</h3>
    <ul>
      <li>Match the C implementation exactly, including where it is inconsistent</li>
      <li>Accept a known worse choice in order to prove equivalence first</li>
      <li>Record each divergence to address later</li>
    </ul>
  </div>
  <div class="arrowmid">&#8594;</div>
  <div class="panel after">
    <h3>Why that was the right order</h3>
    <ul>
      <li>Equivalence is the only claim that can be demonstrated objectively</li>
      <li>Once demonstrated, every divergence can be addressed <strong>individually</strong></li>
      <li>Each becomes a reviewable change with a measurable effect, not an argument</li>
    </ul>
  </div>
</div>
<div class="band" style="margin-top:.5em">Calculating the scene geometry is arguably <b>more accurate</b> than reading one angle from metadata and zeroing the other two. We matched C anyway, on purpose.</div>
</div>

<!--
This is the slide I most want to be honest about, especially with the science team in the room. In many cases during the initial porting work, the model chose an alternative implementation that caused an alignment difference. And in a number of those cases, the alternative implementation was chosen because the ESPA LaSRC codebase had a bug or an inconsistency. Take the geometry example. Calculating the scene centre geometry is arguably more accurate than taking the solar zenith angle from metadata and setting view zenith and relative azimuth to zero. The port was, on the merits, probably right. We matched the C behaviour anyway, deliberately. Here is why that is the correct order of operations. Equivalence is the only claim that can be demonstrated objectively. If we had allowed the port to be simultaneously a reimplementation and a set of improvements, then any difference in the output would have been unattributable, and we would be left arguing about it rather than measuring it. So we matched C, including where C is inconsistent, and we recorded each divergence rather than quietly resolving it. Now that we have demonstrated inter-comparison equivalence, every one of those recorded divergences becomes a separate, reviewable change with a measurable effect. That is a much better conversation to have with the science team than a large diff and a claim.

Sources: developmentseed/lasrc_rust_presentation (slide 20, "Sometimes the model's choices were more correct than the ESPA codebase"), verbatim.
-->

---
layout: odsi
routeAlias: where-now
---

# Results

## Where we are now

<div class="lsrc">
<div class="statgrid" style="margin-top:.35em">
  <div class="cell"><span class="n">100%</span><p class="k">Alignment between the Rust and ESPA C outputs, within the <strong>5 DN</strong> threshold, across all <strong>353</strong> granules in the reference set</p></div>
  <div class="cell"><span class="n warm">30%</span><p class="k">Faster than the ESPA C implementation</p></div>
  <div class="cell"><span class="n warm">7%</span><p class="k">Less memory used</p></div>
</div>
<div class="cols" style="margin-top:.5em">
<div class="col"><div class="card" style="background:#ECF6F2">
  <h3 style="color:#1E6B5C;font-size:.9em">Why 5 DN</h3>
  <p style="font-size:.58em">The threshold was chosen on feedback from the science team, so that alignment between the ESPA and Rust outputs is measured against
  <strong>a defined target rather than a judgement call</strong>. 5 HLS DN corresponds to 0.0005 reflectance.</p>
</div></div>
<div class="col"><div class="card">
  <h3 style="font-size:.9em">Why this number matters more than it looks</h3>
  <p style="font-size:.58em">These are the gains from <strong>targeted tweaks only</strong>, made while the priority was matching C exactly.
  Almost every structural performance opportunity is still on the table, and at global scale runtime is
  directly processing cost.</p>
</div></div>
</div>
</div>

<!--
So where did we land. Two results. First, one hundred percent alignment between the Rust and the ESPA C LaSRC outputs, within the five DN threshold, across all three hundred and fifty three granules in the reference set. Second, the Rust port runs about thirty percent faster using about seven percent less memory. I want to say a word about the threshold, because a number like five DN sounds arbitrary unless you know where it came from. We selected it based on feedback from the science team, precisely so that we had a well defined target we were working towards rather than a judgement call about whether two images looked close enough. Five HLS DN corresponds to 0.0005 reflectance. Having that number fixed in advance changed the character of the work: every fix either moved a band inside the threshold or it did not, and there was nothing to negotiate. If you take one process lesson from this talk, I would suggest it is that one. Agree the acceptance threshold before you start, with the people whose judgement you are encoding. On performance, the context I would add is that these are the gains from targeted tweaks only. Throughout this work the priority was matching the C implementation exactly, and performance work was strictly secondary to that. Which means almost every structural performance opportunity is still available to us, and we have not really started on them. At the scale we process, runtime is directly processing cost, so this is a line item and not just an engineering satisfaction.

Sources: developmentseed/lasrc_rust_presentation (slide 21, "Where we are now", and the "Why this number matters" card and note from slide 23, "Performance, measured by the same run"), verbatim.
-->

---
layout: odsi
routeAlias: lasrc-savings
---

# Cost

## What 30% faster is worth annually

<div class="cols mt-1" style="align-items:center">
<div class="col" style="flex:1.7">
<table>
  <thead><tr><th>Step</th><th>Value</th></tr></thead>
  <tbody>
    <tr><td>2025 EC2 instance compute cost</td><td>$240,404</td></tr>
    <tr><td>LaSRC share of compute, Sentinel-2 / Landsat (measured)</td><td>54.6% / 32.8%</td></tr>
    <tr><td>LaSRC share of all compute, weighted 58% Sentinel-2 granules</td><td>~45%</td></tr>
    <tr><td>Saving if LaSRC runs 30% faster on both sensors</td><td>~$33k</td></tr>
    <tr><td>Saving if only Sentinel-2 benefits</td><td>~$23k</td></tr>
    <tr class="total"><td>Annual EC2 reduction</td><td>~$23–33k</td></tr>
  </tbody>
</table>
</div>
<div class="col">
  <div class="stat"><span class="n">$23–33k</span></div>
  <p style="font-size:.85rem">a year, about <strong>10–14%</strong> of EC2 spend, from targeted tweaks only.</p>
  <p style="font-size:.75rem;color:var(--mute)">EC2 instances time only.  Our upcoming structural performance work will likely reduce this cost significantly more.</p>
</div>
</div>

<!--
What does 30% faster mean in money? HLS spent about $240k on EC2 instances in 2025. We measured how much of each pipeline's runtime is LaSRC: about 55% for Sentinel-2 and about 33% for Landsat. Sentinel-2 is about 58% of granules, so LaSRC is roughly 45% of all compute. Cutting that by 30% saves about 13.6% of the EC2 bill, about $33k a year. If only the Sentinel-2 pipeline benefits, it is about $23k. So about $23 to 33 thousand a year, and that is from targeted tweaks made while the priority was matching C exactly. If someone reads "30% faster" as 1.3 times the throughput rather than 30% less runtime, the range is about $18 to 25 thousand.

Sources: HLS_MCP_costs_breakdown_2025.csv (EC2-Instances $240,404 for 2025); LaSRC compute share measured across HLS pipelines (Sentinel-2 54.6%, n=423,090 of 559,038 pipelines; Landsat 32.8%, n=49,837 of 53,065); 58% Sentinel-2 granule share from docs/superpowers/specs/2026-11-02-hls-efficiencies-deck-design.md; 30% runtime from developmentseed/lasrc_rust_presentation (validation run 2026-09-22).
-->

---
layout: odsi
routeAlias: whats-next
---

# Next Steps

## What is next, in priority order

<div class="lsrc">
<ol class="steps" style="margin-top:.25em">
  <li><strong>GDAS auxiliary data.</strong> The largest rationale for
    undertaking the port was to reduce the effort of switching to GDAS based
    auxiliary data for the HLS low-latency solution. We begin testing and evaluating that code path in this PI.</li>
  <li><strong>Structural refactoring.</strong> The Rust port currently
    mostly mirrors the original ESPA C structure. We will incrementally restructure it to improve maintainability and to make it easier for outside contributors to work on.</li>
  <li><strong>Performance optimization.</strong> Beyond the targeted tweaks already made, there is a large space of changes available to reduce runtime, resource utilization and overall processing cost.</li>
  <li><strong>Collaborative HLS Science + Production team
      evaluation</strong> We'll review the results of all validation suite output with the HLS science team.</li>
  <li><strong>Production deployment</strong> After the finalized Rust port
    has gotten approval from the science team we'll integrate it into
    production.</li>
</ol>
<div class="band" style="margin-top:.55em">For all these steps, the time to
  implement and test is <b>drastically lower than the same work would take
    in the ESPA codebase.</b></div>
</div>

<!--
What happens next, in rough priority order. First and most important, GDAS. The largest single rationale for undertaking this port was to reduce the level of effort involved in switching to GDAS based auxiliary data to support the HLS low latency solution, and we will begin testing and evaluation of that code path in this PI. This is the slide where the whole exercise either pays off or does not, and it is the one I would ask you to hold us to. Second, structural refactoring. The Rust port currently reflects the original ESPA C structure fairly closely, because that is what made equivalence provable. Now that equivalence is established we will incrementally restructure it to improve maintainability and to lower the barrier for other contributors. Third, performance optimisation, which as I said is largely untouched. And the thread running through all three is that the time to implement and test each of them is drastically lower than the same work would take in the ESPA codebase. That reduction is the return on the port, and it is why I would argue the port pays for itself even before the community goal.

Sources: developmentseed/lasrc_rust_presentation (slide 24, "What is next, in priority order"), verbatim.
-->

---
layout: odsi-section
routeAlias: infra
---

# Part two

## Next-generation infrastructure

Converting lessons into efficiency

<!--
Part two is the orchestration layer: the machinery that notices a new Landsat or Sentinel-2 granule, waits for the ancillary data it needs, submits the processing job, watches it, retries it, and records what happened. This part of the system is not glamorous, and it is not where most of the money goes, but it is where most of our operational pain came from and it is the main thing standing between us and an affordable reprocessing campaign. The theme for this section is in the subtitle: we want to pay for processing, not for waiting.

Sources: hls-nextgen-orchestration PR 7 docs/orchestration-design.md.
-->

---
layout: odsi
routeAlias: hurts
---

# Today

## Inefficiency in our current system

<div class="flowdgm mt-1">
  <div class="fbox hot"><b>Step Functions</b><small>Use of repeated polling adds many costly state transitions</small></div>
  <div class="farrow">→</div>
  <div class="fbox"><b>AWS Batch</b><small>One long job per granule: fmask, LaSRC, post-processing, upload</small></div>
  <div class="farrow">→</div>
  <div class="fbox hot"><b>RDS Log Database</b><small>Always running despite spiky load</small></div>
</div>

<div class="grid g2 mt-4" style="gap:.6rem">
  <div class="card"><h3><span class="chip coral">1</span>Granules silently dropped during backfill</h3><p>At massive traffic loads database timeouts caused logging failures leaving granule status untracked.</p></div>
  <div class="card"><h3><span class="chip coral">2</span>Polling cost and rate limits</h3><p>About 113 billed state transitions per granule, and AWS API limits at 10 to 20 thousand concurrent jobs.</p></div>
  <div class="card"><h3><span class="chip coral">3</span>Spot interruption risk for long jobs</h3><p>LaSRC is about 55% of Sentinel-2 compute and a third of Landsat's. An interruption late in a job throws away the most expensive work.</p></div>
  <div class="card"><h3><span class="chip coral">4</span>History pruned away</h3><p>The audit trail that could be leveraged for reprocessing and reconciliation is deleted to keep the database performant.</p></div>
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

## Fully event-driven with S3 as the log database

<div class="flowdgm mt-1">
  <div class="fbox cool"><b>Granule lands</b><small>S3 event with no timer or polling</small></div>
  <div class="farrow">→</div>
  <div class="fbox"><b>Lambda</b><small>Logs it in S3 and checks for ancillary data</small></div>
  <div class="farrow">→</div>
  <div class="fbox"><b>Batch Job on Spot</b><small>Scales to zero</small></div>
  <div class="farrow">→</div>
  <div class="fbox"><b>EventBridge</b><small>Batch Job finished event</small></div>
  <div class="farrow">→</div>
  <div class="fbox"><b>Job monitor</b><small>Reads the outcome</small></div>
  <div class="farrow">→</div>
  <div class="fbox ok"><b>S3 log</b><small>Append-only and does not require pruning</small></div>
</div>

<div class="outcomes">
  <span><b>Ancillary Data Arrival:</b> When new ancillary data arrives an S3
  key search identifies all the granules awaiting processing.</span>
  <span><b>Spot Interruption:</b> retry queue, resubmitted automatically</span>
  <span><b>Unexpected Failure:</b> dead-letter queue, redriven after a fix</span>
</div>

<div class="band mt-4">The core principle - <b>S3 is the event coordination mechanism and the log database.</b> This means no infrastructure runs when events aren't happening.</div>

<!--
The new design turns this around. Nothing runs on a timer. When a granule lands in S3, that event triggers a small Lambda that records it and checks its ancillary data. The job goes to AWS Batch on Spot instances, which scale to zero when idle. When it finishes, a job monitor reads the outcome and writes it to an append-only log in S3. Successes, cloudy and low-sun granules are final states. Spot interruptions are retried automatically. Genuine failures go to a dead-letter queue, so a spike there means something is actually broken. S3 is the event store, the log and the coordination mechanism: no database and no polling. We built the prototype with Claude as a coding assistant.

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
  <thead><tr><th>Annual cost</th><th>Current</th><th>New (fully event-driven)</th></tr></thead>
  <tbody>
    <tr><td>Step Functions</td><td>$15,518</td><td>not used</td></tr>
    <tr><td>RDS database</td><td>$4,375</td><td>not used</td></tr>
    <tr><td>Lambda</td><td>$205</td><td>~$2</td></tr>
    <tr><td>S3 ancillary data checks</td><td>~$60</td><td>~$0</td></tr>
    <tr><td>S3 event store</td><td>not used</td><td>~$180</td></tr>
    <tr><td>SQS and EventBridge</td><td>not used</td><td>~$15</td></tr>
    <tr class="total"><td>Total</td><td>~$20,160</td><td>~$200</td></tr>
  </tbody>
</table>
</div>
<div class="col">
  <div class="stat"><span class="n">~100×</span></div>
  <p style="font-size:.85rem">cheaper to orchestrate the same 15,000 granules a day.</p>
  <p style="font-size:.75rem;color:var(--mute)">2025 bill: Step Functions plus RDS came to about $20.7k which is in line with the model projections.</p>
</div>
</div>

<!--
Here it is in dollars. The current system spends about $15,518 a year on Step Functions and $4,375 on the database, plus small amounts on Lambda and S3 polling: about $20,160 in total. The new design spends about $180 a year storing its log in S3 and about $15 on queues and events, roughly $200. That is about a hundred times cheaper for the same 15,000 granules a day. These are modeled figures; on the 2025 bill, Step Functions and the database together came to about $20.7k, in line with the model. Twenty thousand dollars is not our biggest line. The bigger prize is reprocessing, two slides from now.

Sources: hls-nextgen-orchestration docs/cost-analysis.md (Scheduled/Poll vs Event-Driven comparison); HLS_MCP_costs_breakdown_2025.csv (Step Functions $12,408, RDS $8,266).
-->

---
layout: odsi
routeAlias: polling
---

# In detail

## Paying for polling

<div class="mt-3">
  <div class="hbar"><span class="lab">Actual state changes in a job's life</span><div class="bar good" style="--w:10.6%">12</div></div>
  <div class="hbar"><span class="lab">State transitions billed per granule due to polling</span><div class="bar" style="--w:100%">113</div></div>
</div>

<div class="cols mt-4">
<div class="col">

A 20 to 30 minute job is polled every 30 to 60 seconds. Every poll is a **wait,
a Lambda call and a decision**, and each one is billed as a state transition.
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

<p style="margin-top:0">Orchestration cost to reprocess the full archive <strong>~30M granules</strong> (for example, HLS v3):</p>

<div class="mt-2">
  <div class="hbar"><span class="lab">Current, at the full production rate</span><div class="bar" style="--w:100%">$85k</div></div>
  <div class="hbar"><span class="lab">Current, ancillary data already available</span><div class="bar mid" style="--w:65%">$55k</div></div>
  <div class="hbar"><span class="lab">New, event-driven</span><div class="bar good" style="--w:4.8%">~$4.1k</div></div>
</div>

<div class="cols mt-3">
<div class="col"><div class="band" style="margin:0">From <b>$55–85k</b> to <b>about $4.1k</b> with only SPOT market availability as a limit on how quickly the campaign can be completed.</div></div>
<div class="col">
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
  <div class="card"><h3><span class="chip teal">?</span>Internal reconciliation - Did every product reach LP DAAC?</h3><p>We will now have a complete processing log we can use for reconciliation.</p></div>
  <div class="card"><h3><span class="chip teal">?</span>External reconciliation - Did we attempt every granule ESA and USGS published?</h3><p>Compare our full input log against their inventories.</p></div>
  <div class="card"><h3><span class="chip teal">?</span>Full history - What happened on each processing attempt?</h3><p>Our current log system only records the most recent attempt and failure.</p></div>
</div>

<div class="band mt-4">The full history is kept <b>indefinitely, for about $180 (increasing slightly annually) a year</b>. No database to prune, no extra service to run.</div>

<!--
Lower cost is only half of it. Because every state change is written to a log in S3 and never deleted, we can answer questions that today we simply cannot. Did every product we made reach LP DAAC? Did we at least attempt every granule that ESA and USGS published? How much of the archive is screened out as cloudy or low sun, as opposed to genuinely failing? What fails, how often, and does a retry fix it? Each of these becomes a query with Athena over S3, rather than a manual investigation. And the full history is kept indefinitely for about $180 a year, because S3 storage is cheap and there is no database to prune.

Sources: hls-nextgen-orchestration PR 7 docs/orchestration-design.md (Analytics: Athena over S3 Inventory, reconciliation queries); docs/cost-analysis.md (S3 event store about $180/year).
-->

---
layout: odsi
routeAlias: phased
---

# Rollout

## Tested on new solutions.

<div class="cols mt-1">
<div class="col" style="flex:.9">
  <div class="card" style="border-left:4px solid var(--green)">
    <h3><span class="chip green">✓</span>Already proven</h3>
    <p style="margin-bottom:.4rem!important">The HLS-VI historical backfill processed <strong>~30M granules</strong> using this event log pattern.</p>
    <p>The log never needed pruning, retries handled Spot interruptions cleanly, and weekly progress reports were generated with a single query.</p>
  </div>
</div>
<div class="col">
<ol class="steps" style="counter-reset: step -1">
  <li><strong>Phase 0, Shadow.</strong> The new job monitor watches the current system read-only. No changes to existing system but valid log information is produced.</li>
  <li><strong>Phase 1, Fully event-driven.</strong> Retire Step Functions polling and the database.</li>
  <li><strong>Phase 2, Split jobs.</strong> Fmask first so that high cloud granules exit early reducing full SPOT interruptions</li>
  <li><strong>Phase 3, Reconcile.</strong> Build new internal and external reconciliation systems from the structured logs.</li>
</ol>
</div>
</div>

<!--
This is not a leap of faith. The same pattern already ran the HLS vegetation index historical backfill, about 30 million granules. The log never needed pruning, the retry design handled Spot interruptions cleanly, and when a bug fix caused unexpected failures we resubmitted every affected granule with a single query. Weekly progress reporting was a query too. We are rolling it out to HLS production in phases. Phase 0 runs the new job monitor in shadow mode alongside the current system, read-only, so we get real production data with zero risk. Phase 1 switches to event-driven orchestration and retires the polling and the database. Phase 2 splits jobs so fmask runs first. Phase 3 uses the log to reconcile the archive and drive reprocessing.

Sources: hls-nextgen-orchestration PR 7 docs/orchestration-design.md (Prototype Validation, Implementation Sequencing).
-->

---
layout: odsi
routeAlias: composites
---

# Reuse

## The BDEC Monthly Composites Use The Same Infrastructure

<p style="font-size:.95rem;max-width:94%">HLS orchestration has two parts: <strong>submitting units of work</strong> and <strong>logging job outcomes</strong>. We built the logging portion, improved it and reused it.</p>

<div class="flowdgm mt-3">
  <div class="fbox"><b>HLS-VI</b><small>Utilized the next generation watch AWS Batch job state change events</small></div>
  <div class="farrow">→</div>
  <div class="fbox"><b>HLS-VI historical backfill</b><small>Incrementally improved the design based on large scale use.</small></div>
  <div class="farrow">→</div>
  <div class="fbox cool"><b>Packaged the logging components as a reusable library</b></div>
  <div class="farrow">→</div>
  <div class="fbox ok"><b>HLS monthly composites (BDEC)</b><small>Reused the library and the VI backfill's submission approach</small></div>
  <div class="farrow">→</div>
  <div class="fbox ok"><b>HLS production, in shadow</b><small>Proving scale, cost and data collection without disrupting the current system</small></div>
</div>

<div class="band mt-4">Iterating across HLS-related SNWG solutions <b>solved half the puzzle of next-generation HLS orchestration</b> while simultaneously reducing the work needed to produce derived HLS products.</div>

<!--
One more piece of evidence that this design is real and not just a proposal. HLS orchestration has two parts: submitting units of work, and logging what happened to each job. We designed a new approach to the logging half, watching AWS Batch job state change events, and first built it for the HLS vegetation index solution. Running the HLS-VI historical backfill taught us a lot, we improved the design, and we turned it into a reusable job monitoring library on GitHub. So when it came time to produce the HLS monthly composites, the BDEC products, we simply reused that library and followed the same job submission approach as the backfill. We are now also running it against main HLS production as a shadow to the original system, which lets us prove scaling, cost reduction and better data collection without disrupting anything. The point for this audience is that iterating on one technology across related solutions solved half of our next-generation orchestration, and made each new derived product cheaper to build.

Sources: Chris Holden, notes on HLS orchestration reuse (HLS-VI, HLS-VI historical backfill, HLS monthly composites, shadow monitoring), November 2026.
-->

---
layout: odsi-section
routeAlias: snwg
---

# Part three

## Applying these lessons to other SNWG solutions

How can we generalize what we've learned producing HLS, HLS-VI and HLS BDEC
Composites to support the rest of the SNWG ecosystem.

<!--
That is the HLS story. For the last part I want to turn it around, because the reason we are in this room is not to show off HLS. It is that I suspect many of your solutions are paying for the same problems we were. I want to be careful here. Everything in this section comes from public code and documentation, it describes patterns rather than any one team, and I am not going to name anyone. If something sounds familiar, that is the point, and we would love to talk about it.

Sources: docs/research/snwg-solutions.md.
-->

---
layout: odsi
routeAlias: savings-summary
---

# Savings gains

## What we will save and what we can share

<div class="cols mt-1">
<div class="col" style="flex:1.25">
<table>
  <thead><tr><th>Improvement</th><th>Annual saving</th></tr></thead>
  <tbody>
    <tr><td>Rust LaSRC, 30% faster (EC2, projected)</td><td>~$23–33k</td></tr>
    <tr><td>Nextgen orchestration, $20,160 to ~$200 (modeled)</td><td>~$20k</td></tr>
    <tr class="total"><td>Combined</td><td>~$43–53k</td></tr>
  </tbody>
</table>
<p style="font-size:.78rem;margin-top:.6rem!important">About <strong>10–12%</strong> of the 2025 AWS bill, before further LaSRC optimization.</p>
</div>
<div class="col">
  <div class="card">
    <h3><span class="chip teal">→</span>What we can share</h3>
    <ul style="margin:.3rem 0 0;padding-left:1.1rem">
      <li style="font-size:.8rem"><strong>Validation first modernization</strong> a reference output and validation suite allow agents to port</li>
      <li style="font-size:.8rem"><strong>Our job monitoring library</strong> fully event-driven with S3 as the log.  Already demonstrated reuse for HLS-VI and the BDEC composites</li>
      <li style="font-size:.8rem"><strong>Cost models:</strong> cost per granule, and reprocessing costed before it runs</li>
    </ul>
  </div>
</div>
</div>

<div class="band mt-3">These savings came from general approaches, not HLS-specific tricks. <b>We want to assist other SNWG solutions to apply them.</b></div>

<!--
Before we look outward, here is what the two pieces of work add up to. The Rust LaSRC port is about 30% faster, which on 2025 EC2 spend is worth about $23 to 33 thousand a year. The next-generation orchestration is modeled to take orchestration from about $20,160 a year to about $200, so about $20 thousand a year. Together that is roughly $43 to 53 thousand a year, about 10 to 12 percent of our 2025 AWS bill, and the LaSRC number is before any structural performance work. Separately, the orchestration overhead of a full reprocessing campaign drops from $55 to 85 thousand to about $4.1 thousand; that is overhead only, the compute for a reprocessing is much larger and separate. The more important point is on the right. None of this depended on anything unique to HLS. It came from three approaches: modernize legacy code with a validation suite as ground truth and agents doing the porting; an event-driven job monitor with S3 as the log, which we have already reused for HLS-VI and the monthly composites; and cost models that tell you what a granule or a campaign costs before you commit. We would like to help other SNWG solutions do the same, and the rest of this section is about where to look.

Sources: slide 24 (LaSRC EC2 saving, HLS_MCP_costs_breakdown_2025.csv EC2-Instances $240,404); hls-nextgen-orchestration PR 7 docs/cost-analysis.md (orchestration $20,160 to ~$200 a year; reprocessing orchestration $55–85k to ~$4.1k); 2025 gross AWS bill $452,535; slide 34 (library reuse).
-->

---
layout: odsi
routeAlias: patterns
---

# Across solutions

## Patterns we see

<div class="pairs mt-1">
  <div class="head">What we see</div><div></div><div class="head">What we learned</div>
  <div class="pat"><b>Whole granules copied</b> to local disk, sometimes more than once (sometimes this is the most optimal pattern)</div><div class="arr">→</div><div class="les"><b>Read only the bytes you need</b>, straight from cloud-optimized sources</div>
  <div class="pat"><b>Loss of work </b> due to SPOT interruption of multi-step jobs</div><div class="arr">→</div><div class="les"><b>Split jobs</b> so a Spot interruption costs minutes, not hours</div>
  <div class="pat"><b>Always running servers and databases</b>, paid for while idle</div><div class="arr">→</div><div class="les"><b>Use pure event-driven and scale to zero</b>: pay only when something arrives</div>
  <div class="pat"><b>Legacy Fortran or C</b> wrapped in layers of Python</div><div class="arr">→</div><div class="les"><b>Build a robust validation suite and port with agents</b></div>
  <div class="pat"><b>Homemade audit scripts</b> to check what was produced</div><div class="arr">→</div><div class="les"><b>An append-only log</b> you can query</div>
  <div class="pat"><b>Reprocessing with no cost estimate</b> up front</div><div class="arr">→</div><div class="les"><b>Model the cost</b> before you run the campaign</div>
</div>

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
  <li>Do you know your <strong>average infrastructure cost per granule</strong> and what a full archive reprocessing would cost?</li>
  <li>Are you paying for anything idle <strong>while nothing is processing</strong>?</li>
  <li>Do you rely on polling less stable systems like <strong>CMR</strong> rather than relying on events?</li>
</ul>
</div>
<div class="col">
<ul class="checklist">
  <li>Would a <strong>Spot interruption</strong> waste an hour of work?</li>
  <li>If a granule failed to process last month, could you <strong>determine this with a single query</strong>?</li>
  <li>Could you update your science code tomorrow and <strong>validate that the output was the same</strong>?</li>
</ul>
</div>
</div>

<div class="band mt-4">If you answered "no" or "not sure" to any of these, <b>we have been there</b>, and we would be excited to compare notes and lessons learned.</div>

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
<div class="col"><p style="font-size:.9rem;margin:0">When HLS gets <strong>faster, cheaper and more reliable</strong> all downstream products benefit. Lower HLS latency is lower latency for them.</p></div>
<div class="col"><div class="band" style="margin:0">Newer solutions, such as <b>GABAN</b> and <b>MWOW</b>, can leverage these patterns in <b>from the start</b> rather than retrofit them later as we had to.</div></div>
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


<div class="ask"><div class="num">1</div><div><h3>Measure first</h3><p>Determine your average cost per granule. You cannot reduce what you have not measured.</p></div></div>
<div class="ask"><div class="num">2</div><div><h3>Pay for events, not for polling </h3><p>For HLS, orchestration infrastructure cost is modeled to fall from about $20,160 to about $200 a year, and reprocessing from $55–85k to about $4.1k.</p></div></div>
<div class="ask"><div class="num">3</div><div><h3>Legacy science code is now affordable to modernize</h3><p>AI agents made an intractable problem practical, but only because a validation suite proved the results.</p></div></div>
<div class="ask"><div class="num">4</div><div><h3>Talk to us</h3><p>We want to share our designs, cost models and validation tooling so all SNWG solution teams can leverage them.</p>
</div></div>

<!--
Four things to take away. First, measure. Know your cost per granule, because you cannot reduce what you have not measured. Second, pay for events, not for waiting: for HLS our cost model takes orchestration from about $20,160 a year to about $200, and a full reprocessing from $55–85k to about $4.1k. Those are modeled figures; the rollout is under way. Third, legacy science code is now affordable to modernize. AI agents turned a five to six month port into something we could actually prioritize, but only because we had a validation suite that proved every result; the agents supplied speed, the suite supplied trust. And fourth, talk to us. Everything in this talk, the designs, the cost models and the validation tooling, we are happy to share, and we would genuinely like to help other teams avoid the problems we spent six years learning about. Thank you.

Sources: summary of slides 15, 20, 22 and 13 to 14.
-->
