import getMongoClient from "./client.js";
import { logMemoryUsage } from "../functions/logMemoryUsage.js";
// const {MongoClient} = require('mongodb');

const dbInsertSignUp = async (dbName, collectionName, programId, bonus, referralLink) => {

  logMemoryUsage(`dbInsertSignUp:start:${programId}`);
  const client = await getMongoClient();
  const database = client.db(dbName);
  const collection = database.collection(collectionName);

  try {
    await collection.findOneAndUpdate({programId: programId}, { $set: {bonusAmount: bonus, ...referralLink && {link: referralLink} } });
    console.log(`document successfully updated.\n`);
    logMemoryUsage(`dbInsertSignUp:complete:${programId}`);
  } catch (err) {
    console.error(`Something went wrong trying to insert the new documents: ${err}\n`);
  }

}

export default dbInsertSignUp;