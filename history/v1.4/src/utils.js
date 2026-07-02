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
const getAllPropertyNames = (v33c0TargetObject) => {
  return [
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(v33c0TargetObject)),
    ...Object.getOwnPropertyNames(v33c0TargetObject),
  ];
};

export { generateRandomString, getGameCanvas, getAllPropertyNames };
