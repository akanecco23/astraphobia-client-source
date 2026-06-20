(function() {
	//#region extension/src/utils.js
	function generateRandomString(stringLength) {
		let resultString = "";
		for (let index = 0; index < stringLength; index++) {
			const randomCodePoint = Math.floor(Math.random() * 1048575 + 65536);
			resultString += String.fromCodePoint(randomCodePoint);
		}
		return resultString;
	}
	const getAllPropertyNames = (targetObject) => {
		return [...Object.getOwnPropertyNames(Object.getPrototypeOf(targetObject)), ...Object.getOwnPropertyNames(targetObject)];
	};
	function isValidEntity(entity) {
		if (!entity) return false;
		if (entity.type === 1) return true;
		if (entity.playerRoomId != null) return true;
		if (entity.entityName != null && entity.entityName.length > 0) return true;
		if (entity.visibleFishLevel != null && entity.visibleFishLevel > 0) return true;
		return false;
	}
	//#endregion
	//#region extension/src/storage.js
	function addTrackToPlaylist(trackUrl, trackName) {
		if (!trackUrl) return;
		trackName = trackName || trackUrl.split("/").pop().split("?")[0] || "Track " + (musicPlaylist.length + 1);
		musicPlaylist.push({
			url: trackUrl,
			name: trackName
		});
		localStorage.setItem("musicPlaylist", JSON.stringify(musicPlaylist));
		updateMusicPanel();
		showNotification("Added: " + trackName);
	}
	function removeTrackFromPlaylist(indexToRemove) {
		musicPlaylist.splice(indexToRemove, 1);
		if (state.currentTrackIndex >= musicPlaylist.length) state.currentTrackIndex = 0;
		localStorage.setItem("musicPlaylist", JSON.stringify(musicPlaylist));
		if (!musicPlaylist.length) resetPlayback();
		updateMusicPanel();
	}
	//#endregion
	//#region extension/src/ui/audio.js
	let audioPlayer = null;
	let musicPlaylist = JSON.parse(localStorage.getItem("musicPlaylist") || "[]");
	let youtubePlayer = null;
	let isYtApiLoaded = false;
	let isAutofillInitialized = false;
	let audioSourceType = null;
	function isYoutubeUrl(url) {
		return /(?:youtube\.com|youtu\.be)/i.test(url || "");
	}
	function getYoutubeVideoId(url) {
		if (!url) return null;
		try {
			const parsedUrl = new URL(url);
			if (parsedUrl.hostname.includes("youtu.be")) return parsedUrl.pathname.slice(1).split("/")[0] || null;
			if (parsedUrl.hostname.includes("youtube.com")) return parsedUrl.searchParams.get("v") || (parsedUrl.pathname.startsWith("/embed/") ? parsedUrl.pathname.split("/embed/")[1]?.split("/")[0] : null) || (parsedUrl.pathname.startsWith("/shorts/") ? parsedUrl.pathname.split("/shorts/")[1]?.split("/")[0] : null);
		} catch (error) {}
		return null;
	}
	function ensureYoutubeApiReady(callback) {
		if (isYtApiLoaded && window.YT && window.YT.Player) {
			callback();
			return;
		}
		if (!window._astYtReadyCallbacks) window._astYtReadyCallbacks = [];
		window._astYtReadyCallbacks.push(callback);
		if (isAutofillInitialized) return;
		isAutofillInitialized = true;
		if (!document.getElementById("ast-yt-api")) {
			const scriptElement = document.createElement("script");
			scriptElement.id = "ast-yt-api";
			scriptElement.src = "https://www.youtube.com/iframe_api";
			document.head.appendChild(scriptElement);
		}
		const originalReadyHandler = window.onYouTubeIframeAPIReady;
		window.onYouTubeIframeAPIReady = function() {
			isYtApiLoaded = true;
			if (typeof originalReadyHandler === "function") try {
				originalReadyHandler();
			} catch (uninitializedVar1) {}
			const readyCallbacks = window._astYtReadyCallbacks || [];
			while (readyCallbacks.length) {
				const currentCallback = readyCallbacks.shift();
				try {
					currentCallback();
				} catch (uninitializedVar2) {}
			}
		};
	}
	function getYoutubeHostElement() {
		let hostElement = document.getElementById("ast-youtube-host");
		if (!hostElement) {
			hostElement = document.createElement("div");
			hostElement.id = "ast-youtube-host";
			hostElement.style.cssText = "position:fixed;left:-99999px;top:-99999px;width:1px;height:1px;opacity:0;pointer-events:none;";
			document.body.appendChild(hostElement);
		}
		return hostElement;
	}
	function playYoutubeVideo(videoId) {
		ensureYoutubeApiReady(() => {
			const playerContainerId = getYoutubeHostElement();
			if (youtubePlayer && typeof youtubePlayer.loadVideoById === "function") {
				youtubePlayer.loadVideoById(videoId);
				try {
					youtubePlayer.setVolume(Math.round(uiaudioState.musicVolume * 100));
				} catch (playerInstance) {}
				audioSourceType = "youtube";
				updateMusicPanel();
				return;
			}
			youtubePlayer = new YT.Player(playerContainerId, {
				width: "1",
				height: "1",
				videoId,
				playerVars: {
					autoplay: 1,
					controls: 0,
					disablekb: 1,
					fs: 0,
					modestbranding: 1,
					rel: 0
				},
				events: {
					onReady: (audioPlayerEvent) => {
						try {
							audioPlayerEvent.target.setVolume(Math.round(uiaudioState.musicVolume * 100));
							audioPlayerEvent.target.playVideo();
						} catch (unusedVariable) {}
						audioSourceType = "youtube";
						updateMusicPanel();
					},
					onStateChange: (youtubePlayerEvent) => {
						if (!window.YT) return;
						if (youtubePlayerEvent.data === YT.PlayerState.ENDED) if (uiaudioState.isMusicShuffleEnabled) playTrack(Math.floor(Math.random() * musicPlaylist.length));
						else if (uiaudioState.isMusicLoopEnabled) playTrack(state.currentTrackIndex + 1);
						else updateMusicPanel();
						if (youtubePlayerEvent.data === YT.PlayerState.PLAYING || youtubePlayerEvent.data === YT.PlayerState.PAUSED) updateMusicPanel();
					}
				}
			});
		});
	}
	function stopAllPlayback() {
		if (audioPlayer) {
			try {
				audioPlayer.pause();
				audioPlayer.src = "";
			} catch (audioError) {}
			audioPlayer = null;
		}
		if (youtubePlayer) try {
			youtubePlayer.stopVideo();
		} catch (youtubeStopError) {}
		audioSourceType = null;
	}
	function playTrack(trackIndex) {
		if (!musicPlaylist.length) {
			showNotification("No tracks added");
			return;
		}
		if (trackIndex < 0) trackIndex = musicPlaylist.length - 1;
		if (trackIndex >= musicPlaylist.length) trackIndex = 0;
		state.currentTrackIndex = trackIndex;
		const currentTrack = musicPlaylist[state.currentTrackIndex];
		if (!currentTrack || !currentTrack.url) return;
		stopAllPlayback();
		if (isYoutubeUrl(currentTrack.url)) {
			const youtubeVideoId = getYoutubeVideoId(currentTrack.url);
			if (!youtubeVideoId) {
				showNotification("Invalid YouTube link");
				return;
			}
			playYoutubeVideo(youtubeVideoId);
			audioSourceType = "youtube";
			updateMusicPanel();
			return;
		}
		audioPlayer = new Audio(currentTrack.url);
		audioPlayer.volume = uiaudioState.musicVolume;
		audioPlayer.loop = false;
		audioSourceType = "audio";
		audioPlayer.play().catch(() => {
			showNotification("Cannot play audio URL");
		});
		audioPlayer.onended = () => {
			if (uiaudioState.isMusicShuffleEnabled) playTrack(Math.floor(Math.random() * musicPlaylist.length));
			else if (uiaudioState.isMusicLoopEnabled) playTrack(state.currentTrackIndex + 1);
			else updateMusicPanel();
		};
		audioPlayer.onplay = updateMusicPanel;
		audioPlayer.onpause = updateMusicPanel;
		updateMusicPanel();
	}
	function pausePlayback() {
		if (audioSourceType === "audio" && audioPlayer) audioPlayer.pause();
		else if (audioSourceType === "youtube" && youtubePlayer) try {
			youtubePlayer.pauseVideo();
		} catch (youtubePauseError) {}
		updateMusicPanel();
	}
	function resumePlayback() {
		if (audioSourceType === "audio" && audioPlayer) audioPlayer.play().catch(() => {});
		else if (audioSourceType === "youtube" && youtubePlayer) try {
			youtubePlayer.playVideo();
		} catch (youtubePlayError) {}
		else if (musicPlaylist.length) playTrack(state.currentTrackIndex);
		updateMusicPanel();
	}
	function resetPlayback() {
		if (audioSourceType === "audio" && audioPlayer) {
			audioPlayer.pause();
			audioPlayer.currentTime = 0;
		} else if (audioSourceType === "youtube" && youtubePlayer) try {
			youtubePlayer.stopVideo();
		} catch (youtubeResetError) {}
		audioSourceType = null;
		updateMusicPanel();
	}
	function isPlaying() {
		if (audioSourceType === "audio" && audioPlayer) return !audioPlayer.paused;
		if (audioSourceType === "youtube" && youtubePlayer && window.YT) try {
			return youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING;
		} catch (error) {}
		return false;
	}
	function playNextOrRandom() {
		if (!musicPlaylist.length) return;
		playTrack(uiaudioState.isMusicShuffleEnabled ? Math.floor(Math.random() * musicPlaylist.length) : state.currentTrackIndex + 1);
	}
	function playPrevious() {
		if (!musicPlaylist.length) return;
		playTrack(state.currentTrackIndex - 1);
	}
	function updateMusicPanel() {
		const musicPanel = document.getElementById("music-panel");
		if (!musicPanel) return;
		const isCurrentlyPlaying = isPlaying();
		const playButton = musicPanel.querySelector("#musicPlayBtn");
		const trackNameDisplay = musicPanel.querySelector("#musicTrackName");
		const trackListContainer = musicPanel.querySelector("#musicTrackList");
		const loopButton = musicPanel.querySelector("#musicLoopBtn");
		const shuffleButton = musicPanel.querySelector("#musicShuffleBtn");
		if (playButton) playButton.textContent = isCurrentlyPlaying ? "Pause" : "Play";
		if (loopButton) loopButton.classList.toggle("toggle-on", uiaudioState.isMusicLoopEnabled);
		if (shuffleButton) shuffleButton.classList.toggle("toggle-on", uiaudioState.isMusicShuffleEnabled);
		if (trackNameDisplay) trackNameDisplay.textContent = musicPlaylist.length ? musicPlaylist[state.currentTrackIndex]?.name || "Track " + (state.currentTrackIndex + 1) : "No tracks";
		if (trackListContainer) {
			trackListContainer.innerHTML = "";
			musicPlaylist.forEach((event, targetElement) => {
				const containerDiv = document.createElement("div");
				containerDiv.style.cssText = "display:flex;gap:4px;margin-bottom:3px;align-items:center;";
				containerDiv.innerHTML = "\n          <button class=\"ast-btn" + (targetElement === state.currentTrackIndex && (audioPlayer || youtubePlayer) ? " toggle-on" : "") + "\" style=\"flex:1;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;\" title=\"" + event.name + "\">" + event.name.substring(0, 22) + "</button>\n          <button class=\"ast-btn\" style=\"width:28px;margin:0;text-align:center;padding:6px 4px;color:#f44336;flex-shrink:0;\">X</button>";
				containerDiv.querySelectorAll("button")[0].onclick = () => playTrack(targetElement);
				containerDiv.querySelectorAll("button")[1].onclick = () => removeTrackFromPlaylist(targetElement);
				trackListContainer.appendChild(containerDiv);
			});
			if (!musicPlaylist.length) trackListContainer.innerHTML = "<div style=\"font-size:11px;color:#555;text-align:center;padding:6px 0;\">No tracks yet</div>";
		}
	}
	const uiaudioState = {
		isMuted: false,
		musicVolume: parseFloat(localStorage.getItem("musicVolume") || "0.5"),
		isMusicLoopEnabled: localStorage.getItem("musicLoop") !== "false",
		isMusicShuffleEnabled: localStorage.getItem("musicShuffle") === "true"
	};
	//#endregion
	//#region extension/src/ui/interaction.js
	function simulateTextInput(selector, textToType) {
		const inputElement = document.querySelector(selector);
		if (!inputElement) return false;
		inputElement.focus();
		inputElement.value = "";
		let currentIndex = 0;
		const typeNextCharacter = () => {
			if (currentIndex >= textToType.length) {
				inputElement.dispatchEvent(new Event("change", { bubbles: true }));
				inputElement.dispatchEvent(new Event("input", { bubbles: true }));
				return;
			}
			inputElement.value += textToType[currentIndex];
			inputElement.dispatchEvent(new InputEvent("input", { bubbles: true }));
			currentIndex++;
			setTimeout(typeNextCharacter, 25);
		};
		typeNextCharacter();
		return true;
	}
	let currentValue = "";
	function showNotification(message) {
		const notificationTime = Date.now();
		if (message === currentValue && notificationTime - state.currentTime < 3e3) return;
		currentValue = message;
		state.currentTime = notificationTime;
		const notificationElement = document.createElement("div");
		notificationElement.style.cssText = "\n      position: fixed; top: 16px; right: 16px;\n      background: var(--notif-bg, #282828); color: var(--notif-text, #e0e0e0);\n      padding: 10px 16px; border-radius: 4px;\n      z-index: 10000000; font-size: 13px;\n      opacity: 0; transition: opacity 0.2s ease, transform 0.2s ease;\n      pointer-events: none; font-family: 'Segoe UI', system-ui, sans-serif;\n      border-left: 3px solid var(--notif-border, var(--acc, #888));\n      transform: translateX(20px);\n    ";
		notificationElement.textContent = message;
		document.body.appendChild(notificationElement);
		requestAnimationFrame(() => {
			notificationElement.style.opacity = "1";
			notificationElement.style.transform = "translateX(0)";
		});
		setTimeout(() => {
			notificationElement.style.opacity = "0";
			notificationElement.style.transform = "translateX(20px)";
			setTimeout(() => notificationElement.remove(), 200);
		}, 2500);
	}
	function initAutofillName() {
		if (uiaudioState.isMuted) return;
		let savedName = localStorage.getItem("autofill_name") || "";
		let nameInput = document.querySelector(".name-input input") || document.querySelector(".play-game .el-input__inner");
		function applyAutofill() {
			if (uiaudioState.isMuted) return;
			uiaudioState.isMuted = true;
			nameInput.value = savedName;
			nameInput.dispatchEvent(new Event("input", { bubbles: true }));
			nameInput.addEventListener("input", () => {
				if (savedName !== nameInput.value) {
					savedName = nameInput.value;
					localStorage.setItem("autofill_name", savedName);
				}
			});
		}
		if (nameInput == null) {
			const inputCheckInterval = setInterval(() => {
				nameInput = document.querySelector(".name-input input") || document.querySelector(".play-game .el-input__inner");
				if (nameInput != null) {
					clearInterval(inputCheckInterval);
					applyAutofill();
				}
			}, 200);
		} else applyAutofill();
	}
	function typeChatMessage(messageText) {
		const chatInputElement = document.querySelector(".chat-input input") || document.querySelector("input[placeholder*=\"chat\" i]") || document.querySelector("input[type=\"text\"]");
		if (!chatInputElement) return;
		chatInputElement.focus();
		chatInputElement.value = "";
		let charIndex = 0;
		const typeNextCharacter = () => {
			if (charIndex >= messageText.length) {
				const sendButton = document.querySelector(".chat-input button") || document.querySelector("button[aria-label*=\"send\" i]");
				if (sendButton) sendButton.click();
				else {
					chatInputElement.dispatchEvent(new Event("change", { bubbles: true }));
					chatInputElement.dispatchEvent(new Event("input", { bubbles: true }));
					setTimeout(() => {
						chatInputElement.value = "";
						chatInputElement.blur();
					}, 100);
				}
				return;
			}
			chatInputElement.value += messageText[charIndex];
			chatInputElement.dispatchEvent(new InputEvent("input", { bubbles: true }));
			charIndex++;
			setTimeout(typeNextCharacter, 25);
		};
		typeNextCharacter();
	}
	let isInitialized = false;
	function initializeTextInterceptor() {
		if (isInitialized) return;
		function unescapeString(inputString) {
			if (typeof inputString !== "string") return inputString;
			return inputString.replace(/\\(\\|n|r|t|b|f|v|\d{1,3}|x([\da-fA-F]{2})|u([\da-fA-F]{4})|u\{(0*[\da-fA-F]{1,6})\})/g, (context, octalValue, hexValue1, hexValue2, hexValue3) => {
				switch (octalValue[0]) {
					case "\\": return "\\";
					case "n": return "\n";
					case "r": return "\r";
					case "t": return "	";
					case "b": return "\b";
					case "f": return "\f";
					case "v": return "\v";
					case "0":
					case "1":
					case "2":
					case "3":
					case "4":
					case "5":
					case "6":
					case "7": return String.fromCharCode(Number.parseInt(octalValue, 8) || 0);
					default:
						if (hexValue1 != null) return String.fromCharCode(Number.parseInt(hexValue1, 16) || 0);
						if (hexValue2 != null) return String.fromCharCode(Number.parseInt(hexValue2, 16) || 0);
						if (hexValue3 != null) {
							const codePoint = Number.parseInt(hexValue3, 16) || 0;
							if (codePoint > 1114111) return context;
							else return String.fromCodePoint(codePoint);
						}
						return octalValue;
				}
			});
		}
		const actionCodes = {
			spawn: 22,
			createTribe: 5,
			chat: 100
		};
		const originalEncode = TextEncoder.prototype.encode;
		TextEncoder.prototype.encode = function(...inputData) {
			try {
				const patternList = [
					/^(\x14{3}\d+\|6\|)(.+)$/gm,
					/^(\x14{3}\d+\|8\|)(.+)$/gm,
					/^(\x14{3}\d+\|14\|)(.+)$/gm,
					/^(\x13{3}[01])(.+)$/gm
				];
				for (let patternIndex = 0; patternIndex < patternList.length; patternIndex++) {
					const regexMatch = patternList[patternIndex].exec(inputData[0]);
					if (regexMatch && regexMatch.length === 3) {
						const actionMethod = [
							actionCodes.spawn,
							actionCodes.spawn,
							actionCodes.createTribe,
							actionCodes.chat
						][patternIndex];
						inputData[0] = regexMatch[1] + unescapeString(regexMatch[2]).substr(0, actionMethod);
						break;
					}
				}
			} catch {}
			return Reflect.apply(originalEncode, this, inputData);
		};
		new MutationObserver(() => {
			document.querySelector(".play-game .el-input__inner")?.setAttribute("maxlength", "80");
			document.querySelector(".new-tribe .el-input__inner")?.setAttribute("maxlength", "20");
			document.querySelector(".chat-input input")?.setAttribute("maxLength", "1000");
		}).observe(document.body, {
			childList: true,
			subtree: true
		});
		isInitialized = true;
		showNotification("Special characters enabled");
	}
	function simulateClick(clientX, clientY) {
		const targetElement = getGameCanvas();
		if (!targetElement) return;
		targetElement.dispatchEvent(new PointerEvent("pointerdown", {
			clientX,
			clientY,
			button: 0,
			buttons: 1,
			bubbles: true,
			view: window
		}));
		setTimeout(() => {
			targetElement.dispatchEvent(new PointerEvent("pointerup", {
				clientX,
				clientY,
				buttons: 0,
				bubbles: true,
				view: window
			}));
		}, 80);
	}
	function showHalloweenCodeModal(onUnlockCallback) {
		const modalOverlay = document.createElement("div");
		modalOverlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);z-index:100001;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity 0.3s ease;";
		modalOverlay.innerHTML = "<div style=\"background:#1a1a1a;padding:32px;border-radius:8px;text-align:center;max-width:400px;width:90%;border:1px solid #333;\">\n      <div style=\"color:#e0e0e0;font-size:18px;font-weight:600;margin-bottom:16px;\">Halloween Access Code</div>\n      <input id=\"hwCodeInput\" type=\"text\" placeholder=\"Enter code...\" style=\"background:#111;border:1px solid #333;color:#e0e0e0;border-radius:4px;padding:10px;font-size:14px;text-align:center;width:100%;box-sizing:border-box;margin-bottom:16px;outline:none;\">\n      <div style=\"display:flex;gap:8px;\">\n        <button id=\"hwCancelBtn\" style=\"flex:1;background:#222;color:#888;border:1px solid #333;border-radius:4px;padding:10px;cursor:pointer;\">Cancel</button>\n        <button id=\"hwSubmitBtn\" style=\"flex:1;background:#ff6600;color:#fff;border:none;border-radius:4px;padding:10px;cursor:pointer;font-weight:600;\">Redeem</button>\n      </div></div>";
		document.body.appendChild(modalOverlay);
		setTimeout(() => {
			modalOverlay.style.opacity = "1";
		}, 10);
		const codeInput = modalOverlay.querySelector("#hwCodeInput");
		const closeModal = () => {
			modalOverlay.style.opacity = "0";
			setTimeout(() => modalOverlay.remove(), 300);
		};
		modalOverlay.querySelector("#hwSubmitBtn").onclick = () => {
			const inputValue = codeInput.value.trim();
			if (inputValue === "HappyHalloween9" || inputValue === "TrickOrTreat9") {
				localStorage.setItem("halloweenUnlocked", "true");
				showNotification("Halloween theme unlocked");
				closeModal();
				onUnlockCallback(true);
			} else {
				codeInput.style.borderColor = "#ff0000";
				setTimeout(() => {
					codeInput.style.borderColor = "#333";
				}, 500);
				showNotification("Invalid code");
			}
		};
		modalOverlay.querySelector("#hwCancelBtn").onclick = () => {
			closeModal();
			onUnlockCallback(false);
		};
		codeInput.addEventListener("keypress", (event) => {
			if (event.key === "Enter") modalOverlay.querySelector("#hwSubmitBtn").click();
		});
		codeInput.focus();
	}
	function makeElementDraggable(draggableElement) {
		let offsetX;
		let offsetY;
		let isDragging = false;
		let hasMoved = false;
		draggableElement.addEventListener("mousedown", (event) => {
			if ([
				"BUTTON",
				"INPUT",
				"TEXTAREA",
				"SELECT",
				"A",
				"LABEL"
			].includes(event.target.tagName)) return;
			if (event.target.closest("button,input,textarea,select,label")) return;
			isDragging = true;
			hasMoved = false;
			offsetX = event.clientX - draggableElement.getBoundingClientRect().left;
			offsetY = event.clientY - draggableElement.getBoundingClientRect().top;
			draggableElement.style.transition = "none";
			const handleMouseMove = (currentMouseEvent) => {
				if (!hasMoved && (Math.abs(currentMouseEvent.clientX - event.clientX) > 5 || Math.abs(currentMouseEvent.clientY - event.clientY) > 5)) hasMoved = true;
				if (isDragging) {
					draggableElement.style.left = currentMouseEvent.clientX - offsetX + "px";
					draggableElement.style.top = currentMouseEvent.clientY - offsetY + "px";
					draggableElement.style.bottom = "auto";
					draggableElement.style.right = "auto";
				}
			};
			const handleMouseUp = () => {
				isDragging = false;
				draggableElement.style.transition = "";
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
			};
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
		});
		draggableElement.addEventListener("click", (clickEvent) => {
			if (hasMoved) clickEvent.stopImmediatePropagation();
		});
	}
	//#endregion
	//#region extension/src/features/aimbot.js
	window.lockEnabled = false;
	window.lockTargetId = null;
	window.autoDodgeEnabled = false;
	function updateLockLoop() {
		if (!isProcessed) return;
		requestAnimationFrame(updateLockLoop);
		if (!window.lockEnabled || !window.lockTargetId) return;
		try {
			const targetEntity = findEntityById(window.lockTargetId);
			if (!targetEntity) {
				showNotification("Lock target lost");
				window.lockTargetId = null;
				window.lockEnabled = false;
				updateLockButtonUI();
				return;
			}
			const targetPos = extractPosition(targetEntity);
			const currentPos = getAnimalPosition();
			if (!targetPos || !currentPos) return;
			const canvas = getGameCanvas();
			if (!canvas) return;
			const rect = canvas.getBoundingClientRect();
			const centerX = rect.left + rect.width / 2;
			const centerY = rect.top + rect.height / 2;
			const relX = targetPos.x - currentPos.x;
			const relY = targetPos.y - currentPos.y;
			const distToTarget = Math.sqrt(relX * relX + relY * relY);
			let predictedX = targetPos.x;
			let predictedY = targetPos.y;
			if (targetEntity.velocity) {
				const velX = targetEntity.velocity._x || targetEntity.velocity.x || 0;
				const velY = targetEntity.velocity._y || targetEntity.velocity.y || 0;
				const predictionFactor = Math.min(distToTarget / 800, .5);
				predictedX += velX * predictionFactor;
				predictedY += velY * predictionFactor;
			}
			const finalRelX = predictedX - currentPos.x;
			const finalRelY = predictedY - currentPos.y;
			const finalDist = Math.sqrt(finalRelX * finalRelX + finalRelY * finalRelY);
			let multiplier = 1.5;
			if (finalDist > 2e3) multiplier = 3;
			else if (finalDist > 1e3) multiplier = 2;
			else if (finalDist < 200) multiplier = .8;
			const maxOffset = Math.min(rect.width, rect.height) * .85;
			let scaledX = finalRelX * multiplier;
			let scaledY = finalRelY * multiplier;
			const scaledDist = Math.sqrt(scaledX * scaledX + scaledY * scaledY);
			if (scaledDist > maxOffset) {
				const scaleFactor = maxOffset / scaledDist;
				scaledX *= scaleFactor;
				scaledY *= scaleFactor;
			}
			canvas.dispatchEvent(new MouseEvent("pointermove", {
				clientX: centerX + scaledX,
				clientY: centerY + scaledY,
				bubbles: true,
				view: window
			}));
		} catch (context) {}
	}
	function toggleLock() {
		if (window.lockEnabled && window.lockTargetId) {
			window.lockEnabled = false;
			window.lockTargetId = null;
			showNotification("Lock released");
		} else {
			const currentState = buildEntityState();
			if (currentState && currentState.players && currentState.players.length > 0) {
				window.lockEnabled = true;
				window.lockTargetId = currentState.players[0].id;
				showNotification("Locked: " + (currentState.players[0].entity?.name || "ID:" + window.lockTargetId));
			} else showNotification("No players to lock on");
		}
		updateLockButtonUI();
	}
	function trackNearestPlayer() {
		const gameData = buildEntityState();
		if (gameData && gameData.players && gameData.players.length > 0) {
			window.espTrackedEntityId = gameData.players[0].id;
			showNotification("Tracking: " + (gameData.players[0].entity?.name || window.espTrackedEntityId));
		} else showNotification("No players nearby");
	}
	function clearTracking() {
		window.espTrackedEntityId = null;
		showNotification("Tracking cleared");
	}
	const maxDistance = 600;
	const maxDistanceThreshold = 800;
	let lastPositionTimestamp = 0;
	let currentCoordinates = null;
	let iterationCounter = 0;
	let previousPositionTimestamp = 0;
	let dataBuffer = [];
	function autoDodgeLoop() {
		if (!state.isTextInterceptorInitialized) return;
		setTimeout(autoDodgeLoop, 80);
		if (!window.autoDodgeEnabled) return;
		try {
			const currentPos = getAnimalPosition();
			if (!currentPos) return;
			const gameState = getGameState();
			const worldData = getEntityManager(gameState);
			const myAnimal = gameState?.myAnimals?.[0];
			if (!worldData || !myAnimal) return;
			let nearbyEntities = [];
			(worldData.entitiesList || []).forEach((targetEntity) => {
				if (!targetEntity || targetEntity.id === myAnimal.id || !isValidEntity(targetEntity)) return;
				const targetX = targetEntity.position?._x !== void 0 ? targetEntity.position._x : targetEntity.position?.x;
				const targetY = targetEntity.position?._y !== void 0 ? targetEntity.position._y : targetEntity.position?.y;
				if (targetX == null || targetY == null) return;
				const distanceToTarget = calculateDistance(currentPos.x, currentPos.y, targetX, targetY);
				if (distanceToTarget < maxDistance) nearbyEntities.push({
					x: targetX,
					y: targetY,
					dist: distanceToTarget
				});
			});
			if (nearbyEntities.length === 0) {
				currentCoordinates = null;
				iterationCounter = 0;
				dataBuffer = [];
				return;
			}
			const now = Date.now();
			let hasMoved = false;
			if (now - previousPositionTimestamp > 600) {
				previousPositionTimestamp = now;
				if (currentCoordinates) if (calculateDistance(currentPos.x, currentPos.y, currentCoordinates.x, currentCoordinates.y) < 20) {
					iterationCounter++;
					hasMoved = true;
				} else {
					iterationCounter = 0;
					dataBuffer = [];
				}
				currentCoordinates = {
					x: currentPos.x,
					y: currentPos.y
				};
			}
			let sumX = 0;
			let sumY = 0;
			nearbyEntities.forEach((sourceEntity) => {
				const deltaX = currentPos.x - sourceEntity.x;
				const deltaY = currentPos.y - sourceEntity.y;
				const magnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
				if (magnitude > .01) {
					const normalizedDistance = (maxDistance - sourceEntity.dist) / maxDistance;
					sumX += deltaX / magnitude * normalizedDistance;
					sumY += deltaY / magnitude * normalizedDistance;
				}
			});
			let magnitude = Math.sqrt(sumX * sumX + sumY * sumY);
			if (magnitude < .01) {
				sumX = 1;
				sumY = 0;
				magnitude = 1;
			}
			sumX /= magnitude;
			sumY /= magnitude;
			let arrowAngle = Math.atan2(sumY, sumX);
			if (hasMoved && iterationCounter >= 1) {
				const anglePresets = [
					Math.PI / 4,
					-Math.PI / 4,
					Math.PI / 2,
					-Math.PI / 2,
					Math.PI * 3 / 4,
					-Math.PI * 3 / 4
				];
				let previousAngle = arrowAngle;
				let maxProjection = -Infinity;
				for (const angleOffset of anglePresets) {
					const rotatedAngle = arrowAngle + angleOffset;
					if (dataBuffer.some((currentAngle) => Math.abs(currentAngle - rotatedAngle) < .3) && iterationCounter < 5) continue;
					let currentProjection = 0;
					nearbyEntities.forEach((positionEntity) => {
						currentProjection -= Math.cos(rotatedAngle) * (positionEntity.x - currentPos.x) + Math.sin(rotatedAngle) * (positionEntity.y - currentPos.y);
					});
					if (currentProjection > maxProjection) {
						maxProjection = currentProjection;
						previousAngle = rotatedAngle;
					}
				}
				arrowAngle = previousAngle;
				dataBuffer.push(arrowAngle);
				if (dataBuffer.length > 8) dataBuffer.shift();
				if (iterationCounter >= 5) {
					arrowAngle += Math.random() > .5 ? Math.PI / 2 : -Math.PI / 2;
					iterationCounter = 0;
					dataBuffer = [];
				}
			}
			const isDistanceExceeded = now - lastPositionTimestamp > maxDistanceThreshold;
			if (isDistanceExceeded) lastPositionTimestamp = now;
			moveAndClickElement(currentPos.x + Math.cos(arrowAngle) * 2e3, currentPos.y + Math.sin(arrowAngle) * 2e3, isDistanceExceeded);
		} catch (dataContainer) {}
	}
	function enableAutoDodge() {
		window.autoDodgeEnabled = true;
		currentCoordinates = null;
		iterationCounter = 0;
		dataBuffer = [];
		if (!state.isTextInterceptorInitialized) {
			state.isTextInterceptorInitialized = true;
			autoDodgeLoop();
		}
		showNotification("Auto dodge enabled");
	}
	function disableAutoDodge() {
		window.autoDodgeEnabled = false;
		showNotification("Auto dodge disabled");
	}
	function findNearestEntity(range) {
		range = range || window.autoFarmRange;
		try {
			const gameState = getGameState();
			const worldData = getEntityManager(gameState);
			const playerAnimal = gameState?.myAnimals?.[0];
			if (!worldData || !playerAnimal) return null;
			const playerX = playerAnimal.position._x !== void 0 ? playerAnimal.position._x : playerAnimal.position.x;
			const playerY = playerAnimal.position._y !== void 0 ? playerAnimal.position._y : playerAnimal.position.y;
			let nearestEntity = null;
			let minDistance = Infinity;
			(worldData.entitiesList || []).forEach((targetEntity) => {
				if (!targetEntity || targetEntity.id === playerAnimal.id || window.autoFarmSkipIds.has(targetEntity.id)) return;
				const posX = targetEntity.position?._x !== void 0 ? targetEntity.position._x : targetEntity.position?.x;
				const posY = targetEntity.position?._y !== void 0 ? targetEntity.position._y : targetEntity.position?.y;
				if (posX == null || posY == null || isValidEntity(targetEntity) || isAreaSkipped(posX, posY)) return;
				const distance = calculateDistance(playerX, playerY, posX, posY);
				if (distance < minDistance && distance < range) {
					minDistance = distance;
					nearestEntity = {
						id: targetEntity.id,
						x: posX,
						y: posY,
						distance,
						entity: targetEntity
					};
				}
			});
			return nearestEntity;
		} catch (error) {
			return null;
		}
	}
	function findEntitiesInRange(searchRange) {
		searchRange = searchRange || window.autoFarmRange;
		try {
			const state = getGameState();
			const world = getEntityManager(state);
			const myAnimal = state?.myAnimals?.[0];
			if (!world || !myAnimal) return [];
			const myX = myAnimal.position._x !== void 0 ? myAnimal.position._x : myAnimal.position.x;
			const myY = myAnimal.position._y !== void 0 ? myAnimal.position._y : myAnimal.position.y;
			const entitiesInRange = [];
			(world.entitiesList || []).forEach((targetEntity) => {
				if (!targetEntity || targetEntity.id === myAnimal.id || window.autoFarmSkipIds.has(targetEntity.id)) return;
				const posX = targetEntity.position?._x !== void 0 ? targetEntity.position._x : targetEntity.position?.x;
				const posY = targetEntity.position?._y !== void 0 ? targetEntity.position._y : targetEntity.position?.y;
				if (posX == null || posY == null || isValidEntity(targetEntity) || isAreaSkipped(posX, posY)) return;
				const distance = calculateDistance(myX, myY, posX, posY);
				if (distance < searchRange) entitiesInRange.push({
					id: targetEntity.id,
					x: posX,
					y: posY,
					distance,
					entity: targetEntity
				});
			});
			return entitiesInRange.sort((entityA, entityB) => entityA.distance - entityB.distance);
		} catch (err) {
			return [];
		}
	}
	function calculateAvoidanceVector() {
		if (!window.autoFarmAvoidPlayers) return {
			x: 0,
			y: 0
		};
		const myPosition = getAnimalPosition();
		if (!myPosition) return {
			x: 0,
			y: 0
		};
		let avoidX = 0;
		let avoidY = 0;
		try {
			const gameState = getGameState();
			const worldData = getEntityManager(gameState);
			const myAnimal = gameState?.myAnimals?.[0];
			if (!worldData || !myAnimal) return {
				x: 0,
				y: 0
			};
			(worldData.entitiesList || []).forEach((targetEntity) => {
				if (!targetEntity || targetEntity.id === myAnimal.id || !isValidEntity(targetEntity)) return;
				const targetX = targetEntity.position?._x !== void 0 ? targetEntity.position._x : targetEntity.position?.x;
				const targetY = targetEntity.position?._y !== void 0 ? targetEntity.position._y : targetEntity.position?.y;
				if (targetX == null || targetY == null) return;
				const distanceToTarget = calculateDistance(myPosition.x, myPosition.y, targetX, targetY);
				if (distanceToTarget < window.autoFarmAvoidDistance) {
					const deltaX = myPosition.x - targetX;
					const deltaY = myPosition.y - targetY;
					const hypotenuse = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
					const avoidanceFactor = (window.autoFarmAvoidDistance - Math.max(distanceToTarget, 50)) / window.autoFarmAvoidDistance;
					if (hypotenuse > 0) {
						avoidX += deltaX / hypotenuse * avoidanceFactor * 500;
						avoidY += deltaY / hypotenuse * avoidanceFactor * 500;
					}
				}
			});
		} catch (error) {}
		return {
			x: avoidX,
			y: avoidY
		};
	}
	//#endregion
	//#region extension/src/features/autofarm.js
	window.autoFarmActive = false;
	window.autoFarmMode = "nearest";
	window.autoFarmRange = 3e3;
	window.autoFarmBoost = true;
	window.autoFarmEvolve = true;
	window.autoFarmAvoidPlayers = true;
	window.autoFarmAvoidDistance = 800;
	window.autoFarmStats = {
		collected: 0,
		startTime: 0
	};
	window.autoFarmPatrolPoints = [];
	window.autoFarmPatrolIndex = 0;
	window.autoFarmCurrentTarget = null;
	window.autoFarmTargetStartTime = 0;
	window.autoFarmSkipIds = /* @__PURE__ */ new Set();
	window.autoFarmSkipClearTime = 0;
	window.autoFarmSkipAreas = [];
	function getGameState() {
		try {
			if (state.animalData && state.animalData.myAnimals && state.animalData.myAnimals.length > 0) return state.animalData;
			const states = window.__ss?.states;
			if (!states) return state.animalData || null;
			for (let stateIndex = 0; stateIndex < states.length; stateIndex++) {
				if (states[stateIndex]?.gameScene?.myAnimals) return states[stateIndex].gameScene;
				if (states[stateIndex]?.gameManager) {
					for (const managerKey of Object.keys(states[stateIndex].gameManager)) if (states[stateIndex].gameManager[managerKey]?.myAnimals) return states[stateIndex].gameManager[managerKey];
				}
			}
			return state.animalData || null;
		} catch (error) {
			return state.animalData || null;
		}
	}
	function findEntityById(entityId) {
		try {
			const gameState = getGameState();
			if (!gameState) return null;
			const worldData = getEntityManager(gameState);
			if (!worldData) return null;
			let entity = worldData.entitiesById ? worldData.entitiesById[entityId] : null;
			if (!entity && worldData.entitiesList) entity = worldData.entitiesList.find((selectedItem) => selectedItem.id === entityId);
			if (!entity && worldData.animalsByPlayerRoomId) for (let roomId of Object.keys(worldData.animalsByPlayerRoomId)) {
				const animals = worldData.animalsByPlayerRoomId[roomId];
				if (Array.isArray(animals)) entity = animals.find((currentItem) => currentItem && currentItem.id === entityId);
				else if (animals && animals.id === entityId) entity = animals;
				if (entity) break;
			}
			return entity;
		} catch (error) {
			return null;
		}
	}
	const proximityLimit = 400;
	const maxFailCount = 2;
	const timeoutDuration = 2e4;
	let lastEventTimestamp = 0;
	const eventIntervalThreshold = 600;
	function markAreaAsFailed(posX, posY) {
		window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter((timestamp) => state.currentTime - timestamp.time < timeoutDuration);
		let existingArea = window.autoFarmSkipAreas.find((position) => calculateDistance(posX, posY, position.x, position.y) < proximityLimit);
		if (existingArea) {
			existingArea.failCount++;
			existingArea.time = state.currentTime;
			if (existingArea.failCount >= maxFailCount) {
				existingArea.skipped = true;
				showNotification("Skipping unreachable food area");
			}
		} else window.autoFarmSkipAreas.push({
			x: posX,
			y: posY,
			radius: proximityLimit,
			time: state.currentTime,
			failCount: 1,
			skipped: false
		});
	}
	function isAreaSkipped(x, y) {
		const now = Date.now();
		window.autoFarmSkipAreas = window.autoFarmSkipAreas.filter((lastUpdateTime) => now - lastUpdateTime.time < timeoutDuration);
		return window.autoFarmSkipAreas.some((skippedElement) => skippedElement.skipped && calculateDistance(x, y, skippedElement.x, skippedElement.y) < skippedElement.radius);
	}
	function findBestFoodCluster(radius, rangeOverride) {
		const foodPoints = findEntitiesInRange(rangeOverride || window.autoFarmRange);
		if (!foodPoints.length) return null;
		let bestCluster = null;
		let maxCount = 0;
		foodPoints.forEach((calculateAveragePosition) => {
			let elementCount = 0;
			let totalX = 0;
			let totalY = 0;
			foodPoints.forEach((targetPosition) => {
				if (calculateDistance(calculateAveragePosition.x, calculateAveragePosition.y, targetPosition.x, targetPosition.y) < (radius || 500)) {
					elementCount++;
					totalX += targetPosition.x;
					totalY += targetPosition.y;
				}
			});
			if (elementCount > maxCount) {
				maxCount = elementCount;
				bestCluster = {
					x: totalX / elementCount,
					y: totalY / elementCount,
					foodCount: elementCount
				};
			}
		});
		return bestCluster;
	}
	let lastUpdateTimestamp = 0;
	function triggerRandomEvolve() {
		if (!window.autoFarmEvolve) return;
		const now = Date.now();
		if (now - lastUpdateTimestamp < 5e3) return;
		lastUpdateTimestamp = now;
		const gameCanvas = getGameCanvas();
		const randomDigit = String(Math.floor(Math.random() * 9) + 1);
		const keyEventData = {
			key: randomDigit,
			code: "Digit" + randomDigit,
			keyCode: randomDigit.charCodeAt(0),
			which: randomDigit.charCodeAt(0),
			bubbles: true,
			cancelable: true
		};
		[
			window,
			document,
			document.body,
			gameCanvas
		].forEach((targetElement) => {
			if (!targetElement) return;
			try {
				targetElement.dispatchEvent(new KeyboardEvent("keydown", keyEventData));
				setTimeout(() => targetElement.dispatchEvent(new KeyboardEvent("keyup", keyEventData)), 50);
			} catch (context) {}
		});
	}
	let isAutoFarmActive = false;
	let currentPosition = null;
	let counter = 0;
	let lastProcessedIndex = 0;
	let randomAngle = 0;
	let pointerMoveOffset = 0;
	function checkStuckCondition(currentPos) {
		if (state.currentTime - lastProcessedIndex < 1500) return false;
		lastProcessedIndex = state.currentTime;
		if (currentPosition) if (calculateDistance(currentPos.x, currentPos.y, currentPosition.x, currentPosition.y) < 25) {
			counter++;
			if (counter >= 1 && window.autoFarmCurrentTarget) {
				markAreaAsFailed(window.autoFarmCurrentTarget.x, window.autoFarmCurrentTarget.y);
				window.autoFarmSkipIds.add(window.autoFarmCurrentTarget.id);
				window.autoFarmCurrentTarget = null;
				window.autoFarmTargetStartTime = 0;
				counter = 0;
			}
			if (counter >= 2) {
				counter = 0;
				window.autoFarmCurrentTarget = null;
				window.autoFarmTargetStartTime = 0;
				const randomAngle = Math.random() * Math.PI * 2;
				moveAndClickElement(currentPos.x + Math.cos(randomAngle) * 1500, currentPos.y + Math.sin(randomAngle) * 1500, true);
				return true;
			}
		} else counter = 0;
		currentPosition = {
			x: currentPos.x,
			y: currentPos.y
		};
		return false;
	}
	function setupPatrolRoute() {
		const centerPos = getAnimalPosition();
		if (!centerPos) return;
		window.autoFarmPatrolPoints = [];
		for (let i = 0; i < 6; i++) {
			const angle = Math.PI * 2 * i / 6;
			window.autoFarmPatrolPoints.push({
				x: centerPos.x + Math.cos(angle) * 2e3,
				y: centerPos.y + Math.sin(angle) * 2e3
			});
		}
		window.autoFarmPatrolIndex = 0;
	}
	function autoFarmLoop() {
		if (!window.autoFarmActive) {
			isAutoFarmActive = false;
			return;
		}
		if (state.currentTime - window.autoFarmSkipClearTime > 15e3) {
			window.autoFarmSkipIds.clear();
			window.autoFarmSkipClearTime = state.currentTime;
		}
		if (window.autoFarmCurrentTarget && window.autoFarmTargetStartTime > 0 && state.currentTime - window.autoFarmTargetStartTime > 1e3) {
			markAreaAsFailed(window.autoFarmCurrentTarget.x, window.autoFarmCurrentTarget.y);
			window.autoFarmSkipIds.add(window.autoFarmCurrentTarget.id);
			window.autoFarmCurrentTarget = null;
			window.autoFarmTargetStartTime = 0;
			setTimeout(autoFarmLoop, 100);
			return;
		}
		try {
			const currentTarget = getAnimalPosition();
			if (!currentTarget) {
				window.autoFarmActive = false;
				isAutoFarmActive = false;
				const autoFarmButton = document.getElementById("autoFarmBtn");
				if (autoFarmButton) {
					autoFarmButton.textContent = "Auto Farm";
					autoFarmButton.classList.remove("toggle-on");
				}
				return;
			}
			if (Math.random() < .015) triggerRandomEvolve();
			if (checkStuckCondition(currentTarget)) {
				setTimeout(autoFarmLoop, 100);
				return;
			}
			const playerOffset = calculateAvoidanceVector();
			if ((Math.abs(playerOffset.x) > 100 || Math.abs(playerOffset.y) > 100) && window.autoFarmAvoidPlayers) {
				const shouldBoost = window.autoFarmBoost && state.currentTime - lastEventTimestamp > eventIntervalThreshold;
				if (shouldBoost) lastEventTimestamp = state.currentTime;
				moveAndClickElement(currentTarget.x + playerOffset.x, currentTarget.y + playerOffset.y, shouldBoost);
				setTimeout(autoFarmLoop, 60);
				return;
			}
			let targetX = null;
			let targetY = null;
			let minDistance = Infinity;
			if (window.autoFarmMode === "nearest") {
				const nearestTarget = findNearestEntity();
				if (nearestTarget) {
					targetX = nearestTarget.x + playerOffset.x * .3;
					targetY = nearestTarget.y + playerOffset.y * .3;
					minDistance = nearestTarget.distance;
					if (!window.autoFarmCurrentTarget || window.autoFarmCurrentTarget.id !== nearestTarget.id) {
						if (window.autoFarmCurrentTarget) window.autoFarmStats.collected++;
						window.autoFarmCurrentTarget = nearestTarget;
						window.autoFarmTargetStartTime = state.currentTime;
						counter = 0;
					}
					if (nearestTarget.distance < 40) {
						targetX += (Math.random() - .5) * 80;
						targetY += (Math.random() - .5) * 80;
					}
				} else {
					window.autoFarmCurrentTarget = null;
					window.autoFarmTargetStartTime = 0;
					if (state.currentTime - pointerMoveOffset > 2500) {
						randomAngle = Math.random() * Math.PI * 2;
						pointerMoveOffset = state.currentTime;
					}
					targetX = currentTarget.x + Math.cos(randomAngle) * 1e3;
					targetY = currentTarget.y + Math.sin(randomAngle) * 1e3;
					minDistance = 1e3;
				}
			} else if (window.autoFarmMode === "cluster") {
				const nearbyFoodSource = findBestFoodCluster(500, window.autoFarmRange);
				if (nearbyFoodSource && nearbyFoodSource.foodCount >= 2) {
					targetX = nearbyFoodSource.x + playerOffset.x * .3;
					targetY = nearbyFoodSource.y + playerOffset.y * .3;
					minDistance = calculateDistance(currentTarget.x, currentTarget.y, nearbyFoodSource.x, nearbyFoodSource.y);
				} else {
					const randomTarget = findNearestEntity();
					if (randomTarget) {
						targetX = randomTarget.x;
						targetY = randomTarget.y;
						minDistance = randomTarget.distance;
						if (!window.autoFarmCurrentTarget || window.autoFarmCurrentTarget.id !== randomTarget.id) {
							window.autoFarmCurrentTarget = randomTarget;
							window.autoFarmTargetStartTime = state.currentTime;
						}
					} else {
						window.autoFarmCurrentTarget = null;
						window.autoFarmTargetStartTime = 0;
						if (state.currentTime - pointerMoveOffset > 2500) {
							randomAngle = Math.random() * Math.PI * 2;
							pointerMoveOffset = state.currentTime;
						}
						targetX = currentTarget.x + Math.cos(randomAngle) * 1e3;
						targetY = currentTarget.y + Math.sin(randomAngle) * 1e3;
						minDistance = 1e3;
					}
				}
			} else if (window.autoFarmMode === "patrol") {
				if (!window.autoFarmPatrolPoints.length) setupPatrolRoute();
				const specificTarget = findNearestEntity(800);
				if (specificTarget) {
					targetX = specificTarget.x;
					targetY = specificTarget.y;
					minDistance = specificTarget.distance;
					if (!window.autoFarmCurrentTarget || window.autoFarmCurrentTarget.id !== specificTarget.id) {
						window.autoFarmCurrentTarget = specificTarget;
						window.autoFarmTargetStartTime = state.currentTime;
					}
				} else {
					window.autoFarmCurrentTarget = null;
					window.autoFarmTargetStartTime = 0;
					const currentPatrolPoint = window.autoFarmPatrolPoints[window.autoFarmPatrolIndex];
					if (currentPatrolPoint) {
						minDistance = calculateDistance(currentTarget.x, currentTarget.y, currentPatrolPoint.x, currentPatrolPoint.y);
						if (minDistance < 200) window.autoFarmPatrolIndex = (window.autoFarmPatrolIndex + 1) % window.autoFarmPatrolPoints.length;
						targetX = currentPatrolPoint.x;
						targetY = currentPatrolPoint.y;
					}
				}
			}
			if (targetX != null) {
				const shouldApplyBoost = window.autoFarmBoost && minDistance > 350 && state.currentTime - lastEventTimestamp > eventIntervalThreshold;
				if (shouldApplyBoost) lastEventTimestamp = state.currentTime;
				moveAndClickElement(targetX, targetY, shouldApplyBoost);
			}
		} catch (errorMessage) {
			console.error("[AutoFarm]", errorMessage);
		}
		setTimeout(autoFarmLoop, 60);
	}
	function startAutoFarm(farmMode) {
		window.autoFarmMode = farmMode || "nearest";
		window.autoFarmActive = true;
		window.autoFarmStats.startTime = Date.now();
		window.autoFarmStats.collected = 0;
		window.autoFarmCurrentTarget = null;
		window.autoFarmTargetStartTime = 0;
		window.autoFarmSkipIds.clear();
		window.autoFarmSkipAreas = [];
		window.autoFarmSkipClearTime = Date.now();
		currentPosition = null;
		counter = 0;
		lastProcessedIndex = 0;
		lastEventTimestamp = 0;
		if (farmMode === "patrol") setupPatrolRoute();
		showNotification("Auto farm started (" + window.autoFarmMode + ")");
		if (!isAutoFarmActive) {
			isAutoFarmActive = true;
			autoFarmLoop();
		}
	}
	function stopAutoFarm() {
		window.autoFarmActive = false;
		isAutoFarmActive = false;
		showNotification("Farm stopped. ~" + window.autoFarmStats.collected + " food in " + ((Date.now() - window.autoFarmStats.startTime) / 1e3).toFixed(0) + "s");
	}
	function toggleMinimapSize() {
		if (!state.animalData || !state.animalData.minimap) {
			showNotification("Minimap not available");
			return;
		}
		if (state.isMinimapSmall) {
			state.animalData.minimap.scale.set(1);
			state.animalData.minimap.pivot.set(0, 0);
			state.isMinimapSmall = false;
			showNotification("Minimap restored");
		} else {
			state.animalData.minimap.scale.set(.5);
			state.animalData.minimap.pivot.set(-70, -45);
			state.isMinimapSmall = true;
			showNotification("Small minimap enabled");
		}
	}
	//#endregion
	//#region extension/src/ui/theme.js
	function applyTheme(themeName) {
		const rootElement = document.documentElement;
		const themeDefinitions = {
			grey: {
				acc: "#888888",
				accH: "#aaaaaa",
				accRGB: "136,136,136",
				text: "#e0e0e0",
				textSec: "#888",
				bg1: "#1a1a1a",
				bg2: "#242424",
				bg3: "#2a2a2a",
				border: "#333",
				hover: "#2e2e2e"
			},
			blue: {
				acc: "#4fc3f7",
				accH: "#81d4fa",
				accRGB: "79,195,247",
				text: "#e0e0e0",
				textSec: "#888",
				bg1: "#1a1a1a",
				bg2: "#242424",
				bg3: "#2a2a2a",
				border: "#333",
				hover: "#2e2e2e"
			},
			red: {
				acc: "#ef5350",
				accH: "#e57373",
				accRGB: "239,83,80",
				text: "#e0e0e0",
				textSec: "#888",
				bg1: "#1a1a1a",
				bg2: "#242424",
				bg3: "#2a2a2a",
				border: "#333",
				hover: "#2e2e2e"
			},
			green: {
				acc: "#66bb6a",
				accH: "#81c784",
				accRGB: "102,187,106",
				text: "#e0e0e0",
				textSec: "#888",
				bg1: "#1a1a1a",
				bg2: "#242424",
				bg3: "#2a2a2a",
				border: "#333",
				hover: "#2e2e2e"
			},
			pink: {
				acc: "#f06292",
				accH: "#f48fb1",
				accRGB: "240,98,146",
				text: "#e0e0e0",
				textSec: "#888",
				bg1: "#1a1a1a",
				bg2: "#242424",
				bg3: "#2a2a2a",
				border: "#333",
				hover: "#2e2e2e"
			},
			starwars: {
				acc: "#ffd740",
				accH: "#ffe082",
				accRGB: "255,215,64",
				text: "#e0e0e0",
				textSec: "#888",
				bg1: "#1a1a1a",
				bg2: "#242424",
				bg3: "#2a2a2a",
				border: "#333",
				hover: "#2e2e2e"
			},
			kfc: {
				acc: "#f44336",
				accH: "#e57373",
				accRGB: "244,67,54",
				text: "#e0e0e0",
				textSec: "#888",
				bg1: "#1a1a1a",
				bg2: "#242424",
				bg3: "#2a2a2a",
				border: "#333",
				hover: "#2e2e2e"
			},
			halloween: {
				acc: "#ff6600",
				accH: "#ff8833",
				accRGB: "255,102,0",
				text: "#e0e0e0",
				textSec: "#888",
				bg1: "#1a1a1a",
				bg2: "#242424",
				bg3: "#2a2a2a",
				border: "#333",
				hover: "#2e2e2e"
			},
			...JSON.parse(localStorage.getItem("customThemes") || "{}")
		};
		const themeColor = themeDefinitions[themeName] ? themeName : "grey";
		const themeValue = themeDefinitions[themeColor];
		Object.entries({
			"--acc": themeValue.acc,
			"--acc-h": themeValue.accH,
			"--acc-rgb": themeValue.accRGB,
			"--text": themeValue.text,
			"--text-sec": themeValue.textSec,
			"--bg1": themeValue.bg1,
			"--bg2": themeValue.bg2,
			"--bg3": themeValue.bg3,
			"--bdr": themeValue.border,
			"--hvr": themeValue.hover
		}).forEach(([cssPropertyName, cssPropertyValue]) => rootElement.style.setProperty(cssPropertyName, cssPropertyValue));
		localStorage.setItem("theme", themeColor);
	}
	function initBackgroundImage() {
		const backgroundImageUrl = localStorage.getItem("bgUrl") || "";
		if (!backgroundImageUrl) return;
		const updateBackgroundImage = () => {
			const homeBackgroundElement = document.querySelector(".home-bg");
			if (homeBackgroundElement) homeBackgroundElement.style.setProperty("background-image", "url(\"" + backgroundImageUrl + "\")", "important");
		};
		if (!document.querySelector(".home-bg")) {
			const bgCheckInterval = setInterval(() => {
				if (document.querySelector(".home-bg")) {
					clearInterval(bgCheckInterval);
					updateBackgroundImage();
				}
			}, 100);
		} else updateBackgroundImage();
	}
	function injectStyles() {
		const styleElement = document.createElement("style");
		styleElement.textContent = "\n      .ast-panel{font-family:'Segoe UI',system-ui,sans-serif;background:var(--bg1,#1a1a1a);color:var(--text,#e0e0e0);border-radius:6px;position:fixed;z-index:99999;user-select:none;cursor:move;font-size:13px;min-width:220px;overflow:hidden;}\n      .ast-header{background:var(--header-bg,var(--bg2,#242424));padding:10px 14px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--bdr,#333);}\n      .ast-header-title{font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:var(--header-title,var(--acc,#888));}\n      .ast-header-min{background:none;border:none;color:var(--text-sec,#888);font-size:16px;cursor:pointer;padding:0 4px;line-height:1;}\n      .ast-header-min:hover{color:var(--text,#e0e0e0);}\n      .ast-body{padding:8px 12px 12px 12px;}\n      .ast-section-label{font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--section-label,var(--text-sec,#888));padding:8px 0 4px 2px;display:block;}\n      .ast-btn{display:block;width:100%;background:var(--btn-bg,var(--bg2,#242424));color:var(--btn-text,var(--text,#e0e0e0));border:none;border-radius:4px;padding:8px 10px;font-size:12px;font-weight:500;cursor:pointer;text-align:left;transition:background .12s;margin-bottom:3px;font-family:inherit;position:relative;}\n      .ast-btn:hover:not(:disabled){background:var(--btn-hover,var(--hvr,#2e2e2e));}\n      .ast-btn:disabled{opacity:.35;cursor:not-allowed;}\n      .ast-btn.toggle-on{color:var(--acc,#888);}\n      .ast-btn.toggle-on::before{content:'';position:absolute;left:0;top:4px;bottom:4px;width:2px;background:var(--acc,#888);border-radius:1px;}\n      .ast-btn.patched{opacity:.25;text-decoration:line-through;cursor:not-allowed;}\n      .ast-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:5px 2px;font-size:12px;}\n      .ast-toggle-row label{color:var(--text,#e0e0e0);cursor:pointer;}\n      .ast-switch{position:relative;width:32px;height:18px;flex-shrink:0;}\n      .ast-switch input{opacity:0;width:0;height:0;position:absolute;}\n      .ast-switch .slider{position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:var(--switch-bg,#333);border-radius:9px;transition:background .2s;}\n      .ast-switch .slider::before{content:'';position:absolute;height:14px;width:14px;left:2px;bottom:2px;background:var(--switch-knob,#888);border-radius:50%;transition:transform .2s,background .2s;}\n      .ast-switch input:checked+.slider{background:var(--switch-active-bg,rgba(var(--acc-rgb,136,136,136),.3));}\n      .ast-switch input:checked+.slider::before{transform:translateX(14px);background:var(--acc,#888);}\n      .ast-select{width:100%;background:var(--input-bg,var(--bg2,#242424));color:var(--input-text,var(--text,#e0e0e0));border:1px solid var(--input-border,var(--bdr,#333));border-radius:4px;padding:6px 8px;font-size:12px;cursor:pointer;outline:none;font-family:inherit;margin-bottom:3px;appearance:none;}\n      .ast-select:focus{border-color:var(--acc,#888);}\n      .ast-input{background:var(--input-bg,var(--bg2,#242424));color:var(--input-text,var(--text,#e0e0e0));border:1px solid var(--input-border,var(--bdr,#333));border-radius:4px;padding:6px 8px;font-size:12px;outline:none;font-family:inherit;}\n      .ast-input:focus{border-color:var(--acc,#888);}\n      .ast-input::placeholder{color:var(--placeholder,#555);}\n      .ast-textarea{background:var(--input-bg,var(--bg2,#242424));color:var(--input-text,var(--text,#e0e0e0));border:1px solid var(--input-border,var(--bdr,#333));border-radius:4px;padding:8px;font-size:12px;outline:none;font-family:inherit;resize:none;width:100%;box-sizing:border-box;}\n      .ast-textarea:focus{border-color:var(--acc,#888);}\n      .ast-textarea::placeholder{color:var(--placeholder,#555);}\n      .ast-key-row{display:flex;align-items:center;justify-content:space-between;padding:4px 2px;font-size:12px;margin-bottom:3px;}\n      .ast-key-row span{color:var(--text,#e0e0e0);}\n      .ast-key-capture{background:var(--key-bg,var(--bg2,#242424));border:1px solid var(--input-border,var(--bdr,#333));color:var(--key-text,var(--acc,#888));border-radius:4px;padding:4px 10px;font-size:11px;text-align:center;min-width:50px;cursor:pointer;outline:none;font-family:'Consolas',monospace;font-weight:600;}\n      .ast-key-capture:focus{border-color:var(--acc,#888);}\n      .ast-row{display:flex;align-items:center;gap:6px;margin-bottom:4px;}\n      .ast-row .ast-input{flex:1;}\n      .ast-credits{padding-top:8px;font-size:10px;color:var(--muted,#555);line-height:1.5;text-align:center;}\n      .ast-sep{height:1px;background:var(--bdr,#333);margin:6px 0;}\n      .ast-update-list{margin:0;padding-left:16px;font-size:11px;color:var(--list-text,var(--text-sec,#888));line-height:1.6;}\n      .ast-update-list li{margin-bottom:4px;}\n      div.sidebar.left>div.ad-block{opacity:0!important;pointer-events:none!important;display:none!important;}\n      div.sidebar.left>a{display:none!important;}\n      div.sidebar.left{max-width:30vw;width:21rem;bottom:0!important;}\n    ";
		document.head.appendChild(styleElement);
	}
	//#endregion
	//#region extension/src/features/chat.js
	let chatInterval = null;
	function startRepeatingTask(taskData, intervalSeconds) {
		if (chatInterval) clearInterval(chatInterval);
		state.isLooping = true;
		chatInterval = setInterval(() => {
			typeChatMessage(taskData);
		}, intervalSeconds * 1e3);
	}
	function stopChatTimer() {
		if (chatInterval) {
			clearInterval(chatInterval);
			chatInterval = null;
		}
		state.isLooping = false;
	}
	//#endregion
	//#region extension/src/features/antidetection.js
	let isYoutubeApiReady = false;
	const initAntiDetection = () => {
		if (isYoutubeApiReady) return;
		isYoutubeApiReady = true;
		const cacheStore = {};
		for (const propertyName of Object.getOwnPropertyNames(Reflect)) cacheStore[propertyName] = Reflect[propertyName];
		const ProxyConstructor = Proxy;
		const lookupGetter = Object.prototype.__lookupGetter__;
		const updateObjectProperty = (dataStore, dataKey, initialValue) => {
			const wrappedValue = new ProxyConstructor(dataStore[dataKey], initialValue);
			metadataMap.set(wrappedValue, dataStore[dataKey]);
			dataStore[dataKey] = wrappedValue;
		};
		updateObjectProperty(Function.prototype, "toString", { apply(thisContext, argsKey, bindingContext) {
			return cacheStore.apply(thisContext, metadataMap.get(argsKey) || argsKey, bindingContext);
		} });
		updateObjectProperty(window, "Proxy", { construct(constructorFunc, constructorArgs) {
			return cacheStore.construct(constructorFunc, constructorArgs);
		} });
		updateObjectProperty(ProxyConstructor, "revocable", { apply(targetFunction, functionArgs, functionContext) {
			return cacheStore.apply(targetFunction, functionArgs, functionContext);
		} });
		let lastExecutionTimestamp = 0;
		updateObjectProperty(Function.prototype, "bind", { apply(bindTargetContext, argumentsList, contextArgument) {
			try {
				try {
					if (lookupGetter.call(contextArgument[0], "aboveBgPlatformsContainer") != null) return cacheStore.apply(bindTargetContext, argumentsList, contextArgument);
				} catch {}
				if (contextArgument[0] && contextArgument[0].aboveBgPlatformsContainer != null) {
					state.animalData = contextArgument[0];
					state.gameInstance = contextArgument[0].game;
					window.__cachedEM = null;
					const obfuscatedKeys = getAllPropertyNames(state.animalData).filter((obfuscatedName1) => obfuscatedName1.startsWith("_0x"));
					configStore.setFlash = Object.getOwnPropertyNames(state.animalData.__proto__.__proto__).filter((obfuscatedName2) => obfuscatedName2.startsWith("_0x")).find((functionKey) => state.animalData[functionKey] instanceof Function) || configStore.setFlash;
					configStore.terrainManager = obfuscatedKeys.find((shadowElementKey) => typeof state.animalData[shadowElementKey]?.shadow !== "undefined") || configStore.terrainManager;
					configStore.entityManager = obfuscatedKeys.find((entitiesListKey) => typeof state.animalData[entitiesListKey]?.entitiesList !== "undefined") || configStore.entityManager;
					configStore.socketManager = getAllPropertyNames(state.gameInstance).find((packetSenderKey) => typeof state.gameInstance[packetSenderKey]?.sendBytePacket !== "undefined") || configStore.socketManager;
					try {
						document.getElementById("app")._vnode.appContext.config.globalProperties.$simpleState.states.find((gameStore) => gameStore._storeMeta.id === "game");
					} catch {}
					let animalCheckInterval;
					try {
						clearInterval(animalCheckInterval);
					} catch {}
					animalCheckInterval = setInterval(() => {
						try {
							if (!state.animalData?.myAnimals?.[0]) return;
							const firstMyAnimal = state.animalData.myAnimals[0];
							if (firstMyAnimal.fadingTrail) wrapWithProxy(Object.getPrototypeOf(firstMyAnimal.fadingTrail), "enable", { apply() {} });
							if (firstMyAnimal.bubblesEmitter) Object.defineProperty(Object.getPrototypeOf(firstMyAnimal.bubblesEmitter), "emit", { set: () => {} });
							clearInterval(animalCheckInterval);
						} catch {}
					}, 200);
					if (lastExecutionTimestamp < Date.now() - 3e3) {
						showNotification("Client loaded");
						lastExecutionTimestamp = Date.now();
					}
				}
			} catch {}
			return cacheStore.apply(bindTargetContext, argumentsList, contextArgument);
		} });
	};
	//#endregion
	//#region extension/src/features/xray.js
	const initializeAstraVision = () => {
		if (state.isActive) return;
		if (!state.animalData) {
			setTimeout(initializeAstraVision, 500);
			return;
		}
		try {
			if (state.animalData.terrainManager && state.animalData.terrainManager.shadow) {
				state.animalData.terrainManager.shadow.setShadowSize(1e6);
				state.animalData.terrainManager.shadow.setShadowSize = () => {};
			} else for (let keyA in state.animalData) if (state.animalData[keyA] && state.animalData[keyA].shadow) {
				state.animalData[keyA].shadow.setShadowSize(1e6);
				state.animalData[keyA].shadow.setShadowSize = () => {};
			}
			if (typeof state.animalData.setFlash === "function") state.animalData.setFlash = () => {};
			else for (let keyB of Object.getOwnPropertyNames(state.animalData.__proto__)) if (keyB.startsWith("_0x") && typeof state.animalData[keyB] === "function") state.animalData[keyB] = () => {};
			setInterval(() => {
				try {
					state.gameInstance.viewport.clampZoom({
						minWidth: 0,
						maxWidth: 1e7
					});
					state.gameInstance.viewport.plugins.plugins.clamp = null;
					state.gameInstance.viewport.plugins.plugins["clamp-zoom"] = null;
				} catch {}
			}, 300);
			showNotification("Astra-Vision active");
		} catch (errorMessage) {
			console.error("AstraVision Error:", errorMessage);
		}
		state.isActive = true;
	};
	//#endregion
	//#region extension/src/features/esp.js
	window.entityTrailColor = {
		r: 255,
		g: 150,
		b: 0
	};
	window.entityTrailEnabled = false;
	window.entityTrailTargetId = null;
	window.entityTrailHistory = [];
	window.entityTrailMaxLength = 200;
	window.entityTrailRecordInterval = 100;
	window.espEnabled = false;
	window.espColors = {
		close: "#ff0000",
		medium: "#ffff00",
		far: "#00ffff",
		veryFar: "#00ff00",
		tracked: "#ff00ff",
		foodClose: "#00ff00",
		foodMedium: "#88ff88",
		foodFar: "#44cc44"
	};
	window.espTrackedEntityId = null;
	window.espMode = "players";
	function drawEntityTrail(ctx, canvas, playerPos, zoomScale) {
		if (!window.entityTrailEnabled || window.entityTrailHistory.length < 2) return;
		const centerX = canvas.width / 2;
		const centerY = canvas.height / 2;
		const trailDuration = 3e4;
		const { r: red, g: green, b: blue } = window.entityTrailColor;
		for (let i = 1; i < window.entityTrailHistory.length; i++) {
			const prevPoint = window.entityTrailHistory[i - 1];
			const currPoint = window.entityTrailHistory[i];
			const age = state.currentTime - currPoint.time;
			const opacity = Math.max(.05, 1 - age / trailDuration);
			const startX = centerX + (prevPoint.x - playerPos.x) * zoomScale;
			const startY = centerY + (prevPoint.y - playerPos.y) * zoomScale;
			const endX = centerX + (currPoint.x - playerPos.x) * zoomScale;
			const endY = centerY + (currPoint.y - playerPos.y) * zoomScale;
			const progress = i / window.entityTrailHistory.length;
			ctx.beginPath();
			ctx.moveTo(startX, startY);
			ctx.lineTo(endX, endY);
			ctx.strokeStyle = "rgba(" + red + "," + green + "," + blue + "," + opacity + ")";
			ctx.lineWidth = 1.5 + progress * 1.5;
			ctx.stroke();
		}
		for (let j = 0; j < window.entityTrailHistory.length; j += 5) {
			const historyPoint = window.entityTrailHistory[j];
			const pointAge = state.currentTime - historyPoint.time;
			const pointOpacity = Math.max(.1, 1 - pointAge / trailDuration);
			const pointX = centerX + (historyPoint.x - playerPos.x) * zoomScale;
			const pointY = centerY + (historyPoint.y - playerPos.y) * zoomScale;
			ctx.fillStyle = "rgba(" + red + "," + green + "," + blue + "," + pointOpacity + ")";
			ctx.beginPath();
			ctx.arc(pointX, pointY, 2, 0, Math.PI * 2);
			ctx.fill();
		}
		if (window.entityTrailHistory.length > 0) {
			const lastTrailPosition = window.entityTrailHistory[window.entityTrailHistory.length - 1];
			const calculatedXOffset = centerX + (lastTrailPosition.x - playerPos.x) * zoomScale;
			const calculatedYOffset = centerY + (lastTrailPosition.y - playerPos.y) * zoomScale;
			ctx.fillStyle = "rgb(" + red + "," + green + "," + blue + ")";
			ctx.font = "bold 10px monospace";
			ctx.fillText("TRAIL (" + window.entityTrailHistory.length + " pts)", calculatedXOffset + 8, calculatedYOffset - 8);
		}
	}
	function renderLoop() {
		const overlayCanvas = getOrCreateCanvas("ast-overlay", 999997);
		const overlayCtx = overlayCanvas.getContext("2d");
		overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
		const currentPlayerPos = getAnimalPosition();
		if (currentPlayerPos && window.entityTrailEnabled) drawEntityTrail(overlayCtx, overlayCanvas, currentPlayerPos, getViewportScale());
		requestAnimationFrame(renderLoop);
	}
	function drawESP(ctx, gameState, offsetX, offsetY, scale) {
		if (!gameState || gameState.error) return;
		const myPos = gameState.myPos;
		const espMode = window.espMode;
		const trackedId = window.espTrackedEntityId;
		let entities = espMode === "players" ? gameState.players || [] : gameState.food || [];
		let viewCenterX = 0;
		let viewCenterY = 0;
		try {
			if (state.gameInstance?.viewport) {
				const viewport = state.gameInstance.viewport;
				if (viewport.center && viewport.center.x != null) {
					viewCenterX = (viewport.center.x - myPos.x) * scale;
					viewCenterY = (viewport.center.y - myPos.y) * scale;
				}
			}
		} catch (err) {}
		entities.forEach((targetEntity) => {
			const deltaX = targetEntity.x - myPos.x;
			const deltaY = targetEntity.y - myPos.y;
			const screenPosX = offsetX + deltaX * scale - viewCenterX;
			const screenPosY = offsetY + deltaY * scale - viewCenterY;
			const isTracked = trackedId && targetEntity.id === trackedId;
			const boxSize = 20;
			let espColor;
			if (espMode === "players") {
				espColor = isTracked ? window.espColors.tracked : targetEntity.distance < 500 ? window.espColors.close : targetEntity.distance < 1500 ? window.espColors.medium : targetEntity.distance < 3e3 ? window.espColors.far : window.espColors.veryFar;
				ctx.strokeStyle = espColor;
				ctx.lineWidth = isTracked ? 3 : 2;
				ctx.strokeRect(screenPosX - boxSize / 2, screenPosY - boxSize / 2, boxSize, boxSize);
				ctx.fillStyle = espColor;
				ctx.font = "bold 11px monospace";
				ctx.fillText(targetEntity.entity?.entityName || targetEntity.entity?.name || "ID:" + targetEntity.id, screenPosX - boxSize / 2, screenPosY - boxSize / 2 - 8);
				ctx.font = "10px monospace";
				ctx.fillText(Math.round(targetEntity.distance).toString(), screenPosX - boxSize / 2, screenPosY + boxSize / 2 + 13);
				if (targetEntity.entity?.visibleFishLevel != null) ctx.fillText("Lvl:" + targetEntity.entity.visibleFishLevel, screenPosX - boxSize / 2, screenPosY + boxSize / 2 + 24);
				if (window.lockEnabled && window.lockTargetId === targetEntity.id) {
					ctx.strokeStyle = "#ff0000";
					ctx.lineWidth = 2;
					const boxOffset = 15;
					ctx.beginPath();
					ctx.moveTo(screenPosX - boxOffset, screenPosY);
					ctx.lineTo(screenPosX + boxOffset, screenPosY);
					ctx.moveTo(screenPosX, screenPosY - boxOffset);
					ctx.lineTo(screenPosX, screenPosY + boxOffset);
					ctx.stroke();
					ctx.beginPath();
					ctx.arc(screenPosX, screenPosY, boxOffset, 0, Math.PI * 2);
					ctx.strokeStyle = "rgba(255,0,0,0.7)";
					ctx.stroke();
					ctx.fillStyle = "#ff0000";
					ctx.font = "bold 10px monospace";
					ctx.fillText("LOCKED", screenPosX + boxOffset + 4, screenPosY - 4);
				}
				ctx.beginPath();
				ctx.moveTo(offsetX, offsetY);
				ctx.lineTo(screenPosX, screenPosY);
				ctx.strokeStyle = espColor;
				ctx.globalAlpha = .25;
				ctx.lineWidth = 1;
				ctx.stroke();
				ctx.globalAlpha = 1;
			} else {
				espColor = targetEntity.distance < 300 ? window.espColors.foodClose : targetEntity.distance < 1e3 ? window.espColors.foodMedium : window.espColors.foodFar;
				ctx.strokeStyle = espColor;
				ctx.lineWidth = 1.5;
				ctx.strokeRect(screenPosX - boxSize / 2, screenPosY - boxSize / 2, boxSize, boxSize);
				if (targetEntity.distance < 1e3) {
					ctx.fillStyle = espColor;
					ctx.font = "9px monospace";
					ctx.fillText(Math.round(targetEntity.distance).toString(), screenPosX + boxSize / 2 + 3, screenPosY + 3);
				}
			}
		});
	}
	function drawTrackerLine(ctx, canvas, playerPos, zoomScale) {
		if (!window.espTrackedEntityId) return;
		const trackedEntity = findEntityById(window.espTrackedEntityId);
		if (!trackedEntity) return;
		if (!isValidEntity(trackedEntity)) {
			window.espTrackedEntityId = null;
			return;
		}
		const entityPos = extractPosition(trackedEntity);
		if (!entityPos || !playerPos) return;
		const centerX = canvas.width / 2;
		const centerY = canvas.height / 2;
		const diffX = entityPos.x - playerPos.x;
		const diffY = entityPos.y - playerPos.y;
		const targetX = centerX + diffX * zoomScale;
		const targetY = centerY + diffY * zoomScale;
		const distance = calculateDistance(playerPos.x, playerPos.y, entityPos.x, entityPos.y);
		const entityDir = calculateDirection(trackedEntity);
		const pulse = Math.sin(Date.now() / 200) * .3 + .7;
		const markerSize = 40;
		ctx.beginPath();
		ctx.moveTo(centerX, centerY);
		ctx.lineTo(targetX, targetY);
		ctx.strokeStyle = "rgba(255,0,255,0.6)";
		ctx.lineWidth = 2;
		ctx.setLineDash([8, 4]);
		ctx.stroke();
		ctx.setLineDash([]);
		ctx.strokeStyle = "rgba(255,0,255," + pulse + ")";
		ctx.lineWidth = 3;
		ctx.strokeRect(targetX - markerSize / 2, targetY - markerSize / 2, markerSize, markerSize);
		const arrowLength = 50;
		const angle = Math.atan2(entityDir.dirY, entityDir.dirX);
		ctx.beginPath();
		ctx.moveTo(targetX, targetY);
		ctx.lineTo(targetX + entityDir.dirX * arrowLength, targetY + entityDir.dirY * arrowLength);
		ctx.strokeStyle = "#ff00ff";
		ctx.lineWidth = 2;
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(targetX + entityDir.dirX * arrowLength, targetY + entityDir.dirY * arrowLength);
		ctx.lineTo(targetX + entityDir.dirX * arrowLength - Math.cos(angle - .4) * 10, targetY + entityDir.dirY * arrowLength - Math.sin(angle - .4) * 10);
		ctx.moveTo(targetX + entityDir.dirX * arrowLength, targetY + entityDir.dirY * arrowLength);
		ctx.lineTo(targetX + entityDir.dirX * arrowLength - Math.cos(angle + .4) * 10, targetY + entityDir.dirY * arrowLength - Math.sin(angle + .4) * 10);
		ctx.strokeStyle = "#ff00ff";
		ctx.lineWidth = 2;
		ctx.stroke();
		const rectWidth = 180;
		const rectHeight = 70;
		const rectX = Math.min(targetX + markerSize / 2 + 10, canvas.width - rectWidth - 5);
		const rectY = Math.max(5, Math.min(targetY - rectHeight / 2, canvas.height - rectHeight - 5));
		ctx.fillStyle = "rgba(0,0,0,0.85)";
		ctx.strokeStyle = "rgba(255,0,255," + pulse + ")";
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.roundRect(rectX, rectY, rectWidth, rectHeight, 4);
		ctx.fill();
		ctx.stroke();
		ctx.fillStyle = "#ff00ff";
		ctx.font = "bold 12px monospace";
		ctx.fillText("TRACKING", rectX + 8, rectY + 18);
		ctx.fillStyle = "#ffffff";
		ctx.font = "11px monospace";
		ctx.fillText((trackedEntity.name || "Entity " + window.espTrackedEntityId).substring(0, 18), rectX + 8, rectY + 34);
		ctx.fillStyle = "#ff00ff";
		ctx.font = "bold 14px monospace";
		ctx.fillText(Math.round(distance) + " units", rectX + 8, rectY + 52);
		if (targetX < 0 || targetX > canvas.width || targetY < 0 || targetY > canvas.height) {
			const arrowAngle = Math.atan2(targetY - centerY, targetX - centerX);
			const arrowCenterX = centerX + Math.cos(arrowAngle) * (canvas.width / 2 - 40);
			const arrowCenterY = centerY + Math.sin(arrowAngle) * (canvas.height / 2 - 40);
			ctx.fillStyle = "rgba(0,0,0,0.85)";
			ctx.beginPath();
			ctx.roundRect(arrowCenterX - 40, arrowCenterY - 15, 80, 30, 4);
			ctx.fill();
			ctx.strokeStyle = "#ff00ff";
			ctx.lineWidth = 1.5;
			ctx.stroke();
			ctx.beginPath();
			ctx.moveTo(arrowCenterX + Math.cos(arrowAngle) * 20, arrowCenterY + Math.sin(arrowAngle) * 20);
			ctx.lineTo(arrowCenterX - Math.cos(arrowAngle - .5) * 10, arrowCenterY - Math.sin(arrowAngle - .5) * 10);
			ctx.lineTo(arrowCenterX - Math.cos(arrowAngle + .5) * 10, arrowCenterY - Math.sin(arrowAngle + .5) * 10);
			ctx.closePath();
			ctx.fillStyle = "#ff00ff";
			ctx.fill();
			ctx.fillStyle = "#ffffff";
			ctx.font = "bold 11px monospace";
			ctx.textAlign = "center";
			ctx.fillText(Math.round(distance).toString(), arrowCenterX, arrowCenterY + 4);
			ctx.textAlign = "left";
		}
	}
	function drawRadar(ctx, canvas, gameState) {
		if (!gameState || gameState.error) return;
		const radarSize = 150;
		if (dragState.x === null) dragState.x = canvas.width - radarSize - 20;
		const radarX = dragState.x;
		const radarY = dragState.y;
		const pixelScale = radarSize / (5e3 * 2);
		window._radarBounds = {
			x: radarX,
			y: radarY,
			w: radarSize,
			h: 172
		};
		ctx.fillStyle = "rgba(20,20,20,0.9)";
		ctx.beginPath();
		ctx.roundRect(radarX, radarY, radarSize, radarSize, 4);
		ctx.fill();
		ctx.strokeStyle = "#333";
		ctx.lineWidth = 1;
		ctx.stroke();
		ctx.strokeStyle = "rgba(60,60,60,0.5)";
		ctx.lineWidth = .5;
		ctx.beginPath();
		ctx.moveTo(radarX + radarSize / 2, radarY);
		ctx.lineTo(radarX + radarSize / 2, radarY + radarSize);
		ctx.moveTo(radarX, radarY + radarSize / 2);
		ctx.lineTo(radarX + radarSize, radarY + radarSize / 2);
		ctx.stroke();
		for (let circleRadiusFactor = .25; circleRadiusFactor <= 1; circleRadiusFactor += .25) {
			ctx.beginPath();
			ctx.arc(radarX + radarSize / 2, radarY + radarSize / 2, radarSize / 2 * circleRadiusFactor, 0, Math.PI * 2);
			ctx.strokeStyle = "rgba(60,60,60," + (.2 + circleRadiusFactor * .1) + ")";
			ctx.stroke();
		}
		ctx.fillStyle = "#1db954";
		ctx.beginPath();
		ctx.arc(radarX + radarSize / 2, radarY + radarSize / 2, 4, 0, Math.PI * 2);
		ctx.fill();
		const entitiesToDraw = window.espMode === "players" ? gameState.players || [] : gameState.food || [];
		entitiesToDraw.forEach((targetEntity) => {
			const diffX = targetEntity.x - gameState.myPos.x;
			const diffY = targetEntity.y - gameState.myPos.y;
			let screenX = Math.max(radarX + 2, Math.min(radarX + radarSize - 2, radarX + radarSize / 2 + diffX * pixelScale));
			let screenY = Math.max(radarY + 2, Math.min(radarY + radarSize - 2, radarY + radarSize / 2 + diffY * pixelScale));
			let espColor;
			let circleRadius;
			if (window.espMode === "players") {
				espColor = targetEntity.distance < 500 ? window.espColors.close : targetEntity.distance < 1500 ? window.espColors.medium : targetEntity.distance < 3e3 ? window.espColors.far : "#888";
				circleRadius = 3;
			} else {
				espColor = window.espColors.foodClose;
				circleRadius = 1.5;
			}
			if (window.espTrackedEntityId && targetEntity.id === window.espTrackedEntityId) {
				espColor = window.espColors.tracked;
				circleRadius = 4;
			}
			if (window.lockTargetId && targetEntity.id === window.lockTargetId) {
				espColor = "#ff0000";
				circleRadius = 4;
			}
			ctx.fillStyle = espColor;
			ctx.beginPath();
			ctx.arc(screenX, screenY, circleRadius, 0, Math.PI * 2);
			ctx.fill();
		});
		if (window.entityTrailEnabled && window.entityTrailTargetId) {
			const targetEntityId = findEntityById(window.entityTrailTargetId);
			if (targetEntityId) {
				const targetEntity = extractPosition(targetEntityId);
				if (targetEntity) {
					const deltaX = targetEntity.x - gameState.myPos.x;
					const deltaY = targetEntity.y - gameState.myPos.y;
					const canvasX = Math.max(radarX + 2, Math.min(radarX + radarSize - 2, radarX + radarSize / 2 + deltaX * pixelScale));
					const canvasY = Math.max(radarY + 2, Math.min(radarY + radarSize - 2, radarY + radarSize / 2 + deltaY * pixelScale));
					const opacityPulse = Math.sin(Date.now() / 200) * .3 + .7;
					const { r: colorRed, g: colorGreen, b: colorBlue } = window.entityTrailColor;
					const rgbString = colorRed + "," + colorGreen + "," + colorBlue;
					ctx.strokeStyle = "rgba(" + rgbString + "," + opacityPulse + ")";
					ctx.lineWidth = 2;
					ctx.beginPath();
					ctx.arc(canvasX, canvasY, 7, 0, Math.PI * 2);
					ctx.stroke();
					ctx.strokeStyle = "rgba(" + rgbString + "," + opacityPulse * .5 + ")";
					ctx.lineWidth = 4;
					ctx.beginPath();
					ctx.arc(canvasX, canvasY, 10, 0, Math.PI * 2);
					ctx.stroke();
					ctx.fillStyle = "rgb(" + rgbString + ")";
					ctx.beginPath();
					ctx.arc(canvasX, canvasY, 3, 0, Math.PI * 2);
					ctx.fill();
					if (window.entityTrailHistory.length > 1) {
						ctx.strokeStyle = "rgba(" + rgbString + ",0.3)";
						ctx.lineWidth = 1;
						ctx.beginPath();
						window.entityTrailHistory.forEach((entity, entityIndex) => {
							const drawX = Math.max(radarX + 2, Math.min(radarX + radarSize - 2, radarX + radarSize / 2 + (entity.x - gameState.myPos.x) * pixelScale));
							const drawY = Math.max(radarY + 2, Math.min(radarY + radarSize - 2, radarY + radarSize / 2 + (entity.y - gameState.myPos.y) * pixelScale));
							if (entityIndex === 0) ctx.moveTo(drawX, drawY);
							else ctx.lineTo(drawX, drawY);
						});
						ctx.stroke();
					}
				}
			}
		}
		ctx.fillStyle = "rgba(20,20,20,0.9)";
		ctx.beginPath();
		ctx.roundRect(radarX, radarY + radarSize, radarSize, 22, [
			0,
			0,
			4,
			4
		]);
		ctx.fill();
		ctx.fillStyle = "#888";
		ctx.font = "10px monospace";
		ctx.fillText("RADAR", radarX + 5, radarY + radarSize + 14);
		ctx.fillText((window.espMode === "players" ? "P:" : "F:") + entitiesToDraw.length, radarX + radarSize - 50, radarY + radarSize + 14);
	}
	function renderEspLoop() {
		if (!window.espEnabled) {
			const overlayElement = document.getElementById("esp-overlay");
			if (overlayElement) overlayElement.getContext("2d").clearRect(0, 0, overlayElement.width, overlayElement.height);
			requestAnimationFrame(renderEspLoop);
			return;
		}
		const espCanvas = getOrCreateCanvas("esp-overlay", 999998);
		const espCtx = espCanvas.getContext("2d");
		espCtx.clearRect(0, 0, espCanvas.width, espCanvas.height);
		const currentGameState = buildEntityState();
		const playerData = getAnimalPosition();
		const renderSettings = getViewportScale();
		drawESP(espCtx, currentGameState, espCanvas.width / 2, espCanvas.height / 2, renderSettings);
		drawTrackerLine(espCtx, espCanvas, playerData, renderSettings);
		drawRadar(espCtx, espCanvas, currentGameState);
		requestAnimationFrame(renderEspLoop);
	}
	function toggleEsp() {
		window.espEnabled = !window.espEnabled;
		showNotification(window.espEnabled ? "ESP enabled" : "ESP disabled");
	}
	//#endregion
	//#region extension/src/ui/panels.js
	window.lockKey = "t";
	window.entityTraceKey = "h";
	let pressedKeyQ = "q";
	let pressedKeyE = "e";
	function createToolsPanel() {
		const toolsPanel = document.createElement("div");
		toolsPanel.id = "deep-tools-panel";
		toolsPanel.className = "ast-panel";
		toolsPanel.style.cssText = "bottom:20px;right:20px;width:230px;";
		toolsPanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Astraphobia Client</span><button class=\"ast-header-min\" id=\"mainMin\">−</button></div>\n      <div class=\"ast-body\" id=\"mainBody\">\n                    <span class=\"ast-section-label\">Autofill Name</span>\n        <div class=\"ast-row\" style=\"margin-bottom:6px;\">\n          <input class=\"ast-input\" type=\"text\" id=\"savedNameDisplay\" placeholder=\"Enter name...\" style=\"flex:1;\">\n          <button class=\"ast-btn\" id=\"setNameBtn\" style=\"width:40px;padding:6px 5px;margin:0;flex-shrink:0;text-align:center;\">Set</button>\n          <button class=\"ast-btn\" id=\"clearNameBtn\" style=\"width:30px;padding:6px 5px;margin:0;flex-shrink:0;text-align:center;\">✕</button>\n        </div>\n        <span class=\"ast-section-label\">Chat</span>\n        <textarea class=\"ast-textarea\" id=\"chatMsg\" placeholder=\"Message...\" rows=\"2\"></textarea>\n        <button class=\"ast-btn\" id=\"sendBtn\">Send Chat</button>\n        <div class=\"ast-row\" style=\"margin-top:4px;\">\n          <input class=\"ast-input\" type=\"number\" id=\"delayInput\" min=\"1\" max=\"300\" value=\"10\" style=\"width:50px;text-align:center;\">\n          <span style=\"font-size:11px;color:#888;\">sec</span>\n          <button class=\"ast-btn\" id=\"autoChatBtn\" style=\"flex:1;margin-bottom:0;\">Auto Chat</button>\n        </div>\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">Tools</span>\n        <button class=\"ast-btn\" id=\"patchBtn\">Special Characters</button>\n        <button class=\"ast-btn\" id=\"spoofBtn\">Spoof Username</button>\n        <button class=\"ast-btn\" id=\"spinBtn\">Auto Spin</button>\n        <div class=\"ast-key-row\"><span>Spin key</span><input class=\"ast-key-capture\" id=\"spinKeyInput\" type=\"text\" placeholder=\"...\" readonly></div>\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">Turn Controls</span>\n        <div class=\"ast-key-row\">\n          <span>Turn Left</span>\n          <input class=\"ast-key-capture\" id=\"turnLeftKeyInput\" type=\"text\" value=\"Q\" readonly>\n        </div>\n        <div class=\"ast-key-row\">\n          <span>Turn Right</span>\n          <input class=\"ast-key-capture\" id=\"turnRightKeyInput\" type=\"text\" value=\"E\" readonly>\n        </div>\n        <div class=\"ast-credits\">Made by Astraphobia</div>\n      </div>";
		document.body.appendChild(toolsPanel);
		const mainBodyElement = toolsPanel.querySelector("#mainBody");
		let isVisible = false;
		toolsPanel.querySelector("#mainMin").onclick = (event) => {
			event.stopPropagation();
			isVisible = !isVisible;
			mainBodyElement.style.display = isVisible ? "none" : "block";
			toolsPanel.querySelector("#mainMin").textContent = isVisible ? "+" : "−";
		};
		toolsPanel.querySelector("#sendBtn").onclick = () => {
			const chatMessage = toolsPanel.querySelector("#chatMsg").value;
			if (chatMessage) typeChatMessage(chatMessage);
		};
		const autoChatButton = toolsPanel.querySelector("#autoChatBtn");
		autoChatButton.onclick = () => {
			const messageText = toolsPanel.querySelector("#chatMsg").value;
			const delayValue = parseInt(toolsPanel.querySelector("#delayInput").value) || 10;
			if (!messageText) {
				showNotification("Enter a message first");
				return;
			}
			if (state.isLooping) {
				stopChatTimer();
				autoChatButton.textContent = "Auto Chat";
				autoChatButton.classList.remove("toggle-on");
			} else {
				startRepeatingTask(messageText, delayValue);
				autoChatButton.textContent = "Stop Chat";
				autoChatButton.classList.add("toggle-on");
			}
		};
		const patchButton = toolsPanel.querySelector("#patchBtn");
		patchButton.onclick = () => {
			initializeTextInterceptor();
			patchButton.textContent = "Special Chars Active";
			patchButton.disabled = true;
			patchButton.classList.add("toggle-on");
		};
		toolsPanel.querySelector("#spoofBtn").onclick = () => {
			const randomString = generateRandomString(8);
			if (simulateTextInput(".play-game .el-input__inner", randomString)) showNotification("Name spoofed");
			else if (simulateTextInput(".new-tribe .el-input__inner", randomString)) showNotification("Tribe name spoofed");
			else showNotification("No name input found");
		};
		const spinButton = toolsPanel.querySelector("#spinBtn");
		spinButton.onclick = () => {
			toggleAutoPointerMovement();
			spinButton.textContent = state.animationIntervalId ? "Stop Spin" : "Auto Spin";
			spinButton.classList.toggle("toggle-on", !!state.animationIntervalId);
		};
		const spinKeyInput = toolsPanel.querySelector("#spinKeyInput");
		let lastPressedKey = null;
		spinKeyInput.addEventListener("keydown", (keydownEvent) => {
			keydownEvent.preventDefault();
			lastPressedKey = keydownEvent.code || keydownEvent.key;
			spinKeyInput.value = lastPressedKey.replace("Key", "").toUpperCase();
		});
		document.addEventListener("keydown", (keyupEvent) => {
			if (lastPressedKey && keyupEvent.code === lastPressedKey && !keyupEvent.target.matches("input,textarea,button,select")) {
				keyupEvent.preventDefault();
				toggleAutoPointerMovement();
				spinButton.textContent = state.animationIntervalId ? "Stop Spin" : "Auto Spin";
				spinButton.classList.toggle("toggle-on", !!state.animationIntervalId);
			}
		});
		const turnLeftInput = toolsPanel.querySelector("#turnLeftKeyInput");
		const turnRightInput = toolsPanel.querySelector("#turnRightKeyInput");
		turnLeftInput.value = pressedKeyQ.toUpperCase();
		turnRightInput.value = pressedKeyE.toUpperCase();
		turnLeftInput.addEventListener("keydown", (clickEvent) => {
			clickEvent.preventDefault();
			clickEvent.stopPropagation();
			pressedKeyQ = clickEvent.key;
			turnLeftInput.value = clickEvent.key.length === 1 ? clickEvent.key.toUpperCase() : clickEvent.key;
		});
		turnRightInput.addEventListener("keydown", (contextMenuEvent) => {
			contextMenuEvent.preventDefault();
			contextMenuEvent.stopPropagation();
			pressedKeyE = contextMenuEvent.key;
			turnRightInput.value = contextMenuEvent.key.length === 1 ? contextMenuEvent.key.toUpperCase() : contextMenuEvent.key;
		});
		const savedNameDisplay = toolsPanel.querySelector("#savedNameDisplay");
		const setNameButton = toolsPanel.querySelector("#setNameBtn");
		const clearNameButton = toolsPanel.querySelector("#clearNameBtn");
		if (savedNameDisplay) savedNameDisplay.value = localStorage.getItem("autofill_name") || "";
		if (setNameButton) setNameButton.onclick = () => {
			const userName = savedNameDisplay.value.trim();
			if (userName) {
				localStorage.setItem("autofill_name", userName);
				uiaudioState.isMuted = false;
				initAutofillName();
				showNotification("Name saved: " + userName);
			}
		};
		if (clearNameButton) clearNameButton.onclick = () => {
			localStorage.removeItem("autofill_name");
			uiaudioState.isMuted = false;
			if (savedNameDisplay) savedNameDisplay.value = "";
			showNotification("Autofill cleared");
		};
		makeElementDraggable(toolsPanel);
		return toolsPanel;
	}
	function createVisionPanel() {
		const visionPanel = document.createElement("div");
		visionPanel.id = "vision-panel";
		visionPanel.className = "ast-panel";
		visionPanel.style.cssText = "top:20px;right:20px;width:230px;";
		visionPanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Astraphobia Client</span><button class=\"ast-header-min\" id=\"visionMin\">−</button></div>\n      <div class=\"ast-body\" id=\"visionBody\">\n        <span class=\"ast-section-label\">Vision</span>\n        <button class=\"ast-btn patched\" id=\"thresherBtn\" disabled>Thresher Boost (Patched)</button>\n        <button class=\"ast-btn\" id=\"astraVisionBtn\">Astra-Vision</button>\n        <button class=\"ast-btn\" id=\"smallMinimapBtn\">Small Minimap</button>\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">ESP</span>\n        <button class=\"ast-btn\" id=\"espBtn\">ESP</button>\n        <select class=\"ast-select\" id=\"espModeSelect\"><option value=\"players\">Players</option><option value=\"food\">Food</option></select>\n        <button class=\"ast-btn\" id=\"trackNearestBtn\">Track Nearest (F3)</button>\n        <button class=\"ast-btn\" id=\"untrackBtn\">Untrack (F4)</button>\n        <div class=\"ast-sep\"></div>\n        <button class=\"ast-btn\" id=\"espColorsToggleBtn\" style=\"display:flex;align-items:center;justify-content:space-between;\">\n          <span style=\"font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-sec,#888);\">ESP Colors</span>\n          <span id=\"espColorsArrow\" style=\"color:var(--text-sec,#888);font-size:12px;\">▼</span>\n        </button>\n        <div id=\"espColorsSection\" style=\"display:none;\">\n          <div class=\"ast-key-row\"><span>Close (&lt;500)</span><input type=\"color\" id=\"espColorClose\" value=\"#ff0000\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Medium (&lt;1500)</span><input type=\"color\" id=\"espColorMedium\" value=\"#ffff00\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Far (&lt;3000)</span><input type=\"color\" id=\"espColorFar\" value=\"#00ffff\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Very Far</span><input type=\"color\" id=\"espColorVeryFar\" value=\"#00ff00\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Tracked</span><input type=\"color\" id=\"espColorTracked\" value=\"#ff00ff\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Food Close</span><input type=\"color\" id=\"espColorFoodClose\" value=\"#00ff00\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Food Medium</span><input type=\"color\" id=\"espColorFoodMedium\" value=\"#88ff88\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n          <div class=\"ast-key-row\"><span>Food Far</span><input type=\"color\" id=\"espColorFoodFar\" value=\"#44cc44\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n        </div>\n      </div>";
		document.body.appendChild(visionPanel);
		const visionBodyElement = visionPanel.querySelector("#visionBody");
		let isVisionHidden = false;
		visionPanel.querySelector("#visionMin").onclick = (event) => {
			event.stopPropagation();
			isVisionHidden = !isVisionHidden;
			visionBodyElement.style.display = isVisionHidden ? "none" : "block";
			visionPanel.querySelector("#visionMin").textContent = isVisionHidden ? "+" : "−";
		};
		visionPanel.querySelector("#thresherBtn").onclick = (clickEvent) => {
			clickEvent.preventDefault();
			showNotification("Thresher boost has been patched");
		};
		const astraVisionButton = visionPanel.querySelector("#astraVisionBtn");
		astraVisionButton.onclick = () => {
			if (state.isActive) {
				showNotification("Already active");
				return;
			}
			initAntiDetection();
			if (!state.animalData) {
				showNotification("Loading... click again in 2s");
				setTimeout(() => {
					initializeAstraVision();
					astraVisionButton.textContent = "Astra-Vision ✓";
					astraVisionButton.classList.add("toggle-on");
					astraVisionButton.disabled = true;
				}, 2e3);
				return;
			}
			initializeAstraVision();
			astraVisionButton.textContent = "Astra-Vision ✓";
			astraVisionButton.classList.add("toggle-on");
			astraVisionButton.disabled = true;
		};
		const smallMinimapButton = visionPanel.querySelector("#smallMinimapBtn");
		smallMinimapButton.onclick = () => {
			initAntiDetection();
			if (!state.animalData) {
				showNotification("Not in game yet");
				return;
			}
			if (!state.animalData.minimap) {
				showNotification("Minimap not available");
				return;
			}
			toggleMinimapSize();
			smallMinimapButton.textContent = state.isMinimapSmall ? "Minimap: Small" : "Small Minimap";
			smallMinimapButton.classList.toggle("toggle-on", state.isMinimapSmall);
		};
		const espButton = visionPanel.querySelector("#espBtn");
		espButton.onclick = () => {
			toggleEsp();
			espButton.textContent = window.espEnabled ? "ESP ✓" : "ESP";
			espButton.classList.toggle("toggle-on", window.espEnabled);
		};
		const espModeSelect = visionPanel.querySelector("#espModeSelect");
		espModeSelect.value = window.espMode || "players";
		espModeSelect.onchange = (changeEvent) => {
			window.espMode = changeEvent.target.value;
			showNotification("ESP: " + changeEvent.target.value);
		};
		visionPanel.querySelector("#trackNearestBtn").onclick = () => trackNearestPlayer();
		visionPanel.querySelector("#untrackBtn").onclick = () => clearTracking();
		const espColorsToggleButton = visionPanel.querySelector("#espColorsToggleBtn");
		const espColorsSection = visionPanel.querySelector("#espColorsSection");
		const espColorsArrow = visionPanel.querySelector("#espColorsArrow");
		let isEspColorsExpanded = false;
		espColorsToggleButton.onclick = () => {
			isEspColorsExpanded = !isEspColorsExpanded;
			espColorsSection.style.display = isEspColorsExpanded ? "block" : "none";
			espColorsArrow.textContent = isEspColorsExpanded ? "▲" : "▼";
		};
		Object.entries({
			espColorClose: "close",
			espColorMedium: "medium",
			espColorFar: "far",
			espColorVeryFar: "veryFar",
			espColorTracked: "tracked",
			espColorFoodClose: "foodClose",
			espColorFoodMedium: "foodMedium",
			espColorFoodFar: "foodFar"
		}).forEach(([elementId, colorKey]) => {
			const targetElement = visionPanel.querySelector("#" + elementId);
			if (targetElement) targetElement.addEventListener("input", (colorInputEvent) => {
				window.espColors[colorKey] = colorInputEvent.target.value;
			});
		});
		makeElementDraggable(visionPanel);
		return visionPanel;
	}
	function createCombatPanel() {
		const combatPanel = document.createElement("div");
		combatPanel.id = "combat-panel";
		combatPanel.className = "ast-panel";
		combatPanel.style.cssText = "top:20px;left:260px;width:230px;";
		combatPanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Astraphobia Client</span><button class=\"ast-header-min\" id=\"combatMin\">−</button></div>\n      <div class=\"ast-body\" id=\"combatBody\">\n        <span class=\"ast-section-label\">Combat</span>\n        <button class=\"ast-btn\" id=\"lockBtn\">Lock Nearest</button>\n        <div class=\"ast-key-row\"><span>Lock Key</span><input class=\"ast-key-capture\" id=\"lockKeyInput\" type=\"text\" value=\"T\" readonly></div>\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">Tracking</span>\n        <div class=\"ast-key-row\" style=\"margin-top:4px;\">\n          <span>Trail Color</span>\n          <input type=\"color\" id=\"trailColorPicker\" value=\"#ff9600\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;background:var(--bg2,#242424);cursor:pointer;padding:0;\">\n        </div>\n        <div class=\"ast-key-row\"><span>Trace Key (re-targets)</span><input class=\"ast-key-capture\" id=\"traceKeyInput\" type=\"text\" value=\"H\" readonly></div>\n      </div>";
		document.body.appendChild(combatPanel);
		const combatBody = combatPanel.querySelector("#combatBody");
		let isCombatPanelMinimized = false;
		combatPanel.querySelector("#combatMin").onclick = (toggleEvent) => {
			toggleEvent.stopPropagation();
			isCombatPanelMinimized = !isCombatPanelMinimized;
			combatBody.style.display = isCombatPanelMinimized ? "none" : "block";
			combatPanel.querySelector("#combatMin").textContent = isCombatPanelMinimized ? "+" : "−";
		};
		const lockButton = combatPanel.querySelector("#lockBtn");
		lockButton.onclick = () => toggleLock();
		const lockKeyInput = combatPanel.querySelector("#lockKeyInput");
		lockKeyInput.value = window.lockKey.toUpperCase();
		lockKeyInput.addEventListener("keydown", (lockKeyEvent) => {
			lockKeyEvent.preventDefault();
			lockKeyEvent.stopPropagation();
			window.lockKey = lockKeyEvent.key;
			lockKeyInput.value = lockKeyEvent.key.length === 1 ? lockKeyEvent.key.toUpperCase() : lockKeyEvent.key;
		});
		combatPanel.querySelector("#trailColorPicker").addEventListener("input", (colorPickerEvent) => {
			const colorValue = colorPickerEvent.target.value;
			window.entityTrailColor = {
				r: parseInt(colorValue.slice(1, 3), 16),
				g: parseInt(colorValue.slice(3, 5), 16),
				b: parseInt(colorValue.slice(5, 7), 16)
			};
		});
		const traceKeyInput = combatPanel.querySelector("#traceKeyInput");
		traceKeyInput.value = window.entityTraceKey.toUpperCase();
		traceKeyInput.addEventListener("keydown", (traceKeyEvent) => {
			traceKeyEvent.preventDefault();
			traceKeyEvent.stopPropagation();
			window.entityTraceKey = traceKeyEvent.key.toLowerCase();
			traceKeyInput.value = traceKeyEvent.key.length === 1 ? traceKeyEvent.key.toUpperCase() : traceKeyEvent.key;
		});
		makeElementDraggable(combatPanel);
		return combatPanel;
	}
	function createAutomationPanel() {
		const automationPanel = document.createElement("div");
		automationPanel.id = "automation-panel";
		automationPanel.className = "ast-panel";
		automationPanel.style.cssText = "bottom:20px;left:260px;width:230px;";
		automationPanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Astraphobia Client</span><button class=\"ast-header-min\" id=\"autoMin\">−</button></div>\n      <div class=\"ast-body\" id=\"autoBody\">\n        <span class=\"ast-section-label\">Automation</span>\n        <button class=\"ast-btn\" id=\"autoDodgeBtn\">Auto Dodge</button>\n        <button class=\"ast-btn\" id=\"autoFarmBtn\">Auto Farm (F5)</button>\n        <select class=\"ast-select\" id=\"farmModeSelect\" style=\"margin-top:4px;\">\n          <option value=\"nearest\">Nearest Food</option>\n          <option value=\"cluster\">Food Clusters</option>\n          <option value=\"patrol\">Patrol Route</option>\n        </select>\n        <div class=\"ast-toggle-row\"><span>Boost</span><div class=\"ast-switch\"><input type=\"checkbox\" id=\"farmBoostToggle\" checked><span class=\"slider\"></span></div></div>\n        <div class=\"ast-toggle-row\"><span>Auto Evolve</span><div class=\"ast-switch\"><input type=\"checkbox\" id=\"farmEvolveToggle\" checked><span class=\"slider\"></span></div></div>\n        <div class=\"ast-toggle-row\"><span>Avoid Players</span><div class=\"ast-switch\"><input type=\"checkbox\" id=\"farmAvoidToggle\" checked><span class=\"slider\"></span></div></div>\n      </div>";
		document.body.appendChild(automationPanel);
		const automationBody = automationPanel.querySelector("#autoBody");
		let isAutomationPanelMinimized = false;
		automationPanel.querySelector("#autoMin").onclick = (event) => {
			event.stopPropagation();
			isAutomationPanelMinimized = !isAutomationPanelMinimized;
			automationBody.style.display = isAutomationPanelMinimized ? "none" : "block";
			automationPanel.querySelector("#autoMin").textContent = isAutomationPanelMinimized ? "+" : "−";
		};
		const autoDodgeButton = automationPanel.querySelector("#autoDodgeBtn");
		autoDodgeButton.onclick = () => {
			if (window.autoDodgeEnabled) {
				disableAutoDodge();
				autoDodgeButton.textContent = "Auto Dodge";
				autoDodgeButton.classList.remove("toggle-on");
			} else {
				enableAutoDodge();
				autoDodgeButton.textContent = "Dodging ✓";
				autoDodgeButton.classList.add("toggle-on");
			}
		};
		const autoFarmButton = automationPanel.querySelector("#autoFarmBtn");
		autoFarmButton.id = "autoFarmBtn";
		const farmModeSelect = automationPanel.querySelector("#farmModeSelect");
		autoFarmButton.onclick = () => {
			if (window.autoFarmActive) {
				stopAutoFarm();
				autoFarmButton.textContent = "Auto Farm (F5)";
				autoFarmButton.classList.remove("toggle-on");
			} else {
				startAutoFarm(farmModeSelect.value);
				autoFarmButton.textContent = "Stop Farm (F5)";
				autoFarmButton.classList.add("toggle-on");
			}
		};
		farmModeSelect.onchange = (farmModeChangeEvent) => {
			if (window.autoFarmActive) {
				window.autoFarmMode = farmModeChangeEvent.target.value;
				if (farmModeChangeEvent.target.value === "patrol") setupPatrolRoute();
				showNotification("Farm: " + farmModeChangeEvent.target.value);
			}
		};
		const farmBoostToggle = automationPanel.querySelector("#farmBoostToggle");
		const farmEvolveToggle = automationPanel.querySelector("#farmEvolveToggle");
		const farmAvoidToggle = automationPanel.querySelector("#farmAvoidToggle");
		farmBoostToggle.checked = window.autoFarmBoost;
		farmEvolveToggle.checked = window.autoFarmEvolve;
		farmAvoidToggle.checked = window.autoFarmAvoidPlayers;
		farmBoostToggle.nextElementSibling.addEventListener("click", (autoFarmToggleEvent) => {
			autoFarmToggleEvent.stopPropagation();
			farmBoostToggle.checked = !farmBoostToggle.checked;
			window.autoFarmBoost = farmBoostToggle.checked;
			showNotification(farmBoostToggle.checked ? "Farm boost ON" : "Farm boost OFF");
		});
		farmEvolveToggle.nextElementSibling.addEventListener("click", (autoCollectToggleEvent) => {
			autoCollectToggleEvent.stopPropagation();
			farmEvolveToggle.checked = !farmEvolveToggle.checked;
			window.autoFarmEvolve = farmEvolveToggle.checked;
			showNotification(farmEvolveToggle.checked ? "Auto evolve ON" : "Auto evolve OFF");
		});
		farmAvoidToggle.nextElementSibling.addEventListener("click", (autoSellToggleEvent) => {
			autoSellToggleEvent.stopPropagation();
			farmAvoidToggle.checked = !farmAvoidToggle.checked;
			window.autoFarmAvoidPlayers = farmAvoidToggle.checked;
			showNotification(farmAvoidToggle.checked ? "Avoid players ON" : "Avoid players OFF");
		});
		makeElementDraggable(automationPanel);
		return automationPanel;
	}
	function createSettingsPanel() {
		const settingsPanel = document.createElement("div");
		settingsPanel.id = "settings-panel";
		settingsPanel.className = "ast-panel";
		settingsPanel.style.cssText = "top:20px;left:20px;width:220px;";
		settingsPanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Settings</span><button class=\"ast-header-min\" id=\"settingsMin\">−</button></div>\n      <div class=\"ast-body\" id=\"settingsBody\">\n        <div class=\"ast-key-row\"><span>Toggle UI</span><input class=\"ast-key-capture\" id=\"toggleKeyInput\" type=\"text\" value=\"SHIFT\" readonly></div>\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">Background</span>\n        <div class=\"ast-row\"><input class=\"ast-input\" type=\"text\" id=\"bgUrl\" placeholder=\"Image URL...\" style=\"flex:1;\"><button class=\"ast-btn\" id=\"applyBg\" style=\"width:auto;padding:6px 10px;margin:0;\">Set</button></div>\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">Theme</span>\n        <select class=\"ast-select\" id=\"themeSelect\">\n          <option value=\"grey\">Grey</option><option value=\"blue\">Blue</option><option value=\"red\">Red</option>\n          <option value=\"green\">Green</option><option value=\"pink\">Pink</option><option value=\"starwars\">Star Wars</option>\n          <option value=\"kfc\">KFC</option><option value=\"halloween\">Halloween 🔒</option>\n        </select>\n        <div class=\"ast-sep\"></div>\n        <button class=\"ast-btn\" id=\"customThemeToggleBtn\" style=\"display:flex;align-items:center;justify-content:space-between;\">\n          <span style=\"font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-sec,#888);\">Create Theme</span>\n          <span id=\"customThemeArrow\" style=\"color:var(--text-sec,#888);font-size:12px;\">▼</span>\n        </button>\n        <div id=\"customThemeSection\" style=\"display:none;padding-top:4px;\">\n          <input class=\"ast-input\" type=\"text\" id=\"customThemeName\" placeholder=\"Theme name...\" style=\"width:100%;box-sizing:border-box;margin-bottom:4px;\">\n<div class=\"ast-key-row\"><span>Accent</span><input type=\"color\" id=\"ctAcc\" value=\"#888888\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n<div class=\"ast-key-row\"><span>Background</span><input type=\"color\" id=\"ctBg\" value=\"#1a1a1a\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n<div class=\"ast-key-row\"><span>Panel</span><input type=\"color\" id=\"ctPanel\" value=\"#242424\" style=\"width:40px;height:24px;border:1px solid var(--bdr,#333);border-radius:4px;cursor:pointer;padding:0;background:var(--bg2,#242424);\"></div>\n<button class=\"ast-btn\" id=\"saveCustomTheme\" style=\"margin-top:4px;\">Save Theme</button>\n        </div>\n        <div class=\"ast-sep\"></div>\n        <button class=\"ast-btn\" id=\"myThemesToggleBtn\" style=\"display:flex;align-items:center;justify-content:space-between;\">\n          <span style=\"font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-sec,#888);\">My Themes</span>\n          <span id=\"myThemesArrow\" style=\"color:var(--text-sec,#888);font-size:12px;\">▼</span>\n        </button>\n        <div id=\"myThemesSection\" style=\"display:none;padding-top:4px;\">\n          <div id=\"customThemeList\"></div>\n          <div id=\"noThemesMsg\" style=\"font-size:11px;color:#555;text-align:center;padding:8px 0;\">No custom themes yet</div>\n        </div>\n      </div>";
		document.body.appendChild(settingsPanel);
		const settingsBodyElement = settingsPanel.querySelector("#settingsBody");
		let isSettingsCollapsed = false;
		settingsPanel.querySelector("#settingsMin").onclick = (clickEvent) => {
			clickEvent.stopPropagation();
			isSettingsCollapsed = !isSettingsCollapsed;
			settingsBodyElement.style.display = isSettingsCollapsed ? "none" : "block";
			settingsPanel.querySelector("#settingsMin").textContent = isSettingsCollapsed ? "+" : "−";
		};
		const toggleKeyInput = settingsPanel.querySelector("#toggleKeyInput");
		toggleKeyInput.value = pressedKey.toUpperCase();
		toggleKeyInput.addEventListener("keydown", (keyboardEvent) => {
			keyboardEvent.preventDefault();
			pressedKey = keyboardEvent.key;
			toggleKeyInput.value = keyboardEvent.key.length === 1 ? keyboardEvent.key.toUpperCase() : keyboardEvent.key;
		});
		const bgUrlInput = settingsPanel.querySelector("#bgUrl");
		bgUrlInput.value = localStorage.getItem("bgUrl") || "";
		settingsPanel.querySelector("#applyBg").onclick = () => {
			const backgroundUrl = bgUrlInput.value.trim();
			if (!backgroundUrl) {
				showNotification("Enter a URL");
				return;
			}
			localStorage.setItem("bgUrl", backgroundUrl);
			initBackgroundImage();
			showNotification("Background applied");
		};
		const themeSelectElement = settingsPanel.querySelector("#themeSelect");
		const currentTheme = localStorage.getItem("theme") || "grey";
		const customThemes = JSON.parse(localStorage.getItem("customThemes") || "{}");
		themeSelectElement.value = [
			"grey",
			"blue",
			"red",
			"green",
			"pink",
			"starwars",
			"kfc",
			"halloween"
		].includes(currentTheme) || customThemes[currentTheme] ? currentTheme : "grey";
		themeSelectElement.onchange = (themeChangeEvent) => {
			const selectedThemeValue = themeChangeEvent.target.value;
			if (selectedThemeValue === "halloween") showHalloweenCodeModal((isHalloweenTheme) => {
				if (isHalloweenTheme) applyTheme("halloween");
				else themeChangeEvent.target.value = localStorage.getItem("theme") || "grey";
			});
			else {
				applyTheme(selectedThemeValue);
				showNotification("Theme: " + selectedThemeValue);
			}
		};
		const renderCustomThemeList = () => {
			const customThemeListElement = settingsPanel.querySelector("#customThemeList");
			const noThemesMessageElement = settingsPanel.querySelector("#noThemesMsg");
			const customThemesData = JSON.parse(localStorage.getItem("customThemes") || "{}");
			const themeKeys = Object.keys(customThemesData);
			customThemeListElement.innerHTML = "";
			noThemesMessageElement.style.display = themeKeys.length === 0 ? "block" : "none";
			themeKeys.forEach((currentTheme) => {
				const themeContainer = document.createElement("div");
				themeContainer.style.cssText = "display:flex;gap:4px;margin-bottom:3px;";
				themeContainer.innerHTML = "\n          <button class=\"ast-btn" + (localStorage.getItem("theme") === currentTheme ? " toggle-on" : "") + "\" style=\"flex:1;margin:0;\">" + currentTheme + "</button>\n          <button class=\"ast-btn\" style=\"width:32px;margin:0;text-align:center;color:#f44336;\">✕</button>";
				themeContainer.querySelectorAll("button")[0].onclick = () => {
					applyTheme(currentTheme);
					showNotification("Theme: " + currentTheme);
					renderCustomThemeList();
				};
				themeContainer.querySelectorAll("button")[1].onclick = () => {
					const customThemes = JSON.parse(localStorage.getItem("customThemes") || "{}");
					delete customThemes[currentTheme];
					localStorage.setItem("customThemes", JSON.stringify(customThemes));
					if (localStorage.getItem("theme") === currentTheme) {
						applyTheme("grey");
						themeSelectElement.value = "grey";
						showNotification("Theme reset to Grey");
					} else showNotification("Deleted: " + currentTheme);
					renderCustomThemeList();
				};
				customThemeListElement.appendChild(themeContainer);
			});
		};
		renderCustomThemeList();
		settingsPanel.querySelector("#saveCustomTheme").onclick = () => {
			const themeNameInput = settingsPanel.querySelector("#customThemeName").value.trim();
			if (!themeNameInput) {
				showNotification("Enter a theme name");
				return;
			}
			if ([
				"grey",
				"blue",
				"red",
				"green",
				"pink",
				"starwars",
				"kfc",
				"halloween"
			].includes(themeNameInput.toLowerCase())) {
				showNotification("Cannot use built-in theme name");
				return;
			}
			const accountValue = settingsPanel.querySelector("#ctAcc").value;
			const backgroundColor = settingsPanel.querySelector("#ctBg").value;
			const panelColor = settingsPanel.querySelector("#ctPanel").value;
			const redChannel = parseInt(accountValue.slice(1, 3), 16);
			const greenChannel = parseInt(accountValue.slice(3, 5), 16);
			const blueChannel = parseInt(accountValue.slice(5, 7), 16);
			const adjustHexColor = (hexColorCode) => {
				return "#" + [
					parseInt(hexColorCode.slice(1, 3), 16) + 10,
					parseInt(hexColorCode.slice(3, 5), 16) + 10,
					parseInt(hexColorCode.slice(5, 7), 16) + 10
				].map((colorChannelValue) => Math.min(255, colorChannelValue).toString(16).padStart(2, "0")).join("");
			};
			const themeConfig = {
				acc: accountValue,
				accH: adjustHexColor(accountValue),
				accRGB: redChannel + "," + greenChannel + "," + blueChannel,
				text: "#e0e0e0",
				textSec: "#888",
				bg1: backgroundColor,
				bg2: panelColor,
				bg3: adjustHexColor(panelColor),
				border: "#333",
				hover: adjustHexColor(panelColor)
			};
			const customThemes = JSON.parse(localStorage.getItem("customThemes") || "{}");
			customThemes[themeNameInput] = themeConfig;
			localStorage.setItem("customThemes", JSON.stringify(customThemes));
			applyTheme(themeNameInput);
			settingsPanel.querySelector("#customThemeName").value = "";
			renderCustomThemeList();
			showNotification("Theme saved: " + themeNameInput);
		};
		const customThemeToggleBtn = settingsPanel.querySelector("#customThemeToggleBtn");
		const customThemeSection = settingsPanel.querySelector("#customThemeSection");
		const customThemeArrow = settingsPanel.querySelector("#customThemeArrow");
		let isCustomThemeSectionExpanded = false;
		customThemeToggleBtn.onclick = () => {
			isCustomThemeSectionExpanded = !isCustomThemeSectionExpanded;
			customThemeSection.style.display = isCustomThemeSectionExpanded ? "block" : "none";
			customThemeArrow.textContent = isCustomThemeSectionExpanded ? "▲" : "▼";
		};
		const myThemesToggleBtn = settingsPanel.querySelector("#myThemesToggleBtn");
		const myThemesSection = settingsPanel.querySelector("#myThemesSection");
		const myThemesArrow = settingsPanel.querySelector("#myThemesArrow");
		let isThemesExpanded = false;
		myThemesToggleBtn.onclick = () => {
			isThemesExpanded = !isThemesExpanded;
			myThemesSection.style.display = isThemesExpanded ? "block" : "none";
			myThemesArrow.textContent = isThemesExpanded ? "▲" : "▼";
			if (isThemesExpanded) renderCustomThemeList();
		};
		makeElementDraggable(settingsPanel);
		return settingsPanel;
	}
	function createMusicPanel() {
		const musicPanel = document.createElement("div");
		musicPanel.id = "music-panel";
		musicPanel.className = "ast-panel";
		musicPanel.style.cssText = "bottom:20px;left:510px;width:240px;";
		musicPanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Music Player</span><button class=\"ast-header-min\" id=\"musicMin\">−</button></div>\n      <div class=\"ast-body\" id=\"musicBody\">\n        <div id=\"musicTrackName\" style=\"font-size:11px;color:var(--acc,#888);text-align:center;padding:4px 2px 8px 2px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;\">No tracks</div>\n\n        <div style=\"display:flex;gap:4px;justify-content:center;margin-bottom:8px;flex-wrap:wrap;\">\n          <button class=\"ast-btn\" id=\"musicPrevBtn\" style=\"width:48px;margin:0;text-align:center;padding:6px 4px;\">Prev</button>\n          <button class=\"ast-btn\" id=\"musicPlayBtn\" style=\"width:48px;margin:0;text-align:center;padding:6px 4px;\">Play</button>\n          <button class=\"ast-btn\" id=\"musicStopBtn\" style=\"width:48px;margin:0;text-align:center;padding:6px 4px;\">Stop</button>\n          <button class=\"ast-btn\" id=\"musicNextBtn\" style=\"width:48px;margin:0;text-align:center;padding:6px 4px;\">Next</button>\n        </div>\n\n        <div style=\"display:flex;gap:4px;justify-content:center;margin-bottom:8px;\">\n          <button class=\"ast-btn\" id=\"musicLoopBtn\" style=\"width:70px;margin:0;text-align:center;padding:6px 4px;\">Loop</button>\n          <button class=\"ast-btn\" id=\"musicShuffleBtn\" style=\"width:70px;margin:0;text-align:center;padding:6px 4px;\">Shuffle</button>\n        </div>\n\n        <div class=\"ast-key-row\" style=\"margin-bottom:6px;\">\n          <span>Volume</span>\n          <input type=\"range\" id=\"musicVolume\" min=\"0\" max=\"1\" step=\"0.05\" value=\"0.5\" style=\"width:120px;accent-color:var(--acc,#888);\">\n        </div>\n\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">Add Track</span>\n        <input class=\"ast-input\" type=\"text\" id=\"musicUrlInput\" placeholder=\"Audio or YouTube URL...\" style=\"width:100%;box-sizing:border-box;margin-bottom:4px;\">\n        <input class=\"ast-input\" type=\"text\" id=\"musicNameInput\" placeholder=\"Track name (optional)\" style=\"width:100%;box-sizing:border-box;margin-bottom:4px;\">\n        <button class=\"ast-btn\" id=\"musicAddBtn\">Add Track</button>\n\n        <div class=\"ast-sep\"></div>\n        <span class=\"ast-section-label\">Playlist</span>\n        <div id=\"musicTrackList\" style=\"max-height:150px;overflow-y:auto;\"></div>\n      </div>";
		document.body.appendChild(musicPanel);
		const musicBodyElement = musicPanel.querySelector("#musicBody");
		let isMusicHidden = false;
		musicPanel.querySelector("#musicMin").onclick = (event) => {
			event.stopPropagation();
			isMusicHidden = !isMusicHidden;
			musicBodyElement.style.display = isMusicHidden ? "none" : "block";
			musicPanel.querySelector("#musicMin").textContent = isMusicHidden ? "+" : "−";
		};
		musicPanel.querySelector("#musicPrevBtn").onclick = () => playPrevious();
		musicPanel.querySelector("#musicStopBtn").onclick = () => resetPlayback();
		musicPanel.querySelector("#musicNextBtn").onclick = () => playNextOrRandom();
		const musicPlayButton = musicPanel.querySelector("#musicPlayBtn");
		musicPlayButton.onclick = () => {
			if (!musicPlaylist.length) {
				showNotification("Add a track first");
				return;
			}
			if (isPlaying()) pausePlayback();
			else resumePlayback();
		};
		const musicLoopButton = musicPanel.querySelector("#musicLoopBtn");
		musicLoopButton.classList.toggle("toggle-on", uiaudioState.isMusicLoopEnabled);
		musicLoopButton.onclick = () => {
			uiaudioState.isMusicLoopEnabled = !uiaudioState.isMusicLoopEnabled;
			localStorage.setItem("musicLoop", uiaudioState.isMusicLoopEnabled);
			musicLoopButton.classList.toggle("toggle-on", uiaudioState.isMusicLoopEnabled);
			showNotification(uiaudioState.isMusicLoopEnabled ? "Loop ON" : "Loop OFF");
		};
		const musicShuffleButton = musicPanel.querySelector("#musicShuffleBtn");
		musicShuffleButton.classList.toggle("toggle-on", uiaudioState.isMusicShuffleEnabled);
		musicShuffleButton.onclick = () => {
			uiaudioState.isMusicShuffleEnabled = !uiaudioState.isMusicShuffleEnabled;
			localStorage.setItem("musicShuffle", uiaudioState.isMusicShuffleEnabled);
			musicShuffleButton.classList.toggle("toggle-on", uiaudioState.isMusicShuffleEnabled);
			showNotification(uiaudioState.isMusicShuffleEnabled ? "Shuffle ON" : "Shuffle OFF");
		};
		const musicVolumeControl = musicPanel.querySelector("#musicVolume");
		musicVolumeControl.value = uiaudioState.musicVolume;
		musicVolumeControl.oninput = (volumeChangeEvent) => {
			uiaudioState.musicVolume = parseFloat(volumeChangeEvent.target.value);
			localStorage.setItem("musicVolume", uiaudioState.musicVolume);
			if (audioPlayer) audioPlayer.volume = uiaudioState.musicVolume;
			if (youtubePlayer) try {
				youtubePlayer.setVolume(Math.round(uiaudioState.musicVolume * 100));
			} catch (unusedVariable) {}
		};
		musicPanel.querySelector("#musicAddBtn").onclick = () => {
			const musicUrl = musicPanel.querySelector("#musicUrlInput").value.trim();
			const musicName = musicPanel.querySelector("#musicNameInput").value.trim();
			if (!musicUrl) {
				showNotification("Enter a URL");
				return;
			}
			musicPanel.querySelector("#musicUrlInput").value = "";
			musicPanel.querySelector("#musicNameInput").value = "";
			addTrackToPlaylist(musicUrl, musicName);
		};
		updateMusicPanel();
		makeElementDraggable(musicPanel);
		return musicPanel;
	}
	function createUpdateHistoryPanel() {
		const updatePanel = document.createElement("div");
		updatePanel.id = "update-history";
		updatePanel.className = "ast-panel";
		updatePanel.style.cssText = "bottom:20px;left:20px;width:230px;max-height:280px;";
		updatePanel.innerHTML = "\n      <div class=\"ast-header\"><span class=\"ast-header-title\">Updates</span><button class=\"ast-header-min\" id=\"updateMin\">−</button></div>\n      <div class=\"ast-body\" id=\"updateBody\" style=\"overflow-y:auto;max-height:220px;\">\n        <ul class=\"ast-update-list\">\n        <li><strong>v1.9</strong> — Fixed ESP not fully working, added music player, and added auto-name (saves locally).</li>\n         <li><strong>v1.8</strong> — Fixed Astra-Vision (Shadows not being Removed), added Custom Themes Feature, fixed enable/disable for sliders, fixed ESP not working properly/gltiched.</li>\n          <li><strong>v1.7</strong> — New Features and Organization.</li>\n        </ul>\n      </div>";
		document.body.appendChild(updatePanel);
		const updateBody = updatePanel.querySelector("#updateBody");
		let isMinimized = false;
		updatePanel.querySelector("#updateMin").onclick = (event) => {
			event.stopPropagation();
			isMinimized = !isMinimized;
			updateBody.style.display = isMinimized ? "none" : "block";
			updatePanel.querySelector("#updateMin").textContent = isMinimized ? "+" : "−";
		};
		makeElementDraggable(updatePanel);
		return updatePanel;
	}
	let pressedKey = "Shift";
	//#endregion
	//#region extension/src/features/adblock.js
	let isVideoPlaying = false;
	function initAdBlocker() {
		if (isVideoPlaying) return;
		isVideoPlaying = true;
		const adSelectors = [
			"div.ad-block",
			"a[href*=\"ad\"]",
			"iframe[src*=\"ads\"], iframe[src*=\"googlead\"]",
			".advertisement",
			"[class*=\"ads\"], [class*=\"ad-\"]",
			"[id*=\"ad\"], [id*=\"banner\"]",
			".sidebar.left > a",
			".sidebar.left > div:not(.sidebar-content)",
			"div.sidebar.left > div:has(> iframe)",
			"div.sidebar.left > div:has(> a[href*=\"doubleclick\"])"
		];
		const removeAds = () => {
			adSelectors.forEach((elementSelector) => {
				document.querySelectorAll(elementSelector).forEach((targetElement) => {
					targetElement.style.display = "none";
					targetElement.style.opacity = "0";
					targetElement.style.pointerEvents = "none";
					targetElement.style.visibility = "hidden";
					targetElement.removeAttribute("src");
					targetElement.remove();
				});
			});
			const leftSidebarElement = document.querySelector("div.sidebar.left");
			if (leftSidebarElement) {
				leftSidebarElement.style.maxWidth = "30vw";
				leftSidebarElement.style.width = "21rem";
				leftSidebarElement.style.overflow = "hidden";
			}
		};
		removeAds();
		new MutationObserver(removeAds).observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true
		});
		setInterval(removeAds, 5e3);
		showNotification("Ad blocker active");
	}
	//#endregion
	//#region extension/src/core.js
	let metadataMap = /* @__PURE__ */ new WeakMap();
	function wrapWithProxy(targetObject, propertyKey, handler) {
		const originalValue = targetObject[propertyKey];
		const proxyValue = new Proxy(originalValue, handler);
		metadataMap.set(proxyValue, originalValue);
		targetObject[propertyKey] = proxyValue;
	}
	const configStore = {};
	function getEntityManager(gameState) {
		if (!gameState) gameState = getGameState();
		if (!gameState) return null;
		if (window.__cachedEM) return window.__cachedEM;
		if (configStore.entityManager) {
			const entityManager = gameState[configStore.entityManager];
			if (entityManager) {
				window.__cachedEM = entityManager;
				return entityManager;
			}
		}
		for (const propertyKey of Object.keys(gameState)) {
			const propertyValue = gameState[propertyKey];
			if (propertyValue && typeof propertyValue === "object" && !Array.isArray(propertyValue) && (propertyValue.entitiesList || propertyValue.entitiesById)) {
				window.__cachedEM = propertyValue;
				return propertyValue;
			}
		}
		return null;
	}
	function getFirstAnimal() {
		try {
			const gameState = getGameState();
			if (!gameState) return null;
			if (gameState.myAnimals && gameState.myAnimals.length > 0) return gameState.myAnimals[0];
			if (gameState.myPiranhas && gameState.myPiranhas.length > 0) return gameState.myPiranhas[0];
			return null;
		} catch (error) {
			return null;
		}
	}
	function getViewportScale() {
		try {
			const stateWithViewport = window.__ss?.states?.find((gameContext) => gameContext?.gameScene?.game?.viewport?.scale?.x);
			if (stateWithViewport) return stateWithViewport.gameScene.game.viewport.scale.x;
		} catch (err) {}
		return .554;
	}
	let isProcessed = false;
	let dragState = {
		dragging: false,
		offsetX: 0,
		offsetY: 0,
		x: null,
		y: 20
	};
	let isToggled = false;
	function initializeApplication() {
		if (isToggled) return;
		isToggled = true;
		setTimeout(() => {
			injectStyles();
			applyTheme(localStorage.getItem("theme") || "grey");
			createToolsPanel();
			createVisionPanel();
			createCombatPanel();
			createAutomationPanel();
			createSettingsPanel();
			createUpdateHistoryPanel();
			createMusicPanel();
			initBackgroundImage();
			initAdBlocker();
			initRadarDrag();
			initAutofillName();
			renderEspLoop();
			renderLoop();
			isProcessed = true;
			updateLockLoop();
			state.isTextInterceptorInitialized = true;
			autoDodgeLoop();
		}, 1e3);
	}
	const state = {
		currentTime: 0,
		isLooping: false,
		currentTrackIndex: 0,
		animationIntervalId: null,
		gameInstance: null,
		animalData: null,
		isActive: false,
		isMinimapSmall: false,
		isTextInterceptorInitialized: false
	};
	//#endregion
	//#region extension/src/ui/radar.js
	function getGameCanvas() {
		return document.querySelector("#gameCanvas") || document.querySelector("canvas") || document.querySelector("#canvas-container canvas");
	}
	function updateLockButtonUI() {
		const lockButton = document.getElementById("lockBtn");
		if (lockButton) {
			lockButton.textContent = window.lockEnabled && window.lockTargetId ? "Unlock" : "Lock Nearest";
			lockButton.classList.toggle("toggle-on", !!window.lockEnabled && !!window.lockTargetId);
		}
	}
	function getOrCreateCanvas(canvasId, zIndex) {
		let canvasElement = document.getElementById(canvasId);
		if (!canvasElement) {
			canvasElement = document.createElement("canvas");
			canvasElement.id = canvasId;
			canvasElement.style.cssText = "position:fixed;top:0;left:0;pointer-events:none;z-index:" + zIndex + ";";
			document.body.appendChild(canvasElement);
		}
		const gameViewport = getGameCanvas();
		if (gameViewport) {
			const rect = gameViewport.getBoundingClientRect();
			if (canvasElement.width !== rect.width || canvasElement.height !== rect.height) {
				canvasElement.width = rect.width;
				canvasElement.height = rect.height;
			}
			canvasElement.style.left = rect.left + "px";
			canvasElement.style.top = rect.top + "px";
			canvasElement.style.width = rect.width + "px";
			canvasElement.style.height = rect.height + "px";
		} else if (canvasElement.width !== window.innerWidth || canvasElement.height !== window.innerHeight) {
			canvasElement.width = window.innerWidth;
			canvasElement.height = window.innerHeight;
		}
		return canvasElement;
	}
	function initRadarDrag() {
		if (window._radarDragInit) return;
		window._radarDragInit = true;
		document.addEventListener("mousedown", (updateRadarBounds) => {
			const radarBounds = window._radarBounds;
			if (!radarBounds || !window.espEnabled) return;
			if (updateRadarBounds.clientX >= radarBounds.x && updateRadarBounds.clientX <= radarBounds.x + radarBounds.w && updateRadarBounds.clientY >= radarBounds.y && updateRadarBounds.clientY <= radarBounds.y + radarBounds.h) {
				dragState.dragging = true;
				dragState.offsetX = updateRadarBounds.clientX - radarBounds.x;
				dragState.offsetY = updateRadarBounds.clientY - radarBounds.y;
				updateRadarBounds.preventDefault();
				updateRadarBounds.stopPropagation();
			}
		}, true);
		document.addEventListener("mousemove", (mouseMoveEvent) => {
			if (!dragState.dragging) return;
			dragState.x = mouseMoveEvent.clientX - dragState.offsetX;
			dragState.y = mouseMoveEvent.clientY - dragState.offsetY;
			mouseMoveEvent.preventDefault();
		}, true);
		document.addEventListener("mouseup", (mouseUpEvent) => {
			if (dragState.dragging) {
				dragState.dragging = false;
				mouseUpEvent.preventDefault();
			}
		}, true);
	}
	//#endregion
	//#region extension/src/features/movement.js
	let currentAngleIndex = 0;
	const angleSteps = [
		0,
		30,
		60,
		90,
		120,
		150,
		180,
		210,
		240,
		270,
		300,
		330
	];
	const orbitRadius = 300;
	function startAutoPointerMovement() {
		if (state.animationIntervalId) return;
		const canvas = getGameCanvas();
		if (!canvas) {
			showNotification("Canvas not found");
			return;
		}
		state.animationIntervalId = setInterval(() => {
			const radius = angleSteps[currentAngleIndex];
			const angleRadians = Math.PI * 2 * radius / 360;
			const offsetX = Math.round(orbitRadius * Math.sin(angleRadians));
			const offsetY = Math.round(orbitRadius * Math.cos(angleRadians));
			canvas.dispatchEvent(new MouseEvent("pointermove", {
				clientX: window.innerWidth / 2 + offsetX,
				clientY: window.innerHeight / 2 + offsetY,
				bubbles: true
			}));
			currentAngleIndex = (currentAngleIndex + 1) % angleSteps.length;
		}, 15);
	}
	function stopAutoPointerMovement() {
		if (state.animationIntervalId) {
			clearInterval(state.animationIntervalId);
			state.animationIntervalId = null;
		}
	}
	function toggleAutoPointerMovement() {
		if (state.animationIntervalId) stopAutoPointerMovement();
		else startAutoPointerMovement();
	}
	function getAnimalPosition() {
		try {
			const animal = getFirstAnimal();
			if (!animal) return null;
			const position = animal.position;
			return {
				x: position._x !== void 0 ? position._x : position.x,
				y: position._y !== void 0 ? position._y : position.y
			};
		} catch (error) {
			return null;
		}
	}
	function extractPosition(entity) {
		if (!entity || !entity.position) return null;
		return {
			x: entity.position._x !== void 0 ? entity.position._x : entity.position.x,
			y: entity.position._y !== void 0 ? entity.position._y : entity.position.y
		};
	}
	function calculateDirection(entity) {
		if (!entity) return {
			dirX: 1,
			dirY: 0
		};
		let dirX = 0;
		let dirY = 0;
		if (entity.velocity) {
			dirX = entity.velocity._x || entity.velocity.x || 0;
			dirY = entity.velocity._y || entity.velocity.y || 0;
		}
		if (Math.abs(dirX) < .01 && Math.abs(dirY) < .01) {
			const rotation = entity.rotation || entity.angle || entity._rotation || 0;
			dirX = Math.cos(rotation);
			dirY = Math.sin(rotation);
		}
		const magnitude = Math.sqrt(dirX * dirX + dirY * dirY);
		if (magnitude > .001) {
			dirX /= magnitude;
			dirY /= magnitude;
		} else {
			dirX = 1;
			dirY = 0;
		}
		return {
			dirX,
			dirY
		};
	}
	function calculateDistance(x1, y1, x2, y2) {
		return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
	}
	function buildEntityState() {
		try {
			const parsedState = getEntityManager(getGameState());
			const localPlayer = getFirstAnimal();
			const localPos = getAnimalPosition();
			if (!parsedState || !localPlayer || !localPos) return null;
			const gameState = {
				myId: localPlayer.id,
				myPos: localPos,
				entities: [],
				players: [],
				food: []
			};
			const entitiesList = parsedState.entitiesList || [];
			for (let i = 0; i < entitiesList.length; i++) {
				const entity = entitiesList[i];
				if (!entity || entity.id === localPlayer.id) continue;
				if (localPlayer.playerRoomId && entity.playerRoomId === localPlayer.playerRoomId) continue;
				const entityPos = extractPosition(entity);
				if (!entityPos || entityPos.x == null || entityPos.y == null) continue;
				const dx = entityPos.x - localPos.x;
				const dy = entityPos.y - localPos.y;
				const distance = Math.sqrt(dx * dx + dy * dy);
				const entityData = {
					id: entity.id,
					x: entityPos.x,
					y: entityPos.y,
					distance,
					angle: Math.atan2(dy, dx),
					entity: {
						...entity,
						name: entity.entityName || entity.name || null
					}
				};
				gameState.entities.push(entityData);
				if (entity.type === 1 || isValidEntity(entity)) gameState.players.push(entityData);
				else if (entity.type === 2 || !isValidEntity(entity)) gameState.food.push(entityData);
			}
			gameState.players.sort((firstItem, secondItem) => firstItem.distance - secondItem.distance);
			gameState.food.sort((itemA, itemB) => itemA.distance - itemB.distance);
			return gameState;
		} catch (error) {
			return { error: error.message };
		}
	}
	function moveAndClickElement(targetX, targetY, shouldClick) {
		const element = getGameCanvas();
		if (!element) return;
		const playerPosition = getAnimalPosition();
		if (!playerPosition) return;
		const rect = element.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		const diffX = targetX - playerPosition.x;
		const diffY = targetY - playerPosition.y;
		const distance = Math.sqrt(diffX * diffX + diffY * diffY);
		let multiplier = 1;
		if (distance > 5e3) multiplier = 3;
		else if (distance > 2e3) multiplier = 2;
		else if (distance > 1e3) multiplier = 1.5;
		else if (distance > 500) multiplier = 1.2;
		else if (distance < 50) multiplier = .5;
		else if (distance < 150) multiplier = .8;
		let scaledX = diffX * multiplier;
		let scaledY = diffY * multiplier;
		const maxRadius = Math.min(rect.width, rect.height) * .85;
		const scaledDistance = Math.sqrt(scaledX * scaledX + scaledY * scaledY);
		if (scaledDistance > maxRadius) {
			const clampRatio = maxRadius / scaledDistance;
			scaledX *= clampRatio;
			scaledY *= clampRatio;
		}
		const finalX = centerX + scaledX;
		const finalY = centerY + scaledY;
		element.dispatchEvent(new MouseEvent("pointermove", {
			clientX: finalX,
			clientY: finalY,
			bubbles: true,
			view: window
		}));
		if (shouldClick) simulateClick(finalX, finalY);
	}
	//#endregion
	//#region extension/content.js
	initializeApplication();
	//#endregion
})();

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsIm5hbWVzIjpbXSwic291cmNlcyI6WyIuLi9leHRlbnNpb24vc3JjL3V0aWxzLmpzIiwiLi4vZXh0ZW5zaW9uL3NyYy9zdG9yYWdlLmpzIiwiLi4vZXh0ZW5zaW9uL3NyYy91aS9hdWRpby5qcyIsIi4uL2V4dGVuc2lvbi9zcmMvdWkvaW50ZXJhY3Rpb24uanMiLCIuLi9leHRlbnNpb24vc3JjL2ZlYXR1cmVzL2FpbWJvdC5qcyIsIi4uL2V4dGVuc2lvbi9zcmMvZmVhdHVyZXMvYXV0b2Zhcm0uanMiLCIuLi9leHRlbnNpb24vc3JjL3VpL3RoZW1lLmpzIiwiLi4vZXh0ZW5zaW9uL3NyYy9mZWF0dXJlcy9jaGF0LmpzIiwiLi4vZXh0ZW5zaW9uL3NyYy9mZWF0dXJlcy9hbnRpZGV0ZWN0aW9uLmpzIiwiLi4vZXh0ZW5zaW9uL3NyYy9mZWF0dXJlcy94cmF5LmpzIiwiLi4vZXh0ZW5zaW9uL3NyYy9mZWF0dXJlcy9lc3AuanMiLCIuLi9leHRlbnNpb24vc3JjL3VpL3BhbmVscy5qcyIsIi4uL2V4dGVuc2lvbi9zcmMvZmVhdHVyZXMvYWRibG9jay5qcyIsIi4uL2V4dGVuc2lvbi9zcmMvY29yZS5qcyIsIi4uL2V4dGVuc2lvbi9zcmMvdWkvcmFkYXIuanMiLCIuLi9leHRlbnNpb24vc3JjL2ZlYXR1cmVzL21vdmVtZW50LmpzIiwiLi4vZXh0ZW5zaW9uL2NvbnRlbnQuanMiXSwic291cmNlc0NvbnRlbnQiOlsiXG5mdW5jdGlvbiBnZW5lcmF0ZVJhbmRvbVN0cmluZyhzdHJpbmdMZW5ndGgpIHtcbiAgbGV0IHJlc3VsdFN0cmluZyA9IFwiXCI7XG4gIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBzdHJpbmdMZW5ndGg7IGluZGV4KyspIHtcbiAgICBjb25zdCByYW5kb21Db2RlUG9pbnQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDQ4NTc1ICsgNjU1MzYpO1xuICAgIHJlc3VsdFN0cmluZyArPSBTdHJpbmcuZnJvbUNvZGVQb2ludChyYW5kb21Db2RlUG9pbnQpO1xuICB9XG4gIHJldHVybiByZXN1bHRTdHJpbmc7XG59XG5jb25zdCBnZXRBbGxQcm9wZXJ0eU5hbWVzID0gdGFyZ2V0T2JqZWN0ID0+IHtcbiAgcmV0dXJuIFsuLi5PYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhPYmplY3QuZ2V0UHJvdG90eXBlT2YodGFyZ2V0T2JqZWN0KSksIC4uLk9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRhcmdldE9iamVjdCldO1xufTtcbmZ1bmN0aW9uIGlzVmFsaWRFbnRpdHkoZW50aXR5KSB7XG4gIGlmICghZW50aXR5KSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChlbnRpdHkudHlwZSA9PT0gMSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGlmIChlbnRpdHkucGxheWVyUm9vbUlkICE9IG51bGwpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZiAoZW50aXR5LmVudGl0eU5hbWUgIT0gbnVsbCAmJiBlbnRpdHkuZW50aXR5TmFtZS5sZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgaWYgKGVudGl0eS52aXNpYmxlRmlzaExldmVsICE9IG51bGwgJiYgZW50aXR5LnZpc2libGVGaXNoTGV2ZWwgPiAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5leHBvcnQgeyBnZW5lcmF0ZVJhbmRvbVN0cmluZywgZ2V0QWxsUHJvcGVydHlOYW1lcywgaXNWYWxpZEVudGl0eSB9O1xuIiwiaW1wb3J0IHsgbXVzaWNQbGF5bGlzdCwgdXBkYXRlTXVzaWNQYW5lbCwgcmVzZXRQbGF5YmFjaywgdWlhdWRpb1N0YXRlIH0gZnJvbSAnLi91aS9hdWRpby5qcyc7XG5pbXBvcnQgeyBzaG93Tm90aWZpY2F0aW9uIH0gZnJvbSAnLi91aS9pbnRlcmFjdGlvbi5qcyc7XG5pbXBvcnQgeyBzdGF0ZSB9IGZyb20gJy4vY29yZS5qcyc7XG5cbmZ1bmN0aW9uIGFkZFRyYWNrVG9QbGF5bGlzdCh0cmFja1VybCwgdHJhY2tOYW1lKSB7XG4gIGlmICghdHJhY2tVcmwpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdHJhY2tOYW1lID0gdHJhY2tOYW1lIHx8IHRyYWNrVXJsLnNwbGl0KFwiL1wiKS5wb3AoKS5zcGxpdChcIj9cIilbMF0gfHwgXCJUcmFjayBcIiArIChtdXNpY1BsYXlsaXN0Lmxlbmd0aCArIDEpO1xuICBtdXNpY1BsYXlsaXN0LnB1c2goe1xuICAgIHVybDogdHJhY2tVcmwsXG4gICAgbmFtZTogdHJhY2tOYW1lXG4gIH0pO1xuICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcIm11c2ljUGxheWxpc3RcIiwgSlNPTi5zdHJpbmdpZnkobXVzaWNQbGF5bGlzdCkpO1xuICB1cGRhdGVNdXNpY1BhbmVsKCk7XG4gIHNob3dOb3RpZmljYXRpb24oXCJBZGRlZDogXCIgKyB0cmFja05hbWUpO1xufVxuZnVuY3Rpb24gcmVtb3ZlVHJhY2tGcm9tUGxheWxpc3QoaW5kZXhUb1JlbW92ZSkge1xuICBtdXNpY1BsYXlsaXN0LnNwbGljZShpbmRleFRvUmVtb3ZlLCAxKTtcbiAgaWYgKHN0YXRlLmN1cnJlbnRUcmFja0luZGV4ID49IG11c2ljUGxheWxpc3QubGVuZ3RoKSB7XG4gICAgc3RhdGUuY3VycmVudFRyYWNrSW5kZXggPSAwO1xuICB9XG4gIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwibXVzaWNQbGF5bGlzdFwiLCBKU09OLnN0cmluZ2lmeShtdXNpY1BsYXlsaXN0KSk7XG4gIGlmICghbXVzaWNQbGF5bGlzdC5sZW5ndGgpIHtcbiAgICByZXNldFBsYXliYWNrKCk7XG4gIH1cbiAgdXBkYXRlTXVzaWNQYW5lbCgpO1xufVxuXG5leHBvcnQgeyBhZGRUcmFja1RvUGxheWxpc3QsIHJlbW92ZVRyYWNrRnJvbVBsYXlsaXN0IH07XG4iLCJpbXBvcnQgeyBzaG93Tm90aWZpY2F0aW9uIH0gZnJvbSAnLi9pbnRlcmFjdGlvbi5qcyc7XG5pbXBvcnQgeyByZW1vdmVUcmFja0Zyb21QbGF5bGlzdCB9IGZyb20gJy4uL3N0b3JhZ2UuanMnO1xuaW1wb3J0IHsgc3RhdGUgfSBmcm9tICcuLi9jb3JlLmpzJztcblxubGV0IGF1ZGlvUGxheWVyID0gbnVsbDtcbmxldCBtdXNpY1BsYXlsaXN0ID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcIm11c2ljUGxheWxpc3RcIikgfHwgXCJbXVwiKTtcblxubGV0IHlvdXR1YmVQbGF5ZXIgPSBudWxsO1xubGV0IGlzWXRBcGlMb2FkZWQgPSBmYWxzZTtcbmxldCBpc0F1dG9maWxsSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbmxldCBhdWRpb1NvdXJjZVR5cGUgPSBudWxsO1xuZnVuY3Rpb24gaXNZb3V0dWJlVXJsKHVybCkge1xuICByZXR1cm4gLyg/OnlvdXR1YmVcXC5jb218eW91dHVcXC5iZSkvaS50ZXN0KHVybCB8fCBcIlwiKTtcbn1cbmZ1bmN0aW9uIGdldFlvdXR1YmVWaWRlb0lkKHVybCkge1xuICBpZiAoIXVybCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHRyeSB7XG4gICAgY29uc3QgcGFyc2VkVXJsID0gbmV3IFVSTCh1cmwpO1xuICAgIGlmIChwYXJzZWRVcmwuaG9zdG5hbWUuaW5jbHVkZXMoXCJ5b3V0dS5iZVwiKSkge1xuICAgICAgcmV0dXJuIHBhcnNlZFVybC5wYXRobmFtZS5zbGljZSgxKS5zcGxpdChcIi9cIilbMF0gfHwgbnVsbDtcbiAgICB9XG4gICAgaWYgKHBhcnNlZFVybC5ob3N0bmFtZS5pbmNsdWRlcyhcInlvdXR1YmUuY29tXCIpKSB7XG4gICAgICByZXR1cm4gcGFyc2VkVXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJ2XCIpIHx8IChwYXJzZWRVcmwucGF0aG5hbWUuc3RhcnRzV2l0aChcIi9lbWJlZC9cIikgPyBwYXJzZWRVcmwucGF0aG5hbWUuc3BsaXQoXCIvZW1iZWQvXCIpWzFdPy5zcGxpdChcIi9cIilbMF0gOiBudWxsKSB8fCAocGFyc2VkVXJsLnBhdGhuYW1lLnN0YXJ0c1dpdGgoXCIvc2hvcnRzL1wiKSA/IHBhcnNlZFVybC5wYXRobmFtZS5zcGxpdChcIi9zaG9ydHMvXCIpWzFdPy5zcGxpdChcIi9cIilbMF0gOiBudWxsKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7fVxuICByZXR1cm4gbnVsbDtcbn1cbmZ1bmN0aW9uIGVuc3VyZVlvdXR1YmVBcGlSZWFkeShjYWxsYmFjaykge1xuICBpZiAoaXNZdEFwaUxvYWRlZCAmJiB3aW5kb3cuWVQgJiYgd2luZG93LllULlBsYXllcikge1xuICAgIGNhbGxiYWNrKCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghd2luZG93Ll9hc3RZdFJlYWR5Q2FsbGJhY2tzKSB7XG4gICAgd2luZG93Ll9hc3RZdFJlYWR5Q2FsbGJhY2tzID0gW107XG4gIH1cbiAgd2luZG93Ll9hc3RZdFJlYWR5Q2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuICBpZiAoaXNBdXRvZmlsbEluaXRpYWxpemVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlzQXV0b2ZpbGxJbml0aWFsaXplZCA9IHRydWU7XG4gIGlmICghZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhc3QteXQtYXBpXCIpKSB7XG4gICAgY29uc3Qgc2NyaXB0RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XG4gICAgc2NyaXB0RWxlbWVudC5pZCA9IFwiYXN0LXl0LWFwaVwiO1xuICAgIHNjcmlwdEVsZW1lbnQuc3JjID0gXCJodHRwczovL3d3dy55b3V0dWJlLmNvbS9pZnJhbWVfYXBpXCI7XG4gICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzY3JpcHRFbGVtZW50KTtcbiAgfVxuICBjb25zdCBvcmlnaW5hbFJlYWR5SGFuZGxlciA9IHdpbmRvdy5vbllvdVR1YmVJZnJhbWVBUElSZWFkeTtcbiAgd2luZG93Lm9uWW91VHViZUlmcmFtZUFQSVJlYWR5ID0gZnVuY3Rpb24gKCkge1xuICAgIGlzWXRBcGlMb2FkZWQgPSB0cnVlO1xuICAgIGlmICh0eXBlb2Ygb3JpZ2luYWxSZWFkeUhhbmRsZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgb3JpZ2luYWxSZWFkeUhhbmRsZXIoKTtcbiAgICAgIH0gY2F0Y2ggKHVuaW5pdGlhbGl6ZWRWYXIxKSB7fVxuICAgIH1cbiAgICBjb25zdCByZWFkeUNhbGxiYWNrcyA9IHdpbmRvdy5fYXN0WXRSZWFkeUNhbGxiYWNrcyB8fCBbXTtcbiAgICB3aGlsZSAocmVhZHlDYWxsYmFja3MubGVuZ3RoKSB7XG4gICAgICBjb25zdCBjdXJyZW50Q2FsbGJhY2sgPSByZWFkeUNhbGxiYWNrcy5zaGlmdCgpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY3VycmVudENhbGxiYWNrKCk7XG4gICAgICB9IGNhdGNoICh1bmluaXRpYWxpemVkVmFyMikge31cbiAgICB9XG4gIH07XG59XG5mdW5jdGlvbiBnZXRZb3V0dWJlSG9zdEVsZW1lbnQoKSB7XG4gIGxldCBob3N0RWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYXN0LXlvdXR1YmUtaG9zdFwiKTtcbiAgaWYgKCFob3N0RWxlbWVudCkge1xuICAgIGhvc3RFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICBob3N0RWxlbWVudC5pZCA9IFwiYXN0LXlvdXR1YmUtaG9zdFwiO1xuICAgIGhvc3RFbGVtZW50LnN0eWxlLmNzc1RleHQgPSBcInBvc2l0aW9uOmZpeGVkO2xlZnQ6LTk5OTk5cHg7dG9wOi05OTk5OXB4O3dpZHRoOjFweDtoZWlnaHQ6MXB4O29wYWNpdHk6MDtwb2ludGVyLWV2ZW50czpub25lO1wiO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoaG9zdEVsZW1lbnQpO1xuICB9XG4gIHJldHVybiBob3N0RWxlbWVudDtcbn1cbmZ1bmN0aW9uIHBsYXlZb3V0dWJlVmlkZW8odmlkZW9JZCkge1xuICBlbnN1cmVZb3V0dWJlQXBpUmVhZHkoKCkgPT4ge1xuICAgIGNvbnN0IHBsYXllckNvbnRhaW5lcklkID0gZ2V0WW91dHViZUhvc3RFbGVtZW50KCk7XG4gICAgaWYgKHlvdXR1YmVQbGF5ZXIgJiYgdHlwZW9mIHlvdXR1YmVQbGF5ZXIubG9hZFZpZGVvQnlJZCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICB5b3V0dWJlUGxheWVyLmxvYWRWaWRlb0J5SWQodmlkZW9JZCk7XG4gICAgICB0cnkge1xuICAgICAgICB5b3V0dWJlUGxheWVyLnNldFZvbHVtZShNYXRoLnJvdW5kKHVpYXVkaW9TdGF0ZS5tdXNpY1ZvbHVtZSAqIDEwMCkpO1xuICAgICAgfSBjYXRjaCAocGxheWVySW5zdGFuY2UpIHt9XG4gICAgICBhdWRpb1NvdXJjZVR5cGUgPSBcInlvdXR1YmVcIjtcbiAgICAgIHVwZGF0ZU11c2ljUGFuZWwoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgeW91dHViZVBsYXllciA9IG5ldyBZVC5QbGF5ZXIocGxheWVyQ29udGFpbmVySWQsIHtcbiAgICAgIHdpZHRoOiBcIjFcIixcbiAgICAgIGhlaWdodDogXCIxXCIsXG4gICAgICB2aWRlb0lkOiB2aWRlb0lkLFxuICAgICAgcGxheWVyVmFyczoge1xuICAgICAgICBhdXRvcGxheTogMSxcbiAgICAgICAgY29udHJvbHM6IDAsXG4gICAgICAgIGRpc2FibGVrYjogMSxcbiAgICAgICAgZnM6IDAsXG4gICAgICAgIG1vZGVzdGJyYW5kaW5nOiAxLFxuICAgICAgICByZWw6IDBcbiAgICAgIH0sXG4gICAgICBldmVudHM6IHtcbiAgICAgICAgb25SZWFkeTogYXVkaW9QbGF5ZXJFdmVudCA9PiB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF1ZGlvUGxheWVyRXZlbnQudGFyZ2V0LnNldFZvbHVtZShNYXRoLnJvdW5kKHVpYXVkaW9TdGF0ZS5tdXNpY1ZvbHVtZSAqIDEwMCkpO1xuICAgICAgICAgICAgYXVkaW9QbGF5ZXJFdmVudC50YXJnZXQucGxheVZpZGVvKCk7XG4gICAgICAgICAgfSBjYXRjaCAodW51c2VkVmFyaWFibGUpIHt9XG4gICAgICAgICAgYXVkaW9Tb3VyY2VUeXBlID0gXCJ5b3V0dWJlXCI7XG4gICAgICAgICAgdXBkYXRlTXVzaWNQYW5lbCgpO1xuICAgICAgICB9LFxuICAgICAgICBvblN0YXRlQ2hhbmdlOiB5b3V0dWJlUGxheWVyRXZlbnQgPT4ge1xuICAgICAgICAgIGlmICghd2luZG93LllUKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh5b3V0dWJlUGxheWVyRXZlbnQuZGF0YSA9PT0gWVQuUGxheWVyU3RhdGUuRU5ERUQpIHtcbiAgICAgICAgICAgIGlmICh1aWF1ZGlvU3RhdGUuaXNNdXNpY1NodWZmbGVFbmFibGVkKSB7XG4gICAgICAgICAgICAgIHBsYXlUcmFjayhNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBtdXNpY1BsYXlsaXN0Lmxlbmd0aCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh1aWF1ZGlvU3RhdGUuaXNNdXNpY0xvb3BFbmFibGVkKSB7XG4gICAgICAgICAgICAgIHBsYXlUcmFjayhzdGF0ZS5jdXJyZW50VHJhY2tJbmRleCArIDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdXBkYXRlTXVzaWNQYW5lbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoeW91dHViZVBsYXllckV2ZW50LmRhdGEgPT09IFlULlBsYXllclN0YXRlLlBMQVlJTkcgfHwgeW91dHViZVBsYXllckV2ZW50LmRhdGEgPT09IFlULlBsYXllclN0YXRlLlBBVVNFRCkge1xuICAgICAgICAgICAgdXBkYXRlTXVzaWNQYW5lbCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn1cbmZ1bmN0aW9uIHN0b3BBbGxQbGF5YmFjaygpIHtcbiAgaWYgKGF1ZGlvUGxheWVyKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF1ZGlvUGxheWVyLnBhdXNlKCk7XG4gICAgICBhdWRpb1BsYXllci5zcmMgPSBcIlwiO1xuICAgIH0gY2F0Y2ggKGF1ZGlvRXJyb3IpIHt9XG4gICAgYXVkaW9QbGF5ZXIgPSBudWxsO1xuICB9XG4gIGlmICh5b3V0dWJlUGxheWVyKSB7XG4gICAgdHJ5IHtcbiAgICAgIHlvdXR1YmVQbGF5ZXIuc3RvcFZpZGVvKCk7XG4gICAgfSBjYXRjaCAoeW91dHViZVN0b3BFcnJvcikge31cbiAgfVxuICBhdWRpb1NvdXJjZVR5cGUgPSBudWxsO1xufVxuZnVuY3Rpb24gcGxheVRyYWNrKHRyYWNrSW5kZXgpIHtcbiAgaWYgKCFtdXNpY1BsYXlsaXN0Lmxlbmd0aCkge1xuICAgIHNob3dOb3RpZmljYXRpb24oXCJObyB0cmFja3MgYWRkZWRcIik7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICh0cmFja0luZGV4IDwgMCkge1xuICAgIHRyYWNrSW5kZXggPSBtdXNpY1BsYXlsaXN0Lmxlbmd0aCAtIDE7XG4gIH1cbiAgaWYgKHRyYWNrSW5kZXggPj0gbXVzaWNQbGF5bGlzdC5sZW5ndGgpIHtcbiAgICB0cmFja0luZGV4ID0gMDtcbiAgfVxuICBzdGF0ZS5jdXJyZW50VHJhY2tJbmRleCA9IHRyYWNrSW5kZXg7XG4gIGNvbnN0IGN1cnJlbnRUcmFjayA9IG11c2ljUGxheWxpc3Rbc3RhdGUuY3VycmVudFRyYWNrSW5kZXhdO1xuICBpZiAoIWN1cnJlbnRUcmFjayB8fCAhY3VycmVudFRyYWNrLnVybCkge1xuICAgIHJldHVybjtcbiAgfVxuICBzdG9wQWxsUGxheWJhY2soKTtcbiAgaWYgKGlzWW91dHViZVVybChjdXJyZW50VHJhY2sudXJsKSkge1xuICAgIGNvbnN0IHlvdXR1YmVWaWRlb0lkID0gZ2V0WW91dHViZVZpZGVvSWQoY3VycmVudFRyYWNrLnVybCk7XG4gICAgaWYgKCF5b3V0dWJlVmlkZW9JZCkge1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihcIkludmFsaWQgWW91VHViZSBsaW5rXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBwbGF5WW91dHViZVZpZGVvKHlvdXR1YmVWaWRlb0lkKTtcbiAgICBhdWRpb1NvdXJjZVR5cGUgPSBcInlvdXR1YmVcIjtcbiAgICB1cGRhdGVNdXNpY1BhbmVsKCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGF1ZGlvUGxheWVyID0gbmV3IEF1ZGlvKGN1cnJlbnRUcmFjay51cmwpO1xuICBhdWRpb1BsYXllci52b2x1bWUgPSB1aWF1ZGlvU3RhdGUubXVzaWNWb2x1bWU7XG4gIGF1ZGlvUGxheWVyLmxvb3AgPSBmYWxzZTtcbiAgYXVkaW9Tb3VyY2VUeXBlID0gXCJhdWRpb1wiO1xuICBhdWRpb1BsYXllci5wbGF5KCkuY2F0Y2goKCkgPT4ge1xuICAgIHNob3dOb3RpZmljYXRpb24oXCJDYW5ub3QgcGxheSBhdWRpbyBVUkxcIik7XG4gIH0pO1xuICBhdWRpb1BsYXllci5vbmVuZGVkID0gKCkgPT4ge1xuICAgIGlmICh1aWF1ZGlvU3RhdGUuaXNNdXNpY1NodWZmbGVFbmFibGVkKSB7XG4gICAgICBwbGF5VHJhY2soTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogbXVzaWNQbGF5bGlzdC5sZW5ndGgpKTtcbiAgICB9IGVsc2UgaWYgKHVpYXVkaW9TdGF0ZS5pc011c2ljTG9vcEVuYWJsZWQpIHtcbiAgICAgIHBsYXlUcmFjayhzdGF0ZS5jdXJyZW50VHJhY2tJbmRleCArIDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICB1cGRhdGVNdXNpY1BhbmVsKCk7XG4gICAgfVxuICB9O1xuICBhdWRpb1BsYXllci5vbnBsYXkgPSB1cGRhdGVNdXNpY1BhbmVsO1xuICBhdWRpb1BsYXllci5vbnBhdXNlID0gdXBkYXRlTXVzaWNQYW5lbDtcbiAgdXBkYXRlTXVzaWNQYW5lbCgpO1xufVxuZnVuY3Rpb24gcGF1c2VQbGF5YmFjaygpIHtcbiAgaWYgKGF1ZGlvU291cmNlVHlwZSA9PT0gXCJhdWRpb1wiICYmIGF1ZGlvUGxheWVyKSB7XG4gICAgYXVkaW9QbGF5ZXIucGF1c2UoKTtcbiAgfSBlbHNlIGlmIChhdWRpb1NvdXJjZVR5cGUgPT09IFwieW91dHViZVwiICYmIHlvdXR1YmVQbGF5ZXIpIHtcbiAgICB0cnkge1xuICAgICAgeW91dHViZVBsYXllci5wYXVzZVZpZGVvKCk7XG4gICAgfSBjYXRjaCAoeW91dHViZVBhdXNlRXJyb3IpIHt9XG4gIH1cbiAgdXBkYXRlTXVzaWNQYW5lbCgpO1xufVxuZnVuY3Rpb24gcmVzdW1lUGxheWJhY2soKSB7XG4gIGlmIChhdWRpb1NvdXJjZVR5cGUgPT09IFwiYXVkaW9cIiAmJiBhdWRpb1BsYXllcikge1xuICAgIGF1ZGlvUGxheWVyLnBsYXkoKS5jYXRjaCgoKSA9PiB7fSk7XG4gIH0gZWxzZSBpZiAoYXVkaW9Tb3VyY2VUeXBlID09PSBcInlvdXR1YmVcIiAmJiB5b3V0dWJlUGxheWVyKSB7XG4gICAgdHJ5IHtcbiAgICAgIHlvdXR1YmVQbGF5ZXIucGxheVZpZGVvKCk7XG4gICAgfSBjYXRjaCAoeW91dHViZVBsYXlFcnJvcikge31cbiAgfSBlbHNlIGlmIChtdXNpY1BsYXlsaXN0Lmxlbmd0aCkge1xuICAgIHBsYXlUcmFjayhzdGF0ZS5jdXJyZW50VHJhY2tJbmRleCk7XG4gIH1cbiAgdXBkYXRlTXVzaWNQYW5lbCgpO1xufVxuZnVuY3Rpb24gcmVzZXRQbGF5YmFjaygpIHtcbiAgaWYgKGF1ZGlvU291cmNlVHlwZSA9PT0gXCJhdWRpb1wiICYmIGF1ZGlvUGxheWVyKSB7XG4gICAgYXVkaW9QbGF5ZXIucGF1c2UoKTtcbiAgICBhdWRpb1BsYXllci5jdXJyZW50VGltZSA9IDA7XG4gIH0gZWxzZSBpZiAoYXVkaW9Tb3VyY2VUeXBlID09PSBcInlvdXR1YmVcIiAmJiB5b3V0dWJlUGxheWVyKSB7XG4gICAgdHJ5IHtcbiAgICAgIHlvdXR1YmVQbGF5ZXIuc3RvcFZpZGVvKCk7XG4gICAgfSBjYXRjaCAoeW91dHViZVJlc2V0RXJyb3IpIHt9XG4gIH1cbiAgYXVkaW9Tb3VyY2VUeXBlID0gbnVsbDtcbiAgdXBkYXRlTXVzaWNQYW5lbCgpO1xufVxuZnVuY3Rpb24gaXNQbGF5aW5nKCkge1xuICBpZiAoYXVkaW9Tb3VyY2VUeXBlID09PSBcImF1ZGlvXCIgJiYgYXVkaW9QbGF5ZXIpIHtcbiAgICByZXR1cm4gIWF1ZGlvUGxheWVyLnBhdXNlZDtcbiAgfVxuICBpZiAoYXVkaW9Tb3VyY2VUeXBlID09PSBcInlvdXR1YmVcIiAmJiB5b3V0dWJlUGxheWVyICYmIHdpbmRvdy5ZVCkge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4geW91dHViZVBsYXllci5nZXRQbGF5ZXJTdGF0ZSgpID09PSBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7fVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbmZ1bmN0aW9uIHBsYXlOZXh0T3JSYW5kb20oKSB7XG4gIGlmICghbXVzaWNQbGF5bGlzdC5sZW5ndGgpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgcGxheVRyYWNrKHVpYXVkaW9TdGF0ZS5pc011c2ljU2h1ZmZsZUVuYWJsZWQgPyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBtdXNpY1BsYXlsaXN0Lmxlbmd0aCkgOiBzdGF0ZS5jdXJyZW50VHJhY2tJbmRleCArIDEpO1xufVxuZnVuY3Rpb24gcGxheVByZXZpb3VzKCkge1xuICBpZiAoIW11c2ljUGxheWxpc3QubGVuZ3RoKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHBsYXlUcmFjayhzdGF0ZS5jdXJyZW50VHJhY2tJbmRleCAtIDEpO1xufVxuZnVuY3Rpb24gdXBkYXRlTXVzaWNQYW5lbCgpIHtcbiAgY29uc3QgbXVzaWNQYW5lbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibXVzaWMtcGFuZWxcIik7XG4gIGlmICghbXVzaWNQYW5lbCkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBpc0N1cnJlbnRseVBsYXlpbmcgPSBpc1BsYXlpbmcoKTtcbiAgY29uc3QgcGxheUJ1dHRvbiA9IG11c2ljUGFuZWwucXVlcnlTZWxlY3RvcihcIiNtdXNpY1BsYXlCdG5cIik7XG4gIGNvbnN0IHRyYWNrTmFtZURpc3BsYXkgPSBtdXNpY1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbXVzaWNUcmFja05hbWVcIik7XG4gIGNvbnN0IHRyYWNrTGlzdENvbnRhaW5lciA9IG11c2ljUGFuZWwucXVlcnlTZWxlY3RvcihcIiNtdXNpY1RyYWNrTGlzdFwiKTtcbiAgY29uc3QgbG9vcEJ1dHRvbiA9IG11c2ljUGFuZWwucXVlcnlTZWxlY3RvcihcIiNtdXNpY0xvb3BCdG5cIik7XG4gIGNvbnN0IHNodWZmbGVCdXR0b24gPSBtdXNpY1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbXVzaWNTaHVmZmxlQnRuXCIpO1xuICBpZiAocGxheUJ1dHRvbikge1xuICAgIHBsYXlCdXR0b24udGV4dENvbnRlbnQgPSBpc0N1cnJlbnRseVBsYXlpbmcgPyBcIlBhdXNlXCIgOiBcIlBsYXlcIjtcbiAgfVxuICBpZiAobG9vcEJ1dHRvbikge1xuICAgIGxvb3BCdXR0b24uY2xhc3NMaXN0LnRvZ2dsZShcInRvZ2dsZS1vblwiLCB1aWF1ZGlvU3RhdGUuaXNNdXNpY0xvb3BFbmFibGVkKTtcbiAgfVxuICBpZiAoc2h1ZmZsZUJ1dHRvbikge1xuICAgIHNodWZmbGVCdXR0b24uY2xhc3NMaXN0LnRvZ2dsZShcInRvZ2dsZS1vblwiLCB1aWF1ZGlvU3RhdGUuaXNNdXNpY1NodWZmbGVFbmFibGVkKTtcbiAgfVxuICBpZiAodHJhY2tOYW1lRGlzcGxheSkge1xuICAgIHRyYWNrTmFtZURpc3BsYXkudGV4dENvbnRlbnQgPSBtdXNpY1BsYXlsaXN0Lmxlbmd0aCA/IG11c2ljUGxheWxpc3Rbc3RhdGUuY3VycmVudFRyYWNrSW5kZXhdPy5uYW1lIHx8IFwiVHJhY2sgXCIgKyAoc3RhdGUuY3VycmVudFRyYWNrSW5kZXggKyAxKSA6IFwiTm8gdHJhY2tzXCI7XG4gIH1cbiAgaWYgKHRyYWNrTGlzdENvbnRhaW5lcikge1xuICAgIHRyYWNrTGlzdENvbnRhaW5lci5pbm5lckhUTUwgPSBcIlwiO1xuICAgIG11c2ljUGxheWxpc3QuZm9yRWFjaCgoZXZlbnQsIHRhcmdldEVsZW1lbnQpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRhaW5lckRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICBjb250YWluZXJEaXYuc3R5bGUuY3NzVGV4dCA9IFwiZGlzcGxheTpmbGV4O2dhcDo0cHg7bWFyZ2luLWJvdHRvbTozcHg7YWxpZ24taXRlbXM6Y2VudGVyO1wiO1xuICAgICAgY29uc3QgaXNUb2dnbGVkT24gPSB0YXJnZXRFbGVtZW50ID09PSBzdGF0ZS5jdXJyZW50VHJhY2tJbmRleCAmJiAoYXVkaW9QbGF5ZXIgfHwgeW91dHViZVBsYXllcik7XG4gICAgICBjb250YWluZXJEaXYuaW5uZXJIVE1MID0gXCJcXG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blwiICsgKGlzVG9nZ2xlZE9uID8gXCIgdG9nZ2xlLW9uXCIgOiBcIlwiKSArIFwiXFxcIiBzdHlsZT1cXFwiZmxleDoxO21hcmdpbjowO292ZXJmbG93OmhpZGRlbjt0ZXh0LW92ZXJmbG93OmVsbGlwc2lzO3doaXRlLXNwYWNlOm5vd3JhcDt0ZXh0LWFsaWduOmxlZnQ7XFxcIiB0aXRsZT1cXFwiXCIgKyBldmVudC5uYW1lICsgXCJcXFwiPlwiICsgZXZlbnQubmFtZS5zdWJzdHJpbmcoMCwgMjIpICsgXCI8L2J1dHRvbj5cXG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgc3R5bGU9XFxcIndpZHRoOjI4cHg7bWFyZ2luOjA7dGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzo2cHggNHB4O2NvbG9yOiNmNDQzMzY7ZmxleC1zaHJpbms6MDtcXFwiPlg8L2J1dHRvbj5cIjtcbiAgICAgIGNvbnRhaW5lckRpdi5xdWVyeVNlbGVjdG9yQWxsKFwiYnV0dG9uXCIpWzBdLm9uY2xpY2sgPSAoKSA9PiBwbGF5VHJhY2sodGFyZ2V0RWxlbWVudCk7XG4gICAgICBjb250YWluZXJEaXYucXVlcnlTZWxlY3RvckFsbChcImJ1dHRvblwiKVsxXS5vbmNsaWNrID0gKCkgPT4gcmVtb3ZlVHJhY2tGcm9tUGxheWxpc3QodGFyZ2V0RWxlbWVudCk7XG4gICAgICB0cmFja0xpc3RDb250YWluZXIuYXBwZW5kQ2hpbGQoY29udGFpbmVyRGl2KTtcbiAgICB9KTtcbiAgICBpZiAoIW11c2ljUGxheWxpc3QubGVuZ3RoKSB7XG4gICAgICB0cmFja0xpc3RDb250YWluZXIuaW5uZXJIVE1MID0gXCI8ZGl2IHN0eWxlPVxcXCJmb250LXNpemU6MTFweDtjb2xvcjojNTU1O3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6NnB4IDA7XFxcIj5ObyB0cmFja3MgeWV0PC9kaXY+XCI7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBjb25zdCB1aWF1ZGlvU3RhdGUgPSB7XG4gIGlzTXV0ZWQ6IGZhbHNlLFxuICBtdXNpY1ZvbHVtZTogcGFyc2VGbG9hdChsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcIm11c2ljVm9sdW1lXCIpIHx8IFwiMC41XCIpLFxuICBpc011c2ljTG9vcEVuYWJsZWQ6IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwibXVzaWNMb29wXCIpICE9PSBcImZhbHNlXCIsXG4gIGlzTXVzaWNTaHVmZmxlRW5hYmxlZDogbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJtdXNpY1NodWZmbGVcIikgPT09IFwidHJ1ZVwiXG59O1xuXG5leHBvcnQgeyBpc1lvdXR1YmVVcmwsIGdldFlvdXR1YmVWaWRlb0lkLCBlbnN1cmVZb3V0dWJlQXBpUmVhZHksIGdldFlvdXR1YmVIb3N0RWxlbWVudCwgcGxheVlvdXR1YmVWaWRlbywgc3RvcEFsbFBsYXliYWNrLCBwbGF5VHJhY2ssIHBhdXNlUGxheWJhY2ssIHJlc3VtZVBsYXliYWNrLCByZXNldFBsYXliYWNrLCBpc1BsYXlpbmcsIHBsYXlOZXh0T3JSYW5kb20sIHBsYXlQcmV2aW91cywgdXBkYXRlTXVzaWNQYW5lbCwgYXVkaW9QbGF5ZXIsIG11c2ljUGxheWxpc3QsIHlvdXR1YmVQbGF5ZXIgfTtcbiIsImltcG9ydCB7IGdldEdhbWVDYW52YXMgfSBmcm9tICcuL3JhZGFyLmpzJztcbmltcG9ydCB7IHN0YXRlIH0gZnJvbSAnLi4vY29yZS5qcyc7XG5pbXBvcnQgeyB1aWF1ZGlvU3RhdGUgfSBmcm9tICcuL2F1ZGlvLmpzJztcblxuZnVuY3Rpb24gc2ltdWxhdGVUZXh0SW5wdXQoc2VsZWN0b3IsIHRleHRUb1R5cGUpIHtcbiAgY29uc3QgaW5wdXRFbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gIGlmICghaW5wdXRFbGVtZW50KSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlucHV0RWxlbWVudC5mb2N1cygpO1xuICBpbnB1dEVsZW1lbnQudmFsdWUgPSBcIlwiO1xuICBsZXQgY3VycmVudEluZGV4ID0gMDtcbiAgY29uc3QgdHlwZU5leHRDaGFyYWN0ZXIgPSAoKSA9PiB7XG4gICAgaWYgKGN1cnJlbnRJbmRleCA+PSB0ZXh0VG9UeXBlLmxlbmd0aCkge1xuICAgICAgaW5wdXRFbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KFwiY2hhbmdlXCIsIHtcbiAgICAgICAgYnViYmxlczogdHJ1ZVxuICAgICAgfSkpO1xuICAgICAgaW5wdXRFbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KFwiaW5wdXRcIiwge1xuICAgICAgICBidWJibGVzOiB0cnVlXG4gICAgICB9KSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlucHV0RWxlbWVudC52YWx1ZSArPSB0ZXh0VG9UeXBlW2N1cnJlbnRJbmRleF07XG4gICAgaW5wdXRFbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IElucHV0RXZlbnQoXCJpbnB1dFwiLCB7XG4gICAgICBidWJibGVzOiB0cnVlXG4gICAgfSkpO1xuICAgIGN1cnJlbnRJbmRleCsrO1xuICAgIHNldFRpbWVvdXQodHlwZU5leHRDaGFyYWN0ZXIsIDI1KTtcbiAgfTtcbiAgdHlwZU5leHRDaGFyYWN0ZXIoKTtcbiAgcmV0dXJuIHRydWU7XG59XG5sZXQgY3VycmVudFZhbHVlID0gXCJcIjtcbmZ1bmN0aW9uIHNob3dOb3RpZmljYXRpb24obWVzc2FnZSkge1xuICBjb25zdCBub3RpZmljYXRpb25UaW1lID0gRGF0ZS5ub3coKTtcbiAgaWYgKG1lc3NhZ2UgPT09IGN1cnJlbnRWYWx1ZSAmJiBub3RpZmljYXRpb25UaW1lIC0gc3RhdGUuY3VycmVudFRpbWUgPCAzMDAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGN1cnJlbnRWYWx1ZSA9IG1lc3NhZ2U7XG4gIHN0YXRlLmN1cnJlbnRUaW1lID0gbm90aWZpY2F0aW9uVGltZTtcbiAgY29uc3Qgbm90aWZpY2F0aW9uRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gIG5vdGlmaWNhdGlvbkVsZW1lbnQuc3R5bGUuY3NzVGV4dCA9IFwiXFxuICAgICAgcG9zaXRpb246IGZpeGVkOyB0b3A6IDE2cHg7IHJpZ2h0OiAxNnB4O1xcbiAgICAgIGJhY2tncm91bmQ6IHZhcigtLW5vdGlmLWJnLCAjMjgyODI4KTsgY29sb3I6IHZhcigtLW5vdGlmLXRleHQsICNlMGUwZTApO1xcbiAgICAgIHBhZGRpbmc6IDEwcHggMTZweDsgYm9yZGVyLXJhZGl1czogNHB4O1xcbiAgICAgIHotaW5kZXg6IDEwMDAwMDAwOyBmb250LXNpemU6IDEzcHg7XFxuICAgICAgb3BhY2l0eTogMDsgdHJhbnNpdGlvbjogb3BhY2l0eSAwLjJzIGVhc2UsIHRyYW5zZm9ybSAwLjJzIGVhc2U7XFxuICAgICAgcG9pbnRlci1ldmVudHM6IG5vbmU7IGZvbnQtZmFtaWx5OiAnU2Vnb2UgVUknLCBzeXN0ZW0tdWksIHNhbnMtc2VyaWY7XFxuICAgICAgYm9yZGVyLWxlZnQ6IDNweCBzb2xpZCB2YXIoLS1ub3RpZi1ib3JkZXIsIHZhcigtLWFjYywgIzg4OCkpO1xcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWCgyMHB4KTtcXG4gICAgXCI7XG4gIG5vdGlmaWNhdGlvbkVsZW1lbnQudGV4dENvbnRlbnQgPSBtZXNzYWdlO1xuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG5vdGlmaWNhdGlvbkVsZW1lbnQpO1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgIG5vdGlmaWNhdGlvbkVsZW1lbnQuc3R5bGUub3BhY2l0eSA9IFwiMVwiO1xuICAgIG5vdGlmaWNhdGlvbkVsZW1lbnQuc3R5bGUudHJhbnNmb3JtID0gXCJ0cmFuc2xhdGVYKDApXCI7XG4gIH0pO1xuICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICBub3RpZmljYXRpb25FbGVtZW50LnN0eWxlLm9wYWNpdHkgPSBcIjBcIjtcbiAgICBub3RpZmljYXRpb25FbGVtZW50LnN0eWxlLnRyYW5zZm9ybSA9IFwidHJhbnNsYXRlWCgyMHB4KVwiO1xuICAgIHNldFRpbWVvdXQoKCkgPT4gbm90aWZpY2F0aW9uRWxlbWVudC5yZW1vdmUoKSwgMjAwKTtcbiAgfSwgMjUwMCk7XG59XG5mdW5jdGlvbiBpbml0QXV0b2ZpbGxOYW1lKCkge1xuICBpZiAodWlhdWRpb1N0YXRlLmlzTXV0ZWQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgbGV0IHNhdmVkTmFtZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiYXV0b2ZpbGxfbmFtZVwiKSB8fCBcIlwiO1xuICBsZXQgbmFtZUlucHV0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5uYW1lLWlucHV0IGlucHV0XCIpIHx8IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIucGxheS1nYW1lIC5lbC1pbnB1dF9faW5uZXJcIik7XG4gIGZ1bmN0aW9uIGFwcGx5QXV0b2ZpbGwoKSB7XG4gICAgaWYgKHVpYXVkaW9TdGF0ZS5pc011dGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHVpYXVkaW9TdGF0ZS5pc011dGVkID0gdHJ1ZTtcbiAgICBuYW1lSW5wdXQudmFsdWUgPSBzYXZlZE5hbWU7XG4gICAgbmFtZUlucHV0LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KFwiaW5wdXRcIiwge1xuICAgICAgYnViYmxlczogdHJ1ZVxuICAgIH0pKTtcbiAgICBuYW1lSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImlucHV0XCIsICgpID0+IHtcbiAgICAgIGlmIChzYXZlZE5hbWUgIT09IG5hbWVJbnB1dC52YWx1ZSkge1xuICAgICAgICBzYXZlZE5hbWUgPSBuYW1lSW5wdXQudmFsdWU7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiYXV0b2ZpbGxfbmFtZVwiLCBzYXZlZE5hbWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIGlmIChuYW1lSW5wdXQgPT0gbnVsbCkge1xuICAgIGNvbnN0IGlucHV0Q2hlY2tJbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgIG5hbWVJbnB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIubmFtZS1pbnB1dCBpbnB1dFwiKSB8fCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnBsYXktZ2FtZSAuZWwtaW5wdXRfX2lubmVyXCIpO1xuICAgICAgaWYgKG5hbWVJbnB1dCAhPSBudWxsKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaW5wdXRDaGVja0ludGVydmFsKTtcbiAgICAgICAgYXBwbHlBdXRvZmlsbCgpO1xuICAgICAgfVxuICAgIH0sIDIwMCk7XG4gIH0gZWxzZSB7XG4gICAgYXBwbHlBdXRvZmlsbCgpO1xuICB9XG59XG5mdW5jdGlvbiB0eXBlQ2hhdE1lc3NhZ2UobWVzc2FnZVRleHQpIHtcbiAgY29uc3QgY2hhdElucHV0RWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuY2hhdC1pbnB1dCBpbnB1dFwiKSB8fCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiaW5wdXRbcGxhY2Vob2xkZXIqPVxcXCJjaGF0XFxcIiBpXVwiKSB8fCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiaW5wdXRbdHlwZT1cXFwidGV4dFxcXCJdXCIpO1xuICBpZiAoIWNoYXRJbnB1dEVsZW1lbnQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY2hhdElucHV0RWxlbWVudC5mb2N1cygpO1xuICBjaGF0SW5wdXRFbGVtZW50LnZhbHVlID0gXCJcIjtcbiAgbGV0IGNoYXJJbmRleCA9IDA7XG4gIGNvbnN0IHR5cGVOZXh0Q2hhcmFjdGVyID0gKCkgPT4ge1xuICAgIGlmIChjaGFySW5kZXggPj0gbWVzc2FnZVRleHQubGVuZ3RoKSB7XG4gICAgICBjb25zdCBzZW5kQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5jaGF0LWlucHV0IGJ1dHRvblwiKSB8fCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiYnV0dG9uW2FyaWEtbGFiZWwqPVxcXCJzZW5kXFxcIiBpXVwiKTtcbiAgICAgIGlmIChzZW5kQnV0dG9uKSB7XG4gICAgICAgIHNlbmRCdXR0b24uY2xpY2soKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNoYXRJbnB1dEVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoXCJjaGFuZ2VcIiwge1xuICAgICAgICAgIGJ1YmJsZXM6IHRydWVcbiAgICAgICAgfSkpO1xuICAgICAgICBjaGF0SW5wdXRFbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KFwiaW5wdXRcIiwge1xuICAgICAgICAgIGJ1YmJsZXM6IHRydWVcbiAgICAgICAgfSkpO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICBjaGF0SW5wdXRFbGVtZW50LnZhbHVlID0gXCJcIjtcbiAgICAgICAgICBjaGF0SW5wdXRFbGVtZW50LmJsdXIoKTtcbiAgICAgICAgfSwgMTAwKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY2hhdElucHV0RWxlbWVudC52YWx1ZSArPSBtZXNzYWdlVGV4dFtjaGFySW5kZXhdO1xuICAgIGNoYXRJbnB1dEVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgSW5wdXRFdmVudChcImlucHV0XCIsIHtcbiAgICAgIGJ1YmJsZXM6IHRydWVcbiAgICB9KSk7XG4gICAgY2hhckluZGV4Kys7XG4gICAgc2V0VGltZW91dCh0eXBlTmV4dENoYXJhY3RlciwgMjUpO1xuICB9O1xuICB0eXBlTmV4dENoYXJhY3RlcigpO1xufVxubGV0IGlzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbmZ1bmN0aW9uIGluaXRpYWxpemVUZXh0SW50ZXJjZXB0b3IoKSB7XG4gIGlmIChpc0luaXRpYWxpemVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGZ1bmN0aW9uIHVuZXNjYXBlU3RyaW5nKGlucHV0U3RyaW5nKSB7XG4gICAgaWYgKHR5cGVvZiBpbnB1dFN0cmluZyAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgcmV0dXJuIGlucHV0U3RyaW5nO1xuICAgIH1cbiAgICByZXR1cm4gaW5wdXRTdHJpbmcucmVwbGFjZSgvXFxcXChcXFxcfG58cnx0fGJ8Znx2fFxcZHsxLDN9fHgoW1xcZGEtZkEtRl17Mn0pfHUoW1xcZGEtZkEtRl17NH0pfHVcXHsoMCpbXFxkYS1mQS1GXXsxLDZ9KVxcfSkvZywgKGNvbnRleHQsIG9jdGFsVmFsdWUsIGhleFZhbHVlMSwgaGV4VmFsdWUyLCBoZXhWYWx1ZTMpID0+IHtcbiAgICAgIHN3aXRjaCAob2N0YWxWYWx1ZVswXSkge1xuICAgICAgICBjYXNlIFwiXFxcXFwiOlxuICAgICAgICAgIHJldHVybiBcIlxcXFxcIjtcbiAgICAgICAgY2FzZSBcIm5cIjpcbiAgICAgICAgICByZXR1cm4gXCJcXG5cIjtcbiAgICAgICAgY2FzZSBcInJcIjpcbiAgICAgICAgICByZXR1cm4gXCJcXHJcIjtcbiAgICAgICAgY2FzZSBcInRcIjpcbiAgICAgICAgICByZXR1cm4gXCJcXHRcIjtcbiAgICAgICAgY2FzZSBcImJcIjpcbiAgICAgICAgICByZXR1cm4gXCJcXGJcIjtcbiAgICAgICAgY2FzZSBcImZcIjpcbiAgICAgICAgICByZXR1cm4gXCJcXGZcIjtcbiAgICAgICAgY2FzZSBcInZcIjpcbiAgICAgICAgICByZXR1cm4gXCJcdTAwMGJcIjtcbiAgICAgICAgY2FzZSBcIjBcIjpcbiAgICAgICAgY2FzZSBcIjFcIjpcbiAgICAgICAgY2FzZSBcIjJcIjpcbiAgICAgICAgY2FzZSBcIjNcIjpcbiAgICAgICAgY2FzZSBcIjRcIjpcbiAgICAgICAgY2FzZSBcIjVcIjpcbiAgICAgICAgY2FzZSBcIjZcIjpcbiAgICAgICAgY2FzZSBcIjdcIjpcbiAgICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShOdW1iZXIucGFyc2VJbnQob2N0YWxWYWx1ZSwgOCkgfHwgMCk7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgaWYgKGhleFZhbHVlMSAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShOdW1iZXIucGFyc2VJbnQoaGV4VmFsdWUxLCAxNikgfHwgMCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChoZXhWYWx1ZTIgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoTnVtYmVyLnBhcnNlSW50KGhleFZhbHVlMiwgMTYpIHx8IDApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaGV4VmFsdWUzICE9IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvZGVQb2ludCA9IE51bWJlci5wYXJzZUludChoZXhWYWx1ZTMsIDE2KSB8fCAwO1xuICAgICAgICAgICAgaWYgKGNvZGVQb2ludCA+IDExMTQxMTEpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21Db2RlUG9pbnQoY29kZVBvaW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG9jdGFsVmFsdWU7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgY29uc3QgYWN0aW9uQ29kZXMgPSB7XG4gICAgc3Bhd246IDIyLFxuICAgIGNyZWF0ZVRyaWJlOiA1LFxuICAgIGNoYXQ6IDEwMFxuICB9O1xuICBjb25zdCBvcmlnaW5hbEVuY29kZSA9IFRleHRFbmNvZGVyLnByb3RvdHlwZS5lbmNvZGU7XG4gIFRleHRFbmNvZGVyLnByb3RvdHlwZS5lbmNvZGUgPSBmdW5jdGlvbiAoLi4uaW5wdXREYXRhKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHBhdHRlcm5MaXN0ID0gWy9eKFxceDE0ezN9XFxkK1xcfDZcXHwpKC4rKSQvZ20sIC9eKFxceDE0ezN9XFxkK1xcfDhcXHwpKC4rKSQvZ20sIC9eKFxceDE0ezN9XFxkK1xcfDE0XFx8KSguKykkL2dtLCAvXihcXHgxM3szfVswMV0pKC4rKSQvZ21dO1xuICAgICAgZm9yIChsZXQgcGF0dGVybkluZGV4ID0gMDsgcGF0dGVybkluZGV4IDwgcGF0dGVybkxpc3QubGVuZ3RoOyBwYXR0ZXJuSW5kZXgrKykge1xuICAgICAgICBjb25zdCByZWdleE1hdGNoID0gcGF0dGVybkxpc3RbcGF0dGVybkluZGV4XS5leGVjKGlucHV0RGF0YVswXSk7XG4gICAgICAgIGlmIChyZWdleE1hdGNoICYmIHJlZ2V4TWF0Y2gubGVuZ3RoID09PSAzKSB7XG4gICAgICAgICAgY29uc3QgYWN0aW9uTWV0aG9kID0gW2FjdGlvbkNvZGVzLnNwYXduLCBhY3Rpb25Db2Rlcy5zcGF3biwgYWN0aW9uQ29kZXMuY3JlYXRlVHJpYmUsIGFjdGlvbkNvZGVzLmNoYXRdW3BhdHRlcm5JbmRleF07XG4gICAgICAgICAgaW5wdXREYXRhWzBdID0gcmVnZXhNYXRjaFsxXSArIHVuZXNjYXBlU3RyaW5nKHJlZ2V4TWF0Y2hbMl0pLnN1YnN0cigwLCBhY3Rpb25NZXRob2QpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCB7fVxuICAgIHJldHVybiBSZWZsZWN0LmFwcGx5KG9yaWdpbmFsRW5jb2RlLCB0aGlzLCBpbnB1dERhdGEpO1xuICB9O1xuICBjb25zdCBjdXJyZW50VGltZXN0YW1wID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoKCkgPT4ge1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIucGxheS1nYW1lIC5lbC1pbnB1dF9faW5uZXJcIik/LnNldEF0dHJpYnV0ZShcIm1heGxlbmd0aFwiLCBcIjgwXCIpO1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIubmV3LXRyaWJlIC5lbC1pbnB1dF9faW5uZXJcIik/LnNldEF0dHJpYnV0ZShcIm1heGxlbmd0aFwiLCBcIjIwXCIpO1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuY2hhdC1pbnB1dCBpbnB1dFwiKT8uc2V0QXR0cmlidXRlKFwibWF4TGVuZ3RoXCIsIFwiMTAwMFwiKTtcbiAgfSk7XG4gIGN1cnJlbnRUaW1lc3RhbXAub2JzZXJ2ZShkb2N1bWVudC5ib2R5LCB7XG4gICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgIHN1YnRyZWU6IHRydWVcbiAgfSk7XG4gIGlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICBzaG93Tm90aWZpY2F0aW9uKFwiU3BlY2lhbCBjaGFyYWN0ZXJzIGVuYWJsZWRcIik7XG59XG5mdW5jdGlvbiBzaW11bGF0ZUNsaWNrKGNsaWVudFgsIGNsaWVudFkpIHtcbiAgY29uc3QgdGFyZ2V0RWxlbWVudCA9IGdldEdhbWVDYW52YXMoKTtcbiAgaWYgKCF0YXJnZXRFbGVtZW50KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRhcmdldEVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgUG9pbnRlckV2ZW50KFwicG9pbnRlcmRvd25cIiwge1xuICAgIGNsaWVudFg6IGNsaWVudFgsXG4gICAgY2xpZW50WTogY2xpZW50WSxcbiAgICBidXR0b246IDAsXG4gICAgYnV0dG9uczogMSxcbiAgICBidWJibGVzOiB0cnVlLFxuICAgIHZpZXc6IHdpbmRvd1xuICB9KSk7XG4gIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIHRhcmdldEVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgUG9pbnRlckV2ZW50KFwicG9pbnRlcnVwXCIsIHtcbiAgICAgIGNsaWVudFg6IGNsaWVudFgsXG4gICAgICBjbGllbnRZOiBjbGllbnRZLFxuICAgICAgYnV0dG9uczogMCxcbiAgICAgIGJ1YmJsZXM6IHRydWUsXG4gICAgICB2aWV3OiB3aW5kb3dcbiAgICB9KSk7XG4gIH0sIDgwKTtcbn1cbmZ1bmN0aW9uIHNob3dIYWxsb3dlZW5Db2RlTW9kYWwob25VbmxvY2tDYWxsYmFjaykge1xuICBjb25zdCBtb2RhbE92ZXJsYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICBtb2RhbE92ZXJsYXkuc3R5bGUuY3NzVGV4dCA9IFwicG9zaXRpb246Zml4ZWQ7dG9wOjA7bGVmdDowO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7YmFja2dyb3VuZDpyZ2JhKDAsMCwwLDAuOSk7ei1pbmRleDoxMDAwMDE7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO29wYWNpdHk6MDt0cmFuc2l0aW9uOm9wYWNpdHkgMC4zcyBlYXNlO1wiO1xuICBtb2RhbE92ZXJsYXkuaW5uZXJIVE1MID0gXCI8ZGl2IHN0eWxlPVxcXCJiYWNrZ3JvdW5kOiMxYTFhMWE7cGFkZGluZzozMnB4O2JvcmRlci1yYWRpdXM6OHB4O3RleHQtYWxpZ246Y2VudGVyO21heC13aWR0aDo0MDBweDt3aWR0aDo5MCU7Ym9yZGVyOjFweCBzb2xpZCAjMzMzO1xcXCI+XFxuICAgICAgPGRpdiBzdHlsZT1cXFwiY29sb3I6I2UwZTBlMDtmb250LXNpemU6MThweDtmb250LXdlaWdodDo2MDA7bWFyZ2luLWJvdHRvbToxNnB4O1xcXCI+SGFsbG93ZWVuIEFjY2VzcyBDb2RlPC9kaXY+XFxuICAgICAgPGlucHV0IGlkPVxcXCJod0NvZGVJbnB1dFxcXCIgdHlwZT1cXFwidGV4dFxcXCIgcGxhY2Vob2xkZXI9XFxcIkVudGVyIGNvZGUuLi5cXFwiIHN0eWxlPVxcXCJiYWNrZ3JvdW5kOiMxMTE7Ym9yZGVyOjFweCBzb2xpZCAjMzMzO2NvbG9yOiNlMGUwZTA7Ym9yZGVyLXJhZGl1czo0cHg7cGFkZGluZzoxMHB4O2ZvbnQtc2l6ZToxNHB4O3RleHQtYWxpZ246Y2VudGVyO3dpZHRoOjEwMCU7Ym94LXNpemluZzpib3JkZXItYm94O21hcmdpbi1ib3R0b206MTZweDtvdXRsaW5lOm5vbmU7XFxcIj5cXG4gICAgICA8ZGl2IHN0eWxlPVxcXCJkaXNwbGF5OmZsZXg7Z2FwOjhweDtcXFwiPlxcbiAgICAgICAgPGJ1dHRvbiBpZD1cXFwiaHdDYW5jZWxCdG5cXFwiIHN0eWxlPVxcXCJmbGV4OjE7YmFja2dyb3VuZDojMjIyO2NvbG9yOiM4ODg7Ym9yZGVyOjFweCBzb2xpZCAjMzMzO2JvcmRlci1yYWRpdXM6NHB4O3BhZGRpbmc6MTBweDtjdXJzb3I6cG9pbnRlcjtcXFwiPkNhbmNlbDwvYnV0dG9uPlxcbiAgICAgICAgPGJ1dHRvbiBpZD1cXFwiaHdTdWJtaXRCdG5cXFwiIHN0eWxlPVxcXCJmbGV4OjE7YmFja2dyb3VuZDojZmY2NjAwO2NvbG9yOiNmZmY7Ym9yZGVyOm5vbmU7Ym9yZGVyLXJhZGl1czo0cHg7cGFkZGluZzoxMHB4O2N1cnNvcjpwb2ludGVyO2ZvbnQtd2VpZ2h0OjYwMDtcXFwiPlJlZGVlbTwvYnV0dG9uPlxcbiAgICAgIDwvZGl2PjwvZGl2PlwiO1xuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG1vZGFsT3ZlcmxheSk7XG4gIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIG1vZGFsT3ZlcmxheS5zdHlsZS5vcGFjaXR5ID0gXCIxXCI7XG4gIH0sIDEwKTtcbiAgY29uc3QgY29kZUlucHV0ID0gbW9kYWxPdmVybGF5LnF1ZXJ5U2VsZWN0b3IoXCIjaHdDb2RlSW5wdXRcIik7XG4gIGNvbnN0IGNsb3NlTW9kYWwgPSAoKSA9PiB7XG4gICAgbW9kYWxPdmVybGF5LnN0eWxlLm9wYWNpdHkgPSBcIjBcIjtcbiAgICBzZXRUaW1lb3V0KCgpID0+IG1vZGFsT3ZlcmxheS5yZW1vdmUoKSwgMzAwKTtcbiAgfTtcbiAgbW9kYWxPdmVybGF5LnF1ZXJ5U2VsZWN0b3IoXCIjaHdTdWJtaXRCdG5cIikub25jbGljayA9ICgpID0+IHtcbiAgICBjb25zdCBpbnB1dFZhbHVlID0gY29kZUlucHV0LnZhbHVlLnRyaW0oKTtcbiAgICBpZiAoaW5wdXRWYWx1ZSA9PT0gXCJIYXBweUhhbGxvd2VlbjlcIiB8fCBpbnB1dFZhbHVlID09PSBcIlRyaWNrT3JUcmVhdDlcIikge1xuICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJoYWxsb3dlZW5VbmxvY2tlZFwiLCBcInRydWVcIik7XG4gICAgICBzaG93Tm90aWZpY2F0aW9uKFwiSGFsbG93ZWVuIHRoZW1lIHVubG9ja2VkXCIpO1xuICAgICAgY2xvc2VNb2RhbCgpO1xuICAgICAgb25VbmxvY2tDYWxsYmFjayh0cnVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29kZUlucHV0LnN0eWxlLmJvcmRlckNvbG9yID0gXCIjZmYwMDAwXCI7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgY29kZUlucHV0LnN0eWxlLmJvcmRlckNvbG9yID0gXCIjMzMzXCI7XG4gICAgICB9LCA1MDApO1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihcIkludmFsaWQgY29kZVwiKTtcbiAgICB9XG4gIH07XG4gIG1vZGFsT3ZlcmxheS5xdWVyeVNlbGVjdG9yKFwiI2h3Q2FuY2VsQnRuXCIpLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgY2xvc2VNb2RhbCgpO1xuICAgIG9uVW5sb2NrQ2FsbGJhY2soZmFsc2UpO1xuICB9O1xuICBjb2RlSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIGV2ZW50ID0+IHtcbiAgICBpZiAoZXZlbnQua2V5ID09PSBcIkVudGVyXCIpIHtcbiAgICAgIG1vZGFsT3ZlcmxheS5xdWVyeVNlbGVjdG9yKFwiI2h3U3VibWl0QnRuXCIpLmNsaWNrKCk7XG4gICAgfVxuICB9KTtcbiAgY29kZUlucHV0LmZvY3VzKCk7XG59XG5mdW5jdGlvbiBtYWtlRWxlbWVudERyYWdnYWJsZShkcmFnZ2FibGVFbGVtZW50KSB7XG4gIGxldCBvZmZzZXRYO1xuICBsZXQgb2Zmc2V0WTtcbiAgbGV0IGlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgbGV0IGhhc01vdmVkID0gZmFsc2U7XG4gIGRyYWdnYWJsZUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBldmVudCA9PiB7XG4gICAgaWYgKFtcIkJVVFRPTlwiLCBcIklOUFVUXCIsIFwiVEVYVEFSRUFcIiwgXCJTRUxFQ1RcIiwgXCJBXCIsIFwiTEFCRUxcIl0uaW5jbHVkZXMoZXZlbnQudGFyZ2V0LnRhZ05hbWUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChldmVudC50YXJnZXQuY2xvc2VzdChcImJ1dHRvbixpbnB1dCx0ZXh0YXJlYSxzZWxlY3QsbGFiZWxcIikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaXNEcmFnZ2luZyA9IHRydWU7XG4gICAgaGFzTW92ZWQgPSBmYWxzZTtcbiAgICBvZmZzZXRYID0gZXZlbnQuY2xpZW50WCAtIGRyYWdnYWJsZUVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdDtcbiAgICBvZmZzZXRZID0gZXZlbnQuY2xpZW50WSAtIGRyYWdnYWJsZUVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wO1xuICAgIGRyYWdnYWJsZUVsZW1lbnQuc3R5bGUudHJhbnNpdGlvbiA9IFwibm9uZVwiO1xuICAgIGNvbnN0IGhhbmRsZU1vdXNlTW92ZSA9IGN1cnJlbnRNb3VzZUV2ZW50ID0+IHtcbiAgICAgIGlmICghaGFzTW92ZWQgJiYgKE1hdGguYWJzKGN1cnJlbnRNb3VzZUV2ZW50LmNsaWVudFggLSBldmVudC5jbGllbnRYKSA+IDUgfHwgTWF0aC5hYnMoY3VycmVudE1vdXNlRXZlbnQuY2xpZW50WSAtIGV2ZW50LmNsaWVudFkpID4gNSkpIHtcbiAgICAgICAgaGFzTW92ZWQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKGlzRHJhZ2dpbmcpIHtcbiAgICAgICAgZHJhZ2dhYmxlRWxlbWVudC5zdHlsZS5sZWZ0ID0gY3VycmVudE1vdXNlRXZlbnQuY2xpZW50WCAtIG9mZnNldFggKyBcInB4XCI7XG4gICAgICAgIGRyYWdnYWJsZUVsZW1lbnQuc3R5bGUudG9wID0gY3VycmVudE1vdXNlRXZlbnQuY2xpZW50WSAtIG9mZnNldFkgKyBcInB4XCI7XG4gICAgICAgIGRyYWdnYWJsZUVsZW1lbnQuc3R5bGUuYm90dG9tID0gXCJhdXRvXCI7XG4gICAgICAgIGRyYWdnYWJsZUVsZW1lbnQuc3R5bGUucmlnaHQgPSBcImF1dG9cIjtcbiAgICAgIH1cbiAgICB9O1xuICAgIGNvbnN0IGhhbmRsZU1vdXNlVXAgPSAoKSA9PiB7XG4gICAgICBpc0RyYWdnaW5nID0gZmFsc2U7XG4gICAgICBkcmFnZ2FibGVFbGVtZW50LnN0eWxlLnRyYW5zaXRpb24gPSBcIlwiO1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBoYW5kbGVNb3VzZU1vdmUpO1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgaGFuZGxlTW91c2VVcCk7XG4gICAgfTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIGhhbmRsZU1vdXNlTW92ZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgaGFuZGxlTW91c2VVcCk7XG4gIH0pO1xuICBkcmFnZ2FibGVFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBjbGlja0V2ZW50ID0+IHtcbiAgICBpZiAoaGFzTW92ZWQpIHtcbiAgICAgIGNsaWNrRXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgfVxuICB9KTtcbn1cblxuZXhwb3J0IHsgc2ltdWxhdGVUZXh0SW5wdXQsIHNob3dOb3RpZmljYXRpb24sIGluaXRBdXRvZmlsbE5hbWUsIHR5cGVDaGF0TWVzc2FnZSwgaW5pdGlhbGl6ZVRleHRJbnRlcmNlcHRvciwgc2ltdWxhdGVDbGljaywgc2hvd0hhbGxvd2VlbkNvZGVNb2RhbCwgbWFrZUVsZW1lbnREcmFnZ2FibGUgfTtcbiIsImltcG9ydCB7IGZpbmRFbnRpdHlCeUlkLCBnZXRHYW1lU3RhdGUsIGlzQXJlYVNraXBwZWQgfSBmcm9tICcuL2F1dG9mYXJtLmpzJztcbmltcG9ydCB7IHNob3dOb3RpZmljYXRpb24gfSBmcm9tICcuLi91aS9pbnRlcmFjdGlvbi5qcyc7XG5pbXBvcnQgeyBnZXRHYW1lQ2FudmFzLCB1cGRhdGVMb2NrQnV0dG9uVUkgfSBmcm9tICcuLi91aS9yYWRhci5qcyc7XG5pbXBvcnQgeyBnZXRBbmltYWxQb3NpdGlvbiwgZXh0cmFjdFBvc2l0aW9uLCBidWlsZEVudGl0eVN0YXRlLCBjYWxjdWxhdGVEaXN0YW5jZSwgbW92ZUFuZENsaWNrRWxlbWVudCB9IGZyb20gJy4vbW92ZW1lbnQuanMnO1xuaW1wb3J0IHsgaXNQcm9jZXNzZWQsIGdldEVudGl0eU1hbmFnZXIsIHN0YXRlIH0gZnJvbSAnLi4vY29yZS5qcyc7XG5pbXBvcnQgeyBpc1ZhbGlkRW50aXR5IH0gZnJvbSAnLi4vdXRpbHMuanMnO1xuXG53aW5kb3cubG9ja0VuYWJsZWQgPSBmYWxzZTtcbndpbmRvdy5sb2NrVGFyZ2V0SWQgPSBudWxsO1xud2luZG93LmF1dG9Eb2RnZUVuYWJsZWQgPSBmYWxzZTtcblxuXG5mdW5jdGlvbiB1cGRhdGVMb2NrTG9vcCgpIHtcbiAgaWYgKCFpc1Byb2Nlc3NlZCkge1xuICAgIHJldHVybjtcbiAgfVxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlTG9ja0xvb3ApO1xuICBpZiAoIXdpbmRvdy5sb2NrRW5hYmxlZCB8fCAhd2luZG93LmxvY2tUYXJnZXRJZCkge1xuICAgIHJldHVybjtcbiAgfVxuICB0cnkge1xuICAgIGNvbnN0IHRhcmdldEVudGl0eSA9IGZpbmRFbnRpdHlCeUlkKHdpbmRvdy5sb2NrVGFyZ2V0SWQpO1xuICAgIGlmICghdGFyZ2V0RW50aXR5KSB7XG4gICAgICBzaG93Tm90aWZpY2F0aW9uKFwiTG9jayB0YXJnZXQgbG9zdFwiKTtcbiAgICAgIHdpbmRvdy5sb2NrVGFyZ2V0SWQgPSBudWxsO1xuICAgICAgd2luZG93LmxvY2tFbmFibGVkID0gZmFsc2U7XG4gICAgICB1cGRhdGVMb2NrQnV0dG9uVUkoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdGFyZ2V0UG9zID0gZXh0cmFjdFBvc2l0aW9uKHRhcmdldEVudGl0eSk7XG4gICAgY29uc3QgY3VycmVudFBvcyA9IGdldEFuaW1hbFBvc2l0aW9uKCk7XG4gICAgaWYgKCF0YXJnZXRQb3MgfHwgIWN1cnJlbnRQb3MpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgY2FudmFzID0gZ2V0R2FtZUNhbnZhcygpO1xuICAgIGlmICghY2FudmFzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgY29uc3QgY2VudGVyWCA9IHJlY3QubGVmdCArIHJlY3Qud2lkdGggLyAyO1xuICAgIGNvbnN0IGNlbnRlclkgPSByZWN0LnRvcCArIHJlY3QuaGVpZ2h0IC8gMjtcbiAgICBjb25zdCByZWxYID0gdGFyZ2V0UG9zLnggLSBjdXJyZW50UG9zLng7XG4gICAgY29uc3QgcmVsWSA9IHRhcmdldFBvcy55IC0gY3VycmVudFBvcy55O1xuICAgIGNvbnN0IGRpc3RUb1RhcmdldCA9IE1hdGguc3FydChyZWxYICogcmVsWCArIHJlbFkgKiByZWxZKTtcbiAgICBsZXQgcHJlZGljdGVkWCA9IHRhcmdldFBvcy54O1xuICAgIGxldCBwcmVkaWN0ZWRZID0gdGFyZ2V0UG9zLnk7XG4gICAgaWYgKHRhcmdldEVudGl0eS52ZWxvY2l0eSkge1xuICAgICAgY29uc3QgdmVsWCA9IHRhcmdldEVudGl0eS52ZWxvY2l0eS5feCB8fCB0YXJnZXRFbnRpdHkudmVsb2NpdHkueCB8fCAwO1xuICAgICAgY29uc3QgdmVsWSA9IHRhcmdldEVudGl0eS52ZWxvY2l0eS5feSB8fCB0YXJnZXRFbnRpdHkudmVsb2NpdHkueSB8fCAwO1xuICAgICAgY29uc3QgcHJlZGljdGlvbkZhY3RvciA9IE1hdGgubWluKGRpc3RUb1RhcmdldCAvIDgwMCwgMC41KTtcbiAgICAgIHByZWRpY3RlZFggKz0gdmVsWCAqIHByZWRpY3Rpb25GYWN0b3I7XG4gICAgICBwcmVkaWN0ZWRZICs9IHZlbFkgKiBwcmVkaWN0aW9uRmFjdG9yO1xuICAgIH1cbiAgICBjb25zdCBmaW5hbFJlbFggPSBwcmVkaWN0ZWRYIC0gY3VycmVudFBvcy54O1xuICAgIGNvbnN0IGZpbmFsUmVsWSA9IHByZWRpY3RlZFkgLSBjdXJyZW50UG9zLnk7XG4gICAgY29uc3QgZmluYWxEaXN0ID0gTWF0aC5zcXJ0KGZpbmFsUmVsWCAqIGZpbmFsUmVsWCArIGZpbmFsUmVsWSAqIGZpbmFsUmVsWSk7XG4gICAgbGV0IG11bHRpcGxpZXIgPSAxLjU7XG4gICAgaWYgKGZpbmFsRGlzdCA+IDIwMDApIHtcbiAgICAgIG11bHRpcGxpZXIgPSAzO1xuICAgIH0gZWxzZSBpZiAoZmluYWxEaXN0ID4gMTAwMCkge1xuICAgICAgbXVsdGlwbGllciA9IDI7XG4gICAgfSBlbHNlIGlmIChmaW5hbERpc3QgPCAyMDApIHtcbiAgICAgIG11bHRpcGxpZXIgPSAwLjg7XG4gICAgfVxuICAgIGNvbnN0IG1heE9mZnNldCA9IE1hdGgubWluKHJlY3Qud2lkdGgsIHJlY3QuaGVpZ2h0KSAqIDAuODU7XG4gICAgbGV0IHNjYWxlZFggPSBmaW5hbFJlbFggKiBtdWx0aXBsaWVyO1xuICAgIGxldCBzY2FsZWRZID0gZmluYWxSZWxZICogbXVsdGlwbGllcjtcbiAgICBjb25zdCBzY2FsZWREaXN0ID0gTWF0aC5zcXJ0KHNjYWxlZFggKiBzY2FsZWRYICsgc2NhbGVkWSAqIHNjYWxlZFkpO1xuICAgIGlmIChzY2FsZWREaXN0ID4gbWF4T2Zmc2V0KSB7XG4gICAgICBjb25zdCBzY2FsZUZhY3RvciA9IG1heE9mZnNldCAvIHNjYWxlZERpc3Q7XG4gICAgICBzY2FsZWRYICo9IHNjYWxlRmFjdG9yO1xuICAgICAgc2NhbGVkWSAqPSBzY2FsZUZhY3RvcjtcbiAgICB9XG4gICAgY2FudmFzLmRpc3BhdGNoRXZlbnQobmV3IE1vdXNlRXZlbnQoXCJwb2ludGVybW92ZVwiLCB7XG4gICAgICBjbGllbnRYOiBjZW50ZXJYICsgc2NhbGVkWCxcbiAgICAgIGNsaWVudFk6IGNlbnRlclkgKyBzY2FsZWRZLFxuICAgICAgYnViYmxlczogdHJ1ZSxcbiAgICAgIHZpZXc6IHdpbmRvd1xuICAgIH0pKTtcbiAgfSBjYXRjaCAoY29udGV4dCkge31cbn1cbmZ1bmN0aW9uIHRvZ2dsZUxvY2soKSB7XG4gIGlmICh3aW5kb3cubG9ja0VuYWJsZWQgJiYgd2luZG93LmxvY2tUYXJnZXRJZCkge1xuICAgIHdpbmRvdy5sb2NrRW5hYmxlZCA9IGZhbHNlO1xuICAgIHdpbmRvdy5sb2NrVGFyZ2V0SWQgPSBudWxsO1xuICAgIHNob3dOb3RpZmljYXRpb24oXCJMb2NrIHJlbGVhc2VkXCIpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGN1cnJlbnRTdGF0ZSA9IGJ1aWxkRW50aXR5U3RhdGUoKTtcbiAgICBpZiAoY3VycmVudFN0YXRlICYmIGN1cnJlbnRTdGF0ZS5wbGF5ZXJzICYmIGN1cnJlbnRTdGF0ZS5wbGF5ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIHdpbmRvdy5sb2NrRW5hYmxlZCA9IHRydWU7XG4gICAgICB3aW5kb3cubG9ja1RhcmdldElkID0gY3VycmVudFN0YXRlLnBsYXllcnNbMF0uaWQ7XG4gICAgICBjb25zdCB0YXJnZXROYW1lID0gY3VycmVudFN0YXRlLnBsYXllcnNbMF0uZW50aXR5Py5uYW1lIHx8IFwiSUQ6XCIgKyB3aW5kb3cubG9ja1RhcmdldElkO1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihcIkxvY2tlZDogXCIgKyB0YXJnZXROYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihcIk5vIHBsYXllcnMgdG8gbG9jayBvblwiKTtcbiAgICB9XG4gIH1cbiAgdXBkYXRlTG9ja0J1dHRvblVJKCk7XG59XG5mdW5jdGlvbiB0cmFja05lYXJlc3RQbGF5ZXIoKSB7XG4gIGNvbnN0IGdhbWVEYXRhID0gYnVpbGRFbnRpdHlTdGF0ZSgpO1xuICBpZiAoZ2FtZURhdGEgJiYgZ2FtZURhdGEucGxheWVycyAmJiBnYW1lRGF0YS5wbGF5ZXJzLmxlbmd0aCA+IDApIHtcbiAgICB3aW5kb3cuZXNwVHJhY2tlZEVudGl0eUlkID0gZ2FtZURhdGEucGxheWVyc1swXS5pZDtcbiAgICBzaG93Tm90aWZpY2F0aW9uKFwiVHJhY2tpbmc6IFwiICsgKGdhbWVEYXRhLnBsYXllcnNbMF0uZW50aXR5Py5uYW1lIHx8IHdpbmRvdy5lc3BUcmFja2VkRW50aXR5SWQpKTtcbiAgfSBlbHNlIHtcbiAgICBzaG93Tm90aWZpY2F0aW9uKFwiTm8gcGxheWVycyBuZWFyYnlcIik7XG4gIH1cbn1cbmZ1bmN0aW9uIGNsZWFyVHJhY2tpbmcoKSB7XG4gIHdpbmRvdy5lc3BUcmFja2VkRW50aXR5SWQgPSBudWxsO1xuICBzaG93Tm90aWZpY2F0aW9uKFwiVHJhY2tpbmcgY2xlYXJlZFwiKTtcbn1cbmNvbnN0IG1heERpc3RhbmNlID0gNjAwO1xuY29uc3QgbWF4RGlzdGFuY2VUaHJlc2hvbGQgPSA4MDA7XG5sZXQgbGFzdFBvc2l0aW9uVGltZXN0YW1wID0gMDtcbmxldCBjdXJyZW50Q29vcmRpbmF0ZXMgPSBudWxsO1xubGV0IGl0ZXJhdGlvbkNvdW50ZXIgPSAwO1xubGV0IHByZXZpb3VzUG9zaXRpb25UaW1lc3RhbXAgPSAwO1xubGV0IGRhdGFCdWZmZXIgPSBbXTtcbmZ1bmN0aW9uIGF1dG9Eb2RnZUxvb3AoKSB7XG4gIGlmICghc3RhdGUuaXNUZXh0SW50ZXJjZXB0b3JJbml0aWFsaXplZCkge1xuICAgIHJldHVybjtcbiAgfVxuICBzZXRUaW1lb3V0KGF1dG9Eb2RnZUxvb3AsIDgwKTtcbiAgaWYgKCF3aW5kb3cuYXV0b0RvZGdlRW5hYmxlZCkge1xuICAgIHJldHVybjtcbiAgfVxuICB0cnkge1xuICAgIGNvbnN0IGN1cnJlbnRQb3MgPSBnZXRBbmltYWxQb3NpdGlvbigpO1xuICAgIGlmICghY3VycmVudFBvcykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBnYW1lU3RhdGUgPSBnZXRHYW1lU3RhdGUoKTtcbiAgICBjb25zdCB3b3JsZERhdGEgPSBnZXRFbnRpdHlNYW5hZ2VyKGdhbWVTdGF0ZSk7XG4gICAgY29uc3QgbXlBbmltYWwgPSBnYW1lU3RhdGU/Lm15QW5pbWFscz8uWzBdO1xuICAgIGlmICghd29ybGREYXRhIHx8ICFteUFuaW1hbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsZXQgbmVhcmJ5RW50aXRpZXMgPSBbXTtcbiAgICAod29ybGREYXRhLmVudGl0aWVzTGlzdCB8fCBbXSkuZm9yRWFjaCh0YXJnZXRFbnRpdHkgPT4ge1xuICAgICAgaWYgKCF0YXJnZXRFbnRpdHkgfHwgdGFyZ2V0RW50aXR5LmlkID09PSBteUFuaW1hbC5pZCB8fCAhaXNWYWxpZEVudGl0eSh0YXJnZXRFbnRpdHkpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRhcmdldFggPSB0YXJnZXRFbnRpdHkucG9zaXRpb24/Ll94ICE9PSB1bmRlZmluZWQgPyB0YXJnZXRFbnRpdHkucG9zaXRpb24uX3ggOiB0YXJnZXRFbnRpdHkucG9zaXRpb24/Lng7XG4gICAgICBjb25zdCB0YXJnZXRZID0gdGFyZ2V0RW50aXR5LnBvc2l0aW9uPy5feSAhPT0gdW5kZWZpbmVkID8gdGFyZ2V0RW50aXR5LnBvc2l0aW9uLl95IDogdGFyZ2V0RW50aXR5LnBvc2l0aW9uPy55O1xuICAgICAgaWYgKHRhcmdldFggPT0gbnVsbCB8fCB0YXJnZXRZID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgZGlzdGFuY2VUb1RhcmdldCA9IGNhbGN1bGF0ZURpc3RhbmNlKGN1cnJlbnRQb3MueCwgY3VycmVudFBvcy55LCB0YXJnZXRYLCB0YXJnZXRZKTtcbiAgICAgIGlmIChkaXN0YW5jZVRvVGFyZ2V0IDwgbWF4RGlzdGFuY2UpIHtcbiAgICAgICAgbmVhcmJ5RW50aXRpZXMucHVzaCh7XG4gICAgICAgICAgeDogdGFyZ2V0WCxcbiAgICAgICAgICB5OiB0YXJnZXRZLFxuICAgICAgICAgIGRpc3Q6IGRpc3RhbmNlVG9UYXJnZXRcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKG5lYXJieUVudGl0aWVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY3VycmVudENvb3JkaW5hdGVzID0gbnVsbDtcbiAgICAgIGl0ZXJhdGlvbkNvdW50ZXIgPSAwO1xuICAgICAgZGF0YUJ1ZmZlciA9IFtdO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgIGxldCBoYXNNb3ZlZCA9IGZhbHNlO1xuICAgIGlmIChub3cgLSBwcmV2aW91c1Bvc2l0aW9uVGltZXN0YW1wID4gNjAwKSB7XG4gICAgICBwcmV2aW91c1Bvc2l0aW9uVGltZXN0YW1wID0gbm93O1xuICAgICAgaWYgKGN1cnJlbnRDb29yZGluYXRlcykge1xuICAgICAgICBjb25zdCBkaXN0RnJvbUxhc3RQb3MgPSBjYWxjdWxhdGVEaXN0YW5jZShjdXJyZW50UG9zLngsIGN1cnJlbnRQb3MueSwgY3VycmVudENvb3JkaW5hdGVzLngsIGN1cnJlbnRDb29yZGluYXRlcy55KTtcbiAgICAgICAgaWYgKGRpc3RGcm9tTGFzdFBvcyA8IDIwKSB7XG4gICAgICAgICAgaXRlcmF0aW9uQ291bnRlcisrO1xuICAgICAgICAgIGhhc01vdmVkID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVyYXRpb25Db3VudGVyID0gMDtcbiAgICAgICAgICBkYXRhQnVmZmVyID0gW107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGN1cnJlbnRDb29yZGluYXRlcyA9IHtcbiAgICAgICAgeDogY3VycmVudFBvcy54LFxuICAgICAgICB5OiBjdXJyZW50UG9zLnlcbiAgICAgIH07XG4gICAgfVxuICAgIGxldCBzdW1YID0gMDtcbiAgICBsZXQgc3VtWSA9IDA7XG4gICAgbmVhcmJ5RW50aXRpZXMuZm9yRWFjaChzb3VyY2VFbnRpdHkgPT4ge1xuICAgICAgY29uc3QgZGVsdGFYID0gY3VycmVudFBvcy54IC0gc291cmNlRW50aXR5Lng7XG4gICAgICBjb25zdCBkZWx0YVkgPSBjdXJyZW50UG9zLnkgLSBzb3VyY2VFbnRpdHkueTtcbiAgICAgIGNvbnN0IG1hZ25pdHVkZSA9IE1hdGguc3FydChkZWx0YVggKiBkZWx0YVggKyBkZWx0YVkgKiBkZWx0YVkpO1xuICAgICAgaWYgKG1hZ25pdHVkZSA+IDAuMDEpIHtcbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZERpc3RhbmNlID0gKG1heERpc3RhbmNlIC0gc291cmNlRW50aXR5LmRpc3QpIC8gbWF4RGlzdGFuY2U7XG4gICAgICAgIHN1bVggKz0gZGVsdGFYIC8gbWFnbml0dWRlICogbm9ybWFsaXplZERpc3RhbmNlO1xuICAgICAgICBzdW1ZICs9IGRlbHRhWSAvIG1hZ25pdHVkZSAqIG5vcm1hbGl6ZWREaXN0YW5jZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBsZXQgbWFnbml0dWRlID0gTWF0aC5zcXJ0KHN1bVggKiBzdW1YICsgc3VtWSAqIHN1bVkpO1xuICAgIGlmIChtYWduaXR1ZGUgPCAwLjAxKSB7XG4gICAgICBzdW1YID0gMTtcbiAgICAgIHN1bVkgPSAwO1xuICAgICAgbWFnbml0dWRlID0gMTtcbiAgICB9XG4gICAgc3VtWCAvPSBtYWduaXR1ZGU7XG4gICAgc3VtWSAvPSBtYWduaXR1ZGU7XG4gICAgbGV0IGFycm93QW5nbGUgPSBNYXRoLmF0YW4yKHN1bVksIHN1bVgpO1xuICAgIGlmIChoYXNNb3ZlZCAmJiBpdGVyYXRpb25Db3VudGVyID49IDEpIHtcbiAgICAgIGNvbnN0IGFuZ2xlUHJlc2V0cyA9IFtNYXRoLlBJIC8gNCwgLU1hdGguUEkgLyA0LCBNYXRoLlBJIC8gMiwgLU1hdGguUEkgLyAyLCBNYXRoLlBJICogMyAvIDQsIC1NYXRoLlBJICogMyAvIDRdO1xuICAgICAgbGV0IHByZXZpb3VzQW5nbGUgPSBhcnJvd0FuZ2xlO1xuICAgICAgbGV0IG1heFByb2plY3Rpb24gPSAtSW5maW5pdHk7XG4gICAgICBmb3IgKGNvbnN0IGFuZ2xlT2Zmc2V0IG9mIGFuZ2xlUHJlc2V0cykge1xuICAgICAgICBjb25zdCByb3RhdGVkQW5nbGUgPSBhcnJvd0FuZ2xlICsgYW5nbGVPZmZzZXQ7XG4gICAgICAgIGlmIChkYXRhQnVmZmVyLnNvbWUoY3VycmVudEFuZ2xlID0+IE1hdGguYWJzKGN1cnJlbnRBbmdsZSAtIHJvdGF0ZWRBbmdsZSkgPCAwLjMpICYmIGl0ZXJhdGlvbkNvdW50ZXIgPCA1KSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGN1cnJlbnRQcm9qZWN0aW9uID0gMDtcbiAgICAgICAgbmVhcmJ5RW50aXRpZXMuZm9yRWFjaChwb3NpdGlvbkVudGl0eSA9PiB7XG4gICAgICAgICAgY3VycmVudFByb2plY3Rpb24gLT0gTWF0aC5jb3Mocm90YXRlZEFuZ2xlKSAqIChwb3NpdGlvbkVudGl0eS54IC0gY3VycmVudFBvcy54KSArIE1hdGguc2luKHJvdGF0ZWRBbmdsZSkgKiAocG9zaXRpb25FbnRpdHkueSAtIGN1cnJlbnRQb3MueSk7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoY3VycmVudFByb2plY3Rpb24gPiBtYXhQcm9qZWN0aW9uKSB7XG4gICAgICAgICAgbWF4UHJvamVjdGlvbiA9IGN1cnJlbnRQcm9qZWN0aW9uO1xuICAgICAgICAgIHByZXZpb3VzQW5nbGUgPSByb3RhdGVkQW5nbGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFycm93QW5nbGUgPSBwcmV2aW91c0FuZ2xlO1xuICAgICAgZGF0YUJ1ZmZlci5wdXNoKGFycm93QW5nbGUpO1xuICAgICAgaWYgKGRhdGFCdWZmZXIubGVuZ3RoID4gOCkge1xuICAgICAgICBkYXRhQnVmZmVyLnNoaWZ0KCk7XG4gICAgICB9XG4gICAgICBpZiAoaXRlcmF0aW9uQ291bnRlciA+PSA1KSB7XG4gICAgICAgIGFycm93QW5nbGUgKz0gTWF0aC5yYW5kb20oKSA+IDAuNSA/IE1hdGguUEkgLyAyIDogLU1hdGguUEkgLyAyO1xuICAgICAgICBpdGVyYXRpb25Db3VudGVyID0gMDtcbiAgICAgICAgZGF0YUJ1ZmZlciA9IFtdO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBpc0Rpc3RhbmNlRXhjZWVkZWQgPSBub3cgLSBsYXN0UG9zaXRpb25UaW1lc3RhbXAgPiBtYXhEaXN0YW5jZVRocmVzaG9sZDtcbiAgICBpZiAoaXNEaXN0YW5jZUV4Y2VlZGVkKSB7XG4gICAgICBsYXN0UG9zaXRpb25UaW1lc3RhbXAgPSBub3c7XG4gICAgfVxuICAgIG1vdmVBbmRDbGlja0VsZW1lbnQoY3VycmVudFBvcy54ICsgTWF0aC5jb3MoYXJyb3dBbmdsZSkgKiAyMDAwLCBjdXJyZW50UG9zLnkgKyBNYXRoLnNpbihhcnJvd0FuZ2xlKSAqIDIwMDAsIGlzRGlzdGFuY2VFeGNlZWRlZCk7XG4gIH0gY2F0Y2ggKGRhdGFDb250YWluZXIpIHt9XG59XG5mdW5jdGlvbiBlbmFibGVBdXRvRG9kZ2UoKSB7XG4gIHdpbmRvdy5hdXRvRG9kZ2VFbmFibGVkID0gdHJ1ZTtcbiAgY3VycmVudENvb3JkaW5hdGVzID0gbnVsbDtcbiAgaXRlcmF0aW9uQ291bnRlciA9IDA7XG4gIGRhdGFCdWZmZXIgPSBbXTtcbiAgaWYgKCFzdGF0ZS5pc1RleHRJbnRlcmNlcHRvckluaXRpYWxpemVkKSB7XG4gICAgc3RhdGUuaXNUZXh0SW50ZXJjZXB0b3JJbml0aWFsaXplZCA9IHRydWU7XG4gICAgYXV0b0RvZGdlTG9vcCgpO1xuICB9XG4gIHNob3dOb3RpZmljYXRpb24oXCJBdXRvIGRvZGdlIGVuYWJsZWRcIik7XG59XG5mdW5jdGlvbiBkaXNhYmxlQXV0b0RvZGdlKCkge1xuICB3aW5kb3cuYXV0b0RvZGdlRW5hYmxlZCA9IGZhbHNlO1xuICBzaG93Tm90aWZpY2F0aW9uKFwiQXV0byBkb2RnZSBkaXNhYmxlZFwiKTtcbn1cbmZ1bmN0aW9uIGZpbmROZWFyZXN0RW50aXR5KHJhbmdlKSB7XG4gIHJhbmdlID0gcmFuZ2UgfHwgd2luZG93LmF1dG9GYXJtUmFuZ2U7XG4gIHRyeSB7XG4gICAgY29uc3QgZ2FtZVN0YXRlID0gZ2V0R2FtZVN0YXRlKCk7XG4gICAgY29uc3Qgd29ybGREYXRhID0gZ2V0RW50aXR5TWFuYWdlcihnYW1lU3RhdGUpO1xuICAgIGNvbnN0IHBsYXllckFuaW1hbCA9IGdhbWVTdGF0ZT8ubXlBbmltYWxzPy5bMF07XG4gICAgaWYgKCF3b3JsZERhdGEgfHwgIXBsYXllckFuaW1hbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHBsYXllclggPSBwbGF5ZXJBbmltYWwucG9zaXRpb24uX3ggIT09IHVuZGVmaW5lZCA/IHBsYXllckFuaW1hbC5wb3NpdGlvbi5feCA6IHBsYXllckFuaW1hbC5wb3NpdGlvbi54O1xuICAgIGNvbnN0IHBsYXllclkgPSBwbGF5ZXJBbmltYWwucG9zaXRpb24uX3kgIT09IHVuZGVmaW5lZCA/IHBsYXllckFuaW1hbC5wb3NpdGlvbi5feSA6IHBsYXllckFuaW1hbC5wb3NpdGlvbi55O1xuICAgIGxldCBuZWFyZXN0RW50aXR5ID0gbnVsbDtcbiAgICBsZXQgbWluRGlzdGFuY2UgPSBJbmZpbml0eTtcbiAgICAod29ybGREYXRhLmVudGl0aWVzTGlzdCB8fCBbXSkuZm9yRWFjaCh0YXJnZXRFbnRpdHkgPT4ge1xuICAgICAgaWYgKCF0YXJnZXRFbnRpdHkgfHwgdGFyZ2V0RW50aXR5LmlkID09PSBwbGF5ZXJBbmltYWwuaWQgfHwgd2luZG93LmF1dG9GYXJtU2tpcElkcy5oYXModGFyZ2V0RW50aXR5LmlkKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBwb3NYID0gdGFyZ2V0RW50aXR5LnBvc2l0aW9uPy5feCAhPT0gdW5kZWZpbmVkID8gdGFyZ2V0RW50aXR5LnBvc2l0aW9uLl94IDogdGFyZ2V0RW50aXR5LnBvc2l0aW9uPy54O1xuICAgICAgY29uc3QgcG9zWSA9IHRhcmdldEVudGl0eS5wb3NpdGlvbj8uX3kgIT09IHVuZGVmaW5lZCA/IHRhcmdldEVudGl0eS5wb3NpdGlvbi5feSA6IHRhcmdldEVudGl0eS5wb3NpdGlvbj8ueTtcbiAgICAgIGlmIChwb3NYID09IG51bGwgfHwgcG9zWSA9PSBudWxsIHx8IGlzVmFsaWRFbnRpdHkodGFyZ2V0RW50aXR5KSB8fCBpc0FyZWFTa2lwcGVkKHBvc1gsIHBvc1kpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRpc3RhbmNlID0gY2FsY3VsYXRlRGlzdGFuY2UocGxheWVyWCwgcGxheWVyWSwgcG9zWCwgcG9zWSk7XG4gICAgICBpZiAoZGlzdGFuY2UgPCBtaW5EaXN0YW5jZSAmJiBkaXN0YW5jZSA8IHJhbmdlKSB7XG4gICAgICAgIG1pbkRpc3RhbmNlID0gZGlzdGFuY2U7XG4gICAgICAgIG5lYXJlc3RFbnRpdHkgPSB7XG4gICAgICAgICAgaWQ6IHRhcmdldEVudGl0eS5pZCxcbiAgICAgICAgICB4OiBwb3NYLFxuICAgICAgICAgIHk6IHBvc1ksXG4gICAgICAgICAgZGlzdGFuY2U6IGRpc3RhbmNlLFxuICAgICAgICAgIGVudGl0eTogdGFyZ2V0RW50aXR5XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG5lYXJlc3RFbnRpdHk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbmZ1bmN0aW9uIGZpbmRFbnRpdGllc0luUmFuZ2Uoc2VhcmNoUmFuZ2UpIHtcbiAgc2VhcmNoUmFuZ2UgPSBzZWFyY2hSYW5nZSB8fCB3aW5kb3cuYXV0b0Zhcm1SYW5nZTtcbiAgdHJ5IHtcbiAgICBjb25zdCBzdGF0ZSA9IGdldEdhbWVTdGF0ZSgpO1xuICAgIGNvbnN0IHdvcmxkID0gZ2V0RW50aXR5TWFuYWdlcihzdGF0ZSk7XG4gICAgY29uc3QgbXlBbmltYWwgPSBzdGF0ZT8ubXlBbmltYWxzPy5bMF07XG4gICAgaWYgKCF3b3JsZCB8fCAhbXlBbmltYWwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgbXlYID0gbXlBbmltYWwucG9zaXRpb24uX3ggIT09IHVuZGVmaW5lZCA/IG15QW5pbWFsLnBvc2l0aW9uLl94IDogbXlBbmltYWwucG9zaXRpb24ueDtcbiAgICBjb25zdCBteVkgPSBteUFuaW1hbC5wb3NpdGlvbi5feSAhPT0gdW5kZWZpbmVkID8gbXlBbmltYWwucG9zaXRpb24uX3kgOiBteUFuaW1hbC5wb3NpdGlvbi55O1xuICAgIGNvbnN0IGVudGl0aWVzSW5SYW5nZSA9IFtdO1xuICAgICh3b3JsZC5lbnRpdGllc0xpc3QgfHwgW10pLmZvckVhY2godGFyZ2V0RW50aXR5ID0+IHtcbiAgICAgIGlmICghdGFyZ2V0RW50aXR5IHx8IHRhcmdldEVudGl0eS5pZCA9PT0gbXlBbmltYWwuaWQgfHwgd2luZG93LmF1dG9GYXJtU2tpcElkcy5oYXModGFyZ2V0RW50aXR5LmlkKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBwb3NYID0gdGFyZ2V0RW50aXR5LnBvc2l0aW9uPy5feCAhPT0gdW5kZWZpbmVkID8gdGFyZ2V0RW50aXR5LnBvc2l0aW9uLl94IDogdGFyZ2V0RW50aXR5LnBvc2l0aW9uPy54O1xuICAgICAgY29uc3QgcG9zWSA9IHRhcmdldEVudGl0eS5wb3NpdGlvbj8uX3kgIT09IHVuZGVmaW5lZCA/IHRhcmdldEVudGl0eS5wb3NpdGlvbi5feSA6IHRhcmdldEVudGl0eS5wb3NpdGlvbj8ueTtcbiAgICAgIGlmIChwb3NYID09IG51bGwgfHwgcG9zWSA9PSBudWxsIHx8IGlzVmFsaWRFbnRpdHkodGFyZ2V0RW50aXR5KSB8fCBpc0FyZWFTa2lwcGVkKHBvc1gsIHBvc1kpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRpc3RhbmNlID0gY2FsY3VsYXRlRGlzdGFuY2UobXlYLCBteVksIHBvc1gsIHBvc1kpO1xuICAgICAgaWYgKGRpc3RhbmNlIDwgc2VhcmNoUmFuZ2UpIHtcbiAgICAgICAgZW50aXRpZXNJblJhbmdlLnB1c2goe1xuICAgICAgICAgIGlkOiB0YXJnZXRFbnRpdHkuaWQsXG4gICAgICAgICAgeDogcG9zWCxcbiAgICAgICAgICB5OiBwb3NZLFxuICAgICAgICAgIGRpc3RhbmNlOiBkaXN0YW5jZSxcbiAgICAgICAgICBlbnRpdHk6IHRhcmdldEVudGl0eVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gZW50aXRpZXNJblJhbmdlLnNvcnQoKGVudGl0eUEsIGVudGl0eUIpID0+IGVudGl0eUEuZGlzdGFuY2UgLSBlbnRpdHlCLmRpc3RhbmNlKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG59XG5mdW5jdGlvbiBjYWxjdWxhdGVBdm9pZGFuY2VWZWN0b3IoKSB7XG4gIGlmICghd2luZG93LmF1dG9GYXJtQXZvaWRQbGF5ZXJzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHg6IDAsXG4gICAgICB5OiAwXG4gICAgfTtcbiAgfVxuICBjb25zdCBteVBvc2l0aW9uID0gZ2V0QW5pbWFsUG9zaXRpb24oKTtcbiAgaWYgKCFteVBvc2l0aW9uKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHg6IDAsXG4gICAgICB5OiAwXG4gICAgfTtcbiAgfVxuICBsZXQgYXZvaWRYID0gMDtcbiAgbGV0IGF2b2lkWSA9IDA7XG4gIHRyeSB7XG4gICAgY29uc3QgZ2FtZVN0YXRlID0gZ2V0R2FtZVN0YXRlKCk7XG4gICAgY29uc3Qgd29ybGREYXRhID0gZ2V0RW50aXR5TWFuYWdlcihnYW1lU3RhdGUpO1xuICAgIGNvbnN0IG15QW5pbWFsID0gZ2FtZVN0YXRlPy5teUFuaW1hbHM/LlswXTtcbiAgICBpZiAoIXdvcmxkRGF0YSB8fCAhbXlBbmltYWwpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHg6IDAsXG4gICAgICAgIHk6IDBcbiAgICAgIH07XG4gICAgfVxuICAgICh3b3JsZERhdGEuZW50aXRpZXNMaXN0IHx8IFtdKS5mb3JFYWNoKHRhcmdldEVudGl0eSA9PiB7XG4gICAgICBpZiAoIXRhcmdldEVudGl0eSB8fCB0YXJnZXRFbnRpdHkuaWQgPT09IG15QW5pbWFsLmlkIHx8ICFpc1ZhbGlkRW50aXR5KHRhcmdldEVudGl0eSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgdGFyZ2V0WCA9IHRhcmdldEVudGl0eS5wb3NpdGlvbj8uX3ggIT09IHVuZGVmaW5lZCA/IHRhcmdldEVudGl0eS5wb3NpdGlvbi5feCA6IHRhcmdldEVudGl0eS5wb3NpdGlvbj8ueDtcbiAgICAgIGNvbnN0IHRhcmdldFkgPSB0YXJnZXRFbnRpdHkucG9zaXRpb24/Ll95ICE9PSB1bmRlZmluZWQgPyB0YXJnZXRFbnRpdHkucG9zaXRpb24uX3kgOiB0YXJnZXRFbnRpdHkucG9zaXRpb24/Lnk7XG4gICAgICBpZiAodGFyZ2V0WCA9PSBudWxsIHx8IHRhcmdldFkgPT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBkaXN0YW5jZVRvVGFyZ2V0ID0gY2FsY3VsYXRlRGlzdGFuY2UobXlQb3NpdGlvbi54LCBteVBvc2l0aW9uLnksIHRhcmdldFgsIHRhcmdldFkpO1xuICAgICAgaWYgKGRpc3RhbmNlVG9UYXJnZXQgPCB3aW5kb3cuYXV0b0Zhcm1Bdm9pZERpc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IGRlbHRhWCA9IG15UG9zaXRpb24ueCAtIHRhcmdldFg7XG4gICAgICAgIGNvbnN0IGRlbHRhWSA9IG15UG9zaXRpb24ueSAtIHRhcmdldFk7XG4gICAgICAgIGNvbnN0IGh5cG90ZW51c2UgPSBNYXRoLnNxcnQoZGVsdGFYICogZGVsdGFYICsgZGVsdGFZICogZGVsdGFZKTtcbiAgICAgICAgY29uc3QgYXZvaWRhbmNlRmFjdG9yID0gKHdpbmRvdy5hdXRvRmFybUF2b2lkRGlzdGFuY2UgLSBNYXRoLm1heChkaXN0YW5jZVRvVGFyZ2V0LCA1MCkpIC8gd2luZG93LmF1dG9GYXJtQXZvaWREaXN0YW5jZTtcbiAgICAgICAgaWYgKGh5cG90ZW51c2UgPiAwKSB7XG4gICAgICAgICAgYXZvaWRYICs9IGRlbHRhWCAvIGh5cG90ZW51c2UgKiBhdm9pZGFuY2VGYWN0b3IgKiA1MDA7XG4gICAgICAgICAgYXZvaWRZICs9IGRlbHRhWSAvIGh5cG90ZW51c2UgKiBhdm9pZGFuY2VGYWN0b3IgKiA1MDA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHt9XG4gIHJldHVybiB7XG4gICAgeDogYXZvaWRYLFxuICAgIHk6IGF2b2lkWVxuICB9O1xufVxuXG5leHBvcnQgeyB1cGRhdGVMb2NrTG9vcCwgdG9nZ2xlTG9jaywgdHJhY2tOZWFyZXN0UGxheWVyLCBjbGVhclRyYWNraW5nLCBhdXRvRG9kZ2VMb29wLCBlbmFibGVBdXRvRG9kZ2UsIGRpc2FibGVBdXRvRG9kZ2UsIGZpbmROZWFyZXN0RW50aXR5LCBmaW5kRW50aXRpZXNJblJhbmdlLCBjYWxjdWxhdGVBdm9pZGFuY2VWZWN0b3IgfTtcbiIsImltcG9ydCB7IGdldEVudGl0eU1hbmFnZXIsIHN0YXRlIH0gZnJvbSAnLi4vY29yZS5qcyc7XG5pbXBvcnQgeyBjYWxjdWxhdGVEaXN0YW5jZSwgbW92ZUFuZENsaWNrRWxlbWVudCwgZ2V0QW5pbWFsUG9zaXRpb24gfSBmcm9tICcuL21vdmVtZW50LmpzJztcbmltcG9ydCB7IHNob3dOb3RpZmljYXRpb24gfSBmcm9tICcuLi91aS9pbnRlcmFjdGlvbi5qcyc7XG5pbXBvcnQgeyBmaW5kRW50aXRpZXNJblJhbmdlLCBmaW5kTmVhcmVzdEVudGl0eSwgY2FsY3VsYXRlQXZvaWRhbmNlVmVjdG9yIH0gZnJvbSAnLi9haW1ib3QuanMnO1xuaW1wb3J0IHsgZ2V0R2FtZUNhbnZhcyB9IGZyb20gJy4uL3VpL3JhZGFyLmpzJztcblxud2luZG93LmF1dG9GYXJtQWN0aXZlID0gZmFsc2U7XG53aW5kb3cuYXV0b0Zhcm1Nb2RlID0gXCJuZWFyZXN0XCI7XG53aW5kb3cuYXV0b0Zhcm1SYW5nZSA9IDMwMDA7XG53aW5kb3cuYXV0b0Zhcm1Cb29zdCA9IHRydWU7XG53aW5kb3cuYXV0b0Zhcm1Fdm9sdmUgPSB0cnVlO1xud2luZG93LmF1dG9GYXJtQXZvaWRQbGF5ZXJzID0gdHJ1ZTtcbndpbmRvdy5hdXRvRmFybUF2b2lkRGlzdGFuY2UgPSA4MDA7XG53aW5kb3cuYXV0b0Zhcm1TdGF0cyA9IHtcbiAgY29sbGVjdGVkOiAwLFxuICBzdGFydFRpbWU6IDBcbn07XG53aW5kb3cuYXV0b0Zhcm1QYXRyb2xQb2ludHMgPSBbXTtcbndpbmRvdy5hdXRvRmFybVBhdHJvbEluZGV4ID0gMDtcbndpbmRvdy5hdXRvRmFybUN1cnJlbnRUYXJnZXQgPSBudWxsO1xud2luZG93LmF1dG9GYXJtVGFyZ2V0U3RhcnRUaW1lID0gMDtcbndpbmRvdy5hdXRvRmFybVNraXBJZHMgPSBuZXcgU2V0KCk7XG53aW5kb3cuYXV0b0Zhcm1Ta2lwQ2xlYXJUaW1lID0gMDtcbndpbmRvdy5hdXRvRmFybVNraXBBcmVhcyA9IFtdO1xuXG5cbmZ1bmN0aW9uIGdldEdhbWVTdGF0ZSgpIHtcbiAgdHJ5IHtcbiAgICBpZiAoc3RhdGUuYW5pbWFsRGF0YSAmJiBzdGF0ZS5hbmltYWxEYXRhLm15QW5pbWFscyAmJiBzdGF0ZS5hbmltYWxEYXRhLm15QW5pbWFscy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gc3RhdGUuYW5pbWFsRGF0YTtcbiAgICB9XG4gICAgY29uc3Qgc3RhdGVzID0gd2luZG93Ll9fc3M/LnN0YXRlcztcbiAgICBpZiAoIXN0YXRlcykge1xuICAgICAgcmV0dXJuIHN0YXRlLmFuaW1hbERhdGEgfHwgbnVsbDtcbiAgICB9XG4gICAgZm9yIChsZXQgc3RhdGVJbmRleCA9IDA7IHN0YXRlSW5kZXggPCBzdGF0ZXMubGVuZ3RoOyBzdGF0ZUluZGV4KyspIHtcbiAgICAgIGlmIChzdGF0ZXNbc3RhdGVJbmRleF0/LmdhbWVTY2VuZT8ubXlBbmltYWxzKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZXNbc3RhdGVJbmRleF0uZ2FtZVNjZW5lO1xuICAgICAgfVxuICAgICAgaWYgKHN0YXRlc1tzdGF0ZUluZGV4XT8uZ2FtZU1hbmFnZXIpIHtcbiAgICAgICAgZm9yIChjb25zdCBtYW5hZ2VyS2V5IG9mIE9iamVjdC5rZXlzKHN0YXRlc1tzdGF0ZUluZGV4XS5nYW1lTWFuYWdlcikpIHtcbiAgICAgICAgICBpZiAoc3RhdGVzW3N0YXRlSW5kZXhdLmdhbWVNYW5hZ2VyW21hbmFnZXJLZXldPy5teUFuaW1hbHMpIHtcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZXNbc3RhdGVJbmRleF0uZ2FtZU1hbmFnZXJbbWFuYWdlcktleV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzdGF0ZS5hbmltYWxEYXRhIHx8IG51bGw7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgcmV0dXJuIHN0YXRlLmFuaW1hbERhdGEgfHwgbnVsbDtcbiAgfVxufVxuZnVuY3Rpb24gZmluZEVudGl0eUJ5SWQoZW50aXR5SWQpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBnYW1lU3RhdGUgPSBnZXRHYW1lU3RhdGUoKTtcbiAgICBpZiAoIWdhbWVTdGF0ZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHdvcmxkRGF0YSA9IGdldEVudGl0eU1hbmFnZXIoZ2FtZVN0YXRlKTtcbiAgICBpZiAoIXdvcmxkRGF0YSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGxldCBlbnRpdHkgPSB3b3JsZERhdGEuZW50aXRpZXNCeUlkID8gd29ybGREYXRhLmVudGl0aWVzQnlJZFtlbnRpdHlJZF0gOiBudWxsO1xuICAgIGlmICghZW50aXR5ICYmIHdvcmxkRGF0YS5lbnRpdGllc0xpc3QpIHtcbiAgICAgIGVudGl0eSA9IHdvcmxkRGF0YS5lbnRpdGllc0xpc3QuZmluZChzZWxlY3RlZEl0ZW0gPT4gc2VsZWN0ZWRJdGVtLmlkID09PSBlbnRpdHlJZCk7XG4gICAgfVxuICAgIGlmICghZW50aXR5ICYmIHdvcmxkRGF0YS5hbmltYWxzQnlQbGF5ZXJSb29tSWQpIHtcbiAgICAgIGZvciAobGV0IHJvb21JZCBvZiBPYmplY3Qua2V5cyh3b3JsZERhdGEuYW5pbWFsc0J5UGxheWVyUm9vbUlkKSkge1xuICAgICAgICBjb25zdCBhbmltYWxzID0gd29ybGREYXRhLmFuaW1hbHNCeVBsYXllclJvb21JZFtyb29tSWRdO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShhbmltYWxzKSkge1xuICAgICAgICAgIGVudGl0eSA9IGFuaW1hbHMuZmluZChjdXJyZW50SXRlbSA9PiBjdXJyZW50SXRlbSAmJiBjdXJyZW50SXRlbS5pZCA9PT0gZW50aXR5SWQpO1xuICAgICAgICB9IGVsc2UgaWYgKGFuaW1hbHMgJiYgYW5pbWFscy5pZCA9PT0gZW50aXR5SWQpIHtcbiAgICAgICAgICBlbnRpdHkgPSBhbmltYWxzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbnRpdHkpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZW50aXR5O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5jb25zdCBwcm94aW1pdHlMaW1pdCA9IDQwMDtcbmNvbnN0IG1heEZhaWxDb3VudCA9IDI7XG5jb25zdCB0aW1lb3V0RHVyYXRpb24gPSAyMDAwMDtcbmxldCBsYXN0RXZlbnRUaW1lc3RhbXAgPSAwO1xuY29uc3QgZXZlbnRJbnRlcnZhbFRocmVzaG9sZCA9IDYwMDtcbmZ1bmN0aW9uIG1hcmtBcmVhQXNGYWlsZWQocG9zWCwgcG9zWSkge1xuICBjb25zdCBjdXJyZW50VGltZSA9IERhdGUubm93KCk7XG4gIHdpbmRvdy5hdXRvRmFybVNraXBBcmVhcyA9IHdpbmRvdy5hdXRvRmFybVNraXBBcmVhcy5maWx0ZXIodGltZXN0YW1wID0+IHN0YXRlLmN1cnJlbnRUaW1lIC0gdGltZXN0YW1wLnRpbWUgPCB0aW1lb3V0RHVyYXRpb24pO1xuICBsZXQgZXhpc3RpbmdBcmVhID0gd2luZG93LmF1dG9GYXJtU2tpcEFyZWFzLmZpbmQocG9zaXRpb24gPT4gY2FsY3VsYXRlRGlzdGFuY2UocG9zWCwgcG9zWSwgcG9zaXRpb24ueCwgcG9zaXRpb24ueSkgPCBwcm94aW1pdHlMaW1pdCk7XG4gIGlmIChleGlzdGluZ0FyZWEpIHtcbiAgICBleGlzdGluZ0FyZWEuZmFpbENvdW50Kys7XG4gICAgZXhpc3RpbmdBcmVhLnRpbWUgPSBzdGF0ZS5jdXJyZW50VGltZTtcbiAgICBpZiAoZXhpc3RpbmdBcmVhLmZhaWxDb3VudCA+PSBtYXhGYWlsQ291bnQpIHtcbiAgICAgIGV4aXN0aW5nQXJlYS5za2lwcGVkID0gdHJ1ZTtcbiAgICAgIHNob3dOb3RpZmljYXRpb24oXCJTa2lwcGluZyB1bnJlYWNoYWJsZSBmb29kIGFyZWFcIik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHdpbmRvdy5hdXRvRmFybVNraXBBcmVhcy5wdXNoKHtcbiAgICAgIHg6IHBvc1gsXG4gICAgICB5OiBwb3NZLFxuICAgICAgcmFkaXVzOiBwcm94aW1pdHlMaW1pdCxcbiAgICAgIHRpbWU6IHN0YXRlLmN1cnJlbnRUaW1lLFxuICAgICAgZmFpbENvdW50OiAxLFxuICAgICAgc2tpcHBlZDogZmFsc2VcbiAgICB9KTtcbiAgfVxufVxuZnVuY3Rpb24gaXNBcmVhU2tpcHBlZCh4LCB5KSB7XG4gIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gIHdpbmRvdy5hdXRvRmFybVNraXBBcmVhcyA9IHdpbmRvdy5hdXRvRmFybVNraXBBcmVhcy5maWx0ZXIobGFzdFVwZGF0ZVRpbWUgPT4gbm93IC0gbGFzdFVwZGF0ZVRpbWUudGltZSA8IHRpbWVvdXREdXJhdGlvbik7XG4gIHJldHVybiB3aW5kb3cuYXV0b0Zhcm1Ta2lwQXJlYXMuc29tZShza2lwcGVkRWxlbWVudCA9PiBza2lwcGVkRWxlbWVudC5za2lwcGVkICYmIGNhbGN1bGF0ZURpc3RhbmNlKHgsIHksIHNraXBwZWRFbGVtZW50LngsIHNraXBwZWRFbGVtZW50LnkpIDwgc2tpcHBlZEVsZW1lbnQucmFkaXVzKTtcbn1cbmZ1bmN0aW9uIGZpbmRCZXN0Rm9vZENsdXN0ZXIocmFkaXVzLCByYW5nZU92ZXJyaWRlKSB7XG4gIGNvbnN0IGZvb2RQb2ludHMgPSBmaW5kRW50aXRpZXNJblJhbmdlKHJhbmdlT3ZlcnJpZGUgfHwgd2luZG93LmF1dG9GYXJtUmFuZ2UpO1xuICBpZiAoIWZvb2RQb2ludHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgbGV0IGJlc3RDbHVzdGVyID0gbnVsbDtcbiAgbGV0IG1heENvdW50ID0gMDtcbiAgZm9vZFBvaW50cy5mb3JFYWNoKGNhbGN1bGF0ZUF2ZXJhZ2VQb3NpdGlvbiA9PiB7XG4gICAgbGV0IGVsZW1lbnRDb3VudCA9IDA7XG4gICAgbGV0IHRvdGFsWCA9IDA7XG4gICAgbGV0IHRvdGFsWSA9IDA7XG4gICAgZm9vZFBvaW50cy5mb3JFYWNoKHRhcmdldFBvc2l0aW9uID0+IHtcbiAgICAgIGlmIChjYWxjdWxhdGVEaXN0YW5jZShjYWxjdWxhdGVBdmVyYWdlUG9zaXRpb24ueCwgY2FsY3VsYXRlQXZlcmFnZVBvc2l0aW9uLnksIHRhcmdldFBvc2l0aW9uLngsIHRhcmdldFBvc2l0aW9uLnkpIDwgKHJhZGl1cyB8fCA1MDApKSB7XG4gICAgICAgIGVsZW1lbnRDb3VudCsrO1xuICAgICAgICB0b3RhbFggKz0gdGFyZ2V0UG9zaXRpb24ueDtcbiAgICAgICAgdG90YWxZICs9IHRhcmdldFBvc2l0aW9uLnk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKGVsZW1lbnRDb3VudCA+IG1heENvdW50KSB7XG4gICAgICBtYXhDb3VudCA9IGVsZW1lbnRDb3VudDtcbiAgICAgIGJlc3RDbHVzdGVyID0ge1xuICAgICAgICB4OiB0b3RhbFggLyBlbGVtZW50Q291bnQsXG4gICAgICAgIHk6IHRvdGFsWSAvIGVsZW1lbnRDb3VudCxcbiAgICAgICAgZm9vZENvdW50OiBlbGVtZW50Q291bnRcbiAgICAgIH07XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGJlc3RDbHVzdGVyO1xufVxubGV0IGxhc3RVcGRhdGVUaW1lc3RhbXAgPSAwO1xuZnVuY3Rpb24gdHJpZ2dlclJhbmRvbUV2b2x2ZSgpIHtcbiAgaWYgKCF3aW5kb3cuYXV0b0Zhcm1Fdm9sdmUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcbiAgaWYgKG5vdyAtIGxhc3RVcGRhdGVUaW1lc3RhbXAgPCA1MDAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGxhc3RVcGRhdGVUaW1lc3RhbXAgPSBub3c7XG4gIGNvbnN0IGdhbWVDYW52YXMgPSBnZXRHYW1lQ2FudmFzKCk7XG4gIGNvbnN0IHJhbmRvbURpZ2l0ID0gU3RyaW5nKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDkpICsgMSk7XG4gIGNvbnN0IGtleUV2ZW50RGF0YSA9IHtcbiAgICBrZXk6IHJhbmRvbURpZ2l0LFxuICAgIGNvZGU6IFwiRGlnaXRcIiArIHJhbmRvbURpZ2l0LFxuICAgIGtleUNvZGU6IHJhbmRvbURpZ2l0LmNoYXJDb2RlQXQoMCksXG4gICAgd2hpY2g6IHJhbmRvbURpZ2l0LmNoYXJDb2RlQXQoMCksXG4gICAgYnViYmxlczogdHJ1ZSxcbiAgICBjYW5jZWxhYmxlOiB0cnVlXG4gIH07XG4gIFt3aW5kb3csIGRvY3VtZW50LCBkb2N1bWVudC5ib2R5LCBnYW1lQ2FudmFzXS5mb3JFYWNoKHRhcmdldEVsZW1lbnQgPT4ge1xuICAgIGlmICghdGFyZ2V0RWxlbWVudCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgdGFyZ2V0RWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBLZXlib2FyZEV2ZW50KFwia2V5ZG93blwiLCBrZXlFdmVudERhdGEpKTtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGFyZ2V0RWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBLZXlib2FyZEV2ZW50KFwia2V5dXBcIiwga2V5RXZlbnREYXRhKSksIDUwKTtcbiAgICB9IGNhdGNoIChjb250ZXh0KSB7fVxuICB9KTtcbn1cbmxldCBpc0F1dG9GYXJtQWN0aXZlID0gZmFsc2U7XG5sZXQgY3VycmVudFBvc2l0aW9uID0gbnVsbDtcbmxldCBjb3VudGVyID0gMDtcbmxldCBsYXN0UHJvY2Vzc2VkSW5kZXggPSAwO1xubGV0IHJhbmRvbUFuZ2xlID0gMDtcbmxldCBwb2ludGVyTW92ZU9mZnNldCA9IDA7XG5mdW5jdGlvbiBjaGVja1N0dWNrQ29uZGl0aW9uKGN1cnJlbnRQb3MpIHtcbiAgY29uc3QgY3VycmVudFRpbWUgPSBEYXRlLm5vdygpO1xuICBpZiAoc3RhdGUuY3VycmVudFRpbWUgLSBsYXN0UHJvY2Vzc2VkSW5kZXggPCAxNTAwKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGxhc3RQcm9jZXNzZWRJbmRleCA9IHN0YXRlLmN1cnJlbnRUaW1lO1xuICBpZiAoY3VycmVudFBvc2l0aW9uKSB7XG4gICAgaWYgKGNhbGN1bGF0ZURpc3RhbmNlKGN1cnJlbnRQb3MueCwgY3VycmVudFBvcy55LCBjdXJyZW50UG9zaXRpb24ueCwgY3VycmVudFBvc2l0aW9uLnkpIDwgMjUpIHtcbiAgICAgIGNvdW50ZXIrKztcbiAgICAgIGlmIChjb3VudGVyID49IDEgJiYgd2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldCkge1xuICAgICAgICBtYXJrQXJlYUFzRmFpbGVkKHdpbmRvdy5hdXRvRmFybUN1cnJlbnRUYXJnZXQueCwgd2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldC55KTtcbiAgICAgICAgd2luZG93LmF1dG9GYXJtU2tpcElkcy5hZGQod2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldC5pZCk7XG4gICAgICAgIHdpbmRvdy5hdXRvRmFybUN1cnJlbnRUYXJnZXQgPSBudWxsO1xuICAgICAgICB3aW5kb3cuYXV0b0Zhcm1UYXJnZXRTdGFydFRpbWUgPSAwO1xuICAgICAgICBjb3VudGVyID0gMDtcbiAgICAgIH1cbiAgICAgIGlmIChjb3VudGVyID49IDIpIHtcbiAgICAgICAgY291bnRlciA9IDA7XG4gICAgICAgIHdpbmRvdy5hdXRvRmFybUN1cnJlbnRUYXJnZXQgPSBudWxsO1xuICAgICAgICB3aW5kb3cuYXV0b0Zhcm1UYXJnZXRTdGFydFRpbWUgPSAwO1xuICAgICAgICBjb25zdCByYW5kb21BbmdsZSA9IE1hdGgucmFuZG9tKCkgKiBNYXRoLlBJICogMjtcbiAgICAgICAgbW92ZUFuZENsaWNrRWxlbWVudChjdXJyZW50UG9zLnggKyBNYXRoLmNvcyhyYW5kb21BbmdsZSkgKiAxNTAwLCBjdXJyZW50UG9zLnkgKyBNYXRoLnNpbihyYW5kb21BbmdsZSkgKiAxNTAwLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvdW50ZXIgPSAwO1xuICAgIH1cbiAgfVxuICBjdXJyZW50UG9zaXRpb24gPSB7XG4gICAgeDogY3VycmVudFBvcy54LFxuICAgIHk6IGN1cnJlbnRQb3MueVxuICB9O1xuICByZXR1cm4gZmFsc2U7XG59XG5mdW5jdGlvbiBzZXR1cFBhdHJvbFJvdXRlKCkge1xuICBjb25zdCBjZW50ZXJQb3MgPSBnZXRBbmltYWxQb3NpdGlvbigpO1xuICBpZiAoIWNlbnRlclBvcykge1xuICAgIHJldHVybjtcbiAgfVxuICB3aW5kb3cuYXV0b0Zhcm1QYXRyb2xQb2ludHMgPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCA2OyBpKyspIHtcbiAgICBjb25zdCBhbmdsZSA9IE1hdGguUEkgKiAyICogaSAvIDY7XG4gICAgd2luZG93LmF1dG9GYXJtUGF0cm9sUG9pbnRzLnB1c2goe1xuICAgICAgeDogY2VudGVyUG9zLnggKyBNYXRoLmNvcyhhbmdsZSkgKiAyMDAwLFxuICAgICAgeTogY2VudGVyUG9zLnkgKyBNYXRoLnNpbihhbmdsZSkgKiAyMDAwXG4gICAgfSk7XG4gIH1cbiAgd2luZG93LmF1dG9GYXJtUGF0cm9sSW5kZXggPSAwO1xufVxuZnVuY3Rpb24gYXV0b0Zhcm1Mb29wKCkge1xuICBpZiAoIXdpbmRvdy5hdXRvRmFybUFjdGl2ZSkge1xuICAgIGlzQXV0b0Zhcm1BY3RpdmUgPSBmYWxzZTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgY3VycmVudFRpbWUgPSBEYXRlLm5vdygpO1xuICBpZiAoc3RhdGUuY3VycmVudFRpbWUgLSB3aW5kb3cuYXV0b0Zhcm1Ta2lwQ2xlYXJUaW1lID4gMTUwMDApIHtcbiAgICB3aW5kb3cuYXV0b0Zhcm1Ta2lwSWRzLmNsZWFyKCk7XG4gICAgd2luZG93LmF1dG9GYXJtU2tpcENsZWFyVGltZSA9IHN0YXRlLmN1cnJlbnRUaW1lO1xuICB9XG4gIGlmICh3aW5kb3cuYXV0b0Zhcm1DdXJyZW50VGFyZ2V0ICYmIHdpbmRvdy5hdXRvRmFybVRhcmdldFN0YXJ0VGltZSA+IDAgJiYgc3RhdGUuY3VycmVudFRpbWUgLSB3aW5kb3cuYXV0b0Zhcm1UYXJnZXRTdGFydFRpbWUgPiAxMDAwKSB7XG4gICAgbWFya0FyZWFBc0ZhaWxlZCh3aW5kb3cuYXV0b0Zhcm1DdXJyZW50VGFyZ2V0LngsIHdpbmRvdy5hdXRvRmFybUN1cnJlbnRUYXJnZXQueSk7XG4gICAgd2luZG93LmF1dG9GYXJtU2tpcElkcy5hZGQod2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldC5pZCk7XG4gICAgd2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldCA9IG51bGw7XG4gICAgd2luZG93LmF1dG9GYXJtVGFyZ2V0U3RhcnRUaW1lID0gMDtcbiAgICBzZXRUaW1lb3V0KGF1dG9GYXJtTG9vcCwgMTAwKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdHJ5IHtcbiAgICBjb25zdCBjdXJyZW50VGFyZ2V0ID0gZ2V0QW5pbWFsUG9zaXRpb24oKTtcbiAgICBpZiAoIWN1cnJlbnRUYXJnZXQpIHtcbiAgICAgIHdpbmRvdy5hdXRvRmFybUFjdGl2ZSA9IGZhbHNlO1xuICAgICAgaXNBdXRvRmFybUFjdGl2ZSA9IGZhbHNlO1xuICAgICAgY29uc3QgYXV0b0Zhcm1CdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImF1dG9GYXJtQnRuXCIpO1xuICAgICAgaWYgKGF1dG9GYXJtQnV0dG9uKSB7XG4gICAgICAgIGF1dG9GYXJtQnV0dG9uLnRleHRDb250ZW50ID0gXCJBdXRvIEZhcm1cIjtcbiAgICAgICAgYXV0b0Zhcm1CdXR0b24uY2xhc3NMaXN0LnJlbW92ZShcInRvZ2dsZS1vblwiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKE1hdGgucmFuZG9tKCkgPCAwLjAxNSkge1xuICAgICAgdHJpZ2dlclJhbmRvbUV2b2x2ZSgpO1xuICAgIH1cbiAgICBpZiAoY2hlY2tTdHVja0NvbmRpdGlvbihjdXJyZW50VGFyZ2V0KSkge1xuICAgICAgc2V0VGltZW91dChhdXRvRmFybUxvb3AsIDEwMCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHBsYXllck9mZnNldCA9IGNhbGN1bGF0ZUF2b2lkYW5jZVZlY3RvcigpO1xuICAgIGlmICgoTWF0aC5hYnMocGxheWVyT2Zmc2V0LngpID4gMTAwIHx8IE1hdGguYWJzKHBsYXllck9mZnNldC55KSA+IDEwMCkgJiYgd2luZG93LmF1dG9GYXJtQXZvaWRQbGF5ZXJzKSB7XG4gICAgICBjb25zdCBzaG91bGRCb29zdCA9IHdpbmRvdy5hdXRvRmFybUJvb3N0ICYmIHN0YXRlLmN1cnJlbnRUaW1lIC0gbGFzdEV2ZW50VGltZXN0YW1wID4gZXZlbnRJbnRlcnZhbFRocmVzaG9sZDtcbiAgICAgIGlmIChzaG91bGRCb29zdCkge1xuICAgICAgICBsYXN0RXZlbnRUaW1lc3RhbXAgPSBzdGF0ZS5jdXJyZW50VGltZTtcbiAgICAgIH1cbiAgICAgIG1vdmVBbmRDbGlja0VsZW1lbnQoY3VycmVudFRhcmdldC54ICsgcGxheWVyT2Zmc2V0LngsIGN1cnJlbnRUYXJnZXQueSArIHBsYXllck9mZnNldC55LCBzaG91bGRCb29zdCk7XG4gICAgICBzZXRUaW1lb3V0KGF1dG9GYXJtTG9vcCwgNjApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsZXQgdGFyZ2V0WCA9IG51bGw7XG4gICAgbGV0IHRhcmdldFkgPSBudWxsO1xuICAgIGxldCBtaW5EaXN0YW5jZSA9IEluZmluaXR5O1xuICAgIGlmICh3aW5kb3cuYXV0b0Zhcm1Nb2RlID09PSBcIm5lYXJlc3RcIikge1xuICAgICAgY29uc3QgbmVhcmVzdFRhcmdldCA9IGZpbmROZWFyZXN0RW50aXR5KCk7XG4gICAgICBpZiAobmVhcmVzdFRhcmdldCkge1xuICAgICAgICB0YXJnZXRYID0gbmVhcmVzdFRhcmdldC54ICsgcGxheWVyT2Zmc2V0LnggKiAwLjM7XG4gICAgICAgIHRhcmdldFkgPSBuZWFyZXN0VGFyZ2V0LnkgKyBwbGF5ZXJPZmZzZXQueSAqIDAuMztcbiAgICAgICAgbWluRGlzdGFuY2UgPSBuZWFyZXN0VGFyZ2V0LmRpc3RhbmNlO1xuICAgICAgICBpZiAoIXdpbmRvdy5hdXRvRmFybUN1cnJlbnRUYXJnZXQgfHwgd2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldC5pZCAhPT0gbmVhcmVzdFRhcmdldC5pZCkge1xuICAgICAgICAgIGlmICh3aW5kb3cuYXV0b0Zhcm1DdXJyZW50VGFyZ2V0KSB7XG4gICAgICAgICAgICB3aW5kb3cuYXV0b0Zhcm1TdGF0cy5jb2xsZWN0ZWQrKztcbiAgICAgICAgICB9XG4gICAgICAgICAgd2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldCA9IG5lYXJlc3RUYXJnZXQ7XG4gICAgICAgICAgd2luZG93LmF1dG9GYXJtVGFyZ2V0U3RhcnRUaW1lID0gc3RhdGUuY3VycmVudFRpbWU7XG4gICAgICAgICAgY291bnRlciA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5lYXJlc3RUYXJnZXQuZGlzdGFuY2UgPCA0MCkge1xuICAgICAgICAgIHRhcmdldFggKz0gKE1hdGgucmFuZG9tKCkgLSAwLjUpICogODA7XG4gICAgICAgICAgdGFyZ2V0WSArPSAoTWF0aC5yYW5kb20oKSAtIDAuNSkgKiA4MDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldCA9IG51bGw7XG4gICAgICAgIHdpbmRvdy5hdXRvRmFybVRhcmdldFN0YXJ0VGltZSA9IDA7XG4gICAgICAgIGlmIChzdGF0ZS5jdXJyZW50VGltZSAtIHBvaW50ZXJNb3ZlT2Zmc2V0ID4gMjUwMCkge1xuICAgICAgICAgIHJhbmRvbUFuZ2xlID0gTWF0aC5yYW5kb20oKSAqIE1hdGguUEkgKiAyO1xuICAgICAgICAgIHBvaW50ZXJNb3ZlT2Zmc2V0ID0gc3RhdGUuY3VycmVudFRpbWU7XG4gICAgICAgIH1cbiAgICAgICAgdGFyZ2V0WCA9IGN1cnJlbnRUYXJnZXQueCArIE1hdGguY29zKHJhbmRvbUFuZ2xlKSAqIDEwMDA7XG4gICAgICAgIHRhcmdldFkgPSBjdXJyZW50VGFyZ2V0LnkgKyBNYXRoLnNpbihyYW5kb21BbmdsZSkgKiAxMDAwO1xuICAgICAgICBtaW5EaXN0YW5jZSA9IDEwMDA7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh3aW5kb3cuYXV0b0Zhcm1Nb2RlID09PSBcImNsdXN0ZXJcIikge1xuICAgICAgY29uc3QgbmVhcmJ5Rm9vZFNvdXJjZSA9IGZpbmRCZXN0Rm9vZENsdXN0ZXIoNTAwLCB3aW5kb3cuYXV0b0Zhcm1SYW5nZSk7XG4gICAgICBpZiAobmVhcmJ5Rm9vZFNvdXJjZSAmJiBuZWFyYnlGb29kU291cmNlLmZvb2RDb3VudCA+PSAyKSB7XG4gICAgICAgIHRhcmdldFggPSBuZWFyYnlGb29kU291cmNlLnggKyBwbGF5ZXJPZmZzZXQueCAqIDAuMztcbiAgICAgICAgdGFyZ2V0WSA9IG5lYXJieUZvb2RTb3VyY2UueSArIHBsYXllck9mZnNldC55ICogMC4zO1xuICAgICAgICBtaW5EaXN0YW5jZSA9IGNhbGN1bGF0ZURpc3RhbmNlKGN1cnJlbnRUYXJnZXQueCwgY3VycmVudFRhcmdldC55LCBuZWFyYnlGb29kU291cmNlLngsIG5lYXJieUZvb2RTb3VyY2UueSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCByYW5kb21UYXJnZXQgPSBmaW5kTmVhcmVzdEVudGl0eSgpO1xuICAgICAgICBpZiAocmFuZG9tVGFyZ2V0KSB7XG4gICAgICAgICAgdGFyZ2V0WCA9IHJhbmRvbVRhcmdldC54O1xuICAgICAgICAgIHRhcmdldFkgPSByYW5kb21UYXJnZXQueTtcbiAgICAgICAgICBtaW5EaXN0YW5jZSA9IHJhbmRvbVRhcmdldC5kaXN0YW5jZTtcbiAgICAgICAgICBpZiAoIXdpbmRvdy5hdXRvRmFybUN1cnJlbnRUYXJnZXQgfHwgd2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldC5pZCAhPT0gcmFuZG9tVGFyZ2V0LmlkKSB7XG4gICAgICAgICAgICB3aW5kb3cuYXV0b0Zhcm1DdXJyZW50VGFyZ2V0ID0gcmFuZG9tVGFyZ2V0O1xuICAgICAgICAgICAgd2luZG93LmF1dG9GYXJtVGFyZ2V0U3RhcnRUaW1lID0gc3RhdGUuY3VycmVudFRpbWU7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdpbmRvdy5hdXRvRmFybUN1cnJlbnRUYXJnZXQgPSBudWxsO1xuICAgICAgICAgIHdpbmRvdy5hdXRvRmFybVRhcmdldFN0YXJ0VGltZSA9IDA7XG4gICAgICAgICAgaWYgKHN0YXRlLmN1cnJlbnRUaW1lIC0gcG9pbnRlck1vdmVPZmZzZXQgPiAyNTAwKSB7XG4gICAgICAgICAgICByYW5kb21BbmdsZSA9IE1hdGgucmFuZG9tKCkgKiBNYXRoLlBJICogMjtcbiAgICAgICAgICAgIHBvaW50ZXJNb3ZlT2Zmc2V0ID0gc3RhdGUuY3VycmVudFRpbWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRhcmdldFggPSBjdXJyZW50VGFyZ2V0LnggKyBNYXRoLmNvcyhyYW5kb21BbmdsZSkgKiAxMDAwO1xuICAgICAgICAgIHRhcmdldFkgPSBjdXJyZW50VGFyZ2V0LnkgKyBNYXRoLnNpbihyYW5kb21BbmdsZSkgKiAxMDAwO1xuICAgICAgICAgIG1pbkRpc3RhbmNlID0gMTAwMDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAod2luZG93LmF1dG9GYXJtTW9kZSA9PT0gXCJwYXRyb2xcIikge1xuICAgICAgaWYgKCF3aW5kb3cuYXV0b0Zhcm1QYXRyb2xQb2ludHMubGVuZ3RoKSB7XG4gICAgICAgIHNldHVwUGF0cm9sUm91dGUoKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNwZWNpZmljVGFyZ2V0ID0gZmluZE5lYXJlc3RFbnRpdHkoODAwKTtcbiAgICAgIGlmIChzcGVjaWZpY1RhcmdldCkge1xuICAgICAgICB0YXJnZXRYID0gc3BlY2lmaWNUYXJnZXQueDtcbiAgICAgICAgdGFyZ2V0WSA9IHNwZWNpZmljVGFyZ2V0Lnk7XG4gICAgICAgIG1pbkRpc3RhbmNlID0gc3BlY2lmaWNUYXJnZXQuZGlzdGFuY2U7XG4gICAgICAgIGlmICghd2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldCB8fCB3aW5kb3cuYXV0b0Zhcm1DdXJyZW50VGFyZ2V0LmlkICE9PSBzcGVjaWZpY1RhcmdldC5pZCkge1xuICAgICAgICAgIHdpbmRvdy5hdXRvRmFybUN1cnJlbnRUYXJnZXQgPSBzcGVjaWZpY1RhcmdldDtcbiAgICAgICAgICB3aW5kb3cuYXV0b0Zhcm1UYXJnZXRTdGFydFRpbWUgPSBzdGF0ZS5jdXJyZW50VGltZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldCA9IG51bGw7XG4gICAgICAgIHdpbmRvdy5hdXRvRmFybVRhcmdldFN0YXJ0VGltZSA9IDA7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRQYXRyb2xQb2ludCA9IHdpbmRvdy5hdXRvRmFybVBhdHJvbFBvaW50c1t3aW5kb3cuYXV0b0Zhcm1QYXRyb2xJbmRleF07XG4gICAgICAgIGlmIChjdXJyZW50UGF0cm9sUG9pbnQpIHtcbiAgICAgICAgICBtaW5EaXN0YW5jZSA9IGNhbGN1bGF0ZURpc3RhbmNlKGN1cnJlbnRUYXJnZXQueCwgY3VycmVudFRhcmdldC55LCBjdXJyZW50UGF0cm9sUG9pbnQueCwgY3VycmVudFBhdHJvbFBvaW50LnkpO1xuICAgICAgICAgIGlmIChtaW5EaXN0YW5jZSA8IDIwMCkge1xuICAgICAgICAgICAgd2luZG93LmF1dG9GYXJtUGF0cm9sSW5kZXggPSAod2luZG93LmF1dG9GYXJtUGF0cm9sSW5kZXggKyAxKSAlIHdpbmRvdy5hdXRvRmFybVBhdHJvbFBvaW50cy5sZW5ndGg7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRhcmdldFggPSBjdXJyZW50UGF0cm9sUG9pbnQueDtcbiAgICAgICAgICB0YXJnZXRZID0gY3VycmVudFBhdHJvbFBvaW50Lnk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRhcmdldFggIT0gbnVsbCkge1xuICAgICAgY29uc3Qgc2hvdWxkQXBwbHlCb29zdCA9IHdpbmRvdy5hdXRvRmFybUJvb3N0ICYmIG1pbkRpc3RhbmNlID4gMzUwICYmIHN0YXRlLmN1cnJlbnRUaW1lIC0gbGFzdEV2ZW50VGltZXN0YW1wID4gZXZlbnRJbnRlcnZhbFRocmVzaG9sZDtcbiAgICAgIGlmIChzaG91bGRBcHBseUJvb3N0KSB7XG4gICAgICAgIGxhc3RFdmVudFRpbWVzdGFtcCA9IHN0YXRlLmN1cnJlbnRUaW1lO1xuICAgICAgfVxuICAgICAgbW92ZUFuZENsaWNrRWxlbWVudCh0YXJnZXRYLCB0YXJnZXRZLCBzaG91bGRBcHBseUJvb3N0KTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yTWVzc2FnZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJbQXV0b0Zhcm1dXCIsIGVycm9yTWVzc2FnZSk7XG4gIH1cbiAgc2V0VGltZW91dChhdXRvRmFybUxvb3AsIDYwKTtcbn1cbmZ1bmN0aW9uIHN0YXJ0QXV0b0Zhcm0oZmFybU1vZGUpIHtcbiAgd2luZG93LmF1dG9GYXJtTW9kZSA9IGZhcm1Nb2RlIHx8IFwibmVhcmVzdFwiO1xuICB3aW5kb3cuYXV0b0Zhcm1BY3RpdmUgPSB0cnVlO1xuICB3aW5kb3cuYXV0b0Zhcm1TdGF0cy5zdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICB3aW5kb3cuYXV0b0Zhcm1TdGF0cy5jb2xsZWN0ZWQgPSAwO1xuICB3aW5kb3cuYXV0b0Zhcm1DdXJyZW50VGFyZ2V0ID0gbnVsbDtcbiAgd2luZG93LmF1dG9GYXJtVGFyZ2V0U3RhcnRUaW1lID0gMDtcbiAgd2luZG93LmF1dG9GYXJtU2tpcElkcy5jbGVhcigpO1xuICB3aW5kb3cuYXV0b0Zhcm1Ta2lwQXJlYXMgPSBbXTtcbiAgd2luZG93LmF1dG9GYXJtU2tpcENsZWFyVGltZSA9IERhdGUubm93KCk7XG4gIGN1cnJlbnRQb3NpdGlvbiA9IG51bGw7XG4gIGNvdW50ZXIgPSAwO1xuICBsYXN0UHJvY2Vzc2VkSW5kZXggPSAwO1xuICBsYXN0RXZlbnRUaW1lc3RhbXAgPSAwO1xuICBpZiAoZmFybU1vZGUgPT09IFwicGF0cm9sXCIpIHtcbiAgICBzZXR1cFBhdHJvbFJvdXRlKCk7XG4gIH1cbiAgc2hvd05vdGlmaWNhdGlvbihcIkF1dG8gZmFybSBzdGFydGVkIChcIiArIHdpbmRvdy5hdXRvRmFybU1vZGUgKyBcIilcIik7XG4gIGlmICghaXNBdXRvRmFybUFjdGl2ZSkge1xuICAgIGlzQXV0b0Zhcm1BY3RpdmUgPSB0cnVlO1xuICAgIGF1dG9GYXJtTG9vcCgpO1xuICB9XG59XG5mdW5jdGlvbiBzdG9wQXV0b0Zhcm0oKSB7XG4gIHdpbmRvdy5hdXRvRmFybUFjdGl2ZSA9IGZhbHNlO1xuICBpc0F1dG9GYXJtQWN0aXZlID0gZmFsc2U7XG4gIHNob3dOb3RpZmljYXRpb24oXCJGYXJtIHN0b3BwZWQuIH5cIiArIHdpbmRvdy5hdXRvRmFybVN0YXRzLmNvbGxlY3RlZCArIFwiIGZvb2QgaW4gXCIgKyAoKERhdGUubm93KCkgLSB3aW5kb3cuYXV0b0Zhcm1TdGF0cy5zdGFydFRpbWUpIC8gMTAwMCkudG9GaXhlZCgwKSArIFwic1wiKTtcbn1cbmZ1bmN0aW9uIHRvZ2dsZU1pbmltYXBTaXplKCkge1xuICBpZiAoIXN0YXRlLmFuaW1hbERhdGEgfHwgIXN0YXRlLmFuaW1hbERhdGEubWluaW1hcCkge1xuICAgIHNob3dOb3RpZmljYXRpb24oXCJNaW5pbWFwIG5vdCBhdmFpbGFibGVcIik7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChzdGF0ZS5pc01pbmltYXBTbWFsbCkge1xuICAgIHN0YXRlLmFuaW1hbERhdGEubWluaW1hcC5zY2FsZS5zZXQoMSk7XG4gICAgc3RhdGUuYW5pbWFsRGF0YS5taW5pbWFwLnBpdm90LnNldCgwLCAwKTtcbiAgICBzdGF0ZS5pc01pbmltYXBTbWFsbCA9IGZhbHNlO1xuICAgIHNob3dOb3RpZmljYXRpb24oXCJNaW5pbWFwIHJlc3RvcmVkXCIpO1xuICB9IGVsc2Uge1xuICAgIHN0YXRlLmFuaW1hbERhdGEubWluaW1hcC5zY2FsZS5zZXQoMC41KTtcbiAgICBzdGF0ZS5hbmltYWxEYXRhLm1pbmltYXAucGl2b3Quc2V0KC03MCwgLTQ1KTtcbiAgICBzdGF0ZS5pc01pbmltYXBTbWFsbCA9IHRydWU7XG4gICAgc2hvd05vdGlmaWNhdGlvbihcIlNtYWxsIG1pbmltYXAgZW5hYmxlZFwiKTtcbiAgfVxufVxuXG5leHBvcnQgeyBnZXRHYW1lU3RhdGUsIGZpbmRFbnRpdHlCeUlkLCBtYXJrQXJlYUFzRmFpbGVkLCBpc0FyZWFTa2lwcGVkLCBmaW5kQmVzdEZvb2RDbHVzdGVyLCB0cmlnZ2VyUmFuZG9tRXZvbHZlLCBjaGVja1N0dWNrQ29uZGl0aW9uLCBzZXR1cFBhdHJvbFJvdXRlLCBhdXRvRmFybUxvb3AsIHN0YXJ0QXV0b0Zhcm0sIHN0b3BBdXRvRmFybSwgdG9nZ2xlTWluaW1hcFNpemUgfTtcbiIsIlxuZnVuY3Rpb24gYXBwbHlUaGVtZSh0aGVtZU5hbWUpIHtcbiAgY29uc3Qgcm9vdEVsZW1lbnQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIGNvbnN0IHNhdmVkVGhlbWVzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImN1c3RvbVRoZW1lc1wiKSB8fCBcInt9XCIpO1xuICBjb25zdCB0aGVtZURlZmluaXRpb25zID0ge1xuICAgIGdyZXk6IHtcbiAgICAgIGFjYzogXCIjODg4ODg4XCIsXG4gICAgICBhY2NIOiBcIiNhYWFhYWFcIixcbiAgICAgIGFjY1JHQjogXCIxMzYsMTM2LDEzNlwiLFxuICAgICAgdGV4dDogXCIjZTBlMGUwXCIsXG4gICAgICB0ZXh0U2VjOiBcIiM4ODhcIixcbiAgICAgIGJnMTogXCIjMWExYTFhXCIsXG4gICAgICBiZzI6IFwiIzI0MjQyNFwiLFxuICAgICAgYmczOiBcIiMyYTJhMmFcIixcbiAgICAgIGJvcmRlcjogXCIjMzMzXCIsXG4gICAgICBob3ZlcjogXCIjMmUyZTJlXCJcbiAgICB9LFxuICAgIGJsdWU6IHtcbiAgICAgIGFjYzogXCIjNGZjM2Y3XCIsXG4gICAgICBhY2NIOiBcIiM4MWQ0ZmFcIixcbiAgICAgIGFjY1JHQjogXCI3OSwxOTUsMjQ3XCIsXG4gICAgICB0ZXh0OiBcIiNlMGUwZTBcIixcbiAgICAgIHRleHRTZWM6IFwiIzg4OFwiLFxuICAgICAgYmcxOiBcIiMxYTFhMWFcIixcbiAgICAgIGJnMjogXCIjMjQyNDI0XCIsXG4gICAgICBiZzM6IFwiIzJhMmEyYVwiLFxuICAgICAgYm9yZGVyOiBcIiMzMzNcIixcbiAgICAgIGhvdmVyOiBcIiMyZTJlMmVcIlxuICAgIH0sXG4gICAgcmVkOiB7XG4gICAgICBhY2M6IFwiI2VmNTM1MFwiLFxuICAgICAgYWNjSDogXCIjZTU3MzczXCIsXG4gICAgICBhY2NSR0I6IFwiMjM5LDgzLDgwXCIsXG4gICAgICB0ZXh0OiBcIiNlMGUwZTBcIixcbiAgICAgIHRleHRTZWM6IFwiIzg4OFwiLFxuICAgICAgYmcxOiBcIiMxYTFhMWFcIixcbiAgICAgIGJnMjogXCIjMjQyNDI0XCIsXG4gICAgICBiZzM6IFwiIzJhMmEyYVwiLFxuICAgICAgYm9yZGVyOiBcIiMzMzNcIixcbiAgICAgIGhvdmVyOiBcIiMyZTJlMmVcIlxuICAgIH0sXG4gICAgZ3JlZW46IHtcbiAgICAgIGFjYzogXCIjNjZiYjZhXCIsXG4gICAgICBhY2NIOiBcIiM4MWM3ODRcIixcbiAgICAgIGFjY1JHQjogXCIxMDIsMTg3LDEwNlwiLFxuICAgICAgdGV4dDogXCIjZTBlMGUwXCIsXG4gICAgICB0ZXh0U2VjOiBcIiM4ODhcIixcbiAgICAgIGJnMTogXCIjMWExYTFhXCIsXG4gICAgICBiZzI6IFwiIzI0MjQyNFwiLFxuICAgICAgYmczOiBcIiMyYTJhMmFcIixcbiAgICAgIGJvcmRlcjogXCIjMzMzXCIsXG4gICAgICBob3ZlcjogXCIjMmUyZTJlXCJcbiAgICB9LFxuICAgIHBpbms6IHtcbiAgICAgIGFjYzogXCIjZjA2MjkyXCIsXG4gICAgICBhY2NIOiBcIiNmNDhmYjFcIixcbiAgICAgIGFjY1JHQjogXCIyNDAsOTgsMTQ2XCIsXG4gICAgICB0ZXh0OiBcIiNlMGUwZTBcIixcbiAgICAgIHRleHRTZWM6IFwiIzg4OFwiLFxuICAgICAgYmcxOiBcIiMxYTFhMWFcIixcbiAgICAgIGJnMjogXCIjMjQyNDI0XCIsXG4gICAgICBiZzM6IFwiIzJhMmEyYVwiLFxuICAgICAgYm9yZGVyOiBcIiMzMzNcIixcbiAgICAgIGhvdmVyOiBcIiMyZTJlMmVcIlxuICAgIH0sXG4gICAgc3RhcndhcnM6IHtcbiAgICAgIGFjYzogXCIjZmZkNzQwXCIsXG4gICAgICBhY2NIOiBcIiNmZmUwODJcIixcbiAgICAgIGFjY1JHQjogXCIyNTUsMjE1LDY0XCIsXG4gICAgICB0ZXh0OiBcIiNlMGUwZTBcIixcbiAgICAgIHRleHRTZWM6IFwiIzg4OFwiLFxuICAgICAgYmcxOiBcIiMxYTFhMWFcIixcbiAgICAgIGJnMjogXCIjMjQyNDI0XCIsXG4gICAgICBiZzM6IFwiIzJhMmEyYVwiLFxuICAgICAgYm9yZGVyOiBcIiMzMzNcIixcbiAgICAgIGhvdmVyOiBcIiMyZTJlMmVcIlxuICAgIH0sXG4gICAga2ZjOiB7XG4gICAgICBhY2M6IFwiI2Y0NDMzNlwiLFxuICAgICAgYWNjSDogXCIjZTU3MzczXCIsXG4gICAgICBhY2NSR0I6IFwiMjQ0LDY3LDU0XCIsXG4gICAgICB0ZXh0OiBcIiNlMGUwZTBcIixcbiAgICAgIHRleHRTZWM6IFwiIzg4OFwiLFxuICAgICAgYmcxOiBcIiMxYTFhMWFcIixcbiAgICAgIGJnMjogXCIjMjQyNDI0XCIsXG4gICAgICBiZzM6IFwiIzJhMmEyYVwiLFxuICAgICAgYm9yZGVyOiBcIiMzMzNcIixcbiAgICAgIGhvdmVyOiBcIiMyZTJlMmVcIlxuICAgIH0sXG4gICAgaGFsbG93ZWVuOiB7XG4gICAgICBhY2M6IFwiI2ZmNjYwMFwiLFxuICAgICAgYWNjSDogXCIjZmY4ODMzXCIsXG4gICAgICBhY2NSR0I6IFwiMjU1LDEwMiwwXCIsXG4gICAgICB0ZXh0OiBcIiNlMGUwZTBcIixcbiAgICAgIHRleHRTZWM6IFwiIzg4OFwiLFxuICAgICAgYmcxOiBcIiMxYTFhMWFcIixcbiAgICAgIGJnMjogXCIjMjQyNDI0XCIsXG4gICAgICBiZzM6IFwiIzJhMmEyYVwiLFxuICAgICAgYm9yZGVyOiBcIiMzMzNcIixcbiAgICAgIGhvdmVyOiBcIiMyZTJlMmVcIlxuICAgIH0sXG4gICAgLi4uc2F2ZWRUaGVtZXNcbiAgfTtcbiAgY29uc3QgdGhlbWVDb2xvciA9IHRoZW1lRGVmaW5pdGlvbnNbdGhlbWVOYW1lXSA/IHRoZW1lTmFtZSA6IFwiZ3JleVwiO1xuICBjb25zdCB0aGVtZVZhbHVlID0gdGhlbWVEZWZpbml0aW9uc1t0aGVtZUNvbG9yXTtcbiAgT2JqZWN0LmVudHJpZXMoe1xuICAgIFwiLS1hY2NcIjogdGhlbWVWYWx1ZS5hY2MsXG4gICAgXCItLWFjYy1oXCI6IHRoZW1lVmFsdWUuYWNjSCxcbiAgICBcIi0tYWNjLXJnYlwiOiB0aGVtZVZhbHVlLmFjY1JHQixcbiAgICBcIi0tdGV4dFwiOiB0aGVtZVZhbHVlLnRleHQsXG4gICAgXCItLXRleHQtc2VjXCI6IHRoZW1lVmFsdWUudGV4dFNlYyxcbiAgICBcIi0tYmcxXCI6IHRoZW1lVmFsdWUuYmcxLFxuICAgIFwiLS1iZzJcIjogdGhlbWVWYWx1ZS5iZzIsXG4gICAgXCItLWJnM1wiOiB0aGVtZVZhbHVlLmJnMyxcbiAgICBcIi0tYmRyXCI6IHRoZW1lVmFsdWUuYm9yZGVyLFxuICAgIFwiLS1odnJcIjogdGhlbWVWYWx1ZS5ob3ZlclxuICB9KS5mb3JFYWNoKChbY3NzUHJvcGVydHlOYW1lLCBjc3NQcm9wZXJ0eVZhbHVlXSkgPT4gcm9vdEVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkoY3NzUHJvcGVydHlOYW1lLCBjc3NQcm9wZXJ0eVZhbHVlKSk7XG4gIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwidGhlbWVcIiwgdGhlbWVDb2xvcik7XG59XG5mdW5jdGlvbiBpbml0QmFja2dyb3VuZEltYWdlKCkge1xuICBjb25zdCBiYWNrZ3JvdW5kSW1hZ2VVcmwgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImJnVXJsXCIpIHx8IFwiXCI7XG4gIGlmICghYmFja2dyb3VuZEltYWdlVXJsKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHVwZGF0ZUJhY2tncm91bmRJbWFnZSA9ICgpID0+IHtcbiAgICBjb25zdCBob21lQmFja2dyb3VuZEVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLmhvbWUtYmdcIik7XG4gICAgaWYgKGhvbWVCYWNrZ3JvdW5kRWxlbWVudCkge1xuICAgICAgaG9tZUJhY2tncm91bmRFbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KFwiYmFja2dyb3VuZC1pbWFnZVwiLCBcInVybChcXFwiXCIgKyBiYWNrZ3JvdW5kSW1hZ2VVcmwgKyBcIlxcXCIpXCIsIFwiaW1wb3J0YW50XCIpO1xuICAgIH1cbiAgfTtcbiAgaWYgKCFkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLmhvbWUtYmdcIikpIHtcbiAgICBjb25zdCBiZ0NoZWNrSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBpZiAoZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5ob21lLWJnXCIpKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoYmdDaGVja0ludGVydmFsKTtcbiAgICAgICAgdXBkYXRlQmFja2dyb3VuZEltYWdlKCk7XG4gICAgICB9XG4gICAgfSwgMTAwKTtcbiAgfSBlbHNlIHtcbiAgICB1cGRhdGVCYWNrZ3JvdW5kSW1hZ2UoKTtcbiAgfVxufVxuZnVuY3Rpb24gaW5qZWN0U3R5bGVzKCkge1xuICBjb25zdCBzdHlsZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG4gIHN0eWxlRWxlbWVudC50ZXh0Q29udGVudCA9IFwiXFxuICAgICAgLmFzdC1wYW5lbHtmb250LWZhbWlseTonU2Vnb2UgVUknLHN5c3RlbS11aSxzYW5zLXNlcmlmO2JhY2tncm91bmQ6dmFyKC0tYmcxLCMxYTFhMWEpO2NvbG9yOnZhcigtLXRleHQsI2UwZTBlMCk7Ym9yZGVyLXJhZGl1czo2cHg7cG9zaXRpb246Zml4ZWQ7ei1pbmRleDo5OTk5OTt1c2VyLXNlbGVjdDpub25lO2N1cnNvcjptb3ZlO2ZvbnQtc2l6ZToxM3B4O21pbi13aWR0aDoyMjBweDtvdmVyZmxvdzpoaWRkZW47fVxcbiAgICAgIC5hc3QtaGVhZGVye2JhY2tncm91bmQ6dmFyKC0taGVhZGVyLWJnLHZhcigtLWJnMiwjMjQyNDI0KSk7cGFkZGluZzoxMHB4IDE0cHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2Vlbjtib3JkZXItYm90dG9tOjFweCBzb2xpZCB2YXIoLS1iZHIsIzMzMyk7fVxcbiAgICAgIC5hc3QtaGVhZGVyLXRpdGxle2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtsZXR0ZXItc3BhY2luZzoxLjVweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7Y29sb3I6dmFyKC0taGVhZGVyLXRpdGxlLHZhcigtLWFjYywjODg4KSk7fVxcbiAgICAgIC5hc3QtaGVhZGVyLW1pbntiYWNrZ3JvdW5kOm5vbmU7Ym9yZGVyOm5vbmU7Y29sb3I6dmFyKC0tdGV4dC1zZWMsIzg4OCk7Zm9udC1zaXplOjE2cHg7Y3Vyc29yOnBvaW50ZXI7cGFkZGluZzowIDRweDtsaW5lLWhlaWdodDoxO31cXG4gICAgICAuYXN0LWhlYWRlci1taW46aG92ZXJ7Y29sb3I6dmFyKC0tdGV4dCwjZTBlMGUwKTt9XFxuICAgICAgLmFzdC1ib2R5e3BhZGRpbmc6OHB4IDEycHggMTJweCAxMnB4O31cXG4gICAgICAuYXN0LXNlY3Rpb24tbGFiZWx7Zm9udC1zaXplOjEwcHg7Zm9udC13ZWlnaHQ6NjAwO2xldHRlci1zcGFjaW5nOjFweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7Y29sb3I6dmFyKC0tc2VjdGlvbi1sYWJlbCx2YXIoLS10ZXh0LXNlYywjODg4KSk7cGFkZGluZzo4cHggMCA0cHggMnB4O2Rpc3BsYXk6YmxvY2s7fVxcbiAgICAgIC5hc3QtYnRue2Rpc3BsYXk6YmxvY2s7d2lkdGg6MTAwJTtiYWNrZ3JvdW5kOnZhcigtLWJ0bi1iZyx2YXIoLS1iZzIsIzI0MjQyNCkpO2NvbG9yOnZhcigtLWJ0bi10ZXh0LHZhcigtLXRleHQsI2UwZTBlMCkpO2JvcmRlcjpub25lO2JvcmRlci1yYWRpdXM6NHB4O3BhZGRpbmc6OHB4IDEwcHg7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NTAwO2N1cnNvcjpwb2ludGVyO3RleHQtYWxpZ246bGVmdDt0cmFuc2l0aW9uOmJhY2tncm91bmQgLjEyczttYXJnaW4tYm90dG9tOjNweDtmb250LWZhbWlseTppbmhlcml0O3Bvc2l0aW9uOnJlbGF0aXZlO31cXG4gICAgICAuYXN0LWJ0bjpob3Zlcjpub3QoOmRpc2FibGVkKXtiYWNrZ3JvdW5kOnZhcigtLWJ0bi1ob3Zlcix2YXIoLS1odnIsIzJlMmUyZSkpO31cXG4gICAgICAuYXN0LWJ0bjpkaXNhYmxlZHtvcGFjaXR5Oi4zNTtjdXJzb3I6bm90LWFsbG93ZWQ7fVxcbiAgICAgIC5hc3QtYnRuLnRvZ2dsZS1vbntjb2xvcjp2YXIoLS1hY2MsIzg4OCk7fVxcbiAgICAgIC5hc3QtYnRuLnRvZ2dsZS1vbjo6YmVmb3Jle2NvbnRlbnQ6Jyc7cG9zaXRpb246YWJzb2x1dGU7bGVmdDowO3RvcDo0cHg7Ym90dG9tOjRweDt3aWR0aDoycHg7YmFja2dyb3VuZDp2YXIoLS1hY2MsIzg4OCk7Ym9yZGVyLXJhZGl1czoxcHg7fVxcbiAgICAgIC5hc3QtYnRuLnBhdGNoZWR7b3BhY2l0eTouMjU7dGV4dC1kZWNvcmF0aW9uOmxpbmUtdGhyb3VnaDtjdXJzb3I6bm90LWFsbG93ZWQ7fVxcbiAgICAgIC5hc3QtdG9nZ2xlLXJvd3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO3BhZGRpbmc6NXB4IDJweDtmb250LXNpemU6MTJweDt9XFxuICAgICAgLmFzdC10b2dnbGUtcm93IGxhYmVse2NvbG9yOnZhcigtLXRleHQsI2UwZTBlMCk7Y3Vyc29yOnBvaW50ZXI7fVxcbiAgICAgIC5hc3Qtc3dpdGNoe3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjMycHg7aGVpZ2h0OjE4cHg7ZmxleC1zaHJpbms6MDt9XFxuICAgICAgLmFzdC1zd2l0Y2ggaW5wdXR7b3BhY2l0eTowO3dpZHRoOjA7aGVpZ2h0OjA7cG9zaXRpb246YWJzb2x1dGU7fVxcbiAgICAgIC5hc3Qtc3dpdGNoIC5zbGlkZXJ7cG9zaXRpb246YWJzb2x1dGU7Y3Vyc29yOnBvaW50ZXI7dG9wOjA7bGVmdDowO3JpZ2h0OjA7Ym90dG9tOjA7YmFja2dyb3VuZDp2YXIoLS1zd2l0Y2gtYmcsIzMzMyk7Ym9yZGVyLXJhZGl1czo5cHg7dHJhbnNpdGlvbjpiYWNrZ3JvdW5kIC4yczt9XFxuICAgICAgLmFzdC1zd2l0Y2ggLnNsaWRlcjo6YmVmb3Jle2NvbnRlbnQ6Jyc7cG9zaXRpb246YWJzb2x1dGU7aGVpZ2h0OjE0cHg7d2lkdGg6MTRweDtsZWZ0OjJweDtib3R0b206MnB4O2JhY2tncm91bmQ6dmFyKC0tc3dpdGNoLWtub2IsIzg4OCk7Ym9yZGVyLXJhZGl1czo1MCU7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjJzLGJhY2tncm91bmQgLjJzO31cXG4gICAgICAuYXN0LXN3aXRjaCBpbnB1dDpjaGVja2VkKy5zbGlkZXJ7YmFja2dyb3VuZDp2YXIoLS1zd2l0Y2gtYWN0aXZlLWJnLHJnYmEodmFyKC0tYWNjLXJnYiwxMzYsMTM2LDEzNiksLjMpKTt9XFxuICAgICAgLmFzdC1zd2l0Y2ggaW5wdXQ6Y2hlY2tlZCsuc2xpZGVyOjpiZWZvcmV7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMTRweCk7YmFja2dyb3VuZDp2YXIoLS1hY2MsIzg4OCk7fVxcbiAgICAgIC5hc3Qtc2VsZWN0e3dpZHRoOjEwMCU7YmFja2dyb3VuZDp2YXIoLS1pbnB1dC1iZyx2YXIoLS1iZzIsIzI0MjQyNCkpO2NvbG9yOnZhcigtLWlucHV0LXRleHQsdmFyKC0tdGV4dCwjZTBlMGUwKSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1pbnB1dC1ib3JkZXIsdmFyKC0tYmRyLCMzMzMpKTtib3JkZXItcmFkaXVzOjRweDtwYWRkaW5nOjZweCA4cHg7Zm9udC1zaXplOjEycHg7Y3Vyc29yOnBvaW50ZXI7b3V0bGluZTpub25lO2ZvbnQtZmFtaWx5OmluaGVyaXQ7bWFyZ2luLWJvdHRvbTozcHg7YXBwZWFyYW5jZTpub25lO31cXG4gICAgICAuYXN0LXNlbGVjdDpmb2N1c3tib3JkZXItY29sb3I6dmFyKC0tYWNjLCM4ODgpO31cXG4gICAgICAuYXN0LWlucHV0e2JhY2tncm91bmQ6dmFyKC0taW5wdXQtYmcsdmFyKC0tYmcyLCMyNDI0MjQpKTtjb2xvcjp2YXIoLS1pbnB1dC10ZXh0LHZhcigtLXRleHQsI2UwZTBlMCkpO2JvcmRlcjoxcHggc29saWQgdmFyKC0taW5wdXQtYm9yZGVyLHZhcigtLWJkciwjMzMzKSk7Ym9yZGVyLXJhZGl1czo0cHg7cGFkZGluZzo2cHggOHB4O2ZvbnQtc2l6ZToxMnB4O291dGxpbmU6bm9uZTtmb250LWZhbWlseTppbmhlcml0O31cXG4gICAgICAuYXN0LWlucHV0OmZvY3Vze2JvcmRlci1jb2xvcjp2YXIoLS1hY2MsIzg4OCk7fVxcbiAgICAgIC5hc3QtaW5wdXQ6OnBsYWNlaG9sZGVye2NvbG9yOnZhcigtLXBsYWNlaG9sZGVyLCM1NTUpO31cXG4gICAgICAuYXN0LXRleHRhcmVhe2JhY2tncm91bmQ6dmFyKC0taW5wdXQtYmcsdmFyKC0tYmcyLCMyNDI0MjQpKTtjb2xvcjp2YXIoLS1pbnB1dC10ZXh0LHZhcigtLXRleHQsI2UwZTBlMCkpO2JvcmRlcjoxcHggc29saWQgdmFyKC0taW5wdXQtYm9yZGVyLHZhcigtLWJkciwjMzMzKSk7Ym9yZGVyLXJhZGl1czo0cHg7cGFkZGluZzo4cHg7Zm9udC1zaXplOjEycHg7b3V0bGluZTpub25lO2ZvbnQtZmFtaWx5OmluaGVyaXQ7cmVzaXplOm5vbmU7d2lkdGg6MTAwJTtib3gtc2l6aW5nOmJvcmRlci1ib3g7fVxcbiAgICAgIC5hc3QtdGV4dGFyZWE6Zm9jdXN7Ym9yZGVyLWNvbG9yOnZhcigtLWFjYywjODg4KTt9XFxuICAgICAgLmFzdC10ZXh0YXJlYTo6cGxhY2Vob2xkZXJ7Y29sb3I6dmFyKC0tcGxhY2Vob2xkZXIsIzU1NSk7fVxcbiAgICAgIC5hc3Qta2V5LXJvd3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO3BhZGRpbmc6NHB4IDJweDtmb250LXNpemU6MTJweDttYXJnaW4tYm90dG9tOjNweDt9XFxuICAgICAgLmFzdC1rZXktcm93IHNwYW57Y29sb3I6dmFyKC0tdGV4dCwjZTBlMGUwKTt9XFxuICAgICAgLmFzdC1rZXktY2FwdHVyZXtiYWNrZ3JvdW5kOnZhcigtLWtleS1iZyx2YXIoLS1iZzIsIzI0MjQyNCkpO2JvcmRlcjoxcHggc29saWQgdmFyKC0taW5wdXQtYm9yZGVyLHZhcigtLWJkciwjMzMzKSk7Y29sb3I6dmFyKC0ta2V5LXRleHQsdmFyKC0tYWNjLCM4ODgpKTtib3JkZXItcmFkaXVzOjRweDtwYWRkaW5nOjRweCAxMHB4O2ZvbnQtc2l6ZToxMXB4O3RleHQtYWxpZ246Y2VudGVyO21pbi13aWR0aDo1MHB4O2N1cnNvcjpwb2ludGVyO291dGxpbmU6bm9uZTtmb250LWZhbWlseTonQ29uc29sYXMnLG1vbm9zcGFjZTtmb250LXdlaWdodDo2MDA7fVxcbiAgICAgIC5hc3Qta2V5LWNhcHR1cmU6Zm9jdXN7Ym9yZGVyLWNvbG9yOnZhcigtLWFjYywjODg4KTt9XFxuICAgICAgLmFzdC1yb3d7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4O21hcmdpbi1ib3R0b206NHB4O31cXG4gICAgICAuYXN0LXJvdyAuYXN0LWlucHV0e2ZsZXg6MTt9XFxuICAgICAgLmFzdC1jcmVkaXRze3BhZGRpbmctdG9wOjhweDtmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS1tdXRlZCwjNTU1KTtsaW5lLWhlaWdodDoxLjU7dGV4dC1hbGlnbjpjZW50ZXI7fVxcbiAgICAgIC5hc3Qtc2Vwe2hlaWdodDoxcHg7YmFja2dyb3VuZDp2YXIoLS1iZHIsIzMzMyk7bWFyZ2luOjZweCAwO31cXG4gICAgICAuYXN0LXVwZGF0ZS1saXN0e21hcmdpbjowO3BhZGRpbmctbGVmdDoxNnB4O2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLWxpc3QtdGV4dCx2YXIoLS10ZXh0LXNlYywjODg4KSk7bGluZS1oZWlnaHQ6MS42O31cXG4gICAgICAuYXN0LXVwZGF0ZS1saXN0IGxpe21hcmdpbi1ib3R0b206NHB4O31cXG4gICAgICBkaXYuc2lkZWJhci5sZWZ0PmRpdi5hZC1ibG9ja3tvcGFjaXR5OjAhaW1wb3J0YW50O3BvaW50ZXItZXZlbnRzOm5vbmUhaW1wb3J0YW50O2Rpc3BsYXk6bm9uZSFpbXBvcnRhbnQ7fVxcbiAgICAgIGRpdi5zaWRlYmFyLmxlZnQ+YXtkaXNwbGF5Om5vbmUhaW1wb3J0YW50O31cXG4gICAgICBkaXYuc2lkZWJhci5sZWZ0e21heC13aWR0aDozMHZ3O3dpZHRoOjIxcmVtO2JvdHRvbTowIWltcG9ydGFudDt9XFxuICAgIFwiO1xuICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlRWxlbWVudCk7XG59XG5cbmV4cG9ydCB7IGFwcGx5VGhlbWUsIGluaXRCYWNrZ3JvdW5kSW1hZ2UsIGluamVjdFN0eWxlcyB9O1xuIiwiaW1wb3J0IHsgdHlwZUNoYXRNZXNzYWdlIH0gZnJvbSAnLi4vdWkvaW50ZXJhY3Rpb24uanMnO1xuaW1wb3J0IHsgc3RhdGUgfSBmcm9tICcuLi9jb3JlLmpzJztcblxubGV0IGNoYXRJbnRlcnZhbCA9IG51bGw7XG5mdW5jdGlvbiBzdGFydFJlcGVhdGluZ1Rhc2sodGFza0RhdGEsIGludGVydmFsU2Vjb25kcykge1xuICBpZiAoY2hhdEludGVydmFsKSB7XG4gICAgY2xlYXJJbnRlcnZhbChjaGF0SW50ZXJ2YWwpO1xuICB9XG4gIHN0YXRlLmlzTG9vcGluZyA9IHRydWU7XG4gIGNoYXRJbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICB0eXBlQ2hhdE1lc3NhZ2UodGFza0RhdGEpO1xuICB9LCBpbnRlcnZhbFNlY29uZHMgKiAxMDAwKTtcbn1cbmZ1bmN0aW9uIHN0b3BDaGF0VGltZXIoKSB7XG4gIGlmIChjaGF0SW50ZXJ2YWwpIHtcbiAgICBjbGVhckludGVydmFsKGNoYXRJbnRlcnZhbCk7XG4gICAgY2hhdEludGVydmFsID0gbnVsbDtcbiAgfVxuICBzdGF0ZS5pc0xvb3BpbmcgPSBmYWxzZTtcbn1cblxuZXhwb3J0IHsgc3RhcnRSZXBlYXRpbmdUYXNrLCBzdG9wQ2hhdFRpbWVyIH07XG4iLCJpbXBvcnQgeyBnZXRBbGxQcm9wZXJ0eU5hbWVzIH0gZnJvbSAnLi4vdXRpbHMuanMnO1xuaW1wb3J0IHsgbWV0YWRhdGFNYXAsIHdyYXBXaXRoUHJveHksIGNvbmZpZ1N0b3JlLCBzdGF0ZSB9IGZyb20gJy4uL2NvcmUuanMnO1xuaW1wb3J0IHsgc2hvd05vdGlmaWNhdGlvbiB9IGZyb20gJy4uL3VpL2ludGVyYWN0aW9uLmpzJztcblxubGV0IGFwcFN0YXRlO1xubGV0IGlzWW91dHViZUFwaVJlYWR5ID0gZmFsc2U7XG5jb25zdCBpbml0QW50aURldGVjdGlvbiA9ICgpID0+IHtcbiAgaWYgKGlzWW91dHViZUFwaVJlYWR5KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlzWW91dHViZUFwaVJlYWR5ID0gdHJ1ZTtcbiAgY29uc3QgY2FjaGVTdG9yZSA9IHt9O1xuICBmb3IgKGNvbnN0IHByb3BlcnR5TmFtZSBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhSZWZsZWN0KSkge1xuICAgIGNhY2hlU3RvcmVbcHJvcGVydHlOYW1lXSA9IFJlZmxlY3RbcHJvcGVydHlOYW1lXTtcbiAgfVxuICBjb25zdCBQcm94eUNvbnN0cnVjdG9yID0gUHJveHk7XG4gIGNvbnN0IGxvb2t1cEdldHRlciA9IE9iamVjdC5wcm90b3R5cGUuX19sb29rdXBHZXR0ZXJfXztcbiAgY29uc3QgdXBkYXRlT2JqZWN0UHJvcGVydHkgPSAoZGF0YVN0b3JlLCBkYXRhS2V5LCBpbml0aWFsVmFsdWUpID0+IHtcbiAgICBjb25zdCB3cmFwcGVkVmFsdWUgPSBuZXcgUHJveHlDb25zdHJ1Y3RvcihkYXRhU3RvcmVbZGF0YUtleV0sIGluaXRpYWxWYWx1ZSk7XG4gICAgbWV0YWRhdGFNYXAuc2V0KHdyYXBwZWRWYWx1ZSwgZGF0YVN0b3JlW2RhdGFLZXldKTtcbiAgICBkYXRhU3RvcmVbZGF0YUtleV0gPSB3cmFwcGVkVmFsdWU7XG4gIH07XG4gIHVwZGF0ZU9iamVjdFByb3BlcnR5KEZ1bmN0aW9uLnByb3RvdHlwZSwgXCJ0b1N0cmluZ1wiLCB7XG4gICAgYXBwbHkodGhpc0NvbnRleHQsIGFyZ3NLZXksIGJpbmRpbmdDb250ZXh0KSB7XG4gICAgICByZXR1cm4gY2FjaGVTdG9yZS5hcHBseSh0aGlzQ29udGV4dCwgbWV0YWRhdGFNYXAuZ2V0KGFyZ3NLZXkpIHx8IGFyZ3NLZXksIGJpbmRpbmdDb250ZXh0KTtcbiAgICB9XG4gIH0pO1xuICB1cGRhdGVPYmplY3RQcm9wZXJ0eSh3aW5kb3csIFwiUHJveHlcIiwge1xuICAgIGNvbnN0cnVjdChjb25zdHJ1Y3RvckZ1bmMsIGNvbnN0cnVjdG9yQXJncykge1xuICAgICAgcmV0dXJuIGNhY2hlU3RvcmUuY29uc3RydWN0KGNvbnN0cnVjdG9yRnVuYywgY29uc3RydWN0b3JBcmdzKTtcbiAgICB9XG4gIH0pO1xuICB1cGRhdGVPYmplY3RQcm9wZXJ0eShQcm94eUNvbnN0cnVjdG9yLCBcInJldm9jYWJsZVwiLCB7XG4gICAgYXBwbHkodGFyZ2V0RnVuY3Rpb24sIGZ1bmN0aW9uQXJncywgZnVuY3Rpb25Db250ZXh0KSB7XG4gICAgICByZXR1cm4gY2FjaGVTdG9yZS5hcHBseSh0YXJnZXRGdW5jdGlvbiwgZnVuY3Rpb25BcmdzLCBmdW5jdGlvbkNvbnRleHQpO1xuICAgIH1cbiAgfSk7XG4gIGxldCBsYXN0RXhlY3V0aW9uVGltZXN0YW1wID0gMDtcbiAgdXBkYXRlT2JqZWN0UHJvcGVydHkoRnVuY3Rpb24ucHJvdG90eXBlLCBcImJpbmRcIiwge1xuICAgIGFwcGx5KGJpbmRUYXJnZXRDb250ZXh0LCBhcmd1bWVudHNMaXN0LCBjb250ZXh0QXJndW1lbnQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaWYgKGxvb2t1cEdldHRlci5jYWxsKGNvbnRleHRBcmd1bWVudFswXSwgXCJhYm92ZUJnUGxhdGZvcm1zQ29udGFpbmVyXCIpICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWNoZVN0b3JlLmFwcGx5KGJpbmRUYXJnZXRDb250ZXh0LCBhcmd1bWVudHNMaXN0LCBjb250ZXh0QXJndW1lbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCB7fVxuICAgICAgICBpZiAoY29udGV4dEFyZ3VtZW50WzBdICYmIGNvbnRleHRBcmd1bWVudFswXS5hYm92ZUJnUGxhdGZvcm1zQ29udGFpbmVyICE9IG51bGwpIHtcbiAgICAgICAgICBzdGF0ZS5hbmltYWxEYXRhID0gY29udGV4dEFyZ3VtZW50WzBdO1xuICAgICAgICAgIHN0YXRlLmdhbWVJbnN0YW5jZSA9IGNvbnRleHRBcmd1bWVudFswXS5nYW1lO1xuICAgICAgICAgIHdpbmRvdy5fX2NhY2hlZEVNID0gbnVsbDtcbiAgICAgICAgICBjb25zdCBwcm9jZXNzZWREYXRhID0gZ2V0QWxsUHJvcGVydHlOYW1lcyhzdGF0ZS5hbmltYWxEYXRhKTtcbiAgICAgICAgICBjb25zdCBvYmZ1c2NhdGVkS2V5cyA9IHByb2Nlc3NlZERhdGEuZmlsdGVyKG9iZnVzY2F0ZWROYW1lMSA9PiBvYmZ1c2NhdGVkTmFtZTEuc3RhcnRzV2l0aChcIl8weFwiKSk7XG4gICAgICAgICAgY29uZmlnU3RvcmUuc2V0Rmxhc2ggPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhzdGF0ZS5hbmltYWxEYXRhLl9fcHJvdG9fXy5fX3Byb3RvX18pLmZpbHRlcihvYmZ1c2NhdGVkTmFtZTIgPT4gb2JmdXNjYXRlZE5hbWUyLnN0YXJ0c1dpdGgoXCJfMHhcIikpLmZpbmQoZnVuY3Rpb25LZXkgPT4gc3RhdGUuYW5pbWFsRGF0YVtmdW5jdGlvbktleV0gaW5zdGFuY2VvZiBGdW5jdGlvbikgfHwgY29uZmlnU3RvcmUuc2V0Rmxhc2g7XG4gICAgICAgICAgY29uZmlnU3RvcmUudGVycmFpbk1hbmFnZXIgPSBvYmZ1c2NhdGVkS2V5cy5maW5kKHNoYWRvd0VsZW1lbnRLZXkgPT4gdHlwZW9mIHN0YXRlLmFuaW1hbERhdGFbc2hhZG93RWxlbWVudEtleV0/LnNoYWRvdyAhPT0gXCJ1bmRlZmluZWRcIikgfHwgY29uZmlnU3RvcmUudGVycmFpbk1hbmFnZXI7XG4gICAgICAgICAgY29uZmlnU3RvcmUuZW50aXR5TWFuYWdlciA9IG9iZnVzY2F0ZWRLZXlzLmZpbmQoZW50aXRpZXNMaXN0S2V5ID0+IHR5cGVvZiBzdGF0ZS5hbmltYWxEYXRhW2VudGl0aWVzTGlzdEtleV0/LmVudGl0aWVzTGlzdCAhPT0gXCJ1bmRlZmluZWRcIikgfHwgY29uZmlnU3RvcmUuZW50aXR5TWFuYWdlcjtcbiAgICAgICAgICBjb25maWdTdG9yZS5zb2NrZXRNYW5hZ2VyID0gZ2V0QWxsUHJvcGVydHlOYW1lcyhzdGF0ZS5nYW1lSW5zdGFuY2UpLmZpbmQocGFja2V0U2VuZGVyS2V5ID0+IHR5cGVvZiBzdGF0ZS5nYW1lSW5zdGFuY2VbcGFja2V0U2VuZGVyS2V5XT8uc2VuZEJ5dGVQYWNrZXQgIT09IFwidW5kZWZpbmVkXCIpIHx8IGNvbmZpZ1N0b3JlLnNvY2tldE1hbmFnZXI7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGFwcFN0YXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhcHBcIikuX3Zub2RlLmFwcENvbnRleHQuY29uZmlnLmdsb2JhbFByb3BlcnRpZXMuJHNpbXBsZVN0YXRlLnN0YXRlcy5maW5kKGdhbWVTdG9yZSA9PiBnYW1lU3RvcmUuX3N0b3JlTWV0YS5pZCA9PT0gXCJnYW1lXCIpO1xuICAgICAgICAgIH0gY2F0Y2gge31cbiAgICAgICAgICBsZXQgYW5pbWFsQ2hlY2tJbnRlcnZhbDtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChhbmltYWxDaGVja0ludGVydmFsKTtcbiAgICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgICAgYW5pbWFsQ2hlY2tJbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGlmICghc3RhdGUuYW5pbWFsRGF0YT8ubXlBbmltYWxzPy5bMF0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29uc3QgZmlyc3RNeUFuaW1hbCA9IHN0YXRlLmFuaW1hbERhdGEubXlBbmltYWxzWzBdO1xuICAgICAgICAgICAgICBpZiAoZmlyc3RNeUFuaW1hbC5mYWRpbmdUcmFpbCkge1xuICAgICAgICAgICAgICAgIHdyYXBXaXRoUHJveHkoT2JqZWN0LmdldFByb3RvdHlwZU9mKGZpcnN0TXlBbmltYWwuZmFkaW5nVHJhaWwpLCBcImVuYWJsZVwiLCB7XG4gICAgICAgICAgICAgICAgICBhcHBseSgpIHt9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGZpcnN0TXlBbmltYWwuYnViYmxlc0VtaXR0ZXIpIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoT2JqZWN0LmdldFByb3RvdHlwZU9mKGZpcnN0TXlBbmltYWwuYnViYmxlc0VtaXR0ZXIpLCBcImVtaXRcIiwge1xuICAgICAgICAgICAgICAgICAgc2V0OiAoKSA9PiB7fVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoYW5pbWFsQ2hlY2tJbnRlcnZhbCk7XG4gICAgICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgICAgfSwgMjAwKTtcbiAgICAgICAgICBpZiAobGFzdEV4ZWN1dGlvblRpbWVzdGFtcCA8IERhdGUubm93KCkgLSAzMDAwKSB7XG4gICAgICAgICAgICBzaG93Tm90aWZpY2F0aW9uKFwiQ2xpZW50IGxvYWRlZFwiKTtcbiAgICAgICAgICAgIGxhc3RFeGVjdXRpb25UaW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCB7fVxuICAgICAgcmV0dXJuIGNhY2hlU3RvcmUuYXBwbHkoYmluZFRhcmdldENvbnRleHQsIGFyZ3VtZW50c0xpc3QsIGNvbnRleHRBcmd1bWVudCk7XG4gICAgfVxuICB9KTtcbn07XG5cbmV4cG9ydCB7IGluaXRBbnRpRGV0ZWN0aW9uIH07XG4iLCJpbXBvcnQgeyBzaG93Tm90aWZpY2F0aW9uIH0gZnJvbSAnLi4vdWkvaW50ZXJhY3Rpb24uanMnO1xuaW1wb3J0IHsgc3RhdGUgfSBmcm9tICcuLi9jb3JlLmpzJztcblxuY29uc3QgaW5pdGlhbGl6ZUFzdHJhVmlzaW9uID0gKCkgPT4ge1xuICBpZiAoc3RhdGUuaXNBY3RpdmUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCFzdGF0ZS5hbmltYWxEYXRhKSB7XG4gICAgc2V0VGltZW91dChpbml0aWFsaXplQXN0cmFWaXNpb24sIDUwMCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRyeSB7XG4gICAgaWYgKHN0YXRlLmFuaW1hbERhdGEudGVycmFpbk1hbmFnZXIgJiYgc3RhdGUuYW5pbWFsRGF0YS50ZXJyYWluTWFuYWdlci5zaGFkb3cpIHtcbiAgICAgIHN0YXRlLmFuaW1hbERhdGEudGVycmFpbk1hbmFnZXIuc2hhZG93LnNldFNoYWRvd1NpemUoMTAwMDAwMCk7XG4gICAgICBzdGF0ZS5hbmltYWxEYXRhLnRlcnJhaW5NYW5hZ2VyLnNoYWRvdy5zZXRTaGFkb3dTaXplID0gKCkgPT4ge307XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAobGV0IGtleUEgaW4gc3RhdGUuYW5pbWFsRGF0YSkge1xuICAgICAgICBpZiAoc3RhdGUuYW5pbWFsRGF0YVtrZXlBXSAmJiBzdGF0ZS5hbmltYWxEYXRhW2tleUFdLnNoYWRvdykge1xuICAgICAgICAgIHN0YXRlLmFuaW1hbERhdGFba2V5QV0uc2hhZG93LnNldFNoYWRvd1NpemUoMTAwMDAwMCk7XG4gICAgICAgICAgc3RhdGUuYW5pbWFsRGF0YVtrZXlBXS5zaGFkb3cuc2V0U2hhZG93U2l6ZSA9ICgpID0+IHt9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygc3RhdGUuYW5pbWFsRGF0YS5zZXRGbGFzaCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBzdGF0ZS5hbmltYWxEYXRhLnNldEZsYXNoID0gKCkgPT4ge307XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAobGV0IGtleUIgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoc3RhdGUuYW5pbWFsRGF0YS5fX3Byb3RvX18pKSB7XG4gICAgICAgIGlmIChrZXlCLnN0YXJ0c1dpdGgoXCJfMHhcIikgJiYgdHlwZW9mIHN0YXRlLmFuaW1hbERhdGFba2V5Ql0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgIHN0YXRlLmFuaW1hbERhdGFba2V5Ql0gPSAoKSA9PiB7fTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBzdGF0ZS5nYW1lSW5zdGFuY2Uudmlld3BvcnQuY2xhbXBab29tKHtcbiAgICAgICAgICBtaW5XaWR0aDogMCxcbiAgICAgICAgICBtYXhXaWR0aDogMTAwMDAwMDBcbiAgICAgICAgfSk7XG4gICAgICAgIHN0YXRlLmdhbWVJbnN0YW5jZS52aWV3cG9ydC5wbHVnaW5zLnBsdWdpbnMuY2xhbXAgPSBudWxsO1xuICAgICAgICBzdGF0ZS5nYW1lSW5zdGFuY2Uudmlld3BvcnQucGx1Z2lucy5wbHVnaW5zW1wiY2xhbXAtem9vbVwiXSA9IG51bGw7XG4gICAgICB9IGNhdGNoIHt9XG4gICAgfSwgMzAwKTtcbiAgICBzaG93Tm90aWZpY2F0aW9uKFwiQXN0cmEtVmlzaW9uIGFjdGl2ZVwiKTtcbiAgfSBjYXRjaCAoZXJyb3JNZXNzYWdlKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkFzdHJhVmlzaW9uIEVycm9yOlwiLCBlcnJvck1lc3NhZ2UpO1xuICB9XG4gIHN0YXRlLmlzQWN0aXZlID0gdHJ1ZTtcbn07XG5cbmV4cG9ydCB7IGluaXRpYWxpemVBc3RyYVZpc2lvbiB9O1xuIiwiaW1wb3J0IHsgYnVpbGRFbnRpdHlTdGF0ZSwgc3RhcnRFbnRpdHlUcmFpbFRyYWNraW5nLCBzdG9wRW50aXR5VHJhaWxUcmFja2luZywgZ2V0QW5pbWFsUG9zaXRpb24sIGV4dHJhY3RQb3NpdGlvbiwgY2FsY3VsYXRlRGlyZWN0aW9uLCBjYWxjdWxhdGVEaXN0YW5jZSB9IGZyb20gJy4vbW92ZW1lbnQuanMnO1xuaW1wb3J0IHsgc2hvd05vdGlmaWNhdGlvbiB9IGZyb20gJy4uL3VpL2ludGVyYWN0aW9uLmpzJztcbmltcG9ydCB7IGdldE9yQ3JlYXRlQ2FudmFzIH0gZnJvbSAnLi4vdWkvcmFkYXIuanMnO1xuaW1wb3J0IHsgZ2V0Vmlld3BvcnRTY2FsZSwgZHJhZ1N0YXRlLCBzdGF0ZSB9IGZyb20gJy4uL2NvcmUuanMnO1xuaW1wb3J0IHsgZmluZEVudGl0eUJ5SWQgfSBmcm9tICcuL2F1dG9mYXJtLmpzJztcbmltcG9ydCB7IGlzVmFsaWRFbnRpdHkgfSBmcm9tICcuLi91dGlscy5qcyc7XG5cbndpbmRvdy5lbnRpdHlUcmFpbENvbG9yID0ge1xuICByOiAyNTUsXG4gIGc6IDE1MCxcbiAgYjogMFxufTtcbndpbmRvdy5lbnRpdHlUcmFpbEVuYWJsZWQgPSBmYWxzZTtcbndpbmRvdy5lbnRpdHlUcmFpbFRhcmdldElkID0gbnVsbDtcbndpbmRvdy5lbnRpdHlUcmFpbEhpc3RvcnkgPSBbXTtcbndpbmRvdy5lbnRpdHlUcmFpbE1heExlbmd0aCA9IDIwMDtcbndpbmRvdy5lbnRpdHlUcmFpbFJlY29yZEludGVydmFsID0gMTAwO1xud2luZG93LmVzcEVuYWJsZWQgPSBmYWxzZTtcbndpbmRvdy5lc3BDb2xvcnMgPSB7XG4gIGNsb3NlOiBcIiNmZjAwMDBcIixcbiAgbWVkaXVtOiBcIiNmZmZmMDBcIixcbiAgZmFyOiBcIiMwMGZmZmZcIixcbiAgdmVyeUZhcjogXCIjMDBmZjAwXCIsXG4gIHRyYWNrZWQ6IFwiI2ZmMDBmZlwiLFxuICBmb29kQ2xvc2U6IFwiIzAwZmYwMFwiLFxuICBmb29kTWVkaXVtOiBcIiM4OGZmODhcIixcbiAgZm9vZEZhcjogXCIjNDRjYzQ0XCJcbn07XG53aW5kb3cuZXNwVHJhY2tlZEVudGl0eUlkID0gbnVsbDtcbndpbmRvdy5lc3BNb2RlID0gXCJwbGF5ZXJzXCI7XG5cblxuZnVuY3Rpb24gdG9nZ2xlRW50aXR5VHJhaWwoKSB7XG4gIGlmICh3aW5kb3cuZW50aXR5VHJhaWxFbmFibGVkKSB7XG4gICAgd2luZG93LmVudGl0eVRyYWlsRW5hYmxlZCA9IGZhbHNlO1xuICAgIHdpbmRvdy5lbnRpdHlUcmFpbFRhcmdldElkID0gbnVsbDtcbiAgICBzdG9wRW50aXR5VHJhaWxUcmFja2luZygpO1xuICAgIHdpbmRvdy5lbnRpdHlUcmFpbEhpc3RvcnkgPSBbXTtcbiAgICBzaG93Tm90aWZpY2F0aW9uKFwiVHJhaWwgc3RvcHBlZFwiKTtcbiAgICByZWZyZXNoVUkoKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgcGxheWVyRGF0YSA9IGJ1aWxkRW50aXR5U3RhdGUoKTtcbiAgY29uc3QgaGFzTmVhcmJ5UGxheWVycyA9IHBsYXllckRhdGEgJiYgcGxheWVyRGF0YS5wbGF5ZXJzICYmIHBsYXllckRhdGEucGxheWVycy5sZW5ndGggPiAwO1xuICBpZiAoIWhhc05lYXJieVBsYXllcnMpIHtcbiAgICBzaG93Tm90aWZpY2F0aW9uKFwiTm8gcGxheWVycyBuZWFyYnkgdG8gdHJhY2VcIik7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHRhcmdldFBsYXllcklkID0gcGxheWVyRGF0YS5wbGF5ZXJzWzBdLmlkO1xuICBjb25zdCB0YXJnZXRQbGF5ZXJOYW1lID0gcGxheWVyRGF0YS5wbGF5ZXJzWzBdLmVudGl0eT8ubmFtZSB8fCBcIklEOlwiICsgdGFyZ2V0UGxheWVySWQ7XG4gIHdpbmRvdy5lbnRpdHlUcmFpbEVuYWJsZWQgPSB0cnVlO1xuICB3aW5kb3cuZW50aXR5VHJhaWxUYXJnZXRJZCA9IHRhcmdldFBsYXllcklkO1xuICB3aW5kb3cuZW50aXR5VHJhaWxIaXN0b3J5ID0gW107XG4gIHN0YXJ0RW50aXR5VHJhaWxUcmFja2luZygpO1xuICBzaG93Tm90aWZpY2F0aW9uKFwiVHJhY2luZzogXCIgKyB0YXJnZXRQbGF5ZXJOYW1lKTtcbiAgcmVmcmVzaFVJKCk7XG59XG5mdW5jdGlvbiByZWZyZXNoVUkoKSB7fVxuZnVuY3Rpb24gZHJhd0VudGl0eVRyYWlsKGN0eCwgY2FudmFzLCBwbGF5ZXJQb3MsIHpvb21TY2FsZSkge1xuICBpZiAoIXdpbmRvdy5lbnRpdHlUcmFpbEVuYWJsZWQgfHwgd2luZG93LmVudGl0eVRyYWlsSGlzdG9yeS5sZW5ndGggPCAyKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGNlbnRlclggPSBjYW52YXMud2lkdGggLyAyO1xuICBjb25zdCBjZW50ZXJZID0gY2FudmFzLmhlaWdodCAvIDI7XG4gIGNvbnN0IGN1cnJlbnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgY29uc3QgdHJhaWxEdXJhdGlvbiA9IDMwMDAwO1xuICBjb25zdCB7XG4gICAgcjogcmVkLFxuICAgIGc6IGdyZWVuLFxuICAgIGI6IGJsdWVcbiAgfSA9IHdpbmRvdy5lbnRpdHlUcmFpbENvbG9yO1xuICBmb3IgKGxldCBpID0gMTsgaSA8IHdpbmRvdy5lbnRpdHlUcmFpbEhpc3RvcnkubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBwcmV2UG9pbnQgPSB3aW5kb3cuZW50aXR5VHJhaWxIaXN0b3J5W2kgLSAxXTtcbiAgICBjb25zdCBjdXJyUG9pbnQgPSB3aW5kb3cuZW50aXR5VHJhaWxIaXN0b3J5W2ldO1xuICAgIGNvbnN0IGFnZSA9IHN0YXRlLmN1cnJlbnRUaW1lIC0gY3VyclBvaW50LnRpbWU7XG4gICAgY29uc3Qgb3BhY2l0eSA9IE1hdGgubWF4KDAuMDUsIDEgLSBhZ2UgLyB0cmFpbER1cmF0aW9uKTtcbiAgICBjb25zdCBzdGFydFggPSBjZW50ZXJYICsgKHByZXZQb2ludC54IC0gcGxheWVyUG9zLngpICogem9vbVNjYWxlO1xuICAgIGNvbnN0IHN0YXJ0WSA9IGNlbnRlclkgKyAocHJldlBvaW50LnkgLSBwbGF5ZXJQb3MueSkgKiB6b29tU2NhbGU7XG4gICAgY29uc3QgZW5kWCA9IGNlbnRlclggKyAoY3VyclBvaW50LnggLSBwbGF5ZXJQb3MueCkgKiB6b29tU2NhbGU7XG4gICAgY29uc3QgZW5kWSA9IGNlbnRlclkgKyAoY3VyclBvaW50LnkgLSBwbGF5ZXJQb3MueSkgKiB6b29tU2NhbGU7XG4gICAgY29uc3QgcHJvZ3Jlc3MgPSBpIC8gd2luZG93LmVudGl0eVRyYWlsSGlzdG9yeS5sZW5ndGg7XG4gICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgIGN0eC5tb3ZlVG8oc3RhcnRYLCBzdGFydFkpO1xuICAgIGN0eC5saW5lVG8oZW5kWCwgZW5kWSk7XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKFwiICsgcmVkICsgXCIsXCIgKyBncmVlbiArIFwiLFwiICsgYmx1ZSArIFwiLFwiICsgb3BhY2l0eSArIFwiKVwiO1xuICAgIGN0eC5saW5lV2lkdGggPSAxLjUgKyBwcm9ncmVzcyAqIDEuNTtcbiAgICBjdHguc3Ryb2tlKCk7XG4gIH1cbiAgZm9yIChsZXQgaiA9IDA7IGogPCB3aW5kb3cuZW50aXR5VHJhaWxIaXN0b3J5Lmxlbmd0aDsgaiArPSA1KSB7XG4gICAgY29uc3QgaGlzdG9yeVBvaW50ID0gd2luZG93LmVudGl0eVRyYWlsSGlzdG9yeVtqXTtcbiAgICBjb25zdCBwb2ludEFnZSA9IHN0YXRlLmN1cnJlbnRUaW1lIC0gaGlzdG9yeVBvaW50LnRpbWU7XG4gICAgY29uc3QgcG9pbnRPcGFjaXR5ID0gTWF0aC5tYXgoMC4xLCAxIC0gcG9pbnRBZ2UgLyB0cmFpbER1cmF0aW9uKTtcbiAgICBjb25zdCBwb2ludFggPSBjZW50ZXJYICsgKGhpc3RvcnlQb2ludC54IC0gcGxheWVyUG9zLngpICogem9vbVNjYWxlO1xuICAgIGNvbnN0IHBvaW50WSA9IGNlbnRlclkgKyAoaGlzdG9yeVBvaW50LnkgLSBwbGF5ZXJQb3MueSkgKiB6b29tU2NhbGU7XG4gICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYShcIiArIHJlZCArIFwiLFwiICsgZ3JlZW4gKyBcIixcIiArIGJsdWUgKyBcIixcIiArIHBvaW50T3BhY2l0eSArIFwiKVwiO1xuICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICBjdHguYXJjKHBvaW50WCwgcG9pbnRZLCAyLCAwLCBNYXRoLlBJICogMik7XG4gICAgY3R4LmZpbGwoKTtcbiAgfVxuICBpZiAod2luZG93LmVudGl0eVRyYWlsSGlzdG9yeS5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgbGFzdFRyYWlsUG9zaXRpb24gPSB3aW5kb3cuZW50aXR5VHJhaWxIaXN0b3J5W3dpbmRvdy5lbnRpdHlUcmFpbEhpc3RvcnkubGVuZ3RoIC0gMV07XG4gICAgY29uc3QgY2FsY3VsYXRlZFhPZmZzZXQgPSBjZW50ZXJYICsgKGxhc3RUcmFpbFBvc2l0aW9uLnggLSBwbGF5ZXJQb3MueCkgKiB6b29tU2NhbGU7XG4gICAgY29uc3QgY2FsY3VsYXRlZFlPZmZzZXQgPSBjZW50ZXJZICsgKGxhc3RUcmFpbFBvc2l0aW9uLnkgLSBwbGF5ZXJQb3MueSkgKiB6b29tU2NhbGU7XG4gICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiKFwiICsgcmVkICsgXCIsXCIgKyBncmVlbiArIFwiLFwiICsgYmx1ZSArIFwiKVwiO1xuICAgIGN0eC5mb250ID0gXCJib2xkIDEwcHggbW9ub3NwYWNlXCI7XG4gICAgY3R4LmZpbGxUZXh0KFwiVFJBSUwgKFwiICsgd2luZG93LmVudGl0eVRyYWlsSGlzdG9yeS5sZW5ndGggKyBcIiBwdHMpXCIsIGNhbGN1bGF0ZWRYT2Zmc2V0ICsgOCwgY2FsY3VsYXRlZFlPZmZzZXQgLSA4KTtcbiAgfVxufVxuZnVuY3Rpb24gcmVuZGVyTG9vcCgpIHtcbiAgY29uc3Qgb3ZlcmxheUNhbnZhcyA9IGdldE9yQ3JlYXRlQ2FudmFzKFwiYXN0LW92ZXJsYXlcIiwgOTk5OTk3KTtcbiAgY29uc3Qgb3ZlcmxheUN0eCA9IG92ZXJsYXlDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuICBvdmVybGF5Q3R4LmNsZWFyUmVjdCgwLCAwLCBvdmVybGF5Q2FudmFzLndpZHRoLCBvdmVybGF5Q2FudmFzLmhlaWdodCk7XG4gIGNvbnN0IGN1cnJlbnRQbGF5ZXJQb3MgPSBnZXRBbmltYWxQb3NpdGlvbigpO1xuICBpZiAoY3VycmVudFBsYXllclBvcyAmJiB3aW5kb3cuZW50aXR5VHJhaWxFbmFibGVkKSB7XG4gICAgZHJhd0VudGl0eVRyYWlsKG92ZXJsYXlDdHgsIG92ZXJsYXlDYW52YXMsIGN1cnJlbnRQbGF5ZXJQb3MsIGdldFZpZXdwb3J0U2NhbGUoKSk7XG4gIH1cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlckxvb3ApO1xufVxuZnVuY3Rpb24gZHJhd0VTUChjdHgsIGdhbWVTdGF0ZSwgb2Zmc2V0WCwgb2Zmc2V0WSwgc2NhbGUpIHtcbiAgaWYgKCFnYW1lU3RhdGUgfHwgZ2FtZVN0YXRlLmVycm9yKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IG15UG9zID0gZ2FtZVN0YXRlLm15UG9zO1xuICBjb25zdCBlc3BNb2RlID0gd2luZG93LmVzcE1vZGU7XG4gIGNvbnN0IHRyYWNrZWRJZCA9IHdpbmRvdy5lc3BUcmFja2VkRW50aXR5SWQ7XG4gIGxldCBlbnRpdGllcyA9IGVzcE1vZGUgPT09IFwicGxheWVyc1wiID8gZ2FtZVN0YXRlLnBsYXllcnMgfHwgW10gOiBnYW1lU3RhdGUuZm9vZCB8fCBbXTtcbiAgbGV0IHZpZXdDZW50ZXJYID0gMDtcbiAgbGV0IHZpZXdDZW50ZXJZID0gMDtcbiAgdHJ5IHtcbiAgICBpZiAoc3RhdGUuZ2FtZUluc3RhbmNlPy52aWV3cG9ydCkge1xuICAgICAgY29uc3Qgdmlld3BvcnQgPSBzdGF0ZS5nYW1lSW5zdGFuY2Uudmlld3BvcnQ7XG4gICAgICBpZiAodmlld3BvcnQuY2VudGVyICYmIHZpZXdwb3J0LmNlbnRlci54ICE9IG51bGwpIHtcbiAgICAgICAgdmlld0NlbnRlclggPSAodmlld3BvcnQuY2VudGVyLnggLSBteVBvcy54KSAqIHNjYWxlO1xuICAgICAgICB2aWV3Q2VudGVyWSA9ICh2aWV3cG9ydC5jZW50ZXIueSAtIG15UG9zLnkpICogc2NhbGU7XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHt9XG4gIGVudGl0aWVzLmZvckVhY2godGFyZ2V0RW50aXR5ID0+IHtcbiAgICBjb25zdCBkZWx0YVggPSB0YXJnZXRFbnRpdHkueCAtIG15UG9zLng7XG4gICAgY29uc3QgZGVsdGFZID0gdGFyZ2V0RW50aXR5LnkgLSBteVBvcy55O1xuICAgIGNvbnN0IHNjcmVlblBvc1ggPSBvZmZzZXRYICsgZGVsdGFYICogc2NhbGUgLSB2aWV3Q2VudGVyWDtcbiAgICBjb25zdCBzY3JlZW5Qb3NZID0gb2Zmc2V0WSArIGRlbHRhWSAqIHNjYWxlIC0gdmlld0NlbnRlclk7XG4gICAgY29uc3QgaXNUcmFja2VkID0gdHJhY2tlZElkICYmIHRhcmdldEVudGl0eS5pZCA9PT0gdHJhY2tlZElkO1xuICAgIGNvbnN0IGJveFNpemUgPSAyMDtcbiAgICBsZXQgZXNwQ29sb3I7XG4gICAgaWYgKGVzcE1vZGUgPT09IFwicGxheWVyc1wiKSB7XG4gICAgICBlc3BDb2xvciA9IGlzVHJhY2tlZCA/IHdpbmRvdy5lc3BDb2xvcnMudHJhY2tlZCA6IHRhcmdldEVudGl0eS5kaXN0YW5jZSA8IDUwMCA/IHdpbmRvdy5lc3BDb2xvcnMuY2xvc2UgOiB0YXJnZXRFbnRpdHkuZGlzdGFuY2UgPCAxNTAwID8gd2luZG93LmVzcENvbG9ycy5tZWRpdW0gOiB0YXJnZXRFbnRpdHkuZGlzdGFuY2UgPCAzMDAwID8gd2luZG93LmVzcENvbG9ycy5mYXIgOiB3aW5kb3cuZXNwQ29sb3JzLnZlcnlGYXI7XG4gICAgICBjdHguc3Ryb2tlU3R5bGUgPSBlc3BDb2xvcjtcbiAgICAgIGN0eC5saW5lV2lkdGggPSBpc1RyYWNrZWQgPyAzIDogMjtcbiAgICAgIGN0eC5zdHJva2VSZWN0KHNjcmVlblBvc1ggLSBib3hTaXplIC8gMiwgc2NyZWVuUG9zWSAtIGJveFNpemUgLyAyLCBib3hTaXplLCBib3hTaXplKTtcbiAgICAgIGN0eC5maWxsU3R5bGUgPSBlc3BDb2xvcjtcbiAgICAgIGN0eC5mb250ID0gXCJib2xkIDExcHggbW9ub3NwYWNlXCI7XG4gICAgICBjdHguZmlsbFRleHQodGFyZ2V0RW50aXR5LmVudGl0eT8uZW50aXR5TmFtZSB8fCB0YXJnZXRFbnRpdHkuZW50aXR5Py5uYW1lIHx8IFwiSUQ6XCIgKyB0YXJnZXRFbnRpdHkuaWQsIHNjcmVlblBvc1ggLSBib3hTaXplIC8gMiwgc2NyZWVuUG9zWSAtIGJveFNpemUgLyAyIC0gOCk7XG4gICAgICBjdHguZm9udCA9IFwiMTBweCBtb25vc3BhY2VcIjtcbiAgICAgIGN0eC5maWxsVGV4dChNYXRoLnJvdW5kKHRhcmdldEVudGl0eS5kaXN0YW5jZSkudG9TdHJpbmcoKSwgc2NyZWVuUG9zWCAtIGJveFNpemUgLyAyLCBzY3JlZW5Qb3NZICsgYm94U2l6ZSAvIDIgKyAxMyk7XG4gICAgICBpZiAodGFyZ2V0RW50aXR5LmVudGl0eT8udmlzaWJsZUZpc2hMZXZlbCAhPSBudWxsKSB7XG4gICAgICAgIGN0eC5maWxsVGV4dChcIkx2bDpcIiArIHRhcmdldEVudGl0eS5lbnRpdHkudmlzaWJsZUZpc2hMZXZlbCwgc2NyZWVuUG9zWCAtIGJveFNpemUgLyAyLCBzY3JlZW5Qb3NZICsgYm94U2l6ZSAvIDIgKyAyNCk7XG4gICAgICB9XG4gICAgICBpZiAod2luZG93LmxvY2tFbmFibGVkICYmIHdpbmRvdy5sb2NrVGFyZ2V0SWQgPT09IHRhcmdldEVudGl0eS5pZCkge1xuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiNmZjAwMDBcIjtcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDI7XG4gICAgICAgIGNvbnN0IGJveE9mZnNldCA9IDE1O1xuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICAgIGN0eC5tb3ZlVG8oc2NyZWVuUG9zWCAtIGJveE9mZnNldCwgc2NyZWVuUG9zWSk7XG4gICAgICAgIGN0eC5saW5lVG8oc2NyZWVuUG9zWCArIGJveE9mZnNldCwgc2NyZWVuUG9zWSk7XG4gICAgICAgIGN0eC5tb3ZlVG8oc2NyZWVuUG9zWCwgc2NyZWVuUG9zWSAtIGJveE9mZnNldCk7XG4gICAgICAgIGN0eC5saW5lVG8oc2NyZWVuUG9zWCwgc2NyZWVuUG9zWSArIGJveE9mZnNldCk7XG4gICAgICAgIGN0eC5zdHJva2UoKTtcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICBjdHguYXJjKHNjcmVlblBvc1gsIHNjcmVlblBvc1ksIGJveE9mZnNldCwgMCwgTWF0aC5QSSAqIDIpO1xuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMjU1LDAsMCwwLjcpXCI7XG4gICAgICAgIGN0eC5zdHJva2UoKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiI2ZmMDAwMFwiO1xuICAgICAgICBjdHguZm9udCA9IFwiYm9sZCAxMHB4IG1vbm9zcGFjZVwiO1xuICAgICAgICBjdHguZmlsbFRleHQoXCJMT0NLRURcIiwgc2NyZWVuUG9zWCArIGJveE9mZnNldCArIDQsIHNjcmVlblBvc1kgLSA0KTtcbiAgICAgIH1cbiAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgIGN0eC5tb3ZlVG8ob2Zmc2V0WCwgb2Zmc2V0WSk7XG4gICAgICBjdHgubGluZVRvKHNjcmVlblBvc1gsIHNjcmVlblBvc1kpO1xuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gZXNwQ29sb3I7XG4gICAgICBjdHguZ2xvYmFsQWxwaGEgPSAwLjI1O1xuICAgICAgY3R4LmxpbmVXaWR0aCA9IDE7XG4gICAgICBjdHguc3Ryb2tlKCk7XG4gICAgICBjdHguZ2xvYmFsQWxwaGEgPSAxO1xuICAgIH0gZWxzZSB7XG4gICAgICBlc3BDb2xvciA9IHRhcmdldEVudGl0eS5kaXN0YW5jZSA8IDMwMCA/IHdpbmRvdy5lc3BDb2xvcnMuZm9vZENsb3NlIDogdGFyZ2V0RW50aXR5LmRpc3RhbmNlIDwgMTAwMCA/IHdpbmRvdy5lc3BDb2xvcnMuZm9vZE1lZGl1bSA6IHdpbmRvdy5lc3BDb2xvcnMuZm9vZEZhcjtcbiAgICAgIGN0eC5zdHJva2VTdHlsZSA9IGVzcENvbG9yO1xuICAgICAgY3R4LmxpbmVXaWR0aCA9IDEuNTtcbiAgICAgIGN0eC5zdHJva2VSZWN0KHNjcmVlblBvc1ggLSBib3hTaXplIC8gMiwgc2NyZWVuUG9zWSAtIGJveFNpemUgLyAyLCBib3hTaXplLCBib3hTaXplKTtcbiAgICAgIGlmICh0YXJnZXRFbnRpdHkuZGlzdGFuY2UgPCAxMDAwKSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBlc3BDb2xvcjtcbiAgICAgICAgY3R4LmZvbnQgPSBcIjlweCBtb25vc3BhY2VcIjtcbiAgICAgICAgY3R4LmZpbGxUZXh0KE1hdGgucm91bmQodGFyZ2V0RW50aXR5LmRpc3RhbmNlKS50b1N0cmluZygpLCBzY3JlZW5Qb3NYICsgYm94U2l6ZSAvIDIgKyAzLCBzY3JlZW5Qb3NZICsgMyk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cbmZ1bmN0aW9uIGRyYXdUcmFja2VyTGluZShjdHgsIGNhbnZhcywgcGxheWVyUG9zLCB6b29tU2NhbGUpIHtcbiAgaWYgKCF3aW5kb3cuZXNwVHJhY2tlZEVudGl0eUlkKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHRyYWNrZWRFbnRpdHkgPSBmaW5kRW50aXR5QnlJZCh3aW5kb3cuZXNwVHJhY2tlZEVudGl0eUlkKTtcbiAgaWYgKCF0cmFja2VkRW50aXR5KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghaXNWYWxpZEVudGl0eSh0cmFja2VkRW50aXR5KSkge1xuICAgIHdpbmRvdy5lc3BUcmFja2VkRW50aXR5SWQgPSBudWxsO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBlbnRpdHlQb3MgPSBleHRyYWN0UG9zaXRpb24odHJhY2tlZEVudGl0eSk7XG4gIGlmICghZW50aXR5UG9zIHx8ICFwbGF5ZXJQb3MpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgY2VudGVyWCA9IGNhbnZhcy53aWR0aCAvIDI7XG4gIGNvbnN0IGNlbnRlclkgPSBjYW52YXMuaGVpZ2h0IC8gMjtcbiAgY29uc3QgZGlmZlggPSBlbnRpdHlQb3MueCAtIHBsYXllclBvcy54O1xuICBjb25zdCBkaWZmWSA9IGVudGl0eVBvcy55IC0gcGxheWVyUG9zLnk7XG4gIGNvbnN0IHRhcmdldFggPSBjZW50ZXJYICsgZGlmZlggKiB6b29tU2NhbGU7XG4gIGNvbnN0IHRhcmdldFkgPSBjZW50ZXJZICsgZGlmZlkgKiB6b29tU2NhbGU7XG4gIGNvbnN0IGRpc3RhbmNlID0gY2FsY3VsYXRlRGlzdGFuY2UocGxheWVyUG9zLngsIHBsYXllclBvcy55LCBlbnRpdHlQb3MueCwgZW50aXR5UG9zLnkpO1xuICBjb25zdCBlbnRpdHlEaXIgPSBjYWxjdWxhdGVEaXJlY3Rpb24odHJhY2tlZEVudGl0eSk7XG4gIGNvbnN0IHB1bHNlID0gTWF0aC5zaW4oRGF0ZS5ub3coKSAvIDIwMCkgKiAwLjMgKyAwLjc7XG4gIGNvbnN0IG1hcmtlclNpemUgPSA0MDtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBjdHgubW92ZVRvKGNlbnRlclgsIGNlbnRlclkpO1xuICBjdHgubGluZVRvKHRhcmdldFgsIHRhcmdldFkpO1xuICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMjU1LDAsMjU1LDAuNilcIjtcbiAgY3R4LmxpbmVXaWR0aCA9IDI7XG4gIGN0eC5zZXRMaW5lRGFzaChbOCwgNF0pO1xuICBjdHguc3Ryb2tlKCk7XG4gIGN0eC5zZXRMaW5lRGFzaChbXSk7XG4gIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgyNTUsMCwyNTUsXCIgKyBwdWxzZSArIFwiKVwiO1xuICBjdHgubGluZVdpZHRoID0gMztcbiAgY3R4LnN0cm9rZVJlY3QodGFyZ2V0WCAtIG1hcmtlclNpemUgLyAyLCB0YXJnZXRZIC0gbWFya2VyU2l6ZSAvIDIsIG1hcmtlclNpemUsIG1hcmtlclNpemUpO1xuICBjb25zdCBhcnJvd0xlbmd0aCA9IDUwO1xuICBjb25zdCBhbmdsZSA9IE1hdGguYXRhbjIoZW50aXR5RGlyLmRpclksIGVudGl0eURpci5kaXJYKTtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBjdHgubW92ZVRvKHRhcmdldFgsIHRhcmdldFkpO1xuICBjdHgubGluZVRvKHRhcmdldFggKyBlbnRpdHlEaXIuZGlyWCAqIGFycm93TGVuZ3RoLCB0YXJnZXRZICsgZW50aXR5RGlyLmRpclkgKiBhcnJvd0xlbmd0aCk7XG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiI2ZmMDBmZlwiO1xuICBjdHgubGluZVdpZHRoID0gMjtcbiAgY3R4LnN0cm9rZSgpO1xuICBjdHguYmVnaW5QYXRoKCk7XG4gIGN0eC5tb3ZlVG8odGFyZ2V0WCArIGVudGl0eURpci5kaXJYICogYXJyb3dMZW5ndGgsIHRhcmdldFkgKyBlbnRpdHlEaXIuZGlyWSAqIGFycm93TGVuZ3RoKTtcbiAgY3R4LmxpbmVUbyh0YXJnZXRYICsgZW50aXR5RGlyLmRpclggKiBhcnJvd0xlbmd0aCAtIE1hdGguY29zKGFuZ2xlIC0gMC40KSAqIDEwLCB0YXJnZXRZICsgZW50aXR5RGlyLmRpclkgKiBhcnJvd0xlbmd0aCAtIE1hdGguc2luKGFuZ2xlIC0gMC40KSAqIDEwKTtcbiAgY3R4Lm1vdmVUbyh0YXJnZXRYICsgZW50aXR5RGlyLmRpclggKiBhcnJvd0xlbmd0aCwgdGFyZ2V0WSArIGVudGl0eURpci5kaXJZICogYXJyb3dMZW5ndGgpO1xuICBjdHgubGluZVRvKHRhcmdldFggKyBlbnRpdHlEaXIuZGlyWCAqIGFycm93TGVuZ3RoIC0gTWF0aC5jb3MoYW5nbGUgKyAwLjQpICogMTAsIHRhcmdldFkgKyBlbnRpdHlEaXIuZGlyWSAqIGFycm93TGVuZ3RoIC0gTWF0aC5zaW4oYW5nbGUgKyAwLjQpICogMTApO1xuICBjdHguc3Ryb2tlU3R5bGUgPSBcIiNmZjAwZmZcIjtcbiAgY3R4LmxpbmVXaWR0aCA9IDI7XG4gIGN0eC5zdHJva2UoKTtcbiAgY29uc3QgcmVjdFdpZHRoID0gMTgwO1xuICBjb25zdCByZWN0SGVpZ2h0ID0gNzA7XG4gIGNvbnN0IHJlY3RYID0gTWF0aC5taW4odGFyZ2V0WCArIG1hcmtlclNpemUgLyAyICsgMTAsIGNhbnZhcy53aWR0aCAtIHJlY3RXaWR0aCAtIDUpO1xuICBjb25zdCByZWN0WSA9IE1hdGgubWF4KDUsIE1hdGgubWluKHRhcmdldFkgLSByZWN0SGVpZ2h0IC8gMiwgY2FudmFzLmhlaWdodCAtIHJlY3RIZWlnaHQgLSA1KSk7XG4gIGN0eC5maWxsU3R5bGUgPSBcInJnYmEoMCwwLDAsMC44NSlcIjtcbiAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDI1NSwwLDI1NSxcIiArIHB1bHNlICsgXCIpXCI7XG4gIGN0eC5saW5lV2lkdGggPSAxLjU7XG4gIGN0eC5iZWdpblBhdGgoKTtcbiAgY3R4LnJvdW5kUmVjdChyZWN0WCwgcmVjdFksIHJlY3RXaWR0aCwgcmVjdEhlaWdodCwgNCk7XG4gIGN0eC5maWxsKCk7XG4gIGN0eC5zdHJva2UoKTtcbiAgY3R4LmZpbGxTdHlsZSA9IFwiI2ZmMDBmZlwiO1xuICBjdHguZm9udCA9IFwiYm9sZCAxMnB4IG1vbm9zcGFjZVwiO1xuICBjdHguZmlsbFRleHQoXCJUUkFDS0lOR1wiLCByZWN0WCArIDgsIHJlY3RZICsgMTgpO1xuICBjdHguZmlsbFN0eWxlID0gXCIjZmZmZmZmXCI7XG4gIGN0eC5mb250ID0gXCIxMXB4IG1vbm9zcGFjZVwiO1xuICBjdHguZmlsbFRleHQoKHRyYWNrZWRFbnRpdHkubmFtZSB8fCBcIkVudGl0eSBcIiArIHdpbmRvdy5lc3BUcmFja2VkRW50aXR5SWQpLnN1YnN0cmluZygwLCAxOCksIHJlY3RYICsgOCwgcmVjdFkgKyAzNCk7XG4gIGN0eC5maWxsU3R5bGUgPSBcIiNmZjAwZmZcIjtcbiAgY3R4LmZvbnQgPSBcImJvbGQgMTRweCBtb25vc3BhY2VcIjtcbiAgY3R4LmZpbGxUZXh0KE1hdGgucm91bmQoZGlzdGFuY2UpICsgXCIgdW5pdHNcIiwgcmVjdFggKyA4LCByZWN0WSArIDUyKTtcbiAgaWYgKHRhcmdldFggPCAwIHx8IHRhcmdldFggPiBjYW52YXMud2lkdGggfHwgdGFyZ2V0WSA8IDAgfHwgdGFyZ2V0WSA+IGNhbnZhcy5oZWlnaHQpIHtcbiAgICBjb25zdCBhcnJvd0FuZ2xlID0gTWF0aC5hdGFuMih0YXJnZXRZIC0gY2VudGVyWSwgdGFyZ2V0WCAtIGNlbnRlclgpO1xuICAgIGNvbnN0IGFycm93Q2VudGVyWCA9IGNlbnRlclggKyBNYXRoLmNvcyhhcnJvd0FuZ2xlKSAqIChjYW52YXMud2lkdGggLyAyIC0gNDApO1xuICAgIGNvbnN0IGFycm93Q2VudGVyWSA9IGNlbnRlclkgKyBNYXRoLnNpbihhcnJvd0FuZ2xlKSAqIChjYW52YXMuaGVpZ2h0IC8gMiAtIDQwKTtcbiAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDAsMCwwLDAuODUpXCI7XG4gICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgIGN0eC5yb3VuZFJlY3QoYXJyb3dDZW50ZXJYIC0gNDAsIGFycm93Q2VudGVyWSAtIDE1LCA4MCwgMzAsIDQpO1xuICAgIGN0eC5maWxsKCk7XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gXCIjZmYwMGZmXCI7XG4gICAgY3R4LmxpbmVXaWR0aCA9IDEuNTtcbiAgICBjdHguc3Ryb2tlKCk7XG4gICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgIGN0eC5tb3ZlVG8oYXJyb3dDZW50ZXJYICsgTWF0aC5jb3MoYXJyb3dBbmdsZSkgKiAyMCwgYXJyb3dDZW50ZXJZICsgTWF0aC5zaW4oYXJyb3dBbmdsZSkgKiAyMCk7XG4gICAgY3R4LmxpbmVUbyhhcnJvd0NlbnRlclggLSBNYXRoLmNvcyhhcnJvd0FuZ2xlIC0gMC41KSAqIDEwLCBhcnJvd0NlbnRlclkgLSBNYXRoLnNpbihhcnJvd0FuZ2xlIC0gMC41KSAqIDEwKTtcbiAgICBjdHgubGluZVRvKGFycm93Q2VudGVyWCAtIE1hdGguY29zKGFycm93QW5nbGUgKyAwLjUpICogMTAsIGFycm93Q2VudGVyWSAtIE1hdGguc2luKGFycm93QW5nbGUgKyAwLjUpICogMTApO1xuICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgICBjdHguZmlsbFN0eWxlID0gXCIjZmYwMGZmXCI7XG4gICAgY3R4LmZpbGwoKTtcbiAgICBjdHguZmlsbFN0eWxlID0gXCIjZmZmZmZmXCI7XG4gICAgY3R4LmZvbnQgPSBcImJvbGQgMTFweCBtb25vc3BhY2VcIjtcbiAgICBjdHgudGV4dEFsaWduID0gXCJjZW50ZXJcIjtcbiAgICBjdHguZmlsbFRleHQoTWF0aC5yb3VuZChkaXN0YW5jZSkudG9TdHJpbmcoKSwgYXJyb3dDZW50ZXJYLCBhcnJvd0NlbnRlclkgKyA0KTtcbiAgICBjdHgudGV4dEFsaWduID0gXCJsZWZ0XCI7XG4gIH1cbn1cbmZ1bmN0aW9uIGRyYXdSYWRhcihjdHgsIGNhbnZhcywgZ2FtZVN0YXRlKSB7XG4gIGlmICghZ2FtZVN0YXRlIHx8IGdhbWVTdGF0ZS5lcnJvcikge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCByYWRhclNpemUgPSAxNTA7XG4gIGlmIChkcmFnU3RhdGUueCA9PT0gbnVsbCkge1xuICAgIGRyYWdTdGF0ZS54ID0gY2FudmFzLndpZHRoIC0gcmFkYXJTaXplIC0gMjA7XG4gIH1cbiAgY29uc3QgcmFkYXJYID0gZHJhZ1N0YXRlLng7XG4gIGNvbnN0IHJhZGFyWSA9IGRyYWdTdGF0ZS55O1xuICBjb25zdCB3b3JsZFNjYWxlID0gNTAwMDtcbiAgY29uc3QgcGl4ZWxTY2FsZSA9IHJhZGFyU2l6ZSAvICh3b3JsZFNjYWxlICogMik7XG4gIHdpbmRvdy5fcmFkYXJCb3VuZHMgPSB7XG4gICAgeDogcmFkYXJYLFxuICAgIHk6IHJhZGFyWSxcbiAgICB3OiByYWRhclNpemUsXG4gICAgaDogcmFkYXJTaXplICsgMjJcbiAgfTtcbiAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYSgyMCwyMCwyMCwwLjkpXCI7XG4gIGN0eC5iZWdpblBhdGgoKTtcbiAgY3R4LnJvdW5kUmVjdChyYWRhclgsIHJhZGFyWSwgcmFkYXJTaXplLCByYWRhclNpemUsIDQpO1xuICBjdHguZmlsbCgpO1xuICBjdHguc3Ryb2tlU3R5bGUgPSBcIiMzMzNcIjtcbiAgY3R4LmxpbmVXaWR0aCA9IDE7XG4gIGN0eC5zdHJva2UoKTtcbiAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDYwLDYwLDYwLDAuNSlcIjtcbiAgY3R4LmxpbmVXaWR0aCA9IDAuNTtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBjdHgubW92ZVRvKHJhZGFyWCArIHJhZGFyU2l6ZSAvIDIsIHJhZGFyWSk7XG4gIGN0eC5saW5lVG8ocmFkYXJYICsgcmFkYXJTaXplIC8gMiwgcmFkYXJZICsgcmFkYXJTaXplKTtcbiAgY3R4Lm1vdmVUbyhyYWRhclgsIHJhZGFyWSArIHJhZGFyU2l6ZSAvIDIpO1xuICBjdHgubGluZVRvKHJhZGFyWCArIHJhZGFyU2l6ZSwgcmFkYXJZICsgcmFkYXJTaXplIC8gMik7XG4gIGN0eC5zdHJva2UoKTtcbiAgZm9yIChsZXQgY2lyY2xlUmFkaXVzRmFjdG9yID0gMC4yNTsgY2lyY2xlUmFkaXVzRmFjdG9yIDw9IDE7IGNpcmNsZVJhZGl1c0ZhY3RvciArPSAwLjI1KSB7XG4gICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgIGN0eC5hcmMocmFkYXJYICsgcmFkYXJTaXplIC8gMiwgcmFkYXJZICsgcmFkYXJTaXplIC8gMiwgcmFkYXJTaXplIC8gMiAqIGNpcmNsZVJhZGl1c0ZhY3RvciwgMCwgTWF0aC5QSSAqIDIpO1xuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSg2MCw2MCw2MCxcIiArICgwLjIgKyBjaXJjbGVSYWRpdXNGYWN0b3IgKiAwLjEpICsgXCIpXCI7XG4gICAgY3R4LnN0cm9rZSgpO1xuICB9XG4gIGN0eC5maWxsU3R5bGUgPSBcIiMxZGI5NTRcIjtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBjdHguYXJjKHJhZGFyWCArIHJhZGFyU2l6ZSAvIDIsIHJhZGFyWSArIHJhZGFyU2l6ZSAvIDIsIDQsIDAsIE1hdGguUEkgKiAyKTtcbiAgY3R4LmZpbGwoKTtcbiAgY29uc3QgZW50aXRpZXNUb0RyYXcgPSB3aW5kb3cuZXNwTW9kZSA9PT0gXCJwbGF5ZXJzXCIgPyBnYW1lU3RhdGUucGxheWVycyB8fCBbXSA6IGdhbWVTdGF0ZS5mb29kIHx8IFtdO1xuICBlbnRpdGllc1RvRHJhdy5mb3JFYWNoKHRhcmdldEVudGl0eSA9PiB7XG4gICAgY29uc3QgZGlmZlggPSB0YXJnZXRFbnRpdHkueCAtIGdhbWVTdGF0ZS5teVBvcy54O1xuICAgIGNvbnN0IGRpZmZZID0gdGFyZ2V0RW50aXR5LnkgLSBnYW1lU3RhdGUubXlQb3MueTtcbiAgICBsZXQgc2NyZWVuWCA9IE1hdGgubWF4KHJhZGFyWCArIDIsIE1hdGgubWluKHJhZGFyWCArIHJhZGFyU2l6ZSAtIDIsIHJhZGFyWCArIHJhZGFyU2l6ZSAvIDIgKyBkaWZmWCAqIHBpeGVsU2NhbGUpKTtcbiAgICBsZXQgc2NyZWVuWSA9IE1hdGgubWF4KHJhZGFyWSArIDIsIE1hdGgubWluKHJhZGFyWSArIHJhZGFyU2l6ZSAtIDIsIHJhZGFyWSArIHJhZGFyU2l6ZSAvIDIgKyBkaWZmWSAqIHBpeGVsU2NhbGUpKTtcbiAgICBsZXQgZXNwQ29sb3I7XG4gICAgbGV0IGNpcmNsZVJhZGl1cztcbiAgICBpZiAod2luZG93LmVzcE1vZGUgPT09IFwicGxheWVyc1wiKSB7XG4gICAgICBlc3BDb2xvciA9IHRhcmdldEVudGl0eS5kaXN0YW5jZSA8IDUwMCA/IHdpbmRvdy5lc3BDb2xvcnMuY2xvc2UgOiB0YXJnZXRFbnRpdHkuZGlzdGFuY2UgPCAxNTAwID8gd2luZG93LmVzcENvbG9ycy5tZWRpdW0gOiB0YXJnZXRFbnRpdHkuZGlzdGFuY2UgPCAzMDAwID8gd2luZG93LmVzcENvbG9ycy5mYXIgOiBcIiM4ODhcIjtcbiAgICAgIGNpcmNsZVJhZGl1cyA9IDM7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVzcENvbG9yID0gd2luZG93LmVzcENvbG9ycy5mb29kQ2xvc2U7XG4gICAgICBjaXJjbGVSYWRpdXMgPSAxLjU7XG4gICAgfVxuICAgIGlmICh3aW5kb3cuZXNwVHJhY2tlZEVudGl0eUlkICYmIHRhcmdldEVudGl0eS5pZCA9PT0gd2luZG93LmVzcFRyYWNrZWRFbnRpdHlJZCkge1xuICAgICAgZXNwQ29sb3IgPSB3aW5kb3cuZXNwQ29sb3JzLnRyYWNrZWQ7XG4gICAgICBjaXJjbGVSYWRpdXMgPSA0O1xuICAgIH1cbiAgICBpZiAod2luZG93LmxvY2tUYXJnZXRJZCAmJiB0YXJnZXRFbnRpdHkuaWQgPT09IHdpbmRvdy5sb2NrVGFyZ2V0SWQpIHtcbiAgICAgIGVzcENvbG9yID0gXCIjZmYwMDAwXCI7XG4gICAgICBjaXJjbGVSYWRpdXMgPSA0O1xuICAgIH1cbiAgICBjdHguZmlsbFN0eWxlID0gZXNwQ29sb3I7XG4gICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgIGN0eC5hcmMoc2NyZWVuWCwgc2NyZWVuWSwgY2lyY2xlUmFkaXVzLCAwLCBNYXRoLlBJICogMik7XG4gICAgY3R4LmZpbGwoKTtcbiAgfSk7XG4gIGlmICh3aW5kb3cuZW50aXR5VHJhaWxFbmFibGVkICYmIHdpbmRvdy5lbnRpdHlUcmFpbFRhcmdldElkKSB7XG4gICAgY29uc3QgdGFyZ2V0RW50aXR5SWQgPSBmaW5kRW50aXR5QnlJZCh3aW5kb3cuZW50aXR5VHJhaWxUYXJnZXRJZCk7XG4gICAgaWYgKHRhcmdldEVudGl0eUlkKSB7XG4gICAgICBjb25zdCB0YXJnZXRFbnRpdHkgPSBleHRyYWN0UG9zaXRpb24odGFyZ2V0RW50aXR5SWQpO1xuICAgICAgaWYgKHRhcmdldEVudGl0eSkge1xuICAgICAgICBjb25zdCBkZWx0YVggPSB0YXJnZXRFbnRpdHkueCAtIGdhbWVTdGF0ZS5teVBvcy54O1xuICAgICAgICBjb25zdCBkZWx0YVkgPSB0YXJnZXRFbnRpdHkueSAtIGdhbWVTdGF0ZS5teVBvcy55O1xuICAgICAgICBjb25zdCBjYW52YXNYID0gTWF0aC5tYXgocmFkYXJYICsgMiwgTWF0aC5taW4ocmFkYXJYICsgcmFkYXJTaXplIC0gMiwgcmFkYXJYICsgcmFkYXJTaXplIC8gMiArIGRlbHRhWCAqIHBpeGVsU2NhbGUpKTtcbiAgICAgICAgY29uc3QgY2FudmFzWSA9IE1hdGgubWF4KHJhZGFyWSArIDIsIE1hdGgubWluKHJhZGFyWSArIHJhZGFyU2l6ZSAtIDIsIHJhZGFyWSArIHJhZGFyU2l6ZSAvIDIgKyBkZWx0YVkgKiBwaXhlbFNjYWxlKSk7XG4gICAgICAgIGNvbnN0IG9wYWNpdHlQdWxzZSA9IE1hdGguc2luKERhdGUubm93KCkgLyAyMDApICogMC4zICsgMC43O1xuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgcjogY29sb3JSZWQsXG4gICAgICAgICAgZzogY29sb3JHcmVlbixcbiAgICAgICAgICBiOiBjb2xvckJsdWVcbiAgICAgICAgfSA9IHdpbmRvdy5lbnRpdHlUcmFpbENvbG9yO1xuICAgICAgICBjb25zdCByZ2JTdHJpbmcgPSBjb2xvclJlZCArIFwiLFwiICsgY29sb3JHcmVlbiArIFwiLFwiICsgY29sb3JCbHVlO1xuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoXCIgKyByZ2JTdHJpbmcgKyBcIixcIiArIG9wYWNpdHlQdWxzZSArIFwiKVwiO1xuICAgICAgICBjdHgubGluZVdpZHRoID0gMjtcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICBjdHguYXJjKGNhbnZhc1gsIGNhbnZhc1ksIDcsIDAsIE1hdGguUEkgKiAyKTtcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoXCIgKyByZ2JTdHJpbmcgKyBcIixcIiArIG9wYWNpdHlQdWxzZSAqIDAuNSArIFwiKVwiO1xuICAgICAgICBjdHgubGluZVdpZHRoID0gNDtcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICBjdHguYXJjKGNhbnZhc1gsIGNhbnZhc1ksIDEwLCAwLCBNYXRoLlBJICogMik7XG4gICAgICAgIGN0eC5zdHJva2UoKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiKFwiICsgcmdiU3RyaW5nICsgXCIpXCI7XG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4LmFyYyhjYW52YXNYLCBjYW52YXNZLCAzLCAwLCBNYXRoLlBJICogMik7XG4gICAgICAgIGN0eC5maWxsKCk7XG4gICAgICAgIGlmICh3aW5kb3cuZW50aXR5VHJhaWxIaXN0b3J5Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoXCIgKyByZ2JTdHJpbmcgKyBcIiwwLjMpXCI7XG4gICAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDE7XG4gICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICAgIHdpbmRvdy5lbnRpdHlUcmFpbEhpc3RvcnkuZm9yRWFjaCgoZW50aXR5LCBlbnRpdHlJbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZHJhd1ggPSBNYXRoLm1heChyYWRhclggKyAyLCBNYXRoLm1pbihyYWRhclggKyByYWRhclNpemUgLSAyLCByYWRhclggKyByYWRhclNpemUgLyAyICsgKGVudGl0eS54IC0gZ2FtZVN0YXRlLm15UG9zLngpICogcGl4ZWxTY2FsZSkpO1xuICAgICAgICAgICAgY29uc3QgZHJhd1kgPSBNYXRoLm1heChyYWRhclkgKyAyLCBNYXRoLm1pbihyYWRhclkgKyByYWRhclNpemUgLSAyLCByYWRhclkgKyByYWRhclNpemUgLyAyICsgKGVudGl0eS55IC0gZ2FtZVN0YXRlLm15UG9zLnkpICogcGl4ZWxTY2FsZSkpO1xuICAgICAgICAgICAgaWYgKGVudGl0eUluZGV4ID09PSAwKSB7XG4gICAgICAgICAgICAgIGN0eC5tb3ZlVG8oZHJhd1gsIGRyYXdZKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oZHJhd1gsIGRyYXdZKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjdHguc3Ryb2tlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYSgyMCwyMCwyMCwwLjkpXCI7XG4gIGN0eC5iZWdpblBhdGgoKTtcbiAgY3R4LnJvdW5kUmVjdChyYWRhclgsIHJhZGFyWSArIHJhZGFyU2l6ZSwgcmFkYXJTaXplLCAyMiwgWzAsIDAsIDQsIDRdKTtcbiAgY3R4LmZpbGwoKTtcbiAgY3R4LmZpbGxTdHlsZSA9IFwiIzg4OFwiO1xuICBjdHguZm9udCA9IFwiMTBweCBtb25vc3BhY2VcIjtcbiAgY3R4LmZpbGxUZXh0KFwiUkFEQVJcIiwgcmFkYXJYICsgNSwgcmFkYXJZICsgcmFkYXJTaXplICsgMTQpO1xuICBjdHguZmlsbFRleHQoKHdpbmRvdy5lc3BNb2RlID09PSBcInBsYXllcnNcIiA/IFwiUDpcIiA6IFwiRjpcIikgKyBlbnRpdGllc1RvRHJhdy5sZW5ndGgsIHJhZGFyWCArIHJhZGFyU2l6ZSAtIDUwLCByYWRhclkgKyByYWRhclNpemUgKyAxNCk7XG59XG5mdW5jdGlvbiByZW5kZXJFc3BMb29wKCkge1xuICBpZiAoIXdpbmRvdy5lc3BFbmFibGVkKSB7XG4gICAgY29uc3Qgb3ZlcmxheUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImVzcC1vdmVybGF5XCIpO1xuICAgIGlmIChvdmVybGF5RWxlbWVudCkge1xuICAgICAgb3ZlcmxheUVsZW1lbnQuZ2V0Q29udGV4dChcIjJkXCIpLmNsZWFyUmVjdCgwLCAwLCBvdmVybGF5RWxlbWVudC53aWR0aCwgb3ZlcmxheUVsZW1lbnQuaGVpZ2h0KTtcbiAgICB9XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlckVzcExvb3ApO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBlc3BDYW52YXMgPSBnZXRPckNyZWF0ZUNhbnZhcyhcImVzcC1vdmVybGF5XCIsIDk5OTk5OCk7XG4gIGNvbnN0IGVzcEN0eCA9IGVzcENhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gIGVzcEN0eC5jbGVhclJlY3QoMCwgMCwgZXNwQ2FudmFzLndpZHRoLCBlc3BDYW52YXMuaGVpZ2h0KTtcbiAgY29uc3QgY3VycmVudEdhbWVTdGF0ZSA9IGJ1aWxkRW50aXR5U3RhdGUoKTtcbiAgY29uc3QgcGxheWVyRGF0YSA9IGdldEFuaW1hbFBvc2l0aW9uKCk7XG4gIGNvbnN0IHJlbmRlclNldHRpbmdzID0gZ2V0Vmlld3BvcnRTY2FsZSgpO1xuICBkcmF3RVNQKGVzcEN0eCwgY3VycmVudEdhbWVTdGF0ZSwgZXNwQ2FudmFzLndpZHRoIC8gMiwgZXNwQ2FudmFzLmhlaWdodCAvIDIsIHJlbmRlclNldHRpbmdzKTtcbiAgZHJhd1RyYWNrZXJMaW5lKGVzcEN0eCwgZXNwQ2FudmFzLCBwbGF5ZXJEYXRhLCByZW5kZXJTZXR0aW5ncyk7XG4gIGRyYXdSYWRhcihlc3BDdHgsIGVzcENhbnZhcywgY3VycmVudEdhbWVTdGF0ZSk7XG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShyZW5kZXJFc3BMb29wKTtcbn1cbmZ1bmN0aW9uIHRvZ2dsZUVzcCgpIHtcbiAgd2luZG93LmVzcEVuYWJsZWQgPSAhd2luZG93LmVzcEVuYWJsZWQ7XG4gIHNob3dOb3RpZmljYXRpb24od2luZG93LmVzcEVuYWJsZWQgPyBcIkVTUCBlbmFibGVkXCIgOiBcIkVTUCBkaXNhYmxlZFwiKTtcbn1cblxuZXhwb3J0IHsgdG9nZ2xlRW50aXR5VHJhaWwsIHJlZnJlc2hVSSwgZHJhd0VudGl0eVRyYWlsLCByZW5kZXJMb29wLCBkcmF3RVNQLCBkcmF3VHJhY2tlckxpbmUsIGRyYXdSYWRhciwgcmVuZGVyRXNwTG9vcCwgdG9nZ2xlRXNwIH07XG4iLCJpbXBvcnQgeyBzaW11bGF0ZVRleHRJbnB1dCwgc2hvd05vdGlmaWNhdGlvbiwgaW5pdEF1dG9maWxsTmFtZSwgdHlwZUNoYXRNZXNzYWdlLCBpbml0aWFsaXplVGV4dEludGVyY2VwdG9yLCBtYWtlRWxlbWVudERyYWdnYWJsZSwgc2hvd0hhbGxvd2VlbkNvZGVNb2RhbCB9IGZyb20gJy4vaW50ZXJhY3Rpb24uanMnO1xuaW1wb3J0IHsgc3RhcnRSZXBlYXRpbmdUYXNrLCBzdG9wQ2hhdFRpbWVyIH0gZnJvbSAnLi4vZmVhdHVyZXMvY2hhdC5qcyc7XG5pbXBvcnQgeyBnZW5lcmF0ZVJhbmRvbVN0cmluZyB9IGZyb20gJy4uL3V0aWxzLmpzJztcbmltcG9ydCB7IHRvZ2dsZUF1dG9Qb2ludGVyTW92ZW1lbnQgfSBmcm9tICcuLi9mZWF0dXJlcy9tb3ZlbWVudC5qcyc7XG5pbXBvcnQgeyBpbml0QW50aURldGVjdGlvbiB9IGZyb20gJy4uL2ZlYXR1cmVzL2FudGlkZXRlY3Rpb24uanMnO1xuaW1wb3J0IHsgaW5pdGlhbGl6ZUFzdHJhVmlzaW9uIH0gZnJvbSAnLi4vZmVhdHVyZXMveHJheS5qcyc7XG5pbXBvcnQgeyB0b2dnbGVNaW5pbWFwU2l6ZSwgc2V0dXBQYXRyb2xSb3V0ZSwgc3RhcnRBdXRvRmFybSwgc3RvcEF1dG9GYXJtIH0gZnJvbSAnLi4vZmVhdHVyZXMvYXV0b2Zhcm0uanMnO1xuaW1wb3J0IHsgdG9nZ2xlRXNwIH0gZnJvbSAnLi4vZmVhdHVyZXMvZXNwLmpzJztcbmltcG9ydCB7IHRyYWNrTmVhcmVzdFBsYXllciwgY2xlYXJUcmFja2luZywgdG9nZ2xlTG9jaywgZW5hYmxlQXV0b0RvZGdlLCBkaXNhYmxlQXV0b0RvZGdlIH0gZnJvbSAnLi4vZmVhdHVyZXMvYWltYm90LmpzJztcbmltcG9ydCB7IGFwcGx5VGhlbWUsIGluaXRCYWNrZ3JvdW5kSW1hZ2UgfSBmcm9tICcuL3RoZW1lLmpzJztcbmltcG9ydCB7IGF1ZGlvUGxheWVyLCBtdXNpY1BsYXlsaXN0LCB5b3V0dWJlUGxheWVyLCBwYXVzZVBsYXliYWNrLCByZXN1bWVQbGF5YmFjaywgcmVzZXRQbGF5YmFjaywgaXNQbGF5aW5nLCBwbGF5TmV4dE9yUmFuZG9tLCBwbGF5UHJldmlvdXMsIHVwZGF0ZU11c2ljUGFuZWwsIHVpYXVkaW9TdGF0ZSB9IGZyb20gJy4vYXVkaW8uanMnO1xuaW1wb3J0IHsgYWRkVHJhY2tUb1BsYXlsaXN0IH0gZnJvbSAnLi4vc3RvcmFnZS5qcyc7XG5pbXBvcnQgeyBzdGF0ZSB9IGZyb20gJy4uL2NvcmUuanMnO1xuXG53aW5kb3cubG9ja0tleSA9IFwidFwiO1xud2luZG93LmVudGl0eVRyYWNlS2V5ID0gXCJoXCI7XG5cblxubGV0IHByZXNzZWRLZXlRID0gXCJxXCI7XG5sZXQgcHJlc3NlZEtleUUgPSBcImVcIjtcbmZ1bmN0aW9uIGNyZWF0ZVRvb2xzUGFuZWwoKSB7XG4gIGNvbnN0IHRvb2xzUGFuZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICB0b29sc1BhbmVsLmlkID0gXCJkZWVwLXRvb2xzLXBhbmVsXCI7XG4gIHRvb2xzUGFuZWwuY2xhc3NOYW1lID0gXCJhc3QtcGFuZWxcIjtcbiAgdG9vbHNQYW5lbC5zdHlsZS5jc3NUZXh0ID0gXCJib3R0b206MjBweDtyaWdodDoyMHB4O3dpZHRoOjIzMHB4O1wiO1xuICB0b29sc1BhbmVsLmlubmVySFRNTCA9IFwiXFxuICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LWhlYWRlclxcXCI+PHNwYW4gY2xhc3M9XFxcImFzdC1oZWFkZXItdGl0bGVcXFwiPkFzdHJhcGhvYmlhIENsaWVudDwvc3Bhbj48YnV0dG9uIGNsYXNzPVxcXCJhc3QtaGVhZGVyLW1pblxcXCIgaWQ9XFxcIm1haW5NaW5cXFwiPuKIkjwvYnV0dG9uPjwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1ib2R5XFxcIiBpZD1cXFwibWFpbkJvZHlcXFwiPlxcbiAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XFxcImFzdC1zZWN0aW9uLWxhYmVsXFxcIj5BdXRvZmlsbCBOYW1lPC9zcGFuPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LXJvd1xcXCIgc3R5bGU9XFxcIm1hcmdpbi1ib3R0b206NnB4O1xcXCI+XFxuICAgICAgICAgIDxpbnB1dCBjbGFzcz1cXFwiYXN0LWlucHV0XFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiBpZD1cXFwic2F2ZWROYW1lRGlzcGxheVxcXCIgcGxhY2Vob2xkZXI9XFxcIkVudGVyIG5hbWUuLi5cXFwiIHN0eWxlPVxcXCJmbGV4OjE7XFxcIj5cXG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgaWQ9XFxcInNldE5hbWVCdG5cXFwiIHN0eWxlPVxcXCJ3aWR0aDo0MHB4O3BhZGRpbmc6NnB4IDVweDttYXJnaW46MDtmbGV4LXNocmluazowO3RleHQtYWxpZ246Y2VudGVyO1xcXCI+U2V0PC9idXR0b24+XFxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG5cXFwiIGlkPVxcXCJjbGVhck5hbWVCdG5cXFwiIHN0eWxlPVxcXCJ3aWR0aDozMHB4O3BhZGRpbmc6NnB4IDVweDttYXJnaW46MDtmbGV4LXNocmluazowO3RleHQtYWxpZ246Y2VudGVyO1xcXCI+4pyVPC9idXR0b24+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxzcGFuIGNsYXNzPVxcXCJhc3Qtc2VjdGlvbi1sYWJlbFxcXCI+Q2hhdDwvc3Bhbj5cXG4gICAgICAgIDx0ZXh0YXJlYSBjbGFzcz1cXFwiYXN0LXRleHRhcmVhXFxcIiBpZD1cXFwiY2hhdE1zZ1xcXCIgcGxhY2Vob2xkZXI9XFxcIk1lc3NhZ2UuLi5cXFwiIHJvd3M9XFxcIjJcXFwiPjwvdGV4dGFyZWE+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuXFxcIiBpZD1cXFwic2VuZEJ0blxcXCI+U2VuZCBDaGF0PC9idXR0b24+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qtcm93XFxcIiBzdHlsZT1cXFwibWFyZ2luLXRvcDo0cHg7XFxcIj5cXG4gICAgICAgICAgPGlucHV0IGNsYXNzPVxcXCJhc3QtaW5wdXRcXFwiIHR5cGU9XFxcIm51bWJlclxcXCIgaWQ9XFxcImRlbGF5SW5wdXRcXFwiIG1pbj1cXFwiMVxcXCIgbWF4PVxcXCIzMDBcXFwiIHZhbHVlPVxcXCIxMFxcXCIgc3R5bGU9XFxcIndpZHRoOjUwcHg7dGV4dC1hbGlnbjpjZW50ZXI7XFxcIj5cXG4gICAgICAgICAgPHNwYW4gc3R5bGU9XFxcImZvbnQtc2l6ZToxMXB4O2NvbG9yOiM4ODg7XFxcIj5zZWM8L3NwYW4+XFxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG5cXFwiIGlkPVxcXCJhdXRvQ2hhdEJ0blxcXCIgc3R5bGU9XFxcImZsZXg6MTttYXJnaW4tYm90dG9tOjA7XFxcIj5BdXRvIENoYXQ8L2J1dHRvbj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LXNlcFxcXCI+PC9kaXY+XFxuICAgICAgICA8c3BhbiBjbGFzcz1cXFwiYXN0LXNlY3Rpb24tbGFiZWxcXFwiPlRvb2xzPC9zcGFuPlxcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgaWQ9XFxcInBhdGNoQnRuXFxcIj5TcGVjaWFsIENoYXJhY3RlcnM8L2J1dHRvbj5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG5cXFwiIGlkPVxcXCJzcG9vZkJ0blxcXCI+U3Bvb2YgVXNlcm5hbWU8L2J1dHRvbj5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG5cXFwiIGlkPVxcXCJzcGluQnRuXFxcIj5BdXRvIFNwaW48L2J1dHRvbj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1rZXktcm93XFxcIj48c3Bhbj5TcGluIGtleTwvc3Bhbj48aW5wdXQgY2xhc3M9XFxcImFzdC1rZXktY2FwdHVyZVxcXCIgaWQ9XFxcInNwaW5LZXlJbnB1dFxcXCIgdHlwZT1cXFwidGV4dFxcXCIgcGxhY2Vob2xkZXI9XFxcIi4uLlxcXCIgcmVhZG9ubHk+PC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qtc2VwXFxcIj48L2Rpdj5cXG4gICAgICAgIDxzcGFuIGNsYXNzPVxcXCJhc3Qtc2VjdGlvbi1sYWJlbFxcXCI+VHVybiBDb250cm9sczwvc3Bhbj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1rZXktcm93XFxcIj5cXG4gICAgICAgICAgPHNwYW4+VHVybiBMZWZ0PC9zcGFuPlxcbiAgICAgICAgICA8aW5wdXQgY2xhc3M9XFxcImFzdC1rZXktY2FwdHVyZVxcXCIgaWQ9XFxcInR1cm5MZWZ0S2V5SW5wdXRcXFwiIHR5cGU9XFxcInRleHRcXFwiIHZhbHVlPVxcXCJRXFxcIiByZWFkb25seT5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LWtleS1yb3dcXFwiPlxcbiAgICAgICAgICA8c3Bhbj5UdXJuIFJpZ2h0PC9zcGFuPlxcbiAgICAgICAgICA8aW5wdXQgY2xhc3M9XFxcImFzdC1rZXktY2FwdHVyZVxcXCIgaWQ9XFxcInR1cm5SaWdodEtleUlucHV0XFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiB2YWx1ZT1cXFwiRVxcXCIgcmVhZG9ubHk+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1jcmVkaXRzXFxcIj5NYWRlIGJ5IEFzdHJhcGhvYmlhPC9kaXY+XFxuICAgICAgPC9kaXY+XCI7XG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQodG9vbHNQYW5lbCk7XG4gIGNvbnN0IG1haW5Cb2R5RWxlbWVudCA9IHRvb2xzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNtYWluQm9keVwiKTtcbiAgbGV0IGlzVmlzaWJsZSA9IGZhbHNlO1xuICB0b29sc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbWFpbk1pblwiKS5vbmNsaWNrID0gZXZlbnQgPT4ge1xuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGlzVmlzaWJsZSA9ICFpc1Zpc2libGU7XG4gICAgbWFpbkJvZHlFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBpc1Zpc2libGUgPyBcIm5vbmVcIiA6IFwiYmxvY2tcIjtcbiAgICB0b29sc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbWFpbk1pblwiKS50ZXh0Q29udGVudCA9IGlzVmlzaWJsZSA/IFwiK1wiIDogXCLiiJJcIjtcbiAgfTtcbiAgdG9vbHNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3NlbmRCdG5cIikub25jbGljayA9ICgpID0+IHtcbiAgICBjb25zdCBjaGF0TWVzc2FnZSA9IHRvb2xzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNjaGF0TXNnXCIpLnZhbHVlO1xuICAgIGlmIChjaGF0TWVzc2FnZSkge1xuICAgICAgdHlwZUNoYXRNZXNzYWdlKGNoYXRNZXNzYWdlKTtcbiAgICB9XG4gIH07XG4gIGNvbnN0IGF1dG9DaGF0QnV0dG9uID0gdG9vbHNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2F1dG9DaGF0QnRuXCIpO1xuICBhdXRvQ2hhdEJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xuICAgIGNvbnN0IG1lc3NhZ2VUZXh0ID0gdG9vbHNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2NoYXRNc2dcIikudmFsdWU7XG4gICAgY29uc3QgZGVsYXlWYWx1ZSA9IHBhcnNlSW50KHRvb2xzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNkZWxheUlucHV0XCIpLnZhbHVlKSB8fCAxMDtcbiAgICBpZiAoIW1lc3NhZ2VUZXh0KSB7XG4gICAgICBzaG93Tm90aWZpY2F0aW9uKFwiRW50ZXIgYSBtZXNzYWdlIGZpcnN0XCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoc3RhdGUuaXNMb29waW5nKSB7XG4gICAgICBzdG9wQ2hhdFRpbWVyKCk7XG4gICAgICBhdXRvQ2hhdEJ1dHRvbi50ZXh0Q29udGVudCA9IFwiQXV0byBDaGF0XCI7XG4gICAgICBhdXRvQ2hhdEJ1dHRvbi5jbGFzc0xpc3QucmVtb3ZlKFwidG9nZ2xlLW9uXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGFydFJlcGVhdGluZ1Rhc2sobWVzc2FnZVRleHQsIGRlbGF5VmFsdWUpO1xuICAgICAgYXV0b0NoYXRCdXR0b24udGV4dENvbnRlbnQgPSBcIlN0b3AgQ2hhdFwiO1xuICAgICAgYXV0b0NoYXRCdXR0b24uY2xhc3NMaXN0LmFkZChcInRvZ2dsZS1vblwiKTtcbiAgICB9XG4gIH07XG4gIGNvbnN0IHBhdGNoQnV0dG9uID0gdG9vbHNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3BhdGNoQnRuXCIpO1xuICBwYXRjaEJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xuICAgIGluaXRpYWxpemVUZXh0SW50ZXJjZXB0b3IoKTtcbiAgICBwYXRjaEJ1dHRvbi50ZXh0Q29udGVudCA9IFwiU3BlY2lhbCBDaGFycyBBY3RpdmVcIjtcbiAgICBwYXRjaEJ1dHRvbi5kaXNhYmxlZCA9IHRydWU7XG4gICAgcGF0Y2hCdXR0b24uY2xhc3NMaXN0LmFkZChcInRvZ2dsZS1vblwiKTtcbiAgfTtcbiAgdG9vbHNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3Nwb29mQnRuXCIpLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgY29uc3QgcmFuZG9tU3RyaW5nID0gZ2VuZXJhdGVSYW5kb21TdHJpbmcoOCk7XG4gICAgaWYgKHNpbXVsYXRlVGV4dElucHV0KFwiLnBsYXktZ2FtZSAuZWwtaW5wdXRfX2lubmVyXCIsIHJhbmRvbVN0cmluZykpIHtcbiAgICAgIHNob3dOb3RpZmljYXRpb24oXCJOYW1lIHNwb29mZWRcIik7XG4gICAgfSBlbHNlIGlmIChzaW11bGF0ZVRleHRJbnB1dChcIi5uZXctdHJpYmUgLmVsLWlucHV0X19pbm5lclwiLCByYW5kb21TdHJpbmcpKSB7XG4gICAgICBzaG93Tm90aWZpY2F0aW9uKFwiVHJpYmUgbmFtZSBzcG9vZmVkXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzaG93Tm90aWZpY2F0aW9uKFwiTm8gbmFtZSBpbnB1dCBmb3VuZFwiKTtcbiAgICB9XG4gIH07XG4gIGNvbnN0IHNwaW5CdXR0b24gPSB0b29sc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjc3BpbkJ0blwiKTtcbiAgc3BpbkJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xuICAgIHRvZ2dsZUF1dG9Qb2ludGVyTW92ZW1lbnQoKTtcbiAgICBzcGluQnV0dG9uLnRleHRDb250ZW50ID0gc3RhdGUuYW5pbWF0aW9uSW50ZXJ2YWxJZCA/IFwiU3RvcCBTcGluXCIgOiBcIkF1dG8gU3BpblwiO1xuICAgIHNwaW5CdXR0b24uY2xhc3NMaXN0LnRvZ2dsZShcInRvZ2dsZS1vblwiLCAhIXN0YXRlLmFuaW1hdGlvbkludGVydmFsSWQpO1xuICB9O1xuICBjb25zdCBzcGluS2V5SW5wdXQgPSB0b29sc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjc3BpbktleUlucHV0XCIpO1xuICBsZXQgbGFzdFByZXNzZWRLZXkgPSBudWxsO1xuICBzcGluS2V5SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwga2V5ZG93bkV2ZW50ID0+IHtcbiAgICBrZXlkb3duRXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBsYXN0UHJlc3NlZEtleSA9IGtleWRvd25FdmVudC5jb2RlIHx8IGtleWRvd25FdmVudC5rZXk7XG4gICAgc3BpbktleUlucHV0LnZhbHVlID0gbGFzdFByZXNzZWRLZXkucmVwbGFjZShcIktleVwiLCBcIlwiKS50b1VwcGVyQ2FzZSgpO1xuICB9KTtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwga2V5dXBFdmVudCA9PiB7XG4gICAgaWYgKGxhc3RQcmVzc2VkS2V5ICYmIGtleXVwRXZlbnQuY29kZSA9PT0gbGFzdFByZXNzZWRLZXkgJiYgIWtleXVwRXZlbnQudGFyZ2V0Lm1hdGNoZXMoXCJpbnB1dCx0ZXh0YXJlYSxidXR0b24sc2VsZWN0XCIpKSB7XG4gICAgICBrZXl1cEV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0b2dnbGVBdXRvUG9pbnRlck1vdmVtZW50KCk7XG4gICAgICBzcGluQnV0dG9uLnRleHRDb250ZW50ID0gc3RhdGUuYW5pbWF0aW9uSW50ZXJ2YWxJZCA/IFwiU3RvcCBTcGluXCIgOiBcIkF1dG8gU3BpblwiO1xuICAgICAgc3BpbkJ1dHRvbi5jbGFzc0xpc3QudG9nZ2xlKFwidG9nZ2xlLW9uXCIsICEhc3RhdGUuYW5pbWF0aW9uSW50ZXJ2YWxJZCk7XG4gICAgfVxuICB9KTtcbiAgY29uc3QgdHVybkxlZnRJbnB1dCA9IHRvb2xzUGFuZWwucXVlcnlTZWxlY3RvcihcIiN0dXJuTGVmdEtleUlucHV0XCIpO1xuICBjb25zdCB0dXJuUmlnaHRJbnB1dCA9IHRvb2xzUGFuZWwucXVlcnlTZWxlY3RvcihcIiN0dXJuUmlnaHRLZXlJbnB1dFwiKTtcbiAgdHVybkxlZnRJbnB1dC52YWx1ZSA9IHByZXNzZWRLZXlRLnRvVXBwZXJDYXNlKCk7XG4gIHR1cm5SaWdodElucHV0LnZhbHVlID0gcHJlc3NlZEtleUUudG9VcHBlckNhc2UoKTtcbiAgdHVybkxlZnRJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBjbGlja0V2ZW50ID0+IHtcbiAgICBjbGlja0V2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgY2xpY2tFdmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBwcmVzc2VkS2V5USA9IGNsaWNrRXZlbnQua2V5O1xuICAgIHR1cm5MZWZ0SW5wdXQudmFsdWUgPSBjbGlja0V2ZW50LmtleS5sZW5ndGggPT09IDEgPyBjbGlja0V2ZW50LmtleS50b1VwcGVyQ2FzZSgpIDogY2xpY2tFdmVudC5rZXk7XG4gIH0pO1xuICB0dXJuUmlnaHRJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBjb250ZXh0TWVudUV2ZW50ID0+IHtcbiAgICBjb250ZXh0TWVudUV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgY29udGV4dE1lbnVFdmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBwcmVzc2VkS2V5RSA9IGNvbnRleHRNZW51RXZlbnQua2V5O1xuICAgIHR1cm5SaWdodElucHV0LnZhbHVlID0gY29udGV4dE1lbnVFdmVudC5rZXkubGVuZ3RoID09PSAxID8gY29udGV4dE1lbnVFdmVudC5rZXkudG9VcHBlckNhc2UoKSA6IGNvbnRleHRNZW51RXZlbnQua2V5O1xuICB9KTtcbiAgY29uc3Qgc2F2ZWROYW1lRGlzcGxheSA9IHRvb2xzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNzYXZlZE5hbWVEaXNwbGF5XCIpO1xuICBjb25zdCBzZXROYW1lQnV0dG9uID0gdG9vbHNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3NldE5hbWVCdG5cIik7XG4gIGNvbnN0IGNsZWFyTmFtZUJ1dHRvbiA9IHRvb2xzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNjbGVhck5hbWVCdG5cIik7XG4gIGlmIChzYXZlZE5hbWVEaXNwbGF5KSB7XG4gICAgc2F2ZWROYW1lRGlzcGxheS52YWx1ZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiYXV0b2ZpbGxfbmFtZVwiKSB8fCBcIlwiO1xuICB9XG4gIGlmIChzZXROYW1lQnV0dG9uKSB7XG4gICAgc2V0TmFtZUJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgY29uc3QgdXNlck5hbWUgPSBzYXZlZE5hbWVEaXNwbGF5LnZhbHVlLnRyaW0oKTtcbiAgICAgIGlmICh1c2VyTmFtZSkge1xuICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImF1dG9maWxsX25hbWVcIiwgdXNlck5hbWUpO1xuICAgICAgICB1aWF1ZGlvU3RhdGUuaXNNdXRlZCA9IGZhbHNlO1xuICAgICAgICBpbml0QXV0b2ZpbGxOYW1lKCk7XG4gICAgICAgIHNob3dOb3RpZmljYXRpb24oXCJOYW1lIHNhdmVkOiBcIiArIHVzZXJOYW1lKTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG4gIGlmIChjbGVhck5hbWVCdXR0b24pIHtcbiAgICBjbGVhck5hbWVCdXR0b24ub25jbGljayA9ICgpID0+IHtcbiAgICAgIGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKFwiYXV0b2ZpbGxfbmFtZVwiKTtcbiAgICAgIHVpYXVkaW9TdGF0ZS5pc011dGVkID0gZmFsc2U7XG4gICAgICBpZiAoc2F2ZWROYW1lRGlzcGxheSkge1xuICAgICAgICBzYXZlZE5hbWVEaXNwbGF5LnZhbHVlID0gXCJcIjtcbiAgICAgIH1cbiAgICAgIHNob3dOb3RpZmljYXRpb24oXCJBdXRvZmlsbCBjbGVhcmVkXCIpO1xuICAgIH07XG4gIH1cbiAgbWFrZUVsZW1lbnREcmFnZ2FibGUodG9vbHNQYW5lbCk7XG4gIHJldHVybiB0b29sc1BhbmVsO1xufVxuZnVuY3Rpb24gY3JlYXRlVmlzaW9uUGFuZWwoKSB7XG4gIGNvbnN0IHZpc2lvblBhbmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgdmlzaW9uUGFuZWwuaWQgPSBcInZpc2lvbi1wYW5lbFwiO1xuICB2aXNpb25QYW5lbC5jbGFzc05hbWUgPSBcImFzdC1wYW5lbFwiO1xuICB2aXNpb25QYW5lbC5zdHlsZS5jc3NUZXh0ID0gXCJ0b3A6MjBweDtyaWdodDoyMHB4O3dpZHRoOjIzMHB4O1wiO1xuICB2aXNpb25QYW5lbC5pbm5lckhUTUwgPSBcIlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1oZWFkZXJcXFwiPjxzcGFuIGNsYXNzPVxcXCJhc3QtaGVhZGVyLXRpdGxlXFxcIj5Bc3RyYXBob2JpYSBDbGllbnQ8L3NwYW4+PGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWhlYWRlci1taW5cXFwiIGlkPVxcXCJ2aXNpb25NaW5cXFwiPuKIkjwvYnV0dG9uPjwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1ib2R5XFxcIiBpZD1cXFwidmlzaW9uQm9keVxcXCI+XFxuICAgICAgICA8c3BhbiBjbGFzcz1cXFwiYXN0LXNlY3Rpb24tbGFiZWxcXFwiPlZpc2lvbjwvc3Bhbj5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG4gcGF0Y2hlZFxcXCIgaWQ9XFxcInRocmVzaGVyQnRuXFxcIiBkaXNhYmxlZD5UaHJlc2hlciBCb29zdCAoUGF0Y2hlZCk8L2J1dHRvbj5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG5cXFwiIGlkPVxcXCJhc3RyYVZpc2lvbkJ0blxcXCI+QXN0cmEtVmlzaW9uPC9idXR0b24+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuXFxcIiBpZD1cXFwic21hbGxNaW5pbWFwQnRuXFxcIj5TbWFsbCBNaW5pbWFwPC9idXR0b24+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qtc2VwXFxcIj48L2Rpdj5cXG4gICAgICAgIDxzcGFuIGNsYXNzPVxcXCJhc3Qtc2VjdGlvbi1sYWJlbFxcXCI+RVNQPC9zcGFuPlxcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgaWQ9XFxcImVzcEJ0blxcXCI+RVNQPC9idXR0b24+XFxuICAgICAgICA8c2VsZWN0IGNsYXNzPVxcXCJhc3Qtc2VsZWN0XFxcIiBpZD1cXFwiZXNwTW9kZVNlbGVjdFxcXCI+PG9wdGlvbiB2YWx1ZT1cXFwicGxheWVyc1xcXCI+UGxheWVyczwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XFxcImZvb2RcXFwiPkZvb2Q8L29wdGlvbj48L3NlbGVjdD5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG5cXFwiIGlkPVxcXCJ0cmFja05lYXJlc3RCdG5cXFwiPlRyYWNrIE5lYXJlc3QgKEYzKTwvYnV0dG9uPlxcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgaWQ9XFxcInVudHJhY2tCdG5cXFwiPlVudHJhY2sgKEY0KTwvYnV0dG9uPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LXNlcFxcXCI+PC9kaXY+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuXFxcIiBpZD1cXFwiZXNwQ29sb3JzVG9nZ2xlQnRuXFxcIiBzdHlsZT1cXFwiZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtcXFwiPlxcbiAgICAgICAgICA8c3BhbiBzdHlsZT1cXFwiZm9udC1zaXplOjEwcHg7Zm9udC13ZWlnaHQ6NjAwO2xldHRlci1zcGFjaW5nOjFweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7Y29sb3I6dmFyKC0tdGV4dC1zZWMsIzg4OCk7XFxcIj5FU1AgQ29sb3JzPC9zcGFuPlxcbiAgICAgICAgICA8c3BhbiBpZD1cXFwiZXNwQ29sb3JzQXJyb3dcXFwiIHN0eWxlPVxcXCJjb2xvcjp2YXIoLS10ZXh0LXNlYywjODg4KTtmb250LXNpemU6MTJweDtcXFwiPuKWvDwvc3Bhbj5cXG4gICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgPGRpdiBpZD1cXFwiZXNwQ29sb3JzU2VjdGlvblxcXCIgc3R5bGU9XFxcImRpc3BsYXk6bm9uZTtcXFwiPlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qta2V5LXJvd1xcXCI+PHNwYW4+Q2xvc2UgKCZsdDs1MDApPC9zcGFuPjxpbnB1dCB0eXBlPVxcXCJjb2xvclxcXCIgaWQ9XFxcImVzcENvbG9yQ2xvc2VcXFwiIHZhbHVlPVxcXCIjZmYwMDAwXFxcIiBzdHlsZT1cXFwid2lkdGg6NDBweDtoZWlnaHQ6MjRweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWJkciwjMzMzKTtib3JkZXItcmFkaXVzOjRweDtjdXJzb3I6cG9pbnRlcjtwYWRkaW5nOjA7YmFja2dyb3VuZDp2YXIoLS1iZzIsIzI0MjQyNCk7XFxcIj48L2Rpdj5cXG4gICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LWtleS1yb3dcXFwiPjxzcGFuPk1lZGl1bSAoJmx0OzE1MDApPC9zcGFuPjxpbnB1dCB0eXBlPVxcXCJjb2xvclxcXCIgaWQ9XFxcImVzcENvbG9yTWVkaXVtXFxcIiB2YWx1ZT1cXFwiI2ZmZmYwMFxcXCIgc3R5bGU9XFxcIndpZHRoOjQwcHg7aGVpZ2h0OjI0cHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1iZHIsIzMzMyk7Ym9yZGVyLXJhZGl1czo0cHg7Y3Vyc29yOnBvaW50ZXI7cGFkZGluZzowO2JhY2tncm91bmQ6dmFyKC0tYmcyLCMyNDI0MjQpO1xcXCI+PC9kaXY+XFxuICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1rZXktcm93XFxcIj48c3Bhbj5GYXIgKCZsdDszMDAwKTwvc3Bhbj48aW5wdXQgdHlwZT1cXFwiY29sb3JcXFwiIGlkPVxcXCJlc3BDb2xvckZhclxcXCIgdmFsdWU9XFxcIiMwMGZmZmZcXFwiIHN0eWxlPVxcXCJ3aWR0aDo0MHB4O2hlaWdodDoyNHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tYmRyLCMzMzMpO2JvcmRlci1yYWRpdXM6NHB4O2N1cnNvcjpwb2ludGVyO3BhZGRpbmc6MDtiYWNrZ3JvdW5kOnZhcigtLWJnMiwjMjQyNDI0KTtcXFwiPjwvZGl2PlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qta2V5LXJvd1xcXCI+PHNwYW4+VmVyeSBGYXI8L3NwYW4+PGlucHV0IHR5cGU9XFxcImNvbG9yXFxcIiBpZD1cXFwiZXNwQ29sb3JWZXJ5RmFyXFxcIiB2YWx1ZT1cXFwiIzAwZmYwMFxcXCIgc3R5bGU9XFxcIndpZHRoOjQwcHg7aGVpZ2h0OjI0cHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1iZHIsIzMzMyk7Ym9yZGVyLXJhZGl1czo0cHg7Y3Vyc29yOnBvaW50ZXI7cGFkZGluZzowO2JhY2tncm91bmQ6dmFyKC0tYmcyLCMyNDI0MjQpO1xcXCI+PC9kaXY+XFxuICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1rZXktcm93XFxcIj48c3Bhbj5UcmFja2VkPC9zcGFuPjxpbnB1dCB0eXBlPVxcXCJjb2xvclxcXCIgaWQ9XFxcImVzcENvbG9yVHJhY2tlZFxcXCIgdmFsdWU9XFxcIiNmZjAwZmZcXFwiIHN0eWxlPVxcXCJ3aWR0aDo0MHB4O2hlaWdodDoyNHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tYmRyLCMzMzMpO2JvcmRlci1yYWRpdXM6NHB4O2N1cnNvcjpwb2ludGVyO3BhZGRpbmc6MDtiYWNrZ3JvdW5kOnZhcigtLWJnMiwjMjQyNDI0KTtcXFwiPjwvZGl2PlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qta2V5LXJvd1xcXCI+PHNwYW4+Rm9vZCBDbG9zZTwvc3Bhbj48aW5wdXQgdHlwZT1cXFwiY29sb3JcXFwiIGlkPVxcXCJlc3BDb2xvckZvb2RDbG9zZVxcXCIgdmFsdWU9XFxcIiMwMGZmMDBcXFwiIHN0eWxlPVxcXCJ3aWR0aDo0MHB4O2hlaWdodDoyNHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tYmRyLCMzMzMpO2JvcmRlci1yYWRpdXM6NHB4O2N1cnNvcjpwb2ludGVyO3BhZGRpbmc6MDtiYWNrZ3JvdW5kOnZhcigtLWJnMiwjMjQyNDI0KTtcXFwiPjwvZGl2PlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qta2V5LXJvd1xcXCI+PHNwYW4+Rm9vZCBNZWRpdW08L3NwYW4+PGlucHV0IHR5cGU9XFxcImNvbG9yXFxcIiBpZD1cXFwiZXNwQ29sb3JGb29kTWVkaXVtXFxcIiB2YWx1ZT1cXFwiIzg4ZmY4OFxcXCIgc3R5bGU9XFxcIndpZHRoOjQwcHg7aGVpZ2h0OjI0cHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1iZHIsIzMzMyk7Ym9yZGVyLXJhZGl1czo0cHg7Y3Vyc29yOnBvaW50ZXI7cGFkZGluZzowO2JhY2tncm91bmQ6dmFyKC0tYmcyLCMyNDI0MjQpO1xcXCI+PC9kaXY+XFxuICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1rZXktcm93XFxcIj48c3Bhbj5Gb29kIEZhcjwvc3Bhbj48aW5wdXQgdHlwZT1cXFwiY29sb3JcXFwiIGlkPVxcXCJlc3BDb2xvckZvb2RGYXJcXFwiIHZhbHVlPVxcXCIjNDRjYzQ0XFxcIiBzdHlsZT1cXFwid2lkdGg6NDBweDtoZWlnaHQ6MjRweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWJkciwjMzMzKTtib3JkZXItcmFkaXVzOjRweDtjdXJzb3I6cG9pbnRlcjtwYWRkaW5nOjA7YmFja2dyb3VuZDp2YXIoLS1iZzIsIzI0MjQyNCk7XFxcIj48L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlwiO1xuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHZpc2lvblBhbmVsKTtcbiAgY29uc3QgdmlzaW9uQm9keUVsZW1lbnQgPSB2aXNpb25QYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3Zpc2lvbkJvZHlcIik7XG4gIGxldCBpc1Zpc2lvbkhpZGRlbiA9IGZhbHNlO1xuICB2aXNpb25QYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3Zpc2lvbk1pblwiKS5vbmNsaWNrID0gZXZlbnQgPT4ge1xuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGlzVmlzaW9uSGlkZGVuID0gIWlzVmlzaW9uSGlkZGVuO1xuICAgIHZpc2lvbkJvZHlFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBpc1Zpc2lvbkhpZGRlbiA/IFwibm9uZVwiIDogXCJibG9ja1wiO1xuICAgIHZpc2lvblBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjdmlzaW9uTWluXCIpLnRleHRDb250ZW50ID0gaXNWaXNpb25IaWRkZW4gPyBcIitcIiA6IFwi4oiSXCI7XG4gIH07XG4gIHZpc2lvblBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjdGhyZXNoZXJCdG5cIikub25jbGljayA9IGNsaWNrRXZlbnQgPT4ge1xuICAgIGNsaWNrRXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBzaG93Tm90aWZpY2F0aW9uKFwiVGhyZXNoZXIgYm9vc3QgaGFzIGJlZW4gcGF0Y2hlZFwiKTtcbiAgfTtcbiAgY29uc3QgYXN0cmFWaXNpb25CdXR0b24gPSB2aXNpb25QYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2FzdHJhVmlzaW9uQnRuXCIpO1xuICBhc3RyYVZpc2lvbkJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xuICAgIGlmIChzdGF0ZS5pc0FjdGl2ZSkge1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihcIkFscmVhZHkgYWN0aXZlXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpbml0QW50aURldGVjdGlvbigpO1xuICAgIGlmICghc3RhdGUuYW5pbWFsRGF0YSkge1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihcIkxvYWRpbmcuLi4gY2xpY2sgYWdhaW4gaW4gMnNcIik7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgaW5pdGlhbGl6ZUFzdHJhVmlzaW9uKCk7XG4gICAgICAgIGFzdHJhVmlzaW9uQnV0dG9uLnRleHRDb250ZW50ID0gXCJBc3RyYS1WaXNpb24g4pyTXCI7XG4gICAgICAgIGFzdHJhVmlzaW9uQnV0dG9uLmNsYXNzTGlzdC5hZGQoXCJ0b2dnbGUtb25cIik7XG4gICAgICAgIGFzdHJhVmlzaW9uQnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcbiAgICAgIH0sIDIwMDApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpbml0aWFsaXplQXN0cmFWaXNpb24oKTtcbiAgICBhc3RyYVZpc2lvbkJ1dHRvbi50ZXh0Q29udGVudCA9IFwiQXN0cmEtVmlzaW9uIOKck1wiO1xuICAgIGFzdHJhVmlzaW9uQnV0dG9uLmNsYXNzTGlzdC5hZGQoXCJ0b2dnbGUtb25cIik7XG4gICAgYXN0cmFWaXNpb25CdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xuICB9O1xuICBjb25zdCBzbWFsbE1pbmltYXBCdXR0b24gPSB2aXNpb25QYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3NtYWxsTWluaW1hcEJ0blwiKTtcbiAgc21hbGxNaW5pbWFwQnV0dG9uLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgaW5pdEFudGlEZXRlY3Rpb24oKTtcbiAgICBpZiAoIXN0YXRlLmFuaW1hbERhdGEpIHtcbiAgICAgIHNob3dOb3RpZmljYXRpb24oXCJOb3QgaW4gZ2FtZSB5ZXRcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghc3RhdGUuYW5pbWFsRGF0YS5taW5pbWFwKSB7XG4gICAgICBzaG93Tm90aWZpY2F0aW9uKFwiTWluaW1hcCBub3QgYXZhaWxhYmxlXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0b2dnbGVNaW5pbWFwU2l6ZSgpO1xuICAgIHNtYWxsTWluaW1hcEJ1dHRvbi50ZXh0Q29udGVudCA9IHN0YXRlLmlzTWluaW1hcFNtYWxsID8gXCJNaW5pbWFwOiBTbWFsbFwiIDogXCJTbWFsbCBNaW5pbWFwXCI7XG4gICAgc21hbGxNaW5pbWFwQnV0dG9uLmNsYXNzTGlzdC50b2dnbGUoXCJ0b2dnbGUtb25cIiwgc3RhdGUuaXNNaW5pbWFwU21hbGwpO1xuICB9O1xuICBjb25zdCBlc3BCdXR0b24gPSB2aXNpb25QYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2VzcEJ0blwiKTtcbiAgZXNwQnV0dG9uLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgdG9nZ2xlRXNwKCk7XG4gICAgZXNwQnV0dG9uLnRleHRDb250ZW50ID0gd2luZG93LmVzcEVuYWJsZWQgPyBcIkVTUCDinJNcIiA6IFwiRVNQXCI7XG4gICAgZXNwQnV0dG9uLmNsYXNzTGlzdC50b2dnbGUoXCJ0b2dnbGUtb25cIiwgd2luZG93LmVzcEVuYWJsZWQpO1xuICB9O1xuICBjb25zdCBlc3BNb2RlU2VsZWN0ID0gdmlzaW9uUGFuZWwucXVlcnlTZWxlY3RvcihcIiNlc3BNb2RlU2VsZWN0XCIpO1xuICBlc3BNb2RlU2VsZWN0LnZhbHVlID0gd2luZG93LmVzcE1vZGUgfHwgXCJwbGF5ZXJzXCI7XG4gIGVzcE1vZGVTZWxlY3Qub25jaGFuZ2UgPSBjaGFuZ2VFdmVudCA9PiB7XG4gICAgd2luZG93LmVzcE1vZGUgPSBjaGFuZ2VFdmVudC50YXJnZXQudmFsdWU7XG4gICAgc2hvd05vdGlmaWNhdGlvbihcIkVTUDogXCIgKyBjaGFuZ2VFdmVudC50YXJnZXQudmFsdWUpO1xuICB9O1xuICB2aXNpb25QYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3RyYWNrTmVhcmVzdEJ0blwiKS5vbmNsaWNrID0gKCkgPT4gdHJhY2tOZWFyZXN0UGxheWVyKCk7XG4gIHZpc2lvblBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjdW50cmFja0J0blwiKS5vbmNsaWNrID0gKCkgPT4gY2xlYXJUcmFja2luZygpO1xuICBjb25zdCBlc3BDb2xvcnNUb2dnbGVCdXR0b24gPSB2aXNpb25QYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2VzcENvbG9yc1RvZ2dsZUJ0blwiKTtcbiAgY29uc3QgZXNwQ29sb3JzU2VjdGlvbiA9IHZpc2lvblBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjZXNwQ29sb3JzU2VjdGlvblwiKTtcbiAgY29uc3QgZXNwQ29sb3JzQXJyb3cgPSB2aXNpb25QYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2VzcENvbG9yc0Fycm93XCIpO1xuICBsZXQgaXNFc3BDb2xvcnNFeHBhbmRlZCA9IGZhbHNlO1xuICBlc3BDb2xvcnNUb2dnbGVCdXR0b24ub25jbGljayA9ICgpID0+IHtcbiAgICBpc0VzcENvbG9yc0V4cGFuZGVkID0gIWlzRXNwQ29sb3JzRXhwYW5kZWQ7XG4gICAgZXNwQ29sb3JzU2VjdGlvbi5zdHlsZS5kaXNwbGF5ID0gaXNFc3BDb2xvcnNFeHBhbmRlZCA/IFwiYmxvY2tcIiA6IFwibm9uZVwiO1xuICAgIGVzcENvbG9yc0Fycm93LnRleHRDb250ZW50ID0gaXNFc3BDb2xvcnNFeHBhbmRlZCA/IFwi4payXCIgOiBcIuKWvFwiO1xuICB9O1xuICBjb25zdCBlc3BDb2xvclNldHRpbmdzID0ge1xuICAgIGVzcENvbG9yQ2xvc2U6IFwiY2xvc2VcIixcbiAgICBlc3BDb2xvck1lZGl1bTogXCJtZWRpdW1cIixcbiAgICBlc3BDb2xvckZhcjogXCJmYXJcIixcbiAgICBlc3BDb2xvclZlcnlGYXI6IFwidmVyeUZhclwiLFxuICAgIGVzcENvbG9yVHJhY2tlZDogXCJ0cmFja2VkXCIsXG4gICAgZXNwQ29sb3JGb29kQ2xvc2U6IFwiZm9vZENsb3NlXCIsXG4gICAgZXNwQ29sb3JGb29kTWVkaXVtOiBcImZvb2RNZWRpdW1cIixcbiAgICBlc3BDb2xvckZvb2RGYXI6IFwiZm9vZEZhclwiXG4gIH07XG4gIE9iamVjdC5lbnRyaWVzKGVzcENvbG9yU2V0dGluZ3MpLmZvckVhY2goKFtlbGVtZW50SWQsIGNvbG9yS2V5XSkgPT4ge1xuICAgIGNvbnN0IHRhcmdldEVsZW1lbnQgPSB2aXNpb25QYW5lbC5xdWVyeVNlbGVjdG9yKFwiI1wiICsgZWxlbWVudElkKTtcbiAgICBpZiAodGFyZ2V0RWxlbWVudCkge1xuICAgICAgdGFyZ2V0RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgY29sb3JJbnB1dEV2ZW50ID0+IHtcbiAgICAgICAgd2luZG93LmVzcENvbG9yc1tjb2xvcktleV0gPSBjb2xvcklucHV0RXZlbnQudGFyZ2V0LnZhbHVlO1xuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbiAgbWFrZUVsZW1lbnREcmFnZ2FibGUodmlzaW9uUGFuZWwpO1xuICByZXR1cm4gdmlzaW9uUGFuZWw7XG59XG5mdW5jdGlvbiBjcmVhdGVDb21iYXRQYW5lbCgpIHtcbiAgY29uc3QgY29tYmF0UGFuZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICBjb21iYXRQYW5lbC5pZCA9IFwiY29tYmF0LXBhbmVsXCI7XG4gIGNvbWJhdFBhbmVsLmNsYXNzTmFtZSA9IFwiYXN0LXBhbmVsXCI7XG4gIGNvbWJhdFBhbmVsLnN0eWxlLmNzc1RleHQgPSBcInRvcDoyMHB4O2xlZnQ6MjYwcHg7d2lkdGg6MjMwcHg7XCI7XG4gIGNvbWJhdFBhbmVsLmlubmVySFRNTCA9IFwiXFxuICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LWhlYWRlclxcXCI+PHNwYW4gY2xhc3M9XFxcImFzdC1oZWFkZXItdGl0bGVcXFwiPkFzdHJhcGhvYmlhIENsaWVudDwvc3Bhbj48YnV0dG9uIGNsYXNzPVxcXCJhc3QtaGVhZGVyLW1pblxcXCIgaWQ9XFxcImNvbWJhdE1pblxcXCI+4oiSPC9idXR0b24+PC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LWJvZHlcXFwiIGlkPVxcXCJjb21iYXRCb2R5XFxcIj5cXG4gICAgICAgIDxzcGFuIGNsYXNzPVxcXCJhc3Qtc2VjdGlvbi1sYWJlbFxcXCI+Q29tYmF0PC9zcGFuPlxcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgaWQ9XFxcImxvY2tCdG5cXFwiPkxvY2sgTmVhcmVzdDwvYnV0dG9uPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LWtleS1yb3dcXFwiPjxzcGFuPkxvY2sgS2V5PC9zcGFuPjxpbnB1dCBjbGFzcz1cXFwiYXN0LWtleS1jYXB0dXJlXFxcIiBpZD1cXFwibG9ja0tleUlucHV0XFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiB2YWx1ZT1cXFwiVFxcXCIgcmVhZG9ubHk+PC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qtc2VwXFxcIj48L2Rpdj5cXG4gICAgICAgIDxzcGFuIGNsYXNzPVxcXCJhc3Qtc2VjdGlvbi1sYWJlbFxcXCI+VHJhY2tpbmc8L3NwYW4+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qta2V5LXJvd1xcXCIgc3R5bGU9XFxcIm1hcmdpbi10b3A6NHB4O1xcXCI+XFxuICAgICAgICAgIDxzcGFuPlRyYWlsIENvbG9yPC9zcGFuPlxcbiAgICAgICAgICA8aW5wdXQgdHlwZT1cXFwiY29sb3JcXFwiIGlkPVxcXCJ0cmFpbENvbG9yUGlja2VyXFxcIiB2YWx1ZT1cXFwiI2ZmOTYwMFxcXCIgc3R5bGU9XFxcIndpZHRoOjQwcHg7aGVpZ2h0OjI0cHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1iZHIsIzMzMyk7Ym9yZGVyLXJhZGl1czo0cHg7YmFja2dyb3VuZDp2YXIoLS1iZzIsIzI0MjQyNCk7Y3Vyc29yOnBvaW50ZXI7cGFkZGluZzowO1xcXCI+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1rZXktcm93XFxcIj48c3Bhbj5UcmFjZSBLZXkgKHJlLXRhcmdldHMpPC9zcGFuPjxpbnB1dCBjbGFzcz1cXFwiYXN0LWtleS1jYXB0dXJlXFxcIiBpZD1cXFwidHJhY2VLZXlJbnB1dFxcXCIgdHlwZT1cXFwidGV4dFxcXCIgdmFsdWU9XFxcIkhcXFwiIHJlYWRvbmx5PjwvZGl2PlxcbiAgICAgIDwvZGl2PlwiO1xuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGNvbWJhdFBhbmVsKTtcbiAgY29uc3QgY29tYmF0Qm9keSA9IGNvbWJhdFBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjY29tYmF0Qm9keVwiKTtcbiAgbGV0IGlzQ29tYmF0UGFuZWxNaW5pbWl6ZWQgPSBmYWxzZTtcbiAgY29tYmF0UGFuZWwucXVlcnlTZWxlY3RvcihcIiNjb21iYXRNaW5cIikub25jbGljayA9IHRvZ2dsZUV2ZW50ID0+IHtcbiAgICB0b2dnbGVFdmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBpc0NvbWJhdFBhbmVsTWluaW1pemVkID0gIWlzQ29tYmF0UGFuZWxNaW5pbWl6ZWQ7XG4gICAgY29tYmF0Qm9keS5zdHlsZS5kaXNwbGF5ID0gaXNDb21iYXRQYW5lbE1pbmltaXplZCA/IFwibm9uZVwiIDogXCJibG9ja1wiO1xuICAgIGNvbWJhdFBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjY29tYmF0TWluXCIpLnRleHRDb250ZW50ID0gaXNDb21iYXRQYW5lbE1pbmltaXplZCA/IFwiK1wiIDogXCLiiJJcIjtcbiAgfTtcbiAgY29uc3QgbG9ja0J1dHRvbiA9IGNvbWJhdFBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbG9ja0J0blwiKTtcbiAgbG9ja0J1dHRvbi5vbmNsaWNrID0gKCkgPT4gdG9nZ2xlTG9jaygpO1xuICBjb25zdCBsb2NrS2V5SW5wdXQgPSBjb21iYXRQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2xvY2tLZXlJbnB1dFwiKTtcbiAgbG9ja0tleUlucHV0LnZhbHVlID0gd2luZG93LmxvY2tLZXkudG9VcHBlckNhc2UoKTtcbiAgbG9ja0tleUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGxvY2tLZXlFdmVudCA9PiB7XG4gICAgbG9ja0tleUV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgbG9ja0tleUV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIHdpbmRvdy5sb2NrS2V5ID0gbG9ja0tleUV2ZW50LmtleTtcbiAgICBsb2NrS2V5SW5wdXQudmFsdWUgPSBsb2NrS2V5RXZlbnQua2V5Lmxlbmd0aCA9PT0gMSA/IGxvY2tLZXlFdmVudC5rZXkudG9VcHBlckNhc2UoKSA6IGxvY2tLZXlFdmVudC5rZXk7XG4gIH0pO1xuICBjb25zdCB0cmFpbENvbG9yUGlja2VyID0gY29tYmF0UGFuZWwucXVlcnlTZWxlY3RvcihcIiN0cmFpbENvbG9yUGlja2VyXCIpO1xuICB0cmFpbENvbG9yUGlja2VyLmFkZEV2ZW50TGlzdGVuZXIoXCJpbnB1dFwiLCBjb2xvclBpY2tlckV2ZW50ID0+IHtcbiAgICBjb25zdCBjb2xvclZhbHVlID0gY29sb3JQaWNrZXJFdmVudC50YXJnZXQudmFsdWU7XG4gICAgd2luZG93LmVudGl0eVRyYWlsQ29sb3IgPSB7XG4gICAgICByOiBwYXJzZUludChjb2xvclZhbHVlLnNsaWNlKDEsIDMpLCAxNiksXG4gICAgICBnOiBwYXJzZUludChjb2xvclZhbHVlLnNsaWNlKDMsIDUpLCAxNiksXG4gICAgICBiOiBwYXJzZUludChjb2xvclZhbHVlLnNsaWNlKDUsIDcpLCAxNilcbiAgICB9O1xuICB9KTtcbiAgY29uc3QgdHJhY2VLZXlJbnB1dCA9IGNvbWJhdFBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjdHJhY2VLZXlJbnB1dFwiKTtcbiAgdHJhY2VLZXlJbnB1dC52YWx1ZSA9IHdpbmRvdy5lbnRpdHlUcmFjZUtleS50b1VwcGVyQ2FzZSgpO1xuICB0cmFjZUtleUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIHRyYWNlS2V5RXZlbnQgPT4ge1xuICAgIHRyYWNlS2V5RXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB0cmFjZUtleUV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIHdpbmRvdy5lbnRpdHlUcmFjZUtleSA9IHRyYWNlS2V5RXZlbnQua2V5LnRvTG93ZXJDYXNlKCk7XG4gICAgdHJhY2VLZXlJbnB1dC52YWx1ZSA9IHRyYWNlS2V5RXZlbnQua2V5Lmxlbmd0aCA9PT0gMSA/IHRyYWNlS2V5RXZlbnQua2V5LnRvVXBwZXJDYXNlKCkgOiB0cmFjZUtleUV2ZW50LmtleTtcbiAgfSk7XG4gIG1ha2VFbGVtZW50RHJhZ2dhYmxlKGNvbWJhdFBhbmVsKTtcbiAgcmV0dXJuIGNvbWJhdFBhbmVsO1xufVxuZnVuY3Rpb24gY3JlYXRlQXV0b21hdGlvblBhbmVsKCkge1xuICBjb25zdCBhdXRvbWF0aW9uUGFuZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICBhdXRvbWF0aW9uUGFuZWwuaWQgPSBcImF1dG9tYXRpb24tcGFuZWxcIjtcbiAgYXV0b21hdGlvblBhbmVsLmNsYXNzTmFtZSA9IFwiYXN0LXBhbmVsXCI7XG4gIGF1dG9tYXRpb25QYW5lbC5zdHlsZS5jc3NUZXh0ID0gXCJib3R0b206MjBweDtsZWZ0OjI2MHB4O3dpZHRoOjIzMHB4O1wiO1xuICBhdXRvbWF0aW9uUGFuZWwuaW5uZXJIVE1MID0gXCJcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJhc3QtaGVhZGVyXFxcIj48c3BhbiBjbGFzcz1cXFwiYXN0LWhlYWRlci10aXRsZVxcXCI+QXN0cmFwaG9iaWEgQ2xpZW50PC9zcGFuPjxidXR0b24gY2xhc3M9XFxcImFzdC1oZWFkZXItbWluXFxcIiBpZD1cXFwiYXV0b01pblxcXCI+4oiSPC9idXR0b24+PC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LWJvZHlcXFwiIGlkPVxcXCJhdXRvQm9keVxcXCI+XFxuICAgICAgICA8c3BhbiBjbGFzcz1cXFwiYXN0LXNlY3Rpb24tbGFiZWxcXFwiPkF1dG9tYXRpb248L3NwYW4+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuXFxcIiBpZD1cXFwiYXV0b0RvZGdlQnRuXFxcIj5BdXRvIERvZGdlPC9idXR0b24+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuXFxcIiBpZD1cXFwiYXV0b0Zhcm1CdG5cXFwiPkF1dG8gRmFybSAoRjUpPC9idXR0b24+XFxuICAgICAgICA8c2VsZWN0IGNsYXNzPVxcXCJhc3Qtc2VsZWN0XFxcIiBpZD1cXFwiZmFybU1vZGVTZWxlY3RcXFwiIHN0eWxlPVxcXCJtYXJnaW4tdG9wOjRweDtcXFwiPlxcbiAgICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJuZWFyZXN0XFxcIj5OZWFyZXN0IEZvb2Q8L29wdGlvbj5cXG4gICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiY2x1c3RlclxcXCI+Rm9vZCBDbHVzdGVyczwvb3B0aW9uPlxcbiAgICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJwYXRyb2xcXFwiPlBhdHJvbCBSb3V0ZTwvb3B0aW9uPlxcbiAgICAgICAgPC9zZWxlY3Q+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3QtdG9nZ2xlLXJvd1xcXCI+PHNwYW4+Qm9vc3Q8L3NwYW4+PGRpdiBjbGFzcz1cXFwiYXN0LXN3aXRjaFxcXCI+PGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBpZD1cXFwiZmFybUJvb3N0VG9nZ2xlXFxcIiBjaGVja2VkPjxzcGFuIGNsYXNzPVxcXCJzbGlkZXJcXFwiPjwvc3Bhbj48L2Rpdj48L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC10b2dnbGUtcm93XFxcIj48c3Bhbj5BdXRvIEV2b2x2ZTwvc3Bhbj48ZGl2IGNsYXNzPVxcXCJhc3Qtc3dpdGNoXFxcIj48aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGlkPVxcXCJmYXJtRXZvbHZlVG9nZ2xlXFxcIiBjaGVja2VkPjxzcGFuIGNsYXNzPVxcXCJzbGlkZXJcXFwiPjwvc3Bhbj48L2Rpdj48L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC10b2dnbGUtcm93XFxcIj48c3Bhbj5Bdm9pZCBQbGF5ZXJzPC9zcGFuPjxkaXYgY2xhc3M9XFxcImFzdC1zd2l0Y2hcXFwiPjxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgaWQ9XFxcImZhcm1Bdm9pZFRvZ2dsZVxcXCIgY2hlY2tlZD48c3BhbiBjbGFzcz1cXFwic2xpZGVyXFxcIj48L3NwYW4+PC9kaXY+PC9kaXY+XFxuICAgICAgPC9kaXY+XCI7XG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoYXV0b21hdGlvblBhbmVsKTtcbiAgY29uc3QgYXV0b21hdGlvbkJvZHkgPSBhdXRvbWF0aW9uUGFuZWwucXVlcnlTZWxlY3RvcihcIiNhdXRvQm9keVwiKTtcbiAgbGV0IGlzQXV0b21hdGlvblBhbmVsTWluaW1pemVkID0gZmFsc2U7XG4gIGF1dG9tYXRpb25QYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2F1dG9NaW5cIikub25jbGljayA9IGV2ZW50ID0+IHtcbiAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBpc0F1dG9tYXRpb25QYW5lbE1pbmltaXplZCA9ICFpc0F1dG9tYXRpb25QYW5lbE1pbmltaXplZDtcbiAgICBhdXRvbWF0aW9uQm9keS5zdHlsZS5kaXNwbGF5ID0gaXNBdXRvbWF0aW9uUGFuZWxNaW5pbWl6ZWQgPyBcIm5vbmVcIiA6IFwiYmxvY2tcIjtcbiAgICBhdXRvbWF0aW9uUGFuZWwucXVlcnlTZWxlY3RvcihcIiNhdXRvTWluXCIpLnRleHRDb250ZW50ID0gaXNBdXRvbWF0aW9uUGFuZWxNaW5pbWl6ZWQgPyBcIitcIiA6IFwi4oiSXCI7XG4gIH07XG4gIGNvbnN0IGF1dG9Eb2RnZUJ1dHRvbiA9IGF1dG9tYXRpb25QYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2F1dG9Eb2RnZUJ0blwiKTtcbiAgYXV0b0RvZGdlQnV0dG9uLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgaWYgKHdpbmRvdy5hdXRvRG9kZ2VFbmFibGVkKSB7XG4gICAgICBkaXNhYmxlQXV0b0RvZGdlKCk7XG4gICAgICBhdXRvRG9kZ2VCdXR0b24udGV4dENvbnRlbnQgPSBcIkF1dG8gRG9kZ2VcIjtcbiAgICAgIGF1dG9Eb2RnZUJ1dHRvbi5jbGFzc0xpc3QucmVtb3ZlKFwidG9nZ2xlLW9uXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBlbmFibGVBdXRvRG9kZ2UoKTtcbiAgICAgIGF1dG9Eb2RnZUJ1dHRvbi50ZXh0Q29udGVudCA9IFwiRG9kZ2luZyDinJNcIjtcbiAgICAgIGF1dG9Eb2RnZUJ1dHRvbi5jbGFzc0xpc3QuYWRkKFwidG9nZ2xlLW9uXCIpO1xuICAgIH1cbiAgfTtcbiAgY29uc3QgYXV0b0Zhcm1CdXR0b24gPSBhdXRvbWF0aW9uUGFuZWwucXVlcnlTZWxlY3RvcihcIiNhdXRvRmFybUJ0blwiKTtcbiAgYXV0b0Zhcm1CdXR0b24uaWQgPSBcImF1dG9GYXJtQnRuXCI7XG4gIGNvbnN0IGZhcm1Nb2RlU2VsZWN0ID0gYXV0b21hdGlvblBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjZmFybU1vZGVTZWxlY3RcIik7XG4gIGF1dG9GYXJtQnV0dG9uLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgaWYgKHdpbmRvdy5hdXRvRmFybUFjdGl2ZSkge1xuICAgICAgc3RvcEF1dG9GYXJtKCk7XG4gICAgICBhdXRvRmFybUJ1dHRvbi50ZXh0Q29udGVudCA9IFwiQXV0byBGYXJtIChGNSlcIjtcbiAgICAgIGF1dG9GYXJtQnV0dG9uLmNsYXNzTGlzdC5yZW1vdmUoXCJ0b2dnbGUtb25cIik7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXJ0QXV0b0Zhcm0oZmFybU1vZGVTZWxlY3QudmFsdWUpO1xuICAgICAgYXV0b0Zhcm1CdXR0b24udGV4dENvbnRlbnQgPSBcIlN0b3AgRmFybSAoRjUpXCI7XG4gICAgICBhdXRvRmFybUJ1dHRvbi5jbGFzc0xpc3QuYWRkKFwidG9nZ2xlLW9uXCIpO1xuICAgIH1cbiAgfTtcbiAgZmFybU1vZGVTZWxlY3Qub25jaGFuZ2UgPSBmYXJtTW9kZUNoYW5nZUV2ZW50ID0+IHtcbiAgICBpZiAod2luZG93LmF1dG9GYXJtQWN0aXZlKSB7XG4gICAgICB3aW5kb3cuYXV0b0Zhcm1Nb2RlID0gZmFybU1vZGVDaGFuZ2VFdmVudC50YXJnZXQudmFsdWU7XG4gICAgICBpZiAoZmFybU1vZGVDaGFuZ2VFdmVudC50YXJnZXQudmFsdWUgPT09IFwicGF0cm9sXCIpIHtcbiAgICAgICAgc2V0dXBQYXRyb2xSb3V0ZSgpO1xuICAgICAgfVxuICAgICAgc2hvd05vdGlmaWNhdGlvbihcIkZhcm06IFwiICsgZmFybU1vZGVDaGFuZ2VFdmVudC50YXJnZXQudmFsdWUpO1xuICAgIH1cbiAgfTtcbiAgY29uc3QgZmFybUJvb3N0VG9nZ2xlID0gYXV0b21hdGlvblBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjZmFybUJvb3N0VG9nZ2xlXCIpO1xuICBjb25zdCBmYXJtRXZvbHZlVG9nZ2xlID0gYXV0b21hdGlvblBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjZmFybUV2b2x2ZVRvZ2dsZVwiKTtcbiAgY29uc3QgZmFybUF2b2lkVG9nZ2xlID0gYXV0b21hdGlvblBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjZmFybUF2b2lkVG9nZ2xlXCIpO1xuICBmYXJtQm9vc3RUb2dnbGUuY2hlY2tlZCA9IHdpbmRvdy5hdXRvRmFybUJvb3N0O1xuICBmYXJtRXZvbHZlVG9nZ2xlLmNoZWNrZWQgPSB3aW5kb3cuYXV0b0Zhcm1Fdm9sdmU7XG4gIGZhcm1Bdm9pZFRvZ2dsZS5jaGVja2VkID0gd2luZG93LmF1dG9GYXJtQXZvaWRQbGF5ZXJzO1xuICBjb25zdCBmYXJtQm9vc3RMYWJlbCA9IGZhcm1Cb29zdFRvZ2dsZS5uZXh0RWxlbWVudFNpYmxpbmc7XG4gIGZhcm1Cb29zdExhYmVsLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhdXRvRmFybVRvZ2dsZUV2ZW50ID0+IHtcbiAgICBhdXRvRmFybVRvZ2dsZUV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGZhcm1Cb29zdFRvZ2dsZS5jaGVja2VkID0gIWZhcm1Cb29zdFRvZ2dsZS5jaGVja2VkO1xuICAgIHdpbmRvdy5hdXRvRmFybUJvb3N0ID0gZmFybUJvb3N0VG9nZ2xlLmNoZWNrZWQ7XG4gICAgc2hvd05vdGlmaWNhdGlvbihmYXJtQm9vc3RUb2dnbGUuY2hlY2tlZCA/IFwiRmFybSBib29zdCBPTlwiIDogXCJGYXJtIGJvb3N0IE9GRlwiKTtcbiAgfSk7XG4gIGNvbnN0IGZhcm1Fdm9sdmVMYWJlbCA9IGZhcm1Fdm9sdmVUb2dnbGUubmV4dEVsZW1lbnRTaWJsaW5nO1xuICBmYXJtRXZvbHZlTGFiZWwuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGF1dG9Db2xsZWN0VG9nZ2xlRXZlbnQgPT4ge1xuICAgIGF1dG9Db2xsZWN0VG9nZ2xlRXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgZmFybUV2b2x2ZVRvZ2dsZS5jaGVja2VkID0gIWZhcm1Fdm9sdmVUb2dnbGUuY2hlY2tlZDtcbiAgICB3aW5kb3cuYXV0b0Zhcm1Fdm9sdmUgPSBmYXJtRXZvbHZlVG9nZ2xlLmNoZWNrZWQ7XG4gICAgc2hvd05vdGlmaWNhdGlvbihmYXJtRXZvbHZlVG9nZ2xlLmNoZWNrZWQgPyBcIkF1dG8gZXZvbHZlIE9OXCIgOiBcIkF1dG8gZXZvbHZlIE9GRlwiKTtcbiAgfSk7XG4gIGNvbnN0IGZhcm1Bdm9pZExhYmVsID0gZmFybUF2b2lkVG9nZ2xlLm5leHRFbGVtZW50U2libGluZztcbiAgZmFybUF2b2lkTGFiZWwuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGF1dG9TZWxsVG9nZ2xlRXZlbnQgPT4ge1xuICAgIGF1dG9TZWxsVG9nZ2xlRXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgZmFybUF2b2lkVG9nZ2xlLmNoZWNrZWQgPSAhZmFybUF2b2lkVG9nZ2xlLmNoZWNrZWQ7XG4gICAgd2luZG93LmF1dG9GYXJtQXZvaWRQbGF5ZXJzID0gZmFybUF2b2lkVG9nZ2xlLmNoZWNrZWQ7XG4gICAgc2hvd05vdGlmaWNhdGlvbihmYXJtQXZvaWRUb2dnbGUuY2hlY2tlZCA/IFwiQXZvaWQgcGxheWVycyBPTlwiIDogXCJBdm9pZCBwbGF5ZXJzIE9GRlwiKTtcbiAgfSk7XG4gIG1ha2VFbGVtZW50RHJhZ2dhYmxlKGF1dG9tYXRpb25QYW5lbCk7XG4gIHJldHVybiBhdXRvbWF0aW9uUGFuZWw7XG59XG5mdW5jdGlvbiBjcmVhdGVTZXR0aW5nc1BhbmVsKCkge1xuICBjb25zdCBzZXR0aW5nc1BhbmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgc2V0dGluZ3NQYW5lbC5pZCA9IFwic2V0dGluZ3MtcGFuZWxcIjtcbiAgc2V0dGluZ3NQYW5lbC5jbGFzc05hbWUgPSBcImFzdC1wYW5lbFwiO1xuICBzZXR0aW5nc1BhbmVsLnN0eWxlLmNzc1RleHQgPSBcInRvcDoyMHB4O2xlZnQ6MjBweDt3aWR0aDoyMjBweDtcIjtcbiAgc2V0dGluZ3NQYW5lbC5pbm5lckhUTUwgPSBcIlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1oZWFkZXJcXFwiPjxzcGFuIGNsYXNzPVxcXCJhc3QtaGVhZGVyLXRpdGxlXFxcIj5TZXR0aW5nczwvc3Bhbj48YnV0dG9uIGNsYXNzPVxcXCJhc3QtaGVhZGVyLW1pblxcXCIgaWQ9XFxcInNldHRpbmdzTWluXFxcIj7iiJI8L2J1dHRvbj48L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJhc3QtYm9keVxcXCIgaWQ9XFxcInNldHRpbmdzQm9keVxcXCI+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qta2V5LXJvd1xcXCI+PHNwYW4+VG9nZ2xlIFVJPC9zcGFuPjxpbnB1dCBjbGFzcz1cXFwiYXN0LWtleS1jYXB0dXJlXFxcIiBpZD1cXFwidG9nZ2xlS2V5SW5wdXRcXFwiIHR5cGU9XFxcInRleHRcXFwiIHZhbHVlPVxcXCJTSElGVFxcXCIgcmVhZG9ubHk+PC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qtc2VwXFxcIj48L2Rpdj5cXG4gICAgICAgIDxzcGFuIGNsYXNzPVxcXCJhc3Qtc2VjdGlvbi1sYWJlbFxcXCI+QmFja2dyb3VuZDwvc3Bhbj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1yb3dcXFwiPjxpbnB1dCBjbGFzcz1cXFwiYXN0LWlucHV0XFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiBpZD1cXFwiYmdVcmxcXFwiIHBsYWNlaG9sZGVyPVxcXCJJbWFnZSBVUkwuLi5cXFwiIHN0eWxlPVxcXCJmbGV4OjE7XFxcIj48YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuXFxcIiBpZD1cXFwiYXBwbHlCZ1xcXCIgc3R5bGU9XFxcIndpZHRoOmF1dG87cGFkZGluZzo2cHggMTBweDttYXJnaW46MDtcXFwiPlNldDwvYnV0dG9uPjwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LXNlcFxcXCI+PC9kaXY+XFxuICAgICAgICA8c3BhbiBjbGFzcz1cXFwiYXN0LXNlY3Rpb24tbGFiZWxcXFwiPlRoZW1lPC9zcGFuPlxcbiAgICAgICAgPHNlbGVjdCBjbGFzcz1cXFwiYXN0LXNlbGVjdFxcXCIgaWQ9XFxcInRoZW1lU2VsZWN0XFxcIj5cXG4gICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiZ3JleVxcXCI+R3JleTwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XFxcImJsdWVcXFwiPkJsdWU8L29wdGlvbj48b3B0aW9uIHZhbHVlPVxcXCJyZWRcXFwiPlJlZDwvb3B0aW9uPlxcbiAgICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJncmVlblxcXCI+R3JlZW48L29wdGlvbj48b3B0aW9uIHZhbHVlPVxcXCJwaW5rXFxcIj5QaW5rPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cXFwic3RhcndhcnNcXFwiPlN0YXIgV2Fyczwvb3B0aW9uPlxcbiAgICAgICAgICA8b3B0aW9uIHZhbHVlPVxcXCJrZmNcXFwiPktGQzwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XFxcImhhbGxvd2VlblxcXCI+SGFsbG93ZWVuIPCflJI8L29wdGlvbj5cXG4gICAgICAgIDwvc2VsZWN0PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LXNlcFxcXCI+PC9kaXY+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuXFxcIiBpZD1cXFwiY3VzdG9tVGhlbWVUb2dnbGVCdG5cXFwiIHN0eWxlPVxcXCJkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO1xcXCI+XFxuICAgICAgICAgIDxzcGFuIHN0eWxlPVxcXCJmb250LXNpemU6MTBweDtmb250LXdlaWdodDo2MDA7bGV0dGVyLXNwYWNpbmc6MXB4O3RleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTtjb2xvcjp2YXIoLS10ZXh0LXNlYywjODg4KTtcXFwiPkNyZWF0ZSBUaGVtZTwvc3Bhbj5cXG4gICAgICAgICAgPHNwYW4gaWQ9XFxcImN1c3RvbVRoZW1lQXJyb3dcXFwiIHN0eWxlPVxcXCJjb2xvcjp2YXIoLS10ZXh0LXNlYywjODg4KTtmb250LXNpemU6MTJweDtcXFwiPuKWvDwvc3Bhbj5cXG4gICAgICAgIDwvYnV0dG9uPlxcbiAgICAgICAgPGRpdiBpZD1cXFwiY3VzdG9tVGhlbWVTZWN0aW9uXFxcIiBzdHlsZT1cXFwiZGlzcGxheTpub25lO3BhZGRpbmctdG9wOjRweDtcXFwiPlxcbiAgICAgICAgICA8aW5wdXQgY2xhc3M9XFxcImFzdC1pbnB1dFxcXCIgdHlwZT1cXFwidGV4dFxcXCIgaWQ9XFxcImN1c3RvbVRoZW1lTmFtZVxcXCIgcGxhY2Vob2xkZXI9XFxcIlRoZW1lIG5hbWUuLi5cXFwiIHN0eWxlPVxcXCJ3aWR0aDoxMDAlO2JveC1zaXppbmc6Ym9yZGVyLWJveDttYXJnaW4tYm90dG9tOjRweDtcXFwiPlxcbjxkaXYgY2xhc3M9XFxcImFzdC1rZXktcm93XFxcIj48c3Bhbj5BY2NlbnQ8L3NwYW4+PGlucHV0IHR5cGU9XFxcImNvbG9yXFxcIiBpZD1cXFwiY3RBY2NcXFwiIHZhbHVlPVxcXCIjODg4ODg4XFxcIiBzdHlsZT1cXFwid2lkdGg6NDBweDtoZWlnaHQ6MjRweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWJkciwjMzMzKTtib3JkZXItcmFkaXVzOjRweDtjdXJzb3I6cG9pbnRlcjtwYWRkaW5nOjA7YmFja2dyb3VuZDp2YXIoLS1iZzIsIzI0MjQyNCk7XFxcIj48L2Rpdj5cXG48ZGl2IGNsYXNzPVxcXCJhc3Qta2V5LXJvd1xcXCI+PHNwYW4+QmFja2dyb3VuZDwvc3Bhbj48aW5wdXQgdHlwZT1cXFwiY29sb3JcXFwiIGlkPVxcXCJjdEJnXFxcIiB2YWx1ZT1cXFwiIzFhMWExYVxcXCIgc3R5bGU9XFxcIndpZHRoOjQwcHg7aGVpZ2h0OjI0cHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1iZHIsIzMzMyk7Ym9yZGVyLXJhZGl1czo0cHg7Y3Vyc29yOnBvaW50ZXI7cGFkZGluZzowO2JhY2tncm91bmQ6dmFyKC0tYmcyLCMyNDI0MjQpO1xcXCI+PC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiYXN0LWtleS1yb3dcXFwiPjxzcGFuPlBhbmVsPC9zcGFuPjxpbnB1dCB0eXBlPVxcXCJjb2xvclxcXCIgaWQ9XFxcImN0UGFuZWxcXFwiIHZhbHVlPVxcXCIjMjQyNDI0XFxcIiBzdHlsZT1cXFwid2lkdGg6NDBweDtoZWlnaHQ6MjRweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWJkciwjMzMzKTtib3JkZXItcmFkaXVzOjRweDtjdXJzb3I6cG9pbnRlcjtwYWRkaW5nOjA7YmFja2dyb3VuZDp2YXIoLS1iZzIsIzI0MjQyNCk7XFxcIj48L2Rpdj5cXG48YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuXFxcIiBpZD1cXFwic2F2ZUN1c3RvbVRoZW1lXFxcIiBzdHlsZT1cXFwibWFyZ2luLXRvcDo0cHg7XFxcIj5TYXZlIFRoZW1lPC9idXR0b24+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1zZXBcXFwiPjwvZGl2PlxcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgaWQ9XFxcIm15VGhlbWVzVG9nZ2xlQnRuXFxcIiBzdHlsZT1cXFwiZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtcXFwiPlxcbiAgICAgICAgICA8c3BhbiBzdHlsZT1cXFwiZm9udC1zaXplOjEwcHg7Zm9udC13ZWlnaHQ6NjAwO2xldHRlci1zcGFjaW5nOjFweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7Y29sb3I6dmFyKC0tdGV4dC1zZWMsIzg4OCk7XFxcIj5NeSBUaGVtZXM8L3NwYW4+XFxuICAgICAgICAgIDxzcGFuIGlkPVxcXCJteVRoZW1lc0Fycm93XFxcIiBzdHlsZT1cXFwiY29sb3I6dmFyKC0tdGV4dC1zZWMsIzg4OCk7Zm9udC1zaXplOjEycHg7XFxcIj7ilrw8L3NwYW4+XFxuICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgIDxkaXYgaWQ9XFxcIm15VGhlbWVzU2VjdGlvblxcXCIgc3R5bGU9XFxcImRpc3BsYXk6bm9uZTtwYWRkaW5nLXRvcDo0cHg7XFxcIj5cXG4gICAgICAgICAgPGRpdiBpZD1cXFwiY3VzdG9tVGhlbWVMaXN0XFxcIj48L2Rpdj5cXG4gICAgICAgICAgPGRpdiBpZD1cXFwibm9UaGVtZXNNc2dcXFwiIHN0eWxlPVxcXCJmb250LXNpemU6MTFweDtjb2xvcjojNTU1O3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6OHB4IDA7XFxcIj5ObyBjdXN0b20gdGhlbWVzIHlldDwvZGl2PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgPC9kaXY+XCI7XG4gIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoc2V0dGluZ3NQYW5lbCk7XG4gIGNvbnN0IHNldHRpbmdzQm9keUVsZW1lbnQgPSBzZXR0aW5nc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjc2V0dGluZ3NCb2R5XCIpO1xuICBsZXQgaXNTZXR0aW5nc0NvbGxhcHNlZCA9IGZhbHNlO1xuICBzZXR0aW5nc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjc2V0dGluZ3NNaW5cIikub25jbGljayA9IGNsaWNrRXZlbnQgPT4ge1xuICAgIGNsaWNrRXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgaXNTZXR0aW5nc0NvbGxhcHNlZCA9ICFpc1NldHRpbmdzQ29sbGFwc2VkO1xuICAgIHNldHRpbmdzQm9keUVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IGlzU2V0dGluZ3NDb2xsYXBzZWQgPyBcIm5vbmVcIiA6IFwiYmxvY2tcIjtcbiAgICBzZXR0aW5nc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjc2V0dGluZ3NNaW5cIikudGV4dENvbnRlbnQgPSBpc1NldHRpbmdzQ29sbGFwc2VkID8gXCIrXCIgOiBcIuKIklwiO1xuICB9O1xuICBjb25zdCB0b2dnbGVLZXlJbnB1dCA9IHNldHRpbmdzUGFuZWwucXVlcnlTZWxlY3RvcihcIiN0b2dnbGVLZXlJbnB1dFwiKTtcbiAgdG9nZ2xlS2V5SW5wdXQudmFsdWUgPSBwcmVzc2VkS2V5LnRvVXBwZXJDYXNlKCk7XG4gIHRvZ2dsZUtleUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGtleWJvYXJkRXZlbnQgPT4ge1xuICAgIGtleWJvYXJkRXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBwcmVzc2VkS2V5ID0ga2V5Ym9hcmRFdmVudC5rZXk7XG4gICAgdG9nZ2xlS2V5SW5wdXQudmFsdWUgPSBrZXlib2FyZEV2ZW50LmtleS5sZW5ndGggPT09IDEgPyBrZXlib2FyZEV2ZW50LmtleS50b1VwcGVyQ2FzZSgpIDoga2V5Ym9hcmRFdmVudC5rZXk7XG4gIH0pO1xuICBjb25zdCBiZ1VybElucHV0ID0gc2V0dGluZ3NQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2JnVXJsXCIpO1xuICBiZ1VybElucHV0LnZhbHVlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJiZ1VybFwiKSB8fCBcIlwiO1xuICBzZXR0aW5nc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjYXBwbHlCZ1wiKS5vbmNsaWNrID0gKCkgPT4ge1xuICAgIGNvbnN0IGJhY2tncm91bmRVcmwgPSBiZ1VybElucHV0LnZhbHVlLnRyaW0oKTtcbiAgICBpZiAoIWJhY2tncm91bmRVcmwpIHtcbiAgICAgIHNob3dOb3RpZmljYXRpb24oXCJFbnRlciBhIFVSTFwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJiZ1VybFwiLCBiYWNrZ3JvdW5kVXJsKTtcbiAgICBpbml0QmFja2dyb3VuZEltYWdlKCk7XG4gICAgc2hvd05vdGlmaWNhdGlvbihcIkJhY2tncm91bmQgYXBwbGllZFwiKTtcbiAgfTtcbiAgY29uc3QgdGhlbWVTZWxlY3RFbGVtZW50ID0gc2V0dGluZ3NQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3RoZW1lU2VsZWN0XCIpO1xuICBjb25zdCBjdXJyZW50VGhlbWUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInRoZW1lXCIpIHx8IFwiZ3JleVwiO1xuICBjb25zdCBjdXN0b21UaGVtZXMgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiY3VzdG9tVGhlbWVzXCIpIHx8IFwie31cIik7XG4gIGNvbnN0IHByZXNldFRoZW1lcyA9IFtcImdyZXlcIiwgXCJibHVlXCIsIFwicmVkXCIsIFwiZ3JlZW5cIiwgXCJwaW5rXCIsIFwic3RhcndhcnNcIiwgXCJrZmNcIiwgXCJoYWxsb3dlZW5cIl07XG4gIHRoZW1lU2VsZWN0RWxlbWVudC52YWx1ZSA9IHByZXNldFRoZW1lcy5pbmNsdWRlcyhjdXJyZW50VGhlbWUpIHx8IGN1c3RvbVRoZW1lc1tjdXJyZW50VGhlbWVdID8gY3VycmVudFRoZW1lIDogXCJncmV5XCI7XG4gIHRoZW1lU2VsZWN0RWxlbWVudC5vbmNoYW5nZSA9IHRoZW1lQ2hhbmdlRXZlbnQgPT4ge1xuICAgIGNvbnN0IHNlbGVjdGVkVGhlbWVWYWx1ZSA9IHRoZW1lQ2hhbmdlRXZlbnQudGFyZ2V0LnZhbHVlO1xuICAgIGlmIChzZWxlY3RlZFRoZW1lVmFsdWUgPT09IFwiaGFsbG93ZWVuXCIpIHtcbiAgICAgIHNob3dIYWxsb3dlZW5Db2RlTW9kYWwoaXNIYWxsb3dlZW5UaGVtZSA9PiB7XG4gICAgICAgIGlmIChpc0hhbGxvd2VlblRoZW1lKSB7XG4gICAgICAgICAgYXBwbHlUaGVtZShcImhhbGxvd2VlblwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aGVtZUNoYW5nZUV2ZW50LnRhcmdldC52YWx1ZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwidGhlbWVcIikgfHwgXCJncmV5XCI7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBhcHBseVRoZW1lKHNlbGVjdGVkVGhlbWVWYWx1ZSk7XG4gICAgICBzaG93Tm90aWZpY2F0aW9uKFwiVGhlbWU6IFwiICsgc2VsZWN0ZWRUaGVtZVZhbHVlKTtcbiAgICB9XG4gIH07XG4gIGNvbnN0IHJlbmRlckN1c3RvbVRoZW1lTGlzdCA9ICgpID0+IHtcbiAgICBjb25zdCBjdXN0b21UaGVtZUxpc3RFbGVtZW50ID0gc2V0dGluZ3NQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2N1c3RvbVRoZW1lTGlzdFwiKTtcbiAgICBjb25zdCBub1RoZW1lc01lc3NhZ2VFbGVtZW50ID0gc2V0dGluZ3NQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI25vVGhlbWVzTXNnXCIpO1xuICAgIGNvbnN0IGN1c3RvbVRoZW1lc0RhdGEgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiY3VzdG9tVGhlbWVzXCIpIHx8IFwie31cIik7XG4gICAgY29uc3QgdGhlbWVLZXlzID0gT2JqZWN0LmtleXMoY3VzdG9tVGhlbWVzRGF0YSk7XG4gICAgY3VzdG9tVGhlbWVMaXN0RWxlbWVudC5pbm5lckhUTUwgPSBcIlwiO1xuICAgIG5vVGhlbWVzTWVzc2FnZUVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IHRoZW1lS2V5cy5sZW5ndGggPT09IDAgPyBcImJsb2NrXCIgOiBcIm5vbmVcIjtcbiAgICB0aGVtZUtleXMuZm9yRWFjaChjdXJyZW50VGhlbWUgPT4ge1xuICAgICAgY29uc3QgdGhlbWVDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICAgICAgdGhlbWVDb250YWluZXIuc3R5bGUuY3NzVGV4dCA9IFwiZGlzcGxheTpmbGV4O2dhcDo0cHg7bWFyZ2luLWJvdHRvbTozcHg7XCI7XG4gICAgICBjb25zdCBpc1RoZW1lQWN0aXZlID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJ0aGVtZVwiKSA9PT0gY3VycmVudFRoZW1lO1xuICAgICAgdGhlbWVDb250YWluZXIuaW5uZXJIVE1MID0gXCJcXG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blwiICsgKGlzVGhlbWVBY3RpdmUgPyBcIiB0b2dnbGUtb25cIiA6IFwiXCIpICsgXCJcXFwiIHN0eWxlPVxcXCJmbGV4OjE7bWFyZ2luOjA7XFxcIj5cIiArIGN1cnJlbnRUaGVtZSArIFwiPC9idXR0b24+XFxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG5cXFwiIHN0eWxlPVxcXCJ3aWR0aDozMnB4O21hcmdpbjowO3RleHQtYWxpZ246Y2VudGVyO2NvbG9yOiNmNDQzMzY7XFxcIj7inJU8L2J1dHRvbj5cIjtcbiAgICAgIHRoZW1lQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoXCJidXR0b25cIilbMF0ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgYXBwbHlUaGVtZShjdXJyZW50VGhlbWUpO1xuICAgICAgICBzaG93Tm90aWZpY2F0aW9uKFwiVGhlbWU6IFwiICsgY3VycmVudFRoZW1lKTtcbiAgICAgICAgcmVuZGVyQ3VzdG9tVGhlbWVMaXN0KCk7XG4gICAgICB9O1xuICAgICAgdGhlbWVDb250YWluZXIucXVlcnlTZWxlY3RvckFsbChcImJ1dHRvblwiKVsxXS5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgICBjb25zdCBjdXN0b21UaGVtZXMgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiY3VzdG9tVGhlbWVzXCIpIHx8IFwie31cIik7XG4gICAgICAgIGRlbGV0ZSBjdXN0b21UaGVtZXNbY3VycmVudFRoZW1lXTtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJjdXN0b21UaGVtZXNcIiwgSlNPTi5zdHJpbmdpZnkoY3VzdG9tVGhlbWVzKSk7XG4gICAgICAgIGlmIChsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInRoZW1lXCIpID09PSBjdXJyZW50VGhlbWUpIHtcbiAgICAgICAgICBhcHBseVRoZW1lKFwiZ3JleVwiKTtcbiAgICAgICAgICB0aGVtZVNlbGVjdEVsZW1lbnQudmFsdWUgPSBcImdyZXlcIjtcbiAgICAgICAgICBzaG93Tm90aWZpY2F0aW9uKFwiVGhlbWUgcmVzZXQgdG8gR3JleVwiKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBzaG93Tm90aWZpY2F0aW9uKFwiRGVsZXRlZDogXCIgKyBjdXJyZW50VGhlbWUpO1xuICAgICAgICB9XG4gICAgICAgIHJlbmRlckN1c3RvbVRoZW1lTGlzdCgpO1xuICAgICAgfTtcbiAgICAgIGN1c3RvbVRoZW1lTGlzdEVsZW1lbnQuYXBwZW5kQ2hpbGQodGhlbWVDb250YWluZXIpO1xuICAgIH0pO1xuICB9O1xuICByZW5kZXJDdXN0b21UaGVtZUxpc3QoKTtcbiAgc2V0dGluZ3NQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3NhdmVDdXN0b21UaGVtZVwiKS5vbmNsaWNrID0gKCkgPT4ge1xuICAgIGNvbnN0IHRoZW1lTmFtZUlucHV0ID0gc2V0dGluZ3NQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2N1c3RvbVRoZW1lTmFtZVwiKS52YWx1ZS50cmltKCk7XG4gICAgaWYgKCF0aGVtZU5hbWVJbnB1dCkge1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihcIkVudGVyIGEgdGhlbWUgbmFtZVwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgYXZhaWxhYmxlVGhlbWVzID0gW1wiZ3JleVwiLCBcImJsdWVcIiwgXCJyZWRcIiwgXCJncmVlblwiLCBcInBpbmtcIiwgXCJzdGFyd2Fyc1wiLCBcImtmY1wiLCBcImhhbGxvd2VlblwiXTtcbiAgICBpZiAoYXZhaWxhYmxlVGhlbWVzLmluY2x1ZGVzKHRoZW1lTmFtZUlucHV0LnRvTG93ZXJDYXNlKCkpKSB7XG4gICAgICBzaG93Tm90aWZpY2F0aW9uKFwiQ2Fubm90IHVzZSBidWlsdC1pbiB0aGVtZSBuYW1lXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBhY2NvdW50VmFsdWUgPSBzZXR0aW5nc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjY3RBY2NcIikudmFsdWU7XG4gICAgY29uc3QgYmFja2dyb3VuZENvbG9yID0gc2V0dGluZ3NQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2N0QmdcIikudmFsdWU7XG4gICAgY29uc3QgcGFuZWxDb2xvciA9IHNldHRpbmdzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNjdFBhbmVsXCIpLnZhbHVlO1xuICAgIGNvbnN0IHJlZENoYW5uZWwgPSBwYXJzZUludChhY2NvdW50VmFsdWUuc2xpY2UoMSwgMyksIDE2KTtcbiAgICBjb25zdCBncmVlbkNoYW5uZWwgPSBwYXJzZUludChhY2NvdW50VmFsdWUuc2xpY2UoMywgNSksIDE2KTtcbiAgICBjb25zdCBibHVlQ2hhbm5lbCA9IHBhcnNlSW50KGFjY291bnRWYWx1ZS5zbGljZSg1LCA3KSwgMTYpO1xuICAgIGNvbnN0IGFkanVzdEhleENvbG9yID0gaGV4Q29sb3JDb2RlID0+IHtcbiAgICAgIGNvbnN0IHJlZENoYW5uZWwgPSBwYXJzZUludChoZXhDb2xvckNvZGUuc2xpY2UoMSwgMyksIDE2KSArIDEwO1xuICAgICAgY29uc3QgZ3JlZW5DaGFubmVsID0gcGFyc2VJbnQoaGV4Q29sb3JDb2RlLnNsaWNlKDMsIDUpLCAxNikgKyAxMDtcbiAgICAgIGNvbnN0IGJsdWVDaGFubmVsID0gcGFyc2VJbnQoaGV4Q29sb3JDb2RlLnNsaWNlKDUsIDcpLCAxNikgKyAxMDtcbiAgICAgIHJldHVybiBcIiNcIiArIFtyZWRDaGFubmVsLCBncmVlbkNoYW5uZWwsIGJsdWVDaGFubmVsXS5tYXAoY29sb3JDaGFubmVsVmFsdWUgPT4gTWF0aC5taW4oMjU1LCBjb2xvckNoYW5uZWxWYWx1ZSkudG9TdHJpbmcoMTYpLnBhZFN0YXJ0KDIsIFwiMFwiKSkuam9pbihcIlwiKTtcbiAgICB9O1xuICAgIGNvbnN0IHRoZW1lQ29uZmlnID0ge1xuICAgICAgYWNjOiBhY2NvdW50VmFsdWUsXG4gICAgICBhY2NIOiBhZGp1c3RIZXhDb2xvcihhY2NvdW50VmFsdWUpLFxuICAgICAgYWNjUkdCOiByZWRDaGFubmVsICsgXCIsXCIgKyBncmVlbkNoYW5uZWwgKyBcIixcIiArIGJsdWVDaGFubmVsLFxuICAgICAgdGV4dDogXCIjZTBlMGUwXCIsXG4gICAgICB0ZXh0U2VjOiBcIiM4ODhcIixcbiAgICAgIGJnMTogYmFja2dyb3VuZENvbG9yLFxuICAgICAgYmcyOiBwYW5lbENvbG9yLFxuICAgICAgYmczOiBhZGp1c3RIZXhDb2xvcihwYW5lbENvbG9yKSxcbiAgICAgIGJvcmRlcjogXCIjMzMzXCIsXG4gICAgICBob3ZlcjogYWRqdXN0SGV4Q29sb3IocGFuZWxDb2xvcilcbiAgICB9O1xuICAgIGNvbnN0IGN1c3RvbVRoZW1lcyA9IEpTT04ucGFyc2UobG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJjdXN0b21UaGVtZXNcIikgfHwgXCJ7fVwiKTtcbiAgICBjdXN0b21UaGVtZXNbdGhlbWVOYW1lSW5wdXRdID0gdGhlbWVDb25maWc7XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJjdXN0b21UaGVtZXNcIiwgSlNPTi5zdHJpbmdpZnkoY3VzdG9tVGhlbWVzKSk7XG4gICAgYXBwbHlUaGVtZSh0aGVtZU5hbWVJbnB1dCk7XG4gICAgc2V0dGluZ3NQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2N1c3RvbVRoZW1lTmFtZVwiKS52YWx1ZSA9IFwiXCI7XG4gICAgcmVuZGVyQ3VzdG9tVGhlbWVMaXN0KCk7XG4gICAgc2hvd05vdGlmaWNhdGlvbihcIlRoZW1lIHNhdmVkOiBcIiArIHRoZW1lTmFtZUlucHV0KTtcbiAgfTtcbiAgY29uc3QgY3VzdG9tVGhlbWVUb2dnbGVCdG4gPSBzZXR0aW5nc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjY3VzdG9tVGhlbWVUb2dnbGVCdG5cIik7XG4gIGNvbnN0IGN1c3RvbVRoZW1lU2VjdGlvbiA9IHNldHRpbmdzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNjdXN0b21UaGVtZVNlY3Rpb25cIik7XG4gIGNvbnN0IGN1c3RvbVRoZW1lQXJyb3cgPSBzZXR0aW5nc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjY3VzdG9tVGhlbWVBcnJvd1wiKTtcbiAgbGV0IGlzQ3VzdG9tVGhlbWVTZWN0aW9uRXhwYW5kZWQgPSBmYWxzZTtcbiAgY3VzdG9tVGhlbWVUb2dnbGVCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICBpc0N1c3RvbVRoZW1lU2VjdGlvbkV4cGFuZGVkID0gIWlzQ3VzdG9tVGhlbWVTZWN0aW9uRXhwYW5kZWQ7XG4gICAgY3VzdG9tVGhlbWVTZWN0aW9uLnN0eWxlLmRpc3BsYXkgPSBpc0N1c3RvbVRoZW1lU2VjdGlvbkV4cGFuZGVkID8gXCJibG9ja1wiIDogXCJub25lXCI7XG4gICAgY3VzdG9tVGhlbWVBcnJvdy50ZXh0Q29udGVudCA9IGlzQ3VzdG9tVGhlbWVTZWN0aW9uRXhwYW5kZWQgPyBcIuKWslwiIDogXCLilrxcIjtcbiAgfTtcbiAgY29uc3QgbXlUaGVtZXNUb2dnbGVCdG4gPSBzZXR0aW5nc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbXlUaGVtZXNUb2dnbGVCdG5cIik7XG4gIGNvbnN0IG15VGhlbWVzU2VjdGlvbiA9IHNldHRpbmdzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNteVRoZW1lc1NlY3Rpb25cIik7XG4gIGNvbnN0IG15VGhlbWVzQXJyb3cgPSBzZXR0aW5nc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbXlUaGVtZXNBcnJvd1wiKTtcbiAgbGV0IGlzVGhlbWVzRXhwYW5kZWQgPSBmYWxzZTtcbiAgbXlUaGVtZXNUb2dnbGVCdG4ub25jbGljayA9ICgpID0+IHtcbiAgICBpc1RoZW1lc0V4cGFuZGVkID0gIWlzVGhlbWVzRXhwYW5kZWQ7XG4gICAgbXlUaGVtZXNTZWN0aW9uLnN0eWxlLmRpc3BsYXkgPSBpc1RoZW1lc0V4cGFuZGVkID8gXCJibG9ja1wiIDogXCJub25lXCI7XG4gICAgbXlUaGVtZXNBcnJvdy50ZXh0Q29udGVudCA9IGlzVGhlbWVzRXhwYW5kZWQgPyBcIuKWslwiIDogXCLilrxcIjtcbiAgICBpZiAoaXNUaGVtZXNFeHBhbmRlZCkge1xuICAgICAgcmVuZGVyQ3VzdG9tVGhlbWVMaXN0KCk7XG4gICAgfVxuICB9O1xuICBtYWtlRWxlbWVudERyYWdnYWJsZShzZXR0aW5nc1BhbmVsKTtcbiAgcmV0dXJuIHNldHRpbmdzUGFuZWw7XG59XG5mdW5jdGlvbiBjcmVhdGVNdXNpY1BhbmVsKCkge1xuICBjb25zdCBtdXNpY1BhbmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgbXVzaWNQYW5lbC5pZCA9IFwibXVzaWMtcGFuZWxcIjtcbiAgbXVzaWNQYW5lbC5jbGFzc05hbWUgPSBcImFzdC1wYW5lbFwiO1xuICBtdXNpY1BhbmVsLnN0eWxlLmNzc1RleHQgPSBcImJvdHRvbToyMHB4O2xlZnQ6NTEwcHg7d2lkdGg6MjQwcHg7XCI7XG4gIG11c2ljUGFuZWwuaW5uZXJIVE1MID0gXCJcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJhc3QtaGVhZGVyXFxcIj48c3BhbiBjbGFzcz1cXFwiYXN0LWhlYWRlci10aXRsZVxcXCI+TXVzaWMgUGxheWVyPC9zcGFuPjxidXR0b24gY2xhc3M9XFxcImFzdC1oZWFkZXItbWluXFxcIiBpZD1cXFwibXVzaWNNaW5cXFwiPuKIkjwvYnV0dG9uPjwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1ib2R5XFxcIiBpZD1cXFwibXVzaWNCb2R5XFxcIj5cXG4gICAgICAgIDxkaXYgaWQ9XFxcIm11c2ljVHJhY2tOYW1lXFxcIiBzdHlsZT1cXFwiZm9udC1zaXplOjExcHg7Y29sb3I6dmFyKC0tYWNjLCM4ODgpO3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6NHB4IDJweCA4cHggMnB4O2ZvbnQtd2VpZ2h0OjYwMDt3aGl0ZS1zcGFjZTpub3dyYXA7b3ZlcmZsb3c6aGlkZGVuO3RleHQtb3ZlcmZsb3c6ZWxsaXBzaXM7XFxcIj5ObyB0cmFja3M8L2Rpdj5cXG5cXG4gICAgICAgIDxkaXYgc3R5bGU9XFxcImRpc3BsYXk6ZmxleDtnYXA6NHB4O2p1c3RpZnktY29udGVudDpjZW50ZXI7bWFyZ2luLWJvdHRvbTo4cHg7ZmxleC13cmFwOndyYXA7XFxcIj5cXG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgaWQ9XFxcIm11c2ljUHJldkJ0blxcXCIgc3R5bGU9XFxcIndpZHRoOjQ4cHg7bWFyZ2luOjA7dGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzo2cHggNHB4O1xcXCI+UHJldjwvYnV0dG9uPlxcbiAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuXFxcIiBpZD1cXFwibXVzaWNQbGF5QnRuXFxcIiBzdHlsZT1cXFwid2lkdGg6NDhweDttYXJnaW46MDt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjZweCA0cHg7XFxcIj5QbGF5PC9idXR0b24+XFxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG5cXFwiIGlkPVxcXCJtdXNpY1N0b3BCdG5cXFwiIHN0eWxlPVxcXCJ3aWR0aDo0OHB4O21hcmdpbjowO3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6NnB4IDRweDtcXFwiPlN0b3A8L2J1dHRvbj5cXG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgaWQ9XFxcIm11c2ljTmV4dEJ0blxcXCIgc3R5bGU9XFxcIndpZHRoOjQ4cHg7bWFyZ2luOjA7dGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzo2cHggNHB4O1xcXCI+TmV4dDwvYnV0dG9uPlxcbiAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICA8ZGl2IHN0eWxlPVxcXCJkaXNwbGF5OmZsZXg7Z2FwOjRweDtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO21hcmdpbi1ib3R0b206OHB4O1xcXCI+XFxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG5cXFwiIGlkPVxcXCJtdXNpY0xvb3BCdG5cXFwiIHN0eWxlPVxcXCJ3aWR0aDo3MHB4O21hcmdpbjowO3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6NnB4IDRweDtcXFwiPkxvb3A8L2J1dHRvbj5cXG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgaWQ9XFxcIm11c2ljU2h1ZmZsZUJ0blxcXCIgc3R5bGU9XFxcIndpZHRoOjcwcHg7bWFyZ2luOjA7dGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzo2cHggNHB4O1xcXCI+U2h1ZmZsZTwvYnV0dG9uPlxcbiAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qta2V5LXJvd1xcXCIgc3R5bGU9XFxcIm1hcmdpbi1ib3R0b206NnB4O1xcXCI+XFxuICAgICAgICAgIDxzcGFuPlZvbHVtZTwvc3Bhbj5cXG4gICAgICAgICAgPGlucHV0IHR5cGU9XFxcInJhbmdlXFxcIiBpZD1cXFwibXVzaWNWb2x1bWVcXFwiIG1pbj1cXFwiMFxcXCIgbWF4PVxcXCIxXFxcIiBzdGVwPVxcXCIwLjA1XFxcIiB2YWx1ZT1cXFwiMC41XFxcIiBzdHlsZT1cXFwid2lkdGg6MTIwcHg7YWNjZW50LWNvbG9yOnZhcigtLWFjYywjODg4KTtcXFwiPlxcbiAgICAgICAgPC9kaXY+XFxuXFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qtc2VwXFxcIj48L2Rpdj5cXG4gICAgICAgIDxzcGFuIGNsYXNzPVxcXCJhc3Qtc2VjdGlvbi1sYWJlbFxcXCI+QWRkIFRyYWNrPC9zcGFuPlxcbiAgICAgICAgPGlucHV0IGNsYXNzPVxcXCJhc3QtaW5wdXRcXFwiIHR5cGU9XFxcInRleHRcXFwiIGlkPVxcXCJtdXNpY1VybElucHV0XFxcIiBwbGFjZWhvbGRlcj1cXFwiQXVkaW8gb3IgWW91VHViZSBVUkwuLi5cXFwiIHN0eWxlPVxcXCJ3aWR0aDoxMDAlO2JveC1zaXppbmc6Ym9yZGVyLWJveDttYXJnaW4tYm90dG9tOjRweDtcXFwiPlxcbiAgICAgICAgPGlucHV0IGNsYXNzPVxcXCJhc3QtaW5wdXRcXFwiIHR5cGU9XFxcInRleHRcXFwiIGlkPVxcXCJtdXNpY05hbWVJbnB1dFxcXCIgcGxhY2Vob2xkZXI9XFxcIlRyYWNrIG5hbWUgKG9wdGlvbmFsKVxcXCIgc3R5bGU9XFxcIndpZHRoOjEwMCU7Ym94LXNpemluZzpib3JkZXItYm94O21hcmdpbi1ib3R0b206NHB4O1xcXCI+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuXFxcIiBpZD1cXFwibXVzaWNBZGRCdG5cXFwiPkFkZCBUcmFjazwvYnV0dG9uPlxcblxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LXNlcFxcXCI+PC9kaXY+XFxuICAgICAgICA8c3BhbiBjbGFzcz1cXFwiYXN0LXNlY3Rpb24tbGFiZWxcXFwiPlBsYXlsaXN0PC9zcGFuPlxcbiAgICAgICAgPGRpdiBpZD1cXFwibXVzaWNUcmFja0xpc3RcXFwiIHN0eWxlPVxcXCJtYXgtaGVpZ2h0OjE1MHB4O292ZXJmbG93LXk6YXV0bztcXFwiPjwvZGl2PlxcbiAgICAgIDwvZGl2PlwiO1xuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG11c2ljUGFuZWwpO1xuICBjb25zdCBtdXNpY0JvZHlFbGVtZW50ID0gbXVzaWNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI211c2ljQm9keVwiKTtcbiAgbGV0IGlzTXVzaWNIaWRkZW4gPSBmYWxzZTtcbiAgbXVzaWNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI211c2ljTWluXCIpLm9uY2xpY2sgPSBldmVudCA9PiB7XG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgaXNNdXNpY0hpZGRlbiA9ICFpc011c2ljSGlkZGVuO1xuICAgIG11c2ljQm9keUVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IGlzTXVzaWNIaWRkZW4gPyBcIm5vbmVcIiA6IFwiYmxvY2tcIjtcbiAgICBtdXNpY1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbXVzaWNNaW5cIikudGV4dENvbnRlbnQgPSBpc011c2ljSGlkZGVuID8gXCIrXCIgOiBcIuKIklwiO1xuICB9O1xuICBtdXNpY1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbXVzaWNQcmV2QnRuXCIpLm9uY2xpY2sgPSAoKSA9PiBwbGF5UHJldmlvdXMoKTtcbiAgbXVzaWNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI211c2ljU3RvcEJ0blwiKS5vbmNsaWNrID0gKCkgPT4gcmVzZXRQbGF5YmFjaygpO1xuICBtdXNpY1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbXVzaWNOZXh0QnRuXCIpLm9uY2xpY2sgPSAoKSA9PiBwbGF5TmV4dE9yUmFuZG9tKCk7XG4gIGNvbnN0IG11c2ljUGxheUJ1dHRvbiA9IG11c2ljUGFuZWwucXVlcnlTZWxlY3RvcihcIiNtdXNpY1BsYXlCdG5cIik7XG4gIG11c2ljUGxheUJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xuICAgIGlmICghbXVzaWNQbGF5bGlzdC5sZW5ndGgpIHtcbiAgICAgIHNob3dOb3RpZmljYXRpb24oXCJBZGQgYSB0cmFjayBmaXJzdFwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGlzUGxheWluZygpKSB7XG4gICAgICBwYXVzZVBsYXliYWNrKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VtZVBsYXliYWNrKCk7XG4gICAgfVxuICB9O1xuICBjb25zdCBtdXNpY0xvb3BCdXR0b24gPSBtdXNpY1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbXVzaWNMb29wQnRuXCIpO1xuICBtdXNpY0xvb3BCdXR0b24uY2xhc3NMaXN0LnRvZ2dsZShcInRvZ2dsZS1vblwiLCB1aWF1ZGlvU3RhdGUuaXNNdXNpY0xvb3BFbmFibGVkKTtcbiAgbXVzaWNMb29wQnV0dG9uLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgdWlhdWRpb1N0YXRlLmlzTXVzaWNMb29wRW5hYmxlZCA9ICF1aWF1ZGlvU3RhdGUuaXNNdXNpY0xvb3BFbmFibGVkO1xuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwibXVzaWNMb29wXCIsIHVpYXVkaW9TdGF0ZS5pc011c2ljTG9vcEVuYWJsZWQpO1xuICAgIG11c2ljTG9vcEJ1dHRvbi5jbGFzc0xpc3QudG9nZ2xlKFwidG9nZ2xlLW9uXCIsIHVpYXVkaW9TdGF0ZS5pc011c2ljTG9vcEVuYWJsZWQpO1xuICAgIHNob3dOb3RpZmljYXRpb24odWlhdWRpb1N0YXRlLmlzTXVzaWNMb29wRW5hYmxlZCA/IFwiTG9vcCBPTlwiIDogXCJMb29wIE9GRlwiKTtcbiAgfTtcbiAgY29uc3QgbXVzaWNTaHVmZmxlQnV0dG9uID0gbXVzaWNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI211c2ljU2h1ZmZsZUJ0blwiKTtcbiAgbXVzaWNTaHVmZmxlQnV0dG9uLmNsYXNzTGlzdC50b2dnbGUoXCJ0b2dnbGUtb25cIiwgdWlhdWRpb1N0YXRlLmlzTXVzaWNTaHVmZmxlRW5hYmxlZCk7XG4gIG11c2ljU2h1ZmZsZUJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xuICAgIHVpYXVkaW9TdGF0ZS5pc011c2ljU2h1ZmZsZUVuYWJsZWQgPSAhdWlhdWRpb1N0YXRlLmlzTXVzaWNTaHVmZmxlRW5hYmxlZDtcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcIm11c2ljU2h1ZmZsZVwiLCB1aWF1ZGlvU3RhdGUuaXNNdXNpY1NodWZmbGVFbmFibGVkKTtcbiAgICBtdXNpY1NodWZmbGVCdXR0b24uY2xhc3NMaXN0LnRvZ2dsZShcInRvZ2dsZS1vblwiLCB1aWF1ZGlvU3RhdGUuaXNNdXNpY1NodWZmbGVFbmFibGVkKTtcbiAgICBzaG93Tm90aWZpY2F0aW9uKHVpYXVkaW9TdGF0ZS5pc011c2ljU2h1ZmZsZUVuYWJsZWQgPyBcIlNodWZmbGUgT05cIiA6IFwiU2h1ZmZsZSBPRkZcIik7XG4gIH07XG4gIGNvbnN0IG11c2ljVm9sdW1lQ29udHJvbCA9IG11c2ljUGFuZWwucXVlcnlTZWxlY3RvcihcIiNtdXNpY1ZvbHVtZVwiKTtcbiAgbXVzaWNWb2x1bWVDb250cm9sLnZhbHVlID0gdWlhdWRpb1N0YXRlLm11c2ljVm9sdW1lO1xuICBtdXNpY1ZvbHVtZUNvbnRyb2wub25pbnB1dCA9IHZvbHVtZUNoYW5nZUV2ZW50ID0+IHtcbiAgICB1aWF1ZGlvU3RhdGUubXVzaWNWb2x1bWUgPSBwYXJzZUZsb2F0KHZvbHVtZUNoYW5nZUV2ZW50LnRhcmdldC52YWx1ZSk7XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJtdXNpY1ZvbHVtZVwiLCB1aWF1ZGlvU3RhdGUubXVzaWNWb2x1bWUpO1xuICAgIGlmIChhdWRpb1BsYXllcikge1xuICAgICAgYXVkaW9QbGF5ZXIudm9sdW1lID0gdWlhdWRpb1N0YXRlLm11c2ljVm9sdW1lO1xuICAgIH1cbiAgICBpZiAoeW91dHViZVBsYXllcikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgeW91dHViZVBsYXllci5zZXRWb2x1bWUoTWF0aC5yb3VuZCh1aWF1ZGlvU3RhdGUubXVzaWNWb2x1bWUgKiAxMDApKTtcbiAgICAgIH0gY2F0Y2ggKHVudXNlZFZhcmlhYmxlKSB7fVxuICAgIH1cbiAgfTtcbiAgbXVzaWNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI211c2ljQWRkQnRuXCIpLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgY29uc3QgbXVzaWNVcmwgPSBtdXNpY1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbXVzaWNVcmxJbnB1dFwiKS52YWx1ZS50cmltKCk7XG4gICAgY29uc3QgbXVzaWNOYW1lID0gbXVzaWNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI211c2ljTmFtZUlucHV0XCIpLnZhbHVlLnRyaW0oKTtcbiAgICBpZiAoIW11c2ljVXJsKSB7XG4gICAgICBzaG93Tm90aWZpY2F0aW9uKFwiRW50ZXIgYSBVUkxcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIG11c2ljUGFuZWwucXVlcnlTZWxlY3RvcihcIiNtdXNpY1VybElucHV0XCIpLnZhbHVlID0gXCJcIjtcbiAgICBtdXNpY1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbXVzaWNOYW1lSW5wdXRcIikudmFsdWUgPSBcIlwiO1xuICAgIGFkZFRyYWNrVG9QbGF5bGlzdChtdXNpY1VybCwgbXVzaWNOYW1lKTtcbiAgfTtcbiAgdXBkYXRlTXVzaWNQYW5lbCgpO1xuICBtYWtlRWxlbWVudERyYWdnYWJsZShtdXNpY1BhbmVsKTtcbiAgcmV0dXJuIG11c2ljUGFuZWw7XG59XG5mdW5jdGlvbiBjcmVhdGVVcGRhdGVIaXN0b3J5UGFuZWwoKSB7XG4gIGNvbnN0IHVwZGF0ZVBhbmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgdXBkYXRlUGFuZWwuaWQgPSBcInVwZGF0ZS1oaXN0b3J5XCI7XG4gIHVwZGF0ZVBhbmVsLmNsYXNzTmFtZSA9IFwiYXN0LXBhbmVsXCI7XG4gIHVwZGF0ZVBhbmVsLnN0eWxlLmNzc1RleHQgPSBcImJvdHRvbToyMHB4O2xlZnQ6MjBweDt3aWR0aDoyMzBweDttYXgtaGVpZ2h0OjI4MHB4O1wiO1xuICB1cGRhdGVQYW5lbC5pbm5lckhUTUwgPSBcIlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1oZWFkZXJcXFwiPjxzcGFuIGNsYXNzPVxcXCJhc3QtaGVhZGVyLXRpdGxlXFxcIj5VcGRhdGVzPC9zcGFuPjxidXR0b24gY2xhc3M9XFxcImFzdC1oZWFkZXItbWluXFxcIiBpZD1cXFwidXBkYXRlTWluXFxcIj7iiJI8L2J1dHRvbj48L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJhc3QtYm9keVxcXCIgaWQ9XFxcInVwZGF0ZUJvZHlcXFwiIHN0eWxlPVxcXCJvdmVyZmxvdy15OmF1dG87bWF4LWhlaWdodDoyMjBweDtcXFwiPlxcbiAgICAgICAgPHVsIGNsYXNzPVxcXCJhc3QtdXBkYXRlLWxpc3RcXFwiPlxcbiAgICAgICAgPGxpPjxzdHJvbmc+djEuOTwvc3Ryb25nPiDigJQgRml4ZWQgRVNQIG5vdCBmdWxseSB3b3JraW5nLCBhZGRlZCBtdXNpYyBwbGF5ZXIsIGFuZCBhZGRlZCBhdXRvLW5hbWUgKHNhdmVzIGxvY2FsbHkpLjwvbGk+XFxuICAgICAgICAgPGxpPjxzdHJvbmc+djEuODwvc3Ryb25nPiDigJQgRml4ZWQgQXN0cmEtVmlzaW9uIChTaGFkb3dzIG5vdCBiZWluZyBSZW1vdmVkKSwgYWRkZWQgQ3VzdG9tIFRoZW1lcyBGZWF0dXJlLCBmaXhlZCBlbmFibGUvZGlzYWJsZSBmb3Igc2xpZGVycywgZml4ZWQgRVNQIG5vdCB3b3JraW5nIHByb3Blcmx5L2dsdGljaGVkLjwvbGk+XFxuICAgICAgICAgIDxsaT48c3Ryb25nPnYxLjc8L3N0cm9uZz4g4oCUIE5ldyBGZWF0dXJlcyBhbmQgT3JnYW5pemF0aW9uLjwvbGk+XFxuICAgICAgICA8L3VsPlxcbiAgICAgIDwvZGl2PlwiO1xuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHVwZGF0ZVBhbmVsKTtcbiAgY29uc3QgdXBkYXRlQm9keSA9IHVwZGF0ZVBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjdXBkYXRlQm9keVwiKTtcbiAgbGV0IGlzTWluaW1pemVkID0gZmFsc2U7XG4gIHVwZGF0ZVBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjdXBkYXRlTWluXCIpLm9uY2xpY2sgPSBldmVudCA9PiB7XG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgaXNNaW5pbWl6ZWQgPSAhaXNNaW5pbWl6ZWQ7XG4gICAgdXBkYXRlQm9keS5zdHlsZS5kaXNwbGF5ID0gaXNNaW5pbWl6ZWQgPyBcIm5vbmVcIiA6IFwiYmxvY2tcIjtcbiAgICB1cGRhdGVQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3VwZGF0ZU1pblwiKS50ZXh0Q29udGVudCA9IGlzTWluaW1pemVkID8gXCIrXCIgOiBcIuKIklwiO1xuICB9O1xuICBtYWtlRWxlbWVudERyYWdnYWJsZSh1cGRhdGVQYW5lbCk7XG4gIHJldHVybiB1cGRhdGVQYW5lbDtcbn1cbmxldCBwcmVzc2VkS2V5ID0gXCJTaGlmdFwiO1xuZnVuY3Rpb24gdG9nZ2xlUGFuZWxzVmlzaWJpbGl0eSgpIHtcbiAgY29uc3QgcGFuZWxJZHMgPSBbXCJkZWVwLXRvb2xzLXBhbmVsXCIsIFwidmlzaW9uLXBhbmVsXCIsIFwiY29tYmF0LXBhbmVsXCIsIFwiYXV0b21hdGlvbi1wYW5lbFwiLCBcInVwZGF0ZS1oaXN0b3J5XCIsIFwic2V0dGluZ3MtcGFuZWxcIiwgXCJtdXNpYy1wYW5lbFwiXTtcbiAgY29uc3QgZGVlcFRvb2xzUGFuZWxFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJkZWVwLXRvb2xzLXBhbmVsXCIpO1xuICBpZiAoIWRlZXBUb29sc1BhbmVsRWxlbWVudCkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBpc1BhbmVsVmlzaWJsZSA9IGRlZXBUb29sc1BhbmVsRWxlbWVudC5zdHlsZS5kaXNwbGF5ICE9PSBcIm5vbmVcIjtcbiAgcGFuZWxJZHMuZm9yRWFjaChlbGVtZW50SWQgPT4ge1xuICAgIGNvbnN0IHRhcmdldEVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChlbGVtZW50SWQpO1xuICAgIGlmICh0YXJnZXRFbGVtZW50KSB7XG4gICAgICB0YXJnZXRFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBpc1BhbmVsVmlzaWJsZSA/IFwibm9uZVwiIDogXCJibG9ja1wiO1xuICAgIH1cbiAgfSk7XG59XG5cbmV4cG9ydCB7IGNyZWF0ZVRvb2xzUGFuZWwsIGNyZWF0ZVZpc2lvblBhbmVsLCBjcmVhdGVDb21iYXRQYW5lbCwgY3JlYXRlQXV0b21hdGlvblBhbmVsLCBjcmVhdGVTZXR0aW5nc1BhbmVsLCBjcmVhdGVNdXNpY1BhbmVsLCBjcmVhdGVVcGRhdGVIaXN0b3J5UGFuZWwgfTtcbiIsImltcG9ydCB7IHNob3dOb3RpZmljYXRpb24gfSBmcm9tICcuLi91aS9pbnRlcmFjdGlvbi5qcyc7XG5cbmxldCBpc1ZpZGVvUGxheWluZyA9IGZhbHNlO1xuZnVuY3Rpb24gaW5pdEFkQmxvY2tlcigpIHtcbiAgaWYgKGlzVmlkZW9QbGF5aW5nKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlzVmlkZW9QbGF5aW5nID0gdHJ1ZTtcbiAgY29uc3QgYWRTZWxlY3RvcnMgPSBbXCJkaXYuYWQtYmxvY2tcIiwgXCJhW2hyZWYqPVxcXCJhZFxcXCJdXCIsIFwiaWZyYW1lW3NyYyo9XFxcImFkc1xcXCJdLCBpZnJhbWVbc3JjKj1cXFwiZ29vZ2xlYWRcXFwiXVwiLCBcIi5hZHZlcnRpc2VtZW50XCIsIFwiW2NsYXNzKj1cXFwiYWRzXFxcIl0sIFtjbGFzcyo9XFxcImFkLVxcXCJdXCIsIFwiW2lkKj1cXFwiYWRcXFwiXSwgW2lkKj1cXFwiYmFubmVyXFxcIl1cIiwgXCIuc2lkZWJhci5sZWZ0ID4gYVwiLCBcIi5zaWRlYmFyLmxlZnQgPiBkaXY6bm90KC5zaWRlYmFyLWNvbnRlbnQpXCIsIFwiZGl2LnNpZGViYXIubGVmdCA+IGRpdjpoYXMoPiBpZnJhbWUpXCIsIFwiZGl2LnNpZGViYXIubGVmdCA+IGRpdjpoYXMoPiBhW2hyZWYqPVxcXCJkb3VibGVjbGlja1xcXCJdKVwiXTtcbiAgY29uc3QgcmVtb3ZlQWRzID0gKCkgPT4ge1xuICAgIGFkU2VsZWN0b3JzLmZvckVhY2goZWxlbWVudFNlbGVjdG9yID0+IHtcbiAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoZWxlbWVudFNlbGVjdG9yKS5mb3JFYWNoKHRhcmdldEVsZW1lbnQgPT4ge1xuICAgICAgICB0YXJnZXRFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIjtcbiAgICAgICAgdGFyZ2V0RWxlbWVudC5zdHlsZS5vcGFjaXR5ID0gXCIwXCI7XG4gICAgICAgIHRhcmdldEVsZW1lbnQuc3R5bGUucG9pbnRlckV2ZW50cyA9IFwibm9uZVwiO1xuICAgICAgICB0YXJnZXRFbGVtZW50LnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xuICAgICAgICB0YXJnZXRFbGVtZW50LnJlbW92ZUF0dHJpYnV0ZShcInNyY1wiKTtcbiAgICAgICAgdGFyZ2V0RWxlbWVudC5yZW1vdmUoKTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICAgIGNvbnN0IGxlZnRTaWRlYmFyRWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJkaXYuc2lkZWJhci5sZWZ0XCIpO1xuICAgIGlmIChsZWZ0U2lkZWJhckVsZW1lbnQpIHtcbiAgICAgIGxlZnRTaWRlYmFyRWxlbWVudC5zdHlsZS5tYXhXaWR0aCA9IFwiMzB2d1wiO1xuICAgICAgbGVmdFNpZGViYXJFbGVtZW50LnN0eWxlLndpZHRoID0gXCIyMXJlbVwiO1xuICAgICAgbGVmdFNpZGViYXJFbGVtZW50LnN0eWxlLm92ZXJmbG93ID0gXCJoaWRkZW5cIjtcbiAgICB9XG4gIH07XG4gIHJlbW92ZUFkcygpO1xuICBuZXcgTXV0YXRpb25PYnNlcnZlcihyZW1vdmVBZHMpLm9ic2VydmUoZG9jdW1lbnQuYm9keSwge1xuICAgIGNoaWxkTGlzdDogdHJ1ZSxcbiAgICBzdWJ0cmVlOiB0cnVlLFxuICAgIGF0dHJpYnV0ZXM6IHRydWVcbiAgfSk7XG4gIHNldEludGVydmFsKHJlbW92ZUFkcywgNTAwMCk7XG4gIHNob3dOb3RpZmljYXRpb24oXCJBZCBibG9ja2VyIGFjdGl2ZVwiKTtcbn1cblxuZXhwb3J0IHsgaW5pdEFkQmxvY2tlciB9O1xuIiwiaW1wb3J0IHsgZ2V0R2FtZVN0YXRlIH0gZnJvbSAnLi9mZWF0dXJlcy9hdXRvZmFybS5qcyc7XG5pbXBvcnQgeyBhcHBseVRoZW1lLCBpbml0QmFja2dyb3VuZEltYWdlLCBpbmplY3RTdHlsZXMgfSBmcm9tICcuL3VpL3RoZW1lLmpzJztcbmltcG9ydCB7IGNyZWF0ZVRvb2xzUGFuZWwsIGNyZWF0ZVZpc2lvblBhbmVsLCBjcmVhdGVDb21iYXRQYW5lbCwgY3JlYXRlQXV0b21hdGlvblBhbmVsLCBjcmVhdGVTZXR0aW5nc1BhbmVsLCBjcmVhdGVNdXNpY1BhbmVsLCBjcmVhdGVVcGRhdGVIaXN0b3J5UGFuZWwgfSBmcm9tICcuL3VpL3BhbmVscy5qcyc7XG5pbXBvcnQgeyBpbml0QWRCbG9ja2VyIH0gZnJvbSAnLi9mZWF0dXJlcy9hZGJsb2NrLmpzJztcbmltcG9ydCB7IGluaXRSYWRhckRyYWcgfSBmcm9tICcuL3VpL3JhZGFyLmpzJztcbmltcG9ydCB7IGluaXRBdXRvZmlsbE5hbWUgfSBmcm9tICcuL3VpL2ludGVyYWN0aW9uLmpzJztcbmltcG9ydCB7IHJlbmRlckxvb3AsIHJlbmRlckVzcExvb3AgfSBmcm9tICcuL2ZlYXR1cmVzL2VzcC5qcyc7XG5pbXBvcnQgeyB1cGRhdGVMb2NrTG9vcCwgYXV0b0RvZGdlTG9vcCB9IGZyb20gJy4vZmVhdHVyZXMvYWltYm90LmpzJztcblxubGV0IG1ldGFkYXRhTWFwID0gbmV3IFdlYWtNYXAoKTtcbmZ1bmN0aW9uIHdyYXBXaXRoUHJveHkodGFyZ2V0T2JqZWN0LCBwcm9wZXJ0eUtleSwgaGFuZGxlcikge1xuICBjb25zdCBvcmlnaW5hbFZhbHVlID0gdGFyZ2V0T2JqZWN0W3Byb3BlcnR5S2V5XTtcbiAgY29uc3QgcHJveHlWYWx1ZSA9IG5ldyBQcm94eShvcmlnaW5hbFZhbHVlLCBoYW5kbGVyKTtcbiAgbWV0YWRhdGFNYXAuc2V0KHByb3h5VmFsdWUsIG9yaWdpbmFsVmFsdWUpO1xuICB0YXJnZXRPYmplY3RbcHJvcGVydHlLZXldID0gcHJveHlWYWx1ZTtcbn1cblxuY29uc3QgY29uZmlnU3RvcmUgPSB7fTtcbmZ1bmN0aW9uIGdldEVudGl0eU1hbmFnZXIoZ2FtZVN0YXRlKSB7XG4gIGlmICghZ2FtZVN0YXRlKSB7XG4gICAgZ2FtZVN0YXRlID0gZ2V0R2FtZVN0YXRlKCk7XG4gIH1cbiAgaWYgKCFnYW1lU3RhdGUpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpZiAod2luZG93Ll9fY2FjaGVkRU0pIHtcbiAgICByZXR1cm4gd2luZG93Ll9fY2FjaGVkRU07XG4gIH1cbiAgaWYgKGNvbmZpZ1N0b3JlLmVudGl0eU1hbmFnZXIpIHtcbiAgICBjb25zdCBlbnRpdHlNYW5hZ2VyID0gZ2FtZVN0YXRlW2NvbmZpZ1N0b3JlLmVudGl0eU1hbmFnZXJdO1xuICAgIGlmIChlbnRpdHlNYW5hZ2VyKSB7XG4gICAgICB3aW5kb3cuX19jYWNoZWRFTSA9IGVudGl0eU1hbmFnZXI7XG4gICAgICByZXR1cm4gZW50aXR5TWFuYWdlcjtcbiAgICB9XG4gIH1cbiAgZm9yIChjb25zdCBwcm9wZXJ0eUtleSBvZiBPYmplY3Qua2V5cyhnYW1lU3RhdGUpKSB7XG4gICAgY29uc3QgcHJvcGVydHlWYWx1ZSA9IGdhbWVTdGF0ZVtwcm9wZXJ0eUtleV07XG4gICAgaWYgKHByb3BlcnR5VmFsdWUgJiYgdHlwZW9mIHByb3BlcnR5VmFsdWUgPT09IFwib2JqZWN0XCIgJiYgIUFycmF5LmlzQXJyYXkocHJvcGVydHlWYWx1ZSkgJiYgKHByb3BlcnR5VmFsdWUuZW50aXRpZXNMaXN0IHx8IHByb3BlcnR5VmFsdWUuZW50aXRpZXNCeUlkKSkge1xuICAgICAgd2luZG93Ll9fY2FjaGVkRU0gPSBwcm9wZXJ0eVZhbHVlO1xuICAgICAgcmV0dXJuIHByb3BlcnR5VmFsdWU7XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuZnVuY3Rpb24gZ2V0Rmlyc3RBbmltYWwoKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgZ2FtZVN0YXRlID0gZ2V0R2FtZVN0YXRlKCk7XG4gICAgaWYgKCFnYW1lU3RhdGUpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBpZiAoZ2FtZVN0YXRlLm15QW5pbWFscyAmJiBnYW1lU3RhdGUubXlBbmltYWxzLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiBnYW1lU3RhdGUubXlBbmltYWxzWzBdO1xuICAgIH1cbiAgICBpZiAoZ2FtZVN0YXRlLm15UGlyYW5oYXMgJiYgZ2FtZVN0YXRlLm15UGlyYW5oYXMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIGdhbWVTdGF0ZS5teVBpcmFuaGFzWzBdO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuZnVuY3Rpb24gZ2V0Vmlld3BvcnRTY2FsZSgpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBzdGF0ZVdpdGhWaWV3cG9ydCA9IHdpbmRvdy5fX3NzPy5zdGF0ZXM/LmZpbmQoZ2FtZUNvbnRleHQgPT4gZ2FtZUNvbnRleHQ/LmdhbWVTY2VuZT8uZ2FtZT8udmlld3BvcnQ/LnNjYWxlPy54KTtcbiAgICBpZiAoc3RhdGVXaXRoVmlld3BvcnQpIHtcbiAgICAgIHJldHVybiBzdGF0ZVdpdGhWaWV3cG9ydC5nYW1lU2NlbmUuZ2FtZS52aWV3cG9ydC5zY2FsZS54O1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyKSB7fVxuICByZXR1cm4gMC41NTQ7XG59XG5sZXQgaXNQcm9jZXNzZWQgPSBmYWxzZTtcbmxldCBkcmFnU3RhdGUgPSB7XG4gIGRyYWdnaW5nOiBmYWxzZSxcbiAgb2Zmc2V0WDogMCxcbiAgb2Zmc2V0WTogMCxcbiAgeDogbnVsbCxcbiAgeTogMjBcbn07XG5cbmxldCBpc1RvZ2dsZWQgPSBmYWxzZTtcbmZ1bmN0aW9uIGluaXRpYWxpemVBcHBsaWNhdGlvbigpIHtcbiAgaWYgKGlzVG9nZ2xlZCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpc1RvZ2dsZWQgPSB0cnVlO1xuICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICBpbmplY3RTdHlsZXMoKTtcbiAgICBhcHBseVRoZW1lKGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwidGhlbWVcIikgfHwgXCJncmV5XCIpO1xuICAgIGNyZWF0ZVRvb2xzUGFuZWwoKTtcbiAgICBjcmVhdGVWaXNpb25QYW5lbCgpO1xuICAgIGNyZWF0ZUNvbWJhdFBhbmVsKCk7XG4gICAgY3JlYXRlQXV0b21hdGlvblBhbmVsKCk7XG4gICAgY3JlYXRlU2V0dGluZ3NQYW5lbCgpO1xuICAgIGNyZWF0ZVVwZGF0ZUhpc3RvcnlQYW5lbCgpO1xuICAgIGNyZWF0ZU11c2ljUGFuZWwoKTtcbiAgICBpbml0QmFja2dyb3VuZEltYWdlKCk7XG4gICAgaW5pdEFkQmxvY2tlcigpO1xuICAgIGluaXRSYWRhckRyYWcoKTtcbiAgICBpbml0QXV0b2ZpbGxOYW1lKCk7XG4gICAgcmVuZGVyRXNwTG9vcCgpO1xuICAgIHJlbmRlckxvb3AoKTtcbiAgICBpc1Byb2Nlc3NlZCA9IHRydWU7XG4gICAgdXBkYXRlTG9ja0xvb3AoKTtcbiAgICBzdGF0ZS5pc1RleHRJbnRlcmNlcHRvckluaXRpYWxpemVkID0gdHJ1ZTtcbiAgICBhdXRvRG9kZ2VMb29wKCk7XG4gIH0sIDEwMDApO1xufVxuXG5leHBvcnQgY29uc3Qgc3RhdGUgPSB7XG4gIGN1cnJlbnRUaW1lOiAwLFxuICBpc0xvb3Bpbmc6IGZhbHNlLFxuICBjdXJyZW50VHJhY2tJbmRleDogMCxcbiAgYW5pbWF0aW9uSW50ZXJ2YWxJZDogbnVsbCxcbiAgZ2FtZUluc3RhbmNlOiBudWxsLFxuICBhbmltYWxEYXRhOiBudWxsLFxuICBpc0FjdGl2ZTogZmFsc2UsXG4gIGlzTWluaW1hcFNtYWxsOiBmYWxzZSxcbiAgaXNUZXh0SW50ZXJjZXB0b3JJbml0aWFsaXplZDogZmFsc2Vcbn07XG5cbmV4cG9ydCB7IHdyYXBXaXRoUHJveHksIGdldEVudGl0eU1hbmFnZXIsIGdldEZpcnN0QW5pbWFsLCBnZXRWaWV3cG9ydFNjYWxlLCBpbml0aWFsaXplQXBwbGljYXRpb24sIG1ldGFkYXRhTWFwLCBjb25maWdTdG9yZSwgaXNQcm9jZXNzZWQsIGRyYWdTdGF0ZSB9O1xuIiwiaW1wb3J0IHsgZHJhZ1N0YXRlLCBzdGF0ZSB9IGZyb20gJy4uL2NvcmUuanMnO1xuXG5mdW5jdGlvbiBnZXRHYW1lQ2FudmFzKCkge1xuICByZXR1cm4gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNnYW1lQ2FudmFzXCIpIHx8IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCJjYW52YXNcIikgfHwgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIiNjYW52YXMtY29udGFpbmVyIGNhbnZhc1wiKTtcbn1cbmZ1bmN0aW9uIHVwZGF0ZUxvY2tCdXR0b25VSSgpIHtcbiAgY29uc3QgbG9ja0J1dHRvbiA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibG9ja0J0blwiKTtcbiAgaWYgKGxvY2tCdXR0b24pIHtcbiAgICBsb2NrQnV0dG9uLnRleHRDb250ZW50ID0gd2luZG93LmxvY2tFbmFibGVkICYmIHdpbmRvdy5sb2NrVGFyZ2V0SWQgPyBcIlVubG9ja1wiIDogXCJMb2NrIE5lYXJlc3RcIjtcbiAgICBsb2NrQnV0dG9uLmNsYXNzTGlzdC50b2dnbGUoXCJ0b2dnbGUtb25cIiwgISF3aW5kb3cubG9ja0VuYWJsZWQgJiYgISF3aW5kb3cubG9ja1RhcmdldElkKTtcbiAgfVxufVxuZnVuY3Rpb24gZ2V0T3JDcmVhdGVDYW52YXMoY2FudmFzSWQsIHpJbmRleCkge1xuICBsZXQgY2FudmFzRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGNhbnZhc0lkKTtcbiAgaWYgKCFjYW52YXNFbGVtZW50KSB7XG4gICAgY2FudmFzRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIik7XG4gICAgY2FudmFzRWxlbWVudC5pZCA9IGNhbnZhc0lkO1xuICAgIGNhbnZhc0VsZW1lbnQuc3R5bGUuY3NzVGV4dCA9IFwicG9zaXRpb246Zml4ZWQ7dG9wOjA7bGVmdDowO3BvaW50ZXItZXZlbnRzOm5vbmU7ei1pbmRleDpcIiArIHpJbmRleCArIFwiO1wiO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoY2FudmFzRWxlbWVudCk7XG4gIH1cbiAgY29uc3QgZ2FtZVZpZXdwb3J0ID0gZ2V0R2FtZUNhbnZhcygpO1xuICBpZiAoZ2FtZVZpZXdwb3J0KSB7XG4gICAgY29uc3QgcmVjdCA9IGdhbWVWaWV3cG9ydC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICBpZiAoY2FudmFzRWxlbWVudC53aWR0aCAhPT0gcmVjdC53aWR0aCB8fCBjYW52YXNFbGVtZW50LmhlaWdodCAhPT0gcmVjdC5oZWlnaHQpIHtcbiAgICAgIGNhbnZhc0VsZW1lbnQud2lkdGggPSByZWN0LndpZHRoO1xuICAgICAgY2FudmFzRWxlbWVudC5oZWlnaHQgPSByZWN0LmhlaWdodDtcbiAgICB9XG4gICAgY2FudmFzRWxlbWVudC5zdHlsZS5sZWZ0ID0gcmVjdC5sZWZ0ICsgXCJweFwiO1xuICAgIGNhbnZhc0VsZW1lbnQuc3R5bGUudG9wID0gcmVjdC50b3AgKyBcInB4XCI7XG4gICAgY2FudmFzRWxlbWVudC5zdHlsZS53aWR0aCA9IHJlY3Qud2lkdGggKyBcInB4XCI7XG4gICAgY2FudmFzRWxlbWVudC5zdHlsZS5oZWlnaHQgPSByZWN0LmhlaWdodCArIFwicHhcIjtcbiAgfSBlbHNlIGlmIChjYW52YXNFbGVtZW50LndpZHRoICE9PSB3aW5kb3cuaW5uZXJXaWR0aCB8fCBjYW52YXNFbGVtZW50LmhlaWdodCAhPT0gd2luZG93LmlubmVySGVpZ2h0KSB7XG4gICAgY2FudmFzRWxlbWVudC53aWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoO1xuICAgIGNhbnZhc0VsZW1lbnQuaGVpZ2h0ID0gd2luZG93LmlubmVySGVpZ2h0O1xuICB9XG4gIHJldHVybiBjYW52YXNFbGVtZW50O1xufVxuZnVuY3Rpb24gaW5pdFJhZGFyRHJhZygpIHtcbiAgaWYgKHdpbmRvdy5fcmFkYXJEcmFnSW5pdCkge1xuICAgIHJldHVybjtcbiAgfVxuICB3aW5kb3cuX3JhZGFyRHJhZ0luaXQgPSB0cnVlO1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIHVwZGF0ZVJhZGFyQm91bmRzID0+IHtcbiAgICBjb25zdCByYWRhckJvdW5kcyA9IHdpbmRvdy5fcmFkYXJCb3VuZHM7XG4gICAgaWYgKCFyYWRhckJvdW5kcyB8fCAhd2luZG93LmVzcEVuYWJsZWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHVwZGF0ZVJhZGFyQm91bmRzLmNsaWVudFggPj0gcmFkYXJCb3VuZHMueCAmJiB1cGRhdGVSYWRhckJvdW5kcy5jbGllbnRYIDw9IHJhZGFyQm91bmRzLnggKyByYWRhckJvdW5kcy53ICYmIHVwZGF0ZVJhZGFyQm91bmRzLmNsaWVudFkgPj0gcmFkYXJCb3VuZHMueSAmJiB1cGRhdGVSYWRhckJvdW5kcy5jbGllbnRZIDw9IHJhZGFyQm91bmRzLnkgKyByYWRhckJvdW5kcy5oKSB7XG4gICAgICBkcmFnU3RhdGUuZHJhZ2dpbmcgPSB0cnVlO1xuICAgICAgZHJhZ1N0YXRlLm9mZnNldFggPSB1cGRhdGVSYWRhckJvdW5kcy5jbGllbnRYIC0gcmFkYXJCb3VuZHMueDtcbiAgICAgIGRyYWdTdGF0ZS5vZmZzZXRZID0gdXBkYXRlUmFkYXJCb3VuZHMuY2xpZW50WSAtIHJhZGFyQm91bmRzLnk7XG4gICAgICB1cGRhdGVSYWRhckJvdW5kcy5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdXBkYXRlUmFkYXJCb3VuZHMuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgfVxuICB9LCB0cnVlKTtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBtb3VzZU1vdmVFdmVudCA9PiB7XG4gICAgaWYgKCFkcmFnU3RhdGUuZHJhZ2dpbmcpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhZ1N0YXRlLnggPSBtb3VzZU1vdmVFdmVudC5jbGllbnRYIC0gZHJhZ1N0YXRlLm9mZnNldFg7XG4gICAgZHJhZ1N0YXRlLnkgPSBtb3VzZU1vdmVFdmVudC5jbGllbnRZIC0gZHJhZ1N0YXRlLm9mZnNldFk7XG4gICAgbW91c2VNb3ZlRXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgfSwgdHJ1ZSk7XG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZXVwXCIsIG1vdXNlVXBFdmVudCA9PiB7XG4gICAgaWYgKGRyYWdTdGF0ZS5kcmFnZ2luZykge1xuICAgICAgZHJhZ1N0YXRlLmRyYWdnaW5nID0gZmFsc2U7XG4gICAgICBtb3VzZVVwRXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB9XG4gIH0sIHRydWUpO1xufVxuXG5leHBvcnQgeyBnZXRHYW1lQ2FudmFzLCB1cGRhdGVMb2NrQnV0dG9uVUksIGdldE9yQ3JlYXRlQ2FudmFzLCBpbml0UmFkYXJEcmFnIH07XG4iLCJpbXBvcnQgeyBnZXRHYW1lQ2FudmFzIH0gZnJvbSAnLi4vdWkvcmFkYXIuanMnO1xuaW1wb3J0IHsgc2hvd05vdGlmaWNhdGlvbiwgc2ltdWxhdGVDbGljayB9IGZyb20gJy4uL3VpL2ludGVyYWN0aW9uLmpzJztcbmltcG9ydCB7IGdldEZpcnN0QW5pbWFsLCBnZXRFbnRpdHlNYW5hZ2VyLCBzdGF0ZSB9IGZyb20gJy4uL2NvcmUuanMnO1xuaW1wb3J0IHsgZ2V0R2FtZVN0YXRlLCBmaW5kRW50aXR5QnlJZCB9IGZyb20gJy4vYXV0b2Zhcm0uanMnO1xuaW1wb3J0IHsgaXNWYWxpZEVudGl0eSB9IGZyb20gJy4uL3V0aWxzLmpzJztcblxubGV0IGN1cnJlbnRBbmdsZUluZGV4ID0gMDtcbmNvbnN0IGFuZ2xlU3RlcHMgPSBbMCwgMzAsIDYwLCA5MCwgMTIwLCAxNTAsIDE4MCwgMjEwLCAyNDAsIDI3MCwgMzAwLCAzMzBdO1xuY29uc3Qgb3JiaXRSYWRpdXMgPSAzMDA7XG5mdW5jdGlvbiBzdGFydEF1dG9Qb2ludGVyTW92ZW1lbnQoKSB7XG4gIGlmIChzdGF0ZS5hbmltYXRpb25JbnRlcnZhbElkKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGNhbnZhcyA9IGdldEdhbWVDYW52YXMoKTtcbiAgaWYgKCFjYW52YXMpIHtcbiAgICBzaG93Tm90aWZpY2F0aW9uKFwiQ2FudmFzIG5vdCBmb3VuZFwiKTtcbiAgICByZXR1cm47XG4gIH1cbiAgc3RhdGUuYW5pbWF0aW9uSW50ZXJ2YWxJZCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICBjb25zdCByYWRpdXMgPSBhbmdsZVN0ZXBzW2N1cnJlbnRBbmdsZUluZGV4XTtcbiAgICBjb25zdCBhbmdsZVJhZGlhbnMgPSBNYXRoLlBJICogMiAqIHJhZGl1cyAvIDM2MDtcbiAgICBjb25zdCBvZmZzZXRYID0gTWF0aC5yb3VuZChvcmJpdFJhZGl1cyAqIE1hdGguc2luKGFuZ2xlUmFkaWFucykpO1xuICAgIGNvbnN0IG9mZnNldFkgPSBNYXRoLnJvdW5kKG9yYml0UmFkaXVzICogTWF0aC5jb3MoYW5nbGVSYWRpYW5zKSk7XG4gICAgY2FudmFzLmRpc3BhdGNoRXZlbnQobmV3IE1vdXNlRXZlbnQoXCJwb2ludGVybW92ZVwiLCB7XG4gICAgICBjbGllbnRYOiB3aW5kb3cuaW5uZXJXaWR0aCAvIDIgKyBvZmZzZXRYLFxuICAgICAgY2xpZW50WTogd2luZG93LmlubmVySGVpZ2h0IC8gMiArIG9mZnNldFksXG4gICAgICBidWJibGVzOiB0cnVlXG4gICAgfSkpO1xuICAgIGN1cnJlbnRBbmdsZUluZGV4ID0gKGN1cnJlbnRBbmdsZUluZGV4ICsgMSkgJSBhbmdsZVN0ZXBzLmxlbmd0aDtcbiAgfSwgMTUpO1xufVxuZnVuY3Rpb24gc3RvcEF1dG9Qb2ludGVyTW92ZW1lbnQoKSB7XG4gIGlmIChzdGF0ZS5hbmltYXRpb25JbnRlcnZhbElkKSB7XG4gICAgY2xlYXJJbnRlcnZhbChzdGF0ZS5hbmltYXRpb25JbnRlcnZhbElkKTtcbiAgICBzdGF0ZS5hbmltYXRpb25JbnRlcnZhbElkID0gbnVsbDtcbiAgfVxufVxuZnVuY3Rpb24gdG9nZ2xlQXV0b1BvaW50ZXJNb3ZlbWVudCgpIHtcbiAgaWYgKHN0YXRlLmFuaW1hdGlvbkludGVydmFsSWQpIHtcbiAgICBzdG9wQXV0b1BvaW50ZXJNb3ZlbWVudCgpO1xuICB9IGVsc2Uge1xuICAgIHN0YXJ0QXV0b1BvaW50ZXJNb3ZlbWVudCgpO1xuICB9XG59XG5jb25zdCBvZmZzZXRWYWx1ZSA9IDQwMDtcbmZ1bmN0aW9uIHNpbXVsYXRlUG9pbnRlck1vdmUoZGlyZWN0aW9uKSB7XG4gIGNvbnN0IHRhcmdldEVsZW1lbnQgPSBnZXRHYW1lQ2FudmFzKCk7XG4gIGlmICghdGFyZ2V0RWxlbWVudCkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCByZWN0ID0gdGFyZ2V0RWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgY29uc3QgY2VudGVyWCA9IHJlY3QubGVmdCArIHJlY3Qud2lkdGggLyAyO1xuICBjb25zdCBjZW50ZXJZID0gcmVjdC50b3AgKyByZWN0LmhlaWdodCAvIDI7XG4gIGNvbnN0IHRhcmdldFggPSBkaXJlY3Rpb24gPT09IFwibGVmdFwiID8gY2VudGVyWCAtIG9mZnNldFZhbHVlIDogY2VudGVyWCArIG9mZnNldFZhbHVlO1xuICB0YXJnZXRFbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IE1vdXNlRXZlbnQoXCJwb2ludGVybW92ZVwiLCB7XG4gICAgY2xpZW50WDogdGFyZ2V0WCxcbiAgICBjbGllbnRZOiBjZW50ZXJZLFxuICAgIGJ1YmJsZXM6IHRydWUsXG4gICAgdmlldzogd2luZG93XG4gIH0pKTtcbn1cbmZ1bmN0aW9uIGdldEFuaW1hbFBvc2l0aW9uKCkge1xuICB0cnkge1xuICAgIGNvbnN0IGFuaW1hbCA9IGdldEZpcnN0QW5pbWFsKCk7XG4gICAgaWYgKCFhbmltYWwpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBwb3NpdGlvbiA9IGFuaW1hbC5wb3NpdGlvbjtcbiAgICByZXR1cm4ge1xuICAgICAgeDogcG9zaXRpb24uX3ggIT09IHVuZGVmaW5lZCA/IHBvc2l0aW9uLl94IDogcG9zaXRpb24ueCxcbiAgICAgIHk6IHBvc2l0aW9uLl95ICE9PSB1bmRlZmluZWQgPyBwb3NpdGlvbi5feSA6IHBvc2l0aW9uLnlcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5mdW5jdGlvbiBleHRyYWN0UG9zaXRpb24oZW50aXR5KSB7XG4gIGlmICghZW50aXR5IHx8ICFlbnRpdHkucG9zaXRpb24pIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4ge1xuICAgIHg6IGVudGl0eS5wb3NpdGlvbi5feCAhPT0gdW5kZWZpbmVkID8gZW50aXR5LnBvc2l0aW9uLl94IDogZW50aXR5LnBvc2l0aW9uLngsXG4gICAgeTogZW50aXR5LnBvc2l0aW9uLl95ICE9PSB1bmRlZmluZWQgPyBlbnRpdHkucG9zaXRpb24uX3kgOiBlbnRpdHkucG9zaXRpb24ueVxuICB9O1xufVxuZnVuY3Rpb24gY2FsY3VsYXRlRGlyZWN0aW9uKGVudGl0eSkge1xuICBpZiAoIWVudGl0eSkge1xuICAgIHJldHVybiB7XG4gICAgICBkaXJYOiAxLFxuICAgICAgZGlyWTogMFxuICAgIH07XG4gIH1cbiAgbGV0IGRpclggPSAwO1xuICBsZXQgZGlyWSA9IDA7XG4gIGlmIChlbnRpdHkudmVsb2NpdHkpIHtcbiAgICBkaXJYID0gZW50aXR5LnZlbG9jaXR5Ll94IHx8IGVudGl0eS52ZWxvY2l0eS54IHx8IDA7XG4gICAgZGlyWSA9IGVudGl0eS52ZWxvY2l0eS5feSB8fCBlbnRpdHkudmVsb2NpdHkueSB8fCAwO1xuICB9XG4gIGlmIChNYXRoLmFicyhkaXJYKSA8IDAuMDEgJiYgTWF0aC5hYnMoZGlyWSkgPCAwLjAxKSB7XG4gICAgY29uc3Qgcm90YXRpb24gPSBlbnRpdHkucm90YXRpb24gfHwgZW50aXR5LmFuZ2xlIHx8IGVudGl0eS5fcm90YXRpb24gfHwgMDtcbiAgICBkaXJYID0gTWF0aC5jb3Mocm90YXRpb24pO1xuICAgIGRpclkgPSBNYXRoLnNpbihyb3RhdGlvbik7XG4gIH1cbiAgY29uc3QgbWFnbml0dWRlID0gTWF0aC5zcXJ0KGRpclggKiBkaXJYICsgZGlyWSAqIGRpclkpO1xuICBpZiAobWFnbml0dWRlID4gMC4wMDEpIHtcbiAgICBkaXJYIC89IG1hZ25pdHVkZTtcbiAgICBkaXJZIC89IG1hZ25pdHVkZTtcbiAgfSBlbHNlIHtcbiAgICBkaXJYID0gMTtcbiAgICBkaXJZID0gMDtcbiAgfVxuICByZXR1cm4ge1xuICAgIGRpclg6IGRpclgsXG4gICAgZGlyWTogZGlyWVxuICB9O1xufVxuZnVuY3Rpb24gY2FsY3VsYXRlRGlzdGFuY2UoeDEsIHkxLCB4MiwgeTIpIHtcbiAgcmV0dXJuIE1hdGguc3FydCgoeDIgLSB4MSkgKiAoeDIgLSB4MSkgKyAoeTIgLSB5MSkgKiAoeTIgLSB5MSkpO1xufVxuZnVuY3Rpb24gYnVpbGRFbnRpdHlTdGF0ZSgpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCByYXdTdGF0ZSA9IGdldEdhbWVTdGF0ZSgpO1xuICAgIGNvbnN0IHBhcnNlZFN0YXRlID0gZ2V0RW50aXR5TWFuYWdlcihyYXdTdGF0ZSk7XG4gICAgY29uc3QgbG9jYWxQbGF5ZXIgPSBnZXRGaXJzdEFuaW1hbCgpO1xuICAgIGNvbnN0IGxvY2FsUG9zID0gZ2V0QW5pbWFsUG9zaXRpb24oKTtcbiAgICBpZiAoIXBhcnNlZFN0YXRlIHx8ICFsb2NhbFBsYXllciB8fCAhbG9jYWxQb3MpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBnYW1lU3RhdGUgPSB7XG4gICAgICBteUlkOiBsb2NhbFBsYXllci5pZCxcbiAgICAgIG15UG9zOiBsb2NhbFBvcyxcbiAgICAgIGVudGl0aWVzOiBbXSxcbiAgICAgIHBsYXllcnM6IFtdLFxuICAgICAgZm9vZDogW11cbiAgICB9O1xuICAgIGNvbnN0IGVudGl0aWVzTGlzdCA9IHBhcnNlZFN0YXRlLmVudGl0aWVzTGlzdCB8fCBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGVudGl0aWVzTGlzdC5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3QgZW50aXR5ID0gZW50aXRpZXNMaXN0W2ldO1xuICAgICAgaWYgKCFlbnRpdHkgfHwgZW50aXR5LmlkID09PSBsb2NhbFBsYXllci5pZCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmIChsb2NhbFBsYXllci5wbGF5ZXJSb29tSWQgJiYgZW50aXR5LnBsYXllclJvb21JZCA9PT0gbG9jYWxQbGF5ZXIucGxheWVyUm9vbUlkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3QgZW50aXR5UG9zID0gZXh0cmFjdFBvc2l0aW9uKGVudGl0eSk7XG4gICAgICBpZiAoIWVudGl0eVBvcyB8fCBlbnRpdHlQb3MueCA9PSBudWxsIHx8IGVudGl0eVBvcy55ID09IG51bGwpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBkeCA9IGVudGl0eVBvcy54IC0gbG9jYWxQb3MueDtcbiAgICAgIGNvbnN0IGR5ID0gZW50aXR5UG9zLnkgLSBsb2NhbFBvcy55O1xuICAgICAgY29uc3QgZGlzdGFuY2UgPSBNYXRoLnNxcnQoZHggKiBkeCArIGR5ICogZHkpO1xuICAgICAgY29uc3QgZW50aXR5RGF0YSA9IHtcbiAgICAgICAgaWQ6IGVudGl0eS5pZCxcbiAgICAgICAgeDogZW50aXR5UG9zLngsXG4gICAgICAgIHk6IGVudGl0eVBvcy55LFxuICAgICAgICBkaXN0YW5jZTogZGlzdGFuY2UsXG4gICAgICAgIGFuZ2xlOiBNYXRoLmF0YW4yKGR5LCBkeCksXG4gICAgICAgIGVudGl0eToge1xuICAgICAgICAgIC4uLmVudGl0eSxcbiAgICAgICAgICBuYW1lOiBlbnRpdHkuZW50aXR5TmFtZSB8fCBlbnRpdHkubmFtZSB8fCBudWxsXG4gICAgICAgIH1cbiAgICAgIH07XG4gICAgICBnYW1lU3RhdGUuZW50aXRpZXMucHVzaChlbnRpdHlEYXRhKTtcbiAgICAgIGlmIChlbnRpdHkudHlwZSA9PT0gMSB8fCBpc1ZhbGlkRW50aXR5KGVudGl0eSkpIHtcbiAgICAgICAgZ2FtZVN0YXRlLnBsYXllcnMucHVzaChlbnRpdHlEYXRhKTtcbiAgICAgIH0gZWxzZSBpZiAoZW50aXR5LnR5cGUgPT09IDIgfHwgIWlzVmFsaWRFbnRpdHkoZW50aXR5KSkge1xuICAgICAgICBnYW1lU3RhdGUuZm9vZC5wdXNoKGVudGl0eURhdGEpO1xuICAgICAgfVxuICAgIH1cbiAgICBnYW1lU3RhdGUucGxheWVycy5zb3J0KChmaXJzdEl0ZW0sIHNlY29uZEl0ZW0pID0+IGZpcnN0SXRlbS5kaXN0YW5jZSAtIHNlY29uZEl0ZW0uZGlzdGFuY2UpO1xuICAgIGdhbWVTdGF0ZS5mb29kLnNvcnQoKGl0ZW1BLCBpdGVtQikgPT4gaXRlbUEuZGlzdGFuY2UgLSBpdGVtQi5kaXN0YW5jZSk7XG4gICAgcmV0dXJuIGdhbWVTdGF0ZTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2VcbiAgICB9O1xuICB9XG59XG5sZXQgdHJhaWxJbnRlcnZhbElkID0gbnVsbDtcbmZ1bmN0aW9uIHN0YXJ0RW50aXR5VHJhaWxUcmFja2luZygpIHtcbiAgaWYgKHRyYWlsSW50ZXJ2YWxJZCkge1xuICAgIGNsZWFySW50ZXJ2YWwodHJhaWxJbnRlcnZhbElkKTtcbiAgICB0cmFpbEludGVydmFsSWQgPSBudWxsO1xuICB9XG4gIHRyYWlsSW50ZXJ2YWxJZCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICBpZiAoIXdpbmRvdy5lbnRpdHlUcmFpbEVuYWJsZWQgfHwgIXdpbmRvdy5lbnRpdHlUcmFpbFRhcmdldElkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHRhcmdldEVudGl0eUlkID0gZmluZEVudGl0eUJ5SWQod2luZG93LmVudGl0eVRyYWlsVGFyZ2V0SWQpO1xuICAgIGlmICghdGFyZ2V0RW50aXR5SWQpIHtcbiAgICAgIGNvbnN0IGdhbWVTdGF0ZSA9IGJ1aWxkRW50aXR5U3RhdGUoKTtcbiAgICAgIGlmIChnYW1lU3RhdGUgJiYgZ2FtZVN0YXRlLnBsYXllcnMgJiYgZ2FtZVN0YXRlLnBsYXllcnMubGVuZ3RoID4gMCkge1xuICAgICAgICB3aW5kb3cuZW50aXR5VHJhaWxUYXJnZXRJZCA9IGdhbWVTdGF0ZS5wbGF5ZXJzWzBdLmlkO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB0YXJnZXRFbnRpdHlQb3NpdGlvbiA9IGV4dHJhY3RQb3NpdGlvbih0YXJnZXRFbnRpdHlJZCk7XG4gICAgaWYgKCF0YXJnZXRFbnRpdHlQb3NpdGlvbikge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBsYXN0VHJhaWxQb2ludCA9IHdpbmRvdy5lbnRpdHlUcmFpbEhpc3Rvcnlbd2luZG93LmVudGl0eVRyYWlsSGlzdG9yeS5sZW5ndGggLSAxXTtcbiAgICBpZiAobGFzdFRyYWlsUG9pbnQgJiYgY2FsY3VsYXRlRGlzdGFuY2UobGFzdFRyYWlsUG9pbnQueCwgbGFzdFRyYWlsUG9pbnQueSwgdGFyZ2V0RW50aXR5UG9zaXRpb24ueCwgdGFyZ2V0RW50aXR5UG9zaXRpb24ueSkgPCA1KSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHdpbmRvdy5lbnRpdHlUcmFpbEhpc3RvcnkucHVzaCh7XG4gICAgICB4OiB0YXJnZXRFbnRpdHlQb3NpdGlvbi54LFxuICAgICAgeTogdGFyZ2V0RW50aXR5UG9zaXRpb24ueSxcbiAgICAgIHRpbWU6IERhdGUubm93KClcbiAgICB9KTtcbiAgICBpZiAod2luZG93LmVudGl0eVRyYWlsSGlzdG9yeS5sZW5ndGggPiB3aW5kb3cuZW50aXR5VHJhaWxNYXhMZW5ndGgpIHtcbiAgICAgIHdpbmRvdy5lbnRpdHlUcmFpbEhpc3Rvcnkuc2hpZnQoKTtcbiAgICB9XG4gIH0sIHdpbmRvdy5lbnRpdHlUcmFpbFJlY29yZEludGVydmFsKTtcbn1cbmZ1bmN0aW9uIHN0b3BFbnRpdHlUcmFpbFRyYWNraW5nKCkge1xuICBpZiAodHJhaWxJbnRlcnZhbElkKSB7XG4gICAgY2xlYXJJbnRlcnZhbCh0cmFpbEludGVydmFsSWQpO1xuICAgIHRyYWlsSW50ZXJ2YWxJZCA9IG51bGw7XG4gIH1cbn1cbmZ1bmN0aW9uIG1vdmVBbmRDbGlja0VsZW1lbnQodGFyZ2V0WCwgdGFyZ2V0WSwgc2hvdWxkQ2xpY2spIHtcbiAgY29uc3QgZWxlbWVudCA9IGdldEdhbWVDYW52YXMoKTtcbiAgaWYgKCFlbGVtZW50KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHBsYXllclBvc2l0aW9uID0gZ2V0QW5pbWFsUG9zaXRpb24oKTtcbiAgaWYgKCFwbGF5ZXJQb3NpdGlvbikge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCByZWN0ID0gZWxlbWVudC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgY29uc3QgY2VudGVyWCA9IHJlY3QubGVmdCArIHJlY3Qud2lkdGggLyAyO1xuICBjb25zdCBjZW50ZXJZID0gcmVjdC50b3AgKyByZWN0LmhlaWdodCAvIDI7XG4gIGNvbnN0IGRpZmZYID0gdGFyZ2V0WCAtIHBsYXllclBvc2l0aW9uLng7XG4gIGNvbnN0IGRpZmZZID0gdGFyZ2V0WSAtIHBsYXllclBvc2l0aW9uLnk7XG4gIGNvbnN0IGRpc3RhbmNlID0gTWF0aC5zcXJ0KGRpZmZYICogZGlmZlggKyBkaWZmWSAqIGRpZmZZKTtcbiAgbGV0IG11bHRpcGxpZXIgPSAxO1xuICBpZiAoZGlzdGFuY2UgPiA1MDAwKSB7XG4gICAgbXVsdGlwbGllciA9IDM7XG4gIH0gZWxzZSBpZiAoZGlzdGFuY2UgPiAyMDAwKSB7XG4gICAgbXVsdGlwbGllciA9IDI7XG4gIH0gZWxzZSBpZiAoZGlzdGFuY2UgPiAxMDAwKSB7XG4gICAgbXVsdGlwbGllciA9IDEuNTtcbiAgfSBlbHNlIGlmIChkaXN0YW5jZSA+IDUwMCkge1xuICAgIG11bHRpcGxpZXIgPSAxLjI7XG4gIH0gZWxzZSBpZiAoZGlzdGFuY2UgPCA1MCkge1xuICAgIG11bHRpcGxpZXIgPSAwLjU7XG4gIH0gZWxzZSBpZiAoZGlzdGFuY2UgPCAxNTApIHtcbiAgICBtdWx0aXBsaWVyID0gMC44O1xuICB9XG4gIGxldCBzY2FsZWRYID0gZGlmZlggKiBtdWx0aXBsaWVyO1xuICBsZXQgc2NhbGVkWSA9IGRpZmZZICogbXVsdGlwbGllcjtcbiAgY29uc3QgbWF4UmFkaXVzID0gTWF0aC5taW4ocmVjdC53aWR0aCwgcmVjdC5oZWlnaHQpICogMC44NTtcbiAgY29uc3Qgc2NhbGVkRGlzdGFuY2UgPSBNYXRoLnNxcnQoc2NhbGVkWCAqIHNjYWxlZFggKyBzY2FsZWRZICogc2NhbGVkWSk7XG4gIGlmIChzY2FsZWREaXN0YW5jZSA+IG1heFJhZGl1cykge1xuICAgIGNvbnN0IGNsYW1wUmF0aW8gPSBtYXhSYWRpdXMgLyBzY2FsZWREaXN0YW5jZTtcbiAgICBzY2FsZWRYICo9IGNsYW1wUmF0aW87XG4gICAgc2NhbGVkWSAqPSBjbGFtcFJhdGlvO1xuICB9XG4gIGNvbnN0IGZpbmFsWCA9IGNlbnRlclggKyBzY2FsZWRYO1xuICBjb25zdCBmaW5hbFkgPSBjZW50ZXJZICsgc2NhbGVkWTtcbiAgZWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBNb3VzZUV2ZW50KFwicG9pbnRlcm1vdmVcIiwge1xuICAgIGNsaWVudFg6IGZpbmFsWCxcbiAgICBjbGllbnRZOiBmaW5hbFksXG4gICAgYnViYmxlczogdHJ1ZSxcbiAgICB2aWV3OiB3aW5kb3dcbiAgfSkpO1xuICBpZiAoc2hvdWxkQ2xpY2spIHtcbiAgICBzaW11bGF0ZUNsaWNrKGZpbmFsWCwgZmluYWxZKTtcbiAgfVxufVxuXG5leHBvcnQgeyBzdGFydEF1dG9Qb2ludGVyTW92ZW1lbnQsIHN0b3BBdXRvUG9pbnRlck1vdmVtZW50LCB0b2dnbGVBdXRvUG9pbnRlck1vdmVtZW50LCBzaW11bGF0ZVBvaW50ZXJNb3ZlLCBnZXRBbmltYWxQb3NpdGlvbiwgZXh0cmFjdFBvc2l0aW9uLCBjYWxjdWxhdGVEaXJlY3Rpb24sIGNhbGN1bGF0ZURpc3RhbmNlLCBidWlsZEVudGl0eVN0YXRlLCBzdGFydEVudGl0eVRyYWlsVHJhY2tpbmcsIHN0b3BFbnRpdHlUcmFpbFRyYWNraW5nLCBtb3ZlQW5kQ2xpY2tFbGVtZW50IH07XG4iLCJpbXBvcnQgeyBnZW5lcmF0ZVJhbmRvbVN0cmluZywgZ2V0QWxsUHJvcGVydHlOYW1lcywgaXNWYWxpZEVudGl0eSB9IGZyb20gJy4vc3JjL3V0aWxzLmpzJztcbmltcG9ydCB7IHN0YXJ0QXV0b1BvaW50ZXJNb3ZlbWVudCwgc3RvcEF1dG9Qb2ludGVyTW92ZW1lbnQsIHRvZ2dsZUF1dG9Qb2ludGVyTW92ZW1lbnQsIHNpbXVsYXRlUG9pbnRlck1vdmUsIGdldEFuaW1hbFBvc2l0aW9uLCBleHRyYWN0UG9zaXRpb24sIGNhbGN1bGF0ZURpcmVjdGlvbiwgY2FsY3VsYXRlRGlzdGFuY2UsIGJ1aWxkRW50aXR5U3RhdGUsIHN0YXJ0RW50aXR5VHJhaWxUcmFja2luZywgc3RvcEVudGl0eVRyYWlsVHJhY2tpbmcsIG1vdmVBbmRDbGlja0VsZW1lbnQgfSBmcm9tICcuL3NyYy9mZWF0dXJlcy9tb3ZlbWVudC5qcyc7XG5pbXBvcnQgeyB1cGRhdGVMb2NrTG9vcCwgdG9nZ2xlTG9jaywgdHJhY2tOZWFyZXN0UGxheWVyLCBjbGVhclRyYWNraW5nLCBhdXRvRG9kZ2VMb29wLCBlbmFibGVBdXRvRG9kZ2UsIGRpc2FibGVBdXRvRG9kZ2UsIGZpbmROZWFyZXN0RW50aXR5LCBmaW5kRW50aXRpZXNJblJhbmdlLCBjYWxjdWxhdGVBdm9pZGFuY2VWZWN0b3IgfSBmcm9tICcuL3NyYy9mZWF0dXJlcy9haW1ib3QuanMnO1xuaW1wb3J0IHsgZ2V0R2FtZVN0YXRlLCBmaW5kRW50aXR5QnlJZCwgbWFya0FyZWFBc0ZhaWxlZCwgaXNBcmVhU2tpcHBlZCwgZmluZEJlc3RGb29kQ2x1c3RlciwgdHJpZ2dlclJhbmRvbUV2b2x2ZSwgY2hlY2tTdHVja0NvbmRpdGlvbiwgc2V0dXBQYXRyb2xSb3V0ZSwgYXV0b0Zhcm1Mb29wLCBzdGFydEF1dG9GYXJtLCBzdG9wQXV0b0Zhcm0sIHRvZ2dsZU1pbmltYXBTaXplIH0gZnJvbSAnLi9zcmMvZmVhdHVyZXMvYXV0b2Zhcm0uanMnO1xuaW1wb3J0IHsgYXBwbHlUaGVtZSwgaW5pdEJhY2tncm91bmRJbWFnZSwgaW5qZWN0U3R5bGVzIH0gZnJvbSAnLi9zcmMvdWkvdGhlbWUuanMnO1xuaW1wb3J0IHsgc3RhcnRSZXBlYXRpbmdUYXNrLCBzdG9wQ2hhdFRpbWVyIH0gZnJvbSAnLi9zcmMvZmVhdHVyZXMvY2hhdC5qcyc7XG5pbXBvcnQgeyBpbml0QW50aURldGVjdGlvbiB9IGZyb20gJy4vc3JjL2ZlYXR1cmVzL2FudGlkZXRlY3Rpb24uanMnO1xuaW1wb3J0IHsgaW5pdGlhbGl6ZUFzdHJhVmlzaW9uIH0gZnJvbSAnLi9zcmMvZmVhdHVyZXMveHJheS5qcyc7XG5pbXBvcnQgeyB0b2dnbGVFbnRpdHlUcmFpbCwgcmVmcmVzaFVJLCBkcmF3RW50aXR5VHJhaWwsIHJlbmRlckxvb3AsIGRyYXdFU1AsIGRyYXdUcmFja2VyTGluZSwgZHJhd1JhZGFyLCByZW5kZXJFc3BMb29wLCB0b2dnbGVFc3AgfSBmcm9tICcuL3NyYy9mZWF0dXJlcy9lc3AuanMnO1xuaW1wb3J0IHsgYWRkVHJhY2tUb1BsYXlsaXN0LCByZW1vdmVUcmFja0Zyb21QbGF5bGlzdCB9IGZyb20gJy4vc3JjL3N0b3JhZ2UuanMnO1xuaW1wb3J0IHsgaXNZb3V0dWJlVXJsLCBnZXRZb3V0dWJlVmlkZW9JZCwgZW5zdXJlWW91dHViZUFwaVJlYWR5LCBnZXRZb3V0dWJlSG9zdEVsZW1lbnQsIHBsYXlZb3V0dWJlVmlkZW8sIHN0b3BBbGxQbGF5YmFjaywgcGxheVRyYWNrLCBwYXVzZVBsYXliYWNrLCByZXN1bWVQbGF5YmFjaywgcmVzZXRQbGF5YmFjaywgaXNQbGF5aW5nLCBwbGF5TmV4dE9yUmFuZG9tLCBwbGF5UHJldmlvdXMsIHVwZGF0ZU11c2ljUGFuZWwsIGF1ZGlvUGxheWVyLCBtdXNpY1BsYXlsaXN0LCB5b3V0dWJlUGxheWVyLCB1aWF1ZGlvU3RhdGUgfSBmcm9tICcuL3NyYy91aS9hdWRpby5qcyc7XG5pbXBvcnQgeyBjcmVhdGVUb29sc1BhbmVsLCBjcmVhdGVWaXNpb25QYW5lbCwgY3JlYXRlQ29tYmF0UGFuZWwsIGNyZWF0ZUF1dG9tYXRpb25QYW5lbCwgY3JlYXRlU2V0dGluZ3NQYW5lbCwgY3JlYXRlTXVzaWNQYW5lbCwgY3JlYXRlVXBkYXRlSGlzdG9yeVBhbmVsIH0gZnJvbSAnLi9zcmMvdWkvcGFuZWxzLmpzJztcbmltcG9ydCB7IGluaXRBZEJsb2NrZXIgfSBmcm9tICcuL3NyYy9mZWF0dXJlcy9hZGJsb2NrLmpzJztcbmltcG9ydCB7IHdyYXBXaXRoUHJveHksIGdldEVudGl0eU1hbmFnZXIsIGdldEZpcnN0QW5pbWFsLCBnZXRWaWV3cG9ydFNjYWxlLCBpbml0aWFsaXplQXBwbGljYXRpb24sIG1ldGFkYXRhTWFwLCBjb25maWdTdG9yZSwgaXNQcm9jZXNzZWQsIGRyYWdTdGF0ZSwgc3RhdGUgfSBmcm9tICcuL3NyYy9jb3JlLmpzJztcbmltcG9ydCB7IGdldEdhbWVDYW52YXMsIHVwZGF0ZUxvY2tCdXR0b25VSSwgZ2V0T3JDcmVhdGVDYW52YXMsIGluaXRSYWRhckRyYWcgfSBmcm9tICcuL3NyYy91aS9yYWRhci5qcyc7XG5pbXBvcnQgeyBzaW11bGF0ZVRleHRJbnB1dCwgc2hvd05vdGlmaWNhdGlvbiwgaW5pdEF1dG9maWxsTmFtZSwgdHlwZUNoYXRNZXNzYWdlLCBpbml0aWFsaXplVGV4dEludGVyY2VwdG9yLCBzaW11bGF0ZUNsaWNrLCBzaG93SGFsbG93ZWVuQ29kZU1vZGFsLCBtYWtlRWxlbWVudERyYWdnYWJsZSB9IGZyb20gJy4vc3JjL3VpL2ludGVyYWN0aW9uLmpzJztcblxuaW5pdGlhbGl6ZUFwcGxpY2F0aW9uKCk7XG4iXSwibWFwcGluZ3MiOiI7O0NBQ0EsU0FBUyxxQkFBcUIsY0FBYztFQUMxQyxJQUFJLGVBQWU7RUFDbkIsS0FBSyxJQUFJLFFBQVEsR0FBRyxRQUFRLGNBQWMsU0FBUztHQUNqRCxNQUFNLGtCQUFrQixLQUFLLE1BQU0sS0FBSyxPQUFPLElBQUksVUFBVSxLQUFLO0dBQ2xFLGdCQUFnQixPQUFPLGNBQWMsZUFBZTtFQUN0RDtFQUNBLE9BQU87Q0FDVDtDQUNBLE1BQU0sdUJBQXNCLGlCQUFnQjtFQUMxQyxPQUFPLENBQUMsR0FBRyxPQUFPLG9CQUFvQixPQUFPLGVBQWUsWUFBWSxDQUFDLEdBQUcsR0FBRyxPQUFPLG9CQUFvQixZQUFZLENBQUM7Q0FDekg7Q0FDQSxTQUFTLGNBQWMsUUFBUTtFQUM3QixJQUFJLENBQUMsUUFDSCxPQUFPO0VBRVQsSUFBSSxPQUFPLFNBQVMsR0FDbEIsT0FBTztFQUVULElBQUksT0FBTyxnQkFBZ0IsTUFDekIsT0FBTztFQUVULElBQUksT0FBTyxjQUFjLFFBQVEsT0FBTyxXQUFXLFNBQVMsR0FDMUQsT0FBTztFQUVULElBQUksT0FBTyxvQkFBb0IsUUFBUSxPQUFPLG1CQUFtQixHQUMvRCxPQUFPO0VBRVQsT0FBTztDQUNUOzs7Q0N6QkEsU0FBUyxtQkFBbUIsVUFBVSxXQUFXO0VBQy9DLElBQUksQ0FBQyxVQUNIO0VBRUYsWUFBWSxhQUFhLFNBQVMsTUFBTSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQU0sWUFBWSxjQUFjLFNBQVM7RUFDdkcsY0FBYyxLQUFLO0dBQ2pCLEtBQUs7R0FDTCxNQUFNO0VBQ1IsQ0FBQztFQUNELGFBQWEsUUFBUSxpQkFBaUIsS0FBSyxVQUFVLGFBQWEsQ0FBQztFQUNuRSxpQkFBaUI7RUFDakIsaUJBQWlCLFlBQVksU0FBUztDQUN4QztDQUNBLFNBQVMsd0JBQXdCLGVBQWU7RUFDOUMsY0FBYyxPQUFPLGVBQWUsQ0FBQztFQUNyQyxJQUFJLE1BQU0scUJBQXFCLGNBQWMsUUFDM0MsTUFBTSxvQkFBb0I7RUFFNUIsYUFBYSxRQUFRLGlCQUFpQixLQUFLLFVBQVUsYUFBYSxDQUFDO0VBQ25FLElBQUksQ0FBQyxjQUFjLFFBQ2pCLGNBQWM7RUFFaEIsaUJBQWlCO0NBQ25COzs7Q0N2QkEsSUFBSSxjQUFjO0NBQ2xCLElBQUksZ0JBQWdCLEtBQUssTUFBTSxhQUFhLFFBQVEsZUFBZSxLQUFLLElBQUk7Q0FFNUUsSUFBSSxnQkFBZ0I7Q0FDcEIsSUFBSSxnQkFBZ0I7Q0FDcEIsSUFBSSx3QkFBd0I7Q0FDNUIsSUFBSSxrQkFBa0I7Q0FDdEIsU0FBUyxhQUFhLEtBQUs7RUFDekIsT0FBTyw4QkFBOEIsS0FBSyxPQUFPLEVBQUU7Q0FDckQ7Q0FDQSxTQUFTLGtCQUFrQixLQUFLO0VBQzlCLElBQUksQ0FBQyxLQUNILE9BQU87RUFFVCxJQUFJO0dBQ0YsTUFBTSxZQUFZLElBQUksSUFBSSxHQUFHO0dBQzdCLElBQUksVUFBVSxTQUFTLFNBQVMsVUFBVSxHQUN4QyxPQUFPLFVBQVUsU0FBUyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsTUFBTTtHQUV0RCxJQUFJLFVBQVUsU0FBUyxTQUFTLGFBQWEsR0FDM0MsT0FBTyxVQUFVLGFBQWEsSUFBSSxHQUFHLE1BQU0sVUFBVSxTQUFTLFdBQVcsU0FBUyxJQUFJLFVBQVUsU0FBUyxNQUFNLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxNQUFNLEdBQUcsQ0FBQyxDQUFDLEtBQUssVUFBVSxVQUFVLFNBQVMsV0FBVyxVQUFVLElBQUksVUFBVSxTQUFTLE1BQU0sVUFBVSxDQUFDLENBQUMsRUFBRSxFQUFFLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSztFQUVqUSxTQUFTLE9BQU8sQ0FBQztFQUNqQixPQUFPO0NBQ1Q7Q0FDQSxTQUFTLHNCQUFzQixVQUFVO0VBQ3ZDLElBQUksaUJBQWlCLE9BQU8sTUFBTSxPQUFPLEdBQUcsUUFBUTtHQUNsRCxTQUFTO0dBQ1Q7RUFDRjtFQUNBLElBQUksQ0FBQyxPQUFPLHNCQUNWLE9BQU8sdUJBQXVCLENBQUM7RUFFakMsT0FBTyxxQkFBcUIsS0FBSyxRQUFRO0VBQ3pDLElBQUksdUJBQ0Y7RUFFRix3QkFBd0I7RUFDeEIsSUFBSSxDQUFDLFNBQVMsZUFBZSxZQUFZLEdBQUc7R0FDMUMsTUFBTSxnQkFBZ0IsU0FBUyxjQUFjLFFBQVE7R0FDckQsY0FBYyxLQUFLO0dBQ25CLGNBQWMsTUFBTTtHQUNwQixTQUFTLEtBQUssWUFBWSxhQUFhO0VBQ3pDO0VBQ0EsTUFBTSx1QkFBdUIsT0FBTztFQUNwQyxPQUFPLDBCQUEwQixXQUFZO0dBQzNDLGdCQUFnQjtHQUNoQixJQUFJLE9BQU8seUJBQXlCLFlBQ2xDLElBQUk7SUFDRixxQkFBcUI7R0FDdkIsU0FBUyxtQkFBbUIsQ0FBQztHQUUvQixNQUFNLGlCQUFpQixPQUFPLHdCQUF3QixDQUFDO0dBQ3ZELE9BQU8sZUFBZSxRQUFRO0lBQzVCLE1BQU0sa0JBQWtCLGVBQWUsTUFBTTtJQUM3QyxJQUFJO0tBQ0YsZ0JBQWdCO0lBQ2xCLFNBQVMsbUJBQW1CLENBQUM7R0FDL0I7RUFDRjtDQUNGO0NBQ0EsU0FBUyx3QkFBd0I7RUFDL0IsSUFBSSxjQUFjLFNBQVMsZUFBZSxrQkFBa0I7RUFDNUQsSUFBSSxDQUFDLGFBQWE7R0FDaEIsY0FBYyxTQUFTLGNBQWMsS0FBSztHQUMxQyxZQUFZLEtBQUs7R0FDakIsWUFBWSxNQUFNLFVBQVU7R0FDNUIsU0FBUyxLQUFLLFlBQVksV0FBVztFQUN2QztFQUNBLE9BQU87Q0FDVDtDQUNBLFNBQVMsaUJBQWlCLFNBQVM7RUFDakMsNEJBQTRCO0dBQzFCLE1BQU0sb0JBQW9CLHNCQUFzQjtHQUNoRCxJQUFJLGlCQUFpQixPQUFPLGNBQWMsa0JBQWtCLFlBQVk7SUFDdEUsY0FBYyxjQUFjLE9BQU87SUFDbkMsSUFBSTtLQUNGLGNBQWMsVUFBVSxLQUFLLE1BQU0sYUFBYSxjQUFjLEdBQUcsQ0FBQztJQUNwRSxTQUFTLGdCQUFnQixDQUFDO0lBQzFCLGtCQUFrQjtJQUNsQixpQkFBaUI7SUFDakI7R0FDRjtHQUNBLGdCQUFnQixJQUFJLEdBQUcsT0FBTyxtQkFBbUI7SUFDL0MsT0FBTztJQUNQLFFBQVE7SUFDQztJQUNULFlBQVk7S0FDVixVQUFVO0tBQ1YsVUFBVTtLQUNWLFdBQVc7S0FDWCxJQUFJO0tBQ0osZ0JBQWdCO0tBQ2hCLEtBQUs7SUFDUDtJQUNBLFFBQVE7S0FDTixVQUFTLHFCQUFvQjtNQUMzQixJQUFJO09BQ0YsaUJBQWlCLE9BQU8sVUFBVSxLQUFLLE1BQU0sYUFBYSxjQUFjLEdBQUcsQ0FBQztPQUM1RSxpQkFBaUIsT0FBTyxVQUFVO01BQ3BDLFNBQVMsZ0JBQWdCLENBQUM7TUFDMUIsa0JBQWtCO01BQ2xCLGlCQUFpQjtLQUNuQjtLQUNBLGdCQUFlLHVCQUFzQjtNQUNuQyxJQUFJLENBQUMsT0FBTyxJQUNWO01BRUYsSUFBSSxtQkFBbUIsU0FBUyxHQUFHLFlBQVksT0FDN0MsSUFBSSxhQUFhLHVCQUNmLFVBQVUsS0FBSyxNQUFNLEtBQUssT0FBTyxJQUFJLGNBQWMsTUFBTSxDQUFDO1dBQ3JELElBQUksYUFBYSxvQkFDdEIsVUFBVSxNQUFNLG9CQUFvQixDQUFDO1dBRXJDLGlCQUFpQjtNQUdyQixJQUFJLG1CQUFtQixTQUFTLEdBQUcsWUFBWSxXQUFXLG1CQUFtQixTQUFTLEdBQUcsWUFBWSxRQUNuRyxpQkFBaUI7S0FFckI7SUFDRjtHQUNGLENBQUM7RUFDSCxDQUFDO0NBQ0g7Q0FDQSxTQUFTLGtCQUFrQjtFQUN6QixJQUFJLGFBQWE7R0FDZixJQUFJO0lBQ0YsWUFBWSxNQUFNO0lBQ2xCLFlBQVksTUFBTTtHQUNwQixTQUFTLFlBQVksQ0FBQztHQUN0QixjQUFjO0VBQ2hCO0VBQ0EsSUFBSSxlQUNGLElBQUk7R0FDRixjQUFjLFVBQVU7RUFDMUIsU0FBUyxrQkFBa0IsQ0FBQztFQUU5QixrQkFBa0I7Q0FDcEI7Q0FDQSxTQUFTLFVBQVUsWUFBWTtFQUM3QixJQUFJLENBQUMsY0FBYyxRQUFRO0dBQ3pCLGlCQUFpQixpQkFBaUI7R0FDbEM7RUFDRjtFQUNBLElBQUksYUFBYSxHQUNmLGFBQWEsY0FBYyxTQUFTO0VBRXRDLElBQUksY0FBYyxjQUFjLFFBQzlCLGFBQWE7RUFFZixNQUFNLG9CQUFvQjtFQUMxQixNQUFNLGVBQWUsY0FBYyxNQUFNO0VBQ3pDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLEtBQ2pDO0VBRUYsZ0JBQWdCO0VBQ2hCLElBQUksYUFBYSxhQUFhLEdBQUcsR0FBRztHQUNsQyxNQUFNLGlCQUFpQixrQkFBa0IsYUFBYSxHQUFHO0dBQ3pELElBQUksQ0FBQyxnQkFBZ0I7SUFDbkIsaUJBQWlCLHNCQUFzQjtJQUN2QztHQUNGO0dBQ0EsaUJBQWlCLGNBQWM7R0FDL0Isa0JBQWtCO0dBQ2xCLGlCQUFpQjtHQUNqQjtFQUNGO0VBQ0EsY0FBYyxJQUFJLE1BQU0sYUFBYSxHQUFHO0VBQ3hDLFlBQVksU0FBUyxhQUFhO0VBQ2xDLFlBQVksT0FBTztFQUNuQixrQkFBa0I7RUFDbEIsWUFBWSxLQUFLLENBQUMsQ0FBQyxZQUFZO0dBQzdCLGlCQUFpQix1QkFBdUI7RUFDMUMsQ0FBQztFQUNELFlBQVksZ0JBQWdCO0dBQzFCLElBQUksYUFBYSx1QkFDZixVQUFVLEtBQUssTUFBTSxLQUFLLE9BQU8sSUFBSSxjQUFjLE1BQU0sQ0FBQztRQUNyRCxJQUFJLGFBQWEsb0JBQ3RCLFVBQVUsTUFBTSxvQkFBb0IsQ0FBQztRQUVyQyxpQkFBaUI7RUFFckI7RUFDQSxZQUFZLFNBQVM7RUFDckIsWUFBWSxVQUFVO0VBQ3RCLGlCQUFpQjtDQUNuQjtDQUNBLFNBQVMsZ0JBQWdCO0VBQ3ZCLElBQUksb0JBQW9CLFdBQVcsYUFDakMsWUFBWSxNQUFNO09BQ2IsSUFBSSxvQkFBb0IsYUFBYSxlQUMxQyxJQUFJO0dBQ0YsY0FBYyxXQUFXO0VBQzNCLFNBQVMsbUJBQW1CLENBQUM7RUFFL0IsaUJBQWlCO0NBQ25CO0NBQ0EsU0FBUyxpQkFBaUI7RUFDeEIsSUFBSSxvQkFBb0IsV0FBVyxhQUNqQyxZQUFZLEtBQUssQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDO09BQzVCLElBQUksb0JBQW9CLGFBQWEsZUFDMUMsSUFBSTtHQUNGLGNBQWMsVUFBVTtFQUMxQixTQUFTLGtCQUFrQixDQUFDO09BQ3ZCLElBQUksY0FBYyxRQUN2QixVQUFVLE1BQU0saUJBQWlCO0VBRW5DLGlCQUFpQjtDQUNuQjtDQUNBLFNBQVMsZ0JBQWdCO0VBQ3ZCLElBQUksb0JBQW9CLFdBQVcsYUFBYTtHQUM5QyxZQUFZLE1BQU07R0FDbEIsWUFBWSxjQUFjO0VBQzVCLE9BQU8sSUFBSSxvQkFBb0IsYUFBYSxlQUMxQyxJQUFJO0dBQ0YsY0FBYyxVQUFVO0VBQzFCLFNBQVMsbUJBQW1CLENBQUM7RUFFL0Isa0JBQWtCO0VBQ2xCLGlCQUFpQjtDQUNuQjtDQUNBLFNBQVMsWUFBWTtFQUNuQixJQUFJLG9CQUFvQixXQUFXLGFBQ2pDLE9BQU8sQ0FBQyxZQUFZO0VBRXRCLElBQUksb0JBQW9CLGFBQWEsaUJBQWlCLE9BQU8sSUFDM0QsSUFBSTtHQUNGLE9BQU8sY0FBYyxlQUFlLE1BQU0sR0FBRyxZQUFZO0VBQzNELFNBQVMsT0FBTyxDQUFDO0VBRW5CLE9BQU87Q0FDVDtDQUNBLFNBQVMsbUJBQW1CO0VBQzFCLElBQUksQ0FBQyxjQUFjLFFBQ2pCO0VBRUYsVUFBVSxhQUFhLHdCQUF3QixLQUFLLE1BQU0sS0FBSyxPQUFPLElBQUksY0FBYyxNQUFNLElBQUksTUFBTSxvQkFBb0IsQ0FBQztDQUMvSDtDQUNBLFNBQVMsZUFBZTtFQUN0QixJQUFJLENBQUMsY0FBYyxRQUNqQjtFQUVGLFVBQVUsTUFBTSxvQkFBb0IsQ0FBQztDQUN2QztDQUNBLFNBQVMsbUJBQW1CO0VBQzFCLE1BQU0sYUFBYSxTQUFTLGVBQWUsYUFBYTtFQUN4RCxJQUFJLENBQUMsWUFDSDtFQUVGLE1BQU0scUJBQXFCLFVBQVU7RUFDckMsTUFBTSxhQUFhLFdBQVcsY0FBYyxlQUFlO0VBQzNELE1BQU0sbUJBQW1CLFdBQVcsY0FBYyxpQkFBaUI7RUFDbkUsTUFBTSxxQkFBcUIsV0FBVyxjQUFjLGlCQUFpQjtFQUNyRSxNQUFNLGFBQWEsV0FBVyxjQUFjLGVBQWU7RUFDM0QsTUFBTSxnQkFBZ0IsV0FBVyxjQUFjLGtCQUFrQjtFQUNqRSxJQUFJLFlBQ0YsV0FBVyxjQUFjLHFCQUFxQixVQUFVO0VBRTFELElBQUksWUFDRixXQUFXLFVBQVUsT0FBTyxhQUFhLGFBQWEsa0JBQWtCO0VBRTFFLElBQUksZUFDRixjQUFjLFVBQVUsT0FBTyxhQUFhLGFBQWEscUJBQXFCO0VBRWhGLElBQUksa0JBQ0YsaUJBQWlCLGNBQWMsY0FBYyxTQUFTLGNBQWMsTUFBTSxrQkFBa0IsRUFBRSxRQUFRLFlBQVksTUFBTSxvQkFBb0IsS0FBSztFQUVuSixJQUFJLG9CQUFvQjtHQUN0QixtQkFBbUIsWUFBWTtHQUMvQixjQUFjLFNBQVMsT0FBTyxrQkFBa0I7SUFDOUMsTUFBTSxlQUFlLFNBQVMsY0FBYyxLQUFLO0lBQ2pELGFBQWEsTUFBTSxVQUFVO0lBRTdCLGFBQWEsWUFBWSx5Q0FETCxrQkFBa0IsTUFBTSxzQkFBc0IsZUFBZSxpQkFDRCxlQUFlLE1BQU0scUhBQXFILE1BQU0sT0FBTyxRQUFRLE1BQU0sS0FBSyxVQUFVLEdBQUcsRUFBRSxJQUFJO0lBQzdRLGFBQWEsaUJBQWlCLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0IsVUFBVSxhQUFhO0lBQ2xGLGFBQWEsaUJBQWlCLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0Isd0JBQXdCLGFBQWE7SUFDaEcsbUJBQW1CLFlBQVksWUFBWTtHQUM3QyxDQUFDO0dBQ0QsSUFBSSxDQUFDLGNBQWMsUUFDakIsbUJBQW1CLFlBQVk7RUFFbkM7Q0FDRjtDQUVBLE1BQWEsZUFBZTtFQUMxQixTQUFTO0VBQ1QsYUFBYSxXQUFXLGFBQWEsUUFBUSxhQUFhLEtBQUssS0FBSztFQUNwRSxvQkFBb0IsYUFBYSxRQUFRLFdBQVcsTUFBTTtFQUMxRCx1QkFBdUIsYUFBYSxRQUFRLGNBQWMsTUFBTTtDQUNsRTs7O0NDbFNBLFNBQVMsa0JBQWtCLFVBQVUsWUFBWTtFQUMvQyxNQUFNLGVBQWUsU0FBUyxjQUFjLFFBQVE7RUFDcEQsSUFBSSxDQUFDLGNBQ0gsT0FBTztFQUVULGFBQWEsTUFBTTtFQUNuQixhQUFhLFFBQVE7RUFDckIsSUFBSSxlQUFlO0VBQ25CLE1BQU0sMEJBQTBCO0dBQzlCLElBQUksZ0JBQWdCLFdBQVcsUUFBUTtJQUNyQyxhQUFhLGNBQWMsSUFBSSxNQUFNLFVBQVUsRUFDN0MsU0FBUyxLQUNYLENBQUMsQ0FBQztJQUNGLGFBQWEsY0FBYyxJQUFJLE1BQU0sU0FBUyxFQUM1QyxTQUFTLEtBQ1gsQ0FBQyxDQUFDO0lBQ0Y7R0FDRjtHQUNBLGFBQWEsU0FBUyxXQUFXO0dBQ2pDLGFBQWEsY0FBYyxJQUFJLFdBQVcsU0FBUyxFQUNqRCxTQUFTLEtBQ1gsQ0FBQyxDQUFDO0dBQ0Y7R0FDQSxXQUFXLG1CQUFtQixFQUFFO0VBQ2xDO0VBQ0Esa0JBQWtCO0VBQ2xCLE9BQU87Q0FDVDtDQUNBLElBQUksZUFBZTtDQUNuQixTQUFTLGlCQUFpQixTQUFTO0VBQ2pDLE1BQU0sbUJBQW1CLEtBQUssSUFBSTtFQUNsQyxJQUFJLFlBQVksZ0JBQWdCLG1CQUFtQixNQUFNLGNBQWMsS0FDckU7RUFFRixlQUFlO0VBQ2YsTUFBTSxjQUFjO0VBQ3BCLE1BQU0sc0JBQXNCLFNBQVMsY0FBYyxLQUFLO0VBQ3hELG9CQUFvQixNQUFNLFVBQVU7RUFDcEMsb0JBQW9CLGNBQWM7RUFDbEMsU0FBUyxLQUFLLFlBQVksbUJBQW1CO0VBQzdDLDRCQUE0QjtHQUMxQixvQkFBb0IsTUFBTSxVQUFVO0dBQ3BDLG9CQUFvQixNQUFNLFlBQVk7RUFDeEMsQ0FBQztFQUNELGlCQUFpQjtHQUNmLG9CQUFvQixNQUFNLFVBQVU7R0FDcEMsb0JBQW9CLE1BQU0sWUFBWTtHQUN0QyxpQkFBaUIsb0JBQW9CLE9BQU8sR0FBRyxHQUFHO0VBQ3BELEdBQUcsSUFBSTtDQUNUO0NBQ0EsU0FBUyxtQkFBbUI7RUFDMUIsSUFBSSxhQUFhLFNBQ2Y7RUFFRixJQUFJLFlBQVksYUFBYSxRQUFRLGVBQWUsS0FBSztFQUN6RCxJQUFJLFlBQVksU0FBUyxjQUFjLG1CQUFtQixLQUFLLFNBQVMsY0FBYyw2QkFBNkI7RUFDbkgsU0FBUyxnQkFBZ0I7R0FDdkIsSUFBSSxhQUFhLFNBQ2Y7R0FFRixhQUFhLFVBQVU7R0FDdkIsVUFBVSxRQUFRO0dBQ2xCLFVBQVUsY0FBYyxJQUFJLE1BQU0sU0FBUyxFQUN6QyxTQUFTLEtBQ1gsQ0FBQyxDQUFDO0dBQ0YsVUFBVSxpQkFBaUIsZUFBZTtJQUN4QyxJQUFJLGNBQWMsVUFBVSxPQUFPO0tBQ2pDLFlBQVksVUFBVTtLQUN0QixhQUFhLFFBQVEsaUJBQWlCLFNBQVM7SUFDakQ7R0FDRixDQUFDO0VBQ0g7RUFDQSxJQUFJLGFBQWEsTUFBTTtHQUNyQixNQUFNLHFCQUFxQixrQkFBa0I7SUFDM0MsWUFBWSxTQUFTLGNBQWMsbUJBQW1CLEtBQUssU0FBUyxjQUFjLDZCQUE2QjtJQUMvRyxJQUFJLGFBQWEsTUFBTTtLQUNyQixjQUFjLGtCQUFrQjtLQUNoQyxjQUFjO0lBQ2hCO0dBQ0YsR0FBRyxHQUFHO0VBQ1IsT0FDRSxjQUFjO0NBRWxCO0NBQ0EsU0FBUyxnQkFBZ0IsYUFBYTtFQUNwQyxNQUFNLG1CQUFtQixTQUFTLGNBQWMsbUJBQW1CLEtBQUssU0FBUyxjQUFjLGdDQUFnQyxLQUFLLFNBQVMsY0FBYyxzQkFBc0I7RUFDakwsSUFBSSxDQUFDLGtCQUNIO0VBRUYsaUJBQWlCLE1BQU07RUFDdkIsaUJBQWlCLFFBQVE7RUFDekIsSUFBSSxZQUFZO0VBQ2hCLE1BQU0sMEJBQTBCO0dBQzlCLElBQUksYUFBYSxZQUFZLFFBQVE7SUFDbkMsTUFBTSxhQUFhLFNBQVMsY0FBYyxvQkFBb0IsS0FBSyxTQUFTLGNBQWMsZ0NBQWdDO0lBQzFILElBQUksWUFDRixXQUFXLE1BQU07U0FDWjtLQUNMLGlCQUFpQixjQUFjLElBQUksTUFBTSxVQUFVLEVBQ2pELFNBQVMsS0FDWCxDQUFDLENBQUM7S0FDRixpQkFBaUIsY0FBYyxJQUFJLE1BQU0sU0FBUyxFQUNoRCxTQUFTLEtBQ1gsQ0FBQyxDQUFDO0tBQ0YsaUJBQWlCO01BQ2YsaUJBQWlCLFFBQVE7TUFDekIsaUJBQWlCLEtBQUs7S0FDeEIsR0FBRyxHQUFHO0lBQ1I7SUFDQTtHQUNGO0dBQ0EsaUJBQWlCLFNBQVMsWUFBWTtHQUN0QyxpQkFBaUIsY0FBYyxJQUFJLFdBQVcsU0FBUyxFQUNyRCxTQUFTLEtBQ1gsQ0FBQyxDQUFDO0dBQ0Y7R0FDQSxXQUFXLG1CQUFtQixFQUFFO0VBQ2xDO0VBQ0Esa0JBQWtCO0NBQ3BCO0NBQ0EsSUFBSSxnQkFBZ0I7Q0FDcEIsU0FBUyw0QkFBNEI7RUFDbkMsSUFBSSxlQUNGO0VBRUYsU0FBUyxlQUFlLGFBQWE7R0FDbkMsSUFBSSxPQUFPLGdCQUFnQixVQUN6QixPQUFPO0dBRVQsT0FBTyxZQUFZLFFBQVEsMkZBQTJGLFNBQVMsWUFBWSxXQUFXLFdBQVcsY0FBYztJQUM3SyxRQUFRLFdBQVcsSUFBbkI7S0FDRSxLQUFLLE1BQ0gsT0FBTztLQUNULEtBQUssS0FDSCxPQUFPO0tBQ1QsS0FBSyxLQUNILE9BQU87S0FDVCxLQUFLLEtBQ0gsT0FBTztLQUNULEtBQUssS0FDSCxPQUFPO0tBQ1QsS0FBSyxLQUNILE9BQU87S0FDVCxLQUFLLEtBQ0gsT0FBTztLQUNULEtBQUs7S0FDTCxLQUFLO0tBQ0wsS0FBSztLQUNMLEtBQUs7S0FDTCxLQUFLO0tBQ0wsS0FBSztLQUNMLEtBQUs7S0FDTCxLQUFLLEtBQ0gsT0FBTyxPQUFPLGFBQWEsT0FBTyxTQUFTLFlBQVksQ0FBQyxLQUFLLENBQUM7S0FDaEU7TUFDRSxJQUFJLGFBQWEsTUFDZixPQUFPLE9BQU8sYUFBYSxPQUFPLFNBQVMsV0FBVyxFQUFFLEtBQUssQ0FBQztNQUVoRSxJQUFJLGFBQWEsTUFDZixPQUFPLE9BQU8sYUFBYSxPQUFPLFNBQVMsV0FBVyxFQUFFLEtBQUssQ0FBQztNQUVoRSxJQUFJLGFBQWEsTUFBTTtPQUNyQixNQUFNLFlBQVksT0FBTyxTQUFTLFdBQVcsRUFBRSxLQUFLO09BQ3BELElBQUksWUFBWSxTQUNkLE9BQU87WUFFUCxPQUFPLE9BQU8sY0FBYyxTQUFTO01BRXpDO01BQ0EsT0FBTztJQUNYO0dBQ0YsQ0FBQztFQUNIO0VBQ0EsTUFBTSxjQUFjO0dBQ2xCLE9BQU87R0FDUCxhQUFhO0dBQ2IsTUFBTTtFQUNSO0VBQ0EsTUFBTSxpQkFBaUIsWUFBWSxVQUFVO0VBQzdDLFlBQVksVUFBVSxTQUFTLFNBQVUsR0FBRyxXQUFXO0dBQ3JELElBQUk7SUFDRixNQUFNLGNBQWM7S0FBQztLQUE2QjtLQUE2QjtLQUE4QjtJQUF1QjtJQUNwSSxLQUFLLElBQUksZUFBZSxHQUFHLGVBQWUsWUFBWSxRQUFRLGdCQUFnQjtLQUM1RSxNQUFNLGFBQWEsWUFBWSxhQUFhLENBQUMsS0FBSyxVQUFVLEVBQUU7S0FDOUQsSUFBSSxjQUFjLFdBQVcsV0FBVyxHQUFHO01BQ3pDLE1BQU0sZUFBZTtPQUFDLFlBQVk7T0FBTyxZQUFZO09BQU8sWUFBWTtPQUFhLFlBQVk7TUFBSSxDQUFDLENBQUM7TUFDdkcsVUFBVSxLQUFLLFdBQVcsS0FBSyxlQUFlLFdBQVcsRUFBRSxDQUFDLENBQUMsT0FBTyxHQUFHLFlBQVk7TUFDbkY7S0FDRjtJQUNGO0dBQ0YsUUFBUSxDQUFDO0dBQ1QsT0FBTyxRQUFRLE1BQU0sZ0JBQWdCLE1BQU0sU0FBUztFQUN0RDtFQU1BLElBTDZCLHVCQUF1QjtHQUNsRCxTQUFTLGNBQWMsNkJBQTZCLENBQUMsRUFBRSxhQUFhLGFBQWEsSUFBSTtHQUNyRixTQUFTLGNBQWMsNkJBQTZCLENBQUMsRUFBRSxhQUFhLGFBQWEsSUFBSTtHQUNyRixTQUFTLGNBQWMsbUJBQW1CLENBQUMsRUFBRSxhQUFhLGFBQWEsTUFBTTtFQUMvRSxDQUNlLENBQUMsQ0FBQyxRQUFRLFNBQVMsTUFBTTtHQUN0QyxXQUFXO0dBQ1gsU0FBUztFQUNYLENBQUM7RUFDRCxnQkFBZ0I7RUFDaEIsaUJBQWlCLDRCQUE0QjtDQUMvQztDQUNBLFNBQVMsY0FBYyxTQUFTLFNBQVM7RUFDdkMsTUFBTSxnQkFBZ0IsY0FBYztFQUNwQyxJQUFJLENBQUMsZUFDSDtFQUVGLGNBQWMsY0FBYyxJQUFJLGFBQWEsZUFBZTtHQUNqRDtHQUNBO0dBQ1QsUUFBUTtHQUNSLFNBQVM7R0FDVCxTQUFTO0dBQ1QsTUFBTTtFQUNSLENBQUMsQ0FBQztFQUNGLGlCQUFpQjtHQUNmLGNBQWMsY0FBYyxJQUFJLGFBQWEsYUFBYTtJQUMvQztJQUNBO0lBQ1QsU0FBUztJQUNULFNBQVM7SUFDVCxNQUFNO0dBQ1IsQ0FBQyxDQUFDO0VBQ0osR0FBRyxFQUFFO0NBQ1A7Q0FDQSxTQUFTLHVCQUF1QixrQkFBa0I7RUFDaEQsTUFBTSxlQUFlLFNBQVMsY0FBYyxLQUFLO0VBQ2pELGFBQWEsTUFBTSxVQUFVO0VBQzdCLGFBQWEsWUFBWTtFQUN6QixTQUFTLEtBQUssWUFBWSxZQUFZO0VBQ3RDLGlCQUFpQjtHQUNmLGFBQWEsTUFBTSxVQUFVO0VBQy9CLEdBQUcsRUFBRTtFQUNMLE1BQU0sWUFBWSxhQUFhLGNBQWMsY0FBYztFQUMzRCxNQUFNLG1CQUFtQjtHQUN2QixhQUFhLE1BQU0sVUFBVTtHQUM3QixpQkFBaUIsYUFBYSxPQUFPLEdBQUcsR0FBRztFQUM3QztFQUNBLGFBQWEsY0FBYyxjQUFjLENBQUMsQ0FBQyxnQkFBZ0I7R0FDekQsTUFBTSxhQUFhLFVBQVUsTUFBTSxLQUFLO0dBQ3hDLElBQUksZUFBZSxxQkFBcUIsZUFBZSxpQkFBaUI7SUFDdEUsYUFBYSxRQUFRLHFCQUFxQixNQUFNO0lBQ2hELGlCQUFpQiwwQkFBMEI7SUFDM0MsV0FBVztJQUNYLGlCQUFpQixJQUFJO0dBQ3ZCLE9BQU87SUFDTCxVQUFVLE1BQU0sY0FBYztJQUM5QixpQkFBaUI7S0FDZixVQUFVLE1BQU0sY0FBYztJQUNoQyxHQUFHLEdBQUc7SUFDTixpQkFBaUIsY0FBYztHQUNqQztFQUNGO0VBQ0EsYUFBYSxjQUFjLGNBQWMsQ0FBQyxDQUFDLGdCQUFnQjtHQUN6RCxXQUFXO0dBQ1gsaUJBQWlCLEtBQUs7RUFDeEI7RUFDQSxVQUFVLGlCQUFpQixhQUFZLFVBQVM7R0FDOUMsSUFBSSxNQUFNLFFBQVEsU0FDaEIsYUFBYSxjQUFjLGNBQWMsQ0FBQyxDQUFDLE1BQU07RUFFckQsQ0FBQztFQUNELFVBQVUsTUFBTTtDQUNsQjtDQUNBLFNBQVMscUJBQXFCLGtCQUFrQjtFQUM5QyxJQUFJO0VBQ0osSUFBSTtFQUNKLElBQUksYUFBYTtFQUNqQixJQUFJLFdBQVc7RUFDZixpQkFBaUIsaUJBQWlCLGNBQWEsVUFBUztHQUN0RCxJQUFJO0lBQUM7SUFBVTtJQUFTO0lBQVk7SUFBVTtJQUFLO0dBQU8sQ0FBQyxDQUFDLFNBQVMsTUFBTSxPQUFPLE9BQU8sR0FDdkY7R0FFRixJQUFJLE1BQU0sT0FBTyxRQUFRLG9DQUFvQyxHQUMzRDtHQUVGLGFBQWE7R0FDYixXQUFXO0dBQ1gsVUFBVSxNQUFNLFVBQVUsaUJBQWlCLHNCQUFzQixDQUFDLENBQUM7R0FDbkUsVUFBVSxNQUFNLFVBQVUsaUJBQWlCLHNCQUFzQixDQUFDLENBQUM7R0FDbkUsaUJBQWlCLE1BQU0sYUFBYTtHQUNwQyxNQUFNLG1CQUFrQixzQkFBcUI7SUFDM0MsSUFBSSxDQUFDLGFBQWEsS0FBSyxJQUFJLGtCQUFrQixVQUFVLE1BQU0sT0FBTyxJQUFJLEtBQUssS0FBSyxJQUFJLGtCQUFrQixVQUFVLE1BQU0sT0FBTyxJQUFJLElBQ2pJLFdBQVc7SUFFYixJQUFJLFlBQVk7S0FDZCxpQkFBaUIsTUFBTSxPQUFPLGtCQUFrQixVQUFVLFVBQVU7S0FDcEUsaUJBQWlCLE1BQU0sTUFBTSxrQkFBa0IsVUFBVSxVQUFVO0tBQ25FLGlCQUFpQixNQUFNLFNBQVM7S0FDaEMsaUJBQWlCLE1BQU0sUUFBUTtJQUNqQztHQUNGO0dBQ0EsTUFBTSxzQkFBc0I7SUFDMUIsYUFBYTtJQUNiLGlCQUFpQixNQUFNLGFBQWE7SUFDcEMsU0FBUyxvQkFBb0IsYUFBYSxlQUFlO0lBQ3pELFNBQVMsb0JBQW9CLFdBQVcsYUFBYTtHQUN2RDtHQUNBLFNBQVMsaUJBQWlCLGFBQWEsZUFBZTtHQUN0RCxTQUFTLGlCQUFpQixXQUFXLGFBQWE7RUFDcEQsQ0FBQztFQUNELGlCQUFpQixpQkFBaUIsVUFBUyxlQUFjO0dBQ3ZELElBQUksVUFDRixXQUFXLHlCQUF5QjtFQUV4QyxDQUFDO0NBQ0g7OztDQ2xUQSxPQUFPLGNBQWM7Q0FDckIsT0FBTyxlQUFlO0NBQ3RCLE9BQU8sbUJBQW1CO0NBRzFCLFNBQVMsaUJBQWlCO0VBQ3hCLElBQUksQ0FBQyxhQUNIO0VBRUYsc0JBQXNCLGNBQWM7RUFDcEMsSUFBSSxDQUFDLE9BQU8sZUFBZSxDQUFDLE9BQU8sY0FDakM7RUFFRixJQUFJO0dBQ0YsTUFBTSxlQUFlLGVBQWUsT0FBTyxZQUFZO0dBQ3ZELElBQUksQ0FBQyxjQUFjO0lBQ2pCLGlCQUFpQixrQkFBa0I7SUFDbkMsT0FBTyxlQUFlO0lBQ3RCLE9BQU8sY0FBYztJQUNyQixtQkFBbUI7SUFDbkI7R0FDRjtHQUNBLE1BQU0sWUFBWSxnQkFBZ0IsWUFBWTtHQUM5QyxNQUFNLGFBQWEsa0JBQWtCO0dBQ3JDLElBQUksQ0FBQyxhQUFhLENBQUMsWUFDakI7R0FFRixNQUFNLFNBQVMsY0FBYztHQUM3QixJQUFJLENBQUMsUUFDSDtHQUVGLE1BQU0sT0FBTyxPQUFPLHNCQUFzQjtHQUMxQyxNQUFNLFVBQVUsS0FBSyxPQUFPLEtBQUssUUFBUTtHQUN6QyxNQUFNLFVBQVUsS0FBSyxNQUFNLEtBQUssU0FBUztHQUN6QyxNQUFNLE9BQU8sVUFBVSxJQUFJLFdBQVc7R0FDdEMsTUFBTSxPQUFPLFVBQVUsSUFBSSxXQUFXO0dBQ3RDLE1BQU0sZUFBZSxLQUFLLEtBQUssT0FBTyxPQUFPLE9BQU8sSUFBSTtHQUN4RCxJQUFJLGFBQWEsVUFBVTtHQUMzQixJQUFJLGFBQWEsVUFBVTtHQUMzQixJQUFJLGFBQWEsVUFBVTtJQUN6QixNQUFNLE9BQU8sYUFBYSxTQUFTLE1BQU0sYUFBYSxTQUFTLEtBQUs7SUFDcEUsTUFBTSxPQUFPLGFBQWEsU0FBUyxNQUFNLGFBQWEsU0FBUyxLQUFLO0lBQ3BFLE1BQU0sbUJBQW1CLEtBQUssSUFBSSxlQUFlLEtBQUssRUFBRztJQUN6RCxjQUFjLE9BQU87SUFDckIsY0FBYyxPQUFPO0dBQ3ZCO0dBQ0EsTUFBTSxZQUFZLGFBQWEsV0FBVztHQUMxQyxNQUFNLFlBQVksYUFBYSxXQUFXO0dBQzFDLE1BQU0sWUFBWSxLQUFLLEtBQUssWUFBWSxZQUFZLFlBQVksU0FBUztHQUN6RSxJQUFJLGFBQWE7R0FDakIsSUFBSSxZQUFZLEtBQ2QsYUFBYTtRQUNSLElBQUksWUFBWSxLQUNyQixhQUFhO1FBQ1IsSUFBSSxZQUFZLEtBQ3JCLGFBQWE7R0FFZixNQUFNLFlBQVksS0FBSyxJQUFJLEtBQUssT0FBTyxLQUFLLE1BQU0sSUFBSTtHQUN0RCxJQUFJLFVBQVUsWUFBWTtHQUMxQixJQUFJLFVBQVUsWUFBWTtHQUMxQixNQUFNLGFBQWEsS0FBSyxLQUFLLFVBQVUsVUFBVSxVQUFVLE9BQU87R0FDbEUsSUFBSSxhQUFhLFdBQVc7SUFDMUIsTUFBTSxjQUFjLFlBQVk7SUFDaEMsV0FBVztJQUNYLFdBQVc7R0FDYjtHQUNBLE9BQU8sY0FBYyxJQUFJLFdBQVcsZUFBZTtJQUNqRCxTQUFTLFVBQVU7SUFDbkIsU0FBUyxVQUFVO0lBQ25CLFNBQVM7SUFDVCxNQUFNO0dBQ1IsQ0FBQyxDQUFDO0VBQ0osU0FBUyxTQUFTLENBQUM7Q0FDckI7Q0FDQSxTQUFTLGFBQWE7RUFDcEIsSUFBSSxPQUFPLGVBQWUsT0FBTyxjQUFjO0dBQzdDLE9BQU8sY0FBYztHQUNyQixPQUFPLGVBQWU7R0FDdEIsaUJBQWlCLGVBQWU7RUFDbEMsT0FBTztHQUNMLE1BQU0sZUFBZSxpQkFBaUI7R0FDdEMsSUFBSSxnQkFBZ0IsYUFBYSxXQUFXLGFBQWEsUUFBUSxTQUFTLEdBQUc7SUFDM0UsT0FBTyxjQUFjO0lBQ3JCLE9BQU8sZUFBZSxhQUFhLFFBQVEsRUFBRSxDQUFDO0lBRTlDLGlCQUFpQixjQURFLGFBQWEsUUFBUSxFQUFFLENBQUMsUUFBUSxRQUFRLFFBQVEsT0FBTyxhQUNsQztHQUMxQyxPQUNFLGlCQUFpQix1QkFBdUI7RUFFNUM7RUFDQSxtQkFBbUI7Q0FDckI7Q0FDQSxTQUFTLHFCQUFxQjtFQUM1QixNQUFNLFdBQVcsaUJBQWlCO0VBQ2xDLElBQUksWUFBWSxTQUFTLFdBQVcsU0FBUyxRQUFRLFNBQVMsR0FBRztHQUMvRCxPQUFPLHFCQUFxQixTQUFTLFFBQVEsRUFBRSxDQUFDO0dBQ2hELGlCQUFpQixnQkFBZ0IsU0FBUyxRQUFRLEVBQUUsQ0FBQyxRQUFRLFFBQVEsT0FBTyxtQkFBbUI7RUFDakcsT0FDRSxpQkFBaUIsbUJBQW1CO0NBRXhDO0NBQ0EsU0FBUyxnQkFBZ0I7RUFDdkIsT0FBTyxxQkFBcUI7RUFDNUIsaUJBQWlCLGtCQUFrQjtDQUNyQztDQUNBLE1BQU0sY0FBYztDQUNwQixNQUFNLHVCQUF1QjtDQUM3QixJQUFJLHdCQUF3QjtDQUM1QixJQUFJLHFCQUFxQjtDQUN6QixJQUFJLG1CQUFtQjtDQUN2QixJQUFJLDRCQUE0QjtDQUNoQyxJQUFJLGFBQWEsQ0FBQztDQUNsQixTQUFTLGdCQUFnQjtFQUN2QixJQUFJLENBQUMsTUFBTSw4QkFDVDtFQUVGLFdBQVcsZUFBZSxFQUFFO0VBQzVCLElBQUksQ0FBQyxPQUFPLGtCQUNWO0VBRUYsSUFBSTtHQUNGLE1BQU0sYUFBYSxrQkFBa0I7R0FDckMsSUFBSSxDQUFDLFlBQ0g7R0FFRixNQUFNLFlBQVksYUFBYTtHQUMvQixNQUFNLFlBQVksaUJBQWlCLFNBQVM7R0FDNUMsTUFBTSxXQUFXLFdBQVcsWUFBWTtHQUN4QyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQ2pCO0dBRUYsSUFBSSxpQkFBaUIsQ0FBQztHQUN0QixDQUFDLFVBQVUsZ0JBQWdCLENBQUMsRUFBQSxDQUFHLFNBQVEsaUJBQWdCO0lBQ3JELElBQUksQ0FBQyxnQkFBZ0IsYUFBYSxPQUFPLFNBQVMsTUFBTSxDQUFDLGNBQWMsWUFBWSxHQUNqRjtJQUVGLE1BQU0sVUFBVSxhQUFhLFVBQVUsT0FBTyxLQUFBLElBQVksYUFBYSxTQUFTLEtBQUssYUFBYSxVQUFVO0lBQzVHLE1BQU0sVUFBVSxhQUFhLFVBQVUsT0FBTyxLQUFBLElBQVksYUFBYSxTQUFTLEtBQUssYUFBYSxVQUFVO0lBQzVHLElBQUksV0FBVyxRQUFRLFdBQVcsTUFDaEM7SUFFRixNQUFNLG1CQUFtQixrQkFBa0IsV0FBVyxHQUFHLFdBQVcsR0FBRyxTQUFTLE9BQU87SUFDdkYsSUFBSSxtQkFBbUIsYUFDckIsZUFBZSxLQUFLO0tBQ2xCLEdBQUc7S0FDSCxHQUFHO0tBQ0gsTUFBTTtJQUNSLENBQUM7R0FFTCxDQUFDO0dBQ0QsSUFBSSxlQUFlLFdBQVcsR0FBRztJQUMvQixxQkFBcUI7SUFDckIsbUJBQW1CO0lBQ25CLGFBQWEsQ0FBQztJQUNkO0dBQ0Y7R0FDQSxNQUFNLE1BQU0sS0FBSyxJQUFJO0dBQ3JCLElBQUksV0FBVztHQUNmLElBQUksTUFBTSw0QkFBNEIsS0FBSztJQUN6Qyw0QkFBNEI7SUFDNUIsSUFBSSxvQkFFRixJQUR3QixrQkFBa0IsV0FBVyxHQUFHLFdBQVcsR0FBRyxtQkFBbUIsR0FBRyxtQkFBbUIsQ0FDN0YsSUFBSSxJQUFJO0tBQ3hCO0tBQ0EsV0FBVztJQUNiLE9BQU87S0FDTCxtQkFBbUI7S0FDbkIsYUFBYSxDQUFDO0lBQ2hCO0lBRUYscUJBQXFCO0tBQ25CLEdBQUcsV0FBVztLQUNkLEdBQUcsV0FBVztJQUNoQjtHQUNGO0dBQ0EsSUFBSSxPQUFPO0dBQ1gsSUFBSSxPQUFPO0dBQ1gsZUFBZSxTQUFRLGlCQUFnQjtJQUNyQyxNQUFNLFNBQVMsV0FBVyxJQUFJLGFBQWE7SUFDM0MsTUFBTSxTQUFTLFdBQVcsSUFBSSxhQUFhO0lBQzNDLE1BQU0sWUFBWSxLQUFLLEtBQUssU0FBUyxTQUFTLFNBQVMsTUFBTTtJQUM3RCxJQUFJLFlBQVksS0FBTTtLQUNwQixNQUFNLHNCQUFzQixjQUFjLGFBQWEsUUFBUTtLQUMvRCxRQUFRLFNBQVMsWUFBWTtLQUM3QixRQUFRLFNBQVMsWUFBWTtJQUMvQjtHQUNGLENBQUM7R0FDRCxJQUFJLFlBQVksS0FBSyxLQUFLLE9BQU8sT0FBTyxPQUFPLElBQUk7R0FDbkQsSUFBSSxZQUFZLEtBQU07SUFDcEIsT0FBTztJQUNQLE9BQU87SUFDUCxZQUFZO0dBQ2Q7R0FDQSxRQUFRO0dBQ1IsUUFBUTtHQUNSLElBQUksYUFBYSxLQUFLLE1BQU0sTUFBTSxJQUFJO0dBQ3RDLElBQUksWUFBWSxvQkFBb0IsR0FBRztJQUNyQyxNQUFNLGVBQWU7S0FBQyxLQUFLLEtBQUs7S0FBRyxDQUFDLEtBQUssS0FBSztLQUFHLEtBQUssS0FBSztLQUFHLENBQUMsS0FBSyxLQUFLO0tBQUcsS0FBSyxLQUFLLElBQUk7S0FBRyxDQUFDLEtBQUssS0FBSyxJQUFJO0lBQUM7SUFDN0csSUFBSSxnQkFBZ0I7SUFDcEIsSUFBSSxnQkFBZ0I7SUFDcEIsS0FBSyxNQUFNLGVBQWUsY0FBYztLQUN0QyxNQUFNLGVBQWUsYUFBYTtLQUNsQyxJQUFJLFdBQVcsTUFBSyxpQkFBZ0IsS0FBSyxJQUFJLGVBQWUsWUFBWSxJQUFJLEVBQUcsS0FBSyxtQkFBbUIsR0FDckc7S0FFRixJQUFJLG9CQUFvQjtLQUN4QixlQUFlLFNBQVEsbUJBQWtCO01BQ3ZDLHFCQUFxQixLQUFLLElBQUksWUFBWSxLQUFLLGVBQWUsSUFBSSxXQUFXLEtBQUssS0FBSyxJQUFJLFlBQVksS0FBSyxlQUFlLElBQUksV0FBVztLQUM1SSxDQUFDO0tBQ0QsSUFBSSxvQkFBb0IsZUFBZTtNQUNyQyxnQkFBZ0I7TUFDaEIsZ0JBQWdCO0tBQ2xCO0lBQ0Y7SUFDQSxhQUFhO0lBQ2IsV0FBVyxLQUFLLFVBQVU7SUFDMUIsSUFBSSxXQUFXLFNBQVMsR0FDdEIsV0FBVyxNQUFNO0lBRW5CLElBQUksb0JBQW9CLEdBQUc7S0FDekIsY0FBYyxLQUFLLE9BQU8sSUFBSSxLQUFNLEtBQUssS0FBSyxJQUFJLENBQUMsS0FBSyxLQUFLO0tBQzdELG1CQUFtQjtLQUNuQixhQUFhLENBQUM7SUFDaEI7R0FDRjtHQUNBLE1BQU0scUJBQXFCLE1BQU0sd0JBQXdCO0dBQ3pELElBQUksb0JBQ0Ysd0JBQXdCO0dBRTFCLG9CQUFvQixXQUFXLElBQUksS0FBSyxJQUFJLFVBQVUsSUFBSSxLQUFNLFdBQVcsSUFBSSxLQUFLLElBQUksVUFBVSxJQUFJLEtBQU0sa0JBQWtCO0VBQ2hJLFNBQVMsZUFBZSxDQUFDO0NBQzNCO0NBQ0EsU0FBUyxrQkFBa0I7RUFDekIsT0FBTyxtQkFBbUI7RUFDMUIscUJBQXFCO0VBQ3JCLG1CQUFtQjtFQUNuQixhQUFhLENBQUM7RUFDZCxJQUFJLENBQUMsTUFBTSw4QkFBOEI7R0FDdkMsTUFBTSwrQkFBK0I7R0FDckMsY0FBYztFQUNoQjtFQUNBLGlCQUFpQixvQkFBb0I7Q0FDdkM7Q0FDQSxTQUFTLG1CQUFtQjtFQUMxQixPQUFPLG1CQUFtQjtFQUMxQixpQkFBaUIscUJBQXFCO0NBQ3hDO0NBQ0EsU0FBUyxrQkFBa0IsT0FBTztFQUNoQyxRQUFRLFNBQVMsT0FBTztFQUN4QixJQUFJO0dBQ0YsTUFBTSxZQUFZLGFBQWE7R0FDL0IsTUFBTSxZQUFZLGlCQUFpQixTQUFTO0dBQzVDLE1BQU0sZUFBZSxXQUFXLFlBQVk7R0FDNUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxjQUNqQixPQUFPO0dBRVQsTUFBTSxVQUFVLGFBQWEsU0FBUyxPQUFPLEtBQUEsSUFBWSxhQUFhLFNBQVMsS0FBSyxhQUFhLFNBQVM7R0FDMUcsTUFBTSxVQUFVLGFBQWEsU0FBUyxPQUFPLEtBQUEsSUFBWSxhQUFhLFNBQVMsS0FBSyxhQUFhLFNBQVM7R0FDMUcsSUFBSSxnQkFBZ0I7R0FDcEIsSUFBSSxjQUFjO0dBQ2xCLENBQUMsVUFBVSxnQkFBZ0IsQ0FBQyxFQUFBLENBQUcsU0FBUSxpQkFBZ0I7SUFDckQsSUFBSSxDQUFDLGdCQUFnQixhQUFhLE9BQU8sYUFBYSxNQUFNLE9BQU8sZ0JBQWdCLElBQUksYUFBYSxFQUFFLEdBQ3BHO0lBRUYsTUFBTSxPQUFPLGFBQWEsVUFBVSxPQUFPLEtBQUEsSUFBWSxhQUFhLFNBQVMsS0FBSyxhQUFhLFVBQVU7SUFDekcsTUFBTSxPQUFPLGFBQWEsVUFBVSxPQUFPLEtBQUEsSUFBWSxhQUFhLFNBQVMsS0FBSyxhQUFhLFVBQVU7SUFDekcsSUFBSSxRQUFRLFFBQVEsUUFBUSxRQUFRLGNBQWMsWUFBWSxLQUFLLGNBQWMsTUFBTSxJQUFJLEdBQ3pGO0lBRUYsTUFBTSxXQUFXLGtCQUFrQixTQUFTLFNBQVMsTUFBTSxJQUFJO0lBQy9ELElBQUksV0FBVyxlQUFlLFdBQVcsT0FBTztLQUM5QyxjQUFjO0tBQ2QsZ0JBQWdCO01BQ2QsSUFBSSxhQUFhO01BQ2pCLEdBQUc7TUFDSCxHQUFHO01BQ087TUFDVixRQUFRO0tBQ1Y7SUFDRjtHQUNGLENBQUM7R0FDRCxPQUFPO0VBQ1QsU0FBUyxPQUFPO0dBQ2QsT0FBTztFQUNUO0NBQ0Y7Q0FDQSxTQUFTLG9CQUFvQixhQUFhO0VBQ3hDLGNBQWMsZUFBZSxPQUFPO0VBQ3BDLElBQUk7R0FDRixNQUFNLFFBQVEsYUFBYTtHQUMzQixNQUFNLFFBQVEsaUJBQWlCLEtBQUs7R0FDcEMsTUFBTSxXQUFXLE9BQU8sWUFBWTtHQUNwQyxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQ2IsT0FBTyxDQUFDO0dBRVYsTUFBTSxNQUFNLFNBQVMsU0FBUyxPQUFPLEtBQUEsSUFBWSxTQUFTLFNBQVMsS0FBSyxTQUFTLFNBQVM7R0FDMUYsTUFBTSxNQUFNLFNBQVMsU0FBUyxPQUFPLEtBQUEsSUFBWSxTQUFTLFNBQVMsS0FBSyxTQUFTLFNBQVM7R0FDMUYsTUFBTSxrQkFBa0IsQ0FBQztHQUN6QixDQUFDLE1BQU0sZ0JBQWdCLENBQUMsRUFBQSxDQUFHLFNBQVEsaUJBQWdCO0lBQ2pELElBQUksQ0FBQyxnQkFBZ0IsYUFBYSxPQUFPLFNBQVMsTUFBTSxPQUFPLGdCQUFnQixJQUFJLGFBQWEsRUFBRSxHQUNoRztJQUVGLE1BQU0sT0FBTyxhQUFhLFVBQVUsT0FBTyxLQUFBLElBQVksYUFBYSxTQUFTLEtBQUssYUFBYSxVQUFVO0lBQ3pHLE1BQU0sT0FBTyxhQUFhLFVBQVUsT0FBTyxLQUFBLElBQVksYUFBYSxTQUFTLEtBQUssYUFBYSxVQUFVO0lBQ3pHLElBQUksUUFBUSxRQUFRLFFBQVEsUUFBUSxjQUFjLFlBQVksS0FBSyxjQUFjLE1BQU0sSUFBSSxHQUN6RjtJQUVGLE1BQU0sV0FBVyxrQkFBa0IsS0FBSyxLQUFLLE1BQU0sSUFBSTtJQUN2RCxJQUFJLFdBQVcsYUFDYixnQkFBZ0IsS0FBSztLQUNuQixJQUFJLGFBQWE7S0FDakIsR0FBRztLQUNILEdBQUc7S0FDTztLQUNWLFFBQVE7SUFDVixDQUFDO0dBRUwsQ0FBQztHQUNELE9BQU8sZ0JBQWdCLE1BQU0sU0FBUyxZQUFZLFFBQVEsV0FBVyxRQUFRLFFBQVE7RUFDdkYsU0FBUyxLQUFLO0dBQ1osT0FBTyxDQUFDO0VBQ1Y7Q0FDRjtDQUNBLFNBQVMsMkJBQTJCO0VBQ2xDLElBQUksQ0FBQyxPQUFPLHNCQUNWLE9BQU87R0FDTCxHQUFHO0dBQ0gsR0FBRztFQUNMO0VBRUYsTUFBTSxhQUFhLGtCQUFrQjtFQUNyQyxJQUFJLENBQUMsWUFDSCxPQUFPO0dBQ0wsR0FBRztHQUNILEdBQUc7RUFDTDtFQUVGLElBQUksU0FBUztFQUNiLElBQUksU0FBUztFQUNiLElBQUk7R0FDRixNQUFNLFlBQVksYUFBYTtHQUMvQixNQUFNLFlBQVksaUJBQWlCLFNBQVM7R0FDNUMsTUFBTSxXQUFXLFdBQVcsWUFBWTtHQUN4QyxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQ2pCLE9BQU87SUFDTCxHQUFHO0lBQ0gsR0FBRztHQUNMO0dBRUYsQ0FBQyxVQUFVLGdCQUFnQixDQUFDLEVBQUEsQ0FBRyxTQUFRLGlCQUFnQjtJQUNyRCxJQUFJLENBQUMsZ0JBQWdCLGFBQWEsT0FBTyxTQUFTLE1BQU0sQ0FBQyxjQUFjLFlBQVksR0FDakY7SUFFRixNQUFNLFVBQVUsYUFBYSxVQUFVLE9BQU8sS0FBQSxJQUFZLGFBQWEsU0FBUyxLQUFLLGFBQWEsVUFBVTtJQUM1RyxNQUFNLFVBQVUsYUFBYSxVQUFVLE9BQU8sS0FBQSxJQUFZLGFBQWEsU0FBUyxLQUFLLGFBQWEsVUFBVTtJQUM1RyxJQUFJLFdBQVcsUUFBUSxXQUFXLE1BQ2hDO0lBRUYsTUFBTSxtQkFBbUIsa0JBQWtCLFdBQVcsR0FBRyxXQUFXLEdBQUcsU0FBUyxPQUFPO0lBQ3ZGLElBQUksbUJBQW1CLE9BQU8sdUJBQXVCO0tBQ25ELE1BQU0sU0FBUyxXQUFXLElBQUk7S0FDOUIsTUFBTSxTQUFTLFdBQVcsSUFBSTtLQUM5QixNQUFNLGFBQWEsS0FBSyxLQUFLLFNBQVMsU0FBUyxTQUFTLE1BQU07S0FDOUQsTUFBTSxtQkFBbUIsT0FBTyx3QkFBd0IsS0FBSyxJQUFJLGtCQUFrQixFQUFFLEtBQUssT0FBTztLQUNqRyxJQUFJLGFBQWEsR0FBRztNQUNsQixVQUFVLFNBQVMsYUFBYSxrQkFBa0I7TUFDbEQsVUFBVSxTQUFTLGFBQWEsa0JBQWtCO0tBQ3BEO0lBQ0Y7R0FDRixDQUFDO0VBQ0gsU0FBUyxPQUFPLENBQUM7RUFDakIsT0FBTztHQUNMLEdBQUc7R0FDSCxHQUFHO0VBQ0w7Q0FDRjs7O0NDeFhBLE9BQU8saUJBQWlCO0NBQ3hCLE9BQU8sZUFBZTtDQUN0QixPQUFPLGdCQUFnQjtDQUN2QixPQUFPLGdCQUFnQjtDQUN2QixPQUFPLGlCQUFpQjtDQUN4QixPQUFPLHVCQUF1QjtDQUM5QixPQUFPLHdCQUF3QjtDQUMvQixPQUFPLGdCQUFnQjtFQUNyQixXQUFXO0VBQ1gsV0FBVztDQUNiO0NBQ0EsT0FBTyx1QkFBdUIsQ0FBQztDQUMvQixPQUFPLHNCQUFzQjtDQUM3QixPQUFPLHdCQUF3QjtDQUMvQixPQUFPLDBCQUEwQjtDQUNqQyxPQUFPLGtDQUFrQixJQUFJLElBQUk7Q0FDakMsT0FBTyx3QkFBd0I7Q0FDL0IsT0FBTyxvQkFBb0IsQ0FBQztDQUc1QixTQUFTLGVBQWU7RUFDdEIsSUFBSTtHQUNGLElBQUksTUFBTSxjQUFjLE1BQU0sV0FBVyxhQUFhLE1BQU0sV0FBVyxVQUFVLFNBQVMsR0FDeEYsT0FBTyxNQUFNO0dBRWYsTUFBTSxTQUFTLE9BQU8sTUFBTTtHQUM1QixJQUFJLENBQUMsUUFDSCxPQUFPLE1BQU0sY0FBYztHQUU3QixLQUFLLElBQUksYUFBYSxHQUFHLGFBQWEsT0FBTyxRQUFRLGNBQWM7SUFDakUsSUFBSSxPQUFPLFdBQVcsRUFBRSxXQUFXLFdBQ2pDLE9BQU8sT0FBTyxXQUFXLENBQUM7SUFFNUIsSUFBSSxPQUFPLFdBQVcsRUFBRTtVQUNqQixNQUFNLGNBQWMsT0FBTyxLQUFLLE9BQU8sV0FBVyxDQUFDLFdBQVcsR0FDakUsSUFBSSxPQUFPLFdBQVcsQ0FBQyxZQUFZLFdBQVcsRUFBRSxXQUM5QyxPQUFPLE9BQU8sV0FBVyxDQUFDLFlBQVk7SUFBQTtHQUk5QztHQUNBLE9BQU8sTUFBTSxjQUFjO0VBQzdCLFNBQVMsT0FBTztHQUNkLE9BQU8sTUFBTSxjQUFjO0VBQzdCO0NBQ0Y7Q0FDQSxTQUFTLGVBQWUsVUFBVTtFQUNoQyxJQUFJO0dBQ0YsTUFBTSxZQUFZLGFBQWE7R0FDL0IsSUFBSSxDQUFDLFdBQ0gsT0FBTztHQUVULE1BQU0sWUFBWSxpQkFBaUIsU0FBUztHQUM1QyxJQUFJLENBQUMsV0FDSCxPQUFPO0dBRVQsSUFBSSxTQUFTLFVBQVUsZUFBZSxVQUFVLGFBQWEsWUFBWTtHQUN6RSxJQUFJLENBQUMsVUFBVSxVQUFVLGNBQ3ZCLFNBQVMsVUFBVSxhQUFhLE1BQUssaUJBQWdCLGFBQWEsT0FBTyxRQUFRO0dBRW5GLElBQUksQ0FBQyxVQUFVLFVBQVUsdUJBQ3ZCLEtBQUssSUFBSSxVQUFVLE9BQU8sS0FBSyxVQUFVLHFCQUFxQixHQUFHO0lBQy9ELE1BQU0sVUFBVSxVQUFVLHNCQUFzQjtJQUNoRCxJQUFJLE1BQU0sUUFBUSxPQUFPLEdBQ3ZCLFNBQVMsUUFBUSxNQUFLLGdCQUFlLGVBQWUsWUFBWSxPQUFPLFFBQVE7U0FDMUUsSUFBSSxXQUFXLFFBQVEsT0FBTyxVQUNuQyxTQUFTO0lBRVgsSUFBSSxRQUNGO0dBRUo7R0FFRixPQUFPO0VBQ1QsU0FBUyxPQUFPO0dBQ2QsT0FBTztFQUNUO0NBQ0Y7Q0FDQSxNQUFNLGlCQUFpQjtDQUN2QixNQUFNLGVBQWU7Q0FDckIsTUFBTSxrQkFBa0I7Q0FDeEIsSUFBSSxxQkFBcUI7Q0FDekIsTUFBTSx5QkFBeUI7Q0FDL0IsU0FBUyxpQkFBaUIsTUFBTSxNQUFNO0VBRXBDLE9BQU8sb0JBQW9CLE9BQU8sa0JBQWtCLFFBQU8sY0FBYSxNQUFNLGNBQWMsVUFBVSxPQUFPLGVBQWU7RUFDNUgsSUFBSSxlQUFlLE9BQU8sa0JBQWtCLE1BQUssYUFBWSxrQkFBa0IsTUFBTSxNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsSUFBSSxjQUFjO0VBQ25JLElBQUksY0FBYztHQUNoQixhQUFhO0dBQ2IsYUFBYSxPQUFPLE1BQU07R0FDMUIsSUFBSSxhQUFhLGFBQWEsY0FBYztJQUMxQyxhQUFhLFVBQVU7SUFDdkIsaUJBQWlCLGdDQUFnQztHQUNuRDtFQUNGLE9BQ0UsT0FBTyxrQkFBa0IsS0FBSztHQUM1QixHQUFHO0dBQ0gsR0FBRztHQUNILFFBQVE7R0FDUixNQUFNLE1BQU07R0FDWixXQUFXO0dBQ1gsU0FBUztFQUNYLENBQUM7Q0FFTDtDQUNBLFNBQVMsY0FBYyxHQUFHLEdBQUc7RUFDM0IsTUFBTSxNQUFNLEtBQUssSUFBSTtFQUNyQixPQUFPLG9CQUFvQixPQUFPLGtCQUFrQixRQUFPLG1CQUFrQixNQUFNLGVBQWUsT0FBTyxlQUFlO0VBQ3hILE9BQU8sT0FBTyxrQkFBa0IsTUFBSyxtQkFBa0IsZUFBZSxXQUFXLGtCQUFrQixHQUFHLEdBQUcsZUFBZSxHQUFHLGVBQWUsQ0FBQyxJQUFJLGVBQWUsTUFBTTtDQUN0SztDQUNBLFNBQVMsb0JBQW9CLFFBQVEsZUFBZTtFQUNsRCxNQUFNLGFBQWEsb0JBQW9CLGlCQUFpQixPQUFPLGFBQWE7RUFDNUUsSUFBSSxDQUFDLFdBQVcsUUFDZCxPQUFPO0VBRVQsSUFBSSxjQUFjO0VBQ2xCLElBQUksV0FBVztFQUNmLFdBQVcsU0FBUSw2QkFBNEI7R0FDN0MsSUFBSSxlQUFlO0dBQ25CLElBQUksU0FBUztHQUNiLElBQUksU0FBUztHQUNiLFdBQVcsU0FBUSxtQkFBa0I7SUFDbkMsSUFBSSxrQkFBa0IseUJBQXlCLEdBQUcseUJBQXlCLEdBQUcsZUFBZSxHQUFHLGVBQWUsQ0FBQyxLQUFLLFVBQVUsTUFBTTtLQUNuSTtLQUNBLFVBQVUsZUFBZTtLQUN6QixVQUFVLGVBQWU7SUFDM0I7R0FDRixDQUFDO0dBQ0QsSUFBSSxlQUFlLFVBQVU7SUFDM0IsV0FBVztJQUNYLGNBQWM7S0FDWixHQUFHLFNBQVM7S0FDWixHQUFHLFNBQVM7S0FDWixXQUFXO0lBQ2I7R0FDRjtFQUNGLENBQUM7RUFDRCxPQUFPO0NBQ1Q7Q0FDQSxJQUFJLHNCQUFzQjtDQUMxQixTQUFTLHNCQUFzQjtFQUM3QixJQUFJLENBQUMsT0FBTyxnQkFDVjtFQUVGLE1BQU0sTUFBTSxLQUFLLElBQUk7RUFDckIsSUFBSSxNQUFNLHNCQUFzQixLQUM5QjtFQUVGLHNCQUFzQjtFQUN0QixNQUFNLGFBQWEsY0FBYztFQUNqQyxNQUFNLGNBQWMsT0FBTyxLQUFLLE1BQU0sS0FBSyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUM7RUFDNUQsTUFBTSxlQUFlO0dBQ25CLEtBQUs7R0FDTCxNQUFNLFVBQVU7R0FDaEIsU0FBUyxZQUFZLFdBQVcsQ0FBQztHQUNqQyxPQUFPLFlBQVksV0FBVyxDQUFDO0dBQy9CLFNBQVM7R0FDVCxZQUFZO0VBQ2Q7RUFDQTtHQUFDO0dBQVE7R0FBVSxTQUFTO0dBQU07RUFBVSxDQUFDLENBQUMsU0FBUSxrQkFBaUI7R0FDckUsSUFBSSxDQUFDLGVBQ0g7R0FFRixJQUFJO0lBQ0YsY0FBYyxjQUFjLElBQUksY0FBYyxXQUFXLFlBQVksQ0FBQztJQUN0RSxpQkFBaUIsY0FBYyxjQUFjLElBQUksY0FBYyxTQUFTLFlBQVksQ0FBQyxHQUFHLEVBQUU7R0FDNUYsU0FBUyxTQUFTLENBQUM7RUFDckIsQ0FBQztDQUNIO0NBQ0EsSUFBSSxtQkFBbUI7Q0FDdkIsSUFBSSxrQkFBa0I7Q0FDdEIsSUFBSSxVQUFVO0NBQ2QsSUFBSSxxQkFBcUI7Q0FDekIsSUFBSSxjQUFjO0NBQ2xCLElBQUksb0JBQW9CO0NBQ3hCLFNBQVMsb0JBQW9CLFlBQVk7RUFFdkMsSUFBSSxNQUFNLGNBQWMscUJBQXFCLE1BQzNDLE9BQU87RUFFVCxxQkFBcUIsTUFBTTtFQUMzQixJQUFJLGlCQUNGLElBQUksa0JBQWtCLFdBQVcsR0FBRyxXQUFXLEdBQUcsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxJQUFJO0dBQzVGO0dBQ0EsSUFBSSxXQUFXLEtBQUssT0FBTyx1QkFBdUI7SUFDaEQsaUJBQWlCLE9BQU8sc0JBQXNCLEdBQUcsT0FBTyxzQkFBc0IsQ0FBQztJQUMvRSxPQUFPLGdCQUFnQixJQUFJLE9BQU8sc0JBQXNCLEVBQUU7SUFDMUQsT0FBTyx3QkFBd0I7SUFDL0IsT0FBTywwQkFBMEI7SUFDakMsVUFBVTtHQUNaO0dBQ0EsSUFBSSxXQUFXLEdBQUc7SUFDaEIsVUFBVTtJQUNWLE9BQU8sd0JBQXdCO0lBQy9CLE9BQU8sMEJBQTBCO0lBQ2pDLE1BQU0sY0FBYyxLQUFLLE9BQU8sSUFBSSxLQUFLLEtBQUs7SUFDOUMsb0JBQW9CLFdBQVcsSUFBSSxLQUFLLElBQUksV0FBVyxJQUFJLE1BQU0sV0FBVyxJQUFJLEtBQUssSUFBSSxXQUFXLElBQUksTUFBTSxJQUFJO0lBQ2xILE9BQU87R0FDVDtFQUNGLE9BQ0UsVUFBVTtFQUdkLGtCQUFrQjtHQUNoQixHQUFHLFdBQVc7R0FDZCxHQUFHLFdBQVc7RUFDaEI7RUFDQSxPQUFPO0NBQ1Q7Q0FDQSxTQUFTLG1CQUFtQjtFQUMxQixNQUFNLFlBQVksa0JBQWtCO0VBQ3BDLElBQUksQ0FBQyxXQUNIO0VBRUYsT0FBTyx1QkFBdUIsQ0FBQztFQUMvQixLQUFLLElBQUksSUFBSSxHQUFHLElBQUksR0FBRyxLQUFLO0dBQzFCLE1BQU0sUUFBUSxLQUFLLEtBQUssSUFBSSxJQUFJO0dBQ2hDLE9BQU8scUJBQXFCLEtBQUs7SUFDL0IsR0FBRyxVQUFVLElBQUksS0FBSyxJQUFJLEtBQUssSUFBSTtJQUNuQyxHQUFHLFVBQVUsSUFBSSxLQUFLLElBQUksS0FBSyxJQUFJO0dBQ3JDLENBQUM7RUFDSDtFQUNBLE9BQU8sc0JBQXNCO0NBQy9CO0NBQ0EsU0FBUyxlQUFlO0VBQ3RCLElBQUksQ0FBQyxPQUFPLGdCQUFnQjtHQUMxQixtQkFBbUI7R0FDbkI7RUFDRjtFQUVBLElBQUksTUFBTSxjQUFjLE9BQU8sd0JBQXdCLE1BQU87R0FDNUQsT0FBTyxnQkFBZ0IsTUFBTTtHQUM3QixPQUFPLHdCQUF3QixNQUFNO0VBQ3ZDO0VBQ0EsSUFBSSxPQUFPLHlCQUF5QixPQUFPLDBCQUEwQixLQUFLLE1BQU0sY0FBYyxPQUFPLDBCQUEwQixLQUFNO0dBQ25JLGlCQUFpQixPQUFPLHNCQUFzQixHQUFHLE9BQU8sc0JBQXNCLENBQUM7R0FDL0UsT0FBTyxnQkFBZ0IsSUFBSSxPQUFPLHNCQUFzQixFQUFFO0dBQzFELE9BQU8sd0JBQXdCO0dBQy9CLE9BQU8sMEJBQTBCO0dBQ2pDLFdBQVcsY0FBYyxHQUFHO0dBQzVCO0VBQ0Y7RUFDQSxJQUFJO0dBQ0YsTUFBTSxnQkFBZ0Isa0JBQWtCO0dBQ3hDLElBQUksQ0FBQyxlQUFlO0lBQ2xCLE9BQU8saUJBQWlCO0lBQ3hCLG1CQUFtQjtJQUNuQixNQUFNLGlCQUFpQixTQUFTLGVBQWUsYUFBYTtJQUM1RCxJQUFJLGdCQUFnQjtLQUNsQixlQUFlLGNBQWM7S0FDN0IsZUFBZSxVQUFVLE9BQU8sV0FBVztJQUM3QztJQUNBO0dBQ0Y7R0FDQSxJQUFJLEtBQUssT0FBTyxJQUFJLE1BQ2xCLG9CQUFvQjtHQUV0QixJQUFJLG9CQUFvQixhQUFhLEdBQUc7SUFDdEMsV0FBVyxjQUFjLEdBQUc7SUFDNUI7R0FDRjtHQUNBLE1BQU0sZUFBZSx5QkFBeUI7R0FDOUMsS0FBSyxLQUFLLElBQUksYUFBYSxDQUFDLElBQUksT0FBTyxLQUFLLElBQUksYUFBYSxDQUFDLElBQUksUUFBUSxPQUFPLHNCQUFzQjtJQUNyRyxNQUFNLGNBQWMsT0FBTyxpQkFBaUIsTUFBTSxjQUFjLHFCQUFxQjtJQUNyRixJQUFJLGFBQ0YscUJBQXFCLE1BQU07SUFFN0Isb0JBQW9CLGNBQWMsSUFBSSxhQUFhLEdBQUcsY0FBYyxJQUFJLGFBQWEsR0FBRyxXQUFXO0lBQ25HLFdBQVcsY0FBYyxFQUFFO0lBQzNCO0dBQ0Y7R0FDQSxJQUFJLFVBQVU7R0FDZCxJQUFJLFVBQVU7R0FDZCxJQUFJLGNBQWM7R0FDbEIsSUFBSSxPQUFPLGlCQUFpQixXQUFXO0lBQ3JDLE1BQU0sZ0JBQWdCLGtCQUFrQjtJQUN4QyxJQUFJLGVBQWU7S0FDakIsVUFBVSxjQUFjLElBQUksYUFBYSxJQUFJO0tBQzdDLFVBQVUsY0FBYyxJQUFJLGFBQWEsSUFBSTtLQUM3QyxjQUFjLGNBQWM7S0FDNUIsSUFBSSxDQUFDLE9BQU8seUJBQXlCLE9BQU8sc0JBQXNCLE9BQU8sY0FBYyxJQUFJO01BQ3pGLElBQUksT0FBTyx1QkFDVCxPQUFPLGNBQWM7TUFFdkIsT0FBTyx3QkFBd0I7TUFDL0IsT0FBTywwQkFBMEIsTUFBTTtNQUN2QyxVQUFVO0tBQ1o7S0FDQSxJQUFJLGNBQWMsV0FBVyxJQUFJO01BQy9CLFlBQVksS0FBSyxPQUFPLElBQUksTUFBTztNQUNuQyxZQUFZLEtBQUssT0FBTyxJQUFJLE1BQU87S0FDckM7SUFDRixPQUFPO0tBQ0wsT0FBTyx3QkFBd0I7S0FDL0IsT0FBTywwQkFBMEI7S0FDakMsSUFBSSxNQUFNLGNBQWMsb0JBQW9CLE1BQU07TUFDaEQsY0FBYyxLQUFLLE9BQU8sSUFBSSxLQUFLLEtBQUs7TUFDeEMsb0JBQW9CLE1BQU07S0FDNUI7S0FDQSxVQUFVLGNBQWMsSUFBSSxLQUFLLElBQUksV0FBVyxJQUFJO0tBQ3BELFVBQVUsY0FBYyxJQUFJLEtBQUssSUFBSSxXQUFXLElBQUk7S0FDcEQsY0FBYztJQUNoQjtHQUNGLE9BQU8sSUFBSSxPQUFPLGlCQUFpQixXQUFXO0lBQzVDLE1BQU0sbUJBQW1CLG9CQUFvQixLQUFLLE9BQU8sYUFBYTtJQUN0RSxJQUFJLG9CQUFvQixpQkFBaUIsYUFBYSxHQUFHO0tBQ3ZELFVBQVUsaUJBQWlCLElBQUksYUFBYSxJQUFJO0tBQ2hELFVBQVUsaUJBQWlCLElBQUksYUFBYSxJQUFJO0tBQ2hELGNBQWMsa0JBQWtCLGNBQWMsR0FBRyxjQUFjLEdBQUcsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUM7SUFDMUcsT0FBTztLQUNMLE1BQU0sZUFBZSxrQkFBa0I7S0FDdkMsSUFBSSxjQUFjO01BQ2hCLFVBQVUsYUFBYTtNQUN2QixVQUFVLGFBQWE7TUFDdkIsY0FBYyxhQUFhO01BQzNCLElBQUksQ0FBQyxPQUFPLHlCQUF5QixPQUFPLHNCQUFzQixPQUFPLGFBQWEsSUFBSTtPQUN4RixPQUFPLHdCQUF3QjtPQUMvQixPQUFPLDBCQUEwQixNQUFNO01BQ3pDO0tBQ0YsT0FBTztNQUNMLE9BQU8sd0JBQXdCO01BQy9CLE9BQU8sMEJBQTBCO01BQ2pDLElBQUksTUFBTSxjQUFjLG9CQUFvQixNQUFNO09BQ2hELGNBQWMsS0FBSyxPQUFPLElBQUksS0FBSyxLQUFLO09BQ3hDLG9CQUFvQixNQUFNO01BQzVCO01BQ0EsVUFBVSxjQUFjLElBQUksS0FBSyxJQUFJLFdBQVcsSUFBSTtNQUNwRCxVQUFVLGNBQWMsSUFBSSxLQUFLLElBQUksV0FBVyxJQUFJO01BQ3BELGNBQWM7S0FDaEI7SUFDRjtHQUNGLE9BQU8sSUFBSSxPQUFPLGlCQUFpQixVQUFVO0lBQzNDLElBQUksQ0FBQyxPQUFPLHFCQUFxQixRQUMvQixpQkFBaUI7SUFFbkIsTUFBTSxpQkFBaUIsa0JBQWtCLEdBQUc7SUFDNUMsSUFBSSxnQkFBZ0I7S0FDbEIsVUFBVSxlQUFlO0tBQ3pCLFVBQVUsZUFBZTtLQUN6QixjQUFjLGVBQWU7S0FDN0IsSUFBSSxDQUFDLE9BQU8seUJBQXlCLE9BQU8sc0JBQXNCLE9BQU8sZUFBZSxJQUFJO01BQzFGLE9BQU8sd0JBQXdCO01BQy9CLE9BQU8sMEJBQTBCLE1BQU07S0FDekM7SUFDRixPQUFPO0tBQ0wsT0FBTyx3QkFBd0I7S0FDL0IsT0FBTywwQkFBMEI7S0FDakMsTUFBTSxxQkFBcUIsT0FBTyxxQkFBcUIsT0FBTztLQUM5RCxJQUFJLG9CQUFvQjtNQUN0QixjQUFjLGtCQUFrQixjQUFjLEdBQUcsY0FBYyxHQUFHLG1CQUFtQixHQUFHLG1CQUFtQixDQUFDO01BQzVHLElBQUksY0FBYyxLQUNoQixPQUFPLHVCQUF1QixPQUFPLHNCQUFzQixLQUFLLE9BQU8scUJBQXFCO01BRTlGLFVBQVUsbUJBQW1CO01BQzdCLFVBQVUsbUJBQW1CO0tBQy9CO0lBQ0Y7R0FDRjtHQUNBLElBQUksV0FBVyxNQUFNO0lBQ25CLE1BQU0sbUJBQW1CLE9BQU8saUJBQWlCLGNBQWMsT0FBTyxNQUFNLGNBQWMscUJBQXFCO0lBQy9HLElBQUksa0JBQ0YscUJBQXFCLE1BQU07SUFFN0Isb0JBQW9CLFNBQVMsU0FBUyxnQkFBZ0I7R0FDeEQ7RUFDRixTQUFTLGNBQWM7R0FDckIsUUFBUSxNQUFNLGNBQWMsWUFBWTtFQUMxQztFQUNBLFdBQVcsY0FBYyxFQUFFO0NBQzdCO0NBQ0EsU0FBUyxjQUFjLFVBQVU7RUFDL0IsT0FBTyxlQUFlLFlBQVk7RUFDbEMsT0FBTyxpQkFBaUI7RUFDeEIsT0FBTyxjQUFjLFlBQVksS0FBSyxJQUFJO0VBQzFDLE9BQU8sY0FBYyxZQUFZO0VBQ2pDLE9BQU8sd0JBQXdCO0VBQy9CLE9BQU8sMEJBQTBCO0VBQ2pDLE9BQU8sZ0JBQWdCLE1BQU07RUFDN0IsT0FBTyxvQkFBb0IsQ0FBQztFQUM1QixPQUFPLHdCQUF3QixLQUFLLElBQUk7RUFDeEMsa0JBQWtCO0VBQ2xCLFVBQVU7RUFDVixxQkFBcUI7RUFDckIscUJBQXFCO0VBQ3JCLElBQUksYUFBYSxVQUNmLGlCQUFpQjtFQUVuQixpQkFBaUIsd0JBQXdCLE9BQU8sZUFBZSxHQUFHO0VBQ2xFLElBQUksQ0FBQyxrQkFBa0I7R0FDckIsbUJBQW1CO0dBQ25CLGFBQWE7RUFDZjtDQUNGO0NBQ0EsU0FBUyxlQUFlO0VBQ3RCLE9BQU8saUJBQWlCO0VBQ3hCLG1CQUFtQjtFQUNuQixpQkFBaUIsb0JBQW9CLE9BQU8sY0FBYyxZQUFZLGdCQUFnQixLQUFLLElBQUksSUFBSSxPQUFPLGNBQWMsYUFBYSxJQUFBLENBQU0sUUFBUSxDQUFDLElBQUksR0FBRztDQUM3SjtDQUNBLFNBQVMsb0JBQW9CO0VBQzNCLElBQUksQ0FBQyxNQUFNLGNBQWMsQ0FBQyxNQUFNLFdBQVcsU0FBUztHQUNsRCxpQkFBaUIsdUJBQXVCO0dBQ3hDO0VBQ0Y7RUFDQSxJQUFJLE1BQU0sZ0JBQWdCO0dBQ3hCLE1BQU0sV0FBVyxRQUFRLE1BQU0sSUFBSSxDQUFDO0dBQ3BDLE1BQU0sV0FBVyxRQUFRLE1BQU0sSUFBSSxHQUFHLENBQUM7R0FDdkMsTUFBTSxpQkFBaUI7R0FDdkIsaUJBQWlCLGtCQUFrQjtFQUNyQyxPQUFPO0dBQ0wsTUFBTSxXQUFXLFFBQVEsTUFBTSxJQUFJLEVBQUc7R0FDdEMsTUFBTSxXQUFXLFFBQVEsTUFBTSxJQUFJLEtBQUssR0FBRztHQUMzQyxNQUFNLGlCQUFpQjtHQUN2QixpQkFBaUIsdUJBQXVCO0VBQzFDO0NBQ0Y7OztDQ25hQSxTQUFTLFdBQVcsV0FBVztFQUM3QixNQUFNLGNBQWMsU0FBUztFQUU3QixNQUFNLG1CQUFtQjtHQUN2QixNQUFNO0lBQ0osS0FBSztJQUNMLE1BQU07SUFDTixRQUFRO0lBQ1IsTUFBTTtJQUNOLFNBQVM7SUFDVCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxRQUFRO0lBQ1IsT0FBTztHQUNUO0dBQ0EsTUFBTTtJQUNKLEtBQUs7SUFDTCxNQUFNO0lBQ04sUUFBUTtJQUNSLE1BQU07SUFDTixTQUFTO0lBQ1QsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsUUFBUTtJQUNSLE9BQU87R0FDVDtHQUNBLEtBQUs7SUFDSCxLQUFLO0lBQ0wsTUFBTTtJQUNOLFFBQVE7SUFDUixNQUFNO0lBQ04sU0FBUztJQUNULEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLFFBQVE7SUFDUixPQUFPO0dBQ1Q7R0FDQSxPQUFPO0lBQ0wsS0FBSztJQUNMLE1BQU07SUFDTixRQUFRO0lBQ1IsTUFBTTtJQUNOLFNBQVM7SUFDVCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxRQUFRO0lBQ1IsT0FBTztHQUNUO0dBQ0EsTUFBTTtJQUNKLEtBQUs7SUFDTCxNQUFNO0lBQ04sUUFBUTtJQUNSLE1BQU07SUFDTixTQUFTO0lBQ1QsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsUUFBUTtJQUNSLE9BQU87R0FDVDtHQUNBLFVBQVU7SUFDUixLQUFLO0lBQ0wsTUFBTTtJQUNOLFFBQVE7SUFDUixNQUFNO0lBQ04sU0FBUztJQUNULEtBQUs7SUFDTCxLQUFLO0lBQ0wsS0FBSztJQUNMLFFBQVE7SUFDUixPQUFPO0dBQ1Q7R0FDQSxLQUFLO0lBQ0gsS0FBSztJQUNMLE1BQU07SUFDTixRQUFRO0lBQ1IsTUFBTTtJQUNOLFNBQVM7SUFDVCxLQUFLO0lBQ0wsS0FBSztJQUNMLEtBQUs7SUFDTCxRQUFRO0lBQ1IsT0FBTztHQUNUO0dBQ0EsV0FBVztJQUNULEtBQUs7SUFDTCxNQUFNO0lBQ04sUUFBUTtJQUNSLE1BQU07SUFDTixTQUFTO0lBQ1QsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsUUFBUTtJQUNSLE9BQU87R0FDVDtHQUNBLEdBbEdrQixLQUFLLE1BQU0sYUFBYSxRQUFRLGNBQWMsS0FBSyxJQWtHeEQ7RUFDZjtFQUNBLE1BQU0sYUFBYSxpQkFBaUIsYUFBYSxZQUFZO0VBQzdELE1BQU0sYUFBYSxpQkFBaUI7RUFDcEMsT0FBTyxRQUFRO0dBQ2IsU0FBUyxXQUFXO0dBQ3BCLFdBQVcsV0FBVztHQUN0QixhQUFhLFdBQVc7R0FDeEIsVUFBVSxXQUFXO0dBQ3JCLGNBQWMsV0FBVztHQUN6QixTQUFTLFdBQVc7R0FDcEIsU0FBUyxXQUFXO0dBQ3BCLFNBQVMsV0FBVztHQUNwQixTQUFTLFdBQVc7R0FDcEIsU0FBUyxXQUFXO0VBQ3RCLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsc0JBQXNCLFlBQVksTUFBTSxZQUFZLGlCQUFpQixnQkFBZ0IsQ0FBQztFQUNwSCxhQUFhLFFBQVEsU0FBUyxVQUFVO0NBQzFDO0NBQ0EsU0FBUyxzQkFBc0I7RUFDN0IsTUFBTSxxQkFBcUIsYUFBYSxRQUFRLE9BQU8sS0FBSztFQUM1RCxJQUFJLENBQUMsb0JBQ0g7RUFFRixNQUFNLDhCQUE4QjtHQUNsQyxNQUFNLHdCQUF3QixTQUFTLGNBQWMsVUFBVTtHQUMvRCxJQUFJLHVCQUNGLHNCQUFzQixNQUFNLFlBQVksb0JBQW9CLFdBQVcscUJBQXFCLE9BQU8sV0FBVztFQUVsSDtFQUNBLElBQUksQ0FBQyxTQUFTLGNBQWMsVUFBVSxHQUFHO0dBQ3ZDLE1BQU0sa0JBQWtCLGtCQUFrQjtJQUN4QyxJQUFJLFNBQVMsY0FBYyxVQUFVLEdBQUc7S0FDdEMsY0FBYyxlQUFlO0tBQzdCLHNCQUFzQjtJQUN4QjtHQUNGLEdBQUcsR0FBRztFQUNSLE9BQ0Usc0JBQXNCO0NBRTFCO0NBQ0EsU0FBUyxlQUFlO0VBQ3RCLE1BQU0sZUFBZSxTQUFTLGNBQWMsT0FBTztFQUNuRCxhQUFhLGNBQWM7RUFDM0IsU0FBUyxLQUFLLFlBQVksWUFBWTtDQUN4Qzs7O0NDOUlBLElBQUksZUFBZTtDQUNuQixTQUFTLG1CQUFtQixVQUFVLGlCQUFpQjtFQUNyRCxJQUFJLGNBQ0YsY0FBYyxZQUFZO0VBRTVCLE1BQU0sWUFBWTtFQUNsQixlQUFlLGtCQUFrQjtHQUMvQixnQkFBZ0IsUUFBUTtFQUMxQixHQUFHLGtCQUFrQixHQUFJO0NBQzNCO0NBQ0EsU0FBUyxnQkFBZ0I7RUFDdkIsSUFBSSxjQUFjO0dBQ2hCLGNBQWMsWUFBWTtHQUMxQixlQUFlO0VBQ2pCO0VBQ0EsTUFBTSxZQUFZO0NBQ3BCOzs7Q0NkQSxJQUFJLG9CQUFvQjtDQUN4QixNQUFNLDBCQUEwQjtFQUM5QixJQUFJLG1CQUNGO0VBRUYsb0JBQW9CO0VBQ3BCLE1BQU0sYUFBYSxDQUFDO0VBQ3BCLEtBQUssTUFBTSxnQkFBZ0IsT0FBTyxvQkFBb0IsT0FBTyxHQUMzRCxXQUFXLGdCQUFnQixRQUFRO0VBRXJDLE1BQU0sbUJBQW1CO0VBQ3pCLE1BQU0sZUFBZSxPQUFPLFVBQVU7RUFDdEMsTUFBTSx3QkFBd0IsV0FBVyxTQUFTLGlCQUFpQjtHQUNqRSxNQUFNLGVBQWUsSUFBSSxpQkFBaUIsVUFBVSxVQUFVLFlBQVk7R0FDMUUsWUFBWSxJQUFJLGNBQWMsVUFBVSxRQUFRO0dBQ2hELFVBQVUsV0FBVztFQUN2QjtFQUNBLHFCQUFxQixTQUFTLFdBQVcsWUFBWSxFQUNuRCxNQUFNLGFBQWEsU0FBUyxnQkFBZ0I7R0FDMUMsT0FBTyxXQUFXLE1BQU0sYUFBYSxZQUFZLElBQUksT0FBTyxLQUFLLFNBQVMsY0FBYztFQUMxRixFQUNGLENBQUM7RUFDRCxxQkFBcUIsUUFBUSxTQUFTLEVBQ3BDLFVBQVUsaUJBQWlCLGlCQUFpQjtHQUMxQyxPQUFPLFdBQVcsVUFBVSxpQkFBaUIsZUFBZTtFQUM5RCxFQUNGLENBQUM7RUFDRCxxQkFBcUIsa0JBQWtCLGFBQWEsRUFDbEQsTUFBTSxnQkFBZ0IsY0FBYyxpQkFBaUI7R0FDbkQsT0FBTyxXQUFXLE1BQU0sZ0JBQWdCLGNBQWMsZUFBZTtFQUN2RSxFQUNGLENBQUM7RUFDRCxJQUFJLHlCQUF5QjtFQUM3QixxQkFBcUIsU0FBUyxXQUFXLFFBQVEsRUFDL0MsTUFBTSxtQkFBbUIsZUFBZSxpQkFBaUI7R0FDdkQsSUFBSTtJQUNGLElBQUk7S0FDRixJQUFJLGFBQWEsS0FBSyxnQkFBZ0IsSUFBSSwyQkFBMkIsS0FBSyxNQUN4RSxPQUFPLFdBQVcsTUFBTSxtQkFBbUIsZUFBZSxlQUFlO0lBRTdFLFFBQVEsQ0FBQztJQUNULElBQUksZ0JBQWdCLE1BQU0sZ0JBQWdCLEVBQUUsQ0FBQyw2QkFBNkIsTUFBTTtLQUM5RSxNQUFNLGFBQWEsZ0JBQWdCO0tBQ25DLE1BQU0sZUFBZSxnQkFBZ0IsRUFBRSxDQUFDO0tBQ3hDLE9BQU8sYUFBYTtLQUVwQixNQUFNLGlCQURnQixvQkFBb0IsTUFBTSxVQUNiLENBQUMsQ0FBQyxRQUFPLG9CQUFtQixnQkFBZ0IsV0FBVyxLQUFLLENBQUM7S0FDaEcsWUFBWSxXQUFXLE9BQU8sb0JBQW9CLE1BQU0sV0FBVyxVQUFVLFNBQVMsQ0FBQyxDQUFDLFFBQU8sb0JBQW1CLGdCQUFnQixXQUFXLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBSyxnQkFBZSxNQUFNLFdBQVcsd0JBQXdCLFFBQVEsS0FBSyxZQUFZO0tBQzNPLFlBQVksaUJBQWlCLGVBQWUsTUFBSyxxQkFBb0IsT0FBTyxNQUFNLFdBQVcsaUJBQWlCLEVBQUUsV0FBVyxXQUFXLEtBQUssWUFBWTtLQUN2SixZQUFZLGdCQUFnQixlQUFlLE1BQUssb0JBQW1CLE9BQU8sTUFBTSxXQUFXLGdCQUFnQixFQUFFLGlCQUFpQixXQUFXLEtBQUssWUFBWTtLQUMxSixZQUFZLGdCQUFnQixvQkFBb0IsTUFBTSxZQUFZLENBQUMsQ0FBQyxNQUFLLG9CQUFtQixPQUFPLE1BQU0sYUFBYSxnQkFBZ0IsRUFBRSxtQkFBbUIsV0FBVyxLQUFLLFlBQVk7S0FDdkwsSUFBSTtNQUNGLFNBQW9CLGVBQWUsS0FBSyxDQUFDLENBQUMsT0FBTyxXQUFXLE9BQU8saUJBQWlCLGFBQWEsT0FBTyxNQUFLLGNBQWEsVUFBVSxXQUFXLE9BQU8sTUFBTTtLQUM5SixRQUFRLENBQUM7S0FDVCxJQUFJO0tBQ0osSUFBSTtNQUNGLGNBQWMsbUJBQW1CO0tBQ25DLFFBQVEsQ0FBQztLQUNULHNCQUFzQixrQkFBa0I7TUFDdEMsSUFBSTtPQUNGLElBQUksQ0FBQyxNQUFNLFlBQVksWUFBWSxJQUNqQztPQUVGLE1BQU0sZ0JBQWdCLE1BQU0sV0FBVyxVQUFVO09BQ2pELElBQUksY0FBYyxhQUNoQixjQUFjLE9BQU8sZUFBZSxjQUFjLFdBQVcsR0FBRyxVQUFVLEVBQ3hFLFFBQVEsQ0FBQyxFQUNYLENBQUM7T0FFSCxJQUFJLGNBQWMsZ0JBQ2hCLE9BQU8sZUFBZSxPQUFPLGVBQWUsY0FBYyxjQUFjLEdBQUcsUUFBUSxFQUNqRixXQUFXLENBQUMsRUFDZCxDQUFDO09BRUgsY0FBYyxtQkFBbUI7TUFDbkMsUUFBUSxDQUFDO0tBQ1gsR0FBRyxHQUFHO0tBQ04sSUFBSSx5QkFBeUIsS0FBSyxJQUFJLElBQUksS0FBTTtNQUM5QyxpQkFBaUIsZUFBZTtNQUNoQyx5QkFBeUIsS0FBSyxJQUFJO0tBQ3BDO0lBQ0Y7R0FDRixRQUFRLENBQUM7R0FDVCxPQUFPLFdBQVcsTUFBTSxtQkFBbUIsZUFBZSxlQUFlO0VBQzNFLEVBQ0YsQ0FBQztDQUNIOzs7Q0N4RkEsTUFBTSw4QkFBOEI7RUFDbEMsSUFBSSxNQUFNLFVBQ1I7RUFFRixJQUFJLENBQUMsTUFBTSxZQUFZO0dBQ3JCLFdBQVcsdUJBQXVCLEdBQUc7R0FDckM7RUFDRjtFQUNBLElBQUk7R0FDRixJQUFJLE1BQU0sV0FBVyxrQkFBa0IsTUFBTSxXQUFXLGVBQWUsUUFBUTtJQUM3RSxNQUFNLFdBQVcsZUFBZSxPQUFPLGNBQWMsR0FBTztJQUM1RCxNQUFNLFdBQVcsZUFBZSxPQUFPLHNCQUFzQixDQUFDO0dBQ2hFLE9BQ0UsS0FBSyxJQUFJLFFBQVEsTUFBTSxZQUNyQixJQUFJLE1BQU0sV0FBVyxTQUFTLE1BQU0sV0FBVyxLQUFLLENBQUMsUUFBUTtJQUMzRCxNQUFNLFdBQVcsS0FBSyxDQUFDLE9BQU8sY0FBYyxHQUFPO0lBQ25ELE1BQU0sV0FBVyxLQUFLLENBQUMsT0FBTyxzQkFBc0IsQ0FBQztHQUN2RDtHQUdKLElBQUksT0FBTyxNQUFNLFdBQVcsYUFBYSxZQUN2QyxNQUFNLFdBQVcsaUJBQWlCLENBQUM7UUFFbkMsS0FBSyxJQUFJLFFBQVEsT0FBTyxvQkFBb0IsTUFBTSxXQUFXLFNBQVMsR0FDcEUsSUFBSSxLQUFLLFdBQVcsS0FBSyxLQUFLLE9BQU8sTUFBTSxXQUFXLFVBQVUsWUFDOUQsTUFBTSxXQUFXLGNBQWMsQ0FBQztHQUl0QyxrQkFBa0I7SUFDaEIsSUFBSTtLQUNGLE1BQU0sYUFBYSxTQUFTLFVBQVU7TUFDcEMsVUFBVTtNQUNWLFVBQVU7S0FDWixDQUFDO0tBQ0QsTUFBTSxhQUFhLFNBQVMsUUFBUSxRQUFRLFFBQVE7S0FDcEQsTUFBTSxhQUFhLFNBQVMsUUFBUSxRQUFRLGdCQUFnQjtJQUM5RCxRQUFRLENBQUM7R0FDWCxHQUFHLEdBQUc7R0FDTixpQkFBaUIscUJBQXFCO0VBQ3hDLFNBQVMsY0FBYztHQUNyQixRQUFRLE1BQU0sc0JBQXNCLFlBQVk7RUFDbEQ7RUFDQSxNQUFNLFdBQVc7Q0FDbkI7OztDQ3hDQSxPQUFPLG1CQUFtQjtFQUN4QixHQUFHO0VBQ0gsR0FBRztFQUNILEdBQUc7Q0FDTDtDQUNBLE9BQU8scUJBQXFCO0NBQzVCLE9BQU8sc0JBQXNCO0NBQzdCLE9BQU8scUJBQXFCLENBQUM7Q0FDN0IsT0FBTyx1QkFBdUI7Q0FDOUIsT0FBTyw0QkFBNEI7Q0FDbkMsT0FBTyxhQUFhO0NBQ3BCLE9BQU8sWUFBWTtFQUNqQixPQUFPO0VBQ1AsUUFBUTtFQUNSLEtBQUs7RUFDTCxTQUFTO0VBQ1QsU0FBUztFQUNULFdBQVc7RUFDWCxZQUFZO0VBQ1osU0FBUztDQUNYO0NBQ0EsT0FBTyxxQkFBcUI7Q0FDNUIsT0FBTyxVQUFVO0NBNkJqQixTQUFTLGdCQUFnQixLQUFLLFFBQVEsV0FBVyxXQUFXO0VBQzFELElBQUksQ0FBQyxPQUFPLHNCQUFzQixPQUFPLG1CQUFtQixTQUFTLEdBQ25FO0VBRUYsTUFBTSxVQUFVLE9BQU8sUUFBUTtFQUMvQixNQUFNLFVBQVUsT0FBTyxTQUFTO0VBRWhDLE1BQU0sZ0JBQWdCO0VBQ3RCLE1BQU0sRUFDSixHQUFHLEtBQ0gsR0FBRyxPQUNILEdBQUcsU0FDRCxPQUFPO0VBQ1gsS0FBSyxJQUFJLElBQUksR0FBRyxJQUFJLE9BQU8sbUJBQW1CLFFBQVEsS0FBSztHQUN6RCxNQUFNLFlBQVksT0FBTyxtQkFBbUIsSUFBSTtHQUNoRCxNQUFNLFlBQVksT0FBTyxtQkFBbUI7R0FDNUMsTUFBTSxNQUFNLE1BQU0sY0FBYyxVQUFVO0dBQzFDLE1BQU0sVUFBVSxLQUFLLElBQUksS0FBTSxJQUFJLE1BQU0sYUFBYTtHQUN0RCxNQUFNLFNBQVMsV0FBVyxVQUFVLElBQUksVUFBVSxLQUFLO0dBQ3ZELE1BQU0sU0FBUyxXQUFXLFVBQVUsSUFBSSxVQUFVLEtBQUs7R0FDdkQsTUFBTSxPQUFPLFdBQVcsVUFBVSxJQUFJLFVBQVUsS0FBSztHQUNyRCxNQUFNLE9BQU8sV0FBVyxVQUFVLElBQUksVUFBVSxLQUFLO0dBQ3JELE1BQU0sV0FBVyxJQUFJLE9BQU8sbUJBQW1CO0dBQy9DLElBQUksVUFBVTtHQUNkLElBQUksT0FBTyxRQUFRLE1BQU07R0FDekIsSUFBSSxPQUFPLE1BQU0sSUFBSTtHQUNyQixJQUFJLGNBQWMsVUFBVSxNQUFNLE1BQU0sUUFBUSxNQUFNLE9BQU8sTUFBTSxVQUFVO0dBQzdFLElBQUksWUFBWSxNQUFNLFdBQVc7R0FDakMsSUFBSSxPQUFPO0VBQ2I7RUFDQSxLQUFLLElBQUksSUFBSSxHQUFHLElBQUksT0FBTyxtQkFBbUIsUUFBUSxLQUFLLEdBQUc7R0FDNUQsTUFBTSxlQUFlLE9BQU8sbUJBQW1CO0dBQy9DLE1BQU0sV0FBVyxNQUFNLGNBQWMsYUFBYTtHQUNsRCxNQUFNLGVBQWUsS0FBSyxJQUFJLElBQUssSUFBSSxXQUFXLGFBQWE7R0FDL0QsTUFBTSxTQUFTLFdBQVcsYUFBYSxJQUFJLFVBQVUsS0FBSztHQUMxRCxNQUFNLFNBQVMsV0FBVyxhQUFhLElBQUksVUFBVSxLQUFLO0dBQzFELElBQUksWUFBWSxVQUFVLE1BQU0sTUFBTSxRQUFRLE1BQU0sT0FBTyxNQUFNLGVBQWU7R0FDaEYsSUFBSSxVQUFVO0dBQ2QsSUFBSSxJQUFJLFFBQVEsUUFBUSxHQUFHLEdBQUcsS0FBSyxLQUFLLENBQUM7R0FDekMsSUFBSSxLQUFLO0VBQ1g7RUFDQSxJQUFJLE9BQU8sbUJBQW1CLFNBQVMsR0FBRztHQUN4QyxNQUFNLG9CQUFvQixPQUFPLG1CQUFtQixPQUFPLG1CQUFtQixTQUFTO0dBQ3ZGLE1BQU0sb0JBQW9CLFdBQVcsa0JBQWtCLElBQUksVUFBVSxLQUFLO0dBQzFFLE1BQU0sb0JBQW9CLFdBQVcsa0JBQWtCLElBQUksVUFBVSxLQUFLO0dBQzFFLElBQUksWUFBWSxTQUFTLE1BQU0sTUFBTSxRQUFRLE1BQU0sT0FBTztHQUMxRCxJQUFJLE9BQU87R0FDWCxJQUFJLFNBQVMsWUFBWSxPQUFPLG1CQUFtQixTQUFTLFNBQVMsb0JBQW9CLEdBQUcsb0JBQW9CLENBQUM7RUFDbkg7Q0FDRjtDQUNBLFNBQVMsYUFBYTtFQUNwQixNQUFNLGdCQUFnQixrQkFBa0IsZUFBZSxNQUFNO0VBQzdELE1BQU0sYUFBYSxjQUFjLFdBQVcsSUFBSTtFQUNoRCxXQUFXLFVBQVUsR0FBRyxHQUFHLGNBQWMsT0FBTyxjQUFjLE1BQU07RUFDcEUsTUFBTSxtQkFBbUIsa0JBQWtCO0VBQzNDLElBQUksb0JBQW9CLE9BQU8sb0JBQzdCLGdCQUFnQixZQUFZLGVBQWUsa0JBQWtCLGlCQUFpQixDQUFDO0VBRWpGLHNCQUFzQixVQUFVO0NBQ2xDO0NBQ0EsU0FBUyxRQUFRLEtBQUssV0FBVyxTQUFTLFNBQVMsT0FBTztFQUN4RCxJQUFJLENBQUMsYUFBYSxVQUFVLE9BQzFCO0VBRUYsTUFBTSxRQUFRLFVBQVU7RUFDeEIsTUFBTSxVQUFVLE9BQU87RUFDdkIsTUFBTSxZQUFZLE9BQU87RUFDekIsSUFBSSxXQUFXLFlBQVksWUFBWSxVQUFVLFdBQVcsQ0FBQyxJQUFJLFVBQVUsUUFBUSxDQUFDO0VBQ3BGLElBQUksY0FBYztFQUNsQixJQUFJLGNBQWM7RUFDbEIsSUFBSTtHQUNGLElBQUksTUFBTSxjQUFjLFVBQVU7SUFDaEMsTUFBTSxXQUFXLE1BQU0sYUFBYTtJQUNwQyxJQUFJLFNBQVMsVUFBVSxTQUFTLE9BQU8sS0FBSyxNQUFNO0tBQ2hELGVBQWUsU0FBUyxPQUFPLElBQUksTUFBTSxLQUFLO0tBQzlDLGVBQWUsU0FBUyxPQUFPLElBQUksTUFBTSxLQUFLO0lBQ2hEO0dBQ0Y7RUFDRixTQUFTLEtBQUssQ0FBQztFQUNmLFNBQVMsU0FBUSxpQkFBZ0I7R0FDL0IsTUFBTSxTQUFTLGFBQWEsSUFBSSxNQUFNO0dBQ3RDLE1BQU0sU0FBUyxhQUFhLElBQUksTUFBTTtHQUN0QyxNQUFNLGFBQWEsVUFBVSxTQUFTLFFBQVE7R0FDOUMsTUFBTSxhQUFhLFVBQVUsU0FBUyxRQUFRO0dBQzlDLE1BQU0sWUFBWSxhQUFhLGFBQWEsT0FBTztHQUNuRCxNQUFNLFVBQVU7R0FDaEIsSUFBSTtHQUNKLElBQUksWUFBWSxXQUFXO0lBQ3pCLFdBQVcsWUFBWSxPQUFPLFVBQVUsVUFBVSxhQUFhLFdBQVcsTUFBTSxPQUFPLFVBQVUsUUFBUSxhQUFhLFdBQVcsT0FBTyxPQUFPLFVBQVUsU0FBUyxhQUFhLFdBQVcsTUFBTyxPQUFPLFVBQVUsTUFBTSxPQUFPLFVBQVU7SUFDek8sSUFBSSxjQUFjO0lBQ2xCLElBQUksWUFBWSxZQUFZLElBQUk7SUFDaEMsSUFBSSxXQUFXLGFBQWEsVUFBVSxHQUFHLGFBQWEsVUFBVSxHQUFHLFNBQVMsT0FBTztJQUNuRixJQUFJLFlBQVk7SUFDaEIsSUFBSSxPQUFPO0lBQ1gsSUFBSSxTQUFTLGFBQWEsUUFBUSxjQUFjLGFBQWEsUUFBUSxRQUFRLFFBQVEsYUFBYSxJQUFJLGFBQWEsVUFBVSxHQUFHLGFBQWEsVUFBVSxJQUFJLENBQUM7SUFDNUosSUFBSSxPQUFPO0lBQ1gsSUFBSSxTQUFTLEtBQUssTUFBTSxhQUFhLFFBQVEsQ0FBQyxDQUFDLFNBQVMsR0FBRyxhQUFhLFVBQVUsR0FBRyxhQUFhLFVBQVUsSUFBSSxFQUFFO0lBQ2xILElBQUksYUFBYSxRQUFRLG9CQUFvQixNQUMzQyxJQUFJLFNBQVMsU0FBUyxhQUFhLE9BQU8sa0JBQWtCLGFBQWEsVUFBVSxHQUFHLGFBQWEsVUFBVSxJQUFJLEVBQUU7SUFFckgsSUFBSSxPQUFPLGVBQWUsT0FBTyxpQkFBaUIsYUFBYSxJQUFJO0tBQ2pFLElBQUksY0FBYztLQUNsQixJQUFJLFlBQVk7S0FDaEIsTUFBTSxZQUFZO0tBQ2xCLElBQUksVUFBVTtLQUNkLElBQUksT0FBTyxhQUFhLFdBQVcsVUFBVTtLQUM3QyxJQUFJLE9BQU8sYUFBYSxXQUFXLFVBQVU7S0FDN0MsSUFBSSxPQUFPLFlBQVksYUFBYSxTQUFTO0tBQzdDLElBQUksT0FBTyxZQUFZLGFBQWEsU0FBUztLQUM3QyxJQUFJLE9BQU87S0FDWCxJQUFJLFVBQVU7S0FDZCxJQUFJLElBQUksWUFBWSxZQUFZLFdBQVcsR0FBRyxLQUFLLEtBQUssQ0FBQztLQUN6RCxJQUFJLGNBQWM7S0FDbEIsSUFBSSxPQUFPO0tBQ1gsSUFBSSxZQUFZO0tBQ2hCLElBQUksT0FBTztLQUNYLElBQUksU0FBUyxVQUFVLGFBQWEsWUFBWSxHQUFHLGFBQWEsQ0FBQztJQUNuRTtJQUNBLElBQUksVUFBVTtJQUNkLElBQUksT0FBTyxTQUFTLE9BQU87SUFDM0IsSUFBSSxPQUFPLFlBQVksVUFBVTtJQUNqQyxJQUFJLGNBQWM7SUFDbEIsSUFBSSxjQUFjO0lBQ2xCLElBQUksWUFBWTtJQUNoQixJQUFJLE9BQU87SUFDWCxJQUFJLGNBQWM7R0FDcEIsT0FBTztJQUNMLFdBQVcsYUFBYSxXQUFXLE1BQU0sT0FBTyxVQUFVLFlBQVksYUFBYSxXQUFXLE1BQU8sT0FBTyxVQUFVLGFBQWEsT0FBTyxVQUFVO0lBQ3BKLElBQUksY0FBYztJQUNsQixJQUFJLFlBQVk7SUFDaEIsSUFBSSxXQUFXLGFBQWEsVUFBVSxHQUFHLGFBQWEsVUFBVSxHQUFHLFNBQVMsT0FBTztJQUNuRixJQUFJLGFBQWEsV0FBVyxLQUFNO0tBQ2hDLElBQUksWUFBWTtLQUNoQixJQUFJLE9BQU87S0FDWCxJQUFJLFNBQVMsS0FBSyxNQUFNLGFBQWEsUUFBUSxDQUFDLENBQUMsU0FBUyxHQUFHLGFBQWEsVUFBVSxJQUFJLEdBQUcsYUFBYSxDQUFDO0lBQ3pHO0dBQ0Y7RUFDRixDQUFDO0NBQ0g7Q0FDQSxTQUFTLGdCQUFnQixLQUFLLFFBQVEsV0FBVyxXQUFXO0VBQzFELElBQUksQ0FBQyxPQUFPLG9CQUNWO0VBRUYsTUFBTSxnQkFBZ0IsZUFBZSxPQUFPLGtCQUFrQjtFQUM5RCxJQUFJLENBQUMsZUFDSDtFQUVGLElBQUksQ0FBQyxjQUFjLGFBQWEsR0FBRztHQUNqQyxPQUFPLHFCQUFxQjtHQUM1QjtFQUNGO0VBQ0EsTUFBTSxZQUFZLGdCQUFnQixhQUFhO0VBQy9DLElBQUksQ0FBQyxhQUFhLENBQUMsV0FDakI7RUFFRixNQUFNLFVBQVUsT0FBTyxRQUFRO0VBQy9CLE1BQU0sVUFBVSxPQUFPLFNBQVM7RUFDaEMsTUFBTSxRQUFRLFVBQVUsSUFBSSxVQUFVO0VBQ3RDLE1BQU0sUUFBUSxVQUFVLElBQUksVUFBVTtFQUN0QyxNQUFNLFVBQVUsVUFBVSxRQUFRO0VBQ2xDLE1BQU0sVUFBVSxVQUFVLFFBQVE7RUFDbEMsTUFBTSxXQUFXLGtCQUFrQixVQUFVLEdBQUcsVUFBVSxHQUFHLFVBQVUsR0FBRyxVQUFVLENBQUM7RUFDckYsTUFBTSxZQUFZLG1CQUFtQixhQUFhO0VBQ2xELE1BQU0sUUFBUSxLQUFLLElBQUksS0FBSyxJQUFJLElBQUksR0FBRyxJQUFJLEtBQU07RUFDakQsTUFBTSxhQUFhO0VBQ25CLElBQUksVUFBVTtFQUNkLElBQUksT0FBTyxTQUFTLE9BQU87RUFDM0IsSUFBSSxPQUFPLFNBQVMsT0FBTztFQUMzQixJQUFJLGNBQWM7RUFDbEIsSUFBSSxZQUFZO0VBQ2hCLElBQUksWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0VBQ3RCLElBQUksT0FBTztFQUNYLElBQUksWUFBWSxDQUFDLENBQUM7RUFDbEIsSUFBSSxjQUFjLG9CQUFvQixRQUFRO0VBQzlDLElBQUksWUFBWTtFQUNoQixJQUFJLFdBQVcsVUFBVSxhQUFhLEdBQUcsVUFBVSxhQUFhLEdBQUcsWUFBWSxVQUFVO0VBQ3pGLE1BQU0sY0FBYztFQUNwQixNQUFNLFFBQVEsS0FBSyxNQUFNLFVBQVUsTUFBTSxVQUFVLElBQUk7RUFDdkQsSUFBSSxVQUFVO0VBQ2QsSUFBSSxPQUFPLFNBQVMsT0FBTztFQUMzQixJQUFJLE9BQU8sVUFBVSxVQUFVLE9BQU8sYUFBYSxVQUFVLFVBQVUsT0FBTyxXQUFXO0VBQ3pGLElBQUksY0FBYztFQUNsQixJQUFJLFlBQVk7RUFDaEIsSUFBSSxPQUFPO0VBQ1gsSUFBSSxVQUFVO0VBQ2QsSUFBSSxPQUFPLFVBQVUsVUFBVSxPQUFPLGFBQWEsVUFBVSxVQUFVLE9BQU8sV0FBVztFQUN6RixJQUFJLE9BQU8sVUFBVSxVQUFVLE9BQU8sY0FBYyxLQUFLLElBQUksUUFBUSxFQUFHLElBQUksSUFBSSxVQUFVLFVBQVUsT0FBTyxjQUFjLEtBQUssSUFBSSxRQUFRLEVBQUcsSUFBSSxFQUFFO0VBQ25KLElBQUksT0FBTyxVQUFVLFVBQVUsT0FBTyxhQUFhLFVBQVUsVUFBVSxPQUFPLFdBQVc7RUFDekYsSUFBSSxPQUFPLFVBQVUsVUFBVSxPQUFPLGNBQWMsS0FBSyxJQUFJLFFBQVEsRUFBRyxJQUFJLElBQUksVUFBVSxVQUFVLE9BQU8sY0FBYyxLQUFLLElBQUksUUFBUSxFQUFHLElBQUksRUFBRTtFQUNuSixJQUFJLGNBQWM7RUFDbEIsSUFBSSxZQUFZO0VBQ2hCLElBQUksT0FBTztFQUNYLE1BQU0sWUFBWTtFQUNsQixNQUFNLGFBQWE7RUFDbkIsTUFBTSxRQUFRLEtBQUssSUFBSSxVQUFVLGFBQWEsSUFBSSxJQUFJLE9BQU8sUUFBUSxZQUFZLENBQUM7RUFDbEYsTUFBTSxRQUFRLEtBQUssSUFBSSxHQUFHLEtBQUssSUFBSSxVQUFVLGFBQWEsR0FBRyxPQUFPLFNBQVMsYUFBYSxDQUFDLENBQUM7RUFDNUYsSUFBSSxZQUFZO0VBQ2hCLElBQUksY0FBYyxvQkFBb0IsUUFBUTtFQUM5QyxJQUFJLFlBQVk7RUFDaEIsSUFBSSxVQUFVO0VBQ2QsSUFBSSxVQUFVLE9BQU8sT0FBTyxXQUFXLFlBQVksQ0FBQztFQUNwRCxJQUFJLEtBQUs7RUFDVCxJQUFJLE9BQU87RUFDWCxJQUFJLFlBQVk7RUFDaEIsSUFBSSxPQUFPO0VBQ1gsSUFBSSxTQUFTLFlBQVksUUFBUSxHQUFHLFFBQVEsRUFBRTtFQUM5QyxJQUFJLFlBQVk7RUFDaEIsSUFBSSxPQUFPO0VBQ1gsSUFBSSxVQUFVLGNBQWMsUUFBUSxZQUFZLE9BQU8sbUJBQUEsQ0FBb0IsVUFBVSxHQUFHLEVBQUUsR0FBRyxRQUFRLEdBQUcsUUFBUSxFQUFFO0VBQ2xILElBQUksWUFBWTtFQUNoQixJQUFJLE9BQU87RUFDWCxJQUFJLFNBQVMsS0FBSyxNQUFNLFFBQVEsSUFBSSxVQUFVLFFBQVEsR0FBRyxRQUFRLEVBQUU7RUFDbkUsSUFBSSxVQUFVLEtBQUssVUFBVSxPQUFPLFNBQVMsVUFBVSxLQUFLLFVBQVUsT0FBTyxRQUFRO0dBQ25GLE1BQU0sYUFBYSxLQUFLLE1BQU0sVUFBVSxTQUFTLFVBQVUsT0FBTztHQUNsRSxNQUFNLGVBQWUsVUFBVSxLQUFLLElBQUksVUFBVSxLQUFLLE9BQU8sUUFBUSxJQUFJO0dBQzFFLE1BQU0sZUFBZSxVQUFVLEtBQUssSUFBSSxVQUFVLEtBQUssT0FBTyxTQUFTLElBQUk7R0FDM0UsSUFBSSxZQUFZO0dBQ2hCLElBQUksVUFBVTtHQUNkLElBQUksVUFBVSxlQUFlLElBQUksZUFBZSxJQUFJLElBQUksSUFBSSxDQUFDO0dBQzdELElBQUksS0FBSztHQUNULElBQUksY0FBYztHQUNsQixJQUFJLFlBQVk7R0FDaEIsSUFBSSxPQUFPO0dBQ1gsSUFBSSxVQUFVO0dBQ2QsSUFBSSxPQUFPLGVBQWUsS0FBSyxJQUFJLFVBQVUsSUFBSSxJQUFJLGVBQWUsS0FBSyxJQUFJLFVBQVUsSUFBSSxFQUFFO0dBQzdGLElBQUksT0FBTyxlQUFlLEtBQUssSUFBSSxhQUFhLEVBQUcsSUFBSSxJQUFJLGVBQWUsS0FBSyxJQUFJLGFBQWEsRUFBRyxJQUFJLEVBQUU7R0FDekcsSUFBSSxPQUFPLGVBQWUsS0FBSyxJQUFJLGFBQWEsRUFBRyxJQUFJLElBQUksZUFBZSxLQUFLLElBQUksYUFBYSxFQUFHLElBQUksRUFBRTtHQUN6RyxJQUFJLFVBQVU7R0FDZCxJQUFJLFlBQVk7R0FDaEIsSUFBSSxLQUFLO0dBQ1QsSUFBSSxZQUFZO0dBQ2hCLElBQUksT0FBTztHQUNYLElBQUksWUFBWTtHQUNoQixJQUFJLFNBQVMsS0FBSyxNQUFNLFFBQVEsQ0FBQyxDQUFDLFNBQVMsR0FBRyxjQUFjLGVBQWUsQ0FBQztHQUM1RSxJQUFJLFlBQVk7RUFDbEI7Q0FDRjtDQUNBLFNBQVMsVUFBVSxLQUFLLFFBQVEsV0FBVztFQUN6QyxJQUFJLENBQUMsYUFBYSxVQUFVLE9BQzFCO0VBRUYsTUFBTSxZQUFZO0VBQ2xCLElBQUksVUFBVSxNQUFNLE1BQ2xCLFVBQVUsSUFBSSxPQUFPLFFBQVEsWUFBWTtFQUUzQyxNQUFNLFNBQVMsVUFBVTtFQUN6QixNQUFNLFNBQVMsVUFBVTtFQUV6QixNQUFNLGFBQWEsYUFBYSxNQUFhO0VBQzdDLE9BQU8sZUFBZTtHQUNwQixHQUFHO0dBQ0gsR0FBRztHQUNILEdBQUc7R0FDSCxHQUFHO0VBQ0w7RUFDQSxJQUFJLFlBQVk7RUFDaEIsSUFBSSxVQUFVO0VBQ2QsSUFBSSxVQUFVLFFBQVEsUUFBUSxXQUFXLFdBQVcsQ0FBQztFQUNyRCxJQUFJLEtBQUs7RUFDVCxJQUFJLGNBQWM7RUFDbEIsSUFBSSxZQUFZO0VBQ2hCLElBQUksT0FBTztFQUNYLElBQUksY0FBYztFQUNsQixJQUFJLFlBQVk7RUFDaEIsSUFBSSxVQUFVO0VBQ2QsSUFBSSxPQUFPLFNBQVMsWUFBWSxHQUFHLE1BQU07RUFDekMsSUFBSSxPQUFPLFNBQVMsWUFBWSxHQUFHLFNBQVMsU0FBUztFQUNyRCxJQUFJLE9BQU8sUUFBUSxTQUFTLFlBQVksQ0FBQztFQUN6QyxJQUFJLE9BQU8sU0FBUyxXQUFXLFNBQVMsWUFBWSxDQUFDO0VBQ3JELElBQUksT0FBTztFQUNYLEtBQUssSUFBSSxxQkFBcUIsS0FBTSxzQkFBc0IsR0FBRyxzQkFBc0IsS0FBTTtHQUN2RixJQUFJLFVBQVU7R0FDZCxJQUFJLElBQUksU0FBUyxZQUFZLEdBQUcsU0FBUyxZQUFZLEdBQUcsWUFBWSxJQUFJLG9CQUFvQixHQUFHLEtBQUssS0FBSyxDQUFDO0dBQzFHLElBQUksY0FBYyxvQkFBb0IsS0FBTSxxQkFBcUIsTUFBTztHQUN4RSxJQUFJLE9BQU87RUFDYjtFQUNBLElBQUksWUFBWTtFQUNoQixJQUFJLFVBQVU7RUFDZCxJQUFJLElBQUksU0FBUyxZQUFZLEdBQUcsU0FBUyxZQUFZLEdBQUcsR0FBRyxHQUFHLEtBQUssS0FBSyxDQUFDO0VBQ3pFLElBQUksS0FBSztFQUNULE1BQU0saUJBQWlCLE9BQU8sWUFBWSxZQUFZLFVBQVUsV0FBVyxDQUFDLElBQUksVUFBVSxRQUFRLENBQUM7RUFDbkcsZUFBZSxTQUFRLGlCQUFnQjtHQUNyQyxNQUFNLFFBQVEsYUFBYSxJQUFJLFVBQVUsTUFBTTtHQUMvQyxNQUFNLFFBQVEsYUFBYSxJQUFJLFVBQVUsTUFBTTtHQUMvQyxJQUFJLFVBQVUsS0FBSyxJQUFJLFNBQVMsR0FBRyxLQUFLLElBQUksU0FBUyxZQUFZLEdBQUcsU0FBUyxZQUFZLElBQUksUUFBUSxVQUFVLENBQUM7R0FDaEgsSUFBSSxVQUFVLEtBQUssSUFBSSxTQUFTLEdBQUcsS0FBSyxJQUFJLFNBQVMsWUFBWSxHQUFHLFNBQVMsWUFBWSxJQUFJLFFBQVEsVUFBVSxDQUFDO0dBQ2hILElBQUk7R0FDSixJQUFJO0dBQ0osSUFBSSxPQUFPLFlBQVksV0FBVztJQUNoQyxXQUFXLGFBQWEsV0FBVyxNQUFNLE9BQU8sVUFBVSxRQUFRLGFBQWEsV0FBVyxPQUFPLE9BQU8sVUFBVSxTQUFTLGFBQWEsV0FBVyxNQUFPLE9BQU8sVUFBVSxNQUFNO0lBQ2pMLGVBQWU7R0FDakIsT0FBTztJQUNMLFdBQVcsT0FBTyxVQUFVO0lBQzVCLGVBQWU7R0FDakI7R0FDQSxJQUFJLE9BQU8sc0JBQXNCLGFBQWEsT0FBTyxPQUFPLG9CQUFvQjtJQUM5RSxXQUFXLE9BQU8sVUFBVTtJQUM1QixlQUFlO0dBQ2pCO0dBQ0EsSUFBSSxPQUFPLGdCQUFnQixhQUFhLE9BQU8sT0FBTyxjQUFjO0lBQ2xFLFdBQVc7SUFDWCxlQUFlO0dBQ2pCO0dBQ0EsSUFBSSxZQUFZO0dBQ2hCLElBQUksVUFBVTtHQUNkLElBQUksSUFBSSxTQUFTLFNBQVMsY0FBYyxHQUFHLEtBQUssS0FBSyxDQUFDO0dBQ3RELElBQUksS0FBSztFQUNYLENBQUM7RUFDRCxJQUFJLE9BQU8sc0JBQXNCLE9BQU8scUJBQXFCO0dBQzNELE1BQU0saUJBQWlCLGVBQWUsT0FBTyxtQkFBbUI7R0FDaEUsSUFBSSxnQkFBZ0I7SUFDbEIsTUFBTSxlQUFlLGdCQUFnQixjQUFjO0lBQ25ELElBQUksY0FBYztLQUNoQixNQUFNLFNBQVMsYUFBYSxJQUFJLFVBQVUsTUFBTTtLQUNoRCxNQUFNLFNBQVMsYUFBYSxJQUFJLFVBQVUsTUFBTTtLQUNoRCxNQUFNLFVBQVUsS0FBSyxJQUFJLFNBQVMsR0FBRyxLQUFLLElBQUksU0FBUyxZQUFZLEdBQUcsU0FBUyxZQUFZLElBQUksU0FBUyxVQUFVLENBQUM7S0FDbkgsTUFBTSxVQUFVLEtBQUssSUFBSSxTQUFTLEdBQUcsS0FBSyxJQUFJLFNBQVMsWUFBWSxHQUFHLFNBQVMsWUFBWSxJQUFJLFNBQVMsVUFBVSxDQUFDO0tBQ25ILE1BQU0sZUFBZSxLQUFLLElBQUksS0FBSyxJQUFJLElBQUksR0FBRyxJQUFJLEtBQU07S0FDeEQsTUFBTSxFQUNKLEdBQUcsVUFDSCxHQUFHLFlBQ0gsR0FBRyxjQUNELE9BQU87S0FDWCxNQUFNLFlBQVksV0FBVyxNQUFNLGFBQWEsTUFBTTtLQUN0RCxJQUFJLGNBQWMsVUFBVSxZQUFZLE1BQU0sZUFBZTtLQUM3RCxJQUFJLFlBQVk7S0FDaEIsSUFBSSxVQUFVO0tBQ2QsSUFBSSxJQUFJLFNBQVMsU0FBUyxHQUFHLEdBQUcsS0FBSyxLQUFLLENBQUM7S0FDM0MsSUFBSSxPQUFPO0tBQ1gsSUFBSSxjQUFjLFVBQVUsWUFBWSxNQUFNLGVBQWUsS0FBTTtLQUNuRSxJQUFJLFlBQVk7S0FDaEIsSUFBSSxVQUFVO0tBQ2QsSUFBSSxJQUFJLFNBQVMsU0FBUyxJQUFJLEdBQUcsS0FBSyxLQUFLLENBQUM7S0FDNUMsSUFBSSxPQUFPO0tBQ1gsSUFBSSxZQUFZLFNBQVMsWUFBWTtLQUNyQyxJQUFJLFVBQVU7S0FDZCxJQUFJLElBQUksU0FBUyxTQUFTLEdBQUcsR0FBRyxLQUFLLEtBQUssQ0FBQztLQUMzQyxJQUFJLEtBQUs7S0FDVCxJQUFJLE9BQU8sbUJBQW1CLFNBQVMsR0FBRztNQUN4QyxJQUFJLGNBQWMsVUFBVSxZQUFZO01BQ3hDLElBQUksWUFBWTtNQUNoQixJQUFJLFVBQVU7TUFDZCxPQUFPLG1CQUFtQixTQUFTLFFBQVEsZ0JBQWdCO09BQ3pELE1BQU0sUUFBUSxLQUFLLElBQUksU0FBUyxHQUFHLEtBQUssSUFBSSxTQUFTLFlBQVksR0FBRyxTQUFTLFlBQVksS0FBSyxPQUFPLElBQUksVUFBVSxNQUFNLEtBQUssVUFBVSxDQUFDO09BQ3pJLE1BQU0sUUFBUSxLQUFLLElBQUksU0FBUyxHQUFHLEtBQUssSUFBSSxTQUFTLFlBQVksR0FBRyxTQUFTLFlBQVksS0FBSyxPQUFPLElBQUksVUFBVSxNQUFNLEtBQUssVUFBVSxDQUFDO09BQ3pJLElBQUksZ0JBQWdCLEdBQ2xCLElBQUksT0FBTyxPQUFPLEtBQUs7WUFFdkIsSUFBSSxPQUFPLE9BQU8sS0FBSztNQUUzQixDQUFDO01BQ0QsSUFBSSxPQUFPO0tBQ2I7SUFDRjtHQUNGO0VBQ0Y7RUFDQSxJQUFJLFlBQVk7RUFDaEIsSUFBSSxVQUFVO0VBQ2QsSUFBSSxVQUFVLFFBQVEsU0FBUyxXQUFXLFdBQVcsSUFBSTtHQUFDO0dBQUc7R0FBRztHQUFHO0VBQUMsQ0FBQztFQUNyRSxJQUFJLEtBQUs7RUFDVCxJQUFJLFlBQVk7RUFDaEIsSUFBSSxPQUFPO0VBQ1gsSUFBSSxTQUFTLFNBQVMsU0FBUyxHQUFHLFNBQVMsWUFBWSxFQUFFO0VBQ3pELElBQUksVUFBVSxPQUFPLFlBQVksWUFBWSxPQUFPLFFBQVEsZUFBZSxRQUFRLFNBQVMsWUFBWSxJQUFJLFNBQVMsWUFBWSxFQUFFO0NBQ3JJO0NBQ0EsU0FBUyxnQkFBZ0I7RUFDdkIsSUFBSSxDQUFDLE9BQU8sWUFBWTtHQUN0QixNQUFNLGlCQUFpQixTQUFTLGVBQWUsYUFBYTtHQUM1RCxJQUFJLGdCQUNGLGVBQWUsV0FBVyxJQUFJLENBQUMsQ0FBQyxVQUFVLEdBQUcsR0FBRyxlQUFlLE9BQU8sZUFBZSxNQUFNO0dBRTdGLHNCQUFzQixhQUFhO0dBQ25DO0VBQ0Y7RUFDQSxNQUFNLFlBQVksa0JBQWtCLGVBQWUsTUFBTTtFQUN6RCxNQUFNLFNBQVMsVUFBVSxXQUFXLElBQUk7RUFDeEMsT0FBTyxVQUFVLEdBQUcsR0FBRyxVQUFVLE9BQU8sVUFBVSxNQUFNO0VBQ3hELE1BQU0sbUJBQW1CLGlCQUFpQjtFQUMxQyxNQUFNLGFBQWEsa0JBQWtCO0VBQ3JDLE1BQU0saUJBQWlCLGlCQUFpQjtFQUN4QyxRQUFRLFFBQVEsa0JBQWtCLFVBQVUsUUFBUSxHQUFHLFVBQVUsU0FBUyxHQUFHLGNBQWM7RUFDM0YsZ0JBQWdCLFFBQVEsV0FBVyxZQUFZLGNBQWM7RUFDN0QsVUFBVSxRQUFRLFdBQVcsZ0JBQWdCO0VBQzdDLHNCQUFzQixhQUFhO0NBQ3JDO0NBQ0EsU0FBUyxZQUFZO0VBQ25CLE9BQU8sYUFBYSxDQUFDLE9BQU87RUFDNUIsaUJBQWlCLE9BQU8sYUFBYSxnQkFBZ0IsY0FBYztDQUNyRTs7O0NDaGJBLE9BQU8sVUFBVTtDQUNqQixPQUFPLGlCQUFpQjtDQUd4QixJQUFJLGNBQWM7Q0FDbEIsSUFBSSxjQUFjO0NBQ2xCLFNBQVMsbUJBQW1CO0VBQzFCLE1BQU0sYUFBYSxTQUFTLGNBQWMsS0FBSztFQUMvQyxXQUFXLEtBQUs7RUFDaEIsV0FBVyxZQUFZO0VBQ3ZCLFdBQVcsTUFBTSxVQUFVO0VBQzNCLFdBQVcsWUFBWTtFQUN2QixTQUFTLEtBQUssWUFBWSxVQUFVO0VBQ3BDLE1BQU0sa0JBQWtCLFdBQVcsY0FBYyxXQUFXO0VBQzVELElBQUksWUFBWTtFQUNoQixXQUFXLGNBQWMsVUFBVSxDQUFDLENBQUMsV0FBVSxVQUFTO0dBQ3RELE1BQU0sZ0JBQWdCO0dBQ3RCLFlBQVksQ0FBQztHQUNiLGdCQUFnQixNQUFNLFVBQVUsWUFBWSxTQUFTO0dBQ3JELFdBQVcsY0FBYyxVQUFVLENBQUMsQ0FBQyxjQUFjLFlBQVksTUFBTTtFQUN2RTtFQUNBLFdBQVcsY0FBYyxVQUFVLENBQUMsQ0FBQyxnQkFBZ0I7R0FDbkQsTUFBTSxjQUFjLFdBQVcsY0FBYyxVQUFVLENBQUMsQ0FBQztHQUN6RCxJQUFJLGFBQ0YsZ0JBQWdCLFdBQVc7RUFFL0I7RUFDQSxNQUFNLGlCQUFpQixXQUFXLGNBQWMsY0FBYztFQUM5RCxlQUFlLGdCQUFnQjtHQUM3QixNQUFNLGNBQWMsV0FBVyxjQUFjLFVBQVUsQ0FBQyxDQUFDO0dBQ3pELE1BQU0sYUFBYSxTQUFTLFdBQVcsY0FBYyxhQUFhLENBQUMsQ0FBQyxLQUFLLEtBQUs7R0FDOUUsSUFBSSxDQUFDLGFBQWE7SUFDaEIsaUJBQWlCLHVCQUF1QjtJQUN4QztHQUNGO0dBQ0EsSUFBSSxNQUFNLFdBQVc7SUFDbkIsY0FBYztJQUNkLGVBQWUsY0FBYztJQUM3QixlQUFlLFVBQVUsT0FBTyxXQUFXO0dBQzdDLE9BQU87SUFDTCxtQkFBbUIsYUFBYSxVQUFVO0lBQzFDLGVBQWUsY0FBYztJQUM3QixlQUFlLFVBQVUsSUFBSSxXQUFXO0dBQzFDO0VBQ0Y7RUFDQSxNQUFNLGNBQWMsV0FBVyxjQUFjLFdBQVc7RUFDeEQsWUFBWSxnQkFBZ0I7R0FDMUIsMEJBQTBCO0dBQzFCLFlBQVksY0FBYztHQUMxQixZQUFZLFdBQVc7R0FDdkIsWUFBWSxVQUFVLElBQUksV0FBVztFQUN2QztFQUNBLFdBQVcsY0FBYyxXQUFXLENBQUMsQ0FBQyxnQkFBZ0I7R0FDcEQsTUFBTSxlQUFlLHFCQUFxQixDQUFDO0dBQzNDLElBQUksa0JBQWtCLCtCQUErQixZQUFZLEdBQy9ELGlCQUFpQixjQUFjO1FBQzFCLElBQUksa0JBQWtCLCtCQUErQixZQUFZLEdBQ3RFLGlCQUFpQixvQkFBb0I7UUFFckMsaUJBQWlCLHFCQUFxQjtFQUUxQztFQUNBLE1BQU0sYUFBYSxXQUFXLGNBQWMsVUFBVTtFQUN0RCxXQUFXLGdCQUFnQjtHQUN6QiwwQkFBMEI7R0FDMUIsV0FBVyxjQUFjLE1BQU0sc0JBQXNCLGNBQWM7R0FDbkUsV0FBVyxVQUFVLE9BQU8sYUFBYSxDQUFDLENBQUMsTUFBTSxtQkFBbUI7RUFDdEU7RUFDQSxNQUFNLGVBQWUsV0FBVyxjQUFjLGVBQWU7RUFDN0QsSUFBSSxpQkFBaUI7RUFDckIsYUFBYSxpQkFBaUIsWUFBVyxpQkFBZ0I7R0FDdkQsYUFBYSxlQUFlO0dBQzVCLGlCQUFpQixhQUFhLFFBQVEsYUFBYTtHQUNuRCxhQUFhLFFBQVEsZUFBZSxRQUFRLE9BQU8sRUFBRSxDQUFDLENBQUMsWUFBWTtFQUNyRSxDQUFDO0VBQ0QsU0FBUyxpQkFBaUIsWUFBVyxlQUFjO0dBQ2pELElBQUksa0JBQWtCLFdBQVcsU0FBUyxrQkFBa0IsQ0FBQyxXQUFXLE9BQU8sUUFBUSw4QkFBOEIsR0FBRztJQUN0SCxXQUFXLGVBQWU7SUFDMUIsMEJBQTBCO0lBQzFCLFdBQVcsY0FBYyxNQUFNLHNCQUFzQixjQUFjO0lBQ25FLFdBQVcsVUFBVSxPQUFPLGFBQWEsQ0FBQyxDQUFDLE1BQU0sbUJBQW1CO0dBQ3RFO0VBQ0YsQ0FBQztFQUNELE1BQU0sZ0JBQWdCLFdBQVcsY0FBYyxtQkFBbUI7RUFDbEUsTUFBTSxpQkFBaUIsV0FBVyxjQUFjLG9CQUFvQjtFQUNwRSxjQUFjLFFBQVEsWUFBWSxZQUFZO0VBQzlDLGVBQWUsUUFBUSxZQUFZLFlBQVk7RUFDL0MsY0FBYyxpQkFBaUIsWUFBVyxlQUFjO0dBQ3RELFdBQVcsZUFBZTtHQUMxQixXQUFXLGdCQUFnQjtHQUMzQixjQUFjLFdBQVc7R0FDekIsY0FBYyxRQUFRLFdBQVcsSUFBSSxXQUFXLElBQUksV0FBVyxJQUFJLFlBQVksSUFBSSxXQUFXO0VBQ2hHLENBQUM7RUFDRCxlQUFlLGlCQUFpQixZQUFXLHFCQUFvQjtHQUM3RCxpQkFBaUIsZUFBZTtHQUNoQyxpQkFBaUIsZ0JBQWdCO0dBQ2pDLGNBQWMsaUJBQWlCO0dBQy9CLGVBQWUsUUFBUSxpQkFBaUIsSUFBSSxXQUFXLElBQUksaUJBQWlCLElBQUksWUFBWSxJQUFJLGlCQUFpQjtFQUNuSCxDQUFDO0VBQ0QsTUFBTSxtQkFBbUIsV0FBVyxjQUFjLG1CQUFtQjtFQUNyRSxNQUFNLGdCQUFnQixXQUFXLGNBQWMsYUFBYTtFQUM1RCxNQUFNLGtCQUFrQixXQUFXLGNBQWMsZUFBZTtFQUNoRSxJQUFJLGtCQUNGLGlCQUFpQixRQUFRLGFBQWEsUUFBUSxlQUFlLEtBQUs7RUFFcEUsSUFBSSxlQUNGLGNBQWMsZ0JBQWdCO0dBQzVCLE1BQU0sV0FBVyxpQkFBaUIsTUFBTSxLQUFLO0dBQzdDLElBQUksVUFBVTtJQUNaLGFBQWEsUUFBUSxpQkFBaUIsUUFBUTtJQUM5QyxhQUFhLFVBQVU7SUFDdkIsaUJBQWlCO0lBQ2pCLGlCQUFpQixpQkFBaUIsUUFBUTtHQUM1QztFQUNGO0VBRUYsSUFBSSxpQkFDRixnQkFBZ0IsZ0JBQWdCO0dBQzlCLGFBQWEsV0FBVyxlQUFlO0dBQ3ZDLGFBQWEsVUFBVTtHQUN2QixJQUFJLGtCQUNGLGlCQUFpQixRQUFRO0dBRTNCLGlCQUFpQixrQkFBa0I7RUFDckM7RUFFRixxQkFBcUIsVUFBVTtFQUMvQixPQUFPO0NBQ1Q7Q0FDQSxTQUFTLG9CQUFvQjtFQUMzQixNQUFNLGNBQWMsU0FBUyxjQUFjLEtBQUs7RUFDaEQsWUFBWSxLQUFLO0VBQ2pCLFlBQVksWUFBWTtFQUN4QixZQUFZLE1BQU0sVUFBVTtFQUM1QixZQUFZLFlBQVk7RUFDeEIsU0FBUyxLQUFLLFlBQVksV0FBVztFQUNyQyxNQUFNLG9CQUFvQixZQUFZLGNBQWMsYUFBYTtFQUNqRSxJQUFJLGlCQUFpQjtFQUNyQixZQUFZLGNBQWMsWUFBWSxDQUFDLENBQUMsV0FBVSxVQUFTO0dBQ3pELE1BQU0sZ0JBQWdCO0dBQ3RCLGlCQUFpQixDQUFDO0dBQ2xCLGtCQUFrQixNQUFNLFVBQVUsaUJBQWlCLFNBQVM7R0FDNUQsWUFBWSxjQUFjLFlBQVksQ0FBQyxDQUFDLGNBQWMsaUJBQWlCLE1BQU07RUFDL0U7RUFDQSxZQUFZLGNBQWMsY0FBYyxDQUFDLENBQUMsV0FBVSxlQUFjO0dBQ2hFLFdBQVcsZUFBZTtHQUMxQixpQkFBaUIsaUNBQWlDO0VBQ3BEO0VBQ0EsTUFBTSxvQkFBb0IsWUFBWSxjQUFjLGlCQUFpQjtFQUNyRSxrQkFBa0IsZ0JBQWdCO0dBQ2hDLElBQUksTUFBTSxVQUFVO0lBQ2xCLGlCQUFpQixnQkFBZ0I7SUFDakM7R0FDRjtHQUNBLGtCQUFrQjtHQUNsQixJQUFJLENBQUMsTUFBTSxZQUFZO0lBQ3JCLGlCQUFpQiw4QkFBOEI7SUFDL0MsaUJBQWlCO0tBQ2Ysc0JBQXNCO0tBQ3RCLGtCQUFrQixjQUFjO0tBQ2hDLGtCQUFrQixVQUFVLElBQUksV0FBVztLQUMzQyxrQkFBa0IsV0FBVztJQUMvQixHQUFHLEdBQUk7SUFDUDtHQUNGO0dBQ0Esc0JBQXNCO0dBQ3RCLGtCQUFrQixjQUFjO0dBQ2hDLGtCQUFrQixVQUFVLElBQUksV0FBVztHQUMzQyxrQkFBa0IsV0FBVztFQUMvQjtFQUNBLE1BQU0scUJBQXFCLFlBQVksY0FBYyxrQkFBa0I7RUFDdkUsbUJBQW1CLGdCQUFnQjtHQUNqQyxrQkFBa0I7R0FDbEIsSUFBSSxDQUFDLE1BQU0sWUFBWTtJQUNyQixpQkFBaUIsaUJBQWlCO0lBQ2xDO0dBQ0Y7R0FDQSxJQUFJLENBQUMsTUFBTSxXQUFXLFNBQVM7SUFDN0IsaUJBQWlCLHVCQUF1QjtJQUN4QztHQUNGO0dBQ0Esa0JBQWtCO0dBQ2xCLG1CQUFtQixjQUFjLE1BQU0saUJBQWlCLG1CQUFtQjtHQUMzRSxtQkFBbUIsVUFBVSxPQUFPLGFBQWEsTUFBTSxjQUFjO0VBQ3ZFO0VBQ0EsTUFBTSxZQUFZLFlBQVksY0FBYyxTQUFTO0VBQ3JELFVBQVUsZ0JBQWdCO0dBQ3hCLFVBQVU7R0FDVixVQUFVLGNBQWMsT0FBTyxhQUFhLFVBQVU7R0FDdEQsVUFBVSxVQUFVLE9BQU8sYUFBYSxPQUFPLFVBQVU7RUFDM0Q7RUFDQSxNQUFNLGdCQUFnQixZQUFZLGNBQWMsZ0JBQWdCO0VBQ2hFLGNBQWMsUUFBUSxPQUFPLFdBQVc7RUFDeEMsY0FBYyxZQUFXLGdCQUFlO0dBQ3RDLE9BQU8sVUFBVSxZQUFZLE9BQU87R0FDcEMsaUJBQWlCLFVBQVUsWUFBWSxPQUFPLEtBQUs7RUFDckQ7RUFDQSxZQUFZLGNBQWMsa0JBQWtCLENBQUMsQ0FBQyxnQkFBZ0IsbUJBQW1CO0VBQ2pGLFlBQVksY0FBYyxhQUFhLENBQUMsQ0FBQyxnQkFBZ0IsY0FBYztFQUN2RSxNQUFNLHdCQUF3QixZQUFZLGNBQWMscUJBQXFCO0VBQzdFLE1BQU0sbUJBQW1CLFlBQVksY0FBYyxtQkFBbUI7RUFDdEUsTUFBTSxpQkFBaUIsWUFBWSxjQUFjLGlCQUFpQjtFQUNsRSxJQUFJLHNCQUFzQjtFQUMxQixzQkFBc0IsZ0JBQWdCO0dBQ3BDLHNCQUFzQixDQUFDO0dBQ3ZCLGlCQUFpQixNQUFNLFVBQVUsc0JBQXNCLFVBQVU7R0FDakUsZUFBZSxjQUFjLHNCQUFzQixNQUFNO0VBQzNEO0VBV0EsT0FBTyxRQUFRO0dBVGIsZUFBZTtHQUNmLGdCQUFnQjtHQUNoQixhQUFhO0dBQ2IsaUJBQWlCO0dBQ2pCLGlCQUFpQjtHQUNqQixtQkFBbUI7R0FDbkIsb0JBQW9CO0dBQ3BCLGlCQUFpQjtFQUVXLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxXQUFXLGNBQWM7R0FDbEUsTUFBTSxnQkFBZ0IsWUFBWSxjQUFjLE1BQU0sU0FBUztHQUMvRCxJQUFJLGVBQ0YsY0FBYyxpQkFBaUIsVUFBUyxvQkFBbUI7SUFDekQsT0FBTyxVQUFVLFlBQVksZ0JBQWdCLE9BQU87R0FDdEQsQ0FBQztFQUVMLENBQUM7RUFDRCxxQkFBcUIsV0FBVztFQUNoQyxPQUFPO0NBQ1Q7Q0FDQSxTQUFTLG9CQUFvQjtFQUMzQixNQUFNLGNBQWMsU0FBUyxjQUFjLEtBQUs7RUFDaEQsWUFBWSxLQUFLO0VBQ2pCLFlBQVksWUFBWTtFQUN4QixZQUFZLE1BQU0sVUFBVTtFQUM1QixZQUFZLFlBQVk7RUFDeEIsU0FBUyxLQUFLLFlBQVksV0FBVztFQUNyQyxNQUFNLGFBQWEsWUFBWSxjQUFjLGFBQWE7RUFDMUQsSUFBSSx5QkFBeUI7RUFDN0IsWUFBWSxjQUFjLFlBQVksQ0FBQyxDQUFDLFdBQVUsZ0JBQWU7R0FDL0QsWUFBWSxnQkFBZ0I7R0FDNUIseUJBQXlCLENBQUM7R0FDMUIsV0FBVyxNQUFNLFVBQVUseUJBQXlCLFNBQVM7R0FDN0QsWUFBWSxjQUFjLFlBQVksQ0FBQyxDQUFDLGNBQWMseUJBQXlCLE1BQU07RUFDdkY7RUFDQSxNQUFNLGFBQWEsWUFBWSxjQUFjLFVBQVU7RUFDdkQsV0FBVyxnQkFBZ0IsV0FBVztFQUN0QyxNQUFNLGVBQWUsWUFBWSxjQUFjLGVBQWU7RUFDOUQsYUFBYSxRQUFRLE9BQU8sUUFBUSxZQUFZO0VBQ2hELGFBQWEsaUJBQWlCLFlBQVcsaUJBQWdCO0dBQ3ZELGFBQWEsZUFBZTtHQUM1QixhQUFhLGdCQUFnQjtHQUM3QixPQUFPLFVBQVUsYUFBYTtHQUM5QixhQUFhLFFBQVEsYUFBYSxJQUFJLFdBQVcsSUFBSSxhQUFhLElBQUksWUFBWSxJQUFJLGFBQWE7RUFDckcsQ0FBQztFQUVELFlBRHFDLGNBQWMsbUJBQ3BDLENBQUMsQ0FBQyxpQkFBaUIsVUFBUyxxQkFBb0I7R0FDN0QsTUFBTSxhQUFhLGlCQUFpQixPQUFPO0dBQzNDLE9BQU8sbUJBQW1CO0lBQ3hCLEdBQUcsU0FBUyxXQUFXLE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRTtJQUN0QyxHQUFHLFNBQVMsV0FBVyxNQUFNLEdBQUcsQ0FBQyxHQUFHLEVBQUU7SUFDdEMsR0FBRyxTQUFTLFdBQVcsTUFBTSxHQUFHLENBQUMsR0FBRyxFQUFFO0dBQ3hDO0VBQ0YsQ0FBQztFQUNELE1BQU0sZ0JBQWdCLFlBQVksY0FBYyxnQkFBZ0I7RUFDaEUsY0FBYyxRQUFRLE9BQU8sZUFBZSxZQUFZO0VBQ3hELGNBQWMsaUJBQWlCLFlBQVcsa0JBQWlCO0dBQ3pELGNBQWMsZUFBZTtHQUM3QixjQUFjLGdCQUFnQjtHQUM5QixPQUFPLGlCQUFpQixjQUFjLElBQUksWUFBWTtHQUN0RCxjQUFjLFFBQVEsY0FBYyxJQUFJLFdBQVcsSUFBSSxjQUFjLElBQUksWUFBWSxJQUFJLGNBQWM7RUFDekcsQ0FBQztFQUNELHFCQUFxQixXQUFXO0VBQ2hDLE9BQU87Q0FDVDtDQUNBLFNBQVMsd0JBQXdCO0VBQy9CLE1BQU0sa0JBQWtCLFNBQVMsY0FBYyxLQUFLO0VBQ3BELGdCQUFnQixLQUFLO0VBQ3JCLGdCQUFnQixZQUFZO0VBQzVCLGdCQUFnQixNQUFNLFVBQVU7RUFDaEMsZ0JBQWdCLFlBQVk7RUFDNUIsU0FBUyxLQUFLLFlBQVksZUFBZTtFQUN6QyxNQUFNLGlCQUFpQixnQkFBZ0IsY0FBYyxXQUFXO0VBQ2hFLElBQUksNkJBQTZCO0VBQ2pDLGdCQUFnQixjQUFjLFVBQVUsQ0FBQyxDQUFDLFdBQVUsVUFBUztHQUMzRCxNQUFNLGdCQUFnQjtHQUN0Qiw2QkFBNkIsQ0FBQztHQUM5QixlQUFlLE1BQU0sVUFBVSw2QkFBNkIsU0FBUztHQUNyRSxnQkFBZ0IsY0FBYyxVQUFVLENBQUMsQ0FBQyxjQUFjLDZCQUE2QixNQUFNO0VBQzdGO0VBQ0EsTUFBTSxrQkFBa0IsZ0JBQWdCLGNBQWMsZUFBZTtFQUNyRSxnQkFBZ0IsZ0JBQWdCO0dBQzlCLElBQUksT0FBTyxrQkFBa0I7SUFDM0IsaUJBQWlCO0lBQ2pCLGdCQUFnQixjQUFjO0lBQzlCLGdCQUFnQixVQUFVLE9BQU8sV0FBVztHQUM5QyxPQUFPO0lBQ0wsZ0JBQWdCO0lBQ2hCLGdCQUFnQixjQUFjO0lBQzlCLGdCQUFnQixVQUFVLElBQUksV0FBVztHQUMzQztFQUNGO0VBQ0EsTUFBTSxpQkFBaUIsZ0JBQWdCLGNBQWMsY0FBYztFQUNuRSxlQUFlLEtBQUs7RUFDcEIsTUFBTSxpQkFBaUIsZ0JBQWdCLGNBQWMsaUJBQWlCO0VBQ3RFLGVBQWUsZ0JBQWdCO0dBQzdCLElBQUksT0FBTyxnQkFBZ0I7SUFDekIsYUFBYTtJQUNiLGVBQWUsY0FBYztJQUM3QixlQUFlLFVBQVUsT0FBTyxXQUFXO0dBQzdDLE9BQU87SUFDTCxjQUFjLGVBQWUsS0FBSztJQUNsQyxlQUFlLGNBQWM7SUFDN0IsZUFBZSxVQUFVLElBQUksV0FBVztHQUMxQztFQUNGO0VBQ0EsZUFBZSxZQUFXLHdCQUF1QjtHQUMvQyxJQUFJLE9BQU8sZ0JBQWdCO0lBQ3pCLE9BQU8sZUFBZSxvQkFBb0IsT0FBTztJQUNqRCxJQUFJLG9CQUFvQixPQUFPLFVBQVUsVUFDdkMsaUJBQWlCO0lBRW5CLGlCQUFpQixXQUFXLG9CQUFvQixPQUFPLEtBQUs7R0FDOUQ7RUFDRjtFQUNBLE1BQU0sa0JBQWtCLGdCQUFnQixjQUFjLGtCQUFrQjtFQUN4RSxNQUFNLG1CQUFtQixnQkFBZ0IsY0FBYyxtQkFBbUI7RUFDMUUsTUFBTSxrQkFBa0IsZ0JBQWdCLGNBQWMsa0JBQWtCO0VBQ3hFLGdCQUFnQixVQUFVLE9BQU87RUFDakMsaUJBQWlCLFVBQVUsT0FBTztFQUNsQyxnQkFBZ0IsVUFBVSxPQUFPO0VBRWpDLGdCQUR1QyxtQkFDeEIsaUJBQWlCLFVBQVMsd0JBQXVCO0dBQzlELG9CQUFvQixnQkFBZ0I7R0FDcEMsZ0JBQWdCLFVBQVUsQ0FBQyxnQkFBZ0I7R0FDM0MsT0FBTyxnQkFBZ0IsZ0JBQWdCO0dBQ3ZDLGlCQUFpQixnQkFBZ0IsVUFBVSxrQkFBa0IsZ0JBQWdCO0VBQy9FLENBQUM7RUFFRCxpQkFEeUMsbUJBQ3pCLGlCQUFpQixVQUFTLDJCQUEwQjtHQUNsRSx1QkFBdUIsZ0JBQWdCO0dBQ3ZDLGlCQUFpQixVQUFVLENBQUMsaUJBQWlCO0dBQzdDLE9BQU8saUJBQWlCLGlCQUFpQjtHQUN6QyxpQkFBaUIsaUJBQWlCLFVBQVUsbUJBQW1CLGlCQUFpQjtFQUNsRixDQUFDO0VBRUQsZ0JBRHVDLG1CQUN4QixpQkFBaUIsVUFBUyx3QkFBdUI7R0FDOUQsb0JBQW9CLGdCQUFnQjtHQUNwQyxnQkFBZ0IsVUFBVSxDQUFDLGdCQUFnQjtHQUMzQyxPQUFPLHVCQUF1QixnQkFBZ0I7R0FDOUMsaUJBQWlCLGdCQUFnQixVQUFVLHFCQUFxQixtQkFBbUI7RUFDckYsQ0FBQztFQUNELHFCQUFxQixlQUFlO0VBQ3BDLE9BQU87Q0FDVDtDQUNBLFNBQVMsc0JBQXNCO0VBQzdCLE1BQU0sZ0JBQWdCLFNBQVMsY0FBYyxLQUFLO0VBQ2xELGNBQWMsS0FBSztFQUNuQixjQUFjLFlBQVk7RUFDMUIsY0FBYyxNQUFNLFVBQVU7RUFDOUIsY0FBYyxZQUFZO0VBQzFCLFNBQVMsS0FBSyxZQUFZLGFBQWE7RUFDdkMsTUFBTSxzQkFBc0IsY0FBYyxjQUFjLGVBQWU7RUFDdkUsSUFBSSxzQkFBc0I7RUFDMUIsY0FBYyxjQUFjLGNBQWMsQ0FBQyxDQUFDLFdBQVUsZUFBYztHQUNsRSxXQUFXLGdCQUFnQjtHQUMzQixzQkFBc0IsQ0FBQztHQUN2QixvQkFBb0IsTUFBTSxVQUFVLHNCQUFzQixTQUFTO0dBQ25FLGNBQWMsY0FBYyxjQUFjLENBQUMsQ0FBQyxjQUFjLHNCQUFzQixNQUFNO0VBQ3hGO0VBQ0EsTUFBTSxpQkFBaUIsY0FBYyxjQUFjLGlCQUFpQjtFQUNwRSxlQUFlLFFBQVEsV0FBVyxZQUFZO0VBQzlDLGVBQWUsaUJBQWlCLFlBQVcsa0JBQWlCO0dBQzFELGNBQWMsZUFBZTtHQUM3QixhQUFhLGNBQWM7R0FDM0IsZUFBZSxRQUFRLGNBQWMsSUFBSSxXQUFXLElBQUksY0FBYyxJQUFJLFlBQVksSUFBSSxjQUFjO0VBQzFHLENBQUM7RUFDRCxNQUFNLGFBQWEsY0FBYyxjQUFjLFFBQVE7RUFDdkQsV0FBVyxRQUFRLGFBQWEsUUFBUSxPQUFPLEtBQUs7RUFDcEQsY0FBYyxjQUFjLFVBQVUsQ0FBQyxDQUFDLGdCQUFnQjtHQUN0RCxNQUFNLGdCQUFnQixXQUFXLE1BQU0sS0FBSztHQUM1QyxJQUFJLENBQUMsZUFBZTtJQUNsQixpQkFBaUIsYUFBYTtJQUM5QjtHQUNGO0dBQ0EsYUFBYSxRQUFRLFNBQVMsYUFBYTtHQUMzQyxvQkFBb0I7R0FDcEIsaUJBQWlCLG9CQUFvQjtFQUN2QztFQUNBLE1BQU0scUJBQXFCLGNBQWMsY0FBYyxjQUFjO0VBQ3JFLE1BQU0sZUFBZSxhQUFhLFFBQVEsT0FBTyxLQUFLO0VBQ3RELE1BQU0sZUFBZSxLQUFLLE1BQU0sYUFBYSxRQUFRLGNBQWMsS0FBSyxJQUFJO0VBRTVFLG1CQUFtQixRQUFRO0dBREw7R0FBUTtHQUFRO0dBQU87R0FBUztHQUFRO0dBQVk7R0FBTztFQUMzQyxDQUFDLENBQUMsU0FBUyxZQUFZLEtBQUssYUFBYSxnQkFBZ0IsZUFBZTtFQUM5RyxtQkFBbUIsWUFBVyxxQkFBb0I7R0FDaEQsTUFBTSxxQkFBcUIsaUJBQWlCLE9BQU87R0FDbkQsSUFBSSx1QkFBdUIsYUFDekIsd0JBQXVCLHFCQUFvQjtJQUN6QyxJQUFJLGtCQUNGLFdBQVcsV0FBVztTQUV0QixpQkFBaUIsT0FBTyxRQUFRLGFBQWEsUUFBUSxPQUFPLEtBQUs7R0FFckUsQ0FBQztRQUNJO0lBQ0wsV0FBVyxrQkFBa0I7SUFDN0IsaUJBQWlCLFlBQVksa0JBQWtCO0dBQ2pEO0VBQ0Y7RUFDQSxNQUFNLDhCQUE4QjtHQUNsQyxNQUFNLHlCQUF5QixjQUFjLGNBQWMsa0JBQWtCO0dBQzdFLE1BQU0seUJBQXlCLGNBQWMsY0FBYyxjQUFjO0dBQ3pFLE1BQU0sbUJBQW1CLEtBQUssTUFBTSxhQUFhLFFBQVEsY0FBYyxLQUFLLElBQUk7R0FDaEYsTUFBTSxZQUFZLE9BQU8sS0FBSyxnQkFBZ0I7R0FDOUMsdUJBQXVCLFlBQVk7R0FDbkMsdUJBQXVCLE1BQU0sVUFBVSxVQUFVLFdBQVcsSUFBSSxVQUFVO0dBQzFFLFVBQVUsU0FBUSxpQkFBZ0I7SUFDaEMsTUFBTSxpQkFBaUIsU0FBUyxjQUFjLEtBQUs7SUFDbkQsZUFBZSxNQUFNLFVBQVU7SUFFL0IsZUFBZSxZQUFZLHlDQURMLGFBQWEsUUFBUSxPQUFPLE1BQU0sZUFDNEIsZUFBZSxNQUFNLG1DQUFtQyxlQUFlO0lBQzNKLGVBQWUsaUJBQWlCLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxnQkFBZ0I7S0FDM0QsV0FBVyxZQUFZO0tBQ3ZCLGlCQUFpQixZQUFZLFlBQVk7S0FDekMsc0JBQXNCO0lBQ3hCO0lBQ0EsZUFBZSxpQkFBaUIsUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLGdCQUFnQjtLQUMzRCxNQUFNLGVBQWUsS0FBSyxNQUFNLGFBQWEsUUFBUSxjQUFjLEtBQUssSUFBSTtLQUM1RSxPQUFPLGFBQWE7S0FDcEIsYUFBYSxRQUFRLGdCQUFnQixLQUFLLFVBQVUsWUFBWSxDQUFDO0tBQ2pFLElBQUksYUFBYSxRQUFRLE9BQU8sTUFBTSxjQUFjO01BQ2xELFdBQVcsTUFBTTtNQUNqQixtQkFBbUIsUUFBUTtNQUMzQixpQkFBaUIscUJBQXFCO0tBQ3hDLE9BQ0UsaUJBQWlCLGNBQWMsWUFBWTtLQUU3QyxzQkFBc0I7SUFDeEI7SUFDQSx1QkFBdUIsWUFBWSxjQUFjO0dBQ25ELENBQUM7RUFDSDtFQUNBLHNCQUFzQjtFQUN0QixjQUFjLGNBQWMsa0JBQWtCLENBQUMsQ0FBQyxnQkFBZ0I7R0FDOUQsTUFBTSxpQkFBaUIsY0FBYyxjQUFjLGtCQUFrQixDQUFDLENBQUMsTUFBTSxLQUFLO0dBQ2xGLElBQUksQ0FBQyxnQkFBZ0I7SUFDbkIsaUJBQWlCLG9CQUFvQjtJQUNyQztHQUNGO0dBRUEsSUFBSTtJQURxQjtJQUFRO0lBQVE7SUFBTztJQUFTO0lBQVE7SUFBWTtJQUFPO0dBQ2xFLENBQUMsQ0FBQyxTQUFTLGVBQWUsWUFBWSxDQUFDLEdBQUc7SUFDMUQsaUJBQWlCLGdDQUFnQztJQUNqRDtHQUNGO0dBQ0EsTUFBTSxlQUFlLGNBQWMsY0FBYyxRQUFRLENBQUMsQ0FBQztHQUMzRCxNQUFNLGtCQUFrQixjQUFjLGNBQWMsT0FBTyxDQUFDLENBQUM7R0FDN0QsTUFBTSxhQUFhLGNBQWMsY0FBYyxVQUFVLENBQUMsQ0FBQztHQUMzRCxNQUFNLGFBQWEsU0FBUyxhQUFhLE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRTtHQUN4RCxNQUFNLGVBQWUsU0FBUyxhQUFhLE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRTtHQUMxRCxNQUFNLGNBQWMsU0FBUyxhQUFhLE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRTtHQUN6RCxNQUFNLGtCQUFpQixpQkFBZ0I7SUFJckMsT0FBTyxNQUFNO0tBSE0sU0FBUyxhQUFhLE1BQU0sR0FBRyxDQUFDLEdBQUcsRUFBRSxJQUFJO0tBQ3ZDLFNBQVMsYUFBYSxNQUFNLEdBQUcsQ0FBQyxHQUFHLEVBQUUsSUFBSTtLQUMxQyxTQUFTLGFBQWEsTUFBTSxHQUFHLENBQUMsR0FBRyxFQUFFLElBQUk7SUFDVixDQUFDLENBQUMsS0FBSSxzQkFBcUIsS0FBSyxJQUFJLEtBQUssaUJBQWlCLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRTtHQUN2SjtHQUNBLE1BQU0sY0FBYztJQUNsQixLQUFLO0lBQ0wsTUFBTSxlQUFlLFlBQVk7SUFDakMsUUFBUSxhQUFhLE1BQU0sZUFBZSxNQUFNO0lBQ2hELE1BQU07SUFDTixTQUFTO0lBQ1QsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLLGVBQWUsVUFBVTtJQUM5QixRQUFRO0lBQ1IsT0FBTyxlQUFlLFVBQVU7R0FDbEM7R0FDQSxNQUFNLGVBQWUsS0FBSyxNQUFNLGFBQWEsUUFBUSxjQUFjLEtBQUssSUFBSTtHQUM1RSxhQUFhLGtCQUFrQjtHQUMvQixhQUFhLFFBQVEsZ0JBQWdCLEtBQUssVUFBVSxZQUFZLENBQUM7R0FDakUsV0FBVyxjQUFjO0dBQ3pCLGNBQWMsY0FBYyxrQkFBa0IsQ0FBQyxDQUFDLFFBQVE7R0FDeEQsc0JBQXNCO0dBQ3RCLGlCQUFpQixrQkFBa0IsY0FBYztFQUNuRDtFQUNBLE1BQU0sdUJBQXVCLGNBQWMsY0FBYyx1QkFBdUI7RUFDaEYsTUFBTSxxQkFBcUIsY0FBYyxjQUFjLHFCQUFxQjtFQUM1RSxNQUFNLG1CQUFtQixjQUFjLGNBQWMsbUJBQW1CO0VBQ3hFLElBQUksK0JBQStCO0VBQ25DLHFCQUFxQixnQkFBZ0I7R0FDbkMsK0JBQStCLENBQUM7R0FDaEMsbUJBQW1CLE1BQU0sVUFBVSwrQkFBK0IsVUFBVTtHQUM1RSxpQkFBaUIsY0FBYywrQkFBK0IsTUFBTTtFQUN0RTtFQUNBLE1BQU0sb0JBQW9CLGNBQWMsY0FBYyxvQkFBb0I7RUFDMUUsTUFBTSxrQkFBa0IsY0FBYyxjQUFjLGtCQUFrQjtFQUN0RSxNQUFNLGdCQUFnQixjQUFjLGNBQWMsZ0JBQWdCO0VBQ2xFLElBQUksbUJBQW1CO0VBQ3ZCLGtCQUFrQixnQkFBZ0I7R0FDaEMsbUJBQW1CLENBQUM7R0FDcEIsZ0JBQWdCLE1BQU0sVUFBVSxtQkFBbUIsVUFBVTtHQUM3RCxjQUFjLGNBQWMsbUJBQW1CLE1BQU07R0FDckQsSUFBSSxrQkFDRixzQkFBc0I7RUFFMUI7RUFDQSxxQkFBcUIsYUFBYTtFQUNsQyxPQUFPO0NBQ1Q7Q0FDQSxTQUFTLG1CQUFtQjtFQUMxQixNQUFNLGFBQWEsU0FBUyxjQUFjLEtBQUs7RUFDL0MsV0FBVyxLQUFLO0VBQ2hCLFdBQVcsWUFBWTtFQUN2QixXQUFXLE1BQU0sVUFBVTtFQUMzQixXQUFXLFlBQVk7RUFDdkIsU0FBUyxLQUFLLFlBQVksVUFBVTtFQUNwQyxNQUFNLG1CQUFtQixXQUFXLGNBQWMsWUFBWTtFQUM5RCxJQUFJLGdCQUFnQjtFQUNwQixXQUFXLGNBQWMsV0FBVyxDQUFDLENBQUMsV0FBVSxVQUFTO0dBQ3ZELE1BQU0sZ0JBQWdCO0dBQ3RCLGdCQUFnQixDQUFDO0dBQ2pCLGlCQUFpQixNQUFNLFVBQVUsZ0JBQWdCLFNBQVM7R0FDMUQsV0FBVyxjQUFjLFdBQVcsQ0FBQyxDQUFDLGNBQWMsZ0JBQWdCLE1BQU07RUFDNUU7RUFDQSxXQUFXLGNBQWMsZUFBZSxDQUFDLENBQUMsZ0JBQWdCLGFBQWE7RUFDdkUsV0FBVyxjQUFjLGVBQWUsQ0FBQyxDQUFDLGdCQUFnQixjQUFjO0VBQ3hFLFdBQVcsY0FBYyxlQUFlLENBQUMsQ0FBQyxnQkFBZ0IsaUJBQWlCO0VBQzNFLE1BQU0sa0JBQWtCLFdBQVcsY0FBYyxlQUFlO0VBQ2hFLGdCQUFnQixnQkFBZ0I7R0FDOUIsSUFBSSxDQUFDLGNBQWMsUUFBUTtJQUN6QixpQkFBaUIsbUJBQW1CO0lBQ3BDO0dBQ0Y7R0FDQSxJQUFJLFVBQVUsR0FDWixjQUFjO1FBRWQsZUFBZTtFQUVuQjtFQUNBLE1BQU0sa0JBQWtCLFdBQVcsY0FBYyxlQUFlO0VBQ2hFLGdCQUFnQixVQUFVLE9BQU8sYUFBYSxhQUFhLGtCQUFrQjtFQUM3RSxnQkFBZ0IsZ0JBQWdCO0dBQzlCLGFBQWEscUJBQXFCLENBQUMsYUFBYTtHQUNoRCxhQUFhLFFBQVEsYUFBYSxhQUFhLGtCQUFrQjtHQUNqRSxnQkFBZ0IsVUFBVSxPQUFPLGFBQWEsYUFBYSxrQkFBa0I7R0FDN0UsaUJBQWlCLGFBQWEscUJBQXFCLFlBQVksVUFBVTtFQUMzRTtFQUNBLE1BQU0scUJBQXFCLFdBQVcsY0FBYyxrQkFBa0I7RUFDdEUsbUJBQW1CLFVBQVUsT0FBTyxhQUFhLGFBQWEscUJBQXFCO0VBQ25GLG1CQUFtQixnQkFBZ0I7R0FDakMsYUFBYSx3QkFBd0IsQ0FBQyxhQUFhO0dBQ25ELGFBQWEsUUFBUSxnQkFBZ0IsYUFBYSxxQkFBcUI7R0FDdkUsbUJBQW1CLFVBQVUsT0FBTyxhQUFhLGFBQWEscUJBQXFCO0dBQ25GLGlCQUFpQixhQUFhLHdCQUF3QixlQUFlLGFBQWE7RUFDcEY7RUFDQSxNQUFNLHFCQUFxQixXQUFXLGNBQWMsY0FBYztFQUNsRSxtQkFBbUIsUUFBUSxhQUFhO0VBQ3hDLG1CQUFtQixXQUFVLHNCQUFxQjtHQUNoRCxhQUFhLGNBQWMsV0FBVyxrQkFBa0IsT0FBTyxLQUFLO0dBQ3BFLGFBQWEsUUFBUSxlQUFlLGFBQWEsV0FBVztHQUM1RCxJQUFJLGFBQ0YsWUFBWSxTQUFTLGFBQWE7R0FFcEMsSUFBSSxlQUNGLElBQUk7SUFDRixjQUFjLFVBQVUsS0FBSyxNQUFNLGFBQWEsY0FBYyxHQUFHLENBQUM7R0FDcEUsU0FBUyxnQkFBZ0IsQ0FBQztFQUU5QjtFQUNBLFdBQVcsY0FBYyxjQUFjLENBQUMsQ0FBQyxnQkFBZ0I7R0FDdkQsTUFBTSxXQUFXLFdBQVcsY0FBYyxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sS0FBSztHQUN2RSxNQUFNLFlBQVksV0FBVyxjQUFjLGlCQUFpQixDQUFDLENBQUMsTUFBTSxLQUFLO0dBQ3pFLElBQUksQ0FBQyxVQUFVO0lBQ2IsaUJBQWlCLGFBQWE7SUFDOUI7R0FDRjtHQUNBLFdBQVcsY0FBYyxnQkFBZ0IsQ0FBQyxDQUFDLFFBQVE7R0FDbkQsV0FBVyxjQUFjLGlCQUFpQixDQUFDLENBQUMsUUFBUTtHQUNwRCxtQkFBbUIsVUFBVSxTQUFTO0VBQ3hDO0VBQ0EsaUJBQWlCO0VBQ2pCLHFCQUFxQixVQUFVO0VBQy9CLE9BQU87Q0FDVDtDQUNBLFNBQVMsMkJBQTJCO0VBQ2xDLE1BQU0sY0FBYyxTQUFTLGNBQWMsS0FBSztFQUNoRCxZQUFZLEtBQUs7RUFDakIsWUFBWSxZQUFZO0VBQ3hCLFlBQVksTUFBTSxVQUFVO0VBQzVCLFlBQVksWUFBWTtFQUN4QixTQUFTLEtBQUssWUFBWSxXQUFXO0VBQ3JDLE1BQU0sYUFBYSxZQUFZLGNBQWMsYUFBYTtFQUMxRCxJQUFJLGNBQWM7RUFDbEIsWUFBWSxjQUFjLFlBQVksQ0FBQyxDQUFDLFdBQVUsVUFBUztHQUN6RCxNQUFNLGdCQUFnQjtHQUN0QixjQUFjLENBQUM7R0FDZixXQUFXLE1BQU0sVUFBVSxjQUFjLFNBQVM7R0FDbEQsWUFBWSxjQUFjLFlBQVksQ0FBQyxDQUFDLGNBQWMsY0FBYyxNQUFNO0VBQzVFO0VBQ0EscUJBQXFCLFdBQVc7RUFDaEMsT0FBTztDQUNUO0NBQ0EsSUFBSSxhQUFhOzs7Q0N0bUJqQixJQUFJLGlCQUFpQjtDQUNyQixTQUFTLGdCQUFnQjtFQUN2QixJQUFJLGdCQUNGO0VBRUYsaUJBQWlCO0VBQ2pCLE1BQU0sY0FBYztHQUFDO0dBQWdCO0dBQW1CO0dBQW1EO0dBQWtCO0dBQXNDO0dBQWtDO0dBQXFCO0dBQTZDO0dBQXdDO0VBQXdEO0VBQ3ZXLE1BQU0sa0JBQWtCO0dBQ3RCLFlBQVksU0FBUSxvQkFBbUI7SUFDckMsU0FBUyxpQkFBaUIsZUFBZSxDQUFDLENBQUMsU0FBUSxrQkFBaUI7S0FDbEUsY0FBYyxNQUFNLFVBQVU7S0FDOUIsY0FBYyxNQUFNLFVBQVU7S0FDOUIsY0FBYyxNQUFNLGdCQUFnQjtLQUNwQyxjQUFjLE1BQU0sYUFBYTtLQUNqQyxjQUFjLGdCQUFnQixLQUFLO0tBQ25DLGNBQWMsT0FBTztJQUN2QixDQUFDO0dBQ0gsQ0FBQztHQUNELE1BQU0scUJBQXFCLFNBQVMsY0FBYyxrQkFBa0I7R0FDcEUsSUFBSSxvQkFBb0I7SUFDdEIsbUJBQW1CLE1BQU0sV0FBVztJQUNwQyxtQkFBbUIsTUFBTSxRQUFRO0lBQ2pDLG1CQUFtQixNQUFNLFdBQVc7R0FDdEM7RUFDRjtFQUNBLFVBQVU7RUFDVixJQUFJLGlCQUFpQixTQUFTLENBQUMsQ0FBQyxRQUFRLFNBQVMsTUFBTTtHQUNyRCxXQUFXO0dBQ1gsU0FBUztHQUNULFlBQVk7RUFDZCxDQUFDO0VBQ0QsWUFBWSxXQUFXLEdBQUk7RUFDM0IsaUJBQWlCLG1CQUFtQjtDQUN0Qzs7O0NDMUJBLElBQUksOEJBQWMsSUFBSSxRQUFRO0NBQzlCLFNBQVMsY0FBYyxjQUFjLGFBQWEsU0FBUztFQUN6RCxNQUFNLGdCQUFnQixhQUFhO0VBQ25DLE1BQU0sYUFBYSxJQUFJLE1BQU0sZUFBZSxPQUFPO0VBQ25ELFlBQVksSUFBSSxZQUFZLGFBQWE7RUFDekMsYUFBYSxlQUFlO0NBQzlCO0NBRUEsTUFBTSxjQUFjLENBQUM7Q0FDckIsU0FBUyxpQkFBaUIsV0FBVztFQUNuQyxJQUFJLENBQUMsV0FDSCxZQUFZLGFBQWE7RUFFM0IsSUFBSSxDQUFDLFdBQ0gsT0FBTztFQUVULElBQUksT0FBTyxZQUNULE9BQU8sT0FBTztFQUVoQixJQUFJLFlBQVksZUFBZTtHQUM3QixNQUFNLGdCQUFnQixVQUFVLFlBQVk7R0FDNUMsSUFBSSxlQUFlO0lBQ2pCLE9BQU8sYUFBYTtJQUNwQixPQUFPO0dBQ1Q7RUFDRjtFQUNBLEtBQUssTUFBTSxlQUFlLE9BQU8sS0FBSyxTQUFTLEdBQUc7R0FDaEQsTUFBTSxnQkFBZ0IsVUFBVTtHQUNoQyxJQUFJLGlCQUFpQixPQUFPLGtCQUFrQixZQUFZLENBQUMsTUFBTSxRQUFRLGFBQWEsTUFBTSxjQUFjLGdCQUFnQixjQUFjLGVBQWU7SUFDckosT0FBTyxhQUFhO0lBQ3BCLE9BQU87R0FDVDtFQUNGO0VBQ0EsT0FBTztDQUNUO0NBQ0EsU0FBUyxpQkFBaUI7RUFDeEIsSUFBSTtHQUNGLE1BQU0sWUFBWSxhQUFhO0dBQy9CLElBQUksQ0FBQyxXQUNILE9BQU87R0FFVCxJQUFJLFVBQVUsYUFBYSxVQUFVLFVBQVUsU0FBUyxHQUN0RCxPQUFPLFVBQVUsVUFBVTtHQUU3QixJQUFJLFVBQVUsY0FBYyxVQUFVLFdBQVcsU0FBUyxHQUN4RCxPQUFPLFVBQVUsV0FBVztHQUU5QixPQUFPO0VBQ1QsU0FBUyxPQUFPO0dBQ2QsT0FBTztFQUNUO0NBQ0Y7Q0FDQSxTQUFTLG1CQUFtQjtFQUMxQixJQUFJO0dBQ0YsTUFBTSxvQkFBb0IsT0FBTyxNQUFNLFFBQVEsTUFBSyxnQkFBZSxhQUFhLFdBQVcsTUFBTSxVQUFVLE9BQU8sQ0FBQztHQUNuSCxJQUFJLG1CQUNGLE9BQU8sa0JBQWtCLFVBQVUsS0FBSyxTQUFTLE1BQU07RUFFM0QsU0FBUyxLQUFLLENBQUM7RUFDZixPQUFPO0NBQ1Q7Q0FDQSxJQUFJLGNBQWM7Q0FDbEIsSUFBSSxZQUFZO0VBQ2QsVUFBVTtFQUNWLFNBQVM7RUFDVCxTQUFTO0VBQ1QsR0FBRztFQUNILEdBQUc7Q0FDTDtDQUVBLElBQUksWUFBWTtDQUNoQixTQUFTLHdCQUF3QjtFQUMvQixJQUFJLFdBQ0Y7RUFFRixZQUFZO0VBQ1osaUJBQWlCO0dBQ2YsYUFBYTtHQUNiLFdBQVcsYUFBYSxRQUFRLE9BQU8sS0FBSyxNQUFNO0dBQ2xELGlCQUFpQjtHQUNqQixrQkFBa0I7R0FDbEIsa0JBQWtCO0dBQ2xCLHNCQUFzQjtHQUN0QixvQkFBb0I7R0FDcEIseUJBQXlCO0dBQ3pCLGlCQUFpQjtHQUNqQixvQkFBb0I7R0FDcEIsY0FBYztHQUNkLGNBQWM7R0FDZCxpQkFBaUI7R0FDakIsY0FBYztHQUNkLFdBQVc7R0FDWCxjQUFjO0dBQ2QsZUFBZTtHQUNmLE1BQU0sK0JBQStCO0dBQ3JDLGNBQWM7RUFDaEIsR0FBRyxHQUFJO0NBQ1Q7Q0FFQSxNQUFhLFFBQVE7RUFDbkIsYUFBYTtFQUNiLFdBQVc7RUFDWCxtQkFBbUI7RUFDbkIscUJBQXFCO0VBQ3JCLGNBQWM7RUFDZCxZQUFZO0VBQ1osVUFBVTtFQUNWLGdCQUFnQjtFQUNoQiw4QkFBOEI7Q0FDaEM7OztDQ3BIQSxTQUFTLGdCQUFnQjtFQUN2QixPQUFPLFNBQVMsY0FBYyxhQUFhLEtBQUssU0FBUyxjQUFjLFFBQVEsS0FBSyxTQUFTLGNBQWMsMEJBQTBCO0NBQ3ZJO0NBQ0EsU0FBUyxxQkFBcUI7RUFDNUIsTUFBTSxhQUFhLFNBQVMsZUFBZSxTQUFTO0VBQ3BELElBQUksWUFBWTtHQUNkLFdBQVcsY0FBYyxPQUFPLGVBQWUsT0FBTyxlQUFlLFdBQVc7R0FDaEYsV0FBVyxVQUFVLE9BQU8sYUFBYSxDQUFDLENBQUMsT0FBTyxlQUFlLENBQUMsQ0FBQyxPQUFPLFlBQVk7RUFDeEY7Q0FDRjtDQUNBLFNBQVMsa0JBQWtCLFVBQVUsUUFBUTtFQUMzQyxJQUFJLGdCQUFnQixTQUFTLGVBQWUsUUFBUTtFQUNwRCxJQUFJLENBQUMsZUFBZTtHQUNsQixnQkFBZ0IsU0FBUyxjQUFjLFFBQVE7R0FDL0MsY0FBYyxLQUFLO0dBQ25CLGNBQWMsTUFBTSxVQUFVLDZEQUE2RCxTQUFTO0dBQ3BHLFNBQVMsS0FBSyxZQUFZLGFBQWE7RUFDekM7RUFDQSxNQUFNLGVBQWUsY0FBYztFQUNuQyxJQUFJLGNBQWM7R0FDaEIsTUFBTSxPQUFPLGFBQWEsc0JBQXNCO0dBQ2hELElBQUksY0FBYyxVQUFVLEtBQUssU0FBUyxjQUFjLFdBQVcsS0FBSyxRQUFRO0lBQzlFLGNBQWMsUUFBUSxLQUFLO0lBQzNCLGNBQWMsU0FBUyxLQUFLO0dBQzlCO0dBQ0EsY0FBYyxNQUFNLE9BQU8sS0FBSyxPQUFPO0dBQ3ZDLGNBQWMsTUFBTSxNQUFNLEtBQUssTUFBTTtHQUNyQyxjQUFjLE1BQU0sUUFBUSxLQUFLLFFBQVE7R0FDekMsY0FBYyxNQUFNLFNBQVMsS0FBSyxTQUFTO0VBQzdDLE9BQU8sSUFBSSxjQUFjLFVBQVUsT0FBTyxjQUFjLGNBQWMsV0FBVyxPQUFPLGFBQWE7R0FDbkcsY0FBYyxRQUFRLE9BQU87R0FDN0IsY0FBYyxTQUFTLE9BQU87RUFDaEM7RUFDQSxPQUFPO0NBQ1Q7Q0FDQSxTQUFTLGdCQUFnQjtFQUN2QixJQUFJLE9BQU8sZ0JBQ1Q7RUFFRixPQUFPLGlCQUFpQjtFQUN4QixTQUFTLGlCQUFpQixjQUFhLHNCQUFxQjtHQUMxRCxNQUFNLGNBQWMsT0FBTztHQUMzQixJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sWUFDMUI7R0FFRixJQUFJLGtCQUFrQixXQUFXLFlBQVksS0FBSyxrQkFBa0IsV0FBVyxZQUFZLElBQUksWUFBWSxLQUFLLGtCQUFrQixXQUFXLFlBQVksS0FBSyxrQkFBa0IsV0FBVyxZQUFZLElBQUksWUFBWSxHQUFHO0lBQ3hOLFVBQVUsV0FBVztJQUNyQixVQUFVLFVBQVUsa0JBQWtCLFVBQVUsWUFBWTtJQUM1RCxVQUFVLFVBQVUsa0JBQWtCLFVBQVUsWUFBWTtJQUM1RCxrQkFBa0IsZUFBZTtJQUNqQyxrQkFBa0IsZ0JBQWdCO0dBQ3BDO0VBQ0YsR0FBRyxJQUFJO0VBQ1AsU0FBUyxpQkFBaUIsY0FBYSxtQkFBa0I7R0FDdkQsSUFBSSxDQUFDLFVBQVUsVUFDYjtHQUVGLFVBQVUsSUFBSSxlQUFlLFVBQVUsVUFBVTtHQUNqRCxVQUFVLElBQUksZUFBZSxVQUFVLFVBQVU7R0FDakQsZUFBZSxlQUFlO0VBQ2hDLEdBQUcsSUFBSTtFQUNQLFNBQVMsaUJBQWlCLFlBQVcsaUJBQWdCO0dBQ25ELElBQUksVUFBVSxVQUFVO0lBQ3RCLFVBQVUsV0FBVztJQUNyQixhQUFhLGVBQWU7R0FDOUI7RUFDRixHQUFHLElBQUk7Q0FDVDs7O0NDL0RBLElBQUksb0JBQW9CO0NBQ3hCLE1BQU0sYUFBYTtFQUFDO0VBQUc7RUFBSTtFQUFJO0VBQUk7RUFBSztFQUFLO0VBQUs7RUFBSztFQUFLO0VBQUs7RUFBSztDQUFHO0NBQ3pFLE1BQU0sY0FBYztDQUNwQixTQUFTLDJCQUEyQjtFQUNsQyxJQUFJLE1BQU0scUJBQ1I7RUFFRixNQUFNLFNBQVMsY0FBYztFQUM3QixJQUFJLENBQUMsUUFBUTtHQUNYLGlCQUFpQixrQkFBa0I7R0FDbkM7RUFDRjtFQUNBLE1BQU0sc0JBQXNCLGtCQUFrQjtHQUM1QyxNQUFNLFNBQVMsV0FBVztHQUMxQixNQUFNLGVBQWUsS0FBSyxLQUFLLElBQUksU0FBUztHQUM1QyxNQUFNLFVBQVUsS0FBSyxNQUFNLGNBQWMsS0FBSyxJQUFJLFlBQVksQ0FBQztHQUMvRCxNQUFNLFVBQVUsS0FBSyxNQUFNLGNBQWMsS0FBSyxJQUFJLFlBQVksQ0FBQztHQUMvRCxPQUFPLGNBQWMsSUFBSSxXQUFXLGVBQWU7SUFDakQsU0FBUyxPQUFPLGFBQWEsSUFBSTtJQUNqQyxTQUFTLE9BQU8sY0FBYyxJQUFJO0lBQ2xDLFNBQVM7R0FDWCxDQUFDLENBQUM7R0FDRixxQkFBcUIsb0JBQW9CLEtBQUssV0FBVztFQUMzRCxHQUFHLEVBQUU7Q0FDUDtDQUNBLFNBQVMsMEJBQTBCO0VBQ2pDLElBQUksTUFBTSxxQkFBcUI7R0FDN0IsY0FBYyxNQUFNLG1CQUFtQjtHQUN2QyxNQUFNLHNCQUFzQjtFQUM5QjtDQUNGO0NBQ0EsU0FBUyw0QkFBNEI7RUFDbkMsSUFBSSxNQUFNLHFCQUNSLHdCQUF3QjtPQUV4Qix5QkFBeUI7Q0FFN0I7Q0FrQkEsU0FBUyxvQkFBb0I7RUFDM0IsSUFBSTtHQUNGLE1BQU0sU0FBUyxlQUFlO0dBQzlCLElBQUksQ0FBQyxRQUNILE9BQU87R0FFVCxNQUFNLFdBQVcsT0FBTztHQUN4QixPQUFPO0lBQ0wsR0FBRyxTQUFTLE9BQU8sS0FBQSxJQUFZLFNBQVMsS0FBSyxTQUFTO0lBQ3RELEdBQUcsU0FBUyxPQUFPLEtBQUEsSUFBWSxTQUFTLEtBQUssU0FBUztHQUN4RDtFQUNGLFNBQVMsT0FBTztHQUNkLE9BQU87RUFDVDtDQUNGO0NBQ0EsU0FBUyxnQkFBZ0IsUUFBUTtFQUMvQixJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sVUFDckIsT0FBTztFQUVULE9BQU87R0FDTCxHQUFHLE9BQU8sU0FBUyxPQUFPLEtBQUEsSUFBWSxPQUFPLFNBQVMsS0FBSyxPQUFPLFNBQVM7R0FDM0UsR0FBRyxPQUFPLFNBQVMsT0FBTyxLQUFBLElBQVksT0FBTyxTQUFTLEtBQUssT0FBTyxTQUFTO0VBQzdFO0NBQ0Y7Q0FDQSxTQUFTLG1CQUFtQixRQUFRO0VBQ2xDLElBQUksQ0FBQyxRQUNILE9BQU87R0FDTCxNQUFNO0dBQ04sTUFBTTtFQUNSO0VBRUYsSUFBSSxPQUFPO0VBQ1gsSUFBSSxPQUFPO0VBQ1gsSUFBSSxPQUFPLFVBQVU7R0FDbkIsT0FBTyxPQUFPLFNBQVMsTUFBTSxPQUFPLFNBQVMsS0FBSztHQUNsRCxPQUFPLE9BQU8sU0FBUyxNQUFNLE9BQU8sU0FBUyxLQUFLO0VBQ3BEO0VBQ0EsSUFBSSxLQUFLLElBQUksSUFBSSxJQUFJLE9BQVEsS0FBSyxJQUFJLElBQUksSUFBSSxLQUFNO0dBQ2xELE1BQU0sV0FBVyxPQUFPLFlBQVksT0FBTyxTQUFTLE9BQU8sYUFBYTtHQUN4RSxPQUFPLEtBQUssSUFBSSxRQUFRO0dBQ3hCLE9BQU8sS0FBSyxJQUFJLFFBQVE7RUFDMUI7RUFDQSxNQUFNLFlBQVksS0FBSyxLQUFLLE9BQU8sT0FBTyxPQUFPLElBQUk7RUFDckQsSUFBSSxZQUFZLE1BQU87R0FDckIsUUFBUTtHQUNSLFFBQVE7RUFDVixPQUFPO0dBQ0wsT0FBTztHQUNQLE9BQU87RUFDVDtFQUNBLE9BQU87R0FDQztHQUNBO0VBQ1I7Q0FDRjtDQUNBLFNBQVMsa0JBQWtCLElBQUksSUFBSSxJQUFJLElBQUk7RUFDekMsT0FBTyxLQUFLLE1BQU0sS0FBSyxPQUFPLEtBQUssT0FBTyxLQUFLLE9BQU8sS0FBSyxHQUFHO0NBQ2hFO0NBQ0EsU0FBUyxtQkFBbUI7RUFDMUIsSUFBSTtHQUVGLE1BQU0sY0FBYyxpQkFESCxhQUMyQixDQUFDO0dBQzdDLE1BQU0sY0FBYyxlQUFlO0dBQ25DLE1BQU0sV0FBVyxrQkFBa0I7R0FDbkMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsVUFDbkMsT0FBTztHQUVULE1BQU0sWUFBWTtJQUNoQixNQUFNLFlBQVk7SUFDbEIsT0FBTztJQUNQLFVBQVUsQ0FBQztJQUNYLFNBQVMsQ0FBQztJQUNWLE1BQU0sQ0FBQztHQUNUO0dBQ0EsTUFBTSxlQUFlLFlBQVksZ0JBQWdCLENBQUM7R0FDbEQsS0FBSyxJQUFJLElBQUksR0FBRyxJQUFJLGFBQWEsUUFBUSxLQUFLO0lBQzVDLE1BQU0sU0FBUyxhQUFhO0lBQzVCLElBQUksQ0FBQyxVQUFVLE9BQU8sT0FBTyxZQUFZLElBQ3ZDO0lBRUYsSUFBSSxZQUFZLGdCQUFnQixPQUFPLGlCQUFpQixZQUFZLGNBQ2xFO0lBRUYsTUFBTSxZQUFZLGdCQUFnQixNQUFNO0lBQ3hDLElBQUksQ0FBQyxhQUFhLFVBQVUsS0FBSyxRQUFRLFVBQVUsS0FBSyxNQUN0RDtJQUVGLE1BQU0sS0FBSyxVQUFVLElBQUksU0FBUztJQUNsQyxNQUFNLEtBQUssVUFBVSxJQUFJLFNBQVM7SUFDbEMsTUFBTSxXQUFXLEtBQUssS0FBSyxLQUFLLEtBQUssS0FBSyxFQUFFO0lBQzVDLE1BQU0sYUFBYTtLQUNqQixJQUFJLE9BQU87S0FDWCxHQUFHLFVBQVU7S0FDYixHQUFHLFVBQVU7S0FDSDtLQUNWLE9BQU8sS0FBSyxNQUFNLElBQUksRUFBRTtLQUN4QixRQUFRO01BQ04sR0FBRztNQUNILE1BQU0sT0FBTyxjQUFjLE9BQU8sUUFBUTtLQUM1QztJQUNGO0lBQ0EsVUFBVSxTQUFTLEtBQUssVUFBVTtJQUNsQyxJQUFJLE9BQU8sU0FBUyxLQUFLLGNBQWMsTUFBTSxHQUMzQyxVQUFVLFFBQVEsS0FBSyxVQUFVO1NBQzVCLElBQUksT0FBTyxTQUFTLEtBQUssQ0FBQyxjQUFjLE1BQU0sR0FDbkQsVUFBVSxLQUFLLEtBQUssVUFBVTtHQUVsQztHQUNBLFVBQVUsUUFBUSxNQUFNLFdBQVcsZUFBZSxVQUFVLFdBQVcsV0FBVyxRQUFRO0dBQzFGLFVBQVUsS0FBSyxNQUFNLE9BQU8sVUFBVSxNQUFNLFdBQVcsTUFBTSxRQUFRO0dBQ3JFLE9BQU87RUFDVCxTQUFTLE9BQU87R0FDZCxPQUFPLEVBQ0wsT0FBTyxNQUFNLFFBQ2Y7RUFDRjtDQUNGO0NBMkNBLFNBQVMsb0JBQW9CLFNBQVMsU0FBUyxhQUFhO0VBQzFELE1BQU0sVUFBVSxjQUFjO0VBQzlCLElBQUksQ0FBQyxTQUNIO0VBRUYsTUFBTSxpQkFBaUIsa0JBQWtCO0VBQ3pDLElBQUksQ0FBQyxnQkFDSDtFQUVGLE1BQU0sT0FBTyxRQUFRLHNCQUFzQjtFQUMzQyxNQUFNLFVBQVUsS0FBSyxPQUFPLEtBQUssUUFBUTtFQUN6QyxNQUFNLFVBQVUsS0FBSyxNQUFNLEtBQUssU0FBUztFQUN6QyxNQUFNLFFBQVEsVUFBVSxlQUFlO0VBQ3ZDLE1BQU0sUUFBUSxVQUFVLGVBQWU7RUFDdkMsTUFBTSxXQUFXLEtBQUssS0FBSyxRQUFRLFFBQVEsUUFBUSxLQUFLO0VBQ3hELElBQUksYUFBYTtFQUNqQixJQUFJLFdBQVcsS0FDYixhQUFhO09BQ1IsSUFBSSxXQUFXLEtBQ3BCLGFBQWE7T0FDUixJQUFJLFdBQVcsS0FDcEIsYUFBYTtPQUNSLElBQUksV0FBVyxLQUNwQixhQUFhO09BQ1IsSUFBSSxXQUFXLElBQ3BCLGFBQWE7T0FDUixJQUFJLFdBQVcsS0FDcEIsYUFBYTtFQUVmLElBQUksVUFBVSxRQUFRO0VBQ3RCLElBQUksVUFBVSxRQUFRO0VBQ3RCLE1BQU0sWUFBWSxLQUFLLElBQUksS0FBSyxPQUFPLEtBQUssTUFBTSxJQUFJO0VBQ3RELE1BQU0saUJBQWlCLEtBQUssS0FBSyxVQUFVLFVBQVUsVUFBVSxPQUFPO0VBQ3RFLElBQUksaUJBQWlCLFdBQVc7R0FDOUIsTUFBTSxhQUFhLFlBQVk7R0FDL0IsV0FBVztHQUNYLFdBQVc7RUFDYjtFQUNBLE1BQU0sU0FBUyxVQUFVO0VBQ3pCLE1BQU0sU0FBUyxVQUFVO0VBQ3pCLFFBQVEsY0FBYyxJQUFJLFdBQVcsZUFBZTtHQUNsRCxTQUFTO0dBQ1QsU0FBUztHQUNULFNBQVM7R0FDVCxNQUFNO0VBQ1IsQ0FBQyxDQUFDO0VBQ0YsSUFBSSxhQUNGLGNBQWMsUUFBUSxNQUFNO0NBRWhDOzs7Q0M1UEEsc0JBQXNCIn0=