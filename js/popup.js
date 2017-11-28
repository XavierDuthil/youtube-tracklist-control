chrome.tabs.query({'active': true,'currentWindow': true}, function(tab){
  var config = {
    'refresh_time': 1000
  };
  var tabId = tab[0].id;
  var backgroundPage = chrome.extension.getBackgroundPage();
  refreshPopup();
  startTicker();

  document.getElementById("playOrPauseButton").addEventListener("click", playOrPausePressed);
  document.getElementById("previousButton").addEventListener("click", previousPressed);
  document.getElementById("nextButton").addEventListener("click", nextPressed);

  function startTicker() {
    window.setInterval(function () {
      refreshPopup();
    }, config["refresh_time"]);
  }

  function refreshPopup() {
    backgroundPage.refreshCurrentVideo(tabId, document.getElementById("currentVideoLabel"));
    backgroundPage.refreshCurrentTrack(tabId, document.getElementById("currentTrackLabel"));
    backgroundPage.refreshCurrentTime(tabId, document.getElementById("currentTimeLabel"));
  }

  function playOrPausePressed() {
    chrome.tabs.sendMessage(tabId, "playOrPause")
  }
  function previousPressed() {
    chrome.tabs.sendMessage(tabId, "previous")
  }
  function nextPressed() {
    chrome.tabs.sendMessage(tabId, "next")
  }
});
