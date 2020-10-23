const express = require("express");
const app = express();

app.use(express.static(__dirname + "/"));

app.listen(6070, () => {
  console.log("app live on port 6060");
});
