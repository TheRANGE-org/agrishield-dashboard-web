# May 14th Canyon Fire Event Readings Interpretation

> Based on screenshot of 7-day period graphs from the agrishield.landmanager.io dashboard.

The May 14 event stands out clearly, and the **PM2.5 spike and VOC resistance drop appear to line up in a way that supports your hypothesis**.

Here’s what I see:

### 1. PM2.5 shows a very distinct May 14 smoke/particulate event

In the **PM2.5** chart, most of the period is near baseline, with low values around roughly 0–10 µg/m³. Then on **May 14**, there is a sharp, narrow event where PM2.5 rises rapidly into the **30–45 µg/m³ range**, with the peak line appearing higher.

That is a very clean particulate event compared with the surrounding days.

There are also very tall dashed “peak” spikes around May 13 and May 14, but the May 14 sustained red PM2.5 rise looks more meaningful than a single-sample peak artifact.

### 2. VOC resistance shows a low-resistance trough around the same period

In the **VOC Resistance** chart, the BME688 resistance has a strong daily cycle: it rises and falls with temperature/humidity patterns. That makes interpretation trickier.

But around the May 14 PM2.5 event, the VOC resistance appears to be in or near one of its **lowest troughs**, close to the bottom of the chart. Then after the event window, VOC resistance rises sharply again.

That pattern is consistent with:

```text
PM2.5 rises sharply
VOC resistance is depressed / near low point
then VOC resistance recovers afterward
```

That is exactly the direction we would expect if combustion-related reducing gases or VOC-like compounds were present: **PM up, gas resistance down**.

### 3. Humidity is a possible confounder, but it does not fully explain the event

Humidity changes strongly over the full period, and the VOC resistance chart seems to have a large diurnal/humidity-related rhythm. On many days, VOC resistance rises and falls even without a PM2.5 event.

So I would not say “VOC resistance drop proves smoke” from this graph alone.

But the May 14 case is more interesting because the VOC low coincides with an independent particulate event. The PM2.5 chart gives you the primary smoke signal; the VOC resistance behavior appears to be a **corroborating gas-phase signal**, not the primary detector.

### 4. Wind gusts may support plume arrival

The **Wind Gust** chart shows higher wind activity on May 14–15 than earlier in the period. Around May 14, wind gusts increase substantially. If the known fire was southwest of the detector, the next thing to check is wind direction, not just gust speed.

If wind direction during the PM/VOC event was generally from the southwest, that would make the correlation much stronger.

### 5. CO₂ does not appear to spike in the same obvious way

The **CO₂** chart does not show a clean May 14 spike that mirrors the PM2.5 event. It appears to continue its broader daily rhythm and even trends lower around parts of May 14.

That is not surprising. A distant wildfire plume 14 miles away may produce a strong PM2.5 signal without a clear CO₂ signal, especially outdoors where CO₂ is heavily diluted and affected by local mixing.

### My read on the May 14 event

I would classify this as:

```text
Strong PM2.5 event: yes
VOC resistance correlation: likely / supportive
CO₂ correlation: weak or not visible
Wind support: possible, needs wind direction
Humidity confounding: present, needs baseline correction
```

The most important thing I see is that **the May 14 PM2.5 event occurs while VOC resistance is near a pronounced low, and then the VOC resistance recovers after that period**. That is a meaningful correlation candidate.

I would label it in your data model as something like:

```text
May 14 event:
- Particulate plume detected by SPS30
- Concurrent BME688 low-resistance gas response
- Candidate smoke plume / combustion event
- Requires humidity-normalized VOC resistance ratio and wind-direction confirmation
```

The next analysis I’d do is not raw VOC resistance vs raw PM2.5. I’d compute:

```text
VOC resistance / rolling daily baseline
PM2.5 / rolling daily baseline
```

Then check whether the **PM2.5 ratio rises while the VOC resistance ratio drops** during the same 30–90 minute event window. That will separate true event correlation from the normal daily BME688 cycle.
