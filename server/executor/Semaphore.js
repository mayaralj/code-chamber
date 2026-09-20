// Create a Semaphore class to help manage concurrency for each language. This ensures that we don't exceed the maximum number of concurrent executions for a given language, even if the pool size is larger.
class Semaphore {
  constructor(size) {
    this.available = size;
    this.queue = [];
  }

  acquire() {
    return new Promise((resolve) => {
      const attempt = () => {
        if (this.available > 0) {
          this.available--;
          resolve(() => this._release());
        } else {
          this.queue.push(attempt);
        }
      };
      attempt();
    });
  }

  _release() {
    this.available++;
    const next = this.queue.shift();
    if (next) next();
  }
}

export default Semaphore;
