import {MongoClient} from "mongodb";

const dbUpdateCategory = async (dbName, collectionName, programId, storeId, categories) => {

  const uri =
    "mongodb+srv://anthony-ss:RcU1pNmJe80VgdaB@serverlessinstance0.psulp.mongodb.net/?retryWrites=true&w=majority";

  const client = new MongoClient(uri);
  await client.connect();
  const database = client.db(dbName);
  const collection = database.collection(collectionName);

  try {
    await collection.findOneAndUpdate({program: programId, storeId: storeId}, { $addToSet: { categories:
      {
          $each: categories
      }} });
    console.log(`document successfully updated.\n`);
  } catch (err) {
    console.error(`Something went wrong trying to insert the new documents: ${err}\n`);
  }

}

export default dbUpdateCategory;
