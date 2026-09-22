import getMongoClient from "./client.js";
import { logMemoryUsage } from "../functions/logMemoryUsage.js";

const dbUpdate = async (dbName, collectionName, updateStatement) => {

  logMemoryUsage(`dbUpdate:start:${collectionName}`);
  const client = await getMongoClient();
  const database = client.db(dbName); 
  const collection = database.collection(collectionName);

  try {

    const updateResult = await collection.bulkWrite(updateStatement);

    logMemoryUsage(`dbUpdate:complete:${collectionName}`);
    return updateResult;
    
  } catch (err) {
    console.error(`Something went wrong: ${err}\n`);
  }
   

}

export default dbUpdate;
// exports.dbInsert = dbInsert;