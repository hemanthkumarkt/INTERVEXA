// Drop-in replacement for fallbackSpeak in MockInterview.jsx
// Properly selects male/female browser voice based on avatar gender

export const fallbackSpeak = (text, avatar, onDone) => {
  const synth = window.speechSynthesis;
  synth.cancel();

  const speak = () => {
    const utter = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const isFemale = avatar?.gender === "female";

    // Try to find a matching gender voice
    const femaleVoices = voices.filter(v =>
      /female|zira|jenny|aria|samantha|susan|victoria|karen|moira|fiona|tessa/i.test(v.name) ||
      v.name.includes("Google UK English Female") ||
      v.name.includes("Microsoft Zira")
    );

    const maleVoices = voices.filter(v =>
      /male|david|guy|mark|christopher|daniel|oliver|fred/i.test(v.name) ||
      v.name.includes("Google UK English Male") ||
      v.name.includes("Microsoft David") ||
      v.name.includes("Microsoft Mark")
    );

    // Pick voice by gender
    if (isFemale && femaleVoices.length > 0) {
      // Different female avatars get different voices
      const voiceIdx = avatar.id === "female1" ? 0 : Math.min(1, femaleVoices.length - 1);
      utter.voice = femaleVoices[voiceIdx];
      utter.pitch = avatar.id === "female1" ? 1.1 : 0.95;
    } else if (!isFemale && maleVoices.length > 0) {
      // Different male avatars get different voices
      const voiceIdx = avatar.id === "male1" ? 0 : Math.min(1, maleVoices.length - 1);
      utter.voice = maleVoices[voiceIdx];
      utter.pitch = avatar.id === "male1" ? 0.9 : 1.0;
    } else {
      // Fallback: use pitch to differentiate
      utter.pitch = isFemale ? (avatar.id === "female1" ? 1.2 : 1.05) : (avatar.id === "male1" ? 0.85 : 0.95);
    }

    utter.rate  = 0.92;
    utter.onstart = () => {};
    utter.onend   = () => { if (onDone) onDone(); };
    utter.onerror = () => { if (onDone) onDone(); };
    synth.speak(utter);
  };

  // Voices may not be loaded yet
  if (synth.getVoices().length === 0) {
    synth.onvoiceschanged = () => { synth.onvoiceschanged = null; speak(); };
  } else {
    speak();
  }
};