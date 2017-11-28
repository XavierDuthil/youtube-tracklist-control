chrome.tabs.query({'active': true,'currentWindow': true}, function(tab){
  var config = {
    'refresh_time': 1000
  };
  var tabId = tab[0].id;
  var backgroundPage = chrome.extension.getBackgroundPage();
  refreshPopup();
  startTicker();

  document.getElementById("playOrPauseButton").addEventListener("click", playOrPausePressed);
  document.getElementById("restartButton").addEventListener("click", restartPressed);
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
  function restartPressed() {
    chrome.tabs.sendMessage(tabId, "restart")
  }
  function nextPressed() {
    chrome.tabs.sendMessage(tabId, "next")
  }
});
