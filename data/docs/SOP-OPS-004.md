---
doc_id: SOP-OPS-004
doc_type: procedure
well_id: null
field: null
date: 2025-10-20
title: SOP-OPS-004 Well Test Procedure with the Mobile Test Separator
---

# SOP-OPS-004 Well Test Procedure with the Mobile Test Separator

| Field | Detail |
|---|---|
| Procedure ID | SOP-OPS-004 |
| Revision date | 2025-10-20 |
| Applies to | All three fields: Dune Field, Wadi Field and Salt Flat Field |
| Owner | Production Engineer |
| Users | Lead Operator, Night Lead Operator, Field Engineer, HSE Advisor |

## Purpose and scope

1. This procedure sets out how a single well is tested with the mobile test separator so that oil, gas and water rates are measured consistently across the asset.
2. It applies to all producing wells in Dune Field, Wadi Field and Salt Flat Field, whatever the lift method (ESP, gas lift or natural flow) and well type (vertical, deviated or horizontal). Fluids from the test separator return to the CPF-1 inlet system after measurement.
3. Test results are used for:
   - well performance monitoring and decline tracking;
   - water cut trending, particularly on wells under water flood;
   - GOR monitoring, particularly on high GOR wells;
   - sand monitoring, particularly on sand-prone wells;
   - back-allocation of CPF-1 production to individual wells.
4. Responsibilities:
   - The Lead Operator runs the test on shift and signs the test sheet.
   - The Night Lead Operator continues any test that spans shift change and records the handover.
   - The Production Engineer approves the test schedule and validates results.
   - The Field Engineer supports instrument checks and calibration.
   - The HSE Advisor confirms that the line-up, permits and gas handling are safe.
5. Work on hydrocarbon lines follows the site permit-to-work system. This procedure does not replace it.

## Test frequency per well

1. Every producing well is tested at least once per calendar month, with a valid test being one that meets the stabilisation and duration criteria below.
2. Higher frequencies apply to wells with a specific risk:

| Well category | Minimum frequency |
|---|---|
| Wells under water flood with rising water cut (Wadi Field) | Every 14 days |
| Sand-prone or high GOR wells (Salt Flat Field) | Every 14 days |
| ESP wells with unstable amps, intake pressure or vibration | Every 7 days until stable |
| Wells after workover, pump change, choke change or stimulation | Within 72 hours of restart, then monthly |
| All other producing wells | Every 30 days |

3. A well must also be retested when:
   - the previous test was rejected at validation;
   - the allocation factor for the field moves outside the limit in the validation section;
   - production on the well changes by more than 15 percent between two consecutive daily readings without a known cause;
   - the Production Engineer requests a retest.
4. Shut-in, suspended and workover wells are excluded from the schedule. They are added back at restart according to the post-restart rule above.
5. The Production Engineer issues the test schedule weekly. The Lead Operator may reorder tests for operational reasons but must inform the Production Engineer of any test that slips past its due date.

## Line-up and stabilisation

1. Before line-up:
   - confirm the test separator is on location, grounded and inspected, with relief valve certification in date;
   - confirm the level controls, gas meter, liquid meters and pressure transmitters are in calibration;
   - hold a pre-job safety meeting with the HSE Advisor or delegate, covering gas release, hot surfaces and manual valve operation;
   - confirm the permit-to-work is issued where required.
2. Line-up steps:
   1. Open the test header valve for the selected well and then close the well's production valve to the group header, following the valve sequence on the manifold sheet. Never close in the well against a blocked flow path.
   2. Set the test separator pressure at least 20 psi below the group header pressure so that flow is not backed up.
   3. Bring the separator to its working level and confirm level control is in automatic.
   4. Check the lines to the test separator outlets for leaks.
3. Record the starting conditions: choke size (in 64ths of an inch), wellhead pressure, flowline pressure and, for ESP wells, frequency, motor amps and intake pressure. For gas lift wells, record the injection rate and injection pressure.
4. Stabilisation:
   - Allow a minimum of 2 hours of flow before measurement starts. Allow 4 hours after a workover, pump change or choke change.
   - Stabilisation is reached when wellhead pressure varies by less than 5 percent, separator pressure by less than 3 percent and the liquid rate by less than 10 percent over the last 30 minutes.
   - If the well will not stabilise (slugging, gas locking, sand production or ESP trips), continue for up to 4 additional hours and note the behaviour. If it still has not stabilised, stop the test and inform the Production Engineer.
5. Do not change the choke, ESP frequency or gas lift rate during the test. If a change is unavoidable, restart stabilisation and note the time.
6. The measurement period is a minimum of 6 hours, or 12 hours for wells with slugging, high GOR or high water cut variability.

## Measurements: oil, gas, water cut, pressures

1. Read and log the following at 30-minute intervals during the measurement period:
   - separator pressure and temperature;
   - wellhead tubing pressure and casing pressure;
   - flowline pressure at the manifold;
   - gas meter totalised volume and flowing rate;
   - liquid meter totalised volume;
   - ESP data where applicable: frequency, motor amps, intake pressure, motor temperature and vibration.
2. Oil rate:
   - Calculate gross liquid from the liquid meter over the measurement period and scale to a 24-hour rate.
   - Apply the measured water cut to obtain net oil in bbl/d.
   - Correct for shrinkage and temperature using the factors on the test sheet.
3. Gas rate:
   - Read the gas meter totaliser at the start and end of the period and report in Mscf/d.
   - Apply the separator pressure and temperature corrections.
   - Calculate GOR as gas rate in Mscf/d divided by oil rate in bbl/d, then report it in scf/bbl (multiply by 1000).
4. Water cut:
   - Take a minimum of 4 samples during the measurement period, equally spaced, from the liquid outlet sampling point.
   - Determine the water cut by centrifuge on site and report it in percent. Use the average of the valid samples, and flag any sample that differs from the average by more than 3 percentage points.
   - If an online water cut meter is available, compare its reading with the centrifuge average and log the difference.
5. Pressures: log the wellhead pressure, separator pressure and flowline pressure in psi. For ESP wells also log intake pressure in psi.
6. If any instrument fails or goes out of range during the period, record the time, repair or replace the instrument and extend the measurement period by the duration of the lost data.

## Sand and BS&W sampling

1. Sand monitoring is mandatory on every test for sand-prone wells and for any well with a history of sand production. For all other wells it is done at least once per test as a check.
2. Sand sampling:
   - Take samples at the start, middle and end of the measurement period, from the sand trap or the dedicated sample point on the liquid outlet.
   - Use clean, labelled containers. Record well, date, time and sample point.
   - Determine sand content in ppm by filtration and weighing, or by the field sand kit.
3. Report the highest and the average sand value. If sand exceeds 50 ppm in any sample, inform the Production Engineer on the same shift. If the value exceeds 100 ppm, reduce the rate or choke down in consultation with the Production Engineer and check erosion-prone points on the flowline and choke.
4. BS&W:
   - Take BS&W samples with the water cut samples and report the BS&W in percent.
   - Where the BS&W differs from the centrifuge water cut by more than 2 percentage points, record the likely cause (emulsion, solids or sampling error) and repeat the sample.
5. Drain the sand trap after the test, measure the volume collected and record it in the test sheet. Handle and dispose of sand according to the site waste procedure.
6. Retain a labelled sample from each test for 30 days for the Production Engineer to review if needed.

## Data validation against allocation

1. After each test the Production Engineer compares the test results with the daily allocated rates for the same well.
2. Check the following:
   - Test oil rate versus allocated oil rate: acceptable agreement is within 10 percent.
   - Test gas rate versus allocated gas rate: acceptable agreement is within 15 percent.
   - Test water cut versus the previous test: investigate any change greater than 5 percentage points that is not explained by field behaviour.
3. Check the sum of well allocations against the CPF-1 metered totals. The field allocation factor should be between 0.95 and 1.05. A value outside this range triggers a review of the most recent tests and of the CPF-1 meters.
4. Validate the test with the following checks:
   - the stabilisation and duration criteria were met;
   - the instruments were in calibration;
   - the sample results are consistent with each other;
   - the gas and liquid mass balance is plausible.
5. Outcomes:
   - **Accepted:** the test becomes the current baseline for the well and updates the allocation key from the next day.
   - **Accepted with comment:** the test is used but the deviation is recorded.
   - **Rejected:** the test is not used. A retest is scheduled within 7 days, or sooner where the well is a priority.
6. Where a test is accepted and differs from the allocated rate by more than the limits above, the Production Engineer updates the allocation keys and records the effective date. Back-allocation of past days is only done with the approval of the Production Supervisor.

## Test report contents

1. The Lead Operator completes the test sheet and sends it to the Production Engineer within 24 hours of test completion. The report must contain:
   - well name, field, lift method and well type;
   - test start and end times, stabilisation time and measurement duration;
   - choke size (64ths of an inch), ESP frequency or gas lift rate where applicable;
   - pressures: wellhead, casing, flowline, separator and ESP intake, in psi;
   - measured gross liquid, oil in bbl/d, gas in Mscf/d, water cut in percent, and GOR;
   - sand results in ppm (highest and average) and BS&W in percent;
   - comparison with the previous accepted test: change in oil, gas, water cut and GOR;
   - ESP pump serial and batch where applicable, stated as a plain equipment detail;
   - abnormal events during the test (trips, slugging, instrument problems);
   - validation outcome and name of the reviewer by role;
   - recommendations, such as choke change, retest, chemical treatment, ESP optimisation or workover review.
2. The Production Engineer files the approved report in the well file within 3 working days and updates the well performance dashboard.
3. Reports that recommend a change in operating conditions are copied to the Production Supervisor.
4. Test sheets, raw meter logs and sample records are retained according to the site records procedure.
