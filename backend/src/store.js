import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

const initialDataPath = fileURLToPath(new URL('../data/initial-store.json', import.meta.url));
const localStorePath = fileURLToPath(new URL('../data/store.json', import.meta.url));
const collectionNames = ['categories', 'products', 'blogs', 'banners'];
let client;
let database;

export function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function initializeStore() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Thiếu MONGODB_URI. Hãy cấu hình chuỗi kết nối MongoDB Atlas trong backend/.env.');
  }

  client = new MongoClient(uri);
  await client.connect();
  database = client.db(process.env.MONGODB_DB || 'bhgarage');

  const initialData = JSON.parse(await readFile(initialDataPath, 'utf8'));
  const emptyCollections = [];
  for (const name of collectionNames) {
    const collection = database.collection(name);
    const existingDocument = await collection.findOne({}, { projection: { _id: 1 } });
    if (process.env.VERCEL !== '1') {
      await collection.createIndex({ slug: 1 }, { unique: true });
      if (!existingDocument) emptyCollections.push(name);
    }
  }

  let localData;
  if (emptyCollections.length > 0) {
    try {
      localData = JSON.parse(await readFile(localStorePath, 'utf8'));
      for (const name of collectionNames) {
        if (!Array.isArray(localData[name])) {
          throw new Error(`Dữ liệu ${name} trong store.json không hợp lệ.`);
        }
      }
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }

  for (const name of emptyCollections) {
    const collection = database.collection(name);
    const seedData = localData ? localData[name] : initialData[name];
    if (seedData.length > 0) {
      await collection.insertMany(seedData);
    }
  }

  await database.collection('users').createIndex({ email: 1 }, { unique: true });
  await database.collection('orders').createIndex({ id: 1 }, { unique: true });
  await database.collection('orders').createIndex({ userId: 1, createdAt: -1 });
}

export function getCollection(name) {
  if (!database) {
    throw new Error('MongoDB chưa được khởi tạo.');
  }
  return database.collection(name);
}

export async function readStore() {
  const collections = await Promise.all(
    collectionNames.map((name) =>
      getCollection(name).find({}, { projection: { _id: 0 } }).toArray(),
    ),
  );
  return Object.fromEntries(collectionNames.map((name, index) => [name, collections[index]]));
}

export async function pingStore() {
  if (!database) {
    throw new Error('MongoDB chưa được khởi tạo.');
  }
  await database.command({ ping: 1 });
}

export async function closeStore() {
  if (client) {
    await client.close();
    client = undefined;
    database = undefined;
  }
}

export function newId() {
  return randomUUID();
}
