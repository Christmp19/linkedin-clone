"use server";

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { MongoClient, GridFSBucket } from 'mongodb';
import { AddPostRequestBody } from '@/app/api/posts/route';
import { currentUser } from '@clerk/nextjs/server';
import { IUser } from '../types/user';
import { Post } from '../mongodb/models/post';
import { createReadStream, createWriteStream } from 'fs';
import { resolve, extname } from 'path';

export default async function createPostAction(formData: FormData) {
    // Récupérer les données de l'utilisateur et du formulaire
    const user = await currentUser();
    console.log('Current user:', user);
    const postInput = formData.get('postInput') as string;
    console.log('Post input:', postInput);
    const image = formData.get('image') as File;
    console.log('Image file:', image)

    // Vérifier si le champ de texte du post est vide
    if (!postInput) {
        throw new Error('Post input is required');
    }

    // Vérifier si l'utilisateur est authentifié
    if (!user?.id) {
        throw new Error('User not authenticated');
    }

    // Construire l'objet utilisateur pour la base de données
    const userDB: IUser = {
        userId: user.id,
        userImage: user.imageUrl,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
    };

    try {
        // Vérifier si une image a été téléchargée
        if (image) {
            console.log('Uploading image to MongoDB Atlas GridFS...');

            // Sauvegarder le fichier sur le serveur
            const imagePath = await saveFileLocally(image);
            console.log(image);

            // Appeler la fonction d'envoi de l'image avec le chemin d'accès local
            const imageUrl = await uploadImageToMongoDB(imagePath);
            console.log('File uploaded successfully!', imageUrl);

            // Créer l'objet de post avec l'image téléchargée
            const body: AddPostRequestBody = {
                user: userDB,
                text: postInput,
                imageUrl: imageUrl,
            };

            // Créer le post dans la base de données MongoDB
            await Post.create(body);
            console.log(body);
        } else {
            // Créer l'objet de post sans image
            const body: AddPostRequestBody = {
                user: userDB,
                text: postInput,
            };

            // Créer le post dans la base de données MongoDB
            await Post.create(body);
            console.log(body);
        }
    } catch (error: any) {
        // Gérer les erreurs
        console.log('Error:', error);
        throw new Error('Failed to create post', error);
    }
}

async function saveFileLocally(file: File): Promise<string> {
    const uploadDir = resolve('public', 'images'); // Définir le dossier de téléchargement
    const fileName = `${randomUUID()}_${file.name}`; // Générer un nom de fichier unique
    const filePath = resolve(uploadDir, fileName); // Construire le chemin d'accès complet

    // Lire le contenu du fichier sous forme d'ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Créer un flux d'écriture pour sauvegarder le fichier
    const writeStream = createWriteStream(filePath);

    // Convertir l'ArrayBuffer en Buffer et l'écrire dans le flux d'écriture
    writeStream.write(Buffer.from(arrayBuffer));

    // Retourner une promesse qui résout avec le chemin d'accès local du fichier sauvegardé
    return new Promise<string>((resolve, reject) => {
        writeStream.on('finish', () => resolve(filePath)); // Résoudre la promesse lorsque l'écriture est terminée
        writeStream.on('error', reject); // Rejeter la promesse en cas d'erreur d'écriture
    });
}

async function uploadImageToMongoDB(imagePath: string): Promise<string> {
    const uri = 'mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.jw7h1go.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB Atlas');

        const db = client.db('cluster0');
        const bucket = new GridFSBucket(db);

        const timestamp = new Date().getTime();
        const extension = extname(imagePath); // Récupérer l'extension du fichier d'image
        const file_name = `${randomUUID()}_${timestamp}${extension}`;
        // const file_name = `${randomUUID()}_${timestamp}.png`;

        const uploadStream = bucket.openUploadStream(file_name);
        const readStream = createReadStream(imagePath);

        return new Promise<string>((resolve, reject) => {
            readStream.on('data', (chunk) => {
                const buffer = Buffer.from(chunk);
                uploadStream.write(buffer, (error) => {
                    if (error) {
                        reject(error);
                    }
                });
            });

            readStream.on('end', async () => {
                await uploadStream.end();
                const imageUrl = `https://cluster0.mongodb.net/gridfs/${file_name}`;
                console.log('Image uploaded successfully!', imageUrl);
                resolve(imageUrl);
            });

            readStream.on('error', (error) => {
                reject(error);
            });
        });
    } catch (error) {
        console.error('Failed to upload image to MongoDB Atlas', error);
        throw error;
    } finally {
        await client.close();
        console.log('Disconnected from MongoDB Atlas');
    }
}

revalidatePath('/');