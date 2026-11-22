---
doc_id: SOP-OPS-004
doc_type: procedure
well_id: null
field: null
date: 2025-10-20
title: SOP-OPS-004 Well Test Procedure with the Mobile Test Separator
---

# SOP-OPS-004 Well Test Procedure with the Mobile Test Separator

| Field | Value |
|---|---|
| Procedure ID | SOP-OPS-004 |
| Title | Well Test Procedure with the Mobile Test Separator |
| Revision date | 2025-10-20 |
| Applies to | All three fields: Field A, Field B and Bayda |
| Owner | Production Engineer |
| Approver | Production Supervisor |

## Purpose and scope

This procedure sets out how a single well is tested with the mobile test separator so that oil, gas and water rates are measured in a repeatable way. The results are used for reservoir surveillance, artificial lift optimisation and allocation of CPF-1 production back to wells.

It applies to all producing wells in Field A, Field B and Bayda, whatever the lift method (ESP, gas lift or natural flow) and whatever the well geometry (vertical, deviated or horizontal). Wells that are shut in, suspended or under workover are not tested until they have been returned to stable production.

Responsibilities:

- The Production Engineer schedules tests, reviews results and approves the test report.
- The Lead Operator supervises the line-up, the stabilisation period and the readings.
- The Field Engineer checks instrument calibration and supports troubleshooting.
- The HSE Advisor confirms that permits and gas detection are in place for hookup and sampling.

## Test frequency per well

1. Every producing well is tested at least once every 60 days under normal conditions.
2. Bayda wells are tested at least once every 30 days. The reasons are the sand-prone formation and the high GOR, both of which can change quickly.
3. A well must be re-tested within 7 days if any of the following occurs:
   - a workover, ESP change-out, gas lift valve change or stimulation job has been completed;
   - a choke change of more than 8/64 in has been made;
   - the allocation check (see the data validation section) fails for the well;
   - the Production Engineer suspects a change in water cut, GOR or sand production.
4. A well with a test older than the maximum interval is flagged as overdue in the weekly test schedule. The Production Supervisor decides on priority when several wells are overdue.
5. A test may be repeated once if it is rejected on validation. A second rejection triggers a review by the Production Engineer and the Field Engineer before further attempts.

## Line-up and stabilisation

Before line-up:

1. Confirm the well is producing and stable, with no active alarms on the wellhead, ESP drive or gas lift manifold.
2. Check that the test separator pressure rating is above the maximum expected flowing wellhead pressure, and that the relief valve certificate is in date.
3. Verify the calibration stickers on the flow meters, the water cut meter and the pressure and temperature transmitters. Do not use any instrument with an expired calibration.
4. Obtain the work permit and confirm gas detection is working at the separator skid and the manifold.

Line-up:

5. Record the choke size (in 64ths of an inch), the lift parameters (ESP frequency and amps, or gas lift injection rate) and the flowing wellhead pressure before changing anything.
6. Open the test header valve for the well and close the production header valve for that well only after the test flow is confirmed. Never have both closed at the same time.
7. Open the separator outlet valves slowly and confirm that the level controllers are in automatic.
8. Send the well flow to the test separator and begin the stabilisation clock.

Stabilisation:

9. The minimum stabilisation period is 2 hours for ESP and natural flow wells, and 3 hours for gas lift wells. For Bayda wells with high GOR, extend the period by 1 hour if separator pressure is still swinging.
10. The well is considered stable when, over the last 30 minutes, wellhead pressure varies by less than 5 percent, separator pressure varies by less than 3 percent, and liquid rate varies by less than 5 percent.
11. Do not adjust the choke or lift parameters during stabilisation or during the test. If an adjustment is unavoidable, restart the stabilisation clock.
12. After stabilisation, run the test for a minimum of 6 hours. For wells with slugging behaviour, run it for 12 hours.

## Measurements: oil, gas, water cut, pressures

The Lead Operator records the following at 15-minute intervals, and the data logger stores them continuously:

1. **Oil rate (bbl/d):** from the separator oil meter, corrected to standard conditions with the shrinkage factor and the temperature correction in the current fluid properties sheet.
2. **Gas rate (Mscf/d):** from the separator gas meter, with the differential pressure, static pressure and temperature recorded. Check the orifice plate size against the register once per campaign.
3. **Water rate and water cut (percent):** from the water meter and the online water cut meter. Cross-check with the manual sample result described in the next section. If the two differ by more than 3 percentage points, flag the test for review.
4. **Pressures (psi):** flowing wellhead pressure, flowline pressure, separator pressure and, for ESP wells, intake and discharge pressure from the drive or downhole gauge. For gas lift wells, record injection pressure and casing pressure.
5. **Temperatures:** wellhead and separator temperature.
6. **Choke and lift settings:** choke size in 64ths of an inch, ESP frequency and motor amps, or gas lift injection rate, taken at the start and end of the test.

Calculated results:

7. GOR is calculated as the gas rate in scf divided by the oil rate in bbl, using the average over the test period.
8. The test rates are the averages over the valid test period, excluding any interval where the separator was upset or the well was unstable.
9. If separator level or pressure control is lost for more than 10 minutes, mark that interval as invalid and extend the test accordingly.

## Sand and BS&W sampling

1. Take a minimum of three liquid samples per test, at the start, middle and end of the test period, from the sample point downstream of the separator oil outlet.
2. Use clean, labelled sample bottles. Label with the well name, date, time, choke size and the sampler role.
3. Determine BS&W by the centrifuge method on site. Record each result in percent and report the average. Where the samples show free water separation or emulsion, record this as a note.
4. Sand is measured with the sand monitor, where fitted, and with a sand trap or filter sample at the separator. Report sand in ppm.
5. For Bayda wells, take one additional sample at the end of the test through the sand trap and note the visual size and colour of the solids.
6. Sand thresholds:
   - Below 10 ppm: normal, no action.
   - 10 to 50 ppm: report to the Production Engineer in the test report and increase monitoring.
   - Above 50 ppm: notify the Production Engineer and the Lead Operator immediately, and consider reducing the choke. Do not open the choke to chase rate.
7. Drain and flush the separator sand jets after any test with sand above 10 ppm, and record the quantity removed.
8. Handle all samples in line with the HSE Advisor's instructions for hydrocarbon and solids handling, including appropriate gloves and eye protection.

## Data validation against allocation

1. Within 24 hours of test completion, the Production Engineer compares the test results with the allocation system for the same well.
2. Compare the test oil rate with the allocated oil rate for the days preceding the test. The test is accepted if the difference is within 10 percent. A difference between 10 and 20 percent requires a documented explanation. A difference above 20 percent means the test is rejected until the cause is understood.
3. Compare the test water cut with the allocation water cut. A difference above 5 percentage points requires review.
4. Compare the test GOR with the previous valid test. A change above 25 percent requires a check of the gas meter, the lift gas allocation and the well conditions.
5. Check that the sum of all well tests, scaled by the well uptime, is within 5 percent of the CPF-1 metered totals over the same month. If not, the Production Engineer and the Field Engineer review the meters and factors.
6. Typical causes of a mismatch are unstable flow, an expired meter calibration, incorrect shrinkage factors, lift gas not accounted for, and a leaking header valve. Investigate these before rejecting a test.
7. Accepted tests update the well baseline in the allocation system. Rejected tests are filed with the reason and are not used for allocation.

## Test report contents

Each test report is issued by the Production Engineer within 48 hours of test completion and must contain:

1. Well name, field, well type, lift method and the report date in YYYY-MM-DD format.
2. Test start and end times, stabilisation duration and valid test duration.
3. Choke size (64ths of an inch), lift settings and flowing wellhead pressure at start and end.
4. Average oil rate (bbl/d), gas rate (Mscf/d), water rate and water cut (percent), and GOR.
5. Separator pressure and temperature, and the other pressures recorded.
6. BS&W results from each sample, the average, and the sand result in ppm.
7. Comparison with the previous valid test and with the allocated rates, with the percentage differences.
8. Validation outcome: accepted, accepted with comment, or rejected, with the reason.
9. Operational observations such as slugging, emulsion, separator upsets, instrument issues and any deviations from this procedure.
10. A recommendation, for example continue as is, re-test, adjust choke or lift, investigate sand, or plan a well intervention.
11. Sign-off by the Lead Operator, the Production Engineer and, where the test was rejected or flagged, the Production Supervisor.

Reports are stored in the well file and a copy is sent to the Production Supervisor and the Field Engineer.
