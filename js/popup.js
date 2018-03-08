chrome.tabs.query({'active': true,'currentWindow': true}, function(tab){
  var config = {
    'refresh_time': 200
  };
  var tabId = tab[0].id;
  var backgroundPage = chrome.extension.getBackgroundPage();
  var savedURL;
  var currentURL;

  chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
    if (savedURL && tabs.length)
      savedURL = tabs[0].url;
  });

  refreshPopup();
  startTicker();

  // TODO: Fix no video detected on extension installation
  function startTicker() {
    window.setInterval(function () {
      refreshPopup();
    }, config["refresh_time"]);
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
    chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
      if (tabs[0] && tabs[0].url === savedURL) {
        return;
      }

      savedURL = tabs[0] ? tabs[0].url : "";
      backgroundPage.purgeCache();
      backgroundPage.refreshTracklist(tabId, tracklistTable);
    });

    backgroundPage.refreshLabels(tabId, currentVideoLabel, currentTrackLabel, noTrackLabel);
    backgroundPage.refreshCurrentTime(tabId, currentTimeLabel);
    backgroundPage.refreshPaused(tabId, playOrPauseButton);
  }

  document.getElementById("playOrPauseButton").addEventListener("click", playOrPausePressed);
  document.getElementById("previousButton").addEventListener("click", previousPressed);
  document.getElementById("nextButton").addEventListener("click", nextPressed);
  document.getElementById("rewindButton").addEventListener("click", rewindPressed);
  document.getElementById("fastForwardButton").addEventListener("click", fastForwardPressed);

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
});
