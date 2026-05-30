export const PROSE_GENRES = [
  "Novel", "Novella", "Short story", "Flash fiction", "Historical fiction", 
  "Science fiction", "Fantasy", "Mystery", "Detective fiction", "Thriller", 
  "Horror", "Romance", "Adventure", "Crime fiction", "Satire", "Allegory", 
  "Realism", "Magical realism", "Bildungsroman", "Epistolary novel", "Gothic fiction",
  "Autobiography"
];

export const DRAMA_GENRES = [
  "Tragedy", "Comedy", "Tragicomedy", "Melodrama", "Farce", 
  "Historical drama", "Musical drama", "Opera", "Absurd drama", "Epic theatre"
];

export const POETRY_GENRES = [
  "Lyric poetry", "Narrative poetry", "Dramatic poetry", "Sonnet", "Ode", 
  "Elegy", "Ballad", "Epic", "Haiku", "Limerick", "Free verse", "Blank verse",
  "Praise poetry"
];

export const LITERARY_DEVICES = [
  "Imagery", "Metaphor", "Simile", "Symbolism", "Irony", "Dramatic irony", 
  "Verbal irony", "Situational irony", "Foreshadowing", "Flashback", "Allusion", 
  "Allegory", "Personification", "Hyperbole", "Understatement", "Euphemism", 
  "Oxymoron", "Paradox", "Juxtaposition", "Tone", "Mood", "Diction", 
  "Repetition", "Parallelism", "Contrast", "Satire"
];

export const RESEARCH_STRUCTURE = [
  {
    chapter: "Preliminary Pages",
    sections: ["Title Page", "Dedication", "Abstract", "Acknowledgements", "Table of Contents", "List of Tables / Figures"]
  },
  {
    chapter: "Chapter 1: Introduction",
    sections: [
      "1.1 Background of the Study", "1.2 Statement of the Problem", "1.3 Objectives of the Study",
      "1.4 Research Questions", "1.5 Significance of the Study", "1.6 Scope of the Study",
      "1.7 Limitations of the Study", "1.8 Definition of Terms"
    ]
  },
  {
    chapter: "Chapter 2: Literature Review",
    sections: ["2.1 Conceptual Review", "2.2 Theoretical Framework", "2.3 Empirical Review", "2.4 Gap in Literature"]
  },
  {
    chapter: "Chapter 3: Methodology",
    sections: [
      "3.1 Research Design", "3.2 Population of the Study", "3.3 Sample and Sampling Technique",
      "3.4 Data Collection Methods", "3.5 Instrument for Data Collection", "3.6 Validity and Reliability",
      "3.7 Method of Data Analysis"
    ]
  },
  {
    chapter: "Chapter 4: Data Analysis & Discussion",
    sections: ["4.1 Data Presentation", "4.2 Data Analysis", "4.3 Discussion of Findings"]
  },
  {
    chapter: "Chapter 5: Summary, Conclusion & Recommendations",
    sections: ["5.1 Summary of Findings", "5.2 Conclusion", "5.3 Recommendations", "5.4 Suggestions for Further Research"]
  },
  {
    chapter: "Final Sections",
    sections: ["References", "Appendices"]
  }
];

export const REFERENCE_STYLES = ["APA", "MLA", "Harvard", "Chicago", "IEEE"];

export const LANGUAGES = [
  { name: "English", native: "English" },
  { name: "French", native: "Français" },
  { name: "Spanish", native: "Español" },
  { name: "German", native: "Deutsch" },
  { name: "Italian", native: "Italiano" },
  { name: "Portuguese", native: "Português" },
  { name: "Dutch", native: "Nederlands" },
  { name: "Russian", native: "Русский" },
  { name: "Chinese (Mandarin)", native: "中文 (简体)" },
  { name: "Chinese (Cantonese)", native: "粵語 (繁體)" },
  { name: "Japanese", native: "日本語" },
  { name: "Korean", native: "한국어" },
  { name: "Arabic", native: "العربية" },
  { name: "Hindi", native: "हिन्दी" },
  { name: "Bengali", native: "বাংলা" },
  { name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { name: "Tamil", native: "தமிழ்" },
  { name: "Telugu", native: "తెలుగు" },
  { name: "Turkish", native: "Türkçe" },
  { name: "Vietnamese", native: "Tiếng Việt" },
  { name: "Thai", native: "ไทย" },
  { name: "Greek", native: "Ελληνικά" },
  { name: "Hebrew", native: "עברית" },
  { name: "Swahili", native: "Kiswahili" },
  { name: "Amharic", native: "አማርኛ" },
  { name: "Yoruba", native: "Yorùbá" },
  { name: "Hausa", native: "هَوُسَ" },
  { name: "Indonesian", native: "Bahasa Indonesia" },
  { name: "Polish", native: "Polski" },
  { name: "Ukrainian", native: "Українська" },
  { name: "Romanian", native: "Română" },
  { name: "Hungarian", native: "Magyar" },
  { name: "Czech", native: "Čeština" },
  { name: "Swedish", native: "Svenska" },
  { name: "Norwegian", native: "Norsk" },
  { name: "Danish", native: "Dansk" },
  { name: "Finnish", native: "Suomi" },
  { name: "Slovak", native: "Slovenčina" },
  { name: "Bulgarian", native: "Български" },
  { name: "Serbian", native: "Српски" },
  { name: "Croatian", native: "Hrvatski" },
  { name: "Slovenian", native: "Slovenščina" },
  { name: "Lithuanian", native: "Lietuvių" },
  { name: "Latvian", native: "Latviešu" },
  { name: "Estonian", native: "Eesti" },
  { name: "Icelandic", native: "Íslenska" },
  { name: "Persian", native: "فارسی" },
  { name: "Urdu", native: "اردو" },
  { name: "Marathi", native: "मराठी" },
  { name: "Gujarati", native: "ગુજરાતી" },
  { name: "Malayalam", native: "മലയാളം" },
  { name: "Kannada", native: "ಕನ್ನಡ" },
  { name: "Burmese", native: "မြန်မာဘာသာ" },
  { name: "Khmer", native: "ភាសាខ្មែរ" },
  { name: "Lao", native: "ພາສາລາວ" },
  { name: "Malay", native: "Bahasa Melayu" },
  { name: "Tagalog", native: "Tagalog" },
  { name: "Zulu", native: "isiZulu" },
  { name: "Xhosa", native: "isiXhosa" },
  { name: "Afrikaans", native: "Afrikaans" },
  { name: "Somali", native: "Soomaali" },
  { name: "Oromo", native: "Oromoo" },
  { name: "Igbo", native: "Asụsụ Igbo" },
  { name: "Pashto", native: "پښتو" },
  { name: "Kurdish", native: "Kurdî" },
  { name: "Uzbek", native: "Oʻzbekcha" },
  { name: "Kazakh", native: "Қазақша" },
  { name: "Azerbaijani", native: "Azərbaycanca" },
  { name: "Georgian", native: "ქართული" },
  { name: "Armenian", native: "Հայերեն" }
];
