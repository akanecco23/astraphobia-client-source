function generateRandomString(length) {
  let resultString = "";
  for (let i = 0; i < length; i++) {
    const randomCodePoint = Math.floor(Math.random() * 1048575 + 65536);
    resultString += String.fromCodePoint(randomCodePoint);
  }
  return resultString;
}
function getGameCanvas() {
  return (
    document.querySelector("#gameCanvas") ||
    document.querySelector("canvas") ||
    document.querySelector("#canvas-container canvas")
  );
}
const getAllPropertyNames = (targetObject) => {
  return [
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(targetObject)),
    ...Object.getOwnPropertyNames(targetObject),
  ];
};

export { generateRandomString, getGameCanvas, getAllPropertyNames };
