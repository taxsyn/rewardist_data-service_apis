import {MongoClient} from 'mongodb';

const dbInsert = async (dbName, collectionName, program, data) => {

  const uri =
    "mongodb+srv://anthony-ss:RcU1pNmJe80VgdaB@serverlessinstance0.psulp.mongodb.net/?retryWrites=true&w=majority";

  const client = new MongoClient(uri);
  await client.connect();
  const database = client.db(dbName);
  const collection = database.collection(collectionName);

  try {
    await collection.deleteMany({ program: program });
    const insertManyResult = await collection.insertMany(data);
    console.log(`${insertManyResult.insertedCount} documents successfully inserted.\n`);
  } catch (err) {
    console.error(`Something went wrong trying to insert the new documents: ${err}\n`);
  }

}

export default dbInsert;
// exports.dbInsert = dbInsert;