function generateRandomString(stringLength) {
  let resultString = "";
  for (let index = 0; index < stringLength; index++) {
    const randomCodePoint = Math.floor(Math.random() * 1048575 + 65536);
    resultString += String.fromCodePoint(randomCodePoint);
  }
  return resultString;
}
const getAllPropertyNames = (targetObject) => {
  return [
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(targetObject)),
    ...Object.getOwnPropertyNames(targetObject),
  ];
};
function isValidEntity(entity) {
  if (!entity) {
    return false;
  }
  if (entity.type === 1) {
    return true;
  }
  if (entity.playerRoomId != null) {
    return true;
  }
  if (entity.entityName != null && entity.entityName.length > 0) {
    return true;
  }
  if (entity.visibleFishLevel != null && entity.visibleFishLevel > 0) {
    return true;
  }
  return false;
}

export { generateRandomString, getAllPropertyNames, isValidEntity };
