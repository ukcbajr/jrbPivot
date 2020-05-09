/******************************************************************************

jrbWidgets - Module providing various UI widget functionality

For latest version see https://github.com/ukcbajr/jrbAnalytics

*******************************************************************************/

/******************************* Dependencies *********************************

jQuery (https://jquery.com/)
jQuery-ui (js & css) - https://jqueryui.com/

jrbAnalytics.js

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
Version: 0.01,
Quality: "pre-Alpha",
ReleaseDate: 'September 30 2019'

Release Notes

This code in in active development. Code base likely to change at any time.

*****************************************************************************/	

(function(jA) {

	jA.versionInformation.jrbWidgets = {
		Version: 0.01,
		Quality: "pre-Alpha",
		ReleaseDate: 'September 30 2019'
	};
	
	jA.setCSS(`
div#filterWidget {
    background: #fff;
    border: 1px solid #479;
    border-radius: 5px;
    box-shadow: 0 0 10px #68a;
	width: fit-content;
}

.filterItems {
    max-height: 50vh;
    overflow: auto;
}

span.searchhit {
    background-color: #ff8;
}

.filterItem:hover {
	background: #def;
	cursor:pointer;
}

	`);
	
	//General purpose widget to select from multiple options
	// colvalues: object in {value: valuecount, ..} format
	// widgetOptions : configuration Object 
	// { 
	//	 search: true, - set to enable text search for values. set if many values to choose from
	//   currentValue: [..]  - array of values to preselect
	//   all: true, - set to show all checkbox. This sets/clears all values
	//   multiselect: true, - set if multiple values permitted. Ignored if all set to true
	//   callback: function (selectedItems) {} - set to proces return values. Subset in array 'selectedItems'
	//   oneClickAction : true - set to call callback immediately on first click. (Ignored if userSortable is set)
	//   attachID : element - alternative to body
	//   target : element below which to show widget
	//   noselect : true to not show any select options (e.g. sortable only)
	//   userSortable: true - items can be sorted with drag & drop. sort order of items returned in widgetOptions.sorted array of values
	//	 currentSort: - sort array to start with (e.g. previous values)
	//   showTotals : true - set to show valuecount values
	//  }
	// 
	jA.setGlobal('ui.widget.valueselect', function(colValues, widgetOptions) {	

		function setUnfocus(elid, nameSpace, closeFn) {
						
			$(document).on('click.'+nameSpace, function(event) { 
				$target = $(event.target);
				if(!$target.closest('#'+elid).length && 
				$('#'+elid).is(":visible")) closeFn();    
			});	
			
			return function() {
				$(document).off('click.'+nameSpace);
			}
			
		}
		

		function doTextSelect(e) { 
		
			var ss = this.value,
				$allfilterItems = $('.filterItem'),
				$allTextItems = $allfilterItems.find('.filterItemText'), 
				$hits;
			
			if (e.which == 13) {
				closeFilter(ss.length>1); //revisit. 
				return;
			}	
			if (e.which == 27) {
				closeFilter(); 
				return;
			}	
			
			if (ss.length>1) {
				$hits = [];
				$allTextItems.each(function() {
					var txt = $(this).text().toLowerCase();
					if (txt.indexOf(ss.toLowerCase()) >=0) $hits.push($(this)); 
				});
				if ($hits.length) {
					$allfilterItems.hide();
					$allItems.each(function(idx, item) { item.checked = false; });
					$hits.forEach(function($textItem, index) { 
					
						$textItem.parent().show(); 
						$textItem.parent().find('.filterItemCheckBox')[0].checked=true;
						
						var re = new RegExp(ss, 'i'),
							origText = $textItem.text(),
							newText = '',
							p;

						do {
							p = origText.toLowerCase().indexOf(ss.toLowerCase());
							if (p>=0) {
								newText += origText.slice(0,p)+'<span class="searchhit">'+origText.slice(p,p+ss.length)+'</span>';
								p += ss.length;
								origText = origText.slice(p);
							}
						} while (p >=0);
						newText += origText; //remainder
						
						$textItem.html(newText); 
					});
					lastSearchHit = ss;
				}
			} else {
				$allfilterItems.show();
				$allTextItems.each(function() { $(this).html($(this).text()); }); //reset filter highlights
			}
		}
		
		function closeFilter(doupdate) {
			
			if (doupdate) {
			
				var $selected = $('.filterItemCheckBox:checked'),
					items = [],
					scheck = [];
				
				$selected.each(function(idx, item) { items.push(item.value); });
				
				if (userSortable) {
					$selected = $('.filterItems .filterItemText');
					widgetOptions.sorted = [];
					$selected.each(function(idx, item) { widgetOptions.sorted.push(item.innerText); });
					
					for (iloop in colValues) scheck.push(iloop);
					if (scheck.join() == widgetOptions.sorted.join()) widgetOptions.sorted = null; //no sort done. clear.
				}
				
				widgetOptions.callback(items);
			
			}
			
			$filterWidget.remove();
			if (clearUnfocus) clearUnfocus();
				
			if (pftimer) clearTimeout(pftimer);
			
		}
		
		var hh = '', 
			lhh,
			iloop,
			pftimer,
			$allItems,
			clearUnfocus,
			attachID = widgetOptions.attachID,
			selectType = (widgetOptions.multiselect || widgetOptions.all)?'checkbox':'radio',
			currentValue = widgetOptions.currentValue,
			noselect = widgetOptions.noselect,
			userSortable = widgetOptions.userSortable,
			oneClickAction = widgetOptions.oneClickAction && !userSortable,
			listItems = {},
			sorted = widgetOptions.currentSort||[],
			sortedList = [],
			$filterWidget;
			
		
		hh += '<div>';
		if (widgetOptions.search) hh += '<span class="ui-icon ui-icon-search"></span><input id="fsearch">';
		if (selectType == 'radio' || noselect) hh += '<span id="fsearchreset" class="ui-icon  ui-icon-arrowreturn-1-w" title="Clear selection"></span>';
		if (!oneClickAction) hh += '<span title="Set Values" id="fsearchok" class="ui-icon ui-icon-check"></span><span id="fsearchexit" class="ui-icon ui-icon-close" title="Cancel"></span>';
		hh += '</div>';
		if (widgetOptions.all) hh += '<div class="filterItem"><input id="fsearchall" type="checkbox" value="All">All</div>';
		
		hh += '<div class="filterItems">';

		if (!currentValue) currentValue = []; 
		
		for (iloop in colValues) {
			lhh = '<div class="filterItem">';
			if (!noselect) lhh += '<input class="filterItemCheckBox" name="fitem" value="'+iloop+'" type="'+selectType+'">';
			lhh += '<span class="filterItemText">'+iloop+'</span>';
			if (widgetOptions.showTotals) lhh += ' ('+colValues[iloop]+')';
			lhh += '</div>';			
			listItems[iloop] = lhh;
		}
		
		sorted.forEach(function(sortItem, idx) { sortedList.push(listItems[sortItem]); listItems[sortItem] = null; });
		for (iloop in listItems) { //in case items missed, or no sort.
			if (listItems[iloop] !== null) sortedList.push(listItems[iloop]);
		}
		hh += sortedList.join('');
		
		hh += '</div>';
		
		//check if exists already
		$filterWidget = $('#filterWidget');
		if ($filterWidget.length) closeFilter();

		$(attachID?('#'+attachID):'body').append('<div id="filterWidget"></div>'); // title="'+title+'">'+body+'</div>');
		$filterWidget = $('#filterWidget');
		
		$filterWidget
			.position({ my: "left top", at: "left bottom+10px", of: widgetOptions.target||'body'})
			.show()
			.html(hh)
			.mouseleave(function(e) {
				pftimer = setTimeout(closeFilter, 1000);
			})
			.mouseover(function(e) {
				if (pftimer) clearTimeout(pftimer);
			});

		if (userSortable) $('.filterItems').sortable();
		
		pftimer = setTimeout(closeFilter, 5000);
			
		clearUnfocus = setUnfocus('filterWidget', 'jrbPivot.filter', closeFilter);

		$allItems = $('.filterItemCheckBox');
		
		if (widgetOptions.all) {
			$('#fsearchall').click(function(e) {
				var cvalue = this.checked;
			
				$allItems.each(function(idx, item) { item.checked = cvalue; });		
			});
		}
		
		//Initializing items as checked in above initial code does not seem to work. Do this for now.
		$allItems.each(function(idx, item) { if (currentValue.indexOf(item.value)>=0) item.checked = true; });
		
		$('#fsearchexit').click(function(e) { closeFilter() ; }); //$filterWidget.remove(); });

		$('#fsearchok').click(function(e) {
			closeFilter(true);
		});
		
		if (oneClickAction) {
			$allItems.click(function(e) {
				closeFilter(true);
			});
		}
		
		$('.filterItem').click(function(e) {
			if (e.target.nodeName == 'INPUT') return; //already toggled
			var $cb = $(this).find('input');
			
			$cb.trigger('click');
			
		});
		
		$('#fsearchreset').click(function(e) {
			$allItems.each(function(idx, item) { item.checked = false; });	
			if (userSortable) {
				widgetOptions.currentSort = [];
				closeFilter(false);
				jA.getGlobal('ui.widget.valueselect')(colValues, widgetOptions); //redraw with no sort
			} else {
				if (oneClickAction) closeFilter(true);
			}
		});
		
		if (widgetOptions.search) $('#fsearch').on( "keyup", doTextSelect );
			
	});


	jA.setCSS(`
	
/* jrbUI popup */
	
div#topPopup {
    display: absolute;
    background: rgba(255,255,255,0.9);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
}

div#topPopupBox {
    background: #ddf;
    border: 2px solid #004;
    padding: 10px;	
	display: inline-block;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%,-50%);
	max-height: 90%;
    max-width: 90%;
    overflow: auto;
}

div#topPopupExit {
    float: right;
    background: #fee;
    width: 14px;
    height: 14px;
    font-size: 10px;
    text-align: center;
    vertical-align: middle;
    border: 1px solid #f88;
    border-radius: 5px;
    color: #d00;
	cursor: default;
}

div#topPopupTitle {
    text-align: center;
}

div#topPopupBody {
    margin: 10px 20px;
    padding: 5px 10px;
}
	`);
	
	jA.setGlobal('utils.doPopup', function(title, body, options) {
	
		var $popupEl = $('#topPopup1');
	
		if (!$popupEl.length) {
			$('body').append('<div id="topPopup1"></div>'); // title="'+title+'">'+body+'</div>');
			$popupEl = $('#topPopup1');
		}
		if (!options) options = {};
		options.title = title;
		if (!options.width) options.width = "auto";
		//options.position = { my: "left top", at: "left bottom", of: window };
		$popupEl
			.html(body)
			.dialog(options);

		return $popupEl;
			
	});

	
})(jrbAnalytics);	


