# Global Per-Capita CO₂ Emissions Choropleth Map (1900–2021)

This project visualizes per-capita CO₂ emissions by country using a D3-based interactive choropleth map.  
Users can explore how emissions have changed over time using a year slider, with smooth animated transitions and hover tooltips for detailed information.

---

## Dataset

- **Source:** Global Carbon Budget 2022  
- **File used:** `GCB2022v27_percapita_flat.csv`
- **Variables:**
  - `Country`
  - `ISO 3166-1 alpha-3` — used to match CSV records to GeoJSON features
  - `Year` — filtered to values ≥ 1900  
  - `Total` — per-capita CO₂ emissions (tons CO₂ per person)

GeoJSON world map from:  
`world.geojson` (Holtzy D3 gallery)

Numeric fields were converted to numbers using `+d.FieldName` inside D3.

---

## Type of Visualization

### **Choropleth Map**
A geographic visualization where each country is colored based on its per-capita CO₂ emissions.

---

## Visual Encodings

### Marks
- SVG `<path>` elements representing country shapes.

### Channels

| Data Variable      | Visual Channel | Description |
|--------------------|----------------|-------------|
| Country            | Spatial position | Geographic location encoded with a map projection |
| Per-capita CO₂     | Color (sequential) | Darker red indicates higher emissions |
| Year               | Animation / state | Map updates when the slider is moved |

### Scales
- **Geographic projection:** `d3.geoNaturalEarth1()`
- **Color scale:**  
  `d3.scaleSequential(d3.interpolateReds)` with domain `[0, p99]`, where `p99` is the **99th percentile** of all emissions between 1900–2021.  
  - Percentile cut avoids distortion from extreme outliers  
  - `.clamp(true)` caps values above the scale  
  - **Global scale is constant across all years**, ensuring consistent interpretation over time
- **Year scale:** slider from min year (1900) to max year (e.g., 2021)

### Legend
- Horizontal gradient bar
- Numeric tick marks
- Label: **Per-capita CO₂ emissions (t / person)**

---

## Interaction Features

### ✔ Year Slider
- Allows selection of any year from 1900–2021  
- Smooth animated transitions update the map color

### ✔ Tooltip (Details-on-Demand)
On hover:
- Country name
- Selected year
- Per-capita CO₂ value (formatted to two decimals)
- “No data” message when applicable

### ✔ Animated updates
- Country fill colors transition using `selection.transition().duration(500)`

---

## Design Choices

- Per-capita emissions chosen to avoid population bias present in absolute totals.  
- Natural Earth projection selected for readability and balanced world proportions.  
- Consistent global color scale ensures meaningful year-to-year comparison.  
- Using a 99th percentile cutoff prevents a small number of extreme values from flattening the scale.  
- Minimalist layout: centered title, controls, map, tooltip, and legend for visual clarity.

---

## Project Structure

/index.html → HTML structure, slider, tooltip container

/css/style.css → Layout styling, centering, tooltip design

/js/script.js → D3 logic: data loading, scales, map, interactivity

/data/*.csv → CO₂ dataset

/data/world.geojson → Country boundary shapes



---

## Use of AI Tools

ChatGPT was used to:
- Break down the assignment into incremental steps  
- Help structure D3 code (data loading, update functions, tooltips, legend)  
- Assist in debugging layout and styling   
- Draft documentation text for README based on our conversation 

All generated code and explanations were reviewed, adapted, and integrated me.

---
