# BME688 VOC Notes

“VOC resistance detection” usually refers to how a **metal-oxide gas sensor** detects volatile organic compounds by measuring a change in **electrical resistance**.

In sensors like the **Bosch BME688/BME680** or Sensirion VOC sensors, the sensing element is a heated metal-oxide surface. As VOCs and other gases interact with that surface, the sensor’s electrical resistance changes. Sensirion describes MOX sensors as heated metal-oxide surfaces whose resistance changes based on oxygen concentration at the surface. ([Sensirion AG][1]) Bosch says the BME688 can detect VOCs, volatile sulfur compounds, carbon monoxide, hydrogen, and other gases in the ppb range. ([Bosch Sensortec][2])

For practical use:

```text
Clean / baseline air → gas resistance stabilizes
VOC event occurs     → gas resistance changes
VOC event ends       → resistance slowly recovers toward baseline
```

For many reducing gases/VOCs, the sensor resistance often **drops** when VOC concentration rises. Oxidizing gases can push the response the other way; Sensirion notes that oxidizing gases like NOx increase resistance, while reducing gases tend to decrease it. ([Sensirion AG][3])

The important point: **gas resistance is not a direct ppm reading by itself.** It is a raw sensor signal. To detect VOC events, you usually compare the current resistance to a rolling baseline.

A simple detection approach would be:

```python
voc_ratio = current_gas_resistance / baseline_gas_resistance

if voc_ratio < 0.75:
    voc_event = True
else:
    voc_event = False
```

But for your wildfire / Agrishield use case, I would avoid a single threshold. I’d log:

```text
timestamp
temperature
humidity
pressure
gas_resistance_ohms
gas_resistance_baseline
gas_resistance_ratio
pm1 / pm2.5 / pm10 from SPS30
CO reading if available
wind speed / direction
```

Then treat VOC resistance as one signal in a **multi-sensor event model**, not as proof of smoke by itself. A drop in gas resistance plus rising particulates plus rising CO would be much stronger than VOC resistance alone.

A better first-pass event rule might look like:

```python
voc_drop = gas_resistance_ratio < 0.75
pm_rise = pm25 > rolling_pm25_baseline * 2.0
co_rise = co_ppm > rolling_co_baseline + 5

if voc_drop and (pm_rise or co_rise):
    smoke_possible = True
```

A few practical cautions:

VOC resistance is affected by **humidity, temperature, sensor warm-up, airflow, and contamination**. Bosch’s BME680/BME688 datasheets include compensated gas resistance calculations, but the output is still a broad air-quality signal rather than chemical identification. ([Bosch Sensortec][4])

For field deployment, I’d use a **rolling baseline** rather than a fixed ohm value. Something like a 6-hour or 24-hour median baseline will be more robust than saying “below 50kΩ means VOCs,” because each sensor and enclosure will behave differently.

For your application, the best interpretation is:

> **VOC resistance is a useful early-warning trend signal. It can help detect a chemical/combustion-related air-quality event, but it should be fused with particulate, CO, humidity, temperature, and wind data before classifying the event as smoke or wildfire-related.**

[1]: https://sensirion.com/products/catalog/nox-voc-sensors?utm_source=chatgpt.com "NOx & VOC sensors"
[2]: https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bme688-ds000.pdf?utm_source=chatgpt.com "BME688 Datasheet"
[3]: https://sensirion.com/media/documents/A056FE9C/671A0DE5/SE_Flyer_Gas_Sensors_EN_web_241016.pdf?utm_source=chatgpt.com "Reliable VOC and NOx monitoring"
[4]: https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bme680-ds001.pdf?utm_source=chatgpt.com "BME680 Datasheet"

Yes — based on what you described, I would consider the BME688 resistance drop a **credible correlating factor**, especially because it coincided with a strong SPS30 particulate event during a known fire ~14 miles southwest of the detector.

The key interpretation is:

> **A sharp SPS30 particulate rise + simultaneous BME688 gas resistance drop is consistent with smoke/combustion plume exposure, but the BME688 alone cannot prove “VOC from wildfire.”**

The BME688 is a **MOX gas sensor**, so its raw “gas resistance” changes when reactive gases interact with the heated sensing surface. Bosch describes the BME688 as detecting VOCs and other gases including carbon monoxide and hydrogen in the low ppb range, but it is not chemically selective by itself. ([PMC][1])

For wildfire smoke, that matters because smoke is not just particulates. It commonly includes **PM2.5, CO, VOCs, nitrogen oxides, sulfur oxides, and other compounds**. EPA’s wildfire smoke monitoring work treats PM2.5 as the primary measurement, with CO, tVOCs, and black carbon as useful supplemental measurements in multipollutant systems. ([US EPA][2]) NOAA also describes wildfire smoke as a chemically complex mixture including particulate matter, carbon monoxide, nitrogen oxides, sulfur oxides, and other pollutants. ([Climate.gov][3])

So, in your case, the likely pattern is:

```text
Fire plume reaches node
        ↓
SPS30 sees particulate rise
        ↓
BME688 gas resistance drops
        ↓
Interpretation: combustion-related gas signal likely accompanied the particulate event
```

The caveat is important: the BME688 resistance drop may be responding to **wildfire VOCs**, but it may also be responding to **CO, hydrogen, humidity shifts, or a mixture of reducing gases** associated with combustion. That is still useful. For your use case, you do not necessarily need to identify the exact compound; you need to know whether the air chemistry changed in a way that reinforces the particulate signal.

I would analyze the May 14 event this way.

First, normalize the BME688 resistance against a rolling baseline:

```python
gas_ratio = gas_resistance_ohms / rolling_baseline_gas_resistance
gas_drop_pct = (1 - gas_ratio) * 100
```

Then compare it against SPS30 PM2.5 or PM1.0:

```python
pm25_ratio = pm25 / rolling_baseline_pm25
```

For the fire event, look for this pattern:

```text
PM2.5 or PM1.0 rises sharply
BME688 gas resistance drops sharply
The two events occur within the same time window
Both recover after the plume passes
```

If that is what your graphs show, I would call it a **positive correlation event**.

For your detector logic, I would not use an absolute VOC resistance threshold. I would use a **relative drop from local baseline**, something like:

```python
voc_like_event = gas_resistance_ohms < rolling_baseline_gas_resistance * 0.75
```

But I would make the smoke inference only when particulate also moves:

```python
pm_event = pm25 > rolling_baseline_pm25 * 2.0
gas_event = gas_resistance_ohms < rolling_baseline_gas_resistance * 0.75

if pm_event and gas_event:
    classification = "probable smoke plume"
elif pm_event:
    classification = "particulate event"
elif gas_event:
    classification = "gas/VOC-like event"
else:
    classification = "normal"
```

For your May 14 event, I would add these derived columns to the log:

```text
pm1_baseline
pm25_baseline
pm10_baseline
pm25_ratio
bme688_resistance_baseline
bme688_resistance_ratio
bme688_resistance_drop_pct
temperature_delta
humidity_delta
wind_direction
wind_speed
distance_to_known_fire
bearing_to_known_fire
```

The most useful confirmation would be a **lag/correlation analysis**. For each known fire event, compare SPS30 PM2.5 and BME688 gas resistance with time shifts of, say, ±60 minutes:

```text
lag -30 min
lag -20 min
lag -10 min
lag 0 min
lag +10 min
lag +20 min
lag +30 min
```

Because gas resistance drops while particulates rise, the correlation may appear as a **negative correlation**:

```text
PM2.5 up  → BME688 resistance down
```

So you are not looking for both lines to move upward together. You are looking for **PM rising while resistance falls**.

A practical smoke-confidence score could look like this:

```python
score = 0

if pm25_ratio >= 2.0:
    score += 40

if bme688_resistance_ratio <= 0.75:
    score += 25

if co_ppm_available and co_ppm > co_baseline + 3:
    score += 20

if wind_bearing_matches_fire_source:
    score += 10

if humidity_changed_abruptly:
    score -= 10
```

Then:

```text
0–30   normal / weak signal
31–60  possible smoke
61–80  probable smoke
81+    strong smoke plume event
```

For your specific observation, my conclusion would be:

**The BME688 resistance drop is very likely a useful correlating factor for the May 14 smoke event. I would not label it “VOC detection” by itself; I would label it “combustion gas / VOC-like resistance response.” When paired with a strong SPS30 particulate spike and known fire location/timing, it materially strengthens the smoke-event classification.**

[1]: https://pmc.ncbi.nlm.nih.gov/articles/PMC9460900/?utm_source=chatgpt.com "Volatile Organic Compound Monitoring during Extreme Wildfires"
[2]: https://www.epa.gov/air-sensor-toolbox/wildfire-smoke-air-monitoring-response-technology-wsmart?utm_source=chatgpt.com "Wildfire Smoke Air Monitoring Response Technology ..."
[3]: https://www.climate.gov/news-features/features/unmasking-complicated-chemistry-wildfire-smoke-how-far-have-scientists-come?utm_source=chatgpt.com "Unmasking the complicated chemistry of wildfire smoke"
