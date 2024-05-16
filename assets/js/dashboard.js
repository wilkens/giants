async function fetchData() {
  try {
    const response = await d3.json(
      'https://stilesdata.com/dodgers/data/standings/dodgers_standings_1958_present_optimized.json'
    );
    // Group data by year
    const groupedByYear = d3.group(response, (d) => d.year);
    renderChart(groupedByYear);
  } catch (error) {
    console.error('Failed to fetch data:', error);
  }
}

function renderChart(data) {
  const isMobile = window.innerWidth <= 767; // Example breakpoint for mobile devices
  const margin = isMobile 
    ? { top: 20, right: 0, bottom: 60, left: 60 }  // Smaller margins for mobile
    : { top: 40, right: 0, bottom: 50, left: 60 }; // Larger margins for desktop
  const container = d3.select('#d3-container');
  const containerWidth = container.node().getBoundingClientRect().width;
  const width = containerWidth - margin.left - margin.right;
  const height = isMobile 
  ? Math.round(width * 1) - margin.top - margin.bottom  // Taller  for mobile
  : Math.round(width * 0.5) - margin.top - margin.bottom; // 2x1 ratio for desktop

  const svg = container
    .append('svg')
    .attr('viewBox', `0 0 ${containerWidth} ${height + margin.top + margin.bottom}`)
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const xScale = d3
    .scaleLinear()
    .domain([0, 166])
    .range([0, width]);

  const yScale = d3
    .scaleLinear()
    .domain([
      d3.min(Array.from(data.values()).flat(), (d) => d.gb),
      d3.max(Array.from(data.values()).flat(), (d) => d.gb),
    ])
    .range([height, 0]);

    const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(d3.format('d'));
    const yAxis = d3.axisLeft(yScale).ticks(6);
  
    svg
      .append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(xAxis);
  
    svg.append('g').call(yAxis);
  
    // X-axis Label
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr('class', 'anno-dark')
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 10)
      .text("Game number in season");
  
    // Y-axis Label
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr('class', 'anno-dark')
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 20)
      .attr("x", -height / 2)
      .text("Games up/back");

  // Append axes to SVG
  svg
    .append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(xAxis)
    .selectAll('line') // Select all lines which includes ticks and optionally grid lines
    .style('stroke', '#ddd'); // Light gray for a softer look

  svg.append('g').call(yAxis).selectAll('line').style('stroke', '#ddd');

  svg
    .selectAll('.domain') // This selects the domain line of the axes
    .style('stroke', '#e9e9e9'); // Light grey color

  const line = d3
    .line()
    .x((d) => xScale(d.gm))
    .y((d) => yScale(d.gb))
    .curve(d3.curveMonotoneX); // Smooth the line

  // Draw all lines except 2024 first
  const allLinesExcept2024 = Array.from(data.entries()).filter(
    (d) => d[0] !== '2024'
  );
  svg
    .selectAll('.line')
    .data(allLinesExcept2024, (d) => d[0])
    .enter()
    .append('path')
    .attr('class', 'line')
    .attr('d', (d) => line(d[1]))
    .style('fill', 'none')
    .style('stroke', '#ccc')
    .style('stroke-width', 0.5);

  const line2024 = Array.from(data.entries()).filter((d) => d[0] === '2024');
  svg
    .selectAll('.line-2024')
    .data(line2024, (d) => d[0])
    .enter()
    .append('path')
    .attr('class', 'line')
    .attr('d', (d) => line(d[1]))
    .style('fill', 'none')
    .style('stroke', '#005A9C')
    .style('stroke-width', 2);

  // Add a horizontal line at y = 0
  svg
    .append('line')
    .attr('x1', 0)
    .attr('x2', isMobile ? width-7 : width-18)
    .attr('y1', yScale(0))
    .attr('y2', yScale(0))
    .attr('stroke', '#222')
    .attr('stroke-width', 1);

  // Add the 'Leading' annotation
  svg
    .append('text')
    .attr('x', isMobile ? xScale(130) : xScale(150)) // Adjusted for mobile
    .attr('y', yScale(0) - 10)
    .text('Leading ↑')
    .attr('class', 'anno-dark')
    .style('stroke', '#fff')
    .style('stroke-width', '4px')
    .style('stroke-linejoin', 'round')
    .attr('text-anchor', 'start')
    .style('paint-order', 'stroke')
    .clone(true)
    .style('stroke', 'none');

  // Add the 'Past ' annotation
  svg
    .append('text')
    .attr('x', isMobile ? xScale(80) : xScale(110)) // Adjusted for mobile
    .attr('y', yScale(22))
    .attr('class', 'anno')
    .text('Past: 1958-2023')
    .attr('text-anchor', 'start');

  const lastData2024 = data.get('2024').slice(0)[0];
  console.log(lastData2024);

  svg
    .append('text')
    .attr('x', xScale(lastData2024.gm + 1))
    .attr('y', yScale(lastData2024.gb) - 12)
    .text('2024')
    .attr('class', 'anno-dodgers')
    .style('stroke', '#fff')
    .style('stroke-width', '4px')
    .style('stroke-linejoin', 'round')
    .attr('text-anchor', 'start')
    .style('paint-order', 'stroke')
    .clone(true)
    .style('stroke', 'none');

  function gameStatusText(gamesBack) {
    if (gamesBack > 0) {
      return gamesBack + ' games up';
    } else if (gamesBack < 0) {
      return -gamesBack + ' games back';
    } else {
      return ' games back';
    }
  }

  svg
    .append('text')
    .attr('x', xScale(lastData2024.gm + 1))
    .attr('y', yScale(lastData2024.gb) + 2)
    .text(gameStatusText(lastData2024.gb))
    .attr('class', 'anno-dark')
    .style('stroke', '#fff')
    .style('stroke-width', '4px')
    .style('stroke-linejoin', 'round')
    .attr('text-anchor', 'start')
    .style('paint-order', 'stroke')
    .clone(true)
    .style('stroke', 'none');
}

fetchData();

async function fetchGameData() {
  try {
    const response = await d3.json('https://stilesdata.com/dodgers/data/standings/dodgers_wins_losses_current.json');
    response.reverse(); // Reverse the array to start from the beginning of the season
    renderRunDiffChart(response);
  } catch (error) {
    console.error('Failed to fetch game data:', error);
  }
}

function renderRunDiffChart(data) {
  const isMobile = window.innerWidth <= 767;
  const margin = isMobile ? { top: 20, right: 10, bottom: 50, left: 30 } : { top: 20, right: 20, bottom: 40, left: 40 };
  const container = d3.select('#results-chart');
  const containerWidth = container.node().getBoundingClientRect().width;
  const width = containerWidth - margin.left - margin.right;
  const height = 200 - margin.top - margin.bottom;

  const svg = container.append('svg')
    .attr('width', containerWidth)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleBand()
    .range([0, width])
    .padding(0.1)
    .domain(data.map(d => d.gm));

  const yScale = d3.scaleLinear()
    .range([height, 0])
    .domain([d3.min(data, d => d.run_diff), d3.max(data, d => d.run_diff)]);

  const xAxis = d3.axisBottom(xScale).tickValues(xScale.domain().filter(d => d % 5 === 0));
  const yAxis = d3.axisLeft(yScale).ticks(5);

  svg.append('g')
    .attr('transform', `translate(0,${height})`)
    .call(xAxis);

  svg.append('g').call(yAxis);

      // X-axis Label
      svg.append("text")
      .attr("text-anchor", "middle")
      .attr('class', 'anno-dark')
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 5)
      .text("Game number");
  
    // Y-axis Label
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr('class', 'anno-dark')
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 10)
      .attr("x", -height / 2)
      .text("Run differential");

  // Ensure tooltip is only added once
  // let tooltip = d3.select('body').select('.tooltip');
  // if (tooltip.empty()) {
  //     tooltip = d3.select('body').append('div')
  //         .attr('class', 'tooltip')
  //         .style('position', 'absolute')
  //         .style('visibility', 'hidden')
  //         .style('background', '#fff')
  //         .style('border', '1px solid #ddd')
  //         .style('padding', '5px')
  //         .style('border-radius', '5px')
  //         .style('text-align', 'left')
  //         .style('font-size', '12px');
  // }

  svg.selectAll(".bar")
    .data(data)
    .enter().append("rect")
    .attr("class", "bar")
    .attr("x", d => xScale(d.gm))
    .attr("y", d => yScale(Math.max(0, d.run_diff)))
    .attr("width", xScale.bandwidth())
    .attr("height", d => Math.abs(yScale(d.run_diff) - yScale(0)))
    .attr("fill", d => d.run_diff >= 0 ? "#005a9c" : "#ef3e42");
  //   .on("mouseover", function(event, d) {
  //     tooltip
  //         .html(`Game: ${d.gm}<br>Date: ${d.game_date}<br>Result: ${d.result}<br>Runs: ${d.r}<br>Runs Allowed: ${d.ra}`)
  //         .style("visibility", "visible")
  //         .style("left", `${event.pageX + 10}px`)
  //         .style("top", `${event.pageY + 10}px`);
  // })
  // .on("mouseout", function() {
  //     tooltip.style("visibility", "hidden");
  // });
  
}

fetchGameData();

document.addEventListener('DOMContentLoaded', function() {
  async function fetchCumulativeWinsData() {
    try {
      const response = await d3.json(
        'https://stilesdata.com/dodgers/data/standings/dodgers_standings_1958_present.json'
      );
      // Calculate cumulative wins for each game
      const dataWithCumulativeWins = calculateCumulativeWins(response);
      // Group data by year
      const groupedByYear = d3.group(dataWithCumulativeWins, (d) => d.year);
      renderCumulativeWinsChart(groupedByYear);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  }

  function calculateCumulativeWins(data) {
    const groupedByYear = d3.group(data, (d) => d.year);
    const dataWithCumulativeWins = [];

    groupedByYear.forEach((games, year) => {
      let cumulativeWins = 0;
      games.forEach((game, index) => {
        if (game.result === 'W') cumulativeWins += 1;
        dataWithCumulativeWins.push({ ...game, gm: index + 1, wins: cumulativeWins });
      });
    });

    return dataWithCumulativeWins;
  }

  function renderCumulativeWinsChart(data) {
    const isMobile = window.innerWidth <= 767; // Example breakpoint for mobile devices
    const margin = isMobile 
      ? { top: 20, right: 0, bottom: 60, left: 60 }  // Smaller margins for mobile
      : { top: 40, right: 0, bottom: 50, left: 60 }; // Larger margins for desktop
    const container = d3.select('#cumulative-wins-chart');
    const containerWidth = container.node().getBoundingClientRect().width;
    const width = containerWidth - margin.left - margin.right;
    const height = isMobile 
      ? Math.round(width * 1) - margin.top - margin.bottom  // Taller for mobile
      : Math.round(width * 0.5) - margin.top - margin.bottom; // 2x1 ratio for desktop

    const svg = container
      .append('svg')
      .attr('viewBox', `0 0 ${containerWidth} ${height + margin.top + margin.bottom}`)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const xScale = d3
      .scaleLinear()
      .domain([0, 166]) // Adjust this domain as per the actual number of games
      .range([0, width]);

    const yScale = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(Array.from(data.values()).flat(), (d) => d.wins),
      ])
      .range([height, 0]);

    const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(d3.format('d'));
    const yAxis = d3.axisLeft(yScale).ticks(6);

    svg
      .append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(xAxis);

    svg.append('g').call(yAxis);

    // X-axis Label
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr('class', 'anno-dark')
      .attr("x", width / 2)
      .attr("y", height + margin.bottom - 10)
      .text("Game number in season");

    // Y-axis Label
    svg.append("text")
      .attr("text-anchor", "middle")
      .attr('class', 'anno-dark')
      .attr("transform", "rotate(-90)")
      .attr("y", -margin.left + 20)
      .attr("x", -height / 2)
      .text("Cumulative Wins");

    const line = d3
      .line()
      .x((d) => xScale(d.gm))
      .y((d) => yScale(d.wins))
      .curve(d3.curveMonotoneX); // Smooth the line

    // Draw all lines except the current year first
    const allLinesExceptCurrentYear = Array.from(data.entries()).filter(
      (d) => d[0] !== new Date().getFullYear().toString()
    );
    svg
      .selectAll('.line')
      .data(allLinesExceptCurrentYear, (d) => d[0])
      .enter()
      .append('path')
      .attr('class', 'line')
      .attr('d', (d) => line(d[1]))
      .style('fill', 'none')
      .style('stroke', '#ccc')
      .style('stroke-width', 0.5);

    const currentYear = new Date().getFullYear().toString();
    const lineCurrentYear = Array.from(data.entries()).filter((d) => d[0] === currentYear);
    svg
      .selectAll('.line-current-year')
      .data(lineCurrentYear, (d) => d[0])
      .enter()
      .append('path')
      .attr('class', 'line')
      .attr('d', (d) => line(d[1]))
      .style('fill', 'none')
      .style('stroke', '#005A9C')
      .style('stroke-width', 2);

    // Add a horizontal line at y = 0 (optional)
    // svg
    //   .append('line')
    //   .attr('x1', 0)
    //   .attr('x2', isMobile ? width - 7 : width - 18)
    //   .attr('y1', yScale(0))
    //   .attr('y2', yScale(0))
    //   .attr('stroke', '#222')
    //   .attr('stroke-width', 1);

    // Add the 'Leading' annotation
    // svg
    //   .append('text')
    //   .attr('x', isMobile ? xScale(130) : xScale(150)) // Adjusted for mobile
    //   .attr('y', yScale(0) - 10)
    //   .text('Leading ↑')
    //   .attr('class', 'anno-dark')
    //   .style('stroke', '#fff')
    //   .style('stroke-width', '4px')
    //   .style('stroke-linejoin', 'round')
    //   .attr('text-anchor', 'start')
    //   .style('paint-order', 'stroke')
    //   .clone(true)
    //   .style('stroke', 'none');

    // Add the 'Past ' annotation
    svg
      .append('text')
      .attr('x', isMobile ? xScale(80) : xScale(110)) // Adjusted for mobile
      .attr('y', yScale(100))
      .attr('class', 'anno')
      .text(`Past seasons: 1958-${currentYear - 1}`)
      .attr('text-anchor', 'start');

    const lastDataCurrentYear = data.get(currentYear).slice(-1)[0];

    svg
      .append('text')
      .attr('x', xScale(lastDataCurrentYear.gm + 1))
      .attr('y', yScale(lastDataCurrentYear.wins) - 12)
      .text(currentYear)
      .attr('class', 'anno-dodgers')
      .style('stroke', '#fff')
      .style('stroke-width', '4px')
      .style('stroke-linejoin', 'round')
      .attr('text-anchor', 'start')
      .style('paint-order', 'stroke')
      .clone(true)
      .style('stroke', 'none');

    svg
      .append('text')
      .attr('x', xScale(lastDataCurrentYear.gm + 1))
      .attr('y', yScale(lastDataCurrentYear.wins) + 2)
      .text(`${lastDataCurrentYear.wins} wins`)
      .attr('class', 'anno-dark')
      .style('stroke', '#fff')
      .style('stroke-width', '4px')
      .style('stroke-linejoin', 'round')
      .attr('text-anchor', 'start')
      .style('paint-order', 'stroke')
      .clone(true)
      .style('stroke', 'none');
  }

  fetchCumulativeWinsData();
});
 
    document.addEventListener('DOMContentLoaded', function() {
      const chartConfigurations = [
        {
          elementId: 'cumulative-doubles-chart',
          dataField: '2b_cum',
          yAxisLabel: 'Cumulative doubles'
        },
        {
          elementId: 'cumulative-homers-chart',
          dataField: 'hr_cum',
          yAxisLabel: 'Cumulative homers'
        }
      ];
    
      async function fetchData() {
        try {
          const response = await d3.json(
            'https://stilesdata.com/dodgers/data/batting/archive/dodgers_historic_batting_gamelogs.json'
          );
          const groupedData = d3.group(response, (d) => d.year.toString());
          const maxVal = d3.max(response, d => Math.max(d['2b_cum'], d['hr_cum']));
          return { groupedData, maxVal };
        } catch (error) {
          console.error('Failed to fetch data:', error);
          return null;
        }
      }
    
      function renderChart(config, data, maxYValue) {
        const isMobile = window.innerWidth <= 767;
        const margin = isMobile 
          ? { top: 20, right: 0, bottom: 60, left: 60 } 
          : { top: 40, right: 0, bottom: 50, left: 60 };
        const container = d3.select(`#${config.elementId}`);
        const containerWidth = container.node().getBoundingClientRect().width;
        const width = containerWidth - margin.left - margin.right;
        const height = isMobile 
          ? Math.round(width * 1) - margin.top - margin.bottom
          : Math.round(width * 1.5) - margin.top - margin.bottom;
    
        const svg = container
          .append('svg')
          .attr('viewBox', `0 0 ${containerWidth} ${height + margin.top + margin.bottom}`)
          .append('g')
          .attr('transform', `translate(${margin.left}, ${margin.top})`);
    
        const xScale = d3
          .scaleLinear()
          .domain([0, 166])
          .range([0, width]);
    
        const yScale = d3
          .scaleLinear()
          .domain([0, maxYValue])
          .range([height, 0]);
    
        const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(d3.format('d'));
        const yAxis = d3.axisLeft(yScale).ticks(6);
    
        svg
          .append('g')
          .attr('transform', `translate(0, ${height})`)
          .call(xAxis);
    
        svg.append('g').call(yAxis);
    
        svg.append("text")
          .attr("text-anchor", "middle")
          .attr('class', 'anno-dark')
          .attr("x", width / 2)
          .attr("y", height + margin.bottom - 10)
          .text("Game number in season");
    
        svg.append("text")
          .attr("text-anchor", "middle")
          .attr('class', 'anno-dark')
          .attr("transform", "rotate(-90)")
          .attr("y", -margin.left + 20)
          .attr("x", -height / 2)
          .text(config.yAxisLabel);
    
        const line = d3
          .line()
          .x((d) => xScale(d.gtm))
          .y((d) => yScale(d[config.dataField]))
          .curve(d3.curveMonotoneX);
    
        const allLinesExceptCurrentYear = Array.from(data.entries()).filter(
          (d) => d[0] !== new Date().getFullYear().toString()
        );
        svg
          .selectAll('.line')
          .data(allLinesExceptCurrentYear, (d) => d[0])
          .enter()
          .append('path')
          .attr('class', 'line')
          .attr('d', (d) => {
            // console.log(`Rendering line for year ${d[0]} with data:`, d[1]);
            return line(d[1]);
          })
          .style('fill', 'none')
          .style('stroke', '#ccc')
          .style('stroke-width', 0.5);
    
        const currentYear = new Date().getFullYear().toString();
        const lineCurrentYear = Array.from(data.entries()).filter((d) => d[0] === currentYear);
        if (lineCurrentYear.length > 0) {
          svg
            .selectAll('.line-current-year')
            .data(lineCurrentYear, (d) => d[0])
            .enter()
            .append('path')
            .attr('class', 'line')
            .attr('d', (d) => {
              // console.log(`Rendering current year line for year ${d[0]} with data:`, d[1]);
              return line(d[1]);
            })
            .style('fill', 'none')
            .style('stroke', '#005A9C')
            .style('stroke-width', 2);
        }
    
        svg
          .append('text')
          .attr('x', isMobile ? xScale(100) : xScale(100))
          .attr('y', yScale(300))
          .attr('class', 'anno')
          .text(`Past: 1958-${currentYear - 1}`)
          .attr('text-anchor', 'start');
    
        const lastDataCurrentYear = data.get(currentYear)?.slice(-1)[0];
        if (lastDataCurrentYear) {
          svg
            .append('text')
            .attr('x', xScale(lastDataCurrentYear.gtm + 1))
            .attr('y', yScale(lastDataCurrentYear[config.dataField]) - 12)
            .text(currentYear)
            .attr('class', 'anno-dodgers')
            .style('stroke', '#fff')
            .style('stroke-width', '4px')
            .style('stroke-linejoin', 'round')
            .attr('text-anchor', 'start')
            .style('paint-order', 'stroke')
            .clone(true)
            .style('stroke', 'none');
    
          svg
            .append('text')
            .attr('x', xScale(lastDataCurrentYear.gtm + 1))
            .attr('y', yScale(lastDataCurrentYear[config.dataField]) + 2)
            .text(`${lastDataCurrentYear[config.dataField]} ${config.yAxisLabel.split(' ')[1].toLowerCase()}`)
            .attr('class', 'anno-dark')
            .style('stroke', '#fff')
            .style('stroke-width', '4px')
            .style('stroke-linejoin', 'round')
            .attr('text-anchor', 'start')
            .style('paint-order', 'stroke')
            .clone(true)
            .style('stroke', 'none');
        }
      }
    
      async function initializeCharts() {
        const { groupedData, maxVal } = await fetchData();
        if (groupedData) {
          chartConfigurations.forEach(config => renderChart(config, groupedData, maxVal));
        }
      }
    
      initializeCharts();
    });