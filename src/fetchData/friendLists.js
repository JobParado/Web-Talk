// Current friend list Main Chat
export function displayChatFriends(acceptedFriends, currentUuid) {
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
		listItem.className = "list-group-item d-flex justify-content-between align-items-center current-chat";

		const otherUsername = friendRow.user_id === currentUuid
			? friendRow.receiver_username
			: friendRow.sender_username;

		const infoWrapper = document.createElement("div");
		infoWrapper.className = "d-flex align-items-center gap-2";

		const friendWrapper = document.createElement("div");
		friendWrapper.style.display = "flex";
		friendWrapper.style.flexDirection = "column";

		const tapToOpenChat = document.createElement("span");
		tapToOpenChat.textContent = "Tap Message To Chat";
		tapToOpenChat.className = "tap-to-open-chat";

		const friendIcon = document.createElement("div");
		friendIcon.classList.add("friend-icon","no-type-cursor") ;
		friendIcon.textContent = otherUsername[0].toUpperCase();

		const usernameText = document.createElement("span");
		usernameText.className = "current-chat-friends";
		usernameText.textContent = otherUsername;

		friendWrapper.appendChild(usernameText);
		friendWrapper.appendChild(tapToOpenChat);

		infoWrapper.appendChild(friendIcon);
		infoWrapper.appendChild(friendWrapper);

		const messageButton = document.createElement("button");
		messageButton.type = "button";
		messageButton.className = "btn btn-primary btn-sm";
		messageButton.textContent = "Message";
		messageButton.dataset.action = "message";
		messageButton.dataset.requestId = friendRow.id;

		const targetUserUuid = friendRow.user_id === currentUuid ? friendRow.friend_id : friendRow.user_id;
		messageButton.dataset.targetUserId = targetUserUuid;
		messageButton.dataset.targetUsername = otherUsername;

		listItem.appendChild(infoWrapper);
		listItem.appendChild(messageButton);
		chatList.appendChild(listItem);
	});
}

// Current Friends
export function displayCurrentFriends(acceptedFriends, currentUuid) {
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

// Add new Friends list
export function displaySearchResults(users, emptyMessage = "No users found") {
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

// Incoming Friend Requests
export function displayFriendRequests(requests, currentUuid) {
	const requestList = document.getElementById("friend-request-list");

	if (!requestList) {
		console.error("friend-request-list not found");
		return;
	}

	requestList.textContent = "";

	if (!requests || requests.length === 0) {
		const emptyItem = document.createElement("li");
		emptyItem.className = "list-group-item text-muted";
		emptyItem.textContent = "No incoming friend requests";
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
