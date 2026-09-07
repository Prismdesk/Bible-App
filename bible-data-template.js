/* =========================================================================
   BIBLE-DATA-TEMPLATE.JS
   =========================================================================
   This is the ONLY file you need to edit to add your own Bible text.
   It is plain JavaScript, so keep the punctuation (commas, quotes, braces)
   exactly as shown or the app will fail to load.

   The file defines one global object: BIBLE_DATA

   ---------------------------------------------------------------------
   1) VERSIONS
   ---------------------------------------------------------------------
   List every translation you want to be able to switch between.
   "id" is a short lowercase key you will reuse inside each verse's
   "text" object below (e.g. "web", "kjv", "niv", "esv"...).

   ---------------------------------------------------------------------
   2) BOOKS -> CHAPTERS -> VERSES
   ---------------------------------------------------------------------
   Each book has an id, a display name, a testament ("old" or "new"),
   and a list of chapters. Each chapter has a number and a list of
   verses. Each verse has a number and a "text" object keyed by
   version id.

   ---------------------------------------------------------------------
   3) TITLES (section headings)
   ---------------------------------------------------------------------
   Add an optional "sections" array to any chapter to insert a heading
   before a given verse, e.g. a heading like "The Woman at the Well"
   that appears right before verse 4:

     sections: [ { beforeVerse: 4, title: "The Woman at the Well" } ]

   You can add as many as you like, and they work with any version.

   ---------------------------------------------------------------------
   4) FOOTNOTES
   ---------------------------------------------------------------------
   To attach a footnote to a word inside a verse, insert a marker token
   right after the word in the verse text:

     "In the beginning God{{fn:a}} created the heavens and the earth."

   Then list what that marker says in the verse's "footnotes" array:

     footnotes: [ { marker: "a", text: "Or: In the beginning, when God
     began to create..." } ]

   Markers can be letters ("a", "b", "c"...) or numbers - whatever you
   like, as long as each marker used in "footnotes" matches a
   {{fn:marker}} token somewhere in that verse's text for that version.
   Footnotes are per verse (shared across versions on that verse) -
   if two versions need different footnote text for the same spot,
   just give them different markers (e.g. "a-web" and "a-kjv").

   ---------------------------------------------------------------------
   TEMPLATE FOR A NEW BOOK (copy/paste and fill in)
   ---------------------------------------------------------------------

   {
     id: "xxx",              // short unique id, e.g. "mrk", "rom"
     name: "Book Name",
     testament: "old",       // or "new"
     chapters: [
       {
         number: 1,
         sections: [
           // { beforeVerse: 1, title: "Optional heading" }
         ],
         verses: [
           {
             number: 1,
             text: {
               web: "Verse text for the WEB version...",
               kjv: "Verse text for the KJV version..."
             },
             footnotes: [
               // { marker: "a", text: "Footnote text..." }
             ]
           }
           // ...more verses
         ]
       }
       // ...more chapters
     ]
   }

   ---------------------------------------------------------------------
   SAMPLE DATA INCLUDED BELOW
   ---------------------------------------------------------------------
   Genesis 1:1-5 and John 3:1-21, in two public-domain translations
   (WEB - World English Bible, and KJV - King James Version), are
   filled in below so you can see the structure working end to end
   and try every feature immediately. Replace/expand freely - this
   sample content is just scaffolding.
   ========================================================================= */

const BIBLE_DATA = {

  versions: [
    { id: "web", name: "World English Bible", abbreviation: "WEB" },
    { id: "kjv", name: "King James Version", abbreviation: "KJV" }
  ],

  books: [
    {
      id: "gen",
      name: "Genesis",
      testament: "old",
      chapters: [
        {
          number: 1,
          sections: [
            { beforeVerse: 1, title: "The Beginning" }
          ],
          verses: [
            {
              number: 1,
              text: {
                web: "In the beginning God{{fn:a}} created the heavens and the earth.",
                kjv: "In the beginning God created the heaven and the earth."
              },
              footnotes: [
                { marker: "a", text: "After \u201cGod,\u201d the Hebrew text has the two letters \u201cAleph Tav\u201d (the first and last letters of the Hebrew alphabet) as a grammatical marker." }
              ]
            },
            {
              number: 2,
              text: {
                web: "Now the earth was formless and empty. Darkness was on the surface of the deep. God's Spirit was hovering over the surface of the waters.",
                kjv: "And the earth was without form, and void; and darkness was upon the face of the deep. And the Spirit of God moved upon the face of the waters."
              },
              footnotes: []
            },
            {
              number: 3,
              text: {
                web: "God said, \"Let there be light,\" and there was light.",
                kjv: "And God said, Let there be light: and there was light."
              },
              footnotes: []
            },
            {
              number: 4,
              text: {
                web: "God saw the light, and saw that it was good. God divided the light from the darkness.",
                kjv: "And God saw the light, that it was good: and God divided the light from the darkness."
              },
              footnotes: []
            },
            {
              number: 5,
              text: {
                web: "God called the light Day, and the darkness he called Night. There was evening and there was morning, one day.",
                kjv: "And God called the light Day, and the darkness he called Night. And the evening and the morning were the first day."
              },
              footnotes: []
            }
          ]
        }
      ]
    },

    {
      id: "jhn",
      name: "John",
      testament: "new",
      chapters: [
        {
          number: 3,
          sections: [
            { beforeVerse: 1, title: "Jesus Teaches Nicodemus" }
          ],
          verses: [
            { number: 1, text: {
                web: "Now there was a man of the Pharisees named Nicodemus, a ruler of the Jews.",
                kjv: "There was a man of the Pharisees, named Nicodemus, a ruler of the Jews:" },
              footnotes: [] },
            { number: 2, text: {
                web: "The same came to him by night, and said to him, \"Rabbi, we know that you are a teacher come from God, for no one can do these signs that you do, unless God is with him.\"",
                kjv: "The same came to Jesus by night, and said unto him, Rabbi, we know that thou art a teacher come from God: for no man can do these miracles that thou doest, except God be with him." },
              footnotes: [] },
            { number: 3, text: {
                web: "Jesus answered him, \"Most assuredly, I tell you, unless one is born anew{{fn:web3}}, he can't see the Kingdom of God.\"",
                kjv: "Jesus answered and said unto him, Verily, verily, I say unto thee, Except a man be born again, he cannot see the kingdom of God." },
              footnotes: [ { marker: "web3", text: "The word translated \u201canew\u201d here and in John 3:7 (anothen) also means \u201cagain\u201d and \u201cfrom above.\u201d" } ] },
            { number: 4, text: {
                web: "Nicodemus said to him, \"How can a man be born when he is old? Can he enter a second time into his mother's womb, and be born?\"",
                kjv: "Nicodemus saith unto him, How can a man be born when he is old? can he enter the second time into his mother's womb, and be born?" },
              footnotes: [] },
            { number: 5, text: {
                web: "Jesus answered, \"Most assuredly I tell you, unless one is born of water and spirit, he can't enter into the Kingdom of God!",
                kjv: "Jesus answered, Verily, verily, I say unto thee, Except a man be born of water and of the Spirit, he cannot enter into the kingdom of God." },
              footnotes: [] },
            { number: 6, text: {
                web: "That which is born of the flesh is flesh. That which is born of the Spirit is spirit.",
                kjv: "That which is born of the flesh is flesh; and that which is born of the Spirit is spirit." },
              footnotes: [] },
            { number: 7, text: {
                web: "Don't marvel that I said to you, 'You must be born anew.'",
                kjv: "Marvel not that I said unto thee, Ye must be born again." },
              footnotes: [] },
            { number: 8, text: {
                web: "The wind{{fn:web8}} blows where it wants to, and you hear its sound, but don't know where it comes from and where it is going. So is everyone who is born of the Spirit.\"",
                kjv: "The wind bloweth where it listeth, and thou hearest the sound thereof, but canst not tell whence it cometh, and whither it goeth: so is every one that is born of the Spirit." },
              footnotes: [ { marker: "web8", text: "The same Greek word (pneuma) means wind, breath, and spirit." } ] },
            { number: 9, text: {
                web: "Nicodemus answered him, \"How can these things be?\"",
                kjv: "Nicodemus answered and said unto him, How can these things be?" },
              footnotes: [] },
            { number: 10, text: {
                web: "Jesus answered him, \"Are you the teacher of Israel, and don't understand these things?",
                kjv: "Jesus answered and said unto him, Art thou a master of Israel, and knowest not these things?" },
              footnotes: [] },
            { number: 11, text: {
                web: "Most assuredly I tell you, we speak that which we know, and testify of that which we have seen, and you don't receive our witness.",
                kjv: "Verily, verily, I say unto thee, We speak that we do know, and testify that we have seen; and ye receive not our witness." },
              footnotes: [] },
            { number: 12, text: {
                web: "If I told you earthly things and you don't believe, how will you believe if I tell you heavenly things?",
                kjv: "If I have told you earthly things, and ye believe not, how shall ye believe, if I tell you of heavenly things?" },
              footnotes: [] },
            { number: 13, text: {
                web: "No one has ascended into heaven, but he who descended out of heaven, the Son of Man, who is in heaven.",
                kjv: "And no man hath ascended up to heaven, but he that came down from heaven, even the Son of man which is in heaven." },
              footnotes: [] },
            { number: 14, text: {
                web: "As Moses lifted up the serpent in the wilderness, even so must the Son of Man be lifted up,",
                kjv: "And as Moses lifted up the serpent in the wilderness, even so must the Son of man be lifted up:" },
              footnotes: [] },
            { number: 15, text: {
                web: "that whoever believes in him should not perish, but have eternal life.",
                kjv: "That whosoever believeth in him should not perish, but have eternal life." },
              footnotes: [] },
            { number: 16, text: {
                web: "For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.",
                kjv: "For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life." },
              footnotes: [] },
            { number: 17, text: {
                web: "For God didn't send his Son into the world to judge the world, but that the world should be saved through him.",
                kjv: "For God sent not his Son into the world to condemn the world; but that the world through him might be saved." },
              footnotes: [] },
            { number: 18, text: {
                web: "He who believes in him is not judged. He who doesn't believe has been judged already, because he has not believed in the name of the one and only Son of God.",
                kjv: "He that believeth on him is not condemned: but he that believeth not is condemned already, because he hath not believed in the name of the only begotten Son of God." },
              footnotes: [] },
            { number: 19, text: {
                web: "This is the judgment, that the light has come into the world, and men loved the darkness rather than the light; for their works were evil.",
                kjv: "And this is the condemnation, that light is come into the world, and men loved darkness rather than light, because their deeds were evil." },
              footnotes: [] },
            { number: 20, text: {
                web: "For everyone who does evil hates the light, and doesn't come to the light, lest his works would be exposed.",
                kjv: "For every one that doeth evil hateth the light, neither cometh to the light, lest his deeds should be reproved." },
              footnotes: [] },
            { number: 21, text: {
                web: "But he who does the truth comes to the light, that his works may be revealed, that they have been done in God.\"",
                kjv: "But he that doeth truth cometh to the light, that his deeds may be made manifest, that they are wrought in God." },
              footnotes: [] }
          ]
        }
      ]
    }
  ]
};
