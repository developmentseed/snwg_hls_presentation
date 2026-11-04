# Finding Efficiencies In HLS Production

### Background
- The HLS v2.0 global pipeline has been operating continuously since 2020.
- Over this period, architectural approaches have changed.
- We've learned significant lessons about operating production infrastructure at
  scale.
- The new requirements for the HLS low-latency solution have provided and
  opportunity for us to rethink and re-architect the technical processes we use.

### Our Goals
- Beyond the immediate need to support the new low-latency targets we identified
  other problem areas we wanted to improve.
- Reducing development and maintenance risk by improving core scientific code.
- Reducing production infrastructure costs to their theoretical minimum limit. 
- Removing scalability bottlenecks that would limit a reprocessing campaign. 
- Improving operational observability and reporting.

### Modernizing LaSRC

- For this section you can review, reuse and condense the slides from
  https://github.com/developmentseed/lasrc_rust_presentation into this new slide
  format.

### Next Generation Infrastructure

We've created very detailed architectural review and a proposed next generation architecture that we're currently piloting and developing for the HLS production system at https://github.com/NASA-IMPACT/hls-nextgen-orchestration/pull/7/changes.  You can review, condense and summarize the problematic areas with our existing architecture and how our new designs address them.

We also have a detailed cost analysis of our existing system vs the newly
proposed system at
https://github.com/NASA-IMPACT/hls-nextgen-orchestration/blob/main/docs/cost-analysis.md.
Please summarize and show the comparisons for these models with detailed tables
and projections.

### Applying these principles to other SNWG solutions

Our goal with this presentation is to highlight some of the areas we've worked
on to demonstrate the cost savings and efficiencies we're realizing with the
hope that other SNWG solutions can apply similar approaches and that we can help
them improve their architectural and process approaches with some of the hard
lessons we've learned.

If possible, you can review
https://www.earthdata.nasa.gov/data/projects/nsite/solutions and try to search
for more detailed code and links around these solutions to make assessments and
    recommendations about how their architecture might be improved.
