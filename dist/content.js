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
	function toggleEntityTrail() {
		if (window.entityTrailEnabled) {
			window.entityTrailEnabled = false;
			window.entityTrailTargetId = null;
			stopEntityTrailTracking();
			window.entityTrailHistory = [];
			showNotification("Trail stopped");
			return;
		}
		const playerData = buildEntityState();
		if (!(playerData && playerData.players && playerData.players.length > 0)) {
			showNotification("No players nearby to trace");
			return;
		}
		const targetPlayerId = playerData.players[0].id;
		const targetPlayerName = playerData.players[0].entity?.name || "ID:" + targetPlayerId;
		window.entityTrailEnabled = true;
		window.entityTrailTargetId = targetPlayerId;
		window.entityTrailHistory = [];
		startEntityTrailTracking();
		showNotification("Tracing: " + targetPlayerName);
	}
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
	function togglePanelsVisibility() {
		const panelIds = [
			"deep-tools-panel",
			"vision-panel",
			"combat-panel",
			"automation-panel",
			"update-history",
			"settings-panel",
			"music-panel"
		];
		const deepToolsPanelElement = document.getElementById("deep-tools-panel");
		if (!deepToolsPanelElement) return;
		const isPanelVisible = deepToolsPanelElement.style.display !== "none";
		panelIds.forEach((elementId) => {
			const targetElement = document.getElementById(elementId);
			if (targetElement) targetElement.style.display = isPanelVisible ? "none" : "block";
		});
	}
	document.addEventListener("keydown", (inputEvent) => {
		if (inputEvent.target.matches("input,textarea,select,[contenteditable]")) return;
		if (inputEvent.repeat) return;
		if (inputEvent.key.toLowerCase() === pressedKeyQ.toLowerCase()) {
			inputEvent.preventDefault();
			inputEvent.stopPropagation();
			simulatePointerMove("left");
		}
		if (inputEvent.key.toLowerCase() === pressedKeyE.toLowerCase()) {
			inputEvent.preventDefault();
			inputEvent.stopPropagation();
			simulatePointerMove("right");
		}
	}, true);
	document.addEventListener("keydown", (inputEvent_2) => {
		if (inputEvent_2.target.matches("input,textarea,select,[contenteditable]")) return;
		if (inputEvent_2.repeat) return;
		if (inputEvent_2.key.toLowerCase() === window.lockKey.toLowerCase()) {
			inputEvent_2.preventDefault();
			toggleLock();
		}
	}, true);
	document.addEventListener("keydown", (inputEvent_3) => {
		if (inputEvent_3.target.matches("input,textarea,select,[contenteditable]")) return;
		if (inputEvent_3.repeat) return;
		const entityTraceKey = window.entityTraceKey.toLowerCase();
		const itemKey = inputEvent_3.key.toLowerCase();
		const itemCode = inputEvent_3.code.toLowerCase();
		if (itemKey === entityTraceKey || itemCode === entityTraceKey || itemCode === "key" + entityTraceKey) {
			inputEvent_3.preventDefault();
			toggleEntityTrail();
		}
	}, true);
	document.addEventListener("keydown", (event) => {
		if (event.target.matches("input,textarea,select")) return;
		if (event.key === "F3") {
			event.preventDefault();
			trackNearestPlayer();
		}
		if (event.key === "F4") {
			event.preventDefault();
			clearTracking();
		}
	});
	document.addEventListener("keydown", (event_2) => {
		if (event_2.target.matches("input,textarea,select")) return;
		if (event_2.key === "F5") {
			event_2.preventDefault();
			if (window.autoFarmActive) {
				stopAutoFarm();
				const autoFarmButton = document.getElementById("autoFarmBtn");
				if (autoFarmButton) {
					autoFarmButton.textContent = "Auto Farm";
					autoFarmButton.classList.remove("toggle-on");
				}
			} else {
				const farmModeSelect = document.getElementById("farmModeSelect");
				startAutoFarm(farmModeSelect ? farmModeSelect.value : "nearest");
				const autoFarmButton_2 = document.getElementById("autoFarmBtn");
				if (autoFarmButton_2) {
					autoFarmButton_2.textContent = "Stop Farm";
					autoFarmButton_2.classList.add("toggle-on");
				}
			}
		}
	});
	document.addEventListener("keydown", (keyboardEvent) => {
		if (keyboardEvent.key === pressedKey && !keyboardEvent.repeat && !keyboardEvent.target.matches("input,textarea,button,select")) {
			keyboardEvent.preventDefault();
			togglePanelsVisibility();
		}
	});
	window.addEventListener("load", () => {
		setTimeout(() => {
			initAntiDetection();
			initBackgroundImage();
		}, 1e3);
		setInterval(() => {
			if (window.__ss?.states) {
				for (const gameInstance of window.__ss.states) if (state.gameInstance?.gameScene?.myAnimals?.length > 0) {
					state.animalData = state.gameInstance.gameScene;
					state.gameInstance = state.gameInstance.gameScene.game;
					window.__cachedEM = null;
					break;
				}
			}
		}, 2e3);
	});
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
	window.lockEnabled = false;
	window.lockTargetId = null;
	window.lockKey = "t";
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
	window.entityTraceKey = "h";
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
	window.autoDodgeEnabled = false;
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
	const offsetValue = 400;
	function simulatePointerMove(direction) {
		const targetElement = getGameCanvas();
		if (!targetElement) return;
		const rect = targetElement.getBoundingClientRect();
		const centerX = rect.left + rect.width / 2;
		const centerY = rect.top + rect.height / 2;
		const targetX = direction === "left" ? centerX - offsetValue : centerX + offsetValue;
		targetElement.dispatchEvent(new MouseEvent("pointermove", {
			clientX: targetX,
			clientY: centerY,
			bubbles: true,
			view: window
		}));
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
	let trailIntervalId = null;
	function startEntityTrailTracking() {
		if (trailIntervalId) {
			clearInterval(trailIntervalId);
			trailIntervalId = null;
		}
		trailIntervalId = setInterval(() => {
			if (!window.entityTrailEnabled || !window.entityTrailTargetId) return;
			const targetEntityId = findEntityById(window.entityTrailTargetId);
			if (!targetEntityId) {
				const gameState = buildEntityState();
				if (gameState && gameState.players && gameState.players.length > 0) window.entityTrailTargetId = gameState.players[0].id;
				return;
			}
			const targetEntityPosition = extractPosition(targetEntityId);
			if (!targetEntityPosition) return;
			const lastTrailPoint = window.entityTrailHistory[window.entityTrailHistory.length - 1];
			if (lastTrailPoint && calculateDistance(lastTrailPoint.x, lastTrailPoint.y, targetEntityPosition.x, targetEntityPosition.y) < 5) return;
			window.entityTrailHistory.push({
				x: targetEntityPosition.x,
				y: targetEntityPosition.y,
				time: Date.now()
			});
			if (window.entityTrailHistory.length > window.entityTrailMaxLength) window.entityTrailHistory.shift();
		}, window.entityTrailRecordInterval);
	}
	function stopEntityTrailTracking() {
		if (trailIntervalId) {
			clearInterval(trailIntervalId);
			trailIntervalId = null;
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

//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudC5qcyIsIm5hbWVzIjpbXSwic291cmNlcyI6WyIuLi9leHRlbnNpb24vc3JjL3V0aWxzLmpzIiwiLi4vZXh0ZW5zaW9uL3NyYy9zdG9yYWdlLmpzIiwiLi4vZXh0ZW5zaW9uL3NyYy91aS9hdWRpby5qcyIsIi4uL2V4dGVuc2lvbi9zcmMvdWkvaW50ZXJhY3Rpb24uanMiLCIuLi9leHRlbnNpb24vc3JjL2ZlYXR1cmVzL2FpbWJvdC5qcyIsIi4uL2V4dGVuc2lvbi9zcmMvZmVhdHVyZXMvYXV0b2Zhcm0uanMiLCIuLi9leHRlbnNpb24vc3JjL3VpL3RoZW1lLmpzIiwiLi4vZXh0ZW5zaW9uL3NyYy9mZWF0dXJlcy9jaGF0LmpzIiwiLi4vZXh0ZW5zaW9uL3NyYy9mZWF0dXJlcy9hbnRpZGV0ZWN0aW9uLmpzIiwiLi4vZXh0ZW5zaW9uL3NyYy9mZWF0dXJlcy94cmF5LmpzIiwiLi4vZXh0ZW5zaW9uL3NyYy9mZWF0dXJlcy9lc3AuanMiLCIuLi9leHRlbnNpb24vc3JjL3VpL3BhbmVscy5qcyIsIi4uL2V4dGVuc2lvbi9zcmMvZmVhdHVyZXMvYWRibG9jay5qcyIsIi4uL2V4dGVuc2lvbi9zcmMvY29yZS5qcyIsIi4uL2V4dGVuc2lvbi9zcmMvdWkvcmFkYXIuanMiLCIuLi9leHRlbnNpb24vc3JjL2ZlYXR1cmVzL21vdmVtZW50LmpzIiwiLi4vZXh0ZW5zaW9uL2NvbnRlbnQuanMiXSwic291cmNlc0NvbnRlbnQiOlsiXG5mdW5jdGlvbiBnZW5lcmF0ZVJhbmRvbVN0cmluZyhzdHJpbmdMZW5ndGgpIHtcbiAgbGV0IHJlc3VsdFN0cmluZyA9IFwiXCI7XG4gIGZvciAobGV0IGluZGV4ID0gMDsgaW5kZXggPCBzdHJpbmdMZW5ndGg7IGluZGV4KyspIHtcbiAgICBjb25zdCByYW5kb21Db2RlUG9pbnQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDQ4NTc1ICsgNjU1MzYpO1xuICAgIHJlc3VsdFN0cmluZyArPSBTdHJpbmcuZnJvbUNvZGVQb2ludChyYW5kb21Db2RlUG9pbnQpO1xuICB9XG4gIHJldHVybiByZXN1bHRTdHJpbmc7XG59XG5jb25zdCBnZXRBbGxQcm9wZXJ0eU5hbWVzID0gdGFyZ2V0T2JqZWN0ID0+IHtcbiAgcmV0dXJuIFsuLi5PYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhPYmplY3QuZ2V0UHJvdG90eXBlT2YodGFyZ2V0T2JqZWN0KSksIC4uLk9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzKHRhcmdldE9iamVjdCldO1xufTtcbmZ1bmN0aW9uIGlzVmFsaWRFbnRpdHkoZW50aXR5KSB7XG4gIGlmICghZW50aXR5KSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChlbnRpdHkudHlwZSA9PT0gMSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGlmIChlbnRpdHkucGxheWVyUm9vbUlkICE9IG51bGwpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZiAoZW50aXR5LmVudGl0eU5hbWUgIT0gbnVsbCAmJiBlbnRpdHkuZW50aXR5TmFtZS5sZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgaWYgKGVudGl0eS52aXNpYmxlRmlzaExldmVsICE9IG51bGwgJiYgZW50aXR5LnZpc2libGVGaXNoTGV2ZWwgPiAwKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5leHBvcnQgeyBnZW5lcmF0ZVJhbmRvbVN0cmluZywgZ2V0QWxsUHJvcGVydHlOYW1lcywgaXNWYWxpZEVudGl0eSB9O1xuIiwiaW1wb3J0IHsgbXVzaWNQbGF5bGlzdCwgdXBkYXRlTXVzaWNQYW5lbCwgcmVzZXRQbGF5YmFjaywgdWlhdWRpb1N0YXRlIH0gZnJvbSAnLi91aS9hdWRpby5qcyc7XG5pbXBvcnQgeyBzaG93Tm90aWZpY2F0aW9uIH0gZnJvbSAnLi91aS9pbnRlcmFjdGlvbi5qcyc7XG5pbXBvcnQgeyBzdGF0ZSB9IGZyb20gJy4vY29yZS5qcyc7XG5cbmZ1bmN0aW9uIGFkZFRyYWNrVG9QbGF5bGlzdCh0cmFja1VybCwgdHJhY2tOYW1lKSB7XG4gIGlmICghdHJhY2tVcmwpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgdHJhY2tOYW1lID0gdHJhY2tOYW1lIHx8IHRyYWNrVXJsLnNwbGl0KFwiL1wiKS5wb3AoKS5zcGxpdChcIj9cIilbMF0gfHwgXCJUcmFjayBcIiArIChtdXNpY1BsYXlsaXN0Lmxlbmd0aCArIDEpO1xuICBtdXNpY1BsYXlsaXN0LnB1c2goe1xuICAgIHVybDogdHJhY2tVcmwsXG4gICAgbmFtZTogdHJhY2tOYW1lXG4gIH0pO1xuICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcIm11c2ljUGxheWxpc3RcIiwgSlNPTi5zdHJpbmdpZnkobXVzaWNQbGF5bGlzdCkpO1xuICB1cGRhdGVNdXNpY1BhbmVsKCk7XG4gIHNob3dOb3RpZmljYXRpb24oXCJBZGRlZDogXCIgKyB0cmFja05hbWUpO1xufVxuZnVuY3Rpb24gcmVtb3ZlVHJhY2tGcm9tUGxheWxpc3QoaW5kZXhUb1JlbW92ZSkge1xuICBtdXNpY1BsYXlsaXN0LnNwbGljZShpbmRleFRvUmVtb3ZlLCAxKTtcbiAgaWYgKHN0YXRlLmN1cnJlbnRUcmFja0luZGV4ID49IG11c2ljUGxheWxpc3QubGVuZ3RoKSB7XG4gICAgc3RhdGUuY3VycmVudFRyYWNrSW5kZXggPSAwO1xuICB9XG4gIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwibXVzaWNQbGF5bGlzdFwiLCBKU09OLnN0cmluZ2lmeShtdXNpY1BsYXlsaXN0KSk7XG4gIGlmICghbXVzaWNQbGF5bGlzdC5sZW5ndGgpIHtcbiAgICByZXNldFBsYXliYWNrKCk7XG4gIH1cbiAgdXBkYXRlTXVzaWNQYW5lbCgpO1xufVxuXG5leHBvcnQgeyBhZGRUcmFja1RvUGxheWxpc3QsIHJlbW92ZVRyYWNrRnJvbVBsYXlsaXN0IH07XG4iLCJpbXBvcnQgeyBzaG93Tm90aWZpY2F0aW9uIH0gZnJvbSAnLi9pbnRlcmFjdGlvbi5qcyc7XG5pbXBvcnQgeyByZW1vdmVUcmFja0Zyb21QbGF5bGlzdCB9IGZyb20gJy4uL3N0b3JhZ2UuanMnO1xuaW1wb3J0IHsgc3RhdGUgfSBmcm9tICcuLi9jb3JlLmpzJztcblxubGV0IGF1ZGlvUGxheWVyID0gbnVsbDtcbmxldCBtdXNpY1BsYXlsaXN0ID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcIm11c2ljUGxheWxpc3RcIikgfHwgXCJbXVwiKTtcblxubGV0IHlvdXR1YmVQbGF5ZXIgPSBudWxsO1xubGV0IGlzWXRBcGlMb2FkZWQgPSBmYWxzZTtcbmxldCBpc0F1dG9maWxsSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbmxldCBhdWRpb1NvdXJjZVR5cGUgPSBudWxsO1xuZnVuY3Rpb24gaXNZb3V0dWJlVXJsKHVybCkge1xuICByZXR1cm4gLyg/OnlvdXR1YmVcXC5jb218eW91dHVcXC5iZSkvaS50ZXN0KHVybCB8fCBcIlwiKTtcbn1cbmZ1bmN0aW9uIGdldFlvdXR1YmVWaWRlb0lkKHVybCkge1xuICBpZiAoIXVybCkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHRyeSB7XG4gICAgY29uc3QgcGFyc2VkVXJsID0gbmV3IFVSTCh1cmwpO1xuICAgIGlmIChwYXJzZWRVcmwuaG9zdG5hbWUuaW5jbHVkZXMoXCJ5b3V0dS5iZVwiKSkge1xuICAgICAgcmV0dXJuIHBhcnNlZFVybC5wYXRobmFtZS5zbGljZSgxKS5zcGxpdChcIi9cIilbMF0gfHwgbnVsbDtcbiAgICB9XG4gICAgaWYgKHBhcnNlZFVybC5ob3N0bmFtZS5pbmNsdWRlcyhcInlvdXR1YmUuY29tXCIpKSB7XG4gICAgICByZXR1cm4gcGFyc2VkVXJsLnNlYXJjaFBhcmFtcy5nZXQoXCJ2XCIpIHx8IChwYXJzZWRVcmwucGF0aG5hbWUuc3RhcnRzV2l0aChcIi9lbWJlZC9cIikgPyBwYXJzZWRVcmwucGF0aG5hbWUuc3BsaXQoXCIvZW1iZWQvXCIpWzFdPy5zcGxpdChcIi9cIilbMF0gOiBudWxsKSB8fCAocGFyc2VkVXJsLnBhdGhuYW1lLnN0YXJ0c1dpdGgoXCIvc2hvcnRzL1wiKSA/IHBhcnNlZFVybC5wYXRobmFtZS5zcGxpdChcIi9zaG9ydHMvXCIpWzFdPy5zcGxpdChcIi9cIilbMF0gOiBudWxsKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yKSB7fVxuICByZXR1cm4gbnVsbDtcbn1cbmZ1bmN0aW9uIGVuc3VyZVlvdXR1YmVBcGlSZWFkeShjYWxsYmFjaykge1xuICBpZiAoaXNZdEFwaUxvYWRlZCAmJiB3aW5kb3cuWVQgJiYgd2luZG93LllULlBsYXllcikge1xuICAgIGNhbGxiYWNrKCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghd2luZG93Ll9hc3RZdFJlYWR5Q2FsbGJhY2tzKSB7XG4gICAgd2luZG93Ll9hc3RZdFJlYWR5Q2FsbGJhY2tzID0gW107XG4gIH1cbiAgd2luZG93Ll9hc3RZdFJlYWR5Q2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuICBpZiAoaXNBdXRvZmlsbEluaXRpYWxpemVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlzQXV0b2ZpbGxJbml0aWFsaXplZCA9IHRydWU7XG4gIGlmICghZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhc3QteXQtYXBpXCIpKSB7XG4gICAgY29uc3Qgc2NyaXB0RWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIik7XG4gICAgc2NyaXB0RWxlbWVudC5pZCA9IFwiYXN0LXl0LWFwaVwiO1xuICAgIHNjcmlwdEVsZW1lbnQuc3JjID0gXCJodHRwczovL3d3dy55b3V0dWJlLmNvbS9pZnJhbWVfYXBpXCI7XG4gICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzY3JpcHRFbGVtZW50KTtcbiAgfVxuICBjb25zdCBvcmlnaW5hbFJlYWR5SGFuZGxlciA9IHdpbmRvdy5vbllvdVR1YmVJZnJhbWVBUElSZWFkeTtcbiAgd2luZG93Lm9uWW91VHViZUlmcmFtZUFQSVJlYWR5ID0gZnVuY3Rpb24gKCkge1xuICAgIGlzWXRBcGlMb2FkZWQgPSB0cnVlO1xuICAgIGlmICh0eXBlb2Ygb3JpZ2luYWxSZWFkeUhhbmRsZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgb3JpZ2luYWxSZWFkeUhhbmRsZXIoKTtcbiAgICAgIH0gY2F0Y2ggKHVuaW5pdGlhbGl6ZWRWYXIxKSB7fVxuICAgIH1cbiAgICBjb25zdCByZWFkeUNhbGxiYWNrcyA9IHdpbmRvdy5fYXN0WXRSZWFkeUNhbGxiYWNrcyB8fCBbXTtcbiAgICB3aGlsZSAocmVhZHlDYWxsYmFja3MubGVuZ3RoKSB7XG4gICAgICBjb25zdCBjdXJyZW50Q2FsbGJhY2sgPSByZWFkeUNhbGxiYWNrcy5zaGlmdCgpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY3VycmVudENhbGxiYWNrKCk7XG4gICAgICB9IGNhdGNoICh1bmluaXRpYWxpemVkVmFyMikge31cbiAgICB9XG4gIH07XG59XG5mdW5jdGlvbiBnZXRZb3V0dWJlSG9zdEVsZW1lbnQoKSB7XG4gIGxldCBob3N0RWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiYXN0LXlvdXR1YmUtaG9zdFwiKTtcbiAgaWYgKCFob3N0RWxlbWVudCkge1xuICAgIGhvc3RFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICBob3N0RWxlbWVudC5pZCA9IFwiYXN0LXlvdXR1YmUtaG9zdFwiO1xuICAgIGhvc3RFbGVtZW50LnN0eWxlLmNzc1RleHQgPSBcInBvc2l0aW9uOmZpeGVkO2xlZnQ6LTk5OTk5cHg7dG9wOi05OTk5OXB4O3dpZHRoOjFweDtoZWlnaHQ6MXB4O29wYWNpdHk6MDtwb2ludGVyLWV2ZW50czpub25lO1wiO1xuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoaG9zdEVsZW1lbnQpO1xuICB9XG4gIHJldHVybiBob3N0RWxlbWVudDtcbn1cbmZ1bmN0aW9uIHBsYXlZb3V0dWJlVmlkZW8odmlkZW9JZCkge1xuICBlbnN1cmVZb3V0dWJlQXBpUmVhZHkoKCkgPT4ge1xuICAgIGNvbnN0IHBsYXllckNvbnRhaW5lcklkID0gZ2V0WW91dHViZUhvc3RFbGVtZW50KCk7XG4gICAgaWYgKHlvdXR1YmVQbGF5ZXIgJiYgdHlwZW9mIHlvdXR1YmVQbGF5ZXIubG9hZFZpZGVvQnlJZCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICB5b3V0dWJlUGxheWVyLmxvYWRWaWRlb0J5SWQodmlkZW9JZCk7XG4gICAgICB0cnkge1xuICAgICAgICB5b3V0dWJlUGxheWVyLnNldFZvbHVtZShNYXRoLnJvdW5kKHVpYXVkaW9TdGF0ZS5tdXNpY1ZvbHVtZSAqIDEwMCkpO1xuICAgICAgfSBjYXRjaCAocGxheWVySW5zdGFuY2UpIHt9XG4gICAgICBhdWRpb1NvdXJjZVR5cGUgPSBcInlvdXR1YmVcIjtcbiAgICAgIHVwZGF0ZU11c2ljUGFuZWwoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgeW91dHViZVBsYXllciA9IG5ldyBZVC5QbGF5ZXIocGxheWVyQ29udGFpbmVySWQsIHtcbiAgICAgIHdpZHRoOiBcIjFcIixcbiAgICAgIGhlaWdodDogXCIxXCIsXG4gICAgICB2aWRlb0lkOiB2aWRlb0lkLFxuICAgICAgcGxheWVyVmFyczoge1xuICAgICAgICBhdXRvcGxheTogMSxcbiAgICAgICAgY29udHJvbHM6IDAsXG4gICAgICAgIGRpc2FibGVrYjogMSxcbiAgICAgICAgZnM6IDAsXG4gICAgICAgIG1vZGVzdGJyYW5kaW5nOiAxLFxuICAgICAgICByZWw6IDBcbiAgICAgIH0sXG4gICAgICBldmVudHM6IHtcbiAgICAgICAgb25SZWFkeTogYXVkaW9QbGF5ZXJFdmVudCA9PiB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGF1ZGlvUGxheWVyRXZlbnQudGFyZ2V0LnNldFZvbHVtZShNYXRoLnJvdW5kKHVpYXVkaW9TdGF0ZS5tdXNpY1ZvbHVtZSAqIDEwMCkpO1xuICAgICAgICAgICAgYXVkaW9QbGF5ZXJFdmVudC50YXJnZXQucGxheVZpZGVvKCk7XG4gICAgICAgICAgfSBjYXRjaCAodW51c2VkVmFyaWFibGUpIHt9XG4gICAgICAgICAgYXVkaW9Tb3VyY2VUeXBlID0gXCJ5b3V0dWJlXCI7XG4gICAgICAgICAgdXBkYXRlTXVzaWNQYW5lbCgpO1xuICAgICAgICB9LFxuICAgICAgICBvblN0YXRlQ2hhbmdlOiB5b3V0dWJlUGxheWVyRXZlbnQgPT4ge1xuICAgICAgICAgIGlmICghd2luZG93LllUKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmICh5b3V0dWJlUGxheWVyRXZlbnQuZGF0YSA9PT0gWVQuUGxheWVyU3RhdGUuRU5ERUQpIHtcbiAgICAgICAgICAgIGlmICh1aWF1ZGlvU3RhdGUuaXNNdXNpY1NodWZmbGVFbmFibGVkKSB7XG4gICAgICAgICAgICAgIHBsYXlUcmFjayhNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBtdXNpY1BsYXlsaXN0Lmxlbmd0aCkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh1aWF1ZGlvU3RhdGUuaXNNdXNpY0xvb3BFbmFibGVkKSB7XG4gICAgICAgICAgICAgIHBsYXlUcmFjayhzdGF0ZS5jdXJyZW50VHJhY2tJbmRleCArIDEpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdXBkYXRlTXVzaWNQYW5lbCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoeW91dHViZVBsYXllckV2ZW50LmRhdGEgPT09IFlULlBsYXllclN0YXRlLlBMQVlJTkcgfHwgeW91dHViZVBsYXllckV2ZW50LmRhdGEgPT09IFlULlBsYXllclN0YXRlLlBBVVNFRCkge1xuICAgICAgICAgICAgdXBkYXRlTXVzaWNQYW5lbCgpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn1cbmZ1bmN0aW9uIHN0b3BBbGxQbGF5YmFjaygpIHtcbiAgaWYgKGF1ZGlvUGxheWVyKSB7XG4gICAgdHJ5IHtcbiAgICAgIGF1ZGlvUGxheWVyLnBhdXNlKCk7XG4gICAgICBhdWRpb1BsYXllci5zcmMgPSBcIlwiO1xuICAgIH0gY2F0Y2ggKGF1ZGlvRXJyb3IpIHt9XG4gICAgYXVkaW9QbGF5ZXIgPSBudWxsO1xuICB9XG4gIGlmICh5b3V0dWJlUGxheWVyKSB7XG4gICAgdHJ5IHtcbiAgICAgIHlvdXR1YmVQbGF5ZXIuc3RvcFZpZGVvKCk7XG4gICAgfSBjYXRjaCAoeW91dHViZVN0b3BFcnJvcikge31cbiAgfVxuICBhdWRpb1NvdXJjZVR5cGUgPSBudWxsO1xufVxuZnVuY3Rpb24gcGxheVRyYWNrKHRyYWNrSW5kZXgpIHtcbiAgaWYgKCFtdXNpY1BsYXlsaXN0Lmxlbmd0aCkge1xuICAgIHNob3dOb3RpZmljYXRpb24oXCJObyB0cmFja3MgYWRkZWRcIik7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICh0cmFja0luZGV4IDwgMCkge1xuICAgIHRyYWNrSW5kZXggPSBtdXNpY1BsYXlsaXN0Lmxlbmd0aCAtIDE7XG4gIH1cbiAgaWYgKHRyYWNrSW5kZXggPj0gbXVzaWNQbGF5bGlzdC5sZW5ndGgpIHtcbiAgICB0cmFja0luZGV4ID0gMDtcbiAgfVxuICBzdGF0ZS5jdXJyZW50VHJhY2tJbmRleCA9IHRyYWNrSW5kZXg7XG4gIGNvbnN0IGN1cnJlbnRUcmFjayA9IG11c2ljUGxheWxpc3Rbc3RhdGUuY3VycmVudFRyYWNrSW5kZXhdO1xuICBpZiAoIWN1cnJlbnRUcmFjayB8fCAhY3VycmVudFRyYWNrLnVybCkge1xuICAgIHJldHVybjtcbiAgfVxuICBzdG9wQWxsUGxheWJhY2soKTtcbiAgaWYgKGlzWW91dHViZVVybChjdXJyZW50VHJhY2sudXJsKSkge1xuICAgIGNvbnN0IHlvdXR1YmVWaWRlb0lkID0gZ2V0WW91dHViZVZpZGVvSWQoY3VycmVudFRyYWNrLnVybCk7XG4gICAgaWYgKCF5b3V0dWJlVmlkZW9JZCkge1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihcIkludmFsaWQgWW91VHViZSBsaW5rXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBwbGF5WW91dHViZVZpZGVvKHlvdXR1YmVWaWRlb0lkKTtcbiAgICBhdWRpb1NvdXJjZVR5cGUgPSBcInlvdXR1YmVcIjtcbiAgICB1cGRhdGVNdXNpY1BhbmVsKCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGF1ZGlvUGxheWVyID0gbmV3IEF1ZGlvKGN1cnJlbnRUcmFjay51cmwpO1xuICBhdWRpb1BsYXllci52b2x1bWUgPSB1aWF1ZGlvU3RhdGUubXVzaWNWb2x1bWU7XG4gIGF1ZGlvUGxheWVyLmxvb3AgPSBmYWxzZTtcbiAgYXVkaW9Tb3VyY2VUeXBlID0gXCJhdWRpb1wiO1xuICBhdWRpb1BsYXllci5wbGF5KCkuY2F0Y2goKCkgPT4ge1xuICAgIHNob3dOb3RpZmljYXRpb24oXCJDYW5ub3QgcGxheSBhdWRpbyBVUkxcIik7XG4gIH0pO1xuICBhdWRpb1BsYXllci5vbmVuZGVkID0gKCkgPT4ge1xuICAgIGlmICh1aWF1ZGlvU3RhdGUuaXNNdXNpY1NodWZmbGVFbmFibGVkKSB7XG4gICAgICBwbGF5VHJhY2soTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogbXVzaWNQbGF5bGlzdC5sZW5ndGgpKTtcbiAgICB9IGVsc2UgaWYgKHVpYXVkaW9TdGF0ZS5pc011c2ljTG9vcEVuYWJsZWQpIHtcbiAgICAgIHBsYXlUcmFjayhzdGF0ZS5jdXJyZW50VHJhY2tJbmRleCArIDEpO1xuICAgIH0gZWxzZSB7XG4gICAgICB1cGRhdGVNdXNpY1BhbmVsKCk7XG4gICAgfVxuICB9O1xuICBhdWRpb1BsYXllci5vbnBsYXkgPSB1cGRhdGVNdXNpY1BhbmVsO1xuICBhdWRpb1BsYXllci5vbnBhdXNlID0gdXBkYXRlTXVzaWNQYW5lbDtcbiAgdXBkYXRlTXVzaWNQYW5lbCgpO1xufVxuZnVuY3Rpb24gcGF1c2VQbGF5YmFjaygpIHtcbiAgaWYgKGF1ZGlvU291cmNlVHlwZSA9PT0gXCJhdWRpb1wiICYmIGF1ZGlvUGxheWVyKSB7XG4gICAgYXVkaW9QbGF5ZXIucGF1c2UoKTtcbiAgfSBlbHNlIGlmIChhdWRpb1NvdXJjZVR5cGUgPT09IFwieW91dHViZVwiICYmIHlvdXR1YmVQbGF5ZXIpIHtcbiAgICB0cnkge1xuICAgICAgeW91dHViZVBsYXllci5wYXVzZVZpZGVvKCk7XG4gICAgfSBjYXRjaCAoeW91dHViZVBhdXNlRXJyb3IpIHt9XG4gIH1cbiAgdXBkYXRlTXVzaWNQYW5lbCgpO1xufVxuZnVuY3Rpb24gcmVzdW1lUGxheWJhY2soKSB7XG4gIGlmIChhdWRpb1NvdXJjZVR5cGUgPT09IFwiYXVkaW9cIiAmJiBhdWRpb1BsYXllcikge1xuICAgIGF1ZGlvUGxheWVyLnBsYXkoKS5jYXRjaCgoKSA9PiB7fSk7XG4gIH0gZWxzZSBpZiAoYXVkaW9Tb3VyY2VUeXBlID09PSBcInlvdXR1YmVcIiAmJiB5b3V0dWJlUGxheWVyKSB7XG4gICAgdHJ5IHtcbiAgICAgIHlvdXR1YmVQbGF5ZXIucGxheVZpZGVvKCk7XG4gICAgfSBjYXRjaCAoeW91dHViZVBsYXlFcnJvcikge31cbiAgfSBlbHNlIGlmIChtdXNpY1BsYXlsaXN0Lmxlbmd0aCkge1xuICAgIHBsYXlUcmFjayhzdGF0ZS5jdXJyZW50VHJhY2tJbmRleCk7XG4gIH1cbiAgdXBkYXRlTXVzaWNQYW5lbCgpO1xufVxuZnVuY3Rpb24gcmVzZXRQbGF5YmFjaygpIHtcbiAgaWYgKGF1ZGlvU291cmNlVHlwZSA9PT0gXCJhdWRpb1wiICYmIGF1ZGlvUGxheWVyKSB7XG4gICAgYXVkaW9QbGF5ZXIucGF1c2UoKTtcbiAgICBhdWRpb1BsYXllci5jdXJyZW50VGltZSA9IDA7XG4gIH0gZWxzZSBpZiAoYXVkaW9Tb3VyY2VUeXBlID09PSBcInlvdXR1YmVcIiAmJiB5b3V0dWJlUGxheWVyKSB7XG4gICAgdHJ5IHtcbiAgICAgIHlvdXR1YmVQbGF5ZXIuc3RvcFZpZGVvKCk7XG4gICAgfSBjYXRjaCAoeW91dHViZVJlc2V0RXJyb3IpIHt9XG4gIH1cbiAgYXVkaW9Tb3VyY2VUeXBlID0gbnVsbDtcbiAgdXBkYXRlTXVzaWNQYW5lbCgpO1xufVxuZnVuY3Rpb24gaXNQbGF5aW5nKCkge1xuICBpZiAoYXVkaW9Tb3VyY2VUeXBlID09PSBcImF1ZGlvXCIgJiYgYXVkaW9QbGF5ZXIpIHtcbiAgICByZXR1cm4gIWF1ZGlvUGxheWVyLnBhdXNlZDtcbiAgfVxuICBpZiAoYXVkaW9Tb3VyY2VUeXBlID09PSBcInlvdXR1YmVcIiAmJiB5b3V0dWJlUGxheWVyICYmIHdpbmRvdy5ZVCkge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4geW91dHViZVBsYXllci5nZXRQbGF5ZXJTdGF0ZSgpID09PSBZVC5QbGF5ZXJTdGF0ZS5QTEFZSU5HO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7fVxuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cbmZ1bmN0aW9uIHBsYXlOZXh0T3JSYW5kb20oKSB7XG4gIGlmICghbXVzaWNQbGF5bGlzdC5sZW5ndGgpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgcGxheVRyYWNrKHVpYXVkaW9TdGF0ZS5pc011c2ljU2h1ZmZsZUVuYWJsZWQgPyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBtdXNpY1BsYXlsaXN0Lmxlbmd0aCkgOiBzdGF0ZS5jdXJyZW50VHJhY2tJbmRleCArIDEpO1xufVxuZnVuY3Rpb24gcGxheVByZXZpb3VzKCkge1xuICBpZiAoIW11c2ljUGxheWxpc3QubGVuZ3RoKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHBsYXlUcmFjayhzdGF0ZS5jdXJyZW50VHJhY2tJbmRleCAtIDEpO1xufVxuZnVuY3Rpb24gdXBkYXRlTXVzaWNQYW5lbCgpIHtcbiAgY29uc3QgbXVzaWNQYW5lbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibXVzaWMtcGFuZWxcIik7XG4gIGlmICghbXVzaWNQYW5lbCkge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBpc0N1cnJlbnRseVBsYXlpbmcgPSBpc1BsYXlpbmcoKTtcbiAgY29uc3QgcGxheUJ1dHRvbiA9IG11c2ljUGFuZWwucXVlcnlTZWxlY3RvcihcIiNtdXNpY1BsYXlCdG5cIik7XG4gIGNvbnN0IHRyYWNrTmFtZURpc3BsYXkgPSBtdXNpY1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbXVzaWNUcmFja05hbWVcIik7XG4gIGNvbnN0IHRyYWNrTGlzdENvbnRhaW5lciA9IG11c2ljUGFuZWwucXVlcnlTZWxlY3RvcihcIiNtdXNpY1RyYWNrTGlzdFwiKTtcbiAgY29uc3QgbG9vcEJ1dHRvbiA9IG11c2ljUGFuZWwucXVlcnlTZWxlY3RvcihcIiNtdXNpY0xvb3BCdG5cIik7XG4gIGNvbnN0IHNodWZmbGVCdXR0b24gPSBtdXNpY1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbXVzaWNTaHVmZmxlQnRuXCIpO1xuICBpZiAocGxheUJ1dHRvbikge1xuICAgIHBsYXlCdXR0b24udGV4dENvbnRlbnQgPSBpc0N1cnJlbnRseVBsYXlpbmcgPyBcIlBhdXNlXCIgOiBcIlBsYXlcIjtcbiAgfVxuICBpZiAobG9vcEJ1dHRvbikge1xuICAgIGxvb3BCdXR0b24uY2xhc3NMaXN0LnRvZ2dsZShcInRvZ2dsZS1vblwiLCB1aWF1ZGlvU3RhdGUuaXNNdXNpY0xvb3BFbmFibGVkKTtcbiAgfVxuICBpZiAoc2h1ZmZsZUJ1dHRvbikge1xuICAgIHNodWZmbGVCdXR0b24uY2xhc3NMaXN0LnRvZ2dsZShcInRvZ2dsZS1vblwiLCB1aWF1ZGlvU3RhdGUuaXNNdXNpY1NodWZmbGVFbmFibGVkKTtcbiAgfVxuICBpZiAodHJhY2tOYW1lRGlzcGxheSkge1xuICAgIHRyYWNrTmFtZURpc3BsYXkudGV4dENvbnRlbnQgPSBtdXNpY1BsYXlsaXN0Lmxlbmd0aCA/IG11c2ljUGxheWxpc3Rbc3RhdGUuY3VycmVudFRyYWNrSW5kZXhdPy5uYW1lIHx8IFwiVHJhY2sgXCIgKyAoc3RhdGUuY3VycmVudFRyYWNrSW5kZXggKyAxKSA6IFwiTm8gdHJhY2tzXCI7XG4gIH1cbiAgaWYgKHRyYWNrTGlzdENvbnRhaW5lcikge1xuICAgIHRyYWNrTGlzdENvbnRhaW5lci5pbm5lckhUTUwgPSBcIlwiO1xuICAgIG11c2ljUGxheWxpc3QuZm9yRWFjaCgoZXZlbnQsIHRhcmdldEVsZW1lbnQpID0+IHtcbiAgICAgIGNvbnN0IGNvbnRhaW5lckRpdiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gICAgICBjb250YWluZXJEaXYuc3R5bGUuY3NzVGV4dCA9IFwiZGlzcGxheTpmbGV4O2dhcDo0cHg7bWFyZ2luLWJvdHRvbTozcHg7YWxpZ24taXRlbXM6Y2VudGVyO1wiO1xuICAgICAgY29uc3QgaXNUb2dnbGVkT24gPSB0YXJnZXRFbGVtZW50ID09PSBzdGF0ZS5jdXJyZW50VHJhY2tJbmRleCAmJiAoYXVkaW9QbGF5ZXIgfHwgeW91dHViZVBsYXllcik7XG4gICAgICBjb250YWluZXJEaXYuaW5uZXJIVE1MID0gXCJcXG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blwiICsgKGlzVG9nZ2xlZE9uID8gXCIgdG9nZ2xlLW9uXCIgOiBcIlwiKSArIFwiXFxcIiBzdHlsZT1cXFwiZmxleDoxO21hcmdpbjowO292ZXJmbG93OmhpZGRlbjt0ZXh0LW92ZXJmbG93OmVsbGlwc2lzO3doaXRlLXNwYWNlOm5vd3JhcDt0ZXh0LWFsaWduOmxlZnQ7XFxcIiB0aXRsZT1cXFwiXCIgKyBldmVudC5uYW1lICsgXCJcXFwiPlwiICsgZXZlbnQubmFtZS5zdWJzdHJpbmcoMCwgMjIpICsgXCI8L2J1dHRvbj5cXG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgc3R5bGU9XFxcIndpZHRoOjI4cHg7bWFyZ2luOjA7dGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzo2cHggNHB4O2NvbG9yOiNmNDQzMzY7ZmxleC1zaHJpbms6MDtcXFwiPlg8L2J1dHRvbj5cIjtcbiAgICAgIGNvbnRhaW5lckRpdi5xdWVyeVNlbGVjdG9yQWxsKFwiYnV0dG9uXCIpWzBdLm9uY2xpY2sgPSAoKSA9PiBwbGF5VHJhY2sodGFyZ2V0RWxlbWVudCk7XG4gICAgICBjb250YWluZXJEaXYucXVlcnlTZWxlY3RvckFsbChcImJ1dHRvblwiKVsxXS5vbmNsaWNrID0gKCkgPT4gcmVtb3ZlVHJhY2tGcm9tUGxheWxpc3QodGFyZ2V0RWxlbWVudCk7XG4gICAgICB0cmFja0xpc3RDb250YWluZXIuYXBwZW5kQ2hpbGQoY29udGFpbmVyRGl2KTtcbiAgICB9KTtcbiAgICBpZiAoIW11c2ljUGxheWxpc3QubGVuZ3RoKSB7XG4gICAgICB0cmFja0xpc3RDb250YWluZXIuaW5uZXJIVE1MID0gXCI8ZGl2IHN0eWxlPVxcXCJmb250LXNpemU6MTFweDtjb2xvcjojNTU1O3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6NnB4IDA7XFxcIj5ObyB0cmFja3MgeWV0PC9kaXY+XCI7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBjb25zdCB1aWF1ZGlvU3RhdGUgPSB7XG4gIGlzTXV0ZWQ6IGZhbHNlLFxuICBtdXNpY1ZvbHVtZTogcGFyc2VGbG9hdChsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcIm11c2ljVm9sdW1lXCIpIHx8IFwiMC41XCIpLFxuICBpc011c2ljTG9vcEVuYWJsZWQ6IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwibXVzaWNMb29wXCIpICE9PSBcImZhbHNlXCIsXG4gIGlzTXVzaWNTaHVmZmxlRW5hYmxlZDogbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJtdXNpY1NodWZmbGVcIikgPT09IFwidHJ1ZVwiXG59O1xuXG5leHBvcnQgeyBpc1lvdXR1YmVVcmwsIGdldFlvdXR1YmVWaWRlb0lkLCBlbnN1cmVZb3V0dWJlQXBpUmVhZHksIGdldFlvdXR1YmVIb3N0RWxlbWVudCwgcGxheVlvdXR1YmVWaWRlbywgc3RvcEFsbFBsYXliYWNrLCBwbGF5VHJhY2ssIHBhdXNlUGxheWJhY2ssIHJlc3VtZVBsYXliYWNrLCByZXNldFBsYXliYWNrLCBpc1BsYXlpbmcsIHBsYXlOZXh0T3JSYW5kb20sIHBsYXlQcmV2aW91cywgdXBkYXRlTXVzaWNQYW5lbCwgYXVkaW9QbGF5ZXIsIG11c2ljUGxheWxpc3QsIHlvdXR1YmVQbGF5ZXIgfTtcbiIsImltcG9ydCB7IGdldEdhbWVDYW52YXMgfSBmcm9tICcuL3JhZGFyLmpzJztcbmltcG9ydCB7IHN0YXRlIH0gZnJvbSAnLi4vY29yZS5qcyc7XG5pbXBvcnQgeyB1aWF1ZGlvU3RhdGUgfSBmcm9tICcuL2F1ZGlvLmpzJztcblxuZnVuY3Rpb24gc2ltdWxhdGVUZXh0SW5wdXQoc2VsZWN0b3IsIHRleHRUb1R5cGUpIHtcbiAgY29uc3QgaW5wdXRFbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3Rvcik7XG4gIGlmICghaW5wdXRFbGVtZW50KSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlucHV0RWxlbWVudC5mb2N1cygpO1xuICBpbnB1dEVsZW1lbnQudmFsdWUgPSBcIlwiO1xuICBsZXQgY3VycmVudEluZGV4ID0gMDtcbiAgY29uc3QgdHlwZU5leHRDaGFyYWN0ZXIgPSAoKSA9PiB7XG4gICAgaWYgKGN1cnJlbnRJbmRleCA+PSB0ZXh0VG9UeXBlLmxlbmd0aCkge1xuICAgICAgaW5wdXRFbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KFwiY2hhbmdlXCIsIHtcbiAgICAgICAgYnViYmxlczogdHJ1ZVxuICAgICAgfSkpO1xuICAgICAgaW5wdXRFbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KFwiaW5wdXRcIiwge1xuICAgICAgICBidWJibGVzOiB0cnVlXG4gICAgICB9KSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlucHV0RWxlbWVudC52YWx1ZSArPSB0ZXh0VG9UeXBlW2N1cnJlbnRJbmRleF07XG4gICAgaW5wdXRFbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IElucHV0RXZlbnQoXCJpbnB1dFwiLCB7XG4gICAgICBidWJibGVzOiB0cnVlXG4gICAgfSkpO1xuICAgIGN1cnJlbnRJbmRleCsrO1xuICAgIHNldFRpbWVvdXQodHlwZU5leHRDaGFyYWN0ZXIsIDI1KTtcbiAgfTtcbiAgdHlwZU5leHRDaGFyYWN0ZXIoKTtcbiAgcmV0dXJuIHRydWU7XG59XG5sZXQgY3VycmVudFZhbHVlID0gXCJcIjtcbmZ1bmN0aW9uIHNob3dOb3RpZmljYXRpb24obWVzc2FnZSkge1xuICBjb25zdCBub3RpZmljYXRpb25UaW1lID0gRGF0ZS5ub3coKTtcbiAgaWYgKG1lc3NhZ2UgPT09IGN1cnJlbnRWYWx1ZSAmJiBub3RpZmljYXRpb25UaW1lIC0gc3RhdGUuY3VycmVudFRpbWUgPCAzMDAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGN1cnJlbnRWYWx1ZSA9IG1lc3NhZ2U7XG4gIHN0YXRlLmN1cnJlbnRUaW1lID0gbm90aWZpY2F0aW9uVGltZTtcbiAgY29uc3Qgbm90aWZpY2F0aW9uRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gIG5vdGlmaWNhdGlvbkVsZW1lbnQuc3R5bGUuY3NzVGV4dCA9IFwiXFxuICAgICAgcG9zaXRpb246IGZpeGVkOyB0b3A6IDE2cHg7IHJpZ2h0OiAxNnB4O1xcbiAgICAgIGJhY2tncm91bmQ6IHZhcigtLW5vdGlmLWJnLCAjMjgyODI4KTsgY29sb3I6IHZhcigtLW5vdGlmLXRleHQsICNlMGUwZTApO1xcbiAgICAgIHBhZGRpbmc6IDEwcHggMTZweDsgYm9yZGVyLXJhZGl1czogNHB4O1xcbiAgICAgIHotaW5kZXg6IDEwMDAwMDAwOyBmb250LXNpemU6IDEzcHg7XFxuICAgICAgb3BhY2l0eTogMDsgdHJhbnNpdGlvbjogb3BhY2l0eSAwLjJzIGVhc2UsIHRyYW5zZm9ybSAwLjJzIGVhc2U7XFxuICAgICAgcG9pbnRlci1ldmVudHM6IG5vbmU7IGZvbnQtZmFtaWx5OiAnU2Vnb2UgVUknLCBzeXN0ZW0tdWksIHNhbnMtc2VyaWY7XFxuICAgICAgYm9yZGVyLWxlZnQ6IDNweCBzb2xpZCB2YXIoLS1ub3RpZi1ib3JkZXIsIHZhcigtLWFjYywgIzg4OCkpO1xcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWCgyMHB4KTtcXG4gICAgXCI7XG4gIG5vdGlmaWNhdGlvbkVsZW1lbnQudGV4dENvbnRlbnQgPSBtZXNzYWdlO1xuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG5vdGlmaWNhdGlvbkVsZW1lbnQpO1xuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKCkgPT4ge1xuICAgIG5vdGlmaWNhdGlvbkVsZW1lbnQuc3R5bGUub3BhY2l0eSA9IFwiMVwiO1xuICAgIG5vdGlmaWNhdGlvbkVsZW1lbnQuc3R5bGUudHJhbnNmb3JtID0gXCJ0cmFuc2xhdGVYKDApXCI7XG4gIH0pO1xuICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICBub3RpZmljYXRpb25FbGVtZW50LnN0eWxlLm9wYWNpdHkgPSBcIjBcIjtcbiAgICBub3RpZmljYXRpb25FbGVtZW50LnN0eWxlLnRyYW5zZm9ybSA9IFwidHJhbnNsYXRlWCgyMHB4KVwiO1xuICAgIHNldFRpbWVvdXQoKCkgPT4gbm90aWZpY2F0aW9uRWxlbWVudC5yZW1vdmUoKSwgMjAwKTtcbiAgfSwgMjUwMCk7XG59XG5mdW5jdGlvbiBpbml0QXV0b2ZpbGxOYW1lKCkge1xuICBpZiAodWlhdWRpb1N0YXRlLmlzTXV0ZWQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgbGV0IHNhdmVkTmFtZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiYXV0b2ZpbGxfbmFtZVwiKSB8fCBcIlwiO1xuICBsZXQgbmFtZUlucHV0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5uYW1lLWlucHV0IGlucHV0XCIpIHx8IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIucGxheS1nYW1lIC5lbC1pbnB1dF9faW5uZXJcIik7XG4gIGZ1bmN0aW9uIGFwcGx5QXV0b2ZpbGwoKSB7XG4gICAgaWYgKHVpYXVkaW9TdGF0ZS5pc011dGVkKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHVpYXVkaW9TdGF0ZS5pc011dGVkID0gdHJ1ZTtcbiAgICBuYW1lSW5wdXQudmFsdWUgPSBzYXZlZE5hbWU7XG4gICAgbmFtZUlucHV0LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KFwiaW5wdXRcIiwge1xuICAgICAgYnViYmxlczogdHJ1ZVxuICAgIH0pKTtcbiAgICBuYW1lSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImlucHV0XCIsICgpID0+IHtcbiAgICAgIGlmIChzYXZlZE5hbWUgIT09IG5hbWVJbnB1dC52YWx1ZSkge1xuICAgICAgICBzYXZlZE5hbWUgPSBuYW1lSW5wdXQudmFsdWU7XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiYXV0b2ZpbGxfbmFtZVwiLCBzYXZlZE5hbWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIGlmIChuYW1lSW5wdXQgPT0gbnVsbCkge1xuICAgIGNvbnN0IGlucHV0Q2hlY2tJbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgIG5hbWVJbnB1dCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIubmFtZS1pbnB1dCBpbnB1dFwiKSB8fCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLnBsYXktZ2FtZSAuZWwtaW5wdXRfX2lubmVyXCIpO1xuICAgICAgaWYgKG5hbWVJbnB1dCAhPSBudWxsKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoaW5wdXRDaGVja0ludGVydmFsKTtcbiAgICAgICAgYXBwbHlBdXRvZmlsbCgpO1xuICAgICAgfVxuICAgIH0sIDIwMCk7XG4gIH0gZWxzZSB7XG4gICAgYXBwbHlBdXRvZmlsbCgpO1xuICB9XG59XG5mdW5jdGlvbiB0eXBlQ2hhdE1lc3NhZ2UobWVzc2FnZVRleHQpIHtcbiAgY29uc3QgY2hhdElucHV0RWxlbWVudCA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuY2hhdC1pbnB1dCBpbnB1dFwiKSB8fCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiaW5wdXRbcGxhY2Vob2xkZXIqPVxcXCJjaGF0XFxcIiBpXVwiKSB8fCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiaW5wdXRbdHlwZT1cXFwidGV4dFxcXCJdXCIpO1xuICBpZiAoIWNoYXRJbnB1dEVsZW1lbnQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY2hhdElucHV0RWxlbWVudC5mb2N1cygpO1xuICBjaGF0SW5wdXRFbGVtZW50LnZhbHVlID0gXCJcIjtcbiAgbGV0IGNoYXJJbmRleCA9IDA7XG4gIGNvbnN0IHR5cGVOZXh0Q2hhcmFjdGVyID0gKCkgPT4ge1xuICAgIGlmIChjaGFySW5kZXggPj0gbWVzc2FnZVRleHQubGVuZ3RoKSB7XG4gICAgICBjb25zdCBzZW5kQnV0dG9uID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5jaGF0LWlucHV0IGJ1dHRvblwiKSB8fCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiYnV0dG9uW2FyaWEtbGFiZWwqPVxcXCJzZW5kXFxcIiBpXVwiKTtcbiAgICAgIGlmIChzZW5kQnV0dG9uKSB7XG4gICAgICAgIHNlbmRCdXR0b24uY2xpY2soKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNoYXRJbnB1dEVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgRXZlbnQoXCJjaGFuZ2VcIiwge1xuICAgICAgICAgIGJ1YmJsZXM6IHRydWVcbiAgICAgICAgfSkpO1xuICAgICAgICBjaGF0SW5wdXRFbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IEV2ZW50KFwiaW5wdXRcIiwge1xuICAgICAgICAgIGJ1YmJsZXM6IHRydWVcbiAgICAgICAgfSkpO1xuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgICBjaGF0SW5wdXRFbGVtZW50LnZhbHVlID0gXCJcIjtcbiAgICAgICAgICBjaGF0SW5wdXRFbGVtZW50LmJsdXIoKTtcbiAgICAgICAgfSwgMTAwKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY2hhdElucHV0RWxlbWVudC52YWx1ZSArPSBtZXNzYWdlVGV4dFtjaGFySW5kZXhdO1xuICAgIGNoYXRJbnB1dEVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgSW5wdXRFdmVudChcImlucHV0XCIsIHtcbiAgICAgIGJ1YmJsZXM6IHRydWVcbiAgICB9KSk7XG4gICAgY2hhckluZGV4Kys7XG4gICAgc2V0VGltZW91dCh0eXBlTmV4dENoYXJhY3RlciwgMjUpO1xuICB9O1xuICB0eXBlTmV4dENoYXJhY3RlcigpO1xufVxubGV0IGlzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbmZ1bmN0aW9uIGluaXRpYWxpemVUZXh0SW50ZXJjZXB0b3IoKSB7XG4gIGlmIChpc0luaXRpYWxpemVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGZ1bmN0aW9uIHVuZXNjYXBlU3RyaW5nKGlucHV0U3RyaW5nKSB7XG4gICAgaWYgKHR5cGVvZiBpbnB1dFN0cmluZyAhPT0gXCJzdHJpbmdcIikge1xuICAgICAgcmV0dXJuIGlucHV0U3RyaW5nO1xuICAgIH1cbiAgICByZXR1cm4gaW5wdXRTdHJpbmcucmVwbGFjZSgvXFxcXChcXFxcfG58cnx0fGJ8Znx2fFxcZHsxLDN9fHgoW1xcZGEtZkEtRl17Mn0pfHUoW1xcZGEtZkEtRl17NH0pfHVcXHsoMCpbXFxkYS1mQS1GXXsxLDZ9KVxcfSkvZywgKGNvbnRleHQsIG9jdGFsVmFsdWUsIGhleFZhbHVlMSwgaGV4VmFsdWUyLCBoZXhWYWx1ZTMpID0+IHtcbiAgICAgIHN3aXRjaCAob2N0YWxWYWx1ZVswXSkge1xuICAgICAgICBjYXNlIFwiXFxcXFwiOlxuICAgICAgICAgIHJldHVybiBcIlxcXFxcIjtcbiAgICAgICAgY2FzZSBcIm5cIjpcbiAgICAgICAgICByZXR1cm4gXCJcXG5cIjtcbiAgICAgICAgY2FzZSBcInJcIjpcbiAgICAgICAgICByZXR1cm4gXCJcXHJcIjtcbiAgICAgICAgY2FzZSBcInRcIjpcbiAgICAgICAgICByZXR1cm4gXCJcXHRcIjtcbiAgICAgICAgY2FzZSBcImJcIjpcbiAgICAgICAgICByZXR1cm4gXCJcXGJcIjtcbiAgICAgICAgY2FzZSBcImZcIjpcbiAgICAgICAgICByZXR1cm4gXCJcXGZcIjtcbiAgICAgICAgY2FzZSBcInZcIjpcbiAgICAgICAgICByZXR1cm4gXCJcdTAwMGJcIjtcbiAgICAgICAgY2FzZSBcIjBcIjpcbiAgICAgICAgY2FzZSBcIjFcIjpcbiAgICAgICAgY2FzZSBcIjJcIjpcbiAgICAgICAgY2FzZSBcIjNcIjpcbiAgICAgICAgY2FzZSBcIjRcIjpcbiAgICAgICAgY2FzZSBcIjVcIjpcbiAgICAgICAgY2FzZSBcIjZcIjpcbiAgICAgICAgY2FzZSBcIjdcIjpcbiAgICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShOdW1iZXIucGFyc2VJbnQob2N0YWxWYWx1ZSwgOCkgfHwgMCk7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgaWYgKGhleFZhbHVlMSAhPSBudWxsKSB7XG4gICAgICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21DaGFyQ29kZShOdW1iZXIucGFyc2VJbnQoaGV4VmFsdWUxLCAxNikgfHwgMCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChoZXhWYWx1ZTIgIT0gbnVsbCkge1xuICAgICAgICAgICAgcmV0dXJuIFN0cmluZy5mcm9tQ2hhckNvZGUoTnVtYmVyLnBhcnNlSW50KGhleFZhbHVlMiwgMTYpIHx8IDApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoaGV4VmFsdWUzICE9IG51bGwpIHtcbiAgICAgICAgICAgIGNvbnN0IGNvZGVQb2ludCA9IE51bWJlci5wYXJzZUludChoZXhWYWx1ZTMsIDE2KSB8fCAwO1xuICAgICAgICAgICAgaWYgKGNvZGVQb2ludCA+IDExMTQxMTEpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIGNvbnRleHQ7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gU3RyaW5nLmZyb21Db2RlUG9pbnQoY29kZVBvaW50KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIG9jdGFsVmFsdWU7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgY29uc3QgYWN0aW9uQ29kZXMgPSB7XG4gICAgc3Bhd246IDIyLFxuICAgIGNyZWF0ZVRyaWJlOiA1LFxuICAgIGNoYXQ6IDEwMFxuICB9O1xuICBjb25zdCBvcmlnaW5hbEVuY29kZSA9IFRleHRFbmNvZGVyLnByb3RvdHlwZS5lbmNvZGU7XG4gIFRleHRFbmNvZGVyLnByb3RvdHlwZS5lbmNvZGUgPSBmdW5jdGlvbiAoLi4uaW5wdXREYXRhKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHBhdHRlcm5MaXN0ID0gWy9eKFxceDE0ezN9XFxkK1xcfDZcXHwpKC4rKSQvZ20sIC9eKFxceDE0ezN9XFxkK1xcfDhcXHwpKC4rKSQvZ20sIC9eKFxceDE0ezN9XFxkK1xcfDE0XFx8KSguKykkL2dtLCAvXihcXHgxM3szfVswMV0pKC4rKSQvZ21dO1xuICAgICAgZm9yIChsZXQgcGF0dGVybkluZGV4ID0gMDsgcGF0dGVybkluZGV4IDwgcGF0dGVybkxpc3QubGVuZ3RoOyBwYXR0ZXJuSW5kZXgrKykge1xuICAgICAgICBjb25zdCByZWdleE1hdGNoID0gcGF0dGVybkxpc3RbcGF0dGVybkluZGV4XS5leGVjKGlucHV0RGF0YVswXSk7XG4gICAgICAgIGlmIChyZWdleE1hdGNoICYmIHJlZ2V4TWF0Y2gubGVuZ3RoID09PSAzKSB7XG4gICAgICAgICAgY29uc3QgYWN0aW9uTWV0aG9kID0gW2FjdGlvbkNvZGVzLnNwYXduLCBhY3Rpb25Db2Rlcy5zcGF3biwgYWN0aW9uQ29kZXMuY3JlYXRlVHJpYmUsIGFjdGlvbkNvZGVzLmNoYXRdW3BhdHRlcm5JbmRleF07XG4gICAgICAgICAgaW5wdXREYXRhWzBdID0gcmVnZXhNYXRjaFsxXSArIHVuZXNjYXBlU3RyaW5nKHJlZ2V4TWF0Y2hbMl0pLnN1YnN0cigwLCBhY3Rpb25NZXRob2QpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBjYXRjaCB7fVxuICAgIHJldHVybiBSZWZsZWN0LmFwcGx5KG9yaWdpbmFsRW5jb2RlLCB0aGlzLCBpbnB1dERhdGEpO1xuICB9O1xuICBjb25zdCBjdXJyZW50VGltZXN0YW1wID0gbmV3IE11dGF0aW9uT2JzZXJ2ZXIoKCkgPT4ge1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIucGxheS1nYW1lIC5lbC1pbnB1dF9faW5uZXJcIik/LnNldEF0dHJpYnV0ZShcIm1heGxlbmd0aFwiLCBcIjgwXCIpO1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIubmV3LXRyaWJlIC5lbC1pbnB1dF9faW5uZXJcIik/LnNldEF0dHJpYnV0ZShcIm1heGxlbmd0aFwiLCBcIjIwXCIpO1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIuY2hhdC1pbnB1dCBpbnB1dFwiKT8uc2V0QXR0cmlidXRlKFwibWF4TGVuZ3RoXCIsIFwiMTAwMFwiKTtcbiAgfSk7XG4gIGN1cnJlbnRUaW1lc3RhbXAub2JzZXJ2ZShkb2N1bWVudC5ib2R5LCB7XG4gICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgIHN1YnRyZWU6IHRydWVcbiAgfSk7XG4gIGlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICBzaG93Tm90aWZpY2F0aW9uKFwiU3BlY2lhbCBjaGFyYWN0ZXJzIGVuYWJsZWRcIik7XG59XG5mdW5jdGlvbiBzaW11bGF0ZUNsaWNrKGNsaWVudFgsIGNsaWVudFkpIHtcbiAgY29uc3QgdGFyZ2V0RWxlbWVudCA9IGdldEdhbWVDYW52YXMoKTtcbiAgaWYgKCF0YXJnZXRFbGVtZW50KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRhcmdldEVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgUG9pbnRlckV2ZW50KFwicG9pbnRlcmRvd25cIiwge1xuICAgIGNsaWVudFg6IGNsaWVudFgsXG4gICAgY2xpZW50WTogY2xpZW50WSxcbiAgICBidXR0b246IDAsXG4gICAgYnV0dG9uczogMSxcbiAgICBidWJibGVzOiB0cnVlLFxuICAgIHZpZXc6IHdpbmRvd1xuICB9KSk7XG4gIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIHRhcmdldEVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgUG9pbnRlckV2ZW50KFwicG9pbnRlcnVwXCIsIHtcbiAgICAgIGNsaWVudFg6IGNsaWVudFgsXG4gICAgICBjbGllbnRZOiBjbGllbnRZLFxuICAgICAgYnV0dG9uczogMCxcbiAgICAgIGJ1YmJsZXM6IHRydWUsXG4gICAgICB2aWV3OiB3aW5kb3dcbiAgICB9KSk7XG4gIH0sIDgwKTtcbn1cbmZ1bmN0aW9uIHNob3dIYWxsb3dlZW5Db2RlTW9kYWwob25VbmxvY2tDYWxsYmFjaykge1xuICBjb25zdCBtb2RhbE92ZXJsYXkgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xuICBtb2RhbE92ZXJsYXkuc3R5bGUuY3NzVGV4dCA9IFwicG9zaXRpb246Zml4ZWQ7dG9wOjA7bGVmdDowO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7YmFja2dyb3VuZDpyZ2JhKDAsMCwwLDAuOSk7ei1pbmRleDoxMDAwMDE7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO29wYWNpdHk6MDt0cmFuc2l0aW9uOm9wYWNpdHkgMC4zcyBlYXNlO1wiO1xuICBtb2RhbE92ZXJsYXkuaW5uZXJIVE1MID0gXCI8ZGl2IHN0eWxlPVxcXCJiYWNrZ3JvdW5kOiMxYTFhMWE7cGFkZGluZzozMnB4O2JvcmRlci1yYWRpdXM6OHB4O3RleHQtYWxpZ246Y2VudGVyO21heC13aWR0aDo0MDBweDt3aWR0aDo5MCU7Ym9yZGVyOjFweCBzb2xpZCAjMzMzO1xcXCI+XFxuICAgICAgPGRpdiBzdHlsZT1cXFwiY29sb3I6I2UwZTBlMDtmb250LXNpemU6MThweDtmb250LXdlaWdodDo2MDA7bWFyZ2luLWJvdHRvbToxNnB4O1xcXCI+SGFsbG93ZWVuIEFjY2VzcyBDb2RlPC9kaXY+XFxuICAgICAgPGlucHV0IGlkPVxcXCJod0NvZGVJbnB1dFxcXCIgdHlwZT1cXFwidGV4dFxcXCIgcGxhY2Vob2xkZXI9XFxcIkVudGVyIGNvZGUuLi5cXFwiIHN0eWxlPVxcXCJiYWNrZ3JvdW5kOiMxMTE7Ym9yZGVyOjFweCBzb2xpZCAjMzMzO2NvbG9yOiNlMGUwZTA7Ym9yZGVyLXJhZGl1czo0cHg7cGFkZGluZzoxMHB4O2ZvbnQtc2l6ZToxNHB4O3RleHQtYWxpZ246Y2VudGVyO3dpZHRoOjEwMCU7Ym94LXNpemluZzpib3JkZXItYm94O21hcmdpbi1ib3R0b206MTZweDtvdXRsaW5lOm5vbmU7XFxcIj5cXG4gICAgICA8ZGl2IHN0eWxlPVxcXCJkaXNwbGF5OmZsZXg7Z2FwOjhweDtcXFwiPlxcbiAgICAgICAgPGJ1dHRvbiBpZD1cXFwiaHdDYW5jZWxCdG5cXFwiIHN0eWxlPVxcXCJmbGV4OjE7YmFja2dyb3VuZDojMjIyO2NvbG9yOiM4ODg7Ym9yZGVyOjFweCBzb2xpZCAjMzMzO2JvcmRlci1yYWRpdXM6NHB4O3BhZGRpbmc6MTBweDtjdXJzb3I6cG9pbnRlcjtcXFwiPkNhbmNlbDwvYnV0dG9uPlxcbiAgICAgICAgPGJ1dHRvbiBpZD1cXFwiaHdTdWJtaXRCdG5cXFwiIHN0eWxlPVxcXCJmbGV4OjE7YmFja2dyb3VuZDojZmY2NjAwO2NvbG9yOiNmZmY7Ym9yZGVyOm5vbmU7Ym9yZGVyLXJhZGl1czo0cHg7cGFkZGluZzoxMHB4O2N1cnNvcjpwb2ludGVyO2ZvbnQtd2VpZ2h0OjYwMDtcXFwiPlJlZGVlbTwvYnV0dG9uPlxcbiAgICAgIDwvZGl2PjwvZGl2PlwiO1xuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG1vZGFsT3ZlcmxheSk7XG4gIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIG1vZGFsT3ZlcmxheS5zdHlsZS5vcGFjaXR5ID0gXCIxXCI7XG4gIH0sIDEwKTtcbiAgY29uc3QgY29kZUlucHV0ID0gbW9kYWxPdmVybGF5LnF1ZXJ5U2VsZWN0b3IoXCIjaHdDb2RlSW5wdXRcIik7XG4gIGNvbnN0IGNsb3NlTW9kYWwgPSAoKSA9PiB7XG4gICAgbW9kYWxPdmVybGF5LnN0eWxlLm9wYWNpdHkgPSBcIjBcIjtcbiAgICBzZXRUaW1lb3V0KCgpID0+IG1vZGFsT3ZlcmxheS5yZW1vdmUoKSwgMzAwKTtcbiAgfTtcbiAgbW9kYWxPdmVybGF5LnF1ZXJ5U2VsZWN0b3IoXCIjaHdTdWJtaXRCdG5cIikub25jbGljayA9ICgpID0+IHtcbiAgICBjb25zdCBpbnB1dFZhbHVlID0gY29kZUlucHV0LnZhbHVlLnRyaW0oKTtcbiAgICBpZiAoaW5wdXRWYWx1ZSA9PT0gXCJIYXBweUhhbGxvd2VlbjlcIiB8fCBpbnB1dFZhbHVlID09PSBcIlRyaWNrT3JUcmVhdDlcIikge1xuICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJoYWxsb3dlZW5VbmxvY2tlZFwiLCBcInRydWVcIik7XG4gICAgICBzaG93Tm90aWZpY2F0aW9uKFwiSGFsbG93ZWVuIHRoZW1lIHVubG9ja2VkXCIpO1xuICAgICAgY2xvc2VNb2RhbCgpO1xuICAgICAgb25VbmxvY2tDYWxsYmFjayh0cnVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29kZUlucHV0LnN0eWxlLmJvcmRlckNvbG9yID0gXCIjZmYwMDAwXCI7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgICAgY29kZUlucHV0LnN0eWxlLmJvcmRlckNvbG9yID0gXCIjMzMzXCI7XG4gICAgICB9LCA1MDApO1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihcIkludmFsaWQgY29kZVwiKTtcbiAgICB9XG4gIH07XG4gIG1vZGFsT3ZlcmxheS5xdWVyeVNlbGVjdG9yKFwiI2h3Q2FuY2VsQnRuXCIpLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgY2xvc2VNb2RhbCgpO1xuICAgIG9uVW5sb2NrQ2FsbGJhY2soZmFsc2UpO1xuICB9O1xuICBjb2RlSW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXByZXNzXCIsIGV2ZW50ID0+IHtcbiAgICBpZiAoZXZlbnQua2V5ID09PSBcIkVudGVyXCIpIHtcbiAgICAgIG1vZGFsT3ZlcmxheS5xdWVyeVNlbGVjdG9yKFwiI2h3U3VibWl0QnRuXCIpLmNsaWNrKCk7XG4gICAgfVxuICB9KTtcbiAgY29kZUlucHV0LmZvY3VzKCk7XG59XG5mdW5jdGlvbiBtYWtlRWxlbWVudERyYWdnYWJsZShkcmFnZ2FibGVFbGVtZW50KSB7XG4gIGxldCBvZmZzZXRYO1xuICBsZXQgb2Zmc2V0WTtcbiAgbGV0IGlzRHJhZ2dpbmcgPSBmYWxzZTtcbiAgbGV0IGhhc01vdmVkID0gZmFsc2U7XG4gIGRyYWdnYWJsZUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBldmVudCA9PiB7XG4gICAgaWYgKFtcIkJVVFRPTlwiLCBcIklOUFVUXCIsIFwiVEVYVEFSRUFcIiwgXCJTRUxFQ1RcIiwgXCJBXCIsIFwiTEFCRUxcIl0uaW5jbHVkZXMoZXZlbnQudGFyZ2V0LnRhZ05hbWUpKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChldmVudC50YXJnZXQuY2xvc2VzdChcImJ1dHRvbixpbnB1dCx0ZXh0YXJlYSxzZWxlY3QsbGFiZWxcIikpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaXNEcmFnZ2luZyA9IHRydWU7XG4gICAgaGFzTW92ZWQgPSBmYWxzZTtcbiAgICBvZmZzZXRYID0gZXZlbnQuY2xpZW50WCAtIGRyYWdnYWJsZUVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkubGVmdDtcbiAgICBvZmZzZXRZID0gZXZlbnQuY2xpZW50WSAtIGRyYWdnYWJsZUVsZW1lbnQuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCkudG9wO1xuICAgIGRyYWdnYWJsZUVsZW1lbnQuc3R5bGUudHJhbnNpdGlvbiA9IFwibm9uZVwiO1xuICAgIGNvbnN0IGhhbmRsZU1vdXNlTW92ZSA9IGN1cnJlbnRNb3VzZUV2ZW50ID0+IHtcbiAgICAgIGlmICghaGFzTW92ZWQgJiYgKE1hdGguYWJzKGN1cnJlbnRNb3VzZUV2ZW50LmNsaWVudFggLSBldmVudC5jbGllbnRYKSA+IDUgfHwgTWF0aC5hYnMoY3VycmVudE1vdXNlRXZlbnQuY2xpZW50WSAtIGV2ZW50LmNsaWVudFkpID4gNSkpIHtcbiAgICAgICAgaGFzTW92ZWQgPSB0cnVlO1xuICAgICAgfVxuICAgICAgaWYgKGlzRHJhZ2dpbmcpIHtcbiAgICAgICAgZHJhZ2dhYmxlRWxlbWVudC5zdHlsZS5sZWZ0ID0gY3VycmVudE1vdXNlRXZlbnQuY2xpZW50WCAtIG9mZnNldFggKyBcInB4XCI7XG4gICAgICAgIGRyYWdnYWJsZUVsZW1lbnQuc3R5bGUudG9wID0gY3VycmVudE1vdXNlRXZlbnQuY2xpZW50WSAtIG9mZnNldFkgKyBcInB4XCI7XG4gICAgICAgIGRyYWdnYWJsZUVsZW1lbnQuc3R5bGUuYm90dG9tID0gXCJhdXRvXCI7XG4gICAgICAgIGRyYWdnYWJsZUVsZW1lbnQuc3R5bGUucmlnaHQgPSBcImF1dG9cIjtcbiAgICAgIH1cbiAgICB9O1xuICAgIGNvbnN0IGhhbmRsZU1vdXNlVXAgPSAoKSA9PiB7XG4gICAgICBpc0RyYWdnaW5nID0gZmFsc2U7XG4gICAgICBkcmFnZ2FibGVFbGVtZW50LnN0eWxlLnRyYW5zaXRpb24gPSBcIlwiO1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCBoYW5kbGVNb3VzZU1vdmUpO1xuICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgaGFuZGxlTW91c2VVcCk7XG4gICAgfTtcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIGhhbmRsZU1vdXNlTW92ZSk7XG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgaGFuZGxlTW91c2VVcCk7XG4gIH0pO1xuICBkcmFnZ2FibGVFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBjbGlja0V2ZW50ID0+IHtcbiAgICBpZiAoaGFzTW92ZWQpIHtcbiAgICAgIGNsaWNrRXZlbnQuc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uKCk7XG4gICAgfVxuICB9KTtcbn1cblxuZXhwb3J0IHsgc2ltdWxhdGVUZXh0SW5wdXQsIHNob3dOb3RpZmljYXRpb24sIGluaXRBdXRvZmlsbE5hbWUsIHR5cGVDaGF0TWVzc2FnZSwgaW5pdGlhbGl6ZVRleHRJbnRlcmNlcHRvciwgc2ltdWxhdGVDbGljaywgc2hvd0hhbGxvd2VlbkNvZGVNb2RhbCwgbWFrZUVsZW1lbnREcmFnZ2FibGUgfTtcbiIsImltcG9ydCB7IGZpbmRFbnRpdHlCeUlkLCBnZXRHYW1lU3RhdGUsIGlzQXJlYVNraXBwZWQgfSBmcm9tICcuL2F1dG9mYXJtLmpzJztcbmltcG9ydCB7IHNob3dOb3RpZmljYXRpb24gfSBmcm9tICcuLi91aS9pbnRlcmFjdGlvbi5qcyc7XG5pbXBvcnQgeyBnZXRHYW1lQ2FudmFzLCB1cGRhdGVMb2NrQnV0dG9uVUkgfSBmcm9tICcuLi91aS9yYWRhci5qcyc7XG5pbXBvcnQgeyBnZXRBbmltYWxQb3NpdGlvbiwgZXh0cmFjdFBvc2l0aW9uLCBidWlsZEVudGl0eVN0YXRlLCBjYWxjdWxhdGVEaXN0YW5jZSwgbW92ZUFuZENsaWNrRWxlbWVudCB9IGZyb20gJy4vbW92ZW1lbnQuanMnO1xuaW1wb3J0IHsgaXNQcm9jZXNzZWQsIGdldEVudGl0eU1hbmFnZXIsIHN0YXRlIH0gZnJvbSAnLi4vY29yZS5qcyc7XG5pbXBvcnQgeyBpc1ZhbGlkRW50aXR5IH0gZnJvbSAnLi4vdXRpbHMuanMnO1xuXG53aW5kb3cubG9ja0VuYWJsZWQgPSBmYWxzZTtcbndpbmRvdy5sb2NrVGFyZ2V0SWQgPSBudWxsO1xud2luZG93LmF1dG9Eb2RnZUVuYWJsZWQgPSBmYWxzZTtcblxuXG5mdW5jdGlvbiB1cGRhdGVMb2NrTG9vcCgpIHtcbiAgaWYgKCFpc1Byb2Nlc3NlZCkge1xuICAgIHJldHVybjtcbiAgfVxuICByZXF1ZXN0QW5pbWF0aW9uRnJhbWUodXBkYXRlTG9ja0xvb3ApO1xuICBpZiAoIXdpbmRvdy5sb2NrRW5hYmxlZCB8fCAhd2luZG93LmxvY2tUYXJnZXRJZCkge1xuICAgIHJldHVybjtcbiAgfVxuICB0cnkge1xuICAgIGNvbnN0IHRhcmdldEVudGl0eSA9IGZpbmRFbnRpdHlCeUlkKHdpbmRvdy5sb2NrVGFyZ2V0SWQpO1xuICAgIGlmICghdGFyZ2V0RW50aXR5KSB7XG4gICAgICBzaG93Tm90aWZpY2F0aW9uKFwiTG9jayB0YXJnZXQgbG9zdFwiKTtcbiAgICAgIHdpbmRvdy5sb2NrVGFyZ2V0SWQgPSBudWxsO1xuICAgICAgd2luZG93LmxvY2tFbmFibGVkID0gZmFsc2U7XG4gICAgICB1cGRhdGVMb2NrQnV0dG9uVUkoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdGFyZ2V0UG9zID0gZXh0cmFjdFBvc2l0aW9uKHRhcmdldEVudGl0eSk7XG4gICAgY29uc3QgY3VycmVudFBvcyA9IGdldEFuaW1hbFBvc2l0aW9uKCk7XG4gICAgaWYgKCF0YXJnZXRQb3MgfHwgIWN1cnJlbnRQb3MpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgY2FudmFzID0gZ2V0R2FtZUNhbnZhcygpO1xuICAgIGlmICghY2FudmFzKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgY29uc3QgY2VudGVyWCA9IHJlY3QubGVmdCArIHJlY3Qud2lkdGggLyAyO1xuICAgIGNvbnN0IGNlbnRlclkgPSByZWN0LnRvcCArIHJlY3QuaGVpZ2h0IC8gMjtcbiAgICBjb25zdCByZWxYID0gdGFyZ2V0UG9zLnggLSBjdXJyZW50UG9zLng7XG4gICAgY29uc3QgcmVsWSA9IHRhcmdldFBvcy55IC0gY3VycmVudFBvcy55O1xuICAgIGNvbnN0IGRpc3RUb1RhcmdldCA9IE1hdGguc3FydChyZWxYICogcmVsWCArIHJlbFkgKiByZWxZKTtcbiAgICBsZXQgcHJlZGljdGVkWCA9IHRhcmdldFBvcy54O1xuICAgIGxldCBwcmVkaWN0ZWRZID0gdGFyZ2V0UG9zLnk7XG4gICAgaWYgKHRhcmdldEVudGl0eS52ZWxvY2l0eSkge1xuICAgICAgY29uc3QgdmVsWCA9IHRhcmdldEVudGl0eS52ZWxvY2l0eS5feCB8fCB0YXJnZXRFbnRpdHkudmVsb2NpdHkueCB8fCAwO1xuICAgICAgY29uc3QgdmVsWSA9IHRhcmdldEVudGl0eS52ZWxvY2l0eS5feSB8fCB0YXJnZXRFbnRpdHkudmVsb2NpdHkueSB8fCAwO1xuICAgICAgY29uc3QgcHJlZGljdGlvbkZhY3RvciA9IE1hdGgubWluKGRpc3RUb1RhcmdldCAvIDgwMCwgMC41KTtcbiAgICAgIHByZWRpY3RlZFggKz0gdmVsWCAqIHByZWRpY3Rpb25GYWN0b3I7XG4gICAgICBwcmVkaWN0ZWRZICs9IHZlbFkgKiBwcmVkaWN0aW9uRmFjdG9yO1xuICAgIH1cbiAgICBjb25zdCBmaW5hbFJlbFggPSBwcmVkaWN0ZWRYIC0gY3VycmVudFBvcy54O1xuICAgIGNvbnN0IGZpbmFsUmVsWSA9IHByZWRpY3RlZFkgLSBjdXJyZW50UG9zLnk7XG4gICAgY29uc3QgZmluYWxEaXN0ID0gTWF0aC5zcXJ0KGZpbmFsUmVsWCAqIGZpbmFsUmVsWCArIGZpbmFsUmVsWSAqIGZpbmFsUmVsWSk7XG4gICAgbGV0IG11bHRpcGxpZXIgPSAxLjU7XG4gICAgaWYgKGZpbmFsRGlzdCA+IDIwMDApIHtcbiAgICAgIG11bHRpcGxpZXIgPSAzO1xuICAgIH0gZWxzZSBpZiAoZmluYWxEaXN0ID4gMTAwMCkge1xuICAgICAgbXVsdGlwbGllciA9IDI7XG4gICAgfSBlbHNlIGlmIChmaW5hbERpc3QgPCAyMDApIHtcbiAgICAgIG11bHRpcGxpZXIgPSAwLjg7XG4gICAgfVxuICAgIGNvbnN0IG1heE9mZnNldCA9IE1hdGgubWluKHJlY3Qud2lkdGgsIHJlY3QuaGVpZ2h0KSAqIDAuODU7XG4gICAgbGV0IHNjYWxlZFggPSBmaW5hbFJlbFggKiBtdWx0aXBsaWVyO1xuICAgIGxldCBzY2FsZWRZID0gZmluYWxSZWxZICogbXVsdGlwbGllcjtcbiAgICBjb25zdCBzY2FsZWREaXN0ID0gTWF0aC5zcXJ0KHNjYWxlZFggKiBzY2FsZWRYICsgc2NhbGVkWSAqIHNjYWxlZFkpO1xuICAgIGlmIChzY2FsZWREaXN0ID4gbWF4T2Zmc2V0KSB7XG4gICAgICBjb25zdCBzY2FsZUZhY3RvciA9IG1heE9mZnNldCAvIHNjYWxlZERpc3Q7XG4gICAgICBzY2FsZWRYICo9IHNjYWxlRmFjdG9yO1xuICAgICAgc2NhbGVkWSAqPSBzY2FsZUZhY3RvcjtcbiAgICB9XG4gICAgY2FudmFzLmRpc3BhdGNoRXZlbnQobmV3IE1vdXNlRXZlbnQoXCJwb2ludGVybW92ZVwiLCB7XG4gICAgICBjbGllbnRYOiBjZW50ZXJYICsgc2NhbGVkWCxcbiAgICAgIGNsaWVudFk6IGNlbnRlclkgKyBzY2FsZWRZLFxuICAgICAgYnViYmxlczogdHJ1ZSxcbiAgICAgIHZpZXc6IHdpbmRvd1xuICAgIH0pKTtcbiAgfSBjYXRjaCAoY29udGV4dCkge31cbn1cbmZ1bmN0aW9uIHRvZ2dsZUxvY2soKSB7XG4gIGlmICh3aW5kb3cubG9ja0VuYWJsZWQgJiYgd2luZG93LmxvY2tUYXJnZXRJZCkge1xuICAgIHdpbmRvdy5sb2NrRW5hYmxlZCA9IGZhbHNlO1xuICAgIHdpbmRvdy5sb2NrVGFyZ2V0SWQgPSBudWxsO1xuICAgIHNob3dOb3RpZmljYXRpb24oXCJMb2NrIHJlbGVhc2VkXCIpO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGN1cnJlbnRTdGF0ZSA9IGJ1aWxkRW50aXR5U3RhdGUoKTtcbiAgICBpZiAoY3VycmVudFN0YXRlICYmIGN1cnJlbnRTdGF0ZS5wbGF5ZXJzICYmIGN1cnJlbnRTdGF0ZS5wbGF5ZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgIHdpbmRvdy5sb2NrRW5hYmxlZCA9IHRydWU7XG4gICAgICB3aW5kb3cubG9ja1RhcmdldElkID0gY3VycmVudFN0YXRlLnBsYXllcnNbMF0uaWQ7XG4gICAgICBjb25zdCB0YXJnZXROYW1lID0gY3VycmVudFN0YXRlLnBsYXllcnNbMF0uZW50aXR5Py5uYW1lIHx8IFwiSUQ6XCIgKyB3aW5kb3cubG9ja1RhcmdldElkO1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihcIkxvY2tlZDogXCIgKyB0YXJnZXROYW1lKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihcIk5vIHBsYXllcnMgdG8gbG9jayBvblwiKTtcbiAgICB9XG4gIH1cbiAgdXBkYXRlTG9ja0J1dHRvblVJKCk7XG59XG5mdW5jdGlvbiB0cmFja05lYXJlc3RQbGF5ZXIoKSB7XG4gIGNvbnN0IGdhbWVEYXRhID0gYnVpbGRFbnRpdHlTdGF0ZSgpO1xuICBpZiAoZ2FtZURhdGEgJiYgZ2FtZURhdGEucGxheWVycyAmJiBnYW1lRGF0YS5wbGF5ZXJzLmxlbmd0aCA+IDApIHtcbiAgICB3aW5kb3cuZXNwVHJhY2tlZEVudGl0eUlkID0gZ2FtZURhdGEucGxheWVyc1swXS5pZDtcbiAgICBzaG93Tm90aWZpY2F0aW9uKFwiVHJhY2tpbmc6IFwiICsgKGdhbWVEYXRhLnBsYXllcnNbMF0uZW50aXR5Py5uYW1lIHx8IHdpbmRvdy5lc3BUcmFja2VkRW50aXR5SWQpKTtcbiAgfSBlbHNlIHtcbiAgICBzaG93Tm90aWZpY2F0aW9uKFwiTm8gcGxheWVycyBuZWFyYnlcIik7XG4gIH1cbn1cbmZ1bmN0aW9uIGNsZWFyVHJhY2tpbmcoKSB7XG4gIHdpbmRvdy5lc3BUcmFja2VkRW50aXR5SWQgPSBudWxsO1xuICBzaG93Tm90aWZpY2F0aW9uKFwiVHJhY2tpbmcgY2xlYXJlZFwiKTtcbn1cbmNvbnN0IG1heERpc3RhbmNlID0gNjAwO1xuY29uc3QgbWF4RGlzdGFuY2VUaHJlc2hvbGQgPSA4MDA7XG5sZXQgbGFzdFBvc2l0aW9uVGltZXN0YW1wID0gMDtcbmxldCBjdXJyZW50Q29vcmRpbmF0ZXMgPSBudWxsO1xubGV0IGl0ZXJhdGlvbkNvdW50ZXIgPSAwO1xubGV0IHByZXZpb3VzUG9zaXRpb25UaW1lc3RhbXAgPSAwO1xubGV0IGRhdGFCdWZmZXIgPSBbXTtcbmZ1bmN0aW9uIGF1dG9Eb2RnZUxvb3AoKSB7XG4gIGlmICghc3RhdGUuaXNUZXh0SW50ZXJjZXB0b3JJbml0aWFsaXplZCkge1xuICAgIHJldHVybjtcbiAgfVxuICBzZXRUaW1lb3V0KGF1dG9Eb2RnZUxvb3AsIDgwKTtcbiAgaWYgKCF3aW5kb3cuYXV0b0RvZGdlRW5hYmxlZCkge1xuICAgIHJldHVybjtcbiAgfVxuICB0cnkge1xuICAgIGNvbnN0IGN1cnJlbnRQb3MgPSBnZXRBbmltYWxQb3NpdGlvbigpO1xuICAgIGlmICghY3VycmVudFBvcykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBnYW1lU3RhdGUgPSBnZXRHYW1lU3RhdGUoKTtcbiAgICBjb25zdCB3b3JsZERhdGEgPSBnZXRFbnRpdHlNYW5hZ2VyKGdhbWVTdGF0ZSk7XG4gICAgY29uc3QgbXlBbmltYWwgPSBnYW1lU3RhdGU/Lm15QW5pbWFscz8uWzBdO1xuICAgIGlmICghd29ybGREYXRhIHx8ICFteUFuaW1hbCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsZXQgbmVhcmJ5RW50aXRpZXMgPSBbXTtcbiAgICAod29ybGREYXRhLmVudGl0aWVzTGlzdCB8fCBbXSkuZm9yRWFjaCh0YXJnZXRFbnRpdHkgPT4ge1xuICAgICAgaWYgKCF0YXJnZXRFbnRpdHkgfHwgdGFyZ2V0RW50aXR5LmlkID09PSBteUFuaW1hbC5pZCB8fCAhaXNWYWxpZEVudGl0eSh0YXJnZXRFbnRpdHkpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRhcmdldFggPSB0YXJnZXRFbnRpdHkucG9zaXRpb24/Ll94ICE9PSB1bmRlZmluZWQgPyB0YXJnZXRFbnRpdHkucG9zaXRpb24uX3ggOiB0YXJnZXRFbnRpdHkucG9zaXRpb24/Lng7XG4gICAgICBjb25zdCB0YXJnZXRZID0gdGFyZ2V0RW50aXR5LnBvc2l0aW9uPy5feSAhPT0gdW5kZWZpbmVkID8gdGFyZ2V0RW50aXR5LnBvc2l0aW9uLl95IDogdGFyZ2V0RW50aXR5LnBvc2l0aW9uPy55O1xuICAgICAgaWYgKHRhcmdldFggPT0gbnVsbCB8fCB0YXJnZXRZID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgZGlzdGFuY2VUb1RhcmdldCA9IGNhbGN1bGF0ZURpc3RhbmNlKGN1cnJlbnRQb3MueCwgY3VycmVudFBvcy55LCB0YXJnZXRYLCB0YXJnZXRZKTtcbiAgICAgIGlmIChkaXN0YW5jZVRvVGFyZ2V0IDwgbWF4RGlzdGFuY2UpIHtcbiAgICAgICAgbmVhcmJ5RW50aXRpZXMucHVzaCh7XG4gICAgICAgICAgeDogdGFyZ2V0WCxcbiAgICAgICAgICB5OiB0YXJnZXRZLFxuICAgICAgICAgIGRpc3Q6IGRpc3RhbmNlVG9UYXJnZXRcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKG5lYXJieUVudGl0aWVzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY3VycmVudENvb3JkaW5hdGVzID0gbnVsbDtcbiAgICAgIGl0ZXJhdGlvbkNvdW50ZXIgPSAwO1xuICAgICAgZGF0YUJ1ZmZlciA9IFtdO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgIGxldCBoYXNNb3ZlZCA9IGZhbHNlO1xuICAgIGlmIChub3cgLSBwcmV2aW91c1Bvc2l0aW9uVGltZXN0YW1wID4gNjAwKSB7XG4gICAgICBwcmV2aW91c1Bvc2l0aW9uVGltZXN0YW1wID0gbm93O1xuICAgICAgaWYgKGN1cnJlbnRDb29yZGluYXRlcykge1xuICAgICAgICBjb25zdCBkaXN0RnJvbUxhc3RQb3MgPSBjYWxjdWxhdGVEaXN0YW5jZShjdXJyZW50UG9zLngsIGN1cnJlbnRQb3MueSwgY3VycmVudENvb3JkaW5hdGVzLngsIGN1cnJlbnRDb29yZGluYXRlcy55KTtcbiAgICAgICAgaWYgKGRpc3RGcm9tTGFzdFBvcyA8IDIwKSB7XG4gICAgICAgICAgaXRlcmF0aW9uQ291bnRlcisrO1xuICAgICAgICAgIGhhc01vdmVkID0gdHJ1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpdGVyYXRpb25Db3VudGVyID0gMDtcbiAgICAgICAgICBkYXRhQnVmZmVyID0gW107XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGN1cnJlbnRDb29yZGluYXRlcyA9IHtcbiAgICAgICAgeDogY3VycmVudFBvcy54LFxuICAgICAgICB5OiBjdXJyZW50UG9zLnlcbiAgICAgIH07XG4gICAgfVxuICAgIGxldCBzdW1YID0gMDtcbiAgICBsZXQgc3VtWSA9IDA7XG4gICAgbmVhcmJ5RW50aXRpZXMuZm9yRWFjaChzb3VyY2VFbnRpdHkgPT4ge1xuICAgICAgY29uc3QgZGVsdGFYID0gY3VycmVudFBvcy54IC0gc291cmNlRW50aXR5Lng7XG4gICAgICBjb25zdCBkZWx0YVkgPSBjdXJyZW50UG9zLnkgLSBzb3VyY2VFbnRpdHkueTtcbiAgICAgIGNvbnN0IG1hZ25pdHVkZSA9IE1hdGguc3FydChkZWx0YVggKiBkZWx0YVggKyBkZWx0YVkgKiBkZWx0YVkpO1xuICAgICAgaWYgKG1hZ25pdHVkZSA+IDAuMDEpIHtcbiAgICAgICAgY29uc3Qgbm9ybWFsaXplZERpc3RhbmNlID0gKG1heERpc3RhbmNlIC0gc291cmNlRW50aXR5LmRpc3QpIC8gbWF4RGlzdGFuY2U7XG4gICAgICAgIHN1bVggKz0gZGVsdGFYIC8gbWFnbml0dWRlICogbm9ybWFsaXplZERpc3RhbmNlO1xuICAgICAgICBzdW1ZICs9IGRlbHRhWSAvIG1hZ25pdHVkZSAqIG5vcm1hbGl6ZWREaXN0YW5jZTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICBsZXQgbWFnbml0dWRlID0gTWF0aC5zcXJ0KHN1bVggKiBzdW1YICsgc3VtWSAqIHN1bVkpO1xuICAgIGlmIChtYWduaXR1ZGUgPCAwLjAxKSB7XG4gICAgICBzdW1YID0gMTtcbiAgICAgIHN1bVkgPSAwO1xuICAgICAgbWFnbml0dWRlID0gMTtcbiAgICB9XG4gICAgc3VtWCAvPSBtYWduaXR1ZGU7XG4gICAgc3VtWSAvPSBtYWduaXR1ZGU7XG4gICAgbGV0IGFycm93QW5nbGUgPSBNYXRoLmF0YW4yKHN1bVksIHN1bVgpO1xuICAgIGlmIChoYXNNb3ZlZCAmJiBpdGVyYXRpb25Db3VudGVyID49IDEpIHtcbiAgICAgIGNvbnN0IGFuZ2xlUHJlc2V0cyA9IFtNYXRoLlBJIC8gNCwgLU1hdGguUEkgLyA0LCBNYXRoLlBJIC8gMiwgLU1hdGguUEkgLyAyLCBNYXRoLlBJICogMyAvIDQsIC1NYXRoLlBJICogMyAvIDRdO1xuICAgICAgbGV0IHByZXZpb3VzQW5nbGUgPSBhcnJvd0FuZ2xlO1xuICAgICAgbGV0IG1heFByb2plY3Rpb24gPSAtSW5maW5pdHk7XG4gICAgICBmb3IgKGNvbnN0IGFuZ2xlT2Zmc2V0IG9mIGFuZ2xlUHJlc2V0cykge1xuICAgICAgICBjb25zdCByb3RhdGVkQW5nbGUgPSBhcnJvd0FuZ2xlICsgYW5nbGVPZmZzZXQ7XG4gICAgICAgIGlmIChkYXRhQnVmZmVyLnNvbWUoY3VycmVudEFuZ2xlID0+IE1hdGguYWJzKGN1cnJlbnRBbmdsZSAtIHJvdGF0ZWRBbmdsZSkgPCAwLjMpICYmIGl0ZXJhdGlvbkNvdW50ZXIgPCA1KSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgbGV0IGN1cnJlbnRQcm9qZWN0aW9uID0gMDtcbiAgICAgICAgbmVhcmJ5RW50aXRpZXMuZm9yRWFjaChwb3NpdGlvbkVudGl0eSA9PiB7XG4gICAgICAgICAgY3VycmVudFByb2plY3Rpb24gLT0gTWF0aC5jb3Mocm90YXRlZEFuZ2xlKSAqIChwb3NpdGlvbkVudGl0eS54IC0gY3VycmVudFBvcy54KSArIE1hdGguc2luKHJvdGF0ZWRBbmdsZSkgKiAocG9zaXRpb25FbnRpdHkueSAtIGN1cnJlbnRQb3MueSk7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoY3VycmVudFByb2plY3Rpb24gPiBtYXhQcm9qZWN0aW9uKSB7XG4gICAgICAgICAgbWF4UHJvamVjdGlvbiA9IGN1cnJlbnRQcm9qZWN0aW9uO1xuICAgICAgICAgIHByZXZpb3VzQW5nbGUgPSByb3RhdGVkQW5nbGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGFycm93QW5nbGUgPSBwcmV2aW91c0FuZ2xlO1xuICAgICAgZGF0YUJ1ZmZlci5wdXNoKGFycm93QW5nbGUpO1xuICAgICAgaWYgKGRhdGFCdWZmZXIubGVuZ3RoID4gOCkge1xuICAgICAgICBkYXRhQnVmZmVyLnNoaWZ0KCk7XG4gICAgICB9XG4gICAgICBpZiAoaXRlcmF0aW9uQ291bnRlciA+PSA1KSB7XG4gICAgICAgIGFycm93QW5nbGUgKz0gTWF0aC5yYW5kb20oKSA+IDAuNSA/IE1hdGguUEkgLyAyIDogLU1hdGguUEkgLyAyO1xuICAgICAgICBpdGVyYXRpb25Db3VudGVyID0gMDtcbiAgICAgICAgZGF0YUJ1ZmZlciA9IFtdO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBpc0Rpc3RhbmNlRXhjZWVkZWQgPSBub3cgLSBsYXN0UG9zaXRpb25UaW1lc3RhbXAgPiBtYXhEaXN0YW5jZVRocmVzaG9sZDtcbiAgICBpZiAoaXNEaXN0YW5jZUV4Y2VlZGVkKSB7XG4gICAgICBsYXN0UG9zaXRpb25UaW1lc3RhbXAgPSBub3c7XG4gICAgfVxuICAgIG1vdmVBbmRDbGlja0VsZW1lbnQoY3VycmVudFBvcy54ICsgTWF0aC5jb3MoYXJyb3dBbmdsZSkgKiAyMDAwLCBjdXJyZW50UG9zLnkgKyBNYXRoLnNpbihhcnJvd0FuZ2xlKSAqIDIwMDAsIGlzRGlzdGFuY2VFeGNlZWRlZCk7XG4gIH0gY2F0Y2ggKGRhdGFDb250YWluZXIpIHt9XG59XG5mdW5jdGlvbiBlbmFibGVBdXRvRG9kZ2UoKSB7XG4gIHdpbmRvdy5hdXRvRG9kZ2VFbmFibGVkID0gdHJ1ZTtcbiAgY3VycmVudENvb3JkaW5hdGVzID0gbnVsbDtcbiAgaXRlcmF0aW9uQ291bnRlciA9IDA7XG4gIGRhdGFCdWZmZXIgPSBbXTtcbiAgaWYgKCFzdGF0ZS5pc1RleHRJbnRlcmNlcHRvckluaXRpYWxpemVkKSB7XG4gICAgc3RhdGUuaXNUZXh0SW50ZXJjZXB0b3JJbml0aWFsaXplZCA9IHRydWU7XG4gICAgYXV0b0RvZGdlTG9vcCgpO1xuICB9XG4gIHNob3dOb3RpZmljYXRpb24oXCJBdXRvIGRvZGdlIGVuYWJsZWRcIik7XG59XG5mdW5jdGlvbiBkaXNhYmxlQXV0b0RvZGdlKCkge1xuICB3aW5kb3cuYXV0b0RvZGdlRW5hYmxlZCA9IGZhbHNlO1xuICBzaG93Tm90aWZpY2F0aW9uKFwiQXV0byBkb2RnZSBkaXNhYmxlZFwiKTtcbn1cbmZ1bmN0aW9uIGZpbmROZWFyZXN0RW50aXR5KHJhbmdlKSB7XG4gIHJhbmdlID0gcmFuZ2UgfHwgd2luZG93LmF1dG9GYXJtUmFuZ2U7XG4gIHRyeSB7XG4gICAgY29uc3QgZ2FtZVN0YXRlID0gZ2V0R2FtZVN0YXRlKCk7XG4gICAgY29uc3Qgd29ybGREYXRhID0gZ2V0RW50aXR5TWFuYWdlcihnYW1lU3RhdGUpO1xuICAgIGNvbnN0IHBsYXllckFuaW1hbCA9IGdhbWVTdGF0ZT8ubXlBbmltYWxzPy5bMF07XG4gICAgaWYgKCF3b3JsZERhdGEgfHwgIXBsYXllckFuaW1hbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHBsYXllclggPSBwbGF5ZXJBbmltYWwucG9zaXRpb24uX3ggIT09IHVuZGVmaW5lZCA/IHBsYXllckFuaW1hbC5wb3NpdGlvbi5feCA6IHBsYXllckFuaW1hbC5wb3NpdGlvbi54O1xuICAgIGNvbnN0IHBsYXllclkgPSBwbGF5ZXJBbmltYWwucG9zaXRpb24uX3kgIT09IHVuZGVmaW5lZCA/IHBsYXllckFuaW1hbC5wb3NpdGlvbi5feSA6IHBsYXllckFuaW1hbC5wb3NpdGlvbi55O1xuICAgIGxldCBuZWFyZXN0RW50aXR5ID0gbnVsbDtcbiAgICBsZXQgbWluRGlzdGFuY2UgPSBJbmZpbml0eTtcbiAgICAod29ybGREYXRhLmVudGl0aWVzTGlzdCB8fCBbXSkuZm9yRWFjaCh0YXJnZXRFbnRpdHkgPT4ge1xuICAgICAgaWYgKCF0YXJnZXRFbnRpdHkgfHwgdGFyZ2V0RW50aXR5LmlkID09PSBwbGF5ZXJBbmltYWwuaWQgfHwgd2luZG93LmF1dG9GYXJtU2tpcElkcy5oYXModGFyZ2V0RW50aXR5LmlkKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBwb3NYID0gdGFyZ2V0RW50aXR5LnBvc2l0aW9uPy5feCAhPT0gdW5kZWZpbmVkID8gdGFyZ2V0RW50aXR5LnBvc2l0aW9uLl94IDogdGFyZ2V0RW50aXR5LnBvc2l0aW9uPy54O1xuICAgICAgY29uc3QgcG9zWSA9IHRhcmdldEVudGl0eS5wb3NpdGlvbj8uX3kgIT09IHVuZGVmaW5lZCA/IHRhcmdldEVudGl0eS5wb3NpdGlvbi5feSA6IHRhcmdldEVudGl0eS5wb3NpdGlvbj8ueTtcbiAgICAgIGlmIChwb3NYID09IG51bGwgfHwgcG9zWSA9PSBudWxsIHx8IGlzVmFsaWRFbnRpdHkodGFyZ2V0RW50aXR5KSB8fCBpc0FyZWFTa2lwcGVkKHBvc1gsIHBvc1kpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRpc3RhbmNlID0gY2FsY3VsYXRlRGlzdGFuY2UocGxheWVyWCwgcGxheWVyWSwgcG9zWCwgcG9zWSk7XG4gICAgICBpZiAoZGlzdGFuY2UgPCBtaW5EaXN0YW5jZSAmJiBkaXN0YW5jZSA8IHJhbmdlKSB7XG4gICAgICAgIG1pbkRpc3RhbmNlID0gZGlzdGFuY2U7XG4gICAgICAgIG5lYXJlc3RFbnRpdHkgPSB7XG4gICAgICAgICAgaWQ6IHRhcmdldEVudGl0eS5pZCxcbiAgICAgICAgICB4OiBwb3NYLFxuICAgICAgICAgIHk6IHBvc1ksXG4gICAgICAgICAgZGlzdGFuY2U6IGRpc3RhbmNlLFxuICAgICAgICAgIGVudGl0eTogdGFyZ2V0RW50aXR5XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIG5lYXJlc3RFbnRpdHk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbmZ1bmN0aW9uIGZpbmRFbnRpdGllc0luUmFuZ2Uoc2VhcmNoUmFuZ2UpIHtcbiAgc2VhcmNoUmFuZ2UgPSBzZWFyY2hSYW5nZSB8fCB3aW5kb3cuYXV0b0Zhcm1SYW5nZTtcbiAgdHJ5IHtcbiAgICBjb25zdCBzdGF0ZSA9IGdldEdhbWVTdGF0ZSgpO1xuICAgIGNvbnN0IHdvcmxkID0gZ2V0RW50aXR5TWFuYWdlcihzdGF0ZSk7XG4gICAgY29uc3QgbXlBbmltYWwgPSBzdGF0ZT8ubXlBbmltYWxzPy5bMF07XG4gICAgaWYgKCF3b3JsZCB8fCAhbXlBbmltYWwpIHtcbiAgICAgIHJldHVybiBbXTtcbiAgICB9XG4gICAgY29uc3QgbXlYID0gbXlBbmltYWwucG9zaXRpb24uX3ggIT09IHVuZGVmaW5lZCA/IG15QW5pbWFsLnBvc2l0aW9uLl94IDogbXlBbmltYWwucG9zaXRpb24ueDtcbiAgICBjb25zdCBteVkgPSBteUFuaW1hbC5wb3NpdGlvbi5feSAhPT0gdW5kZWZpbmVkID8gbXlBbmltYWwucG9zaXRpb24uX3kgOiBteUFuaW1hbC5wb3NpdGlvbi55O1xuICAgIGNvbnN0IGVudGl0aWVzSW5SYW5nZSA9IFtdO1xuICAgICh3b3JsZC5lbnRpdGllc0xpc3QgfHwgW10pLmZvckVhY2godGFyZ2V0RW50aXR5ID0+IHtcbiAgICAgIGlmICghdGFyZ2V0RW50aXR5IHx8IHRhcmdldEVudGl0eS5pZCA9PT0gbXlBbmltYWwuaWQgfHwgd2luZG93LmF1dG9GYXJtU2tpcElkcy5oYXModGFyZ2V0RW50aXR5LmlkKSkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBwb3NYID0gdGFyZ2V0RW50aXR5LnBvc2l0aW9uPy5feCAhPT0gdW5kZWZpbmVkID8gdGFyZ2V0RW50aXR5LnBvc2l0aW9uLl94IDogdGFyZ2V0RW50aXR5LnBvc2l0aW9uPy54O1xuICAgICAgY29uc3QgcG9zWSA9IHRhcmdldEVudGl0eS5wb3NpdGlvbj8uX3kgIT09IHVuZGVmaW5lZCA/IHRhcmdldEVudGl0eS5wb3NpdGlvbi5feSA6IHRhcmdldEVudGl0eS5wb3NpdGlvbj8ueTtcbiAgICAgIGlmIChwb3NYID09IG51bGwgfHwgcG9zWSA9PSBudWxsIHx8IGlzVmFsaWRFbnRpdHkodGFyZ2V0RW50aXR5KSB8fCBpc0FyZWFTa2lwcGVkKHBvc1gsIHBvc1kpKSB7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGRpc3RhbmNlID0gY2FsY3VsYXRlRGlzdGFuY2UobXlYLCBteVksIHBvc1gsIHBvc1kpO1xuICAgICAgaWYgKGRpc3RhbmNlIDwgc2VhcmNoUmFuZ2UpIHtcbiAgICAgICAgZW50aXRpZXNJblJhbmdlLnB1c2goe1xuICAgICAgICAgIGlkOiB0YXJnZXRFbnRpdHkuaWQsXG4gICAgICAgICAgeDogcG9zWCxcbiAgICAgICAgICB5OiBwb3NZLFxuICAgICAgICAgIGRpc3RhbmNlOiBkaXN0YW5jZSxcbiAgICAgICAgICBlbnRpdHk6IHRhcmdldEVudGl0eVxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gZW50aXRpZXNJblJhbmdlLnNvcnQoKGVudGl0eUEsIGVudGl0eUIpID0+IGVudGl0eUEuZGlzdGFuY2UgLSBlbnRpdHlCLmRpc3RhbmNlKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG59XG5mdW5jdGlvbiBjYWxjdWxhdGVBdm9pZGFuY2VWZWN0b3IoKSB7XG4gIGlmICghd2luZG93LmF1dG9GYXJtQXZvaWRQbGF5ZXJzKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHg6IDAsXG4gICAgICB5OiAwXG4gICAgfTtcbiAgfVxuICBjb25zdCBteVBvc2l0aW9uID0gZ2V0QW5pbWFsUG9zaXRpb24oKTtcbiAgaWYgKCFteVBvc2l0aW9uKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHg6IDAsXG4gICAgICB5OiAwXG4gICAgfTtcbiAgfVxuICBsZXQgYXZvaWRYID0gMDtcbiAgbGV0IGF2b2lkWSA9IDA7XG4gIHRyeSB7XG4gICAgY29uc3QgZ2FtZVN0YXRlID0gZ2V0R2FtZVN0YXRlKCk7XG4gICAgY29uc3Qgd29ybGREYXRhID0gZ2V0RW50aXR5TWFuYWdlcihnYW1lU3RhdGUpO1xuICAgIGNvbnN0IG15QW5pbWFsID0gZ2FtZVN0YXRlPy5teUFuaW1hbHM/LlswXTtcbiAgICBpZiAoIXdvcmxkRGF0YSB8fCAhbXlBbmltYWwpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHg6IDAsXG4gICAgICAgIHk6IDBcbiAgICAgIH07XG4gICAgfVxuICAgICh3b3JsZERhdGEuZW50aXRpZXNMaXN0IHx8IFtdKS5mb3JFYWNoKHRhcmdldEVudGl0eSA9PiB7XG4gICAgICBpZiAoIXRhcmdldEVudGl0eSB8fCB0YXJnZXRFbnRpdHkuaWQgPT09IG15QW5pbWFsLmlkIHx8ICFpc1ZhbGlkRW50aXR5KHRhcmdldEVudGl0eSkpIHtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgY29uc3QgdGFyZ2V0WCA9IHRhcmdldEVudGl0eS5wb3NpdGlvbj8uX3ggIT09IHVuZGVmaW5lZCA/IHRhcmdldEVudGl0eS5wb3NpdGlvbi5feCA6IHRhcmdldEVudGl0eS5wb3NpdGlvbj8ueDtcbiAgICAgIGNvbnN0IHRhcmdldFkgPSB0YXJnZXRFbnRpdHkucG9zaXRpb24/Ll95ICE9PSB1bmRlZmluZWQgPyB0YXJnZXRFbnRpdHkucG9zaXRpb24uX3kgOiB0YXJnZXRFbnRpdHkucG9zaXRpb24/Lnk7XG4gICAgICBpZiAodGFyZ2V0WCA9PSBudWxsIHx8IHRhcmdldFkgPT0gbnVsbCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBkaXN0YW5jZVRvVGFyZ2V0ID0gY2FsY3VsYXRlRGlzdGFuY2UobXlQb3NpdGlvbi54LCBteVBvc2l0aW9uLnksIHRhcmdldFgsIHRhcmdldFkpO1xuICAgICAgaWYgKGRpc3RhbmNlVG9UYXJnZXQgPCB3aW5kb3cuYXV0b0Zhcm1Bdm9pZERpc3RhbmNlKSB7XG4gICAgICAgIGNvbnN0IGRlbHRhWCA9IG15UG9zaXRpb24ueCAtIHRhcmdldFg7XG4gICAgICAgIGNvbnN0IGRlbHRhWSA9IG15UG9zaXRpb24ueSAtIHRhcmdldFk7XG4gICAgICAgIGNvbnN0IGh5cG90ZW51c2UgPSBNYXRoLnNxcnQoZGVsdGFYICogZGVsdGFYICsgZGVsdGFZICogZGVsdGFZKTtcbiAgICAgICAgY29uc3QgYXZvaWRhbmNlRmFjdG9yID0gKHdpbmRvdy5hdXRvRmFybUF2b2lkRGlzdGFuY2UgLSBNYXRoLm1heChkaXN0YW5jZVRvVGFyZ2V0LCA1MCkpIC8gd2luZG93LmF1dG9GYXJtQXZvaWREaXN0YW5jZTtcbiAgICAgICAgaWYgKGh5cG90ZW51c2UgPiAwKSB7XG4gICAgICAgICAgYXZvaWRYICs9IGRlbHRhWCAvIGh5cG90ZW51c2UgKiBhdm9pZGFuY2VGYWN0b3IgKiA1MDA7XG4gICAgICAgICAgYXZvaWRZICs9IGRlbHRhWSAvIGh5cG90ZW51c2UgKiBhdm9pZGFuY2VGYWN0b3IgKiA1MDA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHt9XG4gIHJldHVybiB7XG4gICAgeDogYXZvaWRYLFxuICAgIHk6IGF2b2lkWVxuICB9O1xufVxuXG5leHBvcnQgeyB1cGRhdGVMb2NrTG9vcCwgdG9nZ2xlTG9jaywgdHJhY2tOZWFyZXN0UGxheWVyLCBjbGVhclRyYWNraW5nLCBhdXRvRG9kZ2VMb29wLCBlbmFibGVBdXRvRG9kZ2UsIGRpc2FibGVBdXRvRG9kZ2UsIGZpbmROZWFyZXN0RW50aXR5LCBmaW5kRW50aXRpZXNJblJhbmdlLCBjYWxjdWxhdGVBdm9pZGFuY2VWZWN0b3IgfTtcbiIsImltcG9ydCB7IGdldEVudGl0eU1hbmFnZXIsIHN0YXRlIH0gZnJvbSAnLi4vY29yZS5qcyc7XG5pbXBvcnQgeyBjYWxjdWxhdGVEaXN0YW5jZSwgbW92ZUFuZENsaWNrRWxlbWVudCwgZ2V0QW5pbWFsUG9zaXRpb24gfSBmcm9tICcuL21vdmVtZW50LmpzJztcbmltcG9ydCB7IHNob3dOb3RpZmljYXRpb24gfSBmcm9tICcuLi91aS9pbnRlcmFjdGlvbi5qcyc7XG5pbXBvcnQgeyBmaW5kRW50aXRpZXNJblJhbmdlLCBmaW5kTmVhcmVzdEVudGl0eSwgY2FsY3VsYXRlQXZvaWRhbmNlVmVjdG9yIH0gZnJvbSAnLi9haW1ib3QuanMnO1xuaW1wb3J0IHsgZ2V0R2FtZUNhbnZhcyB9IGZyb20gJy4uL3VpL3JhZGFyLmpzJztcblxud2luZG93LmF1dG9GYXJtQWN0aXZlID0gZmFsc2U7XG53aW5kb3cuYXV0b0Zhcm1Nb2RlID0gXCJuZWFyZXN0XCI7XG53aW5kb3cuYXV0b0Zhcm1SYW5nZSA9IDMwMDA7XG53aW5kb3cuYXV0b0Zhcm1Cb29zdCA9IHRydWU7XG53aW5kb3cuYXV0b0Zhcm1Fdm9sdmUgPSB0cnVlO1xud2luZG93LmF1dG9GYXJtQXZvaWRQbGF5ZXJzID0gdHJ1ZTtcbndpbmRvdy5hdXRvRmFybUF2b2lkRGlzdGFuY2UgPSA4MDA7XG53aW5kb3cuYXV0b0Zhcm1TdGF0cyA9IHtcbiAgY29sbGVjdGVkOiAwLFxuICBzdGFydFRpbWU6IDBcbn07XG53aW5kb3cuYXV0b0Zhcm1QYXRyb2xQb2ludHMgPSBbXTtcbndpbmRvdy5hdXRvRmFybVBhdHJvbEluZGV4ID0gMDtcbndpbmRvdy5hdXRvRmFybUN1cnJlbnRUYXJnZXQgPSBudWxsO1xud2luZG93LmF1dG9GYXJtVGFyZ2V0U3RhcnRUaW1lID0gMDtcbndpbmRvdy5hdXRvRmFybVNraXBJZHMgPSBuZXcgU2V0KCk7XG53aW5kb3cuYXV0b0Zhcm1Ta2lwQ2xlYXJUaW1lID0gMDtcbndpbmRvdy5hdXRvRmFybVNraXBBcmVhcyA9IFtdO1xuXG5cbmZ1bmN0aW9uIGdldEdhbWVTdGF0ZSgpIHtcbiAgdHJ5IHtcbiAgICBpZiAoc3RhdGUuYW5pbWFsRGF0YSAmJiBzdGF0ZS5hbmltYWxEYXRhLm15QW5pbWFscyAmJiBzdGF0ZS5hbmltYWxEYXRhLm15QW5pbWFscy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gc3RhdGUuYW5pbWFsRGF0YTtcbiAgICB9XG4gICAgY29uc3Qgc3RhdGVzID0gd2luZG93Ll9fc3M/LnN0YXRlcztcbiAgICBpZiAoIXN0YXRlcykge1xuICAgICAgcmV0dXJuIHN0YXRlLmFuaW1hbERhdGEgfHwgbnVsbDtcbiAgICB9XG4gICAgZm9yIChsZXQgc3RhdGVJbmRleCA9IDA7IHN0YXRlSW5kZXggPCBzdGF0ZXMubGVuZ3RoOyBzdGF0ZUluZGV4KyspIHtcbiAgICAgIGlmIChzdGF0ZXNbc3RhdGVJbmRleF0/LmdhbWVTY2VuZT8ubXlBbmltYWxzKSB7XG4gICAgICAgIHJldHVybiBzdGF0ZXNbc3RhdGVJbmRleF0uZ2FtZVNjZW5lO1xuICAgICAgfVxuICAgICAgaWYgKHN0YXRlc1tzdGF0ZUluZGV4XT8uZ2FtZU1hbmFnZXIpIHtcbiAgICAgICAgZm9yIChjb25zdCBtYW5hZ2VyS2V5IG9mIE9iamVjdC5rZXlzKHN0YXRlc1tzdGF0ZUluZGV4XS5nYW1lTWFuYWdlcikpIHtcbiAgICAgICAgICBpZiAoc3RhdGVzW3N0YXRlSW5kZXhdLmdhbWVNYW5hZ2VyW21hbmFnZXJLZXldPy5teUFuaW1hbHMpIHtcbiAgICAgICAgICAgIHJldHVybiBzdGF0ZXNbc3RhdGVJbmRleF0uZ2FtZU1hbmFnZXJbbWFuYWdlcktleV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzdGF0ZS5hbmltYWxEYXRhIHx8IG51bGw7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgcmV0dXJuIHN0YXRlLmFuaW1hbERhdGEgfHwgbnVsbDtcbiAgfVxufVxuZnVuY3Rpb24gZmluZEVudGl0eUJ5SWQoZW50aXR5SWQpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBnYW1lU3RhdGUgPSBnZXRHYW1lU3RhdGUoKTtcbiAgICBpZiAoIWdhbWVTdGF0ZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHdvcmxkRGF0YSA9IGdldEVudGl0eU1hbmFnZXIoZ2FtZVN0YXRlKTtcbiAgICBpZiAoIXdvcmxkRGF0YSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGxldCBlbnRpdHkgPSB3b3JsZERhdGEuZW50aXRpZXNCeUlkID8gd29ybGREYXRhLmVudGl0aWVzQnlJZFtlbnRpdHlJZF0gOiBudWxsO1xuICAgIGlmICghZW50aXR5ICYmIHdvcmxkRGF0YS5lbnRpdGllc0xpc3QpIHtcbiAgICAgIGVudGl0eSA9IHdvcmxkRGF0YS5lbnRpdGllc0xpc3QuZmluZChzZWxlY3RlZEl0ZW0gPT4gc2VsZWN0ZWRJdGVtLmlkID09PSBlbnRpdHlJZCk7XG4gICAgfVxuICAgIGlmICghZW50aXR5ICYmIHdvcmxkRGF0YS5hbmltYWxzQnlQbGF5ZXJSb29tSWQpIHtcbiAgICAgIGZvciAobGV0IHJvb21JZCBvZiBPYmplY3Qua2V5cyh3b3JsZERhdGEuYW5pbWFsc0J5UGxheWVyUm9vbUlkKSkge1xuICAgICAgICBjb25zdCBhbmltYWxzID0gd29ybGREYXRhLmFuaW1hbHNCeVBsYXllclJvb21JZFtyb29tSWRdO1xuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShhbmltYWxzKSkge1xuICAgICAgICAgIGVudGl0eSA9IGFuaW1hbHMuZmluZChjdXJyZW50SXRlbSA9PiBjdXJyZW50SXRlbSAmJiBjdXJyZW50SXRlbS5pZCA9PT0gZW50aXR5SWQpO1xuICAgICAgICB9IGVsc2UgaWYgKGFuaW1hbHMgJiYgYW5pbWFscy5pZCA9PT0gZW50aXR5SWQpIHtcbiAgICAgICAgICBlbnRpdHkgPSBhbmltYWxzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChlbnRpdHkpIHtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZW50aXR5O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5jb25zdCBwcm94aW1pdHlMaW1pdCA9IDQwMDtcbmNvbnN0IG1heEZhaWxDb3VudCA9IDI7XG5jb25zdCB0aW1lb3V0RHVyYXRpb24gPSAyMDAwMDtcbmxldCBsYXN0RXZlbnRUaW1lc3RhbXAgPSAwO1xuY29uc3QgZXZlbnRJbnRlcnZhbFRocmVzaG9sZCA9IDYwMDtcbmZ1bmN0aW9uIG1hcmtBcmVhQXNGYWlsZWQocG9zWCwgcG9zWSkge1xuICBjb25zdCBjdXJyZW50VGltZSA9IERhdGUubm93KCk7XG4gIHdpbmRvdy5hdXRvRmFybVNraXBBcmVhcyA9IHdpbmRvdy5hdXRvRmFybVNraXBBcmVhcy5maWx0ZXIodGltZXN0YW1wID0+IHN0YXRlLmN1cnJlbnRUaW1lIC0gdGltZXN0YW1wLnRpbWUgPCB0aW1lb3V0RHVyYXRpb24pO1xuICBsZXQgZXhpc3RpbmdBcmVhID0gd2luZG93LmF1dG9GYXJtU2tpcEFyZWFzLmZpbmQocG9zaXRpb24gPT4gY2FsY3VsYXRlRGlzdGFuY2UocG9zWCwgcG9zWSwgcG9zaXRpb24ueCwgcG9zaXRpb24ueSkgPCBwcm94aW1pdHlMaW1pdCk7XG4gIGlmIChleGlzdGluZ0FyZWEpIHtcbiAgICBleGlzdGluZ0FyZWEuZmFpbENvdW50Kys7XG4gICAgZXhpc3RpbmdBcmVhLnRpbWUgPSBzdGF0ZS5jdXJyZW50VGltZTtcbiAgICBpZiAoZXhpc3RpbmdBcmVhLmZhaWxDb3VudCA+PSBtYXhGYWlsQ291bnQpIHtcbiAgICAgIGV4aXN0aW5nQXJlYS5za2lwcGVkID0gdHJ1ZTtcbiAgICAgIHNob3dOb3RpZmljYXRpb24oXCJTa2lwcGluZyB1bnJlYWNoYWJsZSBmb29kIGFyZWFcIik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHdpbmRvdy5hdXRvRmFybVNraXBBcmVhcy5wdXNoKHtcbiAgICAgIHg6IHBvc1gsXG4gICAgICB5OiBwb3NZLFxuICAgICAgcmFkaXVzOiBwcm94aW1pdHlMaW1pdCxcbiAgICAgIHRpbWU6IHN0YXRlLmN1cnJlbnRUaW1lLFxuICAgICAgZmFpbENvdW50OiAxLFxuICAgICAgc2tpcHBlZDogZmFsc2VcbiAgICB9KTtcbiAgfVxufVxuZnVuY3Rpb24gaXNBcmVhU2tpcHBlZCh4LCB5KSB7XG4gIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gIHdpbmRvdy5hdXRvRmFybVNraXBBcmVhcyA9IHdpbmRvdy5hdXRvRmFybVNraXBBcmVhcy5maWx0ZXIobGFzdFVwZGF0ZVRpbWUgPT4gbm93IC0gbGFzdFVwZGF0ZVRpbWUudGltZSA8IHRpbWVvdXREdXJhdGlvbik7XG4gIHJldHVybiB3aW5kb3cuYXV0b0Zhcm1Ta2lwQXJlYXMuc29tZShza2lwcGVkRWxlbWVudCA9PiBza2lwcGVkRWxlbWVudC5za2lwcGVkICYmIGNhbGN1bGF0ZURpc3RhbmNlKHgsIHksIHNraXBwZWRFbGVtZW50LngsIHNraXBwZWRFbGVtZW50LnkpIDwgc2tpcHBlZEVsZW1lbnQucmFkaXVzKTtcbn1cbmZ1bmN0aW9uIGZpbmRCZXN0Rm9vZENsdXN0ZXIocmFkaXVzLCByYW5nZU92ZXJyaWRlKSB7XG4gIGNvbnN0IGZvb2RQb2ludHMgPSBmaW5kRW50aXRpZXNJblJhbmdlKHJhbmdlT3ZlcnJpZGUgfHwgd2luZG93LmF1dG9GYXJtUmFuZ2UpO1xuICBpZiAoIWZvb2RQb2ludHMubGVuZ3RoKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgbGV0IGJlc3RDbHVzdGVyID0gbnVsbDtcbiAgbGV0IG1heENvdW50ID0gMDtcbiAgZm9vZFBvaW50cy5mb3JFYWNoKGNhbGN1bGF0ZUF2ZXJhZ2VQb3NpdGlvbiA9PiB7XG4gICAgbGV0IGVsZW1lbnRDb3VudCA9IDA7XG4gICAgbGV0IHRvdGFsWCA9IDA7XG4gICAgbGV0IHRvdGFsWSA9IDA7XG4gICAgZm9vZFBvaW50cy5mb3JFYWNoKHRhcmdldFBvc2l0aW9uID0+IHtcbiAgICAgIGlmIChjYWxjdWxhdGVEaXN0YW5jZShjYWxjdWxhdGVBdmVyYWdlUG9zaXRpb24ueCwgY2FsY3VsYXRlQXZlcmFnZVBvc2l0aW9uLnksIHRhcmdldFBvc2l0aW9uLngsIHRhcmdldFBvc2l0aW9uLnkpIDwgKHJhZGl1cyB8fCA1MDApKSB7XG4gICAgICAgIGVsZW1lbnRDb3VudCsrO1xuICAgICAgICB0b3RhbFggKz0gdGFyZ2V0UG9zaXRpb24ueDtcbiAgICAgICAgdG90YWxZICs9IHRhcmdldFBvc2l0aW9uLnk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKGVsZW1lbnRDb3VudCA+IG1heENvdW50KSB7XG4gICAgICBtYXhDb3VudCA9IGVsZW1lbnRDb3VudDtcbiAgICAgIGJlc3RDbHVzdGVyID0ge1xuICAgICAgICB4OiB0b3RhbFggLyBlbGVtZW50Q291bnQsXG4gICAgICAgIHk6IHRvdGFsWSAvIGVsZW1lbnRDb3VudCxcbiAgICAgICAgZm9vZENvdW50OiBlbGVtZW50Q291bnRcbiAgICAgIH07XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGJlc3RDbHVzdGVyO1xufVxubGV0IGxhc3RVcGRhdGVUaW1lc3RhbXAgPSAwO1xuZnVuY3Rpb24gdHJpZ2dlclJhbmRvbUV2b2x2ZSgpIHtcbiAgaWYgKCF3aW5kb3cuYXV0b0Zhcm1Fdm9sdmUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcbiAgaWYgKG5vdyAtIGxhc3RVcGRhdGVUaW1lc3RhbXAgPCA1MDAwKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGxhc3RVcGRhdGVUaW1lc3RhbXAgPSBub3c7XG4gIGNvbnN0IGdhbWVDYW52YXMgPSBnZXRHYW1lQ2FudmFzKCk7XG4gIGNvbnN0IHJhbmRvbURpZ2l0ID0gU3RyaW5nKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDkpICsgMSk7XG4gIGNvbnN0IGtleUV2ZW50RGF0YSA9IHtcbiAgICBrZXk6IHJhbmRvbURpZ2l0LFxuICAgIGNvZGU6IFwiRGlnaXRcIiArIHJhbmRvbURpZ2l0LFxuICAgIGtleUNvZGU6IHJhbmRvbURpZ2l0LmNoYXJDb2RlQXQoMCksXG4gICAgd2hpY2g6IHJhbmRvbURpZ2l0LmNoYXJDb2RlQXQoMCksXG4gICAgYnViYmxlczogdHJ1ZSxcbiAgICBjYW5jZWxhYmxlOiB0cnVlXG4gIH07XG4gIFt3aW5kb3csIGRvY3VtZW50LCBkb2N1bWVudC5ib2R5LCBnYW1lQ2FudmFzXS5mb3JFYWNoKHRhcmdldEVsZW1lbnQgPT4ge1xuICAgIGlmICghdGFyZ2V0RWxlbWVudCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0cnkge1xuICAgICAgdGFyZ2V0RWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBLZXlib2FyZEV2ZW50KFwia2V5ZG93blwiLCBrZXlFdmVudERhdGEpKTtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGFyZ2V0RWxlbWVudC5kaXNwYXRjaEV2ZW50KG5ldyBLZXlib2FyZEV2ZW50KFwia2V5dXBcIiwga2V5RXZlbnREYXRhKSksIDUwKTtcbiAgICB9IGNhdGNoIChjb250ZXh0KSB7fVxuICB9KTtcbn1cbmxldCBpc0F1dG9GYXJtQWN0aXZlID0gZmFsc2U7XG5sZXQgY3VycmVudFBvc2l0aW9uID0gbnVsbDtcbmxldCBjb3VudGVyID0gMDtcbmxldCBsYXN0UHJvY2Vzc2VkSW5kZXggPSAwO1xubGV0IHJhbmRvbUFuZ2xlID0gMDtcbmxldCBwb2ludGVyTW92ZU9mZnNldCA9IDA7XG5mdW5jdGlvbiBjaGVja1N0dWNrQ29uZGl0aW9uKGN1cnJlbnRQb3MpIHtcbiAgY29uc3QgY3VycmVudFRpbWUgPSBEYXRlLm5vdygpO1xuICBpZiAoc3RhdGUuY3VycmVudFRpbWUgLSBsYXN0UHJvY2Vzc2VkSW5kZXggPCAxNTAwKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGxhc3RQcm9jZXNzZWRJbmRleCA9IHN0YXRlLmN1cnJlbnRUaW1lO1xuICBpZiAoY3VycmVudFBvc2l0aW9uKSB7XG4gICAgaWYgKGNhbGN1bGF0ZURpc3RhbmNlKGN1cnJlbnRQb3MueCwgY3VycmVudFBvcy55LCBjdXJyZW50UG9zaXRpb24ueCwgY3VycmVudFBvc2l0aW9uLnkpIDwgMjUpIHtcbiAgICAgIGNvdW50ZXIrKztcbiAgICAgIGlmIChjb3VudGVyID49IDEgJiYgd2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldCkge1xuICAgICAgICBtYXJrQXJlYUFzRmFpbGVkKHdpbmRvdy5hdXRvRmFybUN1cnJlbnRUYXJnZXQueCwgd2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldC55KTtcbiAgICAgICAgd2luZG93LmF1dG9GYXJtU2tpcElkcy5hZGQod2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldC5pZCk7XG4gICAgICAgIHdpbmRvdy5hdXRvRmFybUN1cnJlbnRUYXJnZXQgPSBudWxsO1xuICAgICAgICB3aW5kb3cuYXV0b0Zhcm1UYXJnZXRTdGFydFRpbWUgPSAwO1xuICAgICAgICBjb3VudGVyID0gMDtcbiAgICAgIH1cbiAgICAgIGlmIChjb3VudGVyID49IDIpIHtcbiAgICAgICAgY291bnRlciA9IDA7XG4gICAgICAgIHdpbmRvdy5hdXRvRmFybUN1cnJlbnRUYXJnZXQgPSBudWxsO1xuICAgICAgICB3aW5kb3cuYXV0b0Zhcm1UYXJnZXRTdGFydFRpbWUgPSAwO1xuICAgICAgICBjb25zdCByYW5kb21BbmdsZSA9IE1hdGgucmFuZG9tKCkgKiBNYXRoLlBJICogMjtcbiAgICAgICAgbW92ZUFuZENsaWNrRWxlbWVudChjdXJyZW50UG9zLnggKyBNYXRoLmNvcyhyYW5kb21BbmdsZSkgKiAxNTAwLCBjdXJyZW50UG9zLnkgKyBNYXRoLnNpbihyYW5kb21BbmdsZSkgKiAxNTAwLCB0cnVlKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvdW50ZXIgPSAwO1xuICAgIH1cbiAgfVxuICBjdXJyZW50UG9zaXRpb24gPSB7XG4gICAgeDogY3VycmVudFBvcy54LFxuICAgIHk6IGN1cnJlbnRQb3MueVxuICB9O1xuICByZXR1cm4gZmFsc2U7XG59XG5mdW5jdGlvbiBzZXR1cFBhdHJvbFJvdXRlKCkge1xuICBjb25zdCBjZW50ZXJQb3MgPSBnZXRBbmltYWxQb3NpdGlvbigpO1xuICBpZiAoIWNlbnRlclBvcykge1xuICAgIHJldHVybjtcbiAgfVxuICB3aW5kb3cuYXV0b0Zhcm1QYXRyb2xQb2ludHMgPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCA2OyBpKyspIHtcbiAgICBjb25zdCBhbmdsZSA9IE1hdGguUEkgKiAyICogaSAvIDY7XG4gICAgd2luZG93LmF1dG9GYXJtUGF0cm9sUG9pbnRzLnB1c2goe1xuICAgICAgeDogY2VudGVyUG9zLnggKyBNYXRoLmNvcyhhbmdsZSkgKiAyMDAwLFxuICAgICAgeTogY2VudGVyUG9zLnkgKyBNYXRoLnNpbihhbmdsZSkgKiAyMDAwXG4gICAgfSk7XG4gIH1cbiAgd2luZG93LmF1dG9GYXJtUGF0cm9sSW5kZXggPSAwO1xufVxuZnVuY3Rpb24gYXV0b0Zhcm1Mb29wKCkge1xuICBpZiAoIXdpbmRvdy5hdXRvRmFybUFjdGl2ZSkge1xuICAgIGlzQXV0b0Zhcm1BY3RpdmUgPSBmYWxzZTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgY3VycmVudFRpbWUgPSBEYXRlLm5vdygpO1xuICBpZiAoc3RhdGUuY3VycmVudFRpbWUgLSB3aW5kb3cuYXV0b0Zhcm1Ta2lwQ2xlYXJUaW1lID4gMTUwMDApIHtcbiAgICB3aW5kb3cuYXV0b0Zhcm1Ta2lwSWRzLmNsZWFyKCk7XG4gICAgd2luZG93LmF1dG9GYXJtU2tpcENsZWFyVGltZSA9IHN0YXRlLmN1cnJlbnRUaW1lO1xuICB9XG4gIGlmICh3aW5kb3cuYXV0b0Zhcm1DdXJyZW50VGFyZ2V0ICYmIHdpbmRvdy5hdXRvRmFybVRhcmdldFN0YXJ0VGltZSA+IDAgJiYgc3RhdGUuY3VycmVudFRpbWUgLSB3aW5kb3cuYXV0b0Zhcm1UYXJnZXRTdGFydFRpbWUgPiAxMDAwKSB7XG4gICAgbWFya0FyZWFBc0ZhaWxlZCh3aW5kb3cuYXV0b0Zhcm1DdXJyZW50VGFyZ2V0LngsIHdpbmRvdy5hdXRvRmFybUN1cnJlbnRUYXJnZXQueSk7XG4gICAgd2luZG93LmF1dG9GYXJtU2tpcElkcy5hZGQod2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldC5pZCk7XG4gICAgd2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldCA9IG51bGw7XG4gICAgd2luZG93LmF1dG9GYXJtVGFyZ2V0U3RhcnRUaW1lID0gMDtcbiAgICBzZXRUaW1lb3V0KGF1dG9GYXJtTG9vcCwgMTAwKTtcbiAgICByZXR1cm47XG4gIH1cbiAgdHJ5IHtcbiAgICBjb25zdCBjdXJyZW50VGFyZ2V0ID0gZ2V0QW5pbWFsUG9zaXRpb24oKTtcbiAgICBpZiAoIWN1cnJlbnRUYXJnZXQpIHtcbiAgICAgIHdpbmRvdy5hdXRvRmFybUFjdGl2ZSA9IGZhbHNlO1xuICAgICAgaXNBdXRvRmFybUFjdGl2ZSA9IGZhbHNlO1xuICAgICAgY29uc3QgYXV0b0Zhcm1CdXR0b24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImF1dG9GYXJtQnRuXCIpO1xuICAgICAgaWYgKGF1dG9GYXJtQnV0dG9uKSB7XG4gICAgICAgIGF1dG9GYXJtQnV0dG9uLnRleHRDb250ZW50ID0gXCJBdXRvIEZhcm1cIjtcbiAgICAgICAgYXV0b0Zhcm1CdXR0b24uY2xhc3NMaXN0LnJlbW92ZShcInRvZ2dsZS1vblwiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKE1hdGgucmFuZG9tKCkgPCAwLjAxNSkge1xuICAgICAgdHJpZ2dlclJhbmRvbUV2b2x2ZSgpO1xuICAgIH1cbiAgICBpZiAoY2hlY2tTdHVja0NvbmRpdGlvbihjdXJyZW50VGFyZ2V0KSkge1xuICAgICAgc2V0VGltZW91dChhdXRvRmFybUxvb3AsIDEwMCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHBsYXllck9mZnNldCA9IGNhbGN1bGF0ZUF2b2lkYW5jZVZlY3RvcigpO1xuICAgIGlmICgoTWF0aC5hYnMocGxheWVyT2Zmc2V0LngpID4gMTAwIHx8IE1hdGguYWJzKHBsYXllck9mZnNldC55KSA+IDEwMCkgJiYgd2luZG93LmF1dG9GYXJtQXZvaWRQbGF5ZXJzKSB7XG4gICAgICBjb25zdCBzaG91bGRCb29zdCA9IHdpbmRvdy5hdXRvRmFybUJvb3N0ICYmIHN0YXRlLmN1cnJlbnRUaW1lIC0gbGFzdEV2ZW50VGltZXN0YW1wID4gZXZlbnRJbnRlcnZhbFRocmVzaG9sZDtcbiAgICAgIGlmIChzaG91bGRCb29zdCkge1xuICAgICAgICBsYXN0RXZlbnRUaW1lc3RhbXAgPSBzdGF0ZS5jdXJyZW50VGltZTtcbiAgICAgIH1cbiAgICAgIG1vdmVBbmRDbGlja0VsZW1lbnQoY3VycmVudFRhcmdldC54ICsgcGxheWVyT2Zmc2V0LngsIGN1cnJlbnRUYXJnZXQueSArIHBsYXllck9mZnNldC55LCBzaG91bGRCb29zdCk7XG4gICAgICBzZXRUaW1lb3V0KGF1dG9GYXJtTG9vcCwgNjApO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBsZXQgdGFyZ2V0WCA9IG51bGw7XG4gICAgbGV0IHRhcmdldFkgPSBudWxsO1xuICAgIGxldCBtaW5EaXN0YW5jZSA9IEluZmluaXR5O1xuICAgIGlmICh3aW5kb3cuYXV0b0Zhcm1Nb2RlID09PSBcIm5lYXJlc3RcIikge1xuICAgICAgY29uc3QgbmVhcmVzdFRhcmdldCA9IGZpbmROZWFyZXN0RW50aXR5KCk7XG4gICAgICBpZiAobmVhcmVzdFRhcmdldCkge1xuICAgICAgICB0YXJnZXRYID0gbmVhcmVzdFRhcmdldC54ICsgcGxheWVyT2Zmc2V0LnggKiAwLjM7XG4gICAgICAgIHRhcmdldFkgPSBuZWFyZXN0VGFyZ2V0LnkgKyBwbGF5ZXJPZmZzZXQueSAqIDAuMztcbiAgICAgICAgbWluRGlzdGFuY2UgPSBuZWFyZXN0VGFyZ2V0LmRpc3RhbmNlO1xuICAgICAgICBpZiAoIXdpbmRvdy5hdXRvRmFybUN1cnJlbnRUYXJnZXQgfHwgd2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldC5pZCAhPT0gbmVhcmVzdFRhcmdldC5pZCkge1xuICAgICAgICAgIGlmICh3aW5kb3cuYXV0b0Zhcm1DdXJyZW50VGFyZ2V0KSB7XG4gICAgICAgICAgICB3aW5kb3cuYXV0b0Zhcm1TdGF0cy5jb2xsZWN0ZWQrKztcbiAgICAgICAgICB9XG4gICAgICAgICAgd2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldCA9IG5lYXJlc3RUYXJnZXQ7XG4gICAgICAgICAgd2luZG93LmF1dG9GYXJtVGFyZ2V0U3RhcnRUaW1lID0gc3RhdGUuY3VycmVudFRpbWU7XG4gICAgICAgICAgY291bnRlciA9IDA7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKG5lYXJlc3RUYXJnZXQuZGlzdGFuY2UgPCA0MCkge1xuICAgICAgICAgIHRhcmdldFggKz0gKE1hdGgucmFuZG9tKCkgLSAwLjUpICogODA7XG4gICAgICAgICAgdGFyZ2V0WSArPSAoTWF0aC5yYW5kb20oKSAtIDAuNSkgKiA4MDtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldCA9IG51bGw7XG4gICAgICAgIHdpbmRvdy5hdXRvRmFybVRhcmdldFN0YXJ0VGltZSA9IDA7XG4gICAgICAgIGlmIChzdGF0ZS5jdXJyZW50VGltZSAtIHBvaW50ZXJNb3ZlT2Zmc2V0ID4gMjUwMCkge1xuICAgICAgICAgIHJhbmRvbUFuZ2xlID0gTWF0aC5yYW5kb20oKSAqIE1hdGguUEkgKiAyO1xuICAgICAgICAgIHBvaW50ZXJNb3ZlT2Zmc2V0ID0gc3RhdGUuY3VycmVudFRpbWU7XG4gICAgICAgIH1cbiAgICAgICAgdGFyZ2V0WCA9IGN1cnJlbnRUYXJnZXQueCArIE1hdGguY29zKHJhbmRvbUFuZ2xlKSAqIDEwMDA7XG4gICAgICAgIHRhcmdldFkgPSBjdXJyZW50VGFyZ2V0LnkgKyBNYXRoLnNpbihyYW5kb21BbmdsZSkgKiAxMDAwO1xuICAgICAgICBtaW5EaXN0YW5jZSA9IDEwMDA7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh3aW5kb3cuYXV0b0Zhcm1Nb2RlID09PSBcImNsdXN0ZXJcIikge1xuICAgICAgY29uc3QgbmVhcmJ5Rm9vZFNvdXJjZSA9IGZpbmRCZXN0Rm9vZENsdXN0ZXIoNTAwLCB3aW5kb3cuYXV0b0Zhcm1SYW5nZSk7XG4gICAgICBpZiAobmVhcmJ5Rm9vZFNvdXJjZSAmJiBuZWFyYnlGb29kU291cmNlLmZvb2RDb3VudCA+PSAyKSB7XG4gICAgICAgIHRhcmdldFggPSBuZWFyYnlGb29kU291cmNlLnggKyBwbGF5ZXJPZmZzZXQueCAqIDAuMztcbiAgICAgICAgdGFyZ2V0WSA9IG5lYXJieUZvb2RTb3VyY2UueSArIHBsYXllck9mZnNldC55ICogMC4zO1xuICAgICAgICBtaW5EaXN0YW5jZSA9IGNhbGN1bGF0ZURpc3RhbmNlKGN1cnJlbnRUYXJnZXQueCwgY3VycmVudFRhcmdldC55LCBuZWFyYnlGb29kU291cmNlLngsIG5lYXJieUZvb2RTb3VyY2UueSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCByYW5kb21UYXJnZXQgPSBmaW5kTmVhcmVzdEVudGl0eSgpO1xuICAgICAgICBpZiAocmFuZG9tVGFyZ2V0KSB7XG4gICAgICAgICAgdGFyZ2V0WCA9IHJhbmRvbVRhcmdldC54O1xuICAgICAgICAgIHRhcmdldFkgPSByYW5kb21UYXJnZXQueTtcbiAgICAgICAgICBtaW5EaXN0YW5jZSA9IHJhbmRvbVRhcmdldC5kaXN0YW5jZTtcbiAgICAgICAgICBpZiAoIXdpbmRvdy5hdXRvRmFybUN1cnJlbnRUYXJnZXQgfHwgd2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldC5pZCAhPT0gcmFuZG9tVGFyZ2V0LmlkKSB7XG4gICAgICAgICAgICB3aW5kb3cuYXV0b0Zhcm1DdXJyZW50VGFyZ2V0ID0gcmFuZG9tVGFyZ2V0O1xuICAgICAgICAgICAgd2luZG93LmF1dG9GYXJtVGFyZ2V0U3RhcnRUaW1lID0gc3RhdGUuY3VycmVudFRpbWU7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdpbmRvdy5hdXRvRmFybUN1cnJlbnRUYXJnZXQgPSBudWxsO1xuICAgICAgICAgIHdpbmRvdy5hdXRvRmFybVRhcmdldFN0YXJ0VGltZSA9IDA7XG4gICAgICAgICAgaWYgKHN0YXRlLmN1cnJlbnRUaW1lIC0gcG9pbnRlck1vdmVPZmZzZXQgPiAyNTAwKSB7XG4gICAgICAgICAgICByYW5kb21BbmdsZSA9IE1hdGgucmFuZG9tKCkgKiBNYXRoLlBJICogMjtcbiAgICAgICAgICAgIHBvaW50ZXJNb3ZlT2Zmc2V0ID0gc3RhdGUuY3VycmVudFRpbWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRhcmdldFggPSBjdXJyZW50VGFyZ2V0LnggKyBNYXRoLmNvcyhyYW5kb21BbmdsZSkgKiAxMDAwO1xuICAgICAgICAgIHRhcmdldFkgPSBjdXJyZW50VGFyZ2V0LnkgKyBNYXRoLnNpbihyYW5kb21BbmdsZSkgKiAxMDAwO1xuICAgICAgICAgIG1pbkRpc3RhbmNlID0gMTAwMDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAod2luZG93LmF1dG9GYXJtTW9kZSA9PT0gXCJwYXRyb2xcIikge1xuICAgICAgaWYgKCF3aW5kb3cuYXV0b0Zhcm1QYXRyb2xQb2ludHMubGVuZ3RoKSB7XG4gICAgICAgIHNldHVwUGF0cm9sUm91dGUoKTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNwZWNpZmljVGFyZ2V0ID0gZmluZE5lYXJlc3RFbnRpdHkoODAwKTtcbiAgICAgIGlmIChzcGVjaWZpY1RhcmdldCkge1xuICAgICAgICB0YXJnZXRYID0gc3BlY2lmaWNUYXJnZXQueDtcbiAgICAgICAgdGFyZ2V0WSA9IHNwZWNpZmljVGFyZ2V0Lnk7XG4gICAgICAgIG1pbkRpc3RhbmNlID0gc3BlY2lmaWNUYXJnZXQuZGlzdGFuY2U7XG4gICAgICAgIGlmICghd2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldCB8fCB3aW5kb3cuYXV0b0Zhcm1DdXJyZW50VGFyZ2V0LmlkICE9PSBzcGVjaWZpY1RhcmdldC5pZCkge1xuICAgICAgICAgIHdpbmRvdy5hdXRvRmFybUN1cnJlbnRUYXJnZXQgPSBzcGVjaWZpY1RhcmdldDtcbiAgICAgICAgICB3aW5kb3cuYXV0b0Zhcm1UYXJnZXRTdGFydFRpbWUgPSBzdGF0ZS5jdXJyZW50VGltZTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd2luZG93LmF1dG9GYXJtQ3VycmVudFRhcmdldCA9IG51bGw7XG4gICAgICAgIHdpbmRvdy5hdXRvRmFybVRhcmdldFN0YXJ0VGltZSA9IDA7XG4gICAgICAgIGNvbnN0IGN1cnJlbnRQYXRyb2xQb2ludCA9IHdpbmRvdy5hdXRvRmFybVBhdHJvbFBvaW50c1t3aW5kb3cuYXV0b0Zhcm1QYXRyb2xJbmRleF07XG4gICAgICAgIGlmIChjdXJyZW50UGF0cm9sUG9pbnQpIHtcbiAgICAgICAgICBtaW5EaXN0YW5jZSA9IGNhbGN1bGF0ZURpc3RhbmNlKGN1cnJlbnRUYXJnZXQueCwgY3VycmVudFRhcmdldC55LCBjdXJyZW50UGF0cm9sUG9pbnQueCwgY3VycmVudFBhdHJvbFBvaW50LnkpO1xuICAgICAgICAgIGlmIChtaW5EaXN0YW5jZSA8IDIwMCkge1xuICAgICAgICAgICAgd2luZG93LmF1dG9GYXJtUGF0cm9sSW5kZXggPSAod2luZG93LmF1dG9GYXJtUGF0cm9sSW5kZXggKyAxKSAlIHdpbmRvdy5hdXRvRmFybVBhdHJvbFBvaW50cy5sZW5ndGg7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRhcmdldFggPSBjdXJyZW50UGF0cm9sUG9pbnQueDtcbiAgICAgICAgICB0YXJnZXRZID0gY3VycmVudFBhdHJvbFBvaW50Lnk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHRhcmdldFggIT0gbnVsbCkge1xuICAgICAgY29uc3Qgc2hvdWxkQXBwbHlCb29zdCA9IHdpbmRvdy5hdXRvRmFybUJvb3N0ICYmIG1pbkRpc3RhbmNlID4gMzUwICYmIHN0YXRlLmN1cnJlbnRUaW1lIC0gbGFzdEV2ZW50VGltZXN0YW1wID4gZXZlbnRJbnRlcnZhbFRocmVzaG9sZDtcbiAgICAgIGlmIChzaG91bGRBcHBseUJvb3N0KSB7XG4gICAgICAgIGxhc3RFdmVudFRpbWVzdGFtcCA9IHN0YXRlLmN1cnJlbnRUaW1lO1xuICAgICAgfVxuICAgICAgbW92ZUFuZENsaWNrRWxlbWVudCh0YXJnZXRYLCB0YXJnZXRZLCBzaG91bGRBcHBseUJvb3N0KTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycm9yTWVzc2FnZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJbQXV0b0Zhcm1dXCIsIGVycm9yTWVzc2FnZSk7XG4gIH1cbiAgc2V0VGltZW91dChhdXRvRmFybUxvb3AsIDYwKTtcbn1cbmZ1bmN0aW9uIHN0YXJ0QXV0b0Zhcm0oZmFybU1vZGUpIHtcbiAgd2luZG93LmF1dG9GYXJtTW9kZSA9IGZhcm1Nb2RlIHx8IFwibmVhcmVzdFwiO1xuICB3aW5kb3cuYXV0b0Zhcm1BY3RpdmUgPSB0cnVlO1xuICB3aW5kb3cuYXV0b0Zhcm1TdGF0cy5zdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuICB3aW5kb3cuYXV0b0Zhcm1TdGF0cy5jb2xsZWN0ZWQgPSAwO1xuICB3aW5kb3cuYXV0b0Zhcm1DdXJyZW50VGFyZ2V0ID0gbnVsbDtcbiAgd2luZG93LmF1dG9GYXJtVGFyZ2V0U3RhcnRUaW1lID0gMDtcbiAgd2luZG93LmF1dG9GYXJtU2tpcElkcy5jbGVhcigpO1xuICB3aW5kb3cuYXV0b0Zhcm1Ta2lwQXJlYXMgPSBbXTtcbiAgd2luZG93LmF1dG9GYXJtU2tpcENsZWFyVGltZSA9IERhdGUubm93KCk7XG4gIGN1cnJlbnRQb3NpdGlvbiA9IG51bGw7XG4gIGNvdW50ZXIgPSAwO1xuICBsYXN0UHJvY2Vzc2VkSW5kZXggPSAwO1xuICBsYXN0RXZlbnRUaW1lc3RhbXAgPSAwO1xuICBpZiAoZmFybU1vZGUgPT09IFwicGF0cm9sXCIpIHtcbiAgICBzZXR1cFBhdHJvbFJvdXRlKCk7XG4gIH1cbiAgc2hvd05vdGlmaWNhdGlvbihcIkF1dG8gZmFybSBzdGFydGVkIChcIiArIHdpbmRvdy5hdXRvRmFybU1vZGUgKyBcIilcIik7XG4gIGlmICghaXNBdXRvRmFybUFjdGl2ZSkge1xuICAgIGlzQXV0b0Zhcm1BY3RpdmUgPSB0cnVlO1xuICAgIGF1dG9GYXJtTG9vcCgpO1xuICB9XG59XG5mdW5jdGlvbiBzdG9wQXV0b0Zhcm0oKSB7XG4gIHdpbmRvdy5hdXRvRmFybUFjdGl2ZSA9IGZhbHNlO1xuICBpc0F1dG9GYXJtQWN0aXZlID0gZmFsc2U7XG4gIHNob3dOb3RpZmljYXRpb24oXCJGYXJtIHN0b3BwZWQuIH5cIiArIHdpbmRvdy5hdXRvRmFybVN0YXRzLmNvbGxlY3RlZCArIFwiIGZvb2QgaW4gXCIgKyAoKERhdGUubm93KCkgLSB3aW5kb3cuYXV0b0Zhcm1TdGF0cy5zdGFydFRpbWUpIC8gMTAwMCkudG9GaXhlZCgwKSArIFwic1wiKTtcbn1cbmZ1bmN0aW9uIHRvZ2dsZU1pbmltYXBTaXplKCkge1xuICBpZiAoIXN0YXRlLmFuaW1hbERhdGEgfHwgIXN0YXRlLmFuaW1hbERhdGEubWluaW1hcCkge1xuICAgIHNob3dOb3RpZmljYXRpb24oXCJNaW5pbWFwIG5vdCBhdmFpbGFibGVcIik7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChzdGF0ZS5pc01pbmltYXBTbWFsbCkge1xuICAgIHN0YXRlLmFuaW1hbERhdGEubWluaW1hcC5zY2FsZS5zZXQoMSk7XG4gICAgc3RhdGUuYW5pbWFsRGF0YS5taW5pbWFwLnBpdm90LnNldCgwLCAwKTtcbiAgICBzdGF0ZS5pc01pbmltYXBTbWFsbCA9IGZhbHNlO1xuICAgIHNob3dOb3RpZmljYXRpb24oXCJNaW5pbWFwIHJlc3RvcmVkXCIpO1xuICB9IGVsc2Uge1xuICAgIHN0YXRlLmFuaW1hbERhdGEubWluaW1hcC5zY2FsZS5zZXQoMC41KTtcbiAgICBzdGF0ZS5hbmltYWxEYXRhLm1pbmltYXAucGl2b3Quc2V0KC03MCwgLTQ1KTtcbiAgICBzdGF0ZS5pc01pbmltYXBTbWFsbCA9IHRydWU7XG4gICAgc2hvd05vdGlmaWNhdGlvbihcIlNtYWxsIG1pbmltYXAgZW5hYmxlZFwiKTtcbiAgfVxufVxud2luZG93LmF1dG9GYXJtQWN0aXZlID0gZmFsc2U7XG53aW5kb3cuYXV0b0Zhcm1Nb2RlID0gXCJuZWFyZXN0XCI7XG53aW5kb3cuYXV0b0Zhcm1SYW5nZSA9IDMwMDA7XG53aW5kb3cuYXV0b0Zhcm1Cb29zdCA9IHRydWU7XG53aW5kb3cuYXV0b0Zhcm1Fdm9sdmUgPSB0cnVlO1xud2luZG93LmF1dG9GYXJtQXZvaWRQbGF5ZXJzID0gdHJ1ZTtcbndpbmRvdy5hdXRvRmFybUF2b2lkRGlzdGFuY2UgPSA4MDA7XG53aW5kb3cuYXV0b0Zhcm1TdGF0cyA9IHtcbiAgY29sbGVjdGVkOiAwLFxuICBzdGFydFRpbWU6IDBcbn07XG53aW5kb3cuYXV0b0Zhcm1QYXRyb2xQb2ludHMgPSBbXTtcbndpbmRvdy5hdXRvRmFybVBhdHJvbEluZGV4ID0gMDtcbndpbmRvdy5hdXRvRmFybUN1cnJlbnRUYXJnZXQgPSBudWxsO1xud2luZG93LmF1dG9GYXJtVGFyZ2V0U3RhcnRUaW1lID0gMDtcbndpbmRvdy5hdXRvRmFybVNraXBJZHMgPSBuZXcgU2V0KCk7XG53aW5kb3cuYXV0b0Zhcm1Ta2lwQ2xlYXJUaW1lID0gMDtcbndpbmRvdy5hdXRvRmFybVNraXBBcmVhcyA9IFtdO1xuXG5leHBvcnQgeyBnZXRHYW1lU3RhdGUsIGZpbmRFbnRpdHlCeUlkLCBtYXJrQXJlYUFzRmFpbGVkLCBpc0FyZWFTa2lwcGVkLCBmaW5kQmVzdEZvb2RDbHVzdGVyLCB0cmlnZ2VyUmFuZG9tRXZvbHZlLCBjaGVja1N0dWNrQ29uZGl0aW9uLCBzZXR1cFBhdHJvbFJvdXRlLCBhdXRvRmFybUxvb3AsIHN0YXJ0QXV0b0Zhcm0sIHN0b3BBdXRvRmFybSwgdG9nZ2xlTWluaW1hcFNpemUgfTtcbiIsIlxuZnVuY3Rpb24gYXBwbHlUaGVtZSh0aGVtZU5hbWUpIHtcbiAgY29uc3Qgcm9vdEVsZW1lbnQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIGNvbnN0IHNhdmVkVGhlbWVzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImN1c3RvbVRoZW1lc1wiKSB8fCBcInt9XCIpO1xuICBjb25zdCB0aGVtZURlZmluaXRpb25zID0ge1xuICAgIGdyZXk6IHtcbiAgICAgIGFjYzogXCIjODg4ODg4XCIsXG4gICAgICBhY2NIOiBcIiNhYWFhYWFcIixcbiAgICAgIGFjY1JHQjogXCIxMzYsMTM2LDEzNlwiLFxuICAgICAgdGV4dDogXCIjZTBlMGUwXCIsXG4gICAgICB0ZXh0U2VjOiBcIiM4ODhcIixcbiAgICAgIGJnMTogXCIjMWExYTFhXCIsXG4gICAgICBiZzI6IFwiIzI0MjQyNFwiLFxuICAgICAgYmczOiBcIiMyYTJhMmFcIixcbiAgICAgIGJvcmRlcjogXCIjMzMzXCIsXG4gICAgICBob3ZlcjogXCIjMmUyZTJlXCJcbiAgICB9LFxuICAgIGJsdWU6IHtcbiAgICAgIGFjYzogXCIjNGZjM2Y3XCIsXG4gICAgICBhY2NIOiBcIiM4MWQ0ZmFcIixcbiAgICAgIGFjY1JHQjogXCI3OSwxOTUsMjQ3XCIsXG4gICAgICB0ZXh0OiBcIiNlMGUwZTBcIixcbiAgICAgIHRleHRTZWM6IFwiIzg4OFwiLFxuICAgICAgYmcxOiBcIiMxYTFhMWFcIixcbiAgICAgIGJnMjogXCIjMjQyNDI0XCIsXG4gICAgICBiZzM6IFwiIzJhMmEyYVwiLFxuICAgICAgYm9yZGVyOiBcIiMzMzNcIixcbiAgICAgIGhvdmVyOiBcIiMyZTJlMmVcIlxuICAgIH0sXG4gICAgcmVkOiB7XG4gICAgICBhY2M6IFwiI2VmNTM1MFwiLFxuICAgICAgYWNjSDogXCIjZTU3MzczXCIsXG4gICAgICBhY2NSR0I6IFwiMjM5LDgzLDgwXCIsXG4gICAgICB0ZXh0OiBcIiNlMGUwZTBcIixcbiAgICAgIHRleHRTZWM6IFwiIzg4OFwiLFxuICAgICAgYmcxOiBcIiMxYTFhMWFcIixcbiAgICAgIGJnMjogXCIjMjQyNDI0XCIsXG4gICAgICBiZzM6IFwiIzJhMmEyYVwiLFxuICAgICAgYm9yZGVyOiBcIiMzMzNcIixcbiAgICAgIGhvdmVyOiBcIiMyZTJlMmVcIlxuICAgIH0sXG4gICAgZ3JlZW46IHtcbiAgICAgIGFjYzogXCIjNjZiYjZhXCIsXG4gICAgICBhY2NIOiBcIiM4MWM3ODRcIixcbiAgICAgIGFjY1JHQjogXCIxMDIsMTg3LDEwNlwiLFxuICAgICAgdGV4dDogXCIjZTBlMGUwXCIsXG4gICAgICB0ZXh0U2VjOiBcIiM4ODhcIixcbiAgICAgIGJnMTogXCIjMWExYTFhXCIsXG4gICAgICBiZzI6IFwiIzI0MjQyNFwiLFxuICAgICAgYmczOiBcIiMyYTJhMmFcIixcbiAgICAgIGJvcmRlcjogXCIjMzMzXCIsXG4gICAgICBob3ZlcjogXCIjMmUyZTJlXCJcbiAgICB9LFxuICAgIHBpbms6IHtcbiAgICAgIGFjYzogXCIjZjA2MjkyXCIsXG4gICAgICBhY2NIOiBcIiNmNDhmYjFcIixcbiAgICAgIGFjY1JHQjogXCIyNDAsOTgsMTQ2XCIsXG4gICAgICB0ZXh0OiBcIiNlMGUwZTBcIixcbiAgICAgIHRleHRTZWM6IFwiIzg4OFwiLFxuICAgICAgYmcxOiBcIiMxYTFhMWFcIixcbiAgICAgIGJnMjogXCIjMjQyNDI0XCIsXG4gICAgICBiZzM6IFwiIzJhMmEyYVwiLFxuICAgICAgYm9yZGVyOiBcIiMzMzNcIixcbiAgICAgIGhvdmVyOiBcIiMyZTJlMmVcIlxuICAgIH0sXG4gICAgc3RhcndhcnM6IHtcbiAgICAgIGFjYzogXCIjZmZkNzQwXCIsXG4gICAgICBhY2NIOiBcIiNmZmUwODJcIixcbiAgICAgIGFjY1JHQjogXCIyNTUsMjE1LDY0XCIsXG4gICAgICB0ZXh0OiBcIiNlMGUwZTBcIixcbiAgICAgIHRleHRTZWM6IFwiIzg4OFwiLFxuICAgICAgYmcxOiBcIiMxYTFhMWFcIixcbiAgICAgIGJnMjogXCIjMjQyNDI0XCIsXG4gICAgICBiZzM6IFwiIzJhMmEyYVwiLFxuICAgICAgYm9yZGVyOiBcIiMzMzNcIixcbiAgICAgIGhvdmVyOiBcIiMyZTJlMmVcIlxuICAgIH0sXG4gICAga2ZjOiB7XG4gICAgICBhY2M6IFwiI2Y0NDMzNlwiLFxuICAgICAgYWNjSDogXCIjZTU3MzczXCIsXG4gICAgICBhY2NSR0I6IFwiMjQ0LDY3LDU0XCIsXG4gICAgICB0ZXh0OiBcIiNlMGUwZTBcIixcbiAgICAgIHRleHRTZWM6IFwiIzg4OFwiLFxuICAgICAgYmcxOiBcIiMxYTFhMWFcIixcbiAgICAgIGJnMjogXCIjMjQyNDI0XCIsXG4gICAgICBiZzM6IFwiIzJhMmEyYVwiLFxuICAgICAgYm9yZGVyOiBcIiMzMzNcIixcbiAgICAgIGhvdmVyOiBcIiMyZTJlMmVcIlxuICAgIH0sXG4gICAgaGFsbG93ZWVuOiB7XG4gICAgICBhY2M6IFwiI2ZmNjYwMFwiLFxuICAgICAgYWNjSDogXCIjZmY4ODMzXCIsXG4gICAgICBhY2NSR0I6IFwiMjU1LDEwMiwwXCIsXG4gICAgICB0ZXh0OiBcIiNlMGUwZTBcIixcbiAgICAgIHRleHRTZWM6IFwiIzg4OFwiLFxuICAgICAgYmcxOiBcIiMxYTFhMWFcIixcbiAgICAgIGJnMjogXCIjMjQyNDI0XCIsXG4gICAgICBiZzM6IFwiIzJhMmEyYVwiLFxuICAgICAgYm9yZGVyOiBcIiMzMzNcIixcbiAgICAgIGhvdmVyOiBcIiMyZTJlMmVcIlxuICAgIH0sXG4gICAgLi4uc2F2ZWRUaGVtZXNcbiAgfTtcbiAgY29uc3QgdGhlbWVDb2xvciA9IHRoZW1lRGVmaW5pdGlvbnNbdGhlbWVOYW1lXSA/IHRoZW1lTmFtZSA6IFwiZ3JleVwiO1xuICBjb25zdCB0aGVtZVZhbHVlID0gdGhlbWVEZWZpbml0aW9uc1t0aGVtZUNvbG9yXTtcbiAgT2JqZWN0LmVudHJpZXMoe1xuICAgIFwiLS1hY2NcIjogdGhlbWVWYWx1ZS5hY2MsXG4gICAgXCItLWFjYy1oXCI6IHRoZW1lVmFsdWUuYWNjSCxcbiAgICBcIi0tYWNjLXJnYlwiOiB0aGVtZVZhbHVlLmFjY1JHQixcbiAgICBcIi0tdGV4dFwiOiB0aGVtZVZhbHVlLnRleHQsXG4gICAgXCItLXRleHQtc2VjXCI6IHRoZW1lVmFsdWUudGV4dFNlYyxcbiAgICBcIi0tYmcxXCI6IHRoZW1lVmFsdWUuYmcxLFxuICAgIFwiLS1iZzJcIjogdGhlbWVWYWx1ZS5iZzIsXG4gICAgXCItLWJnM1wiOiB0aGVtZVZhbHVlLmJnMyxcbiAgICBcIi0tYmRyXCI6IHRoZW1lVmFsdWUuYm9yZGVyLFxuICAgIFwiLS1odnJcIjogdGhlbWVWYWx1ZS5ob3ZlclxuICB9KS5mb3JFYWNoKChbY3NzUHJvcGVydHlOYW1lLCBjc3NQcm9wZXJ0eVZhbHVlXSkgPT4gcm9vdEVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkoY3NzUHJvcGVydHlOYW1lLCBjc3NQcm9wZXJ0eVZhbHVlKSk7XG4gIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwidGhlbWVcIiwgdGhlbWVDb2xvcik7XG59XG5mdW5jdGlvbiBpbml0QmFja2dyb3VuZEltYWdlKCkge1xuICBjb25zdCBiYWNrZ3JvdW5kSW1hZ2VVcmwgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImJnVXJsXCIpIHx8IFwiXCI7XG4gIGlmICghYmFja2dyb3VuZEltYWdlVXJsKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHVwZGF0ZUJhY2tncm91bmRJbWFnZSA9ICgpID0+IHtcbiAgICBjb25zdCBob21lQmFja2dyb3VuZEVsZW1lbnQgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLmhvbWUtYmdcIik7XG4gICAgaWYgKGhvbWVCYWNrZ3JvdW5kRWxlbWVudCkge1xuICAgICAgaG9tZUJhY2tncm91bmRFbGVtZW50LnN0eWxlLnNldFByb3BlcnR5KFwiYmFja2dyb3VuZC1pbWFnZVwiLCBcInVybChcXFwiXCIgKyBiYWNrZ3JvdW5kSW1hZ2VVcmwgKyBcIlxcXCIpXCIsIFwiaW1wb3J0YW50XCIpO1xuICAgIH1cbiAgfTtcbiAgaWYgKCFkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiLmhvbWUtYmdcIikpIHtcbiAgICBjb25zdCBiZ0NoZWNrSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICBpZiAoZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcIi5ob21lLWJnXCIpKSB7XG4gICAgICAgIGNsZWFySW50ZXJ2YWwoYmdDaGVja0ludGVydmFsKTtcbiAgICAgICAgdXBkYXRlQmFja2dyb3VuZEltYWdlKCk7XG4gICAgICB9XG4gICAgfSwgMTAwKTtcbiAgfSBlbHNlIHtcbiAgICB1cGRhdGVCYWNrZ3JvdW5kSW1hZ2UoKTtcbiAgfVxufVxuZnVuY3Rpb24gaW5qZWN0U3R5bGVzKCkge1xuICBjb25zdCBzdHlsZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3R5bGVcIik7XG4gIHN0eWxlRWxlbWVudC50ZXh0Q29udGVudCA9IFwiXFxuICAgICAgLmFzdC1wYW5lbHtmb250LWZhbWlseTonU2Vnb2UgVUknLHN5c3RlbS11aSxzYW5zLXNlcmlmO2JhY2tncm91bmQ6dmFyKC0tYmcxLCMxYTFhMWEpO2NvbG9yOnZhcigtLXRleHQsI2UwZTBlMCk7Ym9yZGVyLXJhZGl1czo2cHg7cG9zaXRpb246Zml4ZWQ7ei1pbmRleDo5OTk5OTt1c2VyLXNlbGVjdDpub25lO2N1cnNvcjptb3ZlO2ZvbnQtc2l6ZToxM3B4O21pbi13aWR0aDoyMjBweDtvdmVyZmxvdzpoaWRkZW47fVxcbiAgICAgIC5hc3QtaGVhZGVye2JhY2tncm91bmQ6dmFyKC0taGVhZGVyLWJnLHZhcigtLWJnMiwjMjQyNDI0KSk7cGFkZGluZzoxMHB4IDE0cHg7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2Vlbjtib3JkZXItYm90dG9tOjFweCBzb2xpZCB2YXIoLS1iZHIsIzMzMyk7fVxcbiAgICAgIC5hc3QtaGVhZGVyLXRpdGxle2ZvbnQtc2l6ZToxMnB4O2ZvbnQtd2VpZ2h0OjcwMDtsZXR0ZXItc3BhY2luZzoxLjVweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7Y29sb3I6dmFyKC0taGVhZGVyLXRpdGxlLHZhcigtLWFjYywjODg4KSk7fVxcbiAgICAgIC5hc3QtaGVhZGVyLW1pbntiYWNrZ3JvdW5kOm5vbmU7Ym9yZGVyOm5vbmU7Y29sb3I6dmFyKC0tdGV4dC1zZWMsIzg4OCk7Zm9udC1zaXplOjE2cHg7Y3Vyc29yOnBvaW50ZXI7cGFkZGluZzowIDRweDtsaW5lLWhlaWdodDoxO31cXG4gICAgICAuYXN0LWhlYWRlci1taW46aG92ZXJ7Y29sb3I6dmFyKC0tdGV4dCwjZTBlMGUwKTt9XFxuICAgICAgLmFzdC1ib2R5e3BhZGRpbmc6OHB4IDEycHggMTJweCAxMnB4O31cXG4gICAgICAuYXN0LXNlY3Rpb24tbGFiZWx7Zm9udC1zaXplOjEwcHg7Zm9udC13ZWlnaHQ6NjAwO2xldHRlci1zcGFjaW5nOjFweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7Y29sb3I6dmFyKC0tc2VjdGlvbi1sYWJlbCx2YXIoLS10ZXh0LXNlYywjODg4KSk7cGFkZGluZzo4cHggMCA0cHggMnB4O2Rpc3BsYXk6YmxvY2s7fVxcbiAgICAgIC5hc3QtYnRue2Rpc3BsYXk6YmxvY2s7d2lkdGg6MTAwJTtiYWNrZ3JvdW5kOnZhcigtLWJ0bi1iZyx2YXIoLS1iZzIsIzI0MjQyNCkpO2NvbG9yOnZhcigtLWJ0bi10ZXh0LHZhcigtLXRleHQsI2UwZTBlMCkpO2JvcmRlcjpub25lO2JvcmRlci1yYWRpdXM6NHB4O3BhZGRpbmc6OHB4IDEwcHg7Zm9udC1zaXplOjEycHg7Zm9udC13ZWlnaHQ6NTAwO2N1cnNvcjpwb2ludGVyO3RleHQtYWxpZ246bGVmdDt0cmFuc2l0aW9uOmJhY2tncm91bmQgLjEyczttYXJnaW4tYm90dG9tOjNweDtmb250LWZhbWlseTppbmhlcml0O3Bvc2l0aW9uOnJlbGF0aXZlO31cXG4gICAgICAuYXN0LWJ0bjpob3Zlcjpub3QoOmRpc2FibGVkKXtiYWNrZ3JvdW5kOnZhcigtLWJ0bi1ob3Zlcix2YXIoLS1odnIsIzJlMmUyZSkpO31cXG4gICAgICAuYXN0LWJ0bjpkaXNhYmxlZHtvcGFjaXR5Oi4zNTtjdXJzb3I6bm90LWFsbG93ZWQ7fVxcbiAgICAgIC5hc3QtYnRuLnRvZ2dsZS1vbntjb2xvcjp2YXIoLS1hY2MsIzg4OCk7fVxcbiAgICAgIC5hc3QtYnRuLnRvZ2dsZS1vbjo6YmVmb3Jle2NvbnRlbnQ6Jyc7cG9zaXRpb246YWJzb2x1dGU7bGVmdDowO3RvcDo0cHg7Ym90dG9tOjRweDt3aWR0aDoycHg7YmFja2dyb3VuZDp2YXIoLS1hY2MsIzg4OCk7Ym9yZGVyLXJhZGl1czoxcHg7fVxcbiAgICAgIC5hc3QtYnRuLnBhdGNoZWR7b3BhY2l0eTouMjU7dGV4dC1kZWNvcmF0aW9uOmxpbmUtdGhyb3VnaDtjdXJzb3I6bm90LWFsbG93ZWQ7fVxcbiAgICAgIC5hc3QtdG9nZ2xlLXJvd3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO3BhZGRpbmc6NXB4IDJweDtmb250LXNpemU6MTJweDt9XFxuICAgICAgLmFzdC10b2dnbGUtcm93IGxhYmVse2NvbG9yOnZhcigtLXRleHQsI2UwZTBlMCk7Y3Vyc29yOnBvaW50ZXI7fVxcbiAgICAgIC5hc3Qtc3dpdGNoe3Bvc2l0aW9uOnJlbGF0aXZlO3dpZHRoOjMycHg7aGVpZ2h0OjE4cHg7ZmxleC1zaHJpbms6MDt9XFxuICAgICAgLmFzdC1zd2l0Y2ggaW5wdXR7b3BhY2l0eTowO3dpZHRoOjA7aGVpZ2h0OjA7cG9zaXRpb246YWJzb2x1dGU7fVxcbiAgICAgIC5hc3Qtc3dpdGNoIC5zbGlkZXJ7cG9zaXRpb246YWJzb2x1dGU7Y3Vyc29yOnBvaW50ZXI7dG9wOjA7bGVmdDowO3JpZ2h0OjA7Ym90dG9tOjA7YmFja2dyb3VuZDp2YXIoLS1zd2l0Y2gtYmcsIzMzMyk7Ym9yZGVyLXJhZGl1czo5cHg7dHJhbnNpdGlvbjpiYWNrZ3JvdW5kIC4yczt9XFxuICAgICAgLmFzdC1zd2l0Y2ggLnNsaWRlcjo6YmVmb3Jle2NvbnRlbnQ6Jyc7cG9zaXRpb246YWJzb2x1dGU7aGVpZ2h0OjE0cHg7d2lkdGg6MTRweDtsZWZ0OjJweDtib3R0b206MnB4O2JhY2tncm91bmQ6dmFyKC0tc3dpdGNoLWtub2IsIzg4OCk7Ym9yZGVyLXJhZGl1czo1MCU7dHJhbnNpdGlvbjp0cmFuc2Zvcm0gLjJzLGJhY2tncm91bmQgLjJzO31cXG4gICAgICAuYXN0LXN3aXRjaCBpbnB1dDpjaGVja2VkKy5zbGlkZXJ7YmFja2dyb3VuZDp2YXIoLS1zd2l0Y2gtYWN0aXZlLWJnLHJnYmEodmFyKC0tYWNjLXJnYiwxMzYsMTM2LDEzNiksLjMpKTt9XFxuICAgICAgLmFzdC1zd2l0Y2ggaW5wdXQ6Y2hlY2tlZCsuc2xpZGVyOjpiZWZvcmV7dHJhbnNmb3JtOnRyYW5zbGF0ZVgoMTRweCk7YmFja2dyb3VuZDp2YXIoLS1hY2MsIzg4OCk7fVxcbiAgICAgIC5hc3Qtc2VsZWN0e3dpZHRoOjEwMCU7YmFja2dyb3VuZDp2YXIoLS1pbnB1dC1iZyx2YXIoLS1iZzIsIzI0MjQyNCkpO2NvbG9yOnZhcigtLWlucHV0LXRleHQsdmFyKC0tdGV4dCwjZTBlMGUwKSk7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1pbnB1dC1ib3JkZXIsdmFyKC0tYmRyLCMzMzMpKTtib3JkZXItcmFkaXVzOjRweDtwYWRkaW5nOjZweCA4cHg7Zm9udC1zaXplOjEycHg7Y3Vyc29yOnBvaW50ZXI7b3V0bGluZTpub25lO2ZvbnQtZmFtaWx5OmluaGVyaXQ7bWFyZ2luLWJvdHRvbTozcHg7YXBwZWFyYW5jZTpub25lO31cXG4gICAgICAuYXN0LXNlbGVjdDpmb2N1c3tib3JkZXItY29sb3I6dmFyKC0tYWNjLCM4ODgpO31cXG4gICAgICAuYXN0LWlucHV0e2JhY2tncm91bmQ6dmFyKC0taW5wdXQtYmcsdmFyKC0tYmcyLCMyNDI0MjQpKTtjb2xvcjp2YXIoLS1pbnB1dC10ZXh0LHZhcigtLXRleHQsI2UwZTBlMCkpO2JvcmRlcjoxcHggc29saWQgdmFyKC0taW5wdXQtYm9yZGVyLHZhcigtLWJkciwjMzMzKSk7Ym9yZGVyLXJhZGl1czo0cHg7cGFkZGluZzo2cHggOHB4O2ZvbnQtc2l6ZToxMnB4O291dGxpbmU6bm9uZTtmb250LWZhbWlseTppbmhlcml0O31cXG4gICAgICAuYXN0LWlucHV0OmZvY3Vze2JvcmRlci1jb2xvcjp2YXIoLS1hY2MsIzg4OCk7fVxcbiAgICAgIC5hc3QtaW5wdXQ6OnBsYWNlaG9sZGVye2NvbG9yOnZhcigtLXBsYWNlaG9sZGVyLCM1NTUpO31cXG4gICAgICAuYXN0LXRleHRhcmVhe2JhY2tncm91bmQ6dmFyKC0taW5wdXQtYmcsdmFyKC0tYmcyLCMyNDI0MjQpKTtjb2xvcjp2YXIoLS1pbnB1dC10ZXh0LHZhcigtLXRleHQsI2UwZTBlMCkpO2JvcmRlcjoxcHggc29saWQgdmFyKC0taW5wdXQtYm9yZGVyLHZhcigtLWJkciwjMzMzKSk7Ym9yZGVyLXJhZGl1czo0cHg7cGFkZGluZzo4cHg7Zm9udC1zaXplOjEycHg7b3V0bGluZTpub25lO2ZvbnQtZmFtaWx5OmluaGVyaXQ7cmVzaXplOm5vbmU7d2lkdGg6MTAwJTtib3gtc2l6aW5nOmJvcmRlci1ib3g7fVxcbiAgICAgIC5hc3QtdGV4dGFyZWE6Zm9jdXN7Ym9yZGVyLWNvbG9yOnZhcigtLWFjYywjODg4KTt9XFxuICAgICAgLmFzdC10ZXh0YXJlYTo6cGxhY2Vob2xkZXJ7Y29sb3I6dmFyKC0tcGxhY2Vob2xkZXIsIzU1NSk7fVxcbiAgICAgIC5hc3Qta2V5LXJvd3tkaXNwbGF5OmZsZXg7YWxpZ24taXRlbXM6Y2VudGVyO2p1c3RpZnktY29udGVudDpzcGFjZS1iZXR3ZWVuO3BhZGRpbmc6NHB4IDJweDtmb250LXNpemU6MTJweDttYXJnaW4tYm90dG9tOjNweDt9XFxuICAgICAgLmFzdC1rZXktcm93IHNwYW57Y29sb3I6dmFyKC0tdGV4dCwjZTBlMGUwKTt9XFxuICAgICAgLmFzdC1rZXktY2FwdHVyZXtiYWNrZ3JvdW5kOnZhcigtLWtleS1iZyx2YXIoLS1iZzIsIzI0MjQyNCkpO2JvcmRlcjoxcHggc29saWQgdmFyKC0taW5wdXQtYm9yZGVyLHZhcigtLWJkciwjMzMzKSk7Y29sb3I6dmFyKC0ta2V5LXRleHQsdmFyKC0tYWNjLCM4ODgpKTtib3JkZXItcmFkaXVzOjRweDtwYWRkaW5nOjRweCAxMHB4O2ZvbnQtc2l6ZToxMXB4O3RleHQtYWxpZ246Y2VudGVyO21pbi13aWR0aDo1MHB4O2N1cnNvcjpwb2ludGVyO291dGxpbmU6bm9uZTtmb250LWZhbWlseTonQ29uc29sYXMnLG1vbm9zcGFjZTtmb250LXdlaWdodDo2MDA7fVxcbiAgICAgIC5hc3Qta2V5LWNhcHR1cmU6Zm9jdXN7Ym9yZGVyLWNvbG9yOnZhcigtLWFjYywjODg4KTt9XFxuICAgICAgLmFzdC1yb3d7ZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtnYXA6NnB4O21hcmdpbi1ib3R0b206NHB4O31cXG4gICAgICAuYXN0LXJvdyAuYXN0LWlucHV0e2ZsZXg6MTt9XFxuICAgICAgLmFzdC1jcmVkaXRze3BhZGRpbmctdG9wOjhweDtmb250LXNpemU6MTBweDtjb2xvcjp2YXIoLS1tdXRlZCwjNTU1KTtsaW5lLWhlaWdodDoxLjU7dGV4dC1hbGlnbjpjZW50ZXI7fVxcbiAgICAgIC5hc3Qtc2Vwe2hlaWdodDoxcHg7YmFja2dyb3VuZDp2YXIoLS1iZHIsIzMzMyk7bWFyZ2luOjZweCAwO31cXG4gICAgICAuYXN0LXVwZGF0ZS1saXN0e21hcmdpbjowO3BhZGRpbmctbGVmdDoxNnB4O2ZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLWxpc3QtdGV4dCx2YXIoLS10ZXh0LXNlYywjODg4KSk7bGluZS1oZWlnaHQ6MS42O31cXG4gICAgICAuYXN0LXVwZGF0ZS1saXN0IGxpe21hcmdpbi1ib3R0b206NHB4O31cXG4gICAgICBkaXYuc2lkZWJhci5sZWZ0PmRpdi5hZC1ibG9ja3tvcGFjaXR5OjAhaW1wb3J0YW50O3BvaW50ZXItZXZlbnRzOm5vbmUhaW1wb3J0YW50O2Rpc3BsYXk6bm9uZSFpbXBvcnRhbnQ7fVxcbiAgICAgIGRpdi5zaWRlYmFyLmxlZnQ+YXtkaXNwbGF5Om5vbmUhaW1wb3J0YW50O31cXG4gICAgICBkaXYuc2lkZWJhci5sZWZ0e21heC13aWR0aDozMHZ3O3dpZHRoOjIxcmVtO2JvdHRvbTowIWltcG9ydGFudDt9XFxuICAgIFwiO1xuICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHN0eWxlRWxlbWVudCk7XG59XG5cbmV4cG9ydCB7IGFwcGx5VGhlbWUsIGluaXRCYWNrZ3JvdW5kSW1hZ2UsIGluamVjdFN0eWxlcyB9O1xuIiwiaW1wb3J0IHsgdHlwZUNoYXRNZXNzYWdlIH0gZnJvbSAnLi4vdWkvaW50ZXJhY3Rpb24uanMnO1xuaW1wb3J0IHsgc3RhdGUgfSBmcm9tICcuLi9jb3JlLmpzJztcblxubGV0IGNoYXRJbnRlcnZhbCA9IG51bGw7XG5mdW5jdGlvbiBzdGFydFJlcGVhdGluZ1Rhc2sodGFza0RhdGEsIGludGVydmFsU2Vjb25kcykge1xuICBpZiAoY2hhdEludGVydmFsKSB7XG4gICAgY2xlYXJJbnRlcnZhbChjaGF0SW50ZXJ2YWwpO1xuICB9XG4gIHN0YXRlLmlzTG9vcGluZyA9IHRydWU7XG4gIGNoYXRJbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICB0eXBlQ2hhdE1lc3NhZ2UodGFza0RhdGEpO1xuICB9LCBpbnRlcnZhbFNlY29uZHMgKiAxMDAwKTtcbn1cbmZ1bmN0aW9uIHN0b3BDaGF0VGltZXIoKSB7XG4gIGlmIChjaGF0SW50ZXJ2YWwpIHtcbiAgICBjbGVhckludGVydmFsKGNoYXRJbnRlcnZhbCk7XG4gICAgY2hhdEludGVydmFsID0gbnVsbDtcbiAgfVxuICBzdGF0ZS5pc0xvb3BpbmcgPSBmYWxzZTtcbn1cblxuZXhwb3J0IHsgc3RhcnRSZXBlYXRpbmdUYXNrLCBzdG9wQ2hhdFRpbWVyIH07XG4iLCJpbXBvcnQgeyBnZXRBbGxQcm9wZXJ0eU5hbWVzIH0gZnJvbSAnLi4vdXRpbHMuanMnO1xuaW1wb3J0IHsgbWV0YWRhdGFNYXAsIHdyYXBXaXRoUHJveHksIGNvbmZpZ1N0b3JlLCBzdGF0ZSB9IGZyb20gJy4uL2NvcmUuanMnO1xuaW1wb3J0IHsgc2hvd05vdGlmaWNhdGlvbiB9IGZyb20gJy4uL3VpL2ludGVyYWN0aW9uLmpzJztcblxubGV0IGFwcFN0YXRlO1xubGV0IGlzWW91dHViZUFwaVJlYWR5ID0gZmFsc2U7XG5jb25zdCBpbml0QW50aURldGVjdGlvbiA9ICgpID0+IHtcbiAgaWYgKGlzWW91dHViZUFwaVJlYWR5KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlzWW91dHViZUFwaVJlYWR5ID0gdHJ1ZTtcbiAgY29uc3QgY2FjaGVTdG9yZSA9IHt9O1xuICBmb3IgKGNvbnN0IHByb3BlcnR5TmFtZSBvZiBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhSZWZsZWN0KSkge1xuICAgIGNhY2hlU3RvcmVbcHJvcGVydHlOYW1lXSA9IFJlZmxlY3RbcHJvcGVydHlOYW1lXTtcbiAgfVxuICBjb25zdCBQcm94eUNvbnN0cnVjdG9yID0gUHJveHk7XG4gIGNvbnN0IGxvb2t1cEdldHRlciA9IE9iamVjdC5wcm90b3R5cGUuX19sb29rdXBHZXR0ZXJfXztcbiAgY29uc3QgdXBkYXRlT2JqZWN0UHJvcGVydHkgPSAoZGF0YVN0b3JlLCBkYXRhS2V5LCBpbml0aWFsVmFsdWUpID0+IHtcbiAgICBjb25zdCB3cmFwcGVkVmFsdWUgPSBuZXcgUHJveHlDb25zdHJ1Y3RvcihkYXRhU3RvcmVbZGF0YUtleV0sIGluaXRpYWxWYWx1ZSk7XG4gICAgbWV0YWRhdGFNYXAuc2V0KHdyYXBwZWRWYWx1ZSwgZGF0YVN0b3JlW2RhdGFLZXldKTtcbiAgICBkYXRhU3RvcmVbZGF0YUtleV0gPSB3cmFwcGVkVmFsdWU7XG4gIH07XG4gIHVwZGF0ZU9iamVjdFByb3BlcnR5KEZ1bmN0aW9uLnByb3RvdHlwZSwgXCJ0b1N0cmluZ1wiLCB7XG4gICAgYXBwbHkodGhpc0NvbnRleHQsIGFyZ3NLZXksIGJpbmRpbmdDb250ZXh0KSB7XG4gICAgICByZXR1cm4gY2FjaGVTdG9yZS5hcHBseSh0aGlzQ29udGV4dCwgbWV0YWRhdGFNYXAuZ2V0KGFyZ3NLZXkpIHx8IGFyZ3NLZXksIGJpbmRpbmdDb250ZXh0KTtcbiAgICB9XG4gIH0pO1xuICB1cGRhdGVPYmplY3RQcm9wZXJ0eSh3aW5kb3csIFwiUHJveHlcIiwge1xuICAgIGNvbnN0cnVjdChjb25zdHJ1Y3RvckZ1bmMsIGNvbnN0cnVjdG9yQXJncykge1xuICAgICAgcmV0dXJuIGNhY2hlU3RvcmUuY29uc3RydWN0KGNvbnN0cnVjdG9yRnVuYywgY29uc3RydWN0b3JBcmdzKTtcbiAgICB9XG4gIH0pO1xuICB1cGRhdGVPYmplY3RQcm9wZXJ0eShQcm94eUNvbnN0cnVjdG9yLCBcInJldm9jYWJsZVwiLCB7XG4gICAgYXBwbHkodGFyZ2V0RnVuY3Rpb24sIGZ1bmN0aW9uQXJncywgZnVuY3Rpb25Db250ZXh0KSB7XG4gICAgICByZXR1cm4gY2FjaGVTdG9yZS5hcHBseSh0YXJnZXRGdW5jdGlvbiwgZnVuY3Rpb25BcmdzLCBmdW5jdGlvbkNvbnRleHQpO1xuICAgIH1cbiAgfSk7XG4gIGxldCBsYXN0RXhlY3V0aW9uVGltZXN0YW1wID0gMDtcbiAgdXBkYXRlT2JqZWN0UHJvcGVydHkoRnVuY3Rpb24ucHJvdG90eXBlLCBcImJpbmRcIiwge1xuICAgIGFwcGx5KGJpbmRUYXJnZXRDb250ZXh0LCBhcmd1bWVudHNMaXN0LCBjb250ZXh0QXJndW1lbnQpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgaWYgKGxvb2t1cEdldHRlci5jYWxsKGNvbnRleHRBcmd1bWVudFswXSwgXCJhYm92ZUJnUGxhdGZvcm1zQ29udGFpbmVyXCIpICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJldHVybiBjYWNoZVN0b3JlLmFwcGx5KGJpbmRUYXJnZXRDb250ZXh0LCBhcmd1bWVudHNMaXN0LCBjb250ZXh0QXJndW1lbnQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaCB7fVxuICAgICAgICBpZiAoY29udGV4dEFyZ3VtZW50WzBdICYmIGNvbnRleHRBcmd1bWVudFswXS5hYm92ZUJnUGxhdGZvcm1zQ29udGFpbmVyICE9IG51bGwpIHtcbiAgICAgICAgICBzdGF0ZS5hbmltYWxEYXRhID0gY29udGV4dEFyZ3VtZW50WzBdO1xuICAgICAgICAgIHN0YXRlLmdhbWVJbnN0YW5jZSA9IGNvbnRleHRBcmd1bWVudFswXS5nYW1lO1xuICAgICAgICAgIHdpbmRvdy5fX2NhY2hlZEVNID0gbnVsbDtcbiAgICAgICAgICBjb25zdCBwcm9jZXNzZWREYXRhID0gZ2V0QWxsUHJvcGVydHlOYW1lcyhzdGF0ZS5hbmltYWxEYXRhKTtcbiAgICAgICAgICBjb25zdCBvYmZ1c2NhdGVkS2V5cyA9IHByb2Nlc3NlZERhdGEuZmlsdGVyKG9iZnVzY2F0ZWROYW1lMSA9PiBvYmZ1c2NhdGVkTmFtZTEuc3RhcnRzV2l0aChcIl8weFwiKSk7XG4gICAgICAgICAgY29uZmlnU3RvcmUuc2V0Rmxhc2ggPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyhzdGF0ZS5hbmltYWxEYXRhLl9fcHJvdG9fXy5fX3Byb3RvX18pLmZpbHRlcihvYmZ1c2NhdGVkTmFtZTIgPT4gb2JmdXNjYXRlZE5hbWUyLnN0YXJ0c1dpdGgoXCJfMHhcIikpLmZpbmQoZnVuY3Rpb25LZXkgPT4gc3RhdGUuYW5pbWFsRGF0YVtmdW5jdGlvbktleV0gaW5zdGFuY2VvZiBGdW5jdGlvbikgfHwgY29uZmlnU3RvcmUuc2V0Rmxhc2g7XG4gICAgICAgICAgY29uZmlnU3RvcmUudGVycmFpbk1hbmFnZXIgPSBvYmZ1c2NhdGVkS2V5cy5maW5kKHNoYWRvd0VsZW1lbnRLZXkgPT4gdHlwZW9mIHN0YXRlLmFuaW1hbERhdGFbc2hhZG93RWxlbWVudEtleV0/LnNoYWRvdyAhPT0gXCJ1bmRlZmluZWRcIikgfHwgY29uZmlnU3RvcmUudGVycmFpbk1hbmFnZXI7XG4gICAgICAgICAgY29uZmlnU3RvcmUuZW50aXR5TWFuYWdlciA9IG9iZnVzY2F0ZWRLZXlzLmZpbmQoZW50aXRpZXNMaXN0S2V5ID0+IHR5cGVvZiBzdGF0ZS5hbmltYWxEYXRhW2VudGl0aWVzTGlzdEtleV0/LmVudGl0aWVzTGlzdCAhPT0gXCJ1bmRlZmluZWRcIikgfHwgY29uZmlnU3RvcmUuZW50aXR5TWFuYWdlcjtcbiAgICAgICAgICBjb25maWdTdG9yZS5zb2NrZXRNYW5hZ2VyID0gZ2V0QWxsUHJvcGVydHlOYW1lcyhzdGF0ZS5nYW1lSW5zdGFuY2UpLmZpbmQocGFja2V0U2VuZGVyS2V5ID0+IHR5cGVvZiBzdGF0ZS5nYW1lSW5zdGFuY2VbcGFja2V0U2VuZGVyS2V5XT8uc2VuZEJ5dGVQYWNrZXQgIT09IFwidW5kZWZpbmVkXCIpIHx8IGNvbmZpZ1N0b3JlLnNvY2tldE1hbmFnZXI7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGFwcFN0YXRlID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhcHBcIikuX3Zub2RlLmFwcENvbnRleHQuY29uZmlnLmdsb2JhbFByb3BlcnRpZXMuJHNpbXBsZVN0YXRlLnN0YXRlcy5maW5kKGdhbWVTdG9yZSA9PiBnYW1lU3RvcmUuX3N0b3JlTWV0YS5pZCA9PT0gXCJnYW1lXCIpO1xuICAgICAgICAgIH0gY2F0Y2gge31cbiAgICAgICAgICBsZXQgYW5pbWFsQ2hlY2tJbnRlcnZhbDtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChhbmltYWxDaGVja0ludGVydmFsKTtcbiAgICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgICAgYW5pbWFsQ2hlY2tJbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGlmICghc3RhdGUuYW5pbWFsRGF0YT8ubXlBbmltYWxzPy5bMF0pIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgY29uc3QgZmlyc3RNeUFuaW1hbCA9IHN0YXRlLmFuaW1hbERhdGEubXlBbmltYWxzWzBdO1xuICAgICAgICAgICAgICBpZiAoZmlyc3RNeUFuaW1hbC5mYWRpbmdUcmFpbCkge1xuICAgICAgICAgICAgICAgIHdyYXBXaXRoUHJveHkoT2JqZWN0LmdldFByb3RvdHlwZU9mKGZpcnN0TXlBbmltYWwuZmFkaW5nVHJhaWwpLCBcImVuYWJsZVwiLCB7XG4gICAgICAgICAgICAgICAgICBhcHBseSgpIHt9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKGZpcnN0TXlBbmltYWwuYnViYmxlc0VtaXR0ZXIpIHtcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoT2JqZWN0LmdldFByb3RvdHlwZU9mKGZpcnN0TXlBbmltYWwuYnViYmxlc0VtaXR0ZXIpLCBcImVtaXRcIiwge1xuICAgICAgICAgICAgICAgICAgc2V0OiAoKSA9PiB7fVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoYW5pbWFsQ2hlY2tJbnRlcnZhbCk7XG4gICAgICAgICAgICB9IGNhdGNoIHt9XG4gICAgICAgICAgfSwgMjAwKTtcbiAgICAgICAgICBpZiAobGFzdEV4ZWN1dGlvblRpbWVzdGFtcCA8IERhdGUubm93KCkgLSAzMDAwKSB7XG4gICAgICAgICAgICBzaG93Tm90aWZpY2F0aW9uKFwiQ2xpZW50IGxvYWRlZFwiKTtcbiAgICAgICAgICAgIGxhc3RFeGVjdXRpb25UaW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCB7fVxuICAgICAgcmV0dXJuIGNhY2hlU3RvcmUuYXBwbHkoYmluZFRhcmdldENvbnRleHQsIGFyZ3VtZW50c0xpc3QsIGNvbnRleHRBcmd1bWVudCk7XG4gICAgfVxuICB9KTtcbn07XG5cbmV4cG9ydCB7IGluaXRBbnRpRGV0ZWN0aW9uIH07XG4iLCJpbXBvcnQgeyBzaG93Tm90aWZpY2F0aW9uIH0gZnJvbSAnLi4vdWkvaW50ZXJhY3Rpb24uanMnO1xuaW1wb3J0IHsgc3RhdGUgfSBmcm9tICcuLi9jb3JlLmpzJztcblxuY29uc3QgaW5pdGlhbGl6ZUFzdHJhVmlzaW9uID0gKCkgPT4ge1xuICBpZiAoc3RhdGUuaXNBY3RpdmUpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCFzdGF0ZS5hbmltYWxEYXRhKSB7XG4gICAgc2V0VGltZW91dChpbml0aWFsaXplQXN0cmFWaXNpb24sIDUwMCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRyeSB7XG4gICAgaWYgKHN0YXRlLmFuaW1hbERhdGEudGVycmFpbk1hbmFnZXIgJiYgc3RhdGUuYW5pbWFsRGF0YS50ZXJyYWluTWFuYWdlci5zaGFkb3cpIHtcbiAgICAgIHN0YXRlLmFuaW1hbERhdGEudGVycmFpbk1hbmFnZXIuc2hhZG93LnNldFNoYWRvd1NpemUoMTAwMDAwMCk7XG4gICAgICBzdGF0ZS5hbmltYWxEYXRhLnRlcnJhaW5NYW5hZ2VyLnNoYWRvdy5zZXRTaGFkb3dTaXplID0gKCkgPT4ge307XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAobGV0IGtleUEgaW4gc3RhdGUuYW5pbWFsRGF0YSkge1xuICAgICAgICBpZiAoc3RhdGUuYW5pbWFsRGF0YVtrZXlBXSAmJiBzdGF0ZS5hbmltYWxEYXRhW2tleUFdLnNoYWRvdykge1xuICAgICAgICAgIHN0YXRlLmFuaW1hbERhdGFba2V5QV0uc2hhZG93LnNldFNoYWRvd1NpemUoMTAwMDAwMCk7XG4gICAgICAgICAgc3RhdGUuYW5pbWFsRGF0YVtrZXlBXS5zaGFkb3cuc2V0U2hhZG93U2l6ZSA9ICgpID0+IHt9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIGlmICh0eXBlb2Ygc3RhdGUuYW5pbWFsRGF0YS5zZXRGbGFzaCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBzdGF0ZS5hbmltYWxEYXRhLnNldEZsYXNoID0gKCkgPT4ge307XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAobGV0IGtleUIgb2YgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoc3RhdGUuYW5pbWFsRGF0YS5fX3Byb3RvX18pKSB7XG4gICAgICAgIGlmIChrZXlCLnN0YXJ0c1dpdGgoXCJfMHhcIikgJiYgdHlwZW9mIHN0YXRlLmFuaW1hbERhdGFba2V5Ql0gPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICAgIHN0YXRlLmFuaW1hbERhdGFba2V5Ql0gPSAoKSA9PiB7fTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBzZXRJbnRlcnZhbCgoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBzdGF0ZS5nYW1lSW5zdGFuY2Uudmlld3BvcnQuY2xhbXBab29tKHtcbiAgICAgICAgICBtaW5XaWR0aDogMCxcbiAgICAgICAgICBtYXhXaWR0aDogMTAwMDAwMDBcbiAgICAgICAgfSk7XG4gICAgICAgIHN0YXRlLmdhbWVJbnN0YW5jZS52aWV3cG9ydC5wbHVnaW5zLnBsdWdpbnMuY2xhbXAgPSBudWxsO1xuICAgICAgICBzdGF0ZS5nYW1lSW5zdGFuY2Uudmlld3BvcnQucGx1Z2lucy5wbHVnaW5zW1wiY2xhbXAtem9vbVwiXSA9IG51bGw7XG4gICAgICB9IGNhdGNoIHt9XG4gICAgfSwgMzAwKTtcbiAgICBzaG93Tm90aWZpY2F0aW9uKFwiQXN0cmEtVmlzaW9uIGFjdGl2ZVwiKTtcbiAgfSBjYXRjaCAoZXJyb3JNZXNzYWdlKSB7XG4gICAgY29uc29sZS5lcnJvcihcIkFzdHJhVmlzaW9uIEVycm9yOlwiLCBlcnJvck1lc3NhZ2UpO1xuICB9XG4gIHN0YXRlLmlzQWN0aXZlID0gdHJ1ZTtcbn07XG5cbmV4cG9ydCB7IGluaXRpYWxpemVBc3RyYVZpc2lvbiB9O1xuIiwiaW1wb3J0IHsgYnVpbGRFbnRpdHlTdGF0ZSwgc3RhcnRFbnRpdHlUcmFpbFRyYWNraW5nLCBzdG9wRW50aXR5VHJhaWxUcmFja2luZywgZ2V0QW5pbWFsUG9zaXRpb24sIGV4dHJhY3RQb3NpdGlvbiwgY2FsY3VsYXRlRGlyZWN0aW9uLCBjYWxjdWxhdGVEaXN0YW5jZSB9IGZyb20gJy4vbW92ZW1lbnQuanMnO1xuaW1wb3J0IHsgc2hvd05vdGlmaWNhdGlvbiB9IGZyb20gJy4uL3VpL2ludGVyYWN0aW9uLmpzJztcbmltcG9ydCB7IGdldE9yQ3JlYXRlQ2FudmFzIH0gZnJvbSAnLi4vdWkvcmFkYXIuanMnO1xuaW1wb3J0IHsgZ2V0Vmlld3BvcnRTY2FsZSwgZHJhZ1N0YXRlLCBzdGF0ZSB9IGZyb20gJy4uL2NvcmUuanMnO1xuaW1wb3J0IHsgZmluZEVudGl0eUJ5SWQgfSBmcm9tICcuL2F1dG9mYXJtLmpzJztcbmltcG9ydCB7IGlzVmFsaWRFbnRpdHkgfSBmcm9tICcuLi91dGlscy5qcyc7XG5cbndpbmRvdy5lbnRpdHlUcmFpbENvbG9yID0ge1xuICByOiAyNTUsXG4gIGc6IDE1MCxcbiAgYjogMFxufTtcbndpbmRvdy5lbnRpdHlUcmFpbEVuYWJsZWQgPSBmYWxzZTtcbndpbmRvdy5lbnRpdHlUcmFpbFRhcmdldElkID0gbnVsbDtcbndpbmRvdy5lbnRpdHlUcmFpbEhpc3RvcnkgPSBbXTtcbndpbmRvdy5lbnRpdHlUcmFpbE1heExlbmd0aCA9IDIwMDtcbndpbmRvdy5lbnRpdHlUcmFpbFJlY29yZEludGVydmFsID0gMTAwO1xud2luZG93LmVzcEVuYWJsZWQgPSBmYWxzZTtcbndpbmRvdy5lc3BDb2xvcnMgPSB7XG4gIGNsb3NlOiBcIiNmZjAwMDBcIixcbiAgbWVkaXVtOiBcIiNmZmZmMDBcIixcbiAgZmFyOiBcIiMwMGZmZmZcIixcbiAgdmVyeUZhcjogXCIjMDBmZjAwXCIsXG4gIHRyYWNrZWQ6IFwiI2ZmMDBmZlwiLFxuICBmb29kQ2xvc2U6IFwiIzAwZmYwMFwiLFxuICBmb29kTWVkaXVtOiBcIiM4OGZmODhcIixcbiAgZm9vZEZhcjogXCIjNDRjYzQ0XCJcbn07XG53aW5kb3cuZXNwVHJhY2tlZEVudGl0eUlkID0gbnVsbDtcbndpbmRvdy5lc3BNb2RlID0gXCJwbGF5ZXJzXCI7XG5cblxuZnVuY3Rpb24gdG9nZ2xlRW50aXR5VHJhaWwoKSB7XG4gIGlmICh3aW5kb3cuZW50aXR5VHJhaWxFbmFibGVkKSB7XG4gICAgd2luZG93LmVudGl0eVRyYWlsRW5hYmxlZCA9IGZhbHNlO1xuICAgIHdpbmRvdy5lbnRpdHlUcmFpbFRhcmdldElkID0gbnVsbDtcbiAgICBzdG9wRW50aXR5VHJhaWxUcmFja2luZygpO1xuICAgIHdpbmRvdy5lbnRpdHlUcmFpbEhpc3RvcnkgPSBbXTtcbiAgICBzaG93Tm90aWZpY2F0aW9uKFwiVHJhaWwgc3RvcHBlZFwiKTtcbiAgICByZWZyZXNoVUkoKTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgcGxheWVyRGF0YSA9IGJ1aWxkRW50aXR5U3RhdGUoKTtcbiAgY29uc3QgaGFzTmVhcmJ5UGxheWVycyA9IHBsYXllckRhdGEgJiYgcGxheWVyRGF0YS5wbGF5ZXJzICYmIHBsYXllckRhdGEucGxheWVycy5sZW5ndGggPiAwO1xuICBpZiAoIWhhc05lYXJieVBsYXllcnMpIHtcbiAgICBzaG93Tm90aWZpY2F0aW9uKFwiTm8gcGxheWVycyBuZWFyYnkgdG8gdHJhY2VcIik7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHRhcmdldFBsYXllcklkID0gcGxheWVyRGF0YS5wbGF5ZXJzWzBdLmlkO1xuICBjb25zdCB0YXJnZXRQbGF5ZXJOYW1lID0gcGxheWVyRGF0YS5wbGF5ZXJzWzBdLmVudGl0eT8ubmFtZSB8fCBcIklEOlwiICsgdGFyZ2V0UGxheWVySWQ7XG4gIHdpbmRvdy5lbnRpdHlUcmFpbEVuYWJsZWQgPSB0cnVlO1xuICB3aW5kb3cuZW50aXR5VHJhaWxUYXJnZXRJZCA9IHRhcmdldFBsYXllcklkO1xuICB3aW5kb3cuZW50aXR5VHJhaWxIaXN0b3J5ID0gW107XG4gIHN0YXJ0RW50aXR5VHJhaWxUcmFja2luZygpO1xuICBzaG93Tm90aWZpY2F0aW9uKFwiVHJhY2luZzogXCIgKyB0YXJnZXRQbGF5ZXJOYW1lKTtcbiAgcmVmcmVzaFVJKCk7XG59XG5mdW5jdGlvbiByZWZyZXNoVUkoKSB7fVxuZnVuY3Rpb24gZHJhd0VudGl0eVRyYWlsKGN0eCwgY2FudmFzLCBwbGF5ZXJQb3MsIHpvb21TY2FsZSkge1xuICBpZiAoIXdpbmRvdy5lbnRpdHlUcmFpbEVuYWJsZWQgfHwgd2luZG93LmVudGl0eVRyYWlsSGlzdG9yeS5sZW5ndGggPCAyKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGNlbnRlclggPSBjYW52YXMud2lkdGggLyAyO1xuICBjb25zdCBjZW50ZXJZID0gY2FudmFzLmhlaWdodCAvIDI7XG4gIGNvbnN0IGN1cnJlbnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgY29uc3QgdHJhaWxEdXJhdGlvbiA9IDMwMDAwO1xuICBjb25zdCB7XG4gICAgcjogcmVkLFxuICAgIGc6IGdyZWVuLFxuICAgIGI6IGJsdWVcbiAgfSA9IHdpbmRvdy5lbnRpdHlUcmFpbENvbG9yO1xuICBmb3IgKGxldCBpID0gMTsgaSA8IHdpbmRvdy5lbnRpdHlUcmFpbEhpc3RvcnkubGVuZ3RoOyBpKyspIHtcbiAgICBjb25zdCBwcmV2UG9pbnQgPSB3aW5kb3cuZW50aXR5VHJhaWxIaXN0b3J5W2kgLSAxXTtcbiAgICBjb25zdCBjdXJyUG9pbnQgPSB3aW5kb3cuZW50aXR5VHJhaWxIaXN0b3J5W2ldO1xuICAgIGNvbnN0IGFnZSA9IHN0YXRlLmN1cnJlbnRUaW1lIC0gY3VyclBvaW50LnRpbWU7XG4gICAgY29uc3Qgb3BhY2l0eSA9IE1hdGgubWF4KDAuMDUsIDEgLSBhZ2UgLyB0cmFpbER1cmF0aW9uKTtcbiAgICBjb25zdCBzdGFydFggPSBjZW50ZXJYICsgKHByZXZQb2ludC54IC0gcGxheWVyUG9zLngpICogem9vbVNjYWxlO1xuICAgIGNvbnN0IHN0YXJ0WSA9IGNlbnRlclkgKyAocHJldlBvaW50LnkgLSBwbGF5ZXJQb3MueSkgKiB6b29tU2NhbGU7XG4gICAgY29uc3QgZW5kWCA9IGNlbnRlclggKyAoY3VyclBvaW50LnggLSBwbGF5ZXJQb3MueCkgKiB6b29tU2NhbGU7XG4gICAgY29uc3QgZW5kWSA9IGNlbnRlclkgKyAoY3VyclBvaW50LnkgLSBwbGF5ZXJQb3MueSkgKiB6b29tU2NhbGU7XG4gICAgY29uc3QgcHJvZ3Jlc3MgPSBpIC8gd2luZG93LmVudGl0eVRyYWlsSGlzdG9yeS5sZW5ndGg7XG4gICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgIGN0eC5tb3ZlVG8oc3RhcnRYLCBzdGFydFkpO1xuICAgIGN0eC5saW5lVG8oZW5kWCwgZW5kWSk7XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKFwiICsgcmVkICsgXCIsXCIgKyBncmVlbiArIFwiLFwiICsgYmx1ZSArIFwiLFwiICsgb3BhY2l0eSArIFwiKVwiO1xuICAgIGN0eC5saW5lV2lkdGggPSAxLjUgKyBwcm9ncmVzcyAqIDEuNTtcbiAgICBjdHguc3Ryb2tlKCk7XG4gIH1cbiAgZm9yIChsZXQgaiA9IDA7IGogPCB3aW5kb3cuZW50aXR5VHJhaWxIaXN0b3J5Lmxlbmd0aDsgaiArPSA1KSB7XG4gICAgY29uc3QgaGlzdG9yeVBvaW50ID0gd2luZG93LmVudGl0eVRyYWlsSGlzdG9yeVtqXTtcbiAgICBjb25zdCBwb2ludEFnZSA9IHN0YXRlLmN1cnJlbnRUaW1lIC0gaGlzdG9yeVBvaW50LnRpbWU7XG4gICAgY29uc3QgcG9pbnRPcGFjaXR5ID0gTWF0aC5tYXgoMC4xLCAxIC0gcG9pbnRBZ2UgLyB0cmFpbER1cmF0aW9uKTtcbiAgICBjb25zdCBwb2ludFggPSBjZW50ZXJYICsgKGhpc3RvcnlQb2ludC54IC0gcGxheWVyUG9zLngpICogem9vbVNjYWxlO1xuICAgIGNvbnN0IHBvaW50WSA9IGNlbnRlclkgKyAoaGlzdG9yeVBvaW50LnkgLSBwbGF5ZXJQb3MueSkgKiB6b29tU2NhbGU7XG4gICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYShcIiArIHJlZCArIFwiLFwiICsgZ3JlZW4gKyBcIixcIiArIGJsdWUgKyBcIixcIiArIHBvaW50T3BhY2l0eSArIFwiKVwiO1xuICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICBjdHguYXJjKHBvaW50WCwgcG9pbnRZLCAyLCAwLCBNYXRoLlBJICogMik7XG4gICAgY3R4LmZpbGwoKTtcbiAgfVxuICBpZiAod2luZG93LmVudGl0eVRyYWlsSGlzdG9yeS5sZW5ndGggPiAwKSB7XG4gICAgY29uc3QgbGFzdFRyYWlsUG9zaXRpb24gPSB3aW5kb3cuZW50aXR5VHJhaWxIaXN0b3J5W3dpbmRvdy5lbnRpdHlUcmFpbEhpc3RvcnkubGVuZ3RoIC0gMV07XG4gICAgY29uc3QgY2FsY3VsYXRlZFhPZmZzZXQgPSBjZW50ZXJYICsgKGxhc3RUcmFpbFBvc2l0aW9uLnggLSBwbGF5ZXJQb3MueCkgKiB6b29tU2NhbGU7XG4gICAgY29uc3QgY2FsY3VsYXRlZFlPZmZzZXQgPSBjZW50ZXJZICsgKGxhc3RUcmFpbFBvc2l0aW9uLnkgLSBwbGF5ZXJQb3MueSkgKiB6b29tU2NhbGU7XG4gICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiKFwiICsgcmVkICsgXCIsXCIgKyBncmVlbiArIFwiLFwiICsgYmx1ZSArIFwiKVwiO1xuICAgIGN0eC5mb250ID0gXCJib2xkIDEwcHggbW9ub3NwYWNlXCI7XG4gICAgY3R4LmZpbGxUZXh0KFwiVFJBSUwgKFwiICsgd2luZG93LmVudGl0eVRyYWlsSGlzdG9yeS5sZW5ndGggKyBcIiBwdHMpXCIsIGNhbGN1bGF0ZWRYT2Zmc2V0ICsgOCwgY2FsY3VsYXRlZFlPZmZzZXQgLSA4KTtcbiAgfVxufVxuZnVuY3Rpb24gcmVuZGVyTG9vcCgpIHtcbiAgY29uc3Qgb3ZlcmxheUNhbnZhcyA9IGdldE9yQ3JlYXRlQ2FudmFzKFwiYXN0LW92ZXJsYXlcIiwgOTk5OTk3KTtcbiAgY29uc3Qgb3ZlcmxheUN0eCA9IG92ZXJsYXlDYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuICBvdmVybGF5Q3R4LmNsZWFyUmVjdCgwLCAwLCBvdmVybGF5Q2FudmFzLndpZHRoLCBvdmVybGF5Q2FudmFzLmhlaWdodCk7XG4gIGNvbnN0IGN1cnJlbnRQbGF5ZXJQb3MgPSBnZXRBbmltYWxQb3NpdGlvbigpO1xuICBpZiAoY3VycmVudFBsYXllclBvcyAmJiB3aW5kb3cuZW50aXR5VHJhaWxFbmFibGVkKSB7XG4gICAgZHJhd0VudGl0eVRyYWlsKG92ZXJsYXlDdHgsIG92ZXJsYXlDYW52YXMsIGN1cnJlbnRQbGF5ZXJQb3MsIGdldFZpZXdwb3J0U2NhbGUoKSk7XG4gIH1cbiAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlckxvb3ApO1xufVxuZnVuY3Rpb24gZHJhd0VTUChjdHgsIGdhbWVTdGF0ZSwgb2Zmc2V0WCwgb2Zmc2V0WSwgc2NhbGUpIHtcbiAgaWYgKCFnYW1lU3RhdGUgfHwgZ2FtZVN0YXRlLmVycm9yKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IG15UG9zID0gZ2FtZVN0YXRlLm15UG9zO1xuICBjb25zdCBlc3BNb2RlID0gd2luZG93LmVzcE1vZGU7XG4gIGNvbnN0IHRyYWNrZWRJZCA9IHdpbmRvdy5lc3BUcmFja2VkRW50aXR5SWQ7XG4gIGxldCBlbnRpdGllcyA9IGVzcE1vZGUgPT09IFwicGxheWVyc1wiID8gZ2FtZVN0YXRlLnBsYXllcnMgfHwgW10gOiBnYW1lU3RhdGUuZm9vZCB8fCBbXTtcbiAgbGV0IHZpZXdDZW50ZXJYID0gMDtcbiAgbGV0IHZpZXdDZW50ZXJZID0gMDtcbiAgdHJ5IHtcbiAgICBpZiAoc3RhdGUuZ2FtZUluc3RhbmNlPy52aWV3cG9ydCkge1xuICAgICAgY29uc3Qgdmlld3BvcnQgPSBzdGF0ZS5nYW1lSW5zdGFuY2Uudmlld3BvcnQ7XG4gICAgICBpZiAodmlld3BvcnQuY2VudGVyICYmIHZpZXdwb3J0LmNlbnRlci54ICE9IG51bGwpIHtcbiAgICAgICAgdmlld0NlbnRlclggPSAodmlld3BvcnQuY2VudGVyLnggLSBteVBvcy54KSAqIHNjYWxlO1xuICAgICAgICB2aWV3Q2VudGVyWSA9ICh2aWV3cG9ydC5jZW50ZXIueSAtIG15UG9zLnkpICogc2NhbGU7XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHt9XG4gIGVudGl0aWVzLmZvckVhY2godGFyZ2V0RW50aXR5ID0+IHtcbiAgICBjb25zdCBkZWx0YVggPSB0YXJnZXRFbnRpdHkueCAtIG15UG9zLng7XG4gICAgY29uc3QgZGVsdGFZID0gdGFyZ2V0RW50aXR5LnkgLSBteVBvcy55O1xuICAgIGNvbnN0IHNjcmVlblBvc1ggPSBvZmZzZXRYICsgZGVsdGFYICogc2NhbGUgLSB2aWV3Q2VudGVyWDtcbiAgICBjb25zdCBzY3JlZW5Qb3NZID0gb2Zmc2V0WSArIGRlbHRhWSAqIHNjYWxlIC0gdmlld0NlbnRlclk7XG4gICAgY29uc3QgaXNUcmFja2VkID0gdHJhY2tlZElkICYmIHRhcmdldEVudGl0eS5pZCA9PT0gdHJhY2tlZElkO1xuICAgIGNvbnN0IGJveFNpemUgPSAyMDtcbiAgICBsZXQgZXNwQ29sb3I7XG4gICAgaWYgKGVzcE1vZGUgPT09IFwicGxheWVyc1wiKSB7XG4gICAgICBlc3BDb2xvciA9IGlzVHJhY2tlZCA/IHdpbmRvdy5lc3BDb2xvcnMudHJhY2tlZCA6IHRhcmdldEVudGl0eS5kaXN0YW5jZSA8IDUwMCA/IHdpbmRvdy5lc3BDb2xvcnMuY2xvc2UgOiB0YXJnZXRFbnRpdHkuZGlzdGFuY2UgPCAxNTAwID8gd2luZG93LmVzcENvbG9ycy5tZWRpdW0gOiB0YXJnZXRFbnRpdHkuZGlzdGFuY2UgPCAzMDAwID8gd2luZG93LmVzcENvbG9ycy5mYXIgOiB3aW5kb3cuZXNwQ29sb3JzLnZlcnlGYXI7XG4gICAgICBjdHguc3Ryb2tlU3R5bGUgPSBlc3BDb2xvcjtcbiAgICAgIGN0eC5saW5lV2lkdGggPSBpc1RyYWNrZWQgPyAzIDogMjtcbiAgICAgIGN0eC5zdHJva2VSZWN0KHNjcmVlblBvc1ggLSBib3hTaXplIC8gMiwgc2NyZWVuUG9zWSAtIGJveFNpemUgLyAyLCBib3hTaXplLCBib3hTaXplKTtcbiAgICAgIGN0eC5maWxsU3R5bGUgPSBlc3BDb2xvcjtcbiAgICAgIGN0eC5mb250ID0gXCJib2xkIDExcHggbW9ub3NwYWNlXCI7XG4gICAgICBjdHguZmlsbFRleHQodGFyZ2V0RW50aXR5LmVudGl0eT8uZW50aXR5TmFtZSB8fCB0YXJnZXRFbnRpdHkuZW50aXR5Py5uYW1lIHx8IFwiSUQ6XCIgKyB0YXJnZXRFbnRpdHkuaWQsIHNjcmVlblBvc1ggLSBib3hTaXplIC8gMiwgc2NyZWVuUG9zWSAtIGJveFNpemUgLyAyIC0gOCk7XG4gICAgICBjdHguZm9udCA9IFwiMTBweCBtb25vc3BhY2VcIjtcbiAgICAgIGN0eC5maWxsVGV4dChNYXRoLnJvdW5kKHRhcmdldEVudGl0eS5kaXN0YW5jZSkudG9TdHJpbmcoKSwgc2NyZWVuUG9zWCAtIGJveFNpemUgLyAyLCBzY3JlZW5Qb3NZICsgYm94U2l6ZSAvIDIgKyAxMyk7XG4gICAgICBpZiAodGFyZ2V0RW50aXR5LmVudGl0eT8udmlzaWJsZUZpc2hMZXZlbCAhPSBudWxsKSB7XG4gICAgICAgIGN0eC5maWxsVGV4dChcIkx2bDpcIiArIHRhcmdldEVudGl0eS5lbnRpdHkudmlzaWJsZUZpc2hMZXZlbCwgc2NyZWVuUG9zWCAtIGJveFNpemUgLyAyLCBzY3JlZW5Qb3NZICsgYm94U2l6ZSAvIDIgKyAyNCk7XG4gICAgICB9XG4gICAgICBpZiAod2luZG93LmxvY2tFbmFibGVkICYmIHdpbmRvdy5sb2NrVGFyZ2V0SWQgPT09IHRhcmdldEVudGl0eS5pZCkge1xuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcIiNmZjAwMDBcIjtcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDI7XG4gICAgICAgIGNvbnN0IGJveE9mZnNldCA9IDE1O1xuICAgICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICAgIGN0eC5tb3ZlVG8oc2NyZWVuUG9zWCAtIGJveE9mZnNldCwgc2NyZWVuUG9zWSk7XG4gICAgICAgIGN0eC5saW5lVG8oc2NyZWVuUG9zWCArIGJveE9mZnNldCwgc2NyZWVuUG9zWSk7XG4gICAgICAgIGN0eC5tb3ZlVG8oc2NyZWVuUG9zWCwgc2NyZWVuUG9zWSAtIGJveE9mZnNldCk7XG4gICAgICAgIGN0eC5saW5lVG8oc2NyZWVuUG9zWCwgc2NyZWVuUG9zWSArIGJveE9mZnNldCk7XG4gICAgICAgIGN0eC5zdHJva2UoKTtcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICBjdHguYXJjKHNjcmVlblBvc1gsIHNjcmVlblBvc1ksIGJveE9mZnNldCwgMCwgTWF0aC5QSSAqIDIpO1xuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMjU1LDAsMCwwLjcpXCI7XG4gICAgICAgIGN0eC5zdHJva2UoKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwiI2ZmMDAwMFwiO1xuICAgICAgICBjdHguZm9udCA9IFwiYm9sZCAxMHB4IG1vbm9zcGFjZVwiO1xuICAgICAgICBjdHguZmlsbFRleHQoXCJMT0NLRURcIiwgc2NyZWVuUG9zWCArIGJveE9mZnNldCArIDQsIHNjcmVlblBvc1kgLSA0KTtcbiAgICAgIH1cbiAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgIGN0eC5tb3ZlVG8ob2Zmc2V0WCwgb2Zmc2V0WSk7XG4gICAgICBjdHgubGluZVRvKHNjcmVlblBvc1gsIHNjcmVlblBvc1kpO1xuICAgICAgY3R4LnN0cm9rZVN0eWxlID0gZXNwQ29sb3I7XG4gICAgICBjdHguZ2xvYmFsQWxwaGEgPSAwLjI1O1xuICAgICAgY3R4LmxpbmVXaWR0aCA9IDE7XG4gICAgICBjdHguc3Ryb2tlKCk7XG4gICAgICBjdHguZ2xvYmFsQWxwaGEgPSAxO1xuICAgIH0gZWxzZSB7XG4gICAgICBlc3BDb2xvciA9IHRhcmdldEVudGl0eS5kaXN0YW5jZSA8IDMwMCA/IHdpbmRvdy5lc3BDb2xvcnMuZm9vZENsb3NlIDogdGFyZ2V0RW50aXR5LmRpc3RhbmNlIDwgMTAwMCA/IHdpbmRvdy5lc3BDb2xvcnMuZm9vZE1lZGl1bSA6IHdpbmRvdy5lc3BDb2xvcnMuZm9vZEZhcjtcbiAgICAgIGN0eC5zdHJva2VTdHlsZSA9IGVzcENvbG9yO1xuICAgICAgY3R4LmxpbmVXaWR0aCA9IDEuNTtcbiAgICAgIGN0eC5zdHJva2VSZWN0KHNjcmVlblBvc1ggLSBib3hTaXplIC8gMiwgc2NyZWVuUG9zWSAtIGJveFNpemUgLyAyLCBib3hTaXplLCBib3hTaXplKTtcbiAgICAgIGlmICh0YXJnZXRFbnRpdHkuZGlzdGFuY2UgPCAxMDAwKSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBlc3BDb2xvcjtcbiAgICAgICAgY3R4LmZvbnQgPSBcIjlweCBtb25vc3BhY2VcIjtcbiAgICAgICAgY3R4LmZpbGxUZXh0KE1hdGgucm91bmQodGFyZ2V0RW50aXR5LmRpc3RhbmNlKS50b1N0cmluZygpLCBzY3JlZW5Qb3NYICsgYm94U2l6ZSAvIDIgKyAzLCBzY3JlZW5Qb3NZICsgMyk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cbmZ1bmN0aW9uIGRyYXdUcmFja2VyTGluZShjdHgsIGNhbnZhcywgcGxheWVyUG9zLCB6b29tU2NhbGUpIHtcbiAgaWYgKCF3aW5kb3cuZXNwVHJhY2tlZEVudGl0eUlkKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHRyYWNrZWRFbnRpdHkgPSBmaW5kRW50aXR5QnlJZCh3aW5kb3cuZXNwVHJhY2tlZEVudGl0eUlkKTtcbiAgaWYgKCF0cmFja2VkRW50aXR5KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghaXNWYWxpZEVudGl0eSh0cmFja2VkRW50aXR5KSkge1xuICAgIHdpbmRvdy5lc3BUcmFja2VkRW50aXR5SWQgPSBudWxsO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBlbnRpdHlQb3MgPSBleHRyYWN0UG9zaXRpb24odHJhY2tlZEVudGl0eSk7XG4gIGlmICghZW50aXR5UG9zIHx8ICFwbGF5ZXJQb3MpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgY2VudGVyWCA9IGNhbnZhcy53aWR0aCAvIDI7XG4gIGNvbnN0IGNlbnRlclkgPSBjYW52YXMuaGVpZ2h0IC8gMjtcbiAgY29uc3QgZGlmZlggPSBlbnRpdHlQb3MueCAtIHBsYXllclBvcy54O1xuICBjb25zdCBkaWZmWSA9IGVudGl0eVBvcy55IC0gcGxheWVyUG9zLnk7XG4gIGNvbnN0IHRhcmdldFggPSBjZW50ZXJYICsgZGlmZlggKiB6b29tU2NhbGU7XG4gIGNvbnN0IHRhcmdldFkgPSBjZW50ZXJZICsgZGlmZlkgKiB6b29tU2NhbGU7XG4gIGNvbnN0IGRpc3RhbmNlID0gY2FsY3VsYXRlRGlzdGFuY2UocGxheWVyUG9zLngsIHBsYXllclBvcy55LCBlbnRpdHlQb3MueCwgZW50aXR5UG9zLnkpO1xuICBjb25zdCBlbnRpdHlEaXIgPSBjYWxjdWxhdGVEaXJlY3Rpb24odHJhY2tlZEVudGl0eSk7XG4gIGNvbnN0IHB1bHNlID0gTWF0aC5zaW4oRGF0ZS5ub3coKSAvIDIwMCkgKiAwLjMgKyAwLjc7XG4gIGNvbnN0IG1hcmtlclNpemUgPSA0MDtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBjdHgubW92ZVRvKGNlbnRlclgsIGNlbnRlclkpO1xuICBjdHgubGluZVRvKHRhcmdldFgsIHRhcmdldFkpO1xuICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoMjU1LDAsMjU1LDAuNilcIjtcbiAgY3R4LmxpbmVXaWR0aCA9IDI7XG4gIGN0eC5zZXRMaW5lRGFzaChbOCwgNF0pO1xuICBjdHguc3Ryb2tlKCk7XG4gIGN0eC5zZXRMaW5lRGFzaChbXSk7XG4gIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSgyNTUsMCwyNTUsXCIgKyBwdWxzZSArIFwiKVwiO1xuICBjdHgubGluZVdpZHRoID0gMztcbiAgY3R4LnN0cm9rZVJlY3QodGFyZ2V0WCAtIG1hcmtlclNpemUgLyAyLCB0YXJnZXRZIC0gbWFya2VyU2l6ZSAvIDIsIG1hcmtlclNpemUsIG1hcmtlclNpemUpO1xuICBjb25zdCBhcnJvd0xlbmd0aCA9IDUwO1xuICBjb25zdCBhbmdsZSA9IE1hdGguYXRhbjIoZW50aXR5RGlyLmRpclksIGVudGl0eURpci5kaXJYKTtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBjdHgubW92ZVRvKHRhcmdldFgsIHRhcmdldFkpO1xuICBjdHgubGluZVRvKHRhcmdldFggKyBlbnRpdHlEaXIuZGlyWCAqIGFycm93TGVuZ3RoLCB0YXJnZXRZICsgZW50aXR5RGlyLmRpclkgKiBhcnJvd0xlbmd0aCk7XG4gIGN0eC5zdHJva2VTdHlsZSA9IFwiI2ZmMDBmZlwiO1xuICBjdHgubGluZVdpZHRoID0gMjtcbiAgY3R4LnN0cm9rZSgpO1xuICBjdHguYmVnaW5QYXRoKCk7XG4gIGN0eC5tb3ZlVG8odGFyZ2V0WCArIGVudGl0eURpci5kaXJYICogYXJyb3dMZW5ndGgsIHRhcmdldFkgKyBlbnRpdHlEaXIuZGlyWSAqIGFycm93TGVuZ3RoKTtcbiAgY3R4LmxpbmVUbyh0YXJnZXRYICsgZW50aXR5RGlyLmRpclggKiBhcnJvd0xlbmd0aCAtIE1hdGguY29zKGFuZ2xlIC0gMC40KSAqIDEwLCB0YXJnZXRZICsgZW50aXR5RGlyLmRpclkgKiBhcnJvd0xlbmd0aCAtIE1hdGguc2luKGFuZ2xlIC0gMC40KSAqIDEwKTtcbiAgY3R4Lm1vdmVUbyh0YXJnZXRYICsgZW50aXR5RGlyLmRpclggKiBhcnJvd0xlbmd0aCwgdGFyZ2V0WSArIGVudGl0eURpci5kaXJZICogYXJyb3dMZW5ndGgpO1xuICBjdHgubGluZVRvKHRhcmdldFggKyBlbnRpdHlEaXIuZGlyWCAqIGFycm93TGVuZ3RoIC0gTWF0aC5jb3MoYW5nbGUgKyAwLjQpICogMTAsIHRhcmdldFkgKyBlbnRpdHlEaXIuZGlyWSAqIGFycm93TGVuZ3RoIC0gTWF0aC5zaW4oYW5nbGUgKyAwLjQpICogMTApO1xuICBjdHguc3Ryb2tlU3R5bGUgPSBcIiNmZjAwZmZcIjtcbiAgY3R4LmxpbmVXaWR0aCA9IDI7XG4gIGN0eC5zdHJva2UoKTtcbiAgY29uc3QgcmVjdFdpZHRoID0gMTgwO1xuICBjb25zdCByZWN0SGVpZ2h0ID0gNzA7XG4gIGNvbnN0IHJlY3RYID0gTWF0aC5taW4odGFyZ2V0WCArIG1hcmtlclNpemUgLyAyICsgMTAsIGNhbnZhcy53aWR0aCAtIHJlY3RXaWR0aCAtIDUpO1xuICBjb25zdCByZWN0WSA9IE1hdGgubWF4KDUsIE1hdGgubWluKHRhcmdldFkgLSByZWN0SGVpZ2h0IC8gMiwgY2FudmFzLmhlaWdodCAtIHJlY3RIZWlnaHQgLSA1KSk7XG4gIGN0eC5maWxsU3R5bGUgPSBcInJnYmEoMCwwLDAsMC44NSlcIjtcbiAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDI1NSwwLDI1NSxcIiArIHB1bHNlICsgXCIpXCI7XG4gIGN0eC5saW5lV2lkdGggPSAxLjU7XG4gIGN0eC5iZWdpblBhdGgoKTtcbiAgY3R4LnJvdW5kUmVjdChyZWN0WCwgcmVjdFksIHJlY3RXaWR0aCwgcmVjdEhlaWdodCwgNCk7XG4gIGN0eC5maWxsKCk7XG4gIGN0eC5zdHJva2UoKTtcbiAgY3R4LmZpbGxTdHlsZSA9IFwiI2ZmMDBmZlwiO1xuICBjdHguZm9udCA9IFwiYm9sZCAxMnB4IG1vbm9zcGFjZVwiO1xuICBjdHguZmlsbFRleHQoXCJUUkFDS0lOR1wiLCByZWN0WCArIDgsIHJlY3RZICsgMTgpO1xuICBjdHguZmlsbFN0eWxlID0gXCIjZmZmZmZmXCI7XG4gIGN0eC5mb250ID0gXCIxMXB4IG1vbm9zcGFjZVwiO1xuICBjdHguZmlsbFRleHQoKHRyYWNrZWRFbnRpdHkubmFtZSB8fCBcIkVudGl0eSBcIiArIHdpbmRvdy5lc3BUcmFja2VkRW50aXR5SWQpLnN1YnN0cmluZygwLCAxOCksIHJlY3RYICsgOCwgcmVjdFkgKyAzNCk7XG4gIGN0eC5maWxsU3R5bGUgPSBcIiNmZjAwZmZcIjtcbiAgY3R4LmZvbnQgPSBcImJvbGQgMTRweCBtb25vc3BhY2VcIjtcbiAgY3R4LmZpbGxUZXh0KE1hdGgucm91bmQoZGlzdGFuY2UpICsgXCIgdW5pdHNcIiwgcmVjdFggKyA4LCByZWN0WSArIDUyKTtcbiAgaWYgKHRhcmdldFggPCAwIHx8IHRhcmdldFggPiBjYW52YXMud2lkdGggfHwgdGFyZ2V0WSA8IDAgfHwgdGFyZ2V0WSA+IGNhbnZhcy5oZWlnaHQpIHtcbiAgICBjb25zdCBhcnJvd0FuZ2xlID0gTWF0aC5hdGFuMih0YXJnZXRZIC0gY2VudGVyWSwgdGFyZ2V0WCAtIGNlbnRlclgpO1xuICAgIGNvbnN0IGFycm93Q2VudGVyWCA9IGNlbnRlclggKyBNYXRoLmNvcyhhcnJvd0FuZ2xlKSAqIChjYW52YXMud2lkdGggLyAyIC0gNDApO1xuICAgIGNvbnN0IGFycm93Q2VudGVyWSA9IGNlbnRlclkgKyBNYXRoLnNpbihhcnJvd0FuZ2xlKSAqIChjYW52YXMuaGVpZ2h0IC8gMiAtIDQwKTtcbiAgICBjdHguZmlsbFN0eWxlID0gXCJyZ2JhKDAsMCwwLDAuODUpXCI7XG4gICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgIGN0eC5yb3VuZFJlY3QoYXJyb3dDZW50ZXJYIC0gNDAsIGFycm93Q2VudGVyWSAtIDE1LCA4MCwgMzAsIDQpO1xuICAgIGN0eC5maWxsKCk7XG4gICAgY3R4LnN0cm9rZVN0eWxlID0gXCIjZmYwMGZmXCI7XG4gICAgY3R4LmxpbmVXaWR0aCA9IDEuNTtcbiAgICBjdHguc3Ryb2tlKCk7XG4gICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgIGN0eC5tb3ZlVG8oYXJyb3dDZW50ZXJYICsgTWF0aC5jb3MoYXJyb3dBbmdsZSkgKiAyMCwgYXJyb3dDZW50ZXJZICsgTWF0aC5zaW4oYXJyb3dBbmdsZSkgKiAyMCk7XG4gICAgY3R4LmxpbmVUbyhhcnJvd0NlbnRlclggLSBNYXRoLmNvcyhhcnJvd0FuZ2xlIC0gMC41KSAqIDEwLCBhcnJvd0NlbnRlclkgLSBNYXRoLnNpbihhcnJvd0FuZ2xlIC0gMC41KSAqIDEwKTtcbiAgICBjdHgubGluZVRvKGFycm93Q2VudGVyWCAtIE1hdGguY29zKGFycm93QW5nbGUgKyAwLjUpICogMTAsIGFycm93Q2VudGVyWSAtIE1hdGguc2luKGFycm93QW5nbGUgKyAwLjUpICogMTApO1xuICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgICBjdHguZmlsbFN0eWxlID0gXCIjZmYwMGZmXCI7XG4gICAgY3R4LmZpbGwoKTtcbiAgICBjdHguZmlsbFN0eWxlID0gXCIjZmZmZmZmXCI7XG4gICAgY3R4LmZvbnQgPSBcImJvbGQgMTFweCBtb25vc3BhY2VcIjtcbiAgICBjdHgudGV4dEFsaWduID0gXCJjZW50ZXJcIjtcbiAgICBjdHguZmlsbFRleHQoTWF0aC5yb3VuZChkaXN0YW5jZSkudG9TdHJpbmcoKSwgYXJyb3dDZW50ZXJYLCBhcnJvd0NlbnRlclkgKyA0KTtcbiAgICBjdHgudGV4dEFsaWduID0gXCJsZWZ0XCI7XG4gIH1cbn1cbmZ1bmN0aW9uIGRyYXdSYWRhcihjdHgsIGNhbnZhcywgZ2FtZVN0YXRlKSB7XG4gIGlmICghZ2FtZVN0YXRlIHx8IGdhbWVTdGF0ZS5lcnJvcikge1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCByYWRhclNpemUgPSAxNTA7XG4gIGlmIChkcmFnU3RhdGUueCA9PT0gbnVsbCkge1xuICAgIGRyYWdTdGF0ZS54ID0gY2FudmFzLndpZHRoIC0gcmFkYXJTaXplIC0gMjA7XG4gIH1cbiAgY29uc3QgcmFkYXJYID0gZHJhZ1N0YXRlLng7XG4gIGNvbnN0IHJhZGFyWSA9IGRyYWdTdGF0ZS55O1xuICBjb25zdCB3b3JsZFNjYWxlID0gNTAwMDtcbiAgY29uc3QgcGl4ZWxTY2FsZSA9IHJhZGFyU2l6ZSAvICh3b3JsZFNjYWxlICogMik7XG4gIHdpbmRvdy5fcmFkYXJCb3VuZHMgPSB7XG4gICAgeDogcmFkYXJYLFxuICAgIHk6IHJhZGFyWSxcbiAgICB3OiByYWRhclNpemUsXG4gICAgaDogcmFkYXJTaXplICsgMjJcbiAgfTtcbiAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYSgyMCwyMCwyMCwwLjkpXCI7XG4gIGN0eC5iZWdpblBhdGgoKTtcbiAgY3R4LnJvdW5kUmVjdChyYWRhclgsIHJhZGFyWSwgcmFkYXJTaXplLCByYWRhclNpemUsIDQpO1xuICBjdHguZmlsbCgpO1xuICBjdHguc3Ryb2tlU3R5bGUgPSBcIiMzMzNcIjtcbiAgY3R4LmxpbmVXaWR0aCA9IDE7XG4gIGN0eC5zdHJva2UoKTtcbiAgY3R4LnN0cm9rZVN0eWxlID0gXCJyZ2JhKDYwLDYwLDYwLDAuNSlcIjtcbiAgY3R4LmxpbmVXaWR0aCA9IDAuNTtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBjdHgubW92ZVRvKHJhZGFyWCArIHJhZGFyU2l6ZSAvIDIsIHJhZGFyWSk7XG4gIGN0eC5saW5lVG8ocmFkYXJYICsgcmFkYXJTaXplIC8gMiwgcmFkYXJZICsgcmFkYXJTaXplKTtcbiAgY3R4Lm1vdmVUbyhyYWRhclgsIHJhZGFyWSArIHJhZGFyU2l6ZSAvIDIpO1xuICBjdHgubGluZVRvKHJhZGFyWCArIHJhZGFyU2l6ZSwgcmFkYXJZICsgcmFkYXJTaXplIC8gMik7XG4gIGN0eC5zdHJva2UoKTtcbiAgZm9yIChsZXQgY2lyY2xlUmFkaXVzRmFjdG9yID0gMC4yNTsgY2lyY2xlUmFkaXVzRmFjdG9yIDw9IDE7IGNpcmNsZVJhZGl1c0ZhY3RvciArPSAwLjI1KSB7XG4gICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgIGN0eC5hcmMocmFkYXJYICsgcmFkYXJTaXplIC8gMiwgcmFkYXJZICsgcmFkYXJTaXplIC8gMiwgcmFkYXJTaXplIC8gMiAqIGNpcmNsZVJhZGl1c0ZhY3RvciwgMCwgTWF0aC5QSSAqIDIpO1xuICAgIGN0eC5zdHJva2VTdHlsZSA9IFwicmdiYSg2MCw2MCw2MCxcIiArICgwLjIgKyBjaXJjbGVSYWRpdXNGYWN0b3IgKiAwLjEpICsgXCIpXCI7XG4gICAgY3R4LnN0cm9rZSgpO1xuICB9XG4gIGN0eC5maWxsU3R5bGUgPSBcIiMxZGI5NTRcIjtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBjdHguYXJjKHJhZGFyWCArIHJhZGFyU2l6ZSAvIDIsIHJhZGFyWSArIHJhZGFyU2l6ZSAvIDIsIDQsIDAsIE1hdGguUEkgKiAyKTtcbiAgY3R4LmZpbGwoKTtcbiAgY29uc3QgZW50aXRpZXNUb0RyYXcgPSB3aW5kb3cuZXNwTW9kZSA9PT0gXCJwbGF5ZXJzXCIgPyBnYW1lU3RhdGUucGxheWVycyB8fCBbXSA6IGdhbWVTdGF0ZS5mb29kIHx8IFtdO1xuICBlbnRpdGllc1RvRHJhdy5mb3JFYWNoKHRhcmdldEVudGl0eSA9PiB7XG4gICAgY29uc3QgZGlmZlggPSB0YXJnZXRFbnRpdHkueCAtIGdhbWVTdGF0ZS5teVBvcy54O1xuICAgIGNvbnN0IGRpZmZZID0gdGFyZ2V0RW50aXR5LnkgLSBnYW1lU3RhdGUubXlQb3MueTtcbiAgICBsZXQgc2NyZWVuWCA9IE1hdGgubWF4KHJhZGFyWCArIDIsIE1hdGgubWluKHJhZGFyWCArIHJhZGFyU2l6ZSAtIDIsIHJhZGFyWCArIHJhZGFyU2l6ZSAvIDIgKyBkaWZmWCAqIHBpeGVsU2NhbGUpKTtcbiAgICBsZXQgc2NyZWVuWSA9IE1hdGgubWF4KHJhZGFyWSArIDIsIE1hdGgubWluKHJhZGFyWSArIHJhZGFyU2l6ZSAtIDIsIHJhZGFyWSArIHJhZGFyU2l6ZSAvIDIgKyBkaWZmWSAqIHBpeGVsU2NhbGUpKTtcbiAgICBsZXQgZXNwQ29sb3I7XG4gICAgbGV0IGNpcmNsZVJhZGl1cztcbiAgICBpZiAod2luZG93LmVzcE1vZGUgPT09IFwicGxheWVyc1wiKSB7XG4gICAgICBlc3BDb2xvciA9IHRhcmdldEVudGl0eS5kaXN0YW5jZSA8IDUwMCA/IHdpbmRvdy5lc3BDb2xvcnMuY2xvc2UgOiB0YXJnZXRFbnRpdHkuZGlzdGFuY2UgPCAxNTAwID8gd2luZG93LmVzcENvbG9ycy5tZWRpdW0gOiB0YXJnZXRFbnRpdHkuZGlzdGFuY2UgPCAzMDAwID8gd2luZG93LmVzcENvbG9ycy5mYXIgOiBcIiM4ODhcIjtcbiAgICAgIGNpcmNsZVJhZGl1cyA9IDM7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVzcENvbG9yID0gd2luZG93LmVzcENvbG9ycy5mb29kQ2xvc2U7XG4gICAgICBjaXJjbGVSYWRpdXMgPSAxLjU7XG4gICAgfVxuICAgIGlmICh3aW5kb3cuZXNwVHJhY2tlZEVudGl0eUlkICYmIHRhcmdldEVudGl0eS5pZCA9PT0gd2luZG93LmVzcFRyYWNrZWRFbnRpdHlJZCkge1xuICAgICAgZXNwQ29sb3IgPSB3aW5kb3cuZXNwQ29sb3JzLnRyYWNrZWQ7XG4gICAgICBjaXJjbGVSYWRpdXMgPSA0O1xuICAgIH1cbiAgICBpZiAod2luZG93LmxvY2tUYXJnZXRJZCAmJiB0YXJnZXRFbnRpdHkuaWQgPT09IHdpbmRvdy5sb2NrVGFyZ2V0SWQpIHtcbiAgICAgIGVzcENvbG9yID0gXCIjZmYwMDAwXCI7XG4gICAgICBjaXJjbGVSYWRpdXMgPSA0O1xuICAgIH1cbiAgICBjdHguZmlsbFN0eWxlID0gZXNwQ29sb3I7XG4gICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgIGN0eC5hcmMoc2NyZWVuWCwgc2NyZWVuWSwgY2lyY2xlUmFkaXVzLCAwLCBNYXRoLlBJICogMik7XG4gICAgY3R4LmZpbGwoKTtcbiAgfSk7XG4gIGlmICh3aW5kb3cuZW50aXR5VHJhaWxFbmFibGVkICYmIHdpbmRvdy5lbnRpdHlUcmFpbFRhcmdldElkKSB7XG4gICAgY29uc3QgdGFyZ2V0RW50aXR5SWQgPSBmaW5kRW50aXR5QnlJZCh3aW5kb3cuZW50aXR5VHJhaWxUYXJnZXRJZCk7XG4gICAgaWYgKHRhcmdldEVudGl0eUlkKSB7XG4gICAgICBjb25zdCB0YXJnZXRFbnRpdHkgPSBleHRyYWN0UG9zaXRpb24odGFyZ2V0RW50aXR5SWQpO1xuICAgICAgaWYgKHRhcmdldEVudGl0eSkge1xuICAgICAgICBjb25zdCBkZWx0YVggPSB0YXJnZXRFbnRpdHkueCAtIGdhbWVTdGF0ZS5teVBvcy54O1xuICAgICAgICBjb25zdCBkZWx0YVkgPSB0YXJnZXRFbnRpdHkueSAtIGdhbWVTdGF0ZS5teVBvcy55O1xuICAgICAgICBjb25zdCBjYW52YXNYID0gTWF0aC5tYXgocmFkYXJYICsgMiwgTWF0aC5taW4ocmFkYXJYICsgcmFkYXJTaXplIC0gMiwgcmFkYXJYICsgcmFkYXJTaXplIC8gMiArIGRlbHRhWCAqIHBpeGVsU2NhbGUpKTtcbiAgICAgICAgY29uc3QgY2FudmFzWSA9IE1hdGgubWF4KHJhZGFyWSArIDIsIE1hdGgubWluKHJhZGFyWSArIHJhZGFyU2l6ZSAtIDIsIHJhZGFyWSArIHJhZGFyU2l6ZSAvIDIgKyBkZWx0YVkgKiBwaXhlbFNjYWxlKSk7XG4gICAgICAgIGNvbnN0IG9wYWNpdHlQdWxzZSA9IE1hdGguc2luKERhdGUubm93KCkgLyAyMDApICogMC4zICsgMC43O1xuICAgICAgICBjb25zdCB7XG4gICAgICAgICAgcjogY29sb3JSZWQsXG4gICAgICAgICAgZzogY29sb3JHcmVlbixcbiAgICAgICAgICBiOiBjb2xvckJsdWVcbiAgICAgICAgfSA9IHdpbmRvdy5lbnRpdHlUcmFpbENvbG9yO1xuICAgICAgICBjb25zdCByZ2JTdHJpbmcgPSBjb2xvclJlZCArIFwiLFwiICsgY29sb3JHcmVlbiArIFwiLFwiICsgY29sb3JCbHVlO1xuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoXCIgKyByZ2JTdHJpbmcgKyBcIixcIiArIG9wYWNpdHlQdWxzZSArIFwiKVwiO1xuICAgICAgICBjdHgubGluZVdpZHRoID0gMjtcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICBjdHguYXJjKGNhbnZhc1gsIGNhbnZhc1ksIDcsIDAsIE1hdGguUEkgKiAyKTtcbiAgICAgICAgY3R4LnN0cm9rZSgpO1xuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoXCIgKyByZ2JTdHJpbmcgKyBcIixcIiArIG9wYWNpdHlQdWxzZSAqIDAuNSArIFwiKVwiO1xuICAgICAgICBjdHgubGluZVdpZHRoID0gNDtcbiAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICBjdHguYXJjKGNhbnZhc1gsIGNhbnZhc1ksIDEwLCAwLCBNYXRoLlBJICogMik7XG4gICAgICAgIGN0eC5zdHJva2UoKTtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9IFwicmdiKFwiICsgcmdiU3RyaW5nICsgXCIpXCI7XG4gICAgICAgIGN0eC5iZWdpblBhdGgoKTtcbiAgICAgICAgY3R4LmFyYyhjYW52YXNYLCBjYW52YXNZLCAzLCAwLCBNYXRoLlBJICogMik7XG4gICAgICAgIGN0eC5maWxsKCk7XG4gICAgICAgIGlmICh3aW5kb3cuZW50aXR5VHJhaWxIaXN0b3J5Lmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBcInJnYmEoXCIgKyByZ2JTdHJpbmcgKyBcIiwwLjMpXCI7XG4gICAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDE7XG4gICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICAgIHdpbmRvdy5lbnRpdHlUcmFpbEhpc3RvcnkuZm9yRWFjaCgoZW50aXR5LCBlbnRpdHlJbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgZHJhd1ggPSBNYXRoLm1heChyYWRhclggKyAyLCBNYXRoLm1pbihyYWRhclggKyByYWRhclNpemUgLSAyLCByYWRhclggKyByYWRhclNpemUgLyAyICsgKGVudGl0eS54IC0gZ2FtZVN0YXRlLm15UG9zLngpICogcGl4ZWxTY2FsZSkpO1xuICAgICAgICAgICAgY29uc3QgZHJhd1kgPSBNYXRoLm1heChyYWRhclkgKyAyLCBNYXRoLm1pbihyYWRhclkgKyByYWRhclNpemUgLSAyLCByYWRhclkgKyByYWRhclNpemUgLyAyICsgKGVudGl0eS55IC0gZ2FtZVN0YXRlLm15UG9zLnkpICogcGl4ZWxTY2FsZSkpO1xuICAgICAgICAgICAgaWYgKGVudGl0eUluZGV4ID09PSAwKSB7XG4gICAgICAgICAgICAgIGN0eC5tb3ZlVG8oZHJhd1gsIGRyYXdZKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGN0eC5saW5lVG8oZHJhd1gsIGRyYXdZKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcbiAgICAgICAgICBjdHguc3Ryb2tlKCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgY3R4LmZpbGxTdHlsZSA9IFwicmdiYSgyMCwyMCwyMCwwLjkpXCI7XG4gIGN0eC5iZWdpblBhdGgoKTtcbiAgY3R4LnJvdW5kUmVjdChyYWRhclgsIHJhZGFyWSArIHJhZGFyU2l6ZSwgcmFkYXJTaXplLCAyMiwgWzAsIDAsIDQsIDRdKTtcbiAgY3R4LmZpbGwoKTtcbiAgY3R4LmZpbGxTdHlsZSA9IFwiIzg4OFwiO1xuICBjdHguZm9udCA9IFwiMTBweCBtb25vc3BhY2VcIjtcbiAgY3R4LmZpbGxUZXh0KFwiUkFEQVJcIiwgcmFkYXJYICsgNSwgcmFkYXJZICsgcmFkYXJTaXplICsgMTQpO1xuICBjdHguZmlsbFRleHQoKHdpbmRvdy5lc3BNb2RlID09PSBcInBsYXllcnNcIiA/IFwiUDpcIiA6IFwiRjpcIikgKyBlbnRpdGllc1RvRHJhdy5sZW5ndGgsIHJhZGFyWCArIHJhZGFyU2l6ZSAtIDUwLCByYWRhclkgKyByYWRhclNpemUgKyAxNCk7XG59XG5mdW5jdGlvbiByZW5kZXJFc3BMb29wKCkge1xuICBpZiAoIXdpbmRvdy5lc3BFbmFibGVkKSB7XG4gICAgY29uc3Qgb3ZlcmxheUVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImVzcC1vdmVybGF5XCIpO1xuICAgIGlmIChvdmVybGF5RWxlbWVudCkge1xuICAgICAgb3ZlcmxheUVsZW1lbnQuZ2V0Q29udGV4dChcIjJkXCIpLmNsZWFyUmVjdCgwLCAwLCBvdmVybGF5RWxlbWVudC53aWR0aCwgb3ZlcmxheUVsZW1lbnQuaGVpZ2h0KTtcbiAgICB9XG4gICAgcmVxdWVzdEFuaW1hdGlvbkZyYW1lKHJlbmRlckVzcExvb3ApO1xuICAgIHJldHVybjtcbiAgfVxuICBjb25zdCBlc3BDYW52YXMgPSBnZXRPckNyZWF0ZUNhbnZhcyhcImVzcC1vdmVybGF5XCIsIDk5OTk5OCk7XG4gIGNvbnN0IGVzcEN0eCA9IGVzcENhbnZhcy5nZXRDb250ZXh0KFwiMmRcIik7XG4gIGVzcEN0eC5jbGVhclJlY3QoMCwgMCwgZXNwQ2FudmFzLndpZHRoLCBlc3BDYW52YXMuaGVpZ2h0KTtcbiAgY29uc3QgY3VycmVudEdhbWVTdGF0ZSA9IGJ1aWxkRW50aXR5U3RhdGUoKTtcbiAgY29uc3QgcGxheWVyRGF0YSA9IGdldEFuaW1hbFBvc2l0aW9uKCk7XG4gIGNvbnN0IHJlbmRlclNldHRpbmdzID0gZ2V0Vmlld3BvcnRTY2FsZSgpO1xuICBkcmF3RVNQKGVzcEN0eCwgY3VycmVudEdhbWVTdGF0ZSwgZXNwQ2FudmFzLndpZHRoIC8gMiwgZXNwQ2FudmFzLmhlaWdodCAvIDIsIHJlbmRlclNldHRpbmdzKTtcbiAgZHJhd1RyYWNrZXJMaW5lKGVzcEN0eCwgZXNwQ2FudmFzLCBwbGF5ZXJEYXRhLCByZW5kZXJTZXR0aW5ncyk7XG4gIGRyYXdSYWRhcihlc3BDdHgsIGVzcENhbnZhcywgY3VycmVudEdhbWVTdGF0ZSk7XG4gIHJlcXVlc3RBbmltYXRpb25GcmFtZShyZW5kZXJFc3BMb29wKTtcbn1cbmZ1bmN0aW9uIHRvZ2dsZUVzcCgpIHtcbiAgd2luZG93LmVzcEVuYWJsZWQgPSAhd2luZG93LmVzcEVuYWJsZWQ7XG4gIHNob3dOb3RpZmljYXRpb24od2luZG93LmVzcEVuYWJsZWQgPyBcIkVTUCBlbmFibGVkXCIgOiBcIkVTUCBkaXNhYmxlZFwiKTtcbn1cblxuZXhwb3J0IHsgdG9nZ2xlRW50aXR5VHJhaWwsIHJlZnJlc2hVSSwgZHJhd0VudGl0eVRyYWlsLCByZW5kZXJMb29wLCBkcmF3RVNQLCBkcmF3VHJhY2tlckxpbmUsIGRyYXdSYWRhciwgcmVuZGVyRXNwTG9vcCwgdG9nZ2xlRXNwIH07XG4iLCJpbXBvcnQgeyBzaW11bGF0ZVRleHRJbnB1dCwgc2hvd05vdGlmaWNhdGlvbiwgaW5pdEF1dG9maWxsTmFtZSwgdHlwZUNoYXRNZXNzYWdlLCBpbml0aWFsaXplVGV4dEludGVyY2VwdG9yLCBtYWtlRWxlbWVudERyYWdnYWJsZSwgc2hvd0hhbGxvd2VlbkNvZGVNb2RhbCB9IGZyb20gJy4vaW50ZXJhY3Rpb24uanMnO1xuaW1wb3J0IHsgc3RhcnRSZXBlYXRpbmdUYXNrLCBzdG9wQ2hhdFRpbWVyIH0gZnJvbSAnLi4vZmVhdHVyZXMvY2hhdC5qcyc7XG5pbXBvcnQgeyBnZW5lcmF0ZVJhbmRvbVN0cmluZyB9IGZyb20gJy4uL3V0aWxzLmpzJztcbmltcG9ydCB7IHRvZ2dsZUF1dG9Qb2ludGVyTW92ZW1lbnQsIHNpbXVsYXRlUG9pbnRlck1vdmUgfSBmcm9tICcuLi9mZWF0dXJlcy9tb3ZlbWVudC5qcyc7XG5pbXBvcnQgeyBpbml0QW50aURldGVjdGlvbiB9IGZyb20gJy4uL2ZlYXR1cmVzL2FudGlkZXRlY3Rpb24uanMnO1xuaW1wb3J0IHsgaW5pdGlhbGl6ZUFzdHJhVmlzaW9uIH0gZnJvbSAnLi4vZmVhdHVyZXMveHJheS5qcyc7XG5pbXBvcnQgeyB0b2dnbGVNaW5pbWFwU2l6ZSwgc2V0dXBQYXRyb2xSb3V0ZSwgc3RhcnRBdXRvRmFybSwgc3RvcEF1dG9GYXJtIH0gZnJvbSAnLi4vZmVhdHVyZXMvYXV0b2Zhcm0uanMnO1xuaW1wb3J0IHsgdG9nZ2xlRXNwLCB0b2dnbGVFbnRpdHlUcmFpbCB9IGZyb20gJy4uL2ZlYXR1cmVzL2VzcC5qcyc7XG5pbXBvcnQgeyB0cmFja05lYXJlc3RQbGF5ZXIsIGNsZWFyVHJhY2tpbmcsIHRvZ2dsZUxvY2ssIGVuYWJsZUF1dG9Eb2RnZSwgZGlzYWJsZUF1dG9Eb2RnZSB9IGZyb20gJy4uL2ZlYXR1cmVzL2FpbWJvdC5qcyc7XG5pbXBvcnQgeyBhcHBseVRoZW1lLCBpbml0QmFja2dyb3VuZEltYWdlIH0gZnJvbSAnLi90aGVtZS5qcyc7XG5pbXBvcnQgeyBhdWRpb1BsYXllciwgbXVzaWNQbGF5bGlzdCwgeW91dHViZVBsYXllciwgcGF1c2VQbGF5YmFjaywgcmVzdW1lUGxheWJhY2ssIHJlc2V0UGxheWJhY2ssIGlzUGxheWluZywgcGxheU5leHRPclJhbmRvbSwgcGxheVByZXZpb3VzLCB1cGRhdGVNdXNpY1BhbmVsLCB1aWF1ZGlvU3RhdGUgfSBmcm9tICcuL2F1ZGlvLmpzJztcbmltcG9ydCB7IGFkZFRyYWNrVG9QbGF5bGlzdCB9IGZyb20gJy4uL3N0b3JhZ2UuanMnO1xuaW1wb3J0IHsgc3RhdGUgfSBmcm9tICcuLi9jb3JlLmpzJztcblxud2luZG93LmxvY2tLZXkgPSBcInRcIjtcbndpbmRvdy5lbnRpdHlUcmFjZUtleSA9IFwiaFwiO1xuXG5cbmxldCBwcmVzc2VkS2V5USA9IFwicVwiO1xubGV0IHByZXNzZWRLZXlFID0gXCJlXCI7XG5mdW5jdGlvbiBjcmVhdGVUb29sc1BhbmVsKCkge1xuICBjb25zdCB0b29sc1BhbmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgdG9vbHNQYW5lbC5pZCA9IFwiZGVlcC10b29scy1wYW5lbFwiO1xuICB0b29sc1BhbmVsLmNsYXNzTmFtZSA9IFwiYXN0LXBhbmVsXCI7XG4gIHRvb2xzUGFuZWwuc3R5bGUuY3NzVGV4dCA9IFwiYm90dG9tOjIwcHg7cmlnaHQ6MjBweDt3aWR0aDoyMzBweDtcIjtcbiAgdG9vbHNQYW5lbC5pbm5lckhUTUwgPSBcIlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1oZWFkZXJcXFwiPjxzcGFuIGNsYXNzPVxcXCJhc3QtaGVhZGVyLXRpdGxlXFxcIj5Bc3RyYXBob2JpYSBDbGllbnQ8L3NwYW4+PGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWhlYWRlci1taW5cXFwiIGlkPVxcXCJtYWluTWluXFxcIj7iiJI8L2J1dHRvbj48L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJhc3QtYm9keVxcXCIgaWQ9XFxcIm1haW5Cb2R5XFxcIj5cXG4gICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVxcXCJhc3Qtc2VjdGlvbi1sYWJlbFxcXCI+QXV0b2ZpbGwgTmFtZTwvc3Bhbj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1yb3dcXFwiIHN0eWxlPVxcXCJtYXJnaW4tYm90dG9tOjZweDtcXFwiPlxcbiAgICAgICAgICA8aW5wdXQgY2xhc3M9XFxcImFzdC1pbnB1dFxcXCIgdHlwZT1cXFwidGV4dFxcXCIgaWQ9XFxcInNhdmVkTmFtZURpc3BsYXlcXFwiIHBsYWNlaG9sZGVyPVxcXCJFbnRlciBuYW1lLi4uXFxcIiBzdHlsZT1cXFwiZmxleDoxO1xcXCI+XFxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG5cXFwiIGlkPVxcXCJzZXROYW1lQnRuXFxcIiBzdHlsZT1cXFwid2lkdGg6NDBweDtwYWRkaW5nOjZweCA1cHg7bWFyZ2luOjA7ZmxleC1zaHJpbms6MDt0ZXh0LWFsaWduOmNlbnRlcjtcXFwiPlNldDwvYnV0dG9uPlxcbiAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuXFxcIiBpZD1cXFwiY2xlYXJOYW1lQnRuXFxcIiBzdHlsZT1cXFwid2lkdGg6MzBweDtwYWRkaW5nOjZweCA1cHg7bWFyZ2luOjA7ZmxleC1zaHJpbms6MDt0ZXh0LWFsaWduOmNlbnRlcjtcXFwiPuKclTwvYnV0dG9uPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8c3BhbiBjbGFzcz1cXFwiYXN0LXNlY3Rpb24tbGFiZWxcXFwiPkNoYXQ8L3NwYW4+XFxuICAgICAgICA8dGV4dGFyZWEgY2xhc3M9XFxcImFzdC10ZXh0YXJlYVxcXCIgaWQ9XFxcImNoYXRNc2dcXFwiIHBsYWNlaG9sZGVyPVxcXCJNZXNzYWdlLi4uXFxcIiByb3dzPVxcXCIyXFxcIj48L3RleHRhcmVhPlxcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgaWQ9XFxcInNlbmRCdG5cXFwiPlNlbmQgQ2hhdDwvYnV0dG9uPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LXJvd1xcXCIgc3R5bGU9XFxcIm1hcmdpbi10b3A6NHB4O1xcXCI+XFxuICAgICAgICAgIDxpbnB1dCBjbGFzcz1cXFwiYXN0LWlucHV0XFxcIiB0eXBlPVxcXCJudW1iZXJcXFwiIGlkPVxcXCJkZWxheUlucHV0XFxcIiBtaW49XFxcIjFcXFwiIG1heD1cXFwiMzAwXFxcIiB2YWx1ZT1cXFwiMTBcXFwiIHN0eWxlPVxcXCJ3aWR0aDo1MHB4O3RleHQtYWxpZ246Y2VudGVyO1xcXCI+XFxuICAgICAgICAgIDxzcGFuIHN0eWxlPVxcXCJmb250LXNpemU6MTFweDtjb2xvcjojODg4O1xcXCI+c2VjPC9zcGFuPlxcbiAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuXFxcIiBpZD1cXFwiYXV0b0NoYXRCdG5cXFwiIHN0eWxlPVxcXCJmbGV4OjE7bWFyZ2luLWJvdHRvbTowO1xcXCI+QXV0byBDaGF0PC9idXR0b24+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1zZXBcXFwiPjwvZGl2PlxcbiAgICAgICAgPHNwYW4gY2xhc3M9XFxcImFzdC1zZWN0aW9uLWxhYmVsXFxcIj5Ub29sczwvc3Bhbj5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG5cXFwiIGlkPVxcXCJwYXRjaEJ0blxcXCI+U3BlY2lhbCBDaGFyYWN0ZXJzPC9idXR0b24+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuXFxcIiBpZD1cXFwic3Bvb2ZCdG5cXFwiPlNwb29mIFVzZXJuYW1lPC9idXR0b24+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuXFxcIiBpZD1cXFwic3BpbkJ0blxcXCI+QXV0byBTcGluPC9idXR0b24+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qta2V5LXJvd1xcXCI+PHNwYW4+U3BpbiBrZXk8L3NwYW4+PGlucHV0IGNsYXNzPVxcXCJhc3Qta2V5LWNhcHR1cmVcXFwiIGlkPVxcXCJzcGluS2V5SW5wdXRcXFwiIHR5cGU9XFxcInRleHRcXFwiIHBsYWNlaG9sZGVyPVxcXCIuLi5cXFwiIHJlYWRvbmx5PjwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LXNlcFxcXCI+PC9kaXY+XFxuICAgICAgICA8c3BhbiBjbGFzcz1cXFwiYXN0LXNlY3Rpb24tbGFiZWxcXFwiPlR1cm4gQ29udHJvbHM8L3NwYW4+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qta2V5LXJvd1xcXCI+XFxuICAgICAgICAgIDxzcGFuPlR1cm4gTGVmdDwvc3Bhbj5cXG4gICAgICAgICAgPGlucHV0IGNsYXNzPVxcXCJhc3Qta2V5LWNhcHR1cmVcXFwiIGlkPVxcXCJ0dXJuTGVmdEtleUlucHV0XFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiB2YWx1ZT1cXFwiUVxcXCIgcmVhZG9ubHk+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1rZXktcm93XFxcIj5cXG4gICAgICAgICAgPHNwYW4+VHVybiBSaWdodDwvc3Bhbj5cXG4gICAgICAgICAgPGlucHV0IGNsYXNzPVxcXCJhc3Qta2V5LWNhcHR1cmVcXFwiIGlkPVxcXCJ0dXJuUmlnaHRLZXlJbnB1dFxcXCIgdHlwZT1cXFwidGV4dFxcXCIgdmFsdWU9XFxcIkVcXFwiIHJlYWRvbmx5PlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3QtY3JlZGl0c1xcXCI+TWFkZSBieSBBc3RyYXBob2JpYTwvZGl2PlxcbiAgICAgIDwvZGl2PlwiO1xuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHRvb2xzUGFuZWwpO1xuICBjb25zdCBtYWluQm9keUVsZW1lbnQgPSB0b29sc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbWFpbkJvZHlcIik7XG4gIGxldCBpc1Zpc2libGUgPSBmYWxzZTtcbiAgdG9vbHNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI21haW5NaW5cIikub25jbGljayA9IGV2ZW50ID0+IHtcbiAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBpc1Zpc2libGUgPSAhaXNWaXNpYmxlO1xuICAgIG1haW5Cb2R5RWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gaXNWaXNpYmxlID8gXCJub25lXCIgOiBcImJsb2NrXCI7XG4gICAgdG9vbHNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI21haW5NaW5cIikudGV4dENvbnRlbnQgPSBpc1Zpc2libGUgPyBcIitcIiA6IFwi4oiSXCI7XG4gIH07XG4gIHRvb2xzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNzZW5kQnRuXCIpLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgY29uc3QgY2hhdE1lc3NhZ2UgPSB0b29sc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjY2hhdE1zZ1wiKS52YWx1ZTtcbiAgICBpZiAoY2hhdE1lc3NhZ2UpIHtcbiAgICAgIHR5cGVDaGF0TWVzc2FnZShjaGF0TWVzc2FnZSk7XG4gICAgfVxuICB9O1xuICBjb25zdCBhdXRvQ2hhdEJ1dHRvbiA9IHRvb2xzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNhdXRvQ2hhdEJ0blwiKTtcbiAgYXV0b0NoYXRCdXR0b24ub25jbGljayA9ICgpID0+IHtcbiAgICBjb25zdCBtZXNzYWdlVGV4dCA9IHRvb2xzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNjaGF0TXNnXCIpLnZhbHVlO1xuICAgIGNvbnN0IGRlbGF5VmFsdWUgPSBwYXJzZUludCh0b29sc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjZGVsYXlJbnB1dFwiKS52YWx1ZSkgfHwgMTA7XG4gICAgaWYgKCFtZXNzYWdlVGV4dCkge1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihcIkVudGVyIGEgbWVzc2FnZSBmaXJzdFwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHN0YXRlLmlzTG9vcGluZykge1xuICAgICAgc3RvcENoYXRUaW1lcigpO1xuICAgICAgYXV0b0NoYXRCdXR0b24udGV4dENvbnRlbnQgPSBcIkF1dG8gQ2hhdFwiO1xuICAgICAgYXV0b0NoYXRCdXR0b24uY2xhc3NMaXN0LnJlbW92ZShcInRvZ2dsZS1vblwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhcnRSZXBlYXRpbmdUYXNrKG1lc3NhZ2VUZXh0LCBkZWxheVZhbHVlKTtcbiAgICAgIGF1dG9DaGF0QnV0dG9uLnRleHRDb250ZW50ID0gXCJTdG9wIENoYXRcIjtcbiAgICAgIGF1dG9DaGF0QnV0dG9uLmNsYXNzTGlzdC5hZGQoXCJ0b2dnbGUtb25cIik7XG4gICAgfVxuICB9O1xuICBjb25zdCBwYXRjaEJ1dHRvbiA9IHRvb2xzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNwYXRjaEJ0blwiKTtcbiAgcGF0Y2hCdXR0b24ub25jbGljayA9ICgpID0+IHtcbiAgICBpbml0aWFsaXplVGV4dEludGVyY2VwdG9yKCk7XG4gICAgcGF0Y2hCdXR0b24udGV4dENvbnRlbnQgPSBcIlNwZWNpYWwgQ2hhcnMgQWN0aXZlXCI7XG4gICAgcGF0Y2hCdXR0b24uZGlzYWJsZWQgPSB0cnVlO1xuICAgIHBhdGNoQnV0dG9uLmNsYXNzTGlzdC5hZGQoXCJ0b2dnbGUtb25cIik7XG4gIH07XG4gIHRvb2xzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNzcG9vZkJ0blwiKS5vbmNsaWNrID0gKCkgPT4ge1xuICAgIGNvbnN0IHJhbmRvbVN0cmluZyA9IGdlbmVyYXRlUmFuZG9tU3RyaW5nKDgpO1xuICAgIGlmIChzaW11bGF0ZVRleHRJbnB1dChcIi5wbGF5LWdhbWUgLmVsLWlucHV0X19pbm5lclwiLCByYW5kb21TdHJpbmcpKSB7XG4gICAgICBzaG93Tm90aWZpY2F0aW9uKFwiTmFtZSBzcG9vZmVkXCIpO1xuICAgIH0gZWxzZSBpZiAoc2ltdWxhdGVUZXh0SW5wdXQoXCIubmV3LXRyaWJlIC5lbC1pbnB1dF9faW5uZXJcIiwgcmFuZG9tU3RyaW5nKSkge1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihcIlRyaWJlIG5hbWUgc3Bvb2ZlZFwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihcIk5vIG5hbWUgaW5wdXQgZm91bmRcIik7XG4gICAgfVxuICB9O1xuICBjb25zdCBzcGluQnV0dG9uID0gdG9vbHNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3NwaW5CdG5cIik7XG4gIHNwaW5CdXR0b24ub25jbGljayA9ICgpID0+IHtcbiAgICB0b2dnbGVBdXRvUG9pbnRlck1vdmVtZW50KCk7XG4gICAgc3BpbkJ1dHRvbi50ZXh0Q29udGVudCA9IHN0YXRlLmFuaW1hdGlvbkludGVydmFsSWQgPyBcIlN0b3AgU3BpblwiIDogXCJBdXRvIFNwaW5cIjtcbiAgICBzcGluQnV0dG9uLmNsYXNzTGlzdC50b2dnbGUoXCJ0b2dnbGUtb25cIiwgISFzdGF0ZS5hbmltYXRpb25JbnRlcnZhbElkKTtcbiAgfTtcbiAgY29uc3Qgc3BpbktleUlucHV0ID0gdG9vbHNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3NwaW5LZXlJbnB1dFwiKTtcbiAgbGV0IGxhc3RQcmVzc2VkS2V5ID0gbnVsbDtcbiAgc3BpbktleUlucHV0LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGtleWRvd25FdmVudCA9PiB7XG4gICAga2V5ZG93bkV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgbGFzdFByZXNzZWRLZXkgPSBrZXlkb3duRXZlbnQuY29kZSB8fCBrZXlkb3duRXZlbnQua2V5O1xuICAgIHNwaW5LZXlJbnB1dC52YWx1ZSA9IGxhc3RQcmVzc2VkS2V5LnJlcGxhY2UoXCJLZXlcIiwgXCJcIikudG9VcHBlckNhc2UoKTtcbiAgfSk7XG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGtleXVwRXZlbnQgPT4ge1xuICAgIGlmIChsYXN0UHJlc3NlZEtleSAmJiBrZXl1cEV2ZW50LmNvZGUgPT09IGxhc3RQcmVzc2VkS2V5ICYmICFrZXl1cEV2ZW50LnRhcmdldC5tYXRjaGVzKFwiaW5wdXQsdGV4dGFyZWEsYnV0dG9uLHNlbGVjdFwiKSkge1xuICAgICAga2V5dXBFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgdG9nZ2xlQXV0b1BvaW50ZXJNb3ZlbWVudCgpO1xuICAgICAgc3BpbkJ1dHRvbi50ZXh0Q29udGVudCA9IHN0YXRlLmFuaW1hdGlvbkludGVydmFsSWQgPyBcIlN0b3AgU3BpblwiIDogXCJBdXRvIFNwaW5cIjtcbiAgICAgIHNwaW5CdXR0b24uY2xhc3NMaXN0LnRvZ2dsZShcInRvZ2dsZS1vblwiLCAhIXN0YXRlLmFuaW1hdGlvbkludGVydmFsSWQpO1xuICAgIH1cbiAgfSk7XG4gIGNvbnN0IHR1cm5MZWZ0SW5wdXQgPSB0b29sc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjdHVybkxlZnRLZXlJbnB1dFwiKTtcbiAgY29uc3QgdHVyblJpZ2h0SW5wdXQgPSB0b29sc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjdHVyblJpZ2h0S2V5SW5wdXRcIik7XG4gIHR1cm5MZWZ0SW5wdXQudmFsdWUgPSBwcmVzc2VkS2V5US50b1VwcGVyQ2FzZSgpO1xuICB0dXJuUmlnaHRJbnB1dC52YWx1ZSA9IHByZXNzZWRLZXlFLnRvVXBwZXJDYXNlKCk7XG4gIHR1cm5MZWZ0SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgY2xpY2tFdmVudCA9PiB7XG4gICAgY2xpY2tFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGNsaWNrRXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgcHJlc3NlZEtleVEgPSBjbGlja0V2ZW50LmtleTtcbiAgICB0dXJuTGVmdElucHV0LnZhbHVlID0gY2xpY2tFdmVudC5rZXkubGVuZ3RoID09PSAxID8gY2xpY2tFdmVudC5rZXkudG9VcHBlckNhc2UoKSA6IGNsaWNrRXZlbnQua2V5O1xuICB9KTtcbiAgdHVyblJpZ2h0SW5wdXQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgY29udGV4dE1lbnVFdmVudCA9PiB7XG4gICAgY29udGV4dE1lbnVFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGNvbnRleHRNZW51RXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgcHJlc3NlZEtleUUgPSBjb250ZXh0TWVudUV2ZW50LmtleTtcbiAgICB0dXJuUmlnaHRJbnB1dC52YWx1ZSA9IGNvbnRleHRNZW51RXZlbnQua2V5Lmxlbmd0aCA9PT0gMSA/IGNvbnRleHRNZW51RXZlbnQua2V5LnRvVXBwZXJDYXNlKCkgOiBjb250ZXh0TWVudUV2ZW50LmtleTtcbiAgfSk7XG4gIGNvbnN0IHNhdmVkTmFtZURpc3BsYXkgPSB0b29sc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjc2F2ZWROYW1lRGlzcGxheVwiKTtcbiAgY29uc3Qgc2V0TmFtZUJ1dHRvbiA9IHRvb2xzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNzZXROYW1lQnRuXCIpO1xuICBjb25zdCBjbGVhck5hbWVCdXR0b24gPSB0b29sc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjY2xlYXJOYW1lQnRuXCIpO1xuICBpZiAoc2F2ZWROYW1lRGlzcGxheSkge1xuICAgIHNhdmVkTmFtZURpc3BsYXkudmFsdWUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImF1dG9maWxsX25hbWVcIikgfHwgXCJcIjtcbiAgfVxuICBpZiAoc2V0TmFtZUJ1dHRvbikge1xuICAgIHNldE5hbWVCdXR0b24ub25jbGljayA9ICgpID0+IHtcbiAgICAgIGNvbnN0IHVzZXJOYW1lID0gc2F2ZWROYW1lRGlzcGxheS52YWx1ZS50cmltKCk7XG4gICAgICBpZiAodXNlck5hbWUpIHtcbiAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJhdXRvZmlsbF9uYW1lXCIsIHVzZXJOYW1lKTtcbiAgICAgICAgdWlhdWRpb1N0YXRlLmlzTXV0ZWQgPSBmYWxzZTtcbiAgICAgICAgaW5pdEF1dG9maWxsTmFtZSgpO1xuICAgICAgICBzaG93Tm90aWZpY2F0aW9uKFwiTmFtZSBzYXZlZDogXCIgKyB1c2VyTmFtZSk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxuICBpZiAoY2xlYXJOYW1lQnV0dG9uKSB7XG4gICAgY2xlYXJOYW1lQnV0dG9uLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShcImF1dG9maWxsX25hbWVcIik7XG4gICAgICB1aWF1ZGlvU3RhdGUuaXNNdXRlZCA9IGZhbHNlO1xuICAgICAgaWYgKHNhdmVkTmFtZURpc3BsYXkpIHtcbiAgICAgICAgc2F2ZWROYW1lRGlzcGxheS52YWx1ZSA9IFwiXCI7XG4gICAgICB9XG4gICAgICBzaG93Tm90aWZpY2F0aW9uKFwiQXV0b2ZpbGwgY2xlYXJlZFwiKTtcbiAgICB9O1xuICB9XG4gIG1ha2VFbGVtZW50RHJhZ2dhYmxlKHRvb2xzUGFuZWwpO1xuICByZXR1cm4gdG9vbHNQYW5lbDtcbn1cbmZ1bmN0aW9uIGNyZWF0ZVZpc2lvblBhbmVsKCkge1xuICBjb25zdCB2aXNpb25QYW5lbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gIHZpc2lvblBhbmVsLmlkID0gXCJ2aXNpb24tcGFuZWxcIjtcbiAgdmlzaW9uUGFuZWwuY2xhc3NOYW1lID0gXCJhc3QtcGFuZWxcIjtcbiAgdmlzaW9uUGFuZWwuc3R5bGUuY3NzVGV4dCA9IFwidG9wOjIwcHg7cmlnaHQ6MjBweDt3aWR0aDoyMzBweDtcIjtcbiAgdmlzaW9uUGFuZWwuaW5uZXJIVE1MID0gXCJcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJhc3QtaGVhZGVyXFxcIj48c3BhbiBjbGFzcz1cXFwiYXN0LWhlYWRlci10aXRsZVxcXCI+QXN0cmFwaG9iaWEgQ2xpZW50PC9zcGFuPjxidXR0b24gY2xhc3M9XFxcImFzdC1oZWFkZXItbWluXFxcIiBpZD1cXFwidmlzaW9uTWluXFxcIj7iiJI8L2J1dHRvbj48L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJhc3QtYm9keVxcXCIgaWQ9XFxcInZpc2lvbkJvZHlcXFwiPlxcbiAgICAgICAgPHNwYW4gY2xhc3M9XFxcImFzdC1zZWN0aW9uLWxhYmVsXFxcIj5WaXNpb248L3NwYW4+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuIHBhdGNoZWRcXFwiIGlkPVxcXCJ0aHJlc2hlckJ0blxcXCIgZGlzYWJsZWQ+VGhyZXNoZXIgQm9vc3QgKFBhdGNoZWQpPC9idXR0b24+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuXFxcIiBpZD1cXFwiYXN0cmFWaXNpb25CdG5cXFwiPkFzdHJhLVZpc2lvbjwvYnV0dG9uPlxcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgaWQ9XFxcInNtYWxsTWluaW1hcEJ0blxcXCI+U21hbGwgTWluaW1hcDwvYnV0dG9uPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LXNlcFxcXCI+PC9kaXY+XFxuICAgICAgICA8c3BhbiBjbGFzcz1cXFwiYXN0LXNlY3Rpb24tbGFiZWxcXFwiPkVTUDwvc3Bhbj5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG5cXFwiIGlkPVxcXCJlc3BCdG5cXFwiPkVTUDwvYnV0dG9uPlxcbiAgICAgICAgPHNlbGVjdCBjbGFzcz1cXFwiYXN0LXNlbGVjdFxcXCIgaWQ9XFxcImVzcE1vZGVTZWxlY3RcXFwiPjxvcHRpb24gdmFsdWU9XFxcInBsYXllcnNcXFwiPlBsYXllcnM8L29wdGlvbj48b3B0aW9uIHZhbHVlPVxcXCJmb29kXFxcIj5Gb29kPC9vcHRpb24+PC9zZWxlY3Q+XFxuICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuXFxcIiBpZD1cXFwidHJhY2tOZWFyZXN0QnRuXFxcIj5UcmFjayBOZWFyZXN0IChGMyk8L2J1dHRvbj5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG5cXFwiIGlkPVxcXCJ1bnRyYWNrQnRuXFxcIj5VbnRyYWNrIChGNCk8L2J1dHRvbj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1zZXBcXFwiPjwvZGl2PlxcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgaWQ9XFxcImVzcENvbG9yc1RvZ2dsZUJ0blxcXCIgc3R5bGU9XFxcImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47XFxcIj5cXG4gICAgICAgICAgPHNwYW4gc3R5bGU9XFxcImZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjYwMDtsZXR0ZXItc3BhY2luZzoxcHg7dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2NvbG9yOnZhcigtLXRleHQtc2VjLCM4ODgpO1xcXCI+RVNQIENvbG9yczwvc3Bhbj5cXG4gICAgICAgICAgPHNwYW4gaWQ9XFxcImVzcENvbG9yc0Fycm93XFxcIiBzdHlsZT1cXFwiY29sb3I6dmFyKC0tdGV4dC1zZWMsIzg4OCk7Zm9udC1zaXplOjEycHg7XFxcIj7ilrw8L3NwYW4+XFxuICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgIDxkaXYgaWQ9XFxcImVzcENvbG9yc1NlY3Rpb25cXFwiIHN0eWxlPVxcXCJkaXNwbGF5Om5vbmU7XFxcIj5cXG4gICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LWtleS1yb3dcXFwiPjxzcGFuPkNsb3NlICgmbHQ7NTAwKTwvc3Bhbj48aW5wdXQgdHlwZT1cXFwiY29sb3JcXFwiIGlkPVxcXCJlc3BDb2xvckNsb3NlXFxcIiB2YWx1ZT1cXFwiI2ZmMDAwMFxcXCIgc3R5bGU9XFxcIndpZHRoOjQwcHg7aGVpZ2h0OjI0cHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1iZHIsIzMzMyk7Ym9yZGVyLXJhZGl1czo0cHg7Y3Vyc29yOnBvaW50ZXI7cGFkZGluZzowO2JhY2tncm91bmQ6dmFyKC0tYmcyLCMyNDI0MjQpO1xcXCI+PC9kaXY+XFxuICAgICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1rZXktcm93XFxcIj48c3Bhbj5NZWRpdW0gKCZsdDsxNTAwKTwvc3Bhbj48aW5wdXQgdHlwZT1cXFwiY29sb3JcXFwiIGlkPVxcXCJlc3BDb2xvck1lZGl1bVxcXCIgdmFsdWU9XFxcIiNmZmZmMDBcXFwiIHN0eWxlPVxcXCJ3aWR0aDo0MHB4O2hlaWdodDoyNHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tYmRyLCMzMzMpO2JvcmRlci1yYWRpdXM6NHB4O2N1cnNvcjpwb2ludGVyO3BhZGRpbmc6MDtiYWNrZ3JvdW5kOnZhcigtLWJnMiwjMjQyNDI0KTtcXFwiPjwvZGl2PlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qta2V5LXJvd1xcXCI+PHNwYW4+RmFyICgmbHQ7MzAwMCk8L3NwYW4+PGlucHV0IHR5cGU9XFxcImNvbG9yXFxcIiBpZD1cXFwiZXNwQ29sb3JGYXJcXFwiIHZhbHVlPVxcXCIjMDBmZmZmXFxcIiBzdHlsZT1cXFwid2lkdGg6NDBweDtoZWlnaHQ6MjRweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWJkciwjMzMzKTtib3JkZXItcmFkaXVzOjRweDtjdXJzb3I6cG9pbnRlcjtwYWRkaW5nOjA7YmFja2dyb3VuZDp2YXIoLS1iZzIsIzI0MjQyNCk7XFxcIj48L2Rpdj5cXG4gICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LWtleS1yb3dcXFwiPjxzcGFuPlZlcnkgRmFyPC9zcGFuPjxpbnB1dCB0eXBlPVxcXCJjb2xvclxcXCIgaWQ9XFxcImVzcENvbG9yVmVyeUZhclxcXCIgdmFsdWU9XFxcIiMwMGZmMDBcXFwiIHN0eWxlPVxcXCJ3aWR0aDo0MHB4O2hlaWdodDoyNHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tYmRyLCMzMzMpO2JvcmRlci1yYWRpdXM6NHB4O2N1cnNvcjpwb2ludGVyO3BhZGRpbmc6MDtiYWNrZ3JvdW5kOnZhcigtLWJnMiwjMjQyNDI0KTtcXFwiPjwvZGl2PlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qta2V5LXJvd1xcXCI+PHNwYW4+VHJhY2tlZDwvc3Bhbj48aW5wdXQgdHlwZT1cXFwiY29sb3JcXFwiIGlkPVxcXCJlc3BDb2xvclRyYWNrZWRcXFwiIHZhbHVlPVxcXCIjZmYwMGZmXFxcIiBzdHlsZT1cXFwid2lkdGg6NDBweDtoZWlnaHQ6MjRweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWJkciwjMzMzKTtib3JkZXItcmFkaXVzOjRweDtjdXJzb3I6cG9pbnRlcjtwYWRkaW5nOjA7YmFja2dyb3VuZDp2YXIoLS1iZzIsIzI0MjQyNCk7XFxcIj48L2Rpdj5cXG4gICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LWtleS1yb3dcXFwiPjxzcGFuPkZvb2QgQ2xvc2U8L3NwYW4+PGlucHV0IHR5cGU9XFxcImNvbG9yXFxcIiBpZD1cXFwiZXNwQ29sb3JGb29kQ2xvc2VcXFwiIHZhbHVlPVxcXCIjMDBmZjAwXFxcIiBzdHlsZT1cXFwid2lkdGg6NDBweDtoZWlnaHQ6MjRweDtib3JkZXI6MXB4IHNvbGlkIHZhcigtLWJkciwjMzMzKTtib3JkZXItcmFkaXVzOjRweDtjdXJzb3I6cG9pbnRlcjtwYWRkaW5nOjA7YmFja2dyb3VuZDp2YXIoLS1iZzIsIzI0MjQyNCk7XFxcIj48L2Rpdj5cXG4gICAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LWtleS1yb3dcXFwiPjxzcGFuPkZvb2QgTWVkaXVtPC9zcGFuPjxpbnB1dCB0eXBlPVxcXCJjb2xvclxcXCIgaWQ9XFxcImVzcENvbG9yRm9vZE1lZGl1bVxcXCIgdmFsdWU9XFxcIiM4OGZmODhcXFwiIHN0eWxlPVxcXCJ3aWR0aDo0MHB4O2hlaWdodDoyNHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tYmRyLCMzMzMpO2JvcmRlci1yYWRpdXM6NHB4O2N1cnNvcjpwb2ludGVyO3BhZGRpbmc6MDtiYWNrZ3JvdW5kOnZhcigtLWJnMiwjMjQyNDI0KTtcXFwiPjwvZGl2PlxcbiAgICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qta2V5LXJvd1xcXCI+PHNwYW4+Rm9vZCBGYXI8L3NwYW4+PGlucHV0IHR5cGU9XFxcImNvbG9yXFxcIiBpZD1cXFwiZXNwQ29sb3JGb29kRmFyXFxcIiB2YWx1ZT1cXFwiIzQ0Y2M0NFxcXCIgc3R5bGU9XFxcIndpZHRoOjQwcHg7aGVpZ2h0OjI0cHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1iZHIsIzMzMyk7Ym9yZGVyLXJhZGl1czo0cHg7Y3Vyc29yOnBvaW50ZXI7cGFkZGluZzowO2JhY2tncm91bmQ6dmFyKC0tYmcyLCMyNDI0MjQpO1xcXCI+PC9kaXY+XFxuICAgICAgICA8L2Rpdj5cXG4gICAgICA8L2Rpdj5cIjtcbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh2aXNpb25QYW5lbCk7XG4gIGNvbnN0IHZpc2lvbkJvZHlFbGVtZW50ID0gdmlzaW9uUGFuZWwucXVlcnlTZWxlY3RvcihcIiN2aXNpb25Cb2R5XCIpO1xuICBsZXQgaXNWaXNpb25IaWRkZW4gPSBmYWxzZTtcbiAgdmlzaW9uUGFuZWwucXVlcnlTZWxlY3RvcihcIiN2aXNpb25NaW5cIikub25jbGljayA9IGV2ZW50ID0+IHtcbiAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBpc1Zpc2lvbkhpZGRlbiA9ICFpc1Zpc2lvbkhpZGRlbjtcbiAgICB2aXNpb25Cb2R5RWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gaXNWaXNpb25IaWRkZW4gPyBcIm5vbmVcIiA6IFwiYmxvY2tcIjtcbiAgICB2aXNpb25QYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3Zpc2lvbk1pblwiKS50ZXh0Q29udGVudCA9IGlzVmlzaW9uSGlkZGVuID8gXCIrXCIgOiBcIuKIklwiO1xuICB9O1xuICB2aXNpb25QYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3RocmVzaGVyQnRuXCIpLm9uY2xpY2sgPSBjbGlja0V2ZW50ID0+IHtcbiAgICBjbGlja0V2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgc2hvd05vdGlmaWNhdGlvbihcIlRocmVzaGVyIGJvb3N0IGhhcyBiZWVuIHBhdGNoZWRcIik7XG4gIH07XG4gIGNvbnN0IGFzdHJhVmlzaW9uQnV0dG9uID0gdmlzaW9uUGFuZWwucXVlcnlTZWxlY3RvcihcIiNhc3RyYVZpc2lvbkJ0blwiKTtcbiAgYXN0cmFWaXNpb25CdXR0b24ub25jbGljayA9ICgpID0+IHtcbiAgICBpZiAoc3RhdGUuaXNBY3RpdmUpIHtcbiAgICAgIHNob3dOb3RpZmljYXRpb24oXCJBbHJlYWR5IGFjdGl2ZVwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaW5pdEFudGlEZXRlY3Rpb24oKTtcbiAgICBpZiAoIXN0YXRlLmFuaW1hbERhdGEpIHtcbiAgICAgIHNob3dOb3RpZmljYXRpb24oXCJMb2FkaW5nLi4uIGNsaWNrIGFnYWluIGluIDJzXCIpO1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGluaXRpYWxpemVBc3RyYVZpc2lvbigpO1xuICAgICAgICBhc3RyYVZpc2lvbkJ1dHRvbi50ZXh0Q29udGVudCA9IFwiQXN0cmEtVmlzaW9uIOKck1wiO1xuICAgICAgICBhc3RyYVZpc2lvbkJ1dHRvbi5jbGFzc0xpc3QuYWRkKFwidG9nZ2xlLW9uXCIpO1xuICAgICAgICBhc3RyYVZpc2lvbkJ1dHRvbi5kaXNhYmxlZCA9IHRydWU7XG4gICAgICB9LCAyMDAwKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaW5pdGlhbGl6ZUFzdHJhVmlzaW9uKCk7XG4gICAgYXN0cmFWaXNpb25CdXR0b24udGV4dENvbnRlbnQgPSBcIkFzdHJhLVZpc2lvbiDinJNcIjtcbiAgICBhc3RyYVZpc2lvbkJ1dHRvbi5jbGFzc0xpc3QuYWRkKFwidG9nZ2xlLW9uXCIpO1xuICAgIGFzdHJhVmlzaW9uQnV0dG9uLmRpc2FibGVkID0gdHJ1ZTtcbiAgfTtcbiAgY29uc3Qgc21hbGxNaW5pbWFwQnV0dG9uID0gdmlzaW9uUGFuZWwucXVlcnlTZWxlY3RvcihcIiNzbWFsbE1pbmltYXBCdG5cIik7XG4gIHNtYWxsTWluaW1hcEJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xuICAgIGluaXRBbnRpRGV0ZWN0aW9uKCk7XG4gICAgaWYgKCFzdGF0ZS5hbmltYWxEYXRhKSB7XG4gICAgICBzaG93Tm90aWZpY2F0aW9uKFwiTm90IGluIGdhbWUgeWV0XCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIXN0YXRlLmFuaW1hbERhdGEubWluaW1hcCkge1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihcIk1pbmltYXAgbm90IGF2YWlsYWJsZVwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdG9nZ2xlTWluaW1hcFNpemUoKTtcbiAgICBzbWFsbE1pbmltYXBCdXR0b24udGV4dENvbnRlbnQgPSBzdGF0ZS5pc01pbmltYXBTbWFsbCA/IFwiTWluaW1hcDogU21hbGxcIiA6IFwiU21hbGwgTWluaW1hcFwiO1xuICAgIHNtYWxsTWluaW1hcEJ1dHRvbi5jbGFzc0xpc3QudG9nZ2xlKFwidG9nZ2xlLW9uXCIsIHN0YXRlLmlzTWluaW1hcFNtYWxsKTtcbiAgfTtcbiAgY29uc3QgZXNwQnV0dG9uID0gdmlzaW9uUGFuZWwucXVlcnlTZWxlY3RvcihcIiNlc3BCdG5cIik7XG4gIGVzcEJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xuICAgIHRvZ2dsZUVzcCgpO1xuICAgIGVzcEJ1dHRvbi50ZXh0Q29udGVudCA9IHdpbmRvdy5lc3BFbmFibGVkID8gXCJFU1Ag4pyTXCIgOiBcIkVTUFwiO1xuICAgIGVzcEJ1dHRvbi5jbGFzc0xpc3QudG9nZ2xlKFwidG9nZ2xlLW9uXCIsIHdpbmRvdy5lc3BFbmFibGVkKTtcbiAgfTtcbiAgY29uc3QgZXNwTW9kZVNlbGVjdCA9IHZpc2lvblBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjZXNwTW9kZVNlbGVjdFwiKTtcbiAgZXNwTW9kZVNlbGVjdC52YWx1ZSA9IHdpbmRvdy5lc3BNb2RlIHx8IFwicGxheWVyc1wiO1xuICBlc3BNb2RlU2VsZWN0Lm9uY2hhbmdlID0gY2hhbmdlRXZlbnQgPT4ge1xuICAgIHdpbmRvdy5lc3BNb2RlID0gY2hhbmdlRXZlbnQudGFyZ2V0LnZhbHVlO1xuICAgIHNob3dOb3RpZmljYXRpb24oXCJFU1A6IFwiICsgY2hhbmdlRXZlbnQudGFyZ2V0LnZhbHVlKTtcbiAgfTtcbiAgdmlzaW9uUGFuZWwucXVlcnlTZWxlY3RvcihcIiN0cmFja05lYXJlc3RCdG5cIikub25jbGljayA9ICgpID0+IHRyYWNrTmVhcmVzdFBsYXllcigpO1xuICB2aXNpb25QYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3VudHJhY2tCdG5cIikub25jbGljayA9ICgpID0+IGNsZWFyVHJhY2tpbmcoKTtcbiAgY29uc3QgZXNwQ29sb3JzVG9nZ2xlQnV0dG9uID0gdmlzaW9uUGFuZWwucXVlcnlTZWxlY3RvcihcIiNlc3BDb2xvcnNUb2dnbGVCdG5cIik7XG4gIGNvbnN0IGVzcENvbG9yc1NlY3Rpb24gPSB2aXNpb25QYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2VzcENvbG9yc1NlY3Rpb25cIik7XG4gIGNvbnN0IGVzcENvbG9yc0Fycm93ID0gdmlzaW9uUGFuZWwucXVlcnlTZWxlY3RvcihcIiNlc3BDb2xvcnNBcnJvd1wiKTtcbiAgbGV0IGlzRXNwQ29sb3JzRXhwYW5kZWQgPSBmYWxzZTtcbiAgZXNwQ29sb3JzVG9nZ2xlQnV0dG9uLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgaXNFc3BDb2xvcnNFeHBhbmRlZCA9ICFpc0VzcENvbG9yc0V4cGFuZGVkO1xuICAgIGVzcENvbG9yc1NlY3Rpb24uc3R5bGUuZGlzcGxheSA9IGlzRXNwQ29sb3JzRXhwYW5kZWQgPyBcImJsb2NrXCIgOiBcIm5vbmVcIjtcbiAgICBlc3BDb2xvcnNBcnJvdy50ZXh0Q29udGVudCA9IGlzRXNwQ29sb3JzRXhwYW5kZWQgPyBcIuKWslwiIDogXCLilrxcIjtcbiAgfTtcbiAgY29uc3QgZXNwQ29sb3JTZXR0aW5ncyA9IHtcbiAgICBlc3BDb2xvckNsb3NlOiBcImNsb3NlXCIsXG4gICAgZXNwQ29sb3JNZWRpdW06IFwibWVkaXVtXCIsXG4gICAgZXNwQ29sb3JGYXI6IFwiZmFyXCIsXG4gICAgZXNwQ29sb3JWZXJ5RmFyOiBcInZlcnlGYXJcIixcbiAgICBlc3BDb2xvclRyYWNrZWQ6IFwidHJhY2tlZFwiLFxuICAgIGVzcENvbG9yRm9vZENsb3NlOiBcImZvb2RDbG9zZVwiLFxuICAgIGVzcENvbG9yRm9vZE1lZGl1bTogXCJmb29kTWVkaXVtXCIsXG4gICAgZXNwQ29sb3JGb29kRmFyOiBcImZvb2RGYXJcIlxuICB9O1xuICBPYmplY3QuZW50cmllcyhlc3BDb2xvclNldHRpbmdzKS5mb3JFYWNoKChbZWxlbWVudElkLCBjb2xvcktleV0pID0+IHtcbiAgICBjb25zdCB0YXJnZXRFbGVtZW50ID0gdmlzaW9uUGFuZWwucXVlcnlTZWxlY3RvcihcIiNcIiArIGVsZW1lbnRJZCk7XG4gICAgaWYgKHRhcmdldEVsZW1lbnQpIHtcbiAgICAgIHRhcmdldEVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImlucHV0XCIsIGNvbG9ySW5wdXRFdmVudCA9PiB7XG4gICAgICAgIHdpbmRvdy5lc3BDb2xvcnNbY29sb3JLZXldID0gY29sb3JJbnB1dEV2ZW50LnRhcmdldC52YWx1ZTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG4gIG1ha2VFbGVtZW50RHJhZ2dhYmxlKHZpc2lvblBhbmVsKTtcbiAgcmV0dXJuIHZpc2lvblBhbmVsO1xufVxuZnVuY3Rpb24gY3JlYXRlQ29tYmF0UGFuZWwoKSB7XG4gIGNvbnN0IGNvbWJhdFBhbmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgY29tYmF0UGFuZWwuaWQgPSBcImNvbWJhdC1wYW5lbFwiO1xuICBjb21iYXRQYW5lbC5jbGFzc05hbWUgPSBcImFzdC1wYW5lbFwiO1xuICBjb21iYXRQYW5lbC5zdHlsZS5jc3NUZXh0ID0gXCJ0b3A6MjBweDtsZWZ0OjI2MHB4O3dpZHRoOjIzMHB4O1wiO1xuICBjb21iYXRQYW5lbC5pbm5lckhUTUwgPSBcIlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1oZWFkZXJcXFwiPjxzcGFuIGNsYXNzPVxcXCJhc3QtaGVhZGVyLXRpdGxlXFxcIj5Bc3RyYXBob2JpYSBDbGllbnQ8L3NwYW4+PGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWhlYWRlci1taW5cXFwiIGlkPVxcXCJjb21iYXRNaW5cXFwiPuKIkjwvYnV0dG9uPjwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1ib2R5XFxcIiBpZD1cXFwiY29tYmF0Qm9keVxcXCI+XFxuICAgICAgICA8c3BhbiBjbGFzcz1cXFwiYXN0LXNlY3Rpb24tbGFiZWxcXFwiPkNvbWJhdDwvc3Bhbj5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG5cXFwiIGlkPVxcXCJsb2NrQnRuXFxcIj5Mb2NrIE5lYXJlc3Q8L2J1dHRvbj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1rZXktcm93XFxcIj48c3Bhbj5Mb2NrIEtleTwvc3Bhbj48aW5wdXQgY2xhc3M9XFxcImFzdC1rZXktY2FwdHVyZVxcXCIgaWQ9XFxcImxvY2tLZXlJbnB1dFxcXCIgdHlwZT1cXFwidGV4dFxcXCIgdmFsdWU9XFxcIlRcXFwiIHJlYWRvbmx5PjwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LXNlcFxcXCI+PC9kaXY+XFxuICAgICAgICA8c3BhbiBjbGFzcz1cXFwiYXN0LXNlY3Rpb24tbGFiZWxcXFwiPlRyYWNraW5nPC9zcGFuPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LWtleS1yb3dcXFwiIHN0eWxlPVxcXCJtYXJnaW4tdG9wOjRweDtcXFwiPlxcbiAgICAgICAgICA8c3Bhbj5UcmFpbCBDb2xvcjwvc3Bhbj5cXG4gICAgICAgICAgPGlucHV0IHR5cGU9XFxcImNvbG9yXFxcIiBpZD1cXFwidHJhaWxDb2xvclBpY2tlclxcXCIgdmFsdWU9XFxcIiNmZjk2MDBcXFwiIHN0eWxlPVxcXCJ3aWR0aDo0MHB4O2hlaWdodDoyNHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tYmRyLCMzMzMpO2JvcmRlci1yYWRpdXM6NHB4O2JhY2tncm91bmQ6dmFyKC0tYmcyLCMyNDI0MjQpO2N1cnNvcjpwb2ludGVyO3BhZGRpbmc6MDtcXFwiPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qta2V5LXJvd1xcXCI+PHNwYW4+VHJhY2UgS2V5IChyZS10YXJnZXRzKTwvc3Bhbj48aW5wdXQgY2xhc3M9XFxcImFzdC1rZXktY2FwdHVyZVxcXCIgaWQ9XFxcInRyYWNlS2V5SW5wdXRcXFwiIHR5cGU9XFxcInRleHRcXFwiIHZhbHVlPVxcXCJIXFxcIiByZWFkb25seT48L2Rpdj5cXG4gICAgICA8L2Rpdj5cIjtcbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChjb21iYXRQYW5lbCk7XG4gIGNvbnN0IGNvbWJhdEJvZHkgPSBjb21iYXRQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2NvbWJhdEJvZHlcIik7XG4gIGxldCBpc0NvbWJhdFBhbmVsTWluaW1pemVkID0gZmFsc2U7XG4gIGNvbWJhdFBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjY29tYmF0TWluXCIpLm9uY2xpY2sgPSB0b2dnbGVFdmVudCA9PiB7XG4gICAgdG9nZ2xlRXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgaXNDb21iYXRQYW5lbE1pbmltaXplZCA9ICFpc0NvbWJhdFBhbmVsTWluaW1pemVkO1xuICAgIGNvbWJhdEJvZHkuc3R5bGUuZGlzcGxheSA9IGlzQ29tYmF0UGFuZWxNaW5pbWl6ZWQgPyBcIm5vbmVcIiA6IFwiYmxvY2tcIjtcbiAgICBjb21iYXRQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2NvbWJhdE1pblwiKS50ZXh0Q29udGVudCA9IGlzQ29tYmF0UGFuZWxNaW5pbWl6ZWQgPyBcIitcIiA6IFwi4oiSXCI7XG4gIH07XG4gIGNvbnN0IGxvY2tCdXR0b24gPSBjb21iYXRQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2xvY2tCdG5cIik7XG4gIGxvY2tCdXR0b24ub25jbGljayA9ICgpID0+IHRvZ2dsZUxvY2soKTtcbiAgY29uc3QgbG9ja0tleUlucHV0ID0gY29tYmF0UGFuZWwucXVlcnlTZWxlY3RvcihcIiNsb2NrS2V5SW5wdXRcIik7XG4gIGxvY2tLZXlJbnB1dC52YWx1ZSA9IHdpbmRvdy5sb2NrS2V5LnRvVXBwZXJDYXNlKCk7XG4gIGxvY2tLZXlJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBsb2NrS2V5RXZlbnQgPT4ge1xuICAgIGxvY2tLZXlFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGxvY2tLZXlFdmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB3aW5kb3cubG9ja0tleSA9IGxvY2tLZXlFdmVudC5rZXk7XG4gICAgbG9ja0tleUlucHV0LnZhbHVlID0gbG9ja0tleUV2ZW50LmtleS5sZW5ndGggPT09IDEgPyBsb2NrS2V5RXZlbnQua2V5LnRvVXBwZXJDYXNlKCkgOiBsb2NrS2V5RXZlbnQua2V5O1xuICB9KTtcbiAgY29uc3QgdHJhaWxDb2xvclBpY2tlciA9IGNvbWJhdFBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjdHJhaWxDb2xvclBpY2tlclwiKTtcbiAgdHJhaWxDb2xvclBpY2tlci5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgY29sb3JQaWNrZXJFdmVudCA9PiB7XG4gICAgY29uc3QgY29sb3JWYWx1ZSA9IGNvbG9yUGlja2VyRXZlbnQudGFyZ2V0LnZhbHVlO1xuICAgIHdpbmRvdy5lbnRpdHlUcmFpbENvbG9yID0ge1xuICAgICAgcjogcGFyc2VJbnQoY29sb3JWYWx1ZS5zbGljZSgxLCAzKSwgMTYpLFxuICAgICAgZzogcGFyc2VJbnQoY29sb3JWYWx1ZS5zbGljZSgzLCA1KSwgMTYpLFxuICAgICAgYjogcGFyc2VJbnQoY29sb3JWYWx1ZS5zbGljZSg1LCA3KSwgMTYpXG4gICAgfTtcbiAgfSk7XG4gIGNvbnN0IHRyYWNlS2V5SW5wdXQgPSBjb21iYXRQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3RyYWNlS2V5SW5wdXRcIik7XG4gIHRyYWNlS2V5SW5wdXQudmFsdWUgPSB3aW5kb3cuZW50aXR5VHJhY2VLZXkudG9VcHBlckNhc2UoKTtcbiAgdHJhY2VLZXlJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCB0cmFjZUtleUV2ZW50ID0+IHtcbiAgICB0cmFjZUtleUV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgdHJhY2VLZXlFdmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB3aW5kb3cuZW50aXR5VHJhY2VLZXkgPSB0cmFjZUtleUV2ZW50LmtleS50b0xvd2VyQ2FzZSgpO1xuICAgIHRyYWNlS2V5SW5wdXQudmFsdWUgPSB0cmFjZUtleUV2ZW50LmtleS5sZW5ndGggPT09IDEgPyB0cmFjZUtleUV2ZW50LmtleS50b1VwcGVyQ2FzZSgpIDogdHJhY2VLZXlFdmVudC5rZXk7XG4gIH0pO1xuICBtYWtlRWxlbWVudERyYWdnYWJsZShjb21iYXRQYW5lbCk7XG4gIHJldHVybiBjb21iYXRQYW5lbDtcbn1cbmZ1bmN0aW9uIGNyZWF0ZUF1dG9tYXRpb25QYW5lbCgpIHtcbiAgY29uc3QgYXV0b21hdGlvblBhbmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgYXV0b21hdGlvblBhbmVsLmlkID0gXCJhdXRvbWF0aW9uLXBhbmVsXCI7XG4gIGF1dG9tYXRpb25QYW5lbC5jbGFzc05hbWUgPSBcImFzdC1wYW5lbFwiO1xuICBhdXRvbWF0aW9uUGFuZWwuc3R5bGUuY3NzVGV4dCA9IFwiYm90dG9tOjIwcHg7bGVmdDoyNjBweDt3aWR0aDoyMzBweDtcIjtcbiAgYXV0b21hdGlvblBhbmVsLmlubmVySFRNTCA9IFwiXFxuICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LWhlYWRlclxcXCI+PHNwYW4gY2xhc3M9XFxcImFzdC1oZWFkZXItdGl0bGVcXFwiPkFzdHJhcGhvYmlhIENsaWVudDwvc3Bhbj48YnV0dG9uIGNsYXNzPVxcXCJhc3QtaGVhZGVyLW1pblxcXCIgaWQ9XFxcImF1dG9NaW5cXFwiPuKIkjwvYnV0dG9uPjwvZGl2PlxcbiAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1ib2R5XFxcIiBpZD1cXFwiYXV0b0JvZHlcXFwiPlxcbiAgICAgICAgPHNwYW4gY2xhc3M9XFxcImFzdC1zZWN0aW9uLWxhYmVsXFxcIj5BdXRvbWF0aW9uPC9zcGFuPlxcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgaWQ9XFxcImF1dG9Eb2RnZUJ0blxcXCI+QXV0byBEb2RnZTwvYnV0dG9uPlxcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgaWQ9XFxcImF1dG9GYXJtQnRuXFxcIj5BdXRvIEZhcm0gKEY1KTwvYnV0dG9uPlxcbiAgICAgICAgPHNlbGVjdCBjbGFzcz1cXFwiYXN0LXNlbGVjdFxcXCIgaWQ9XFxcImZhcm1Nb2RlU2VsZWN0XFxcIiBzdHlsZT1cXFwibWFyZ2luLXRvcDo0cHg7XFxcIj5cXG4gICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwibmVhcmVzdFxcXCI+TmVhcmVzdCBGb29kPC9vcHRpb24+XFxuICAgICAgICAgIDxvcHRpb24gdmFsdWU9XFxcImNsdXN0ZXJcXFwiPkZvb2QgQ2x1c3RlcnM8L29wdGlvbj5cXG4gICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwicGF0cm9sXFxcIj5QYXRyb2wgUm91dGU8L29wdGlvbj5cXG4gICAgICAgIDwvc2VsZWN0PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LXRvZ2dsZS1yb3dcXFwiPjxzcGFuPkJvb3N0PC9zcGFuPjxkaXYgY2xhc3M9XFxcImFzdC1zd2l0Y2hcXFwiPjxpbnB1dCB0eXBlPVxcXCJjaGVja2JveFxcXCIgaWQ9XFxcImZhcm1Cb29zdFRvZ2dsZVxcXCIgY2hlY2tlZD48c3BhbiBjbGFzcz1cXFwic2xpZGVyXFxcIj48L3NwYW4+PC9kaXY+PC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3QtdG9nZ2xlLXJvd1xcXCI+PHNwYW4+QXV0byBFdm9sdmU8L3NwYW4+PGRpdiBjbGFzcz1cXFwiYXN0LXN3aXRjaFxcXCI+PGlucHV0IHR5cGU9XFxcImNoZWNrYm94XFxcIiBpZD1cXFwiZmFybUV2b2x2ZVRvZ2dsZVxcXCIgY2hlY2tlZD48c3BhbiBjbGFzcz1cXFwic2xpZGVyXFxcIj48L3NwYW4+PC9kaXY+PC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3QtdG9nZ2xlLXJvd1xcXCI+PHNwYW4+QXZvaWQgUGxheWVyczwvc3Bhbj48ZGl2IGNsYXNzPVxcXCJhc3Qtc3dpdGNoXFxcIj48aW5wdXQgdHlwZT1cXFwiY2hlY2tib3hcXFwiIGlkPVxcXCJmYXJtQXZvaWRUb2dnbGVcXFwiIGNoZWNrZWQ+PHNwYW4gY2xhc3M9XFxcInNsaWRlclxcXCI+PC9zcGFuPjwvZGl2PjwvZGl2PlxcbiAgICAgIDwvZGl2PlwiO1xuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGF1dG9tYXRpb25QYW5lbCk7XG4gIGNvbnN0IGF1dG9tYXRpb25Cb2R5ID0gYXV0b21hdGlvblBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjYXV0b0JvZHlcIik7XG4gIGxldCBpc0F1dG9tYXRpb25QYW5lbE1pbmltaXplZCA9IGZhbHNlO1xuICBhdXRvbWF0aW9uUGFuZWwucXVlcnlTZWxlY3RvcihcIiNhdXRvTWluXCIpLm9uY2xpY2sgPSBldmVudCA9PiB7XG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgaXNBdXRvbWF0aW9uUGFuZWxNaW5pbWl6ZWQgPSAhaXNBdXRvbWF0aW9uUGFuZWxNaW5pbWl6ZWQ7XG4gICAgYXV0b21hdGlvbkJvZHkuc3R5bGUuZGlzcGxheSA9IGlzQXV0b21hdGlvblBhbmVsTWluaW1pemVkID8gXCJub25lXCIgOiBcImJsb2NrXCI7XG4gICAgYXV0b21hdGlvblBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjYXV0b01pblwiKS50ZXh0Q29udGVudCA9IGlzQXV0b21hdGlvblBhbmVsTWluaW1pemVkID8gXCIrXCIgOiBcIuKIklwiO1xuICB9O1xuICBjb25zdCBhdXRvRG9kZ2VCdXR0b24gPSBhdXRvbWF0aW9uUGFuZWwucXVlcnlTZWxlY3RvcihcIiNhdXRvRG9kZ2VCdG5cIik7XG4gIGF1dG9Eb2RnZUJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xuICAgIGlmICh3aW5kb3cuYXV0b0RvZGdlRW5hYmxlZCkge1xuICAgICAgZGlzYWJsZUF1dG9Eb2RnZSgpO1xuICAgICAgYXV0b0RvZGdlQnV0dG9uLnRleHRDb250ZW50ID0gXCJBdXRvIERvZGdlXCI7XG4gICAgICBhdXRvRG9kZ2VCdXR0b24uY2xhc3NMaXN0LnJlbW92ZShcInRvZ2dsZS1vblwiKTtcbiAgICB9IGVsc2Uge1xuICAgICAgZW5hYmxlQXV0b0RvZGdlKCk7XG4gICAgICBhdXRvRG9kZ2VCdXR0b24udGV4dENvbnRlbnQgPSBcIkRvZGdpbmcg4pyTXCI7XG4gICAgICBhdXRvRG9kZ2VCdXR0b24uY2xhc3NMaXN0LmFkZChcInRvZ2dsZS1vblwiKTtcbiAgICB9XG4gIH07XG4gIGNvbnN0IGF1dG9GYXJtQnV0dG9uID0gYXV0b21hdGlvblBhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjYXV0b0Zhcm1CdG5cIik7XG4gIGF1dG9GYXJtQnV0dG9uLmlkID0gXCJhdXRvRmFybUJ0blwiO1xuICBjb25zdCBmYXJtTW9kZVNlbGVjdCA9IGF1dG9tYXRpb25QYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2Zhcm1Nb2RlU2VsZWN0XCIpO1xuICBhdXRvRmFybUJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xuICAgIGlmICh3aW5kb3cuYXV0b0Zhcm1BY3RpdmUpIHtcbiAgICAgIHN0b3BBdXRvRmFybSgpO1xuICAgICAgYXV0b0Zhcm1CdXR0b24udGV4dENvbnRlbnQgPSBcIkF1dG8gRmFybSAoRjUpXCI7XG4gICAgICBhdXRvRmFybUJ1dHRvbi5jbGFzc0xpc3QucmVtb3ZlKFwidG9nZ2xlLW9uXCIpO1xuICAgIH0gZWxzZSB7XG4gICAgICBzdGFydEF1dG9GYXJtKGZhcm1Nb2RlU2VsZWN0LnZhbHVlKTtcbiAgICAgIGF1dG9GYXJtQnV0dG9uLnRleHRDb250ZW50ID0gXCJTdG9wIEZhcm0gKEY1KVwiO1xuICAgICAgYXV0b0Zhcm1CdXR0b24uY2xhc3NMaXN0LmFkZChcInRvZ2dsZS1vblwiKTtcbiAgICB9XG4gIH07XG4gIGZhcm1Nb2RlU2VsZWN0Lm9uY2hhbmdlID0gZmFybU1vZGVDaGFuZ2VFdmVudCA9PiB7XG4gICAgaWYgKHdpbmRvdy5hdXRvRmFybUFjdGl2ZSkge1xuICAgICAgd2luZG93LmF1dG9GYXJtTW9kZSA9IGZhcm1Nb2RlQ2hhbmdlRXZlbnQudGFyZ2V0LnZhbHVlO1xuICAgICAgaWYgKGZhcm1Nb2RlQ2hhbmdlRXZlbnQudGFyZ2V0LnZhbHVlID09PSBcInBhdHJvbFwiKSB7XG4gICAgICAgIHNldHVwUGF0cm9sUm91dGUoKTtcbiAgICAgIH1cbiAgICAgIHNob3dOb3RpZmljYXRpb24oXCJGYXJtOiBcIiArIGZhcm1Nb2RlQ2hhbmdlRXZlbnQudGFyZ2V0LnZhbHVlKTtcbiAgICB9XG4gIH07XG4gIGNvbnN0IGZhcm1Cb29zdFRvZ2dsZSA9IGF1dG9tYXRpb25QYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2Zhcm1Cb29zdFRvZ2dsZVwiKTtcbiAgY29uc3QgZmFybUV2b2x2ZVRvZ2dsZSA9IGF1dG9tYXRpb25QYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2Zhcm1Fdm9sdmVUb2dnbGVcIik7XG4gIGNvbnN0IGZhcm1Bdm9pZFRvZ2dsZSA9IGF1dG9tYXRpb25QYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2Zhcm1Bdm9pZFRvZ2dsZVwiKTtcbiAgZmFybUJvb3N0VG9nZ2xlLmNoZWNrZWQgPSB3aW5kb3cuYXV0b0Zhcm1Cb29zdDtcbiAgZmFybUV2b2x2ZVRvZ2dsZS5jaGVja2VkID0gd2luZG93LmF1dG9GYXJtRXZvbHZlO1xuICBmYXJtQXZvaWRUb2dnbGUuY2hlY2tlZCA9IHdpbmRvdy5hdXRvRmFybUF2b2lkUGxheWVycztcbiAgY29uc3QgZmFybUJvb3N0TGFiZWwgPSBmYXJtQm9vc3RUb2dnbGUubmV4dEVsZW1lbnRTaWJsaW5nO1xuICBmYXJtQm9vc3RMYWJlbC5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgYXV0b0Zhcm1Ub2dnbGVFdmVudCA9PiB7XG4gICAgYXV0b0Zhcm1Ub2dnbGVFdmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBmYXJtQm9vc3RUb2dnbGUuY2hlY2tlZCA9ICFmYXJtQm9vc3RUb2dnbGUuY2hlY2tlZDtcbiAgICB3aW5kb3cuYXV0b0Zhcm1Cb29zdCA9IGZhcm1Cb29zdFRvZ2dsZS5jaGVja2VkO1xuICAgIHNob3dOb3RpZmljYXRpb24oZmFybUJvb3N0VG9nZ2xlLmNoZWNrZWQgPyBcIkZhcm0gYm9vc3QgT05cIiA6IFwiRmFybSBib29zdCBPRkZcIik7XG4gIH0pO1xuICBjb25zdCBmYXJtRXZvbHZlTGFiZWwgPSBmYXJtRXZvbHZlVG9nZ2xlLm5leHRFbGVtZW50U2libGluZztcbiAgZmFybUV2b2x2ZUxhYmVsLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhdXRvQ29sbGVjdFRvZ2dsZUV2ZW50ID0+IHtcbiAgICBhdXRvQ29sbGVjdFRvZ2dsZUV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGZhcm1Fdm9sdmVUb2dnbGUuY2hlY2tlZCA9ICFmYXJtRXZvbHZlVG9nZ2xlLmNoZWNrZWQ7XG4gICAgd2luZG93LmF1dG9GYXJtRXZvbHZlID0gZmFybUV2b2x2ZVRvZ2dsZS5jaGVja2VkO1xuICAgIHNob3dOb3RpZmljYXRpb24oZmFybUV2b2x2ZVRvZ2dsZS5jaGVja2VkID8gXCJBdXRvIGV2b2x2ZSBPTlwiIDogXCJBdXRvIGV2b2x2ZSBPRkZcIik7XG4gIH0pO1xuICBjb25zdCBmYXJtQXZvaWRMYWJlbCA9IGZhcm1Bdm9pZFRvZ2dsZS5uZXh0RWxlbWVudFNpYmxpbmc7XG4gIGZhcm1Bdm9pZExhYmVsLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBhdXRvU2VsbFRvZ2dsZUV2ZW50ID0+IHtcbiAgICBhdXRvU2VsbFRvZ2dsZUV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGZhcm1Bdm9pZFRvZ2dsZS5jaGVja2VkID0gIWZhcm1Bdm9pZFRvZ2dsZS5jaGVja2VkO1xuICAgIHdpbmRvdy5hdXRvRmFybUF2b2lkUGxheWVycyA9IGZhcm1Bdm9pZFRvZ2dsZS5jaGVja2VkO1xuICAgIHNob3dOb3RpZmljYXRpb24oZmFybUF2b2lkVG9nZ2xlLmNoZWNrZWQgPyBcIkF2b2lkIHBsYXllcnMgT05cIiA6IFwiQXZvaWQgcGxheWVycyBPRkZcIik7XG4gIH0pO1xuICBtYWtlRWxlbWVudERyYWdnYWJsZShhdXRvbWF0aW9uUGFuZWwpO1xuICByZXR1cm4gYXV0b21hdGlvblBhbmVsO1xufVxuZnVuY3Rpb24gY3JlYXRlU2V0dGluZ3NQYW5lbCgpIHtcbiAgY29uc3Qgc2V0dGluZ3NQYW5lbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gIHNldHRpbmdzUGFuZWwuaWQgPSBcInNldHRpbmdzLXBhbmVsXCI7XG4gIHNldHRpbmdzUGFuZWwuY2xhc3NOYW1lID0gXCJhc3QtcGFuZWxcIjtcbiAgc2V0dGluZ3NQYW5lbC5zdHlsZS5jc3NUZXh0ID0gXCJ0b3A6MjBweDtsZWZ0OjIwcHg7d2lkdGg6MjIwcHg7XCI7XG4gIHNldHRpbmdzUGFuZWwuaW5uZXJIVE1MID0gXCJcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJhc3QtaGVhZGVyXFxcIj48c3BhbiBjbGFzcz1cXFwiYXN0LWhlYWRlci10aXRsZVxcXCI+U2V0dGluZ3M8L3NwYW4+PGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWhlYWRlci1taW5cXFwiIGlkPVxcXCJzZXR0aW5nc01pblxcXCI+4oiSPC9idXR0b24+PC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LWJvZHlcXFwiIGlkPVxcXCJzZXR0aW5nc0JvZHlcXFwiPlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LWtleS1yb3dcXFwiPjxzcGFuPlRvZ2dsZSBVSTwvc3Bhbj48aW5wdXQgY2xhc3M9XFxcImFzdC1rZXktY2FwdHVyZVxcXCIgaWQ9XFxcInRvZ2dsZUtleUlucHV0XFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiB2YWx1ZT1cXFwiU0hJRlRcXFwiIHJlYWRvbmx5PjwvZGl2PlxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LXNlcFxcXCI+PC9kaXY+XFxuICAgICAgICA8c3BhbiBjbGFzcz1cXFwiYXN0LXNlY3Rpb24tbGFiZWxcXFwiPkJhY2tncm91bmQ8L3NwYW4+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qtcm93XFxcIj48aW5wdXQgY2xhc3M9XFxcImFzdC1pbnB1dFxcXCIgdHlwZT1cXFwidGV4dFxcXCIgaWQ9XFxcImJnVXJsXFxcIiBwbGFjZWhvbGRlcj1cXFwiSW1hZ2UgVVJMLi4uXFxcIiBzdHlsZT1cXFwiZmxleDoxO1xcXCI+PGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgaWQ9XFxcImFwcGx5QmdcXFwiIHN0eWxlPVxcXCJ3aWR0aDphdXRvO3BhZGRpbmc6NnB4IDEwcHg7bWFyZ2luOjA7XFxcIj5TZXQ8L2J1dHRvbj48L2Rpdj5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1zZXBcXFwiPjwvZGl2PlxcbiAgICAgICAgPHNwYW4gY2xhc3M9XFxcImFzdC1zZWN0aW9uLWxhYmVsXFxcIj5UaGVtZTwvc3Bhbj5cXG4gICAgICAgIDxzZWxlY3QgY2xhc3M9XFxcImFzdC1zZWxlY3RcXFwiIGlkPVxcXCJ0aGVtZVNlbGVjdFxcXCI+XFxuICAgICAgICAgIDxvcHRpb24gdmFsdWU9XFxcImdyZXlcXFwiPkdyZXk8L29wdGlvbj48b3B0aW9uIHZhbHVlPVxcXCJibHVlXFxcIj5CbHVlPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cXFwicmVkXFxcIj5SZWQ8L29wdGlvbj5cXG4gICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwiZ3JlZW5cXFwiPkdyZWVuPC9vcHRpb24+PG9wdGlvbiB2YWx1ZT1cXFwicGlua1xcXCI+UGluazwvb3B0aW9uPjxvcHRpb24gdmFsdWU9XFxcInN0YXJ3YXJzXFxcIj5TdGFyIFdhcnM8L29wdGlvbj5cXG4gICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cXFwia2ZjXFxcIj5LRkM8L29wdGlvbj48b3B0aW9uIHZhbHVlPVxcXCJoYWxsb3dlZW5cXFwiPkhhbGxvd2VlbiDwn5SSPC9vcHRpb24+XFxuICAgICAgICA8L3NlbGVjdD5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1zZXBcXFwiPjwvZGl2PlxcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgaWQ9XFxcImN1c3RvbVRoZW1lVG9nZ2xlQnRuXFxcIiBzdHlsZT1cXFwiZGlzcGxheTpmbGV4O2FsaWduLWl0ZW1zOmNlbnRlcjtqdXN0aWZ5LWNvbnRlbnQ6c3BhY2UtYmV0d2VlbjtcXFwiPlxcbiAgICAgICAgICA8c3BhbiBzdHlsZT1cXFwiZm9udC1zaXplOjEwcHg7Zm9udC13ZWlnaHQ6NjAwO2xldHRlci1zcGFjaW5nOjFweDt0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7Y29sb3I6dmFyKC0tdGV4dC1zZWMsIzg4OCk7XFxcIj5DcmVhdGUgVGhlbWU8L3NwYW4+XFxuICAgICAgICAgIDxzcGFuIGlkPVxcXCJjdXN0b21UaGVtZUFycm93XFxcIiBzdHlsZT1cXFwiY29sb3I6dmFyKC0tdGV4dC1zZWMsIzg4OCk7Zm9udC1zaXplOjEycHg7XFxcIj7ilrw8L3NwYW4+XFxuICAgICAgICA8L2J1dHRvbj5cXG4gICAgICAgIDxkaXYgaWQ9XFxcImN1c3RvbVRoZW1lU2VjdGlvblxcXCIgc3R5bGU9XFxcImRpc3BsYXk6bm9uZTtwYWRkaW5nLXRvcDo0cHg7XFxcIj5cXG4gICAgICAgICAgPGlucHV0IGNsYXNzPVxcXCJhc3QtaW5wdXRcXFwiIHR5cGU9XFxcInRleHRcXFwiIGlkPVxcXCJjdXN0b21UaGVtZU5hbWVcXFwiIHBsYWNlaG9sZGVyPVxcXCJUaGVtZSBuYW1lLi4uXFxcIiBzdHlsZT1cXFwid2lkdGg6MTAwJTtib3gtc2l6aW5nOmJvcmRlci1ib3g7bWFyZ2luLWJvdHRvbTo0cHg7XFxcIj5cXG48ZGl2IGNsYXNzPVxcXCJhc3Qta2V5LXJvd1xcXCI+PHNwYW4+QWNjZW50PC9zcGFuPjxpbnB1dCB0eXBlPVxcXCJjb2xvclxcXCIgaWQ9XFxcImN0QWNjXFxcIiB2YWx1ZT1cXFwiIzg4ODg4OFxcXCIgc3R5bGU9XFxcIndpZHRoOjQwcHg7aGVpZ2h0OjI0cHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1iZHIsIzMzMyk7Ym9yZGVyLXJhZGl1czo0cHg7Y3Vyc29yOnBvaW50ZXI7cGFkZGluZzowO2JhY2tncm91bmQ6dmFyKC0tYmcyLCMyNDI0MjQpO1xcXCI+PC9kaXY+XFxuPGRpdiBjbGFzcz1cXFwiYXN0LWtleS1yb3dcXFwiPjxzcGFuPkJhY2tncm91bmQ8L3NwYW4+PGlucHV0IHR5cGU9XFxcImNvbG9yXFxcIiBpZD1cXFwiY3RCZ1xcXCIgdmFsdWU9XFxcIiMxYTFhMWFcXFwiIHN0eWxlPVxcXCJ3aWR0aDo0MHB4O2hlaWdodDoyNHB4O2JvcmRlcjoxcHggc29saWQgdmFyKC0tYmRyLCMzMzMpO2JvcmRlci1yYWRpdXM6NHB4O2N1cnNvcjpwb2ludGVyO3BhZGRpbmc6MDtiYWNrZ3JvdW5kOnZhcigtLWJnMiwjMjQyNDI0KTtcXFwiPjwvZGl2PlxcbjxkaXYgY2xhc3M9XFxcImFzdC1rZXktcm93XFxcIj48c3Bhbj5QYW5lbDwvc3Bhbj48aW5wdXQgdHlwZT1cXFwiY29sb3JcXFwiIGlkPVxcXCJjdFBhbmVsXFxcIiB2YWx1ZT1cXFwiIzI0MjQyNFxcXCIgc3R5bGU9XFxcIndpZHRoOjQwcHg7aGVpZ2h0OjI0cHg7Ym9yZGVyOjFweCBzb2xpZCB2YXIoLS1iZHIsIzMzMyk7Ym9yZGVyLXJhZGl1czo0cHg7Y3Vyc29yOnBvaW50ZXI7cGFkZGluZzowO2JhY2tncm91bmQ6dmFyKC0tYmcyLCMyNDI0MjQpO1xcXCI+PC9kaXY+XFxuPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgaWQ9XFxcInNhdmVDdXN0b21UaGVtZVxcXCIgc3R5bGU9XFxcIm1hcmdpbi10b3A6NHB4O1xcXCI+U2F2ZSBUaGVtZTwvYnV0dG9uPlxcbiAgICAgICAgPC9kaXY+XFxuICAgICAgICA8ZGl2IGNsYXNzPVxcXCJhc3Qtc2VwXFxcIj48L2Rpdj5cXG4gICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG5cXFwiIGlkPVxcXCJteVRoZW1lc1RvZ2dsZUJ0blxcXCIgc3R5bGU9XFxcImRpc3BsYXk6ZmxleDthbGlnbi1pdGVtczpjZW50ZXI7anVzdGlmeS1jb250ZW50OnNwYWNlLWJldHdlZW47XFxcIj5cXG4gICAgICAgICAgPHNwYW4gc3R5bGU9XFxcImZvbnQtc2l6ZToxMHB4O2ZvbnQtd2VpZ2h0OjYwMDtsZXR0ZXItc3BhY2luZzoxcHg7dGV4dC10cmFuc2Zvcm06dXBwZXJjYXNlO2NvbG9yOnZhcigtLXRleHQtc2VjLCM4ODgpO1xcXCI+TXkgVGhlbWVzPC9zcGFuPlxcbiAgICAgICAgICA8c3BhbiBpZD1cXFwibXlUaGVtZXNBcnJvd1xcXCIgc3R5bGU9XFxcImNvbG9yOnZhcigtLXRleHQtc2VjLCM4ODgpO2ZvbnQtc2l6ZToxMnB4O1xcXCI+4pa8PC9zcGFuPlxcbiAgICAgICAgPC9idXR0b24+XFxuICAgICAgICA8ZGl2IGlkPVxcXCJteVRoZW1lc1NlY3Rpb25cXFwiIHN0eWxlPVxcXCJkaXNwbGF5Om5vbmU7cGFkZGluZy10b3A6NHB4O1xcXCI+XFxuICAgICAgICAgIDxkaXYgaWQ9XFxcImN1c3RvbVRoZW1lTGlzdFxcXCI+PC9kaXY+XFxuICAgICAgICAgIDxkaXYgaWQ9XFxcIm5vVGhlbWVzTXNnXFxcIiBzdHlsZT1cXFwiZm9udC1zaXplOjExcHg7Y29sb3I6IzU1NTt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjhweCAwO1xcXCI+Tm8gY3VzdG9tIHRoZW1lcyB5ZXQ8L2Rpdj5cXG4gICAgICAgIDwvZGl2PlxcbiAgICAgIDwvZGl2PlwiO1xuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKHNldHRpbmdzUGFuZWwpO1xuICBjb25zdCBzZXR0aW5nc0JvZHlFbGVtZW50ID0gc2V0dGluZ3NQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3NldHRpbmdzQm9keVwiKTtcbiAgbGV0IGlzU2V0dGluZ3NDb2xsYXBzZWQgPSBmYWxzZTtcbiAgc2V0dGluZ3NQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3NldHRpbmdzTWluXCIpLm9uY2xpY2sgPSBjbGlja0V2ZW50ID0+IHtcbiAgICBjbGlja0V2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGlzU2V0dGluZ3NDb2xsYXBzZWQgPSAhaXNTZXR0aW5nc0NvbGxhcHNlZDtcbiAgICBzZXR0aW5nc0JvZHlFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBpc1NldHRpbmdzQ29sbGFwc2VkID8gXCJub25lXCIgOiBcImJsb2NrXCI7XG4gICAgc2V0dGluZ3NQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3NldHRpbmdzTWluXCIpLnRleHRDb250ZW50ID0gaXNTZXR0aW5nc0NvbGxhcHNlZCA/IFwiK1wiIDogXCLiiJJcIjtcbiAgfTtcbiAgY29uc3QgdG9nZ2xlS2V5SW5wdXQgPSBzZXR0aW5nc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjdG9nZ2xlS2V5SW5wdXRcIik7XG4gIHRvZ2dsZUtleUlucHV0LnZhbHVlID0gcHJlc3NlZEtleS50b1VwcGVyQ2FzZSgpO1xuICB0b2dnbGVLZXlJbnB1dC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBrZXlib2FyZEV2ZW50ID0+IHtcbiAgICBrZXlib2FyZEV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgcHJlc3NlZEtleSA9IGtleWJvYXJkRXZlbnQua2V5O1xuICAgIHRvZ2dsZUtleUlucHV0LnZhbHVlID0ga2V5Ym9hcmRFdmVudC5rZXkubGVuZ3RoID09PSAxID8ga2V5Ym9hcmRFdmVudC5rZXkudG9VcHBlckNhc2UoKSA6IGtleWJvYXJkRXZlbnQua2V5O1xuICB9KTtcbiAgY29uc3QgYmdVcmxJbnB1dCA9IHNldHRpbmdzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNiZ1VybFwiKTtcbiAgYmdVcmxJbnB1dC52YWx1ZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiYmdVcmxcIikgfHwgXCJcIjtcbiAgc2V0dGluZ3NQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2FwcGx5QmdcIikub25jbGljayA9ICgpID0+IHtcbiAgICBjb25zdCBiYWNrZ3JvdW5kVXJsID0gYmdVcmxJbnB1dC52YWx1ZS50cmltKCk7XG4gICAgaWYgKCFiYWNrZ3JvdW5kVXJsKSB7XG4gICAgICBzaG93Tm90aWZpY2F0aW9uKFwiRW50ZXIgYSBVUkxcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiYmdVcmxcIiwgYmFja2dyb3VuZFVybCk7XG4gICAgaW5pdEJhY2tncm91bmRJbWFnZSgpO1xuICAgIHNob3dOb3RpZmljYXRpb24oXCJCYWNrZ3JvdW5kIGFwcGxpZWRcIik7XG4gIH07XG4gIGNvbnN0IHRoZW1lU2VsZWN0RWxlbWVudCA9IHNldHRpbmdzUGFuZWwucXVlcnlTZWxlY3RvcihcIiN0aGVtZVNlbGVjdFwiKTtcbiAgY29uc3QgY3VycmVudFRoZW1lID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJ0aGVtZVwiKSB8fCBcImdyZXlcIjtcbiAgY29uc3QgY3VzdG9tVGhlbWVzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImN1c3RvbVRoZW1lc1wiKSB8fCBcInt9XCIpO1xuICBjb25zdCBwcmVzZXRUaGVtZXMgPSBbXCJncmV5XCIsIFwiYmx1ZVwiLCBcInJlZFwiLCBcImdyZWVuXCIsIFwicGlua1wiLCBcInN0YXJ3YXJzXCIsIFwia2ZjXCIsIFwiaGFsbG93ZWVuXCJdO1xuICB0aGVtZVNlbGVjdEVsZW1lbnQudmFsdWUgPSBwcmVzZXRUaGVtZXMuaW5jbHVkZXMoY3VycmVudFRoZW1lKSB8fCBjdXN0b21UaGVtZXNbY3VycmVudFRoZW1lXSA/IGN1cnJlbnRUaGVtZSA6IFwiZ3JleVwiO1xuICB0aGVtZVNlbGVjdEVsZW1lbnQub25jaGFuZ2UgPSB0aGVtZUNoYW5nZUV2ZW50ID0+IHtcbiAgICBjb25zdCBzZWxlY3RlZFRoZW1lVmFsdWUgPSB0aGVtZUNoYW5nZUV2ZW50LnRhcmdldC52YWx1ZTtcbiAgICBpZiAoc2VsZWN0ZWRUaGVtZVZhbHVlID09PSBcImhhbGxvd2VlblwiKSB7XG4gICAgICBzaG93SGFsbG93ZWVuQ29kZU1vZGFsKGlzSGFsbG93ZWVuVGhlbWUgPT4ge1xuICAgICAgICBpZiAoaXNIYWxsb3dlZW5UaGVtZSkge1xuICAgICAgICAgIGFwcGx5VGhlbWUoXCJoYWxsb3dlZW5cIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhlbWVDaGFuZ2VFdmVudC50YXJnZXQudmFsdWUgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInRoZW1lXCIpIHx8IFwiZ3JleVwiO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgYXBwbHlUaGVtZShzZWxlY3RlZFRoZW1lVmFsdWUpO1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihcIlRoZW1lOiBcIiArIHNlbGVjdGVkVGhlbWVWYWx1ZSk7XG4gICAgfVxuICB9O1xuICBjb25zdCByZW5kZXJDdXN0b21UaGVtZUxpc3QgPSAoKSA9PiB7XG4gICAgY29uc3QgY3VzdG9tVGhlbWVMaXN0RWxlbWVudCA9IHNldHRpbmdzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNjdXN0b21UaGVtZUxpc3RcIik7XG4gICAgY29uc3Qgbm9UaGVtZXNNZXNzYWdlRWxlbWVudCA9IHNldHRpbmdzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNub1RoZW1lc01zZ1wiKTtcbiAgICBjb25zdCBjdXN0b21UaGVtZXNEYXRhID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImN1c3RvbVRoZW1lc1wiKSB8fCBcInt9XCIpO1xuICAgIGNvbnN0IHRoZW1lS2V5cyA9IE9iamVjdC5rZXlzKGN1c3RvbVRoZW1lc0RhdGEpO1xuICAgIGN1c3RvbVRoZW1lTGlzdEVsZW1lbnQuaW5uZXJIVE1MID0gXCJcIjtcbiAgICBub1RoZW1lc01lc3NhZ2VFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSB0aGVtZUtleXMubGVuZ3RoID09PSAwID8gXCJibG9ja1wiIDogXCJub25lXCI7XG4gICAgdGhlbWVLZXlzLmZvckVhY2goY3VycmVudFRoZW1lID0+IHtcbiAgICAgIGNvbnN0IHRoZW1lQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcbiAgICAgIHRoZW1lQ29udGFpbmVyLnN0eWxlLmNzc1RleHQgPSBcImRpc3BsYXk6ZmxleDtnYXA6NHB4O21hcmdpbi1ib3R0b206M3B4O1wiO1xuICAgICAgY29uc3QgaXNUaGVtZUFjdGl2ZSA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwidGhlbWVcIikgPT09IGN1cnJlbnRUaGVtZTtcbiAgICAgIHRoZW1lQ29udGFpbmVyLmlubmVySFRNTCA9IFwiXFxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG5cIiArIChpc1RoZW1lQWN0aXZlID8gXCIgdG9nZ2xlLW9uXCIgOiBcIlwiKSArIFwiXFxcIiBzdHlsZT1cXFwiZmxleDoxO21hcmdpbjowO1xcXCI+XCIgKyBjdXJyZW50VGhlbWUgKyBcIjwvYnV0dG9uPlxcbiAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuXFxcIiBzdHlsZT1cXFwid2lkdGg6MzJweDttYXJnaW46MDt0ZXh0LWFsaWduOmNlbnRlcjtjb2xvcjojZjQ0MzM2O1xcXCI+4pyVPC9idXR0b24+XCI7XG4gICAgICB0aGVtZUNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKFwiYnV0dG9uXCIpWzBdLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICAgIGFwcGx5VGhlbWUoY3VycmVudFRoZW1lKTtcbiAgICAgICAgc2hvd05vdGlmaWNhdGlvbihcIlRoZW1lOiBcIiArIGN1cnJlbnRUaGVtZSk7XG4gICAgICAgIHJlbmRlckN1c3RvbVRoZW1lTGlzdCgpO1xuICAgICAgfTtcbiAgICAgIHRoZW1lQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoXCJidXR0b25cIilbMV0ub25jbGljayA9ICgpID0+IHtcbiAgICAgICAgY29uc3QgY3VzdG9tVGhlbWVzID0gSlNPTi5wYXJzZShsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImN1c3RvbVRoZW1lc1wiKSB8fCBcInt9XCIpO1xuICAgICAgICBkZWxldGUgY3VzdG9tVGhlbWVzW2N1cnJlbnRUaGVtZV07XG4gICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiY3VzdG9tVGhlbWVzXCIsIEpTT04uc3RyaW5naWZ5KGN1c3RvbVRoZW1lcykpO1xuICAgICAgICBpZiAobG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJ0aGVtZVwiKSA9PT0gY3VycmVudFRoZW1lKSB7XG4gICAgICAgICAgYXBwbHlUaGVtZShcImdyZXlcIik7XG4gICAgICAgICAgdGhlbWVTZWxlY3RFbGVtZW50LnZhbHVlID0gXCJncmV5XCI7XG4gICAgICAgICAgc2hvd05vdGlmaWNhdGlvbihcIlRoZW1lIHJlc2V0IHRvIEdyZXlcIik7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc2hvd05vdGlmaWNhdGlvbihcIkRlbGV0ZWQ6IFwiICsgY3VycmVudFRoZW1lKTtcbiAgICAgICAgfVxuICAgICAgICByZW5kZXJDdXN0b21UaGVtZUxpc3QoKTtcbiAgICAgIH07XG4gICAgICBjdXN0b21UaGVtZUxpc3RFbGVtZW50LmFwcGVuZENoaWxkKHRoZW1lQ29udGFpbmVyKTtcbiAgICB9KTtcbiAgfTtcbiAgcmVuZGVyQ3VzdG9tVGhlbWVMaXN0KCk7XG4gIHNldHRpbmdzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNzYXZlQ3VzdG9tVGhlbWVcIikub25jbGljayA9ICgpID0+IHtcbiAgICBjb25zdCB0aGVtZU5hbWVJbnB1dCA9IHNldHRpbmdzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNjdXN0b21UaGVtZU5hbWVcIikudmFsdWUudHJpbSgpO1xuICAgIGlmICghdGhlbWVOYW1lSW5wdXQpIHtcbiAgICAgIHNob3dOb3RpZmljYXRpb24oXCJFbnRlciBhIHRoZW1lIG5hbWVcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGF2YWlsYWJsZVRoZW1lcyA9IFtcImdyZXlcIiwgXCJibHVlXCIsIFwicmVkXCIsIFwiZ3JlZW5cIiwgXCJwaW5rXCIsIFwic3RhcndhcnNcIiwgXCJrZmNcIiwgXCJoYWxsb3dlZW5cIl07XG4gICAgaWYgKGF2YWlsYWJsZVRoZW1lcy5pbmNsdWRlcyh0aGVtZU5hbWVJbnB1dC50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihcIkNhbm5vdCB1c2UgYnVpbHQtaW4gdGhlbWUgbmFtZVwiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgYWNjb3VudFZhbHVlID0gc2V0dGluZ3NQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2N0QWNjXCIpLnZhbHVlO1xuICAgIGNvbnN0IGJhY2tncm91bmRDb2xvciA9IHNldHRpbmdzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNjdEJnXCIpLnZhbHVlO1xuICAgIGNvbnN0IHBhbmVsQ29sb3IgPSBzZXR0aW5nc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjY3RQYW5lbFwiKS52YWx1ZTtcbiAgICBjb25zdCByZWRDaGFubmVsID0gcGFyc2VJbnQoYWNjb3VudFZhbHVlLnNsaWNlKDEsIDMpLCAxNik7XG4gICAgY29uc3QgZ3JlZW5DaGFubmVsID0gcGFyc2VJbnQoYWNjb3VudFZhbHVlLnNsaWNlKDMsIDUpLCAxNik7XG4gICAgY29uc3QgYmx1ZUNoYW5uZWwgPSBwYXJzZUludChhY2NvdW50VmFsdWUuc2xpY2UoNSwgNyksIDE2KTtcbiAgICBjb25zdCBhZGp1c3RIZXhDb2xvciA9IGhleENvbG9yQ29kZSA9PiB7XG4gICAgICBjb25zdCByZWRDaGFubmVsID0gcGFyc2VJbnQoaGV4Q29sb3JDb2RlLnNsaWNlKDEsIDMpLCAxNikgKyAxMDtcbiAgICAgIGNvbnN0IGdyZWVuQ2hhbm5lbCA9IHBhcnNlSW50KGhleENvbG9yQ29kZS5zbGljZSgzLCA1KSwgMTYpICsgMTA7XG4gICAgICBjb25zdCBibHVlQ2hhbm5lbCA9IHBhcnNlSW50KGhleENvbG9yQ29kZS5zbGljZSg1LCA3KSwgMTYpICsgMTA7XG4gICAgICByZXR1cm4gXCIjXCIgKyBbcmVkQ2hhbm5lbCwgZ3JlZW5DaGFubmVsLCBibHVlQ2hhbm5lbF0ubWFwKGNvbG9yQ2hhbm5lbFZhbHVlID0+IE1hdGgubWluKDI1NSwgY29sb3JDaGFubmVsVmFsdWUpLnRvU3RyaW5nKDE2KS5wYWRTdGFydCgyLCBcIjBcIikpLmpvaW4oXCJcIik7XG4gICAgfTtcbiAgICBjb25zdCB0aGVtZUNvbmZpZyA9IHtcbiAgICAgIGFjYzogYWNjb3VudFZhbHVlLFxuICAgICAgYWNjSDogYWRqdXN0SGV4Q29sb3IoYWNjb3VudFZhbHVlKSxcbiAgICAgIGFjY1JHQjogcmVkQ2hhbm5lbCArIFwiLFwiICsgZ3JlZW5DaGFubmVsICsgXCIsXCIgKyBibHVlQ2hhbm5lbCxcbiAgICAgIHRleHQ6IFwiI2UwZTBlMFwiLFxuICAgICAgdGV4dFNlYzogXCIjODg4XCIsXG4gICAgICBiZzE6IGJhY2tncm91bmRDb2xvcixcbiAgICAgIGJnMjogcGFuZWxDb2xvcixcbiAgICAgIGJnMzogYWRqdXN0SGV4Q29sb3IocGFuZWxDb2xvciksXG4gICAgICBib3JkZXI6IFwiIzMzM1wiLFxuICAgICAgaG92ZXI6IGFkanVzdEhleENvbG9yKHBhbmVsQ29sb3IpXG4gICAgfTtcbiAgICBjb25zdCBjdXN0b21UaGVtZXMgPSBKU09OLnBhcnNlKGxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiY3VzdG9tVGhlbWVzXCIpIHx8IFwie31cIik7XG4gICAgY3VzdG9tVGhlbWVzW3RoZW1lTmFtZUlucHV0XSA9IHRoZW1lQ29uZmlnO1xuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiY3VzdG9tVGhlbWVzXCIsIEpTT04uc3RyaW5naWZ5KGN1c3RvbVRoZW1lcykpO1xuICAgIGFwcGx5VGhlbWUodGhlbWVOYW1lSW5wdXQpO1xuICAgIHNldHRpbmdzUGFuZWwucXVlcnlTZWxlY3RvcihcIiNjdXN0b21UaGVtZU5hbWVcIikudmFsdWUgPSBcIlwiO1xuICAgIHJlbmRlckN1c3RvbVRoZW1lTGlzdCgpO1xuICAgIHNob3dOb3RpZmljYXRpb24oXCJUaGVtZSBzYXZlZDogXCIgKyB0aGVtZU5hbWVJbnB1dCk7XG4gIH07XG4gIGNvbnN0IGN1c3RvbVRoZW1lVG9nZ2xlQnRuID0gc2V0dGluZ3NQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2N1c3RvbVRoZW1lVG9nZ2xlQnRuXCIpO1xuICBjb25zdCBjdXN0b21UaGVtZVNlY3Rpb24gPSBzZXR0aW5nc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjY3VzdG9tVGhlbWVTZWN0aW9uXCIpO1xuICBjb25zdCBjdXN0b21UaGVtZUFycm93ID0gc2V0dGluZ3NQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI2N1c3RvbVRoZW1lQXJyb3dcIik7XG4gIGxldCBpc0N1c3RvbVRoZW1lU2VjdGlvbkV4cGFuZGVkID0gZmFsc2U7XG4gIGN1c3RvbVRoZW1lVG9nZ2xlQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgaXNDdXN0b21UaGVtZVNlY3Rpb25FeHBhbmRlZCA9ICFpc0N1c3RvbVRoZW1lU2VjdGlvbkV4cGFuZGVkO1xuICAgIGN1c3RvbVRoZW1lU2VjdGlvbi5zdHlsZS5kaXNwbGF5ID0gaXNDdXN0b21UaGVtZVNlY3Rpb25FeHBhbmRlZCA/IFwiYmxvY2tcIiA6IFwibm9uZVwiO1xuICAgIGN1c3RvbVRoZW1lQXJyb3cudGV4dENvbnRlbnQgPSBpc0N1c3RvbVRoZW1lU2VjdGlvbkV4cGFuZGVkID8gXCLilrJcIiA6IFwi4pa8XCI7XG4gIH07XG4gIGNvbnN0IG15VGhlbWVzVG9nZ2xlQnRuID0gc2V0dGluZ3NQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI215VGhlbWVzVG9nZ2xlQnRuXCIpO1xuICBjb25zdCBteVRoZW1lc1NlY3Rpb24gPSBzZXR0aW5nc1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbXlUaGVtZXNTZWN0aW9uXCIpO1xuICBjb25zdCBteVRoZW1lc0Fycm93ID0gc2V0dGluZ3NQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI215VGhlbWVzQXJyb3dcIik7XG4gIGxldCBpc1RoZW1lc0V4cGFuZGVkID0gZmFsc2U7XG4gIG15VGhlbWVzVG9nZ2xlQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgaXNUaGVtZXNFeHBhbmRlZCA9ICFpc1RoZW1lc0V4cGFuZGVkO1xuICAgIG15VGhlbWVzU2VjdGlvbi5zdHlsZS5kaXNwbGF5ID0gaXNUaGVtZXNFeHBhbmRlZCA/IFwiYmxvY2tcIiA6IFwibm9uZVwiO1xuICAgIG15VGhlbWVzQXJyb3cudGV4dENvbnRlbnQgPSBpc1RoZW1lc0V4cGFuZGVkID8gXCLilrJcIiA6IFwi4pa8XCI7XG4gICAgaWYgKGlzVGhlbWVzRXhwYW5kZWQpIHtcbiAgICAgIHJlbmRlckN1c3RvbVRoZW1lTGlzdCgpO1xuICAgIH1cbiAgfTtcbiAgbWFrZUVsZW1lbnREcmFnZ2FibGUoc2V0dGluZ3NQYW5lbCk7XG4gIHJldHVybiBzZXR0aW5nc1BhbmVsO1xufVxuZnVuY3Rpb24gY3JlYXRlTXVzaWNQYW5lbCgpIHtcbiAgY29uc3QgbXVzaWNQYW5lbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gIG11c2ljUGFuZWwuaWQgPSBcIm11c2ljLXBhbmVsXCI7XG4gIG11c2ljUGFuZWwuY2xhc3NOYW1lID0gXCJhc3QtcGFuZWxcIjtcbiAgbXVzaWNQYW5lbC5zdHlsZS5jc3NUZXh0ID0gXCJib3R0b206MjBweDtsZWZ0OjUxMHB4O3dpZHRoOjI0MHB4O1wiO1xuICBtdXNpY1BhbmVsLmlubmVySFRNTCA9IFwiXFxuICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LWhlYWRlclxcXCI+PHNwYW4gY2xhc3M9XFxcImFzdC1oZWFkZXItdGl0bGVcXFwiPk11c2ljIFBsYXllcjwvc3Bhbj48YnV0dG9uIGNsYXNzPVxcXCJhc3QtaGVhZGVyLW1pblxcXCIgaWQ9XFxcIm11c2ljTWluXFxcIj7iiJI8L2J1dHRvbj48L2Rpdj5cXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJhc3QtYm9keVxcXCIgaWQ9XFxcIm11c2ljQm9keVxcXCI+XFxuICAgICAgICA8ZGl2IGlkPVxcXCJtdXNpY1RyYWNrTmFtZVxcXCIgc3R5bGU9XFxcImZvbnQtc2l6ZToxMXB4O2NvbG9yOnZhcigtLWFjYywjODg4KTt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjRweCAycHggOHB4IDJweDtmb250LXdlaWdodDo2MDA7d2hpdGUtc3BhY2U6bm93cmFwO292ZXJmbG93OmhpZGRlbjt0ZXh0LW92ZXJmbG93OmVsbGlwc2lzO1xcXCI+Tm8gdHJhY2tzPC9kaXY+XFxuXFxuICAgICAgICA8ZGl2IHN0eWxlPVxcXCJkaXNwbGF5OmZsZXg7Z2FwOjRweDtqdXN0aWZ5LWNvbnRlbnQ6Y2VudGVyO21hcmdpbi1ib3R0b206OHB4O2ZsZXgtd3JhcDp3cmFwO1xcXCI+XFxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG5cXFwiIGlkPVxcXCJtdXNpY1ByZXZCdG5cXFwiIHN0eWxlPVxcXCJ3aWR0aDo0OHB4O21hcmdpbjowO3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6NnB4IDRweDtcXFwiPlByZXY8L2J1dHRvbj5cXG4gICAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgaWQ9XFxcIm11c2ljUGxheUJ0blxcXCIgc3R5bGU9XFxcIndpZHRoOjQ4cHg7bWFyZ2luOjA7dGV4dC1hbGlnbjpjZW50ZXI7cGFkZGluZzo2cHggNHB4O1xcXCI+UGxheTwvYnV0dG9uPlxcbiAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuXFxcIiBpZD1cXFwibXVzaWNTdG9wQnRuXFxcIiBzdHlsZT1cXFwid2lkdGg6NDhweDttYXJnaW46MDt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjZweCA0cHg7XFxcIj5TdG9wPC9idXR0b24+XFxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG5cXFwiIGlkPVxcXCJtdXNpY05leHRCdG5cXFwiIHN0eWxlPVxcXCJ3aWR0aDo0OHB4O21hcmdpbjowO3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6NnB4IDRweDtcXFwiPk5leHQ8L2J1dHRvbj5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgPGRpdiBzdHlsZT1cXFwiZGlzcGxheTpmbGV4O2dhcDo0cHg7anVzdGlmeS1jb250ZW50OmNlbnRlcjttYXJnaW4tYm90dG9tOjhweDtcXFwiPlxcbiAgICAgICAgICA8YnV0dG9uIGNsYXNzPVxcXCJhc3QtYnRuXFxcIiBpZD1cXFwibXVzaWNMb29wQnRuXFxcIiBzdHlsZT1cXFwid2lkdGg6NzBweDttYXJnaW46MDt0ZXh0LWFsaWduOmNlbnRlcjtwYWRkaW5nOjZweCA0cHg7XFxcIj5Mb29wPC9idXR0b24+XFxuICAgICAgICAgIDxidXR0b24gY2xhc3M9XFxcImFzdC1idG5cXFwiIGlkPVxcXCJtdXNpY1NodWZmbGVCdG5cXFwiIHN0eWxlPVxcXCJ3aWR0aDo3MHB4O21hcmdpbjowO3RleHQtYWxpZ246Y2VudGVyO3BhZGRpbmc6NnB4IDRweDtcXFwiPlNodWZmbGU8L2J1dHRvbj5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LWtleS1yb3dcXFwiIHN0eWxlPVxcXCJtYXJnaW4tYm90dG9tOjZweDtcXFwiPlxcbiAgICAgICAgICA8c3Bhbj5Wb2x1bWU8L3NwYW4+XFxuICAgICAgICAgIDxpbnB1dCB0eXBlPVxcXCJyYW5nZVxcXCIgaWQ9XFxcIm11c2ljVm9sdW1lXFxcIiBtaW49XFxcIjBcXFwiIG1heD1cXFwiMVxcXCIgc3RlcD1cXFwiMC4wNVxcXCIgdmFsdWU9XFxcIjAuNVxcXCIgc3R5bGU9XFxcIndpZHRoOjEyMHB4O2FjY2VudC1jb2xvcjp2YXIoLS1hY2MsIzg4OCk7XFxcIj5cXG4gICAgICAgIDwvZGl2PlxcblxcbiAgICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LXNlcFxcXCI+PC9kaXY+XFxuICAgICAgICA8c3BhbiBjbGFzcz1cXFwiYXN0LXNlY3Rpb24tbGFiZWxcXFwiPkFkZCBUcmFjazwvc3Bhbj5cXG4gICAgICAgIDxpbnB1dCBjbGFzcz1cXFwiYXN0LWlucHV0XFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiBpZD1cXFwibXVzaWNVcmxJbnB1dFxcXCIgcGxhY2Vob2xkZXI9XFxcIkF1ZGlvIG9yIFlvdVR1YmUgVVJMLi4uXFxcIiBzdHlsZT1cXFwid2lkdGg6MTAwJTtib3gtc2l6aW5nOmJvcmRlci1ib3g7bWFyZ2luLWJvdHRvbTo0cHg7XFxcIj5cXG4gICAgICAgIDxpbnB1dCBjbGFzcz1cXFwiYXN0LWlucHV0XFxcIiB0eXBlPVxcXCJ0ZXh0XFxcIiBpZD1cXFwibXVzaWNOYW1lSW5wdXRcXFwiIHBsYWNlaG9sZGVyPVxcXCJUcmFjayBuYW1lIChvcHRpb25hbClcXFwiIHN0eWxlPVxcXCJ3aWR0aDoxMDAlO2JveC1zaXppbmc6Ym9yZGVyLWJveDttYXJnaW4tYm90dG9tOjRweDtcXFwiPlxcbiAgICAgICAgPGJ1dHRvbiBjbGFzcz1cXFwiYXN0LWJ0blxcXCIgaWQ9XFxcIm11c2ljQWRkQnRuXFxcIj5BZGQgVHJhY2s8L2J1dHRvbj5cXG5cXG4gICAgICAgIDxkaXYgY2xhc3M9XFxcImFzdC1zZXBcXFwiPjwvZGl2PlxcbiAgICAgICAgPHNwYW4gY2xhc3M9XFxcImFzdC1zZWN0aW9uLWxhYmVsXFxcIj5QbGF5bGlzdDwvc3Bhbj5cXG4gICAgICAgIDxkaXYgaWQ9XFxcIm11c2ljVHJhY2tMaXN0XFxcIiBzdHlsZT1cXFwibWF4LWhlaWdodDoxNTBweDtvdmVyZmxvdy15OmF1dG87XFxcIj48L2Rpdj5cXG4gICAgICA8L2Rpdj5cIjtcbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChtdXNpY1BhbmVsKTtcbiAgY29uc3QgbXVzaWNCb2R5RWxlbWVudCA9IG11c2ljUGFuZWwucXVlcnlTZWxlY3RvcihcIiNtdXNpY0JvZHlcIik7XG4gIGxldCBpc011c2ljSGlkZGVuID0gZmFsc2U7XG4gIG11c2ljUGFuZWwucXVlcnlTZWxlY3RvcihcIiNtdXNpY01pblwiKS5vbmNsaWNrID0gZXZlbnQgPT4ge1xuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGlzTXVzaWNIaWRkZW4gPSAhaXNNdXNpY0hpZGRlbjtcbiAgICBtdXNpY0JvZHlFbGVtZW50LnN0eWxlLmRpc3BsYXkgPSBpc011c2ljSGlkZGVuID8gXCJub25lXCIgOiBcImJsb2NrXCI7XG4gICAgbXVzaWNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI211c2ljTWluXCIpLnRleHRDb250ZW50ID0gaXNNdXNpY0hpZGRlbiA/IFwiK1wiIDogXCLiiJJcIjtcbiAgfTtcbiAgbXVzaWNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI211c2ljUHJldkJ0blwiKS5vbmNsaWNrID0gKCkgPT4gcGxheVByZXZpb3VzKCk7XG4gIG11c2ljUGFuZWwucXVlcnlTZWxlY3RvcihcIiNtdXNpY1N0b3BCdG5cIikub25jbGljayA9ICgpID0+IHJlc2V0UGxheWJhY2soKTtcbiAgbXVzaWNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI211c2ljTmV4dEJ0blwiKS5vbmNsaWNrID0gKCkgPT4gcGxheU5leHRPclJhbmRvbSgpO1xuICBjb25zdCBtdXNpY1BsYXlCdXR0b24gPSBtdXNpY1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbXVzaWNQbGF5QnRuXCIpO1xuICBtdXNpY1BsYXlCdXR0b24ub25jbGljayA9ICgpID0+IHtcbiAgICBpZiAoIW11c2ljUGxheWxpc3QubGVuZ3RoKSB7XG4gICAgICBzaG93Tm90aWZpY2F0aW9uKFwiQWRkIGEgdHJhY2sgZmlyc3RcIik7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChpc1BsYXlpbmcoKSkge1xuICAgICAgcGF1c2VQbGF5YmFjaygpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bWVQbGF5YmFjaygpO1xuICAgIH1cbiAgfTtcbiAgY29uc3QgbXVzaWNMb29wQnV0dG9uID0gbXVzaWNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI211c2ljTG9vcEJ0blwiKTtcbiAgbXVzaWNMb29wQnV0dG9uLmNsYXNzTGlzdC50b2dnbGUoXCJ0b2dnbGUtb25cIiwgdWlhdWRpb1N0YXRlLmlzTXVzaWNMb29wRW5hYmxlZCk7XG4gIG11c2ljTG9vcEJ1dHRvbi5vbmNsaWNrID0gKCkgPT4ge1xuICAgIHVpYXVkaW9TdGF0ZS5pc011c2ljTG9vcEVuYWJsZWQgPSAhdWlhdWRpb1N0YXRlLmlzTXVzaWNMb29wRW5hYmxlZDtcbiAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcIm11c2ljTG9vcFwiLCB1aWF1ZGlvU3RhdGUuaXNNdXNpY0xvb3BFbmFibGVkKTtcbiAgICBtdXNpY0xvb3BCdXR0b24uY2xhc3NMaXN0LnRvZ2dsZShcInRvZ2dsZS1vblwiLCB1aWF1ZGlvU3RhdGUuaXNNdXNpY0xvb3BFbmFibGVkKTtcbiAgICBzaG93Tm90aWZpY2F0aW9uKHVpYXVkaW9TdGF0ZS5pc011c2ljTG9vcEVuYWJsZWQgPyBcIkxvb3AgT05cIiA6IFwiTG9vcCBPRkZcIik7XG4gIH07XG4gIGNvbnN0IG11c2ljU2h1ZmZsZUJ1dHRvbiA9IG11c2ljUGFuZWwucXVlcnlTZWxlY3RvcihcIiNtdXNpY1NodWZmbGVCdG5cIik7XG4gIG11c2ljU2h1ZmZsZUJ1dHRvbi5jbGFzc0xpc3QudG9nZ2xlKFwidG9nZ2xlLW9uXCIsIHVpYXVkaW9TdGF0ZS5pc011c2ljU2h1ZmZsZUVuYWJsZWQpO1xuICBtdXNpY1NodWZmbGVCdXR0b24ub25jbGljayA9ICgpID0+IHtcbiAgICB1aWF1ZGlvU3RhdGUuaXNNdXNpY1NodWZmbGVFbmFibGVkID0gIXVpYXVkaW9TdGF0ZS5pc011c2ljU2h1ZmZsZUVuYWJsZWQ7XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJtdXNpY1NodWZmbGVcIiwgdWlhdWRpb1N0YXRlLmlzTXVzaWNTaHVmZmxlRW5hYmxlZCk7XG4gICAgbXVzaWNTaHVmZmxlQnV0dG9uLmNsYXNzTGlzdC50b2dnbGUoXCJ0b2dnbGUtb25cIiwgdWlhdWRpb1N0YXRlLmlzTXVzaWNTaHVmZmxlRW5hYmxlZCk7XG4gICAgc2hvd05vdGlmaWNhdGlvbih1aWF1ZGlvU3RhdGUuaXNNdXNpY1NodWZmbGVFbmFibGVkID8gXCJTaHVmZmxlIE9OXCIgOiBcIlNodWZmbGUgT0ZGXCIpO1xuICB9O1xuICBjb25zdCBtdXNpY1ZvbHVtZUNvbnRyb2wgPSBtdXNpY1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbXVzaWNWb2x1bWVcIik7XG4gIG11c2ljVm9sdW1lQ29udHJvbC52YWx1ZSA9IHVpYXVkaW9TdGF0ZS5tdXNpY1ZvbHVtZTtcbiAgbXVzaWNWb2x1bWVDb250cm9sLm9uaW5wdXQgPSB2b2x1bWVDaGFuZ2VFdmVudCA9PiB7XG4gICAgdWlhdWRpb1N0YXRlLm11c2ljVm9sdW1lID0gcGFyc2VGbG9hdCh2b2x1bWVDaGFuZ2VFdmVudC50YXJnZXQudmFsdWUpO1xuICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwibXVzaWNWb2x1bWVcIiwgdWlhdWRpb1N0YXRlLm11c2ljVm9sdW1lKTtcbiAgICBpZiAoYXVkaW9QbGF5ZXIpIHtcbiAgICAgIGF1ZGlvUGxheWVyLnZvbHVtZSA9IHVpYXVkaW9TdGF0ZS5tdXNpY1ZvbHVtZTtcbiAgICB9XG4gICAgaWYgKHlvdXR1YmVQbGF5ZXIpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHlvdXR1YmVQbGF5ZXIuc2V0Vm9sdW1lKE1hdGgucm91bmQodWlhdWRpb1N0YXRlLm11c2ljVm9sdW1lICogMTAwKSk7XG4gICAgICB9IGNhdGNoICh1bnVzZWRWYXJpYWJsZSkge31cbiAgICB9XG4gIH07XG4gIG11c2ljUGFuZWwucXVlcnlTZWxlY3RvcihcIiNtdXNpY0FkZEJ0blwiKS5vbmNsaWNrID0gKCkgPT4ge1xuICAgIGNvbnN0IG11c2ljVXJsID0gbXVzaWNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI211c2ljVXJsSW5wdXRcIikudmFsdWUudHJpbSgpO1xuICAgIGNvbnN0IG11c2ljTmFtZSA9IG11c2ljUGFuZWwucXVlcnlTZWxlY3RvcihcIiNtdXNpY05hbWVJbnB1dFwiKS52YWx1ZS50cmltKCk7XG4gICAgaWYgKCFtdXNpY1VybCkge1xuICAgICAgc2hvd05vdGlmaWNhdGlvbihcIkVudGVyIGEgVVJMXCIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBtdXNpY1BhbmVsLnF1ZXJ5U2VsZWN0b3IoXCIjbXVzaWNVcmxJbnB1dFwiKS52YWx1ZSA9IFwiXCI7XG4gICAgbXVzaWNQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI211c2ljTmFtZUlucHV0XCIpLnZhbHVlID0gXCJcIjtcbiAgICBhZGRUcmFja1RvUGxheWxpc3QobXVzaWNVcmwsIG11c2ljTmFtZSk7XG4gIH07XG4gIHVwZGF0ZU11c2ljUGFuZWwoKTtcbiAgbWFrZUVsZW1lbnREcmFnZ2FibGUobXVzaWNQYW5lbCk7XG4gIHJldHVybiBtdXNpY1BhbmVsO1xufVxuZnVuY3Rpb24gY3JlYXRlVXBkYXRlSGlzdG9yeVBhbmVsKCkge1xuICBjb25zdCB1cGRhdGVQYW5lbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIik7XG4gIHVwZGF0ZVBhbmVsLmlkID0gXCJ1cGRhdGUtaGlzdG9yeVwiO1xuICB1cGRhdGVQYW5lbC5jbGFzc05hbWUgPSBcImFzdC1wYW5lbFwiO1xuICB1cGRhdGVQYW5lbC5zdHlsZS5jc3NUZXh0ID0gXCJib3R0b206MjBweDtsZWZ0OjIwcHg7d2lkdGg6MjMwcHg7bWF4LWhlaWdodDoyODBweDtcIjtcbiAgdXBkYXRlUGFuZWwuaW5uZXJIVE1MID0gXCJcXG4gICAgICA8ZGl2IGNsYXNzPVxcXCJhc3QtaGVhZGVyXFxcIj48c3BhbiBjbGFzcz1cXFwiYXN0LWhlYWRlci10aXRsZVxcXCI+VXBkYXRlczwvc3Bhbj48YnV0dG9uIGNsYXNzPVxcXCJhc3QtaGVhZGVyLW1pblxcXCIgaWQ9XFxcInVwZGF0ZU1pblxcXCI+4oiSPC9idXR0b24+PC9kaXY+XFxuICAgICAgPGRpdiBjbGFzcz1cXFwiYXN0LWJvZHlcXFwiIGlkPVxcXCJ1cGRhdGVCb2R5XFxcIiBzdHlsZT1cXFwib3ZlcmZsb3cteTphdXRvO21heC1oZWlnaHQ6MjIwcHg7XFxcIj5cXG4gICAgICAgIDx1bCBjbGFzcz1cXFwiYXN0LXVwZGF0ZS1saXN0XFxcIj5cXG4gICAgICAgIDxsaT48c3Ryb25nPnYxLjk8L3N0cm9uZz4g4oCUIEZpeGVkIEVTUCBub3QgZnVsbHkgd29ya2luZywgYWRkZWQgbXVzaWMgcGxheWVyLCBhbmQgYWRkZWQgYXV0by1uYW1lIChzYXZlcyBsb2NhbGx5KS48L2xpPlxcbiAgICAgICAgIDxsaT48c3Ryb25nPnYxLjg8L3N0cm9uZz4g4oCUIEZpeGVkIEFzdHJhLVZpc2lvbiAoU2hhZG93cyBub3QgYmVpbmcgUmVtb3ZlZCksIGFkZGVkIEN1c3RvbSBUaGVtZXMgRmVhdHVyZSwgZml4ZWQgZW5hYmxlL2Rpc2FibGUgZm9yIHNsaWRlcnMsIGZpeGVkIEVTUCBub3Qgd29ya2luZyBwcm9wZXJseS9nbHRpY2hlZC48L2xpPlxcbiAgICAgICAgICA8bGk+PHN0cm9uZz52MS43PC9zdHJvbmc+IOKAlCBOZXcgRmVhdHVyZXMgYW5kIE9yZ2FuaXphdGlvbi48L2xpPlxcbiAgICAgICAgPC91bD5cXG4gICAgICA8L2Rpdj5cIjtcbiAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZCh1cGRhdGVQYW5lbCk7XG4gIGNvbnN0IHVwZGF0ZUJvZHkgPSB1cGRhdGVQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3VwZGF0ZUJvZHlcIik7XG4gIGxldCBpc01pbmltaXplZCA9IGZhbHNlO1xuICB1cGRhdGVQYW5lbC5xdWVyeVNlbGVjdG9yKFwiI3VwZGF0ZU1pblwiKS5vbmNsaWNrID0gZXZlbnQgPT4ge1xuICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIGlzTWluaW1pemVkID0gIWlzTWluaW1pemVkO1xuICAgIHVwZGF0ZUJvZHkuc3R5bGUuZGlzcGxheSA9IGlzTWluaW1pemVkID8gXCJub25lXCIgOiBcImJsb2NrXCI7XG4gICAgdXBkYXRlUGFuZWwucXVlcnlTZWxlY3RvcihcIiN1cGRhdGVNaW5cIikudGV4dENvbnRlbnQgPSBpc01pbmltaXplZCA/IFwiK1wiIDogXCLiiJJcIjtcbiAgfTtcbiAgbWFrZUVsZW1lbnREcmFnZ2FibGUodXBkYXRlUGFuZWwpO1xuICByZXR1cm4gdXBkYXRlUGFuZWw7XG59XG5sZXQgcHJlc3NlZEtleSA9IFwiU2hpZnRcIjtcbmZ1bmN0aW9uIHRvZ2dsZVBhbmVsc1Zpc2liaWxpdHkoKSB7XG4gIGNvbnN0IHBhbmVsSWRzID0gW1wiZGVlcC10b29scy1wYW5lbFwiLCBcInZpc2lvbi1wYW5lbFwiLCBcImNvbWJhdC1wYW5lbFwiLCBcImF1dG9tYXRpb24tcGFuZWxcIiwgXCJ1cGRhdGUtaGlzdG9yeVwiLCBcInNldHRpbmdzLXBhbmVsXCIsIFwibXVzaWMtcGFuZWxcIl07XG4gIGNvbnN0IGRlZXBUb29sc1BhbmVsRWxlbWVudCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZGVlcC10b29scy1wYW5lbFwiKTtcbiAgaWYgKCFkZWVwVG9vbHNQYW5lbEVsZW1lbnQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgaXNQYW5lbFZpc2libGUgPSBkZWVwVG9vbHNQYW5lbEVsZW1lbnQuc3R5bGUuZGlzcGxheSAhPT0gXCJub25lXCI7XG4gIHBhbmVsSWRzLmZvckVhY2goZWxlbWVudElkID0+IHtcbiAgICBjb25zdCB0YXJnZXRFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoZWxlbWVudElkKTtcbiAgICBpZiAodGFyZ2V0RWxlbWVudCkge1xuICAgICAgdGFyZ2V0RWxlbWVudC5zdHlsZS5kaXNwbGF5ID0gaXNQYW5lbFZpc2libGUgPyBcIm5vbmVcIiA6IFwiYmxvY2tcIjtcbiAgICB9XG4gIH0pO1xufVxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwgaW5wdXRFdmVudCA9PiB7XG4gIGlmIChpbnB1dEV2ZW50LnRhcmdldC5tYXRjaGVzKFwiaW5wdXQsdGV4dGFyZWEsc2VsZWN0LFtjb250ZW50ZWRpdGFibGVdXCIpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChpbnB1dEV2ZW50LnJlcGVhdCkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoaW5wdXRFdmVudC5rZXkudG9Mb3dlckNhc2UoKSA9PT0gcHJlc3NlZEtleVEudG9Mb3dlckNhc2UoKSkge1xuICAgIGlucHV0RXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBpbnB1dEV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgIHNpbXVsYXRlUG9pbnRlck1vdmUoXCJsZWZ0XCIpO1xuICB9XG4gIGlmIChpbnB1dEV2ZW50LmtleS50b0xvd2VyQ2FzZSgpID09PSBwcmVzc2VkS2V5RS50b0xvd2VyQ2FzZSgpKSB7XG4gICAgaW5wdXRFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIGlucHV0RXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgc2ltdWxhdGVQb2ludGVyTW92ZShcInJpZ2h0XCIpO1xuICB9XG59LCB0cnVlKTtcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGlucHV0RXZlbnRfMiA9PiB7XG4gIGlmIChpbnB1dEV2ZW50XzIudGFyZ2V0Lm1hdGNoZXMoXCJpbnB1dCx0ZXh0YXJlYSxzZWxlY3QsW2NvbnRlbnRlZGl0YWJsZV1cIikpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKGlucHV0RXZlbnRfMi5yZXBlYXQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKGlucHV0RXZlbnRfMi5rZXkudG9Mb3dlckNhc2UoKSA9PT0gd2luZG93LmxvY2tLZXkudG9Mb3dlckNhc2UoKSkge1xuICAgIGlucHV0RXZlbnRfMi5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHRvZ2dsZUxvY2soKTtcbiAgfVxufSwgdHJ1ZSk7XG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBpbnB1dEV2ZW50XzMgPT4ge1xuICBpZiAoaW5wdXRFdmVudF8zLnRhcmdldC5tYXRjaGVzKFwiaW5wdXQsdGV4dGFyZWEsc2VsZWN0LFtjb250ZW50ZWRpdGFibGVdXCIpKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmIChpbnB1dEV2ZW50XzMucmVwZWF0KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGVudGl0eVRyYWNlS2V5ID0gd2luZG93LmVudGl0eVRyYWNlS2V5LnRvTG93ZXJDYXNlKCk7XG4gIGNvbnN0IGl0ZW1LZXkgPSBpbnB1dEV2ZW50XzMua2V5LnRvTG93ZXJDYXNlKCk7XG4gIGNvbnN0IGl0ZW1Db2RlID0gaW5wdXRFdmVudF8zLmNvZGUudG9Mb3dlckNhc2UoKTtcbiAgaWYgKGl0ZW1LZXkgPT09IGVudGl0eVRyYWNlS2V5IHx8IGl0ZW1Db2RlID09PSBlbnRpdHlUcmFjZUtleSB8fCBpdGVtQ29kZSA9PT0gXCJrZXlcIiArIGVudGl0eVRyYWNlS2V5KSB7XG4gICAgaW5wdXRFdmVudF8zLnByZXZlbnREZWZhdWx0KCk7XG4gICAgdG9nZ2xlRW50aXR5VHJhaWwoKTtcbiAgfVxufSwgdHJ1ZSk7XG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBldmVudCA9PiB7XG4gIGlmIChldmVudC50YXJnZXQubWF0Y2hlcyhcImlucHV0LHRleHRhcmVhLHNlbGVjdFwiKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoZXZlbnQua2V5ID09PSBcIkYzXCIpIHtcbiAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHRyYWNrTmVhcmVzdFBsYXllcigpO1xuICB9XG4gIGlmIChldmVudC5rZXkgPT09IFwiRjRcIikge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgY2xlYXJUcmFja2luZygpO1xuICB9XG59KTtcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGV2ZW50XzIgPT4ge1xuICBpZiAoZXZlbnRfMi50YXJnZXQubWF0Y2hlcyhcImlucHV0LHRleHRhcmVhLHNlbGVjdFwiKSkge1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoZXZlbnRfMi5rZXkgPT09IFwiRjVcIikge1xuICAgIGV2ZW50XzIucHJldmVudERlZmF1bHQoKTtcbiAgICBpZiAod2luZG93LmF1dG9GYXJtQWN0aXZlKSB7XG4gICAgICBzdG9wQXV0b0Zhcm0oKTtcbiAgICAgIGNvbnN0IGF1dG9GYXJtQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJhdXRvRmFybUJ0blwiKTtcbiAgICAgIGlmIChhdXRvRmFybUJ1dHRvbikge1xuICAgICAgICBhdXRvRmFybUJ1dHRvbi50ZXh0Q29udGVudCA9IFwiQXV0byBGYXJtXCI7XG4gICAgICAgIGF1dG9GYXJtQnV0dG9uLmNsYXNzTGlzdC5yZW1vdmUoXCJ0b2dnbGUtb25cIik7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGZhcm1Nb2RlU2VsZWN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJmYXJtTW9kZVNlbGVjdFwiKTtcbiAgICAgIHN0YXJ0QXV0b0Zhcm0oZmFybU1vZGVTZWxlY3QgPyBmYXJtTW9kZVNlbGVjdC52YWx1ZSA6IFwibmVhcmVzdFwiKTtcbiAgICAgIGNvbnN0IGF1dG9GYXJtQnV0dG9uXzIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImF1dG9GYXJtQnRuXCIpO1xuICAgICAgaWYgKGF1dG9GYXJtQnV0dG9uXzIpIHtcbiAgICAgICAgYXV0b0Zhcm1CdXR0b25fMi50ZXh0Q29udGVudCA9IFwiU3RvcCBGYXJtXCI7XG4gICAgICAgIGF1dG9GYXJtQnV0dG9uXzIuY2xhc3NMaXN0LmFkZChcInRvZ2dsZS1vblwiKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn0pO1xuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwga2V5Ym9hcmRFdmVudCA9PiB7XG4gIGlmIChrZXlib2FyZEV2ZW50LmtleSA9PT0gcHJlc3NlZEtleSAmJiAha2V5Ym9hcmRFdmVudC5yZXBlYXQgJiYgIWtleWJvYXJkRXZlbnQudGFyZ2V0Lm1hdGNoZXMoXCJpbnB1dCx0ZXh0YXJlYSxidXR0b24sc2VsZWN0XCIpKSB7XG4gICAga2V5Ym9hcmRFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIHRvZ2dsZVBhbmVsc1Zpc2liaWxpdHkoKTtcbiAgfVxufSk7XG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgKCkgPT4ge1xuICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICBpbml0QW50aURldGVjdGlvbigpO1xuICAgIGluaXRCYWNrZ3JvdW5kSW1hZ2UoKTtcbiAgfSwgMTAwMCk7XG4gIHNldEludGVydmFsKCgpID0+IHtcbiAgICBpZiAod2luZG93Ll9fc3M/LnN0YXRlcykge1xuICAgICAgZm9yIChjb25zdCBnYW1lSW5zdGFuY2Ugb2Ygd2luZG93Ll9fc3Muc3RhdGVzKSB7XG4gICAgICAgIGlmIChzdGF0ZS5nYW1lSW5zdGFuY2U/LmdhbWVTY2VuZT8ubXlBbmltYWxzPy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgc3RhdGUuYW5pbWFsRGF0YSA9IHN0YXRlLmdhbWVJbnN0YW5jZS5nYW1lU2NlbmU7XG4gICAgICAgICAgc3RhdGUuZ2FtZUluc3RhbmNlID0gc3RhdGUuZ2FtZUluc3RhbmNlLmdhbWVTY2VuZS5nYW1lO1xuICAgICAgICAgIHdpbmRvdy5fX2NhY2hlZEVNID0gbnVsbDtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSwgMjAwMCk7XG59KTtcblxuZXhwb3J0IHsgY3JlYXRlVG9vbHNQYW5lbCwgY3JlYXRlVmlzaW9uUGFuZWwsIGNyZWF0ZUNvbWJhdFBhbmVsLCBjcmVhdGVBdXRvbWF0aW9uUGFuZWwsIGNyZWF0ZVNldHRpbmdzUGFuZWwsIGNyZWF0ZU11c2ljUGFuZWwsIGNyZWF0ZVVwZGF0ZUhpc3RvcnlQYW5lbCB9O1xuIiwiaW1wb3J0IHsgc2hvd05vdGlmaWNhdGlvbiB9IGZyb20gJy4uL3VpL2ludGVyYWN0aW9uLmpzJztcblxubGV0IGlzVmlkZW9QbGF5aW5nID0gZmFsc2U7XG5mdW5jdGlvbiBpbml0QWRCbG9ja2VyKCkge1xuICBpZiAoaXNWaWRlb1BsYXlpbmcpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgaXNWaWRlb1BsYXlpbmcgPSB0cnVlO1xuICBjb25zdCBhZFNlbGVjdG9ycyA9IFtcImRpdi5hZC1ibG9ja1wiLCBcImFbaHJlZio9XFxcImFkXFxcIl1cIiwgXCJpZnJhbWVbc3JjKj1cXFwiYWRzXFxcIl0sIGlmcmFtZVtzcmMqPVxcXCJnb29nbGVhZFxcXCJdXCIsIFwiLmFkdmVydGlzZW1lbnRcIiwgXCJbY2xhc3MqPVxcXCJhZHNcXFwiXSwgW2NsYXNzKj1cXFwiYWQtXFxcIl1cIiwgXCJbaWQqPVxcXCJhZFxcXCJdLCBbaWQqPVxcXCJiYW5uZXJcXFwiXVwiLCBcIi5zaWRlYmFyLmxlZnQgPiBhXCIsIFwiLnNpZGViYXIubGVmdCA+IGRpdjpub3QoLnNpZGViYXItY29udGVudClcIiwgXCJkaXYuc2lkZWJhci5sZWZ0ID4gZGl2Omhhcyg+IGlmcmFtZSlcIiwgXCJkaXYuc2lkZWJhci5sZWZ0ID4gZGl2Omhhcyg+IGFbaHJlZio9XFxcImRvdWJsZWNsaWNrXFxcIl0pXCJdO1xuICBjb25zdCByZW1vdmVBZHMgPSAoKSA9PiB7XG4gICAgYWRTZWxlY3RvcnMuZm9yRWFjaChlbGVtZW50U2VsZWN0b3IgPT4ge1xuICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChlbGVtZW50U2VsZWN0b3IpLmZvckVhY2godGFyZ2V0RWxlbWVudCA9PiB7XG4gICAgICAgIHRhcmdldEVsZW1lbnQuc3R5bGUuZGlzcGxheSA9IFwibm9uZVwiO1xuICAgICAgICB0YXJnZXRFbGVtZW50LnN0eWxlLm9wYWNpdHkgPSBcIjBcIjtcbiAgICAgICAgdGFyZ2V0RWxlbWVudC5zdHlsZS5wb2ludGVyRXZlbnRzID0gXCJub25lXCI7XG4gICAgICAgIHRhcmdldEVsZW1lbnQuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XG4gICAgICAgIHRhcmdldEVsZW1lbnQucmVtb3ZlQXR0cmlidXRlKFwic3JjXCIpO1xuICAgICAgICB0YXJnZXRFbGVtZW50LnJlbW92ZSgpO1xuICAgICAgfSk7XG4gICAgfSk7XG4gICAgY29uc3QgbGVmdFNpZGViYXJFbGVtZW50ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcImRpdi5zaWRlYmFyLmxlZnRcIik7XG4gICAgaWYgKGxlZnRTaWRlYmFyRWxlbWVudCkge1xuICAgICAgbGVmdFNpZGViYXJFbGVtZW50LnN0eWxlLm1heFdpZHRoID0gXCIzMHZ3XCI7XG4gICAgICBsZWZ0U2lkZWJhckVsZW1lbnQuc3R5bGUud2lkdGggPSBcIjIxcmVtXCI7XG4gICAgICBsZWZ0U2lkZWJhckVsZW1lbnQuc3R5bGUub3ZlcmZsb3cgPSBcImhpZGRlblwiO1xuICAgIH1cbiAgfTtcbiAgcmVtb3ZlQWRzKCk7XG4gIG5ldyBNdXRhdGlvbk9ic2VydmVyKHJlbW92ZUFkcykub2JzZXJ2ZShkb2N1bWVudC5ib2R5LCB7XG4gICAgY2hpbGRMaXN0OiB0cnVlLFxuICAgIHN1YnRyZWU6IHRydWUsXG4gICAgYXR0cmlidXRlczogdHJ1ZVxuICB9KTtcbiAgc2V0SW50ZXJ2YWwocmVtb3ZlQWRzLCA1MDAwKTtcbiAgc2hvd05vdGlmaWNhdGlvbihcIkFkIGJsb2NrZXIgYWN0aXZlXCIpO1xufVxuXG5leHBvcnQgeyBpbml0QWRCbG9ja2VyIH07XG4iLCJpbXBvcnQgeyBnZXRHYW1lU3RhdGUgfSBmcm9tICcuL2ZlYXR1cmVzL2F1dG9mYXJtLmpzJztcbmltcG9ydCB7IGFwcGx5VGhlbWUsIGluaXRCYWNrZ3JvdW5kSW1hZ2UsIGluamVjdFN0eWxlcyB9IGZyb20gJy4vdWkvdGhlbWUuanMnO1xuaW1wb3J0IHsgY3JlYXRlVG9vbHNQYW5lbCwgY3JlYXRlVmlzaW9uUGFuZWwsIGNyZWF0ZUNvbWJhdFBhbmVsLCBjcmVhdGVBdXRvbWF0aW9uUGFuZWwsIGNyZWF0ZVNldHRpbmdzUGFuZWwsIGNyZWF0ZU11c2ljUGFuZWwsIGNyZWF0ZVVwZGF0ZUhpc3RvcnlQYW5lbCB9IGZyb20gJy4vdWkvcGFuZWxzLmpzJztcbmltcG9ydCB7IGluaXRBZEJsb2NrZXIgfSBmcm9tICcuL2ZlYXR1cmVzL2FkYmxvY2suanMnO1xuaW1wb3J0IHsgaW5pdFJhZGFyRHJhZyB9IGZyb20gJy4vdWkvcmFkYXIuanMnO1xuaW1wb3J0IHsgaW5pdEF1dG9maWxsTmFtZSB9IGZyb20gJy4vdWkvaW50ZXJhY3Rpb24uanMnO1xuaW1wb3J0IHsgcmVuZGVyTG9vcCwgcmVuZGVyRXNwTG9vcCB9IGZyb20gJy4vZmVhdHVyZXMvZXNwLmpzJztcbmltcG9ydCB7IHVwZGF0ZUxvY2tMb29wLCBhdXRvRG9kZ2VMb29wIH0gZnJvbSAnLi9mZWF0dXJlcy9haW1ib3QuanMnO1xuXG5sZXQgbWV0YWRhdGFNYXAgPSBuZXcgV2Vha01hcCgpO1xuZnVuY3Rpb24gd3JhcFdpdGhQcm94eSh0YXJnZXRPYmplY3QsIHByb3BlcnR5S2V5LCBoYW5kbGVyKSB7XG4gIGNvbnN0IG9yaWdpbmFsVmFsdWUgPSB0YXJnZXRPYmplY3RbcHJvcGVydHlLZXldO1xuICBjb25zdCBwcm94eVZhbHVlID0gbmV3IFByb3h5KG9yaWdpbmFsVmFsdWUsIGhhbmRsZXIpO1xuICBtZXRhZGF0YU1hcC5zZXQocHJveHlWYWx1ZSwgb3JpZ2luYWxWYWx1ZSk7XG4gIHRhcmdldE9iamVjdFtwcm9wZXJ0eUtleV0gPSBwcm94eVZhbHVlO1xufVxuXG5jb25zdCBjb25maWdTdG9yZSA9IHt9O1xuZnVuY3Rpb24gZ2V0RW50aXR5TWFuYWdlcihnYW1lU3RhdGUpIHtcbiAgaWYgKCFnYW1lU3RhdGUpIHtcbiAgICBnYW1lU3RhdGUgPSBnZXRHYW1lU3RhdGUoKTtcbiAgfVxuICBpZiAoIWdhbWVTdGF0ZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGlmICh3aW5kb3cuX19jYWNoZWRFTSkge1xuICAgIHJldHVybiB3aW5kb3cuX19jYWNoZWRFTTtcbiAgfVxuICBpZiAoY29uZmlnU3RvcmUuZW50aXR5TWFuYWdlcikge1xuICAgIGNvbnN0IGVudGl0eU1hbmFnZXIgPSBnYW1lU3RhdGVbY29uZmlnU3RvcmUuZW50aXR5TWFuYWdlcl07XG4gICAgaWYgKGVudGl0eU1hbmFnZXIpIHtcbiAgICAgIHdpbmRvdy5fX2NhY2hlZEVNID0gZW50aXR5TWFuYWdlcjtcbiAgICAgIHJldHVybiBlbnRpdHlNYW5hZ2VyO1xuICAgIH1cbiAgfVxuICBmb3IgKGNvbnN0IHByb3BlcnR5S2V5IG9mIE9iamVjdC5rZXlzKGdhbWVTdGF0ZSkpIHtcbiAgICBjb25zdCBwcm9wZXJ0eVZhbHVlID0gZ2FtZVN0YXRlW3Byb3BlcnR5S2V5XTtcbiAgICBpZiAocHJvcGVydHlWYWx1ZSAmJiB0eXBlb2YgcHJvcGVydHlWYWx1ZSA9PT0gXCJvYmplY3RcIiAmJiAhQXJyYXkuaXNBcnJheShwcm9wZXJ0eVZhbHVlKSAmJiAocHJvcGVydHlWYWx1ZS5lbnRpdGllc0xpc3QgfHwgcHJvcGVydHlWYWx1ZS5lbnRpdGllc0J5SWQpKSB7XG4gICAgICB3aW5kb3cuX19jYWNoZWRFTSA9IHByb3BlcnR5VmFsdWU7XG4gICAgICByZXR1cm4gcHJvcGVydHlWYWx1ZTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG5mdW5jdGlvbiBnZXRGaXJzdEFuaW1hbCgpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBnYW1lU3RhdGUgPSBnZXRHYW1lU3RhdGUoKTtcbiAgICBpZiAoIWdhbWVTdGF0ZSkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGlmIChnYW1lU3RhdGUubXlBbmltYWxzICYmIGdhbWVTdGF0ZS5teUFuaW1hbHMubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIGdhbWVTdGF0ZS5teUFuaW1hbHNbMF07XG4gICAgfVxuICAgIGlmIChnYW1lU3RhdGUubXlQaXJhbmhhcyAmJiBnYW1lU3RhdGUubXlQaXJhbmhhcy5sZW5ndGggPiAwKSB7XG4gICAgICByZXR1cm4gZ2FtZVN0YXRlLm15UGlyYW5oYXNbMF07XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5mdW5jdGlvbiBnZXRWaWV3cG9ydFNjYWxlKCkge1xuICB0cnkge1xuICAgIGNvbnN0IHN0YXRlV2l0aFZpZXdwb3J0ID0gd2luZG93Ll9fc3M/LnN0YXRlcz8uZmluZChnYW1lQ29udGV4dCA9PiBnYW1lQ29udGV4dD8uZ2FtZVNjZW5lPy5nYW1lPy52aWV3cG9ydD8uc2NhbGU/LngpO1xuICAgIGlmIChzdGF0ZVdpdGhWaWV3cG9ydCkge1xuICAgICAgcmV0dXJuIHN0YXRlV2l0aFZpZXdwb3J0LmdhbWVTY2VuZS5nYW1lLnZpZXdwb3J0LnNjYWxlLng7XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHt9XG4gIHJldHVybiAwLjU1NDtcbn1cbmxldCBpc1Byb2Nlc3NlZCA9IGZhbHNlO1xubGV0IGRyYWdTdGF0ZSA9IHtcbiAgZHJhZ2dpbmc6IGZhbHNlLFxuICBvZmZzZXRYOiAwLFxuICBvZmZzZXRZOiAwLFxuICB4OiBudWxsLFxuICB5OiAyMFxufTtcblxubGV0IGlzVG9nZ2xlZCA9IGZhbHNlO1xuZnVuY3Rpb24gaW5pdGlhbGl6ZUFwcGxpY2F0aW9uKCkge1xuICBpZiAoaXNUb2dnbGVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlzVG9nZ2xlZCA9IHRydWU7XG4gIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIGluamVjdFN0eWxlcygpO1xuICAgIGFwcGx5VGhlbWUobG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJ0aGVtZVwiKSB8fCBcImdyZXlcIik7XG4gICAgY3JlYXRlVG9vbHNQYW5lbCgpO1xuICAgIGNyZWF0ZVZpc2lvblBhbmVsKCk7XG4gICAgY3JlYXRlQ29tYmF0UGFuZWwoKTtcbiAgICBjcmVhdGVBdXRvbWF0aW9uUGFuZWwoKTtcbiAgICBjcmVhdGVTZXR0aW5nc1BhbmVsKCk7XG4gICAgY3JlYXRlVXBkYXRlSGlzdG9yeVBhbmVsKCk7XG4gICAgY3JlYXRlTXVzaWNQYW5lbCgpO1xuICAgIGluaXRCYWNrZ3JvdW5kSW1hZ2UoKTtcbiAgICBpbml0QWRCbG9ja2VyKCk7XG4gICAgaW5pdFJhZGFyRHJhZygpO1xuICAgIGluaXRBdXRvZmlsbE5hbWUoKTtcbiAgICByZW5kZXJFc3BMb29wKCk7XG4gICAgcmVuZGVyTG9vcCgpO1xuICAgIGlzUHJvY2Vzc2VkID0gdHJ1ZTtcbiAgICB1cGRhdGVMb2NrTG9vcCgpO1xuICAgIHN0YXRlLmlzVGV4dEludGVyY2VwdG9ySW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIGF1dG9Eb2RnZUxvb3AoKTtcbiAgfSwgMTAwMCk7XG59XG53aW5kb3cubG9ja0VuYWJsZWQgPSBmYWxzZTtcbndpbmRvdy5sb2NrVGFyZ2V0SWQgPSBudWxsO1xud2luZG93LmxvY2tLZXkgPSBcInRcIjtcbndpbmRvdy5lbnRpdHlUcmFpbENvbG9yID0ge1xuICByOiAyNTUsXG4gIGc6IDE1MCxcbiAgYjogMFxufTtcbndpbmRvdy5lbnRpdHlUcmFpbEVuYWJsZWQgPSBmYWxzZTtcbndpbmRvdy5lbnRpdHlUcmFpbFRhcmdldElkID0gbnVsbDtcbndpbmRvdy5lbnRpdHlUcmFpbEhpc3RvcnkgPSBbXTtcbndpbmRvdy5lbnRpdHlUcmFpbE1heExlbmd0aCA9IDIwMDtcbndpbmRvdy5lbnRpdHlUcmFpbFJlY29yZEludGVydmFsID0gMTAwO1xud2luZG93LmVudGl0eVRyYWNlS2V5ID0gXCJoXCI7XG53aW5kb3cuZXNwRW5hYmxlZCA9IGZhbHNlO1xud2luZG93LmVzcENvbG9ycyA9IHtcbiAgY2xvc2U6IFwiI2ZmMDAwMFwiLFxuICBtZWRpdW06IFwiI2ZmZmYwMFwiLFxuICBmYXI6IFwiIzAwZmZmZlwiLFxuICB2ZXJ5RmFyOiBcIiMwMGZmMDBcIixcbiAgdHJhY2tlZDogXCIjZmYwMGZmXCIsXG4gIGZvb2RDbG9zZTogXCIjMDBmZjAwXCIsXG4gIGZvb2RNZWRpdW06IFwiIzg4ZmY4OFwiLFxuICBmb29kRmFyOiBcIiM0NGNjNDRcIlxufTtcbndpbmRvdy5lc3BUcmFja2VkRW50aXR5SWQgPSBudWxsO1xud2luZG93LmVzcE1vZGUgPSBcInBsYXllcnNcIjtcbndpbmRvdy5hdXRvRG9kZ2VFbmFibGVkID0gZmFsc2U7XG5cbmV4cG9ydCBjb25zdCBzdGF0ZSA9IHtcbiAgY3VycmVudFRpbWU6IDAsXG4gIGlzTG9vcGluZzogZmFsc2UsXG4gIGN1cnJlbnRUcmFja0luZGV4OiAwLFxuICBhbmltYXRpb25JbnRlcnZhbElkOiBudWxsLFxuICBnYW1lSW5zdGFuY2U6IG51bGwsXG4gIGFuaW1hbERhdGE6IG51bGwsXG4gIGlzQWN0aXZlOiBmYWxzZSxcbiAgaXNNaW5pbWFwU21hbGw6IGZhbHNlLFxuICBpc1RleHRJbnRlcmNlcHRvckluaXRpYWxpemVkOiBmYWxzZVxufTtcblxuZXhwb3J0IHsgd3JhcFdpdGhQcm94eSwgZ2V0RW50aXR5TWFuYWdlciwgZ2V0Rmlyc3RBbmltYWwsIGdldFZpZXdwb3J0U2NhbGUsIGluaXRpYWxpemVBcHBsaWNhdGlvbiwgbWV0YWRhdGFNYXAsIGNvbmZpZ1N0b3JlLCBpc1Byb2Nlc3NlZCwgZHJhZ1N0YXRlIH07XG4iLCJpbXBvcnQgeyBkcmFnU3RhdGUsIHN0YXRlIH0gZnJvbSAnLi4vY29yZS5qcyc7XG5cbmZ1bmN0aW9uIGdldEdhbWVDYW52YXMoKSB7XG4gIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2dhbWVDYW52YXNcIikgfHwgZG9jdW1lbnQucXVlcnlTZWxlY3RvcihcImNhbnZhc1wiKSB8fCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKFwiI2NhbnZhcy1jb250YWluZXIgY2FudmFzXCIpO1xufVxuZnVuY3Rpb24gdXBkYXRlTG9ja0J1dHRvblVJKCkge1xuICBjb25zdCBsb2NrQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsb2NrQnRuXCIpO1xuICBpZiAobG9ja0J1dHRvbikge1xuICAgIGxvY2tCdXR0b24udGV4dENvbnRlbnQgPSB3aW5kb3cubG9ja0VuYWJsZWQgJiYgd2luZG93LmxvY2tUYXJnZXRJZCA/IFwiVW5sb2NrXCIgOiBcIkxvY2sgTmVhcmVzdFwiO1xuICAgIGxvY2tCdXR0b24uY2xhc3NMaXN0LnRvZ2dsZShcInRvZ2dsZS1vblwiLCAhIXdpbmRvdy5sb2NrRW5hYmxlZCAmJiAhIXdpbmRvdy5sb2NrVGFyZ2V0SWQpO1xuICB9XG59XG5mdW5jdGlvbiBnZXRPckNyZWF0ZUNhbnZhcyhjYW52YXNJZCwgekluZGV4KSB7XG4gIGxldCBjYW52YXNFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoY2FudmFzSWQpO1xuICBpZiAoIWNhbnZhc0VsZW1lbnQpIHtcbiAgICBjYW52YXNFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcbiAgICBjYW52YXNFbGVtZW50LmlkID0gY2FudmFzSWQ7XG4gICAgY2FudmFzRWxlbWVudC5zdHlsZS5jc3NUZXh0ID0gXCJwb3NpdGlvbjpmaXhlZDt0b3A6MDtsZWZ0OjA7cG9pbnRlci1ldmVudHM6bm9uZTt6LWluZGV4OlwiICsgekluZGV4ICsgXCI7XCI7XG4gICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChjYW52YXNFbGVtZW50KTtcbiAgfVxuICBjb25zdCBnYW1lVmlld3BvcnQgPSBnZXRHYW1lQ2FudmFzKCk7XG4gIGlmIChnYW1lVmlld3BvcnQpIHtcbiAgICBjb25zdCByZWN0ID0gZ2FtZVZpZXdwb3J0LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgIGlmIChjYW52YXNFbGVtZW50LndpZHRoICE9PSByZWN0LndpZHRoIHx8IGNhbnZhc0VsZW1lbnQuaGVpZ2h0ICE9PSByZWN0LmhlaWdodCkge1xuICAgICAgY2FudmFzRWxlbWVudC53aWR0aCA9IHJlY3Qud2lkdGg7XG4gICAgICBjYW52YXNFbGVtZW50LmhlaWdodCA9IHJlY3QuaGVpZ2h0O1xuICAgIH1cbiAgICBjYW52YXNFbGVtZW50LnN0eWxlLmxlZnQgPSByZWN0LmxlZnQgKyBcInB4XCI7XG4gICAgY2FudmFzRWxlbWVudC5zdHlsZS50b3AgPSByZWN0LnRvcCArIFwicHhcIjtcbiAgICBjYW52YXNFbGVtZW50LnN0eWxlLndpZHRoID0gcmVjdC53aWR0aCArIFwicHhcIjtcbiAgICBjYW52YXNFbGVtZW50LnN0eWxlLmhlaWdodCA9IHJlY3QuaGVpZ2h0ICsgXCJweFwiO1xuICB9IGVsc2UgaWYgKGNhbnZhc0VsZW1lbnQud2lkdGggIT09IHdpbmRvdy5pbm5lcldpZHRoIHx8IGNhbnZhc0VsZW1lbnQuaGVpZ2h0ICE9PSB3aW5kb3cuaW5uZXJIZWlnaHQpIHtcbiAgICBjYW52YXNFbGVtZW50LndpZHRoID0gd2luZG93LmlubmVyV2lkdGg7XG4gICAgY2FudmFzRWxlbWVudC5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gIH1cbiAgcmV0dXJuIGNhbnZhc0VsZW1lbnQ7XG59XG5mdW5jdGlvbiBpbml0UmFkYXJEcmFnKCkge1xuICBpZiAod2luZG93Ll9yYWRhckRyYWdJbml0KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHdpbmRvdy5fcmFkYXJEcmFnSW5pdCA9IHRydWU7XG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgdXBkYXRlUmFkYXJCb3VuZHMgPT4ge1xuICAgIGNvbnN0IHJhZGFyQm91bmRzID0gd2luZG93Ll9yYWRhckJvdW5kcztcbiAgICBpZiAoIXJhZGFyQm91bmRzIHx8ICF3aW5kb3cuZXNwRW5hYmxlZCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAodXBkYXRlUmFkYXJCb3VuZHMuY2xpZW50WCA+PSByYWRhckJvdW5kcy54ICYmIHVwZGF0ZVJhZGFyQm91bmRzLmNsaWVudFggPD0gcmFkYXJCb3VuZHMueCArIHJhZGFyQm91bmRzLncgJiYgdXBkYXRlUmFkYXJCb3VuZHMuY2xpZW50WSA+PSByYWRhckJvdW5kcy55ICYmIHVwZGF0ZVJhZGFyQm91bmRzLmNsaWVudFkgPD0gcmFkYXJCb3VuZHMueSArIHJhZGFyQm91bmRzLmgpIHtcbiAgICAgIGRyYWdTdGF0ZS5kcmFnZ2luZyA9IHRydWU7XG4gICAgICBkcmFnU3RhdGUub2Zmc2V0WCA9IHVwZGF0ZVJhZGFyQm91bmRzLmNsaWVudFggLSByYWRhckJvdW5kcy54O1xuICAgICAgZHJhZ1N0YXRlLm9mZnNldFkgPSB1cGRhdGVSYWRhckJvdW5kcy5jbGllbnRZIC0gcmFkYXJCb3VuZHMueTtcbiAgICAgIHVwZGF0ZVJhZGFyQm91bmRzLnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB1cGRhdGVSYWRhckJvdW5kcy5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICB9XG4gIH0sIHRydWUpO1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIG1vdXNlTW92ZUV2ZW50ID0+IHtcbiAgICBpZiAoIWRyYWdTdGF0ZS5kcmFnZ2luZykge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBkcmFnU3RhdGUueCA9IG1vdXNlTW92ZUV2ZW50LmNsaWVudFggLSBkcmFnU3RhdGUub2Zmc2V0WDtcbiAgICBkcmFnU3RhdGUueSA9IG1vdXNlTW92ZUV2ZW50LmNsaWVudFkgLSBkcmFnU3RhdGUub2Zmc2V0WTtcbiAgICBtb3VzZU1vdmVFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICB9LCB0cnVlKTtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNldXBcIiwgbW91c2VVcEV2ZW50ID0+IHtcbiAgICBpZiAoZHJhZ1N0YXRlLmRyYWdnaW5nKSB7XG4gICAgICBkcmFnU3RhdGUuZHJhZ2dpbmcgPSBmYWxzZTtcbiAgICAgIG1vdXNlVXBFdmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIH1cbiAgfSwgdHJ1ZSk7XG59XG5cbmV4cG9ydCB7IGdldEdhbWVDYW52YXMsIHVwZGF0ZUxvY2tCdXR0b25VSSwgZ2V0T3JDcmVhdGVDYW52YXMsIGluaXRSYWRhckRyYWcgfTtcbiIsImltcG9ydCB7IGdldEdhbWVDYW52YXMgfSBmcm9tICcuLi91aS9yYWRhci5qcyc7XG5pbXBvcnQgeyBzaG93Tm90aWZpY2F0aW9uLCBzaW11bGF0ZUNsaWNrIH0gZnJvbSAnLi4vdWkvaW50ZXJhY3Rpb24uanMnO1xuaW1wb3J0IHsgZ2V0Rmlyc3RBbmltYWwsIGdldEVudGl0eU1hbmFnZXIsIHN0YXRlIH0gZnJvbSAnLi4vY29yZS5qcyc7XG5pbXBvcnQgeyBnZXRHYW1lU3RhdGUsIGZpbmRFbnRpdHlCeUlkIH0gZnJvbSAnLi9hdXRvZmFybS5qcyc7XG5pbXBvcnQgeyBpc1ZhbGlkRW50aXR5IH0gZnJvbSAnLi4vdXRpbHMuanMnO1xuXG5sZXQgY3VycmVudEFuZ2xlSW5kZXggPSAwO1xuY29uc3QgYW5nbGVTdGVwcyA9IFswLCAzMCwgNjAsIDkwLCAxMjAsIDE1MCwgMTgwLCAyMTAsIDI0MCwgMjcwLCAzMDAsIDMzMF07XG5jb25zdCBvcmJpdFJhZGl1cyA9IDMwMDtcbmZ1bmN0aW9uIHN0YXJ0QXV0b1BvaW50ZXJNb3ZlbWVudCgpIHtcbiAgaWYgKHN0YXRlLmFuaW1hdGlvbkludGVydmFsSWQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgY2FudmFzID0gZ2V0R2FtZUNhbnZhcygpO1xuICBpZiAoIWNhbnZhcykge1xuICAgIHNob3dOb3RpZmljYXRpb24oXCJDYW52YXMgbm90IGZvdW5kXCIpO1xuICAgIHJldHVybjtcbiAgfVxuICBzdGF0ZS5hbmltYXRpb25JbnRlcnZhbElkID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgIGNvbnN0IHJhZGl1cyA9IGFuZ2xlU3RlcHNbY3VycmVudEFuZ2xlSW5kZXhdO1xuICAgIGNvbnN0IGFuZ2xlUmFkaWFucyA9IE1hdGguUEkgKiAyICogcmFkaXVzIC8gMzYwO1xuICAgIGNvbnN0IG9mZnNldFggPSBNYXRoLnJvdW5kKG9yYml0UmFkaXVzICogTWF0aC5zaW4oYW5nbGVSYWRpYW5zKSk7XG4gICAgY29uc3Qgb2Zmc2V0WSA9IE1hdGgucm91bmQob3JiaXRSYWRpdXMgKiBNYXRoLmNvcyhhbmdsZVJhZGlhbnMpKTtcbiAgICBjYW52YXMuZGlzcGF0Y2hFdmVudChuZXcgTW91c2VFdmVudChcInBvaW50ZXJtb3ZlXCIsIHtcbiAgICAgIGNsaWVudFg6IHdpbmRvdy5pbm5lcldpZHRoIC8gMiArIG9mZnNldFgsXG4gICAgICBjbGllbnRZOiB3aW5kb3cuaW5uZXJIZWlnaHQgLyAyICsgb2Zmc2V0WSxcbiAgICAgIGJ1YmJsZXM6IHRydWVcbiAgICB9KSk7XG4gICAgY3VycmVudEFuZ2xlSW5kZXggPSAoY3VycmVudEFuZ2xlSW5kZXggKyAxKSAlIGFuZ2xlU3RlcHMubGVuZ3RoO1xuICB9LCAxNSk7XG59XG5mdW5jdGlvbiBzdG9wQXV0b1BvaW50ZXJNb3ZlbWVudCgpIHtcbiAgaWYgKHN0YXRlLmFuaW1hdGlvbkludGVydmFsSWQpIHtcbiAgICBjbGVhckludGVydmFsKHN0YXRlLmFuaW1hdGlvbkludGVydmFsSWQpO1xuICAgIHN0YXRlLmFuaW1hdGlvbkludGVydmFsSWQgPSBudWxsO1xuICB9XG59XG5mdW5jdGlvbiB0b2dnbGVBdXRvUG9pbnRlck1vdmVtZW50KCkge1xuICBpZiAoc3RhdGUuYW5pbWF0aW9uSW50ZXJ2YWxJZCkge1xuICAgIHN0b3BBdXRvUG9pbnRlck1vdmVtZW50KCk7XG4gIH0gZWxzZSB7XG4gICAgc3RhcnRBdXRvUG9pbnRlck1vdmVtZW50KCk7XG4gIH1cbn1cbmNvbnN0IG9mZnNldFZhbHVlID0gNDAwO1xuZnVuY3Rpb24gc2ltdWxhdGVQb2ludGVyTW92ZShkaXJlY3Rpb24pIHtcbiAgY29uc3QgdGFyZ2V0RWxlbWVudCA9IGdldEdhbWVDYW52YXMoKTtcbiAgaWYgKCF0YXJnZXRFbGVtZW50KSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHJlY3QgPSB0YXJnZXRFbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICBjb25zdCBjZW50ZXJYID0gcmVjdC5sZWZ0ICsgcmVjdC53aWR0aCAvIDI7XG4gIGNvbnN0IGNlbnRlclkgPSByZWN0LnRvcCArIHJlY3QuaGVpZ2h0IC8gMjtcbiAgY29uc3QgdGFyZ2V0WCA9IGRpcmVjdGlvbiA9PT0gXCJsZWZ0XCIgPyBjZW50ZXJYIC0gb2Zmc2V0VmFsdWUgOiBjZW50ZXJYICsgb2Zmc2V0VmFsdWU7XG4gIHRhcmdldEVsZW1lbnQuZGlzcGF0Y2hFdmVudChuZXcgTW91c2VFdmVudChcInBvaW50ZXJtb3ZlXCIsIHtcbiAgICBjbGllbnRYOiB0YXJnZXRYLFxuICAgIGNsaWVudFk6IGNlbnRlclksXG4gICAgYnViYmxlczogdHJ1ZSxcbiAgICB2aWV3OiB3aW5kb3dcbiAgfSkpO1xufVxuZnVuY3Rpb24gZ2V0QW5pbWFsUG9zaXRpb24oKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgYW5pbWFsID0gZ2V0Rmlyc3RBbmltYWwoKTtcbiAgICBpZiAoIWFuaW1hbCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IHBvc2l0aW9uID0gYW5pbWFsLnBvc2l0aW9uO1xuICAgIHJldHVybiB7XG4gICAgICB4OiBwb3NpdGlvbi5feCAhPT0gdW5kZWZpbmVkID8gcG9zaXRpb24uX3ggOiBwb3NpdGlvbi54LFxuICAgICAgeTogcG9zaXRpb24uX3kgIT09IHVuZGVmaW5lZCA/IHBvc2l0aW9uLl95IDogcG9zaXRpb24ueVxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cbmZ1bmN0aW9uIGV4dHJhY3RQb3NpdGlvbihlbnRpdHkpIHtcbiAgaWYgKCFlbnRpdHkgfHwgIWVudGl0eS5wb3NpdGlvbikge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIHJldHVybiB7XG4gICAgeDogZW50aXR5LnBvc2l0aW9uLl94ICE9PSB1bmRlZmluZWQgPyBlbnRpdHkucG9zaXRpb24uX3ggOiBlbnRpdHkucG9zaXRpb24ueCxcbiAgICB5OiBlbnRpdHkucG9zaXRpb24uX3kgIT09IHVuZGVmaW5lZCA/IGVudGl0eS5wb3NpdGlvbi5feSA6IGVudGl0eS5wb3NpdGlvbi55XG4gIH07XG59XG5mdW5jdGlvbiBjYWxjdWxhdGVEaXJlY3Rpb24oZW50aXR5KSB7XG4gIGlmICghZW50aXR5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGRpclg6IDEsXG4gICAgICBkaXJZOiAwXG4gICAgfTtcbiAgfVxuICBsZXQgZGlyWCA9IDA7XG4gIGxldCBkaXJZID0gMDtcbiAgaWYgKGVudGl0eS52ZWxvY2l0eSkge1xuICAgIGRpclggPSBlbnRpdHkudmVsb2NpdHkuX3ggfHwgZW50aXR5LnZlbG9jaXR5LnggfHwgMDtcbiAgICBkaXJZID0gZW50aXR5LnZlbG9jaXR5Ll95IHx8IGVudGl0eS52ZWxvY2l0eS55IHx8IDA7XG4gIH1cbiAgaWYgKE1hdGguYWJzKGRpclgpIDwgMC4wMSAmJiBNYXRoLmFicyhkaXJZKSA8IDAuMDEpIHtcbiAgICBjb25zdCByb3RhdGlvbiA9IGVudGl0eS5yb3RhdGlvbiB8fCBlbnRpdHkuYW5nbGUgfHwgZW50aXR5Ll9yb3RhdGlvbiB8fCAwO1xuICAgIGRpclggPSBNYXRoLmNvcyhyb3RhdGlvbik7XG4gICAgZGlyWSA9IE1hdGguc2luKHJvdGF0aW9uKTtcbiAgfVxuICBjb25zdCBtYWduaXR1ZGUgPSBNYXRoLnNxcnQoZGlyWCAqIGRpclggKyBkaXJZICogZGlyWSk7XG4gIGlmIChtYWduaXR1ZGUgPiAwLjAwMSkge1xuICAgIGRpclggLz0gbWFnbml0dWRlO1xuICAgIGRpclkgLz0gbWFnbml0dWRlO1xuICB9IGVsc2Uge1xuICAgIGRpclggPSAxO1xuICAgIGRpclkgPSAwO1xuICB9XG4gIHJldHVybiB7XG4gICAgZGlyWDogZGlyWCxcbiAgICBkaXJZOiBkaXJZXG4gIH07XG59XG5mdW5jdGlvbiBjYWxjdWxhdGVEaXN0YW5jZSh4MSwgeTEsIHgyLCB5Mikge1xuICByZXR1cm4gTWF0aC5zcXJ0KCh4MiAtIHgxKSAqICh4MiAtIHgxKSArICh5MiAtIHkxKSAqICh5MiAtIHkxKSk7XG59XG5mdW5jdGlvbiBidWlsZEVudGl0eVN0YXRlKCkge1xuICB0cnkge1xuICAgIGNvbnN0IHJhd1N0YXRlID0gZ2V0R2FtZVN0YXRlKCk7XG4gICAgY29uc3QgcGFyc2VkU3RhdGUgPSBnZXRFbnRpdHlNYW5hZ2VyKHJhd1N0YXRlKTtcbiAgICBjb25zdCBsb2NhbFBsYXllciA9IGdldEZpcnN0QW5pbWFsKCk7XG4gICAgY29uc3QgbG9jYWxQb3MgPSBnZXRBbmltYWxQb3NpdGlvbigpO1xuICAgIGlmICghcGFyc2VkU3RhdGUgfHwgIWxvY2FsUGxheWVyIHx8ICFsb2NhbFBvcykge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGdhbWVTdGF0ZSA9IHtcbiAgICAgIG15SWQ6IGxvY2FsUGxheWVyLmlkLFxuICAgICAgbXlQb3M6IGxvY2FsUG9zLFxuICAgICAgZW50aXRpZXM6IFtdLFxuICAgICAgcGxheWVyczogW10sXG4gICAgICBmb29kOiBbXVxuICAgIH07XG4gICAgY29uc3QgZW50aXRpZXNMaXN0ID0gcGFyc2VkU3RhdGUuZW50aXRpZXNMaXN0IHx8IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZW50aXRpZXNMaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBlbnRpdHkgPSBlbnRpdGllc0xpc3RbaV07XG4gICAgICBpZiAoIWVudGl0eSB8fCBlbnRpdHkuaWQgPT09IGxvY2FsUGxheWVyLmlkKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKGxvY2FsUGxheWVyLnBsYXllclJvb21JZCAmJiBlbnRpdHkucGxheWVyUm9vbUlkID09PSBsb2NhbFBsYXllci5wbGF5ZXJSb29tSWQpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBlbnRpdHlQb3MgPSBleHRyYWN0UG9zaXRpb24oZW50aXR5KTtcbiAgICAgIGlmICghZW50aXR5UG9zIHx8IGVudGl0eVBvcy54ID09IG51bGwgfHwgZW50aXR5UG9zLnkgPT0gbnVsbCkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IGR4ID0gZW50aXR5UG9zLnggLSBsb2NhbFBvcy54O1xuICAgICAgY29uc3QgZHkgPSBlbnRpdHlQb3MueSAtIGxvY2FsUG9zLnk7XG4gICAgICBjb25zdCBkaXN0YW5jZSA9IE1hdGguc3FydChkeCAqIGR4ICsgZHkgKiBkeSk7XG4gICAgICBjb25zdCBlbnRpdHlEYXRhID0ge1xuICAgICAgICBpZDogZW50aXR5LmlkLFxuICAgICAgICB4OiBlbnRpdHlQb3MueCxcbiAgICAgICAgeTogZW50aXR5UG9zLnksXG4gICAgICAgIGRpc3RhbmNlOiBkaXN0YW5jZSxcbiAgICAgICAgYW5nbGU6IE1hdGguYXRhbjIoZHksIGR4KSxcbiAgICAgICAgZW50aXR5OiB7XG4gICAgICAgICAgLi4uZW50aXR5LFxuICAgICAgICAgIG5hbWU6IGVudGl0eS5lbnRpdHlOYW1lIHx8IGVudGl0eS5uYW1lIHx8IG51bGxcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICAgIGdhbWVTdGF0ZS5lbnRpdGllcy5wdXNoKGVudGl0eURhdGEpO1xuICAgICAgaWYgKGVudGl0eS50eXBlID09PSAxIHx8IGlzVmFsaWRFbnRpdHkoZW50aXR5KSkge1xuICAgICAgICBnYW1lU3RhdGUucGxheWVycy5wdXNoKGVudGl0eURhdGEpO1xuICAgICAgfSBlbHNlIGlmIChlbnRpdHkudHlwZSA9PT0gMiB8fCAhaXNWYWxpZEVudGl0eShlbnRpdHkpKSB7XG4gICAgICAgIGdhbWVTdGF0ZS5mb29kLnB1c2goZW50aXR5RGF0YSk7XG4gICAgICB9XG4gICAgfVxuICAgIGdhbWVTdGF0ZS5wbGF5ZXJzLnNvcnQoKGZpcnN0SXRlbSwgc2Vjb25kSXRlbSkgPT4gZmlyc3RJdGVtLmRpc3RhbmNlIC0gc2Vjb25kSXRlbS5kaXN0YW5jZSk7XG4gICAgZ2FtZVN0YXRlLmZvb2Quc29ydCgoaXRlbUEsIGl0ZW1CKSA9PiBpdGVtQS5kaXN0YW5jZSAtIGl0ZW1CLmRpc3RhbmNlKTtcbiAgICByZXR1cm4gZ2FtZVN0YXRlO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiB7XG4gICAgICBlcnJvcjogZXJyb3IubWVzc2FnZVxuICAgIH07XG4gIH1cbn1cbmxldCB0cmFpbEludGVydmFsSWQgPSBudWxsO1xuZnVuY3Rpb24gc3RhcnRFbnRpdHlUcmFpbFRyYWNraW5nKCkge1xuICBpZiAodHJhaWxJbnRlcnZhbElkKSB7XG4gICAgY2xlYXJJbnRlcnZhbCh0cmFpbEludGVydmFsSWQpO1xuICAgIHRyYWlsSW50ZXJ2YWxJZCA9IG51bGw7XG4gIH1cbiAgdHJhaWxJbnRlcnZhbElkID0gc2V0SW50ZXJ2YWwoKCkgPT4ge1xuICAgIGlmICghd2luZG93LmVudGl0eVRyYWlsRW5hYmxlZCB8fCAhd2luZG93LmVudGl0eVRyYWlsVGFyZ2V0SWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgdGFyZ2V0RW50aXR5SWQgPSBmaW5kRW50aXR5QnlJZCh3aW5kb3cuZW50aXR5VHJhaWxUYXJnZXRJZCk7XG4gICAgaWYgKCF0YXJnZXRFbnRpdHlJZCkge1xuICAgICAgY29uc3QgZ2FtZVN0YXRlID0gYnVpbGRFbnRpdHlTdGF0ZSgpO1xuICAgICAgaWYgKGdhbWVTdGF0ZSAmJiBnYW1lU3RhdGUucGxheWVycyAmJiBnYW1lU3RhdGUucGxheWVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHdpbmRvdy5lbnRpdHlUcmFpbFRhcmdldElkID0gZ2FtZVN0YXRlLnBsYXllcnNbMF0uaWQ7XG4gICAgICB9XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IHRhcmdldEVudGl0eVBvc2l0aW9uID0gZXh0cmFjdFBvc2l0aW9uKHRhcmdldEVudGl0eUlkKTtcbiAgICBpZiAoIXRhcmdldEVudGl0eVBvc2l0aW9uKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGxhc3RUcmFpbFBvaW50ID0gd2luZG93LmVudGl0eVRyYWlsSGlzdG9yeVt3aW5kb3cuZW50aXR5VHJhaWxIaXN0b3J5Lmxlbmd0aCAtIDFdO1xuICAgIGlmIChsYXN0VHJhaWxQb2ludCAmJiBjYWxjdWxhdGVEaXN0YW5jZShsYXN0VHJhaWxQb2ludC54LCBsYXN0VHJhaWxQb2ludC55LCB0YXJnZXRFbnRpdHlQb3NpdGlvbi54LCB0YXJnZXRFbnRpdHlQb3NpdGlvbi55KSA8IDUpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgd2luZG93LmVudGl0eVRyYWlsSGlzdG9yeS5wdXNoKHtcbiAgICAgIHg6IHRhcmdldEVudGl0eVBvc2l0aW9uLngsXG4gICAgICB5OiB0YXJnZXRFbnRpdHlQb3NpdGlvbi55LFxuICAgICAgdGltZTogRGF0ZS5ub3coKVxuICAgIH0pO1xuICAgIGlmICh3aW5kb3cuZW50aXR5VHJhaWxIaXN0b3J5Lmxlbmd0aCA+IHdpbmRvdy5lbnRpdHlUcmFpbE1heExlbmd0aCkge1xuICAgICAgd2luZG93LmVudGl0eVRyYWlsSGlzdG9yeS5zaGlmdCgpO1xuICAgIH1cbiAgfSwgd2luZG93LmVudGl0eVRyYWlsUmVjb3JkSW50ZXJ2YWwpO1xufVxuZnVuY3Rpb24gc3RvcEVudGl0eVRyYWlsVHJhY2tpbmcoKSB7XG4gIGlmICh0cmFpbEludGVydmFsSWQpIHtcbiAgICBjbGVhckludGVydmFsKHRyYWlsSW50ZXJ2YWxJZCk7XG4gICAgdHJhaWxJbnRlcnZhbElkID0gbnVsbDtcbiAgfVxufVxuZnVuY3Rpb24gbW92ZUFuZENsaWNrRWxlbWVudCh0YXJnZXRYLCB0YXJnZXRZLCBzaG91bGRDbGljaykge1xuICBjb25zdCBlbGVtZW50ID0gZ2V0R2FtZUNhbnZhcygpO1xuICBpZiAoIWVsZW1lbnQpIHtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgcGxheWVyUG9zaXRpb24gPSBnZXRBbmltYWxQb3NpdGlvbigpO1xuICBpZiAoIXBsYXllclBvc2l0aW9uKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHJlY3QgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICBjb25zdCBjZW50ZXJYID0gcmVjdC5sZWZ0ICsgcmVjdC53aWR0aCAvIDI7XG4gIGNvbnN0IGNlbnRlclkgPSByZWN0LnRvcCArIHJlY3QuaGVpZ2h0IC8gMjtcbiAgY29uc3QgZGlmZlggPSB0YXJnZXRYIC0gcGxheWVyUG9zaXRpb24ueDtcbiAgY29uc3QgZGlmZlkgPSB0YXJnZXRZIC0gcGxheWVyUG9zaXRpb24ueTtcbiAgY29uc3QgZGlzdGFuY2UgPSBNYXRoLnNxcnQoZGlmZlggKiBkaWZmWCArIGRpZmZZICogZGlmZlkpO1xuICBsZXQgbXVsdGlwbGllciA9IDE7XG4gIGlmIChkaXN0YW5jZSA+IDUwMDApIHtcbiAgICBtdWx0aXBsaWVyID0gMztcbiAgfSBlbHNlIGlmIChkaXN0YW5jZSA+IDIwMDApIHtcbiAgICBtdWx0aXBsaWVyID0gMjtcbiAgfSBlbHNlIGlmIChkaXN0YW5jZSA+IDEwMDApIHtcbiAgICBtdWx0aXBsaWVyID0gMS41O1xuICB9IGVsc2UgaWYgKGRpc3RhbmNlID4gNTAwKSB7XG4gICAgbXVsdGlwbGllciA9IDEuMjtcbiAgfSBlbHNlIGlmIChkaXN0YW5jZSA8IDUwKSB7XG4gICAgbXVsdGlwbGllciA9IDAuNTtcbiAgfSBlbHNlIGlmIChkaXN0YW5jZSA8IDE1MCkge1xuICAgIG11bHRpcGxpZXIgPSAwLjg7XG4gIH1cbiAgbGV0IHNjYWxlZFggPSBkaWZmWCAqIG11bHRpcGxpZXI7XG4gIGxldCBzY2FsZWRZID0gZGlmZlkgKiBtdWx0aXBsaWVyO1xuICBjb25zdCBtYXhSYWRpdXMgPSBNYXRoLm1pbihyZWN0LndpZHRoLCByZWN0LmhlaWdodCkgKiAwLjg1O1xuICBjb25zdCBzY2FsZWREaXN0YW5jZSA9IE1hdGguc3FydChzY2FsZWRYICogc2NhbGVkWCArIHNjYWxlZFkgKiBzY2FsZWRZKTtcbiAgaWYgKHNjYWxlZERpc3RhbmNlID4gbWF4UmFkaXVzKSB7XG4gICAgY29uc3QgY2xhbXBSYXRpbyA9IG1heFJhZGl1cyAvIHNjYWxlZERpc3RhbmNlO1xuICAgIHNjYWxlZFggKj0gY2xhbXBSYXRpbztcbiAgICBzY2FsZWRZICo9IGNsYW1wUmF0aW87XG4gIH1cbiAgY29uc3QgZmluYWxYID0gY2VudGVyWCArIHNjYWxlZFg7XG4gIGNvbnN0IGZpbmFsWSA9IGNlbnRlclkgKyBzY2FsZWRZO1xuICBlbGVtZW50LmRpc3BhdGNoRXZlbnQobmV3IE1vdXNlRXZlbnQoXCJwb2ludGVybW92ZVwiLCB7XG4gICAgY2xpZW50WDogZmluYWxYLFxuICAgIGNsaWVudFk6IGZpbmFsWSxcbiAgICBidWJibGVzOiB0cnVlLFxuICAgIHZpZXc6IHdpbmRvd1xuICB9KSk7XG4gIGlmIChzaG91bGRDbGljaykge1xuICAgIHNpbXVsYXRlQ2xpY2soZmluYWxYLCBmaW5hbFkpO1xuICB9XG59XG5cbmV4cG9ydCB7IHN0YXJ0QXV0b1BvaW50ZXJNb3ZlbWVudCwgc3RvcEF1dG9Qb2ludGVyTW92ZW1lbnQsIHRvZ2dsZUF1dG9Qb2ludGVyTW92ZW1lbnQsIHNpbXVsYXRlUG9pbnRlck1vdmUsIGdldEFuaW1hbFBvc2l0aW9uLCBleHRyYWN0UG9zaXRpb24sIGNhbGN1bGF0ZURpcmVjdGlvbiwgY2FsY3VsYXRlRGlzdGFuY2UsIGJ1aWxkRW50aXR5U3RhdGUsIHN0YXJ0RW50aXR5VHJhaWxUcmFja2luZywgc3RvcEVudGl0eVRyYWlsVHJhY2tpbmcsIG1vdmVBbmRDbGlja0VsZW1lbnQgfTtcbiIsImltcG9ydCB7IGdlbmVyYXRlUmFuZG9tU3RyaW5nLCBnZXRBbGxQcm9wZXJ0eU5hbWVzLCBpc1ZhbGlkRW50aXR5IH0gZnJvbSAnLi9zcmMvdXRpbHMuanMnO1xuaW1wb3J0IHsgc3RhcnRBdXRvUG9pbnRlck1vdmVtZW50LCBzdG9wQXV0b1BvaW50ZXJNb3ZlbWVudCwgdG9nZ2xlQXV0b1BvaW50ZXJNb3ZlbWVudCwgc2ltdWxhdGVQb2ludGVyTW92ZSwgZ2V0QW5pbWFsUG9zaXRpb24sIGV4dHJhY3RQb3NpdGlvbiwgY2FsY3VsYXRlRGlyZWN0aW9uLCBjYWxjdWxhdGVEaXN0YW5jZSwgYnVpbGRFbnRpdHlTdGF0ZSwgc3RhcnRFbnRpdHlUcmFpbFRyYWNraW5nLCBzdG9wRW50aXR5VHJhaWxUcmFja2luZywgbW92ZUFuZENsaWNrRWxlbWVudCB9IGZyb20gJy4vc3JjL2ZlYXR1cmVzL21vdmVtZW50LmpzJztcbmltcG9ydCB7IHVwZGF0ZUxvY2tMb29wLCB0b2dnbGVMb2NrLCB0cmFja05lYXJlc3RQbGF5ZXIsIGNsZWFyVHJhY2tpbmcsIGF1dG9Eb2RnZUxvb3AsIGVuYWJsZUF1dG9Eb2RnZSwgZGlzYWJsZUF1dG9Eb2RnZSwgZmluZE5lYXJlc3RFbnRpdHksIGZpbmRFbnRpdGllc0luUmFuZ2UsIGNhbGN1bGF0ZUF2b2lkYW5jZVZlY3RvciB9IGZyb20gJy4vc3JjL2ZlYXR1cmVzL2FpbWJvdC5qcyc7XG5pbXBvcnQgeyBnZXRHYW1lU3RhdGUsIGZpbmRFbnRpdHlCeUlkLCBtYXJrQXJlYUFzRmFpbGVkLCBpc0FyZWFTa2lwcGVkLCBmaW5kQmVzdEZvb2RDbHVzdGVyLCB0cmlnZ2VyUmFuZG9tRXZvbHZlLCBjaGVja1N0dWNrQ29uZGl0aW9uLCBzZXR1cFBhdHJvbFJvdXRlLCBhdXRvRmFybUxvb3AsIHN0YXJ0QXV0b0Zhcm0sIHN0b3BBdXRvRmFybSwgdG9nZ2xlTWluaW1hcFNpemUgfSBmcm9tICcuL3NyYy9mZWF0dXJlcy9hdXRvZmFybS5qcyc7XG5pbXBvcnQgeyBhcHBseVRoZW1lLCBpbml0QmFja2dyb3VuZEltYWdlLCBpbmplY3RTdHlsZXMgfSBmcm9tICcuL3NyYy91aS90aGVtZS5qcyc7XG5pbXBvcnQgeyBzdGFydFJlcGVhdGluZ1Rhc2ssIHN0b3BDaGF0VGltZXIgfSBmcm9tICcuL3NyYy9mZWF0dXJlcy9jaGF0LmpzJztcbmltcG9ydCB7IGluaXRBbnRpRGV0ZWN0aW9uIH0gZnJvbSAnLi9zcmMvZmVhdHVyZXMvYW50aWRldGVjdGlvbi5qcyc7XG5pbXBvcnQgeyBpbml0aWFsaXplQXN0cmFWaXNpb24gfSBmcm9tICcuL3NyYy9mZWF0dXJlcy94cmF5LmpzJztcbmltcG9ydCB7IHRvZ2dsZUVudGl0eVRyYWlsLCByZWZyZXNoVUksIGRyYXdFbnRpdHlUcmFpbCwgcmVuZGVyTG9vcCwgZHJhd0VTUCwgZHJhd1RyYWNrZXJMaW5lLCBkcmF3UmFkYXIsIHJlbmRlckVzcExvb3AsIHRvZ2dsZUVzcCB9IGZyb20gJy4vc3JjL2ZlYXR1cmVzL2VzcC5qcyc7XG5pbXBvcnQgeyBhZGRUcmFja1RvUGxheWxpc3QsIHJlbW92ZVRyYWNrRnJvbVBsYXlsaXN0IH0gZnJvbSAnLi9zcmMvc3RvcmFnZS5qcyc7XG5pbXBvcnQgeyBpc1lvdXR1YmVVcmwsIGdldFlvdXR1YmVWaWRlb0lkLCBlbnN1cmVZb3V0dWJlQXBpUmVhZHksIGdldFlvdXR1YmVIb3N0RWxlbWVudCwgcGxheVlvdXR1YmVWaWRlbywgc3RvcEFsbFBsYXliYWNrLCBwbGF5VHJhY2ssIHBhdXNlUGxheWJhY2ssIHJlc3VtZVBsYXliYWNrLCByZXNldFBsYXliYWNrLCBpc1BsYXlpbmcsIHBsYXlOZXh0T3JSYW5kb20sIHBsYXlQcmV2aW91cywgdXBkYXRlTXVzaWNQYW5lbCwgYXVkaW9QbGF5ZXIsIG11c2ljUGxheWxpc3QsIHlvdXR1YmVQbGF5ZXIsIHVpYXVkaW9TdGF0ZSB9IGZyb20gJy4vc3JjL3VpL2F1ZGlvLmpzJztcbmltcG9ydCB7IGNyZWF0ZVRvb2xzUGFuZWwsIGNyZWF0ZVZpc2lvblBhbmVsLCBjcmVhdGVDb21iYXRQYW5lbCwgY3JlYXRlQXV0b21hdGlvblBhbmVsLCBjcmVhdGVTZXR0aW5nc1BhbmVsLCBjcmVhdGVNdXNpY1BhbmVsLCBjcmVhdGVVcGRhdGVIaXN0b3J5UGFuZWwgfSBmcm9tICcuL3NyYy91aS9wYW5lbHMuanMnO1xuaW1wb3J0IHsgaW5pdEFkQmxvY2tlciB9IGZyb20gJy4vc3JjL2ZlYXR1cmVzL2FkYmxvY2suanMnO1xuaW1wb3J0IHsgd3JhcFdpdGhQcm94eSwgZ2V0RW50aXR5TWFuYWdlciwgZ2V0Rmlyc3RBbmltYWwsIGdldFZpZXdwb3J0U2NhbGUsIGluaXRpYWxpemVBcHBsaWNhdGlvbiwgbWV0YWRhdGFNYXAsIGNvbmZpZ1N0b3JlLCBpc1Byb2Nlc3NlZCwgZHJhZ1N0YXRlLCBzdGF0ZSB9IGZyb20gJy4vc3JjL2NvcmUuanMnO1xuaW1wb3J0IHsgZ2V0R2FtZUNhbnZhcywgdXBkYXRlTG9ja0J1dHRvblVJLCBnZXRPckNyZWF0ZUNhbnZhcywgaW5pdFJhZGFyRHJhZyB9IGZyb20gJy4vc3JjL3VpL3JhZGFyLmpzJztcbmltcG9ydCB7IHNpbXVsYXRlVGV4dElucHV0LCBzaG93Tm90aWZpY2F0aW9uLCBpbml0QXV0b2ZpbGxOYW1lLCB0eXBlQ2hhdE1lc3NhZ2UsIGluaXRpYWxpemVUZXh0SW50ZXJjZXB0b3IsIHNpbXVsYXRlQ2xpY2ssIHNob3dIYWxsb3dlZW5Db2RlTW9kYWwsIG1ha2VFbGVtZW50RHJhZ2dhYmxlIH0gZnJvbSAnLi9zcmMvdWkvaW50ZXJhY3Rpb24uanMnO1xuXG5pbml0aWFsaXplQXBwbGljYXRpb24oKTtcbiJdLCJtYXBwaW5ncyI6Ijs7Q0FDQSxTQUFTLHFCQUFxQixjQUFjO0VBQzFDLElBQUksZUFBZTtFQUNuQixLQUFLLElBQUks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