chrome.tabs.query({'active': true,'currentWindow': true}, function(tab){
  // Lower refresh period offers better reactivity when opening the Popup
  var config = {
    'initial_refresh_period': 50,
    'normal_refresh_period': 500
  };
  var tabId = tab[0].id;
  var backgroundPage = chrome.extension.getBackgroundPage();
  var savedURL;
  var currentURL;
  var hardRefreshesToDo = 0;

  chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    if (savedURL && tabs.length)
      savedURL = tabs[0].url;
  });

  refreshPopup();
  startTicker();

  function startTicker() {
    window.setTimeout(function () {
      refreshPopup();
    }, config["initial_refresh_period"]);
    window.setTimeout(function () {
      refreshPopup();
    }, config["initial_refresh_period"] * 2);
    window.setTimeout(function () {
      refreshPopup();
    }, config["initial_refresh_period"] * 4);

    window.setInterval(function () {
      refreshPopup();
    }, config["normal_refresh_period"]);
  }

  var currentVideoLabel = document.getElementById("currentVideoLabel");
  var currentTrackLabel = document.getElementById("currentTrackLabel");
  var noTrackLabel = document.getElementById("noTrackLabel");
  var currentTimeLabel = document.getElementById("currentTimeLabel");
  var playOrPauseButton = document.getElementById("playOrPauseButton");
  var tracklistTable = document.getElementById("tracklistTable");

  function refreshPopup() {
    if (!currentVideoLabel) {
      return;
    }

    // Refresh tracklist only if URL has changed
    chrome.tabs.query({'active': true, 'currentWindow':true}, function (tabs) {
      if (tabs[0] && tabs[0].url === savedURL) {
        return;
      }

      savedURL = tabs[0] ? tabs[0].url : "";
      hardRefreshesToDo = 5;
    });

    // The first refreshes don't always succeed, need to repeat for a while
    if (hardRefreshesToDo > 0) {
      hardRefreshesToDo--;
      backgroundPage.purgeCache();
      backgroundPage.refreshCurrentVideo(tabId, currentVideoLabel, currentTrackLabel, noTrackLabel);
      backgroundPage.refreshTracklist(tabId, tracklistTable);
    }

    backgroundPage.refreshCurrentTrack(tabId, currentVideoLabel, currentTrackLabel, noTrackLabel, tracklistTable, document);
    backgroundPage.refreshCurrentTime(tabId, currentTimeLabel);
    backgroundPage.refreshPaused(tabId, playOrPauseButton);
  }

  document.getElementById("playOrPauseButton").addEventListener("click", playOrPausePressed);
  document.getElementById("previousButton").addEventListener("click", previousPressed);
  document.getElementById("nextButton").addEventListener("click", nextPressed);
  document.getElementById("rewindButton").addEventListener("click", rewindPressed);
  document.getElementById("fastForwardButton").addEventListener("click", fastForwardPressed);
  document.getElementById("refreshButton").addEventListener("click", refreshPressed);

  function playOrPausePressed() {
    chrome.tabs.sendMessage(tabId, "playOrPause");
    refreshPopup()
  }
  function previousPressed() {
    chrome.tabs.sendMessage(tabId, "previous");
    refreshPopup()
  }
  function nextPressed() {
    chrome.tabs.sendMessage(tabId, "next");
    refreshPopup()
  }
  function rewindPressed() {
    chrome.tabs.sendMessage(tabId, "rewind");
    refreshPopup()
  }
  function fastForwardPressed() {
    chrome.tabs.sendMessage(tabId, "fastForward");
    refreshPopup()
  }
  function refreshPressed() {
    hardRefreshesToDo++;
    refreshPopup()
  }

  // Add click events to the tracklist
  tracklistTable.addEventListener("click", function (event) {
    var trElemement = event.target.parentElement;
    var trackIdx = Array.from(trElemement.parentElement.children).indexOf(trElemement);

    chrome.tabs.sendMessage(tabId, "goToTrack" + trackIdx);
  });
});
