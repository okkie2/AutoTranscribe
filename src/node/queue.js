// src/node/queue.js
// Tiny FIFO async queue for promise-based workers. Runs one item at a time,
// enqueue via add(item), and the worker should return a Promise. Reusable for
// transcription, summaries, email dispatch, etc.

function createQueue(worker) {
  let queue = [];
  let active = false;

  // If nothing is running and items exist, start the next one. When the worker
  // resolves or rejects, mark idle and advance to the following item.
  function runNext() {
    if (active === true) return;
    if (queue.length === 0) return;

    active = true;
    let item = queue.shift();

    // Run the async worker. Regardless of success/failure, flip active off and
    // immediately try the next item so the queue keeps draining.
    worker(item)
      .then(function(result) {
        active = false;
        runNext();
      })
      .catch(function(err) {
        active = false;
        runNext();
      });
  }

  // Add a new item to the queue and attempt to start processing if idle.
  function add(item) {
    queue.push(item);
    runNext();
  }

  return {
    add: add
  };
}

module.exports = createQueue;
