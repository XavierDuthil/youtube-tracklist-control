function refreshLabels(tabId, currentVideoLabel, currentTrackLabel, noTrackLabel) {
  chrome.tabs.sendMessage(tabId, "getCurrentVideo", function (response) {
    if (response) {
      currentVideoLabel.textContent = response;
      currentTrackLabel.display = "block";
      refreshCurrentTrack(tabId, currentVideoLabel, currentTrackLabel, noTrackLabel)
    } else {
      currentVideoLabel.textContent = "__MSG_noVideo__";
      currentTrackLabel.setAttribute("style", "display: none");
      noTrackLabel.setAttribute("style", "display: none");
    }
  });
}

function refreshCurrentTrack(tabId, currentVideoLabel, currentTrackLabel, noTrackLabel) {
  chrome.tabs.sendMessage(tabId, "getCurrentTrack", function (response) {
    if (response) {
      currentVideoLabel.className = "secondaryTitle";
      currentTrackLabel.setAttribute("style", "display: block");
      currentTrackLabel.textContent = response;
      noTrackLabel.setAttribute("style", "display: none");
    } else {
      currentVideoLabel.className = "primaryTitle";
      currentTrackLabel.setAttribute("style", "display: none");
      noTrackLabel.setAttribute("style", "display: inline");
    }
  });
}

function refreshCurrentTime(tabId, currentTimeLabel) {
  chrome.tabs.sendMessage(tabId, "getCurrentTime", function (response) {
    if (response) {
      var seconds = parseInt(response);

      var date = new Date(null);
      date.setSeconds(seconds);
      var dateISO = date.toISOString();
      var timeStr = seconds >= 3600 ? dateISO.substr(11, 8) : dateISO.substr(14, 5);

      currentTimeLabel.textContent = "[" + timeStr + "]";
    } else {
      currentTimeLabel.display = "None";
    }
  });
}

function refreshPaused(tabId, playOrPauseButtonLabel) {
  chrome.tabs.sendMessage(tabId, "getPaused", function (paused) {
    if (paused) {
      playOrPauseButtonLabel.setAttribute('src', 'img/play.png');
    } else if (paused === false) {
      playOrPauseButtonLabel.setAttribute('src', 'img/pause.png');
    } else {
      playOrPauseButtonLabel.setAttribute('src', 'img/play_pause.png');
    }
  });
}
