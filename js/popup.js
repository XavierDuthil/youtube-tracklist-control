chrome.tabs.query({'active': true,'currentWindow': true}, function(tab){
  var config = {
    'refresh_time': 1000
  };
  var tabId = tab[0].id;
  var backgroundPage = chrome.extension.getBackgroundPage();
  reloadCurrentVideo();
  reloadCurrentTrack();
  startTicker();

  document.getElementById("playOrPauseButton").addEventListener("click", playOrPausePressed);
  document.getElementById("restartButton").addEventListener("click", restartPressed);
  document.getElementById("nextButton").addEventListener("click", nextPressed);

  function startTicker() {
    window.setInterval(function () {
      reloadCurrentVideo();
      reloadCurrentTrack();
    }, config["refresh_time"]);
  }

  function reloadCurrentVideo() {
    backgroundPage.reloadCurrentTrack(tabId, document.getElementById("currentVideoLabel"));
  }

  function reloadCurrentTrack() {
    backgroundPage.reloadCurrentTrack(tabId, document.getElementById("currentTrackLabel"));
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
