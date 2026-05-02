import { supabaseClient } from "../config/supabaseClient.js";

const btnRegister = document.getElementById("btn-register");

btnRegister.addEventListener("click", async function (event) {

    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Please enter email and password.");
        return;
    }


    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,

        options: {
           emailRedirectTo: `${window.location.origin}/index.html`
        }
    });

    if (error) {
        alert(error.message);
        return;
    }


    if (!data.session) {
        alert("Account created. Please confirm your email before logging in.");
        window.location.href = "./index.html";
        return;
    }


    alert("Signup successful.");
    window.location.href = "./index.html";
});