var currentVideoCache = null;
var currentTrackNumCache = null;
var currentTimeCache = null;
var pausedCache = null;
var tracklistCache = null;
var currentTrackStartTime = null;
var currentTrackDuration = null;
var trackProgressBarElement = null;
var trackProgressBarElement2 = null;

function purgeCache() {
  currentVideoCache = null;
  currentTrackNumCache = null;
  currentTimeCache = null;
  pausedCache = null;
  tracklistCache = null;
  currentTrackStartTime = null;
  currentTrackDuration = null;
  trackProgressBarElement = null;
  trackProgressBarElement2 = null;
}

function refreshCurrentVideo(tabId, currentVideoLabel, currentTrackLabel, noTrackLabel) {
  chrome.tabs.sendMessage(tabId, "getCurrentVideo", function (response) {
    if (currentVideoCache !== null && currentVideoCache === response) {
      return;
    }
    currentVideoCache = response;

    if (response) {
      currentVideoLabel.textContent = response;
      currentTrackLabel.display = "block";
      refreshCurrentTrack(tabId, currentVideoLabel, currentTrackLabel, noTrackLabel)
    } else {
      currentVideoLabel.textContent = chrome.i18n.getMessage("noVideo");
      currentTrackLabel.setAttribute("style", "display: none");
      noTrackLabel.setAttribute("style", "display: none");
    }
  });
}

function refreshCurrentTrack(tabId, currentVideoLabel, currentTrackLabel, noTrackLabel, playlistTable, document) {
  chrome.tabs.sendMessage(tabId, "getCurrentTrackNum", function (response) {
    if (tracklistCache === null || (currentTrackNumCache !== null && currentTrackNumCache === response))
      return;
    currentTrackNumCache = response;

    if (response !== null && response !== undefined) {
      var currentTrackName = tracklistCache[currentTrackNumCache]["title"];
      currentTrackStartTime = tracklistCache[currentTrackNumCache]["startTime"];
      currentTrackDuration = tracklistCache[currentTrackNumCache]["duration"];

      // Update current track label
      currentTrackLabel.setAttribute("style", "display: block");
      currentTrackLabel.textContent = currentTrackName;

      // Remove previously highlighted track in tracklist
      var previousCurrentTrack = playlistTable.querySelector("#currentTrackInPlaylist");
      if (previousCurrentTrack !== null) {
        previousCurrentTrack.removeAttribute("id");
        previousCurrentTrack.removeAttribute("style");
        trackProgressBarElement.remove();
        trackProgressBarElement2.remove();
      }

      // Highlight current track in tracklist
      if (playlistTable.firstChild) {
        var newCurrentTrack = playlistTable.firstChild.childNodes[currentTrackNumCache];
        newCurrentTrack.setAttribute("id", "currentTrackInPlaylist");
        newCurrentTrack.scrollIntoView({behavior: "smooth", block: "center", inline: "center"})
        trackProgressBarElement = playlistTable.insertRow(currentTrackNumCache + 1);
        trackProgressBarElement2 = playlistTable.insertRow(currentTrackNumCache + 2);
        // trackProgressBarElement.setAttribute("height", "5px");
        var progressBarCell = trackProgressBarElement.insertCell()
        progressBarCell.rowSpan = 2;
        progressBarCell.colSpan = 3;
      }

      // Update other labels
      currentVideoLabel.className = "secondaryTitle";
      noTrackLabel.setAttribute("style", "display: none");
    } else {
      // Hide current track label
      currentTrackLabel.setAttribute("style", "display: none");

      // Update other labels
      currentVideoLabel.className = "primaryTitle";
      noTrackLabel.setAttribute("style", "display: inline");
      noTrackLabel.textContent = chrome.i18n.getMessage("noTracklist");
    }
  });
}

function refreshCurrentTime(tabId, currentTimeLabel) {
  chrome.tabs.sendMessage(tabId, "getCurrentTime", function (response) {
    if (response) {
      var seconds = parseInt(response);

      if (currentTimeCache !== null && currentTimeCache === seconds)
        return;
      currentTimeCache = seconds;
      var timeStr = secondsToDisplayTime(seconds);

      // Update the total time in the lower bar
      currentTimeLabel.textContent = "[" + timeStr + "]";
      currentTimeLabel.setAttribute("style", "display: inline-block");

      // Update the progress bar in the tracklist
      if (currentTrackStartTime !== null && currentTrackDuration !== null && trackProgressBarElement !== null) {
        var trackProcess =  (currentTimeCache - currentTrackStartTime) * 100 / currentTrackDuration;
        var styleText = "background: linear-gradient(90deg, rgb(254, 2, 2) " + trackProcess + "%, #CCCCCC 0%);";
        trackProgressBarElement.setAttribute('style', styleText);
      }
    } else {
      currentTimeLabel.setAttribute("style", "display: none");
    }
  });
}

// Transforms a number of seconds to a printable "xx:xx:xx" string
function secondsToDisplayTime(seconds) {
  var date = new Date(null);
  date.setSeconds(seconds);
  var dateISO = date.toISOString();
  return seconds >= 3600 ? dateISO.substr(11, 8) : dateISO.substr(14, 5);
}

function refreshPaused(tabId, playOrPauseButtonLabel) {
  chrome.tabs.sendMessage(tabId, "getPaused", function (paused) {
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

function refreshTracklist(tabId, tracklistTable) {
  chrome.tabs.sendMessage(tabId, "getTracklist", function (tracklist) {
    if (tracklistCache !== null && JSON.stringify(tracklistCache) === JSON.stringify(tracklist))
      return;
    tracklistCache = tracklist;

    if (tracklist) {
      var tableContent = "<tbody>";
      // tableContent += "<tr><th>N#</th><th>Title</th><th>Time</th></tr>";
      for (var trackIdx in tracklist) {
        var trackInfo = tracklist[trackIdx];
        var trackNum = parseInt(trackIdx) + 1;
        trackNum = (trackNum < 10) ? ("0" + trackNum) : trackNum;
        tableContent += "<tr>" +
          "<td class=\"trackNumColumn\">" + trackNum + "</td>" +
          "<td class=\"trackNameColumn\">" + trackInfo["title"] + "</td>" +
          "<td class=\"trackTimeColumn\">" + secondsToDisplayTime(trackInfo["duration"]) + "</td>" +
          "</tr>";
      }

      tableContent += "</tbody>";
      tracklistTable.innerHTML = tableContent;
      tracklistTable.setAttribute("style", "display: table");
    } else {
      tracklistTable.setAttribute("style", "display: none");
    }
  });
}

// Inject contentScript on upgrade/install into all youtube tabs
chrome.windows.getAll({
  populate: true
}, function (windows) {
  var i = 0, w = windows.length, currentWindow;
  for( ; i < w; i++ ) {
    currentWindow = windows[i];
    var j = 0, t = currentWindow.tabs.length, currentTab;
    for( ; j < t; j++ ) {
      currentTab = currentWindow.tabs[j];
      // Proceed only with youtube pages
      if(currentTab.url.match(/youtube.com\/watch/gi) ) {
        injectIntoTab(currentTab);
      }
    }
  }
});

// Inject contentScript
var injectIntoTab = function (tab) {
  var scripts = chrome.runtime.getManifest().content_scripts[0].js;
  var i = 0, s = scripts.length;
  for( ; i < s; i++ ) {
    chrome.tabs.executeScript(tab.id, {
      file: scripts[i]
    });
  }
}