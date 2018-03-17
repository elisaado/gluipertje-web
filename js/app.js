let gluipertje = new Gluipertje("https://gluipertje.elisaado.com", 443);

let app = new Vue({
  el: '#app',
  data: {
    user: {},
    messages: []
  }
});

// Checks if an item exists in the local storage
function checkForItemInStorage(item) {
  if (typeof(Storage) === "undefined") {
    return false;
  }
  if (!localStorage.getItem(item)) {
    return false;
  }
  return true;
}

// Gets the user from the storage by its token
function getUserFromStorage() {
  if (!checkForItemInStorage("token")) {
    return undefined;
  }
  return gluipertje.user.byToken(getItem("token"));
}

// Sends a message but checks a lot of stuff first :D
function sendMessage() {
  user = getUserFromStorage();
  if (!user) {
    $("#loginModal").modal();
  }
  return false;
}

function checkVisible(elm) {
  var rect = elm.getBoundingClientRect();
  var viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
  return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
}

function refreshMessages() {
  console.log("Fetching messages...");
  let messages = [];

  gluipertje.message.all()
    .then(function(rawMessages) {
      for (let rawMessage of rawMessages) {
        messages.push(`<div class="card mx-auto"><div class="card-body text-left"><h5 class="card-title">${rawMessage.from.nickname}</h5><h6 class="card-subtitle mb-2 text-muted">(@${rawMessage.from.username})</h6><br><p class="card-text">${rawMessage.body}</p></div></div><br>`);
      }

      // Check if there are new messages
      if (messages.length != app.messages.length) {
        messages.reverse();
        app.messages = messages;

        // Check if the user is already at the bottom of the page so that if they are reading older messages it doesn't scroll down when a new message appears
        if (checkVisible(document.getElementById("footer"))) {
          $("html, body").animate({
            scrollTop: $(document).height() * 10
          }, 2000);
        }
      }
    });
}

$(document).ready(function() {
  user = getUserFromStorage();
  if (!user) {
    $("#userDropdown, #userDropdownItems").hide();
    $("#loginModal").modal();
    $("#messageInput, #messageButton").prop("disabled", true);
    setInterval(refreshMessages, 2000);
  } else {
    $("#messageButton").click(sendMessage);
    app.user = user;
    setInterval(refreshMessages, 1000);
  }
});