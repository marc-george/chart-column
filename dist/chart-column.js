'use strict';
/**
 * @ngdoc object
 * @name D3 column chart with thresholds, error bars, custom series color, etc.
 * @description
 * This module exports a function which creates a column chart with the following features:
 * 1. Bars going up from the bottom, or compared against a baseline
 * 2. Ability to show a second series for comparison.
 * 3. Ability to show error bars for each column.
 * 4. Ability to color bars based on either status or directly
 * 5. Ability to hide or show axis labels
 * 6. Ability to set min/max y-axis values
 * 7. Scales well from small to large sizes
 *
 * @param {object} params A paramsuration object with the following properties:
 *                        {array}   data An array of objects. Each object is a column, and has the following properties:
 *                                       name {string}        The column label
 *                                       value {number}       The value
 *                                       reference {number=}  An optional reference value. This will be displayed as a horizontal bar across the column.
 *                                       color {string=}      An optional color string. If not provided, the color of the column will be based on the
 *                                                            value's relationship to any thresholds (if provided). If no thresholds are provided, the
 *                                                            default (blue) color will be used.
 *                                       error {object=}      An optional object with any of h' and 'l' values, ex: {h:103, l:96}. If present, error bars
 *                                                            will be shown spanning these values.
 *
 *                                       Example 1 - Two columns, each with a different color, showing error bars:
 *                                       [
 *                                         {name:'Jan', value:7, color:'#5da5da', error:{l:6.5, h:8.2}},
 *                                         {name:'Feb', value:7.5, color:'#faa43a', error:{l:7.1, h:9}},
 *                                       ]
 *
 *                                       Example 2 - Two columns with colors based on thresholds:
 *                                       [
 *                                         {name:'Jan', value:7},
 *                                         {name:'Feb', value:7.5},
 *                                       ]
 *
 *                        {number=}  baseline An optional value against which the column values
 *                                            are be plotted. Columns will extend above or below
 *                                            this value. The value itself will be shown as a line
 *                                            across the chart.
 *                        {object=}  thresholds An optional object with any of 'hh', 'h', 'l' or 'll' values.
 *                                              If present (and no color value is given) the color of the bar
 *                                              will be set based on the value's relationship to these thresholds.
 *                                              All thresholds are optional.
 *                        {boolean=} showColoredThresholds Whether to color the threshold lines.
 *                        {boolean=} showXAxis Whether to show the x-axis labels. Default is 'false'.
 *                        {boolean=} showYAxis Whehter to show the y-axis labels. Default is 'false'.
 *                        {number=}  max An optional maximum y-axis value. Default is 100.
 *                        {number=}  min An optional minumum y-axis value. Default is 0.
 *                        {number=}  width An optional chart width. Default is 150.
 *                        {number=}  height An optional chart height. Default is 75.
 *
 * @param {obj} element An array of DOM elements. The chart will be inserted
 *                      into each element. In most cases you'll just want a
 *                      single element here.
 * @example
 *
 * As a directive in Angular:
 * ```
 * import * as chart from './<path to dist>/chart-column'; // this file
 * let module = angular.module('ChartColumn', []).directive(chartColumn, function(){
 *       return {
 *         scope: {
 *           data: '@',
 *           baseline: '@',
 *           thresholds: '@',
 *           showColoredThresholds: '@',
 *           showXAxis: '@',
 *           showYAxis: '@',
 *           max: '@',
 *           min: '@',
 *           width: '@',
 *           height: '@'
 *         },
 *         link: chart.link
 *       };
 *     });
 * export default module;
 * ```
 * Usage:
 * ```
  <chart-column ng-if="fuelburn.data"
                data="{{fuelburn.data}}"
                baseline="120"
                thresholds="{{fuelburn.thresholds}}"
                show-colored-thresholds="true"
                min="{{fuelburn.min}}"
                max="{{fuelburn.max}}"
                show-x-axis="true"
                show-y-axis="true"
                width="440"
                height="200"></chart-column>
 * ```
 */

import d3 from 'd3';


// =================================================================
// DEFAULTS

const defaults = {
  duration: 300,
  colors: {
    hh: '#f15854', //$dv-basic-red
    h: '#faa43a', //$dv-basic-yellow
    l: '#faa43a', //$dv-basic-yellow
    ll: '#f15854', //$dv-basic-red
    default:'#5da5da', // $dv-basic-blue
    threshold: '#e4e4ea', //$gray3
    background: '#e4e4ea', //$gray3
    reference: '#242326', //$gray10
    labels: '#242326', //$gray10
    borders: '#e4e4ea' //$gray3
  }
};



// =================================================================
// UTILITY METHODS
// These functions all return something

/**
 * Given a value and a thresholds object, this function
 * will return the hex color string. If the thresholds
 * object is falsy, the default color is returned.
 * @param  {number} v The value
 * @param  {object} t The thresholds object
 * @return {string}   A hex color, ex: '#e4e4e4'
 */
let getColor = function(v, t){
  let color = defaults.colors.default;
  if(t){
    v = parseFloat(v);
    if(v <= t.l){
      color = defaults.colors.l;
      if(v<=t.ll){
        color = defaults.colors.ll;
      }
    }
    if(v>=t.h){
      color = defaults.colors.h;
      if(v>=t.hh){
        color = defaults.colors.hh;
      }
    }
  }
  return color;
};

let getFontSize = function(colWidth){
  let size = colWidth * 0.6; // first approximation
  size = size < 9 ? 9 : size; // min size
  return size;
};

let getTickCount = function(height){
  let numTicks = height / 20;
  return numTicks;
};

let getMargins = function(colWidth, max, min, showXAxis, showYAxis){
  let numChars = Math.max(max.toString().length, min.toString().length);
  let left = showYAxis ? getFontSize(colWidth) * numChars : 0; // might need to tune based on font type
  let bottom = showXAxis ? 1.3 * getFontSize(colWidth) : 1;
  let top = 0.5 * getFontSize(colWidth);
  return {
    left: left,
    right: 5,
    bottom: bottom,
    top: top
  };
};

let getColWidth = function(width, numCols, max, min, showYAxis){
  let numChars = Math.max(max.toString().length, min.toString().length);
  let colWidth = width/(2 * numCols - 1) < 20 ? width/(2 * numCols - 1) : 20;
  // If we have yAxis labels, we have less room, some make the columns a bit smaller
  if(showYAxis){
    // not perfect, since it assumes 10px chars, but a decent approximation
    colWidth = (width - 10 * numChars)/(2 * numCols - 1) < 20 ? (width - 10 * numChars)/(2 * numCols - 1) : 20;
  }
  return colWidth;
};

// Given a category and an index, this function
// will calculate the x/y/stroke values for the
// lines which can be used to create error bars.
let errorBars = function(d, i, config){
  let error = {
    x1:0, x2:0, y1:0, y2:0, stroke: 0
  };
  if(d.error){
    // 1/2 width error bar caps for larger column widths; full-width for smaller.
    error.x1 = config.colWidth > 10 ? config.xScale(i) + config.colWidth * 0.25 : config.xScale(i);
    error.xCenter = config.xScale(i) + config.colWidth * 0.5;
    error.x2 = config.colWidth > 10 ? config.xScale(i) + config.colWidth * 0.75 : config.xScale(i) + config.colWidth;
    if(config.baseline){
      let baselineY = config.height - config.marginBottom + config.marginTop - config.yScale(config.baseline);
      if(d.error.h >= config.baseline){
        error.y1 = baselineY - Math.abs(config.yScale(config.baseline) - config.yScale(d.error.h));
      } else {
        error.y1 = baselineY + Math.abs(config.yScale(config.baseline) - config.yScale(d.error.h));
      }
      if(d.error.l >= config.baseline){
        error.y2 = baselineY - Math.abs(config.yScale(config.baseline) - config.yScale(d.error.l));
      } else {
        error.y2 = baselineY + Math.abs(config.yScale(config.baseline) - config.yScale(d.error.l));
      }
    } else {
      error.y1 = config.height - config.marginBottom + config.marginTop - config.yScale(d.error.h);
      error.y2 = config.height - config.marginBottom + config.marginTop - config.yScale(d.error.l);
    }
    error.stroke = 1;
  }
  return error;
};


// =================================================================
// RENDERING METHODS
// These functions all do something to the DOM without returning anything.

let moveTooltip = function(tooltip,data,event){
  let width = tooltip[0][0].clientWidth;
  let height = tooltip[0][0].clientHeight;
  tooltip.style('top',event.layerY - height - 10 +'px')
         .style('left',event.layerX - width/2 +'px');
};
let hideTooltip = function(tooltip){
  tooltip.style('visibility','visible').html('');
};
let renderTooltip = function(tooltip,item,event){
  let html = '<div class="tooltip-holder"><div class="tooltip"><div class="title">'+item.tooltip.title+'</div><table class="data style-scope">';
  for(let i=0;i<item.tooltip.data.length;i++){
    html += '<tr><td class="name">' + item.tooltip.data[i].name + '</td><td>' + item.tooltip.data[i].value + '</td></tr>';
  }
  html += '</table></div><div class="arrow-down"></div></div>';
  tooltip.html(html).style('visibility','visible');
  moveTooltip(tooltip,item,event);
};

let renderBackgrounds = function(svg, config){
   svg.selectAll('rect.bg')
      .data(config.data)
      .enter()
      .append('rect')
      .attr('class', 'bg')
      .attr('x', function(d, i) { return config.xScale(i); })
      .attr('y', config.marginTop)
      .attr('width', config.colWidth)
      .attr('height', config.height - config.marginTop - config.marginBottom)
      .attr('fill', config.defaults.colors.background)
      .on('mouseover', function(d){ return config.showTooltip ? renderTooltip(config.tooltip,d,event) : false; })
      .on('mousemove', function(d){ return config.showTooltip ? moveTooltip(config.tooltip,d,event) : false; })
      .on('mouseout', function(){  return config.showTooltip ? hideTooltip(config.tooltip) : false; });
};

let renderThresholdMarkers = function(svg, config){
  for(let threshold in config.thresholds){
    let y = config.height - config.marginBottom + config.marginTop - config.yScale(config.thresholds[threshold]);
    svg.append('line')
      .attr('x1', config.marginLeft)
      .attr('x2', config.width - config.marginRight)
      .attr('y1', y)
      .attr('y2', y)
      .attr('stroke-width', 1)
      .attr('stroke', config.showColoredThresholds ? config.defaults.colors[threshold] : config.defaults.colors.threshold)
      .attr('shape-rendering', 'crispEdges');
  }
};

let renderXAxis = function(svg, config){
  svg.selectAll('text')
    .data(config.data)
    .enter()
    .append('text')
    .text(function(d) { return d.name; })
    .attr('text-anchor', 'middle')
    .attr('x', function(d, i) { return config.xScale(i) + config.colWidth/2; })
    .attr('y', (config.height - config.marginBottom + 1.3 * getFontSize(config.colWidth)))
    .attr('font-family', 'sans-serif')
    .attr('font-size', (getFontSize(config.colWidth) + 'px'))
    .attr('fill', config.defaults.colors.labels);
};

let renderYAxis = function(svg, config){
  let yAxisScale = d3.svg.axis()
    .ticks(getTickCount(config.height - config.marginBottom))
    .orient('left')
    .tickSize(getFontSize(config.colWidth)/2,0)
    .scale(config.yAxisLabelScale);
  svg.append('g')
    .attr('transform', 'translate(' + config.marginLeft + ',0)')
    .attr('font-family', 'sans-serif')
    .attr('font-size', (getFontSize(config.colWidth) + 'px'))
    .attr('fill', config.defaults.colors.labels)
    .call(yAxisScale);
};

let renderDataFromBaseline = function(svg, config){
  let baselineY = config.height - config.marginBottom + config.marginTop - config.yScale(config.baseline);
  // Column Rectangle
  // We have a baseline value; show the bars going up or down from the baseline.
  svg.selectAll('rect.data')
    .data(config.data)
    .enter()
    .append('rect')
    .attr('class', 'data')
    .attr('shape-rendering', 'crispEdges')
    .attr('x', function(d, i) { return config.xScale(i); })
    .attr('y', baselineY)
    .attr('height', 1e-6)
    .attr('width', config.colWidth)
    .attr('fill', function(d) {
      return d.color ? d.color : getColor(d.value, config.thresholds);
    })
    .on('mouseover', function(d){ return config.showTooltip ? renderTooltip(config.tooltip,d,event) : false; })
    .on('mousemove', function(d){ return config.showTooltip ? moveTooltip(config.tooltip,d,event) : false; })
    .on('mouseout', function(){  return config.showTooltip ? hideTooltip(config.tooltip) : false; })
    .transition().duration(config.defaults.duration)
    .attr('y', function(d) {
      // If the value is above the baseline, the rectangle starts from
      // the value and goes down to the baseline. Otherwise
      // it starts from the baseline and goes down to the value.
      if(d.value >= config.baseline){
        return baselineY - Math.abs(config.yScale(config.baseline) - config.yScale(d.value));
      } else {
        return baselineY;
      }
    })
    .attr('height', function(d) {
      let h = d.value ? Math.abs( config.yScale(config.baseline) - config.yScale(d.value) ) : 0;
      return h;
    });

  // Baseline Marker
  svg.append('line')
    .attr('x1', config.marginLeft)
    .attr('x2', config.width - config.marginRight)
    .attr('y1', baselineY)
    .attr('y2', baselineY)
    .attr('stroke-width', config.stroke)
    .attr('stroke', config.defaults.colors.reference)
    .attr('shape-rendering', 'crispEdges');
};
let updateDataFromBaseline = function(svg, config){
  let baselineY = config.height - config.marginBottom + config.marginTop - config.yScale(config.baseline);
  svg.selectAll('.data')
     .transition().duration(config.defaults.duration)
     .attr('fill', function(d, i) {
       return config.data[i].color ? config.data[i].color : getColor(config.data[i].value, config.thresholds);
     })
     .attr('y', function(d,i) {
       if(config.data[i].value >= config.baseline){
         return baselineY - Math.abs(config.yScale(config.baseline) - config.yScale(config.data[i].value));
       } else {
         return baselineY;
       }
     })
     .attr('height', function(d,i) {
       let h = config.data[i].value ? Math.abs( config.yScale(config.baseline) - config.yScale(config.data[i].value) ) : 0;
       return h;
     });
};

let renderDataFromAxis = function(svg, config){
  // Column Rectangle
  // No baseline; show the bars going up from the bottom.
  svg.selectAll('rect.data')
    .data(config.data)
    .enter()
    .append('rect')
    .attr('shape-rendering', 'crispEdges')
    .attr('class', 'data')
    .attr('width', config.colWidth)
    .attr('height', 1e-6)
    .attr('y', function(d) { return config.height - config.marginBottom + config.marginTop; })
    .attr('fill', function(d) {
      return d.color ? d.color : getColor(d.value, config.thresholds);
    })
    .attr('x', function(d, i) { return config.xScale(i); })
    .on('mouseover', function(d){ return config.showTooltip ? renderTooltip(config.tooltip,d,event) : false; })
    .on('mousemove', function(d){ return config.showTooltip ? moveTooltip(config.tooltip,d,event) : false; })
    .on('mouseout', function(){  return config.showTooltip ? hideTooltip(config.tooltip) : false; })
    .transition().duration(config.defaults.duration)
    .attr('y', function(d) { return config.height - config.marginBottom + config.marginTop - config.yScale(d.value); })
    .attr('height', function(d) { return config.yScale(d.value) - config.marginTop; });
};
let updateDataFromAxis = function(svg, config){
  svg.selectAll('.data')
     .transition().duration(config.defaults.duration)
     .attr('fill', function(d,i) {
       return config.data[i].color ? config.data[i].color : getColor(config.data[i].value, config.thresholds);
     })
     .attr('y', function(d,i){ return config.height - config.marginBottom + config.marginTop - config.yScale(config.data[i].value); })
     .attr('height', (d,i) => { return config.yScale(config.data[i].value) - config.marginTop; });
};

let renderErrorBars = function(svg, config){
  svg.selectAll('rect.error')
    .data(config.data)
    .enter()
    .append('line')
    .attr('class', function(d,i){ return 'error-center col-' + i; })
    .attr('x1', function(d,i){ return errorBars(d,i,config).xCenter; })
    .attr('x2', function(d,i){ return errorBars(d,i,config).xCenter; })
    .attr('y1', function(d,i){ return errorBars(d,i,config).y1; })
    .attr('y2', function(d,i){ return errorBars(d,i,config).y2; })
    .attr('stroke-width', function(d,i){ return errorBars(d,i,config).stroke; })
    .attr('stroke', config.defaults.colors.reference)
    .attr('shape-rendering', 'crispEdges');
  svg.selectAll('rect.error')
    .data(config.data)
    .enter()
    .append('line')
    .attr('class', 'error-high')
    .attr('x1', function(d,i){ return errorBars(d,i,config).x1; })
    .attr('x2', function(d,i){ return errorBars(d,i,config).x2; })
    .attr('y1', function(d,i){ return errorBars(d,i,config).y1; })
    .attr('y2', function(d,i){ return errorBars(d,i,config).y1; })
    .attr('stroke-width', function(d,i){ return errorBars(d,i,config).stroke; })
    .attr('stroke', config.defaults.colors.reference)
    .attr('shape-rendering', 'crispEdges');
  svg.selectAll('rect.error')
    .data(config.data)
    .enter()
    .append('line')
    .attr('class', 'error-low')
    .attr('x1', function(d,i){ return errorBars(d,i,config).x1; })
    .attr('x2', function(d,i){ return errorBars(d,i,config).x2; })
    .attr('y1', function(d,i){ return errorBars(d,i,config).y2; })
    .attr('y2', function(d,i){ return errorBars(d,i,config).y2; })
    .attr('stroke-width', function(d,i){ return errorBars(d,i,config).stroke; })
    .attr('stroke', config.defaults.colors.reference)
    .attr('shape-rendering', 'crispEdges');
};
let updateErrorBars = function(svg, config){
  svg.selectAll('.error-center')
     .selectAll('col-0')

     // TODO Fri: how to update these?

};

let renderBorders = function(svg, config){
  // Top Plot Border
  svg.append('line')
    .attr('x1', config.marginLeft)
    .attr('x2', config.width - config.marginRight)
    .attr('y1', config.marginTop)
    .attr('y2', config.marginTop)
    .attr('stroke-width', 1)
    .attr('stroke', config.defaults.colors.borders)
    .attr('shape-rendering', 'crispEdges');

  // Bottom Plot Border
  svg.append('line')
    .attr('x1', config.marginLeft)
    .attr('x2', config.width - config.marginRight)
    .attr('y1', config.height - config.marginBottom)
    .attr('y2', config.height - config.marginBottom)
    .attr('stroke-width', 1)
    .attr('stroke', config.defaults.colors.borders)
    .attr('shape-rendering', 'crispEdges');
};

let renderReference = function(svg, config){
  svg.selectAll('line.data')
    .data(config.data)
    .enter()
    .append('line')
    .attr('class', 'reference')
    .attr('x1', function(d, i) { return config.xScale(i) - 1; }) // 1px overhang
    .attr('x2', function(d, i) { return config.xScale(i) + config.colWidth + 1; }) // 1px overhang
    .attr('y1', function(d) { return config.height - config.marginBottom + config.marginTop - (config.yScale(d.reference || 0)); })
    .attr('y2', function(d) { return config.height - config.marginBottom + config.marginTop - (config.yScale(d.reference || 0)); })
    .attr('stroke-width', function(d){ if (d.reference) { return config.stroke; } else { return 0; } }) // don't show if there's no value
    .attr('stroke', config.defaults.colors.reference)
    .attr('shape-rendering', 'crispEdges');
};
let updateReference = function(svg, config){
  svg.selectAll('.reference')
     .transition().duration(config.defaults.duration)
     .attr('y1', function(d,i) { return config.height - config.marginBottom + config.marginTop - (config.yScale(config.data[i].reference || 0)); })
     .attr('y2', function(d,i) { return config.height - config.marginBottom + config.marginTop - (config.yScale(config.data[i].reference || 0)); });
};

// =================================================================
// LINKING FUNCTION
// This function is responsible for configuring the chart based
// on any parameters the user has provided, initializing it, and
// calling the functions which render elements using d3.
//
// Don't put any Angular functionality in here!

export function link(params, element){

  let showBaseline = params.baseline ? true : false;
  let showXAxis = (params.showXAxis === 'true'); // default is false
  let showYAxis = (params.showYAxis === 'true'); // default is false

  // =================================================================
  // USER-PROVIDED VALUES. Use defaults if not provided.
  let config = {
    width: params.width ? parseInt(params.width) : 150,
    height: params.height ? parseInt(params.height) : 75,
    max: params.max ? parseFloat(params.max) : 100,
    min: params.min ? parseFloat(params.min) : 0,
    baseline: parseFloat(params.baseline) || null,
    thresholds: params.thresholds ? JSON.parse(params.thresholds) : null,
  };


  // =================================================================
  // CALCULATED VALUES
  config.data = params.data ? JSON.parse(params.data) : [];
  config.colWidth = getColWidth(config.width, config.data.length, config.max, config.min, config.showYAxis);
  config.stroke = config.height >= 150 ? 2 : 1; // use 1px for mini-charts
  let margins = getMargins(config.colWidth, config.max, config.min, showXAxis, showYAxis);
  config.marginTop = margins.top;
  config.marginBottom = margins.bottom;
  config.marginLeft = margins.left;
  config.marginRight = margins.right;
  config.showColoredThresholds = (params.showColoredThresholds === 'true');
  config.showTooltip = (params.showTooltip === 'true');
  config.defaults = defaults;
  config.tooltip = d3.select(element[0]).append('div')
                                        .style('position','absolute')
                                        .style('z-index', '10')
                                        .style('visibility', 'hidden');
  config.yScale = d3.scale.linear()
                    .domain([config.min, config.max]) // scale this (the value limits)
                    .range([config.marginTop, config.height - config.marginBottom]); // to this (the pixel limits)
  config.xScale = d3.scale.linear()
                    .domain([0, config.data.length-1]) // scale this (the value limits)
                    .range([config.marginLeft, config.width - config.colWidth - config.marginRight]); // to this (the pixel limits)
  config.yAxisLabelScale = d3.scale.linear()
                             .domain([config.min, config.max]) // scale this (the value limits)
                             .range([config.height - config.marginBottom, config.marginTop]); // to this (the pixel limits)
  let svg = d3.select(element[0]).append('svg').attr('width',config.width).attr('height',config.height);


  // =================================================================
  // RENDER (available as $scope.render on a controller)
  params.render = function(){

    renderBackgrounds(svg, config);
    if(params.thresholds){ renderThresholdMarkers(svg, config); }
    if(showXAxis){ renderXAxis(svg, config); }
    if(showYAxis){ renderYAxis(svg, config); }
    if(showBaseline){ renderDataFromBaseline(svg, config); } else { renderDataFromAxis(svg, config);  }
    renderErrorBars(svg, config);
    renderBorders(svg, config);
    renderReference(svg, config);

  };

  // =================================================================
  // UPDATE (available as $scope.update on a controller)
  params.update = function(newData){
    config.data = newData;
    if(showBaseline){ updateDataFromBaseline(svg, config); } else { updateDataFromAxis(svg, config); }
    updateErrorBars(svg, config);
    updateReference(svg, config);
  };

  // =================================================================
  // INITIALIZE
  if(config.data){
    params.render();
  } else {
    console.log('chart-column at ', element , 'has no data.');
  }
}
