import '@testing-library/jest-dom/vitest';

// jsdom has no real media pipeline — stub the calls MediaSlide makes so
// video-path tests can drive playback purely through dispatched events.
HTMLMediaElement.prototype.play = function play() {
  return Promise.resolve();
};
HTMLMediaElement.prototype.pause = function pause() {};
HTMLMediaElement.prototype.load = function load() {};
