var currentUrl, titleElement, videoElement, nextButtonElement, descriptionElement, trackList;
var timestampRegex = /(\d+:)?(\d?\d):(\d\d)/;

/*
  TrackList an ordered array, of the form: [
    {
      "startTime": 0,
      "title": "First track title",
    }, {
      "startTime": 162,
      "title": "Second track title",
    }
  ]
 */

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (!currentUrl || currentUrl !== location.href) {
    trackList = [];
    getElements();
    currentUrl = location.href;
  }

  switch (message) {
    case "getCurrentVideo":
      sendResponse(getCurrentVideo());
      break;
    case "getCurrentTrack":
      if (trackList.length === 0) {
        sendResponse("");
      }
      var currentTrack = getCurrentTrack();
      sendResponse(currentTrack ? currentTrack["title"] : "");
      break;
    case "getCurrentTime":
      sendResponse(getCurrentTime());
      break;
    case "getPaused":
      sendResponse(getPaused());
      break;
    case "playOrPause":
      playOrPause();
      break;
    case "previous":
      previous();
      break;
    case "next":
      next();
      break;
    case "rewind":
      rewind();
      break;
    case "fastForward":
      fastForward();
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

function getPaused() {
  if (!videoElement) {
    getElements();
  }

  if (videoElement) {
    return videoElement.paused
  }
  return null;
}

function previous() {
  if (!videoElement) {
    getElements();
  }

  var currentTrackNum = getCurrentTrackNum();
  if (trackList.length === 0 || currentTrackNum === 0) {
    videoElement.currentTime = 0;
    return;
  }

  videoElement.currentTime = trackList[currentTrackNum - 1]["startTime"];
}

function next() {
  if (!videoElement) {
    getElements();
  }

  var currentTrackNum = getCurrentTrackNum();
  if (trackList.length === 0 || currentTrackNum === trackList.length - 1) {
    nextButtonElement.click();
    return;
  }

  videoElement.currentTime = trackList[currentTrackNum + 1]["startTime"];
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

  var currentTrackNum = getCurrentTrackNum();
  if (trackList.length === 0 || currentTrackNum === trackList.length - 1) {
    nextButtonElement.click();
    return;
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
  if (trackList.length === 0) {
    getElements();
    trackList = buildTrackList();
  }

  var currentTime = getCurrentTime();
  var currentTrackNum = 0;

  for (var trackNum in trackList) {
    var trackStartTime = parseInt(trackList[trackNum]["startTime"]);
    if (trackStartTime > currentTime) {
      break;
    }
    currentTrackNum = trackNum;
  }
  return parseInt(currentTrackNum);
}

function getCurrentTrack() {
  return trackList[getCurrentTrackNum()];
}

function buildTrackList() {
  if (!descriptionElement) {
    getElements();
  }
  var trackList = [];
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

    var startTime = parseTime(regexResult[1], regexResult[2], regexResult[3]);
    trackList.push({"startTime": startTime, "title": trackTitle});
  }

  if (trackList.length === 0) {
    return []
  }

  trackList = cleanTracklistTitles(trackList);
  return sort(trackList);
}

function sort(trackList) {
  return trackList.sort(function (a, b) {
    return a["startTime"] - b["startTime"];
  });
}

function extractTrackTitle(descriptionLine, timestamp) {
  return descriptionLine.replace(timestamp, "").trim();
}

function cleanTracklistTitles(trackList) {
  trackList = trimCommonPreSuffixes(trackList);
  return trackList;
}

// Find and remove the prefix and suffix that are common to every track titles
function trimCommonPreSuffixes(trackList) {
  if (!trackList || trackList.length < 1) {
    return trackList;
  }
  var firstTrackTitle = trackList[0]["title"];

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
    for (var i in trackList) {
      if (!trackList[i]["title"].startsWith(testedPrefix)) {
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
    for (i in trackList) {
      trackList[i]["title"] = trackList[i]["title"].substring(commonPrefix.length)
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
    for (i in trackList) {
      if (!trackList[i]["title"].endsWith(testedSuffix)) {
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
    for (i in trackList) {
      trackList[i]["title"] = trackList[i]["title"].substring(0, trackList[i]["title"].length - commonSuffix.length)
    }
  }

  return trackList
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