import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI;  // we’ll store connection string in .env
const client = new MongoClient(uri);

let db;

export async function connectToDB() {
  if (db) return db; // if already connected, return existing db

  try {
    await client.connect();
    db = client.db("bookaway"); //  database name
    console.log("Connected to MongoDB");
    return db;
  } catch (error) {
    console.error("MongoDB connection failed:", error);
  }
}
