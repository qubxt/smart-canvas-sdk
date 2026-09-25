class DeltaTimer {
  constructor({ dt_secs }) {
    this.t = 0;
    this.dt = dt_secs;
    this.timer = null;
    this.timeHeader = null;
    this.timeFunctions = {
      deltaTimeHandler: ({ dt, t }) => millis() / 5000,

      smooth: () => constrain(millis() / 3000, 0, 1),
    };
  }

  getTime() {
    return this.t;
  }

  resetTimer() {
    this.t = 0;
    return this.t;
  }

  setupTimer() {
    this.timer = this.timeFunctions.deltaTimeHandler;
    return this.timer;
  }

  setupElements() {
    this.timeHeader = createP("").position(10, 10);
  }

  drawTimer() {
    this.t += this.timer({ dt: this.dt, t: this.t });
    return this.t;
  }

  drawElements() {
    this.timeHeader.html(`${this.t} seconds`);
    return this.t;
  }
}
