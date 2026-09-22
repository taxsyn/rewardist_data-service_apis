import dbInsert from './mongoDb/dbInsert.js';
import dbInsertSignUp from './mongoDb/dbInsertSignUp.js';
import dbFind from './mongoDb/dbFind.js';
import { generateStoreId, getStoreIdReplaceList } from './functions/generateStoreId.js';
import { generateWasReward } from './functions/generateWasReward.js';
import { logMemoryUsage } from './functions/logMemoryUsage.js';

export async function getCashrewards(req, res) {
  logMemoryUsage('getCashrewards:start');
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
  logMemoryUsage('getCashrewards:complete');

}

export async function getCashbackAustralia(req, res) {
  logMemoryUsage('getCashbackAustralia:start');
  const response = await fetch("https://api.cashbackaustralia.com.au/stores/0");
  const storeResponse = await response.json();
  const storeData = storeResponse;
  
  const stores = [];

  const storeIdReplaceList = await getStoreIdReplaceList();

  const allExistingStores = await dbFind(
    "pointassistant-main", 
    "storeOffers", 
    {"offers.program" : "cashbackaustralia"}, 
    {'storeId':1, 'offerHistory':1,}
  );

  for (let store of storeData) {

        const programUrl = `https://cashbackaustralia.com.au/store/${store.slug}/`;
        const storeName = store.name;
        const storeId = generateStoreId(storeName, storeIdReplaceList);
        const isBonusPointsOnly = store.amount_type === "fixed";
        const isUpTo = store.rate_type === "upto"
        const reward = parseFloat(store.cashback);

        const offerHistory = allExistingStores.find(store => store.storeId === storeId)?.offerHistory.find(history => history.program === "cashbackaustralia").offers.map(offer => offer.reward);
        const generatedWasReward = offerHistory && generateWasReward(offerHistory);
        const wasReward = (generatedWasReward && generatedWasReward < reward) ? generatedWasReward : null;
        const wasRewardDiff = wasReward ? parseFloat((((reward - wasReward) / wasReward) * 100).toFixed(2)) : 0;
        
        const storeObject = {
            program: 'cashbackaustralia',
            programUrl,
            storeName,
            storeId,
            reward,
            rewardType: 'cashback',
            isBonusPointsOnly,
            isUpTo,
            ...(wasReward && {wasReward}),
            ...(wasReward && {isBonus: true}),
            ...(wasReward && {wasRewardIsUpTo: isUpTo}),
            ...(wasReward && {wasRewardIsBonusPointsOnly: isBonusPointsOnly}),
            ...(wasRewardDiff && {wasRewardDiff})
        }

        stores.push(storeObject);
  }

  // Add to DB

  await dbInsert("pointassistant-main", "stores", "cashbackaustralia", stores);

  res.send('Done');
  logMemoryUsage('getCashbackAustralia:complete');

}

export async function getGrowMyMoney(req, res) {
  logMemoryUsage('getGrowMyMoney:start');
  const response = await fetch("https://lgq6qkjl.api.sanity.io/v2021-10-21/data/query/production?query=%0Acoalesce%28%0A++*%5B_type+%3D%3D+%27retailer%27+%26%26+%21%28_id+in+path%28%27drafts.**%27%29%29+%26%26+deleted+%21%3D+true+%26%26+%28%24retailerType+%3D%3D+%22%22+%7C%7C+%24retailerType+%3D%3D+rawData.retailerType%29+%5D+%7C+order%28lower%28rawData.rewards%5B0%5D.displayOfferShort%29+desc%29+%5B0...4000%5D+%7B%0A++++%0A++%0A++_type%2C%0A++_id%2C%0A++_createdAt%2C%0A++_updatedAt%2C%0A++brandPartners%5B%5D+-%3E+%7B+...+%7D%2C%0A++title%2C%0A++slug+%7B%0A++++current%2C%0A++++prefix+-%3E+%7B%0A++++++slug+%7B%0A++++++++current%2C%0A++++++++prefix+-%3E+%7B%0A++++++++++slug+%7B%0A++++++++++++current%2C%0A++++++++++++prefix+-%3E+%7B%0A++++++++++++++slug+%7B%0A++++++++++++++++current%0A++++++++++++++%7D%0A++++++++++++%7D%0A++++++++++%7D%0A++++++++%7D%0A++++++%7D%0A++++%7D%0A++%7D%0A%2C%0A++description%2C%0A++topLeftBadge%2C%0A++bottomRightBadge%2C%0A++image+%7B+%0A++...%2C%0A++mobileImage+%7B%0A++++...%2C%0A++++asset+-%3E+%7B%0A++++++_id%2C%0A++++++metadata+%7B+dimensions%2C+palette%2C+lqip+%7D%2C%0A++++++mimeType%2C%0A++++++size%2C%0A++++++url%0A++++%7D%0A++%7D%2C%0A++asset+-%3E+%7B%0A++++_id%2C%0A++++metadata+%7B+dimensions%2C+palette%2C+lqip+%7D%2C%0A++++mimeType%2C%0A++++size%2C%0A++++url%0A++%7D%0A+%7D%2C%0A++rawData+%7B+...+%7D%0A%0A++%7D%2C%0A++%5B%5D%0A%29%0A&%24categories=%5B%5D&%24retailerType=%22%22&returnQuery=false");
  const storeResponse = await response.json();
  const storeData = storeResponse.result.filter(store => store.rawData.retailerType === "regular").filter(store => store.rawData.rewards?.length > 0).filter(store => !store.rawData.rewards[0].displayOfferShort.includes("USD")).filter(store => !store.rawData.rewards[0].displayOfferShort.toLowerCase().includes("no cashback currently offered") && parseFloat(store.rawData.rewards[0].displayOfferShort.replace("$","").replace("%","")))
  
  const stores = [];

  const storeIdReplaceList = await getStoreIdReplaceList();

  const allExistingStores = await dbFind(
    "pointassistant-main", 
    "storeOffers", 
    {"offers.program" : "growmymoney"}, 
    {'storeId':1, 'offerHistory':1,}
  );

  for (let store of storeData) {

        const programUrl = `https://findershopping.com.au/retailers/${store.slug.current}/`;
        const storeName = store.rawData.name;
        const storeId = generateStoreId(storeName, storeIdReplaceList);
        const isBonusPointsOnly = !store.rawData.rewards[0].displayOfferShort.includes("%");
        const reward = parseFloat(store.rawData.rewards[0].displayOfferShort.replace("$",""));
        const isBonus = store.topLeftBadge?.toLowerCase().includes("cashback boom");

        const offerHistory = allExistingStores.find(store => store.storeId === storeId)?.offerHistory.find(history => history.program === "growmymoney").offers.map(offer => offer.reward);
        const generatedWasReward = offerHistory && generateWasReward(offerHistory);
        const wasReward = (generatedWasReward && generatedWasReward < reward) ? generatedWasReward : null;
        const wasRewardDiff = wasReward ? parseFloat((((reward - wasReward) / wasReward) * 100).toFixed(2)) : 0;

        
        const storeObject = {
            program: 'growmymoney',
            programUrl,
            storeName,
            storeId,
            reward,
            rewardType: 'cashback',
            isBonus,
            isBonusPointsOnly,
            isUpTo: true,
            ...(wasReward && {wasReward}),
            ...(wasReward && {isBonus: true}),
            ...(wasReward && {wasRewardIsUpTo: true}),
            ...(wasReward && {wasRewardIsBonusPointsOnly: isBonusPointsOnly}),
            ...(wasRewardDiff && {wasRewardDiff})
        }

        stores.push(storeObject);
  }

  // Add to DB

  console.log(stores.length)
  console.log(stores[0])
  console.log(stores[200])
  console.log(stores[700])


  await dbInsert("pointassistant-main", "stores", "growmymoney", stores);

  res.send('Done');
  logMemoryUsage('getGrowMyMoney:complete');

}
  
export async function getPassport(req, res) {
  logMemoryUsage('getPassport:start');
  
  const stores = [];

  const storeIdReplaceList = await getStoreIdReplaceList();

  const allExistingStores = await dbFind(
    "pointassistant-main", 
    "storeOffers", 
    {"offers.program" : "passport"}, 
    {'storeId':1, 'offerHistory':1,}
  );

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

      const offerHistory = allExistingStores.find(store => store.storeId === storeId)?.offerHistory.find(history => history.program === "passport").offers.map(offer => offer.reward);
      const generatedWasReward = offerHistory && generateWasReward(offerHistory);
      const wasReward = (generatedWasReward && generatedWasReward < reward) ? generatedWasReward : null;
      const wasRewardDiff = wasReward ? parseFloat((((reward - wasReward) / wasReward) * 100).toFixed(2)) : 0;
      
      const storeObject = {
          program: 'passport',
          programUrl,
          storeName,
          storeId,
          reward,
          rewardType: 'points',
          isBonusPointsOnly,
          isUpTo: true,
          ...(wasReward && {wasReward}),
          ...(wasReward && {isBonus: true}),
          ...(wasReward && {wasRewardIsUpTo: true}),
          ...(wasReward && {wasRewardIsBonusPointsOnly: isBonusPointsOnly}),
          ...(wasRewardDiff && {wasRewardDiff})
      }

      stores.push(storeObject);

    }

    if (page === responseStores.meta.pagination.page_count) {
      console.log("page limit reached");
      break;
    }
  }

  // Add to DB

  await dbInsert("pointassistant-main", "stores", "passport", stores);

  res.send('Done');
  logMemoryUsage('getPassport:complete');

}


export async function getQantas(req, res) {
  logMemoryUsage('getQantas:start');

  const response = await fetch("https://api.services.qantasloyalty.com/shopping/query", {
    "headers": {
      "accept": "application/graphql-response+json,application/json;q=0.9",
      "accept-language": "en-GB,en;q=0.9",
      "authorization": "",
      "cache-control": "no-cache",
      "content-type": "application/json",
      "pragma": "no-cache",
      "priority": "u=1, i",
      "sec-ch-ua": "\"Google Chrome\";v=\"147\", \"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"147\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "Referer": "https://shopping.qantas.com/"
    },
    "body": "{\"operationName\":\"merchantAZQuery\",\"variables\":{},\"extensions\":{\"clientLibrary\":{\"name\":\"@apollo/client\",\"version\":\"4.1.6\"}},\"query\":\"query merchantAZQuery {\\n  bonusCampaignItems(first: 1) {\\n    bonusRibbons {\\n      color\\n      backgroundColor\\n      title\\n      name\\n      __typename\\n    }\\n    __typename\\n  }\\n  merchantsAZ {\\n    firstLetter\\n    merchants {\\n      merchantId\\n      merchantIdMCO\\n      merchantIdOLM\\n      merchantIdDirect\\n      merchantName\\n      merchantLogoSquare\\n      is_elevated\\n      is_new\\n      isVisible\\n      rebate {\\n        rebate_user\\n        start_date\\n        end_date\\n        __typename\\n      }\\n      was_rebate {\\n        rebate_user\\n        __typename\\n      }\\n      has_free_ship\\n      has_coupon_code\\n      directContent {\\n        directPanelTitle\\n        directPanelCopy\\n        directPanelUrl\\n        __typename\\n      }\\n      directOffers {\\n        offerType\\n        points\\n        perValue\\n        bespokeOffer\\n        terms\\n        exclusions\\n        ctaLink\\n        ctaName\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n}\"}",
    "method": "POST"
  });
  const storeResponse = await response.json();
  const storeData = storeResponse.data.merchantsAZ.map(block => block.merchants).flat();
  const activeOffers = storeData.filter(key => key.isVisible === true && key.merchantName !== "everydayrewards");

  const stores = [];

  const storeIdReplaceList = await getStoreIdReplaceList();

  const allExistingStores = await dbFind(
    "pointassistant-main", 
    "storeOffers", 
    {"offers.program" : "qantas"}, 
    {'storeId':1, 'offerHistory':1,}
  );

  for (let offer of activeOffers) {

    const programUrl = `https://shopping.qantas.com/${offer.merchantId}`;
    const storeName = offer.merchantName
    const storeId = generateStoreId(offer.merchantName, storeIdReplaceList)
    const isBonusPointsOnly = false;
    const isUpTo = false
    const reward = offer.rebate?.rebate_user | 0;
    const isBonus = offer.is_elevated;
    const isCoupon = offer.has_coupon_code;
    const wasReward = isBonus && offer.was_rebate.rebate_user;
    const wasRewardDiff = isBonus && parseFloat((((reward - wasReward) / wasReward) * 100).toFixed(2));

    const storeObject = {
        program: 'qantas',
        programUrl,
        storeName,
        storeId,
        reward,
        rewardType: "points",
        isBonus,
        isCoupon,
        isBonusPointsOnly,
        isUpTo,
        wasReward,
        wasRewardDiff
    }

        stores.push(storeObject);
  }

  const finalOffers = stores.map((store) => {
    if (store.storeId === "qantaswine" || store.storeId === "kogan" || store.storeId === "carpetcourt" || store.storeId === "fortywinks") {
      return { ...store, reward: 1, isUpTo: store.storeId === "kogan" ? true : store.isUpTo }
    } else if (store.storeId === "woolworths") {
      return { ...store, reward: 0.5 }
    } else {
      return store;
    }
  })

  // Add to DB

  console.log(finalOffers.length)
  console.log(finalOffers.slice(0,2))

  await dbInsert("pointassistant-main", "stores", "qantas", finalOffers);

  res.send('Done');
  logMemoryUsage('getQantas:complete');

}

export async function getKick(req, res) {
  logMemoryUsage('getKick:start');
  
  const stores = [];

  const storeIdReplaceList = await getStoreIdReplaceList();

  const allExistingStores = await dbFind(
    "pointassistant-main", 
    "storeOffers", 
    {"offers.program" : "kick"}, 
    {'storeId':1, 'offerHistory':1,}
  );

  const fetchAllRecords = async () => {
    let storeData = [];
    let hasMore = true;
    let offset = 0; 
    const limit = 200; //200

    const baseUrl = 'https://kickpay.co/api/external/rewardist/stores';

    try {
      while (hasMore && offset <201) {
        const url = `${baseUrl}?limit=${limit}&offset=${offset}`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': process.env.KICK_API_KEY
          }
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        storeData.push(...data.stores); 
        hasMore = data.pagination.hasMore;
        offset += limit; 
      }

      storeData = storeData.filter(store => store.rate && store.rate.value > 0);

      return storeData;

    } catch (error) {
      console.error("Failed to fetch data:", error);
      throw error;
    }
  }

  try {
    console.log("Starting fetch...");
    const storeData = await fetchAllRecords(); 
    console.log(`Successfully retrieved ${storeData.length} items.`);

    for (let store of storeData) {

      const programUrl = store.storePageUrl; 
      const storeName = store.merchantName;
      const storeId = generateStoreId(storeName, storeIdReplaceList);
      const logoUrl = store.logoUrl;
      const isBonusPointsOnly = store.rate.type !== "percentage";
      const reward = store.rate.value || 0;
      const isUpTo = store.display?.toLowerCase().includes("up to") || false;

      const offerHistory = allExistingStores.find(store => store.storeId === storeId)?.offerHistory.find(history => history.program === "kick").offers.map(offer => offer.reward);
      const generatedWasReward = offerHistory && generateWasReward(offerHistory);
      const wasReward = generatedWasReward // No wasReward data in API
      const wasRewardDiff = wasReward ? parseFloat((((reward - wasReward) / wasReward) * 100).toFixed(2)) : 0;
      
      const storeObject = {
          program: 'kick',
          programUrl,
          storeName,
          storeId,
          logoUrl,
          reward,
          rewardType: 'cashback',
          isBonusPointsOnly,
          isUpTo,
          ...(wasReward && {wasReward}),
          ...(wasReward && {isBonus: true}),
          ...(wasReward && {wasRewardIsUpTo: isUpTo}),
          ...(wasReward && {wasRewardIsBonusPointsOnly: isBonusPointsOnly}),
          ...(wasRewardDiff && {wasRewardDiff})
      }

      stores.push(storeObject);

    }

    // Add to DB
    await dbInsert("pointassistant-main", "stores", "kick", stores);

    res.send('Done');
    logMemoryUsage('getKick:complete');

  } catch (error) {
    console.error("Failed:", error);
  }

}

export async function getCashrewardsSignupBonus(req, res) {
  logMemoryUsage('getCashrewardsSignupBonus:start');
  const response = await fetch("https://www.cashrewards.com.au/raf/bonus?max=false");
  const responseData = await response.json();

  const bonus = responseData.mateBonus

  dbInsertSignUp("pointassistant-main", "signupBonuses", "cashrewards", bonus, null);
  
  res.send('Done');
  logMemoryUsage('getCashrewardsSignupBonus:complete');

}