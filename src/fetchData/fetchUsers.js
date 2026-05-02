import { supabaseClient } from "../config/supabaseClient.js";


async function fetchUsers() {
	try {
		const { data: authData, error: authError } = await supabaseClient.auth.getUser();

		if (authError || !authData.user) {
			console.error("Not logged in:", authError);
			return [];
		}

		const currentUserId = authData.user.id;

		const { data: users, error } = await supabaseClient
			.from("profiles")
			.select("id, username")
			.neq("id", currentUserId)
			.order("username", { ascending: true });

		if (error) {
			console.error("Error fetching users:", error);
			return [];
		}

		return users || [];
	} catch (error) {
		console.error("Unexpected error:", error);
		return [];
	}
}

export { fetchUsers };
