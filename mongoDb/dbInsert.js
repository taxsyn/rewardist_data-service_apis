import {MongoClient} from "mongodb";
// const {MongoClient} = require('mongodb');

const dbInsert = async (dbName, collectionName, program, storeOffers) => {

  const uri =
    "mongodb+srv://anthony-ss:RcU1pNmJe80VgdaB@serverlessinstance0.psulp.mongodb.net/?retryWrites=true&w=majority";

  const client = new MongoClient(uri);
  await client.connect();
  const database = client.db(dbName); 
  const collection = database.collection("storeOffers"); //* change "storeOffers" to collectionName if reverting

  const platformNames = { 
    qantas: "Qantas Shopping",
    velocity: "Velocity eStore",
    emirates: "Emirates Miles Mall",
    united: "United MileagePlus Shopping",
    amex: "MyAmexShop",
    cashrewards: "Cashrewards",
    shopback: "ShopBack",
    kickback: "Kickback",
    topcashback: "TopCashback"
  }

  try {

    const storeIds = storeOffers.map(storeOffer => storeOffer.storeId);

    const existingStores = await collection.find({storeId: {$in: storeIds}}).toArray();
    const existingStoreIds = existingStores.map(existingStore => existingStore.storeId);

    const updatedStores = existingStores.map(existingStore => {
      const storeOffer = storeOffers.find(storeOffer => storeOffer.storeId === existingStore.storeId);
      storeOffer.programName = platformNames[program];
      const updatedOffers = [...existingStore.offers.filter(offer => offer.program != storeOffer.program), storeOffer] 
      const updatedCategories = updatedOffers.filter(updatedOffer => updatedOffer.categories).map(updatedOffer => updatedOffer.categories).flat();

      const highestOffer = updatedOffers?.sort((a, b) => a.reward - b.reward).slice().pop();
      const highestReward = highestOffer.reward;
      const highestRewardType = highestOffer.rewardType;
      const highestRewardIsBonusPointsOnly = highestOffer.isBonusPointsOnly;
      const highestRewardIsUpTo = highestOffer.isUpTo;
      const highestWasRewardDiff = updatedOffers?.sort((a, b) => a.wasRewardDiff - b.wasRewardDiff).slice().pop()?.wasRewardDiff || 0;

      const filteredCategories = updatedCategories.reduce((accumulator, current) => {
        if (!accumulator.find((cat) => cat.catId === current.catId)) {
          accumulator.push(current);
        }
        return accumulator;
      }, []);
      return {
        ...existingStore,
        offers: updatedOffers,
        categories: filteredCategories,
        highestReward: highestReward,
        highestRewardType: highestRewardType,
        highestWasRewardDiff: highestWasRewardDiff,
        highestRewardIsBonusPointsOnly: highestRewardIsBonusPointsOnly,
        highestRewardIsUpTo: highestRewardIsUpTo,
        containsCashbackOffer: updatedOffers.some(offer => offer.rewardType === "cashback"),
        containsPointsOffer: updatedOffers.some(offer => offer.rewardType === "points")
      }
    });

    const newStores = storeOffers.filter(storeOffer => !existingStoreIds.includes(storeOffer.storeId)).map(storeOffer => {

      const highestReward = storeOffer.reward;
      const highestRewardType = storeOffer.rewardType;
      const highestWasRewardDiff = storeOffer.wasRewardDiff || 0;
      const highestRewardIsBonusPointsOnly = storeOffer.isBonusPointsOnly;
      const highestRewardIsUpTo = storeOffer.isUpTo;
      const platformName = platformNames[program];

      const newStore = {
        storeId: storeOffer.storeId,
        name: storeOffer.storeName,
        categories: storeOffer.categories || [],
        containsPointsOffer: storeOffer.rewardType === "points",
        containsCashbackOffer: storeOffer.rewardType === "cashback",
        offers: [storeOffer],
        highestReward: highestReward,
        highestRewardType: highestRewardType,
        highestWasRewardDiff: highestWasRewardDiff,
        highestRewardIsBonusPointsOnly: highestRewardIsBonusPointsOnly,
        highestRewardIsUpTo: highestRewardIsUpTo
      }
      return newStore;
    });

    const existingAndNewStores = [...updatedStores, ...newStores];

    const replaceStatement = updatedStores.map(store => {
        return { replaceOne: {
          "filter": { "storeId": store.storeId },
          "replacement": store
        } }
    })

    const insertStatement = newStores.map(store => {
      return { 
        insertOne: store
      }
    })
    
    if (replaceStatement.length > 0) {
      await collection.bulkWrite(replaceStatement);
    }

    if (insertStatement.length > 0) {
      await collection.bulkWrite(insertStatement);
    }

    // Delete any orphan offers

    const allProgramStores = await collection.find({ "offers.program" : program }).toArray();

    const orphanOffers = allProgramStores.filter(store => !storeIds.includes(store.storeId));
    const orphanStores = orphanOffers.filter(store => store.offers.length < 2);
    
    const removeOfferStatement = orphanOffers.map(({_id, ...store}) => {
      return { updateOne: {
        "filter": { "storeId": store.storeId },
        "update": { $pull: { "offers" : { "program" : program}} }
      } }
    });

    if (removeOfferStatement.length > 0) {
      await collection.bulkWrite(removeOfferStatement);
    }

    const deleteStatement = orphanStores.map(store => {
      return { 
        deleteOne: {"filter":  { storeId: store.storeId }}
      }
    })

    console.log("DB Insert Complete");

    if (deleteStatement.length > 0)   {
      await collection.bulkWrite(deleteStatement);
    }

    // await collection.deleteMany({ program: program });
    // const insertManyResult = await collection.insertMany(storeOffers);
    // console.log(`${insertManyResult.insertedCount} documents successfully inserted.\n`);
  } catch (err) {
    console.error(`Something went wrong trying to insert the new documents: ${err}\n`);
  }

}

export default dbInsert;
// exports.dbInsert = dbInsert;