import type { Adventure, Registration, HomePageContent, ContentPage } from './types';

// Using a Map for easier CRUD operations
let adventures: Map<string, Adventure> = new Map([
  [
    '1',
    {
      id: '1',
      slug: 'caminhada-na-crista-da-montanha',
      title: 'Caminhada na Crista da Montanha',
      description: 'Experimente vistas de tirar o fôlego nesta caminhada guiada por uma deslumbrante crista de montanha.',
      longDescription: 'Nossa aventura mais popular! Esta caminhada guiada de dia inteiro leva você pelos picos cênicos e desafiadores da Crista Alpina. Você será recompensado com vistas de 360 graus dos vales e florestas circundantes. A caminhada tem aproximadamente 16 quilômetros de extensão com ganho de elevação significativo, adequada para caminhantes com boa aptidão física. Almoço e transporte de nossa base estão incluídos.',
      price: 95.0,
      duration: 'Dia Inteiro',
      location: 'Crista Alpina',
      difficulty: 'Moderado',
      imageUrl: 'https://images.unsplash.com/photo-1633421459525-f224f11f5b33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxoaWtpbmclMjBtb3VudGFpbnxlbnwwfHx8fDE3Njg1NjQ2MzZ8MA&ixlib=rb-4.1.0&q=80&w=1080',
      imageDescription: 'Um grupo de caminhantes em uma trilha em uma floresta exuberante e verde.',
      registrationsEnabled: true,
      customFields: [
        { name: 'cpf', label: 'CPF', type: 'text', required: true },
        { name: 'idade', label: 'Idade', type: 'number', required: false },
      ],
    },
  ],
  [
    '2',
    {
      id: '2',
      slug: 'caiaque-no-lago-sereno',
      title: 'Caiaque no Lago Sereno',
      description: 'Reme suavemente pelas águas cristalinas do Lago Espelhado, cercado pela natureza intocada.',
      longDescription: 'Fuja da agitação com uma manhã tranquila de caiaque no Lago Espelhado. Este passeio guiado é perfeito para todos os níveis de habilidade, incluindo iniciantes. Forneceremos todo o equipamento necessário e uma breve aula antes de partirmos. Explore enseadas escondidas, observe a vida selvagem local e desfrute da tranquilidade da água. Esta é uma viagem de meio dia, perfeita para famílias e indivíduos.',
      price: 60.0,
      duration: 'Meio Dia',
      location: 'Lago Espelhado',
      difficulty: 'Fácil',
      imageUrl: 'https://images.unsplash.com/photo-1669659738635-7af645bb8a5b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw2fHxrYXlha2luZyUyMGxha2V8ZW58MHx8fHwxNzY4NTY0NjM2fDA&ixlib=rb-4.1.0&q=80&w=1080',
      imageDescription: 'Duas pessoas andando de caiaque em um lago calmo e claro cercado por montanhas.',
      registrationsEnabled: true,
      customFields: [],
    },
  ],
  [
    '3',
    {
      id: '3',
      slug: 'escalada-em-penhasco',
      title: 'Escalada em Penhasco',
      description: 'Desafie-se com uma sessão de escalada guiada nos icônicos Picos de Granito.',
      longDescription: 'Para os caçadores de emoção, nossa escalada guiada nos Picos de Granito é uma experiência inesquecível. Com rotas disponíveis para vários níveis de habilidade, nossos instrutores certificados garantirão sua segurança enquanto você ultrapassa seus limites. Todo o equipamento é fornecido. Esta é uma aventura de dia inteiro desafiadora, mas muito gratificante.',
      price: 150.0,
      duration: 'Dia Inteiro',
      location: 'Picos de Granito',
      difficulty: 'Desafiador',
      imageUrl: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxyb2NrJTIwY2xpbWJpbmd8ZW58MHx8fHwxNzY4NTY0NjM1fDA&ixlib=rb-4.1.0&q=80&w=1080',
      imageDescription: 'Uma pessoa escalando uma face de penhasco íngreme com equipamento de segurança.',
      registrationsEnabled: false,
      customFields: [],
    },
  ],
  [
    '4',
    {
      id: '4',
      slug: 'ciclismo-em-trilha-na-floresta',
      title: 'Ciclismo em Trilha na Floresta',
      description: 'Pedale por florestas exuberantes e trilhas cênicas em nosso passeio guiado de mountain bike.',
      longDescription: 'Aumente sua adrenalina em nosso passeio de mountain bike na floresta. Nós o guiaremos por uma rede de emocionantes trilhas de single-track, com descidas fluidas e subidas gerenciáveis. Este passeio é adequado para ciclistas intermediários. Bicicletas de aluguel de alta qualidade e capacetes estão disponíveis. Junte-se a nós para uma tarde divertida nas trilhas.',
      price: 75.0,
      duration: 'Meio Dia',
      location: 'Floresta do Vale do Pinheiro',
      difficulty: 'Moderado',
      imageUrl: 'https://images.unsplash.com/photo-1511994298241-608e28f14fde?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw3fHxtb3VudGFpbiUyMGJpa2luZ3xlbnwwfHx8fDE3Njg1NjQ2MzV8MA&ixlib=rb-4.1.0&q=80&w=1080',
      imageDescription: 'Um ciclista de montanha descendo um caminho de terra em uma floresta.',
      registrationsEnabled: true,
      customFields: [],
    },
  ],
]);

let registrations: Map<string, Registration> = new Map([
    ['1', {
        id: '1',
        adventureId: '1',
        adventureTitle: 'Caminhada na Crista da Montanha',
        name: 'João Ninguém',
        email: 'joao.ninguem@example.com',
        phone: '123-456-7890',
        registrationDate: new Date('2023-10-15T10:00:00Z').toISOString(),
        groupSize: 1,
        participants: [],
    }],
    ['2', {
        id: '2',
        adventureId: '2',
        adventureTitle: 'Caiaque no Lago Sereno',
        name: 'Maria da Silva',
        email: 'maria.dasilva@example.com',
        phone: '098-765-4321',
        registrationDate: new Date('2023-10-16T11:30:00Z').toISOString(),
        groupSize: 2,
        participants: [{ name: 'Pedro da Silva' }],
    }]
]);

let homePageContent: HomePageContent = {
  heroTitle: "Sua Próxima Aventura o Aguarda",
  heroDescription: "Explore paisagens de tirar o fôlego e desafie-se com nossas experiências ao ar livre selecionadas.",
  heroImageUrl: "https://images.unsplash.com/photo-1742578880683-806bb8a2a90e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHw5fHxhZHZlbnR1cmUlMjBsYW5kc2NhcGV8ZW58MHx8fHwxNzY4NTY0NjM1fDA&ixlib=rb-4.1.0&q=80&w=1080",
  heroImageDescription: "Uma deslumbrante cadeia de montanhas ao nascer do sol, com um caminhante solitário observando o vale.",
  adventuresTitle: "Descubra Nossas Aventuras",
  adventuresDescription: "De caminhadas serenas a escaladas emocionantes, encontre a experiência perfeita para você.",
};

const aboutContent = `<h2>Nossa História</h2><p>A Chaves Adventure nasceu da paixão pelas montanhas e pelo desejo de compartilhar a beleza da natureza com os outros. O que começou como um pequeno grupo de amigos guiando passeios de fim de semana se transformou em uma empresa de aventura completa, oferecendo uma ampla gama de atividades para todos os níveis de habilidade.</p><h2>Nossa Missão</h2><p>Nossa missão é fornecer experiências ao ar livre seguras, agradáveis e inesquecíveis. Acreditamos no poder transformador da natureza e nos esforçamos para criar aventuras que desafiam e inspiram. Estamos comprometidos com práticas sustentáveis e com a proteção dos belos ambientes onde operamos.</p><h2>Conheça a Equipe</h2><ul><li><strong>Carlos Chaves:</strong> Fundador e Guia Principal</li><li><strong>Ana Pereira:</strong> Gerente de Operações</li><li><strong>Bruno Costa:</strong> Instrutor de Escalada</li></ul>`;
const contactContent = `<h2>Fale Conosco</h2><p>Tem alguma pergunta sobre nossas aventuras? Quer agendar um passeio privado? Adoraríamos ouvir de você!</p><ul><li><strong>Email:</strong> contato@chavesadventure.com</li><li><strong>Telefone:</strong> (11) 98765-4321</li><li><strong>Endereço:</strong> Rua das Montanhas, 123, Base da Montanha, BR</li></ul><p>Você também pode preencher o formulário abaixo e entraremos em contato o mais breve possível.</p>`;
const privacyContent = `<h2>Sua Privacidade é Importante</h2><p>Esta política de privacidade descreve como a Chaves Adventure coleta, usa e protege qualquer informação que você nos fornece ao usar este site. Estamos comprometidos em garantir que sua privacidade seja protegida.</p><h2>O que coletamos</h2><p>Podemos coletar as seguintes informações:</p><ul><li>Nome e informações de contato, incluindo endereço de e-mail</li><li>Informações demográficas, como CEP, preferências e interesses</li><li>Outras informações relevantes para pesquisas e/ou ofertas de clientes</li></ul><h2>O que fazemos com as informações que coletamos</h2><p>Exigimos essas informações para entender suas necessidades e fornecer um serviço melhor, e em particular pelos seguintes motivos:</p><ul><li>Manutenção de registros internos.</li><li>Podemos usar as informações para melhorar nossos produtos e serviços.</li><li>Podemos enviar periodicamente e-mails promocionais sobre novos produtos, ofertas especiais ou outras informações que achamos que você pode achar interessantes usando o endereço de e-mail que você forneceu.</li></ul>`;

let contentPages: Map<string, ContentPage> = new Map([
    [
        'about',
        {
            slug: 'about',
            title: 'Sobre Nós',
            content: aboutContent,
        }
    ],
    [
        'contact',
        {
            slug: 'contact',
            title: 'Entre em Contato',
            content: contactContent,
        }
    ],
    [
        'privacy',
        {
            slug: 'privacy',
            title: 'Política de Privacidade',
            content: privacyContent,
        }
    ]
]);

function createSlug(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

// SIMULATED API/DB CALLS

export async function getAdventures(): Promise<Adventure[]> {
  return Array.from(adventures.values());
}

export async function getAdventureById(id: string): Promise<Adventure | undefined> {
  return adventures.get(id);
}

export async function getAdventureBySlug(slug: string): Promise<Adventure | undefined> {
  return Array.from(adventures.values()).find(adv => adv.slug === slug);
}

export async function saveAdventure(adventureData: Omit<Adventure, 'id' | 'slug'> & { id?: string }): Promise<Adventure> {
  const slug = createSlug(adventureData.title);
  
  if (adventureData.id) {
    const existing = adventures.get(adventureData.id);
    if (!existing) throw new Error('Adventure not found');
    
    const updatedAdventure = { ...existing, ...adventureData, slug };
    adventures.set(adventureData.id, updatedAdventure);
    return updatedAdventure;
  }
  
  const newId = String(adventures.size + 1);
  const newAdventure: Adventure = {
    ...adventureData,
    id: newId,
    slug: slug,
  };
  adventures.set(newId, newAdventure);
  return newAdventure;
}

export async function deleteAdventure(id: string): Promise<void> {
    if (!adventures.has(id)) {
        throw new Error('Adventure not found');
    }
    adventures.delete(id);
    // In a real DB, you'd also delete associated registrations
    const regsToDelete = Array.from(registrations.values()).filter(r => r.adventureId === id);
    regsToDelete.forEach(r => registrations.delete(r.id));
}

export async function getRegistrations(): Promise<Registration[]> {
  return Array.from(registrations.values()).sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());
}

export async function addRegistration(registrationData: Omit<Registration, 'id' | 'registrationDate'>): Promise<Registration> {
  const newId = String(registrations.size + 1);
  const newRegistration: Registration = {
    ...registrationData,
    id: newId,
    registrationDate: new Date().toISOString(),
  };
  registrations.set(newId, newRegistration);
  return newRegistration;
}


export async function getHomePageContent(): Promise<HomePageContent> {
  return homePageContent;
}

export async function saveHomePageContent(content: HomePageContent): Promise<HomePageContent> {
    homePageContent = content;
    return homePageContent;
}


export async function getContentPages(): Promise<ContentPage[]> {
  return Array.from(contentPages.values());
}

export async function getContentPageBySlug(slug: string): Promise<ContentPage | undefined> {
  return contentPages.get(slug);
}

export async function saveContentPage(pageData: ContentPage): Promise<ContentPage> {
    if (!contentPages.has(pageData.slug)) {
        throw new Error('Page not found');
    }
    contentPages.set(pageData.slug, pageData);
    return pageData;
}
