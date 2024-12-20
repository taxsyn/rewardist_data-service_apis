import dbFind from '../mongoDb/dbFind.js';

export const generateStoreId = (storeName, storeIdReplace) => {

  let storeId = storeName.replace("/","-");

  for (let replace of storeIdReplace) {
    storeId = storeId.replace(replace.split("/")[0], replace.split("/")[1]);
  }
  storeId = storeId
    .replace(" AU","")
    .replace(" Australia","")
    .replace(/^47$/, "47 Brand")
    .toLowerCase()
    .replaceAll(/[^a-zA-Z0-9 ]/g, "")
    .replaceAll(" ","");
  return storeId;
}

export const getStoreIdReplaceList = async () => {

  const storeIdReplaceObject = await dbFind("pointassistant-main", "lookupTables", { name: "storeIdReplace" }, {});
  const storeIdReplace = storeIdReplaceObject.find(object => object.name === "storeIdReplace").data.filter(datum => datum);

  return storeIdReplace;
}