---
doc_id: SOP-OPS-002
doc_type: procedure
well_id: null
field: null
date: 2025-12-01
title: SOP-OPS-002 Sand Management and Sand Production Alarms
---

# SOP-OPS-002 Sand Management and Sand Production Alarms

| Field | Entry |
|---|---|
| Procedure ID | SOP-OPS-002 |
| Revision date | 2025-12-01 |
| Applies to | All three fields: Field A, Field B and Bayda |
| Owner | Production Engineer |
| Reviewers | Lead Operator, Integrity Engineer, HSE Advisor |

## Purpose and scope

This procedure sets out how sand production is prevented, detected and controlled on wells flowing to CPF-1. It aims to protect people, wellhead and flowline integrity, separators and downhole equipment from erosion and solids build-up, while keeping deferred oil to a minimum.

It applies to all producing wells in Field A, Field B and Bayda, whatever the lift method (natural flow, gas lift or ESP) and well type (vertical, deviated or horizontal). It covers operators, lead operators, production engineers, integrity engineers and the HSE Advisor. It does not cover planned sand cleanout operations during workover, which follow the workover programme.

Definitions:
- **Sand-free drawdown limit**: the highest drawdown or rate at which a well has shown sand at or below the clean-production threshold in a test.
- **Bean-down**: a reduction of choke size, in 64ths of an inch, to reduce rate and drawdown.
- **Clean-production threshold**: sand content of 10 ppm or less in the produced stream.

## Sand-prone wells and sand-free drawdown limits

1. Bayda is classed as sand-prone. All Bayda wells are treated as sand-prone unless the Production Engineer documents otherwise after sustained clean testing.
2. Wells in Field A and Field B are treated as sand-prone if they have a recorded sand alarm, a sand-related ESP trip or a sand finding at a separator inspection in the previous 12 months. The Production Engineer keeps this list current.
3. Each sand-prone well has a sand-free drawdown limit set by the Production Engineer from step-rate testing and well test sand results. The limit is stated as a maximum choke size and a maximum rate, and posted in the control room.
4. Operators must not open a sand-prone well beyond its posted limit without written approval from the Production Engineer.
5. Limits are reviewed after every well test, after any workover or completion change, and after any sand alarm event. A limit may be tightened by the Production Engineer at once. A limit may be relaxed only after a documented test showing sand at or below 10 ppm at the higher rate.
6. For ESP wells, frequency changes count as rate changes and must stay inside the posted limit.
7. Choke changes on sand-prone wells are made in steps of no more than 4/64 inch, with at least 30 minutes of stabilisation between steps, unless this SOP says otherwise.

## Acoustic sand monitor and erosion probe alarm thresholds

Sand-prone wells are fitted with an acoustic sand monitor and, where installed, an erosion probe on the flowline or choke downstream spool. Thresholds below apply unless a well-specific value is posted.

| Instrument | Level | Threshold | Action |
|---|---|---|---|
| Acoustic sand monitor | Alert (high) | Equivalent sand rate above 5 ppm for 10 minutes | Operator checks the trend and prepares to bean down |
| Acoustic sand monitor | Alarm (high-high) | Equivalent sand rate above 20 ppm for 5 minutes | Start bean-down steps immediately |
| Erosion probe | Alert | Wall loss rate above 0.5 mil per week | Notify the Integrity Engineer, increase inspection frequency |
| Erosion probe | Alarm | Wall loss rate above 2 mil per week | Bean down and request an urgent inspection |

1. Monitors are checked for noise at the start of each shift. Flow noise from gas breakout, choke cavitation or a gas lift valve can mimic sand. The operator compares the signal against the last stable baseline before acting.
2. An alarm must never be inhibited or reset without a recorded reason and the Lead Operator's approval.
3. A well with a failed or bypassed sand monitor is produced at no more than 80 percent of its sand-free rate limit until the instrument is repaired. The Maintenance Planner raises a priority work order.
4. Monitors and probes are function-tested every 6 months by the instrument technician.

## Response to a sand alarm: choke bean-down steps

1. **Confirm.** The operator checks that the alarm is real: review the trend, compare with the baseline, and note any recent changes in choke, ESP frequency, gas lift rate or line pressure. Inform the Lead Operator.
2. **Step 1.** If the alarm is high-high or the signal is rising, reduce the choke by 4/64 inch (or reduce ESP frequency by an equivalent amount agreed with the Production Engineer). Record the time, choke, wellhead pressure and flowing pressure.
3. **Observe.** Wait 30 minutes and review the sand signal and wellhead pressure.
4. **Step 2.** If the signal is still above the alert level, reduce the choke by a further 4/64 inch and wait another 30 minutes.
5. **Step 3.** If the signal is still above the alarm level after two steps, reduce by a third 4/64 inch step. Call the Production Engineer.
6. **Shut-in criteria.** If the sand signal exceeds 50 ppm equivalent, if the erosion probe alarm persists after three steps, or if a pressure surge, loud flow noise or a visible leak is observed, the Lead Operator orders the well shut in using the normal shutdown sequence. The Production Supervisor is informed at once.
7. **Do not** bean up again to recover rate until the Return to normal rate section is satisfied.
8. For several wells alarming at once, suspect a common cause such as a separator or header pressure change. The Lead Operator decides whether to stabilise CPF-1 first, but bean-down on individual wells is never delayed for more than 15 minutes.
9. Personnel must stay clear of the flowline and choke area while a well is alarming at high-high, except for essential checks done at a safe distance with an approved gas detector.

## Sampling and separator checks

1. After the first bean-down step, the operator takes a wellhead sample from the sample point using the sand-catching sample pot. Samples are taken at the start, again at 30 minutes and at each further step.
2. The sample is allowed to settle and the solids volume is read in the graduated tube. The result is converted to ppm using the sample volume and recorded. Where lab capability exists, a grain size and composition analysis is requested.
3. The operator checks the production separator and test separator for sand accumulation: check the level and interface readings, the sand jetting system, and the differential pressure across internals. A rise in differential pressure or an unexplained level shift is reported to the Lead Operator.
4. If sand jetting is available, run a jetting cycle in line with the separator manual. Record the volume of sand removed.
5. Check downstream filters, the produced water system and the strainers for solids. Replace elements when the differential pressure limit in the filter datasheet is reached.
6. If sand carry-over to the water or crude handling system is suspected, notify the Production Engineer. The HSE Advisor is informed when sand removal requires opening a vessel, because this involves confined space entry controls and possible NORM scale.
7. Sand and sludge are handled and disposed of according to the waste management plan.

## Flowline erosion inspection

1. After any sand alarm that lasted more than 30 minutes or reached high-high, the Integrity Engineer arranges an ultrasonic wall thickness inspection of the choke body, downstream spool, first elbows and the flowline bends nearest the wellhead.
2. Inspections are done within 72 hours of the event, or within 24 hours if the erosion probe alarm was active.
3. Readings are compared with the last baseline. If wall loss exceeds 10 percent of nominal thickness since baseline, or the remaining thickness is within 20 percent of the minimum allowable, the Integrity Engineer recommends a rate restriction, component replacement or repair.
4. Chokes and trims are inspected for washout whenever a sand event is recorded. A washed choke is replaced before the well returns to full rate.
5. Routine inspection of sand-prone flowlines is done at least every 6 months, or every 3 months for wells with a sand alarm in the previous quarter.
6. Findings are reported to the Production Engineer and the Production Supervisor. Any condition that threatens containment is treated as an incident and handled under the incident procedure.

## Return to normal rate

1. A well may be returned to its previous rate only when all of the following are met:
   - Sand signal has stayed below the alert level for at least 24 hours at the reduced rate.
   - Two consecutive wellhead samples show sand at or below 10 ppm.
   - The erosion inspection has been completed, and the Integrity Engineer has not placed a restriction.
   - The separator and filters have been checked and cleared.
2. Rate is restored in steps of no more than 2/64 inch (or an equivalent ESP frequency step), with at least 4 hours of observation between steps.
3. If the sand signal rises above the alert level during a step, return to the previous stable setting and inform the Production Engineer. Do not try again without a revised plan.
4. If the well cannot reach its previous rate without sand, the Production Engineer revises the sand-free drawdown limit and updates the posted limits. A well test is requested to confirm the new limit.
5. Repeated alarms on the same well (three or more in 30 days) trigger a review for remedial options, such as a downhole sand control assessment, an ESP check or a workover proposal.
6. The Production Supervisor approves the return to normal rate and the Lead Operator confirms it in the shift report.

## Records

1. The operator records, for every sand alarm: well, time of alarm, alarm level, sand signal values, choke and wellhead pressure before and after each step, sample results, actions and the time of return to rate.
2. The Lead Operator includes the event, deferred oil estimate and handover actions in the shift report.
3. The Integrity Engineer files inspection readings and the comparison with baseline in the integrity database.
4. The Production Engineer updates the sand-prone well list, the posted drawdown limits and the sand event log, and issues an incident note where required.
5. Instrument overrides, bypasses and test results are logged by the Maintenance Planner against the instrument tag.
6. Records are kept for at least 5 years. This SOP is reviewed every 2 years or after any sand-related incident, and the next review follows the revision date of 2025-12-01.
