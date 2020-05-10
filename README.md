# jrbPivot
  
## Introduction
  
This is a javascript based pivot table calculator that is full of features. It comes with a UI designer to help developers.
  
The 'external' folder contains all the dependencies needed, so download the package, and open up the **pivotExample.html** in your browser directly.

## Features

* Extensive pivoting of data with any set of table field (column) names used to set row and column headings
* Multiple functions available to act on pivoted data sets: 'Sum', 'Count', 'List', 'Unique List', 'Max', 'Min', 'Mean', 'Mode', 'Median', 'Product', 'Variance', 'StdDev', 'None'
* User defined functions also available
* Data pre-filtering
* Any number of pivoting functions can be used on each value being pivoted (e.g. sum, count, min, max can be used together)
* Pivoted data sortable by row and column. 
  * Each field can be be sorted ascending or descending by it's name, or by pivoted values
  * Each field can be be sorted manually (pre-set). 
  * Data field names & operations can be used to collate columns
* Summary rows & columns available (e.g. totals) for any pivoted field, or all as a collective
* Option to fill empty cells with 0, null, or empty space
* 'Where from' data returned as part of pivoting action
  
## Example Use

```javascript
myOutputPivoted = jrbAnalytics.getGlobal('model.pivot')(myInputData, myParams);
```
	
where myInputData and myOutputPivoted are jrbAnalytics data objects, and myParams is the configuration JSON (see below). Note that myParams IS MODIFIED with a '__ErrorMessages' object that displays in clear text configuration errors identified. Non-matching field or function names for example.

## Helper functions:

### objectifyTable

```javascript
myInputData = jrbAnalytics.getGlobal('utils.objectifyTable')(myTable);
```
where myTable is a normal table object with a [{fieldName1:value1, fieldName2:value2, ..., {..}, ...] format;

### renderSimpleTable
```javascript
jrbAnalytics.getGlobal('utils.renderSimpleTable')('someDIVid', myInputData);
```
renders an HTML table of a jrbAnalytics data object.

### UI Designer
To use with the designer:
	
```javascript
myParams = {}; //or preset with a configuration
jrbAnalytics.getGlobal('model.pivot')(myInputData, myParams, divIDtoLoadDesigner);
```	
loads the UI designer in the DIV with it's id equal to divIDtoLoadDesigner. E.g. if divIDtoLoadDesigner = "designer" then the UI designer is placed here:

```html
<div id="designer"></div>
```

There are two options to obtain the JSON configuration from the UI designer.
1. cut&paste the JSON object displayed ont the left of the designer panel
2. programatically, from the myParams.draftpivotconfig object. At any time 'myParams.draftpivotconfig' contains the latest draft configuration.

Also a document event 'refreshedUI' is triggered on each change. For example: 

```javascript
document.addEventListener('refreshedUI', function (e) { 
   $('#params').text(JSON.stringify({pivotconfig: myParams.draftpivotconfig}, null, 4));}, 
false);
```	

## Creating the configuration JSON

### Option 1: Use the Designer

Use of the designer is recommended as the quickest way to construct the JSON object correctly and to obtain the view you want.  Change the 'myTable' variable to use your data set. The examples tabs may stop working, but the designer will not.  

### Option 2: Construct by hand

Pass a JSON Object in this format:
```javascript
{
    pivotconfig: pivotConfigObject
}
```

where pivotConfigObject is a JSON object that contains items as follows.
- **dataNames**: array of strings ['field name 1', 'field name 2']. Optional but usually needed. Array of column names that contain the data being pivoted. Order of names used to determines order of output columns.
- **columnNames**: array of strings ['field name 1', 'field name 2']. Optional. Array of column names to use to populate the column headers. Order determines hierarchy, or how data is nested.
- **rowNames**: array of strings ['field name 1', 'field name 2']. Optional. Array of column names to use to populate the row headers. Order determines hierarchy, or how data is nested.
- **pivotFn**: string of function name. Optional. Examples are 'Sum' or 'Count', 'List', 'Unique List', 'Max', 'Min', 'Mean', 'mode', 'Median', 'Product', Variance', 'StdDev' also available. 'None', invalid values or not providing this parameter result in the same none operation on the pivoted data array. You can add your own functions with the following simple extension. 
```javascript
 jA.extendGlobalObject('model.pivotfunctions', { 
	SumPlusOne: function(arrin) { return math.sum(arrin) + 1; }, //note math.js function here
	CountMinusOne: function(arrin) { return arrin.length - 1; }, //note math.js function here
	myFunctionName: function(arrin) { --insert calculation then -- return result; }, //modify as needed
});
```
- **pivotEmpty** any value. Optional. What to use for pivoted cells that contain no data. If not set, 'undefined' will be used. A 0 or '' may be more useful.
- **cleandata** boolean, true or false. Optional but highly recommended. Interpreted as false if missing. When set, the pivot function excludes null, undefined or empty strings ('') in the input data from being pivoted. So for example this pivoted data [1, 4, '', '', 3] contains 5 items and fails to sum without cleandata set, whereas when set the data reduces to [1, 4, 3] contains 3 items and will sum.
- **options** options object. See below. Optional but needed for more useful pivoting actions. This object defines more specific filter, sort, data collation functions, and row and column summary and sub-summary functions (e.g. 'Sum' for totals and sub-totals).

## options object
Here follows a brief explanation. Serious users should use the UI designer to fully appreciate how to implement all the options available.
a JSON Object in this format:
```javascript
{
    'field name': {
		'action': {
			'sub-action': subActionValue,
			//..additional sub actions
		}, 
		//..additional actions
	},
	//additional field names
}
```
where
- 'field name' is one of the field (or column) names of the input data, OR one of '__rowTotals', '__colTotals' that are used to add overall summary rows or columns (grand totals for example).
- 'action' is one of the following: 'filter', 'msort', 'sort', 'summary', 'summarytype'. Not every action is relevant to every 'field name' as follows:
  - 'filter' applies to anything except '__rowTotals' and '__colTotals'.
  - 'msort', 'sort', 'summary' applies to all row and column field names. I.e. 'field name' must appear in rowNames or columnNames above. Additionally 'summary' applies to '__rowTotals', '__colTotals'. These are the only actions permitted for these 'field names'.
  - 'summarytype' applies to data field names only. I.e. 'field name' must appear in dataNames above.
- 'sub-action' is one of the following: 'in', 'sort', 'msort', 'topOrleft', 'rightOrbottom'. 'sub-action' is related to 'action' as follows:
  - 'in' - use with 'filter' action only. 'subActionValue' is an array of values to be included in the pivot.
  - 'msort' - use with 'msort' action only. 'subActionValue' is an array of field values to set sort order. Over-ridden if sort is set.
  - 'sort' - use with 'sort' action only. 'subActionValue' is an array with one string that defines the sort action. See below.
  - 'topOrleft', 'rightOrbottom' - use with 'summary'. 'subActionValue' is an array of pivot function names (same used used in pivotFn above) with 'Summary' an additional value that is also permitted. This defines the functions and the order to use to create row or column summary lines (e.g. 'Sum' for a sub-total). Using 'Summary' as a function name means that the function used will be the same as that used by the data field names (and is recommended else results can get confusing). If not obvious 'topOrleft' means summary rows displayed above or summary columns displayed to the left the respective data set. 'rightOrbottom' means summary rows displayed below or summary columns displayed to the right the respective data set.
  - 'summarytype' - use with 'summarytype' action only. 'subActionValue' is an array of pivot function names (same used used in pivotFn above) to use on the collated data in each cell in the order specified in the array. Overrides the 'pivotFn' default.

Note in the output of the pivot designer, you'll also see a 'summary_sort' or 'summarytype_sort' 'action'. You can ignore these. Used by the designer UI only to remember sort actions.

Sort Strings for the 'sort' action and subaction, a string is parsed to determine how data rows or columns should be sorted. The string is the same as that used in the sort dropdowns in the designer and has the following format:
	[order] + ' - ' + [Column name] + [' ('+function+')']
	
[order] is simply one of 'Descending' or 'Ascending'. The column name must be that of a data column name OR be the same as 'field name' under which the 'sort' action is placed. The function in brackets is only used with data column names and must match one of the functions being used.

