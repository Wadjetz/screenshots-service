const express = require("express");
const webshot = require("webshot");
const im = require("imagemagick-stream");
const fs = require("fs");
const app  = express();
const PORT = 9100;

const options = {
  streamType: "jpeg",
  defaultWhiteBackground: true
};

function fileName(url, resize, options) {
  var name = (url + resize).replace(new RegExp(`[",/;\[\*\.\:\|\=\?\%]`, "g"), "_").replace("\\", "_").replace("\]", "_");
  return name + "." + options.streamType;
}

function cache(req, res, next) {
  const filePath = req._filePath;
  fs.stat(filePath, function(err, stat) {
    console.log(stat);
    if (err) next();
    else res.sendFile(filePath);
  });
}

function validator(req, res, next) {
  const url = req.query.url;
  const resize = req.query.resize;
  if (url && resize) {
    req._url = url;
    req._resize = resize;
    req._filePath = __dirname + "/screens/" + fileName(url, resize, options);
    next();
  } else {
    console.error("url or resize missing", url, resize);
    res.status(400).end("url or resize missing");
  }
}

module.exports = function (cluster) {
  app.get("/", validator, cache, function (req, res) {
    const url = req._url;
    const resize = req._resize;
    const filePath = req._filePath;
    const file = fs.createWriteStream(filePath, { encoding: "binary" });
    webshot(url, options)
      .pipe(im().resize(resize).quality(99))
      .on("data", function(data) {
        file.write(data.toString("binary"), "binary");
        res.write(data);
      })
      .on("error", function (webshotError) {
        fs.unlink(filePath, function (rmError) {
          if (rmError) {
            console.error(filePath, "rmError", rmError, "webshotError", webshotError);
            res.status(500);
          } else {
            console.error(filePath, "error", webshotError);
            res.status(500);
          }
        });
      })
      .on("end", function() {
        res.end();
      });
  });

  var server = app.listen(PORT, () => {
    var host = server.address().address;
    var port = server.address().port;
    console.log(`App worker ${cluster.worker.id} listening at http://${host}:${port}`);
  });

};
