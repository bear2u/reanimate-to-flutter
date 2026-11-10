// Start the motion from t = 0 on both sides: the Flutter clone through its harness hook, the reference page by
// rewinding its CSS / WAAPI animations.
if (window.__reanimateRestart) window.__reanimateRestart();
else document.getAnimations().forEach((a) => { a.pause(); a.currentTime = 0; a.play(); });
