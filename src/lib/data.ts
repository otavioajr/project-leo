import type { Adventure, Registration } from './types';

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
      imageId: 'adventure-1',
      registrationsEnabled: true,
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
      imageId: 'adventure-2',
      registrationsEnabled: true,
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
      imageId: 'adventure-3',
      registrationsEnabled: false,
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
      imageId: 'adventure-4',
      registrationsEnabled: true,
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
    }]
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

export async function saveAdventure(adventure: Omit<Adventure, 'id' | 'slug'> & { id?: string }): Promise<Adventure> {
    await delay(500);
    if (adventure.id && adventures.has(adventure.id)) {
        // Update
        const updatedAdventure = { ...adventures.get(adventure.id)!, ...adventure };
        adventures.set(adventure.id, updatedAdventure);
        return updatedAdventure;
    } else {
        // Create
        const newId = (adventures.size + 5).toString(); // use a higher start to avoid collision with initial data
        const slug = adventure.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
        const newAdventure: Adventure = {
            ...adventure,
            id: newId,
            slug: `${slug}-${newId}`,
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
