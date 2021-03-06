// ==UserScript==
// @name         Chaoz Script
// @namespace    http://tampermonkey.net/
// @version      1.10
// @description  Chaoz TM Script
// @author       You
// @match        https://*.planetarion.com/*
// @updateURL    https://planetarion.freshlondon.biz/js/chaoz.user.js
// @downloadURL  https://planetarion.freshlondon.biz/js/chaoz.user.js
// @grant        none
// ==/UserScript==

(function () {
	'use strict';


	(function (w) {
		var doc = w.document;
		if(!doc) return;

		var $j;
		var skin = '';
		var page = '';
		var view = '';
		var tick = 0;
		var globalDependencies = ['jQuery', 'get_cookie', 'get_ships_cookie', 'PA'];

		if(doc.readyState == 'complete') {
			checkDeps(true);
		} else {
			var _ev = w.addEventListener ? {
				add: 'addEventListener',
				rem: 'removeEventListener',
				pfx: ''
			} : w.attachEvent ? {add: 'attachEvent', rem: 'detachEvent', pfx: 'on'} : null;
			if(_ev) {
				doc[_ev.add](_ev.pfx + 'DOMContentLoaded', waitLoad, false);
				doc[_ev.add](_ev.pfx + 'readystatechange', waitLoad, false);
				w[_ev.add](_ev.pfx + 'load', waitLoad, false);
			} else {
				checkDeps();
			}
		}

		function waitLoad(ev) {
			ev = ev || w.event;
			if(ev.type === 'readystatechange' && doc.readyState && doc.readyState !== 'complete' && doc.readyState !== 'loaded') return;
			if(_ev) {
				doc[_ev.rem](_ev.pfx + 'DOMContentLoaded', waitLoad);
				doc[_ev.rem](_ev.pfx + 'readystatechange', waitLoad);
				w[_ev.rem](_ev.pfx + 'load', waitLoad);
				_ev = null;
				checkDeps(true);
			}
		}

		function checkDeps(loaded) {
			var remainingDeps = globalDependencies.filter(function (dep) {
				return !w[dep];
			});
			if(!remainingDeps.length) init();
			else if(loaded) console.error(remainingDeps.length + ' missing userscript dependenc' + (remainingDeps.length == 1 ? 'y' : 'ies') + ': ' + remainingDeps.join(', '));
		}

		function init() {
			if($j) return;
			$j = w.jQuery;
			if(typeof w.PA != 'undefined' && 'page' in w.PA) {
				page = w.PA.page;
			}
			if(typeof w.PA != 'undefined' && 'last_tick' in w.PA) {
				tick = w.PA.last_tick;
			}

			view = getUrlParameter('view');

			if(page == 'scan' || page == 'waves') {
				var wvs = ($j('a[target="scan"]').map((id, scn) => getScanId(scn.search))).toArray();
				postScanLinks([...new Set(unique(wvs))]);
			} else if(page == 'alliance_scans') {
				var scns = ($j('a[target="wavescan"]').map((id, scn) => getScanId(scn.search))).toArray();
				postScanLinks([...new Set(unique(scns))]);
				initAllianceScanRequests();
			}

			if(page == 'scan') {
				addFleetMissionColours();
			} else if(page == 'logout') {
				logout_fixLogoutLink();
			} else if(page != 'bcalc') {
				menu_updateMenu();
				if(page == 'overview') {
					overview_updateQuests();
				}
				if(page == 'alliance_defence') {
					//fix missing heading
					//$j('tr.mission_attack').parent().children('tr:first').children('th')[3].innerText = 'Mission';
					//$j('tr.mission_attack').parent().children('tr:first').children('th')[3].className = 'left';

					//alliance_defence_fixFleetETA(getDefenceHeaders());
					//alliance_defence_replaceFleetMissionWithDistorters(getDefenceHeaders());
					alliance_defence_markFleetCatches();
					//alliance_defence_addMemberName(getDefenceHeaders());
					//alliance_defence_addRoidCount(getDefenceHeaders());
					//alliance_defence_addFreeShips(getDefenceHeaders());
					//alliance_defence_addBaseFleet(getDefenceHeaders());
					//alliance_defence_addAttackerAlliance(getDefenceHeaders());
				}
				if(page == 'galaxy') {
					galaxy_addNameToIntel();
				}
				if(page == 'alliance_fleets') {
					if(view == '') {
						alliance_fleets_fleets_addMemberName();
					} else if(view == 'launch') {
						alliance_fleets_launch_addAltRowStyle();
					}
				}
				if(page == 'fleets') {
					fleets_addLocalTime();
					//fleets_updateLauchTimes();
				}
				if(page == 'alliance_members') {
					alliance_member_addCoordButton();
				}
				if(page == 'alliance_intel') {
					alliance_intel_addCoordButton();
				}
			}
		}

		function alliance_intel_addCoordButton() {
			$j('#contents_footer').prepend('<input id="coordList" type="submit" value="Get Coord List"></input>');
			$j('#coordList').click(listIntelCoords);
		}

		function alliance_member_addCoordButton() {
			$j('#contents_footer').prepend('<input id="coordList" type="submit" value="Get Coord List"></input>');
			$j('#coordList').click(listMemberCoords);
		}

		function listMemberCoords() {
			coordsList($j('table tbody tr td:nth-child(5) a'));
		}

		function listIntelCoords() {
			coordsList($j('table tbody tr td:nth-child(1) a'), true);
		}

		function coordsList(selector, skip_first) {
			var coords = "";
			$j.each(selector, function (ind, obj) {
				if(ind == 0 && skip_first) {
				} else {
					coords += $j(obj).text() + " ";
				}
			});
			$j('#contents_footer').append('<textarea id="js-copytextarea">' + coords + '</textarea>');
			$j('#js-copytextarea').focus();
			$j('#js-copytextarea').select();
			document.execCommand('copy');
			$j('#js-copytextarea').remove();
			alert('Copied coords to clipboard, paste to use.');
		}

		function initAllianceScanRequests() {
			try {
				$j('#botscans').remove();
				var xhr = new XMLHttpRequest();
				xhr.open('GET', 'https://thcalliance.us/scans/requests', true);
				xhr.withCredentials = true;
				xhr.send();
				xhr.onreadystatechange = function () {
					if(xhr.readyState == XMLHttpRequest.DONE) {
						var data = JSON.parse(xhr.responseText);
						$j('#tab2').prepend('<div class="container" id="botscans"><div class="header">Bot Scan Requests</div><div class="maintext"><table id="scans"><thead><th>Coords</th><th>Type</th><th>Dists</th><th></th></thead>');
						$j.each(data, function (index, request) {
							var dists = data[index].dists || 'Unknown';
							var x = data[index].x;
							var y = data[index].y;
							var z = data[index].z;
							var type = data[index].scantype;
							var id = data[index]._id;
							$j('#scans').append('<tr><td class="center">' + x + ':' + y + ':' + z + '</td><td class="center">' + scanTypeToDisplay(type) + '</td><td>' + dists + '</td><td class="center"><input class="botscan" id="buttonscan' + index + '" type="submit" value="Submit"></input></td></tr>');
							$j('#buttonscan' + index).click({x: x, y: y, z: z, type: type, id: id, index: index}, attemptScan);
						});
						$j('#scans').append('</table></div><div class="footer"</div></div>');
					}
				}
			} catch (err) {
			}
		}

		function attemptScan(data) {
			var urlRandomizer = Math.floor((Math.random() * 9999999999) + 1000000000);
			var xhr = new XMLHttpRequest();
			xhr.open('POST', 'https://game.planetarion.com/waves.pl?rn=' + urlRandomizer, true);
			xhr.withCredentials = true;
			xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
			xhr.send("action=single_scan&scan_type=" + data.data.type + "&scan_x=" + data.data.x + "&scan_y=" + data.data.y + "&scan_z=" + data.data.z);
			xhr.onreadystatechange = function () {
				if(xhr.readyState == XMLHttpRequest.DONE) {
					if(xhr.responseText.indexOf("Invalid coords and/or scantype.") !== -1) {
						alert("Invalid coords or scan type! Removing scan request!");
						var reject = new XMLHttpRequest();
						reject.open('POST', 'https://chaozhq.org/parse/reject', true);
						reject.setRequestHeader("Content-Type", "application/json");
						reject.send(JSON.stringify({id: data.data.id}));
					} else if(xhr.responseText.indexOf("planet is too protected") !== -1) {
						alert("Too many dists for you!");
					} else if(xhr.responseText.indexOf("You can't scan before ticks start") !== -1) {
						alert("Scans arent allowed before tick dummy!");
					} else if(xhr.responseText.indexOf("The target planet is too well protected against scans, and you need more Wave Amplifiers to successfully scan") !== -1) {
						alert("The target planet is too well protected against scans, and you need more Wave Amplifiers to successfully scan.");
					} else {
						var startText = "load('', 'show_scan', 'showscan.pl?scan_id=";
						var endText = "&inc=1')";
						var startIndex = xhr.responseText.indexOf(startText) + startText.length;
						var endIndex = xhr.responseText.indexOf(endText);
						var scanId = xhr.responseText.substring(startIndex, endIndex);
						postScanLinks([scanId], function () {
							sleepFor(2000);
						});
					}
					initAllianceScanRequests();
				}
			};
		}

		function sleepFor(sleepDuration) {
			var now = new Date().getTime();
			while (new Date().getTime() < now + sleepDuration) { /* do nothing */
			}
		}

		function scanTypeToDisplay(number) {
			switch (number) {
				case 1:
					return "Planet Scan";
				case 2:
					return "Landing Scan";
				case 3:
					return "Development Scan";
				case 4:
					return "Unit Scan";
				case 5:
					return "News Scan";
				case 6:
					return "Incoming Scan";
				default:
				case 7:
					return "Jumpgate Scan";
				case 8:
					return "Advanced Unit Scan";
			}
		}

		function postScanLinks(scan_ids, cb) {
			if(scan_ids.length > 0) {
				var xhr = new XMLHttpRequest();
				xhr.open('POST', 'https://thcalliance.us/parse/scans', true);
				xhr.withCredentials = true;
				xhr.setRequestHeader('Content-Type', 'application/json');
				xhr.send(JSON.stringify({scan_ids: scan_ids}));
				if(cb) {
					xhr.onreadystatechange = function () {
						if(xhr.readyState == XMLHttpRequest.DONE) {
							cb();
						}
					}
				}
			}
		}

		function menu_updateMenu() {
			// //Add Remaining Ticks
			// var rTicksDiv = doc.createElement("DIV");
			// rTicksDiv.id = 'header_remaining';
			// rTicksDiv.appendChild(doc.getElementById('header_tick').childNodes[0].cloneNode());
			// var rTicksLabel = doc.createElement('SPAN');
			// rTicksLabel.className = 'textlabel';
			// rTicksLabel.appendChild(doc.createTextNode("Remaining"));
			// rTicksDiv.appendChild(rTicksLabel);
			// rTicksDiv.appendChild(doc.getElementById('header_tick').childNodes[2].cloneNode());
			// var rTicksValue = doc.createElement('SPAN');
			// rTicksValue.className = 'textvalue';
			// rTicksValue.appendChild(doc.createTextNode(1177 - w.PA.last_tick));
			// rTicksDiv.appendChild(rTicksValue);
			// rTicksDiv.appendChild(doc.getElementById('header_tick').childNodes[4].cloneNode());
			// doc.getElementById('header').insertBefore(rTicksDiv, doc.getElementById('header_metal'));

			//changeWaveLink
			$j('#menu_waves span.textlabel').text('Scans');

			//addAllianceLinks
			var rand = Math.floor((Math.random() * 9999999999) + 1000000000);
			$j('#menu_alliance').append('<ul>' +
				'<li><a href="alliance_fund.pl?rn=' + rand + '">Fund</a></li>' +
				'<li><a href="alliance_attacks.pl?rn=' + rand + '">Attacks</a></li>' +
				'<li><a href="alliance_defence.pl?rn=' + rand + '">Defence</a></li>' +
				'<li><a href="alliance_fleets.pl?rn=' + rand + '">Fleets</a></li>' +
				'<li><a href="alliance_scans.pl?rn=' + rand + '">Scans</a></li>' +
				'<li><a href="alliance_scans.pl?rn=' + rand + '#tab2">Scan requests</a></li>' +
				'<li><a href="alliance_members.pl?rn=' + rand + '&order=cscore">Members</a></li>' +
				'</ul>');
		}


		function logout_fixLogoutLink() {
			$j('#bar_logout').attr('href', 'login.pl').css('background', "url('/images/template105/login-b.png')").css('width', '62px').children('span').first().text('Login').css('display', 'none')
			$j('#bar_logout').id('bar_login')
		}

		function alliance_defence_addMemberName(tableHeaders) {
			addDefenceTableColumn(tableHeaders, 'Member', 'Target', 'left', 'left');
			tableHeaders = getDefenceHeaders();

			$j.each($j('div#reported_fleets tr.mission_attack, div#reported_fleets tr.mission_return').not('[class^="mission_return defenders"]'), function (ind, obj) {
				$j(obj).children('td')[tableHeaders.indexOf('Member')].append(doc.createTextNode($j($j(obj).children('td')[tableHeaders.indexOf('Target')]).children('a').children('span').html().split(' &nbsp; ')[0]));
			});
			$j.each($j('div#reported_fleets tr.mission_defend'), function (ind, obj) {
				$j(obj).children('td')[tableHeaders.indexOf('Member')].append(doc.createTextNode($j($j(obj).children('td')[tableHeaders.indexOf('From')]).children('a').children('span').html().split(' &nbsp; ')[0]));
			});
		}

		function alliance_defence_addRoidCount(tableHeaders) {
			addDefenceTableColumn(tableHeaders, 'Roids', 'Member', 'left', 'left');
			tableHeaders = getDefenceHeaders();

			//alliance_members.pl?order=cscore


		}


		function fleets_addLocalTime() {
			$j.each($j('tr td.mission_attack:contains("Arrival:")'), function (ind, obj) {
				var today = new Date();
				today.setHours(today.getHours() + eval($j(obj).html().match(/^[\d\+\s]*/g)[0]));
				$j(obj).html($j(obj).html().replace(/(.*)<br>(Arrival: \d+)(<br>.*)/g, '$1<br>$2 (' + today.getHours() + ':00)$3'));
			});
		}


		function fleets_updateLauchTimes() {
			//find fleets
			var mission1 = $j('select[name="mission1"]');
			var mission2 = $j('select[name="mission2"]');
			var mission3 = $j('select[name="mission3"]');


			//remove times
			$j.each($j('select[name="launch_tick1"] option, select[name="launch_tick2"] option, select[name="launch_tick3"] option'), function (ind, obj) {
				$j(obj).text($j(obj).text().replace(/\sat\s\d\d\:\d\d$/, ''));
			});
			//add PLs
			$j.each($j('select[name="launch_tick1"] option:first-child, select[name="launch_tick2"] option:first-child, select[name="launch_tick3"] option:first-child'), function (ind, obj) {
				$j(obj).text($j(obj).text() + '(+0)');
			});


			$j('select[name="mission1"]').change(function (ev) {
				switch ($j('select[name="mission1"] option:selected').text()) {
					case 'Attack':
						$j.each($j('select[name="launch_tick1"] option'), function (ind, obj) {
							$j(obj).text($j(obj).text() + ' - L:');
						});
						break;
					default:
						$j.each($j('select[name="launch_tick1"] option'), function (ind, obj) {
							$j(obj).text($j(obj).text().replace(/\s-\sL\:.*$/, ''));
						});
						break;
				}
			});

			$j('select[name="mission2"]').change(function (ev) {
				switch ($j('select[name="mission2"] option:selected').text()) {
					case 'Attack':
						$j.each($j('select[name="launch_tick2"] option'), function (ind, obj) {
							$j(obj).text($j(obj).text() + ' - L:');
						});
						break;
					default:
						$j.each($j('select[name="launch_tick2"] option'), function (ind, obj) {
							$j(obj).text($j(obj).text().replace(/\s-\sL\:.*$/, ''));
						});
						break;
				}
			});

			$j('select[name="mission3"]').change(function (ev) {
				switch ($j('select[name="mission3"] option:selected').text()) {
					case 'Attack':
						$j.each($j('select[name="launch_tick3"] option'), function (ind, obj) {
							$j(obj).text($j(obj).text() + ' - L:');
						});
						break;
					default:
						$j.each($j('select[name="launch_tick3"] option'), function (ind, obj) {
							$j(obj).text($j(obj).text().replace(/\s-\sL\:.*$/, ''));
						});
						break;
				}
			});
		}


		function alliance_fleets_fleets_addMemberName() {
			$j('table.tablesort thead tr th:first-child').after('<th class="left tablesort_asc">Name</th>');
			$j.each($j('table.tablesort tbody tr td:first-child'), function (ind, obj) {
				$j(obj).after('<td class="left">' + $j(obj).children('span').text().replace(/\s*\(.*?\)\s*/g, '') + '</td>');
			});
		}

		function alliance_fleets_launch_addAltRowStyle() {
			$j('table.tablesort tbody tr:odd').addClass('fleet_alt');
		}


		function galaxy_addNameToIntel() {
			$j.each($j('table#galtable tbody tr td:last-child'), function (ind, obj) {
				$j(obj).children('a').first().append($j(obj).children('a').first().attr('onclick').replace(/.*?\(([^)]*)\).*?/g, '$1').split(',')[5].trim().replace(/.*?\'([^)]*)\'.*?/g, '$1').length <= 0 ? '' : '&nbsp;-&nbsp;<span>' + $j(obj).children('a').first().attr('onclick').replace(/.*?\(([^)]*)\).*?/g, '$1').split(',')[5].trim().replace(/.*?\'([^)]*)\'.*?/g, '$1') + '</span>')
			})
		}


		function getDefenceHeaders() {
			var tHeads = [];
			$j.each($j('div#reported_fleets tr.mission_attack').parent().children('tr:first').children('th'), function (ind, obj) {
				tHeads.push(obj.innerText);
			});
			return tHeads;
		}


		function alliance_defence_markFleetCatches() {
			$j.each($j('div[class^="ally_def_fleetcatch"]'), function (ind, obj) {
				//$j(obj).closest('div.ally_def_incs_wrapper').css('background-color', '#FFFF0033');
			});
		}


		function alliance_defence_addBaseFleet(tableHeaders) {
			$j('div#reported_fleets tr.mission_attack').parent().children('tr:first').children('th')[tableHeaders.indexOf('Orig ETA')].innerText = 'Base';
			tableHeaders = getDefenceHeaders();

			$j.each($j('div#reported_fleets tr.mission_attack'), function (ind, obj) {
				var baseFleet = $j($j(obj).children('td')[tableHeaders.indexOf('Target')]).children('a').children('span').html().split(' &nbsp; ')[3].replace('Base: ', '');
				var span = doc.createElement('SPAN');
				span.className = baseFleet.toLowerCase() == 'fighting' ? 'mission_attack' : 'mission_defend';
				span.innerText = baseFleet;
				$j(obj).children('td')[tableHeaders.indexOf('Base')].append(span);
			});
		}


		function alliance_defence_addAttackerAlliance(tableHeaders) {
			addDefenceTableColumn(tableHeaders, 'Alliance', 'Dists', 'left', 'left');
			tableHeaders = getDefenceHeaders();

			$j.each($j('div#reported_fleets tr.mission_attack, div#reported_fleets tr.mission_return').not('[class^="mission_return defenders"]'), function (ind, obj) {
				$j(obj).children('td')[tableHeaders.indexOf('Alliance')].append(doc.createTextNode(PA_intel[$j(obj).children('td')[tableHeaders.indexOf('From')].innerText].alliance));
			});
		}


		function addDefenceTableColumn(tableHeaders, header, insertAfter, headerAlign, columnAlign) {
			var th = doc.createElement("TH");
			th.className = headerAlign;
			th.append(doc.createTextNode(header));
			$j('div#reported_fleets tr.mission_attack').parent().children('tr:first').children('th')[tableHeaders.indexOf(insertAfter)].after(th);

			$j.each($j('div#reported_fleets tr.mission_attack, div#reported_fleets tr.mission_defend, div#reported_fleets tr.mission_return'), function (ind, obj) {
				var td = doc.createElement("TD");
				td.className = columnAlign;
				$j(obj).children('td')[tableHeaders.indexOf(insertAfter)].after(td);
			});
			$j.each($j('tr.spacer'), function (ind, obj) {
				$j(obj).children('td').first().attr('colspan', parseInt($j(obj).children('td').first().attr('colspan')) + 1)
			});
		}


		function alliance_defence_addFreeShips(tableHeaders) {
			addDefenceTableColumn(tableHeaders, 'Ships', 'Member', 'left', 'center');
			tableHeaders = getDefenceHeaders();

			$j.each($j('div#reported_fleets tr.mission_attack'), function (ind, obj) {
				var link = doc.createElement("A");
				link.href = '/alliance_fleets.pl?view=free&member=' + $j($j(obj).children('td')[tableHeaders.indexOf('Target')]).children('a').attr('href').match(/member=(\d+)/)[1];
				link.target = '_blank';
				var rocket = doc.createElement("IMG");
				rocket.src = 'https://drive.google.com/uc?export=download&id=1d_ix6lNBekbcgiF9FmxNdwUtVblT_vxi';
				rocket.alt = 'Ships';
				rocket.style = 'width:16px;height:16px;margin:0px;';
				$j(link).append(rocket);
				$j(obj).children('td')[tableHeaders.indexOf('Ships')].append(link);
			});
		}

		function alliance_defence_fixFleetETA(tableHeaders) {
			$j.each($j('div#reported_fleets tr.mission_attack, div#reported_fleets tr.mission_return').not('[class^="mission_return defenders"]'), function (ind, obj) {
				$j(obj).children('td')[tableHeaders.indexOf('ETA')].innerText = $j(obj).children('td')[tableHeaders.indexOf('ETA')].innerText + '/' + $j(obj).children('td')[tableHeaders.indexOf('Orig ETA')].innerText;
				$j(obj).children('td')[tableHeaders.indexOf('Orig ETA')].innerText = '';
			});
			$j.each($j('div#reported_fleets tr.mission_defend'), function (ind, obj) {
				$j(obj).children('td')[tableHeaders.indexOf('ETA')].innerText = $j(obj).children('td')[tableHeaders.indexOf('ETA')].innerText + '/' + $j(obj).children('td')[tableHeaders.indexOf('Status')].innerText;
				$j(obj).children('td')[tableHeaders.indexOf('Status')].innerText = '';
			});
		}


		function alliance_defence_replaceFleetMissionWithDistorters(tableHeaders) {
			$j('div#reported_fleets tr.mission_attack').parent().children('tr:first').children('th')[tableHeaders.indexOf('Mission')].innerText = 'Dists';
			tableHeaders = getDefenceHeaders();

			$j.each($j('div#reported_fleets tr.mission_attack'), function (ind, obj) {
				$j(obj).children('td')[tableHeaders.indexOf('Dists')].innerText = PA_intel[$j(obj).children('td')[tableHeaders.indexOf('From')].innerText].dists;
				$j(obj).children('td')[tableHeaders.indexOf('Dists')].className = 'center';
			});
			$j.each($j('tr.mission_defend'), function (ind, obj) {
				$j(obj).children('td')[tableHeaders.indexOf('Dists')].innerText = '';
				$j(obj).children('td')[tableHeaders.indexOf('Dists')].className = 'center';
			});

		}


		function addFleetMissionColours() {
			var currETA = 0;
			var currStyle = 'fleet_alt';
			$j.each($j('table').children('tbody').children('tr:not(:first)'), function (ind, obj) {
				if($j(obj).children('td').length > 3) {
					if(parseInt($j(obj).children('td')[3].innerText) == currETA) {
						$j(obj).addClass(currStyle);
					} else {
						currETA = parseInt($j(obj).children('td')[3].innerText);
						currStyle = currStyle == '' ? 'fleet_alt' : '';
						$j(obj).addClass(currStyle);
					}
					currETA = parseInt($j(obj).children('td')[3].innerText);
					if($j(obj).children('td').length > 0) {
						switch ($j(obj).children('td')[1].innerText) {
							case 'Attack':
								$j(obj).children('td:not(:first)').addClass('mission_attack');
								break;
							case 'Defend':
								$j(obj).children('td:not(:first)').addClass('mission_defend');
								break;
						}
					}
				}
			});
		}

		function overview_updateQuests() {
			//add show completed link
			var qLink = doc.createElement('A');
			qLink.id = 'quest_system_showhide_completed';
			qLink.className = 'show_hide'
			qLink.href = '#';
			qLink.text = '[Show Completed]';
			$j(qLink).click(function (ev) {
				ev.preventDefault();
				var cats = $j('div#quest_system div.section_information').length + 1;
				for (var cat = 1; cat <= cats; cat++) {
					$j.each($j('tr#quests_in_category' + cat + ' td table tr'), function (k, v) {
						if($j(v).find('span.completed').length > 0) {
							if($j('a#quest_system_showhide_completed').text() == '[Show Completed]') {
								//show completed quests
								$j(v).show();
							} else {
								//hide completed quests
								$j(v).hide();
							}
						}
					});
				}
				if($j('a#quest_system_showhide_completed').text() == '[Show Completed]') {
					$j('a#quest_system_showhide_completed').text('[Hide Completed]');
				} else {
					$j('a#quest_system_showhide_completed').text('[Show Completed]');
				}
			});
			$j('div#quest_system div.header').append('&nbsp;').append(qLink);

			//add xp next to categories
			$j.each($j('div#quest_system div.section_information'), function (k, v) {
				$j(v).find('span.questionmark').remove();
				if(!$j(v).parent().prev().find('div.progress_value').html().includes('100%')) {
					$j(v).html($j(v).find('div.info_contents span.superhighlight').text());
				}
				$j(v).addClass('nowrap');
				$j(v).parent().removeClass('center').addClass('right');
			});
			//iterate through quest categories
			var cats = $j('div#quest_system div.section_information').length + 1;
			for (var cat = 1; cat <= cats; cat++) {
				$j.each($j('tr#quests_in_category' + cat + ' td table tr'), function (k, v) {
					$j(v).children('td').first().css('padding-left', '20px');
					$j(v).children('td').first().children('span').remove();
					//add reward next to quest
					var reward = $j(v).find('td p:last span.superhighlight').html();
					var td = doc.createElement("TD");
					td.className = 'right';
					td.style.fontSize = '0.9em';
					if(reward) {
						var span = doc.createElement("SPAN");
						span.className = 'questReward';
						span.append(
							doc.createTextNode(
								reward
									.replace('Gain ', '')
									.replace(' Bonus', '')
									.replace('Construction Unit', 'CU')
									.replace('Research Point', 'RP')
									.replace('of each asteroid type', 'Each Roids')
									.replace('of each resource', 'Each Res')
							)
						);
						td.append(span);
					}
					$j(v).prev().children('td:last').after(td);
					if($j(v).find('span.completed').length > 0) {
						//hide completed quests
						$j(v).hide();
					}
				});
			}
			//fix width
			$j($j('#quest_system div.maintext table').find('tr').first().children('th')[0]).css('width', '15%');
			$j($j('#quest_system div.maintext table').find('tr').first().children('th')[2]).css('width', '25%');
			$j($j('#quest_system div.maintext table').find('tr').first().children('th')[3]).css('width', '8%');
			$j($j('#quest_system div.maintext table').find('tr').first().children('th')[4]).css('width', '15%');
		}


		function unique(list) {
			var result = [];
			$j.each(list, function (i, e) {
				if($.inArray(e, result) == -1) result.push(e);
			});
			return result;
		}

		function getUrlParameter(name) {
			name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
			var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
			var results = regex.exec(location.search);
			return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
		};


		function getScanId(search) {
			var regex = new RegExp('[\\?&]scan_id=([^&#]*)');
			var results = regex.exec(search);
			return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, ' '));
		};

	})(window);


})();
