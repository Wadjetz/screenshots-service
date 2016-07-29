/// <reference path="../typings/index.d.ts" />
/// <reference path="./webshot.d.ts" />
/// <reference path="./sharp.d.ts" />
import * as express from "express";
import * as webshot from "webshot";
import * as timeout from "connect-timeout";
import * as sharp from "sharp";
import * as fs from "fs";
import * as nconf from "nconf";

const conf = nconf.argv().env().file({
  file: "config.json"
});

const app = express();
app.use(timeout("30s"));

const APP_PORT = conf.get("APP_PORT");
app.get("/", (req, res) => {
  const url = req.query.url;
  const file = fs.createWriteStream("test.jpeg" , { encoding: "binary" });

  const options = {
    streamType: "jpeg",
    defaultWhiteBackground: true,
    timeout: conf.get("TIMEOUT")
  }

  const transformer = sharp().resize(400)

  webshot("google.com", options)
    .on("error", err => {
      console.error(err);
    })
    .pipe(transformer)
    .on("error", err => {
      console.error(err);
    })
    .on("data", data => {
      file.write(data.toString("binary"), "binary");
    }).
    on("end", () => {
      res.sendFile(__dirname + "/test.jpeg");
    });
});

const server = app.listen(APP_PORT, () => {
  const host = server.address().address;
  const port = server.address().port;
  console.log(`App listening at http://${host}:${port}`);
});

function fileName(url: string, resize: string, options: any) {
  let name = (url + resize).replace(new RegExp(`[",/;\[\*\.\:\|\=\?\%]`, "g"), "_").replace("\\", "_").replace("\]", "_");
  return name + ".jpeg";
}
