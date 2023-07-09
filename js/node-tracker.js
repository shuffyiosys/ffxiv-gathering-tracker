'use strict'
let eorzeaMinutes = 0;
let trackedNodes = {};
let trackerTimer = null;
let alarmEnabled = false;

let rtTimer = null;
let rtAlarmSeconds = 0;
let rtExpected = 0;
const RT_INTERVAL = 1000;

const EORZEA_MINUTE_MS = 2916;
const EORZEA_MINUTE_SCALE = (2 + 11/12);
const MINUTES_IN_DAY = 1440;
const BUTTON_SELECTOR = `div.tracker-card-footer > div:nth-child(2) > button`;

function initTracker() {
	for(let hour = 2; hour <= 12; hour += 2) {
		trackedNodes[hour] = new Set();
	}
	processTick();
	alignQueueToEorzeaTime();
	buildNodeList();

	$(`#alarm-enable-checkbox`).prop("checked", false);
	$(`.node-card > ${BUTTON_SELECTOR}`).click(enqueueNode);

	$('#alarm-enable-checkbox').change(ev => {
		if (Notification.permission !== 'denied') {
			Notification.requestPermission().then((permission) => console.log(`Permission: ${permission}`));
		}
		alarmEnabled = $(ev.target).is(':checked');

		if (alarmEnabled === true && rtAlarmSeconds <= 10) {
			triggerAlarm();
		}
	});

	$('#removeAllButton').click(() => {
		let savedNodes = localStorage.getItem('selectedNodes').split(',');
		savedNodes.forEach(nodeName => { 
			const event = {target: $(`#${nodeName}-card > ${BUTTON_SELECTOR}`)[0]};
			dequeueNode(event);
		});
		saveData();
	})

	if (localStorage.getItem('selectedNodes')) {
		let savedNodes = localStorage.getItem('selectedNodes').split(',');
		savedNodes.forEach(nodeName => { 
			const event = {target: $(`#${nodeName}-card > ${BUTTON_SELECTOR}`)[0]};
			enqueueNode(event);
		});
	}

	rtAlarmSeconds = getRtSecondsToNextNode();
	displayRtAlarmTime();
	
	rtExpected = Date.now() + RT_INTERVAL;
	trackerTimer = setInterval(processTick, EORZEA_MINUTE_MS);
	rtTimer = setInterval(processRtTimer, RT_INTERVAL);
}

/**********************************************************************************************************************
 * GUI functions
 */
function buildNodeList() {
	let cardIdx = 0;
	for(const nodeName in GATHERING_NODES) {
		const cardHtml = generateNodeCard(nodeName, cardIdx++);
		$(`#node-locations`).append(cardHtml);
	}

}

function generateNodeCard(nodeName, idx=0) {
	const node = GATHERING_NODES[nodeName];
	let materialList = '';
	node.materials.forEach(material => {
		let rewardHtml = '';
		let materialHtml = `<div><img src="./media/img/${material.toLowerCase().replaceAll(" ", "_")}.png" alt="${material} icon" height="32px"> ${material}</div>`

		if (material in COLLECTABLES === true) { 
			let scripText = COLLECTABLES[material].type;
			let scripIconName = scripText.toLowerCase().replaceAll(' ', '_')
			rewardHtml = `<div><img src="./media/img/${scripIconName}_gatherers_scrip.png" alt="${scripText} Gatherer's Scrip icon" height="32px"> x${COLLECTABLES[material].amount}</div>`
		}
		else if (material in LEGENDARY_MATS) {
			rewardHtml = `<div>Perception: ${LEGENDARY_MATS[material].perception}</div>`;
		}
		materialList += `<div class="node-material">${materialHtml}${rewardHtml}</div>`
	});

	const gatheringIcon = `<img src="./media/img/${node.nodeType.toLowerCase()}.png" alt="${node.nodeType} icon">`;
	return `
		<div id="${nodeName}-card" class="tracker-card node-card" index="${idx}" dataName="${nodeName}">
			<div class="tracker-card-title">
				${gatheringIcon} ${node.region} (X: ${node.xCoord}/Y: ${node.yCoord}) | Time: ${node.time}:00
			</div>
			<div class="tracker-card-content">
				${materialList}
			</div>
			<div class="tracker-card-footer">
				<div>
				Closest Aetheryte: ${node.aetheryte}
				</div>
				<div>
					<button class="btn btn-primary btn-sm">Add</button>
				</div>
			</div>
		</div>`
}

function moveCardToQueue(nodeCard, queueSlotId, buttonTarget) {
	nodeCard.detach();
	$(`#${queueSlotId}`).append(nodeCard[0]);
	$(`#${queueSlotId}`).addClass('spacer')
	$(buttonTarget).html(`Remove`);
	$(buttonTarget).removeClass('btn-primary');
	$(buttonTarget).addClass('btn-danger');

	$(buttonTarget).off('click', enqueueNode);
	$(buttonTarget).on('click', dequeueNode);
}

function moveCardToList(nodeCard, buttonTarget) {
	const locationCards = $(`#node-locations`).children().toArray();
	let i = 1;
	for(; i < locationCards.length; i++) {
		const card = locationCards[i];
		if(parseInt($(card).attr('index')) > parseInt(nodeCard.attr('index'))) { 
			break; 
		}
	}

	const targetCard = locationCards[i];
	const queueSlot = nodeCard.parent();
	nodeCard.detach();
	if(queueSlot.children().length === 0) { queueSlot.removeClass('spacer'); }
	if(targetCard === null) { $(`#node-locations`).append(nodeCard[0]); }
	else { nodeCard.insertBefore(targetCard); }

	$(buttonTarget).html(`Add`);
	$(buttonTarget).removeClass('btn-danger');
	$(buttonTarget).addClass('btn-primary');

	$(buttonTarget).off('click', dequeueNode);
	$(buttonTarget).on('click', enqueueNode);
}

function displayEorzeaTime() {
	const middayPeriod = (eorzeaMinutes > (MINUTES_IN_DAY / 2)) ? 'PM' : 'AM';
	const eorzeaHours = getEorzeaHour();
	$('#eorzean-clock').html(`${eorzeaHours}:${String(eorzeaMinutes % 60).padStart(2, "0")} ${middayPeriod}`);
}

function displayRtAlarmTime() {
	if (rtAlarmSeconds <= -1) {
		$(`#rt-timer`).html(`N/A`);
	}
	else {
		const minute = parseInt(rtAlarmSeconds/60);
		const second = rtAlarmSeconds % 60;
		$(`#rt-timer`).html(`${minute}:${String(second).padStart(2, "0")}`);
	}
}

function rotateQueueDisplay() {
	const outgoingNode = $(`#current-node`).children()[0];
	$(outgoingNode).detach();
	$(`#node-queue`).append(outgoingNode);

	let incomingNode = $(`#node-queue`).children()[0];
	$(incomingNode).detach();
	$(`#current-node`).append(incomingNode);
}

function alignQueueToEorzeaTime() {
	function getCurrentNodeHour() {
		let hour = parseInt($($(`#current-node`).children()[0]).attr('id').substr(5));
		return hour;
	}

	let targetHour = parseInt(getEorzeaHour() / 2) * 2;
	targetHour = (targetHour === 0) ? 12 : targetHour;
	let currentHour = getCurrentNodeHour();
	while (currentHour != targetHour) {
		rotateQueueDisplay();
		currentHour = getCurrentNodeHour();
	}
}

function triggerAlarm() {
	if (Notification.permission !== "granted") {
		return;
	}
	let nodeNames = [];
	let eorzeaHours = getEorzeaHour();
	if (eorzeaHours % 2 == 1) { eorzeaHours ++; }
	if (trackedNodes[eorzeaHours].size === 0) {
		return;
	}

	trackedNodes[eorzeaHours].forEach(nodeName => {
		nodeNames.push(GATHERING_NODES[nodeName].region);
	});

	const middayPeriod = (eorzeaMinutes > (MINUTES_IN_DAY / 2)) ? 'PM' : 'AM';
	const message = `${eorzeaHours}:00 ${middayPeriod} ${nodeNames.toString().replaceAll(',', ', ')} nodes are about to pop!`;
	console.log(message);

	let notification = new Notification(message);
	let audioNotify = new Audio('./media/audio/FFXIV_Linkshell_Transmission.mp3');
	setTimeout(() => {notification.close()}, 10000);
	audioNotify.play();
}

/**********************************************************************************************************************
 * Node queuing
 */
function enqueueNode(event) {
	const nodeCard = $(event.target).parent().parent().parent();
	const nodeName = nodeCard.attr('dataName');
	const gatheringNode = GATHERING_NODES[nodeName];
	trackedNodes[gatheringNode.time].add(nodeName);

	moveCardToQueue(nodeCard, `hour-${gatheringNode.time}`, event.target);

	rtAlarmSeconds = getRtSecondsToNextNode();
	processRtTimer();
	saveData();
}

function dequeueNode(event) {
	const nodeCard = $(event.target).parent().parent().parent();
	const nodeName = nodeCard.attr('dataName');
	const hour = GATHERING_NODES[nodeName].time;
	trackedNodes[hour].delete(nodeName);

	moveCardToList(nodeCard, event.target);

	rtAlarmSeconds = getRtSecondsToNextNode();
	processRtTimer();
	saveData();
}

/**********************************************************************************************************************
 * Eorzea Timer 
 */
function processTick() {
	advanceEorzeaTime();
	displayEorzeaTime();
}

function advanceEorzeaTime() {
	if(debugMode) {
		eorzeaMinutes ++;
	}
	else {
		eorzeaMinutes = parseInt(Date.now() / 1000 / EORZEA_MINUTE_SCALE) % MINUTES_IN_DAY;
	}

	if (eorzeaMinutes % 120 == 0) {
		rotateQueueDisplay();
		rtAlarmSeconds = getRtSecondsToNextNode();
		displayRtAlarmTime();
	}
}

function getEorzeaHour() {
	let hours = parseInt(eorzeaMinutes / 60) % 12;
	return (hours === 0) ? 12 : hours;
}

/**********************************************************************************************************************
 * Real-time Timer 
 */

function processRtTimer() {
	if (rtAlarmSeconds % 35 == 0) {
		rtAlarmSeconds = getRtSecondsToNextNode();
	}

	if (rtAlarmSeconds > -1) {
		rtAlarmSeconds --;
	}
	displayRtAlarmTime();

	if (alarmEnabled === false || rtAlarmSeconds !== 10) {
		return;
	}

	triggerAlarm();
}

function getRtSecondsToNextNode() {
	const currentHour = parseInt(eorzeaMinutes / 60) % 12;
	const currentMinutes = (eorzeaMinutes % 60);

	let nextHour = -1;
	for(let i = 0; i < $('#node-queue').children().length; i++) {
		if ($('#node-queue').children()[i].children.length > 0) {
			nextHour = parseInt($('#node-queue').children()[i].id.substr(5));
			break;
		}
	}

	if (nextHour > -1) {
		nextHour = (nextHour <= currentHour) ? nextHour + 12 : nextHour;
		const rtMinutes = (nextHour - currentHour - 1) * 60 + (60 - currentMinutes);
		return parseInt(rtMinutes * EORZEA_MINUTE_SCALE);
	}
	else {
		return -1;
	}
}

/**********************************************************************************************************************
 * Utility
 */
function saveData() {
	let nodes = [];
	for(const time in trackedNodes) {
		trackedNodes[time].forEach(node => nodes.push(node));
	}
	localStorage.setItem('selectedNodes', nodes);
}

/**********************************************************************************************************************
 * Debug functions
 */
let debugMode = false;

function debug_stopTimers() {
	clearInterval(trackerTimer);
	clearInterval(rtTimer);
}

function debug_startTimers() {
	trackerTimer = setInterval(processTick, EORZEA_MINUTE_MS);
	rtTimer = setInterval(processRtTimer, RT_INTERVAL);
}

function setEorzeaTime(hours, minutes) {
	if(debugMode == false) {
		console.log(`Debug mode is not enabled, setting time won't work!`);
		return;
	}
	if (hours > 23 || minutes > 59) {
		return;
	}

	eorzeaMinutes = (hours * 60) + minutes;
	displayEorzeaTime();
	displayRtAlarmTime();
	alignQueueToEorzeaTime();
	rtAlarmSeconds = getRtSecondsToNextNode();
}

initTracker();