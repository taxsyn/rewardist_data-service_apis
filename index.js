import dbInsert from './mongoDb/dbInsert.js';

export async function getCashrewards(req, res) {
  const response = await fetch("https://api-prod.cashrewards.com.au/api/v1/merchants/all-stores?limit=3000&offset=0");
  const storeResponse = await response.json();
  const storeData = storeResponse.Data;
  
  const stores = [];

  for (let store of storeData) {

    if (store.Online) {

        const programUrl = `https://www.cashrewards.com.au/store/${store.HyphenatedString}`;
        const storeName = store.Name;
        const storeId = storeName.replace(" AU","").replace(" Australia","").toLowerCase().replaceAll(/[^a-zA-Z0-9 ]/g, "").replaceAll(" ","");
        const isBonusPointsOnly = store.CommissionString.includes("$");
        const isUpTo = store.CommissionString.includes("Up to")
        const reward = store.ClientCommission;

        
        const storeObject = {
            program: 'cashrewards',
            programUrl,
            storeName,
            storeId,
            reward,
            rewardType: 'cashback',
            isBonusPointsOnly,
            isUpTo
        }

        stores.push(storeObject);

    }
  }

  const boostedResponse = await fetch("https://www.cashrewards.com.au/api/offers/v1/Offers?clientId=1000000&includeAds=true");
  const boostedStoreResponse = await boostedResponse.json();
  const boostedStoreData = boostedStoreResponse.data;

  const boostedStores = boostedStoreData.map((store) => {

    const storeName = store.merchant.name;
    const storeId = storeName.replace(" AU","").replace(" Australia","").toLowerCase().replaceAll(/[^a-zA-Z0-9 ]/g, "").replaceAll(" ","");
    const wasReward = Number(store.wasRate && store.wasRate?.match(/\d+\.?\d?/g)[0]);

    const endDate = new Date(store.endDateTime).getTime();
    const now = new Date().getTime();
    const isBonus = now < endDate && ((endDate - now) < 604800000); // End date less than 7 days

    const boostedObject = {
      storeName,
      storeId,
      isBonus
    }

    if (wasReward) {

        const wasRewardText = store.wasRate.toLowerCase();
        const wasRewardIsUpTo = wasRewardText.includes("up to");
        const wasRewardIsBonusPointsOnly = wasRewardText.includes("$");

        boostedObject.wasReward = wasReward;
        boostedObject.wasRewardIsUpTo = wasRewardIsUpTo;
        boostedObject.wasRewardIsBonusPointsOnly = wasRewardIsBonusPointsOnly;

    }
     
    if (isBonus) {
        return boostedObject;
    }
  }).filter(store => store);

  for (let boostedStore of boostedStores) {

    const storeIndex = stores.findIndex((store) => {
      return store.storeId === boostedStore.storeId;
    });

    if (boostedStore.wasReward) {
      stores[storeIndex].wasReward = boostedStore.wasReward;
      stores[storeIndex].wasRewardIsUpTo = boostedStore.wasRewardIsUpTo;
      stores[storeIndex].wasRewardIsBonusPointsOnly = boostedStore.wasRewardIsBonusPointsOnly;   
      stores[storeIndex].wasRewardDiff = parseFloat((((stores[storeIndex].reward - boostedStore.wasReward) / wasReward) * 100).toFixed(2));
    }
    stores[storeIndex].isBonus = boostedStore.isBonus;   
  } 


  // Get Categories

  const catMap = [
    { catId: "marketplaces", catName: "Marketplaces", platformCat: 540 },
    { catId: "travel-experiences", catName: "Travel & Experiences", platformCat: 542 },
    { catId: "travel-experiences", catName: "Travel & Experiences", platformCat: 530 },
    { catId: "home-kids", catName: "Home & Kids", platformCat: 537 },
    { catId: "home-kids", catName: "Home & Kids", platformCat: 531 },
    { catId: "services", catName: "Services", platformCat: 545 },
    { catId: "services", catName: "Services", platformCat: 534 },
    { catId: "fashion", catName: "Fashion", platformCat: 535 },
    { catId: "health-beauty-outdoors", catName: "Health, Beauty & Outdoors", platformCat: 536 },
    { catId: "health-beauty-outdoors", catName: "Health, Beauty & Outdoors", platformCat: 541 },
    { catId: "health-beauty-outdoors", catName: "Health, Beauty & Outdoors", platformCat: 544 },
    { catId: "technology", catName: "Technology", platformCat: 540 },
    { catId: "pets", catName: "Pets", platformCat: 538 },
    { catId: "food-drink", catName: "Food & Drink", platformCat: 539 },
    { catId: "food-drink", catName: "Food & Drink", platformCat: 529 },
    { catId: "gifts", catName: "Gifts", platformCat: 651 }
  ]
  
  const storesByCat = [];

  for (let cat of catMap) {

      const response = await fetch(`https://www.cashrewards.com.au/api/offers/v1/Merchants?clientId=1000000&ismobile=false&isInstore=false&categoryId=${cat.platformCat}&pageNumber=1&pageSize=2000&sort=alphabetical_asc`);
      const storeResponse = await response.json();
      const storeData = storeResponse.data;

    for (let store of storeData) {
        
      const storeName = store.name;
      const storeId = storeName.replace(" AU","").replace(" Australia","").toLowerCase().replaceAll(/[^a-zA-Z0-9 ]/g, "").replaceAll(" ","");
  
        const storeObject = {
            storeId,
            categories: [{ catId: cat.catId, catName: cat.catName }]
        }

        const storeInArray = storesByCat.find(store => store.storeId === storeId);

        if (storeInArray) {
          if (!storeInArray.categories?.find(category => category.catId === cat.catId)) {
            storeInArray.categories.push({ catId: cat.catId, catName: cat.catName });
          }
        } else {
          storesByCat.push(storeObject);
        }
    }
  }

  for (let storeByCat of storesByCat) {

      const storeIndex = stores.findIndex((store) => {
        return store.storeId === storeByCat.storeId;
      });
      
      if (stores[storeIndex]) {
        stores[storeIndex].categories = storeByCat?.categories
      } 
  }

  // Add to DB

  dbInsert("pointassistant-main", "stores", "cashrewards", stores);

  res.send('Done');

}
