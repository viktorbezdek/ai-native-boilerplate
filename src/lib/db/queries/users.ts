import { eq } from "drizzle-orm";
import { db } from "../index";
import { type NewUser, type User, users } from "../schema";

/**
 * Get a user by their ID
 */
export async function getUserById(id: string): Promise<User | undefined> {
  const result = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  return result;
}

/**
 * Get a user by their email
 */
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const result = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });
  return result;
}

/**
 * Create a new user
 */
export async function createUser(data: NewUser): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({
      ...data,
      email: data.email.toLowerCase(),
    })
    .returning();

  if (!user) {
    throw new Error("Failed to create user");
  }

  return user;
}

/**
 * Update a user
 */
export async function updateUser(
  id: string,
  data: Partial<NewUser>
): Promise<User> {
  const [user] = await db
    .update(users)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))
    .returning();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

/**
 * Delete a user
 */
export async function deleteUser(id: string): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}

/**
 * Get a user with their subscription
 */
export async function getUserWithSubscription(id: string) {
  const result = await db.query.users.findFirst({
    where: eq(users.id, id),
    with: {
      subscription: true,
    },
  });
  return result;
}
