---
doc_id: SOP-INT-010
doc_type: procedure
well_id: null
field: null
date: 2026-05-11
title: "SOP-INT-010 Well Integrity: Annulus Pressure Management"
---

# SOP-INT-010 Well Integrity: Annulus Pressure Management

| Field | Value |
|---|---|
| Procedure ID | SOP-INT-010 |
| Revision date | 2026-05-11 |
| Applies to | All three fields: Dune Field, Wadi Field and Salt Flat Field |
| Owner | Integrity Engineer |
| Reviewed by | Production Supervisor, HSE Advisor |

## Purpose and scope

This procedure sets out how annulus pressures are monitored, tested and managed on all wells in Dune Field, Wadi Field and Salt Flat Field, so that loss of barrier integrity is detected early and handled consistently.

It covers producing wells (ESP, gas lift and natural flow), shut-in wells and suspended wells that still have a wellhead pressure gauge or access to the annulus valves. It applies to wells under workover only until the rig contractor takes over well control, after which the workover programme governs.

Responsibilities:
- Lead Operator: takes readings, performs bleed-down tests under permit, records results, escalates any limit exceedance.
- Production Engineer: reviews trends, decides on additional testing, recommends shut-in.
- Integrity Engineer: owns the allowed pressure table, approves diagnostics and repair plans, maintains the well integrity register.
- Production Supervisor: authorises shut-in and return to production.
- HSE Advisor: confirms permit conditions and gas release controls for all bleed-down work.

## Annulus naming and allowed operating pressures

Annuli are named from the tubing outward:

- **A annulus:** between production tubing and production casing.
- **B annulus:** between production casing and intermediate casing.
- **C annulus:** between intermediate casing and surface casing, where fitted.

Gas lift wells use the A annulus as the lift gas conduit. For these wells the A annulus pressure is an operating parameter set by the lift design, and the limits below apply to the B and C annuli, plus the A annulus limits stated in the lift design for that well.

Default allowed operating pressures, to be used unless the Integrity Engineer has issued a well-specific limit in the integrity register:

| Annulus | Normal range (psi) | Alert level (psi) | Maximum allowable (psi) |
|---|---|---|---|
| A (ESP and natural flow wells) | 0 to 300 | above 300 | 700 |
| B | 0 to 100 | above 100 | 350 |
| C | 0 to 50 | above 50 | 150 |

Notes:
1. The maximum allowable pressure is never to be exceeded. A reading at or above the maximum triggers the shut-in criteria in the section below without further discussion.
2. Well-specific limits may be lower than the defaults, for example for wells with older casing or known corrosion. The lower value always applies.
3. Thermal expansion can raise annulus pressure after a restart. Pressure that rises during warm-up and falls back during cool-down is recorded as thermal, but the first occurrence on any well still requires a bleed-down test.

## Monitoring frequency

Readings are taken from calibrated gauges on each annulus. Gauges are checked against a reference gauge at least once a year, and any gauge that is stuck, damaged or reads off zero when vented is replaced before the next reading round.

| Well condition | Frequency |
|---|---|
| Producing, all annuli in normal range | Once per day, during the day shift round |
| Any annulus above alert level | Every shift (twice per day minimum), plus trend review by the Production Engineer |
| Recently restarted well (first 7 days) | Every shift |
| Shut-in or suspended well with gauge access | Once per week |
| Well with confirmed sustained annulus pressure under monitoring | Every shift, plus a daily plot of pressure against time |

The Lead Operator records the tubing pressure, flowing line pressure and each annulus pressure at the same time so that changes can be correlated. Any reading that rises by more than 50 psi in 24 hours on any annulus, even inside the normal range, is reported to the Production Engineer the same day.

## Bleed-down test

A bleed-down test is performed when:
- an annulus reaches the alert level;
- an annulus pressure rises unexpectedly, as defined in the monitoring section;
- the first pressure is observed after a restart or workover;
- the Integrity Engineer requests a test as part of a periodic review.

Preconditions:
- Valid work permit, with the HSE Advisor confirming gas release controls and the vent or flare route.
- Test is not carried out during an active process upset at CPF-1.
- Annulus valves have been function tested and their condition noted.

Steps:
1. Record the starting pressure on the annulus under test, plus tubing pressure and the other annuli.
2. Connect the bleed line to a measured vessel or a closed vent route. Do not vent to open atmosphere.
3. Open the bleed valve slowly and reduce the pressure in steps. Aim to reach 0 psi, or the lowest reachable pressure, in no more than 30 minutes.
4. Record the volume and nature of the fluid returned (gas only, oil, water, or mixed). Take a sample if liquid is produced and the Production Engineer has requested it.
5. Close the bleed valve and monitor the pressure build-up. Record the pressure at 5, 15, 30 and 60 minutes, then at 6 and 24 hours.
6. Compare the result with the criteria below:
   - **Bleeds to zero and stays near zero (less than 10 psi after 24 hours):** the pressure was thermal or trapped. Record and return to normal monitoring.
   - **Bleeds to zero but rebuilds to more than 10 psi within 24 hours:** treat as a rebuild, repeat the test after 7 days, and move to every-shift monitoring.
   - **Cannot be bled to zero, or rebuilds to the original value within 24 hours:** treat as sustained annulus pressure and apply the next section.
7. Sign the test sheet. The Lead Operator and the Production Engineer both initial the result.

Stop the test at once and close the bleed valve if liquid hydrocarbon is returned in volume, if H2S is detected above the site alarm level, or if the pressure does not fall in a controlled way.

## Sustained annulus pressure: shut-in criteria

Sustained annulus pressure (SAP) is pressure that is not thermally induced, is not caused by an applied operating pressure such as gas lift, and rebuilds after bleed-down.

A well must be shut in, with the Production Supervisor's authorisation, when any of the following applies:

1. Any annulus reaches or exceeds its maximum allowable pressure.
2. An annulus rebuilds to its alert level in less than 24 hours after a bleed-down, and the returned fluid is liquid hydrocarbon.
3. Pressure on the B or C annulus matches tubing pressure within 10 percent, which suggests direct communication.
4. Annulus pressure is rising and the Production Engineer judges that the maximum allowable will be reached before a repair can be scheduled.
5. Visible leak at an annulus valve, wellhead seal or casing head that cannot be isolated.
6. H2S is detected at a bleed or vent point above the site alarm level.

A well may stay on production under a documented risk assessment when SAP is present but below the maximum allowable, the rebuild rate is low and steady, and the returned fluid is gas only. Conditions:
- Signed assessment by the Integrity Engineer and the Production Supervisor.
- Monitoring every shift with a daily plot.
- A defined review date, no more than 30 days ahead.
- A stated pressure at which the well will be shut in, never above 80 percent of the maximum allowable.

After shut-in, the Lead Operator isolates the annulus valves, confirms the gauge readings, and informs the Production Engineer and HSE Advisor. The well may not be returned to production until the Integrity Engineer has approved the diagnostic result or repair.

## Diagnostics and repair options

Diagnostics, in rising order of cost and complexity:

1. **Gauge and valve checks:** verify gauge calibration, check for valve passing, grease or replace annulus valves.
2. **Repeat bleed-down with sampling:** analyse gas composition and fluid type to indicate the source (production gas, lift gas, formation fluid or injected fluid).
3. **Pressure build-up analysis:** the Production Engineer fits the rebuild curve to estimate leak rate and judge whether the source is tubing, casing or wellhead.
4. **Tubing integrity test:** pressure test the tubing against the A annulus using the slickline unit or surface pump, to confirm or rule out a tubing leak.
5. **Casing and wellhead seal test:** pressure test the casing head, hanger seals and tubing hanger neck seals.
6. **Logging:** temperature, noise or multi-finger caliper logging, planned by the Integrity Engineer, to locate the leak depth or corrosion.

Repair options, chosen by the Integrity Engineer with the Production Engineer and approved by the Production Supervisor:

- Replace or repair annulus valves, seal injection of the valve or hanger seals.
- Slickline work: set a plug or replace a gas lift valve or a leaking tubing component, where applicable.
- Workover to replace tubing, packer or ESP completion components, run by the rig contractor under the Workover Supervisor.
- Casing repair, patch or cement squeeze, scoped as a workover.
- Permanent suspension or abandonment, if repair is not economic or the well cannot be made safe.

Each repair plan includes the barrier philosophy used during the work, the permits required and the acceptance test (a pressure test or a repeat bleed-down with 24 hours of monitoring) to be passed before return to production.

## Records

The following are kept in the well integrity register and the daily report system:

- Daily and per-shift annulus pressure readings, by well and annulus.
- Bleed-down test sheets, with starting pressure, volumes, fluid type, build-up readings and the signatures of the Lead Operator and Production Engineer.
- Risk assessments for any well kept on production with SAP, with review dates.
- Shut-in authorisations and return-to-production approvals.
- Diagnostic reports, repair plans and acceptance test results.
- Gauge calibration records and any well-specific pressure limits issued by the Integrity Engineer.

Records are retained for the life of the well plus the period set by the company records policy. The Integrity Engineer reviews the register monthly and reports wells with alert level or SAP status to the Production Supervisor at the monthly integrity meeting. This procedure is reviewed every two years, or earlier after any incident involving loss of annulus integrity.
