import fs from 'fs';
import https from 'https';
import { generateStoreId, getStoreIdReplaceList } from './functions/generateStoreId.js';

const getStoreLogos = async () => {
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

    console.log("🚀 ~ getStoreLogos ~ imageUrls:", imageUrls)
    const storeIds = storeData.map(store => generateStoreId(store.Name, storeIdReplaceList));

    

    download(imageUrls, storeIds);
}

getStoreLogos();

