console.log("D3 CO2 map script loaded!");
console.log("D3 version:", d3.version);

// ==============================
// SVG SETUP & MAP PROJECTION
// ==============================

// Overall SVG size (should match #map-container width in CSS)
const width = 1000;
const height = 650;

// Create the main SVG inside the map container
const svg = d3.select("#map-container")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

// Map projection (Natural Earth)
const projection = d3.geoNaturalEarth1()
  .scale(160)                          // zoom level
  .translate([width / 2, height / 2]); // center in the SVG

// Path generator based on the projection
const path = d3.geoPath().projection(projection);

// ==============================
// LOAD DATA (GEOJSON + CSV)
// ==============================

Promise.all([
  d3.json("data/world.geojson"),                   // country shapes
  d3.csv("data/GCB2022v27_percapita_flat.csv")    // per-capita CO2 data
]).then(([world, data]) => {
  console.log("World GeoJSON loaded");
  console.log("Raw CSV rows:", data.length);

  // ------------------------------
  // DATA CLEANING & FILTERING
  // ------------------------------

  // Convert numeric fields from strings to numbers
  data.forEach(d => {
    d.Year = +d.Year;
    d.Total = +d.Total;
    d.Coal = +d.Coal;
    d.Oil = +d.Oil;
    d.Gas = +d.Gas;
    d.Cement = +d.Cement;
    d.Flaring = +d.Flaring;
    d.Other = +d.Other;
  });

  // Keep only data from 1900 onwards
  const data1900plus = data.filter(d => d.Year >= 1900);

  // Get list of unique years and sort them ascending
  const years = Array.from(new Set(data1900plus.map(d => d.Year)))
    .sort((a, b) => a - b);

  console.log("Filtered rows (from 1900):", data1900plus.length);
  console.log("Year range (filtered):", years[0], "to", years[years.length - 1]);

  // ------------------------------
  // INITIAL YEAR & STATE
  // ------------------------------

  // Latest available year in the dataset (e.g., 2021)
  const initialYear = years[years.length - 1];
  console.log("Initial year:", initialYear);

  // These will track the year + data currently shown on the map (for tooltip)
  let currentYear = initialYear;
  let currentYearData = null;

  // ------------------------------
  // YEAR SLIDER SETUP (HTML INPUT)
  // ------------------------------

  const yearSlider = document.getElementById("year-slider");
  const yearLabel = document.getElementById("year-label");

  // Configure slider range based on available years
  yearSlider.min = years[0];
  yearSlider.max = years[years.length - 1];
  yearSlider.step = 1;
  yearSlider.value = initialYear;

  // Initial label text
  yearLabel.textContent = initialYear;

  // ------------------------------
  // HELPER: Data lookup by year
  // ------------------------------

  /**
   * Returns a Map(ISO3 -> per-capita Total) for the given year.
   */
  function getDataByYear(year) {
    const filtered = data1900plus.filter(d => d.Year === year && !isNaN(d.Total));
    const map = new Map();
    filtered.forEach(d => {
      // Use ISO 3166-1 alpha-3 as key, e.g. "AFG"
      map.set(d["ISO 3166-1 alpha-3"], d.Total);
    });
    return map;
  }

  // ------------------------------
  // COLOR SCALE (GLOBAL, 1900+)
  // ------------------------------

  // All per-capita values from 1900 onwards (ignoring NaNs)
  const allValues = data1900plus
    .map(d => d.Total)
    .filter(v => !isNaN(v))
    .sort(d3.ascending);

  // 99th percentile to reduce influence of extreme outliers
  const p99 = d3.quantile(allValues, 0.99);
  console.log("99th percentile per-capita CO2 (1900+):", p99);

  // Sequential color scale from 0 to p99, clamped
  // Same scale is used for ALL years so colors are comparable over time.
  const colorScale = d3.scaleSequential()
    .domain([0, p99])          // 0 to 99th percentile
    .interpolator(d3.interpolateReds)
    .clamp(true);              // values above p99 get max red

  // ==============================
  // COLOR LEGEND
  // ==============================

  const legendWidth = 300;
  const legendHeight = 20;

  // Definitions for gradient (for legend color bar)
  const defs = svg.append("defs");

  const gradient = defs.append("linearGradient")
    .attr("id", "legend-gradient")
    .attr("x1", "0%")
    .attr("x2", "100%")
    .attr("y1", "0%")
    .attr("y2", "0%");

  // Create gradient stops from 0 to 1, mapping through colorScale
  gradient.selectAll("stop")
    .data(d3.ticks(0, 1, 10))
    .enter()
    .append("stop")
    .attr("offset", d => (d * 100) + "%")
    .attr("stop-color", d => colorScale(d * p99));

  // Group for legend: centered horizontally, near the bottom of the SVG
  const legendGroup = svg.append("g")
    .attr("id", "legend")
    .attr("transform", `translate(${(width - legendWidth) / 2}, ${height - 40})`);

  // Colored rectangle representing the scale
  legendGroup.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .style("fill", "url(#legend-gradient)");

  // Numeric axis for the legend (same domain as colorScale)
  const legendScale = d3.scaleLinear()
    .domain([0, p99])
    .range([0, legendWidth]);

  const legendAxis = d3.axisBottom(legendScale)
    .ticks(5);

  // Axis below the color bar
  legendGroup.append("g")
    .attr("transform", `translate(0, ${legendHeight})`)
    .call(legendAxis);

  // Legend title
  legendGroup.append("text")
    .attr("x", legendWidth / 2)
    .attr("y", -6)
    .attr("text-anchor", "middle")
    .attr("font-size", 12)
    .text("Per-capita CO₂ emissions (t / person)");

  // ==============================
  // MAP DRAWING + TOOLTIP
  // ==============================

  const tooltip = d3.select("#tooltip");

  // Draw country shapes once; we'll only update their fill colors later
  const countries = svg.append("g")
    .selectAll("path")
    .data(world.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("stroke", "#999999");

  // Tooltip interactions
  countries
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1);
    })
    .on("mousemove", (event, d) => {
      const iso3 = d.id;                          // ISO-3 country code from GeoJSON
      const countryName = d.properties.name || iso3;

      let value = null;
      if (currentYearData) {
        value = currentYearData.get(iso3);
      }

      let html;
      if (value == null || isNaN(value)) {
        html = `
          <strong>${countryName}</strong><br/>
          Year: ${currentYear}<br/>
          No data
        `;
      } else {
        html = `
          <strong>${countryName}</strong><br/>
          Year: ${currentYear}<br/>
          ${value.toFixed(2)} t CO₂ per person
        `;
      }

      tooltip
        .html(html)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY + 10) + "px");
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
    });

  // ==============================
  // MAP UPDATE FUNCTION (ANIMATION)
  // ==============================

  /**
   * Updates the map coloring for a given year.
   * Uses a transition for smooth animation.
   */
  function updateMap(year) {
    currentYear = year;
    currentYearData = getDataByYear(year);
    console.log("Updating map for year:", year);

    countries
      .transition()
      .duration(500)
      .attr("fill", d => {
        const iso3 = d.id;
        const value = currentYearData.get(iso3);
        if (value == null || isNaN(value)) {
          return "#eeeeee"; // no data
        }
        return colorScale(value);
      });
  }

  // Initial render for the latest year
  updateMap(initialYear);

  // ==============================
  // SLIDER INTERACTION
  // ==============================

  // When the slider moves, update label and map
  yearSlider.addEventListener("input", () => {
    const year = +yearSlider.value;
    yearLabel.textContent = year;
    updateMap(year);
  });

}).catch(error => {
  console.error("Error loading data:", error);
});
