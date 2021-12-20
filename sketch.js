var backgroundColor;

var metronome;
var myTrackSystem;

var soundEnabled = true;

var EnvelopedOscillator = function(oscillatorType, envelopeParameter) {
  this.envelopeParameter = envelopeParameter;
  this.oscillatorType = oscillatorType;
  switch (oscillatorType) {
    case 'sine':
    case 'triangle':
    case 'sawtooth':
    case 'square':
      this.oscillator = new p5.Oscillator();
      break;
    case 'white':
    case 'pink':
    case 'brown':
      this.oscillator = new p5.Noise();
      break;
  }
  this.oscillator.setType(oscillatorType);
  this.envelope = new p5.Env();
  this.envelope.setADSR(envelopeParameter.attackTime, envelopeParameter.decayTime, envelopeParameter.susPercent, envelopeParameter.releaseTime);
  this.envelope.setRange(envelopeParameter.attackLevel, envelopeParameter.releaseLevel);
};
EnvelopedOscillator.prototype.play = function(startTime, sustainTime, frequency) {
  if (frequency) this.oscillator.freq(frequency);
  this.envelope.play(this.oscillator, startTime, sustainTime);
};
EnvelopedOscillator.prototype.start = function() {
  this.oscillator.amp(0);
  this.oscillator.start();
};
EnvelopedOscillator.prototype.stop = function() {
  this.oscillator.amp(0);
  this.oscillator.stop();
};
EnvelopedOscillator.prototype.pan = function(value) {
  this.oscillator.pan(value);
};
EnvelopedOscillator.prototype.connect = function(unit) {
  this.connectedUnit = unit;
  this.oscillator.disconnect();
  this.oscillator.connect(unit);
};

var ParallelEnvelopedOscillatorSet = function(oscillatorType, envelopeParameter, capacity) {
  this.envelopedOscillatorArray = [];
  this.capacity = capacity;
  this.currentIndex = 0;
  for (var i = 0; i < this.capacity; i++) {
    this.envelopedOscillatorArray.push(new EnvelopedOscillator(oscillatorType, envelopeParameter));
  }
};
ParallelEnvelopedOscillatorSet.prototype.play = function(startTime, sustainTime, frequency) {
  this.envelopedOscillatorArray[this.currentIndex].play(startTime, sustainTime, frequency);
  this.currentIndex++;
  if (this.currentIndex >= this.capacity) this.currentIndex = 0;
};
ParallelEnvelopedOscillatorSet.prototype.start = function() {
  for (var i = 0, len = this.envelopedOscillatorArray.length; i < len; i++) {
    this.envelopedOscillatorArray[i].start();
  }
};
ParallelEnvelopedOscillatorSet.prototype.stop = function() {
  for (var i = 0, len = this.envelopedOscillatorArray.length; i < len; i++) {
    this.envelopedOscillatorArray[i].stop();
  }
};
ParallelEnvelopedOscillatorSet.prototype.pan = function(value) {
  for (var i = 0, len = this.envelopedOscillatorArray.length; i < len; i++) {
    this.envelopedOscillatorArray[i].pan(value);
  }
};

var Metronome = {
  create: function(intervalMillisecond) {
    var newObject = Object.create(Metronome.prototype);
    newObject.intervalMillisecond = intervalMillisecond;
    newObject.lastNoteTimeStamp = 0;
    newObject.clickCount = 0;
    return newObject;
  },
  prototype: {
    check: function() {
      var currentTimeStamp = millis();
      if (currentTimeStamp >= this.lastNoteTimeStamp + this.intervalMillisecond) {
        this.lastNoteTimeStamp += this.intervalMillisecond;
        if (currentTimeStamp >= this.lastNoteTimeStamp + this.intervalMillisecond) this.lastNoteTimeStamp = currentTimeStamp;
        this.clickCount++;
        return true;
      }
      return false;
    }
  }
};

var Track = function(trackParameter) {
  this.oscillatorSet = new ParallelEnvelopedOscillatorSet(trackParameter.oscillatorType, trackParameter.envelopeParameter, 8);
  if (trackParameter.pan) this.oscillatorSet.pan(trackParameter.pan);

  this.startTime = trackParameter.startTime;
  this.sustainTime = trackParameter.sustainTime;
  this.frequency = trackParameter.frequency;

  this.notePattern = trackParameter.notePattern;
  this.isRandom = trackParameter.isRandom;
  this.probability = trackParameter.probability;
};
Track.prototype.updateNotes = function(noteCount) {
  this.noteArray = [];

  if (this.isRandom) {
    for (var i = 0; i < floor(noteCount / 2); i++) {
      if (random(1) < this.probability) this.noteArray.push(true);
      else this.noteArray.push(false);
    }
    this.noteArray = concat(this.noteArray, this.noteArray);
  } else {
    for (var k = 0; k < noteCount; k++) {
      this.noteArray.push(false);
    }
  }

  if (this.notePattern) {
    var patternLength = this.notePattern.length;
    for (var m = 0; m < noteCount; m++) {
      if (this.notePattern[m % patternLength]) this.noteArray[m] = true;
    }
  }
};
Track.prototype.play = function(noteIndex) {
  if (this.noteArray[noteIndex]) this.oscillatorSet.play(this.startTime, this.sustainTime, this.frequency);
};
Track.prototype.start = function() {
  this.oscillatorSet.start();
};

var TrackVisualizer = {
  create: function(track, noteVisualizerCreator, xPosition, yPosition) {
    var newObject = Object.create(TrackVisualizer.prototype);
    newObject.track = track;
    newObject.noteVisualizerCreator = noteVisualizerCreator;
    newObject.xPosition = xPosition;
    newObject.yPosition = yPosition;
    newObject.intervalLength = width * 0.05;
    return newObject;
  },
  prototype: {
    display: function() {
      push();
      translate(this.xPosition, this.yPosition);
      push();
      for (var i = 0, len = this.noteVisualizerArray.length; i < len; i++) {
        if (i == floor(len / 2)) {
          pop();
          push();
          translate(0, height * 0.5);
        }
        translate(this.intervalLength, 0);
        this.noteVisualizerArray[i].display();
      }
      pop();
      pop();
    },
    initialize: function() {
      this.noteVisualizerArray = [];
      for (var i = 0, len = this.track.noteArray.length; i < len; i++) {
        this.noteVisualizerArray.push(this.noteVisualizerCreator.create());
      }
    },
    update: function() {
      for (var i = 0, len = this.track.noteArray.length; i < len; i++) {
        this.noteVisualizerArray[i].isWaiting = this.track.noteArray[i];
      }
    },
    receivePlayedNote: function(noteIndex) {
      if (this.noteVisualizerArray[noteIndex].isWaiting) {
        this.noteVisualizerArray[noteIndex].isWaiting = false;
        this.noteVisualizerArray[noteIndex].isPlayed = true;
        this.noteVisualizerArray[noteIndex].playedFrameCount = 0;
      }
    }
  }
};

var AbstractNoteVisualizer = {
  create: function() {
    var newObject = Object.create(AbstractNoteVisualizer.prototype);
    newObject.playedFrameCount = 0;
    newObject.isWaiting = true;
    newObject.isPlayed = false;
    newObject.unitLength = width * 0.01;
    return newObject;
  },
  prototype: {
    display: function() {
      if (this.isWaiting) this.displayBeforePlay();
      if (this.isPlayed) this.displayAfterPlay();
    },
    displayBeforePlay: function() {},
    displayAfterPlay: function() {},
    getProgressRatio: function() {
      return min(1, this.playedFrameCount / this.fadeFrameCount);
    },
    getFadeRatio: function() {
      return 1 - this.getProgressRatio();
    }
  }
};

var SineNoteVisualizer = {
  create: function() {
    var newObject = Object.create(SineNoteVisualizer.prototype);
    Object.assign(newObject, AbstractNoteVisualizer.create());
    return newObject;
  },
  prototype: {
    fadeFrameCount: 60,
    displayBeforePlay: function() {
      noStroke();
      fill(64);
      var diameter = 1.5 * this.unitLength;
      ellipse(0, 0, diameter, diameter);
    },
    displayAfterPlay: function() {
      if (this.playedFrameCount >= this.fadeFrameCount) return;
      var progressRatio = (-pow(this.getProgressRatio() - 1, 4) + 1);
      var fadeRatio = this.getFadeRatio();
      strokeWeight(this.unitLength * 0.5 * fadeRatio);
      stroke(64, 255 * fadeRatio);
      noFill();
      var diameter = (2 + 4 * progressRatio) * this.unitLength;
      ellipse(0, 0, diameter, diameter);
      noStroke();
      fill(64, 255 * fadeRatio);
      rect(
        0, -1 * this.unitLength - 8 * this.unitLength * progressRatio,
        0.5 * this.unitLength, 2 * this.unitLength * (1 + fadeRatio)
      );
      this.playedFrameCount++;
    }
  }
};

Object.setPrototypeOf(SineNoteVisualizer.prototype, AbstractNoteVisualizer.prototype);

var ShortWhiteNoiseNoteVisualizer = {
  create: function() {
    var newObject = Object.create(ShortWhiteNoiseNoteVisualizer.prototype);
    Object.assign(newObject, AbstractNoteVisualizer.create());
    return newObject;
  },
  prototype: {
    fadeFrameCount: 30,
    displayBeforePlay: function() {
      stroke(64);
      strokeWeight(1);
      noFill();
      var halfSize = 1.5 * this.unitLength;
      quad(halfSize, 0, 0, halfSize, -halfSize, 0, 0, -halfSize);
    },
    displayAfterPlay: function() {
      if (this.playedFrameCount >= this.fadeFrameCount) return;
      var progressRatio = (-pow(this.getProgressRatio() - 1, 4) + 1);
      var fadeRatio = this.getFadeRatio();
      stroke(64, 255 * fadeRatio);
      strokeWeight(1);
      noFill();
      var halfSize = 1.5 * this.unitLength;
      push();
      var maxDisplacement = halfSize * sq(fadeRatio);
      translate(3 * this.unitLength * progressRatio + random(-1, 1) * maxDisplacement, random(-1, 1) * maxDisplacement);
      quad(halfSize, 0, 0, halfSize, -halfSize, 0, 0, -halfSize);
      pop();
      this.playedFrameCount++;
    }
  }
};

Object.setPrototypeOf(ShortWhiteNoiseNoteVisualizer.prototype, AbstractNoteVisualizer.prototype);

var LongWhiteNoiseNoteVisualizer = {
  create: function() {
    var newObject = Object.create(LongWhiteNoiseNoteVisualizer.prototype);
    Object.assign(newObject, AbstractNoteVisualizer.create());
    return newObject;
  },
  prototype: {
    fadeFrameCount: 30,
    displayBeforePlay: function() {
      stroke(64);
      strokeWeight(2);
      noFill();
      var halfSize = 1.5 * this.unitLength;
      var halfInterval = halfSize * 0.4;
      line(-halfSize, -halfInterval, halfSize, -halfInterval);
      line(-halfSize, +halfInterval, halfSize, +halfInterval);
    },
    displayAfterPlay: function() {
      if (this.playedFrameCount >= this.fadeFrameCount) return;
      var progressRatio = pow(this.getProgressRatio() - 1, 5) + 1;
      var fadeRatio = this.getFadeRatio();
      stroke(64, 255 * fadeRatio);
      strokeWeight(2);
      noFill();
      var halfSize = 1.5 * this.unitLength * (1 + 1.5 * progressRatio);
      var halfInterval = 2.5 * this.unitLength * progressRatio;
      line(-halfSize, -halfInterval, halfSize, -halfInterval);
      line(-halfSize, +halfInterval, halfSize, +halfInterval);
      strokeWeight(1);
      for (var i = 0; i < 7; i++) {
        var y = random(-0.9, 0.9) * halfInterval;
        line(-halfSize, y, halfSize, y);
      }
      this.playedFrameCount++;
    }
  }
};

Object.setPrototypeOf(LongWhiteNoiseNoteVisualizer.prototype, AbstractNoteVisualizer.prototype);

var BrownNoiseNoteVisualizer = {
  create: function() {
    var newObject = Object.create(BrownNoiseNoteVisualizer.prototype);
    Object.assign(newObject, AbstractNoteVisualizer.create());
    return newObject;
  },
  prototype: {
    fadeFrameCount: 30,
    displayBeforePlay: function() {
      noStroke();
      fill(64);
      var shapeSize = 2.5 * this.unitLength;
      rect(0, 0, shapeSize, shapeSize, shapeSize * 0.2);
    },
    displayAfterPlay: function() {
      if (this.playedFrameCount >= this.fadeFrameCount) return;
      var progressRatio = pow(this.getProgressRatio() - 1, 5) + 1;
      var fadeRatio = this.getFadeRatio();
      noStroke();
      fill(64, 255 * fadeRatio);
      var shapeSize = 2.5 * this.unitLength;
      var maxDisplacement = 1.5 * this.unitLength * pow(fadeRatio, 4);
      push();
      translate(random(-1, 1) * maxDisplacement, (1 - 3 * progressRatio) * this.unitLength + random(-1, 1) * maxDisplacement);
      rotate(PI * progressRatio);
      rect(0, 0, shapeSize, shapeSize, shapeSize * 0.2);
      pop();
      this.playedFrameCount++;
    }
  }
};

Object.setPrototypeOf(BrownNoiseNoteVisualizer.prototype, AbstractNoteVisualizer.prototype);

var TrackSystem = function(noteCount) {
  this.noteCount = noteCount;

  this.trackArray = [];
  this.trackVisualizerArray = [];
};

TrackSystem.prototype.start = function() {
  for (var i = 0, len = this.trackArray.length; i < len; i++) {
    this.trackArray[i].start();
  }
  this.updateNotes(this.noteCount);
  
  this.initializeVisualizers();
  this.updateVisualizers();
};

TrackSystem.prototype.playNextNote = function() {
  for (var i = 0, len = this.trackArray.length; i < len; i++) {
    if (soundEnabled) this.trackArray[i].play(this.nextNoteIndex);
  }
  for (var k = 0, klen = this.trackVisualizerArray.length; k < klen; k++) {
    this.trackVisualizerArray[k].receivePlayedNote(this.nextNoteIndex);
  }
  this.nextNoteIndex++;
  if (this.nextNoteIndex >= this.noteCount) {
    this.updateNotes(this.noteCount);
    this.updateVisualizers();
  }
};

TrackSystem.prototype.updateNotes = function(noteCount) {
  for (var i = 0, len = this.trackArray.length; i < len; i++) {
    this.trackArray[i].updateNotes(noteCount);
  }
  this.nextNoteIndex = 0;
};

TrackSystem.prototype.display = function() {
  for (var i = 0, len = this.trackVisualizerArray.length; i < len; i++) {
    this.trackVisualizerArray[i].display();
  }
};

TrackSystem.prototype.updateVisualizers = function() {
  for (var i = 0, len = this.trackVisualizerArray.length; i < len; i++) {
    this.trackVisualizerArray[i].update();
  }
};

TrackSystem.prototype.initializeVisualizers = function() {
  for (var i = 0, len = this.trackVisualizerArray.length; i < len; i++) {
    this.trackVisualizerArray[i].initialize();
  }
};

function setup() {
  var canvasSideLength = max(min(windowWidth, windowHeight) * 0.95, min(displayWidth, displayHeight) * 0.5);
  createCanvas(canvasSideLength, canvasSideLength);
  backgroundColor = color(240);
  ellipseMode(CENTER);
  rectMode(CENTER);

  masterVolume(0.7);
  metronome = Metronome.create(120);


  myTrackSystem = new TrackSystem(32);

  var sineOscillatorEnvelopeParameter = {
    attackLevel: 1,
    releaseLevel: 0,
    attackTime: 0.01,
    decayTime: 0.05,
    susPercent: 0.2,
    releaseTime: 0.01
  };
  
  var sineTrackParameter = {
    oscillatorType: 'sine',
    envelopeParameter: sineOscillatorEnvelopeParameter,
    pan: 0,
    startTime: 0.01,
    sustainTime: 0.08,
    frequency: 880,
    isRandom: true,
    probability: 0.6
  };
  
  var sineTrack = new Track(sineTrackParameter);
  myTrackSystem.trackArray.push(sineTrack);

  var shortWhiteNoiseEnvelopeParameter = {
    attackLevel: 0.8,
    releaseLevel: 0,
    attackTime: 0.001,
    decayTime: 0.03,
    susPercent: 0.1,
    releaseTime: 0.01
  };
  
  var shortWhiteNoiseTrackParameter = {
    oscillatorType: 'white',
    envelopeParameter: shortWhiteNoiseEnvelopeParameter,
    pan: -0.7,
    startTime: 0.01,
    sustainTime: 0.02,
    isRandom: true,
    probability: 0.4
  };
  var shortWhiteNoiseTrack = new Track(shortWhiteNoiseTrackParameter);
  myTrackSystem.trackArray.push(shortWhiteNoiseTrack);

  var longWhiteNoiseEnvelopeParameter = {
    attackLevel: 0.7,
    releaseLevel: 0,
    attackTime: 0.001,
    decayTime: 0.15,
    susPercent: 0.1,
    releaseTime: 0.1
  };
  
  var longWhiteNoiseTrackParameter = {
    oscillatorType: 'white',
    envelopeParameter: longWhiteNoiseEnvelopeParameter,
    pan: +0.7,
    startTime: 0.01,
    sustainTime: 0.05,
    notePattern: [false, false, false, false, true, false, false, false],
    isRandom: false
  };
  
  var longWhiteNoiseTrack = new Track(longWhiteNoiseTrackParameter);
  myTrackSystem.trackArray.push(longWhiteNoiseTrack);

  var brownNoiseEnvelopeParameter = {
    attackLevel: 0.9,
    releaseLevel: 0,
    attackTime: 0.001,
    decayTime: 0.1,
    susPercent: 0.2,
    releaseTime: 0.02
  };
  
  var brownNoiseTrackParameter = {
    oscillatorType: 'brown',
    envelopeParameter: brownNoiseEnvelopeParameter,
    pan: -0.2,
    startTime: 0.01,
    sustainTime: 0.05,
    notePattern: [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false],
    isRandom: true,
    probability: 0.3
  };
  
  var brownNoiseTrack = new Track(brownNoiseTrackParameter);
  myTrackSystem.trackArray.push(brownNoiseTrack);

  myTrackSystem.trackVisualizerArray.push(TrackVisualizer.create(sineTrack, SineNoteVisualizer, width * 0.08, height * 0.16));
  myTrackSystem.trackVisualizerArray.push(TrackVisualizer.create(shortWhiteNoiseTrack, ShortWhiteNoiseNoteVisualizer, width * 0.08, height * 0.24));
  myTrackSystem.trackVisualizerArray.push(TrackVisualizer.create(longWhiteNoiseTrack, LongWhiteNoiseNoteVisualizer, width * 0.08, height * 0.32));
  myTrackSystem.trackVisualizerArray.push(TrackVisualizer.create(brownNoiseTrack, BrownNoiseNoteVisualizer, width * 0.08, height * 0.40));


  myTrackSystem.start();
}

function draw() {
  background(backgroundColor);

  myTrackSystem.display();

  if (metronome.check()) {
    myTrackSystem.playNextNote();
  }
}

function mousePressed() {
  soundEnabled = !soundEnabled;
}
