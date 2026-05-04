import { supabaseClient } from "../config/supabaseClient.js";
import { loadCurrentUserProfile } from "../homePage.js"


let isUpdatingUsername = false;

function showPopUp(text) {
    const myDiv = document.getElementById("container-top");
    myDiv.textContent = ""; 


    const alertDiv = document.createElement("div");

    alertDiv.className = "alert alert-primary";
    alertDiv.setAttribute("role", "alert");

    alertDiv.textContent = text;

    myDiv.appendChild(alertDiv);

    setTimeout(() => {
        myDiv.textContent = "";
    }, 5000);
}


const contactBtn = document.getElementById("btn-contact-support");

if (contactBtn) {
    contactBtn.addEventListener("click", async (event) => {
        event.preventDefault();

        const { data: userData, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !userData.user) {
            showPopUp("Session expired. Please log in again.");
            return;
        }

        const message = prompt("What is your issue or feedback?");

        if (!message || !message.trim()) {
            showPopUp("Message cancelled.");
            return;
        }

        const { error } = await supabaseClient
            .from("support")
            .insert({
                user_id: userData.user.id,
                user_email: userData.user.email,
                message: message.trim()
            });

        if (error) {
            showPopUp("Error sending message.");
            console.error("Support insert error:", error.message);
            return;
        }

        showPopUp("Thank you for your message.");
    });
}

const deletetBtn = document.getElementById("btn-request-deletion");

if (deletetBtn) {
    deletetBtn.addEventListener("click", async (event) => {
        event.preventDefault();

        const { data: userData, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !userData.user) {
            showPopUp("Session expired. Please log in again.");
            return;
        }

        const message = prompt("Why are u closing or deleting ur account?");

        if (!message || !message.trim()) {
            showPopUp("Account Deletion Request cancelled.");
            return;
        }

        const { error } = await supabaseClient
            .from("account deletion requests")
            .insert({
                user_id: userData.user.id,
                user_email: userData.user.email,
                message: message.trim()
            });

        if (error) {
            showPopUp("Error sending message.");
            console.error("Support insert error:", error.message);
            return;
        }

        showPopUp("Account Deletion Submitted.");
    });
};

let btnChangeUsername = document.getElementById("btn-change-username");
let btnDiscardChanges = document.getElementById("btn-discard-changes");
let btnApplyChanges = document.getElementById("btn-apply-changes");
let inputUserField = document.getElementById("username");

if(btnChangeUsername) {
    btnChangeUsername.addEventListener("click", async (event) => {
        btnDiscardChanges.removeAttribute("disabled");
        btnApplyChanges.removeAttribute("disabled");
        inputUserField.readOnly = false;
    });
};
if(btnDiscardChanges) {
    btnDiscardChanges.addEventListener("click", async (event) => {
        btnDiscardChanges.setAttribute("disabled","");
        btnApplyChanges.setAttribute("disabled","");
        inputUserField.readOnly = true;
        loadCurrentUserProfile();
    });
};
if(btnApplyChanges) {
    btnApplyChanges.addEventListener("click", async (event) => {
        // Prevent multiple simultaneous updates
        if (isUpdatingUsername) {
            showPopUp("Username update in progress...");
            return;
        }

        const { data: userData, error: userError } = await supabaseClient.auth.getUser();

        if (userError || !userData.user) {
            showPopUp("Session expired. Please log in again.");
            return;
        }

        let usernameInput = document.getElementById("username").value.trim();
        
        if (!usernameInput || !usernameInput.trim()) {
            showPopUp("Username cannot be empty.");
            loadCurrentUserProfile();
            return;
        }

        if(usernameInput.length > 17) {
            showPopUp("Username must be 16 characters or less");
            loadCurrentUserProfile();
            return
        }

        // Set flag to prevent race conditions
        isUpdatingUsername = true;

        const { data, error } = await supabaseClient
            .from('profiles')
            .update({ username: usernameInput })
            .eq("id", userData.user.id)
            .select();

        if (error) {
            showPopUp("Error updating username: " + error.message);
            console.error("Update error:", error);
            isUpdatingUsername = false;
            return;
        }

        // Add small delay to ensure database fully commits
        await new Promise(resolve => setTimeout(resolve, 300));

        showPopUp("Username updated successfully!");

        // Reload profile after update is committed
        await loadCurrentUserProfile();

        // Clear the flag
        isUpdatingUsername = false;

        btnDiscardChanges.setAttribute("disabled","");
        btnApplyChanges.setAttribute("disabled","");
        inputUserField.readOnly = true;
    });
};