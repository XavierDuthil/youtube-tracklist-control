var currentVideoNameCache = null;
var currentTrackNumCache = null;
var currentTimeCache = null;
var pausedCache = null;
var tracklistCache = null;
var trackProgressBarElement = null;
var trackProgressBarElement2 = null;
var currentKeyboardShortcutsListener = null;
var trackedTabId = null;
var trackedTabUrl = null;
var injectableUrlRegex = /youtube.com\/watch/gi;
var tracklistUpdateWaitingTime = 50; // Milliseconds to wait for the tracklist update to succeed

function setTrackedTab(newTrackTab) {
  trackedTabId = newTrackTab.id;
  trackedTabUrl = newTrackTab.url;
  purgeCache();
  activateKeyboardShortcuts()
}

function purgeCache() {
  currentVideoNameCache = null;
  currentTrackNumCache = null;
  currentTimeCache = null;
  pausedCache = null;
  tracklistCache = null;
  trackProgressBarElement = null;
  trackProgressBarElement2 = null;
}

// Reset the keyboard shortcuts and activate them for the given tab
function activateKeyboardShortcuts() {
  if (currentKeyboardShortcutsListener) {
    chrome.commands.onCommand.removeListener(currentKeyboardShortcutsListener);
  }
  currentKeyboardShortcutsListener = function(command) {
    switch (command) {
      case "cmd_play_pause":
        chrome.tabs.sendMessage(trackedTabId, "playOrPause");
        break;
      case "cmd_previous_track":
        chrome.tabs.sendMessage(trackedTabId, "previousTrack");
        break;
      case "cmd_next_track":
        chrome.tabs.sendMessage(trackedTabId, "nextTrack");
        break;
    }
  };
  chrome.commands.onCommand.addListener(currentKeyboardShortcutsListener);
}

function playOrPause() {
  chrome.tabs.sendMessage(trackedTabId, "playOrPause");
}
function previousTrack() {
  chrome.tabs.sendMessage(trackedTabId, "previousTrack");
}
function nextTrack() {
  chrome.tabs.sendMessage(trackedTabId, "nextTrack");
}
function rewind() {
  chrome.tabs.sendMessage(trackedTabId, "rewind");
}
function fastForward() {
  chrome.tabs.sendMessage(trackedTabId, "fastForward");
}
function goToTrack(trackIdx) {
  chrome.tabs.sendMessage(trackedTabId, "goToTrack" + trackIdx);
}

function refreshCurrentVideo(mainPopupLabel, secondaryPopupLabel, noTrackLabel, tracklistTable) {
  chrome.tabs.sendMessage(trackedTabId, "getCurrentVideoName", function (currentVideoName) {
    if (currentVideoNameCache !== null && currentVideoNameCache === currentVideoName) {
      return;
    }
    currentVideoNameCache = currentVideoName;

    if (currentVideoName) {
      refreshCurrentTrack(mainPopupLabel, secondaryPopupLabel, noTrackLabel, tracklistTable)
    } else {
      setNoVideoLayout(mainPopupLabel, secondaryPopupLabel, noTrackLabel);
    }
  });
}

function refreshCurrentTrack(mainPopupLabel, secondaryPopupLabel, noTrackLabel, tracklistTable) {
  chrome.tabs.sendMessage(trackedTabId, "getCurrentTrackNum", function (currentTrackNum) {
    if (tracklistCache === null || (currentTrackNumCache !== null && currentTrackNumCache === currentTrackNum)) {
      return;
    }
    currentTrackNumCache = currentTrackNum;

    if (currentTrackNum === null || currentTrackNum === undefined) {
      setNoTrackLayout(mainPopupLabel, secondaryPopupLabel, noTrackLabel);
      return;
    }

    var waitingTime = 0;
    if (tracklistCache === null) {
      refreshTracklist(tracklistTable);
      waitingTime = tracklistUpdateWaitingTime; // Refresh the layout after 50ms to wait for the tracklist cache update to succeed
    }

    setTimeout(function() {
      setTracklistLayout(mainPopupLabel, secondaryPopupLabel, noTrackLabel, tracklistTable);
    }, waitingTime);
  });
}

function refreshCurrentTime(currentTimeLabel) {
  chrome.tabs.sendMessage(trackedTabId, "getCurrentTime", function (currentTimeFloat) {
    // If no response: hide the current time label
    if (!currentTimeFloat && currentTimeFloat !== 0) {
      currentTimeLabel.setAttribute("style", "display: none");
      return;
    }

    var currentTime = parseInt(currentTimeFloat);
    if (currentTimeCache !== null && currentTimeCache === currentTime) {
      return;
    }
    currentTimeCache = currentTime;

    // Update the total time in the lower bar
    currentTimeLabel.textContent = "[" + secondsToDisplayTime(currentTime) + "]";
    currentTimeLabel.setAttribute("style", "display: inline-block");

    if (!tracklistCache) {
      return;
    }

    var waitingTime = 0;
    if (trackProgressBarElement !== null) {
      waitingTime = tracklistUpdateWaitingTime
    }

    // Refresh the progress bar
    setTimeout(function() {
      refreshProgressBar(currentTime);
    }, waitingTime);  // Refresh the progress bar after 50ms to wait for the tracklist layout to be generated
  });
}

// Refresh the progress bar in the tracklist
function refreshProgressBar(currentTime) {
  if (trackProgressBarElement === null || tracklistCache === null || !tracklistCache[currentTrackNumCache]) {
    return;
  }

  // Update the progress bar in the tracklist
  var currentTrackStartTime = tracklistCache[currentTrackNumCache]["startTime"];
  var currentTrackDuration = tracklistCache[currentTrackNumCache]["duration"];
  if (currentTrackStartTime === null || currentTrackDuration === null) {
    return;
  }

  var trackProcess = (currentTimeCache - currentTrackStartTime) * 100 / currentTrackDuration;
  var styleText = "background: linear-gradient(90deg, rgb(254, 2, 2) " + trackProcess + "%, #CCCCCC 0%);";
  trackProgressBarElement.setAttribute('style', styleText);
}

// Transforms a number of seconds to a printable "xx:xx:xx" string
function secondsToDisplayTime(seconds) {
  var date = new Date(null);
  date.setSeconds(seconds);
  var dateISO = date.toISOString();
  return seconds >= 3600 ? dateISO.substr(11, 8) : dateISO.substr(14, 5);
}

// Refresh the play/pause button
function refreshPaused(playOrPauseButtonLabel) {
  chrome.tabs.sendMessage(trackedTabId, "getPaused", function (paused) {
    if (pausedCache !== null && pausedCache === paused)
      return;
    pausedCache = paused;

    if (paused) {
      playOrPauseButtonLabel.setAttribute('src', 'img/play.png');
    } else if (paused === false) {
      playOrPauseButtonLabel.setAttribute('src', 'img/pause.png');
    } else {
      playOrPauseButtonLabel.setAttribute('src', 'img/play_pause.png');
    }
  });
}

function refreshTracklist(tracklistTable) {
  chrome.tabs.sendMessage(trackedTabId, "getTracklist", function (tracklist) {
    if (tracklistCache !== null && JSON.stringify(tracklistCache) === JSON.stringify(tracklist))
      return;
    tracklistCache = tracklist;

    if (tracklist) {
      // Clean table
      while (tracklistTable.lastChild) {
        tracklistTable.removeChild(tracklistTable.lastChild);
      }

      // Build new table
      var tbodyElement = document.createElement("tbody");
      for (var trackIdx in tracklist) {
        var trackInfo = tracklist[trackIdx];
        var trackNum = parseInt(trackIdx) + 1;
        trackNum = (trackNum < 10) ? ("0" + trackNum) : trackNum;

        var rowElement = document.createElement("tr");
        var trackNumCell = document.createElement("td");
        trackNumCell.className = "trackNumColumn";
        trackNumCell.textContent = "" + trackNum;

        var trackNameCell = document.createElement("td");
        trackNameCell.className = "trackNameColumn";
        trackNameCell.textContent = "" + trackInfo["title"];

        var trackTimeCell = document.createElement("td");
        trackTimeCell.className = "trackTimeColumn";
        trackTimeCell.textContent = "" + secondsToDisplayTime(trackInfo["duration"]);

        rowElement.appendChild(trackNumCell);
        rowElement.appendChild(trackNameCell);
        rowElement.appendChild(trackTimeCell);
        tbodyElement.appendChild(rowElement);
      }

      tracklistTable.appendChild(tbodyElement);
      tracklistTable.setAttribute("style", "display: table");
    } else {
      tracklistTable.setAttribute("style", "display: none");
    }
  });
}

function setNoVideoLayout(mainPopupLabel, secondaryPopupLabel, noTrackLabel) {
  mainPopupLabel.textContent = chrome.i18n.getMessage("noVideo");
  mainPopupLabel.setAttribute("style", "display: block");
  secondaryPopupLabel.setAttribute("style", "display: none");
  noTrackLabel.setAttribute("style", "display: none");
}

function setNoTrackLayout(mainPopupLabel, secondaryPopupLabel, noTrackLabel) {
  mainPopupLabel.textContent = currentVideoNameCache || mainPopupLabel.textContent;
  mainPopupLabel.setAttribute("style", "display: block");
  noTrackLabel.textContent = chrome.i18n.getMessage("noTracklist");
  secondaryPopupLabel.setAttribute("style", "display: none");
  noTrackLabel.setAttribute("style", "display: inline");
}

function setTracklistLayout(mainPopupLabel, secondaryPopupLabel, noTrackLabel, tracklistTable) {
  // Remove previously highlighted track in tracklist
  var previousCurrentTrack = tracklistTable.querySelector("#currentTrackInPlaylist");
  if (previousCurrentTrack !== null) {
    previousCurrentTrack.removeAttribute("id");
    previousCurrentTrack.removeAttribute("style");
    trackProgressBarElement.remove();
    trackProgressBarElement2.remove();
  }

  // Highlight current track in tracklist and add progress bar
  if (tracklistTable.lastChild && tracklistTable.lastChild.lastChild) {
    var newCurrentTrack = tracklistTable.lastChild.childNodes[currentTrackNumCache];
    newCurrentTrack.setAttribute("id", "currentTrackInPlaylist");
    newCurrentTrack.scrollIntoView({behavior: "smooth", block: "center", inline: "center"});
    trackProgressBarElement = tracklistTable.insertRow(currentTrackNumCache + 1);
    trackProgressBarElement2 = tracklistTable.insertRow(currentTrackNumCache + 2);
    trackProgressBarElement.className = "progressBar";
    trackProgressBarElement2.className = "progressBar";
    var progressBarCell = trackProgressBarElement.insertCell();
    progressBarCell.rowSpan = 2;
    progressBarCell.colSpan = 3;
  }

  // Update other labels
  mainPopupLabel.textContent = tracklistCache[currentTrackNumCache]["title"];  // Track name
  secondaryPopupLabel.textContent = currentVideoNameCache;  // Video name
  mainPopupLabel.setAttribute("style", "display: block");
  secondaryPopupLabel.setAttribute("style", "display: block");
  noTrackLabel.setAttribute("style", "display: none");
}


// Inject contentScript on upgrade/install into all youtube tabs
chrome.windows.getAll({
  populate: true
}, function (windows) {
  var i = 0, w = windows.length, currentWindow;
  var tabToTrack = null;
  for( ; i < w; i++ ) {
    currentWindow = windows[i];
    var j = 0, t = currentWindow.tabs.length, currentTab;
    for( ; j < t; j++ ) {
      currentTab = currentWindow.tabs[j];
      // Proceed only with youtube pages
      if(currentTab.url.match(injectableUrlRegex) ) {
        injectIntoTab(currentTab);
        tabToTrack = currentTab;
      }
    }
  }

  // Activate keyboard shortcuts for the last Youtube video tab detected
  if (tabToTrack) {
    setTrackedTab(tabToTrack);
  }
});

// Inject contentScript into a specific tab
var injectIntoTab = function (tab) {
  if (!tab.id || !tab.url) {
    return;
  }

  try {
    var scripts = chrome.runtime.getManifest().content_scripts[0].js;
    for (var i = 0; i < scripts.length; i++) {
      if (tab.url.match(injectableUrlRegex)) {
        chrome.tabs.executeScript(tab.id, {
          file: scripts[i]
        });
      }
    }
  } catch (e) {
    console.log("Unable to inject content script in tab URL " + tab.url + ": " + e)
  }
};