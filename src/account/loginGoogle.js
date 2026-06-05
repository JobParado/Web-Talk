import { supabaseClient } from "../config/supabaseClient.js";

const btnLoginGoogle = document.getElementById("btn-login-google");

if (btnLoginGoogle) {
  btnLoginGoogle.addEventListener("click", async (event) => {
    event.preventDefault();

    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {

        redirectTo: `${window.location.origin}/index.html`,
        queryParams: {
          prompt: "select_account"
        }
      }
    });

    if (error) {
      alert(error.message);
    }
  });
}

