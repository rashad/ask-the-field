---
doc_id: SOP-OPS-002
doc_type: procedure
well_id: null
field: null
date: 2025-12-01
title: SOP-OPS-002 Sand Management and Sand Production Alarms
---

# SOP-OPS-002 Sand Management and Sand Production Alarms

| Field | Value |
|---|---|
| Document ID | SOP-OPS-002 |
| Revision date | 2025-12-01 |
| Applies to | All three fields: Dune Field, Wadi Field and Salt Flat Field |
| Owner | Production Engineer |
| Reviewers | Integrity Engineer, HSE Advisor, Production Supervisor |

## Purpose and scope

This procedure sets out how sand production is prevented, detected and controlled at all wells feeding CPF-1. It covers Dune Field, Wadi Field and Salt Flat Field, and applies to ESP, gas lift and natural flow wells.

The aims are to:

1. Protect the wellbore, downhole pumps, chokes, flowlines and CPF-1 separators from erosion and plugging.
2. Keep every well within its sand-free drawdown limit wherever practical.
3. Give operators a fixed, step-by-step response when a sand alarm is raised.

Responsibilities:

- **Lead Operator / Night Lead Operator:** carries out the alarm response and records all actions.
- **Production Engineer:** sets and reviews sand-free drawdown limits, approves the return to normal rate.
- **Integrity Engineer:** owns the erosion inspection programme and probe thresholds.
- **HSE Advisor:** confirms safe handling of sand-contaminated equipment and waste.
- **Production Supervisor:** authorises any extended restriction or shut-in.

## Sand-prone wells and sand-free drawdown limits

Salt Flat Field is sand-prone and also has high GOR, so gas velocity adds to erosion risk there. All Salt Flat Field wells are treated as sand-prone by default. Dune Field and Wadi Field wells are treated as sand-prone if they have a recorded sand history, if sand has been seen in a sample, or if the Production Engineer lists them as such.

The Production Engineer maintains a register of sand-prone wells. For each well it holds:

- The sand-free drawdown limit (maximum bottomhole flowing pressure drawdown, in psi, at which sand has not been detected).
- The maximum approved choke size (in 64ths of an inch).
- The last review date.

Rules:

1. Wells must not be operated above the register drawdown limit or the maximum approved choke size without written approval from the Production Engineer.
2. Any choke increase on a sand-prone well must be made in steps of no more than 2/64 in, with at least 30 minutes of stabilisation and sand monitor observation between steps.
3. On ESP wells, any pump frequency increase is treated as a drawdown increase and follows the same step and hold rules.
4. On Wadi Field wells, rising water cut can change drawdown behaviour and weaken the formation. Limits are reviewed whenever water cut changes materially.
5. Limits are reviewed at least every six months, and after any sand alarm that required a bean-down.

## Acoustic sand monitor and erosion probe alarm thresholds

Sand-prone wells are fitted with an acoustic sand monitor and, where installed, an erosion probe. Thresholds are as follows. The Production Engineer may set tighter well-specific values in the register, but never looser ones.

| Instrument | Level | Threshold | Action |
|---|---|---|---|
| Acoustic sand monitor | Pre-alarm (High) | Sand signal equivalent to 5 ppm sustained for 10 minutes | Operator investigates, no rate change yet |
| Acoustic sand monitor | Alarm (High-High) | Sand signal equivalent to 15 ppm sustained for 5 minutes | Start choke bean-down response |
| Erosion probe | Pre-alarm | Wall loss rate above 0.5 mil/month | Notify Integrity Engineer, increase inspection frequency |
| Erosion probe | Alarm | Wall loss rate above 1.0 mil/month, or any step change in probe reading | Start choke bean-down response and notify Integrity Engineer |

Notes:

- Acoustic signals are calibrated against sand samples. A signal with no matching gas rate or choke change, or with a flat trend and no sample confirmation, may be noise from valve or choke flow. The operator still treats it as real until the checks below are complete.
- Instrument faults must be reported to the Maintenance Planner. A well with a failed sand monitor must be treated as being in alarm for sampling purposes and sampled at least every 4 hours.

## Response to a sand alarm: choke bean-down steps

When a High-High acoustic alarm or an erosion probe alarm is raised:

1. **Acknowledge** the alarm in the control system and note the time, well and reading. Inform the Production Supervisor.
2. **Check for noise causes**: recent choke or frequency changes, slugging, gas breakthrough, valve operation upstream or downstream. If a change was made in the last hour, reverse it by one step first.
3. **First bean-down:** reduce the choke by 2/64 in (or reduce ESP frequency by an equivalent amount agreed with the Production Engineer). Hold for 30 minutes and watch the sand signal.
4. **Second bean-down:** if the signal remains above the High threshold, reduce by a further 2/64 in. Hold for 30 minutes.
5. **Third bean-down:** if the signal is still above the High threshold, reduce by a further 2/64 in and notify the Production Engineer immediately.
6. **Shut-in criterion:** if the signal stays above the High-High threshold after three steps, or if sand is visible at the sampling point, or if wellhead or flowline pressure behaves abnormally, the Lead Operator shuts in the well with Production Supervisor approval. Do not wait for further steps.
7. **Stabilise:** once the signal falls below the Pre-alarm threshold, hold the choke for at least 2 hours.
8. **Do not reopen** the choke during the stabilisation period, even if production targets are affected.

Safety notes:

- Never open sample points or separator drains on a well in alarm without the proper permit and PPE.
- On high GOR wells, gas velocity at the choke increases as the choke is reduced in steps. Watch downstream pressure and flowline temperature.
- Wells with a downhole ESP must not be stopped and restarted repeatedly. Shut-in and restart follows the ESP start procedure.

## Sampling and separator checks

Sampling confirms the instrument reading and measures the real sand content.

1. Take a wellhead sample within 1 hour of a High-High alarm, using the dedicated sand sampling point and a fine mesh sand catcher or centrifuge tube.
2. Record the sand content in ppm by volume, along with choke size, wellhead pressure, flow rate and water cut at the time of sampling.
3. Repeat the sample after each bean-down step and again at the end of the 2 hour stabilisation period.
4. Sand content above 10 ppm in a sample is treated as confirmed sand production. Any visible sand, or sand above 50 ppm, requires immediate notification of the Production Engineer.
5. At CPF-1, the Lead Operator checks:
   - Separator level and interface readings for abnormal behaviour (possible sand build-up).
   - Differential pressure across inlet devices and downstream filters.
   - Sand jetting or drain flow, if installed, and quantity removed.
6. If separator sand accumulation is suspected, the Production Supervisor schedules a clean-out and the HSE Advisor reviews the handling plan for contaminated solids.

## Flowline erosion inspection

Sand erodes chokes, bends, tees and flowline sections near the wellhead and manifold. The Integrity Engineer manages the following inspection regime:

1. **Routine:** ultrasonic wall thickness checks on choke downstream spools, first bends and manifold tie-ins on all sand-prone wells every 6 months.
2. **After a High-High alarm:** an ultrasonic thickness check of the choke body, downstream spool and first elbow within 7 days.
3. **After sand above 50 ppm or visible sand:** inspection within 48 hours, and a decision on whether the flowline can stay in service.
4. **Probe pre-alarm:** inspection interval for the affected line is halved until the probe rate returns below threshold for 3 consecutive months.
5. Wall loss of more than 10 percent from nominal, or any reading below the minimum allowable thickness, must be reported to the Production Supervisor on the same day. The line may need a rate restriction or repair.
6. Choke trim and bean wear is checked at each inspection and replaced when out of tolerance.

## Return to normal rate

Rate is recovered cautiously and only with Production Engineer approval.

1. Conditions to begin:
   - Sand signal below the Pre-alarm threshold for at least 2 hours.
   - Latest wellhead sample below 5 ppm.
   - No abnormal separator or filter readings.
   - Erosion inspection results received, where required.
2. Open the choke in steps of 1/64 in, with at least 1 hour of hold and monitoring between steps.
3. Stop at any step where the sand signal rises above the Pre-alarm threshold. Return to the previous choke setting and tell the Production Engineer.
4. The new stable choke becomes the provisional maximum for that well. The Production Engineer updates the register and, if needed, the sand-free drawdown limit.
5. Do not return to the previous rate if it was the cause of the alarm, unless the Production Engineer documents a reason and a monitoring plan.

## Records

The Lead Operator records the following in the shift report and the sand log:

- Alarm time, well, instrument, and reading.
- Each choke or frequency step with time and the resulting sand signal.
- Sample results (ppm, time, location).
- Separator and filter observations.
- Any shut-in, who approved it, and the restart time.
- Estimated oil deferred (bbl) due to the restriction.

The Production Engineer keeps the sand-prone well register, drawdown limits and review dates. The Integrity Engineer keeps inspection results and probe trend data. All records are kept for at least 5 years. This procedure is reviewed every 2 years or after any significant sand-related incident.
