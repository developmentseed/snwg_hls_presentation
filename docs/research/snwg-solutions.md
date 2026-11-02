# SNWG solutions: architecture research notes (2026-11-02)

These are background notes for slides 20–22. Sources are public. **Do not put
solution names next to patterns on slides.** This file is the place to look
them up if someone asks.

Confidence levels:
- **documented**: seen in code or config, or stated in a source.
- **inferred**: our reading of the evidence.

## Solutions list

The list is at https://www.earthdata.nasa.gov/data/projects/nsite/solutions:
24 solutions plus 8 CSDA commercial-data activities.
- Public pipeline code was found only for OPERA and HLS.
- No solution publishes a cost per product.

## Patterns

### 1. Whole granules copied, sometimes more than once

Confidence: documented (OPERA, NISAR); inferred elsewhere.

- OPERA downloads inputs over HTTPS, then re-uploads them to its own S3
  bucket:
  https://github.com/nasa/opera-sds-pcm/tree/develop/data_subscriber
  (`asf_rtc_download.py`)
- NISAR (GSAW 2020) lists more than 2 PB of scratch disk across about 8,300
  nodes. Its own example has download taking longer than processing (1.5 h
  against 1 h):
  https://gsaw.org/wp-content/uploads/2020/10/2020s12a_hua.pdf

### 2. Long single-step jobs on on-demand instances

Confidence: documented (OPERA config).

- Worker groups default to Spot.
- Long time-series jobs (DISP-S1, DIST-S1, DISP-NI) set
  `use_on_demand = true`. A `large_job_retry` group re-runs failed jobs on
  bigger instances.
- Source:
  https://github.com/nasa/opera-sds-pcm/blob/develop/cluster_provisioning/modules/common/variables.tf
  and `asg.tf`.

### 3. Always-on control layer, sometimes two orchestrators

Confidence: documented that it exists; cost inferred.

- HySDS runs permanent Mozart, GRQ, metrics and factotum servers (r6i
  instances), plus Elasticsearch and Jenkins.
- Since August 2025, Airflow on EKS with Karpenter has been added alongside.
- Sources: `opera-sds-pcm` `cluster_provisioning/ops/variables.tf`,
  `airflow/terraform/cloud/karpenter/main.tf`.

### 4. Legacy compiled science code in Python wrapper layers

Confidence: documented for languages; cost inferred.

- Fortran:
  - ICESat-2:
    https://nsidc.org/sites/default/files/documents/technical-reference/icesat2_atl12_atbd_v007.pdf
  - GEOS-Chem: https://github.com/geoschem/geos-chem
- TEMPO uses OMI-heritage algorithms.
- C: HLS, and the OB.DAAC tools.
- OPERA uses a wrapper container per science container
  (https://github.com/nasa/opera-sds-pge).
- NISAR's 2022 lessons: design the algorithm for the compute it runs on.
  https://www.earthdata.nasa.gov/s3fs-public/2022-02/NISAR_ProcessingSystems_Hua.pdf

### 5. Production off-cloud, then pushed in

Confidence: documented location; effects inferred.

- TEMPO is processed at SAO and pushed to Cumulus:
  https://asdc.larc.nasa.gov/documents/tempo/guide/TEMPO_NRT_user_guide_supplement_V1.0.pdf
- GEOS-CR runs on Discover.
- LANCE and ICESat-2 run on GSFC systems.
- NASA OIG on egress cost models: https://oig.nasa.gov/docs/IG-20-011.pdf

### 6. Homemade accountability tooling

Confidence: medium (OPERA only).

- Cron jobs for CMR audit, duplicates and accountability:
  `opera-sds-pcm` `tools/ops/cmr_audit`, `pcm_audit`,
  `duplicates/duplicate_and_accountability_cron.py`.

### 7. Reprocessing with no published cost

Confidence: documented for NISAR; inferred broadly.

- A 2018 HySDS scale test estimated about $110K/day at its 5× peak:
  https://hysds-core.atlassian.net/wiki/spaces/HYS/pages/199787394
- NISAR's 2022 deck says systematic processing may be costly.

## Solutions downstream of HLS (slide 22)

- OPERA DSWx-HLS and DIST-HLS consume HLS. `opera-sds-pcm` has an HLS
  subscriber and an `hls_audit` tool.
- FIRMS-2G burned area uses HLS-VI:
  https://www.earthdata.nasa.gov/data/projects/nsite/solutions/firms-2g
- HLS-LST builds on HLS:
  https://www.earthdata.nasa.gov/data/projects/nsite/solutions/harmonized-lst

## Solutions with no public pipeline code (likely early stage)

- MWOW (V0 bulk ingest, January 2026)
- GABAN (prototype due 2027)
- Merged PBL
- HLS-LST
- FIRMS-2G
- SatCORPS v2

Note: one older listing page gives GABAN the description that belongs to
SatCORPS, so the source pages are not fully reliable.
