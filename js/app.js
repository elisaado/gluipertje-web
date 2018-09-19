let gluipertje = new Gluipertje({host: "https://gluipertje.elisaado.com", port: 443});
// let gluipertje = new Gluipertje("http://0.0.0.0", 8000); // Test server

let rf = new IntlRelativeFormat('en-US');

function checkVisible(elm) {
  var rect = elm.getBoundingClientRect();
  var viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight);
  return !(rect.bottom < 0 || rect.top - viewHeight >= 0);
}

function scrollDownButtonVisible() {
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
  if ($("#registerUsername").val().length < 3) {
    $("#alertText").html("This username is too short");
    $("#alert").addClass("alert-danger").alert();
    return;
  }

  gluipertje.getAllUsers()
    .then((users) => {
      let a = true;
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

  gluipertje.createUser({nickname: $("#registerNickname").val(), username: $("#registerUsername").val(), password: $("#registerPassword").val()})
  .then((user) => {
    gluipertje.getUserByToken(user.token)
      .then((safeUser) => {
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
  gluipertje.revokeToken({username: $("#loginUsername").val(), password: $("#loginPassword").val()})
    .then((token) => gluipertje.getUserByToken(token))
    .then((user) => {
      if (!user.id) {
        if (user == "Invalid token") {
          $("#loginAlertText").html("The username and password do not match");
          $("#loginAlert").addClass("alert-danger");
        }
        $("#loginAlert").show();

        $("#loginAlert").alert();
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
  gluipertje.sendMessage({token: localStorage.getItem("token"), text: $("#messageInput").val().replace(/\n/g, "\\n")});

  refreshMessages(); // :)

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

function refreshMessages(callb) {
  let messages = [];

  gluipertje.getAllMessages()
    .then((rawMessages) => {
      for (let rawMessage of rawMessages) {
        words = escapeHtml(rawMessage.text).split(/( |\\n)/)

        for (i = 0; i < words.length; i++) {
          match = (/((?:(http|https|Http|Https|rtsp|Rtsp):\/\/(?:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,64}(?:\:(?:[a-zA-Z0-9\$\-\_\.\+\!\*\'\(\)\,\;\?\&\=]|(?:\%[a-fA-F0-9]{2})){1,25})?\@)?)?((?:(?:[a-zA-Z0-9][a-zA-Z0-9\-]{0,64}\.)+(?:(?:aero|arpa|asia|a[cdefgilmnoqrstuwxz])|(?:biz|b[abdefghijmnorstvwyz])|(?:cat|com|coop|c[acdfghiklmnoruvxyz])|d[ejkmoz]|(?:edu|e[cegrstu])|f[ijkmor]|(?:gov|g[abdefghilmnpqrstuwy])|h[kmnrtu]|(?:info|int|i[delmnoqrst])|(?:jobs|j[emop])|k[eghimnrwyz]|l[abcikrstuvy]|(?:mil|mobi|museum|m[acdghklmnopqrstuvwxyz])|(?:name|net|n[acefgilopruz])|(?:org|om)|(?:pro|p[aefghklmnrstwy])|qa|r[eouw]|s[abcdeghijklmnortuvyz]|(?:tel|travel|t[cdfghjklmnoprtvwz])|u[agkmsyz]|v[aceginu]|w[fs]|y[etu]|z[amw]))|(?:(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9])\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[1-9]|0)\.(?:25[0-5]|2[0-4][0-9]|[0-1][0-9]{2}|[1-9][0-9]|[0-9])))(?:\:\d{1,5})?)(\/(?:(?:[a-zA-Z0-9\;\/\?\:\@\&\=\#\~\-\.\+\!\*\'\(\)\,\_])|(?:\%[a-fA-F0-9]{2}))*)?(?:\b|$)/gi).exec(words[i])
          if (match) {
            let link = "";
            if (!match[0].match(/^https?/)) {
              link = `http://${match[0]}`; // most websites redirect http to https automatically if they support it
            }
            words[i] = words[i].replace(match[0], `<a target="_blank" href="${link}">${match[0]}</a>`)
          }
        }

        rawMessage.text = words.join(" ").replace(/\\n/g, "<br>")
        let messageDate = "";
        if((new Date().getTime() / 1000) - rawMessage.created_at.getTime() / 1000 > 60*60*24*7) {
          messageDate = rawMessage.created_at.toDateString();
        } else {
          messageDate = rf.format(rawMessage.created_at);
        }

        messages.push(`<div class="card mx-4"><div class="card-body text-left"><h5 class="card-title">${escapeHtml(rawMessage.from.nickname)}</h5><h6 class="card-subtitle mb-2 text-muted">(@${escapeHtml(rawMessage.from.username)})</h6><br><p class="card-text">${rawMessage.text}</p></div><div class="card-footer text-muted">${messageDate}</div></div><br>`);
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
      if (callb) {
        callb();
      }
    });
}


$(document).ready(function() {
  let token = localStorage.getItem("token");
  gluipertje.getUserByToken(token)
    .then((user) => {
      if (user.id) {
        app.user = user;
        $("#messageButton").click(sendMessage);
        interval = 1000;
      } else {
        localStorage.clear();
        $("#userDropdown").hide();
        $("#loginModal").modal();
        $("#messageInput, #messageButton").prop("disabled", true);
        interval = 2000;
      }

      // Only fetch messages once in the begin
      refreshMessages(() => {
        setTimeout(refreshMessagesInterval = setInterval(refreshMessages, interval), interval);
      });
    });

  $("#alert, #loginAlert, #scrollDownButton").hide();
});

function scrollDown() {
  // Check if the user is already at the bottom of the page so that if they are reading older messages it doesn't scroll down when a new message appears
  $("html, body").animate({
    scrollTop: $(document).height() * app.messages.length
  }, 1000);
}
