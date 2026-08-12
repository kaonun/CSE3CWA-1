// Australian English phoneme inventory (Cox & Fletcher / HCE conventions).
// symbol is the IPA token value used everywhere words are built as string[]
// arrays — never split a phoneme string, since many symbols are multi-char
// (tʃ, dʒ, iː, ɐː, ɜː, ʉː, oː, æɪ, æɔ, ɔɪ, əʉ, ɑe, ɪə, eː).

export const PHONEMES = [
  // Consonants — plosive
  { symbol: "p", label: "P", example: "pig", type: "consonant", group: "plosive" },
  { symbol: "b", label: "B", example: "bed", type: "consonant", group: "plosive" },
  { symbol: "t", label: "T", example: "top", type: "consonant", group: "plosive" },
  { symbol: "d", label: "D", example: "dog", type: "consonant", group: "plosive" },
  { symbol: "k", label: "K", example: "cat", type: "consonant", group: "plosive" },
  { symbol: "g", label: "G", example: "goat", type: "consonant", group: "plosive" },

  // Consonants — nasal
  { symbol: "m", label: "M", example: "man", type: "consonant", group: "nasal" },
  { symbol: "n", label: "N", example: "nose", type: "consonant", group: "nasal" },
  { symbol: "ŋ", label: "NG", example: "sing", type: "consonant", group: "nasal" },

  // Consonants — fricative
  { symbol: "f", label: "F", example: "fish", type: "consonant", group: "fricative" },
  { symbol: "v", label: "V", example: "van", type: "consonant", group: "fricative" },
  { symbol: "θ", label: "TH", example: "thin", type: "consonant", group: "fricative" },
  { symbol: "ð", label: "TH", example: "this", type: "consonant", group: "fricative" },
  { symbol: "s", label: "S", example: "sun", type: "consonant", group: "fricative" },
  { symbol: "z", label: "Z", example: "zoo", type: "consonant", group: "fricative" },
  { symbol: "ʃ", label: "SH", example: "shop", type: "consonant", group: "fricative" },
  { symbol: "ʒ", label: "ZH", example: "measure", type: "consonant", group: "fricative" },
  { symbol: "h", label: "H", example: "hat", type: "consonant", group: "fricative" },

  // Consonants — affricate
  { symbol: "tʃ", label: "CH", example: "chair", type: "consonant", group: "affricate" },
  { symbol: "dʒ", label: "J", example: "jam", type: "consonant", group: "affricate" },

  // Consonants — approximant
  { symbol: "l", label: "L", example: "leg", type: "consonant", group: "approximant" },
  { symbol: "ɹ", label: "R", example: "red", type: "consonant", group: "approximant" },
  { symbol: "w", label: "W", example: "wet", type: "consonant", group: "approximant" },
  { symbol: "j", label: "Y", example: "yes", type: "consonant", group: "approximant" },

  // Vowels — short
  { symbol: "ɪ", label: "I", example: "sit", type: "vowel", group: "short" },
  { symbol: "e", label: "E", example: "bed", type: "vowel", group: "short" },
  { symbol: "æ", label: "A", example: "cat", type: "vowel", group: "short" },
  { symbol: "ɐ", label: "U", example: "cup", type: "vowel", group: "short" },
  { symbol: "ɔ", label: "O", example: "hot", type: "vowel", group: "short" },
  { symbol: "ʊ", label: "U", example: "put", type: "vowel", group: "short" },
  { symbol: "ə", label: "UH", example: "about", type: "vowel", group: "short" },

  // Vowels — long
  { symbol: "iː", label: "EE", example: "bee", type: "vowel", group: "long" },
  { symbol: "eː", label: "AIR", example: "square", type: "vowel", group: "long" },
  { symbol: "ɐː", label: "AR", example: "car", type: "vowel", group: "long" },
  { symbol: "ɜː", label: "ER", example: "bird", type: "vowel", group: "long" },
  { symbol: "ʉː", label: "OO", example: "boot", type: "vowel", group: "long" },
  { symbol: "oː", label: "OR", example: "north", type: "vowel", group: "long" },

  // Vowels — diphthong
  { symbol: "æɪ", label: "AY", example: "face", type: "vowel", group: "diphthong" },
  { symbol: "æɔ", label: "OW", example: "mouth", type: "vowel", group: "diphthong" },
  { symbol: "ɔɪ", label: "OY", example: "boy", type: "vowel", group: "diphthong" },
  { symbol: "əʉ", label: "OH", example: "goat", type: "vowel", group: "diphthong" },
  { symbol: "ɑe", label: "IE", example: "high", type: "vowel", group: "diphthong" },
  { symbol: "ɪə", label: "EAR", example: "near", type: "vowel", group: "diphthong" },
];

export const bySymbol = (sym) => PHONEMES.find((p) => p.symbol === sym);

export const hintFor = (sym) => {
  const p = bySymbol(sym);
  return `${p.label} as in ${p.example}`;
};

// Rows grouped by manner of articulation / vowel length, for rendering the
// keyboard as a phonetic chart rather than a flat keypad.
export const KEYBOARD_ROWS = [
  { title: "Plosive", symbols: ["p", "b", "t", "d", "k", "g"] },
  { title: "Nasal", symbols: ["m", "n", "ŋ"] },
  { title: "Fricative", symbols: ["f", "v", "θ", "ð", "s", "z", "ʃ", "ʒ", "h"] },
  { title: "Affricate", symbols: ["tʃ", "dʒ"] },
  { title: "Approximant", symbols: ["l", "ɹ", "w", "j"] },
  { title: "Short vowel", symbols: ["ɪ", "e", "æ", "ɐ", "ɔ", "ʊ", "ə"] },
  { title: "Long vowel", symbols: ["iː", "eː", "ɐː", "ɜː", "ʉː", "oː"] },
  { title: "Diphthong", symbols: ["æɪ", "æɔ", "ɔɪ", "əʉ", "ɑe", "ɪə"] },
];
