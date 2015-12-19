const cluster = require("cluster");
const app = require("./app");

module.exports = function () {
  cluster.schedulingPolicy = cluster.SCHED_RR;

  if(cluster.isMaster) {
    const cpuCount = require("os").cpus().length;

    for (var i=0; i < cpuCount; i++) {
      cluster.fork();
    }
  } else {
    app(cluster);
  }

  cluster.on("fork", worker =>
    console.log("forked -> Worker %d", worker.id)
  );

};
