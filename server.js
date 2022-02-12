require("dotenv").config();

const express = require("express");
const port = (process.env.PORT || 8080);

const tap = require("./router.js");

express().use(express.json()).use("/", tap).listen(port, () => {
    console.log(`Server listening on port ${port}`);
});