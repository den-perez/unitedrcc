/*
 * Live "Open now / Closed" badge for the homepage hours board.
 * Uses Houston (America/Chicago) time regardless of the visitor's time zone.
 * Regular hours only: holidays and one-off closures are not known here.
 */
(function () {
	var el = document.querySelector('[data-hours-status]');
	if (!el || !window.Intl || !Intl.DateTimeFormat) return;

	// Minutes after midnight, keyed by weekday (0 = Sunday).
	var schedule = {
		1: [480, 1140], 2: [480, 1140], 3: [480, 1140], 4: [480, 1140], 5: [480, 1140],
		6: [480, 720]
	};
	var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	var dayKeys = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	function label(mins) {
		var h = Math.floor(mins / 60), m = mins % 60;
		var suffix = h >= 12 ? 'PM' : 'AM';
		h = h % 12 || 12;
		return h + (m ? ':' + (m < 10 ? '0' : '') + m : '') + suffix;
	}

	function houstonNow() {
		var parts = new Intl.DateTimeFormat('en-US', {
			timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23'
		}).formatToParts(new Date());
		var out = {};
		parts.forEach(function (p) { out[p.type] = p.value; });
		return { day: dayKeys.indexOf(out.weekday), mins: (parseInt(out.hour, 10) % 24) * 60 + parseInt(out.minute, 10) };
	}

	function update() {
		var now = houstonNow();
		if (now.day < 0) return;
		var today = schedule[now.day];
		var text, open = false;

		if (today && now.mins >= today[0] && now.mins < today[1]) {
			open = true;
			text = '<strong>Open now</strong> until ' + label(today[1]);
		} else if (today && now.mins < today[0]) {
			text = '<strong>Closed</strong> opens ' + label(today[0]) + ' today';
		} else {
			for (var i = 1; i <= 7; i++) {
				var d = (now.day + i) % 7;
				if (schedule[d]) {
					text = '<strong>Closed</strong> opens ' + label(schedule[d][0]) + ' ' + (i === 1 ? 'tomorrow' : dayNames[d]);
					break;
				}
			}
		}

		el.innerHTML = text;
		el.classList.toggle('is-open', open);
		el.classList.toggle('is-closed', !open);
		el.hidden = false;
	}

	update();
	setInterval(update, 60000);
})();
