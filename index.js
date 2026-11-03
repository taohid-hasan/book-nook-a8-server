import express from "express";
import cors from "cors";
import { MongoClient } from 'mongodb';
import 'dotenv/config'

dotenv.config();
const app = express();
const port = process.env.PORT || 5000;


// Middare
app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_URI);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const connectClient = await connectToMongoDB();
const db = connectClient.db("book-nook-a8-server");



app.get("/", (req, res) => {
  res.send("hello woeld");
})


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});