function refreshCurrentVideo(tabId, currentVideoElement) {
  chrome.tabs.sendMessage(tabId, "getCurrentVideo", function (response) {
    if (response) {
      currentVideoElement.textContent = response;
    } else {
      currentVideoElement.textContent = "Current video";
    }
  });
}

function refreshCurrentTrack(tabId, currentTrackElement) {
  chrome.tabs.sendMessage(tabId, "getCurrentTrack", function (response) {
    if (response) {
      currentTrackElement.textContent = response;
      currentTrackElement.display = "Block";
    } else {
      currentTrackElement.display = "None";
    }
  });
}

function refreshCurrentTime(tabId, currentTimeElement) {
  chrome.tabs.sendMessage(tabId, "getCurrentTime", function (response) {
    if (response) {
      var seconds = parseInt(response);

      var date = new Date(null);
      date.setSeconds(seconds);
      var dateISO = date.toISOString();
      var timeStr = seconds >= 3600 ? dateISO.substr(11, 8) : dateISO.substr(14, 5);

      currentTimeElement.textContent = "[" + timeStr + "]";
    } else {
      currentTimeElement.display = "None";
    }
  });
}
