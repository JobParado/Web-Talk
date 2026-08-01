import { supabaseClient } from "./config/supabaseClient.js";
import { fetchUsers } from "./fetchData/fetchUsers.js";
import {
    displaySearchResults,
    displayFriendRequests,
    displayCurrentFriends,
    displayChatFriends
} from "./fetchData/friendLists.js";
import imageCompression from "browser-image-compression";

const LOGIN_PAGE_URL = "/index.html";

let currentUuid = null;                 // Your own logged-in user ID
let currentChatUuid = null;             // The user ID of the person you are chatting with
let currentChatUsername = "";           // The username of the person you are chatting with
let currentConversationUuid = null;     // The unique ID of the active chat room/message thread
let allChatFriends = [];                // List of all your confirmed friends
let isRefreshingUsernameViews = false;  // True if the UI is currently updating usernames

const mediaQuery = window.matchMedia("(max-width: 768px)");
let isMobile = false;

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
        alert("Account Currently Disabled");
        window.location.replace(LOGIN_PAGE_URL);
        return null;
    }

    subscribeToPresence();
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

    displayChatFriends(allChatFriends, currentUuid);
    displayCurrentFriends(acceptedFriends, currentUuid);
    displayFriendRequests(pendingRequests, currentUuid);
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

function showChatPanel() {
    const content1 = document.querySelector(".content-1");
    const content2 = document.querySelector(".content-2");

    if (content1) {
        content1.style.display = "none";
    }

    if (content2) {
        content2.classList.add("is-visible");
    }

    // Force layout reflow so env(safe-area-inset-bottom) recalculates on PWA
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const bottomArea = document.querySelector(".bottom-area");
            if (bottomArea) {
                bottomArea.style.paddingBottom = '';
                void bottomArea.offsetHeight;
                bottomArea.style.paddingBottom = 'calc(10px + env(safe-area-inset-bottom))';
            }
        });
    });
}

const closeChatBtn = document.getElementById("btn-close-chat");

closeChatBtn.addEventListener("click", (event) => {
    showEmptyChatPanel();
    if (isMobile) {
        backButtonMobile();
    }
});

function showEmptyChatPanel() {
    const content1 = document.querySelector(".content-1");
    const content2 = document.querySelector(".content-2");
    const messageContainer = document.getElementById("message-container");
    const friendName = document.getElementById("friend-name");

    if (content1) {
        content1.style.display = "flex";
    }

    if (content2) {
        content2.classList.remove("is-visible");
    }

    if (messageContainer) {
        messageContainer.textContent = "";
    }

    if (friendName) {
        friendName.textContent = "Friend Name";
    }

    currentChatUuid = null;
    currentChatUsername = "";
    currentConversationUuid = null;
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

        showEmptyChatPanel();
        showPopUp("Friend removed.");
        await loadFriendRequests();
        await loadUsers();
        return;
    }

    if (action === "message") {
        message(targetUserId, targetUsername);
    }
}

async function checkFriendStatus() {

    if(!currentUuid || !currentChatUuid) return;

    let { data: friends, error } = await supabaseClient
    .from('friends')
    .select('id, status')
    
    .or(`and(user_id.eq.${currentUuid},friend_id.eq.${currentChatUuid}),and(user_id.eq.${currentChatUuid},friend_id.eq.${currentUuid})`)
    .maybeSingle();

    if(error) {
        console.error("Error checking friendship status:", error.message);
        return;
    }

    if (!friends || friends.status !== "accepted") {
        showPopUp("This chat is no longer available.");
        showEmptyChatPanel();
    }
}

async function message(targetUserId, targetUsername) {
    currentChatUuid = targetUserId;
    currentChatUsername = targetUsername;

    let messageId = [currentUuid, currentChatUuid].sort().join("_");
    currentConversationUuid = messageId;

    showChatPanel();

    updateCurrentConversationHeader();
    await subscribeToMessages(currentConversationUuid);
    await loadMessage();
    refreshFriendPresence();

    if (isMobile) {
        showChatsMobile();
    }
    return;
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
        const actualMessage = userMessage.value;
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
            showPopUp("Message failed to send.");
            return
        }
    } else {
        showPopUp("Please Enter a message");
    }

}

function addLongPressListener(element) {
    let pressTimer;

    const startPress = (e) => {
        pressTimer = window.setTimeout(async () => {
            const messageId = element.dataset.messageId;
            const confirmDelete = confirm("Delete your selected message?");
            if (confirmDelete) {


                let { data: messages, error } = await supabaseClient
                    .from('messages')
                    .select('type,file_name,storage_path')
                    .eq('id', messageId)
                    .single()               

                if (error || !messages) {
                    console.error("Error loading message:", error?.message || "Message not found");
                    return;
                }

                if (messages.type !== "text") {
                    await DeleteFileFromBucket(messages.storage_path, messages.file_name);
                }

                const { error: deleteError } = await supabaseClient
                    .from('messages')
                    .delete()
                    .eq('id', messageId)
                    .eq("sender_id", currentUuid);

                if (deleteError) {
                    console.error("Error deleting message row:", deleteError.message);
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



async function DeleteFileFromBucket(storagePath, fallbackFileName) {
    const pathToDelete = storagePath || (fallbackFileName ? `uploads/${fallbackFileName}` : null);

    if (!pathToDelete) {
        console.error("Error Deleting From Bucket: missing storage path");
        return;
    }

    const { error } = await supabaseClient
        .storage
        .from('chat_files')
        .remove([pathToDelete]);

    if (error) {
        console.error("Error Deleting From Bucket:", error.message);
    }
}

function scrollMessageContainerToBottom(messageContainer) {
    if (!messageContainer) {
        return;
    }

    requestAnimationFrame(() => {
        messageContainer.scrollTop = messageContainer.scrollHeight;

        requestAnimationFrame(() => {
            messageContainer.scrollTop = messageContainer.scrollHeight;
        });
    });
}

async function loadMessage() {

    if (!currentConversationUuid) {
        return;
    }

    let { data: messages, error } = await supabaseClient
        .from('messages')
        .select('id, created_at, sender_id, message, type, file_path, file_name, storage_path')
        .eq('conversation_id', currentConversationUuid)
        .order('created_at', { ascending: true })

    if (error) {
        console.error("failed to load messages");
        return;
    } else {

        let messageContainer = document.getElementById("message-container");
        const fragment = document.createDocumentFragment();

        const filePaths = messages
            .filter(msg => msg.type !== "text" && msg.storage_path)
            .map(msg => msg.storage_path);

        let signedUrlMap = {};

        if (filePaths.length > 0) {
            const { data: signedUrls, error: signedError } = await supabaseClient
                .storage
                .from('chat_files')
                .createSignedUrls(filePaths, 3600); // 1 hour expiration of temporary url of files

            if (signedError) {
                console.error("Failed to create signed URLs:", signedError.message);
            } else {
                signedUrls.forEach(item => {
                    if (item.signedUrl) {
                        signedUrlMap[item.path] = item.signedUrl;
                    }
                });
            }
        }

        messages.forEach((msg) => {

            const div = document.createElement("div");
            div.dataset.messageId = msg.id;

            if (msg.sender_id === currentUuid) {
                addLongPressListener(div);
            }

            div.classList.add("d-flex", "flex-column", msg.sender_id === currentUuid ? "align-items-end" : "align-items-start", "mb-3", "msg-container");

            const timeMessage = document.createElement("p");
            timeMessage.classList.add("mb-0", "text-nowrap", "time-hover");

            const userLocale = navigator.language || "en-PH";

            const localTime = new Intl.DateTimeFormat(userLocale, {
                dateStyle: "medium",
                timeStyle: "short",
            }).format(new Date(msg.created_at));

            timeMessage.textContent = localTime;
            timeMessage.style.color = "#a6abb1";
            timeMessage.style.fontSize = "13px";

            // added braces so the every element doenst conflict on my switch lol
            switch (msg.type) {
                case "text": {
                    const message = document.createElement("p");

                    message.classList.add("mb-0", msg.sender_id === currentUuid ? "bg-primary" : "some-class", "p-2");
                    message.style.borderRadius = "5px";
                    if (msg.sender_id !== currentUuid) {
                        message.style.backgroundColor = "#4d4d4d";
                    }
                    message.style.whiteSpace = "pre-wrap";
                    message.style.wordBreak = "break-word";
                    message.style.maxWidth = "90%";
                    message.textContent = msg.message;

                    div.append(timeMessage, message);
                    break;
                }
                case "image": {
                    const image = document.createElement("img");

                    image.src = signedUrlMap[msg.storage_path] || "";
                    image.style.borderRadius = "10px";
                    image.loading = "eager";
                    image.decoding = "async";
                    image.style.width = "250px";
                    image.addEventListener("load", () => {
                        scrollMessageContainerToBottom(messageContainer);
                    });

                    div.append(timeMessage, image);

                    break;
                }
                case "file": {
                    const link = document.createElement("p");

                    link.classList.add("mb-0", "bg-primary", "p-2");
                    link.style.borderRadius = "5px";
                    link.style.maxWidth = "90%";

                    const anchor = document.createElement("a");
                    anchor.style.color = "#DEE3E9";
                    anchor.href = signedUrlMap[msg.storage_path] || "#";
                    anchor.textContent = msg.file_name;
                    anchor.target = "_blank";
                    link.append(anchor);

                    div.append(timeMessage, link);
                    break;
                }
                case "video": {
                    const video = document.createElement("video");

                    video.style.borderRadius = "10px";
                    video.style.width = "300px";
                    video.controls = true;
                    video.preload = "metadata";
                    video.addEventListener("loadedmetadata", () => {
                        scrollMessageContainerToBottom(messageContainer);
                    });

                    const source = document.createElement("source");
                    source.src = signedUrlMap[msg.storage_path] || "";

                    // allows any videos to fetch such as .webm video  
                    source.type = msg.mime_type || "video/mp4";

                    video.append(source);
                    div.append(timeMessage, video);
                    break;
                }
                case "audio": {
                    const audio = document.createElement("audio");

                    audio.controls = true;
                    audio.preload = "metadata";
                    audio.addEventListener("loadedmetadata", () => {
                        scrollMessageContainerToBottom(messageContainer);
                    });

                    const source = document.createElement("source");
                    source.src = signedUrlMap[msg.storage_path] || "";

                    // allows any videos to fetch such as .ogg/.wav for audio
                    source.type = msg.mime_type || "audio/mpeg";

                    audio.append(source);
                    div.append(timeMessage, audio);
                    break;
                }
                default: {
                    const message = document.createElement("p");

                    message.classList.add("mb-0", "bg-primary", "p-1");
                    message.style.borderRadius = "5px";
                    message.style.whiteSpace = "pre-wrap";
                    message.style.wordBreak = "break-word";
                    message.style.maxWidth = "90%";
                    message.textContent = "Error Message";

                    div.append(timeMessage, message);
                }
            }

            fragment.appendChild(div);
        });
        messageContainer.replaceChildren(fragment);
        scrollMessageContainerToBottom(messageContainer);
    }

}

function showChatsMobile() {
    const middleContent = document.querySelector(".middle");
    const sidebarLeft = document.querySelector(".sidebar-left");
    const sidebarRight = document.querySelector(".sidebar-right");

    if (middleContent) middleContent.style.display = "none";
    if (sidebarLeft) sidebarLeft.style.display = "none";
    if (sidebarRight) sidebarRight.style.display = "flex";
}

function backButtonMobile() {
    const middleContent = document.querySelector(".middle");
    const sidebarLeft = document.querySelector(".sidebar-left");
    const sidebarRight = document.querySelector(".sidebar-right");

    if (middleContent) middleContent.style.display = "";
    if (sidebarLeft) sidebarLeft.style.display = "";
    if (sidebarRight) sidebarRight.style.display = "";

    const content2 = document.querySelector(".sidebar-right .content-2");
    if (content2) content2.classList.remove("is-visible");
}

function handleDeviceChange(event) {
    if (event.matches) {
        isMobile = true;
    } else {
        isMobile = false;

        const els = document.querySelectorAll(".middle, .sidebar-left, .sidebar-right");
        els.forEach(el => {
            el.style.display = "";
        });

        const content2 = document.querySelector(".sidebar-right .content-2");
        const content1 = document.querySelector(".sidebar-right .content-1");
        if (content2) content2.classList.remove("is-visible");
        if (content1) content1.style.display = "";
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


let presenceChannel = null;

function updateFriendStatus(isOnline) {
    const statusText = document.getElementById("friend-online-status");
    const onlineIcon = document.getElementById("online-icon");

    if (!statusText) {
        return;
    }
    if (!onlineIcon) {
        return
    }

    onlineIcon.style.height = "10px";
    onlineIcon.style.width = "10px";
    onlineIcon.style.borderRadius = '50%';
    onlineIcon.style.marginRight = "3px";
    onlineIcon.style.marginTop = "5px";

    if (isOnline) {
        statusText.textContent = "Currently Online";
        onlineIcon.style.background = "green";
        onlineIcon.style.border = "1px solid green";

    } else {
        statusText.textContent = "Currently Offline";
        onlineIcon.style.background = "lightgray";
        onlineIcon.style.border = "1px solid lightgray";
    }
}

function refreshFriendPresence() {
    if (!presenceChannel || !currentChatUuid) return;

    const state = presenceChannel.presenceState();
    const activeUsers = Object.values(state).flat();

    const friendIsOnline = activeUsers.some((presence) => presence.user_id === currentChatUuid);
    updateFriendStatus(friendIsOnline);
}

async function subscribeToPresence() {
    if (presenceChannel) {
        await supabaseClient.removeChannel(presenceChannel);
    }

    presenceChannel = supabaseClient
        .channel("presence-lobby")
        .on("presence", { event: "sync" }, () => {
            refreshFriendPresence();
        })
        .subscribe(async (status) => {
            if (status === "SUBSCRIBED") {
                await presenceChannel.track({
                    user_id: currentUuid,
                    username: currentChatUsername,
                    online_at: new Date().toISOString()
                });
            }
        });
}

document.addEventListener("DOMContentLoaded", async () => {
    // safe-area timing bug — env() values aren't ready on cold launch
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.body.style.display = 'none';
            // eslint-disable-next-line no-unused-expressions
            document.body.offsetHeight; // force reflow
            document.body.style.display = '';
        });
    });

    const session = await checkUserSession();

    handleDeviceChange(mediaQuery);
    mediaQuery.addEventListener("change", handleDeviceChange);

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

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    userMessage.addEventListener('keydown', function (event) {
        if (!isMobile) {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
            }
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
            displayChatFriends(results, currentUuid);
        });
    }

    const fileButton = document.getElementById("btn-message-files");
    const fileInput = document.getElementById("message-files");

    fileButton.addEventListener("click", () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async function () {
        if (this.files.length === 0) return;

        const file = this.files[0];

        const fileName = file.name.toLowerCase();
        const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.msi', '.com', '.scr', '.vbs'];
        const isDangerous = dangerousExtensions.some(ext => fileName.endsWith(ext));

        if (isDangerous) {
            showPopUp("Executable and script files are not allowed");
            this.value = "";
            return;
        }

        let customType = "file";

        if (file.type.startsWith('image/')) {
            customType = "image";
        } else if (file.type.startsWith('video/')) {
            customType = "video";
        } else if (file.type.startsWith('audio/')) {
            customType = "audio";
        }

        if (customType === "image") {
            if (file.size > 20 * 1024 * 1024) {
                showPopUp("Image is too large! Maximum raw size allowed is 20MB.");
                this.value = "";
                return;
            }

            compressImage(file, customType);
            return;
        } else if (customType === "video") {
            if (file.size > 25 * 1024 * 1024) {
                showPopUp("Video must be less than 25MB.");
                this.value = "";
                return;
            }

        } else {
            if (file.size > 15 * 1024 * 1024) {
                showPopUp("File must be less than 15MB.");
                this.value = "";
                return;
            }
        }

        fileButton.disabled = true;
        await uploadFile(file, customType);
        fileButton.disabled = false;
        this.value = "";
    });

    async function compressImage(file, customType) {

        const options = {
            maxSizeMB: 1,
            useWebWorker: true,
            maxIteration: 2
        };

        try {
            const compressedFile = await imageCompression(file, options);

            uploadFile(compressedFile, customType)
        } catch (error) {
            throw error;
        }
    }

    async function uploadFile(file, customType) {
        const fileName = file.name.toLowerCase();
        const filePath = `uploads/${Date.now()}-${file.name}`;


        const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('chat_files')
            .upload(filePath, file);

        if (uploadError) {
            console.error("Upload Error:", uploadError.message);
            return;
        }

        showPopUp("File Has Been Sent.");

        const { data, error: insertError } = await supabaseClient
            .from('messages')
            .insert([
                {
                    sender_id: currentUuid,
                    receiver_id: currentChatUuid,
                    conversation_id: currentConversationUuid,
                    type: customType,
                    file_name: fileName,
                    storage_path: uploadData.path
                },
            ])
            .select()

        if (insertError) {
            console.error("Upload Error:", insertError.message);
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
                await checkFriendStatus();
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