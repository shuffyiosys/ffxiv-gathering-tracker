'use strict'
let eorzeaMinutes = 0;
let eorzeaHours = 12;
let middayPeriod = 'AM'
let trackedNodes = {};
let trackerTimer = null;
let alarmEnabled = false;

let rtTimer = null;
let rtAlarmSeconds = 0;

const EORZEA_MINUTE_MS = 2916;
const EORZEA_MINUTE_SCALE = (2 + 11/12);

function initTracker() {
	for(let hour = 2; hour <= 12; hour += 2) {
		trackedNodes[hour] = new Set();
	}
	processTick();

	let nextNodeHour = parseInt($($(`#next-node`).children()[0]).attr('id').substr(5));
	if (nextNodeHour === 12) {
		nextNodeHour = 0;
	}
	while (nextNodeHour < (eorzeaHours - 1)) {
		shiftQueue();
		nextNodeHour = parseInt($($(`#next-node`).children()[0]).attr('id').substr(5));
	}

	let cardIdx = 0;
	for(const nodeName in GATHERING_NODES) {
		const cardHtml = generateNodeCard(nodeName, cardIdx++);
		$(`#node-locations`).append(cardHtml);
	}
	$('.node-card > div.card-content > button').click(enqueueNode);

	$('#alarm-enable-checkbox').change(ev => {
		if (Notification.permission !== 'denied') {
			Notification.requestPermission().then((permission) => console.log(`Permission: ${permission}`));
		}
		alarmEnabled = $(ev.target).is(':checked');
		localStorage.setItem('alarmEnabled', alarmEnabled);
	});

	$('#removeAllButton').click(() => {
		let savedNodes = localStorage.getItem('selectedNodes').split(',');
		savedNodes.forEach(nodeName => { 
			const event = {target: $(`#${nodeName}-card > div.card-content > button`)[0]};
			dequeueNode(event);
		});
		saveData();
	})

	if (localStorage.getItem('alarmEnabled')) {
		if (localStorage.getItem('alarmEnabled') === "true") {
			alarmEnabled = true;
			$('#alarm-enable-checkbox').prop('checked', true);
		}
	}

	if (localStorage.getItem('selectedNodes')) {
		let savedNodes = localStorage.getItem('selectedNodes').split(',');
		savedNodes.forEach(nodeName => { 
			const event = {target: $(`#${nodeName}-card > div.card-content > button`)[0]};
			enqueueNode(event);
		});
	}

	rtAlarmSeconds = parseInt(((eorzeaHours + 1) % 2 * 60 + (60 - eorzeaMinutes)) * EORZEA_MINUTE_SCALE) - 2;
	$(`#rt-timer`).html(`${parseInt(rtAlarmSeconds/60)}:${String(rtAlarmSeconds % 60).padStart(2, "0")}`);
	
	trackerTimer = setInterval(processTick, EORZEA_MINUTE_MS);
	rtTimer = setInterval(processRtTimer, 1000);
}

function generateNodeCard(nodeName, idx=0) {
	const node = GATHERING_NODES[nodeName];
	let materialList = '';
	node.materials.forEach(material => {
		let rewardHtml = '';
		let materialHtml = `<img src="./media/img/${material.toLowerCase().replaceAll(" ", "_")}.png" alt="${material} icon" height="32px"> ${material}`

		if (material in COLLECTABLES === true) { 
			let scripText = COLLECTABLES[material].type;
			let scripIconName = scripText.toLowerCase().replaceAll(' ', '_')
			rewardHtml = `<img src="./media/img/${scripIconName}_gatherers_scrip.png" alt="${scripText} Gatherer's Scrip icon" height="32px"> x${COLLECTABLES[material].amount} | `
		} 
		materialList += `<div class="node-material">${rewardHtml}${materialHtml}</div>`
	});

	const gatheringIcon = `<img src="./media/img/${node.nodeType.toLowerCase()}.png" alt="${node.nodeType} icon">`;
	return `<div id="${nodeName}-card" class="card node-card" index="${idx}" dataName="${nodeName}">
		<div class="card-title">
			${gatheringIcon} ${node.region} (X: ${node.xCoord}/Y: ${node.yCoord}) | Time: ${node.time}:00 | Closest Aetheryte: ${node.aetheryte}<br>
		</div>
		<div class="card-content">
			${materialList}
			<button class="btn btn-primary btn-sm">Add</button>
		</div>
	</div>`
}

function moveCard(cardId, listId) {
	const nodeCard = $(`#${cardId}`);
	nodeCard.detach();
	$(`#${listId}`).append(nodeCard[0]);
}

function enqueueNode(event) {
	const nodeCard = $(event.target).parent().parent();
	const nodeName = nodeCard.attr('dataName');
	const gatheringNode = GATHERING_NODES[nodeName];
	trackedNodes[gatheringNode.time].add(nodeName);

	// Handle the UI part here.
	moveCard(nodeCard.attr('id'), `hour-${gatheringNode.time}`);
	$(event.target).html(`Remove`);
	$(event.target).removeClass('btn-primary');
	$(event.target).addClass('btn-danger');

	$(event.target).off('click', enqueueNode);
	$(event.target).on('click', dequeueNode);
	saveData();
}

function dequeueNode(event) {
	const nodeCard = $(event.target).parent().parent();
	const nodeName = nodeCard.attr('dataName');
	const hour = GATHERING_NODES[nodeName].time;
	trackedNodes[hour].delete(nodeName);

	const locationCards = $(`#node-locations`).children().toArray();
	let targetCard = null;

	for(let i = 1; i < locationCards.length; i++) {
		const card = locationCards[i];
		if(parseInt($(card).attr('index')) < parseInt(nodeCard.attr('index'))) { continue; }
		targetCard = card;
		break;
	}
	
	nodeCard.detach();
	if(targetCard === null) { $(`#node-locations`).append(nodeCard[0]); }
	else { nodeCard.insertBefore(targetCard); }
	$(event.target).html(`Add`);
	$(event.target).removeClass('btn-danger');
	$(event.target).addClass('btn-primary');

	$(event.target).off('click', dequeueNode);
	$(event.target).on('click', enqueueNode);
	saveData();
}

function shiftQueue() {
	const outgoingNode = $(`#next-node`).children()[0];
	$(outgoingNode).detach();
	$(`#node-queue`).append(outgoingNode);

	let incomingNode = $(`#node-queue`).children()[0];
	$(incomingNode).detach();
	$(`#next-node`).append(incomingNode);
}

function writeTime() {
	const displayHours = (eorzeaHours === 0) ? 12 : eorzeaHours;
	$('#eorzean-clock').html(`${displayHours}:${String(eorzeaMinutes).padStart(2, "0")} ${middayPeriod}`);
}

function processTick() {
	const currentTime = Date.now() / 1000 / EORZEA_MINUTE_SCALE;
	eorzeaHours = parseInt(currentTime / 60) % 24;
	eorzeaMinutes = parseInt(currentTime % 60);

	if (eorzeaHours > 11) {
		middayPeriod = 'PM';
		eorzeaHours -= 12;
	}
	else {
		middayPeriod = 'AM';
	}
	writeTime();

	if (alarmEnabled && eorzeaHours % 2 == 1 && eorzeaMinutes === 55) {
		let nodeNames = [];
		trackedNodes[eorzeaHours + 1].forEach(nodeName => {
			nodeNames.push(GATHERING_NODES[nodeName].region);
		})
		console.log(nodeNames)
		if (nodeNames.length > 0) {
			const message = `${eorzeaHours + 1}:00 ${middayPeriod} ${nodeNames.toString().replaceAll(',', ', ')} nodes are about to pop!`;

			if (Notification.permission === "granted") {
				let notification = new Notification(message);
				let audioNotify = new Audio('./media/audio/FFXIV_Incoming_Tell_1.mp3');
				setTimeout(() => {notification.close()}, 10000);
				audioNotify.play();
			}
			console.log(message);
		}
	}
	else if (eorzeaHours % 2 == 0 && eorzeaMinutes == 0) {
		rtAlarmSeconds = parseInt(120 * EORZEA_MINUTE_SCALE);
		shiftQueue();
	}
}

function processRtTimer() {
	$(`#rt-timer`).html(`${parseInt(rtAlarmSeconds/60)}:${String(rtAlarmSeconds % 60).padStart(2, "0")}`);
	if (rtAlarmSeconds >= 0) { rtAlarmSeconds --; }
}

function saveData() {
	let nodes = [];
	for(const time in trackedNodes) {
		trackedNodes[time].forEach(node => nodes.push(node));
	}
	localStorage.setItem('selectedNodes', nodes);
}

initTracker();