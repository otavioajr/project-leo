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

let contentPages: Map<string, ContentPage> = new Map([
    [
        'about',
        {
            slug: 'about',
            title: 'Sobre Nós',
            content: '<h2>Nossa História</h2><p>A Alpina Aventuras nasceu da paixão pelas montanhas e pelo desejo de compartilhar a beleza da natureza com o mundo. Fundada por um grupo de guias experientes, nossa missão é proporcionar experiências ao ar livre seguras, memoráveis e emocionantes para todos os níveis de aventureiros.</p><h2>Nossa Equipe</h2><p>Nossos guias são certificados, apaixonados pelo que fazem e têm um profundo conhecimento da região. Estamos aqui para garantir que sua aventura seja nada menos que espetacular.</p>'
        }
    ],
    [
        'contact',
        {
            slug: 'contact',
            title: 'Entre em Contato',
            content: '<h2>Tem alguma pergunta?</h2><p>Adoraríamos ouvir de você! Seja para saber mais sobre uma aventura específica, fazer uma reserva de grupo ou simplesmente dizer olá, nossa equipe está pronta para ajudar.</p><ul class="mt-4 space-y-2"><li><strong>Email:</strong> <a href="mailto:contato@alpinaaventuras.com">contato@alpinaaventuras.com</a></li><li><strong>Telefone:</strong> <a href="tel:+5599999999999">(99) 99999-9999</a></li><li><strong>Endereço:</strong> Rua da Montanha, 123, Vale Sereno</li></ul>'
        }
    ],
    [
        'privacy',
        {
            slug: 'privacy',
            title: 'Política de Privacidade',
            content: '<h2>Coleta de Informações</h2><p>Coletamos informações que você nos fornece diretamente ao se registrar para uma aventura. Isso inclui seu nome, e-mail e telefone.</p><h2>Uso das Informações</h2><p>Usamos suas informações para processar suas inscrições, nos comunicarmos com você sobre sua aventura e, se você permitir, enviar novidades sobre futuras atividades.</p><h2>Compartilhamento de Informações</h2><p>Não compartilhamos suas informações pessoais com terceiros, exceto quando necessário para fornecer os serviços da aventura (por exemplo, com parceiros de seguro).</p>'
        }
    ]
]);

// Simulate API latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getAdventures(): Promise<Adventure[]> {
  await delay(100);
  return Array.from(adventures.values());
}

export async function getAdventureBySlug(slug: string): Promise<Adventure | undefined> {
    await delay(100);
    return Array.from(adventures.values()).find(adv => adv.slug === slug);
}

export async function getAdventureById(id: string): Promise<Adventure | undefined> {
    await delay(100);
    return adventures.get(id);
}

export async function getRegistrations(): Promise<Registration[]> {
    await delay(100);
    return Array.from(registrations.values()).sort((a,b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());
}

export async function addRegistration(registration: Omit<Registration, 'id' | 'registrationDate'>): Promise<Registration> {
    await delay(500);
    const newId = (registrations.size + 1).toString();
    const newRegistration: Registration = {
        ...registration,
        id: newId,
        registrationDate: new Date().toISOString(),
    };
    registrations.set(newId, newRegistration);
    return newRegistration;
}

export async function saveAdventure(adventure: Omit<Adventure, 'id' | 'slug' | 'imageDescription'> & { id?: string; imageDescription?: string }): Promise<Adventure> {
    await delay(500);
    if (adventure.id && adventures.has(adventure.id)) {
        // Update
        const existingAdventure = adventures.get(adventure.id)!;
        const updatedAdventure: Adventure = { 
            ...existingAdventure, 
            ...adventure,
            imageDescription: adventure.imageDescription || existingAdventure.imageDescription,
            customFields: adventure.customFields || existingAdventure.customFields || []
        };
        adventures.set(adventure.id, updatedAdventure);
        return updatedAdventure;
    } else {
        // Create
        const newId = (adventures.size + 5).toString(); // use a higher start to avoid collision with initial data
        const slug = adventure.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        const newAdventure: Adventure = {
            ...(adventure as Omit<Adventure, 'id' | 'slug'>),
            id: newId,
            slug: `${slug}-${newId}`,
            customFields: adventure.customFields || []
        };
        adventures.set(newId, newAdventure);
        return newAdventure;
    }
}

export async function deleteAdventure(id: string): Promise<{ success: boolean }> {
    await delay(500);
    const deleted = adventures.delete(id);
    // Also remove related registrations
    const registrationsToDelete = Array.from(registrations.values()).filter(r => r.adventureId === id);
    registrationsToDelete.forEach(r => registrations.delete(r.id));
    return { success: deleted };
}

export async function getHomePageContent(): Promise<HomePageContent> {
    await delay(50);
    return homePageContent;
}

export async function saveHomePageContent(content: HomePageContent): Promise<HomePageContent> {
    await delay(500);
    homePageContent = { ...content };
    return homePageContent;
}

export async function getContentPages(): Promise<ContentPage[]> {
    await delay(50);
    return Array.from(contentPages.values());
}

export async function getContentPageBySlug(slug: string): Promise<ContentPage | undefined> {
    await delay(50);
    return contentPages.get(slug);
}

export async function saveContentPage(page: ContentPage): Promise<ContentPage> {
    await delay(500);
    contentPages.set(page.slug, page);
    return page;
}