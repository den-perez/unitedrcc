(() => {
	const triggers = Array.from(document.querySelectorAll(".clinic-gallery-trigger"));
	if (!triggers.length || typeof HTMLDialogElement === "undefined") return;

	const dialog = document.createElement("dialog");
	dialog.className = "clinic-lightbox";
	dialog.setAttribute("aria-label", "Clinic photo slideshow");

	const layout = document.createElement("div");
	layout.className = "clinic-lightbox-layout";

	const closeButton = document.createElement("button");
	closeButton.className = "clinic-lightbox-close";
	closeButton.type = "button";
	closeButton.setAttribute("aria-label", "Close slideshow");
	closeButton.textContent = "×";

	const previousButton = document.createElement("button");
	previousButton.className = "clinic-lightbox-previous";
	previousButton.type = "button";
	previousButton.setAttribute("aria-label", "Previous photo");
	previousButton.textContent = "‹";

	const nextButton = document.createElement("button");
	nextButton.className = "clinic-lightbox-next";
	nextButton.type = "button";
	nextButton.setAttribute("aria-label", "Next photo");
	nextButton.textContent = "›";

	const imageWrap = document.createElement("div");
	imageWrap.className = "clinic-lightbox-image-wrap";

	let image = document.createElement("img");
	image.className = "clinic-lightbox-image";
	image.alt = "";
	imageWrap.append(image);

	let incomingImage = document.createElement("img");
	incomingImage.className = "clinic-lightbox-image clinic-lightbox-image-next";
	incomingImage.alt = "";
	incomingImage.setAttribute("aria-hidden", "true");
	imageWrap.append(incomingImage);

	const caption = document.createElement("p");
	caption.className = "clinic-lightbox-caption";

	const captionText = document.createElement("span");
	const count = document.createElement("span");
	count.className = "clinic-lightbox-count";
	count.setAttribute("aria-live", "polite");
	caption.append(captionText, count);

	layout.append(closeButton, previousButton, imageWrap, nextButton, caption);
	dialog.append(layout);
	document.body.append(dialog);

	let activeIndex = 0;
	let activeTrigger = null;
	let swipeStart = null;
	let photoRequest = 0;

	const promoteIncomingImage = () => {
		const previousImage = image;
		image = incomingImage;
		incomingImage = previousImage;

		image.classList.remove("clinic-lightbox-image-next", "is-visible");
		image.removeAttribute("aria-hidden");
		incomingImage.classList.remove("is-fading-out");
		incomingImage.classList.add("clinic-lightbox-image-next");
		incomingImage.alt = "";
		incomingImage.setAttribute("aria-hidden", "true");
		incomingImage.removeAttribute("src");
	};

	const showPhoto = (index) => {
		activeIndex = (index + triggers.length) % triggers.length;
		const trigger = triggers[activeIndex];
		const thumbnail = trigger.querySelector("img");
		const figure = trigger.closest("figure");
		// Thumbnails are the small version; load the full photo only on large screens.
		const source = window.innerWidth > 500 && thumbnail.dataset.full
			? new URL(thumbnail.dataset.full, document.baseURI).href
			: thumbnail.currentSrc || thumbnail.src;
		const request = ++photoRequest;

		image.classList.remove("is-fading-out");
		incomingImage.classList.remove("is-visible");
		incomingImage.removeAttribute("src");
		incomingImage.alt = "";
		captionText.textContent = figure.querySelector("figcaption")?.textContent.trim() || thumbnail.alt;
		count.textContent = `${activeIndex + 1} of ${triggers.length}`;
		previousButton.disabled = triggers.length < 2;
		nextButton.disabled = triggers.length < 2;

		if (!image.src || image.src === source) {
			image.src = source;
			image.alt = thumbnail.alt;
			return;
		}

		const preload = new Image();
		let loaded = false;
		const showIncomingImage = () => {
			if (loaded || request !== photoRequest) return;
			loaded = true;
			incomingImage.src = source;
			incomingImage.alt = thumbnail.alt;

			if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
				incomingImage.classList.add("is-visible");
				promoteIncomingImage();
				return;
			}

			requestAnimationFrame(() => {
				if (request !== photoRequest) return;
				incomingImage.classList.add("is-visible");
				image.classList.add("is-fading-out");
			});
		};

		preload.onload = showIncomingImage;
		preload.onerror = () => {
			if (request === photoRequest) {
				console.error("Unable to load clinic gallery photo:", source);
			}
		};
		preload.src = source;
		if (preload.complete && preload.naturalWidth > 0) showIncomingImage();
	};

	imageWrap.addEventListener("transitionend", (event) => {
		if (event.target !== incomingImage
			|| event.propertyName !== "opacity"
			|| !incomingImage.classList.contains("is-visible")) return;
		promoteIncomingImage();
	});

	triggers.forEach((trigger, index) => {
		trigger.addEventListener("click", () => {
			activeTrigger = trigger;
			showPhoto(index);
			dialog.showModal();
			closeButton.focus();
		});
	});

	closeButton.addEventListener("click", () => dialog.close());
	previousButton.addEventListener("click", () => showPhoto(activeIndex - 1));
	nextButton.addEventListener("click", () => showPhoto(activeIndex + 1));

	imageWrap.addEventListener("pointerdown", (event) => {
		if (event.pointerType !== "touch" || triggers.length < 2) return;
		swipeStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
	});

	imageWrap.addEventListener("pointerup", (event) => {
		if (!swipeStart || event.pointerId !== swipeStart.pointerId) return;

		const deltaX = event.clientX - swipeStart.x;
		const deltaY = event.clientY - swipeStart.y;
		swipeStart = null;

		if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
		showPhoto(activeIndex + (deltaX < 0 ? 1 : -1));
	});

	imageWrap.addEventListener("pointercancel", () => {
		swipeStart = null;
	});

	dialog.addEventListener("click", (event) => {
		if (event.target === dialog) dialog.close();
	});

	dialog.addEventListener("keydown", (event) => {
		if (event.key === "ArrowLeft" && triggers.length > 1) {
			event.preventDefault();
			showPhoto(activeIndex - 1);
		} else if (event.key === "ArrowRight" && triggers.length > 1) {
			event.preventDefault();
			showPhoto(activeIndex + 1);
		}
	});

	dialog.addEventListener("close", () => {
		activeTrigger?.focus();
		activeTrigger = null;
	});
})();
