import file from "fs"
const dc=JSON.parse(file.readFileSync("doctorlist.json","utf8"))
console.log("number of doctors:"+Object.keys(dc).length)