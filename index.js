import dbInsert from './mongoDb/dbInsert.js';
import dbInsertSignUp from './mongoDb/dbInsertSignUp.js';
import { generateStoreId, getStoreIdReplaceList } from './functions/generateStoreId.js';

export async function getCashrewards(req, res) {
  const response = await fetch("https://api-prod.cashrewards.com.au/api/v1/merchants/all-stores?limit=3000&offset=0");
  const storeResponse = await response.json();
  const storeData = storeResponse.Data;
  
  const stores = [];

  const storeIdReplaceList = await getStoreIdReplaceList();

  for (let store of storeData) {

    if (store.Online) {

        const programUrl = `https://www.cashrewards.com.au/store/${store.HyphenatedString}`;
        const storeName = store.Name;
        const storeId = generateStoreId(storeName, storeIdReplaceList);
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
    const storeId = generateStoreId(storeName, storeIdReplaceList);
    const wasReward = Number(store.wasRate && store.wasRate?.match(/\d+\.?\d?/g)[0]);

    const endDate = new Date(store.endDateTime).getTime();
    const now = new Date().getTime();
    const isBonus = now < endDate && ((endDate - now) < 2764800000); // End date less than 32 days

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
      const storeId = generateStoreId(storeName, storeIdReplaceList);
  
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

export async function getCashbackAustralia(req, res) {
  const response = await fetch("https://api.cashbackaustralia.com.au/stores/0");
  const storeResponse = await response.json();
  const storeData = storeResponse;
  
  const stores = [];

  const storeIdReplaceList = await getStoreIdReplaceList();

  for (let store of storeData) {

        const programUrl = `https://cashbackaustralia.com.au/store/${store.slug}/?refcode=HEY@R180`;
        const storeName = store.name;
        const storeId = generateStoreId(storeName, storeIdReplaceList);
        const isBonusPointsOnly = store.amount_type === "fixed";
        const isUpTo = store.rate_type === "upto"
        const reward = parseFloat(store.cashback);

        
        const storeObject = {
            program: 'cashbackaustralia',
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

  // Add to DB

  dbInsert("pointassistant-main", "stores", "cashbackaustralia", stores);

  res.send('Done');

}

export async function getGrowMyMoney(req, res) {
  const response = await fetch("https://lgq6qkjl.api.sanity.io/v2021-10-21/data/query/production?query=%0Acoalesce%28%0A++*%5B_type+%3D%3D+%27retailer%27+%26%26+%21%28_id+in+path%28%27drafts.**%27%29%29+%26%26+deleted+%21%3D+true+%26%26+%28%24retailerType+%3D%3D+%22%22+%7C%7C+%24retailerType+%3D%3D+rawData.retailerType%29+%5D+%7C+order%28lower%28rawData.rewards%5B0%5D.displayOfferShort%29+desc%29+%5B0...4000%5D+%7B%0A++++%0A++%0A++_type%2C%0A++_id%2C%0A++_createdAt%2C%0A++_updatedAt%2C%0A++brandPartners%5B%5D+-%3E+%7B+...+%7D%2C%0A++title%2C%0A++slug+%7B%0A++++current%2C%0A++++prefix+-%3E+%7B%0A++++++slug+%7B%0A++++++++current%2C%0A++++++++prefix+-%3E+%7B%0A++++++++++slug+%7B%0A++++++++++++current%2C%0A++++++++++++prefix+-%3E+%7B%0A++++++++++++++slug+%7B%0A++++++++++++++++current%0A++++++++++++++%7D%0A++++++++++++%7D%0A++++++++++%7D%0A++++++++%7D%0A++++++%7D%0A++++%7D%0A++%7D%0A%2C%0A++description%2C%0A++topLeftBadge%2C%0A++bottomRightBadge%2C%0A++image+%7B+%0A++...%2C%0A++mobileImage+%7B%0A++++...%2C%0A++++asset+-%3E+%7B%0A++++++_id%2C%0A++++++metadata+%7B+dimensions%2C+palette%2C+lqip+%7D%2C%0A++++++mimeType%2C%0A++++++size%2C%0A++++++url%0A++++%7D%0A++%7D%2C%0A++asset+-%3E+%7B%0A++++_id%2C%0A++++metadata+%7B+dimensions%2C+palette%2C+lqip+%7D%2C%0A++++mimeType%2C%0A++++size%2C%0A++++url%0A++%7D%0A+%7D%2C%0A++rawData+%7B+...+%7D%0A%0A++%7D%2C%0A++%5B%5D%0A%29%0A&%24categories=%5B%5D&%24retailerType=%22%22&returnQuery=false");
  const storeResponse = await response.json();
  const storeData = storeResponse.result.filter(store => store.rawData.retailerType === "regular").filter(store => !store.rawData.rewards[0].displayOfferShort.includes("USD"));
  
  const stores = [];

  const storeIdReplaceList = await getStoreIdReplaceList();

  for (let store of storeData) {

        const programUrl = `https://growmymoney.com.au/retailers/${store.slug.current}/`;
        const storeName = store.rawData.name;
        const storeId = generateStoreId(storeName, storeIdReplaceList);
        const isBonusPointsOnly = !store.rawData.rewards[0].displayOfferShort.includes("%");
        const reward = parseFloat(store.rawData.rewards[0].displayOfferShort.replace("$",""));
        const isBonus = store.topLeftBadge?.toLowerCase().includes("cashback boom");

        
        const storeObject = {
            program: 'growmymoney',
            programUrl,
            storeName,
            storeId,
            reward,
            rewardType: 'cashback',
            isBonus,
            isBonusPointsOnly,
            isUpTo: true
        }

        stores.push(storeObject);
  }

  // Add to DB

  dbInsert("pointassistant-main", "stores", "growmymoney", stores);

  res.send('Done');

}
  
export async function getPassport(req, res) {
  
  const stores = [];

  const storeIdReplaceList = await getStoreIdReplaceList();

  for (let page = 1; page <= 20; page++) {

    const response = await fetch(`https://rzskiaobtycjgjtzlepb.supabase.co/functions/v1/merchants?page_size=100&page=${page}&sort_by=merchant_name&sort_order=asc&country_code=AU`);
    const responseStores = await response.json();
    const storeData = responseStores.data;

    for (let store of storeData) {

      const programUrl = `https://www.passport.travel/shopping/merchants/${store.slug}`;
      const storeName = store.name;
      const storeId = generateStoreId(storeName, storeIdReplaceList);
      const isBonusPointsOnly = store.reward_type === "Fixed";
      const reward = store.reward;

      
      const storeObject = {
          program: 'passport',
          programUrl,
          storeName,
          storeId,
          reward,
          rewardType: 'points',
          isBonusPointsOnly,
          isUpTo: true
      }

      stores.push(storeObject);

    }

    if (page === responseStores.meta.pagination.page_count) {
      console.log("page limit reached");
      break;
    }
  }

  // Add to DB

  dbInsert("pointassistant-main", "stores", "passport", stores);

  res.send('Done');

}

export async function getCashrewardsSignupBonus(req, res) {
  const response = await fetch("https://www.cashrewards.com.au/raf/bonus?max=false");
  const responseData = await response.json();

  const bonus = responseData.mateBonus

  dbInsertSignUp("pointassistant-main", "signupBonuses", "cashrewards", bonus, null);
  
  res.send('Done');

}