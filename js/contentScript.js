var currentUrl, titleElement, videoElement, nextButtonElement, descriptionElement, trackList;
var timestampRegex = /(\d+:)?(\d\d):(\d\d)/;
var otherTimestampRegex = /\s*\W{1,2}\s*(\d+:)?\d\d:\d\d/;

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (!currentUrl || currentUrl !== location.href) {
    trackList = {};
    getElements();
    currentUrl = location.href;
  }

  switch (message) {
    case "getCurrentVideo":
      sendResponse(getCurrentVideo());
      break;
    case "getCurrentTrack":
      sendResponse(getCurrentTrack());
      break;
    case "getCurrentTime":
      sendResponse(getCurrentTime());
      break;
    case "playOrPause":
      playOrPause();
      break;
    case "restart":
      restart();
      break;
    case "previous":
      previousVideo();
      break;
    case "next":
      nextVideo();
      break;
  }
});

function getElements() {
  titleElement = document.querySelectorAll("h1.title")[0];
  videoElement = document.getElementsByTagName("video")[0];
  nextButtonElement = document.getElementsByClassName("ytp-next-button")[0];
  descriptionElement = document.getElementById("description");
}

function getCurrentVideo() {
  if (!titleElement) {
    getElements();
  }
	return titleElement.textContent;
}

function getCurrentTrack() {
  if (!titleElement) {
    getElements();
  }
	return titleElement.textContent;
}

function playOrPause() {
  if (!videoElement) {
    getElements();
  }

  if (videoElement) {
    if (videoElement.paused) {
      videoElement.play();
    } else {
      videoElement.pause();
    }
  }
}

function restart() {
  console.log(isEmpty(trackList))
  if (isEmpty(trackList)) {
    videoElement.currentTime = 0;
  } else {
    // TODO
  }
}

function nextVideo() {
  if (!videoElement) {
    getElements();
  }
  nextButtonElement.click();
}

function getCurrentTime() {
  if (!videoElement) {
    getElements();
  }
  return videoElement.currentTime;
}

function getCurrentTrack() {
  if (!videoElement) {
    getElements();
  }
  if (!trackList || isEmpty(trackList)) {
    getElements();
    trackList = buildTrackList();
  }

  var currentTime = getCurrentTime();
  var trackTitle = "";
  for (var trackStartTime in trackList) {
    if (trackStartTime > currentTime) {
      break;
    }
    trackTitle = trackList[trackStartTime];
  }
  return trackTitle;
}

function buildTrackList() {
  if (!descriptionElement) {
    getElements();
  }
  var trackList = {};
  var descriptionStr = descriptionElement.textContent;
  var descriptionLines = descriptionStr.split("\n");

  for (var lineNum in descriptionLines) {
    var line = descriptionLines[lineNum];
    var regexResult = line.match(timestampRegex);
    if (!regexResult) {
      continue
    }

    var timestamp = regexResult[0];
    var trackTitle = extractTrackTitle(line, timestamp);

    var time = parseTime(regexResult[1], regexResult[2], regexResult[3]);
    trackList[time] = trackTitle;
  }

  trackList = cleanTracklistTitles(trackList);

  return trackList;
}

function extractTrackTitle(descriptionLine, timestamp) {
  var trackTitle = descriptionLine.replace(timestamp, "").trim();

  // Trim prefix
  if (trackTitle.search(otherTimestampRegex) === 0) {
    trackTitle = trackTitle.replace(otherTimestampRegex, "");
  }

  // Trim suffix
  // TODO: Check if at the end of the string
  // trackTitle = trackTitle.replace(otherTimestampRegex, "");
  return trackTitle;
}

function cleanTracklistTitles(tracklist) {
  // TODO
  // tracklist = trimCommonPreSuffixes();
  return tracklist;
}

// function trimCommonPreSuffixes(tracklist) {
//
// }

function parseTime(hours, minutes, seconds) {
  hours = parseInt(hours) || 0;
  minutes = parseInt(minutes) || 0;
  seconds = parseInt(seconds) || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function isEmpty(dict) {
  return Object.keys(dict).length === 0;
}