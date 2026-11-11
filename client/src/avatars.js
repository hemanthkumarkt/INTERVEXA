// D-ID Avatar config with correct male/female voices
export const AVATARS = [
  {
    id: "male1",
    label: "Arjun",
    role: "Senior Engineer",
    gender: "male",
    source_url: "https://create-images-results.d-id.com/DefaultPresenters/Noam_m/image.jpeg",
    voice_id: "en-US-GuyNeural",        // ✅ Male voice
    fallback_voice: "Google UK English Male",
  },
  {
    id: "male2",
    label: "David",
    role: "HR Manager",
    gender: "male",
    source_url: "https://create-images-results.d-id.com/DefaultPresenters/Marcus_m/image.jpeg",
    voice_id: "en-US-ChristopherNeural", // ✅ Male voice
    fallback_voice: "Microsoft David Desktop",
  },
  {
    id: "female1",
    label: "Priya",
    role: "Tech Lead",
    gender: "female",
    source_url: "https://create-images-results.d-id.com/DefaultPresenters/Noelle_f/image.png",
    voice_id: "en-US-JennyNeural",       // ✅ Female voice
    fallback_voice: "Google UK English Female",
  },
  {
    id: "female2",
    label: "Sarah",
    role: "Recruiting Manager",
    gender: "female",
    source_url: "https://create-images-results.d-id.com/DefaultPresenters/Anna_f/image.png",
    voice_id: "en-US-AriaNeural",        // ✅ Female voice
    fallback_voice: "Samantha",
  },
];