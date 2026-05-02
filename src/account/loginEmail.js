import { supabaseClient } from "../config/supabaseClient.js";

const HOME_PAGE_URL = "/public/homePage.html";

async function redirectIfAlreadyLoggedIn() {
  const { data } = await supabaseClient.auth.getSession();

  if (data.session) {
    window.location.replace(HOME_PAGE_URL);
  }
}

redirectIfAlreadyLoggedIn();

const btnLoginEmail = document.getElementById("btn-login-email");

if(btnLoginEmail) {
  btnLoginEmail.addEventListener("click", async (event) => {

    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
        alert(error.message);
        return;
      }

    if (data.session) {
      window.location.replace(HOME_PAGE_URL);
    }
  });
};