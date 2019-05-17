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
var trackedTabUpdateWaitingTime = 50; // Milliseconds to wait for the tracked tab update

function init() {
  trackLastYoutubeTabOrThisOne(null);
  activateKeyboardShortcuts();
}

function trackLastYoutubeTabOrThisOne(tabToTrackIfNoCandidate) {
  setTrackedTab(null);
  chrome.windows.getAll({populate: true}, function (windows) {
    var windowsCount = windows.length;
    var currentWindow;
    var tabToTrack;

    // Browse all tabs from all windows
    for (var i = 0; i < windowsCount; i++) {
      currentWindow = windows[i];
      var tabsCount = currentWindow.tabs.length;
      var currentTab;

      for (var j = 0; j < tabsCount; j++) {
        currentTab = currentWindow.tabs[j];

        // Select the last Youtube video tab
        if (currentTab.url.match(injectableUrlRegex)) {
          tabToTrack = currentTab;
        }
      }
    }

    // Track the selected tab
    if (tabToTrack) {
      setTrackedTab(tabToTrack);
    } else if (tabToTrackIfNoCandidate) {
      setTrackedTab(tabToTrackIfNoCandidate);
    }
  });
}

function setTrackedTab(newTrackedTab) {
  purgeCache();
  if (!newTrackedTab) {
    trackedTabId = null;
    trackedTabUrl = null;
    return;
  }

  trackedTabId = newTrackedTab.id;
  trackedTabUrl = newTrackedTab.url;

  // Inject script if no script heartbeat response is received from this tab
  chrome.tabs.sendMessage(newTrackedTab.id, "heartbeat", function (response) {
    if (!response) {
      chrome.runtime.lastError; // Silence the error by accessing the variable
      injectContentScriptIntoTab(newTrackedTab);
    }
  });
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

function injectContentScriptIntoTab(tab) {
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
}

function activateKeyboardShortcuts() {
  chrome.commands.onCommand.addListener(
    function(command) {
      var message;
      switch (command) {
        case "cmd_play_pause":
          message = "playOrPause";
          break;
        case "cmd_previous_track":
          message = "previousTrack";
          break;
        case "cmd_next_track":
          message = "nextTrack";
          break;
        default:
          return;
      }

      if (trackedTabId !== null) {
        sendMessageToTrackedTab(message);
      } else {
        sendMessageToUnknownTab(message);
      }
    }
  );
}

function sendMessageToTrackedTab(message) {
  // Verify that the tracked tab exists and has functioning script
  chrome.tabs.sendMessage(trackedTabId, "heartbeat", function (response) {
    chrome.runtime.lastError; // Silence the error by accessing the variable

    // If the tracked tab is fine, send the message to it
    if (response) {
      chrome.tabs.sendMessage(trackedTabId, message);
      return;
    }

    // If not, track a new tab and send the message to it
    sendMessageToUnknownTab(message);
  });
}

function sendMessageToUnknownTab(message) {
  // Find a Youtube tab to track
  trackLastYoutubeTabOrThisOne(null);

  // Wait for the update to occur, then send command to the newly tracked tab if there is one
  setTimeout(function() {
    if (trackedTabId !== null) {
      chrome.tabs.sendMessage(trackedTabId, message);
    }
  }, trackedTabUpdateWaitingTime);
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

function hardRefresh(mainPopupLabel, secondaryPopupLabel, noTrackLabel, tracklistTable, currentTimeLabel, playOrPauseButton) {
  if (!trackedTabId) {
    setNoVideoLayout(mainPopupLabel, secondaryPopupLabel, noTrackLabel, currentTimeLabel);
    setNoTrackLayout(mainPopupLabel, secondaryPopupLabel, noTrackLabel);
    currentTimeLabel.setAttribute("style", "display: none");
    return;
  }

  purgeCache();
  refreshCurrentVideo(mainPopupLabel, secondaryPopupLabel, noTrackLabel, tracklistTable, currentTimeLabel);
  refreshTracklist(tracklistTable);

  softRefresh(mainPopupLabel, secondaryPopupLabel, noTrackLabel, tracklistTable, currentTimeLabel, playOrPauseButton);
}

function softRefresh(mainPopupLabel, secondaryPopupLabel, noTrackLabel, tracklistTable, currentTimeLabel, playOrPauseButton) {
  if (!trackedTabId) {
    setNoTrackLayout(mainPopupLabel, secondaryPopupLabel, noTrackLabel);
    currentTimeLabel.setAttribute("style", "display: none");
    return;
  }

  refreshCurrentTrack(mainPopupLabel, secondaryPopupLabel, noTrackLabel, tracklistTable);
  refreshCurrentTime(currentTimeLabel);
  refreshPaused(playOrPauseButton);
}

function refreshCurrentVideo(mainPopupLabel, secondaryPopupLabel, noTrackLabel, tracklistTable, currentTimeLabel) {
  chrome.tabs.sendMessage(trackedTabId, "getCurrentVideoName", function (currentVideoName) {
    chrome.runtime.lastError; // Silence the error by accessing the variable
    if (currentVideoNameCache !== null && currentVideoNameCache === currentVideoName) {
      return;
    }
    currentVideoNameCache = currentVideoName;

    if (currentVideoName) {
      refreshCurrentTrack(mainPopupLabel, secondaryPopupLabel, noTrackLabel, tracklistTable)
    } else {
      setNoVideoLayout(mainPopupLabel, secondaryPopupLabel, noTrackLabel, currentTimeLabel);
    }
  });
}

function refreshCurrentTrack(mainPopupLabel, secondaryPopupLabel, noTrackLabel, tracklistTable) {
  chrome.tabs.sendMessage(trackedTabId, "getCurrentTrackNum", function (currentTrackNum) {
    chrome.runtime.lastError; // Silence the error by accessing the variable
    if (currentTrackNumCache !== null && currentTrackNumCache === currentTrackNum) {
      return;
    }
    currentTrackNumCache = currentTrackNum;

    if (currentTrackNum === null || currentTrackNum === undefined) {
      setNoTrackLayout(mainPopupLabel, secondaryPopupLabel, noTrackLabel);
      return;
    }

    var waitingTime = 0;
    if (!tracklistCache || tracklistCache.length === 0) {
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
    chrome.runtime.lastError; // Silence the error by accessing the variable
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
  date.setSeconds(seconds || 0);
  var dateISO = date.toISOString();
  return seconds >= 3600 ? dateISO.substr(11, 8) : dateISO.substr(14, 5);
}

// Refresh the play/pause button
function refreshPaused(playOrPauseButtonLabel) {
  if (!trackedTabId) {
    playOrPauseButtonLabel.setAttribute('src', 'img/play_pause.png');
    return;
  }
  chrome.tabs.sendMessage(trackedTabId, "getPaused", function (paused) {
    chrome.runtime.lastError; // Silence the error by accessing the variable
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
    chrome.runtime.lastError; // Silence the error by accessing the variable
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

function setNoVideoLayout(mainPopupLabel, secondaryPopupLabel, noTrackLabel, currentTimeLabel) {
  mainPopupLabel.textContent = chrome.i18n.getMessage("noVideo");
  mainPopupLabel.setAttribute("style", "display: block");
  secondaryPopupLabel.setAttribute("style", "display: none");
  noTrackLabel.setAttribute("style", "display: none");
  currentTimeLabel.setAttribute("style", "display: none");
}

function setNoTrackLayout(mainPopupLabel, secondaryPopupLabel, noTrackLabel) {
  mainPopupLabel.textContent = currentVideoNameCache || mainPopupLabel.textContent;
  mainPopupLabel.setAttribute("style", "display: block");
  noTrackLabel.textContent = chrome.i18n.getMessage("noTracklist");
  secondaryPopupLabel.setAttribute("style", "display: none");
  noTrackLabel.setAttribute("style", "display: inline");
}

function setTracklistLayout(mainPopupLabel, secondaryPopupLabel, noTrackLabel, tracklistTable) {
  if (!tracklistCache || !tracklistCache[currentTrackNumCache]) {
    return;
  }

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
    trackProgressBarElement = tracklistTable.insertRow(currentTrackNumCache + 1);
    trackProgressBarElement2 = tracklistTable.insertRow(currentTrackNumCache + 2);
    trackProgressBarElement.className = "progressBar";
    trackProgressBarElement2.className = "progressBar";
    var progressBarCell = trackProgressBarElement.insertCell();
    progressBarCell.rowSpan = 2;
    progressBarCell.colSpan = 3;

    // Scroll to progress bar
    trackProgressBarElement.scrollIntoView({behavior: "smooth", block: "center", inline: "center"});
  }

  // Update other labels
  mainPopupLabel.textContent = tracklistCache[currentTrackNumCache]["title"];  // Track name
  secondaryPopupLabel.textContent = currentVideoNameCache;  // Video name
  mainPopupLabel.setAttribute("style", "display: block");
  secondaryPopupLabel.setAttribute("style", "display: block");
  noTrackLabel.setAttribute("style", "display: none");
}

init();
