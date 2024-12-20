import {MongoClient} from "mongodb";

const dbUpdate = async (dbName, collectionName, updateStatement) => {

  const uri =
    "mongodb+srv://anthony-ss:RcU1pNmJe80VgdaB@serverlessinstance0.psulp.mongodb.net/?retryWrites=true&w=majority";

  const client = new MongoClient(uri);
  await client.connect();
  const database = client.db(dbName); 
  const collection = database.collection(collectionName);

  try {

    const updateResult = await collection.bulkWrite(updateStatement);

    return updateResult;
    
  } catch (err) {
    console.error(`Something went wrong: ${err}\n`);
  } finally {
    // Close the connection after the operation completes
    await client.close();
  }
   

}

export default dbUpdate;
// exports.dbInsert = dbInsert;