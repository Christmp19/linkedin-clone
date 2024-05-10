import fs from 'fs';
import { GridFSBucket, MongoClient } from 'mongodb';

const uri = 'mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.jw7h1go.mongodb.net/Cluster0';
const client = new MongoClient(uri);

interface FileInfo {
  name: string;
  size: number;
  // Ajoutez d'autres propriétés si nécessaire
}

async function saveFileToGridFS(fileName: string, filePath: string) {
  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas');

    const db = client.db('Cluster0');
    const gridFSBucket = new GridFSBucket(db);

    const fileStream = fs.createReadStream(filePath);
    const uploadStream = gridFSBucket.openUploadStream(fileName);

    fileStream.pipe(uploadStream);

    return new Promise<FileInfo>((resolve, reject) => {
      let totalBytesWritten = 0;

      uploadStream.on('data', (chunk: any) => {
        totalBytesWritten += chunk.length;
      });

      uploadStream.on('close', () => {
        const fileInfo: FileInfo = {
          name: uploadStream.filename,
          size: totalBytesWritten,
        };
        console.log('File uploaded successfully:', fileInfo);
        resolve(fileInfo);
      });
      uploadStream.on('error', (error) => {
        console.error('Error uploading file:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('Failed to upload file to MongoDB Atlas:', error);
    throw error;
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB Atlas');
  }
}

// Exemple d'utilisation
saveFileToGridFS('public', 'images');