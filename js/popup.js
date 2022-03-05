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

chrome.tabs.query({'active': true,'currentWindow': true}, function(tabs) {
  secondaryPopupLabel = document.getElementById("secondaryPopupLabel");
  mainPopupLabel = document.getElementById("mainPopupLabel");
  noTrackLabel = document.getElementById("noTrackLabel");
  currentTimeLabel = document.getElementById("currentTimeLabel");
  playOrPauseButton = document.getElementById("playOrPauseButton");
  tracklistTable = document.getElementById("tracklistTable");
  refreshButton = document.getElementById("refreshButton");

  // On popup opening, reset the tracked tab if not a Youtube video
  if (!backgroundPage.currentVideoNameCache) {
    backgroundPage.trackedTabId = null;
  }

  var currentTab = tabs[0];
  startRefreshTicker(currentTab);
  addEvents(currentTab);
});

function startRefreshTicker(currentTab) {
  refreshPopup(currentTab);

  // Refresh rapidly on popup opening, then slow down to normal refresh rate
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

  if (backgroundPage.trackedTabId) {
    // Update refresh button visual state
    if (backgroundPage.trackedTabId === currentTab.id) {
      refreshButton.className = "buttonActive"
    } else {
      refreshButton.className = ""
    }

    chrome.tabs.get(backgroundPage.trackedTabId, function (trackedTab) {
      chrome.runtime.lastError; // Silence the error by accessing the variable

      // If the tracked tab has been closed, notify background
      if (trackedTab === undefined) {
        backgroundPage.setTrackedTab(null);
        return;
      }

      // If the tracked tab has changed URL, hard refresh
      if (trackedTab.url !== backgroundPage.trackedTabUrl) {
        backgroundPage.setTrackedTab(trackedTab);
        hardRefreshesToDo = 3;
      }
    });
  }

  // No tracked tab => track this one
  if (!backgroundPage.trackedTabId) {
    backgroundPage.trackLastYoutubeTabOrThisOne(currentTab);
    hardRefreshesToDo = 3;
  }

  // The first refreshes don't always succeed (due to page loading time), need to repeat for a while
  if (hardRefreshesToDo > 0) {
    hardRefreshesToDo--;
    backgroundPage.hardRefresh(mainPopupLabel, secondaryPopupLabel, noTrackLabel, tracklistTable, currentTimeLabel, playOrPauseButton);
  } else {
    backgroundPage.softRefresh(mainPopupLabel, secondaryPopupLabel, noTrackLabel, tracklistTable, currentTimeLabel, playOrPauseButton);
  }
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

    // Go to position when progressBar is clicked
    if (clickedTrElement.className === "progressBar") {
      backgroundPage.goToPercent(Math.round(event.offsetX / clickedTrElement.offsetWidth * 100));
      refreshPopup(currentTab);
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

      if (trElement.className !== "progressBar" && trElement.className !== "progressBarHidden") {
        trackIdx++;
      }
    }

    backgroundPage.goToTrack(trackIdx);
    refreshPopup(currentTab);
  });
}
