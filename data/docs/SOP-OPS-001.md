---
doc_id: SOP-OPS-001
doc_type: procedure
well_id: null
field: null
date: 2025-09-15
title: SOP-OPS-001 ESP Trip Response and Restart
---

# SOP-OPS-001 ESP Trip Response and Restart

| Field | Value |
|---|---|
| Procedure ID | SOP-OPS-001 |
| Title | ESP Trip Response and Restart |
| Revision date | 2025-09-15 |
| Applies to | All three fields: Field A, Field B and Bayda |
| Owner | Production Engineer |
| Related equipment | ESP downhole assembly, variable speed drive (VSD), step-up transformer, junction box, wellhead feed-through |

## Purpose and scope

This procedure sets out how operations staff respond when an electric submersible pump (ESP) well trips, how the cause is diagnosed, when a restart may be attempted and when the well must be handed to the workover team. The aim is to restore production quickly without damaging the motor, cable or pump through repeated restarts into an unresolved fault.

It applies to all ESP wells in Field A, Field B and Bayda, whether the pump is run on a fixed-speed starter or a VSD. Gas lift and natural flow wells are out of scope. Bayda wells are sand-prone and have high GOR, so the additional cautions marked "Bayda" in this document apply to them in particular.

The procedure covers trips detected locally at the VSD or remotely from the control room. It does not replace the facility electrical isolation procedure or the permit-to-work system, which always take precedence for any hands-on work.

## Roles

- **Lead Operator**: first responder on shift. Confirms the trip, makes the well and location safe, reads and records the trip data, and carries out permitted restarts.
- **Night Lead Operator**: same duties as the Lead Operator on night shift, and ensures open trips are handed over in writing at shift change.
- **Production Engineer**: reviews trip data, decides whether a restart is justified, and interprets downhole sensor trends. Recommends workover when criteria are met.
- **Field Engineer**: supports electrical checks, performs or witnesses megger tests with the authorized electrician, and verifies VSD settings.
- **Production Supervisor**: approves any restart beyond the first attempt, informs CPF-1 control of expected loss of production, and approves the workover request.
- **HSE Advisor**: consulted if there is any sign of fire, arcing, oil leak at the wellhead or electrical shock hazard.
- **Workover Supervisor**: receives the workover request and plans the intervention.

## Immediate actions after a trip

1. Confirm the trip from the VSD display or SCADA alarm. Note the exact time of the trip and the well flowing parameters just before it (frequency, motor current, intake pressure, wellhead pressure, choke position).
2. Do not press reset or restart at this stage. Walk to the VSD and look for smoke, burning smell, tripped breakers or physical damage. If any are present, isolate per the electrical isolation procedure and call the HSE Advisor.
3. Check the wellhead for leaks, abnormal noise or cable feed-through damage. Check the flowline and manifold valves are in their normal positions.
4. Confirm the upstream conditions: power supply to the location, other wells on the same feeder, and whether CPF-1 reported a power dip, process trip or high separator level that could have caused a plant-driven trip.
5. Close the wellhead production valve only if there is a leak, back-flow through the pump is suspected, or the Production Engineer instructs it.
6. Inform the Production Engineer and the control room that the well is down. Record the estimated rate lost.

## Diagnosis: reading VSD trip codes, phase currents and downhole sensor data

Capture the trip code and the event log before any reset. Take photographs or screenshots where possible.

**Trip codes (typical groupings; use the vendor manual for exact code numbers):**

- **Underload:** motor current fell below the set underload threshold. Usual causes are gas interference, pump off, low fluid level, worn pump or a shaft failure. Often recoverable after a wait period.
- **Overload / overcurrent:** current exceeded the overload setting. Causes include sand or scale in the pump, high viscosity or emulsion, a locked or stuck pump, or a failing motor. Treat as potentially mechanical.
- **Current imbalance:** phase currents differ by more than the set limit. Suggests cable or motor winding degradation, a poor connection at the junction box, or a supply problem.
- **Ground fault / insulation fault:** leakage to earth. Do not restart until the megger checks below are done.
- **Over/under voltage, phase loss:** usually upstream power quality. Check supply before blaming the downhole system.
- **Overtemperature (VSD or motor winding):** check VSD cooling and filters; check motor temperature trend from the downhole gauge.

**Phase currents:**

1. Read the three phase currents from the last recorded running data and from the trip snapshot.
2. Calculate imbalance as the maximum deviation from the average divided by the average. Imbalance above 5 percent while running is a warning; above 10 percent is a reason not to restart without Production Engineer approval.
3. A sharp rise in current followed by a trip points to a mechanical jam or sand. A slow decline followed by underload points to gas or falling inflow. A steady current with a sudden drop to zero points to a broken shaft, open circuit or supply loss.

**Downhole sensor data (where a gauge is installed):**

1. Review pump intake pressure, discharge pressure, motor temperature and vibration for the 24 hours before the trip.
2. Rapidly falling intake pressure indicates drawdown too high or gas breakout. Motor temperature above the vendor limit, or climbing steadily, indicates inadequate cooling or an electrical problem.
3. Loss of the gauge signal at the same time as the trip suggests a cable or motor fault rather than a process cause.
4. Bayda: also review sand production trend and GOR from the latest test. Rising sand with rising current supports a sand-related trip.

Record the likely cause category (process, power, mechanical, electrical, unknown) before deciding on a restart.

## Restart rules (no more than two restart attempts, wait times)

1. **No more than two restart attempts** may be made after any single trip event. A third attempt is not permitted under any circumstances without a workover decision or a documented megger pass and Production Supervisor sign-off.
2. **Ground fault, insulation fault or phase loss with suspected cable damage:** no restart until the megger checks in the next section are complete and acceptable.
3. **Wait times before the first restart:**
   - Underload or suspected gas lock: wait at least 30 minutes to allow fluid level to recover and the motor to cool.
   - Overload or overcurrent: wait at least 60 minutes, and do not restart until the Production Engineer has reviewed the data.
   - Power or plant-driven trip with a clean ESP history: wait for stable supply, then restart after the minimum back-spin time set by the vendor (not less than 20 minutes).
4. **Wait time before the second restart:** at least 60 minutes after a failed first attempt, and only with Production Engineer and Production Supervisor approval.
5. **Restart method:** start at the low end of the frequency range, ramp slowly to the previous operating frequency, and watch phase currents and intake pressure through the ramp. Keep the choke at the previous position unless the Production Engineer directs otherwise. Bayda: restart with a conservative choke and frequency to limit sand production.
6. **Success criteria:** the well is considered restarted when it has run stable for at least 2 hours with balanced currents, normal intake pressure and flow reaching the flowline.
7. If the unit trips again within 2 hours of a restart, that counts as a failed attempt.
8. Never bypass or raise trip settings (underload, overload, imbalance) to force a restart.

## Megger and insulation resistance checks

Insulation tests are carried out by the Field Engineer with an authorized electrician under a permit to work.

1. Isolate and lock out the VSD or starter output. Prove dead. Discharge the cable to earth before and after each test.
2. Disconnect the cable from the VSD or transformer output so the test covers the cable and motor only.
3. Use a megger set to the voltage specified by the ESP vendor (commonly 1000 V or 5000 V DC for medium voltage systems). Apply for 60 seconds.
4. Measure phase-to-earth for each phase, and phase-to-phase if required. Record the 60-second reading and the ambient temperature.
5. Acceptance guide (confirm against vendor data):
   - Above 100 megohms: healthy, restart permitted.
   - 20 to 100 megohms: marginal. Compare with the previous test and trend. One restart only with Production Engineer approval.
   - Below 20 megohms: unacceptable. No restart. Raise a workover request.
   - Readings that are very low on one phase or unequal between phases indicate cable or motor damage.
6. Also check the junction box and wellhead feed-through visually for moisture, tracking or burnt connectors, and test the cable separately from the motor where the layout allows.
7. Record all readings on the ESP electrical check sheet and file with the trip record.

## When to call a workover

Raise a workover request through the Production Engineer to the Production Supervisor when any of the following applies:

- Insulation resistance below 20 megohms, or a confirmed ground fault that persists after connectors and junction box are cleaned and rechecked.
- Two restart attempts have failed.
- Open circuit, shaft failure or no load signature (current drops to near zero with a running motor).
- Repeated trips (three or more in 7 days) with the same fault pattern, even if restarts were successful.
- Downhole sensor data showing sustained motor overtemperature, high vibration or loss of pump performance that the Production Engineer judges to be mechanical.
- Evidence of severe sand or scale plugging that does not clear after a controlled restart (Bayda in particular).

The request should include trip history, VSD event logs, phase current data, megger results, last well test, and the estimated deferred oil per day. The Workover Supervisor then schedules the job against the rig and workover queue. Keep the well shut in and safe, with the VSD locked out, until the workover starts.

## Records and handover

1. Log every trip in the shift report with: well, trip time, trip code, cause category, actions taken, restart times, outcome and estimated deferred oil.
2. Attach or file the VSD event log, phase current readings and megger sheet to the well electrical record.
3. Count restart attempts explicitly in the shift report ("restart attempt 1 of 2") so the next shift cannot exceed the limit.
4. At shift change, the outgoing Lead Operator or Night Lead Operator briefs the incoming Lead Operator in person on every well that is tripped, restarted within the last 4 hours, or waiting for a wait period to expire.
5. The Production Engineer updates the well status, deferred production and the workover request log by the end of the next working day.
6. Repeat trips and any trip with a safety element (arcing, fire, leak) are reviewed at the next production meeting, and an incident note is raised if the HSE Advisor requires it.
7. This procedure is reviewed at least every two years or after any ESP-related incident. The current revision is dated 2025-09-15.
