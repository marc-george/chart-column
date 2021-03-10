# chart-column
An ES6 module which creates a column chart using D3.

## Installation

2) Install the module. From the root of your application:
```
bash-3.2$ bower install git@github.build.ge.com:components/chart-column.git --save
```
3) Tell your module loader to import the angular module and inject it into your Angular application. In your app.js:
```
// Module(s)
import ChartColumnModule from './bower_components/chart-column/dist/module';
// App
let AppModule = angular.module('app', [
  'ChartColumnModule'
]);
```

## Usage

See the live demo with examples at http://angular-es6-datavis.grc-apps.svc.ice.ge.com/#/column

If you're using this as an Angular directive (ie: you imported and injected dist/module.js) it takes the following attributes:

### Required
{array} **data** An array of objects with the following properties:

    name {string}        The column label
    value {number}       The value
    ref {number=}        An optional reference value. This will be displayed
                         as a horizontal bar across the   column.
    color {string=}      An optional color string. If not provided, the color
                         of the column will be based on the value\'s relationship
                         to any thresholds (if provided). If no thresholds are
                         provided, the default (blue) color will be used.
    error {object=}      An optional object with any of \'h\' and \'l\'
                         values, ex: {h:103, l:96}. If present, error bars will
                         be shown spanning these values.

    Example: [
               {name:'Jan', value:7, color:'#5da5da', error:{l:6.5, h:8.2}},
               {name:'Feb', value:7.5, color:'#faa43a', error:{l:7.1, h:9}},
             ]


### Optional
{number=} **baseline** An optional value against which the column values are be plotted. Columns will extend above or below this value. The value itself will be shown as a line across the chart.

{object=} **thresholds** An optional object with any of 'hh', 'h', 'l' or 'll' values. If present (and no color value is given) the color of the bar will be set based on the value's relationship to these thresholds. All thresholds are optional.

{boolean=} **showColoredThresholds** Whether to color the threshold lines.

{boolean=} **showXAxis** Whether to show the x-axis labels. Default is 'false'.

{boolean=} **showYAxis** Whehter to show the y-axis labels. Default is 'false'.

{number=}  **max** An optional maximum y-axis value. Default is 100.

{number=}  **min** An optional minumum y-axis value. Default is 0.

{number=}  **width** An optional chart width. Default is 150.

{number=}  **height** An optional chart height. Default is 75.

### Example

```
<chart-column ng-if="chart.data"
              data="{{chart.data}}"
              baseline="{{chart.baseline}}"
              thresholds="{{chart.thresholds}}"
              show-colored-thresholds="true"
              min="{{chart.min}}"
              max="{{chart.max}}"
              show-x-axis="true"
              show-y-axis="true"
              width="440"
              height="200"></chart-column>
```

## Contributing

Assuming you have followed the installation instructions above,

1) Clone this repo:
```
bash-3.2$ git clone git@github.build.ge.com:components/chart-column.git
```
2) Use [bower link](http://bower.io/docs/api/#link) to create a local symlink:
```
bash-3.2$ cd chart-column
bash-3.2$ bower link
```
3) Link your application to the repo. From the root of your application:
```
bash-3.2$ bower link chart-column
```
As you make changes to the column chart module, you should see the results immediately in your application.
