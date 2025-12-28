import fs from 'fs';
import https from 'https';
import { generateStoreId, getStoreIdReplaceList } from './functions/generateStoreId.js';

const getStoreLogosCashrewards = async () => {
    const response = await fetch("https://api-prod.cashrewards.com.au/api/v1/merchants/all-stores?limit=3000&offset=0");
    const storeResponse = await response.json();
    const storeData = storeResponse.Data;

    const storeIdReplaceList = await getStoreIdReplaceList();
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    const download = async (imageUrls, storeIds) => {
        for (const [index, value] of imageUrls.entries()) {

          await sleep(50);
        
            const file = fs.createWriteStream(`./store-logos/store-${storeIds[index]}.png`);

            https.get(value, response => {
              response.pipe(file);
            
              file.on('finish', () => {
                file.close();
                console.log(`Image downloaded as ${storeIds[index]}`);
              });
            }).on('error', err => {
              console.error(`Error downloading image: ${err}`);
            });
        }
    }

    const imageUrls = storeData.map(store => 'https:' + store.LogoUrl);
    // const imageUrls = storeData.map(store => 'https://cdn.cashrewards.com/' + store.HyphenatedString + '.png');

    console.log("🚀 ~ getStoreLogosCashrewards ~ imageUrls:", imageUrls)
    const storeIds = storeData.map(store => generateStoreId(store.Name, storeIdReplaceList));

    download(imageUrls, storeIds);
}

// getStoreLogosCashrewards();


const getStoreLogosPassport = async () => {

    for (let page = 1; page <= 20; page++) {

    const response = await fetch(`https://rzskiaobtycjgjtzlepb.supabase.co/functions/v1/merchants?page_size=100&page=${page}&sort_by=merchant_name&sort_order=asc&country_code=AU`);
    const responseStores = await response.json();
    const storeData = responseStores.data;
    const storesWithImages = storeData.filter(store => store.images)

    const storeIdReplaceList = await getStoreIdReplaceList();
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

    const download = async (imageUrls, storeIds) => {
        for (const [index, value] of imageUrls.entries()) {

          await sleep(50);
        
            const file = fs.createWriteStream(`./store-logos/store-${storeIds[index]}.png`);

            https.get(value, response => {
              response.pipe(file);
            
              file.on('finish', () => {
                file.close();
                console.log(`Image downloaded as ${storeIds[index]}`);
              });
            }).on('error', err => {
              console.error(`Error downloading image: ${err}`);
            });
        }
    }

    const preferredOrder = ['LOGORECT', 'LOGO', 'LOGOTRANPARENT'];

    const imageUrls = storesWithImages.map(store => store.images.sort((a, b) => {
      const indexA = preferredOrder.indexOf(a.kind);
      const indexB = preferredOrder.indexOf(b.kind);

      // If both elements are in the preferredOrder list, sort by their index in that list
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      // If only 'a' is in the preferredOrder list, 'a' comes first
      if (indexA !== -1) {
        return -1;
      }

      // If only 'b' is in the preferredOrder list, 'b' comes first
      if (indexB !== -1) {
        return 1;
      }

      // If neither are in the preferredOrder list, maintain original relative order (or apply a secondary sort)
      // For simplicity, we can let the default string comparison handle it here, or return 0
      return new String(a).localeCompare(new String(b)); // Or return 0 to maintain relative order
    })[0]?.url);

    console.log("🚀 ~ getStoreLogosCashrewards ~ imageUrls:", imageUrls)
    const storeIds = storesWithImages.map(store => generateStoreId(store.name, storeIdReplaceList));


    download(imageUrls, storeIds);

    if (page === responseStores.meta.pagination.page_count) {
      console.log("page limit reached");
      break;
    }
  }
}

getStoreLogosPassport();
