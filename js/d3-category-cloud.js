document.addEventListener("DOMContentLoaded", function () {
    if (typeof d3 === "undefined") {
        console.warn("D3.js not loaded.");
        return;
    }

    const containerId = "d3-category-cloud";
    const container = document.getElementById(containerId);

    if (!container) return;

    // Retrieve data from global variable
    const rawData = window.BARDC_CATEGORY_DATA || [];
    if (rawData.length === 0) return;

    // Configuration
    // Configuration
    let width = container.clientWidth || window.innerWidth;
    // Dynamic height: Taller on mobile to fit vertical stacking, wider/shorter on desktop
    let height = width < 768 ? 650 : 500;

    // Clear any existing content
    container.innerHTML = "";

    // Update container style to match height
    container.style.height = height + "px";
    container.style.minHeight = height + "px";

    // Prepare data
    const counts = rawData.map(d => d.count);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);

    // Radius scale: Larger bubbles for better readability
    // Adjust base size on screen width
    const isMobile = width < 768;
    const minR = isMobile ? 25 : 35;
    const maxR = isMobile ? 70 : 110;

    const radiusScale = d3.scaleSqrt()
        .domain([minCount, maxCount])
        .range([minR, maxR]);

    // Color scale
    const siteColors = [
        "#e53935", "#fdd835", "#03a9f4", // Primary
        "#ef5350", "#ffee58", "#29b6f6", // Light
        "#c62828", "#0277bd"             // Dark
    ];
    const colorScale = d3.scaleOrdinal(siteColors);

    const nodes = rawData.map(d => ({
        ...d,
        r: radiusScale(d.count),
        x: Math.random() * width,
        y: Math.random() * height,
        slug: d.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    }));

    // Create SVG
    const svg = d3.select(container)
        .append("svg")
        .attr("width", "100%")
        .attr("height", height)
        .attr("style", "overflow: visible; display: block;");

    // Simulation
    // Stronger repulsion to prevent clustering in center
    // Weak center force to keep them loosely in view but not bunched
    const simulation = d3.forceSimulation(nodes)
        .velocityDecay(0.18) // Just enough friction to prevent chaos but allow floating
        .force("charge", d3.forceManyBody().strength(isMobile ? -30 : -60)) // High repulsion
        .force("x", d3.forceX(width / 2).strength(0.012)) // Very weak X pull
        .force("y", d3.forceY(height / 2).strength(0.015)) // Very weak Y pull
        .force("collide", d3.forceCollide().radius(d => d.r + 3).strength(0.8).iterations(2))
        .alphaTarget(0.05); // Continuous movement

    // Render Nodes (same as before)
    const node = svg.selectAll(".node")
        .data(nodes)
        .join("a")
        .attr("class", "node")
        .attr("href", d => `/categories/${d.slug}/`)
        .attr("target", "_self")
        .style("text-decoration", "none"); // Fix link style

    // Circles
    const circles = node.append("circle")
        .attr("r", d => d.r)
        .attr("fill", d => colorScale(d.name))
        .attr("fill-opacity", 0.9) // Higher opacity
        .attr("stroke", "#fff")
        .attr("stroke-width", 2)
        .style("transition", "fill-opacity 0.2s ease")
        .on("mouseover", function () {
            d3.select(this)
                .attr("fill-opacity", 1)
                .attr("stroke", "#333")
                .attr("cursor", "pointer");
        })
        .on("mouseout", function () {
            d3.select(this)
                .attr("fill-opacity", 0.9)
                .attr("stroke", "#fff");
        });

    // Labels
    const labels = node.append("text")
        .text(d => d.name)
        .attr("text-anchor", "middle")
        .attr("dy", ".3em")
        .style("fill", d => {
            const bg = colorScale(d.name);
            // Text color logic: Use dark text for yellow backgrounds, white for others
            const yellows = ["#fdd835", "#ffee58"];
            return yellows.includes(bg) ? "#121212" : "#ffffff";
        })
        .style("font-family", "Poppins, sans-serif")
        .style("font-weight", "600")
        .style("text-shadow", d => {
            const bg = colorScale(d.name);
            const yellows = ["#fdd835", "#ffee58"];
            // Reduced shadow for dark text on yellow to avoid muddy look
            return yellows.includes(bg) ? "none" : "0px 1px 2px rgba(0,0,0,0.5)";
        })
        .style("pointer-events", "none")
        .style("font-size", d => {
            const r = d.r;
            const len = d.name.length;
            // Formula: width available (1.8r) / (char count * approx char width 0.6em)
            // fontSize = (1.8 * r) / (len * 0.6) = 3 * r / len
            // We cap the font size at 0.5 * r to keep short words nice
            let size = Math.min(r * 0.5, (2.9 * r) / len);

            return Math.max(11, size) + "px";
        });

    // Tick
    simulation.on("tick", () => {
        // Add slight random noise to prevent stagnation
        nodes.forEach(d => {
            d.vx += (Math.random() - 0.5) * 0.2;
            d.vy += (Math.random() - 0.5) * 0.2;
        });

        node.attr("transform", d => {
            // Soft bounds to keep them roughly on screen
            const buffer = 0;
            d.x = Math.max(d.r - buffer, Math.min(width - d.r + buffer, d.x));
            d.y = Math.max(d.r - buffer, Math.min(height - d.r + buffer, d.y));
            return `translate(${d.x},${d.y})`;
        });
    });

    // Drag behavior
    node.call(d3.drag()
        .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
        })
        .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
        })
        .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
        }));

    // Handle Resize
    // Debounce resize to avoid excessive calculations
    let resizeTimeout;
    window.addEventListener("resize", () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const newWidth = container.clientWidth;
            if (newWidth === width) return;

            width = newWidth;

            // Update forces to new center
            simulation.force("x", d3.forceX(width / 2).strength(0.012));
            simulation.force("y", d3.forceX(height / 2).strength(0.015));

            // Update canvas height if needed (e.g. orientation change) - refreshing might be needed if dramatic change
            // For now, just centering update is efficient

            // Wake up simulation
            simulation.alpha(0.3).restart();
        }, 200);
    });
});
