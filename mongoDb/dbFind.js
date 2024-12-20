import {MongoClient} from "mongodb";

const dbFind = async (dbName, collectionName, criteria, project) => {

  const uri =
    "mongodb+srv://anthony-ss:RcU1pNmJe80VgdaB@serverlessinstance0.psulp.mongodb.net/?retryWrites=true&w=majority";

  const client = new MongoClient(uri);
  await client.connect();
  const database = client.db(dbName); 
  const collection = database.collection(collectionName);

  try {

    return await collection.find(criteria).project(project).toArray();
    
  } catch (err) {
    console.error(`Something went wrong: ${err}\n`);
  }

}

export default dbFind;
// exports.dbInsert = dbInsert;