import fs from 'fs';
import https from 'https';

const getStoreLogos = async () => {
    const response = await fetch("https://api-prod.cashrewards.com.au/api/v1/merchants/all-stores?limit=3000&offset=0");
    const storeResponse = await response.json();
    const storeData = storeResponse.Data;

    const download = async (imageUrls, storeIds) => {
        for (const [index, value] of imageUrls.entries()) {

        
            const file = fs.createWriteStream(`./store-logos/store-${storeIds[index]}.png`);

            https.get(value, response => {
              response.pipe(file);
            
              file.on('finish', () => {
                file.close();
                console.log(`Image downloaded as ${storeIds[index]}`);
              });
            }).on('error', err => {
              fs.unlink(imageName);
              console.error(`Error downloading image: ${err.message}`);
            });
        }
    }

    const imageUrls = storeData.map(store => 'https:' + store.LogoUrl);
    const storeIds = storeData.map(store => store.Name.replace(" AU","").replace(" Australia","").toLowerCase().replaceAll(/[^a-zA-Z0-9 ]/g, "").replaceAll(" ",""));

    download(imageUrls, storeIds);
}

getStoreLogos();

