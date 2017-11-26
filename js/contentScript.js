var currentUrl, titleElement, videoElement, nextButtonElement;

function getElements() {
  titleElement = document.querySelectorAll("h1.title")[0];
  videoElement = document.getElementsByTagName("video")[0];
  nextButtonElement = document.getElementsByClassName("ytp-next-button")[0];
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

function nextVideo() {
  if (!videoElement) {
    getElements();
  }
  nextButtonElement.click();
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (!currentUrl || currentUrl !== location.href) {
    getElements();
    currentUrl = location.href;
  }

  switch (message) {
    case "getCurrentVideo":
      sendResponse(getCurrentVideo());
      break;
    case "getCurrentTrack":
      sendResponse(getCurrentVideo());
      break;
    case "playOrPause":
      playOrPause();
      break;
    case "previous":
      previousVideo();
      break;
    case "next":
      nextVideo();
      break;
  }
});