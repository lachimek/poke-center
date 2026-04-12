"use server";

import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export type RegisterState = {
	error?: string;
	success?: boolean;
};

export async function register(
	_prev: RegisterState,
	formData: FormData,
): Promise<RegisterState> {
	const email = formData.get("email") as string | null;
	const password = formData.get("password") as string | null;

	if (!email || !password) {
		return { error: "Email and password are required." };
	}

	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		return { error: "Invalid email address." };
	}

	if (password.length < 8) {
		return { error: "Password must be at least 8 characters." };
	}

	const [existing] = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, email))
		.limit(1);

	if (existing) {
		return { error: "An account with this email already exists." };
	}

	const passwordHash = await hash(password, 12);

	await db.insert(users).values({ email, passwordHash });

	return { success: true };
}
