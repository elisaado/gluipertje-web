let gluipertje = new Gluipertje("https://gluipertje.elisaado.com", 443);
// let gluipertje = new Gluipertje("http://0.0.0.0", 8000); // Test server

function checkVisible(elm) {
  var rect = elm.getBoundingClientRect();
  var viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
  return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
}

function scrollDownButtonVisible() {
  console.log("fired");

  if (checkVisible(document.getElementById("footer"))) {
    $("#scrollDownButton").hide(200);
  } else {
    $("#scrollDownButton").show(200);
  }
}

let app = new Vue({
  el: '#app',
  data: {
    user: {},
    messages: []
  },
  mounted() {
    $(window).scroll(
      scrollDownButtonVisible
    );
  }
});

// Make login submit on enter
$('#loginPassword').keypress(function(e) {
  if (e.which == 13) {
    $(this).blur();
    $('#submitLogin').focus().click();
  }
});
$('#loginUsername').keypress(function(e) {
  if (e.which == 13) {
    $(this).blur();
    $('#submitLogin').focus().click();
  }
});


var keys = {};

// Make message send box submit on enter but not on shift enter
$("#messageInput").keydown(function(e) {
  keys[e.which] = true;
  if (keys[13] && !keys[16]) {
    $(this).blur();
    $('#messageButton').focus().click();
    return false;
  }
  return true;
});
$("#messageInput").keyup(function(e) {
  delete keys[e.which];
  return true;
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

// Checks if a username is available
function checkUsername() {
  $("#alert").show();
  $("#alert").removeClass("alert-success").removeClass("alert-danger");
  console.log("checking");
  if ($("#registerUsername").val().length < 3) {
    $("#alertText").html("This username is too short");
    $("#alert").addClass("alert-danger").alert();
    return;
  }

  gluipertje.user.all()
    .then(function(users) {
      let a = true;
      console.log(users);
      for (let user of users) {
        if (user.username == $("#registerUsername").val()) {
          a = false;
        }
      }

      if (a) {
        $("#alertText").html("This username is available");
        $("#alert").addClass("alert-success");
      } else {
        $("#alertText").html("This username is not available");
        $("#alert").addClass("alert-danger");
      }
      $("#alert").alert();
    });
}

// Hey, did you know this function CAN MAKE AN ACCOUNT FOR YOU?
// I'm sorry idk what to comment
function register() {
  checkUsername();

  gluipertje.user.create($("#registerNickname").val(), $("#registerUsername").val(), $("#registerPassword").val()).then(function(user) {
    gluipertje.user.byToken(user.token)
      .then(function(safeUser) {
        if (!safeUser.id) {
          return false;
        }
        app.user = safeUser;
        localStorage.setItem("token", user.token);
        $("#userDropdown").show();
        $("#messageInput, #messageButton").prop("disabled", false);
        clearInterval(refreshMessagesInterval);
        refreshMessagesInterval = setInterval(refreshMessages, 1000);
        $("#messageButton").click(sendMessage);
        $("#loginModal").modal("hide");
      });
  });
}

// "Logs in"
function login() {
  gluipertje.user.revokeToken($("#loginUsername").val(), $("#loginPassword").val())
    .then(function(token) {
      gluipertje.user.byToken(token)
        .then(function(user) {
          if (!user.id) {
            console.log(user)
            if (user == "Invalid token") {
              $("#loginAlertText").html("The username and password do not match");
              $("#loginAlert").addClass("alert-danger");
              console.log("alert'd")
            }
            $("#loginAlert").show();

            $("#loginAlert").alert();
            console.log("alerted 2");
            return;
          }
          app.user = user;
          localStorage.setItem("token", token);
          $("#userDropdown").show();
          $("#messageInput, #messageButton").prop("disabled", false);
          clearInterval(refreshMessagesInterval);
          refreshMessagesInterval = setInterval(refreshMessages, 1000);
          $("#messageButton").click(sendMessage);
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
  if (app.user.id == 0 || !localStorage.getItem("token") || $("#messageInput").val().length == 0) {
    return false;
  }
  gluipertje.message.send(localStorage.getItem("token"), $("#messageInput").val().replace(/\n/g, "\\n"));

  app.messages.push(`<div class="card mx-4"><div class="card-body text-left"><h5 class="card-title">${escapeHtml(app.user.nickname)}</h5><h6 class="card-subtitle mb-2 text-muted">(@${escapeHtml(app.user.username)})</h6><br><p class="card-text">${escapeHtml($("#messageInput").val()).replace(/\n/g, "<br>")}</p></div></div><br>`);
  if (checkVisible(document.getElementById("footer"))) {
    $("html, body").animate({
      scrollTop: $(document).height() * app.messages.length
    }, 2000);
  }
  $("#messageInput").val('');
  $("#messageInput").focus().click();

  return false;
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
        messages.push(`<div class="card mx-4"><div class="card-body text-left"><h5 class="card-title">${escapeHtml(rawMessage.from.nickname)}</h5><h6 class="card-subtitle mb-2 text-muted">(@${escapeHtml(rawMessage.from.username)})</h6><br><p class="card-text">${escapeHtml(rawMessage.body).replace(/\\n/g, "<br>")}</p></div></div><br>`);
      }

      // Check if there are new messages
      if (messages.length != app.messages.length) {
        messages.reverse();
        app.messages = messages;

        // Check if the user is already at the bottom of the page so that if they are reading older messages it doesn't scroll down when a new message appears
        if (checkVisible(document.getElementById("footer"))) {
          $("html, body").animate({
            scrollTop: $(document).height() * app.messages.length
          }, 2000);
        }
      }
    });
}


$(document).ready(function() {
  let token = localStorage.getItem("token");
  gluipertje.user.byToken(token)
    .then(function(user) {
      if (user.id) {
        app.user = user;
        $("#messageButton").click(sendMessage);
        refreshMessagesInterval = setInterval(refreshMessages, 1000);
      } else {
        localStorage.clear();
        $("#userDropdown").hide();
        $("#loginModal").modal();
        $("#messageInput, #messageButton").prop("disabled", true);
        refreshMessagesInterval = setInterval(refreshMessages, 2000);
      }
    });

  $("#alert, #loginAlert, #scrollDownButton").hide();
});

function scrollDown() {
  // Check if the user is already at the bottom of the page so that if they are reading older messages it doesn't scroll down when a new message appears
  $("html, body").animate({
    scrollTop: $(document).height() * app.messages.length
  }, 1000);
}