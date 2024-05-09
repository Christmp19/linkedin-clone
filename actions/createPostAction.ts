'use server'

import { currentUser } from "@clerk/nextjs/server"

export default async function createPostAction(formData:FormData) {
    const user = await currentUser();

    if (!user) {
        throw new Error('User not authenticated');
    }

    const postInput = formData.get('postInput') as string;
    const image = formData.get('image') as File;
    let imageURL: string | undefined;

    if (!postInput) {
        throw new Error('Post input is required');
    }

    // define user

    // upload image if there is one

    // create post in database

    // revalidatePath '/' - home page
}