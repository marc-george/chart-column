'use strict';
import angular from 'angular';
import * as chart from './chart-column';

// =================================================================
// FUNCTIONS
// We do this here so we can use $inject

// Live updates. If the data changes, re-render the chart.
function controller($scope){
  $scope.$watch('data', (newVal, oldVal) => {
    if(newVal !== oldVal){
      $scope.update(JSON.parse(newVal));
    }
  });
}
controller.$inject = ['$scope']; // Strict DI

// =================================================================
// MODULE DEFINITION

let module = angular.module('ChartColumnModule', [])
  .directive('chartColumn', function(){
    return {
      controller: controller,
      scope: {
        data: '@',
        thresholds: '@',
        showColoredThresholds: '@',
        baseline: '@',
        showXAxis: '@',
        showYAxis: '@',
        showTooltip: '@',
        max: '@',
        min: '@',
        width: '@',
        height: '@'
      },
      link: chart.link // imported from chart-column.js
    };
  })  ;
export default module;
