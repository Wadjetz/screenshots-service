const express = require("express");
const webshot = require("webshot");
const im = require("imagemagick-stream");
const timeout = require("connect-timeout");
const fs = require("fs");
const app  = express();
const PORT = 9100;

const options = {
  streamType: "jpeg",
  defaultWhiteBackground: true,
  timeout: 29000
};

function fileName(url, resize, options) {
  var name = (url + resize).replace(new RegExp(`[",/;\[\*\.\:\|\=\?\%]`, "g"), "_").replace("\\", "_").replace("\]", "_");
  return name + "." + options.streamType;
}

function cache(req, res, next) {
  const filePath = req._filePath;
  fs.stat(filePath, function(err, stat) {
    if (err) {
      console.log("no cache", err.path);
      next();
    } else {
      if (stat.size === 0) {
        console.log("cached file empty " + filePath);
        next();
      } else {
        res.sendFile(filePath);
      }
    }
  });
}

function validator(req, res, next) {
  const url = req.query.url;
  const resize = req.query.resize;
  // TODO limit resize to 1000x1000
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

function defaultImage (req, res) {
  const resize = req._resize;
  const read = fs.createReadStream(__dirname + "/default/default.jpeg");
  const cache = fs.createWriteStream(__dirname + "/screens/" + fileName("default", resize, options), { encoding: "binary" });
  read.pipe(im().resize(resize).quality(99))
    .on("data", function (data) {
      cache.write(data);
      res.write(data);
    })
    .on("error", function (err) {
      console.error("defaultImage err", err);
      res.status(500).end();
    })
    .on("end", function() {
      res.end();
    });
}

function defaultImageCache (req, res, next) {
  const resize = req._resize;
  const filePath = __dirname + "/screens/" + fileName("default", resize, options);
  fs.stat(filePath, function(err) {
    if (err) {
      next();
    } else {
      res.sendFile(filePath);
    }
  });
}

function screensShot (url, resize, filePath, options) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath, { encoding: "binary" });
    webshot(url, options)
      .on("error",  (webshotError) => {
        fs.unlink(filePath, function (rmError) {
          if (rmError) {
            reject({
              filePath: filePath,
              webshotError: webshotError,
              rmError: rmError
            });
          } else {
            reject({ filePath: filePath, webshotError: webshotError });
          }
        });
      })
      .pipe(im().resize(resize).quality(99))
      .on("error", function (webshotError) {
        fs.unlink(filePath, function (rmError) {
          if (rmError) {
            reject({
              filePath: filePath,
              webshotError: webshotError,
              rmError: rmError
            });
          } else {
            reject({ filePath: filePath, webshotError: webshotError });
          }
        });
      })
      .on("data", function (data) {
        file.write(data.toString("binary"), "binary");
      })
      .on("end", function() {
        resolve(filePath);
      });
  });
}

module.exports = function (cluster) {
  app.use(timeout("30s"));
  app.get("/", validator, cache, function (req, res, next) {
    const url = req._url;
    const resize = req._resize;
    const filePath = req._filePath;
    screensShot(url, resize, filePath, options)
      .then(() => res.sendFile(filePath))
      .catch(err => {
        console.error("screensShot err", filePath, err);
        next();
      });
  }, defaultImageCache, defaultImage);

  var server = app.listen(PORT, () => {
    var host = server.address().address;
    var port = server.address().port;
    console.log(`App worker ${cluster.worker.id} listening at http://${host}:${port}`);
  });

};
