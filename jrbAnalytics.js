/******************************************************************************

jrbAnalytics - core functions

For latest version see https://github.com/ukcbajr/jrbAnalytics

*******************************************************************************/

/******************************* Dependencies *********************************
 
jQuery (https://jquery.com/)
	
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

/**************************** Version Control *********************************

The following notes apply to this and all modules:

Versions

The major.minor scheme is used for all published code. Minor is any change 
including bug fixes and minor feature enhancements. Major concerns any 
significant new functionality or change. 

Quality 

The following milestones are defined. 
	pre-Alpha: 
		development pre-release. No guarantee as to quality. 
		Minor version number increments during this period.
	Alpha : 
		code base considered sufficient for developers to use, e.g. for 
		integrating into a larger code base. Basic testing completed such that 
		release notes able to provide some indication of what does or does not
		work. 
		Minor version number increments during this period.
	Beta: 
		code base considered sufficient for end user testing. Code can be 
		integrated into a larger code base, and is considered of high enough 
		quality for wider testing, including user trials. More exhaustive
		testingcompleted such that code author considers all bugs either fixed,
		or documented in the release notes. 
		Minor version number increments during this period.
	Production Candidate:
		Sufficient testing completed by user systems, including user trials. 
		All bugs confirmed fixed by end users who reported such bugs, or 
		documented inrelease notes as an item to not be fixed, or to be fixed 
		in a later release.
		Minor version number increments during this period.
	Production:
		All test activities completed. 
		Major version number usually ticks over at this point (e.g. 1.0, 2.0) 
		releases.
	
*****************************************************************************/

/********************************* Version **********************************
Version: 0.1,
Quality: "Beta",
ReleaseDate: 'October 23 2019'

Release Notes

This code in in active development. Code base likely to change at any time.

*****************************************************************************/	

if (!window.jrbAnalytics) {

	var jrbAnalytics = {
		versionInformation : {}
	};

(function(jA) {
	
	jA.versionInformation.jrbAnalytics = {
		Version: 0.1,
		Quality: "Beta",
		ReleaseDate: 'October 23 2019'
	};
	
	//Set global for analytics. Not really a global, rather an item in the jrbAnalytics global object 
	// - path: location to set item
	// - value: value to set for item
	// - getFlag: read not write value
	jA.setGlobal = function (path, value, getflag) {
		var p,
			loc,
			iloop;
		
		if (path) {
			if (path.split) p =  path.split('.');
			else p = path;
		} else p = [];
			
		loc = jA;
		for (iloop =0; iloop<p.length - 1; iloop++) {
			if (typeof loc[p[iloop]] !== 'object') {
				if (getflag) return null;
				loc[p[iloop]] = {};
			}
			loc = loc[p[iloop]];
		}
		if (getflag) return loc[p[iloop]];
		
		loc[p[iloop]] = value;
		return null;
	};
	
	
	//Read global in the jrbAnalytics global object 
	// - path: location to read
	jA.getGlobal = function(path) { return jA.setGlobal(path, null, true); };

	//Extend global Object in the jrbAnalytics global object. creates object if it does not exist. 
	// path = path of item
	jA.extendGlobalObject = function(path, value) { 
		var obj = jA.getGlobal(path);
		
		if (obj) {
			if (typeof value == 'object') $.extend(obj, value);
			else return false;
		} else { //path does not exist. create & set.
			jA.setGlobal(path, value);
		}
		return true;
	};	
	
	
	//Extend global Array (with a push) in the jrbAnalytics global object 
	jA.extendGlobalArray = function(path, value) { 
		var obj = jA.getGlobal(path);
		
		if (obj.push) return obj.push(value);
		else return null;
	};	


	//Provide means to dynamically add CSS to header. Enables CSS to be defined in same script as javascript function which this (lazy?) author finds easier to maintain that 
	//placing in a separate css file. 
	jA.style = '';
	jA.setCSS = function (cssString, comment) { 
		if (comment) cssString = "/*\n * "+comment+"\n */\n" + cssString;		
		$('head').append('<style'+(comment?' comment="'+comment+'"':'')+'>'+cssString+'</style>');
	};


	// About jrbAnalytics standardized table object
	// Tables can be represented in javascript in several ways, but the following has evolved to be most pragmatic for analytics processing.
	// jrbAnalytics data object = { 
	//		originuid: originuid, //used to uniquely identify different data sources. Important for some error prevention / detection e.g. 
	//		headerObj: headerObj, //object defining headers. 
	//			Contains { 
	//				columnid: {label: string} mandatory. Change string to change label used for header (column). string can be array of strings for multi-row headers
	//				type: optional. one of Number, Text, Boolean, Date or Mixed (default if missing.)
	//				formatter: function(data, params). use to format data directly in table cells.
	//				classStr: "class String" - css class string to apply to every cell in the columns (ttd)
	//				styleStr: "style String" - style string to apply to every cell in the columns (ttd)
	//			}
	//			Designed to scale for other functionality e.g. to set data types, special formatting, data entry, validation etc...
	//		rowObj: [] //array of objects for formatting or styling rows. E.g. rowObj[3] = {formatter: .., classStr: .., styleStr: ..} for 3rd data row (counting from 0)
	//		labelRLU: helper lookup where labelRLU[string] --> column id
	//		headerList: Object.keys(labelRLU) - helper array of headers. Several uses cases: to quickly find if a header is used, to determin column sort order.
	//		datasource: array of ([{_cc0: value1, _cc2: value2, ..}, {..}, ..]. Similar to {fieldname: value, ..} format except columns ids modified to _ccX format and header names moved to the headerObject.
	//		multicolheader : optional, a number that indicates the number of column headers (counts from 1). E.g. as output from a pivot table. Used to shade as a header, or freeze for some displays
	//		multirowheader: optional, number of row headers (counts from 1)
	//		pivotWhereFrom: optional, object containing originating information of pivoted data. See jrbPivot.js and pivotExample.html for more and example use.
	// 		sortOrder: 		optional. object indicating order of column IDs to be rendered. {_cc0:0, _cc3:1, _cc2:2, ...} e.g.
	//		sortOrderRLU: 	optional, sort order reverse lookup. ['_cc0', '_cc3', '_cc2', ...]. e.g.
	//		autoHeaderColSpan = true; : 	optional. If set column headers merged when values the same [WIP]. multicolheader must be non zero
	//		autoHeaderRowSpan = true; : 	optional. If set row headers merged when values the same [WIP]/ multirowheader must be non zero

	//
	// The following functions are provided:
	// - utils.objectifyTable		: convert a table in a [{fieldname: value, fieldname2: value2..}, ...] format to the jrbAnalytics object format
	// - utils.createSimpleTable	: convert jrbAnalytics data object to simple header and data arrays
	// - utils.returnSimpleTable	: create HTML from jrbAnalytics data object, (uses utils.createSimpleTable)
	// - utils.renderSimpleTable	: render jrbAnalytics data object toHTML table in a DOM element (uses utils.returnSimpleTable)

	// Convert to jrbAnalytics standardized table object
	// Input:
	//		datasource: array of {fieldname: value, fieldname2: value2..} rows. 
	//		originuid. Optional. Can be used to identify original sources 
	//
	// Object returned: 
	//		jrbAnalytics data object
	jA.setGlobal('utils.objectifyTable', function (datasource, originuid) { 

		var iloop, jloop,
			labelRLU = {},
			newTableObj = [],
			newDataObj = {},
			newRowObj,
			colCount = 0,
			labelLookup,
			headerObj = {};

		if (datasource.headers) {
			labelLookup = {};
			for (iloop=0; iloop<datasource.headers.length; iloop++) labelLookup[datasource.headers[iloop]] = datasource.headers[iloop]; //could be array. provides correct array based label for multi-headers	
		}
						
		for (iloop = 0; iloop<datasource.length; iloop++) {
			newRowObj = {};
			for (jloop in datasource[iloop]) {
				if (!labelRLU[jloop]) {
					headerObj['_cc'+colCount] = {label: labelLookup?labelLookup[jloop]:jloop};
					labelRLU[jloop] = '_cc'+colCount;
					colCount++;					
				}
				newRowObj[labelRLU[jloop]] = datasource[iloop][jloop];
			}
			newTableObj.push(newRowObj);
		}

		newDataObj = { 
			originuid: originuid,
			headerObj: headerObj,
			labelRLU: labelRLU,
			headerList: Object.keys(labelRLU),
			datasource: newTableObj
		}
		
		return newDataObj;
	});
	

	// utils.copyDataObject
	// copy jrbAnalytics data object, model parameters (or any object)
	jA.setGlobal('utils.copyDataObject', function (dataObjectIn) { 

		if (!dataObjectIn) return dataObjectIn; //nothing to copy
	
		var newObject = JSON.parse(JSON.stringify(dataObjectIn)),
			datasource = newObject.datasource,
			headerObj, // = newObject.headerObj,
			type, vv,
			dataTypes, // = jA.getGlobal('model.dataTypes'),
			iloop, jloop;
		
		if (!datasource) { //could be model parameters containing data object
			if (newObject.dataObject) newObject.dataObject = jA.getGlobal('utils.copyDataObject')(newObject.dataObject);
		} else { //i is a data object
			headerObj = newObject.headerObj;
			dataTypes = jA.getGlobal('model.dataTypes');
			for (jloop in headerObj) {
				type = headerObj[jloop].type;
				if (type && dataTypes[type]) {
					for (iloop=0; iloop<datasource.length; iloop++) {
						vv = datasource[iloop][jloop];
						datasource[iloop][jloop] = dataTypes[type].convert(vv, vv);
					}
				}
			}
		}
		
		return newObject;
		
	});


	// utils.addColumn
	// Use this to add new column headers properly. 
	jA.setGlobal('utils.addColumn', function(dataObject, newIndex, newLabel, newType) {
		
			if (dataObject.multirowheader) newLabel = new Array(dataObject.multirowheader-1).fill('').concat([newLabel]);
			dataObject.headerObj[newIndex] = {label: newLabel};
			if (newType) dataObject.headerObj[newIndex].type = newType;
			dataObject.labelRLU[newLabel] = newIndex;
			dataObject.headerList.push(newLabel);
			if (dataObject.sortOrder) {
				dataObject.sortOrder[newIndex] = dataObject.sortOrderRLU.length;
				dataObject.sortOrderRLU.push(newIndex);
			}
		
	});
	
	
	// utils.createSimpleTable
	// convert jrbAnalytics data object to simple header and data arrays
	// input
	//	- dataObject : jrbAnalytics data object
	//  - rowlimit   : optional parameter to limit the number of rows processed. useful for fats previewing very large tables for example
	// output object
	//  - { 
	//		header: array of arrays of table header data (multiple header rows permitted)
	//      data: array of arrays of table data array,
	//		limited: boolean, true if rowlimit hit else false
	//	  } 
	jA.setGlobal('utils.createSimpleTable', function (dataObject, rowlimit) {
		
		var iloop,
			cc=0, jloop, kloop, cf = {},
			tmp, tmp1,
			headerObj = dataObject.headerObj,
			sortOrder = dataObject.sortOrder,
			allops = jA.getGlobal('model.ops'),
			tablein = dataObject.datasource || dataObject,
			tabdata = [], row, header=[];

		if (!rowlimit || rowlimit > tablein.length) rowlimit = tablein.length;
		
		for (iloop=0; iloop<rowlimit; iloop++) {
			row = [];
			for (jloop in headerObj) { //tablein[iloop]) {
				//if (jloop != '_trclass') {
					if (cf[jloop] == undefined) {
						if (sortOrder) {
							header[sortOrder[jloop]] = jloop;
							cf[jloop] = sortOrder[jloop];
						} else {
							header.push(jloop);
							cf[jloop] = cc;
							cc++;
						}
					}
					tmp1 = tablein[iloop][jloop];
					if (headerObj && headerObj[jloop] && headerObj[jloop].formatter) {
						tmp = headerObj[jloop].formatter;
						for (kloop=0; kloop<tmp.length; kloop++) {
							tmp1 = allops[tmp[kloop].fnNo].formatter(tmp1, tmp[kloop].options);
						}
					} 
					row[cf[jloop]] = tmp1;
				//} else row._trclass = tablein[iloop]._trclass;
			}
			tabdata.push(row);
		}
		if (headerObj) {
			cc = 0;
			for (iloop = 0; iloop<header.length; iloop++) {
				tmp = headerObj[header[iloop]];
				if (tmp) {
					if (Array.isArray(tmp.label)) {
						if (cc<tmp.label.length) cc=tmp.label.length;
					}
					header[iloop] = tmp.label; 
				}
			}
			if (cc>1) { //multiheaderrow
				tmp = [];
				for (iloop = 0; iloop<header.length; iloop++) {
					for (jloop=0; jloop<cc; jloop++) {
						if (!iloop) tmp[jloop] = [];
						if (Array.isArray(header[iloop])) tmp[jloop][iloop] = header[iloop][jloop];
						else tmp[jloop][iloop] = jloop?'':header[iloop];
					}
				}
				header = tmp; //now cc rows for headers
				header._multiline = true;
			} else {
				header = [header];
			}
		}
		
		tmp = {};
		if (dataObject.multirowheader && dataObject.autoHeaderColSpan) { //create span markers for column headers
			tmp.colSpan = [];
			for (iloop=0; iloop<header.length; iloop++) { //each header row
				tmp1 = [];
				row = header[iloop];
				for (jloop=row.length-1; jloop >=0 ; jloop--) {
					tmp1[jloop] = 0;
					if (row[jloop] == row[jloop+1]) {
						tmp1[jloop] = tmp1[jloop+1] + 1;
						tmp1[jloop+1] = -1;
					}
				}
				tmp.colSpan.push(tmp1);
			}
		}
		if (dataObject.multicolheader && dataObject.autoHeaderRowSpan) { //create span markers for row headers
			tmp.rowSpan = [];
			for (iloop=0; iloop<dataObject.multicolheader; iloop++) { //each header column
				tmp1 = [];
				for (jloop=tabdata.length-1; jloop >=0; jloop--) { //each row
					if (jloop == tabdata.length-1) tmp1[jloop] = 0;
					else {
						if (tabdata[jloop][iloop] == tabdata[jloop+1][iloop]) {
							tmp1[jloop] = tmp1[jloop+1] + 1;
							tmp1[jloop+1] = -1;
						} else tmp1[jloop] = 0;
					}
				}
				tmp.rowSpan.push(tmp1);
			}
		}
		
		return {header:header, data: tabdata, limited: (rowlimit != tablein.length), spans: tmp};
		
	});

	// utils.returnSimpleTable
	// create HTML from jrbAnalytics data object. Uses utils.createSimpleTable to get simple arrays to process
	// input
	//	- dataObject : jrbAnalytics data object
	//  - rowlimit   : optional parameter to limit the number of rows processed. useful for fats previewing very large tables for example
	// output
	//  - HTML text that can be rendered.
	jA.setGlobal('utils.returnSimpleTable', function (dataObject, rowlimit) {

		function doRow (val, index) {
			var tdtag = index<multicolheader?['colheader']:[],
				tdss = '',
				spantxt = '',
				spanmark,
				qlu = quickLU[index];
			
			if (qlu) {
				if (qlu.classStr) tdtag.push(qlu.classStr);
				if (qlu.type) {
					tdtag.push('contenttype', qlu.type);
					if (node == 'td' && dataTypes[qlu.type] && dataTypes[qlu.type].render) {
						val = dataTypes[qlu.type].render(val);				
					}
				} else val = dataTypes?dataTypes.Mixed.render(val):val; //catches empty items
				if (qlu.styleStr) tdss += ' style="'+qlu.styleStr+'"';	
			}
			if (tdtag.length) tdtag = ' class="'+tdtag.join(' ')+'"';
			else tdtag = '';
			
			if (span) {
				if (node == 'th') spanmark = span[iloop][index];
				else spanmark = span[index]?span[index][iloop]:0;
				if (spanmark == -1) return; 
				if (spanmark > 0 ) spantxt = (node == 'th'?' col':' row') + 'span="'+(1+spanmark)+'"';
			}
				
			
			hh += '<'+node+ tdss + tdtag + spantxt +'>' + val + '</'+node+'>'; 
		}
			
		var iloop, tab,
			row, tag,
			headerObj = dataObject.headerObj||{},
			labelRLU = dataObject.labelRLU||{},
			rowObj = dataObject.rowObj,
			headerList = dataObject.headerList||[],
			multicolheader = dataObject.multicolheader||0,
			sortOrderRLU = dataObject.sortOrderRLU,
			span,
			quickLU = {},
			lastVal,
			headerMultiline,
			dataTypes = jA.getGlobal('model.dataTypes'),
			node,
			hh='<table class="simpleTable">';
		
		tab = jA.getGlobal('utils.createSimpleTable')(dataObject, rowlimit); 

		tab.header[0].forEach(function(val, index) {
			var colidx;
			
			if (sortOrderRLU) colidx = sortOrderRLU[index];
			else colidx = labelRLU[headerList[index]];
			if (headerObj[colidx]) {
				quickLU[index] = headerObj[colidx];
			}
		});

		node = 'th';	
		span = tab.spans.colSpan;
		hh += '<thead>';
		for (iloop=0; iloop<tab.header.length; iloop++) {
			hh += '<tr class="rowheader">';
			tab.header[iloop].forEach(doRow);
			hh += '</tr>';
		}
		hh += '</thead>';

		node = 'td';		
		span = tab.spans.rowSpan;
		hh += '<tbody>';
		for (iloop=0; iloop<tab.data.length; iloop++) {
			row = tab.data[iloop];
			tag = ''; 
			if (rowObj && rowObj[iloop]) {
				if (rowObj[iloop].classStr) tag += ' class="'+rowObj[iloop].classStr+'"';
				if (rowObj[iloop].styleStr) tag += ' style="'+rowObj[iloop].styleStr+'"';	
			}
			hh += '<tr'+tag+'>';
			
			row.forEach(doRow);
								
			hh += '</tr>';
		}
		hh += '</tbody>';
		hh += '</table>';		
		if (tab.limited) hh += '<i>Limited View, '+rowlimit+' records shown of '+dataObject.datasource.length+'.</i>';
		return hh;			
		
	});
	
	// utils.renderSimpleTable
	// render jrbAnalytics data object toHTML table in a DOM element. Uuses utils.returnSimpleTable.
	// input
	//	- locID		 : DOM id in which to render table
	//  - dataObject : jrbAnalytics data object to be rendered
	//  - rowlimit   : optional parameter to limit the number of rows processed. useful for fats previewing very large tables for example
	// No output. 
	jA.setGlobal('utils.renderSimpleTable', function (locID, dataObject, rowlimit) { 
		$('#'+locID).html(jA.getGlobal('utils.returnSimpleTable')(dataObject, rowlimit)) ;
	});
	
})(jrbAnalytics);

}