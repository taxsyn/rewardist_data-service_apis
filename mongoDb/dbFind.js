import getMongoClient from "./client.js";
import { logMemoryUsage } from "../functions/logMemoryUsage.js";

const dbFind = async (dbName, collectionName, criteria, project) => {

  logMemoryUsage(`dbFind:start:${collectionName}`);
  const client = await getMongoClient();
  const database = client.db(dbName); 
  const collection = database.collection(collectionName);

  try {

    const results = await collection.find(criteria).project(project).toArray();
    logMemoryUsage(`dbFind:complete:${collectionName}`);
    return results;
    
  } catch (err) {
    console.error(`Something went wrong: ${err}\n`);
  }

}

export default dbFind;
// exports.dbInsert = dbInsert;