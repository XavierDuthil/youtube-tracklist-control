chrome.tabs.query({'active': true,'currentWindow': true}, function(tab){
  // Lower refresh period offers better reactivity when opening the Popup
  var config = {
    'initial_refresh_period': 50,
    'normal_refresh_period': 500
  };
  var currentTab = tab[0];
  var backgroundPage = chrome.extension.getBackgroundPage();
  var hardRefreshesToDo = 1;

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
  var refreshButton = document.getElementById("refreshButton");

  function refreshPopup() {
    if (!currentVideoLabel) {
      return;
    }

    if (backgroundPage.trackedTabId && backgroundPage.trackedTabId !== undefined) {
      // Update refresh button visual state
      if (backgroundPage.trackedTabId === currentTab.id) {
        refreshButton.className = "buttonActive"
      } else {
        refreshButton.className = ""
      }

      chrome.tabs.get(backgroundPage.trackedTabId, function (trackedTab) {
        // Don't hard refresh the tracklist if the tracked tab is still on the same URL
        if (trackedTab.url === backgroundPage.trackedTabUrl) {
          return;
        }

        // If the tracked tab has been closed, set the current one as tracked
        if (trackedTab === undefined) {
          backgroundPage.setTrackedTab(currentTab)
        }

        hardRefreshesToDo = 5;
      });
    }

    if (!backgroundPage.trackedTabId) {
      backgroundPage.setTrackedTab(currentTab)
    }

    // The first refreshes don't always succeed, need to repeat for a while
    if (hardRefreshesToDo > 0) {
      hardRefreshesToDo--;
      backgroundPage.purgeCache();
      backgroundPage.refreshCurrentVideo(currentVideoLabel, currentTrackLabel, noTrackLabel);
      backgroundPage.refreshTracklist(tracklistTable);
    }

    backgroundPage.refreshCurrentTrack(currentVideoLabel, currentTrackLabel, noTrackLabel, tracklistTable, document);
    backgroundPage.refreshCurrentTime(currentTimeLabel);
    backgroundPage.refreshPaused(playOrPauseButton);
  }

  // Add click events to the media buttons
  document.getElementById("playOrPauseButton").addEventListener("click", function () {
    backgroundPage.playOrPause();
    refreshPopup()
  });
  document.getElementById("previousButton").addEventListener("click", function () {
    backgroundPage.previousTrack();
    refreshPopup()
  });
  document.getElementById("nextButton").addEventListener("click", function () {
    backgroundPage.nextTrack();
    refreshPopup()
  });
  document.getElementById("rewindButton").addEventListener("click", function () {
    backgroundPage.rewind();
    refreshPopup()
  });
  document.getElementById("fastForwardButton").addEventListener("click", function () {
    backgroundPage.fastForward();
    refreshPopup();
  });

  // Add click event to the refresh button
  refreshButton.addEventListener("click",  function () {
    // Inject script if no response is received
    chrome.tabs.sendMessage(currentTab.id, "getCurrentVideo", function (response) {
      if (response === undefined) {
        backgroundPage.injectIntoTab(tab)
      }
    });
    backgroundPage.setTrackedTab(currentTab);
    refreshButton.className = "buttonActive";
    hardRefreshesToDo++;
    refreshPopup();
  });

  // Add click events to the tracklist
  tracklistTable.addEventListener("click", function (event) {
    var trElemement = event.target.parentElement;
    var trackIdx = Array.from(trElemement.parentElement.children).indexOf(trElemement);

    backgroundPage.goToTrack(trackIdx);
    refreshPopup();
  });
});
