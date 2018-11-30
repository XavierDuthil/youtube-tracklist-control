// Lower refresh period offers better reactivity when opening the Popup
var config = {
  'initial_refresh_period': 50,
  'normal_refresh_period': 500
};
var backgroundPage = chrome.extension.getBackgroundPage();
var hardRefreshesToDo = 1;

var secondaryPopupLabel;
var mainPopupLabel;
var noTrackLabel;
var currentTimeLabel;
var playOrPauseButton;
var tracklistTable;
var refreshButton;

chrome.tabs.query({'active': true,'currentWindow': true}, function(tabs){
  secondaryPopupLabel = document.getElementById("secondaryPopupLabel");
  mainPopupLabel = document.getElementById("mainPopupLabel");
  noTrackLabel = document.getElementById("noTrackLabel");
  currentTimeLabel = document.getElementById("currentTimeLabel");
  playOrPauseButton = document.getElementById("playOrPauseButton");
  tracklistTable = document.getElementById("tracklistTable");
  refreshButton = document.getElementById("refreshButton");

  var currentTab = tabs[0];
  hardRefreshesToDo = 1;

  startRefreshTicker(currentTab);
  addEvents(currentTab);
});

function startRefreshTicker(currentTab) {
  refreshPopup(currentTab);

  window.setTimeout(function () {
    refreshPopup(currentTab);
  }, config["initial_refresh_period"]);
  window.setTimeout(function () {
    refreshPopup(currentTab);
  }, config["initial_refresh_period"] * 2);
  window.setTimeout(function () {
    refreshPopup(currentTab);
  }, config["initial_refresh_period"] * 4);
  window.setInterval(function () {
    refreshPopup(currentTab);
  }, config["normal_refresh_period"]);
}

function refreshPopup(currentTab) {
  if (!secondaryPopupLabel) {
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
      } else {
        backgroundPage.setTrackedTab(trackedTab)
      }

      hardRefreshesToDo = 3;
    });
  }

  if (!backgroundPage.trackedTabId) {
    backgroundPage.setTrackedTab(currentTab)
  }

  // The first refreshes don't always succeed, need to repeat for a while
  if (hardRefreshesToDo > 0) {
    hardRefreshesToDo--;
    backgroundPage.purgeCache();
    backgroundPage.refreshCurrentVideo(mainPopupLabel, secondaryPopupLabel, noTrackLabel, tracklistTable); // FIXME: Include into refreshCurrentTrack?
    backgroundPage.refreshTracklist(tracklistTable);
  }

  // FIXME: Need to give currentVideoName, or it must retrieve it from cache
  backgroundPage.refreshCurrentTrack(mainPopupLabel, secondaryPopupLabel, noTrackLabel, tracklistTable);
  backgroundPage.refreshCurrentTime(currentTimeLabel);
  backgroundPage.refreshPaused(playOrPauseButton);
}

function addEvents(currentTab) {
  // Add click events to the media buttons
  document.getElementById("playOrPauseButton").addEventListener("click", function () {
    backgroundPage.playOrPause();
    refreshPopup(currentTab)
  });
  document.getElementById("previousButton").addEventListener("click", function () {
    backgroundPage.previousTrack();
    refreshPopup(currentTab)
  });
  document.getElementById("nextButton").addEventListener("click", function () {
    backgroundPage.nextTrack();
    refreshPopup(currentTab)
  });
  document.getElementById("rewindButton").addEventListener("click", function () {
    backgroundPage.rewind();
    refreshPopup(currentTab)
  });
  document.getElementById("fastForwardButton").addEventListener("click", function () {
    backgroundPage.fastForward();
    refreshPopup(currentTab);
  });

  // Add click event to the refresh button
  refreshButton.addEventListener("click",  function () {
    // Inject script if no response is received
    chrome.tabs.sendMessage(currentTab.id, "heartbeat", function (response) {
      if (!response) {
        backgroundPage.injectIntoTab(currentTab);
      }
    });
    backgroundPage.setTrackedTab(currentTab);
    refreshButton.className = "buttonActive";
    hardRefreshesToDo++;
    refreshPopup(currentTab);
  });

  // Add click event to the settings button
  document.getElementById('settingsButton').addEventListener("click",  function () {
    chrome.tabs.create({url: 'chrome://extensions/configureCommands'});
  });

  // Add click events to the tracklist
  tracklistTable.addEventListener("click", function (event) {
    var clickedTrElement = event.target.parentElement;

    // Do nothing when progressBar is clicked
    if (clickedTrElement.className === "progressBar") {
      return;
    }

    // Find the clicked track index
    var trackIdx = 0;
    var trElements = Array.from(clickedTrElement.parentElement.children);
    for (var trElementIdx in trElements) {
      var trElement = trElements[trElementIdx];
      if (trElement === clickedTrElement) {
        break;
      }

      if (trElement.className !== "progressBar") {
        trackIdx++;
      }
    }

    backgroundPage.goToTrack(trackIdx);
    refreshPopup(currentTab);
  });
}