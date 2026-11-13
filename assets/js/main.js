(function ($) {

	var $window = $(window),
		$body = $('body'),
		$banner = $('#banner'),
		$header = $('#header');

	function isFaxLink(link) {
		return /^\s*Fax\s*:/i.test(link.closest('p')?.textContent || '');
	}

	function getCallLocation(link, fallback = 'other') {
		if (link.closest('#header')) return 'header';
		if (link.closest('.call_icon')) return 'floating_cta';
		if (link.closest('#all_clinics')) return 'clinic_map';
		return fallback;
	}

	function trackCallClick(event, fallbackLocation) {
		const target = event.target instanceof Element ? event.target : null;
		const link = target?.closest('a[href^="tel:"]');

		if (!link || isFaxLink(link) || typeof window.gtag !== 'function') return;

		window.gtag('event', 'click_to_call', {
			call_location: getCallLocation(link, fallbackLocation),
			transport_type: 'beacon'
		});
	}

	document.addEventListener('click', event => trackCallClick(event));

	// Breakpoints.
	breakpoints({
		xlarge: ['1281px', '1680px'],
		large: ['981px', '1280px'],
		medium: ['737px', '980px'],
		small: ['481px', '736px'],
		xsmall: [null, '480px']
	});

	// Play initial animations on page load.
	$window.on('load', function () {
		window.setTimeout(function () {
			$body.removeClass('is-preload');
		}, 100);
	});

	// Mobile?

	if (browser.mobile)
		$body.addClass('is-mobile');
	else {

		breakpoints.on('>medium', function () {
			$body.removeClass('is-mobile');
		});

		breakpoints.on('<=medium', function () {
			$body.addClass('is-mobile');
		});

	}



	// Scrolly.
	$('.scrolly')
		.scrolly({
			speed: 1500,
			offset: $header.outerHeight()
		});

	// Menu.
	$('#menu')
		.append('<a href="#menu" class="close" aria-label="Close navigation menu"><img src="assets/css/images/xmark1.svg" alt=""></a>')
		.appendTo($body)
		.panel({
			delay: 500,
			hideOnClick: true,
			hideOnSwipe: true,
			hideOnEscape: true,
			resetScroll: true,
			resetForms: true,
			side: 'right',
			target: $body,
			visibleClass: 'is-menu-visible'
		});

	const menuElement = document.getElementById('menu');
	const pageWrapper = document.getElementById('page-wrapper');
	const menuToggle = document.querySelector('.menuToggle');
	const syncMenuAccessibility = () => {
		const isOpen = $body.hasClass('is-menu-visible');
		const focusWasInMenu = menuElement.contains(document.activeElement);
		menuToggle.setAttribute('aria-expanded', String(isOpen));
		menuToggle.setAttribute('aria-label', `${isOpen ? 'Close' : 'Open'} navigation menu`);
		menuElement.inert = !isOpen;
		pageWrapper.inert = isOpen;

		if (isOpen) {
			menuElement.querySelector('a:not(.close)')?.focus();
		} else if (focusWasInMenu) {
			menuToggle.focus();
		}
	};

	new MutationObserver(syncMenuAccessibility).observe(document.body, {
		attributes: true,
		attributeFilter: ['class']
	});
	syncMenuAccessibility();

	// Background video is decorative and starts after the page finishes loading.
	const backgroundVideo = document.getElementById('massage_video');
	const videoToggle = document.getElementById('videoToggle');
	const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
	let videoManuallyControlled = false;

	function updateVideoControl() {
		const isPlaying = !backgroundVideo.paused;
		videoToggle.setAttribute('aria-pressed', String(isPlaying));
		videoToggle.textContent = `${isPlaying ? 'Pause' : 'Play'} background video`;
	}

	function startBackgroundVideo() {
		if (!videoManuallyControlled && !reducedMotion.matches) {
			backgroundVideo.play().catch(() => updateVideoControl());
		}
	}

	backgroundVideo.addEventListener('play', updateVideoControl);
	backgroundVideo.addEventListener('pause', updateVideoControl);
	videoToggle.addEventListener('click', () => {
		videoManuallyControlled = true;
		if (backgroundVideo.paused) {
			backgroundVideo.play().catch(() => updateVideoControl());
		} else {
			backgroundVideo.pause();
		}
	});
	reducedMotion.addEventListener('change', event => {
		if (event.matches) backgroundVideo.pause();
	});
	updateVideoControl();

	// The video only shows through the banner, contact form and footer; the solid sections in between
	// (Benefits to Locations) cover it, so the pause button tucks away under them too.
	// Watches a band along the bottom of the screen, where the button sits.
	if (typeof window.IntersectionObserver === 'function') {
		const videoVisibleSections = new Set();
		const videoSectionObserver = new window.IntersectionObserver(entries => {
			entries.forEach(entry => {
				if (entry.isIntersecting) videoVisibleSections.add(entry.target);
				else videoVisibleSections.delete(entry.target);
			});
			videoToggle.classList.toggle('is-covered', videoVisibleSections.size === 0);
		}, { rootMargin: '-90% 0px 0px 0px' });

		['banner', 'contact', 'footer'].forEach(id => {
			const section = document.getElementById(id);
			if (section) videoSectionObserver.observe(section);
		});
	}

	if (document.readyState === 'complete') {
		startBackgroundVideo();
	} else {
		window.addEventListener('load', startBackgroundVideo, { once: true });
	}

	// Header.
	if ($banner.length > 0
		&& $header.hasClass('alt')) {

		$window.on('resize', function () { $window.trigger('scroll'); });

		$banner.scrollex({
			bottom: $header.outerHeight() + 1,
			terminate: function () { $header.removeClass('alt'); },
			enter: function () { $header.addClass('alt'); },
			leave: function () { $header.removeClass('alt'); }
		});

	}

	if (!reducedMotion.matches && typeof window.IntersectionObserver === 'function') {
		document.body.classList.add('motion-ready');

		const animationObserver = new window.IntersectionObserver(entries => {
			entries.forEach(entry => {
				if (!entry.isIntersecting) return;
				entry.target.classList.add('show');
				entry.target.shownAt = performance.now();
				animationObserver.unobserve(entry.target);
			});
		}, {
			rootMargin: '0px 0px -5% 0px',
			threshold: 0.1
		});

		document.querySelectorAll('.scroll-animation, .scroll-animation2')
			.forEach(element => animationObserver.observe(element));

		// Map sign cards post as each one scrolls into view; cards arriving together go top to bottom,
		// and none lands before the map itself has started wiping in.
		const locationsInner = document.querySelector('#locations .inner');
		const signObserver = new window.IntersectionObserver(entries => {
			const arriving = entries
				.filter(entry => entry.isIntersecting)
				.map(entry => entry.target)
				.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
			const mapStart = locationsInner && locationsInner.shownAt ? locationsInner.shownAt : performance.now();
			const wait = Math.max(0, mapStart + 380 - performance.now());

			arriving.forEach((card, index) => {
				card.style.setProperty('--sign-delay', Math.round(wait + index * 90) + 'ms');
				card.classList.add('show');
				signObserver.unobserve(card);
			});
		}, {
			rootMargin: '0px 0px -5% 0px',
			threshold: 0.5
		});

		document.querySelectorAll('#all_clinics .map-card')
			.forEach(card => signObserver.observe(card));

		// Banner headline is written on word by word, at a pace set by each word's length.
		const headline = document.getElementById('cursive');
		const bodyStyle = document.body.style;
		if (headline && ('maskImage' in bodyStyle || 'webkitMaskImage' in bodyStyle)) {
			const words = headline.textContent.trim().split(/\s+/);
			let delay = 250;
			headline.textContent = '';
			words.forEach((word, index) => {
				const span = document.createElement('span');
				const duration = Math.max(260, word.length * 60);
				span.className = 'ink-word';
				span.textContent = word;
				span.style.setProperty('--ink-delay', delay + 'ms');
				span.style.setProperty('--ink-duration', duration + 'ms');
				delay += duration + 90;
				headline.append(span, index < words.length - 1 ? ' ' : '');
			});
			headline.classList.add('is-inking');

			// Start once the script font is in, so the pen never draws the fallback font.
			const startWriting = () => headline.classList.add('is-writing');
			const fontReady = document.fonts && document.fonts.load
				? document.fonts.load('1em "Kaushan Script"')
				: Promise.resolve();
			Promise.race([fontReady, new Promise(resolve => setTimeout(resolve, 1500))])
				.then(startWriting, startWriting);
		}
	}

	const section = document.querySelector('.icons');
	const targetDiv = document.querySelector('.call_icon');

	if (typeof window.IntersectionObserver === 'function' && section && targetDiv) {
		const callIconObserver = new window.IntersectionObserver(entries => {
			entries.forEach(entry => {
				targetDiv.classList.toggle('new-style', !entry.isIntersecting);
			});
		}, { threshold: 0 });

		callIconObserver.observe(section);
		document.body.classList.add('call-icon-ready');
	}

})(jQuery);


function map_app_s() {
	let mac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent);

	if (mac) {
		window.open("https://maps.apple/p/nSTeIpvbqSNJgK", "_blank");

	} else {
		window.open("https://maps.app.goo.gl/D3Q2JZcLUKgtLsKQ9", "_blank");
	}
}

function map_app_n() {
	let mac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent);

	if (mac) {
		window.open("https://maps.apple/p/7nHguQKYc0epjR");
	} else {
		window.open("https://maps.app.goo.gl/G9aBmzL3eq37EMnQ8");
	}
}

function map_app_sw() {
	var mac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent);

	if (mac) {
		window.open("https://maps.apple/p/DxPjU2N6.2d8Wo");
	} else {
		window.open("https://maps.app.goo.gl/wjw3EtWsciHZsm399");
	}
}

function map_app_nw() {
	var mac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent);

	if (mac) {
		window.open("https://maps.apple/p/8yI1gHWm7iQc-5");
	} else {
		window.open("https://maps.app.goo.gl/94Akz2Yy9GhwGEsA9");
	}
}

function map_app_ne() {
	var mac = /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent);

	if (mac) {
		window.open("https://maps.apple/p/m~nFIPbuPHRanv");
	} else {
		window.open("https://maps.app.goo.gl/brZD69tbB4n6aXeG7");
	}
}
