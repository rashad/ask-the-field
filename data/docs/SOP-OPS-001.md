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
| Applies to | All three fields: Dune Field, Wadi Field and Salt Flat Field |
| Owner | Production Engineer |
| Equipment | Varenta VL-538 ESP, variable speed drive (VSD), downhole sensor, wellhead and flowline |

## Purpose and scope

This procedure sets out how the operations team responds when an electric submersible pump (ESP) well trips, how the cause is diagnosed, when and how many times a restart may be attempted, how insulation checks are performed, and when the well must be handed to the workover team.

The aim is to restore production quickly where the trip is benign, and to avoid damaging the pump, motor and cable by repeated restarts where the trip points to a real fault.

It applies to all ESP wells in Dune Field, Wadi Field and Salt Flat Field that feed CPF-1. Conditions differ between fields, and operators should keep them in mind:

- Dune Field: mostly stable conditions, trips are often power-related or caused by process upsets at CPF-1.
- Wadi Field: water flood with rising water cut. Changes in fluid load can cause underload or overload trips.
- Salt Flat Field: sand-prone with high GOR. Gas interference and sand can cause underload, overload and locked-rotor trips.

It does not cover gas lift or natural flow wells, and it does not replace the site electrical isolation procedure or the permit to work system.

## Roles

- **Lead Operator**: first responder. Carries out the immediate actions, reads the VSD, makes the first restart decision within the rules below, and keeps the log.
- **Night Lead Operator**: same duties as the Lead Operator on night shift, and ensures a trip in progress is fully handed over in the morning.
- **Field Engineer**: attends the VSD when a trip code is not cleared by a single restart, and performs or supervises the megger test.
- **Production Engineer**: reviews trend data, approves a third or later start after investigation, and recommends a workover.
- **Production Supervisor**: approves deferment reporting and authorises the workover request.
- **HSE Advisor**: confirms that isolation and permit requirements are met before any electrical testing.
- **Workover Supervisor**: receives the workover request and plans the intervention.
- **Maintenance Planner**: schedules electrical work and tests, and tracks spares.

## Immediate actions after a trip

1. Note the exact time of the trip and the well name. Confirm the well is not producing and the choke and wing valve positions.
2. Check whether the trip is isolated to one well. If several wells have tripped at once, treat it as a power or CPF-1 upset first, and check the supply, the bus and CPF-1 status before looking at individual wells.
3. Do not press reset or start at once. Go to the VSD and read the display first.
4. Record the trip code, the last running frequency, motor current at trip and any alarms active before the trip.
5. Check the wellhead pressure, flowline pressure and casing pressure against the last logged values. A sudden rise or loss of pressure is a sign of a flowline problem rather than a pump problem.
6. Look for visible issues: leaks at the wellhead, damage to the power cable at surface, burnt smell, tripped breakers, or an open junction box.
7. If there is any sign of fire, smoke, arcing, a gas leak or a hydrocarbon release, stop. Isolate, raise the alarm and follow the site emergency response plan. Do not attempt a restart.
8. Inform the Production Supervisor of the trip if the well is not restarted within 30 minutes.

## Diagnosis: reading VSD trip codes, phase currents and downhole sensor data

Use the data in the order below. Record every reading on the trip sheet.

### 1. VSD trip code

| Trip type | Typical meaning | First check |
|---|---|---|
| Underload | Low motor current, pump off, gas lock, low fluid level, or a closed valve downstream | Wellhead and flowline valves, gas content, intake pressure trend |
| Overload | High current from heavy or viscous fluid, sand, scale, or a mechanical drag | Current trend before trip, sand, recent choke changes |
| Overcurrent or short circuit | Possible cable or motor fault | Phase currents, insulation test |
| Current imbalance | Fault in the cable, motor or surface connections, or an unstable supply | Phase currents, connections in the VSD and junction box |
| Ground fault | Insulation breakdown to earth | Do not restart. Go to the megger section |
| Over or under voltage | Supply problem | Supply voltage, other wells on the same bus |
| Locked rotor or stall | Pump or motor stuck, often by sand | Treat as serious, limit restarts |

### 2. Phase currents

1. Read the three phase currents at the last running point and at the trip.
2. Calculate imbalance as (largest deviation from the average current / average current) x 100.
3. Imbalance up to 5 percent is normal. Between 5 and 10 percent, investigate the supply and connections. Above 10 percent, treat it as a possible downhole or cable fault and do not restart before an insulation check.
4. A fast rise in current before the trip suggests overload or sand. A steady fall suggests gas interference or low inflow.

### 3. Downhole sensor data

1. Read pump intake pressure, discharge pressure, motor winding temperature, intake temperature and vibration if available.
2. A falling intake pressure with falling current points to drawdown or gas. A rising motor temperature before the trip points to heat, poor cooling or a developing electrical fault.
3. Loss of sensor signal together with a ground fault or imbalance trip is a strong sign of a cable or motor failure.
4. Compare with the last stable values and with the trend over the previous 24 hours, not only with the last reading.

### 4. Classify

Classify the trip as one of: surface or supply cause, process or flowline cause, fluid or gas related, or suspected downhole electrical or mechanical fault. This class decides the restart route.

## Restart rules (no more than two restart attempts, wait times)

1. A maximum of **two** restart attempts is allowed after a trip. A third attempt is not permitted without written approval from the Production Engineer after review of the data and a clear megger result.
2. Restart is allowed only when the cause is understood or clearly benign and the checks above show no sign of ground fault, severe imbalance or fire risk.
3. Wait times before restart:
   - Surface supply or process trip, cause cleared: restart when conditions are normal, with a minimum of 5 minutes for the VSD to settle.
   - Underload or gas related trip: wait at least 30 minutes so that fluid can fall back and the pump can cool.
   - Overload trip: wait at least 60 minutes. Reduce the start frequency.
   - Any trip with a rising motor temperature: wait until the winding temperature has dropped to normal, and at least 60 minutes.
4. Before each attempt, confirm the wing valve and choke are in their normal position and the flowline is open. Start at the lowest set frequency and ramp up gradually.
5. After a start, watch the well for at least 15 minutes. Check that the currents are balanced and stable, the intake pressure is stable and the flow reaches the flowline.
6. If the well trips again within 60 minutes of a start, it counts as a failed attempt.
7. After two failed attempts, leave the well shut in, inform the Field Engineer and the Production Engineer, and do not try again.
8. Ground fault, locked rotor and imbalance above 10 percent: no restart until the Field Engineer has completed the insulation check.
9. In sand-prone service, avoid repeated starts against a possibly sanded pump. Use a longer wait and a low start frequency.

## Megger and insulation resistance checks

Only competent electrical personnel carry out the test, under a valid permit to work and with the HSE Advisor satisfied that isolation is in place.

1. Isolate and lock out the VSD. Prove dead. Disconnect the output to the cable at the VSD or junction box, so that the drive is not exposed to test voltage.
2. Discharge the cable to earth before and after the test.
3. Use a megger at the voltage specified for the cable and motor system. Test phase to earth for each phase, and between phases where the instrument allows.
4. Apply the test voltage for 60 seconds and record the value, the time, the temperature and the instrument used.
5. Judge the results:
   - 100 megohm or more: good.
   - Between 10 and 100 megohm: marginal. Record the value, check for moisture at the junction box, and retest. Restart only with Production Engineer approval and close monitoring.
   - Below 10 megohm: failed. Do not restart.
   - Large differences between phases, or a reading that falls steadily during the test, point to a developing fault even when the value looks acceptable.
6. Test at the surface cable end first. If the surface cable and junction box are clean and dry, a low reading means the fault is downhole.
7. Restore the connections, remove the locks and close the permit only after the test sheet is signed.

## When to call a workover

Raise a workover request through the Production Engineer when any of the following applies:

- Insulation resistance fails (below 10 megohm) and the surface cable and junction box are healthy.
- Two restart attempts have failed and no surface or process cause has been found.
- Locked rotor or stall trips repeat, or the sensor shows a mechanical problem such as high vibration.
- Phase imbalance remains above 10 percent after surface connections are checked.
- Downhole sensor signal is lost with an electrical trip.
- The data show a pump that cannot lift against the well conditions, with the well running in repeated underload or overload cycles.

The Production Engineer prepares the request with the trip history, readings, megger results and the expected deferred production. The Production Supervisor authorises it and the Workover Supervisor schedules the work. Keep the well shut in and safe until handover to the workover team.

## Records and handover

1. Complete the ESP trip sheet for every trip: well, time of trip, trip code, phase currents, sensor readings, class of cause, each restart attempt with time and result, and megger values.
2. Log the downtime and the estimated deferred oil, using the last stable rate, for the daily production report.
3. Enter the trip and the actions in the shift report under wells offline or restricted and events.
4. At shift change, the outgoing Lead Operator briefs the incoming Lead Operator in person. The brief states how many restart attempts have been made, the time the next attempt is allowed, and any approvals needed.
5. File trip sheets and megger records with the Production Engineer within 24 hours. Pump serial and batch details are recorded on the sheet as plain equipment data.
6. The Production Engineer reviews the trip sheets each week, and the Maintenance Planner updates the ESP maintenance records and spares needs.
7. Review this procedure at least once a year, or after any incident involving an ESP restart.
