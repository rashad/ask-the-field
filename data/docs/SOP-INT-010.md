---
doc_id: SOP-INT-010
doc_type: procedure
well_id: null
field: null
date: 2026-05-11
title: "SOP-INT-010 Well Integrity: Annulus Pressure Management"
---

# SOP-INT-010 Well Integrity: Annulus Pressure Management

| Field | Entry |
|---|---|
| Procedure ID | SOP-INT-010 |
| Title | Well Integrity: Annulus Pressure Management |
| Revision date | 2026-05-11 |
| Applies to | All three fields: Field A, Field B and Bayda |
| Owner | Integrity Engineer |
| Reviewers | Production Supervisor, Production Engineer, HSE Advisor |

## Purpose and scope

This procedure sets out how annulus pressure is monitored, tested, interpreted and acted on for all wells feeding CPF-1. Its aim is to detect loss of barrier integrity early, keep every well within its approved operating envelope, and define when a well must be shut in.

It applies to all producing, shut-in and suspended wells in Field A, Field B and Bayda, whatever the lift method (ESP, gas lift or natural flow) and well geometry (vertical, deviated or horizontal). Wells under workover follow the workover program, but the annulus readings in this procedure still apply once the wellhead is re-instrumented.

Responsibilities:
- Lead Operator: takes readings, performs bleed-down tests, reports anomalies.
- Night Lead Operator: same duties on night shift and hands over open items.
- Production Engineer: reviews trends, assesses causes and recommends actions.
- Integrity Engineer: owns the limits, approves any deviation and signs off return to service.
- HSE Advisor: confirms safe work practices for bleed-downs and repairs.
- Production Supervisor: authorizes shut-in and restart.

## Annulus naming and allowed operating pressures

Annuli are named from the production tubing outward:

- **A annulus**: between production tubing and production casing.
- **B annulus**: between production casing and intermediate casing.
- **C annulus**: between intermediate casing and surface casing, where fitted.

Gas lift wells use the A annulus as the injection conduit. Its pressure is an operating variable and is judged against the gas lift design pressure, not against the limits below. Any unexplained A annulus change on a gas lift well that does not follow injection rate changes is still treated as an anomaly.

Each well has a Maximum Allowable Annulus Surface Pressure (MAASP) calculated by the Integrity Engineer from the weakest of casing burst (derated for wear), formation breakdown at the shoe and wellhead rating. MAASP is recorded on the well integrity sheet at the wellhead. The default operating thresholds are:

| Annulus | Normal operating range | Alert level | Action level |
|---|---|---|---|
| A (non-gas-lift) | 0 to 300 psi | above 300 psi | above 50 percent of MAASP |
| B | 0 to 100 psi | above 100 psi | above 20 percent of MAASP |
| C | 0 to 50 psi | above 50 psi | above 10 percent of MAASP |

If a well-specific limit on the integrity sheet is lower than a default above, the lower value applies. No annulus may be allowed to exceed 80 percent of its MAASP at any time. Reaching that value requires immediate shut-in under the criteria below.

## Monitoring frequency

Gauges are read and logged as follows:

1. Producing wells: every annulus read once per day at the day shift round, at a similar time each day so that thermal effects are comparable.
2. Wells with a standing alert: read every shift (twice daily) until the cause is explained and the Integrity Engineer lifts the alert.
3. Wells with an action-level reading: read every 4 hours by the Lead Operator or Night Lead Operator until shut in or cleared.
4. Shut-in and suspended wells: read once per week, as trapped pressure can still build through a leaking barrier.
5. Wells after a workover, restart or choke change: read at 1 hour, 4 hours and 24 hours after the event, then return to the normal frequency.

Gauges are checked against a calibrated test gauge at least once every 6 months. A gauge that sticks, drifts or reads exactly the same for more than 14 days on an active well is suspect and is replaced or verified before its reading is relied upon.

Operators must record the tubing head pressure, flowing status and ambient conditions (day or night, hot or cool) next to each annulus reading.

## Bleed-down test

A bleed-down test is performed when any annulus reaches alert level, when a reading rises without explanation, or when requested by the Integrity Engineer. It must be authorized by the Production Supervisor and the HSE Advisor must confirm the area is safe.

Steps:

1. Record the starting pressure on all annuli, the tubing head pressure and the flowing status.
2. Connect a bleed line to the tested annulus needle valve, routed to a closed vent or to a calibrated vessel. Gas must not be vented to atmosphere in the work area. Check for H2S with a portable detector before opening the valve.
3. Open the needle valve slowly and bleed the pressure down in stages. Do not exceed a rate of 100 psi per minute.
4. Capture fluid type. If liquid is produced, collect the volume in the calibrated vessel and note whether it is oil, water or completion fluid. Take a sample if possible.
5. Bleed to zero or to the lowest pressure the system will reach, then close the valve and hold for 15 minutes with the gauge observed continuously.
6. Record the pressure at 15 minutes, then at 1 hour and 24 hours after the test.
7. Classify the result:
   - **Thermal**: pressure drops to zero without liquid and does not return beyond 10 percent of the starting value within 24 hours.
   - **Bleed-down to zero, slow build**: returns to zero when bled, but rebuilds to alert level in under 24 hours. Treat as suspect and escalate.
   - **Sustained**: pressure does not bleed to zero, or builds back to more than 50 percent of the starting value within 24 hours. Apply the shut-in criteria.
8. Report the classification to the Production Engineer and the Integrity Engineer before the end of the shift.

Never perform a bleed-down on two annuli of the same well at once. Do not bleed a B or C annulus if liquid is expected until the Integrity Engineer has agreed the disposal route.

## Sustained annulus pressure: shut-in criteria

Sustained annulus pressure is pressure that rebuilds after bleed-down and is not caused by temperature changes or by operator-applied pressure such as gas lift injection. The Production Supervisor must shut in the well, on recommendation of the Integrity Engineer or on their own authority if the Integrity Engineer cannot be reached, when any of the following apply:

1. Any annulus exceeds 80 percent of its MAASP.
2. Any annulus exceeds its action level and rebuilds to that level within 24 hours of a bleed-down.
3. Pressure appears on an annulus that was previously zero and cannot be tied to a thermal or operational cause within 24 hours.
4. Hydrocarbon liquid, or produced-type water at a rate that cannot be controlled, comes from an annulus.
5. H2S is detected at the annulus bleed point above the site alarm threshold.
6. Visible leak, seep or corrosion at wellhead seals, valves or casing hanger.
7. Tubing and annulus pressures equalize in a way that indicates a tubing or packer leak on a well with no known communication.

When a well is shut in under this section:

- Shut in in the normal sequence and isolate at the master valve and wing valve.
- Tag the wellhead with the shut-in reason and date.
- Notify the Production Supervisor, Production Engineer, Integrity Engineer and HSE Advisor.
- Raise an incident note if there is any release, or if the criteria 1, 4 or 5 applied.
- Do not restart without written approval from the Integrity Engineer.

## Diagnostics and repair options

The Integrity Engineer and Production Engineer select diagnostics in this order, moving to the next only if the cause is not yet clear:

1. **Review of data**: pressure trends versus production, temperature, choke changes and lift settings. Compare with offset wells in the same field.
2. **Fluid sampling and analysis**: composition of annulus gas or liquid compared with tubing fluids, to show the source.
3. **Wellhead checks**: seal test of hangers and pack-offs, torque and condition checks, valve leak test.
4. **Tubing and casing pressure test**: slickline-set plug or tubing pressure test to identify a tubing leak or packer leak.
5. **Logging**: leak detection (noise and temperature) and cement evaluation where a casing or cement path is suspected.
6. **Gas lift specific**: check of gas lift valves for leak-through and injection point behavior.

Repair options, in order of preference:

- Tighten or replace wellhead seals and test.
- Replace gas lift valves or ESP-related penetrators and connections that are shown to leak.
- Set or replace a plug, or repair a tubing joint by workover.
- Pull and replace the completion where the tubing or packer is leaking.
- Squeeze cementing or casing patch for a casing or cement leak.
- Permanent abandonment if the integrity cannot be restored economically.

Any repair that needs a rig or workover unit follows the workover planning procedure. A temporary deviation to keep a well on production at a higher pressure requires a written risk assessment signed by the Integrity Engineer and the Production Supervisor, a defined limit below 80 percent of MAASP, increased monitoring and a review date no more than 30 days away.

## Records

The following records are kept for the life of the well:

- Daily annulus pressure log, with tubing head pressure and flowing status.
- Bleed-down test sheets, including classification, fluid volumes and samples taken.
- MAASP calculations and any revisions, with the approver.
- Shut-in notices, incident notes and restart approvals.
- Diagnostic results and repair work orders.
- Deviation approvals and risk assessments.
- Gauge calibration certificates.

The Integrity Engineer reviews the annulus log for all wells monthly and reports wells in alert, action or shut-in status to the Production Supervisor. A summary is included in the quarterly integrity review. Records are stored in the well file and the maintenance system, and any entry corrected later must keep the original reading visible with the correction, reason and date.
