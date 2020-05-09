/******************************************************************************

jrbPivot - Module for editing and calculating a pivot table.

For latest version see https://github.com/ukcbajr/jrbAnalytics

*******************************************************************************/

/******************************* Dependencies *********************************

jquery-ui (js & css) - https://jqueryui.com/
multisortable.js - https://github.com/shvetsgroup/jquery.multisortable
math.js - https://mathjs.org/

jrbAnalytics.js
jrbWidgets.js	

*******************************************************************************/
 
/******************************* License **************************************

MIT License

Copyright (c) 2019 John Bell

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*******************************************************************************/

/********************************* Version **********************************
Version: 0.5,
Quality: "Beta",
ReleaseDate: 'October 7 2019'

Release Notes

Candidate release of pivot function. Includes a pivot designer UI as well as 
the pivot function. See dependency list above.

Known bugs
- None

Example use 1

var	fixedOutput = jA.getGlobal('model.pivot')(myDataObject, fixedParams);

where 
 myDataObject is the data object to pivotted
 fixedParams are the pivoting parameters
returns the pivoted data object.

jrbAnalytics data object used, so utilities to help:

- to render output, where 'pivotout' is the element ID:
	jA.getGlobal('utils.renderSimpleTable')('pivotout', fixedOutput);	
	
- to create jrbAnalytics data object	
	myDataObject = jA.getGlobal('utils.objectifyTable')(myTable)
	
	where myTable is a data array of format
		[{fieldname1: fieldval1, fieldname2: fieldval2, ..}, ..]
		

Example Use 2

jA.getGlobal('model.pivot')(myDataObject, myParams, 'designer');

This renders the pivot designer. parameters available in myParams.draftpivotconfig
at any time. Also myParams.draftOutput contains the pivoted data in 
jrbAnalytics data object format. Note this contains a 'rawPivot' object
that includes 'where used' data.

See pivotExample.html for full example implementation.

Available features
- Basic pivoting on any table field
- Any field (used in pivot or not) can be used to filter the data set
- Multiple pivoting functions available
  - None (default - data pivoted into an array only)
  - List (array parsed into a list of values)
  - Unique List (As List but only unique values displayed)
  - Sum
  - Count
  - Min
  - Max
  - Mean
  - Mode
  - Median
  - Product
  - Variance
  - Standard Deviation
- Any number of pivoting functions can be used on each value being pivoted
- Manual sort of data functions & total function (e.g. Count or Sum first). User can 
  set the order of pivoting functions - just drag 'Sum' before / after 'Count' in 
  drop down for example
- Pivoted data sortable by row and column. 
  - Each field can be be sorted ascending or descending by it's name, or 
    by pivoted values
  - Each field can be be sorted manually. Ignored if the above is used for that field.
  - Data field names & operations can be used to collate columns
- Summary rows & columns available for any pivoted field, or all as a collective
- Option to fill empty cells with 0, null, or empty space
- 'Where from' data returned as part of pivoting action

 Future features

- values shown as: % of column total, row total, overal total, specific column or row, row above or below
		difference from total, row total, col total, specific col or row, row above or below
		running total count and percent
		rank sort index (1...N, where 1 is highest or lowest value or custom sort function)


*****************************************************************************/	



(function(jA) {

	jA.versionInformation.jrbPivot = {
		Version: 0.51,
		Quality: "Beta",
		ReleaseDate: 'October 26 2019'
	};	


	//Define available functions for pivot
	//Use this format to add to these available pivot table functions if needed:
	// 	jA.extendGlobalObject('model.pivotfunctions', { 
	//			functionName: function(arrin) { --insert calculation then -- return result; },
	//          ..., });
	//  functionName will show in the UI so short and simple as possible is recommended. Note math.js loaded and available
	//Note extendGlobalObject creates if object does not exist so order does not matter
	//  arrin will always be an array of items collated by each pivot action
	jA.extendGlobalObject('model.pivotfunctions', { 
		None: function(arrin) { return arrin; },
		List: function(arrin) { return arrin.join('<br>'); },
		'Unique List': function(arrin) { 
			var lo = {}, iloop;			
			for (iloop=0; iloop<arrin.length; iloop++) lo[arrin[iloop]] = 1;
			return Object.keys(lo).join('<br>'); 
		},
		Sum: function(arrin) { return math.sum(arrin); }, //return arrin.reduce(function(a,b){ return 1*a + 1*b }, 0); },
		Count: function(arrin) { return arrin.length; },
		Max: function(arrin) { return math.max(arrin); },
		Min: function(arrin) { return math.min(arrin); },
		Mean: function(arrin) { return math.mean(arrin); },
		Mode: function(arrin) { return math.mode(arrin); },
		Median: function(arrin) { return math.median(arrin); },
		Product: function(arrin) { return math.prod(arrin); },
		Variance: function(arrin) { return math.variance(arrin); },
		StdDev: function(arrin) { return math.std(arrin); }
	//	'Count Numbers'	
	});	
	
	
	//CSS for Pivot function
	jA.setCSS(`

/* jrbPivot */

div#pivotres th,
div#pivotres td {
	font-size: 0.8em;
	border: 1px solid #ddd;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
	font-family: "Lucida Console", Monaco, monospace;	
}

div#pivotres td.colheader,
div#pivotres th {
	background: #ece7e0;
}

div#pivotres tr.topOrleft td {
    border-top: 2px solid #ad9783;
    border-bottom: 1px solid #ad9783;
}

div#pivotres tr.rightOrbottom td {
    border-bottom: 2px solid #ad9783;
    border-top: 1px solid #ad9783;
}

div#pivotres tr.subtotal { font-weight: bold; background: #ece7e010;}
div#pivotres tr.subtotal.subtotal-0 { background: #efeae280; }
div#pivotres tr.subtotal.subtotal-1 { background: #e9ded080; }
div#pivotres tr.subtotal.subtotal-2 { background: #e9ded060; }
div#pivotres tr.subtotal.subtotal-3 { background: #ece7e040; }
div#pivotres tr.subtotal.subtotal-4 { background: #ece7e030; }
div#pivotres tr.subtotal.subtotal-5 { background: #ece7e020; }

div#pivotres .column.subtotal.rightOrbottom {
    border-right: 2px solid #ad9783;
    border-left: 1px solid #ad9783;
}

div#pivotres .column.subtotal.topOrleft {
    border-right: 1px solid #ad9783;
    border-left: 2px solid #ad9783;
}

div#pivotres td.column.subtotal { font-weight: bold; background: #ece7e010;}
div#pivotres td.column.subtotal.subtotal-0 { background: #efeae280; }
div#pivotres td.column.subtotal.subtotal-1 { background: #e9ded080; }
div#pivotres td.column.subtotal.subtotal-2 { background: #e9ded060; }
div#pivotres td.column.subtotal.subtotal-3 { background: #ece7e040; }
div#pivotres td.column.subtotal.subtotal-4 { background: #ece7e030; }
div#pivotres td.column.subtotal.subtotal-5 { background: #ece7e020; }


input#swapxy {
    background: linear-gradient(#abc8e4a8, #8da2d8);
    border: 1px solid #b0b0ef;
    border-radius: 3px;
}

table#pivotdesignertop,
table#pivotdesigner {
    width: 100%;
    margin: 0 auto;
}

div#help {
    float: right;
    background: #ffffe2;
    padding: 3px 10px;
    border: 1px solid #550;
    border-radius: 7px;
    cursor: pointer;
    box-shadow: 0 0 10px #f3f3bd;
}

div#help:hover {
   background: #ffffea;	
}

.pivcontrol {
    margin: 4px 0px;
}

.datamarker,
.joinoptionm,
.joinoptionn,
.pivoption {
    border: 1px solid #44c;
    border-radius: 6px;
    background: #e6e6ff;
    text-align: center;
    padding: 1px 4px;
    margin: 4px 4px;
    box-shadow: 0 0 8px #008;
	color:#000;
	cursor:pointer;
}

.pivoption.selected {
	border-color: #0f0;
}

#pivotres {
	text-align: center;
    color: #825b33;
    max-height: 50vh;
    overflow: auto;
}

#pivotres .simpleTable {
	margin: 0 auto;
	border-spacing: 0px;	
}


#pivotrows {
	min-height: 25vh;
	max-height: 75vh;
}

.datamarker,
#pivotoptions .pivoption,
#pivotoptions .ui-sortable-placeholder,
#pivotcols .pivoption,
#pivotcols .ui-sortable-placeholder,
#pivotdata .pivoption,
#pivotdata .ui-sortable-placeholder
{
    display: inline-block;
	min-height:15px;
	min-width:3px;
	font-size: 1.2em;
}

.joindropm,
.joindropn,
.pivdrop {
    border: 2px dashed #888;
    min-width: 30px;
    min-height: 30px;
    border-radius: 10px;
	text-align: center;
	color: #aaa;
	max-height: 25vh;
    overflow: auto;
    font-size: 0.9em;
}

#pivotdesigner {
	table-layout:fixed;
}
#pivotdesigner td {
	vertical-align: top;
}

.hoptions {
    float: left;
	margin: 0 6px 0 0;
}

.hoption {
    border: 1px solid #8ab;
    width: 12px;
    display: inline-block;
    border-radius: 4px;
    height: 11px;
    text-align: center;
    font-size: 10px;
    vertical-align: middle;
    padding: 2px 2px;
	margin: 0 4px 0 0;
	top: -1px;
}

.pivoption:hover {
	background: #f6f6ff;
}

.hoption:hover {
	outline: 2px solid #ff0;
}

.hoption.itemset {
    background-color: #36ff36;	
}

.pivoptiontotal {
    display: inline-block;
    top: 3px;
    position: relative;
}

.hosort.warning {
    background-color: #ffc53196;
}

	`);
	

	// *********************************************** Start of model.pivot ***********************************************
	// Pivot function
	//
	// For full description of jrbAnalytics standardized table object see comments for utils.objectifyTable in jrbAnalytics.js
	//
	// Input parameters
	// 		dataObject - create with jA.getGlobal('utils.objectifyTable')(myTable) where myTable is a simple array of [{field_name:value...., }] elements 
	// 		params - object defining pivot actions. Can be null if using designer to create this. Recommen to use designer to
	//        create this.
	// 		pivotelID - element id where to put pivot designer. optional. if missing, will return pivoted data in dataObject format
	// Return
	// 		dataObject of pivoted table. Additional values available in dataObject model returned:
	//			multicolheader: number of column headers (counts from 1) in pivoted table
	//			multirowheader: number of row headers (counts from 1) in pivoted table
	//			pivotWhereFrom object containing {
	//				source: original dataObject that was pivoted
	//				lookup: array in [{colID1: [rownumbera, rownumberb, ...], colID2: ...}, ....] format. Use to determine for everything
	//						cell in the pivoted result, which rows of data were used from the original dataObject that was pivoted (source)
	//				getRows: helper function that returns array of source row numbers given cell column & row number	
	//				getTable: helper function that returns array of source data given cell column & row number	
	//			}
	//			** see pivotExample.html for example use of pivotWhereFrom. Click on a cell in the example designer to show array of row numbers **
	//	
				
	jA.setGlobal('model.pivot', function(dataObject, params, pivotelID) {

		//**** in model.pivot ****
		function getHeader(el) {
			
			var headerID = el.className.match(/hn-(\d+)/);
			
			return headers[headerID[1]];	
		}

		// *********************************************** Start of showPivotUI in model.pivot ***********************************************
		// Typically called one to setup the UI for the Pivot Designer
		function showPivotUI() {


			//**** in showPivotUI in model.pivot ****
			function addClass(target, ss) {
				if (target && target.className.indexOf(ss) <0) target.className += ' '+ss;
			}

			//**** in showPivotUI in model.pivot ****
			function removeClass(target, ss) {
				target.className = target.className.replace(' '+ss, '');
			}

			//**** in showPivotUI in model.pivot ****
			function clearOption(headerName, fn, operation, target, warning) { 
			
				var p = params.draftpivotconfig;

				if (p.options && p.options[headerName] && p.options[headerName][fn]) delete p.options[headerName][fn]; //not ideal. 
				
				removeClass(target, 'itemset'); 
				if (warning) {
					addClass(target, 'warning');
					target.oldtitle = target.title;
					target.title = warning;
				} else {
					if (target.oldtitle) {
						removeClass(target, 'warning');
						target.title = target.oldtitle;	
						target.oldtitle = null;						
					}
					refreshPivotUI();  //warning set here so don't call this if warning set
				}
			}
			
			//**** in showPivotUI in model.pivot ****
			function addOption(headerName, fn, operation, val, target, noRefresh) {
				
				var p = params.draftpivotconfig, 
					ov, idx;
				
				if (!p.options) p.options = {};
				if (!p.options[headerName]) p.options[headerName] = {};
				if (!p.options[headerName][fn]) p.options[headerName][fn] = {};
				
				p.options[headerName][fn][operation] = val;
				
				if (target) {
					addClass(target, 'itemset');
					if (target.oldtitle) {
						removeClass(target, 'warning');
						target.title = target.oldtitle;	
						target.oldtitle = null;						
					}
				}
				if (!noRefresh) refreshPivotUI();
				
			}
			
			//**** in showPivotUI in model.pivot ****
			function getOption(headerName, fn, operation) {
				
				var p = params.draftpivotconfig;
				
				if (p && p.options && p.options[headerName] && p.options[headerName][fn]) return p.options[headerName][fn][operation];
				else return null;
				
			}



			//**** Start of filterMenu in showPivotUI in model.pivot ****
			function filterMenu(target) {
				
				var headerName = getHeader(target.parentNode.parentNode), 
					currentValue = getOption(headerName, 'filter', 'in'),
					labelRLU = dataObject.labelRLU,
					datasource = dataObject.datasource,
					cID = labelRLU[headerName],
					colValues = {}, 
					valueCount = 0;
					
				datasource.forEach(function(row, idx) {
					if (!colValues[row[cID]]) {
						valueCount++;
						colValues[row[cID]] = 1;
					}
					else colValues[row[cID]]++;
				});
				
				jA.getGlobal('ui.widget.valueselect')(colValues, {
					target: target, 
					currentValue: currentValue, 
					search: true, 
					all: true, 
					multiselect: true, 
					//userSortable: true,
					//currentSort: getOption(headerName, 'filter_sort', 'in'),
					showTotals: true,
					oneClickAction: false,
					attachID: pivotelID,
					callback: 	
						function(selectedItems) {
							if (selectedItems) {
								//addOption(headerName, 'filter_sort', 'in', this.sorted, null, true); //don't set indicator flag by not including target. No refresh
								if (!selectedItems.length || selectedItems.length == valueCount) {//clear filter
									clearOption(headerName, 'filter', 'in', target);
								} else {
									addOption(headerName, 'filter', 'in', selectedItems, target);
								}
							}
						}
				});
			}
			//**** End of filterMenu in showPivotUI in model.pivot ****


			//**** Start of sortManualMenu in showPivotUI in model.pivot ****
			function sortManualMenu(target) {
				
				var headerName = getHeader(target.parentNode.parentNode), 
					labelRLU = dataObject.labelRLU,
					datasource = dataObject.datasource,
					cID = labelRLU[headerName],
					colValues = {}, 
					valueCount = 0;
					
				datasource.forEach(function(row, idx) {
					if (!colValues[row[cID]]) {
						valueCount++;
						colValues[row[cID]] = 1;
					}
					else colValues[row[cID]]++;
				});
				
				jA.getGlobal('ui.widget.valueselect')(colValues, {
					target: target, 
					noselect: true,
					userSortable: true,
					currentSort: getOption(headerName, 'msort', 'msort'),
					oneClickAction: false,
					attachID: pivotelID,
					callback: 	
						function(selectedItems) {
							if (this.sorted) {
								addOption(headerName, 'msort', 'msort', this.sorted, target); 
							} else {
								clearOption(headerName, 'msort', 'msort', target); 	
							}
						}
				});
			}
			//**** End of sortManualMenu in showPivotUI in model.pivot ****
			


			//**** Start of sortMenu in showPivotUI in model.pivot ****
			function sortMenu(target, doTest) {
				
				if (!target) return;
				
				var headerName = getHeader(target.parentNode.parentNode), //headers[headerID[1]],
					pivoted = params.draftOutput,
					pconfig = params.draftpivotconfig,
					iloop, jloop, tmp, optioncount = 0;
					options = pconfig.options
					vals = {},
					currentValue = getOption(headerName, 'sort', 'sort');

				//sortCache[headerName] = target; //used to check validity later
				
				vals['Descending - '+headerName]={col: 'self', direction: 1}; 
				vals['Ascending - '+headerName]={col: 'self', direction: -1}; 
				optioncount += 2;
				
				if (pconfig.dataNames) { 
					pconfig.dataNames.forEach(function(dataName, idx) {
						if (options && options[dataName] && options[dataName].summarytype) {
							options[dataName].summarytype.summarytype.forEach(function(fnName, idx) {
								vals['Descending - '+dataName + ' ('+fnName+')']={col: 'self', direction: 1}; 
								vals['Ascending - '+dataName + ' ('+fnName+')']={col: 'self', direction: -1}; 
								optioncount += 2;
							});
						} else {
							vals['Descending - '+dataName + ' ('+pconfig.pivotFn+')']={col: 'self', direction: 1}; 
							vals['Ascending - '+dataName + ' ('+pconfig.pivotFn+')']={col: 'self', direction: -1};
							optioncount += 2;						
						}
					});
				}
				
				if (doTest) { //test only, no widget
					return vals[currentValue];	
				} else {
					jA.getGlobal('ui.widget.valueselect')(vals, { //{Descending:1, Ascending:1}, {
						target: target, 
						currentValue: currentValue,
						search: false, 
						all: false, 
						multiselect: false, 
						showTotals: false,
						attachID: pivotelID,
						oneClickAction: true,
						callback: 	
							function(selectedItems) {
								if (selectedItems) {
									if (!selectedItems.length || selectedItems.length == optioncount) {//clear filter
										clearOption(headerName, 'sort', 'sort', target);
									} else {
										addOption(headerName, 'sort', 'sort', selectedItems, target);
									}
								}
							}
					});
					
					return null;
				}
			}
			//**** End of sortMenu in showPivotUI in model.pivot ****


			//**** Start of summary in showPivotUI in model.pivot ****
			function summary(target, option) {
				
				var gparent = target.parentNode.parentNode,
					headerName; 

				if (gparent.id == 'rowtotals') headerName = '__rowTotals';
				else if (gparent.id == 'coltotals') headerName = '__colTotals';
				else if (gparent.id == 'datatotals') headerName = '__dataTotals';
				else headerName = getHeader(target.parentNode.parentNode);
				
				
				jA.getGlobal('ui.widget.valueselect')($.extend({'Summary':1}, pivotfunctions), {
					target: target, 
					currentValue: getOption(headerName, 'summary', option),
					currentSort: getOption(headerName, 'summary_sort', option),
					search: false, 
					all: false, 
					multiselect: true, 
					userSortable: true,
					attachID: pivotelID,
					showTotals: false,
					oneClickAction: false,
					callback: 	
						function(selectedItems) {
							if (selectedItems) {
								addOption(headerName, 'summary_sort', option, this.sorted, null, true); //don't set indicator flag by not including target, no refresh
								if (!selectedItems.length) {//clear filter
									clearOption(headerName, 'summary', option, target);
								} else {
									addOption(headerName, 'summary', option, selectedItems, target);
								}
							}
						}
				});

			}
			//**** End of summary in showPivotUI in model.pivot ****


			//**** Start of summarytypes in showPivotUI in model.pivot ****
			function summarytypes(target) {
				
				var headerName = getHeader(target.parentNode.parentNode);

				jA.getGlobal('ui.widget.valueselect')(pivotfunctions, {
					target: target, 
					currentValue: getOption(headerName, 'summarytype', 'summarytype'),
					search: false, 
					all: false, 
					attachID: pivotelID,
					currentSort: getOption(headerName, 'summarytype_sort', 'summarytype'),
					multiselect: true, 
					userSortable: true,
					showTotals: false,
					oneClickAction: false,
					callback: 	
						function(selectedItems) {
							if (selectedItems) {
								addOption(headerName, 'summarytype_sort', 'summarytype', this.sorted, null, true); //don't set indicator flag by not including target & no refresh
								if (!selectedItems.length) {//clear filter
									clearOption(headerName, 'summarytype', 'summarytype', target);
								} else {
									addOption(headerName, 'summarytype', 'summarytype', selectedItems, target);
								}
							}
						}
				});

			}
			//**** End of summarytypes in showPivotUI in model.pivot ****
			
			
			//**** start setupOptions in showPivotUI in model.pivot ****
			function setupOptions(parent) {
				
				
				var $parent = $(parent),
					$pivoptions = $parent.find('.pivoption'),
					parentID = parent.id,
					options,
					c_filter = '<span class="hoption hofilter ui-icon ui-icon-volume-off" title="Filter this data."></span>',
					c_msort = '<span class="hoption homsort ui-icon ui-icon-arrowthick-2-n-s" title="Sort this data by hand. Drag items in list."></span>',
					c_sort = '<span class="hoption hosort ui-icon ui-icon-caret-2-n-s" title="Sort this data automatically, overrides sorting by hand."></span>',
					c_stop = '<span class="hoption hosummarytop ui-icon ui-icon-arrowthickstop-1-n" title="Top summary options. Multiple permitted. Drag items to change order. Use summary to follow collation options."></span>', //do summary at top
					c_sbot = '<span class="hoption hosummarybot ui-icon ui-icon-arrowthickstop-1-s" title="Bottom summary options. Multiple permitted. Drag items to change order. Use summary to follow collation options."></span>', //do summary at bottom
					c_sleft = '<span class="hoption hosummaryleft ui-icon ui-icon-arrowthickstop-1-w" title="Left summary options. Multiple permitted. Drag items to change order. Use summary to follow collation options."></span>', //summary to left
					c_sright = '<span class="hoption hosummaryright ui-icon ui-icon-arrowthickstop-1-e" title = "Right summary options. Multiple permitted. Drag items to change order. Use summary to follow collation options."></span>', //summary to right
					c_types = '<span class="hoption hosummarytypes ui-icon ui-icon-cart" title="Select collation options. Multiple permitted. Drag items to change order."></span>', //how to collate
					headerval; //one of pivotrows, pivotoptions, pivotcols, pivotdata

				if (params.draftpivotconfig && params.draftpivotconfig.options) {
					options = params.draftpivotconfig.options;
				}
				
				$parent.find('.hoptions').remove(); //in case of multi selections, need to redo all
				switch (parentID) {

					case 'pivotoptions' :
						$pivoptions.append('<div class="hoptions">'+c_filter+'</div>');
						break;
					
					case 'pivotrows' :
						$pivoptions.append('<div class="hoptions">'+c_filter+c_msort+c_sort+c_stop+c_sbot+'</div>');
						break;

					case 'pivotcols' :
						$pivoptions.append('<div class="hoptions">'+c_filter+c_msort+c_sort+c_sleft+c_sright+'</div>');
						break;

					case 'pivotdata' :
						$pivoptions.append('<div class="hoptions">'+c_filter+c_types+'</div>');  //add later?: c_sort+c_sleft+c_sright
						break;
						
					case 'rowtotals' :
						$parent.append('<div class="hoptions">'+c_stop+c_sbot+'</div>');
						if (options && options.__rowTotals) {
							if (options.__rowTotals.summary.topOrleft) addClass($parent.find('.hosummarytop')[0], 'itemset');
							if (options.__rowTotals.summary.rightOrbottom) addClass($parent.find('.hosummarybot')[0], 'itemset');
						}				
						break;

					case 'coltotals' : //never true. Use case?
						$parent.append('<div class="hoptions">'+c_sleft+c_sright+'</div>');
						if (options && options.__colTotals) {
							if (options.__colTotals.summary.topOrleft) addClass($parent.find('.hosummaryleft')[0], 'itemset');
							if (options.__colTotals.summary.rightOrbottom) addClass($parent.find('.hosummaryright')[0], 'itemset');
						}
						break;

					case 'datatotals' :
						$parent.append('<div class="hoptions">'+c_sleft+c_sright+'</div>');
						if (options && options.__dataTotals) {
							if (options.__dataTotals.summary.topOrleft) addClass($parent.find('.hosummaryleft')[0], 'itemset');
							if (options.__dataTotals.summary.rightOrbottom) addClass($parent.find('.hosummaryright')[0], 'itemset');
						}
						break;

					default:
						break;
					
				}
				
				if (options) {
					$pivoptions.each(function(idx, pivoption) {
						var name = this.innerText,
							$pivoption = $(pivoption),
							options_name = options[name],
							iloop;
						
						if (options_name) {
							for (iloop in options_name) {
								switch(iloop) {
									case 'filter':
										if (options_name.filter.in) addClass($pivoption.find('.hofilter')[0], 'itemset');
										break;
									case 'msort':
										if (options_name.msort.msort) addClass($pivoption.find('.homsort')[0], 'itemset');
										break;
									case 'sort':
										if (options_name.sort.sort) addClass($pivoption.find('.hosort')[0], 'itemset');
										break;
									case 'summary':
										if (options_name.summary.topOrleft) {
											addClass($pivoption.find('.hosummaryleft')[0], 'itemset');
											addClass($pivoption.find('.hosummarytop')[0], 'itemset');
										}
										if (options_name.summary.rightOrbottom) {
											addClass($pivoption.find('.hosummaryright')[0], 'itemset');
											addClass($pivoption.find('.hosummarybot')[0], 'itemset');
										}
										break;
									case 'summarytype':
										if (options_name.summarytype.summarytype) addClass($pivoption.find('.hosummarytypes')[0], 'itemset');
										break;
									default:
										break;
								}
								
								//addClass(target, 'itemset');
							}
						}
						
					});
					
				}
				
				$parent.find('.hofilter').click(function(e) { filterMenu(e.target); return false;});
				$parent.find('.hosort').click(function(e) { sortMenu(e.target);  return false;});
				$parent.find('.homsort').click(function(e) { sortManualMenu(e.target);  return false;});

				$parent.find('.hosummaryleft').click(function(e) { summary(e.target, 'topOrleft');  return false;});
				$parent.find('.hosummaryright').click(function(e) { summary(e.target, 'rightOrbottom');  return false;});
				$parent.find('.hosummarytop').click(function(e) { summary(e.target, 'topOrleft');  return false;});
				$parent.find('.hosummarybot').click(function(e) { summary(e.target, 'rightOrbottom');  return false;});
				$parent.find('.hosummarytypes').click(function(e) { summarytypes(e.target);  return false;});	
						
			}
			//**** end setupOptions in showPivotUI in model.pivot ****


			
			// *********************************************** Start of refreshPivotUI in showPivotUI in model.pivot ***********************************************		
			function refreshPivotUI() {
				
				doPivot('pivotres');
				
				var pconfig = params.draftpivotconfig,
					$pivItems,// = $('.pivoption ');
					pivCheck, tmp,
					options,
					iloop, jloop;
					
				//must test if some filter setting invalidated. Happens when filter set on calculated value, then calculated function changes
				if (pconfig) {
					
					options = pconfig.options;
					
					if (options) {
						for (iloop in options) {
							if (options[iloop].sort) {
								if (!$pivItems) {//one time
									$pivItems = $('#pivotrows .pivoption,#pivotcols .pivoption');
									pivCheck = {};
									for (jloop=0; jloop<$pivItems.length; jloop++) {
										tmp = $($pivItems[jloop]).find('.hosort');
										if (tmp.length) pivCheck[$pivItems[jloop].innerText] = tmp[0];
									};
								}
								
								if (!sortMenu(pivCheck[iloop], true)) {
									clearOption(iloop, 'sort', 'sort', pivCheck[iloop], "Selected sort option no longer valid and was cleared.");	
								}
							}
						}
					}

					if (pconfig.dataMarkerPosition == undefined) {
						$('#pivotcols .datamarker').remove();
					} else {
						if (pconfig.dataMarkerPosition < 0) { //create
							$('#pivotcols').append('<div class="datamarker">[data]</div>');
							$( ".datamarker" ).draggable({
								connectToSortable: "#pivotcols",
							});
						}
					}
					if ((pconfig.columnNames && pconfig.columnNames.length) || (options && options.__colTotals && options.__colTotals.summary)) 
						$('#coltotals').show(); else $('#coltotals').hide(); 
					if (pconfig.rowNames && pconfig.rowNames.length || (options && options.__rowTotals && options.__rowTotals.summary))
						$('#rowtotals').show(); else $('#rowtotals').hide(); 
					
					//Never enabled. Use case?
					//if (pconfig.dataNames && pconfig.dataNames.length) $('#datatotals').show(); else $('#datatotals').hide(); 
					document.dispatchEvent(uiRefreshEvent);
				}
				
			}
			// *********************************************** End of refreshPivotUI in showPivotUI in model.pivot ***********************************************		



			// *********************************************** Start of main code for showPivotUI in model.pivot ***********************************************		
			
			var iloop, tmp,
				emptyItems = {'': '[Empty String]', ' ': '[Single Space]', 0: '0', 'null': '[null]', 'undefined': '[undefined]'},
				headerOptions = (pconfig && pconfig.headerOptions)?pconfig.headerOptions:{}, 
				uiRefreshEvent = new Event('refreshedUI'),
				headers = dataObject.headerList;

			$('#'+pivotelID).append('<table id="pivotdesignertop"><tr><td><h1>Pivot Designer</h1></td><td><div id="help">Quick Start Guide</div></td></tr></table><table id="pivotdesigner"><colgroup><col style="width:25%;"><col style="width:75%;"></colgroup><tr><td colspan="2"><div id="pivotoptions" class="pivdrop"></div></td></tr><tr><td rowspan="2" id="pivctrl" class="pivc0"></td><td class="pivc1"><div id="coltotals" class="pivoptiontotal"></div>Drop column headers here<div id="pivotcols" class="pivdrop"></div></td></tr><tr><td class="pivc1"><div id="datatotals" class="pivoptiontotal"></div>Drop data to be pivoted here<div  id="pivotdata" class="pivdrop"></div></td></tr><tr><td class="pivc0"><div id="rowtotals" class="pivoptiontotal"></div>Drop row headers here<div id="pivotrows" class="pivdrop"></div></td><td class="pivc1"><div id="pivotres">Pivot will be created here</td></td></tr></table>');	
				
			for (iloop=0; iloop<headers.length; iloop++) {				
				if (pconfig && pconfig.dataNames.indexOf(headers[iloop]) >=0) tmp = $('#pivotdata');
				else if (pconfig && pconfig.columnNames.indexOf(headers[iloop]) >=0) tmp = $('#pivotcols'); 
				else if (pconfig && pconfig.rowNames.indexOf(headers[iloop]) >=0) tmp = $('#pivotrows'); 
				else tmp = $('#pivotoptions');
				tmp.append('<div class="pivoption hn-'+iloop+' sortable">'+headers[iloop]+'</div>');	
				if (!headerOptions[headers[iloop]]) headerOptions[headers[iloop]] = {};
			}

			tmp = '';
			for (iloop in pivotfunctions) tmp += '<option value="'+iloop+'"'+(pconfig && pconfig.pivotFn===iloop?' selected':'')+'>'+iloop+'</option>';
			$('#pivctrl').append('<span class="pivcontrol">Select default pivot function: </span><select id="pivotFn" class="pivcontrol">'+tmp+'</select>');
			$('#pivctrl').append('<br><input type="button" id="swapxy" class="pivcontrol" value="Transpose">');
			$('#pivctrl').append('<br><input id="cleandata" type="checkbox" checked class="pivcontrol"><span class="pivcontrol"> Ignore empty data cells?</span>');
			
			tmp = '';
			for (iloop in emptyItems) tmp += '<option value="'+iloop+'"'+(pconfig && pconfig.pivotEmpty===iloop?' selected':'')+'>'+emptyItems[iloop]+'</option>';
			$('#pivctrl').append('<br><span class="pivcontrol">Fill empty cells with: </span><select id="pivotEmpty" class="pivcontrol">'+tmp+'</select>');


			if (pconfig) {
				$('#cleandata').prop('checked', pconfig.cleandata);	
			}
			$('.pivcontrol').hide();
			$('.pivoptiontotal').hide();
			
			$('.pivdrop,#rowtotals,#coltotals').each(function(idx, el) { setupOptions(el); });  //add later?: ,#datatotals
			
			$('.pivdrop').multisortable({
				connectWith: '.pivdrop',
				items: "div.sortable",
				selectedClass: "selected",
				placeholder: 'ui-state-highlight',
				over: function(event, ui) {
					if (ui.item[0].className.match(/datamarker/)) { 
						if (ui.placeholder[0].parentNode.id && ui.placeholder[0].parentNode.id != 'pivotcols') return false;
					} else return true;
				},
				stop: function( event, ui ) {
					
					setupOptions(ui.item[0].parentNode);
					
					refreshPivotUI(); 						
					
					//multiselect has timeout to set selection. But I want to clear after drop, so do this way.
					setTimeout(function() {
						$('.pivoption.selected').each(function(idx, item) {
							item.className =item.className.replace(' selected', '');
						});	
					}, 10);
			
				}
			}).disableSelection();	
			
			$('#swapxy').click(function (e) {
				var $cols = $('#pivotcols .pivoption'),
					$rows = $('#pivotrows .pivoption');
				
				$('#pivotrows').append($cols);
				$('#pivotcols').append($rows);
				refreshPivotUI(); //doPivot('pivotres');
			});
			
			$('#pivotFn').change(function(e) { refreshPivotUI(); });
			$('#pivotEmpty').change(function(e) { refreshPivotUI(); });
			
			$('#cleandata').click(function(e) { refreshPivotUI(); }); 
			
			$('#help').click(function(e) { jA.getGlobal('utils.doPopup')('jrbPivot Guide', getHelp()); });
			
			refreshPivotUI();

			// *********************************************** End of main code for showPivotUI in model.pivot ***********************************************		

		}
		// *********************************************** End of showPivotUI in model.pivot ***********************************************		


		// *********************************************** Start of doPivot in model.pivot ***********************************************
		// elid - optional. If set pivot designer is being used.
		function doPivot(elid) {
			

			// *********************************************** Start of orderedNames in doPivot in model.pivot ***********************************************
			//sort by tokens pre-pivot columns and rows
			//  codeslookup - object associating token with original field values
			//  names - array of field names
			//  sortInfox - digensted sort information, set by sort widget
			//	sortInfox_fs - manually sorted field names. Set in filter dropdown for now. lowe rpriority than sortInfox
			function orderedNames(codeslookup, names, sortInfox, sortInfox_fs) {
			
				var order = Object.keys(codeslookup),
					sortOrder,
					sortOrderArr,
					colIDs,
					name;
				
				if (names.length) { //no column sort needed otherwise
					sortOrderArr = [];
					colIDs = [];
					
					//sortInfo[name] = [sortOrder, sortColName];
					
					for (iloop = 0; iloop < names.length; iloop++) {
						name = names[iloop];
						sortOrderArr[iloop]  = (sortInfox&&sortInfox[name])?sortInfox[name][0]:0;
						colIDs[iloop] = labelRLU[name];
					}
					
					order.sort(function(keya, keyb) { 
						var sloop = 0,
							tmp,
							codea = codeslookup[keya],
							codeb = codeslookup[keyb];

						if (codea.level == 0 || codeb.level == 0) {
							tmp = ((codea.level == 0)?codea.totalPositionCalc:0) - 
								((codeb.level == 0)?codeb.totalPositionCalc:0); 				
							if (tmp) return tmp;
						}
						
						while (sloop <codea.length || sloop <codeb.length) {

							if (codea[sloop] != codeb[sloop]) {
								if (!sortOrderArr[sloop]) { //sort not set. use colValueCache or sortInfox_fs
									tmp = sortInfox_fs?sortInfox_fs[names[sloop]]:0;  //manual sort
									if (tmp) { //manual sort
										return tmp[codea[sloop]] - tmp[codeb[sloop]]; //note (a-b)
									} else {
										tmp = colValueCache[colIDs[sloop]]; //weighted by frequency, then found first
										return tmp[codeb[sloop]] - tmp[codea[sloop]]; //note (b-a)
									}
								} else {
									if (codea[sloop] > codeb[sloop]) return sortOrderArr[sloop]; 
									else return -sortOrderArr[sloop]; 
								}
							}
							if (codea.level == sloop+1 || codeb.level == sloop+1) {
								tmp = ((codea.level== sloop+1)?codea.totalPositionCalc:0) - 
									((codeb.level== sloop+1)?codeb.totalPositionCalc:0); 
								
								if (tmp) return tmp;
							}
							sloop++;
						}
						return 0;
					});
				}
				
				return order;
			}
			// *********************************************** End of orderedNames in doPivot in model.pivot ***********************************************
			

			// *********************  in doPivot in model.pivot ************************
			function copyArrayStart(arr, number) {
				
				var nloop, result = [];
				for (nloop=0; nloop <number; nloop++) {
					result.push(arr[nloop]);	
				}
				return result;
			}

			// *********************************************** Start of doSortBins in doPivot in model.pivot ***********************************************
			//check and if needed create sort bins for post sort activity		
			function doSortBins(outputRow, codeLookupValue) {
					
				function doSortBin(type) {
				
					var sortInfo_type = sortInfo[type],
						bintype = type+'bin',
						mloop,
						tmp5, tmp6, tmp7;

					if (sortInfo_type) {				
						
						if (!sortInfo.colLookup[outputRow.length]) {//do once - used by row & column
							tmp5 = codeLookupValue||[];
							
							if (tmp5.level == undefined || tmp5.level) { //not a total column - only place these items in sort bins
								tmp5 = headerObj[kloop].label+' ('+tmp3+')';
							} else tmp5="";
							
							sortInfo.colLookup[outputRow.length] = tmp5;	
						} else
							tmp5 = sortInfo.colLookup[outputRow.length];							
						
						for (mloop in sortInfo_type) {
							if (sortInfo_type[mloop][1] == tmp5) { //sorting on this row item with theese column values
								if (!sortInfo[bintype]) sortInfo[bintype] = {};
								if (!sortInfo[bintype][mloop]) sortInfo[bintype][mloop] = {};
								tmp6 = sortInfo_type[mloop][2];
								if (type == 'row') {
									tmp7 = copyArrayStart(outputRow, tmp6+1);
								} else { //column
									tmp7 = copyArrayStart(codeLookupValue, tmp6+1);
								}
								if (!sortInfo[bintype][mloop][tmp7]) sortInfo[bintype][mloop][tmp7] = [tmp3]; //1st element is operation to use
								sortInfo[bintype][mloop][tmp7] = sortInfo[bintype][mloop][tmp7].concat(pivotcalc[rnsValue][cnsValue][kloop]);  //only 1 sort bin per row item
							}
							
						}

					}
					
				}
				
				if (sortInfo.rowpostSort) doSortBin('row');
				if (sortInfo.colpostSort) doSortBin('col');
			}
			// *********************************************** End of doSortBins in doPivot in model.pivot ***********************************************
									

			// *********************************************** Start of doPostPivortSort in doPivot in model.pivot ***********************************************
			//Postpivot sort by rows. Needed if sorting by data calulated post pivot. Aborts if not needed
			function doPostPivortSort() {
				
				function ppsort(type, names, sortme) {
					
					var sortOrderArr,
						iloop, mloop,
						colIDs = [],
						tbin = type+'bin';
					
					if (sortInfo[tbin]) { //no row sort needed otherwise
						
						sortOrderArr = [];

						//process sort bins
						for (mloop in sortInfo[tbin]) {
							for (iloop in sortInfo[tbin][mloop]) {
								tmp = sortInfo[tbin][mloop][iloop];
								fn = tmp.shift();
								sortInfo[tbin][mloop][iloop] = pivotfunctions[fn](tmp);
							}
						}
											
						for (iloop = 0; iloop < names.length; iloop++) {
							name = names[iloop];
							sortOrderArr[iloop] = sortInfo[type][name]?[sortInfo[type][name][0], iloop]:[0, iloop]; 
							if (sortInfo[tbin][name]) sortOrderArr[iloop].push(true);
							colIDs[iloop] = labelRLU[name];
						}
						
						sortme.sort(function(rowa, rowb) { 
						
							var sloop = 0,
								tmp, col, va, vb,
								av, bv;

							if (rowa._level == 0 || rowb._level == 0) {
								tmp = ((rowa._level == 0)?rowa._totalPositionCalc:0) - 
									((rowb._level == 0)?rowb._totalPositionCalc:0); 			
								if (tmp) return tmp;
							}
							
							while (sloop <sortOrderArr.length) {
								col = sortOrderArr[sloop][1];

								if (sortOrderArr[sloop][2]) { //use bin value
								
									av = copyArrayStart(rowa, sloop+1);   //sort bin ID for row a
									bv = copyArrayStart(rowb, sloop+1);		//sort bin ID for row b
								
									tmp = sortInfo[tbin][names[sloop]];  //all sort bins for this field
									va = tmp[av];
									vb = tmp[bv];
									if (va == vb) { //keeps items together
										va = rowa[sloop];
										vb = rowb[sloop];									
									}
								} else {
									va = rowa[col];
									vb = rowb[col];
								}
								
								if (va != vb) {
									if (!sortOrderArr[sloop][0]) { //sort not set. use colValueCache or sortInfox_fs
										tmp = sortInfo['fs_'+type]?sortInfo['fs_'+type][names[sloop]]:0;  //manual sort
										if (tmp) { //manual sort
											return tmp[va] - tmp[vb]; //note (a-b)
										} else {
											tmp = colValueCache[colIDs[sloop]]; //weighted by frequency, then found first
											return tmp[vb] - tmp[va]; //note (b-a)
										}
									} else {
										if (va > vb) return sortOrderArr[sloop][0]; 
										else return -sortOrderArr[sloop][0]; 
									}
								
								}
								if (rowa._level == sloop+1 || rowb._level == sloop+1) {
									tmp = ((rowa._level== sloop+1)?rowa._totalPositionCalc:0) - 
										((rowb._level== sloop+1)?rowb._totalPositionCalc:0); 
									
									if (tmp) return tmp;
								}
								sloop++;
							}
							return 0;
						});
						
						return true;
					} else return false;											
				}
					
				var headerSort, sorted;
				
				ppsort('row', rns, outputTable);
				
				headerSort = [].concat(pivotHeader); //copy
				sorted = ppsort('col', cns, headerSort);
				
				// Additional column sort where the data columns headers are not at the bottom
				if (dataMarkerPosition != undefined && dataMarkerPosition != cns.length) {
					headerSort.sort(function(rowa, rowb) { 
						var p = 0;
						
						while (p < dataMarkerPosition) { //don't sort if header items above are different
							if (rowa[p] != rowb[p]) return 0; 
							p++;
						}
						if (rowa[dataMarkerPosition] == rowb[dataMarkerPosition]) return 0;
						else if (rowa[dataMarkerPosition] > rowb[dataMarkerPosition]) return 1;
						return -1;
					});
					sorted = true;
				}
				if (sorted) pivotHeader.headerSort = headerSort;
				
								
			}
			// *********************************************** End of doPostPivortSort in doPivot in model.pivot ***********************************************
			

			// *********************************************** Start of getIndex in doPivot in model.pivot ***********************************************
			//calculate token value for row or column based in input data content
			function getIndex(row, names, codeslookup, fill, position, operation) {
				var iloop,
					code,
					idx = [];
				
				for (iloop=0; iloop<names.length; iloop++) {
					idx.push(row[labelRLU[names[iloop]]]);
				}
				code = idx.join('-||-');
				if (fill != undefined) { //total row
					code += position + ' ' + operation;

					if (fill>0) idx = idx.concat(new Array(fill).fill('')); 
					idx.totalPosition = position;
					idx.totalPositionCalc = (position == 'rightOrbottom')?1:-1;
					idx.operation = operation;
					idx.level = names.length;
				}
				codeslookup[code] = idx;
				return code;
				
			}
			// *********************************************** End of getIndex in doPivot in model.pivot ***********************************************

			
			// *********************************************** Start of doOptionsLoop in doPivot in model.pivot ***********************************************
			function doOptionsLoop(option, fn) {
				var iloop;
				
				for (iloop in options) {
					if (options[iloop][option]) fn(iloop, options[iloop][option]);
				}
			}
			// *********************************************** End of doOptionsLoop in doPivot in model.pivot ***********************************************

			function addErrorMessage(scope, message) {
				pconfig = params.draftpivotconfig;
				if (!pconfig) return;
				if (!pconfig.__ErrorMessages) pconfig.__ErrorMessages = {};
				if (!pconfig.__ErrorMessages[scope]) pconfig.__ErrorMessages[scope]=[];
				pconfig.__ErrorMessages[scope].push(message);	
			}

			function testSortValid(sortString) {
				
				var tmp = sortString.match(/ \((.+)\)$/),
					name, fnList,
					tst,
					dfn = pivotFn;

				//if column Name (function) will match ' (function)'
				if (!tmp) {
					addErrorMessage('sort', 'Sort function not specified or in incorrect format.');
					return false;	
				}

				name = sortString.replace(tmp[0], '');
										
				if (dns.indexOf(name) < 0) {
					addErrorMessage('sort', 'Requesting sort on field name that is not data.');
					return false;								
				}

				if (options[name] && options[name].summarytype) {
					fnList = options[name].summarytype.summarytype;  //array of functions.
					tst = [fnList.indexOf('Summary'), fnList.indexOf(tmp[1])];
					if (tst[1]>=0 || (tst[0]>=0 && tmp[1] == dfn)) return true;
				} else if (tmp[1] == dfn) return true;

				addErrorMessage('sort', 'Requesting sort on function that is not being used.');
				return false;
					
			}
			
			// *********************************************** Start of main code for doPivot in model.pivot ***********************************************
			
			var $cols,
				$rows,
				$data,
				rns=[], cns=[], dns=[],
				rnsSet = {}, cnsSet = {}, dnsSet = {},
				rnsOrder = [], cnsOrder = [], dnsOrder = [],
				rnsValue, cnsValue, dnsValue,
				codeslookuprns = {},
				codeslookupcns = {},
				codeslookupdns = {},
				pivotcalc = {},
				colValueCache,
				pivotFn, pivotEmpty,
				datasource = dataObject.datasource,
				labelRLU = dataObject.labelRLU,
				headerObj = dataObject.headerObj,
				options = params.draftpivotconfig?params.draftpivotconfig.options:{},
				ops = {},
				cleandata,
				iloop, jloop, kloop, lloop,
				outputTable,
				noDataNames,
				dataMarkerPosition,
				pivotHeader,
				usedHeadertoCodeLookup,
				sortInfo = {colLookup: []},
				outputRow,
				pivotcalcTotals = {rns:{}, cns:{}, dns:{}},
				token, rtloop, ctloop, dtloop,
				rowtokens, 
				coltokens, 
				datatokens,
			
				tmp, tmp1, tmp2, tmp3, tmp4;

			//get configuration from UI or as passed
			if (elid) { //in editor
				$cols = $('#pivotcols .pivoption');
				$rows = $('#pivotrows .pivoption');
				$data = $('#pivotdata .pivoption');				
				pivotFn = $('#pivotFn').val();
				pivotEmpty = $('#pivotEmpty').val();
				cleandata = $('#cleandata').prop('checked');
				if (!$data.length && !$cols.length && !$rows.length) {
					$('#'+elid).html('');
					$('.pivcontrol').hide();
					return null;
				}
				for (iloop=0; iloop<$data.length; iloop++) dns.push(getHeader($data[iloop])); 
				for (iloop=0; iloop<$rows.length; iloop++) rns.push(getHeader($rows[iloop])); 
				for (iloop=0; iloop<$cols.length; iloop++) cns.push(getHeader($cols[iloop]));
				
				noDataNames = !dns.length;
				if (noDataNames) {dns = cns; cns=[]; }
				else {
					if (cns.length > 0) {
						dataMarkerPosition = $('#pivotcols .datamarker').index();
					}
				}
				
				params.draftpivotconfig = {
					dataNames: dns,
					columnNames: cns,
					rowNames: rns,
					pivotFn: pivotFn,
					dataMarkerPosition: dataMarkerPosition,
					pivotEmpty: pivotEmpty,
					cleandata: cleandata,	
					options: options
				};
			} else { //pure execution
				if (pconfig) {
					pivotFn = pconfig.pivotFn;
					pivotEmpty = pconfig.pivotEmpty;
					dns = pconfig.dataNames;
					cns = pconfig.columnNames;
					rns = pconfig.rowNames;
					cleandata = pconfig.cleandata;
					options = pconfig.options;
					dataMarkerPosition =  pconfig.dataMarkerPosition;
				} else return []; //something went wrong
			}
			
			if (pivotEmpty == 'null') pivotEmpty = null;
			else if (pivotEmpty == 'undefined') pivotEmpty = undefined;
			
			//Parameter checking. remove bad values
			[dns, cns, rns].forEach(function(names, idx) {
				var iloop,tmp = [], tmp1;
				
				for (iloop=0; iloop<names.length; iloop++) {
					if (!labelRLU[names[iloop]]) tmp.push(iloop);
				}
				if (tmp.length) {
					tmp1 = ['dns','cns','rns'][idx];
					for (iloop=tmp.length-1; iloop>=0; iloop--) {
						addErrorMessage(tmp1, 'Removed "'+names[tmp[iloop]]+'" as this column/field name does not exist in the input data table.');
						names.splice(tmp[iloop],1);
					}
				}
			});
			
			if (!pivotfunctions[pivotFn]) addErrorMessage('pivotFn', 'Unknown function requested. None used.');
			
			
			
			//pivoting data proceeds in the following sequence
			//1. Filter down data where filters set
			//2. Prepare for summary (e.g. grand total) and sort items
			//3. for each input table row, create a row & column token. This + data column operation are collated into a single 
			//    object pivot. pivotcalc[rowtoken][columntoken][datatoken] = array of values to be acted on later. Row & column
			//    total rows/columns get their own unique tokens also.
			//4. Setup operations for each data item to use for collating data items. 'None' means no action.
			//5. Initial sort of rows and column tokens. If data isn't sorted by pivoted values, presorting the tokens will
			//	  result in a correctly sorted pivoted data set. Separate check conducted for rows and columns
			//6. Construct row header & output tables cycling through pivotcalc tokens in the correct order
			//7. Do post pivot sort
			//8. Complete rows header table & column headings in data table.
			//9. Construct jrbAnalytics data object from header and data tables
			
			
			//Step 1. Test for filters & filter if so.
			tmp2 = [];	
			doOptionsLoop('filter', function(name, optionObject) {
				var tmp1 = optionObject.in;
					
				if (tmp1 && tmp1.length) {
					tmp2.push([labelRLU[name], tmp1]);
				}				
			})
			
			if (tmp2.length) {
				datasource = datasource.filter(function(row) { 
					var iloop,
						cc = 0;
					
					for (iloop=0; iloop<tmp2.length; iloop++) {
						if (tmp2[iloop][1].indexOf(''+row[tmp2[iloop][0]]) >= 0) cc++;
					}
					return (cc == tmp2.length);
				});
			}
			//End Step 1. end filter. ttd which is faster? complex filter once, of simple filter multiple times?
	
			//Step 2. Prepare for summary (e.g. grand total) and sort items
			doOptionsLoop('summary', function(name, optionObject) {
				var tmp = [rns.indexOf(name), cns.indexOf(name), dns.indexOf(name)];
				if (tmp[0]>=0 || name == '__rowTotals') pivotcalcTotals.rns[name] = [tmp[0], optionObject];
				else if (tmp[1]>=0 || name == '__colTotals') pivotcalcTotals.cns[name] = [tmp[1], optionObject];
				else if (tmp[2]>=0 || name == '__dataTotals') pivotcalcTotals.dns[name] = [tmp[2], optionObject];
			});		

			//check for manual sort order first. If sort set, will override this.
			doOptionsLoop('msort', function(name, optionObject) {
				var sortOrder = optionObject.msort,
					rlu = {},
					tmp = [rns.indexOf(name), cns.indexOf(name), dns.indexOf(name)],
					tmp1 = tmp[0]>=0?['row',0]:(tmp[1]>=0?['col',1]:['data',2]);
					
				if (sortOrder && sortOrder.length) {
					sortOrder.forEach(function(name, idx) { rlu[name] = idx; });
					if (!sortInfo[tmp1[0]]) sortInfo['fs_'+tmp1[0]] = {};
					sortInfo['fs_'+tmp1[0]][name] = rlu; //sortOrder; 
				}
			});
	
			doOptionsLoop('sort', function(name, optionObject) {
				var sortOrder = optionObject.sort,
					sortColName = name,
					tmp, tmp1,
					postSort = false;
				
				if (sortOrder && sortOrder.length) {
					sortOrder = sortOrder[0].split(' - ');
					sortColName = sortOrder[1];
					
					if (sortColName != name) 
						//need to check to see if sort is valid.
						postSort = testSortValid(sortColName);
						//postSort = true;

					sortOrder = sortOrder[0].match(/Descending/);
					sortOrder = sortOrder?-1: 1; 
				} else sortOrder = 0;
				tmp = [rns.indexOf(name), cns.indexOf(name), dns.indexOf(name)];
				tmp1 = tmp[0]>=0?['row',0]:(tmp[1]>=0?['col',1]:['data',2]);
				if (!sortInfo[tmp1[0]]) sortInfo[tmp1[0]] = {};
				sortInfo[tmp1[0]][name] = [sortOrder, sortColName, tmp[tmp1[1]]]; 
				
				sortInfo[tmp1[0]+'postSort'] = postSort || sortInfo[tmp1[0]+'postSort'];  //if any item is true, post sort required
			});
			//End Step 2. 
			
			
			//Start step 3
			colValueCache = {};
			tmp3 = 0;
			for (iloop=0; iloop<datasource.length; iloop++) {
				rowtokens=[]; 
				coltokens=[]; 
				datatokens=[];
				
				//collect columns values. Determines initial sort order by number of times used then by 1st appearance
				for (jloop in datasource[iloop]) {
					if (!colValueCache[jloop]) colValueCache[jloop] = {};
					tmp = datasource[iloop][jloop];
					if (!colValueCache[jloop][tmp]) {
						colValueCache[jloop][tmp] = 1 + tmp3/datasource.length;
						tmp3 ++;
					}
					else colValueCache[jloop][tmp]++;		
				}
				
				//row tokens
				token = getIndex(datasource[iloop], rns, codeslookuprns);
				rowtokens.push(token);
				if (!rnsSet[token]) rnsSet[token] = true;
				
				//row total tokens
				for (jloop in pivotcalcTotals.rns) {
					tmp = pivotcalcTotals.rns[jloop][0];
					for (kloop in pivotcalcTotals.rns[jloop][1]) {
						for (lloop in pivotcalcTotals.rns[jloop][1][kloop]) {
							token = getIndex(datasource[iloop], [].concat(rns).splice(0,tmp+1), codeslookuprns, rns.length-tmp-1, kloop, pivotcalcTotals.rns[jloop][1][kloop][lloop]);
							rowtokens.push(token);
							if (!rnsSet[token]) rnsSet[token] = true;
						}
					}
				}
				
				//column tokens
				token = getIndex(datasource[iloop], cns, codeslookupcns);
				coltokens.push(token);		
				if (!cnsSet[token]) cnsSet[token] = true;

				//column total tokens
				for (jloop in pivotcalcTotals.cns) {
					tmp = pivotcalcTotals.cns[jloop][0]; //level
					for (kloop in pivotcalcTotals.cns[jloop][1]) { //by summary operation
						for (lloop in pivotcalcTotals.cns[jloop][1][kloop]) {
							token = getIndex(datasource[iloop], [].concat(cns).splice(0,tmp+1), codeslookupcns, cns.length-tmp-1, kloop, pivotcalcTotals.cns[jloop][1][kloop][lloop]);
							coltokens.push(token);
							if (!cnsSet[token]) cnsSet[token] = true;
						}
					}
				}

				//data tokens
				for (jloop=0; jloop<dns.length; jloop++) {
					token = labelRLU[dns[jloop]]; //i.e. colID
					datatokens.push(token);
					if (!dnsSet[token]) dnsSet[token] = true;
				}
				
				
				for (rtloop=0; rtloop<rowtokens.length; rtloop++) {
					token = rowtokens[rtloop];
					if (!pivotcalc[token]) pivotcalc[token] = {};
					tmp = pivotcalc[token];
					for (ctloop=0; ctloop<coltokens.length; ctloop++) {
						token = coltokens[ctloop];
						if (!tmp[token]) tmp[token] = {};
						tmp1 = tmp[token];
						for (dtloop=0; dtloop<datatokens.length; dtloop++) {
							token = datatokens[dtloop];
							if (!tmp1[token]) {
								tmp1[token] = []; //lowest level. Add everything here.
								tmp1[token].whereFrom = [];
							}
							tmp2 = datasource[iloop][token];
							if (!cleandata || (tmp2 !== undefined && tmp2 !== null && tmp2 !== ''))	{
								tmp1[token].push(tmp2);
								tmp1[token].whereFrom.push(iloop);
							}
						}
					}
				}
			}
			
			//End step 3

		
			//Step 4. Setup operations to use for data items. Note more than one operation can be created per data item.
			//TTD - user ordering in this case
			for (kloop in dnsSet) {
				tmp1 = headerObj[kloop].label;
				if (!noDataNames && options && options[tmp1] && options[tmp1].summarytype) ops[kloop] = options[tmp1].summarytype.summarytype;
				else if (pivotFn) ops[kloop] = [pivotFn];
				else ops[kloop] = ['None'];				
			}
			//End Step 4.


			//Step 5. Initial sort of rows and column tokens.
			if (!sortInfo.rowpostSort) 
				rnsOrder = orderedNames(codeslookuprns, rns, sortInfo.row, sortInfo.fs_row);  //Rows Sort
			else
				rnsOrder = Object.keys(codeslookuprns); //else don't bother. we're sorting post pivot.
			
			if (!sortInfo.colpostSort) 
				cnsOrder = orderedNames(codeslookupcns, cns, sortInfo.col, sortInfo.fs_col);  //Columns Sort
			else
				cnsOrder = Object.keys(codeslookupcns); //else don't bother. we're sorting post pivot.
			//End Step 5.
			
			//Step 6 - construct output table 
			pivotHeader = [];	
			outputTable = [];

			for (iloop=0; iloop<rnsOrder.length; iloop++) {
				rnsValue = rnsOrder[iloop];
				outputRow = [].concat(codeslookuprns[rnsValue]);

				if (codeslookuprns[rnsValue].level != undefined) { //total row. Save details for later
					outputRow._rowClass = 'row subtotal subtotal-'+codeslookuprns[rnsValue].level+' '+codeslookuprns[rnsValue].totalPosition;
					outputRow._operation = codeslookuprns[rnsValue].operation;
					outputRow._level = codeslookuprns[rnsValue].level;
					outputRow._totalPositionCalc = codeslookuprns[rnsValue].totalPositionCalc;
				}
				for (jloop=0; jloop<cnsOrder.length; jloop++) { 
					cnsValue = cnsOrder[jloop];
					for (kloop in dnsSet) {
						
						//Construct header for output pivot
						if (!pivotHeader.done) { 
							tmp3 = codeslookupcns[cnsValue]||[];  //Column headers
							if (tmp3.level == 0) tmp3[0] = ['*All'];
							
							for (lloop=0; lloop < ops[kloop].length; lloop++) {
								
								if (tmp3.operation && tmp3.operation != 'Summary') tmp4 = tmp3.operation;
								else tmp4 = ops[kloop][lloop];
								tmp4 = headerObj[kloop].label + ' (' + tmp4 + ')';
								if (dataMarkerPosition != undefined && dataMarkerPosition >= 0) {
									tmp = [].concat(tmp3);
									tmp.splice(dataMarkerPosition, 0, tmp4);
									pivotHeader.push(tmp);
								}
								else 
									pivotHeader.push(tmp3.concat(tmp4));
								
								if (tmp3.level != undefined) { //total column. Save details for later column sort
									tmp = pivotHeader[pivotHeader.length-1];

									tmp._colClass = 'column subtotal subtotal-'+tmp3.level+' '+tmp3.totalPosition;
									tmp._operation = tmp3.operation;
									tmp._level = tmp3.level;
									tmp._totalPositionCalc = tmp3.totalPositionCalc;
								}
								
							}
						}		
						
						for (lloop=0; lloop < ops[kloop].length; lloop++) {
							//operation to use
							tmp3 = codeslookuprns[rnsValue].operation || codeslookupcns[cnsValue].operation; 				
							if (!tmp3 || tmp3 == 'Summary')
								tmp3 = ops[kloop][lloop]; //operation to use
							if (pivotcalc[rnsValue] && pivotcalc[rnsValue][cnsValue] && pivotcalc[rnsValue][cnsValue][kloop]) {
								tmp = pivotcalc[rnsValue][cnsValue][kloop];
								if (pivotfunctions[tmp3]) {
									tmp2 = tmp.whereFrom;
									try {
										tmp = pivotfunctions[tmp3](pivotcalc[rnsValue][cnsValue][kloop]); 
									} catch(e) {
										tmp = '<span title="'+e.message+'">*Err*</span>';
									}
									if (!Array.isArray(tmp)) {
										tmp = [tmp];
										tmp.makeScalar = true;
									}
									tmp.whereFrom = tmp2;
								}
								outputRow.push(tmp);
								
								//check and if needed create sort bins for post sort activity							
								doSortBins(outputRow, codeslookupcns[cnsValue]);

							} else outputRow.push(pivotEmpty);
						}
					}
				}
				pivotHeader.done = true;
				outputTable.push(outputRow);
			}
			// End Step 6.
			
			// Step 7. check if post pivot row / column sort needed
			doPostPivortSort(); 
						
			// Step 8
			//Finish header (rows & columns)
			outputRow = [];
			for (iloop=0; iloop<pivotHeader.length; iloop++) {
				for (jloop=0; jloop<pivotHeader[iloop].length; jloop++) {
					if (!iloop) {
						if (jloop <pivotHeader[iloop].length - 1) {
							outputRow[jloop] = new Array(rns.length).fill('');
						} else {
							outputRow[jloop] = [].concat(rns);
						}
					}
					if (!outputRow[jloop]) outputRow[jloop] = []; //<----??
					outputRow[jloop].push(pivotHeader[iloop][jloop]);
				}
			}
			
			for (iloop=rns.length-1; iloop>=0; iloop--) {
				tmp = Array(cns.length).fill('').concat(rns[iloop]);
				pivotHeader.unshift(tmp);
				if (pivotHeader.headerSort) pivotHeader.headerSort.unshift(tmp);
			}
			
			//Insert row titles
			for (iloop=0; iloop<outputTable.length; iloop++) {
				if (outputTable[iloop]._level) outputTable[iloop][outputTable[iloop]._level-1] += ' ('+outputTable[iloop]._operation+')';				
				else if (outputTable[iloop]._level == 0) outputTable[iloop][0] = '*All ('+outputTable[iloop]._operation+')';				
			}
			//End Step 8


			//Step 9. now construct object table

			tmp1 = {headerObj: {}, labelRLU:{}};
			
			if (pivotHeader.headerSort) {
				tmp1.sortOrder = {};
				tmp1.sortOrderRLU = [];
			}

			for (jloop=0; jloop<pivotHeader.length; jloop++) {
				tmp2 = pivotHeader[jloop];
				tmp1.headerObj['_cc'+jloop] = {label: tmp2};
				if (tmp2._colClass) tmp1.headerObj['_cc'+jloop].classStr = tmp2._colClass;

				tmp1.labelRLU[tmp2] = '_cc'+jloop;
				if (pivotHeader.headerSort) {
					tmp3 = pivotHeader.headerSort.indexOf(tmp2);
					tmp1.sortOrder['_cc'+jloop] = tmp3;
					tmp1.sortOrderRLU[tmp3] = '_cc'+jloop;
				}
			}
			tmp1.headerList = Object.keys(tmp1.labelRLU);
			tmp1.datasource = [];
			tmp1.pivotWhereFrom = {
				source: dataObject,
				lookup: [],
				//return array of row numbers, given table cell row and column number 
				getRows: function(columnNumber, rowNumber, rowNumberExcludesHeaders) { //assume start from 0, include column & row headers
				
					var columnID,
						pivotObject = tmp1;
					
					if (pivotObject.sortOrderRLU) columnID = pivotObject.sortOrderRLU[columnNumber];
					else columnID = pivotObject.labelRLU[pivotObject.headerList[columnNumber]];
			
					return this.lookup[rowNumber - (rowNumberExcludesHeaders?0:pivotObject.multirowheader)][columnID]; 
				},
				//return array of data, given table cell row and column number. Important - not a copy. null return for empty cells
				getTable: function(columnNumber, rowNumber, rowNumberExcludesHeaders) { //assume start from 0, include column & row headers
				
					var columnID,
						pivotObject = tmp1,
						iloop,
						arrOut = [],
						datasource = this.source.datasource,
						rows = this.getRows(columnNumber, rowNumber, rowNumberExcludesHeaders);
					
					if (rows) {
						rows.forEach(function(rowNumber,idx) {
							arrOut.push(datasource[rowNumber]);
						});
						return arrOut;
					}
					return null;
				}

			};
			
			for (iloop=0; iloop<outputTable.length; iloop++) {
				tmp3 = {};
				tmp2 = {};
				for (jloop=0; jloop<outputTable[iloop].length; jloop++) {
					tmp = outputTable[iloop][jloop];
					tmp2['_cc'+jloop] = tmp?tmp.whereFrom:tmp; //i.e. undefined if not set
					
					if (tmp && tmp.makeScalar) tmp = tmp[0]; //tmp.makeScalar = true;
					tmp3['_cc'+jloop] = tmp;
				}
				tmp1.datasource.push(tmp3);
				tmp1.pivotWhereFrom.lookup.push(tmp2);
				
				if (outputTable[iloop]._rowClass) {
					if (!tmp1.rowObj) tmp1.rowObj = [];
					tmp1.rowObj[iloop] = {classStr: outputTable[iloop]._rowClass};
					//tmp3._trclass = outputTable[iloop]._rowClass;
				}

			}
			
			tmp1.multicolheader = rns.length;
			tmp1.multirowheader = pivotHeader[0]?pivotHeader[0].length:null;
			
			tmp1.autoHeaderColSpan = true;
			tmp1.autoHeaderRowSpan = true;
			
			//End Step 9
			
			if (elid) {
				params.draftOutput = tmp1;
				jA.getGlobal('utils.renderSimpleTable')(elid, tmp1);				
				$('.pivcontrol').show();
				return null;
			} else 
				return tmp1;
			
			// *********************************************** End of main code for doPivot in model.pivot ***********************************************

		}		
		// *********************************************** End of doPivot in model.pivot ***********************************************

		
		// *********************************************** Start of main code for model.pivot ***********************************************		
		params = params||{};
		
		var pconfig = params.pivotconfig,
			headers = dataObject.headerList,
			pivotfunctions = jA.getGlobal('model.pivotfunctions');
		
		if (pivotelID) {
			if (pconfig && pconfig.options) params.draftpivotconfig = {options: pconfig.options}; //last values for editing
			else params.draftpivotconfig = {};
			showPivotUI();
		}
		else return doPivot();
		// *********************************************** End of main code for model.pivot ***********************************************		



		//Return html text for help pages
		function getHelp() {
			
		return '<pre style="white-space: pre-line; max-width: 80vw;">'+`
Use the Pivot Designer to create the data view you want. A total of four drop areas are shown. All table field names start in the top drop area. The additional drop areas for row, column and data fields determine the rows, columns, and data fields to use to pivot. 

By default no function is applied to pivoted data. Once field names are dropped into the relevant drop areas, options appear in the top left area as follows
- a default collation pivot function can be set. 
- a 'Transpose' button to swap the row and collumn field names
- an option (default on) to ignore empty data cells. All table cells with null, undefined or empty space ('') values will be exluded from the pivot.
- a dropdown to specify with what to fill empty cells. 

Within each draggable field name element, options appear as follows. Mouse over each item to get a tip on functionality:
- filter: this always shows. Click to show a dropdown of field values that can be filtered. This filter applies to the entire row of the input table, and unselected items will be excluded from the pivot.
- sort: two sort buttons show in the row and column drop fields. The first provides a dropdown to sort data manually (click and drag elements) and the second automatically (ascending or descending) based on field values.
- collation option: this only appears on fields in the data drop area. This overrides the default option set in the top left settings area. Note that more than one option may be specified, *and the items in the list are draggable* so the preferred display order can be set.
- summary options: click to set special summary row or column. *TIP* use 'Summary' nearly always. This setting follows the collation option used by the data cells and yields the least confusing results. However all options are provided to allow summary data to show above or below respective data sets. Note that more than one option may be specified, *and the items in the list are draggable* so the preferred display order can be set. 

Summary options also appear for the entire row and column drop area to allow for Grand Totals for example. Similarly more than one option may be specified, *and the items in the list are draggable* so the preferred display order can be set.`
			+'</pre>';	
		}

	});
	
	// *********************************************** End of model.pivot ***********************************************

	
})(jrbAnalytics);	


