---
doc_id: SOP-OPS-009
doc_type: procedure
well_id: null
field: null
date: 2025-06-30
title: SOP-OPS-009 Shift Handover and Daily Shift Report
---

# SOP-OPS-009 Shift Handover and Daily Shift Report

| Field | Value |
|---|---|
| Procedure ID | SOP-OPS-009 |
| Title | Shift Handover and Daily Shift Report |
| Revision date | 2025-06-30 |
| Applies to | All three fields: Field A, Field B and Bayda |
| Owner | Production Supervisor |
| Reviewed by | Production Engineer, HSE Advisor |

## Purpose and scope

This procedure defines how operating shifts hand over control of the asset and how the daily shift report is written, checked and filed. The aim is that the incoming crew knows the true state of every well, every open incident and every piece of equipment at CPF-1 before taking over, and that nothing is lost between shifts.

The procedure applies to all three fields: Field A, Field B and Bayda, and to CPF-1, which receives the fluids from all of them. It applies to the Lead Operator and Night Lead Operator on each shift, to the control room and field operators, and to the Production Supervisor who reviews the reports. Maintenance, workover and engineering staff follow it whenever they hold an open job or an open incident that affects production.

Definitions used in this procedure:

- **Offline well:** any well that is shut in, suspended, under workover or otherwise not flowing to CPF-1 at the time of handover.
- **Restricted well:** a well producing below its normal rate because of a choke change, a lift problem, a sand limit or a facility constraint.
- **Open incident:** any incident note that has not been given the status closed by the Production Engineer or HSE Advisor.
- **Reporting day:** the 24 hours used for production figures, as set in the Production figures and sources section.

## Handover meeting

1. The outgoing Lead Operator and the incoming Lead Operator hold the handover face to face at the control room. A radio or telephone handover is accepted only when one party cannot attend, and then the reason is written in the report.
2. The handover starts at least 20 minutes before the official shift change. The outgoing shift does not leave site until the incoming Lead Operator has signed the report.
3. The meeting is held with the written shift report open on the table. The outgoing Lead Operator walks through it section by section and does not rely on memory.
4. The following points are covered in this order:
   1. Safety: injuries, near misses, stop-work calls, gas alarms, and any active permit to work.
   2. Process state at CPF-1: separator levels and pressures, compressor status, export status, flare status, and any equipment in bypass or with an inhibit.
   3. Wells offline and restricted, by field, with the reason and the expected return.
   4. Open incidents and their next actions.
   5. Planned work for the coming shift, including permits, isolations, simultaneous operations and crane or vehicle movements.
   6. Any instruction received from the Production Supervisor or the Production Engineer.
5. The incoming Lead Operator repeats back every item that changes how the shift will operate, such as a choke limit, an alarm setpoint change or a standing instruction.
6. After the meeting, both Lead Operators walk the control room panels together and confirm that the displayed status agrees with the report. Any disagreement is resolved before sign-off and noted.
7. Field operators and the control room operator receive a short briefing from their own Lead Operator within 15 minutes of the handover. The briefing is repeated at the field gathering points if a safety item is active.
8. Both Lead Operators sign and time the report. A report without both signatures is treated as not handed over.

## Contents of the shift report

The shift report is written by the Lead Operator (day) or Night Lead Operator (night) in the approved template, one report per shift for the asset. It is terse and factual. Opinions are kept out; observations and readings are given with the time they were taken.

Every report contains these items, in this order:

1. **Header:** date in the format YYYY-MM-DD, shift (day or night), names by role and initial, weather and visibility if relevant to operations.
2. **Production summary:** total oil in bbl/d, total gas in Mscf/d, total water cut in percent, and the split by Field A, Field B and Bayda. The split is stated even when a field is unchanged.
3. **Wells offline and restricted:** see the next section.
4. **Events:** trips, alarms, shutdowns, flaring above normal, leaks, spills, sand production alarms, and any process upset at CPF-1, each with start time, end time and action taken.
5. **Routine work:** well checks, chemical injection rounds, sampling, well tests, calibrations, gas lift adjustments, ESP parameter checks and any maintenance carried out with its work order number.
6. **HSE:** toolbox talks held, permits issued and closed, observations raised, and any housekeeping findings.
7. **Handover notes:** what the incoming shift must do or watch, with times and thresholds. Notes such as "monitor" are not accepted unless they state what is monitored, how often and what value triggers action.
8. **Signatures:** outgoing and incoming Lead Operators, with times.

Entries use well names exactly as in the well register (W-01 to W-41). Pressures are given in psi, choke positions in 64ths of an inch, sand in ppm, and rates in the units above. Abbreviations are limited to those in the template.

## Wells offline and open incidents

This section of the report is mandatory even when it contains the words "none". It is reviewed first by the incoming Lead Operator.

**Wells offline and restricted**

1. List every offline well by name, field and status (shut in, suspended or workover).
2. For each offline well give the reason, the date and time it went offline, the deferred oil estimate in bbl for the reporting day if known, and the expected return date or the condition that must be met first.
3. List every restricted well with its current choke or setpoint, the normal value, the reason for the restriction and the limit that applies, such as a sand limit in ppm or a drawdown limit in psi.
4. Wells that changed status during the shift are marked as changed, with the time of the change.
5. The list is checked against the well register and the control system status screen. If they differ, the control system is treated as the live source and the register discrepancy is reported to the Production Engineer the same day.

**Open incidents**

1. List every open incident by its reference, with the wells and equipment affected, the current status and the next action with its owner and due time.
2. Where an incident note exists, the report refers to it and does not restate it. Where a new event may become an incident, the Lead Operator raises it with the Production Engineer or HSE Advisor before the end of the shift.
3. An incident is described as closed in the report only when the incident note itself shows the status closed. A verbal agreement that the matter is resolved is not sufficient.
4. Where a work order is linked to an incident or a well outage, its number and state (planned, in progress, completed) are given.

## Production figures and sources

1. The reporting day runs from 06:00 to 06:00 local time. A night shift report that spans two calendar dates uses the date on which the reporting day ends.
2. Production figures are taken from the following sources, in this order of preference:
   1. Allocated well rates from the production database for the previous reporting day, once validated.
   2. Last valid well test, adjusted for uptime, for wells without a meter reading.
   3. Control system totals at CPF-1 for the current shift, marked as provisional.
3. Every figure in the report states its source and whether it is provisional or validated. Provisional figures are replaced by validated ones in the next day's report, and the change is noted if the difference exceeds 2 percent for oil.
4. Oil is reported in bbl/d, gas in Mscf/d, and water cut in percent. Rounding is to the nearest whole barrel, whole Mscf and one decimal for water cut.
5. The sum of the field figures must equal the asset total. If it does not, the Lead Operator checks for a missing well or double counting before signing and writes the cause in the report if it cannot be resolved.
6. Well tests carried out during the shift are listed with the well, test duration, measured rates, water cut and sand. Test results are not used to replace allocated rates in the report; they are passed to the Production Engineer.
7. Deferred oil is estimated as the difference between the last stable rate or the latest test rate and the actual rate, multiplied by the downtime in days. The basis of the estimate is stated.
8. Bayda is sand-prone and has high GOR. The report therefore always records sand readings in ppm for Bayda wells that are on a sand limit, and gas handling at CPF-1 when Bayda gas is a constraint.
9. Manual corrections to the database are made only by the Production Engineer. The Lead Operator records the issue and does not overwrite data.

## Escalation rules

| Condition | Escalate to | Time limit |
|---|---|---|
| Injury, fire, loss of containment, gas release | Production Supervisor and HSE Advisor | Immediately, by radio or telephone |
| Unplanned shutdown of CPF-1 or loss of export | Production Supervisor | Within 15 minutes |
| Loss of more than one well or one field at once | Production Supervisor and Production Engineer | Within 30 minutes |
| Sand above the set limit or a sudden rise in sand | Production Engineer | Within 1 hour, choke back at once if the limit is exceeded |
| ESP trip that cannot be restarted under the restart procedure | Production Engineer and Field Engineer | Within 1 hour |
| Well moved to workover or suspended | Production Supervisor and Workover Supervisor | Same shift |
| Equipment defect needing a work order | Maintenance Planner | Same shift |
| Corrosion, leak or integrity concern on flowlines or vessels | Integrity Engineer | Same day, immediately if leaking |
| Report cannot be completed or figures cannot be reconciled | Production Supervisor | Before end of shift |

Further rules:

1. The Lead Operator never waits for the handover to escalate a safety or process issue.
2. If the person to be informed cannot be reached within the time limit, the next level is called, and the attempts are logged with times.
3. Every escalation is recorded in the Events section with the time, the person informed by role, and the instruction received.
4. Instructions that change operating limits are written into the Handover notes and are repeated at the next handover until withdrawn in writing.
5. The Production Supervisor reviews all shift reports each day, and the Production Engineer checks the production figures against the database. Reports with missing sections are returned to the Lead Operator for correction within the same day.
6. Completed reports are filed in the document system the same day and kept for the life of the asset.
