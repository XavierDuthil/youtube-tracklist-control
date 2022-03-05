var currentUrl, titleElement, videoElement, nextButtonElement, descriptionElement, tracklist;
var timestampRegex = /(\d+:)?(\d?\d):(\d\d)/;
var minimumTracklistSizeAccepted = 2;

/*
  TrackList is an ordered array, of the form: [
    {
      "startTime": 0,
      "title": "First track title",
      "duration": 263
    }, {
      "startTime": 162,
      "title": "Second track title",
      "duration": 189
    }
  ]
 */

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (!currentUrl || currentUrl !== location.href || !videoElement) {
    tracklist = [];
    getElements();
    currentUrl = location.href;
  }

  var args = message.split(':');
  var method = args[0];

  switch (method) {
    case "heartbeat":
      sendResponse(true);
      return;
    case "getCurrentVideoName":
      sendResponse(getCurrentVideoName());
      return;
    case "getCurrentTrackNum":
      sendResponse(getCurrentTrackNum());
      return;
    case "getCurrentTime":
      sendResponse(getCurrentTime());
      return;
    case "getPaused":
      sendResponse(getPaused());
      return;
    case "getTracklist":
      tracklist = buildTrackList();
      sendResponse(tracklist);
      return;
    case "playOrPause":
      playOrPause();
      return;
    case "previousTrack":
      previous();
      return;
    case "nextTrack":
      next();
      return;
    case "rewind":
      rewind();
      return;
    case "fastForward":
      fastForward();
      return;
    case "goToTrack":
      goToTrack(+args[1]);
      return;
    case "goToPercent":
      goToPercent(+args[1]);
      return;
  }
});

function getElements() {
  titleElement = document.querySelectorAll("h1.title.ytd-video-primary-info-renderer")[0];
  videoElement = document.getElementsByTagName("video")[0];
  nextButtonElement = document.getElementsByClassName("ytp-next-button")[0];
  descriptionElement = document.getElementById("description");
}

function getCurrentVideoName() {
  if (!titleElement) {
    getElements();
  }
  return titleElement.textContent || null;
}

function getPaused() {
  if (!videoElement) {
    getElements();
  }

  if (videoElement) {
    return videoElement.paused
  }
  return null;
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

function previous() {
  if (!videoElement) {
    getElements();
  }

  var currentTrackNum = getCurrentTrackNum();
  if (tracklist.length === 0 || currentTrackNum === 0) {
    videoElement.currentTime = 0;
    return;
  }

  goToTrack(currentTrackNum - 1);
}

function next() {
  if (!videoElement) {
    getElements();
  }

  var currentTrackNum = getCurrentTrackNum();
  if (tracklist.length === 0 || currentTrackNum === tracklist.length - 1) {
    nextButtonElement.click();
    return;
  }

  goToTrack(currentTrackNum + 1);
}

function goToTrack(trackIdx) {
  if (tracklist.length === 0) {
    tracklist = buildTrackList();
  }
  videoElement.currentTime = tracklist[trackIdx]["startTime"];
}

function goToPercent(percent) {
  var currentTrackNum = getCurrentTrackNum();
  var currentTrack = tracklist[currentTrackNum];
  videoElement.currentTime = currentTrack["startTime"] + currentTrack["duration"] * percent / 100;
}

function rewind() {
  if (!videoElement) {
    getElements();
  }

  videoElement.currentTime = videoElement.currentTime - 5;
}

function fastForward() {
  if (!videoElement) {
    getElements();
  }

  videoElement.currentTime = videoElement.currentTime + 5;
}

function getCurrentTime() {
  if (!videoElement) {
    getElements();
  }
  return videoElement.currentTime;
}

function getCurrentTrackNum() {
  if (!videoElement) {
    getElements();
  }
  if (tracklist.length === 0) {
    tracklist = buildTrackList();
    if (tracklist.length === 0) {
      return null;
    }
  }

  var currentTime = getCurrentTime();
  var currentTrackNum = 0;

  for (var trackNum in tracklist) {
    var trackStartTime = parseInt(tracklist[trackNum]["startTime"]);
    if (trackStartTime > currentTime) {
      break;
    }
    currentTrackNum = trackNum;
  }
  return parseInt(currentTrackNum);
}

function buildTrackList() {
  if (!descriptionElement) {
    getElements();
  }

  // Try building tracklist from description
  var tracklist = tryBuildingTracklistFrom(descriptionElement);
  if (tracklist.length >= minimumTracklistSizeAccepted) {
    return tracklist;
  }

  // No tracklist found in description: search in comments
  var commentElements = document.querySelectorAll('yt-formatted-string.ytd-comment-renderer#content-text');
  for (var idx in commentElements) {
    var commentElement = commentElements[idx];
    tracklist = tryBuildingTracklistFrom(commentElement);
    if (tracklist.length >= minimumTracklistSizeAccepted) {
      return tracklist;
    }
  }

  // No tracklist found
  return [];
}

function tryBuildingTracklistFrom(htmlElement) {
  var tracklist = [];
  if (!htmlElement || !htmlElement.textContent) {
    return tracklist;
  }

  var descriptionStr = htmlElement.textContent;
  var descriptionLines = descriptionStr.split("\n");

  for (var lineNum in descriptionLines) {
    var line = descriptionLines[lineNum];
    var regexResult = line.match(timestampRegex);
    if (!regexResult) {
      continue
    }

    var timestamp = regexResult[0];
    var trackTitle = extractTrackTitle(line, timestamp);

    var startTime = parseTime(regexResult[1], regexResult[2], regexResult[3]);
    tracklist.push({"startTime": startTime, "title": trackTitle});
  }

  if (tracklist.length === 0) {
    return tracklist
  }

  tracklist = cleanTracklistTitles(tracklist);
  tracklist = sort(tracklist);
  tracklist = addDurationsToTracklist(tracklist);
  return tracklist;
}

function sort(tracklist) {
  return tracklist.sort(function (a, b) {
    return a["startTime"] - b["startTime"];
  });
}

function addDurationsToTracklist(tracklist) {
  if (tracklist.length === 0)
    return tracklist;

  if (!videoElement) {
    getElements();
  }

  for (var trackIdx = 0; trackIdx < tracklist.length - 1; trackIdx++) {
    tracklist[trackIdx]["duration"] = tracklist[trackIdx+1]["startTime"] - tracklist[trackIdx]["startTime"];
  }
  tracklist[tracklist.length - 1]["duration"] = videoElement.duration - tracklist[tracklist.length - 1]["startTime"];
  return tracklist;
}

function extractTrackTitle(descriptionLine, timestamp) {
  return descriptionLine.replace(timestamp, "").trim();
}

function cleanTracklistTitles(tracklist) {
  tracklist = trimCommonPreSuffixes(tracklist);
  return tracklist;
}

// Find and remove the prefix and suffix that are common to every track titles
function trimCommonPreSuffixes(tracklist) {
  if (!tracklist || tracklist.length === 0) {
    return tracklist;
  }
  var firstTrackTitle = tracklist[0]["title"];

  // Find the prefix that is common to every titles:
  var commonPrefix = "";
  for (var charIdx = 1; charIdx < firstTrackTitle.length; charIdx++) {
    var testedPrefix = firstTrackTitle.substring(0, charIdx);

    // Prefix to remove has to be made of special chars only
    if (testedPrefix[0].match(/[a-zA-Z0-9]/)) {
      break
    }

    // Determine if this new prefix is common to all titles
    var prefixIsCommon = true;
    for (var i in tracklist) {
      if (!tracklist[i]["title"].startsWith(testedPrefix)) {
        prefixIsCommon = false;
        break
      }
    }

    if (!prefixIsCommon) {
      break
    }
    commonPrefix = testedPrefix;
  }

  // Trim this common prefix
  if (commonPrefix !== "") {
    for (i in tracklist) {
      tracklist[i]["title"] = tracklist[i]["title"].substring(commonPrefix.length)
    }
  }

  // Find the suffix that is common to every titles:
  var commonSuffix = "";
  for (charIdx = 1; charIdx < firstTrackTitle.length; charIdx++) {
    var testedSuffix = firstTrackTitle.substr(-charIdx);

    // Suffix to remove has to be made of special chars only
    if (testedSuffix[testedSuffix.length - 1].match(/[a-zA-Z0-9]/) !== null) {
      break
    }

    var suffixIsCommon = true;
    for (i in tracklist) {
      if (!tracklist[i]["title"].endsWith(testedSuffix)) {
        suffixIsCommon = false;
        break
      }
    }

    if (!suffixIsCommon) {
      break
    }
    commonSuffix = testedSuffix;
  }

  // Trim this common suffix
  if (commonSuffix !== "") {
    for (i in tracklist) {
      tracklist[i]["title"] = tracklist[i]["title"].substring(0, tracklist[i]["title"].length - commonSuffix.length)
    }
  }

  return tracklist
}

function parseTime(hours, minutes, seconds) {
  hours = parseInt(hours) || 0;
  minutes = parseInt(minutes) || 0;
  seconds = parseInt(seconds) || 0;
  return hours * 3600 + minutes * 60 + seconds;
}

function isEmpty(dict) {
  return Object.keys(dict).length === 0;
}
