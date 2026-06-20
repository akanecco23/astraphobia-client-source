import {
  musicPlaylist,
  updateMusicPanel,
  resetPlayback,
  uiaudioState,
} from "./ui/audio.js";
import { showNotification } from "./ui/interaction.js";
import { state } from "./core.js";

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
function removeTrackFromPlaylist(indexToRemove) {
  musicPlaylist.splice(indexToRemove, 1);
  if (state.currentTrackIndex >= musicPlaylist.length) {
    state.currentTrackIndex = 0;
  }
  localStorage.setItem("musicPlaylist", JSON.stringify(musicPlaylist));
  if (!musicPlaylist.length) {
    resetPlayback();
  }
  updateMusicPanel();
}

export { addTrackToPlaylist, removeTrackFromPlaylist };
