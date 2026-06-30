import { musicPlaylist, currentTime, state } from "../core.js";
import { showNotification } from "./interaction.js";

let isProcessed_3 = false;
let isProcessed_4 = false;
function isYouTubeUrl(url) {
  return /(?:youtube\.com|youtu\.be)/i.test(url || "");
}
function extractYouTubeId(url) {
  if (!url) {
    return null;
  }
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes("youtu.be")) {
      return urlObj.pathname.slice(1).split("/")[0] || null;
    }
    if (urlObj.hostname.includes("youtube.com")) {
      return (
        urlObj.searchParams.get("v") ||
        (urlObj.pathname.startsWith("/embed/")
          ? urlObj.pathname.split("/embed/")[1]?.split("/")[0]
          : null) ||
        (urlObj.pathname.startsWith("/shorts/")
          ? urlObj.pathname.split("/shorts/")[1]?.split("/")[0]
          : null)
      );
    }
  } catch (error) {}
  return null;
}
function ensureYouTubeApiReady(callback) {
  if (isProcessed_3 && window.YT && window.YT.Player) {
    callback();
    return;
  }
  if (!window._astYtReadyCallbacks) {
    window._astYtReadyCallbacks = [];
  }
  window._astYtReadyCallbacks.push(callback);
  if (isProcessed_4) {
    return;
  }
  isProcessed_4 = true;
  if (!document.getElementById("ast-yt-api")) {
    const scriptElement = document.createElement("script");
    scriptElement.id = "ast-yt-api";
    scriptElement.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(scriptElement);
  }
  const originalReadyHandler = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = function () {
    isProcessed_3 = true;
    if (typeof originalReadyHandler === "function") {
      try {
        originalReadyHandler();
      } catch (tempVar1) {}
    }
    const readyCallbacks = window._astYtReadyCallbacks || [];
    while (readyCallbacks.length) {
      const currentCallback = readyCallbacks.shift();
      try {
        currentCallback();
      } catch (tempVar2) {}
    }
  };
}
function getYoutubeHostElement() {
  let hostElement = document.getElementById("ast-youtube-host");
  if (!hostElement) {
    hostElement = document.createElement("div");
    hostElement.id = "ast-youtube-host";
    hostElement.style.cssText =
      "position:fixed;left:-99999px;top:-99999px;width:1px;height:1px;opacity:0;pointer-events:none;";
    document.body.appendChild(hostElement);
  }
  return hostElement;
}
function playYouTubeVideo(videoId) {
  ensureYouTubeApiReady(() => {
    const youtubePlayerId = getYoutubeHostElement();
    if (
      state.youtubePlayer &&
      typeof state.youtubePlayer.loadVideoById === "function"
    ) {
      state.youtubePlayer.loadVideoById(videoId);
      try {
        state.youtubePlayer.setVolume(Math.round(state.musicVolume * 100));
      } catch (genericVariable) {}
      state.audioSourceType = "youtube";
      updateMusicPanel();
      return;
    }
    state.youtubePlayer = new YT.Player(youtubePlayerId, {
      width: "1",
      height: "1",
      videoId: videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: (volumeEvent) => {
          try {
            volumeEvent.target.setVolume(Math.round(state.musicVolume * 100));
            volumeEvent.target.playVideo();
          } catch (unknownVar) {}
          state.audioSourceType = "youtube";
          updateMusicPanel();
        },
        onStateChange: (ytPlayerEvent) => {
          if (!window.YT) {
            return;
          }
          if (ytPlayerEvent.data === YT.PlayerState.ENDED) {
            if (state.isMusicShuffleEnabled_2) {
              playTrack(Math.floor(Math.random() * musicPlaylist.length));
            } else if (state.isMusicShuffleEnabled) {
              playTrack(state.currentTrackIndex + 1);
            } else {
              updateMusicPanel();
            }
          }
          if (
            ytPlayerEvent.data === YT.PlayerState.PLAYING ||
            ytPlayerEvent.data === YT.PlayerState.PAUSED
          ) {
            updateMusicPanel();
          }
        },
      },
    });
  });
}
function stopAndCleanupPlayer() {
  if (state.audioPlayer) {
    try {
      state.audioPlayer.pause();
      state.audioPlayer.src = "";
    } catch (audioError) {}
    state.audioPlayer = null;
  }
  if (state.youtubePlayer) {
    try {
      state.youtubePlayer.stopVideo();
    } catch (youtubeStopError) {}
  }
  state.audioSourceType = null;
}
function playTrack(trackIndex) {
  if (!musicPlaylist.length) {
    showNotification("No tracks added");
    return;
  }
  if (trackIndex < 0) {
    trackIndex = musicPlaylist.length - 1;
  }
  if (trackIndex >= musicPlaylist.length) {
    trackIndex = 0;
  }
  state.currentTrackIndex = trackIndex;
  const currentTrack = musicPlaylist[state.currentTrackIndex];
  if (!currentTrack || !currentTrack.url) {
    return;
  }
  stopAndCleanupPlayer();
  if (isYouTubeUrl(currentTrack.url)) {
    const youtubeId = extractYouTubeId(currentTrack.url);
    if (!youtubeId) {
      showNotification("Invalid YouTube link");
      return;
    }
    playYouTubeVideo(youtubeId);
    state.audioSourceType = "youtube";
    updateMusicPanel();
    return;
  }
  state.audioPlayer = new Audio(currentTrack.url);
  state.audioPlayer.volume = state.musicVolume;
  state.audioPlayer.loop = false;
  state.audioSourceType = "audio";
  state.audioPlayer.play().catch(() => {
    showNotification("Cannot play audio URL");
  });
  state.audioPlayer.onended = () => {
    if (state.isMusicShuffleEnabled_2) {
      playTrack(Math.floor(Math.random() * musicPlaylist.length));
    } else if (state.isMusicShuffleEnabled) {
      playTrack(state.currentTrackIndex + 1);
    } else {
      updateMusicPanel();
    }
  };
  state.audioPlayer.onplay = updateMusicPanel;
  state.audioPlayer.onpause = updateMusicPanel;
  updateMusicPanel();
}
function pausePlayback() {
  if (state.audioSourceType === "audio" && state.audioPlayer) {
    state.audioPlayer.pause();
  } else if (state.audioSourceType === "youtube" && state.youtubePlayer) {
    try {
      state.youtubePlayer.pauseVideo();
    } catch (youtubePauseError) {}
  }
  updateMusicPanel();
}
function resumePlayback() {
  if (state.audioSourceType === "audio" && state.audioPlayer) {
    state.audioPlayer.play().catch(() => {});
  } else if (state.audioSourceType === "youtube" && state.youtubePlayer) {
    try {
      state.youtubePlayer.playVideo();
    } catch (youtubePlayError) {}
  } else if (musicPlaylist.length) {
    playTrack(state.currentTrackIndex);
  }
  updateMusicPanel();
}
function stopPlayback() {
  if (state.audioSourceType === "audio" && state.audioPlayer) {
    state.audioPlayer.pause();
    state.audioPlayer.currentTime = 0;
  } else if (state.audioSourceType === "youtube" && state.youtubePlayer) {
    try {
      state.youtubePlayer.stopVideo();
    } catch (youtubeStopError) {}
  }
  state.audioSourceType = null;
  updateMusicPanel();
}
function isPlaying() {
  if (state.audioSourceType === "audio" && state.audioPlayer) {
    return !state.audioPlayer.paused;
  }
  if (state.audioSourceType === "youtube" && state.youtubePlayer && window.YT) {
    try {
      return state.youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING;
    } catch (error) {}
  }
  return false;
}
function playNextOrRandom() {
  if (!musicPlaylist.length) {
    return;
  }
  playTrack(
    state.isMusicShuffleEnabled_2
      ? Math.floor(Math.random() * musicPlaylist.length)
      : state.currentTrackIndex + 1,
  );
}
function playPrevious() {
  if (!musicPlaylist.length) {
    return;
  }
  playTrack(state.currentTrackIndex - 1);
}
function addTrackToPlaylist(trackUrl, trackName) {
  if (!trackUrl) {
    return;
  }
  trackName =
    trackName ||
    trackUrl.split("/").pop().split("?")[0] ||
    "Track " + (musicPlaylist.length + 1);
  musicPlaylist.push({
    url: trackUrl,
    name: trackName,
  });
  localStorage.setItem("musicPlaylist", JSON.stringify(musicPlaylist));
  updateMusicPanel();
  showNotification("Added: " + trackName);
}
function removeTrackFromPlaylist(trackIndex) {
  musicPlaylist.splice(trackIndex, 1);
  if (state.currentTrackIndex >= musicPlaylist.length) {
    state.currentTrackIndex = 0;
  }
  localStorage.setItem("musicPlaylist", JSON.stringify(musicPlaylist));
  if (!musicPlaylist.length) {
    stopPlayback();
  }
  updateMusicPanel();
}
function updateMusicPanel() {
  const musicPanel = document.getElementById("music-panel");
  if (!musicPanel) {
    return;
  }
  const isPlaying = isPlaying();
  const playBtn = musicPanel.querySelector("#musicPlayBtn");
  const trackNameDisplay = musicPanel.querySelector("#musicTrackName");
  const trackListContainer = musicPanel.querySelector("#musicTrackList");
  const loopBtn = musicPanel.querySelector("#musicLoopBtn");
  const shuffleBtn = musicPanel.querySelector("#musicShuffleBtn");
  if (playBtn) {
    playBtn.textContent = isPlaying ? "Pause" : "Play";
  }
  if (loopBtn) {
    loopBtn.classList.toggle("toggle-on", state.isMusicShuffleEnabled);
  }
  if (shuffleBtn) {
    shuffleBtn.classList.toggle("toggle-on", state.isMusicShuffleEnabled_2);
  }
  if (trackNameDisplay) {
    trackNameDisplay.textContent = musicPlaylist.length
      ? musicPlaylist[state.currentTrackIndex]?.name ||
        "Track " + (state.currentTrackIndex + 1)
      : "No tracks";
  }
  if (trackListContainer) {
    trackListContainer.innerHTML = "";
    musicPlaylist.forEach((event, targetId) => {
      const containerDiv = document.createElement("div");
      containerDiv.style.cssText =
        "display:flex;gap:4px;margin-bottom:3px;align-items:center;";
      const isToggledOn =
        targetId === state.currentTrackIndex &&
        (state.audioPlayer || state.youtubePlayer);
      containerDiv.innerHTML =
        '\n          <button class="ast-btn' +
        (isToggledOn ? " toggle-on" : "") +
        '" style="flex:1;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;" title="' +
        event.name +
        '">' +
        event.name.substring(0, 22) +
        '</button>\n          <button class="ast-btn" style="width:28px;margin:0;text-align:center;padding:6px 4px;color:#f44336;flex-shrink:0;">X</button>';
      containerDiv.querySelectorAll("button")[0].onclick = () =>
        playTrack(targetId);
      containerDiv.querySelectorAll("button")[1].onclick = () =>
        removeTrackFromPlaylist(targetId);
      trackListContainer.appendChild(containerDiv);
    });
    if (!musicPlaylist.length) {
      trackListContainer.innerHTML =
        '<div style="font-size:11px;color:#555;text-align:center;padding:6px 0;">No tracks yet</div>';
    }
  }
}

export {
  isYouTubeUrl,
  extractYouTubeId,
  ensureYouTubeApiReady,
  getYoutubeHostElement,
  playYouTubeVideo,
  stopAndCleanupPlayer,
  playTrack,
  pausePlayback,
  resumePlayback,
  stopPlayback,
  isPlaying,
  playNextOrRandom,
  playPrevious,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  updateMusicPanel,
};
