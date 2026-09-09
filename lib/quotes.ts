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
    text: "El éxito es ir de fracaso en fracaso sin perder el entusiasmo.",
    author: "Winston Churchill",
    role: "político británico",
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
    text: "En medio de la dificultad yace la oportunidad.",
    author: "Albert Einstein",
    role: "físico alemán",
  },
  {
    text: "La suerte favorece a la mente preparada.",
    author: "Louis Pasteur",
    role: "científico francés",
  },
  {
    text: "No importa cuán lento vayas, mientras no te detengas.",
    author: "Confucio",
    role: "filósofo chino",
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
    text: "No dejes que lo que no podés hacer interfiera con lo que sí podés hacer.",
    author: "John Wooden",
    role: "entrenador estadounidense",
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
    text: "La disciplina es el puente entre tus metas y tus logros.",
    author: "Jim Rohn",
    role: "empresario estadounidense",
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
    text: "El único modo de hacer un gran trabajo es amar lo que hacés.",
    author: "Steve Jobs",
    role: "empresario estadounidense",
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
    text: "El pesimista se queja del viento; el optimista espera que cambie; el realista ajusta las velas.",
    author: "William Arthur Ward",
    role: "escritor estadounidense",
  },
  {
    text: "Tu actitud, no tu aptitud, determina tu altitud.",
    author: "Zig Ziglar",
    role: "motivador estadounidense",
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
    text: "Todo lo que siempre quisiste está al otro lado del miedo.",
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