import {MongoClient} from "mongodb";
// const {MongoClient} = require('mongodb');

const dbInsertSignUp = async (dbName, collectionName, programId, bonus, referralLink) => {

  const uri =
    "mongodb+srv://anthony-ss:RcU1pNmJe80VgdaB@serverlessinstance0.psulp.mongodb.net/?retryWrites=true&w=majority";

  const client = new MongoClient(uri);
  await client.connect();
  const database = client.db(dbName);
  const collection = database.collection(collectionName);

  try {
    await collection.findOneAndUpdate({programId: programId}, { $set: {bonusAmount: bonus, ...referralLink && {link: referralLink} } });
    console.log(`document successfully updated.\n`);
  } catch (err) {
    console.error(`Something went wrong trying to insert the new documents: ${err}\n`);
  }

}

export default dbInsertSignUp;