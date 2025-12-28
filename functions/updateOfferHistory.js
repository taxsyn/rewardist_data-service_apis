import {generateDateStamp} from "./generateDateStamp.js";

export const updateOfferHistory = (existingOfferHistory, program, newReward) => {

const platformExistingOfferHistory = existingOfferHistory?.find(programHistory => programHistory.program === program)?.offers;
const otherPlatformExistingOfferHistory = existingOfferHistory?.filter(programHistory => programHistory.program !== program);

let updatedPlatformOfferHistory;

const existingTodayOffer = platformExistingOfferHistory?.find(offer => offer.date === generateDateStamp())

if (platformExistingOfferHistory && (!existingTodayOffer || (existingTodayOffer && newReward > existingTodayOffer.reward))) {
    updatedPlatformOfferHistory = [ ...platformExistingOfferHistory.filter(offer => offer.date !== generateDateStamp()), { date: generateDateStamp(), reward: newReward }] ;
} 
else if (!platformExistingOfferHistory) {
    updatedPlatformOfferHistory = [ { date: generateDateStamp(), reward: newReward} ]
}  
else {
    updatedPlatformOfferHistory = platformExistingOfferHistory;
}

if (otherPlatformExistingOfferHistory) {
    return [ ...otherPlatformExistingOfferHistory, { program: program, offers: updatedPlatformOfferHistory } ];
} else {
    return [{ program: program, offers: updatedPlatformOfferHistory }];
}
    
}