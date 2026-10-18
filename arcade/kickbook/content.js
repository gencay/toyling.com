// Kickbook's player cards (prototype: 8 players). Each card has its text at reading levels 1 and 2 in English and
// Turkish, questions that can only be answered from that text, a "Did you know?" line, and the sources every fact came
// from with the date they were read. Facts that can change (a current club, a record) carry `asOf`.
// Rules (guarded by tests/content.test.js): level 1 = 3 sentences of up to 7 words; level 2 = 4 sentences of up to 9
// words; readability targets per language; every answer (or its `evidence`) appears in the card text of every level
// the question is used at; kind, positive, stable facts only (no fees, scandals or rivalries).
// Art: in this home-only test build (owner's request, October 18, 2026) cards show the real photo and team logos from
// web/img/ (tools/fetch-images.sh, gitignored, never published); `look` and `kit` draw the cartoon fallback.

const READ = '2026-10-18';
const wiki = (page) => `https://en.wikipedia.org/wiki/${page}`;

export const COUNTRIES = {
  BRA: { en: 'Brazil', tr: 'Brezilya' },
  ARG: { en: 'Argentina', tr: 'Arjantin' },
  POR: { en: 'Portugal', tr: 'Portekiz' },
  FRA: { en: 'France', tr: 'Fransa' },
  NOR: { en: 'Norway', tr: 'Norveç' },
  TUR: { en: 'Türkiye', tr: 'Türkiye' },
  USA: { en: 'USA', tr: 'Amerika' },
};

export const POSITIONS = {
  forward: { en: 'Forward', tr: 'Forvet' },
  striker: { en: 'Striker', tr: 'Santrfor' },
  midfielder: { en: 'Midfielder', tr: 'Orta saha' },
};

export const PLAYERS = [
  {
    id: 'pele', name: 'Pelé', names: ['Pelé'], country: 'BRA', position: 'forward', number: 10, era: '1956–1977',
    teams: ['bra', 'santos'],
    look: { skin: 'skin4', hair: 'hairBlack', style: 'short' },
    kit: { shirt: 'kitYellow', trim: 'kitGreen', shorts: 'flagBlue', number: 'kitGreen' },
    sources: [{ url: wiki('Pel%C3%A9'), read: READ, facts: ['Brazil', 'forward', 'number 10', 'World Cups 1958, 1962, 1970 (the only player with three)', 'called O Rei, the King', 'played with a sock stuffed with newspaper as a boy'] }],
    text: {
      en: {
        1: ['Pelé was from Brazil.', 'He wore the number 10.', 'He won three World Cups.'],
        2: ['Pelé was a great player from Brazil.', 'His first ball was a sock full of paper.', 'He won the World Cup three times.', 'People called him the King.'],
      },
      tr: {
        1: ['Pelé Brezilyalı bir futbolcuydu.', 'Formasında 10 numara vardı.', 'Üç kez Dünya Kupası kazandı.'],
        2: ['Pelé, Brezilya’nın büyük bir oyuncusuydu.', 'Küçükken kâğıt dolu bir çorapla oynadı.', 'Dünya Kupası’nı üç kez kazandı.', 'Ona Kral derlerdi.'],
      },
    },
    questions: [
      { id: 'country', kind: 'choice', levels: [1, 2], en: { q: 'Where was Pelé from?', a: 'Brazil', wrong: ['Spain', 'Norway'] }, tr: { q: 'Pelé nereliydi?', a: 'Brezilya', wrong: ['İspanya', 'Norveç'] } },
      { id: 'cups', kind: 'choice', levels: [1, 2], en: { q: 'How many World Cups did he win?', a: 'Three', wrong: ['One', 'Five'] }, tr: { q: 'Kaç kez Dünya Kupası kazandı?', a: 'Üç', wrong: ['Bir', 'Beş'] } },
      { id: 'number', kind: 'truefalse', levels: [1], truth: true, en: { q: 'Pelé wore the number 10.', evidence: '10' }, tr: { q: 'Pelé’nin formasında 10 numara vardı.', evidence: '10' } },
      { id: 'sock', kind: 'truefalse', levels: [2], truth: true, en: { q: 'Pelé’s first ball was a sock.', evidence: 'sock' }, tr: { q: 'Pelé küçükken çorapla oynadı.', evidence: 'çorapla' } },
      { id: 'king', kind: 'choice', levels: [2], en: { q: 'What did people call him?', a: 'The King', wrong: ['The Flash', 'The Wall'] }, tr: { q: 'Ona ne derlerdi?', a: 'Kral', wrong: ['Şimşek', 'Duvar'] } },
      { id: 'spain', kind: 'truefalse', levels: [1, 2], truth: false, en: { q: 'Pelé was from Spain.' }, tr: { q: 'Pelé İspanyalıydı.' } },
    ],
    fact: { en: 'Pelé is the only player who won three World Cups.', tr: 'Üç Dünya Kupası kazanan tek oyuncu Pelé’dir.' },
  },
  {
    id: 'ronaldinho', name: 'Ronaldinho', names: ['Ronaldinho', 'Ronaldo'], country: 'BRA', position: 'midfielder', number: 10, era: '1998–2015',
    teams: ['bra', 'barcelona'],
    look: { skin: 'skin3', hair: 'hairBlack', style: 'long-band' },
    kit: { shirt: 'kitYellow', trim: 'kitGreen', shorts: 'flagBlue', number: 'kitGreen' },
    sources: [{ url: wiki('Ronaldinho'), read: READ, facts: ['Brazil (Porto Alegre)', 'attacking midfielder', 'World Cup 2002', 'Ballon d’Or 2005', 'the name means little Ronaldo', 'futsal and beach football as a boy', 'famous for tricks and dribbling'] }],
    text: {
      en: {
        1: ['Ronaldinho was from Brazil.', 'He did fun tricks with the ball.', 'He won the World Cup in 2002.'],
        2: ['Ronaldinho grew up in Brazil.', 'As a boy, he played on the beach.', 'His name means little Ronaldo.', 'He won the World Cup in 2002.'],
      },
      tr: {
        1: ['Ronaldinho Brezilyalı bir oyuncuydu.', 'Topla çok güzel numaralar yaptı.', '2002’de Dünya Kupası’nı kazandı.'],
        2: ['Ronaldinho, Brezilya’da büyüdü.', 'Küçükken kumsalda top oynadı.', 'Adı, küçük Ronaldo demek.', '2002’de Dünya Kupası’nı kazandı.'],
      },
    },
    questions: [
      { id: 'country', kind: 'choice', levels: [1, 2], en: { q: 'Where was Ronaldinho from?', a: 'Brazil', wrong: ['Norway', 'France'] }, tr: { q: 'Ronaldinho nereliydi?', a: 'Brezilya', wrong: ['Norveç', 'Fransa'] } },
      { id: 'year', kind: 'choice', levels: [1, 2], en: { q: 'When did he win the World Cup?', a: '2002', wrong: ['1990', '2018'] }, tr: { q: 'Dünya Kupası’nı ne zaman kazandı?', a: '2002', wrong: ['1990', '2018'] } },
      { id: 'tricks', kind: 'truefalse', levels: [1], truth: true, en: { q: 'Ronaldinho did tricks with the ball.', evidence: 'tricks' }, tr: { q: 'Ronaldinho topla numaralar yaptı.', evidence: 'numaralar' } },
      { id: 'name', kind: 'choice', levels: [2], en: { q: 'What does his name mean?', a: 'Little Ronaldo', wrong: ['Big Ronaldo', 'Fast Ronaldo'] }, tr: { q: 'Adı ne demek?', a: 'Küçük Ronaldo', wrong: ['Büyük Ronaldo', 'Hızlı Ronaldo'] } },
      { id: 'beach', kind: 'truefalse', levels: [2], truth: true, en: { q: 'As a boy, he played on the beach.', evidence: 'beach' }, tr: { q: 'Küçükken kumsalda top oynadı.', evidence: 'kumsalda' } },
      { id: 'norway', kind: 'truefalse', levels: [1, 2], truth: false, en: { q: 'Ronaldinho was from Norway.' }, tr: { q: 'Ronaldinho Norveçliydi.' } },
    ],
    fact: { en: 'As a boy, Ronaldinho was often the youngest and smallest player.', tr: 'Ronaldinho küçükken genelde en genç ve en ufak oyuncuydu.' },
  },
  {
    id: 'messi', name: 'Lionel Messi', names: ['Messi', 'Lionel'], country: 'ARG', position: 'forward', number: 10, era: '2004–',
    teams: ['arg', 'inter-miami', 'barcelona'],
    look: { skin: 'skin1', hair: 'hairBrown', style: 'beard' },
    kit: { shirt: 'kitWhite', stripes: 'kitSkyStripe', trim: 'kitSkyStripe', shorts: 'kitBlack', number: 'kitBlack' },
    sources: [{ url: wiki('Lionel_Messi'), read: READ, facts: ['Argentina (Rosario)', 'forward', 'number 10', 'World Cup 2022', 'eight Ballon d’Or awards, a record', 'growth hormone treatment as a boy', 'moved to Barcelona at 13', 'plays for Inter Miami in the USA', 'played for Barcelona'] }],
    asOf: { club: READ, ballonDor: READ },
    text: {
      en: {
        1: ['Messi is from Argentina.', 'He wears the number 10.', 'He won the World Cup in 2022.'],
        2: ['Messi was born in Argentina.', 'He was small, but he never gave up.', 'He won the World Cup in 2022.', 'Now he plays in the USA.'],
      },
      tr: {
        1: ['Messi Arjantinli bir futbolcu.', 'Formasında 10 numara var.', '2022’de Dünya Kupası’nı kazandı.'],
        2: ['Messi, Arjantin’de doğdu.', 'Küçükken çok ufaktı ama hiç pes etmedi.', '2022’de Dünya Kupası’nı kazandı.', 'Şimdi Amerika’da oynuyor.'],
      },
    },
    questions: [
      { id: 'country', kind: 'choice', levels: [1, 2], en: { q: 'Where is Messi from?', a: 'Argentina', wrong: ['Portugal', 'Norway'] }, tr: { q: 'Messi nereli?', a: 'Arjantin', wrong: ['Portekiz', 'Norveç'] } },
      { id: 'year', kind: 'choice', levels: [1, 2], en: { q: 'When did he win the World Cup?', a: '2022', wrong: ['2002', '2014'] }, tr: { q: 'Dünya Kupası’nı ne zaman kazandı?', a: '2022', wrong: ['2002', '2014'] } },
      { id: 'number', kind: 'truefalse', levels: [1], truth: true, en: { q: 'Messi wears the number 10.', evidence: '10' }, tr: { q: 'Messi’nin formasında 10 numara var.', evidence: '10' } },
      { id: 'now', kind: 'choice', levels: [2], en: { q: 'Where does Messi play now?', a: 'The USA', evidence: 'USA', wrong: ['Japan', 'Brazil'] }, tr: { q: 'Messi şimdi nerede oynuyor?', a: 'Amerika', wrong: ['Japonya', 'Brezilya'] } },
      { id: 'gaveup', kind: 'truefalse', levels: [2], truth: false, en: { q: 'Messi gave up when he was small.' }, tr: { q: 'Messi küçükken pes etti.' } },
    ],
    fact: { en: 'Messi has won the Golden Ball (Ballon d’Or) eight times. That is a record!', tr: 'Messi, Altın Top (Ballon d’Or) ödülünü sekiz kez kazandı. Bu bir rekor!' },
  },
  {
    id: 'ronaldo', name: 'Cristiano Ronaldo', names: ['Ronaldo', 'Cristiano', 'Madeira', 'CR7'], country: 'POR', position: 'forward', number: 7, era: '2002–',
    teams: ['por', 'al-nassr', 'real-madrid', 'man-utd'],
    look: { skin: 'skin2', hair: 'hairBlack', style: 'short' },
    kit: { shirt: 'kitRed', trim: 'kitGreen', shorts: 'kitGreen', number: 'kitYellow' },
    sources: [{ url: wiki('Cristiano_Ronaldo'), read: READ, facts: ['Portugal (born in Funchal, Madeira)', 'forward', 'number 7', 'called CR7', 'Euro 2016', 'the most goals in men’s international football (146)', 'five Ballon d’Or awards', 'captain of Portugal', 'plays for Al-Nassr; earlier Manchester United and Real Madrid'] }],
    asOf: { goalsRecord: READ },
    text: {
      en: {
        1: ['Ronaldo is from Portugal.', 'He wears the number 7.', 'People call him CR7.'],
        2: ['Cristiano Ronaldo was born on an island.', 'The island is Madeira, in Portugal.', 'He jumps high to head the ball.', 'No man has scored more goals for his country.'],
      },
      tr: {
        1: ['Ronaldo Portekizli bir futbolcu.', 'Formasında 7 numara var.', 'Ona CR7 diyorlar.'],
        2: ['Cristiano Ronaldo bir adada doğdu.', 'Bu ada, Portekiz’deki Madeira.', 'Topa kafa vurmak için çok yükseğe zıplar.', 'Ülkesi için en çok gol atan erkek o.'],
      },
    },
    questions: [
      { id: 'country', kind: 'choice', levels: [1, 2], en: { q: 'Where is Ronaldo from?', a: 'Portugal', wrong: ['Brazil', 'France'] }, tr: { q: 'Ronaldo nereli?', a: 'Portekiz', wrong: ['Brezilya', 'Fransa'] } },
      { id: 'number', kind: 'choice', levels: [1], en: { q: 'What number does he wear?', a: '7', wrong: ['9', '10'] }, tr: { q: 'Formasında kaç numara var?', a: '7', wrong: ['9', '10'] } },
      { id: 'cr7', kind: 'truefalse', levels: [1], truth: true, en: { q: 'People call Ronaldo CR7.', evidence: 'CR7' }, tr: { q: 'Ronaldo’ya CR7 diyorlar.', evidence: 'CR7' } },
      { id: 'island', kind: 'choice', levels: [2], en: { q: 'Where was he born?', a: 'On an island', evidence: 'an island', wrong: ['On a mountain', 'On a ship'] }, tr: { q: 'Nerede doğdu?', a: 'Bir adada', wrong: ['Bir dağda', 'Bir gemide'] } },
      { id: 'jump', kind: 'truefalse', levels: [2], truth: true, en: { q: 'Ronaldo jumps high to head the ball.', evidence: 'jumps high' }, tr: { q: 'Ronaldo topa kafa vurmak için zıplar.', evidence: 'zıplar' } },
      { id: 'brazil', kind: 'truefalse', levels: [1, 2], truth: false, en: { q: 'Ronaldo is from Brazil.' }, tr: { q: 'Ronaldo Brezilyalı.' } },
    ],
    fact: { en: 'Ronaldo helped Portugal win the Euro in 2016.', tr: 'Ronaldo, 2016’da Portekiz’in Avrupa Şampiyonu olmasına yardım etti.' },
  },
  {
    id: 'mbappe', name: 'Kylian Mbappé', names: ['Mbappé', 'Kylian', 'Paris'], country: 'FRA', position: 'forward', number: 10, era: '2015–',
    teams: ['fra', 'real-madrid'],
    look: { skin: 'skin3', hair: 'hairBlack', style: 'shaved' },
    kit: { shirt: 'kitNavy', trim: 'kitRed', shorts: 'kitWhite', number: 'kitWhite' },
    sources: [{ url: wiki('Kylian_Mbapp%C3%A9'), read: READ, facts: ['France (born in Paris, grew up in Bondy)', 'forward', 'World Cup 2018 at 19', 'hat-trick in the 2022 World Cup final', 'known for pace; called the fastest player in the world (Le Figaro, 2020)', 'number 10 at Real Madrid'] }],
    text: {
      en: {
        1: ['Mbappé is from France.', 'He runs very, very fast.', 'He won the World Cup at 19.'],
        2: ['Kylian Mbappé grew up near Paris, in France.', 'He can run faster than most players.', 'He won the World Cup when he was 19.', 'In another final, he scored three goals.'],
      },
      tr: {
        1: ['Mbappé Fransız bir futbolcu.', 'Çok ama çok hızlı koşar.', '19 yaşında Dünya Kupası’nı kazandı.'],
        2: ['Kylian Mbappé, Paris’in yanında büyüdü.', 'Çoğu oyuncudan daha hızlı koşar.', '19 yaşında Dünya Kupası’nı kazandı.', 'Başka bir finalde üç gol attı.'],
      },
    },
    questions: [
      { id: 'country', kind: 'choice', levels: [1], en: { q: 'Where is Mbappé from?', a: 'France', wrong: ['Argentina', 'Türkiye'] }, tr: { q: 'Mbappé nereli?', a: 'Fransa', evidence: 'Fransız', wrong: ['Arjantin', 'Türkiye'] } },
      { id: 'age', kind: 'choice', levels: [1, 2], en: { q: 'How old was he when he won the World Cup?', a: '19', wrong: ['12', '30'] }, tr: { q: 'Dünya Kupası’nı kaç yaşında kazandı?', a: '19', wrong: ['12', '30'] } },
      { id: 'fast', kind: 'truefalse', levels: [1, 2], truth: true, en: { q: 'Mbappé runs very fast.', evidence: 'fast' }, tr: { q: 'Mbappé çok hızlı koşar.', evidence: 'hızlı' } },
      { id: 'three', kind: 'choice', levels: [2], en: { q: 'How many goals did he score in another final?', a: 'Three', wrong: ['One', 'Two'] }, tr: { q: 'Başka bir finalde kaç gol attı?', a: 'Üç', wrong: ['Bir', 'İki'] } },
      { id: 'paris', kind: 'choice', levels: [2], en: { q: 'Which city did he grow up near?', a: 'Paris', wrong: ['London', 'Rome'] }, tr: { q: 'Hangi şehrin yanında büyüdü?', a: 'Paris', wrong: ['Londra', 'Roma'] } },
      { id: 'argentina', kind: 'truefalse', levels: [1], truth: false, en: { q: 'Mbappé is from Argentina.' }, tr: { q: 'Mbappé Arjantinli.' } },
    ],
    fact: { en: 'A French newspaper once called Mbappé the fastest player in the world.', tr: 'Bir Fransız gazetesi Mbappé’ye dünyanın en hızlı oyuncusu dedi.' },
  },
  {
    id: 'haaland', name: 'Erling Haaland', names: ['Haaland', 'Erling'], country: 'NOR', position: 'striker', number: 9, era: '2016–',
    teams: ['nor', 'man-city'],
    look: { skin: 'skin1', hair: 'hairBlond', style: 'bun' },
    kit: { shirt: 'kitRed', trim: 'kitWhite', shorts: 'kitWhite', number: 'kitWhite' },
    sources: [{ url: wiki('Erling_Haaland'), read: READ, facts: ['Norway (born in Leeds, England, where his father Alf-Inge played)', 'striker', 'number 9', '36 Premier League goals in 2022–23, a record', 'sits in the lotus position after a goal', '1.95 m tall'] }],
    text: {
      en: {
        1: ['Haaland is from Norway.', 'He is very tall and strong.', 'He wears the number 9.'],
        2: ['Erling Haaland plays for Norway.', 'He was born in England, where his dad played.', 'After a goal, he sits still and calm.', 'He once scored 36 goals in one league season.'],
      },
      tr: {
        1: ['Haaland Norveçli bir futbolcu.', 'Çok uzun ve çok güçlü.', 'Formasında 9 numara var.'],
        2: ['Erling Haaland, Norveç için oynuyor.', 'Babasının oynadığı İngiltere’de doğdu.', 'Gol atınca sakin sakin oturur.', 'Bir sezonda ligde 36 gol attı.'],
      },
    },
    questions: [
      { id: 'country', kind: 'choice', levels: [1, 2], en: { q: 'Which country does Haaland play for?', a: 'Norway', wrong: ['Spain', 'Brazil'] }, tr: { q: 'Haaland hangi ülke için oynuyor?', a: 'Norveç', wrong: ['İspanya', 'Brezilya'] } },
      { id: 'number', kind: 'choice', levels: [1], en: { q: 'What number does he wear?', a: '9', wrong: ['7', '10'] }, tr: { q: 'Formasında kaç numara var?', a: '9', wrong: ['7', '10'] } },
      { id: 'tall', kind: 'truefalse', levels: [1], truth: true, en: { q: 'Haaland is very tall.', evidence: 'tall' }, tr: { q: 'Haaland çok uzun.', evidence: 'uzun' } },
      { id: 'born', kind: 'choice', levels: [2], en: { q: 'Where was Haaland born?', a: 'England', wrong: ['Norway', 'Spain'] }, tr: { q: 'Haaland nerede doğdu?', a: 'İngiltere', wrong: ['Norveç', 'İspanya'] } },
      { id: 'calm', kind: 'choice', levels: [2], en: { q: 'What does he do after a goal?', a: 'He sits still', evidence: 'sits still', wrong: ['He dances', 'He sings'] }, tr: { q: 'Gol atınca ne yapar?', a: 'Sakin sakin oturur', wrong: ['Dans eder', 'Şarkı söyler'] } },
      { id: 'goals', kind: 'truefalse', levels: [2], truth: true, en: { q: 'Haaland scored 36 goals in one season.', evidence: '36' }, tr: { q: 'Haaland bir sezonda 36 gol attı.', evidence: '36' } },
    ],
    fact: { en: 'Haaland is 1.95 meters tall. That is taller than most doors!', tr: 'Haaland’ın boyu 1,95 metre. Çoğu kapıdan daha uzun!' },
  },
  {
    id: 'arda', name: 'Arda Güler', names: ['Arda', 'Güler', 'Ankara', 'Real', 'Madrid'], country: 'TUR', position: 'midfielder', number: 15, era: '2021–',
    teams: ['tur', 'real-madrid', 'fenerbahce'],
    look: { skin: 'skin2', hair: 'hairBlack', style: 'short' },
    kit: { shirt: 'kitRed', trim: 'kitWhite', shorts: 'kitWhite', number: 'kitWhite' },
    sources: [{ url: wiki('UEFA_Euro_2024_Group_F'), read: READ, facts: ['youngest debutant to score at the Euro final tournament'] }, { url: wiki('Arda_G%C3%BCler'), read: READ, facts: ['Türkiye (born in Altındağ, Ankara)', 'attacking midfielder', 'left-footed', 'Fenerbahçe, then Real Madrid from July 2023', 'scored against Georgia at Euro 2024, the youngest player to score on his Euro debut (also UEFA Euro 2024 Group F page)', 'number 15 at Real Madrid'] }],
    asOf: { club: READ },
    text: {
      en: {
        1: ['Arda Güler is from Türkiye.', 'He kicks with his left foot.', 'He plays for Real Madrid.'],
        2: ['Arda Güler grew up in Ankara, in Türkiye.', 'He kicks the ball with his left foot.', 'He scored a great goal for Türkiye.', 'Now he plays for Real Madrid in Spain.'],
      },
      tr: {
        1: ['Arda Güler Türk bir futbolcu.', 'Topa sol ayağıyla vurur.', 'Real Madrid’de oynuyor.'],
        2: ['Arda Güler, Ankara’da büyüdü.', 'Topa sol ayağıyla vurur.', 'Türkiye için harika bir gol attı.', 'Şimdi İspanya’da, Real Madrid’de oynuyor.'],
      },
    },
    questions: [
      { id: 'country', kind: 'choice', levels: [1, 2], en: { q: 'Where is Arda Güler from?', a: 'Türkiye', wrong: ['France', 'Brazil'] }, tr: { q: 'Arda Güler nereli?', a: 'Türkiye', evidence: 'Türk', wrong: ['Fransa', 'Brezilya'] } },
      { id: 'foot', kind: 'choice', levels: [1, 2], en: { q: 'Which foot does he kick with?', a: 'His left foot', evidence: 'left foot', wrong: ['His right foot', 'His head'] }, tr: { q: 'Topa hangi ayağıyla vurur?', a: 'Sol ayağıyla', wrong: ['Sağ ayağıyla', 'Kafasıyla'] } },
      { id: 'club', kind: 'truefalse', levels: [1, 2], truth: true, en: { q: 'Arda plays for Real Madrid.', evidence: 'Real Madrid' }, tr: { q: 'Arda, Real Madrid’de oynuyor.', evidence: 'Real Madrid' } },
      { id: 'city', kind: 'choice', levels: [2], en: { q: 'Which city did he grow up in?', a: 'Ankara', wrong: ['Paris', 'London'] }, tr: { q: 'Hangi şehirde büyüdü?', a: 'Ankara', wrong: ['Paris', 'Londra'] } },
      { id: 'right', kind: 'truefalse', levels: [1, 2], truth: false, en: { q: 'Arda kicks with his right foot.' }, tr: { q: 'Arda topa sağ ayağıyla vurur.' } },
    ],
    fact: { en: 'At Euro 2024, Arda scored in his very first Euro game. No younger player had done that!', tr: 'Arda, Euro 2024’teki ilk maçında gol attı. Bunu ondan daha genç yapan olmamıştı!' },
  },
  {
    id: 'mia', name: 'Mia Hamm', names: ['Mia', 'Hamm'], country: 'USA', position: 'forward', number: 9, era: '1987–2004',
    teams: ['usa'],
    look: { skin: 'skin1', hair: 'hairBrown', style: 'ponytail' },
    kit: { shirt: 'kitWhite', trim: 'flagNavy', shorts: 'flagNavy', number: 'flagNavy' },
    sources: [{ url: wiki('Mia_Hamm'), read: READ, facts: ['USA (born in Selma, Alabama)', 'forward', 'number 9 for the national team', 'Women’s World Cups 1991 and 1999', 'Olympic gold 1996 and 2004', 'born with a club foot, wore corrective shoes as a toddler', 'grew up on Air Force bases'] }],
    text: {
      en: {
        1: ['Mia Hamm is from the USA.', 'She scored lots of goals.', 'She won two World Cups.'],
        2: ['As a baby, Mia Hamm wore special shoes.', 'Later, she became a star for the USA.', 'She won two World Cups.', 'She also won two Olympic gold medals.'],
      },
      tr: {
        1: ['Mia Hamm Amerikalı bir futbolcu.', 'Çok gol attı.', 'İki kez Dünya Kupası kazandı.'],
        2: ['Mia Hamm bebekken özel ayakkabılar giydi.', 'Sonra Amerika’nın yıldızı oldu.', 'İki kez Dünya Kupası kazandı.', 'İki Olimpiyat altın madalyası da aldı.'],
      },
    },
    questions: [
      { id: 'country', kind: 'choice', levels: [1, 2], en: { q: 'Where is Mia Hamm from?', a: 'The USA', evidence: 'USA', wrong: ['Canada', 'Japan'] }, tr: { q: 'Mia Hamm nereli?', a: 'Amerika', wrong: ['Kanada', 'Japonya'] } },
      { id: 'cups', kind: 'choice', levels: [1, 2], en: { q: 'How many World Cups did she win?', a: 'Two', wrong: ['One', 'Four'] }, tr: { q: 'Kaç kez Dünya Kupası kazandı?', a: 'İki', wrong: ['Bir', 'Dört'] } },
      { id: 'goals', kind: 'truefalse', levels: [1], truth: true, en: { q: 'Mia Hamm scored lots of goals.', evidence: 'goals' }, tr: { q: 'Mia Hamm çok gol attı.', evidence: 'gol' } },
      { id: 'shoes', kind: 'choice', levels: [2], en: { q: 'What did she wear as a baby?', a: 'Special shoes', wrong: ['A big hat', 'Gloves'] }, tr: { q: 'Bebekken ne giydi?', a: 'Özel ayakkabılar', wrong: ['Büyük bir şapka', 'Eldiven'] } },
      { id: 'gold', kind: 'truefalse', levels: [2], truth: true, en: { q: 'Mia Hamm won Olympic gold medals.', evidence: 'gold' }, tr: { q: 'Mia Hamm Olimpiyat altın madalyası aldı.', evidence: 'altın' } },
      { id: 'japan', kind: 'truefalse', levels: [1], truth: false, en: { q: 'Mia Hamm is from Japan.' }, tr: { q: 'Mia Hamm Japon.' } },
    ],
    fact: { en: 'As a child, Mia Hamm lived in many places, because her dad was in the Air Force.', tr: 'Mia Hamm’ın babası hava kuvvetlerindeydi, bu yüzden çocukken çok yerde yaşadı.' },
  },
];

/** The 3 players every new game starts with; the rest come from sticker packs, except UNLOCK_AFTER players. */
export const START_UNLOCKED = ['pele', 'messi', 'ronaldinho'];

/** Players earned by reading, not packs: Cristiano Ronaldo opens when the Messi or Pelé card is finished (owner's request). */
export const UNLOCK_AFTER = { ronaldo: ['messi', 'pele'] };

/** Teams shown with logos on the cards (web/img/teams/<id>.png); `national` teams use the federation crest. */
export const TEAMS = {
  bra: { name: { en: 'Brazil', tr: 'Brezilya' }, national: true },
  arg: { name: { en: 'Argentina', tr: 'Arjantin' }, national: true },
  por: { name: { en: 'Portugal', tr: 'Portekiz' }, national: true },
  fra: { name: { en: 'France', tr: 'Fransa' }, national: true },
  nor: { name: { en: 'Norway', tr: 'Norveç' }, national: true },
  tur: { name: { en: 'Türkiye', tr: 'Türkiye' }, national: true },
  usa: { name: { en: 'USA', tr: 'ABD' }, national: true },
  santos: { name: { en: 'Santos', tr: 'Santos' } },
  barcelona: { name: { en: 'Barcelona', tr: 'Barcelona' } },
  'inter-miami': { name: { en: 'Inter Miami', tr: 'Inter Miami' } },
  'al-nassr': { name: { en: 'Al-Nassr', tr: 'Al-Nassr' } },
  'real-madrid': { name: { en: 'Real Madrid', tr: 'Real Madrid' } },
  'man-utd': { name: { en: 'Manchester United', tr: 'Manchester United' } },
  'man-city': { name: { en: 'Manchester City', tr: 'Manchester City' } },
  fenerbahce: { name: { en: 'Fenerbahçe', tr: 'Fenerbahçe' } },
};
