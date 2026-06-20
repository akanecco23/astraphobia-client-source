import { removeTrackFromPlaylist } from "../storage.js";
import { showNotification } from "./interaction.js";
import { state } from "../core.js";

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
  if (!url) {
    return null;
  }
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname.includes("youtu.be")) {
      return parsedUrl.pathname.slice(1).split("/")[0] || null;
    }
    if (parsedUrl.hostname.includes("youtube.com")) {
      return (
        parsedUrl.searchParams.get("v") ||
        (parsedUrl.pathname.startsWith("/embed/")
          ? parsedUrl.pathname.split("/embed/")[1]?.split("/")[0]
          : null) ||
        (parsedUrl.pathname.startsWith("/shorts/")
          ? parsedUrl.pathname.split("/shorts/")[1]?.split("/")[0]
          : null)
      );
    }
  } catch (error) {}
  return null;
}
function ensureYoutubeApiReady(callback) {
  if (isYtApiLoaded && window.YT && window.YT.Player) {
    callback();
    return;
  }
  if (!window._astYtReadyCallbacks) {
    window._astYtReadyCallbacks = [];
  }
  window._astYtReadyCallbacks.push(callback);
  if (isAutofillInitialized) {
    return;
  }
  isAutofillInitialized = true;
  if (!document.getElementById("ast-yt-api")) {
    const scriptElement = document.createElement("script");
    scriptElement.id = "ast-yt-api";
    scriptElement.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(scriptElement);
  }
  const originalReadyHandler = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = function () {
    isYtApiLoaded = true;
    if (typeof originalReadyHandler === "function") {
      try {
        originalReadyHandler();
      } catch (uninitializedVar1) {}
    }
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
    hostElement.style.cssText =
      "position:fixed;left:-99999px;top:-99999px;width:1px;height:1px;opacity:0;pointer-events:none;";
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
        onReady: (audioPlayerEvent) => {
          try {
            audioPlayerEvent.target.setVolume(
              Math.round(uiaudioState.musicVolume * 100),
            );
            audioPlayerEvent.target.playVideo();
          } catch (unusedVariable) {}
          audioSourceType = "youtube";
          updateMusicPanel();
        },
        onStateChange: (youtubePlayerEvent) => {
          if (!window.YT) {
            return;
          }
          if (youtubePlayerEvent.data === YT.PlayerState.ENDED) {
            if (uiaudioState.isMusicShuffleEnabled) {
              playTrack(Math.floor(Math.random() * musicPlaylist.length));
            } else if (uiaudioState.isMusicLoopEnabled) {
              playTrack(state.currentTrackIndex + 1);
            } else {
              updateMusicPanel();
            }
          }
          if (
            youtubePlayerEvent.data === YT.PlayerState.PLAYING ||
            youtubePlayerEvent.data === YT.PlayerState.PAUSED
          ) {
            updateMusicPanel();
          }
        },
      },
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
  if (youtubePlayer) {
    try {
      youtubePlayer.stopVideo();
    } catch (youtubeStopError) {}
  }
  audioSourceType = null;
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
    if (uiaudioState.isMusicShuffleEnabled) {
      playTrack(Math.floor(Math.random() * musicPlaylist.length));
    } else if (uiaudioState.isMusicLoopEnabled) {
      playTrack(state.currentTrackIndex + 1);
    } else {
      updateMusicPanel();
    }
  };
  audioPlayer.onplay = updateMusicPanel;
  audioPlayer.onpause = updateMusicPanel;
  updateMusicPanel();
}
function pausePlayback() {
  if (audioSourceType === "audio" && audioPlayer) {
    audioPlayer.pause();
  } else if (audioSourceType === "youtube" && youtubePlayer) {
    try {
      youtubePlayer.pauseVideo();
    } catch (youtubePauseError) {}
  }
  updateMusicPanel();
}
function resumePlayback() {
  if (audioSourceType === "audio" && audioPlayer) {
    audioPlayer.play().catch(() => {});
  } else if (audioSourceType === "youtube" && youtubePlayer) {
    try {
      youtubePlayer.playVideo();
    } catch (youtubePlayError) {}
  } else if (musicPlaylist.length) {
    playTrack(state.currentTrackIndex);
  }
  updateMusicPanel();
}
function resetPlayback() {
  if (audioSourceType === "audio" && audioPlayer) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
  } else if (audioSourceType === "youtube" && youtubePlayer) {
    try {
      youtubePlayer.stopVideo();
    } catch (youtubeResetError) {}
  }
  audioSourceType = null;
  updateMusicPanel();
}
function isPlaying() {
  if (audioSourceType === "audio" && audioPlayer) {
    return !audioPlayer.paused;
  }
  if (audioSourceType === "youtube" && youtubePlayer && window.YT) {
    try {
      return youtubePlayer.getPlayerState() === YT.PlayerState.PLAYING;
    } catch (error) {}
  }
  return false;
}
function playNextOrRandom() {
  if (!musicPlaylist.length) {
    return;
  }
  playTrack(
    uiaudioState.isMusicShuffleEnabled
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
function updateMusicPanel() {
  const musicPanel = document.getElementById("music-panel");
  if (!musicPanel) {
    return;
  }
  const isCurrentlyPlaying = isPlaying();
  const playButton = musicPanel.querySelector("#musicPlayBtn");
  const trackNameDisplay = musicPanel.querySelector("#musicTrackName");
  const trackListContainer = musicPanel.querySelector("#musicTrackList");
  const loopButton = musicPanel.querySelector("#musicLoopBtn");
  const shuffleButton = musicPanel.querySelector("#musicShuffleBtn");
  if (playButton) {
    playButton.textContent = isCurrentlyPlaying ? "Pause" : "Play";
  }
  if (loopButton) {
    loopButton.classList.toggle("toggle-on", uiaudioState.isMusicLoopEnabled);
  }
  if (shuffleButton) {
    shuffleButton.classList.toggle(
      "toggle-on",
      uiaudioState.isMusicShuffleEnabled,
    );
  }
  if (trackNameDisplay) {
    trackNameDisplay.textContent = musicPlaylist.length
      ? musicPlaylist[state.currentTrackIndex]?.name ||
        "Track " + (state.currentTrackIndex + 1)
      : "No tracks";
  }
  if (trackListContainer) {
    trackListContainer.innerHTML = "";
    musicPlaylist.forEach((event, targetElement) => {
      const containerDiv = document.createElement("div");
      containerDiv.style.cssText =
        "display:flex;gap:4px;margin-bottom:3px;align-items:center;";
      const isToggledOn =
        targetElement === state.currentTrackIndex &&
        (audioPlayer || youtubePlayer);
      containerDiv.innerHTML =
        '\n          <button class="ast-btn' +
        (isToggledOn ? " toggle-on" : "") +
        '" style="flex:1;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:left;" title="' +
        event.name +
        '">' +
        event.name.substring(0, 22) +
        '</button>\n          <button class="ast-btn" style="width:28px;margin:0;text-align:center;padding:6px 4px;color:#f44336;flex-shrink:0;">X</button>';
      containerDiv.querySelectorAll("button")[0].onclick = () =>
        playTrack(targetElement);
      containerDiv.querySelectorAll("button")[1].onclick = () =>
        removeTrackFromPlaylist(targetElement);
      trackListContainer.appendChild(containerDiv);
    });
    if (!musicPlaylist.length) {
      trackListContainer.innerHTML =
        '<div style="font-size:11px;color:#555;text-align:center;padding:6px 0;">No tracks yet</div>';
    }
  }
}

export const uiaudioState = {
  isMuted: false,
  musicVolume: parseFloat(localStorage.getItem("musicVolume") || "0.5"),
  isMusicLoopEnabled: localStorage.getItem("musicLoop") !== "false",
  isMusicShuffleEnabled: localStorage.getItem("musicShuffle") === "true",
};

export {
  isYoutubeUrl,
  getYoutubeVideoId,
  ensureYoutubeApiReady,
  getYoutubeHostElement,
  playYoutubeVideo,
  stopAllPlayback,
  playTrack,
  pausePlayback,
  resumePlayback,
  resetPlayback,
  isPlaying,
  playNextOrRandom,
  playPrevious,
  updateMusicPanel,
  audioPlayer,
  musicPlaylist,
  youtubePlayer,
};
