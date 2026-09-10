export type MotivationalQuote = {
  text: string;
  author: string;
  role?: string;
};

const QUOTES: MotivationalQuote[] = [
  {
    text: "No cuentes los días: hacé que los días cuenten.",
    author: "Muhammad Ali",
    role: "boxeador estadounidense",
  },
  {
    text: "La excelencia no es un acto, sino un hábito.",
    author: "Aristóteles",
    role: "filósofo griego",
  },
  {
    text: "Un viaje de mil millas comienza con un solo paso.",
    author: "Lao Tse",
    role: "filósofo chino",
  },
  {
    text: "Sé el cambio que querés ver en el mundo.",
    author: "Mahatma Gandhi",
    role: "líder pacifista indio",
  },
  {
    text: "La vida es lo que te pasa mientras estás ocupado haciendo otros planes.",
    author: "John Lennon",
    role: "músico británico",
  },
  {
    text: "No fracasé: encontré mil maneras que no funcionan.",
    author: "Thomas Edison",
    role: "inventor estadounidense",
  },
  {
    text: "Si creés que podés, ya estás a mitad de camino.",
    author: "Theodore Roosevelt",
    role: "político estadounidense",
  },
  {
    text: "El futuro pertenece a quienes creen en la belleza de sus sueños.",
    author: "Eleanor Roosevelt",
    role: "activista estadounidense",
  },
  {
    text: "El éxito no es definitivo, el fracaso no es fatal: lo que cuenta es el coraje para continuar.",
    author: "Winston Churchill",
    role: "político británico",
  },
  {
    text: "La imaginación es más importante que el conocimiento.",
    author: "Albert Einstein",
    role: "físico alemán",
  },
  {
    text: "La suerte favorece a la mente preparada.",
    author: "Louis Pasteur",
    role: "científico francés",
  },
  {
    text: "Nuestra mayor gloria no está en no caer nunca, sino en levantarnos cada vez que caemos.",
    author: "Confucio",
    role: "filósofo chino",
  },
  {
    text: "Lo que no me mata me hace más fuerte.",
    author: "Friedrich Nietzsche",
    role: "filósofo alemán",
  },
  {
    text: "Solo sé que no sé nada.",
    author: "Sócrates",
    role: "filósofo griego",
  },
  {
    text: "Pienso, luego existo.",
    author: "René Descartes",
    role: "filósofo francés",
  },
  {
    text: "Caminante, no hay camino: se hace camino al andar.",
    author: "Antonio Machado",
    role: "poeta español",
  },
  {
    text: "No te rindas, aún estás a tiempo de alcanzar y comenzar de nuevo.",
    author: "Mario Benedetti",
    role: "escritor uruguayo",
  },
  {
    text: "La paciencia es amarga, pero su fruto es dulce.",
    author: "Jean-Jacques Rousseau",
    role: "filósofo ginebrino",
  },
  {
    text: "La victoria pertenece al más perseverante.",
    author: "Napoleón Bonaparte",
    role: "emperador francés",
  },
  {
    text: "Los obstáculos son esas cosas espantosas que ves cuando apartás los ojos de tu meta.",
    author: "Henry Ford",
    role: "empresario estadounidense",
  },
  {
    text: "La mejor manera de predecir el futuro es crearlo.",
    author: "Peter Drucker",
    role: "escritor austroestadounidense",
  },
  {
    text: "El único límite para nuestros logros de mañana son nuestras dudas de hoy.",
    author: "Franklin D. Roosevelt",
    role: "político estadounidense",
  },
  {
    text: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.",
    author: "Robert Collier",
    role: "escritor estadounidense",
  },
  {
    text: "El trabajo duro supera al talento cuando el talento no trabaja duro.",
    author: "Kevin Durant",
    role: "basquetbolista estadounidense",
  },
  {
    text: "Los dos días más importantes de tu vida son el día en que naces y el día en que descubrís para qué.",
    author: "Mark Twain",
    role: "escritor estadounidense",
  },
  {
    text: "Tu tiempo es limitado: no lo malgastes viviendo la vida de otro.",
    author: "Steve Jobs",
    role: "empresario estadounidense",
  },
  {
    text: "La vida es 10% lo que te pasa y 90% cómo reaccionás ante eso.",
    author: "Charles R. Swindoll",
    role: "pastor y escritor estadounidense",
  },
  {
    text: "Nada grande se ha logrado sin entusiasmo.",
    author: "Ralph Waldo Emerson",
    role: "ensayista estadounidense",
  },
  {
    text: "Los que triunfan en este mundo se levantan y buscan las circunstancias que quieren y, si no las encuentran, las crean.",
    author: "George Bernard Shaw",
    role: "dramaturgo irlandés",
  },
  {
    text: "Un sueño no se hace realidad por magia: requiere sudor, determinación y trabajo duro.",
    author: "Colin Powell",
    role: "militar y diplomático estadounidense",
  },
  {
    text: "No importa si te derriban: lo que importa es si te levantás.",
    author: "Vince Lombardi",
    role: "entrenador estadounidense",
  },
  {
    text: "Mente sana en cuerpo sano.",
    author: "Juvenal",
    role: "poeta romano",
  },
  {
    text: "La felicidad no es una estación a la que llegás, sino una forma de viajar.",
    author: "Margaret Lee Runbeck",
    role: "escritora estadounidense",
  },
  {
    text: "Nada es imposible: la palabra misma dice soy posible.",
    author: "Audrey Hepburn",
    role: "actriz británica",
  },
  {
    text: "Nuestro miedo más profundo no es ser inadecuados: es que somos poderosos sin límite.",
    author: "Marianne Williamson",
    role: "escritora estadounidense",
  },
  {
    text: "Andábamos sin buscarnos, pero sabiendo que andábamos para encontrarnos.",
    author: "Julio Cortázar",
    role: "escritor argentino",
  },
  {
    text: "La utopía está en el horizonte: sirve para eso, para caminar.",
    author: "Eduardo Galeano",
    role: "escritor uruguayo",
  },
  {
    text: "Cuando querés algo con todo el corazón, todo el universo conspira para que lo consigas.",
    author: "Paulo Coelho",
    role: "escritor brasileño",
  },
  {
    text: "Solo con una ardiente paciencia conquistaremos la espléndida ciudad que dará luz, justicia y dignidad a todos.",
    author: "Pablo Neruda",
    role: "poeta chileno",
  },
  {
    text: "La vida no es la que uno vivió, sino la que uno recuerda y cómo la recuerda para contarla.",
    author: "Gabriel García Márquez",
    role: "escritor colombiano",
  },
  {
    text: "Pies, para qué los quiero, si tengo alas para volar.",
    author: "Frida Kahlo",
    role: "pintora mexicana",
  },
  {
    text: "El arte de vencer se aprende en las derrotas.",
    author: "Simón Bolívar",
    role: "libertador venezolano",
  },
  {
    text: "Nuestra vida es lo que nuestros pensamientos hacen de ella.",
    author: "Marco Aurelio",
    role: "emperador romano",
  },
  {
    text: "Todos piensan en cambiar el mundo, pero nadie piensa en cambiarse a sí mismo.",
    author: "León Tolstói",
    role: "escritor ruso",
  },
  {
    text: "Lo que estás buscando te está buscando a vos.",
    author: "Rumi",
    role: "poeta persa",
  },
  {
    text: "Tu visión se aclara solo cuando podés mirar en tu propio corazón.",
    author: "Khalil Gibran",
    role: "poeta libanés",
  },
  {
    text: "Siempre parece imposible hasta que se hace.",
    author: "Nelson Mandela",
    role: "líder sudafricano",
  },
  {
    text: "En medio del caos, también hay oportunidad.",
    author: "Sun Tzu",
    role: "estratega chino",
  },
  {
    text: "Si no podés volar, corré; si no podés correr, caminá; si no podés caminar, arrastrate, pero nunca te detengas.",
    author: "Facundo Cabral",
    role: "cantautor argentino",
  },
  {
    text: "No siempre podemos hacer grandes cosas, pero sí pequeñas cosas con gran amor.",
    author: "Teresa de Calcuta",
    role: "misionera albanesa",
  },
  {
    text: "Seguí tu curso y dejá que la gente hable.",
    author: "Dante Alighieri",
    role: "poeta italiano",
  },
  {
    text: "Qué maravilloso es que nadie necesite esperar un solo momento antes de empezar a mejorar el mundo.",
    author: "Ana Frank",
    role: "diarista neerlandesa",
  },
  {
    text: "Porque somos lo que pensamos: la mente lo es todo.",
    author: "Buda",
    role: "príncipe iluminado (Asia)",
  },
  {
    text: "La inspiración existe, pero tiene que encontrarte trabajando.",
    author: "Pablo Picasso",
    role: "pintor español",
  },
  {
    text: "Sé vos mismo: todos los demás ya están ocupados.",
    author: "Oscar Wilde",
    role: "escritor irlandés",
  },
  {
    text: "Si llorás por haber perdido el sol, las lágrimas no te dejarán ver las estrellas.",
    author: "Rabindranath Tagore",
    role: "poeta indio",
  },
  {
    text: "El mejor momento para plantar un árbol fue hace veinte años; el segundo mejor momento es hoy.",
    author: "Proverbio chino",
  },
  {
    text: "El que mueve una montaña comienza levantando piedras pequeñas.",
    author: "Proverbio chino",
  },
  {
    text: "La vida no se mide por las veces que respiramos, sino por los momentos que nos quitan el aliento.",
    author: "Anónimo",
  },
  {
    text: "Hoy es el primer día del resto de tu vida.",
    author: "Anónimo",
  },
  {
    text: "El que madruga, Dios lo ayuda.",
    author: "Refrán popular",
  },
  {
    text: "Más vale tarde que nunca.",
    author: "Refrán popular",
  },
  {
    text: "Querer es poder.",
    author: "Refrán popular",
  },
  {
    text: "La práctica hace al maestro.",
    author: "Refrán popular",
  },
  {
    text: "Camarón que se duerme, se lo lleva la corriente.",
    author: "Refrán popular",
  },
  {
    text: "Roma no se hizo en un día.",
    author: "Refrán popular",
  },
  {
    text: "El que ríe último, ríe mejor.",
    author: "Refrán popular",
  },
  {
    text: "Más vale prevenir que curar.",
    author: "Refrán popular",
  },
  {
    text: "El que siembra viento, cosecha tempestades.",
    author: "Refrán popular",
  },
  {
    text: "De tal palo, tal astilla.",
    author: "Refrán popular",
  },
  {
    text: "A Dios rogando y con el mazo dando.",
    author: "Refrán popular",
  },
  {
    text: "El que no arriesga, no gana.",
    author: "Refrán popular",
  },
  {
    text: "El que mucho abarca, poco aprieta.",
    author: "Refrán popular",
  },
  {
    text: "¿Qué es mejor: nacer bueno o superar tu maldad con un gran esfuerzo?",
    author: "Paarthurnax",
    role: "dragón anciano (The Elder Scrolls V: Skyrim)",
  },
  {
    text: "El mal es el mal: menor, mayor, intermedio: al final, todo es lo mismo.",
    author: "Geralt de Rivia",
    role: "cazador de monstruos (The Witcher 3)",
  },
  {
    text: "No te disculpes: sé mejor.",
    author: "Kratos",
    role: "Dios de la Guerra (God of War)",
  },
  {
    text: "Es peligroso ir solo: llevá esto.",
    author: "El Viejo Sabio",
    role: "anciano de Hyrule (The Legend of Zelda)",
  },
  {
    text: "Un hombre elige, un esclavo obedece.",
    author: "Andrew Ryan",
    role: "fundador de Rapture (BioShock)",
  },
  {
    text: "El hombre correcto en el lugar equivocado puede hacer la diferencia en el mundo.",
    author: "G-Man",
    role: "hombre de la valija (Half-Life 2)",
  },
  {
    text: "Trabajamos en la oscuridad para servir a la luz.",
    author: "Ezio Auditore",
    role: "mentor asesino (Assassin's Creed)",
  },
  {
    text: "Quedate un rato y escuchá.",
    author: "Deckard Cain",
    role: "erudito de Tristram (Diablo)",
  },
  {
    text: "La locura es repetir lo mismo una y otra vez esperando resultados distintos.",
    author: "Vaas Montenegro",
    role: "señor de la guerra (Far Cry 3)",
  },
  {
    text: "La guerra nunca cambia.",
    author: "Narrador",
    role: "voz del yermo (Fallout)",
  },
  {
    text: "No podemos cambiar lo que está hecho: solo podemos seguir adelante.",
    author: "Arthur Morgan",
    role: "forajido (Red Dead Redemption 2)",
  },
  {
    text: "El futuro no se te regala: tenés que tomarlo vos.",
    author: "Pod 042",
    role: "pod de combate (NieR: Automata)",
  },
  {
    text: "Aguantá y sobreviví.",
    author: "Inscripción",
    role: "gravado en el brazalete (The Last of Us)",
  },
  {
    text: "Cuando la vida te dé limones, no hagas limonada: ¡hacé que la vida se lleve los limones!",
    author: "Cave Johnson",
    role: "CEO de Aperture Science (Portal 2)",
  },
  {
    text: "Todo viaje tiene su día final: no te apures.",
    author: "Zhongli",
    role: "Arconte Geo (Genshin Impact)",
  },
  {
    text: "No te atrevas a volverte hueco.",
    author: "Hoguera",
    role: "santuario en el camino (Dark Souls)",
  },
  {
    text: "Mis amigos son mi poder.",
    author: "Sora",
    role: "portador de la llave (Kingdom Hearts)",
  },
  {
    text: "A pesar de todo, seguís siendo vos.",
    author: "Undertale",
    role: "narración del juego",
  },
  {
    text: "Siempre hay un faro, siempre hay un hombre, siempre hay una ciudad.",
    author: "Elizabeth",
    role: "hija de Columbia (BioShock Infinite)",
  },
  {
    text: "Un hombre fuerte no necesita leer el futuro: lo hace propio.",
    author: "Solid Snake",
    role: "leyenda viva (Metal Gear Solid)",
  },
  {
    text: "Seguís encontrando algo por lo que luchar.",
    author: "Joel Miller",
    role: "superviviente (The Last of Us)",
  },
  {
    text: "¿Adónde va todo el mundo? ¿Bingo?",
    author: "Leon S. Kennedy",
    role: "policía de Raccoon City (Resident Evil 4)",
  },
  {
    text: "Quien controla el pasado comanda el futuro.",
    author: "Kane",
    role: "profeta de la Hermandad de Nod (Command & Conquer)",
  },
  {
    text: "Sic parvis magna: los grandes logros nacen de pequeños comienzos.",
    author: "Nathan Drake",
    role: "cazatesoros (Uncharted)",
  },
  {
    text: "Despertame cuando me necesites.",
    author: "Master Chief",
    role: "superviviente Spartan (Halo)",
  },
  {
    text: "¿Sos el más fuerte porque sos Satoru Gojo, o sos Satoru Gojo porque sos el más fuerte?",
    author: "Suguru Geto",
    role: "hechicero maldito (Jujutsu Kaisen)",
  },
  {
    text: "En el cielo y en la tierra, yo solo soy el honrado.",
    author: "Satoru Gojo",
    role: "el más fuerte (Jujutsu Kaisen)",
  },
  {
    text: "No quiero arrepentirme de la forma en que viví.",
    author: "Yuji Itadori",
    role: "estudiante hechicero (Jujutsu Kaisen)",
  },
  {
    text: "Quien no puede reconocerse a sí mismo, tarde o temprano fracasa.",
    author: "Itachi Uchiha",
    role: "ninja renegado (Naruto)",
  },
  {
    text: "Si no te arriesgás, no podés crear un futuro.",
    author: "Monkey D. Luffy",
    role: "capitán pirata (One Piece)",
  },
  {
    text: "No pasó nada.",
    author: "Roronoa Zoro",
    role: "espadachín (One Piece)",
  },
  {
    text: "Los problemas de mañana se los dejo al yo de mañana.",
    author: "Saitama",
    role: "héroe por hobby (One Punch Man)",
  },
  {
    text: "Nunca me desdigo de mi palabra: esa es mi regla ninja.",
    author: "Naruto Uzumaki",
    role: "ninja de Konoha (Naruto)",
  },
  {
    text: "El que abandona a un compañero es peor que escoria.",
    author: "Kakashi Hatake",
    role: "ninja copiador (Naruto)",
  },
  {
    text: "Quiero demostrar que puedo ser un gran ninja con puro trabajo duro.",
    author: "Rock Lee",
    role: "ninja del trabajo duro (Naruto)",
  },
  {
    text: "Quien no puede desprenderse de algo importante jamás podrá cambiar nada.",
    author: "Armin Arlert",
    role: "estratega (Attack on Titan)",
  },
  {
    text: "Si estás desanimado, encendé tu corazón.",
    author: "Kyojuro Rengoku",
    role: "pilar de la llama (Kimetsu no Yaiba)",
  },
  {
    text: "No tengo enemigos.",
    author: "Thorfinn",
    role: "vikingo errante (Vinland Saga)",
  },
  {
    text: "La acumulación de esas pequeñas desilusiones es lo que te convierte en adulto.",
    author: "Kento Nanami",
    role: "hechicero de grado 1 (Jujutsu Kaisen)",
  },
  {
    text: "Lo que tenga que pasar, pasa.",
    author: "Spike Spiegel",
    role: "cazarrecompensas (Cowboy Bebop)",
  },
  {
    text: "¡Soy un genio!",
    author: "Hanamichi Sakuragi",
    role: "jugador de básquet (Slam Dunk)",
  },
  {
    text: "Creé en el vos que cree en vos mismo.",
    author: "Kamina",
    role: "líder de la Brigada Gurren (Gurren Lagann)",
  },
  {
    text: "En este planeta sabemos que incluso el de más humilde origen puede superar a la elite si se esfuerza lo suficiente.",
    author: "Son Goku",
    role: "guerrero Saiyajin (Dragon Ball Z)",
  },
  {
    text: "Mi mente es un caos, pero mi corazón está claro.",
    author: "Gon Freecss",
    role: "cazador (Hunter × Hunter)",
  },
  {
    text: "Es el corazón el que impulsa a la gente hacia adelante: tu corazón puede hacerse tan fuerte como quieras.",
    author: "Tanjiro Kamado",
    role: "cazador de demonios (Kimetsu no Yaiba)",
  },
  {
    text: "Estoy acá.",
    author: "All Might",
    role: "símbolo de la paz (My Hero Academia)",
  },
  {
    text: "Nacemos libres. Algunos no lo creen, otros intentan arrebatártelo: al diablo con ellos.",
    author: "Eren Yeager",
    role: "soldado de la Legión de Exploración (Attack on Titan)",
  },
  {
    text: "Para obtener algo, hay que entregar algo de igual valor.",
    author: "Edward Elric",
    role: "alquimista de acero (Fullmetal Alchemist: Brotherhood)",
  },
  {
    text: "Todo el mundo es esclavo de algo.",
    author: "Kenny Ackerman",
    role: "agente de la policía militar (Attack on Titan)",
  },
  {
    text: "¡Plus Ultra! Más allá de lo que creés posible.",
    author: "Lema de la Academia UA",
    role: "grito de batalla (My Hero Academia)",
  },
];

export function quoteForDate(iso: string): MotivationalQuote {
  let hash = 0;
  for (let i = 0; i < iso.length; i++) {
    hash = (hash * 31 + iso.charCodeAt(i)) >>> 0;
  }
  return QUOTES[hash % QUOTES.length];
}

export function getRandomQuote(): MotivationalQuote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}