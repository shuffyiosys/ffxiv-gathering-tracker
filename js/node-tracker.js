'use strict'
let eorzeaMinutes = 0;
let eorzeaHours = 12;
let middayPeriod = 'AM'
let trackedNodes = {};
let trackerTimer = null;
let alarmEnabled = false;

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

	for(const nodeName in GATHERING_NODES) {
		const cardHtml = generateNodeCard(nodeName, '', 'node-selection', 'Add', 'btn-primary');
		$(`#node-locations`).append(cardHtml);
	}

	$(`.node-selection > .card-content > button`).click(ev => {
		const nodeName = $(ev.target).attr('dataName');
		addNode(nodeName);
		saveData();
	});

	$('#alarm-enable-checkbox').change(ev => {
		if (Notification.permission !== 'denied') {
			Notification.requestPermission().then((permission) => console.log(`Permission: ${permission}`));
		}
		alarmEnabled = $(ev.target).is(':checked');
		localStorage.setItem('alarmEnabled', alarmEnabled);
	});

	if (localStorage.getItem('alarmEnabled')) {
		if (localStorage.getItem('alarmEnabled') === "true") {
			alarmEnabled = true;
			$('#alarm-enable-checkbox').prop('checked', true);
		}
	}

	if (localStorage.getItem('selectedNodes')) {
		let savedNodes = localStorage.getItem('selectedNodes').split(',');
		savedNodes.forEach(node => addNode(node));
	}

	trackerTimer = setInterval(processTick, EORZEA_MINUTE_MS);
}

function generateNodeCard(nodeName, cardId='', cardClass='', buttonText='', buttonType='') {
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
	const id = (cardId) ? `id=${cardId}` : '';
	return `<div ${id} class="${cardClass} card">
		<div class="card-title">
			${gatheringIcon} ${node.region} (X: ${node.xCoord}/Y: ${node.yCoord}) | Time: ${node.time}:00 | Closest Aetheryte: ${node.aetheryte}<br>
		</div>
		<div class="card-content">
			${materialList}
			<button class="btn ${buttonType} btn-sm" dataName="${nodeName}">${buttonText}</button>
		</div>
	</div>`
}

function addNode(nodeName) {
	const node = GATHERING_NODES[nodeName];
	trackedNodes[node.time].add(nodeName);
	const cardHtml = generateNodeCard(nodeName, nodeName, 'node-queue-item', 'Remove', 'btn-danger')
	$(`#hour-${node.time}`).append(cardHtml);

	$(`#${nodeName} > .card-content > button`).click(ev => {
		const nodeName = $(ev.target).attr('dataName');
		removeNode(nodeName);
		saveData();
	})
}

function removeNode(nodeName) {
	const hour = GATHERING_NODES[nodeName].time;
	trackedNodes[hour].delete(nodeName);

	$(`#${nodeName}`).remove();
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
	$('#eorzean-clock').html(`Current Time: ${displayHours}:${String(eorzeaMinutes).padStart(2, "0")} ${middayPeriod}`);
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

	if (alarmEnabled && eorzeaHours % 2 == 1 && eorzeaMinutes === 58) {
		let nodeNames = [];
		trackedNodes[eorzeaHours + 1].forEach(nodeName => {
			nodeNames.push(GATHERING_NODES[nodeName].region);
		})
		const message = `${eorzeaHours + 1}:00 ${middayPeriod} ${nodeNames.toString().replaceAll(',', ', ')} nodes are about to pop!`;

		if (Notification.permission === "granted") {
			let notification = new Notification(message);
			let audioNotify = new Audio('./media/audio/FFXIV_Incoming_Tell_1.mp3');
			setTimeout(() => {notification.close()}, 10000);
			audioNotify.play();
		}
		console.log(message);
	}
	else if (eorzeaHours % 2 == 0 && eorzeaMinutes == 0) {
		shiftQueue();
	}
}

function saveData() {
	let nodes = [];
	for(const time in trackedNodes) {
		trackedNodes[time].forEach(node => nodes.push(node));
	}
	localStorage.setItem('selectedNodes', nodes);
}

initTracker();