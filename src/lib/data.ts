import type { Adventure, Registration } from './types';

// Using a Map for easier CRUD operations
let adventures: Map<string, Adventure> = new Map([
  [
    '1',
    {
      id: '1',
      slug: 'mountain-ridge-hike',
      title: 'Mountain Ridge Hike',
      description: 'Experience breathtaking views on this guided hike along a stunning mountain ridge.',
      longDescription: 'Our most popular adventure! This full-day guided hike takes you across the scenic and challenging peaks of the Alpine Ridge. You will be rewarded with 360-degree views of the surrounding valleys and forests. The hike is approximately 10 miles long with significant elevation gain, suitable for hikers with good physical fitness. Lunch and transportation from our base are included.',
      price: 95.0,
      duration: 'Full Day',
      location: 'Alpine Ridge',
      difficulty: 'Moderate',
      imageId: 'adventure-1',
      registrationsEnabled: true,
    },
  ],
  [
    '2',
    {
      id: '2',
      slug: 'serene-lake-kayaking',
      title: 'Serene Lake Kayaking',
      description: 'Gently paddle across the crystal-clear waters of Mirror Lake, surrounded by pristine nature.',
      longDescription: 'Escape the hustle and bustle with a peaceful morning of kayaking on Mirror Lake. This guided tour is perfect for all skill levels, including beginners. We will provide all necessary equipment and a brief lesson before setting out. Explore hidden coves, spot local wildlife, and enjoy the tranquility of the water. This is a half-day trip, perfect for families and individuals.',
      price: 60.0,
      duration: 'Half Day',
      location: 'Mirror Lake',
      difficulty: 'Easy',
      imageId: 'adventure-2',
      registrationsEnabled: true,
    },
  ],
  [
    '3',
    {
      id: '3',
      slug: 'cliffside-rock-climbing',
      title: 'Cliffside Rock Climbing',
      description: 'Challenge yourself with a guided rock climbing session on the iconic Granite Spires.',
      longDescription: 'For the thrill-seekers, our guided rock climbing on the Granite Spires is an unforgettable experience. With routes available for various skill levels, our certified instructors will ensure your safety while you push your limits. All gear is provided. This is a challenging but highly rewarding full-day adventure.',
      price: 150.0,
      duration: 'Full Day',
      location: 'Granite Spires',
      difficulty: 'Challenging',
      imageId: 'adventure-3',
      registrationsEnabled: false,
    },
  ],
  [
    '4',
    {
      id: '4',
      slug: 'forest-trail-biking',
      title: 'Forest Trail Biking',
      description: 'Ride through lush forests and scenic trails on our guided mountain biking tour.',
      longDescription: 'Get your adrenaline pumping on our forest mountain biking tour. We will guide you through a network of exciting single-track trails, with flowing descents and manageable climbs. This tour is suitable for intermediate riders. High-quality rental bikes and helmets are available. Join us for a fun-filled half-day on the trails.',
      price: 75.0,
      duration: 'Half Day',
      location: 'Pine Valley Forest',
      difficulty: 'Moderate',
      imageId: 'adventure-4',
      registrationsEnabled: true,
    },
  ],
]);

let registrations: Map<string, Registration> = new Map([
    ['1', {
        id: '1',
        adventureId: '1',
        adventureTitle: 'Mountain Ridge Hike',
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '123-456-7890',
        registrationDate: new Date('2023-10-15T10:00:00Z').toISOString(),
    }],
    ['2', {
        id: '2',
        adventureId: '2',
        adventureTitle: 'Serene Lake Kayaking',
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        phone: '098-765-4321',
        registrationDate: new Date('2023-10-16T11:30:00Z').toISOString(),
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
