import { supabaseClient } from "./config/supabaseClient.js";
import { fetchUsers } from "./fetchData/fetchUsers.js";

const LOGIN_PAGE_URL = "/index.html";

let currentUuid = null;
let currentChatUuid = null;
let currentChatUsername = "";
let currentConversationUuid = null;
let allChatFriends = [];
let isRefreshingUsernameViews = false;


function getUsernameFromEmail(email) {
    if (!email) return "new_user";
    return email.split("@")[0];
}

async function checkUserSession() {
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
    if (sessionError || !sessionData?.session) {
        window.location.replace(LOGIN_PAGE_URL);
        return null;
    }

    const userUUID = sessionData.session.user.id;
    currentUuid = userUUID;

    const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('status')
        .eq('id', userUUID)
        .maybeSingle();

    if (profileError) {
        console.error('Failed to load profile:', profileError?.message);
        await supabaseClient.auth.signOut();
        window.location.replace(LOGIN_PAGE_URL);
        return null;
    }

    if (!profile) {
        return sessionData.session;
    }

    if (profile?.status === true) {
        await supabaseClient.auth.signOut();
        alert("Account Is Disabled");
        window.location.replace(LOGIN_PAGE_URL);
        return null;
    }


    return sessionData.session;
}




async function createProfileRow(session) {
    const user = session.user;
    const username = getUsernameFromEmail(user.email);

    const { data: existingProfile, error: checkError } = await supabaseClient
        .from("profiles")
        .select("id, username")
        .eq("id", user.id)
        .maybeSingle();

    if (existingProfile) {
        return;
    }

    const { error } = await supabaseClient
        .from("profiles")
        .insert(
            {
                id: user.id,
                email: user.email ?? null,
                username: username,
            }
        );

    if (error) {
        console.error("Profile creation failed", error.message);
    }
}

async function logOut() {
    const { error } = await supabaseClient.auth.signOut({ scope: "local" });

    if (error) {
        console.log(error.message);
        return;
    }

    currentUuid = null;
    currentChatUuid = null;
    currentChatUsername = "";
    currentConversationUuid = null;
    allChatFriends = [];
    isRefreshingUsernameViews = false;


    window.location.replace(LOGIN_PAGE_URL);
}

export async function loadCurrentUserProfile() {
    const { data: userData, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !userData.user) {
        window.location.replace(LOGIN_PAGE_URL);
        return;
    }

    const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select("email, username, id")
        .eq("id", userData.user.id)
        .maybeSingle();

    if (profileError) {
        console.error("Failed to load profile:", profileError.message);
        return;
    }

    if (!profile) {
        return;
    }

    const usernameInput = document.getElementById("username");
    const emailInput = document.getElementById("email");

    if (usernameInput) {
        usernameInput.value = profile?.username ?? "";
    }

    if (emailInput) {
        emailInput.value = profile?.email ?? "";
    }

}

let allUsers = [];

async function getConnectedUserIds() {
    if (!currentUuid) {
        return new Set();
    }

    const { data, error } = await supabaseClient
        .from("friends")
        .select("user_id, friend_id")
        .or(`user_id.eq.${currentUuid},friend_id.eq.${currentUuid}`);

    if (error) {
        console.error("Failed to load existing friend relationships:", error.message);
        return new Set();
    }

    const connectedIds = new Set();
    (data || []).forEach((row) => {
        if (row.user_id && row.user_id !== currentUuid) {
            connectedIds.add(row.user_id);
        }
        if (row.friend_id && row.friend_id !== currentUuid) {
            connectedIds.add(row.friend_id);
        }
    });

    return connectedIds;
}

async function loadUsers() {
    const users = await fetchUsers();
    const connectedIds = await getConnectedUserIds();

    allUsers = (users || []).filter((user) => !connectedIds.has(user.id));

    displaySearchResults(allUsers, "No other users yet");
}

function searchUsers(searchTerm) {
    const normalized = searchTerm.trim().toLowerCase();

    if (!normalized) {
        return allUsers;
    }

    return allUsers.filter((user) => user.username?.toLowerCase().includes(normalized));
}

function displaySearchResults(users, emptyMessage = "No users found") {
    const resultsContainer = document.getElementById("search-results");

    if (!resultsContainer) {
        console.error("Results container not found");
        return;
    }

    resultsContainer.textContent = "";

    if (!users || users.length === 0) {

        const emptyItem = document.createElement("li");
        emptyItem.className = "list-group-item text-muted";
        emptyItem.textContent = emptyMessage;

        resultsContainer.appendChild(emptyItem);
        return;
    }

    users.forEach((user) => {
        const listItem = document.createElement("li");
        listItem.className = "list-group-item d-flex justify-content-between align-items-center";

        const usernameText = document.createElement("span");
        usernameText.textContent = user.username;

        const addButton = document.createElement("button");
        addButton.type = "button";
        addButton.className = "btn btn-success btn-sm";
        addButton.textContent = "Add Friend";

        addButton.dataset.userId = user.id;

        listItem.appendChild(usernameText);
        listItem.appendChild(addButton);
        resultsContainer.appendChild(listItem);
    });
}


function bindAddFriendButtons() {
    const resultsContainer = document.getElementById("search-results");

    if (!resultsContainer) {
        console.error("search-results not found");
        return;
    }

    resultsContainer.addEventListener("click", (event) => {
        const clickedButton = event.target.closest("button[data-user-id]");
        if (!clickedButton) return;

        const targetUserUuid = clickedButton.dataset.userId;


        sendFriendRequest(targetUserUuid);
    });
}

async function sendFriendRequest(targetUserUuid) {
    if (!targetUserUuid || targetUserUuid === currentUuid) {
        showPopUp("Invalid friend target.");
        return;
    }

    const { data: existingRows, error: existingError } = await supabaseClient
        .from("friends")
        .select("id")
        .or(`and(user_id.eq.${currentUuid},friend_id.eq.${targetUserUuid}),and(user_id.eq.${targetUserUuid},friend_id.eq.${currentUuid})`)
        .limit(1);

    if (existingError) {
        showPopUp(`Failed to validate existing request: ${existingError.message}`);
        return;
    }

    if (existingRows && existingRows.length > 0) {
        await loadUsers();
        showPopUp("This user is already in your friend flow.");
        return;
    }

    const { data, error } = await supabaseClient
        .from("friends")
        .insert([
            { user_id: currentUuid, friend_id: targetUserUuid, status: "pending" },
        ])
        .select()
        .single();

    if (error) {
        if (error.code === "23505") {
            showPopUp("Friend request already exists.");
            return;
        }

        showPopUp(`Failed to send friend request: ${error.message}`);
        return;
    }

    showPopUp(`Friend request created`);
    await loadFriendRequests();
    await loadUsers();
}

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

async function fetchFriendRequests() {
    if (!currentUuid) {
        return [];
    }

    const { data: requests, error: requestsError } = await supabaseClient
        .from("friends")
        .select("id, user_id, friend_id, status, created_at")
        .or(`user_id.eq.${currentUuid},friend_id.eq.${currentUuid}`)
        .order("created_at", { ascending: false });

    if (requestsError) {
        console.error("Failed to fetch friend requests:", requestsError.message);
        showPopUp(`Failed to load friend requests: ${requestsError.message}`);
        return [];
    }

    if (!requests || requests.length === 0) {
        return [];
    }

    const uniqueUserIds = [...new Set(
        requests.flatMap((requestRow) => [requestRow.user_id, requestRow.friend_id])
    )];

    const { data: profileRows, error: profilesError } = await supabaseClient
        .from("profiles")
        .select("id, username")
        .in("id", uniqueUserIds);

    if (profilesError) {
        console.error("Failed to fetch usernames:", profilesError.message);
        showPopUp(`Failed to load usernames: ${profilesError.message}`);
        return [];
    }

    const usernameById = new Map(
        (profileRows || []).map((profile) => [profile.id, profile.username])
    );

    return requests.map((requestRow) => ({
        ...requestRow,
        sender_username: usernameById.get(requestRow.user_id) || "Unknown user",
        receiver_username: usernameById.get(requestRow.friend_id) || "Unknown user",
    }));
}

function displayFriendRequests(requests) {
    const requestList = document.getElementById("friend-request-list");

    if (!requestList) {
        console.error("friend-request-list not found");
        return;
    }

    requestList.textContent = "";

    if (!requests || requests.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.className = "list-group-item text-muted";
        emptyItem.textContent = "No friend requests";
        requestList.appendChild(emptyItem);
        return;
    }

    requests.forEach((requestRow) => {
        const listItem = document.createElement("li");
        listItem.className = "list-group-item d-flex justify-content-between align-items-center";

        const leftText = document.createElement("span");

        const actionContainer = document.createElement("div");
        actionContainer.className = "d-flex gap-2";

        const isSender = requestRow.user_id === currentUuid;
        const isReceiver = requestRow.friend_id === currentUuid;
        const isPending = requestRow.status === "pending";

        if (isSender && isPending) {
            leftText.textContent = `To ${requestRow.receiver_username} (Pending)`;

            const cancelButton = document.createElement("button");
            cancelButton.type = "button";
            cancelButton.className = "btn btn-outline-danger btn-sm";
            cancelButton.textContent = "Cancel";
            cancelButton.dataset.requestId = requestRow.id;
            cancelButton.dataset.action = "cancel";

            actionContainer.appendChild(cancelButton);
        }

        if (isReceiver && isPending) {
            leftText.textContent = `From ${requestRow.sender_username}`;

            const acceptButton = document.createElement("button");
            acceptButton.type = "button";
            acceptButton.className = "btn btn-success btn-sm";
            acceptButton.textContent = "Accept";
            acceptButton.dataset.requestId = requestRow.id;
            acceptButton.dataset.action = "accept";

            const declineButton = document.createElement("button");
            declineButton.type = "button";
            declineButton.className = "btn btn-outline-secondary btn-sm";
            declineButton.textContent = "Decline";
            declineButton.dataset.requestId = requestRow.id;
            declineButton.dataset.action = "decline";

            actionContainer.appendChild(acceptButton);
            actionContainer.appendChild(declineButton);
        }

        listItem.appendChild(leftText);
        listItem.appendChild(actionContainer);
        requestList.appendChild(listItem);
    });
}

function displayCurrentFriends(acceptedFriends) {
    const currentFriendsList = document.getElementById("current-friends-list");

    if (!currentFriendsList) {
        console.error("current-friends-list not found");
        return;
    }

    currentFriendsList.textContent = "";

    if (!acceptedFriends || acceptedFriends.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.className = "list-group-item text-muted";
        emptyItem.textContent = "No friends yet";
        currentFriendsList.appendChild(emptyItem);
        return;
    }

    acceptedFriends.forEach((friendRow) => {
        const listItem = document.createElement("li");
        listItem.className = "list-group-item d-flex justify-content-between align-items-center";

        const otherUsername = friendRow.user_id === currentUuid
            ? friendRow.receiver_username
            : friendRow.sender_username;

        const usernameText = document.createElement("span");
        usernameText.textContent = otherUsername;

        const actionContainer = document.createElement("div");
        actionContainer.className = "d-flex gap-2";

        const messageButton = document.createElement("button");
        messageButton.type = "button";
        messageButton.className = "btn btn-primary btn-sm";
        messageButton.textContent = "Message";
        messageButton.dataset.action = "message";
        messageButton.dataset.requestId = friendRow.id;

        const targetUserUuid = friendRow.user_id === currentUuid ? friendRow.friend_id : friendRow.user_id;
        messageButton.dataset.targetUserId = targetUserUuid;
        messageButton.dataset.targetUsername = otherUsername;

        const unfriendButton = document.createElement("button");
        unfriendButton.type = "button";
        unfriendButton.className = "btn btn-danger btn-sm";
        unfriendButton.textContent = "Unfriend";
        unfriendButton.dataset.action = "unfriend";
        unfriendButton.dataset.requestId = friendRow.id;

        actionContainer.appendChild(messageButton);
        actionContainer.appendChild(unfriendButton);

        listItem.appendChild(usernameText);
        listItem.appendChild(actionContainer);
        currentFriendsList.appendChild(listItem);
    });
}

function displayChatFriends(acceptedFriends) {
    const chatList = document.getElementById("chat-list");

    if (!chatList) {
        console.error("chat-list not found");
        return;
    }

    chatList.textContent = "";

    if (!acceptedFriends || acceptedFriends.length === 0) {
        const emptyItem = document.createElement("li");
        emptyItem.className = "list-group-item d-flex justify-content-between align-items-center";
        emptyItem.textContent = "No Chats Yet...";
        chatList.appendChild(emptyItem);
        return;
    }

    acceptedFriends.forEach((friendRow) => {
        const listItem = document.createElement("li");
        listItem.className = "list-group-item d-flex justify-content-between align-items-center";

        const otherUsername = friendRow.user_id === currentUuid
            ? friendRow.receiver_username
            : friendRow.sender_username;

        const usernameText = document.createElement("span");
        usernameText.textContent = otherUsername;

        const messageButton = document.createElement("button");
        messageButton.type = "button";
        messageButton.className = "btn btn-primary btn-sm";
        messageButton.textContent = "Message";
        messageButton.dataset.action = "message";
        messageButton.dataset.requestId = friendRow.id;

        const targetUserUuid = friendRow.user_id === currentUuid ? friendRow.friend_id : friendRow.user_id;
        messageButton.dataset.targetUserId = targetUserUuid;
        messageButton.dataset.targetUsername = otherUsername;

        listItem.appendChild(usernameText);
        listItem.appendChild(messageButton);
        chatList.appendChild(listItem);
    });
}

function searchChatFriends(searchTerm) {
    const normalized = searchTerm.trim().toLowerCase();

    if (!normalized) {
        return allChatFriends;
    }

    return allChatFriends.filter((friendRow) =>
        (friendRow.other_username || "").toLowerCase().includes(normalized)
    );
}

async function loadFriendRequests() {
    const requests = await fetchFriendRequests();
    const acceptedFriends = requests.filter((requestRow) => requestRow.status === "accepted");
    const pendingRequests = requests.filter((requestRow) => requestRow.status === "pending");

    allChatFriends = acceptedFriends.map((requestRow) => ({
        ...requestRow,
        other_username: requestRow.user_id === currentUuid
            ? requestRow.receiver_username
            : requestRow.sender_username,
    }));

    displayChatFriends(allChatFriends);
    displayCurrentFriends(acceptedFriends);
    displayFriendRequests(pendingRequests);
}

function getVisibleTabName() {
    const visibleTab = document.querySelector(".tab-content.is-visible");
    return visibleTab?.dataset.tabContent || "chats";
}

function updateCurrentConversationHeader() {
    const friendName = document.getElementById("friend-name");

    if (!friendName) {
        return;
    }

    const displayName = currentChatUsername
        ? currentChatUsername.charAt(0).toUpperCase() + currentChatUsername.slice(1)
        : "Friend Name";

    friendName.textContent = displayName;
}

async function refreshUsernameDependentViews(changedProfileId = null, changedUsername = null) {
    if (isRefreshingUsernameViews) {
        return;
    }

    isRefreshingUsernameViews = true;

    try {
        const visibleTab = getVisibleTabName();

        if (visibleTab === "chats") {
            await loadFriendRequests();
        }

        if (visibleTab === "friends") {
            await loadUsers();
            await loadFriendRequests();
        }

        if (changedProfileId && changedProfileId === currentChatUuid && changedUsername) {
            currentChatUsername = changedUsername;
            updateCurrentConversationHeader();
        }

        if (changedProfileId && changedProfileId === currentUuid) {
            await loadCurrentUserProfile();
        }
    } finally {
        isRefreshingUsernameViews = false;
    }
}

async function handleFriendRequestAction(action, requestId, targetUserId = null, targetUsername = "") {
    if (!requestId) {
        showPopUp("Missing request id.");
        return;
    }

    if (action === "cancel") {
        const { data, error } = await supabaseClient
            .from("friends")
            .delete()
            .eq("id", requestId)
            .eq("user_id", currentUuid)
            .eq("status", "pending")
            .select("id");

        if (error) {
            showPopUp(`Cancel failed: ${error.message}`);
            return;
        }

        if (!data || data.length === 0) {
            showPopUp("Cancel failed: no request was removed. Check RLS policy.");
            return;
        }

        showPopUp("Friend request canceled.");
        await loadFriendRequests();
        await loadUsers();
        return;
    }

    if (action === "accept") {
        const { data, error } = await supabaseClient
            .from("friends")
            .update({ status: "accepted" })
            .eq("id", requestId)
            .eq("friend_id", currentUuid)
            .eq("status", "pending")
            .select("id");

        if (error) {
            showPopUp(`Accept failed: ${error.message}`);
            return;
        }

        if (!data || data.length === 0) {
            showPopUp("Accept failed: no request was updated. Check RLS policy.");
            return;
        }

        showPopUp("Friend request accepted.");
        await loadFriendRequests();
        await loadUsers();
        return;
    }

    if (action === "decline") {
        const { data, error } = await supabaseClient
            .from("friends")
            .delete()
            .eq("id", requestId)
            .eq("friend_id", currentUuid)
            .eq("status", "pending")
            .select("id");

        if (error) {
            showPopUp(`Decline failed: ${error.message}`);
            return;
        }

        if (!data || data.length === 0) {
            showPopUp("Decline failed: no request was removed. Check RLS policy.");
            return;
        }

        showPopUp("Friend request declined.");
        await loadFriendRequests();
        await loadUsers();
        return;
    }

    if (action === "unfriend") {
        const { data, error } = await supabaseClient
            .from("friends")
            .delete()
            .eq("id", requestId)
            .eq("status", "accepted")
            .or(`user_id.eq.${currentUuid},friend_id.eq.${currentUuid}`)
            .select("id");

        if (error) {
            showPopUp(`Unfriend failed: ${error.message}`);
            return;
        }

        if (!data || data.length === 0) {
            showPopUp("Unfriend failed: no row was deleted.");
            return;
        }

        showPopUp("Friend removed.");
        await loadFriendRequests();
        await loadUsers();
        return;
    }

    if (action === "message") {
        currentChatUuid = targetUserId;
        currentChatUsername = targetUsername;
        let messageId = [currentUuid, currentChatUuid].sort().join("_");
        currentConversationUuid = messageId;

        let messageTab1 = document.querySelector(".content-1");
        if (messageTab1) {
            messageTab1.remove();
        }

        let messageTab2 = document.querySelector(".content-2");
        if (messageTab2) {
            messageTab2.classList.add("is-visible");
        }

        updateCurrentConversationHeader();
        await subscribeToMessages(currentConversationUuid);


        await loadMessage();


        return;
    }
}

function bindFriendRequestButtons() {
    const requestList = document.getElementById("friend-request-list");

    if (!requestList) {
        console.error("friend-request-list not found");
        return;
    }

    requestList.addEventListener("click", async (event) => {
        const clickedButton = event.target.closest("button[data-request-id][data-action]");
        if (!clickedButton) return;

        const requestId = clickedButton.dataset.requestId;
        const action = clickedButton.dataset.action;

        const targetUserId = clickedButton.dataset.targetUserId || null;
        const targetUsername = clickedButton.dataset.targetUsername || "";

        await handleFriendRequestAction(action, requestId, targetUserId, targetUsername);
    });
}

function bindCurrentFriendButtons() {
    const currentFriendsList = document.getElementById("current-friends-list");

    if (!currentFriendsList) {
        console.error("current-friends-list not found");
        return;
    }

    currentFriendsList.addEventListener("click", async (event) => {
        const clickedButton = event.target.closest("button[data-request-id][data-action]");
        if (!clickedButton) return;

        const requestId = clickedButton.dataset.requestId;
        const action = clickedButton.dataset.action;

        const targetUserId = clickedButton.dataset.targetUserId || null;
        const targetUsername = clickedButton.dataset.targetUsername || "";

        await handleFriendRequestAction(action, requestId, targetUserId, targetUsername);
    });
}

function bindChatButtons() {
    const chatList = document.getElementById("chat-list");

    if (!chatList) {
        console.error("chat-list not found");
        return;
    }

    chatList.addEventListener("click", async (event) => {
        const clickedButton = event.target.closest("button[data-request-id][data-action]");
        if (!clickedButton) return;

        const requestId = clickedButton.dataset.requestId;
        const action = clickedButton.dataset.action;

        const targetUserId = clickedButton.dataset.targetUserId || null;
        const targetUsername = clickedButton.dataset.targetUsername || "";

        await handleFriendRequestAction(action, requestId, targetUserId, targetUsername);
    });
}

let userMessage = document.getElementById("user-message");
let btnSentMessage = document.getElementById("btn-send-message");



btnSentMessage.addEventListener("click", (event) => {
    event.preventDefault();
    sendMessage();
});

async function sendMessage() {

    if (userMessage.value && userMessage.value.trim().length > 0) {
        let actualMessage = userMessage.value;
        userMessage.value = "";
        userMessage.blur();
        userMessage.focus();

        const { data, error } = await supabaseClient
            .from('messages')
            .insert([
                {
                    sender_id: currentUuid,
                    receiver_id: currentChatUuid,
                    message: actualMessage,
                    conversation_id: currentConversationUuid,
                    type: "text"
                },
            ])
            .select()

        if (error) {
            console.error("Failed to send message: ", error.message);
            alert("Message failed to send.");
            return
        }
    } else {
        alert("Please Enter a message");
    }

}

function addLongPressListener(element) {
    let pressTimer;

    const startPress = (e) => {
        pressTimer = window.setTimeout(async() => {
            const messageId = element.dataset.messageId;
            const confirmDelete = confirm("Delete your selected message?");
            if (confirmDelete) {
                
                const { error } = await supabaseClient
                .from('messages')
                .delete()
                .eq('id', messageId);
            
                if(error) {
                    console.error("Erorr: " + error.message);
                } else {
                    element.remove();
                }
            }
        }, 1500);
    };

    const cancelPress = () => clearTimeout(pressTimer);

    element.addEventListener('mousedown', startPress);
    element.addEventListener('mouseup', cancelPress);
    element.addEventListener('mouseleave', cancelPress);
    element.addEventListener('touchstart', startPress);
    element.addEventListener('touchend', cancelPress);
}

async function loadMessage() {

    if (!currentConversationUuid) {
        return;
    }

    let { data: messages, error } = await supabaseClient
        .from('messages')
        .select('id, created_at, sender_id, message, type ,file_path, file_name')
        .eq('conversation_id', currentConversationUuid)
        .order('created_at', { ascending: true })

    if (error) {
        console.error("failed to load messages");
        return;
    } else {

        let messageContainer = document.getElementById("message-container");
        const fragment = document.createDocumentFragment();


        messages.forEach((msg) => {
            
            const div = document.createElement("div");
            div.dataset.messageId = msg.id;

            if(msg.sender_id === currentUuid) {
                addLongPressListener(div);
            }

            div.classList.add("d-flex", "flex-column", msg.sender_id === currentUuid ? "align-items-end" : "align-items-start", "mb-3");

            const timeMessage = document.createElement("p");
            timeMessage.classList.add("mb-0", "text-nowrap");
            const phTime = new Intl.DateTimeFormat("en-PH", {
                timeZone: "Asia/Manila",
                dateStyle: "medium",
                timeStyle: "short",
            }).format(new Date(msg.created_at));

            timeMessage.textContent = phTime;
            
            if(msg.type === "text") {

                const message = document.createElement("p");
                message.classList.add("mb-0", "bg-primary", "p-1");
                message.style.borderRadius = "5px";
                message.style.whiteSpace = "pre-wrap";
                message.style.wordBreak = "break-word";
                message.style.maxWidth = "90%";
                message.textContent = msg.message;

                div.append(timeMessage, message);
            }
            else if(msg.type === "image") {
                const image = document.createElement("img");
                image.src = `${msg.file_path}`;
                image.style.width = "200px";

                div.append(timeMessage, image);

            }
            else if(msg.type === "file") {
                const link = document.createElement("p");
                link.classList.add("mb-0","bg-primary","p-1");
                link.style.borderRadius = "5px";
                link.style.maxWidth = "90%";

                const anchor = document.createElement("a");
                anchor.style.color = "#DEE3E9";
                anchor.href = msg.file_path;
                anchor.textContent = msg.file_name;
                anchor.target="_blank";
                link.append(anchor);

                div.append(timeMessage,link);

            } else if(msg.type === "video") {
                const video = document.createElement("video");
                video.style.width ="300px";
                video.controls = true;

                const source = document.createElement("source");
                source.src = `${msg.file_path}`;
                source.type = "video/mp4";

                video.append(source);
                div.append(timeMessage,video);

            } else if(msg.type === "audio") {
                const audio = document.createElement("audio");
                audio.controls= true;

                const source = document.createElement("source");
                source.src = `${msg.file_path}`;
                source.type = "audio/mpeg";

                audio.append(source);
                div.append(timeMessage,audio);

            } else {
                const message = document.createElement("p");
                message.classList.add("mb-0", "bg-primary", "p-1");
                message.style.borderRadius = "5px";
                message.style.whiteSpace = "pre-wrap";
                message.style.wordBreak = "break-word";
                message.style.maxWidth = "90%";
                message.textContent = "Error Message";

                div.append(timeMessage, message);
            }
            
            fragment.appendChild(div);
        });
        messageContainer.replaceChildren(fragment);
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }

}



let profilesChannel = null;
let friendsChannel = null;
let messageChannel = null;


async function subscribeToMessages(conversationUuid) {

    if (messageChannel) {
        await supabaseClient.removeChannel(messageChannel);
    }

    messageChannel = supabaseClient
        .channel(`chat-${conversationUuid}`)
        .on(
            "postgres_changes",
            { 
                event: "*", 
                schema: "public", 
                table: "messages",
                filter: `conversation_id=eq.${conversationUuid}` 
            },
            async (payload) => {
                console.log("Change detected:", payload.eventType);
                await loadMessage(); 
            }
        )
        .subscribe();
}





document.addEventListener("DOMContentLoaded", async () => {
    const session = await checkUserSession();

    if (session) {
        await createProfileRow(session);
        await loadCurrentUserProfile();

        await loadUsers();

        await loadFriendRequests();

        bindAddFriendButtons();
        bindFriendRequestButtons();
        bindCurrentFriendButtons();
        bindChatButtons();
    }

    userMessage.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }

    });

    const searchInput = document.getElementById("friends-search-input");
    if (searchInput) {
        searchInput.addEventListener("input", (event) => {
            const searchTerm = event.target.value;
            const results = searchUsers(searchTerm);
            displaySearchResults(results, "No users match your search");
        });
    }

    const chatSearchInput = document.getElementById("chat-search-input");
    if (chatSearchInput) {
        chatSearchInput.addEventListener("input", (event) => {
            const searchTerm = event.target.value;
            const results = searchChatFriends(searchTerm);
            displayChatFriends(results);
        });
    }

    const fileInput = document.getElementById('message-files');

    fileInput.addEventListener('change', async function () {
        if (this.files.length === 0) return;

        const file = this.files[0];
        const maxUploadSize = 5 * 1024 * 1024;
        if(file.size > maxUploadSize) {
            alert("File is too large, must be less than 5mb");
            this.value = "";
            return;
        }

        fileInput.disabled = true;

        await uploadFile(file);
        fileInput.disabled = false;
        this.value = "";
    });

    async function uploadFile(file) {
        const fileName = file.name;
        const filePath = `uploads/${Date.now()}-${file.name}`;

        let customType;

        if (file.type.startsWith('image/')) {
            customType = "image";
        } else if (file.type === 'video/mp4') {
            customType = "video";
        } else if (file.type === 'audio/mpeg' || file.type === 'audio/mp3') {
            customType = "audio";
        } else {
            customType = "file";
        }

        const { data, error } = await supabaseClient.storage
            .from('chat_files')
            .upload(filePath, file);

        if (error) {
            console.error("Upload Error:", error.message);
            return;
        }

        alert("File Has Been Sent.");

        const { data: publicData } = supabaseClient.storage
            .from('chat_files')
            .getPublicUrl(data.path);

        const file_path = publicData.publicUrl;

        if (file_path.length > 0) {

            const { data, error } = await supabaseClient
                .from('messages')
                .insert([
                    {
                        sender_id: currentUuid,
                        receiver_id: currentChatUuid,
                        conversation_id: currentConversationUuid,
                        file_path: file_path,
                        type: customType,
                        file_name: fileName
                    },
                ])
                .select()

            if (error) {
                console.error("Upload Error:", error.message);
            } else {

            }

        }
    }


    profilesChannel = supabaseClient
        .channel("profiles-live-updates")
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "profiles" },
            async (payload) => {
                const changedProfileId = payload?.new?.id || payload?.old?.id || null;
                const changedUsername = payload?.new?.username || payload?.old?.username || null;

                await refreshUsernameDependentViews(changedProfileId, changedUsername);

                const activeSearch = searchInput?.value ?? "";
                if (getVisibleTabName() === "friends") {
                    const filteredUsers = searchUsers(activeSearch);

                    if (activeSearch.trim()) {
                        displaySearchResults(filteredUsers, "No users match your search");
                    } else {
                        displaySearchResults(allUsers, "No other users yet");
                    }
                }
            }
        )
        .subscribe();

    friendsChannel = supabaseClient
        .channel("friends-live-updates")
        .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "friends" },
            async () => {
                await loadFriendRequests();

            }
        )
        .subscribe();

    messageChannel = supabaseClient
        .channel("messages-live-updates")
        .on(
            "postgres_changes",
            { 
                event: "*", 
                schema: "public", 
                table: "messages",
            },
            async (payload) => {
                await loadMessage();
            }
        )
        .subscribe();


    const logoutButton = document.getElementById("btn-logout");

    if (logoutButton) {
        logoutButton.addEventListener("click", logOut);
    }

    supabaseClient.auth.onAuthStateChange((_event, session) => {
        if (!session) {
            window.location.replace(LOGIN_PAGE_URL);
        }
    });
});

window.addEventListener("beforeunload", () => {
    if (profilesChannel) {
        supabaseClient.removeChannel(profilesChannel);
    }
    if (friendsChannel) {
        supabaseClient.removeChannel(friendsChannel);
    }
    if (messageChannel) {
        supabaseClient.removeChannel(messageChannel);
    }
});