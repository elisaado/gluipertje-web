let gluipertje = new Gluipertje("https://gluipertje.elisaado.com", 443);

let app = new Vue({
  el: '#app',
  data: {
    user: {},
    messages: []
  }
});

// Make login submit on enter
$('#password').keypress(function(e) {
  if (e.which == 13) {
    $(this).blur();
    $('#submitLogin').focus().click();
  }
});
$('#username').keypress(function(e) {
  if (e.which == 13) {
    $(this).blur();
    $('#submitLogin').focus().click();
  }
});

// Make message send box submit on enter
$('#messageInput').keypress(function(e) {
  if (e.which == 13) {
    $(this).blur();
    $('#messageButton').focus().click();
  }
});

// fetch messages interval so I can later clear it again
let refreshMessagesInterval;

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

// "Logs in"
function login() {
  gluipertje.user.revokeToken($("#username").val(), $("#password").val())
    .then(function(token) {
      gluipertje.user.byToken(token)
        .then(function(user) {
          if (!user.id) {
            return false;
          }
          app.user = user;
          localStorage.setItem("token", token);
          $("#userDropdown, #userDropdownItems").show();
          $("#messageInput, #messageButton").prop("disabled", false);
          clearInterval(refreshMessagesInterval);
          refreshMessagesInterval = setInterval(refreshMessages, 1000);
          $("#loginModal").modal("hide");
        });
    });
  return false;
}

// THIS ugly son of a bitch LOGS OUT and basically you are a fucking idiot, how? ...Just watch The free video
function logOut() {
  localStorage.clear();
  window.location.href = "http://gluipertje.ga";
}

// Sends a message but checks a lot of stuff first :D
function sendMessage() {
  if (app.user.id == 0 || !localStorage.getItem("token")) {
    return false;
  }
  gluipertje.message.send(localStorage.getItem("token"), $("#messageInput").val());
  return false;
}

function checkVisible(elm) {
  var rect = elm.getBoundingClientRect();
  var viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
  return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
}

// Escapes html (thanks bjornd from SO)
function escapeHtml(html) {
  return html.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function refreshMessages() {
  console.log("Fetching messages...");
  let messages = [];

  gluipertje.message.all()
    .then(function(rawMessages) {
      for (let rawMessage of rawMessages) {
        messages.push(`<div class="card mx-4"><div class="card-body text-left"><h5 class="card-title">${escapeHtml(rawMessage.from.nickname)}</h5><h6 class="card-subtitle mb-2 text-muted">(@${escapeHtml(rawMessage.from.username)})</h6><br><p class="card-text">${escapeHtml(rawMessage.body)}</p></div></div><br>`);
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
  let token = localStorage.getItem("token");

  if (!token) {
    $("#userDropdown, #userDropdownItems").hide();
    $("#loginModal").modal();
    $("#messageInput, #messageButton").prop("disabled", true);
    refreshMessagesInterval = setInterval(refreshMessages, 2000);
  } else {
    $("#messageButton").click(sendMessage);
    gluipertje.user.byToken(token)
      .then(function(user) {
        if (user.id) {
          app.user = user;
          refreshMessagesInterval = setInterval(refreshMessages, 1000);
        } else {
          $("#userDropdown, #userDropdownItems").hide();
          $("#loginModal").modal();
          $("#messageInput, #messageButton").prop("disabled", true);
          refreshMessagesInterval = setInterval(refreshMessages, 2000);
        }
      });
  }
});