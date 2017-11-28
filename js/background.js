function reloadCurrentTrack(tabId, currentTrackElement) {
  chrome.tabs.sendMessage(tabId, "getCurrentTrack", function (response) {
    if (response) {
      currentTrackElement.textContent = response;
      currentTrackElement.display = "Block";
    } else {
      currentTrackElement.display = "None";
    }
  });
}

// var views = chrome.extension.getViews({
//   type: "popup"
// });
// for (var i = 0; i < views.length; i++) {
//   var config = {
//     'refresh_time': 1000
//   };
//
//   var currentTrack = {
//     init: function () {
//       this.startTicker();
//     },
//
//     startTicker: function () {
//       var self = this;
//       this.globalIntervalId = window.setInterval(function () {
//         self.reloadCurrentVideo();
//       }, config["refresh_time"]);
//     },
//
//     reloadCurrentVideo: function () {
//       chrome.tabs.sendMessage(tab[0].id, "getCurrentVideo", function (response) {
//         var currentVideoElement = document.getElementById("currentTrack");
//         if (response) {
//           currentVideoElement.textContent = response;
//         } else {
//           currentVideoElement.textContent = "Current video";
//         }
//       });
//     }
//   }.init();
// }